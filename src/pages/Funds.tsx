import { useMemo, useState } from "react";
import { PiggyBank, Plus, TrendingUp, Landmark, ListFilter, CalendarClock, Gauge, Target } from "lucide-react";
import { funds as initialFunds, type FundRecord } from "../data/mock";
import { fundDetails, fundOverview, reviewSessions } from "../data/mockDetails";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import { useToast } from "../components/ui/ToastProvider";

const stageTone: Record<FundRecord["stage"], BadgeTone> = {
  "ثبت‌شده": "neutral",
  "انتخاب اولیه": "warning",
  داوری: "brand",
  "تخصیص‌یافته": "success",
  "در حال پایش": "success",
};

const trancheTone: Record<string, BadgeTone> = {
  "پرداخت‌شده": "success",
  "در انتظار": "warning",
  مشروط: "neutral",
};

const stages: FundRecord["stage"][] = ["ثبت‌شده", "انتخاب اولیه", "داوری", "تخصیص‌یافته", "در حال پایش"];

export default function Funds() {
  const [funds, setFunds] = useState<FundRecord[]>(initialFunds);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [applicant, setApplicant] = useState("");
  const [amount, setAmount] = useState("");
  const [region, setRegion] = useState("");
  const [field, setField] = useState("");
  const [stageFilter, setStageFilter] = useState<"همه" | FundRecord["stage"]>("همه");
  const [selected, setSelected] = useState<FundRecord | null>(null);
  const { notify } = useToast();

  const selectedDetail = selected ? fundDetails[selected.id] : undefined;

  const submit = () => {
    if (!title.trim() || !applicant.trim()) {
      notify("عنوان طرح و نام متقاضی الزامی است.", "warning");
      return;
    }
    const newItem: FundRecord = {
      id: `fd-${Date.now()}`,
      title: title.trim(),
      applicant: applicant.trim(),
      stage: "ثبت‌شده",
      amount: amount.trim() || "در انتظار ارزیابی",
      roi: "—",
    };
    setFunds((prev) => [newItem, ...prev]);
    notify(`طرح «${newItem.title}»${region ? ` (${region})` : ""} ثبت شد و برای انتخاب اولیه به کارگروه ارجاع داده شد.`);
    setOpen(false);
    setTitle("");
    setApplicant("");
    setAmount("");
    setRegion("");
    setField("");
  };

  const referToReview = (fund: FundRecord) => {
    setFunds((prev) => prev.map((f) => (f.id === fund.id ? { ...f, stage: "داوری" } : f)));
    setSelected((prev) => (prev && prev.id === fund.id ? { ...prev, stage: "داوری" } : prev));
    notify(`طرح «${fund.title}» به جلسه داوری کارگروه ارجاع شد.`, "info");
  };

  const filtered = useMemo(
    () => (stageFilter === "همه" ? funds : funds.filter((f) => f.stage === stageFilter)),
    [funds, stageFilter]
  );

  const columns: Column<FundRecord>[] = [
    { key: "title", label: "عنوان طرح", render: (f) => <span className="font-medium text-ink-900">{f.title}</span> },
    { key: "applicant", label: "متقاضی" },
    { key: "stage", label: "وضعیت", render: (f) => <Badge tone={stageTone[f.stage]}>{f.stage}</Badge> },
    { key: "amount", label: "میزان تخصیص" },
    {
      key: "score",
      label: "امتیاز داوری",
      render: (f) => {
        const d = fundDetails[f.id];
        return d ? <span className="font-medium text-ink-800">{d.score} / ۱۰۰</span> : <span className="text-ink-400">—</span>;
      },
    },
    { key: "roi", label: "بازگشت سرمایه", render: (f) => <span className="flex items-center gap-1 text-emerald-600 font-medium"><TrendingUp size={12} /> {f.roi}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="صندوق نوآوری و شتاب‌دهی"
        description="ثبت طرح سرمایه‌گذاری، انتخاب اولیه، داوری، تخصیص منابع و گزارش بازگشت سرمایه"
        icon={<PiggyBank size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            ثبت طرح جدید
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="سرمایه صندوق" value={fundOverview.totalCapital} tone="brand" icon={<Landmark size={16} />} />
        <StatCard label="تخصیص‌یافته" value={fundOverview.allocated} tone="success" icon={<PiggyBank size={16} />} />
        <StatCard label="طرح‌های فعال" value={funds.length} icon={<Target size={16} />} />
        <StatCard label="نرخ موفقیت طرح‌ها" value={fundOverview.successRate} tone="success" icon={<Gauge size={16} />} />
        <StatCard label="میانگین زمان داوری" value={`${fundOverview.avgReviewDays} روز`} tone="warning" icon={<CalendarClock size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <ListFilter size={14} className="text-ink-400" />
            <button
              onClick={() => setStageFilter("همه")}
              className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
                stageFilter === "همه" ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
              }`}
            >
              همه ({funds.length})
            </button>
            {stages.map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
                  stageFilter === s ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
                }`}
              >
                {s} ({funds.filter((f) => f.stage === s).length})
              </button>
            ))}
          </div>
          <DataTable
            columns={columns}
            rows={filtered}
            searchKeys={["title", "applicant"]}
            searchPlaceholder="جستجو در عنوان طرح یا متقاضی…"
            onRowClick={(f) => setSelected(f)}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <CalendarClock size={15} className="text-brand-600" /> جلسات داوری پیش رو
          </h3>
          {reviewSessions.map((rv) => (
            <div key={rv.id} className="card p-4">
              <p className="text-sm font-medium text-ink-900 leading-6">{rv.title}</p>
              <p className="text-xs text-ink-400 mt-1">{rv.committee}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 text-xs">
                <Badge tone="brand">{rv.items} طرح در دستور</Badge>
                <span className="text-ink-400">{rv.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="ثبت طرح سرمایه‌گذاری جدید" description="طرح ثبت‌شده ابتدا وارد فاز «انتخاب اولیه» می‌شود.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان طرح</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: کارگاه فرآوری خرما — جنوب کرمان" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام متقاضی / تیم</label>
            <input value={applicant} onChange={(e) => setApplicant(e.target.value)} placeholder="مثلاً: تعاونی روستایی نخل‌داران" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">حوزه طرح</label>
              <input value={field} onChange={(e) => setField(e.target.value)} placeholder="کشاورزی / پوشاک / دامپروری" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">منطقه اجرا</label>
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="استان — شهرستان" className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">میزان درخواستی (ریال)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="۲۵۰٬۰۰۰٬۰۰۰" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ثبت طرح</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="پرونده طرح">
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone={stageTone[selected.stage]}>{selected.stage}</Badge>
                {selectedDetail && <Badge tone="neutral">{selectedDetail.field}</Badge>}
              </div>
              <div className="text-xs text-ink-600 space-y-1.5 mt-3">
                <p><span className="text-ink-400">متقاضی:</span> {selected.applicant}</p>
                {selectedDetail && (
                  <>
                    <p><span className="text-ink-400">منطقه اجرا:</span> {selectedDetail.region}</p>
                    <p><span className="text-ink-400">مبلغ درخواستی:</span> {selectedDetail.requested}</p>
                    <p><span className="text-ink-400">مبلغ مصوب:</span> {selectedDetail.approved}</p>
                    <p><span className="text-ink-400">کارگروه بررسی‌کننده:</span> {selectedDetail.committee}</p>
                  </>
                )}
              </div>
            </div>

            {selectedDetail && (
              <>
                <div className="border-t border-ink-100 pt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-ink-900">امتیاز داوری</span>
                    <span className="text-ink-500">{selectedDetail.score} از ۱۰۰</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${selectedDetail.score >= 75 ? "bg-emerald-500" : selectedDetail.score >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${selectedDetail.score}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">پرداخت مرحله‌ای (اقساط)</h4>
                  {selectedDetail.tranches.length === 0 && <p className="text-xs text-ink-400">تخصیصی انجام نشده است.</p>}
                  <div className="space-y-2">
                    {selectedDetail.tranches.map((t) => (
                      <div key={t.id} className="text-xs bg-ink-50 rounded-lg p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-ink-800">{t.title}</p>
                          <Badge tone={trancheTone[t.status]}>{t.status}</Badge>
                        </div>
                        <p className="text-ink-400 mt-1">{t.amount}</p>
                        <p className="text-ink-500 mt-1">شرط پرداخت: {t.condition}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2">شاخص‌های پایش (KPI)</h4>
                  {selectedDetail.kpis.length === 0 && <p className="text-xs text-ink-400">پایش پس از تخصیص آغاز می‌شود.</p>}
                  <div className="space-y-2">
                    {selectedDetail.kpis.map((k) => (
                      <div key={k.label} className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-medium text-ink-800">{k.label}</p>
                          <p className="text-ink-400 mt-0.5">هدف: {k.target}</p>
                        </div>
                        <Badge tone={k.onTrack ? "success" : "danger"}>{k.value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-1">جمع‌بندی کارگروه</h4>
                  <p className="text-xs text-ink-500 leading-6">{selectedDetail.notes}</p>
                </div>
              </>
            )}

            {(selected.stage === "ثبت‌شده" || selected.stage === "انتخاب اولیه") && (
              <div className="border-t border-ink-100 pt-4">
                <Button variant="primary" className="w-full justify-center" onClick={() => referToReview(selected)}>
                  ارجاع به جلسه داوری
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
