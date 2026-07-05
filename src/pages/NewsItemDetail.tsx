import { useParams } from "react-router-dom";
import { Newspaper, Pin, MessageCircle, Send } from "lucide-react";
import { useContent } from "../context/ContentContext";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { VisibilityToggle, VisibilityBadge } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";

export default function NewsItemDetail() {
  const { id } = useParams();
  const { newsItems, setNewsItems } = useContent();
  const { notify } = useToast();
  const item = newsItems.find((n) => n.id === id);

  if (!item) return (
    <div className="card p-8 text-center text-sm text-ink-400">خبر پیدا نشد.</div>
  );

  const toggleVisibility = () => {
    const next = item.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setNewsItems((prev) => prev.map((n) => n.id === item.id ? { ...n, visibility: next } : n));
    notify(`«${item.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <PageHeader
        title={item.title}
        breadcrumb={[{ label: "اخبار سازمان", to: "/dashboard/news" }, { label: item.title }]}
        icon={<Newspaper size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={item.visibility} />
            <VisibilityToggle visibility={item.visibility} onChange={toggleVisibility} size="sm" />
          </div>
        }
      />

      <div className="max-w-3xl space-y-4">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            {item.pinned && <Badge tone="brand" icon={<Pin size={11} />}>اطلاعیه مهم</Badge>}
            <span className="text-xs text-ink-400">{item.date}</span>
          </div>
          <h1 className="text-lg font-bold text-ink-900 mb-4 leading-8">{item.title}</h1>
          <p className="text-sm text-ink-700 leading-8">{item.summary}</p>
          <div className="flex items-center gap-1 mt-6 pt-4 border-t border-ink-100 text-xs text-ink-400">
            <MessageCircle size={13} /> {item.comments} نظر
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-600 mb-3">ارسال نظر</p>
          <div className="flex items-center gap-2">
            <input className="input-field flex-1" placeholder="نظر خود را بنویسید…" />
            <Button variant="primary" icon={<Send size={14} />}>ارسال</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
