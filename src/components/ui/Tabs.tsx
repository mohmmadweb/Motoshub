export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-ink-200 mb-5 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
            active === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`text-[10px] rounded-full px-1.5 ${active === t.id ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
