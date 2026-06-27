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
        <div className="overflow-x-auto">
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
      )}
    </div>
  );
}
