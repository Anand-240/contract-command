import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  FileText,
  ClipboardList,
  Building2,
  Receipt,
  ShieldCheck,
  ScrollText,
  GitBranch,
  Lock,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { LIFECYCLE_STAGES } from '@/components/common';
import { Button, StatusBadge } from '@/components/ui';

const CAPABILITIES = [
  {
    icon: FileText,
    title: 'Contract Lifecycle Management',
    body: 'Link an approved procurement plan to a supplier agreement, control each status change, and record amendments with the previous and proposed values.',
    points: ['Approval before activation', 'Versioned amendments', 'Protected contract documents'],
  },
  {
    icon: ClipboardList,
    title: 'Procurement Planning',
    body: 'Record the requirement, budget, owner and needed date. Submit the plan for a recorded decision before it can become a contract.',
    points: ['Budget and timeline', 'Approve or reject', 'Approved plan to contract'],
  },
  {
    icon: Building2,
    title: 'Vendor Intelligence',
    body: 'Maintain supplier compliance and certification evidence, then score delivery, compliance, quality and cost with saved evaluation history.',
    points: ['Weighted evaluations', 'Certification records', 'Compliance review'],
  },
  {
    icon: Receipt,
    title: 'Invoice and Payment Control',
    body: 'Compare invoice lines with order prices and accepted delivery quantities. Explain mismatches before approval and prevent duplicate payment.',
    points: ['Exact mismatch reasons', 'Approval after match', 'Controlled payment status'],
  },
];

const CONTROLS = [
  { icon: Lock, title: 'Role based access', body: 'Procurement Officers, Vendor Managers, Approvers and Auditors see work relevant to their assigned role. The API enforces each decision and edit.' },
  { icon: ScrollText, title: 'Audit trails', body: 'Important submissions, decisions and payments create read-only audit entries with the actor and time.' },
  { icon: GitBranch, title: 'Approval workflows', body: 'Plans, contracts, amendments and invoices move through recorded decisions with comments and status history.' },
  { icon: ShieldCheck, title: 'Controlled financial processing', body: 'A payment requires an approved, matched invoice and cannot be created twice for the same claim.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-5">
          <Link to="/" aria-label="ContractCommand home"><Logo /></Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {[
              { label: 'Overview', href: '#overview' },
              { label: 'Capabilities', href: '#capabilities' },
              { label: 'Workflow', href: '#workflow' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto">
            <Link to="/login">
              <Button variant="primary" size="sm">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="overview" className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-20">
          <div>
            <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              Defense contract and procurement management
            </p>
            <h1 className="mt-4 text-[38px] font-semibold leading-[1.12] tracking-tight text-ink sm:text-[44px]">
              Defense Procurement, Controlled From Planning to Payment
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-ink-muted">
              Centralize procurement plans, contracts, vendors, purchase orders, invoices, approvals
              and payments while maintaining complete accountability.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button variant="primary" size="lg" iconRight={ArrowRight}>
                  Access Platform
                </Button>
              </Link>
              <a href="#capabilities">
                <Button variant="secondary" size="lg">
                  Explore Capabilities
                </Button>
              </a>
            </div>
          </div>

          {/* Example record included by the optional demo seed. */}
          <div className="rounded-lg border border-line bg-canvas shadow-raised">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Seeded example</p>
                <p className="code text-[12px] text-ink-faint">CT-2026-043</p>
                <p className="truncate text-[13.5px] font-medium text-ink">Aircraft Component Supply Agreement</p>
              </div>
              <StatusBadge meta={{ label: 'Active', tone: 'positive' }} size="sm" />
            </div>

            <div className="divide-y divide-line">
              {[
                { stage: 'Procurement plan', detail: 'PROC-2026-043 · Converted to contract', state: { label: 'Converted', tone: 'positive' as const } },
                { stage: 'Contract', detail: 'CT-2026-043 · Version 1.0', state: { label: 'Active', tone: 'positive' as const } },
                { stage: 'Purchase order', detail: 'PO-2026-00893 · 100 units', state: { label: 'Issued', tone: 'positive' as const } },
                { stage: 'Delivery', detail: 'DEL-2026-043 · 100 accepted', state: { label: 'Received', tone: 'positive' as const } },
                { stage: 'Invoice', detail: 'INV-2026-0204 · Three way match passed', state: { label: 'Matched', tone: 'positive' as const } },
                { stage: 'Payment', detail: 'PAY-2026-043 · Bank transfer recorded', state: { label: 'Paid', tone: 'positive' as const } },
              ].map((row) => (
                <div key={row.stage} className="flex items-center gap-3 bg-surface px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink">{row.stage}</p>
                    <p className="truncate font-mono text-[11px] text-ink-faint">{row.detail}</p>
                  </div>
                  <StatusBadge meta={row.state} size="sm" />
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="mx-auto max-w-6xl px-5 py-16">
        <div className="max-w-2xl">
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">Capabilities</p>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-ink">
            Four modules over one case record
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
            Every module writes to the same record, so the procurement cell, the finance branch and
            the audit authority read one version of the truth.
          </p>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="bg-surface p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-tint text-brand">
                <item.icon size={17} aria-hidden />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{item.body}</p>
              <ul className="mt-4 space-y-1.5">
                {item.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 font-mono text-[11.5px] text-ink-faint">
                    <ChevronRight size={12} className="mt-0.5 shrink-0" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">Workflow</p>
            <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-ink">
              One controlled path from requirement to release
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
              A case cannot skip a stage. Each transition records who acted, on what authority and
              against which document.
            </p>
          </div>

          <ol className="mt-10 grid gap-3 md:grid-cols-4 lg:grid-cols-8">
            {LIFECYCLE_STAGES.map((stage, index) => (
              <li key={stage} className="relative rounded-md border border-line bg-canvas px-3 py-3">
                <span className="code text-[11px] text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-1 text-[13px] font-medium leading-snug text-ink">{stage}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Compliance */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">Governance</p>
            <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-ink">
              Built for accountability and compliance
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">
              Procurement decisions are examined years after they are taken. ContractCommand records
              the state of every case as it was decided, so any file can be reconstructed exactly.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {CONTROLS.map((item) => (
              <div key={item.title} className="bg-surface p-5">
                <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  <item.icon size={15} className="text-brand" aria-hidden />
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-5 py-8">
          <div>
            <Link to="/" aria-label="ContractCommand home"><Logo /></Link>
            <p className="mt-2 text-[12.5px] text-ink-faint">Defense Procurement Management System</p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-2" aria-label="Footer">
            {['Overview', 'Capabilities', 'Workflow'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="text-[13px] text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                {label}
              </a>
            ))}
            <Link to="/login" className="text-[13px] text-ink-muted transition-colors duration-150 hover:text-ink">
              Login
            </Link>
          </nav>
          <p className="font-mono text-[11.5px] leading-relaxed text-ink-faint">
            © 2026 ContractCommand. All rights reserved.
            <br />
            For authorized users only.
          </p>
        </div>
      </footer>
    </div>
  );
}
