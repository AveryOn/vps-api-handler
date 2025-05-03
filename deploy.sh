#!/usr/bin/env bash

npm i && git pull && npm run build && npm run pm2:restart && pm2 logs