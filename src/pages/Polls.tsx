import { useState } from "react";
import { ListChecks, Plus, Timer, FileQuestion, CheckCircle2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";
import Modal from "../components/ui/Modal";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useTabParam } from "../lib/useTabParam";
import { useTenancy } from "../context/TenancyContext";
import { ScopeBadge, ScopePicker } from "../components/ui/ScopeControl";
import { withDemoScopes, type Scoped } from "../data/tenancy";

// نظرسنجی (iisquestions/Poll) + آزمون و داوری (iispors/Quiz)
type Poll = {
  id: string;
  question: string;
  by: string;
  ends: string;
  options: { id: string; label: string; votes: number }[];
  myVote?: string;
} & Scoped;

const initialPolls: Poll[] = [
  {
    id: "pl1",
    question: "زمان برگزاری جلسات هفتگی هماهنگی هلدینگ‌ها کدام باشد؟",
    by: "پایگاه اطلاع‌رسانی بنیاد",
    ends: "۱۴۰۵/۰۵/۰۵",
    options: [
      { id: "a", label: "شنبه‌ها ۱۰ صبح", votes: 34 },
      { id: "b", label: "یکشنبه‌ها ۱۴", votes: 21 },
      { id: "c", label: "سه‌شنبه‌ها ۹ صبح", votes: 12 },
    ],
  },
  {
    id: "pl2",
    question: "کدام حوزه برای فراخوان بعدی صندوق نوآور در اولویت باشد؟",
    by: "مدیر صندوق نوآور",
    ends: "۱۴۰۵/۰۵/۱۵",
    options: [
      { id: "a", label: "هوش مصنوعی صنعتی", votes: 58 },
      { id: "b", label: "امنیت غذایی", votes: 41 },
      { id: "c", label: "انرژی و بهینه‌سازی مصرف", votes: 37 },
      { id: "d", label: "سلامت دیجیتال", votes: 25 },
    ],
  },
];

type Quiz = {
  id: string;
  title: string;
  questions: number;
  minutes: number;
  deadline: string;
  status: "باز" | "در حال داوری" | "پایان‌یافته";
  myScore?: number;
  passing: number;
} & Scoped;

const initialQuizzes: Quiz[] = [
  { id: "qz1", title: "آزمون آشنایی با فرآیندهای صندوق نوآور (ویژه راهبران)", questions: 20, minutes: 30, deadline: "۱۴۰۵/۰۵/۱۰", status: "باز", passing: 70 },
  { id: "qz2", title: "ارزیابی دوره امنیت سایبری و افتا", questions: 25, minutes: 40, deadline: "۱۴۰۵/۰۴/۳۰", status: "در حال داوری", passing: 60 },
  { id: "qz3", title: "آزمون پایان دوره مدیریت پروژه R&D", questions: 30, minutes: 45, deadline: "۱۴۰۵/۰۴/۱۵", status: "پایان‌یافته", myScore: 84, passing: 70 },
];

const quizTone: Record<Quiz["status"], BadgeTone> = { باز: "success", "در حال داوری": "warning", "پایان‌یافته": "neutral" };

export default function Polls() {
  const [tab, setTab] = useTabParam<"polls" | "quiz">("polls", ["polls", "quiz"]);
  const [polls, setPolls] = useState<Poll[]>(() => withDemoScopes(initialPolls, 11));
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => withDemoScopes(initialQuizzes, 12));
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: "", questions: "", minutes: "", deadline: "", passing: "" });
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const { notify } = useToast();
  const confirm = useConfirm();
  const { filterScoped, defaultScopeForNew } = useTenancy();
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });

  const vote = (pollId: string, optId: string) => {
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        if (p.myVote === optId) return p;
        return {
          ...p,
          myVote: optId,
          options: p.options.map((o) => ({
            ...o,
            votes: o.votes + (o.id === optId ? 1 : 0) - (o.id === p.myVote ? 1 : 0),
          })),
        };
      })
    );
    notify("رأی شما ثبت شد.", "success");
  };

  const startEditPoll = (p: Poll) => {
    setEditingId(p.id);
    setQuestion(p.question);
    setItemScope({ scope: p.scope, holdingId: p.holdingId, companyId: p.companyId });
    setOptionsText(p.options.map((o) => o.label).join("، "));
    setOpen(true);
  };

  const removePoll = (p: Poll) =>
    confirm({
      title: `حذف نظرسنجی «${p.question}»؟`,
      message: `${p.options.reduce((s, o) => s + o.votes, 0).toLocaleString("fa-IR")} رأی ثبت‌شده نیز حذف می‌شود.`,
      onConfirm: () => {
        setPolls((prev) => prev.filter((x) => x.id !== p.id));
        notify("نظرسنجی حذف شد.", "info");
      },
    });

  const closePollModal = () => {
    setOpen(false);
    setEditingId(null);
    setQuestion("");
    setOptionsText("");
  };

  const createPoll = () => {
    const opts = optionsText.split("،").map((s) => s.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) {
      notify("سوال و حداقل دو گزینه (جداشده با «،») الزامی است.", "warning");
      return;
    }
    if (editingId) {
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== editingId) return p;
          // آرای گزینه‌هایی که برچسبشان تغییر نکرده حفظ می‌شود
          const options = opts.map((label, i) => {
            const old = p.options.find((o) => o.label === label);
            return { id: old?.id ?? `o${i}-${Date.now()}`, label, votes: old?.votes ?? 0 };
          });
          const myVote = options.some((o) => o.id === p.myVote) ? p.myVote : undefined;
          return { ...p, question: question.trim(), options, myVote, ...itemScope };
        })
      );
      notify("نظرسنجی ویرایش شد.");
      closePollModal();
      return;
    }
    setPolls((prev) => [
      { id: `pl-${Date.now()}`, question: question.trim(), by: "شما", ends: "۱۴۰۵/۰۵/۳۰", options: opts.map((label, i) => ({ id: `o${i}`, label, votes: 0 })), ...itemScope },
      ...prev,
    ]);
    notify("نظرسنجی منتشر شد.");
    closePollModal();
  };

  const openQuizModal = (q?: Quiz) => {
    if (q) {
      setEditingQuizId(q.id);
      setItemScope({ scope: q.scope, holdingId: q.holdingId, companyId: q.companyId });
      setQuizForm({ title: q.title, questions: String(q.questions), minutes: String(q.minutes), deadline: q.deadline, passing: String(q.passing) });
    } else {
      setEditingQuizId(null);
      setItemScope(defaultScopeForNew());
      setQuizForm({ title: "", questions: "", minutes: "", deadline: "", passing: "" });
    }
    setQuizOpen(true);
  };

  const submitQuiz = () => {
    if (!quizForm.title.trim()) {
      notify("عنوان آزمون الزامی است.", "warning");
      return;
    }
    const payload = {
      title: quizForm.title.trim(),
      questions: Number(quizForm.questions) || 0,
      minutes: Number(quizForm.minutes) || 0,
      deadline: quizForm.deadline.trim() || "—",
      passing: Number(quizForm.passing) || 0,
    };
    if (editingQuizId) {
      setQuizzes((prev) => prev.map((q) => (q.id === editingQuizId ? { ...q, ...payload, ...itemScope } : q)));
      notify("آزمون ویرایش شد.");
    } else {
      setQuizzes((prev) => [{ id: `qz-${Date.now()}`, status: "باز", ...payload, ...itemScope }, ...prev]);
      notify("آزمون ایجاد شد.");
    }
    setQuizOpen(false);
    setEditingQuizId(null);
  };

  const removeQuiz = (q: Quiz) =>
    confirm({
      title: `حذف آزمون «${q.title}»؟`,
      message: "کارنامه‌ها و پاسخ‌های ثبت‌شده‌ی این آزمون نیز حذف می‌شود.",
      onConfirm: () => {
        setQuizzes((prev) => prev.filter((x) => x.id !== q.id));
        notify("آزمون حذف شد.", "info");
      },
    });

  return (
    <div>
      <PageHeader
        title="نظرسنجی و آزمون"
        description="نظرسنجی‌های سازمانی با نتایج زنده، و آزمون‌های دوره‌ای با داوری و کارنامه"
        icon={<ListChecks size={18} />}
        actions={
          tab === "polls" ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setItemScope(defaultScopeForNew()); setOpen(true); }}>نظرسنجی جدید</Button>
          ) : (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => openQuizModal()}>آزمون جدید</Button>
          )
        }
      />
      <Tabs
        tabs={[
          { id: "polls", label: "نظرسنجی‌ها", count: filterScoped(polls).length },
          { id: "quiz", label: "آزمون‌ها و داوری", count: filterScoped(quizzes).length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "polls" && filterScoped(polls).length === 0 && (
        <EmptyState icon={<ListChecks size={20} />} title="هنوز نظرسنجی‌ای ایجاد نشده" />
      )}

      {tab === "polls" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filterScoped(polls).map((p) => {
            const total = p.options.reduce((s, o) => s + o.votes, 0);
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-ink-900 leading-6">{p.question}</p>
                  <span className="flex items-center gap-1"><ScopeBadge item={p} /><RowActions onEdit={() => startEditPoll(p)} onDelete={() => removePoll(p)} /></span>
                </div>
                <p className="text-[11px] text-ink-400 mt-0.5 mb-3">توسط {p.by} · مهلت رأی: {p.ends} · {total.toLocaleString("fa-IR")} رأی</p>
                <div className="space-y-2">
                  {p.options.map((o) => {
                    const pct = total ? Math.round((o.votes / total) * 100) : 0;
                    const mine = p.myVote === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => vote(p.id, o.id)}
                        className={`w-full text-right relative overflow-hidden rounded-lg border px-3 py-2 transition-colors ${
                          mine ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:border-brand-300"
                        }`}
                      >
                        <span className="absolute inset-y-0 right-0 bg-brand-100/70 transition-all" style={{ width: `${p.myVote ? pct : 0}%` }} />
                        <span className="relative flex items-center justify-between gap-2 text-[12.5px]">
                          <span className={`flex items-center gap-1.5 ${mine ? "font-bold text-brand-700" : "text-ink-800"}`}>
                            {mine && <CheckCircle2 size={13} />} {o.label}
                          </span>
                          {p.myVote && <span className="text-ink-500 font-medium">{pct.toLocaleString("fa-IR")}٪</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "quiz" && (
        <div className="card divide-y divide-ink-100">
          {filterScoped(quizzes).length === 0 && <p className="p-6 text-center text-sm text-ink-400">هنوز آزمونی تعریف نشده است.</p>}
          {filterScoped(quizzes).map((q) => (
            <div key={q.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                  <FileQuestion size={14} className="text-brand-600 shrink-0" /> {q.title}
                </p>
                <p className="text-[11.5px] text-ink-400 mt-1 flex items-center gap-2 flex-wrap">
                  {q.questions.toLocaleString("fa-IR")} سوال
                  <span className="flex items-center gap-1"><Timer size={11} /> {q.minutes.toLocaleString("fa-IR")} دقیقه</span>
                  · مهلت {q.deadline} · حدنصاب {q.passing.toLocaleString("fa-IR")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {q.myScore !== undefined && (
                  <Badge tone={q.myScore >= q.passing ? "success" : "danger"}>نمره شما: {q.myScore.toLocaleString("fa-IR")}</Badge>
                )}
                <ScopeBadge item={q} />
                <Badge tone={quizTone[q.status]}>{q.status}</Badge>
                {q.status === "باز" && (
                  <Button variant="primary" size="sm" onClick={() => notify(`آزمون «${q.title}» آغاز شد — ${q.minutes.toLocaleString("fa-IR")} دقیقه فرصت دارید. (نمایشی)`, "info")}>
                    شرکت در آزمون
                  </Button>
                )}
                <RowActions onEdit={() => openQuizModal(q)} onDelete={() => removeQuiz(q)} />
              </div>
            </div>
          ))}
          <p className="p-3.5 text-[11px] text-ink-400 leading-5">
            روند: شرکت در آزمون ← تصحیح خودکار سوالات تستی ← داوری سوالات تشریحی توسط داور ← انتشار کارنامه و درج در شناسنامه آموزشی.
          </p>
        </div>
      )}

      <Modal open={open} onClose={closePollModal} title={editingId ? "ویرایش نظرسنجی" : "ایجاد نظرسنجی جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">سوال نظرسنجی <span className="text-rose-500">*</span></label>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="مثلاً: موضوع کارگاه بعدی چه باشد؟" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">گزینه‌ها (با «،» جدا کنید) <span className="text-rose-500">*</span></label>
            <textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="گزینه یک، گزینه دو، گزینه سه" className="input-field min-h-16" />
          </div>
          <ScopePicker value={itemScope} onChange={setItemScope} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={createPoll}>
              {editingId ? "ذخیره تغییرات" : "انتشار نظرسنجی"}
            </Button>
            <Button variant="secondary" onClick={closePollModal}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal open={quizOpen} onClose={() => setQuizOpen(false)} title={editingQuizId ? "ویرایش آزمون" : "ایجاد آزمون جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان آزمون <span className="text-rose-500">*</span></label>
            <input value={quizForm.title} onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">تعداد سوال</label>
              <input value={quizForm.questions} onChange={(e) => setQuizForm((f) => ({ ...f, questions: e.target.value }))} className="input-field" placeholder="۲۰" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">مدت (دقیقه)</label>
              <input value={quizForm.minutes} onChange={(e) => setQuizForm((f) => ({ ...f, minutes: e.target.value }))} className="input-field" placeholder="۳۰" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">مهلت</label>
              <input value={quizForm.deadline} onChange={(e) => setQuizForm((f) => ({ ...f, deadline: e.target.value }))} className="input-field" placeholder="۱۴۰۵/۰۵/۳۰" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">حدنصاب قبولی</label>
              <input value={quizForm.passing} onChange={(e) => setQuizForm((f) => ({ ...f, passing: e.target.value }))} className="input-field" placeholder="۷۰" />
            </div>
          </div>
          <ScopePicker value={itemScope} onChange={setItemScope} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitQuiz}>
              {editingQuizId ? "ذخیره تغییرات" : "ایجاد آزمون"}
            </Button>
            <Button variant="secondary" onClick={() => setQuizOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
