import { useState, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../lib/auth';
import { submitFeedback } from '../lib/api';
import { getRecentErrors } from '../lib/error-reporter';
import type { FeedbackCategory } from '@olivia/contracts';

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature' },
  { value: 'general', label: 'General' },
];

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_SCREENSHOT_BYTES = 1_000_000; // 1MB

function buildContext() {
  const recentErrors = getRecentErrors();
  return {
    route: window.location.pathname,
    appVersion: __APP_VERSION__,
    deviceInfo: `${navigator.userAgent.slice(0, 120)}${Capacitor.isNativePlatform() ? `, Capacitor ${Capacitor.getPlatform()}` : ''}`,
    recentErrors,
  };
}

export function FeedbackPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState('');
  const [contextExpanded, setContextExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const context = buildContext();
  const isValid = description.trim().length >= MIN_DESCRIPTION_LENGTH;
  const charsNeeded = MIN_DESCRIPTION_LENGTH - description.trim().length;

  const handleAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError('Image must be under 1MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
      setScreenshotName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshot(null);
    setScreenshotName('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        category,
        description: description.trim(),
        context,
        screenshotBase64: screenshot ?? null,
      });
      // Navigate back and show toast via session flag
      // Use replace so the feedback form is removed from history — prevents
      // the device back button from looping back to the form after submit.
      sessionStorage.setItem('olivia-feedback-toast', '1');
      void navigate({ to: '/more/settings', replace: true });
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, category, description, context, screenshot, navigate]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="feedback-screen">
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/more/settings' })}
          >
            ← Settings
          </button>

          <h1 className="feedback-screen__title">Send Feedback</h1>

          {/* Category pills */}
          <div className="feedback-category-pills" role="radiogroup" aria-label="Feedback category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`feedback-category-pill${category === cat.value ? ' active' : ''}`}
                role="radio"
                aria-checked={category === cat.value}
                onClick={() => setCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="feedback-textarea-wrap">
            <textarea
              className="feedback-textarea"
              placeholder="What happened? What did you expect?"
              aria-label="Describe what happened"
              aria-required="true"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              disabled={submitting}
            />
            {charsNeeded > 0 && (
              <div className="feedback-char-hint">
                {charsNeeded} more character{charsNeeded !== 1 ? 's' : ''} needed
              </div>
            )}
          </div>

          {/* Screenshot */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {!screenshot ? (
            <button
              type="button"
              className="feedback-attach-btn"
              onClick={handleAttach}
              disabled={submitting}
            >
              <span aria-hidden="true">📷</span> Attach Screenshot
            </button>
          ) : (
            <div className="feedback-attach-preview">
              <img
                className="feedback-attach-preview__thumb"
                src={screenshot}
                alt="Screenshot preview"
              />
              <span className="feedback-attach-preview__name">{screenshotName}</span>
              <button
                type="button"
                className="feedback-attach-preview__remove"
                onClick={handleRemoveScreenshot}
                aria-label="Remove screenshot"
                disabled={submitting}
              >
                ×
              </button>
            </div>
          )}

          {/* Context section */}
          <button
            type="button"
            className={`feedback-context-toggle${contextExpanded ? ' expanded' : ''}`}
            onClick={() => setContextExpanded(!contextExpanded)}
          >
            <span className="feedback-context-toggle__label">
              {contextExpanded ? 'Hide device info' : 'Show device info'}
            </span>
            <span className={`feedback-context-toggle__chevron${contextExpanded ? ' expanded' : ''}`}>
              ▼
            </span>
          </button>
          {contextExpanded && (
            <div className="feedback-context-body">
              <ContextField label="Screen" value={context.route} />
              <ContextField label="App Version" value={context.appVersion} />
              <ContextField label="Device" value={context.deviceInfo} />
              <ContextField label="User" value={currentUser?.name ?? 'Unknown'} />
              <ContextField
                label="Recent Errors"
                value={context.recentErrors.length > 0 ? context.recentErrors.join('\n') : 'None captured'}
              />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="feedback-error" role="alert">
              <span className="feedback-error__text">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            className="feedback-submit"
            disabled={!isValid || submitting}
            aria-disabled={!isValid || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <span className="feedback-submit-spinner" aria-label="Submitting" />
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="feedback-context-field">
      <div className="feedback-context-field__label">{label}</div>
      <div className="feedback-context-field__value">{value}</div>
    </div>
  );
}
