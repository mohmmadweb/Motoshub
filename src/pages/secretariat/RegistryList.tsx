// فهرست نامه‌های ثبتی دبیرخانه (وارده / صادره / دفتر ثبت کامل) با فیلتر و چاپ فهرست فیلترشده
import { useMemo, useState, type ReactNode } from "react";
import { Printer, Stamp } from "lucide-react";
import FilterBar from "../../components/ui/FilterBar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useOffice } from "../../context/OfficeContext";
import { directionLabel, type RegistrationDirection } from "../../office/types";
import { DateInput } from "../../office/ui";
import { before, dateOnly, nameOf, toFa } from "../../office/util";
import { RegistryPrint } from "./LetterPrint";

type Dir = "all" | RegistrationDirection;

export default function RegistryList({ direction, onOpen, actions }: { direction?: RegistrationDirection; onOpen: (letterId: number) => void; actions?: ReactNode }) {
  const o = useOffice();
  const [dir, setDir] = useState<Dir>(direction ?? "all");
  const [q, setQ] = useState("");
  const [series, setSeries] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [printing, setPrinting] = useState(false);
  const effDir: Dir = direction ?? dir;

  const all = useMemo(
    () =>
      o.state.registrations
        .map((reg) => ({ reg, letter: o.state.letters.find((l) => l.id === reg.letter), seriesTitle: o.state.series.find((s) => s.id === reg.series)?.title ?? "—" }))
        .sort((a, b) => (a.reg.registered_at < b.reg.registered_at ? 1 : -1)),
    [o.state],
  );
  const rows = all.filter(({ reg, letter }) => {
    if (effDir !== "all" && reg.direction !== effDir) return false;
    if (series && reg.series !== series) return false;
    if (from && before(reg.registered_at, from)) return false;
    if (to && before(to, reg.registered_at)) return false;
    if (q.trim()) {
      const t = q.trim();
      const hay = `${reg.number} ${toFa(reg.number)} ${reg.external_number} ${toFa(reg.external_number)} ${reg.external_org} ${letter?.subject ?? ""}`;
      if (!hay.includes(t)) return false;
    }
    return true;
  });
  const active = (series ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  const caption = [effDir === "all" ? "همه‌ی ثبت‌ها" : `نامه‌های ${directionLabel[effDir]}`, series ? o.state.series.find((s) => s.id === series)?.title : "", from ? `از ${toFa(from)}` : "", to ? `تا ${toFa(to)}` : "", q ? `جستجو: ${q}` : ""].filter(Boolean).join(" · ");

  return (
    <div className="card">
      <FilterBar<Dir>
        pills={
          direction
            ? undefined
            : [
                { id: "all", label: "همه", count: all.length },
                { id: "incoming", label: "وارده", count: all.filter((r) => r.reg.direction === "incoming").length, dot: "info" },
                { id: "outgoing", label: "صادره", count: all.filter((r) => r.reg.direction === "outgoing").length, dot: "brand" },
              ]
        }
        active={dir}
        onPill={setDir}
        search={q}
        onSearch={setQ}
        searchPlaceholder="شماره، موضوع یا سازمان…"
        activeCount={active}
        onClear={active || q ? () => { setSeries(0); setFrom(""); setTo(""); setQ(""); } : undefined}
      >
        <select className="input-field" value={series} onChange={(e) => setSeries(Number(e.target.value))} aria-label="سری شماره">
          <option value={0}>همه‌ی سری‌ها</option>
          {o.state.series.filter((s) => effDir === "all" || s.direction === effDir).map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <span className="w-36">
          <DateInput value={from} onChange={setFrom} placeholder="از تاریخ" />
        </span>
        <span className="w-36">
          <DateInput value={to} onChange={setTo} placeholder="تا تاریخ" />
        </span>
        <Button size="sm" icon={<Printer size={16} />} onClick={() => setPrinting(true)} disabled={!rows.length}>
          چاپ فهرست
        </Button>
        {actions}
      </FilterBar>
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<Stamp />} title="ثبتی با این فیلتر نیست" compact />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>شماره</th>
                {!direction && <th>نوع</th>}
                <th>تاریخ ثبت</th>
                <th>موضوع</th>
                <th>{effDir === "outgoing" ? "سازمان گیرنده" : effDir === "incoming" ? "سازمان فرستنده" : "طرف مکاتبه"}</th>
                {effDir !== "outgoing" && <th className="max-md:hidden">شماره/تاریخ نامه‌ی طرف</th>}
                <th className="max-md:hidden">سری</th>
                <th className="max-md:hidden">ثبت‌کننده</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ reg, letter, seriesTitle }) => (
                <tr key={`${reg.series}-${reg.number}`} className="cursor-pointer" onClick={() => onOpen(reg.letter)}>
                  <td dir="ltr" className="text-start font-bold tabular-nums whitespace-nowrap">
                    {toFa(reg.number)}
                  </td>
                  {!direction && (
                    <td>
                      <Badge tone={reg.direction === "incoming" ? "info" : "brand"} size="sm">
                        {directionLabel[reg.direction]}
                      </Badge>
                    </td>
                  )}
                  <td className="whitespace-nowrap">{toFa(dateOnly(reg.registered_at))}</td>
                  <td className="text-ink-900">{letter?.subject ?? "—"}</td>
                  <td>{reg.external_org || "—"}</td>
                  {effDir !== "outgoing" && <td className="max-md:hidden">{reg.external_number ? `${toFa(reg.external_number)} · ${toFa(reg.external_date)}` : "—"}</td>}
                  <td className="max-md:hidden">{seriesTitle}</td>
                  <td className="max-md:hidden">{nameOf(reg.registered_by)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {printing && <RegistryPrint rows={rows} caption={caption} onDone={() => setPrinting(false)} />}
    </div>
  );
}
