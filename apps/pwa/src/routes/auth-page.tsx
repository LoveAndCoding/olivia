import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { setupAccount, requestMagicLink, claimInvite } from '../lib/auth-api';
import { WelcomeScreen } from '../components/auth/WelcomeScreen';
import { SetupForm } from '../components/auth/SetupForm';
import { MagicLinkSent } from '../components/auth/MagicLinkSent';
import { AuthSuccess } from '../components/auth/AuthSuccess';
import { InviteCodeEntry } from '../components/auth/InviteCodeEntry';
import '../components/auth/auth.css';

type AuthStep =
  | 'welcome'
  | 'setup'
  | 'magic-link-sent'
  | 'success'
  | 'invite-code'
  | 'invite-setup';

export function AuthPage() {
  const navigate = useNavigate();
  const { login, householdInitialized } = useAuth();
  const [step, setStep] = useState<AuthStep>(householdInitialized ? 'welcome' : 'welcome');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleSetup = useCallback(async (name: string, emailAddr: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await setupAccount({ name, email: emailAddr });
      setEmail(emailAddr);
      if (result.sessionToken) {
        login(result.sessionToken, result.user);
        setStep('success');
      } else {
        setStep('magic-link-sent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [login]);

  const handleResendMagicLink = useCallback(async () => {
    try {
      await requestMagicLink({ email });
    } catch {
      // Silently fail on resend — the UI already shows the email
    }
  }, [email]);

  const handleInviteCodeSubmit = useCallback(async (code: string) => {
    setSubmitting(true);
    setError(null);
    setInviteCode(code);
    // For the invite flow, we first need to validate the code,
    // then show the setup form. The claim endpoint needs name+email too,
    // so we transition to the invite-setup step.
    setStep('invite-setup');
    setSubmitting(false);
  }, []);

  const handleInviteSetup = useCallback(async (name: string, emailAddr: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await claimInvite({ code: inviteCode, name, email: emailAddr });
      setEmail(emailAddr);
      if (result.sessionToken) {
        login(result.sessionToken, result.user);
        setStep('success');
      } else {
        setStep('magic-link-sent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
      setStep('invite-code');
    } finally {
      setSubmitting(false);
    }
  }, [inviteCode, login]);

  const handleSuccess = useCallback(() => {
    void navigate({ to: '/' });
  }, [navigate]);

  // Handle magic link verification from URL token (deep link)
  // This would typically be handled by the router, checking for ?token= param
  // For now, the verify flow is triggered externally

  switch (step) {
    case 'welcome':
      return (
        <WelcomeScreen
          onSetup={() => setStep('setup')}
          onInviteCode={() => setStep('invite-code')}
        />
      );

    case 'setup':
      return (
        <SetupForm
          onSubmit={(name, emailAddr) => void handleSetup(name, emailAddr)}
          onBack={() => setStep('welcome')}
          submitting={submitting}
          error={error}
        />
      );

    case 'magic-link-sent':
      return (
        <MagicLinkSent
          email={email}
          onResend={() => void handleResendMagicLink()}
        />
      );

    case 'success':
      return <AuthSuccess onComplete={handleSuccess} />;

    case 'invite-code':
      return (
        <InviteCodeEntry
          onSubmit={(code) => void handleInviteCodeSubmit(code)}
          onBack={() => setStep('welcome')}
          submitting={submitting}
          error={error}
        />
      );

    case 'invite-setup':
      return (
        <SetupForm
          onSubmit={(name, emailAddr) => void handleInviteSetup(name, emailAddr)}
          onBack={() => { setError(null); setStep('invite-code'); }}
          submitting={submitting}
          error={error}
          title="Welcome!"
          subtitle={adminName ? `You're joining ${adminName}'s household` : "You're joining a household"}
          submitLabel="Join household"
          oliviaMessage="Almost there — one magic link and you're in."
        />
      );

    default:
      return null;
  }
}
