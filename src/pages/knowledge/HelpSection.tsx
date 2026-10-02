// ---------------------------------------------------------------------------
// مرکز راهنما (زیر «مدیریت دانش ← راهنما») — مقاله‌های قابل جستجو در دسته‌های شروع کار،
// ماژول‌ها، نقش و دسترسی (ساختار پیازی و اجتماع نقش‌ها)، پرسش‌های متداول و «تازه‌ها».
// همه‌ی محتوای صفحه‌ی راهنمای قبلی (Help.tsx) در این‌جا به‌صورت مقاله آمده است.
// پارامتر اختیاری ?article=<id> یک مقاله را مستقیم باز می‌کند.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ArrowRight,
  PiggyBank,
  Megaphone,
  GraduationCap,
  KeyRound,
  MessageCircleQuestion,
  Search,
  Rocket,
  KanbanSquare,
  BookOpen,
  Users,
  FileSignature,
  Settings,
  LifeBuoy,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Lightbulb,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useSettings } from "../../context/SettingsContext";
import { buildArticles, type CatId, type Article } from "./helpArticles";
import { useTicketsMaybe } from "../../context/TicketsContext";
import { releases, APP_VERSION } from "../tickets/model";
import { SectionHead } from "./shared";

type Cat = { id: CatId; label: string; icon: typeof HelpCircle; hint: string };

const cats: Cat[] = [
  { id: "start", label: "شروع کار", icon: Rocket, hint: "ورود، منوها، جستجو و ایستادن در یک سازمان" },
  { id: "roles", label: "نقش‌ها و دسترسی", icon: KeyRound, hint: "ساختار پیازی سیستم ← هلدینگ ← شرکت و نقش‌های چندگانه" },
  { id: "projects", label: "پروژه و فعالیت‌ها", icon: KanbanSquare, hint: "پروژه‌ها، بُرد، وظایف من و زمان کاری" },
  { id: "knowledge", label: "دانش، محتوا و دستیار", icon: BookOpen, hint: "مخزن دانش، درس‌آموخته‌ها، انتشار محتوا و دستیار هوشمند" },
  { id: "collab", label: "تعامل و همکاری", icon: Users, hint: "تقویم، رویدادها، گفتگو، گروه‌ها و فایل‌ها" },
  { id: "innovation", label: "صندوق‌ها و نوآوری", icon: PiggyBank, hint: "صندوق نوآور، شبکه‌ی صندوق‌ها و جایزه" },
  { id: "contracts", label: "قراردادها و فراخوان‌ها", icon: FileSignature, hint: "تبادل فناوری، امضای الکترونیک و RFP" },
  { id: "research", label: "پژوهش و آموزش", icon: GraduationCap, hint: "فرصت مطالعاتی و دوره‌های آموزشی" },
  { id: "admin", label: "مدیریت سامانه", icon: Settings, hint: "پارامترهای گردش کار و تنظیمات" },
  { id: "support", label: "پشتیبانی و تیکت", icon: LifeBuoy, hint: "گزارش مشکل به تیم سازنده و SLA" },
  { id: "faq", label: "پرسش‌های متداول", icon: MessageCircleQuestion, hint: "پاسخ کوتاه به پرسش‌های پرتکرار" },
  { id: "news", label: "تازه‌ها", icon: Sparkles, hint: "یادداشت انتشار نسخه‌ها" },
];
const catById = (id: CatId) => cats.find((c) => c.id === id)!;

const FEEDBACK_KEY = "motoshub.help.feedback.v1";
const readFeedback = (): Record<string, "up" | "down"> => {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? "{}");
  } catch {
    return {};
  }
};
/** شمار نمایشیِ «مفید بود» برای هر مقاله (ثابت و قطعی) */
const baseHelpful = (id: string) => 6 + ([...id].reduce((s, c) => s + c.charCodeAt(0), 0) % 37);
const ticketLink = (from: string) => `/dashboard/tickets?new=1&from=${encodeURIComponent(from)}`;

export function HelpSection() {
  const { settings } = useSettings();
  const tk = useTicketsMaybe();
  const [params, setParams] = useSearchParams();
  const articles = useMemo(() => buildArticles(settings), [settings]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CatId | "all">("all");
  const [feedback, setFeedback] = useState(readFeedback);
  const articleId = params.get("article");
  const article = articles.find((a) => a.id === articleId);

  const openArticle = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("article", id);
    else next.delete("article");
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const vote = (id: string, v: "up" | "down") => {
    const next = { ...feedback, [id]: v };
    setFeedback(next);
    try {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
    } catch {
      /* نادیده */
    }
  };

  const s = q.trim();
  const results = s
    ? articles.filter((a) => [a.title, a.summary, ...(a.steps ?? []), ...(a.notes ?? []), ...(a.body ?? []), ...(a.tags ?? [])].some((x) => x.includes(s)))
    : cat === "all"
      ? []
      : articles.filter((a) => a.cat === cat);

  const helpPath = "/dashboard/knowledge?tab=help";

  // ------------------------------------------------------------ نمای مقاله
  if (article) {
    const c = catById(article.cat);
    const related = articles.filter((a) => a.cat === article.cat && a.id !== article.id).slice(0, 4);
    const fb = feedback[article.id];
    return (
      <div>
        <div className="flex items-center gap-1 text-[12px] text-ink-500 mb-3 flex-wrap">
          <button onClick={() => openArticle(null)} className="flex items-center gap-1 hover:text-brand-700">
            <ArrowRight size={13} /> راهنما
          </button>
          <ChevronLeft size={12} />
          <button
            onClick={() => {
              setCat(article.cat);
              setQ("");
              openArticle(null);
            }}
            className="hover:text-brand-700"
          >
            {c.label}
          </button>
        </div>

        <article className="card p-5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-navy-800 text-white flex items-center justify-center shrink-0">
              <c.icon size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink-900 leading-7">{article.title}</h2>
              <p className="text-[13px] text-ink-500 mt-1 leading-6">{article.summary}</p>
            </div>
          </div>

          {article.body?.map((p, i) => (
            <p key={i} className="text-[13px] text-ink-700 leading-7 mt-4">
              {p}
            </p>
          ))}
          {article.steps && (
            <ol className="space-y-2.5 mt-4">
              {article.steps.map((st, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-ink-700 leading-7">
                  <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{(i + 1).toLocaleString("fa-IR")}</span>
                  <span>{st}</span>
                </li>
              ))}
            </ol>
          )}
          {article.notes && (
            <div className="mt-4 space-y-1.5">
              {article.notes.map((n, i) => (
                <p key={i} className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-6 flex items-start gap-2">
                  <Badge tone="warning">نکته</Badge>
                  <span>{n}</span>
                </p>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-ink-100 flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] text-ink-700 font-medium">آیا این مقاله مفید بود؟</span>
            {fb ? (
              <span className="text-[12px] text-ink-500">{fb === "up" ? "سپاس از بازخورد شما." : "متأسفیم؛ برای کمک بیشتر یک تیکت ثبت کنید."}</span>
            ) : (
              <>
                <Button size="sm" icon={<ThumbsUp size={13} />} onClick={() => vote(article.id, "up")}>
                  بله
                </Button>
                <Button size="sm" icon={<ThumbsDown size={13} />} onClick={() => vote(article.id, "down")}>
                  نه
                </Button>
              </>
            )}
            <span className="text-[11px] text-ink-400 mr-auto">{(baseHelpful(article.id) + (fb === "up" ? 1 : 0)).toLocaleString("fa-IR")} نفر این مقاله را مفید دانستند</span>
          </div>
        </article>

        <StillNeedHelp to={ticketLink(`${helpPath}&article=${article.id}`)} strong={fb === "down"} />

        {related.length > 0 && (
          <div className="mt-5">
            <p className="text-[12.5px] font-bold text-ink-700 mb-2">مقاله‌های مرتبط</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {related.map((a) => (
                <ArticleCard key={a.id} a={a} onOpen={() => openArticle(a.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------ فهرست
  const latest = releases.find((r) => !r.upcoming) ?? releases[0];
  return (
    <div>
      <SectionHead
        title="راهنمای سامانه"
        hint={`مستندات کامل روندها، نقش‌ها و ماژول‌ها — نسخه‌ی فعلی ${APP_VERSION}. اگر پاسخ را پیدا نکردید، برای تیم سازنده تیکت ثبت کنید.`}
        icon={<HelpCircle size={16} />}
      />

      <div className="relative mb-3">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در راهنما… (مثلاً: نقش زمان‌دار، قرارداد، SLA)" className="input-field w-full pr-9" />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-4">
        {[{ id: "all" as const, label: "همه" }, ...cats].map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCat(c.id);
              setQ("");
            }}
            className={`text-[12px] rounded-full px-3 py-1.5 whitespace-nowrap border ${cat === c.id && !s ? "bg-brand-600 border-brand-600 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {s ? (
        results.length ? (
          <div className="space-y-2">
            <p className="text-[11.5px] text-ink-500">{results.length.toLocaleString("fa-IR")} مقاله برای «{s}»</p>
            {results.map((a) => (
              <ArticleCard key={a.id} a={a} showCat onOpen={() => openArticle(a.id)} />
            ))}
          </div>
        ) : (
          <>
            <EmptyState icon={<Search size={22} />} title="مقاله‌ای پیدا نشد" description="عبارت دیگری را امتحان کنید یا مشکل را برای تیم سازنده بفرستید." />
            <StillNeedHelp to={ticketLink(helpPath)} strong />
          </>
        )
      ) : cat === "news" ? (
        <ReleaseNotes fixedBy={(v) => (tk ? tk.tickets.filter((t) => t.fixedIn === v) : [])} />
      ) : cat === "faq" ? (
        <FaqList items={results} />
      ) : cat !== "all" ? (
        <div className="space-y-2">
          <p className="text-[12px] text-ink-500 mb-1">{catById(cat).hint}</p>
          {results.map((a) => (
            <ArticleCard key={a.id} a={a} onOpen={() => openArticle(a.id)} />
          ))}
        </div>
      ) : (
        <>
          <button onClick={() => setCat("news")} className="w-full card p-4 mb-4 flex items-center gap-3 text-right hover:border-brand-300">
            <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] text-ink-500">تازه‌ها · نسخه‌ی {latest.version}</span>
              <span className="block text-[13.5px] font-bold text-ink-900 truncate">{latest.title}</span>
            </span>
            <ChevronLeft size={16} className="text-ink-400 shrink-0" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {cats
              .filter((c) => c.id !== "news")
              .map((c) => {
                const n = articles.filter((a) => a.cat === c.id).length;
                return (
                  <button key={c.id} onClick={() => setCat(c.id)} className="card p-3.5 flex items-start gap-3 text-right hover:border-brand-300">
                    <span className="w-9 h-9 rounded-lg bg-navy-800 text-white flex items-center justify-center shrink-0">
                      <c.icon size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-ink-900">{c.label}</span>
                        <span className="text-[10px] rounded-full px-1.5 bg-ink-100 text-ink-500">{n.toLocaleString("fa-IR")}</span>
                      </span>
                      <span className="block text-[11.5px] text-ink-500 mt-0.5 leading-5">{c.hint}</span>
                    </span>
                  </button>
                );
              })}
          </div>

          <div className="mt-5">
            <p className="text-[12.5px] font-bold text-ink-700 mb-2 flex items-center gap-1.5">
              <Lightbulb size={14} /> پربازدیدترین‌ها
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {["onion", "union", "context", "tickets", "nf", "why-access"].map((id) => {
                const a = articles.find((x) => x.id === id)!;
                return <ArticleCard key={id} a={a} showCat onOpen={() => openArticle(id)} />;
              })}
            </div>
          </div>

          <StillNeedHelp to={ticketLink(helpPath)} />
        </>
      )}
    </div>
  );
}

export default HelpSection;

function ArticleCard({ a, onOpen, showCat }: { a: Article; onOpen: () => void; showCat?: boolean }) {
  const c = catById(a.cat);
  return (
    <button onClick={onOpen} className="w-full card p-3.5 flex items-start gap-3 text-right hover:border-brand-300">
      <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        <c.icon size={15} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-bold text-ink-900">{a.title}</span>
        <span className="block text-[11.5px] text-ink-500 mt-0.5 leading-5 line-clamp-2">{a.summary}</span>
        {showCat && <span className="block text-[10.5px] text-ink-400 mt-1">{c.label}</span>}
      </span>
      <ChevronLeft size={15} className="text-ink-400 shrink-0 mt-1" />
    </button>
  );
}

function FaqList({ items }: { items: Article[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="space-y-2">
      {items.map((a) => {
        const on = open === a.id;
        return (
          <div key={a.id} className={`card overflow-hidden ${on ? "border-brand-300" : ""}`}>
            <button onClick={() => setOpen(on ? null : a.id)} className="w-full flex items-center gap-3 p-3.5 text-right hover:bg-ink-50/60">
              <MessageCircleQuestion size={16} className={on ? "text-brand-600 shrink-0" : "text-ink-400 shrink-0"} />
              <span className="flex-1 min-w-0 text-[13px] font-bold text-ink-900">{a.title}</span>
              <ChevronDown size={15} className={`text-ink-400 shrink-0 transition-transform ${on ? "rotate-180" : ""}`} />
            </button>
            {on && (
              <div className="px-4 pb-4 pt-0 text-[12.5px] text-ink-700 leading-7 space-y-1.5">
                <p className="text-ink-500">{a.summary}</p>
                {a.body?.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <StillNeedHelp to={ticketLink("/dashboard/knowledge?tab=help")} />
    </div>
  );
}

function ReleaseNotes({ fixedBy }: { fixedBy: (v: string) => { id: string; title: string }[] }) {
  return (
    <div className="space-y-3">
      {releases.map((r) => {
        const fixed = fixedBy(r.version);
        return (
          <div key={r.version} className="card p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[12px] font-bold text-ink-800 bg-ink-100 rounded px-1.5 py-0.5">{r.version}</span>
              {r.upcoming ? <Badge tone="warning">در دست انتشار</Badge> : r.version === APP_VERSION ? <Badge tone="success">نسخه‌ی فعلی</Badge> : null}
              <span className="text-[11.5px] text-ink-400 mr-auto">{r.date}</span>
            </div>
            <p className="text-[13.5px] font-bold text-ink-900 mt-2">{r.title}</p>
            <ul className="mt-2 space-y-1">
              {r.items.map((it) => (
                <li key={it} className="text-[12.5px] text-ink-700 leading-6 flex gap-2">
                  <Layers size={12} className="text-brand-600 shrink-0 mt-1.5" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            {fixed.length > 0 && (
              <div className="mt-3 pt-2 border-t border-ink-100">
                <p className="text-[11.5px] text-ink-500 mb-1">تیکت‌های کاربران که در این نسخه رفع {r.upcoming ? "می‌شوند" : "شدند"}:</p>
                <div className="flex flex-col gap-1">
                  {fixed.map((t) => (
                    <Link key={t.id} to={`/dashboard/tickets?id=${t.id}`} className="text-[12px] text-brand-700 hover:underline truncate">
                      <span className="font-mono" dir="ltr">
                        {t.id}
                      </span>{" "}
                      {t.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StillNeedHelp({ to, strong }: { to: string; strong?: boolean }) {
  return (
    <div className={`card p-4 mt-5 flex items-center gap-3 flex-wrap ${strong ? "bg-brand-50 border-brand-200" : ""}`}>
      <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        <LifeBuoy size={17} />
      </span>
      <div className="flex-1 min-w-[180px]">
        <p className="text-[13px] font-bold text-ink-900">هنوز مشکل دارید؟</p>
        <p className="text-[12px] text-ink-500 mt-0.5 leading-5">از «دستیار هوشمند» به زبان فارسی بپرسید یا برای تیم سازنده‌ی موتوشاب تیکت پشتیبانی ثبت کنید.</p>
      </div>
      <Link to={to} className="btn bg-brand-600 text-white hover:bg-brand-700 px-3.5 py-2 text-[13px]">
        <Megaphone size={14} /> ثبت تیکت
      </Link>
    </div>
  );
}
