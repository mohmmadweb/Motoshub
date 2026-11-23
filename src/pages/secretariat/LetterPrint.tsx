// چاپ نامه (شماره، تاریخ، پیوست، گیرندگان، رونوشت، پاراف‌ها) و چاپ دفتر ثبت دبیرخانه با فیلتر جاری
import { useOffice } from "../../context/OfficeContext";
import { directionLabel, type Letter, type LetterRegistration } from "../../office/types";
import { PrintPortal } from "../../office/ui";
import { dateOnly, nameOf, toFa } from "../../office/util";

export function LetterPrint({ letter, onDone }: { letter: Letter; onDone: () => void }) {
  const o = useOffice();
  const reg = o.registrationOf(letter.id);
  const to = letter.parties.filter((p) => p.role === "to");
  const cc = letter.parties.filter((p) => p.role === "cc");
  const paraphs = o.state.paraphs.filter((p) => p.letter === letter.id);
  return (
    <PrintPortal onDone={onDone}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10mm" }}>
        <div>
          <p style={{ fontSize: "16pt", fontWeight: 700 }}>{reg?.external_org && reg.direction === "outgoing" ? reg.external_org : "نامه‌ی داخلی"}</p>
        </div>
        <table style={{ width: "auto" }}>
          <tbody>
            <tr>
              <td>شماره</td>
              <td dir="ltr">{reg ? toFa(reg.number) : "ثبت‌نشده"}</td>
            </tr>
            <tr>
              <td>تاریخ</td>
              <td>{toFa(dateOnly(reg?.registered_at ?? letter.created_at))}</td>
            </tr>
            <tr>
              <td>پیوست</td>
              <td>{letter.attachments.length ? `${toFa(letter.attachments.length)} برگ` : "ندارد"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginBottom: "4mm" }}>
        <b>گیرنده: </b>
        {to.map((p) => nameOf(p.principal_id)).join("، ")}
      </p>
      <p style={{ marginBottom: "6mm" }}>
        <b>موضوع: </b>
        {letter.subject}
      </p>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 2, minHeight: "60mm" }}>{letter.body}</div>
      <p style={{ marginTop: "12mm", textAlign: "left" }}>{nameOf(letter.sender_id)}</p>
      {cc.length > 0 && (
        <p style={{ marginTop: "8mm" }}>
          <b>رونوشت: </b>
          {cc.map((p) => nameOf(p.principal_id)).join("، ")}
        </p>
      )}
      {reg?.direction === "incoming" && (
        <p style={{ marginTop: "4mm" }}>
          وارده از {reg.external_org}
          {reg.external_number && ` به شماره‌ی ${toFa(reg.external_number)}`}
          {reg.external_date && ` مورخ ${toFa(reg.external_date)}`}
        </p>
      )}
      {paraphs.length > 0 && (
        <div style={{ marginTop: "8mm" }}>
          <b>پاراف‌ها</b>
          <ul>
            {paraphs.map((p) => (
              <li key={p.id}>
                {nameOf(p.author_id)} ({toFa(p.created_at)}): {p.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PrintPortal>
  );
}

export function RegistryPrint({ rows, caption, onDone }: { rows: { reg: LetterRegistration; letter?: Letter; seriesTitle: string }[]; caption: string; onDone: () => void }) {
  return (
    <PrintPortal onDone={onDone}>
      <p style={{ fontSize: "14pt", fontWeight: 700, marginBottom: "2mm" }}>دفتر ثبت دبیرخانه</p>
      <p style={{ marginBottom: "4mm" }}>{caption}</p>
      <table>
        <thead>
          <tr>
            <th>ردیف</th>
            <th>شماره</th>
            <th>نوع</th>
            <th>تاریخ ثبت</th>
            <th>موضوع</th>
            <th>طرف مکاتبه</th>
            <th>شماره/تاریخ نامه‌ی طرف</th>
            <th>سری</th>
            <th>ثبت‌کننده</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.reg.series}-${r.reg.number}`}>
              <td>{toFa(i + 1)}</td>
              <td dir="ltr">{toFa(r.reg.number)}</td>
              <td>{directionLabel[r.reg.direction]}</td>
              <td>{toFa(dateOnly(r.reg.registered_at))}</td>
              <td>{r.letter?.subject ?? "—"}</td>
              <td>{r.reg.external_org || "—"}</td>
              <td>{r.reg.external_number ? `${toFa(r.reg.external_number)} — ${toFa(r.reg.external_date)}` : "—"}</td>
              <td>{r.seriesTitle}</td>
              <td>{nameOf(r.reg.registered_by)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintPortal>
  );
}
