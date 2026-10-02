// فرم ثبت تیکت — نسخه‌ی کامل (صفحه‌ی تیکت‌ها) و فشرده (دکمه‌ی شناور «گزارش مشکل»).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bug, Lightbulb, HelpCircle, KeyRound, Gauge, MessageSquarePlus, ChevronDown, Cpu, Send, BookOpen, Users, HandHelping } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { searchHelp } from "../knowledge/helpArticles";
import Button from "../../components/ui/Button";
import { useTenancy } from "../../context/TenancyContext";
import { useTickets } from "../../context/TicketsContext";
import { fa } from "../../pm/jalali";
import {
  affectedCount,
  captureContext,
  fmtTs,
  similarTickets,
  statusShort,
  moduleFromPath,
  modules,
  priorities,
  severities,
  severityHint,
  slaTargets,
  ticketTypes,
  type Ticket,
  type TicketModule,
  type TicketPriority,
  type TicketSeverity,
  type TicketType,
} from "./model";
import { Field, FilePicker, LabelsInput, type PickedFile } from "./parts";

export const typeIcon: Record<TicketType, typeof Bug> = {
  خطا: Bug,
  "درخواست قابلیت": Lightbulb,
  سؤال: HelpCircle,
  "مشکل دسترسی": KeyRound,
  "کندی و کارایی": Gauge,
  پیشنهاد: MessageSquarePlus,
};
const needsRepro = (t: TicketType) => t === "خطا" || t === "کندی و کارایی" || t === "مشکل دسترسی";
const labelSuggestions = ["ظاهر", "موبایل", "حالت تاریک", "اعلان", "گزارش", "بارگذاری", "کارایی", "دسترسی", "جستجو"];

export default function TicketForm({
  compact,
  route,
  pageTitle,
  onCreated,
  onCancel,
  onJoined,
}: {
  compact?: boolean;
  /** مسیر صفحه‌ای که مشکل در آن رخ داده (پیش‌فرض: صفحه‌ی فعلی) */
  route?: string;
  pageTitle?: string;
  onCreated: (t: Ticket) => void;
  onCancel: () => void;
  /** «من هم این مشکل را دارم» روی تیکت مشابه — پیش‌فرض: همان onCreated */
  onJoined?: (t: Ticket) => void;
}) {
  const { contextId, scopePath, myBindings } = useTenancy();
  const tk = useTickets();
  const roles = useMemo(() => [...new Set(myBindings.map((b) => b.role.name))].join("، ") || "بدون نقش", [myBindings]);
  // زمینه همان لحظه‌ی باز شدن فرم ثبت می‌شود
  const [ctx] = useState(() => captureContext(scopePath(contextId), roles, route, pageTitle));
  const [type, setType] = useState<TicketType>("خطا");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState<TicketModule>(() => moduleFromPath(ctx.route));
  const [priority, setPriority] = useState<TicketPriority>("متوسط");
  const [severity, setSeverity] = useState<TicketSeverity>("متوسط");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [showRepro, setShowRepro] = useState(!compact);
  const [showCtx, setShowCtx] = useState(false);
  const [tried, setTried] = useState(false);

  // پیشنهاد هنگام نوشتن عنوان (با تأخیر): ۳ مقاله‌ی راهنما و ۳ تیکت باز مشابه — کاهش تیکت تکراری
  const { settings } = useSettings();
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(title.trim()), 350);
    return () => window.clearTimeout(h);
  }, [title]);
  const helpHits = useMemo(() => (debounced.length >= 4 ? searchHelp(debounced, settings, 3) : []), [debounced, settings]);
  const similar = useMemo(() => (debounced.length >= 4 ? similarTickets(tk.tickets, debounced, 3) : []), [debounced, tk.tickets]);
  const join = (t: Ticket) => {
    tk.meToo(t.id);
    (onJoined ?? onCreated)(t);
  };

  const valid = title.trim().length >= 5 && description.trim().length >= 5;
  const submit = () => {
    setTried(true);
    if (!valid) return;
    const t = tk.create({
      title,
      description,
      type,
      module,
      priority,
      severity: needsRepro(type) ? severity : "جزئی",
      steps: needsRepro(type) ? steps : undefined,
      expected: needsRepro(type) ? expected : undefined,
      actual: needsRepro(type) ? actual : undefined,
      labels,
      attachments: files,
      context: ctx,
      scopeId: contextId,
    });
    onCreated(t);
  };
  const sla = slaTargets[priority];

  return (
    <div className="space-y-3.5">
      <div>
        <span className="block text-[12px] font-medium text-ink-700 mb-1.5">نوع</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {ticketTypes.map((x) => {
            const Icon = typeIcon[x];
            const on = x === type;
            return (
              <button
                key={x}
                type="button"
                onClick={() => setType(x)}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-[11.5px] text-right ${on ? "border-brand-500 bg-brand-50 text-brand-700 font-medium" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{x}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Field label="عنوان کوتاه">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`input-field w-full ${tried && title.trim().length < 5 ? "input-error" : ""}`}
          placeholder={type === "خطا" ? "مثلاً: دکمه‌ی ذخیره در فرم سند کار نمی‌کند" : type === "سؤال" ? "پرسش خود را کوتاه بنویسید" : "خلاصه‌ی درخواست"}
          autoFocus
        />
      </Field>

      {(helpHits.length > 0 || similar.length > 0) && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-2.5 space-y-2" aria-live="polite">
          {helpHits.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-ink-600 mb-1 flex items-center gap-1">
                <BookOpen size={12} /> شاید پاسخ در راهنما باشد
              </p>
              <ul className="space-y-0.5">
                {helpHits.map((a) => (
                  <li key={a.id}>
                    <Link to={`/dashboard/knowledge?tab=help&article=${encodeURIComponent(a.id)}`} target="_blank" className="text-[12px] text-brand-700 hover:underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {similar.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-ink-600 mb-1 flex items-center gap-1">
                <Users size={12} /> تیکت‌های باز مشابه
              </p>
              <ul className="space-y-1">
                {similar.map((t) => {
                  const already = tk.involved(t);
                  return (
                    <li key={t.id} className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10.5px] text-ink-400" dir="ltr">
                        {t.id}
                      </span>
                      <span className="text-[12px] text-ink-800 flex-1 min-w-[140px] truncate">{t.title}</span>
                      <span className="text-[10.5px] text-ink-400 shrink-0">
                        {statusShort[t.status]} · {fa(affectedCount(t))} نفر
                      </span>
                      <Button size="sm" variant={already ? "ghost" : "secondary"} icon={<HandHelping size={12} />} onClick={() => join(t)}>
                        {already ? "پیگیری همین" : "من هم این مشکل را دارم"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <Field label="شرح">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={compact ? 3 : 4}
          className={`input-field w-full resize-y ${tried && description.trim().length < 5 ? "input-error" : ""}`}
          placeholder="چه اتفاقی افتاد یا چه چیزی لازم دارید؟"
        />
      </Field>

      <div className={`grid gap-3 ${needsRepro(type) ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
        <Field label="بخش سامانه">
          <select value={module} onChange={(e) => setModule(e.target.value as TicketModule)} className="input-field w-full">
            {modules.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="اولویت" hint={`پاسخ تا ${fa(sla.first)} ساعت · رفع تا ${fa(sla.resolve)} ساعت`}>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="input-field w-full">
            {priorities.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        {needsRepro(type) && (
          <Field label="شدت اثر" hint={severityHint[severity]}>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as TicketSeverity)} className="input-field w-full">
              {severities.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {needsRepro(type) && (
        <div className="rounded-lg border border-ink-200">
          <button type="button" onClick={() => setShowRepro((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium text-ink-700">
            مراحل بازتولید، نتیجه‌ی مورد انتظار و واقعی
            <ChevronDown size={14} className={`transition-transform ${showRepro ? "rotate-180" : ""}`} />
          </button>
          {showRepro && (
            <div className="px-3 pb-3 space-y-2.5">
              <Field label="مراحل بازتولید">
                <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} className="input-field w-full resize-y" placeholder={"۱. …\n۲. …\n۳. …"} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="انتظار داشتم">
                  <textarea value={expected} onChange={(e) => setExpected(e.target.value)} rows={2} className="input-field w-full resize-y" />
                </Field>
                <Field label="اما این شد">
                  <textarea value={actual} onChange={(e) => setActual(e.target.value)} rows={2} className="input-field w-full resize-y" />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}

      {!compact && (
        <Field label="برچسب‌ها (اختیاری)">
          <LabelsInput value={labels} onChange={setLabels} suggestions={labelSuggestions} />
        </Field>
      )}

      <FilePicker files={files} onChange={setFiles} label="پیوست تصویر یا فایل" />

      <div className="rounded-lg bg-ink-50 border border-ink-200">
        <button type="button" onClick={() => setShowCtx((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-[11.5px] text-ink-600">
          <Cpu size={13} className="shrink-0" />
          <span className="flex-1 text-right">اطلاعات فنی به‌صورت خودکار پیوست می‌شود</span>
          <ChevronDown size={13} className={`shrink-0 transition-transform ${showCtx ? "rotate-180" : ""}`} />
        </button>
        {showCtx && <ContextGrid ctx={ctx} />}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          انصراف
        </Button>
        <Button variant="primary" icon={<Send size={14} />} onClick={submit}>
          ثبت تیکت
        </Button>
      </div>
    </div>
  );
}

export function ContextGrid({ ctx }: { ctx: Ticket["context"] }) {
  const rows: [string, string, boolean?][] = [
    ["صفحه", ctx.pageTitle ? `${ctx.pageTitle}` : "—"],
    ["مسیر", ctx.route, true],
    ["واحد", ctx.scope],
    ["نقش‌ها", ctx.roles],
    ["مرورگر", ctx.userAgent, true],
    ["اندازه‌ی صفحه", ctx.screen],
    ["نسخه‌ی سامانه", ctx.appVersion],
    ["زمان ثبت", fmtTs(ctx.at)],
  ];
  return (
    <dl className="px-3 pb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
      {rows.map(([k, v, ltr]) => (
        <div key={k} className="contents">
          <dt className="text-ink-400 whitespace-nowrap">{k}</dt>
          <dd className="text-ink-700 break-all" dir={ltr ? "ltr" : undefined} style={ltr ? { textAlign: "right" } : undefined}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
