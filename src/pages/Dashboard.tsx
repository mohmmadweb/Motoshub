import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Clock3,
  Sunrise,
  Sun,
  Sunset,
  MoonStar,
} from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import PageHeader from "../components/ui/PageHeader";
import PersonalHub from "./dashboard/PersonalHub";
import { ReportBuilderModal } from "../reports/ModuleReportsButton";
import { reportStore } from "../reports/store";
import { useI18n } from "../i18n";

// ساعت و تاریخ زنده‌ی شمسی + سلام متناسب با ساعت روز
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return { text: "صبح بخیر", icon: Sunrise, tone: "text-amber-500" };
  if (hour >= 12 && hour < 16) return { text: "ظهر بخیر", icon: Sun, tone: "text-amber-500" };
  if (hour >= 16 && hour < 20) return { text: "عصر بخیر", icon: Sunset, tone: "text-orange-500" };
  return { text: "شب بخیر", icon: MoonStar, tone: "text-brand-400" };
}

function LiveDateTime() {
  const now = useNow();
  const { actingUser } = useTenancy();
  const { t, lang } = useI18n();
  const time = now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  // ساخت دستی تاریخ شمسی تا ترتیب اجزا در RTL به‌هم نریزد: «شنبه ۳ مرداد ۱۴۰۵»؛ در زبان‌های دیگر تقویم همان زبان (F14)
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).formatToParts(now);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  const date = lang.code === "fa" ? `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}` : new Intl.DateTimeFormat(`${lang.locale}-u-ca-${lang.calendar}`, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const g = greetingFor(now.getHours());

  return (
    <div className="flex items-center gap-3 flex-wrap justify-between">
      <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <g.icon size={17} className={g.tone} />
        {t(g.text)}، {actingUser.name.split(" ")[0] === "پایگاه" ? "همکار گرامی" : actingUser.name}
      </span>
      <span className="flex items-center gap-2.5 text-[12px] text-ink-500">
        <span className="flex items-center gap-1.5 bg-ink-50 border border-ink-100 rounded-lg px-2.5 py-1.5">
          <Clock3 size={13} className="text-brand-500" />
          <span className="font-bold text-ink-800 tabular-nums min-w-[64px] text-center">{time}</span>
        </span>
        <span dir={lang.dir} className="bg-ink-50 border border-ink-100 rounded-lg px-2.5 py-1.5 font-medium whitespace-nowrap">{date}</span>
      </span>
    </div>
  );
}

/** ?report=<id> (از اعلان گزارش زمان‌بندی‌شده) ← گزارش در گزارش‌ساز باز می‌شود */
function ReportFromLink() {
  const [params, setParams] = useSearchParams();
  const id = params.get("report");
  const spec = id ? reportStore.all().find((r) => r.id === id) : undefined;
  if (!spec) return null;
  const close = () => {
    const n = new URLSearchParams(params);
    n.delete("report");
    setParams(n, { replace: true });
  };
  return <ReportBuilderModal open onClose={close} module={spec.module} initialReportId={spec.id} />;
}

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="میزکار من" />
      <PersonalHub header={<LiveDateTime />} />
      <ReportFromLink />
    </div>
  );
}
