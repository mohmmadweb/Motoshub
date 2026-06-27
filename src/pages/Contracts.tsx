import { FileSignature, Plus, Paperclip } from "lucide-react";
import { contracts, type ContractRecord } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";

const stageTone: Record<ContractRecord["stage"], BadgeTone> = {
  مذاکره: "warning",
  فراخوان: "neutral",
  داوری: "brand",
  "در حال اجرا": "success",
  "تسویه‌شده": "neutral",
};

export default function Contracts() {
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
          <Button variant="primary" icon={<Plus size={15} />}>
            ثبت قرارداد جدید
          </Button>
        }
      />
      <DataTable columns={columns} rows={contracts} searchKeys={["title", "vendor"]} searchPlaceholder="جستجو در عنوان یا تامین‌کننده…" />
    </div>
  );
}
