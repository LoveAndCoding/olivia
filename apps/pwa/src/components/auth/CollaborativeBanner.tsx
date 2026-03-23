type CollaborativeBannerProps = {
  otherUserName: string;
};

export function CollaborativeBanner({ otherUserName }: CollaborativeBannerProps) {
  return (
    <div className="collab-banner" role="status">
      <span className="collab-banner-icon" aria-hidden="true">&#10022;</span>
      <span className="collab-banner-text">Shared with {otherUserName}</span>
    </div>
  );
}
