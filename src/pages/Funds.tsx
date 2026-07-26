import { useMemo, useState } from "react";
import { useTabParam } from "../lib/useTabParam";
import {
  PiggyBank,
  Plus,
  TrendingUp,
  Landmark,
  ListFilter,
  CalendarClock,
  Gauge,
  Target,
  Workflow,
  FileClock,
  Wallet,
  ShieldCheck,
  History,
  GitBranch,
  BellRing,
  Send,
} from "lucide-react";
import { funds as initialFunds, type FundRecord } from "../data/mock";
import { fundDetails, fundOverview, reviewSessions } from "../data/mockDetails";
import {
  nfProjects as initialNfProjects,
  nfStages,
  type NfProject,
  type NfStage,
} from "../data/mockInnovationFund";
import {
  nfEvaluations,
  nfSubStatuses,
  screeningCriteriaCatalog,
  screeningScores,
  fundCatalog,
  seedInvestments,
  type SeedInvestment,
} from "../data/mockDaneshmand";
import { useSettings, type WorkflowSettings } from "../context/SettingsContext";
import RowActions from "../components/ui/RowActions";
import { useConfirm } from "../components/ui/ConfirmProvider";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import Tabs from "../components/ui/Tabs";
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

const nfStageTone: Record<NfStage, BadgeTone> = {
  "دریافت پروپوزال": "neutral",
  "ارزیابی اولیه": "warning",
  "ارزیابی موشکافانه": "warning",
  "تصویب طرح": "brand",
  "تنظیم قرارداد": "brand",
  "نظارت و راهبری": "success",
  "خروج از صندوق": "navy",
};

const chainStatusTone: Record<string, BadgeTone> = {
  "تایید شده": "success",
  "در انتظار بررسی": "warning",
  "نیازمند اصلاح": "danger",
};

const paymentTone: Record<string, BadgeTone> = {
  "در انتظار دستور پرداخت": "neutral",
  "دستور پرداخت صادر شد": "warning",
  "پرداخت انجام شد": "success",
  "اسناد تحویل صندوق شد": "success",
  "اسناد به تیم مجری ارسال شد": "success",
};

export default function Funds() {
  const [tab, setTab] = useTabParam<"nf" | "allFunds" | "employment">("nf", ["nf", "allFunds", "employment"]);
  return (
    <div>
      <PageHeader
        title="صندوق نوآوری و شتاب‌دهی"
        description="روند کامل صندوق نوآور، شبکه‌ی صندوق‌های بنیاد (باور، فرصت، CVC و…) و طرح‌های اشتغال‌زایی"
        icon={<PiggyBank size={18} />}
      />
      <Tabs
        tabs={[
          { id: "nf", label: "صندوق نوآور — روند کامل", count: initialNfProjects.length },
          { id: "allFunds", label: "شبکه صندوق‌ها و بذرمایه باور", count: fundCatalog.length },
          { id: "employment", label: "طرح‌های اشتغال‌زایی", count: initialFunds.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "nf" && <InnovationFundTab />}
      {tab === "allFunds" && <AllFundsTab />}
      {tab === "employment" && <EmploymentFundTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// شبکه صندوق‌های بنیاد + خط لوله بذرمایه صندوق باور (تملک سهام و خروج)
// ---------------------------------------------------------------------------
const seedStageTone: Record<SeedInvestment["stage"], BadgeTone> = {
  غربالگری: "neutral",
  ارزیابی: "warning",
  "ارزیابی موشکافانه": "warning",
  قرارداد: "brand",
  "نظارت و راهبری": "success",
  خروج: "navy",
};

function AllFundsTab() {
  const { notify } = useToast();
  return (
    <div className="space-y-5">
      <div className="card p-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <Landmark size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          هر طرح بر اساس سطح بلوغ فناوری (TRL) به صندوق مناسب هدایت می‌شود؛ اگر در ارزیابی اولیه «مغایرت TRL»
          تشخیص داده شود، طرح به‌جای رد شدن به کمیته سرمایه‌گذاری ارجاع و به صندوق مناسب منتقل می‌شود.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {fundCatalog.map((f) => (
          <div key={f.id} className="card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold text-ink-900">{f.name}</p>
              <Badge tone="navy">{f.trlRange}</Badge>
            </div>
            <p className="text-[11.5px] text-ink-500 leading-5 flex-1">{f.focus}</p>
            <div className="mt-3 pt-2.5 border-t border-ink-100 text-[11px] text-ink-400 space-y-1">
              <p>مسئول: {f.manager}</p>
              <p>{f.activeProjects.toLocaleString("fa-IR")} طرح فعال · سرمایه: {f.capital}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-ink-900">بذرمایه صندوق باور — تملک سهام و خروج</h3>
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => notify("فرم درخواست سرمایه‌گذاری بذرمایه برای متقاضی ارسال شد (غربالگری ← ارزیابی ← موشکافانه ← کمیته سرمایه‌گذاری).", "info")}>
            ثبت درخواست بذرمایه
          </Button>
        </div>
        <div className="card divide-y divide-ink-100">
          {seedInvestments.map((s) => (
            <div key={s.id} className="p-3.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{s.startup}</p>
                  <p className="text-[11px] text-ink-400 mt-0.5">{s.field} · درخواستی: {s.requested}{s.approved ? ` · مصوب: ${s.approved}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.equityPercent !== undefined && <Badge tone="warning">{s.equityPercent.toLocaleString("fa-IR")}٪ سهام</Badge>}
                  {s.valuation && <Badge tone="neutral">ارزش‌گذاری {s.valuation}</Badge>}
                  <Badge tone={seedStageTone[s.stage]}>{s.stage}</Badge>
                </div>
              </div>
              {(s.kpiStatus || s.exitPlan) && (
                <p className="text-[11px] text-ink-500 mt-2 leading-5">
                  {s.kpiStatus && <>پایش KPI: {s.kpiStatus}. </>}
                  {s.exitPlan && <span className="text-emerald-700">خروج: {s.exitPlan}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 mt-2 leading-5">
          روند بذرمایه: دریافت طرح و غربالگری ← ارزیابی (تحقیق بازار، جلسه آشنایی، کمیته سرمایه‌گذاری) ← ارزیابی
          موشکافانه (تعیین مبلغ و درصد تملک) ← قرارداد و تضامین ← نظارت با پرداخت قسطی مبتنی بر KPI ← خروج (فروش سهام).
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// صندوق نوآور — روند کامل مطابق فرآیندهای موسسه تحقیق و توسعه بنیاد
// ---------------------------------------------------------------------------
function nfRules(s: WorkflowSettings) {
  return [
    { title: "یادآوری خودکار گزارش‌ها", text: `${s.reportReminderDays.toLocaleString("fa-IR")} روز قبل از سررسید هر گزارش (طبق گانت‌چارت)، یادآوری سیستمی برای مجری ارسال می‌شود.` },
    { title: `اسکالیشن بررسی ${s.reviewEscalationDays.toLocaleString("fa-IR")} روزه`, text: `اگر ناظر، راهبر یا مدیر صندوق گزارشی را ظرف ${s.reviewEscalationDays.toLocaleString("fa-IR")} روز بررسی نکند، اعلان سیستمی صادر می‌شود — هیچ گزارشی خودکار تایید نمی‌شود.` },
    { title: "اطلاع‌رسانی پرداخت به کل تیم", text: "با واریز هر مبلغ به حساب سرگروه، همه اعضای تیم مجری نوتیفیکیشن دریافت می‌کنند (شفافیت مالی)." },
    { title: "زنجیره تایید گزارش", text: "گزارش مرحله‌ای: مدیر صندوق ← راهبر ← ناظر ← صدور دستور پرداخت ← پرداخت واحد مالی ← بارگذاری اسناد." },
    { title: "تشخیص پروژه خوابیده", text: `اگر گزارش تعاملات معناداری در ${s.dormantProjectDays.toLocaleString("fa-IR")} روز ثبت نشود، پروژه به‌عنوان «در معرض توقف» به مدیریت ارشد هشدار داده می‌شود.` },
    { title: "مسیر سبز", text: "پروژه‌های دارای دستور هیئت‌مدیره / مدیرعامل / ریاست بنیاد با روند فوری (جلسه دفاع ← پروپوزال ← قرارداد) وارد صندوق می‌شوند." },
    { title: "حدنصاب‌های ارزیابی", text: `غربالگری ۲۲ معیاره: حداقل ${s.screeningThreshold.toLocaleString("fa-IR")} از ۲۰۰ · داوری ۵ بُعدی: حداقل ${s.juryThreshold.toLocaleString("fa-IR")} از ۱۰۰.` },
    { title: "درخواست‌های خارج از قرارداد", text: "تمدید ددلاین میانی، متمم، افزایش بودجه و معرفی‌نامه در سامانه ثبت و پس از تایید مدیر صندوق به‌صورت خودکار اعمال می‌شود." },
    { title: "حسن انجام کار و پیش‌پرداخت", text: `از هر پرداخت ${s.retentionPercent.toLocaleString("fa-IR")}٪ حسن انجام کار نگه داشته می‌شود؛ سقف پیش‌پرداخت ${s.prepaymentPercent.toLocaleString("fa-IR")}٪ مبلغ قرارداد در قبال ضمانت‌نامه است.` },
  ];
}

function InnovationFundTab() {
  const [projects, setProjects] = useState<NfProject[]>(initialNfProjects);
  const [selected, setSelected] = useState<NfProject | null>(null);
  const [stageFilter, setStageFilter] = useState<"همه" | NfStage>("همه");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [macroField, setMacroField] = useState("اقتصاد دیجیتال و هوش مصنوعی");
  const [budget, setBudget] = useState("");
  const [rahbar, setRahbar] = useState("شرکت شتابدهی و فناوری راهبر بنیاد");
  const [nazer, setNazer] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [formErrors, setFormErrors] = useState<{ title?: boolean; team?: boolean }>({});
  const { notify } = useToast();
  const { settings } = useSettings();

  const updateProject = (updated: NfProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const confirm = useConfirm();
  const deleteProject = (p: NfProject) =>
    confirm({
      title: `حذف پروژه ${p.id}؟`,
      message: `«${p.titleFa}» به همراه گام‌نما و سوابق مالی از فهرست فعال خارج و بایگانی می‌شود.`,
      onConfirm: () => {
        setProjects((prev) => prev.filter((x) => x.id !== p.id));
        setSelected((prev) => (prev && prev.id === p.id ? null : prev));
        notify(`پروژه «${p.id}» حذف شد و در تاریخچه سامانه بایگانی گردید.`, "info");
      },
    });

  const pendingReports = projects.flatMap((p) => p.reports).filter((r) => r.status === "در حال بررسی").length;
  const pendingPayments = projects.flatMap((p) => p.payments).filter((p) => p.status !== "اسناد به تیم مجری ارسال شد" && p.status !== "اسناد تحویل صندوق شد").length;
  const lateReviews = projects.flatMap((p) => p.reports).flatMap((r) => r.chain).filter((c) => c.late).length;

  const submitProposal = () => {
    const errs = { title: !title.trim(), team: !teamName.trim() };
    setFormErrors(errs);
    if (errs.title || errs.team) return;
    const seq = 1060 + projects.length;
    const newProject: NfProject = {
      id: `NF-1404-${seq}`,
      titleFa: title.trim(),
      titleEn: "—",
      macroField,
      field: "سایر",
      motherProject: "ثبت مستقیم در سامانه",
      team: { name: teamName.trim(), type: "تیم فناور", city: "—", manager: projectManager.trim() || teamName.trim(), members: 1 },
      rahbar: rahbar.trim() || "در حال تعیین",
      nazer: nazer.trim() || "در حال تعیین",
      fundManager: "مدیر صندوق نوآور",
      budget: budget.trim() ? `${budget.trim()} میلیون ریال` : "در انتظار ارزیابی",
      shareDaneshmand: 50,
      durationMonths: 0,
      contractNo: "—",
      stage: "دریافت پروپوزال",
      subStatus: "دریافت طرح، تخصیص کد یکتا و ایجاد شناسنامه — در انتظار بررسی مستندات",
      progress: 0,
      finance: { prepayment: "—", approvedByProgress: "—", paid: "۰", pending: "۰", retention: "۰", remaining: "—" },
      guarantees: [],
      gantt: [],
      reports: [],
      payments: [],
      timeline: [{ date: "امروز", time: "هم‌اکنون", step: "دریافت پروپوزال", text: "دریافت طرح، تخصیص کد یکتا و ایجاد شناسنامه پروژه" }],
      requests: [],
    };
    setProjects((prev) => [newProject, ...prev]);
    notify(`پروپوزال با کد یکتا «${newProject.id}» ثبت شد و شناسنامه پروژه ایجاد گردید. پس از تایید شکلی، ارزیابی اولیه هوشمند اجرا می‌شود.`);
    setOpen(false);
    setTitle("");
    setTeamName("");
    setBudget("");
  };

  const filtered = useMemo(
    () => (stageFilter === "همه" ? projects : projects.filter((p) => p.stage === stageFilter)),
    [projects, stageFilter]
  );

  const columns: Column<NfProject>[] = [
    { key: "id", label: "کد یکتا", render: (p) => <span className="font-mono text-[11px] font-medium text-ink-800" dir="ltr">{p.id}</span> },
    { key: "titleFa", label: "عنوان پروژه", render: (p) => <span className="font-medium text-ink-900">{p.titleFa}</span> },
    { key: "team", label: "مجری", render: (p) => <span>{p.team.name}</span> },
    { key: "stage", label: "گام اصلی", render: (p) => <Badge tone={nfStageTone[p.stage]}>{p.stage}</Badge> },
    {
      key: "progress",
      label: "پیشرفت تاییدشده",
      render: (p) => (
        <div className="flex items-center gap-2 min-w-[90px]">
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.progress}%` }} />
          </div>
          <span className="text-[11px] text-ink-500">{p.progress.toLocaleString("fa-IR")}٪</span>
        </div>
      ),
    },
    { key: "budget", label: "مبلغ" },
    {
      key: "actions",
      label: "",
      render: (p) => <RowActions onEdit={() => setSelected(p)} onDelete={() => deleteProject(p)} />,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="پروژه‌های صندوق نوآور" value={projects.length.toLocaleString("fa-IR")} tone="brand" icon={<Target size={16} />} />
        <StatCard label="در نظارت و راهبری" value={projects.filter((p) => p.stage === "نظارت و راهبری").length.toLocaleString("fa-IR")} tone="success" icon={<Gauge size={16} />} />
        <StatCard label="گزارش در انتظار بررسی" value={pendingReports.toLocaleString("fa-IR")} tone="warning" icon={<FileClock size={16} />} />
        <StatCard label="پرداخت در جریان" value={pendingPayments.toLocaleString("fa-IR")} tone="warning" icon={<Wallet size={16} />} />
      </div>

      {lateReviews > 0 && (
        <div className="card p-3.5 mb-4 bg-amber-50 border-amber-200 flex items-center gap-2.5 text-xs text-amber-800">
          <BellRing size={15} className="shrink-0" />
          اعلان سیستمی: {lateReviews.toLocaleString("fa-IR")} بررسی گزارش از مهلت {settings.reviewEscalationDays.toLocaleString("fa-IR")} روزه عبور کرده است — به بررسی‌کننده یادآوری ارسال شد. (هیچ گزارشی به‌صورت خودکار تایید نمی‌شود)
        </div>
      )}

      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <Workflow size={15} className="text-brand-600" /> گام‌های اصلی روند صندوق
          </h3>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
            ثبت پروپوزال جدید
          </Button>
        </div>
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
          {nfStages.map((s, i) => {
            const count = projects.filter((p) => p.stage === s).length;
            return (
              <button
                key={s}
                onClick={() => setStageFilter(stageFilter === s ? "همه" : s)}
                className={`flex-1 min-w-[110px] rounded-lg border p-2.5 text-right transition-colors ${
                  stageFilter === s ? "border-brand-500 bg-brand-50" : count > 0 ? "border-ink-200 bg-white hover:border-brand-300" : "border-ink-100 bg-ink-50/50"
                }`}
              >
                <p className="text-[10.5px] text-ink-400 mb-1">گام {(i + 1).toLocaleString("fa-IR")}</p>
                <p className="text-[12px] font-bold text-ink-900 leading-5">{s}</p>
                <p className="text-[11px] text-ink-500 mt-1">{count.toLocaleString("fa-IR")} پروژه</p>
              </button>
            );
          })}
          <div className="flex-1 min-w-[110px] rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-2.5 text-right">
            <p className="text-[10.5px] text-emerald-600 mb-1 flex items-center gap-1"><GitBranch size={11} /> مسیر ویژه</p>
            <p className="text-[12px] font-bold text-emerald-800 leading-5">مسیر سبز</p>
            <p className="text-[11px] text-emerald-600 mt-1">با دستور مدیرعامل / هیئت مدیره</p>
          </div>
        </div>
        {stageFilter !== "همه" && (
          <button onClick={() => setStageFilter("همه")} className="text-[11px] text-brand-600 font-medium mt-2 flex items-center gap-1">
            <ListFilter size={12} /> حذف فیلتر «{stageFilter}»
          </button>
        )}
      </div>

      <div className="mb-5">
        <DataTable
          columns={columns}
          rows={filtered}
          searchKeys={["id", "titleFa"]}
          searchPlaceholder="جستجو در کد یکتا یا عنوان پروژه…"
          onRowClick={(p) => setSelected(p)}
        />
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
          <BellRing size={15} className="text-brand-600" /> قواعد گردش کار سامانه‌ای صندوق
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nfRules(settings).map((r) => (
            <div key={r.title} className="card p-3.5">
              <p className="text-[12.5px] font-bold text-ink-900 mb-1">{r.title}</p>
              <p className="text-[11.5px] text-ink-500 leading-5">{r.text}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 mt-2">
          همه‌ی این اعداد از «پنل راهبری ← پارامترهای گردش کار» قابل تغییرند و بلافاصله همین‌جا اعمال می‌شوند.
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="ثبت پروپوزال جدید در صندوق نوآور"
        description="با ثبت، کد یکتا تخصیص می‌یابد و شناسنامه پروژه ایجاد می‌شود. پس از تایید شکلی، ارزیابی اولیه هوشمند (اجرای پرامپت ارزیابی) انجام و در صورت کسب حد نصاب، طرح به ارزیابی موشکافانه ارجاع می‌شود."
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان طرح (فارسی) <span className="text-rose-500">*</span></label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setFormErrors((p) => ({ ...p, title: false })); }} placeholder="مثلاً: سامانه پایش هوشمند زنجیره سرد" className={`input-field ${formErrors.title ? "input-error" : ""}`} />
            {formErrors.title && <p className="field-error">عنوان طرح الزامی است.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام تیم / شرکت مجری <span className="text-rose-500">*</span></label>
            <input value={teamName} onChange={(e) => { setTeamName(e.target.value); setFormErrors((p) => ({ ...p, team: false })); }} placeholder="مثلاً: تیم فناور آرتان" className={`input-field ${formErrors.team ? "input-error" : ""}`} />
            {formErrors.team && <p className="field-error">نام تیم مجری الزامی است.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">کلان محور</label>
              <select value={macroField} onChange={(e) => setMacroField(e.target.value)} className="input-field">
                <option>امنیت غذایی</option>
                <option>حمل و نقل ترکیبی</option>
                <option>صنایع بالادستی نفت و گاز</option>
                <option>صنعتی‌سازی ساختمان</option>
                <option>اقتصاد دیجیتال و هوش مصنوعی</option>
                <option>معدن و زنجیره ارزش فولاد</option>
                <option>سایر زمینه‌های فناوری</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">مبلغ پیشنهادی (میلیون ریال)</label>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="۲٬۵۰۰" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">راهبر (شتاب‌دهنده)</label>
              <input value={rahbar} onChange={(e) => setRahbar(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">ناظر</label>
              <input value={nazer} onChange={(e) => setNazer(e.target.value)} placeholder="در حال تعیین" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">مدیر پروژه</label>
              <input value={projectManager} onChange={(e) => setProjectManager(e.target.value)} placeholder="نماینده تیم" className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" icon={<Send size={14} />} onClick={submitProposal}>
              ثبت پروپوزال و تخصیص کد یکتا
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="پرونده پروژه صندوق نوآور">
        {selected && <NfProjectFile project={selected} onUpdate={updateProject} onDelete={deleteProject} />}
      </Drawer>
    </div>
  );
}

function NfProjectFile({ project: p, onUpdate, onDelete }: { project: NfProject; onUpdate: (p: NfProject) => void; onDelete: (p: NfProject) => void }) {
  const { notify } = useToast();
  const { settings } = useSettings();
  const [showAllCriteria, setShowAllCriteria] = useState(false);

  const changeStage = (stage: NfStage) => {
    const firstSub = nfSubStatuses[stage]?.[0] ?? "";
    onUpdate({
      ...p,
      stage,
      subStatus: firstSub,
      timeline: [...p.timeline, { date: "امروز", time: "هم‌اکنون", step: stage, text: `انتقال به گام «${stage}» — ${firstSub}` }],
    });
    notify(`پروژه ${p.id} به گام «${stage}» منتقل شد و در گام‌نما ثبت گردید.`);
  };

  const changeSubStatus = (sub: string) => {
    onUpdate({
      ...p,
      subStatus: sub,
      timeline: [...p.timeline, { date: "امروز", time: "هم‌اکنون", step: p.stage, text: `تغییر ریزوضعیت: ${sub}` }],
    });
    notify("ریزوضعیت به‌روزرسانی و در گام‌نما ثبت شد.");
  };

  const scores = screeningScores[p.id];
  const screeningTotal = scores ? scores.reduce((a, b) => a + b, 0) : nfEvaluations[p.id]?.screening.total;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 rounded px-1.5 py-0.5" dir="ltr">{p.id}</span>
          <Badge tone={nfStageTone[p.stage]}>{p.stage}</Badge>
          {p.greenPath && <Badge tone="success">مسیر سبز</Badge>}
        </div>
        <p className="text-sm font-bold text-ink-900 leading-6">{p.titleFa}</p>
        <p className="text-[11px] text-ink-400 mt-0.5" dir="ltr">{p.titleEn}</p>
        <div className="mt-2 p-2.5 rounded-lg bg-ink-50 space-y-2">
          <p className="text-[11.5px] text-ink-600 leading-5">
            <span className="font-medium text-ink-800">ریزوضعیت فعلی:</span> {p.subStatus}
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            <select
              value={p.stage}
              onChange={(e) => changeStage(e.target.value as NfStage)}
              className="text-[11px] border border-ink-200 rounded-md px-2 py-1.5 outline-none focus:border-brand-400 bg-white w-full"
            >
              {nfStages.map((s) => (
                <option key={s} value={s}>گام: {s}</option>
              ))}
            </select>
            <select
              value={nfSubStatuses[p.stage]?.includes(p.subStatus) ? p.subStatus : ""}
              onChange={(e) => e.target.value && changeSubStatus(e.target.value)}
              className="text-[11px] border border-ink-200 rounded-md px-2 py-1.5 outline-none focus:border-brand-400 bg-white w-full"
            >
              <option value="">تغییر ریزوضعیت این گام…</option>
              {(nfSubStatuses[p.stage] ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button onClick={() => onDelete(p)} className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1">
            حذف این پروژه از صندوق
          </button>
        </div>
      </div>

      <div className="border-t border-ink-100 pt-4">
        <h4 className="text-xs font-bold text-ink-900 mb-2">شناسنامه پروژه</h4>
        <div className="text-xs text-ink-600 space-y-1.5">
          <p><span className="text-ink-400">کلان محور:</span> {p.macroField} · <span className="text-ink-400">زمینه:</span> {p.field}</p>
          <p><span className="text-ink-400">پروژه مادر:</span> {p.motherProject}</p>
          <p><span className="text-ink-400">مجری:</span> {p.team.name} ({p.team.type} — {p.team.city}، {p.team.members.toLocaleString("fa-IR")} عضو)</p>
          <p><span className="text-ink-400">راهبر:</span> {p.rahbar}</p>
          <p><span className="text-ink-400">ناظر:</span> {p.nazer} · <span className="text-ink-400">مدیر صندوق:</span> {p.fundManager}</p>
          <p>
            <span className="text-ink-400">مبلغ:</span> {p.budget} · <span className="text-ink-400">سهم بنیاد:</span> {p.shareDaneshmand.toLocaleString("fa-IR")}٪
          </p>
          <p>
            <span className="text-ink-400">مدت:</span> {p.durationMonths > 0 ? `${p.durationMonths.toLocaleString("fa-IR")} ماه` : "—"} · <span className="text-ink-400">شماره قرارداد:</span> <span dir="ltr">{p.contractNo}</span>
          </p>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-ink-900">درصد پیشرفت تاییدشده</span>
            <span className="text-ink-500">{p.progress.toLocaleString("fa-IR")}٪</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.progress}%` }} />
          </div>
        </div>
      </div>

      {(scores || nfEvaluations[p.id]) && (
        <div className="border-t border-ink-100 pt-4">
          <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5"><Gauge size={13} className="text-ink-400" /> فرم‌های امتیازدهی ارزیابی</h4>
          {scores && screeningTotal !== undefined && (
            <div className="text-[11px] bg-ink-50 rounded-lg p-2.5 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-medium text-ink-800">غربالگری اولیه (۲۲ معیار)</p>
                <Badge tone={screeningTotal >= settings.screeningThreshold ? "success" : "danger"}>
                  {screeningTotal.toLocaleString("fa-IR")} از ۲۰۰ — حد نصاب {settings.screeningThreshold.toLocaleString("fa-IR")}
                </Badge>
              </div>
              <div className="space-y-1">
                {screeningCriteriaCatalog.slice(0, showAllCriteria ? 22 : 5).map((c, i) => (
                  <div key={c.title} className="flex items-center gap-2">
                    <span className="flex-1 text-ink-600 truncate">{c.title}</span>
                    <div className="w-20 h-1 rounded-full bg-ink-200/70 overflow-hidden shrink-0">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(scores[i] / c.max) * 100}%` }} />
                    </div>
                    <span className="text-ink-400 shrink-0 w-10 text-left" dir="ltr">{scores[i]}/{c.max}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowAllCriteria((v) => !v)} className="text-brand-600 font-medium mt-1.5">
                {showAllCriteria ? "نمایش خلاصه" : `نمایش هر ${(22).toLocaleString("fa-IR")} معیار`}
              </button>
            </div>
          )}
          {nfEvaluations[p.id]?.jury && (
            <div className="text-[11px] bg-ink-50 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-medium text-ink-800">ارزیابی داوری (۵ بُعد — با تعهد رازداری داور)</p>
                <Badge tone={nfEvaluations[p.id].jury!.total >= settings.juryThreshold ? "success" : "danger"}>
                  {nfEvaluations[p.id].jury!.total.toLocaleString("fa-IR")} از ۱۰۰ — حد نصاب {settings.juryThreshold.toLocaleString("fa-IR")}
                </Badge>
              </div>
              <div className="space-y-1">
                {nfEvaluations[p.id].jury!.dimensions.map((d) => (
                  <div key={d.title} className="flex items-center gap-2">
                    <span className="flex-1 text-ink-600">{d.title}</span>
                    <div className="w-20 h-1 rounded-full bg-ink-200/70 overflow-hidden shrink-0">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(d.score / d.max) * 100}%` }} />
                    </div>
                    <span className="text-ink-400 shrink-0 w-10 text-left" dir="ltr">{d.score}/{d.max}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-ink-100 pt-4">
        <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5"><Wallet size={13} className="text-ink-400" /> وضعیت مالی</h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {[
            ["پیش‌پرداخت", p.finance.prepayment],
            ["تاییدشده بر اساس پیشرفت", p.finance.approvedByProgress],
            ["پرداخت‌شده به مجری", p.finance.paid],
            ["در انتظار پرداخت", p.finance.pending],
            ["حسن انجام کار نزد مجری", p.finance.retention],
            ["باقی‌مانده", p.finance.remaining],
          ].map(([label, value]) => (
            <div key={label} className="bg-ink-50 rounded-lg p-2">
              <p className="text-ink-400">{label}</p>
              <p className="font-medium text-ink-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {p.gantt.length > 0 && (
        <div className="border-t border-ink-100 pt-4">
          <h4 className="text-xs font-bold text-ink-900 mb-2">گانت‌چارت و درصد وزنی فعالیت‌ها</h4>
          <div className="space-y-2">
            {p.gantt.map((g) => (
              <div key={g.title} className="text-[11px] bg-ink-50 rounded-lg p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="font-medium text-ink-800">{g.title}</p>
                  <Badge tone="neutral">وزن {g.weight.toLocaleString("fa-IR")}٪</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-ink-200/60 overflow-hidden">
                    <div className={`h-full rounded-full ${g.done === 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${g.done}%` }} />
                  </div>
                  <span className="text-ink-500 shrink-0">{g.done.toLocaleString("fa-IR")}٪</span>
                </div>
                <p className="text-ink-400 mt-1">{g.months} · هزینه گام: {g.cost}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-ink-100 pt-4">
        <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5"><FileClock size={13} className="text-ink-400" /> گزارش‌ها و زنجیره تایید</h4>
        {p.reports.length === 0 && <p className="text-xs text-ink-400">گزارشی ثبت نشده — سررسید گزارش‌ها طبق گانت‌چارت تعیین و یک هفته قبل یادآوری می‌شود.</p>}
        <div className="space-y-2">
          {p.reports.map((r) => (
            <div key={r.id} className="text-[11px] border border-ink-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-medium text-ink-800">{r.title}</p>
                <Badge tone={r.status === "تایید نهایی" ? "success" : r.status === "در حال بررسی" ? "warning" : r.status === "نیازمند اصلاح" ? "danger" : "neutral"}>{r.status}</Badge>
              </div>
              <p className="text-ink-400 mt-1">نوع: {r.type} · سررسید {r.due} · بارگذاری: {r.uploadedBy}{r.uploadedAt ? ` (${r.uploadedAt})` : ""}</p>
              {r.chain.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {r.chain.map((c) => (
                    <span key={c.role} className="flex items-center gap-1">
                      <Badge tone={chainStatusTone[c.status]}>
                        {c.role}: {c.status}
                      </Badge>
                      {c.late && <Badge tone="danger">عبور از مهلت ۱۵ روز</Badge>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-100 pt-4">
        <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5"><Landmark size={13} className="text-ink-400" /> پرداخت‌ها</h4>
        {p.payments.length === 0 && <p className="text-xs text-ink-400">پرداختی ثبت نشده است.</p>}
        <div className="space-y-2">
          {p.payments.map((pay) => (
            <div key={pay.id} className="text-[11px] bg-ink-50 rounded-lg p-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-medium text-ink-800">{pay.title}</p>
                <Badge tone={paymentTone[pay.status]}>{pay.status}</Badge>
              </div>
              <p className="text-ink-400 mt-1">
                {pay.type} · {pay.amount}
                {pay.orderedBy ? ` · دستور پرداخت: ${pay.orderedBy}` : ""}
                {pay.paidAt ? ` · واریز ${pay.paidAt}` : ""}
                {pay.docNo ? ` · ${pay.docNo}` : ""}
              </p>
              {pay.paidAt && <p className="text-emerald-600 mt-1">اطلاع‌رسانی سیستمی واریز به تمامی اعضای تیم ارسال شد.</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-100 pt-4">
        <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5"><ShieldCheck size={13} className="text-ink-400" /> تضامین</h4>
        {p.guarantees.length === 0 && <p className="text-xs text-ink-400">تضمینی ثبت نشده است.</p>}
        <div className="space-y-1.5">
          {p.guarantees.map((g) => (
            <div key={g.type} className="flex items-center justify-between text-[11px] border border-ink-100 rounded-lg p-2.5">
              <span className="text-ink-700">{g.type} — {g.amount}</span>
              <Badge tone={g.status === "دریافت‌شده" ? "success" : g.status === "آزادشده" ? "navy" : "warning"}>{g.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      {p.requests.length > 0 && (
        <div className="border-t border-ink-100 pt-4">
          <h4 className="text-xs font-bold text-ink-900 mb-2">درخواست‌های خارج از قرارداد</h4>
          <div className="space-y-2">
            {p.requests.map((rq) => (
              <div key={rq.id} className="text-[11px] border border-ink-100 rounded-lg p-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-ink-800">{rq.type}</p>
                  <Badge tone={rq.status.startsWith("تایید") ? "success" : rq.status === "رد شده" ? "danger" : "warning"}>{rq.status}</Badge>
                </div>
                <p className="text-ink-500 mt-1 leading-5">{rq.note}</p>
                <p className="text-ink-400 mt-1">{rq.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-ink-100 pt-4">
        <h4 className="text-xs font-bold text-ink-900 mb-2 flex items-center gap-1.5"><History size={13} className="text-ink-400" /> گام‌نما (تاریخچه کامل پروژه)</h4>
        <div className="space-y-0">
          {p.timeline.map((t, i) => (
            <div key={i} className="flex gap-2.5 text-[11px]">
              <div className="flex flex-col items-center">
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${i === p.timeline.length - 1 ? "bg-brand-500" : "bg-ink-300"}`} />
                {i < p.timeline.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
              </div>
              <div className="pb-3 min-w-0">
                <p className="text-ink-400">{t.date} · {t.time} · <span className="text-ink-500 font-medium">{t.step}</span></p>
                <p className="text-ink-700 leading-5 mt-0.5">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// طرح‌های اشتغال‌زایی (محتوای قبلی صفحه — بدون تغییر)
// ---------------------------------------------------------------------------
function EmploymentFundTab() {
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
        return d ? <span className="font-medium text-ink-800">{d.score.toLocaleString("fa-IR")} / ۱۰۰</span> : <span className="text-ink-400">—</span>;
      },
    },
    { key: "roi", label: "بازگشت سرمایه", render: (f) => <span className="flex items-center gap-1 text-emerald-600 font-medium"><TrendingUp size={12} /> {f.roi}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
          ثبت طرح جدید
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="سرمایه صندوق" value={fundOverview.totalCapital} tone="brand" icon={<Landmark size={16} />} />
        <StatCard label="تخصیص‌یافته" value={fundOverview.allocated} tone="success" icon={<PiggyBank size={16} />} />
        <StatCard label="طرح‌های فعال" value={funds.length.toLocaleString("fa-IR")} icon={<Target size={16} />} />
        <StatCard label="نرخ موفقیت طرح‌ها" value={fundOverview.successRate} tone="success" icon={<Gauge size={16} />} />
        <StatCard label="میانگین زمان داوری" value={`${fundOverview.avgReviewDays.toLocaleString("fa-IR")} روز`} tone="warning" icon={<CalendarClock size={16} />} />
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
              همه ({funds.length.toLocaleString("fa-IR")})
            </button>
            {stages.map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
                  stageFilter === s ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
                }`}
              >
                {s} ({funds.filter((f) => f.stage === s).length.toLocaleString("fa-IR")})
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
                <Badge tone="brand">{rv.items.toLocaleString("fa-IR")} طرح در دستور</Badge>
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
                    <span className="text-ink-500">{selectedDetail.score.toLocaleString("fa-IR")} از ۱۰۰</span>
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
