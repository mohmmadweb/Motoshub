// کپی‌رایت سازنده — در فوتر همه‌ی نماها
export default function CreditFooter({ dark = false }: { dark?: boolean }) {
  return (
    <p className={`text-center text-[11px] py-3 ${dark ? "text-navy-400" : "text-ink-400"}`}>
      طراحی و توسعه توسط{" "}
      <a
        href="https://moto.shub.ir/"
        target="_blank"
        rel="noopener noreferrer"
        className={`font-semibold hover:underline ${dark ? "text-navy-200 hover:text-white" : "text-brand-600 hover:text-brand-700"}`}
      >
        موتوشاب
      </a>
    </p>
  );
}
