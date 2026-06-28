import { useState } from "react";
import { NotebookPen, Star, Plus, Hash } from "lucide-react";
import { blogPosts as initialPosts, currentUser, type BlogPost } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim() || !excerpt.trim()) {
      notify("عنوان و متن یادداشت الزامی است.", "warning");
      return;
    }
    const newPost: BlogPost = {
      id: `b-${Date.now()}`,
      title: title.trim(),
      author: currentUser.name,
      excerpt: excerpt.trim(),
      date: jalaliToday,
      rating: 0,
      tags: tags.split("،").map((t) => t.trim()).filter(Boolean),
    };
    setPosts((prev) => [newPost, ...prev]);
    notify(`یادداشت «${newPost.title}» در بلاگ منتشر شد.`);
    setOpen(false);
    setTitle("");
    setExcerpt("");
    setTags("");
  };

  return (
    <div>
      <PageHeader
        title="بلاگ"
        description="یادداشت‌های منتشرشده توسط کاربران شبکه با امکان برچسب‌گذاری و امتیازدهی"
        icon={<NotebookPen size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            یادداشت جدید
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((b) => (
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

      <Modal open={open} onClose={() => setOpen(false)} title="انتشار یادداشت جدید در بلاگ">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: تجربه‌ی یک‌ساله از مهاجرت به معماری چندمستأجری" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">متن یادداشت</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="input-field min-h-24" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">برچسب‌ها (با «،» جدا کنید)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="معماری، چندمستأجری" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
