import { POIForm } from '@/components/admin/POIForm';

export default function NewPOIPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Create New POI</h1>
                <p className="text-gray-400">Add a new point of interest to FlavorQuest</p>
            </div>

            <POIForm isNew={true} />
        </div>
    );
}
