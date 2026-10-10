import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, Lock, ChevronLeft, ChevronDown, Crown, Info, LayoutTemplate, Copy, ShieldCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import {
  ACCESS_GROUPS,
  ACCESS_SCOPES,
  ACCESS_TEMPLATES,
  GRANT_LEVELS,
  LEVEL_RANK,
  RESOURCES,
  checkEditMember,
  compactMap,
  countReadable,
  countWritable,
  describeDiff,
  diffMatrix,
  effectiveMatrix,
  groupLabel,
  isOwner,
  levelLabel,
  maxGrantable,
  scopeOf,
  type AccessGroup,
  type AccessLevel,
  type AccessMatrix,
  type AccessScopeId,
  type Editor,
  type ResourceDef,
  type ResourceId,
} from "../../pm/access";
import type { PMMember } from "../../pm/types";

const levelTone: Record<AccessLevel, string> = {
  none: "bg-ink-100 text-ink-500",
  read: "bg-navy-50 text-navy-700",
  write: "bg-brand-50 text-brand-700",
  manage: "bg-emerald-50 text-emerald-700",
};

/** نشان سطح دسترسی (نمای فقط‌خواندنی) */
export function LevelChip({ level }: { level: AccessLevel }) {
  return <span className={`inline-flex items-center rounded-md px-2 h-6 text-[11px] whitespace-nowrap ${levelTone[level]}`}>{levelLabel[level]}</span>;
}

/** چک‌باکس با حالت «نیمه‌انتخاب» */
function TriCheck({ checked, indeterminate, disabled, onChange, label, title }: { checked: boolean; indeterminate?: boolean; disabled?: boolean; onChange: () => void; label: string; title?: string }) {
  return (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked;
      }}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={label}
      title={title}
      className="w-4 h-4 shrink-0 rounded accent-brand-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    />
  );
}

const LOCKED_REASON = "سطح فعلی این عضو در این بخش از سطح دسترسی شما بالاتر است";
const NO_CAP_REASON = "خودتان به این بخش دسترسی ندارید و نمی‌توانید آن را اعطا کنید";

/**
 * ویرایشگر دسترسی‌های یک عضو — هم‌ارز صفحه‌ی «Fine-grained token ← Add resource permissions» در GitLab:
 * ستون اول (در RTL سمت راست) انتخابگر بخش‌ها با سوئیچ حوزه، جستجو و دسته‌های بازشونده با چک‌باکس نیمه‌انتخاب؛
 * ستون دوم جدول «بخش | سطح دسترسی» برای هر حوزه، فقط با بخش‌های انتخاب‌شده.
 * قالب‌های آماده و «کپی از عضو دیگر» فقط انتخاب را پر می‌کنند (نقش نیستند).
 */
export default function MemberAccessDrawer({ pid, member, editor, archived, onClose }: { pid: string; member: PMMember | null; editor: Editor; archived: boolean; onClose: () => void }) {
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const p = pm.getProject(pid);
  const managerName = p?.meta.manager;
  const [draft, setDraft] = useState<AccessMatrix | null>(null);
  const [scope, setScope] = useState<AccessScopeId>("project");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setDraft(member ? effectiveMatrix(member) : null);
    setQ("");
    setNote(null);
    setScope("project");
    setExpanded([]);
  }, [member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const before = useMemo(() => (member ? effectiveMatrix(member) : null), [member]);
  const changes = before && draft ? diffMatrix(before, draft) : [];

  const requestClose = () => {
    if (!changes.length) return onClose();
    confirm({ title: "تغییرات ذخیره نشده‌اند", message: `${fa(changes.length)} تغییر در دسترسی‌ها از بین می‌رود.`, confirmLabel: "بستن بدون ذخیره", onConfirm: onClose });
  };

  useEffect(() => {
    if (!member) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const term = q.trim();
  const visibleGroups = useMemo(() => {
    if (!term) return ACCESS_GROUPS.filter((g) => g.scope === scope);
    return ACCESS_GROUPS.map((g) => ({ ...g, resources: g.label.includes(term) ? g.resources : g.resources.filter((r) => r.label.includes(term) || r.hint.includes(term)) })).filter((g) => g.resources.length);
  }, [term, scope]);

  if (!member || !draft || !before || !p) return null;

  const owner = isOwner(member);
  const check = checkEditMember(editor, member, managerName);
  const editable = check.ok && !archived;
  const cap = (r: ResourceId) => maxGrantable(editor, r);
  const locked = (r: ResourceId) => LEVEL_RANK[before[r]] > LEVEL_RANK[cap(r)];
  const blockReason = (r: ResourceId): string | null => (locked(r) ? LOCKED_REASON : cap(r) === "none" ? NO_CAP_REASON : null);
  const canToggle = (r: ResourceId) => editable && !blockReason(r);
  const selected = (r: ResourceId) => draft[r] !== "none";

  const setLevel = (r: ResourceId, l: AccessLevel) => setDraft({ ...draft, [r]: l });
  const addLevel = (r: ResourceId): AccessLevel => (before[r] !== "none" && LEVEL_RANK[before[r]] <= LEVEL_RANK[cap(r)] ? before[r] : "read");
  const toggleRes = (r: ResourceId) => canToggle(r) && setLevel(r, selected(r) ? "none" : addLevel(r));
  const toggleGroup = (g: AccessGroup) => {
    const free = g.resources.filter((r) => canToggle(r.id));
    if (!free.length) return;
    const allOn = free.every((r) => selected(r.id));
    const next = { ...draft };
    free.forEach((r) => (next[r.id] = allOn ? "none" : selected(r.id) ? next[r.id] : addLevel(r.id)));
    setDraft(next);
  };

  /** پر کردن انتخاب از یک ماتریس (قالب یا عضو دیگر) با رعایت سقف ویرایشگر و ردیف‌های قفل */
  const fillFrom = (src: AccessMatrix, label: string) => {
    let clipped = 0;
    const next = { ...draft };
    RESOURCES.forEach((r) => {
      if (locked(r.id)) return;
      const want = src[r.id] ?? "none";
      const c = cap(r.id);
      if (LEVEL_RANK[want] > LEVEL_RANK[c]) {
        clipped++;
        next[r.id] = c;
      } else next[r.id] = want;
    });
    setDraft(next);
    setNote(`${label} اعمال شد؛ پیش از ذخیره بازبینی کنید.${clipped ? ` ${fa(clipped)} بخش به سقف دسترسی خود شما محدود شد.` : ""}`);
  };

  const save = () => {
    if (!changes.length) return onClose();
    pm.setMemberAccess(pid, member.id, compactMap(draft), describeDiff(changes));
    notify(`دسترسی‌های «${member.name}» ذخیره شد (${fa(changes.length)} تغییر) و به او اطلاع داده شد.`, "success");
    onClose();
  };

  const others = p.members.filter((m) => m.id !== member.id);
  const isMgr = member.name === managerName;
  const readable = countReadable(draft);
  const writable = countWritable(draft);
  const countIn = (s: AccessScopeId) => RESOURCES.filter((r) => scopeOf(r.id) === s && selected(r.id)).length;

  // ---------------------------------------------------------------- ستون انتخابگر
  const selector = (
    <div className="p-3 sm:p-4 space-y-3 min-w-0">
      <div>
        <p className="text-[11px] text-ink-500 mb-1.5">حوزه‌ی دسترسی</p>
        <div className="grid grid-cols-3 rounded-lg border border-ink-200 p-0.5 bg-ink-50 gap-0.5" role="tablist" aria-label="حوزه‌ی دسترسی">
          {ACCESS_SCOPES.map((s) => {
            const on = scope === s.id && !term;
            const n = countIn(s.id);
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={on}
                title={s.hint}
                onClick={() => {
                  setScope(s.id);
                  setQ("");
                }}
                className={`rounded-md px-1.5 py-1.5 text-[11px] leading-4 transition-colors ${on ? "bg-white text-brand-700 font-semibold shadow-sm" : "text-ink-600 hover:text-ink-900"}`}
              >
                {s.label}
                {n > 0 && <span className="mr-1 text-[10px] text-ink-400">({fa(n)})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی بخش برای افزودن" aria-label="جستجوی بخش برای افزودن" className="input-field !py-1.5 !pr-8 !text-xs" />
      </div>

      <ul className="rounded-lg border border-ink-200 divide-y divide-ink-100">
        {visibleGroups.map((g) => {
          const open = !!term || expanded.includes(g.id);
          const on = g.resources.filter((r) => selected(r.id)).length;
          const free = g.resources.filter((r) => canToggle(r.id));
          const all = on === g.resources.length;
          return (
            <li key={g.id}>
              <div className="flex items-center gap-2 px-2.5 py-2">
                <TriCheck checked={all} indeterminate={on > 0} disabled={!free.length} onChange={() => toggleGroup(g)} label={`انتخاب همه‌ی ${g.label}`} title={!free.length ? (editable ? NO_CAP_REASON : undefined) : undefined} />
                <button type="button" onClick={() => setExpanded(open ? expanded.filter((x) => x !== g.id) : [...expanded, g.id])} aria-expanded={open} className="flex-1 min-w-0 flex items-center justify-between gap-2 text-right">
                  <span className="min-w-0">
                    <span className="text-xs font-semibold text-ink-800">{g.label}</span>
                    {term && <span className="text-[10px] text-ink-400 mr-1.5">{ACCESS_SCOPES.find((s) => s.id === g.scope)?.label}</span>}
                  </span>
                  <span className="flex items-center gap-1 text-[10.5px] text-ink-400 shrink-0">
                    {fa(on)}/{fa(g.resources.length)}
                    {open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                  </span>
                </button>
              </div>
              {open && (
                <ul className="pb-1.5">
                  {g.resources.map((r) => {
                    const reason = editable ? blockReason(r.id) : null;
                    return (
                      <li key={r.id}>
                        <label className={`flex items-start gap-2 pr-8 pl-2.5 py-1.5 ${reason ? "cursor-not-allowed" : "cursor-pointer hover:bg-ink-50"}`} title={reason ?? r.hint}>
                          <span className="pt-0.5">
                            <TriCheck checked={selected(r.id)} disabled={!!reason} onChange={() => toggleRes(r.id)} label={r.label} title={reason ?? undefined} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-xs ${reason ? "text-ink-400" : "text-ink-700"}`}>
                              {r.label}
                              {reason && <Lock size={11} className="inline mr-1 -mt-0.5 text-ink-400" />}
                            </span>
                            <span className="block text-[10.5px] text-ink-400 leading-4">{r.hint}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {visibleGroups.length === 0 && <li className="text-xs text-ink-400 text-center py-5">بخشی با این عبارت پیدا نشد.</li>}
      </ul>
    </div>
  );

  // ---------------------------------------------------------------- ستون جدول‌ها
  const optionText = (r: ResourceDef, l: AccessLevel) => {
    if (LEVEL_RANK[l] > LEVEL_RANK[r.max]) return `${levelLabel[l]} — برای این بخش تعریف نشده`;
    if (LEVEL_RANK[l] > LEVEL_RANK[cap(r.id)]) return `${levelLabel[l]} — بالاتر از سطح شما`;
    return levelLabel[l];
  };
  const tables = (
    <div className="p-3 sm:p-4 space-y-4 min-w-0">
      {ACCESS_SCOPES.map((s) => {
        const rows = RESOURCES.filter((r) => scopeOf(r.id) === s.id && selected(r.id));
        const active = s.id === scope && !term && editable;
        return (
          <section key={s.id} aria-label={s.label}>
            <h4 className={`text-xs font-bold mb-1.5 flex items-center gap-1.5 ${active ? "text-brand-700" : "text-ink-800"}`}>
              {s.label}
              <span className="text-[10.5px] font-normal text-ink-400">({fa(rows.length)})</span>
            </h4>
            <div className={`rounded-lg border ${active ? "border-brand-200" : "border-ink-200"} overflow-hidden`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-ink-50 text-ink-500 text-[11px]">
                    <th className="text-right font-medium px-2.5 py-1.5">بخش</th>
                    <th className="text-right font-medium px-2.5 py-1.5 w-[9.5rem]">سطح دسترسی</th>
                    {editable && <th className="w-8" aria-label="حذف" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((r) => {
                    const isLocked = locked(r.id);
                    const fresh = before[r.id] === "none";
                    const changed = draft[r.id] !== before[r.id];
                    return (
                      <tr key={r.id} className={changed ? "bg-brand-50/40" : ""}>
                        <td className="px-2.5 py-1.5 align-middle">
                          <span className="text-ink-800">{r.label}</span>
                          {fresh && editable && <span className="mr-1.5 text-[10px] rounded bg-emerald-50 text-emerald-700 px-1">تازه</span>}
                          <span className="block text-[10.5px] text-ink-400">{groupLabel[r.group]}</span>
                        </td>
                        <td className="px-2.5 py-1.5 align-middle">
                          {editable ? (
                            <span className="flex items-center gap-1">
                              <select
                                value={draft[r.id]}
                                disabled={isLocked}
                                title={isLocked ? LOCKED_REASON : undefined}
                                onChange={(e) => setLevel(r.id, e.target.value as AccessLevel)}
                                aria-label={`سطح دسترسی ${r.label}`}
                                className="input-field !py-1 !px-2 !text-[11px] !w-full min-w-0"
                              >
                                {GRANT_LEVELS.map((l) => {
                                  const blocked = l !== draft[r.id] && (LEVEL_RANK[l] > LEVEL_RANK[r.max] || LEVEL_RANK[l] > LEVEL_RANK[cap(r.id)]);
                                  return (
                                    <option key={l} value={l} disabled={blocked} title={blocked ? optionText(r, l) : undefined}>
                                      {blocked ? optionText(r, l) : levelLabel[l]}
                                    </option>
                                  );
                                })}
                              </select>
                              {isLocked && (
                                <span title={LOCKED_REASON} className="text-ink-400 shrink-0">
                                  <Lock size={12} />
                                </span>
                              )}
                            </span>
                          ) : (
                            <LevelChip level={draft[r.id]} />
                          )}
                        </td>
                        {editable && (
                          <td className="px-1 py-1.5 align-middle text-center">
                            <button
                              type="button"
                              onClick={() => setLevel(r.id, "none")}
                              disabled={isLocked}
                              title={isLocked ? LOCKED_REASON : `حذف «${r.label}»`}
                              aria-label={`حذف ${r.label}`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={editable ? 3 : 2} className="px-3 py-4 text-center text-[11.5px] text-ink-400">
                        {editable ? "هیچ بخشی انتخاب نشده؛ از فهرست سمت راست بخش اضافه کنید." : "دسترسی‌ای در این حوزه ندارد."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );

  const readOnlyReason = owner ? "مالک دسترسی کامل و ثابت دارد." : archived ? "پروژه بایگانی است؛ دسترسی‌ها فقط‌خواندنی‌اند." : check.ok ? "" : check.reason;

  return createPortal(
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4" dir="rtl" role="dialog" aria-modal="true" aria-label={`دسترسی‌های ${member.name}`}>
      <div className="absolute inset-0 bg-ink-900/40" onClick={requestClose} />
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl bg-white sm:rounded-xl shadow-2xl sm:border border-ink-200 flex flex-col">
        {/* سرصفحه */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-ink-100">
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-ink-900 truncate">دسترسی‌های «{member.name}»</h2>
            <p className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{member.title}</span>
              {owner && (
                <span className="inline-flex items-center gap-0.5 rounded bg-navy-50 text-navy-700 px-1.5">
                  <Crown size={10} /> مالک
                </span>
              )}
              {isMgr && !owner && <span className="rounded bg-brand-50 text-brand-700 px-1.5">مدیر پروژه</span>}
              <span>
                · {fa(readable)} بخش · {fa(writable)} ویرایش
              </span>
            </p>
          </div>
          <button onClick={requestClose} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center shrink-0" aria-label="بستن">
            <X size={16} />
          </button>
        </div>

        {/* بدنه */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {editable ? (
            <>
              <p className="text-[11.5px] text-ink-500 leading-5 flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0 text-brand-600" />
                فقط حداقل بخش‌هایی را بدهید که این عضو برای کارش لازم دارد؛ بخش‌ها را از فهرست انتخاب کنید و برای هر کدام سطح دسترسی را تعیین کنید. بخش انتخاب‌نشده برای او پنهان است.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  <LayoutTemplate size={13} />
                  <select
                    value=""
                    onChange={(e) => {
                      const t = ACCESS_TEMPLATES.find((x) => x.id === e.target.value);
                      if (t) fillFrom(t.matrix, `قالب «${t.label}»`);
                    }}
                    className="input-field !py-1 !text-[11px] !w-auto"
                    aria-label="قالب‌های آماده"
                  >
                    <option value="" disabled>
                      قالب‌های آماده…
                    </option>
                    {ACCESS_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id} title={t.hint}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                {others.length > 0 && (
                  <label className="flex items-center gap-1.5 text-[11px] text-ink-500">
                    <Copy size={13} />
                    <select
                      value=""
                      onChange={(e) => {
                        const o = others.find((x) => x.id === e.target.value);
                        if (o) fillFrom(effectiveMatrix(o), `دسترسی‌های «${o.name}»`);
                      }}
                      className="input-field !py-1 !text-[11px] !w-auto max-w-[12rem]"
                      aria-label="کپی از عضو دیگر"
                    >
                      <option value="" disabled>
                        کپی از عضو دیگر…
                      </option>
                      {others.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({fa(countReadable(effectiveMatrix(o)))} بخش)
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {note && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start justify-between gap-2">
                  <span>{note}</span>
                  <button onClick={() => setNote(null)} aria-label="بستن پیام" className="shrink-0">
                    <X size={12} />
                  </button>
                </p>
              )}
              <fieldset className="rounded-xl border border-ink-200 min-w-0">
                <legend className="text-[11px] font-semibold text-ink-600 px-1.5 mr-3">انتخاب بخش و سطح دسترسی</legend>
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:divide-x divide-ink-200">
                  {selector}
                  <div className="border-t lg:border-t-0 border-ink-200">{tables}</div>
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <p className="text-[11.5px] text-ink-600 bg-ink-50 border border-ink-200 rounded-lg p-2.5 flex items-start gap-1.5 leading-5">
                {owner ? <ShieldCheck size={13} className="mt-0.5 shrink-0 text-navy-700" /> : <Lock size={13} className="mt-0.5 shrink-0" />}
                <span>
                  {readOnlyReason} {!owner && "نمای فقط‌خواندنی."}
                </span>
              </p>
              <div className="rounded-xl border border-ink-200">{tables}</div>
            </>
          )}
        </div>

        {/* پانویس */}
        <div className="px-4 sm:px-5 py-3 border-t border-ink-100 flex items-center gap-2 flex-wrap">
          {editable ? (
            <>
              <Button variant="primary" onClick={save} disabled={!changes.length}>
                {changes.length ? `ذخیره‌ی دسترسی‌ها (${fa(changes.length)} تغییر)` : "ذخیره‌ی دسترسی‌ها"}
              </Button>
              <Button variant="secondary" onClick={requestClose}>
                انصراف
              </Button>
              <span className="text-[11px] text-ink-400 mr-auto hidden sm:inline">
                {fa(readable)} از {fa(RESOURCES.length)} بخش · {fa(writable)} با ویرایش
              </span>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              بستن
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** خلاصه‌ی دسترسی برای کارت عضو: «دسترسی: ۹ بخش · ۳ ویرایش» */
export function accessSummary(m: PMMember): string {
  if (isOwner(m)) return "دسترسی: کامل (مالک)";
  const mx = effectiveMatrix(m);
  const r = countReadable(mx);
  const w = countWritable(mx);
  if (!r) return "دسترسی: هیچ بخشی";
  return `دسترسی: ${fa(r)} بخش${w ? ` · ${fa(w)} ویرایش` : " · فقط مشاهده"}`;
}

