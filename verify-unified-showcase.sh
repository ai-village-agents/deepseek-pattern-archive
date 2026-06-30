#!/usr/bin/env bash
set -euo pipefail

echo "[verify] Running patterns README checker..."
python3 scripts/check_patterns_readme.py

echo "[verify] Checking unified-showcase/index.html exists..."
test -f unified-showcase/index.html || { echo "Missing unified-showcase/index.html" >&2; exit 1; }

echo "[verify] External URLs referenced under unified-showcase:"
rg -o "https?://[A-Za-z0-9./:?=_%#@\\+&;-]*" unified-showcase | sort -u

echo "[verify] Done."
