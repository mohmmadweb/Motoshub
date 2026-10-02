// ---------------------------------------------------------------------------
// «گزارش فعالیت‌های من» (/dashboard/activity) — جایگزین گوگل‌شیت ساعت کاری:
// کارکرد من (ثبت روزانه) · اتصال ابزارها · تیم من (مدیران) · خلاصه برای مالی · گزارش‌ها
// دوره‌ی حقوق: ۲۶ ماه قبل تا ۲۵ همین ماه (شهریور: ۳۱ مرداد تا ۲۵ شهریور).
// ---------------------------------------------------------------------------
import ModuleReportsButton from "../../reports/ModuleReportsButton";
import { useState } from "react";
import { ClipboardClock } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import { useTabParam } from "../../lib/useTabParam";
import { periodOf, shiftPeriod, type Period } from "../../timesheet/types";
import { useTs } from "./lib";
import { PeriodNav } from "./ui";
import MyTimesheet from "./MyTimesheet";
import Integrations from "./Integrations";
import TeamGrid from "./TeamGrid";
import FinanceSummary from "./FinanceSummary";
import Reports from "./Reports";

type Tab = "mine" | "integrations" | "team" | "finance" | "reports";
const ALL_TABS: readonly Tab[] = ["mine", "integrations", "team", "finance", "reports"];

export default function ActivityReport() {
  const { ts, ten, me, teamPeople } = useTs();
  const [tab, setTab] = useTabParam<Tab>("mine", ALL_TABS);
  const current = periodOf(ts.today);
  const [period, setPeriod] = useState<Period>(current);
  const can = ten.hasPermission;
  const pending = ts.entries.filter((e) => e.personId === me.id && e.review === "pending").length;
  const submitted = teamPeople.filter((p) => p.id !== me.id && ts.periodRecord(p.id, period.key).status === "submitted").length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "mine", label: "کارکرد من" },
    ...(can("timesheet.integrations") || pending ? [{ id: "integrations" as Tab, label: "اتصال ابزارها", count: pending || undefined }] : []),
    ...(can("timesheet.team") ? [{ id: "team" as Tab, label: "تیم من", count: submitted || undefined }] : []),
    ...(can("timesheet.finance") ? [{ id: "finance" as Tab, label: "خلاصه برای مالی" }] : []),
    { id: "reports", label: "گزارش‌ها" },
  ];
  const active: Tab = tabs.some((t) => t.id === tab) ? tab : "mine";
  const showPeriod = active !== "integrations";

  return (
    <div>
      <PageHeader
        title="گزارش فعالیت‌های من"
        description="ثبت زمان کاری، مرخصی و مأموریت در دوره‌ی حقوق (۲۶ ماه قبل تا ۲۵ همین ماه) و جمع‌بندی همه‌ی فعالیت‌ها"
        icon={<ClipboardClock size={18} />}
        actions={
          <>
            <ModuleReportsButton module="timesheet" />
            {showPeriod && <PeriodNav period={period} onShift={(n) => setPeriod(shiftPeriod(period, n))} canNext={period.key < current.key} />}
          </>
        }
      />
      <Tabs tabs={tabs} active={active} onChange={setTab} />
      {active === "mine" && <MyTimesheet period={period} onReview={() => setTab("integrations")} />}
      {active === "integrations" && <Integrations />}
      {active === "team" && <TeamGrid period={period} />}
      {active === "finance" && <FinanceSummary period={period} />}
      {active === "reports" && <Reports period={period} />}
    </div>
  );
}
