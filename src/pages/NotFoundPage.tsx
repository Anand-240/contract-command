import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="code text-[12.5px] text-ink-faint">Error 404</p>
      <h1 className="mt-2 text-[24px] font-semibold text-ink">This page does not exist</h1>
      <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-muted">
        The address may have changed, or the record may have been closed. Return to the dashboard and
        search for the case reference.
      </p>
      <Link to="/app/dashboard" className="mt-5">
        <Button variant="primary">Go to dashboard</Button>
      </Link>
    </div>
  );
}
