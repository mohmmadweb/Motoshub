// ---------------------------------------------------------------------------
// بخش‌های پروفایل روی داده‌ی زنده — فقط آنچه بیننده اجازه‌ی دیدنش را دارد
// (همان قواعد جستجوی سراسری: src/pages/search/liveData.ts).
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, GitBranch, GraduationCap, HelpCircle, Image as ImageIcon, KanbanSquare, ListChecks, MessageSquareText, Newspaper, Pencil, UserCog } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useInnovation } from "../../context/InnovationContext";
import { users, type UserProfile } from "../../data/mock";
import { contentKindLabel } from "../../social/types";
import { dayNum } from "../../pm/jalali";
import { isDone, columnLabel } from "../../pm/selectors";
import { contentLink, datePart, type VisibleData } from "../search/liveData";
import { reportingChain, useManagerOverrides } from "./reporting";

const fa = (n: number) => n.toLocaleString("fa-IR");

type Row = { id: string; icon: typeof Newspaper; kind: string; tone?: BadgeTone; title: string; sub?: string; date: string; to: string };

function RowList({ rows, empty }: { rows: Row[]; empty: string }) {
  const [limit, setLimit] = useState(12);
  if (!rows.length) return <p className="text-xs text-ink-400 px-1 py-2">{empty}</p>;
  return (
    <div className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
      {rows.slice(0, limit).map((r) => (
        <Link key={r.id} to={r.to} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-ink-50/70">
          <span className="w-8 h-8 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
            <r.icon size={14} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-medium text-ink-800 truncate">{r.title}</span>
            <span className="block text-[11.5px] text-ink-400 truncate">{[r.sub, r.date].filter(Boolean).join(" · ")}</span>
          </span>
          <Badge tone={r.tone ?? "neutral"}>{r.kind}</Badge>
          <ChevronLeft size={14} className="text-ink-300 shrink-0 hidden sm:block" />
        </Link>
      ))}
      {rows.length > limit && (
        <button onClick={() => setLimit((l) => l + 12)} className="w-full py-2 text-[12px] text-brand-700 hover:bg-ink-50">
          نمایش بیشتر ({fa(rows.length - limit)})
        </button>
      )}
    </div>
  );
}

const byDate = (a: Row, b: Row) => (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0);

/** داده‌ی پروفایل یک نفر از روی داده‌ی قابل‌دیدن برای بیننده */
export function useProfileData(user: UserProfile, v: VisibleData) {
  const km = useKnowledge();
  const inn = useInnovation();
  return useMemo(() => {
    const content = v.content.filter((c) => c.user_id === user.id && c.is_public && !c.is_draft);
    const media = v.media.filter((m) => m.user_id === user.id && m.is_public && !m.is_draft);
    const events = v.events.filter((e) => e.user_id === user.id && e.is_public && !e.is_draft);
    const topics = v.topics.filter((x) => x.user_id === user.id);
    const answers = v.answers.filter((p) => p.user_id === user.id);
    const topicById = new Map(v.topics.map((x) => [x.id, x]));
    const accepted = answers.filter((p) => topicById.get(p.topic_id)?.accepted_post_id === p.id);

    const projects = v.projects.filter((p) => !p.meta.archived && (p.meta.manager === user.name || p.members.some((m) => m.userId === user.id || m.name === user.name)));
    const openTasks = v.projects.flatMap((p) => p.tasks.filter((t) => !t.archived && t.assignee === user.name && !isDone(p, t)).map((t) => ({ p, t })));
    openTasks.sort((a, b) => (dayNum(a.t.due) ?? 9e9) - (dayNum(b.t.due) ?? 9e9));

    const docs = v.docs.filter((d) => d.owner === user.name || d.author === user.name);
    const expert = km.experts.find((e) => e.userId === user.id || e.name === user.name);

    const courseById = new Map(inn.courses.map((c) => [c.id, c]));
    const trainingCerts = inn.enrollments.filter((e) => e.user === user.name && e.certificateNo).map((e) => ({ e, course: courseById.get(e.courseId) }));
    const awardCerts = inn.awardEntries.filter((a) => a.submitter === user.name && a.certificateNo);
    return { content, media, events, topics, answers, accepted, topicById, projects, openTasks, docs, expert, trainingCerts, awardCerts };
  }, [user, v, km.experts, inn.courses, inn.enrollments, inn.awardEntries]);
}
export type ProfileData = ReturnType<typeof useProfileData>;

// ================================================================= فعالیت‌ها
export function ActivityTab({ d }: { d: ProfileData }) {
  const rows: Row[] = [
    ...d.content.map((c) => ({ id: c.id, icon: Newspaper, kind: contentKindLabel[c.kind], tone: (c.kind === "news" ? "navy" : "brand") as BadgeTone, title: c.title, sub: c.excerpt, date: datePart(c.published_at ?? c.created_at), to: contentLink(c.kind, c.id) })),
    ...d.media.map((m) => ({ id: m.id, icon: ImageIcon, kind: "رسانه", title: m.caption || "بدون توضیح", date: datePart(m.published_at ?? m.created_at), to: `/dashboard/media/${m.id}` })),
    ...d.events.map((e) => ({ id: e.id, icon: CalendarDays, kind: "رویداد", tone: "success" as BadgeTone, title: e.title, sub: e.location, date: datePart(e.start_date), to: `/dashboard/events/${e.id}` })),
    ...d.topics.map((x) => ({ id: x.id, icon: HelpCircle, kind: "پرسش", title: x.title, sub: `${fa(x.view_count)} بازدید`, date: datePart(x.created_at), to: `/dashboard/forum/${x.id}` })),
    ...d.answers.map((p) => {
      const tp = d.topicById.get(p.topic_id);
      const acc = tp?.accepted_post_id === p.id;
      return { id: p.id, icon: acc ? CheckCircle2 : MessageSquareText, kind: acc ? "پاسخ پذیرفته" : "پاسخ", tone: (acc ? "success" : "neutral") as BadgeTone, title: tp?.title ?? "پرسش", sub: p.content.slice(0, 80), date: datePart(p.created_at), to: `/dashboard/forum/${p.topic_id}` };
    }),
  ].sort(byDate);
  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-ink-900 mb-3">مطالب و پاسخ‌های منتشرشده</h3>
      <RowList rows={rows} empty="مطلب یا پاسخی که اجازه‌ی دیدنش را داشته باشید ثبت نشده است." />
    </div>
  );
}

// ================================================================= پروژه و کار
export function WorkTab({ d, user }: { d: ProfileData; user: UserProfile }) {
  const { today } = useTenancy();
  const todayN = dayNum(today) ?? 0;
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
          <KanbanSquare size={15} className="text-brand-600" /> پروژه‌ها ({fa(d.projects.length)})
        </h3>
        {d.projects.length === 0 ? (
          <p className="text-xs text-ink-400">پروژه‌ی فعالی که در دید شما باشد ثبت نشده.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {d.projects.map((p) => {
              const role = p.meta.manager === user.name ? "مدیر پروژه" : p.members.find((m) => m.userId === user.id || m.name === user.name)?.role ?? "عضو";
              const total = p.tasks.filter((t) => !t.archived).length;
              const done = p.tasks.filter((t) => !t.archived && isDone(p, t)).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <Link key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} className="border border-ink-100 rounded-lg p-3 hover:border-brand-300">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-ink-800 truncate">{p.meta.name}</span>
                    <Badge tone={p.meta.health === "سبز" ? "success" : p.meta.health === "زرد" ? "warning" : "danger"}>{p.meta.health}</Badge>
                  </span>
                  <span className="block text-[11.5px] text-ink-400 mt-0.5">
                    {role} · {p.meta.phase}
                  </span>
                  <span className="block h-1.5 rounded-full bg-ink-100 mt-2 overflow-hidden">
                    <span className="block h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
          <ListChecks size={15} className="text-brand-600" /> کارهای باز ({fa(d.openTasks.length)})
        </h3>
        <RowList
          rows={d.openTasks.map(({ p, t }) => {
            const late = (dayNum(t.due) ?? 9e9) < todayN;
            return { id: `${p.meta.id}-${t.id}`, icon: ListChecks, kind: late ? "عقب‌افتاده" : columnLabel(p, t.status), tone: late ? "danger" : "neutral", title: `${t.key ? `${t.key} — ` : ""}${t.title}`, sub: p.meta.name, date: t.due ? `سررسید ${t.due}` : "", to: `/dashboard/projects/${p.meta.id}?tab=board&focus=${t.key ?? t.id}` };
          })}
          empty="کار بازی ندارد."
        />
      </div>
    </div>
  );
}

// ================================================================= دانش
export function KnowledgeTab({ d }: { d: ProfileData }) {
  return (
    <div className="space-y-4">
      {d.expert && (
        <div className="card p-4">
          <h3 className="text-sm font-bold text-ink-900 mb-2">حوزه‌های خبرگی</h3>
          <p className="text-[12px] text-ink-500 mb-2">
            {d.expert.title} · {d.expert.unit}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...d.expert.areas, ...d.expert.topics].map((a) => (
              <Badge key={a} tone="brand">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
          <BookOpen size={15} className="text-brand-600" /> اسناد دانشی ثبت‌شده ({fa(d.docs.length)})
        </h3>
        <RowList
          rows={d.docs
            .map((k) => ({ id: k.id, icon: BookOpen, kind: k.access, tone: (k.access === "محرمانه" || k.access === "خیلی محرمانه" ? "danger" : "neutral") as BadgeTone, title: k.title, sub: `${k.code} · ${k.status}`, date: datePart(k.updatedAt), to: `/dashboard/knowledge?doc=${k.id}` }))
            .sort(byDate)}
          empty="سندی که اجازه‌ی دیدنش را داشته باشید ثبت نکرده است."
        />
      </div>
    </div>
  );
}

// ================================================================= گواهی‌ها
export function CertificatesTab({ d }: { d: ProfileData }) {
  const rows: Row[] = [
    ...d.awardCerts.map((a) => ({ id: a.id, icon: Award, kind: a.status, tone: "warning" as BadgeTone, title: a.title, sub: `جایزه نوآوری · گواهی ${a.certificateNo}`, date: datePart(a.createdAt), to: "/dashboard/award" })),
    ...d.trainingCerts.map(({ e, course }) => ({ id: e.id, icon: GraduationCap, kind: "گواهی دوره", tone: "success" as BadgeTone, title: course?.title ?? "دوره آموزشی", sub: `${course?.hours ? `${fa(course.hours)} ساعت · ` : ""}شماره ${e.certificateNo}`, date: datePart(e.certifiedAt), to: "/dashboard/training" })),
  ].sort(byDate);
  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-ink-900 mb-3">گواهی‌ها و افتخارات</h3>
      {rows.length === 0 ? <EmptyState icon={<Award size={20} />} title="گواهی‌ای ثبت نشده" description="گواهی دوره‌های آموزشی و آثار برگزیده‌ی جایزه نوآوری اینجا نمایش داده می‌شود." /> : <RowList rows={rows} empty="" />}
    </div>
  );
}

// ================================================================= زنجیره‌ی گزارش‌دهی
export function ReportingChain({ user }: { user: UserProfile }) {
  const t = useTenancy();
  const { notify } = useToast();
  const { map, setManager } = useManagerOverrides();
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState("");
  const chain = reportingChain(t.iam, user.id, t.today, map);
  const home = t.membershipsOf(user.id).find((m) => m.primary && m.status === "active") ?? t.membershipsOf(user.id).find((m) => m.status === "active");
  const canEdit = !!home && t.canAdmin(home.scopeId, "iam.members.manage");
  const candidates = users.filter((u) => u.id !== user.id && t.visibleUserIds().includes(u.id));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
          <GitBranch size={15} className="text-brand-600" /> زنجیره‌ی گزارش‌دهی
        </h3>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Pencil size={12} />}
            onClick={() => {
              setPick(map[user.id] ?? "");
              setEditing(true);
            }}
          >
            مدیر مستقیم
          </Button>
        )}
      </div>
      {chain.length === 0 ? (
        <p className="text-xs text-ink-400">برای واحد این فرد مدیر یا سرپرستی ثبت نشده است.</p>
      ) : (
        <ol className="relative border-r-2 border-ink-100 mr-3 space-y-3">
          {chain.map((c, i) => {
            const u = users.find((x) => x.id === c.userId);
            const body = (
              <span className="flex items-center gap-2.5 min-w-0">
                <Avatar name={c.name} color={u?.avatarColor ?? "#64748b"} size={30} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink-800 truncate">{c.name}</span>
                  <span className="block text-[11.5px] text-ink-400 truncate">
                    {c.title} · {c.scope.name}
                  </span>
                </span>
                {i === 0 && <Badge tone="brand">مدیر مستقیم</Badge>}
              </span>
            );
            return (
              <li key={`${c.scope.id}-${c.name}`} className="pr-4 relative">
                <span className="absolute -right-[7px] top-3 w-3 h-3 rounded-full bg-white border-2 border-brand-500" />
                {c.userId ? (
                  <Link to={`/dashboard/profile/${c.userId}`} className="block rounded-lg px-2 py-1.5 hover:bg-ink-50">
                    {body}
                  </Link>
                ) : (
                  <div className="px-2 py-1.5">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-[11px] text-ink-400 mt-3 flex items-center gap-1">
        <UserCog size={11} /> برگرفته از مدیران و سرپرستان واحدهای سازمانی؛ مدیر مستقیم قابل تعیین است.
      </p>

      <Modal open={editing} onClose={() => setEditing(false)} title={`مدیر مستقیم ${user.name}`} description="اگر خالی بماند، زنجیره از مدیر واحد محاسبه می‌شود.">
        <div className="space-y-3">
          <select className="input-field" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="مدیر مستقیم">
            <option value="">— محاسبه‌ی خودکار از ساختار —</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1 justify-center"
              onClick={() => {
                setManager(user.id, pick || null);
                setEditing(false);
                notify(pick ? "مدیر مستقیم ثبت شد." : "زنجیره به حالت خودکار برگشت.", "success");
              }}
            >
              ذخیره
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
