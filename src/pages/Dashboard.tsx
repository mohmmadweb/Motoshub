import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ImagePlus,
  BarChart3,
  Paperclip,
  Hash,
  CalendarDays,
  MapPin,
  Clock3,
  CheckCircle2,
  Circle,
  Sunrise,
  Sun,
  Sunset,
  MoonStar,
} from "lucide-react";
import { api } from "../lib/api";
import { groups, users, type Post } from "../data/mock";
import { useContent } from "../context/ContentContext";
import { useTenancy } from "../context/TenancyContext";
import { personalFor } from "../data/personal";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import PersonalHub from "./dashboard/PersonalHub";

// «شروع سریع سازمان» — چک‌لیست راه‌اندازی برای راهبر؛ قابل بستن (localStorage)
const quickStartSteps = [
  { id: "brand", label: "برندسازی سازمان (لوگو و رنگ)", to: "/dashboard/appearance?tab=org" },
  { id: "structure", label: "تعریف هلدینگ‌ها و شرکت‌های زیرمجموعه", to: "/dashboard/admin" },
  { id: "roles", label: "ساخت نقش‌های سفارشی و دسترسی‌ها", to: "/dashboard/admin" },
  { id: "users", label: "دعوت و واردسازی کاربران", to: "/dashboard/admin" },
  { id: "params", label: "تنظیم پارامترهای گردش کار", to: "/dashboard/admin" },
];

function QuickStart() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("ms-quickstart") === "done");
  const [done, setDone] = useState<string[]>(() => JSON.parse(localStorage.getItem("ms-quickstart-steps") || "[]"));

  if (dismissed) return null;

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    localStorage.setItem("ms-quickstart-steps", JSON.stringify(next));
  };

  return (
    <div className="card p-4 mb-5 border-brand-200 bg-brand-50/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-900">شروع سریع راه‌اندازی سازمان</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-400">{done.length.toLocaleString("fa-IR")} از {quickStartSteps.length.toLocaleString("fa-IR")}</span>
          <button
            onClick={() => {
              localStorage.setItem("ms-quickstart", "done");
              setDismissed(true);
            }}
            className="text-[11px] text-ink-400 hover:text-ink-600"
          >
            نمایش نده
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {quickStartSteps.map((s, i) => {
          const isDone = done.includes(s.id);
          return (
            <div key={s.id} className={`rounded-lg border p-2.5 flex items-start gap-2 ${isDone ? "border-emerald-200 bg-emerald-50/50" : "border-ink-200 bg-white"}`}>
              <button onClick={() => toggle(s.id)} aria-label={isDone ? "بازگردانی گام" : "علامت انجام گام"} className="shrink-0 mt-0.5">
                {isDone ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Circle size={15} className="text-ink-300 hover:text-brand-500" />}
              </button>
              <Link to={s.to} className={`text-[11.5px] leading-5 ${isDone ? "line-through text-ink-400" : "text-ink-700 hover:text-brand-700"}`}>
                <span className="font-bold text-ink-400 ml-1">{(i + 1).toLocaleString("fa-IR")}.</span>
                {s.label}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ساعت و تاریخ زنده‌ی شمسی + سلام متناسب با ساعت روز
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return { text: "صبح بخیر", icon: Sunrise, tone: "text-amber-500" };
  if (hour >= 12 && hour < 16) return { text: "ظهر بخیر", icon: Sun, tone: "text-amber-500" };
  if (hour >= 16 && hour < 20) return { text: "عصر بخیر", icon: Sunset, tone: "text-orange-500" };
  return { text: "شب بخیر", icon: MoonStar, tone: "text-brand-400" };
}

function LiveDateTime() {
  const now = useNow();
  const { actingUser } = useTenancy();
  const time = now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  // ساخت دستی تاریخ شمسی تا ترتیب اجزا در RTL به‌هم نریزد: «شنبه ۳ مرداد ۱۴۰۵»
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const date = `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
  const g = greetingFor(now.getHours());

  return (
    <div className="flex items-center gap-3 flex-wrap justify-between">
      <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <g.icon size={17} className={g.tone} />
        {g.text}، {actingUser.name.split(" ")[0] === "پایگاه" ? "همکار گرامی" : actingUser.name}
      </span>
      <span className="flex items-center gap-2.5 text-[12px] text-ink-500">
        <span className="flex items-center gap-1.5 bg-ink-50 border border-ink-100 rounded-lg px-2.5 py-1.5">
          <Clock3 size={13} className="text-brand-500" />
          <span className="font-bold text-ink-800 tabular-nums min-w-[64px] text-center">{time}</span>
        </span>
        <span dir="rtl" className="bg-ink-50 border border-ink-100 rounded-lg px-2.5 py-1.5 font-medium whitespace-nowrap">{date}</span>
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { events } = useContent();
  const { actingUser, session } = useTenancy();
  // «گروه‌های من» — گروه‌هایی که همین کاربر عضوشان است
  const myGroups = personalFor(actingUser.id).groupIds
    .map((id) => groups.find((g) => g.id === id))
    .filter((g): g is (typeof groups)[number] => Boolean(g))
    .slice(0, 4);
  const nextEvent = events[0];

  useEffect(() => {
    api.feed.list().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title={`خوش آمدید، ${actingUser.name}`}
        description="میز کار شخصی شما: اعلان‌ها، پیام‌ها، منشن‌ها، کارها و تأییدهای منتظر شما در همه‌ی بخش‌های سامانه"
      />

      {session.level === "سیستم" && <QuickStart />}

      <PersonalHub header={<LiveDateTime />} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Avatar name={actingUser.name} color={actingUser.avatarColor} />
              <input
                placeholder="چه چیزی در ذهن دارید؟ یک پست، نظرسنجی یا سند به اشتراک بگذارید…"
                className="flex-1 input-field"
              />
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-ink-500">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                <ImagePlus size={14} /> تصویر/ویدیو
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                <BarChart3 size={14} /> نظرسنجی
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                <Paperclip size={14} /> سند
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                <Hash size={14} /> هشتگ
              </button>
            </div>
          </div>

          {loading ? (
            <div className="card p-8 text-center text-sm text-ink-400">در حال بارگذاری فید…</div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold text-sm mb-3 text-ink-900">گروه‌های من</h3>
            <div className="space-y-2.5">
              {myGroups.map((g) => (
                <Link key={g.id} to={`/dashboard/groups/${g.id}`} className="flex items-center gap-2.5 hover:bg-ink-50 rounded-lg p-1.5 -m-1.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: g.color }}>
                    {g.name.slice(0, 1)}
                  </span>
                  <span className="flex-1 text-xs font-medium truncate">{g.name}</span>
                  {g.unread > 0 && <Badge tone="brand">{g.unread}</Badge>}
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-bold text-sm mb-3 text-ink-900">کاربران آنلاین</h3>
            <div className="space-y-2.5">
              {users.filter((u) => u.online).map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <Avatar name={u.name} color={u.avatarColor} size={32} online />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{u.name}</p>
                    <p className="text-[11px] text-ink-400 truncate">{u.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link to="/dashboard/events" className="card p-4 block hover:border-brand-300 transition-colors">
            <h3 className="font-bold text-sm mb-2 text-ink-900 flex items-center gap-1.5">
              <CalendarDays size={15} className="text-brand-600" /> رویداد پیش‌رو
            </h3>
            <p className="text-xs text-ink-700 font-medium">{nextEvent.title}</p>
            <p className="text-[11px] text-ink-400 mt-1.5 flex items-center gap-1">
              <MapPin size={11} /> {nextEvent.jalaliDate} · {nextEvent.time}
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
