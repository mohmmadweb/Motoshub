// ---------------------------------------------------------------------------
// «اعضای سازمان» — فهرست اعضا + ارتباط (relations) و پیام مستقیم (messaging).
// هر دکمه معادل یک endpoint در src/social/endpoints.ts است.
// ---------------------------------------------------------------------------
import ModuleReportsButton from "../../reports/ModuleReportsButton";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Search, UserPlus, Check, X, MessageSquare, ShieldOff, MoreHorizontal, User, Ban, Clock, Sparkles, BadgeCheck, BookOpen, Lightbulb, Wrench } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { users, userPresence, type UserProfile } from "../../data/mock";
import { endpoints } from "../../social/endpoints";
import { ApiChip, fa } from "./kit";
import { Segmented } from "./ContentModule";
import { useKnowledge } from "../../context/KnowledgeContext";

// ---------------------------------------------------------------- یافتن متخصص
/** یکسان‌سازی برای تطبیق فارسی (ی/ک عربی، نیم‌فاصله، #) */
const norm = (t: string) => t.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\u200c#_]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
const hit = (term: string, text: string) => {
  const a = norm(term);
  const b = norm(text);
  return !!a && !!b && (b.includes(a) || (b.length >= 3 && a.includes(b)));
};
type Evidence = { kind: "skill" | "expert" | "qa" | "doc"; label: string; weight: number };
const evIcon = { skill: Wrench, expert: Sparkles, qa: BadgeCheck, doc: BookOpen } as const;
const evTone = { skill: "bg-ink-100 text-ink-700", expert: "bg-brand-50 text-brand-700", qa: "bg-emerald-50 text-emerald-700", doc: "bg-amber-50 text-amber-800" } as const;

/** شواهد تخصص هر عضو: مهارت پروفایل، حوزه‌ی «خبرگان»، پاسخ پذیرفته‌شده در پرسش و پاسخ، اسناد دانش به تفکیک دسته */
function useExpertFinder(pool: UserProfile[], term: string) {
  const s = useSocial();
  const km = useKnowledge();
  return useMemo(() => {
    const t = term.trim();
    if (!t) return [];
    const topicsHit = s.topics.filter((x) => !x.deleted_at && x.accepted_post_id && (x.tags.some((g) => hit(t, g)) || hit(t, x.title)));
    return pool
      .map((u) => {
        const ev: Evidence[] = [];
        u.skills.filter((sk) => hit(t, sk)).forEach((sk) => ev.push({ kind: "skill", label: `مهارت: ${sk}`, weight: 3 }));
        const ex = km.experts.find((e) => e.userId === u.id || e.name === u.name);
        if (ex) {
          ex.areas.filter((a) => hit(t, a)).forEach((a) => ev.push({ kind: "expert", label: `خبره‌ی «${a}»`, weight: 4 }));
          ex.topics.filter((a) => hit(t, a)).forEach((a) => ev.push({ kind: "expert", label: `دانش تحت پوشش: ${a}`, weight: 2 }));
        }
        // پاسخ‌های پذیرفته‌شده به تفکیک برچسب
        const byTag = new Map<string, number>();
        topicsHit.forEach((tp) => {
          const p = s.posts.find((x) => x.id === tp.accepted_post_id);
          if (p?.user_id !== u.id) return;
          const tag = tp.tags.find((g) => hit(t, g));
          const k = tag ? `#${tag}` : "پرسش و پاسخ";
          byTag.set(k, (byTag.get(k) ?? 0) + 1);
        });
        byTag.forEach((n, k) => ev.push({ kind: "qa", label: `${fa(n)} پاسخ پذیرفته‌شده · ${k}`, weight: 2.5 * n }));
        // اسناد دانش نوشته‌شده به تفکیک دسته
        const byCat = new Map<string, number>();
        km.docs
          .filter((d) => (d.author === u.name || d.owner === u.name) && d.status !== "آرشیو" && km.canSee(d) && (hit(t, km.categoryPath(d.categoryId)) || d.tags.some((g) => hit(t, g)) || hit(t, d.title)))
          .forEach((d) => byCat.set(km.categoryName(d.categoryId), (byCat.get(km.categoryName(d.categoryId)) ?? 0) + 1));
        byCat.forEach((n, c) => ev.push({ kind: "doc", label: `${fa(n)} سند در «${c}»`, weight: 1.5 * n }));
        return { u, ev, score: ev.reduce((a, e) => a + e.weight, 0) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.u.name.localeCompare(b.u.name, "fa"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, term, s.topics, s.posts, km.experts, km.docs]);
}

/** حوزه‌های پرتکرار برای شروع جستجو */
function useExpertiseCloud(pool: UserProfile[]) {
  const s = useSocial();
  const km = useKnowledge();
  return useMemo(() => {
    const ids = new Set(pool.map((u) => u.id));
    const c = new Map<string, number>();
    const add = (k: string, w = 1) => c.set(k, (c.get(k) ?? 0) + w);
    pool.forEach((u) => u.skills.forEach((sk) => add(sk)));
    km.experts.filter((e) => (e.userId && ids.has(e.userId)) || pool.some((u) => u.name === e.name)).forEach((e) => e.areas.forEach((a) => add(a, 2)));
    s.topics.filter((t) => t.accepted_post_id).forEach((t) => t.tags.forEach((g) => add(g)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => k);
  }, [pool, s.topics, km.experts]);
}

const isOnline = (u: UserProfile) => (userPresence[u.id] ? userPresence[u.id] === "online" : u.online);

/** منوی کوچک «…» روی کارت */
function MoreMenu({ items }: { items: { label: string; icon: ReactNode; onClick?: () => void; to?: string; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button onClick={() => setOpen((v) => !v)} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-ink-100" aria-label="گزینه‌های بیشتر">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute z-40 top-full mt-1 left-0 w-44 bg-white border border-ink-200 rounded-xl shadow-lg py-1 block">
            {items.map((i) => {
              const cls = `w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-ink-50 ${i.danger ? "text-rose-600" : "text-ink-700"}`;
              return i.to ? (
                <Link key={i.label} to={i.to} className={cls} onClick={() => setOpen(false)}>
                  {i.icon}
                  {i.label}
                </Link>
              ) : (
                <button
                  key={i.label}
                  className={cls}
                  onClick={() => {
                    setOpen(false);
                    i.onClick?.();
                  }}
                >
                  {i.icon}
                  {i.label}
                </button>
              );
            })}
          </span>
        </>
      )}
    </span>
  );
}

export default function Members() {
  const s = useSocial();
  const { hasPermission, visibleUserIds, contextNode, membershipsOf, primaryRoleOf } = useTenancy();
  const inScope = visibleUserIds();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const canRelate = hasPermission("relations.use");
  const canChat = hasPermission("chat.view");
  const allowNonFriends = s.setting("messaging.direct-messages.allow_non_friends") !== false;

  const [q, setQ] = useState("");
  const [org, setOrg] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sort, setSort] = useState<"name" | "org">("name");
  const [mode, setMode] = useState<"all" | "experts">("all");

  // «اعضای سازمان» = اعضای دامنه‌ای که کاربر در آن ایستاده (واحد خودش، زیرمجموعه‌ها و لایه‌های بالاتر)
  const others = useMemo(() => users.filter((u) => u.id !== s.me && inScope.includes(u.id)), [s.me, inScope.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const orgs = useMemo(() => [...new Set(others.map((u) => u.org))].sort((a, b) => a.localeCompare(b, "fa")), [others]);

  const list = useMemo(() => {
    const term = q.trim();
    return others
      .filter((u) => !org || u.org === org)
      .filter((u) => !onlineOnly || isOnline(u))
      .filter((u) => !term || [u.name, u.role, u.org, ...u.skills].some((x) => x.includes(term)))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "fa") : a.org.localeCompare(b.org, "fa") || a.name.localeCompare(b.name, "fa")));
  }, [others, q, org, onlineOnly, sort]);

  const expertPool = useMemo(() => others.filter((u) => !org || u.org === org), [others, org]);
  const experts = useExpertFinder(expertPool, mode === "experts" ? q : "");
  const cloud = useExpertiseCloud(expertPool);

  const dm = (id: string) => {
    const chatId = s.openDirect(id);
    navigate(`/dashboard/chat/${chatId}`);
  };

  const request = (id: string) => {
    const r = s.sendFriendRequest(id);
    if (r.ok) notify("درخواست ارتباط ارسال شد.", "success");
    else notify(r.error, "warning");
  };

  const block = (u: UserProfile) =>
    confirm({
      title: `«${u.name}» مسدود شود؟`,
      message: "ارتباط فعلی حذف می‌شود و این فرد دیگر نمی‌تواند به شما درخواست یا پیام مستقیم بدهد.",
      confirmLabel: "مسدود کن",
      onConfirm: () => {
        s.blockUser(u.id);
        notify(`«${u.name}» مسدود شد.`, "info");
      },
    });

  const primary = (u: UserProfile) => {
    const rel = s.relationWith(u.id);
    const fid = rel.f?.id;
    switch (rel.state) {
      case "friends":
        return canChat ? (
          <Button size="sm" variant="primary" className="w-full justify-center" icon={<MessageSquare size={14} />} onClick={() => dm(u.id)}>
            پیام
          </Button>
        ) : (
          <span className="text-[11.5px] text-emerald-700 flex items-center justify-center gap-1 py-1.5">
            <Check size={13} /> در ارتباط
          </span>
        );
      case "sent":
        return (
          <div className="flex flex-col items-center gap-1">
            <Button size="sm" disabled className="w-full justify-center opacity-70 cursor-default" icon={<Clock size={14} />}>
              درخواست ارسال شد
            </Button>
            {canRelate && fid && (
              <button
                className="text-[11px] text-ink-400 hover:text-rose-600"
                onClick={() => {
                  s.cancelFriendRequest(fid);
                  notify("درخواست لغو شد.", "info");
                }}
              >
                لغو درخواست
              </button>
            )}
          </div>
        );
      case "received":
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              className="flex-1 justify-center"
              icon={<Check size={14} />}
              disabled={!canRelate}
              onClick={() => {
                if (!fid) return;
                s.respondFriend(fid, true);
                notify(`اکنون با «${u.name}» در ارتباط هستید.`, "success");
              }}
            >
              پذیرش
            </Button>
            <Button
              size="sm"
              className="flex-1 justify-center"
              icon={<X size={14} />}
              disabled={!canRelate}
              onClick={() => {
                if (!fid) return;
                s.respondFriend(fid, false);
                notify("درخواست رد شد.", "info");
              }}
            >
              رد
            </Button>
          </div>
        );
      case "blocked":
        return (
          <Button
            size="sm"
            className="w-full justify-center"
            icon={<ShieldOff size={14} />}
            disabled={!canRelate}
            onClick={() => {
              if (!fid) return;
              s.unblock(fid);
              notify(`«${u.name}» از مسدودی خارج شد.`, "success");
            }}
          >
            رفع مسدودی
          </Button>
        );
      case "blocked_me":
        return <span className="text-[11.5px] text-ink-400 flex items-center justify-center py-1.5">امکان ارتباط وجود ندارد</span>;
      default:
        return (
          <Button size="sm" className="w-full justify-center" icon={<UserPlus size={14} />} disabled={!canRelate} onClick={() => request(u.id)}>
            درخواست ارتباط
          </Button>
        );
    }
  };

  const menuFor = (u: UserProfile) => {
    const state = s.relationWith(u.id).state;
    const canDm = canChat && state !== "blocked" && state !== "blocked_me" && (state === "friends" || allowNonFriends);
    const items: Parameters<typeof MoreMenu>[0]["items"] = [{ label: "مشاهده‌ی پروفایل", icon: <User size={14} />, to: `/dashboard/profile/${u.id}` }];
    if (canDm) items.push({ label: "پیام", icon: <MessageSquare size={14} />, onClick: () => dm(u.id) });
    if (canRelate && state !== "blocked") items.push({ label: "مسدود کردن", icon: <Ban size={14} />, onClick: () => block(u), danger: true });
    return items;
  };

  return (
    <div>
      <PageHeader
        title="اعضای سازمان"
        description={`${contextNode.type === "system" ? "کل سامانه" : contextNode.name} — ${fa(others.length)} عضو · ${fa(others.filter(isOnline).length)} نفر آنلاین`}
        icon={<Users size={20} />}
        actions={
          <>
          <ModuleReportsButton module="members" />
          <ApiChip
            items={[
              { label: "ارسال درخواست ارتباط", ep: endpoints.friendSend() },
              { label: "پذیرش / رد درخواست", ep: endpoints.friendRespond("{id}") },
              { label: "لغو درخواست ارسالی", ep: endpoints.friendCancel("{id}") },
              { label: "مسدود کردن", ep: endpoints.friendBlock("{id}") },
              { label: "رفع مسدودی", ep: endpoints.friendUnblock("{id}") },
              { label: "شروع پیام مستقیم", ep: endpoints.chatCreate("direct-messages") },
            ]}
          />
          </>
        }
      />

      {/* نوار ابزار — یک ردیف */}
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { id: "all", label: "همه‌ی اعضا" },
            { id: "experts", label: "یافتن متخصص" },
          ]}
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field pr-9 w-full" placeholder={mode === "experts" ? "موضوع یا مهارت؛ مثلاً «قرارداد» یا «اشتغال»…" : "جستجوی نام، سمت، سازمان یا مهارت…"} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input-field w-full sm:w-auto sm:max-w-[220px]" value={org} onChange={(e) => setOrg(e.target.value)} aria-label="سازمان">
          <option value="">همه‌ی سازمان‌ها</option>
          {orgs.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {mode === "all" && (
          <>
            <select className="input-field w-auto" value={sort} onChange={(e) => setSort(e.target.value as "name" | "org")} aria-label="مرتب‌سازی">
              <option value="name">مرتب‌سازی: نام</option>
              <option value="org">مرتب‌سازی: سازمان</option>
            </select>
            <label className="flex items-center gap-2 text-[12.5px] text-ink-600 px-1">
              <Toggle on={onlineOnly} onChange={() => setOnlineOnly((v) => !v)} label="فقط آنلاین" />
              فقط آنلاین
            </label>
          </>
        )}
      </div>

      {mode === "experts" ? (
        <ExpertResults
          term={q}
          results={experts}
          cloud={cloud}
          onPick={setQ}
          onMessage={canChat ? dm : undefined}
        />
      ) : list.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="عضوی پیدا نشد" description="عبارت جستجو یا فیلترها را تغییر دهید." />
      ) : (
        <>
          <p className="text-[11.5px] text-ink-400 mb-3">{fa(list.length)} نتیجه</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {list.map((u) => (
              <div key={u.id} className="card p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Link to={`/dashboard/profile/${u.id}`} className="shrink-0">
                    <Avatar name={u.name} color={u.avatarColor} size={44} status={userPresence[u.id] ?? (u.online ? "online" : "offline")} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/dashboard/profile/${u.id}`} className="block text-[13.5px] font-semibold text-ink-900 truncate hover:text-brand-700">
                      {u.name}
                    </Link>
                    <p className="text-[11.5px] text-ink-500 truncate">{u.role}</p>
                    <p className="text-[11px] text-ink-400 truncate">{membershipsOf(u.id).filter((m) => m.status === "active").map((m) => m.scope.name).join("، ") || u.org}</p>
                    {primaryRoleOf(u.id) && <p className="text-[10.5px] text-brand-700 truncate">{primaryRoleOf(u.id)!.name}</p>}
                  </div>
                  <MoreMenu items={menuFor(u)} />
                </div>
                {u.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {u.skills.slice(0, 3).map((sk) => (
                      <span key={sk} className="text-[10.5px] px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto">{primary(u)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** نتایج «یافتن متخصص» با شواهد */
function ExpertResults({ term, results, cloud, onPick, onMessage }: { term: string; results: { u: UserProfile; ev: Evidence[]; score: number }[]; cloud: string[]; onPick: (t: string) => void; onMessage?: (id: string) => void }) {
  const top = results[0]?.score ?? 1;
  const cloudRow = (
    <div className="flex flex-wrap gap-1.5">
      {cloud.map((c) => (
        <button key={c} onClick={() => onPick(c)} className="text-[11.5px] px-2.5 py-1 rounded-full border border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-700">
          {c}
        </button>
      ))}
    </div>
  );
  if (!term.trim())
    return (
      <div className="card p-5 space-y-3">
        <p className="text-[13px] text-ink-700 flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-500 shrink-0" /> دنبال چه تخصصی هستید؟ نتایج بر اساس مهارت پروفایل، حوزه‌های «خبرگان» مدیریت دانش، پاسخ‌های پذیرفته‌شده در پرسش و پاسخ و اسناد نوشته‌شده رتبه‌بندی می‌شوند.
        </p>
        {cloud.length > 0 && cloudRow}
      </div>
    );
  if (!results.length)
    return (
      <div className="space-y-3">
        <EmptyState icon={<Sparkles size={22} />} title="متخصصی پیدا نشد" description="واژه‌ی کلی‌تری امتحان کنید یا یکی از حوزه‌های زیر را بزنید." />
        {cloudRow}
      </div>
    );
  return (
    <div className="space-y-2">
      <p className="text-[11.5px] text-ink-400">
        {fa(results.length)} متخصص برای «{term.trim()}» — مرتب بر اساس امتیاز شواهد
      </p>
      {results.slice(0, 30).map(({ u, ev, score }, i) => (
        <div key={u.id} className="card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 sm:w-56 shrink-0">
            <span className="text-[11px] text-ink-400 tabular-nums w-5 text-center shrink-0">{fa(i + 1)}</span>
            <Link to={`/dashboard/profile/${u.id}`} className="shrink-0">
              <Avatar name={u.name} color={u.avatarColor} size={38} status={userPresence[u.id] ?? (u.online ? "online" : "offline")} />
            </Link>
            <div className="min-w-0">
              <Link to={`/dashboard/profile/${u.id}`} className="block text-[13px] font-semibold text-ink-900 truncate hover:text-brand-700">
                {u.name}
              </Link>
              <p className="text-[11px] text-ink-500 truncate">{u.role}</p>
              <span className="block h-1 mt-1 rounded-full bg-ink-100 overflow-hidden w-24" title={`امتیاز ${fa(Math.round(score * 10) / 10)}`}>
                <span className="block h-full bg-brand-500 rounded-full" style={{ width: `${Math.max(8, (score / top) * 100)}%` }} />
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {ev
              .slice()
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 5)
              .map((e) => {
                const I = evIcon[e.kind];
                return (
                  <span key={e.label} className={`text-[10.5px] px-2 py-0.5 rounded-full flex items-center gap-1 max-w-full ${evTone[e.kind]}`}>
                    <I size={11} className="shrink-0" />
                    <span className="truncate">{e.label}</span>
                  </span>
                );
              })}
            {ev.length > 5 && <span className="text-[10.5px] text-ink-400 px-1">+{fa(ev.length - 5)}</span>}
          </div>
          {onMessage && (
            <Button size="sm" icon={<MessageSquare size={13} />} className="shrink-0 self-start sm:self-center" onClick={() => onMessage(u.id)}>
              پرسیدن
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
