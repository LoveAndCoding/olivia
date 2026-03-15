import { useState, useCallback, useRef } from 'react';

type InlineAddInputProps = {
  onAdd: (body: string) => Promise<void>;
  disabled?: boolean;
};

export function InlineAddInput({ onAdd, disabled = false }: InlineAddInputProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAdd(trimmed);
      setValue('');
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }, [value, busy, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="list-add-footer">
      <input
        ref={inputRef}
        type="text"
        className="list-add-input"
        placeholder="Add an item…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || busy}
        aria-label="Add item"
      />
      <button
        type="button"
        className="list-add-btn"
        onClick={() => void handleSubmit()}
        disabled={!value.trim() || busy}
        aria-label="Add item"
      >
        +
      </button>
    </div>
  );
}
