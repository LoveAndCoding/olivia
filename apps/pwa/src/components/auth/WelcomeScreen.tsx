type WelcomeScreenProps = {
  onSetup: () => void;
  onInviteCode: () => void;
};

export function WelcomeScreen({ onSetup, onInviteCode }: WelcomeScreenProps) {
  return (
    <div className="auth-screen">
      <div className="ambient ambient-1" aria-hidden="true" />
      <div className="auth-wordmark">Olivia</div>
      <h1 className="auth-title">Welcome to Olivia</h1>
      <p className="auth-subtitle">Your household command center</p>
      <div className="auth-btn-stack">
        <button type="button" className="auth-btn-primary" onClick={onSetup}>
          Set up your account
        </button>
        <button type="button" className="auth-btn-ghost" onClick={onInviteCode}>
          I have an invite code
        </button>
      </div>
    </div>
  );
}
