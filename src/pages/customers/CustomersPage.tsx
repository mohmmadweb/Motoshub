// «پرونده مشتریان» — زبانه‌های «پرونده‌ها / فرصت‌های فروش / اسناد مالی».
// دیپ‌لینک: ?new=customer فرم پرونده‌ی جدید را باز می‌کند (C3).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Contact, Download, FileUp, Plus, Target, Users } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import FilterBar from "../../components/ui/FilterBar";
import ListRow, { List } from "../../components/ui/ListRow";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import AccessDenied from "../../components/ui/AccessDenied";
import { useTabParam } from "../../lib/useTabParam";
import { downloadXlsx } from "../../reports/xlsx";
import { useOffice } from "../../context/OfficeContext";
import { crmApiList } from "../../office/endpoints";
import { byProbability, totalsOf, weightedOf } from "../../office/ledger";
import { opportunityStatusLabel, partyTypeLabel, type FinancialDocument, type OpportunityStatus, type PartyType } from "../../office/types";
import { ApiButton, LabelChips } from "../../office/ui";
import { nameOf, rialShort, toFa } from "../../office/util";
import CustomerForm from "./CustomerForm";
import ImportWizard from "./ImportWizard";
import OpportunitySheet from "./OpportunitySheet";
import FinanceDocSheet from "./FinanceDocSheet";
import FinanceReport, { FinanceDocsTable } from "./FinanceReport";
import { FinanceMonitor, SalesMonitor } from "./monitoring";

const TABS = ["files", "opportunities", "finance"] as const;
type Tab = (typeof TABS)[number];

export default function CustomersPage() {
  const o = useOffice();
  const nav = useNavigate();
  const [tab, setTab] = useTabParam<Tab>("files", TABS);
  const [params, setParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") !== "customer") return;
    setFormOpen(true);
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
  }, [params, setParams]);

  if (!o.perms.crm) return <AccessDenied module="پرونده مشتریان" />;

  const tabs = [
    { id: "files" as const, label: "پرونده‌ها", count: o.visibleCustomers.length },
    { id: "opportunities" as const, label: "فرصت‌های فروش", count: o.visibleOpportunities.filter((x) => x.status === "open").length },
    ...(o.perms.financeView ? [{ id: "finance" as const, label: "اسناد مالی", count: o.visibleFinanceDocs.length }] : []),
  ];
  const current: Tab = tabs.some((t) => t.id === tab) ? tab : "files";

  const exportXlsx = () =>
    downloadXlsx("پرونده-مشتریان", [
      {
        name: "پرونده‌ها",
        rows: [
          { cells: ["نام", "نوع", "نام تجاری", "شناسه/کد ملی", "کد اقتصادی", "تلفن", "ایمیل", "نشانی", "کد پستی", "برچسب‌ها", "مسئول"], bold: true },
          ...o.visibleCustomers.map((c) => ({ cells: [c.name, partyTypeLabel[c.party_type], c.trade_name, c.national_id, c.economic_code, c.phones.map((p) => `${p.label}: ${p.number}`).join(" | "), c.email, c.address, c.postal_code, c.labels.join("، "), nameOf(c.owner_id)] })),
        ],
      },
    ]);

  return (
    <div>
      <PageHeader
        title="پرونده مشتریان"
        description="پرونده‌ی هر مشتری با نمایندگان، فعالیت‌ها، نامه‌ها، فرصت‌های فروش و اسناد مالی."
        icon={<Contact />}
        tabs={<Tabs tabs={tabs} active={current} onChange={setTab} ariaLabel="بخش‌های پرونده مشتریان" />}
        actions={
          <>
            <ApiButton items={crmApiList} />
            {current === "files" && (
              <Button icon={<Download size={18} />} onClick={exportXlsx}>
                خروجی Excel
              </Button>
            )}
            {o.perms.crmImport && current === "files" && (
              <Button icon={<FileUp size={18} />} onClick={() => setImportOpen(true)}>
                ورود از Excel
              </Button>
            )}
            {o.perms.crmManage && current === "files" && (
              <Button variant="primary" icon={<Plus size={18} />} onClick={() => setFormOpen(true)}>
                پرونده‌ی جدید
              </Button>
            )}
          </>
        }
      />
      {current === "files" && <FilesTab />}
      {current === "opportunities" && <OpportunitiesTab />}
      {current === "finance" && <FinanceTab />}
      {formOpen && <CustomerForm open onClose={() => setFormOpen(false)} onSaved={(id) => nav(`/customers/${id}`)} />}
      {importOpen && <ImportWizard open onClose={() => setImportOpen(false)} />}
    </div>
  );
}

// ------------------------------------------------------------------ پرونده‌ها

function FilesTab() {
  const o = useOffice();
  const nav = useNavigate();
  const [kind, setKind] = useState<"all" | PartyType>("all");
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState("");
  const all = o.visibleCustomers;
  const labels = [...new Set(all.flatMap((c) => c.labels))];
  const owners = [...new Set(all.map((c) => c.owner_id))];
  const list = all.filter((c) => {
    if (kind !== "all" && c.party_type !== kind) return false;
    if (label && !c.labels.includes(label)) return false;
    if (owner && c.owner_id !== owner) return false;
    if (q.trim()) {
      const hay = `${c.name} ${c.trade_name} ${c.national_id} ${c.economic_code} ${c.phones.map((p) => p.number).join(" ")} ${c.email}`;
      if (!hay.includes(q.trim())) return false;
    }
    return true;
  });
  const active = (label ? 1 : 0) + (owner ? 1 : 0);
  return (
    <div className="card">
      <FilterBar<"all" | PartyType>
        pills={[
          { id: "all", label: "همه", count: all.length },
          { id: "company", label: "حقوقی", count: all.filter((c) => c.party_type === "company").length },
          { id: "person", label: "حقیقی", count: all.filter((c) => c.party_type === "person").length },
        ]}
        active={kind}
        onPill={setKind}
        search={q}
        onSearch={setQ}
        searchPlaceholder="نام، شناسه، تلفن یا ایمیل…"
        activeCount={active}
        onClear={active || q ? () => { setLabel(""); setOwner(""); setQ(""); } : undefined}
      >
        <select className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="برچسب">
          <option value="">همه‌ی برچسب‌ها</option>
          {labels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select className="input-field" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="مسئول">
          <option value="">همه‌ی مسئولان</option>
          {owners.map((p) => (
            <option key={p} value={p}>
              {nameOf(p)}
            </option>
          ))}
        </select>
      </FilterBar>
      {list.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<Users />} title="پرونده‌ای پیدا نشد" compact />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>نام</th>
                <th>نوع</th>
                <th className="max-md:hidden">تلفن</th>
                <th className="max-md:hidden">برچسب‌ها</th>
                <th>مسئول</th>
                <th>فرصت‌های باز</th>
                {o.perms.financeView && <th className="max-md:hidden">مانده‌ی قطعی</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const opps = o.visibleOpportunities.filter((x) => x.customer === c.id && x.status === "open");
                const bal = o.perms.financeView ? totalsOf(o.visibleFinanceDocs.filter((d) => d.customer === c.id)).balance : 0;
                return (
                  <tr key={c.id} className="cursor-pointer" onClick={() => nav(`/customers/${c.id}`)}>
                    <td>
                      <span className="block font-medium text-ink-900">{c.name}</span>
                      {c.trade_name && <span className="block text-xs text-ink-500">{c.trade_name}</span>}
                    </td>
                    <td>
                      <Badge size="sm" tone={c.party_type === "company" ? "info" : "neutral"}>
                        {partyTypeLabel[c.party_type]}
                      </Badge>
                    </td>
                    <td className="max-md:hidden whitespace-nowrap" dir="ltr">
                      {toFa(c.phones[0]?.number)}
                    </td>
                    <td className="max-md:hidden">
                      <LabelChips ns="crm" labels={c.labels} />
                    </td>
                    <td className="whitespace-nowrap">{nameOf(c.owner_id)}</td>
                    <td className="whitespace-nowrap">{opps.length ? `${toFa(opps.length)} · ${rialShort(opps.reduce((s, x) => s + x.value_rial, 0))}` : "—"}</td>
                    {o.perms.financeView && <td className={`max-md:hidden whitespace-nowrap ${bal < 0 ? "text-rose-700" : ""}`}>{bal ? rialShort(bal) : "—"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ فرصت‌ها

export function OpportunityList({ customerId }: { customerId?: number }) {
  const o = useOffice();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<"all" | OpportunityStatus>("open");
  const [prob, setProb] = useState(-1);
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const openId = Number(params.get("opp")) || null;
  const setOpen = (id: number | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("opp", String(id));
    else next.delete("opp");
    setParams(next, { replace: true });
  };
  const all = o.visibleOpportunities.filter((x) => !customerId || x.customer === customerId);
  const probs = [...new Set(all.map((x) => x.probability))].sort((a, b) => b - a);
  const list = all.filter((x) => (status === "all" || x.status === status) && (prob < 0 || x.probability === prob) && (!label || x.labels.includes(label)) && (!owner || x.owner_id === owner) && (!q.trim() || x.title.includes(q.trim())));
  const groups = useMemo(() => byProbability(list), [list]);
  const opened = openId ? o.visibleOpportunities.find((x) => x.id === openId) : undefined;
  const active = (prob >= 0 ? 1 : 0) + (label ? 1 : 0) + (owner ? 1 : 0);
  return (
    <div className="card">
      <FilterBar<"all" | OpportunityStatus>
        pills={[
          { id: "open", label: "باز", count: all.filter((x) => x.status === "open").length, dot: "brand" },
          { id: "won", label: "موفق", count: all.filter((x) => x.status === "won").length, dot: "success" },
          { id: "lost", label: "ناموفق", count: all.filter((x) => x.status === "lost").length, dot: "danger" },
          { id: "all", label: "همه", count: all.length },
        ]}
        active={status}
        onPill={setStatus}
        search={q}
        onSearch={setQ}
        searchPlaceholder="عنوان فرصت…"
        activeCount={active}
        onClear={active || q ? () => { setProb(-1); setLabel(""); setOwner(""); setQ(""); } : undefined}
      >
        <select className="input-field" value={prob} onChange={(e) => setProb(Number(e.target.value))} aria-label="احتمال">
          <option value={-1}>همه‌ی احتمال‌ها</option>
          {probs.map((p) => (
            <option key={p} value={p}>
              {toFa(p)}٪
            </option>
          ))}
        </select>
        <select className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="برچسب">
          <option value="">همه‌ی برچسب‌ها</option>
          {o.labelsOf("sales").map((l) => (
            <option key={l.id}>{l.title}</option>
          ))}
        </select>
        <select className="input-field" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="مسئول پیگیری">
          <option value="">همه‌ی مسئولان</option>
          {[...new Set(all.map((x) => x.owner_id))].map((p) => (
            <option key={p} value={p}>
              {nameOf(p)}
            </option>
          ))}
        </select>
        <Button size="sm" variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)} disabled={!o.visibleCustomers.length}>
          فرصت جدید
        </Button>
      </FilterBar>
      {groups.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<Target />} title="فرصتی با این فیلتر نیست" compact />
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.probability}>
            <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-2 bg-ink-50 border-b border-[var(--color-border)]">
              <span className="text-sm font-bold text-ink-800">
                احتمال {toFa(g.probability)}٪ · {toFa(g.items.length)} فرصت
              </span>
              <span className="text-xs text-ink-600">
                ارزش {rialShort(g.value)} · وزنی {rialShort(g.weighted)}
              </span>
            </div>
            <List>
              {g.items.map((x) => (
                <ListRow
                  key={x.id}
                  onClick={() => setOpen(x.id)}
                  title={x.title}
                  subtitle={`${customerId ? "" : `${o.state.customers.find((c) => c.id === x.customer)?.name ?? ""} · `}${nameOf(x.owner_id)} · وزنی ${rialShort(weightedOf(x))}`}
                  badges={
                    <>
                      <Badge size="sm" tone={x.status === "won" ? "success" : x.status === "lost" ? "danger" : "brand"}>
                        {opportunityStatusLabel[x.status]}
                      </Badge>
                      <LabelChips ns="sales" labels={x.labels} />
                    </>
                  }
                  due={`${rialShort(x.value_rial)} · ${toFa(x.expected_close_date)}`}
                />
              ))}
            </List>
          </section>
        ))
      )}
      {(opened || creating) && (
        <OpportunitySheet
          key={opened?.id ?? "new"}
          opportunity={opened}
          customerId={customerId}
          onClose={() => {
            setCreating(false);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

function OpportunitiesTab() {
  return (
    <div className="flex flex-col gap-6">
      <SalesMonitor compact />
      <OpportunityList />
    </div>
  );
}

// ------------------------------------------------------------------ اسناد مالی

function FinanceTab() {
  const o = useOffice();
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState<FinancialDocument | null>(null);
  const [creating, setCreating] = useState(false);
  const docs = o.visibleFinanceDocs.filter((d) => !label || d.labels.includes(label));
  return (
    <div className="flex flex-col gap-6">
      <FinanceMonitor onOpenDoc={setOpen} compact label={label} />
      <div className="card">
        <FilterBar onClear={label ? () => setLabel("") : undefined} activeCount={label ? 1 : 0}>
          <select className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="برچسب مالی">
            <option value="">همه‌ی برچسب‌های مالی</option>
            {o.labelsOf("finance").map((l) => (
              <option key={l.id}>{l.title}</option>
            ))}
          </select>
          {o.perms.financeManage && (
            <Button size="sm" variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              سند مالی جدید
            </Button>
          )}
        </FilterBar>
        <div className="p-4 flex flex-col gap-6">
          <FinanceReport docs={docs} onOpenDoc={setOpen} />
          <div>
            <h3 className="t-card text-ink-900 mb-2">جدول مبالغ ثبت‌شده</h3>
            <FinanceDocsTable docs={docs} onOpen={setOpen} />
          </div>
        </div>
      </div>
      {(open || creating) && (
        <FinanceDocSheet
          key={open?.id ?? "new"}
          doc={open ?? undefined}
          onClose={() => {
            setOpen(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
