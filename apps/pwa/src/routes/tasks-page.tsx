import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { computeFlags } from '@olivia/domain';
import type { InboxItem, User } from '@olivia/contracts';
import { loadInboxView, previewCreateCommand, confirmCreateCommand } from '../lib/sync';
import { useAuth } from '../lib/auth';
import { getHouseholdMembers } from '../lib/auth-api';
import { resolveUserName } from '../lib/reminder-helpers';
import { BottomNav } from '../components/bottom-nav';
import { TasksView } from '../components/screens/TasksView';
import type { AddTaskPreview, CompletedTask, FullTask } from '../types/display';

export function TasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, getSessionToken } = useAuth();
  const [members, setMembers] = useState<User[]>(currentUser ? [currentUser] : []);
  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    getHouseholdMembers(token).then(res => setMembers(res.members)).catch(() => {});
  }, [getSessionToken]);

  function toFullTask(item: InboxItem): FullTask {
    const flags = computeFlags(item);
    const isOtherUser = item.assigneeUserId !== null && item.assigneeUserId !== currentUser?.id;
    const accent: FullTask['accent'] = flags.overdue ? 'rose' : flags.dueSoon ? 'peach' : isOtherUser ? 'mint' : '';
    const badge: FullTask['badge'] = flags.overdue
      ? { label: 'Needs attention', cls: 'badge-rose' }
      : flags.dueSoon
      ? { label: 'Soon', cls: 'badge-peach' }
      : isOtherUser
      ? { label: 'Shared', cls: 'badge-violet' }
      : null;
    const userName = resolveUserName(item.assigneeUserId, members);
    const assignee: FullTask['assignee'] = item.assigneeUserId
      ? { initial: userName.charAt(0).toUpperCase(), name: userName, cls: isOtherUser ? 'rose-av' : '' }
      : null;
    return { id: item.id, title: item.title, dueText: item.dueText, accent, badge, assignee, pendingSync: item.pendingSync };
  }

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', currentUser?.id, 'active'],
    queryFn: () => loadInboxView('active'),
  });

  const { openTasks, doneTasks, openCount, doneCount } = useMemo(() => {
    if (!inboxQuery.data) return { openTasks: [], doneTasks: [], openCount: 0, doneCount: 0 };

    const allOpen: InboxItem[] = [
      ...inboxQuery.data.itemsByStatus.open,
      ...inboxQuery.data.itemsByStatus.in_progress,
    ];
    const done: InboxItem[] = inboxQuery.data.itemsByStatus.done;

    const sorted = [...allOpen].sort((a, b) => {
      const fa = computeFlags(a);
      const fb = computeFlags(b);
      if (fa.overdue && !fb.overdue) return -1;
      if (!fa.overdue && fb.overdue) return 1;
      if (fa.dueSoon && !fb.dueSoon) return -1;
      if (!fa.dueSoon && fb.dueSoon) return 1;
      return 0;
    });

    const completedTasks: CompletedTask[] = done.slice(0, 7).map((item) => ({ id: item.id, title: item.title }));

    return {
      openTasks: sorted.map(toFullTask),
      doneTasks: completedTasks,
      openCount: allOpen.length,
      doneCount: done.length,
    };
  }, [inboxQuery.data]);

  const handlePreviewTask = async (inputText: string): Promise<AddTaskPreview | null> => {
    const res = await previewCreateCommand(inputText);
    return {
      title: res.parsedItem.title,
      ownerDisplay: resolveUserName(res.parsedItem.assigneeUserId, members),
      dueText: res.parsedItem.dueText,
      draftId: res.draftId,
    };
  };

  const handleConfirmTask = async (preview: AddTaskPreview): Promise<void> => {
    const full = await previewCreateCommand(undefined, { title: preview.title });
    await confirmCreateCommand(full.parsedItem, preview.draftId);
    await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  };

  const summaryLine = inboxQuery.data
    ? `${openCount} open · ${doneCount} completed`
    : inboxQuery.isLoading
    ? 'Loading…'
    : 'Tasks';

  return (
    <div className="screen">
      <div style={{ padding: '22px 16px 0' }}>
        <button type="button" className="rem-detail-back" onClick={() => void navigate({ to: '/more' })}>← More</button>
      </div>
      <TasksView
        openTasks={openTasks}
        doneTasks={doneTasks}
        summaryLine={summaryLine}
        isLoading={inboxQuery.isLoading}
        error={inboxQuery.isError ? (inboxQuery.error as Error).message : null}
        onNavigateToItem={(id) => void navigate({ to: '/items/$itemId', params: { itemId: id } })}
        onPreviewTask={handlePreviewTask}
        onConfirmTask={handleConfirmTask}
      />
      <BottomNav activeTab="more" />
    </div>
  );
}
