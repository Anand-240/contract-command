import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, ScrollText, GitBranch } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button, Checkbox, Field, Input } from '@/components/ui';
import { useSession } from '@/hooks';

const schema = z.object({
  email: z.string().min(1, 'Enter your official email address').email('Enter a valid email address'),
  password: z.string().min(import.meta.env.VITE_DEMO_MODE === '1' ? 6 : 8, 'Enter your password'),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const ASSURANCES = [
  { icon: ShieldCheck, text: 'Access is granted against your appointment and financial powers' },
  { icon: ScrollText, text: 'Every action is written to an append only audit trail' },
  { icon: GitBranch, text: 'Approvals follow the sanctioned chain with no override path' },
];

const DEMO_ROLES = [
  { label: 'Administrator', email: 'admin@contractcommand.local' },
  { label: 'Procurement Officer', email: 'procurement_officer@contractcommand.local' },
  { label: 'Approver', email: 'approver@contractcommand.local' },
  { label: 'Vendor Manager', email: 'vendor_manager@contractcommand.local' },
  { label: 'Auditor', email: 'auditor@contractcommand.local' },
];

export function LoginPage() {
  const { signIn, signedIn } = useSession();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  if (signedIn) return <Navigate to="/app/dashboard" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError('');
    try {
      await signIn(values.email, values.password);
      navigate('/app/dashboard');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign in failed.');
    } finally { setSubmitting(false); }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Information panel */}
      <section className="hidden flex-col justify-between border-r border-line bg-surface px-12 py-12 lg:flex">
        <Link to="/">
          <Logo />
        </Link>

        <div className="max-w-md">
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-ink">
            Secure Defense Procurement Management
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">
            Procurement plans, contracts, purchase orders, deliveries, invoices and payments are held
            on one record, with the authority for every decision recorded alongside it.
          </p>

          <ul className="mt-8 space-y-3.5">
            {ASSURANCES.map((item) => (
              <li key={item.text} className="flex items-start gap-2.5">
                <item.icon size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                <span className="text-[13.5px] leading-relaxed text-ink-muted">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-[11.5px] text-ink-faint">
          © 2026 ContractCommand. For authorized users only.
        </p>
      </section>

      {/* Sign in */}
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>

          <h2 className="mt-8 text-[22px] font-semibold tracking-tight text-ink lg:mt-0">Sign in</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-muted">
            Use the credentials issued with your appointment.
          </p>

          {import.meta.env.VITE_DEMO_MODE === '1' ? (
            <div className="mt-5 rounded-md border border-line bg-surface-muted p-3">
              <p className="text-[12px] font-semibold text-ink">Local demo accounts</p>
              <p className="mt-1 text-[12px] text-ink-muted">Choose a role to fill its email and demo password: <strong>123456</strong>.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_ROLES.map((account) => (
                  <button key={account.email} type="button" onClick={() => { setValue('email', account.email); setValue('password', '123456'); setServerError(''); }} className="rounded border border-line bg-surface px-2 py-1 text-[12px] text-brand hover:bg-surface-muted">
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                invalid={!!errors.email}
                placeholder="name@contractcommand.gov.in"
                {...register('email')}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  invalid={!!errors.password}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-ink-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-tint"
                >
                  {showPassword ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between gap-4 pt-0.5">
              <Checkbox id="remember" label="Remember me" {...register('remember')} />

            </div>

            {serverError ? <p role="alert" className="text-[13px] text-critical">{serverError}</p> : null}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 border-t border-line pt-4 font-mono text-[11.5px] leading-relaxed text-ink-faint">
            Every sign in attempt is recorded. Unauthorized access to this system is an offence.
          </p>
        </div>
      </section>
    </div>
  );
}
