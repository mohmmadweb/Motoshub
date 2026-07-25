import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Hash, User, Compass } from "lucide-react";
import { channels, users } from "../data/mock";
import { navSections } from "./Sidebar";

type Item = { id: string; label: string; hint: string; icon: typeof Hash; to: string };

// همه‌ی صفحات سایدبار به‌صورت خودکار در پالت هستند — صفحه‌ی جدید = خودکار قابل جستجو
const pages: Item[] = navSections.flatMap((s) =>
  s.items.map((i) => ({ id: i.to, label: i.label, hint: "صفحه", icon: Compass, to: i.to }))
);

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const items: Item[] = useMemo(() => {
    const channelItems: Item[] = channels.map((c) => ({ id: c.id, label: `${c.name}`, hint: "کانال", icon: Hash, to: "/dashboard/chat" }));
    const userItems: Item[] = users.map((u) => ({ id: u.id, label: u.name, hint: "کاربر", icon: User, to: `/dashboard/profile/${u.id}` }));
    const all = [...pages, ...channelItems, ...userItems];
    if (!q) return all.slice(0, 8);
    return all.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-28" dir="rtl">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl border border-ink-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100">
          <Search size={16} className="text-ink-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="رفتن به صفحه، کانال یا فرد…"
            className="flex-1 outline-none text-sm"
          />
          <kbd className="text-[10px] bg-ink-100 border border-ink-200 rounded px-1.5 py-0.5 text-ink-400">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {items.length === 0 ? (
            <p className="text-xs text-ink-400 text-center py-6">موردی پیدا نشد</p>
          ) : (
            items.map((item) => (
              <button
                key={`${item.hint}-${item.id}`}
                onClick={() => {
                  navigate(item.to);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink-50 text-right"
              >
                <span className="w-7 h-7 rounded-md bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                  <item.icon size={14} />
                </span>
                <span className="flex-1 text-sm text-ink-800">{item.label}</span>
                <span className="text-[11px] text-ink-400">{item.hint}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
