import { useState } from "react";
import { NotebookPen, Star, Plus, Hash } from "lucide-react";
import { Link } from "react-router-dom";
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
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
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
    setTitle(""); setExcerpt(""); setTags(""); setVisibility("عمومی");
  };

  const toggleVisibility = (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const next = post.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, visibility: next } : p));
    notify(`«${post.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
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

      <div className="card divide-y divide-ink-100">
        {/* header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-ink-50 text-[11px] font-semibold text-ink-400 uppercase tracking-wide">
          <span>عنوان یادداشت</span>
          <span className="text-center">برچسب‌ها</span>
          <span className="text-center">نویسنده</span>
          <span className="text-center">امتیاز</span>
          <span className="text-center">دسترسی</span>
        </div>

        {posts.map((b) => (
          <div
            key={b.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-ink-50/60 transition-colors"
          >
            {/* Title + excerpt */}
            <div className="min-w-0">
              <Link
                to={`/dashboard/blog/${b.id}`}
                className="font-medium text-sm text-ink-900 hover:text-brand-700 transition-colors truncate block"
              >
                {b.title}
              </Link>
              <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">{b.excerpt}</p>
            </div>
            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {b.tags.slice(0, 2).map((t) => (
                <Badge key={t} tone="neutral" icon={<Hash size={9} />}>{t}</Badge>
              ))}
            </div>
            {/* Author + date */}
            <span className="text-xs text-ink-400 whitespace-nowrap">{b.author}</span>
            {/* Rating */}
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium whitespace-nowrap">
              <Star size={12} className="fill-amber-500 text-amber-500" /> {b.rating}
            </span>
            {/* Visibility toggle */}
            <VisibilityToggle
              visibility={b.visibility}
              onChange={() => toggleVisibility(b.id)}
              size="xs"
            />
          </div>
        ))}

        {posts.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-400">هنوز یادداشتی ثبت نشده</div>
        )}
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
