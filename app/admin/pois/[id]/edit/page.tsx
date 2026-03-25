import { createServerClient } from '@/lib/supabase/server';
import { POIForm } from '@/components/admin/POIForm';
import { notFound } from 'next/navigation';

export default async function EditPOIPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: poi } = await supabase.from('pois').select('*').eq('id', id).single();

  if (!poi) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Chỉnh sửa POI</h1>
        <p className="text-gray-400">Cập nhật thông tin cho {poi.name_vi}</p>
      </div>

      <POIForm initialData={poi} poiId={id} />
    </div>
  );
}
