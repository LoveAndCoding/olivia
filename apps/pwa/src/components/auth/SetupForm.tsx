import { useState, type FormEvent } from 'react';

type SetupFormProps = {
  onSubmit: (name: string, email: string) => void;
  onBack: () => void;
  submitting?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  oliviaMessage?: string;
};

export function SetupForm({
  onSubmit,
  onBack,
  submitting = false,
  error = null,
  title = 'Set up your account',
  subtitle,
  submitLabel = 'Continue',
  oliviaMessage = "Once you're in, you can invite your partner to join.",
}: SetupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!name.trim()) {
      setNameError('Please enter your name');
      valid = false;
    } else {
      setNameError('');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
      valid = false;
    } else {
      setEmailError('');
    }

    if (valid) {
      onSubmit(name.trim(), email.trim());
    }
  };

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
      <h1 className="auth-title">{title}</h1>
      {subtitle && <p className="auth-subtitle">{subtitle}</p>}
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="auth-input-group">
          <label className="auth-input-label" htmlFor="auth-name">Your name</label>
          <input
            id="auth-name"
            className={`auth-input${nameError ? ' error' : ''}`}
            type="text"
            placeholder="How your household knows you"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={submitting}
          />
          {nameError && <div className="auth-input-error">{nameError}</div>}
        </div>
        <div className="auth-input-group">
          <label className="auth-input-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className={`auth-input${emailError ? ' error' : ''}`}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={submitting}
          />
          {emailError && <div className="auth-input-error">{emailError}</div>}
        </div>
        {error && <div className="auth-input-error" style={{ marginBottom: 14 }}>{error}</div>}
        <button type="submit" className="auth-btn-primary" disabled={submitting}>
          {submitting ? 'Setting up…' : submitLabel}
        </button>
      </form>
      <div className="auth-omsg">{oliviaMessage}</div>
    </div>
  );
}
