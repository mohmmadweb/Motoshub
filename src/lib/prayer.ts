// ---------------------------------------------------------------------------
// F17 — محاسبه‌ی آفلاین اوقات شرعی (الگوریتم استاندارد موقعیت خورشید، مشابه PrayTimes)
// روش مؤسسه‌ی ژئوفیزیک دانشگاه تهران: فجر ۱۷٫۷°، مغرب ۴٫۵° زیر افق، نیمه‌شب شرعی = میانه‌ی غروب تا فجر.
// طلوع/غروب با شکست جو ۰٫۸۳۳°. خروجی: دقیقه از نیمه‌شب به وقت محلی (tz ساعت).
// ---------------------------------------------------------------------------
export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "sunset" | "maghrib" | "midnight";
export type PrayerTimes = Record<PrayerKey, number>;
export const prayerOrder: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "sunset", "maghrib", "midnight"];
export const prayerLabel: Record<PrayerKey, string> = { fajr: "اذان صبح", sunrise: "طلوع آفتاب", dhuhr: "اذان ظهر", sunset: "غروب آفتاب", maghrib: "اذان مغرب", midnight: "نیمه‌شب شرعی" };
export const TEHRAN_METHOD = { fajr: 17.7, maghrib: 4.5, isha: 14 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fix = (a: number, b: number) => {
  const x = a - b * Math.floor(a / b);
  return x < 0 ? x + b : x;
};
const fixAngle = (a: number) => fix(a, 360);
const fixHour = (h: number) => fix(h, 24);

function julian(y: number, m: number, d: number) {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - fixHour(RA) };
}

/** اوقات یک روز میلادی (y, m, d) برای مختصات داده‌شده */
export function computePrayerTimes(y: number, m: number, d: number, lat: number, lng: number, tz: number, method = TEHRAN_METHOD): PrayerTimes {
  const jd = julian(y, m, d) - lng / (15 * 24);
  const midDay = (t: number) => fixHour(12 - sunPosition(jd + t).eqt);
  const angleTime = (angle: number, t: number, ccw: boolean) => {
    const { decl } = sunPosition(jd + t);
    const noon = midDay(t);
    const v = (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat)));
    const h = deg(Math.acos(Math.max(-1, Math.min(1, v)))) / 15;
    return noon + (ccw ? -h : h);
  };
  // دو تکرار برای دقت (موقعیت خورشید در لحظه‌ی همان وقت)
  let t = { fajr: 5, sunrise: 6, dhuhr: 12, sunset: 18, maghrib: 18 };
  for (let i = 0; i < 2; i++) {
    const p = (h: number) => h / 24;
    t = {
      fajr: angleTime(method.fajr, p(t.fajr), true),
      sunrise: angleTime(0.833, p(t.sunrise), true),
      dhuhr: midDay(p(t.dhuhr)),
      sunset: angleTime(0.833, p(t.sunset), false),
      maghrib: angleTime(method.maghrib, p(t.maghrib), false),
    };
  }
  const adj = (h: number) => h + tz - lng / 15;
  const r = { fajr: adj(t.fajr), sunrise: adj(t.sunrise), dhuhr: adj(t.dhuhr), sunset: adj(t.sunset), maghrib: adj(t.maghrib) };
  const midnight = r.sunset + fixHour(r.fajr - r.sunset) / 2;
  const toMin = (h: number) => Math.round(fixHour(h) * 60) % 1440;
  return { fajr: toMin(r.fajr), sunrise: toMin(r.sunrise), dhuhr: toMin(r.dhuhr), sunset: toMin(r.sunset), maghrib: toMin(r.maghrib), midnight: toMin(midnight) };
}

/** «۱۳:۰۴» */
export const fmtClock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`.replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c]);
