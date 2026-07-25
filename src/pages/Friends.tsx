import { useState } from "react";
import { UserPlus, UserCheck, UserX, Users, Rss, Clock3 } from "lucide-react";
import { users, userPresence } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";
import Avatar from "../components/Avatar";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastProvider";

// دوستان و دنبال‌کردن — معادل ماژول‌های friends و user-follow در motoshub-web
type FriendState = "friend" | "incoming" | "outgoing" | "suggested";

const initialStates: Record<string, FriendState> = {
  u2: "friend",
  u5: "friend",
  u6: "friend",
  u7: "incoming",
  u9: "incoming",
  u8: "outgoing",
  u10: "suggested",
  u11: "suggested",
  u12: "suggested",
  u13: "suggested",
  u3: "suggested",
  u4: "friend",
};

export default function Friends() {
  const [tab, setTab] = useState<"friends" | "requests" | "suggested" | "following">("friends");
  const [states, setStates] = useState(initialStates);
  const [following, setFollowing] = useState<string[]>(["u2", "u6", "u7", "u12"]);
  const { notify } = useToast();

  const list = (s: FriendState) => users.filter((u) => states[u.id] === s);
  const set = (id: string, s: FriendState) => setStates((prev) => ({ ...prev, [id]: s }));

  const counts = {
    friends: list("friend").length,
    incoming: list("incoming").length,
    outgoing: list("outgoing").length,
    suggested: list("suggested").length,
  };

  const Row = ({ id, actions }: { id: string; actions: React.ReactNode }) => {
    const u = users.find((x) => x.id === id)!;
    return (
      <div className="p-3.5 flex items-center gap-3">
        <Avatar name={u.name} color={u.avatarColor} size={40} status={userPresence[u.id]} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{u.name}</p>
          <p className="text-[11.5px] text-ink-400 truncate">{u.role} · {u.org}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="دوستان و دنبال‌کردن"
        description="شبکه‌ی ارتباطی شما: دوستان، درخواست‌های دوستی و افرادی که دنبال می‌کنید"
        icon={<Users size={18} />}
      />
      <Tabs
        tabs={[
          { id: "friends", label: "دوستان من", count: counts.friends },
          { id: "requests", label: "درخواست‌ها", count: counts.incoming + counts.outgoing },
          { id: "suggested", label: "پیشنهادها", count: counts.suggested },
          { id: "following", label: "دنبال‌شده‌ها", count: following.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "friends" && (
        <div className="card divide-y divide-ink-100">
          {list("friend").map((u) => (
            <Row
              key={u.id}
              id={u.id}
              actions={
                <>
                  <Badge tone="success" icon={<UserCheck size={10} />}>دوست</Badge>
                  <Button variant="secondary" size="sm" onClick={() => { set(u.id, "suggested"); notify(`«${u.name}» از فهرست دوستان حذف شد.`, "info"); }}>
                    حذف دوستی
                  </Button>
                </>
              }
            />
          ))}
          {counts.friends === 0 && <EmptyState icon={<Users size={18} />} title="هنوز دوستی ندارید" />}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-bold text-ink-900 mb-2">درخواست‌های دریافتی ({counts.incoming.toLocaleString("fa-IR")})</h3>
            <div className="card divide-y divide-ink-100">
              {list("incoming").map((u) => (
                <Row
                  key={u.id}
                  id={u.id}
                  actions={
                    <>
                      <Button variant="primary" size="sm" icon={<UserCheck size={13} />} onClick={() => { set(u.id, "friend"); notify(`درخواست دوستی «${u.name}» پذیرفته شد.`); }}>
                        پذیرش
                      </Button>
                      <Button variant="secondary" size="sm" icon={<UserX size={13} />} onClick={() => { set(u.id, "suggested"); notify("درخواست رد شد.", "info"); }}>
                        رد
                      </Button>
                    </>
                  }
                />
              ))}
              {counts.incoming === 0 && <p className="p-4 text-xs text-ink-400">درخواست جدیدی ندارید.</p>}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink-900 mb-2">درخواست‌های ارسالی ({counts.outgoing.toLocaleString("fa-IR")})</h3>
            <div className="card divide-y divide-ink-100">
              {list("outgoing").map((u) => (
                <Row
                  key={u.id}
                  id={u.id}
                  actions={
                    <>
                      <Badge tone="warning" icon={<Clock3 size={10} />}>در انتظار پاسخ</Badge>
                      <Button variant="secondary" size="sm" onClick={() => { set(u.id, "suggested"); notify("درخواست لغو شد.", "info"); }}>لغو</Button>
                    </>
                  }
                />
              ))}
              {counts.outgoing === 0 && <p className="p-4 text-xs text-ink-400">درخواست ارسالی ندارید.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "suggested" && (
        <div className="card divide-y divide-ink-100">
          {list("suggested").map((u) => (
            <Row
              key={u.id}
              id={u.id}
              actions={
                <Button variant="primary" size="sm" icon={<UserPlus size={13} />} onClick={() => { set(u.id, "outgoing"); notify(`درخواست دوستی برای «${u.name}» ارسال شد.`); }}>
                  افزودن دوست
                </Button>
              }
            />
          ))}
        </div>
      )}

      {tab === "following" && (
        <div className="card divide-y divide-ink-100">
          {users.filter((u) => u.id !== "u1").map((u) => {
            const on = following.includes(u.id);
            return (
              <Row
                key={u.id}
                id={u.id}
                actions={
                  <Button
                    variant={on ? "secondary" : "primary"}
                    size="sm"
                    icon={<Rss size={13} />}
                    onClick={() => {
                      setFollowing((prev) => (on ? prev.filter((x) => x !== u.id) : [...prev, u.id]));
                      notify(on ? `دیگر «${u.name}» را دنبال نمی‌کنید.` : `«${u.name}» را دنبال کردید — فعالیت‌هایش در فید شما می‌آید.`, "info");
                    }}
                  >
                    {on ? "دنبال‌شده" : "دنبال کردن"}
                  </Button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
