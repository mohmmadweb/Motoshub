// نشان ستاره‌ی «برجسته» (F09) — روی کارت عضو، پروفایل و پیشنهادهای ارتباط
import { Star } from "lucide-react";
import { useFollows } from "./store";

export function FeaturedBadge({ userId, withLabel = true, className = "" }: { userId: string; withLabel?: boolean; className?: string }) {
  const f = useFollows();
  const item = f.state.featured.find((x) => x.user_id === userId);
  if (!item) return null;
  return (
    <span title={item.note ? `کاربر برجسته — ${item.note}` : "کاربر برجسته"} className={`inline-flex items-center gap-0.5 text-[10.5px] font-medium rounded-full px-1.5 py-px bg-amber-50 text-amber-700 border border-amber-200 shrink-0 ${className}`}>
      <Star size={10} className="fill-current" />
      {withLabel && "برجسته"}
    </span>
  );
}

export default FeaturedBadge;
