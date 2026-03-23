import { useRef, useState, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';

type InviteCodeEntryProps = {
  onSubmit: (code: string) => void;
  onBack: () => void;
  submitting?: boolean;
  error?: string | null;
};

const CODE_LENGTH = 6;

export function InviteCodeEntry({ onSubmit, onBack, submitting = false, error = null }: InviteCodeEntryProps) {
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = chars.join('');
  const isComplete = code.length === CODE_LENGTH && chars.every((c) => c !== '');

  const focusCell = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  const handleInput = useCallback((index: number, value: string) => {
    const char = value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
    setChars((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < CODE_LENGTH - 1) {
      focusCell(index + 1);
    }
  }, [focusCell]);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (chars[index] === '' && index > 0) {
        e.preventDefault();
        setChars((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
        focusCell(index - 1);
      } else {
        setChars((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
      }
    }
  }, [chars, focusCell]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH);
    if (!pasted) return;
    setChars((prev) => {
      const next = [...prev];
      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      return next;
    });
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    focusCell(focusIndex);
  }, [focusCell]);

  const handleSubmit = useCallback(() => {
    if (isComplete) {
      onSubmit(code);
    }
  }, [isComplete, code, onSubmit]);

  return (
    <div className="auth-screen">
      <button
        type="button"
        className="rem-detail-back"
        onClick={onBack}
        aria-label="Back"
        style={{ alignSelf: 'flex-start' }}
      >
        ← Back
      </button>
      <h1 className="auth-title">Join a household</h1>
      <p className="auth-subtitle">Enter the code your partner shared</p>

      <div className="auth-code-cells" role="group" aria-label="Invite code">
        {chars.map((char, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            className={`auth-code-cell${error ? ' error' : ''}`}
            type="text"
            inputMode="text"
            maxLength={1}
            value={char}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            aria-label={`Character ${i + 1}`}
            autoComplete="off"
            disabled={submitting}
          />
        ))}
      </div>

      {error && <div className="auth-input-error" style={{ textAlign: 'center', marginBottom: 14 }}>{error}</div>}

      <button
        type="button"
        className="auth-btn-primary"
        disabled={!isComplete || submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'Checking…' : 'Continue'}
      </button>
    </div>
  );
}
