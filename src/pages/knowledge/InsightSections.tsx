import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Network, BarChart3, Bot, Settings, Send, ExternalLink, RotateCcw, Download, Search, Info } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import Toggle from "../../components/ui/Toggle";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { trainingCourses } from "../../data/mockDaneshmand";
import { dayNum, fa, monthNames, parseJalali } from "../../pm/jalali";
import { accessLevels } from "../../km/types";
import { Field, SectionHead, avg } from "./shared";
import { TaxonomyManager } from "./TaxonomyManager";
import { useKPage } from "./ctx";

/** بند ۲۳: آموزش و یادگیری — از ماژول «آموزش و توانمندسازی» استفاده می‌شود */
export function TrainingSection() {
  const km = useKnowledge();
  const page = useKPage();
  const navigate = useNavigate();
  const trainingDocs = km.docs.filter((d) => d.type === "آموزشی" && d.status !== "آرشیو");
  const jobs = km.registry.filter((r) => r.typeId === "rt-job");
  return (
    <div className="space-y-4">
      <SectionHead
        icon={<GraduationCap size={17} className="text-brand-600" />}
        title="آموزش و یادگیری"
        hint="دوره‌ها، آزمون‌ها و مسیرهای یادگیری در ماژول «آموزش و توانمندسازی» مدیریت می‌شوند؛ این بخش آن‌ها را به اسناد آموزشی و شناسنامه‌ی شغل‌ها وصل می‌کند."
        action={
          <Button variant="primary" icon={<ExternalLink size={14} />} onClick={() => navigate("/dashboard/training")}>
            رفتن به آموزش و توانمندسازی
          </Button>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-2">دوره‌ها و آموزش‌ها</p>
          {trainingCourses.map((c) => (
            <button key={c.id} onClick={() => navigate("/dashboard/training")} className="w-full flex items-center gap-2 py-1.5 text-right text-xs hover:text-brand-700">
              <span className="flex-1 truncate text-ink-800">{c.title}</span>
              <Badge tone={c.status === "ثبت‌نام باز" ? "success" : c.status === "در حال برگزاری" ? "brand" : "neutral"}>{c.status}</Badge>
              <span className="text-ink-400 w-16 text-left">{fa(c.hours)} ساعت</span>
            </button>
          ))}
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-2">فایل‌ها و مستندات آموزشی</p>
          {trainingDocs.map((d) => (
            <button key={d.id} onClick={() => page.openDoc(d.id)} className="w-full text-right text-xs py-1.5 text-ink-800 hover:text-brand-700 truncate">
              {d.title}
            </button>
          ))}
        </div>
      </div>
      <div className="card p-4">
        <p className="text-xs font-bold text-ink-900 mb-2">آموزش‌های مرتبط با هر شغل/سمت (از شناسنامه‌ی شغل)</p>
        {jobs.map((j) => (
          <div key={j.id} className="py-2 border-b border-ink-100 last:border-0">
            <p className="text-sm text-ink-900">{j.title}</p>
            <p className="text-[11.5px] text-ink-500 mt-0.5">آموزش‌های الزامی: {j.values.courses || "—"}</p>
            <p className="text-[11.5px] text-ink-400">شایستگی‌ها: {j.values.competencies || "—"}</p>
          </div>
        ))}
        <button onClick={() => page.go("registry")} className="text-xs text-brand-700 hover:underline mt-2">
          مدیریت شناسنامه‌ی شغل‌ها
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ نقشه‌ی دانش
type MapNode = { id: string; col: number; label: string; open: () => void };

/** بند ۲۴: نقشه‌ی دانش سازمان — حوزه ← خبره ← سند ← فرآیند ← پروژه ← درس‌آموخته */
export function KnowledgeMapSection() {
  const km = useKnowledge();
  const pm = useProjectsPM();
  const page = useKPage();
  const [sel, setSel] = useState<string | null>(null);
  const cols = ["حوزه‌های دانش", "خبرگان", "اسناد", "فرآیندها", "پروژه‌ها", "درس‌آموخته‌ها"];

  const { nodes, edges } = useMemo(() => {
    const nodes: MapNode[] = [];
    const edges: [string, string][] = [];
    const add = (n: MapNode) => !nodes.some((x) => x.id === n.id) && nodes.push(n);
    const areas = [...new Set(km.experts.flatMap((e) => e.areas))].slice(0, 9);
    areas.forEach((a) => add({ id: `a:${a}`, col: 0, label: a, open: () => page.go("experts") }));
    km.experts.filter((e) => e.areas.some((a) => areas.includes(a))).slice(0, 9).forEach((e) => {
      add({ id: `e:${e.id}`, col: 1, label: e.name, open: () => page.go("experts", e.id) });
      e.areas.filter((a) => areas.includes(a)).forEach((a) => edges.push([`a:${a}`, `e:${e.id}`]));
    });
    const docs = km.docs.filter((d) => d.status !== "آرشیو" && km.canSee(d)).slice(0, 10);
    docs.forEach((d) => {
      add({ id: `d:${d.id}`, col: 2, label: d.title, open: () => page.openDoc(d.id) });
      km.experts.forEach((e) => (d.owner === e.name || d.author === e.name || e.relations.some((r) => r.type === "doc" && r.id === d.id)) && edges.push([`e:${e.id}`, `d:${d.id}`]));
    });
    km.processes.forEach((p) => {
      add({ id: `p:${p.id}`, col: 3, label: p.name, open: () => page.go("processes", p.id) });
      p.relations.filter((r) => r.type === "doc").forEach((r) => edges.push([`d:${r.id}`, `p:${p.id}`]));
      p.relations.filter((r) => r.type === "expert").forEach((r) => edges.push([`e:${r.id}`, `p:${p.id}`]));
    });
    pm.projects.forEach((p) => add({ id: `j:${p.meta.id}`, col: 4, label: p.meta.name, open: () => page.go("projects", p.meta.id) }));
    km.experts.forEach((e) => e.relations.filter((r) => r.type === "project").forEach((r) => edges.push([`e:${e.id}`, `j:${r.id}`])));
    km.processes.forEach((p) => p.relations.filter((r) => r.type === "project").forEach((r) => edges.push([`p:${p.id}`, `j:${r.id}`])));
    km.docs.forEach((d) => d.relations.filter((r) => r.type === "project").forEach((r) => edges.push([`d:${d.id}`, `j:${r.id}`])));
    km.experiences.slice(0, 10).forEach((x) => {
      add({ id: `l:${x.id}`, col: 5, label: x.title, open: () => page.go(x.projectId ? "projects" : "experience", x.projectId ?? x.id) });
      if (x.projectId) edges.push([`j:${x.projectId}`, `l:${x.id}`]);
      if (x.processId) edges.push([`p:${x.processId}`, `l:${x.id}`]);
    });
    const ids = new Set(nodes.map((n) => n.id));
    return { nodes, edges: edges.filter(([a, b]) => ids.has(a) && ids.has(b)) };
  }, [km, pm, page]);

  const W = 128;
  const H = 34;
  const GAP = 24;
  const colW = W + GAP;
  const width = cols.length * colW + 20;
  const rows = Math.max(...cols.map((_, c) => nodes.filter((n) => n.col === c).length), 1);
  const height = rows * (H + 12) + 40;
  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((_, c) => {
    const inCol = nodes.filter((n) => n.col === c);
    const off = ((rows - inCol.length) * (H + 12)) / 2;
    inCol.forEach((n, i) => pos.set(n.id, { x: width - 10 - (c + 1) * colW + GAP / 2, y: 36 + off + i * (H + 12) }));
  });
  // همسایگان مستقیم و غیرمستقیم نود انتخاب‌شده
  const linked = new Set<string>();
  if (sel) {
    const stack = [sel];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      linked.add(cur);
      edges.forEach(([a, b]) => {
        if (a === cur && !seen.has(b) && (pos.get(b)?.x ?? 0) < (pos.get(cur)?.x ?? 0)) stack.push(b);
        if (b === cur && !seen.has(a) && (pos.get(a)?.x ?? 0) > (pos.get(cur)?.x ?? 0)) stack.push(a);
      });
    }
  }

  return (
    <div>
      <SectionHead icon={<Network size={17} className="text-brand-600" />} title="نقشه‌ی دانش سازمان" hint="نمای گرافیکی ارتباط حوزه‌های دانش، خبرگان، اسناد، فرآیندها، پروژه‌ها و درس‌آموخته‌ها. روی هر گره کلیک کنید تا زنجیره‌ی ارتباط آن پررنگ شود؛ دوبار کلیک آن را باز می‌کند." />
      <div className="card overflow-x-auto">
        <svg width={width} height={height} className="block" role="img" aria-label="نقشه‌ی دانش">
          {cols.map((c, i) => (
            <text key={c} x={width - 10 - (i + 1) * colW + GAP / 2 + W / 2} y={20} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--color-ink-600)">
              {c}
            </text>
          ))}
          {edges.map(([a, b], i) => {
            const pa = pos.get(a)!;
            const pb = pos.get(b)!;
            const x1 = pa.x;
            const y1 = pa.y + H / 2;
            const x2 = pb.x + W;
            const y2 = pb.y + H / 2;
            const on = !sel || (linked.has(a) && linked.has(b));
            return <path key={i} d={`M ${x1} ${y1} C ${x1 - 24} ${y1}, ${x2 + 24} ${y2}, ${x2} ${y2}`} fill="none" stroke={on && sel ? "var(--color-brand-500)" : "var(--color-ink-300)"} strokeWidth={on && sel ? 1.8 : 1} opacity={on ? 1 : 0.15} />;
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id)!;
            const on = !sel || linked.has(n.id);
            const colors = ["#7c3aed", "#059669", "#1f4f99", "#0d9488", "#d97706", "#dc2626"];
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={on ? 1 : 0.25} style={{ cursor: "pointer" }} onClick={() => setSel(sel === n.id ? null : n.id)} onDoubleClick={n.open}>
                <rect width={W} height={H} rx={8} fill="var(--color-ink-50)" stroke={sel === n.id ? colors[n.col] : "var(--color-ink-200)"} strokeWidth={sel === n.id ? 2 : 1} />
                <rect x={W - 4} width={4} height={H} rx={2} fill={colors[n.col]} />
                {/* در متن راست‌به‌چپ، start یعنی لبه‌ی راست */}
                <text x={W - 10} y={H / 2 + 4} textAnchor="start" fontSize={10.5} fill="var(--color-ink-800)" style={{ direction: "rtl" }}>
                  {n.label.length > 17 ? `${n.label.slice(0, 16)}…` : n.label}
                </text>
                <title>{n.label}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-[11px] text-ink-400 mt-2 flex items-center gap-1">
        <Info size={12} /> ارتباط‌ها از بخش «ارتباطات» هر سند، فرآیند، شناسنامه، خبره و درس‌آموخته ساخته می‌شوند.
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ گزارش‌ها و تحلیل
function Bars({ rows }: { rows: { label: string; value: number; hint?: string; tone?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-ink-800 truncate">{r.label}</span>
            <span className="text-ink-500 shrink-0 mr-2">{r.hint ?? fa(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
            <div className={`h-full rounded-full ${r.tone ?? "bg-brand-500"}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** بند ۱۲ و ۱۹: گزارش‌ها، آمار و تحلیل دانش سازمان */
export function ReportsSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  if (!hasPermission("knowledge.reports")) return <p className="card p-6 text-sm text-ink-500 text-center">دسترسی گزارش‌ها و تحلیل دانش برای نقش شما فعال نیست.</p>;
  const docs = km.docs;
  const live = docs.filter((d) => d.status !== "آرشیو");
  const today = dayNum(km.today)!;
  const group = <T,>(xs: T[], key: (x: T) => string) => {
    const m = new Map<string, number>();
    xs.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };
  const byUnit = group(live, (d) => d.unit);
  const byType = group(live, (d) => d.type);
  const byCat = group(live, (d) => km.categoryName(km.categories.find((c) => c.id === d.categoryId)?.parentId ?? d.categoryId));
  const expired = live.filter((d) => (dayNum(d.reviewDate) ?? 9e9) < today);
  const near = live.filter((d) => { const x = (dayNum(d.reviewDate) ?? 9e9) - today; return x >= 0 && x <= 30; });
  const topViewed = [...live].sort((a, b) => b.views - a.views).slice(0, 6);
  const lowUse = [...live].filter((d) => d.status === "منتشرشده").sort((a, b) => a.views + a.downloads - (b.views + b.downloads)).slice(0, 5);
  const actors = group(km.logs, (l) => l.actor).slice(0, 6);
  const contributors = group([...docs.map((d) => d.author), ...km.experiences.map((e) => e.author)], (x) => x).slice(0, 6);
  const wf = group(docs.flatMap((d) => d.workflow), (w) => w.action.split(":")[0]);
  const terms = group(km.searches, (s) => s.term).slice(0, 8);
  const gaps = group(km.searches.filter((s) => s.results === 0), (s) => s.term);
  const producingUnits = group([...docs.map((d) => d.unit), ...km.experiences.map((e) => e.unit)], (x) => x).slice(0, 6);
  const demand = [...live].sort((a, b) => b.downloads - a.downloads).slice(0, 5);
  // روند ماهانه‌ی تولید و مصرف
  const months = (() => {
    const r = parseJalali(km.today)!;
    return Array.from({ length: 6 }, (_, i) => {
      const k = 5 - i;
      const m = ((r[1] - 1 - k + 120) % 12) + 1;
      const y = r[0] - (r[1] - 1 - k < 0 ? 1 : 0);
      const made = docs.filter((d) => { const p = parseJalali(d.createdAt); return p && p[0] === y && p[1] === m; }).length + km.experiences.filter((e) => { const p = parseJalali(e.date); return p && p[0] === y && p[1] === m; }).length;
      const used = km.logs.filter((l) => { const p = parseJalali(l.at); return p && p[0] === y && p[1] === m; }).length + km.searches.filter((s) => { const p = parseJalali(s.at); return p && p[0] === y && p[1] === m; }).length;
      return { label: `${monthNames[m - 1]}`, made, used };
    });
  })();
  const maxM = Math.max(1, ...months.flatMap((m) => [m.made, m.used]));

  const exportCsv = () => {
    const rows = [["عنوان", "کد", "نوع", "دسته", "واحد", "مالک", "وضعیت", "دسترسی", "نسخه", "بازدید", "دانلود", "امتیاز", "بازبینی"], ...docs.map((d) => [d.title, d.code, d.type, km.categoryPath(d.categoryId), d.unit, d.owner, d.status, d.access, d.version, d.views, d.downloads, Math.round(avg(d.ratings.map((r) => r.score)) * 10) / 10, d.reviewDate])];
    const blob = new Blob(["﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-report.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  const Card = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="card p-4">
      <p className="text-xs font-bold text-ink-900 mb-3">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHead icon={<BarChart3 size={17} className="text-brand-600" />} title="گزارش‌ها و تحلیل دانش سازمان" action={<Button variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>خروجی CSV اسناد</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="اسناد فعال" value={fa(live.length)} tone="brand" />
        <StatCard label="منقضی / نزدیک بازبینی" value={`${fa(expired.length)} / ${fa(near.length)}`} tone={expired.length ? "danger" : "warning"} />
        <StatCard label="مشارکت‌کنندگان" value={fa(new Set([...docs.map((d) => d.author), ...km.experiences.map((e) => e.author)]).size)} tone="success" />
        <StatCard label="جستجوهای بی‌نتیجه" value={fa(km.searches.filter((s) => !s.results).length)} hint="نشانه‌ی کمبود دانش" tone="warning" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="اسناد به تفکیک واحد">
          <Bars rows={byUnit} />
        </Card>
        <Card title="اسناد به تفکیک نوع">
          <Bars rows={byType} />
        </Card>
        <Card title="اسناد به تفکیک دسته">
          <Bars rows={byCat} />
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="پربازدیدترین اسناد">
          <Bars rows={topViewed.map((d) => ({ label: d.title, value: d.views, hint: `${fa(d.views)} بازدید · ${fa(d.downloads)} دانلود` }))} />
        </Card>
        <Card title="اسناد کم‌استفاده">
          {lowUse.map((d) => (
            <button key={d.id} onClick={() => page.openDoc(d.id)} className="w-full flex justify-between text-xs py-1 hover:text-brand-700">
              <span className="truncate">{d.title}</span>
              <span className="text-ink-400 shrink-0 mr-2">{fa(d.views)}</span>
            </button>
          ))}
        </Card>
        <Card title="اسناد منقضی یا نزدیک به بازبینی">
          {[...expired, ...near].slice(0, 6).map((d) => (
            <button key={d.id} onClick={() => page.go("review", d.id)} className="w-full flex justify-between text-xs py-1 hover:text-brand-700">
              <span className="truncate">{d.title}</span>
              <span className={`shrink-0 mr-2 ${expired.includes(d) ? "text-rose-600" : "text-amber-600"}`}>{d.reviewDate}</span>
            </button>
          ))}
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="کاربران فعال (تعداد اقدامات)">
          <Bars rows={actors} />
        </Card>
        <Card title="میزان مشارکت کارکنان (سند + تجربه)">
          <Bars rows={contributors} />
        </Card>
        <Card title="آمار ثبت، ویرایش، تأیید و انتشار">
          <Bars rows={wf} />
        </Card>
      </div>
      <p className="text-sm font-bold text-ink-900 pt-2">تحلیل دانش</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="موضوعات پرتکرار در جستجو">
          <Bars rows={terms} />
        </Card>
        <Card title="حوزه‌های دارای کمبود دانش (جستجوی بی‌نتیجه)">
          {gaps.length ? <Bars rows={gaps.map((g) => ({ ...g, tone: "bg-rose-400" }))} /> : <p className="text-[11px] text-ink-400">کمبودی شناسایی نشد.</p>}
        </Card>
        <Card title="واحدهای فعال در تولید دانش">
          <Bars rows={producingUnits.map((g) => ({ ...g, tone: "bg-emerald-500" }))} />
        </Card>
        <Card title="دانش‌های پرتقاضا (دانلود)">
          <Bars rows={demand.map((d) => ({ label: d.title, value: d.downloads }))} />
        </Card>
        <div className="card p-4 lg:col-span-2">
          <p className="text-xs font-bold text-ink-900 mb-3">روند رشد تولید و مصرف دانش (۶ ماه)</p>
          <div className="flex items-end gap-4 h-36">
            {months.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 h-28">
                  <div className="w-4 bg-brand-500 rounded-t" style={{ height: `${(m.made / maxM) * 100}%` }} title={`تولید: ${fa(m.made)}`} />
                  <div className="w-4 bg-amber-400 rounded-t" style={{ height: `${(m.used / maxM) * 100}%` }} title={`مصرف: ${fa(m.used)}`} />
                </div>
                <span className="text-[10.5px] text-ink-500">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-400 mt-2 flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-brand-500 rounded-sm" /> تولید (سند و تجربه)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /> مصرف (مشاهده، جستجو، دانلود)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ دستیار
type Msg = { from: "me" | "bot"; text: string; sources?: { title: string; open: () => void }[] };

/** بند ۲۵: دستیار هوشمند سازمانی (نمای نمونه‌ی فاز ۴) — پاسخ همراه با منبع و با رعایت سطح دسترسی */
export function AssistantSection() {
  const km = useKnowledge();
  const page = useKPage();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "سلام؛ پرسش خود را درباره‌ی اسناد، فرآیندها، تجربیات یا واژه‌های سازمان بپرسید. پاسخ‌ها فقط از منابعی ساخته می‌شوند که شما اجازه‌ی دیدنشان را دارید." }]);
  const [q, setQ] = useState("");
  const ask = (question: string) => {
    const words = question.replace(/[؟?.,،]/g, " ").split(/\s+/).filter((w) => w.length > 2);
    const score = (text: string) => words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
    const cands = [
      ...km.docs.filter((d) => d.status !== "آرشیو" && km.canSee(d)).map((d) => ({ title: d.title, text: `${d.title} ${d.description} ${d.tags.join(" ")}`, summary: d.description, meta: `نسخه‌ی ${fa(d.version)} · ${d.updatedAt}`, open: () => page.openDoc(d.id) })),
      ...km.experiences.filter((e) => e.status === "منتشرشده").map((e) => ({ title: `${e.kind}: ${e.title}`, text: `${e.title} ${e.body} ${e.problem ?? ""} ${e.future ?? ""}`, summary: e.future ? `توصیه: ${e.future}` : e.body, meta: e.author, open: () => page.go("experience", e.id) })),
      ...km.glossary.map((g) => ({ title: `واژه: ${g.term}`, text: `${g.term} ${g.abbr ?? ""} ${g.definition}`, summary: g.definition, meta: g.unit, open: () => page.go("glossary", g.id) })),
      ...km.processes.map((p) => ({ title: `فرآیند: ${p.name}`, text: `${p.name} ${p.description} ${p.steps.join(" ")}`, summary: `${p.description} گام‌ها: ${p.steps.join(" ← ")}`, meta: p.owner, open: () => page.go("processes", p.id) })),
    ]
      .map((c) => ({ ...c, s: score(c.text) }))
      .filter((c) => c.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);
    km.logSearch(question, cands.length);
    const answer: Msg = cands.length
      ? { from: "bot", text: `بر اساس ${fa(cands.length)} منبع:\n\n${cands.map((c, i) => `${fa(i + 1)}) ${c.summary} (${c.meta})`).join("\n\n")}`, sources: cands.map((c) => ({ title: c.title, open: c.open })) }
      : { from: "bot", text: "در منابعی که به آن‌ها دسترسی دارید پاسخی پیدا نکردم. این پرسش به‌عنوان «کمبود دانش» ثبت شد تا مالکان دانش آن را پوشش دهند." };
    setMsgs((m) => [...m, { from: "me", text: question }, answer]);
  };
  return (
    <div>
      <SectionHead icon={<Bot size={17} className="text-brand-600" />} title="دستیار هوشمند دانش" hint="پرسش به زبان طبیعی، جستجو و بازیابی از اسناد، خلاصه‌سازی و پیدا کردن آخرین نسخه — پاسخ همراه با منبع و لینک و با رعایت سطح دسترسی کاربر. (نمای نمونه‌ی فاز ۴)" />
      <div className="card flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-surface">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[80%] rounded-xl p-3 text-sm leading-7 whitespace-pre-wrap ${m.from === "me" ? "bg-brand-600 text-white mr-auto" : "bg-white border border-ink-100 text-ink-800"}`}>
              {m.text}
              {m.sources && (
                <div className="mt-2 pt-2 border-t border-ink-100 flex flex-wrap gap-1.5">
                  {m.sources.map((s) => (
                    <button key={s.title} onClick={s.open} className="text-[11px] bg-brand-50 text-brand-700 rounded px-2 py-0.5 hover:underline">
                      منبع: {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-ink-100 p-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {["آخرین نسخه‌ی شیوه‌نامه‌ی طرح‌های اشتغال", "TRL چیست؟", "درس‌آموخته‌های تأمین تجهیزات", "فرآیند انتشار سند"].map((s) => (
              <button key={s} onClick={() => ask(s)} className="text-[11px] px-2 py-1 rounded-full border border-ink-200 text-ink-600 hover:bg-ink-50">
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) ask(q.trim());
              setQ("");
            }}
          >
            <div className="relative flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input className="input-field !pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="پرسش خود را بنویسید…" />
            </div>
            <Button variant="primary" type="submit" icon={<Send size={14} />}>
              پرسیدن
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ تنظیمات
/** بند ۸ و ۲۰: تنظیمات، دسترسی‌ها و طبقه‌بندی */
export function SettingsSection() {
  const km = useKnowledge();
  const { hasPermission } = useTenancy();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [unit, setUnit] = useState("");
  const [tag, setTag] = useState("");
  if (!hasPermission("knowledge.settings")) return <p className="card p-6 text-sm text-ink-500 text-center">تنظیمات مدیریت دانش فقط برای راهبران قابل دسترسی است.</p>;
  const s = km.settings;
  const accessDesc: Record<string, string> = {
    عمومی: "همه‌ی کاربران سامانه (و در صورت انتشار عمومی، بازدیدکنندگان).",
    داخلی: "همه‌ی کارکنان وارد شده به سامانه.",
    محرمانه: "مالک، تأییدکنندگان و نقش‌های دارای مجوز «مشاهده‌ی اسناد محرمانه».",
    "خیلی محرمانه": "فقط مالک، تأییدکنندگان و نقش‌هایی که هم مجوز محرمانه و هم مجوز تأیید دارند.",
  };
  return (
    <div className="space-y-5">
      <SectionHead icon={<Settings size={17} className="text-brand-600" />} title="تنظیمات و دسترسی‌ها" hint="طبقه‌بندی، گردش کار، بازبینی، واحدها، برچسب‌ها و سطوح دسترسی. نقش‌ها و مجوزهای دقیق در «پنل راهبری ← نقش‌ها» تعریف می‌شوند (گروه مجوز «مدیریت دانش»)." />
      <TaxonomyManager />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <p className="text-sm font-bold text-ink-900">گردش کار اسناد</p>
          {(
            [
              ["review", "مرحله‌ی بررسی اولیه"],
              ["approve", "تأیید مسئول"],
              ["publish", "انتشار جداگانه پس از تأیید"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="text-ink-700">{label}</span>
              <Toggle on={s.workflowSteps[k]} onChange={() => km.updateSettings({ workflowSteps: { ...s.workflowSteps, [k]: !s.workflowSteps[k] } })} label={label} />
            </div>
          ))}
          <Field label="تأییدکنندگان پیش‌فرض (با ، جدا کنید)">
            <input className="input-field" defaultValue={s.defaultApprovers.join("، ")} onBlur={(e) => km.updateSettings({ defaultApprovers: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} />
          </Field>
          <Field label="دوره‌ی بازبینی پیش‌فرض (روز)">
            <input className="input-field" defaultValue={fa(s.reviewPeriodDays)} onBlur={(e) => km.updateSettings({ reviewPeriodDays: Number(e.target.value.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))) || 365 })} />
          </Field>
        </div>
        <div className="card p-4 space-y-3">
          <p className="text-sm font-bold text-ink-900">سطوح دسترسی</p>
          {accessLevels.map((a) => (
            <div key={a} className="text-xs">
              <Badge tone={a === "عمومی" ? "success" : a === "داخلی" ? "brand" : a === "محرمانه" ? "warning" : "danger"}>{a}</Badge>
              <p className="text-ink-500 mt-1 leading-5">{accessDesc[a]}</p>
            </div>
          ))}
          <p className="text-[11px] text-ink-400">کنترل مشاهده، دانلود، ویرایش، حذف و انتشار بر اساس نقش، گروه، سمت و واحد سازمانی؛ همه‌ی عملیات مهم در تاریخچه‌ی دانش ثبت می‌شود.</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-bold text-ink-900 mb-2">واحدهای سازمانی</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {s.units.map((u) => (
              <span key={u} className="text-[11px] bg-ink-100 rounded px-2 py-0.5 flex items-center gap-1">
                {u}
                <button onClick={() => km.updateSettings({ units: s.units.filter((x) => x !== u) })} className="text-ink-400 hover:text-rose-600" aria-label={`حذف ${u}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="واحد جدید" />
            <Button size="sm" variant="secondary" onClick={() => { if (unit.trim()) { km.updateSettings({ units: [...s.units, unit.trim()] }); setUnit(""); } }}>
              افزودن
            </Button>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-sm font-bold text-ink-900 mb-2">برچسب‌های قابل مدیریت</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {s.tags.map((t) => (
              <span key={t} className="text-[11px] bg-ink-100 rounded px-2 py-0.5 flex items-center gap-1">
                #{t}
                <button onClick={() => km.updateSettings({ tags: s.tags.filter((x) => x !== t) })} className="text-ink-400 hover:text-rose-600" aria-label={`حذف ${t}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-field" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="برچسب جدید" />
            <Button size="sm" variant="secondary" onClick={() => { if (tag.trim()) { km.updateSettings({ tags: [...s.tags, tag.trim()] }); setTag(""); } }}>
              افزودن
            </Button>
          </div>
        </div>
      </div>
      <div className="card p-4 border-dashed flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-ink-500">ابزار دمو: بازگرداندن همه‌ی داده‌های مدیریت دانش به حالت اولیه.</p>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => confirm({ title: "بازنشانی داده‌های مدیریت دانش؟", confirmLabel: "بازنشانی", onConfirm: () => { km.resetKm(); notify("داده‌ی نمونه بازنشانی شد.", "info"); } })}>
          بازنشانی
        </Button>
      </div>
    </div>
  );
}
