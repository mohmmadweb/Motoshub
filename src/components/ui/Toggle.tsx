export default function Toggle({ on, onChange, disabled }: { on: boolean; onChange?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`w-10 h-[22px] rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
        on ? "bg-brand-600 justify-end" : "bg-ink-200 justify-start"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="w-[18px] h-[18px] rounded-full bg-white block shadow" />
    </button>
  );
}
