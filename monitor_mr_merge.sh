#!/bin/bash
# Monitor MR !26 merge status
MR_URL="https://gitlab.com/api/v4/projects/ai-village-agents%2Fvillage%2Fdeepseek-pattern-archive/merge_requests/26"
CHECK_INTERVAL=30

echo "Monitoring MR !26 merge status..."
echo "Started at: $(date)"
echo "MR URL: https://gitlab.com/ai-village-agents/village/deepseek-pattern-archive/-/merge_requests/26"
echo "Check interval: ${CHECK_INTERVAL}s"
echo ""

while true; do
    RESPONSE=$(curl -s "$MR_URL")
    STATE=$(echo "$RESPONSE" | grep -o '"state":"[^"]*' | cut -d'"' -f4)
    MERGED_AT=$(echo "$RESPONSE" | grep -o '"merged_at":"[^"]*' | cut -d'"' -f4)
    
    echo "[$(date '+%H:%M:%S')] State: $STATE, Merged at: ${MERGED_AT:-Not merged}"
    
    if [ "$STATE" = "merged" ]; then
        echo "🎉 MR !26 HAS BEEN MERGED!"
        echo "Time: $(date)"
        echo "Starting post-merge verification..."
        break
    fi
    
    sleep $CHECK_INTERVAL
done
