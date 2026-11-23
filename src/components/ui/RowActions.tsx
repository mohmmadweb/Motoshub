import { Pencil, Trash2 } from "lucide-react";

// دکمه‌های استاندارد ویرایش/حذف برای ردیف‌های فهرست‌ها
export default function RowActions({
  onEdit,
  onDelete,
  size = 16,
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
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
          aria-label="ویرایش"
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
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          aria-label="حذف"
          title="حذف"
        >
          <Trash2 size={size} />
        </button>
      )}
    </span>
  );
}
