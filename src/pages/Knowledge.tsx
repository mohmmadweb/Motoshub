import { useRef, useState } from "react";
import { BookOpen, FileText, Upload, Clock, User, History, Download } from "lucide-react";
import { knowledgeDocs as initialDocs, currentUser, type KnowledgeDoc } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";
import Drawer from "../components/ui/Drawer";
import { useToast } from "../components/ui/ToastProvider";

const typeTone: Record<string, BadgeTone> = {
  قرارداد: "warning",
  آموزشی: "success",
  "صورت‌جلسه": "neutral",
  گزارش: "brand",
};

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function Knowledge() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs);
  const [active, setActive] = useState("همه");
  const [selected, setSelected] = useState<KnowledgeDoc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  const categories = ["همه", ...Array.from(new Set(initialDocs.map((d) => d.category)))];
  const filtered = active === "همه" ? docs : docs.filter((d) => d.category === active);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newDoc: KnowledgeDoc = {
      id: `kd-${Date.now()}`,
      title: file.name,
      category: active === "همه" ? "صورت‌جلسه" : active,
      type: "گزارش",
      owner: currentUser.name,
      updatedAt: jalaliToday,
      size: `${(file.size / 1024).toFixed(0)} کیلوبایت`,
    };
    setDocs((prev) => [newDoc, ...prev]);
    notify(`سند «${file.name}» با موفقیت در بانک دانش بارگذاری شد.`);
    e.target.value = "";
  };

  const handleDownload = (doc: KnowledgeDoc) => {
    const content = `${doc.title}\nدسته‌بندی: ${doc.category}\nمالک: ${doc.owner}\nآخرین بروزرسانی: ${doc.updatedAt}\n\n(این یک خروجی نمایشی از پروتوتایپ موتوشاب است و جای‌گزین فایل اصلی نیست.)`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`دانلود سند «${doc.title}» آغاز شد.`, "info");
  };

  const columns: Column<KnowledgeDoc>[] = [
    {
      key: "title",
      label: "عنوان سند",
      render: (d) => (
        <span className="flex items-center gap-2 font-medium text-ink-900">
          <FileText size={14} className="text-ink-400" /> {d.title}
        </span>
      ),
    },
    { key: "category", label: "دسته‌بندی" },
    { key: "type", label: "نوع", render: (d) => <Badge tone={typeTone[d.type]}>{d.type}</Badge> },
    { key: "owner", label: "مالک" },
    { key: "updatedAt", label: "بروزرسانی" },
    { key: "size", label: "حجم" },
  ];

  return (
    <div>
      <PageHeader
        title="مدیریت دانش"
        description="بانک اسناد سازمانی، آرشیو قراردادها و مستندات آموزشی با جستجوی پیشرفته"
        icon={<BookOpen size={18} />}
        actions={
          <>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            <Button variant="primary" icon={<Upload size={15} />} onClick={() => fileInputRef.current?.click()}>
              بارگذاری سند
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              active === c ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={filtered} searchKeys={["title", "owner"]} searchPlaceholder="جستجو در عنوان یا مالک سند…" onRowClick={setSelected} />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ""}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={typeTone[selected.type]}>{selected.type}</Badge>
              <Badge tone="neutral">{selected.category}</Badge>
            </div>
            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-ink-500">
                <User size={13} /> مالک: <span className="text-ink-800 font-medium">{selected.owner}</span>
              </div>
              <div className="flex items-center gap-2 text-ink-500">
                <Clock size={13} /> آخرین بروزرسانی: <span className="text-ink-800 font-medium">{selected.updatedAt}</span>
              </div>
              <div className="flex items-center gap-2 text-ink-500">
                <FileText size={13} /> حجم: <span className="text-ink-800 font-medium">{selected.size}</span>
              </div>
            </dl>
            <div className="border-t border-ink-100 pt-3">
              <p className="text-xs font-semibold text-ink-600 mb-2 flex items-center gap-1.5">
                <History size={13} /> تاریخچه‌ی نسخه‌ها
              </p>
              <ul className="text-xs text-ink-400 space-y-1">
                <li>نسخه ۳ — {selected.updatedAt} — {selected.owner}</li>
                <li>نسخه ۲ — یک ماه پیش — دبیرخانه</li>
                <li>نسخه ۱ — ایجاد سند</li>
              </ul>
            </div>
            <Button variant="primary" className="w-full justify-center" icon={<Download size={14} />} onClick={() => handleDownload(selected)}>
              دانلود سند
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
