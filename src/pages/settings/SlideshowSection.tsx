// ---------------------------------------------------------------------------
// «تنظیمات سامانه ← برند و ظاهر ← اسلایدشو» (F15) — مدیریت اسلایدهای صفحه‌ی عمومی:
// افزودن/ویرایش (تصویر دسکتاپ و موبایل، عنوان، زیرعنوان، دکمه و لینک، بازه‌ی نمایش، مخاطب)،
// مرتب‌سازی با کشیدن (و دکمه‌های بالا/پایین برای صفحه‌کلید/موبایل)، فعال/غیرفعال، پیش‌نمایش،
// و تنظیمات اسلایدر (زمان هر اسلاید، پخش خودکار، نشانگرها). هر تغییر در لاگ ممیزی ثبت می‌شود.
// ---------------------------------------------------------------------------
import { useState, type DragEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, GalleryHorizontal, GripVertical, ImagePlus, Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Toggle from "../../components/ui/Toggle";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useLocalStore } from "../../iam/store";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { dayNum, nowClock } from "../../pm/jalali";
import { platformEndpoints } from "../../lib/platformEndpoints";
import { ApiChip } from "../social/kit";
import { SectionHead, ScopeSelect, Field } from "./iam/shared";
import { Slider, audienceLabel, slideStatus, slideStore, type Slide, type SlideAudience, type SliderSettings } from "../../components/Slideshow";

const GALLERY = ["lab", "expo", "training", "energy", "meeting", "teamwork", "factory", "datacenter", "rail", "agri-drone", "construction", "warehouse", "school", "dairy"].map((n) => `/img/${n}.jpg`);
const statusMeta: Record<ReturnType<typeof slideStatus>, { label: string; tone: BadgeTone }> = {
  live: { label: "در حال نمایش", tone: "success" },
  scheduled: { label: "زمان‌بندی‌شده", tone: "brand" },
  expired: { label: "منقضی", tone: "neutral" },
  inactive: { label: "غیرفعال", tone: "neutral" },
};
const blank = (order: number): Slide => ({ id: "", image_desktop: GALLERY[0], image_mobile: "", title: "", subtitle: "", cta_text: "", cta_url: "", starts_at: "", ends_at: "", audience: "public", scope_id: null, order, is_active: true, placement: "both", updated_at: "" });

export default function SlideshowSection() {
  const st = useLocalStore(slideStore);
  const t = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const can = t.hasPermission("settings.branding") && !t.readOnly;
  const [edit, setEdit] = useState<Slide | null>(null);
  const [preview, setPreview] = useState<"landing" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const slides = [...st.slides].sort((a, b) => a.order - b.order);
  const stamp = () => `${t.today} ${nowClock()}`;
  const audit = (summary: string, before?: Record<string, unknown>, after?: Record<string, unknown>) => emitSettingsChange({ area: "اسلایدشو", summary, before, after });

  const reorder = (ids: string[]) => {
    slideStore.set((s) => ({ ...s, slides: s.slides.map((x) => ({ ...x, order: ids.indexOf(x.id) + 1 })) }));
    audit("تغییر ترتیب اسلایدها", { order: slides.map((x) => x.title) }, { order: ids.map((id) => slides.find((x) => x.id === id)?.title) });
  };
  const move = (id: string, d: -1 | 1) => {
    const ids = slides.map((x) => x.id);
    const i = ids.indexOf(id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(ids);
  };
  const onDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const ids = slides.map((x) => x.id).filter((x) => x !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    reorder(ids);
    setDragId(null);
  };
  const toggle = (s: Slide) => {
    slideStore.set((x) => ({ ...x, slides: x.slides.map((y) => (y.id === s.id ? { ...y, is_active: !y.is_active, updated_at: stamp() } : y)) }));
    audit(`${s.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"} اسلاید «${s.title}»`, { is_active: s.is_active }, { is_active: !s.is_active });
  };
  const remove = (s: Slide) =>
    confirm({
      title: `اسلاید «${s.title}» حذف شود؟`,
      confirmLabel: "حذف",
      onConfirm: () => {
        slideStore.set((x) => ({ ...x, slides: x.slides.filter((y) => y.id !== s.id) }));
        audit(`حذف اسلاید «${s.title}»`, { id: s.id, title: s.title }, undefined);
        notify("اسلاید حذف شد.", "success");
      },
    });
  const save = (s: Slide) => {
    if (!s.title.trim()) return notify("عنوان اسلاید الزامی است.", "warning");
    if (!s.image_desktop) return notify("تصویر دسکتاپ الزامی است.", "warning");
    if (s.starts_at && s.ends_at && (dayNum(s.ends_at) ?? 0) < (dayNum(s.starts_at) ?? 0)) return notify("پایان بازه‌ی نمایش باید بعد از شروع باشد.", "warning");
    if (s.audience === "scope" && !s.scope_id) return notify("لایه‌ی سازمانی مخاطب را انتخاب کنید.", "warning");
    if (s.cta_text && !s.cta_url) return notify("برای دکمه، لینک را هم وارد کنید.", "warning");
    const next = { ...s, title: s.title.trim(), scope_id: s.audience === "scope" ? s.scope_id : null, updated_at: stamp() };
    if (s.id) {
      const prev = st.slides.find((x) => x.id === s.id);
      slideStore.set((x) => ({ ...x, slides: x.slides.map((y) => (y.id === s.id ? next : y)) }));
      audit(`ویرایش اسلاید «${next.title}»`, prev ? { title: prev.title, starts_at: prev.starts_at, ends_at: prev.ends_at, audience: prev.audience, placement: prev.placement } : undefined, { title: next.title, starts_at: next.starts_at, ends_at: next.ends_at, audience: next.audience, placement: next.placement });
    } else {
      const id = `sl${st.seq + 1}`;
      slideStore.set((x) => ({ ...x, seq: x.seq + 1, slides: [...x.slides, { ...next, id }] }));
      audit(`افزودن اسلاید «${next.title}»`, undefined, { title: next.title, placement: next.placement, audience: next.audience });
    }
    notify("اسلاید ذخیره شد.", "success");
    setEdit(null);
  };
  const setSettings = (where: "landing", patch: Partial<SliderSettings>) => {
    const before = st.settings[where];
    slideStore.set((x) => ({ ...x, settings: { ...x.settings, [where]: { ...x.settings[where], ...patch } } }));
    audit("تنظیمات اسلایدر صفحه‌ی عمومی", { ...before }, { ...before, ...patch });
  };

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<GalleryHorizontal size={18} />}
        title="اسلایدشو"
        description="اسلایدهای صفحه‌ی عمومی — با ترتیب، بازه‌ی زمانی و مخاطب."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ApiChip
              items={[
                { label: "فهرست اسلایدها", ep: platformEndpoints.slides() },
                { label: "افزودن اسلاید", ep: platformEndpoints.slideCreate() },
                { label: "ویرایش اسلاید", ep: platformEndpoints.slideUpdate("{id}") },
                { label: "حذف اسلاید", ep: platformEndpoints.slideDelete("{id}") },
                { label: "مرتب‌سازی", ep: platformEndpoints.slidesReorder() },
              ]}
            />
            {can && (
              <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setEdit(blank(slides.length + 1))}>
                اسلاید جدید
              </Button>
            )}
          </div>
        }
      />

      <div className="card overflow-hidden">
        {slides.length === 0 ? (
          <EmptyState icon={<GalleryHorizontal size={22} />} title="اسلایدی تعریف نشده است" />
        ) : (
          <ul className="divide-y divide-ink-100">
            {slides.map((s, i) => {
              const status = statusMeta[slideStatus(s, t.today)];
              return (
                <li
                  key={s.id}
                  draggable={can}
                  onDragStart={() => setDragId(s.id)}
                  onDragOver={(e) => can && e.preventDefault()}
                  onDrop={(e) => onDrop(e, s.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 ${dragId === s.id ? "opacity-40" : ""}`}
                >
                  {can && (
                    <span className="flex flex-col items-center shrink-0 text-ink-300">
                      <GripVertical size={14} className="hidden sm:block cursor-grab" aria-hidden />
                      <span className="flex sm:hidden flex-col">
                        <button onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="بالاتر" className="disabled:opacity-30">
                          <ArrowUp size={12} />
                        </button>
                        <button onClick={() => move(s.id, 1)} disabled={i === slides.length - 1} aria-label="پایین‌تر" className="disabled:opacity-30">
                          <ArrowDown size={12} />
                        </button>
                      </span>
                    </span>
                  )}
                  <img src={s.image_desktop} alt="" className="w-16 h-10 sm:w-20 sm:h-12 rounded-md object-cover shrink-0 bg-ink-100" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink-900 truncate">{s.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className="text-[10.5px] text-ink-400">
                        {s.audience === "scope" ? t.scopeLabel(s.scope_id ?? undefined) : audienceLabel[s.audience]}
                        {(s.starts_at || s.ends_at) && ` · ${s.starts_at || "…"} تا ${s.ends_at || "…"}`}
                      </span>
                    </div>
                  </div>
                  {can && (
                    <span className="hidden sm:flex items-center gap-0.5 shrink-0">
                      <button onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="بالاتر" className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30">
                        <ArrowUp size={13} />
                      </button>
                      <button onClick={() => move(s.id, 1)} disabled={i === slides.length - 1} aria-label="پایین‌تر" className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30">
                        <ArrowDown size={13} />
                      </button>
                    </span>
                  )}
                  <Toggle on={s.is_active} disabled={!can} onChange={() => toggle(s)} label={s.is_active ? "غیرفعال‌سازی اسلاید" : "فعال‌سازی اسلاید"} />
                  {can && <RowActions size={13} onEdit={() => setEdit(s)} onDelete={() => remove(s)} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["landing"] as const).map((w) => {
          const cfg = st.settings[w];
          return (
            <div key={w} className="card p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-ink-900">اسلایدر صفحه‌ی عمومی</p>
                <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setPreview(w)}>
                  پیش‌نمایش
                </Button>
              </div>
              <Row label="نمایش اسلایدر">
                <Toggle on={cfg.enabled} disabled={!can} onChange={() => setSettings(w, { enabled: !cfg.enabled })} label="نمایش اسلایدر" />
              </Row>
              <Row label="پخش خودکار (توقف با نشانگر ماوس)">
                <Toggle on={cfg.autoplay} disabled={!can} onChange={() => setSettings(w, { autoplay: !cfg.autoplay })} label="پخش خودکار" />
              </Row>
              <Row label="نشانگرها">
                <Toggle on={cfg.indicators} disabled={!can} onChange={() => setSettings(w, { indicators: !cfg.indicators })} label="نشانگرها" />
              </Row>
              <Row label="زمان هر اسلاید">
                <select className="input-field w-28" value={cfg.interval_sec} disabled={!can} onChange={(e) => setSettings(w, { interval_sec: Number(e.target.value) })} aria-label="زمان هر اسلاید">
                  {[4, 6, 8, 10, 15].map((n) => (
                    <option key={n} value={n}>
                      {n.toLocaleString("fa-IR")} ثانیه
                    </option>
                  ))}
                </select>
              </Row>
            </div>
          );
        })}
      </div>

      {edit && <SlideEditor value={edit} onClose={() => setEdit(null)} onSave={save} />}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="پیش‌نمایش صفحه‌ی عمومی" description="اسلایدهای در حال نمایش امروز، با ترتیب فعلی (مخاطب «لایه‌ی سازمانی» در پیش‌نمایش هم دیده می‌شود)." width="max-w-3xl">
        {preview && (
          <PreviewSlides where={preview} slides={slides.filter((s) => s.placement !== "dashboard" && slideStatus(s, t.today) === "live" && s.audience === "public")} settings={st.settings[preview]} />
        )}
      </Modal>
    </div>
  );
}

function PreviewSlides({ slides, settings }: { where: "landing"; slides: Slide[]; settings: SliderSettings }) {
  if (!slides.length) return <p className="text-sm text-ink-500">امروز اسلایدی برای این مکان در حال نمایش نیست.</p>;
  return <Slider slides={slides} settings={settings} variant="hero" label="پیش‌نمایش اسلایدشو" />;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-ink-700">{label}</span>
      {children}
    </div>
  );
}

function ImagePick({ label, value, onChange, optional }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
  const { notify } = useToast();
  const upload = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return notify("فقط فایل تصویری.", "warning");
    if (f.size > 1.5 * 1024 * 1024) return notify("حداکثر حجم تصویر ۱٫۵ مگابایت است.", "warning");
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <Box label={label}>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {optional && (
          <button type="button" onClick={() => onChange("")} className={`shrink-0 w-14 h-10 rounded-md border-2 text-[10px] text-ink-500 ${!value ? "border-brand-500" : "border-ink-200"}`}>
            همان دسکتاپ
          </button>
        )}
        {value.startsWith("data:") && <img src={value} alt="" className="shrink-0 w-14 h-10 rounded-md object-cover border-2 border-brand-500" />}
        {GALLERY.map((g) => (
          <button type="button" key={g} onClick={() => onChange(g)} className={`shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 ${value === g ? "border-brand-500" : "border-transparent"}`} aria-label={`تصویر ${g}`}>
            <img src={g} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        <label className="shrink-0 w-14 h-10 rounded-md border-2 border-dashed border-ink-300 flex items-center justify-center text-ink-400 hover:text-brand-600 cursor-pointer" title="بارگذاری تصویر">
          <ImagePlus size={15} />
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
    </Box>
  );
}

/** مثل Field ولی بدون <label> (برای کنترل‌های چنددکمه‌ای) */
function Box({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="block text-[12px] font-semibold text-ink-700 mb-1">{label}</span>
      {children}
    </div>
  );
}

function SlideEditor({ value, onClose, onSave }: { value: Slide; onClose: () => void; onSave: (s: Slide) => void }) {
  const t = useTenancy();
  const [s, setS] = useState<Slide>(value);
  const set = (p: Partial<Slide>) => setS((x) => ({ ...x, ...p }));
  return (
    <Modal open onClose={onClose} title={value.id ? "ویرایش اسلاید" : "اسلاید جدید"} description={value.id ? `PATCH /core/slides/${value.id}/` : "POST /core/slides/"} width="max-w-2xl">
      <div className="space-y-3">
        <Slider slides={[s.title ? s : { ...s, title: "عنوان اسلاید" }]} settings={{ enabled: true, autoplay: false, indicators: false, interval_sec: 6 }} variant="hero" label="پیش‌نمایش اسلاید" />
        <ImagePick label="تصویر دسکتاپ (image_desktop)" value={s.image_desktop} onChange={(v) => set({ image_desktop: v })} />
        <ImagePick label="تصویر موبایل (image_mobile) — اختیاری" value={s.image_mobile} onChange={(v) => set({ image_mobile: v })} optional />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="عنوان (title)">
            <input className="input-field" value={s.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
          </Field>
          <Field label="زیرعنوان (subtitle)">
            <input className="input-field" value={s.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
          </Field>
          <Field label="متن دکمه (cta_text)">
            <input className="input-field" value={s.cta_text} onChange={(e) => set({ cta_text: e.target.value })} placeholder="مثلاً: ثبت‌نام" />
          </Field>
          <Field label="لینک دکمه (cta_url)">
            <input className="input-field" dir="ltr" value={s.cta_url} onChange={(e) => set({ cta_url: e.target.value })} placeholder="/dashboard/events یا https://…" />
          </Field>
          <Box label="شروع نمایش (starts_at)">
            <JalaliDatePicker value={s.starts_at} onChange={(v) => set({ starts_at: v })} placeholder="از همین حالا" />
          </Box>
          <Box label="پایان نمایش (ends_at)">
            <JalaliDatePicker value={s.ends_at} onChange={(v) => set({ ends_at: v })} placeholder="بدون پایان" />
          </Box>
          <Field label="مخاطب (audience)">
            <select className="input-field" value={s.audience} onChange={(e) => set({ audience: e.target.value as SlideAudience })}>
              {(Object.keys(audienceLabel) as SlideAudience[]).map((k) => (
                <option key={k} value={k}>
                  {audienceLabel[k]}
                </option>
              ))}
            </select>
          </Field>
          {s.audience === "scope" && (
            <Box label="لایه‌ی سازمانی (scope_id)">
              <ScopeSelect value={s.scope_id ?? ""} onChange={(id) => set({ scope_id: id || null })} nodes={t.iam.scopes.filter((n) => n.active)} allLabel="انتخاب لایه…" />
            </Box>
          )}
        </div>
        {s.audience !== "public" && <p className="text-[11.5px] text-amber-700">صفحه‌ی عمومی فقط اسلایدهای با مخاطب «عمومی» را نشان می‌دهد.</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-2 text-[12.5px] text-ink-700">
            <Toggle on={s.is_active} onChange={() => set({ is_active: !s.is_active })} label="فعال" /> فعال (is_active)
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>انصراف</Button>
            <Button variant="primary" onClick={() => onSave(s)}>
              ذخیره
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
