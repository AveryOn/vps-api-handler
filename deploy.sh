#!/usr/bin/env bash

git fetch origin \
  && git reset --hard origin/$(git rev-parse --abbrev-ref HEAD) \
  && npm i \
  && npm run build \
#   && npm run pm2:restart