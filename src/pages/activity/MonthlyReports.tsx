// تب «گزارش‌ها» — گزارش ماهانه: (۱) کارکرد ماه‌به‌ماهِ یک نفر، (۲) ساعت یک پروژه به تفکیک شخص × ماه.
// هر دو روی یک بازه‌ی تاریخ (از–تا) و با ماه حقوقی (۲۶ تا ۲۵) یا ماه تقویمی؛ خروجی CSV برای هر جدول.
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { dayNum, fa, formatJalali, monthLength, monthNames, parseJalali } from "../../pm/jalali";
import { counts, fh, inRange, isLeave, periodOf, shiftPeriod, teamLabel, type Person, type TimeEntry } from "../../timesheet/types";
import { downloadCsv, useTs } from "./lib";

type Mode = "payroll" | "calendar";
type Bucket = { key: string; label: string; start: string; end: string };

const maxD = (a: string, b: string) => ((dayNum(a) ?? 0) >= (dayNum(b) ?? 0) ? a : b);
const minD = (a: string, b: string) => ((dayNum(a) ?? 0) <= (dayNum(b) ?? 0) ? a : b);

/** ماه‌های بازه (بریده‌شده به بازه) — حقوقی: ۲۶ ماه قبل تا ۲۵ · تقویمی: ۱ تا آخر ماه */
function monthBuckets(from: string, to: string, mode: Mode): Bucket[] {
  const out: Bucket[] = [];
  const end = dayNum(to) ?? 0;
  if ((dayNum(from) ?? 0) > end) return out;
  if (mode === "payroll") {
    for (let p = periodOf(from); (dayNum(p.start) ?? 0) <= end && out.length < 240; p = shiftPeriod(p, 1))
      out.push({ key: p.key, label: p.label, start: maxD(p.start, from), end: minD(p.end, to) });
  } else {
    let [y, m] = parseJalali(from) ?? [1405, 1, 1];
    while ((dayNum(formatJalali(y, m, 1)) ?? 0) <= end && out.length < 240) {
      out.push({ key: `${y}-${m}`, label: `${monthNames[m - 1]} ${fa(y)}`, start: maxD(formatJalali(y, m, 1), from), end: minD(formatJalali(y, m, monthLength(y, m)), to) });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }
  return out;
}

const bucketOf = (buckets: Bucket[], date: string) => buckets.findIndex((b) => inRange(date, b.start, b.end));
const worked = (es: TimeEntry[]) => es.filter((e) => !isLeave(e.type)).reduce((a, e) => a + e.hours, 0);

export default function MonthlyReports() {
  const { ts, ten, me, teamPeople, entriesOf, myProjects, projectName } = useTs();
  const isManager = ten.hasPermission("timesheet.team") && teamPeople.length > 0;
  const [jy] = parseJalali(ts.today) ?? [1405, 1, 1];
  const [from, setFrom] = useState(formatJalali(jy, 1, 1));
  const [to, setTo] = useState(ts.today);
  const [mode, setMode] = useState<Mode>("payroll");
  const [personId, setPersonId] = useState(me.id);
  const [projectId, setProjectId] = useState(myProjects[0]?.id ?? "");

  const valid = (dayNum(from) ?? 0) <= (dayNum(to) ?? 0);
  const buckets = useMemo(() => (valid ? monthBuckets(from, to, mode) : []), [from, to, mode, valid]);
  const rangeText = `${from} تا ${to}`;
  const modeText = mode === "payroll" ? "ماه حقوقی" : "ماه تقویمی";

  // ---------------- (۱) کارکرد ماهانه‌ی یک نفر
  const person: Person = (isManager && teamPeople.find((p) => p.id === personId)) || me;
  const personRows = useMemo(() => {
    if (!valid) return [];
    const es = entriesOf(person, from, to).filter((e) => counts(e));
    return buckets.map((b) => ({ b, hours: worked(es.filter((e) => inRange(e.date, b.start, b.end))) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, person.id, ts.entries, valid]);
  const personTotal = personRows.reduce((a, r) => a + r.hours, 0);

  // ---------------- (۲) ساعت پروژه به تفکیک شخص × ماه
  const pid = myProjects.some((p) => p.id === projectId) ? projectId : myProjects[0]?.id ?? "";
  const people = isManager ? teamPeople : [me];
  const projRows = useMemo(() => {
    if (!valid || !pid) return [];
    return people
      .map((p) => {
        const cells = buckets.map(() => 0);
        entriesOf(p, from, to)
          .filter((e) => e.projectId === pid && (counts(e) || e.aggregate) && !isLeave(e.type))
          .forEach((e) => {
            const i = bucketOf(buckets, e.date);
            if (i >= 0) cells[i] += e.hours;
          });
        return { p, cells, total: cells.reduce((a, v) => a + v, 0) };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, pid, people.length, ts.entries, valid]);
  const colTotals = buckets.map((_, i) => projRows.reduce((a, r) => a + r.cells[i], 0));
  const projTotal = colTotals.reduce((a, v) => a + v, 0);

  const r1 = (n: number) => Math.round(n * 100) / 100;
  const exportPerson = () =>
    downloadCsv(`karkard-mahane-${person.name}.csv`, [
      ["شخص", person.name],
      ["بازه", rangeText],
      ["مبنا", modeText],
      [],
      ["ماه", "از", "تا", "ساعت کارکرد"],
      ...personRows.map((r) => [r.b.label, r.b.start, r.b.end, r1(r.hours)]),
      ["جمع", "", "", r1(personTotal)],
    ]);
  const exportProject = () =>
    downloadCsv(`saat-proje-${projectName(pid)}.csv`, [
      ["پروژه", projectName(pid)],
      ["بازه", rangeText],
      ["مبنا", modeText],
      [],
      ["شخص", ...buckets.map((b) => b.label), "جمع"],
      ...projRows.map((r) => [r.p.name, ...r.cells.map(r1), r1(r.total)]),
      ["جمع", ...colTotals.map(r1), r1(projTotal)],
    ]);

  const th = "px-3 py-2 font-medium text-ink-500 whitespace-nowrap";
  const td = "px-3 py-2 whitespace-nowrap tabular-nums";

  return (
    <div className="space-y-4">
      {/* بازه و مبنای ماه — برای هر دو گزارش */}
      <div className="flex items-end gap-2 flex-wrap">
        <label className="text-xs text-ink-600 w-[150px]">
          از
          <div className="mt-1">
            <JalaliDatePicker value={from} onChange={setFrom} />
          </div>
        </label>
        <label className="text-xs text-ink-600 w-[150px]">
          تا
          <div className="mt-1">
            <JalaliDatePicker value={to} onChange={setTo} />
          </div>
        </label>
        <div className="flex rounded-lg border border-ink-200 overflow-hidden text-xs" role="radiogroup" aria-label="مبنای ماه">
          {(
            [
              ["payroll", "ماه حقوقی (۲۶ تا ۲۵)"],
              ["calendar", "ماه تقویمی"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className={`px-2.5 py-2 whitespace-nowrap ${mode === id ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {!valid && <p className="text-xs text-rose-600">تاریخ «از» باید پیش از تاریخ «تا» باشد.</p>}

      {/* (۱) کارکرد ماهانه */}
      <div className="card">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-ink-800">کارکرد ماهانه</p>
          {isManager ? (
            <select className="input-field !w-auto !py-1.5 !text-xs max-w-[220px]" value={person.id} onChange={(e) => setPersonId(e.target.value)} aria-label="شخص">
              <option value={me.id}>خودم</option>
              {teamPeople
                .filter((p) => p.id !== me.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {teamLabel[p.team]}
                  </option>
                ))}
            </select>
          ) : (
            <span className="text-xs text-ink-400">— {me.name}</span>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={exportPerson} disabled={!personRows.length}>
            CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-ink-50 text-right">
              <tr>
                <th className={th}>ماه</th>
                <th className={th}>بازه</th>
                <th className={`${th} text-left`}>ساعت کارکرد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {personRows.map((r) => (
                <tr key={r.b.key}>
                  <td className={`${td} text-ink-800`}>{r.b.label}</td>
                  <td className={`${td} text-ink-400`}>
                    {r.b.start} تا {r.b.end}
                  </td>
                  <td className={`${td} text-left text-ink-900 font-bold`}>{fh(r.hours)}</td>
                </tr>
              ))}
              {!personRows.length && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-ink-400">
                    ماهی در این بازه نیست.
                  </td>
                </tr>
              )}
            </tbody>
            {personRows.length > 0 && (
              <tfoot className="bg-ink-50 border-t border-ink-200">
                <tr>
                  <td className={`${td} font-bold text-ink-800`} colSpan={2}>
                    جمع
                  </td>
                  <td className={`${td} text-left font-bold text-ink-900`}>{fh(personTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* (۲) ساعت پروژه به تفکیک شخص و ماه */}
      <div className="card">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-ink-800">ساعت پروژه به تفکیک شخص و ماه</p>
          <select className="input-field !w-auto !py-1.5 !text-xs max-w-[240px]" value={pid} onChange={(e) => setProjectId(e.target.value)} aria-label="پروژه" disabled={!myProjects.length}>
            {!myProjects.length && <option value="">پروژه‌ای در دسترس نیست</option>}
            {myProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={exportProject} disabled={!projRows.length}>
            CSV
          </Button>
        </div>
        {projRows.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-ink-400">در این بازه ساعتی برای این پروژه ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-ink-50 text-right">
                <tr>
                  <th className={`${th} sticky right-0 bg-ink-50`}>شخص</th>
                  {buckets.map((b) => (
                    <th key={b.key} className={`${th} text-left`}>
                      {b.label}
                    </th>
                  ))}
                  <th className={`${th} text-left`}>جمع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {projRows.map((r) => (
                  <tr key={r.p.id}>
                    <td className={`${td} sticky right-0 bg-white text-ink-800`}>{r.p.name}</td>
                    {r.cells.map((v, i) => (
                      <td key={i} className={`${td} text-left ${v ? "text-ink-800" : "text-ink-300"}`}>
                        {v ? fh(v) : "—"}
                      </td>
                    ))}
                    <td className={`${td} text-left font-bold text-ink-900`}>{fh(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-ink-50 border-t border-ink-200">
                <tr>
                  <td className={`${td} sticky right-0 bg-ink-50 font-bold text-ink-800`}>جمع</td>
                  {colTotals.map((v, i) => (
                    <td key={i} className={`${td} text-left font-bold text-ink-800`}>
                      {fh(v)}
                    </td>
                  ))}
                  <td className={`${td} text-left font-bold text-ink-900`}>{fh(projTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
