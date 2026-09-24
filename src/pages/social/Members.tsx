// ---------------------------------------------------------------------------
// «اعضای سازمان» — فهرست اعضا + ارتباط (relations) و پیام مستقیم (messaging).
// هر دکمه معادل یک endpoint در src/social/endpoints.ts است.
// ---------------------------------------------------------------------------
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Search, UserPlus, Check, X, MessageSquare, ShieldOff, MoreHorizontal, User, Ban, Clock } from "lucide-react";
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
  const { hasPermission } = useTenancy();
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

  const others = useMemo(() => users.filter((u) => u.id !== s.me), [s.me]);
  const orgs = useMemo(() => [...new Set(others.map((u) => u.org))].sort((a, b) => a.localeCompare(b, "fa")), [others]);

  const list = useMemo(() => {
    const term = q.trim();
    return others
      .filter((u) => !org || u.org === org)
      .filter((u) => !onlineOnly || isOnline(u))
      .filter((u) => !term || [u.name, u.role, u.org, ...u.skills].some((x) => x.includes(term)))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "fa") : a.org.localeCompare(b.org, "fa") || a.name.localeCompare(b.name, "fa")));
  }, [others, q, org, onlineOnly, sort]);

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
        description={`${fa(others.length)} عضو · ${fa(others.filter(isOnline).length)} نفر آنلاین`}
        icon={<Users size={20} />}
        actions={
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
        }
      />

      {/* نوار ابزار — یک ردیف */}
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field pr-9 w-full" placeholder="جستجوی نام، سمت، سازمان یا مهارت…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input-field w-full sm:w-auto sm:max-w-[220px]" value={org} onChange={(e) => setOrg(e.target.value)} aria-label="سازمان">
          <option value="">همه‌ی سازمان‌ها</option>
          {orgs.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select className="input-field w-auto" value={sort} onChange={(e) => setSort(e.target.value as "name" | "org")} aria-label="مرتب‌سازی">
          <option value="name">مرتب‌سازی: نام</option>
          <option value="org">مرتب‌سازی: سازمان</option>
        </select>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-600 px-1">
          <Toggle on={onlineOnly} onChange={() => setOnlineOnly((v) => !v)} label="فقط آنلاین" />
          فقط آنلاین
        </label>
      </div>

      {list.length === 0 ? (
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
                    <p className="text-[11px] text-ink-400 truncate">{u.org}</p>
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
