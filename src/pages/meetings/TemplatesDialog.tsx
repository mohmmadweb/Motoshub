// الگوهای صورتجلسه (میزیتو): مشخصات جلسه + اعضا؛ ساخت و ویرایش فقط برای مدیران.
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useMeetings } from "../../context/MeetingsContext";
import { fa } from "../../pm/jalali";
import { signRuleLabel, type MeetingTemplate, type SignRule } from "../../meetings/types";
import { DEFAULT_SIGN_RULE } from "../../meetings/signature";
import { ParticipantsEditor } from "./MeetingSheet";

type Draft = Omit<MeetingTemplate, "id" | "created_by"> & { id?: string };
const blank = (): Draft => ({ name: "", title_pattern: "", kind: "organizational", meeting_type: 1, duration_minutes: 60, location: "", agenda: [], participants: [], reminder: { enabled: true, minutes_before: 60 }, sign_rule: { ...DEFAULT_SIGN_RULE } });

export default function TemplatesDialog({ onClose, canManage }: { onClose: () => void; canManage: boolean }) {
  const m = useMeetings();
  const { notify } = useToast();
  const [d, setD] = useState<Draft | null>(null);
  return (
    <Modal open onClose={onClose} title="الگوهای صورتجلسه" description="مشخصات اصلی جلسه و اعضا را یک بار تعریف کنید؛ هنگام ساخت جلسه از الگو پر می‌شود. در عنوان، {ماه} و {تاریخ} جایگزین می‌شوند." wide>
      {!d ? (
        <div className="space-y-2">
          {m.templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-3 py-2">
              <button className="flex-1 text-right" disabled={!canManage} onClick={() => setD({ ...t })}>
                <p className="text-sm font-medium text-ink-900">{t.name}</p>
                <p className="text-[12px] text-ink-500">
                  {fa(t.participants.length)} عضو · {fa(t.agenda.length)} بند دستور جلسه · {signRuleLabel[t.sign_rule.mode]} · سازنده: {t.created_by}
                </p>
              </button>
              {canManage && (
                <button className="btn btn-ghost btn-icon btn-sm text-rose-600" onClick={() => m.removeTemplate(t.id)} aria-label={`حذف ${t.name}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {m.templates.length === 0 && <p className="text-sm text-ink-500">الگویی تعریف نشده است.</p>}
          {canManage && (
            <Button variant="tonal" icon={<Plus size={14} />} onClick={() => setD(blank())}>
              الگوی تازه
            </Button>
          )}
          {!canManage && <p className="text-[12.5px] text-ink-500">ساخت و ویرایش الگو با مدیران است.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="field">
              <span className="text-[13px] font-medium">نام الگو</span>
              <input className="input-field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
            </label>
            <label className="field">
              <span className="text-[13px] font-medium">الگوی عنوان</span>
              <input className="input-field" value={d.title_pattern} onChange={(e) => setD({ ...d, title_pattern: e.target.value })} placeholder="کمیته‌ی فنی — {ماه}" />
            </label>
            <label className="field">
              <span className="text-[13px] font-medium">نوع صورتجلسه</span>
              <select className="input-field" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as Draft["kind"] })}>
                <option value="organizational">سازمانی (حضور، امضا، پیامک)</option>
                <option value="simple">ساده</option>
              </select>
            </label>
            <label className="field">
              <span className="text-[13px] font-medium">شیوه</span>
              <select className="input-field" value={d.meeting_type} onChange={(e) => setD({ ...d, meeting_type: Number(e.target.value) as 1 | 2 })}>
                <option value={1}>حضوری</option>
                <option value={2}>برخط</option>
              </select>
            </label>
            <label className="field">
              <span className="text-[13px] font-medium">محل</span>
              <input className="input-field" value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} />
            </label>
            <label className="field">
              <span className="text-[13px] font-medium">مدت (دقیقه)</span>
              <input className="input-field" inputMode="numeric" value={d.duration_minutes} onChange={(e) => setD({ ...d, duration_minutes: Number(e.target.value.replace(/\D/g, "")) || 60 })} />
            </label>
            <label className="field">
              <span className="text-[13px] font-medium">قاعده‌ی امضا</span>
              <select className="input-field" value={d.sign_rule.mode} onChange={(e) => setD({ ...d, sign_rule: { mode: e.target.value as SignRule["mode"] } })}>
                {(Object.keys(signRuleLabel) as SignRule["mode"][]).filter((x) => x !== "named").map((x) => (
                  <option key={x} value={x}>
                    {signRuleLabel[x]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={d.reminder.enabled} onChange={(e) => setD({ ...d, reminder: { ...d.reminder, enabled: e.target.checked } })} className="w-4 h-4" />
              یادآوری پیامکی {fa(d.reminder.minutes_before)} دقیقه پیش از جلسه
            </label>
          </div>
          <label className="field">
            <span className="text-[13px] font-medium">دستور جلسه (هر خط یک بند)</span>
            <textarea className="input-field min-h-[80px]" value={d.agenda.join("\n")} onChange={(e) => setD({ ...d, agenda: e.target.value.split("\n") })} />
          </label>
          <div>
            <p className="text-[13px] font-medium mb-1.5">اعضا و نقش‌ها</p>
            <ParticipantsEditor value={d.participants.map((x, i) => ({ ...x, id: `t${i}`, attendance: "unknown" }))} onChange={(v) => setD({ ...d, participants: v.map(({ principal_id, name, external_name, external_mobile, role }) => ({ principal_id, name, external_name, external_mobile, role })) })} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                if (!d.name.trim()) return notify("نام الگو لازم است.", "warning");
                m.saveTemplate({ ...d, title_pattern: d.title_pattern || d.name, agenda: d.agenda.map((x) => x.trim()).filter(Boolean) });
                setD(null);
                notify("الگو ذخیره شد.");
              }}
            >
              ذخیره‌ی الگو
            </Button>
            <Button variant="ghost" onClick={() => setD(null)}>
              بازگشت
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
