// ---------------------------------------------------------------------------
// انبار ماژول‌های «دانش و نوآوری»: فرصت پژوهشی، قرارداد فناورانه، صندوق، جایزه، آموزش
// + بانک مشترک شرکت‌ها و پژوهشگران، دفتر تصمیمات و نتایج واقعی.
// همه‌ی تغییرات از commit عبور می‌کنند، در لاگ فعالیت ماژول ثبت می‌شوند و در
// localStorage (کلید motoshub.innovation.v1) ماندگارند.
// ---------------------------------------------------------------------------
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FileSearch, Gavel, Network, Wallet } from "lucide-react";
import { useTenancy } from "./TenancyContext";
import { useInbox } from "./InboxContext";
import { nowClock } from "../pm/jalali";
import { initialInnovation, INN_VERSION } from "../innovation/seed";
import { ensureExtras } from "../innovation/extras";
import type { DataSourceKind, Decision, EcoEntity, EcoFieldDef, FieldChange, ILog, InnModule, InnStore, Outcome } from "../innovation/types";
import { keyFields, moduleTitle } from "../innovation/types";
import { completeness, displayValue, findEntityByName, toRial, uid } from "../innovation/util";
import { publishSourceRows, registerSource } from "../reports/sources";
import { ReportScheduleRunner } from "../reports/Schedules";
import type { Row } from "../reports/types";

const KEY = "motoshub.innovation.v1";

function load(): InnStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as InnStore;
      if (s.version === INN_VERSION) return ensureExtras(s);
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return ensureExtras(initialInnovation());
}

export type Subject = { id: string; title: string };
export type NotifySpec = { to: string[] | "*"; text: string; link: string };
export type EntityDraft = Omit<EcoEntity, "id" | "provenance" | "history" | "createdAt" | "createdBy"> & { id?: string };

type Ctx = InnStore & {
  today: string;
  me: string;
  stamp: () => string;
  /** تغییر انبار + ثبت در لاگ فعالیت ماژول (+ اعلان اختیاری) */
  commit: (module: InnModule, action: string, subject: Subject | undefined, recipe: (s: InnStore) => InnStore, notify?: NotifySpec) => void;
  entityById: (id?: string) => EcoEntity | undefined;
  /** موجودیت با شناسه یا (در نبود شناسه) با تطبیق نام */
  resolveEntity: (id?: string, name?: string) => EcoEntity | undefined;
  saveEntity: (draft: EntityDraft, source: DataSourceKind) => string;
  deleteEntity: (id: string) => void;
  importEntities: (drafts: EntityDraft[], fileName: string) => number;
  saveFieldDef: (f: Omit<EcoFieldDef, "id"> & { id?: string }) => void;
  deleteFieldDef: (id: string) => void;
  recordDecision: (d: Omit<Decision, "id" | "at" | "decidedBy">) => Decision;
  recordOutcome: (o: Omit<Outcome, "id" | "at" | "recordedBy">) => void;
  logsOf: (module: InnModule) => ILog[];
  resetInnovation: () => void;
};

const InnovationContext = createContext<Ctx | null>(null);

const entityLabel = (kind: EcoEntity["kind"], key: string) => keyFields[kind].find((f) => f.key === key)?.label ?? key;

export function InnovationProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<InnStore>(load);
  const { actingUser, today } = useTenancy();
  const inbox = useInbox();
  const me = actingUser.name;
  const stamp = useCallback(() => `${today} ${nowClock()}`, [today]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* فضای ذخیره پر است */
    }
  }, [store]);

  const commit = useCallback<Ctx["commit"]>(
    (module, action, subject, recipe, notify) => {
      const at = stamp();
      setStore((prev) => {
        const next = recipe(prev);
        const seq = prev.seq + 1;
        const log: ILog = { id: `il${seq}`, seq, at, actor: me, module, action, subject };
        return { ...next, seq, logs: [log, ...next.logs].slice(0, 800) };
      });
      if (notify) inbox.send(notify.to, "new_content", notify.text, notify.link);
    },
    [me, stamp, inbox]
  );

  const entityById = useCallback((id?: string) => (id ? store.entities.find((e) => e.id === id) : undefined), [store.entities]);
  const resolveEntity = useCallback((id?: string, name?: string) => entityById(id) ?? findEntityByName(store.entities, name), [entityById, store.entities]);

  const saveEntity = useCallback<Ctx["saveEntity"]>(
    (draft, source) => {
      const at = stamp();
      const id = draft.id ?? uid(draft.kind === "company" ? "e" : "r");
      const existing = draft.id ? store.entities.find((e) => e.id === draft.id) : undefined;
      const changes: FieldChange[] = [];
      const provenance = { ...(existing?.provenance ?? {}) };
      const fields = [...keyFields[draft.kind].map((f) => f.key as string), "collaborators"];
      fields.forEach((k) => {
        const before = existing ? displayValue((existing as Record<string, unknown>)[k]) : "—";
        const after = displayValue((draft as Record<string, unknown>)[k]);
        if (before !== after) {
          if (existing) changes.push({ at, by: me, field: k, label: k === "collaborators" ? "همکاران" : entityLabel(draft.kind, k), from: before, to: after, source });
          if (after !== "—") provenance[k] = { source, at, by: me };
        }
      });
      Object.keys(draft.custom ?? {}).forEach((k) => {
        const before = existing?.custom[k] ?? "";
        const after = draft.custom[k] ?? "";
        if (before !== after) {
          if (existing) changes.push({ at, by: me, field: `custom.${k}`, label: store.fieldDefs.find((f) => f.key === k)?.label ?? k, from: before || "—", to: after || "—", source });
          provenance[`custom.${k}`] = { source, at, by: me };
        }
      });
      const { id: _drop, ...rest } = draft;
      void _drop;
      const entity: EcoEntity = {
        ...rest,
        id,
        provenance,
        history: [...changes, ...(existing?.history ?? [])],
        createdAt: existing?.createdAt ?? at,
        createdBy: existing?.createdBy ?? me,
      };
      commit(
        "ecosystem",
        existing ? (changes.length ? `پروفایل را ویرایش کرد (${changes.length.toLocaleString("fa-IR")} فیلد)` : "پروفایل را بدون تغییر ذخیره کرد") : `${draft.kind === "company" ? "شرکت" : "پژوهشگر"} جدید ثبت کرد`,
        { id, title: draft.name },
        (s) => ({ ...s, entities: existing ? s.entities.map((e) => (e.id === id ? entity : e)) : [entity, ...s.entities] })
      );
      return id;
    },
    [commit, me, stamp, store.entities, store.fieldDefs]
  );

  const deleteEntity = useCallback(
    (id: string) => {
      const e = store.entities.find((x) => x.id === id);
      commit("ecosystem", "موجودیت را حذف کرد", e ? { id, title: e.name } : undefined, (s) => ({
        ...s,
        entities: s.entities.filter((x) => x.id !== id).map((x) => ({ ...x, collaborators: x.collaborators.filter((c) => c !== id) })),
      }));
    },
    [commit, store.entities]
  );

  const importEntities = useCallback<Ctx["importEntities"]>(
    (drafts, fileName) => {
      const at = stamp();
      const created: EcoEntity[] = drafts.map((d) => {
        const prov: EcoEntity["provenance"] = {};
        Object.entries(d).forEach(([k, v]) => {
          if (k === "custom") Object.keys(v as Record<string, string>).forEach((ck) => (prov[`custom.${ck}`] = { source: "اکسل/CSV", at, by: me }));
          else if (v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) prov[k] = { source: "اکسل/CSV", at, by: me };
        });
        const { id: _i, ...rest } = d;
        void _i;
        return { ...rest, id: uid(d.kind === "company" ? "e" : "r"), provenance: prov, history: [], createdAt: at, createdBy: me };
      });
      commit("ecosystem", `${created.length.toLocaleString("fa-IR")} موجودیت از فایل «${fileName}» وارد کرد`, undefined, (s) => ({ ...s, entities: [...created, ...s.entities] }));
      return created.length;
    },
    [commit, me, stamp]
  );

  const saveFieldDef = useCallback<Ctx["saveFieldDef"]>(
    (f) => {
      const id = f.id ?? uid("fd");
      commit("ecosystem", f.id ? "فیلد پویای پروفایل را ویرایش کرد" : "فیلد پویای پروفایل تعریف کرد", { id, title: f.label }, (s) => ({
        ...s,
        fieldDefs: f.id ? s.fieldDefs.map((x) => (x.id === f.id ? { ...f, id } : x)) : [...s.fieldDefs, { ...f, id }],
      }));
    },
    [commit]
  );

  const deleteFieldDef = useCallback(
    (id: string) => {
      const f = store.fieldDefs.find((x) => x.id === id);
      commit("ecosystem", "فیلد پویای پروفایل را حذف کرد", f ? { id, title: f.label } : undefined, (s) => ({ ...s, fieldDefs: s.fieldDefs.filter((x) => x.id !== id) }));
    },
    [commit, store.fieldDefs]
  );

  const recordDecision = useCallback<Ctx["recordDecision"]>(
    (d) => {
      const dec: Decision = { ...d, id: uid("dc"), at: stamp(), decidedBy: me };
      commit(d.module, d.deviates ? `تصمیم «${d.question}» را خلاف رتبه‌ی اول ثبت کرد` : `تصمیم «${d.question}» را ثبت کرد`, { id: d.subjectId, title: d.subjectTitle }, (s) => ({ ...s, decisions: [dec, ...s.decisions] }));
      return dec;
    },
    [commit, me, stamp]
  );

  const recordOutcome = useCallback<Ctx["recordOutcome"]>(
    (o) => {
      const oc: Outcome = { ...o, id: uid("oc"), at: stamp(), recordedBy: me };
      commit(o.module, `نتیجه‌ی واقعی را ثبت کرد (${o.successPct.toLocaleString("fa-IR")}٪ موفقیت)`, { id: o.subjectId, title: o.subjectTitle }, (s) => ({ ...s, outcomes: [oc, ...s.outcomes.filter((x) => !(x.module === o.module && x.subjectId === o.subjectId))] }));
    },
    [commit, me, stamp]
  );

  const logsOf = useCallback((module: InnModule) => store.logs.filter((l) => l.module === module || (module === "research" && l.module === "ecosystem")), [store.logs]);

  const resetInnovation = useCallback(() => setStore(ensureExtras(initialInnovation())), []);

  // ---------------------------------------------------- اتصال به گزارش‌ساز پویا
  useEffect(() => {
    registerSource({
      id: "innovation.entities", label: "بانک شرکت‌ها و پژوهشگران", module: "innovation", icon: Network, rowNoun: "موجودیت",
      description: "داده‌ی پایه‌ی زیست‌بوم با منشأ داده (بدون امتیاز اعتباری)",
      fields: [
        { key: "name", label: "نام", type: "dimension", kind: "string" },
        { key: "kind", label: "نوع", type: "dimension", kind: "string" },
        { key: "field", label: "حوزه", type: "dimension", kind: "string" },
        { key: "city", label: "شهر", type: "dimension", kind: "string" },
        { key: "kbType", label: "نوع دانش‌بنیان", type: "dimension", kind: "string" },
        { key: "trl", label: "TRL", type: "measure", kind: "number", format: "number" },
        { key: "employees", label: "تعداد نیرو", type: "measure", kind: "number", format: "number" },
        { key: "hIndex", label: "شاخص h", type: "measure", kind: "number", format: "number" },
        { key: "completeness", label: "کامل‌بودن پروفایل", type: "measure", kind: "number", format: "percent" },
        { key: "contracts", label: "تعداد قرارداد", type: "measure", kind: "number", format: "number" },
      ],
    });
    registerSource({
      id: "innovation.decisions", label: "دفتر تصمیمات نوآوری", module: "innovation", icon: Gavel, rowNoun: "تصمیم",
      fields: [
        { key: "module", label: "ماژول", type: "dimension", kind: "string" },
        { key: "question", label: "موضوع تصمیم", type: "dimension", kind: "string" },
        { key: "subject", label: "پرونده", type: "dimension", kind: "string" },
        { key: "chosen", label: "گزینه‌ی انتخابی", type: "dimension", kind: "string" },
        { key: "deviates", label: "خلاف رتبه‌ی اول", type: "dimension", kind: "bool" },
        { key: "committee", label: "مرجع تصمیم", type: "dimension", kind: "string" },
        { key: "decidedBy", label: "ثبت‌کننده", type: "dimension", kind: "string" },
      ],
    });
    registerSource({
      id: "innovation.outcomes", label: "نتایج واقعی (اختتام)", module: "innovation", icon: FileSearch, rowNoun: "نتیجه",
      fields: [
        { key: "module", label: "ماژول", type: "dimension", kind: "string" },
        { key: "subject", label: "پرونده", type: "dimension", kind: "string" },
        { key: "delivered", label: "تحویل", type: "dimension", kind: "string" },
        { key: "schedule", label: "زمان‌بندی", type: "dimension", kind: "string" },
        { key: "budget", label: "بودجه", type: "dimension", kind: "string" },
        { key: "successPct", label: "درصد تحقق اهداف", type: "measure", kind: "number", format: "percent" },
        { key: "quality", label: "کیفیت (از ۵)", type: "measure", kind: "number", format: "number" },
        { key: "trlGain", label: "افزایش TRL", type: "measure", kind: "number", format: "number" },
      ],
    });
    registerSource({
      id: "innovation.allocations", label: "تخصیص و پرداخت منابع", module: "innovation", icon: Wallet, rowNoun: "پرونده",
      fields: [
        { key: "module", label: "ماژول", type: "dimension", kind: "string" },
        { key: "title", label: "پرونده", type: "dimension", kind: "string" },
        { key: "holding", label: "هلدینگ", type: "dimension", kind: "string" },
        { key: "allocated", label: "تخصیص‌یافته", type: "measure", kind: "number", format: "rial" },
        { key: "paid", label: "پرداخت‌شده", type: "measure", kind: "number", format: "rial" },
      ],
    });
  }, []);

  useEffect(() => {
    const ents: Row[] = store.entities.map((e) => ({
      id: e.id,
      name: e.name, kind: e.kind === "company" ? "شرکت" : "پژوهشگر", field: e.field, city: e.city, kbType: e.kbType ?? null,
      trl: e.trl ?? null, employees: e.employees ?? null, hIndex: e.hIndex ?? null, completeness: completeness(e),
      contracts: store.contracts.filter((c) => c.vendorEntityId === e.id || (!c.vendorEntityId && findEntityByName([e], c.vendor))).length,
    }));
    publishSourceRows("innovation.entities", ents);
    publishSourceRows("innovation.decisions", store.decisions.map((d) => ({ id: d.id, mod: d.module, subjectId: d.subjectId, module: moduleTitle[d.module], question: d.question, subject: d.subjectTitle, chosen: d.chosenLabel, deviates: d.deviates, committee: d.committee ?? "—", decidedBy: d.decidedBy })));
    publishSourceRows("innovation.outcomes", store.outcomes.map((o) => ({ id: o.id, mod: o.module, subjectId: o.subjectId, module: moduleTitle[o.module], subject: o.subjectTitle, delivered: o.delivered, schedule: o.schedule, budget: o.budget, successPct: o.successPct, quality: o.quality, trlGain: o.trlAfter !== undefined && o.trlBefore !== undefined ? o.trlAfter - o.trlBefore : null })));
    const alloc: Row[] = [
      ...store.contracts.map((c) => ({ id: c.id, mod: "contracts", module: "قرارداد", title: c.title, holding: c.holdingId ?? "—", allocated: c.value, paid: c.payments.filter((p) => p.status === "پرداخت‌شده").reduce((a, p) => a + p.amount, 0) })),
      ...store.nfProjects.map((p) => ({ id: p.id, mod: "nf", module: "صندوق نوآور", title: p.titleFa, holding: p.holdingId ?? "—", allocated: toRial(p.budget), paid: toRial(p.finance.paid) })),
      ...store.employment.map((f) => ({ id: f.id, mod: "employment", module: "صندوق اشتغال", title: f.title, holding: f.holdingId ?? "—", allocated: f.approved, paid: f.tranches.filter((t) => t.status === "پرداخت‌شده").reduce((a, t) => a + t.amount, 0) })),
      ...store.calls.map((c) => ({ id: c.id, mod: "research", module: "فرصت پژوهشی", title: c.title, holding: c.holdingId ?? "—", allocated: c.budget, paid: c.paid })),
    ];
    publishSourceRows("innovation.allocations", alloc);
  }, [store.entities, store.contracts, store.decisions, store.outcomes, store.nfProjects, store.employment, store.calls]);

  const value = useMemo<Ctx>(
    () => ({ ...store, today, me, stamp, commit, entityById, resolveEntity, saveEntity, deleteEntity, importEntities, saveFieldDef, deleteFieldDef, recordDecision, recordOutcome, logsOf, resetInnovation }),
    [store, today, me, stamp, commit, entityById, resolveEntity, saveEntity, deleteEntity, importEntities, saveFieldDef, deleteFieldDef, recordDecision, recordOutcome, logsOf, resetInnovation]
  );

  return (
    <InnovationContext.Provider value={value}>
      {children}
      {/* اجراکننده‌ی زمان‌بندی ارسال گزارش‌ها — این Provider در سطح کل برنامه است، پس «هنگام بارگذاری برنامه» اجرا می‌شود */}
      <ReportScheduleRunner />
    </InnovationContext.Provider>
  );
}

export function useInnovation() {
  const ctx = useContext(InnovationContext);
  if (!ctx) throw new Error("useInnovation must be used within InnovationProvider");
  return ctx;
}
