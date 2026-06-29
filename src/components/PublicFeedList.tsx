import { Link } from "react-router-dom";
import { Globe2 } from "lucide-react";
import type { PublicFeedItem } from "../context/ContentContext";
import Badge, { type BadgeTone } from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

const moduleTone: Record<PublicFeedItem["module"], BadgeTone> = {
  انجمن: "brand",
  بلاگ: "success",
  رویداد: "warning",
  رسانه: "navy",
  دانش: "neutral",
};

export default function PublicFeedList({ items, resolveLink }: { items: PublicFeedItem[]; resolveLink?: (item: PublicFeedItem) => string }) {
  if (items.length === 0) {
    return <EmptyState icon={<Globe2 size={18} />} title="هنوز محتوای عمومی‌ای ثبت نشده" />;
  }

  return (
    <div className="card divide-y divide-ink-100">
      {items.map((item) => (
        <Link key={item.id} to={resolveLink ? resolveLink(item) : item.to} className="p-4 flex items-center gap-3 hover:bg-ink-50/60">
          <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
            <item.icon size={15} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{item.title}</p>
            <p className="text-xs text-ink-400 mt-0.5">{item.meta}</p>
          </div>
          <Badge tone={moduleTone[item.module]}>{item.module}</Badge>
        </Link>
      ))}
    </div>
  );
}
