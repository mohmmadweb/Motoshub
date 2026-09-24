import { useState, type ReactNode } from "react";
import { KanbanSquare, FileText, Gavel, Bug, Users, Lightbulb, Plus, ArrowUpFromLine, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import { ExperienceCard, ExperienceForm, blankExperience } from "./ExperienceSection";
import { SectionHead } from "./shared";

type Draft = Parameters<typeof ExperienceForm>[0]["value"];

/** بند ۲۰ و ۲۱: پرونده‌ی دانش یک پروژه + درس‌آموخته‌ها + انتقال به مخزن سازمانی */
export function ProjectKnowledgeFile({ projectId, inProjectPage = false }: { projectId: string; inProjectPage?: boolean }) {
  const km = useKnowledge();
  const pm = useProjectsPM();
  const { hasPermission } = useTenancy();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [draft, setDraft] = useState<Draft>(null);
  const p = pm.getProject(projectId);
  if (!p) return null;
  const lessons = km.experiences.filter((e) => e.projectId === projectId);
  const decisions = p.minutes.flatMap((m) => (m.decisionList ?? []).map((d) => ({ d, m: m.title, date: m.date })));
  const transferred = km.docs.filter((d) => d.relations.some((r) => r.type === "project" && r.id === projectId));
  const closing = p.meta.phase === "تکمیل" || p.meta.phase === "اختتام";

  const transfer = () => {
    const run = () => {
      const n = km.transferProjectKnowledge(
        projectId,
        p.meta.name,
        p.documents.map((d) => ({ name: d.name, type: d.type, size: d.size }))
      );
      notify(n ? `${fa(n)} سند و همه‌ی درس‌آموخته‌های پروژه به مخزن دانش سازمان منتقل و منتشر شد.` : "اسناد این پروژه قبلاً منتقل شده‌اند؛ درس‌آموخته‌ها منتشر شدند.");
    };
    if (!closing) confirm({ title: "پروژه هنوز به مرحله‌ی تکمیل/اختتام نرسیده", message: "انتقال دانش معمولاً پس از پایان پروژه انجام می‌شود. با این حال منتقل شود؟", confirmLabel: "منتقل کن", onConfirm: run });
    else run();
  };

  const Block = ({ icon, title, count, children }: { icon: ReactNode; title: string; count: number; children: ReactNode }) => (
    <div className="card p-4">
      <p className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5">
        {icon} {title} <span className="text-ink-400 font-normal">({fa(count)})</span>
      </p>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-ink-900">
            پرونده‌ی دانش پروژه{inProjectPage ? "" : `: ${p.meta.name}`}
          </p>
          <p className="text-xs text-ink-400 mt-0.5">
            مرحله: {p.meta.phase} · {transferred.length ? `${fa(transferred.length)} سند در مخزن سازمانی` : "هنوز به مخزن سازمانی منتقل نشده"}
          </p>
        </div>
        <div className="flex gap-2">
          {!inProjectPage && (
            <Link to={`/dashboard/projects/${projectId}`} className="text-xs text-brand-700 hover:underline flex items-center gap-1">
              <ExternalLink size={12} /> باز کردن پروژه
            </Link>
          )}
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setDraft(blankExperience("درس‌آموخته", km.me, km.settings.units[0], projectId))}>
            ثبت درس‌آموخته
          </Button>
          {hasPermission("knowledge.upload") && (
            <Button size="sm" variant="primary" icon={<ArrowUpFromLine size={13} />} onClick={transfer}>
              انتقال دانش به مخزن سازمان
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Block icon={<FileText size={13} className="text-brand-600" />} title="مستندات و گزارش‌ها" count={p.documents.length}>
          {p.documents.slice(0, 8).map((d) => (
            <p key={d.id} className="text-xs text-ink-700 py-0.5 flex justify-between gap-2">
              <span className="truncate">{d.name}</span>
              <span className="text-ink-400 shrink-0">{d.type}</span>
            </p>
          ))}
          {p.documents.length === 0 && <p className="text-[11px] text-ink-400">سندی ثبت نشده.</p>}
        </Block>
        <Block icon={<Gavel size={13} className="text-navy-700" />} title="تصمیمات (از صورت‌جلسات)" count={decisions.length}>
          {decisions.slice(0, 6).map((x, i) => (
            <p key={i} className="text-xs text-ink-700 py-0.5">
              • {x.d} <span className="text-ink-400">— {x.m}</span>
            </p>
          ))}
          {decisions.length === 0 && <p className="text-[11px] text-ink-400">تصمیمی ثبت نشده.</p>}
        </Block>
        <Block icon={<Bug size={13} className="text-rose-600" />} title="مشکلات و راهکارها" count={p.issues.length + p.risks.length}>
          {p.issues.map((i) => (
            <p key={i.id} className="text-xs text-ink-700 py-0.5 flex gap-2 items-center">
              <Badge tone={i.status === "حل‌شده" || i.status === "بسته‌شده" ? "success" : "warning"}>{i.status}</Badge>
              <span className="truncate">{i.title}</span>
            </p>
          ))}
          {p.risks.map((r) => (
            <p key={r.id} className="text-xs text-ink-700 py-0.5">
              <span className="text-ink-400">ریسک «{r.title}» — راهکار:</span> {r.mitigation}
            </p>
          ))}
        </Block>
        <Block icon={<Users size={13} className="text-emerald-600" />} title="افراد کلیدی" count={p.members.length}>
          <div className="flex flex-wrap gap-1.5">
            {p.members.map((m) => (
              <span key={m.id} className="text-[11px] bg-ink-100 rounded px-2 py-0.5">
                {m.name} <span className="text-ink-400">({m.role === "عضو" ? m.title : m.role})</span>
              </span>
            ))}
          </div>
        </Block>
      </div>

      <div>
        <p className="text-sm font-bold text-ink-900 mb-2 flex items-center gap-1.5">
          <Lightbulb size={15} className="text-amber-500" /> تجربیات و درس‌آموخته‌های پروژه ({fa(lessons.length)})
        </p>
        {lessons.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {lessons.map((e) => (
              <ExperienceCard key={e.id} e={e} onEdit={e.author === km.me || hasPermission("knowledge.experiences") ? () => setDraft({ ...e }) : undefined} onDelete={e.author === km.me || hasPermission("knowledge.experiences") ? () => confirm({ title: `حذف «${e.title}»؟`, onConfirm: () => km.deleteExperience(e.id) }) : undefined} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Lightbulb size={20} />} title="درس‌آموخته‌ای ثبت نشده" description="مسئله، علت، اقدام، نتیجه و آنچه در آینده باید انجام شود را ثبت کنید تا پروژه‌های بعدی از آن استفاده کنند." />
        )}
      </div>
      {draft && <ExperienceForm value={draft} onClose={() => setDraft(null)} lockProject />}
    </div>
  );
}

export default function ProjectsKnowledgeSection({ focus }: { focus?: string }) {
  const km = useKnowledge();
  const pm = useProjectsPM();
  const initial = focus && pm.getProject(focus) ? focus : km.experiences.find((e) => e.id === focus)?.projectId ?? pm.projects[0]?.meta.id ?? "";
  const [sel, setSel] = useState(initial);
  return (
    <div>
      <SectionHead icon={<KanbanSquare size={17} className="text-brand-600" />} title="پروژه‌ها و درس‌آموخته‌های پروژه" hint="برای هر پروژه یک پرونده‌ی دانش ساخته می‌شود: مستندات، گزارش‌ها، تصمیمات، مشکلات و راهکارها، افراد کلیدی و درس‌آموخته‌ها. پس از پایان پروژه، دانش آن به مخزن سازمان منتقل می‌شود." />
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <aside className="card p-2 self-start">
          {pm.projects.map((p) => {
            const n = km.experiences.filter((e) => e.projectId === p.meta.id).length;
            return (
              <button key={p.meta.id} onClick={() => setSel(p.meta.id)} className={`w-full text-right px-2.5 py-2 rounded-md text-xs ${sel === p.meta.id ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-700 hover:bg-ink-50"}`}>
                <span className="block truncate">{p.meta.name}</span>
                <span className="text-[10.5px] text-ink-400">
                  {p.meta.phase} · {fa(n)} درس‌آموخته
                </span>
              </button>
            );
          })}
        </aside>
        {sel ? <ProjectKnowledgeFile projectId={sel} /> : <EmptyState title="پروژه‌ای نیست" />}
      </div>
    </div>
  );
}
