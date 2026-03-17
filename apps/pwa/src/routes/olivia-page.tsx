import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BottomNav } from '../components/bottom-nav';
import { OliviaView } from '../components/screens/OliviaView';
import { fetchChatConversation } from '../lib/api';
import type { ChatMessage, ChatToolCall, QuickChip } from '../types/display';

function mapApiMessages(
  messages: Array<{
    id: string;
    role: string;
    content: string;
    toolCalls?: Array<{ id: string; type: string; data: Record<string, unknown>; status: string }> | null;
  }>
): ChatMessage[] {
  return messages.map(m => ({
    id: m.id,
    role: m.role === 'user' ? 'user' as const : 'olivia' as const,
    text: m.content,
    toolCalls: m.toolCalls?.map(tc => ({
      id: tc.id,
      type: tc.type,
      data: tc.data,
      status: tc.status as ChatToolCall['status']
    })) ?? null,
  }));
}

const DEFAULT_CHIPS: QuickChip[] = [
  "What's on for today?",
  "What's coming up?",
  "How's my week looking?",
  "What's overdue?",
];

export function OliviaPage() {
  const queryClient = useQueryClient();

  const conversationQuery = useQuery({
    queryKey: ['chat-conversation'],
    queryFn: () => fetchChatConversation(50),
    staleTime: 30_000,
  });

  const initialMessages = conversationQuery.data
    ? mapApiMessages(conversationQuery.data.messages)
    : [];

  const handleConversationCleared = () => {
    void queryClient.invalidateQueries({ queryKey: ['chat-conversation'] });
  };

  return (
    <div className="screen">
      <OliviaView
        initialMessages={initialMessages}
        chips={DEFAULT_CHIPS}
        onConversationCleared={handleConversationCleared}
      />
      <BottomNav activeTab="olivia" />
    </div>
  );
}
