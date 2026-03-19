import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { computeFlags } from '@olivia/domain';
import type { InboxItem } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { loadInboxView, previewCreateCommand, confirmCreateCommand } from '../lib/sync';
import { ownerToDisplay } from '../lib/demo-data';
import { BottomNav } from '../components/bottom-nav';
import { TasksView } from '../components/screens/TasksView';
import type { AddTaskPreview, CompletedTask, FullTask } from '../types/display';

function toFullTask(item: InboxItem): FullTask {
  const flags = computeFlags(item);
  const accent: FullTask['accent'] = flags.overdue ? 'rose' : flags.dueSoon ? 'peach' : item.owner === 'spouse' ? 'mint' : '';
  const badge: FullTask['badge'] = flags.overdue
    ? { label: 'Needs attention', cls: 'badge-rose' }
    : flags.dueSoon
    ? { label: 'Soon', cls: 'badge-peach' }
    : item.owner === 'spouse'
    ? { label: 'Shared', cls: 'badge-violet' }
    : null;
  const assignee: FullTask['assignee'] =
    item.owner === 'stakeholder' ? { initial: 'L', name: 'Lexi', cls: '' }
    : item.owner === 'spouse'    ? { initial: 'C', name: 'Christian', cls: 'rose-av' }
    : null;
  return { id: item.id, title: item.title, dueText: item.dueText, accent, badge, assignee, pendingSync: item.pendingSync };
}

export function TasksPage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'active'],
    queryFn: () => loadInboxView(role, 'active'),
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
    const res = await previewCreateCommand(role, inputText);
    return {
      title: res.parsedItem.title,
      ownerDisplay: ownerToDisplay(res.parsedItem.owner),
      dueText: res.parsedItem.dueText,
      draftId: res.draftId,
    };
  };

  const handleConfirmTask = async (preview: AddTaskPreview): Promise<void> => {
    const full = await previewCreateCommand(role, undefined, { title: preview.title });
    await confirmCreateCommand(role, full.parsedItem, preview.draftId);
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
      <TasksView
        openTasks={openTasks}
        doneTasks={doneTasks}
        summaryLine={summaryLine}
        role={role}
        isLoading={inboxQuery.isLoading}
        error={inboxQuery.isError ? (inboxQuery.error as Error).message : null}
        onNavigateToItem={(id) => void navigate({ to: '/items/$itemId', params: { itemId: id } })}
        onPreviewTask={handlePreviewTask}
        onConfirmTask={handleConfirmTask}
      />
      <BottomNav activeTab="tasks" />
    </div>
  );
}
