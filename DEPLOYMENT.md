# PostgreSQL and Docker deployment

## Current database state

The Docker backend uses PostgreSQL exclusively. The local `.env` points to the Supabase PostgreSQL connection supplied for this workspace. On 2026-10-01, the previous MySQL database was backed up and 207 Django records were imported into Supabase; old authentication tokens were intentionally excluded. SQL, fixture, environment, and upload backups are stored privately in `.local-backups/` and are ignored by Git. The old MySQL Docker volume was retained.

This describes database and deployment plumbing. The product audit in `FINAL_AUDIT.md` still lists business controls that must be finished before real procurement production use.

## Supabase connection

1. In Supabase Dashboard → **Connect**, copy the PostgreSQL URL. Use the **session pooler** on IPv4-only Docker hosts; use the direct connection when IPv6 is available. Keep the URL in the local or server `.env`, never in Git or chat. Supabase API keys are not database passwords.
2. Encode special characters in the password part of the URL (for example, `@` as `%40`). Set `DB_SSLMODE=require`.
3. Set a long random `DJANGO_SECRET_KEY`. For local HTTP, keep `DJANGO_SECURE_SSL=0`.
4. Start: `docker compose up -d --build`. Check `docker compose ps` and `curl -fsS http://127.0.0.1:5173/api/health/`.

The Compose stack contains the React/Nginx frontend and Django backend. It deliberately has no MySQL container. Uploaded files remain in the `protected_media` Docker volume; moving only the database does not move uploaded files.

For a separate local PostgreSQL database, set a long URL-safe `POSTGRES_PASSWORD` and run:

```sh
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

The local overlay uses PostgreSQL 17 with a named `postgres_data` volume and disables TLS only for this container. Do not run the Django test suite against Supabase; tests create and destroy a database. CI uses its own disposable PostgreSQL service.

## Migrating an existing MySQL installation

1. Stop writes to MySQL. Back up the MySQL database and the `protected_media` volume; keep backups private.
2. Export Django records from the old backend with `manage.py dumpdata --natural-foreign --natural-primary --exclude contenttypes --exclude auth.permission`. Exclude `authtoken.token` from the import to invalidate old sessions.
3. Set the new `DATABASE_URL` and `DB_SSLMODE=require`; run `manage.py migrate --noinput` on the empty Supabase database.
4. Import the filtered fixture with `manage.py loaddata <fixture.json>`. Compare counts for every model and verify users can log in.
5. Start the new Docker stack, test `/api/health/`, and run the role and lifecycle walkthrough. Retain the MySQL backup and volume until the walkthrough is accepted.

Do not repeat the import into a database that already has records. Existing IDs or users may conflict. The local migration in this workspace has already completed.

## GitHub Actions

`.github/workflows/ci-cd.yml` runs on pull requests, pushes to `main`, and manual dispatch:

- **verify** starts PostgreSQL 17, runs Django checks, all backend tests and OpenAPI validation, builds the frontend, validates Compose, and builds both Docker images.
- **publish** runs after verification for non-PR events. It pushes commit SHA-tagged images to GHCR using `GITHUB_TOKEN`.
- **deploy** runs for `main` only when repository variable `DEPLOY_ENABLED=true` is set. It uses the `production` GitHub environment, copies deployment files over SSH, pulls the tested images, starts containers, and checks database-backed health. If a previous image pair exists and deployment fails, the script attempts to restore it.

The deploy job needs these GitHub **Secrets**: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_KNOWN_HOSTS`. Put the verified SSH host key in `DEPLOY_KNOWN_HOSTS`; do not disable host verification. The GitHub repository and target server must exist before the workflow can run. The workflow does not contain a Supabase password.

## Server setup

Use a VM/VPS with Docker Engine, Docker Compose, SSH, and `curl`. Point a domain's DNS record at it and allow inbound TCP 80/443. In the deployment user's home directory, create `~/contractcommand/.env` with mode 600:

```dotenv
DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@SUPABASE_HOST:5432/postgres
DJANGO_SECRET_KEY=LONG_RANDOM_SECRET
DJANGO_ALLOWED_HOSTS=your-domain.example,backend
DJANGO_CSRF_TRUSTED_ORIGINS=https://your-domain.example
CORS_ALLOWED_ORIGINS=https://your-domain.example
APP_DOMAIN=your-domain.example
ACME_EMAIL=admin@your-domain.example
AUTH_TOKEN_TTL_HOURS=8
```

`docker-compose.deploy.yml` keeps the backend private, serves the frontend on server loopback for health checks, and uses Caddy to terminate HTTPS on 80/443. Django enforces HTTPS and secure cookies. The deployment copies `Caddyfile`, the Compose file, and `scripts/deploy_remote.sh` to the server. Published images have demo mode off and the deployment does not seed demo users.

The production `.env` stays on the server across deployments. `images.env` stores the last deployed image SHA tags. Back up Supabase PostgreSQL and `protected_media` separately, and test restoration. Supabase Free has a 500 MB database quota and may pause inactive projects; it is suitable for a showcase, not uninterrupted production service.

## Verification and rollback

Run `docker compose --env-file .env --env-file images.env -f docker-compose.deploy.yml ps` on the server. Confirm `https://your-domain.example/api/health/` returns `{"status":"ok"}`, then test all roles. A failed deploy attempts to restart the previous image pair; database schema migrations themselves are not rolled back. Keep a pre-deployment database backup for schema or data recovery.
