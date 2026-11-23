import { useMemo, useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle, Download, CornerDownLeft } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button, { buttonClass } from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Stepper from "../../components/ui/Stepper";
import Card from "../../components/ui/Card";
import Note from "../../components/ui/Note";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import { autoMap, importFields, parseCsv, type ImportField } from "../../pm/csv";
import { typeLabel } from "../../pm/selectors";
import { useProjectPage } from "./shared";
import { isXlsx, readXlsx } from "../../pm/xlsxRead";
import { importSources, sampleUrl, sourceById, type ImportSourceId } from "../../pm/import/presets";
import { buildImport, guessColumn, guessMember, statusOptionsOf, tableToRaw, type RawTask, type StatusOption } from "../../pm/import/model";
import { looksLikeTrello, parseTrello, trelloDoneChecks, type TrelloParsed } from "../../pm/import/trello";
import { parseAnyDate } from "../../pm/import/dates";

type Step = "source" | "file" | "map" | "values" | "preview";

/** متن فایل: UTF-8، و اگر نامعتبر بود Windows-1256 (CSV ذخیره‌شده با اکسل فارسی) */
async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1256").decode(buf);
  }
}

/**
 * ورود کارها از ابزارهای دیگر: منبع (ترلو، میزیتو، Jira، ClickUp، Asana، Linear/Plane، فایل دیگر)
 * ← فایل ← نگاشت ستون‌ها (برای جدول‌ها) ← نگاشت وضعیت‌ها و افراد ← پیش‌نمایش و ورود.
 * تبدیل‌ها در src/pm/import/* انجام می‌شود؛ این فایل فقط رابط کاربری است.
 */
export default function CsvImportModal({ onClose }: { onClose: () => void }) {
  const { p, pid, refDate } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [step, setStep] = useState<Step>("source");
  const [srcId, setSrcId] = useState<ImportSourceId>("generic");
  const src = sourceById(srcId);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  /** ردیف‌های خوانده‌شده از اکسل (xlsx)؛ برای CSV از متن ساخته می‌شود */
  const [xrows, setXrows] = useState<string[][] | null>(null);
  const [trello, setTrello] = useState<TrelloParsed | null>(null);
  const [map, setMap] = useState<Partial<Record<ImportField, number>>>({});
  /** وضعیت خام (لیست ترلو / متن وضعیت) ← شناسه‌ی ستون بورد؛ «» = ستون اول */
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  /** نام فرد در فایل ← عضو پروژه؛ «» = بدون مسئول؛ همان نام = عضو نیست */
  const [peopleMap, setPeopleMap] = useState<Record<string, string>>({});
  const [includeArchived, setIncludeArchived] = useState(false);
  const [withComments, setWithComments] = useState(true);
  const [idPrefix] = useState(() => `imp${Date.now().toString(36)}-`);

  const rows = useMemo(() => (trello ? [] : xrows ?? parseCsv(text)), [text, xrows, trello]);
  const headers = rows[0] ?? [];

  const raw: RawTask[] = useMemo(() => (trello ? trello.raw : step === "source" || step === "file" ? [] : tableToRaw(rows, map, src)), [trello, rows, map, src, step]);
  const inScope = useMemo(() => raw.filter((r) => includeArchived || !r.archived), [raw, includeArchived]);
  const statusOptions: StatusOption[] = useMemo(
    () => (trello ? statusOptionsOf(inScope, trello.listNames).filter((l) => l.count > 0) : statusOptionsOf(inScope)),
    [trello, inScope]
  );
  const peopleList = useMemo(() => {
    const c = new Map<string, number>();
    inScope.forEach((r) => [...r.people, ...r.watchers].forEach((n) => c.set(n, (c.get(n) ?? 0) + 1)));
    return [...c].map(([name, count]) => ({ name, count }));
  }, [inScope]);

  const plan = useMemo(
    () => buildImport(raw, { columns: p.columns, members: p.members, refDate, statusMap, peopleMap, includeArchived, idPrefix }),
    [raw, p.columns, p.members, refDate, statusMap, peopleMap, includeArchived, idPrefix]
  );
  const archivedCount = raw.filter((r) => r.archived).length;
  const doneChecks = useMemo(() => (trello ? trelloDoneChecks(text) : 0), [trello, text]);

  // ------------------------------------------------------------ بارگذاری
  const resetData = () => {
    setTrello(null);
    setXrows(null);
    setText("");
    setMap({});
    setStatusMap({});
    setPeopleMap({});
  };
  const loadText = (t: string, name: string) => {
    resetData();
    setFileName(name);
    setText(t);
    if (looksLikeTrello(t)) {
      try {
        const tp = parseTrello(t);
        setTrello(tp);
        if (srcId !== "trello") setSrcId("trello");
        notify(`بورد ترلو${tp.board ? ` «${tp.board}»` : ""} خوانده شد: ${fa(tp.raw.length)} کارت در ${fa(tp.lists.length)} لیست.`);
      } catch {
        notify("فایل JSON ترلو خوانده نشد؛ خروجی «Export as JSON» بورد را بدهید.", "warning");
      }
    }
  };
  const loadFile = (file: File) => {
    if (isXlsx(file)) {
      setLoading(true);
      readXlsx(file)
        .then((r) => {
          resetData();
          setFileName(file.name);
          setXrows(r);
          notify(`${fa(Math.max(0, r.length - 1))} ردیف از اکسل خوانده شد.`);
        })
        .catch(() => notify("فایل اکسل خوانده نشد؛ آن را به‌صورت ‎.xlsx‎ یا CSV ذخیره کنید.", "warning"))
        .finally(() => setLoading(false));
      return;
    }
    setLoading(true);
    readText(file)
      .then((t) => loadText(t, file.name))
      .catch(() => notify("فایل خوانده نشد.", "warning"))
      .finally(() => setLoading(false));
  };
  const loadSample = () => {
    setLoading(true);
    fetch(sampleUrl(src))
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => loadText(t, src.sample.file))
      .catch(() => notify("فایل نمونه در دسترس نیست.", "warning"))
      .finally(() => setLoading(false));
  };

  // ------------------------------------------------------------ گذر گام‌ها
  const guessValues = (rs: RawTask[], opts: StatusOption[]) => {
    const sm = { ...statusMap };
    opts.forEach((o) => {
      if (sm[o.key] === undefined) sm[o.key] = guessColumn(o.label, p.columns);
    });
    setStatusMap(sm);
    const pmap = { ...peopleMap };
    rs.forEach((r) => [...r.people, ...r.watchers].forEach((n) => {
      if (pmap[n] === undefined) pmap[n] = guessMember(n, p.members);
    }));
    setPeopleMap(pmap);
  };
  const fromFile = () => {
    if (trello) {
      guessValues(trello.raw, trello.lists);
      return setStep("values");
    }
    if (text.trim().startsWith("{")) return notify("این متن JSON بورد ترلو نیست؛ منبع «ترلو» و خروجی Export as JSON را بدهید.", "warning");
    if (rows.length < 2) return notify("حداقل یک ردیف سرستون و یک ردیف داده لازم است.", "warning");
    setMap(autoMap(headers, src.synonyms));
    setStep("map");
  };
  const fromMap = () => {
    const rs = tableToRaw(rows, map, src);
    guessValues(rs, statusOptionsOf(rs));
    setStep("values");
  };

  const runImport = () => {
    if (!plan.ready.length) return notify("کاری برای ورود نیست.", "warning");
    const n = pm.importTasks(pid, plan.ready.map((x) => x.input), `${src.historyName} «${fileName || "متن چسبانده‌شده"}»`);
    let cm = 0;
    if (trello && withComments) {
      plan.ready.forEach((x) =>
        x.comments.forEach((c) => {
          const d = parseAnyDate(c.at);
          pm.addComment(pid, x.input.id!, `«${c.author}» در ترلو${d ? ` (${d})` : ""}: ${c.text}`);
          cm++;
        })
      );
    }
    const skipped = plan.items.length - plan.ready.length;
    notify(`${fa(n)} کار از ${src.historyName} وارد شد${cm ? ` با ${fa(cm)} نظر` : ""}${skipped ? `؛ ${fa(skipped)} مورد کنار گذاشته شد` : ""}.`);
    onClose();
  };

  // ------------------------------------------------------------ گام‌شمار
  const flow: { id: Step; label: string }[] = [
    { id: "source", label: "منبع" },
    { id: "file", label: "فایل" },
    ...(trello ? [] : [{ id: "map" as Step, label: "نگاشت ستون‌ها" }]),
    { id: "values", label: trello ? "لیست‌ها و افراد" : "وضعیت‌ها و افراد" },
    { id: "preview", label: "پیش‌نمایش" },
  ];
  const cur = Math.max(0, flow.findIndex((f) => f.id === step));
  const back = () => setStep(flow[Math.max(0, cur - 1)].id);

  const footer =
    step === "source" ? null : (
      <>
        {step === "file" && (
          <Button variant="primary" onClick={fromFile} disabled={(!text.trim() && !xrows) || loading} loading={loading}>
            ادامه
          </Button>
        )}
        {step === "map" && (
          <Button variant="primary" disabled={map.title === undefined} onClick={fromMap}>
            ادامه: وضعیت‌ها و افراد
          </Button>
        )}
        {step === "values" && (
          <Button variant="primary" onClick={() => setStep("preview")}>
            پیش‌نمایش
          </Button>
        )}
        {step === "preview" && (
          <Button variant="primary" onClick={runImport} disabled={!plan.ready.length}>
            ورود {fa(plan.ready.length)} کار
          </Button>
        )}
        <Button variant="secondary" onClick={back}>
          بازگشت
        </Button>
        {step === "map" && map.title === undefined && <span className="text-xs text-rose-600">ستون «عنوان» را مشخص کنید.</span>}
      </>
    );

  const colSelect = (value: string, onChange: (v: string) => void) => (
    <select className="input-field !py-1.5 !text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— ستون اول ({p.columns[0]?.label}) —</option>
      {p.columns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="ورود کارها از ابزارهای دیگر"
      description="از ترلو، میزیتو، Jira، ClickUp، Asana، Linear/Plane یا هر فایل اکسل و CSV — ستون‌ها، وضعیت‌ها و افراد را نگاشت کنید، سپس پیش‌نمایش و ورود."
      width="max-w-3xl"
      footer={footer}
    >
      <Stepper orientation="horizontal" current={cur} steps={flow.map((f) => ({ label: f.label }))} className="mb-5" />

      {/* ---------------------------------------------------- ۱. منبع */}
      {step === "source" && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-ink-900">از کجا وارد می‌کنید؟</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {importSources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id !== srcId) {
                    resetData();
                    setFileName("");
                  }
                  setSrcId(s.id);
                  setStep("file");
                }}
                aria-pressed={s.id === srcId && !!fileName}
                className={`text-right rounded-[14px] border p-4 transition-colors min-h-[84px] ${
                  s.id === srcId && fileName ? "bg-teal-50 border-teal-700" : "bg-[var(--color-card)] border-ink-200 hover:border-brand-300 hover:bg-ink-50"
                }`}
              >
                <span className="block text-[15px] font-bold text-ink-900">{s.name}</span>
                <span className="block text-xs text-ink-500 mt-1 leading-5">{s.formats}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- ۲. فایل */}
      {step === "file" && (
        <div className="space-y-3">
          <Note tone="info" title={`گرفتن خروجی از ${src.name}`}>
            {src.howTo}
          </Note>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-ink-200 rounded-xl p-5 text-sm text-ink-600 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30">
            <FileUp size={20} className="text-brand-600" />
            {fileName
              ? trello
                ? `«${fileName}» — بورد ترلو با ${fa(trello.raw.length)} کارت`
                : `«${fileName}» بارگذاری شد (${fa(Math.max(0, rows.length - 1))} ردیف)`
              : `انتخاب فایل (${src.formats})`}
            <input
              type="file"
              accept={src.accept}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) loadFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <a href={sampleUrl(src)} download={src.sample.file} className={buttonClass("link", "sm")}>
              <Download size={14} /> دانلود فایل نمونه ({src.sample.label})
            </a>
            <Button variant="tonal" size="sm" onClick={loadSample} disabled={loading}>
              امتحان با فایل نمونه
            </Button>
          </div>
          {srcId !== "trello" && (
            <>
              <p className="text-xs text-ink-500">یا متن CSV را همین‌جا بچسبانید (ردیف اول = سرستون‌ها):</p>
              <textarea
                className="input-field min-h-[130px] font-mono text-[11px]"
                dir="auto"
                value={xrows ? "" : text}
                onChange={(e) => {
                  setXrows(null);
                  setTrello(null);
                  setFileName("");
                  setText(e.target.value);
                }}
                placeholder={"عنوان,وضعیت,مسئول,اولویت,شروع,سررسید\nتهیه‌ی گزارش ماهانه,در حال انجام,…,زیاد,1405/03/10,1405/03/14"}
              />
            </>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- ۳. نگاشت ستون‌ها */}
      {step === "map" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            ستون‌های فایل با سرستون‌های {src.id === "generic" ? "فارسی و استاندارد" : `خروجی ${src.name}`} پیش‌تشخیص داده شد؛ در صورت نیاز اصلاح کنید.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {importFields.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-xs">
                <span className="w-36 shrink-0 text-ink-600">
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
          <p className="text-xs text-ink-500">
            «والد» با «شناسه» یا عنوان کار دیگری در همین فایل جور می‌شود و آن ردیف زیرکارش می‌شود؛ «تاریخ انجام» پرشده یعنی کار انجام‌شده است؛ ردیف‌های «بایگانی‌شده» پیش‌فرض وارد نمی‌شوند.
          </p>
        </div>
      )}

      {/* ---------------------------------------------------- ۴. وضعیت‌ها و افراد */}
      {step === "values" && (
        <div className="space-y-4">
          <Card title={trello ? "لیست‌های ترلو ← ستون‌های بورد" : "وضعیت‌ها ← ستون‌های بورد"} description="ستون بورد همان وضعیت کار است؛ حدس از روی نام انجام شد.">
            {statusOptions.length === 0 ? (
              <p className="text-sm text-ink-500">ستون وضعیت در فایل نیست؛ همه‌ی کارها در ستون «{p.columns[0]?.label}» قرار می‌گیرند (کارهای دارای «تاریخ انجام» در ستون انجام‌شده).</p>
            ) : (
              <div className="space-y-2">
                {statusOptions.map((o) => (
                  <label key={o.key} className="flex items-center gap-2 text-xs">
                    <span className="w-44 shrink-0 text-ink-700 truncate">
                      {o.label || "—"} <span className="text-ink-400">({fa(o.count)})</span>
                      {o.archived && <span className="text-amber-700"> بایگانی</span>}
                    </span>
                    {colSelect(statusMap[o.key] ?? "", (v) => setStatusMap({ ...statusMap, [o.key]: v }))}
                  </label>
                ))}
              </div>
            )}
          </Card>
          <Card title="افراد فایل ← اعضای پروژه" description="مسئولان (و ایجادکنندگان به‌عنوان دنبال‌کننده). نام یکسان خودکار جور شد.">
            {peopleList.length === 0 ? (
              <p className="text-sm text-ink-500">در فایل نام فردی نیامده است.</p>
            ) : (
              <div className="space-y-2">
                {peopleList.map(({ name, count }) => {
                  const v = peopleMap[name] ?? name;
                  const member = p.members.some((m) => m.name === v);
                  return (
                    <label key={name} className="flex items-center gap-2 text-xs">
                      <span className="w-44 shrink-0 text-ink-700 truncate" title={name}>
                        {name} <span className="text-ink-400">({fa(count)})</span>
                      </span>
                      <select className={`input-field !py-1.5 !text-xs ${!member && v ? "!border-amber-500" : ""}`} value={v} onChange={(e) => setPeopleMap({ ...peopleMap, [name]: e.target.value })}>
                        {!p.members.some((m) => m.name === name) && <option value={name}>همان نام (عضو پروژه نیست)</option>}
                        <option value="">بدون مسئول</option>
                        {p.members.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>
          {(archivedCount > 0 || (trello && trello.commentCount > 0)) && (
            <div className="space-y-2">
              {archivedCount > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <Toggle on={includeArchived} onChange={() => setIncludeArchived(!includeArchived)} label="ورود بایگانی‌شده‌ها" />
                  <span>
                    ورود {fa(archivedCount)} {trello ? "کارت بایگانی‌شده (یا در لیست بایگانی‌شده)" : "ردیف بایگانی/لغوشده"}
                  </span>
                </div>
              )}
              {trello && trello.commentCount > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <Toggle on={withComments} onChange={() => setWithComments(!withComments)} label="ورود نظرهای ترلو" />
                  <span>ورود {fa(trello.commentCount)} نظر کارت‌ها به‌عنوان نظر کار (با نام نویسنده و تاریخ)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- ۵. پیش‌نمایش */}
      {step === "preview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { l: "کار", v: plan.stats.tasks },
              { l: "زیرکار", v: plan.stats.subtasks },
              { l: "مورد چک‌لیست", v: plan.stats.checklist },
              { l: "برچسب", v: plan.stats.labels },
              { l: "نظر", v: trello && withComments ? plan.stats.comments : 0 },
              { l: "فرد نگاشت‌نشده", v: plan.stats.unmappedPeople.length, warn: plan.stats.unmappedPeople.length > 0 },
            ].map((x) => (
              <div key={x.l} className={`rounded-[10px] border px-3 py-2 ${x.warn ? "border-amber-600/40 bg-amber-50" : "border-ink-100"}`}>
                <p className="text-lg font-bold text-ink-900 leading-7">{fa(x.v)}</p>
                <p className="text-[11px] text-ink-500">{x.l}</p>
              </div>
            ))}
          </div>
          {plan.stats.unmappedPeople.length > 0 && (
            <Note tone="warning" title="افراد نگاشت‌نشده">
              {plan.stats.unmappedPeople.join("، ")} — با همین نام ثبت می‌شوند و عضو پروژه نیستند؛ در گام قبل می‌توانید به اعضا نگاشت کنید.
            </Note>
          )}
          {plan.stats.skipped.length > 0 && (
            <Note tone="info" title={`${fa(plan.items.length - plan.ready.length)} مورد وارد نمی‌شود`}>
              {plan.stats.skipped.map((s) => `${s.reason}: ${fa(s.count)}`).join(" · ")}
            </Note>
          )}
          {doneChecks > 0 && <p className="text-xs text-ink-500">{fa(doneChecks)} مورد چک‌لیست که در ترلو تیک خورده بود، تیک‌خورده وارد می‌شود.</p>}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge tone="success" icon={<CheckCircle2 size={11} />}>
              {fa(plan.ready.length)} آماده‌ی ورود
            </Badge>
            {plan.items.some((x) => x.warns.length && !x.skip) && (
              <Badge tone="warning" icon={<AlertTriangle size={11} />}>
                {fa(plan.items.filter((x) => x.warns.length && !x.skip).length)} مورد با هشدار
              </Badge>
            )}
            <span className="text-ink-400">نمایش {fa(Math.min(12, plan.items.length))} مورد اول</span>
          </div>
          <div className="overflow-x-auto border border-ink-100 rounded-lg">
            <table className="w-full text-[11px] min-w-[760px]">
              <thead>
                <tr className="text-ink-500 border-b border-ink-100 text-right bg-ink-50">
                  <th className="p-2 font-medium">{trello ? "کارت" : "ردیف"}</th>
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
                {plan.items.slice(0, 12).map((x) => (
                  <tr key={x.line} className={`border-b border-ink-100 align-top ${x.skip ? "bg-ink-50 text-ink-400" : ""}`}>
                    <td className="p-2 text-ink-400">{fa(x.line)}</td>
                    <td className="p-2 text-ink-800">
                      {x.isSub && <CornerDownLeft size={11} className="inline text-ink-400 ms-0.5" aria-label="زیرکار" />} {x.input.title || "—"}
                      {(x.input.checklist?.length || x.input.labels?.length) ? (
                        <span className="block text-ink-400">
                          {x.input.checklist?.length ? `چک‌لیست ${fa(x.input.checklist.length)}` : ""}
                          {x.input.checklist?.length && x.input.labels?.length ? " · " : ""}
                          {x.input.labels?.join("، ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-2">{typeLabel[x.input.type ?? (x.isSub ? "subtask" : "task")]}</td>
                    <td className="p-2">{p.columns.find((c) => c.id === x.input.status)?.label ?? p.columns[0]?.label}</td>
                    <td className="p-2">
                      {x.input.assignee || "—"}
                      {x.input.coAssignees?.length ? <span className="text-ink-400"> +{fa(x.input.coAssignees.length)}</span> : null}
                    </td>
                    <td className="p-2">{x.input.priority}</td>
                    <td className="p-2 whitespace-nowrap">
                      {x.input.start} ← {x.input.due}
                    </td>
                    <td className="p-2">
                      {x.skip ? (
                        <p className="text-rose-700">✕ {x.skip}</p>
                      ) : (
                        <>
                          {x.warns.map((w) => (
                            <p key={w} className="text-amber-700">
                              ! {w}
                            </p>
                          ))}
                          {!x.warns.length && <span className="text-emerald-700">✓</span>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-500">کلید هر کار خودکار ساخته می‌شود و ورود در تاریخچه‌ی پروژه با نام منبع («از {src.historyName}») ثبت می‌شود.</p>
        </div>
      )}
    </Modal>
  );
}
