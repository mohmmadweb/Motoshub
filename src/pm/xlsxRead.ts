// ---------------------------------------------------------------------------
// خواندن فایل اکسل ‎.xlsx‎ در مرورگر بدون کتابخانه (برای درون‌ریزی وظایف — میزیتو «Import از Excel»).
// xlsx یک فایل zip است: فهرست مرکزی را می‌خوانیم، با DecompressionStream("deflate-raw") باز می‌کنیم
// و اولین برگه را به آرایه‌ی ردیف‌ها (مثل خروجی parseCsv) تبدیل می‌کنیم.
// ---------------------------------------------------------------------------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** همه‌ی فایل‌های یک zip (فقط روش‌های stored و deflate) */
async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const csize = dv.getUint32(off + 20, true);
    const nlen = dv.getUint16(off + 28, true);
    const xlen = dv.getUint16(off + 30, true);
    const clen = dv.getUint16(off + 32, true);
    const local = dv.getUint32(off + 42, true);
    const name = dec.decode(u8.subarray(off + 46, off + 46 + nlen));
    const lnlen = dv.getUint16(local + 26, true);
    const lxlen = dv.getUint16(local + 28, true);
    const start = local + 30 + lnlen + lxlen;
    const raw = u8.subarray(start, start + csize);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, await inflateRaw(raw));
    off += 46 + nlen + xlen + clen;
  }
  return out;
}

const colIndex = (ref: string) => {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** اولین برگه‌ی فایل xlsx ← ردیف‌ها (رشته) */
export async function readXlsx(file: File): Promise<string[][]> {
  const files = await unzip(await file.arrayBuffer());
  const dec = new TextDecoder();
  const xml = (name: string) => {
    const f = files.get(name);
    return f ? new DOMParser().parseFromString(dec.decode(f), "application/xml") : null;
  };
  const shared: string[] = [];
  const ss = xml("xl/sharedStrings.xml");
  // متن آوانگاری (rPh) جزو مقدار نیست
  ss?.querySelectorAll("si").forEach((si) => shared.push([...si.querySelectorAll("t")].filter((t) => t.parentElement?.tagName !== "rPh").map((t) => t.textContent ?? "").join("")));
  const sheetNo = (k: string) => Number(k.match(/sheet(\d+)\.xml$/)?.[1] ?? 0);
  const sheetName = [...files.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => sheetNo(a) - sheetNo(b))[0];
  const sheet = sheetName ? xml(sheetName) : null;
  if (!sheet) throw new Error("no sheet");
  const rows: string[][] = [];
  sheet.querySelectorAll("sheetData > row").forEach((row) => {
    const cells: string[] = [];
    row.querySelectorAll("c").forEach((c) => {
      const ref = c.getAttribute("r") ?? "";
      const i = ref ? colIndex(ref) : cells.length;
      const t = c.getAttribute("t");
      const v = c.querySelector("v")?.textContent ?? "";
      const val = t === "s" ? shared[Number(v)] ?? "" : t === "inlineStr" ? [...c.querySelectorAll("is t")].map((x) => x.textContent ?? "").join("") : v;
      while (cells.length < i) cells.push("");
      cells[i] = val;
    });
    rows.push(cells);
  });
  return rows.filter((r) => r.some((x) => x.trim()));
}

export const isXlsx = (f: File) => /\.xlsx$/i.test(f.name) || f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
