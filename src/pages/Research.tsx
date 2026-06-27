import { FlaskConical, Plus, Users } from "lucide-react";
import { researchOpportunities, type ResearchOpportunity } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";

const stageTone: Record<ResearchOpportunity["stage"], BadgeTone> = {
  "فراخوان باز": "success",
  "بررسی درخواست‌ها": "warning",
  داوری: "brand",
  "در حال اجرا": "navy",
  "پایان‌یافته": "neutral",
};

export default function Research() {
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
          <Button variant="primary" icon={<Plus size={15} />}>
            فراخوان جدید
          </Button>
        }
      />
      <DataTable columns={columns} rows={researchOpportunities} searchKeys={["title", "field"]} searchPlaceholder="جستجو در عنوان یا حوزه‌ی پژوهش…" />
    </div>
  );
}
