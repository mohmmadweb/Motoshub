// ---------------------------------------------------------------------------
// گزارش‌ساز پویا — پنل پیکربندی (منبع، شاخص‌ها، ابعاد، فیلترها، بازه، نوع نمایش،
// مرتب‌سازی) + پیش‌نمایش زنده، قالب‌های آماده، گزارش‌های ذخیره‌شده، CSV، چاپ/PDF
// و «افزودن به داشبورد».
// ---------------------------------------------------------------------------
import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Table2,
  BarChart3,
  ChartColumnStacked,
  TrendingUp,
  PieChart as PieIcon,
  Donut,
  Gauge,
  Grid3x3,
  Pin,
  PinOff,
  Copy,
  Share2,
  Lock,
  Printer,
  Download,
  Save,
  SlidersHorizontal,
  Sparkles,
  FolderOpen,
  Plus,
  X,
  Trash2,
  Filter,
  CalendarRange,
  Sigma,
  Rows3,
  Info,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Database,
  FilePlus2,
  Clock3,
} from "lucide-react";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Toggle from "../components/ui/Toggle";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useTenancy } from "../context/TenancyContext";
import {
  COUNT_FIELD,
  aggLabel,
  bucketLabel,
  chartLabel,
  moduleLabel,
  opLabel,
  presetLabel,
  type Agg,
  type ChartType,
  type DataSource,
  type DatePreset,
  type Field,
  type FilterOp,
  type FilterSpec,
  type FilterValue,
  type MeasureSpec,
  type ReportModule,
  type ReportPreset,
  type ReportSpec,
  type Row,
} from "./types";
import { aggsFor, distinctValues, downloadFile, faNum, fieldOf, measureLabel, rangeText, resolveRange, runReport, safeFileName, toCSV } from "./engine";
import { useSourceRows, useSources, getSource } from "./sources";
import { PRESETS } from "./presets";
import { newReportId, reportStore, useSavedReports } from "./store";
import { ReportChart, ResultTable, colorAt } from "./charts";

// ----------------------------------------------------------------- ثابت‌ها

export const chartIcon: Record<ChartType, typeof Table2> = {
  table: Table2,
  bar: BarChart3,
  stackedBar: ChartColumnStacked,
  line: TrendingUp,
  pie: PieIcon,
  donut: Donut,
  kpi: Gauge,
  pivot: Grid3x3,
};
const CHARTS: ChartType[] = ["bar", "stackedBar", "line", "pie", "donut", "kpi", "table", "pivot"];
const PRESET_ORDER: DatePreset[] = ["all", "thisWeek", "thisMonth", "payroll", "last30", "last90", "quarter", "year", "custom"];
const TOP_N = [0, 5, 10, 15, 20, 30];
const sel = "input-field !py-1.5 !text-xs";

function opsFor(f?: Field): FilterOp[] {
  if (!f || f.kind === "bool") return ["eq"];
  if (f.kind === "number") return ["eq", "neq", "gt", "lt", "between", "isEmpty"];
  if (f.kind === "date") return ["gt", "lt", "between", "isEmpty", "notEmpty"];
  return ["eq", "neq", "in", "contains", "isEmpty", "notEmpty"];
}
const opText = (op: FilterOp, f?: Field) => (f?.kind === "date" && op === "gt" ? "بعد از" : f?.kind === "date" && op === "lt" ? "قبل از" : opLabel[op]);
const defaultValue = (op: FilterOp, f?: Field): FilterValue => (f?.kind === "bool" ? true : op === "in" ? [] : op === "between" ? ["", ""] : "");

function aggText(agg: Agg, f?: Field) {
  if (f?.kind === "bool") return agg === "avg" ? "درصد «بله»" : "تعداد «بله»";
  return agg === "distinct" ? "تعداد یکتا" : aggLabel[agg];
}

const nextId = (prefix: string, ids: string[]) => {
  let i = 1;
  while (ids.includes(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
};

/** پیکربندی پیش‌فرض یک منبع */
function blankFor(source: DataSource): Pick<ReportSpec, "sourceId" | "dimensions" | "measures" | "filters" | "dateField" | "dateRange" | "bucket" | "sort" | "limit" | "others" | "chart"> {
  const firstDim = source.fields.find((f) => f.type === "dimension" && f.kind === "string" && !f.multi) ?? source.fields.find((f) => f.type !== "measure");
  return {
    sourceId: source.id,
    dimensions: firstDim ? [firstDim.key] : [],
    measures: [{ id: "m1", field: COUNT_FIELD, agg: "count" }],
    filters: [],
    dateField: source.defaultDateField,
    dateRange: { preset: "all" },
    bucket: "month",
    sort: { by: "m1", dir: "desc" },
    limit: 0,
    others: false,
    chart: "bar",
  };
}

// ----------------------------------------------------------------- اجزای کوچک

function Section({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="py-3.5 border-b border-ink-100 last:border-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-[11.5px] font-bold text-ink-600 flex items-center gap-1.5">
          <span className="text-brand-600">{icon}</span>
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function FieldOptions({ fields, kinds }: { fields: Field[]; kinds: ("dimension" | "date" | "measure")[] }) {
  const groups: { t: "dimension" | "date" | "measure"; label: string }[] = [
    { t: "dimension", label: "ابعاد" },
    { t: "date", label: "تاریخ‌ها" },
    { t: "measure", label: "شاخص‌های عددی" },
  ];
  return (
    <>
      {groups
        .filter((g) => kinds.includes(g.t))
        .map((g) => {
          const fs = fields.filter((f) => f.type === g.t);
          return fs.length ? (
            <optgroup key={g.t} label={g.label}>
              {fs.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
    </>
  );
}

function IconBtn({ title, onClick, children, active, disabled, danger }: { title: string; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "bg-brand-50 border-brand-200 text-brand-700" : danger ? "border-transparent text-ink-500 hover:bg-rose-50 hover:text-rose-600" : "border-ink-200 text-ink-600 hover:bg-ink-50"
      }`}
    >
      {children}
    </button>
  );
}

// ----------------------------------------------------------------- فیلتر

function FilterValueInput({ f, field, rows, onChange }: { f: FilterSpec; field?: Field; rows: Row[]; onChange: (v: FilterValue) => void }) {
  const values = useMemo(() => (field && field.kind === "string" ? distinctValues(rows, field) : []), [rows, field]);
  if (!field || f.op === "isEmpty" || f.op === "notEmpty") return null;
  if (field.kind === "bool")
    return (
      <select className={sel} value={f.value === false ? "false" : "true"} onChange={(e) => onChange(e.target.value === "true")}>
        <option value="true">بله</option>
        <option value="false">خیر</option>
      </select>
    );
  if (field.kind === "date") {
    if (f.op === "between") {
      const [a, b] = Array.isArray(f.value) ? (f.value as string[]) : ["", ""];
      return (
        <div className="grid grid-cols-2 gap-1.5">
          <JalaliDatePicker value={a ?? ""} onChange={(v) => onChange([v, b ?? ""])} placeholder="از" />
          <JalaliDatePicker value={b ?? ""} onChange={(v) => onChange([a ?? "", v])} placeholder="تا" />
        </div>
      );
    }
    return <JalaliDatePicker value={typeof f.value === "string" ? f.value : ""} onChange={(v) => onChange(v)} />;
  }
  if (field.kind === "number") {
    if (f.op === "between") {
      const [a, b] = Array.isArray(f.value) ? (f.value as string[]) : ["", ""];
      return (
        <div className="grid grid-cols-2 gap-1.5">
          <input className={sel} type="number" placeholder="از" value={a ?? ""} onChange={(e) => onChange([e.target.value, b ?? ""])} />
          <input className={sel} type="number" placeholder="تا" value={b ?? ""} onChange={(e) => onChange([a ?? "", e.target.value])} />
        </div>
      );
    }
    return <input className={sel} type="number" placeholder="مقدار" value={typeof f.value === "number" || typeof f.value === "string" ? String(f.value) : ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
  }
  if (f.op === "contains") return <input className={sel} placeholder="بخشی از متن…" value={typeof f.value === "string" ? f.value : ""} onChange={(e) => onChange(e.target.value)} />;
  if (f.op === "in") {
    const chosen = Array.isArray(f.value) ? (f.value as string[]) : [];
    return (
      <div className="max-h-32 overflow-y-auto rounded-lg border border-ink-200 p-1.5 space-y-0.5">
        {values.length === 0 && <p className="text-[11px] text-ink-400 p-1">مقداری وجود ندارد.</p>}
        {values.map((v) => (
          <label key={v} className="flex items-center gap-2 text-xs text-ink-700 px-1 py-0.5 rounded hover:bg-ink-50 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[var(--color-brand-600)]"
              checked={chosen.includes(v)}
              onChange={() => onChange(chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v])}
            />
            <span className="truncate">{v}</span>
          </label>
        ))}
      </div>
    );
  }
  if (values.length > 300) return <input className={sel} placeholder="مقدار" value={typeof f.value === "string" ? f.value : ""} onChange={(e) => onChange(e.target.value)} />;
  return (
    <select className={sel} value={typeof f.value === "string" ? f.value : ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">انتخاب مقدار…</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

// ----------------------------------------------------------------- پنل پیکربندی

function ConfigPanel({
  spec,
  up,
  sources,
  source,
  rows,
  today,
  onSource,
}: {
  spec: ReportSpec;
  up: (p: Partial<ReportSpec>) => void;
  sources: DataSource[];
  source?: DataSource;
  rows: Row[];
  today: string;
  onSource: (id: string) => void;
}) {
  const fields = source?.fields ?? [];
  const dimFields = fields.filter((f) => f.type !== "measure");
  const dateFields = fields.filter((f) => f.kind === "date");
  const usesDate = spec.dimensions.some((k) => fieldOf(source, k)?.kind === "date");
  const rr = resolveRange(spec.dateRange, today);

  // ---- شاخص‌ها
  const setMeasure = (i: number, patch: Partial<MeasureSpec>) => up({ measures: spec.measures.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const addMeasure = () => {
    const firstNum = fields.find((f) => f.kind === "number");
    const id = nextId("m", spec.measures.map((m) => m.id));
    up({ measures: [...spec.measures, firstNum ? { id, field: firstNum.key, agg: aggsFor(firstNum)[0] } : { id, field: COUNT_FIELD, agg: "count" }] });
  };
  const removeMeasure = (i: number) => {
    const gone = spec.measures[i];
    const measures = spec.measures.filter((_, j) => j !== i);
    up({ measures, sort: spec.sort.by === gone.id ? { by: measures[0]?.id ?? "label", dir: "desc" } : spec.sort });
  };

  // ---- ابعاد
  const setDim = (i: 0 | 1, key: string) => {
    const d = [...spec.dimensions];
    if (i === 0) {
      if (!key) return up({ dimensions: [], chart: spec.chart === "pivot" || spec.chart === "stackedBar" ? "bar" : spec.chart });
      d[0] = key;
      if (d[1] === key) d.splice(1, 1);
    } else {
      if (!key) d.splice(1, 1);
      else d[1] = key;
    }
    const isDate = fieldOf(source, key)?.kind === "date";
    up({ dimensions: d.filter(Boolean), ...(i === 0 && isDate ? { sort: { by: "label", dir: "asc" as const }, dateField: spec.dateField ?? key } : {}) });
  };

  // ---- فیلترها
  const setFilter = (i: number, patch: Partial<FilterSpec>) => up({ filters: spec.filters.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const addFilter = () => {
    const f0 = dimFields.find((f) => f.kind === "string") ?? fields[0];
    if (!f0) return;
    const op = opsFor(f0)[0];
    up({ filters: [...spec.filters, { id: nextId("f", spec.filters.map((f) => f.id)), field: f0.key, op, value: defaultValue(op, f0) }] });
  };

  // ---- نوع نمایش
  const pickChart = (c: ChartType) => {
    if (c === "pivot" && spec.dimensions.length < 2) {
      const first = spec.dimensions[0] ?? dimFields.find((f) => f.kind === "string")?.key;
      const second = dimFields.find((f) => f.key !== first && f.kind !== "date" && !f.multi)?.key;
      up({ chart: c, dimensions: [first, second].filter(Boolean) as string[] });
      return;
    }
    if ((c === "bar" || c === "stackedBar" || c === "pie" || c === "donut" || c === "line") && spec.dimensions.length === 0) {
      const first = (c === "line" ? dateFields[0]?.key : undefined) ?? dimFields.find((f) => f.kind === "string")?.key;
      up({ chart: c, dimensions: first ? [first] : [], ...(c === "line" && first ? { sort: { by: "label", dir: "asc" as const }, dateField: spec.dateField ?? first } : {}) });
      return;
    }
    up({ chart: c });
  };

  return (
    <div className="px-1">
      <Section icon={<Database size={13} />} title="منبع داده">
        <select className={sel} value={spec.sourceId} onChange={(e) => onSource(e.target.value)}>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
              {s.placeholder ? " (به‌زودی)" : ""}
            </option>
          ))}
        </select>
        {source?.description && <p className="text-[11px] text-ink-400 mt-1.5 leading-5">{source.description}</p>}
      </Section>

      <Section icon={<BarChart3 size={13} />} title="نوع نمایش">
        <div className="grid grid-cols-4 gap-1.5">
          {CHARTS.map((c) => {
            const Icon = chartIcon[c];
            const on = spec.chart === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => pickChart(c)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10.5px] leading-4 transition-colors ${
                  on ? "border-brand-300 bg-brand-50 text-brand-700 font-medium" : "border-ink-200 text-ink-600 hover:bg-ink-50"
                }`}
              >
                <Icon size={16} />
                <span className="text-center">{chartLabel[c]}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        icon={<Sigma size={13} />}
        title="شاخص‌ها"
        action={
          spec.measures.length < 4 && (
            <button type="button" onClick={addMeasure} className="text-[11px] text-brand-700 hover:underline flex items-center gap-0.5">
              <Plus size={12} /> افزودن
            </button>
          )
        }
      >
        <div className="space-y-1.5">
          {spec.measures.map((m, i) => {
            const f = fieldOf(source, m.field);
            return (
              <div key={m.id} className="flex items-center gap-1.5">
                <span className="w-2 h-6 rounded-sm shrink-0" style={{ background: colorAt(i) }} />
                <select
                  className={`${sel} flex-1 min-w-0`}
                  value={m.field}
                  onChange={(e) => {
                    const nf = fieldOf(source, e.target.value);
                    setMeasure(i, { field: e.target.value, agg: e.target.value === COUNT_FIELD ? "count" : aggsFor(nf)[0], label: undefined });
                  }}
                >
                  <option value={COUNT_FIELD}>تعداد {source?.rowNoun ?? "رکورد"}</option>
                  <FieldOptions fields={fields} kinds={["measure", "dimension", "date"]} />
                </select>
                {m.field !== COUNT_FIELD && (
                  <select className={`${sel} !w-[104px] shrink-0`} value={m.agg} onChange={(e) => setMeasure(i, { agg: e.target.value as Agg, label: undefined })}>
                    {aggsFor(f).map((a) => (
                      <option key={a} value={a}>
                        {aggText(a, f)}
                      </option>
                    ))}
                  </select>
                )}
                <IconBtn title="حذف شاخص" onClick={() => removeMeasure(i)} disabled={spec.measures.length === 1} danger>
                  <X size={14} />
                </IconBtn>
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={<Rows3 size={13} />} title="گروه‌بندی">
        <div className="space-y-1.5">
          <label className="block">
            <span className="text-[11px] text-ink-500">گروه‌بندی بر اساس</span>
            <select className={`${sel} mt-0.5`} value={spec.dimensions[0] ?? ""} onChange={(e) => setDim(0, e.target.value)}>
              <option value="">بدون گروه‌بندی (فقط جمع کل)</option>
              <FieldOptions fields={dimFields} kinds={["dimension", "date"]} />
            </select>
          </label>
          {spec.dimensions[0] && (
            <label className="block">
              <span className="text-[11px] text-ink-500">تفکیک بر اساس (اختیاری)</span>
              <select className={`${sel} mt-0.5`} value={spec.dimensions[1] ?? ""} onChange={(e) => setDim(1, e.target.value)}>
                <option value="">بدون تفکیک</option>
                <FieldOptions fields={dimFields.filter((f) => f.key !== spec.dimensions[0])} kinds={["dimension", "date"]} />
              </select>
            </label>
          )}
          {usesDate && (
            <div className="flex items-center gap-1 pt-1">
              <span className="text-[11px] text-ink-500 ml-1">دسته‌بندی زمانی:</span>
              {(["day", "week", "month"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => up({ bucket: b })}
                  className={`text-[11px] px-2 py-1 rounded-md border ${spec.bucket === b ? "bg-navy-800 text-white border-navy-800" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
                >
                  {bucketLabel[b]}
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section
        icon={<Filter size={13} />}
        title={`فیلترها${spec.filters.length ? ` (${faNum(spec.filters.length)})` : ""}`}
        action={
          <button type="button" onClick={addFilter} className="text-[11px] text-brand-700 hover:underline flex items-center gap-0.5">
            <Plus size={12} /> افزودن
          </button>
        }
      >
        {spec.filters.length === 0 && <p className="text-[11px] text-ink-400">همه‌ی ردیف‌ها در گزارش حساب می‌شوند.</p>}
        <div className="space-y-2">
          {spec.filters.map((f, i) => {
            const field = fieldOf(source, f.field);
            return (
              <div key={f.id} className="rounded-lg bg-ink-50 border border-ink-100 p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <select
                    className={`${sel} flex-1 min-w-0`}
                    value={f.field}
                    onChange={(e) => {
                      const nf = fieldOf(source, e.target.value);
                      const op = opsFor(nf)[0];
                      setFilter(i, { field: e.target.value, op, value: defaultValue(op, nf) });
                    }}
                  >
                    <FieldOptions fields={fields} kinds={["dimension", "date", "measure"]} />
                  </select>
                  <IconBtn title="حذف فیلتر" onClick={() => up({ filters: spec.filters.filter((_, j) => j !== i) })} danger>
                    <Trash2 size={13} />
                  </IconBtn>
                </div>
                {field?.kind !== "bool" && (
                  <select className={sel} value={f.op} onChange={(e) => setFilter(i, { op: e.target.value as FilterOp, value: defaultValue(e.target.value as FilterOp, field) })}>
                    {opsFor(field).map((op) => (
                      <option key={op} value={op}>
                        {opText(op, field)}
                      </option>
                    ))}
                  </select>
                )}
                <FilterValueInput f={f} field={field} rows={rows} onChange={(v) => setFilter(i, { value: v })} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={<CalendarRange size={13} />} title="بازه‌ی زمانی">
        {dateFields.length === 0 ? (
          <p className="text-[11px] text-ink-400">این منبع فیلد تاریخ ندارد.</p>
        ) : (
          <div className="space-y-2">
            <select className={sel} value={spec.dateField ?? ""} onChange={(e) => up({ dateField: e.target.value || undefined })}>
              <option value="">بدون محدودیت زمانی</option>
              {dateFields.map((f) => (
                <option key={f.key} value={f.key}>
                  بر اساس «{f.label}»
                </option>
              ))}
            </select>
            {spec.dateField && (
              <>
                <div className="flex flex-wrap gap-1">
                  {PRESET_ORDER.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => up({ dateRange: p === "custom" ? { preset: p, from: rr.fromLabel ?? today, to: rr.toLabel ?? today } : { preset: p } })}
                      className={`text-[11px] px-2 py-1 rounded-md border ${spec.dateRange.preset === p ? "bg-navy-800 text-white border-navy-800" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
                    >
                      {presetLabel[p]}
                    </button>
                  ))}
                </div>
                {spec.dateRange.preset === "custom" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <JalaliDatePicker value={spec.dateRange.from ?? ""} onChange={(v) => up({ dateRange: { ...spec.dateRange, from: v } })} placeholder="از تاریخ" />
                    <JalaliDatePicker value={spec.dateRange.to ?? ""} onChange={(v) => up({ dateRange: { ...spec.dateRange, to: v } })} placeholder="تا تاریخ" />
                  </div>
                )}
                {spec.dateRange.preset !== "all" && (
                  <p className="text-[11px] text-ink-500 flex items-center gap-1">
                    <Clock3 size={11} /> {rangeText(rr)}
                    {spec.dateRange.preset === "payroll" && <span className="text-ink-400">(۲۶ ماه قبل تا ۲۵ ماه جاری)</span>}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Section>

      <Section icon={<ArrowDownWideNarrow size={13} />} title="مرتب‌سازی و محدودیت">
        <div className="flex items-center gap-1.5">
          <select className={`${sel} flex-1 min-w-0`} value={spec.sort.by} onChange={(e) => up({ sort: { ...spec.sort, by: e.target.value } })}>
            <option value="label">ترتیب طبیعی / الفبایی</option>
            {spec.measures.map((m) => (
              <option key={m.id} value={m.id}>
                {measureLabel(m, source)}
              </option>
            ))}
          </select>
          <IconBtn title={spec.sort.dir === "desc" ? "نزولی" : "صعودی"} onClick={() => up({ sort: { ...spec.sort, dir: spec.sort.dir === "desc" ? "asc" : "desc" } })}>
            {spec.sort.dir === "desc" ? <ArrowDownWideNarrow size={14} /> : <ArrowUpNarrowWide size={14} />}
          </IconBtn>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-ink-500 shrink-0">نمایش</span>
          <select className={`${sel} !w-auto`} value={spec.limit} onChange={(e) => up({ limit: Number(e.target.value) })}>
            {TOP_N.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "همه‌ی گروه‌ها" : `${faNum(n)} مورد برتر`}
              </option>
            ))}
          </select>
          {spec.limit > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-ink-600 mr-auto">
              <Toggle on={!!spec.others} onChange={() => up({ others: !spec.others })} label="جمع بقیه در «سایر»" />
              «سایر»
            </label>
          )}
        </div>
      </Section>
    </div>
  );
}

// ----------------------------------------------------------------- چاپ

function printPreview(el: HTMLElement | null, title: string, meta: string) {
  if (!el) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) {
    window.print();
    return;
  }
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("\n");
  w.document.open();
  w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title>${styles}
<style>
  html,body{background:#fff !important;}
  body{padding:28px;color:#14171d;}
  .rp-head{border-bottom:2px solid #1f4f99;padding-bottom:10px;margin-bottom:18px;}
  .rp-head h1{font-size:18px;font-weight:700;margin:0 0 4px;}
  .rp-head p{font-size:11px;color:#5b6678;margin:0;}
  .rp-foot{margin-top:24px;font-size:10px;color:#5b6678;border-top:1px solid #dde1e6;padding-top:8px;}
  .no-print{display:none !important;}
  svg{max-width:100%;height:auto;}
  @page{size:A4;margin:12mm;}
</style></head><body>
<div class="rp-head"><h1>${esc(title)}</h1><p>${esc(meta)}</p></div>
<div>${el.innerHTML}</div>
<div class="rp-foot">تهیه‌شده با گزارش‌ساز موتوشاب</div>
</body></html>`);
  w.document.close();
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    w.focus();
    w.print();
  };
  w.addEventListener("load", go);
  setTimeout(go, 900);
}

// ----------------------------------------------------------------- پیش‌نمایش

function Preview({
  spec,
  setName,
  source,
  rows,
  available,
  today,
  dirty,
  isSaved,
  own,
  canExport,
  onSave,
  onSaveAsNew,
  onPin,
  onShare,
  onOpenConfig,
}: {
  spec: ReportSpec;
  setName: (n: string) => void;
  source?: DataSource;
  rows: Row[];
  available: boolean;
  today: string;
  dirty: boolean;
  isSaved: boolean;
  own: boolean;
  canExport: boolean;
  onSave: () => void;
  onSaveAsNew: () => void;
  onPin: () => void;
  onShare: () => void;
  onOpenConfig: () => void;
}) {
  const { activeScopeLabel, scopeLabel } = useTenancy();
  const printRef = useRef<HTMLDivElement>(null);
  const result = useMemo(() => (source ? runReport(spec, source, rows, today) : null), [spec, source, rows, today]);
  const showData = result && !["table", "pivot", "kpi"].includes(spec.chart) && result.dims.length > 0;
  const metaText = result ? `${source?.label} · ${rangeText(result.range)} · ${faNum(result.rowCount)} ${source?.rowNoun ?? "رکورد"} · دامنه: ${activeScopeLabel} · تاریخ گزارش: ${today}` : "";

  const exportCsv = () => {
    if (!result) return;
    downloadFile(`${safeFileName(spec.name)}.csv`, toCSV(result));
  };

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex-1 min-w-[180px]">
            <input
              value={spec.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام گزارش"
              aria-label="نام گزارش"
              className="w-full bg-transparent text-[15px] font-bold text-ink-900 rounded-md px-1.5 py-1 -mx-1.5 border border-transparent hover:border-ink-200 focus:border-brand-400 outline-none"
            />
            <p className="text-[11px] text-ink-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{source?.label}</span>
              {result && (
                <>
                  <span className="text-ink-300">•</span>
                  <span>{rangeText(result.range)}</span>
                  <span className="text-ink-300">•</span>
                  <span>
                    {faNum(result.rowCount)} از {faNum(result.totalRows)} {source?.rowNoun ?? "رکورد"}
                  </span>
                </>
              )}
              {isSaved && (
                <>
                  <span className="text-ink-300">•</span>
                  {spec.shared === "scope" ? (
                    <span className="inline-flex items-center gap-1 text-brand-700">
                      <Share2 size={11} /> اشتراکی با {scopeLabel(spec.scope)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Lock size={11} /> خصوصی
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="secondary" size="sm" className="lg:hidden" icon={<SlidersHorizontal size={14} />} onClick={onOpenConfig}>
              تنظیمات
            </Button>
            <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={onSave} disabled={isSaved && own && !dirty}>
              {isSaved && own ? (dirty ? "ذخیره‌ی تغییرات" : "ذخیره شد") : "ذخیره"}
            </Button>
            {isSaved && (
              <IconBtn title="ذخیره به‌عنوان گزارش جدید" onClick={onSaveAsNew}>
                <Copy size={14} />
              </IconBtn>
            )}
            <IconBtn title={spec.pinned ? "برداشتن از داشبورد" : "افزودن به داشبورد"} onClick={onPin} active={spec.pinned && own}>
              {spec.pinned && own ? <PinOff size={14} /> : <Pin size={14} />}
            </IconBtn>
            {isSaved && own && (
              <IconBtn title={spec.shared === "scope" ? "خصوصی کردن" : `اشتراک با اعضای «${activeScopeLabel}»`} onClick={onShare} active={spec.shared === "scope"}>
                <Share2 size={14} />
              </IconBtn>
            )}
            <IconBtn title={canExport ? "خروجی CSV (اکسل)" : "دسترسی دریافت خروجی ندارید"} onClick={exportCsv} disabled={!canExport || !result?.rowCount}>
              <Download size={14} />
            </IconBtn>
            <IconBtn title={canExport ? "چاپ / ذخیره‌ی PDF" : "دسترسی دریافت خروجی ندارید"} onClick={() => printPreview(printRef.current, spec.name, metaText)} disabled={!canExport || !result?.rowCount}>
              <Printer size={14} />
            </IconBtn>
          </div>
        </div>

        <div className="mt-4" ref={printRef}>
          {!available ? (
            <div className="flex flex-col items-center text-center gap-2 py-12">
              <span className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock3 size={22} />
              </span>
              <Badge tone="warning">به‌زودی</Badge>
              <p className="text-sm font-medium text-ink-800">منبع «{source?.label}» هنوز راه‌اندازی نشده است</p>
              <p className="text-xs text-ink-400 max-w-sm leading-6">به‌محض راه‌اندازی این بخش، داده‌هایش به‌صورت خودکار در همین گزارش‌ساز در دسترس خواهد بود. می‌توانید از همین حالا گزارش را پیکربندی و ذخیره کنید.</p>
            </div>
          ) : result ? (
            <>
              <ReportChart result={result} chart={spec.chart} />
              {showData && (
                <div className="hidden print:block mt-5">
                  <ResultTable result={result} />
                </div>
              )}
            </>
          ) : null}
        </div>
        {result && result.notes.length > 0 && (
          <p className="mt-3 text-[11px] text-amber-700 flex items-start gap-1">
            <Info size={12} className="mt-0.5 shrink-0" />
            {result.notes.join(" ")}
          </p>
        )}
      </div>

      {available && showData && result && (
        <details className="card group">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-ink-700 flex items-center gap-1.5">
            <Table2 size={13} className="text-brand-600" /> داده‌های گزارش
            <span className="text-ink-400 font-normal">({faNum(result.groups.length)} ردیف)</span>
          </summary>
          <div className="px-2 pb-3">
            <ResultTable result={result} />
          </div>
        </details>
      )}

      <p className="text-[11px] text-ink-400 flex items-start gap-1.5 px-1">
        <Info size={12} className="mt-0.5 shrink-0" />
        فقط داده‌هایی تجمیع شده که شما در دامنه‌ی «{activeScopeLabel}» و با سطح دسترسی فعلی‌تان اجازه‌ی دیدنش را دارید.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------- قالب‌های آماده

function PresetCard({ preset, onPick }: { preset: ReportPreset; onPick: () => void }) {
  const { rows, available, today, source } = useSourceRows(preset.sourceId);
  const spec = preset as unknown as ReportSpec;
  const result = useMemo(() => (source && available ? runReport(spec, source, rows, today) : null), [spec, source, rows, today, available]);
  const Icon = chartIcon[preset.chart];
  return (
    <button type="button" onClick={onPick} className="card p-3.5 text-right flex flex-col gap-2 hover:border-brand-300 hover:shadow-md transition-all group min-w-0">
      <div className="flex items-start gap-2.5 w-full">
        <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink-900 leading-5 group-hover:text-brand-700">{preset.name}</p>
          <p className="text-[11px] text-ink-500 leading-5 mt-0.5 line-clamp-2">{preset.description}</p>
        </div>
      </div>
      <div className="h-[132px] w-full overflow-hidden pointer-events-none rounded-lg bg-ink-50/60 px-2 pt-2" aria-hidden>
        {!available ? (
          <div className="h-full flex items-center justify-center">
            <Badge tone="warning">به‌زودی</Badge>
          </div>
        ) : result ? (
          <ReportChart result={result} chart={preset.chart} mini height={124} />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 w-full text-[11px] text-ink-400">
        <span className="truncate">{source?.label}</span>
        <span className="text-brand-700 font-medium shrink-0">استفاده از قالب ←</span>
      </div>
    </button>
  );
}

// ----------------------------------------------------------------- گزارش‌های ذخیره‌شده

function SavedList({ module, onOpen, activeId }: { module: ReportModule; onOpen: (r: ReportSpec) => void; activeId?: string }) {
  const saved = useSavedReports(module);
  const { actingUser, activeScopeLabel, scopeLabel, contextId } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  if (!saved.length)
    return (
      <div className="card p-10 flex flex-col items-center text-center gap-2">
        <span className="w-12 h-12 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center">
          <FolderOpen size={22} />
        </span>
        <p className="text-sm font-medium text-ink-700">هنوز گزارشی ذخیره نشده است</p>
        <p className="text-xs text-ink-400 max-w-sm">از «قالب‌های آماده» شروع کنید یا گزارش خودتان را بسازید و ذخیره کنید؛ گزارش‌های اشتراکی همکاران هم اینجا دیده می‌شوند.</p>
      </div>
    );
  const sorted = [...saved].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  return (
    <div className="card divide-y divide-ink-100">
      {sorted.map((r) => {
        const Icon = chartIcon[r.chart];
        const own = r.createdBy === actingUser.id;
        const src = getSource(r.sourceId);
        return (
          <div key={r.id} className={`flex items-center gap-2.5 px-3 py-2.5 ${activeId === r.id ? "bg-brand-50/50" : "hover:bg-ink-50"}`}>
            <button type="button" onClick={() => onOpen(r)} className="flex items-center gap-2.5 flex-1 min-w-0 text-right">
              <span className="w-8 h-8 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink-900 truncate">{r.name}</span>
                <span className="block text-[11px] text-ink-400 truncate">
                  {src?.label ?? r.sourceId} · {chartLabel[r.chart]} · {own ? "ساخته‌ی شما" : r.createdByName ?? "همکار"}
                  {r.updatedAt ? ` · ${r.updatedAt}` : ` · ${r.createdAt}`}
                </span>
              </span>
            </button>
            <span className="hidden sm:flex items-center gap-1 shrink-0">
              {r.pinned && (
                <Badge tone="brand" icon={<Pin size={10} />}>
                  داشبورد
                </Badge>
              )}
              {r.shared === "scope" ? <Badge icon={<Share2 size={10} />}>{scopeLabel(r.scope)}</Badge> : <Badge icon={<Lock size={10} />}>خصوصی</Badge>}
            </span>
            {own && (
              <IconBtn
                title={r.pinned ? "برداشتن از داشبورد" : "افزودن به داشبورد"}
                active={r.pinned}
                onClick={() => {
                  reportStore.patch(r.id, { pinned: !r.pinned });
                  notify(r.pinned ? "از داشبورد برداشته شد." : "به داشبورد اضافه شد.", "success");
                }}
              >
                <Pin size={14} />
              </IconBtn>
            )}
            <IconBtn
              title="تکثیر"
              onClick={() => {
                const copy: ReportSpec = { ...r, id: newReportId(), name: `${r.name} (کپی)`, createdBy: actingUser.id, createdByName: actingUser.name, createdAt: r.createdAt, updatedAt: undefined, scope: contextId, shared: "private", pinned: false };
                reportStore.upsert(copy);
                notify(`نسخه‌ای از «${r.name}» ساخته شد.`, "success");
              }}
            >
              <Copy size={14} />
            </IconBtn>
            {own && (
              <IconBtn
                title={r.shared === "scope" ? "خصوصی کردن" : `اشتراک با اعضای «${activeScopeLabel}»`}
                active={r.shared === "scope"}
                onClick={() => {
                  const shared = r.shared === "scope" ? "private" : "scope";
                  reportStore.patch(r.id, { shared, scope: shared === "scope" ? contextId : r.scope });
                  notify(shared === "scope" ? `گزارش با اعضای «${activeScopeLabel}» و زیرمجموعه‌ها به اشتراک گذاشته شد.` : "گزارش خصوصی شد.", "info");
                }}
              >
                <Share2 size={14} />
              </IconBtn>
            )}
            {own && (
              <IconBtn
                title="حذف"
                danger
                onClick={() =>
                  confirm({
                    title: `حذف گزارش «${r.name}»؟`,
                    message: r.shared === "scope" ? "این گزارش برای همکاران هم حذف می‌شود." : undefined,
                    confirmLabel: "حذف گزارش",
                    onConfirm: () => {
                      reportStore.remove(r.id);
                      notify("گزارش حذف شد.", "info");
                    },
                  })
                }
              >
                <Trash2 size={14} />
              </IconBtn>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------- برگه‌ی تنظیمات موبایل

function ConfigSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] lg:hidden" dir="rtl">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[86vh] bg-white rounded-t-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
          <span className="w-10 h-1 rounded-full bg-ink-200 absolute top-1.5 left-1/2 -translate-x-1/2" />
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <SlidersHorizontal size={15} className="text-brand-600" /> تنظیمات گزارش
          </h3>
          <Button size="sm" variant="primary" onClick={onClose}>
            نمایش نتیجه
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ----------------------------------------------------------------- گزارش‌ساز

export type ReportBuilderProps = {
  module: ReportModule;
  defaultSourceId?: string;
  /** باز کردن مستقیم یک گزارش ذخیره‌شده */
  initialReportId?: string;
};

export function ReportBuilder({ module, defaultSourceId, initialReportId }: ReportBuilderProps) {
  const { actingUser, contextId, today: tToday, hasPermission } = useTenancy();
  const { notify } = useToast();
  const sources = useSources(module);
  const saved = useSavedReports(module);
  const presets = PRESETS[module] ?? [];

  const ownerFields = () => ({ createdBy: actingUser.id, createdByName: actingUser.name, createdAt: tToday, scope: contextId, shared: "private" as const, pinned: false });
  const fromPreset = (p: ReportPreset): ReportSpec => {
    const { presetId: _omit, ...rest } = p;
    void _omit;
    return { ...rest, id: "", ...ownerFields() };
  };

  const [spec, setSpec] = useState<ReportSpec>(() => {
    const found = initialReportId ? reportStore.all().find((r) => r.id === initialReportId) : undefined;
    if (found) return found;
    const p = presets.find((x) => !defaultSourceId || x.sourceId === defaultSourceId) ?? presets[0];
    if (p) return fromPreset(p);
    const src = sources.find((s) => s.id === defaultSourceId) ?? sources[0];
    return { id: "", name: "گزارش جدید", module, ...(src ? blankFor(src) : { sourceId: "", dimensions: [], measures: [], filters: [], dateRange: { preset: "all" }, bucket: "month", sort: { by: "label", dir: "asc" }, limit: 0, chart: "bar" }), ...ownerFields() };
  });
  const [view, setView] = useState<"build" | "presets" | "saved">("build");
  const [sheet, setSheet] = useState(false);

  const { rows, available, today, source } = useSourceRows(spec.sourceId);
  const stored = saved.find((r) => r.id === spec.id);
  const isSaved = !!stored;
  const own = spec.createdBy === actingUser.id;
  const dirty = useMemo(() => {
    if (!stored) return true;
    const strip = (r: ReportSpec) => JSON.stringify({ ...r, pinned: false, shared: "", updatedAt: "", scope: "" });
    return strip(stored) !== strip(spec);
  }, [stored, spec]);

  const up = (p: Partial<ReportSpec>) => setSpec((s) => ({ ...s, ...p }));
  const onSource = (id: string) => {
    const src = sources.find((s) => s.id === id);
    if (src) up(blankFor(src));
  };

  const save = (asNew = false) => {
    const name = spec.name.trim() || "گزارش بی‌نام";
    if (isSaved && own && !asNew) {
      const next = { ...spec, name, updatedAt: tToday };
      reportStore.upsert(next);
      setSpec(next);
      notify(`گزارش «${name}» به‌روزرسانی شد.`, "success");
      return next;
    }
    const next: ReportSpec = { ...spec, ...ownerFields(), id: newReportId(), name: asNew && isSaved ? `${name} (نسخه‌ی جدید)` : name, pinned: false };
    reportStore.upsert(next);
    setSpec(next);
    notify(`گزارش «${next.name}» ذخیره شد و در «گزارش‌های ذخیره‌شده» در دسترس است.`, "success");
    return next;
  };

  const togglePin = () => {
    if (isSaved && own) {
      const pinned = !spec.pinned;
      reportStore.patch(spec.id, { pinned });
      setSpec((s) => ({ ...s, pinned }));
      notify(pinned ? "گزارش به داشبورد اضافه شد." : "گزارش از داشبورد برداشته شد.", "success");
      return;
    }
    const next: ReportSpec = { ...spec, ...ownerFields(), id: newReportId(), name: spec.name.trim() || "گزارش بی‌نام", pinned: true };
    reportStore.upsert(next);
    setSpec(next);
    notify(`گزارش «${next.name}» ذخیره و به داشبورد اضافه شد.`, "success");
  };

  const toggleShare = () => {
    if (!isSaved || !own) return;
    const shared = spec.shared === "scope" ? "private" : "scope";
    reportStore.patch(spec.id, { shared, scope: shared === "scope" ? contextId : spec.scope });
    setSpec((s) => ({ ...s, shared, scope: shared === "scope" ? contextId : s.scope }));
    notify(shared === "scope" ? "گزارش با اعضای این واحد و زیرمجموعه‌هایش به اشتراک گذاشته شد." : "گزارش خصوصی شد.", "info");
  };

  const newReport = () => {
    const src = source ?? sources[0];
    if (!src) return;
    setSpec({ id: "", name: "گزارش جدید", module, ...blankFor(src), ...ownerFields() });
    setView("build");
  };

  const panel = <ConfigPanel spec={spec} up={up} sources={sources} source={source} rows={rows} today={today} onSource={onSource} />;
  const tabs = [
    { id: "build" as const, label: "ساخت گزارش", icon: SlidersHorizontal },
    { id: "presets" as const, label: "قالب‌های آماده", icon: Sparkles, count: presets.length },
    { id: "saved" as const, label: "ذخیره‌شده‌ها", icon: FolderOpen, count: saved.length },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 gap-3" dir="rtl">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-100 overflow-x-auto min-w-0" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={view === t.id}
              onClick={() => setView(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${view === t.id ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"}`}
            >
              <t.icon size={13} />
              {t.label}
              {t.count !== undefined && t.count > 0 && <span className="text-[10px] rounded-full px-1.5 bg-ink-200/70 text-ink-600">{faNum(t.count)}</span>}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mr-auto shrink-0" icon={<FilePlus2 size={14} />} onClick={newReport}>
          <span className="hidden sm:inline">گزارش جدید</span>
        </Button>
      </div>

      {view === "build" && (
        <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-4">
          <aside className="hidden lg:block min-h-0 overflow-y-auto card px-3 py-1">{panel}</aside>
          <div className="min-h-0 overflow-y-auto min-w-0 pb-2">
            <Preview
              spec={spec}
              setName={(name) => up({ name })}
              source={source}
              rows={rows}
              available={available}
              today={today}
              dirty={dirty}
              isSaved={isSaved}
              own={own}
              canExport={hasPermission("reports.export")}
              onSave={() => save(false)}
              onSaveAsNew={() => save(true)}
              onPin={togglePin}
              onShare={toggleShare}
              onOpenConfig={() => setSheet(true)}
            />
          </div>
          <ConfigSheet open={sheet} onClose={() => setSheet(false)}>
            {panel}
          </ConfigSheet>
        </div>
      )}

      {view === "presets" && (
        <div className="flex-1 min-h-0 overflow-y-auto pb-2">
          <p className="text-xs text-ink-500 mb-3">گزارش‌های حرفه‌ای آماده برای «{moduleLabel[module]}» — با انتخاب هر قالب، می‌توانید آن را تغییر دهید و به نام خودتان ذخیره کنید.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {presets.map((p) => (
              <PresetCard
                key={p.presetId}
                preset={p}
                onPick={() => {
                  setSpec(fromPreset(p));
                  setView("build");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {view === "saved" && (
        <div className="flex-1 min-h-0 overflow-y-auto pb-2">
          <SavedList
            module={module}
            activeId={spec.id}
            onOpen={(r) => {
              setSpec(r);
              setView("build");
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ReportBuilder;
