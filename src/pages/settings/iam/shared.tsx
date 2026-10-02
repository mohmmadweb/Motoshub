// ابزارهای مشترکِ بخش‌های «هویت و دسترسی» در تنظیمات سامانه.
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { Boxes, Building, Building2, Check as CheckIcon, Landmark, Search, Lock, ShieldAlert, type LucideIcon } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge, { type BadgeTone } from "../../../components/ui/Badge";
import Avatar from "../../../components/Avatar";
import { useToast } from "../../../components/ui/ToastProvider";
import { users, permissionCatalog, type UserProfile } from "../../../data/mock";
import { useTenancy, type Check } from "../../../context/TenancyContext";
import { ancestorsOrSelf, depth, descendantsOrSelf, type Binding, type IamState, type ScopeNode, type ScopeType } from "../../../iam/model";
import { diffDays } from "../../../pm/jalali";

export const fmtN = (n: number) => n.toLocaleString("fa-IR");
export const TYPE_ORDER: ScopeType[] = ["system", "holding", "company", "unit"];

// ------------------------------------------------------------------ کاربران
export const userOf = (id?: string): UserProfile | undefined => users.find((u) => u.id === id);
export const userName = (id?: string) => userOf(id)?.name ?? "—";

export function UserCell({ userId, sub, size = 30 }: { userId: string; sub?: ReactNode; size?: number }) {
  const u = userOf(userId);
  return (
    <span className="flex items-center gap-2 min-w-0">
      <Avatar name={u?.name ?? "?"} color={u?.avatarColor} size={size} />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink-900 truncate">{u?.name ?? userId}</span>
        {sub !== undefined ? <span className="block text-[11px] text-ink-400 truncate">{sub}</span> : u?.role && <span className="block text-[11px] text-ink-400 truncate">{u.role}</span>}
      </span>
    </span>
  );
}

// ------------------------------------------------------------------ واحدها
export const typeTone: Record<ScopeType, BadgeTone> = { system: "navy", holding: "brand", company: "success", unit: "neutral" };
export const typeIcon: Record<ScopeType, LucideIcon> = { system: Landmark, holding: Building, company: Building2, unit: Boxes };
export const typeColor: Record<ScopeType, string> = { system: "text-navy-600", holding: "text-brand-600", company: "text-emerald-600", unit: "text-ink-500" };

export function TypeBadge({ type }: { type: ScopeType }) {
  const { scopeTypeLabel } = useTenancy();
  return <Badge tone={typeTone[type]}>{scopeTypeLabel[type]}</Badge>;
}

export function ScopeIcon({ type, size = 14, className = "" }: { type: ScopeType; size?: number; className?: string }) {
  const I = typeIcon[type];
  return <I size={size} className={`${typeColor[type]} shrink-0 ${className}`} />;
}

/** نام واحد + آیکن نوع؛ مسیر کامل در tooltip */
export function ScopeName({ id, showPath = false }: { id: string; showPath?: boolean }) {
  const { iam, scopePath } = useTenancy();
  const n = iam.scopes.find((s) => s.id === id);
  if (!n) return <span className="text-ink-400">—</span>;
  return (
    <span className="flex items-center gap-1.5 min-w-0" title={scopePath(id)}>
      <ScopeIcon type={n.type} size={13} />
      <span className="min-w-0">
        <span className={`block truncate text-[12.5px] ${n.active ? "text-ink-800" : "text-ink-400 line-through"}`}>{n.name}</span>
        {showPath && n.parentId && <span className="block truncate text-[10.5px] text-ink-400">{ancestorsOrSelfNames(id)}</span>}
      </span>
    </span>
  );
  function ancestorsOrSelfNames(sid: string) {
    return ancestorsOrSelf(iam, sid)
      .slice(1)
      .reverse()
      .map((x) => x.name)
      .join(" › ");
  }
}

/** مسیر سلسله‌مراتبی (breadcrumb) یک واحد */
export function ScopeCrumb({ id, onPick }: { id: string; onPick?: (id: string) => void }) {
  const { iam } = useTenancy();
  const chain = ancestorsOrSelf(iam, id).reverse();
  return (
    <div className="flex items-center flex-wrap gap-1 text-[11.5px]">
      {chain.map((n, i) => (
        <span key={n.id} className="flex items-center gap-1 min-w-0">
          {i > 0 && <span className="text-ink-300">›</span>}
          <button
            type="button"
            onClick={() => onPick?.(n.id)}
            disabled={!onPick}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${i === chain.length - 1 ? "bg-brand-50 text-brand-700 font-semibold" : "text-ink-500 hover:bg-ink-100"} disabled:hover:bg-transparent`}
          >
            <ScopeIcon type={n.type} size={11} />
            <span className="truncate max-w-[10rem]">{n.name}</span>
          </button>
        </span>
      ))}
    </div>
  );
}

/** زیردرختِ کانتکستِ فعلی (لایه‌ی پیازی که کاربر در آن ایستاده) */
export function useSubtree() {
  const { iam, contextId, contextNode } = useTenancy();
  return useMemo(() => {
    const nodes = descendantsOrSelf(iam, contextId);
    const ancestors = ancestorsOrSelf(iam, contextId).slice(1).reverse();
    return { root: contextNode, nodes, ids: new Set(nodes.map((n) => n.id)), ancestors, chainIds: new Set(ancestorsOrSelf(iam, contextId).map((n) => n.id)) };
  }, [iam, contextId, contextNode]);
}

/** گزینه‌های یک انتخابگر درختی (پیش‌ترتیب + تورفتگی) */
export function treeOptions(iam: IamState, nodes: ScopeNode[]) {
  const base = nodes.length ? Math.min(...nodes.map((n) => depth(iam, n.id))) : 0;
  return nodes.map((n) => ({ node: n, level: depth(iam, n.id) - base }));
}

export function ScopeSelect({
  value,
  onChange,
  nodes,
  allLabel,
  disabledIds,
  className = "",
  ariaLabel = "انتخاب واحد",
}: {
  value: string;
  onChange: (id: string) => void;
  nodes: ScopeNode[];
  allLabel?: string;
  disabledIds?: Set<string>;
  className?: string;
  ariaLabel?: string;
}) {
  const { iam, scopeTypeLabel } = useTenancy();
  const opts = treeOptions(iam, nodes);
  return (
    <select className={`input-field ${className}`} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
      {allLabel !== undefined && <option value="">{allLabel}</option>}
      {opts.map(({ node, level }) => (
        <option key={node.id} value={node.id} disabled={disabledIds?.has(node.id)}>
          {"  ".repeat(level)}
          {level > 0 ? "└ " : ""}
          {node.name} ({scopeTypeLabel[node.type]}){node.active ? "" : " — غیرفعال"}
        </option>
      ))}
    </select>
  );
}

// ------------------------------------------------------------------ تخصیص‌ها
export type BStatus = "live" | "future" | "expired" | "revoked";
export function bindingStatus(b: Binding, today: string): BStatus {
  if (!b.active) return "revoked";
  if (b.validFrom && b.validFrom > today) return "future";
  if (b.validUntil && b.validUntil < today) return "expired";
  return "live";
}
export const bStatusLabel: Record<BStatus, string> = { live: "فعال", future: "آینده", expired: "منقضی", revoked: "لغوشده" };
const bStatusTone: Record<BStatus, BadgeTone> = { live: "success", future: "brand", expired: "warning", revoked: "neutral" };
export function BindingStatusBadge({ status }: { status: BStatus }) {
  return <Badge tone={bStatusTone[status]}>{bStatusLabel[status]}</Badge>;
}
/** چند روز تا پایان اعتبار (منفی = گذشته) */
export const daysLeft = (b: Binding, today: string) => (b.validUntil ? diffDays(today, b.validUntil) : null);

export function ValidityText({ b }: { b: Binding }) {
  if (!b.validFrom && !b.validUntil) return <span className="text-[11.5px] text-ink-400">بدون محدودیت زمانی</span>;
  return (
    <span className="text-[11.5px] text-ink-600">
      {b.validFrom ? `از ${b.validFrom}` : "از ابتدا"} {b.validUntil ? `تا ${b.validUntil}` : "تا اطلاع ثانوی"}
    </span>
  );
}

/** آخرین فعالیتِ نمایشی (قطعی بر اساس شناسه‌ها — داده‌ی نمونه) */
export function lastActivityDays(userId: string, key = "") {
  let h = 7;
  for (const ch of userId + key) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h % 120;
}
export const daysAgoLabel = (d: number) => (d === 0 ? "امروز" : d === 1 ? "دیروز" : `${fmtN(d)} روز پیش`);

// ------------------------------------------------------------------ مجوزها
export const permMeta = new Map<string, { label: string; groupId: string; groupLabel: string }>(
  permissionCatalog.flatMap((g) => g.actions.map((a) => [a.id, { label: a.label, groupId: g.id, groupLabel: g.label }] as const))
);
export const permLabel = (id: string) => permMeta.get(id)?.label ?? id;
export const TOTAL_PERMS = permMeta.size;

export function PermId({ id }: { id: string }) {
  return (
    <span dir="ltr" className="font-mono text-[10px] text-ink-400 break-all">
      {id}
    </span>
  );
}

// ------------------------------------------------------------------ اکشن‌ها
/** اجرای یک اکشنِ IAM و نمایش نتیجه (دلیلِ رد شدن همیشه نشان داده می‌شود) */
export function useRun() {
  const { notify } = useToast();
  return (c: Check, success?: string) => {
    if (!c.ok) {
      notify(c.reason, "warning");
      return false;
    }
    if (success) notify(success, "success");
    return true;
  };
}

/** دکمه‌ای که با نتیجه‌ی یک Check غیرفعال می‌شود و دلیل را در tooltip نشان می‌دهد */
export function GuardButton({ check, title, className = "", ...rest }: ComponentProps<typeof Button> & { check: Check }) {
  return <Button {...rest} disabled={!check.ok || rest.disabled} title={check.ok ? title : check.reason} className={`disabled:opacity-45 disabled:cursor-not-allowed ${className}`} />;
}

/** دکمه‌ی آیکنیِ کوچک برای ردیف‌ها */
export function IconAction({ check, icon, label, onClick, tone = "neutral" }: { check: Check; icon: ReactNode; label: string; onClick: () => void; tone?: "neutral" | "danger" | "success" }) {
  const hover = tone === "danger" ? "hover:bg-rose-50 hover:text-rose-600" : tone === "success" ? "hover:bg-emerald-50 hover:text-emerald-700" : "hover:bg-ink-100 hover:text-ink-800";
  return (
    <button
      type="button"
      aria-label={label}
      title={check.ok ? label : `${label} — ${check.reason}`}
      disabled={!check.ok}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-ink-500 ${hover} disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-500 shrink-0`}
    >
      {icon}
    </button>
  );
}

/** نتیجه‌ی زنده‌ی یک بررسی قبل از ثبت */
export function CheckLine({ check, okText }: { check: Check; okText: string }) {
  return check.ok ? (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
      <CheckIcon size={14} className="shrink-0 mt-0.5" /> <span className="leading-5">{okText}</span>
    </div>
  ) : (
    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-600">
      <ShieldAlert size={14} className="shrink-0 mt-0.5" /> <span className="leading-5">{check.reason}</span>
    </div>
  );
}

// ------------------------------------------------------------------ چیدمان
export function SectionHead({ icon, title, description, actions }: { icon?: ReactNode; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
          {description && <p className="text-[12px] text-ink-500 mt-0.5 leading-5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Callout({ icon, children, tone = "brand" }: { icon?: ReactNode; children: ReactNode; tone?: "brand" | "warning" | "neutral" }) {
  const cls = tone === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" : tone === "neutral" ? "bg-ink-50 border-ink-200 text-ink-600" : "bg-brand-50 border-brand-200 text-brand-800";
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-6 ${cls}`}>
      {icon && <span className="shrink-0 mt-1">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "جستجو…", className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
      <input className="input-field pr-8" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-ink-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-400 mt-1 leading-5">{hint}</span>}
    </label>
  );
}

export function LockNote({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-400" title={reason}>
      <Lock size={11} /> {reason}
    </span>
  );
}

/** انتخابگر کاربر با جستجو (تک یا چندتایی) */
export function UserPicker({ value, onChange, multiple = false, candidates }: { value: string[]; onChange: (ids: string[]) => void; multiple?: boolean; candidates?: string[] }) {
  const [q, setQ] = useState("");
  const list = users.filter((u) => (!candidates || candidates.includes(u.id)) && (!q.trim() || u.name.includes(q.trim()) || u.role.includes(q.trim())));
  const toggle = (id: string) => onChange(multiple ? (value.includes(id) ? value.filter((x) => x !== id) : [...value, id]) : [id]);
  return (
    <div className="rounded-lg border border-ink-200 overflow-hidden">
      <div className="p-2 border-b border-ink-100 bg-ink-50">
        <SearchBox value={q} onChange={setQ} placeholder="جستجوی نام یا سمت…" />
      </div>
      <ul className="max-h-48 overflow-y-auto divide-y divide-ink-100">
        {list.map((u) => {
          const on = value.includes(u.id);
          return (
            <li key={u.id}>
              <button type="button" onClick={() => toggle(u.id)} className={`w-full flex items-center gap-2 px-2.5 py-2 text-right ${on ? "bg-brand-50" : "hover:bg-ink-50"}`}>
                <span className={`w-4 h-4 rounded${multiple ? "" : "-full"} border flex items-center justify-center shrink-0 ${on ? "bg-brand-600 border-brand-600 text-white" : "border-ink-300"}`}>{on && <CheckIcon size={11} strokeWidth={3} />}</span>
                <UserCell userId={u.id} size={26} />
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-3 py-4 text-center text-[12px] text-ink-400">کاربری پیدا نشد.</li>}
      </ul>
      {multiple && value.length > 0 && <div className="px-3 py-1.5 text-[11px] text-ink-500 border-t border-ink-100 bg-ink-50">{fmtN(value.length)} نفر انتخاب شده</div>}
    </div>
  );
}

/** ساخت و دانلود فایل CSV (با BOM برای نمایش درست فارسی در اکسل) */
export function downloadCsv(filename: string, header: string[], rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useMediaQuery(q: string) {
  const get = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

/** چیپ کوچکِ شمارش با آیکن */
export function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-500" title={label}>
      {icon}
      {fmtN(value)}
    </span>
  );
}
