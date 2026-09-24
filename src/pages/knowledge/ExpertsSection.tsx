import { useState } from "react";
import { Users, Plus, Search, X, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import Avatar from "../../components/Avatar";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { users } from "../../data/mock";
import { fa } from "../../pm/jalali";
import type { Expert } from "../../km/types";
import { Field, RelationsEditor, SectionHead } from "./shared";
import { useKPage } from "./ctx";

/** بند ۶: خبرگان و صاحبان دانش */
export default function ExpertsSection() {
  const km = useKnowledge();
  const page = useKPage();
  const navigate = useNavigate();
  const { hasPermission } = useTenancy();
  const canEdit = hasPermission("knowledge.experts");
  const confirm = useConfirm();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [viewId, setViewId] = useState<string | null>(page.focus && km.experts.some((x) => x.id === page.focus) ? page.focus : null);
  const [draft, setDraft] = useState<(Omit<Expert, "id"> & { id?: string }) | null>(null);
  const [areaInput, setAreaInput] = useState("");
  const allAreas = [...new Set(km.experts.flatMap((e) => e.areas))];
  const list = km.experts.filter((e) => (!area || e.areas.includes(area)) && (!q || [e.name, e.unit, e.title, e.areas.join(" "), e.topics.join(" ")].join(" ").includes(q)));
  const view = viewId ? km.experts.find((x) => x.id === viewId) : undefined;
  const docsBy = (name: string) => km.docs.filter((d) => d.owner === name || d.author === name);
  const lessonsBy = (name: string) => km.experiences.filter((e) => e.author === name);
  const color = (name: string) => users.find((u) => u.name === name)?.avatarColor ?? "#1f4f99";

  const save = () => {
    if (!draft?.name.trim()) return notify("نام خبره الزامی است.", "warning");
    km.saveExpert({ ...draft, name: draft.name.trim() });
    notify("پروفایل خبره ذخیره شد.");
    setDraft(null);
  };

  return (
    <div>
      <SectionHead
        icon={<Users size={17} className="text-brand-600" />}
        title="خبرگان و صاحبان دانش"
        hint="پروفایل خبره، واحد، حوزه‌های تخصصی، سوابق، دانش‌های تحت پوشش و اسناد مرتبط — با جستجو بر اساس حوزه‌ی تخصصی."
        action={canEdit && <Button variant="primary" icon={<Plus size={14} />} onClick={() => setDraft({ name: "", unit: km.settings.units[0], title: "", areas: [], experience: "", topics: [], relations: [] })}>افزودن خبره</Button>}
      />
      <div className="flex gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="یافتن خبره: نام، واحد یا موضوع…" />
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        <button onClick={() => setArea("")} className={`text-xs px-2.5 py-1 rounded-full border ${!area ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
          همه‌ی حوزه‌ها
        </button>
        {allAreas.map((a) => (
          <button key={a} onClick={() => setArea(a)} className={`text-xs px-2.5 py-1 rounded-full border ${area === a ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
            {a}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((e) => (
          <div key={e.id} className="card p-4 cursor-pointer hover:border-brand-300" onClick={() => setViewId(e.id)}>
            <div className="flex items-center gap-3">
              <Avatar name={e.name} color={color(e.name)} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900 truncate">{e.name}</p>
                <p className="text-[11px] text-ink-400 truncate">{e.title}</p>
                <p className="text-[11px] text-ink-400 truncate">{e.unit}</p>
              </div>
              {canEdit && (
                <span onClick={(ev) => ev.stopPropagation()}>
                  <RowActions size={12} onEdit={() => setDraft({ ...e })} onDelete={() => confirm({ title: `حذف پروفایل «${e.name}»؟`, onConfirm: () => km.deleteExpert(e.id) })} />
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {e.areas.map((a) => (
                <span key={a} className="text-[10.5px] bg-brand-50 text-brand-700 rounded px-1.5 py-0.5">
                  {a}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-ink-400 mt-2">
              {fa(docsBy(e.name).length)} سند · {fa(lessonsBy(e.name).length)} تجربه
            </p>
          </div>
        ))}
      </div>

      <Modal open={!!view} onClose={() => setViewId(null)} title={view?.name ?? ""} description={view ? `${view.title} · ${view.unit}` : undefined} width="max-w-2xl">
        {view && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1">سوابق و تجربه</p>
              <p className="text-sm text-ink-700 leading-7">{view.experience || "—"}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1">حوزه‌های تخصصی</p>
                <div className="flex flex-wrap gap-1">
                  {view.areas.map((a) => (
                    <span key={a} className="text-[11px] bg-brand-50 text-brand-700 rounded px-1.5 py-0.5">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1">دانش‌ها و موضوعات تحت پوشش</p>
                <div className="flex flex-wrap gap-1">
                  {view.topics.map((a) => (
                    <span key={a} className="text-[11px] bg-ink-100 rounded px-1.5 py-0.5">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1">اسناد و مطالب مرتبط</p>
              {[...docsBy(view.name).map((d) => ({ id: d.id, t: `سند: ${d.title}`, go: () => page.openDoc(d.id) })), ...lessonsBy(view.name).map((x) => ({ id: x.id, t: `${x.kind}: ${x.title}`, go: () => page.go("experience", x.id) }))].map((x) => (
                <button key={x.id} onClick={x.go} className="block text-right text-xs text-brand-700 hover:underline py-0.5">
                  {x.t}
                </button>
              ))}
              {docsBy(view.name).length + lessonsBy(view.name).length === 0 && <p className="text-[11px] text-ink-400">—</p>}
            </div>
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1.5">ارتباطات (پروژه‌ها، فرآیندها، …)</p>
              <RelationsEditor kind="expert" id={view.id} relations={view.relations} canEdit={canEdit} onOpen={page.openRelation} />
            </div>
            {view.userId && (
              <Button size="sm" variant="secondary" icon={<MessageCircle size={13} />} onClick={() => navigate("/dashboard/chat")}>
                پرسش از این خبره در گفتگو
              </Button>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ویرایش خبره" : "افزودن خبره"} width="max-w-xl">
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نام">
                <input className="input-field" list="ex-users" value={draft.name} onChange={(e) => { const u = users.find((x) => x.name === e.target.value); setDraft({ ...draft, name: e.target.value, userId: u?.id, title: draft.title || u?.role || "", areas: draft.areas.length ? draft.areas : u?.skills ?? [] }); }} autoFocus />
                <datalist id="ex-users">
                  {users.map((u) => (
                    <option key={u.id} value={u.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="سمت">
                <input className="input-field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="واحد سازمانی">
                <input className="input-field" list="ex-units" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
                <datalist id="ex-units">
                  {km.settings.units.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Field label="حوزه‌های تخصصی">
              <div className="flex flex-wrap gap-1 items-center border border-ink-200 rounded-lg px-2 py-1.5">
                {draft.areas.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 text-[11px] bg-brand-50 text-brand-700 rounded px-1.5 py-0.5">
                    {a}
                    <button onClick={() => setDraft({ ...draft, areas: draft.areas.filter((x) => x !== a) })} aria-label="حذف">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input className="flex-1 min-w-[100px] text-xs outline-none bg-transparent" value={areaInput} onChange={(e) => setAreaInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && areaInput.trim()) { setDraft({ ...draft, areas: [...draft.areas, areaInput.trim()] }); setAreaInput(""); } }} placeholder="+ حوزه (Enter)" />
              </div>
            </Field>
            <Field label="موضوعات تحت پوشش (با ، جدا کنید)">
              <input className="input-field" value={draft.topics.join("، ")} onChange={(e) => setDraft({ ...draft, topics: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} />
            </Field>
            <Field label="سوابق و تجربه">
              <textarea className="input-field min-h-[70px]" value={draft.experience} onChange={(e) => setDraft({ ...draft, experience: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={save}>
                ذخیره
              </Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
