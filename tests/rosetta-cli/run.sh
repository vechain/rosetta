#!/usr/bin/env bash
# Validates Rosetta with rosetta-cli.
#
# Usage: tests/rosetta-cli/run.sh <solo|test|main>
#
#   solo  Rosetta with an embedded thor solo node on a fresh chain:
#         check:construction builds, signs and broadcasts VET and VTHO
#         transfers, then check:data syncs the chain from genesis and
#         reconciles every balance it sees.
#   test  check:data only, against testnet / mainnet. Rosetta runs on its own
#   main  and connects to an already synced node (NODE_URL); the last BLOCKS
#         blocks are synced and reconciled.
#
# Environment:
#   SKIP_BUILD=1  do not (re)build the Rosetta and rosetta-cli images
#   REUSE_ENV=1   use a Rosetta that is already running on :8080 and leave it running
#   NODE_URL      thor node for test/main (default: the public VeChain node)
#   BLOCKS        number of recent blocks to check on test/main
#                 (default: 500 on testnet, which has few transactions; 50 on mainnet)
set -euo pipefail

cd "$(dirname "$0")/../.."

TARGET=${1:-}
case "$TARGET" in
    solo)
        NETWORK=custom
        ;;
    test)
        NETWORK=test
        NODE_URL=${NODE_URL:-https://testnet.vechain.org}
        BLOCKS=${BLOCKS:-500}
        BASE_CONFIG=rosetta-cli-conf/testnet/rosetta_cli_config.json
        ;;
    main)
        NETWORK=main
        NODE_URL=${NODE_URL:-https://mainnet.vechain.org}
        BLOCKS=${BLOCKS:-50}
        BASE_CONFIG=rosetta-cli-conf/mainnet/rosetta_cli_config.json
        ;;
    *)
        echo "usage: $0 <solo|test|main>" >&2
        exit 2
        ;;
esac
export NETWORK MODE=online

CLI_IMAGE=rosetta-cli
ROSETTA_URL=http://localhost:8080
ROSETTA_CONTAINER=rosetta-cli-$TARGET
RESULTS_DIR=cli-data/$TARGET

cleanup() {
    local status=$?
    if [ "${REUSE_ENV:-0}" != "1" ]; then
        if [ "$TARGET" = "solo" ]; then
            [ "$status" -ne 0 ] && docker compose logs --tail=200 || true
            docker compose down -v || true
        else
            [ "$status" -ne 0 ] && docker logs --tail=200 "$ROSETTA_CONTAINER" || true
            docker rm -f "$ROSETTA_CONTAINER" > /dev/null 2>&1 || true
        fi
    fi
    exit "$status"
}
trap cleanup EXIT

run_cli() {
    docker run --rm --network host --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work "$CLI_IMAGE" "$@"
}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
    echo "==> Building images"
    docker compose build
    docker build -t "$CLI_IMAGE" rosetta-cli-conf
fi

if [ "${REUSE_ENV:-0}" != "1" ]; then
    if [ "$TARGET" = "solo" ]; then
        echo "==> Starting Rosetta with thor solo"
        docker compose down -v
        rm -rf rosetta_data && mkdir -p rosetta_data && chmod 777 rosetta_data
        docker compose up -d
    else
        # Run only the Rosetta server from the image, against the external node.
        echo "==> Starting Rosetta for $NETWORK against $NODE_URL"
        docker rm -f "$ROSETTA_CONTAINER" > /dev/null 2>&1 || true
        docker run -d --name "$ROSETTA_CONTAINER" --network host \
            -e MODE=online -e NETWORK="$NETWORK" -e NODEURL="$NODE_URL" \
            --entrypoint node "$(docker compose config --images | head -1)" /usr/src/app/rosetta/dist/index.js > /dev/null
    fi
fi

echo "==> Waiting for Rosetta"
ready=0
for _ in $(seq 1 120); do
    if curl -sf -X POST "$ROSETTA_URL/network/status" -H 'Content-Type: application/json' \
        -d "{\"network_identifier\":{\"blockchain\":\"vechainthor\",\"network\":\"$NETWORK\"}}" > /dev/null; then
        ready=1
        break
    fi
    sleep 2
done
if [ "$ready" != "1" ]; then
    echo "Rosetta did not become ready" >&2
    exit 1
fi

rm -rf "$RESULTS_DIR"
mkdir -p "$RESULTS_DIR"

if [ "$TARGET" = "solo" ]; then
    CLI_CONFIG=rosetta-cli-conf/solo/rosetta_cli_config.json
    # Construction first, so that check:data has transactions to reconcile.
    echo "==> rosetta-cli check:construction"
    run_cli check:construction --configuration-file "$CLI_CONFIG"
    echo "==> rosetta-cli check:data"
    run_cli check:data --configuration-file "$CLI_CONFIG"
else
    # Sync a window of recent blocks instead of the whole chain. Starting near
    # the tip also keeps historical balance lookups within the state a pruned
    # node still has.
    BEST=$(curl -sf "$NODE_URL/blocks/best" | node -pe 'JSON.parse(require("fs").readFileSync(0)).number')
    START=$((BEST - BLOCKS))
    CLI_CONFIG=$RESULTS_DIR/rosetta_cli_config.json
    node -e '
        const fs = require("fs");
        const [base, out, dir, start, end] = process.argv.slice(1);
        const config = JSON.parse(fs.readFileSync(base, "utf8"));
        delete config.construction;
        config.online_url = "http://localhost:8080";
        config.data_directory = dir + "/data";
        // Bootstrap balances only apply when syncing from genesis.
        delete config.data.bootstrap_balances;
        config.data.start_index = Number(start);
        config.data.end_conditions = { index: Number(end) };
        config.data.results_output_file = dir + "/data_results.json";
        fs.writeFileSync(out, JSON.stringify(config, null, 4) + "\n");
    ' "$BASE_CONFIG" "$CLI_CONFIG" "$RESULTS_DIR" "$START" "$BEST"
    echo "==> rosetta-cli check:data, blocks $START-$BEST of $NETWORK"
    run_cli check:data --configuration-file "$CLI_CONFIG"
fi

# A window without balance changes passes without reconciling anything.
node -e '
    const stats = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).stats;
    const reconciled = stats.active_reconciliations + stats.inactive_reconciliations;
    console.log(`==> ${stats.blocks} blocks, ${stats.transactions} transactions, ${stats.accounts} accounts, ${reconciled} reconciliations`);
    if (reconciled === 0) {
        console.error("WARNING: no balance was reconciled; increase BLOCKS to cover blocks with transfers.");
    }
' "$RESULTS_DIR/data_results.json"

echo "==> rosetta-cli checks passed for $TARGET (results in $RESULTS_DIR/)"
