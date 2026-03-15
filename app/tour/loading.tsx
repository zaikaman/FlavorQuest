import { TourPageSkeleton } from '@/components/ui/Loading';

export default function TourLoading() {
  return (
    <div className="min-h-screen bg-background-dark pt-16 pb-16">
      <TourPageSkeleton />
    </div>
  );
}
