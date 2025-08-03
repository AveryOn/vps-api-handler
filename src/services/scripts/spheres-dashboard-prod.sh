#!/usr/bin/env bash
set -euo pipefail

# --- defaults (можно переопределить аргументами/ENV) ---
SRC="${SRC:-$HOME/services/spheres-dashboard/dist}"
DEST="${DEST:-/var/www/spheres-dashboard}"
OWNER="${OWNER:-www-data:www-data}"
CHMOD_MODE="${CHMOD_MODE:-755}"
RELOAD_NGINX="${RELOAD_NGINX:-true}"
QUIET="${QUIET:-false}"

usage() {
  cat <<EOF
Usage: sudo $(basename "$0") [options]

Options:
  -s, --src <path>      Source build dir (default: $SRC)
  -t, --dest <path>     Destination dir (default: $DEST)
  -o, --owner <u:g>     Owner:Group (default: $OWNER)
  -p, --chmod <mode>    chmod -R mode (default: $CHMOD_MODE)
  --no-reload           Do not nginx reload (default: reload)
  -q, --quiet           Less output
  -h, --help            Show help

Env overrides: SRC, DEST, OWNER, CHMOD_MODE, RELOAD_NGINX, QUIET
EOF
}

log() { [ "$QUIET" = "true" ] || echo "$@"; }

# --- args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--src) SRC="$2"; shift 2 ;;
    -t|--dest) DEST="$2"; shift 2 ;;
    -o|--owner) OWNER="$2"; shift 2 ;;
    -p|--chmod) CHMOD_MODE="$2"; shift 2 ;;
    --no-reload) RELOAD_NGINX="false"; shift ;;
    -q|--quiet) QUIET="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

# --- sanity checks ---
if [[ $EUID -ne 0 ]]; then echo "Run as root (sudo)"; exit 1; fi
if [[ ! -d "$SRC" ]]; then echo "SRC not found: $SRC"; exit 1; fi
command -v rsync >/dev/null 2>&1 || { 
  log "[*] installing rsync..."
  if command -v apt >/dev/null 2>&1; then apt update && apt install -y rsync
  else echo "rsync missing and package manager unknown"; exit 1
  fi
}

# --- deploy ---
log "[*] mkdir -p $DEST"
mkdir -p "$DEST"

log "[*] rsync -> $DEST"
# важна косая черта после SRC, чтобы копировать содержимое, а не папку
rsync -a --delete "$SRC"/ "$DEST"/

log "[*] chown $OWNER $DEST"
chown -R "$OWNER" "$DEST"

log "[*] chmod $CHMOD_MODE $DEST"
chmod -R "$CHMOD_MODE" "$DEST"

# --- nginx reload (optional) ---
if [[ "$RELOAD_NGINX" = "true" ]]; then
  if command -v nginx >/dev/null 2>&1; then
    log "[*] nginx -t"
    nginx -t
    if command -v systemctl >/dev/null 2>&1; then
      log "[*] systemctl reload nginx"
      systemctl reload nginx
    else
      log "[*] service nginx reload"
      service nginx reload
    fi
  else
    log "[!] nginx not installed, skip reload"
  fi
fi

log "[✓] deploy done: $DEST"
