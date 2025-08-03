#!/usr/bin/env bash

npm i && git pull && npm i && npm run build && npm run pm2:restart