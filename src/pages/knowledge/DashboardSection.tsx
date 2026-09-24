import { useState } from "react";
import { LayoutDashboard, FileText, FilePlus2, Hourglass, Eye, CalendarClock, Activity, Search, Lightbulb, Users } from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, statusTone } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import { SectionHead } from "./shared";
import { useKPage } from "./ctx";

/** بند ۱: داشبورد مدیریت دانش */
export default function DashboardSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { filterScoped } = useTenancy();
  const [q, setQ] = useState("");
  const today = dayNum(km.today)!;
  const docs = filterScoped(km.docs).filter((d) => km.canSee(d));
  const live = docs.filter((d) => d.status !== "آرشیو");
  const recentNew = [...live].filter((d) => today - (dayNum(d.createdAt) ?? 0) <= 30 || today - (dayNum(d.updatedAt) ?? 0) <= 14).sort((a, b) => (dayNum(b.updatedAt) ?? 0) - (dayNum(a.updatedAt) ?? 0)).slice(0, 5);
  const pending = live.filter((d) => d.status === "در بررسی" || d.status === "تأییدشده");
  const myQueue = pending.filter((d) => km.isApprover(d));
  const top = [...live].sort((a, b) => b.views + b.downloads * 2 - (a.views + a.downloads * 2)).slice(0, 5);
  const nearReview = live.filter((d) => (dayNum(d.reviewDate) ?? 9e9) - today <= 30).sort((a, b) => (dayNum(a.reviewDate) ?? 0) - (dayNum(b.reviewDate) ?? 0));
  const roots = km.categories.filter((c) => !c.parentId);
  const catCount = (id: string) => live.filter((d) => d.categoryId === id || km.categories.find((c) => c.id === d.categoryId)?.parentId === id).length;
  const maxCat = Math.max(1, ...roots.map((r) => catCount(r.id)));
  const hits = q.trim()
    ? [
        ...live.filter((d) => d.title.includes(q) || d.tags.some((t) => t.includes(q))).map((d) => ({ key: d.id, label: d.title, kind: "سند", go: () => page.openDoc(d.id) })),
        ...km.experiences.filter((e) => e.title.includes(q) || e.body.includes(q)).map((e) => ({ key: e.id, label: e.title, kind: e.kind, go: () => page.go(e.projectId ? "projects" : "experience", e.id) })),
        ...km.glossary.filter((g) => g.term.includes(q) || (g.abbr ?? "").includes(q.toUpperCase())).map((g) => ({ key: g.id, label: `${g.term}${g.abbr ? ` (${g.abbr})` : ""}`, kind: "واژه", go: () => page.go("glossary", g.id) })),
        ...km.experts.filter((x) => x.name.includes(q) || x.areas.some((a) => a.includes(q))).map((x) => ({ key: x.id, label: x.name, kind: "خبره", go: () => page.go("experts", x.id) })),
      ].slice(0, 8)
    : [];

  return (
    <div className="space-y-5">
      <SectionHead icon={<LayoutDashboard size={17} className="text-brand-600" />} title="داشبورد مدیریت دانش" />

      <div className="card p-3 relative">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input-field !pr-9 !py-2.5"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) {
                km.logSearch(q.trim(), hits.length);
                page.go("search");
              }
            }}
            placeholder="جستجوی سریع در کل مخزن دانش: سند، تجربه، واژه، خبره…"
          />
        </div>
        {hits.length > 0 && (
          <div className="mt-2 divide-y divide-ink-100 border border-ink-100 rounded-lg">
            {hits.map((h) => (
              <button key={h.key} onClick={h.go} className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs hover:bg-ink-50">
                <Badge tone="neutral">{h.kind}</Badge>
                <span className="text-ink-800 truncate">{h.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="کل اسناد و محتوا" value={fa(live.length + km.experiences.length)} hint={`${fa(live.length)} سند · ${fa(km.experiences.length)} تجربه`} icon={<FileText size={16} />} tone="brand" />
        <StatCard label="اسناد جدید (۳۰ روز)" value={fa(recentNew.length)} icon={<FilePlus2 size={16} />} tone="success" />
        <StatCard label="در انتظار بررسی / تأیید" value={fa(pending.length)} hint={myQueue.length ? `${fa(myQueue.length)} مورد در کارتابل شما` : undefined} icon={<Hourglass size={16} />} tone={myQueue.length ? "warning" : "neutral"} />
        <StatCard label="نزدیک به موعد بازبینی" value={fa(nearReview.length)} hint="۳۰ روز آینده یا گذشته" icon={<CalendarClock size={16} />} tone={nearReview.length ? "danger" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-3 flex items-center gap-1">
            <Eye size={13} /> پربازدید و پرکاربرد
          </p>
          {top.map((d, i) => (
            <button key={d.id} onClick={() => page.openDoc(d.id)} className="w-full flex items-center gap-2 py-1.5 text-right text-xs hover:text-brand-700">
              <span className="w-5 text-ink-400">{fa(i + 1)}.</span>
              <span className="flex-1 truncate text-ink-800">{d.title}</span>
              <span className="text-ink-400">{fa(d.views)}</span>
            </button>
          ))}
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-3 flex items-center gap-1">
            <Hourglass size={13} /> در انتظار بررسی
            {myQueue.length > 0 && (
              <button onClick={() => page.go("workflow")} className="mr-auto text-[11px] text-brand-700 hover:underline font-normal">
                کارتابل من ({fa(myQueue.length)})
              </button>
            )}
          </p>
          {pending.slice(0, 5).map((d) => (
            <button key={d.id} onClick={() => page.openDoc(d.id)} className="w-full flex items-center gap-2 py-1.5 text-right text-xs hover:text-brand-700">
              <Badge tone={statusTone[d.status]}>{d.status}</Badge>
              <span className="flex-1 truncate text-ink-800">{d.title}</span>
            </button>
          ))}
          {pending.length === 0 && <p className="text-[11px] text-ink-400">موردی در انتظار نیست.</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-3 flex items-center gap-1">
            <CalendarClock size={13} /> موعد بازبینی
          </p>
          {nearReview.slice(0, 5).map((d) => {
            const left = (dayNum(d.reviewDate) ?? 0) - today;
            return (
              <button key={d.id} onClick={() => page.go("review", d.id)} className="w-full flex items-center gap-2 py-1.5 text-right text-xs hover:text-brand-700">
                <span className={`w-16 shrink-0 ${left < 0 ? "text-rose-600" : "text-amber-600"}`}>{left < 0 ? `${fa(-left)} روز گذشته` : `${fa(left)} روز`}</span>
                <span className="flex-1 truncate text-ink-800">{d.title}</span>
              </button>
            );
          })}
          {nearReview.length === 0 && <p className="text-[11px] text-ink-400">موعد نزدیکی نیست.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-3">دسته‌بندی‌های اصلی</p>
          <div className="space-y-2.5">
            {roots.map((r) => (
              <button key={r.id} onClick={() => page.go("bank")} className="block w-full text-right">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-800">{r.name}</span>
                  <span className="text-ink-400">{fa(catCount(r.id))} سند</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(catCount(r.id) / maxCat) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-900 mb-3 flex items-center gap-1">
            <Activity size={13} /> فعالیت‌های اخیر کاربران
          </p>
          <div className="space-y-2">
            {km.logs.slice(0, 7).map((l) => (
              <div key={l.id} className="text-xs flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <p className="text-ink-700 leading-5">
                  <b>{l.actor}</b> {l.action}: «{l.entity.title}» <span className="text-ink-400">· {l.at}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => page.go("experience")} className="card p-4 text-right hover:border-brand-300">
          <Lightbulb size={16} className="text-amber-500" />
          <p className="text-sm font-bold text-ink-900 mt-2">{fa(km.experiences.length)} تجربه و درس‌آموخته</p>
        </button>
        <button onClick={() => page.go("experts")} className="card p-4 text-right hover:border-brand-300">
          <Users size={16} className="text-brand-600" />
          <p className="text-sm font-bold text-ink-900 mt-2">{fa(km.experts.length)} خبره</p>
        </button>
        <button onClick={() => page.go("processes")} className="card p-4 text-right hover:border-brand-300">
          <Activity size={16} className="text-emerald-600" />
          <p className="text-sm font-bold text-ink-900 mt-2">{fa(km.processes.length)} فرآیند</p>
        </button>
        <button onClick={() => page.go("registry")} className="card p-4 text-right hover:border-brand-300">
          <FileText size={16} className="text-navy-700" />
          <p className="text-sm font-bold text-ink-900 mt-2">{fa(km.registry.length)} شناسنامه</p>
        </button>
      </div>
    </div>
  );
}
