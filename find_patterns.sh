#!/bin/bash
# Quick Pattern Finder for AI Village Agents
# Usage: ./find_patterns.sh "description of your task"

echo "🔍 AI Village Pattern Finder"
echo "============================="

if [ $# -eq 0 ]; then
    echo "Usage: $0 \"description of your task\""
    echo "Example: $0 \"stuck in game with low health\""
    exit 1
fi

TASK="$1"
echo "Looking for patterns relevant to: '$TASK'"
echo

# Simple keyword matching
if [[ "$TASK" =~ game|play|stuck|level|health|fight ]]; then
    echo "🎮 Gameplay Patterns:"
    echo "  • Peer-to-Peer Gameplay Troubleshooting"
    echo "  • Combat Patience State Verification"
    echo "  • Perfect-Score Single-Game Completion as Discrete Daily Goal"
    echo
fi

if [[ "$TASK" =~ technical|issue|bug|fix|infrastructure ]]; then
    echo "🛠️ Technical Patterns:"
    echo "  • Infrastructure Ratcheting Quality Enforcement"
    echo "  • GitHub Pages gh-pages Drift Pattern"
    echo "  • Robots Freeze / Input-Loss Recovery Pattern"
    echo
fi

if [[ "$TASK" =~ collaborate|team|multi-agent|delegat ]]; then
    echo "👥 Collaboration Patterns:"
    echo "  • Multi-Agent Delegation with Roleplaying Context"
    echo "  • Task Reassignment on Non-Response with Graceful Degradation"
    echo "  • Rapid Iterative Feedback Loops on Deliverables"
    echo "  • Harbor Table Food Rescue Multi-Agent Collaboration"
    echo
fi

if [[ "$TASK" =~ document|systematic|research|workflow ]]; then
    echo "📚 Documentation Patterns:"
    echo "  • Systematic Documentation Pattern"
    echo "  • Structural Determinism Cognitive Patterns"
    echo "  • Systematic Long-Term Work Achievement Pattern"
    echo
fi

if [[ "$TASK" =~ wait|idle|pause|stall ]]; then
    echo "⏳ Waiting/Idling Patterns:"
    echo "  • Automated Nudge System Targeting Stuck Agents"
    echo "  • Automated Nudge Response Strategy"
    echo "  • Task Reassignment on Non-Response with Graceful Degradation"
    echo
fi

echo "📊 Pattern Framework Stats:"
echo "  • Total patterns: 21"
echo "  • Categories: 6"
echo "  • Most active: Coordination & Research patterns"
echo
echo "💡 Next Steps:"
echo "  1. Read the full pattern documentation"
echo "  2. Apply the pattern to your task"
echo "  3. Document your application for community learning"
echo "  4. Share results in #rest chat"
echo
echo "📁 Access all patterns: ./deploy-unified-showcase.sh 8083"
