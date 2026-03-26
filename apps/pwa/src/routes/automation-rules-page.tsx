import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { fetchAutomationRules, updateAutomationRule, deleteAutomationRule } from '../lib/api';
import { AUTOMATION_RULES_MAX_PER_HOUSEHOLD } from '@olivia/contracts';
import type { AutomationRule } from '@olivia/contracts';

function ruleSummary(rule: AutomationRule): string {
  const thresholdUnit =
    rule.triggerType === 'reminder_snooze_count' ? 'times' : 'days';
  const triggerLabel =
    rule.triggerType === 'routine_overdue_days'
      ? 'overdue'
      : rule.triggerType === 'reminder_snooze_count'
        ? 'snoozed'
        : 'overdue';
  const actionLabel =
    rule.actionType === 'skip_routine_occurrence'
      ? 'Skip routine'
      : rule.actionType === 'resolve_reminder'
        ? 'Resolve reminder'
        : 'Snooze reminder';
  return `${actionLabel} if ${triggerLabel} for ${rule.triggerThreshold}+ ${thresholdUnit}`;
}

function scopeLabel(rule: AutomationRule): string {
  if (rule.scopeType === 'all') {
    return rule.triggerType === 'routine_overdue_days'
      ? 'All routines'
      : 'All reminders';
  }
  return 'Specific item';
}

function triggerEntityType(rule: AutomationRule): 'routine' | 'reminder' {
  return rule.triggerType === 'routine_overdue_days' ? 'routine' : 'reminder';
}

export function AutomationRulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: fetchAutomationRules,
  });
  const rules = data?.rules ?? [];
  const enabledCount = rules.filter((r) => r.enabled).length;
  const atLimit = rules.length >= AUTOMATION_RULES_MAX_PER_HOUSEHOLD;

  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateAutomationRule(id, { enabled }),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['automation-rules'] });
      const prev = queryClient.getQueryData<{ rules: AutomationRule[] }>(['automation-rules']);
      queryClient.setQueryData<{ rules: AutomationRule[] }>(['automation-rules'], (old) =>
        old ? { rules: old.rules.map((r) => (r.id === id ? { ...r, enabled } : r)) } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['automation-rules'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAutomationRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      setDeleteTarget(null);
    },
  });

  const handleToggle = useCallback(
    (rule: AutomationRule) => {
      toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled });
    },
    [toggleMutation]
  );

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="auto-screen">
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/more/settings' })}
          >
            ← Settings
          </button>

          <div className="auto-header">
            <div className="auto-header__actions">
              <div>
                <div className="auto-header__title">Automation Rules</div>
                <div className="auto-header__sub">
                  {rules.length === 0
                    ? 'Let Olivia handle the repetitive stuff'
                    : `${enabledCount} of ${rules.length} rules active`}
                </div>
              </div>
              {rules.length > 0 && (
                <button
                  type="button"
                  className="auto-header__history-link"
                  onClick={() => void navigate({ to: '/more/settings/automation/history' })}
                >
                  History →
                </button>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="auto-empty">
              <div className="auto-empty__body">Loading…</div>
            </div>
          )}

          {!isLoading && rules.length === 0 && (
            <div className="auto-empty">
              <div className="auto-empty__icon">⚡</div>
              <div className="auto-empty__heading">No automation rules yet.</div>
              <div className="auto-empty__body">
                Create a rule to have Olivia automatically skip overdue routines,
                resolve forgotten reminders, and more.
              </div>
              <button
                type="button"
                className="auto-empty__cta"
                onClick={() => void navigate({ to: '/more/settings/automation/create' })}
              >
                + Add your first rule
              </button>
            </div>
          )}

          {!isLoading && rules.length > 0 && (
            <>
              {atLimit && (
                <div className="auto-limit-banner">
                  <span className="auto-limit-banner__text">
                    ⚡ Maximum {AUTOMATION_RULES_MAX_PER_HOUSEHOLD} rules reached. Delete a rule to add a new one.
                  </span>
                </div>
              )}

              <div className="auto-rule-list">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`auto-rule-card${!rule.enabled ? ' disabled' : ''}`}
                  >
                    <div className={`auto-rule-card__icon ${triggerEntityType(rule)}`}>
                      {triggerEntityType(rule) === 'routine' ? '🔄' : '🔔'}
                    </div>
                    <div
                      className="auto-rule-card__content"
                      onClick={() => setDeleteTarget(rule)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setDeleteTarget(rule); }}
                    >
                      <div className="auto-rule-summary">{ruleSummary(rule)}</div>
                      <div className="auto-rule-scope">{scopeLabel(rule)}</div>
                    </div>
                    <div className="auto-rule-toggle">
                      <button
                        type="button"
                        className={`auto-rule-toggle__track${rule.enabled ? ' on' : ''}`}
                        onClick={() => handleToggle(rule)}
                        role="switch"
                        aria-checked={rule.enabled}
                        aria-label={`Enable rule: ${ruleSummary(rule)}`}
                      >
                        <div className="auto-rule-toggle__thumb" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isLoading && rules.length > 0 && !atLimit && (
            <button
              type="button"
              className="auto-fab"
              onClick={() => void navigate({ to: '/more/settings/automation/create' })}
              aria-label="Add automation rule"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {deleteTarget && (
        <div className="auto-delete-confirm" onClick={() => setDeleteTarget(null)}>
          <div
            className="auto-delete-confirm__card"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="delete-rule-title"
          >
            <div className="auto-delete-confirm__title" id="delete-rule-title">
              Delete this rule?
            </div>
            <div className="auto-delete-confirm__desc">
              {ruleSummary(deleteTarget)} · {scopeLabel(deleteTarget)}
            </div>
            <div className="auto-delete-confirm__actions">
              <button
                type="button"
                className="auto-delete-confirm__cancel"
                onClick={() => setDeleteTarget(null)}
              >
                Keep Rule
              </button>
              <button
                type="button"
                className="auto-delete-confirm__delete"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
