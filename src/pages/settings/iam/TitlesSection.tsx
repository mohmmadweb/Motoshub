// «اعضا ← سِمت‌ها» (میزیتو: تعریف عناوین سِمت‌های سازمانی) — فهرست مدیریت‌شده‌ی سِمت‌ها که
// هنگام افزودن عضویت و در کشوی عضو انتخاب می‌شود. «پیشنهادی»: `iam/tenant/position-titles/`.
import { useState } from "react";
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Toggle from "../../../components/ui/Toggle";
import EmptyState from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useTenancy } from "../../../context/TenancyContext";
import { titlesStore, usePositionTitles, type PositionTitle } from "../../../iam/titles";
import { Callout, SectionHead, fmtN } from "./shared";

export function TitlesSection() {
  const t = useTenancy();
  const titles = usePositionTitles();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const can = t.hasPermission("iam.members.manage") && !t.readOnly;
  const usage = (n: string) => t.iam.memberships.filter((m) => m.title === n).length;

  const save = (next: PositionTitle[], summary: string, before: unknown, after: unknown) => {
    titlesStore.set(next);
    t.recordAudit({ event: "titles.updated", targetType: "review", targetId: "position-titles", summary, before: { title: before }, after: { title: after } });
  };
  const add = () => {
    const n = name.trim();
    if (!n) return;
    if (titles.some((x) => x.name === n)) return notify("این سِمت از قبل در فهرست هست.", "warning");
    save([...titles, { id: `pt${Date.now().toString(36)}`, name: n, active: true }], `سِمت «${n}» به فهرست اضافه شد.`, null, n);
    setName("");
    notify("سِمت اضافه شد.", "success");
  };
  const rename = () => {
    if (!editing) return;
    const n = editing.name.trim();
    const old = titles.find((x) => x.id === editing.id);
    if (!old || !n || n === old.name) return setEditing(null);
    if (titles.some((x) => x.name === n)) return notify("این نام تکراری است.", "warning");
    save(titles.map((x) => (x.id === editing.id ? { ...x, name: n } : x)), `سِمت «${old.name}» به «${n}» تغییر نام یافت (عضویت‌های فعلی نام قبلی را نگه می‌دارند تا مدیر به‌روزشان کند).`, old.name, n);
    setEditing(null);
  };
  const remove = (x: PositionTitle) =>
    confirm({
      title: `حذف سِمت «${x.name}»؟`,
      message: usage(x.name) ? `${fmtN(usage(x.name))} عضویت این سِمت را دارند؛ سِمتشان حذف نمی‌شود ولی دیگر در فهرست انتخاب نمی‌آید.` : "این سِمت از فهرست انتخاب حذف می‌شود.",
      onConfirm: () => save(titles.filter((y) => y.id !== x.id), `سِمت «${x.name}» از فهرست حذف شد.`, x.name, null),
    });

  return (
    <div className="space-y-4">
      <SectionHead icon={<BadgeCheck size={18} />} title="سِمت‌های سازمانی" description="فهرست عنوان‌های مجاز سِمت؛ مدیران اعضا هنگام افزودن عضویت یا در کشوی هر عضو از همین فهرست انتخاب می‌کنند." />
      <Callout tone="neutral">سِمت در بک‌اند فعلی فیلد ندارد («پیشنهادی»: جدول position-titles و فیلد title_id روی عضویت). سطح دسترسی اسناد دانش هم می‌تواند بر اساس سِمت تعریف شود.</Callout>
      {can && (
        <div className="card p-4 flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[14rem]">
            <span className="text-[12.5px] text-ink-600">سِمت جدید</span>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="مثلاً: کارشناس ارشد مالی" maxLength={60} />
          </label>
          <Button variant="primary" icon={<Plus size={16} />} onClick={add} disabled={!name.trim()}>
            افزودن
          </Button>
        </div>
      )}
      <div className="card overflow-hidden">
        {titles.length === 0 && <EmptyState compact title="هنوز سِمتی تعریف نشده است" />}
        <ul className="divide-y divide-[var(--color-border)]">
          {titles.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
              {editing?.id === x.id ? (
                <input className="input-field flex-1" autoFocus value={editing.name} onChange={(e) => setEditing({ id: x.id, name: e.target.value })} onKeyDown={(e) => (e.key === "Enter" ? rename() : e.key === "Escape" && setEditing(null))} onBlur={rename} aria-label="نام سِمت" />
              ) : (
                <span className={`flex-1 min-w-0 text-[14px] ${x.active ? "text-ink-900" : "text-ink-400 line-through"}`}>{x.name}</span>
              )}
              <Badge tone="neutral">{fmtN(usage(x.name))} عضویت</Badge>
              {can && (
                <>
                  <Toggle on={x.active} onChange={() => save(titles.map((y) => (y.id === x.id ? { ...y, active: !y.active } : y)), `سِمت «${x.name}» ${x.active ? "غیرفعال" : "فعال"} شد.`, x.active, !x.active)} label={`فعال بودن ${x.name}`} />
                  <Button size="sm" variant="ghost" iconOnly icon={<Pencil size={15} />} aria-label={`ویرایش ${x.name}`} onClick={() => setEditing({ id: x.id, name: x.name })} />
                  <Button size="sm" variant="ghost" iconOnly icon={<Trash2 size={15} />} aria-label={`حذف ${x.name}`} onClick={() => remove(x)} />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
