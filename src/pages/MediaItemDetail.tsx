import { useParams } from "react-router-dom";
import { Image, Video, Star, Hash, PlayCircle, Send, MessageCircle } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { mediaImg, bgStyle } from "../data/images";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { VisibilityToggle, VisibilityBadge } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";

export default function MediaItemDetail() {
  const { id } = useParams();
  const { mediaItems, setMediaItems } = useContent();
  const { notify } = useToast();
  const item = mediaItems.find((m) => m.id === id);

  if (!item) return (
    <div className="card p-8 text-center text-sm text-ink-400">رسانه پیدا نشد.</div>
  );

  const toggleVisibility = () => {
    const next = item.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setMediaItems((prev) => prev.map((m) => m.id === item.id ? { ...m, visibility: next } : m));
    notify(`«${item.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <PageHeader
        title={item.title}
        breadcrumb={[{ label: "تصاویر و ویدیو", to: "/dashboard/media" }, { label: item.title }]}
        icon={<Image size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={item.visibility} />
            <VisibilityToggle visibility={item.visibility} onChange={toggleVisibility} size="sm" />
          </div>
        }
      />

      <div className="max-w-3xl space-y-4">
        {/* Thumbnail */}
        <div
          className="w-full h-64 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={bgStyle(mediaImg(item.id), item.color)}
        >
          {item.kind === "video"
            ? <PlayCircle size={56} className="text-white/90" />
            : <Image size={56} className="text-white/90" />}
          <span className="absolute top-3 right-3">
            <Badge tone="navy" icon={item.kind === "video" ? <Video size={11} /> : <Image size={11} />}>
              {item.kind === "video" ? "ویدیو" : "تصویر"}
            </Badge>
          </span>
          <span className="absolute top-3 left-3 flex items-center gap-1 text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded-md">
            <Star size={12} className="fill-amber-400 text-amber-400" /> {item.rating}
          </span>
        </div>

        <div className="card p-5">
          <h1 className="text-base font-bold text-ink-900 mb-3">{item.title}</h1>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-ink-400">آلبوم</dt>
              <dd className="text-ink-800 font-medium mt-0.5">{item.album}</dd>
            </div>
            <div>
              <dt className="text-ink-400">بارگذاری‌شده توسط</dt>
              <dd className="text-ink-800 font-medium mt-0.5">{item.uploadedBy}</dd>
            </div>
            <div>
              <dt className="text-ink-400">تاریخ</dt>
              <dd className="text-ink-800 font-medium mt-0.5">{item.date}</dd>
            </div>
            <div>
              <dt className="text-ink-400">نوع</dt>
              <dd className="text-ink-800 font-medium mt-0.5">{item.kind === "video" ? "ویدیو" : "تصویر"}</dd>
            </div>
          </dl>
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-4 flex-wrap">
              {item.tags.map((t) => (
                <Badge key={t} tone="neutral" icon={<Hash size={10} />}>{t}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-600 mb-3 flex items-center gap-1.5">
            <MessageCircle size={13} /> نظرات
          </p>
          <div className="flex items-center gap-2">
            <input className="input-field flex-1" placeholder="نظر خود را بنویسید…" />
            <Button variant="primary" icon={<Send size={14} />}>ارسال</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
