// ---------------------------------------------------------------------------
// دستیار هوشمند — نسخه‌ی نمایشی قاعده‌محور (بدون مدل زبانی): پرسش‌های رایج را از داده‌ی
// زنده‌ای که کاربر اجازه‌ی دیدنش را دارد پاسخ می‌دهد (src/pages/assistant/engine.ts).
// پرسش‌های نمونه‌ی قبلی صندوق نوآور همچنان به‌عنوان پاسخ پشتیبان کار می‌کنند.
// ---------------------------------------------------------------------------
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Send, Sparkles, FileSearch, MessageCircleQuestion, Globe, Mic, ChevronLeft, Info } from "lucide-react";
import { assistantSamples } from "../data/mockDaneshmand";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { useTenancy } from "../context/TenancyContext";
import { INTENT_SAMPLES, useAssistantEngine, type AnswerCard } from "./assistant/engine";

type ChatMessage = { from: "me" | "assistant"; text: string; cards?: AnswerCard[] };

function Cards({ cards }: { cards: AnswerCard[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      {cards.map((c, i) => {
        const body = (
          <>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-medium text-ink-800 truncate">{c.title}</span>
              {c.sub && <span className="block text-[11.5px] text-ink-500 truncate">{c.sub}</span>}
            </span>
            {c.badge && <Badge tone={c.tone ?? "neutral"}>{c.badge}</Badge>}
            {c.to && <ChevronLeft size={13} className="text-ink-300 shrink-0" />}
          </>
        );
        return c.to ? (
          <Link key={i} to={c.to} className="flex items-center gap-2 bg-white border border-ink-100 rounded-lg px-2.5 py-2 hover:border-brand-300">
            {body}
          </Link>
        ) : (
          <div key={i} className="flex items-center gap-2 bg-white border border-ink-100 rounded-lg px-2.5 py-2">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export default function Assistant() {
  const { actingUser } = useTenancy();
  const engine = useAssistantEngine();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "assistant",
      text: `سلام ${actingUser.name}! من دستیار سامانه هستم. از کارهای عقب‌افتاده، جلسات این هفته، وضعیت پروژه‌ها، اسناد دانش، متخصصان، کارکرد دوره، تیکت‌ها و اطلاعیه‌ها بپرسید — پاسخ‌ها از داده‌هایی می‌آید که اجازه‌ی دیدنشان را دارید.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { notify } = useToast();

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    setMessages((prev) => [...prev, { from: "me", text: q }]);
    setInput("");
    setThinking(true);
    let answer: { text: string; cards?: AnswerCard[] };
    try {
      answer = engine(q);
    } catch {
      answer = { text: "در پردازش این پرسش خطایی رخ داد؛ لطفاً دوباره بپرسید." };
    }
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: "assistant", text: answer.text, cards: answer.cards }]);
      setThinking(false);
      scrollDown();
    }, 450);
    scrollDown();
  };

  return (
    <div>
      <PageHeader title="دستیار هوشمند" description="پرسش‌وپاسخ فارسی روی داده‌های زنده‌ی سامانه — پروژه‌ها، جلسات، دانش، کارکرد و تیکت‌ها" icon={<Bot size={18} />} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div className="card flex flex-col h-[560px] min-w-0">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-ink-100 flex-wrap">
            <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-600" /> دستیار سامانه
            </p>
            <Badge tone="warning" icon={<Info size={11} />}>
              نسخه‌ی نمایشی — پاسخ قاعده‌محور، بدون مدل زبانی
            </Badge>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[90%] sm:max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-6 ${m.from === "me" ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-800 border border-ink-100"}`}>
                  {m.text}
                  {m.cards && m.cards.length > 0 && <Cards cards={m.cards} />}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-end">
                <div className="bg-ink-50 border border-ink-100 rounded-xl px-3.5 py-2.5 text-[12.5px] text-ink-400">در حال جستجو در داده‌های شما…</div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-ink-100 flex items-center gap-2">
            <button
              onClick={() => notify("در نسخه عملیاتی، پرسش صوتی فارسی نیز پشتیبانی می‌شود.", "info")}
              className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center hover:bg-ink-200 shrink-0"
              title="فرمان صوتی"
              aria-label="فرمان صوتی"
            >
              <Mic size={15} />
            </button>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)} placeholder="مثلاً: کارهای عقب‌افتاده‌ی من" className="input-field flex-1 min-w-0" aria-label="پرسش" />
            <Button variant="primary" icon={<Send size={14} />} onClick={() => ask(input)}>
              بپرس
            </Button>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-2">پرسش‌های پیشنهادی</p>
            <div className="space-y-1.5">
              {INTENT_SAMPLES.map((q) => (
                <button key={q} onClick={() => ask(q)} className="w-full text-right text-[12px] text-ink-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg px-2.5 py-2 border border-ink-100">
                  {q}
                </button>
              ))}
            </div>
            <details className="mt-3">
              <summary className="text-[11.5px] text-ink-500 cursor-pointer">نمونه‌های صندوق نوآور</summary>
              <div className="space-y-1.5 mt-2">
                {assistantSamples.map((x) => (
                  <button key={x.q} onClick={() => ask(x.q)} className="w-full text-right text-[12px] text-ink-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg px-2.5 py-2 border border-ink-100">
                    {x.q}
                  </button>
                ))}
              </div>
            </details>
          </div>

          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-3">سایر قابلیت‌های هوشمند</p>
            <div className="space-y-3 text-[11.5px] text-ink-600 leading-5">
              <p className="flex items-start gap-2">
                <FileSearch size={14} className="text-brand-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-ink-800">ارزیابی اولیه هوشمند پروپوزال:</span> بررسی کامل بودن مدارک و تولید خلاصه مدیریتی، پیش از ارجاع به داور انسانی (در گام‌نمای پروژه‌ها: «پرامپت ارزیابی اولیه اجرا شد»).
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MessageCircleQuestion size={14} className="text-brand-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-ink-800">چت‌بات راهنمای مجری:</span> در پروفایل مجری، برای راهنمایی تکمیل پروپوزال و گزارش‌ها.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Globe size={14} className="text-brand-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-ink-800">چت‌بات عمومی سایت:</span> پاسخ به فناوران و جذب سرنخ (Lead) در پورتال عمومی.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
