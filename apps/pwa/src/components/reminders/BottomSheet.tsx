import { useEffect, useRef, type ReactNode } from 'react';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ paddingBottom: 'var(--keyboard-height, 0px)' }}
    >
      <div className="sheet-backdrop-blur" onClick={onClose} />
      <div className="sheet-container" ref={sheetRef}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-scroll">
          {title && <div className="sheet-title">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
