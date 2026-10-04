import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, ShieldCheck, Lock, ChevronDown } from "lucide-react";
import Drawer from "../../components/ui/Drawer";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import {
  ACCESS_GROUPS,
  LEVELS,
  LEVEL_RANK,
  RESOURCES,
  checkEditMember,
  clamp,
  compactOverrides,
  countReadable,
  describeDiff,
  diffMatrix,
  effectiveMatrix,
  levelLabel,
  levelShort,
  maxGrantable,
  presetLevel,
  type AccessLevel,
  type AccessMatrix,
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
const levelActive: Record<AccessLevel, string> = {
  none: "bg-ink-600 text-white",
  read: "bg-navy-700 text-white",
  write: "bg-brand-600 text-white",
  manage: "bg-emerald-600 text-white",
};

/** کنترل چندگزینه‌ای سطح دسترسی: بدون / مشاهده / ویرایش (/ مدیریت) */
export function LevelSegment({ res, value, onChange, maxAllowed, disabled, size = "md" }: { res: ResourceDef; value: AccessLevel; onChange: (l: AccessLevel) => void; maxAllowed: AccessLevel; disabled?: boolean; size?: "sm" | "md" }) {
  const opts = LEVELS.filter((l) => LEVEL_RANK[l] <= LEVEL_RANK[res.max]);
  return (
    <div className="inline-flex rounded-lg border border-ink-200 overflow-hidden shrink-0" role="radiogroup" aria-label={`سطح دسترسی ${res.label}`}>
      {opts.map((l) => {
        const blocked = disabled || LEVEL_RANK[l] > LEVEL_RANK[maxAllowed];
        const on = value === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={blocked && !on}
            onClick={() => !blocked && onChange(l)}
            title={blocked && !on ? "بیش از سطح دسترسی شما یا مجاز برای این نقش نیست" : levelLabel[l]}
            className={`${size === "sm" ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-1 text-[11px]"} whitespace-nowrap border-l last:border-l-0 border-ink-200 transition-colors ${on ? levelActive[l] : blocked ? "bg-white text-ink-300 cursor-not-allowed" : "bg-white text-ink-600 hover:bg-ink-50"}`}
          >
            {levelShort[l]}
          </button>
        );
      })}
    </div>
  );
}

export function LevelChip({ level, overridden }: { level: AccessLevel; overridden?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center rounded px-1 min-w-[38px] h-5 text-[10px] ${levelTone[level]} ${overridden ? "ring-1 ring-amber-400" : ""}`} title={`${levelLabel[level]}${overridden ? " (بازنویسی‌شده نسبت به نقش)" : ""}`}>
      {level === "none" ? "—" : levelShort[level]}
    </span>
  );
}

/**
 * کشوی دسترسی‌های ریز یک عضو — مشابه صفحه‌ی «Fine-grained token» در GitLab:
 * جستجو، گروه‌ها با انتخاب سطح برای کل گروه، کنترل سطح برای هر بخش، شمارنده‌ی خلاصه،
 * نشانگر «تفاوت با نقش» و «بازگشت به پیش‌فرض نقش».
 */
export default function MemberAccessDrawer({ pid, member, editor, archived, onClose }: { pid: string; member: PMMember | null; editor: Editor; archived: boolean; onClose: () => void }) {
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [draft, setDraft] = useState<AccessMatrix | null>(null);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);

  useEffect(() => {
    setDraft(member ? effectiveMatrix(member) : null);
    setQ("");
  }, [member]);

  const check = member ? checkEditMember(editor, member) : { ok: false as const, reason: "" };
  const editable = !!member && check.ok && !archived;
  const viewerCap = member?.role === "مشاهده‌گر";
  const allowed = (r: ResourceDef): AccessLevel => {
    const g = maxGrantable(editor, r.id);
    // نقش مشاهده‌گر فقط‌خواندنی می‌ماند (دروازه‌ی بیرونی)؛ برای ویرایش، نقش را تغییر دهید
    return viewerCap && LEVEL_RANK[g] > LEVEL_RANK.read ? "read" : g;
  };

  const term = q.trim();
  const groups = useMemo(
    () => ACCESS_GROUPS.map((g) => ({ ...g, resources: g.resources.filter((r) => !term || r.label.includes(term) || r.hint.includes(term) || g.label.includes(term)) })).filter((g) => g.resources.length),
    [term]
  );

  if (!member || !draft) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;

  const before = effectiveMatrix(member);
  const changes = diffMatrix(before, draft);
  const readable = countReadable(draft);
  const overridden = RESOURCES.filter((r) => draft[r.id] !== presetLevel(member.role, r.id)).length;

  const setLevel = (res: ResourceId, l: AccessLevel) => setDraft({ ...draft, [res]: clamp(res, l) });
  const setGroup = (rs: ResourceDef[], l: AccessLevel) => {
    const next = { ...draft };
    rs.forEach((r) => {
      const cap = allowed(r);
      const want = clamp(r.id, l);
      next[r.id] = LEVEL_RANK[want] > LEVEL_RANK[cap] ? cap : want;
    });
    setDraft(next);
  };
  const resetToPreset = () => {
    const next = {} as AccessMatrix;
    RESOURCES.forEach((r) => (next[r.id] = presetLevel(member.role, r.id)));
    setDraft(next);
  };
  const save = () => {
    if (!changes.length) return onClose();
    const overrides = compactOverrides(member.role, draft);
    pm.setMemberAccess(pid, member.id, overrides, describeDiff(changes));
    notify(`دسترسی‌های «${member.name}» ذخیره شد (${fa(changes.length)} تغییر) و به او اطلاع داده شد.`);
    onClose();
  };

  return (
    <Drawer open onClose={onClose} title={`دسترسی‌های «${member.name}»`} width="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="brand" icon={<ShieldCheck size={11} />}>
            پیش‌فرض نقش: {member.role}
          </Badge>
          <span className="text-[11px] rounded-full bg-ink-100 text-ink-700 px-2 py-0.5">
            {fa(readable)} از {fa(RESOURCES.length)} بخش
          </span>
          {overridden > 0 && <span className="text-[11px] rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5">{fa(overridden)} تفاوت با نقش</span>}
        </div>

        {!editable && (
          <p className="text-[11.5px] text-ink-500 bg-ink-50 border border-ink-200 rounded-lg p-2.5 flex items-start gap-1.5 leading-5">
            <Lock size={13} className="mt-0.5 shrink-0" /> {archived ? "پروژه بایگانی است؛ دسترسی‌ها فقط‌خواندنی‌اند." : check.ok ? "" : check.reason}
          </p>
        )}
        {editable && viewerCap && <p className="text-[11px] text-ink-500 leading-5">نقش «مشاهده‌گر» فقط‌خواندنی است؛ برای دادن دسترسی ویرایش، ابتدا نقش را تغییر دهید.</p>}

        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی بخش (مثلاً بودجه، جلسات)…" className="input-field !py-1.5 !pr-8 !text-xs" />
        </div>

        <div className="space-y-3">
          {groups.map((g) => {
            const isCollapsed = collapsed.includes(g.id) && !term;
            const groupLevels = new Set(g.resources.map((r) => draft[r.id]));
            const uniform = groupLevels.size === 1 ? [...groupLevels][0] : null;
            const groupMax = g.resources.reduce<AccessLevel>((m, r) => (LEVEL_RANK[r.max] > LEVEL_RANK[m] ? r.max : m), "none");
            const groupAllowed = g.resources.reduce<AccessLevel>((m, r) => (LEVEL_RANK[allowed(r)] > LEVEL_RANK[m] ? allowed(r) : m), "none");
            const on = g.resources.filter((r) => draft[r.id] !== "none").length;
            return (
              <div key={g.id} className="rounded-xl border border-ink-200">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-ink-50/60 rounded-t-xl flex-wrap">
                  <button type="button" onClick={() => setCollapsed(isCollapsed ? collapsed.filter((x) => x !== g.id) : [...collapsed, g.id])} className="flex items-center gap-1.5 text-xs font-bold text-ink-800" aria-expanded={!isCollapsed}>
                    <ChevronDown size={13} className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    {g.label}
                    <span className="text-[10.5px] font-normal text-ink-400">
                      {fa(on)} از {fa(g.resources.length)}
                    </span>
                  </button>
                  {editable && (
                    <span className="flex items-center gap-1.5 text-[10.5px] text-ink-500">
                      همه:
                      <LevelSegment res={{ id: g.resources[0].id, label: g.label, hint: "", group: g.id, max: groupMax }} value={uniform ?? ("" as AccessLevel)} onChange={(l) => setGroup(g.resources, l)} maxAllowed={groupAllowed} size="sm" />
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="divide-y divide-ink-100">
                    {g.resources.map((r) => {
                      const preset = presetLevel(member.role, r.id);
                      const diff = draft[r.id] !== preset;
                      const changed = draft[r.id] !== before[r.id];
                      return (
                        <div key={r.id} className={`px-3 py-2 flex items-center justify-between gap-2 flex-wrap ${changed ? "bg-brand-50/40" : ""}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-ink-800 flex items-center gap-1.5 flex-wrap">
                              {r.label}
                              {diff && (
                                <span className="text-[10px] rounded bg-amber-50 text-amber-700 border border-amber-200 px-1" title={`پیش‌فرض نقش «${member.role}»: ${levelLabel[preset]}`}>
                                  تفاوت با نقش · پیش‌فرض {levelShort[preset]}
                                </span>
                              )}
                            </p>
                            <p className="text-[10.5px] text-ink-400 leading-5">{r.hint}</p>
                          </div>
                          {editable ? <LevelSegment res={r} value={draft[r.id]} onChange={(l) => setLevel(r.id, l)} maxAllowed={allowed(r)} /> : <LevelChip level={draft[r.id]} overridden={diff} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {groups.length === 0 && <p className="text-xs text-ink-400 text-center py-4">بخشی با این عبارت پیدا نشد.</p>}
        </div>

        {editable && (
          <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-white border-t border-ink-100 flex items-center gap-2 flex-wrap">
            <Button variant="primary" onClick={save} disabled={!changes.length}>
              {changes.length ? `ذخیره (${fa(changes.length)} تغییر)` : "بدون تغییر"}
            </Button>
            <Button variant="ghost" icon={<RotateCcw size={13} />} onClick={resetToPreset} disabled={!overridden}>
              بازگشت به پیش‌فرض نقش
            </Button>
            <Button variant="secondary" className="mr-auto" onClick={onClose}>
              انصراف
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
