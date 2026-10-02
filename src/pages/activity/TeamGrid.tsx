// تب «تیم من»: جدول افراد × روزهای دوره (مثل گوگل‌شیت، گروه‌بندی بر اساس تیم) برای مدیران،
// با جزئیات هر نفر در کشو و تأیید/برگشت کارکرد دوره.
import { Fragment, useMemo, useState } from "react";
import { Check, CheckCheck, CornerUpLeft, Users } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { dayNum, fa, parseJalali, weekdayOf } from "../../pm/jalali";
import {
  daysBetween,
  dayHours,
  expectedOn,
  fh,
  fmtHM,
  holidayOf,
  periodStatusLabel,
  periodStatusTone,
  shortDate,
  summarize,
  teamLabel,
  teamOrder,
  type Period,
  type PeriodStatus,
  type Person,
  type TeamId,
} from "../../timesheet/types";
import { daysToDate, useTs } from "./lib";
import { EntryLine } from "./MyTimesheet";

const wdShort = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export default function TeamGrid({ period }: { period: Period }) {
  const { ts, ten, me, teamPeople, entriesOf, projectName, projectColor, taskTitle } = useTs();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canApprove = ten.hasPermission("timesheet.approve");
  const [team, setTeam] = useState<TeamId | "all">("all");
  const [status, setStatus] = useState<PeriodStatus | "all">("all");
  const [open, setOpen] = useState<Person | null>(null);
  const s = ts.settings;
  const days = daysBetween(period.start, period.end);
  const toDate = daysToDate(period.start, period.end, ts.today);
  const t = dayNum(ts.today) ?? 0;

  const rows = useMemo(
    () =>
      teamPeople.map((p) => {
        const es = entriesOf(p, period.start, period.end);
        return { p, es, sum: summarize(es, s, toDate, p), rec: ts.periodRecord(p.id, period.key) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamPeople, ts.entries, ts.state.periods, s, period.key],
  );
  const filtered = rows.filter((r) => (team === "all" || r.p.team === team) && (status === "all" || r.rec.status === status));
  const groups = teamOrder.map((tm) => ({ tm, rows: filtered.filter((r) => r.p.team === tm) })).filter((g) => g.rows.length);
  const submitted = rows.filter((r) => r.rec.status === "submitted" && r.p.id !== me.id);

  const decide = (ids: string[], approve: boolean, comment?: string) => {
    ts.decidePeriod(ids, period.key, approve, me.name, comment);
    notify(approve ? `کارکرد ${fa(ids.length)} نفر تأیید شد.` : "کارکرد برگشت داده شد.", approve ? "success" : "info");
  };

  if (!teamPeople.length) return <EmptyState icon={<Users size={22} />} title="عضوی در محدوده‌ی شما نیست" description="از «تغییر سازمان یا نقش» واحدی را انتخاب کنید که اعضایش را مدیریت می‌کنید." />;

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <select className="input-field !w-auto !py-1.5 !text-xs" value={team} onChange={(e) => setTeam(e.target.value as TeamId | "all")} aria-label="تیم">
          <option value="all">همه‌ی تیم‌ها</option>
          {teamOrder.filter((tm) => rows.some((r) => r.p.team === tm)).map((tm) => (
            <option key={tm} value={tm}>
              {teamLabel[tm]}
            </option>
          ))}
        </select>
        <select className="input-field !w-auto !py-1.5 !text-xs" value={status} onChange={(e) => setStatus(e.target.value as PeriodStatus | "all")} aria-label="وضعیت">
          <option value="all">همه‌ی وضعیت‌ها</option>
          {(["draft", "submitted", "approved", "returned"] as PeriodStatus[]).map((st) => (
            <option key={st} value={st}>
              {periodStatusLabel[st]} ({fa(rows.filter((r) => r.rec.status === st).length)})
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {canApprove && submitted.length > 0 && (
          <Button
            size="sm"
            variant="primary"
            icon={<CheckCheck size={13} />}
            onClick={() => confirm({ title: `تأیید کارکرد ${fa(submitted.length)} نفر؟`, message: submitted.map((r) => r.p.name).join("، "), confirmLabel: "تأیید همه", onConfirm: () => decide(submitted.map((r) => r.p.id), true) })}
          >
            تأیید {fa(submitted.length)} ارسال‌شده
          </Button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr className="text-ink-500">
              <th className="sticky right-0 z-10 bg-white text-right font-medium px-3 py-2 min-w-[150px] border-b border-ink-200">نام</th>
              {days.map((d) => {
                const off = expectedOn(s, d) === 0;
                return (
                  <th key={d} title={holidayOf(s, d)?.title} className={`font-normal px-0.5 py-1.5 min-w-[34px] border-b border-ink-200 ${off ? "bg-ink-100 text-ink-400" : ""} ${dayNum(d) === t ? "text-brand-700 font-bold" : ""}`}>
                    <div className="text-[9px]">{wdShort[weekdayOf(d)]}</div>
                    <div>{fa(parseJalali(d)?.[2] ?? 0)}</div>
                  </th>
                );
              })}
              <th className="font-medium px-2 border-b border-ink-200 min-w-[52px]">جمع</th>
              <th className="font-medium px-2 border-b border-ink-200 min-w-[56px]">تراز</th>
              <th className="font-medium px-2 border-b border-ink-200 min-w-[84px]">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.tm}>
                <tr>
                  <td colSpan={days.length + 4} className="bg-navy-50 text-navy-700 font-bold px-3 py-1.5 text-[11px]">
                    <span className="sticky right-3">
                      {teamLabel[g.tm]} <span className="font-normal text-ink-500">({fa(g.rows.length)} نفر)</span>
                    </span>
                  </td>
                </tr>
                {g.rows.map(({ p, es, sum, rec }) => (
                  <tr key={p.id} className="hover:bg-ink-50 cursor-pointer" onClick={() => setOpen(p)}>
                    <td className="sticky right-0 z-10 bg-white px-3 py-1.5 border-b border-ink-100">
                      <span className="flex items-center gap-2 min-w-0">
                        <Avatar name={p.name} color={p.avatarColor} size={22} />
                        <span className="truncate text-ink-800 max-w-[110px]">{p.name}</span>
                        {p.intern && <span className="text-[9px] rounded bg-amber-50 text-amber-700 px-1 shrink-0">کارآموز</span>}
                        {p.fixedHours && <span className="text-[9px] rounded bg-ink-100 text-ink-500 px-1 shrink-0" title="ساعت ثابت قراردادی">ثابت</span>}
                      </span>
                    </td>
                    {days.map((d) => {
                      const h = dayHours(es, d);
                      const exp = expectedOn(s, d, p);
                      const past = (dayNum(d) ?? 0) <= t;
                      let txt = h.worked ? fmtHM(h.worked) : "";
                      let cls = exp === 0 ? "bg-ink-100 text-ink-500" : "text-ink-800";
                      if (h.leave === "daily") {
                        txt = "مرخصی";
                        cls = "bg-sky-50 text-sky-700 text-[9px]";
                      } else if (h.mission) cls = "bg-navy-50 text-navy-700";
                      else if (exp > 0 && past && !h.count && (dayNum(d) ?? 0) < t) cls = "bg-rose-50 text-rose-600";
                      else if (exp > 0 && h.worked && h.worked < exp && !h.leave) cls = "text-amber-700";
                      return (
                        <td key={d} className={`text-center tabular-nums border-b border-ink-100 px-0.5 py-1.5 ${cls}`}>
                          {txt}
                          {h.leave === "hourly" && <sup className="text-sky-700">م</sup>}
                        </td>
                      );
                    })}
                    <td className="text-center font-bold text-ink-900 border-b border-ink-100 tabular-nums">{fh(sum.worked)}</td>
                    <td className={`text-center border-b border-ink-100 tabular-nums ${sum.balance >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {sum.balance >= 0 ? "+" : "−"}
                      {fh(Math.abs(sum.balance))}
                    </td>
                    <td className="text-center border-b border-ink-100 px-1">
                      <Badge tone={periodStatusTone[rec.status]}>{periodStatusLabel[rec.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-400 mt-2">
        خانه‌ی قرمز = روز کاری بدون ثبت · «م» بالای عدد = مرخصی ساعتی · ستون خاکستری = جمعه/تعطیل. برای جزئیات و تأیید، روی ردیف هر نفر بزنید.
      </p>

      {open && (
        <PersonDrawer
          person={open}
          period={period}
          onClose={() => setOpen(null)}
          canApprove={canApprove && open.id !== me.id}
          onDecide={(approve, comment) => {
            decide([open.id], approve, comment);
            setOpen(null);
          }}
          ctx={{ projectName, projectColor, taskTitle }}
          entries={entriesOf(open, period.start, period.end)}
        />
      )}
    </div>
  );
}

function PersonDrawer({
  person,
  period,
  onClose,
  canApprove,
  onDecide,
  ctx,
  entries,
}: {
  person: Person;
  period: Period;
  onClose: () => void;
  canApprove: boolean;
  onDecide: (approve: boolean, comment?: string) => void;
  ctx: Parameters<typeof EntryLine>[0]["ctx"];
  entries: ReturnType<ReturnType<typeof useTs>["entriesOf"]>;
}) {
  const { ts } = useTs();
  const [comment, setComment] = useState("");
  const [err, setErr] = useState(false);
  const rec = ts.periodRecord(person.id, period.key);
  const sum = summarize(entries, ts.settings, daysToDate(period.start, period.end, ts.today), person);
  const byDay = [...new Set(entries.map((e) => e.date))].sort((a, b) => (dayNum(b) ?? 0) - (dayNum(a) ?? 0));
  return (
    <Drawer open onClose={onClose} title={`${person.name} — ${period.label}`} width="max-w-lg">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge tone={periodStatusTone[rec.status]}>{periodStatusLabel[rec.status]}</Badge>
        <span className="text-xs text-ink-500">
          {person.title} · {teamLabel[person.team]}
        </span>
        {person.intern && <Badge tone="warning">کارآموز</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[
          ["کارکرد", `${fh(sum.worked)}`],
          ["موظف تا امروز", fh(sum.expected)],
          [sum.balance >= 0 ? "اضافه‌کار" : "کسری", fh(Math.abs(sum.balance))],
          ["مرخصی (روز)", fa(sum.leaveDays)],
          ["مأموریت (روز)", fa(sum.missionDays)],
          ["بدون ثبت", fa(sum.missingDays)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-ink-50 p-2">
            <p className="text-[10px] text-ink-500">{l}</p>
            <p className="text-sm font-bold text-ink-900">{v}</p>
          </div>
        ))}
      </div>

      {canApprove && (rec.status === "submitted" || rec.status === "approved" || rec.status === "returned" || rec.status === "draft") && (
        <div className="rounded-lg border border-ink-200 p-3 mb-4 space-y-2">
          <textarea className={`input-field min-h-[60px] ${err ? "border-rose-400" : ""}`} placeholder="توضیح (برای برگشت الزامی است)" value={comment} onChange={(e) => (setComment(e.target.value), setErr(false))} />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="secondary"
              icon={<CornerUpLeft size={13} />}
              onClick={() => {
                if (!comment.trim()) return setErr(true);
                onDecide(false, comment);
              }}
            >
              برگشت برای اصلاح
            </Button>
            <Button size="sm" variant="primary" icon={<Check size={13} />} onClick={() => onDecide(true, comment)} disabled={rec.status === "approved"}>
              تأیید کارکرد
            </Button>
          </div>
          {rec.status === "draft" && <p className="text-[11px] text-amber-700">این دوره هنوز ارسال نشده؛ تأیید آن یعنی تأیید بدون درخواست فرد.</p>}
        </div>
      )}

      {rec.history.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-ink-700 mb-1.5">تاریخچه</p>
          <ul className="space-y-1">
            {rec.history.map((h, i) => (
              <li key={i} className="text-[11px] text-ink-500">
                {h.at} — <b className="text-ink-700">{h.by}</b>: {periodStatusLabel[h.action]}
                {h.comment && <span className="text-ink-600"> «{h.comment}»</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs font-bold text-ink-700 mb-1.5">ثبت‌ها</p>
      {byDay.length === 0 && <p className="text-xs text-ink-400">در این دوره ثبتی ندارد.</p>}
      <div className="space-y-2">
        {byDay.map((d) => (
          <div key={d}>
            <p className="text-[11px] text-ink-400 mb-0.5">{shortDate(d)}</p>
            {entries
              .filter((e) => e.date === d)
              .map((e) => (
                <EntryLine key={e.id} e={e} ctx={ctx} canEdit={false} onEdit={() => undefined} />
              ))}
          </div>
        ))}
      </div>
    </Drawer>
  );
}
