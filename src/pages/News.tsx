import { useState } from "react";
import { Newspaper, Pin, MessageCircle, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { type NewsItem, type Visibility } from "../data/mock";
import { useContent } from "../context/ContentContext";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import { VisibilityPicker, VisibilityToggle } from "../components/ui/VisibilityControl";

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
    notify(`اطلاعیه «${newItem.title}» ${visibility === "عمومی" ? "برای همه‌ی اعضا" : "به‌صورت خصوصی"} منتشر شد.`);
    setOpen(false);
    setTitle(""); setSummary(""); setPinned(false); setVisibility("خصوصی");
  };

  const toggleVisibility = (id: string) => {
    const item = newsItems.find((n) => n.id === id);
    if (!item) return;
    const next = item.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setNewsItems((prev) => prev.map((n) => n.id === id ? { ...n, visibility: next } : n));
    notify(`«${item.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
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

      <div className="card divide-y divide-ink-100">
        {/* table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-ink-50 text-[11px] font-semibold text-ink-400 uppercase tracking-wide">
          <span>عنوان خبر</span>
          <span className="text-center">تاریخ</span>
          <span className="text-center">وضعیت</span>
          <span className="text-center">نظرات</span>
          <span className="text-center">دسترسی</span>
        </div>

        {newsItems.map((n) => (
          <div
            key={n.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-ink-50/60 transition-colors"
          >
            {/* Title — clickable */}
            <div className="min-w-0">
              <Link
                to={`/dashboard/news/${n.id}`}
                className="font-medium text-sm text-ink-900 hover:text-brand-700 transition-colors truncate block"
              >
                {n.title}
              </Link>
              <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">{n.summary}</p>
            </div>
            {/* Date */}
            <span className="text-xs text-ink-400 whitespace-nowrap">{n.date}</span>
            {/* Pinned badge */}
            <span>
              {n.pinned
                ? <Badge tone="brand" icon={<Pin size={10} />}>مهم</Badge>
                : <span className="text-xs text-ink-300">—</span>}
            </span>
            {/* Comments */}
            <span className="flex items-center gap-1 text-xs text-ink-400">
              <MessageCircle size={12} /> {n.comments}
            </span>
            {/* Visibility toggle */}
            <VisibilityToggle
              visibility={n.visibility}
              onChange={() => toggleVisibility(n.id)}
              size="xs"
            />
          </div>
        ))}

        {newsItems.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-400">هنوز خبری ثبت نشده</div>
        )}
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
          <label className="flex items-center gap-2 text-xs text-ink-600 cursor-pointer">
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
