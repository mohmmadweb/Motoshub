import { Plus, MessagesSquare, CheckCircle2, Eye, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { forumTopics } from "../data/mock";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

export default function Forum() {
  return (
    <div>
      <PageHeader
        title="انجمن"
        description="تبادل اطلاعات، پرسش‌و‌پاسخ و دسته‌بندی موضوعات در تالارهای گفتگو"
        icon={<MessagesSquare size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />}>
            موضوع جدید
          </Button>
        }
      />

      <div className="card divide-y divide-ink-100">
        {forumTopics.map((t) => (
          <Link key={t.id} to={`/app/forum/${t.id}`} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-50/60">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate text-ink-900">{t.title}</h3>
                {t.solved && (
                  <Badge tone="success" icon={<CheckCircle2 size={11} />}>
                    حل‌شده
                  </Badge>
                )}
              </div>
              <p className="text-xs text-ink-400 mt-1">
                توسط {t.author} · دسته: {t.category} · آخرین فعالیت {t.lastActivity}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-500 shrink-0">
              <span className="flex items-center gap-1">
                <MessageCircle size={13} /> {t.replies}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={13} /> {t.views}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
