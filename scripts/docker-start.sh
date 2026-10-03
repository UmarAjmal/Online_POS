#!/bin/sh
set -e
echo "==> Starting Falcon Swift PVT. LTD. app with 2 PM2 cluster workers..."
exec pm2-runtime start ecosystem.config.cjs
