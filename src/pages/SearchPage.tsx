import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Newspaper,
  NotebookPen,
  CalendarDays,
  Image as ImageIcon,
  BookOpen,
  Users,
  MessagesSquare,
  User,
  KanbanSquare,
  FileSignature,
  PiggyBank,
  GraduationCap,
  Trophy,
  Hash,
  ListChecks,
} from "lucide-react";
import { useContent } from "../context/ContentContext";
import { users, projects, contracts, channels } from "../data/mock";
import { nfProjects } from "../data/mockInnovationFund";
import { trainingCourses, publicationIssues, rfpCalls, techTransferContracts, awardEntries } from "../data/mockDaneshmand";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

// جستجوی سراسری واقعی: همه‌ی ماژول‌های سامانه ایندکس می‌شوند
type Hit = {
  id: string;
  type: string;
  icon: typeof Search;
  title: string;
  snippet: string;
  to: string;
};

const typeMeta: Record<string, { label: string; icon: typeof Search }> = {
  news: { label: "خبر", icon: Newspaper },
  blog: { label: "بلاگ", icon: NotebookPen },
  event: { label: "رویداد", icon: CalendarDays },
  media: { label: "رسانه", icon: ImageIcon },
  doc: { label: "سند دانش", icon: BookOpen },
  group: { label: "گروه", icon: Users },
  forum: { label: "انجمن", icon: MessagesSquare },
  user: { label: "کاربر", icon: User },
  project: { label: "پروژه", icon: KanbanSquare },
  contract: { label: "قرارداد", icon: FileSignature },
  nf: { label: "صندوق نوآور", icon: PiggyBank },
  training: { label: "دوره آموزشی", icon: GraduationCap },
  channel: { label: "کانال", icon: Hash },
  publication: { label: "نشریه", icon: NotebookPen },
  award: { label: "جایزه نوآوری", icon: Trophy },
  transfer: { label: "تبادل فناوری", icon: FileSignature },
  rfp: { label: "فراخوان RFP", icon: ListChecks },
};

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const c = useContent();

  const index: Hit[] = useMemo(() => {
    const hits: Hit[] = [];
    c.newsItems.forEach((n) => hits.push({ id: `news-${n.id}`, type: "news", icon: typeMeta.news.icon, title: n.title, snippet: `${n.date} · ${n.views.toLocaleString("fa-IR")} بازدید`, to: `/dashboard/news/${n.id}` }));
    c.blogPosts.forEach((b) => hits.push({ id: `blog-${b.id}`, type: "blog", icon: typeMeta.blog.icon, title: b.title, snippet: `${b.author} · ${b.date}`, to: `/dashboard/blog/${b.id}` }));
    c.events.forEach((e) => hits.push({ id: `event-${e.id}`, type: "event", icon: typeMeta.event.icon, title: e.title, snippet: `${e.jalaliDate} · ${e.mode} · ${e.location}`, to: `/dashboard/events/${e.id}` }));
    c.mediaItems.forEach((m) => hits.push({ id: `media-${m.id}`, type: "media", icon: typeMeta.media.icon, title: m.title, snippet: `${m.album} · ${m.uploadedBy}`, to: `/dashboard/media/${m.id}` }));
    c.knowledgeDocs.forEach((d) => hits.push({ id: `doc-${d.id}`, type: "doc", icon: typeMeta.doc.icon, title: d.title, snippet: `${d.category} · ${d.owner}`, to: "/dashboard/knowledge" }));
    c.groups.forEach((g) => hits.push({ id: `group-${g.id}`, type: "group", icon: typeMeta.group.icon, title: g.name, snippet: `${g.members.toLocaleString("fa-IR")} عضو · ${g.category}`, to: `/dashboard/groups/${g.id}` }));
    c.forumTopics.forEach((t) => hits.push({ id: `forum-${t.id}`, type: "forum", icon: typeMeta.forum.icon, title: t.title, snippet: `${t.replies.toLocaleString("fa-IR")} پاسخ · ${t.author}`, to: `/dashboard/forum/${t.id}` }));
    users.forEach((u) => hits.push({ id: `user-${u.id}`, type: "user", icon: typeMeta.user.icon, title: u.name, snippet: `${u.role} · ${u.org}`, to: `/dashboard/profile/${u.id}` }));
    projects.forEach((p) => hits.push({ id: `project-${p.id}`, type: "project", icon: typeMeta.project.icon, title: p.name, snippet: `کارفرما: ${p.client} · پیشرفت ${p.progress.toLocaleString("fa-IR")}٪`, to: `/dashboard/projects/${p.id}` }));
    contracts.forEach((ct) => hits.push({ id: `contract-${ct.id}`, type: "contract", icon: typeMeta.contract.icon, title: ct.title, snippet: `${ct.vendor} · ${ct.stage}`, to: "/dashboard/contracts" }));
    nfProjects.forEach((p) => hits.push({ id: `nf-${p.id}`, type: "nf", icon: typeMeta.nf.icon, title: `${p.id} — ${p.titleFa}`, snippet: `${p.team.name} · ${p.stage}`, to: "/dashboard/funds" }));
    trainingCourses.forEach((t) => hits.push({ id: `training-${t.id}`, type: "training", icon: typeMeta.training.icon, title: t.title, snippet: `${t.instructor} · ${t.status}`, to: "/dashboard/training" }));
    channels.forEach((ch) => hits.push({ id: `channel-${ch.id}`, type: "channel", icon: typeMeta.channel.icon, title: ch.name, snippet: ch.topic, to: "/dashboard/chat" }));
    publicationIssues.forEach((p) => hits.push({ id: `pub-${p.id}`, type: "publication", icon: typeMeta.publication.icon, title: `${p.magazine} — شماره ${p.issueNo.toLocaleString("fa-IR")}`, snippet: p.title, to: "/dashboard/blog?tab=pubs" }));
    awardEntries.forEach((a) => hits.push({ id: `award-${a.id}`, type: "award", icon: typeMeta.award.icon, title: a.title, snippet: `${a.track} · ${a.company}`, to: "/dashboard/award" }));
    techTransferContracts.forEach((t) => hits.push({ id: `tt-${t.id}`, type: "transfer", icon: typeMeta.transfer.icon, title: t.title, snippet: `${t.holding} · ${t.company}`, to: "/dashboard/contracts?tab=transfer" }));
    rfpCalls.forEach((r) => hits.push({ id: `rfp-${r.id}`, type: "rfp", icon: typeMeta.rfp.icon, title: r.title, snippet: `${r.company} · ${r.stage}`, to: "/dashboard/research?tab=rfp" }));
    return hits;
  }, [c]);

  const allMatched = useMemo(() => {
    const term = q.trim();
    if (!term) return [];
    return index.filter((h) => h.title.includes(term) || h.snippet.includes(term));
  }, [q, index]);

  const results = typeFilter === "all" ? allMatched : allMatched.filter((h) => h.type === typeFilter);

  const countsByType = useMemo(
    () => allMatched.reduce<Record<string, number>>((acc, h) => ((acc[h.type] = (acc[h.type] ?? 0) + 1), acc), {}),
    [allMatched]
  );

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="جستجوی سراسری"
        description="جستجو در همه‌ی ماژول‌ها: اخبار، بلاگ، رویداد، اسناد، گروه‌ها، انجمن، کاربران، پروژه‌ها، صندوق، قراردادها، آموزش، کانال‌ها و…"
        icon={<Search size={18} />}
      />

      <div className="relative max-w-xl mb-4">
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="چه چیزی را جستجو می‌کنید؟"
          className="input-field !pr-10 !py-3 !text-sm"
          aria-label="عبارت جستجو"
        />
      </div>

      {q.trim() && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${typeFilter === "all" ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"}`}
          >
            همه ({allMatched.length.toLocaleString("fa-IR")})
          </button>
          {Object.entries(countsByType).map(([t, count]) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${typeFilter === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"}`}
            >
              {typeMeta[t]?.label ?? t} ({count.toLocaleString("fa-IR")})
            </button>
          ))}
        </div>
      )}

      {!q.trim() ? (
        <EmptyState icon={<Search size={20} />} title="عبارتی بنویسید تا در کل سامانه جستجو شود" />
      ) : results.length === 0 ? (
        <EmptyState icon={<Search size={20} />} title={`نتیجه‌ای برای «${q}» پیدا نشد`} />
      ) : (
        <div className="card divide-y divide-ink-100">
          {results.slice(0, 50).map((h) => {
            const Icon = h.icon;
            return (
              <Link key={h.id} to={h.to} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50/60 transition-colors group">
                <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                  <Icon size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-ink-900 group-hover:text-brand-700 truncate">{h.title}</span>
                  <span className="block text-[12px] text-ink-400 truncate">{h.snippet}</span>
                </span>
                <Badge tone="neutral">{typeMeta[h.type]?.label ?? h.type}</Badge>
              </Link>
            );
          })}
          {results.length > 50 && (
            <p className="p-3 text-center text-[12px] text-ink-400">{(results.length - 50).toLocaleString("fa-IR")} نتیجه‌ی دیگر — عبارت را دقیق‌تر کنید</p>
          )}
        </div>
      )}
    </div>
  );
}
