#!/usr/bin/env bash

git pull && npm i && npm run build && npm run pm2:restart