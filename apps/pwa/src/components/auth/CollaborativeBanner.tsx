import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { getHouseholdMembers } from '../../lib/auth-api';

export function CollaborativeBanner() {
  const { user, getSessionToken } = useAuth();
  const token = getSessionToken();

  const membersQuery = useQuery({
    queryKey: ['household-members'],
    queryFn: () => token ? getHouseholdMembers(token) : Promise.reject(new Error('No session')),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const members = membersQuery.data?.members ?? [];
  const otherUser = members.find((m) => m.id !== user?.id);

  // Only show when there's actually another household member
  if (!otherUser) return null;

  return (
    <div className="collab-banner" role="status">
      <span className="collab-banner-icon" aria-hidden="true">&#10022;</span>
      <span className="collab-banner-text">Shared with {otherUser.name}</span>
    </div>
  );
}
