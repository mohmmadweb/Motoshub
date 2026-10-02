// ---------------------------------------------------------------------------
// بند ۲۶ (منوی ۲۰ بخشی): نماهای تجمیعی «اعلان‌های دانش»، «بازخورد و ارزیابی»،
// «ارتباطات دانش» و «نسخه‌بندی و تاریخچه». داده‌ها همان داده‌های اسناد و
// موجودیت‌هاست؛ این صفحه‌ها فقط آن‌ها را یک‌جا نشان می‌دهند.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, MessageSquareHeart, Network, History, GitCompare, AlertTriangle, ThumbsDown, Flag, Star, Link2, Unlink, CalendarClock, Inbox } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import { useInbox } from "../../context/InboxContext";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import { versionText } from "../../km/text";
import type { KDoc, KRelation, RelationType } from "../../km/types";
import { DiffView } from "./Markdown";
import { OverdueBadge } from "./WorkflowEditor";
import { SectionHead, Stars, avg, relIcon, relLabel, useEntityTitle, useRelationOptions } from "./shared";
import { useKPage } from "./ctx";

// ================================================================== اعلان‌های دانش
export function NotificationsSection() {
  const km = useKnowledge();
  const inbox = useInbox();
  const page = useKPage();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const today = dayNum(km.today)!;
  const items = inbox.mine.filter((i) => i.kind === "knowledge" || i.link.startsWith("/dashboard/knowledge"));
  const shown = items.filter((i) => (filter === "unread" ? !inbox.isRead(i) : filter === "read" ? inbox.isRead(i) : true));
  const unread = items.filter((i) => !inbox.isRead(i)).length;

  // کارهای در انتظار من (محاسبه‌ی زنده — همان رویدادهایی که اعلان می‌سازند)
  const visible = km.docs.filter((d) => km.canSee(d));
  const steps = visible
    .map((d) => ({ d, f: km.flowInfo(d) }))
    .filter((x) => x.f && (x.f.actors.includes(km.me) || x.f.deputies.some((y) => y.name === km.me)));
  const reviews = visible.filter((d) => d.status !== "آرشیو" && (d.owner === km.me || d.approvers.includes(km.me)) && (dayNum(d.reviewDate) ?? 9e9) - today <= 7);
  const returned = visible.filter((d) => d.status === "ارجاع برای اصلاح" && (d.owner === km.me || d.author === km.me));

  return (
    <div className="space-y-4">
      <SectionHead icon={<Bell size={17} className="text-brand-600" />} title="اعلان‌های دانش" hint="سند جدید، تأیید یا رد، ارجاع برای اصلاح، نوبت شما در گردش کار، موعد بازبینی، دانش جدید در حوزه‌ی مورد علاقه و انتخاب شما به‌عنوان تأییدکننده." />
      {(steps.length > 0 || reviews.length > 0 || returned.length > 0) && (
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-2">نیازمند اقدام شما</p>
          <ul className="divide-y divide-ink-100">
            {steps.map(({ d, f }) => (
              <li key={`s-${d.id}`} className="py-2 flex items-center gap-2 flex-wrap">
                <Inbox size={13} className="text-brand-600 shrink-0" />
                <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[200px] text-right text-xs text-ink-800 hover:text-brand-700">
                  مرحله‌ی «{f!.step.name}»: {d.title}
                  {!f!.actors.includes(km.me) && <span className="text-ink-400"> (به جانشینی)</span>}
                </button>
                <OverdueBadge f={f!} />
              </li>
            ))}
            {returned.map((d) => (
              <li key={`r-${d.id}`} className="py-2 flex items-center gap-2">
                <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                <button onClick={() => page.openDoc(d.id)} className="flex-1 text-right text-xs text-ink-800 hover:text-brand-700">
                  برای اصلاح برگشته: {d.title}
                </button>
              </li>
            ))}
            {reviews.map((d) => {
              const left = (dayNum(d.reviewDate) ?? 0) - today;
              return (
                <li key={`v-${d.id}`} className="py-2 flex items-center gap-2">
                  <CalendarClock size={13} className="text-amber-600 shrink-0" />
                  <button onClick={() => page.go("review", d.id)} className="flex-1 text-right text-xs text-ink-800 hover:text-brand-700">
                    موعد بازبینی: {d.title}
                  </button>
                  <span className={`text-[11px] ${left < 0 ? "text-rose-600" : "text-amber-600"}`}>{left < 0 ? `${fa(-left)} روز گذشته` : left === 0 ? "امروز" : `${fa(left)} روز مانده`}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          {(
            [
              ["all", `همه (${fa(items.length)})`],
              ["unread", `خوانده‌نشده (${fa(unread)})`],
              ["read", "خوانده‌شده"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`px-3 py-1.5 text-xs ${filter === id ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
              {label}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <Button size="sm" variant="ghost" icon={<CheckCheck size={13} />} onClick={() => items.forEach((i) => !inbox.isRead(i) && inbox.markRead(i.id))}>
            همه خوانده شد
          </Button>
        )}
      </div>
      {shown.length ? (
        <div className="card divide-y divide-ink-100">
          {shown.map((i) => {
            const read = inbox.isRead(i);
            return (
              <button
                key={i.id}
                onClick={() => {
                  inbox.markRead(i.id);
                  navigate(i.link);
                }}
                className={`w-full text-right p-3 flex items-start gap-2 hover:bg-ink-50 ${read ? "" : "bg-brand-50/40"}`}
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${read ? "bg-ink-200" : "bg-brand-600"}`} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-xs leading-6 ${read ? "text-ink-600" : "text-ink-900 font-medium"}`}>{i.text}</span>
                  <span className="text-[10.5px] text-ink-400">
                    {i.actor} · {i.time}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Bell size={20} />} title="اعلانی نیست" description="اعلان‌های دانش برای شما اینجا جمع می‌شود. حوزه‌های مورد علاقه را از کنار دسته‌بندی‌های مخزن دنبال کنید." />
      )}
    </div>
  );
}

// ================================================================== بازخورد و ارزیابی
export function FeedbackSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { filterScoped } = useTenancy();
  const docs = filterScoped(km.docs).filter((d) => d.status !== "آرشیو" && km.canSee(d));
  const allRatings = docs.flatMap((d) => d.ratings.map((r) => r.score));
  const fb = docs.flatMap((d) => d.feedback);
  const helpfulPct = fb.length ? Math.round((fb.filter((f) => f.helpful).length / fb.length) * 100) : 0;
  const queue = docs
    .map((d) => {
      const r = avg(d.ratings.map((x) => x.score));
      const neg = d.feedback.filter((f) => !f.helpful);
      const issues: string[] = [];
      if (d.reported?.length) issues.push(`${fa(d.reported.length)} گزارش قدیمی/نادرست`);
      if (neg.length) issues.push(`${fa(neg.length)} نامفید`);
      if (d.ratings.length && r < 3.5) issues.push(`امتیاز ${fa(Math.round(r * 10) / 10)}`);
      const reasons = [...(d.reported ?? []).map((x) => `${x.by}: ${x.reason}`), ...neg.filter((f) => f.reason).map((f) => `${f.by}: ${f.reason}`)];
      return { d, r, issues, reasons, weight: (d.reported?.length ?? 0) * 3 + neg.length * 2 + (d.ratings.length && r < 3.5 ? 1 : 0) };
    })
    .filter((x) => x.issues.length)
    .sort((a, b) => b.weight - a.weight);
  const best = [...docs].filter((d) => d.ratings.length).sort((a, b) => avg(b.ratings.map((x) => x.score)) - avg(a.ratings.map((x) => x.score))).slice(0, 5);
  const xpTop = [...km.experiences].filter((e) => e.status === "منتشرشده").sort((a, b) => b.helpful - a.helpful).slice(0, 4);
  return (
    <div className="space-y-4">
      <SectionHead icon={<MessageSquareHeart size={17} className="text-brand-600" />} title="بازخورد و ارزیابی" hint="امتیاز، «مفید بود؟» و گزارش محتوای قدیمی یا نادرست، یک‌جا؛ صف رسیدگی برای مالکان سند." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="میانگین امتیاز" value={allRatings.length ? fa(Math.round(avg(allRatings) * 10) / 10) : "—"} hint={`${fa(allRatings.length)} رأی`} tone="brand" />
        <StatCard label="نرخ مفید بودن" value={`${fa(helpfulPct)}٪`} hint={`${fa(fb.length)} بازخورد`} tone="success" />
        <StatCard label="گزارش قدیمی/نادرست" value={fa(docs.reduce((n, d) => n + (d.reported?.length ?? 0), 0))} tone="warning" />
        <StatCard label="در صف رسیدگی" value={fa(queue.length)} tone={queue.length ? "danger" : "success"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="card overflow-hidden">
          <p className="px-4 py-2.5 text-xs font-bold text-ink-900 border-b border-ink-100">صف رسیدگی به بازخورد</p>
          {queue.length ? (
            <ul className="divide-y divide-ink-100">
              {queue.map(({ d, issues, reasons }) => (
                <li key={d.id} className="p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[200px] text-right">
                      <p className="text-sm text-ink-900 hover:text-brand-700">{d.title}</p>
                      <p className="text-[11px] text-ink-400">مالک: {d.owner}</p>
                    </button>
                    <span className="flex gap-1 flex-wrap">
                      {issues.map((x) => (
                        <Badge key={x} tone={x.includes("گزارش") ? "warning" : x.includes("نامفید") ? "danger" : "neutral"} icon={x.includes("گزارش") ? <Flag size={10} /> : x.includes("نامفید") ? <ThumbsDown size={10} /> : <Star size={10} />}>
                          {x}
                        </Badge>
                      ))}
                    </span>
                  </div>
                  {reasons.length > 0 && <p className="text-[11px] text-ink-500 mt-1.5 bg-ink-50 rounded px-2 py-1 leading-5">{reasons.slice(0, 2).join(" · ")}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-xs text-ink-400 text-center">بازخورد بازی نیست.</p>
          )}
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-2">بالاترین امتیاز</p>
            {best.map((d) => (
              <button key={d.id} onClick={() => page.openDoc(d.id)} className="w-full flex items-center gap-2 py-1 text-right text-xs hover:text-brand-700">
                <span className="flex-1 truncate text-ink-800">{d.title}</span>
                <Stars value={avg(d.ratings.map((x) => x.score))} size={11} />
              </button>
            ))}
          </div>
          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-2">مفیدترین تجربه‌ها</p>
            {xpTop.map((e) => (
              <button key={e.id} onClick={() => page.go(e.projectId ? "projects" : "experience", e.id)} className="w-full flex items-center gap-2 py-1 text-right text-xs hover:text-brand-700">
                <span className="flex-1 truncate text-ink-800">{e.title}</span>
                <span className="text-ink-400">{fa(e.helpful)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================== ارتباطات دانش
type Node = { type: RelationType; id: string };
const typeColor: Record<RelationType, string> = { doc: "#1f4f99", process: "#0d9488", registry: "#7c3aed", expert: "#b45309", project: "#0f172a", lesson: "#059669", glossary: "#64748b" };

export function RelationsSection() {
  const km = useKnowledge();
  const page = useKPage();
  const title = useEntityTitle();
  const options = useRelationOptions();
  const [sel, setSel] = useState<Node>({ type: "process", id: km.processes[0]?.id ?? "" });

  // همه‌ی موجودیت‌های دارای رابطه
  const entities = useMemo(
    () => [
      ...km.docs.filter((d) => km.canSee(d)).map((x) => ({ type: "doc" as RelationType, id: x.id, relations: x.relations, archived: x.status === "آرشیو" })),
      ...km.processes.map((x) => ({ type: "process" as RelationType, id: x.id, relations: x.relations, archived: false })),
      ...km.registry.map((x) => ({ type: "registry" as RelationType, id: x.id, relations: x.relations, archived: false })),
      ...km.experiences.map((x) => ({ type: "lesson" as RelationType, id: x.id, relations: [...x.relations, ...(x.projectId ? [{ type: "project" as RelationType, id: x.projectId }] : []), ...(x.processId ? [{ type: "process" as RelationType, id: x.processId }] : [])], archived: false })),
      ...km.experts.map((x) => ({ type: "expert" as RelationType, id: x.id, relations: x.relations, archived: false })),
      ...km.glossary.map((x) => ({ type: "glossary" as RelationType, id: x.id, relations: x.relations, archived: false })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [km.docs, km.processes, km.registry, km.experiences, km.experts, km.glossary]
  );
  const same = (a: Node, b: Node) => a.type === b.type && a.id === b.id;
  const me = entities.find((e) => same(e, sel));
  const outgoing: KRelation[] = me?.relations ?? [];
  const incoming: Node[] = entities.filter((e) => e.relations.some((r) => same(r, sel))).map((e) => ({ type: e.type, id: e.id }));
  const neighbors: Node[] = [...outgoing, ...incoming.filter((n) => !outgoing.some((o) => same(o, n)))];
  const totalRel = entities.reduce((n, e) => n + e.relations.length, 0);
  const linked = new Set<string>();
  entities.forEach((e) => e.relations.forEach((r) => { linked.add(`${e.type}:${e.id}`); linked.add(`${r.type}:${r.id}`); }));
  const orphans = km.docs.filter((d) => d.status !== "آرشیو" && km.canSee(d) && !linked.has(`doc:${d.id}`));
  const docIds = new Set(km.docs.map((d) => d.id));
  const archivedIds = new Set(km.docs.filter((d) => d.status === "آرشیو").map((d) => d.id));
  const broken = entities.flatMap((e) => e.relations.filter((r) => r.type === "doc" && (!docIds.has(r.id) || archivedIds.has(r.id))).map((r) => ({ from: e as Node, to: r })));

  const R = 120;
  const cx = 170;
  const cy = 150;
  const pos = (i: number, n: number) => {
    const a = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };
  const short = (s: string) => (s.length > 18 ? `${s.slice(0, 17)}…` : s);

  return (
    <div className="space-y-4">
      <SectionHead icon={<Network size={17} className="text-brand-600" />} title="ارتباطات دانش" hint="یک موجودیت را انتخاب کنید تا ببینید به چه چیزهایی وصل است و چه چیزهایی به آن ارجاع داده‌اند؛ مثل فرآیند ← شناسنامه ← دستورالعمل ← فرم ← درس‌آموخته ← خبره." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="کل روابط" value={fa(totalRel)} tone="brand" icon={<Link2 size={16} />} />
        <StatCard label="اسناد بدون رابطه" value={fa(orphans.length)} tone={orphans.length ? "warning" : "success"} />
        <StatCard label="پیوند شکسته" value={fa(broken.length)} hint="به سند حذف یا آرشیوشده" tone={broken.length ? "danger" : "success"} icon={<Unlink size={16} />} />
      </div>
      <div className="card p-3 flex gap-2 flex-wrap">
        <select className="input-field !py-1.5 !text-xs !w-auto" value={sel.type} onChange={(e) => { const t = e.target.value as RelationType; setSel({ type: t, id: options(t)[0]?.id ?? "" }); }} aria-label="نوع موجودیت">
          {(Object.keys(relLabel) as RelationType[]).filter((t) => t !== "project").map((t) => (
            <option key={t} value={t}>
              {relLabel[t]}
            </option>
          ))}
        </select>
        <select className="input-field !py-1.5 !text-xs flex-1 min-w-[200px]" value={sel.id} onChange={(e) => setSel({ ...sel, id: e.target.value })} aria-label="موجودیت">
          {options(sel.type).map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <div className="card p-2">
          <svg viewBox="0 0 340 300" className="w-full h-auto" role="img" aria-label="گراف همسایگی">
            {neighbors.map((n, i) => {
              const p = pos(i, neighbors.length);
              return <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" className="text-ink-200" strokeWidth={1.5} strokeDasharray={incoming.some((x) => same(x, n)) && !outgoing.some((x) => same(x, n)) ? "4 3" : undefined} />;
            })}
            {neighbors.map((n, i) => {
              const p = pos(i, neighbors.length);
              return (
                <g key={`n${i}`} className="cursor-pointer" onClick={() => (n.type === "project" ? page.openRelation(n) : setSel(n))}>
                  <circle cx={p.x} cy={p.y} r={9} fill={typeColor[n.type]} />
                  <text x={p.x} y={p.y + 21} textAnchor="middle" className="fill-current text-ink-600" fontSize={9.5}>
                    {short(title(n))}
                  </text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r={16} fill={typeColor[sel.type]} stroke="white" strokeWidth={3} />
            <text x={cx} y={cy + 30} textAnchor="middle" className="fill-current text-ink-900" fontSize={11} fontWeight={700}>
              {short(title(sel))}
            </text>
          </svg>
          <p className="flex flex-wrap gap-2 px-2 pb-1 text-[10px] text-ink-500">
            {(Object.keys(typeColor) as RelationType[]).map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: typeColor[t] }} /> {relLabel[t]}
              </span>
            ))}
            <span>· خط‌چین = ارجاع ورودی</span>
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 self-start">
          {[
            { label: `این ${relLabel[sel.type]} به…`, list: outgoing as Node[] },
            { label: "ارجاع‌شده از…", list: incoming },
          ].map((col) => (
            <div key={col.label} className="card p-4">
              <p className="text-xs font-bold text-ink-900 mb-2">
                {col.label} <span className="text-ink-400 font-normal">({fa(col.list.length)})</span>
              </p>
              {col.list.length ? (
                <ul className="space-y-1">
                  {col.list.map((n) => {
                    const Icon = relIcon[n.type];
                    return (
                      <li key={`${n.type}-${n.id}`}>
                        <button onClick={() => page.openRelation(n)} className="w-full flex items-center gap-1.5 text-right text-xs py-1 hover:text-brand-700">
                          <Icon size={12} className="text-ink-400 shrink-0" />
                          <span className="text-ink-400 shrink-0">{relLabel[n.type]}:</span>
                          <span className="truncate text-ink-800">{title(n)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[11px] text-ink-400">موردی نیست.</p>
              )}
            </div>
          ))}
          {(orphans.length > 0 || broken.length > 0) && (
            <div className="card p-4 md:col-span-2">
              <p className="text-xs font-bold text-ink-900 mb-2">نیازمند اتصال</p>
              {broken.map((b, i) => (
                <p key={`b${i}`} className="text-[11px] text-rose-600 py-0.5">
                  پیوند شکسته: {title(b.from)} ← {title(b.to)}
                </p>
              ))}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {orphans.slice(0, 10).map((d) => (
                  <button key={d.id} onClick={() => page.openDoc(d.id)} className="text-[11px] bg-ink-50 border border-ink-200 rounded px-2 py-0.5 hover:text-brand-700 max-w-[240px] truncate">
                    {d.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================== نسخه‌بندی و تاریخچه
export function VersionsSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { filterScoped } = useTenancy();
  const [cmp, setCmp] = useState<{ d: KDoc; v: number } | null>(null);
  const docs = filterScoped(km.docs).filter((d) => km.canSee(d));
  const rows = docs
    .flatMap((d) => d.versions.map((v) => ({ d, v })))
    .sort((a, b) => (dayNum(b.v.date) ?? 0) - (dayNum(a.v.date) ?? 0) || b.v.version - a.v.version);
  const multi = docs.filter((d) => d.versions.length > 1).length;
  const thisMonth = rows.filter((r) => r.v.date.slice(0, 7) === km.today.slice(0, 7)).length;
  const prev = cmp ? cmp.d.versions.find((x) => x.version === cmp.v - 1) : undefined;
  const cur = cmp ? cmp.d.versions.find((x) => x.version === cmp.v) : undefined;
  return (
    <div className="space-y-4">
      <SectionHead icon={<History size={17} className="text-brand-600" />} title="نسخه‌بندی و تاریخچه" hint="همه‌ی نسخه‌های اسناد با شماره، شرح تغییرات، کاربر و زمان؛ مقایسه‌ی متنی هر نسخه با نسخه‌ی قبل." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="کل نسخه‌ها" value={fa(rows.length)} tone="brand" />
        <StatCard label="اسناد چندنسخه‌ای" value={fa(multi)} tone="success" />
        <StatCard label="نسخه‌های این ماه" value={fa(thisMonth)} tone="warning" />
      </div>
      <div className="card divide-y divide-ink-100">
        {rows.slice(0, 80).map(({ d, v }) => (
          <div key={`${d.id}-${v.version}`} className="p-3 flex items-center gap-3 flex-wrap">
            <Badge tone={v.version === d.version ? "brand" : "neutral"}>نسخه‌ی {fa(v.version)}</Badge>
            <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[200px] text-right">
              <p className="text-sm text-ink-900 hover:text-brand-700 truncate">{d.title}</p>
              <p className="text-[11px] text-ink-400 truncate">
                {v.note} · {v.by} · {v.date}
              </p>
            </button>
            {v.version > 1 && (
              <Button size="sm" variant="ghost" icon={<GitCompare size={13} />} onClick={() => setCmp({ d, v: v.version })}>
                مقایسه با نسخه‌ی قبل
              </Button>
            )}
          </div>
        ))}
      </div>
      <Modal open={!!cmp} onClose={() => setCmp(null)} title={cmp ? `مقایسه‌ی نسخه‌ها — ${cmp.d.title}` : ""} description={cur ? `${cur.note} · ${cur.by} · ${cur.date}` : undefined} width="max-w-3xl">
        {cmp && prev && cur ? <DiffView a={versionText(prev)} b={versionText(cur)} labelA={`نسخه‌ی ${fa(prev.version)}`} labelB={`نسخه‌ی ${fa(cur.version)}`} /> : <p className="text-xs text-ink-400">نسخه‌ی قبلی موجود نیست.</p>}
      </Modal>
    </div>
  );
}
