// جزئیات تیکت: خلاصه، SLA، اقدام‌ها، تاریخچه‌ی تغییرناپذیر (گفت‌وگو + رویدادها) و مشخصات.
import { useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDot,
  FileText,
  Link2,
  Lock,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Send,
  Star,
  Tag,
  UserCheck,
  Flag,
  Rocket,
  PlusCircle,
  XCircle,
  Gauge,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useTickets } from "../../context/TicketsContext";
import { useInbox } from "../../context/InboxContext";
import { users } from "../../data/mock";
import { fa } from "../../pm/jalali";
import {
  cannedReplies,
  fmtSize,
  fmtTs,
  isFinal,
  priorities,
  priorityTone,
  relTs,
  releaseVersions,
  severities,
  severityTone,
  statusLabel,
  statusShort,
  vendorById,
  vendorTeam,
  vendorTransitions,
  type ActorKind,
  type Ticket,
  type TicketEvent,
  type TicketPriority,
  type TicketSeverity,
  type TicketStatus,
} from "./model";
import { Field, FilePicker, LabelsInput, SlaPanel, Stars, StatusBadge, ratingLabel, type PickedFile } from "./parts";
import { ContextGrid, typeIcon } from "./TicketForm";

const actorLabel: Record<ActorKind, string> = { reporter: "گزارش‌دهنده", vendor: "تیم سازنده", user: "سازمان", system: "سامانه" };
const actorTone: Record<ActorKind, "brand" | "navy" | "neutral"> = { reporter: "neutral", vendor: "navy", user: "brand", system: "neutral" };
const colorOf = (name: string) => users.find((u) => u.name === name)?.avatarColor ?? vendorTeam.find((v) => v.name === name)?.color ?? "#64748b";

export default function TicketDetail({ ticket: t, onOpen }: { ticket: Ticket; onOpen: (id: string) => void }) {
  const tk = useTickets();
  const { actingUser, hasPermission, scopeLabel } = useTenancy();
  const inbox = useInbox();
  const { notify } = useToast();
  const isReporter = t.reporterId === actingUser.id;
  const asVendor = tk.isVendor && !isReporter;
  const canComment = isReporter || tk.isVendor || hasPermission("tickets.view-org");
  const [tab, setTab] = useState<"timeline" | "details">("timeline");
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState<"confirm" | "rate" | null>(null);

  const notifyReporter = (msg: string) => {
    if (!isReporter) inbox.send([t.reporterName], "reply", `تیکت ${t.id}: ${msg}`, `/dashboard/tickets?id=${t.id}`);
  };

  const send = () => {
    if (!text.trim() && !files.length) return;
    const isNote = asVendor && internal;
    tk.comment(t.id, text.trim() || "فایل پیوست شد.", { internal: isNote, files });
    if (!isNote && (asVendor || !isReporter)) notifyReporter("پاسخ جدید از تیم سازنده");
    notify(isNote ? "یادداشت داخلی ثبت شد (برای گزارش‌دهنده نمایش داده نمی‌شود)." : isReporter && t.status === "need-info" ? "پاسخ ارسال شد و تیکت به صف بررسی برگشت." : "پیام ثبت شد.");
    setText("");
    setFiles([]);
    setInternal(false);
  };

  const events = t.events.filter((e) => !e.internal || tk.isVendor);
  const TypeIcon = typeIcon[t.type];
  const reporter = users.find((u) => u.id === t.reporterId);

  return (
    <div className="space-y-4">
      {/* سربرگ */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="text-[11px] font-mono text-ink-500 bg-ink-100 rounded px-1.5 py-0.5" dir="ltr">
            {t.id}
          </span>
          <StatusBadge status={t.status} long />
          <Badge tone={priorityTone[t.priority]} icon={<Flag size={10} />}>
            {t.priority}
          </Badge>
          <Badge tone="neutral" icon={<TypeIcon size={11} />}>
            {t.type}
          </Badge>
        </div>
        <h3 className="text-[15px] font-bold text-ink-900 leading-7">{t.title}</h3>
        <div className="flex items-center gap-2 mt-2 text-[11.5px] text-ink-500 flex-wrap">
          <Avatar name={t.reporterName} color={reporter?.avatarColor} size={22} />
          <span className="text-ink-700 font-medium">{t.reporterName}</span>
          <span>·</span>
          <span className="truncate max-w-[220px]">{scopeLabel(t.reporterScopeId)}</span>
          <span>·</span>
          <span>{relTs(t.createdAt, tk.now)}</span>
        </div>
      </div>

      <SlaPanel t={t} now={tk.now} />

      {/* اقدام‌ها */}
      <div className="flex items-center gap-2 flex-wrap">
        {isReporter && t.status === "resolved" && (
          <>
            <Button variant="primary" size="sm" icon={<CheckCircle2 size={14} />} onClick={() => setRateOpen("confirm")}>
              تأیید رفع و بستن
            </Button>
            <Button size="sm" icon={<RotateCcw size={14} />} onClick={() => setReopenOpen(true)}>
              هنوز مشکل دارد
            </Button>
          </>
        )}
        {isReporter && isFinal(t.status) && (
          <Button size="sm" icon={<RotateCcw size={14} />} onClick={() => setReopenOpen(true)}>
            بازگشایی
          </Button>
        )}
        {isReporter && t.status === "closed" && !t.rating && (
          <Button size="sm" variant="primary" icon={<Star size={14} />} onClick={() => setRateOpen("rate")}>
            ثبت امتیاز رضایت
          </Button>
        )}
        {isReporter && !isFinal(t.status) && t.status !== "resolved" && (
          <Button
            size="sm"
            variant="ghost"
            icon={<XCircle size={14} />}
            onClick={() => {
              tk.setStatus(t.id, "closed", "گزارش‌دهنده تیکت را بست (دیگر نیازی نیست).");
              notify("تیکت بسته شد.", "info");
            }}
          >
            دیگر نیازی نیست، بستن
          </Button>
        )}
        {asVendor && (
          <>
            <Button variant="primary" size="sm" icon={<ArrowLeftRight size={14} />} onClick={() => setStatusOpen(true)}>
              تغییر وضعیت
            </Button>
            <select
              value={t.assigneeId ?? ""}
              onChange={(e) => {
                tk.assign(t.id, e.target.value || undefined);
                notify("مسئول تیکت تغییر کرد.");
              }}
              className="input-field !py-1.5 text-[12px] w-auto"
              aria-label="مسئول"
            >
              <option value="">بدون مسئول</option>
              {vendorTeam.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </>
        )}
        {!asVendor && t.assigneeId && (
          <span className="text-[11.5px] text-ink-500 flex items-center gap-1">
            <UserCheck size={13} /> پیگیری: {vendorById(t.assigneeId)?.name}
          </span>
        )}
      </div>

      {isReporter && t.status === "need-info" && (
        <p className="text-[12px] rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 leading-6">
          تیم سازنده برای ادامه‌ی بررسی به اطلاعات بیشتری از شما نیاز دارد. با پاسخ دادن، تیکت خودکار به صف بررسی برمی‌گردد و ساعت SLA دوباره روشن می‌شود.
        </p>
      )}

      {/* زبانه‌ها */}
      <div className="flex items-center gap-1 border-b border-ink-200">
        {(
          [
            ["timeline", `گفت‌وگو و تاریخچه (${fa(events.length)})`],
            ["details", "مشخصات"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px ${tab === id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "timeline" ? (
        <div>
          <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:right-[13px] before:w-px before:bg-ink-200">
            {events.map((e) => (
              <EventRow key={e.id} e={e} t={t} now={tk.now} onOpen={onOpen} />
            ))}
          </ol>

          {canComment && (!isFinal(t.status) || asVendor) ? (
            <div className={`mt-4 rounded-xl border p-3 space-y-2 ${internal ? "border-amber-300 bg-amber-50/60" : "border-ink-200"}`}>
              {asVendor && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value=""
                    onChange={(e) => {
                      const c = cannedReplies.find((x) => x.id === e.target.value);
                      if (c) setText((p) => (p ? `${p}\n${c.text}` : c.text));
                    }}
                    className="input-field !py-1 text-[11.5px] w-auto"
                    aria-label="پاسخ آماده"
                  >
                    <option value="">پاسخ آماده…</option>
                    {cannedReplies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-[11.5px] text-ink-600 cursor-pointer">
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-600" />
                    <Lock size={12} /> یادداشت داخلی (فقط تیم سازنده)
                  </label>
                  <span className="text-[10.5px] text-ink-400 mr-auto">با هویت «{tk.agent.name}»</span>
                </div>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="input-field w-full resize-y"
                placeholder={internal ? "یادداشت داخلی برای همکاران تیم سازنده…" : isReporter ? "توضیح یا پاسخ خود را بنویسید…" : "پاسخ به گزارش‌دهنده…"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
                }}
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <FilePicker files={files} onChange={setFiles} label="پیوست" />
                <Button variant="primary" size="sm" icon={internal ? <Lock size={13} /> : <Send size={13} />} onClick={send} disabled={!text.trim() && !files.length}>
                  {internal ? "ثبت یادداشت" : "ارسال"}
                </Button>
              </div>
            </div>
          ) : (
            isFinal(t.status) &&
            isReporter && <p className="mt-4 text-[12px] text-ink-500 text-center">این تیکت بسته است؛ برای ادامه‌ی گفت‌وگو آن را بازگشایی کنید.</p>
          )}
        </div>
      ) : (
        <DetailsTab t={t} asVendor={asVendor} canAttach={canComment} onOpen={onOpen} />
      )}

      <StatusModal open={statusOpen} onClose={() => setStatusOpen(false)} t={t} onDone={(to, msg) => notifyReporter(`وضعیت به «${statusShort[to]}» تغییر کرد${msg ? ` — ${msg}` : ""}`)} />
      <ReopenModal open={reopenOpen} onClose={() => setReopenOpen(false)} t={t} />
      <RateModal mode={rateOpen} onClose={() => setRateOpen(null)} t={t} />
    </div>
  );
}

function EventRow({ e, t, now, onOpen }: { e: TicketEvent; t: Ticket; now: number; onOpen: (id: string) => void }) {
  const isMsg = e.kind === "comment" || e.kind === "note";
  if (isMsg) {
    return (
      <li className="relative flex gap-2.5">
        <span className="relative z-10 shrink-0">
          <Avatar name={e.actor} color={colorOf(e.actor)} size={28} />
        </span>
        <div className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 ${e.internal ? "border-amber-200 bg-amber-50" : e.actorKind === "vendor" ? "border-ink-200 bg-navy-50" : "border-ink-200 bg-white"}`}>
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="font-bold text-ink-800">{e.actor}</span>
            <Badge tone={e.internal ? "warning" : actorTone[e.actorKind]} icon={e.internal ? <Lock size={9} /> : undefined}>
              {e.internal ? "یادداشت داخلی" : actorLabel[e.actorKind]}
            </Badge>
            <span className="text-ink-400 mr-auto" title={fmtTs(e.at)}>
              {relTs(e.at, now)}
            </span>
          </div>
          {e.text && <p className="text-[12.5px] text-ink-700 leading-6 mt-1.5 whitespace-pre-line">{e.text}</p>}
          {e.files && e.files.length > 0 && <FileChips names={e.files} />}
        </div>
      </li>
    );
  }
  const { icon: Icon, text } = describe(e, t);
  return (
    <li className="relative flex gap-2.5 items-start">
      <span className="relative z-10 w-7 h-7 rounded-full bg-white border border-ink-200 text-ink-500 flex items-center justify-center shrink-0">
        <Icon size={13} />
      </span>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-[12px] text-ink-600 leading-6">
          <span className="font-medium text-ink-800">{e.actor}</span> <span className="text-ink-400">({actorLabel[e.actorKind]})</span> {text}
          {e.kind === "link" && e.to && (
            <button onClick={() => onOpen(e.to!)} className="text-brand-700 hover:underline font-mono mr-1" dir="ltr">
              {e.to}
            </button>
          )}
          <span className="text-[10.5px] text-ink-400 mr-2" title={fmtTs(e.at)}>
            {fmtTs(e.at)}
          </span>
        </p>
        {e.kind === "rating" && e.to && (
          <div className="mt-0.5">
            <Stars value={Number(e.to)} size={13} />
          </div>
        )}
        {e.text && e.kind !== "link" && <p className="text-[12px] text-ink-500 border-r-2 border-ink-200 pr-2 mt-1 leading-6 whitespace-pre-line">{e.text}</p>}
        {e.kind === "attachment" && e.files && <FileChips names={e.files} />}
      </div>
    </li>
  );
}

function describe(e: TicketEvent, t: Ticket): { icon: typeof CircleDot; text: string } {
  switch (e.kind) {
    case "created":
      return { icon: PlusCircle, text: `تیکت را ثبت کرد (نسخه‌ی ${t.context.appVersion}).` };
    case "status":
      return { icon: ArrowLeftRight, text: `وضعیت را از «${statusShort[e.from as TicketStatus] ?? e.from}» به «${statusShort[e.to as TicketStatus] ?? e.to}» تغییر داد.` };
    case "assign":
      return { icon: UserCheck, text: e.from ? `مسئول را از «${e.from}» به «${e.to}» تغییر داد.` : `تیکت را به «${e.to}» ارجاع داد.` };
    case "priority":
      return { icon: Flag, text: `اولویت را از «${e.from}» به «${e.to}» تغییر داد.` };
    case "severity":
      return { icon: Gauge, text: `شدت اثر را از «${e.from}» به «${e.to}» تغییر داد.` };
    case "attachment":
      return { icon: Paperclip, text: `${fa(e.files?.length ?? 0)} فایل پیوست کرد.` };
    case "labels":
      return { icon: Tag, text: `برچسب‌ها را «${e.to}» کرد.` };
    case "link":
      return e.from ? { icon: Link2, text: `پیوند با ${e.from} را حذف کرد.` } : { icon: Link2, text: `پیوند «${e.text}» افزود:` };
    case "release":
      return { icon: Rocket, text: `نسخه‌ی رفع را «${e.to}» تعیین کرد.` };
    case "rating":
      return { icon: Star, text: `به پاسخ‌گویی امتیاز ${fa(Number(e.to))} از ۵ داد.` };
    default:
      return { icon: CircleDot, text: "" };
  }
}

function FileChips({ names }: { names: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1.5">
      {names.map((n) => (
        <span key={n} className="inline-flex items-center gap-1 text-[10.5px] bg-ink-100 text-ink-700 rounded px-1.5 py-0.5 max-w-[200px]">
          <FileText size={10} className="shrink-0" />
          <span className="truncate" dir="ltr">
            {n}
          </span>
        </span>
      ))}
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
      <span className="text-[12px] text-ink-500 shrink-0">{k}</span>
      <span className="text-[12.5px] text-ink-800 min-w-0 text-left">{children}</span>
    </div>
  );
}

function DetailsTab({ t, asVendor, canAttach, onOpen }: { t: Ticket; asVendor: boolean; canAttach: boolean; onOpen: (id: string) => void }) {
  const tk = useTickets();
  const { notify } = useToast();
  const [linkId, setLinkId] = useState("");
  const [linkKind, setLinkKind] = useState<"related" | "duplicate-of">("related");
  const [more, setMore] = useState<PickedFile[]>([]);
  const others = tk.tickets.filter((x) => x.id !== t.id && !t.links.some((l) => l.id === x.id));
  const backLinks = tk.tickets.filter((x) => x.links.some((l) => l.id === t.id));

  const sel = "input-field !py-1 text-[12px] w-auto max-w-[200px]";

  return (
    <div className="space-y-4">
      <section>
        <p className="text-[12.5px] text-ink-700 leading-7 whitespace-pre-line">{t.description}</p>
        {(t.steps || t.expected || t.actual) && (
          <div className="mt-3 grid gap-2">
            {t.steps && (
              <div className="rounded-lg bg-ink-50 border border-ink-200 px-3 py-2">
                <p className="text-[11px] font-bold text-ink-600 mb-1">مراحل بازتولید</p>
                <p className="text-[12px] text-ink-700 leading-6 whitespace-pre-line">{t.steps}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {t.expected && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <p className="text-[11px] font-bold text-emerald-700 mb-1">انتظار</p>
                  <p className="text-[12px] text-ink-700 leading-6">{t.expected}</p>
                </div>
              )}
              {t.actual && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
                  <p className="text-[11px] font-bold text-rose-700 mb-1">آنچه رخ داد</p>
                  <p className="text-[12px] text-ink-700 leading-6">{t.actual}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card px-3.5 py-1">
        <Row k="نوع">{t.type}</Row>
        <Row k="بخش سامانه">{t.module}</Row>
        <Row k="اولویت">
          {asVendor ? (
            <select value={t.priority} onChange={(e) => tk.setPriority(t.id, e.target.value as TicketPriority)} className={sel}>
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          ) : (
            <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
          )}
        </Row>
        <Row k="شدت اثر">
          {asVendor ? (
            <select value={t.severity} onChange={(e) => tk.setSeverity(t.id, e.target.value as TicketSeverity)} className={sel}>
              {severities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          ) : (
            <Badge tone={severityTone[t.severity]}>{t.severity}</Badge>
          )}
        </Row>
        <Row k="وضعیت">{statusLabel[t.status]}</Row>
        <Row k="مسئول (تیم سازنده)">{vendorById(t.assigneeId)?.name ?? "—"}</Row>
        <Row k="نسخه‌ی رفع">
          {asVendor ? (
            <select value={t.fixedIn ?? ""} onChange={(e) => tk.setRelease(t.id, e.target.value || undefined)} className={sel}>
              <option value="">نامشخص</option>
              {releaseVersions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          ) : (
            (t.fixedIn ?? "—")
          )}
        </Row>
        <Row k="ثبت">{fmtTs(t.createdAt)}</Row>
        <Row k="آخرین تغییر">{fmtTs(t.updatedAt)}</Row>
      </section>

      <section>
        <p className="text-[12px] font-bold text-ink-700 mb-1.5 flex items-center gap-1.5">
          <Tag size={13} /> برچسب‌ها
        </p>
        {asVendor ? (
          <LabelsInput value={t.labels} onChange={(v) => tk.setLabels(t.id, v)} suggestions={["تکراری", "رگرسیون", "زیرساخت", "رابط کاربری", "کارایی", "امنیت"]} />
        ) : t.labels.length ? (
          <div className="flex gap-1 flex-wrap">
            {t.labels.map((l) => (
              <Badge key={l} tone="brand">
                {l}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-400">—</p>
        )}
      </section>

      <section>
        <p className="text-[12px] font-bold text-ink-700 mb-1.5 flex items-center gap-1.5">
          <Link2 size={13} /> تیکت‌های مرتبط
        </p>
        {t.links.length + backLinks.length === 0 && <p className="text-[12px] text-ink-400">پیوندی ثبت نشده است.</p>}
        <div className="space-y-1">
          {t.links.map((l) => {
            const o = tk.get(l.id);
            return (
              <div key={l.id} className="flex items-center gap-2 text-[12px]">
                <Badge tone={l.kind === "duplicate-of" ? "warning" : "neutral"}>{l.kind === "duplicate-of" ? "تکراریِ" : "مرتبط با"}</Badge>
                <button onClick={() => onOpen(l.id)} className="flex-1 min-w-0 text-right truncate text-brand-700 hover:underline">
                  <span className="font-mono" dir="ltr">
                    {l.id}
                  </span>{" "}
                  {o?.title}
                </button>
                {asVendor && (
                  <button onClick={() => tk.removeLink(t.id, l.id)} className="text-ink-400 hover:text-rose-600" aria-label="حذف پیوند">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {backLinks.map((o) => (
            <div key={o.id} className="flex items-center gap-2 text-[12px]">
              <Badge tone="neutral">{o.links.find((l) => l.id === t.id)?.kind === "duplicate-of" ? "تکرارِ این" : "مرتبط"}</Badge>
              <button onClick={() => onOpen(o.id)} className="flex-1 min-w-0 text-right truncate text-brand-700 hover:underline">
                <span className="font-mono" dir="ltr">
                  {o.id}
                </span>{" "}
                {o.title}
              </button>
            </div>
          ))}
        </div>
        {asVendor && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <select value={linkKind} onChange={(e) => setLinkKind(e.target.value as "related" | "duplicate-of")} className={sel}>
              <option value="related">مرتبط با</option>
              <option value="duplicate-of">تکراریِ (و بستن)</option>
            </select>
            <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className="input-field !py-1 text-[12px] flex-1 min-w-[140px]">
              <option value="">انتخاب تیکت…</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!linkId}
              onClick={() => {
                tk.addLink(t.id, { id: linkId, kind: linkKind });
                notify(linkKind === "duplicate-of" ? `به‌عنوان تکراریِ ${linkId} بسته شد.` : "پیوند افزوده شد.");
                setLinkId("");
              }}
            >
              افزودن
            </Button>
          </div>
        )}
      </section>

      <section>
        <p className="text-[12px] font-bold text-ink-700 mb-1.5 flex items-center gap-1.5">
          <Paperclip size={13} /> پیوست‌ها ({fa(t.attachments.length)})
        </p>
        <div className="space-y-1">
          {t.attachments.map((a) => (
            <div key={a.name + a.at} className="flex items-center gap-2 text-[11.5px] rounded-lg border border-ink-200 px-2.5 py-1.5">
              <FileText size={13} className="text-ink-400 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-ink-800" dir="ltr" style={{ textAlign: "right" }}>
                {a.name}
              </span>
              <span className="text-ink-400 shrink-0">{fmtSize(a.size)}</span>
              <span className="text-ink-400 shrink-0 hidden sm:inline">{a.by}</span>
            </div>
          ))}
        </div>
        {canAttach && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <FilePicker files={more} onChange={setMore} label="افزودن فایل" />
            {more.length > 0 && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  tk.addAttachments(t.id, more);
                  setMore([]);
                  notify("فایل‌ها پیوست شد.");
                }}
              >
                ثبت پیوست‌ها
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg bg-ink-50 border border-ink-200 pt-2.5">
        <p className="px-3 pb-2 text-[12px] font-bold text-ink-700">اطلاعات فنیِ ثبت‌شده‌ی خودکار</p>
        <ContextGrid ctx={t.context} />
      </section>

      {t.rating && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[12px] font-bold text-ink-700 flex items-center gap-2">
            رضایت گزارش‌دهنده <Stars value={t.rating.score} size={14} /> <span className="text-ink-500 font-normal">{ratingLabel[t.rating.score]}</span>
          </p>
          {t.rating.comment && <p className="text-[12px] text-ink-600 mt-1">«{t.rating.comment}»</p>}
        </section>
      )}
    </div>
  );
}

function StatusModal({ open, onClose, t, onDone }: { open: boolean; onClose: () => void; t: Ticket; onDone: (to: TicketStatus, msg: string) => void }) {
  const tk = useTickets();
  const { notify } = useToast();
  const options = vendorTransitions[t.status];
  const [to, setTo] = useState<TicketStatus | "">("");
  const [msg, setMsg] = useState("");
  const [fixedIn, setFixedIn] = useState(t.fixedIn ?? releaseVersions[1]);
  const target = to || options[0];
  const close = () => {
    setTo("");
    setMsg("");
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title={`تغییر وضعیت ${t.id}`} description={`وضعیت فعلی: ${statusLabel[t.status]}`}>
      <div className="space-y-3">
        <div className="grid gap-1.5">
          {options.map((s) => (
            <label key={s} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-[12.5px] ${target === s ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-700"}`}>
              <input type="radio" checked={target === s} onChange={() => setTo(s)} className="accent-[var(--color-brand-600)]" />
              {statusLabel[s]}
            </label>
          ))}
        </div>
        {target === "resolved" && (
          <Field label="در کدام نسخه رفع شد؟">
            <select value={fixedIn} onChange={(e) => setFixedIn(e.target.value)} className="input-field w-full">
              {releaseVersions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="پیام به گزارش‌دهنده (اختیاری)" hint={target === "need-info" ? "بنویسید دقیقاً چه اطلاعاتی لازم است؛ ساعت SLA تا پاسخ کاربر متوقف می‌شود." : undefined}>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="input-field w-full resize-y" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            انصراف
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              tk.setStatus(t.id, target, msg, target === "resolved" ? fixedIn : undefined);
              onDone(target, msg.trim());
              notify(`وضعیت به «${statusShort[target]}» تغییر کرد.`);
              close();
            }}
          >
            ثبت
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReopenModal({ open, onClose, t }: { open: boolean; onClose: () => void; t: Ticket }) {
  const tk = useTickets();
  const { notify } = useToast();
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onClose={onClose} title={`بازگشایی ${t.id}`} description="تیکت به صف بررسی تیم سازنده برمی‌گردد و ساعت SLA ادامه پیدا می‌کند.">
      <div className="space-y-3">
        <Field label="چرا مشکل هنوز باقی است؟">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input-field w-full resize-y" autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            variant="primary"
            icon={<RotateCcw size={14} />}
            disabled={reason.trim().length < 3}
            onClick={() => {
              tk.reopen(t.id, reason);
              notify("تیکت بازگشایی شد.", "info");
              setReason("");
              onClose();
            }}
          >
            بازگشایی
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RateModal({ mode, onClose, t }: { mode: "confirm" | "rate" | null; onClose: () => void; t: Ticket }) {
  const tk = useTickets();
  const { notify } = useToast();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <Modal open={!!mode} onClose={onClose} title={mode === "confirm" ? "تأیید رفع مشکل" : "امتیاز رضایت"} description="از پاسخ‌گویی تیم سازنده چقدر راضی بودید؟">
      <div className="space-y-3 text-center">
        <Stars value={score} onChange={setScore} size={28} />
        <p className="text-[12.5px] text-ink-600">{ratingLabel[score]}</p>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="input-field w-full resize-y text-right" placeholder="نظر شما (اختیاری)" />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            variant="primary"
            icon={<MessageSquareText size={14} />}
            onClick={() => {
              if (mode === "confirm") tk.confirmResolution(t.id, score, comment);
              else tk.rate(t.id, score, comment);
              notify(mode === "confirm" ? "رفع مشکل تأیید شد و تیکت بسته شد. سپاس از بازخورد شما." : "امتیاز شما ثبت شد.");
              setComment("");
              onClose();
            }}
          >
            {mode === "confirm" ? "تأیید و بستن" : "ثبت امتیاز"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
