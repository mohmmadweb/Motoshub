import { useEffect, useState } from "react";
import { Download, Pencil, Upload, Bell, BellOff, Trash2, Send, CheckCircle2, Undo2, Megaphone, Archive, ArchiveRestore, Flag, ThumbsUp, ThumbsDown, Eye, EyeOff, History, GitCompare, Paperclip, ShieldCheck, ScrollText, ListTree } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, accessTone, statusTone, type WorkflowAction } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import { versionText } from "../../km/text";
import { logCodeLabel, type KComment, type KDoc, type KFile, type KRelation } from "../../km/types";
import { Field, FilePicker, RelationsEditor, Stars, avg } from "./shared";
import { MarkdownView, DiffView, mdHeadings } from "./Markdown";
import FilePreview, { useMockDownload } from "./FilePreview";
import { AclEditor, AccessSummary } from "./AccessEditor";
import { FlowStepper, FlowHistory, OverdueBadge } from "./WorkflowEditor";
import { codeOf } from "./AuditSection";

type Tab = "body" | "info" | "files" | "workflow" | "access" | "relations" | "comments";

export default function DocDetailModal({ docId, onClose, onEdit, onNavigate }: { docId: string | null; onClose: () => void; onEdit: (d: KDoc) => void; onNavigate: (r: KRelation) => void }) {
  const km = useKnowledge();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const download = useMockDownload();
  const d = km.docs.find((x) => x.id === docId);
  const [tab, setTab] = useState<Tab>("info");
  const [verOpen, setVerOpen] = useState(false);
  const [verFiles, setVerFiles] = useState<KFile[]>([]);
  const [verNote, setVerNote] = useState("");
  const [pending, setPending] = useState<WorkflowAction | null>(null);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [ckind, setCkind] = useState<KComment["kind"]>("نظر");
  const [cmpA, setCmpA] = useState(0);
  const [cmpB, setCmpB] = useState(0);
  const [fbMode, setFbMode] = useState<null | "unhelpful" | "report">(null);
  const [fbText, setFbText] = useState("");
  const [preview, setPreview] = useState<KFile | null>(null);

  useEffect(() => {
    if (!docId) return;
    const doc = km.docs.find((x) => x.id === docId);
    setTab(doc?.format === "article" ? "body" : "info");
    setPending(null);
    setPreview(null);
    const n = doc?.versions.length ?? 1;
    setCmpA(Math.max(0, n - 2));
    setCmpB(Math.max(0, n - 1));
    if (doc && km.canSee(doc)) km.viewDoc(docId);
    // فقط با باز شدن سند
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  if (!d) return null;
  if (!km.canSee(d))
    return (
      <Modal open onClose={onClose} title="دسترسی محدود">
        <p className="text-sm text-ink-600 leading-7">
          سطح دسترسی این سند «{d.access}» است{d.acl?.entries.length ? " و فهرست دسترسی آن محدود شده است" : ""}؛ فقط مالک، تأییدکنندگان و افراد مجاز در فهرست دسترسی می‌توانند آن را ببینند.
        </p>
      </Modal>
    );

  const isArticle = d.format === "article";
  const mine = d.owner === km.me || d.author === km.me;
  const canEdit = mine || hasPermission("knowledge.edit");
  const approver = km.isApprover(d);
  const canArchive = hasPermission("knowledge.archive") || mine;
  const canRestore = hasPermission("knowledge.archive");
  const canDl = km.canDownload(d);
  const canAudit = mine || hasPermission("knowledge.settings") || hasPermission("knowledge.reports");
  const flow = km.flowInfo(d);
  const rating = avg(d.ratings.map((r) => r.score));
  const helpfulYes = d.feedback.filter((f) => f.helpful).length;
  const helpfulNo = d.feedback.length - helpfulYes;
  const myFb = d.feedback.find((f) => f.by === km.me);
  const reviewLeft = (dayNum(d.reviewDate) ?? 0) - (dayNum(km.today) ?? 0);

  const actions: { a: WorkflowAction; label: string; icon: typeof Send; show: boolean; needsNote?: boolean; variant?: "primary" | "secondary" | "danger" }[] = [
    { a: "submit", label: "ارسال برای بررسی", icon: Send, show: canEdit && (d.status === "پیش‌نویس" || d.status === "ارجاع برای اصلاح"), variant: "primary" },
    { a: "approve", label: flow ? `تأیید «${flow.step.name}»` : "تأیید", icon: CheckCircle2, show: approver && d.status === "در بررسی", variant: "primary" },
    { a: "return", label: "ارجاع برای اصلاح", icon: Undo2, show: approver && (d.status === "در بررسی" || (!!flow && d.status === "تأییدشده")), needsNote: true },
    { a: "publish", label: "انتشار", icon: Megaphone, show: approver && d.status === "تأییدشده", variant: "primary" },
    { a: "archive", label: "آرشیو", icon: Archive, show: canArchive && d.status !== "آرشیو", needsNote: true },
    { a: "restore", label: "بازیابی از آرشیو", icon: ArchiveRestore, show: canRestore && d.status === "آرشیو", needsNote: true },
  ];

  const run = (a: WorkflowAction, n?: string) => {
    if (a === "restore") {
      if (!km.restoreDoc(d.id, n ?? "")) return notify("بازیابی فقط با مجوز «آرشیو و بازیابی اسناد» و ثبت دلیل ممکن است.", "warning");
    } else km.workflow(d.id, a, n);
    setPending(null);
    setNote("");
    notify(a === "restore" ? "سند با ثبت دلیل از آرشیو بازیابی شد." : "گردش کار ثبت شد و افراد مرتبط مطلع شدند.");
  };
  const notePh: Partial<Record<WorkflowAction, string>> = { archive: "دلیل آرشیو (مثلاً: جایگزین با نسخه‌ی جدید)", restore: "دلیل بازیابی (الزامی، در لاگ ممیزی ثبت می‌شود)", return: "چه چیزی باید اصلاح شود؟" };

  const docLogs = km.logs.filter((l) => l.entity.type === "doc" && l.entity.id === d.id);
  const accessLogs = docLogs.filter((l) => ["view", "preview", "download", "access"].includes(codeOf(l)));

  const tabs: { id: Tab; label: string; count?: number }[] = [
    ...(isArticle ? [{ id: "body" as Tab, label: "متن" }] : []),
    { id: "info", label: "مشخصات" },
    { id: "files", label: isArticle ? "پیوست‌ها و نسخه‌ها" : "فایل‌ها و نسخه‌ها", count: d.versions.length },
    { id: "workflow", label: "گردش کار", count: d.workflow.length },
    { id: "access", label: "دسترسی", count: d.acl?.entries.length || undefined },
    { id: "relations", label: "ارتباطات", count: d.relations.length },
    { id: "comments", label: "نظرات و بازخورد", count: d.comments.length },
  ];

  const va = d.versions[cmpA] ?? d.versions[0];
  const vb = d.versions[cmpB] ?? d.versions[d.versions.length - 1];
  const heads = isArticle ? mdHeadings(d.body ?? "") : [];

  return (
    <Modal open onClose={onClose} title={d.title} description={`${d.code} · ${d.type} · ${km.categoryPath(d.categoryId)}`} width="max-w-4xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={statusTone[d.status]}>{d.status}</Badge>
          <Badge tone={accessTone[d.access]}>دسترسی: {d.access}</Badge>
          {!canDl && <Badge tone="warning" icon={<EyeOff size={11} />}>فقط مشاهده</Badge>}
          {d.importance !== "عادی" && <Badge tone={d.importance === "حیاتی" ? "danger" : "warning"}>{d.importance}</Badge>}
          {flow && <OverdueBadge f={flow} />}
          <span className="text-xs text-ink-500">نسخه‌ی {fa(d.version)}</span>
          <span className="text-xs text-ink-400 flex items-center gap-1">
            <Eye size={12} /> {fa(d.views)} · <Download size={12} /> {fa(d.downloads)}
          </span>
          {d.ratings.length > 0 && (
            <span className="text-xs text-ink-500 flex items-center gap-1">
              <Stars value={rating} size={12} /> ({fa(d.ratings.length)})
            </span>
          )}
          <span className="mr-auto flex items-center gap-1.5 flex-wrap">
            {d.files.length > 0 && (
              <Button size="sm" variant="secondary" icon={<Download size={13} />} disabled={!canDl} title={canDl ? undefined : "این سند برای شما فقط قابل مشاهده است"} onClick={() => download(d)}>
                دانلود{d.files.length > 1 ? ` (${fa(d.files.length)} فایل)` : ""}
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={d.followers.includes(km.me) ? <BellOff size={13} /> : <Bell size={13} />} onClick={() => km.toggleFollow(d.id)}>
              {d.followers.includes(km.me) ? "لغو دنبال‌کردن" : "دنبال‌کردن"}
            </Button>
            {canEdit && (
              <Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => onEdit(d)}>
                ویرایش
              </Button>
            )}
          </span>
        </div>

        {actions.some((x) => x.show) && (
          <div className="rounded-lg bg-ink-50 border border-ink-100 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-ink-500">گردش کار:</span>
              {actions
                .filter((x) => x.show)
                .map((x) => (
                  <Button key={x.a} size="sm" variant={x.variant ?? "secondary"} icon={<x.icon size={13} />} onClick={() => (x.needsNote ? setPending(x.a) : run(x.a))}>
                    {x.label}
                  </Button>
                ))}
            </div>
            {pending && (
              <div className="flex gap-2 mt-2 flex-wrap">
                <input className="input-field flex-1 min-w-[220px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={notePh[pending] ?? "توضیح"} autoFocus />
                <Button size="sm" variant="primary" onClick={() => (note.trim() ? run(pending, note.trim()) : notify("ثبت دلیل/توضیح الزامی است.", "warning"))}>
                  ثبت
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                  انصراف
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 border-b border-ink-200 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}>
              {t.label}
              {t.count ? <span className="mr-1 text-[10px] bg-ink-100 rounded-full px-1.5">{fa(t.count)}</span> : null}
            </button>
          ))}
        </div>

        {tab === "body" && isArticle && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5">
            <div className={`min-w-0 ${canDl ? "" : "select-none"}`} onCopy={canDl ? undefined : (e) => e.preventDefault()}>
              <MarkdownView md={d.body ?? ""} />
            </div>
            {heads.length > 1 && (
              <nav className="hidden md:block self-start sticky top-0 border-r border-ink-100 pr-3" aria-label="فهرست مطالب">
                <p className="text-[11px] font-bold text-ink-500 mb-1.5 flex items-center gap-1">
                  <ListTree size={12} /> فهرست مطالب
                </p>
                {heads.map((h) => (
                  <button key={h.id} onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`block w-full text-right text-[11.5px] py-0.5 text-ink-600 hover:text-brand-700 truncate ${h.level > 2 ? "pr-3" : ""}`}>
                    {h.text.replace(/[*`]/g, "")}
                  </button>
                ))}
              </nav>
            )}
          </div>
        )}

        {tab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
            <div className="space-y-3">
              <p className="text-sm text-ink-700 leading-7 whitespace-pre-wrap">{d.description}</p>
              {d.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {d.tags.map((t) => (
                    <span key={t} className="text-[11px] bg-ink-100 text-ink-600 rounded px-1.5 py-0.5">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              {d.files.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-ink-700 mb-1.5">{isArticle ? "پیوست‌ها" : "فایل‌های پیوست"}</p>
                  <FileList d={d} canDl={canDl} onPreview={setPreview} onDownload={(f) => download(d, [f])} />
                </div>
              )}
              {d.archiveReason && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">دلیل آرشیو: {d.archiveReason}</p>}
            </div>
            <dl className="text-xs space-y-2.5 md:border-r md:border-ink-100 md:pr-5">
              {[
                ["کد سند", d.code],
                ["قالب", isArticle ? "مقاله‌ی نوشته‌شده در سامانه" : "فایل"],
                ["واحد سازمانی", d.unit],
                ["مالک / مسئول", d.owner],
                ["ثبت‌کننده", d.author],
                ["تاریخ ایجاد", d.createdAt],
                ["آخرین ویرایش", d.updatedAt],
                ["تأییدکنندگان", d.approvers.join("، ") || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-ink-400">{k}</dt>
                  <dd className="text-ink-800 font-medium mt-0.5">{v}</dd>
                </div>
              ))}
              <div>
                <dt className="text-ink-400">بازبینی بعدی</dt>
                <dd className={`font-medium mt-0.5 ${reviewLeft < 0 ? "text-rose-600" : reviewLeft <= 30 ? "text-amber-600" : "text-ink-800"}`}>
                  {d.reviewDate} {reviewLeft < 0 ? `(${fa(-reviewLeft)} روز گذشته)` : reviewLeft <= 30 ? `(${fa(reviewLeft)} روز مانده)` : ""}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {tab === "files" && (
          <div className="space-y-4">
            {d.files.length > 0 && <FileList d={d} canDl={canDl} onPreview={setPreview} onDownload={(f) => download(d, [f])} />}
            {canEdit && d.status !== "آرشیو" && (
              <div>
                {isArticle ? (
                  <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => onEdit(d)}>
                    ویرایش متن (نسخه‌ی جدید)
                  </Button>
                ) : !verOpen ? (
                  <Button size="sm" variant="secondary" icon={<Upload size={13} />} onClick={() => { setVerOpen(true); setVerFiles([]); setVerNote(""); }}>
                    بارگذاری نسخه‌ی جدید
                  </Button>
                ) : (
                  <div className="border border-ink-200 rounded-lg p-3 space-y-2">
                    <FilePicker files={verFiles} onChange={setVerFiles} />
                    <input className="input-field" value={verNote} onChange={(e) => setVerNote(e.target.value)} placeholder="شرح تغییرات این نسخه" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!verFiles.length || !verNote.trim()) return notify("فایل و شرح تغییرات الزامی است.", "warning");
                          km.newVersion(d.id, verFiles, verNote.trim());
                          setVerOpen(false);
                          notify(km.settings.workflowSteps.review ? "نسخه‌ی جدید ثبت و برای بررسی ارسال شد." : "نسخه‌ی جدید ثبت شد.");
                        }}
                      >
                        ثبت نسخه‌ی {fa(d.version + 1)}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setVerOpen(false)}>
                        انصراف
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                <History size={13} /> تاریخچه‌ی نسخه‌ها
              </p>
              <div className="border border-ink-100 rounded-lg divide-y divide-ink-100">
                {[...d.versions].reverse().map((v) => (
                  <div key={v.version} className="flex items-center gap-3 px-3 py-2 text-xs flex-wrap">
                    <Badge tone={v.version === d.version ? "brand" : "neutral"}>نسخه‌ی {fa(v.version)}</Badge>
                    <span className="flex-1 text-ink-800">{v.note}</span>
                    <span className="text-ink-400">
                      {v.by} · {v.date}
                    </span>
                    {!isArticle && <span className="text-ink-400">{fa(v.files.length)} فایل</span>}
                  </div>
                ))}
              </div>
            </div>
            {d.versions.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-ink-700 flex items-center gap-1">
                  <GitCompare size={13} /> مقایسه‌ی نسخه‌ها
                </p>
                <div className="flex gap-2 items-center">
                  {[cmpA, cmpB].map((val, k) => (
                    <select key={k} className="input-field !py-1.5 !text-xs !w-auto" value={val} onChange={(e) => (k ? setCmpB(Number(e.target.value)) : setCmpA(Number(e.target.value)))} aria-label={k ? "نسخه‌ی جدیدتر" : "نسخه‌ی قدیمی‌تر"}>
                      {d.versions.map((v, i) => (
                        <option key={v.version} value={i}>
                          نسخه‌ی {fa(v.version)}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
                <table className="w-full text-xs border border-ink-100 rounded-lg">
                  <tbody>
                    {[
                      ["تاریخ", va.date, vb.date],
                      ["ثبت‌کننده", va.by, vb.by],
                      ["شرح تغییرات", va.note, vb.note],
                      ...(isArticle ? [] : [["فایل‌ها", va.files.map((f) => f.name).join("، "), vb.files.map((f) => f.name).join("، ")]]),
                    ].map(([k, a, b]) => (
                      <tr key={k} className="border-b border-ink-100 last:border-0">
                        <td className="p-2 text-ink-400 w-24">{k}</td>
                        <td className={`p-2 ${a !== b ? "bg-rose-50/60" : ""}`}>{a}</td>
                        <td className={`p-2 ${a !== b ? "bg-emerald-50/60" : ""}`}>{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <DiffView a={versionText(va)} b={versionText(vb)} labelA={`نسخه‌ی ${fa(va.version)}`} labelB={`نسخه‌ی ${fa(vb.version)}`} />
              </div>
            )}
          </div>
        )}

        {tab === "workflow" && (
          <div className="space-y-4">
            {d.flow && (
              <div className="rounded-lg border border-ink-200 p-3 space-y-3">
                <p className="text-xs font-bold text-ink-700">{km.templates.find((t) => t.id === d.flow?.templateId)?.name ?? "گردش کار"}</p>
                <FlowStepper doc={d} />
                <FlowHistory doc={d} />
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2">تاریخچه‌ی وضعیت سند</p>
              <ol className="relative border-r-2 border-ink-100 pr-4 space-y-3">
                {[...d.workflow].reverse().map((w) => (
                  <li key={w.id} className="relative">
                    <span className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-white" />
                    <p className="text-xs text-ink-800">
                      <b>{w.action}</b> · {w.from} ← {w.to}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      {w.by} · {w.at}
                    </p>
                    {w.note && <p className="text-[11px] text-ink-600 bg-ink-50 rounded px-2 py-1 mt-1">{w.note}</p>}
                  </li>
                ))}
                <li className="text-[11px] text-ink-400">ایجاد سند — {d.author} · {d.createdAt}</li>
              </ol>
            </div>
          </div>
        )}

        {tab === "access" && (
          <div className="space-y-4">
            <AccessSummary doc={d} />
            {canEdit ? (
              <div className="rounded-lg border border-ink-200 p-3">
                <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                  <ShieldCheck size={13} /> فهرست دسترسی
                </p>
                <AclEditor
                  value={d.acl}
                  access={d.access}
                  onChange={(acl) => {
                    km.updateAcl(d.id, acl);
                  }}
                />
              </div>
            ) : (
              <p className="text-[11px] text-ink-400">فقط مالک سند و دارندگان مجوز ویرایش می‌توانند فهرست دسترسی را تغییر دهند.</p>
            )}
            {canAudit && (
              <div>
                <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                  <ScrollText size={13} /> تاریخچه‌ی دسترسی (مشاهده، پیش‌نمایش، دانلود)
                </p>
                {accessLogs.length ? (
                  <ul className="border border-ink-100 rounded-lg divide-y divide-ink-100 max-h-56 overflow-y-auto">
                    {accessLogs.map((l) => (
                      <li key={l.id} className="flex items-center gap-2 px-3 py-1.5 text-xs flex-wrap">
                        <Badge tone={codeOf(l) === "download" ? "warning" : codeOf(l) === "access" ? "danger" : "neutral"}>{logCodeLabel[codeOf(l)]}</Badge>
                        <span className="text-ink-800">{l.actor}</span>
                        {l.detail && <span className="text-ink-400 truncate max-w-[240px]">{l.detail}</span>}
                        <span className="mr-auto text-ink-400">{l.at}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-ink-400">هنوز ثبت نشده است.</p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "relations" && <RelationsEditor kind="doc" id={d.id} relations={d.relations} canEdit={canEdit} onOpen={onNavigate} />}

        {tab === "comments" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="card p-3">
                <p className="text-[11px] text-ink-400 mb-1">امتیاز شما</p>
                <Stars value={d.ratings.find((r) => r.by === km.me)?.score ?? 0} onChange={(n) => { km.rate(d.id, n); notify("امتیاز ثبت شد."); }} size={18} />
                <p className="text-[11px] text-ink-400 mt-1">میانگین {fa(Math.round(rating * 10) / 10)} از {fa(d.ratings.length)} رأی</p>
              </div>
              <div className="card p-3">
                <p className="text-[11px] text-ink-400 mb-1.5">این سند مفید بود؟</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant={myFb?.helpful ? "primary" : "secondary"} icon={<ThumbsUp size={12} />} onClick={() => km.feedback(d.id, true)}>
                    بله ({fa(helpfulYes)})
                  </Button>
                  <Button size="sm" variant={myFb && !myFb.helpful ? "danger" : "secondary"} icon={<ThumbsDown size={12} />} onClick={() => { setFbMode("unhelpful"); setFbText(""); }}>
                    خیر ({fa(helpfulNo)})
                  </Button>
                </div>
              </div>
              <div className="card p-3">
                <p className="text-[11px] text-ink-400 mb-1.5">محتوای قدیمی یا نادرست؟</p>
                <Button size="sm" variant="ghost" icon={<Flag size={12} />} onClick={() => { setFbMode("report"); setFbText(""); }}>
                  گزارش به مالک سند
                </Button>
                {d.reported?.length ? <p className="text-[11px] text-amber-700 mt-1">{fa(d.reported.length)} گزارش ثبت شده</p> : null}
              </div>
            </div>
            {fbMode && (
              <div className="flex gap-2">
                <input className="input-field flex-1" value={fbText} onChange={(e) => setFbText(e.target.value)} placeholder={fbMode === "unhelpful" ? "چرا مفید نبود؟" : "چه بخشی قدیمی یا نادرست است؟"} autoFocus />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const r = fbText.trim();
                    if (!r) return notify("دلیل را بنویسید.", "warning");
                    if (fbMode === "report") km.reportOutdated(d.id, r);
                    else km.feedback(d.id, false, r);
                    setFbMode(null);
                    notify("بازخورد ثبت شد و برای بهبود سند به مالک آن رسید.");
                  }}
                >
                  ثبت
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFbMode(null)}>
                  انصراف
                </Button>
              </div>
            )}
            {d.feedback.filter((f) => !f.helpful && f.reason).length > 0 && (
              <div className="text-xs text-ink-600 bg-ink-50 rounded-lg p-2.5 space-y-1">
                <p className="font-bold text-ink-700">دلایل «مفید نبود»</p>
                {d.feedback.filter((f) => !f.helpful && f.reason).map((f) => (
                  <p key={f.by}>
                    {f.by}: {f.reason}
                  </p>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {d.comments.map((c) => (
                <div key={c.id} className="bg-ink-50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-[11px] text-ink-400 mb-1">
                    <span>
                      <b className="text-ink-700">{c.author}</b> · <Badge tone={c.kind === "پیشنهاد اصلاح" ? "warning" : c.kind === "پرسش" ? "brand" : "neutral"}>{c.kind}</Badge>
                    </span>
                    <span>{c.at}</span>
                  </div>
                  <p className="text-sm text-ink-800 leading-6">{c.text}</p>
                </div>
              ))}
              {d.comments.length === 0 && <p className="text-xs text-ink-400">هنوز نظری ثبت نشده است.</p>}
            </div>
            <Field label="نظر، پرسش یا پیشنهاد اصلاح (برای منشن: @نام_کاربر)">
              <div className="flex gap-2 flex-wrap">
                <select className="input-field !w-auto" value={ckind} onChange={(e) => setCkind(e.target.value as KComment["kind"])}>
                  {(["نظر", "پرسش", "پیشنهاد اصلاح"] as const).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <input className="input-field flex-1 min-w-[220px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="متن…" />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!comment.trim()) return;
                    km.addComment(d.id, comment.trim(), ckind);
                    setComment("");
                    notify("ثبت شد و مالک سند مطلع شد.");
                  }}
                >
                  ارسال
                </Button>
              </div>
            </Field>
          </div>
        )}

        {(hasPermission("knowledge.delete") || mine) && (
          <div className="pt-3 border-t border-ink-100">
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600"
              icon={<Trash2 size={13} />}
              onClick={() =>
                confirm({
                  title: `حذف سند «${d.title}»؟`,
                  message: "به‌جای حذف، آرشیو را در نظر بگیرید؛ سند آرشیوشده قابل بازیابی است.",
                  onConfirm: () => {
                    km.deleteDoc(d.id);
                    onClose();
                    notify("سند حذف شد.", "info");
                  },
                })
              }
            >
              حذف سند
            </Button>
          </div>
        )}
      </div>
      <FilePreview doc={preview ? d : null} file={preview} onClose={() => setPreview(null)} />
    </Modal>
  );
}

/** فهرست فایل‌ها با «پیش‌نمایش» و «دانلود» (یا «فقط مشاهده») */
function FileList({ d, canDl, onPreview, onDownload }: { d: KDoc; canDl: boolean; onPreview: (f: KFile) => void; onDownload: (f: KFile) => void }) {
  return (
    <ul className="space-y-1">
      {d.files.map((f) => (
        <li key={f.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2.5 py-1.5">
          <Paperclip size={12} className="text-ink-400 shrink-0" />
          <span className="flex-1 truncate">{f.name}</span>
          <span className="text-ink-400 shrink-0 hidden sm:inline">{f.size}</span>
          <button onClick={() => onPreview(f)} className="text-brand-700 hover:underline flex items-center gap-0.5 shrink-0">
            <Eye size={12} /> پیش‌نمایش
          </button>
          {canDl ? (
            <button onClick={() => onDownload(f)} className="text-brand-700 hover:underline shrink-0">
              دانلود
            </button>
          ) : (
            <span className="text-amber-700 flex items-center gap-0.5 shrink-0" title="دانلود برای شما مجاز نیست">
              <EyeOff size={12} /> فقط مشاهده
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
