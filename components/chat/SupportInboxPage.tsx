'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import type {
  SupportDirectoryEntry,
  SupportMessage,
  SupportThreadSummary,
  SupportThreadType,
  UserRole,
} from '@/lib/types';

interface SupportInboxPageProps {
  role: UserRole;
  className?: string;
}

interface InboxResponse {
  threads: SupportThreadSummary[];
  directory: SupportDirectoryEntry[];
}

interface MessagesResponse {
  thread: SupportThreadSummary | null;
  messages: SupportMessage[];
}

function formatThreadTimestamp(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getRoleBadgeTone(threadType: SupportThreadType) {
  if (threadType === 'customer_owner') {
    return 'border-amber-400/25 bg-amber-500/10 text-amber-100';
  }

  if (threadType === 'owner_admin') {
    return 'border-sky-400/25 bg-sky-500/10 text-sky-100';
  }

  return 'border-primary/25 bg-primary/12 text-primary';
}

export function SupportInboxPage({ role, className = '' }: SupportInboxPageProps) {
  const { user } = useAuth();
  const { t, language } = useTranslations();
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [directory, setDirectory] = useState<SupportDirectoryEntry[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingDirectoryId, setPendingDirectoryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const copy = useMemo(() => {
    if (role === 'owner') {
      return {
        eyebrow: t('support.owner.eyebrow', undefined, 'Tin nhắn vận hành'),
        title: t('support.owner.title', undefined, 'Chat giữa chủ quán và hệ thống hỗ trợ'),
        subtitle: t(
          'support.owner.subtitle',
          undefined,
          'Tập trung trao đổi với khách theo từng điểm bán và mở một kênh riêng với admin khi cần xử lý vận hành.'
        ),
        emptyTitle: t('support.owner.emptyTitle', undefined, 'Chưa có cuộc trò chuyện nào.'),
        emptyBody: t(
          'support.owner.emptyBody',
          undefined,
          'Khi khách nhắn theo từng điểm bán hoặc bạn mở kênh với admin, toàn bộ cuộc trò chuyện sẽ xuất hiện tại đây.'
        ),
      };
    }

    if (role === 'admin') {
      return {
        eyebrow: t('support.admin.eyebrow', undefined, 'Hàng đợi hỗ trợ'),
        title: t('support.admin.title', undefined, 'Điều phối trao đổi với khách và chủ quán'),
        subtitle: t(
          'support.admin.subtitle',
          undefined,
          'Admin nhận các luồng hỗ trợ từ khách hàng và chủ quán trong cùng một inbox để phản hồi nhanh, không cần widget nổi.'
        ),
        emptyTitle: t('support.admin.emptyTitle', undefined, 'Hàng đợi đang trống.'),
        emptyBody: t(
          'support.admin.emptyBody',
          undefined,
          'Khi có yêu cầu hỗ trợ mới từ khách hàng hoặc chủ quán, cuộc trò chuyện sẽ xuất hiện tại đây.'
        ),
      };
    }

    return {
      eyebrow: t('support.customer.eyebrow', undefined, 'Trung tâm hỗ trợ'),
      title: t('support.customer.title', undefined, 'Nhắn trực tiếp với chủ quán hoặc admin'),
      subtitle: t(
        'support.customer.subtitle',
        undefined,
        'Mỗi quán có một luồng riêng theo từng điểm bán, còn admin là kênh hỗ trợ chung cho tài khoản và trải nghiệm trên FlavorQuest.'
      ),
      emptyTitle: t('support.customer.emptyTitle', undefined, 'Chưa có cuộc trò chuyện nào.'),
      emptyBody: t(
        'support.customer.emptyBody',
        undefined,
        'Hãy chọn một quán hoặc kênh admin ở cột trái để bắt đầu nhắn tin. Email thông báo sẽ được gửi khi có phản hồi mới.'
      ),
    };
  }, [role, t]);

  const fetchInbox = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) {
        setIsLoadingInbox(true);
      }

      try {
        const response = await fetch('/api/support/threads', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as InboxResponse;

        if (!mountedRef.current) {
          return;
        }

        startTransition(() => {
          setThreads(data.threads ?? []);
          setDirectory(data.directory ?? []);
          setActiveThreadId((currentThreadId) => {
            if (currentThreadId && (data.threads ?? []).some((thread) => thread.id === currentThreadId)) {
              return currentThreadId;
            }

            return data.threads?.[0]?.id ?? null;
          });
        });
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('support.errors.loadThreads', undefined, 'Không thể tải danh sách cuộc trò chuyện.')
        );
      } finally {
        if (mountedRef.current) {
          setIsLoadingInbox(false);
        }
      }
    },
    [t]
  );

  const markRead = useCallback(async (threadId: string) => {
    try {
      await fetch(`/api/support/threads/${threadId}/read`, {
        method: 'POST',
      });
      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                unread_count: 0,
              }
            : thread
        )
      );
    } catch (error) {
      console.error('[SupportInboxPage] mark read failed:', error);
    }
  }, []);

  const loadMessages = useCallback(
    async (threadId: string, shouldMarkRead = true) => {
      setIsLoadingMessages(true);

      try {
        const response = await fetch(`/api/support/threads/${threadId}/messages`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as MessagesResponse;

        if (!mountedRef.current) {
          return;
        }

        setMessages(data.messages ?? []);

        if (shouldMarkRead) {
          void markRead(threadId);
        }
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('support.errors.loadMessages', undefined, 'Không thể tải tin nhắn của cuộc trò chuyện.')
        );
      } finally {
        if (mountedRef.current) {
          setIsLoadingMessages(false);
        }
      }
    },
    [markRead, t]
  );

  useEffect(() => {
    mountedRef.current = true;
    void fetchInbox();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchInbox]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const supabase = createClient();
    const channelName = `support-inbox-${role}-${user.id}`;
    const channel = supabase.channel(channelName);

    const refreshInbox = () => {
      void fetchInbox(false);
      if (activeThreadId) {
        void loadMessages(activeThreadId, false);
      }
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_threads' }, refreshInbox)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, (payload) => {
        const nextThreadId =
          (payload.new as { thread_id?: string } | undefined)?.thread_id ||
          (payload.old as { thread_id?: string } | undefined)?.thread_id;

        void fetchInbox(false);
        if (activeThreadId && nextThreadId === activeThreadId) {
          void loadMessages(activeThreadId, false);
          void markRead(activeThreadId);
        }
      })
      .subscribe();

    return () => {
      void (channel as RealtimeChannel).unsubscribe();
    };
  }, [activeThreadId, fetchInbox, loadMessages, markRead, role, user?.id]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  );

  const activeDirectoryEntry = useMemo(
    () => directory.find((entry) => entry.existing_thread_id === activeThreadId) ?? null,
    [activeThreadId, directory]
  );

  const openDirectoryEntry = useCallback(
    async (entry: SupportDirectoryEntry) => {
      setErrorMessage(null);

      if (entry.existing_thread_id) {
        setActiveThreadId(entry.existing_thread_id);
        return;
      }

      setPendingDirectoryId(entry.id);

      try {
        const response = await fetch('/api/support/threads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadType: entry.thread_type,
            poiId: entry.poi?.id,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(
            payload?.error ||
              t('support.errors.createThread', undefined, 'Không thể tạo cuộc trò chuyện mới.')
          );
        }

        const data = (await response.json()) as { threadId: string };
        setActiveThreadId(data.threadId);
        await fetchInbox(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('support.errors.createThread', undefined, 'Không thể tạo cuộc trò chuyện mới.')
        );
      } finally {
        setPendingDirectoryId(null);
      }
    },
    [fetchInbox, t]
  );

  const sendMessage = useCallback(async () => {
    if (!activeThreadId || !draft.trim() || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/support/threads/${activeThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: draft.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          payload?.error || t('support.errors.sendMessage', undefined, 'Không thể gửi tin nhắn.')
        );
      }

      setDraft('');
      await Promise.all([fetchInbox(false), loadMessages(activeThreadId, false)]);
      void markRead(activeThreadId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('support.errors.sendMessage', undefined, 'Không thể gửi tin nhắn.')
      );
    } finally {
      setIsSending(false);
    }
  }, [activeThreadId, draft, fetchInbox, isSending, loadMessages, markRead, t]);

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const unreadThreads = threads.filter((thread) => thread.unread_count > 0).length;

  return (
    <div className={`space-y-6 ${className}`}>
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#2c1e16]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(242,108,13,0.22),_transparent_50%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-primary/80 text-[11px] font-semibold tracking-[0.32em] uppercase">
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-black text-white sm:text-[2.2rem]">{copy.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">{copy.subtitle}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                <p className="text-[11px] tracking-[0.22em] text-gray-500 uppercase">
                  {t('support.stats.activeThreads', undefined, 'Luồng đang mở')}
                </p>
                <p className="mt-3 text-3xl font-black text-white">{threads.length}</p>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  {t(
                    'support.stats.activeThreadsBody',
                    undefined,
                    'Mỗi luồng là một trang chat đầy đủ, không chồng lên giao diện chính.'
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                <p className="text-[11px] tracking-[0.22em] text-gray-500 uppercase">
                  {t('support.stats.unreadThreads', undefined, 'Cần phản hồi')}
                </p>
                <p className="text-primary mt-3 text-3xl font-black">{unreadThreads}</p>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  {t(
                    'support.stats.unreadThreadsBody',
                    undefined,
                    'Khi có tin nhắn mới, hệ thống cũng gửi thông báo qua email cho bên nhận.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <aside className="space-y-6">
          {directory.length > 0 && (
            <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-primary text-sm font-semibold">
                    {t('support.launchpad.title', undefined, 'Mở luồng mới')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    {t(
                      'support.launchpad.body',
                      undefined,
                      'Chọn đúng đối tượng cần trao đổi. Hệ thống sẽ mở hoặc tái sử dụng luồng chat tương ứng.'
                    )}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-gray-300">
                  {directory.length}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {directory.map((entry) => {
                  const isPending = pendingDirectoryId === entry.id;
                  const isActive = entry.existing_thread_id && entry.existing_thread_id === activeThreadId;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => void openDirectoryEntry(entry)}
                      disabled={isPending}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                        isActive
                          ? 'border-primary/35 bg-primary/12'
                          : 'border-white/10 bg-black/15 hover:bg-white/5'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{entry.title}</p>
                          <p className="mt-2 text-sm leading-6 text-gray-400">{entry.subtitle}</p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getRoleBadgeTone(entry.thread_type)}`}
                        >
                          {entry.thread_type === 'customer_owner'
                            ? t('support.threadTypes.customerOwner', undefined, 'Khách / Chủ quán')
                            : entry.thread_type === 'owner_admin'
                              ? t('support.threadTypes.ownerAdmin', undefined, 'Chủ quán / Admin')
                              : t('support.threadTypes.customerAdmin', undefined, 'Khách / Admin')}
                        </span>
                      </div>

                      {entry.poi && (
                        <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                          {entry.poi.name_vi}
                        </p>
                      )}

                      <div className="mt-4 text-sm font-semibold text-primary">
                        {isPending
                          ? t('support.states.creating', undefined, 'Đang mở...')
                          : entry.existing_thread_id
                            ? t('support.actions.openThread', undefined, 'Mở cuộc trò chuyện')
                            : t('support.actions.startThread', undefined, 'Bắt đầu nhắn tin')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-primary text-sm font-semibold">
                  {t('support.inbox.title', undefined, 'Danh sách cuộc trò chuyện')}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {t(
                    'support.inbox.body',
                    undefined,
                    'Luồng nào có tin mới chưa đọc sẽ nổi bật để bạn phản hồi nhanh hơn.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchInbox()}
                className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10"
              >
                {t('support.actions.refresh', undefined, 'Làm mới')}
              </button>
            </div>

            {isLoadingInbox ? (
              <div className="mt-5 space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="loading-shimmer h-24 rounded-2xl border border-white/10 bg-black/15" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">{copy.emptyTitle}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{copy.emptyBody}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {threads.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const counterpartLabel =
                    thread.counterpart?.role === 'admin'
                      ? t('support.counterparts.admin', undefined, 'Đội ngũ admin')
                      : thread.counterpart?.email || t('support.counterparts.unknown', undefined, 'Người nhận');

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setActiveThreadId(thread.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                        isActive
                          ? 'border-primary/35 bg-primary/12'
                          : 'border-white/10 bg-black/15 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {thread.subject || counterpartLabel}
                          </p>
                          <p className="mt-1 text-sm text-gray-400">{counterpartLabel}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-gray-500">
                            {formatThreadTimestamp(thread.last_message_at, language)}
                          </p>
                          {thread.unread_count > 0 && (
                            <span className="bg-primary mt-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-1 text-[11px] font-bold text-white">
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {thread.poi && (
                        <p className="mt-3 text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                          {thread.poi.name_vi}
                        </p>
                      )}

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-300">
                        {thread.last_message_preview ||
                          t('support.states.waitingFirstMessage', undefined, 'Chưa có tin nhắn nào trong luồng này.')}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-[640px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#2c1e16]">
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(242,108,13,0.12),rgba(255,255,255,0))] px-5 py-5 sm:px-6">
            {activeThread ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-primary text-sm font-semibold">
                    {activeThread.subject ||
                      activeDirectoryEntry?.title ||
                      t('support.thread.title', undefined, 'Cuộc trò chuyện')}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {activeThread.counterpart?.role === 'admin'
                      ? t('support.counterparts.admin', undefined, 'Đội ngũ admin')
                      : activeThread.counterpart?.email || t('support.counterparts.unknown', undefined, 'Người nhận')}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {activeThread.poi
                      ? t('support.thread.poiContext', { name: activeThread.poi.name_vi }, 'Trao đổi đang gắn với điểm bán {name}.')
                      : t(
                          'support.thread.emailHint',
                          undefined,
                          'Tin nhắn mới sẽ tạo thông báo trong hệ thống và gửi email cho bên nhận.'
                        )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getRoleBadgeTone(activeThread.thread_type)}`}
                  >
                    {activeThread.thread_type === 'customer_owner'
                      ? t('support.threadTypes.customerOwner', undefined, 'Khách / Chủ quán')
                      : activeThread.thread_type === 'owner_admin'
                        ? t('support.threadTypes.ownerAdmin', undefined, 'Chủ quán / Admin')
                        : t('support.threadTypes.customerAdmin', undefined, 'Khách / Admin')}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[11px] font-semibold text-gray-300">
                    {t('support.thread.emailBadge', undefined, 'Có email thông báo')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">
                  {t('support.states.noThreadSelected', undefined, 'Chọn một cuộc trò chuyện để bắt đầu.')}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {t(
                    'support.states.noThreadSelectedBody',
                    undefined,
                    'Danh sách bên trái cho phép bạn mở đúng luồng chat theo vai trò và quy tắc nghiệp vụ.'
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.18))] px-4 py-5 sm:px-6">
            {!activeThread ? null : isLoadingMessages ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className={`loading-shimmer h-20 rounded-2xl border border-white/10 ${item % 2 === 0 ? 'mr-auto max-w-[80%]' : 'ml-auto max-w-[76%]'}`}
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[240px] items-center justify-center">
                <div className="max-w-md rounded-[28px] border border-dashed border-white/10 bg-black/15 px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-white">
                    {t('support.states.noMessages', undefined, 'Luồng này chưa có tin nhắn nào.')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    {t(
                      'support.states.noMessagesBody',
                      undefined,
                      'Hãy gửi tin đầu tiên. Khi có phản hồi, hệ thống sẽ tự cập nhật danh sách và email thông báo.'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-[24px] border px-4 py-3 sm:max-w-[72%] ${
                          isOwnMessage
                            ? 'border-primary/30 bg-primary/14 text-white'
                            : 'border-white/10 bg-black/20 text-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold tracking-[0.16em] text-white/70 uppercase">
                            {message.sender_role === 'admin'
                              ? t('support.counterparts.adminShort', undefined, 'Admin')
                              : message.sender_role === 'owner'
                                ? t('support.counterparts.ownerShort', undefined, 'Chủ quán')
                                : t('support.counterparts.customerShort', undefined, 'Khách')}
                          </span>
                          <span className="text-[11px] text-white/55">
                            {formatThreadTimestamp(message.created_at, language)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/10 px-4 py-4 sm:px-6">
            <div className="grid gap-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                disabled={!activeThread || isSending}
                placeholder={t(
                  'support.composer.placeholder',
                  undefined,
                  'Nhập nội dung cần trao đổi. Nhấn Enter để gửi, Shift + Enter để xuống dòng.'
                )}
                rows={4}
                className="focus:border-primary/40 min-h-[112px] w-full resize-none rounded-[24px] border border-white/10 bg-[#17100b] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-400">
                  {t(
                    'support.composer.hint',
                    undefined,
                    'Tin nhắn sẽ xuất hiện theo thời gian thực và bên nhận cũng nhận được email thông báo.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!activeThread || !draft.trim() || isSending}
                  className="bg-primary rounded-2xl px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending
                    ? t('support.actions.sending', undefined, 'Đang gửi...')
                    : t('support.actions.send', undefined, 'Gửi tin nhắn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
