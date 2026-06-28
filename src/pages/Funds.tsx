import { useState } from "react";
import { PiggyBank, Plus, TrendingUp } from "lucide-react";
import { funds as initialFunds, type FundRecord } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

const stageTone: Record<FundRecord["stage"], BadgeTone> = {
  "ثبت‌شده": "neutral",
  "انتخاب اولیه": "warning",
  داوری: "brand",
  "تخصیص‌یافته": "success",
  "در حال پایش": "success",
};

export default function Funds() {
  const [funds, setFunds] = useState<FundRecord[]>(initialFunds);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [applicant, setApplicant] = useState("");
  const [amount, setAmount] = useState("");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim() || !applicant.trim()) {
      notify("عنوان طرح و نام متقاضی الزامی است.", "warning");
      return;
    }
    const newItem: FundRecord = {
      id: `fd-${Date.now()}`,
      title: title.trim(),
      applicant: applicant.trim(),
      stage: "ثبت‌شده",
      amount: amount.trim() || "در انتظار ارزیابی",
      roi: "—",
    };
    setFunds((prev) => [newItem, ...prev]);
    notify(`طرح «${newItem.title}» ثبت شد و برای انتخاب اولیه به کارگروه ارجاع داده شد.`);
    setOpen(false);
    setTitle("");
    setApplicant("");
    setAmount("");
  };

  const columns: Column<FundRecord>[] = [
    { key: "title", label: "عنوان طرح", render: (f) => <span className="font-medium text-ink-900">{f.title}</span> },
    { key: "applicant", label: "متقاضی" },
    { key: "stage", label: "وضعیت", render: (f) => <Badge tone={stageTone[f.stage]}>{f.stage}</Badge> },
    { key: "amount", label: "میزان تخصیص" },
    { key: "roi", label: "بازگشت سرمایه", render: (f) => <span className="flex items-center gap-1 text-emerald-600 font-medium"><TrendingUp size={12} /> {f.roi}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="صندوق نوآوری و شتاب‌دهی"
        description="ثبت طرح سرمایه‌گذاری، انتخاب اولیه، داوری، تخصیص منابع و گزارش بازگشت سرمایه"
        icon={<PiggyBank size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            ثبت طرح جدید
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="طرح‌های فعال" value={funds.length} icon={<PiggyBank size={16} />} tone="brand" />
        <StatCard label="در حال پایش" value={funds.filter((f) => f.stage === "در حال پایش").length} tone="success" />
        <StatCard label="میانگین بازگشت سرمایه" value="۱۵٪" tone="warning" icon={<TrendingUp size={16} />} />
      </div>

      <DataTable columns={columns} rows={funds} searchKeys={["title", "applicant"]} searchPlaceholder="جستجو در عنوان طرح یا متقاضی…" />

      <Modal open={open} onClose={() => setOpen(false)} title="ثبت طرح سرمایه‌گذاری جدید" description="طرح ثبت‌شده ابتدا وارد فاز «انتخاب اولیه» می‌شود.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان طرح</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: سکوی اجاره‌ی کوتاه‌مدت موتورسیکلت برقی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام متقاضی / تیم</label>
            <input value={applicant} onChange={(e) => setApplicant(e.target.value)} placeholder="مثلاً: استارتاپ راهکارهای حمل‌ونقل پاک" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">میزان درخواستی (تومان)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="۲۵۰٬۰۰۰٬۰۰۰" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ثبت طرح</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
