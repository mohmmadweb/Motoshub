// تنظیمات «سری‌های شماره»ی دبیرخانه (قرارداد C7 — در settingsConfig ثبت می‌شود؛ در صفحه‌ی دبیرخانه هم باز می‌شود)
import { useState } from "react";
import { Hash, Pencil, Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Note from "../../components/ui/Note";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useOffice } from "../../context/OfficeContext";
import { formatNumber, previewNumber } from "../numbering";
import { directionLabel, type NumberSeries, type RegistrationDirection } from "../types";
import { Field, ToggleRow } from "../ui";
import { OFFICE_TODAY, toFa } from "../util";

type Draft = Omit<NumberSeries, "id" | "counter" | "reference_year"> & { id?: number };
const blank = (): Draft => ({ scope_id: "root", title: "", prefix: "", use_jalali_year: true, suffix: "", reset_yearly: true, direction: "outgoing", start_number: 1, pad: 4, active: true });

export default function NumberSeriesSection() {
  const o = useOffice();
  const { notify } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const used = (id: number) => o.state.registrations.filter((r) => r.series === id).length;
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const save = () => {
    if (!draft) return;
    const r = o.saveSeries(draft);
    if (!r.ok) return notify(r.reason, "warning");
    notify(draft.id ? "سری شماره به‌روزرسانی شد." : "سری شماره ساخته شد.");
    setDraft(null);
  };
  const editingUsed = draft?.id ? used(draft.id) > 0 : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="t-section text-ink-900">سری‌های شماره‌ی دبیرخانه</h2>
          <p className="text-sm text-ink-500 leading-6 max-w-[42rem]">شماره = پیشوند / سال جلالی / شمارنده. شمارنده فقط با ثبت موفق جلو می‌رود؛ شماره‌ها یکتا و بدون جاافتادگی‌اند و پس از ثبت حذف نمی‌شوند.</p>
        </div>
        {o.perms.seriesManage && (
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setDraft(blank())}>
            سری جدید
          </Button>
        )}
      </div>
      {!o.perms.seriesManage && <Note tone="info">برای تغییر سری‌ها مجوز «مدیریت سری‌های شماره» لازم است.</Note>}
      {o.state.series.length === 0 ? (
        <EmptyState icon={<Hash />} title="سری شماره‌ای تعریف نشده" />
      ) : (
        <div className="table-wrap overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>نوع</th>
                <th>الگو</th>
                <th>شماره‌ی بعدی</th>
                <th className="max-md:hidden">ثبت‌ها</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {o.state.series.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-ink-900">{s.title}</td>
                  <td>
                    <Badge tone={s.direction === "incoming" ? "info" : "brand"} size="sm">
                      {directionLabel[s.direction]}
                    </Badge>
                  </td>
                  <td dir="ltr" className="text-start tabular-nums">
                    {toFa(formatNumber(s, 1405, s.start_number))}
                  </td>
                  <td dir="ltr" className="text-start tabular-nums font-bold">
                    {toFa(previewNumber(s, OFFICE_TODAY))}
                  </td>
                  <td className="max-md:hidden">{toFa(used(s.id))}</td>
                  <td>{s.active ? <Badge tone="success" size="sm">فعال</Badge> : <Badge size="sm">غیرفعال</Badge>}</td>
                  <td>
                    {o.perms.seriesManage && (
                      <Button size="sm" variant="ghost" iconOnly aria-label="ویرایش" onClick={() => setDraft({ ...s })}>
                        <Pencil size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "ویرایش سری شماره" : "سری شماره‌ی جدید"}
        footer={
          <>
            <Button variant="primary" onClick={save}>
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              انصراف
            </Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <Field label="عنوان" required>
              <input className="input-field" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلاً صادره‌ی عمومی" />
            </Field>
            <Field label="نوع ثبت" hint={editingUsed ? "این سری ثبت دارد؛ نوع و شماره‌ی شروع قفل است." : undefined}>
              <select className="input-field" disabled={editingUsed} value={draft.direction} onChange={(e) => set({ direction: e.target.value as RegistrationDirection })}>
                <option value="incoming">وارده</option>
                <option value="outgoing">صادره</option>
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="پیشوند" required>
                <input className="input-field" value={draft.prefix} onChange={(e) => set({ prefix: e.target.value })} placeholder="ص" />
              </Field>
              <Field label="شماره‌ی شروع">
                <input className="input-field" type="number" min={1} disabled={editingUsed} value={draft.start_number} onChange={(e) => set({ start_number: Math.max(1, Number(e.target.value) || 1) })} dir="ltr" />
              </Field>
              <Field label="پسوند">
                <input className="input-field" value={draft.suffix} onChange={(e) => set({ suffix: e.target.value })} />
              </Field>
            </div>
            <div className="flex flex-col gap-2">
              <ToggleRow checked={draft.use_jalali_year} onChange={(v) => set({ use_jalali_year: v })} label="سال جلالی در شماره" />
              <ToggleRow checked={draft.reset_yearly} onChange={(v) => set({ reset_yearly: v })} label="شروع دوباره‌ی شمارنده در سال جدید" />
              <ToggleRow checked={draft.active} onChange={(v) => set({ active: v })} label="فعال" />
            </div>
            <Note tone="info">
              نمونه‌ی شماره: <b dir="ltr">{toFa(formatNumber(draft, 1405, draft.start_number))}</b>
            </Note>
          </div>
        )}
      </Modal>
    </div>
  );
}
