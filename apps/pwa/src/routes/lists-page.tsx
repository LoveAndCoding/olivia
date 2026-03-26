import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SharedList } from '@olivia/contracts';
import { useAuth } from '../lib/auth';
import { Plus } from '@phosphor-icons/react';
import {
  loadActiveListIndex,
  loadArchivedListIndex,
  createListCommand,
  updateListTitleCommand,
  archiveListCommand,
  restoreListCommand,
  deleteListCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { ListCard } from '../components/lists/ListCard';
import { CollaborativeBanner } from '../components/auth/CollaborativeBanner';
import { CreateListSheet } from '../components/lists/CreateListSheet';
import { EditTitleSheet } from '../components/lists/EditTitleSheet';
import { ArchiveListSheet } from '../components/lists/ArchiveListSheet';
import { DeleteListSheet } from '../components/lists/DeleteListSheet';
import { OverflowMenuSheet } from '../components/lists/OverflowMenuSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { showErrorToast } from '../lib/error-toast';

type ListFilter = 'active' | 'archived';

export function ListsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ListFilter>('active');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [overflowTarget, setOverflowTarget] = useState<SharedList | null>(null);
  const [editTitleTarget, setEditTitleTarget] = useState<SharedList | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SharedList | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharedList | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [, setBusy] = useState(false);

  const activeQuery = useQuery({
    queryKey: ['lists-active', currentUser?.id],
    queryFn: () => loadActiveListIndex(),
    enabled: filter === 'active',
  });

  const archivedQuery = useQuery({
    queryKey: ['lists-archived', currentUser?.id],
    queryFn: () => loadArchivedListIndex(),
    enabled: filter === 'archived',
  });

  const currentQuery = filter === 'active' ? activeQuery : archivedQuery;
  const lists: SharedList[] = (filter === 'active'
    ? activeQuery.data?.lists
    : archivedQuery.data?.lists) ?? [];

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['lists-active'] });
    await queryClient.invalidateQueries({ queryKey: ['lists-archived'] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  }, [queryClient]);

  const handleCreate = useCallback(async (title: string) => {
    setShowCreateSheet(false);
    try {
      const newList = await createListCommand(title);
      await invalidate();
      showBanner('List created', 'mint');
      void navigate({ to: '/lists/$listId', params: { listId: newList.id } });
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not create list');
    }
  }, [currentUser?.id, invalidate, showBanner, navigate]);

  const handleEditTitle = useCallback(async (newTitle: string) => {
    if (!editTitleTarget) return;
    setEditTitleTarget(null);
    setBusy(true);
    try {
      await updateListTitleCommand(editTitleTarget.id, editTitleTarget.version, newTitle);
      await invalidate();
      showBanner('Renamed', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not rename list');
    } finally {
      setBusy(false);
    }
  }, [editTitleTarget, currentUser?.id, invalidate, showBanner]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    setArchiveTarget(null);
    setBusy(true);
    try {
      await archiveListCommand(archiveTarget.id, archiveTarget.version);
      await invalidate();
      showBanner('Archived', 'sky');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not archive list');
    } finally {
      setBusy(false);
    }
  }, [archiveTarget, currentUser?.id, invalidate, showBanner]);

  const handleRestoreList = useCallback(async (list: SharedList) => {
    setBusy(true);
    try {
      await restoreListCommand(list.id, list.version);
      await invalidate();
      showBanner('Restored to active lists', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not restore list');
    } finally {
      setBusy(false);
    }
  }, [currentUser?.id, invalidate, showBanner]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteTarget(null);
    setBusy(true);
    try {
      await deleteListCommand(deleteTarget.id);
      await invalidate();
      showBanner('List deleted', 'sky');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not delete list');
    } finally {
      setBusy(false);
    }
  }, [deleteTarget, currentUser?.id, invalidate, showBanner]);

  const getOverflowActions = useCallback((list: SharedList) => {
    if (filter === 'archived') {
      return [
        {
          label: 'Restore',
          onClick: () => void handleRestoreList(list),
        },
        {
          label: 'Delete',
          danger: true,
          onClick: () => setDeleteTarget(list),
        },
      ];
    }
    return [
      {
        label: 'Rename',
        onClick: () => setEditTitleTarget(list),
      },
      {
        label: 'Archive',
        onClick: () => setArchiveTarget(list),
      },
      {
        label: 'Delete',
        danger: true,
        onClick: () => setDeleteTarget(list),
      },
    ];
  }, [filter, handleRestoreList]);

  const subtitle = (() => {
    if (filter === 'active') {
      const count = lists.length;
      return count === 0 ? 'No active lists' : `${count} list${count !== 1 ? 's' : ''}`;
    }
    const count = lists.length;
    return count === 0 ? 'No archived lists' : `${count} archived`;
  })();

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px 0' }}>
          <div className="screen-title">Lists</div>
          <div className="screen-sub" style={{ marginBottom: 16 }}>{subtitle}</div>

          <div className="rem-filters" style={{ marginBottom: 16 }}>
            {(['active', 'archived'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`ftab${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'active' ? 'Active' : 'Archived'}
              </button>
            ))}
          </div>

          {filter === 'active' && (
            <button
              type="button"
              className="list-new-btn"
              onClick={() => setShowCreateSheet(true)}
            >
              <div className="list-new-btn-icon"><Plus size={20} /></div>
              <span className="list-new-btn-label">New list</span>
            </button>
          )}
        </div>

        <div style={{ padding: '0 16px' }}>
          <CollaborativeBanner />

          {currentQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>
              Loading lists…
            </div>
          )}

          {currentQuery.isError && !currentQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--rose)', fontSize: 13 }}>
              {(currentQuery.error as Error).message}
            </div>
          )}

          {!currentQuery.isLoading && lists.length === 0 && filter === 'active' && (
            <div className="lists-empty">
              <div className="lists-empty-message">
                No lists yet. Create one for groceries, packing, or anything the household needs to track together.
              </div>
            </div>
          )}

          {!currentQuery.isLoading && lists.length === 0 && filter === 'archived' && (
            <div className="lists-empty">
              <div className="lists-empty-message">
                No archived lists. Lists you archive will appear here.
              </div>
            </div>
          )}

          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onClick={() => void navigate({ to: '/lists/$listId', params: { listId: list.id } })}
              onOverflow={() => setOverflowTarget(list)}
              showOverflow
            />
          ))}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      <CreateListSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSave={handleCreate}
      />

      {editTitleTarget && (
        <EditTitleSheet
          open={!!editTitleTarget}
          onClose={() => setEditTitleTarget(null)}
          currentTitle={editTitleTarget.title}
          onSave={handleEditTitle}
        />
      )}

      {archiveTarget && (
        <ArchiveListSheet
          open={!!archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => void handleArchiveConfirm()}
        />
      )}

      {deleteTarget && (
        <DeleteListSheet
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          listTitle={deleteTarget.title}
          itemCount={deleteTarget.activeItemCount + deleteTarget.checkedItemCount}
          onConfirm={() => void handleDeleteConfirm()}
        />
      )}

      {overflowTarget && (
        <OverflowMenuSheet
          open={!!overflowTarget}
          onClose={() => setOverflowTarget(null)}
          actions={getOverflowActions(overflowTarget)}
        />
      )}

      <BottomNav activeTab="lists" />
    </div>
  );
}
