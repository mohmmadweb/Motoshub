import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * کارت v6.8: زمینه‌ی کارت، حاشیه‌ی ۱px خیلی کم‌رنگ، گوشه‌ی ۱۴، بدون سایه، padding ۲۰.
 * با `title` سرآیند `.ch` می‌گیرد (عنوان ۱۶/۲۶ + آیکون ۲۰px + اقدام‌ها در سمت دیگر)؛
 * در این حالت بدنه flush نیست مگر `flush` داده شود. با `href` کل کارت لینک است و با hover بالا می‌آید.
 * قانون داشبورد: عنوان کارت = برچسب منو و `titleHref` به همان صفحه.
 */
export default function Card({
  title,
  description,
  icon,
  actions,
  titleHref,
  href,
  flush,
  children,
  className = "",
  bodyClassName = "",
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  /** لینک عنوان سرآیند (کارت‌های داشبورد → صفحه‌ی منو) */
  titleHref?: string;
  /** کل کارت قابل کلیک */
  href?: string;
  /** بدنه بدون padding (برای فهرست‌ها و جدول‌ها) */
  flush?: boolean;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const head = (title || actions) && (
    <div className="card-head">
      {icon && <span className="text-brand-600 shrink-0 [&_svg]:w-5 [&_svg]:h-5">{icon}</span>}
      <div className="flex-1 min-w-0">
        {title &&
          (titleHref ? (
            <Link to={titleHref} className="t-card text-ink-900 hover:text-[var(--color-link)]">
              <h2 className="inline">{title}</h2>
            </Link>
          ) : (
            <h2 className="t-card text-ink-900">{title}</h2>
          ))}
        {description && <p className="text-sm leading-6 text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
  const body = children !== undefined && <div className={`${flush ? "" : "p-5"} ${bodyClassName}`}>{children}</div>;

  if (href) {
    return (
      <Link to={href} id={id} className={`card card-link block ${className}`}>
        {head}
        {body}
      </Link>
    );
  }
  return (
    <section id={id} className={`card ${className}`}>
      {head}
      {body}
    </section>
  );
}
