import { useMemo, useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM, type NewTaskInput } from "../../context/ProjectsContext";
import { addDays, diffDays, fa, toEnDigits } from "../../pm/jalali";
import { autoMap, importFields, normalizeDate, normalizePriority, normalizeType, parseCsv, type ImportField } from "../../pm/csv";
import { typeLabel } from "../../pm/selectors";
import { useProjectPage } from "./shared";

const sample = `عنوان,وضعیت,مسئول,اولویت,شروع,سررسید,برآورد ساعت,برچسب‌ها,نوع
تهیه‌ی گزارش ماهانه‌ی کارفرما,برای انجام,وحید خاوئی,متوسط,1405/03/10,1405/03/14,6,مستندات,تسک
Fix water pump in village 4,In Progress,تیم عمرانی,High,2026-06-01,2026-06-05,12,عمرانی;خطا,Bug
بازدید نهایی کارگاه‌ها,,محسن مردعلی,زیاد,۱۴۰۵/۰۳/۲۰,۱۴۰۵/۰۳/۲۲,,,داستان`;

type Step = "source" | "map" | "preview";

/** درون‌ریزی CSV در ۳ گام: منبع (فایل یا متن) ← نگاشت ستون‌ها ← پیش‌نمایش و خطاها */
export default function CsvImportModal({ onClose }: { onClose: () => void }) {
  const { p, pid, refDate } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [step, setStep] = useState<Step>("source");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [map, setMap] = useState<Partial<Record<ImportField, number>>>({});
  const rows = useMemo(() => parseCsv(text), [text]);
  const headers = rows[0] ?? [];
  const body = rows.slice(1);

  const statusOf = (v: string) => {
    if (!v) return undefined;
    const s = v.trim().toLowerCase();
    const byLabel = p.columns.find((c) => c.label === v.trim());
    if (byLabel) return byLabel.id;
    const kind = /done|closed|resolved|انجام/.test(s) ? "done" : /review|بازبینی|qa/.test(s) ? "review" : /progress|doing|در حال/.test(s) ? "doing" : /block|متوقف/.test(s) ? "blocked" : /to ?do|open|برای انجام/.test(s) ? "todo" : /backlog|برنامه/.test(s) ? "backlog" : "";
    return p.columns.find((c) => c.kind === kind)?.id;
  };

  const parsed = useMemo(() => {
    const get = (r: string[], f: ImportField) => (map[f] !== undefined ? (r[map[f]!] ?? "").trim() : "");
    const members = p.members.map((m) => m.name);
    return body.map((r, i) => {
      const errors: string[] = [];
      const warns: string[] = [];
      const title = get(r, "title");
      if (!title) errors.push("عنوان خالی است");
      const startRaw = get(r, "start");
      const dueRaw = get(r, "due");
      const start = startRaw ? normalizeDate(startRaw) : refDate;
      const due = dueRaw ? normalizeDate(dueRaw) : null;
      if (startRaw && !start) errors.push(`تاریخ شروع نامعتبر «${startRaw}»`);
      if (dueRaw && !due) errors.push(`سررسید نامعتبر «${dueRaw}»`);
      const s0 = start ?? refDate;
      const d0 = due ?? addDays(s0, 7);
      if (start && due && diffDays(start, due) < 0) errors.push("سررسید قبل از شروع است");
      const statusRaw = get(r, "status");
      const status = statusOf(statusRaw);
      if (statusRaw && !status) warns.push(`وضعیت «${statusRaw}» شناخته نشد ← ستون اول`);
      const assignee = get(r, "assignee");
      if (assignee && !members.includes(assignee)) warns.push(`«${assignee}» عضو پروژه نیست`);
      const prRaw = get(r, "priority");
      const priority = prRaw ? normalizePriority(prRaw) : "متوسط";
      if (prRaw && !priority) warns.push(`اولویت «${prRaw}» ← متوسط`);
      const tyRaw = get(r, "type");
      const type = tyRaw ? normalizeType(tyRaw) : "task";
      if (tyRaw && !type) warns.push(`نوع «${tyRaw}» ← تسک`);
      const hrs = Number(toEnDigits(get(r, "estHours")).replace(/[^\d.]/g, "")) || 0;
      const pts = Number(toEnDigits(get(r, "storyPoints")).replace(/[^\d.]/g, "")) || undefined;
      const labels = get(r, "labels").split(/[;،,|]/).map((x) => x.trim()).filter(Boolean);
      const input: NewTaskInput = { title, description: get(r, "description"), assignee, priority: priority ?? "متوسط", start: s0, due: d0, status, labels, estHours: hrs, storyPoints: pts, type: type ?? "task" };
      return { line: i + 2, input, errors, warns };
    });
  }, [body, map, p, refDate]);

  const valid = parsed.filter((x) => !x.errors.length);
  const invalid = parsed.length - valid.length;

  const loadFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
    };
    reader.readAsText(file, "utf-8");
  };

  const toMap = () => {
    if (rows.length < 2) return notify("حداقل یک ردیف سرستون و یک ردیف داده لازم است.", "warning");
    setMap(autoMap(headers));
    setStep("map");
  };

  const runImport = () => {
    if (!valid.length) return notify("ردیف معتبری برای درون‌ریزی نیست.", "warning");
    const n = pm.importTasks(pid, valid.map((x) => x.input), fileName || "CSV");
    notify(`${fa(n)} تسک درون‌ریزی شد${invalid ? ` (${fa(invalid)} ردیف خطادار کنار گذاشته شد)` : ""}؛ کلید هر تسک خودکار ساخته شد.`);
    onClose();
  };

  const stepper = (
    <div className="flex items-center gap-2 text-[11px] mb-4">
      {(["source", "map", "preview"] as Step[]).map((s, i) => (
        <span key={s} className={`flex items-center gap-1 ${step === s ? "text-brand-700 font-bold" : "text-ink-400"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step === s ? "bg-brand-600 text-white" : "bg-ink-100"}`}>{fa(i + 1)}</span>
          {["منبع داده", "نگاشت ستون‌ها", "پیش‌نمایش و خطاها"][i]}
          {i < 2 && <ArrowRight size={11} className="rotate-180 text-ink-300" />}
        </span>
      ))}
    </div>
  );

  return (
    <Modal open onClose={onClose} title="درون‌ریزی تسک‌ها از CSV" description="خروجی Jira، Trello، Asana یا اکسل (CSV) — تاریخ میلادی خودکار به شمسی تبدیل می‌شود." width="max-w-3xl">
      {stepper}
      {step === "source" && (
        <div className="space-y-3">
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-ink-200 rounded-xl p-5 text-xs text-ink-500 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30">
            <FileUp size={18} className="text-brand-600" />
            {fileName ? `فایل «${fileName}» بارگذاری شد (${fa(Math.max(0, rows.length - 1))} ردیف)` : "انتخاب فایل CSV"}
            <input type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </label>
          <p className="text-[11px] text-ink-400 text-center">یا متن CSV را همین‌جا بچسبانید (ردیف اول = سرستون‌ها):</p>
          <textarea className="input-field min-h-[150px] font-mono text-[11px]" dir="auto" value={text} onChange={(e) => setText(e.target.value)} placeholder={sample} />
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={toMap} disabled={!text.trim()}>
              ادامه: نگاشت ستون‌ها
            </Button>
            <button onClick={() => setText(sample)} className="text-xs text-brand-700 hover:underline">
              استفاده از نمونه
            </button>
          </div>
        </div>
      )}
      {step === "map" && (
        <div className="space-y-3">
          <p className="text-xs text-ink-500">ستون‌های فایل به‌طور خودکار تشخیص داده شد (سرستون‌های فارسی و استاندارد Jira/Trello). در صورت نیاز اصلاح کنید.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {importFields.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 text-ink-600">
                  {f.label}
                  {f.required && <span className="text-rose-600"> *</span>}
                </span>
                <select className="input-field !py-1.5 !text-xs" value={map[f.id] ?? ""} onChange={(e) => setMap({ ...map, [f.id]: e.target.value === "" ? undefined : Number(e.target.value) })}>
                  <option value="">— نادیده —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `ستون ${fa(i + 1)}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep("source")}>
              بازگشت
            </Button>
            <Button variant="primary" disabled={map.title === undefined} onClick={() => setStep("preview")}>
              پیش‌نمایش
            </Button>
            {map.title === undefined && <span className="text-[11px] text-rose-600">ستون «عنوان» را مشخص کنید.</span>}
          </div>
        </div>
      )}
      {step === "preview" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge tone="success" icon={<CheckCircle2 size={11} />}>
              {fa(valid.length)} ردیف معتبر
            </Badge>
            {invalid > 0 && (
              <Badge tone="danger" icon={<AlertTriangle size={11} />}>
                {fa(invalid)} ردیف خطادار (درون‌ریزی نمی‌شود)
              </Badge>
            )}
            <span className="text-ink-400">نمایش {fa(Math.min(10, parsed.length))} ردیف اول</span>
          </div>
          <div className="overflow-x-auto border border-ink-100 rounded-lg">
            <table className="w-full text-[11px] min-w-[720px]">
              <thead>
                <tr className="text-ink-400 border-b border-ink-100 text-right bg-ink-50">
                  <th className="p-2 font-medium">ردیف</th>
                  <th className="p-2 font-medium">عنوان</th>
                  <th className="p-2 font-medium">نوع</th>
                  <th className="p-2 font-medium">وضعیت</th>
                  <th className="p-2 font-medium">مسئول</th>
                  <th className="p-2 font-medium">اولویت</th>
                  <th className="p-2 font-medium">بازه</th>
                  <th className="p-2 font-medium">بررسی</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 10).map((x) => (
                  <tr key={x.line} className={`border-b border-ink-100 ${x.errors.length ? "bg-rose-50" : ""}`}>
                    <td className="p-2 text-ink-400">{fa(x.line)}</td>
                    <td className="p-2 text-ink-800">{x.input.title || "—"}</td>
                    <td className="p-2">{typeLabel[x.input.type ?? "task"]}</td>
                    <td className="p-2">{x.input.status ? p.columns.find((c) => c.id === x.input.status)?.label : p.columns[0]?.label}</td>
                    <td className="p-2">{x.input.assignee || "—"}</td>
                    <td className="p-2">{x.input.priority}</td>
                    <td className="p-2 whitespace-nowrap">
                      {x.input.start} ← {x.input.due}
                    </td>
                    <td className="p-2">
                      {x.errors.map((e) => (
                        <p key={e} className="text-rose-700">
                          ✕ {e}
                        </p>
                      ))}
                      {x.warns.map((w) => (
                        <p key={w} className="text-amber-700">
                          ! {w}
                        </p>
                      ))}
                      {!x.errors.length && !x.warns.length && <span className="text-emerald-700">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="secondary" onClick={() => setStep("map")}>
              بازگشت
            </Button>
            <Button variant="primary" onClick={runImport} disabled={!valid.length}>
              درون‌ریزی {fa(valid.length)} تسک
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
