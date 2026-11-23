// ---------------------------------------------------------------------------
// داشبورد مدیریت دانش — خانه‌ی دانشنامه‌ی v6.8 روی داده‌های موجود: شمارنده‌ها به شکل
// `knowledge/overview/`، «منتظر تأیید شما» (تأیید/انتشار و ارجاع همان گردش کار)، «نیاز به بازبینی»،
// «نشان‌شده‌ها» (اسناد دنبال‌شده)، «پربازدید» و «تغییرات اخیر» (لاگ ممیزی) — به‌علاوه‌ی جستجوی سریع،
// دسته‌بندی‌ها و میانبرهای قبلی. مسیرهای یادگیری در این دور نیست (MATRIX §20: LATER).
// ---------------------------------------------------------------------------
import { useState, type ReactNode } from "react";
import { LayoutDashboard, FileText, FilePlus2, Hourglass, CalendarClock, Activity, Search, Lightbulb, Users, FlaskConical, IdCard, Clock, Bookmark, Eye, CheckCircle2, Undo2, Megaphone } from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ListRow, { List } from "../../components/ui/ListRow";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, statusTone } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import { mdToPlain } from "../../km/text";
import type { KDoc } from "../../km/types";
import { SectionHead } from "./shared";
import { matchesAll, queryTerms } from "../../km/text";
import { useKPage } from "./ctx";

/** زمان مطالعه‌ی تقریبی (۲۰۰ واژه در دقیقه) */
export const readMinutes = (d: Pick<KDoc, "body" | "description">) => Math.max(1, Math.round(((d.body ? mdToPlain(d.body) : d.description) || "").split(/\s+/).filter(Boolean).length / 200));

/** بند ۱: داشبورد مدیریت دانش (خانه‌ی دانشنامه) */
export default function DashboardSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { notify } = useToast();
  const { filterScoped, hasPermission } = useTenancy();
  const [q, setQ] = useState("");
  const [returning, setReturning] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const today = dayNum(km.today)!;
  const ov = km.api.overview();
  const docs = filterScoped(km.docs).filter((d) => km.canSee(d));
  const live = docs.filter((d) => d.status !== "آرشیو");
  const recentNew = [...live].filter((d) => today - (dayNum(d.createdAt) ?? 0) <= 30 || today - (dayNum(d.updatedAt) ?? 0) <= 14).sort((a, b) => (dayNum(b.updatedAt) ?? 0) - (dayNum(a.updatedAt) ?? 0)).slice(0, 5);
  const pending = live.filter((d) => d.status === "در بررسی" || d.status === "تأییدشده");
  const myQueue = pending.filter((d) => km.isApprover(d));
  const top = [...live].filter((d) => d.status === "منتشرشده").sort((a, b) => b.views + b.downloads * 2 - (a.views + a.downloads * 2)).slice(0, 5);
  const nearReview = live.filter((d) => (dayNum(d.reviewDate) ?? 9e9) - today <= 30).sort((a, b) => (dayNum(a.reviewDate) ?? 0) - (dayNum(b.reviewDate) ?? 0));
  const bookmarks = live.filter((d) => d.followers.includes(km.me));
  const changes = km.logs.filter((l) => l.entity.type === "doc" && (l.code === "edit" || l.code === "version" || l.code === "create") && (() => { const x = km.docs.find((y) => y.id === l.entity.id); return !!x && km.canSee(x); })()).slice(0, 5);
  const roots = km.categories.filter((c) => !c.parentId);
  const catCount = (id: string) => live.filter((d) => d.categoryId === id || km.categories.find((c) => c.id === d.categoryId)?.parentId === id).length;
  const maxCat = Math.max(1, ...roots.map((r) => catCount(r.id)));
  const terms = queryTerms(q);
  const has = (...xs: (string | undefined)[]) => matchesAll(xs.filter(Boolean).join(" "), terms);
  const hits = q.trim()
    ? [
        ...live.filter((d) => has(d.title, d.code, d.tags.join(" "))).map((d) => ({ key: d.id, label: d.title, kind: "سند", go: () => page.openDoc(d.id) })),
        ...km.experiences.filter((e) => has(e.title, e.body)).map((e) => ({ key: e.id, label: e.title, kind: e.kind, go: () => page.go(e.projectId ? "projects" : "experience", e.id) })),
        ...km.glossary.filter((g) => has(g.term, g.abbr, g.english)).map((g) => ({ key: g.id, label: `${g.term}${g.abbr ? ` (${g.abbr})` : ""}`, kind: "واژه", go: () => page.go("glossary", g.id) })),
        ...km.experts.filter((x) => has(x.name, x.areas.join(" "))).map((x) => ({ key: x.id, label: x.name, kind: "خبره", go: () => page.go("experts", x.id) })),
      ].slice(0, 8)
    : [];

  /** ردیف سند به سبک v6.8: نویسنده، عنوان، خلاصه، زمان مطالعه، مسیر (فضا · وضعیت · تاریخ · نویسنده) */
  const docRow = (d: KDoc, extra?: { badges?: ReactNode; actions?: ReactNode; priority?: "زیاد" | "متوسط" | "کم" }) => (
    <ListRow
      key={d.id}
      onClick={() => page.openDoc(d.id)}
      lead={<Avatar name={d.author} size={36} />}
      priority={extra?.priority}
      badges={
        <>
          {extra?.badges}
          <Badge tone="neutral" icon={<Clock size={11} />}>{fa(readMinutes(d))} دقیقه مطالعه</Badge>
          <Badge tone="brand">{d.type}</Badge>
        </>
      }
      title={d.title}
      subtitle={`${km.categoryName(d.categoryId)} · ${d.status} ${d.updatedAt} · توسط ${d.author}`}
      actions={extra?.actions}
    />
  );

  const decide = (d: KDoc, a: "approve" | "publish") => {
    km.workflow(d.id, a);
    notify(a === "publish" ? `«${d.title}» منتشر شد.` : `«${d.title}» تأیید شد و به مرحله‌ی بعد رفت.`);
  };

  return (
    <div className="space-y-5">
      <SectionHead icon={<LayoutDashboard size={17} className="text-brand-600" />} title="داشبورد مدیریت دانش" />

      <div className="card p-3 relative">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input-field !pr-9"
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
              <button key={h.key} onClick={h.go} className="w-full text-right flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-ink-50">
                <Badge tone="neutral">{h.kind}</Badge>
                <span className="text-ink-800 truncate">{h.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* شمارنده‌ها به شکل knowledge/overview/ + صف و بازبینی */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="اسناد" value={fa(ov.documents)} hint={`${fa(recentNew.length)} سند تازه در ۳۰ روز`} icon={<FileText size={16} />} tone="brand" onClick={() => page.go("bank")} />
        <StatCard label="سندهای فرصت R&D" value={fa(ov.research_opportunities.total)} hint={`${fa(ov.research_opportunities.delivered)} تحویل‌شده`} progress={ov.research_opportunities.total ? Math.round((ov.research_opportunities.delivered / ov.research_opportunities.total) * 100) : 0} icon={<FlaskConical size={16} />} onClick={() => page.go("rnd")} />
        <StatCard label="شناسنامه‌ها" value={fa(ov.profiles.total)} hint={`در ${fa(ov.profiles.section_count)} بخش`} icon={<IdCard size={16} />} onClick={() => page.go("registry")} />
        <StatCard label="در انتظار بررسی / تأیید" value={fa(pending.length)} hint={myQueue.length ? `${fa(myQueue.length)} مورد در کارتابل شما` : `${fa(nearReview.length)} سند نزدیک بازبینی`} icon={<Hourglass size={16} />} tone={myQueue.length ? "warning" : "neutral"} onClick={() => page.go("workflow")} />
      </div>

      {myQueue.length > 0 && (
        <Card flush title="منتظر تأیید شما" description="سندهایی که همکاران برای بررسی، تأیید یا انتشار به شما سپرده‌اند" icon={<Hourglass />} actions={<Button size="sm" variant="ghost" onClick={() => page.go("workflow")}>گردش کار</Button>}>
          <List>
            {myQueue.slice(0, 5).map((d) => {
              const f = km.flowInfo(d);
              const publishStep = d.status === "تأییدشده" || f?.step.kind === "publish";
              return (
                <div key={d.id}>
                  {docRow(d, {
                    priority: (f?.overdueDays ?? 0) > 0 ? "زیاد" : undefined,
                    badges: <Badge tone={statusTone[d.status]} dot>{f ? f.step.name : d.status}</Badge>,
                    actions: (
                      <>
                        <Button size="sm" variant="tonal" icon={publishStep ? <Megaphone size={14} /> : <CheckCircle2 size={14} />} onClick={() => decide(d, publishStep ? "publish" : "approve")}>
                          {publishStep ? "انتشار" : "تأیید"}
                        </Button>
                        <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} onClick={() => { setReturning(returning === d.id ? null : d.id); setNote(""); }}>
                          ارجاع
                        </Button>
                      </>
                    ),
                  })}
                  {returning === d.id && (
                    <div className="flex gap-2 px-3.5 py-2.5 border-b border-[var(--color-border)] bg-ink-50 flex-wrap">
                      <input className="input-field flex-1 min-w-[200px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="چه چیزی باید اصلاح شود؟" autoFocus />
                      <Button size="sm" variant="primary" onClick={() => { if (!note.trim()) return notify("توضیح ارجاع الزامی است.", "warning"); km.workflow(d.id, "return", note.trim()); setReturning(null); notify("سند برای اصلاح برگشت داده شد."); }}>
                        ثبت ارجاع
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </List>
        </Card>
      )}

      <Card flush title="نیاز به بازبینی" description="تاریخ بازبینی این اسناد گذشته یا تا ۳۰ روز آینده می‌رسد" icon={<CalendarClock />} actions={<Button size="sm" variant="ghost" onClick={() => page.go("review")}>تقویم بازبینی</Button>}>
        {nearReview.length ? (
          <List>
            {nearReview.slice(0, 5).map((d) => {
              const left = (dayNum(d.reviewDate) ?? 0) - today;
              return docRow(d, { badges: <Badge tone={left < 0 ? "danger" : "warning"} dot>{left < 0 ? `نیاز به بازبینی · ${fa(-left)} روز گذشته` : `بازبینی تا ${fa(left)} روز دیگر`}</Badge> });
            })}
          </List>
        ) : (
          <p className="text-[13px] text-ink-500 p-5">موعد نزدیکی نیست.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card flush title="نشان‌شده‌ها" description="اسنادی که دنبال می‌کنید (تغییراتشان به شما اعلان می‌شود)" icon={<Bookmark />}>
          {bookmarks.length ? <List>{bookmarks.slice(0, 5).map((d) => docRow(d))}</List> : <p className="text-[13px] text-ink-500 p-5">هنوز سندی را دنبال نکرده‌اید؛ در برگه‌ی هر سند «دنبال‌کردن» را بزنید.</p>}
        </Card>
        <Card flush title="پربازدید" description="بیشترین خوانده‌شده‌های مخزن دانش" icon={<Eye />}>
          <List>{top.map((d) => docRow(d, { badges: <Badge tone="neutral" icon={<Eye size={11} />}>{fa(d.views)}</Badge> }))}</List>
        </Card>
      </div>

      <Card flush title="تغییرات اخیر" description="آخرین ویرایش‌ها و نسخه‌های اسناد" icon={<FilePlus2 />}>
        <List>
          {changes.map((l) => (
            <ListRow
              key={l.id}
              lead={<Avatar name={l.actor} size={36} />}
              title={`${l.actor} «${l.entity.title}» را ${l.code === "create" ? "ثبت" : "ویرایش"} کرد`}
              subtitle={`${l.at}${l.detail ? ` · ${l.detail}` : ` · ${l.action}`}`}
              actions={
                <Button size="sm" variant="ghost" onClick={() => page.openDoc(l.entity.id)}>
                  مشاهده
                </Button>
              }
            />
          ))}
          {changes.length === 0 && <p className="text-[13px] text-ink-500 p-5">تغییری ثبت نشده است.</p>}
        </List>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="t-card text-ink-900 mb-3">دسته‌بندی‌های اصلی</p>
          <div className="space-y-2.5">
            {roots.map((r) => (
              <button key={r.id} onClick={() => page.go("bank")} className="block w-full text-right">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-ink-800">{r.name}</span>
                  <span className="text-ink-500">{fa(catCount(r.id))} سند</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(catCount(r.id) / maxCat) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="t-card text-ink-900 mb-3 flex items-center gap-1.5">
            <Activity size={16} /> فعالیت‌های اخیر کاربران
            {(hasPermission("knowledge.settings") || hasPermission("knowledge.reports")) && (
              <button onClick={() => page.go("audit")} className="mr-auto text-[12.5px] text-[var(--color-link)] hover:underline font-normal">
                لاگ کامل
              </button>
            )}
          </p>
          <div className="space-y-2">
            {km.logs
              .filter((l) => l.code !== "view" && l.code !== "preview" && (l.entity.type !== "doc" || (() => { const x = km.docs.find((y) => y.id === l.entity.id); return !x || km.canSee(x); })()))
              .slice(0, 7)
              .map((l) => (
                <div key={l.id} className="text-[13px] flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                  <p className="text-ink-700 leading-6">
                    <b>{l.actor}</b> {l.action}: «{l.entity.title}» <span className="text-ink-500">· {l.at}</span>
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => page.go("experience")} className="card p-4 text-right hover:border-teal-500">
          <Lightbulb size={18} className="text-amber-600" />
          <p className="text-[14px] font-bold text-ink-900 mt-2">{fa(km.experiences.length)} تجربه و درس‌آموخته</p>
        </button>
        <button onClick={() => page.go("experts")} className="card p-4 text-right hover:border-teal-500">
          <Users size={18} className="text-teal-700" />
          <p className="text-[14px] font-bold text-ink-900 mt-2">{fa(km.experts.length)} خبره</p>
        </button>
        <button onClick={() => page.go("processes")} className="card p-4 text-right hover:border-teal-500">
          <Activity size={18} className="text-emerald-700" />
          <p className="text-[14px] font-bold text-ink-900 mt-2">{fa(km.processes.length)} فرآیند</p>
        </button>
        <button onClick={() => page.go("glossary")} className="card p-4 text-right hover:border-teal-500">
          <FileText size={18} className="text-navy-700" />
          <p className="text-[14px] font-bold text-ink-900 mt-2">{fa(km.glossary.length)} واژه</p>
        </button>
      </div>
    </div>
  );
}
