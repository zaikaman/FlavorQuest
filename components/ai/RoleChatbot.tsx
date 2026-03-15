'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from '@/lib/hooks/useTranslations';
import type { Language } from '@/lib/types';

type ChatbotRole = 'customer' | 'owner' | 'admin';
type ChatbotMode = 'floating' | 'page';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatConversation {
  id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
}

interface RoleChatbotProps {
  role: ChatbotRole;
  language?: Language;
  mode?: ChatbotMode;
  pageContext?: {
    pathname?: string | null;
    activeTab?: string | null;
    selectedTourId?: string | null;
    selectedPoiId?: string | null;
  };
  bottomOffsetClassName?: string;
}

interface RoleChatbotCopy {
  badge: string;
  title: string;
  subtitle: string;
  welcome: string;
  placeholder: string;
  openLabel: string;
  closeLabel: string;
  thinking: string;
  error: string;
  suggestions: string[];
  footer: string;
  newChat: string;
  historyEmpty: string;
  loadingHistory: string;
}

interface ChatbotHistoryResponse {
  role: ChatbotRole;
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
}

interface ChatbotSendResponse {
  role: ChatbotRole;
  conversation: ChatConversation;
  conversations: ChatConversation[];
  messages: ChatMessage[];
}

function buildMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatRelativeDate(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function RoleChatbot({
  role,
  language = 'vi',
  mode = 'floating',
  pageContext,
  bottomOffsetClassName = 'bottom-24',
}: RoleChatbotProps) {
  const { t } = useTranslations();
  const isPageMode = mode === 'page';
  const [isOpen, setIsOpen] = useState(isPageMode);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo<RoleChatbotCopy>(() => {
    if (role === 'customer') {
      return {
        badge: t('chatbot.badge'),
        title: t('chatbot.title'),
        subtitle: t('chatbot.subtitle'),
        welcome: t('chatbot.welcome'),
        placeholder: t('chatbot.inputPlaceholder'),
        openLabel: t('chatbot.open'),
        closeLabel: t('chatbot.close'),
        thinking: t('chatbot.thinking'),
        error: t('chatbot.error'),
        suggestions: [
          t('chatbot.suggestions.food'),
          t('chatbot.suggestions.route'),
          t('chatbot.suggestions.faq'),
        ],
        footer: t('chatbot.footer'),
        newChat: t('chatbot.newChat'),
        historyEmpty: t('chatbot.historyEmpty'),
        loadingHistory: t('chatbot.loadingHistory'),
      };
    }

    if (role === 'owner') {
      return {
        badge: 'Trợ lý chủ quán',
        title: 'Hỏi nhanh về vận hành',
        subtitle: 'Tóm tắt việc cần làm, đơn cần ưu tiên và chỗ nào nên rà soát trước.',
        welcome:
          'Tôi có thể giúp bạn rà soát POI, món ăn, đơn đặt trước và thông báo để biết việc nào nên xử lý trước.',
        placeholder:
          'Hỏi về bất cứ điều gì...',
        openLabel: 'Mở trợ lý chủ quán',
        closeLabel: 'Đóng trợ lý chủ quán',
        thinking: 'Đang rà soát dữ liệu vận hành...',
        error: 'Chưa thể kết nối trợ lý cho chủ quán. Vui lòng thử lại sau.',
        suggestions: [
          'Hôm nay tôi nên xử lý việc gì trước?',
          'POI nào của tôi đang cần chú ý nhất?',
          'Đơn nào nên xác nhận trước?',
        ],
        footer: 'Câu trả lời dựa trên dữ liệu hiện có của khu vực chủ quán.',
        newChat: 'Chat mới',
        historyEmpty: 'Chưa có cuộc trò chuyện nào.',
        loadingHistory: 'Đang tải lịch sử trò chuyện...',
      };
    }

    return {
      badge: 'Trợ lý quản trị',
      title: 'Hỏi nhanh về hệ thống',
      subtitle: 'Đọc nhanh snapshot vận hành, thanh toán và các tín hiệu cần để mắt tới.',
      welcome:
        'Tôi có thể tóm tắt tình hình hệ thống, chỉ ra điểm nghẽn và gợi ý việc nào admin nên xử lý trước.',
      placeholder:
        'Hỏi về bất cứ điều gì...',
      openLabel: 'Mở trợ lý quản trị',
      closeLabel: 'Đóng trợ lý quản trị',
      thinking: 'Đang tổng hợp snapshot quản trị...',
      error: 'Chưa thể kết nối trợ lý quản trị. Vui lòng thử lại sau.',
      suggestions: [
        'Tóm tắt nhanh tình hình hệ thống hiện tại',
        'Rủi ro nào admin nên xử lý trước?',
        'Có tín hiệu nào đáng chú ý từ thanh toán và đơn hàng không?',
      ],
      footer: 'Câu trả lời dựa trên snapshot hiện tại của khu vực quản trị.',
      newChat: 'Chat mới',
      historyEmpty: 'Chưa có cuộc trò chuyện nào.',
      loadingHistory: 'Đang tải lịch sử trò chuyện...',
    };
  }, [role, t]);

  const theme = useMemo(() => {
    if (role === 'customer') {
      return {
        shell: 'from-primary/30 via-primary/5 to-transparent',
        button: 'from-[#f26c0d] to-[#ff9050]',
        ring: 'shadow-[0_8px_32px_rgba(242,108,13,0.15)] border-primary/20',
        accent: 'text-primary',
        assistantBubble: 'bg-[#2a1e16] border border-white/10 text-white/90',
        userBubble: 'bg-primary/20 text-white border border-primary/30',
        inputFocus: 'focus-within:border-primary/50 focus-within:bg-black/60',
        iconGlow: 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_30px_rgba(242,108,13,0.15)]',
      };
    }

    if (role === 'owner') {
      return {
        shell: 'from-[#1f9d62]/30 via-[#1f9d62]/5 to-transparent',
        button: 'from-[#1f9d62] to-[#4ecb89]',
        ring: 'shadow-[0_8px_32px_rgba(31,157,98,0.15)] border-[#1f9d62]/20',
        accent: 'text-[#4ecb89]',
        assistantBubble: 'bg-[#182c22] border border-white/10 text-white/90',
        userBubble: 'bg-[#1f9d62]/20 text-white border border-[#1f9d62]/30',
        inputFocus: 'focus-within:border-[#1f9d62]/50 focus-within:bg-black/60',
        iconGlow: 'bg-[#1f9d62]/20 text-[#4ecb89] border-[#1f9d62]/30 shadow-[0_0_30px_rgba(31,157,98,0.15)]',
      };
    }

    return {
      shell: 'from-[#f0a202]/30 via-[#f0a202]/5 to-transparent',
      button: 'from-[#a85c00] to-[#f0a202]',
      ring: 'shadow-[0_8px_32px_rgba(240,162,2,0.15)] border-[#f0a202]/20',
      accent: 'text-[#f0a202]',
      assistantBubble: 'bg-[#211a11] border border-white/10 text-white/90',
      userBubble: 'bg-[#f0a202]/20 text-white border border-[#f0a202]/30',
      inputFocus: 'focus-within:border-[#f0a202]/50 focus-within:bg-black/60',
      iconGlow: 'bg-[#f0a202]/20 text-[#f0a202] border-[#f0a202]/30 shadow-[0_0_30px_rgba(240,162,2,0.15)]',
    };
  }, [role]);

  const loadHistory = useCallback(
    async (targetConversationId?: string | null) => {
      setIsHistoryLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('role', role);

        if (targetConversationId) {
          params.set('conversation_id', targetConversationId);
        }

        const response = await fetch(`/api/chatbot?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = (await response.json()) as ChatbotHistoryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || copy.error);
        }

        setConversations(data.conversations ?? []);
        setActiveConversationId(data.activeConversationId ?? null);
        setMessages(data.messages ?? []);
      } catch (historyError) {
        const message = historyError instanceof Error ? historyError.message : copy.error;
        setError(message);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [copy.error, role]
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!(isPageMode || isOpen)) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, isPageMode, messages, isSending]);

  useEffect(() => {
    if (isHistoryPanelOpen && conversations.length === 0 && !isHistoryLoading) {
      setIsHistoryPanelOpen(false);
    }
  }, [conversations.length, isHistoryLoading, isHistoryPanelOpen]);

  const handleCreateConversation = async () => {
    if (isCreatingConversation) {
      return;
    }

    setIsCreatingConversation(true);
    setError(null);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          createConversation: true,
        }),
      });

      const data = (await response.json()) as ChatbotSendResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.error);
      }

      setConversations(data.conversations ?? []);
      setActiveConversationId(data.conversation?.id ?? null);
      setMessages([]);
      setInput('');
      setIsHistoryPanelOpen(false);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : copy.error;
      setError(message);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId || isHistoryLoading) {
      return;
    }

    setIsHistoryPanelOpen(false);
    await loadHistory(conversationId);
  };

  const submitPrompt = async (prompt: string) => {
    const content = prompt.trim();
    if (!content || isSending) {
      return;
    }

    setError(null);
    setIsSending(true);

    const optimisticUserMessage: ChatMessage = {
      id: buildMessageId(),
      role: 'user',
      content,
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setInput('');

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          conversationId: activeConversationId,
          message: content,
          language,
          pageContext,
        }),
      });

      const data = (await response.json()) as ChatbotSendResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.error);
      }

      setConversations(data.conversations ?? []);
      setActiveConversationId(data.conversation?.id ?? activeConversationId);
      setMessages(data.messages ?? []);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : copy.error;
      setMessages((current) =>
        current.filter((messageItem) => messageItem.id !== optimisticUserMessage.id)
      );
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const surface = (
    <section
      className={`${
        isPageMode
          ? 'flex h-full min-h-[calc(100vh-7.5rem)] w-full flex-col border-none bg-transparent'
          : `w-[calc(100vw-2rem)] sm:w-[24rem] overflow-hidden rounded-[28px] border bg-[#2c1e16]/85 backdrop-blur-xl ${theme.ring} origin-bottom-right`
      }`}
    >
      <div className={`${isPageMode ? 'flex h-full flex-col' : `bg-gradient-to-br ${theme.shell} p-[1px]`}`}>
        <div className={`${isPageMode ? 'flex h-full flex-col' : 'rounded-[27px] bg-[#1a120b]/90 backdrop-blur-xl'}`}>
          <div className={`px-5 py-4 ${isPageMode ? 'border-b border-white/10' : 'border-b border-white/10'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] font-bold tracking-[0.22em] uppercase ${theme.accent}`}>
                  {copy.badge}
                </p>
                <h3 className="mt-1 text-lg font-black text-white">{copy.title}</h3>
                <p className="mt-1 text-sm leading-5 text-white/60">{copy.subtitle}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHistoryPanelOpen((current) => !current)}
                  disabled={isHistoryLoading || conversations.length === 0}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={copy.loadingHistory}
                >
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCreateConversation()}
                  disabled={isCreatingConversation}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={copy.newChat}
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>

                {!isPageMode && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={copy.closeLabel}
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {isHistoryPanelOpen && (
              <div className="mt-4 rounded-[22px] border border-white/10 bg-black/40 p-3 backdrop-blur-md">
                {isHistoryLoading ? (
                  <p className="text-xs text-white/60">{copy.loadingHistory}</p>
                ) : conversations.length === 0 ? (
                  <p className="text-xs text-white/60">{copy.historyEmpty}</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conversation) => {
                      const isActive = conversation.id === activeConversationId;
                      const activeBorder = role === 'customer' ? 'border-primary/50' : role === 'owner' ? 'border-[#1f9d62]/50' : 'border-[#f0a202]/50';

                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => void handleSelectConversation(conversation.id)}
                          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-xs transition-colors ${
                            isActive
                              ? `${activeBorder} bg-white/10 text-white`
                              : 'border-white/5 bg-transparent text-white/60 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="min-w-0 pr-3">
                            <span className="block truncate font-semibold">{conversation.title}</span>
                            {conversation.last_message_at && (
                              <span className="mt-1 block text-[10px] opacity-70">
                                {formatRelativeDate(conversation.last_message_at)}
                              </span>
                            )}
                          </span>
                          {isActive && (
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`overflow-y-auto px-4 py-4 ${
              isPageMode
                ? `min-h-0 flex-1 ${
                    messages.length === 0 && !isSending && !error
                      ? 'flex flex-col justify-center'
                      : 'space-y-4'
                  }`
                : 'max-h-[24rem] space-y-4'
            }`}
          >
            {isPageMode && messages.length === 0 && !isSending && !error && (
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full border ${theme.iconGlow}`}>
                  <span className="material-symbols-outlined text-[36px]">psychology_alt</span>
                </div>
                <h4 className="mt-6 text-xl font-bold text-white">Xin chào!</h4>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                  {copy.welcome}
                </p>
              </div>
            )}

            {!isPageMode && messages.length === 0 && !isSending && !error && (
              <div className="mb-4 flex flex-col items-center justify-center text-center">
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full border ${theme.iconGlow}`}>
                  <span className="material-symbols-outlined text-[28px]">psychology_alt</span>
                </div>
                <p className="max-w-[200px] text-xs leading-5 text-white/60">
                  {copy.welcome}
                </p>
              </div>
            )}

            {messages.map((message) => {
              if (isPageMode && message.role === 'assistant' && message.id === 'welcome') {
                return null;
              }
              
              return (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === 'assistant'
                    ? `${theme.assistantBubble} mr-auto`
                    : `${theme.userBubble} ml-auto`
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            )})}

            {isSending && (
              <div
                className={`mr-auto max-w-[88%] rounded-[22px] px-4 py-3 text-sm ${theme.assistantBubble}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-[22px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 0 && (
            <div className={`px-4 py-3 ${isPageMode ? '' : 'border-t border-white/10'}`}>
              <div className="flex flex-col gap-2">
                {copy.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submitPrompt(suggestion)}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className={`px-4 py-4 ${isPageMode ? 'border-t border-white/10 pb-8' : 'border-t border-white/10 pb-5'}`}
            onSubmit={(event) => {
              event.preventDefault();
              void submitPrompt(input);
            }}
          >
            <label className="sr-only" htmlFor={`role-chatbot-input-${role}`}>
              {copy.title}
            </label>
            <div className={`rounded-[22px] border border-white/10 bg-black/40 p-2 shadow-sm backdrop-blur-md transition-colors ${theme.inputFocus}`}>
              <textarea
                id={`role-chatbot-input-${role}`}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={copy.placeholder}
                rows={1}
                className="min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submitPrompt(input);
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-1 pt-2">
                <p className="text-[11px] leading-4 text-white/40">{copy.footer}</p>
                <button
                  type="submit"
                  disabled={isSending || input.trim().length === 0}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${theme.button} text-white transition-all transform hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );

  if (isPageMode) {
    return surface;
  }

  return (
    <div className={`fixed right-4 sm:right-6 lg:right-8 z-[65] flex flex-col items-end ${bottomOffsetClassName}`}>
      <div
        className={`transition-all duration-300 ${isOpen ? 'pointer-events-auto translate-y-0 opacity-100 scale-100' : 'pointer-events-none translate-y-4 opacity-0 scale-95'}`}
      >
        <div className="mb-4">{surface}</div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`group flex items-center gap-3 rounded-full border border-white/30 bg-gradient-to-br ${theme.button} px-4 py-3 text-white shadow-[0_20px_50px_rgba(22,18,15,0.4)] transition-all hover:scale-[1.02] active:scale-95`}
        aria-expanded={isOpen}
        aria-label={isOpen ? copy.closeLabel : copy.openLabel}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18 backdrop-blur-sm">
          <span className="material-symbols-outlined text-[22px]">psychology_alt</span>
        </span>
        <span className="hidden pr-1 text-left sm:block">
          <span className="block text-[11px] font-semibold tracking-[0.2em] text-white/78 uppercase">
            {copy.badge}
          </span>
          <span className="block text-sm font-bold">{copy.title}</span>
        </span>
      </button>
    </div>
  );
}
