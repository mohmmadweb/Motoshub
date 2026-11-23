// نسخه‌ی چاپی صورتجلسه با محل امضای حاضران (چاپ بدون پوسته با printNode)
import { forwardRef } from "react";
import { fa } from "../../pm/jalali";
import { jalaliOf } from "../../pm/api";
import { attendanceLabel, meetingTypeLabel, minutesStatusLabel, roleLabel, type MeetingView } from "../../meetings/types";

const cell = { border: "1px solid var(--color-ink-300)", padding: "4px 6px", textAlign: "right" as const, verticalAlign: "top" as const };

const MinutesPrint = forwardRef<HTMLDivElement, { m: MeetingView }>(function MinutesPrint({ m }, ref) {
  return (
    <div ref={ref} style={{ fontSize: 12, lineHeight: 1.8, color: "var(--color-ink-900)" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 4px" }}>صورتجلسه</h1>
      <h2 style={{ fontSize: 15, fontWeight: 700, textAlign: "center", margin: "0 0 12px" }}>{m.title}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={cell}>تاریخ: {m.date}</td>
            <td style={cell}>ساعت: {m.time} ({fa(m.duration)} دقیقه)</td>
            <td style={cell}>شیوه و محل: {meetingTypeLabel[m.meeting_type]}{m.location ? ` — ${m.location}` : ""}</td>
          </tr>
          <tr>
            <td style={cell}>برگزارکننده: {m.organizer}</td>
            <td style={cell}>{m.project_name ? `پروژه: ${m.project_name}` : "صورتجلسه‌ی سازمانی"}</td>
            <td style={cell}>وضعیت: {minutesStatusLabel[m.minutes_status]}</td>
          </tr>
        </tbody>
      </table>
      {m.agenda.length > 0 && (
        <>
          <h3 style={{ fontWeight: 700, margin: "8px 0 2px" }}>دستور جلسه</h3>
          <ol style={{ margin: 0, paddingRight: 20 }}>
            {m.agenda.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </>
      )}
      <h3 style={{ fontWeight: 700, margin: "8px 0 2px" }}>شرح جلسه</h3>
      <div style={{ whiteSpace: "pre-wrap" }}>{m.minutes_text || "—"}</div>
      {m.resolutions.length > 0 && (
        <>
          <h3 style={{ fontWeight: 700, margin: "8px 0 4px" }}>مصوبات</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ردیف", "مصوبه", "مسئول اجرا", "مهلت"].map((h) => (
                  <th key={h} style={cell}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.resolutions.map((r, i) => (
                <tr key={r.id}>
                  <td style={cell}>{fa(i + 1)}</td>
                  <td style={cell}>{r.description}</td>
                  <td style={cell}>{r.assignee}</td>
                  <td style={cell}>{r.due || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <h3 style={{ fontWeight: 700, margin: "12px 0 4px" }}>حاضران و امضا</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["نام", "نقش", "حضور", "امضا"].map((h) => (
              <th key={h} style={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.participants.map((x) => (
            <tr key={x.id}>
              <td style={cell}>{x.external_name ?? x.name}</td>
              <td style={cell}>{roleLabel[x.role]}</td>
              <td style={cell}>
                {attendanceLabel[x.attendance]}
                {x.absence_reason ? ` (${x.absence_reason})` : ""}
              </td>
              <td style={{ ...cell, width: "28%", height: 40 }}>{x.signature?.state === "signed" ? `امضا شد${x.signature.at ? ` — ${jalaliOf(x.signature.at)}` : ""}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
export default MinutesPrint;
