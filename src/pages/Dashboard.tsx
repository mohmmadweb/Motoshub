import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, BarChart3, Paperclip, Hash, CalendarDays, MapPin, Activity, Users as UsersIcon, HardDrive, Wifi, Server, Cpu } from "lucide-react";
import { api } from "../lib/api";
import { groups, users, currentUser, type Post } from "../data/mock";
import { useContent } from "../context/ContentContext";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";

// ---------------------------------------------------------------------------
// میزان مصرف زنده‌ی سامانه — هر ۲ ثانیه به‌روز می‌شود (در نسخه عملیاتی از
// متریک‌های سرور تغذیه می‌شود؛ اینجا شبیه‌سازی زنده است)
// ---------------------------------------------------------------------------
type LiveMetrics = {
  onlineUsers: number;
  apiPerMin: number;
  bandwidthMbps: number;
  cpuPercent: number;
  storageUsedGB: number;
  activeSessions: number;
  history: number[]; // تاریخچه درخواست‌ها برای نمودار
};

const STORAGE_TOTAL_GB = 500;

function drift(value: number, min: number, max: number, step: number) {
  const next = value + (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, next));
}

function LiveUsagePanel() {
  const [m, setM] = useState<LiveMetrics>({
    onlineUsers: 212,
    apiPerMin: 1480,
    bandwidthMbps: 38,
    cpuPercent: 34,
    storageUsedGB: 312.4,
    activeSessions: 486,
    history: Array.from({ length: 24 }, () => 1200 + Math.random() * 600),
  });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setM((prev) => {
        const apiPerMin = Math.round(drift(prev.apiPerMin, 900, 2400, 90));
        return {
          onlineUsers: Math.round(drift(prev.onlineUsers, 140, 320, 9)),
          apiPerMin,
          bandwidthMbps: Math.round(drift(prev.bandwidthMbps, 12, 95, 5)),
          cpuPercent: Math.round(drift(prev.cpuPercent, 15, 88, 4)),
          storageUsedGB: Math.min(STORAGE_TOTAL_GB, prev.storageUsedGB + Math.random() * 0.03),
          activeSessions: Math.round(drift(prev.activeSessions, 300, 700, 14)),
          history: [...prev.history.slice(1), apiPerMin],
        };
      });
    }, 2000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const maxH = Math.max(...m.history);
  const storagePercent = Math.round((m.storageUsedGB / STORAGE_TOTAL_GB) * 100);

  const tiles = [
    { icon: UsersIcon, label: "کاربران آنلاین", value: m.onlineUsers.toLocaleString("fa-IR"), sub: `${m.activeSessions.toLocaleString("fa-IR")} نشست فعال` },
    { icon: Server, label: "درخواست در دقیقه", value: m.apiPerMin.toLocaleString("fa-IR"), sub: "همه‌ی ماژول‌ها" },
    { icon: Wifi, label: "پهنای باند لحظه‌ای", value: `${m.bandwidthMbps.toLocaleString("fa-IR")} Mbps`, sub: "ورودی + خروجی" },
    { icon: Cpu, label: "بار پردازشی", value: `${m.cpuPercent.toLocaleString("fa-IR")}٪`, sub: m.cpuPercent > 75 ? "زیر فشار" : "عادی" },
  ];

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
          <Activity size={15} className="text-brand-600" /> میزان مصرف سامانه
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> زنده
          </span>
        </h3>
        <Link to="/dashboard/admin" className="text-[11px] text-brand-600 font-medium hover:text-brand-700">
          جزئیات کامل در پنل راهبری ←
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
            <p className="text-[11px] text-ink-400 flex items-center gap-1.5 mb-1">
              <t.icon size={13} /> {t.label}
            </p>
            <p className="text-lg font-bold text-ink-900 leading-6">{t.value}</p>
            <p className="text-[10.5px] text-ink-400 mt-0.5">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4 items-end">
        <div>
          <p className="text-[11px] text-ink-400 mb-1.5">درخواست‌ها در ۴۸ ثانیه‌ی اخیر</p>
          <div className="flex items-end gap-[3px] h-14">
            {m.history.map((v, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${i === m.history.length - 1 ? "bg-brand-500" : "bg-brand-200"}`}
                style={{ height: `${Math.max(8, (v / maxH) * 100)}%`, transition: "height 0.5s" }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-ink-500 flex items-center gap-1"><HardDrive size={12} /> فضای ذخیره‌سازی</span>
            <span className="text-ink-700 font-medium" dir="ltr">{m.storageUsedGB.toFixed(1)} / {STORAGE_TOTAL_GB} GB</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${storagePercent > 85 ? "bg-rose-500" : storagePercent > 65 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className="text-[10.5px] text-ink-400 mt-1">{storagePercent.toLocaleString("fa-IR")}٪ استفاده شده</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { events } = useContent();
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
        title={`خوش آمدید، ${currentUser.name}`}
        description="نمای کلی فعالیت‌های گروه‌ها، انجمن و رویدادهای سازمان شما"
      />

      <LiveUsagePanel />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Avatar name={currentUser.name} color={currentUser.avatarColor} />
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
              {groups.slice(0, 4).map((g) => (
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
