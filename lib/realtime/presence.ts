export const USER_PRESENCE_CHANNEL = 'flavorquest:online-users';

export type PresenceUserRole = 'customer' | 'pending-owner' | 'owner' | 'admin' | 'guest';

export interface UserPresencePayload {
  userId: string;
  email: string | null;
  role: PresenceUserRole;
  lastSeenAt: string;
}

export function getOnlineUserIdsFromPresenceState(
  state: Record<string, Array<Partial<UserPresencePayload>> | undefined>
) {
  const onlineUserIds = new Set<string>();

  Object.entries(state).forEach(([presenceKey, presences]) => {
    presences?.forEach((presence) => {
      if (typeof presence?.userId === 'string' && presence.userId) {
        onlineUserIds.add(presence.userId);
      }
    });

    if (presenceKey) {
      onlineUserIds.add(presenceKey);
    }
  });

  return onlineUserIds;
}
