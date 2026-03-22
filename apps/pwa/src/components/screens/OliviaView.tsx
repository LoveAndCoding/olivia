import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarBlank, CheckSquare, Bell, Tray, Repeat, CookingPot,
  Lightbulb, ListBullets, Trash
} from '@phosphor-icons/react';
import type { ChatMessage, ChatToolCall, QuickChip } from '../../types/display';
import {
  streamChatMessage, confirmChatAction, dismissChatAction, clearChatConversation,
  undoChatResponse
} from '../../lib/api';
import { getActiveSignal } from '../../lib/app-lifecycle';
import { ChatMarkdown } from '../ChatMarkdown';

// ─── Action Card Labels ───────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; primary: string; secondary: string }> = {
  create_inbox_item: { label: 'NEW TASK', primary: 'Add task', secondary: 'Edit first' },
  create_reminder: { label: 'NEW REMINDER', primary: 'Set reminder', secondary: 'Edit first' },
  add_list_item: { label: 'LIST ITEM', primary: 'Add to list', secondary: 'Skip' },
  create_meal_entry: { label: 'MEAL ENTRY', primary: 'Add meal', secondary: 'Skip' },
  complete_routine: { label: 'COMPLETE ROUTINE', primary: 'Complete', secondary: 'Skip' },
  skip_routine: { label: 'SKIP ROUTINE', primary: 'Skip routine', secondary: 'Cancel' },
};

// ─── Quick Chip Icons ─────────────────────────────────────────────────────────

const CHIP_ICON_MAP: Record<string, ReactNode> = {
  CalendarBlank: <CalendarBlank size={16} />,
  CheckSquare: <CheckSquare size={16} />,
  Bell: <Bell size={16} />,
  Tray: <Tray size={16} />,
  Repeat: <Repeat size={16} />,
  CookingPot: <CookingPot size={16} />,
  Lightbulb: <Lightbulb size={16} />,
  ListBullets: <ListBullets size={16} />,
};

function getChipIcon(chip: string): ReactNode | null {
  if (chip.includes('overdue') || chip.includes('due')) return CHIP_ICON_MAP.CheckSquare;
  if (chip.includes('today') || chip.includes('week')) return CHIP_ICON_MAP.CalendarBlank;
  if (chip.includes('reminder')) return CHIP_ICON_MAP.Bell;
  if (chip.includes('inbox')) return CHIP_ICON_MAP.Tray;
  if (chip.includes('routine')) return CHIP_ICON_MAP.Repeat;
  if (chip.includes('dinner') || chip.includes('meal')) return CHIP_ICON_MAP.CookingPot;
  if (chip.includes('remember') || chip.includes('summary')) return CHIP_ICON_MAP.ListBullets;
  return CHIP_ICON_MAP.Lightbulb;
}

// ─── Tool Call Preview ────────────────────────────────────────────────────────

function formatToolCallPreview(tc: ChatToolCall): string {
  const d = tc.data;
  switch (tc.type) {
    case 'create_inbox_item':
      return `${d.title ?? ''}${d.dueText ? ` · due ${d.dueText}` : ''}`;
    case 'create_reminder':
      return `${d.title ?? ''}${d.scheduledAt ? ` · ${String(d.scheduledAt).slice(0, 16)}` : ''}`;
    case 'add_list_item':
      return `"${d.body ?? ''}" → ${d.listTitle ?? 'list'}`;
    case 'create_meal_entry':
      return `${d.name ?? ''}`;
    case 'complete_routine':
    case 'skip_routine':
      return `${d.routineTitle ?? ''}`;
    default:
      return JSON.stringify(d);
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type OliviaViewProps = {
  initialMessages?: ChatMessage[];
  chips?: QuickChip[];
  onConversationCleared?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OliviaView({
  initialMessages = [],
  chips = [],
  onConversationCleared,
}: OliviaViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showChips = chips.length > 0 && messages.length < 4;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatAreaRef.current?.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load initial messages when prop changes (from API data)
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: text.trim() };
      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      // Add typing indicator
      const typingId = `typing-${Date.now()}`;
      setMessages(prev => [...prev, { id: typingId, role: 'olivia', text: '', isStreaming: true }]);
      setIsStreaming(true);
      scrollToBottom();

      try {
        let fullText = '';
        const toolCalls: ChatToolCall[] = [];
        let finalMessageId = '';

        for await (const evt of streamChatMessage(text.trim(), getActiveSignal())) {
          if (evt.event === 'text') {
            fullText += (evt as { event: 'text'; data: { delta: string } }).data.delta;
            setMessages(prev =>
              prev.map(m => m.id === typingId ? { ...m, text: fullText } : m)
            );
            scrollToBottom();
          } else if (evt.event === 'tool_call') {
            const tc = (evt as { event: 'tool_call'; data: { toolCall: ChatToolCall } }).data.toolCall;
            toolCalls.push(tc);
          } else if (evt.event === 'done') {
            finalMessageId = (evt as { event: 'done'; data: { messageId: string } }).data.messageId;
          } else if (evt.event === 'error') {
            const errorMsg = (evt as { event: 'error'; data: { message: string } }).data.message;
            setMessages(prev =>
              prev.map(m => m.id === typingId
                ? { ...m, text: errorMsg, isStreaming: false, isError: true }
                : m)
            );
            setIsStreaming(false);
            return;
          }
        }

        // Finalize the message
        setMessages(prev =>
          prev.map(m => m.id === typingId
            ? {
                ...m,
                id: finalMessageId || typingId,
                text: fullText,
                toolCalls: toolCalls.length > 0 ? toolCalls : null,
                isStreaming: false
              }
            : m)
        );
      } catch {
        setMessages(prev =>
          prev.map(m => m.id === typingId
            ? { ...m, text: 'Something unexpected happened on my end. Try sending your message again.', isStreaming: false, isError: true }
            : m)
        );
      } finally {
        setIsStreaming(false);
        scrollToBottom();
      }
    },
    [isStreaming, scrollToBottom],
  );

  const handleConfirmAction = useCallback(async (messageId: string, toolCall: ChatToolCall) => {
    try {
      await confirmChatAction(toolCall.id);
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId || !m.toolCalls) return m;
          return {
            ...m,
            toolCalls: m.toolCalls.map(tc =>
              tc.id === toolCall.id ? { ...tc, status: 'confirmed' as const } : tc
            )
          };
        })
      );
    } catch {
      // Silent fail — the card stays pending
    }
  }, []);

  const handleDismissAction = useCallback(async (messageId: string, toolCall: ChatToolCall) => {
    try {
      await dismissChatAction(toolCall.id);
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId || !m.toolCalls) return m;
          return {
            ...m,
            toolCalls: m.toolCalls.map(tc =>
              tc.id === toolCall.id ? { ...tc, status: 'dismissed' as const } : tc
            )
          };
        })
      );
    } catch {
      // Silent fail
    }
  }, []);

  const handleDismissAll = useCallback(async (messageId: string, toolCalls: ChatToolCall[]) => {
    const pending = toolCalls.filter(tc => tc.status === 'pending');
    try {
      await Promise.all(pending.map(tc => dismissChatAction(tc.id)));
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId || !m.toolCalls) return m;
          return {
            ...m,
            toolCalls: m.toolCalls.map(tc =>
              tc.status === 'pending' ? { ...tc, status: 'dismissed' as const } : tc
            )
          };
        })
      );
    } catch {
      // Silent fail
    }
  }, []);

  const handleUndoResponse = useCallback(async (messageId: string) => {
    try {
      await undoChatResponse(messageId);
      // Remove the assistant message and the user message that preceded it
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === messageId);
        if (idx < 0) return prev;
        // Keep the user message (spec says user message remains)
        return prev.filter(m => m.id !== messageId);
      });
    } catch {
      // Silent fail
    }
  }, []);

  const handleClearConversation = useCallback(async () => {
    try {
      await clearChatConversation();
      setMessages([]);
      setShowClearConfirm(false);
      onConversationCleared?.();
    } catch {
      setShowClearConfirm(false);
    }
  }, [onConversationCleared]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
  };

  return (
    <>
      {/* Header */}
      <div className="ai-header">
        <div className="ai-title-row">
          <div className={`olivia-orb${isStreaming ? ' orb-active' : ''}`} aria-hidden="true">✦</div>
          <div style={{ flex: 1 }}>
            <div className="ai-title">Olivia</div>
            <div className="ai-sub">Your household assistant · always here</div>
          </div>
          {messages.length > 0 && !showClearConfirm && (
            <button
              type="button"
              className="chat-clear-btn"
              onClick={() => setShowClearConfirm(true)}
              aria-label="Clear conversation"
            >
              <Trash size={20} />
            </button>
          )}
          {showClearConfirm && (
            <div className="chat-clear-confirm">
              <span>Clear chat?</span>
              <button type="button" className="chat-clear-yes" onClick={handleClearConversation}>Yes</button>
              <button type="button" className="chat-clear-no" onClick={() => setShowClearConfirm(false)}>No</button>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div
        className="chat-area"
        ref={chatAreaRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with Olivia"
      >
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="olivia-orb olivia-orb-lg" aria-hidden="true">✦</div>
            <h2 className="empty-state-heading">What can I help with?</h2>
            <p className="empty-state-body">
              I can check on your household, help plan your week, draft messages, or just keep track of things.
            </p>
          </div>
        )}
        {messages.map((msg, msgIndex) => {
          const pendingToolCalls = msg.toolCalls?.filter(tc => tc.status === 'pending') ?? [];
          const hasAnyConfirmed = msg.toolCalls?.some(tc => tc.status === 'confirmed') ?? false;
          const isLastOliviaMsg = msg.role === 'olivia' && !msg.isStreaming && !msg.isError
            && msgIndex === messages.length - 1;
          const canUndo = isLastOliviaMsg && !hasAnyConfirmed;

          return (
          <div key={msg.id} className={`msg msg-${msg.role === 'olivia' ? 'olivia' : 'user'}${msg.isError ? ' msg-error' : ''}`}>
            <div className="msg-label">{msg.role === 'olivia' ? 'OLIVIA' : 'YOU'}</div>
            <div className="msg-bubble">
              {msg.isStreaming && !msg.text ? (
                <div className="typing-indicator" aria-label="Olivia is thinking">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              ) : (
                <>
                  <ChatMarkdown text={msg.text} />
                  {msg.isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
                </>
              )}
              {/* Action cards */}
              {msg.toolCalls?.map(tc => {
                const labels = ACTION_LABELS[tc.type] ?? { label: tc.type.toUpperCase(), primary: 'Confirm', secondary: 'Dismiss' };
                return (
                  <div
                    key={tc.id}
                    className={`olivia-action-card${tc.status === 'dismissed' ? ' oa-dismissed' : ''}`}
                  >
                    <div className="oa-label">
                      {labels.label}
                      {tc.status === 'dismissed' && <span className="oa-status-dismissed"> (dismissed)</span>}
                    </div>
                    <div className="oa-preview">{formatToolCallPreview(tc)}</div>
                    {tc.status === 'pending' && (
                      <div className="oa-buttons">
                        <button
                          type="button"
                          className="oa-btn oa-btn-send"
                          onClick={() => handleConfirmAction(msg.id, tc)}
                          aria-label={`${labels.primary}`}
                        >
                          {labels.primary}
                        </button>
                        <button
                          type="button"
                          className="oa-btn oa-btn-edit"
                          onClick={() => handleDismissAction(msg.id, tc)}
                          aria-label={`${labels.secondary}`}
                        >
                          {labels.secondary}
                        </button>
                      </div>
                    )}
                    {tc.status === 'confirmed' && (
                      <div className="oa-confirmed">✓ Done</div>
                    )}
                  </div>
                );
              })}
              {/* Batch dismiss: show when 2+ pending drafts */}
              {pendingToolCalls.length >= 2 && (
                <button
                  type="button"
                  className="oa-btn oa-btn-dismiss-all"
                  onClick={() => handleDismissAll(msg.id, msg.toolCalls!)}
                  aria-label="Dismiss all suggestions"
                >
                  Dismiss all
                </button>
              )}
              {/* Undo: show on latest Olivia response when no drafts confirmed */}
              {canUndo && (
                <button
                  type="button"
                  className="oa-btn oa-btn-undo"
                  onClick={() => handleUndoResponse(msg.id)}
                  aria-label="Undo this response"
                >
                  Undo
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Quick chips */}
      {showChips && chips.length > 0 && (
        <div className="quick-chips-row">
          <div className="quick-chips" role="list" aria-label="Quick suggestions">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="quick-chip"
                role="listitem"
                onClick={() => { setInputValue(chip.trim()); textareaRef.current?.focus(); }}
                aria-label={`Suggest: ${chip}`}
              >
                {getChipIcon(chip) && <span className="quick-chip-icon" aria-hidden="true">{getChipIcon(chip)}</span>}
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-bar">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            value={inputValue}
            placeholder="Ask Olivia anything…"
            onChange={(e) => { setInputValue(e.target.value); autoResize(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(inputValue); } }}
            aria-label="Message to Olivia"
            disabled={isStreaming}
          />
          <button
            type="button"
            className="chat-send"
            onClick={() => void sendMessage(inputValue)}
            aria-label="Send message"
            disabled={!inputValue.trim() || isStreaming}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}
