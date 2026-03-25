import { TourPageSkeleton } from '@/components/ui/Loading';

export default function TourLoading() {
  return (
    <div className="bg-background-dark min-h-screen pt-16 pb-16">
      <TourPageSkeleton />
    </div>
  );
}
