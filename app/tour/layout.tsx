/**
 * Tour Layout
 * Access control wrapper for Tour functionality
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';

export default function TourLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslations();
  const router = useRouter();
  const { user, isLoading, isRoleReady, isAdmin, isOwner, isPendingOwner } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login?type=customer');
      return;
    }

    if (!isRoleReady) {
      return;
    }

    if (isOwner) {
      router.replace('/owner');
      return;
    }

    if (isAdmin) {
      router.replace('/admin');
      return;
    }

    if (isPendingOwner) {
      router.replace('/pending-owner');
      return;
    }
  }, [isAdmin, isLoading, isOwner, isPendingOwner, isRoleReady, router, user]);

  if (isLoading || !user || isOwner || isAdmin || isPendingOwner) {
    return (
      <div className="bg-background-dark flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-primary animate-spin text-5xl">sync</span>
          <p className="text-lg text-white">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
