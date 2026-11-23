import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Video, Save, Link2, Hash } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { defaultMeetingSettings } from "../../pm/selectors";
import { fa } from "../../pm/jalali";
import type { MeetingSettings, PMMeeting } from "../../pm/types";
import { Field, SectionTitle, numIn, useProjectPage } from "./shared";

/** انتخاب فضای کاری از ساختار سازمانی IAM (هلدینگ/شرکت/واحدهایی که کاربر به آن‌ها دسترسی دارد) */
export function ScopePicker({ value, onChange, className = "input-field" }: { value?: string; onChange: (id: string, label: string) => void; className?: string }) {
  const { reachable, scopePath, scopeLabel, scopeTypeLabel, iam } = useTenancy();
  const list = [...reachable];
  if (value && !list.some((s) => s.id === value)) {
    const n = iam.scopes.find((s) => s.id === value);
    if (n) list.unshift(n);
  }
  return (
    <select className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value, e.target.value ? scopeLabel(e.target.value) : "")}>
      <option value="">— انتخاب واحد سازمانی —</option>
      {list.map((s) => (
        <option key={s.id} value={s.id}>
          {scopePath(s.id)} ({scopeTypeLabel[s.type]})
        </option>
      ))}
    </select>
  );
}

/** برچسب‌های پروژه به‌صورت لینک به صفحه‌ی «هشتگ‌ها و موضوعات» */
export function TagLinks({ tags }: { tags: string[] }) {
  return (
    <>
      {tags.map((t) => (
        <Link key={t} to={`/dashboard/topics?tag=${encodeURIComponent(t)}`} className="text-[10.5px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700 inline-flex items-center gap-0.5">
          <Hash size={10} />
          {t}
        </Link>
      ))}
    </>
  );
}

/** کارت «شرکت / مجری» در تنظیمات */
export function CompanyLinkCard() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [companyName, setCompanyName] = useState(p.meta.companyName ?? "");
  useEffect(() => setCompanyName(p.meta.companyName ?? ""), [p.meta]);
  if (!canEdit) return null;
  const save = () => {
    pm.updateMeta(pid, { companyName: companyName.trim() || undefined });
    notify("شرکت مجری ذخیره شد؛ در «مشخصات پروژه» دیده می‌شود.");
  };
  return (
    <div className="card p-4">
      <SectionTitle icon={<Link2 size={15} className="text-brand-600" />} title="شرکت / مجری" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="شرکت / مجری">
          <input className="input-field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="مثلاً: شرکت عمران روستایی …" />
        </Field>
      </div>
      <Button className="mt-3" variant="primary" icon={<Save size={14} />} onClick={save}>
        ذخیره
      </Button>
    </div>
  );
}

/** کارت «تنظیمات جلسات» (بند ۴۴ سند) */
export function MeetingSettingsCard() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [m, setM] = useState<MeetingSettings>(p.meetingSettings ?? defaultMeetingSettings);
  useEffect(() => setM(p.meetingSettings ?? defaultMeetingSettings), [p.meetingSettings]);
  if (!canEdit) return null;
  return (
    <div className="card p-4">
      <SectionTitle icon={<Video size={15} className="text-brand-600" />} title="تنظیمات جلسات" hint="پیش‌فرض جلسه‌های جدید این پروژه، زمان یادآوری به شرکت‌کنندگان و اجازه‌ی ضبط." />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <Field label="مدت پیش‌فرض (دقیقه)">
          <input className="input-field" inputMode="numeric" value={fa(m.defaultDuration)} onChange={(e) => setM({ ...m, defaultDuration: numIn(e.target.value) })} />
        </Field>
        <Field label="یادآوری پیش از جلسه">
          <select className="input-field" value={m.reminderMinutes} onChange={(e) => setM({ ...m, reminderMinutes: Number(e.target.value) })}>
            {[10, 15, 30, 60, 120, 1440].map((x) => (
              <option key={x} value={x}>
                {x === 1440 ? "یک روز قبل" : x >= 60 ? `${fa(x / 60)} ساعت قبل` : `${fa(x)} دقیقه قبل`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="حالت پیش‌فرض">
          <select className="input-field" value={m.defaultMode} onChange={(e) => setM({ ...m, defaultMode: e.target.value as PMMeeting["mode"] })}>
            <option>ویدیویی</option>
            <option>صوتی</option>
            <option>حضوری</option>
          </select>
        </Field>
        <div className="flex items-center gap-2 text-xs text-ink-700 pb-2">
          <Toggle on={m.recordingAllowed} onChange={() => setM({ ...m, recordingAllowed: !m.recordingAllowed })} label="اجازه‌ی ضبط جلسه" />
          ضبط جلسه {m.recordingAllowed ? "مجاز (با مجوز مدیر)" : "غیرمجاز"}
        </div>
      </div>
      <Button
        className="mt-3"
        variant="primary"
        icon={<Save size={14} />}
        onClick={() => {
          if (m.defaultDuration < 5) return notify("مدت جلسه باید حداقل ۵ دقیقه باشد.", "warning");
          pm.saveMeetingSettings(pid, m);
          notify("تنظیمات جلسات ذخیره شد.");
        }}
      >
        ذخیره‌ی تنظیمات جلسات
      </Button>
    </div>
  );
}
