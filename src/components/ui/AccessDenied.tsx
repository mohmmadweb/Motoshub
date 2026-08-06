import { ShieldAlert } from "lucide-react";
import { useTenancy } from "../../context/TenancyContext";

/**
 * صفحه‌ی «دسترسی ندارید» — وقتی نقشِ کاربرِ واردشده مجوزِ دیدنِ این ماژول را ندارد.
 * برای دفاعِ لایه‌ای: حتی اگر آیتم منو پنهان باشد، ورود مستقیم با URL هم مسدود می‌شود.
 */
export default function AccessDenied({ module }: { module: string }) {
  const { role } = useTenancy();
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <span className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
        <ShieldAlert size={24} />
      </span>
      <h1 className="text-lg font-bold text-ink-900 mb-2">به «{module}» دسترسی ندارید</h1>
      <p className="text-sm text-ink-500 max-w-md leading-7">
        نقشِ فعلی شما «{role.title}» است و این ماژول در فهرست دسترسی‌های آن نیست. برای مشاهده‌ی
        کاملِ دسترسی‌های خود به صفحه‌ی «نقش و دسترسی من» بروید، یا از مدیر مجموعه درخواست دسترسی کنید.
      </p>
    </div>
  );
}
