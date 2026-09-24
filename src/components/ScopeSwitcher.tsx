import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Eye, Globe2, Network, UserRound } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { users as allUsers, demoPersonas, roles, initialRoleAssignments } from "../data/mock";
import Avatar from "./Avatar";

// در بیلد محصول (VITE_DEMO=false) جابه‌جایی بین کاربران نمایش داده نمی‌شود
const IS_DEMO = import.meta.env.VITE_DEMO !== "false";
const roleOf = (uid: string) => roles.find((r) => r.id === (initialRoleAssignments[uid]?.roleId ?? "r4"));

/**
 * دامنه‌ی کاربر از روی «عضویت» او تعیین می‌شود، نه از روی انتخابش.
 * بنابراین این کنترل فقط در دو حالت تعاملی است:
 *   ۱) کاربر عضو بیش از یک شرکت است  → بین همان شرکت‌ها جابه‌جا می‌شود
 *   ۲) راهبر سیستم/هلدینگ است        → «مشاهده به‌عنوان»
 * در دمو، همین منو جابه‌جایی بین کاربران نمایشی را هم دارد؛ با تعویض کاربر
 * نقش، دسترسی‌ها، منوی کناری و دامنه‌ی دید همه از روی کاربر جدید بازسازی می‌شوند.
 * در غیر این‌صورت فقط یک برچسبِ خواندنی است که می‌گوید کجا ایستاده‌اید.
 */
export default function ScopeSwitcher() {
  const { session, activeHoldingId, activeCompanyId, setScope, activeScopeLabel, isViewingAs, actingUser, setActingUser, role } = useTenancy();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // کاربرِ تک‌عضویتی: هیچ انتخابی ندارد — فقط می‌بیند کجاست
  if (!session.canSwitch && !IS_DEMO) {
    if (session.level === "سیستم") return null;
    return (
      <span
        className="hidden sm:flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-2 text-[12.5px] font-medium text-ink-600 max-w-[210px]"
        title="دامنه‌ی شما بر اساس عضویت سازمانی‌تان تعیین شده است"
      >
        <Building2 size={14} className="shrink-0 opacity-70" />
        <span className="truncate">{activeScopeLabel}</span>
      </span>
    );
  }

  const isMultiMember = session.level === "شرکت" || session.level === "گروه";

  const pick = (holdingId?: string, companyId?: string) => {
    setScope(holdingId, companyId);
    setOpen(false);
  };

  const isActive = (holdingId?: string, companyId?: string) =>
    activeHoldingId === holdingId && activeCompanyId === companyId;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="مشاهده به‌عنوان یک کاربر یا دامنه‌ی دیگر"
        className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-2 text-[12.5px] font-medium max-w-[260px] transition-colors ${
          isViewingAs
            ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400"
            : "border-ink-200 bg-ink-50 text-ink-700 hover:border-ink-300"
        }`}
      >
        {isViewingAs ? <Eye size={14} className="shrink-0" /> : isMultiMember ? <Building2 size={14} className="shrink-0" /> : <Globe2 size={14} className="shrink-0" />}
        <span className="truncate hidden sm:inline">
          {IS_DEMO ? `${role.title} · ${activeScopeLabel}` : activeScopeLabel}
        </span>
        <ChevronDown size={13} className="shrink-0 opacity-70" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="انتخاب دامنه"
          className="absolute top-full mt-1.5 left-0 w-72 max-w-[85vw] max-h-[70vh] overflow-y-auto bg-white border border-ink-200 rounded-xl shadow-lg py-1.5 z-40"
        >
          {IS_DEMO && (
            <>
              <p className="px-3 py-1 text-[10px] font-semibold text-ink-400 flex items-center gap-1">
                <UserRound size={11} /> مشاهده به‌عنوان کاربر
              </p>
              {demoPersonas.map((p) => {
                const u = allUsers.find((x) => x.id === p.id);
                if (!u) return null;
                const active = actingUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setActingUser(u.id);
                      setOpen(false);
                    }}
                    title={p.summary}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-right hover:bg-ink-50 ${active ? "bg-brand-50/60" : ""}`}
                  >
                    <Avatar name={u.name} color={u.avatarColor} size={28} />
                    <span className="flex-1 min-w-0">
                      <span className={`block truncate text-[12.5px] ${active ? "text-brand-700 font-semibold" : "text-ink-800"}`}>{u.name}</span>
                      <span className="block truncate text-[10.5px] text-ink-400">{roleOf(u.id)?.title}</span>
                    </span>
                    {active && <Check size={14} className="shrink-0 text-brand-600" />}
                  </button>
                );
              })}
              {session.canSwitch && <div className="h-px bg-ink-100 my-1.5" />}
            </>
          )}

          {session.canSwitch && (
          <p className="px-3 py-1 text-[10px] font-semibold text-ink-400 uppercase tracking-wide">
            {isMultiMember ? "شرکت‌هایی که عضو آن‌ها هستید" : "دامنه‌ی دید"}
          </p>
          )}

          {session.canSwitch && session.switchable.map((s, i) => {
            const active = isActive(s.holdingId, s.companyId);
            const isHoldingRow = !!s.holdingId && !s.companyId;
            const isRoot = !s.holdingId && !s.companyId;
            return (
              <button
                key={`${s.holdingId ?? "-"}/${s.companyId ?? "-"}/${i}`}
                onClick={() => pick(s.holdingId, s.companyId)}
                className={`w-full flex items-center gap-2 py-2 text-[13px] text-right hover:bg-ink-50 ${
                  s.companyId && !isMultiMember ? "pr-9 pl-3 text-[12.5px]" : "px-3"
                } ${active ? "text-brand-700 font-semibold" : "text-ink-700"}`}
              >
                {isRoot ? <Globe2 size={14} className="shrink-0" /> : isHoldingRow ? <Network size={13} className="shrink-0 opacity-70" /> : <Building2 size={12} className="shrink-0 opacity-70" />}
                <span className="flex-1 truncate">{s.label}</span>
                {active && <Check size={14} className="shrink-0" />}
              </button>
            );
          })}

          {isViewingAs && (
            <div className="mt-1 border-t border-ink-100 pt-1.5 px-3 pb-1">
              <p className="text-[10.5px] text-amber-700 leading-4">
                در حالت «مشاهده به‌عنوان» هستید — فهرست‌ها فقط محتوای این دامنه را نشان می‌دهند.
              </p>
            </div>
          )}
          {isMultiMember && (
            <div className="mt-1 border-t border-ink-100 pt-1.5 px-3 pb-1">
              <p className="text-[10.5px] text-ink-400 leading-4">
                عضویت‌های شما را مدیر شرکت تعیین کرده است.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
