import { Link } from "react-router-dom";
import Badge from "./Badge";
import type { Group } from "../data/mock";

export default function GroupCard({ group }: { group: Group }) {
  return (
    <Link to={`/app/groups/${group.id}`} className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: group.color }}
        >
          {group.name.slice(0, 1)}
        </span>
        {group.unread > 0 && <Badge tone="brand">{group.unread} جدید</Badge>}
      </div>
      <div>
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <p className="text-xs text-ink-400 mt-1 line-clamp-2">{group.description}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
        <span>{group.members.toLocaleString("fa-IR")} عضو</span>
        <Badge tone={group.privacy === "خصوصی" ? "yellow" : "green"}>{group.privacy}</Badge>
      </div>
    </Link>
  );
}
