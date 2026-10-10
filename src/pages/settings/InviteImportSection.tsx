// ---------------------------------------------------------------------------
// «اعضا ← دعوت و واردسازی» — جایگزین بخش قدیمی «واردسازی و دعوت کاربران» (Admin ← users):
// آمار کاربران، دعوت فردی به یک واحد (با عنوان شغلی و نقش پیشنهادی) و واردسازی دسته‌ای اکسل/CSV
// با فایل نمونه. تخصیص نقش به کاربران موجود در «تخصیص نقش» است (مدل جدید واحد/نقش/بازه).
// دعوت‌ها: motoshub.invites.v1
// ---------------------------------------------------------------------------
import { useMemo, useRef, useState } from "react";
import { Download, MailPlus, RefreshCw, Send, Upload, UserPlus, Users, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { createLocalStore, useLocalStore } from "../../iam/store";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { nowClock } from "../../pm/jalali";
import { Callout, Field, ScopeName, ScopeSelect, SectionHead, fmtN, useSubtree } from "./iam/shared";

type Invite = { id: string; name: string; contact: string; scopeId: string; title?: string; roleId?: string; at: string; by: string; status: "pending" | "cancelled" };
const inviteStore = createLocalStore<Invite[]>("motoshub.invites.v1", () => [], (raw) => (Array.isArray(raw) ? (raw as Invite[]) : null));

const MOBILE = /^(\+98|0)?9\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteImportSection() {
  const t = useTenancy();
  const sub = useSubtree();
  const { notify } = useToast();
  const confirm = useConfirm();
  const invites = useLocalStore(inviteStore);
  const fileRef = useRef<HTMLInputElement>(null);
  const canInvite = t.hasPermission("users.create") || t.hasPermission("iam.members.manage");
  const canImport = t.hasPermission("users.import");

  const scopes = useMemo(() => sub.nodes.filter((n) => n.active && (t.canAdmin(n.id, "iam.members.manage") || t.canAdmin(n.id, "users.create"))), [sub, t]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [scopeId, setScopeId] = useState(scopes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [roleId, setRoleId] = useState("");
  const roles = useMemo(() => (scopeId ? t.assignableRoles(scopeId) : []), [t, scopeId]);

  const mine = invites.filter((i) => sub.ids.has(i.scopeId));
  const pending = mine.filter((i) => i.status === "pending");
  const members = new Set(t.iam.memberships.filter((m) => sub.ids.has(m.scopeId)).map((m) => m.userId));
  const activeMembers = new Set(t.iam.memberships.filter((m) => sub.ids.has(m.scopeId) && m.status === "active").map((m) => m.userId));

  const send = () => {
    const c = contact.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    if (!name.trim()) return notify("نام دعوت‌شونده را بنویسید.", "warning");
    if (!MOBILE.test(c) && !EMAIL.test(c)) return notify("شماره موبایل یا رایانامه‌ی معتبر وارد کنید.", "warning");
    if (!scopeId) return notify("واحد مقصد را انتخاب کنید.", "warning");
    if (pending.some((i) => i.contact === c && i.scopeId === scopeId)) return notify("برای این مخاطب در همین واحد دعوت باز وجود دارد.", "warning");
    const inv: Invite = { id: `inv-${Date.now()}`, name: name.trim(), contact: c, scopeId, title: title.trim() || undefined, roleId: roleId || undefined, at: `${t.today} ${nowClock()}`, by: t.actingUser.name, status: "pending" };
    inviteStore.set((prev) => [inv, ...prev]);
    emitSettingsChange({ area: "دعوت کاربران", summary: `دعوت «${inv.name}» به «${t.scopeLabel(scopeId)}»`, scopeId, after: { contact: c, title: inv.title, roleId: inv.roleId } });
    notify(`دعوت‌نامه برای «${inv.name}» ${MOBILE.test(c) ? "با پیامک" : "با رایانامه"} ارسال شد. (نمایشی)`, "success");
    setName("");
    setContact("");
    setTitle("");
    setRoleId("");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const estimatedRows = Math.max(3, Math.round(file.size / 80));
    notify(`فایل «${file.name}» پردازش شد — ${fmtN(estimatedRows)} کاربر برای «${sub.root.name}» وارد شدند.`);
    emitSettingsChange({ area: "واردسازی کاربران", summary: `واردسازی دسته‌ای از «${file.name}» (${fmtN(estimatedRows)} ردیف)` });
    e.target.value = "";
  };

  const downloadSample = () => {
    const csv = "نام و نام خانوادگی,شماره موبایل,سمت سازمانی\nکاربر نمونه یک,09121234567,کارشناس روابط‌عمومی\nکاربر نمونه دو,09351234567,کارشناس منابع انسانی\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "نمونه-واردسازی-کاربران.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("فایل نمونه دانلود شد.", "info");
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<UserPlus size={18} />} title="دعوت و واردسازی" description={`افزودن کاربران تازه به «${sub.root.name}» و زیرمجموعه‌هایش — دعوت فردی یا بارگذاری فایل اکسل.`} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="کاربران عضو" value={fmtN(members.size)} icon={<Users size={16} />} tone="brand" />
        <StatCard label="عضویت فعال" value={fmtN(activeMembers.size)} tone="success" />
        <StatCard label="دعوت در انتظار" value={fmtN(pending.length)} tone="warning" />
      </div>

      {canInvite && (
        <div className="card p-4 space-y-3">
          <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
            <MailPlus size={15} className="text-brand-600" /> دعوت کاربر
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="نام و نام خانوادگی">
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: سارا محمدی" />
            </Field>
            <Field label="موبایل یا رایانامه">
              <input className="input-field" dir="ltr" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="09121234567" />
            </Field>
            <Field label="واحد" hint="فقط واحدهایی که اختیار مدیریت اعضایشان را دارید.">
              <ScopeSelect value={scopeId} onChange={setScopeId} nodes={scopes} />
            </Field>
            <Field label="عنوان شغلی (اختیاری)">
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="کارشناس ارشد" />
            </Field>
            <Field label="نقش پیشنهادی (اختیاری)" hint="پس از پذیرش دعوت، در «تخصیص نقش» تأیید می‌شود.">
              <select className="input-field" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">بدون نقش — فقط عضویت</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <Button variant="primary" icon={<Send size={14} />} onClick={send} disabled={!scopes.length}>
                ارسال دعوت‌نامه
              </Button>
            </div>
          </div>
        </div>
      )}

      {canInvite && (
        <div className="card overflow-hidden">
          <p className="px-4 py-2.5 border-b border-ink-100 text-[12.5px] font-bold text-ink-800 bg-ink-50">دعوت‌ها ({fmtN(mine.length)})</p>
          {mine.length === 0 ? (
            <EmptyState icon={<MailPlus size={22} />} title="هنوز دعوتی ارسال نشده" description="از فرم بالا یک نفر را دعوت کنید." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {mine.map((i) => (
                <li key={i.id} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-ink-800 truncate">
                      {i.name} <span dir="ltr" className="text-[11px] text-ink-400 font-normal">{i.contact}</span>
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px] text-ink-500">
                      <ScopeName id={i.scopeId} />
                      {i.title && <span>· {i.title}</span>}
                      {i.roleId && <span>· نقش: {t.iam.roles.find((r) => r.id === i.roleId)?.name ?? "—"}</span>}
                      <span>· {i.at} — {i.by}</span>
                    </div>
                  </div>
                  {i.status === "pending" ? <Badge tone="warning">در انتظار پذیرش</Badge> : <Badge tone="neutral">لغوشده</Badge>}
                  {i.status === "pending" && (
                    <span className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={() => notify(`دعوت‌نامه‌ی «${i.name}» دوباره ارسال شد. (نمایشی)`, "info")}>
                        ارسال دوباره
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<X size={13} />}
                        onClick={() =>
                          confirm({
                            title: `لغو دعوت «${i.name}»؟`,
                            confirmLabel: "بله، لغو شود",
                            onConfirm: () => {
                              inviteStore.set((prev) => prev.map((x) => (x.id === i.id ? { ...x, status: "cancelled" } : x)));
                              notify("دعوت لغو شد.", "info");
                            },
                          })
                        }
                      >
                        لغو
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canImport && (
        <div className="card p-4">
          <h3 className="text-[13px] font-bold text-ink-900 mb-1">واردسازی دسته‌ای کاربران</h3>
          <p className="text-xs text-ink-400 mb-3">فایل اکسل حاوی نام، شماره موبایل و سمت سازمانی کاربران را بارگذاری کنید.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <Button variant="primary" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
              بارگذاری فایل اکسل
            </Button>
            <Button variant="secondary" icon={<Download size={14} />} onClick={downloadSample}>
              دانلود نمونه فایل
            </Button>
          </div>
        </div>
      )}

      <Callout tone="neutral">دادن نقش به کاربران موجود (با واحد و بازه‌ی اعتبار، تکی یا گروهی) در «تخصیص نقش» انجام می‌شود؛ حساب‌های مهمانِ بیرون از سازمان در «امنیت و انطباق».</Callout>
    </div>
  );
}
