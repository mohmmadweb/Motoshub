// ---------------------------------------------------------------------------
// «تنظیمات سامانه ← برند و ظاهر ← زبان‌ها» (F14) — زبان‌های فعال، پیش‌فرض و جهت متن؛ ویرایشگر کلیدهای
// ترجمه با جستجو و درصد تکمیل؛ ورود/خروج فایل JSON. انتخاب زبان کاربر در منوی آواتار (سربرگ) است.
// ---------------------------------------------------------------------------
import { useMemo, useRef, useState } from "react";
import { Download, Languages, Save, Search, Upload } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useLocalStore } from "../../iam/store";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { platformEndpoints } from "../../lib/platformEndpoints";
import { completionOf, i18nStore, translationKeys, valueOf, type Language } from "../../i18n";
import { ApiChip } from "../social/kit";
import { SectionHead } from "./iam/shared";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function LanguagesSection() {
  const st = useLocalStore(i18nStore);
  const t = useTenancy();
  const { notify } = useToast();
  const can = t.hasPermission("settings.system") && !t.readOnly;
  const editable = st.languages.filter((l) => l.code !== "fa");
  const [lang, setLang] = useState(editable[0]?.code ?? "en");
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const audit = (summary: string, before?: Record<string, unknown>, after?: Record<string, unknown>) => emitSettingsChange({ area: "زبان‌ها", summary, before, after });

  const setLangs = (next: Language[], summary: string, before: Record<string, unknown>, after: Record<string, unknown>) => {
    i18nStore.set((s) => ({ ...s, languages: next }));
    audit(summary, before, after);
    notify(summary, "success");
  };
  const toggleActive = (l: Language) => {
    if (l.is_default) return notify("زبان پیش‌فرض را نمی‌توان غیرفعال کرد.", "warning");
    setLangs(st.languages.map((x) => (x.code === l.code ? { ...x, is_active: !x.is_active } : x)), `${l.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"} زبان ${l.name}`, { [l.code]: l.is_active }, { [l.code]: !l.is_active });
  };
  const makeDefault = (l: Language) => {
    if (!l.is_active) return notify("اول زبان را فعال کنید.", "warning");
    const prev = st.languages.find((x) => x.is_default)?.code;
    setLangs(st.languages.map((x) => ({ ...x, is_default: x.code === l.code })), `زبان پیش‌فرض: ${l.name}`, { default: prev }, { default: l.code });
  };
  const setDir = (l: Language, dir: Language["dir"]) => setLangs(st.languages.map((x) => (x.code === l.code ? { ...x, dir } : x)), `جهت متن ${l.name}: ${dir === "rtl" ? "راست‌چین" : "چپ‌چین"}`, { dir: l.dir }, { dir });

  const cur = st.languages.find((l) => l.code === lang);
  const effective = (k: string) => (draft[k] !== undefined ? draft[k] : valueOf(st, lang, k));
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return translationKeys.filter((k) => (!term || k.includes(term) || valueOf(st, lang, k).toLowerCase().includes(term)) && (!onlyMissing || !valueOf(st, lang, k).trim()));
  }, [q, onlyMissing, lang, st]);
  const dirty = Object.keys(draft).length;

  const saveDraft = () => {
    const before: Record<string, unknown> = {};
    Object.keys(draft).forEach((k) => (before[k] = valueOf(st, lang, k)));
    i18nStore.set((s) => ({ ...s, overrides: { ...s.overrides, [lang]: { ...(s.overrides[lang] ?? {}), ...draft } } }));
    audit(`ویرایش ${fa(dirty)} ترجمه‌ی ${cur?.name}`, before, { ...draft });
    setDraft({});
    notify("ترجمه‌ها ذخیره شد و همین حالا در رابط کاربری اعمال می‌شود.", "success");
  };
  const exportJson = () => {
    const data = { lang, translations: Object.fromEntries(translationKeys.map((k) => [k, valueOf(st, lang, k)])) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `motoshub-translations-${lang}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (f?: File) => {
    if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      // دو قالب: {lang, translations:{key:value}} یا آرایه‌ی [{lang,key,value}] (همان مدل translation در API)
      const map: Record<string, string> = Array.isArray(raw)
        ? Object.fromEntries(raw.filter((x) => x && (!x.lang || x.lang === lang) && typeof x.key === "string").map((x) => [x.key, String(x.value ?? "")]))
        : Object.fromEntries(Object.entries(raw.translations ?? raw).filter(([k, v]) => translationKeys.includes(k) && typeof v === "string") as [string, string][]);
      const known = Object.fromEntries(Object.entries(map).filter(([k]) => translationKeys.includes(k)));
      if (!Object.keys(known).length) return notify("کلید معتبری در فایل پیدا نشد.", "warning");
      setDraft((d) => ({ ...d, ...known }));
      notify(`${fa(Object.keys(known).length)} ترجمه از فایل خوانده شد؛ برای اعمال «ذخیره» را بزنید.`, "info");
    } catch {
      notify("فایل JSON معتبر نیست.", "warning");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Languages size={18} />}
        title="زبان‌ها"
        description="زبان‌های فعال رابط کاربری، زبان پیش‌فرض و جهت متن؛ هر کاربر زبان خود را از منوی حساب کاربری انتخاب می‌کند."
        actions={
          <ApiChip
            items={[
              { label: "فهرست زبان‌ها", ep: platformEndpoints.languages() },
              { label: "افزودن/ویرایش زبان", ep: platformEndpoints.languageCreate() },
              { label: "ترجمه‌های یک زبان", ep: platformEndpoints.translations("{code}") },
              { label: "ذخیره‌ی ترجمه‌ها", ep: platformEndpoints.translationsPut("{code}") },
            ]}
          />
        }
      />

      <div className="card overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {st.languages.map((l) => {
            const c = completionOf(st, l.code);
            return (
              <li key={l.code} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5 flex-wrap">
                    {l.name} <span className="text-[11.5px] font-normal text-ink-400">{l.native}</span>
                    <span dir="ltr" className="font-mono text-[10.5px] text-ink-400">{l.code}</span>
                    {l.is_default && <Badge tone="brand">پیش‌فرض</Badge>}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="h-1.5 w-28 rounded-full bg-ink-100 overflow-hidden">
                      <span className={`block h-full ${c === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${c}%` }} />
                    </span>
                    <span className="text-[11px] text-ink-500">{fa(c)}٪ تکمیل</span>
                  </div>
                </div>
                <select className="input-field w-28" value={l.dir} disabled={!can || l.code === "fa"} onChange={(e) => setDir(l, e.target.value as Language["dir"])} aria-label={`جهت متن ${l.name}`}>
                  <option value="rtl">راست‌چین</option>
                  <option value="ltr">چپ‌چین</option>
                </select>
                <Button size="sm" variant="ghost" disabled={!can || l.is_default} onClick={() => makeDefault(l)}>
                  پیش‌فرض
                </Button>
                <Toggle on={l.is_active} disabled={!can || l.is_default} onChange={() => toggleActive(l)} label={`فعال بودن ${l.name}`} />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100 flex-wrap">
          <p className="text-[13px] font-bold text-ink-900 me-auto">ویرایشگر ترجمه</p>
          <select className="input-field w-32" value={lang} onChange={(e) => (setLang(e.target.value), setDraft({}))} aria-label="زبان">
            {editable.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={exportJson}>
            خروجی JSON
          </Button>
          {can && (
            <>
              <Button size="sm" variant="ghost" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()}>
                ورود JSON
              </Button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => importJson(e.target.files?.[0])} />
            </>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-ink-100 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input className="input-field ps-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی کلید یا ترجمه…" aria-label="جستجوی ترجمه" />
          </div>
          <label className="flex items-center gap-1.5 text-[12px] text-ink-600">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> فقط ترجمه‌نشده‌ها
          </label>
          <span className="text-[11px] text-ink-400 ms-auto">
            {fa(rows.length)} از {fa(translationKeys.length)} کلید
          </span>
        </div>
        <div className="max-h-[460px] overflow-y-auto divide-y divide-ink-100">
          {rows.map((k) => (
            <div key={k} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 px-4 py-2 items-center">
              <span className="text-[12.5px] text-ink-700 truncate" title={k}>
                {k}
              </span>
              <input
                className={`input-field ${draft[k] !== undefined ? "border-amber-400" : ""}`}
                dir={cur?.dir ?? "ltr"}
                value={effective(k)}
                disabled={!can}
                placeholder="— ترجمه نشده —"
                onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                aria-label={`ترجمه‌ی «${k}»`}
              />
            </div>
          ))}
          {rows.length === 0 && <p className="text-xs text-ink-400 p-4">کلیدی پیدا نشد.</p>}
        </div>
        {can && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-ink-100">
            {dirty > 0 && <span className="text-[11.5px] text-amber-700 me-auto">{fa(dirty)} تغییر ذخیره‌نشده</span>}
            <Button size="sm" disabled={!dirty} onClick={() => setDraft({})}>
              انصراف
            </Button>
            <Button size="sm" variant="primary" icon={<Save size={13} />} disabled={!dirty} onClick={saveDraft}>
              ذخیره
            </Button>
          </div>
        )}
      </div>
      <p className="text-[11px] text-ink-400 leading-5">کلید هر ترجمه همان متن فارسی رابط است؛ کلید بدون ترجمه به فارسی نمایش داده می‌شود. در این نسخه منو، سربرگ، عنوان صفحه‌ها و ابزارک‌های میز کار ترجمه می‌شوند و تاریخ‌ها به تقویم همان زبان (شمسی/میلادی/قمری) نمایش داده می‌شوند.</p>
    </div>
  );
}
