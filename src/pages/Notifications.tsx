import { useState } from "react";
import { AtSign, Heart, MessageCircle, Settings, CheckSquare, Bell } from "lucide-react";
import { notifications, type Notification } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";

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
  const list = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div>
      <PageHeader title="اعلان‌ها" description="اعلان‌های برخط و رایانامه‌ای مرتبط با فعالیت‌های شما" icon={<Bell size={18} />} />

      <Tabs<FilterId>
        tabs={[
          { id: "all", label: "همه", count: notifications.length },
          { id: "unread", label: "خوانده‌نشده", count: notifications.filter((n) => !n.read).length },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <div className="card divide-y divide-ink-100">
        {list.map((n) => {
          const Icon = typeIcon[n.type];
          return (
            <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.read ? "bg-brand-50/40" : ""}`}>
              <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                <Icon size={15} />
              </span>
              <div className="flex-1">
                <p className="text-sm text-ink-800">{n.text}</p>
                <p className="text-xs text-ink-400 mt-1">{n.time}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-brand-600 mt-2 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
