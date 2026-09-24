import { useEffect, useState } from "react";
import { Download, Pencil, Upload, Bell, BellOff, Trash2, Send, CheckCircle2, Undo2, Megaphone, Archive, ArchiveRestore, Flag, ThumbsUp, ThumbsDown, Eye, History, GitCompare, Paperclip } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, accessTone, statusTone, type WorkflowAction } from "../../context/KnowledgeContext";
import { dayNum, fa } from "../../pm/jalali";
import type { KComment, KDoc, KFile, KRelation } from "../../km/types";
import { Field, FilePicker, RelationsEditor, Stars, avg } from "./shared";

type Tab = "info" | "files" | "workflow" | "relations" | "comments";

export default function DocDetailModal({ docId, onClose, onEdit, onNavigate }: { docId: string | null; onClose: () => void; onEdit: (d: KDoc) => void; onNavigate: (r: KRelation) => void }) {
  const km = useKnowledge();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
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

  useEffect(() => {
    if (!docId) return;
    setTab("info");
    setPending(null);
    km.viewDoc(docId);
    // فقط با باز شدن سند
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  if (!d) return null;
  if (!km.canSee(d))
    return (
      <Modal open onClose={onClose} title="دسترسی محدود">
        <p className="text-sm text-ink-600 leading-7">سطح دسترسی این سند «{d.access}» است و فقط مالک، تأییدکنندگان و افراد دارای مجوز «مشاهده‌ی اسناد محرمانه» می‌توانند آن را ببینند.</p>
      </Modal>
    );

  const mine = d.owner === km.me || d.author === km.me;
  const canEdit = mine || hasPermission("knowledge.edit");
  const approver = km.isApprover(d);
  const canArchive = hasPermission("knowledge.archive") || mine;
  const rating = avg(d.ratings.map((r) => r.score));
  const helpfulYes = d.feedback.filter((f) => f.helpful).length;
  const helpfulNo = d.feedback.length - helpfulYes;
  const myFb = d.feedback.find((f) => f.by === km.me);
  const reviewLeft = (dayNum(d.reviewDate) ?? 0) - (dayNum(km.today) ?? 0);

  const actions: { a: WorkflowAction; label: string; icon: typeof Send; show: boolean; needsNote?: boolean; variant?: "primary" | "secondary" | "danger" }[] = [
    { a: "submit", label: "ارسال برای بررسی", icon: Send, show: canEdit && (d.status === "پیش‌نویس" || d.status === "ارجاع برای اصلاح"), variant: "primary" },
    { a: "approve", label: "تأیید", icon: CheckCircle2, show: approver && d.status === "در بررسی", variant: "primary" },
    { a: "return", label: "ارجاع برای اصلاح", icon: Undo2, show: approver && d.status === "در بررسی", needsNote: true },
    { a: "publish", label: "انتشار", icon: Megaphone, show: approver && d.status === "تأییدشده", variant: "primary" },
    { a: "archive", label: "آرشیو", icon: Archive, show: canArchive && d.status !== "آرشیو", needsNote: true },
    { a: "restore", label: "بازیابی از آرشیو", icon: ArchiveRestore, show: canArchive && d.status === "آرشیو" },
  ];

  const run = (a: WorkflowAction, n?: string) => {
    km.workflow(d.id, a, n);
    setPending(null);
    setNote("");
    notify("گردش کار ثبت شد و افراد مرتبط مطلع شدند.");
  };

  const download = (f?: KFile) => {
    km.downloadDoc(d.id);
    const files = f ? [f] : d.files;
    files.forEach((file) => {
      const blob = new Blob([`${d.title}\nکد: ${d.code}\nنسخه: ${d.version}\nفایل: ${file.name}\n\n(نمونه‌ی نمایشی پروتوتایپ)`], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = `${file.name}.txt`;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    });
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "info", label: "مشخصات" },
    { id: "files", label: "فایل‌ها و نسخه‌ها", count: d.versions.length },
    { id: "workflow", label: "گردش کار", count: d.workflow.length },
    { id: "relations", label: "ارتباطات", count: d.relations.length },
    { id: "comments", label: "نظرات و بازخورد", count: d.comments.length },
  ];

  const va = d.versions[cmpA] ?? d.versions[0];
  const vb = d.versions[cmpB] ?? d.versions[d.versions.length - 1];

  return (
    <Modal open onClose={onClose} title={d.title} description={`${d.code} · ${d.type} · ${km.categoryPath(d.categoryId)}`} width="max-w-4xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={statusTone[d.status]}>{d.status}</Badge>
          <Badge tone={accessTone[d.access]}>دسترسی: {d.access}</Badge>
          {d.importance !== "عادی" && <Badge tone={d.importance === "حیاتی" ? "danger" : "warning"}>{d.importance}</Badge>}
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
            <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={() => download()}>
              دانلود{d.files.length > 1 ? ` (${fa(d.files.length)} فایل)` : ""}
            </Button>
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
                <input className="input-field flex-1 min-w-[220px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={pending === "archive" ? "دلیل آرشیو (مثلاً: جایگزین با نسخه‌ی جدید)" : "توضیح برای اصلاح"} autoFocus />
                <Button size="sm" variant="primary" onClick={() => (note.trim() ? run(pending, note.trim()) : notify(pending === "archive" ? "دلیل آرشیو الزامی است." : "توضیح اصلاح الزامی است.", "warning"))}>
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
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1.5">فایل‌های پیوست</p>
                <ul className="space-y-1">
                  {d.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2.5 py-1.5">
                      <Paperclip size={12} className="text-ink-400" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-ink-400">{f.size}</span>
                      <button onClick={() => download(f)} className="text-brand-700 hover:underline">
                        دانلود
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {d.archiveReason && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">دلیل آرشیو: {d.archiveReason}</p>}
            </div>
            <dl className="text-xs space-y-2.5 md:border-r md:border-ink-100 md:pr-5">
              {[
                ["کد سند", d.code],
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
            {canEdit && d.status !== "آرشیو" && (
              <div>
                {!verOpen ? (
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
                    <span className="text-ink-400">{fa(v.files.length)} فایل</span>
                  </div>
                ))}
              </div>
            </div>
            {d.versions.length > 1 && (
              <div>
                <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                  <GitCompare size={13} /> مقایسه‌ی نسخه‌ها
                </p>
                <div className="flex gap-2 mb-2">
                  {[cmpA, cmpB].map((val, k) => (
                    <select key={k} className="input-field !py-1.5 !text-xs !w-auto" value={val} onChange={(e) => (k ? setCmpB(Number(e.target.value)) : setCmpA(Number(e.target.value)))}>
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
                      ["فایل‌ها", va.files.map((f) => f.name).join("، "), vb.files.map((f) => f.name).join("، ")],
                    ].map(([k, a, b]) => (
                      <tr key={k} className="border-b border-ink-100 last:border-0">
                        <td className="p-2 text-ink-400 w-24">{k}</td>
                        <td className={`p-2 ${a !== b ? "bg-rose-50/60" : ""}`}>{a}</td>
                        <td className={`p-2 ${a !== b ? "bg-emerald-50/60" : ""}`}>{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "workflow" && (
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
    </Modal>
  );
}
