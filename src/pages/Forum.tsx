import { forumTopics } from "../data/mock";
import Badge from "../components/Badge";

export default function Forum() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">انجمن</h1>
          <p className="text-sm text-ink-400 mt-1">تبادل اطلاعات، پرسش و پاسخ و دسته‌بندی موضوعات</p>
        </div>
        <button className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-700">
          + موضوع جدید
        </button>
      </div>

      <div className="card divide-y divide-ink-100">
        {forumTopics.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-50/60">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{t.title}</h3>
                {t.solved && <Badge tone="green">حل‌شده</Badge>}
              </div>
              <p className="text-xs text-ink-400 mt-1">
                توسط {t.author} · دسته: {t.category} · آخرین فعالیت {t.lastActivity}
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs text-ink-500 shrink-0">
              <span>💬 {t.replies}</span>
              <span>👁️ {t.views}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
