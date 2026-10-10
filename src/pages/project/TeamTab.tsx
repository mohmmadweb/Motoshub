import { useEffect, useState } from "react";
import { Users, Plus, UserMinus, BarChart3, KeyRound, Eye, Crown } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { users } from "../../data/mock";
import { isDone, memberStats, columnLabel } from "../../pm/selectors";
import { fa } from "../../pm/jalali";
import { checkEditMember, isOwner, newMemberAccess } from "../../pm/access";
import { projectDefaultsStore } from "../settings/projectDefaults";
import { Field, Progress, SectionTitle, useProjectPage } from "./shared";
import MemberAccessDrawer, { accessSummary } from "./MemberAccessDrawer";

export default function TeamTab() {
  const { p, pid, can, openTask, focusId, access } = useProjectPage();
  const canEdit = can("projects.members");
  const [accessFor, setAccessFor] = useState<string | null>(null);
  const ed = access.editor;
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState<string | null>(focusId ?? null);
  const [crossFor, setCrossFor] = useState<string | null>(null);
  /** پس از افزودن عضو، ویرایشگر دسترسی او باز می‌شود تا مدیر بخش‌های لازم را تیک بزند */
  const [openAfterAdd, setOpenAfterAdd] = useState<string | null>(null);

  useEffect(() => {
    if (!openAfterAdd) return;
    const m = p.members.find((x) => x.name === openAfterAdd);
    if (m) {
      setOpenAfterAdd(null);
      if (checkEditMember(ed, m, p.meta.manager).ok) setAccessFor(m.id);
    }
  }, [openAfterAdd, p.members, ed, p.meta.manager]);

  const add = () => {
    const nm = name.trim();
    if (!nm) return notify("نام عضو الزامی است.", "warning");
    if (p.members.some((m) => m.name === nm)) return notify("این فرد قبلاً عضو پروژه است.", "warning");
    const u = users.find((x) => x.name === nm);
    // نقش فقط برای سازگاری داده ذخیره می‌شود؛ دسترسی از «دسترسی عضو تازه» در پیش‌فرض‌های پروژه شروع می‌شود
    pm.addMember(pid, { name: nm, title: title.trim() || u?.role || "عضو تیم", role: "عضو", userId: u?.id, access: newMemberAccess(projectDefaultsStore.get().memberAccess), accessExplicit: true });
    notify(`«${nm}» اضافه شد و اعلان خوش‌آمد دریافت کرد. حالا بخش‌های لازم را برایش انتخاب کنید.`);
    setAddOpen(false);
    setName("");
    setTitle("");
    setOpenAfterAdd(nm);
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
            const owner = isOwner(m);
            const isMgr = m.name === p.meta.manager;
            const editable = !p.meta.archived && checkEditMember(ed, m, p.meta.manager).ok;
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
                  {owner ? (
                    <Badge tone="navy" icon={<Crown size={11} />}>
                      مالک
                    </Badge>
                  ) : (
                    isMgr && <Badge tone="brand">مدیر پروژه</Badge>
                  )}
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
                <button
                  type="button"
                  onClick={() => setAccessFor(m.id)}
                  title={editable ? "ویرایش دسترسی‌های این عضو" : "مشاهده‌ی دسترسی‌ها (فقط‌خواندنی)"}
                  aria-label={`${editable ? "ویرایش" : "مشاهده‌ی"} دسترسی‌های ${m.name}`}
                  className={`mt-3 w-full flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] border transition-colors ${editable ? "border-brand-200 bg-brand-50/50 text-brand-700 hover:bg-brand-50" : "border-ink-200 bg-ink-50/60 text-ink-600 hover:bg-ink-50"}`}
                >
                  {editable ? <KeyRound size={13} /> : <Eye size={13} />}
                  <span className="truncate">{accessSummary(m)}</span>
                  <span className="mr-auto text-[10.5px] opacity-70">{editable ? "ویرایش" : "مشاهده"}</span>
                </button>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 text-[11px]">
                  <button onClick={() => setExpanded(expanded === m.id ? null : m.id)} className="text-brand-700 hover:underline">
                    {fa(st.open_task_count)} تسک باز · پیشرفت {fa(st.progress_percentage)}٪
                  </button>
                  <span className="flex items-center gap-1">
                    <button onClick={() => setCrossFor(m.name)} className="p-1 text-ink-400 hover:text-brand-600" title="پیشرفت در همه‌ی پروژه‌ها" aria-label="پیشرفت در همه‌ی پروژه‌ها">
                      <BarChart3 size={14} />
                    </button>
                    {canEdit && !owner && (
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
        <EmptyState icon={<Users size={20} />} title="عضوی ثبت نشده" description="اعضای تیم را اضافه کنید و برای هر نفر بخش‌های لازم پروژه را تعیین کنید." />
      )}

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
          <Field label="عنوان شغلی در پروژه" hint="عضو تازه فقط وظایف، مایل‌ستون‌ها و جلسات را می‌بیند؛ پس از افزودن، بخش‌های لازم را برایش انتخاب کنید.">
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: طراح، برنامه‌نویس، تستر" />
          </Field>
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
      <MemberAccessDrawer pid={pid} member={p.members.find((m) => m.id === accessFor) ?? null} editor={ed} archived={p.meta.archived} onClose={() => setAccessFor(null)} />
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
