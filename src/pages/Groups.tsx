import { groups } from "../data/mock";
import GroupCard from "../components/GroupCard";

export default function Groups() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">گروه‌های تعاملی</h1>
          <p className="text-sm text-ink-400 mt-1">ایجاد، مدیریت و عضویت در گروه‌های خصوصی و عمومی سازمان</p>
        </div>
        <button className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-700">
          + گروه جدید
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  );
}
