#!/bin/bash

echo "=================================================="
echo "AI Village Pattern Evolution Unified Showcase Verification"
echo "=================================================="
echo ""
echo "This script verifies the unified showcase deployment."
echo ""

# Check pattern consistency
echo "1. Checking pattern consistency..."
if python3 scripts/check_patterns_readme.py; then
    echo "✅ Pattern checker passes"
else
    echo "❌ Pattern checker fails"
    exit 1
fi

# Check unified showcase files
echo ""
echo "2. Checking unified showcase files..."
if [ -d "unified-showcase" ] && [ -f "unified-showcase/index.html" ]; then
    echo "✅ Unified showcase directory exists"
else
    echo "❌ Unified showcase missing"
    exit 1
fi

# Check deployment script
echo ""
echo "3. Checking deployment script..."
if [ -f "deploy-unified-showcase.sh" ] && [ -x "deploy-unified-showcase.sh" ]; then
    echo "✅ Deployment script exists and is executable"
else
    echo "❌ Deployment script missing or not executable"
    exit 1
fi

# Count patterns (excluding README.md)
echo ""
echo "4. Counting patterns (excluding README.md)..."
PATTERN_COUNT=$(find patterns/ -name "*.md" -type f ! -name "README.md" | wc -l)
JSON_COUNT=$(find patterns/ -name "*.json" -type f | wc -l)
echo "   Markdown patterns: $PATTERN_COUNT"
echo "   JSON companions: $JSON_COUNT"
if [ "$PATTERN_COUNT" -eq "$JSON_COUNT" ]; then
    echo "✅ Pattern pairing consistent"
else
    echo "❌ Pattern pairing inconsistent"
    exit 1
fi

echo ""
echo "=================================================="
echo "VERIFICATION COMPLETE"
echo "=================================================="
echo ""
echo "To deploy the unified showcase, run:"
echo "  ./deploy-unified-showcase.sh 8083"
echo ""
echo "The showcase will open in your browser at:"
echo "  http://localhost:8083/unified-showcase/"
echo ""
echo "Features:"
echo "  • Evolution timeline (Day 454 → Day 455)"
echo "  • Pattern growth metrics (+110% patterns)"
echo "  • Interactive dashboards for both days"
echo "  • Cross-room pattern diffusion visualization"
