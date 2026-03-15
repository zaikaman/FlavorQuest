import 'server-only';

import { createSupportThread, sendSupportMessage } from '@/lib/server/support-chat';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CurrentUserProfile } from '@/lib/supabase/server';
import type { OwnerRequestAdminListItem, OwnerRequestStatus, UserRole } from '@/lib/types';

const OWNER_REQUEST_SEED_MESSAGE =
  'Tôi muốn đăng ký tài khoản chủ quán. Nhờ admin hỗ trợ xác minh và duyệt.';

type UserOwnerRequestRow = {
  id: string;
  email: string;
  role: UserRole | null;
  customer_access_granted: boolean | null;
  customer_access_granted_at: string | null;
  owner_request_status: OwnerRequestStatus | null;
  owner_requested_at: string | null;
  owner_reviewed_at: string | null;
};

type SupportThreadRow = {
  id: string;
  customer_id: string | null;
};

function normalizeRole(role: UserRole | string | null | undefined): UserRole {
  if (role === 'owner' || role === 'admin' || role === 'pending-owner') {
    return role;
  }

  return 'customer';
}

export function normalizeOwnerRequestStatus(
  status: string | null | undefined
): OwnerRequestStatus | null {
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    return status;
  }

  return null;
}

async function ensureOwnerRequestSupportThread(profile: CurrentUserProfile) {
  const adminClient = createAdminClient();
  const threadId = await createSupportThread(profile, {
    threadType: 'customer_admin',
  });

  const { data: existingMessages, error: messagesError } = await adminClient
    .from('support_messages')
    .select('id')
    .eq('thread_id', threadId)
    .limit(1);

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  if ((existingMessages ?? []).length === 0) {
    await sendSupportMessage(profile, threadId, OWNER_REQUEST_SEED_MESSAGE);
  }

  return threadId;
}

export async function ensureOwnerRequestForUser(user: { id: string; email: string }) {
  const adminClient = createAdminClient();
  const { data: existingProfile, error: profileError } = await adminClient
    .from('users')
    .select(
      'id, email, role, customer_access_granted, customer_access_granted_at, owner_request_status, owner_requested_at, owner_reviewed_at'
    )
    .eq('id', user.id)
    .maybeSingle<UserOwnerRequestRow>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const currentRole = normalizeRole(existingProfile?.role);

  if (currentRole === 'owner') {
    return {
      redirectTo: '/owner',
      role: 'owner' as const,
      ownerRequestStatus: normalizeOwnerRequestStatus(existingProfile?.owner_request_status),
    };
  }

  if (currentRole === 'admin') {
    return {
      redirectTo: '/admin',
      role: 'admin' as const,
      ownerRequestStatus: normalizeOwnerRequestStatus(existingProfile?.owner_request_status),
    };
  }

  const now = new Date().toISOString();
  const currentStatus = normalizeOwnerRequestStatus(existingProfile?.owner_request_status);
  const needsPendingUpdate = currentStatus !== 'pending';

  const { error: upsertError } = await adminClient.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      role: 'pending-owner',
      updated_at: now,
      ...(needsPendingUpdate
        ? {
            owner_request_status: 'pending' satisfies OwnerRequestStatus,
            owner_requested_at: now,
            owner_reviewed_at: null,
            owner_reviewed_by: null,
          }
        : {}),
    },
    { onConflict: 'id' }
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  await ensureOwnerRequestSupportThread({
    id: user.id,
    email: user.email,
    role: 'pending-owner',
    customerAccessGranted: existingProfile?.customer_access_granted ?? false,
    customerAccessGrantedAt: existingProfile?.customer_access_granted_at ?? null,
    ownerRequestStatus: 'pending',
    ownerRequestedAt: needsPendingUpdate ? now : (existingProfile?.owner_requested_at ?? null),
    ownerReviewedAt: null,
  });

  return {
    redirectTo: '/pending-owner',
    role: 'pending-owner' as const,
    ownerRequestStatus: 'pending' as const,
  };
}

export async function listPendingOwnerRequests(): Promise<OwnerRequestAdminListItem[]> {
  const adminClient = createAdminClient();
  const { data: users, error: usersError } = await adminClient
    .from('users')
    .select('id, email, role, owner_request_status, owner_requested_at, owner_reviewed_at')
    .eq('owner_request_status', 'pending')
    .order('owner_requested_at', { ascending: true });

  if (usersError) {
    throw new Error(usersError.message);
  }

  const customerIds = (users ?? []).map((user) => user.id);
  let threadsByCustomerId = new Map<string, string>();

  if (customerIds.length > 0) {
    const { data: threads, error: threadsError } = await adminClient
      .from('support_threads')
      .select('id, customer_id')
      .eq('thread_type', 'customer_admin')
      .in('customer_id', customerIds);

    if (threadsError) {
      throw new Error(threadsError.message);
    }

    threadsByCustomerId = new Map(
      ((threads ?? []) as SupportThreadRow[])
        .filter((thread) => Boolean(thread.customer_id))
        .map((thread) => [thread.customer_id as string, thread.id])
    );
  }

  return (users ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    ownerRequestStatus: 'pending',
    ownerRequestedAt: user.owner_requested_at ?? null,
    ownerReviewedAt: user.owner_reviewed_at ?? null,
    threadId: threadsByCustomerId.get(user.id) ?? null,
  }));
}

export async function reviewOwnerRequest(input: {
  userId: string;
  reviewerId: string;
  decision: 'approve' | 'reject';
}) {
  const adminClient = createAdminClient();
  const { data: existingProfile, error: existingError } = await adminClient
    .from('users')
    .select('id, email, role, owner_request_status, owner_requested_at, owner_reviewed_at')
    .eq('id', input.userId)
    .maybeSingle<UserOwnerRequestRow>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existingProfile?.id) {
    throw new Error('OWNER_REQUEST_NOT_FOUND');
  }

  if (normalizeRole(existingProfile.role) === 'admin') {
    throw new Error('INVALID_OWNER_REQUEST_TARGET');
  }

  if (normalizeOwnerRequestStatus(existingProfile.owner_request_status) !== 'pending') {
    throw new Error('OWNER_REQUEST_NOT_PENDING');
  }

  const reviewedAt = new Date().toISOString();
  const nextStatus = input.decision === 'approve' ? 'approved' : 'rejected';
  const nextRole = input.decision === 'approve' ? 'owner' : 'pending-owner';

  const { data: updatedProfile, error: updateError } = await adminClient
    .from('users')
    .update({
      role: nextRole,
      owner_request_status: nextStatus,
      owner_reviewed_at: reviewedAt,
      owner_reviewed_by: input.reviewerId,
      updated_at: reviewedAt,
    })
    .eq('id', input.userId)
    .select('id, email, role, owner_request_status, owner_requested_at, owner_reviewed_at')
    .single<UserOwnerRequestRow>();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    id: updatedProfile.id,
    email: updatedProfile.email,
    role: normalizeRole(updatedProfile.role),
    ownerRequestStatus: normalizeOwnerRequestStatus(updatedProfile.owner_request_status),
    ownerRequestedAt: updatedProfile.owner_requested_at ?? null,
    ownerReviewedAt: updatedProfile.owner_reviewed_at ?? null,
  };
}
