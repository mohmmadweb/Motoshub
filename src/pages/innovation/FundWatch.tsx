// ---------------------------------------------------------------------------
// پایش صندوق: هشدار «پروژه‌ی خوابیده» (بر اساس آخرین رویداد ثبت‌شده‌ی هر طرح
// تأمین‌مالی‌شده) + تنظیمات صندوق (آستانه‌ی خواب و آستانه‌ی اختلاف داوران).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Settings2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useInnovation } from "../../context/InnovationContext";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_FUND_SETTINGS, dormantFunded, parseNum, type DormantItem } from "../../innovation/extras";
import { faN } from "../../innovation/util";
import { Field } from "./shared";

/** آستانه‌ی مؤثر خواب: تنظیم صندوق، وگرنه پارامتر سراسری گردش کار */
export function useDormantThreshold() {
  const inn = useInnovation();
  const { settings } = useSettings();
  return inn.fundSettings?.dormantDays ?? settings.dormantProjectDays;
}

export function useDormantProjects(kind?: DormantItem["kind"]): DormantItem[] {
  const inn = useInnovation();
  const { filterScoped } = useTenancy();
  const threshold = useDormantThreshold();
  return dormantFunded(inn, inn.today, threshold, { nf: filterScoped(inn.nfProjects), employment: filterScoped(inn.employment) }).filter((d) => !kind || d.kind === kind);
}

export function DormantAlert({ kind, onOpen }: { kind?: DormantItem["kind"]; onOpen?: (id: string) => void }) {
  const items = useDormantProjects(kind);
  const threshold = useDormantThreshold();
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const list = all ? items : items.slice(0, 3);
  return (
    <div className="card p-3.5 mb-4 border-amber-200 bg-amber-50/60">
      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
        <Moon size={14} className="shrink-0" /> پروژه‌ی خوابیده — {faN(items.length)} طرح بیش از {faN(threshold)} روز بدون رویداد ثبت‌شده
      </p>
      <div className="space-y-1">
        {list.map((d) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink-800">{d.title}</span>
                <span className="block truncate text-[10.5px] text-ink-500">آخرین رویداد: {d.lastAt ?? "—"} · {d.lastText}</span>
              </span>
              <Badge tone={d.days >= threshold * 2 ? "danger" : "warning"}>{d.days >= 9999 ? "بدون رویداد" : `${faN(d.days)} روز`}</Badge>
            </>
          );
          return onOpen ? (
            <button key={d.id} type="button" onClick={() => onOpen(d.id)} className="w-full flex items-center gap-2 text-xs text-right hover:bg-amber-100/60 rounded-md px-2 py-1">{body}</button>
          ) : (
            <Link key={d.id} to={d.link} className="w-full flex items-center gap-2 text-xs hover:bg-amber-100/60 rounded-md px-2 py-1">{body}</Link>
          );
        })}
      </div>
      {items.length > 3 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="text-[11px] text-amber-800 font-medium mt-1.5 px-2">
          {all ? "نمایش کمتر" : `نمایش همه (${faN(items.length)})`}
        </button>
      )}
    </div>
  );
}

export function FundSettingsButton() {
  const inn = useInnovation();
  const { settings } = useSettings();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const cur = inn.fundSettings ?? DEFAULT_FUND_SETTINGS;
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("");
  const [pct, setPct] = useState("");
  if (!(hasPermission("funds.allocate") || hasPermission("funds.monitor") || hasPermission("settings.system"))) return null;
  return (
    <>
      <Button size="sm" variant="ghost" icon={<Settings2 size={13} />} onClick={() => { setDays(cur.dormantDays !== undefined ? faN(cur.dormantDays) : ""); setPct(faN(cur.disagreementPct)); setOpen(true); }}>
        تنظیمات صندوق
      </Button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="تنظیمات صندوق" description="آستانه‌های هشدار مخصوص صندوق نوآوری">
          <div className="space-y-3">
            <Field label="آستانه‌ی پروژه‌ی خوابیده (روز)" hint={`خالی = پارامتر سراسری گردش کار (${faN(settings.dormantProjectDays)} روز)`}>
              <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className="input-field" placeholder={faN(settings.dormantProjectDays)} />
            </Field>
            <Field label="آستانه‌ی اختلاف داوران (٪ سقف معیار)" hint="انحراف معیار نمره‌ها از این درصدِ سقف هر معیار بیشتر شود، خانه قرمز می‌شود">
              <input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="numeric" className="input-field" />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1 justify-center"
                onClick={() => {
                  const d = days.trim() ? Math.max(1, Math.round(parseNum(days))) : undefined;
                  const p = Math.min(100, Math.max(1, Math.round(parseNum(pct)) || DEFAULT_FUND_SETTINGS.disagreementPct));
                  inn.commit("funds", "تنظیمات صندوق را تغییر داد", undefined, (s) => ({ ...s, fundSettings: { dormantDays: d, disagreementPct: p } }));
                  notify("تنظیمات صندوق ذخیره شد.", "success");
                  setOpen(false);
                }}
              >
                ذخیره
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function DormantBadge({ id }: { id: string }) {
  const items = useDormantProjects();
  const d = items.find((x) => x.id === id);
  if (!d) return null;
  return <Badge tone="warning" icon={<Moon size={10} />}>خوابیده</Badge>;
}
