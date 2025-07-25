#!/bin/sh

mkdir -p /data/logs

chown -R $(whoami) /data/logs

cd /usr/src/app/rosetta

if [ "$MODE" = "online" ]; then
  echo "Mode is online"
  if [ "$NETWORK" = "solo" ]; then
    echo "Network is solo"
    exec pm2-runtime ./process_online_solo.json
  else
    exec pm2-runtime ./process_online.json
  fi
else
  echo "Mode is offline"
  exec pm2-runtime ./process_offline.json
fi
