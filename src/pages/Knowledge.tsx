import { useState } from "react";
import { BookOpen, FileText, Upload, Clock, User, History, Download, Lightbulb } from "lucide-react";
import { knowledgeDocs as allDocsForCategories, currentUser, type KnowledgeDoc, type Visibility } from "../data/mock";
import { rndOpportunityDocs, rndDocStates, supportedProducts, supportedVentures, partnerTechnologists } from "../data/mockDaneshmand";
import Tabs from "../components/ui/Tabs";
import RowActions from "../components/ui/RowActions";
import { useConfirm } from "../components/ui/ConfirmProvider";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";
import Drawer from "../components/ui/Drawer";
import Modal from "../components/ui/Modal";
import { VisibilityToggle, VisibilityBadge, VisibilityPicker } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";
import { useContent } from "../context/ContentContext";
import { useTabParam } from "../lib/useTabParam";

const typeTone: Record<string, BadgeTone> = {
  قرارداد: "warning",
  آموزشی: "success",
  "صورت‌جلسه": "neutral",
  گزارش: "brand",
};

const jalaliToday = "۱۴۰۵/۰۴/۰۷";

export default function Knowledge() {
  const [tab, setTab] = useTabParam<"bank" | "rnd" | "registry">("bank", ["bank", "rnd", "registry"]);
  return (
    <div>
      <PageHeader
        title="مدیریت دانش"
        description="بانک اسناد سازمانی، سندهای فرصت‌های تحقیق و توسعه و شناسنامه‌های محصولات، واحدها و فناوران"
        icon={<BookOpen size={18} />}
      />
      <Tabs
        tabs={[
          { id: "bank", label: "بانک دانش", count: allDocsForCategories.length },
          { id: "rnd", label: "سندهای فرصت‌های تحقیق و توسعه", count: rndOpportunityDocs.length },
          { id: "registry", label: "شناسنامه‌ها", count: supportedProducts.length + supportedVentures.length + partnerTechnologists.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "bank" && <KnowledgeBankTab />}
      {tab === "rnd" && <RndDocsTab />}
      {tab === "registry" && <RegistryTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// شناسنامه‌های تجمیعی: محصولات حمایت‌شده، واحدهای دانش‌بنیان، فناوران همکار
// ---------------------------------------------------------------------------
function RegistryTab() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-2">شناسنامه محصولات و فناوری‌های حمایت‌شده</h3>
        <div className="card divide-y divide-ink-100">
          {supportedProducts.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-900">{p.name}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{p.company}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="navy">TRL {p.trl.toLocaleString("fa-IR")}</Badge>
                <Badge tone={p.trl >= 8 ? "success" : "brand"}>{p.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-2">شناسنامه واحدهای دانش‌بنیان حمایت‌شده</h3>
        <div className="card divide-y divide-ink-100">
          {supportedVentures.map((v) => (
            <div key={v.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-900">{v.name}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{v.field} · سال حمایت: {v.year}</p>
              </div>
              <Badge tone={v.supportType === "بذرمایه" ? "warning" : v.supportType === "سرمایه خطرپذیر" ? "navy" : "brand"}>{v.supportType}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-2">شناسنامه فناوران همکار</h3>
        <div className="card divide-y divide-ink-100">
          {partnerTechnologists.map((t) => (
            <div key={t.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-900">{t.name}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{t.expertise} · {t.projects.toLocaleString("fa-IR")} پروژه مشترک</p>
              </div>
              <Badge tone="success">امتیاز همکاری {t.rating.toLocaleString("fa-IR")}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// سندهای فرصت‌های R&D — یک سند به ازای هر شرکت بنیادی، با ماشین وضعیت تدوین
// ---------------------------------------------------------------------------
function RndDocsTab() {
  const delivered = rndOpportunityDocs.filter((d) => d.progress === 100).length;
  return (
    <div>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <Lightbulb size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          برای هر شرکت بنیادی، «سند فرصت‌های تحقیق و توسعه» تدوین می‌شود: بازدید و احصاء عناوین ← تدوین ←
          اصلاحات تیم راهبر ← پیش‌نویس نهایی ← تایید و تحویل. خروجی این سندها ورودی فراخوان‌های
          نیازهای فناورانه و RFPهاست ({delivered.toLocaleString("fa-IR")} سند از {rndOpportunityDocs.length.toLocaleString("fa-IR")} سند تحویل شده است).
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap text-[11px] text-ink-500">
        {rndDocStates.map((s) => (
          <span key={s.threshold} className="flex items-center gap-1 bg-ink-50 border border-ink-100 rounded-md px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> {s.threshold.toLocaleString("fa-IR")}٪ = {s.label}
          </span>
        ))}
      </div>

      <div className="card divide-y divide-ink-100">
        <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_1fr_180px_auto] gap-4 px-4 py-2 bg-ink-50 text-[11px] font-semibold text-ink-400 uppercase tracking-wide">
          <span>شرکت بنیادی</span>
          <span className="hidden sm:block">هلدینگ</span>
          <span>پیشرفت تدوین</span>
          <span className="text-center">وضعیت</span>
        </div>
        {rndOpportunityDocs.map((d) => (
          <div key={d.id} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_1fr_180px_auto] gap-4 items-center px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium text-sm text-ink-900 truncate">{d.company}</p>
              {d.obstacles && <p className="text-[11px] text-amber-700 mt-0.5">مانع: {d.obstacles}</p>}
            </div>
            <span className="text-xs text-ink-400 hidden sm:block">{d.holding}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden min-w-[70px]">
                <div className={`h-full rounded-full ${d.progress === 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${d.progress}%` }} />
              </div>
              <span className="text-[11px] text-ink-500 shrink-0">{d.progress.toLocaleString("fa-IR")}٪</span>
            </div>
            <Badge tone={d.progress === 100 ? "success" : d.progress >= 65 ? "brand" : "neutral"}>{d.statusLabel}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeBankTab() {
  const { knowledgeDocs: docs, setKnowledgeDocs: setDocs } = useContent();
  const [active, setActive] = useState("همه");
  const [selected, setSelected] = useState<KnowledgeDoc | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState<Visibility>("عمومی");
  const { notify } = useToast();
  const confirm = useConfirm();

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
    const content = `${doc.title}\nدسته‌بندی: ${doc.category}\nمالک: ${doc.owner}\nآخرین بروزرسانی: ${doc.updatedAt}\n\n(این یک خروجی نمایشی از پروتوتایپ سامانه است و جای‌گزین فایل اصلی نیست.)`;
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
    {
      key: "actions",
      label: "",
      render: (d) => (
        <RowActions
          onEdit={() => setSelected(d)}
          onDelete={() =>
            confirm({
              title: `حذف سند «${d.title}»؟`,
              message: "سند حذف‌شده ۳۰ روز در سطل بازیافت نگه‌داری می‌شود.",
              onConfirm: () => {
                setDocs((prev) => prev.filter((x) => x.id !== d.id));
                notify(`سند «${d.title}» حذف شد و در سطل بازیافت ۳۰ روز نگه‌داری می‌شود.`, "info");
              },
            })
          }
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" icon={<Upload size={15} />} onClick={() => setUploadOpen(true)}>
          بارگذاری سند
        </Button>
      </div>

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
            <div className="border-t border-ink-100 pt-3">
              <p className="text-xs font-semibold text-ink-600 mb-2">پیش‌نمایش سند</p>
              <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3 space-y-1.5">
                {["مقدمه و هدف", "دامنه کاربرد", "شرح گام‌به‌گام", "نقش‌ها و مسئولیت‌ها", "پیوست‌ها"].map((t, i) => (
                  <p key={t} className="text-[12px] text-ink-600 flex items-center gap-2">
                    <span className="w-4.5 h-4.5 w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-[10.5px] font-bold flex items-center justify-center shrink-0">{(i + 1).toLocaleString("fa-IR")}</span>
                    {t}
                  </p>
                ))}
                <p className="text-[11.5px] text-ink-400 leading-6 pt-1.5 border-t border-ink-100">
                  چکیده: این سند مرجع رسمی واحدهای سازمان در موضوع خود است و تغییرات آن از طریق نسخه‌گذاری همین صفحه منتشر می‌شود.
                </p>
              </div>
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
