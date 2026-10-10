// ---------------------------------------------------------------------------
// «کاربران برجسته» (F09 · قلم ۱.۱۸.۶) — تنظیمات سامانه ← سازمان و دسترسی ← اعضا.
// هر لایه‌ی سازمانی (سامانه/هلدینگ/شرکت) برجسته‌های خودش را دارد: ترتیب نمایش، توضیح کوتاه و نوع
// ارتباط خودکار (دوستی / دنبال‌کردن / هیچ). «ارتباط خودکار برای اعضای جدید» هنگام افزودن عضویت اجرا
// می‌شود و «اعمال روی اعضای فعلی» با تأیید. نشان «برجسته» روی کارت عضو، پروفایل و پیشنهادها.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Star, Trash2, UsersRound, Zap } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { emitSettingsChange } from "../../iam/settingsAudit";
import { applyFeaturedToMembers, autoConnectLabel, saveFeatured, setAutoNew, useFollows, type AutoConnect, type FeaturedUser } from "../../social/follow/store";
import { followEndpoints } from "../../social/follow/endpoints";
import { ApiChip } from "../social/kit";
import { Callout, ScopeSelect, SectionHead, UserCell, UserPicker, fmtN, useSubtree, userName as uname } from "./iam/shared";
import { ancestorsOrSelf } from "../../iam/model";

export default function FeaturedUsersSection() {
  const t = useTenancy();
  const sub = useSubtree();
  const fol = useFollows();
  const { notify } = useToast();
  const confirm = useConfirm();
  const canEdit = (t.hasPermission("relations.featured.manage") || t.hasPermission("iam.members.manage") || t.hasPermission("users.edit")) && !t.readOnly;
  // لایه‌هایی که برجسته دارند: سامانه، هلدینگ و شرکت
  const scopes = useMemo(() => sub.nodes.filter((n) => n.type !== "unit" && n.active), [sub.nodes]);
  const [scopeId, setScopeId] = useState(scopes[0]?.id ?? t.contextId);
  const saved = useMemo(() => fol.state.featured.filter((x) => x.scope_id === scopeId).sort((a, b) => a.order - b.order), [fol.state.featured, scopeId]);
  const [list, setList] = useState<FeaturedUser[]>(saved);
  const [pick, setPick] = useState(false);
  useEffect(() => setList(saved), [saved]);
  const dirty = JSON.stringify(list) !== JSON.stringify(saved);
  const autoNew = fol.state.autoNew[scopeId] !== false;
  const members = useMemo(() => [...new Set(t.membersOf(scopeId, true).filter((m) => m.status === "active").map((m) => m.userId))], [t, scopeId]);
  // برجسته‌های لایه‌های بالاتر (فقط نمایش)
  const chain = ancestorsOrSelf(t.iam, scopeId).map((x) => x.id);
  const inherited = fol.state.featured.filter((x) => x.scope_id !== scopeId && chain.includes(x.scope_id));

  const move = (i: number, dir: -1 | 1) =>
    setList((l) => {
      const n = [...l];
      const j = i + dir;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n.map((x, k) => ({ ...x, order: k + 1 }));
    });
  const patch = (uid: string, p: Partial<FeaturedUser>) => setList((l) => l.map((x) => (x.user_id === uid ? { ...x, ...p } : x)));

  const save = () => {
    saveFeatured(scopeId, list);
    emitSettingsChange({ area: "کاربران برجسته", scopeId, summary: `${t.scopeLabel(scopeId)}: ${list.map((x) => uname(x.user_id)).join("، ") || "بدون برجسته"}`, before: { users: saved.map((x) => x.user_id) }, after: { users: list.map((x) => x.user_id), auto: list.map((x) => x.auto_connect) } });
    notify("فهرست کاربران برجسته ذخیره شد.", "success");
  };

  const applyExisting = () =>
    confirm({
      title: "روی اعضای فعلی اعمال شود؟",
      message: `${fmtN(members.length)} عضو فعالِ «${t.scopeLabel(scopeId)}» و زیرمجموعه‌ها طبق نوع ارتباط هر برجسته با آن‌ها مرتبط می‌شوند (دوستی خودکار یا دنبال‌کردن). کاربران می‌توانند بعداً لغو کنند.`,
      confirmLabel: "اعمال",
      onConfirm: () => {
        if (dirty) saveFeatured(scopeId, list);
        const n = applyFeaturedToMembers(scopeId, members);
        emitSettingsChange({ area: "کاربران برجسته", scopeId, summary: `اعمال روی اعضای فعلی «${t.scopeLabel(scopeId)}»: ${n} ارتباط تازه`, after: { members: members.length, created: n } });
        notify(n ? `${fmtN(n)} ارتباط تازه ساخته شد.` : "همه‌ی اعضا از قبل مرتبط بودند.", "success");
      },
    });

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Star size={18} />}
        title="کاربران برجسته"
        description="افرادی مثل رئیس یا روابط عمومی که همه‌ی اعضای این لایه خودکار با آن‌ها مرتبط می‌شوند و با نشان «برجسته» دیده می‌شوند."
        actions={
          <>
            <ApiChip items={[{ label: "فهرست برجسته‌ها", ep: followEndpoints.featured() }, { label: "افزودن", ep: followEndpoints.featuredCreate() }, { label: "ویرایش ترتیب/توضیح", ep: followEndpoints.featuredUpdate("{user_id}") }, { label: "حذف", ep: followEndpoints.featuredDelete("{user_id}") }, { label: "اعمال روی اعضای فعلی", ep: followEndpoints.featuredApplyExisting() }]} />
            <Button variant="primary" size="sm" icon={<Save size={13} />} disabled={!canEdit || !dirty} onClick={save}>
              ذخیره
            </Button>
          </>
        }
      />

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ScopeSelect value={scopeId} onChange={setScopeId} nodes={scopes} className="!w-auto min-w-[220px] flex-1 sm:flex-none" ariaLabel="لایه‌ی سازمانی" />
          <label className="flex items-center gap-2 text-[12.5px] text-ink-700 mr-auto">
            <Toggle on={autoNew} disabled={!canEdit} onChange={() => setAutoNew(scopeId, !autoNew)} label="ارتباط خودکار برای اعضای جدید" />
            ارتباط خودکار برای اعضای جدید
          </label>
        </div>

        <ul className="rounded-lg border border-ink-200 divide-y divide-ink-100">
          {list.map((x, i) => (
            <li key={x.user_id} className="px-3 py-2.5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_auto] gap-2 items-center">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] text-ink-400 w-4 text-center shrink-0">{fmtN(i + 1)}</span>
                <UserCell userId={x.user_id} size={28} />
              </div>
              <input className="input-field !py-1.5 text-[12px]" aria-label="توضیح کوتاه" placeholder="توضیح کوتاه (مثلاً: روابط عمومی)" value={x.note} disabled={!canEdit} onChange={(e) => patch(x.user_id, { note: e.target.value })} />
              <select className="input-field !py-1.5 text-[12px]" aria-label="نوع ارتباط خودکار" value={x.auto_connect} disabled={!canEdit} onChange={(e) => patch(x.user_id, { auto_connect: e.target.value as AutoConnect })}>
                {(Object.keys(autoConnectLabel) as AutoConnect[]).map((k) => (
                  <option key={k} value={k}>
                    {autoConnectLabel[k]}
                  </option>
                ))}
              </select>
              <span className="flex items-center gap-0.5 justify-end">
                <button type="button" disabled={!canEdit || i === 0} onClick={() => move(i, -1)} aria-label="بالاتر" className="w-7 h-7 rounded hover:bg-ink-100 flex items-center justify-center disabled:opacity-30">
                  <ArrowUp size={13} />
                </button>
                <button type="button" disabled={!canEdit || i === list.length - 1} onClick={() => move(i, 1)} aria-label="پایین‌تر" className="w-7 h-7 rounded hover:bg-ink-100 flex items-center justify-center disabled:opacity-30">
                  <ArrowDown size={13} />
                </button>
                <button type="button" disabled={!canEdit} onClick={() => setList((l) => l.filter((y) => y.user_id !== x.user_id))} aria-label="حذف از برجسته‌ها" className="w-7 h-7 rounded hover:bg-rose-50 text-ink-400 hover:text-rose-600 flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </span>
            </li>
          ))}
          {list.length === 0 && <li className="px-3 py-3 text-[12px] text-ink-400">برای این لایه کاربر برجسته‌ای تعریف نشده است.</li>}
        </ul>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" icon={<Plus size={13} />} disabled={!canEdit} onClick={() => setPick(true)}>
            افزودن کاربر برجسته
          </Button>
          <Button size="sm" variant="secondary" icon={<Zap size={13} />} disabled={!canEdit || list.length === 0} onClick={applyExisting}>
            اعمال روی اعضای فعلی ({fmtN(members.length)})
          </Button>
        </div>
        {inherited.length > 0 && (
          <p className="text-[11.5px] text-ink-500 flex items-center gap-1 flex-wrap">
            <UsersRound size={12} /> از لایه‌های بالاتر هم اعمال می‌شود:
            {inherited.map((x) => (
              <span key={`${x.scope_id}-${x.user_id}`} className="rounded-full bg-ink-100 px-2 py-0.5">
                {t.scopeLabel(x.scope_id)} ← {uname(x.user_id)}
              </span>
            ))}
          </p>
        )}
        <Callout tone="neutral">«دوستی خودکار» بدون نیاز به درخواست، عضو را در «ارتباطات من» با برجسته مرتبط می‌کند و محتوای عمومی او را در داشبورد می‌آورد؛ «دنبال‌کردن خودکار» فقط دنبال می‌کند. عضو تازه هنگام افزودن عضویت (تنظیمات ← اعضا) خودکار مرتبط می‌شود.</Callout>
      </div>

      {pick && (
        <Modal open onClose={() => setPick(false)} title="افزودن کاربر برجسته" width="max-w-md">
          <UserPicker
            value={list.map((x) => x.user_id)}
            multiple
            onChange={(ids) =>
              setList((l) => [
                ...l.filter((x) => ids.includes(x.user_id)),
                ...ids.filter((id) => !l.some((x) => x.user_id === id)).map((id, k) => ({ user_id: id, order: l.length + k + 1, note: "", auto_connect: "follow" as AutoConnect, scope_id: scopeId })),
              ])
            }
          />
          <div className="flex justify-end mt-3">
            <Button variant="primary" onClick={() => setPick(false)}>
              تأیید
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
