interface OliviaNoticedCardProps {
  message: string;
  onAccept: () => void;
  onDismiss: () => void;
  acceptLabel?: string;
  acceptEmoji?: string;
}

export function OliviaNoticedCard({
  message,
  onAccept,
  onDismiss,
  acceptLabel = 'Yes, draft it',
  acceptEmoji = '🔧',
}: OliviaNoticedCardProps) {
  return (
    <div className="olivia-noticed-card" role="region" aria-label="Olivia suggestion">
      <p className="olivia-noticed-label">
        <span className="olivia-noticed-dot" aria-hidden="true" />
        Olivia noticed
      </p>
      <p className="olivia-noticed-message">
        &ldquo;{message}&rdquo;
      </p>
      <div className="button-row">
        <button className="olivia-noticed-accept" onClick={onAccept}>
          <span aria-hidden="true">{acceptEmoji}</span> {acceptLabel}
        </button>
        <button className="olivia-noticed-dismiss" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
