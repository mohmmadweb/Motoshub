// ---------------------------------------------------------------------------
// «منابع به کجا رفته» — تخصیص در برابر پرداخت، به تفکیک هلدینگ/شرکت/پروژه/فرصت
// منابع: صندوق نوآور، طرح‌های اشتغال، قراردادهای فناورانه، فراخوان‌های پژوهشی، فرصت مطالعاتی
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Landmark, PiggyBank, Wallet } from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import Button from "../../components/ui/Button";
import { useTenancy } from "../../context/TenancyContext";
import { useInnovation } from "../../context/InnovationContext";
import { downloadText, faN, rialShort, toCsv, toRial } from "../../innovation/util";
import { FilterChips } from "./shared";

type Src = "صندوق نوآور" | "صندوق اشتغال" | "قرارداد" | "فراخوان پژوهشی" | "فرصت مطالعاتی";
const SOURCES: Src[] = ["صندوق نوآور", "صندوق اشتغال", "قرارداد", "فراخوان پژوهشی", "فرصت مطالعاتی"];
type Row = { id: string; source: Src; title: string; holdingId?: string; companyId?: string; oppId?: string; allocated: number; paid: number; link: string };
type GroupBy = "holding" | "company" | "project" | "opportunity" | "source";
const groupLabels: Record<GroupBy, string> = { holding: "هلدینگ", company: "شرکت", project: "پروژه / پرونده", opportunity: "فرصت مبدأ", source: "منبع" };

export default function AllocationView() {
  const inn = useInnovation();
  const { filterScoped, holdings, companies } = useTenancy();
  const [src, setSrc] = useState<Src | "همه">("همه");
  const [by, setBy] = useState<GroupBy>("holding");

  const rows = useMemo<Row[]>(() => {
    const nfOpp = new Map(inn.projectLinks.filter((l) => l.targetKind === "nf").map((l) => [l.targetId, l.opportunityId]));
    return [
      ...filterScoped(inn.nfProjects).map((p) => ({ id: p.id, source: "صندوق نوآور" as Src, title: p.titleFa, holdingId: p.holdingId, companyId: p.companyId, oppId: nfOpp.get(p.id), allocated: toRial(p.budget), paid: toRial(p.finance.paid), link: "/dashboard/funds" })),
      ...filterScoped(inn.employment).map((f) => ({ id: f.id, source: "صندوق اشتغال" as Src, title: f.title, holdingId: f.holdingId, companyId: f.companyId, allocated: f.approved, paid: f.tranches.filter((t) => t.status === "پرداخت‌شده").reduce((a, t) => a + t.amount, 0), link: "/dashboard/funds?tab=employment" })),
      ...filterScoped(inn.contracts).map((c) => ({ id: c.id, source: "قرارداد" as Src, title: c.title, holdingId: c.holdingId, companyId: c.companyId, oppId: c.opportunityId, allocated: c.stage === "پیش‌نویس" || c.stage === "مذاکره" ? 0 : c.value, paid: c.payments.filter((p) => p.status === "پرداخت‌شده").reduce((a, p) => a + p.amount, 0), link: `/dashboard/contracts?open=${c.id}` })),
      ...filterScoped(inn.calls).filter((c) => c.stage === "در حال اجرا" || c.stage === "پایان‌یافته").map((c) => ({ id: c.id, source: "فراخوان پژوهشی" as Src, title: c.title, holdingId: c.holdingId, companyId: c.companyId, oppId: c.id, allocated: c.budget, paid: c.paid, link: `/dashboard/research?open=${c.id}` })),
      ...filterScoped(inn.sabbaticals).filter((s) => s.professor).map((s) => ({ id: s.id, source: "فرصت مطالعاتی" as Src, title: s.topic, holdingId: s.holdingId, companyId: s.companyId, oppId: s.id, allocated: s.budget, paid: s.reports.filter((r) => r.paid).reduce((a, r) => a + r.amount, 0), link: "/dashboard/research?tab=sabbatical" })),
    ].filter((r) => r.allocated > 0 || r.paid > 0);
  }, [inn, filterScoped]);

  const shown = src === "همه" ? rows : rows.filter((r) => r.source === src);
  const oppTitle = (id?: string) => (id ? inn.calls.find((c) => c.id === id)?.title ?? inn.rfps.find((r) => r.id === id)?.title ?? inn.sabbaticals.find((s) => s.id === id)?.topic ?? id : "بدون فرصت مرتبط");
  const keyOf = (r: Row): [string, string] => {
    switch (by) {
      case "holding": return [r.holdingId ?? "-", holdings.find((h) => h.id === r.holdingId)?.name ?? "سراسری / ستاد"];
      case "company": return [r.companyId ?? "-", companies.find((c) => c.id === r.companyId)?.name ?? "بدون شرکت مشخص"];
      case "project": return [r.id, r.title];
      case "opportunity": return [r.oppId ?? "-", oppTitle(r.oppId)];
      case "source": return [r.source, r.source];
    }
  };
  const groups = useMemo(() => {
    const m = new Map<string, { label: string; allocated: number; paid: number; items: Row[] }>();
    shown.forEach((r) => {
      const [k, label] = keyOf(r);
      const g = m.get(k) ?? { label, allocated: 0, paid: 0, items: [] };
      g.allocated += r.allocated;
      g.paid += r.paid;
      g.items.push(r);
      m.set(k, g);
    });
    return [...m.values()].sort((a, b) => b.allocated - a.allocated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, by]);
  const max = Math.max(1, ...groups.map((g) => Math.max(g.allocated, g.paid)));
  const totA = shown.reduce((s, r) => s + r.allocated, 0);
  const totP = shown.reduce((s, r) => s + r.paid, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="تخصیص‌یافته" value={rialShort(totA)} tone="brand" icon={<Landmark size={16} />} />
        <StatCard label="پرداخت‌شده" value={rialShort(totP)} tone="success" icon={<Wallet size={16} />} />
        <StatCard label="مانده‌ی تعهد" value={rialShort(Math.max(0, totA - totP))} tone="warning" icon={<PiggyBank size={16} />} />
        <StatCard label="نسبت پرداخت" value={`${faN(totA ? Math.round((totP / totA) * 100) : 0)}٪`} hint={`${faN(shown.length)} پرونده`} />
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <FilterChips items={SOURCES} value={src} onChange={setSrc} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500">تفکیک:</span>
          <select value={by} onChange={(e) => setBy(e.target.value as GroupBy)} className="input-field w-auto">
            {(Object.keys(groupLabels) as GroupBy[]).map((g) => <option key={g} value={g}>{groupLabels[g]}</option>)}
          </select>
          <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={() => downloadText("allocation.csv", toCsv([["گروه", "پرونده", "منبع", "تخصیص (ریال)", "پرداخت (ریال)"], ...groups.flatMap((g) => g.items.map((r) => [g.label, r.title, r.source, r.allocated, r.paid]))]))}>CSV</Button>
        </div>
      </div>
      <div className="card p-4 space-y-3.5">
        <div className="flex items-center gap-4 text-[11px] text-ink-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-brand-500" /> تخصیص</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-500" /> پرداخت</span>
        </div>
        {groups.length === 0 && <p className="text-xs text-ink-400">داده‌ای برای نمایش نیست.</p>}
        {groups.map((g) => (
          <details key={g.label} className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-2 text-xs mb-1">
                <span className="font-medium text-ink-800 truncate">{g.label} <span className="text-ink-400">({faN(g.items.length)})</span></span>
                <span className="text-ink-500 shrink-0">{rialShort(g.paid)} از {rialShort(g.allocated)}</span>
              </div>
              <div className="space-y-0.5">
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${(g.allocated / max) * 100}%` }} /></div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(g.paid / max) * 100}%` }} /></div>
              </div>
            </summary>
            <div className="mt-2 mr-3 space-y-1">
              {g.items.map((r) => (
                <Link key={`${r.source}-${r.id}`} to={r.link} className="flex items-center justify-between gap-2 text-[11px] rounded-md px-2 py-1 hover:bg-ink-50">
                  <span className="truncate text-ink-700">{r.title} <span className="text-ink-400">· {r.source}</span></span>
                  <span className="text-ink-500 shrink-0">{rialShort(r.paid)} / {rialShort(r.allocated)}</span>
                </Link>
              ))}
            </div>
          </details>
        ))}
      </div>
      <p className="text-[10.5px] text-ink-400 leading-5">تخصیص = مبلغ مصوب/قرارداد امضاشده؛ پرداخت = اقساط و صورت‌وضعیت‌های پرداخت‌شده. قراردادهای پیش‌نویس و در مذاکره تخصیص محسوب نمی‌شوند. روی هر ردیف بزنید تا پرونده‌ها باز شوند.</p>
    </div>
  );
}
