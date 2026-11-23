// ---------------------------------------------------------------------------
// صفحه‌ی جلسه (/meetings/:id) — چیدمان v6.8: سرآیند (زمان، شیوه و محل، برگزارکننده، وضعیت، نقش‌ها،
// حاضران در یک نگاه)، «قبل از جلسه»، «صورت‌جلسه»، «مصوبات و کارها»، «خروجی‌ها و فایل‌ها»، پیامک و امضا،
// ستون کناری «حاضران» و «این جلسه در یک نگاه». صورتجلسه‌ی سازمانی میزیتو: پیش‌نویس ← در حال تشکیل
// (با ارسال دعوت‌نامه) ← در انتظار امضا (قفل ویرایش) ← امضاشده (قاعده‌ی پیش‌فرض: نصف + ۱ حاضران).
// بدون ضبط/نتیجه/گفتگو (بعداً) و بدون خلاصه‌ی خودکار.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookPlus, CheckCircle2, Circle, ExternalLink, FileText, Lock, MessageSquareText, PenLine, Printer, Send, Users, Video, MapPin, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Note from "../../components/ui/Note";
import Stepper, { type Step } from "../../components/ui/Stepper";
import EmptyState from "../../components/ui/EmptyState";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import Avatar, { AvatarStack } from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useMeetings, isLocked } from "../../context/MeetingsContext";
import { fa } from "../../pm/jalali";
import { isoDate, jalaliOf } from "../../pm/api";
import { isProjectManager } from "../../pm/rules";
import { printNode } from "../../pm/print";
import { canSign, neededSignatures, signedCount, signersOf } from "../../meetings/signature";
import { attendanceLabel, meetingStatusLabel, meetingTypeLabel, roleLabel, signRuleLabel, smsKindLabel, type MeetingResolution, type MeetingView, type MinutesStatus, type SignRule, type SmsKind } from "../../meetings/types";
import { MinutesStatusBadge, ParticipantsEditor } from "./MeetingSheet";
import MinutesPrint from "./MinutesPrint";

const order: MinutesStatus[] = ["draft", "forming", "awaiting_signature", "signed"];

export default function MeetingPage() {
  const { id = "" } = useParams();
  const rid = decodeURIComponent(id);
  const meetings = useMeetings();
  const v = meetings.byRoute(rid);
  if (!v)
    return (
      <div>
        <PageHeader title="رویدادها و جلسات" breadcrumb={[{ label: "رویدادها و جلسات", to: "/events?tab=meetings" }, { label: "جلسه" }]} />
        <EmptyState title="جلسه پیدا نشد" description="ممکن است حذف شده باشد یا به آن دسترسی نداشته باشید." action={<Link to="/events?tab=meetings" className="btn btn-outline">بازگشت به جلسات</Link>} />
      </div>
    );
  return <MeetingBody v={v} />;
}

function MeetingBody({ v }: { v: MeetingView }) {
  const m = useMeetings();
  const pm = useProjectsPM();
  const { actingUser, hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const me = actingUser.name;
  const locked = isLocked(v);
  const project = v.pid ? pm.getProject(v.pid) : undefined;
  const iParticipate = v.participants.some((x) => x.principal_id === actingUser.id || x.name === me);
  const myRole = v.participants.find((x) => x.principal_id === actingUser.id || x.name === me)?.role;
  // ویرایش: برگزارکننده، رئیس/دبیر، مدیر پروژه‌ی مرتبط، یا مدیر جلسات پروژه
  const canEdit = v.organizer === me || myRole === "chair" || myRole === "secretary" || (!!project && isProjectManager(project, me)) || (v.source === "project" && hasPermission("projects.meetings") && iParticipate);
  const editable = canEdit && !locked && v.status !== 3;
  const org = v.kind === "organizational";

  const [text, setText] = useState(v.minutes_text);
  const [decisions, setDecisions] = useState(v.decisions.join("\n"));
  const [agenda, setAgenda] = useState(v.agenda.join("\n"));
  const [editPeople, setEditPeople] = useState(false);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [res, setRes] = useState<{ description: string; assignee: string; due: string; project: string }>({ description: "", assignee: "", due: pm.refDate, project: v.pid ?? "" });
  useEffect(() => {
    setText(v.minutes_text);
    setDecisions(v.decisions.join("\n"));
    setAgenda(v.agenda.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.route_id, v.minutes_text, v.decisions.join("|"), v.agenda.join("|")]);

  const dirty = text !== v.minutes_text || decisions !== v.decisions.join("\n");
  const present = v.participants.filter((x) => x.attendance === "present").length;
  const absent = v.participants.filter((x) => x.attendance === "absent").length;
  const unknown = v.participants.length - present - absent;
  const myProjects = pm.projects.filter((p) => !p.meta.archived && (p.meta.manager === me || p.members.some((x) => x.name === me || x.userId === actingUser.id)));
  const resProject = pm.getProject(res.project || undefined);

  const saveMinutes = () => {
    if (!m.saveMinutes(v, { minutes_text: text, decisions: decisions.split("\n").map((x) => x.trim()).filter(Boolean) })) return notify("صورتجلسه قفل است.", "warning");
    notify("صورتجلسه ذخیره شد.");
  };
  const addResolution = () => {
    if (!res.description.trim() || !res.assignee) return notify("شرح مصوبه و مسئول اجرا لازم است.", "warning");
    const r: MeetingResolution = { id: `rs${Date.now().toString(36)}`, description: res.description.trim(), assignee: res.assignee, due_date: isoDate(res.due), project: res.project || null, linked_task: null };
    m.saveMinutes(v, { resolutions: [...v.resolutions.map(({ id, description, assignee, due_date, project, linked_task }) => ({ id, description, assignee, due_date, project, linked_task })), r] });
    setRes({ ...res, description: "" });
  };
  const removeResolution = (rid: string) => m.saveMinutes(v, { resolutions: v.resolutions.filter((x) => x.id !== rid).map(({ id, description, assignee, due_date, project, linked_task }) => ({ id, description, assignee, due_date, project, linked_task })) });

  const sendSms = (kind: SmsKind) => {
    const n = m.sms(v, kind, kind === "custom" ? custom : undefined);
    if (!n) return notify(kind === "custom" ? "متن پیامک را بنویسید." : "گیرنده‌ای نیست.", "warning");
    if (kind === "custom") setCustom("");
    notify(`پیامک «${smsKindLabel[kind]}» برای ${fa(n)} نفر فرستاده شد (شبیه‌سازی؛ ارسال واقعی با تأمین‌کننده‌ی پیامک سامانه).`);
  };

  const steps: Step[] = order.map((_s, i) => ({
    label: ["پیش‌نویس", "در حال تشکیل جلسه", "در انتظار امضا", "امضاشده"][i],
    description: ["مشخصات و اعضا", "دعوت‌نامه رفته؛ حضور، متن و مصوبات", "ویرایش قفل است", `${signRuleLabel[v.sign_rule.mode]}`][i],
    state: order.indexOf(v.minutes_status) > i || v.minutes_status === "signed" ? "done" : order.indexOf(v.minutes_status) === i ? "current" : "todo",
  }));

  const nextAction = (() => {
    if (!canEdit && v.minutes_status !== "awaiting_signature") return null;
    if (v.minutes_status === "draft")
      return (
        <Button variant="primary" icon={<Send size={16} />} onClick={() => notify(`دعوت‌نامه برای ${fa(m.sendInvites(v))} نفر پیامک شد؛ صورتجلسه رسمی شد.`)}>
          ارسال دعوت‌نامه
        </Button>
      );
    if (v.minutes_status === "forming" && org)
      return (
        <Button
          variant="primary"
          icon={<PenLine size={16} />}
          disabled={!v.minutes_text.trim() || dirty}
          title={!v.minutes_text.trim() ? "ابتدا متن صورتجلسه را بنویسید و ذخیره کنید" : undefined}
          onClick={() =>
            confirm({
              title: "ارسال صورتجلسه برای امضا؟",
              message: `پس از ارسال، متن، مصوبات و حضور و غیاب قفل می‌شود. قاعده: ${signRuleLabel[v.sign_rule.mode]} — ${fa(neededSignatures(v))} امضا از ${fa(signersOf(v).length)} نفر.`,
              confirmLabel: "ارسال برای امضا",
              onConfirm: () => {
                const err = m.sendForSignature(v);
                notify(err ?? "صورتجلسه برای امضا فرستاده شد.", err ? "warning" : "success");
              },
            })
          }
        >
          ارسال برای امضا
        </Button>
      );
    return null;
  })();

  const glance: [string, boolean][] = [
    ["دستور جلسه", v.agenda.length > 0],
    ["حضور و غیاب", v.participants.length > 0 && unknown === 0],
    ["متن صورتجلسه", !!v.minutes_text.trim()],
    ["مصوبه", v.decisions.length > 0 || v.resolutions.length > 0],
    ["کار ساخته‌شده", v.resolutions.some((r) => r.linked_task)],
    ...(org ? ([["امضا", v.minutes_status === "signed"]] as [string, boolean][]) : []),
    ["خروجی و فایل", v.files.length > 0],
  ];

  return (
    <div>
      <PageHeader
        title={v.title}
        description={v.description || (v.project_name ? `جلسه‌ی پروژه‌ی «${v.project_name}»` : "صورتجلسه‌ی سازمانی")}
        breadcrumb={[{ label: "رویدادها و جلسات", to: "/events?tab=meetings" }, { label: v.title }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" icon={<Printer size={16} />} onClick={() => printNode(printRef.current, `صورتجلسه — ${v.title}`)}>
              چاپ
            </Button>
            {v.pid && (
              <Link to={`/projects/${v.pid}?tab=minutes${v.source === "project" ? `&focus=${v.mid}` : ""}`} className="btn btn-outline">
                صفحه‌ی پروژه
              </Link>
            )}
            <Link to="/events?tab=meetings" className="btn btn-ghost">
              <ArrowRight size={16} /> بازگشت به جلسات
            </Link>
          </div>
        }
      />

      {/* سرآیند */}
      <Card flush className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          <div>
            <p className="cap">زمان</p>
            <p className="font-bold text-ink-900">{v.date}</p>
            <p className="text-[13px] text-ink-500">
              ساعت {v.time} ({fa(v.duration)} دقیقه)
            </p>
          </div>
          <div>
            <p className="cap">شیوه و محل</p>
            <p className="font-bold text-ink-900 flex items-center gap-1">
              {v.meeting_type === 2 ? <Video size={15} /> : <MapPin size={15} />} {meetingTypeLabel[v.meeting_type]}
            </p>
            {v.link ? (
              <a href={v.link} target="_blank" rel="noreferrer" className="text-[13px] text-teal-700 underline inline-flex items-center gap-1">
                پیوند ورود <ExternalLink size={12} />
              </a>
            ) : (
              <p className="text-[13px] text-ink-500">{v.location || "—"}</p>
            )}
          </div>
          <div>
            <p className="cap">برگزارکننده</p>
            <p className="font-bold text-ink-900">{v.organizer}</p>
            {v.project_name && <p className="text-[13px] text-ink-500">{v.project_name}</p>}
          </div>
          <div>
            <p className="cap">وضعیت</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={v.status === 3 ? "danger" : v.status === 2 ? "success" : "info"} dot>
                {meetingStatusLabel[v.status]}
              </Badge>
              <MinutesStatusBadge m={v} />
            </div>
            <p className="text-[13px] text-ink-500 mt-1">{fa(v.participants.length)} دعوت‌شده</p>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] text-[13.5px] text-ink-700">
          <b>نقش‌ها: </b>
          {v.participants.filter((x) => x.role !== "member").map((x) => `${roleLabel[x.role]}: ${x.external_name ?? x.name}`).join(" · ") || "نقشی تعیین نشده"}
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center gap-2 flex-wrap">
          <b className="text-[13.5px]">حاضران در یک نگاه:</b>
          <Badge tone="success" dot>
            {fa(present)} نفر حاضر
          </Badge>
          {absent > 0 && (
            <Badge tone="danger" dot>
              {fa(absent)} نفر غایب
            </Badge>
          )}
          {unknown > 0 && (
            <Badge tone="warning" dot>
              {fa(unknown)} نفر نامشخص
            </Badge>
          )}
          <span className="mr-auto">
            <AvatarStack people={v.participants.map((x) => ({ name: x.name }))} size={28} />
          </span>
        </div>
      </Card>

      {org && (
        <Card className="mb-4" title="روند صورتجلسه" icon={<FileText size={20} />} actions={nextAction}>
          <Stepper steps={steps} orientation="horizontal" />
          {locked && (
            <Note tone="info" className="mt-3" icon={<Lock size={16} />}>
              {v.minutes_status === "signed" ? "صورتجلسه امضا شده و ویرایش‌پذیر نیست؛ مصوبات به کار تبدیل و برای مسئولان فرستاده شد." : "صورتجلسه در انتظار امضاست؛ ویرایش تا پایان امضا قفل است."}
            </Note>
          )}
        </Card>
      )}
      {!org && v.minutes_status === "draft" && canEdit && (
        <Note tone="info" className="mb-4" actions={nextAction}>
          صورتجلسه‌ی ساده: پس از ارسال دعوت‌نامه، متن و مصوبات را ثبت کنید.
        </Note>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="space-y-4 min-w-0">
          <Card title="قبل از جلسه" description="دستور جلسه و فایل‌هایی که باید پیش از برگزاری دیده شوند">
            {v.source === "org" && editable ? (
              <div className="space-y-2">
                <textarea className="input-field min-h-[90px]" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="هر خط یک بند دستور جلسه" />
                {agenda !== v.agenda.join("\n") && (
                  <Button size="sm" variant="tonal" onClick={() => (m.patch(v, { agenda: agenda.split("\n").map((x) => x.trim()).filter(Boolean) }), notify("دستور جلسه ذخیره شد."))}>
                    ذخیره‌ی دستور جلسه
                  </Button>
                )}
              </div>
            ) : v.agenda.length ? (
              <ol className="list-decimal pr-5 space-y-1 text-[14px] text-ink-800">
                {v.agenda.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            ) : (
              <p className="text-[13.5px] text-ink-500">دستور جلسه ثبت نشده است.</p>
            )}
          </Card>

          <Card
            title="صورت‌جلسه"
            description="متن رسمی جلسه و تصمیم‌ها"
            actions={
              <Button size="sm" variant="outline" icon={<BookPlus size={15} />} onClick={() => navigate(`/knowledge/documents?new=1&from=meeting:${encodeURIComponent(v.route_id)}`)}>
                ثبت در دانشنامه
              </Button>
            }
          >
            <label className="field">
              <span className="text-[13px] font-medium">متن صورت‌جلسه</span>
              <textarea className="input-field min-h-[160px]" value={text} disabled={!editable} onChange={(e) => setText(e.target.value)} placeholder="موضوعات مطرح‌شده، نظرها و تصمیم‌ها به ترتیب…" />
            </label>
            <label className="field mt-3">
              <span className="text-[13px] font-medium">مصوبات (هر خط یک مصوبه)</span>
              <textarea className="input-field min-h-[80px]" value={decisions} disabled={!editable} onChange={(e) => setDecisions(e.target.value)} />
            </label>
            {editable && dirty && (
              <div className="flex gap-2 mt-3">
                <Button variant="primary" onClick={saveMinutes}>
                  ذخیره‌ی صورتجلسه
                </Button>
                <Button variant="ghost" onClick={() => (setText(v.minutes_text), setDecisions(v.decisions.join("\n")))}>
                  بازگردانی
                </Button>
              </div>
            )}
          </Card>

          <Card title="مصوبات و کارها" description="هر اقدام به کار تبدیل می‌شود؛ پیگیری از وضعیت همان کار در «فعالیت و وظایف» مسئول است.">
            <div className="divide-y divide-[var(--color-border)]">
              {v.resolutions.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center gap-2 flex-wrap">
                  <span className="flex-1 min-w-[12rem]">
                    <span className="block text-sm text-ink-900">{r.description}</span>
                    <span className="block text-[12.5px] text-ink-500">
                      مسئول: {r.assignee} · مهلت: {r.due || "—"}
                      {r.project && v.source === "org" ? ` · ${pm.getProject(r.project)?.meta.name ?? ""}` : ""}
                    </span>
                  </span>
                  {r.linked_task ? (
                    <Badge tone={r.done ? "success" : "warning"} dot>
                      {r.done ? "اجرا شد" : `کار: ${r.task_status ?? "باز"}`}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">کار ساخته نشده</Badge>
                  )}
                  {r.linked_task && r.project && (
                    <Link className="btn btn-link btn-sm" to={`/projects/${r.project}?tab=board&focus=${r.linked_task}`}>
                      پیگیری
                    </Link>
                  )}
                  {!r.linked_task && canEdit && (v.source === "project" || r.project) && (
                    <Button size="sm" variant="tonal" onClick={() => (m.convertResolution(v, r.id) ? notify(`مصوبه به کار تبدیل و به «${r.assignee}» اعلان شد.`) : notify("پروژه‌ی مقصد را مشخص کنید.", "warning"))}>
                      تبدیل به کار
                    </Button>
                  )}
                  {editable && !r.linked_task && (
                    <button className="btn btn-ghost btn-icon btn-sm text-rose-600" onClick={() => removeResolution(r.id)} aria-label="حذف مصوبه">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {v.resolutions.length === 0 && <p className="text-[13.5px] text-ink-500 py-2">هنوز مصوبه‌ای ثبت نشده است.</p>}
            </div>
            {editable && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
                <input className="input-field" placeholder="مصوبه یا اقدام جدید…" value={res.description} onChange={(e) => setRes({ ...res, description: e.target.value })} />
                {v.source === "org" && (
                  <select className="input-field" value={res.project} onChange={(e) => setRes({ ...res, project: e.target.value, assignee: "" })} aria-label="پروژه‌ی کار">
                    <option value="">پروژه‌ی کار…</option>
                    {myProjects.map((p) => (
                      <option key={p.meta.id} value={p.meta.id}>
                        {p.meta.name}
                      </option>
                    ))}
                  </select>
                )}
                <select className="input-field" value={res.assignee} onChange={(e) => setRes({ ...res, assignee: e.target.value })} aria-label="مسئول اجرا">
                  <option value="">مسئول…</option>
                  {[...new Set([...(resProject ?? project)?.members.map((x) => x.name) ?? [], ...v.participants.filter((x) => x.principal_id).map((x) => x.name)])].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <div className="sm:col-span-3 flex gap-2 items-center">
                  <span className="text-[13px] text-ink-600">مهلت</span>
                  <div className="w-48">
                    <JalaliDatePicker value={res.due} onChange={(d) => setRes({ ...res, due: d })} />
                  </div>
                  <Button variant="tonal" icon={<Plus size={14} />} onClick={addResolution}>
                    افزودن مصوبه
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title="خروجی‌ها و فایل‌ها" description="ارائه‌ها، گزارش‌ها و هر سندی که از جلسه به دست آمد">
            {v.files.length ? (
              <ul className="space-y-1">
                {v.files.map((f) => (
                  <li key={f.id}>
                    <Link to={`/projects/${v.pid}?tab=documents&focus=${f.id}`} className="text-sm text-teal-700 hover:underline inline-flex items-center gap-1">
                      <FileText size={14} /> {f.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-ink-500">{v.source === "project" ? "خروجی‌ای بارگذاری نشده است؛ از تب «جلسات» پروژه فایل پیوست کنید." : "خروجی‌ای بارگذاری نشده است."}</p>
            )}
          </Card>

          {org && (
            <Card title="امضای صورتجلسه" icon={<PenLine size={20} />} description={`${signRuleLabel[v.sign_rule.mode]} — ${fa(signedCount(v))} از ${fa(neededSignatures(v))} امضای لازم`}>
              {v.minutes_status !== "awaiting_signature" && v.minutes_status !== "signed" && canEdit && (
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  <span className="text-[13px] text-ink-600">قاعده‌ی امضا:</span>
                  <select className="input-field !w-auto" value={v.sign_rule.mode} onChange={(e) => m.patch(v, { sign_rule: { mode: e.target.value as SignRule["mode"], signer_ids: e.target.value === "named" ? v.participants.filter((x) => x.role === "chair" || x.role === "secretary").map((x) => x.id) : undefined } })}>
                    {(Object.keys(signRuleLabel) as SignRule["mode"][]).map((x) => (
                      <option key={x} value={x}>
                        {signRuleLabel[x]}
                      </option>
                    ))}
                  </select>
                  {v.sign_rule.mode === "named" && (
                    <span className="flex flex-wrap gap-1">
                      {v.participants.filter((x) => x.principal_id).map((x) => {
                        const on = v.sign_rule.signer_ids?.includes(x.id);
                        return (
                          <button key={x.id} className={`text-[12px] px-2 py-0.5 rounded-full border ${on ? "bg-teal-50 border-teal-500 text-teal-700" : "border-ink-200 text-ink-600"}`} aria-pressed={on} onClick={() => m.patch(v, { sign_rule: { mode: "named", signer_ids: on ? v.sign_rule.signer_ids?.filter((y) => y !== x.id) : [...(v.sign_rule.signer_ids ?? []), x.id] } })}>
                            {x.name}
                          </button>
                        );
                      })}
                    </span>
                  )}
                </div>
              )}
              <ul className="space-y-1.5">
                {signersOf(v).map((x) => (
                  <li key={x.id} className="flex items-center gap-2 text-sm">
                    {x.signature?.state === "signed" ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-ink-400" />}
                    <span className="flex-1">
                      {x.name} <span className="text-[12px] text-ink-500">· {roleLabel[x.role]}</span>
                    </span>
                    <span className="text-[12.5px] text-ink-500">{x.signature?.state === "signed" ? `امضا: ${jalaliOf(x.signature.at)}` : x.signature?.state === "rejected" ? `رد${x.signature.note ? `: ${x.signature.note}` : ""}` : v.minutes_status === "awaiting_signature" ? "منتظر امضا" : "—"}</span>
                  </li>
                ))}
                {signersOf(v).length === 0 && <li className="text-[13.5px] text-ink-500">امضاکنندگان از میان حاضرانِ عضو سازمان تعیین می‌شوند؛ ابتدا حضور و غیاب را ثبت کنید.</li>}
              </ul>
              {canSign(v, actingUser.id) && v.minutes_status === "awaiting_signature" && (
                <div className="mt-3 flex gap-2 flex-wrap items-center">
                  <input className="input-field flex-1 min-w-[10rem]" placeholder="یادداشت (اختیاری، برای رد)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button variant="primary" icon={<PenLine size={15} />} onClick={() => notify(m.sign(v, "signed", note) ? "امضا ثبت شد؛ صورتجلسه با حد نصاب امضا شد و مصوبات به کار تبدیل شدند." : "امضای شما ثبت شد.")}>
                    امضا می‌کنم
                  </Button>
                  <Button variant="danger-outline" onClick={() => (m.sign(v, "rejected", note), notify("عدم امضای شما ثبت شد.", "info"))}>
                    امضا نمی‌کنم
                  </Button>
                </div>
              )}
            </Card>
          )}

          {org && (
            <Card title="پیامک به اعضا" icon={<MessageSquareText size={20} />} description="ارسال شبیه‌سازی‌شده و ثبت در سابقه؛ ارسال واقعی با تأمین‌کننده‌ی «تنظیمات پیامک» سامانه.">
              {canEdit && v.status !== 3 && (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(["reminder", "changed", "sign_request"] as SmsKind[]).map((k) => (
                      <Button key={k} size="sm" variant="outline" disabled={k === "sign_request" && v.minutes_status !== "awaiting_signature"} onClick={() => sendSms(k)}>
                        {smsKindLabel[k]}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className="input-field flex-1" placeholder="متن پیامک دلخواه به اعضای جلسه…" value={custom} onChange={(e) => setCustom(e.target.value)} />
                    <Button variant="tonal" icon={<Send size={14} />} onClick={() => sendSms("custom")}>
                      ارسال
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-[13.5px] mt-3">
                    <input type="checkbox" className="w-4 h-4" checked={v.reminder.enabled} onChange={(e) => m.patch(v, { reminder: { ...v.reminder, enabled: e.target.checked } })} />
                    یادآوری پیامکی خودکار
                    <select className="input-field !w-auto !h-9" value={v.reminder.minutes_before} disabled={!v.reminder.enabled} onChange={(e) => m.patch(v, { reminder: { ...v.reminder, minutes_before: Number(e.target.value) } })} aria-label="زمان یادآوری">
                      {[15, 30, 60, 120, 1440].map((n) => (
                        <option key={n} value={n}>
                          {n === 1440 ? "یک روز" : `${fa(n)} دقیقه`} پیش از جلسه
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <h4 className="text-[13px] font-bold text-ink-800 mt-4 mb-1.5">سابقه‌ی پیامک‌ها</h4>
              <ul className="space-y-2">
                {v.sms_log.map((s) => (
                  <li key={s.id} className="text-[13px] text-ink-700 rounded-[10px] bg-ink-50 px-3 py-2">
                    <span className="flex items-center gap-2 flex-wrap text-[12px] text-ink-500 mb-0.5">
                      <Badge tone="neutral">{smsKindLabel[s.kind]}</Badge>
                      {jalaliOf(s.at)} · {s.by} · {fa(s.recipients.length)} گیرنده
                    </span>
                    {s.text}
                  </li>
                ))}
                {v.sms_log.length === 0 && <li className="text-[13px] text-ink-500">پیامکی فرستاده نشده است.</li>}
              </ul>
            </Card>
          )}
        </div>

        {/* ستون کناری */}
        <aside className="space-y-4 min-w-0">
          <Card
            title="حاضران"
            icon={<Users size={20} />}
            actions={
              editable ? (
                <Button size="sm" variant="ghost" onClick={() => setEditPeople((x) => !x)}>
                  {editPeople ? "پایان ویرایش" : "ویرایش اعضا"}
                </Button>
              ) : undefined
            }
          >
            {editPeople && editable ? (
              <ParticipantsEditor value={v.participants} onChange={(ps) => m.setParticipants(v, ps)} />
            ) : (
              <ul className="space-y-3">
                {v.participants.map((x) => (
                  <li key={x.id}>
                    <div className="flex items-center gap-2">
                      <Avatar name={x.name} size={32} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-ink-900 truncate">
                          {x.external_name ?? x.name}
                          {x.name === me ? " (شما)" : ""}
                        </span>
                        <span className="block text-[12px] text-ink-500">{roleLabel[x.role]}</span>
                      </span>
                      {editable ? (
                        <select className="input-field !w-auto !h-8 !text-[12.5px]" value={x.attendance} onChange={(e) => m.setAttendance(v, x.id, e.target.value as typeof x.attendance)} aria-label={`حضور ${x.name}`}>
                          {(["present", "absent", "unknown"] as const).map((a) => (
                            <option key={a} value={a}>
                              {attendanceLabel[a]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={x.attendance === "present" ? "success" : x.attendance === "absent" ? "danger" : "warning"} dot>
                          {attendanceLabel[x.attendance]}
                        </Badge>
                      )}
                    </div>
                    {x.attendance === "absent" &&
                      (editable ? (
                        <input className="input-field !h-8 mt-1 !text-[12.5px]" placeholder="علت غیبت" defaultValue={x.absence_reason ?? ""} onBlur={(e) => e.target.value !== (x.absence_reason ?? "") && m.setAttendance(v, x.id, "absent", e.target.value)} />
                      ) : (
                        x.absence_reason && <p className="text-[12px] text-ink-500 mt-0.5 pr-10">علت غیبت: {x.absence_reason}</p>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="این جلسه در یک نگاه">
            <ul className="divide-y divide-[var(--color-border)]">
              {glance.map(([label, ok]) => (
                <li key={label} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink-800">{label}</span>
                  {ok ? <CheckCircle2 size={16} className="text-emerald-600" aria-label="انجام شده" /> : <Circle size={16} className="text-ink-300" aria-label="انجام نشده" />}
                </li>
              ))}
            </ul>
          </Card>

          {canEdit && v.status !== 3 && (
            <Card title="وضعیت جلسه">
              <div className="flex flex-wrap gap-2">
                {v.status === 1 && (
                  <Button size="sm" variant="tonal" onClick={() => (m.setStatus(v, 2), notify("جلسه «برگزارشده» ثبت شد."))}>
                    برگزار شد
                  </Button>
                )}
                <Button size="sm" variant="danger-outline" onClick={() => confirm({ title: "لغو جلسه؟", message: "به همه‌ی اعضا پیامک لغو فرستاده می‌شود.", tone: "danger", confirmLabel: "لغو جلسه", onConfirm: () => (m.setStatus(v, 3), notify("جلسه لغو شد.", "info")) })}>
                  لغو جلسه
                </Button>
                {(hasPermission("projects.create") || (project && isProjectManager(project, me))) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      m.saveTemplate({ name: v.title, title_pattern: v.title, kind: v.kind, meeting_type: v.meeting_type, duration_minutes: v.duration, location: v.location, agenda: v.agenda, participants: v.participants.map(({ principal_id, name, external_name, external_mobile, role }) => ({ principal_id, name, external_name, external_mobile, role })), reminder: v.reminder, sign_rule: v.sign_rule });
                      notify("این جلسه به‌عنوان الگو ذخیره شد (مشخصات و اعضا).");
                    }}
                  >
                    ذخیره به‌عنوان الگو
                  </Button>
                )}
              </div>
            </Card>
          )}
        </aside>
      </div>

      {/* نسخه‌ی چاپی با محل امضا */}
      <div className="hidden">
        <MinutesPrint ref={printRef} m={v} />
      </div>
    </div>
  );
}
