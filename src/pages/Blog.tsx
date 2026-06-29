import { useState } from "react";
import { NotebookPen, Star, Plus, Hash } from "lucide-react";
import { currentUser, type BlogPost, type Visibility } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function Blog() {
  const { blogPosts: posts, setBlogPosts: setPosts } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("عمومی");
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
      visibility,
    };
    setPosts((prev) => [newPost, ...prev]);
    notify(`یادداشت «${newPost.title}» در بلاگ منتشر شد (${visibility}).`);
    setOpen(false);
    setTitle("");
    setExcerpt("");
    setTags("");
    setVisibility("عمومی");
  };

  const toggleVisibility = (id: string) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, visibility: p.visibility === "عمومی" ? "خصوصی" : "عمومی" } : p)));

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
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-ink-900">{b.title}</h3>
              <VisibilityToggle visibility={b.visibility} onChange={() => toggleVisibility(b.id)} size="xs" />
            </div>
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
          <VisibilityPicker value={visibility} onChange={setVisibility} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
