#!/usr/bin/env bash
set -euo pipefail

SRC="$HOME/services/music/music-ui/dist/"
DEST="/var/www/music"

cd "$HOME/services/music/music-ui/"
npm run build

rsync -a --delete "$SRC"/ "$DEST"/
chown -R www-data:www-data "$DEST"
chmod -R 755 "$DEST"

nginx -t
systemctl reload nginx

echo "[✓] deploy done: $DEST"
