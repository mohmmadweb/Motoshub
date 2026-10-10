// ---------------------------------------------------------------------------
// «برند و ظاهر ← برند سازمان» — ادغام «برندسازی سازمان» (پنل قدیمی)، «برند و تنظیمات لایه‌ای»
// و زبانه‌ی سازمانیِ «ظاهر و نمایش»: نام، زیرعنوان، رنگ و لوگو با ارث‌بری لایه‌ای (هلدینگ/شرکت)
// + دامنه‌ی اختصاصی و نام کوتاه (هویت سامانه — همان رکوردی که «ورود یکپارچه» ویرایش می‌کند).
// رنگ تأکیدِ پوسته شخصی است و در زبانه‌ی «ظاهر من» است.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { Globe2, Save } from "lucide-react";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { diffKeys, emitSettingsChange } from "../../iam/settingsAudit";
import { ROOT_ID } from "../../iam/model";
import ScopedSettingsSection from "./ScopedSettingsSection";
import { Field } from "./iam/shared";

export function BrandOrgTab() {
  return (
    <div className="space-y-4">
      <ScopedSettingsSection groups={["brand"]} />
      <DomainCard />
    </div>
  );
}

function DomainCard() {
  const { identity, updateIdentity, hasPermission, contextId } = useTenancy();
  const { notify } = useToast();
  const [d, setD] = useState({ domain: identity.domain, shortName: identity.shortName });
  useEffect(() => setD({ domain: identity.domain, shortName: identity.shortName }), [identity.domain, identity.shortName]);
  // دامنه و نام کوتاه متعلق به کل نصب است (لایه‌ی سیستم)
  const canEdit = hasPermission("settings.branding") && contextId === ROOT_ID;
  const dirty = d.domain !== identity.domain || d.shortName !== identity.shortName;
  const save = () => {
    if (!d.domain.trim()) return notify("دامنه الزامی است.", "warning");
    const next = { domain: d.domain.trim(), shortName: d.shortName.trim() };
    const diff = diffKeys({ domain: identity.domain, shortName: identity.shortName }, next);
    updateIdentity(next);
    if (diff) emitSettingsChange({ area: "برند سازمان", summary: "تغییر دامنه/نام کوتاه سامانه", before: diff.before, after: diff.after });
    notify("دامنه و نام کوتاه ذخیره شد.", "success");
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
          <Globe2 size={15} className="text-brand-600" /> دامنه و نام کوتاه سامانه
        </p>
        <Button size="sm" variant="primary" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
          ذخیره
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="دامنه‌ی اختصاصی">
          <input className="input-field" dir="ltr" value={d.domain} disabled={!canEdit} onChange={(e) => setD({ ...d, domain: e.target.value })} />
        </Field>
        <Field label="نام کوتاه (در رابط کاربری)">
          <input className="input-field" value={d.shortName} disabled={!canEdit} onChange={(e) => setD({ ...d, shortName: e.target.value })} />
        </Field>
      </div>
      <p className="text-[11px] text-ink-400 mt-2 leading-5">{canEdit ? "برای کل نصب اعمال می‌شود؛ نام نمایشی، رنگ و لوگوی هر هلدینگ/شرکت در کارت‌های بالا بازنویسی می‌شود." : "فقط مدیر سامانه در لایه‌ی «سیستم» این دو مورد را تغییر می‌دهد."}</p>
    </div>
  );
}
