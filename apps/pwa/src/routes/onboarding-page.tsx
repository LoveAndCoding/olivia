import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from '@phosphor-icons/react';
import type { ChatMessage, ChatToolCall } from '../types/display';
import {
  fetchOnboardingConversation,
  streamOnboardingMessage,
  confirmChatAction,
  dismissChatAction,
  advanceOnboardingTopic,
  finishOnboarding,
  fetchOnboardingState,
  type OnboardingSession,
  type ChatStreamEvent,
} from '../lib/api';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_TOPICS = ['tasks', 'routines', 'reminders', 'lists', 'meals'] as const;

const TOPIC_LABELS: Record<string, { label: string; emoji: string }> = {
  tasks: { label: 'TASKS', emoji: '\u{1F4CB}' },
  routines: { label: 'ROUTINES', emoji: '\u{1F504}' },
  reminders: { label: 'REMINDERS', emoji: '\u{1F514}' },
  lists: { label: 'LISTS', emoji: '\u{1F4DD}' },
  meals: { label: 'MEALS', emoji: '\u{1F37D}\u{FE0F}' },
};

const TOPIC_PLACEHOLDERS: Record<string, string> = {
  tasks: 'List your tasks, to-dos, anything on your mind\u2026',
  routines: 'What recurring chores does your household do?',
  reminders: 'Any deadlines or dates you don\u2019t want to forget?',
  lists: 'Groceries, shopping, packing \u2014 any shared lists?',
  meals: 'Do you plan meals? Tell me about your pattern\u2026',
};

const ACTION_LABELS: Record<string, { label: string; primary: string; secondary: string }> = {
  create_inbox_item: { label: 'NEW TASK', primary: 'Add task', secondary: 'Skip' },
  create_reminder: { label: 'NEW REMINDER', primary: 'Set reminder', secondary: 'Skip' },
  create_routine: { label: 'NEW ROUTINE', primary: 'Add routine', secondary: 'Skip' },
  create_shared_list: { label: 'NEW LIST', primary: 'Create list', secondary: 'Skip' },
  add_list_item: { label: 'LIST ITEM', primary: 'Add to list', secondary: 'Skip' },
  create_meal_entry: { label: 'MEAL ENTRY', primary: 'Add meal', secondary: 'Skip' },
};

function getConfidenceLevel(tc: ChatToolCall): 'high' | 'medium' | 'low' {
  const confidence = typeof tc.data.parseConfidence === 'number' ? tc.data.parseConfidence : 1;
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

function ConfidenceDot({ tc }: { tc: ChatToolCall }) {
  const level = getConfidenceLevel(tc);
  const label = level === 'high' ? 'HIGH' : level === 'medium' ? 'MED' : 'LOW';
  return (
    <span className={`oa-confidence oa-confidence-${level}`} aria-label={`Parse confidence: ${level}`}>
      <span className="oa-confidence-dot" />
      {level !== 'high' && <span className="oa-confidence-label">{label}</span>}
    </span>
  );
}

function formatToolCallPreview(tc: ChatToolCall): string {
  const d = tc.data;
  switch (tc.type) {
    case 'create_inbox_item':
      return `${d.title ?? ''}${d.dueText ? ` \u00B7 due ${d.dueText}` : ''}`;
    case 'create_reminder':
      return `${d.title ?? ''}${d.scheduledAt ? ` \u00B7 ${String(d.scheduledAt).slice(0, 16)}` : ''}`;
    case 'create_routine':
      return `${d.title ?? ''} \u00B7 ${d.recurrenceRule ?? 'weekly'}`;
    case 'create_shared_list':
      return `${d.title ?? ''}`;
    case 'add_list_item':
      return `"${d.body ?? ''}" \u2192 ${d.listTitle ?? 'list'}`;
    case 'create_meal_entry':
      return `${d.name ?? ''}`;
    default:
      return tc.type;
  }
}

/** Map API message to display ChatMessage type */
function mapApiMessage(m: { id: string; role: string; content: string; toolCalls?: Array<{ id: string; type: string; data: Record<string, unknown>; status: string }> | null }): ChatMessage {
  return {
    id: m.id,
    role: m.role === 'user' ? 'user' : 'olivia',
    text: m.content,
    toolCalls: m.toolCalls?.map(tc => ({
      id: tc.id,
      type: tc.type,
      data: tc.data,
      status: tc.status as 'pending' | 'confirmed' | 'dismissed',
    })) ?? undefined,
  };
}

// ─── Topic Progress Bar ────────────────────────────────────────────────────

function TopicProgressBar({ completedTopics, currentTopic }: {
  completedTopics: string[];
  currentTopic: string | null;
}) {
  return (
    <div
      className="onb-progress-bar"
      role="progressbar"
      aria-valuenow={completedTopics.length}
      aria-valuemax={ALL_TOPICS.length}
      aria-label={`${completedTopics.length} of ${ALL_TOPICS.length} topics completed`}
    >
      {ALL_TOPICS.map((topic) => {
        const isCompleted = completedTopics.includes(topic);
        const isCurrent = topic === currentTopic;
        const state = isCompleted ? 'done' : isCurrent ? 'current' : 'ahead';
        const info = TOPIC_LABELS[topic];
        return (
          <div key={topic} className={`onb-progress-item onb-progress-${state}`}>
            <div className={`onb-progress-dot onb-progress-dot-${state}`} aria-hidden="true" />
            <span className="onb-progress-label">{info?.label ?? topic}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Onboarding Chat Page ──────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingToolCalls, setStreamingToolCalls] = useState<ChatToolCall[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showExitButtons, setShowExitButtons] = useState(false);

  // Load onboarding state
  const stateQuery = useQuery({
    queryKey: ['onboarding-state'],
    queryFn: fetchOnboardingState,
  });

  const session: OnboardingSession | null = stateQuery.data?.session ?? null;

  // Load conversation history
  const convQuery = useQuery({
    queryKey: ['onboarding-conversation'],
    queryFn: () => fetchOnboardingConversation(50),
  });

  // Sync messages from query
  useEffect(() => {
    if (convQuery.data?.messages) {
      const mapped = convQuery.data.messages.map(mapApiMessage);
      setMessages(mapped);
      // Show exit buttons if the last message with tool calls has all resolved
      const lastWithTools = [...mapped].reverse().find(m => m.toolCalls && m.toolCalls.length > 0);
      if (lastWithTools?.toolCalls?.every(tc => tc.status !== 'pending')) {
        setShowExitButtons(true);
      }
    }
  }, [convQuery.data]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, streamingToolCalls]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    setInputValue('');
    setIsStreaming(true);
    setStreamingText('');
    setStreamingToolCalls([]);
    setShowExitButtons(false);

    // Add user message optimistically
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      text,
    };
    setMessages(prev => [...prev, userMsg]);

    let fullText = '';
    const toolCalls: ChatToolCall[] = [];

    for await (const evt of streamOnboardingMessage(text)) {
      if (evt.event === 'text') {
        fullText += (evt as ChatStreamEvent & { event: 'text' }).data.delta;
        setStreamingText(fullText);
      } else if (evt.event === 'tool_call') {
        const tcData = (evt as ChatStreamEvent & { event: 'tool_call' }).data.toolCall;
        const tc: ChatToolCall = {
          id: tcData.id,
          type: tcData.type,
          data: tcData.data,
          status: tcData.status as 'pending' | 'confirmed' | 'dismissed',
        };
        toolCalls.push(tc);
        setStreamingToolCalls([...toolCalls]);
      } else if (evt.event === 'done') {
        const doneEvt = evt as ChatStreamEvent & { event: 'done' };
        const assistantMsg: ChatMessage = {
          id: doneEvt.data.messageId,
          role: 'olivia',
          text: fullText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingText('');
        setStreamingToolCalls([]);
      } else if (evt.event === 'error') {
        const errorEvt = evt as ChatStreamEvent & { event: 'error' };
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'olivia',
          text: errorEvt.data.message,
          isError: true,
        };
        setMessages(prev => [...prev, errorMsg]);
        setStreamingText('');
        setStreamingToolCalls([]);
      }
    }

    setIsStreaming(false);
  }, [inputValue, isStreaming]);

  const handleConfirm = useCallback(async (msgId: string, toolCallId: string) => {
    try {
      await confirmChatAction(toolCallId);
      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === msgId && m.toolCalls
            ? { ...m, toolCalls: m.toolCalls.map(tc => tc.id === toolCallId ? { ...tc, status: 'confirmed' as const } : tc) }
            : m
        );
        // Show exit buttons if all tool calls in the message are resolved
        const msg = updated.find(m => m.id === msgId);
        if (msg?.toolCalls?.every(tc => tc.status !== 'pending')) {
          setShowExitButtons(true);
        }
        return updated;
      });
      void queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
    } catch {
      // ignore
    }
  }, [queryClient]);

  const handleDismiss = useCallback(async (msgId: string, toolCallId: string) => {
    try {
      await dismissChatAction(toolCallId);
      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === msgId && m.toolCalls
            ? { ...m, toolCalls: m.toolCalls.map(tc => tc.id === toolCallId ? { ...tc, status: 'dismissed' as const } : tc) }
            : m
        );
        // Show exit buttons if all tool calls in the message are resolved
        const msg = updated.find(m => m.id === msgId);
        if (msg?.toolCalls?.every(tc => tc.status !== 'pending')) {
          setShowExitButtons(true);
        }
        return updated;
      });
    } catch {
      // ignore
    }
  }, []);

  const handleKeepGoing = useCallback(async () => {
    try {
      setShowExitButtons(false);
      const result = await advanceOnboardingTopic();
      void queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
      if (result.done) {
        const completionMsg: ChatMessage = {
          id: `completion-${Date.now()}`,
          role: 'olivia',
          text: `Here\u2019s what we set up together \u2728\n\nYou\u2019re all set! I\u2019ll be here whenever you need help managing things.`,
        };
        setMessages(prev => [...prev, completionMsg]);
      } else if (result.topicPrompt) {
        const topicMsg: ChatMessage = {
          id: `topic-${Date.now()}`,
          role: 'olivia',
          text: result.topicPrompt,
          topic: result.currentTopic ?? undefined,
        };
        setMessages(prev => [...prev, topicMsg]);
      }
    } catch {
      // ignore
    }
  }, [queryClient]);

  const handleThatsEnough = useCallback(async () => {
    try {
      await finishOnboarding();
      localStorage.setItem('olivia-onboarding-seen', 'true');
      void queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
      void queryClient.invalidateQueries({ queryKey: ['weekly-view'] });

      const completionMsg: ChatMessage = {
        id: `completion-${Date.now()}`,
        role: 'olivia',
        text: session?.entitiesCreated
          ? `Great start! You\u2019ve added ${session.entitiesCreated} item${session.entitiesCreated === 1 ? '' : 's'} to your household. I\u2019ll be here whenever you need help managing things.`
          : `You\u2019re all set! I\u2019ll be here whenever you need help managing things.`,
      };
      setMessages(prev => [...prev, completionMsg]);
    } catch {
      // ignore
    }
  }, [queryClient, session]);

  const handleGoHome = useCallback(() => {
    localStorage.setItem('olivia-onboarding-seen', 'true');
    void queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
    void queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
    void navigate({ to: '/' });
  }, [navigate, queryClient]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  const isFinished = session?.status === 'finished';
  const completedTopics = session?.topicsCompleted ?? [];
  const currentTopic = session?.currentTopic ?? null;
  const placeholder = currentTopic ? (TOPIC_PLACEHOLDERS[currentTopic] ?? 'Tell me more\u2026') : 'Tell me more\u2026';

  return (
    <div className="onb-page">
      {/* Header */}
      <header className="onb-header">
        <button type="button" className="onb-back" onClick={() => void navigate({ to: '/' })}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="onb-header-content">
          <div className="onb-orb olivia-orb" aria-hidden="true" />
          <div className="onb-header-text">
            <div className="onb-title">Getting set up</div>
            <div className="onb-subtitle">Your household, organized</div>
          </div>
        </div>
        <TopicProgressBar completedTopics={completedTopics} currentTopic={currentTopic} />
      </header>

      {/* Chat Area */}
      <div className="chat-area onb-chat-area" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg msg-${msg.role === 'user' ? 'user' : 'olivia'}`}>
            <div className="msg-label">{msg.role === 'user' ? 'YOU' : 'OLIVIA'}</div>
            <div className="msg-bubble">
              {msg.topic && TOPIC_LABELS[msg.topic] && (
                <div className="onb-topic-badge">
                  {TOPIC_LABELS[msg.topic].emoji} {TOPIC_LABELS[msg.topic].label}
                </div>
              )}
              {msg.text && <p>{msg.text}</p>}
              {msg.toolCalls?.map(tc => {
                const labels = ACTION_LABELS[tc.type] ?? { label: tc.type.toUpperCase(), primary: 'Confirm', secondary: 'Skip' };
                return (
                  <div
                    key={tc.id}
                    className={`olivia-action-card ${tc.status !== 'pending' ? `oa-${tc.status}` : ''}`}
                  >
                    <div className="oa-label">
                      {labels.label}
                      <ConfidenceDot tc={tc} />
                    </div>
                    <div className="oa-preview">{formatToolCallPreview(tc)}</div>
                    {tc.status === 'pending' && (
                      <div className="oa-buttons">
                        <button
                          type="button"
                          className="oa-btn oa-btn-send"
                          onClick={() => void handleConfirm(msg.id, tc.id)}
                        >
                          {labels.primary}
                        </button>
                        <button
                          type="button"
                          className="oa-btn oa-btn-edit"
                          onClick={() => void handleDismiss(msg.id, tc.id)}
                        >
                          {labels.secondary}
                        </button>
                      </div>
                    )}
                    {tc.status === 'confirmed' && <div className="oa-status oa-confirmed">Added</div>}
                    {tc.status === 'dismissed' && <div className="oa-status oa-dismissed">Skipped</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="msg msg-olivia">
            <div className="msg-label">OLIVIA</div>
            <div className="msg-bubble">
              {streamingText && <p>{streamingText}</p>}
              {streamingToolCalls.map(tc => {
                const labels = ACTION_LABELS[tc.type] ?? { label: tc.type.toUpperCase(), primary: 'Confirm', secondary: 'Skip' };
                return (
                  <div key={tc.id} className="olivia-action-card">
                    <div className="oa-label">{labels.label}</div>
                    <div className="oa-preview">{formatToolCallPreview(tc)}</div>
                  </div>
                );
              })}
              {!streamingText && streamingToolCalls.length === 0 && (
                <div className="typing-indicator" aria-label="Olivia is thinking">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progressive exit buttons — shown after entity confirmation/skip */}
        {!isStreaming && !isFinished && showExitButtons && (
          <div className="onb-exit-prompt">
            <button type="button" className="btn-primary onb-btn" onClick={() => void handleKeepGoing()}>
              Keep going {'\u2192'}
            </button>
            <button type="button" className="btn-secondary onb-btn" onClick={() => void handleThatsEnough()}>
              That{'\u2019'}s enough {'\u2713'}
            </button>
          </div>
        )}

        {/* Go home button after completion */}
        {isFinished && (
          <div className="onb-exit-prompt">
            <button type="button" className="btn-primary onb-btn" onClick={handleGoHome}>
              Go to home {'\u2192'}
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {!isFinished && (
        <div className="chat-input-area">
          <div className="chat-input-bar">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
              style={{ maxHeight: 80 }}
            />
            <button
              type="button"
              className="chat-send"
              disabled={!inputValue.trim() || isStreaming}
              onClick={() => void handleSend()}
              aria-label="Send message"
            >
              {'\u2191'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
