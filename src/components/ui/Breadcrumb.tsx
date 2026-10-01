import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-[12px] text-ink-faint">
        <li>
          <Link to="/app/dashboard" className="hover:text-ink transition-colors duration-150">
            ContractCommand
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-line-strong" aria-hidden />
            {item.to ? (
              <Link to={item.to} className="hover:text-ink transition-colors duration-150">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink-muted">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
