#!/bin/sh

mkdir -p /data/logs

chown -R $(whoami) /data/logs

cd /usr/src/app/rosetta

if [ "$MODE" = "online" ]; then
  echo "Mode is online"
  exec pm2-runtime ./process_online.json
else
  echo "Mode is offline"
  exec pm2-runtime ./process_offline.json
fi
