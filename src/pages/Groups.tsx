import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { groups } from "../data/mock";
import GroupCard from "../components/GroupCard";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

const categories = ["همه", ...Array.from(new Set(groups.map((g) => g.category)))];

export default function Groups() {
  const [active, setActive] = useState("همه");
  const filtered = active === "همه" ? groups : groups.filter((g) => g.category === active);

  return (
    <div>
      <PageHeader
        title="گروه‌های تعاملی"
        description="ایجاد، مدیریت و عضویت در گروه‌های خصوصی و عمومی سازمان"
        icon={<Users size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />}>
            گروه جدید
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              active === c ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  );
}
