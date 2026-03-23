import { useState, useEffect, useCallback } from 'react';

type MagicLinkSentProps = {
  email: string;
  onResend: () => void;
  oliviaMessage?: string;
};

export function MagicLinkSent({
  email,
  onResend,
  oliviaMessage = "I'll be here when you get back.",
}: MagicLinkSentProps) {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = useCallback(() => {
    onResend();
    setCountdown(60);
  }, [onResend]);

  return (
    <div className="auth-screen">
      <div className="auth-magic-card">
        <div className="auth-magic-icon" aria-hidden="true">&#9993;&#65039;</div>
        <h2 className="auth-magic-title">Check your email</h2>
        <p className="auth-magic-body">
          We sent a link to <strong>{email}</strong>. Tap it to sign in.
        </p>
        <div className="auth-omsg" style={{ marginTop: 0, marginBottom: 24 }}>
          {oliviaMessage}
        </div>
        <button
          type="button"
          className="auth-magic-resend"
          disabled={countdown > 0}
          onClick={handleResend}
        >
          {countdown > 0 ? `Resend in 0:${countdown.toString().padStart(2, '0')}` : 'Resend link'}
        </button>
        <p className="auth-magic-spam">Check your spam folder if you don't see it.</p>
      </div>
    </div>
  );
}
