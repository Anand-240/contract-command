# ContractCommand

ContractCommand is a defense procurement workflow application. It links procurement plans, vendor evaluation, contracts, purchase orders, delivery acceptance, invoices, three way matching, approvals, payments, and audit records.

## Architecture

React 18 + TypeScript + Vite + Tailwind → Axios → Django REST Framework → service rules → Django ORM → PostgreSQL. The Docker app can connect to Supabase PostgreSQL; a separate Compose overlay provides disposable local PostgreSQL for development and tests.

`src/` contains the existing React pages, components, hooks, types, and API services. `backend/core/` contains models, serializers, API views, business services, tests, migrations, and the demo seed command. The API uses the same camel case field names as the frontend.

## Development setup

Requires Python 3.12+, Node 22+, npm, and PostgreSQL. Set `DATABASE_URL`, `DB_SSLMODE`, and `DJANGO_SECRET_KEY` in your environment before running Django outside Docker.

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend && ../.venv/bin/python manage.py migrate && cd ..
npm ci
```

In separate terminals:

```bash
cd backend && ../.venv/bin/python manage.py runserver 127.0.0.1:8000
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to Django on port 8000. For a separate API host, set `VITE_API_BASE_URL` to its `/api` URL and set `CORS_ALLOWED_ORIGINS` to the frontend origin.

## Docker and Supabase PostgreSQL

Copy `.env.example` to `.env`. Put your Supabase PostgreSQL **connection string** in `DATABASE_URL` and replace the secret key. A Supabase publishable or service role API key is not a database password. URL-encode special characters in the database password and keep `.env` private. Then run:

```bash
docker compose up -d --build
```

Open `http://localhost:5173`; API health is at `/api/health/`, API docs are at `http://localhost:8000/api/docs/`, and ReDoc is at `/api/redoc/`. Supabase holds relational data; uploaded documents use the Docker `protected_media` volume. The backend waits for PostgreSQL, runs migrations, then starts Gunicorn. Nginx serves the built React app and proxies `/api`. For a fresh **demo-only** database, seed records after containers are healthy:

```bash
docker compose exec backend python manage.py seed_demo
```

For the local showcase, set `VITE_DEMO_MODE=1` and `DEMO_PASSWORD=123456` in `.env` before building and seeding. The seed command is repeatable but updates demo user passwords; do not run it against real users. Outside demo mode, it requires a password of at least 12 characters. Do not use seeded accounts or the demo password in production.
Sessions expire after 8 hours by default. Set `AUTH_TOKEN_TTL_HOURS` in `.env` to change the duration; signing in again replaces the previous token.
The Admin account can manage users and Django groups at `http://localhost:8000/admin/`. Workflow permissions are defined in `backend/core/services.py`; the in-app Account and access page shows the signed-in user's workspace.
For a local walkthrough, `VITE_DEMO_MODE=1` adds role buttons that fill the demo email and password. The GitHub Actions production image builds with this flag off. For a local PostgreSQL container instead of Supabase, run `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build` with `POSTGRES_PASSWORD` set in `.env`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Supabase setup, MySQL data migration, GitHub Actions, HTTPS, backups, and deployment requirements.

## Local demo data

```bash
cd backend
DEMO_MODE=1 DEMO_PASSWORD=123456 ../.venv/bin/python manage.py seed_demo
```

Use that password with these accounts:

| Role | Email |
| --- | --- |
| Administrator | `admin@contractcommand.local` |
| Procurement Officer | `procurement_officer@contractcommand.local` |
| Approver | `approver@contractcommand.local` |
| Vendor Manager | `vendor_manager@contractcommand.local` |
| Auditor | `auditor@contractcommand.local` |

The seed includes Aero Precision Systems Ltd., an evaluated and compliant vendor, and a completed navigation component procurement chain. New demo workflows can be created alongside it.
It also includes a vendor needing compliance review and a procurement plan waiting for approval, so the Vendor Manager and Approver have visible work immediately after sign-in.

## Role workspaces

The sidebar, dashboard and direct page access follow the assigned role. The API separately enforces write permissions and protects the approval queue, full audit log, reports, invoices and payments where those records are outside a role.
Accounts without exactly one recognized role are denied access. A superuser is treated as Admin.

| Role | Main visible work | Handoff in the demo |
| --- | --- | --- |
| Administrator | All modules, decisions, audit and reports | Oversees the complete chain |
| Vendor Manager | Vendors, evaluations, purchase orders and deliveries | Qualifies the supplier and records accepted delivery |
| Procurement Officer | Vendors, plans, contracts, orders, deliveries and invoices | Submits the plan, issues the contract and order, runs the invoice match |
| Approver | Plans, contracts, invoices, approvals and payments | Approves the plan, contract and matched invoice, then releases payment |
| Auditor | Read-only procurement, supplier, financial, audit and report views | Verifies the full history and exports evidence |

Use **Sign out** between roles. The demo account picker fills the email and password `123456` for each seeded role. A role cannot be changed from the frontend without signing in as that account.

## Demonstration sequence

1. Sign in as Vendor Manager. Review Deccan Avionics Supply Ltd., update its compliance and certification, and record an evaluation. Aero Precision Systems Ltd. is already compliant for a quick run.
2. Sign in as Procurement Officer. Create and submit a plan, or use the seeded Flight Control Harness Replenishment case.
3. Sign in as Approver. Approve the plan in the Approval Queue.
4. Sign in as Procurement Officer. Create a contract linked to the approved plan and a compliant vendor, then submit it for review.
5. Sign in as Approver. Approve the contract.
6. Sign in as Procurement Officer. Activate the contract and issue a purchase order for **100 units**.
7. Sign in as Vendor Manager. Open Deliveries and record **100 accepted units**.
8. Sign in as Procurement Officer. Record an invoice for **110 units**. Run Three Way Match, inspect the exact excess, correct it to **100 units**, and rerun the match.
9. Sign in as Approver. Approve the matched invoice, create and approve its payment, begin processing, and mark it paid with a bank reference.
10. Sign in as Auditor. Open Audit Logs and Reports to inspect the recorded sequence and live totals. Sign in as Administrator to see the full workspace.

## Tests and checks

```bash
cd backend && ../.venv/bin/python manage.py test core
cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run
cd backend && ../.venv/bin/python manage.py spectacular --validate --file /tmp/contractcommand-openapi.yaml
npm run build
```

The API tests cover login, authorization, a complete lifecycle, a quantity mismatch and correction, a price mismatch, missing delivery, payment guards, rejected plans, invalid dates, overdelivery, calculated totals, and read only audit access. `.github/workflows/ci-cd.yml` runs PostgreSQL tests, schema validation, frontend and Docker builds, then publishes and optionally deploys images.

## Environment

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Required Django secret; generate a unique value per deployment |
| `DJANGO_DEBUG` | `0` by default; use `1` only in development |
| `DJANGO_ALLOWED_HOSTS` | Comma separated backend hosts |
| `DJANGO_SECURE_SSL` | Set to `1` behind an HTTPS reverse proxy; enables secure cookies and HSTS |
| `DATABASE_URL` | Supabase PostgreSQL connection URL; required |
| `DB_SSLMODE` | `require` for Supabase; `disable` for local PostgreSQL only |
| `POSTGRES_PASSWORD` | Only for the local PostgreSQL Compose overlay |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Public HTTPS origin for Django admin forms |
| `CORS_ALLOWED_ORIGINS` | Allowed browser origins |
| `VITE_API_BASE_URL` | Browser API base URL; defaults to `/api` |
| `VITE_PROXY_TARGET` | Vite development proxy target |
| `DEMO_PASSWORD` | Password applied by `seed_demo` |

## API and roles

Token login: `POST /api/auth/login/` with `email` and `password`. Pass `Authorization: Token <token>` to protected endpoints. The interactive schema is at `/api/docs/`; machine schema is at `/api/schema/`. Workflow payloads, roles and status codes are also listed in `backend/API.md`.

Procurement Officers create vendors, plans, contracts, orders, deliveries and invoices. Approvers decide plans, contracts, invoices and payments. Vendor Managers manage vendors and evaluations. Auditors can read records and reports, but cannot mutate them. The backend checks these permissions and status transitions.

Contract files are authenticated downloads. Uploads accept PDF, DOCX and XLSX files up to 25 MB; SHA-256 checksums and version metadata are recorded. For a real deployment, add malware scanning, object storage, short lived tokens, TLS termination and operational backups.
