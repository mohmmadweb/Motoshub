import { useState } from "react";
import { Newspaper, Pin, MessageCircle, Plus } from "lucide-react";
import { type NewsItem, type Visibility } from "../data/mock";
import { useContent } from "../context/ContentContext";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import { VisibilityBadge, VisibilityPicker, VisibilityToggle } from "../components/ui/VisibilityControl";

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function News() {
  const { newsItems, setNewsItems } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pinned, setPinned] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim() || !summary.trim()) {
      notify("عنوان و متن خبر الزامی است.", "warning");
      return;
    }
    const newItem: NewsItem = {
      id: `nw-${Date.now()}`,
      title: title.trim(),
      summary: summary.trim(),
      date: jalaliToday,
      comments: 0,
      pinned,
      visibility,
    };
    setNewsItems((prev) => [newItem, ...prev]);
    const label = visibility === "عمومی" ? "برای همه‌ی اعضا" : "به‌صورت خصوصی";
    notify(`اطلاعیه «${newItem.title}» ${label} منتشر شد.`);
    setOpen(false);
    setTitle("");
    setSummary("");
    setPinned(false);
    setVisibility("خصوصی");
  };

  const toggleVisibility = (id: string) => {
    setNewsItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, visibility: n.visibility === "عمومی" ? "خصوصی" : "عمومی" } : n))
    );
  };

  return (
    <div>
      <PageHeader
        title="اخبار سازمان"
        description="اطلاع‌رسانی عمومی شبکه و اطلاعیه‌های رسمی به همه‌ی کاربران"
        icon={<Newspaper size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            خبر جدید
          </Button>
        }
      />

      <div className="space-y-3">
        {newsItems.map((n) => (
          <article key={n.id} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-sm text-ink-900 flex-1">{n.title}</h3>
              {n.pinned && (
                <Badge tone="brand" icon={<Pin size={11} />}>
                  مهم
                </Badge>
              )}
              <VisibilityBadge visibility={n.visibility} />
            </div>
            <p className="text-sm text-ink-600 leading-7">{n.summary}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 text-xs text-ink-400">
              <span>{n.date}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MessageCircle size={13} /> {n.comments} نظر
                </span>
                <VisibilityToggle
                  visibility={n.visibility}
                  onChange={() => toggleVisibility(n.id)}
                  size="xs"
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="انتشار اطلاعیه‌ی رسمی جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان خبر</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: به‌روزرسانی سیاست امنیتی ورود دومرحله‌ای" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">متن خبر</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="input-field min-h-24" />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-600">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-brand-600" />
            سنجاق‌کردن به‌عنوان خبر مهم
          </label>
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
