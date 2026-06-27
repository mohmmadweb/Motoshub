import { notifications } from "../data/mock";

const typeIcon: Record<string, string> = {
  mention: "🔖",
  like: "❤️",
  comment: "💬",
  system: "⚙️",
  task: "✅",
};

export default function Notifications() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-5">اعلان‌ها</h1>
      <div className="card divide-y divide-ink-100">
        {notifications.map((n) => (
          <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.read ? "bg-brand-50/40" : ""}`}>
            <span className="text-xl">{typeIcon[n.type]}</span>
            <div className="flex-1">
              <p className="text-sm">{n.text}</p>
              <p className="text-xs text-ink-400 mt-1">{n.time}</p>
            </div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-600 mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}
