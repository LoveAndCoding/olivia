import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { createAutomationRule, fetchActiveRoutineIndex, fetchReminderView } from '../lib/api';
import type {
  AutomationTriggerType,
  AutomationActionType,
  AutomationScopeType,
} from '@olivia/contracts';

const TOTAL_STEPS = 5;

const TRIGGER_OPTIONS: {
  value: AutomationTriggerType;
  title: string;
  desc: string;
  icon: string;
  iconClass: string;
  entityType: 'routine' | 'reminder';
}[] = [
  {
    value: 'routine_overdue_days',
    title: 'Routine overdue',
    desc: 'When a routine is overdue for a number of days',
    icon: '🔄',
    iconClass: 'routine',
    entityType: 'routine',
  },
  {
    value: 'reminder_snooze_count',
    title: 'Reminder snoozed',
    desc: 'When a reminder has been snoozed a number of times',
    icon: '🔔',
    iconClass: 'reminder',
    entityType: 'reminder',
  },
  {
    value: 'reminder_overdue_days',
    title: 'Reminder overdue',
    desc: 'When a reminder is overdue for a number of days',
    icon: '🔔',
    iconClass: 'reminder',
    entityType: 'reminder',
  },
];

const ACTION_OPTIONS: {
  value: AutomationActionType;
  title: string;
  desc: string;
  icon: string;
  iconClass: string;
  forTriggers: AutomationTriggerType[];
}[] = [
  {
    value: 'skip_routine_occurrence',
    title: 'Skip to next occurrence',
    desc: 'Advance the routine to its next scheduled date',
    icon: '⏭',
    iconClass: 'routine',
    forTriggers: ['routine_overdue_days'],
  },
  {
    value: 'resolve_reminder',
    title: 'Resolve reminder',
    desc: 'Mark the reminder as resolved automatically',
    icon: '✓',
    iconClass: 'reminder',
    forTriggers: ['reminder_snooze_count', 'reminder_overdue_days'],
  },
  {
    value: 'snooze_reminder',
    title: 'Snooze reminder',
    desc: 'Snooze the reminder for later',
    icon: '💤',
    iconClass: 'reminder',
    forTriggers: ['reminder_snooze_count', 'reminder_overdue_days'],
  },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="auto-step-indicator" aria-label={`Step ${current} of ${TOTAL_STEPS}`}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`auto-step-dot${i + 1 === current ? ' active' : ''}${i + 1 < current ? ' completed' : ''}`}
        />
      ))}
    </div>
  );
}

export function AutomationCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [trigger, setTrigger] = useState<AutomationTriggerType | null>(null);
  const [threshold, setThreshold] = useState(3);
  const [action, setAction] = useState<AutomationActionType | null>(null);
  const [scopeType, setScopeType] = useState<AutomationScopeType>('all');
  const [scopeEntityId, setScopeEntityId] = useState<string | null>(null);

  const selectedTrigger = TRIGGER_OPTIONS.find((t) => t.value === trigger);
  const entityType = selectedTrigger?.entityType ?? 'routine';

  // Fetch entities for scope picker
  const routinesQuery = useQuery({
    queryKey: ['routines-active'],
    queryFn: fetchActiveRoutineIndex,
    enabled: entityType === 'routine' && step >= 4,
  });
  const remindersQuery = useQuery({
    queryKey: ['reminders-view'],
    queryFn: fetchReminderView,
    enabled: entityType === 'reminder' && step >= 4,
  });

  const entities = useMemo(() => {
    if (entityType === 'routine') {
      return (routinesQuery.data?.routines ?? []).map((r) => ({ id: r.id, name: r.title }));
    }
    const rbs = remindersQuery.data?.remindersByState;
    if (!rbs) return [];
    const all = [...rbs.upcoming, ...rbs.due, ...rbs.overdue, ...rbs.snoozed];
    return all.map((r) => ({ id: r.id, name: r.title }));
  }, [entityType, routinesQuery.data, remindersQuery.data]);

  const availableActions = useMemo(
    () => (trigger ? ACTION_OPTIONS.filter((a) => a.forTriggers.includes(trigger)) : []),
    [trigger]
  );

  // Pre-select single action
  const effectiveAction = useMemo(() => {
    if (action) return action;
    if (availableActions.length === 1) return availableActions[0].value;
    return null;
  }, [action, availableActions]);

  const thresholdMax = trigger === 'reminder_snooze_count' ? 10 : 30;
  const thresholdUnit = trigger === 'reminder_snooze_count' ? 'times snoozed' : 'days overdue';
  const thresholdHint =
    trigger === 'reminder_snooze_count'
      ? 'Recommended: 3 times for reminders'
      : trigger === 'routine_overdue_days'
        ? 'Recommended: 3 days for routines'
        : 'Recommended: 7 days for reminders';

  const scopePreviewCount = useMemo(() => {
    if (scopeType === 'specific') {
      const ent = entities.find((e) => e.id === scopeEntityId);
      return ent ? ent.name : '1 item';
    }
    return `${entities.length} ${entityType === 'routine' ? 'routines' : 'reminders'}`;
  }, [scopeType, scopeEntityId, entities, entityType]);

  const createMutation = useMutation({
    mutationFn: () =>
      createAutomationRule({
        triggerType: trigger!,
        triggerThreshold: threshold,
        actionType: effectiveAction!,
        scopeType,
        scopeEntityId: scopeType === 'specific' ? scopeEntityId : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      void navigate({ to: '/more/settings/automation' });
    },
  });

  const canNext = useCallback((): boolean => {
    switch (step) {
      case 1: return trigger !== null;
      case 2: return true; // threshold always has default
      case 3: return effectiveAction !== null;
      case 4: return scopeType === 'all' || scopeEntityId !== null;
      case 5: return true;
      default: return false;
    }
  }, [step, trigger, effectiveAction, scopeType, scopeEntityId]);

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      // If entering step 3 with only one action, pre-select it
      if (step === 2 && availableActions.length === 1) {
        setAction(availableActions[0].value);
      }
      setStep(step + 1);
    } else {
      createMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else void navigate({ to: '/more/settings/automation' });
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="auto-create-screen">
          <button type="button" className="rem-detail-back" onClick={handleBack}>
            ← {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <StepIndicator current={step} />

          {/* Step 1: Select trigger */}
          {step === 1 && (
            <>
              <div className="auto-step-title">When should this rule fire?</div>
              <div className="auto-step-sub">Choose a trigger condition</div>
              <div className="auto-option-cards">
                {TRIGGER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`auto-option-card${trigger === opt.value ? ' selected' : ''}`}
                    onClick={() => {
                      setTrigger(opt.value);
                      // Reset downstream when trigger changes
                      setAction(null);
                      setScopeType('all');
                      setScopeEntityId(null);
                      setThreshold(3);
                    }}
                    role="radio"
                    aria-checked={trigger === opt.value}
                  >
                    <div className={`auto-option-card__icon ${opt.iconClass}`}>{opt.icon}</div>
                    <div className="auto-option-card__content">
                      <div className="auto-option-card__title">{opt.title}</div>
                      <div className="auto-option-card__desc">{opt.desc}</div>
                    </div>
                    <div className="auto-option-card__check">
                      {trigger === opt.value && '✓'}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Configure threshold */}
          {step === 2 && (
            <>
              <div className="auto-step-title">How long before it fires?</div>
              <div className="auto-step-sub">Set the threshold</div>
              <div className="auto-threshold">
                <button
                  type="button"
                  className="auto-threshold__minus"
                  onClick={() => setThreshold((t) => Math.max(1, t - 1))}
                  disabled={threshold <= 1}
                  aria-label="Decrease"
                >
                  −
                </button>
                <div className="auto-threshold__value" aria-label={`Threshold: ${threshold}`}>
                  {threshold}
                </div>
                <button
                  type="button"
                  className="auto-threshold__plus"
                  onClick={() => setThreshold((t) => Math.min(thresholdMax, t + 1))}
                  disabled={threshold >= thresholdMax}
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
              <div className="auto-threshold__unit">{thresholdUnit}</div>
              <div className="auto-threshold__hint">{thresholdHint}</div>
            </>
          )}

          {/* Step 3: Select action */}
          {step === 3 && (
            <>
              <div className="auto-step-title">What should Olivia do?</div>
              <div className="auto-step-sub">Choose the automatic action</div>
              <div className="auto-option-cards" role="radiogroup" aria-label="Action type">
                {availableActions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`auto-option-card${effectiveAction === opt.value ? ' selected' : ''}`}
                    onClick={() => setAction(opt.value)}
                    role="radio"
                    aria-checked={effectiveAction === opt.value}
                  >
                    <div className={`auto-option-card__icon ${opt.iconClass}`}>{opt.icon}</div>
                    <div className="auto-option-card__content">
                      <div className="auto-option-card__title">{opt.title}</div>
                      <div className="auto-option-card__desc">{opt.desc}</div>
                    </div>
                    <div className="auto-option-card__check">
                      {effectiveAction === opt.value && '✓'}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 4: Select scope */}
          {step === 4 && (
            <>
              <div className="auto-step-title">Which items?</div>
              <div className="auto-step-sub">Choose what this rule applies to</div>
              <div className="auto-option-cards" role="radiogroup" aria-label="Rule scope">
                <button
                  type="button"
                  className={`auto-option-card${scopeType === 'all' ? ' selected' : ''}`}
                  onClick={() => { setScopeType('all'); setScopeEntityId(null); }}
                  role="radio"
                  aria-checked={scopeType === 'all'}
                >
                  <div className="auto-option-card__icon" style={{ background: 'var(--lavender-soft)' }}>✦</div>
                  <div className="auto-option-card__content">
                    <div className="auto-option-card__title">
                      All {entityType === 'routine' ? 'routines' : 'reminders'}
                    </div>
                    <div className="auto-option-card__desc">
                      Rule applies to every {entityType}
                    </div>
                  </div>
                  <div className="auto-option-card__check">
                    {scopeType === 'all' && '✓'}
                  </div>
                </button>

                {entities.length > 0 && (
                  <button
                    type="button"
                    className={`auto-option-card${scopeType === 'specific' ? ' selected' : ''}`}
                    onClick={() => setScopeType('specific')}
                    role="radio"
                    aria-checked={scopeType === 'specific'}
                  >
                    <div className="auto-option-card__icon" style={{ background: 'var(--mint-soft, #E0FFF5)' }}>🎯</div>
                    <div className="auto-option-card__content">
                      <div className="auto-option-card__title">
                        A specific {entityType}
                      </div>
                      <div className="auto-option-card__desc">
                        Pick one {entityType} for this rule
                      </div>
                    </div>
                    <div className="auto-option-card__check">
                      {scopeType === 'specific' && '✓'}
                    </div>
                  </button>
                )}
              </div>

              {scopeType === 'specific' && (
                <div className="auto-entity-picker">
                  {entities.map((ent) => (
                    <button
                      key={ent.id}
                      type="button"
                      className={`auto-entity-option${scopeEntityId === ent.id ? ' selected' : ''}`}
                      onClick={() => setScopeEntityId(ent.id)}
                    >
                      <span className="auto-entity-option__name">{ent.name}</span>
                      <span className="auto-entity-option__check">
                        {scopeEntityId === ent.id && '✓'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 5: Confirm & Save */}
          {step === 5 && (
            <>
              <div className="auto-step-title">Review your rule</div>
              <div className="auto-step-sub">Here's what Olivia will do</div>
              <div className="auto-confirm-summary">
                <div className="auto-confirm-row">
                  <div className="auto-confirm-row__label">WHEN</div>
                  <div className="auto-confirm-row__value">
                    {selectedTrigger?.title} for {threshold}+ {thresholdUnit}
                  </div>
                </div>
                <div className="auto-confirm-row">
                  <div className="auto-confirm-row__label">THEN</div>
                  <div className="auto-confirm-row__value">
                    {ACTION_OPTIONS.find((a) => a.value === effectiveAction)?.title ?? ''}
                  </div>
                </div>
                <div className="auto-confirm-row">
                  <div className="auto-confirm-row__label">APPLIES TO</div>
                  <div className="auto-confirm-row__value">
                    {scopeType === 'all'
                      ? `All ${entityType === 'routine' ? 'routines' : 'reminders'}`
                      : entities.find((e) => e.id === scopeEntityId)?.name ?? 'Specific item'}
                  </div>
                </div>
              </div>

              <div className="auto-scope-preview" aria-live="polite">
                <div className="auto-scope-preview__text">
                  {scopeType === 'specific'
                    ? `This rule applies to: ${entities.find((e) => e.id === scopeEntityId)?.name ?? 'selected item'}.`
                    : `This rule would currently apply to ${scopePreviewCount}.`}
                </div>
              </div>

              {createMutation.isError && (
                <div className="feedback-error" style={{ marginBottom: 12 }}>
                  <div className="feedback-error__text">
                    {(createMutation.error as Error)?.message?.includes('Maximum')
                      ? 'Maximum 20 rules reached.'
                      : 'Something went wrong — please try again.'}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            className="auto-step-next"
            disabled={!canNext() || createMutation.isPending}
            onClick={handleNext}
          >
            {step === TOTAL_STEPS
              ? createMutation.isPending
                ? 'Saving…'
                : 'Save Rule'
              : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
