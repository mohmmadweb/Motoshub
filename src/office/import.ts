// ---------------------------------------------------------------------------
// ورود پرونده‌های مشتری از Excel/CSV (MZ: «Import پرونده مشتریان از Excel»):
// خواندن فایل ← نگاشت ستون‌ها (با گزینه‌ی «هیچ‌کدام») ← پیش‌نمایش و خطاها ← ورود.
// خواننده‌ی XLSX بدون وابستگی: ZIP با DecompressionStream("deflate-raw") + DOMParser.
// ---------------------------------------------------------------------------
import { toEnDigits } from "../pm/jalali";
import type { CustomerFile, PartyType, PhoneApi } from "./types";

export const IMPORT_MAX_ROWS = 5000;

// ------------------------------------------------------------------ CSV

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const src = text.replace(/^﻿/, "");
  const sep = (src.split("\n")[0].match(/\t/g)?.length ?? 0) > (src.split("\n")[0].match(/,/g)?.length ?? 0) ? "\t" : ",";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

// ------------------------------------------------------------------ XLSX

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf: ArrayBuffer, want: (name: string) => boolean): Promise<Map<string, string>> {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("فایل Excel معتبر نیست.");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, string>();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const comp = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!want(name)) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + comp);
    const data = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
    if (data) out.set(name, dec.decode(data));
  }
  return out;
}

const colIndex = (ref: string) => {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** برگه‌ی اول فایل XLSX → ردیف‌ها */
export async function readXlsx(file: Blob): Promise<string[][]> {
  if (typeof DecompressionStream === "undefined") throw new Error("مرورگر از خواندن Excel پشتیبانی نمی‌کند؛ فایل را CSV ذخیره کنید.");
  const files = await unzip(await file.arrayBuffer(), (n) => n === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const sheetName = [...files.keys()].filter((n) => n.startsWith("xl/worksheets/")).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0];
  if (!sheetName) throw new Error("برگه‌ای در فایل پیدا نشد.");
  const parser = new DOMParser();
  const shared: string[] = [];
  const ss = files.get("xl/sharedStrings.xml");
  if (ss) parser.parseFromString(ss, "application/xml").querySelectorAll("si").forEach((si) => shared.push([...si.querySelectorAll("t")].filter((t) => t.parentElement?.tagName !== "rPh").map((t) => t.textContent ?? "").join("")));
  const doc = parser.parseFromString(files.get(sheetName)!, "application/xml");
  const rows: string[][] = [];
  doc.querySelectorAll("sheetData > row").forEach((r) => {
    const row: string[] = [];
    r.querySelectorAll("c").forEach((c) => {
      const idx = colIndex(c.getAttribute("r") ?? "A");
      const t = c.getAttribute("t");
      const val = c.querySelector("v")?.textContent ?? "";
      const text = t === "s" ? (shared[Number(val)] ?? "") : t === "inlineStr" ? (c.querySelector("is")?.textContent ?? "") : val;
      row[idx] = text;
    });
    const filled = Array.from(row, (x) => x ?? "");
    if (filled.some((x) => x.trim())) rows.push(filled);
  });
  return rows;
}

export async function readTable(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) return readXlsx(file);
  return parseCsv(await file.text());
}

// ------------------------------------------------------------------ نگاشت

export type CustomerImportField =
  | "name"
  | "party_type"
  | "trade_name"
  | "national_id"
  | "economic_code"
  | "mobile"
  | "phone"
  | "email"
  | "website"
  | "address"
  | "postal_code"
  | "labels"
  | "description";

export const customerImportFields: { id: CustomerImportField; label: string; required?: boolean; hints: string[] }[] = [
  { id: "name", label: "نام / نام ثبتی", required: true, hints: ["نام", "نام مشتری", "نام شرکت", "name", "company"] },
  { id: "party_type", label: "نوع (حقیقی/حقوقی)", hints: ["نوع", "نوع شخص", "type"] },
  { id: "trade_name", label: "نام تجاری", hints: ["نام تجاری", "برند", "trade"] },
  { id: "national_id", label: "کد ملی / شناسه‌ی ملی", hints: ["کد ملی", "شناسه ملی", "شناسه‌ی ملی", "national"] },
  { id: "economic_code", label: "کد اقتصادی", hints: ["کد اقتصادی", "economic"] },
  { id: "mobile", label: "موبایل", hints: ["موبایل", "همراه", "mobile"] },
  { id: "phone", label: "تلفن ثابت", hints: ["تلفن", "تلفن ثابت", "phone", "tel"] },
  { id: "email", label: "ایمیل", hints: ["ایمیل", "پست الکترونیک", "email"] },
  { id: "website", label: "وب‌سایت", hints: ["وب‌سایت", "وبسایت", "سایت", "website"] },
  { id: "address", label: "نشانی", hints: ["نشانی", "آدرس", "address"] },
  { id: "postal_code", label: "کد پستی", hints: ["کد پستی", "postal", "zip"] },
  { id: "labels", label: "برچسب‌ها", hints: ["برچسب", "برچسب‌ها", "labels", "tags"] },
  { id: "description", label: "توضیحات", hints: ["توضیحات", "توضیح", "description"] },
];

const norm = (s: string) => s.replace(/[‌\s_‌-]+/g, "").toLowerCase();

export function autoMap(headers: string[]): Partial<Record<CustomerImportField, number>> {
  const out: Partial<Record<CustomerImportField, number>> = {};
  const used = new Set<number>();
  for (const f of customerImportFields) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && f.hints.some((x) => norm(h) === norm(x)));
    const j = i >= 0 ? i : headers.findIndex((h, idx) => !used.has(idx) && f.hints.some((x) => norm(h).includes(norm(x))));
    if (j >= 0) {
      out[f.id] = j;
      used.add(j);
    }
  }
  return out;
}

export type ImportedCustomer = Pick<CustomerFile, "party_type" | "name" | "trade_name" | "national_id" | "economic_code" | "phones" | "email" | "website" | "address" | "postal_code" | "labels" | "description">;

export type ImportRow = { line: number; value: ImportedCustomer; errors: string[]; warnings: string[] };

const partyOf = (v: string): PartyType | null => {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (/حقوقی|شرکت|company|legal/.test(s)) return "company";
  if (/حقیقی|شخص|person|individual/.test(s)) return "person";
  return null;
};

const digits = (s: string) => toEnDigits(s).replace(/[^\d+]/g, "");

/** تبدیل ردیف‌ها با نگاشت → پرونده‌ها + خطا/هشدار؛ تکراری‌ها با `isDuplicate` علامت می‌خورند */
export function buildRows(
  body: string[][],
  map: Partial<Record<CustomerImportField, number>>,
  isDuplicate: (c: ImportedCustomer) => string | null,
): ImportRow[] {
  const seen = new Set<string>();
  return body.slice(0, IMPORT_MAX_ROWS).map((r, i) => {
    const get = (f: CustomerImportField) => (map[f] !== undefined ? String(r[map[f]!] ?? "").trim() : "");
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = get("name");
    if (!name) errors.push("نام خالی است");
    const typeRaw = get("party_type");
    const trade = get("trade_name");
    const nid = digits(get("national_id"));
    const eco = digits(get("economic_code"));
    let party = partyOf(typeRaw);
    if (typeRaw && !party) warnings.push(`نوع «${typeRaw}» شناخته نشد`);
    if (!party) party = trade || eco || nid.length === 11 || /شرکت|گروه|هلدینگ|موسسه|مؤسسه|سازمان|تعاونی|فروشگاه/.test(name) ? "company" : "person";
    if (nid && party === "person" && nid.length !== 10) warnings.push("کد ملی باید ۱۰ رقم باشد");
    if (nid && party === "company" && nid.length !== 11) warnings.push("شناسه‌ی ملی باید ۱۱ رقم باشد");
    const phones: PhoneApi[] = [];
    const mobile = digits(get("mobile"));
    const phone = digits(get("phone"));
    if (mobile) phones.push({ label: "موبایل", number: mobile });
    if (phone) phones.push({ label: "تلفن ثابت", number: phone });
    const email = get("email");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) warnings.push("ایمیل نامعتبر است");
    const value: ImportedCustomer = {
      party_type: party,
      name,
      trade_name: trade,
      national_id: nid,
      economic_code: eco,
      phones,
      email,
      website: get("website"),
      address: get("address"),
      postal_code: digits(get("postal_code")),
      labels: get("labels").split(/[;،,|]/).map((x) => x.trim()).filter(Boolean),
      description: get("description"),
    };
    const key = nid || mobile || phone || name;
    if (key && seen.has(key)) warnings.push("در همین فایل تکرار شده");
    if (key) seen.add(key);
    const dup = name ? isDuplicate(value) : null;
    if (dup) warnings.push(dup);
    return { line: i + 2, value, errors, warnings };
  });
}

export const sampleHeaders = ["نام", "نوع", "نام تجاری", "شناسه ملی", "کد اقتصادی", "موبایل", "تلفن", "ایمیل", "نشانی", "کد پستی", "برچسب‌ها"];
export const sampleRows = [
  ["شرکت نمونه‌ی صنعت پارس", "حقوقی", "صنعت پارس", "10320654871", "411456987412", "09121234567", "02144556677", "info@example.com", "تهران، خیابان ولیعصر، پلاک ۱۲", "1415633311", "صنعتی؛ مشتری جدید"],
  ["علی نمونه", "حقیقی", "", "0012345678", "", "09351234567", "", "", "اصفهان، خیابان چهارباغ", "", "خرده‌فروشی"],
];
