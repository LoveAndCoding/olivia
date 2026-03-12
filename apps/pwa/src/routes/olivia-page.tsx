import { useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { InboxItem } from '@olivia/contracts';
import { loadInboxView } from '../lib/sync';
import { useRole } from '../lib/role';
import { SendIcon } from '../components/icons';
import { buildFollowUpDraft, getActiveItems, getNudgeSuggestion } from '../lib/view-models';

type Message =
  | { id: string; speaker: 'olivia' | 'user'; kind: 'text'; text: string }
  | { id: string; speaker: 'olivia'; kind: 'action'; text: string; draftTitle: string; draftBody: string };

const STORAGE_KEY = 'olivia-chat-session';

const QUICK_CHIPS = [
  "What's this week?",
  'Home maintenance due',
  "What's Alex working on?",
  'What should I remember?'
];

export function OliviaPage() {
  const { role } = useRole();
  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'olivia'],
    queryFn: () => loadInboxView(role, 'all')
  });
  const search = useSearch({ from: '/olivia' });
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Message[]) : [];
  });
  const [draft, setDraft] = useState('');

  const activeItems = useMemo(() => getActiveItems(inboxQuery.data), [inboxQuery.data]);
  const seededMessages = useMemo<Message[] | null>(() => {
    if (messages.length > 0 || !inboxQuery.data) {
      return null;
    }

    const defaultSuggestion = getNudgeSuggestion(inboxQuery.data);
    const item = activeItems.find((entry) => entry.id === search.itemId) ?? null;

    if (search.intent === 'follow-up' && item) {
      return buildFollowUpConversation(item);
    }

    if (defaultSuggestion) {
      return [
        {
          id: crypto.randomUUID(),
          speaker: 'olivia' as const,
          kind: 'text' as const,
          text: `Hey Jamie! I noticed ${defaultSuggestion.title.toLowerCase()} still needs attention. Want me to help with the next step?`
        }
      ];
    }

    return [
      {
        id: crypto.randomUUID(),
        speaker: 'olivia' as const,
        kind: 'text' as const,
        text: "Hey Jamie! I'm here whenever you want a quick summary, a draft, or a memory lookup."
      }
    ];
  }, [activeItems, inboxQuery.data, messages.length, search.intent, search.itemId]);

  const visibleMessages = useMemo(() => (messages.length > 0 ? messages : seededMessages ?? []), [messages, seededMessages]);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(visibleMessages));
  }, [visibleMessages]);

  const pushConversation = (userText: string) => {
    const baseMessages = visibleMessages;
    const nextMessages: Message[] = [
      ...baseMessages,
      { id: crypto.randomUUID(), speaker: 'user' as const, kind: 'text' as const, text: userText },
      createOliviaReply(userText, activeItems)
    ];
    setMessages(nextMessages);
  };

  const handleSubmit = () => {
    if (!draft.trim()) return;
    pushConversation(draft.trim());
    setDraft('');
  };

  return (
    <div className="screen chat-screen">
      <section className="olivia-header">
        <div className="olivia-orb" aria-hidden="true">
          ✦
        </div>
        <div className="stack-sm">
          <h1 className="screen-title olivia-title">Olivia</h1>
          <p className="screen-subtitle">Your household assistant · always here</p>
        </div>
      </section>

      <div className="message-list" role="log" aria-live="polite">
        {visibleMessages.map((message) => (
          <article key={message.id} className={`msg msg-${message.speaker}`}>
            <span className="msg-label">{message.speaker === 'user' ? 'You' : 'Olivia'}</span>
            <div className="msg-bubble">
              <p>{message.text}</p>
              {message.kind === 'action' ? (
                <div className="olivia-action-card stack-md">
                  <span className="caps-label accent-violet">Draft message</span>
                  <div className="oa-preview">{message.draftBody}</div>
                  <div className="button-row">
                    <button type="button" className="btn-primary">Send it</button>
                    <button type="button" className="btn-secondary">Edit first</button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {visibleMessages.length < 4 ? (
        <div className="quick-chip-row">
          {QUICK_CHIPS.map((chip) => (
            <button key={chip} type="button" className="quick-chip" onClick={() => pushConversation(chip)}>
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <div className="chat-input-wrap">
        <div className="chat-input-bar">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            className="chat-textarea"
            placeholder="Ask Olivia anything..."
            aria-label="Ask Olivia anything"
          />
          <button type="button" className="send-button" onClick={handleSubmit} aria-label="Send message">
            <SendIcon className="send-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

function buildFollowUpConversation(item: InboxItem): Message[] {
  return [
    {
      id: crypto.randomUUID(),
      speaker: 'olivia',
      kind: 'text',
      text: `Hey Jamie! I noticed ${item.title.toLowerCase()} hasn't moved lately. Want me to write a friendly follow-up?`
    },
    {
      id: crypto.randomUUID(),
      speaker: 'user',
      kind: 'text',
      text: 'Yes please, keep it friendly but nudge them on timing.'
    },
    {
      id: crypto.randomUUID(),
      speaker: 'olivia',
      kind: 'action',
      text: "Done! Here's a draft - feel free to edit before sending:",
      draftTitle: 'Draft message',
      draftBody: buildFollowUpDraft(item.title)
    }
  ];
}

function createOliviaReply(input: string, items: InboxItem[]): Message {
  const normalized = input.toLowerCase();

  if (normalized.includes('remember')) {
    return {
      id: crypto.randomUUID(),
      speaker: 'olivia',
      kind: 'text',
      text: "I've kept the durable household notes in Memory so you can quickly find decisions, maintenance history, and service contacts."
    };
  }

  if (normalized.includes('alex')) {
    const alexItems = items.filter((item) => item.owner === 'spouse').slice(0, 2).map((item) => item.title);
    return {
      id: crypto.randomUUID(),
      speaker: 'olivia',
      kind: 'text',
      text: alexItems.length > 0 ? `Alex is currently holding ${alexItems.join(' and ')}.` : "Alex doesn't have anything assigned right now."
    };
  }

  if (normalized.includes('week')) {
    const summary = items.slice(0, 3).map((item) => item.title).join(', ');
    return {
      id: crypto.randomUUID(),
      speaker: 'olivia',
      kind: 'text',
      text: summary ? `This week looks centered on ${summary}. I can help you break any of those into next steps.` : "The week looks calm right now. No urgent tasks are crowding the top of the list."
    };
  }

  if (normalized.includes('draft') || normalized.includes('follow')) {
    const target = items[0];
    if (target) {
      return {
        id: crypto.randomUUID(),
        speaker: 'olivia',
        kind: 'action',
        text: "Here's a draft you can tune before sending:",
        draftTitle: 'Draft message',
        draftBody: buildFollowUpDraft(target.title)
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    speaker: 'olivia',
    kind: 'text',
    text: "I can summarize the week, draft a follow-up, or pull something back from Memory - just tell me what would be most helpful."
  };
}
