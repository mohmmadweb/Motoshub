import { useMemo, useState } from "react";
import { FileSignature, Plus, Paperclip, CircleDollarSign, Hourglass, ShieldCheck, ListFilter, CheckCircle2, Circle, History, Landmark, PenLine, ArrowLeftRight, Clock3 } from "lucide-react";
import { contracts as initialContracts, currentUser, type ContractRecord } from "../data/mock";
import { contractDetails, type ContractDetail } from "../data/mockDetails";
import { techTransferContracts, eSignDocuments, tenders, pendingReviewItems, type TechTransferContract, type TenderRecord } from "../data/mockDaneshmand";
import Tabs from "../components/ui/Tabs";
import RowActions from "../components/ui/RowActions";
import { useConfirm } from "../components/ui/ConfirmProvider";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import { useToast } from "../components/ui/ToastProvider";
import { useTabParam } from "../lib/useTabParam";

const stageTone: Record<ContractRecord["stage"], BadgeTone> = {
  مذاکره: "warning",
  فراخوان: "neutral",
  داوری: "brand",
  "در حال اجرا": "success",
  "تسویه‌شده": "neutral",
};

const paymentTone: Record<string, BadgeTone> = {
  "پرداخت‌شده": "success",
  "در انتظار تأیید": "warning",
  آینده: "neutral",
};

const approvalTone: Record<string, BadgeTone> = {
  "تأیید شده": "success",
  "در انتظار": "warning",
  "رد شده": "danger",
};

const stages: ContractRecord["stage"][] = ["فراخوان", "مذاکره", "داوری", "در حال اجرا", "تسویه‌شده"];

export default function Contracts() {
  const [tab, setTab] = useTabParam<"tech" | "transfer" | "esign" | "tender">("tech", ["tech", "transfer", "esign", "tender"]);
  return (
    <div>
      <PageHeader
        title="مدیریت قراردادهای فناورانه"
        description="ثبت قرارداد، پورتفولیوی تبادل فناوری، گردش امضای الکترونیک و مناقصه/کمیسیون معاملات"
        icon={<FileSignature size={18} />}
      />
      <Tabs
        tabs={[
          { id: "tech", label: "قراردادهای فناورانه", count: initialContracts.length },
          { id: "transfer", label: "پورتفولیوی تبادل فناوری", count: techTransferContracts.length },
          { id: "esign", label: "گردش امضای الکترونیک", count: eSignDocuments.length },
          { id: "tender", label: "مناقصه و کمیسیون معاملات", count: tenders.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "tech" && <TechContractsTab />}
      {tab === "transfer" && <TechTransferTab />}
      {tab === "esign" && <ESignTab />}
      {tab === "tender" && <TenderTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// مناقصه، مزایده، ترک تشریفات و کمیسیون معاملات (کتاب فرآیندها، بخش ۱)
// ---------------------------------------------------------------------------
const tenderStageTone: Record<TenderRecord["stage"], BadgeTone> = {
  "انتشار آگهی": "neutral",
  "دریافت پاکات": "warning",
  "کمیسیون معاملات": "brand",
  "ابلاغ برنده": "success",
  "عقد قرارداد": "navy",
};

function TenderTab() {
  const { notify } = useToast();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500 leading-6 max-w-2xl">
          تشریفات معاملات موسسه: انتشار آگهی ← دریافت پاکات (الف: تضمین، ب: فنی، ج: قیمت) ← بازگشایی در
          کمیسیون معاملات با صورت‌جلسه ← ابلاغ برنده ← عقد قرارداد. ترک تشریفات فقط با مصوبه هیئت مدیره.
        </p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => notify("فرم آگهی مناقصه/مزایده جدید باز شد؛ پس از تایید، در روزنامه و سامانه منتشر می‌شود.", "info")}>
          آگهی جدید
        </Button>
      </div>
      <div className="card divide-y divide-ink-100">
        {tenders.map((t) => (
          <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900">{t.title}</p>
              <p className="text-[11px] text-ink-400 mt-0.5">
                {t.method} · {t.participants.toLocaleString("fa-IR")} شرکت‌کننده
                {t.sessionDate ? ` · جلسه کمیسیون: ${t.sessionDate}` : ""}
                {t.winner ? ` · برنده: ${t.winner}` : ""}
              </p>
              {t.note && <p className="text-[11px] text-amber-700 mt-0.5">{t.note}</p>}
            </div>
            <Badge tone={tenderStageTone[t.stage]}>{t.stage}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// پورتفولیوی تبادل فناوری — مطابق کاربرگ کنترل پروژه معاونت توسعه فناوری
// (سه درصد پیشرفت مجزا: فیزیکی / زمانی / مالی)
// ---------------------------------------------------------------------------
function ProgressCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[70px]">
      <div className="flex items-center justify-between text-[10px] text-ink-400 mb-0.5">
        <span>{label}</span>
        <span>{value.toLocaleString("fa-IR")}٪</span>
      </div>
      <div className="h-1 rounded-full bg-ink-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${value >= 100 ? "bg-emerald-500" : value >= 50 ? "bg-brand-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TechTransferTab() {
  const [selected, setSelected] = useState<TechTransferContract | null>(null);

  const columns: Column<TechTransferContract>[] = [
    { key: "title", label: "موضوع قرارداد", render: (c) => <span className="font-medium text-ink-900">{c.title}</span> },
    { key: "holding", label: "هلدینگ متقاضی" },
    { key: "company", label: "شرکت متقاضی" },
    { key: "mojri", label: "مجری" },
    { key: "daneshmandRole", label: "نقش بنیاد", render: (c) => <Badge tone="navy">{c.daneshmandRole}</Badge> },
    { key: "amount", label: "مبلغ" },
    {
      key: "progress",
      label: "پیشرفت (فیزیکی / زمانی / مالی)",
      render: (c) => (
        <div className="flex items-center gap-3">
          <ProgressCell value={c.physicalProgress} label="فیزیکی" />
          <ProgressCell value={c.timeProgress} label="زمانی" />
          <ProgressCell value={c.financialProgress} label="مالی" />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <ArrowLeftRight size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          قراردادهای سه‌جانبه‌ی تبادل فناوری: شرکت بنیادی (کارفرما/بهره‌بردار) + فناور (مجری) + بنیاد
          (ناظر/هماهنگ‌کننده با تعهد مالی معمولاً ۵۰٪). برای هر قرارداد سه درصد پیشرفت مجزا پایش می‌شود:
          فیزیکی، زمانی و مالی — اختلاف بین آن‌ها سیگنال هشدار است.
        </p>
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-bold text-ink-900 mb-2">طرح‌های در دست بررسی (پیش از انعقاد قرارداد)</h3>
        <div className="card divide-y divide-ink-100">
          {pendingReviewItems.map((pv) => (
            <div key={pv.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-900">{pv.topic}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">
                  {pv.holding} · {pv.company}{pv.mojri ? ` · مجری: ${pv.mojri}` : ""}{pv.note ? ` · ${pv.note}` : ""}
                </p>
              </div>
              {pv.obstacles ? <Badge tone="warning">{pv.obstacles}</Badge> : <Badge tone="neutral">در بررسی</Badge>}
            </div>
          ))}
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={techTransferContracts}
        searchKeys={["title", "holding", "company", "mojri"]}
        searchPlaceholder="جستجو در موضوع، هلدینگ، شرکت یا مجری…"
        onRowClick={(c) => setSelected(c)}
      />
      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="پرونده قرارداد تبادل فناوری">
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone="neutral">{selected.type}</Badge>
                <Badge tone="navy">نقش بنیاد: {selected.daneshmandRole}</Badge>
              </div>
            </div>
            <div className="text-xs text-ink-600 space-y-1.5">
              <p><span className="text-ink-400">هلدینگ متقاضی:</span> {selected.holding} · <span className="text-ink-400">شرکت:</span> {selected.company} ({selected.companyRole})</p>
              <p><span className="text-ink-400">مجری پروژه:</span> {selected.mojri}</p>
              <p><span className="text-ink-400">ناظر فنی:</span> {selected.nazer} · <span className="text-ink-400">محل اجرا:</span> {selected.city}</p>
              <p><span className="text-ink-400">مبلغ قرارداد:</span> {selected.amount} · <span className="text-ink-400">تعهد بنیاد:</span> {selected.commitment}</p>
              <p><span className="text-ink-400">نوع ضمانت:</span> {selected.guarantee}</p>
            </div>
            <div className="border-t border-ink-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-ink-900">سه شاخص پیشرفت</h4>
              {[
                ["پیشرفت فیزیکی", selected.physicalProgress],
                ["پیشرفت زمانی", selected.timeProgress],
                ["پیشرفت مالی", selected.financialProgress],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-700">{label}</span>
                    <span className="text-ink-500">{(value as number).toLocaleString("fa-IR")}٪</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(value as number, 100)}%` }} />
                  </div>
                </div>
              ))}
              {selected.physicalProgress + 10 < selected.timeProgress && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  هشدار: پیشرفت فیزیکی بیش از ۱۰ واحد از پیشرفت زمانی عقب است — نیازمند بررسی ناظر فنی.
                </p>
              )}
            </div>
            {selected.note && (
              <div className="border-t border-ink-100 pt-3">
                <h4 className="text-xs font-bold text-ink-900 mb-1">موانع و توضیحات</h4>
                <p className="text-xs text-ink-500 leading-6">{selected.note}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// گردش امضای الکترونیک — زنجیره امضا: مجری ← راهبر/ناظر ← صاحبین امضای موسسه
// ---------------------------------------------------------------------------
function ESignTab() {
  return (
    <div className="space-y-4">
      <div className="card p-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <PenLine size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          قراردادها و متمم‌ها به‌صورت غیرحضوری برای امضای الکترونیکی ارسال می‌شوند (اتصال به سرویس امضای
          دیجیتال از طریق API). پس از تکمیل زنجیره امضا، شماره نامه به‌صورت خودکار تخصیص می‌یابد و نسخه‌ها
          برای راهبر و مجری ارسال می‌شود.
        </p>
      </div>
      {eSignDocuments.map((doc) => {
        const done = doc.steps.filter((s) => s.status === "امضا شد").length;
        return (
          <div key={doc.id} className="card p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <p className="text-sm font-bold text-ink-900">{doc.title}</p>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{doc.kind}</Badge>
                {doc.letterNo ? (
                  <Badge tone="success">تکمیل — شماره نامه {doc.letterNo}</Badge>
                ) : (
                  <Badge tone="warning">{done.toLocaleString("fa-IR")} از {doc.steps.length.toLocaleString("fa-IR")} امضا</Badge>
                )}
              </div>
            </div>
            <p className="text-[11px] text-ink-400 mb-3">مرتبط با: {doc.relatedTo} · {doc.method}</p>
            <div className="flex items-stretch gap-1.5 overflow-x-auto">
              {doc.steps.map((s, i) => (
                <div
                  key={i}
                  className={`flex-1 min-w-[130px] rounded-lg border p-2.5 ${
                    s.status === "امضا شد"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : s.status === "در انتظار امضا"
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-ink-100 bg-ink-50/40"
                  }`}
                >
                  <p className="text-[10.5px] text-ink-400 mb-0.5">مرحله {(i + 1).toLocaleString("fa-IR")} — {s.role}</p>
                  <p className="text-[12px] font-medium text-ink-900">{s.name}</p>
                  <p className={`text-[11px] mt-1 flex items-center gap-1 ${s.status === "امضا شد" ? "text-emerald-700" : s.status === "در انتظار امضا" ? "text-amber-700" : "text-ink-400"}`}>
                    {s.status === "امضا شد" ? <CheckCircle2 size={11} /> : <Clock3 size={11} />}
                    {s.status}{s.date ? ` · ${s.date}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TechContractsTab() {
  const [contracts, setContracts] = useState<ContractRecord[]>(initialContracts);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contractType, setContractType] = useState<ContractDetail["type"]>("فناورانه");
  const [method, setMethod] = useState<ContractDetail["method"]>("فراخوان عمومی");
  const [stageFilter, setStageFilter] = useState<"همه" | ContractRecord["stage"]>("همه");
  const [selected, setSelected] = useState<ContractRecord | null>(null);
  const [obligationState, setObligationState] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: boolean; vendor?: boolean }>({});
  const { notify } = useToast();
  const confirm = useConfirm();

  const selectedDetail = selected ? contractDetails[selected.id] : undefined;

  const submit = () => {
    const errs = { title: !title.trim(), vendor: !vendor.trim() };
    setErrors(errs);
    if (errs.title || errs.vendor) return;
    if (editingId) {
      setContracts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, title: title.trim(), vendor: vendor.trim(), value: value.trim() || "—", deadline: deadline.trim() || "نامشخص" } : c))
      );
      notify(`قرارداد «${title.trim()}» ویرایش شد.`);
    } else {
      const newItem: ContractRecord = {
        id: `ct-${Date.now()}`,
        title: title.trim(),
        vendor: vendor.trim(),
        stage: method === "فراخوان عمومی" ? "فراخوان" : "مذاکره",
        value: value.trim() || "—",
        deadline: deadline.trim() || "نامشخص",
        owner: currentUser.name,
      };
      setContracts((prev) => [newItem, ...prev]);
      notify(`قرارداد «${newItem.title}» (${contractType} — ${method}) ثبت شد و در وضعیت «${newItem.stage}» قرار گرفت.`);
    }
    setOpen(false);
    setEditingId(null);
    setTitle("");
    setVendor("");
    setValue("");
    setDeadline("");
  };

  const filtered = useMemo(
    () => (stageFilter === "همه" ? contracts : contracts.filter((c) => c.stage === stageFilter)),
    [contracts, stageFilter]
  );

  const active = contracts.filter((c) => c.stage === "در حال اجرا").length;
  const inReview = contracts.filter((c) => c.stage === "داوری" || c.stage === "مذاکره").length;

  const isObligationDone = (id: string, fallback: boolean) => obligationState[id] ?? fallback;

  const toggleObligation = (id: string, fallback: boolean) => {
    const next = !isObligationDone(id, fallback);
    setObligationState((prev) => ({ ...prev, [id]: next }));
    notify(next ? "تعهد به‌عنوان انجام‌شده علامت خورد." : "تعهد به وضعیت باز برگشت.", "info");
  };

  const columns: Column<ContractRecord>[] = [
    { key: "title", label: "عنوان قرارداد", render: (c) => <span className="font-medium text-ink-900">{c.title}</span> },
    { key: "vendor", label: "تامین‌کننده/فناور" },
    { key: "stage", label: "وضعیت", render: (c) => <Badge tone={stageTone[c.stage]}>{c.stage}</Badge> },
    { key: "value", label: "ارزش قرارداد" },
    { key: "deadline", label: "سرآمد تعهدات" },
    { key: "owner", label: "مسئول" },
    {
      key: "docs",
      label: "اسناد",
      render: (c) => (
        <span className="flex items-center gap-1 text-ink-400">
          <Paperclip size={13} /> {(contractDetails[c.id] ? contractDetails[c.id].payments.length + contractDetails[c.id].obligations.length : 2).toLocaleString("fa-IR")} سند
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (c) => (
        <RowActions
          onEdit={() => startEdit(c)}
          onDelete={() =>
            confirm({
              title: `حذف قرارداد «${c.title}»؟`,
              message: "پرونده قرارداد و تاریخچه‌ی آن بایگانی می‌شود.",
              onConfirm: () => {
                setContracts((prev) => prev.filter((x) => x.id !== c.id));
                notify(`قرارداد «${c.title}» حذف شد.`, "info");
              },
            })
          }
        />
      ),
    },
  ];

  const startEdit = (c: ContractRecord) => {
    setEditingId(c.id);
    setTitle(c.title);
    setVendor(c.vendor);
    setValue(c.value);
    setDeadline(c.deadline);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
          ثبت قرارداد جدید
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="کل قراردادها" value={contracts.length.toLocaleString("fa-IR")} tone="brand" icon={<FileSignature size={16} />} />
        <StatCard label="در حال اجرا" value={active.toLocaleString("fa-IR")} tone="success" icon={<CircleDollarSign size={16} />} />
        <StatCard label="در مذاکره / داوری" value={inReview.toLocaleString("fa-IR")} tone="warning" icon={<Hourglass size={16} />} />
        <StatCard label="دارای ضمانت‌نامه معتبر" value={Object.values(contractDetails).filter((d) => d.guarantee !== "—").length.toLocaleString("fa-IR")} icon={<ShieldCheck size={16} />} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ListFilter size={14} className="text-ink-400" />
        <button
          onClick={() => setStageFilter("همه")}
          className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
            stageFilter === "همه" ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
          }`}
        >
          همه ({contracts.length})
        </button>
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              stageFilter === s ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {s} ({contracts.filter((c) => c.stage === s).length})
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={["title", "vendor"]}
        searchPlaceholder="جستجو در عنوان یا تامین‌کننده…"
        onRowClick={(c) => setSelected(c)}
      />

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
        }}
        title={editingId ? "ویرایش قرارداد" : "ثبت قرارداد فناورانه جدید"}
        description={editingId ? "تغییرات پس از ذخیره در پرونده قرارداد ثبت می‌شود." : "بر اساس روش انتخاب، قرارداد در وضعیت «فراخوان» یا «مذاکره» قرار می‌گیرد."}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان قرارداد <span className="text-rose-500">*</span></label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: false })); }} placeholder="مثلاً: توسعه و استقرار سامانه مانیتورینگ ناوگان" className={`input-field ${errors.title ? "input-error" : ""}`} />
            {errors.title && <p className="field-error">عنوان قرارداد الزامی است.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">تامین‌کننده / فناور <span className="text-rose-500">*</span></label>
            <input value={vendor} onChange={(e) => { setVendor(e.target.value); setErrors((p) => ({ ...p, vendor: false })); }} placeholder="مثلاً: شرکت دانش‌بنیان رایان‌فناوران" className={`input-field ${errors.vendor ? "input-error" : ""}`} />
            {errors.vendor && <p className="field-error">نام تامین‌کننده الزامی است.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">نوع قرارداد</label>
              <select value={contractType} onChange={(e) => setContractType(e.target.value as ContractDetail["type"])} className="input-field">
                <option value="فناورانه">فناورانه</option>
                <option value="پژوهشی">پژوهشی</option>
                <option value="عمرانی">عمرانی</option>
                <option value="خدماتی">خدماتی</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">روش انتخاب</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as ContractDetail["method"])} className="input-field">
                <option value="فراخوان عمومی">فراخوان عمومی</option>
                <option value="استعلام محدود">استعلام محدود</option>
                <option value="ترک تشریفات">ترک تشریفات</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">ارزش قرارداد</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="۱٬۲۰۰٬۰۰۰٬۰۰۰ ریال" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">سرآمد تعهدات</label>
              <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="۱۴۰۵/۰۹/۰۱" className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ثبت قرارداد</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="پرونده قرارداد">
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone={stageTone[selected.stage]}>{selected.stage}</Badge>
                {selectedDetail && <Badge tone="navy">{selectedDetail.type}</Badge>}
                {selectedDetail && <Badge tone="neutral">{selectedDetail.method}</Badge>}
              </div>
              <div className="text-xs text-ink-600 space-y-1.5 mt-3">
                <p><span className="text-ink-400">طرف قرارداد:</span> {selected.vendor}</p>
                <p><span className="text-ink-400">ارزش:</span> {selected.value}</p>
                <p><span className="text-ink-400">سرآمد تعهدات:</span> {selected.deadline}</p>
                <p><span className="text-ink-400">مسئول پیگیری:</span> {selected.owner}</p>
                {selectedDetail && (
                  <p className="flex items-start gap-1">
                    <Landmark size={13} className="text-ink-400 mt-0.5 shrink-0" />
                    <span>{selectedDetail.guarantee}</span>
                  </p>
                )}
              </div>
            </div>

            {selectedDetail ? (
              <>
                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">زمان‌بندی پرداخت‌ها</h4>
                  {selectedDetail.payments.length === 0 && <p className="text-xs text-ink-400">پرداختی تعریف نشده است.</p>}
                  <div className="space-y-2">
                    {selectedDetail.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-ink-50 rounded-lg p-2.5">
                        <div className="min-w-0">
                          <p className="font-medium text-ink-800 truncate">{p.title}</p>
                          <p className="text-ink-400 mt-0.5">{p.amount} · سررسید {p.due}</p>
                        </div>
                        <Badge tone={paymentTone[p.status]}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">تعهدات و اقلام قابل تحویل</h4>
                  <div className="space-y-1.5">
                    {selectedDetail.obligations.map((o) => {
                      const done = isObligationDone(o.id + selected.id, o.done);
                      return (
                        <button
                          key={o.id}
                          onClick={() => toggleObligation(o.id + selected.id, o.done)}
                          className="w-full flex items-center gap-2 text-right text-xs p-2 rounded-lg hover:bg-ink-50"
                        >
                          {done ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <Circle size={15} className="text-ink-300 shrink-0" />}
                          <span className={`flex-1 ${done ? "line-through text-ink-400" : "text-ink-800"}`}>{o.title}</span>
                          <span className="text-ink-400 shrink-0">{o.due}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">زنجیره تأیید</h4>
                  <div className="space-y-2">
                    {selectedDetail.approvals.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-medium text-ink-800">{a.role}</p>
                          <p className="text-ink-400 mt-0.5">{a.name}{a.date ? ` · ${a.date}` : ""}</p>
                        </div>
                        <Badge tone={approvalTone[a.status]}>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5">
                    <History size={13} /> تاریخچه قرارداد
                  </h4>
                  <div className="space-y-0">
                    {selectedDetail.history.map((h, i) => (
                      <div key={h.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                          {i < selectedDetail.history.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-xs text-ink-800">{h.text}</p>
                          <p className="text-[11px] text-ink-400 mt-0.5">{h.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-400 border-t border-ink-100 pt-4">
                جزئیات تکمیلی (پرداخت‌ها، تعهدات و زنجیره تأیید) پس از تکمیل پرونده توسط امور قراردادها نمایش داده می‌شود.
              </p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
