import { useState } from "react";
import { Inbox, CalendarClock, Archive, ArchiveRestore, CheckCircle2, Undo2, Megaphone, RefreshCw, AlertTriangle } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, statusTone } from "../../context/KnowledgeContext";
import { dayNum, fa, formatJalali, monthNames, parseJalali } from "../../pm/jalali";
import { SectionHead } from "./shared";
import { useKPage } from "./ctx";

/** بند ۹: کارتابل گردش کار */
export function WorkflowSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { notify } = useToast();
  const [view, setView] = useState<"mine" | "sent" | "all">("mine");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const active = km.docs.filter((d) => d.status === "در بررسی" || d.status === "تأییدشده" || d.status === "ارجاع برای اصلاح" || d.status === "پیش‌نویس");
  const mine = active.filter((d) => km.isApprover(d) && (d.status === "در بررسی" || d.status === "تأییدشده"));
  const sent = active.filter((d) => d.owner === km.me || d.author === km.me);
  const list = view === "mine" ? mine : view === "sent" ? sent : active;
  const steps = ["ایجاد سند", "بررسی اولیه", "تأیید مسئول", "انتشار", "بازبینی دوره‌ای", "اصلاح / تمدید / آرشیو"];

  return (
    <div>
      <SectionHead icon={<Inbox size={17} className="text-brand-600" />} title="کارتابل گردش کار اسناد" hint="هر سند: ایجاد ← بررسی ← تأیید ← انتشار ← بازبینی دوره‌ای. در هر مرحله به افراد مرتبط اعلان می‌رود و امکان رد و ارجاع برای اصلاح وجود دارد." />
      <div className="card p-3 mb-4 flex items-center gap-1 overflow-x-auto text-xs">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-1 whitespace-nowrap">
            <span className="px-2.5 py-1 rounded-full bg-ink-100 text-ink-700">{s}</span>
            {i < steps.length - 1 && <span className="text-ink-300">←</span>}
          </span>
        ))}
      </div>
      <div className="flex rounded-lg border border-ink-200 overflow-hidden w-fit mb-3">
        {(
          [
            ["mine", `منتظر اقدام من (${fa(mine.length)})`],
            ["sent", `ارسالی‌های من (${fa(sent.length)})`],
            ["all", `همه (${fa(active.length)})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} className={`px-3 py-1.5 text-xs ${view === id ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
            {label}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="card divide-y divide-ink-100">
          {list.map((d) => {
            const last = d.workflow[d.workflow.length - 1];
            const canAct = km.isApprover(d);
            return (
              <div key={d.id} className="p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[240px] text-right">
                    <p className="text-sm font-medium text-ink-900 hover:text-brand-700">{d.title}</p>
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      {d.code} · {d.owner} · تأییدکنندگان: {d.approvers.join("، ")}
                    </p>
                    {last && (
                      <p className="text-[11px] text-ink-500 mt-1">
                        آخرین اقدام: {last.action} توسط {last.by} ({last.at}){last.note ? ` — «${last.note}»` : ""}
                      </p>
                    )}
                  </button>
                  <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                  {canAct && d.status === "در بررسی" && (
                    <span className="flex gap-1.5">
                      <Button size="sm" variant="primary" icon={<CheckCircle2 size={13} />} onClick={() => { km.workflow(d.id, "approve"); notify("سند تأیید شد."); }}>
                        تأیید
                      </Button>
                      <Button size="sm" variant="secondary" icon={<Undo2 size={13} />} onClick={() => { setNoteFor(d.id); setNote(""); }}>
                        ارجاع برای اصلاح
                      </Button>
                    </span>
                  )}
                  {canAct && d.status === "تأییدشده" && (
                    <Button size="sm" variant="primary" icon={<Megaphone size={13} />} onClick={() => { km.workflow(d.id, "publish"); notify("سند منتشر شد."); }}>
                      انتشار
                    </Button>
                  )}
                  {(d.status === "پیش‌نویس" || d.status === "ارجاع برای اصلاح") && (d.owner === km.me || d.author === km.me) && (
                    <Button size="sm" variant="secondary" onClick={() => { km.workflow(d.id, "submit"); notify("برای بررسی ارسال شد."); }}>
                      ارسال برای بررسی
                    </Button>
                  )}
                </div>
                {noteFor === d.id && (
                  <div className="flex gap-2 mt-2">
                    <input className="input-field flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="چه چیزی باید اصلاح شود؟" autoFocus />
                    <Button size="sm" variant="primary" onClick={() => { if (!note.trim()) return; km.workflow(d.id, "return", note.trim()); setNoteFor(null); notify("سند برای اصلاح ارجاع شد."); }}>
                      ثبت
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNoteFor(null)}>
                      انصراف
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Inbox size={20} />} title="کارتابل خالی است" description={view === "mine" ? "سندی منتظر بررسی یا تأیید شما نیست." : "موردی نیست."} />
      )}
    </div>
  );
}

/** بند ۱۵: تقویم بازبینی اسناد */
export function ReviewSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { notify } = useToast();
  const today = dayNum(km.today)!;
  const [openFor, setOpenFor] = useState<string | null>(page.focus ?? null);
  const [note, setNote] = useState("");
  const docs = km.docs.filter((d) => d.status !== "آرشیو" && km.canSee(d));
  const overdue = docs.filter((d) => (dayNum(d.reviewDate) ?? 9e9) < today);
  const soon = docs.filter((d) => {
    const x = (dayNum(d.reviewDate) ?? 9e9) - today;
    return x >= 0 && x <= 30;
  });
  // گروه‌بندی ۶ ماه آینده
  const r = parseJalali(km.today)!;
  const months = Array.from({ length: 6 }, (_, i) => {
    const m = ((r[1] - 1 + i) % 12) + 1;
    const y = r[0] + Math.floor((r[1] - 1 + i) / 12);
    return { y, m, docs: docs.filter((d) => { const p = parseJalali(d.reviewDate); return p && p[0] === y && p[1] === m; }) };
  });

  const Row = ({ id }: { id: string }) => {
    const d = km.docs.find((x) => x.id === id)!;
    const left = (dayNum(d.reviewDate) ?? 0) - today;
    return (
      <div className={`p-3 ${openFor === d.id ? "bg-brand-50/40" : ""}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[200px] text-right">
            <p className="text-sm text-ink-900 hover:text-brand-700">{d.title}</p>
            <p className="text-[11px] text-ink-400">
              مالک: {d.owner} · بازبینی: {d.reviewDate}
            </p>
          </button>
          <span className={`text-xs font-medium ${left < 0 ? "text-rose-600" : "text-amber-600"}`}>{left < 0 ? `${fa(-left)} روز گذشته` : left === 0 ? "امروز" : `${fa(left)} روز مانده`}</span>
          <Button size="sm" variant="secondary" icon={<RefreshCw size={12} />} onClick={() => { setOpenFor(openFor === d.id ? null : d.id); setNote(""); }}>
            ثبت نتیجه‌ی بازبینی
          </Button>
        </div>
        {openFor === d.id && (
          <div className="flex gap-2 mt-2 flex-wrap">
            <input className="input-field flex-1 min-w-[200px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت بازبینی" />
            {(["تمدید", "نیاز به اصلاح", "آرشیو"] as const).map((res) => (
              <Button
                key={res}
                size="sm"
                variant={res === "تمدید" ? "primary" : res === "آرشیو" ? "danger" : "secondary"}
                onClick={() => {
                  km.reviewResult(d.id, res, note.trim());
                  setOpenFor(null);
                  notify(res === "تمدید" ? `اعتبار سند ${fa(km.settings.reviewPeriodDays)} روز تمدید شد.` : res === "آرشیو" ? "سند آرشیو شد." : "سند برای اصلاح به مالک ارجاع شد.");
                }}
              >
                {res}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<CalendarClock size={17} className="text-brand-600" />} title="تقویم بازبینی اسناد" hint="هر سند تاریخ بازبینی دارد؛ ۷ روز مانده به موعد برای مالک و تأییدکنندگان اعلان ارسال می‌شود. نتیجه‌ی بازبینی (تمدید، نیاز به اصلاح یا آرشیو) وضعیت سند را تغییر می‌دهد." />
      {overdue.length > 0 && (
        <div className="card overflow-hidden">
          <p className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 flex items-center gap-1">
            <AlertTriangle size={13} /> موعد گذشته ({fa(overdue.length)})
          </p>
          <div className="divide-y divide-ink-100">{overdue.map((d) => <Row key={d.id} id={d.id} />)}</div>
        </div>
      )}
      <div className="card overflow-hidden">
        <p className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50">۳۰ روز آینده ({fa(soon.length)})</p>
        <div className="divide-y divide-ink-100">{soon.length ? soon.map((d) => <Row key={d.id} id={d.id} />) : <p className="p-4 text-xs text-ink-400">موردی نیست.</p>}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {months.map((m) => (
          <div key={`${m.y}-${m.m}`} className="card p-3">
            <p className="text-xs font-bold text-ink-800">
              {monthNames[m.m - 1]} {fa(m.y)}
            </p>
            <p className="text-2xl font-bold text-ink-900 mt-1">{fa(m.docs.length)}</p>
            <div className="mt-1 space-y-0.5">
              {m.docs.slice(0, 3).map((d) => (
                <button key={d.id} onClick={() => page.openDoc(d.id)} className="block w-full text-right text-[10.5px] text-ink-500 truncate hover:text-brand-700">
                  {formatJalali(...parseJalali(d.reviewDate)!).slice(8)} · {d.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** بند ۱۱: آرشیو */
export function ArchiveSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [kind, setKind] = useState("");
  const archived = km.docs.filter((d) => d.status === "آرشیو" && km.canSee(d));
  const reasonKind = (r = "") => (r.includes("جایگزین") ? "جایگزین‌شده" : r.includes("منقضی") || r.includes("اعتبار") ? "منقضی" : r.includes("تاریخی") ? "تاریخی" : "سایر");
  const list = archived.filter((d) => !kind || reasonKind(d.archiveReason) === kind);
  const olderVersions = km.docs.filter((d) => d.versions.length > 1 && km.canSee(d));
  return (
    <div className="space-y-4">
      <SectionHead icon={<Archive size={17} className="text-brand-600" />} title="آرشیو" hint="اسناد منقضی، جایگزین‌شده، تاریخی و نسخه‌های قدیمی. آرشیو یعنی حذف نشدن؛ بازیابی کنترل‌شده و با ثبت دلیل انجام می‌شود." />
      <div className="flex gap-1.5 flex-wrap">
        {["", "منقضی", "جایگزین‌شده", "تاریخی", "سایر"].map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`text-xs px-3 py-1.5 rounded-md border ${kind === k ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
            {k || "همه"} ({fa(k ? archived.filter((d) => reasonKind(d.archiveReason) === k).length : archived.length)})
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="card divide-y divide-ink-100">
          {list.map((d) => (
            <div key={d.id} className="p-3 flex items-center gap-3 flex-wrap">
              <button onClick={() => page.openDoc(d.id)} className="flex-1 min-w-[220px] text-right">
                <p className="text-sm text-ink-900 hover:text-brand-700">{d.title}</p>
                <p className="text-[11px] text-ink-400">
                  {d.code} · دلیل: {d.archiveReason || "—"}
                </p>
              </button>
              <Badge tone="navy">{reasonKind(d.archiveReason)}</Badge>
              {(hasPermission("knowledge.archive") || d.owner === km.me) && (
                <Button size="sm" variant="secondary" icon={<ArchiveRestore size={13} />} onClick={() => { km.workflow(d.id, "restore", "بازیابی از آرشیو"); notify("سند بازیابی و دوباره منتشر شد."); }}>
                  بازیابی
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Archive size={20} />} title="سند آرشیوشده‌ای نیست" />
      )}
      <div className="card p-4">
        <p className="text-xs font-bold text-ink-900 mb-2">نسخه‌های قدیمی اسناد جاری</p>
        {olderVersions.map((d) => (
          <button key={d.id} onClick={() => page.openDoc(d.id)} className="w-full flex items-center gap-2 py-1.5 text-right text-xs hover:text-brand-700">
            <span className="flex-1 truncate text-ink-800">{d.title}</span>
            <span className="text-ink-400">{fa(d.versions.length - 1)} نسخه‌ی قبلی</span>
          </button>
        ))}
      </div>
    </div>
  );
}
