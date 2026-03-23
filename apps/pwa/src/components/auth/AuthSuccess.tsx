import { useEffect } from 'react';

type AuthSuccessProps = {
  onComplete: () => void;
};

export function AuthSuccess({ onComplete }: AuthSuccessProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="auth-screen">
      <div className="auth-success-card">
        <div className="auth-success-icon" aria-hidden="true">&#10003;</div>
        <h2 className="auth-success-title">You're in!</h2>
      </div>
    </div>
  );
}
