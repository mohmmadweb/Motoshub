// ---------------------------------------------------------------------------
// «مانیتورینگ» (/monitoring، مجوز monitoring.view؛ مدیران پروژه برای پروژه‌های خودشان) — میزیتو
// «مانیتورینگ پیشرفته»: پروژه‌ها، وظایف (تأخیرها، کارتابل همکار، چاپ فهرست)، صورتجلسات، اعضا، مالی و فروش.
// ---------------------------------------------------------------------------
import { useSearchParams } from "react-router-dom";
import { ChartColumn } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import AccessDenied from "../../components/ui/AccessDenied";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { isProjectManager } from "../../pm/rules";
import { FinanceMonitor, SalesMonitor } from "../customers/monitoring";
import ProjectsMonitor from "./ProjectsMonitor";
import TasksMonitor from "./TasksMonitor";
import MeetingsMonitor from "./MeetingsMonitor";
import MembersMonitor from "./MembersMonitor";

type Tab = "projects" | "tasks" | "meetings" | "members" | "finance" | "sales";

export default function MonitoringPage() {
  const { hasPermission, actingUser } = useTenancy();
  const pm = useProjectsPM();
  const [params, setParams] = useSearchParams();
  const full = hasPermission("monitoring.view");
  const manager = pm.projects.some((p) => isProjectManager(p, actingUser.name));
  if (!full && !manager) return <AccessDenied module="مانیتورینگ" />;
  const tabs = [
    { id: "projects" as Tab, label: "پروژه‌ها" },
    { id: "tasks" as Tab, label: "وظایف" },
    { id: "meetings" as Tab, label: "صورتجلسات" },
    { id: "members" as Tab, label: "اعضا" },
    ...(full && hasPermission("crm.finance.view") ? [{ id: "finance" as Tab, label: "مالی" }] : []),
    ...(full && hasPermission("crm.view") ? [{ id: "sales" as Tab, label: "فروش" }] : []),
  ];
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && tabs.some((t) => t.id === raw) ? raw : "projects";
  const person = params.get("person") ?? "";
  const go = (t: Tab, extra: Record<string, string> = {}) => setParams({ tab: t, ...extra }, { replace: true });
  return (
    <div>
      <PageHeader
        title="مانیتورینگ"
        description={full ? "وضعیت پروژه‌ها، کارها، صورتجلسات و اعضا در دامنه‌ی دسترسی شما." : "پایش پروژه‌هایی که مدیرشان هستید."}
        icon={<ChartColumn size={18} />}
        tabs={<Tabs className="" tabs={tabs} active={tab} onChange={(t) => go(t)} />}
      />
      {tab === "projects" && <ProjectsMonitor />}
      {tab === "tasks" && <TasksMonitor key={person} person={person} />}
      {tab === "meetings" && <MeetingsMonitor />}
      {tab === "members" && <MembersMonitor onCartable={(name) => go("tasks", { person: name })} />}
      {tab === "finance" && <FinanceMonitor />}
      {tab === "sales" && <SalesMonitor />}
    </div>
  );
}
