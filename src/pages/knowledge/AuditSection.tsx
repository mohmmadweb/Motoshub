// ---------------------------------------------------------------------------
// بند ۸ و ۱۱ (و ۲۷): لاگ ممیزی کامل مدیریت دانش — چه کسی، چه زمانی، چه کاری روی
// کدام سند انجام داده؛ با فیلتر کاربر/اقدام/سند/تاریخ/سطح دسترسی و خروجی CSV.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { ScrollText, Download, X, ShieldAlert } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, accessTone } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import { downloadCsv, matchesAll, queryTerms } from "../../km/text";
import { accessLevels, logCodeLabel, type KLog, type KLogCode } from "../../km/types";
import { SectionHead } from "./shared";
import { useKPage } from "./ctx";

/** کد اقدام برای لاگ‌های قدیمی که کد ندارند */
export function codeOf(l: KLog): KLogCode {
  if (l.code) return l.code;
  const a = l.action;
  if (a.includes("دانلود")) return "download";
  if (a.includes("مشاهده")) return "view";
  if (a.includes("حذف")) return "delete";
  if (a.includes("بازیابی")) return "restore";
  if (a.includes("آرشیو")) return "archive";
  if (a.includes("نسخه")) return "version";
  if (a.includes("گردش کار") || a.includes("ارجاع") || a.includes("تأیید")) return "workflow";
  if (a.includes("ثبت")) return "create";
  if (a.includes("ویرایش")) return "edit";
  return "other";
}

const tone: Partial<Record<KLogCode, "brand" | "warning" | "danger" | "success" | "neutral" | "navy">> = {
  download: "warning",
  preview: "brand",
  delete: "danger",
  access: "danger",
  archive: "navy",
  restore: "success",
  workflow: "brand",
  create: "success",
};

export default function AuditSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  const [actor, setActor] = useState("");
  const [code, setCode] = useState<KLogCode | "">("");
  const [target, setTarget] = useState(page.focus ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [level, setLevel] = useState("");
  const [limit, setLimit] = useState(60);
  const allowed = hasPermission("knowledge.audit") || hasPermission("knowledge.settings") || hasPermission("knowledge.reports");

  const actors = useMemo(() => [...new Set(km.logs.map((l) => l.actor))].sort((a, b) => a.localeCompare(b, "fa")), [km.logs]);
  const list = useMemo(() => {
    const tq = queryTerms(target);
    const fd = from ? dayNum(from) ?? 0 : 0;
    const td = to ? dayNum(to) ?? 9e9 : 9e9;
    return km.logs.filter((l) => {
      if (actor && l.actor !== actor) return false;
      if (code && codeOf(l) !== code) return false;
      if (level && l.access !== level) return false;
      if (target && l.entity.id !== target && !matchesAll(`${l.entity.title} ${l.entity.id}`, tq)) return false;
      const day = dayNum(l.at.split(" ")[0]) ?? 0;
      return day >= fd && day <= td;
    });
  }, [km.logs, actor, code, target, from, to, level]);

  if (!allowed) return <p className="card p-6 text-sm text-ink-500 text-center">لاگ ممیزی دانش فقط برای راهبران و ممیزان قابل مشاهده است.</p>;

  const active = [actor, code, target, from, to, level].filter(Boolean).length;
  const sensitive = list.filter((l) => (l.access === "محرمانه" || l.access === "خیلی محرمانه") && ["view", "preview", "download"].includes(codeOf(l))).length;
  const exportCsv = () =>
    downloadCsv("knowledge-audit-log.csv", [
      ["زمان", "کاربر", "اقدام", "نوع اقدام", "نوع موجودیت", "شناسه", "عنوان", "سطح دسترسی", "جزئیات"],
      ...list.map((l) => [l.at, l.actor, l.action, logCodeLabel[codeOf(l)], l.entity.type, l.entity.id, l.entity.title, l.access ?? "", l.detail ?? ""]),
    ]);

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<ScrollText size={17} className="text-brand-600" />}
        title="لاگ ممیزی دانش"
        hint="همه‌ی عملیات مهم: مشاهده، پیش‌نمایش، دانلود، ایجاد، ویرایش، تغییر دسترسی، گردش کار، آرشیو و بازیابی. لاگ تغییرناپذیر است و برای ممیزی امنیتی قابل ارائه است."
        action={
          <Button variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>
            خروجی CSV ({fa(list.length)})
          </Button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="رویدادها" value={fa(list.length)} tone="brand" />
        <StatCard label="کاربران" value={fa(new Set(list.map((l) => l.actor)).size)} tone="success" />
        <StatCard label="دسترسی به اسناد محرمانه" value={fa(sensitive)} tone={sensitive ? "warning" : "success"} icon={<ShieldAlert size={16} />} />
      </div>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <select className="input-field !py-1.5 !text-xs" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="کاربر">
          <option value="">همه‌ی کاربران</option>
          {actors.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select className="input-field !py-1.5 !text-xs" value={code} onChange={(e) => setCode(e.target.value as KLogCode | "")} aria-label="اقدام">
          <option value="">همه‌ی اقدام‌ها</option>
          {(Object.keys(logCodeLabel) as KLogCode[]).map((c) => (
            <option key={c} value={c}>
              {logCodeLabel[c]}
            </option>
          ))}
        </select>
        <input className="input-field !py-1.5 !text-xs" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="سند (عنوان یا شناسه)" list="audit-docs" />
        <datalist id="audit-docs">
          {km.docs.map((d) => (
            <option key={d.id} value={d.title} />
          ))}
        </datalist>
        <select className="input-field !py-1.5 !text-xs" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="سطح دسترسی">
          <option value="">همه‌ی سطوح</option>
          {accessLevels.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <input className="input-field !py-1.5 !text-xs" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="از ۱۴۰۵/۰۳/۰۱" />
        <input className="input-field !py-1.5 !text-xs" value={to} onChange={(e) => setTo(e.target.value)} placeholder="تا ۱۴۰۵/۰۳/۰۸" />
        {active > 0 && (
          <button onClick={() => { setActor(""); setCode(""); setTarget(""); setFrom(""); setTo(""); setLevel(""); }} className="text-xs text-brand-700 hover:underline flex items-center gap-1 col-span-2 md:col-span-1">
            <X size={12} /> پاک‌کردن فیلترها
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead>
            <tr className="text-ink-400 border-b border-ink-100 text-right bg-ink-50/60">
              <th className="p-2.5 font-medium">زمان</th>
              <th className="p-2.5 font-medium">کاربر</th>
              <th className="p-2.5 font-medium">اقدام</th>
              <th className="p-2.5 font-medium">موجودیت</th>
              <th className="p-2.5 font-medium">دسترسی</th>
              <th className="p-2.5 font-medium">جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map((l) => {
              const c = codeOf(l);
              return (
                <tr key={l.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                  <td className="p-2.5 text-ink-500 whitespace-nowrap">{l.at}</td>
                  <td className="p-2.5 text-ink-800 whitespace-nowrap">{l.actor}</td>
                  <td className="p-2.5">
                    <Badge tone={tone[c] ?? "neutral"}>{logCodeLabel[c]}</Badge>
                    <p className="text-[10.5px] text-ink-400 mt-0.5">{l.action}</p>
                  </td>
                  <td className="p-2.5 max-w-[260px]">
                    {l.entity.type === "doc" && km.docs.some((d) => d.id === l.entity.id) ? (
                      <button onClick={() => page.openDoc(l.entity.id)} className="text-ink-800 hover:text-brand-700 truncate block max-w-full text-right">
                        {l.entity.title}
                      </button>
                    ) : (
                      <span className="text-ink-700 truncate block">{l.entity.title}</span>
                    )}
                  </td>
                  <td className="p-2.5">{l.access ? <Badge tone={accessTone[l.access]}>{l.access}</Badge> : <span className="text-ink-300">—</span>}</td>
                  <td className="p-2.5 text-ink-500 max-w-[220px] truncate" title={l.detail}>
                    {l.detail ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="text-center text-xs text-ink-400 py-10">رویدادی با این فیلترها نیست.</p>}
        {list.length > limit && (
          <div className="p-3 text-center border-t border-ink-100">
            <Button size="sm" variant="ghost" onClick={() => setLimit((n) => n + 100)}>
              نمایش بیشتر ({fa(list.length - limit)} مورد دیگر)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
