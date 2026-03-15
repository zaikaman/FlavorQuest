export const USER_PRESENCE_CHANNEL = 'flavorquest:online-users';

export interface UserPresencePayload {
  userId: string;
  email: string | null;
  role: 'customer' | 'pending-owner' | 'owner' | 'admin' | 'guest';
  lastSeenAt: string;
}
