import { Link } from "react-router-dom";
import { Users, Lock, Globe2 } from "lucide-react";
import Badge from "./ui/Badge";
import type { Group } from "../data/mock";

export default function GroupCard({ group }: { group: Group }) {
  return (
    <Link to={`/app/groups/${group.id}`} className="card p-4 flex flex-col gap-3 hover:border-brand-300 transition-colors">
      <div className="flex items-center justify-between">
        <span
          className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-base"
          style={{ backgroundColor: group.color }}
        >
          {group.name.slice(0, 1)}
        </span>
        {group.unread > 0 && <Badge tone="brand">{group.unread} جدید</Badge>}
      </div>
      <div>
        <h3 className="font-semibold text-sm text-ink-900">{group.name}</h3>
        <p className="text-xs text-ink-500 mt-1 line-clamp-2">{group.description}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
        <span className="flex items-center gap-1">
          <Users size={13} /> {group.members.toLocaleString("fa-IR")} عضو
        </span>
        <Badge tone={group.privacy === "خصوصی" ? "warning" : "success"} icon={group.privacy === "خصوصی" ? <Lock size={11} /> : <Globe2 size={11} />}>
          {group.privacy}
        </Badge>
      </div>
    </Link>
  );
}
