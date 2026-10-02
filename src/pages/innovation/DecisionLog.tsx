// ---------------------------------------------------------------------------
// دفتر تصمیمات و نتایج واقعی — همه‌ی ماژول‌های نوآوری
// تصمیم انسانی + گزینه‌های بررسی‌شده + دلیل انحراف از رتبه‌ی اول؛ نتیجه‌ی واقعی در اختتام.
// (داده‌ی پایه برای سکوی ارزیابی آینده؛ هیچ امتیاز اعتباری اینجا ساخته نمی‌شود)
// ---------------------------------------------------------------------------
import { useState } from "react";
import { AlertTriangle, ClipboardCheck, Download, Gavel } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Toggle from "../../components/ui/Toggle";
import EmptyState from "../../components/ui/EmptyState";
import { useInnovation } from "../../context/InnovationContext";
import type { InnModule } from "../../innovation/types";
import { moduleTitle } from "../../innovation/types";
import { downloadText, faN, toCsv } from "../../innovation/util";
import { EntityLink, FilterChips } from "./shared";

const MODS: InnModule[] = ["research", "contracts", "funds", "award", "training"];

export default function DecisionLog() {
  const inn = useInnovation();
  const [tab, setTab] = useState<"dec" | "out">("dec");
  const [mod, setMod] = useState<InnModule | "همه">("همه");
  const [onlyDev, setOnlyDev] = useState(false);
  const decs = inn.decisions.filter((d) => (mod === "همه" || d.module === mod) && (!onlyDev || d.deviates));
  const outs = inn.outcomes.filter((o) => mod === "همه" || o.module === mod);
  const devRate = inn.decisions.length ? Math.round((inn.decisions.filter((d) => d.deviates).length / inn.decisions.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Tabs tabs={[{ id: "dec", label: "تصمیم‌ها", count: inn.decisions.length }, { id: "out", label: "نتایج واقعی", count: inn.outcomes.length }]} active={tab} onChange={setTab} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <FilterChips items={MODS} value={mod} onChange={setMod} labels={moduleTitle} />
        <div className="flex items-center gap-3">
          {tab === "dec" && <label className="flex items-center gap-2 text-xs text-ink-600"><Toggle on={onlyDev} onChange={() => setOnlyDev((v) => !v)} label="فقط خلاف رتبه‌ی اول" /> فقط خلاف رتبه‌ی اول ({faN(devRate)}٪)</label>}
          <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={() =>
            tab === "dec"
              ? downloadText("decisions.csv", toCsv([["ماژول", "موضوع", "پرونده", "انتخاب", "خلاف رتبه اول", "دلیل", "مرجع", "ثبت‌کننده", "زمان"], ...decs.map((d) => [moduleTitle[d.module], d.question, d.subjectTitle, d.chosenLabel, d.deviates ? "بله" : "خیر", d.reason, d.committee ?? "", d.decidedBy, d.at])]))
              : downloadText("outcomes.csv", toCsv([["ماژول", "پرونده", "تحقق اهداف٪", "تحویل", "زمان‌بندی", "بودجه", "کیفیت", "TRL قبل", "TRL بعد", "ثبت‌کننده", "زمان"], ...outs.map((o) => [moduleTitle[o.module], o.subjectTitle, o.successPct, o.delivered, o.schedule, o.budget, o.quality, o.trlBefore ?? "", o.trlAfter ?? "", o.recordedBy, o.at])]))
          }>CSV</Button>
        </div>
      </div>

      {tab === "dec" && (decs.length === 0 ? <div className="card"><EmptyState title="تصمیمی ثبت نشده" /></div> : (
        <div className="space-y-2.5">
          {decs.map((d) => (
            <details key={d.id} className="card p-3.5">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5"><Gavel size={13} className="text-brand-600 shrink-0" /> {d.question}: {d.chosenLabel}</p>
                    <p className="text-[11px] text-ink-400 mt-0.5">{moduleTitle[d.module]} · {d.subjectTitle} · {d.committee ? `${d.committee} · ` : ""}{d.decidedBy} · {d.at}</p>
                  </div>
                  {d.deviates ? <Badge tone="warning" icon={<AlertTriangle size={10} />}>خلاف رتبه‌ی اول</Badge> : <Badge tone="success">مطابق رتبه‌ی اول</Badge>}
                </div>
                <p className="text-xs text-ink-600 mt-2 leading-6">{d.reason}</p>
              </summary>
              <div className="mt-2 pt-2 border-t border-ink-100 space-y-1">
                <p className="text-[11px] font-bold text-ink-700">گزینه‌های بررسی‌شده</p>
                {d.options.map((o) => (
                  <div key={o.id} className={`flex items-center justify-between gap-2 text-[11.5px] rounded-md px-2 py-1 ${o.id === d.chosenId ? "bg-brand-50" : ""}`}>
                    <span className="truncate">{faN(o.rank)}. {o.entityId ? <EntityLink id={o.entityId} name={o.label} /> : o.label}</span>
                    <span className="text-ink-400 shrink-0">{o.score !== undefined ? `ارزیابی ${faN(o.score, 1)}` : "—"}{o.id === d.chosenId ? " · انتخاب شد" : ""}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ))}

      {tab === "out" && (outs.length === 0 ? <div className="card"><EmptyState title="نتیجه‌ای ثبت نشده" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {outs.map((o) => (
            <div key={o.id} className="card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5 min-w-0"><ClipboardCheck size={13} className="text-emerald-600 shrink-0" /><span className="truncate">{o.subjectTitle}</span></p>
                <Badge tone={o.successPct >= 75 ? "success" : o.successPct >= 50 ? "warning" : "danger"}>{faN(o.successPct)}٪ تحقق</Badge>
              </div>
              <p className="text-[11px] text-ink-500 mt-1.5">تحویل {o.delivered} · {o.schedule} · {o.budget} · کیفیت {faN(o.quality)} از ۵{o.trlAfter !== undefined ? ` · TRL ${faN(o.trlBefore)} ← ${faN(o.trlAfter)}` : ""}</p>
              {o.outputs.length > 0 && <p className="text-[11px] text-ink-500 mt-1">خروجی‌ها: {o.outputs.join("، ")}</p>}
              {o.notes && <p className="text-[11px] text-ink-600 mt-1 leading-5">{o.notes}</p>}
              <div className="flex items-center justify-between mt-2 text-[10.5px] text-ink-400">
                <span>{moduleTitle[o.module]} · {o.recordedBy} · {o.at}</span>
                <span className="flex gap-1">{o.entityIds.map((id) => { const e = inn.entityById(id); return e ? <EntityLink key={id} id={id} name={e.name} /> : null; })}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      <p className="text-[10.5px] text-ink-400 leading-5">این دفتر داده‌ی خام تصمیم و نتیجه را برای سکوی ارزیابی آینده نگه می‌دارد؛ هیچ امتیاز یا رتبه‌ی اعتباری محاسبه نمی‌شود.</p>
    </div>
  );
}
