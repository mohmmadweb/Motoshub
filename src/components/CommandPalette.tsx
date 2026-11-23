import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Hash, User, Compass, Building2 } from "lucide-react";
import { channels, users } from "../data/mock";
import { filterNavSections, flattenNav } from "./Sidebar";
import { useI18n } from "../i18n";
import { useTenancy } from "../context/TenancyContext";
import { useOverlayA11y } from "./ui/Modal";
import Kbd from "./ui/Kbd";

type Item = { id: string; label: string; hint: string; icon: typeof Hash; to: string };

/** رفتن سریع (Ctrl K): صفحه‌های مجاز منو، کانال‌ها، افراد، صفحه‌ی واحدها؛ اولین گزینه جستجوی سراسری */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { iam, scopeTypeLabel, canAccessAdmin, hasPermission } = useTenancy();
  const ref = useRef<HTMLDivElement>(null);
  useOverlayA11y(ref, open, onClose);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const items: Item[] = useMemo(() => {
    const channelItems: Item[] = channels.map((c) => ({ id: c.id, label: `${c.name}`, hint: "کانال", icon: Hash, to: `/channels/${c.id}` }));
    const userItems: Item[] = users.map((u) => ({ id: u.id, label: u.name, hint: "کاربر", icon: User, to: `/profile/${u.id}` }));
    // همه‌ی صفحه‌های مجاز منو (با برچسب زبان انتخابی) — صفحه‌ی جدید منو خودکار قابل جستجوست
    const pages: Item[] = flattenNav(filterNavSections({ canAccessAdmin, hasPermission })).map(({ leaf, section, group }) => ({
      id: leaf.id,
      label: t(leaf.label),
      hint: [t(section.title), group ? t(group.label) : ""].filter(Boolean).join(" · "),
      icon: leaf.icon ?? group?.icon ?? Compass,
      to: leaf.to,
    }));
    // پروفایل سازمانی هر هلدینگ/شرکت/واحد (F18)
    const orgItems: Item[] = iam.scopes.filter((n) => n.active).map((n) => ({ id: n.id, label: n.name, hint: `صفحه‌ی ${scopeTypeLabel[n.type]}`, icon: Building2, to: `/org/${n.id}` }));
    const all = [...pages, ...channelItems, ...userItems, ...orgItems];
    if (!q) return all.slice(0, 8);
    const searchAll: Item = { id: "search-all", label: `جستجوی «${q}» در کل سامانه`, hint: "جستجوی سراسری", icon: Search, to: `/globalsearch?q=${encodeURIComponent(q)}` };
    return [searchAll, ...all.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 7)];
  }, [q, t, iam.scopes, scopeTypeLabel, canAccessAdmin, hasPermission]);

  if (!open) return null;
  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" dir="rtl">
      <div className="absolute inset-0 bg-[var(--color-overlay)] animate-fadein" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="رفتن سریع" tabIndex={-1} className="relative w-full max-w-xl bg-card rounded-2xl shadow-lg border border-border overflow-hidden outline-none animate-fadein">
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
          <Search size={20} className="text-ink-500 shrink-0" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && items[0]) go(items[0].to);
            }}
            aria-label="رفتن به صفحه، کانال یا فرد"
            placeholder="رفتن به صفحه، کانال، فرد — یا جستجو در کل سامانه…"
            className="flex-1 bg-transparent outline-none text-[15px] text-ink-900 placeholder:text-ink-500"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="text-[13px] text-ink-500 text-center py-6">موردی پیدا نشد</p>
          ) : (
            items.map((item) => (
              <button key={`${item.hint}-${item.id}`} onClick={() => go(item.to)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ink-50 focus-visible:bg-ink-50 outline-none text-start">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <item.icon size={16} aria-hidden />
                </span>
                <span className="flex-1 min-w-0 truncate text-[14px] text-ink-800">{item.label}</span>
                <span className="text-[12px] text-ink-500 truncate max-w-[45%]">{item.hint}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
