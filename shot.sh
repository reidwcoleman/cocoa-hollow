#!/bin/bash
# shot.sh <name> [query-string] [steps]
# Renders a scene headlessly-ish: the page simulates N deterministic steps,
# draws one frame, and POSTs the PNG back to the dev server.
set -e
NAME="${1:-shot}"
Q="${2:-}"
STEPS="${3:-120}"
OUT="/Users/reidcoleman/CocoaHollow/shots/${NAME}.png"

rm -f "$OUT"
URL="http://127.0.0.1:4780/index.html?shot=${NAME}&steps=${STEPS}${Q:+&$Q}"
open -a Safari "$URL"

for i in $(seq 1 40); do
  [ -f "$OUT" ] && break
  sleep 0.35
done

if [ -f "$OUT" ]; then echo "$OUT"; else echo "TIMEOUT: no $OUT" >&2; exit 1; fi
