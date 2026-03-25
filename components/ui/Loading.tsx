'use client';

import { Spinner, type SpinnerProps } from '@/components/ui/Spinner';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`loading-shimmer rounded-2xl bg-white/8 ${className}`} />
  );
}

export function InlineSpinner({
  label,
  size = 'xs',
  color = 'white',
  className = '',
}: {
  label?: string;
  size?: SpinnerProps['size'];
  color?: SpinnerProps['color'];
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-live="polite">
      <Spinner size={size} color={color} />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function CardSkeleton({
  lines = 3,
  showMedia = true,
  className = '',
}: {
  lines?: number;
  showMedia?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-white/10 bg-[#2a1e16] ${className}`}
    >
      {showMedia ? <Skeleton className="aspect-[16/9] w-full rounded-none" /> : null}
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={`h-3 ${index === lines - 1 ? 'w-1/2' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

export function FeedSkeleton({
  items = 4,
  className = '',
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-[#2a1e16] p-4"
        >
          <Skeleton className="h-16 w-16 shrink-0 rounded-[20px]" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  columns = 5,
  rows = 6,
  className = '',
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-white/10 bg-[#2a1e16] ${className}`}
    >
      <div className="border-b border-white/10 px-4 py-4">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-3/4 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 rounded-2xl bg-black/15 px-3 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={`h-4 ${columnIndex === 0 ? 'w-5/6' : 'w-2/3'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton({
  stats = 4,
  className = '',
}: {
  stats?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: stats }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-white/10 bg-[#2a1e16] p-5">
            <Skeleton className="h-3 w-1/3 rounded-full" />
            <Skeleton className="mt-4 h-8 w-1/2" />
            <Skeleton className="mt-4 h-3 w-4/5 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#2a1e16] p-6">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="mt-4 h-10 w-3/4" />
          <Skeleton className="mt-4 h-4 w-full rounded-full" />
          <Skeleton className="mt-2 h-4 w-11/12 rounded-full" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-black/15 p-4">
                <Skeleton className="h-3 w-1/2 rounded-full" />
                <Skeleton className="mt-4 h-7 w-2/3" />
                <Skeleton className="mt-3 h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#2a1e16] p-6">
          <Skeleton className="h-5 w-1/3" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-black/15 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-3 h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TourPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-2 pb-3">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-3 w-64 rounded-full" />
          <div className="mt-4 flex gap-3 overflow-hidden">
            <CardSkeleton className="min-w-[220px] flex-1" lines={2} />
            <CardSkeleton className="min-w-[220px] flex-1" lines={2} />
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 pb-20">
        <CardSkeleton className="h-full" lines={4} />
      </div>
    </div>
  );
}

export function POIDetailSkeleton() {
  return (
    <div className="bg-background-dark min-h-screen text-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="relative z-10 -mt-16 space-y-4 px-4">
        <div className="rounded-3xl border border-white/10 bg-[#2a1e16] p-5">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="mt-4 h-8 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3 rounded-full" />
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#2a1e16] p-5">
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#2a1e16] p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-3 w-full rounded-full" />
          <Skeleton className="mt-2 h-3 w-11/12 rounded-full" />
          <Skeleton className="mt-2 h-3 w-4/5 rounded-full" />
        </div>
        <FeedSkeleton items={3} />
      </div>
    </div>
  );
}
