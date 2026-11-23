// ---------------------------------------------------------------------------
// «جلسات و صورتجلسه‌ها» (C9 — زبانه‌ی صفحه‌ی «رویدادها و جلسات»): همه‌ی جلسات پروژه‌ها و
// صورتجلسه‌های سازمانی که کاربر می‌بیند؛ فیلتر عنوان/پروژه/وضعیت صورتجلسه/«مصوبه‌ی اجرانشده»،
// برگه‌ی پیش‌نمایش، «جلسه‌ی جدید» (با الگو) و الگوها. ‎?new=meeting‎ (C3) فرم جلسه‌ی جدید را باز می‌کند.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarPlus, LayoutTemplate, MapPin, Video } from "lucide-react";
import FilterBar from "../../components/ui/FilterBar";
import ListRow, { List, ListRowDate } from "../../components/ui/ListRow";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useMeetings, type NewMeetingInput } from "../../context/MeetingsContext";
import { fa, monthNames, parseJalali } from "../../pm/jalali";
import { isoDate } from "../../pm/api";
import { modulesOf, isProjectManager } from "../../pm/rules";
import { meetingHref, minutesStatusLabel, signRuleLabel, type MeetingView, type MinutesStatus, type SignRule } from "../../meetings/types";
import { DEFAULT_SIGN_RULE } from "../../meetings/signature";
import { participantsFromTemplate, titleFromPattern } from "../../meetings/templates";
import MeetingSheet, { MinutesStatusBadge, ParticipantsEditor, openResolutions } from "./MeetingSheet";
import TemplatesDialog from "./TemplatesDialog";

type Pill = "all" | "upcoming" | MinutesStatus | "open_res";

/** فرم جلسه‌ی جدید (صورتجلسه‌ی سازمانی، با پروژه‌ی اختیاری) — WP6 هم می‌تواند مستقیم سوار کند */
export function NewMeetingDialog({ open, onClose, defaultProject }: { open: boolean; onClose: () => void; defaultProject?: string }) {
  const m = useMeetings();
  const pm = useProjectsPM();
  const { actingUser } = useTenancy();
  const { notify } = useToast();
  const navigate = useNavigate();
  const me = actingUser.name;
  const projects = pm.projects.filter((p) => !p.meta.archived && modulesOf(p).org_minutes && (p.meta.manager === me || p.members.some((x) => x.name === me || x.userId === actingUser.id)));
  const empty = (): NewMeetingInput => ({
    title: "",
    date: pm.refDate,
    time: "10:00",
    duration: 60,
    meeting_type: 1,
    link: "",
    location: "",
    description: "",
    agenda: [],
    participants: [{ id: "me", principal_id: actingUser.id, name: me, role: "chair", attendance: "unknown" }],
    kind: "organizational",
    labels: [],
    project_ref: defaultProject ?? null,
    template_id: null,
    reminder: { enabled: true, minutes_before: 60 },
    sign_rule: { ...DEFAULT_SIGN_RULE },
  });
  const [d, setD] = useState<NewMeetingInput>(empty);
  useEffect(() => {
    if (open) setD(empty());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const applyTpl = (id: string) => {
    const t = m.templates.find((x) => x.id === id);
    if (!t) return setD({ ...d, template_id: null });
    let n = 0;
    setD({ ...d, template_id: id, title: titleFromPattern(t.title_pattern, d.date), kind: t.kind, meeting_type: t.meeting_type, duration: t.duration_minutes, location: t.location, agenda: t.agenda, participants: participantsFromTemplate(t, () => `pt${++n}`), reminder: t.reminder, sign_rule: t.sign_rule });
  };
  const submit = () => {
    if (!d.title.trim()) return notify("این فیلد لازم است: عنوان جلسه.", "warning");
    if (d.meeting_type === 2 && !/^https?:\/\/\S+\.\S+/.test(d.link.trim())) return notify("برای جلسه‌ی برخط پیوند جلسه لازم است.", "warning");
    if (!d.participants.length) return notify("دست‌کم یک شرکت‌کننده لازم است.", "warning");
    const rid = m.createOrg({ ...d, title: d.title.trim() });
    notify(`صورتجلسه‌ی «${d.title.trim()}» به‌صورت پیش‌نویس ساخته شد؛ با «ارسال دعوت‌نامه» رسمی می‌شود.`);
    onClose();
    navigate(`/meetings/${encodeURIComponent(rid)}`);
  };
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title="جلسه‌ی جدید" description="صورتجلسه‌ی سازمانی با رئیس، دبیر، اعضا و مدعوین؛ جلسه‌ی پروژه را می‌توانید از تب «جلسات» همان پروژه هم بسازید." wide>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {m.templates.length > 0 && (
            <label className="field">
              <span className="text-[13px] font-medium">از الگو</span>
              <select className="input-field" value={d.template_id ?? ""} onChange={(e) => applyTpl(e.target.value)}>
                <option value="">بدون الگو</option>
                {m.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span className="text-[13px] font-medium">نوع صورتجلسه</span>
            <select className="input-field" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as NewMeetingInput["kind"] })}>
              <option value="organizational">سازمانی (حضور و غیاب، امضا، پیامک)</option>
              <option value="simple">ساده (ثبت یک‌مرحله‌ای)</option>
            </select>
          </label>
          <label className="field sm:col-span-2">
            <span className="text-[13px] font-medium">عنوان جلسه</span>
            <input className="input-field" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} autoFocus />
          </label>
          <label className="field">
            <span className="text-[13px] font-medium">تاریخ</span>
            <JalaliDatePicker value={d.date} onChange={(v) => setD({ ...d, date: v })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="field">
              <span className="text-[13px] font-medium">ساعت</span>
              <input className="input-field" dir="ltr" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} placeholder="10:00" />
            </label>
            <label className="field">
              <span className="text-[13px] font-medium">مدت (دقیقه)</span>
              <input className="input-field" inputMode="numeric" value={d.duration} onChange={(e) => setD({ ...d, duration: Number(e.target.value.replace(/\D/g, "")) || 60 })} />
            </label>
          </div>
          <label className="field">
            <span className="text-[13px] font-medium">شیوه</span>
            <select className="input-field" value={d.meeting_type} onChange={(e) => setD({ ...d, meeting_type: Number(e.target.value) as 1 | 2 })}>
              <option value={1}>حضوری</option>
              <option value={2}>برخط</option>
            </select>
          </label>
          {d.meeting_type === 2 ? (
            <label className="field">
              <span className="text-[13px] font-medium">پیوند جلسه</span>
              <input className="input-field" dir="ltr" value={d.link} onChange={(e) => setD({ ...d, link: e.target.value })} placeholder="https://meet.shub.ir/…" />
            </label>
          ) : (
            <label className="field">
              <span className="text-[13px] font-medium">محل</span>
              <input className="input-field" value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} />
            </label>
          )}
          {projects.length > 0 && (
            <label className="field">
              <span className="text-[13px] font-medium">پروژه (اختیاری)</span>
              <select className="input-field" value={d.project_ref ?? ""} onChange={(e) => setD({ ...d, project_ref: e.target.value || null })}>
                <option value="">بدون پروژه</option>
                {projects.map((p) => (
                  <option key={p.meta.id} value={p.meta.id}>
                    {p.meta.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {d.kind === "organizational" && (
            <label className="field">
              <span className="text-[13px] font-medium">قاعده‌ی امضا</span>
              <select className="input-field" value={d.sign_rule.mode} onChange={(e) => setD({ ...d, sign_rule: { mode: e.target.value as SignRule["mode"] } })}>
                {(["majority", "all", "named"] as SignRule["mode"][]).map((x) => (
                  <option key={x} value={x}>
                    {signRuleLabel[x]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="field">
          <span className="text-[13px] font-medium">شرح جلسه</span>
          <textarea className="input-field min-h-[60px]" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
        </label>
        <label className="field">
          <span className="text-[13px] font-medium">دستور جلسه (هر خط یک بند)</span>
          <textarea className="input-field min-h-[70px]" value={d.agenda.join("\n")} onChange={(e) => setD({ ...d, agenda: e.target.value.split("\n") })} />
        </label>
        <div>
          <p className="text-[13px] font-medium mb-1.5">شرکت‌کنندگان و نقش‌ها</p>
          <ParticipantsEditor value={d.participants} onChange={(participants) => setD({ ...d, participants })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="w-4 h-4" checked={d.reminder.enabled} onChange={(e) => setD({ ...d, reminder: { ...d.reminder, enabled: e.target.checked } })} />
          یادآوری پیامکی
          <select className="input-field !w-auto !h-9" value={d.reminder.minutes_before} disabled={!d.reminder.enabled} onChange={(e) => setD({ ...d, reminder: { ...d.reminder, minutes_before: Number(e.target.value) } })} aria-label="زمان یادآوری">
            {[15, 30, 60, 120, 1440].map((n) => (
              <option key={n} value={n}>
                {n === 1440 ? "یک روز" : `${fa(n)} دقیقه`} پیش از جلسه
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 pt-1">
          <Button variant="primary" onClick={submit}>
            ساخت صورتجلسه
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const dayOf = (date: string) => {
  const j = parseJalali(date);
  return j ? { day: fa(j[2]), month: monthNames[j[1] - 1] } : { day: "—", month: "" };
};

export function MeetingRow({ v, onOpen }: { v: MeetingView; onOpen: () => void }) {
  const d = dayOf(v.date);
  const open = openResolutions(v);
  return (
    <ListRow
      lead={<ListRowDate day={d.day} month={d.month} />}
      title={v.title}
      due={`ساعت ${v.time}`}
      badges={
        <>
          <Badge tone={v.source === "org" ? "info" : "brand"}>{v.project_name ?? "سازمانی"}</Badge>
          <MinutesStatusBadge m={v} />
          {v.status === 3 && <Badge tone="danger">لغوشده</Badge>}
          {v.decisions.length > 0 && <Badge tone="neutral">{fa(v.decisions.length)} مصوبه</Badge>}
          {open > 0 && <Badge tone="warning">{fa(open)} اجرانشده</Badge>}
        </>
      }
      subtitle={
        <span className="inline-flex items-center gap-1">
          {v.meeting_type === 2 ? <Video size={13} /> : <MapPin size={13} />}
          {v.meeting_type === 2 ? "برخط" : v.location || "حضوری"} · برگزارکننده: {v.organizer}
        </span>
      }
      onClick={onOpen}
    />
  );
}

export default function MeetingsHub() {
  const m = useMeetings();
  const pm = useProjectsPM();
  const { actingUser, hasPermission } = useTenancy();
  const [params, setParams] = useSearchParams();
  const [pill, setPill] = useState<Pill>("all");
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [sheet, setSheet] = useState<MeetingView | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const me = actingUser.name;
  const canManageTemplates = hasPermission("projects.create") || pm.projects.some((p) => isProjectManager(p, me));
  const ref = isoDate(pm.refDate) ?? "";

  // C3: ‎?new=meeting‎
  useEffect(() => {
    if (params.get("new") !== "meeting") return;
    setCreateOpen(true);
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const projectNames = useMemo(() => [...new Set(m.views.map((v) => v.project_name).filter((x): x is string => !!x))], [m.views]);
  const filtered = m.views
    .filter((v) => (pill === "all" ? true : pill === "upcoming" ? v.status === 1 && (isoDate(v.date) ?? "") >= ref : pill === "open_res" ? openResolutions(v) > 0 : v.minutes_status === pill))
    .filter((v) => !q || v.title.includes(q) || v.organizer.includes(q) || v.participants.some((x) => x.name.includes(q)))
    .filter((v) => !proj || (proj === "__org" ? !v.project_name : v.project_name === proj));
  const count = (f: (v: MeetingView) => boolean) => m.views.filter(f).length;
  const pills = [
    { id: "all" as Pill, label: "همه", count: m.views.length },
    { id: "upcoming" as Pill, label: "پیش‌رو", count: count((v) => v.status === 1 && (isoDate(v.date) ?? "") >= ref) },
    ...(["draft", "forming", "awaiting_signature", "signed"] as MinutesStatus[]).map((s) => ({ id: s as Pill, label: minutesStatusLabel[s], count: count((v) => v.minutes_status === s) })),
    { id: "open_res" as Pill, label: "مصوبه‌ی اجرانشده", count: count((v) => openResolutions(v) > 0), dot: "warning" as const },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <p className="text-sm text-ink-600 flex-1">جلسه‌هایی که در آن‌ها هستید؛ صورتجلسه، مصوبات و امضای هر جلسه در صفحه‌ی خودش است.</p>
        <Button variant="outline" icon={<LayoutTemplate size={16} />} onClick={() => setTplOpen(true)}>
          الگوها
        </Button>
        <Button variant="primary" icon={<CalendarPlus size={16} />} onClick={() => setCreateOpen(true)}>
          جلسه‌ی جدید
        </Button>
      </div>
      <div className="card">
        <FilterBar pills={pills} active={pill} onPill={setPill} search={q} onSearch={setQ} searchPlaceholder="عنوان، موضوع، همکار…" activeCount={proj ? 1 : 0} onClear={q || proj ? () => (setQ(""), setProj("")) : undefined}>
          <select className="input-field !w-auto" value={proj} onChange={(e) => setProj(e.target.value)} aria-label="عنوان پروژه">
            <option value="">همه‌ی پروژه‌ها</option>
            <option value="__org">صورتجلسه‌های سازمانی بدون پروژه</option>
            {projectNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </FilterBar>
        <List>
          {filtered.map((v) => (
            <MeetingRow key={v.route_id} v={v} onOpen={() => setSheet(v)} />
          ))}
        </List>
        {filtered.length === 0 && (
          <div className="p-5">
            <EmptyState compact title="جلسه‌ای با این فیلتر نیست" />
          </div>
        )}
      </div>
      <MeetingSheet m={sheet ? (m.byRoute(sheet.route_id) ?? sheet) : null} onClose={() => setSheet(null)} />
      <NewMeetingDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {tplOpen && <TemplatesDialog onClose={() => setTplOpen(false)} canManage={canManageTemplates} />}
    </div>
  );
}

export { meetingHref };
