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
import { Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import type {
  POI,
  SupportDirectoryEntry,
  SupportLaunchpadMeta,
  SupportMessage,
  SupportThreadSummary,
  SupportThreadType,
  UserRole,
} from '@/lib/types';

interface SupportInboxPageProps {
  role: UserRole;
  className?: string;
  mode?: 'default' | 'owner-request';
  showHero?: boolean;
  initialThreadId?: string | null;
}

interface InboxResponse {
  threads: SupportThreadSummary[];
  directory: SupportDirectoryEntry[];
  meta: SupportLaunchpadMeta;
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

export function SupportInboxPage({
  role,
  className = '',
  mode = 'default',
  showHero = true,
  initialThreadId = null,
}: SupportInboxPageProps) {
  const { user } = useAuth();
  const { t, language } = useTranslations();
  const isOwnerRequestMode = role === 'pending-owner' && mode === 'owner-request';
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [directory, setDirectory] = useState<SupportDirectoryEntry[]>([]);
  const [fallbackDirectory, setFallbackDirectory] = useState<SupportDirectoryEntry[]>([]);
  const [meta, setMeta] = useState<SupportLaunchpadMeta>({
    availableOwnerPoiCount: 0,
    availableAdminCount: 0,
  });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingDirectoryId, setPendingDirectoryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingMessages]);

  const copy = useMemo(() => {
    if (role === 'owner') {
      return {
        eyebrow: t('support.owner.eyebrow', undefined, 'Hộp thư'),
        title: t('support.owner.title', undefined, 'Tin nhắn từ khách và admin'),
        subtitle: t(
          'support.owner.subtitle',
          undefined,
          'Theo dõi trao đổi với khách theo từng quán và giữ một kênh riêng để làm việc với admin.'
        ),
        emptyTitle: t('support.owner.emptyTitle', undefined, 'Hộp thư đang trống.'),
        emptyBody: t(
          'support.owner.emptyBody',
          undefined,
          'Khi khách nhắn hoặc bạn trao đổi với admin, hội thoại sẽ hiện ở đây.'
        ),
      };
    }

    if (role === 'admin') {
      return {
        eyebrow: t('support.admin.eyebrow', undefined, 'Tin nhắn hỗ trợ'),
        title: t('support.admin.title', undefined, 'Trao đổi với khách và chủ quán'),
        subtitle: t(
          'support.admin.subtitle',
          undefined,
          'Tất cả yêu cầu hỗ trợ từ khách và chủ quán đều tập trung ở đây để bạn phản hồi nhanh.'
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
      eyebrow: t('support.customer.eyebrow', undefined, 'Chat hỗ trợ'),
      title: t('support.customer.title', undefined, 'Nhắn cho quán hoặc admin'),
      subtitle: t(
        'support.customer.subtitle',
        undefined,
        'Bạn có thể nhắn riêng cho từng quán, hoặc hỏi admin nếu cần hỗ trợ về tài khoản và trải nghiệm.'
      ),
      emptyTitle: t('support.customer.emptyTitle', undefined, 'Chưa có tin nhắn nào.'),
      emptyBody: t(
        'support.customer.emptyBody',
        undefined,
        'Chọn một quán hoặc mở chat với admin để bắt đầu.'
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
          setMeta(
            data.meta ?? {
              availableOwnerPoiCount: 0,
              availableAdminCount: 0,
            }
          );
          setActiveThreadId((currentThreadId) => {
            if (
              currentThreadId &&
              (data.threads ?? []).some((thread) => thread.id === currentThreadId)
            ) {
              return currentThreadId;
            }

            if (
              initialThreadId &&
              (data.threads ?? []).some((thread) => thread.id === initialThreadId)
            ) {
              return initialThreadId;
            }

            if (isOwnerRequestMode) {
              return (
                data.threads?.find((thread) => thread.thread_type === 'customer_admin')?.id ??
                data.threads?.[0]?.id ??
                null
              );
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
    [initialThreadId, isOwnerRequestMode, t]
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
            : t(
                'support.errors.loadMessages',
                undefined,
                'Không thể tải tin nhắn của cuộc trò chuyện.'
              )
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
    if ((role !== 'customer' && role !== 'pending-owner') || isLoadingInbox || directory.length > 0) {
      setFallbackDirectory([]);
      return;
    }

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let isCancelled = false;

    const loadFallbackDirectory = async () => {
      try {
        const response = await fetch('/api/pois', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          return;
        }

        const pois = ((await response.json()) as POI[]).filter((poi) => Boolean(poi.owner_id));
        const customerAdminThread = threads.find(
          (thread) => thread.thread_type === 'customer_admin'
        );

        const nextDirectory: SupportDirectoryEntry[] = pois.map((poi) => ({
          id: `fallback-poi:${poi.id}`,
          title: poi.name_vi,
          subtitle: 'Nhắn trực tiếp với chủ quán',
          thread_type: 'customer_owner',
          poi: {
            id: poi.id,
            name_vi: poi.name_vi,
          },
          counterpart: null,
          existing_thread_id:
            threads.find(
              (thread) => thread.thread_type === 'customer_owner' && thread.poi?.id === poi.id
            )?.id ?? null,
        }));

        if (adminEmails.length > 0) {
          nextDirectory.unshift({
            id: 'fallback-admin',
            title: 'Nhắn admin',
            subtitle: 'Cần hỗ trợ? Nhắn admin ở đây.',
            thread_type: 'customer_admin',
            poi: null,
            counterpart: null,
            existing_thread_id: customerAdminThread?.id ?? null,
          });
        }

        if (!isCancelled) {
          setFallbackDirectory(nextDirectory);
        }
      } catch (error) {
        console.error('[SupportInboxPage] fallback directory failed:', error);
      }
    };

    void loadFallbackDirectory();

    return () => {
      isCancelled = true;
    };
  }, [directory.length, isLoadingInbox, role, threads]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    if (!initialThreadId || !threads.some((thread) => thread.id === initialThreadId)) {
      return;
    }

    setActiveThreadId(initialThreadId);
    setIsMobileChatOpen(true);
  }, [initialThreadId, threads]);

  useEffect(() => {
    if (!isOwnerRequestMode || isLoadingInbox) {
      return;
    }

    const customerAdminThread = threads.find((thread) => thread.thread_type === 'customer_admin');

    if (customerAdminThread?.id) {
      setActiveThreadId(customerAdminThread.id);
    }
  }, [isLoadingInbox, isOwnerRequestMode, threads]);

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_threads' },
        refreshInbox
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        (payload) => {
          const nextThreadId =
            (payload.new as { thread_id?: string } | undefined)?.thread_id ||
            (payload.old as { thread_id?: string } | undefined)?.thread_id;

          void fetchInbox(false);
          if (activeThreadId && nextThreadId === activeThreadId) {
            void loadMessages(activeThreadId, false);
            void markRead(activeThreadId);
          }
        }
      )
      .subscribe();

    return () => {
      void (channel as RealtimeChannel).unsubscribe();
    };
  }, [activeThreadId, fetchInbox, loadMessages, markRead, role, user?.id]);

  const displayedDirectory = useMemo(() => {
    const baseDirectory = directory.length > 0 ? directory : fallbackDirectory;

    if (!isOwnerRequestMode) {
      return baseDirectory;
    }

    return baseDirectory.filter((entry) => entry.thread_type === 'customer_admin');
  }, [directory, fallbackDirectory, isOwnerRequestMode]);

  const displayedThreads = useMemo(() => {
    if (!isOwnerRequestMode) {
      return threads;
    }

    return threads.filter((thread) => thread.thread_type === 'customer_admin');
  }, [isOwnerRequestMode, threads]);

  const activeThread = useMemo(
    () => displayedThreads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, displayedThreads]
  );

  const activeDirectoryEntry = useMemo(
    () => displayedDirectory.find((entry) => entry.existing_thread_id === activeThreadId) ?? null,
    [activeThreadId, displayedDirectory]
  );

  const openDirectoryEntry = useCallback(
    async (entry: SupportDirectoryEntry) => {
      setErrorMessage(null);

      if (entry.existing_thread_id) {
        setActiveThreadId(entry.existing_thread_id);
        setIsMobileChatOpen(true);
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
        setIsMobileChatOpen(true);
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

  const unreadThreads = displayedThreads.filter((thread) => thread.unread_count > 0).length;

  const launchpadEmptyMessage = useMemo(() => {
    if (role === 'customer' || role === 'pending-owner') {
      if (isOwnerRequestMode) {
        return null;
      }

      const ownerCount =
        meta.availableOwnerPoiCount ||
        fallbackDirectory.filter((entry) => entry.thread_type === 'customer_owner').length;
      const adminCount =
        meta.availableAdminCount ||
        fallbackDirectory.filter((entry) => entry.thread_type === 'customer_admin').length;

      if (ownerCount === 0 && adminCount === 0) {
        return 'Hiện chưa có quán nào được gán chủ quán và cũng chưa có tài khoản admin để bạn nhắn.';
      }

      if (ownerCount === 0) {
        return 'Hiện chưa có quán nào được gán chủ quán để bạn nhắn trực tiếp.';
      }

      if (adminCount === 0) {
        return 'Hiện chưa có tài khoản admin nào sẵn sàng để hỗ trợ qua chat.';
      }
    }

    if (role === 'owner' && meta.availableAdminCount === 0) {
      return 'Hiện chưa có tài khoản admin nào để bạn mở kênh hỗ trợ.';
    }

    return null;
  }, [
    fallbackDirectory,
    isOwnerRequestMode,
    meta.availableAdminCount,
    meta.availableOwnerPoiCount,
    role,
  ]);

  return (
    <div className={`space-y-6 ${className}`}>
      {showHero ? (
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#2c1e16]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(242,108,13,0.22),_transparent_50%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-primary/80 text-[11px] font-semibold tracking-[0.32em] uppercase">
                  {copy.eyebrow}
                </p>
                <h1 className="mt-3 text-3xl font-black text-white sm:text-[2.2rem]">
                  {copy.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">{copy.subtitle}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                  <p className="text-[11px] tracking-[0.22em] text-gray-500 uppercase">
                    {t('support.stats.activeThreads', undefined, 'Luồng đang mở')}
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">{displayedThreads.length}</p>
                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    {t(
                      'support.stats.activeThreadsBody',
                      undefined,
                      'Mỗi hội thoại có một trang riêng, dễ theo dõi hơn.'
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
                      'Khi có tin nhắn mới, người nhận cũng sẽ được báo qua email.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {errorMessage && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      )}

      <section
        className={`flex flex-col gap-6 xl:flex-row ${showHero ? 'h-[calc(100vh-14rem)] max-h-[85vh] min-h-[600px]' : 'min-h-[680px]'}`}
      >
        <aside
          className={`flex w-full flex-shrink-0 flex-col space-y-6 xl:w-[45%] ${isMobileChatOpen ? 'hidden xl:flex' : 'flex'} custom-scrollbar h-full overflow-y-auto pr-2`}
        >
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
                    'Chọn đúng người cần nhắn. Nếu đã có hội thoại trước đó, hệ thống sẽ mở lại hội thoại đó.'
                  )}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-gray-300">
                {displayedDirectory.length}
              </span>
            </div>

            {displayedDirectory.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-white">
                  Chưa có ai để bắt đầu cuộc trò chuyện.
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {launchpadEmptyMessage ||
                    'Khi có đối tượng phù hợp, bạn sẽ thấy danh sách xuất hiện tại đây.'}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {displayedDirectory.map((entry) => {
                  const isPending = pendingDirectoryId === entry.id;
                  const isActive =
                    entry.existing_thread_id && entry.existing_thread_id === activeThreadId;

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

                      <div className="text-primary mt-4 text-sm font-semibold">
                        {isPending
                          ? t('support.states.creating', undefined, 'Đang mở...')
                          : entry.existing_thread_id
                            ? t('support.actions.openThread', undefined, 'Mở cuộc trò chuyện')
                            : t('support.actions.startThread', undefined, 'Nhắn ngay')}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
                    'Tin nhắn chưa đọc sẽ được đưa lên trước để bạn xử lý nhanh hơn.'
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
                  <div
                    key={item}
                    className="loading-shimmer h-24 rounded-2xl border border-white/10 bg-black/15"
                  />
                ))}
              </div>
            ) : displayedThreads.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">{copy.emptyTitle}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{copy.emptyBody}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {displayedThreads.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const counterpartLabel =
                    thread.counterpart?.role === 'admin'
                      ? t('support.counterparts.admin', undefined, 'Đội ngũ admin')
                      : thread.counterpart?.email ||
                        t('support.counterparts.unknown', undefined, 'Người nhận');

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setActiveThreadId(thread.id);
                        setIsMobileChatOpen(true);
                      }}
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
                          t(
                            'support.states.waitingFirstMessage',
                            undefined,
                            'Chưa có tin nhắn nào trong luồng này.'
                          )}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div
          className={`flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#2c1e16] ${isMobileChatOpen ? 'flex' : 'hidden xl:flex'} h-full`}
        >
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(242,108,13,0.12),rgba(255,255,255,0))] px-5 py-5 sm:px-6">
            {activeThread ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="mt-0 flex-shrink-0 rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white xl:hidden"
                    aria-label="Quay lại danh sách"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <p className="text-primary text-sm font-semibold">
                      {activeThread.subject ||
                        activeDirectoryEntry?.title ||
                        t('support.thread.title', undefined, 'Cuộc trò chuyện')}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      {activeThread.counterpart?.role === 'admin'
                        ? t('support.counterparts.admin', undefined, 'Đội ngũ admin')
                        : activeThread.counterpart?.email ||
                          t('support.counterparts.unknown', undefined, 'Người nhận')}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      {activeThread.poi
                        ? t(
                            'support.thread.poiContext',
                            { name: activeThread.poi.name_vi },
                            'Trao đổi đang gắn với điểm bán {name}.'
                          )
                        : t(
                            'support.thread.emailHint',
                            undefined,
                            'Tin nhắn mới sẽ được báo trong ứng dụng và qua email.'
                          )}
                    </p>
                  </div>
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
                  {t(
                    'support.states.noThreadSelected',
                    undefined,
                    'Chọn một cuộc trò chuyện để bắt đầu.'
                  )}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {t(
                    'support.states.noThreadSelectedBody',
                    undefined,
                    'Bạn cũng có thể mở nhanh một cuộc trò chuyện mới ở cột bên trái.'
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.18))] px-4 py-5 sm:px-6">
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
                    {t('support.states.noMessagesBody', undefined, 'Gửi tin đầu tiên để bắt đầu.')}
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
                        className={`max-w-[85%] px-4 py-3 shadow-sm sm:max-w-[72%] ${
                          isOwnMessage
                            ? 'bg-primary rounded-[20px] rounded-tr-[4px] text-white'
                            : 'rounded-[20px] rounded-tl-[4px] border border-white/10 bg-[#1f1611]/80 text-gray-100 backdrop-blur-md'
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
                        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 bg-black/10 px-4 py-4 sm:px-6">
            <div className="focus-within:ring-primary/50 flex min-h-[56px] items-end rounded-[28px] border border-white/10 bg-white/5 pr-2 transition-all focus-within:bg-white/10 focus-within:ring-1">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                disabled={!activeThread || isSending}
                placeholder={t('support.composer.placeholder', undefined, 'Nhập tin nhắn...')}
                rows={1}
                className="custom-scrollbar block max-h-32 w-full resize-none overflow-y-auto border-none bg-transparent px-5 py-4 text-sm leading-relaxed text-white outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ minHeight: '56px' }}
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!activeThread || !draft.trim() || isSending}
                className="bg-primary mb-2 ml-2 flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:bg-gray-700 disabled:opacity-50 disabled:hover:scale-100"
                aria-label="Gửi"
              >
                <Send className="ml-0.5 h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-gray-500 xl:text-left">
              {t(
                'support.composer.hint',
                undefined,
                'Nhấn Enter để gửi, Shift + Enter để xuống dòng. Email cũng sẽ được gửi cho bên nhận.'
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
