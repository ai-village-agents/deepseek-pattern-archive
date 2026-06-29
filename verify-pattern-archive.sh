#!/bin/bash

# Pattern archive verification helper.
#
# By default, this script:
# - fails only if *required* checks fail
# - reports optional failures clearly (without claiming everything is verified)
#
# To make *all* URL checks required, run with:
#   STRICT=1 bash verify-pattern-archive.sh

set -u

STRICT="${STRICT:-0}"

required_fail=0
optional_fail=0

check_url() {
    local url="$1"
    local name="$2"
    local required="${3:-optional}"  # required|optional

    echo -n "$name... "

    # Pull only the status line (fast) and match HTTP 200.
    if curl -s -I "$url" 2>/dev/null | head -n1 | grep -q "200"; then
        echo "✅ HTTP 200"
        return 0
    fi

    echo "❌ FAILED"

    if [ "$STRICT" = "1" ] || [ "$required" = "required" ]; then
        required_fail=$((required_fail + 1))
    else
        optional_fail=$((optional_fail + 1))
    fi

    return 1
}

echo "Pattern Archive Verification - $(date)"
echo "=========================================="

echo ""
echo "Primary Access Points (required):"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/" "Main Archive" required
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/archive-explorer.html" "Spatial Explorer" required
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/spatial-minimal.html" "Minimal Test" required

echo ""
echo "Submitted Marks (optional):"
check_url "https://github.com/ai-village-agents/edge-garden/issues/3" "Edge Garden Mark" optional
check_url "https://github.com/ai-village-agents/signal-cartographer/issues/8" "Signal Cartographer Mark" optional
check_url "https://github.com/ai-village-agents/automation-observatory/issues/2" "Automation Observatory Mark" optional

echo ""
echo "Connected Worlds (optional):"
check_url "https://ai-village-agents.github.io/sonnet-45-world/explore.html" "Persistence Garden" optional
check_url "https://ai-village-agents.github.io/edge-garden/" "Edge Garden" optional
check_url "https://ai-village-agents.github.io/opus-46-world/explore.html" "Liminal Archive" optional
check_url "https://ai-village-agents.github.io/gpt-5-1-canonical-observatory/" "Canonical Observatory" optional
check_url "https://ai-village-agents.github.io/signal-cartographer/" "Signal Cartographer" optional
check_url "https://ai-village-agents.github.io/automation-observatory/" "Automation Observatory" optional

echo ""
echo "Test Suites (optional):"
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/test-audio-system.html" "Audio Test" optional
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/portal-test.html" "Portal Test" optional
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/test-cross-world-ecosystem.html" "Ecosystem Test" optional
check_url "https://ai-village-agents.github.io/deepseek-pattern-archive/test-functional.html" "Functional Test" optional

echo ""
echo "Documentation (optional; GitLab source of truth):"
check_url "https://gitlab.com/ai-village-agents/village/deepseek-pattern-archive/-/blob/master/DEPLOYMENT.md" "DEPLOYMENT.md" optional
check_url "https://gitlab.com/ai-village-agents/village/deepseek-pattern-archive/-/blob/master/FINAL_SUMMARY.md" "FINAL_SUMMARY.md" optional

echo ""
echo "Pattern README validation (required):"
python3 scripts/check_patterns_readme.py
readme_rc=$?
if [ $readme_rc -ne 0 ]; then
    required_fail=$((required_fail + 1))
fi

echo ""
echo "=========================================="

echo "Required failures: $required_fail"
echo "Optional failures: $optional_fail"

echo ""
if [ $required_fail -eq 0 ]; then
    if [ $optional_fail -eq 0 ]; then
        echo "Overall status: ✅ PASS (all checks succeeded)"
    else
        echo "Overall status: ✅ PASS (required checks succeeded; optional checks failed)"
        echo "Tip: run STRICT=1 to make all URL checks required."
    fi
    exit 0
else
    echo "Overall status: ❌ FAIL (required checks failed)"
    echo "Tip: run STRICT=1 to fail on any URL check."
    exit 1
fi
