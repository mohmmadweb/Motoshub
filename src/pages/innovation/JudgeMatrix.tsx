// ---------------------------------------------------------------------------
// ماتریس داوری چندداوره‌ی صندوق: داور × معیار، میانگین و انحراف معیار هر معیار،
// برجسته‌سازی اختلاف زیاد داوران، داوران دیرکرد و یادآوری از طریق صندوق اعلان.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { AlertTriangle, BellRing, Gavel, Pencil, Plus, Trash2, Users } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useInnovation } from "../../context/InnovationContext";
import { useInbox } from "../../context/InboxContext";
import { users } from "../../data/mock";
import { addDays } from "../../pm/jalali";
import type { JudgePanel } from "../../innovation/types";
import { DEFAULT_FUND_SETTINGS, defaultCriteria, panelStats } from "../../innovation/extras";
import { faN, uid } from "../../innovation/util";
import { Field } from "./shared";

const shortName = (n: string) => n.replace(/^دکتر\s+/, "");

export function JudgeMatrix({ kind, subjectId, subjectTitle }: { kind: JudgePanel["subjectKind"]; subjectId: string; subjectTitle: string }) {
  const inn = useInnovation();
  const inbox = useInbox();
  const { notify } = useToast();
  const { hasPermission, actingUser } = useTenancy();
  const panel = inn.judging?.find((p) => p.subjectKind === kind && p.subjectId === subjectId);
  const settings = inn.fundSettings ?? DEFAULT_FUND_SETTINGS;
  const canManage = hasPermission("funds.score") || hasPermission("funds.refer") || hasPermission("funds.allocate");
  const [scoring, setScoring] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const link = kind === "nf" ? `/dashboard/funds?focus=${subjectId}` : `/dashboard/funds?tab=employment&focus=${subjectId}`;

  const save = (action: string, fn: (p: JudgePanel) => JudgePanel) =>
    inn.commit("funds", action, { id: subjectId, title: subjectTitle }, (s) => ({ ...s, judging: (s.judging ?? []).map((p) => (p.subjectKind === kind && p.subjectId === subjectId ? fn(p) : p)) }));

  const create = () => {
    const judges = users.filter((u) => u.name !== actingUser.name).slice(0, 3).map((u) => u.name);
    const p: JudgePanel = { id: uid("jp"), subjectKind: kind, subjectId, subjectTitle, judges, criteria: defaultCriteria(), scores: {}, due: addDays(inn.today, 10), reminders: [], createdAt: inn.today };
    inn.commit("funds", "پنل داوری چندداوره تشکیل داد", { id: subjectId, title: subjectTitle }, (s) => ({ ...s, judging: [...(s.judging ?? []), p] }), { to: judges, text: `برای داوری «${subjectTitle}» انتخاب شدید (مهلت ${p.due}).`, link });
    notify("پنل داوری تشکیل شد و به داوران اعلان رفت.", "success");
  };

  if (!panel)
    return canManage ? (
      <div className="rounded-lg border border-dashed border-ink-300 p-3 text-xs text-ink-500 flex items-center justify-between gap-2 flex-wrap">
        <span>هنوز پنل داوری چندداوره برای این پرونده تشکیل نشده است.</span>
        <Button size="sm" variant="secondary" icon={<Gavel size={12} />} onClick={create}>تشکیل پنل داوری</Button>
      </div>
    ) : null;

  const st = panelStats(panel, inn.today, settings.disagreementPct);
  const remind = (judges: string[]) => {
    if (!judges.length) return;
    inbox.send(judges, "announcement", `یادآوری: داوری «${subjectTitle}» از مهلت ${panel.due} گذشته است؛ لطفاً نمره‌های خود را ثبت کنید.`, link);
    save(`به ${faN(judges.length)} داور دیرکرد یادآوری فرستاد`, (p) => ({ ...p, reminders: [...p.reminders, ...judges.map((j) => ({ judge: j, at: inn.stamp() }))] }));
    notify(`یادآوری برای ${judges.join("، ")} ارسال شد.`, "success");
  };
  const disagreeCount = st.perCriterion.filter((c) => c.disagree).length;
  const lastReminder = (j: string) => [...panel.reminders].reverse().find((r) => r.judge === j)?.at;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
        <Badge tone="neutral" icon={<Users size={10} />}>{faN(st.complete.length)} از {faN(panel.judges.length)} داور</Badge>
        <Badge tone="neutral">مهلت {panel.due}</Badge>
        {st.totalMean !== undefined && <Badge tone="navy">میانگین کل {faN(st.totalMean, 1)} از {faN(st.maxTotal)}</Badge>}
        {disagreeCount > 0 && <Badge tone="warning" icon={<AlertTriangle size={10} />}>اختلاف زیاد در {faN(disagreeCount)} معیار</Badge>}
        {st.late.length > 0 && <Badge tone="danger">{faN(st.late.length)} داور دیرکرد</Badge>}
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[11px] border-separate border-spacing-0.5 min-w-[460px]">
          <thead>
            <tr className="text-ink-500">
              <th className="text-right font-medium px-1.5 py-1 sticky right-0 bg-white min-w-[96px]">داور \ معیار</th>
              {panel.criteria.map((c) => (
                <th key={c.id} className="font-medium px-1 py-1 text-center" title={c.title}>
                  <span className="block truncate max-w-[78px] mx-auto">{c.title}</span>
                  <span className="text-[10px] text-ink-400">از {faN(c.max)}</span>
                </th>
              ))}
              <th className="font-bold px-1 py-1 text-center text-ink-700">جمع</th>
            </tr>
          </thead>
          <tbody>
            {panel.judges.map((j) => {
              const late = st.late.includes(j);
              const mine = j === actingUser.name;
              return (
                <tr key={j}>
                  <th className="text-right font-medium px-1.5 py-1 sticky right-0 bg-white">
                    <span className="flex items-center gap-1">
                      <span className={`truncate max-w-[110px] ${late ? "text-rose-600" : "text-ink-800"}`} title={j}>{shortName(j)}</span>
                      {(mine || canManage) && (
                        <button type="button" onClick={() => setScoring(j)} aria-label={`ثبت نمره‌ی ${j}`} className="text-ink-400 hover:text-brand-600 shrink-0"><Pencil size={11} /></button>
                      )}
                    </span>
                    {late && <span className="block text-[10px] text-rose-500 font-normal">دیرکرد{lastReminder(j) ? " · یادآوری شد" : ""}</span>}
                  </th>
                  {panel.criteria.map((c) => {
                    const v = panel.scores[j]?.[c.id];
                    const stat = st.perCriterion.find((x) => x.id === c.id)!;
                    const far = typeof v === "number" && stat.mean !== undefined && stat.disagree && Math.abs(v - stat.mean) >= stat.sd;
                    return (
                      <td key={c.id} className={`text-center px-1 py-1 rounded ${typeof v === "number" ? (far ? "bg-amber-100 text-amber-900 font-bold" : "bg-ink-50 text-ink-800") : "text-ink-300"}`}>
                        {typeof v === "number" ? faN(v, 1) : "—"}
                      </td>
                    );
                  })}
                  <td className="text-center px-1 py-1 font-bold text-ink-900 bg-ink-50 rounded">{st.judgeTotals[j] !== undefined ? faN(st.judgeTotals[j]!, 1) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="text-right font-bold px-1.5 py-1 sticky right-0 bg-white text-ink-700">میانگین</th>
              {st.perCriterion.map((c) => (
                <td key={c.id} className="text-center px-1 py-1 font-bold text-ink-900 bg-brand-50 rounded">{c.mean !== undefined ? faN(c.mean, 1) : "—"}</td>
              ))}
              <td className="text-center px-1 py-1 font-bold text-white bg-navy-800 rounded">{st.totalMean !== undefined ? faN(st.totalMean, 1) : "—"}</td>
            </tr>
            <tr>
              <th className="text-right font-medium px-1.5 py-1 sticky right-0 bg-white text-ink-500">انحراف معیار</th>
              {st.perCriterion.map((c) => (
                <td key={c.id} className={`text-center px-1 py-1 rounded ${c.disagree ? "bg-rose-100 text-rose-700 font-bold" : "text-ink-500"}`} title={c.disagree ? "اختلاف زیاد داوران — بحث در جلسه پیشنهاد می‌شود" : undefined}>
                  {c.n > 1 ? faN(c.sd, 1) : "—"}
                  {c.disagree && <AlertTriangle size={10} className="inline mr-0.5" />}
                </td>
              ))}
              <td className="text-center px-1 py-1 text-ink-500">{st.complete.length > 1 ? faN(st.totalSd, 1) : "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[10.5px] text-ink-400 leading-5">
        خانه‌ی قرمز = انحراف معیار ≥ {faN(settings.disagreementPct)}٪ سقف معیار (اختلاف زیاد)؛ نمره‌ی کهربایی = نمره‌ی دور از میانگین در همان معیار.
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {canManage && st.late.length > 0 && <Button size="sm" variant="primary" icon={<BellRing size={12} />} onClick={() => remind(st.late)}>یادآوری به داوران دیرکرد</Button>}
        {canManage && st.late.length === 0 && st.pending.length > 0 && <Button size="sm" variant="ghost" icon={<BellRing size={12} />} onClick={() => remind(st.pending)}>یادآوری به {faN(st.pending.length)} داور در انتظار</Button>}
        {canManage && <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => setEditing(true)}>داوران و مهلت</Button>}
      </div>

      {scoring && <ScoreModal panel={panel} judge={scoring} onClose={() => setScoring(null)} onSave={(scores) => { save(`نمره‌های داور «${scoring}» را ثبت کرد`, (p) => ({ ...p, scores: { ...p.scores, [scoring]: scores } })); notify("نمره‌ها ثبت شد.", "success"); setScoring(null); }} />}
      {editing && <PanelEditModal panel={panel} onClose={() => setEditing(false)} onSave={(patch) => { save("ترکیب داوران یا مهلت داوری را تغییر داد", (p) => ({ ...p, ...patch })); setEditing(false); }} />}
    </div>
  );
}

function ScoreModal({ panel, judge, onClose, onSave }: { panel: JudgePanel; judge: string; onClose: () => void; onSave: (s: Record<string, number>) => void }) {
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(panel.criteria.map((c) => [c.id, panel.scores[judge]?.[c.id] ?? Math.round(c.max * 0.7)])));
  return (
    <Modal open onClose={onClose} title="ثبت نمره‌ی داور" description={`${judge} — ${panel.subjectTitle}`}>
      <div className="space-y-3">
        {panel.criteria.map((c) => (
          <div key={c.id}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-ink-700">{c.title}</span>
              <span className="font-bold text-ink-900">{faN(vals[c.id], 1)} / {faN(c.max)}</span>
            </div>
            <input type="range" min={0} max={c.max} step={0.5} value={vals[c.id]} onChange={(e) => setVals((v) => ({ ...v, [c.id]: Number(e.target.value) }))} className="w-full accent-brand-600" aria-label={c.title} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1 justify-center" onClick={() => onSave(vals)}>ثبت نمره‌ها</Button>
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

function PanelEditModal({ panel, onClose, onSave }: { panel: JudgePanel; onClose: () => void; onSave: (p: Partial<JudgePanel>) => void }) {
  const [judges, setJudges] = useState(panel.judges);
  const [due, setDue] = useState(panel.due);
  const [add, setAdd] = useState("");
  return (
    <Modal open onClose={onClose} title="داوران و مهلت داوری" description={panel.subjectTitle}>
      <div className="space-y-3">
        <Field label="داوران">
          <div className="space-y-1.5">
            {judges.map((j) => (
              <div key={j} className="flex items-center justify-between gap-2 text-xs bg-ink-50 rounded-lg px-2.5 py-1.5">
                <span className="truncate">{j}</span>
                <button type="button" onClick={() => setJudges(judges.filter((x) => x !== j))} disabled={!!panel.scores[j]} title={panel.scores[j] ? "نمره ثبت کرده و قابل حذف نیست" : "حذف"} className="text-ink-400 hover:text-rose-600 disabled:opacity-30"><Trash2 size={13} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <select value={add} onChange={(e) => setAdd(e.target.value)} className="input-field">
                <option value="">افزودن داور…</option>
                {users.filter((u) => !judges.includes(u.name)).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => { if (add) { setJudges([...judges, add]); setAdd(""); } }}>افزودن</Button>
            </div>
          </div>
        </Field>
        <Field label="مهلت داوری"><JalaliDatePicker value={due} onChange={setDue} /></Field>
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1 justify-center" onClick={() => onSave({ judges, due })}>ذخیره</Button>
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}
