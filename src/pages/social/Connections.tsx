// ---------------------------------------------------------------------------
// «ارتباطات من» — دوستان، درخواست‌ها، ارسالی‌ها، مسدودها و پیشنهادها (relations).
// تب فعال در ?tab= نگه داشته می‌شود تا لینک اعلان‌ها مستقیم به تب درست برسد.
// ---------------------------------------------------------------------------
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link2, MessageSquare, UserMinus, Ban, Check, X, ShieldOff, UserPlus, Inbox, Send, Users, Sparkles } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { users } from "../../data/mock";
import { endpoints } from "../../social/endpoints";
import type { Friendship } from "../../social/types";
import { ApiChip, UserLine, fa, stamp } from "./kit";

type Tab = "friends" | "requests" | "sent" | "blocked" | "suggestions";
const TABS: Tab[] = ["friends", "requests", "sent", "blocked", "suggestions"];

/** ردیف یکدست فهرست: کاربر در راست، اقدام‌ها در چپ؛ در موبایل زیر هم */
function Row({ id, sub, children }: { id: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-ink-100 last:border-0">
      <div className="min-w-0 flex-1 basis-48">
        <UserLine id={id} size={38} sub={sub} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

export default function Connections() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "friends";
  const setTab = (t: Tab) => setParams(t === "friends" ? {} : { tab: t }, { replace: true });
  const canRelate = hasPermission("relations.use");
  const canChat = hasPermission("chat.view");
  const me = s.me;

  const other = (f: Friendship) => (f.sender_id === me ? f.receiver_id : f.sender_id);
  const mine = s.friendships.filter((f) => f.sender_id === me || f.receiver_id === me);
  const friends = mine.filter((f) => f.status === "accepted");
  const requests = mine.filter((f) => f.status === "pending" && f.receiver_id === me);
  const sent = mine.filter((f) => f.status === "pending" && f.sender_id === me);
  const blocked = mine.filter((f) => f.status === "blocked" && f.blocked_by === me);

  const myFriends = s.friendIds();
  const mySet = new Set(myFriends);
  const suggestions = users
      .filter((u) => u.id !== me && !mySet.has(u.id) && s.relationWith(u.id).state === "none")
      .map((u) => ({ id: u.id, mutual: s.friendIds(u.id).filter((x) => mySet.has(x)).length }))
      .filter((x) => x.mutual > 0)
    .sort((a, b) => b.mutual - a.mutual);

  const stats = s.dashboard("relations", "user");

  const userSub = (id: string) => {
    const u = s.userById(id);
    return u ? `${u.role} · ${u.org}` : undefined;
  };

  const dm = (id: string) => navigate(`/dashboard/chat/${s.openDirect(id)}`);

  const unfriend = (f: Friendship) =>
    confirm({
      title: `ارتباط با «${s.userName(other(f))}» قطع شود؟`,
      message: "می‌توانید بعداً دوباره درخواست ارتباط بفرستید.",
      confirmLabel: "قطع ارتباط",
      onConfirm: () => {
        s.unfriend(f.id);
        notify("ارتباط قطع شد.", "info");
      },
    });

  const block = (id: string) =>
    confirm({
      title: `«${s.userName(id)}» مسدود شود؟`,
      message: "ارتباط فعلی حذف می‌شود و این فرد دیگر نمی‌تواند به شما درخواست یا پیام مستقیم بدهد.",
      confirmLabel: "مسدود کن",
      onConfirm: () => {
        s.blockUser(id);
        notify(`«${s.userName(id)}» مسدود شد.`, "info");
      },
    });

  const request = (id: string) => {
    const r = s.sendFriendRequest(id);
    if (r.ok) notify("درخواست ارتباط ارسال شد.", "success");
    else notify(r.error, "warning");
  };

  const empty = (icon: ReactNode, title: string, description: string) => <EmptyState icon={icon} title={title} description={description} />;
  const list = (children: ReactNode) => <div className="card p-0 overflow-hidden">{children}</div>;

  let body: ReactNode;
  if (tab === "friends") {
    body = friends.length
      ? list(
          friends.map((f) => (
            <Row key={f.id} id={other(f)} sub={userSub(other(f))}>
              {canChat && (
                <Button size="sm" variant="primary" icon={<MessageSquare size={14} />} onClick={() => dm(other(f))}>
                  پیام
                </Button>
              )}
              {canRelate && (
                <>
                  <Button size="sm" variant="ghost" icon={<UserMinus size={14} />} onClick={() => unfriend(f)}>
                    قطع ارتباط
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-600" icon={<Ban size={14} />} onClick={() => block(other(f))}>
                    مسدود
                  </Button>
                </>
              )}
            </Row>
          )),
        )
      : empty(<Users size={22} />, "هنوز با کسی در ارتباط نیستید", "از «اعضای سازمان» یا تب پیشنهادها درخواست ارتباط بفرستید.");
  } else if (tab === "requests") {
    body = requests.length
      ? list(
          requests.map((f) => (
            <Row key={f.id} id={f.sender_id} sub={`درخواست در ${stamp(f.created_at)}`}>
              <Button
                size="sm"
                variant="primary"
                icon={<Check size={14} />}
                disabled={!canRelate}
                onClick={() => {
                  s.respondFriend(f.id, true);
                  notify(`اکنون با «${s.userName(f.sender_id)}» در ارتباط هستید.`, "success");
                }}
              >
                پذیرش
              </Button>
              <Button
                size="sm"
                icon={<X size={14} />}
                disabled={!canRelate}
                onClick={() => {
                  s.respondFriend(f.id, false);
                  notify("درخواست رد شد.", "info");
                }}
              >
                رد
              </Button>
            </Row>
          )),
        )
      : empty(<Inbox size={22} />, "درخواست تازه‌ای ندارید", "درخواست‌های ارتباطی که دیگران برای شما می‌فرستند اینجا می‌آید.");
  } else if (tab === "sent") {
    body = sent.length
      ? list(
          sent.map((f) => (
            <Row key={f.id} id={f.receiver_id} sub={`ارسال در ${stamp(f.created_at)} · در انتظار پاسخ`}>
              <Button
                size="sm"
                icon={<X size={14} />}
                disabled={!canRelate}
                onClick={() => {
                  s.cancelFriendRequest(f.id);
                  notify("درخواست لغو شد.", "info");
                }}
              >
                لغو درخواست
              </Button>
            </Row>
          )),
        )
      : empty(<Send size={22} />, "درخواست در انتظاری ندارید", "درخواست‌هایی که فرستاده‌اید و هنوز پاسخ نگرفته‌اند اینجا نمایش داده می‌شوند.");
  } else if (tab === "blocked") {
    body = blocked.length
      ? list(
          blocked.map((f) => (
            <Row key={f.id} id={f.receiver_id} sub={`مسدود از ${stamp(f.updated_at)}`}>
              <Button
                size="sm"
                icon={<ShieldOff size={14} />}
                disabled={!canRelate}
                onClick={() => {
                  s.unblock(f.id);
                  notify(`«${s.userName(f.receiver_id)}» از مسدودی خارج شد.`, "success");
                }}
              >
                رفع مسدودی
              </Button>
            </Row>
          )),
        )
      : empty(<Ban size={22} />, "کسی را مسدود نکرده‌اید", "افراد مسدودشده نمی‌توانند برای شما درخواست یا پیام مستقیم بفرستند.");
  } else {
    body = suggestions.length
      ? list(
          suggestions.map((x) => (
            <Row key={x.id} id={x.id} sub={<span className="text-brand-700">{fa(x.mutual)} دوست مشترک</span>}>
              <Button size="sm" icon={<UserPlus size={14} />} disabled={!canRelate} onClick={() => request(x.id)}>
                درخواست ارتباط
              </Button>
            </Row>
          )),
        )
      : empty(<Sparkles size={22} />, "پیشنهادی نداریم", "وقتی ارتباط‌های بیشتری بسازید، دوستانِ دوستانتان اینجا پیشنهاد می‌شوند.");
  }

  return (
    <div>
      <PageHeader
        title="ارتباطات من"
        description="دوستان، درخواست‌های ارتباط و افراد مسدود"
        icon={<Link2 size={20} />}
        actions={
          <ApiChip
            items={[
              { label: "فهرست دوستان", ep: endpoints.friends() },
              { label: "درخواست‌های دریافتی", ep: endpoints.friendRequests() },
              { label: "درخواست‌های ارسالی", ep: endpoints.friendSent() },
              { label: "مسدودشده‌ها", ep: endpoints.friendBlocked() },
              { label: "ارسال درخواست (پیشنهادها)", ep: endpoints.friendSend() },
              { label: "پذیرش / رد", ep: endpoints.friendRespond("{id}") },
              { label: "لغو درخواست ارسالی", ep: endpoints.friendCancel("{id}") },
              { label: "قطع ارتباط", ep: endpoints.friendUnfriend("{id}") },
              { label: "مسدود کردن", ep: endpoints.friendBlock("{id}") },
              { label: "رفع مسدودی", ep: endpoints.friendUnblock("{id}") },
              { label: "آمار ارتباطات من", ep: endpoints.dashboard("relations/relations", "user") },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map((st) => (
          <div key={st.key} className="card px-4 py-3">
            <p className="text-xl font-bold text-ink-900">{fa(st.value)}</p>
            <p className="text-[11.5px] text-ink-500 mt-0.5">{st.title}</p>
          </div>
        ))}
      </div>

      <Tabs<Tab>
        tabs={[
          { id: "friends", label: "دوستان", count: friends.length },
          { id: "requests", label: "درخواست‌ها", count: requests.length },
          { id: "sent", label: "ارسالی", count: sent.length },
          { id: "blocked", label: "مسدود", count: blocked.length },
          { id: "suggestions", label: "پیشنهادها", count: suggestions.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {body}
    </div>
  );
}
