// ---------------------------------------------------------------------------
// ویجت داشبورد — گزارش‌هایی که با «افزودن به داشبورد» سنجاق شده‌اند، به‌صورت نمودار کوچک.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Filter, LayoutDashboard, Maximize2, PinOff, Share2 } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { useToast } from "../components/ui/ToastProvider";
import { ReportChart } from "./charts";
import { runReport, rangeText, faNum } from "./engine";
import { useSourceRows } from "./sources";
import { reportStore, useSavedReports } from "./store";
import { ReportBuilderModal } from "./ModuleReportsButton";
import { moduleLabel, presetLabel, type DataSource, type FilterSpec, type GlobalFilter, type ReportSpec } from "./types";
import { DrillDrawer, type DrillPick } from "./DrillDrawer";

const PERSON_FIELDS = ["assignee", "member", "owner", "manager", "author", "user", "organizer", "requester", "createdBy", "decidedBy", "sender", "applicant"];

/** اعمال فیلتر سراسری داشبورد (بازه، پروژه، فرد) روی پیکربندی یک گزارش — هرجا منبع فیلد مناسب داشته باشد */
export function applyGlobalFilter(spec: ReportSpec, source: DataSource | undefined, gf?: GlobalFilter): { spec: ReportSpec; applied: string[]; skipped: string[] } {
  if (!gf || !source) return { spec, applied: [], skipped: [] };
  const applied: string[] = [];
  const skipped: string[] = [];
  let next: ReportSpec = spec;
  const extra: FilterSpec[] = [];
  if (gf.range.preset !== "all") {
    const df = spec.dateField ?? source.defaultDateField ?? source.fields.find((f) => f.type === "date")?.key;
    if (df) {
      next = { ...next, dateField: df, dateRange: gf.range };
      applied.push(gf.range.preset === "custom" ? "بازه‌ی دلخواه" : presetLabel[gf.range.preset]);
    } else skipped.push("بازه");
  }
  if (gf.project) {
    const pf = source.fields.find((f) => f.key === "project") ?? (source.id === "projects.projects" ? source.fields.find((f) => f.key === "name") : undefined);
    if (pf) {
      extra.push({ id: "gf-project", field: pf.key, op: "eq", value: gf.project });
      applied.push(gf.project);
    } else skipped.push("پروژه");
  }
  if (gf.person) {
    const pf = PERSON_FIELDS.map((k) => source.fields.find((f) => f.key === k)).find(Boolean);
    if (pf) {
      extra.push({ id: "gf-person", field: pf.key, op: "eq", value: gf.person });
      applied.push(gf.person);
    } else skipped.push("فرد");
  }
  if (extra.length) next = { ...next, filters: [...next.filters, ...extra] };
  return { spec: next, applied, skipped };
}

export function PinnedCard({ spec: base, onOpen, filter, className = "" }: { spec: ReportSpec; onOpen: () => void; filter?: GlobalFilter; className?: string }) {
  const { rows, available, today, source } = useSourceRows(base.sourceId);
  const { actingUser } = useTenancy();
  const { notify } = useToast();
  const [pick, setPick] = useState<DrillPick | null>(null);
  const { spec, applied, skipped } = useMemo(() => applyGlobalFilter(base, source, filter), [base, source, filter]);
  const result = useMemo(() => (source && available ? runReport(spec, source, rows, today) : null), [spec, source, rows, today, available]);
  const own = spec.createdBy === actingUser.id;
  return (
    <div className={`card p-3.5 flex flex-col gap-2 min-w-0 h-full ${className}`}>
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
      {(applied.length > 0 || skipped.length > 0) && (
        <p className="text-[10.5px] flex items-center gap-1 flex-wrap -mt-1">
          <Filter size={10} className="text-brand-500 shrink-0" />
          {applied.length > 0 && <span className="text-brand-700">{applied.join(" · ")}</span>}
          {skipped.length > 0 && <span className="text-ink-400">({skipped.join("، ")} برای این منبع اعمال‌پذیر نیست)</span>}
        </p>
      )}
      <div className="min-h-[150px]">
        {!available ? (
          <p className="text-xs text-ink-400 text-center py-10">منبع داده‌ی این گزارش به‌زودی فعال می‌شود.</p>
        ) : result ? (
          <ReportChart result={result} chart={spec.chart} mini height={170} onPick={setPick} />
        ) : (
          <p className="text-xs text-ink-400 text-center py-10">منبع داده‌ی این گزارش در دسترس نیست.</p>
        )}
      </div>
      <DrillDrawer pick={pick} source={source} onClose={() => setPick(null)} />
    </div>
  );
}

/** گزارش‌های سنجاق‌شده‌ی قابل مشاهده برای کاربر فعلی */
export function usePinnedReports() {
  const saved = useSavedReports();
  return useMemo(() => saved.filter((r) => r.pinned), [saved]);
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
