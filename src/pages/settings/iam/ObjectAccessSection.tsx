// «اعضا ← دسترسی‌های اشیا» (میزیتو: اصلاح دسترسی کاربران به گروه‌های پروژه، پرونده مشتریان و
// گروه‌های گفتگو توسط مالک میزکار) — یک صفحه که همه‌ی دسترسی‌های موردی یک نفر را نشان می‌دهد
// و برداشتن/افزودن را از همان‌جا ممکن می‌کند. هر تغییر رویداد `object_access.changed` می‌نویسد.
import { useMemo, useState } from "react";
import { FolderOpen, KanbanSquare, MessagesSquare, Plus, ShieldCheck, X } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/ui/ToastProvider";
import { useTenancy } from "../../../context/TenancyContext";
import { useProjectsPM } from "../../../context/ProjectsContext";
import { useSocial } from "../../../context/SocialContext";
import { officeStore } from "../../../context/OfficeContext";
import { useLocalStore } from "../../../iam/store";
import { principalIdOf } from "../../../iam/api";
import { Callout, Field, SectionHead, UserPicker, fmtN, userName } from "./shared";

type Kind = "project" | "customer" | "chat";
const kindMeta: Record<Kind, { label: string; icon: typeof KanbanSquare }> = {
  project: { label: "پروژه‌ها", icon: KanbanSquare },
  customer: { label: "پرونده‌های مشتری", icon: FolderOpen },
  chat: { label: "گروه‌ها و کانال‌های گفتگو", icon: MessagesSquare },
};

export function ObjectAccessSection() {
  const t = useTenancy();
  const pm = useProjectsPM();
  const s = useSocial();
  const office = useLocalStore(officeStore);
  const { notify } = useToast();
  const [who, setWho] = useState<string[]>([]);
  const [adding, setAdding] = useState<Kind | null>(null);
  const [pick, setPick] = useState("");
  const uid = who[0];
  const name = uid ? userName(uid) : "";
  const pid = uid ? principalIdOf(uid) : "";
  const candidates = useMemo(() => [...new Set(t.iam.memberships.filter((m) => t.checkMembership(m.userId, m.scopeId).ok).map((m) => m.userId))], [t]);
  const ro = t.readOnly;

  const projects = pm.projects.filter((p) => !p.meta.archived);
  const mineP = projects.filter((p) => p.members.some((m) => m.name === name || m.userId === uid) || p.meta.manager === name);
  const mineC = office.customers.filter((c) => c.owner_id === pid || c.access.includes(pid));
  const chats = s.chats.filter((c) => !c.deleted_at && !c.parent && (c.chat_type === "group" || c.chat_type === "channel"));
  const mineG = chats.filter((c) => c.members.some((m) => m.user_id === uid));

  const log = (kind: Kind, title: string, added: boolean) =>
    t.recordAudit({ event: "object_access.changed", targetType: "membership", targetId: `${kind}:${title}`, affectedUserId: uid, summary: `دسترسی «${name}» به ${kind === "project" ? "پروژه" : kind === "customer" ? "پرونده‌ی مشتری" : "گفتگوی"} «${title}» ${added ? "داده" : "برداشته"} شد.`, after: { added } });

  const removeProject = (id: string) => {
    const p = pm.getProject(id);
    const m = p?.members.find((x) => x.name === name || x.userId === uid);
    if (!p || !m) return notify(p?.meta.manager === name ? "مدیر پروژه را از تنظیمات همان پروژه تغییر دهید." : "عضویت پیدا نشد.", "warning");
    pm.removeMember(id, m.id);
    log("project", p.meta.name, false);
    notify("از پروژه برداشته شد.", "success");
  };
  const removeCustomer = (id: number) => {
    const c = office.customers.find((x) => x.id === id);
    if (!c) return;
    if (c.owner_id === pid) return notify("مسئول پرونده را با «انتقال کار به کاربر دیگر» عوض کنید.", "warning");
    officeStore.set((st) => ({ ...st, customers: st.customers.map((x) => (x.id === id ? { ...x, access: x.access.filter((p) => p !== pid) } : x)) }));
    log("customer", c.name, false);
    notify("دسترسی به پرونده برداشته شد.", "success");
  };
  const removeChat = (id: string) => {
    const c = chats.find((x) => x.id === id);
    if (!c) return;
    s.removeChatMember(id, uid);
    log("chat", c.title, false);
    notify("از گفتگو برداشته شد.", "success");
  };
  const add = () => {
    if (!adding || !pick) return;
    if (adding === "project") {
      const p = pm.getProject(pick);
      if (!p) return;
      pm.addMember(pick, { name, title: t.membershipsOf(uid).find((m) => m.primary)?.title ?? "", role: "عضو", userId: uid });
      log("project", p.meta.name, true);
    } else if (adding === "customer") {
      const c = office.customers.find((x) => String(x.id) === pick);
      if (!c) return;
      officeStore.set((st) => ({ ...st, customers: st.customers.map((x) => (x.id === c.id ? { ...x, access: [...new Set([...x.access, pid])] } : x)) }));
      log("customer", c.name, true);
    } else {
      const c = chats.find((x) => x.id === pick);
      if (!c) return;
      s.addChatMember(pick, uid);
      log("chat", c.title, true);
    }
    notify("دسترسی داده شد.", "success");
    setAdding(null);
    setPick("");
  };

  const options: { id: string; label: string }[] =
    adding === "project"
      ? projects.filter((p) => !mineP.includes(p)).map((p) => ({ id: p.meta.id, label: p.meta.name }))
      : adding === "customer"
        ? office.customers.filter((c) => !mineC.includes(c)).map((c) => ({ id: String(c.id), label: c.name }))
        : adding === "chat"
          ? chats.filter((c) => !mineG.includes(c)).map((c) => ({ id: c.id, label: `${c.chat_type === "channel" ? "کانال" : "گروه"} «${c.title}»` }))
          : [];

  const block = (kind: Kind, rows: { id: string; title: string; sub?: string; owner?: boolean; onRemove: () => void }[]) => {
    const Icon = kindMeta[kind].icon;
    return (
      <section className="card overflow-hidden">
        <div className="card-head">
          <span className="text-brand-600">
            <Icon size={20} />
          </span>
          <h3 className="t-card text-ink-900 flex-1">
            {kindMeta[kind].label} <span className="text-ink-500 font-normal text-[13px]">({fmtN(rows.length)})</span>
          </h3>
          {!ro && (
            <Button size="sm" variant="tonal" icon={<Plus size={15} />} onClick={() => (setAdding(kind), setPick(""))}>
              افزودن
            </Button>
          )}
        </div>
        {adding === kind && (
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex flex-wrap gap-2 items-center bg-ink-50">
            <select className="input-field flex-1 min-w-[12rem]" value={pick} onChange={(e) => setPick(e.target.value)} aria-label={`افزودن به ${kindMeta[kind].label}`}>
              <option value="">انتخاب…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="primary" disabled={!pick} onClick={add}>
              ثبت
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>
              انصراف
            </Button>
          </div>
        )}
        <ul className="divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] text-ink-900 truncate">{r.title}</span>
                {r.sub && <span className="block text-[12.5px] text-ink-500">{r.sub}</span>}
              </span>
              {r.owner && <Badge tone="brand">مسئول</Badge>}
              {!ro && <Button size="sm" variant="ghost" iconOnly icon={<X size={15} />} aria-label={`برداشتن دسترسی ${r.title}`} onClick={r.onRemove} />}
            </li>
          ))}
          {rows.length === 0 && <li className="px-5 py-3 text-[13px] text-ink-500">دسترسی موردی ندارد.</li>}
        </ul>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<ShieldCheck size={18} />} title="دسترسی‌های اشیا" description="پروژه‌ها، پرونده‌های مشتری و گروه‌های گفتگویی که یک نفر به آن‌ها دسترسی مستقیم دارد — برداشتن و افزودن در یک‌جا." />
      <Field label="کاربر">
        <UserPicker value={who} onChange={setWho} candidates={candidates} />
      </Field>
      {!uid && <EmptyState compact title="یک کاربر انتخاب کنید" />}
      {uid && (
        <>
          <Callout tone="neutral">دسترسی‌های ناشی از نقش سازمانی اینجا نمی‌آید (در «تخصیص نقش»)؛ این فهرست فقط عضویت/اشتراک مستقیم هر شیء است.</Callout>
          {block(
            "project",
            mineP.map((p) => ({ id: p.meta.id, title: p.meta.name, sub: p.meta.manager === name ? "مدیر پروژه" : p.members.find((m) => m.name === name)?.title, owner: p.meta.manager === name, onRemove: () => removeProject(p.meta.id) })),
          )}
          {t.hasPermission("crm.view") && block("customer", mineC.map((c) => ({ id: String(c.id), title: c.name, owner: c.owner_id === pid, onRemove: () => removeCustomer(c.id) })))}
          {block("chat", mineG.map((c) => ({ id: c.id, title: c.title, sub: c.chat_type === "channel" ? "کانال" : "گروه", owner: c.owner_id === uid, onRemove: () => removeChat(c.id) })))}
        </>
      )}
    </div>
  );
}
