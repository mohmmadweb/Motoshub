// اجزای مانیتورینگ مالی و فروش (قرارداد C8) — صفحه‌ی «مانیتورینگ» (WP5) زبانه‌های «مالی» و «فروش»
// را با همین‌ها می‌سازد؛ در «پرونده مشتریان» هم استفاده می‌شوند.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, CircleAlert, Clock, Handshake, Target, TrendingUp, XCircle } from "lucide-react";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import ListRow, { List } from "../../components/ui/ListRow";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import StatusBar from "../../components/ui/StatusBar";
import Note from "../../components/ui/Note";
import { useFinanceMonitoring, useOffice, useSalesMonitoring } from "../../context/OfficeContext";
import { weightedOf } from "../../office/ledger";
import { financeDirectionLabel, financeFormLabel, type FinancialDocument } from "../../office/types";
import { rial, rialShort, toFa } from "../../office/util";

export { useFinanceMonitoring, useSalesMonitoring } from "../../context/OfficeContext";

/** چهار سبد قطعی/احتمالی + درآمد معوقه و فهرست معوقه/احتمالی؛ فیلتر برچسب مالی */
export function FinanceMonitor({ onOpenDoc, compact, label: fixedLabel }: { onOpenDoc?: (d: FinancialDocument) => void; compact?: boolean; /** برچسب از بیرون (فیلتر صفحه)؛ با آن انتخابگر داخلی پنهان می‌شود */ label?: string }) {
  const o = useOffice();
  const [ownLabel, setLabel] = useState("");
  const label = fixedLabel ?? ownLabel;
  const m = useFinanceMonitoring(label ? { labels: [label] } : undefined);
  if (!m.allowed) return <Note tone="info">مانیتورینگ مالی به مجوز «مشاهده‌ی اسناد مالی» نیاز دارد.</Note>;
  const t = m.totals;
  const docRow = (x: (typeof m.overdue)[number]) => {
    const href = `/customers/${x.doc.customer}?tab=finance&doc=${x.doc.id}`;
    return (
      <ListRow
        key={x.doc.id}
        priority={x.bucket === "overdue" ? "زیاد" : undefined}
        title={`${financeDirectionLabel[x.doc.direction]} ${financeFormLabel[x.doc.form]} · ${rial(x.doc.amount_rial)}`}
        subtitle={`${x.customer?.name ?? ""}${x.doc.description ? ` · ${x.doc.description}` : ""}`}
        due={`سررسید ${toFa(x.doc.due_date ?? x.doc.date)}`}
        {...(onOpenDoc ? { onClick: () => onOpenDoc(x.doc) } : { href })}
      />
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="t-section text-ink-900">مانیتورینگ مالی</h2>
        {fixedLabel === undefined && <select className="input-field !w-44" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="برچسب مالی">
          <option value="">همه‌ی برچسب‌ها</option>
          {o.labelsOf("finance").map((l) => (
            <option key={l.id}>{l.title}</option>
          ))}
        </select>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="دریافت قطعی" value={rialShort(t.definite_in)} icon={<ArrowDownLeft />} tone="success" />
        <StatCard label="پرداخت قطعی" value={rialShort(t.definite_out)} icon={<ArrowUpRight />} tone="brand" />
        <StatCard label="دریافت احتمالی" value={rialShort(t.probable_in)} icon={<Clock />} tone="neutral" />
        <StatCard label="پرداخت احتمالی" value={rialShort(t.probable_out)} icon={<Clock />} tone="neutral" />
        <StatCard label="درآمد معوقه" value={rialShort(t.overdue_in)} hint={t.overdue_out ? `پرداخت معوقه ${rialShort(t.overdue_out)}` : undefined} icon={<CircleAlert />} tone="danger" />
      </div>
      <Card title="خالص قطعی" description="دریافت قطعی منهای پرداخت قطعی">
        <p className={`t-kpi ${t.balance < 0 ? "text-rose-700" : "text-ink-900"}`}>{rial(t.balance)}</p>
        <StatusBar
          className="mt-3"
          segments={[
            { label: "دریافت قطعی", value: Math.round(t.definite_in / 1e6), tone: "success" },
            { label: "دریافت احتمالی", value: Math.round(t.probable_in / 1e6), tone: "accent" },
            { label: "معوقه", value: Math.round(t.overdue_in / 1e6), tone: "danger" },
          ]}
        />
        <p className="cap mt-1">ارقام نوار به میلیون ریال</p>
      </Card>
      {!compact && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="درآمدهای معوقه" flush>
            {m.overdue.filter((x) => x.doc.direction === "receipt").length ? <List>{m.overdue.filter((x) => x.doc.direction === "receipt").map(docRow)}</List> : <div className="p-4"><EmptyState title="دریافت معوقه‌ای نیست" compact /></div>}
          </Card>
          <Card title="دریافت و پرداخت‌های احتمالی" flush>
            {m.probable.length ? <List>{m.probable.sort((a, b) => ((a.doc.due_date ?? a.doc.date) < (b.doc.due_date ?? b.doc.date) ? -1 : 1)).map(docRow)}</List> : <div className="p-4"><EmptyState title="مورد احتمالی ثبت نشده" compact /></div>}
          </Card>
        </div>
      )}
    </div>
  );
}

/** فروش‌های موفق و فرصت‌های احتمالی (ارزش × احتمال) + همه‌ی فرصت‌ها به ازای هر احتمال */
export function SalesMonitor({ onOpen, compact }: { onOpen?: (oppId: number, customerId: number) => void; compact?: boolean }) {
  const o = useOffice();
  const m = useSalesMonitoring();
  if (!m.allowed) return <Note tone="info">مانیتورینگ فروش به مجوز پرونده‌ی مشتریان نیاز دارد.</Note>;
  const t = m.totals;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="t-section text-ink-900">مانیتورینگ فروش</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="فروش‌های موفق" value={rialShort(t.won_value)} hint={`${toFa(t.won_count)} فرصت`} icon={<Handshake />} tone="success" />
        <StatCard label="فروش احتمالی (وزنی)" value={rialShort(t.open_weighted)} hint={`از ارزش ${rialShort(t.open_value)}`} icon={<TrendingUp />} tone="brand" />
        <StatCard label="فرصت‌های باز" value={toFa(t.open_count)} icon={<Target />} tone="neutral" />
        <StatCard label="ناموفق" value={rialShort(t.lost_value)} hint={`${toFa(t.lost_count)} فرصت`} icon={<XCircle />} tone="danger" />
      </div>
      <Card title="فرصت‌های باز به ازای هر احتمال" flush>
        {m.byProbability.length ? (
          <div className="table-wrap !border-0 overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>احتمال</th>
                  <th>تعداد</th>
                  <th>ارزش</th>
                  <th>ارزش وزنی</th>
                  {!compact && <th className="max-md:hidden">فرصت‌ها</th>}
                </tr>
              </thead>
              <tbody>
                {m.byProbability.map((g) => (
                  <tr key={g.probability}>
                    <td>
                      <Badge tone={g.probability >= 70 ? "success" : g.probability >= 40 ? "warning" : "neutral"}>{toFa(g.probability)}٪</Badge>
                    </td>
                    <td>{toFa(g.items.length)}</td>
                    <td className="whitespace-nowrap">{rialShort(g.value)}</td>
                    <td className="whitespace-nowrap font-bold">{rialShort(g.weighted)}</td>
                    {!compact && (
                      <td className="max-md:hidden">
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          {g.items.map((x) =>
                            onOpen ? (
                              <button key={x.id} type="button" className="text-[var(--color-link)] hover:underline text-start" onClick={() => onOpen(x.id, x.customer)}>
                                {x.title}
                              </button>
                            ) : (
                              <Link key={x.id} to={`/customers/${x.customer}?tab=opportunities&opp=${x.id}`} className="text-[var(--color-link)] hover:underline">
                                {x.title}
                              </Link>
                            ),
                          )}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState title="فرصت بازی نیست" compact />
          </div>
        )}
      </Card>
      {!compact && m.topOpen.length > 0 && (
        <Card title="بیشترین ارزش وزنی" flush>
          <List>
            {m.topOpen.map((x) => (
              <ListRow
                key={x.id}
                title={x.title}
                subtitle={`${o.state.customers.find((c) => c.id === x.customer)?.name ?? ""} · ${o.nameOf(x.owner_id)}`}
                badges={<Badge size="sm">{toFa(x.probability)}٪</Badge>}
                due={rialShort(weightedOf(x))}
                {...(onOpen ? { onClick: () => onOpen(x.id, x.customer) } : { href: `/customers/${x.customer}?tab=opportunities&opp=${x.id}` })}
              />
            ))}
          </List>
        </Card>
      )}
    </div>
  );
}
