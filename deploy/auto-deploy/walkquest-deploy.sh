#!/usr/bin/env bash
# Pull-based continuous deploy for walkquest on oci-django.
#
# Run by walkquest-deploy.timer (every 2 min) as opc. When origin/main has a
# new commit it fast-forwards the live checkout, installs deps if the lock
# files changed, builds the Vite bundle, migrates, collects static, restarts
# the app + Celery and checks /api/health. A failed health check rolls code and
# static back to the previous commit (migrations are not reversed) and the bad
# commit is skipped until main moves again.
#
# Installed as /usr/local/bin/walkquest-deploy (see deploy/auto-deploy/README.md)
# so a deploy that changes this file never rewrites the running script.
#
# Manual run:  sudo systemctl start walkquest-deploy.service
# Logs:        journalctl -u walkquest-deploy.service -n 100
set -Eeuo pipefail

APP_DIR=/srv/django/walkquest
BRANCH=main
HEALTH_URL=http://127.0.0.1:8000/api/health
HEALTH_HOST=walkquest.andreadev.uk
SERVICES=(walkquest walkquest-celery-worker walkquest-celery-beat)
STATE_DIR=/var/lib/walkquest-deploy
FORCE=${1:-}

export VIRTUAL_ENV=$APP_DIR/.venv
export PATH=$VIRTUAL_ENV/bin:/usr/local/bin:/usr/bin:/bin
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-config.settings.production}
export POETRY_NO_INTERACTION=1

log() { echo "[walkquest-deploy] $*"; }

cd "$APP_DIR"
exec 9>"$STATE_DIR/lock"
flock -n 9 || { log "another deploy is running"; exit 0; }

git fetch --quiet origin "$BRANCH"
old=$(git rev-parse HEAD)
new=$(git rev-parse "origin/$BRANCH")

if [[ "$old" == "$new" && "$FORCE" != force ]]; then exit 0; fi
if [[ "$FORCE" != force && -f "$STATE_DIR/failed" && "$(cat "$STATE_DIR/failed")" == "$new" ]]; then
  exit 0 # already rolled back from this commit; wait for a new one
fi

# Never discard work on the live box: tracked edits abort the deploy.
if ! git diff --quiet HEAD --; then
  log "live checkout has uncommitted changes to tracked files; not deploying"
  git status --short --untracked-files=no
  exit 1
fi

if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  log "switching live checkout to $BRANCH"
  git switch --quiet "$BRANCH"
fi
git merge --quiet --ff-only "$new"
log "deploying ${old:0:7} -> ${new:0:7}"

changed() { [[ "$FORCE" == force ]] || ! git diff --quiet "$1" "$2" -- "${@:3}"; }

build() {
  local from=$1 to=$2
  if changed "$from" "$to" poetry.lock pyproject.toml; then
    log "installing python deps"
    poetry install --only main --no-root
  fi
  if changed "$from" "$to" package-lock.json; then
    log "installing node deps"
    npm ci --no-audit --no-fund
  fi
  log "building frontend"
  npm run build --silent
  python manage.py collectstatic --noinput --verbosity 0
}

restart_and_check() {
  sudo systemctl restart "${SERVICES[@]}"
  for _ in $(seq 1 20); do
    sleep 3
    if curl -fsS -o /dev/null -H "Host: $HEALTH_HOST" -H 'X-Forwarded-Proto: https' "$HEALTH_URL"; then
      return 0
    fi
  done
  return 1
}

rollback() {
  trap - ERR
  log "deploy of ${new:0:7} failed; rolling back to ${old:0:7}"
  echo "$new" > "$STATE_DIR/failed"
  git reset --quiet --hard "$old"
  FORCE=force build "$old" "$old" || true
  restart_and_check || log "rollback health check failed too — needs a human"
  exit 1
}
trap rollback ERR

build "$old" "$new"
python manage.py migrate --noinput
restart_and_check || rollback

trap - ERR
rm -f "$STATE_DIR/failed"
log "live at ${new:0:7}: $(git log -1 --format=%s)"
