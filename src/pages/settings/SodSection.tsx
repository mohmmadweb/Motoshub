// ---------------------------------------------------------------------------
// «تفکیک وظایف» (Separation of Duties) — جفت مجوزهای ناسازگار. هنگام تخصیص نقش، اگر کاربر
// در همان واحد هر دو طرف یک قاعده را بگیرد، «هشدار» یا «جلوگیری» (بسته به حالت قاعده).
// قواعد سراسری‌اند و فقط مدیر سامانه تغییرشان می‌دهد؛ تعارض‌های موجود در «بازبینی دسترسی‌ها» هم آمده است.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Plus, Save, Scale, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { permissionCatalog } from "../../data/mock";
import { sodViolations, type SodConfig, type SodRule } from "../../iam/model";
import { Callout, PermId, ScopeName, SectionHead, UserCell, fmtN, permLabel, useSubtree } from "./iam/shared";

export default function SodSection() {
  const t = useTenancy();
  const { notify } = useToast();
  const sub = useSubtree();
  const [d, setD] = useState<SodConfig>(t.iam.sod);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<SodRule["mode"]>("warn");
  const canEdit = t.canEditSod;
  const dirty = JSON.stringify(d) !== JSON.stringify(t.iam.sod);

  const violations = useMemo(() => sodViolations({ ...t.iam, sod: d }, t.today, sub.ids), [t.iam, t.today, d, sub.ids]);
  const countOf = (id: string) => violations.filter((v) => v.rule.id === id).length;
  const patch = (id: string, p: Partial<SodRule>) => setD((x) => ({ ...x, rules: x.rules.map((r) => (r.id === id ? { ...r, ...p } : r)) }));

  const add = () => {
    if (!a || !b || a === b) return notify("دو مجوز متفاوت انتخاب کنید.", "warning");
    if (d.rules.some((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))) return notify("این جفت از قبل قاعده دارد.", "warning");
    setD((x) => ({ ...x, rules: [...x.rules, { id: `sod-${Date.now()}`, a, b, title: title.trim() || `${permLabel(a)} / ${permLabel(b)}`, mode, active: true }] }));
    setA("");
    setB("");
    setTitle("");
  };
  const save = () => {
    const c = t.saveSod(d, `قواعد تفکیک وظایف به‌روزرسانی شد (${fmtN(d.rules.filter((r) => r.active).length)} قاعده‌ی فعال).`);
    if (!c.ok) return notify(c.reason, "warning");
    notify("قواعد تفکیک وظایف ذخیره شد.", "success");
  };

  const permSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} disabled={!canEdit}>
      <option value="">{label}…</option>
      {permissionCatalog.map((g) => (
        <optgroup key={g.id} label={g.label}>
          {g.actions.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Scale size={18} />}
        title="تفکیک وظایف"
        description="جفت کارهایی که یک نفر نباید هم‌زمان در یک واحد انجام دهد (مثلاً ثبت هزینه و تأیید همان هزینه). هنگام تخصیص نقش بررسی می‌شود."
        actions={
          <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
            ذخیره
          </Button>
        }
      />
      {!canEdit && <Callout tone="neutral">{t.readOnly ? "حالت فقط‌خواندنی." : "قواعد سراسری‌اند و فقط مدیر سامانه تغییرشان می‌دهد؛ شما تعارض‌های محدوده‌ی خودتان را می‌بینید."}</Callout>}

      <div className="card overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {d.rules.map((r) => {
            const n = countOf(r.id);
            return (
              <li key={r.id} className={`px-4 py-3 ${r.active ? "" : "opacity-55"}`}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink-800 flex items-center gap-1.5 flex-wrap">
                      {r.title}
                      {n > 0 && <Badge tone="danger">{fmtN(n)} تعارض</Badge>}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5">
                      {[r.a, r.b].map((p) => (
                        <div key={p} className="rounded-md border border-ink-100 px-2 py-1">
                          <span className="block text-[11.5px] text-ink-700">{permLabel(p)}</span>
                          <PermId id={p} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select className="input-field !w-auto !py-1 text-[12px]" value={r.mode} disabled={!canEdit} onChange={(e) => patch(r.id, { mode: e.target.value as SodRule["mode"] })} aria-label="حالت قاعده">
                      <option value="warn">هشدار</option>
                      <option value="block">جلوگیری</option>
                    </select>
                    <Toggle on={r.active} disabled={!canEdit} onChange={() => patch(r.id, { active: !r.active })} label="فعال" />
                    <button type="button" disabled={!canEdit} onClick={() => setD((x) => ({ ...x, rules: x.rules.filter((y) => y.id !== r.id) }))} className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="حذف قاعده">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {!d.rules.length && <li className="px-4 py-6 text-center text-[12px] text-ink-400">قاعده‌ای تعریف نشده است.</li>}
        </ul>
        {canEdit && (
          <div className="border-t border-ink-100 bg-ink-50 p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {permSelect(a, setA, "مجوز اول")}
              {permSelect(b, setB, "مجوز دوم (ناسازگار)")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_130px_auto] gap-2">
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان قاعده (اختیاری)" aria-label="عنوان قاعده" />
              <select className="input-field" value={mode} onChange={(e) => setMode(e.target.value as SodRule["mode"])} aria-label="حالت">
                <option value="warn">هشدار</option>
                <option value="block">جلوگیری</option>
              </select>
              <Button variant="secondary" icon={<Plus size={14} />} onClick={add}>
                افزودن قاعده
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="card p-3 text-[12px] text-ink-600 flex items-center gap-2 flex-wrap">
        <span>نقش‌های مستثنا (اضطراری):</span>
        {d.exemptRoleIds.map((id) => (
          <Badge key={id} tone="navy">
            {t.iam.roles.find((r) => r.id === id)?.name ?? id}
          </Badge>
        ))}
        <span className="text-ink-400 text-[11px]">— مدیر سامانه همه‌ی مجوزها را دارد و در محاسبه‌ی تعارض نادیده گرفته می‌شود.</span>
      </div>

      <div>
        <p className="text-[13px] font-bold text-ink-800 mb-2">تعارض‌های موجود در «{sub.root.name}» ({fmtN(violations.length)})</p>
        <SodViolationList items={violations} />
      </div>
    </div>
  );
}

/** فهرست تعارض‌ها — در «بازبینی دسترسی‌ها» هم استفاده می‌شود */
export function SodViolationList({ items }: { items: ReturnType<typeof sodViolations> }) {
  const t = useTenancy();
  if (!items.length) return <div className="card px-4 py-5 text-center text-[12px] text-emerald-700">تعارضی پیدا نشد.</div>;
  return (
    <ul className="card divide-y divide-ink-100 overflow-hidden">
      {items.map((v) => (
        <li key={`${v.userId}-${v.scopeId}-${v.rule.id}`} className="px-4 py-2.5 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-x-3 gap-y-1 items-center">
          <UserCell userId={v.userId} size={26} />
          <ScopeName id={v.scopeId} showPath />
          <div className="min-w-0">
            <p className="text-[12px] text-ink-800 flex items-center gap-1.5 flex-wrap">
              {v.rule.title}
              <Badge tone={v.rule.mode === "block" ? "danger" : "warning"}>{v.rule.mode === "block" ? "جلوگیری" : "هشدار"}</Badge>
            </p>
            <p className="text-[11px] text-ink-400 truncate">از نقش‌های: {v.roleIds.map((id) => t.iam.roles.find((r) => r.id === id)?.name ?? id).join("، ")}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

