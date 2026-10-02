// ---------------------------------------------------------------------------
// تولیدکننده‌ی حداقلی XLSX (بدون وابستگی): SpreadsheetML در یک ZIP بدون فشرده‌سازی.
// برگه‌ها راست‌به‌چپ (rightToLeft) هستند؛ رشته‌ها inline و اعداد خام ذخیره می‌شوند
// تا در اکسل قابل محاسبه باشند. سطرهای «bold» با سبک پررنگ نوشته می‌شوند.
// ---------------------------------------------------------------------------
import type { DataSource, Row } from "./types";
import type { ReportResult } from "./engine";

export type XCell = string | number | null | undefined;
export type XRow = { cells: XCell[]; bold?: boolean };
export type XSheet = { name: string; rows: XRow[]; widths?: number[] };

// ----------------------------------------------------------------- ZIP (stored)

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files: { name: string; data: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // نام فایل UTF-8
    local.setUint16(8, 0, true); // بدون فشرده‌سازی
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, dosTime, true);
    cen.setUint16(14, dosDate, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cenSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of all) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

// ----------------------------------------------------------------- SpreadsheetML

const esc = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function colName(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const safeSheetName = (s: string, i: number) => (s.replace(/[[\]:*?/\\]/g, " ").trim() || `Sheet${i + 1}`).slice(0, 31);

function sheetXml(sh: XSheet): string {
  const maxCols = Math.max(1, ...sh.rows.map((r) => r.cells.length));
  const widths = Array.from({ length: maxCols }, (_, c) => {
    if (sh.widths?.[c]) return sh.widths[c];
    const longest = Math.max(6, ...sh.rows.slice(0, 300).map((r) => String(r.cells[c] ?? "").length));
    return Math.min(60, longest + 2);
  });
  const rows = sh.rows
    .map((r, ri) => {
      const cells = r.cells
        .map((v, ci) => {
          const ref = `${colName(ci)}${ri + 1}`;
          const st = r.bold ? ' s="1"' : "";
          if (v === null || v === undefined || v === "") return "";
          if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData></worksheet>`;
}

export function buildXlsx(sheets: XSheet[]): Uint8Array {
  const names = sheets.map((s, i) => safeSheetName(s.name, i));
  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/styles.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Tahoma"/><family val="2"/></font><font><b/><sz val="11"/><name val="Tahoma"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment readingOrder="2"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment readingOrder="2"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ];
  return zip(files);
}

export function downloadXlsx(name: string, sheets: XSheet[]) {
  const bytes = buildXlsx(sheets);
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".xlsx") ? name : `${name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ----------------------------------------------------------------- گزارش ← برگه‌ها

const raw = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
const cellOf = (v: Row[string]): XCell => (Array.isArray(v) ? v.join("، ") : v === true ? "بله" : v === false ? "خیر" : v === null || v === undefined ? "" : typeof v === "number" ? v : String(v));

/** برگه‌ی «گزارش» (نتیجه‌ی تجمیع‌شده) + برگه‌ی «داده‌ها» (ردیف‌های زیربنایی) */
export function reportSheets(title: string, meta: string, res: ReportResult, source?: DataSource): XSheet[] {
  const rows: XRow[] = [{ cells: [title], bold: true }, { cells: [meta] }, { cells: [] }];
  rows.push({ cells: [...res.dims.map((d) => d.label), ...res.measures.map((m) => m.label)], bold: true });
  if (!res.dims.length) rows.push({ cells: res.totals.map(raw) });
  else if (res.dims.length === 1) {
    res.groups.forEach((g) => rows.push({ cells: [g.label, ...g.values.map(raw)] }));
    rows.push({ cells: ["جمع کل", ...res.totals.map(raw)], bold: true });
  } else {
    res.groups.forEach((g) => g.children.forEach((c) => c.rows.length && rows.push({ cells: [g.label, c.label, ...c.values.map(raw)] })));
    rows.push({ cells: ["جمع کل", "", ...res.totals.map(raw)], bold: true });
  }
  const sheets: XSheet[] = [{ name: "گزارش", rows }];
  if (source && res.filtered.length) {
    const fields = source.fields;
    sheets.push({ name: "داده‌ها", rows: [{ cells: fields.map((f) => f.label), bold: true }, ...res.filtered.slice(0, 20000).map((r) => ({ cells: fields.map((f) => cellOf(r[f.key])) }))] });
  }
  return sheets;
}
