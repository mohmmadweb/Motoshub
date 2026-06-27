import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Crumb = { label: string; to?: string };

export default function PageHeader({
  title,
  description,
  icon,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  breadcrumb?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-ink-400 mb-2">
          {breadcrumb.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronLeft size={12} />}
              {c.to ? (
                <Link to={c.to} className="hover:text-brand-600">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-600 font-medium">{c.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="w-10 h-10 rounded-lg bg-navy-800 text-white flex items-center justify-center shrink-0">
              {icon}
            </span>
          )}
          <div>
            <h1 className="text-lg font-bold text-ink-900">{title}</h1>
            {description && <p className="text-[13px] text-ink-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
