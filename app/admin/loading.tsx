import { DashboardSkeleton } from '@/components/ui/Loading';

export default function AdminLoading() {
  return (
    <div className="bg-background-dark min-h-screen px-4 py-8 text-white">
      <DashboardSkeleton stats={6} />
    </div>
  );
}
