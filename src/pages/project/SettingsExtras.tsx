import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Video, Save, Link2, Building2, Landmark, FileSignature, Lightbulb, Hash } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { contracts, funds, researchOpportunities } from "../../data/mock";
import { defaultMeetingSettings } from "../../pm/selectors";
import { fa } from "../../pm/jalali";
import type { MeetingSettings, PMMeeting, ProjectMeta } from "../../pm/types";
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

export const fundTitle = (id?: string) => funds.find((f) => f.id === id)?.title;
export const contractTitle = (id?: string) => contracts.find((c) => c.id === id)?.title;
export const opportunityTitle = (id?: string) => researchOpportunities.find((r) => r.id === id)?.title;

/** پیوند پروژه به موجودیت‌های نوآوری و هشتگ‌ها — نمایش در نمای کلی */
export function ProjectLinks({ meta, compact = false }: { meta: ProjectMeta; compact?: boolean }) {
  const items = [
    meta.fundId && fundTitle(meta.fundId) ? { icon: <Landmark size={12} />, label: "صندوق نوآوری", text: fundTitle(meta.fundId)!, to: `/dashboard/funds?focus=${meta.fundId}` } : null,
    meta.contractId && contractTitle(meta.contractId) ? { icon: <FileSignature size={12} />, label: "قرارداد فناورانه", text: contractTitle(meta.contractId)!, to: `/dashboard/contracts?focus=${meta.contractId}` } : null,
    meta.opportunityId && opportunityTitle(meta.opportunityId) ? { icon: <Lightbulb size={12} />, label: "فرصت پژوهشی", text: opportunityTitle(meta.opportunityId)!, to: `/dashboard/research?focus=${meta.opportunityId}` } : null,
    meta.companyName ? { icon: <Building2 size={12} />, label: "شرکت / مجری", text: meta.companyName, to: "" } : null,
  ].filter(Boolean) as { icon: ReactNode; label: string; text: string; to: string }[];
  if (!items.length) return compact ? null : <p className="text-[11px] text-ink-400">به صندوق، قرارداد یا فرصت پژوهشی متصل نیست.</p>;
  return (
    <div className="space-y-1.5">
      {items.map((x) => (
        <div key={x.label} className="flex items-start gap-1.5 text-[11.5px]">
          <span className="text-brand-600 mt-0.5">{x.icon}</span>
          <span className="text-ink-400 whitespace-nowrap">{x.label}:</span>
          {x.to ? (
            <Link to={x.to} className="text-brand-700 hover:underline min-w-0 break-words">
              {x.text}
            </Link>
          ) : (
            <span className="text-ink-700 min-w-0 break-words">{x.text}</span>
          )}
        </div>
      ))}
    </div>
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

/** کارت «پیوندهای نوآوری» در تنظیمات */
export function InnovationLinksCard() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [d, setD] = useState({ fundId: p.meta.fundId ?? "", contractId: p.meta.contractId ?? "", opportunityId: p.meta.opportunityId ?? "", companyName: p.meta.companyName ?? "" });
  useEffect(() => setD({ fundId: p.meta.fundId ?? "", contractId: p.meta.contractId ?? "", opportunityId: p.meta.opportunityId ?? "", companyName: p.meta.companyName ?? "" }), [p.meta]);
  if (!canEdit) return null;
  const save = () => {
    pm.updateMeta(pid, { fundId: d.fundId || undefined, contractId: d.contractId || undefined, opportunityId: d.opportunityId || undefined, companyName: d.companyName.trim() || undefined });
    notify("پیوندهای پروژه ذخیره شد؛ در نمای کلی و دفتر تصمیمات دیده می‌شود.");
  };
  return (
    <div className="card p-4">
      <SectionTitle icon={<Link2 size={15} className="text-brand-600" />} title="پیوند به دانش و نوآوری" hint="اتصال پروژه به صندوق نوآوری، قرارداد فناورانه، فرصت پژوهشی و شرکت مجری — مبنای داده‌ی عملکرد واقعی برای ارزیابی‌ها." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="صندوق نوآوری / طرح">
          <select className="input-field" value={d.fundId} onChange={(e) => setD({ ...d, fundId: e.target.value })}>
            <option value="">—</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title} ({f.stage})
              </option>
            ))}
          </select>
        </Field>
        <Field label="قرارداد فناورانه">
          <select className="input-field" value={d.contractId} onChange={(e) => setD({ ...d, contractId: e.target.value })}>
            <option value="">—</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="فرصت پژوهشی">
          <select className="input-field" value={d.opportunityId} onChange={(e) => setD({ ...d, opportunityId: e.target.value })}>
            <option value="">—</option>
            {researchOpportunities.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="شرکت / مجری">
          <input className="input-field" value={d.companyName} onChange={(e) => setD({ ...d, companyName: e.target.value })} placeholder="مثلاً: شرکت دانش‌بنیان …" />
        </Field>
      </div>
      <Button className="mt-3" variant="primary" icon={<Save size={14} />} onClick={save}>
        ذخیره‌ی پیوندها
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
