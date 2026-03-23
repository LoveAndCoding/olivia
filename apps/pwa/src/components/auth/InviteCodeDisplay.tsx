import { useState, useCallback } from 'react';

type InviteCodeDisplayProps = {
  code: string;
  expiresAt: string;
};

export function InviteCodeDisplay({ code, expiresAt }: InviteCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the code text (user can manually copy)
    }
  }, [code]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Olivia household',
          text: `Use this code to join my household in Olivia: ${code}`,
        });
      } catch {
        // User cancelled or share not available
      }
    } else {
      void handleCopy();
    }
  }, [code, handleCopy]);

  return (
    <div className="auth-invite-display">
      <div className="auth-invite-display-label">Invite code</div>
      <div className="auth-invite-display-code">{code}</div>
      <div className="auth-invite-display-divider" />
      <div className="auth-invite-display-share">Share this code</div>
      <div className="auth-invite-btn-row">
        <button type="button" className="auth-btn-primary" style={{ flex: 1, maxWidth: 150, height: 40, fontSize: 13 }} onClick={() => void handleCopy()}>
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
        <button type="button" className="auth-btn-ghost" style={{ flex: 1, maxWidth: 150, height: 40, fontSize: 13 }} onClick={() => void handleShare()}>
          Share Link
        </button>
      </div>
      <div className="auth-invite-expiry">Valid for {daysLeft} day{daysLeft !== 1 ? 's' : ''}</div>
      <div className="auth-omsg" style={{ marginTop: 16 }}>
        Share this with your partner — they'll use it to join your household.
      </div>
    </div>
  );
}
