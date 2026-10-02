// تب «خلاصه برای مالی»: جمع ماهانه‌ی هر نفر (کارکرد، مرخصی، اضافه‌کار، کسری، مأموریت، دورکاری، وضعیت)
// با خروجی CSV — جایگزین برگه‌ی «خلاصه برای مالی» گوگل‌شیت.
import { useMemo, useState } from "react";
import { Download, Wallet } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { fa } from "../../pm/jalali";
import { fh, periodStatusLabel, periodStatusTone, summarize, teamLabel, teamOrder, type Period } from "../../timesheet/types";
import { daysToDate, downloadCsv, useTs } from "./lib";

export default function FinanceSummary({ period }: { period: Period }) {
  const { ts, teamPeople, entriesOf } = useTs();
  const { notify } = useToast();
  const [onlyApproved, setOnlyApproved] = useState(false);
  const days = daysToDate(period.start, period.end, ts.today);

  const rows = useMemo(
    () =>
      teamPeople
        .map((p) => ({ p, sum: summarize(entriesOf(p, period.start, period.end), ts.settings, days, p), rec: ts.periodRecord(p.id, period.key) }))
        .sort((a, b) => teamOrder.indexOf(a.p.team) - teamOrder.indexOf(b.p.team)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamPeople, ts.entries, ts.state.periods, ts.settings, period.key],
  );
  const shown = onlyApproved ? rows.filter((r) => r.rec.status === "approved") : rows;
  const tot = shown.reduce(
    (a, r) => ({ worked: a.worked + r.sum.worked, leave: a.leave + r.sum.leaveDays, over: a.over + r.sum.overtime, def: a.def + r.sum.deficit, mission: a.mission + r.sum.missionDays, remote: a.remote + r.sum.remoteDays }),
    { worked: 0, leave: 0, over: 0, def: 0, mission: 0, remote: 0 },
  );

  const exportCsv = () => {
    const r1 = (n: number) => Math.round(n * 10) / 10;
    downloadCsv(`timesheet-${period.key}.csv`, [
      ["دوره", `${period.label} (${period.start} تا ${period.end})`],
      [],
      ["نام", "تیم", "کارآموز", "کارکرد (ساعت)", "موظف (ساعت)", "مرخصی (روز)", "اضافه‌کار (ساعت)", "کسری (ساعت)", "مأموریت (روز)", "دورکاری (روز)", "وضعیت"],
      ...shown.map(({ p, sum, rec }) => [p.name, teamLabel[p.team], p.intern ? "بله" : "", r1(sum.worked), r1(sum.expected), sum.leaveDays, r1(sum.overtime), r1(sum.deficit), sum.missionDays, sum.remoteDays, periodStatusLabel[rec.status]]),
      ["جمع", "", "", r1(tot.worked), "", r1(tot.leave), r1(tot.over), r1(tot.def), tot.mission, tot.remote, ""],
    ]);
    notify(`خروجی ${fa(shown.length)} نفر دانلود شد.`);
  };

  if (!teamPeople.length) return <EmptyState icon={<Wallet size={22} />} title="عضوی در محدوده‌ی شما نیست" description="واحدی را انتخاب کنید که خلاصه‌ی مالی اعضایش را می‌بینید." />;

  const notApproved = rows.filter((r) => r.rec.status !== "approved").length;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <label className="flex items-center gap-2 text-xs text-ink-600">
          <Toggle on={onlyApproved} onChange={() => setOnlyApproved(!onlyApproved)} label="فقط تأییدشده‌ها" /> فقط تأییدشده‌ها
        </label>
        {notApproved > 0 && <span className="text-[11px] text-amber-700">{fa(notApproved)} نفر هنوز تأیید نشده‌اند</span>}
        <div className="flex-1" />
        <Button size="sm" icon={<Download size={13} />} onClick={exportCsv}>
          خروجی CSV
        </Button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead className="text-ink-500 bg-ink-50">
            <tr>
              {["نام", "تیم", "کارکرد", "موظف", "مرخصی (روز)", "اضافه‌کار", "کسری", "مأموریت (روز)", "دورکاری (روز)", "وضعیت"].map((h, i) => (
                <th key={h} className={`font-medium px-3 py-2 ${i < 2 ? "text-right" : "text-center"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {shown.map(({ p, sum, rec }) => (
              <tr key={p.id} className="hover:bg-ink-50">
                <td className="px-3 py-2 text-ink-800 whitespace-nowrap">
                  {p.name} {p.intern && <span className="text-[9px] rounded bg-amber-50 text-amber-700 px-1">کارآموز</span>}
                </td>
                <td className="px-3 py-2 text-ink-500 whitespace-nowrap">{teamLabel[p.team]}</td>
                <td className="px-3 py-2 text-center font-bold text-ink-900 tabular-nums">{fh(sum.worked)}</td>
                <td className="px-3 py-2 text-center text-ink-500 tabular-nums">{fh(sum.expected)}</td>
                <td className="px-3 py-2 text-center tabular-nums">{fa(sum.leaveDays)}</td>
                <td className="px-3 py-2 text-center text-emerald-700 tabular-nums">{sum.overtime ? fh(sum.overtime) : "—"}</td>
                <td className="px-3 py-2 text-center text-rose-600 tabular-nums">{sum.deficit ? fh(sum.deficit) : "—"}</td>
                <td className="px-3 py-2 text-center tabular-nums">{sum.missionDays ? fa(sum.missionDays) : "—"}</td>
                <td className="px-3 py-2 text-center tabular-nums">{sum.remoteDays ? fa(sum.remoteDays) : "—"}</td>
                <td className="px-3 py-2 text-center">
                  <Badge tone={periodStatusTone[rec.status]}>{periodStatusLabel[rec.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-navy-50 text-navy-700 font-bold">
            <tr>
              <td className="px-3 py-2" colSpan={2}>
                جمع ({fa(shown.length)} نفر)
              </td>
              <td className="px-3 py-2 text-center tabular-nums">{fh(tot.worked)}</td>
              <td />
              <td className="px-3 py-2 text-center tabular-nums">{fa(Math.round(tot.leave * 10) / 10)}</td>
              <td className="px-3 py-2 text-center tabular-nums">{fh(tot.over)}</td>
              <td className="px-3 py-2 text-center tabular-nums">{fh(tot.def)}</td>
              <td className="px-3 py-2 text-center tabular-nums">{fa(tot.mission)}</td>
              <td className="px-3 py-2 text-center tabular-nums">{fa(tot.remote)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-ink-400 mt-2">
        موظف = روزهای کاری تا امروز (شنبه تا چهارشنبه {fa(ts.settings.dailyHours)} ساعت، پنجشنبه {fa(ts.settings.thursdayHours)} ساعت، بدون جمعه و تعطیلات رسمی). اضافه‌کار/کسری = کارکرد + مرخصی − موظف.
      </p>
    </div>
  );
}
