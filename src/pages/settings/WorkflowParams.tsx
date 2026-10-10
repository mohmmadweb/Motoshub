// ---------------------------------------------------------------------------
// پارامترهای گردش کار به تفکیک ماژول — جایگزین بخش واحد «پارامترهای گردش کار».
// منبع: SettingsContext (useSettings)؛ هر کارت فقط پارامترهای یک ماژول را نشان و ذخیره می‌کند.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { defaultSettings, settingsMetaOf, useSettings, type SettingsModule, type WorkflowSettings } from "../../context/SettingsContext";

type Key = keyof WorkflowSettings;

export default function WorkflowParamsCard({ module, title, description, canEdit = true, editableKeys }: { module: SettingsModule; title: string; description?: string; canEdit?: boolean; editableKeys?: Key[] }) {
  const { settings, update } = useSettings();
  const { notify } = useToast();
  const metas = settingsMetaOf(module);
  const pick = (src: WorkflowSettings) => Object.fromEntries(metas.map((m) => [m.key, src[m.key]])) as Partial<WorkflowSettings>;
  const [draft, setDraft] = useState<Partial<WorkflowSettings>>(() => pick(settings));
  // اگر مقدار از جای دیگر (مثلاً «تنظیمات صندوق») عوض شد، پیش‌نویسِ دست‌نخورده هم به‌روز شود
  const prev = useRef(settings);
  useEffect(() => {
    const old = prev.current;
    prev.current = settings;
    setDraft((d) => Object.fromEntries(metas.map((m) => [m.key, d[m.key] === old[m.key] ? settings[m.key] : d[m.key]])) as Partial<WorkflowSettings>);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const can = (k: Key) => canEdit && (!editableKeys || editableKeys.includes(k));
  const dirty = metas.some((m) => draft[m.key] !== settings[m.key]);

  const save = () => {
    const patch: Partial<WorkflowSettings> = {};
    metas.forEach((m) => {
      const v = draft[m.key];
      if (can(m.key) && typeof v === "number" && Number.isFinite(v) && v !== settings[m.key]) patch[m.key] = Math.max(0, v);
    });
    if (!Object.keys(patch).length) return;
    update(patch);
    notify("پارامترها ذخیره شد و از این لحظه در همه‌ی روندها اعمال می‌شود.", "success");
  };
  const resetDefaults = () => {
    const next = { ...draft };
    metas.forEach((m) => {
      if (can(m.key)) next[m.key] = defaultSettings[m.key];
    });
    setDraft(next);
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-bold text-ink-900">{title}</h3>
          {description && <p className="text-[11.5px] text-ink-500 mt-0.5 leading-5">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} disabled={!canEdit} onClick={resetDefaults}>
            پیش‌فرض
          </Button>
          <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
            ذخیره
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {metas.map((m) => (
          <div key={m.key} className="rounded-lg border border-ink-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-ink-900">{m.label}</p>
                <p className="text-[11px] text-ink-400 mt-0.5 leading-5">{m.hint}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  value={draft[m.key] ?? ""}
                  disabled={!can(m.key)}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [m.key]: Number(e.target.value) }))}
                  className="input-field w-20 text-center px-2 py-1.5"
                  dir="ltr"
                  aria-label={m.label}
                />
                <span className="text-[11px] text-ink-400 whitespace-nowrap">{m.unit}</span>
              </div>
            </div>
            {draft[m.key] !== settings[m.key] && <p className="text-[10.5px] text-amber-700 mt-2">تغییر ذخیره‌نشده (مقدار فعلی: {settings[m.key].toLocaleString("fa-IR")})</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
