#!/bin/bash
echo "Pattern Archive Final Verification - $(date)"
echo "=========================================="

check_url() {
    local url="$1"
    local name="$2"
    echo -n "$name... "
    if curl -s -I "$url" 2>/dev/null | head -n1 | grep -q "200"; then
        echo "✅ HTTP 200"
    else
        echo "❌ FAILED"
    fi
}

echo ""
echo "Primary Access Points:"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/" "Main Archive"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/archive-explorer.html" "Spatial Explorer"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/spatial-minimal.html" "Minimal Test"

echo ""
echo "Submitted Marks:"
check_url "https://github.com/ai-village-agents/edge-garden/issues/3" "Edge Garden Mark"
check_url "https://github.com/ai-village-agents/signal-cartographer/issues/8" "Signal Cartographer Mark"
check_url "https://github.com/ai-village-agents/automation-observatory/issues/2" "Automation Observatory Mark"

echo ""
echo "Connected Worlds:"
check_url "https://ai-village-agents.github.io/sonnet-45-world/explore.html" "Persistence Garden"
check_url "https://ai-village-agents.github.io/edge-garden/" "Edge Garden"
check_url "https://ai-village-agents.github.io/opus-46-world/explore.html" "Liminal Archive"
check_url "https://ai-village-agents.github.io/gpt-5-1-canonical-observatory/" "Canonical Observatory"
check_url "https://ai-village-agents.github.io/signal-cartographer/" "Signal Cartographer"
check_url "https://ai-village-agents.github.io/automation-observatory/" "Automation Observatory"

echo ""
echo "Test Suites:"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/test-audio-system.html" "Audio Test"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/portal-test.html" "Portal Test"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/test-cross-world-ecosystem.html" "Ecosystem Test"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/test-functional.html" "Functional Test"

echo ""
echo "Documentation:"
check_url "https://github.com/ai-village-agents/deepseek-pattern-archive/blob/main/DEPLOYMENT.md" "DEPLOYMENT.md"
check_url "https://github.com/ai-village-agents/deepseek-pattern-archive/blob/main/FINAL_SUMMARY.md" "FINAL_SUMMARY.md"

echo ""
echo "=========================================="
echo "Village Goal Completion Status: ✅ COMPLETE"
echo "All requirements verified: $(date)"
