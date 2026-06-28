import { useState } from "react";
import { FileSignature, Plus, Paperclip } from "lucide-react";
import { contracts as initialContracts, currentUser, type ContractRecord } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

const stageTone: Record<ContractRecord["stage"], BadgeTone> = {
  مذاکره: "warning",
  فراخوان: "neutral",
  داوری: "brand",
  "در حال اجرا": "success",
  "تسویه‌شده": "neutral",
};

export default function Contracts() {
  const [contracts, setContracts] = useState<ContractRecord[]>(initialContracts);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim() || !vendor.trim()) {
      notify("عنوان قرارداد و نام تامین‌کننده الزامی است.", "warning");
      return;
    }
    const newItem: ContractRecord = {
      id: `ct-${Date.now()}`,
      title: title.trim(),
      vendor: vendor.trim(),
      stage: "مذاکره",
      value: value.trim() || "—",
      deadline: deadline.trim() || "نامشخص",
      owner: currentUser.name,
    };
    setContracts((prev) => [newItem, ...prev]);
    notify(`قرارداد «${newItem.title}» ثبت شد و در وضعیت «مذاکره» قرار گرفت.`);
    setOpen(false);
    setTitle("");
    setVendor("");
    setValue("");
    setDeadline("");
  };

  const columns: Column<ContractRecord>[] = [
    { key: "title", label: "عنوان قرارداد", render: (c) => <span className="font-medium text-ink-900">{c.title}</span> },
    { key: "vendor", label: "تامین‌کننده/فناور" },
    { key: "stage", label: "وضعیت", render: (c) => <Badge tone={stageTone[c.stage]}>{c.stage}</Badge> },
    { key: "value", label: "ارزش قرارداد" },
    { key: "deadline", label: "سرآمد تعهدات" },
    { key: "owner", label: "مسئول" },
    { key: "docs", label: "اسناد", render: () => <span className="flex items-center gap-1 text-ink-400"><Paperclip size={13} /> ۲ سند</span> },
  ];

  return (
    <div>
      <PageHeader
        title="مدیریت قراردادهای فناورانه"
        description="ثبت قرارداد، وضعیت مذاکره/فراخوان، داوری و انتخاب فناوران، زمان‌بندی تعهدات و پرداخت‌ها"
        icon={<FileSignature size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            ثبت قرارداد جدید
          </Button>
        }
      />
      <DataTable columns={columns} rows={contracts} searchKeys={["title", "vendor"]} searchPlaceholder="جستجو در عنوان یا تامین‌کننده…" />

      <Modal open={open} onClose={() => setOpen(false)} title="ثبت قرارداد فناورانه جدید" description="قرارداد ثبت‌شده ابتدا در وضعیت «مذاکره» قرار می‌گیرد.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان قرارداد</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: توسعه و استقرار سامانه مانیتورینگ ناوگان" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">تامین‌کننده / فناور</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="مثلاً: شرکت دانش‌بنیان رایان‌فناوران" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">ارزش قرارداد</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="۱٬۲۰۰٬۰۰۰٬۰۰۰ تومان" className="input-field" />
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
    </div>
  );
}
