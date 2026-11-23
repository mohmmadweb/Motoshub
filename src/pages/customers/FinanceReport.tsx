// گزارش عملکرد مالی: جدول مبالغ ثبت‌شده، سالانه و ماهانه با ریز اسناد هر ماه، فیلتر برچسب، نمودار.
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Receipt } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Tabs from "../../components/ui/Tabs";
import { BarChart, PieChart } from "../../reports/charts";
import { useOffice } from "../../context/OfficeContext";
import { bucketOf, monthTable, yearTable, yearsOf, type PeriodRow } from "../../office/ledger";
import { bucketLabel, financeDirectionLabel, financeFormLabel, type FinancialDocument } from "../../office/types";
import { LabelChips } from "../../office/ui";
import { rial, rialShort, toFa } from "../../office/util";
import { monthNames } from "../../pm/jalali";
import { bucketTone } from "./FinanceDocSheet";

const money = (n: number) => (n ? rialShort(n) : "—");

/** جدول اسناد (ریز اسناد ماه یا همه‌ی اسناد) */
export function FinanceDocsTable({ docs, onOpen, showCustomer = true }: { docs: FinancialDocument[]; onOpen: (d: FinancialDocument) => void; showCustomer?: boolean }) {
  const o = useOffice();
  if (!docs.length) return <EmptyState icon={<Receipt />} title="سندی نیست" compact />;
  return (
    <div className="table-wrap overflow-x-auto">
      <table className="table-shell">
        <thead>
          <tr>
            <th>تاریخ</th>
            {showCustomer && <th>مشتری</th>}
            <th>نوع</th>
            <th>مبلغ</th>
            <th className="max-md:hidden">سررسید</th>
            <th>وضعیت</th>
            <th className="max-md:hidden">شرح</th>
            <th className="max-md:hidden">برچسب‌ها</th>
          </tr>
        </thead>
        <tbody>
          {[...docs]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((d) => {
              const b = bucketOf(d);
              return (
                <tr key={d.id} className="cursor-pointer" onClick={() => onOpen(d)}>
                  <td className="whitespace-nowrap">{toFa(d.date)}</td>
                  {showCustomer && <td>{o.state.customers.find((c) => c.id === d.customer)?.name}</td>}
                  <td className="whitespace-nowrap">
                    {financeDirectionLabel[d.direction]} · {financeFormLabel[d.form]}
                  </td>
                  <td className={`whitespace-nowrap font-bold ${d.status === "cancelled" ? "line-through text-ink-400" : d.direction === "receipt" ? "text-emerald-700" : "text-ink-900"}`}>{rial(d.amount_rial)}</td>
                  <td className="max-md:hidden whitespace-nowrap">{d.due_date ? toFa(d.due_date) : "—"}</td>
                  <td>
                    <Badge tone={bucketTone[b]} size="sm" dot>
                      {bucketLabel[b]}
                    </Badge>
                  </td>
                  <td className="max-md:hidden max-w-[16rem] truncate">{d.description || "—"}</td>
                  <td className="max-md:hidden">
                    <LabelChips ns="finance" labels={d.labels} />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function PeriodTable({ rows, labelOf, open, onToggle, onOpenDoc }: { rows: PeriodRow[]; labelOf: (k: number) => string; open: number | null; onToggle: (k: number) => void; onOpenDoc: (d: FinancialDocument) => void }) {
  const sum = rows.reduce(
    (s, r) => ({ di: s.di + r.definite_in, do: s.do + r.definite_out, pi: s.pi + r.probable_in, po: s.po + r.probable_out, ov: s.ov + r.overdue_in }),
    { di: 0, do: 0, pi: 0, po: 0, ov: 0 },
  );
  return (
    <div className="table-wrap overflow-x-auto">
      <table className="table-shell">
        <thead>
          <tr>
            <th>دوره</th>
            <th>دریافت قطعی</th>
            <th>پرداخت قطعی</th>
            <th>خالص</th>
            <th className="max-md:hidden">دریافت احتمالی</th>
            <th className="max-md:hidden">پرداخت احتمالی</th>
            <th>معوقه</th>
            <th className="max-md:hidden">اسناد</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.key}>
              <tr className={r.count ? "cursor-pointer" : ""} onClick={() => r.count && onToggle(r.key)} aria-expanded={open === r.key}>
                <td className="whitespace-nowrap font-medium text-ink-900">
                  <span className="inline-flex items-center gap-1">
                    {r.count ? open === r.key ? <ChevronDown size={16} /> : <ChevronLeft size={16} /> : <span className="w-4" />}
                    {labelOf(r.key)}
                  </span>
                </td>
                <td className="text-emerald-700 whitespace-nowrap">{money(r.definite_in)}</td>
                <td className="whitespace-nowrap">{money(r.definite_out)}</td>
                <td className={`whitespace-nowrap font-bold ${r.balance < 0 ? "text-rose-700" : "text-ink-900"}`}>{r.definite_in || r.definite_out ? rialShort(r.balance) : "—"}</td>
                <td className="max-md:hidden whitespace-nowrap">{money(r.probable_in)}</td>
                <td className="max-md:hidden whitespace-nowrap">{money(r.probable_out)}</td>
                <td className={`whitespace-nowrap ${r.overdue_in ? "text-rose-700 font-bold" : ""}`}>{money(r.overdue_in + r.overdue_out)}</td>
                <td className="max-md:hidden">{r.count ? toFa(r.count) : "—"}</td>
              </tr>
              {open === r.key && (
                <tr>
                  <td colSpan={8} className="!p-3 bg-ink-50">
                    <p className="text-xs text-ink-500 mb-2">ریز اسناد {labelOf(r.key)}</p>
                    <FinanceDocsTable docs={r.docs} onOpen={onOpenDoc} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td>جمع</td>
            <td className="text-emerald-700 whitespace-nowrap">{money(sum.di)}</td>
            <td className="whitespace-nowrap">{money(sum.do)}</td>
            <td className="whitespace-nowrap">{rialShort(sum.di - sum.do)}</td>
            <td className="max-md:hidden whitespace-nowrap">{money(sum.pi)}</td>
            <td className="max-md:hidden whitespace-nowrap">{money(sum.po)}</td>
            <td className="whitespace-nowrap">{money(sum.ov)}</td>
            <td className="max-md:hidden" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function FinanceReport({ docs, onOpenDoc }: { docs: FinancialDocument[]; onOpenDoc: (d: FinancialDocument) => void }) {
  const years = yearsOf(docs);
  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
  const [year, setYear] = useState(years[0] ?? 1405);
  const [open, setOpen] = useState<number | null>(null);
  const months = useMemo(() => monthTable(docs, year), [docs, year]);
  const yearly = useMemo(() => yearTable(docs), [docs]);
  const active = docs.filter((d) => d.status === "active");
  const byLabel = useMemo(() => {
    const m = new Map<string, number>();
    active.filter((d) => d.direction === "receipt").forEach((d) => (d.labels.length ? d.labels : ["بدون برچسب"]).forEach((l) => m.set(l, (m.get(l) ?? 0) + d.amount_rial)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [active]);
  const palette = ["var(--color-teal-500)", "var(--color-info)", "var(--color-success)", "var(--color-warning)", "var(--color-danger)", "var(--color-ink-400)"];

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="گزارش عملکرد مالی"
        flush
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              tabs={[
                { id: "monthly", label: "ماهانه" },
                { id: "yearly", label: "سالانه" },
              ]}
              active={mode}
              onChange={(m) => {
                setMode(m);
                setOpen(null);
              }}
              variant="pill"
              className=""
            />
            {mode === "monthly" && (
              <select className="input-field !h-8 !w-24 !text-[13px]" value={year} onChange={(e) => { setYear(Number(e.target.value)); setOpen(null); }} aria-label="سال">
                {(years.length ? years : [1405]).map((y) => (
                  <option key={y} value={y}>
                    {toFa(y)}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
      >
        <div className="p-4">
          {mode === "monthly" ? (
            <PeriodTable rows={months} labelOf={(m) => `${monthNames[m - 1]} ${toFa(year)}`} open={open} onToggle={(k) => setOpen((x) => (x === k ? null : k))} onOpenDoc={onOpenDoc} />
          ) : (
            <PeriodTable rows={yearly} labelOf={(y) => `سال ${toFa(y)}`} open={open} onToggle={(k) => setOpen((x) => (x === k ? null : k))} onOpenDoc={onOpenDoc} />
          )}
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <Card title={`نمودار ماهانه‌ی ${toFa(year)}`}>
          <BarChart
            cats={months.map((m) => ({ label: monthNames[m.key - 1] }))}
            series={[
              { label: "دریافت قطعی", color: "var(--color-success)", values: months.map((m) => m.definite_in), format: "rial" },
              { label: "پرداخت قطعی", color: "var(--color-info)", values: months.map((m) => m.definite_out), format: "rial" },
              { label: "احتمالی", color: "var(--color-teal-300)", values: months.map((m) => m.probable_in), format: "rial" },
              { label: "معوقه", color: "var(--color-danger)", values: months.map((m) => m.overdue_in), format: "rial" },
            ]}
            orientation="vertical"
          />
        </Card>
        <Card title="دریافت‌ها به تفکیک برچسب">
          {byLabel.length ? <PieChart donut format="rial" slices={byLabel.map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }))} /> : <p className="text-sm text-ink-500">داده‌ای نیست.</p>}
        </Card>
      </div>
    </div>
  );
}
