import { useState } from "react";
import { BarChart3, Download, Building2, ListFilter } from "lucide-react";
import { reportByDepartment, reportByStatus, monthlyActivity } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Badge, { type BadgeTone } from "../components/ui/Badge";

const periods = ["این هفته", "این ماه", "سه‌ماهه", "سال جاری"];

export default function Reports() {
  const [period, setPeriod] = useState(periods[1]);
  const maxMonthly = Math.max(...monthlyActivity.map((m) => m.value));
  const maxDept = Math.max(...reportByDepartment.map((d) => d.value));

  return (
    <div>
      <PageHeader
        title="گزارش‌گیری پیشرفته"
        description="گزارش تجمیعی بر اساس معاونت، نوع پروژه، وضعیت و بازه‌ی زمانی برای داشبورد مدیریتی"
        icon={<BarChart3 size={18} />}
        actions={
          <Button variant="secondary" icon={<Download size={14} />}>
            خروجی Excel/PDF
          </Button>
        }
      />

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

      <div className="card p-5">
        <h3 className="text-sm font-bold mb-5 text-ink-900">روند فعالیت ماهانه</h3>
        <div className="flex items-end gap-3 h-40">
          {monthlyActivity.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-ink-100 rounded-md flex items-end" style={{ height: "100%" }}>
                <div
                  className="w-full bg-brand-600 rounded-md transition-all"
                  style={{ height: `${(m.value / maxMonthly) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-ink-400">{m.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
