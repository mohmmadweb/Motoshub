// ورود پرونده‌های مشتری از Excel/CSV در چهار گام: فایل ← نگاشت ستون‌ها ← دسترسی و برچسب ← پیش‌نمایش و ورود
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Note from "../../components/ui/Note";
import Stepper from "../../components/ui/Stepper";
import { useToast } from "../../components/ui/ToastProvider";
import { useOffice } from "../../context/OfficeContext";
import { downloadXlsx } from "../../reports/xlsx";
import { autoMap, buildRows, customerImportFields, IMPORT_MAX_ROWS, readTable, sampleHeaders, sampleRows, type CustomerImportField } from "../../office/import";
import { partyTypeLabel, type PrincipalId } from "../../office/types";
import { Field, LabelPicker, PeoplePicker, PersonSelect } from "../../office/ui";
import { faNum, toFa } from "../../office/util";

type Step = 0 | 1 | 2 | 3;

export default function ImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const o = useOffice();
  const { notify } = useToast();
  const [step, setStep] = useState<Step>(0);
  const [table, setTable] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [map, setMap] = useState<Partial<Record<CustomerImportField, number>>>({});
  const [owner, setOwner] = useState<PrincipalId>(o.me);
  const [access, setAccess] = useState<PrincipalId[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [skipDup, setSkipDup] = useState(true);
  const headers = table[0] ?? [];
  const body = useMemo(() => table.slice(1), [table]);
  const rows = useMemo(() => (step === 3 ? buildRows(body, map, (c) => o.duplicateOf(c)) : []), [step, body, map, o]);
  const ok = rows.filter((r) => !r.errors.length && !(skipDup && r.warnings.some((w) => w.includes("یکسان") || w.includes("وجود دارد") || w.includes("ثبت شده"))));

  const reset = () => {
    setStep(0);
    setTable([]);
    setFileName("");
    setError("");
    setMap({});
    setLabels([]);
    setAccess([]);
  };
  const close = () => {
    reset();
    onClose();
  };

  const load = async (file: File) => {
    setError("");
    try {
      const t = await readTable(file);
      if (t.length < 2) throw new Error("فایل ردیف داده ندارد.");
      setTable(t);
      setFileName(file.name);
      setMap(autoMap(t[0]));
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خواندن فایل ممکن نشد.");
    }
  };

  const run = () => {
    const r = o.importCustomers(
      ok.map((x) => x.value),
      { owner_id: owner, access, labels },
    );
    if (!r.ok) return notify(r.reason, "warning");
    notify(`${faNum(r.value)} پرونده‌ی مشتری وارد شد.`);
    close();
  };

  const footer =
    step === 0 ? (
      <Button variant="ghost" onClick={close}>
        انصراف
      </Button>
    ) : (
      <>
        {step < 3 ? (
          <Button variant="primary" disabled={step === 1 && map.name === undefined} onClick={() => setStep((s) => (s + 1) as Step)}>
            ادامه
          </Button>
        ) : (
          <Button variant="primary" disabled={!ok.length} onClick={run}>
            ورود {faNum(ok.length)} پرونده
          </Button>
        )}
        <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>
          قبلی
        </Button>
      </>
    );

  return (
    <Modal open={open} onClose={close} title="ورود پرونده‌ها از Excel" wide footer={footer}>
      <div className="flex flex-col gap-4">
        <Stepper orientation="horizontal" current={step} steps={[{ label: "فایل" }, { label: "نگاشت ستون‌ها" }, { label: "دسترسی و برچسب" }, { label: "پیش‌نمایش" }]} />

        {step === 0 && (
          <>
            <label className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50 px-5 py-8 text-center cursor-pointer hover:border-teal-500">
              <FileUp size={28} className="text-teal-700" />
              <span className="text-sm font-bold text-ink-800">انتخاب فایل Excel (‎.xlsx) یا CSV</span>
              <span className="text-xs text-ink-500">ردیف اول = عنوان ستون‌ها · حداکثر {faNum(IMPORT_MAX_ROWS)} ردیف در هر بار</span>
              <input type="file" accept=".xlsx,.csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
            </label>
            {error && <Note tone="danger">{error}</Note>}
            <div>
              <Button size="sm" icon={<Download size={16} />} onClick={() => downloadXlsx("نمونه-ورود-پرونده-مشتریان", [{ name: "پرونده‌ها", rows: [{ cells: sampleHeaders, bold: true }, ...sampleRows.map((cells) => ({ cells }))] }])}>
                دریافت فایل نمونه
              </Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-ink-600">
              فایل «{fileName}» با {faNum(body.length)} ردیف. برای هر فیلد ستون فایل را انتخاب کنید (یا «هیچ‌کدام»).
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {customerImportFields.map((f) => (
                <Field key={f.id} label={f.label} required={f.required}>
                  <select className="input-field" value={map[f.id] ?? -1} onChange={(e) => setMap({ ...map, [f.id]: Number(e.target.value) < 0 ? undefined : Number(e.target.value) })}>
                    <option value={-1}>— هیچ‌کدام —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `ستون ${toFa(i + 1)}`}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="مسئول پرونده‌ها">
              <PersonSelect value={owner} onChange={setOwner} />
            </Field>
            <Field label="قابل مشاهده برای…" hint="این افراد به همه‌ی پرونده‌های واردشده دسترسی می‌گیرند.">
              <PeoplePicker value={access} onChange={setAccess} exclude={[owner]} />
            </Field>
            <Field label="برچسب برای همه">
              <LabelPicker ns="crm" value={labels} onChange={setLabels} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} />
              ردیف‌هایی که با پرونده‌ی موجود یکسان‌اند وارد نشوند
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success" icon={<CheckCircle2 size={14} />}>
                آماده‌ی ورود {faNum(ok.length)}
              </Badge>
              <Badge tone="danger">خطادار {faNum(rows.filter((r) => r.errors.length).length)}</Badge>
              <Badge tone="warning" icon={<AlertTriangle size={14} />}>
                با هشدار {faNum(rows.filter((r) => r.warnings.length).length)}
              </Badge>
            </div>
            <div className="table-wrap overflow-auto max-h-[22rem]">
              <table className="table-shell">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>نام</th>
                    <th>نوع</th>
                    <th className="max-md:hidden">شناسه/کد ملی</th>
                    <th className="max-md:hidden">تلفن</th>
                    <th>بررسی</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.line} className={r.errors.length ? "opacity-60" : ""}>
                      <td>{toFa(r.line)}</td>
                      <td>{r.value.name || "—"}</td>
                      <td>{partyTypeLabel[r.value.party_type]}</td>
                      <td className="max-md:hidden" dir="ltr">
                        {toFa(r.value.national_id)}
                      </td>
                      <td className="max-md:hidden" dir="ltr">
                        {toFa(r.value.phones[0]?.number)}
                      </td>
                      <td className="text-xs">
                        {r.errors.map((e) => (
                          <span key={e} className="block text-rose-700">
                            {e}
                          </span>
                        ))}
                        {r.warnings.map((w) => (
                          <span key={w} className="block text-amber-700">
                            {w}
                          </span>
                        ))}
                        {!r.errors.length && !r.warnings.length && <span className="text-emerald-700">درست</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
