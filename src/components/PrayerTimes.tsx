// ---------------------------------------------------------------------------
// F17 «اوقات شرعی تمامی شهرهای ایران» (۱.۲۱.۹)
//  - PrayerTimesWidget (پیش‌فرض): ابزارک میز کار — شش وقت، تاریخ شمسی و قمری، شمارش معکوس، یادآور اذان ظهر.
//  - usePrayerTimes(): برای تقویم (خط اوقات در نمای روز/هفته).
//  - PrayerCityCard: انتخاب استان و شهر در «تنظیمات ← برند و ظاهر ← ظاهر من».
//  - PrayerAdminCard: روشن/خاموش ابزارک برای کل سامانه و شهر پیش‌فرض (راهبر).
// محاسبه کاملاً آفلاین (src/lib/prayer.ts)؛ ترجیح کاربر: user_pref.prayer_city_id
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, MapPin, MoonStar, Search, Settings2 } from "lucide-react";
import Toggle from "./ui/Toggle";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { useToast } from "./ui/ToastProvider";
import { createLocalStore, useLocalStore } from "../iam/store";
import { useTenancy } from "../context/TenancyContext";
import { useInbox } from "../context/InboxContext";
import { cityById, DEFAULT_CITY_ID, iranCities, provinces, type City } from "../data/iranCities";
import { computePrayerTimes, fmtClock, prayerLabel, prayerOrder, type PrayerKey, type PrayerTimes } from "../lib/prayer";
import { jalaliToDate, useI18n } from "../i18n";
import { emitSettingsChange } from "../iam/settingsAudit";
import { platformEndpoints } from "../lib/platformEndpoints";
import { ApiChip } from "../pages/social/kit";

type PrayerState = {
  system: { enabled: boolean; default_city_id: string };
  users: Record<string, { prayer_city_id?: string; remind_dhuhr?: boolean }>;
};
export const prayerStore = createLocalStore<PrayerState>("motoshub.prayer.v1", () => ({ system: { enabled: true, default_city_id: DEFAULT_CITY_ID }, users: {} }));

/** شهر و اوقات کاربر فعلی */
export function usePrayerTimes() {
  const st = useLocalStore(prayerStore);
  const { actingUser } = useTenancy();
  const pref = st.users[actingUser.id] ?? {};
  const city = cityById(pref.prayer_city_id) ?? cityById(st.system.default_city_id) ?? iranCities[0];
  const timesOn = (d: Date): PrayerTimes => computePrayerTimes(d.getFullYear(), d.getMonth() + 1, d.getDate(), city.lat, city.lng, city.tz);
  return {
    enabled: st.system.enabled,
    city,
    remind: !!pref.remind_dhuhr,
    /** اوقات یک روز شمسی («۱۴۰۵/۰۳/۰۸») */
    timesFor: (jalali: string): PrayerTimes | null => {
      const d = jalaliToDate(jalali);
      return d ? timesOn(d) : null;
    },
    timesOn,
    setCity: (id: string) => prayerStore.set((s) => ({ ...s, users: { ...s.users, [actingUser.id]: { ...s.users[actingUser.id], prayer_city_id: id } } })),
    setRemind: (on: boolean) => prayerStore.set((s) => ({ ...s, users: { ...s.users, [actingUser.id]: { ...s.users[actingUser.id], remind_dhuhr: on } } })),
  };
}

const fa = (n: number) => n.toLocaleString("fa-IR");
const nowMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
const fmtLeft = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":").replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c]);
};

/** وقت بعدی (اگر همه گذشته‌اند: اذان صبح فردا) */
function nextPrayer(now: Date, today: PrayerTimes, tomorrow: PrayerTimes): { key: PrayerKey; at: number; secLeft: number } {
  const secNow = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  // نیمه‌شب شرعی معمولاً بعد از ۲۴ نیست؛ اگر کمتر از اذان صبح باشد به روز بعد تعلق دارد
  const seq = prayerOrder.map((k) => ({ key: k, at: k === "midnight" && today.midnight < today.fajr ? today.midnight + 1440 : today[k] }));
  const nxt = seq.find((x) => x.at * 60 > secNow);
  if (nxt) return { ...nxt, secLeft: nxt.at * 60 - secNow };
  return { key: "fajr", at: tomorrow.fajr, secLeft: (1440 + tomorrow.fajr) * 60 - secNow };
}

export default function PrayerTimesWidget({ className = "" }: { className?: string }) {
  const p = usePrayerTimes();
  const { t, lang } = useI18n();
  const { actingUser } = useTenancy();
  const inbox = useInbox();
  const { notify } = useToast();
  const [now, setNow] = useState(() => new Date());
  const [pick, setPick] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  const dayKey = now.toDateString();
  const today = useMemo(() => p.timesOn(now), [dayKey, p.city.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tomorrow = useMemo(() => p.timesOn(new Date(now.getTime() + 864e5)), [dayKey, p.city.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = nextPrayer(now, today, tomorrow);

  // یادآور اختیاری: ۱۰ دقیقه پیش از اذان ظهر یک اعلان (یک بار در روز)
  const sent = useRef<string>("");
  useEffect(() => {
    if (!p.enabled || !p.remind) return;
    const key = `${dayKey}-${p.city.id}`;
    const left = today.dhuhr - 10 - nowMin(now);
    if (left <= 0 && left > -10 && sent.current !== key) {
      sent.current = key;
      inbox.send([actingUser.name], "announcement", `${fa(10)} دقیقه تا اذان ظهر به افق ${p.city.name} (${fmtClock(today.dhuhr)})`, "/dashboard", { system: true });
    }
  }, [now.getMinutes()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p.enabled) return null;

  const dateOpts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const fmt = (loc: string, o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(loc, o).format(now);
    } catch {
      return "";
    }
  };
  const shamsi = fmt("fa-IR-u-ca-persian", dateOpts);
  const qamari = fmt(`${lang.code === "en" ? "en-US" : "fa-IR"}-u-ca-islamic-umalqura`, { day: "numeric", month: "long", year: "numeric" });

  return (
    <section className={`card p-4 ${className}`} aria-label={t("اوقات شرعی")}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
            <MoonStar size={15} className="text-emerald-600 shrink-0" /> {t("اوقات شرعی")}
            <button onClick={() => setPick(true)} className="text-[11.5px] font-medium text-brand-700 hover:underline flex items-center gap-0.5 truncate" title="تغییر شهر">
              <MapPin size={11} /> {p.city.name}
            </button>
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5 truncate">
            {shamsi}
            {qamari && <span className="text-ink-400"> · {qamari}</span>}
          </p>
        </div>
        <button
          onClick={() => {
            p.setRemind(!p.remind);
            notify(!p.remind ? "یادآور ۱۰ دقیقه پیش از اذان ظهر روشن شد." : "یادآور اذان ظهر خاموش شد.", "info");
          }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${p.remind ? "bg-emerald-50 text-emerald-700" : "text-ink-400 hover:bg-ink-100"}`}
          title={p.remind ? "یادآور اذان ظهر: روشن" : "یادآور اذان ظهر (۱۰ دقیقه پیش)"}
          aria-pressed={p.remind}
          aria-label="یادآور اذان ظهر"
        >
          {p.remind ? <Bell size={15} /> : <BellOff size={15} />}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {prayerOrder.map((k) => {
          const on = next.key === k;
          return (
            <div key={k} className={`rounded-lg px-2 py-1.5 text-center border ${on ? "border-emerald-300 bg-emerald-50" : "border-ink-100"}`}>
              <p className={`text-[10.5px] ${on ? "text-emerald-800 font-bold" : "text-ink-500"}`}>{t(prayerLabel[k])}</p>
              <p className="text-[13px] font-bold text-ink-900 tabular-nums">{fmtClock(today[k])}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[11.5px] text-ink-600 mt-2.5 flex items-center justify-between gap-2">
        <span>
          {lang.code === "en" ? `${fmtLeft(next.secLeft)} ${t("مانده تا")} ${t(prayerLabel[next.key])}` : `${t("مانده تا")} ${t(prayerLabel[next.key])}`}
        </span>
        {lang.code !== "en" && <b className="tabular-nums text-emerald-700">{fmtLeft(next.secLeft)}</b>}
      </p>
      {pick && <CityPickerModal value={p.city.id} onClose={() => setPick(false)} onPick={(id) => (p.setCity(id), setPick(false))} />}
    </section>
  );
}

/** انتخاب استان و شهر با جستجو */
function CityPickerModal({ value, onPick, onClose }: { value: string; onPick: (id: string) => void; onClose: () => void }) {
  const cur = cityById(value);
  const [prov, setProv] = useState(cur?.province ?? "");
  const [q, setQ] = useState("");
  const list = iranCities.filter((c) => (!prov || c.province === prov) && (!q.trim() || c.name.includes(q.trim()) || c.province.includes(q.trim())));
  return (
    <Modal open onClose={onClose} title="شهر اوقات شرعی" description="اوقات به افق شهر انتخابی و با روش مؤسسه‌ی ژئوفیزیک دانشگاه تهران محاسبه می‌شود.">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select className="input-field" value={prov} onChange={(e) => setProv(e.target.value)} aria-label="استان">
            <option value="">همه‌ی استان‌ها ({fa(provinces.length)})</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input className="input-field ps-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی شهر…" aria-label="جستجوی شهر" autoFocus />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto border border-ink-100 rounded-lg divide-y divide-ink-100">
          {list.map((c) => (
            <button key={c.id} onClick={() => onPick(c.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] text-start hover:bg-ink-50 ${c.id === value ? "bg-emerald-50" : ""}`}>
              <span className="text-ink-800">
                {c.name}
                {c.capital && <span className="text-[10px] text-ink-400 ms-1.5">مرکز استان</span>}
              </span>
              <span className="text-[11px] text-ink-400">{c.province}</span>
            </button>
          ))}
          {list.length === 0 && <p className="text-xs text-ink-400 p-3">شهری پیدا نشد.</p>}
        </div>
      </div>
    </Modal>
  );
}

/** «ظاهر من» — انتخاب شهر اوقات شرعی */
export function PrayerCityCard() {
  const p = usePrayerTimes();
  const [pick, setPick] = useState(false);
  const { notify } = useToast();
  if (!p.enabled) return null;
  return (
    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
          <MoonStar size={15} className="text-emerald-600" /> شهر اوقات شرعی
        </p>
        <p className="text-[11.5px] text-ink-500 mt-0.5">
          {p.city.name}، {p.city.province} — ابزارک میز کار و خط اوقات در تقویم بر اساس همین شهر است.
        </p>
      </div>
      <Button size="sm" icon={<MapPin size={13} />} onClick={() => setPick(true)}>
        تغییر شهر
      </Button>
      {pick && (
        <CityPickerModal
          value={p.city.id}
          onClose={() => setPick(false)}
          onPick={(id) => {
            p.setCity(id);
            setPick(false);
            notify(`شهر اوقات شرعی: ${cityById(id)?.name}`, "success");
          }}
        />
      )}
    </div>
  );
}

/** راهبر: روشن/خاموش ابزارک برای کل سامانه + شهر پیش‌فرض */
export function PrayerAdminCard() {
  const st = useLocalStore(prayerStore);
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [pick, setPick] = useState(false);
  const can = hasPermission("settings.system");
  const city: City = cityById(st.system.default_city_id) ?? iranCities[0];
  const set = (patch: Partial<PrayerState["system"]>, summary: string) => {
    const before = st.system;
    prayerStore.set((s) => ({ ...s, system: { ...s.system, ...patch } }));
    emitSettingsChange({ area: "اوقات شرعی", summary, before: { ...before }, after: { ...before, ...patch } });
    notify(summary, "success");
  };
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
          <MoonStar size={15} className="text-emerald-600" /> اوقات شرعی
        </p>
        <ApiChip items={[{ label: "اوقات یک شهر در یک روز", ep: platformEndpoints.prayerTimes() }, { label: "جستجوی شهرها", ep: platformEndpoints.cities() }]} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-ink-700">نمایش ابزارک در میز کار و خط اوقات در تقویم (کل سامانه)</span>
        <Toggle on={st.system.enabled} disabled={!can} onChange={() => set({ enabled: !st.system.enabled }, st.system.enabled ? "ابزارک اوقات شرعی خاموش شد" : "ابزارک اوقات شرعی روشن شد")} label="ابزارک اوقات شرعی" />
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[12.5px] text-ink-700">
          شهر پیش‌فرض (کاربرانی که شهر انتخاب نکرده‌اند): <b>{city.name}</b>
        </span>
        <Button size="sm" icon={<Settings2 size={13} />} disabled={!can} onClick={() => setPick(true)}>
          تغییر
        </Button>
      </div>
      <p className="text-[11px] text-ink-400 leading-5">روش محاسبه: مؤسسه‌ی ژئوفیزیک دانشگاه تهران (فجر ۱۷٫۷°، مغرب ۴٫۵°) · {fa(iranCities.length)} شهر در {fa(provinces.length)} استان · بدون نیاز به اینترنت.</p>
      {pick && (
        <CityPickerModal
          value={city.id}
          onClose={() => setPick(false)}
          onPick={(id) => {
            set({ default_city_id: id }, `شهر پیش‌فرض اوقات شرعی: ${cityById(id)?.name}`);
            setPick(false);
          }}
        />
      )}
    </div>
  );
}
