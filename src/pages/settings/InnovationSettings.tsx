// ---------------------------------------------------------------------------
// «نوآوری» در تنظیمات سامانه — پارامترهای گردش کار ماژول‌های دانش و نوآوری، جدا به تفکیک ماژول:
// صندوق نوآوری (یادآوری/مهلت/آستانه‌ی خواب/حدنصاب‌ها + آستانه‌ی اختلاف داوران)، قراردادها و جایزه.
// آستانه‌ی خواب یک منبع دارد (SettingsContext) و دکمه‌ی «تنظیمات صندوق» همان را ویرایش می‌کند.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Save, Scale } from "lucide-react";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useInnovation } from "../../context/InnovationContext";
import { DEFAULT_FUND_SETTINGS } from "../../innovation/extras";
import WorkflowParamsCard from "./WorkflowParams";
import { ScopedKeysCard } from "./ScopedSettingsSection";

function ModuleLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:underline">
      {label} <ArrowUpLeft size={13} />
    </Link>
  );
}

export function FundSettingsTab() {
  const { hasPermission } = useTenancy();
  const sys = hasPermission("settings.system");
  return (
    <div className="space-y-4">
      <WorkflowParamsCard
        module="funds"
        title="صندوق نوآوری و شتاب‌دهی"
        description={sys ? "یادآوری گزارش، مهلت بررسی، آستانه‌ی پروژه‌ی خوابیده و حدنصاب‌های ارزیابی." : "با مجوز صندوق فقط آستانه‌ی پروژه‌ی خوابیده قابل تغییر است؛ بقیه نیازمند «تنظیمات سیستم» است."}
        editableKeys={sys ? undefined : ["dormantProjectDays"]}
      />
      <DisagreementCard />
      <ScopedKeysCard keys={["workflow.reportReminderDays"]} title="یادآوری سررسید گزارش — بازنویسی در این واحد" />
      <ModuleLink to="/dashboard/funds" label="رفتن به صندوق نوآوری" />
    </div>
  );
}

/** آستانه‌ی اختلاف داوران — همان مقدار «تنظیمات صندوق» (fundSettings.disagreementPct) */
function DisagreementCard() {
  const inn = useInnovation();
  const { notify } = useToast();
  const cur = inn.fundSettings?.disagreementPct ?? DEFAULT_FUND_SETTINGS.disagreementPct;
  const [v, setV] = useState(cur);
  useEffect(() => setV(cur), [cur]);
  return (
    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0 flex items-start gap-2.5">
        <Scale size={16} className="text-brand-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12.5px] font-medium text-ink-900">آستانه‌ی اختلاف داوران</p>
          <p className="text-[11px] text-ink-400 mt-0.5 leading-5">اگر انحراف معیار نمره‌ها از این درصدِ سقف هر معیار بیشتر شود، خانه در ماتریس داوری قرمز می‌شود.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <input type="number" min={1} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} className="input-field w-20 text-center px-2 py-1.5" dir="ltr" aria-label="آستانه‌ی اختلاف داوران" />
        <span className="text-[11px] text-ink-400">٪</span>
        <Button
          size="sm"
          variant="primary"
          icon={<Save size={13} />}
          disabled={v === cur}
          onClick={() => {
            const p = Math.min(100, Math.max(1, Math.round(v) || DEFAULT_FUND_SETTINGS.disagreementPct));
            inn.commit("funds", "تنظیمات صندوق را تغییر داد", undefined, (s) => ({ ...s, fundSettings: { ...(s.fundSettings ?? DEFAULT_FUND_SETTINGS), dormantDays: undefined, disagreementPct: p } }));
            notify("آستانه‌ی اختلاف داوران ذخیره شد.", "success");
          }}
        >
          ذخیره
        </Button>
      </div>
    </div>
  );
}

export function ContractsSettingsTab() {
  return (
    <div className="space-y-4">
      <WorkflowParamsCard module="contracts" title="قراردادهای فناورانه" description="مهلت بررسی حقوقی، حسن انجام کار و سقف پیش‌پرداخت." />
      <ModuleLink to="/dashboard/contracts" label="رفتن به قراردادهای فناورانه" />
    </div>
  );
}

export function AwardSettingsTab() {
  return (
    <div className="space-y-4">
      <WorkflowParamsCard module="award" title="جایزه‌ی نوآوری" description="قواعد ویرایش اثر شرکت‌کنندگان." />
      <ModuleLink to="/dashboard/award" label="رفتن به جایزه" />
    </div>
  );
}
