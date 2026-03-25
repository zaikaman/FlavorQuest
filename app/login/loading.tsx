import { Skeleton } from '@/components/ui/Loading';

export default function LoginLoading() {
  return (
    <div className="bg-background-dark min-h-screen px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          <Skeleton className="mx-auto mt-6 h-8 w-2/3" />
          <Skeleton className="mx-auto mt-3 h-4 w-4/5 rounded-full" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="mt-6 h-11 w-full rounded-xl" />
          <Skeleton className="mt-3 h-11 w-full rounded-xl" />
          <Skeleton className="mt-6 h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
