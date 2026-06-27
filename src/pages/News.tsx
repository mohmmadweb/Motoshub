import { Newspaper, Pin, MessageCircle, Plus } from "lucide-react";
import { newsItems } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function News() {
  return (
    <div>
      <PageHeader
        title="اخبار سازمان"
        description="اطلاع‌رسانی عمومی شبکه و اطلاعیه‌های رسمی به همه‌ی کاربران"
        icon={<Newspaper size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />}>
            خبر جدید
          </Button>
        }
      />

      <div className="space-y-3">
        {newsItems.map((n) => (
          <article key={n.id} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-sm text-ink-900">{n.title}</h3>
              {n.pinned && (
                <Badge tone="brand" icon={<Pin size={11} />}>
                  مهم
                </Badge>
              )}
            </div>
            <p className="text-sm text-ink-600 leading-7">{n.summary}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 text-xs text-ink-400">
              <span>{n.date}</span>
              <span className="flex items-center gap-1">
                <MessageCircle size={13} /> {n.comments} نظر
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
