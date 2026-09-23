import { useEffect, useState } from "react";
import { CircleDollarSign, Receipt, Wallet, Plus, Pencil, AlertTriangle, TrendingUp, TrendingDown, PiggyBank, Paperclip, X } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import DataTable, { type Column } from "../../components/ui/DataTable";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { budgetUsage, committedTotal, paidTotal, taskActualCost } from "../../pm/selectors";
import { fa, fmtRial, fmtShort } from "../../pm/jalali";
import type { BudgetLine, ExpenseStatus, PMExpense } from "../../pm/types";
import { Field, Progress, SectionTitle, TaskSelect, numIn, taskTitle, useProjectPage } from "./shared";

const expenseTone: Record<ExpenseStatus, BadgeTone> = { "پرداخت‌شده": "success", "تأییدشده": "brand", "در انتظار تأیید": "warning", "برنامه‌ریزی‌شده": "neutral" };
const expStatuses: ExpenseStatus[] = ["برنامه‌ریزی‌شده", "در انتظار تأیید", "تأییدشده", "پرداخت‌شده"];
const baseCategories = ["حقوق نیروها", "خرید سرویس", "خرید نرم‌افزار", "تبلیغات", "تجهیزات", "خدمات خارجی"];

type ExpDraft = Omit<PMExpense, "id" | "createdBy"> & { id?: string };

export default function FinanceTab() {
  const { p, pid, canEdit, refDate, openTask, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [exp, setExp] = useState<ExpDraft | null>(null);
  const [amountText, setAmountText] = useState("");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [statusF, setStatusF] = useState("");

  const paid = paidTotal(p);
  const committed = committedTotal(p);
  const usage = budgetUsage(p);
  const allocated = p.budget.lines.reduce((s, l) => s + l.allocated, 0);
  const profit = p.budget.revenue - paid;
  const nextTh = p.budget.thresholds.find((t) => usage < t);
  const passed = p.budget.thresholds.filter((t) => usage >= t);
  const categories = [...new Set([...p.budget.lines.map((l) => l.category), ...baseCategories, ...p.expenses.map((e) => e.category)])];

  const openNew = () => {
    setExp({ title: "", category: p.budget.lines[0]?.category ?? baseCategories[0], amount: 0, date: refDate, status: "در انتظار تأیید", taskId: "", description: "", receipt: "" });
    setAmountText("");
  };
  const openEdit = (e: PMExpense) => {
    setExp({ ...e });
    setAmountText(e.amount.toLocaleString("fa-IR"));
  };
  const save = () => {
    if (!exp) return;
    const amount = numIn(amountText);
    if (!exp.title.trim() || !amount) return notify("شرح و مبلغ هزینه الزامی است.", "warning");
    pm.saveExpense(pid, { ...exp, amount, taskId: exp.taskId || undefined });
    notify(exp.id ? "هزینه ویرایش شد." : "هزینه ثبت شد و برای مسئول مالی اعلان رفت.");
    setExp(null);
  };

  const rows = p.expenses.filter((e) => !statusF || e.status === statusF);
  const columns: Column<PMExpense>[] = [
    {
      key: "title",
      label: "شرح هزینه",
      render: (e) => (
        <span className={`font-medium text-ink-900 ${focusId === e.id ? "bg-amber-50 px-1 rounded" : ""}`}>
          {e.title}
          {e.receipt && <Paperclip size={11} className="inline mr-1 text-ink-400" />}
        </span>
      ),
    },
    { key: "category", label: "سرفصل" },
    { key: "amount", label: "مبلغ", render: (e) => fmtRial(e.amount) },
    { key: "date", label: "تاریخ" },
    { key: "taskId", label: "تسک مرتبط", render: (e) => (e.taskId ? <button className="text-brand-700 hover:underline text-right" onClick={(ev) => { ev.stopPropagation(); openTask(e.taskId!); }}>{taskTitle(p, e.taskId)}</button> : "—") },
    {
      key: "status",
      label: "وضعیت",
      render: (e) =>
        canEdit ? (
          <select value={e.status} onClick={(ev) => ev.stopPropagation()} onChange={(ev) => pm.saveExpense(pid, { ...e, status: ev.target.value as ExpenseStatus })} className="input-field !py-1 !text-xs !w-auto">
            {expStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        ) : (
          <Badge tone={expenseTone[e.status]}>{e.status}</Badge>
        ),
    },
    { key: "createdBy", label: "ثبت‌کننده", render: (e) => <span className="text-ink-500">{e.createdBy}</span> },
    {
      key: "actions",
      label: "",
      render: (e) => (
        <RowActions
          onEdit={canEdit ? () => openEdit(e) : undefined}
          onDelete={canEdit ? () => confirm({ title: `حذف هزینه‌ی «${e.title}»؟`, message: `مبلغ ${fmtRial(e.amount)} از حساب پروژه برداشته می‌شود.`, onConfirm: () => pm.deleteExpense(pid, e.id) }) : undefined}
        />
      ),
    },
  ];

  const tasksWithBudget = p.tasks.filter((t) => t.estBudget > 0 || taskActualCost(p, t.id) > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="بودجه مصوب" value={fmtShort(p.budget.total)} hint={`حامی مالی: ${p.meta.sponsor}`} tone="brand" icon={<CircleDollarSign size={16} />} />
        <StatCard label="هزینه‌کرد تاکنون" value={fmtShort(paid)} hint={`${fa(usage)}٪ بودجه`} tone="warning" icon={<Receipt size={16} />} />
        <StatCard label="باقی‌مانده" value={fmtShort(p.budget.total - paid)} hint="ریال" icon={<PiggyBank size={16} />} tone={p.budget.total - paid < 0 ? "danger" : "success"} />
        <StatCard label="تعهدشده (پرداخت‌نشده)" value={fmtShort(committed)} hint="در انتظار یا تأییدشده" icon={<Wallet size={16} />} />
        <StatCard label={profit >= 0 ? "سود" : "زیان"} value={fmtShort(Math.abs(profit))} hint={`درآمد: ${fmtShort(p.budget.revenue)}`} icon={profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} tone={profit >= 0 ? "success" : "danger"} />
      </div>

      <div className={`rounded-lg border p-3 text-xs flex items-center gap-2 flex-wrap ${passed.length ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
        <AlertTriangle size={14} />
        {passed.length ? `مصرف بودجه (${fa(usage)}٪) از آستانه‌ی ${passed.map((x) => `${fa(x)}٪`).join(" و ")} عبور کرده؛ هشدار فوری برای مالک، مدیر پروژه و مسئول مالی صادر شده است.` : `مصرف بودجه ${fa(usage)}٪ است؛ هشدار بعدی در ${fa(nextTh ?? 100)}٪ خودکار ارسال می‌شود.`}
        <span className="mr-auto text-ink-500">آستانه‌ها: {p.budget.thresholds.map((x) => `${fa(x)}٪`).join("، ")}</span>
      </div>

      <div className="card p-4">
        <SectionTitle
          title="تقسیم بودجه بین سرفصل‌ها"
          hint={`تخصیص‌یافته ${fmtRial(allocated)} از ${fmtRial(p.budget.total)}${allocated !== p.budget.total ? ` — ${allocated > p.budget.total ? "بیش از" : "کمتر از"} بودجه‌ی کل` : ""}`}
          action={
            canEdit && (
              <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setBudgetOpen(true)}>
                ویرایش بودجه و سرفصل‌ها
              </Button>
            )
          }
        />
        <div className="space-y-3">
          {p.budget.lines.map((l) => {
            const spent = p.expenses.filter((e) => e.category === l.category && e.status === "پرداخت‌شده").reduce((s, e) => s + e.amount, 0);
            const pctUsed = l.allocated ? (spent / l.allocated) * 100 : 0;
            return (
              <div key={l.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-800 font-medium">{l.category}</span>
                  <span className={pctUsed > 100 ? "text-rose-600" : "text-ink-500"}>
                    {fmtShort(spent)} از {fmtShort(l.allocated)} ({fa(Math.round(pctUsed))}٪)
                  </span>
                </div>
                <Progress value={pctUsed} tone={pctUsed > 100 ? "bg-rose-500" : pctUsed > 80 ? "bg-amber-500" : "bg-brand-500"} />
              </div>
            );
          })}
          {p.budget.lines.length === 0 && <p className="text-xs text-ink-400">سرفصلی تعریف نشده است.</p>}
        </div>
      </div>

      <div>
        <SectionTitle
          title="هزینه‌ها"
          hint="هر هزینه: مبلغ، تاریخ، دسته‌بندی، توضیح، تسک مرتبط و رسید — تغییر وضعیت (تأیید/پرداخت) به ثبت‌کننده اعلان می‌شود."
          action={
            <div className="flex gap-2">
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
                <option value="">همه‌ی وضعیت‌ها</option>
                {expStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              {canEdit && (
                <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={openNew}>
                  ثبت هزینه
                </Button>
              )}
            </div>
          }
        />
        <DataTable columns={columns} rows={rows} searchKeys={["title", "category"]} emptyTitle="هزینه‌ای ثبت نشده" />
      </div>

      <div className="card p-4">
        <SectionTitle title="کنترل هزینه‌ی تسک‌ها (تخمینی در برابر واقعی)" hint="هزینه‌ی واقعی = مجموع هزینه‌های تأییدشده/پرداخت‌شده‌ی متصل به تسک" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[620px]">
            <thead>
              <tr className="text-ink-400 border-b border-ink-100 text-right">
                <th className="p-2 font-medium">تسک</th>
                <th className="p-2 font-medium">بودجه‌ی تخمینی</th>
                <th className="p-2 font-medium">هزینه‌ی واقعی</th>
                <th className="p-2 font-medium">مانده / اضافه</th>
                <th className="p-2 font-medium w-40">مصرف</th>
              </tr>
            </thead>
            <tbody>
              {tasksWithBudget.map((t) => {
                const actual = taskActualCost(p, t.id);
                const diff = t.estBudget - actual;
                const u = t.estBudget ? (actual / t.estBudget) * 100 : 100;
                return (
                  <tr key={t.id} className="border-b border-ink-100 hover:bg-ink-50 cursor-pointer" onClick={() => openTask(t.id)}>
                    <td className="p-2 text-ink-800">{t.title}</td>
                    <td className="p-2">{t.estBudget ? fmtShort(t.estBudget) : "—"}</td>
                    <td className="p-2">{fmtShort(actual)}</td>
                    <td className={`p-2 font-medium ${diff < 0 ? "text-rose-600" : "text-emerald-700"}`}>{diff < 0 ? `+${fmtShort(-diff)} اضافه‌هزینه` : fmtShort(diff)}</td>
                    <td className="p-2">
                      <Progress value={u} tone={u > 100 ? "bg-rose-500" : "bg-brand-500"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!exp} onClose={() => setExp(null)} title={exp?.id ? "ویرایش هزینه" : "ثبت هزینه‌ی جدید"}>
        {exp && (
          <div className="space-y-3">
            <Field label="شرح هزینه">
              <input className="input-field" value={exp.title} onChange={(e) => setExp({ ...exp, title: e.target.value })} placeholder="مثلاً: اجاره‌ی سرور" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مبلغ (ریال)">
                <input className="input-field" inputMode="numeric" value={amountText} onChange={(e) => setAmountText(e.target.value)} onBlur={() => setAmountText(numIn(amountText) ? numIn(amountText).toLocaleString("fa-IR") : "")} />
              </Field>
              <Field label="تاریخ">
                <JalaliDatePicker value={exp.date} onChange={(v) => setExp({ ...exp, date: v })} />
              </Field>
              <Field label="دسته‌بندی / سرفصل">
                <input className="input-field" list="exp-cats" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })} />
                <datalist id="exp-cats">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="وضعیت">
                <select className="input-field" value={exp.status} onChange={(e) => setExp({ ...exp, status: e.target.value as ExpenseStatus })}>
                  {expStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="تسک مرتبط">
              <TaskSelect p={p} value={exp.taskId ?? ""} onChange={(v) => setExp({ ...exp, taskId: v })} placeholder="— بدون تسک —" />
            </Field>
            <Field label="توضیح">
              <textarea className="input-field min-h-[60px]" value={exp.description ?? ""} onChange={(e) => setExp({ ...exp, description: e.target.value })} />
            </Field>
            <Field label="فایل رسید">
              {exp.receipt ? (
                <div className="flex items-center gap-2 text-xs">
                  <Paperclip size={13} /> {exp.receipt}
                  <button onClick={() => setExp({ ...exp, receipt: "" })} className="text-ink-400 hover:text-rose-600" aria-label="حذف رسید">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <input type="file" className="text-xs" onChange={(e) => setExp({ ...exp, receipt: e.target.files?.[0]?.name ?? "" })} />
              )}
            </Field>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={save}>
                {exp.id ? "ذخیره‌ی تغییرات" : "ثبت هزینه"}
              </Button>
              <Button variant="secondary" onClick={() => setExp(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <BudgetModal open={budgetOpen} onClose={() => setBudgetOpen(false)} />
    </div>
  );
}

function BudgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { p, pid } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [total, setTotal] = useState("");
  const [revenue, setRevenue] = useState("");
  const [lines, setLines] = useState<{ category: string; allocated: string }[]>([]);
  const [thresholds, setThresholds] = useState("");
  useEffect(() => {
    if (!open) return;
    setTotal(p.budget.total.toLocaleString("fa-IR"));
    setRevenue(p.budget.revenue.toLocaleString("fa-IR"));
    setLines(p.budget.lines.map((l) => ({ category: l.category, allocated: l.allocated.toLocaleString("fa-IR") })));
    setThresholds(p.budget.thresholds.map((x) => fa(x)).join("، "));
    // فقط هنگام باز شدن فرم از داده‌ی فعلی پر می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const sum = lines.reduce((s, l) => s + numIn(l.allocated), 0);
  const save = () => {
    const newLines: BudgetLine[] = lines.filter((l) => l.category.trim()).map((l) => ({ category: l.category.trim(), allocated: numIn(l.allocated) }));
    const th = thresholds
      .split(/[،,\s]+/)
      .map((x) => numIn(x))
      .filter((x) => x > 0 && x <= 200)
      .sort((a, b) => a - b);
    pm.updateBudget(pid, { total: numIn(total), revenue: numIn(revenue), lines: newLines, thresholds: th.length ? th : [80, 100] });
    notify("بودجه به‌روزرسانی شد.");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="بودجه‌ی پروژه" description="بودجه‌ی کل، تقسیم بین سرفصل‌ها (مثلاً طراحی/توسعه/بازاریابی/تست)، درآمد و آستانه‌های هشدار" width="max-w-xl">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="بودجه‌ی کل (ریال)">
            <input className="input-field" value={total} onChange={(e) => setTotal(e.target.value)} />
          </Field>
          <Field label="درآمد (ریال)">
            <input className="input-field" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </Field>
        </div>
        <Field label="آستانه‌های هشدار مصرف بودجه (درصد)" hint="مثلاً ۸۰، ۱۰۰ — با عبور از هر آستانه اعلان فوری ارسال می‌شود.">
          <input className="input-field" value={thresholds} onChange={(e) => setThresholds(e.target.value)} />
        </Field>
        <div>
          <p className="text-xs font-medium text-ink-600 mb-1.5">سرفصل‌ها</p>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input className="input-field flex-1" value={l.category} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} placeholder="نام سرفصل" />
                <input className="input-field w-44" value={l.allocated} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, allocated: e.target.value } : x)))} placeholder="مبلغ" />
                <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-ink-400 hover:text-rose-600 px-1" aria-label="حذف سرفصل">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setLines([...lines, { category: "", allocated: "" }])}>
              سرفصل جدید
            </Button>
            <span className={`text-xs ${sum > numIn(total) ? "text-rose-600" : "text-ink-500"}`}>
              جمع تخصیص: {fmtRial(sum)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="primary" className="flex-1 justify-center" onClick={save}>
            ذخیره
          </Button>
          <Button variant="secondary" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}
