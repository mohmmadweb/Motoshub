// «دبیرخانه» — کارتابل نامه‌ها (دریافتی/ارسالی)، وارده، صادره، ثبت‌شده‌های دبیرخانه، بایگانی.
// دیپ‌لینک‌ها: ?new=letter[&customer=<id>] نگارش نامه را باز می‌کند (C3) · ?letter=<id> برگه‌ی نامه.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Hash, Inbox, Mail, Paperclip, PenLine, Stamp } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import FilterBar from "../../components/ui/FilterBar";
import ListRow, { List } from "../../components/ui/ListRow";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import AccessDenied from "../../components/ui/AccessDenied";
import Avatar from "../../components/Avatar";
import { useTabParam } from "../../lib/useTabParam";
import { useOffice } from "../../context/OfficeContext";
import { secretariatApiList } from "../../office/endpoints";
import type { Letter } from "../../office/types";
import { ApiButton, LabelChips } from "../../office/ui";
import { dateOnly, nameOf, toFa, userOfPrincipal } from "../../office/util";
import NumberSeriesSection from "../../office/settings/NumberSeriesSection";
import ComposeLetter from "./ComposeLetter";
import LetterSheet from "./LetterSheet";
import RegisterDialog from "./RegisterDialog";
import RegistryList from "./RegistryList";

const TABS = ["cartable", "incoming", "outgoing", "registry", "archive"] as const;
type Tab = (typeof TABS)[number];
type Box = "received" | "unread" | "referred" | "cc" | "sent";

export default function SecretariatPage() {
  const o = useOffice();
  const [tab, setTab] = useTabParam<Tab>("cartable", TABS);
  const [params, setParams] = useSearchParams();
  const [composeFor, setComposeFor] = useState<number | null | undefined>(undefined);
  const [regDir, setRegDir] = useState<"incoming" | "outgoing" | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [box, setBox] = useState<Box>("received");
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [customer, setCustomer] = useState(0);
  const [sender, setSender] = useState("");
  const openId = params.get("letter") ? Number(params.get("letter")) : null;

  // C3: ?new=letter[&customer=<id>]
  useEffect(() => {
    if (params.get("new") !== "letter") return;
    const c = Number(params.get("customer")) || null;
    setComposeFor(c);
    const next = new URLSearchParams(params);
    next.delete("new");
    next.delete("customer");
    setParams(next, { replace: true });
  }, [params, setParams]);

  const openLetter = (id: number | null) => {
    const next = new URLSearchParams(params);
    if (id === null) next.delete("letter");
    else next.set("letter", String(id));
    setParams(next, { replace: true });
  };

  const me = o.me;
  const mine = (l: Letter) => l.parties.find((p) => p.principal_id === me);
  const inArchive = (l: Letter) => l.archived || l.archived_by.includes(me);
  const received = o.visibleLetters.filter((l) => !!mine(l) && !inArchive(l));
  const sent = o.visibleLetters.filter((l) => l.sender_id === me && !inArchive(l));
  const archived = o.visibleLetters.filter((l) => inArchive(l) && (l.sender_id === me || !!mine(l) || o.perms.register));
  const unread = received.filter((l) => !mine(l)?.seen_at);

  if (!o.perms.secretariat) return <AccessDenied module="دبیرخانه" />;

  const boxList: Record<Box, Letter[]> = {
    received,
    unread,
    referred: received.filter((l) => mine(l)?.via_referral),
    cc: received.filter((l) => mine(l)?.role === "cc"),
    sent,
  };
  const base = tab === "archive" ? archived : boxList[box];
  const filtered = base
    .filter((l) => {
      if (label && !l.labels.includes(label)) return false;
      if (customer && !l.case_links.some((c) => c.type === "customer_file" && c.id === customer)) return false;
      if (sender && l.sender_id !== sender) return false;
      if (q.trim()) {
        const reg = o.registrationOf(l.id);
        const hay = `${l.subject} ${l.body} ${reg?.number ?? ""} ${reg ? toFa(reg.number) : ""} ${nameOf(l.sender_id)}`;
        if (!hay.includes(q.trim())) return false;
      }
      return true;
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const senders = [...new Set(base.map((l) => l.sender_id))];
  const letterLabels = [...new Set(base.flatMap((l) => l.labels))];
  const customers = [...new Set(base.flatMap((l) => l.case_links.filter((c) => c.type === "customer_file").map((c) => c.id)))];
  const activeCount = (label ? 1 : 0) + (customer ? 1 : 0) + (sender ? 1 : 0);

  const tabs = [
    { id: "cartable" as const, label: "کارتابل نامه‌ها", count: unread.length || undefined },
    ...(o.perms.register
      ? [
          { id: "incoming" as const, label: "وارده", count: o.state.registrations.filter((r) => r.direction === "incoming").length },
          { id: "outgoing" as const, label: "صادره", count: o.state.registrations.filter((r) => r.direction === "outgoing").length },
          { id: "registry" as const, label: "ثبت‌شده‌های دبیرخانه" },
        ]
      : []),
    { id: "archive" as const, label: "بایگانی", count: archived.length },
  ];
  const current: Tab = tabs.some((t) => t.id === tab) ? tab : "cartable";

  const row = (l: Letter) => {
    const p = mine(l);
    const reg = o.registrationOf(l.id);
    const showSender = box !== "sent" || tab === "archive";
    const who = showSender ? l.sender_id : l.parties[0]?.principal_id;
    const seenCount = l.parties.filter((x) => x.seen_at).length;
    return (
      <ListRow
        key={l.id}
        onClick={() => openLetter(l.id)}
        unread={!!p && !p.seen_at && tab !== "archive"}
        priority={l.labels.includes("فوری") ? "زیاد" : undefined}
        lead={<Avatar name={userOfPrincipal(who ?? "")?.name ?? "؟"} color={userOfPrincipal(who ?? "")?.avatarColor} size={36} />}
        title={l.subject}
        subtitle={
          showSender
            ? `${nameOf(l.sender_id)}${p?.via_referral ? " · ارجاعی" : p?.role === "cc" ? " · رونوشت" : ""}`
            : `به ${l.parties.filter((x) => x.role === "to").map((x) => nameOf(x.principal_id)).join("، ")} · دیده‌شده ${toFa(seenCount)} از ${toFa(l.parties.length)}`
        }
        badges={
          <>
            {reg && (
              <Badge tone="solid" size="sm">
                <span dir="ltr">{toFa(reg.number)}</span>
              </Badge>
            )}
            <LabelChips ns="letter" labels={l.labels} />
            {l.attachments.length > 0 && <Paperclip size={14} className="text-ink-500" aria-label="پیوست دارد" />}
          </>
        }
        due={toFa(dateOnly(l.created_at))}
      />
    );
  };

  return (
    <div>
      <PageHeader
        title="دبیرخانه"
        description="نامه‌های داخلی، ثبت وارده و صادره با شماره‌ی دبیرخانه، و اتصال نامه‌ها به پرونده‌ی مشتری."
        icon={<Mail />}
        tabs={<Tabs tabs={tabs} active={current} onChange={setTab} ariaLabel="بخش‌های دبیرخانه" />}
        actions={
          <>
            <ApiButton items={secretariatApiList} />
            {o.perms.seriesManage && (
              <Button icon={<Hash size={18} />} onClick={() => setSeriesOpen(true)}>
                سری‌های شماره
              </Button>
            )}
            {o.perms.register && (
              <Button icon={<Stamp size={18} />} onClick={() => setRegDir(current === "outgoing" ? "outgoing" : "incoming")}>
                ثبت در دبیرخانه
              </Button>
            )}
            <Button variant="primary" icon={<PenLine size={18} />} onClick={() => setComposeFor(null)}>
              نامه‌ی جدید
            </Button>
          </>
        }
      />

      {(current === "cartable" || current === "archive") && (
        <div className="card">
          <FilterBar<Box>
            pills={
              current === "cartable"
                ? [
                    { id: "received", label: "دریافتی", count: received.length },
                    { id: "unread", label: "خوانده‌نشده", count: unread.length, dot: "brand" },
                    { id: "referred", label: "ارجاعی", count: boxList.referred.length, dot: "warning" },
                    { id: "cc", label: "رونوشت", count: boxList.cc.length },
                    { id: "sent", label: "ارسالی", count: sent.length },
                  ]
                : undefined
            }
            active={box}
            onPill={setBox}
            search={q}
            onSearch={setQ}
            searchPlaceholder="موضوع، متن، شماره یا فرستنده…"
            activeCount={activeCount}
            onClear={activeCount || q ? () => { setLabel(""); setCustomer(0); setSender(""); setQ(""); } : undefined}
          >
            <select className="input-field" value={sender} onChange={(e) => setSender(e.target.value)} aria-label="فرستنده">
              <option value="">همه‌ی فرستنده‌ها</option>
              {senders.map((s) => (
                <option key={s} value={s}>
                  {nameOf(s)}
                </option>
              ))}
            </select>
            <select className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="برچسب">
              <option value="">همه‌ی برچسب‌ها</option>
              {letterLabels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <select className="input-field" value={customer} onChange={(e) => setCustomer(Number(e.target.value))} aria-label="پرونده‌ی مشتری">
              <option value={0}>همه‌ی پرونده‌ها</option>
              {customers.map((id) => (
                <option key={id} value={id}>
                  {o.state.customers.find((c) => c.id === id)?.name ?? toFa(id)}
                </option>
              ))}
            </select>
          </FilterBar>
          {filtered.length ? (
            <List>{filtered.map(row)}</List>
          ) : (
            <div className="p-5">
              <EmptyState icon={<Inbox />} title={current === "archive" ? "بایگانی خالی است" : "نامه‌ای در این بخش نیست"} compact />
            </div>
          )}
        </div>
      )}
      {current === "incoming" && <RegistryList key="in" direction="incoming" onOpen={openLetter} />}
      {current === "outgoing" && <RegistryList key="out" direction="outgoing" onOpen={openLetter} />}
      {current === "registry" && <RegistryList key="all" onOpen={openLetter} />}

      {composeFor !== undefined && <ComposeLetter open onClose={() => setComposeFor(undefined)} customerId={composeFor ?? undefined} onSent={(id) => openLetter(id)} />}
      {regDir && <RegisterDialog open direction={regDir} onClose={() => setRegDir(null)} onDone={(id) => openLetter(id)} />}
      <LetterSheet letterId={openId} onClose={() => openLetter(null)} />
      <Modal open={seriesOpen} onClose={() => setSeriesOpen(false)} title="سری‌های شماره" wide>
        <NumberSeriesSection />
      </Modal>
    </div>
  );
}
