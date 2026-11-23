import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Globe2, Network, Layers, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTenancy } from "../context/TenancyContext";
import { users as allUsers, demoPersonas } from "../data/mock";
import Avatar from "./Avatar";
import type { ScopeType } from "../iam/model";

// در بیلد محصول (VITE_DEMO=false) جابه‌جایی بین کاربران نمایش داده نمی‌شود
const IS_DEMO = import.meta.env.VITE_DEMO !== "false";
const typeIcon: Record<ScopeType, typeof Globe2> = { system: Globe2, holding: Network, company: Building2, unit: Layers };

/**
 * «تغییر سازمان یا نقش»: کاربر در یکی از واحدهای دسترس‌پذیرش «می‌ایستد»
 * (واحدهای عضویت/تخصیص و زیرمجموعه‌هایشان). دسترسی مؤثر و دامنه‌ی دید از همین واحد
 * محاسبه می‌شود. در دمو، تعویض کاربر هم از همین‌جاست.
 */
export default function ScopeSwitcher() {
  const t = useTenancy();
  const { reachable, contextId, contextNode, setContext, myBindings, iam, scopeLabel } = t;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // مرتب‌سازی درختی واحدهای دسترس‌پذیر
  const ids = new Set(reachable.map((r) => r.id));
  const ordered: { id: string; depth: number }[] = [];
  const walk = (pid: string | null, d: number) =>
    iam.scopes
      .filter((s) => s.parentId === pid && ids.has(s.id))
      .forEach((s) => {
        ordered.push({ id: s.id, depth: d });
        walk(s.id, d + 1);
      });
  // ریشه‌ها: واحدهایی که والدشان در دسترس نیست
  reachable.filter((r) => !r.parentId || !ids.has(r.parentId)).forEach((r) => {
    ordered.push({ id: r.id, depth: 0 });
    walk(r.id, 1);
  });

  const Icon = typeIcon[contextNode.type];
  const roleNames = [...new Set(myBindings.map((b) => b.role.name))];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="تغییر سازمان یا نقش"
        className="flex items-center gap-1.5 h-10 rounded-[10px] border px-2.5 text-[13px] font-medium max-w-[280px] transition-colors border-ink-200 bg-card text-ink-700 hover:border-ink-300 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <Icon size={14} className="shrink-0" />
        <span className="truncate hidden sm:inline">
          {roleNames[0] ?? "بدون نقش"}
          {roleNames.length > 1 ? ` +${(roleNames.length - 1).toLocaleString("fa-IR")}` : ""} · {contextNode.type === "system" ? "کل سامانه" : contextNode.name}
        </span>
        <ChevronDown size={13} className="shrink-0 opacity-70" />
      </button>

      {open && (
        <div role="listbox" aria-label="تغییر سازمان یا نقش" className="absolute top-full mt-1.5 end-0 w-80 max-w-[90vw] max-h-[75vh] overflow-y-auto bg-card border border-border rounded-xl shadow-lg py-1.5 z-40 animate-fadein">
          <p className="px-3 py-1 text-[10px] font-semibold text-ink-400">سازمانی که در آن کار می‌کنید</p>
          {ordered.map(({ id, depth }) => {
            const n = iam.scopes.find((s) => s.id === id)!;
            const I = typeIcon[n.type];
            const active = id === contextId;
            return (
              <button
                key={id}
                onClick={() => {
                  setContext(id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 py-1.5 pl-3 text-right hover:bg-ink-50 ${active ? "text-teal-700 font-semibold bg-teal-50" : "text-ink-700"}`}
                style={{ paddingRight: 12 + depth * 14 }}
              >
                <I size={13} className="shrink-0 opacity-70" />
                <span className="flex-1 truncate text-[12.5px]">{n.type === "system" ? "کل سامانه" : n.name}</span>
                <span className="text-[10px] text-ink-400">{t.scopeTypeLabel[n.type]}</span>
                {active && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}

          <div className="mt-1 border-t border-ink-100 pt-2 px-3 pb-1">
            <p className="text-[10px] font-semibold text-ink-400 mb-1 flex items-center gap-1">
              <ShieldCheck size={11} /> نقش‌های فعال شما در این دامنه
            </p>
            <div className="flex flex-wrap gap-1">
              {myBindings.map((b) => (
                <span key={b.id} className="text-[10.5px] bg-teal-50 text-teal-700 rounded-full px-2 py-0.5" title={`تخصیص در «${scopeLabel(b.scopeId)}»`}>
                  {b.role.name}
                  {b.scopeId !== contextId ? ` ← ${scopeLabel(b.scopeId)}` : ""}
                </span>
              ))}
              {myBindings.length === 0 && <span className="text-[11px] text-ink-400">نقشی ندارید — فقط مشاهده.</span>}
            </div>
            <Link to="/my-access" onClick={() => setOpen(false)} className="block text-[11px] text-link hover:underline mt-1.5">
              جزئیات نقش و دسترسی من ←
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * «مشاهده به‌عنوان» (دمو): جابه‌جایی بین پرسوناهای نمایشی — در منوی آواتار نوار بالا.
 * در بیلد محصول (VITE_DEMO=false) چیزی رندر نمی‌شود.
 */
export function DemoPersonaList({ onPick }: { onPick?: () => void }) {
  const { actingUser, setActingUser, primaryRoleOf } = useTenancy();
  if (!IS_DEMO) return null;
  return (
    <div role="group" aria-label="مشاهده به‌عنوان">
      {demoPersonas.map((p) => {
        const u = allUsers.find((x) => x.id === p.id);
        if (!u) return null;
        const active = actingUser.id === u.id;
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => {
              setActingUser(u.id);
              onPick?.();
            }}
            title={p.summary}
            aria-pressed={active}
            className={`w-full flex items-center gap-2.5 px-3.5 py-1.5 text-start hover:bg-ink-50 ${active ? "bg-teal-50" : ""}`}
          >
            <Avatar name={u.name} color={u.avatarColor} size={26} />
            <span className="flex-1 min-w-0">
              <span className={`block truncate text-[13px] ${active ? "text-teal-700 font-bold" : "text-ink-800"}`}>{u.name}</span>
              <span className="block truncate text-[11.5px] text-ink-500">{primaryRoleOf(u.id)?.name ?? "کاربر عادی"}</span>
            </span>
            {active && <Check size={14} className="shrink-0 text-teal-700" />}
          </button>
        );
      })}
    </div>
  );
}
