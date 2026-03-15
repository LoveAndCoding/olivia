type OliviaListMessageProps = {
  onArchive: () => void;
  onDismiss: () => void;
};

export function OliviaListMessage({ onArchive, onDismiss }: OliviaListMessageProps) {
  return (
    <div className="list-olivia-msg">
      <div className="list-olivia-label">✦ Olivia noticed</div>
      <div className="list-olivia-text">
        Everything on this list is checked. Want to archive it?
      </div>
      <div className="list-olivia-actions">
        <button
          type="button"
          className="rem-btn rem-btn-secondary"
          style={{ flex: 1 }}
          onClick={onArchive}
        >
          Archive
        </button>
        <button
          type="button"
          className="rem-btn rem-btn-ghost"
          style={{ flex: 1 }}
          onClick={onDismiss}
        >
          Not yet
        </button>
      </div>
    </div>
  );
}
