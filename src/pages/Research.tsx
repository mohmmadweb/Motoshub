import { useState } from "react";
import { FlaskConical, Plus, Users } from "lucide-react";
import { researchOpportunities as initialOpportunities, type ResearchOpportunity } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

const stageTone: Record<ResearchOpportunity["stage"], BadgeTone> = {
  "فراخوان باز": "success",
  "بررسی درخواست‌ها": "warning",
  داوری: "brand",
  "در حال اجرا": "navy",
  "پایان‌یافته": "neutral",
};

export default function Research() {
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>(initialOpportunities);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [field, setField] = useState("");
  const [deadline, setDeadline] = useState("");
  const { notify } = useToast();

  const submit = () => {
    if (!title.trim() || !field.trim()) {
      notify("عنوان و حوزه‌ی پژوهش الزامی است.", "warning");
      return;
    }
    const newItem: ResearchOpportunity = {
      id: `rs-${Date.now()}`,
      title: title.trim(),
      field: field.trim(),
      stage: "فراخوان باز",
      applicants: 0,
      deadline: deadline.trim() || "نامشخص",
    };
    setOpportunities((prev) => [newItem, ...prev]);
    notify(`فراخوان پژوهشی «${newItem.title}» منتشر شد و در وضعیت «فراخوان باز» قرار گرفت.`);
    setOpen(false);
    setTitle("");
    setField("");
    setDeadline("");
  };

  const columns: Column<ResearchOpportunity>[] = [
    { key: "title", label: "عنوان فرصت پژوهشی", render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
    { key: "field", label: "حوزه" },
    { key: "stage", label: "وضعیت", render: (r) => <Badge tone={stageTone[r.stage]}>{r.stage}</Badge> },
    { key: "applicants", label: "متقاضیان", render: (r) => <span className="flex items-center gap-1"><Users size={12} /> {r.applicants}</span> },
    { key: "deadline", label: "مهلت ثبت‌نام" },
  ];

  return (
    <div>
      <PageHeader
        title="مدیریت فرصت‌های پژوهشی"
        description="ثبت فراخوان، بررسی درخواست‌ها، داوری و پیگیری اجرای پژوهش"
        icon={<FlaskConical size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            فراخوان جدید
          </Button>
        }
      />
      <DataTable columns={columns} rows={opportunities} searchKeys={["title", "field"]} searchPlaceholder="جستجو در عنوان یا حوزه‌ی پژوهش…" />

      <Modal open={open} onClose={() => setOpen(false)} title="انتشار فراخوان پژوهشی جدید" description="پس از انتشار، فراخوان در وضعیت «فراخوان باز» قابل مشاهده برای پژوهشگران خواهد بود.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان فرصت پژوهشی</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: توسعه مدل‌های پیش‌بینی نگهداری موتورسیکلت‌های برقی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">حوزه‌ی پژوهش</label>
            <input value={field} onChange={(e) => setField(e.target.value)} placeholder="مثلاً: هوش مصنوعی و یادگیری ماشین" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">مهلت ثبت‌نام</label>
            <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="۱۴۰۵/۰۷/۱۵" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار فراخوان</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
