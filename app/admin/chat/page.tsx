'use client';

import { useSearchParams } from 'next/navigation';
import { SupportInboxPage } from '@/components/chat/SupportInboxPage';

export default function AdminChatPage() {
  const searchParams = useSearchParams();

  return <SupportInboxPage role="admin" initialThreadId={searchParams.get('threadId')} />;
}
