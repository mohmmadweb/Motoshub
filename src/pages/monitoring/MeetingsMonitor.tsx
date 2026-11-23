// مانیتورینگ صورتجلسات (میزیتو): وضعیت‌ها، مصوبه‌های اجرانشده و فیلتر بر اساس عنوان پروژه
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FilterBar from "../../components/ui/FilterBar";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import { List } from "../../components/ui/ListRow";
import { useMeetings } from "../../context/MeetingsContext";
import { fa } from "../../pm/jalali";
import { meetingHref, minutesStatusLabel, type MinutesStatus } from "../../meetings/types";
import { MeetingRow } from "../meetings/MeetingsHub";
import { openResolutions } from "../meetings/MeetingSheet";
import { useMonitorScope } from "./shared";

type P = "all" | MinutesStatus | "open_res";

export default function MeetingsMonitor() {
  const m = useMeetings();
  const { projects, all } = useMonitorScope();
  const navigate = useNavigate();
  const ids = new Set(projects.map((p) => p.meta.id));
  const scope = m.views.filter((v) => all || (v.pid && ids.has(v.pid)));
  const [pill, setPill] = useState<P>("all");
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const names = [...new Set(scope.map((v) => v.project_name).filter((x): x is string => !!x))];
  const rows = scope
    .filter((v) => (pill === "all" ? true : pill === "open_res" ? openResolutions(v) > 0 : v.minutes_status === pill))
    .filter((v) => !q || v.title.includes(q))
    .filter((v) => !proj || (proj === "__org" ? !v.project_name : (v.project_name ?? "").includes(proj)));
  const unexecuted = scope.reduce((n, v) => n + openResolutions(v), 0);
  const pills = [
    { id: "all" as P, label: "همه", count: scope.length },
    ...(["draft", "forming", "awaiting_signature", "signed"] as MinutesStatus[]).map((s) => ({ id: s as P, label: minutesStatusLabel[s], count: scope.filter((v) => v.minutes_status === s).length })),
    { id: "open_res" as P, label: "دارای مصوبه‌ی اجرانشده", count: scope.filter((v) => openResolutions(v) > 0).length, dot: "warning" as const },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="صورتجلسه‌ها" value={fa(scope.length)} />
        <StatCard label="در انتظار امضا" value={fa(scope.filter((v) => v.minutes_status === "awaiting_signature").length)} />
        <StatCard label="امضاشده" value={fa(scope.filter((v) => v.minutes_status === "signed").length)} />
        <StatCard label="مصوبه‌ی اجرانشده" value={fa(unexecuted)} />
      </div>
      <div className="card">
        <FilterBar pills={pills} active={pill} onPill={setPill} search={q} onSearch={setQ} searchPlaceholder="عنوان جلسه…" activeCount={proj ? 1 : 0}>
          <input className="input-field !w-auto" list="mon-projects" value={proj} onChange={(e) => setProj(e.target.value)} placeholder="عنوان پروژه…" aria-label="فیلتر بر اساس عنوان پروژه" />
          <datalist id="mon-projects">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </FilterBar>
        <List>
          {rows.map((v) => (
            <MeetingRow key={v.route_id} v={v} onOpen={() => navigate(meetingHref(v))} />
          ))}
        </List>
        {rows.length === 0 && (
          <div className="p-5">
            <EmptyState compact title="صورتجلسه‌ای با این فیلتر نیست" />
          </div>
        )}
      </div>
    </div>
  );
}
