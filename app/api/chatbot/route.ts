import { NextRequest, NextResponse } from 'next/server';
import { generateChatbotReply, type WorkspaceRole } from '@/lib/services/chatbot';
import { isSupportedLanguageCode } from '@/lib/constants';
import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import type { Language } from '@/lib/types';

interface SendMessageBody {
  conversationId?: string | null;
  message?: string;
  language?: Language;
  role?: WorkspaceRole;
  createConversation?: boolean;
  pageContext?: {
    pathname?: string | null;
    activeTab?: string | null;
    selectedTourId?: string | null;
    selectedPoiId?: string | null;
  };
}

interface ConversationRow {
  id: string;
  user_id: string;
  workspace_role: WorkspaceRole;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface PersistedTurnResult {
  updatedConversation: ConversationRow;
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

function normalizeLanguage(language: Language | undefined): Language {
  if (isSupportedLanguageCode(language)) {
    return language;
  }

  return 'vi';
}

function normalizeWorkspaceRole(
  requestedRole: string | null | undefined,
  userRole: 'customer' | 'pending-owner' | 'owner' | 'admin'
): WorkspaceRole {
  if (userRole === 'pending-owner') {
    throw new Error('Forbidden workspace role');
  }

  if (requestedRole === 'owner') {
    if (userRole === 'owner' || userRole === 'admin') {
      return 'owner';
    }

    throw new Error('Forbidden workspace role');
  }

  if (requestedRole === 'admin') {
    if (userRole === 'admin') {
      return 'admin';
    }

    throw new Error('Forbidden workspace role');
  }

  if (requestedRole === 'customer') {
    if (userRole === 'customer' || userRole === 'admin') {
      return 'customer';
    }

    throw new Error('Forbidden workspace role');
  }

  return userRole === 'admin' ? 'admin' : userRole;
}

function buildDefaultTitle(role: WorkspaceRole) {
  if (role === 'owner') {
    return 'Cuộc trò chuyện chủ quán mới';
  }

  if (role === 'admin') {
    return 'Cuộc trò chuyện quản trị mới';
  }

  return 'Cuộc trò chuyện mới';
}

function buildConversationTitle(message: string, role: WorkspaceRole) {
  const trimmed = message.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return buildDefaultTitle(role);
  }

  return trimmed.length > 60 ? `${trimmed.slice(0, 59).trim()}…` : trimmed;
}

async function ensureConversation(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  profileId: string,
  role: WorkspaceRole,
  conversationId?: string | null
) {
  if (conversationId) {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', profileId)
      .eq('workspace_role', role)
      .single();

    if (error || !data) {
      throw new Error('Conversation not found');
    }

    return data as ConversationRow;
  }

  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      user_id: profileId,
      workspace_role: role,
      title: buildDefaultTitle(role),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Cannot create conversation');
  }

  return data as ConversationRow;
}

async function listConversations(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  profileId: string,
  role: WorkspaceRole
) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('user_id', profileId)
    .eq('workspace_role', role)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ConversationRow[];
}

async function loadMessages(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  conversationId: string
) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MessageRow[];
}

async function persistConversationTurn(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  conversation: ConversationRow,
  nextTitle: string,
  userMessage: string,
  assistantReply: string
): Promise<PersistedTurnResult> {
  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const userCreatedAt = new Date().toISOString();
  const assistantCreatedAt = new Date(Date.parse(userCreatedAt) + 1).toISOString();

  const { error: insertMessagesError } = await supabase.from('chat_messages').insert([
    {
      id: userMessageId,
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage,
      created_at: userCreatedAt,
    },
    {
      id: assistantMessageId,
      conversation_id: conversation.id,
      role: 'assistant',
      content: assistantReply,
      created_at: assistantCreatedAt,
    },
  ]);

  if (insertMessagesError) {
    throw new Error(insertMessagesError.message);
  }

  const { data: updatedConversation, error: updateConversationError } = await supabase
    .from('chat_conversations')
    .update({
      title: nextTitle,
      last_message_at: assistantCreatedAt,
    })
    .eq('id', conversation.id)
    .select('*')
    .single();

  if (updateConversationError || !updatedConversation) {
    const { error: rollbackError } = await supabase
      .from('chat_messages')
      .delete()
      .in('id', [userMessageId, assistantMessageId]);

    if (rollbackError) {
      console.error('[ChatbotRoute][POST] rollback failed:', rollbackError);
    }

    throw new Error(updateConversationError?.message || 'Cannot update conversation');
  }

  return {
    updatedConversation: updatedConversation as ConversationRow,
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  if (profile.role === 'pending-owner') {
    return NextResponse.json(
      { error: 'Pending owner accounts cannot access chatbot workspace' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const workspaceRole = normalizeWorkspaceRole(
      request.nextUrl.searchParams.get('role'),
      profile.role
    );
    const requestedConversationId = request.nextUrl.searchParams.get('conversation_id');
    const conversations = await listConversations(supabase, profile.id, workspaceRole);
    const activeConversationId = requestedConversationId || conversations[0]?.id || null;
    const messages = activeConversationId ? await loadMessages(supabase, activeConversationId) : [];

    return NextResponse.json(
      {
        role: workspaceRole,
        conversations,
        activeConversationId,
        messages,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chatbot history request failed';
    console.error('[ChatbotRoute][GET] error:', error);
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  if (profile.role === 'pending-owner') {
    return NextResponse.json(
      { error: 'Pending owner accounts cannot access chatbot workspace' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const body = (await request.json()) as SendMessageBody;
    const workspaceRole = normalizeWorkspaceRole(body.role, profile.role);

    if (body.createConversation) {
      const conversation = await ensureConversation(
        supabase,
        profile.id,
        workspaceRole,
        body.conversationId
      );
      const conversations = await listConversations(supabase, profile.id, workspaceRole);

      return NextResponse.json(
        {
          role: workspaceRole,
          conversation,
          conversations,
          messages: [],
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json(
        { error: 'Missing message' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const conversation = await ensureConversation(
      supabase,
      profile.id,
      workspaceRole,
      body.conversationId
    );

    const previousMessages = await loadMessages(supabase, conversation.id);

    const reply = await generateChatbotReply({
      profile,
      workspaceRole,
      messages: [
        ...previousMessages.slice(-9).map((item) => ({
          role: item.role,
          content: item.content,
        })),
        {
          role: 'user',
          content: message,
        },
      ],
      language: normalizeLanguage(body.language),
      pageContext: body.pageContext,
    });

    const nextTitle =
      previousMessages.length === 0
        ? buildConversationTitle(message, workspaceRole)
        : conversation.title;

    const { updatedConversation } = await persistConversationTurn(
      supabase,
      conversation,
      nextTitle,
      message,
      reply
    );

    const conversations = await listConversations(supabase, profile.id, workspaceRole);
    const messages = await loadMessages(supabase, conversation.id);

    return NextResponse.json(
      {
        role: workspaceRole,
        conversation: updatedConversation,
        conversations,
        messages,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chatbot request failed';
    console.error('[ChatbotRoute][POST] error:', error);
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
