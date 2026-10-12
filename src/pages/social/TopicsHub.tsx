// ---------------------------------------------------------------------------
// «هشتگ‌ها» — جدول برچسب‌ها مطابق نسخه‌ی اصلی موتوشاب (/core/tags/):
//   برچسب (# + نام) · تاریخ ایجاد · عملیات (ویرایش/حذف — فقط با taxonomy.manage)
// نوار ابزار: جستجو، مرتب‌سازی، «برچسب جدید»؛ پایین: شمار + صفحه‌بندی ۱۰تایی.
// کلیک روی نام برچسب → جستجوی سراسری همان برچسب (/dashboard/search?q=%23tag).
// پیوندهای قدیمی ?tag= هم به همان جستجو هدایت می‌شوند.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Hash, Plus, Search, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import type { Tag } from "../../social/types";
import { Pager, TableFooter } from "./Members";

const PAGE = 10;
type Sort = "newest" | "oldest" | "name";
const searchLink = (name: string) => `/dashboard/search?q=${encodeURIComponent(`#${name}`)}`;

export default function TopicsHub() {
  const [params] = useSearchParams();
  const legacyTag = params.get("tag");
  const s = useSocial();
  const { hasPermission, readOnly } = useTenancy();
  const manage = hasPermission("taxonomy.manage") && !readOnly;
  const { notify } = useToast();
  const confirm = useConfirm();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Tag | "new" | null>(null);

  const list = useMemo(() => {
    const term = q.trim().replace(/^#/, "");
    return s.tags
      .filter((t) => !term || t.name.includes(term))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "fa");
        const d = (a.created_at ?? "").localeCompare(b.created_at ?? "");
        return (sort === "newest" ? -d : d) || a.name.localeCompare(b.name, "fa");
      });
  }, [s.tags, q, sort]);

  useEffect(() => setPage(1), [q, sort]);
  if (legacyTag) return <Navigate to={searchLink(legacyTag.replace(/^#/, ""))} replace />;

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages);
  const rows = list.slice((cur - 1) * PAGE, cur * PAGE);

  const remove = (t: Tag) =>
    confirm({
      title: `برچسب «${t.name}» حذف شود؟`,
      message: "از همه‌ی مطالب برچسب‌خورده هم برداشته می‌شود.",
      confirmLabel: "حذف",
      onConfirm: () => {
        s.deleteTag(t.id);
        notify("برچسب حذف شد.", "success");
      },
    });

  return (
    <div>
      {/* نوار ابزار — یک ردیف */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-ink-900 shrink-0">هشتگ‌ها</h1>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-9 w-full" placeholder="جستجوی برچسب‌ها…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجوی برچسب‌ها" />
        </div>
        <div className="flex items-center gap-2 sm:mr-auto">
          <select className="input-field w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="مرتب‌سازی">
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="name">نام</option>
          </select>
          {manage && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
              برچسب جدید
            </Button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-[13px]">
            <thead>
              <tr className="bg-brand-800 text-white text-[12px]">
                <th className="text-right font-medium px-4 py-3">برچسب</th>
                <th className="text-center font-medium px-4 py-3">تاریخ ایجاد</th>
                {manage && <th className="text-center font-medium px-4 py-3 w-28">عملیات</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                  <td className="px-4 py-2.5">
                    <Link to={searchLink(t.name)} className="inline-flex items-center gap-2 min-w-0 text-ink-800 hover:text-brand-700" title="جستجوی این برچسب">
                      <span className="w-7 h-7 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <Hash size={14} />
                      </span>
                      <span className="truncate max-w-[320px]">{t.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-center text-ink-600 whitespace-nowrap">{(t.created_at ?? "").split(" ")[0] || "-"}</td>
                  {manage && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => setEditing(t)} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-500 hover:text-brand-700 hover:bg-brand-50" title="ویرایش" aria-label={`ویرایش ${t.name}`}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => remove(t)} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-500 hover:text-rose-600 hover:bg-rose-50" title="حذف" aria-label={`حذف ${t.name}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={manage ? 3 : 2} className="px-4 py-10 text-center text-[12.5px] text-ink-400">
                    برچسبی پیدا نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TableFooter shown={rows.length} total={list.length} />
      </div>
      <Pager page={cur} pages={pages} onChange={setPage} />

      {editing && <TagModal tag={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** ساخت / ویرایش نام برچسب */
function TagModal({ tag, onClose }: { tag: Tag | null; onClose: () => void }) {
  const { saveTag } = useSocial();
  const { notify } = useToast();
  const [name, setName] = useState(tag?.name ?? "");
  const [error, setError] = useState("");
  const submit = () => {
    const r = saveTag(tag ? { id: tag.id, name } : { name });
    if (!r.ok) return setError(r.error);
    notify(tag ? "نام برچسب در همه‌ی مطالب به‌روز شد." : "برچسب ساخته شد.", "success");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={tag ? "ویرایش برچسب" : "برچسب جدید"} width="max-w-md">
      <div className="space-y-3">
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="نام برچسب" aria-label="نام برچسب" autoFocus />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" onClick={submit}>
            ذخیره
          </Button>
        </div>
      </div>
    </Modal>
  );
}
