// ---------------------------------------------------------------------------
// بند ۸: فهرست کنترل دسترسی سند (کاربر / واحد سازمانی / نقش / سمت) و
// خلاصه‌ی «چه کسانی می‌بینند».
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Plus, X, Users, Download, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import Toggle from "../../components/ui/Toggle";
import Avatar from "../../components/Avatar";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { users } from "../../data/mock";
import { fa } from "../../pm/jalali";
import { aclKindLabel, type AccessLevel, type AclKind, type KAcl, type KAclEntry, type KDoc } from "../../km/types";

/** برچسب خوانای هر ردیف ACL */
export function useAclLabel() {
  const { iam, scopePath } = useTenancy();
  return (e: KAclEntry) => {
    switch (e.kind) {
      case "user":
        return users.find((u) => u.id === e.id)?.name ?? e.id;
      case "scope":
        return iam.scopes.some((s) => s.id === e.id) ? scopePath(e.id) : e.id;
      case "role":
        return iam.roles.find((r) => r.id === e.id)?.name ?? e.id;
      case "title":
        return e.id;
    }
  };
}

/** گزینه‌های قابل انتخاب برای هر نوع ردیف */
function useAclOptions() {
  const { iam, scopePath } = useTenancy();
  const titles = [...new Set(iam.memberships.map((m) => m.title).filter((t): t is string => !!t))];
  return (kind: AclKind): { id: string; label: string }[] => {
    switch (kind) {
      case "user":
        return users.map((u) => ({ id: u.id, label: u.name }));
      case "scope":
        return iam.scopes.filter((s) => s.type !== "system" && s.active).map((s) => ({ id: s.id, label: scopePath(s.id).split(" › ").slice(1).join(" › ") || s.name }));
      case "role":
        return iam.roles.filter((r) => r.active).map((r) => ({ id: r.id, label: r.name }));
      case "title":
        return titles.map((t) => ({ id: t, label: t }));
    }
  };
}

const levelHint: Record<AccessLevel, string> = {
  عمومی: "همه‌ی کاربران",
  داخلی: "همه‌ی کارکنان واردشده",
  محرمانه: "دارندگان مجوز «اسناد محرمانه»",
  "خیلی محرمانه": "دارندگان مجوز محرمانه + تأیید",
};

/** ویرایشگر فهرست دسترسی */
export function AclEditor({ value, onChange, access }: { value?: KAcl; onChange: (v: KAcl | undefined) => void; access: AccessLevel }) {
  const label = useAclLabel();
  const options = useAclOptions();
  const km = useKnowledge();
  const [kind, setKind] = useState<AclKind>("scope");
  const [target, setTarget] = useState("");
  const [dl, setDl] = useState(false);
  const acl: KAcl = value ?? { entries: [], viewOnly: false };
  const set = (next: KAcl) => onChange(next.entries.length || next.viewOnly ? next : undefined);
  const policyDl = km.policy[access]?.download;
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] text-ink-500 leading-5">
        سطح «{access}»: {levelHint[access]}. {acl.entries.length ? "فقط کسانی که با یکی از ردیف‌های زیر منطبق‌اند (به‌علاوه‌ی مالک و تأییدکنندگان) سند را می‌بینند." : "برای محدودتر کردن، کاربر، واحد، نقش یا سمت اضافه کنید."}
      </p>
      {acl.entries.length > 0 && (
        <ul className="space-y-1">
          {acl.entries.map((e, i) => (
            <li key={`${e.kind}-${e.id}`} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2.5 py-1.5">
              <span className="text-ink-400 shrink-0 w-16">{aclKindLabel[e.kind]}</span>
              <span className="flex-1 truncate text-ink-800">{label(e)}</span>
              <label className="flex items-center gap-1 text-[11px] text-ink-500 cursor-pointer shrink-0" title="اجازه‌ی دانلود علاوه بر مشاهده">
                <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={e.download} onChange={() => set({ ...acl, entries: acl.entries.map((x, j) => (j === i ? { ...x, download: !x.download } : x)) })} /> دانلود
              </label>
              <button type="button" onClick={() => set({ ...acl, entries: acl.entries.filter((_, j) => j !== i) })} className="text-ink-400 hover:text-rose-600" aria-label={`حذف ${label(e)}`}>
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1.5 flex-wrap items-center">
        <select className="input-field !py-1.5 !text-xs !w-auto" value={kind} onChange={(e) => { setKind(e.target.value as AclKind); setTarget(""); }} aria-label="نوع">
          {(Object.keys(aclKindLabel) as AclKind[]).map((k) => (
            <option key={k} value={k}>
              {aclKindLabel[k]}
            </option>
          ))}
        </select>
        <select className="input-field !py-1.5 !text-xs flex-1 min-w-[160px]" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="انتخاب">
          <option value="">انتخاب…</option>
          {options(kind)
            .filter((o) => !acl.entries.some((e) => e.kind === kind && e.id === o.id))
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
        </select>
        <label className="flex items-center gap-1 text-[11px] text-ink-500 cursor-pointer">
          <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={dl} onChange={(e) => setDl(e.target.checked)} /> دانلود
        </label>
        <button
          type="button"
          onClick={() => {
            if (!target) return;
            set({ ...acl, entries: [...acl.entries, { kind, id: target, download: dl }] });
            setTarget("");
          }}
          className="text-xs px-3 py-1.5 rounded-lg border border-ink-200 bg-white hover:bg-ink-50 flex items-center gap-1"
        >
          <Plus size={12} /> افزودن
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs pt-1">
        <span className="text-ink-700 flex items-center gap-1.5">
          <EyeOff size={13} className="text-ink-400" /> فقط مشاهده (دانلود برای همه جز مالک بسته)
          {!policyDl && <span className="text-[10.5px] text-ink-400">— سطح «{access}» به‌طور پیش‌فرض فقط مشاهده است</span>}
        </span>
        <Toggle on={acl.viewOnly} onChange={() => set({ ...acl, viewOnly: !acl.viewOnly })} label="فقط مشاهده" />
      </div>
    </div>
  );
}

/** «چه کسانی می‌بینند» — محاسبه‌ی زنده روی همه‌ی کاربران */
export function AccessSummary({ doc, compact = false }: { doc: KDoc; compact?: boolean }) {
  const km = useKnowledge();
  const [open, setOpen] = useState(false);
  const list = km.whoCanSee(doc);
  const dl = list.filter((x) => x.download).length;
  const total = users.length;
  return (
    <div className={compact ? "" : "rounded-lg border border-ink-200 p-3"}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 text-right">
        <Users size={14} className="text-brand-600 shrink-0" />
        <span className="text-xs text-ink-800 flex-1">
          <b>چه کسانی می‌بینند:</b> {fa(list.length)} از {fa(total)} نفر · <Download size={11} className="inline" /> {fa(dl)} نفر دانلود
        </span>
        <span className="flex -space-x-1.5 space-x-reverse shrink-0">
          {list.slice(0, 5).map((x) => {
            const u = users.find((y) => y.id === x.userId);
            return <Avatar key={x.userId} name={x.name} color={u?.avatarColor} size={20} />;
          })}
        </span>
        {open ? <ChevronUp size={14} className="text-ink-400" /> : <ChevronDown size={14} className="text-ink-400" />}
      </button>
      {open && (
        <ul className="mt-2 divide-y divide-ink-100 max-h-56 overflow-y-auto">
          {list.map((x) => (
            <li key={x.userId} className="flex items-center gap-2 py-1.5 text-xs">
              <span className="flex-1 truncate text-ink-800">{x.name}</span>
              <span className="text-[11px] text-ink-400 truncate max-w-[45%]">{x.via}</span>
              {x.download ? <Download size={12} className="text-emerald-600 shrink-0" aria-label="دانلود" /> : <EyeOff size={12} className="text-amber-600 shrink-0" aria-label="فقط مشاهده" />}
            </li>
          ))}
          {list.length === 0 && <li className="py-2 text-[11px] text-ink-400">هیچ کاربری جز مالک دسترسی ندارد.</li>}
        </ul>
      )}
    </div>
  );
}
