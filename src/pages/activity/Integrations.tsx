// تب «اتصال ابزارها»: GitLab، GitHub، Jira، Clockify، Toggl و تقویم گوگل — اتصال شبیه‌سازی‌شده
// (OAuth/توکن)، جدول نگاشت پروژه‌ی بیرونی ← پروژه‌ی موتوشاب، همگام‌سازی و صندوق بررسیِ
// ورودی‌های واردشده (پذیرش/ویرایش/رد، تشخیص تکراری).
import { useState } from "react";
import { CheckCheck, Inbox, KeyRound, Link2, Plus, RefreshCw, Settings2, ShieldCheck, Trash2, Unlink, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { fa, nowClock } from "../../pm/jalali";
import { defaultRule, integrationKinds, sourceLabel, type EstimateRule, type Integration, type IntegrationKind, type ProjectMapping, type TimeEntry } from "../../timesheet/types";
import { simulateSync, useTs } from "./lib";
import { SourceIcon } from "./ui";
import { EntryLine } from "./MyTimesheet";
import EntryModal from "./EntryModal";

const info: Record<IntegrationKind, { desc: string; server: string; oauth: boolean; tokenLabel: string }> = {
  gitlab: { desc: "زمان ثبت‌شده با ‎/spend‎ در issueها (time_stats) و درخواست‌های ادغام", server: "https://gitlab.com", oauth: false, tokenLabel: "Personal Access Token (read_api)" },
  github: { desc: "کامیت‌ها، PRها و بازبینی‌ها ← زمان تخمینی با قاعده‌ی شما", server: "https://api.github.com", oauth: true, tokenLabel: "توکن دسترسی (repo:read)" },
  jira: { desc: "worklogهای ثبت‌شده روی issueها", server: "https://your-org.atlassian.net", oauth: false, tokenLabel: "API Token" },
  clockify: { desc: "time entryهای Clockify با نام پروژه", server: "https://api.clockify.me", oauth: false, tokenLabel: "API Key" },
  toggl: { desc: "time entryهای Toggl Track", server: "https://api.track.toggl.com", oauth: false, tokenLabel: "API Token" },
  calendar: { desc: "جلسات تقویم ← زمان کار با عنوان جلسه", server: "https://www.googleapis.com/calendar", oauth: true, tokenLabel: "OAuth" },
};

export default function Integrations() {
  const { ts, ten, pm, me, myProjects, projectName, projectColor, taskTitle } = useTs();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canConnect = ten.hasPermission("timesheet.integrations");
  const canLog = ten.hasPermission("timesheet.log");
  const [edit, setEdit] = useState<{ kind: IntegrationKind; existing?: Integration } | null>(null);
  const [syncing, setSyncing] = useState<IntegrationKind | null>(null);
  const [entry, setEntry] = useState<TimeEntry | null>(null);
  const [filter, setFilter] = useState<IntegrationKind | "all">("all");

  const pending = ts.entries.filter((e) => e.personId === me.id && e.review === "pending").sort((a, b) => b.date.localeCompare(a.date));
  const shown = filter === "all" ? pending : pending.filter((e) => e.source === filter);
  const ctx = { projectName, projectColor, taskTitle };

  const sync = (integ: Integration) => {
    setSyncing(integ.kind);
    setTimeout(() => {
      const r = simulateSync(integ, me, pm.projects, ts.entries, ts.settings, ts.today);
      ts.ensurePerson(me);
      ts.addEntries(r.entries);
      ts.saveIntegration({ ...integ, lastSync: `${ts.today} ${nowClock()}`, syncCount: integ.syncCount + 1 });
      setSyncing(null);
      if (!r.entries.length) notify(`${sourceLabel[integ.kind]}: مورد جدیدی نبود${r.skipped ? ` (${fa(r.skipped)} مورد قبلاً وارد شده بود)` : ""}.`, "info");
      else
        notify(
          `${sourceLabel[integ.kind]}: ${fa(r.entries.length)} ثبت جدید برای بررسی${r.duplicates ? ` — ${fa(r.duplicates)} مورد احتمالاً تکراری` : ""}${r.skipped ? ` · ${fa(r.skipped)} مورد قبلاً وارد شده` : ""}.`,
          r.duplicates ? "warning" : "success",
        );
    }, 700);
  };

  const review = (ids: string[], ok: boolean) => {
    ts.reviewEntries(ids, ok);
    notify(ok ? `${fa(ids.length)} ثبت پذیرفته شد و در کارکرد حساب می‌شود.` : `${fa(ids.length)} ثبت رد شد.`, ok ? "success" : "info");
  };

  return (
    <div className="space-y-5">
      {/* صندوق بررسی */}
      <div className="card">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-ink-100 flex-wrap">
          <Inbox size={15} className="text-ink-500" />
          <p className="text-[13px] font-bold text-ink-800">منتظر بررسی</p>
          <Badge tone={pending.length ? "warning" : "success"}>{fa(pending.length)}</Badge>
          <div className="flex-1" />
          {pending.length > 0 && (
            <select className="input-field !w-auto !py-1 text-xs" value={filter} onChange={(e) => setFilter(e.target.value as IntegrationKind | "all")} aria-label="فیلتر منبع">
              <option value="all">همه‌ی منابع</option>
              {integrationKinds.filter((k) => pending.some((e) => e.source === k)).map((k) => (
                <option key={k} value={k}>
                  {sourceLabel[k]}
                </option>
              ))}
            </select>
          )}
          {shown.length > 0 && canLog && (
            <>
              <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => confirm({ title: `رد ${fa(shown.length)} ثبت؟`, confirmLabel: "رد همه", onConfirm: () => review(shown.map((e) => e.id), false) })}>
                رد همه
              </Button>
              <Button size="sm" variant="primary" icon={<CheckCheck size={13} />} onClick={() => review(shown.filter((e) => !e.duplicateOf).map((e) => e.id), true)} disabled={!shown.some((e) => !e.duplicateOf)}>
                پذیرش همه
              </Button>
            </>
          )}
        </div>
        {shown.length ? (
          <div className="p-2 space-y-1">
            {shown.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <span className="text-[11px] text-ink-400 w-16 shrink-0 text-center">{e.date.slice(5)}</span>
                <div className="flex-1 min-w-0">
                  <EntryLine e={e} ctx={ctx} canEdit={canLog} onEdit={setEntry} onReview={(x, ok) => review([x.id], ok)} />
                </div>
              </div>
            ))}
            {shown.some((e) => e.duplicateOf) && <p className="text-[11px] text-rose-600 px-2 pt-1">«تکراری؟» یعنی برای همان روز، همان تسک و همان منبع قبلاً ثبتی دارید؛ «پذیرش همه» این‌ها را کنار می‌گذارد.</p>}
          </div>
        ) : (
          <p className="text-xs text-ink-400 text-center py-6">ثبتی منتظر بررسی نیست. پس از همگام‌سازی، موارد جدید این‌جا می‌آیند.</p>
        )}
      </div>

      {/* کارت ابزارها */}
      {!canConnect ? (
        <EmptyState icon={<ShieldCheck size={22} />} title="اتصال ابزارها برای نقش شما فعال نیست" description="مجوز «اتصال ابزارهای بیرونی» را از مدیر واحد بخواهید." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrationKinds.map((k) => {
            const integ = ts.integrationOf(me.id, k);
            const unmapped = integ?.mappings.filter((m) => !m.projectId).length ?? 0;
            return (
              <div key={k} className="card p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <SourceIcon source={k} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-ink-900 flex items-center gap-2">
                      {sourceLabel[k]}
                      {integ ? <Badge tone="success">متصل</Badge> : <Badge>متصل نیست</Badge>}
                    </p>
                    <p className="text-[11px] text-ink-500 mt-0.5 leading-5">{info[k].desc}</p>
                  </div>
                </div>
                {integ && (
                  <div className="text-[11px] text-ink-500 space-y-0.5">
                    <p className="truncate">
                      <span dir="ltr">{integ.username}</span> · <span dir="ltr">{integ.serverUrl.replace(/^https?:\/\//, "")}</span>
                    </p>
                    <p>آخرین همگام‌سازی: {integ.lastSync ?? "هنوز انجام نشده"}</p>
                    <p>
                      {fa(integ.mappings.length)} نگاشت پروژه{unmapped ? <span className="text-amber-700"> · {fa(unmapped)} نگاشت‌نشده</span> : null}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-auto flex-wrap">
                  {integ ? (
                    <>
                      <Button size="sm" variant="primary" icon={<RefreshCw size={13} className={syncing === k ? "animate-spin" : ""} />} onClick={() => sync(integ)} disabled={!!syncing}>
                        {syncing === k ? "در حال همگام‌سازی…" : "همگام‌سازی"}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Settings2 size={13} />} onClick={() => setEdit({ kind: k, existing: integ })}>
                        تنظیمات
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Unlink size={13} />}
                        onClick={() =>
                          confirm({
                            title: `قطع اتصال ${sourceLabel[k]}؟`,
                            message: "ثبت‌های واردشده‌ی قبلی باقی می‌مانند؛ فقط همگام‌سازی متوقف می‌شود و توکن حذف می‌شود.",
                            confirmLabel: "قطع اتصال",
                            onConfirm: () => (ts.disconnect(me.id, k), notify(`اتصال ${sourceLabel[k]} قطع شد.`, "info")),
                          })
                        }
                      >
                        قطع
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" icon={<Link2 size={13} />} onClick={() => setEdit({ kind: k })}>
                      اتصال
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <ConnectModal
          kind={edit.kind}
          existing={edit.existing}
          projects={myProjects}
          onClose={() => setEdit(null)}
          onSave={(i) => {
            ts.ensurePerson(me);
            ts.saveIntegration({ ...i, personId: me.id });
            notify(edit.existing ? "تنظیمات اتصال ذخیره شد." : `${sourceLabel[edit.kind]} متصل شد. برای دریافت داده «همگام‌سازی» را بزنید.`);
            setEdit(null);
          }}
        />
      )}

      <EntryModal
        open={!!entry}
        onClose={() => setEntry(null)}
        entry={entry}
        defaultDate={entry?.date ?? ts.today}
        projects={myProjects}
        readOnly={!canLog}
        onSave={(d) => {
          if (!entry) return;
          ts.updateEntry(entry.id, { ...d, review: "accepted", duplicateOf: undefined });
          notify("ثبت ویرایش و پذیرفته شد.");
          setEntry(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- پنجره‌ی اتصال و نگاشت
function ConnectModal({
  kind,
  existing,
  projects,
  onClose,
  onSave,
}: {
  kind: IntegrationKind;
  existing?: Integration;
  projects: ReturnType<typeof useTs>["myProjects"];
  onClose: () => void;
  onSave: (i: Integration) => void;
}) {
  const { ts } = useTs();
  const [server, setServer] = useState(existing?.serverUrl ?? info[kind].server);
  const [username, setUsername] = useState(existing?.username ?? "");
  const [token, setToken] = useState("");
  const [authing, setAuthing] = useState(false);
  const [mappings, setMappings] = useState<ProjectMapping[]>(existing?.mappings ?? [{ external: "", projectId: "" }]);
  const [rule, setRule] = useState<EstimateRule>(existing?.rule ?? defaultRule);
  const [err, setErr] = useState("");
  const estimates = kind === "github" || kind === "gitlab";

  const oauth = () => {
    setAuthing(true);
    setTimeout(() => {
      setToken(`oauth-${Math.random().toString(36).slice(2, 14)}`);
      if (!username) setUsername(kind === "calendar" ? "me@bonyad.ir" : "my-account");
      setAuthing(false);
    }, 900);
  };

  const save = () => {
    if (!/^https?:\/\/\S+$/.test(server.trim())) return setErr("نشانی سرور معتبر نیست (با https:// شروع شود).");
    if (!username.trim()) return setErr("نام کاربری در این ابزار را وارد کنید.");
    if (!existing && token.trim().length < 6) return setErr("توکن دسترسی را وارد کنید یا «ورود با حساب» را بزنید.");
    onSave({
      personId: existing?.personId ?? "",
      kind,
      serverUrl: server.trim(),
      username: username.trim(),
      tokenHint: token.trim() ? token.trim().slice(-4) : existing?.tokenHint ?? "",
      connectedAt: existing?.connectedAt ?? `${ts.today} ${nowClock()}`,
      lastSync: existing?.lastSync,
      syncCount: existing?.syncCount ?? 0,
      mappings: mappings.filter((m) => m.external.trim()).map((m) => ({ external: m.external.trim(), projectId: m.projectId })),
      rule,
    });
  };

  return (
    <Modal open onClose={onClose} title={`${existing ? "تنظیمات" : "اتصال"} ${sourceLabel[kind]}`} description={info[kind].desc} width="max-w-xl">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs text-ink-600">
            نشانی سرور
            <input className="input-field mt-1" dir="ltr" value={server} onChange={(e) => setServer(e.target.value)} />
          </label>
          <label className="block text-xs text-ink-600">
            نام کاربری در {sourceLabel[kind]}
            <input className="input-field mt-1" dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          </label>
        </div>
        <div>
          <label className="block text-xs text-ink-600">
            {info[kind].tokenLabel}
            {existing && <span className="text-ink-400"> — فعلی: ••••{existing.tokenHint} (برای تغییر، توکن جدید وارد کنید)</span>}
            <div className="flex gap-2 mt-1">
              <input className="input-field flex-1" dir="ltr" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="••••••••" autoComplete="off" />
              {info[kind].oauth && (
                <Button type="button" icon={<KeyRound size={13} />} onClick={oauth} disabled={authing}>
                  {authing ? "در حال ورود…" : "ورود با حساب"}
                </Button>
              )}
            </div>
          </label>
          <p className="text-[11px] text-ink-400 mt-1">توکن رمزنگاری‌شده نگه داشته می‌شود و فقط چهار نویسه‌ی آخرش نمایش داده می‌شود (نمونه‌ی نمایشی — به سرور واقعی وصل نمی‌شود).</p>
        </div>

        <div>
          <p className="text-xs font-bold text-ink-700 mb-1.5">نگاشت پروژه‌ها</p>
          <p className="text-[11px] text-ink-400 mb-2">{kind === "jira" ? "کلید پروژه‌ی Jira (مثل KMS)" : kind === "calendar" ? "نام تقویم یا عنوان جلسه‌ی تکرارشونده" : "نام مخزن یا پروژه (مثل bonyad/km-portal)"} ← پروژه‌ی موتوشاب. ورودیِ نگاشت‌نشده بدون پروژه وارد می‌شود.</p>
          <div className="space-y-2">
            {mappings.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input className="input-field" dir="ltr" value={m.external} placeholder={kind === "jira" ? "KMS" : "group/project"} onChange={(e) => setMappings(mappings.map((x, j) => (j === i ? { ...x, external: e.target.value } : x)))} />
                <select className="input-field" value={m.projectId} onChange={(e) => setMappings(mappings.map((x, j) => (j === i ? { ...x, projectId: e.target.value } : x)))}>
                  <option value="">— نگاشت نشده —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button onClick={() => setMappings(mappings.filter((_, j) => j !== i))} className="p-1.5 rounded-md text-ink-400 hover:text-rose-600" aria-label="حذف نگاشت">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setMappings([...mappings, { external: "", projectId: "" }])} className="mt-2 text-xs text-brand-700 flex items-center gap-1">
            <Plus size={13} /> افزودن نگاشت
          </button>
        </div>

        {estimates && (
          <div>
            <p className="text-xs font-bold text-ink-700 mb-1.5">{kind === "github" ? "قاعده‌ی تبدیل فعالیت به زمان" : "زمان تخمینی درخواست ادغام"}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  ["commitMinutes", "دقیقه برای هر کامیت"],
                  ["prMinutes", "دقیقه برای هر PR/MR"],
                  ["reviewMinutes", "دقیقه برای هر بازبینی"],
                  ["maxPerDay", "سقف ساعت در روز"],
                ] as const
              )
                .filter(([key]) => kind === "github" || key === "prMinutes")
                .map(([key, label]) => (
                  <label key={key} className="block text-[11px] text-ink-600">
                    {label}
                    <input type="number" min={0} className="input-field mt-1" value={rule[key]} onChange={(e) => setRule({ ...rule, [key]: Math.max(0, Number(e.target.value) || 0) })} />
                  </label>
                ))}
            </div>
            {kind === "gitlab" && <p className="text-[11px] text-ink-400 mt-1">زمانِ ‎/spend‎ در issueها دقیقاً همان مقدار ثبت‌شده وارد می‌شود.</p>}
          </div>
        )}

        {err && <p className="text-xs text-rose-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button variant="primary" onClick={save} icon={<Link2 size={14} />}>
            {existing ? "ذخیره" : "اتصال"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
