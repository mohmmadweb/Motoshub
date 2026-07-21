import { useRef, useState } from "react";
import { Bot, Send, Sparkles, FileSearch, MessageCircleQuestion, Globe, Mic } from "lucide-react";
import { assistantSamples } from "../data/mockDaneshmand";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";

type ChatMessage = { from: "me" | "assistant"; text: string };

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "assistant",
      text: "سلام! من دستیار هوشمند سامانه هستم. درباره وضعیت پروژه‌ها، پرداخت‌ها، گزارش‌های معوق و سلامت پورتفولیو به زبان فارسی بپرسید — یا یکی از پرسش‌های پیشنهادی را انتخاب کنید.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { notify } = useToast();

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    setMessages((prev) => [...prev, { from: "me", text: q }]);
    setInput("");
    setThinking(true);
    const match = assistantSamples.find((s) => q.includes(s.q.slice(0, 8)) || s.q.includes(q.slice(0, 8)));
    const answer =
      match?.a ??
      "در نسخه نمایشی، پاسخ کامل برای پرسش‌های پیشنهادی آماده شده است. در نسخه عملیاتی، این دستیار به داده‌های زنده پروژه‌ها، گزارش‌ها و پرداخت‌ها متصل می‌شود و هر پرسش فارسی را پاسخ می‌دهد.";
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: "assistant", text: answer }]);
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    }, 600);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  return (
    <div>
      <PageHeader
        title="دستیار هوشمند"
        description="پرسش‌وپاسخ فارسی از وضعیت پروژه‌ها، ارزیابی هوشمند پروپوزال‌ها و چت‌بات‌های راهنما"
        icon={<Bot size={18} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div className="card flex flex-col h-[540px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
            <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-600" /> دستیار مدیریت ارشد
            </p>
            <Badge tone="success">متصل به داده‌های نمایشی صندوق نوآور</Badge>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-6 ${
                    m.from === "me" ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-800 border border-ink-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-end">
                <div className="bg-ink-50 border border-ink-100 rounded-xl px-3.5 py-2.5 text-[12.5px] text-ink-400">
                  در حال تحلیل داده‌های پروژه‌ها…
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-ink-100 flex items-center gap-2">
            <button
              onClick={() => notify("در نسخه عملیاتی، پرسش صوتی فارسی نیز پشتیبانی می‌شود.", "info")}
              className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center hover:bg-ink-200 shrink-0"
              title="فرمان صوتی"
            >
              <Mic size={15} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="مثلاً: پروژه رزورسینول چی شد؟"
              className="input-field flex-1"
            />
            <Button variant="primary" icon={<Send size={14} />} onClick={() => ask(input)}>
              بپرس
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-2">پرسش‌های پیشنهادی</p>
            <div className="space-y-1.5">
              {assistantSamples.map((s) => (
                <button
                  key={s.q}
                  onClick={() => ask(s.q)}
                  className="w-full text-right text-[12px] text-ink-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg px-2.5 py-2 border border-ink-100"
                >
                  {s.q}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-3">سایر قابلیت‌های هوشمند</p>
            <div className="space-y-3 text-[11.5px] text-ink-600 leading-5">
              <p className="flex items-start gap-2">
                <FileSearch size={14} className="text-brand-600 shrink-0 mt-0.5" />
                <span><span className="font-medium text-ink-800">ارزیابی اولیه هوشمند پروپوزال:</span> بررسی کامل بودن مدارک و تولید خلاصه مدیریتی، پیش از ارجاع به داور انسانی (در گام‌نمای پروژه‌ها: «پرامپت ارزیابی اولیه اجرا شد»).</span>
              </p>
              <p className="flex items-start gap-2">
                <MessageCircleQuestion size={14} className="text-brand-600 shrink-0 mt-0.5" />
                <span><span className="font-medium text-ink-800">چت‌بات راهنمای مجری:</span> در پروفایل مجری، برای راهنمایی تکمیل پروپوزال و گزارش‌ها.</span>
              </p>
              <p className="flex items-start gap-2">
                <Globe size={14} className="text-brand-600 shrink-0 mt-0.5" />
                <span><span className="font-medium text-ink-800">چت‌بات عمومی سایت:</span> پاسخ به فناوران و جذب سرنخ (Lead) در پورتال عمومی.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
