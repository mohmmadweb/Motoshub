import { Link } from "react-router-dom";
import { Users, Lock, Globe2 } from "lucide-react";
import Badge from "./ui/Badge";
import RowActions from "./ui/RowActions";
import { VisibilityToggle } from "./ui/VisibilityControl";
import type { Group } from "../data/mock";

export default function GroupCard({
  group,
  onTogglePrivacy,
  onEdit,
  onDelete,
}: {
  group: Group;
  onTogglePrivacy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  // کارت خودش یک لینک است؛ اکشن‌های ردیف نباید پیمایش را فعال کنند
  const guard = (fn?: () => void) =>
    fn ? () => fn() : undefined;

  return (
    <Link to={`/dashboard/groups/${group.id}`} className="card p-4 flex flex-col gap-3 hover:border-brand-300 transition-colors">
      <div className="flex items-center justify-between">
        <span
          className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-base"
          style={{ backgroundColor: group.color }}
        >
          {group.name.slice(0, 1)}
        </span>
        <span className="flex items-center gap-1">
          {group.unread > 0 && <Badge tone="brand">{group.unread} جدید</Badge>}
          <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <RowActions onEdit={guard(onEdit)} onDelete={guard(onDelete)} />
          </span>
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-sm text-ink-900">{group.name}</h3>
        <p className="text-xs text-ink-500 mt-1 line-clamp-2">{group.description}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
        <span className="flex items-center gap-1">
          <Users size={13} /> {group.members.toLocaleString("fa-IR")} عضو
        </span>
        {onTogglePrivacy ? (
          <VisibilityToggle
            visibility={group.privacy}
            onChange={onTogglePrivacy}
            size="xs"
          />
        ) : (
          <Badge tone={group.privacy === "خصوصی" ? "warning" : "success"} icon={group.privacy === "خصوصی" ? <Lock size={11} /> : <Globe2 size={11} />}>
            {group.privacy}
          </Badge>
        )}
      </div>
    </Link>
  );
}
