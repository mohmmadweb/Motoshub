// اعتبار محصول و سازنده — در فوتر همه‌ی نماها
export default function CreditFooter({ dark = false }: { dark?: boolean }) {
  return (
    <p className={`text-center text-[12px] py-3 ${dark ? "text-navy-300" : "text-ink-500"}`}>
      <span className={`font-bold ${dark ? "text-navy-100" : "text-ink-700"}`}>کاریز</span> · طراحی و توسعه توسط{" "}
      <a
        href="https://moto.shub.ir/"
        target="_blank"
        rel="noopener noreferrer"
        className={`font-semibold hover:underline ${dark ? "text-navy-200 hover:text-white" : "text-link"}`}
      >
        موتوشاب
      </a>
    </p>
  );
}
