import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { getHouseholdMembers, generateInvite, revokeInvite } from '../../lib/auth-api';
import { MemberCard } from './MemberCard';

const MAX_MEMBERS = 2; // M32 limit

export function HouseholdSection() {
  const { user, getSessionToken } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const token = getSessionToken();

  const membersQuery = useQuery({
    queryKey: ['household-members'],
    queryFn: () => token ? getHouseholdMembers(token) : Promise.reject(new Error('No session')),
    enabled: !!token,
  });

  const members = membersQuery.data?.members ?? [];
  const pendingInvitations = membersQuery.data?.pendingInvitations ?? [];
  const isAdmin = user?.role === 'admin';
  const hasPendingInvite = pendingInvitations.some((inv) => inv.status === 'pending');
  const canInvite = isAdmin && members.length < MAX_MEMBERS && !hasPendingInvite;

  const handleGenerateInvite = useCallback(async () => {
    if (!token) return;
    setGenerating(true);
    try {
      await generateInvite(token);
      await queryClient.invalidateQueries({ queryKey: ['household-members'] });
    } catch {
      // Error handling could show a toast
    } finally {
      setGenerating(false);
    }
  }, [token, queryClient]);

  const handleRevokeInvite = useCallback(async (invitationId: string) => {
    if (!token) return;
    if (!window.confirm('Cancel this invite? The code will stop working.')) return;
    try {
      await revokeInvite(token, invitationId);
      await queryClient.invalidateQueries({ queryKey: ['household-members'] });
    } catch {
      // Error handling
    }
  }, [token, queryClient]);

  if (!user) return null;

  const adminUser = members.find((m) => m.role === 'admin');

  return (
    <div className="card stack-md">
      <div className="section-header">
        <h3 className="card-title" style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700 }}>
          Household
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((member) => (
          <MemberCard
            key={member.id}
            user={member}
            isCurrentUser={member.id === user.id}
          />
        ))}
      </div>

      {/* Pending invite card */}
      {hasPendingInvite && pendingInvitations.filter((inv) => inv.status === 'pending').map((inv) => (
        <div key={inv.id} className="pending-invite-card">
          <div className="pending-invite-code">{inv.code}</div>
          <div className="pending-invite-expiry">
            Expires {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          {isAdmin && (
            <button
              type="button"
              className="pending-invite-cancel"
              onClick={() => void handleRevokeInvite(inv.id)}
            >
              Cancel invite
            </button>
          )}
        </div>
      ))}

      {/* Invite button (admin, solo, no pending) */}
      {canInvite && (
        <>
          <button
            type="button"
            className="auth-btn-primary"
            style={{ maxWidth: '100%' }}
            disabled={generating}
            onClick={() => void handleGenerateInvite()}
          >
            {generating ? 'Generating…' : 'Invite Member'}
          </button>
          <div className="auth-omsg" style={{ marginTop: 8 }}>
            Invite your partner to share lists, reminders, and routines together.
          </div>
        </>
      )}

      {/* Member view — managed by admin label */}
      {!isAdmin && adminUser && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11,
          color: 'var(--ink-3)',
          marginTop: 4,
        }}>
          Managed by {adminUser.name}
        </p>
      )}
    </div>
  );
}
