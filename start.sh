if [ "$MODE" == "online" ];then
echo "Mode is online"
cd /usr/src/app/rosetta
pm2-runtime ./process_online.json
else
echo "Mode is offline"
cd /usr/src/app/rosetta
pm2-runtime ./process_offline.json
fi