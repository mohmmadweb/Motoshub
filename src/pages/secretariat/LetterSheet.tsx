// برگه‌ی نامه: سرآیند (شماره، برچسب‌ها)، گیرندگان با زمان مشاهده، متن، پیوست، پرونده‌های متصل،
// خط زمان پاراف/ارجاع/ثبت، و اقدام‌ها (پاراف، ارجاع، ثبت شماره، چاپ، بایگانی، حذف مجاز).
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Archive, ArchiveRestore, CornerDownLeft, Eye, EyeOff, Forward, Printer, Reply, Stamp, Trash2 } from "lucide-react";
import Sheet, { SheetSection } from "../../components/ui/Sheet";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Note from "../../components/ui/Note";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useOffice } from "../../context/OfficeContext";
import { directionLabel, letterKindLabel, partyRoleLabel } from "../../office/types";
import { AttachmentList, CustomerPicker, Field, LabelChips, PeoplePicker, Person } from "../../office/ui";
import { dateOnly, nameOf, toFa } from "../../office/util";
import RegisterDialog from "./RegisterDialog";
import { LetterPrint } from "./LetterPrint";

type Ev = { at: string; key: string; node: ReactNode };

export default function LetterSheet({ letterId, onClose }: { letterId: number | null; onClose: () => void }) {
  const o = useOffice();
  const { notify } = useToast();
  const confirm = useConfirm();
  const letter = letterId !== null ? o.visibleLetters.find((l) => l.id === letterId) : undefined;
  const [reply, setReply] = useState<{ parent: number | null } | null>(null);
  const [text, setText] = useState("");
  const [referOpen, setReferOpen] = useState(false);
  const [referTo, setReferTo] = useState<string[]>([]);
  const [referNote, setReferNote] = useState("");
  const [regOpen, setRegOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [links, setLinks] = useState<number[]>([]);
  const [printing, setPrinting] = useState(false);

  const markSeen = o.markSeen;
  useEffect(() => {
    if (letterId !== null) markSeen(letterId);
  }, [letterId, markSeen]);

  if (letterId === null) return null;
  if (!letter)
    return (
      <Sheet open onClose={onClose} title="نامه در دسترس نیست">
        <Note tone="warning">این نامه وجود ندارد یا اجازه‌ی دیدن آن را ندارید. نامه‌ی شماره‌نخورده فقط برای فرستنده و گیرندگانش دیده می‌شود.</Note>
      </Sheet>
    );

  const reg = o.registrationOf(letter.id);
  const series = reg ? o.state.series.find((s) => s.id === reg.series) : undefined;
  const paraphs = o.state.paraphs.filter((p) => p.letter === letter.id);
  const referrals = o.state.referrals.filter((r) => r.letter === letter.id);
  const del = o.deleteCheck(letter);
  const myArchived = letter.archived_by.includes(o.me);
  const customers = letter.case_links.filter((c) => c.type === "customer_file").map((c) => o.state.customers.find((x) => x.id === c.id)).filter((c) => !!c);

  const sendParaph = () => {
    const r = o.addParaph(letter.id, text, reply?.parent ?? null);
    if (!r.ok) return notify(r.reason, "warning");
    setText("");
    setReply(null);
    notify("پاراف ثبت شد.");
  };

  const events: Ev[] = [
    ...paraphs
      .filter((p) => p.parent === null)
      .map((p) => ({
        at: p.created_at,
        key: `p${p.id}`,
        node: (
          <div className="rounded-[10px] border border-[var(--color-border)] p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <Person pid={p.author_id} size={24} sub={toFa(p.created_at)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReply({ parent: p.id })}>
                <Reply size={16} /> پاسخ
              </button>
            </div>
            <p className="text-sm text-ink-800 leading-7 whitespace-pre-wrap">{p.text}</p>
            <AttachmentList items={p.attachments} />
            {paraphs
              .filter((c) => c.parent === p.id)
              .map((c) => (
                <div key={c.id} className="mt-2 ms-6 ps-3 border-s-2 border-teal-500/40">
                  <Person pid={c.author_id} size={20} sub={toFa(c.created_at)} />
                  <p className="text-sm text-ink-800 leading-7 whitespace-pre-wrap mt-1">{c.text}</p>
                </div>
              ))}
          </div>
        ),
      })),
    ...referrals.map((r) => ({
      at: r.created_at,
      key: `r${r.id}`,
      node: (
        <Note tone="warning" icon={<Forward size={18} />} title={`ارجاع: ${nameOf(r.from_id)} ← ${r.to_ids.map(nameOf).join("، ")}`}>
          {r.note && <p>{r.note}</p>}
          <p className="text-xs opacity-80">{toFa(r.created_at)}</p>
        </Note>
      ),
    })),
    ...(reg
      ? [
          {
            at: reg.registered_at,
            key: "reg",
            node: (
              <Note tone="info" icon={<Stamp size={18} />} title={`ثبت ${directionLabel[reg.direction]} با شماره‌ی ${toFa(reg.number)}`}>
                <p>
                  {series?.title} · {nameOf(reg.registered_by)} · {toFa(reg.registered_at)}
                </p>
                {reg.external_org && (
                  <p>
                    {reg.direction === "incoming" ? "فرستنده" : "گیرنده"}: {reg.external_org}
                    {reg.external_number && ` · شماره‌ی ${toFa(reg.external_number)}`}
                    {reg.external_date && ` · ${toFa(reg.external_date)}`}
                  </p>
                )}
              </Note>
            ),
          },
        ]
      : []),
  ].sort((a, b) => (a.at < b.at ? -1 : 1));

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        eyebrow={`نامه‌ی ${letterKindLabel[letter.kind]} · ${reg ? toFa(reg.number) : "ثبت‌نشده"}`}
        title={letter.subject}
        footer={
          <>
            <Button variant="primary" icon={<CornerDownLeft size={18} />} onClick={() => setReply({ parent: null })}>
              پاراف
            </Button>
            <Button icon={<Forward size={18} />} onClick={() => setReferOpen(true)}>
              ارجاع
            </Button>
            {!reg && o.perms.register && (
              <Button icon={<Stamp size={18} />} onClick={() => setRegOpen(true)}>
                ثبت شماره
              </Button>
            )}
            <Button variant="ghost" iconOnly aria-label="چاپ" title="چاپ" onClick={() => setPrinting(true)}>
              <Printer size={18} />
            </Button>
            <Button variant="ghost" iconOnly aria-label={myArchived ? "خروج از بایگانی من" : "بایگانی"} title={myArchived ? "خروج از بایگانی من" : "بایگانی"} onClick={() => {
              o.setArchivedForMe(letter.id, !myArchived);
              notify(myArchived ? "نامه به کارتابل برگشت." : "نامه بایگانی شد.", { undo: () => o.setArchivedForMe(letter.id, myArchived) });
            }}>
              {myArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </Button>
            {del.ok && (
              <Button
                variant="danger-outline"
                iconOnly
                aria-label="حذف"
                title="حذف (فقط تا وقتی کسی ندیده)"
                onClick={() =>
                  confirm({
                    title: "حذف نامه؟",
                    message: "نامه و پاراف‌هایش برای همه حذف می‌شود.",
                    onConfirm: () => {
                      const r = o.deleteLetter(letter.id);
                      if (!r.ok) return notify(r.reason, "warning");
                      notify("نامه حذف شد.");
                      onClose();
                    },
                  })
                }
              >
                <Trash2 size={18} />
              </Button>
            )}
          </>
        }
      >
        <SheetSection>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {reg && (
              <Badge tone="solid" icon={<Stamp size={14} />}>
                <span dir="ltr">{toFa(reg.number)}</span>
              </Badge>
            )}
            {letter.archived && <Badge tone="neutral">بایگانی دبیرخانه</Badge>}
            <LabelChips ns="letter" labels={letter.labels} />
          </div>
          <Person pid={letter.sender_id} sub={`فرستنده · ${toFa(letter.created_at)}`} />
        </SheetSection>

        <SheetSection title="گیرندگان و وضعیت مشاهده">
          <ul className="flex flex-col gap-2">
            {letter.parties.map((p) => (
              <li key={p.principal_id} className="flex items-center justify-between gap-2">
                <Person pid={p.principal_id} size={24} sub={p.via_referral ? "از طریق ارجاع" : partyRoleLabel[p.role]} />
                {p.seen_at ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                    <Eye size={14} /> دیده شد {toFa(p.seen_at)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                    <EyeOff size={14} /> هنوز ندیده
                  </span>
                )}
              </li>
            ))}
          </ul>
        </SheetSection>

        <SheetSection title="متن نامه">
          <p className="text-[15px] text-ink-800 leading-8 whitespace-pre-wrap">{letter.body || "—"}</p>
        </SheetSection>

        {letter.attachments.length > 0 && (
          <SheetSection title="پیوست‌ها">
            <AttachmentList items={letter.attachments} />
          </SheetSection>
        )}

        <SheetSection
          title="پرونده‌های مشتری"
          actions={
            <button
              type="button"
              className="btn btn-link btn-sm"
              onClick={() => {
                setLinks(letter.case_links.filter((c) => c.type === "customer_file").map((c) => c.id));
                setLinkOpen(true);
              }}
            >
              ویرایش اتصال
            </button>
          }
        >
          {customers.length ? (
            <div className="flex flex-wrap gap-2">
              {customers.map((c) => (
                <Link key={c!.id} to={`/customers/${c!.id}?tab=letters`} className="tag-pill bg-teal-50 text-teal-700 hover:underline">
                  {c!.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500">به پرونده‌ای متصل نیست.</p>
          )}
        </SheetSection>

        {(letter.related_task_title || letter.related_task) && (
          <SheetSection title="کار مرتبط">
            <p className="text-sm text-ink-800">{letter.related_task_title ?? `کار ${toFa(letter.related_task)}`}</p>
          </SheetSection>
        )}

        <SheetSection title="پاراف‌ها و گردش نامه">
          {events.length ? <div className="flex flex-col gap-3">{events.map((e) => <div key={e.key}>{e.node}</div>)}</div> : <p className="text-sm text-ink-500">هنوز پارافی ثبت نشده.</p>}
          {reply && (
            <div className="mt-3 flex flex-col gap-2">
              <span className="text-xs text-ink-500">{reply.parent ? `پاسخ به پاراف ${nameOf(paraphs.find((p) => p.id === reply.parent)?.author_id)}` : "پاراف روی نامه"}</span>
              <textarea className="input-field min-h-24" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={sendParaph}>
                  ثبت پاراف
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReply(null)}>
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </SheetSection>
        <p className="cap mt-5">ایجاد: {toFa(dateOnly(letter.created_at))}</p>
      </Sheet>

      <Modal
        open={referOpen}
        onClose={() => setReferOpen(false)}
        title="ارجاع نامه"
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => {
                const r = o.refer(letter.id, referTo, referNote);
                if (!r.ok) return notify(r.reason, "warning");
                notify("نامه ارجاع شد.");
                setReferTo([]);
                setReferNote("");
                setReferOpen(false);
              }}
            >
              ارجاع
            </Button>
            <Button variant="ghost" onClick={() => setReferOpen(false)}>
              انصراف
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="ارجاع به" required>
            <PeoplePicker value={referTo} onChange={setReferTo} exclude={[o.me]} />
          </Field>
          <Field label="یادداشت ارجاع">
            <textarea className="input-field min-h-24" value={referNote} onChange={(e) => setReferNote(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="اتصال به پرونده‌های مشتری"
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => {
                const r = o.setCaseLinks(letter.id, links);
                if (!r.ok) return notify(r.reason, "warning");
                notify("اتصال‌ها ذخیره شد.");
                setLinkOpen(false);
              }}
            >
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setLinkOpen(false)}>
              انصراف
            </Button>
          </>
        }
      >
        <CustomerPicker value={links} onChange={setLinks} />
      </Modal>

      {regOpen && <RegisterDialog open onClose={() => setRegOpen(false)} letterId={letter.id} direction="outgoing" />}
      {printing && <LetterPrint letter={letter} onDone={() => setPrinting(false)} />}
    </>
  );
}
