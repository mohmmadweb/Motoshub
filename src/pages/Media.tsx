import { useState } from "react";
import { Image, Video, Star, Upload, PlayCircle } from "lucide-react";
import { mediaItems } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function Media() {
  const [kind, setKind] = useState<"all" | "photo" | "video">("all");
  const filtered = kind === "all" ? mediaItems : mediaItems.filter((m) => m.kind === kind);

  return (
    <div>
      <PageHeader
        title="تصاویر و ویدیو"
        description="مدیریت آلبوم‌های کاربری، حریم خصوصی محتوا و اتصال به شبکه‌ی آپارات"
        icon={<Image size={18} />}
        actions={
          <Button variant="primary" icon={<Upload size={15} />}>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((m) => (
          <div key={m.id} className="card overflow-hidden">
            <div className="h-28 flex items-center justify-center relative shrink-0" style={{ backgroundColor: m.color }}>
              {m.kind === "video" ? <PlayCircle size={28} className="text-white" /> : <Image size={28} className="text-white" />}
              <span className="absolute top-2 right-2">
                <Badge tone="navy" icon={m.kind === "video" ? <Video size={10} /> : <Image size={10} />}>
                  {m.kind === "video" ? "ویدیو" : "تصویر"}
                </Badge>
              </span>
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-ink-900 truncate">{m.title}</p>
              <p className="text-[11px] text-ink-400 mt-1">{m.album} · {m.uploadedBy}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-ink-400">{m.date}</span>
                <span className="flex items-center gap-1 text-amber-600 text-[11px] font-medium">
                  <Star size={11} className="fill-amber-500 text-amber-500" /> {m.rating}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
