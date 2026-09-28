# Auto-deploy of `main` to oci-django

Merging to `main` on GitHub puts it live on oci-django within ~2 minutes.

It is pull-based: a systemd timer on the box runs `walkquest-deploy` every
2 minutes, which fetches `origin/main` (outbound SSH to GitHub only — no
inbound webhook or open port, and no server credentials stored in GitHub).
When `main` moved it:

1. fast-forwards `/srv/django/walkquest` to `origin/main` (aborts if the live
   checkout has uncommitted edits to tracked files);
2. `poetry install --only main` if `poetry.lock`/`pyproject.toml` changed,
   `npm ci` if `package-lock.json` changed;
3. `npm run build`, `collectstatic`, `migrate`;
4. restarts `walkquest`, `walkquest-celery-worker`, `walkquest-celery-beat`;
5. checks `http://127.0.0.1:8000/api/health`. On failure it resets code and
   static to the previous commit and restarts again (migrations are **not**
   reversed), then skips that commit until `main` moves again.

## Install / update

```sh
sudo install -m 755 deploy/auto-deploy/walkquest-deploy.sh /usr/local/bin/walkquest-deploy
sudo install -m 644 deploy/auto-deploy/walkquest-deploy.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now walkquest-deploy.timer
```

Re-run the `install` lines after changing these files (the script is copied
so a deploy never rewrites the running script).

## Operate

```sh
systemctl list-timers walkquest-deploy.timer        # next run
sudo systemctl start walkquest-deploy.service       # deploy now
journalctl -u walkquest-deploy.service -n 100       # what happened
sudo systemctl disable --now walkquest-deploy.timer # pause auto-deploy
cat /var/lib/walkquest-deploy/failed                # commit that was rolled back, if any
```
