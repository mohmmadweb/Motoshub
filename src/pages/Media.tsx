import { useState } from "react";
import { Image, Video, Star, Upload, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { currentUser, type MediaItem, type Visibility } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";
import { mediaImg, bgStyle } from "../data/images";

const jalaliToday = "۱۴۰۵/۰۴/۰۷";
const palette = ["#82aee6", "#93a2b8", "#1f4f99", "#5e7191", "#0d9488"];

export default function Media() {
  const { mediaItems: items, setMediaItems: setItems } = useContent();
  const [kind, setKind] = useState<"all" | "photo" | "video">("all");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("خصوصی");
  const { notify } = useToast();

  const [topic, setTopic] = useState<string>("همه");
  const topics = ["همه", ...Array.from(new Set(items.map((m) => m.album)))];
  const filtered = items
    .filter((m) => (kind === "all" ? true : m.kind === kind))
    .filter((m) => (topic === "همه" ? true : m.album === topic));

  const submit = () => {
    if (!file || !title.trim()) {
      notify("انتخاب فایل و عنوان الزامی است.", "warning");
      return;
    }
    const newItem: MediaItem = {
      id: `m-${Date.now()}`,
      kind: file.type.startsWith("video") ? "video" : "photo",
      title: title.trim(),
      album: album.trim() || "بدون آلبوم",
      uploadedBy: currentUser.name,
      date: jalaliToday,
      rating: 0,
      tags: [],
      color: palette[items.length % palette.length],
      visibility,
    };
    setItems((prev) => [newItem, ...prev]);
    notify(`«${newItem.title}» در گالری بارگذاری شد (${visibility}).`);
    setOpen(false);
    setFile(null); setTitle(""); setAlbum(""); setVisibility("عمومی");
  };

  const toggleVisibility = (id: string) => {
    const item = items.find((m) => m.id === id);
    if (!item) return;
    const next = item.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setItems((prev) => prev.map((m) => m.id === id ? { ...m, visibility: next } : m));
    notify(`«${item.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <PageHeader
        title="تصاویر و ویدیو"
        description="مدیریت آلبوم‌های کاربری، حریم خصوصی محتوا و اتصال به شبکه‌ی آپارات"
        icon={<Image size={18} />}
        actions={
          <Button variant="primary" icon={<Upload size={15} />} onClick={() => setOpen(true)}>
            بارگذاری محتوا
          </Button>
        }
      />

      <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1 mb-4 w-fit">
        {[
          { id: "all", label: "همه" },
          { id: "photo", label: "تصاویر" },
          { id: "video", label: "ویدیو" },
        ].map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id as typeof kind)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md ${kind === k.id ? "bg-white shadow text-brand-700" : "text-ink-500"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* موضوع‌ها (آلبوم‌ها) */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {topics.map((t) => {
          const count = t === "همه" ? items.length : items.filter((m) => m.album === t).length;
          return (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                topic === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
              }`}
            >
              {t} <span className="text-[10px] opacity-70">({count.toLocaleString("fa-IR")})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((m) => (
          <div key={m.id} className="card overflow-hidden group">
            <Link to={`/dashboard/media/${m.id}`} className="block">
              <div className="h-32 flex items-center justify-center relative shrink-0" style={bgStyle(mediaImg(m.id), m.color)}>
                <span className="absolute inset-0 bg-black/25" />
                {m.kind === "video"
                  ? <PlayCircle size={32} className="text-white/80 group-hover:text-white transition-colors" />
                  : <Image size={32} className="text-white/80 group-hover:text-white transition-colors" />}
                <span className="absolute top-2 right-2">
                  <Badge tone="navy" icon={m.kind === "video" ? <Video size={10} /> : <Image size={10} />}>
                    {m.kind === "video" ? "ویدیو" : "تصویر"}
                  </Badge>
                </span>
              </div>
            </Link>
            <div className="p-3">
              <Link
                to={`/dashboard/media/${m.id}`}
                className="text-xs font-semibold text-ink-900 hover:text-brand-700 transition-colors truncate block"
              >
                {m.title}
              </Link>
              <p className="text-[11px] text-ink-400 mt-1 truncate">{m.album} · {m.uploadedBy}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-ink-400">{m.date}</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-amber-600 text-[11px] font-medium">
                    <Star size={11} className="fill-amber-500 text-amber-500" /> {m.rating}
                  </span>
                  <VisibilityToggle
                    visibility={m.visibility}
                    onChange={() => toggleVisibility(m.id)}
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="بارگذاری محتوای جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">فایل تصویر/ویدیو</label>
            <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: بازدید هیات مدیره از واحد فنی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">آلبوم</label>
            <input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="رویدادهای رسمی" className="input-field" />
          </div>
          <VisibilityPicker value={visibility} onChange={setVisibility} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>بارگذاری</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
