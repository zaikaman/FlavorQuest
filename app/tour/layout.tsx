/**
 * Tour Layout
 * Access control wrapper for Tour functionality
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';

export default function TourLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslations();
  const router = useRouter();
  const { user, isLoading, isRoleReady, isOwner, hasCustomerAccess } = useAuth();

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

    if (!hasCustomerAccess) {
      router.replace('/paywall');
      return;
    }
  }, [isLoading, user, isRoleReady, isOwner, hasCustomerAccess, router]);

  if (isLoading || !user || !isRoleReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-primary text-5xl animate-spin">sync</span>
          <p className="text-white text-lg">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}
