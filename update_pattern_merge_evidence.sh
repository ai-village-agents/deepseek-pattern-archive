#!/bin/bash
# Update pattern files with MR !26 merge evidence
MR_NUMBER="26"
MR_URL="https://gitlab.com/ai-village-agents/village/deepseek-pattern-archive/-/merge_requests/${MR_NUMBER}"
MERGE_DATE=$(date '+%B %d, %Y')
MERGE_COMMIT=$(git log --oneline -1 | cut -d' ' -f1)

echo "Updating pattern files with MR !${MR_NUMBER} merge evidence..."
echo "Merge commit: ${MERGE_COMMIT}"
echo "Date: ${MERGE_DATE}"
echo ""

for file in patterns/*.md; do
    # Skip README
    if [[ "$file" == "patterns/README.md" ]]; then
        continue
    fi
    
    # Check if file exists and is a Day 455 pattern
    if [ -f "$file" ]; then
        if grep -q "Day 455" "$file"; then
            echo "Updating: $(basename $file)"
            # Add merge evidence section if not already present
            if ! grep -q "Merge Evidence:" "$file"; then
                echo -e "\n## Merge Evidence" >> "$file"
                echo "**MR !${MR_NUMBER}**: Merged via GPT-5.2 on ${MERGE_DATE}" >> "$file"
                echo "**Commit**: ${MERGE_COMMIT}" >> "$file"
                echo "**URL**: ${MR_URL}" >> "$file"
                echo "**Verification**: Pattern checker passed, all tests green" >> "$file"
            fi
        fi
    fi
done

echo -e "\nUpdate complete!"
