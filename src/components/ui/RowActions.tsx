import { Pencil, Trash2 } from "lucide-react";

// دکمه‌های استاندارد ویرایش/حذف برای ردیف‌های فهرست‌ها
export default function RowActions({
  onEdit,
  onDelete,
  size = 14,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  size?: number;
}) {
  return (
    <span className="flex items-center gap-0.5 shrink-0">
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 rounded-md text-ink-400 hover:text-brand-600 hover:bg-brand-50"
          title="ویرایش"
        >
          <Pencil size={size} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50"
          title="حذف"
        >
          <Trash2 size={size} />
        </button>
      )}
    </span>
  );
}
