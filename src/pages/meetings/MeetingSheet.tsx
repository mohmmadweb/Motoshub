// ---------------------------------------------------------------------------
// برگه‌ی کناری جلسه (پیش‌نمایش از فهرست «جلسات و صورتجلسه‌ها») + اجزای مشترک صفحه‌ی جلسه:
// نشان وضعیت صورتجلسه و ویرایشگر شرکت‌کنندگان (رئیس، دبیر، عضو، مدعو بیرونی با موبایل).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Plus, Trash2, Video, MapPin } from "lucide-react";
import Sheet, { SheetSection } from "../../components/ui/Sheet";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Avatar from "../../components/Avatar";
import { useTenancy } from "../../context/TenancyContext";
import { users as allUsers } from "../../data/mock";
import { fa } from "../../pm/jalali";
import { attendanceLabel, meetingHref, meetingStatusLabel, minutesStatusLabel, roleLabel, type MeetingParticipant, type MeetingView, type MinutesStatus, type ParticipantRole } from "../../meetings/types";
import { neededSignatures, signedCount } from "../../meetings/signature";

const msTone: Record<MinutesStatus, BadgeTone> = { draft: "neutral", forming: "info", awaiting_signature: "warning", signed: "success" };
export function MinutesStatusBadge({ m }: { m: Pick<MeetingView, "minutes_status" | "participants" | "sign_rule"> }) {
  return (
    <Badge tone={msTone[m.minutes_status]} dot>
      {minutesStatusLabel[m.minutes_status]}
      {m.minutes_status === "awaiting_signature" ? ` (${fa(signedCount(m))}/${fa(neededSignatures(m))})` : ""}
    </Badge>
  );
}
export const openResolutions = (m: Pick<MeetingView, "resolutions">) => m.resolutions.filter((r) => !r.done).length;

const roles: ParticipantRole[] = ["chair", "secretary", "member", "guest"];

/** ویرایشگر شرکت‌کنندگان: اعضای قابل‌دیدن (اجتماع زیردرخت عضویت‌ها) + مدعو بیرونی (نام و موبایل) */
export function ParticipantsEditor({ value, onChange, disabled }: { value: MeetingParticipant[]; onChange: (v: MeetingParticipant[]) => void; disabled?: boolean }) {
  const { visibleUserIds, actingUser } = useTenancy();
  const ids = new Set([...visibleUserIds(), actingUser.id]);
  const people = allUsers.filter((u) => ids.has(u.id) && !value.some((x) => x.principal_id === u.id));
  const [pick, setPick] = useState("");
  const [ext, setExt] = useState({ name: "", mobile: "" });
  const seq = () => `pt${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`;
  const set = (id: string, p: Partial<MeetingParticipant>) => onChange(value.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <div className="space-y-2">
      {value.map((x) => (
        <div key={x.id} className="flex items-center gap-2 flex-wrap">
          <span className="flex-1 min-w-[8rem] text-sm text-ink-900 truncate">
            {x.external_name ?? x.name}
            {x.external_mobile && <span className="text-[12px] text-ink-500"> · {x.external_mobile}</span>}
          </span>
          <select className="input-field !w-auto !h-9" value={x.role} disabled={disabled} onChange={(e) => set(x.id, { role: e.target.value as ParticipantRole })} aria-label="نقش در جلسه">
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </select>
          {!disabled && (
            <button type="button" className="btn btn-ghost btn-icon btn-sm text-rose-600" onClick={() => onChange(value.filter((y) => y.id !== x.id))} aria-label={`حذف ${x.name}`}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <>
          <div className="flex gap-2">
            <select className="input-field flex-1" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="افزودن عضو">
              <option value="">افزودن عضو سازمان…</option>
              {people.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button
              variant="tonal"
              icon={<Plus size={14} />}
              disabled={!pick}
              onClick={() => {
                const u = allUsers.find((x) => x.id === pick);
                if (u) onChange([...value, { id: seq(), principal_id: u.id, name: u.name, role: value.length ? "member" : "chair", attendance: "unknown" }]);
                setPick("");
              }}
            >
              افزودن
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input className="input-field flex-1 min-w-[8rem]" placeholder="نام مدعو بیرونی" value={ext.name} onChange={(e) => setExt({ ...ext, name: e.target.value })} />
            <input className="input-field w-40" placeholder="موبایل" dir="ltr" inputMode="tel" value={ext.mobile} onChange={(e) => setExt({ ...ext, mobile: e.target.value })} />
            <Button
              variant="outline"
              disabled={!ext.name.trim()}
              onClick={() => {
                onChange([...value, { id: seq(), principal_id: null, name: ext.name.trim(), external_name: ext.name.trim(), external_mobile: ext.mobile.trim() || undefined, role: "guest", attendance: "unknown" }]);
                setExt({ name: "", mobile: "" });
              }}
            >
              افزودن مدعو
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** پیش‌نمایش جلسه در برگه‌ی کناری؛ «صفحه‌ی جلسه» همه‌ی جزئیات را دارد */
export default function MeetingSheet({ m, onClose }: { m: MeetingView | null; onClose: () => void }) {
  if (!m) return null;
  const present = m.participants.filter((x) => x.attendance === "present").length;
  return (
    <Sheet
      open
      onClose={onClose}
      title={m.title}
      eyebrow={`جلسه · ${m.project_name ?? "صورتجلسه‌ی سازمانی"}`}
      footer={
        <Link to={meetingHref(m)} className="btn btn-primary">
          صفحه‌ی جلسه <ArrowUpLeft size={16} />
        </Link>
      }
    >
      <SheetSection>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge tone={m.status === 3 ? "danger" : m.status === 2 ? "success" : "info"}>{meetingStatusLabel[m.status]}</Badge>
          <MinutesStatusBadge m={m} />
          {openResolutions(m) > 0 && <Badge tone="warning">{fa(openResolutions(m))} مصوبه‌ی اجرانشده</Badge>}
        </div>
        <p className="text-sm text-ink-800">
          {m.date} · ساعت {m.time} · {fa(m.duration)} دقیقه
        </p>
        <p className="text-sm text-ink-600 flex items-center gap-1.5 mt-1">
          {m.meeting_type === 2 ? <Video size={15} /> : <MapPin size={15} />}
          {m.meeting_type === 2 ? "برخط" : m.location || "حضوری"}
          {m.link && (
            <a href={m.link} target="_blank" rel="noreferrer" className="text-teal-700 underline mr-1" dir="ltr">
              ورود به جلسه
            </a>
          )}
        </p>
        {m.description && <p className="text-[13.5px] text-ink-600 mt-2 leading-6">{m.description}</p>}
      </SheetSection>
      {m.agenda.length > 0 && (
        <SheetSection title="دستور جلسه">
          <ol className="list-decimal pr-5 text-sm text-ink-800 space-y-0.5">
            {m.agenda.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </SheetSection>
      )}
      <SheetSection title={`حاضران (${fa(present)} از ${fa(m.participants.length)})`}>
        <ul className="space-y-2">
          {m.participants.map((x) => (
            <li key={x.id} className="flex items-center gap-2">
              <Avatar name={x.name} size={28} />
              <span className="flex-1 text-sm text-ink-900">
                {x.name} <span className="text-[12px] text-ink-500">· {roleLabel[x.role]}</span>
              </span>
              <Badge tone={x.attendance === "present" ? "success" : x.attendance === "absent" ? "danger" : "warning"}>{attendanceLabel[x.attendance]}</Badge>
            </li>
          ))}
        </ul>
      </SheetSection>
    </Sheet>
  );
}
