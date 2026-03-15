import { DashboardSkeleton } from '@/components/ui/Loading';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background-dark px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <DashboardSkeleton stats={4} />
      </div>
    </div>
  );
}
