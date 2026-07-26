import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import EmptyState from "./EmptyState";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  searchKeys,
  searchPlaceholder = "جستجو…",
  toolbar,
  onRowClick,
  emptyTitle = "موردی پیدا نشد",
}: {
  columns: Column<T>[];
  rows: T[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q || !searchKeys) return rows;
    const term = q.toLowerCase();
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(term)));
  }, [q, rows, searchKeys]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-ink-100 flex-wrap">
        {searchKeys && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="input-field !pr-8"
            />
          </div>
        )}
        {toolbar}
      </div>

      {filtered.length === 0 ? (
        <div className="p-4">
          <EmptyState title={emptyTitle} />
        </div>
      ) : (
        <>
          {/* دسکتاپ/تبلت: جدول کلاسیک */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="table-shell">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={c.className}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} onClick={() => onRowClick?.(row)} className={onRowClick ? "cursor-pointer" : ""}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.className}>
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* موبایل: کارت به‌جای جدول عریض — هر ردیف یک کارت جفت برچسب/مقدار */}
          <div className="sm:hidden divide-y divide-ink-100">
            {filtered.map((row) => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`p-3.5 space-y-2 ${onRowClick ? "cursor-pointer active:bg-ink-50" : ""}`}
              >
                {columns.map((c) => {
                  const value = c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—");
                  if (value === null || value === "" || value === "—") return null;
                  return (
                    <div key={c.key} className="flex items-start justify-between gap-3">
                      {c.label && <span className="text-[11px] text-ink-400 shrink-0 pt-0.5">{c.label}</span>}
                      <span className="text-[13px] text-ink-800 text-left min-w-0 [&_*]:justify-end">{value}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
