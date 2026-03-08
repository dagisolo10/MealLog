import { Users } from "lucide-react";

export default function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 opacity-50">
            <Users className="mb-2 size-12" />
            <p className="font-medium">No customers added yet</p>
        </div>
    );
}
