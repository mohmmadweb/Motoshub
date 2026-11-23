// تنظیمات برچسب‌های پرونده‌ی مشتری، فرصت فروش، اسناد مالی و نامه (قرارداد C7) — برچسب مالی جدا از بقیه
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Tabs from "../../components/ui/Tabs";
import Note from "../../components/ui/Note";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useOffice } from "../../context/OfficeContext";
import { labelNamespaceLabel, type LabelNamespace, type LabelTone } from "../types";

const tones: { id: LabelTone; label: string }[] = [
  { id: "brand", label: "فیروزه‌ای" },
  { id: "info", label: "آبی" },
  { id: "success", label: "سبز" },
  { id: "warning", label: "زرد" },
  { id: "danger", label: "قرمز" },
  { id: "neutral", label: "خاکستری" },
];

const usageOf = (o: ReturnType<typeof useOffice>, ns: LabelNamespace, title: string) => {
  const s = o.state;
  if (ns === "crm") return s.customers.filter((c) => c.labels.includes(title)).length;
  if (ns === "sales") return s.opportunities.filter((c) => c.labels.includes(title)).length;
  if (ns === "finance") return s.financeDocs.filter((c) => c.labels.includes(title)).length;
  return s.letters.filter((c) => c.labels.includes(title)).length;
};

export default function CrmLabelsSection() {
  const o = useOffice();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [ns, setNs] = useState<LabelNamespace>("crm");
  const [title, setTitle] = useState("");
  const [tone, setTone] = useState<LabelTone>("brand");
  const canEdit = o.perms.crmManage || o.perms.financeManage;
  const list = o.labelsOf(ns);
  const add = () => {
    const r = o.saveLabel({ namespace: ns, title, tone });
    if (!r.ok) return notify(r.reason, "warning");
    setTitle("");
    notify("برچسب افزوده شد.");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="t-section text-ink-900">برچسب‌های دبیرخانه و مشتریان</h2>
        <p className="text-sm text-ink-500 leading-6 max-w-[42rem]">هر بخش فهرست برچسب جدای خود را دارد؛ برچسب‌های اسناد مالی فقط در اسناد مالی و فیلتر گزارش مالی به کار می‌روند.</p>
      </div>
      <Tabs
        tabs={(Object.keys(labelNamespaceLabel) as LabelNamespace[]).map((id) => ({ id, label: labelNamespaceLabel[id], count: o.labelsOf(id).length }))}
        active={ns}
        onChange={setNs}
        variant="pill"
        className="mb-1"
      />
      {!canEdit && <Note tone="info">برای تغییر برچسب‌ها مجوز مدیریت پرونده‌ی مشتریان لازم است.</Note>}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2">
          <input className="input-field !w-56" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان برچسب" onKeyDown={(e) => e.key === "Enter" && add()} />
          <select className="input-field !w-36" value={tone} onChange={(e) => setTone(e.target.value as LabelTone)} aria-label="رنگ">
            {tones.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <Button variant="primary" icon={<Plus size={18} />} onClick={add}>
            افزودن
          </Button>
        </div>
      )}
      <div className="card divide-y divide-[var(--color-border)]">
        {list.length === 0 && <p className="p-4 text-sm text-ink-500">برچسبی تعریف نشده.</p>}
        {list.map((l) => {
          const n = usageOf(o, ns, l.title);
          return (
            <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <Badge tone={l.tone}>{l.title}</Badge>
              <span className="flex-1 text-xs text-ink-500">{n ? `${n.toLocaleString("fa-IR")} مورد` : "بدون استفاده"}</span>
              {canEdit && (
                <>
                  <select className="input-field !h-8 !w-28 !text-[13px]" value={l.tone} onChange={(e) => o.saveLabel({ ...l, tone: e.target.value as LabelTone })} aria-label="رنگ">
                    {tones.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label="حذف برچسب"
                    onClick={() => confirm({ title: `حذف برچسب «${l.title}»؟`, message: n ? "برچسب از فهرست حذف می‌شود ولی روی موارد ثبت‌شده باقی می‌ماند." : undefined, onConfirm: () => o.removeLabel(l.id) })}
                  >
                    <Trash2 size={16} />
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
