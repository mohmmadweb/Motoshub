import { useState } from "react";
import { Users, Plus, UserMinus, BarChart3, ShieldCheck } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { users } from "../../data/mock";
import { isDone, memberStats, columnLabel } from "../../pm/selectors";
import { fa } from "../../pm/jalali";
import type { ProjectRole } from "../../pm/types";
import { Field, Progress, SectionTitle, useProjectPage } from "./shared";

export const roleTone: Record<ProjectRole, BadgeTone> = { مالک: "navy", "مدیر پروژه": "brand", "مدیر سیستم": "warning", عضو: "neutral", مشاهده‌گر: "neutral" };
export const roleDefs: { role: ProjectRole; desc: string }[] = [
  { role: "مالک", desc: "دسترسی کامل به پروژه، از جمله حذف و انتقال مالکیت." },
  { role: "مدیر پروژه", desc: "مدیریت پروژه، تسک‌ها، اعضا، زمان‌بندی و گزارش‌ها." },
  { role: "مدیر سیستم", desc: "دسترسی مدیریتی گسترده (تنظیمات، اعلان‌ها، خودکارسازی)." },
  { role: "عضو", desc: "انجام و مدیریت تسک‌های مربوط به خود، ثبت زمان و هزینه." },
  { role: "مشاهده‌گر", desc: "فقط مشاهده‌ی اطلاعات (مثلاً کارفرما یا ناظر بیرونی)." },
];

export default function TeamTab() {
  const { p, pid, canEdit, openTask, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<ProjectRole>("عضو");
  const [alloc, setAlloc] = useState(50);
  const [expanded, setExpanded] = useState<string | null>(focusId ?? null);
  const [crossFor, setCrossFor] = useState<string | null>(null);

  const add = () => {
    if (!name.trim()) return notify("نام عضو الزامی است.", "warning");
    if (p.members.some((m) => m.name === name.trim())) return notify("این فرد قبلاً عضو پروژه است.", "warning");
    const u = users.find((x) => x.name === name.trim());
    pm.addMember(pid, { name: name.trim(), title: title.trim() || u?.role || "عضو تیم", role, allocation: alloc, userId: u?.id });
    notify(`«${name.trim()}» اضافه شد و اعلان خوش‌آمد دریافت کرد.`);
    setAddOpen(false);
    setName("");
    setTitle("");
    setRole("عضو");
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Users size={15} className="text-brand-600" />}
        title={`اعضای پروژه (${fa(p.members.length)})`}
        
        action={
          canEdit && (
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setAddOpen(true)}>
              افزودن عضو
            </Button>
          )
        }
      />
      {p.members.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {p.members.map((m) => {
            const st = memberStats(p, m.name);
            const ts = p.tasks.filter((t) => t.assignee === m.name && !t.archived);
            return (
              <div key={m.id} className={`card p-4 ${focusId === m.id ? "ring-2 ring-brand-300" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{m.name}</p>
                    <p className="text-xs text-ink-400 truncate">{m.title}</p>
                  </div>
                  {canEdit && m.role !== "مالک" ? (
                    <select value={m.role} onChange={(e) => pm.updateMember(pid, m.id, { role: e.target.value as ProjectRole })} className="input-field !py-1 !text-[11px] !w-auto">
                      {roleDefs.filter((r) => r.role !== "مالک").map((r) => (
                        <option key={r.role}>{r.role}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={roleTone[m.role]}>{m.role}</Badge>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                    <span>تخصیص به پروژه</span>
                    <span>{fa(m.allocation)}٪</span>
                  </div>
                  <Progress value={m.allocation} />
                </div>
                <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                  {[
                    ["کل", st.task_count],
                    ["باز", st.open_task_count],
                    ["بسته", st.closed_task_count],
                    ["ساعت", st.hours],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-ink-50 rounded-md py-1">
                      <p className="text-sm font-bold text-ink-900">{fa(Number(v))}</p>
                      <p className="text-[10px] text-ink-400">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 text-[11px]">
                  <button onClick={() => setExpanded(expanded === m.id ? null : m.id)} className="text-brand-700 hover:underline">
                    {st.open_task_count} تسک باز · پیشرفت {fa(st.progress_percentage)}٪
                  </button>
                  <span className="flex items-center gap-1">
                    <button onClick={() => setCrossFor(m.name)} className="p-1 text-ink-400 hover:text-brand-600" title="پیشرفت در همه‌ی پروژه‌ها" aria-label="پیشرفت در همه‌ی پروژه‌ها">
                      <BarChart3 size={14} />
                    </button>
                    {canEdit && m.role !== "مالک" && (
                      <button
                        onClick={() =>
                          confirm({
                            title: `حذف «${m.name}» از تیم پروژه؟`,
                            message: st.open_task_count ? `${fa(st.open_task_count)} تسک باز دارد که باید به فرد دیگری واگذار شود.` : undefined,
                            onConfirm: () => pm.removeMember(pid, m.id),
                          })
                        }
                        className="p-1 text-ink-400 hover:text-rose-600"
                        aria-label="حذف عضو"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </span>
                </div>
                {expanded === m.id && (
                  <div className="mt-2 space-y-1">
                    {ts.map((t) => (
                      <button key={t.id} onClick={() => openTask(t.id)} className="flex justify-between w-full text-[11px] py-0.5 hover:text-brand-700">
                        <span className={`truncate ${isDone(p, t) ? "line-through text-ink-400" : "text-ink-700"}`}>{t.title}</span>
                        <span className="text-ink-400 shrink-0 mr-2">{columnLabel(p, t.status)}</span>
                      </button>
                    ))}
                    {ts.length === 0 && <p className="text-[11px] text-ink-400">تسکی ندارد.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Users size={20} />} title="عضوی ثبت نشده" description="اعضای تیم و میزان تخصیص آن‌ها را تعریف کنید." />
      )}

      <div className="card p-4">
        <SectionTitle icon={<ShieldCheck size={15} className="text-brand-600" />} title="نقش‌ها و دسترسی‌ها در پروژه" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {roleDefs.map((r) => (
            <div key={r.role} className="border border-ink-200 rounded-lg p-3">
              <Badge tone={roleTone[r.role]}>{r.role}</Badge>
              <p className="text-[11px] text-ink-500 mt-2 leading-5">{r.desc}</p>
              <p className="text-[10.5px] text-ink-400 mt-1">{fa(p.members.filter((m) => m.role === r.role).length)} نفر</p>
            </div>
          ))}
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="افزودن عضو به پروژه" description="هم کاربر سامانه و هم تیم/واحد قابل افزودن است.">
        <div className="space-y-3">
          <Field label="نام (کاربر یا تیم)">
            <input className="input-field" list="pm-users" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام را بنویسید یا از فهرست انتخاب کنید" />
            <datalist id="pm-users">
              {users.filter((u) => !p.members.some((m) => m.name === u.name)).map((u) => (
                <option key={u.id} value={u.name}>
                  {u.role}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="عنوان شغلی در پروژه">
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: طراح، برنامه‌نویس، تستر" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نقش">
              <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
                {roleDefs.filter((r) => r.role !== "مالک").map((r) => (
                  <option key={r.role}>{r.role}</option>
                ))}
              </select>
            </Field>
            <Field label={`تخصیص: ${fa(alloc)}٪`}>
              <input type="range" min={0} max={100} step={10} value={alloc} onChange={(e) => setAlloc(Number(e.target.value))} className="w-full accent-[var(--color-brand-600)]" />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={add}>
              افزودن
            </Button>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      <CrossProjects name={crossFor} onClose={() => setCrossFor(null)} />
    </div>
  );
}

/** معادل GET /projects/member-all-projects-progress/?user_id= */
function CrossProjects({ name, onClose }: { name: string | null; onClose: () => void }) {
  const { projects } = useProjectsPM();
  if (!name) return null;
  const rows = projects
    .filter((p) => p.members.some((m) => m.name === name) || p.tasks.some((t) => t.assignee === name))
    .map((p) => ({ id: p.meta.id, name: p.meta.name, ...memberStats(p, name) }));
  const total = rows.reduce((s, r) => ({ t: s.t + r.task_count, c: s.c + r.closed_task_count }), { t: 0, c: 0 });
  return (
    <Modal open onClose={onClose} title={`پیشرفت «${name}» در همه‌ی پروژه‌ها`} >
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-ink-800">{r.name}</span>
              <span className="text-ink-500">
                {fa(r.closed_task_count)}/{fa(r.task_count)} تسک · {fa(r.progress_percentage)}٪
              </span>
            </div>
            <Progress value={r.progress_percentage} />
          </div>
        ))}
        <div className="border-t border-ink-100 pt-3 text-xs text-ink-600">
          جمع کل: {fa(total.c)} از {fa(total.t)} تسک بسته شده ({fa(total.t ? Math.round((total.c / total.t) * 100) : 0)}٪)
        </div>
      </div>
    </Modal>
  );
}
