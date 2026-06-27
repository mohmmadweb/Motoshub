import { NotebookPen, Star, Plus, Hash } from "lucide-react";
import { blogPosts } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function Blog() {
  return (
    <div>
      <PageHeader
        title="بلاگ"
        description="یادداشت‌های منتشرشده توسط کاربران شبکه با امکان برچسب‌گذاری و امتیازدهی"
        icon={<NotebookPen size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />}>
            یادداشت جدید
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blogPosts.map((b) => (
          <article key={b.id} className="card p-5">
            <h3 className="font-bold text-sm text-ink-900">{b.title}</h3>
            <p className="text-xs text-ink-500 mt-2 leading-6">{b.excerpt}</p>
            <div className="flex items-center gap-1.5 mt-3">
              {b.tags.map((t) => (
                <Badge key={t} tone="neutral" icon={<Hash size={10} />}>
                  {t}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-100 text-xs text-ink-400">
              <span>
                {b.author} · {b.date}
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <Star size={13} className="fill-amber-500 text-amber-500" /> {b.rating}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
