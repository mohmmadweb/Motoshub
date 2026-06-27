import { PiggyBank, Plus, TrendingUp } from "lucide-react";
import { funds, type FundRecord } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";

const stageTone: Record<FundRecord["stage"], BadgeTone> = {
  "ثبت‌شده": "neutral",
  "انتخاب اولیه": "warning",
  داوری: "brand",
  "تخصیص‌یافته": "success",
  "در حال پایش": "success",
};

export default function Funds() {
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
          <Button variant="primary" icon={<Plus size={15} />}>
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
    </div>
  );
}
