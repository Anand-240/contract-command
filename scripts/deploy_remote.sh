#!/bin/sh
set -eu

cd "$HOME/contractcommand"
test -f .env || { echo 'Missing ~/contractcommand/.env' >&2; exit 1; }
test -n "${BACKEND_IMAGE:-}" || { echo 'Missing BACKEND_IMAGE' >&2; exit 1; }
test -n "${FRONTEND_IMAGE:-}" || { echo 'Missing FRONTEND_IMAGE' >&2; exit 1; }

if [ -f images.env ]; then cp images.env images.env.previous; fi
umask 077
printf 'BACKEND_IMAGE=%s\nFRONTEND_IMAGE=%s\n' "$BACKEND_IMAGE" "$FRONTEND_IMAGE" > images.env.new
mv images.env.new images.env

compose() {
    docker compose --env-file .env --env-file images.env -f docker-compose.deploy.yml "$@"
}

if compose config -q && compose pull && compose up -d --wait && curl --fail --silent --show-error http://127.0.0.1:5173/api/health/; then
    rm -f images.env.previous
    echo 'Deployment healthy'
else
    echo 'Deployment failed health check' >&2
    if [ -f images.env.previous ]; then
        mv images.env.previous images.env
        compose up -d --wait || true
    fi
    exit 1
fi
