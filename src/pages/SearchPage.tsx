// ---------------------------------------------------------------------------
// جستجوی سراسری روی داده‌ی زنده — مطالب، پرسش‌ها، رسانه، گفتگوها، فایل‌ها، اسناد دانش،
// پروژه و تسک، افراد و نوآوری. هر نتیجه دقیقاً با قواعد دیدِ ماژول خودش فیلتر می‌شود
// (src/pages/search/liveData.ts). نرمال‌سازی فارسی (ی/ي، ک/ك، نیم‌فاصله، ارقام) از
// src/km/text.ts می‌آید؛ کلید تسک (مثل QGJ-12) دقیق تطبیق می‌شود.
// پارامترها: ?q=عبارت &tab=content|qa|media|chats|files|docs|pm|people|innovation &scope=<scopeId> &when=7|30|90|365
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Newspaper,
  CalendarDays,
  Image as ImageIcon,
  BookOpen,
  MessagesSquare,
  MessageSquareText,
  User,
  KanbanSquare,
  ListChecks,
  FileText,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import { useTenancy } from "../context/TenancyContext";
import { useSocial } from "../context/SocialContext";
import { docSearchText } from "../context/KnowledgeContext";
import { normalizeFa, queryTerms, snippetOf, mdToPlain } from "../km/text";
import { dayNum } from "../pm/jalali";
import { descendantsOrSelf, ROOT_ID } from "../iam/model";
import { contentKindLabel } from "../social/types";
import { chatLink, contentLink, datePart, ownerScopeOf, useVisibleData } from "./search/liveData";
import Highlight from "./search/Highlight";

type TabId = "all" | "content" | "qa" | "media" | "chats" | "files" | "docs" | "pm" | "people" | "innovation";
const TAB_LABEL: Record<TabId, string> = {
  all: "همه",
  content: "مطالب",
  qa: "پرسش‌ها",
  media: "رسانه",
  chats: "گفتگوها",
  files: "فایل‌ها",
  docs: "اسناد دانش",
  pm: "پروژه و تسک",
  people: "افراد",
  innovation: "نوآوری",
};
const TAB_ORDER: TabId[] = ["all", "content", "qa", "media", "chats", "files", "docs", "pm", "people", "innovation"];

type Hit = {
  id: string;
  tab: Exclude<TabId, "all">;
  kind: string;
  icon: typeof Search;
  title: string;
  /** متن قابل جستجو (بدنه) */
  body: string;
  /** متن جایگزین وقتی تطبیق فقط در عنوان است */
  meta: string;
  date: string;
  scopeId: string;
  to: string;
  tone?: BadgeTone;
  /** کلید تسک/پروژه برای تطبیق دقیق */
  key?: string;
  hay: string;
  titleN: string;
};

const WHEN: { id: string; label: string; days: number }[] = [
  { id: "", label: "هر زمان", days: 0 },
  { id: "7", label: "۷ روز اخیر", days: 7 },
  { id: "30", label: "۳۰ روز اخیر", days: 30 },
  { id: "90", label: "۹۰ روز اخیر", days: 90 },
  { id: "365", label: "یک سال اخیر", days: 365 },
];
const PAGE = 30;
const KEY_RE = /^[a-z]{2,6}-\d+$/;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const rawTab = params.get("tab") as TabId | null;
  const tab: TabId = rawTab && TAB_ORDER.includes(rawTab) ? rawTab : "all";
  const scopeF = params.get("scope") ?? "";
  const when = params.get("when") ?? "";
  const [limit, setLimit] = useState(PAGE);
  const t = useTenancy();
  const s = useSocial();
  const v = useVisibleData();

  const setParam = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, val]) => (val ? next.set(k, val) : next.delete(k)));
    setParams(next, { replace: true });
    setLimit(PAGE);
  };

  // ------------------------------------------------------------- نمایه
  const index: Hit[] = useMemo(() => {
    const hits: Omit<Hit, "hay" | "titleN">[] = [];
    const chatById = new Map(s.chats.map((c) => [c.id, c]));
    const userName = (id: string) => s.userName(id);

    v.content.forEach((c) =>
      hits.push({ id: `c-${c.id}`, tab: "content", kind: contentKindLabel[c.kind], icon: Newspaper, title: c.title, body: `${c.excerpt} ${mdToPlain(c.content)} ${c.tags.join(" ")}`, meta: `${userName(c.user_id)} · ${c.excerpt}`, date: datePart(c.published_at ?? c.created_at), scopeId: ownerScopeOf(c), to: contentLink(c.kind, c.id), tone: c.kind === "news" ? "navy" : "brand" })
    );
    v.events.forEach((e) =>
      hits.push({ id: `ev-${e.id}`, tab: "content", kind: "رویداد", icon: CalendarDays, title: e.title, body: `${e.description} ${e.location} ${e.tags.join(" ")}`, meta: `${e.start_date} · ${e.is_online ? "آنلاین" : e.location}`, date: datePart(e.start_date), scopeId: ownerScopeOf(e), to: `/dashboard/events/${e.id}`, tone: "success" })
    );
    v.topics.forEach((x) =>
      hits.push({ id: `tp-${x.id}`, tab: "qa", kind: x.accepted_post_id ? "پرسش (پاسخ پذیرفته)" : "پرسش", icon: HelpCircle, title: x.title, body: `${mdToPlain(x.content)} ${x.tags.join(" ")}`, meta: `${userName(x.user_id)} · ${x.view_count.toLocaleString("fa-IR")} بازدید`, date: datePart(x.created_at), scopeId: ownerScopeOf(x), to: `/dashboard/forum/${x.id}`, tone: x.accepted_post_id ? "success" : "brand" })
    );
    const topicTitle = new Map(v.topics.map((x) => [x.id, x]));
    v.answers.forEach((p) => {
      const tp = topicTitle.get(p.topic_id);
      if (!tp) return;
      const accepted = tp.accepted_post_id === p.id;
      hits.push({ id: `ps-${p.id}`, tab: "qa", kind: accepted ? "پاسخ پذیرفته" : "پاسخ", icon: accepted ? CheckCircle2 : MessageSquareText, title: `پاسخ ${userName(p.user_id)} در «${tp.title}»`, body: mdToPlain(p.content), meta: tp.title, date: datePart(p.created_at), scopeId: ownerScopeOf(tp), to: `/dashboard/forum/${tp.id}`, tone: accepted ? "success" : "neutral" });
    });
    v.media.forEach((m) =>
      hits.push({ id: `md-${m.id}`, tab: "media", kind: "رسانه", icon: ImageIcon, title: m.caption || "بدون توضیح", body: m.tags.join(" "), meta: userName(m.user_id), date: datePart(m.published_at ?? m.created_at), scopeId: ownerScopeOf(m), to: `/dashboard/media/${m.id}` })
    );
    v.chats.forEach((c) => {
      if (c.chat_type === "saved_messages") return;
      const title = c.chat_type === "direct_message" ? `گفتگو با ${userName(c.members.find((m) => m.user_id !== s.me)?.user_id ?? c.owner_id)}` : c.title;
      hits.push({ id: `ch-${c.id}`, tab: "chats", kind: c.chat_type === "group" ? "گروه" : c.chat_type === "channel" ? "کانال" : "گفتگو", icon: MessagesSquare, title, body: `${c.description} ${c.tags.join(" ")}`, meta: `${c.members.length.toLocaleString("fa-IR")} عضو${v.memberChatIds.has(c.id) ? "" : " · عمومی"}`, date: datePart(c.created_at), scopeId: ROOT_ID, to: chatLink(c), tone: "navy" });
    });
    v.messages.forEach((m) => {
      const c = chatById.get(m.chat_id);
      if (!c || !m.content) return;
      const where = c.chat_type === "direct_message" ? "پیام مستقیم" : c.chat_type === "saved_messages" ? "پیام‌های ذخیره‌شده" : c.title;
      hits.push({ id: `msg-${m.id}`, tab: "chats", kind: "پیام", icon: MessageSquareText, title: `${userName(m.user_id)} در ${where}`, body: `${m.content} ${m.tags.join(" ")}`, meta: m.content, date: datePart(m.created_at), scopeId: ROOT_ID, to: chatLink(c) });
    });
    v.files.forEach((f) => {
      const owner = f.owner_type === "user" ? "فایل‌های من" : chatById.get(f.owner_id)?.title ?? "—";
      hits.push({ id: `f-${f.id}`, tab: "files", kind: "فایل", icon: FileText, title: f.name, body: owner, meta: `${owner} · ${f.size}`, date: datePart(f.created_at), scopeId: ROOT_ID, to: f.owner_type === "user" ? "/dashboard/files" : `/dashboard/files?owner=${f.owner_type}:${f.owner_id}` });
    });
    v.docs.forEach((d) =>
      hits.push({ id: `k-${d.id}`, tab: "docs", kind: `سند ${d.access}`, icon: BookOpen, title: d.title, body: docSearchText(d, true), meta: `${d.code} · ${d.owner} · ${d.status}`, date: datePart(d.updatedAt), scopeId: ownerScopeOf(d), to: `/dashboard/knowledge?doc=${d.id}`, tone: d.access === "محرمانه" || d.access === "خیلی محرمانه" ? "danger" : "neutral" })
    );
    v.projects.forEach((p) => {
      const sc = ownerScopeOf(p.meta);
      hits.push({ id: `p-${p.meta.id}`, tab: "pm", kind: "پروژه", icon: KanbanSquare, title: p.meta.name, body: `${p.meta.description} ${p.meta.client} ${p.meta.manager} ${p.meta.tags.join(" ")} ${p.meta.category}`, meta: `${p.meta.key ? `${p.meta.key} · ` : ""}مدیر: ${p.meta.manager} · ${p.meta.phase}`, date: datePart(p.meta.createdAt), scopeId: sc, to: `/dashboard/projects/${p.meta.id}`, key: p.meta.key?.toLowerCase(), tone: "brand" });
      p.tasks
        .filter((x) => !x.archived)
        .forEach((x) =>
          hits.push({ id: `t-${p.meta.id}-${x.id}`, tab: "pm", kind: "تسک", icon: ListChecks, title: `${x.key ? `${x.key} — ` : ""}${x.title}`, body: `${x.description} ${x.labels.join(" ")} ${x.assignee} ${x.comments.map((c) => c.text).join(" ")}`, meta: `${p.meta.name} · ${x.assignee || "بدون مسئول"}${x.due ? ` · سررسید ${x.due}` : ""}`, date: datePart(x.createdAt), scopeId: sc, to: `/dashboard/projects/${p.meta.id}?tab=board&focus=${x.key ?? x.id}`, key: x.key?.toLowerCase() })
        );
    });
    v.people.forEach((u) => {
      const mem = t.membershipsOf(u.id).find((m) => m.primary) ?? t.membershipsOf(u.id)[0];
      hits.push({ id: `u-${u.id}`, tab: "people", kind: "فرد", icon: User, title: u.name, body: `${u.role} ${u.org} ${u.skills.join(" ")} ${mem?.title ?? ""}`, meta: `${mem?.title ?? u.role} · ${mem ? mem.scope.name : u.org}`, date: "", scopeId: mem?.scopeId ?? ROOT_ID, to: `/dashboard/profile/${u.id}`, tone: "navy" });
    });
    v.calls.forEach((c) => hits.push({ id: `rc-${c.id}`, tab: "innovation", kind: "فرصت پژوهشی", icon: Lightbulb, title: c.title, body: `${c.field} ${c.description} ${c.supervisor}`, meta: `${c.field} · ${c.stage}`, date: datePart(c.createdAt), scopeId: ownerScopeOf(c), to: `/dashboard/research?open=${c.id}` }));
    v.contracts.forEach((c) => hits.push({ id: `ct-${c.id}`, tab: "innovation", kind: "قرارداد", icon: FileText, title: c.title, body: `${c.vendor} ${c.type} ${c.method} ${c.owner}`, meta: `${c.vendor} · ${c.stage}`, date: datePart(c.createdAt || c.startDate), scopeId: ownerScopeOf(c), to: `/dashboard/contracts?open=${c.id}` }));
    v.funds.forEach((f) => hits.push({ id: `fn-${f.id}`, tab: "innovation", kind: "طرح صندوق", icon: Lightbulb, title: f.title, body: `${f.applicant} ${f.region} ${f.field}`, meta: `${f.applicant} · ${f.stage}`, date: "", scopeId: ownerScopeOf(f), to: `/dashboard/funds?tab=employment&focus=${f.id}` }));
    v.nf.forEach((p) => hits.push({ id: `nf-${p.id}`, tab: "innovation", kind: "صندوق نوآور", icon: Lightbulb, title: `${p.id} — ${p.titleFa}`, body: `${p.titleEn} ${p.field} ${p.macroField} ${p.team.name}`, meta: `${p.team.name} · ${p.stage}`, date: "", scopeId: ownerScopeOf(p), to: `/dashboard/funds?focus=${p.id}`, key: p.id.toLowerCase() }));
    v.courses.forEach((c) => hits.push({ id: `co-${c.id}`, tab: "innovation", kind: "دوره آموزشی", icon: Lightbulb, title: c.title, body: `${c.instructor} ${c.field} ${c.mode}`, meta: `${c.instructor} · ${c.status}`, date: datePart(c.date), scopeId: ownerScopeOf(c), to: "/dashboard/training" }));
    v.awards.forEach((a) => hits.push({ id: `aw-${a.id}`, tab: "innovation", kind: "اثر جایزه", icon: Lightbulb, title: a.title, body: `${a.companyName} ${a.summary} ${a.category} ${a.submitter}`, meta: `${a.companyName} · ${a.status}`, date: datePart(a.createdAt), scopeId: a.holdingId ?? ROOT_ID, to: "/dashboard/award" }));
    v.entities.forEach((e) => hits.push({ id: `en-${e.id}`, tab: "innovation", kind: e.kind === "company" ? "شرکت فناور" : "پژوهشگر", icon: Lightbulb, title: e.name, body: `${e.field} ${e.city} ${e.affiliation ?? ""} ${(e.certificates ?? []).join(" ")}`, meta: `${e.field} · ${e.city}`, date: "", scopeId: e.companyId ?? e.holdingId ?? ROOT_ID, to: `/dashboard/research?tab=bank&entity=${e.id}` }));

    return hits.map((h) => ({ ...h, titleN: normalizeFa(h.title), hay: normalizeFa(`${h.title} \n ${h.body} \n ${h.meta}`) }));
  }, [v, s, t]);

  // ------------------------------------------------------------- تطبیق
  const terms = useMemo(() => queryTerms(q), [q]);
  const qn = normalizeFa(q);
  const isKey = KEY_RE.test(qn.replace(/\s+/g, ""));

  const scopeSet = useMemo(() => (scopeF ? new Set(descendantsOrSelf(t.iam, scopeF).map((n) => n.id)) : null), [scopeF, t.iam]);
  const whenDays = WHEN.find((w) => w.id === when)?.days ?? 0;
  const todayN = dayNum(t.today) ?? 0;

  const matched = useMemo(() => {
    if (!terms.length) return [];
    const key = qn.replace(/\s+/g, "");
    const out: (Hit & { score: number })[] = [];
    index.forEach((h) => {
      let score = 0;
      if (isKey && h.key) {
        // کلید تسک دقیق: QGJ-1 نباید QGJ-12 را بیاورد
        if (h.key !== key) return;
        score = 1000;
      } else {
        if (!terms.every((x) => h.hay.includes(x))) return;
        if (h.titleN === qn) score += 50;
        if (terms.every((x) => h.titleN.includes(x))) score += 20;
        score += terms.reduce((a, x) => a + (h.hay.split(x).length - 1), 0);
      }
      if (scopeSet && !scopeSet.has(h.scopeId)) return;
      if (whenDays) {
        if (h.tab !== "people") {
          const d = dayNum(h.date);
          if (d === null || todayN - d > whenDays || d > todayN + 365) return;
        }
      }
      out.push({ ...h, score });
    });
    return out.sort((a, b) => b.score - a.score || (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0));
  }, [index, terms, qn, isKey, scopeSet, whenDays, todayN]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(TAB_ORDER.map((x) => [x, 0])) as Record<TabId, number>;
    matched.forEach((h) => (c[h.tab] += 1));
    c.all = matched.length;
    return c;
  }, [matched]);
  const results = tab === "all" ? matched : matched.filter((h) => h.tab === tab);

  const scopeNodes = useMemo(() => descendantsOrSelf(t.iam, t.contextId).filter((n) => n.active), [t.iam, t.contextId]);
  const activeFilters = (scopeF ? 1 : 0) + (when ? 1 : 0);

  return (
    <div>
      <PageHeader title="جستجوی سراسری" description="جستجو در همه‌ی داده‌هایی که اجازه‌ی دیدنشان را دارید — با یکسان‌سازی «ی/ي»، «ک/ك»، نیم‌فاصله و ارقام." icon={<Search size={18} />} />

      <div className="card p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setParam({ q: e.target.value })}
              placeholder="عبارت، نام فرد یا کلید تسک (مثل QGJ-12)…"
              className="input-field !pr-10 !py-2.5"
              aria-label="عبارت جستجو"
            />
          </div>
          <div className="flex gap-2">
            <select className="input-field sm:w-48 min-w-0" value={scopeF} onChange={(e) => setParam({ scope: e.target.value })} aria-label="دامنه‌ی سازمانی">
              <option value="">همه‌ی واحدهای در دید</option>
              {scopeNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id === t.contextId ? `${n.name} (همه)` : n.name}
                </option>
              ))}
            </select>
            <select className="input-field sm:w-36 min-w-0" value={when} onChange={(e) => setParam({ when: e.target.value })} aria-label="بازه‌ی زمانی">
              {WHEN.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {activeFilters > 0 && (
          <button onClick={() => setParam({ scope: "", when: "" })} className="mt-2 text-[12px] text-ink-500 hover:text-ink-800 inline-flex items-center gap-1">
            <X size={12} /> پاک کردن فیلترها
          </button>
        )}
      </div>

      {terms.length > 0 && (
        <Tabs<TabId>
          tabs={TAB_ORDER.map((id) => ({ id, label: TAB_LABEL[id], count: counts[id] }))}
          active={tab}
          onChange={(id) => setParam({ tab: id === "all" ? "" : id })}
        />
      )}

      {!terms.length ? (
        <div className="card">
          <EmptyState icon={<Search size={20} />} title="عبارتی بنویسید تا در کل سامانه جستجو شود" description="نتایج فقط از محتوا، گفتگوها، اسناد و پروژه‌هایی می‌آید که در کانتکست فعلی اجازه‌ی دیدنشان را دارید." />
        </div>
      ) : results.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Search size={20} />} title={`نتیجه‌ای برای «${q}» پیدا نشد`} description={isKey ? "کلید تسک باید دقیقاً منطبق باشد (مثل QGJ-12)." : activeFilters ? "فیلتر دامنه یا بازه‌ی زمانی را بردارید." : "املای دیگری را امتحان کنید."} />
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {results.slice(0, limit).map((h) => {
            const Icon = h.icon;
            const titleHit = terms.every((x) => h.titleN.includes(x));
            const bodyText = h.body.trim();
            const snippet = !isKey && bodyText && normalizeFa(bodyText).includes(terms[0]) ? snippetOf(bodyText, terms, 70) : h.meta;
            return (
              <Link key={h.id} to={h.to} className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50/60 transition-colors group">
                <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                  <Icon size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-ink-900 group-hover:text-brand-700 truncate">{titleHit || isKey ? <Highlight text={h.title} terms={isKey ? [qn.replace(/\s+/g, "")] : terms} /> : h.title}</span>
                  </span>
                  <span className="block text-[12px] text-ink-500 leading-5 mt-0.5 line-clamp-2 break-words">
                    <Highlight text={snippet} terms={terms} />
                  </span>
                  <span className="flex items-center gap-2 mt-1 text-[11px] text-ink-400 flex-wrap">
                    {h.date && <span>{h.date}</span>}
                    {h.scopeId !== ROOT_ID && <span>{t.scopeLabel(h.scopeId)}</span>}
                  </span>
                </span>
                <span className="shrink-0">
                  <Badge tone={h.tone ?? "neutral"}>{h.kind}</Badge>
                </span>
              </Link>
            );
          })}
          {results.length > limit && (
            <div className="p-3 text-center">
              <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
                نمایش بیشتر ({(results.length - limit).toLocaleString("fa-IR")} نتیجه‌ی دیگر)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
