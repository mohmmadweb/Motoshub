// ---------------------------------------------------------------------------
// «پیشنهادی» — F03 بخش «خبرخوان‌ها» در پنل اطلاعات گروه/کانال (۱.۴.۵) — فقط مدیر
// افزودن چند خوراک RSS/Atom: نشانی، عنوان، فاصله‌ی بررسی (۱۵ دقیقه تا ۲۴ ساعت)، فیلتر کلیدواژه،
// حداکثر مطلب در هر بار، روشن/خاموش؛ «آزمایش» = پیش‌نمایش ۳ مطلب آخر. مطالب با بات «خبرخوان» منتشر می‌شوند.
// API: GET/POST /messaging/{groups|channels}/{id}/feeds/ · PATCH/DELETE …/feeds/{feed_id}/ · POST …/feeds/test/
// ---------------------------------------------------------------------------
import { useState } from "react";
import { ChevronDown, ChevronLeft, FlaskConical, Pencil, Plus, RefreshCw, Rss, Trash2, AlertTriangle } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import Toggle from "../../../components/ui/Toggle";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { useSocial, type FeedInput } from "../../../context/SocialContext";
import { endpoints, fmtEndpoint } from "../../../social/endpoints";
import type { Chat, FeedItem, RssFeed } from "../../../social/types";
import { Field, fa, stamp } from "../kit";

const INTERVALS = [15, 30, 60, 180, 360, 720, 1440];
const intervalLabel = (m: number) => (m < 60 ? `${fa(m)} دقیقه` : m < 1440 ? `${fa(m / 60)} ساعت` : "۲۴ ساعت");

export default function FeedsSection({ chat }: { chat: Chat }) {
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const feeds = s.feedsOf(chat.id);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RssFeed | "new" | null>(null);
  const seg = chat.chat_type === "channel" ? "channels" : "groups";

  const fetchNow = (f: RssFeed) => {
    const r = s.fetchFeedNow(f.id);
    if (!r.ok) return notify(`واکشی «${f.title}» ناموفق بود: ${r.error}`, "warning");
    notify(r.published ? `${fa(r.published)} مطلب تازه منتشر شد.` : "مطلب تازه‌ای (منطبق با کلیدواژه‌ها) نبود.", r.published ? "success" : "info");
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen((x) => !x)} className="w-full flex items-center gap-2 text-sm font-bold text-ink-900" aria-expanded={open}>
        <Rss size={14} className="text-amber-600" />
        خبرخوان‌ها ({fa(feeds.length)})
        {feeds.some((f) => f.last_error) && <AlertTriangle size={13} className="text-amber-500" aria-label="خطای واکشی" />}
        <span className="mr-auto text-ink-400">{open ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-ink-400 leading-5">مطالب تازه‌ی خوراک‌های RSS/Atom خودکار با بات «خبرخوان» در همین {chat.chat_type === "channel" ? "کانال" : "گروه"} منتشر می‌شوند. فقط مدیران این بخش را می‌بینند.</p>
          {feeds.map((f) => (
            <div key={f.id} className={`rounded-lg border p-2.5 ${f.is_active ? "border-ink-200" : "border-ink-100 bg-ink-50/60"}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink-800 truncate">{f.title}</p>
                  <p className="text-[10.5px] text-ink-400 truncate" dir="ltr">
                    {f.url}
                  </p>
                </div>
                <Toggle on={f.is_active} onChange={() => (s.toggleFeed(f.id), notify(f.is_active ? "خوراک غیرفعال شد." : "خوراک فعال شد.", "info"))} label={f.is_active ? "فعال" : "غیرفعال"} />
              </div>
              <p className="text-[10.5px] text-ink-500 mt-1.5 leading-5">
                هر {intervalLabel(f.interval_minutes)} · حداکثر {fa(f.max_items)} مطلب در هر بار · {fa(f.items_published)} مطلب منتشرشده
                <br />
                آخرین واکشی: {f.last_fetched_at ? stamp(f.last_fetched_at) : "—"}
              </p>
              {f.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {f.keywords.map((k) => (
                    <Badge key={k} tone="neutral">
                      {k}
                    </Badge>
                  ))}
                </div>
              )}
              {f.last_error && <p className="text-[10.5px] text-rose-600 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {f.last_error}</p>}
              <div className="flex items-center gap-1 mt-1.5">
                <Button size="sm" variant="ghost" icon={<RefreshCw size={12} />} onClick={() => fetchNow(f)} title={fmtEndpoint(endpoints.feedFetchNow(seg, chat.id, f.id))}>
                  واکشی اکنون
                </Button>
                <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => setEditing(f)}>
                  ویرایش
                </Button>
                <button
                  type="button"
                  onClick={() => confirm({ title: `خوراک «${f.title}» حذف شود؟`, message: "مطالب منتشرشده در گفتگو می‌مانند.", confirmLabel: "حذف خوراک", onConfirm: () => (s.deleteFeed(f.id), notify("خوراک حذف شد.", "success")) })}
                  className="mr-auto p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-ink-50"
                  aria-label="حذف خوراک"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setEditing("new")}>
            افزودن خوراک
          </Button>
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "افزودن خوراک RSS/Atom" : "ویرایش خوراک"} description={editing === "new" ? fmtEndpoint(endpoints.feedCreate(seg, chat.id)) : editing ? fmtEndpoint(endpoints.feedUpdate(seg, chat.id, editing.id)) : undefined}>
        {editing && <FeedForm key={editing === "new" ? "new" : editing.id} chat={chat} feed={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function FeedForm({ chat, feed, onDone }: { chat: Chat; feed?: RssFeed; onDone: () => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const minI = Number(s.setting("messaging.feeds.min_interval_minutes") ?? 15) || 15;
  const [f, setF] = useState<FeedInput>({ id: feed?.id, chat_id: chat.id, url: feed?.url ?? "", title: feed?.title ?? "", interval_minutes: feed?.interval_minutes ?? Math.max(30, minI), keywords: feed?.keywords ?? [], max_items: feed?.max_items ?? 3, is_active: feed?.is_active ?? true });
  const [kw, setKw] = useState((feed?.keywords ?? []).join("، "));
  const [test, setTest] = useState<{ title: string; items: FeedItem[] } | { error: string } | null>(null);
  const set = (p: Partial<FeedInput>) => setF((x) => ({ ...x, ...p }));
  const keywords = kw.split(/[,،]/).map((x) => x.trim()).filter(Boolean);

  const runTest = () => {
    const r = s.testFeed(f.url);
    setTest(r.ok ? { title: r.title, items: r.items } : { error: r.error });
    if (r.ok && !f.title.trim()) set({ title: r.title });
  };
  const save = () => {
    const r = s.saveFeed({ ...f, keywords });
    if (!r.ok) return notify(r.error, "warning");
    notify(feed ? "خوراک ذخیره شد." : "خوراک اضافه شد و نخستین واکشی انجام شد.", "success");
    onDone();
  };

  return (
    <div className="space-y-3">
      <Field label="نشانی RSS/Atom *">
        <div className="flex gap-2">
          <input className="input-field flex-1 min-w-0" dir="ltr" value={f.url} onChange={(e) => (set({ url: e.target.value }), setTest(null))} placeholder="https://www.irna.ir/rss" autoFocus />
          <Button size="sm" icon={<FlaskConical size={13} />} onClick={runTest} disabled={!f.url.trim()}>
            آزمایش
          </Button>
        </div>
      </Field>
      {test &&
        ("error" in test ? (
          <p className="text-xs text-rose-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {test.error}
          </p>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
            <p className="text-[11px] text-emerald-700 mb-1">خوراک معتبر است — ۳ مطلب آخر «{test.title}»:</p>
            <ul className="space-y-1">
              {test.items.map((it) => (
                <li key={it.guid} className="text-[11.5px] text-ink-700">
                  <span className="font-medium">{it.title}</span>
                  <span className={`text-[10px] mr-1 ${keywords.length && !keywords.some((k) => it.title.includes(k) || it.summary.includes(k)) ? "text-ink-400 line-through" : "text-ink-400"}`}>{it.published}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      <Field label="عنوان" hint="خالی = عنوان خود خوراک">
        <input className="input-field" value={f.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="فاصله‌ی بررسی">
          <select className="input-field" value={f.interval_minutes} onChange={(e) => set({ interval_minutes: Number(e.target.value) })}>
            {INTERVALS.filter((m) => m >= minI).map((m) => (
              <option key={m} value={m}>
                هر {intervalLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="حداکثر مطلب در هر بار">
          <input className="input-field" type="number" min={1} max={10} value={f.max_items} onChange={(e) => set({ max_items: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} dir="ltr" />
        </Field>
      </div>
      <Field label="فیلتر کلیدواژه (اختیاری)" hint="با ویرگول جدا کنید؛ فقط مطالبی که یکی از این واژه‌ها را دارند منتشر می‌شوند.">
        <input className="input-field" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="نوآوری، فناوری" />
      </Field>
      <label className="flex items-center justify-between gap-2 text-xs text-ink-700">
        فعال
        <Toggle on={f.is_active} onChange={() => set({ is_active: !f.is_active })} />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          انصراف
        </Button>
        <Button variant="primary" onClick={save}>
          {feed ? "ذخیره" : "افزودن خوراک"}
        </Button>
      </div>
    </div>
  );
}
