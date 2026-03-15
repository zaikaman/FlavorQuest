import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { CurrentUserProfile } from '@/lib/supabase/server';
import type {
  SupportDirectoryEntry,
  SupportMessage,
  SupportParticipantSummary,
  SupportThreadSummary,
  SupportThreadType,
  UserRole,
} from '@/lib/types';
import { sendSupportChatEmail } from '@/lib/services/mailer';

type ThreadRow = {
  id: string;
  thread_type: SupportThreadType;
  customer_id: string | null;
  owner_id: string | null;
  poi_id: string | null;
  subject: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: UserRole;
  content: string;
  created_at: string;
};

type ReadRow = {
  thread_id: string;
  user_id: string;
  last_read_at: string;
};

type UserRow = {
  id: string;
  email: string;
  role: UserRole;
};

type PoiRow = {
  id: string;
  name_vi: string;
  owner_id: string | null;
};

interface ListSupportThreadsResult {
  threads: SupportThreadSummary[];
  directory: SupportDirectoryEntry[];
}

interface CreateSupportThreadInput {
  threadType: SupportThreadType;
  poiId?: string;
}

function isThreadAccessible(profile: CurrentUserProfile, thread: ThreadRow) {
  if (profile.role === 'admin') {
    return thread.thread_type === 'customer_admin' || thread.thread_type === 'owner_admin';
  }

  if (profile.role === 'owner') {
    return thread.owner_id === profile.id;
  }

  return thread.customer_id === profile.id;
}

function makeAdminParticipant(adminEmail?: string | null): SupportParticipantSummary {
  return {
    id: 'admin-support',
    email: adminEmail || 'support@flavorquest.local',
    role: 'admin',
  };
}

function buildThreadSubject(threadType: SupportThreadType, poiName?: string | null) {
  if (threadType === 'customer_owner') {
    return poiName ? `Trao đổi về ${poiName}` : 'Trao đổi với chủ quán';
  }

  if (threadType === 'owner_admin') {
    return 'Điều phối với admin';
  }

  return 'Hỗ trợ FlavorQuest';
}

function buildNotificationTitle(senderRole: UserRole, threadType: SupportThreadType, poiName?: string | null) {
  if (threadType === 'customer_owner') {
    return senderRole === 'customer'
      ? `Khách vừa nhắn về ${poiName || 'quán của bạn'}`
      : `Chủ quán vừa phản hồi về ${poiName || 'điểm bán'}`;
  }

  if (threadType === 'owner_admin') {
    return senderRole === 'owner' ? 'Chủ quán vừa nhắn cho admin' : 'Admin vừa phản hồi';
  }

  return senderRole === 'admin' ? 'Admin vừa phản hồi' : 'Yêu cầu hỗ trợ mới';
}

function buildNotificationMessage(senderEmail: string | null, content: string) {
  const excerpt = content.length > 120 ? `${content.slice(0, 117)}...` : content;
  return senderEmail ? `${senderEmail}: ${excerpt}` : excerpt;
}

function buildEmailThreadLabel(thread: ThreadRow, poiName?: string | null) {
  if (thread.thread_type === 'customer_owner') {
    return poiName || 'quán của bạn';
  }

  return thread.thread_type === 'owner_admin' ? 'kênh điều phối owner/admin' : 'hỗ trợ FlavorQuest';
}

async function loadUsersByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, UserRow>();
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('users')
    .select('id, email, role')
    .in('id', ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((user) => [user.id, user as UserRow]));
}

async function loadPoisByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, PoiRow>();
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('pois')
    .select('id, name_vi, owner_id')
    .in('id', ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((poi) => [poi.id, poi as PoiRow]));
}

async function loadAdminUsers() {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('users')
    .select('id, email, role')
    .eq('role', 'admin')
    .order('email', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UserRow[];
}

async function loadThreadMessagesMeta(threadIds: string[]) {
  if (threadIds.length === 0) {
    return [] as Array<Pick<MessageRow, 'thread_id' | 'sender_id' | 'created_at'>>;
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('support_messages')
    .select('thread_id, sender_id, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Array<Pick<MessageRow, 'thread_id' | 'sender_id' | 'created_at'>>;
}

async function loadReadMarkers(userId: string, threadIds: string[]) {
  if (threadIds.length === 0) {
    return new Map<string, ReadRow>();
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('support_thread_reads')
    .select('thread_id, user_id, last_read_at')
    .eq('user_id', userId)
    .in('thread_id', threadIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.thread_id, row as ReadRow]));
}

function getCounterpartForThread(
  profile: CurrentUserProfile,
  thread: ThreadRow,
  usersById: Map<string, UserRow>,
  primaryAdminEmail?: string | null
): SupportParticipantSummary | null {
  if (thread.thread_type === 'customer_admin' || thread.thread_type === 'owner_admin') {
    if (profile.role === 'admin') {
      const counterpartId =
        thread.thread_type === 'customer_admin' ? thread.customer_id : thread.owner_id;
      return counterpartId ? (usersById.get(counterpartId) ?? null) : null;
    }

    return makeAdminParticipant(primaryAdminEmail);
  }

  if (profile.role === 'customer') {
    return thread.owner_id ? (usersById.get(thread.owner_id) ?? null) : null;
  }

  return thread.customer_id ? (usersById.get(thread.customer_id) ?? null) : null;
}

export async function listSupportThreads(profile: CurrentUserProfile): Promise<ListSupportThreadsResult> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from('support_threads')
    .select(
      'id, thread_type, customer_id, owner_id, poi_id, subject, last_message_preview, last_message_at, created_at'
    )
    .order('last_message_at', { ascending: false })
    .limit(120);

  if (profile.role === 'customer') {
    query = query.eq('customer_id', profile.id);
  } else if (profile.role === 'owner') {
    query = query.eq('owner_id', profile.id);
  } else {
    query = query.in('thread_type', ['customer_admin', 'owner_admin']);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const threads = ((data ?? []) as ThreadRow[]).filter((thread) => isThreadAccessible(profile, thread));
  const threadIds = threads.map((thread) => thread.id);
  const poiIds = Array.from(new Set(threads.map((thread) => thread.poi_id).filter(Boolean))) as string[];
  const userIds = Array.from(
    new Set(
      threads
        .flatMap((thread) => [thread.customer_id, thread.owner_id])
        .filter((value): value is string => Boolean(value))
    )
  );

  const [messagesMeta, readMarkers, usersById, poisById, adminUsers] = await Promise.all([
    loadThreadMessagesMeta(threadIds),
    loadReadMarkers(profile.id, threadIds),
    loadUsersByIds(userIds),
    loadPoisByIds(poiIds),
    loadAdminUsers(),
  ]);

  const primaryAdminEmail = adminUsers[0]?.email ?? null;
  const unreadCountByThread = new Map<string, number>();

  messagesMeta.forEach((message) => {
    const lastReadAt = readMarkers.get(message.thread_id)?.last_read_at;
    if (message.sender_id === profile.id) {
      return;
    }

    if (lastReadAt && new Date(message.created_at).getTime() <= new Date(lastReadAt).getTime()) {
      return;
    }

    unreadCountByThread.set(message.thread_id, (unreadCountByThread.get(message.thread_id) ?? 0) + 1);
  });

  const threadByCompositeKey = new Map<string, ThreadRow>();
  threads.forEach((thread) => {
    const key =
      thread.thread_type === 'customer_owner'
        ? `${thread.thread_type}:${thread.poi_id}`
        : `${thread.thread_type}:${thread.customer_id ?? thread.owner_id ?? 'support'}`;
    threadByCompositeKey.set(key, thread);
  });

  const summaries: SupportThreadSummary[] = threads.map((thread) => {
    const poi = thread.poi_id ? poisById.get(thread.poi_id) ?? null : null;
    const counterpart = getCounterpartForThread(profile, thread, usersById, primaryAdminEmail);

    return {
      id: thread.id,
      thread_type: thread.thread_type,
      subject: thread.subject || buildThreadSubject(thread.thread_type, poi?.name_vi),
      last_message_preview: thread.last_message_preview,
      last_message_at: thread.last_message_at,
      created_at: thread.created_at,
      unread_count: unreadCountByThread.get(thread.id) ?? 0,
      counterpart,
      poi: poi
        ? {
            id: poi.id,
            name_vi: poi.name_vi,
          }
        : null,
    };
  });

  const directory: SupportDirectoryEntry[] = [];

  if (profile.role === 'customer') {
    const { data: ownedPois, error: ownedPoisError } = await adminClient
      .from('pois')
      .select('id, name_vi, owner_id')
      .not('owner_id', 'is', null)
      .is('deleted_at', null)
      .order('name_vi', { ascending: true });

    if (ownedPoisError) {
      throw new Error(ownedPoisError.message);
    }

    const ownerIds = Array.from(
      new Set((ownedPois ?? []).map((poi) => poi.owner_id).filter((value): value is string => Boolean(value)))
    );
    const ownerUsers = await loadUsersByIds(ownerIds);

    (ownedPois ?? []).forEach((poi) => {
      const owner = poi.owner_id ? ownerUsers.get(poi.owner_id) ?? null : null;
      const existingThread = threadByCompositeKey.get(`customer_owner:${poi.id}`);

      directory.push({
        id: `poi:${poi.id}`,
        title: poi.name_vi,
        subtitle: owner?.email || 'Chủ quán',
        thread_type: 'customer_owner',
        poi: {
          id: poi.id,
          name_vi: poi.name_vi,
        },
        counterpart: owner,
        existing_thread_id: existingThread?.id ?? null,
      });
    });

    const adminThread = threadByCompositeKey.get(`customer_admin:${profile.id}`);
    directory.unshift({
      id: 'support:customer_admin',
      title: 'Hỗ trợ FlavorQuest',
      subtitle: 'Trao đổi với admin khi cần hỗ trợ tài khoản hoặc trải nghiệm',
      thread_type: 'customer_admin',
      poi: null,
      counterpart: makeAdminParticipant(primaryAdminEmail),
      existing_thread_id: adminThread?.id ?? null,
    });
  }

  if (profile.role === 'owner') {
    const adminThread = threadByCompositeKey.get(`owner_admin:${profile.id}`);
    directory.push({
      id: 'support:owner_admin',
      title: 'Điều phối với admin',
      subtitle: 'Báo sự cố vận hành, phân quyền hoặc nội dung',
      thread_type: 'owner_admin',
      poi: null,
      counterpart: makeAdminParticipant(primaryAdminEmail),
      existing_thread_id: adminThread?.id ?? null,
    });
  }

  return {
    threads: summaries,
    directory,
  };
}

export async function getAccessibleThread(profile: CurrentUserProfile, threadId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('support_threads')
    .select(
      'id, thread_type, customer_id, owner_id, poi_id, subject, last_message_preview, last_message_at, created_at'
    )
    .eq('id', threadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const thread = (data ?? null) as ThreadRow | null;

  if (!thread || !isThreadAccessible(profile, thread)) {
    return null;
  }

  return thread;
}

export async function getSupportMessages(profile: CurrentUserProfile, threadId: string) {
  const thread = await getAccessibleThread(profile, threadId);

  if (!thread) {
    return null;
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('support_messages')
    .select('id, thread_id, sender_id, sender_role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    thread,
    messages: (data ?? []) as SupportMessage[],
  };
}

export async function createSupportThread(profile: CurrentUserProfile, input: CreateSupportThreadInput) {
  const adminClient = createAdminClient();

  if (input.threadType === 'customer_owner') {
    if (profile.role !== 'customer' || !input.poiId) {
      throw new Error('INVALID_THREAD_TYPE');
    }

    const { data: poi, error: poiError } = await adminClient
      .from('pois')
      .select('id, name_vi, owner_id')
      .eq('id', input.poiId)
      .maybeSingle();

    if (poiError) {
      throw new Error(poiError.message);
    }

    if (!poi?.owner_id) {
      throw new Error('OWNER_NOT_ASSIGNED');
    }

    const { data: existing } = await adminClient
      .from('support_threads')
      .select('id')
      .eq('thread_type', 'customer_owner')
      .eq('customer_id', profile.id)
      .eq('owner_id', poi.owner_id)
      .eq('poi_id', poi.id)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('support_threads')
      .insert({
        thread_type: 'customer_owner',
        customer_id: profile.id,
        owner_id: poi.owner_id,
        poi_id: poi.id,
        created_by: profile.id,
        subject: buildThreadSubject('customer_owner', poi.name_vi),
        last_message_preview: null,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return inserted.id as string;
  }

  if (input.threadType === 'customer_admin') {
    if (profile.role !== 'customer') {
      throw new Error('INVALID_THREAD_TYPE');
    }

    const { data: existing } = await adminClient
      .from('support_threads')
      .select('id')
      .eq('thread_type', 'customer_admin')
      .eq('customer_id', profile.id)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('support_threads')
      .insert({
        thread_type: 'customer_admin',
        customer_id: profile.id,
        owner_id: null,
        poi_id: null,
        created_by: profile.id,
        subject: buildThreadSubject('customer_admin'),
        last_message_preview: null,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return inserted.id as string;
  }

  if (profile.role !== 'owner') {
    throw new Error('INVALID_THREAD_TYPE');
  }

  const { data: existing } = await adminClient
    .from('support_threads')
    .select('id')
    .eq('thread_type', 'owner_admin')
    .eq('owner_id', profile.id)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('support_threads')
    .insert({
      thread_type: 'owner_admin',
      customer_id: null,
      owner_id: profile.id,
      poi_id: null,
      created_by: profile.id,
      subject: buildThreadSubject('owner_admin'),
      last_message_preview: null,
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted.id as string;
}

export async function markThreadRead(profile: CurrentUserProfile, threadId: string) {
  const thread = await getAccessibleThread(profile, threadId);

  if (!thread) {
    return false;
  }

  const adminClient = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await adminClient.from('support_thread_reads').upsert(
    {
      thread_id: threadId,
      user_id: profile.id,
      last_read_at: now,
    },
    { onConflict: 'thread_id,user_id' }
  );

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

async function resolveRecipients(thread: ThreadRow, senderId: string) {
  const adminClient = createAdminClient();
  const recipientIds = new Set<string>();

  if (thread.thread_type === 'customer_owner') {
    const targetId = senderId === thread.customer_id ? thread.owner_id : thread.customer_id;
    if (targetId) {
      recipientIds.add(targetId);
    }
  } else if (thread.thread_type === 'customer_admin') {
    if (senderId === thread.customer_id) {
      const admins = await loadAdminUsers();
      admins.forEach((admin) => {
        if (admin.id !== senderId) {
          recipientIds.add(admin.id);
        }
      });
    } else if (thread.customer_id) {
      recipientIds.add(thread.customer_id);
    }
  } else if (senderId === thread.owner_id) {
    const admins = await loadAdminUsers();
    admins.forEach((admin) => {
      if (admin.id !== senderId) {
        recipientIds.add(admin.id);
      }
    });
  } else if (thread.owner_id) {
    recipientIds.add(thread.owner_id);
  }

  const ids = Array.from(recipientIds);
  if (ids.length === 0) {
    return [] as UserRow[];
  }

  const { data, error } = await adminClient.from('users').select('id, email, role').in('id', ids);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UserRow[];
}

export async function sendSupportMessage(profile: CurrentUserProfile, threadId: string, rawContent: string) {
  const thread = await getAccessibleThread(profile, threadId);

  if (!thread) {
    return null;
  }

  const content = rawContent.trim();
  if (!content) {
    throw new Error('EMPTY_MESSAGE');
  }

  const adminClient = createAdminClient();
  const now = new Date().toISOString();
  const preview = content.length > 180 ? `${content.slice(0, 177)}...` : content;

  const { data: insertedMessage, error: messageError } = await adminClient
    .from('support_messages')
    .insert({
      thread_id: threadId,
      sender_id: profile.id,
      sender_role: profile.role,
      content,
      created_at: now,
    })
    .select('id, thread_id, sender_id, sender_role, content, created_at')
    .single();

  if (messageError) {
    throw new Error(messageError.message);
  }

  const updateTasks = [
    adminClient
      .from('support_threads')
      .update({
        last_message_at: now,
        last_message_preview: preview,
      })
      .eq('id', threadId),
    adminClient.from('support_thread_reads').upsert(
      {
        thread_id: threadId,
        user_id: profile.id,
        last_read_at: now,
      },
      { onConflict: 'thread_id,user_id' }
    ),
  ];

  await Promise.all(updateTasks);

  const [recipients, senderUsers, poisById] = await Promise.all([
    resolveRecipients(thread, profile.id),
    loadUsersByIds([profile.id]),
    loadPoisByIds(thread.poi_id ? [thread.poi_id] : []),
  ]);

  const sender = senderUsers.get(profile.id) ?? null;
  const poi = thread.poi_id ? poisById.get(thread.poi_id) ?? null : null;
  const notificationTitle = buildNotificationTitle(profile.role, thread.thread_type, poi?.name_vi);
  const notificationMessage = buildNotificationMessage(sender?.email ?? null, content);

  if (recipients.length > 0) {
    const notificationRows = recipients.map((recipient) => ({
      user_id: recipient.id,
      title: notificationTitle,
      message: notificationMessage,
      type: 'system' as const,
    }));

    const { error: notificationError } = await adminClient.from('notifications').insert(notificationRows);
    if (notificationError) {
      console.error('[support-chat] insert notifications failed:', notificationError);
    }

    await Promise.allSettled(
      recipients
        .filter((recipient) => Boolean(recipient.email))
        .map((recipient) =>
          sendSupportChatEmail({
            to: recipient.email,
            recipientRole: recipient.role,
            senderEmail: sender?.email ?? profile.email,
            threadLabel: buildEmailThreadLabel(thread, poi?.name_vi),
            messagePreview: preview,
          })
        )
    );
  }

  return insertedMessage as SupportMessage;
}
