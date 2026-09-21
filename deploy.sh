#!/usr/bin/env bash
# Deploy script for the Bitrix24 Reports Dashboard.
#
# Run as root on a fresh Ubuntu/Debian server:
#   curl -fsSL -o deploy.sh https://raw.githubusercontent.com/4110bk-rgb/-/<branch>/deploy.sh
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Or, if you already have the repo cloned locally, just run it from the repo root.
#
# Configure via environment variables before running, e.g.:
#   GIT_REPO_URL=https://<token>@github.com/4110bk-rgb/-.git BRANCH=main ./deploy.sh
#
# The repository is private, so GIT_REPO_URL must include credentials
# (a GitHub personal access token) or you must set up a deploy key and use
# an SSH URL instead (git@github.com:4110bk-rgb/-.git).

set -euo pipefail

GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/4110bk-rgb/-.git}"
BRANCH="${BRANCH:-}"                      # empty = repo default branch
APP_DIR="${APP_DIR:-/opt/bitrix24-reports-dashboard}"
SERVICE_NAME="${SERVICE_NAME:-bitrix24-dashboard}"
NODE_MAJOR="${NODE_MAJOR:-20}"
APP_USER="${APP_USER:-bitrix24dash}"
PORT="${PORT:-3000}"

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root (e.g. with sudo)." >&2
  exit 1
fi

echo "==> Installing prerequisites (git, curl, build tools)"
apt-get update -y
apt-get install -y ca-certificates curl git build-essential

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed -E 's/^v([0-9]+).*/\1/')" -lt "$NODE_MAJOR" ]]; then
  echo "==> Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

echo "==> Node: $(node -v), npm: $(npm -v)"

if ! id "$APP_USER" >/dev/null 2>&1; then
  echo "==> Creating service user $APP_USER"
  useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

if [[ -d "$APP_DIR/.git" ]]; then
  echo "==> Repo already present, pulling latest"
  git -C "$APP_DIR" fetch origin
  if [[ -n "$BRANCH" ]]; then
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
  else
    git -C "$APP_DIR" reset --hard "@{u}"
  fi
else
  echo "==> Cloning repository into $APP_DIR"
  if [[ -n "$BRANCH" ]]; then
    git clone --branch "$BRANCH" --single-branch "$GIT_REPO_URL" "$APP_DIR"
  else
    git clone "$GIT_REPO_URL" "$APP_DIR"
  fi
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example (EDIT THIS BEFORE STARTING THE SERVICE)"
  cp .env.example .env
  echo "    -> Edit $APP_DIR/.env and set BITRIX_WEBHOOK_URL (and any other secrets) now."
fi

echo "==> Installing production dependencies"
npm ci --omit=dev

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> Writing systemd unit"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Bitrix24 Reports Dashboard
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(command -v node) ${APP_DIR}/server/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  echo "==> Opening port ${PORT} in ufw"
  ufw allow "${PORT}/tcp"
fi

echo
echo "==> Done. Service status:"
systemctl --no-pager status "$SERVICE_NAME" || true
echo
echo "Dashboard should be reachable at: http://<SERVER_IP>:${PORT}"
echo "Logs: journalctl -u ${SERVICE_NAME} -f"
echo "Config: ${APP_DIR}/.env (edit and 'systemctl restart ${SERVICE_NAME}' to apply changes)"
