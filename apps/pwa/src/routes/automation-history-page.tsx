import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { fetchAutomationLog, fetchAutomationRules } from '../lib/api';
import type { AutomationLogEntry, AutomationRule } from '@olivia/contracts';
import { format, isToday, isYesterday } from 'date-fns';

function groupByDay(entries: AutomationLogEntry[]): { label: string; entries: AutomationLogEntry[] }[] {
  const groups = new Map<string, AutomationLogEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.executedAt);
    const key = format(d, 'yyyy-MM-dd');
    const arr = groups.get(key) ?? [];
    arr.push(entry);
    groups.set(key, arr);
  }
  return Array.from(groups.entries()).map(([key, items]) => {
    const d = new Date(key);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else label = format(d, 'MMM d');
    return { label, entries: items };
  });
}

function actionLabel(entry: AutomationLogEntry): string {
  switch (entry.actionType) {
    case 'skip_routine_occurrence': return 'Skipped';
    case 'resolve_reminder': return 'Resolved';
    case 'snooze_reminder': return 'Snoozed';
  }
}

function ruleLabel(rule: AutomationRule | undefined): string {
  if (!rule) return 'Deleted rule';
  const unit = rule.triggerType === 'reminder_snooze_count' ? 'times' : 'days';
  const verb =
    rule.actionType === 'skip_routine_occurrence'
      ? 'Skip'
      : rule.actionType === 'resolve_reminder'
        ? 'Resolve'
        : 'Snooze';
  return `Rule: ${verb} if ${rule.triggerType === 'reminder_snooze_count' ? 'snoozed' : 'overdue'} ${rule.triggerThreshold}+ ${unit}`;
}

export function AutomationHistoryPage() {
  const navigate = useNavigate();
  const logQuery = useQuery({ queryKey: ['automation-log'], queryFn: () => fetchAutomationLog() });
  const rulesQuery = useQuery({ queryKey: ['automation-rules'], queryFn: fetchAutomationRules });

  const rulesById = useMemo(() => {
    const map = new Map<string, AutomationRule>();
    for (const r of rulesQuery.data?.rules ?? []) map.set(r.id, r);
    return map;
  }, [rulesQuery.data]);

  const entries = logQuery.data?.entries ?? [];
  const groups = useMemo(() => groupByDay(entries), [entries]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="auto-history-screen">
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/more/settings/automation' })}
          >
            ← Automation Rules
          </button>

          <div className="auto-header__title">History</div>
          <div className="auto-header__sub" style={{ marginBottom: 24 }}>
            Actions Olivia took on your behalf
          </div>

          {logQuery.isLoading && (
            <div className="auto-empty">
              <div className="auto-empty__body">Loading…</div>
            </div>
          )}

          {!logQuery.isLoading && entries.length === 0 && (
            <div className="auto-empty">
              <div className="auto-empty__heading">No automated actions yet.</div>
              <div className="auto-empty__body">
                When your rules fire, you'll see a log of what Olivia did here.
              </div>
            </div>
          )}

          {!logQuery.isLoading && entries.length > 0 && (
            <div className="auto-history-list">
              {groups.map((group) => (
                <div key={group.label} className="auto-history-group">
                  <div className="auto-history-group__date">{group.label}</div>
                  {group.entries.map((entry) => {
                    const isRoutine = entry.entityType === 'routine';
                    return (
                      <div key={entry.id} className="auto-history-entry">
                        <div className={`auto-history-entry__icon ${isRoutine ? 'routine' : 'reminder'}`}>
                          {isRoutine ? '⏭' : entry.actionType === 'snooze_reminder' ? '💤' : '✓'}
                        </div>
                        <div className="auto-history-entry__content">
                          <div className="auto-history-entry__action">
                            {actionLabel(entry)} {entry.entityType}
                          </div>
                          <div className="auto-history-entry__rule">
                            {ruleLabel(rulesById.get(entry.ruleId))}
                          </div>
                        </div>
                        <div className="auto-history-entry__time">
                          {format(new Date(entry.executedAt), 'h:mm a')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="auto-history-retention">
                Entries are kept for 30 days
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
