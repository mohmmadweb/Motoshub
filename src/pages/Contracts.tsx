import { useMemo, useState } from "react";
import { FileSignature, Plus, Paperclip, CircleDollarSign, Hourglass, ShieldCheck, ListFilter, CheckCircle2, Circle, History, Landmark } from "lucide-react";
import { contracts as initialContracts, currentUser, type ContractRecord } from "../data/mock";
import { contractDetails, type ContractDetail } from "../data/mockDetails";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import { useToast } from "../components/ui/ToastProvider";

const stageTone: Record<ContractRecord["stage"], BadgeTone> = {
  مذاکره: "warning",
  فراخوان: "neutral",
  داوری: "brand",
  "در حال اجرا": "success",
  "تسویه‌شده": "neutral",
};

const paymentTone: Record<string, BadgeTone> = {
  "پرداخت‌شده": "success",
  "در انتظار تأیید": "warning",
  آینده: "neutral",
};

const approvalTone: Record<string, BadgeTone> = {
  "تأیید شده": "success",
  "در انتظار": "warning",
  "رد شده": "danger",
};

const stages: ContractRecord["stage"][] = ["فراخوان", "مذاکره", "داوری", "در حال اجرا", "تسویه‌شده"];

export default function Contracts() {
  const [contracts, setContracts] = useState<ContractRecord[]>(initialContracts);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contractType, setContractType] = useState<ContractDetail["type"]>("فناورانه");
  const [method, setMethod] = useState<ContractDetail["method"]>("فراخوان عمومی");
  const [stageFilter, setStageFilter] = useState<"همه" | ContractRecord["stage"]>("همه");
  const [selected, setSelected] = useState<ContractRecord | null>(null);
  const [obligationState, setObligationState] = useState<Record<string, boolean>>({});
  const { notify } = useToast();

  const selectedDetail = selected ? contractDetails[selected.id] : undefined;

  const submit = () => {
    if (!title.trim() || !vendor.trim()) {
      notify("عنوان قرارداد و نام تامین‌کننده الزامی است.", "warning");
      return;
    }
    const newItem: ContractRecord = {
      id: `ct-${Date.now()}`,
      title: title.trim(),
      vendor: vendor.trim(),
      stage: method === "فراخوان عمومی" ? "فراخوان" : "مذاکره",
      value: value.trim() || "—",
      deadline: deadline.trim() || "نامشخص",
      owner: currentUser.name,
    };
    setContracts((prev) => [newItem, ...prev]);
    notify(`قرارداد «${newItem.title}» (${contractType} — ${method}) ثبت شد و در وضعیت «${newItem.stage}» قرار گرفت.`);
    setOpen(false);
    setTitle("");
    setVendor("");
    setValue("");
    setDeadline("");
  };

  const filtered = useMemo(
    () => (stageFilter === "همه" ? contracts : contracts.filter((c) => c.stage === stageFilter)),
    [contracts, stageFilter]
  );

  const active = contracts.filter((c) => c.stage === "در حال اجرا").length;
  const inReview = contracts.filter((c) => c.stage === "داوری" || c.stage === "مذاکره").length;

  const isObligationDone = (id: string, fallback: boolean) => obligationState[id] ?? fallback;

  const toggleObligation = (id: string, fallback: boolean) => {
    const next = !isObligationDone(id, fallback);
    setObligationState((prev) => ({ ...prev, [id]: next }));
    notify(next ? "تعهد به‌عنوان انجام‌شده علامت خورد." : "تعهد به وضعیت باز برگشت.", "info");
  };

  const columns: Column<ContractRecord>[] = [
    { key: "title", label: "عنوان قرارداد", render: (c) => <span className="font-medium text-ink-900">{c.title}</span> },
    { key: "vendor", label: "تامین‌کننده/فناور" },
    { key: "stage", label: "وضعیت", render: (c) => <Badge tone={stageTone[c.stage]}>{c.stage}</Badge> },
    { key: "value", label: "ارزش قرارداد" },
    { key: "deadline", label: "سرآمد تعهدات" },
    { key: "owner", label: "مسئول" },
    {
      key: "docs",
      label: "اسناد",
      render: (c) => (
        <span className="flex items-center gap-1 text-ink-400">
          <Paperclip size={13} /> {contractDetails[c.id] ? contractDetails[c.id].payments.length + contractDetails[c.id].obligations.length : 2} سند
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="مدیریت قراردادهای فناورانه"
        description="ثبت قرارداد، وضعیت مذاکره/فراخوان، داوری و انتخاب فناوران، زمان‌بندی تعهدات و پرداخت‌ها"
        icon={<FileSignature size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            ثبت قرارداد جدید
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="کل قراردادها" value={contracts.length} tone="brand" icon={<FileSignature size={16} />} />
        <StatCard label="در حال اجرا" value={active} tone="success" icon={<CircleDollarSign size={16} />} />
        <StatCard label="در مذاکره / داوری" value={inReview} tone="warning" icon={<Hourglass size={16} />} />
        <StatCard label="دارای ضمانت‌نامه معتبر" value={Object.values(contractDetails).filter((d) => d.guarantee !== "—").length} icon={<ShieldCheck size={16} />} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ListFilter size={14} className="text-ink-400" />
        <button
          onClick={() => setStageFilter("همه")}
          className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
            stageFilter === "همه" ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
          }`}
        >
          همه ({contracts.length})
        </button>
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              stageFilter === s ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {s} ({contracts.filter((c) => c.stage === s).length})
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={["title", "vendor"]}
        searchPlaceholder="جستجو در عنوان یا تامین‌کننده…"
        onRowClick={(c) => setSelected(c)}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="ثبت قرارداد فناورانه جدید" description="بر اساس روش انتخاب، قرارداد در وضعیت «فراخوان» یا «مذاکره» قرار می‌گیرد.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان قرارداد</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: توسعه و استقرار سامانه مانیتورینگ ناوگان" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">تامین‌کننده / فناور</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="مثلاً: شرکت دانش‌بنیان رایان‌فناوران" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">نوع قرارداد</label>
              <select value={contractType} onChange={(e) => setContractType(e.target.value as ContractDetail["type"])} className="input-field">
                <option value="فناورانه">فناورانه</option>
                <option value="پژوهشی">پژوهشی</option>
                <option value="عمرانی">عمرانی</option>
                <option value="خدماتی">خدماتی</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">روش انتخاب</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as ContractDetail["method"])} className="input-field">
                <option value="فراخوان عمومی">فراخوان عمومی</option>
                <option value="استعلام محدود">استعلام محدود</option>
                <option value="ترک تشریفات">ترک تشریفات</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">ارزش قرارداد</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="۱٬۲۰۰٬۰۰۰٬۰۰۰ ریال" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">سرآمد تعهدات</label>
              <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="۱۴۰۵/۰۹/۰۱" className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ثبت قرارداد</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="پرونده قرارداد">
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone={stageTone[selected.stage]}>{selected.stage}</Badge>
                {selectedDetail && <Badge tone="navy">{selectedDetail.type}</Badge>}
                {selectedDetail && <Badge tone="neutral">{selectedDetail.method}</Badge>}
              </div>
              <div className="text-xs text-ink-600 space-y-1.5 mt-3">
                <p><span className="text-ink-400">طرف قرارداد:</span> {selected.vendor}</p>
                <p><span className="text-ink-400">ارزش:</span> {selected.value}</p>
                <p><span className="text-ink-400">سرآمد تعهدات:</span> {selected.deadline}</p>
                <p><span className="text-ink-400">مسئول پیگیری:</span> {selected.owner}</p>
                {selectedDetail && (
                  <p className="flex items-start gap-1">
                    <Landmark size={13} className="text-ink-400 mt-0.5 shrink-0" />
                    <span>{selectedDetail.guarantee}</span>
                  </p>
                )}
              </div>
            </div>

            {selectedDetail ? (
              <>
                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">زمان‌بندی پرداخت‌ها</h4>
                  {selectedDetail.payments.length === 0 && <p className="text-xs text-ink-400">پرداختی تعریف نشده است.</p>}
                  <div className="space-y-2">
                    {selectedDetail.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-ink-50 rounded-lg p-2.5">
                        <div className="min-w-0">
                          <p className="font-medium text-ink-800 truncate">{p.title}</p>
                          <p className="text-ink-400 mt-0.5">{p.amount} · سررسید {p.due}</p>
                        </div>
                        <Badge tone={paymentTone[p.status]}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">تعهدات و اقلام قابل تحویل</h4>
                  <div className="space-y-1.5">
                    {selectedDetail.obligations.map((o) => {
                      const done = isObligationDone(o.id + selected.id, o.done);
                      return (
                        <button
                          key={o.id}
                          onClick={() => toggleObligation(o.id + selected.id, o.done)}
                          className="w-full flex items-center gap-2 text-right text-xs p-2 rounded-lg hover:bg-ink-50"
                        >
                          {done ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <Circle size={15} className="text-ink-300 shrink-0" />}
                          <span className={`flex-1 ${done ? "line-through text-ink-400" : "text-ink-800"}`}>{o.title}</span>
                          <span className="text-ink-400 shrink-0">{o.due}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">زنجیره تأیید</h4>
                  <div className="space-y-2">
                    {selectedDetail.approvals.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-medium text-ink-800">{a.role}</p>
                          <p className="text-ink-400 mt-0.5">{a.name}{a.date ? ` · ${a.date}` : ""}</p>
                        </div>
                        <Badge tone={approvalTone[a.status]}>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5">
                    <History size={13} /> تاریخچه قرارداد
                  </h4>
                  <div className="space-y-0">
                    {selectedDetail.history.map((h, i) => (
                      <div key={h.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                          {i < selectedDetail.history.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-xs text-ink-800">{h.text}</p>
                          <p className="text-[11px] text-ink-400 mt-0.5">{h.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-400 border-t border-ink-100 pt-4">
                جزئیات تکمیلی (پرداخت‌ها، تعهدات و زنجیره تأیید) پس از تکمیل پرونده توسط امور قراردادها نمایش داده می‌شود.
              </p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
