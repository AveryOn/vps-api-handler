#!/usr/bin/env bash

git pull && npm run build && npm run pm2:restart && pm2 logs