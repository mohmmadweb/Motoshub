// ---------------------------------------------------------------------------
// ویجت داشبورد — گزارش‌هایی که با «افزودن به داشبورد» سنجاق شده‌اند، به‌صورت نمودار کوچک.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { LayoutDashboard, Maximize2, PinOff, Share2 } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { useToast } from "../components/ui/ToastProvider";
import { ReportChart } from "./charts";
import { runReport, rangeText, faNum } from "./engine";
import { useSourceRows } from "./sources";
import { reportStore, useSavedReports } from "./store";
import { ReportBuilderModal } from "./ModuleReportsButton";
import { moduleLabel, type ReportSpec } from "./types";

function PinnedCard({ spec, onOpen }: { spec: ReportSpec; onOpen: () => void }) {
  const { rows, available, today, source } = useSourceRows(spec.sourceId);
  const { actingUser } = useTenancy();
  const { notify } = useToast();
  const result = useMemo(() => (source && available ? runReport(spec, source, rows, today) : null), [spec, source, rows, today, available]);
  const own = spec.createdBy === actingUser.id;
  return (
    <div className="card p-3.5 flex flex-col gap-2 min-w-0">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-right group">
          <p className="text-[13px] font-bold text-ink-900 truncate group-hover:text-brand-700">{spec.name}</p>
          <p className="text-[11px] text-ink-400 truncate flex items-center gap-1">
            {spec.shared === "scope" && <Share2 size={10} className="shrink-0" />}
            {moduleLabel[spec.module]} · {result ? rangeText(result.range) : source?.label}
            {result ? ` · ${faNum(result.rowCount)} ${source?.rowNoun ?? "رکورد"}` : ""}
          </p>
        </button>
        <button type="button" onClick={onOpen} title="باز کردن در گزارش‌ساز" aria-label="باز کردن در گزارش‌ساز" className="w-7 h-7 rounded-md hover:bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
          <Maximize2 size={13} />
        </button>
        {own && (
          <button
            type="button"
            onClick={() => {
              reportStore.patch(spec.id, { pinned: false });
              notify(`«${spec.name}» از داشبورد برداشته شد.`, "info");
            }}
            title="برداشتن از داشبورد"
            aria-label="برداشتن از داشبورد"
            className="w-7 h-7 rounded-md hover:bg-ink-100 text-ink-500 flex items-center justify-center shrink-0"
          >
            <PinOff size={13} />
          </button>
        )}
      </div>
      <div className="min-h-[150px]">
        {!available ? (
          <p className="text-xs text-ink-400 text-center py-10">منبع داده‌ی این گزارش به‌زودی فعال می‌شود.</p>
        ) : result ? (
          <ReportChart result={result} chart={spec.chart} mini height={170} />
        ) : (
          <p className="text-xs text-ink-400 text-center py-10">منبع داده‌ی این گزارش در دسترس نیست.</p>
        )}
      </div>
    </div>
  );
}

export function PinnedReports({ title = "گزارش‌های داشبورد", hideWhenEmpty = false, max }: { title?: string; hideWhenEmpty?: boolean; max?: number }) {
  const saved = useSavedReports();
  const pinned = saved.filter((r) => r.pinned);
  const list = max ? pinned.slice(0, max) : pinned;
  const [open, setOpen] = useState<ReportSpec | null>(null);

  if (!pinned.length && hideWhenEmpty) return null;
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
          <LayoutDashboard size={15} className="text-brand-600" /> {title}
          {pinned.length > 0 && <span className="text-[10px] rounded-full px-1.5 bg-ink-100 text-ink-500 font-normal">{faNum(pinned.length)}</span>}
        </h3>
      </div>
      {!pinned.length ? (
        <div className="card p-5 text-center text-xs text-ink-500 leading-6">
          هنوز گزارشی به داشبورد اضافه نکرده‌اید. در «گزارش‌ساز» هر بخش (پروژه‌ها، دانش، محتوا، اعضا و …) گزارش دلخواه را بسازید و دکمه‌ی «افزودن به داشبورد» را بزنید.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((r) => (
            <PinnedCard key={r.id} spec={r} onOpen={() => setOpen(r)} />
          ))}
        </div>
      )}
      {open && <ReportBuilderModal open onClose={() => setOpen(null)} module={open.module} initialReportId={open.id} />}
    </section>
  );
}

export default PinnedReports;
