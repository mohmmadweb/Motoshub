import { useState } from "react";
import { AtSign, Heart, MessageCircle, Settings, CheckSquare, Bell, CheckCheck, Circle, CheckCircle2 } from "lucide-react";
import { notifications as initialNotifications, type Notification } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastProvider";

const typeIcon: Record<Notification["type"], typeof AtSign> = {
  mention: AtSign,
  like: Heart,
  comment: MessageCircle,
  system: Settings,
  task: CheckSquare,
};

type FilterId = "all" | "unread";

export default function Notifications() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [items, setItems] = useState<Notification[]>(initialNotifications);
  const { notify } = useToast();

  const unreadCount = items.filter((n) => !n.read).length;
  const list = filter === "unread" ? items.filter((n) => !n.read) : items;

  const toggleRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  const markAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    notify("همه‌ی اعلان‌ها خوانده‌شده علامت خوردند.", "info");
  };

  return (
    <div>
      <PageHeader
        title="اعلان‌ها"
        description="اعلان‌های برخط و رایانامه‌ای مرتبط با فعالیت‌های شما"
        icon={<Bell size={18} />}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" icon={<CheckCheck size={14} />} onClick={markAll}>
              خواندن همه ({unreadCount.toLocaleString("fa-IR")})
            </Button>
          ) : undefined
        }
      />

      <Tabs<FilterId>
        tabs={[
          { id: "all", label: "همه", count: items.length },
          { id: "unread", label: "خوانده‌نشده", count: unreadCount },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <div className="card divide-y divide-ink-100">
        {list.map((n) => {
          const Icon = typeIcon[n.type];
          return (
            <div key={n.id} className={`p-4 flex items-start gap-3 transition-colors ${!n.read ? "bg-brand-50/40" : ""}`}>
              <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                <Icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? "text-ink-500" : "text-ink-800 font-medium"}`}>{n.text}</p>
                <p className="text-xs text-ink-400 mt-1">{n.time}</p>
              </div>
              <button
                onClick={() => toggleRead(n.id)}
                title={n.read ? "علامت‌گذاری به‌عنوان خوانده‌نشده" : "علامت‌گذاری به‌عنوان خوانده‌شده"}
                aria-label={n.read ? "خوانده‌نشده کن" : "خوانده‌شده کن"}
                className="shrink-0 mt-1 text-ink-300 hover:text-brand-600 transition-colors"
              >
                {n.read ? <Circle size={16} /> : <CheckCircle2 size={16} className="text-brand-600" />}
              </button>
            </div>
          );
        })}
        {list.length === 0 && (
          <EmptyState icon={<Bell size={18} />} title={filter === "unread" ? "اعلان خوانده‌نشده‌ای ندارید 🎉" : "اعلانی وجود ندارد"} />
        )}
      </div>
    </div>
  );
}
