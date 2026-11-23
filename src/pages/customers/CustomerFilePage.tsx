// صفحه‌ی پرونده‌ی مشتری (/customers/:id) — زبانه‌های «اطلاعات / فعالیت‌ها / فرصت‌های فروش / اسناد مالی / نامه‌ها / فایل‌ها»
import { useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CalendarPlus, Contact, FileText, ListPlus, Mail, Pencil, PhoneIncoming, PhoneOutgoing, Plus, Printer, Receipt, StickyNote, Target, Trash2, Upload } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Pill from "../../components/ui/Pill";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import ListRow, { List } from "../../components/ui/ListRow";
import Note from "../../components/ui/Note";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTabParam } from "../../lib/useTabParam";
import { useOffice } from "../../context/OfficeContext";
import { bucketOf, ledgerOf, totalsOf } from "../../office/ledger";
import {
  activityKindLabel,
  bucketLabel,
  financeDirectionLabel,
  financeFormLabel,
  opportunityStatusLabel,
  partyTypeLabel,
  type ActivityKind,
  type AttachmentApi,
  type CustomerContact,
  type FinancialDocument,
} from "../../office/types";
import { AttachmentInput, AttachmentList, Field, LabelChips, Person, PrintPortal } from "../../office/ui";
import { dateOnly, fileSize, nameOf, rial, rialShort, toFa } from "../../office/util";
import CustomerForm from "./CustomerForm";
import FinanceDocSheet, { bucketTone } from "./FinanceDocSheet";
import FinanceReport from "./FinanceReport";
import { OpportunityList } from "./CustomersPage";
import LetterSheet from "../secretariat/LetterSheet";

const TABS = ["info", "activities", "opportunities", "finance", "letters", "files"] as const;
type Tab = (typeof TABS)[number];

export default function CustomerFilePage() {
  const { id } = useParams();
  const o = useOffice();
  const [tab, setTab] = useTabParam<Tab>("info", TABS);
  const [editOpen, setEditOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const cid = Number(id);
  const c = o.customerOf(cid);

  if (!o.perms.crm || !c)
    return (
      <div>
        <PageHeader title="پرونده مشتریان" breadcrumb={[{ label: "پرونده مشتریان", to: "/customers" }, { label: "پرونده" }]} />
        <EmptyState icon={<Contact />} title="پرونده در دسترس نیست" description="این پرونده وجود ندارد یا در فهرست «قابل مشاهده برای» آن نیستید." action={<Link to="/customers" className="btn btn-outline">بازگشت به پرونده‌ها</Link>} />
      </div>
    );

  const canEdit = o.perms.crmManage || c.owner_id === o.me;
  const letters = o.visibleLetters.filter((l) => l.case_links.some((x) => x.type === "customer_file" && x.id === cid));
  const opps = o.visibleOpportunities.filter((x) => x.customer === cid);
  const docs = o.visibleFinanceDocs.filter((d) => d.customer === cid);
  const tabs = [
    { id: "info" as const, label: "اطلاعات" },
    { id: "activities" as const, label: "فعالیت‌ها" },
    { id: "opportunities" as const, label: "فرصت‌های فروش", count: opps.filter((x) => x.status === "open").length },
    ...(o.perms.financeView ? [{ id: "finance" as const, label: "اسناد مالی", count: docs.length }] : []),
    { id: "letters" as const, label: "نامه‌ها", count: letters.length },
    { id: "files" as const, label: "فایل‌ها" },
  ];
  const current: Tab = tabs.some((t) => t.id === tab) ? tab : "info";

  return (
    <div>
      <PageHeader
        title={c.name}
        description={[partyTypeLabel[c.party_type], c.trade_name, `مسئول: ${nameOf(c.owner_id)}`].filter(Boolean).join(" · ")}
        icon={<Contact />}
        breadcrumb={[{ label: "پرونده مشتریان", to: "/customers" }, { label: c.name }]}
        tabs={<Tabs tabs={tabs} active={current} onChange={setTab} ariaLabel="بخش‌های پرونده" />}
        actions={
          <>
            <Button iconOnly variant="ghost" aria-label="چاپ اطلاعات پرونده" title="چاپ اطلاعات پرونده" onClick={() => setPrinting(true)}>
              <Printer size={18} />
            </Button>
            {o.perms.secretariat && (
              <Link to={`/secretariat?new=letter&customer=${cid}`} className="btn btn-outline">
                <Mail size={18} strokeWidth={1.5} /> نامه‌ی جدید
              </Link>
            )}
            {canEdit && (
              <Button icon={<Pencil size={18} />} onClick={() => setEditOpen(true)}>
                ویرایش
              </Button>
            )}
          </>
        }
      />
      {current === "info" && <InfoTab cid={cid} canEdit={canEdit} />}
      {current === "activities" && <ActivitiesTab cid={cid} />}
      {current === "opportunities" && <OpportunityList customerId={cid} />}
      {current === "finance" && <FinanceTab cid={cid} />}
      {current === "letters" && <LettersTab cid={cid} />}
      {current === "files" && <FilesTab cid={cid} />}
      {editOpen && <CustomerForm open customer={c} onClose={() => setEditOpen(false)} />}
      {printing && (
        <PrintPortal onDone={() => setPrinting(false)}>
          <p style={{ fontSize: "16pt", fontWeight: 700 }}>{c.name}</p>
          <table>
            <tbody>
              {[
                ["نوع", partyTypeLabel[c.party_type]],
                ["نام تجاری", c.trade_name],
                [c.party_type === "company" ? "شناسه‌ی ملی" : "کد ملی", toFa(c.national_id)],
                ["کد اقتصادی", toFa(c.economic_code)],
                ["تلفن‌ها", c.phones.map((p) => `${p.label}: ${toFa(p.number)}`).join(" · ")],
                ["ایمیل", c.email],
                ["وب‌سایت", c.website],
                ["نشانی", c.address],
                ["کد پستی", toFa(c.postal_code)],
                ["برچسب‌ها", c.labels.join("، ")],
                ["مسئول", nameOf(c.owner_id)],
                ["نمایندگان", o.state.contacts.filter((x) => x.customer === cid).map((x) => `${x.name} (${x.position})`).join("، ")],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintPortal>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ اطلاعات

function InfoTab({ cid, canEdit }: { cid: number; canEdit: boolean }) {
  const o = useOffice();
  const { notify } = useToast();
  const confirm = useConfirm();
  const c = o.customerOf(cid)!;
  const contacts = o.state.contacts.filter((x) => x.customer === cid);
  const [edit, setEdit] = useState<(Omit<CustomerContact, "id"> & { id?: number }) | null>(null);
  const row = (k: string, v: string) => (
    <>
      <dt className="text-ink-500">{k}</dt>
      <dd className="text-ink-900 break-words">{v || "—"}</dd>
    </>
  );
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4">
      <div className="flex flex-col gap-4">
        <Card title="اطلاعات هویتی و تماس">
          <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-3 text-sm">
            {row("نوع", partyTypeLabel[c.party_type])}
            {row(c.party_type === "company" ? "نام ثبتی" : "نام و نام خانوادگی", c.name)}
            {c.party_type === "company" && row("نام تجاری", c.trade_name)}
            {row(c.party_type === "company" ? "شناسه‌ی ملی" : "کد ملی", c.national_id ? toFa(c.national_id) : "")}
            {c.party_type === "company" && row("کد اقتصادی", c.economic_code ? toFa(c.economic_code) : "")}
            {c.phones.map((p, i) => (
              <span key={i} className="contents">
                {row(p.label, toFa(p.number))}
              </span>
            ))}
            {row("ایمیل", c.email)}
            {row("وب‌سایت", c.website)}
            {row("نشانی", c.address)}
            {row("کد پستی", c.postal_code ? toFa(c.postal_code) : "")}
            <dt className="text-ink-500">برچسب‌ها</dt>
            <dd>
              <LabelChips ns="crm" labels={c.labels} />
            </dd>
            {c.description && row("توضیحات", c.description)}
            {row("ایجاد", `${toFa(c.created_at)} · ${nameOf(c.created_by)}`)}
          </dl>
        </Card>
        <Card
          title="نمایندگان"
          flush
          actions={
            canEdit && (
              <Button size="sm" icon={<Plus size={16} />} onClick={() => setEdit({ customer: cid, name: "", position: "", email: "", mobile: "", phone: "" })}>
                نماینده
              </Button>
            )
          }
        >
          {contacts.length ? (
            <List>
              {contacts.map((x) => (
                <ListRow
                  key={x.id}
                  title={x.name}
                  subtitle={[x.position, toFa(x.mobile), toFa(x.phone), x.email].filter((v) => v && v !== "—").join(" · ")}
                  actions={
                    canEdit && (
                      <span className="flex gap-1">
                        <Button size="sm" variant="ghost" iconOnly aria-label="ویرایش" onClick={() => setEdit(x)}>
                          <Pencil size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" iconOnly aria-label="حذف" onClick={() => confirm({ title: `حذف «${x.name}» از نمایندگان؟`, onConfirm: () => o.removeContact(x.id) })}>
                          <Trash2 size={16} />
                        </Button>
                      </span>
                    )
                  }
                />
              ))}
            </List>
          ) : (
            <p className="p-4 text-sm text-ink-500">نماینده‌ای ثبت نشده.</p>
          )}
        </Card>
      </div>
      <Card title="قابل مشاهده برای" description="فقط این افراد و مدیران پرونده‌ی مشتریان پرونده را می‌بینند.">
        <ul className="flex flex-col gap-2">
          {c.access.map((p) => (
            <li key={p}>
              <Person pid={p} size={28} sub={p === c.owner_id ? "مسئول پرونده" : undefined} />
            </li>
          ))}
        </ul>
        {canEdit && <p className="cap mt-3">برای تغییر، «ویرایش» را بزنید.</p>}
      </Card>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "ویرایش نماینده" : "نماینده‌ی جدید"}
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => {
                if (!edit) return;
                const r = o.saveContact(edit);
                if (!r.ok) return notify(r.reason, "warning");
                setEdit(null);
              }}
            >
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              انصراف
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="نام" required>
              <input className="input-field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="سِمت">
              <input className="input-field" value={edit.position} onChange={(e) => setEdit({ ...edit, position: e.target.value })} />
            </Field>
            <Field label="موبایل">
              <input className="input-field" dir="ltr" value={edit.mobile} onChange={(e) => setEdit({ ...edit, mobile: e.target.value })} />
            </Field>
            <Field label="تلفن ثابت">
              <input className="input-field" dir="ltr" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="ایمیل" className="sm:col-span-2">
              <input className="input-field" dir="ltr" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------ فعالیت‌ها

type FeedKind = "all" | "note" | "call" | "task" | "minutes" | "letter" | "finance" | "opportunity" | "file";
type FeedItem = { key: string; kind: Exclude<FeedKind, "all">; at: string; node: ReactNode };

const activityIcon: Record<ActivityKind, ReactNode> = {
  note: <StickyNote size={18} />,
  call_in: <PhoneIncoming size={18} />,
  call_out: <PhoneOutgoing size={18} />,
  task: <ListPlus size={18} />,
  minutes: <CalendarPlus size={18} />,
  file: <FileText size={18} />,
};

function ActivitiesTab({ cid }: { cid: number }) {
  const o = useOffice();
  const { notify } = useToast();
  const [filter, setFilter] = useState<FeedKind>("all");
  const [kind, setKind] = useState<"note" | "call_in" | "call_out">("note");
  const [text, setText] = useState("");
  const [att, setAtt] = useState<AttachmentApi[]>([]);
  const [letterId, setLetterId] = useState<number | null>(null);
  const [, setParams] = useSearchParams();

  const items: FeedItem[] = [
    ...o.state.activities
      .filter((a) => a.customer === cid)
      .map((a) => ({
        key: `a${a.id}`,
        kind: (a.kind === "call_in" || a.kind === "call_out" ? "call" : a.kind) as FeedItem["kind"],
        at: a.created_at,
        node: (
          <ListRow
            lead={<span className="w-9 h-9 rounded-[10px] bg-teal-50 text-teal-700 flex items-center justify-center">{activityIcon[a.kind]}</span>}
            title={a.ref ? a.ref.title : a.text}
            subtitle={
              <>
                {a.ref && a.text !== a.ref.title && <span className="block">{a.text}</span>}
                {nameOf(a.author_id)}
                {a.attachments.length > 0 && <span className="block mt-1"><AttachmentList items={a.attachments} /></span>}
              </>
            }
            badges={
              <>
                <Badge size="sm">{activityKindLabel[a.kind]}</Badge>
                {a.ref?.status && <Badge size="sm" tone="info">{a.ref.status}</Badge>}
              </>
            }
            due={toFa(a.created_at)}
          />
        ),
      })),
    ...o.visibleLetters
      .filter((l) => l.case_links.some((x) => x.type === "customer_file" && x.id === cid))
      .map((l) => {
        const reg = o.registrationOf(l.id);
        return {
          key: `l${l.id}`,
          kind: "letter" as const,
          at: l.created_at,
          node: (
            <ListRow
              onClick={() => setLetterId(l.id)}
              lead={<span className="w-9 h-9 rounded-[10px] bg-info-soft text-info-fg flex items-center justify-center"><Mail size={18} /></span>}
              title={l.subject}
              subtitle={nameOf(l.sender_id)}
              badges={<><Badge size="sm">نامه</Badge>{reg && <Badge size="sm" tone="solid"><span dir="ltr">{toFa(reg.number)}</span></Badge>}</>}
              due={toFa(l.created_at)}
            />
          ),
        };
      }),
    ...o.visibleOpportunities
      .filter((x) => x.customer === cid)
      .map((x) => ({
        key: `o${x.id}`,
        kind: "opportunity" as const,
        at: x.created_at,
        node: (
          <ListRow
            onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", "opportunities"); n.set("opp", String(x.id)); return n; }, { replace: true })}
            lead={<span className="w-9 h-9 rounded-[10px] bg-teal-50 text-teal-700 flex items-center justify-center"><Target size={18} /></span>}
            title={x.title}
            subtitle={`${rialShort(x.value_rial)} · احتمال ${toFa(x.probability)}٪ · ${nameOf(x.owner_id)}`}
            badges={<><Badge size="sm">فرصت فروش</Badge><Badge size="sm" tone={x.status === "won" ? "success" : x.status === "lost" ? "danger" : "brand"}>{opportunityStatusLabel[x.status]}</Badge></>}
            due={toFa(x.created_at)}
          />
        ),
      })),
    ...o.visibleFinanceDocs
      .filter((d) => d.customer === cid)
      .map((d) => {
        const b = bucketOf(d);
        return {
          key: `f${d.id}`,
          kind: "finance" as const,
          at: d.created_at,
          node: (
            <ListRow
              onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", "finance"); n.set("doc", String(d.id)); return n; }, { replace: true })}
              lead={<span className="w-9 h-9 rounded-[10px] bg-emerald-50 text-emerald-700 flex items-center justify-center"><Receipt size={18} /></span>}
              title={`${financeDirectionLabel[d.direction]} ${financeFormLabel[d.form]} · ${rial(d.amount_rial)}`}
              subtitle={d.description || nameOf(d.created_by)}
              badges={<><Badge size="sm">سند مالی</Badge><Badge size="sm" tone={bucketTone[b]}>{bucketLabel[b]}</Badge></>}
              due={toFa(d.date)}
            />
          ),
        };
      }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  const shown = items.filter((x) => filter === "all" || x.kind === filter);
  const count = (k: FeedKind) => (k === "all" ? items.length : items.filter((x) => x.kind === k).length);
  const pills: { id: FeedKind; label: string }[] = [
    { id: "all", label: "همه" },
    { id: "note", label: "یادداشت" },
    { id: "call", label: "گزارش تماس" },
    { id: "task", label: "وظایف" },
    { id: "minutes", label: "صورتجلسه" },
    { id: "letter", label: "نامه" },
    ...(o.perms.financeView ? [{ id: "finance" as const, label: "سند مالی" }] : []),
    { id: "opportunity", label: "فرصت فروش" },
    { id: "file", label: "فایل" },
  ];

  const add = () => {
    const r = o.addActivity({ customer: cid, kind: att.length && !text.trim() ? "file" : kind, text, attachments: att });
    if (!r.ok) return notify(r.reason, "warning");
    setText("");
    setAtt([]);
    notify("در پرونده ثبت شد.");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Pill pressed={kind === "note"} icon={<StickyNote size={16} />} onClick={() => setKind("note")}>
              یادداشت
            </Pill>
            <Pill pressed={kind === "call_in"} icon={<PhoneIncoming size={16} />} onClick={() => setKind("call_in")}>
              تماس ورودی
            </Pill>
            <Pill pressed={kind === "call_out"} icon={<PhoneOutgoing size={16} />} onClick={() => setKind("call_out")}>
              تماس خروجی
            </Pill>
          </div>
          <textarea className="input-field min-h-20" value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "note" ? "یادداشت درباره‌ی این مشتری…" : "خلاصه‌ی گزارش تماس…"} />
          <AttachmentInput value={att} onChange={setAtt} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={add}>
              ثبت در پرونده
            </Button>
            <Link to={`/activities?new=task&from=customer:${cid}`} className="btn btn-outline">
              <ListPlus size={18} strokeWidth={1.5} /> وظیفه‌ی جدید
            </Link>
            <Link to={`/events?new=meeting&from=customer:${cid}`} className="btn btn-outline">
              <CalendarPlus size={18} strokeWidth={1.5} /> جلسه‌ی جدید
            </Link>
          </div>
        </div>
      </Card>
      <div className="card">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 border-b border-[var(--color-border)]" role="group" aria-label="نوع فعالیت">
          {pills.map((p) => (
            <Pill key={p.id} pressed={filter === p.id} count={count(p.id)} onClick={() => setFilter(p.id)}>
              {p.label}
            </Pill>
          ))}
        </div>
        {shown.length ? <List>{shown.map((x) => <div key={x.key}>{x.node}</div>)}</List> : <div className="p-5"><EmptyState title="فعالیتی از این نوع نیست" compact /></div>}
      </div>
      <LetterSheet letterId={letterId} onClose={() => setLetterId(null)} />
    </div>
  );
}

// ------------------------------------------------------------------ اسناد مالی

function FinanceTab({ cid }: { cid: number }) {
  const o = useOffice();
  const [params, setParams] = useSearchParams();
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const all = o.visibleFinanceDocs.filter((d) => d.customer === cid);
  const docs = all.filter((d) => !label || d.labels.includes(label));
  const t = totalsOf(docs);
  const ledger = ledgerOf(docs);
  const docId = Number(params.get("doc")) || null;
  const opened: FinancialDocument | undefined = docId ? all.find((d) => d.id === docId) : undefined;
  const open = (d: FinancialDocument | null) => {
    const n = new URLSearchParams(params);
    if (d) n.set("doc", String(d.id));
    else n.delete("doc");
    setParams(n, { replace: true });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="t-section text-ink-900">وضعیت مالی مشتری</h2>
        <div className="flex items-center gap-2">
          <select className="input-field !w-44" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="برچسب مالی">
            <option value="">همه‌ی برچسب‌ها</option>
            {o.labelsOf("finance").map((l) => (
              <option key={l.id}>{l.title}</option>
            ))}
          </select>
          {o.perms.financeManage && (
            <Button variant="primary" icon={<Plus size={18} />} onClick={() => setCreating(true)}>
              سند مالی جدید
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="دریافت قطعی" value={rialShort(t.definite_in)} tone="success" />
        <StatCard label="پرداخت قطعی" value={rialShort(t.definite_out)} tone="brand" />
        <StatCard label="مانده (قطعی)" value={rialShort(t.balance)} tone={t.balance < 0 ? "danger" : "neutral"} hint="دریافت قطعی − پرداخت قطعی" />
        <StatCard label="احتمالی" value={rialShort(t.probable_in - t.probable_out)} hint={`دریافت ${rialShort(t.probable_in)} · پرداخت ${rialShort(t.probable_out)}`} tone="neutral" />
        <StatCard label="معوقه" value={rialShort(t.overdue_in + t.overdue_out)} tone="danger" />
      </div>
      {t.overdue_in > 0 && <Note tone="danger">این مشتری {rial(t.overdue_in)} دریافت معوقه دارد (سررسید گذشته و نقد نشده).</Note>}
      <Card title="دفتر مشتری" description="اسناد به ترتیب تاریخ؛ مانده‌ی جاری فقط با اسناد قطعی" flush>
        {ledger.length ? (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>شرح</th>
                  <th>نوع</th>
                  <th>وضعیت</th>
                  <th>دریافت</th>
                  <th>پرداخت</th>
                  <th>مانده</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((r) => (
                  <tr key={r.doc.id} className="cursor-pointer" onClick={() => open(r.doc)}>
                    <td className="whitespace-nowrap">{toFa(r.doc.date)}</td>
                    <td className={`max-w-[18rem] truncate ${r.doc.status === "cancelled" ? "line-through text-ink-400" : ""}`}>{r.doc.description || "—"}</td>
                    <td className="whitespace-nowrap">
                      {financeDirectionLabel[r.doc.direction]} · {financeFormLabel[r.doc.form]}
                    </td>
                    <td>
                      <Badge size="sm" tone={bucketTone[r.bucket]} dot>
                        {bucketLabel[r.bucket]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap text-emerald-700">{r.credit ? rialShort(r.credit) : r.doc.direction === "receipt" ? <span className="text-ink-400">({rialShort(r.doc.amount_rial)})</span> : "—"}</td>
                    <td className="whitespace-nowrap">{r.debit ? rialShort(r.debit) : r.doc.direction === "payment" ? <span className="text-ink-400">({rialShort(r.doc.amount_rial)})</span> : "—"}</td>
                    <td className={`whitespace-nowrap font-bold ${r.running < 0 ? "text-rose-700" : "text-ink-900"}`}>{rialShort(r.running)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="cap px-4 py-2">مبالغ داخل پرانتز قطعی نیستند (احتمالی، معوقه یا ابطال‌شده) و در مانده حساب نمی‌شوند.</p>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState icon={<Receipt />} title="سند مالی ثبت نشده" compact />
          </div>
        )}
      </Card>
      {docs.length > 0 && <FinanceReport docs={docs} onOpenDoc={open} />}
      {(opened || creating) && (
        <FinanceDocSheet
          key={opened?.id ?? "new"}
          doc={opened}
          customerId={cid}
          onClose={() => {
            setCreating(false);
            open(null);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ نامه‌ها

function LettersTab({ cid }: { cid: number }) {
  const o = useOffice();
  const [letterId, setLetterId] = useState<number | null>(null);
  const list = o.visibleLetters.filter((l) => l.case_links.some((x) => x.type === "customer_file" && x.id === cid)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return (
    <div className="card">
      {list.length ? (
        <List>
          {list.map((l) => {
            const reg = o.registrationOf(l.id);
            return (
              <ListRow
                key={l.id}
                onClick={() => setLetterId(l.id)}
                title={l.subject}
                subtitle={`${nameOf(l.sender_id)} ← ${l.parties.filter((p) => p.role === "to").map((p) => nameOf(p.principal_id)).join("، ")}`}
                badges={
                  <>
                    {reg && (
                      <Badge size="sm" tone="solid">
                        <span dir="ltr">{toFa(reg.number)}</span>
                      </Badge>
                    )}
                    <LabelChips ns="letter" labels={l.labels} />
                  </>
                }
                due={toFa(dateOnly(l.created_at))}
              />
            );
          })}
        </List>
      ) : (
        <div className="p-5">
          <EmptyState icon={<Mail />} title="نامه‌ای به این پرونده متصل نیست" description="هنگام نگارش یا در برگه‌ی نامه می‌توان آن را به یک یا چند پرونده متصل کرد." compact />
        </div>
      )}
      <LetterSheet letterId={letterId} onClose={() => setLetterId(null)} />
    </div>
  );
}

// ------------------------------------------------------------------ فایل‌ها

function FilesTab({ cid }: { cid: number }) {
  const o = useOffice();
  const { notify } = useToast();
  const [att, setAtt] = useState<AttachmentApi[]>([]);
  const files = [
    ...o.state.activities.filter((a) => a.customer === cid).flatMap((a) => a.attachments.map((f) => ({ f, from: a.ref?.title ?? activityKindLabel[a.kind], at: a.created_at }))),
    ...o.visibleLetters.filter((l) => l.case_links.some((x) => x.type === "customer_file" && x.id === cid)).flatMap((l) => l.attachments.map((f) => ({ f, from: `نامه: ${l.subject}`, at: l.created_at }))),
    ...o.visibleOpportunities.filter((x) => x.customer === cid).flatMap((x) => x.attachments.map((f) => ({ f, from: `فرصت: ${x.title}`, at: x.created_at }))),
    ...o.visibleFinanceDocs.filter((d) => d.customer === cid).flatMap((d) => d.attachments.map((f) => ({ f, from: `سند مالی: ${d.description || rialShort(d.amount_rial)}`, at: d.created_at }))),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <div className="flex flex-col gap-4">
      <Card title="بارگذاری فایل در پرونده" icon={<Upload />}>
        <AttachmentInput value={att} onChange={setAtt} />
        {att.length > 0 && (
          <Button
            variant="primary"
            className="mt-3"
            onClick={() => {
              const r = o.addActivity({ customer: cid, kind: "file", text: att.map((a) => a.name).join("، "), attachments: att });
              if (!r.ok) return notify(r.reason, "warning");
              setAtt([]);
              notify("فایل در پرونده ثبت شد.");
            }}
          >
            ثبت فایل‌ها
          </Button>
        )}
      </Card>
      <div className="table-wrap overflow-x-auto">
        {files.length ? (
          <table className="table-shell">
            <thead>
              <tr>
                <th>نام فایل</th>
                <th>منبع</th>
                <th className="max-md:hidden">حجم</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {files.map(({ f, from, at }) => (
                <tr key={`${f.id}-${from}`}>
                  <td dir="auto" className="text-ink-900">
                    <span className="inline-flex items-center gap-2">
                      <FileText size={16} className="text-teal-700" /> {f.name}
                    </span>
                  </td>
                  <td>{from}</td>
                  <td className="max-md:hidden">{fileSize(f.size)}</td>
                  <td className="whitespace-nowrap">{toFa(dateOnly(at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5">
            <EmptyState icon={<FileText />} title="فایلی در این پرونده نیست" compact />
          </div>
        )}
      </div>
    </div>
  );
}
