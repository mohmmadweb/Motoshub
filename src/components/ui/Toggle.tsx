/** کلید v6.8: ۴۲×۲۴ با دستگیره‌ی ۱۸؛ روشن = primary */
export default function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ?? (on ? "غیرفعال‌سازی" : "فعال‌سازی")}
      disabled={disabled}
      onClick={onChange}
      className={`w-[42px] h-6 rounded-full flex items-center px-[3px] transition-colors shrink-0 ${
        on ? "bg-brand-600 justify-end" : "bg-ink-300 justify-start"
      } ${disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="w-[18px] h-[18px] rounded-full bg-[var(--color-input-bg)] block shadow-xs" />
    </button>
  );
}
