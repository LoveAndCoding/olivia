import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListItem } from '@olivia/contracts';
import { useRole } from '../lib/role';
import {
  loadListDetail,
  updateListTitleCommand,
  archiveListCommand,
  deleteListCommand,
  addListItemCommand,
  updateListItemBodyCommand,
  checkListItemCommand,
  uncheckListItemCommand,
  removeListItemCommand,
  clearCompletedItemsCommand,
  uncheckAllItemsCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { ListItemRow } from '../components/lists/ListItemRow';
import { InlineAddInput } from '../components/lists/InlineAddInput';
import { SpouseBanner } from '../components/lists/SpouseBanner';
import { OliviaListMessage } from '../components/lists/OliviaListMessage';
import { EditTitleSheet } from '../components/lists/EditTitleSheet';
import { EditItemSheet } from '../components/lists/EditItemSheet';
import { ArchiveListSheet } from '../components/lists/ArchiveListSheet';
import { DeleteListSheet } from '../components/lists/DeleteListSheet';
import { DeleteItemSheet } from '../components/lists/DeleteItemSheet';
import { OverflowMenuSheet } from '../components/lists/OverflowMenuSheet';
import { BottomSheet } from '../components/reminders/BottomSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import { showErrorToast } from '../lib/error-toast';

export function ListDetailPage() {
  const params = useParams({ from: '/lists/$listId' });
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const isSpouse = role === 'spouse';

  const [showEditTitleSheet, setShowEditTitleSheet] = useState(false);
  const [showArchiveSheet, setShowArchiveSheet] = useState(false);
  const [showDeleteListSheet, setShowDeleteListSheet] = useState(false);
  const [showListOverflow, setShowListOverflow] = useState(false);
  const [editItemTarget, setEditItemTarget] = useState<ListItem | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<ListItem | null>(null);
  const [itemOverflowTarget, setItemOverflowTarget] = useState<ListItem | null>(null);
  const [omsgDismissed, setOmsgDismissed] = useState(false);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showUncheckAllConfirm, setShowUncheckAllConfirm] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['list-detail', role, params.listId],
    queryFn: () => loadListDetail(role, params.listId),
  });

  const list = detailQuery.data?.list;
  const items: ListItem[] = detailQuery.data?.items ?? [];

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);
  const uncheckedItems = useMemo(() => sortedItems.filter((i) => !i.checked), [sortedItems]);
  const checkedItems = useMemo(() => sortedItems.filter((i) => i.checked), [sortedItems]);

  const totalItems = sortedItems.length;
  const checkedCount = checkedItems.length;
  const allChecked = totalItems > 0 && checkedCount === totalItems;
  const isArchived = list?.status === 'archived';
  const isOffline = !window.navigator.onLine;

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['list-detail', role, params.listId] });
    await queryClient.invalidateQueries({ queryKey: ['lists-active'] });
    await queryClient.invalidateQueries({ queryKey: ['lists-archived'] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  }, [queryClient, role, params.listId]);

  const handleEditTitle = useCallback(async (newTitle: string) => {
    if (!list) return;
    setShowEditTitleSheet(false);
    setBusy(true);
    try {
      await updateListTitleCommand(role, list.id, list.version, newTitle);
      await invalidate();
      showBanner('Renamed', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not rename list');
    } finally {
      setBusy(false);
    }
  }, [list, role, invalidate, showBanner]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!list) return;
    setShowArchiveSheet(false);
    setBusy(true);
    try {
      await archiveListCommand(role, list.id, list.version);
      await invalidate();
      void navigate({ to: '/lists' });
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not archive list');
    } finally {
      setBusy(false);
    }
  }, [list, role, invalidate, navigate]);

  const handleDeleteListConfirm = useCallback(async () => {
    if (!list) return;
    setShowDeleteListSheet(false);
    setBusy(true);
    try {
      await deleteListCommand(role, list.id);
      await invalidate();
      void navigate({ to: '/lists' });
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not delete list');
    } finally {
      setBusy(false);
    }
  }, [list, role, invalidate, navigate]);

  const handleAddItem = useCallback(async (body: string) => {
    if (!list) return;
    try {
      await addListItemCommand(role, list.id, body);
      await invalidate();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not add item');
    }
  }, [list, role, invalidate]);

  const handleCheckItem = useCallback(async (item: ListItem) => {
    if (!list) return;
    try {
      await checkListItemCommand(role, list.id, item.id, item.version);
      await invalidate();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not check item');
    }
  }, [list, role, invalidate]);

  const handleUncheckItem = useCallback(async (item: ListItem) => {
    if (!list) return;
    try {
      await uncheckListItemCommand(role, list.id, item.id, item.version);
      await invalidate();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not uncheck item');
    }
  }, [list, role, invalidate]);

  const handleEditItemSave = useCallback(async (newBody: string) => {
    if (!list || !editItemTarget) return;
    setEditItemTarget(null);
    setBusy(true);
    try {
      await updateListItemBodyCommand(role, list.id, editItemTarget.id, editItemTarget.version, newBody);
      await invalidate();
      showBanner('Updated', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not update item');
    } finally {
      setBusy(false);
    }
  }, [list, editItemTarget, role, invalidate, showBanner]);

  const handleDeleteItemConfirm = useCallback(async () => {
    if (!list || !deleteItemTarget) return;
    setDeleteItemTarget(null);
    setBusy(true);
    try {
      await removeListItemCommand(role, list.id, deleteItemTarget.id);
      await invalidate();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not remove item');
    } finally {
      setBusy(false);
    }
  }, [list, deleteItemTarget, role, invalidate]);

  const handleClearCompleted = useCallback(async () => {
    if (!list) return;
    setShowClearConfirm(false);
    setBusy(true);
    try {
      await clearCompletedItemsCommand(role, list.id);
      await invalidate();
      showBanner('Cleared', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not clear completed items');
    } finally {
      setBusy(false);
    }
  }, [list, role, invalidate, showBanner]);

  const handleUncheckAll = useCallback(async () => {
    if (!list) return;
    setShowUncheckAllConfirm(false);
    setBusy(true);
    try {
      await uncheckAllItemsCommand(role, list.id);
      await invalidate();
      showBanner('Items unchecked', 'mint');
      setCompletedExpanded(false);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not uncheck items');
    } finally {
      setBusy(false);
    }
  }, [list, role, invalidate, showBanner]);

  const listOverflowActions = useMemo(() => {
    if (!list) return [];
    const actions = [];
    if (!isArchived) {
      actions.push({ label: 'Rename', onClick: () => setShowEditTitleSheet(true) });
      if (checkedCount > 0 && !isSpouse) {
        actions.push({ label: 'Clear completed', onClick: () => setShowClearConfirm(true) });
        actions.push({ label: 'Uncheck all', onClick: () => setShowUncheckAllConfirm(true) });
      }
      actions.push({ label: 'Archive', onClick: () => setShowArchiveSheet(true) });
    }
    actions.push({ label: 'Delete', danger: true, onClick: () => setShowDeleteListSheet(true) });
    return actions;
  }, [list, isArchived, checkedCount, isSpouse]);

  const subtitle = totalItems === 0
    ? 'No items'
    : allChecked
    ? 'All done.'
    : `${totalItems} item${totalItems !== 1 ? 's' : ''} · ${checkedCount} checked`;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 0 }}>
        <div style={{ padding: '22px 16px 0' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/lists' })}
          >
            ← Lists
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="screen-title"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: 4,
                }}
              >
                {list?.title ?? '…'}
              </div>
              <div className="screen-sub" style={{ marginBottom: 16 }}>{subtitle}</div>
            </div>
            {!isSpouse && (
              <button
                type="button"
                className="list-card-overflow"
                aria-label="List options"
                style={{ marginTop: 4 }}
                onClick={() => setShowListOverflow(true)}
              >
                ···
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          {isSpouse && <SpouseBanner />}

          {isOffline && (
            <div className="list-offline-banner">
              Offline — your changes will sync when you reconnect.
            </div>
          )}

          {detailQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>
              Loading list…
            </div>
          )}

          {detailQuery.isError && !detailQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--rose)', fontSize: 13 }}>
              {(detailQuery.error as Error).message}
            </div>
          )}

          {!detailQuery.isLoading && sortedItems.length === 0 && (
            <div className="list-detail-empty">
              <div className="list-detail-empty-text">
                Nothing here yet — add the first item below.
              </div>
            </div>
          )}

          <div className="list-detail-items">
            {uncheckedItems.map((item) => (
              <ListItemRow
                key={item.id}
                item={item}
                onCheck={() => void handleCheckItem(item)}
                onUncheck={() => void handleUncheckItem(item)}
                onOverflow={() => setItemOverflowTarget(item)}
                isSpouse={isSpouse}
                disabled={busy}
              />
            ))}
          </div>

          {checkedCount > 0 && (
            <div className="list-completed-section">
              <button
                type="button"
                className="list-completed-header"
                onClick={() => setCompletedExpanded((v) => !v)}
                aria-expanded={completedExpanded}
              >
                <span className="list-completed-chevron">
                  {completedExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                </span>
                <span className="list-completed-label">
                  Completed ({checkedCount})
                </span>
              </button>
              {completedExpanded && (
                <div className="list-detail-items list-completed-items">
                  {checkedItems.map((item) => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      onCheck={() => void handleCheckItem(item)}
                      onUncheck={() => void handleUncheckItem(item)}
                      onOverflow={() => setItemOverflowTarget(item)}
                      isSpouse={isSpouse}
                      disabled={busy}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {allChecked && !omsgDismissed && !isSpouse && !isArchived && (
            <OliviaListMessage
              onArchive={() => { setOmsgDismissed(true); setShowArchiveSheet(true); }}
              onDismiss={() => setOmsgDismissed(true)}
            />
          )}

          <div style={{ height: 16 }} />
        </div>
      </div>

      {!isSpouse && !isArchived && (
        <InlineAddInput onAdd={handleAddItem} disabled={busy} />
      )}

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      {list && (
        <>
          <EditTitleSheet
            open={showEditTitleSheet}
            onClose={() => setShowEditTitleSheet(false)}
            currentTitle={list.title}
            onSave={handleEditTitle}
          />

          <ArchiveListSheet
            open={showArchiveSheet}
            onClose={() => setShowArchiveSheet(false)}
            onConfirm={() => void handleArchiveConfirm()}
          />

          <DeleteListSheet
            open={showDeleteListSheet}
            onClose={() => setShowDeleteListSheet(false)}
            listTitle={list.title}
            itemCount={totalItems}
            onConfirm={() => void handleDeleteListConfirm()}
          />

          <OverflowMenuSheet
            open={showListOverflow}
            onClose={() => setShowListOverflow(false)}
            actions={listOverflowActions}
          />
        </>
      )}

      {editItemTarget && (
        <EditItemSheet
          open={!!editItemTarget}
          onClose={() => setEditItemTarget(null)}
          currentBody={editItemTarget.body}
          onSave={handleEditItemSave}
        />
      )}

      {deleteItemTarget && (
        <DeleteItemSheet
          open={!!deleteItemTarget}
          onClose={() => setDeleteItemTarget(null)}
          itemBody={deleteItemTarget.body}
          onConfirm={() => void handleDeleteItemConfirm()}
        />
      )}

      {itemOverflowTarget && (
        <OverflowMenuSheet
          open={!!itemOverflowTarget}
          onClose={() => setItemOverflowTarget(null)}
          actions={[
            { label: 'Edit item', onClick: () => setEditItemTarget(itemOverflowTarget) },
            { label: 'Remove item', danger: true, onClick: () => setDeleteItemTarget(itemOverflowTarget) },
          ]}
        />
      )}

      <BottomSheet
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear completed?"
      >
        <div style={{ padding: '0 0 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '0 0 16px' }}>
            Remove {checkedCount} completed {checkedCount === 1 ? 'item' : 'items'}? This cannot be undone.
          </p>
          <div className="rem-actions-row">
            <button
              type="button"
              className="rem-btn rem-btn-primary"
              style={{ flex: 1, background: 'var(--rose)', borderColor: 'var(--rose)' }}
              onClick={() => void handleClearCompleted()}
            >
              Clear completed
            </button>
            <button
              type="button"
              className="rem-btn rem-btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={showUncheckAllConfirm}
        onClose={() => setShowUncheckAllConfirm(false)}
        title="Uncheck all?"
      >
        <div style={{ padding: '0 0 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '0 0 16px' }}>
            Uncheck all {checkedCount} completed {checkedCount === 1 ? 'item' : 'items'}? They'll move back to the list.
          </p>
          <div className="rem-actions-row">
            <button
              type="button"
              className="rem-btn rem-btn-primary"
              style={{ flex: 1 }}
              onClick={() => void handleUncheckAll()}
            >
              Uncheck all
            </button>
            <button
              type="button"
              className="rem-btn rem-btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setShowUncheckAllConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomNav activeTab="lists" />
    </div>
  );
}
