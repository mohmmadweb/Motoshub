import { useState } from "react";
import { Plus, MessagesSquare, CheckCircle2, Eye, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { forumTopics as initialTopics, currentUser, type ForumTopic } from "../data/mock";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

export default function Forum() {
  const [topics, setTopics] = useState<ForumTopic[]>(initialTopics);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim()) {
      notify("عنوان موضوع الزامی است.", "warning");
      return;
    }
    const newTopic: ForumTopic = {
      id: `f-${Date.now()}`,
      title: title.trim(),
      author: currentUser.name,
      replies: 0,
      views: 1,
      lastActivity: "اکنون",
      category: category.trim() || "عمومی",
    };
    setTopics((prev) => [newTopic, ...prev]);
    notify(`موضوع «${newTopic.title}» در انجمن منتشر شد.`);
    setOpen(false);
    setTitle("");
    setCategory("");
  };

  return (
    <div>
      <PageHeader
        title="انجمن"
        description="تبادل اطلاعات، پرسش‌و‌پاسخ و دسته‌بندی موضوعات در تالارهای گفتگو"
        icon={<MessagesSquare size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            موضوع جدید
          </Button>
        }
      />

      <div className="card divide-y divide-ink-100">
        {topics.map((t) => (
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

      <Modal open={open} onClose={() => setOpen(false)} title="ایجاد موضوع جدید در انجمن">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان موضوع</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: بهترین روش احراز هویت چندعاملی برای پنل راهبری" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته‌بندی</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً: امنیت" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار موضوع</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
