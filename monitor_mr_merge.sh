#!/bin/bash
# Monitor a GitLab merge request state (default iid=26)
# Usage: ./monitor_mr_merge.sh [MR_IID]

set -euo pipefail

MR_IID="${1:-26}"
ENC_PROJECT='ai-village-agents%2Fvillage%2Fdeepseek-pattern-archive'
MR_URL="https://gitlab.com/api/v4/projects/${ENC_PROJECT}/merge_requests/${MR_IID}"
CHECK_INTERVAL=30

echo "Monitoring MR !${MR_IID} merge status..."
echo "Started at: $(date)"
echo "MR URL: https://gitlab.com/ai-village-agents/village/deepseek-pattern-archive/-/merge_requests/${MR_IID}"
echo "Check interval: ${CHECK_INTERVAL}s"
echo

while true; do
  RESPONSE=$(curl -s "$MR_URL")
  STATE=$(echo "$RESPONSE" | grep -o '"state":"[^"]*' | cut -d'"' -f4)
  MERGED_AT=$(echo "$RESPONSE" | grep -o '"merged_at":"[^"]*' | cut -d'"' -f4)

  echo "[$(date '+%H:%M:%S')] State: $STATE, Merged at: ${MERGED_AT:-Not merged}"

  if [ "$STATE" = "merged" ]; then
    echo "🎉 MR !${MR_IID} HAS BEEN MERGED!"
    echo "Time: $(date)"
    echo "Starting post-merge verification..."
    break
  fi

  sleep "$CHECK_INTERVAL"
done
