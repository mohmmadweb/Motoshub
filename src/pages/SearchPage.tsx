// ---------------------------------------------------------------------------
// جستجوی سراسری روی داده‌ی زنده — مطالب، پرسش‌ها، رسانه، گفتگوها، فایل‌ها، اسناد دانش،
// پروژه و تسک و افراد. هر نتیجه دقیقاً با قواعد دیدِ ماژول خودش فیلتر می‌شود
// (src/pages/search/liveData.ts). نرمال‌سازی فارسی (ی/ي، ک/ك، نیم‌فاصله، ارقام) از
// src/km/text.ts می‌آید؛ کلید تسک (مثل QGJ-12) دقیق تطبیق می‌شود.
// پارامترها: ?q=عبارت &tab=content|qa|media|chats|files|docs|pm|people &scope=<scopeId> &when=7|30|90|365
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
import { kmDocHref } from "../km/nav";

type TabId = "all" | "content" | "qa" | "media" | "chats" | "files" | "docs" | "pm" | "people";
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
};
const TAB_ORDER: TabId[] = ["all", "content", "qa", "media", "chats", "files", "docs", "pm", "people"];

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
  /** `SearchHit.type` در `/search/search/` — فقط blog/event/forum/magazine/media/news نمایه می‌شوند؛ بقیه «پیشنهادی» */
  apiType?: SearchHitType;
};

/** انواع نمایه‌شده در سرویس جستجوی واقعی */
export type SearchHitType = "blog" | "event" | "forum" | "magazine" | "media" | "news";
/** شکل واقعی هر نتیجه (`GET /search/search/` → `{ data: SearchHit[], meta }`) */
export type SearchHit = { id: string; type: SearchHitType; title: string; snippet: string; author_id: string | null; privacy: string; tags: string[] };
const contentApiType: Record<string, SearchHitType> = { news: "news", blogs: "blog", magazines: "magazine" };

const WHEN: { id: string; label: string; days: number }[] = [
  { id: "", label: "هر زمان", days: 0 },
  { id: "7", label: "۷ روز اخیر", days: 7 },
  { id: "30", label: "۳۰ روز اخیر", days: 30 },
  { id: "90", label: "۹۰ روز اخیر", days: 90 },
  { id: "365", label: "یک سال اخیر", days: 365 },
];
const PAGE = 30;
const KEY_RE = /^[a-z]{2,6}-\d+$/;

/** نمای «همه»: نتایج به ترتیب گروه (v6.8 popover groups)، حداکثر ۵ ردیف از هر گروه با سرآیند گروه */
function groupHeads<T extends { tab: Exclude<TabId, "all"> }>(rows: T[]): { h: T; head: TabId | null }[] {
  const out: { h: T; head: TabId | null }[] = [];
  TAB_ORDER.filter((x) => x !== "all").forEach((g) => {
    rows
      .filter((r) => r.tab === g)
      .slice(0, 5)
      .forEach((h, i) => out.push({ h, head: i === 0 ? g : null }));
  });
  return out;
}

/** تبدیل نتیجه به شکل واقعی SearchHit (فقط انواع نمایه‌شده) */
export function toSearchHit(h: { id: string; apiType?: SearchHitType; title: string; meta: string }): SearchHit | null {
  return h.apiType ? { id: h.id.replace(/^[a-z]+-/, ""), type: h.apiType, title: h.title, snippet: h.meta, author_id: null, privacy: "EVERYONE", tags: [] } : null;
}

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
      hits.push({ id: `c-${c.id}`, tab: "content", kind: contentKindLabel[c.kind], icon: Newspaper, title: c.title, body: `${c.excerpt} ${mdToPlain(c.content)} ${c.tags.join(" ")}`, meta: `${userName(c.user_id)} · ${c.excerpt}`, date: datePart(c.published_at ?? c.created_at), scopeId: ownerScopeOf(c), to: contentLink(c.kind, c.id), tone: c.kind === "news" ? "navy" : "brand", apiType: contentApiType[c.kind] })
    );
    v.events.forEach((e) =>
      hits.push({ id: `ev-${e.id}`, tab: "content", kind: "رویداد", icon: CalendarDays, title: e.title, body: `${e.description} ${e.location} ${e.tags.join(" ")}`, meta: `${e.start_date} · ${e.is_online ? "آنلاین" : e.location}`, date: datePart(e.start_date), scopeId: ownerScopeOf(e), to: `/events/${e.id}`, tone: "success", apiType: "event" })
    );
    v.topics.forEach((x) =>
      hits.push({ id: `tp-${x.id}`, tab: "qa", kind: x.accepted_post_id ? "پرسش (پاسخ پذیرفته)" : "پرسش", icon: HelpCircle, title: x.title, body: `${mdToPlain(x.content)} ${x.tags.join(" ")}`, meta: `${userName(x.user_id)} · ${x.view_count.toLocaleString("fa-IR")} بازدید`, date: datePart(x.created_at), scopeId: ownerScopeOf(x), to: `/forums/${x.id}`, tone: x.accepted_post_id ? "success" : "brand", apiType: "forum" })
    );
    const topicTitle = new Map(v.topics.map((x) => [x.id, x]));
    v.answers.forEach((p) => {
      const tp = topicTitle.get(p.topic_id);
      if (!tp) return;
      const accepted = tp.accepted_post_id === p.id;
      hits.push({ id: `ps-${p.id}`, tab: "qa", kind: accepted ? "پاسخ پذیرفته" : "پاسخ", icon: accepted ? CheckCircle2 : MessageSquareText, title: `پاسخ ${userName(p.user_id)} در «${tp.title}»`, body: mdToPlain(p.content), meta: tp.title, date: datePart(p.created_at), scopeId: ownerScopeOf(tp), to: `/forums/${tp.id}`, tone: accepted ? "success" : "neutral" });
    });
    v.media.forEach((m) =>
      hits.push({ id: `md-${m.id}`, tab: "media", kind: "رسانه", icon: ImageIcon, title: m.caption || "بدون توضیح", body: m.tags.join(" "), meta: userName(m.user_id), date: datePart(m.published_at ?? m.created_at), scopeId: ownerScopeOf(m), to: `/media/${m.id}`, apiType: "media" })
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
      hits.push({ id: `f-${f.id}`, tab: "files", kind: "فایل", icon: FileText, title: f.name, body: owner, meta: `${owner} · ${f.size}`, date: datePart(f.created_at), scopeId: ROOT_ID, to: f.owner_type === "user" ? "/files" : `/files?owner=${f.owner_type}:${f.owner_id}` });
    });
    v.docs.forEach((d) =>
      hits.push({ id: `k-${d.id}`, tab: "docs", kind: `سند ${d.access}`, icon: BookOpen, title: d.title, body: docSearchText(d, true), meta: `${d.code} · ${d.owner} · ${d.status}`, date: datePart(d.updatedAt), scopeId: ownerScopeOf(d), to: kmDocHref(d.id), tone: d.access === "محرمانه" || d.access === "خیلی محرمانه" ? "danger" : "neutral" })
    );
    v.projects.forEach((p) => {
      const sc = ownerScopeOf(p.meta);
      hits.push({ id: `p-${p.meta.id}`, tab: "pm", kind: "پروژه", icon: KanbanSquare, title: p.meta.name, body: `${p.meta.description} ${p.meta.client} ${p.meta.manager} ${p.meta.tags.join(" ")} ${p.meta.category}`, meta: `${p.meta.key ? `${p.meta.key} · ` : ""}مدیر: ${p.meta.manager} · ${p.meta.phase}`, date: datePart(p.meta.createdAt), scopeId: sc, to: `/projects/${p.meta.id}`, key: p.meta.key?.toLowerCase(), tone: "brand" });
      p.tasks
        .filter((x) => !x.archived)
        .forEach((x) =>
          hits.push({ id: `t-${p.meta.id}-${x.id}`, tab: "pm", kind: "تسک", icon: ListChecks, title: `${x.key ? `${x.key} — ` : ""}${x.title}`, body: `${x.description} ${x.labels.join(" ")} ${x.assignee} ${x.comments.map((c) => c.text).join(" ")}`, meta: `${p.meta.name} · ${x.assignee || "بدون مسئول"}${x.due ? ` · سررسید ${x.due}` : ""}`, date: datePart(x.createdAt), scopeId: sc, to: `/projects/${p.meta.id}?tab=board&focus=${x.key ?? x.id}`, key: x.key?.toLowerCase() })
        );
    });
    v.people.forEach((u) => {
      const mem = t.membershipsOf(u.id).find((m) => m.primary) ?? t.membershipsOf(u.id)[0];
      hits.push({ id: `u-${u.id}`, tab: "people", kind: "فرد", icon: User, title: u.name, body: `${u.role} ${u.org} ${u.skills.join(" ")} ${mem?.title ?? ""}`, meta: `${mem?.title ?? u.role} · ${mem ? mem.scope.name : u.org}`, date: "", scopeId: mem?.scopeId ?? ROOT_ID, to: `/profile/${u.id}`, tone: "navy" });
    });

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
      <PageHeader title="جستجوی سراسری" description="جستجو در همه‌ی داده‌هایی که اجازه‌ی دیدنشان را دارید — با یکسان‌سازی «ی/ي»، «ک/ك»، نیم‌فاصله و ارقام." />

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
        <div className="card overflow-hidden">
          {(tab === "all" ? groupHeads(results.slice(0, limit)) : results.slice(0, limit).map((h) => ({ h, head: null as TabId | null }))).map(({ h, head }) => {
            const Icon = h.icon;
            const titleHit = terms.every((x) => h.titleN.includes(x));
            const bodyText = h.body.trim();
            const snippet = !isKey && bodyText && normalizeFa(bodyText).includes(terms[0]) ? snippetOf(bodyText, terms, 70) : h.meta;
            return (
              <div key={h.id}>
              {head && (
                <div className="flex items-center justify-between px-5 pt-3 pb-1.5 bg-ink-50 border-y border-[var(--color-border)] first:border-t-0">
                  <span className="text-[12.5px] font-bold text-ink-600">
                    {TAB_LABEL[head]} <span className="font-normal text-ink-500">({counts[head].toLocaleString("fa-IR")})</span>
                  </span>
                  <button type="button" onClick={() => setParam({ tab: head })} className="text-[12.5px] text-[var(--color-link)] hover:underline">
                    نمایش همه
                  </button>
                </div>
              )}
              <Link to={h.to} className="flex items-start gap-3 px-5 py-3 border-b border-[var(--color-border)] hover:bg-ink-50 transition-colors group">
                <span className="w-10 h-10 rounded-[10px] bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] font-medium text-ink-900 group-hover:text-[var(--color-link)] truncate">{titleHit || isKey ? <Highlight text={h.title} terms={isKey ? [qn.replace(/\s+/g, "")] : terms} /> : h.title}</span>
                  </span>
                  <span className="block text-[12px] text-ink-500 leading-5 mt-0.5 line-clamp-2 break-words">
                    <Highlight text={snippet} terms={terms} />
                  </span>
                  <span className="flex items-center gap-2 mt-1 text-[11px] text-ink-400 flex-wrap">
                    {h.date && <span>{h.date}</span>}
                    {h.scopeId !== ROOT_ID && <span>{t.scopeLabel(h.scopeId)}</span>}
                  </span>
                </span>
                <span className="shrink-0 flex flex-col items-end gap-1">
                  <Badge tone={h.tone ?? "neutral"}>{h.kind}</Badge>
                  {!h.apiType && <span className="text-[11px] text-ink-400" title="این نوع در سرویس جستجوی فعلی نمایه نمی‌شود">پیشنهادی</span>}
                </span>
              </Link>
              </div>
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
