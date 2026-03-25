import { POIForm } from '@/components/admin/POIForm';

export default function NewPOIPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tạo POI mới</h1>
        <p className="text-gray-400">Thêm một điểm tham quan mới vào FlavorQuest</p>
      </div>

      <POIForm isNew={true} />
    </div>
  );
}
