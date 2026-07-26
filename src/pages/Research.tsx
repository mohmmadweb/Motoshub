import { useMemo, useState } from "react";
import { FlaskConical, Plus, Users, ListFilter, GraduationCap, Wallet, Clock3, FileCheck2, CheckCircle2, XCircle, Megaphone, Trophy, BookMarked } from "lucide-react";
import { researchOpportunities as initialOpportunities, type ResearchOpportunity } from "../data/mock";
import { researchDetails, type ResearchApplicant } from "../data/mockDetails";
import { rfpCalls, sabbaticals, type RfpCall, type Sabbatical } from "../data/mockDaneshmand";
import Tabs from "../components/ui/Tabs";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import { useToast } from "../components/ui/ToastProvider";
import { useTabParam } from "../lib/useTabParam";

const stageTone: Record<ResearchOpportunity["stage"], BadgeTone> = {
  "فراخوان باز": "success",
  "بررسی درخواست‌ها": "warning",
  داوری: "brand",
  "در حال اجرا": "navy",
  "پایان‌یافته": "neutral",
};

const applicantTone: Record<ResearchApplicant["status"], BadgeTone> = {
  "در بررسی": "warning",
  "پذیرفته": "success",
  "رد شده": "danger",
};

const stages: ResearchOpportunity["stage"][] = ["فراخوان باز", "بررسی درخواست‌ها", "داوری", "در حال اجرا", "پایان‌یافته"];

export default function Research() {
  const [tab, setTab] = useTabParam<"opps" | "rfp" | "sabbatical">("opps", ["opps", "rfp", "sabbatical"]);
  return (
    <div>
      <PageHeader
        title="مدیریت فرصت‌های پژوهشی"
        description="فراخوان‌های پژوهشی، فراخوان نیازهای فناورانه (RFP و انتخاب فناور برتر) و فرصت مطالعاتی اساتید"
        icon={<FlaskConical size={18} />}
      />
      <Tabs
        tabs={[
          { id: "opps", label: "فرصت‌های پژوهشی", count: initialOpportunities.length },
          { id: "rfp", label: "فراخوان فناور برتر (RFP)", count: rfpCalls.length },
          { id: "sabbatical", label: "فرصت مطالعاتی اساتید", count: sabbaticals.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "opps" && <OpportunitiesTab />}
      {tab === "rfp" && <RfpTab />}
      {tab === "sabbatical" && <SabbaticalTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// فراخوان نیازهای فناورانه — RFP، ثبت‌نام فناوران، ارزیابی کسب‌وکاری/فنی،
// بازگشایی پاکات در کمیسیون معاملات و انتخاب فناور برتر (کتاب فرآیندها، بخش ۲)
// ---------------------------------------------------------------------------
const rfpStageTone: Record<RfpCall["stage"], BadgeTone> = {
  "انتشار فراخوان": "neutral",
  "دریافت مستندات": "warning",
  "ارزیابی کسب‌وکاری": "warning",
  "ارزیابی فنی": "brand",
  "بازگشایی پاکات": "brand",
  "فناور برتر انتخاب شد": "success",
};

function RfpTab() {
  const { notify } = useToast();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500 leading-6 max-w-2xl">
          روند: احصاء فرصت از شرکت بنیادی ← تدوین RFP ← انتشار فراخوان (سامانه بنیاد، ساخت داخل، نان، جان) ←
          ثبت‌نام و ارسال مستندات فناوران ← جلسه ارزیابی توانمندی کسب‌وکاری (ثبت نمره) ← ارزیابی فنی (ثبت نمره) ←
          دریافت پیشنهاد قیمت ← بازگشایی پاکات در کمیسیون معاملات ← انتخاب فناور برتر.
        </p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => notify("فرم تدوین RFP جدید باز شد؛ پس از تصویب، فراخوان در سامانه‌های هدف منتشر می‌شود.", "info")}>
          RFP جدید
        </Button>
      </div>
      {rfpCalls.map((call) => (
        <div key={call.id} className="card p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
              <Megaphone size={14} className="text-brand-600" /> {call.title}
            </p>
            <Badge tone={rfpStageTone[call.stage]}>{call.stage}</Badge>
          </div>
          <p className="text-[11px] text-ink-400 mb-3">
            {call.company} ({call.holding}) · مهلت: {call.deadline} · انتشار در: {call.channels.join("، ")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-ink-400 text-right">
                  <th className="font-medium pb-1.5">فناور ثبت‌نامی</th>
                  <th className="font-medium pb-1.5 text-center">نمره کسب‌وکاری</th>
                  <th className="font-medium pb-1.5 text-center">نمره فنی</th>
                  <th className="font-medium pb-1.5 text-center">پیشنهاد قیمت</th>
                  <th className="font-medium pb-1.5 text-center">نتیجه</th>
                </tr>
              </thead>
              <tbody className="text-ink-700">
                {call.vendors.map((v) => (
                  <tr key={v.id} className="border-t border-ink-100">
                    <td className="py-2 font-medium text-ink-900">{v.name}</td>
                    <td className="py-2 text-center">{v.bizScore !== undefined ? `${v.bizScore.toLocaleString("fa-IR")} / ۱۰۰` : "—"}</td>
                    <td className="py-2 text-center">{v.techScore !== undefined ? `${v.techScore.toLocaleString("fa-IR")} / ۱۰۰` : "—"}</td>
                    <td className="py-2 text-center">{v.priceOpened ? v.price : <span className="text-ink-400">پاکت بسته</span>}</td>
                    <td className="py-2 text-center">
                      {v.winner ? <Badge tone="success" icon={<Trophy size={10} />}>فناور برتر</Badge> : <span className="text-ink-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// فرصت مطالعاتی اساتید — صندوق فرصت (کتاب فرآیندها، بخش ۴):
// سه گزارش مرحله‌ای، داوری صنعت و داور، پرداخت مرحله‌ای، TRL قبل/بعد
// ---------------------------------------------------------------------------
const sabbaticalStageTone: Record<Sabbatical["stage"], BadgeTone> = {
  فراخوان: "neutral",
  "انتخاب استاد": "warning",
  قرارداد: "brand",
  "در حال اجرا": "success",
  "کتابچه و ارائه نهایی": "navy",
  خاتمه: "neutral",
};

const sabbReportTone: Record<string, BadgeTone> = {
  "در انتظار": "neutral",
  "ارسال به صنعت و داور": "warning",
  "نیازمند اصلاح": "danger",
  "تایید و پرداخت شد": "success",
};

function SabbaticalTab() {
  const { notify } = useToast();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500 leading-6 max-w-2xl">
          روند: فراخوان و انتخاب استاد خبره ← قرارداد ← سه گزارش مرحله‌ای (شناخت شرکت / ارائه راهکار / RFPهای
          پیشنهادی) — هر گزارش پس از داوری صنعت و داور، تایید و دستور پرداخت آن صادر می‌شود ← کتابچه نهایی و جلسه
          ارائه ← نامه اتمام طرح.
        </p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => notify("فراخوان جدید فرصت مطالعاتی برای انتشار در درگاه صندوق باور و سامانه نان آماده شد.", "info")}>
          فراخوان فرصت مطالعاتی
        </Button>
      </div>
      {sabbaticals.map((sb) => (
        <div key={sb.id} className="card p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
              <BookMarked size={14} className="text-brand-600" /> {sb.topic}
            </p>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">TRL {sb.trlBefore.toLocaleString("fa-IR")}{sb.trlAfter ? ` ← ${sb.trlAfter.toLocaleString("fa-IR")}` : ""}</Badge>
              <Badge tone={sabbaticalStageTone[sb.stage]}>{sb.stage}</Badge>
            </div>
          </div>
          <p className="text-[11px] text-ink-400 mb-3">
            {sb.professor} — {sb.university} · صنعت میزبان: {sb.industry} · قرارداد {sb.contract}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {sb.reports.map((r) => (
              <div key={r.no} className="rounded-lg border border-ink-100 bg-ink-50/50 p-2.5">
                <p className="text-[10.5px] text-ink-400 mb-0.5">گزارش {r.no.toLocaleString("fa-IR")}</p>
                <p className="text-[11.5px] font-medium text-ink-900 leading-5">{r.title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <Badge tone={sabbReportTone[r.status]}>{r.status}</Badge>
                  {r.paidAmount && <span className="text-[10.5px] text-emerald-700">{r.paidAmount}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OpportunitiesTab() {
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>(initialOpportunities);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [field, setField] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [stageFilter, setStageFilter] = useState<"همه" | ResearchOpportunity["stage"]>("همه");
  const [selected, setSelected] = useState<ResearchOpportunity | null>(null);
  const [applicantState, setApplicantState] = useState<Record<string, ResearchApplicant["status"]>>({});
  const { notify } = useToast();

  const selectedDetail = selected ? researchDetails[selected.id] : undefined;

  const submit = () => {
    if (!title.trim() || !field.trim()) {
      notify("عنوان و حوزه‌ی پژوهش الزامی است.", "warning");
      return;
    }
    const newItem: ResearchOpportunity = {
      id: `rs-${Date.now()}`,
      title: title.trim(),
      field: field.trim(),
      stage: "فراخوان باز",
      applicants: 0,
      deadline: deadline.trim() || "نامشخص",
    };
    setOpportunities((prev) => [newItem, ...prev]);
    notify(`فراخوان پژوهشی «${newItem.title}» منتشر شد و در وضعیت «فراخوان باز» قرار گرفت.`);
    setOpen(false);
    setTitle("");
    setField("");
    setDeadline("");
    setBudget("");
    setSupervisor("");
  };

  const applicantStatus = (oppId: string, ap: ResearchApplicant): ResearchApplicant["status"] =>
    applicantState[`${oppId}-${ap.id}`] ?? ap.status;

  const setApplicant = (oppId: string, ap: ResearchApplicant, status: ResearchApplicant["status"]) => {
    setApplicantState((prev) => ({ ...prev, [`${oppId}-${ap.id}`]: status }));
    notify(
      status === "پذیرفته"
        ? `«${ap.name}» به‌عنوان مجری پذیرفته شد.`
        : `درخواست «${ap.name}» رد شد.`,
      status === "پذیرفته" ? "success" : "info"
    );
  };

  const filtered = useMemo(
    () => (stageFilter === "همه" ? opportunities : opportunities.filter((o) => o.stage === stageFilter)),
    [opportunities, stageFilter]
  );

  const totalApplicants = opportunities.reduce((s, o) => s + o.applicants, 0);
  const openCalls = opportunities.filter((o) => o.stage === "فراخوان باز").length;
  const running = opportunities.filter((o) => o.stage === "در حال اجرا").length;

  const columns: Column<ResearchOpportunity>[] = [
    { key: "title", label: "عنوان فرصت پژوهشی", render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
    { key: "field", label: "حوزه" },
    { key: "stage", label: "وضعیت", render: (r) => <Badge tone={stageTone[r.stage]}>{r.stage}</Badge> },
    { key: "applicants", label: "متقاضیان", render: (r) => <span className="flex items-center gap-1"><Users size={12} /> {r.applicants}</span> },
    {
      key: "budget",
      label: "بودجه",
      render: (r) => <span className="text-ink-600">{researchDetails[r.id]?.budget ?? "—"}</span>,
    },
    { key: "deadline", label: "مهلت ثبت‌نام" },
  ];

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
          فراخوان جدید
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="فراخوان‌های باز" value={openCalls.toLocaleString("fa-IR")} tone="success" icon={<FlaskConical size={16} />} />
        <StatCard label="کل متقاضیان" value={totalApplicants.toLocaleString("fa-IR")} tone="brand" icon={<Users size={16} />} />
        <StatCard label="پژوهش‌های در حال اجرا" value={running.toLocaleString("fa-IR")} icon={<GraduationCap size={16} />} />
        <StatCard label="بودجه پژوهشی فعال" value="۲٬۷۵۰٬۰۰۰٬۰۰۰ ریال" tone="warning" icon={<Wallet size={16} />} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ListFilter size={14} className="text-ink-400" />
        <button
          onClick={() => setStageFilter("همه")}
          className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
            stageFilter === "همه" ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
          }`}
        >
          همه ({opportunities.length})
        </button>
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
              stageFilter === s ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {s} ({opportunities.filter((o) => o.stage === s).length})
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={["title", "field"]}
        searchPlaceholder="جستجو در عنوان یا حوزه‌ی پژوهش…"
        onRowClick={(r) => setSelected(r)}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="انتشار فراخوان پژوهشی جدید" description="پس از انتشار، فراخوان در وضعیت «فراخوان باز» قابل مشاهده برای پژوهشگران خواهد بود.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان فرصت پژوهشی</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: سنجش اثر اجتماعی طرح‌های اشتغال روستایی" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">حوزه‌ی پژوهش</label>
              <input value={field} onChange={(e) => setField(e.target.value)} placeholder="مطالعات اجتماعی / اقتصاد" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">مهلت ثبت‌نام</label>
              <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="۱۴۰۵/۰۷/۱۵" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">بودجه (ریال)</label>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="۹۰۰٬۰۰۰٬۰۰۰" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">واحد متولی / ناظر</label>
              <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="دفتر مطالعات راهبردی" className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>انتشار فراخوان</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="پرونده فرصت پژوهشی">
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone={stageTone[selected.stage]}>{selected.stage}</Badge>
                <Badge tone="neutral">{selected.field}</Badge>
              </div>
            </div>

            {selectedDetail ? (
              <>
                <p className="text-xs text-ink-600 leading-6">{selectedDetail.description}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-ink-50 rounded-lg p-2.5 text-xs">
                    <p className="text-ink-400 flex items-center gap-1"><Wallet size={12} /> بودجه</p>
                    <p className="font-medium text-ink-800 mt-1">{selectedDetail.budget}</p>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-2.5 text-xs">
                    <p className="text-ink-400 flex items-center gap-1"><Clock3 size={12} /> مدت اجرا</p>
                    <p className="font-medium text-ink-800 mt-1">{selectedDetail.duration}</p>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-2.5 text-xs col-span-2">
                    <p className="text-ink-400 flex items-center gap-1"><GraduationCap size={12} /> واحد متولی / ناظر علمی</p>
                    <p className="font-medium text-ink-800 mt-1">{selectedDetail.supervisor}</p>
                  </div>
                </div>

                {typeof selectedDetail.progress === "number" && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-ink-900">پیشرفت اجرا</span>
                      <span className="text-ink-500">{selectedDetail.progress}٪</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full" style={{ width: `${selectedDetail.progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5">
                    <FileCheck2 size={13} /> خروجی‌های مورد انتظار
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetail.outputs.map((o) => (
                      <Badge key={o} tone="brand">{o}</Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-4">
                  <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5">
                    <Users size={13} /> متقاضیان ({selectedDetail.applicantsList.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDetail.applicantsList.map((ap) => {
                      const status = applicantStatus(selected.id, ap);
                      return (
                        <div key={ap.id} className="bg-ink-50 rounded-lg p-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-ink-800 truncate">{ap.name}</p>
                              <p className="text-ink-400 mt-0.5">{ap.affiliation}{ap.score !== undefined ? ` · امتیاز داوری: ${ap.score}` : ""}</p>
                            </div>
                            <Badge tone={applicantTone[status]}>{status}</Badge>
                          </div>
                          {status === "در بررسی" && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ink-100">
                              <Button variant="secondary" size="sm" icon={<CheckCircle2 size={12} />} onClick={() => setApplicant(selected.id, ap, "پذیرفته")}>
                                پذیرش
                              </Button>
                              <Button variant="ghost" size="sm" icon={<XCircle size={12} />} onClick={() => setApplicant(selected.id, ap, "رد شده")}>
                                رد درخواست
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-400">جزئیات تکمیلی این فراخوان (شرح، بودجه و متقاضیان) پس از تکمیل پرونده نمایش داده می‌شود.</p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
