import { useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  Building2,
  ListFilter,
  KanbanSquare,
  FileSignature,
  PiggyBank,
  FlaskConical,
  Filter,
  Save,
  PlayCircle,
  CalendarClock,
  Table2,
} from "lucide-react";
import { reportByDepartment, reportByStatus, monthlyActivity, projects, contracts, funds, researchOpportunities } from "../data/mock";
import {
  contractFunnel,
  holdingComparison,
  crossTabStatuses,
  crossTabRows,
  savedReports as initialSavedReports,
  type SavedReport,
} from "../data/mockDetails";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import { useToast } from "../components/ui/ToastProvider";

const periods = ["این هفته", "این ماه", "سه‌ماهه", "سال جاری"];
const builderModules = ["پروژه‌ها", "قراردادها", "صندوق", "فرصت‌های پژوهشی"] as const;
const builderGroupings = ["وضعیت", "معاونت / هلدینگ", "بازه زمانی"] as const;
const builderMetrics = ["تعداد", "ارزش ریالی", "درصد پیشرفت"] as const;
const exportFormats = ["Excel", "PDF", "CSV"] as const;

const scheduleTone: Record<SavedReport["schedule"], BadgeTone> = {
  "بدون زمان‌بندی": "neutral",
  هفتگی: "brand",
  ماهانه: "navy",
};

type BuilderRow = { id: string; label: string; count: number; extra: string };

export default function Reports() {
  const [period, setPeriod] = useState(periods[1]);
  const [builderModule, setBuilderModule] = useState<(typeof builderModules)[number]>("پروژه‌ها");
  const [builderGroupBy, setBuilderGroupBy] = useState<(typeof builderGroupings)[number]>("وضعیت");
  const [builderMetric, setBuilderMetric] = useState<(typeof builderMetrics)[number]>("تعداد");
  const [builderResult, setBuilderResult] = useState<BuilderRow[] | null>(null);
  const [saved, setSaved] = useState<SavedReport[]>(initialSavedReports);
  const [exportOpen, setExportOpen] = useState(false);
  const { notify } = useToast();

  const maxMonthly = Math.max(...monthlyActivity.map((m) => m.value));
  const maxDept = Math.max(...reportByDepartment.map((d) => d.value));
  const maxFunnel = Math.max(...contractFunnel.map((f) => f.count));
  const maxHolding = Math.max(...holdingComparison.flatMap((h) => [h.projects, h.contracts, h.funds]));

  const buildReport = () => {
    let rows: BuilderRow[] = [];
    if (builderModule === "پروژه‌ها") {
      const byHealth: Record<string, number> = {};
      projects.forEach((p) => (byHealth[p.health] = (byHealth[p.health] ?? 0) + 1));
      rows = Object.entries(byHealth).map(([label, count], i) => ({
        id: `b${i}`,
        label: `وضعیت ${label}`,
        count,
        extra: builderMetric === "درصد پیشرفت" ? `${Math.round(projects.filter((p) => p.health === label).reduce((s, p) => s + p.progress, 0) / count)}٪ میانگین پیشرفت` : `${count} پروژه`,
      }));
    } else if (builderModule === "قراردادها") {
      const byStage: Record<string, number> = {};
      contracts.forEach((c) => (byStage[c.stage] = (byStage[c.stage] ?? 0) + 1));
      rows = Object.entries(byStage).map(([label, count], i) => ({ id: `b${i}`, label, count, extra: `${count} قرارداد` }));
    } else if (builderModule === "صندوق") {
      const byStage: Record<string, number> = {};
      funds.forEach((f) => (byStage[f.stage] = (byStage[f.stage] ?? 0) + 1));
      rows = Object.entries(byStage).map(([label, count], i) => ({ id: `b${i}`, label, count, extra: `${count} طرح` }));
    } else {
      const byStage: Record<string, number> = {};
      researchOpportunities.forEach((r) => (byStage[r.stage] = (byStage[r.stage] ?? 0) + 1));
      rows = Object.entries(byStage).map(([label, count], i) => ({ id: `b${i}`, label, count, extra: `${count} فراخوان` }));
    }
    setBuilderResult(rows);
    notify(`گزارش «${builderModule} بر اساس ${builderGroupBy}» برای بازه «${period}» ساخته شد.`, "info");
  };

  const saveBuiltReport = () => {
    if (!builderResult) {
      notify("ابتدا با دکمه «ساخت گزارش»، خروجی را بسازید.", "warning");
      return;
    }
    const item: SavedReport = {
      id: `sr-${Date.now()}`,
      name: `${builderModule} بر اساس ${builderGroupBy} (${builderMetric})`,
      module: builderModule,
      groupBy: builderGroupBy,
      schedule: "بدون زمان‌بندی",
      lastRun: "هم‌اکنون",
      format: "Excel",
    };
    setSaved((prev) => [item, ...prev]);
    notify(`گزارش «${item.name}» ذخیره شد و از بخش گزارش‌های ذخیره‌شده قابل اجراست.`);
  };

  const runSaved = (r: SavedReport) => {
    setSaved((prev) => prev.map((s) => (s.id === r.id ? { ...s, lastRun: "هم‌اکنون" } : s)));
    notify(`گزارش «${r.name}» اجرا شد و خروجی ${r.format} آماده دانلود است.`, "success");
  };

  const doExport = (format: (typeof exportFormats)[number]) => {
    setExportOpen(false);
    notify(`خروجی ${format} داشبورد برای بازه «${period}» آماده شد.`, "success");
  };

  const savedColumns: Column<SavedReport>[] = [
    { key: "name", label: "نام گزارش", render: (r) => <span className="font-medium text-ink-900">{r.name}</span> },
    { key: "module", label: "ماژول" },
    { key: "groupBy", label: "گروه‌بندی" },
    { key: "schedule", label: "زمان‌بندی ارسال", render: (r) => <Badge tone={scheduleTone[r.schedule]} icon={<CalendarClock size={11} />}>{r.schedule}</Badge> },
    { key: "lastRun", label: "آخرین اجرا" },
    { key: "format", label: "قالب" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button variant="ghost" size="sm" icon={<PlayCircle size={13} />} onClick={() => runSaved(r)}>
          اجرا
        </Button>
      ),
    },
  ];

  const kpis = useMemo(
    () => [
      { label: "پروژه‌های فعال", value: projects.length, icon: <KanbanSquare size={16} />, tone: "brand" as const },
      { label: "قراردادهای جاری", value: contracts.filter((c) => c.stage === "در حال اجرا").length, icon: <FileSignature size={16} />, tone: "success" as const },
      { label: "طرح‌های صندوق", value: funds.length, icon: <PiggyBank size={16} />, tone: "warning" as const },
      { label: "فراخوان‌های پژوهشی", value: researchOpportunities.length, icon: <FlaskConical size={16} />, tone: "neutral" as const },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="گزارش‌گیری پیشرفته"
        description="گزارش تجمیعی بر اساس معاونت، نوع پروژه، وضعیت و بازه‌ی زمانی برای داشبورد مدیریتی"
        icon={<BarChart3 size={18} />}
        actions={
          <div className="relative">
            <Button variant="secondary" icon={<Download size={14} />} onClick={() => setExportOpen((v) => !v)}>
              خروجی Excel/PDF
            </Button>
            {exportOpen && (
              <div className="absolute left-0 top-full mt-1 card p-1 z-20 min-w-[140px]">
                {exportFormats.map((f) => (
                  <button key={f} onClick={() => doExport(f)} className="w-full text-right text-xs px-3 py-2 rounded-md hover:bg-ink-50 text-ink-700">
                    خروجی {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} tone={k.tone} />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-5">
        <ListFilter size={14} className="text-ink-400" />
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              period === p ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
            <Building2 size={15} className="text-brand-600" /> فعالیت بر اساس معاونت
          </h3>
          <div className="space-y-3">
            {reportByDepartment.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-600">{d.label}</span>
                  <span className="text-ink-400">{d.value}</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(d.value / maxDept) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold mb-4 text-ink-900">وضعیت پروژه‌ها و وظایف</h3>
          <div className="space-y-3">
            {reportByStatus.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <Badge tone={s.tone as BadgeTone}>{s.label}</Badge>
                <div className="flex-1 mx-3 h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      s.tone === "success" ? "bg-emerald-500" : s.tone === "danger" ? "bg-rose-500" : s.tone === "brand" ? "bg-brand-600" : "bg-ink-400"
                    }`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
                <span className="text-xs text-ink-500 w-8 text-left">{s.value}٪</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
            <FileSignature size={15} className="text-brand-600" /> قیف قراردادها (تعداد و ارزش هر مرحله)
          </h3>
          <div className="space-y-3">
            {contractFunnel.map((f) => (
              <div key={f.stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-600">{f.stage}</span>
                  <span className="text-ink-400">{f.count} قرارداد · {f.value}</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-navy-700 rounded-full" style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
            <Building2 size={15} className="text-brand-600" /> مقایسه هلدینگ‌ها و مجموعه‌ها
          </h3>
          <div className="space-y-4">
            {holdingComparison.map((h) => (
              <div key={h.label}>
                <p className="text-xs text-ink-600 mb-1.5">{h.label}</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-400 w-14 shrink-0">پروژه</span>
                    <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(h.projects / maxHolding) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-ink-400 w-5">{h.projects}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-400 w-14 shrink-0">قرارداد</span>
                    <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full bg-navy-700 rounded-full" style={{ width: `${(h.contracts / maxHolding) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-ink-400 w-5">{h.contracts}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-400 w-14 shrink-0">طرح صندوق</span>
                    <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(h.funds / maxHolding) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-ink-400 w-5">{h.funds}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-bold mb-5 text-ink-900">روند فعالیت ماهانه</h3>
        <div className="flex items-end gap-3 h-40">
          {monthlyActivity.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-ink-100 rounded-md flex items-end" style={{ height: "100%" }}>
                <div className="w-full bg-brand-600 rounded-md transition-all" style={{ height: `${(m.value / maxMonthly) * 100}%` }} />
              </div>
              <span className="text-[11px] text-ink-400">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 mb-4 overflow-x-auto">
        <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
          <Table2 size={15} className="text-brand-600" /> ماتریس معاونت × وضعیت
        </h3>
        <table className="table-shell min-w-[520px]">
          <thead>
            <tr>
              <th>معاونت</th>
              {crossTabStatuses.map((s) => (
                <th key={s}>{s}</th>
              ))}
              <th>جمع</th>
            </tr>
          </thead>
          <tbody>
            {crossTabRows.map((row) => (
              <tr key={row.dept}>
                <td className="font-medium text-ink-900">{row.dept}</td>
                {row.values.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
                <td className="font-medium">{row.values.reduce((a, b) => a + b, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-bold mb-1 text-ink-900 flex items-center gap-1.5">
          <Filter size={15} className="text-brand-600" /> گزارش‌ساز
        </h3>
        <p className="text-xs text-ink-400 mb-4">ماژول، نوع گروه‌بندی و متریک را انتخاب کنید؛ خروجی برای بازه‌ی «{period}» ساخته می‌شود.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">ماژول</label>
            <select value={builderModule} onChange={(e) => setBuilderModule(e.target.value as (typeof builderModules)[number])} className="input-field">
              {builderModules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">گروه‌بندی بر اساس</label>
            <select value={builderGroupBy} onChange={(e) => setBuilderGroupBy(e.target.value as (typeof builderGroupings)[number])} className="input-field">
              {builderGroupings.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">متریک</label>
            <select value={builderMetric} onChange={(e) => setBuilderMetric(e.target.value as (typeof builderMetrics)[number])} className="input-field">
              {builderMetrics.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={<PlayCircle size={13} />} onClick={buildReport}>ساخت گزارش</Button>
          <Button variant="secondary" size="sm" icon={<Save size={13} />} onClick={saveBuiltReport}>ذخیره در گزارش‌های من</Button>
        </div>

        {builderResult && (
          <div className="mt-4 border-t border-ink-100 pt-4">
            <div className="space-y-3">
              {builderResult.map((r) => {
                const maxCount = Math.max(...builderResult.map((x) => x.count));
                return (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink-600">{r.label}</span>
                      <span className="text-ink-400">{r.extra}</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
          <CalendarClock size={15} className="text-brand-600" /> گزارش‌های ذخیره‌شده و زمان‌بندی‌شده
        </h3>
      </div>
      <DataTable columns={savedColumns} rows={saved} searchKeys={["name", "module"]} searchPlaceholder="جستجو در گزارش‌ها…" />
    </div>
  );
}
