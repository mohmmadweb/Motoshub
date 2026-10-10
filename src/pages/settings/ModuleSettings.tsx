// ---------------------------------------------------------------------------
// پنل‌های تنظیمات ماژول‌ها در «تنظیمات سامانه» — جاسازی همان تنظیمات خود ماژول (یک منبع)
// یا کارت پیوند به آن، تا تنظیمات هر ماژول جدا و در یک جا پیدا شود.
// ---------------------------------------------------------------------------
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, BellRing, CalendarDays, Clock, Library, Settings2 } from "lucide-react";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useTimesheet } from "../../context/TimesheetContext";
import { fa } from "../../pm/jalali";
import { SettingsSection as KnowledgeSettings } from "../knowledge/InsightSections";
import TimesheetSettingsModal from "../activity/SettingsModal";
import SocialAdmin from "../social/SocialAdmin";
import { SystemVarsCard } from "../AdminSections";
import { ScopedKeysCard } from "./ScopedSettingsSection";
import { SectionHead } from "./iam/shared";

export function ModuleLinkCard({ icon, title, text, to, cta }: { icon: ReactNode; title: string; text: string; to: string; cta: string }) {
  return (
    <div className="card p-4 flex items-start gap-3 flex-wrap">
      <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-ink-900">{title}</p>
        <p className="text-[12px] text-ink-500 mt-0.5 leading-5">{text}</p>
      </div>
      <Link to={to} className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:underline self-center">
        {cta} <ArrowUpLeft size={13} />
      </Link>
    </div>
  );
}

/** «دانش» — همان تنظیمات مدیریت دانش (طبقه‌بندی، گردش کار، سطوح دسترسی) جاسازی‌شده */
export function KnowledgeSettingsPanel() {
  return (
    <div className="space-y-4">
      <ModuleLinkCard icon={<Library size={17} />} title="مدیریت دانش" text="همین تنظیمات در خود ماژول (مدیریت دانش ← تنظیمات و دسترسی‌ها) هم هست؛ هر دو یک منبع دارند." to="/dashboard/knowledge?tab=settings" cta="باز کردن در ماژول" />
      <KnowledgeSettings />
    </div>
  );
}

/** «کارکرد و مرخصی» — تقویم کاری سازمان (ساعت موظف، پنجشنبه، تعطیلات، مرخصی) */
export function TimesheetSettingsPanel() {
  const ts = useTimesheet();
  const s = ts.settings;
  const [open, setOpen] = useState(false);
  const thursday = s.thursdayHours === 0 ? "تعطیل" : s.thursdayHours >= s.dailyHours ? "کامل" : `${fa(s.thursdayHours)} ساعت`;
  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Clock size={18} />}
        title="کارکرد و مرخصی"
        description="تقویم کاری سازمان — مبنای محاسبه‌ی اضافه‌کار، کسری و مانده‌ی مرخصی در «گزارش فعالیت‌های من»."
        actions={
          <Button variant="primary" size="sm" icon={<Settings2 size={14} />} onClick={() => setOpen(true)}>
            ویرایش تقویم کاری
          </Button>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["ساعت موظف روزانه", `${fa(s.dailyHours)} ساعت`],
          ["پنجشنبه", thursday],
          ["سقف مرخصی سالانه", `${fa(s.annualLeaveDays)} روز`],
          ["تعطیلات", `${fa(s.holidays.length)} روز`],
        ].map(([k, v]) => (
          <div key={k} className="card p-3">
            <p className="text-[11px] text-ink-400">{k}</p>
            <p className="text-[14px] font-bold text-ink-900 mt-1">{v}</p>
          </div>
        ))}
      </div>
      <div className="card p-3.5 text-[12px] text-ink-600 leading-6 flex items-start gap-2">
        <CalendarDays size={14} className="text-ink-400 shrink-0 mt-1" />
        <span>
          این تقویم کاری (ساعت موظف، پنجشنبه و تعطیلات — شامل تعطیلات رسمی ۱۴۰۵) منبع واحد بار کاری پروژه‌ها، تقویم و «زمان مشترک» جلسات هم هست. بازه‌ی ساعت شروع و پایان روز برای جلسات در «پیش‌فرض‌های پروژه» تعیین می‌شود. یادآوری‌ها و سیاست مرخصی هم در همین پنجره است.
        </span>
      </div>
      <TimesheetSettingsModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** «اعلان‌ها و کانال‌ها ← صف و خلاصه‌ی روزانه» */
export function NotificationQueuePanel() {
  const { notify } = useToast();
  const { hasPermission } = useTenancy();
  return (
    <div className="space-y-4">
      <SectionHead icon={<BellRing size={18} />} title="صف اعلان و خلاصه‌ی روزانه" description="ظرفیت ارسال و زمان خلاصه‌ی روزانه برای کل سامانه. ترجیح هر کاربر (کانال‌ها، ساعات سکوت، خلاصه) در صفحه‌ی اعلان‌های خودش است." />
      <SystemVarsCard areas={["notify"]} notify={notify} auditArea="اعلان‌ها" disabled={!hasPermission("settings.system")} />
      <ModuleLinkCard icon={<BellRing size={17} />} title="تنظیمات اعلان من" text="کانال دریافت به تفکیک نوع رویداد، ساعات سکوت و خلاصه‌ی روزانه‌ی شخصی — در صفحه‌ی «اعلان‌ها» زبانه‌ی «تنظیمات اعلان من»." to="/dashboard/notifications" cta="رفتن به اعلان‌ها" />
    </div>
  );
}

/** «شبکه‌ی اجتماعی» — نظارت و تنظیمات ماژول + بازنویسی لایه‌ای «تأیید محتوا پیش از انتشار» */
export function SocialSettingsPanel() {
  return (
    <div className="space-y-4">
      <SocialAdmin embedded />
      <ScopedKeysCard keys={["content.requireApproval"]} title="تأیید محتوا پیش از انتشار — در این واحد" />
    </div>
  );
}
