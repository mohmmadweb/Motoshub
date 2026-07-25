import { useState } from "react";
import { LifeBuoy, Plus, Send, Clock3, CheckCircle2, MessageSquareText } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import DataTable, { type Column } from "../components/ui/DataTable";
import { useToast } from "../components/ui/ToastProvider";

// تیکت پشتیبانی — معادل iisticketing (تیکت + دسته + پاسخ‌گویی)
type TicketMsg = { from: "me" | "support"; text: string; time: string };
type Ticket = {
  id: string;
  no: string;
  subject: string;
  category: string;
  priority: "کم" | "متوسط" | "فوری";
  status: "باز" | "در حال بررسی" | "پاسخ داده شد" | "بسته";
  updated: string;
  messages: TicketMsg[];
};

const categories = ["فنی و سامانه", "دسترسی و نقش‌ها", "مالی و پرداخت", "پیشنهاد و انتقاد"];

const initialTickets: Ticket[] = [
  {
    id: "tk1",
    no: "TK-1405-0214",
    subject: "خطای بارگذاری فایل بزرگ‌تر از ۵۰ مگابایت در بانک دانش",
    category: "فنی و سامانه",
    priority: "فوری",
    status: "در حال بررسی",
    updated: "۲ ساعت پیش",
    messages: [
      { from: "me", text: "هنگام بارگذاری گزارش ۸۰ مگابایتی خطای ۴۱۳ می‌گیرم.", time: "دیروز ۱۴:۲۰" },
      { from: "support", text: "سلام، در حال بررسی محدودیت آپلود سرور شما هستیم؛ تا امروز عصر نتیجه را اعلام می‌کنیم.", time: "دیروز ۱۶:۰۵" },
    ],
  },
  {
    id: "tk2",
    no: "TK-1405-0198",
    subject: "درخواست دسترسی «امتیازدهی داوری» برای دو کارشناس جدید",
    category: "دسترسی و نقش‌ها",
    priority: "متوسط",
    status: "پاسخ داده شد",
    updated: "دیروز",
    messages: [
      { from: "me", text: "لطفاً نقش «کارشناس داوری صندوق» به خانم‌ها احمدی و رضوی تخصیص یابد.", time: "۱۴۰۵/۰۴/۲۹" },
      { from: "support", text: "انجام شد؛ هر دو کاربر اکنون نقش موردنظر را دارند. لطفاً تایید بفرمایید.", time: "۱۴۰۵/۰۴/۲۹" },
    ],
  },
  {
    id: "tk3",
    no: "TK-1405-0175",
    subject: "مغایرت مبلغ پرداختی مرحله ۱ پروژه NF-1404-1004",
    category: "مالی و پرداخت",
    priority: "متوسط",
    status: "بسته",
    updated: "۱۴۰۵/۰۴/۲۵",
    messages: [
      { from: "me", text: "مبلغ واریزی با دستور پرداخت ۱۰ میلیون ریال اختلاف دارد.", time: "۱۴۰۵/۰۴/۲۲" },
      { from: "support", text: "اختلاف مربوط به کسر حسن انجام کار است؛ ریز محاسبه پیوست شد.", time: "۱۴۰۵/۰۴/۲۴" },
      { from: "me", text: "ممنون، تایید می‌کنم.", time: "۱۴۰۵/۰۴/۲۵" },
    ],
  },
];

const statusTone: Record<Ticket["status"], BadgeTone> = { باز: "brand", "در حال بررسی": "warning", "پاسخ داده شد": "success", بسته: "neutral" };
const prioTone: Record<Ticket["priority"], BadgeTone> = { کم: "neutral", متوسط: "warning", فوری: "danger" };

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState<Ticket["priority"]>("متوسط");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const { notify } = useToast();

  const openCount = tickets.filter((t) => t.status === "باز" || t.status === "در حال بررسی").length;

  const submit = () => {
    if (!subject.trim() || !body.trim()) {
      notify("موضوع و شرح تیکت الزامی است.", "warning");
      return;
    }
    const t: Ticket = {
      id: `tk-${Date.now()}`,
      no: `TK-1405-${String(Math.floor(200 + tickets.length)).padStart(4, "0")}`,
      subject: subject.trim(),
      category,
      priority,
      status: "باز",
      updated: "هم‌اکنون",
      messages: [{ from: "me", text: body.trim(), time: "هم‌اکنون" }],
    };
    setTickets((prev) => [t, ...prev]);
    notify(`تیکت «${t.no}» ثبت شد؛ پاسخ از طریق اعلان به شما اطلاع داده می‌شود.`);
    setOpen(false);
    setSubject("");
    setBody("");
  };

  const sendReply = () => {
    if (!reply.trim() || !selected) return;
    const updated: Ticket = {
      ...selected,
      status: "در حال بررسی",
      updated: "هم‌اکنون",
      messages: [...selected.messages, { from: "me", text: reply.trim(), time: "هم‌اکنون" }],
    };
    setTickets((prev) => prev.map((t) => (t.id === selected.id ? updated : t)));
    setSelected(updated);
    setReply("");
    notify("پاسخ شما ثبت شد.");
  };

  const closeTicket = () => {
    if (!selected) return;
    const updated: Ticket = { ...selected, status: "بسته", updated: "هم‌اکنون" };
    setTickets((prev) => prev.map((t) => (t.id === selected.id ? updated : t)));
    setSelected(updated);
    notify("تیکت بسته شد. در صورت نیاز می‌توانید تیکت جدیدی ثبت کنید.", "info");
  };

  const columns: Column<Ticket>[] = [
    { key: "no", label: "شماره", render: (t) => <span className="font-mono text-[11px] text-ink-700" dir="ltr">{t.no}</span> },
    { key: "subject", label: "موضوع", render: (t) => <span className="font-medium text-ink-900">{t.subject}</span> },
    { key: "category", label: "دسته" },
    { key: "priority", label: "اولویت", render: (t) => <Badge tone={prioTone[t.priority]}>{t.priority}</Badge> },
    { key: "status", label: "وضعیت", render: (t) => <Badge tone={statusTone[t.status]}>{t.status}</Badge> },
    { key: "updated", label: "آخرین به‌روزرسانی" },
  ];

  return (
    <div>
      <PageHeader
        title="تیکت پشتیبانی"
        description={`ثبت و پیگیری درخواست‌های پشتیبانی — ${openCount.toLocaleString("fa-IR")} تیکت باز`}
        icon={<LifeBuoy size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>تیکت جدید</Button>
        }
      />

      <DataTable
        columns={columns}
        rows={tickets}
        searchKeys={["subject", "no"]}
        searchPlaceholder="جستجو در موضوع یا شماره تیکت…"
        onRowClick={(t) => setSelected(t)}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="ثبت تیکت پشتیبانی جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">موضوع <span className="text-rose-500">*</span></label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="خلاصه‌ی یک‌خطی مشکل یا درخواست" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">دسته</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">اولویت</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Ticket["priority"])} className="input-field">
                <option>کم</option><option>متوسط</option><option>فوری</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">شرح کامل <span className="text-rose-500">*</span></label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="input-field min-h-24" placeholder="جزئیات، مراحل بازتولید مشکل، اسکرین‌شات…" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ثبت تیکت</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title={selected ? `تیکت ${selected.no}` : ""}>
        {selected && (
          <div className="flex flex-col h-full">
            <div className="pb-3 border-b border-ink-100">
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.subject}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
                <Badge tone={prioTone[selected.priority]}>{selected.priority}</Badge>
                <Badge tone="neutral">{selected.category}</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {selected.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] leading-6 ${m.from === "me" ? "bg-brand-600 text-white" : "bg-ink-50 border border-ink-100 text-ink-800"}`}>
                    {m.from === "support" && <p className="text-[10.5px] font-bold text-brand-600 mb-0.5 flex items-center gap-1"><MessageSquareText size={11} /> پشتیبانی</p>}
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 flex items-center gap-1 ${m.from === "me" ? "text-white/70" : "text-ink-400"}`}><Clock3 size={10} /> {m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            {selected.status !== "بسته" ? (
              <div className="pt-3 border-t border-ink-100 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="پاسخ خود را بنویسید…"
                    className="input-field flex-1"
                  />
                  <Button variant="primary" icon={<Send size={14} />} onClick={sendReply}>ارسال</Button>
                </div>
                <button onClick={closeTicket} className="text-[11.5px] text-ink-500 hover:text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> مشکل حل شد — بستن تیکت
                </button>
              </div>
            ) : (
              <p className="pt-3 border-t border-ink-100 text-[11.5px] text-ink-400">این تیکت بسته شده است.</p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
