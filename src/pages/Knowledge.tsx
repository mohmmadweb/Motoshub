import { useState } from "react";
import { BookOpen, FileText, Upload, Clock, User, History, Download } from "lucide-react";
import { knowledgeDocs as allDocsForCategories, currentUser, type KnowledgeDoc, type Visibility } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";
import Drawer from "../components/ui/Drawer";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityBadge, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";

const typeTone: Record<string, BadgeTone> = {
  قرارداد: "warning",
  آموزشی: "success",
  "صورت‌جلسه": "neutral",
  گزارش: "brand",
};

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function Knowledge() {
  const { knowledgeDocs: docs, setKnowledgeDocs: setDocs } = useContent();
  const [active, setActive] = useState("همه");
  const [selected, setSelected] = useState<KnowledgeDoc | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState<Visibility>("عمومی");
  const { notify } = useToast();

  const categories = ["همه", ...Array.from(new Set(allDocsForCategories.map((d) => d.category)))];
  const filtered = active === "همه" ? docs : docs.filter((d) => d.category === active);

  const confirmUpload = () => {
    if (!pendingFile) {
      notify("لطفاً ابتدا یک فایل انتخاب کنید.", "warning");
      return;
    }
    const newDoc: KnowledgeDoc = {
      id: `kd-${Date.now()}`,
      title: pendingFile.name,
      category: active === "همه" ? "صورت‌جلسه" : active,
      type: "گزارش",
      owner: currentUser.name,
      updatedAt: jalaliToday,
      size: `${(pendingFile.size / 1024).toFixed(0)} کیلوبایت`,
      visibility: uploadVisibility,
    };
    setDocs((prev) => [newDoc, ...prev]);
    notify(`سند «${pendingFile.name}» با موفقیت در بانک دانش بارگذاری شد (${uploadVisibility}).`);
    setUploadOpen(false);
    setPendingFile(null);
    setUploadVisibility("عمومی");
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

  const toggleVisibility = (id: string) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, visibility: d.visibility === "عمومی" ? "خصوصی" : "عمومی" } : d)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, visibility: prev.visibility === "عمومی" ? "خصوصی" : "عمومی" } : prev));
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
    { key: "visibility", label: "دسترسی", render: (d) => <VisibilityToggle visibility={d.visibility} onChange={() => toggleVisibility(d.id)} size="xs" /> },
  ];

  return (
    <div>
      <PageHeader
        title="مدیریت دانش"
        description="بانک اسناد سازمانی، آرشیو قراردادها و مستندات آموزشی با جستجوی پیشرفته"
        icon={<BookOpen size={18} />}
        actions={
          <Button variant="primary" icon={<Upload size={15} />} onClick={() => setUploadOpen(true)}>
            بارگذاری سند
          </Button>
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
              <VisibilityBadge visibility={selected.visibility} />
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
            <div className="border-t border-ink-100 pt-3">
              <p className="text-xs font-semibold text-ink-600 mb-2">سطح دسترسی</p>
              <VisibilityToggle visibility={selected.visibility} onChange={() => toggleVisibility(selected.id)} />
            </div>
            <Button variant="primary" className="w-full justify-center" icon={<Download size={14} />} onClick={() => handleDownload(selected)}>
              دانلود سند
            </Button>
          </div>
        )}
      </Drawer>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="بارگذاری سند جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">فایل سند</label>
            <input type="file" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} className="input-field" />
          </div>
          <VisibilityPicker value={uploadVisibility} onChange={setUploadVisibility} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={confirmUpload}>بارگذاری</Button>
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
