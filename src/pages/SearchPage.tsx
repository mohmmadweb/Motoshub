import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Search, FileText, Users, KanbanSquare, MessageSquare, UserCircle, SlidersHorizontal } from "lucide-react";
import { searchResults, type SearchResult } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";

const typeIcon: Record<SearchResult["type"], ComponentType<{ size?: number }>> = {
  سند: FileText,
  گروه: Users,
  پروژه: KanbanSquare,
  پست: MessageSquare,
  کاربر: UserCircle,
};

const types: SearchResult["type"][] = ["پست", "گروه", "سند", "پروژه", "کاربر"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [activeType, setActiveType] = useState<SearchResult["type"] | "همه">("همه");

  const filtered = useMemo(() => {
    return searchResults.filter((r) => {
      const matchesType = activeType === "همه" || r.type === activeType;
      const matchesQ = !q || r.title.toLowerCase().includes(q.toLowerCase());
      return matchesType && matchesQ;
    });
  }, [q, activeType]);

  return (
    <div>
      <PageHeader title="جستجوی پیشرفته" description="جستجو در محتوای شبکه اجتماعی با امکان فیلتر بر اساس نوع محتوا" icon={<Search size={18} />} />

      <div className="card p-3 flex items-center gap-2 mb-4">
        <Search size={16} className="text-ink-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="عبارت جستجو را وارد کنید…"
          className="flex-1 outline-none text-sm"
        />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-ink-400">
          <SlidersHorizontal size={13} /> فیلتر نوع محتوا:
        </span>
        {(["همه", ...types] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              activeType === t ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ink-100">
        {filtered.map((r) => {
          const Icon = typeIcon[r.type];
          return (
            <div key={r.id} className="p-4 flex items-center gap-3 hover:bg-ink-50/60">
              <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900 truncate">{r.title}</p>
                <p className="text-xs text-ink-400 truncate">{r.snippet}</p>
              </div>
              <Badge tone="neutral">{r.type}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
