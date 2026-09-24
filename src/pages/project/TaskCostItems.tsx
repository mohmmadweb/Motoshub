import { useState } from "react";
import { Plus, Receipt, Save, X } from "lucide-react";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa, fmtRial } from "../../pm/jalali";
import type { ExpenseStatus, PMExpense, PMTask } from "../../pm/types";
import { numIn, useProjectPage } from "./shared";

const statuses: ExpenseStatus[] = ["برنامه‌ریزی‌شده", "در انتظار تأیید", "تأییدشده", "پرداخت‌شده"];
const tone: Record<ExpenseStatus, string> = {
  "برنامه‌ریزی‌شده": "bg-ink-100 text-ink-600",
  "در انتظار تأیید": "bg-amber-50 text-amber-700",
  "تأییدشده": "bg-brand-50 text-brand-700",
  "پرداخت‌شده": "bg-emerald-50 text-emerald-700",
};

type Draft = { id?: string; title: string; category: string; amount: string; status: ExpenseStatus; date: string };

/**
 * ریز هزینه‌های یک تسک — هر ردیف یک «هزینه» با task_id همین تسک است،
 * بنابراین در تب مالی، گزارش‌ها، آستانه‌ی بودجه و کنترل هزینه‌ی تسک هم حساب می‌شود.
 */
export default function TaskCostItems({ t }: { t: PMTask }) {
  const { p, pid, can, refDate } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canExp = can("projects.expenses");
  const canApprove = can("projects.expenses.approve");
  const items = p.expenses.filter((e) => e.taskId === t.id);
  const categories = [...new Set([...p.budget.lines.map((l) => l.category), ...p.expenses.map((e) => e.category)])];
  const [draft, setDraft] = useState<Draft | null>(null);

  const total = items.reduce((s, e) => s + e.amount, 0);
  const planned = items.filter((e) => e.status === "برنامه‌ریزی‌شده" || e.status === "در انتظار تأیید").reduce((s, e) => s + e.amount, 0);

  const blank = (): Draft => ({ title: "", category: categories[0] ?? "سایر", amount: "", status: "در انتظار تأیید", date: refDate });
  const edit = (e: PMExpense): Draft => ({ id: e.id, title: e.title, category: e.category, amount: e.amount.toLocaleString("fa-IR"), status: e.status, date: e.date });

  const save = () => {
    if (!draft) return;
    const amount = numIn(draft.amount);
    if (!draft.title.trim() || !amount) return notify("شرح و مبلغ ریز هزینه الزامی است.", "warning");
    const prev = draft.id ? p.expenses.find((e) => e.id === draft.id) : undefined;
    pm.saveExpense(pid, { id: draft.id, title: draft.title.trim(), category: draft.category || "سایر", amount, date: draft.date, status: draft.status, taskId: t.id, description: prev?.description, receipt: prev?.receipt });
    notify(draft.id ? "ریز هزینه ویرایش شد." : "ریز هزینه به تسک اضافه شد.");
    setDraft(null);
  };

  const form = draft && (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_140px_150px_auto] gap-2 items-center bg-ink-50 rounded-lg p-2">
      <input className="input-field !py-1.5 !text-xs" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="شرح، مثلاً: خرید چرخ خیاطی" autoFocus />
      <input className="input-field !py-1.5 !text-xs" list="task-cost-cats" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="سرفصل" />
      <input className="input-field !py-1.5 !text-xs" inputMode="numeric" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} onBlur={() => setDraft({ ...draft, amount: numIn(draft.amount) ? numIn(draft.amount).toLocaleString("fa-IR") : "" })} placeholder="مبلغ (ریال)" />
      <select className="input-field !py-1.5 !text-xs" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ExpenseStatus })}>
        {statuses.map((s) => (
          <option key={s} disabled={!canApprove && (s === "تأییدشده" || s === "پرداخت‌شده")}>
            {s}
          </option>
        ))}
      </select>
      <span className="flex gap-1">
        <Button size="sm" variant="primary" icon={<Save size={12} />} onClick={save}>
          ذخیره
        </Button>
        <button onClick={() => setDraft(null)} className="p-1.5 text-ink-400 hover:text-ink-700" aria-label="انصراف">
          <X size={14} />
        </button>
      </span>
      <datalist id="task-cost-cats">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-ink-700 flex items-center gap-1">
          <Receipt size={13} /> ریز هزینه‌های تسک ({fa(items.length)})
        </p>
        {canExp && !draft && (
          <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setDraft(blank())}>
            افزودن ریز هزینه
          </Button>
        )}
      </div>
      {draft && !draft.id && <div className="mb-2">{form}</div>}
      <div className="border border-ink-100 rounded-lg divide-y divide-ink-100">
        {items.map((e) =>
          draft?.id === e.id ? (
            <div key={e.id} className="p-1">
              {form}
            </div>
          ) : (
            <div key={e.id} className="flex items-center gap-2 text-xs px-3 py-2 flex-wrap">
              <span className="flex-1 min-w-[140px] text-ink-800">{e.title}</span>
              <span className="text-ink-400">{e.category}</span>
              <span className="text-ink-400">{e.date}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10.5px] ${tone[e.status]}`}>{e.status}</span>
              <span className="text-ink-800 font-medium w-40 text-left">{fmtRial(e.amount)}</span>
              {canExp && (
                <RowActions
                  size={12}
                  onEdit={() => setDraft(edit(e))}
                  onDelete={() => confirm({ title: `حذف ریز هزینه‌ی «${e.title}»؟`, message: `${fmtRial(e.amount)} از هزینه‌های این تسک و پروژه کم می‌شود.`, onConfirm: () => pm.deleteExpense(pid, e.id) })}
                />
              )}
            </div>
          )
        )}
        {items.length === 0 && <p className="text-[11px] text-ink-400 px-3 py-3">هنوز ریز هزینه‌ای برای این تسک ثبت نشده است.</p>}
        {items.length > 0 && (
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-ink-50">
            <span className="text-ink-500">جمع ریز هزینه‌ها{planned ? ` (${fmtRial(planned)} هنوز تأیید/پرداخت نشده)` : ""}</span>
            <b className="text-ink-900">{fmtRial(total)}</b>
          </div>
        )}
      </div>
    </div>
  );
}
