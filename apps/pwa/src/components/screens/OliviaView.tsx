import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, QuickChip } from '../../types/display';

const DRAFT_PREVIEW =
  "Hi Mike, just checking in on the quote from earlier this week — we're keen to get the bathroom project moving and would love to hear back when you have a moment. Any update on timing? Thanks!";

const DEFAULT_REPLIES = [
  "On it! Let me look at what's coming up for you this week… 🗓️",
  "Great question. Based on your household notes, here's what I found:",
  "I'll add that to your memory so you don't have to remember it yourself! 💡",
  "Noted — want me to set a reminder for this? I can nudge you at the right time.",
  "I can help with that! Give me a second to check your recent context…",
  "Done! Here's what I found — let me know if you'd like to dig deeper.",
];

export type OliviaViewProps = {
  /** Seed messages shown when the component mounts. */
  initialMessages?: ChatMessage[];
  /** Suggestion chips shown above the input. */
  chips?: QuickChip[];
  /** Rotational reply pool; defaults to built-in list. */
  replies?: string[];
  /** Quick route into the reminder workflow. */
  onOpenReminders?: () => void;
};

export function OliviaView({
  initialMessages = [],
  chips = [],
  replies = DEFAULT_REPLIES,
  onOpenReminders,
}: OliviaViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [replyIndex, setReplyIndex] = useState(0);
  const [showChips, setShowChips] = useState(chips.length > 0);
  const [draftSent, setDraftSent] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatAreaRef.current?.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      if (messages.length >= 3) setShowChips(false);
      scrollToBottom();

      const lowerText = text.toLowerCase();
      const isYesDraft =
        messages.length <= 2 &&
        (lowerText.includes('yes') || lowerText.includes('draft') || lowerText.includes('write') || lowerText.includes('please'));

      setTimeout(() => {
        const oliviaMsg: ChatMessage = isYesDraft
          ? { id: `olivia-${Date.now()}`, role: 'olivia', text: "Done! Here's a draft — feel free to edit before sending:", showDraftCard: true }
          : { id: `olivia-${Date.now()}`, role: 'olivia', text: replies[replyIndex % replies.length] };

        setMessages((prev) => [...prev, oliviaMsg]);
        if (!isYesDraft) setReplyIndex((i) => i + 1);
        scrollToBottom();
      }, 900);
    },
    [messages.length, replyIndex, replies, scrollToBottom],
  );

  const handleSendDraft = () => {
    setDraftSent(true);
    const sentMsg: ChatMessage = { id: `user-sent-${Date.now()}`, role: 'user', text: 'Sent! ✅' };
    setMessages((prev) => [...prev, sentMsg]);
    setTimeout(() => {
      const confirmMsg: ChatMessage = {
        id: `olivia-confirm-${Date.now()}`,
        role: 'olivia',
        text: "Perfect, I'll mark the plumber task as waiting on reply and remind you if there's no response in 2 days. 🎉",
      };
      setMessages((prev) => [...prev, confirmMsg]);
      scrollToBottom();
    }, 600);
    scrollToBottom();
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
  };

  return (
    <>
      {/* Header */}
      <div className="ai-header">
        <div className="ai-title-row">
          <div className="olivia-orb" aria-hidden="true">✦</div>
          <div>
            <div className="ai-title">Olivia</div>
            <div className="ai-sub">Your household assistant · always here</div>
          </div>
        </div>
        {onOpenReminders ? (
          <button type="button" className="secondary-button" style={{ marginTop: 12, width: '100%' }} onClick={onOpenReminders}>
            Review reminders
          </button>
        ) : null}
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
            <p>Ask me anything about your household.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`msg msg-${msg.role}`}>
            <div className="msg-label">{msg.role === 'olivia' ? 'Olivia' : 'You'}</div>
            <div className="msg-bubble">
              {msg.text}
              {msg.showDraftCard && !draftSent && (
                <div className="olivia-action-card">
                  <div className="oa-label">✉️ Draft message</div>
                  <div className="oa-preview">{DRAFT_PREVIEW}</div>
                  <div className="oa-buttons">
                    <button type="button" className="oa-btn oa-btn-send" onClick={handleSendDraft}>Send it ✓</button>
                    <button type="button" className="oa-btn oa-btn-edit">Edit first</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
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
                onClick={() => { setInputValue(chip.replace(/^[^\w]*/, '').trim()); textareaRef.current?.focus(); }}
                aria-label={`Suggest: ${chip}`}
              >
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
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); } }}
            aria-label="Message to Olivia"
          />
          <button
            type="button"
            className="chat-send"
            onClick={() => sendMessage(inputValue)}
            aria-label="Send message"
            disabled={!inputValue.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}
