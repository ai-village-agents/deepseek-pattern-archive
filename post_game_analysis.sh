#!/bin/bash
# Post-Game Analysis Tool
# Use this AFTER completing a game session to analyze patterns and improvements

echo "🎮 POST-GAME ANALYSIS TOOL"
echo "=========================="
echo ""
echo "This tool helps analyze completed game sessions to identify"
echo "pattern applications and improvement opportunities."
echo ""
echo "Usage: ./post_game_analysis.sh <game> <session_summary_file>"
echo ""
echo "Available game types: adventure, roguelike, puzzle, simulation, strategy, hack"
echo ""

if [ $# -lt 2 ]; then
  echo "ERROR: Please provide game type and session summary"
  echo "Example: ./post_game_analysis.sh adventure session_summary.txt"
  exit 1
fi

GAME_TYPE=$1
SESSION_FILE=$2

echo "Analyzing $GAME_TYPE session from $SESSION_FILE..."
echo ""

# Game-specific pattern recommendations
case $GAME_TYPE in
  "adventure")
    echo "🧭 ADVENTURE GAME PATTERNS:"
    echo "1. Systematic Exploration - Map connections methodically"
    echo "2. Navigation System - Water/directional navigation systems"
    echo "3. Multi-Agent Delegation - NPC interaction patterns"
    echo "4. Combat Patience - Turn-based combat optimization"
    echo ""
    ;;
  "roguelike")
    echo "⚔️ ROGUELIKE PATTERNS:"
    echo "1. Task Reassignment - Quick restart protocols"
    echo "2. Emergency Protocol - Low HP/crisis management"
    echo "3. Corridor Combat Management - HP-band combat strategies"
    echo "4. Systematic Exploration - Level mapping and discovery"
    echo ""
    ;;
  "hack")
    echo "👾 HACK PATTERNS:"
    echo "1. Task Reassignment - Survival loop optimization"
    echo "2. Systematic Verification - Movement validation patterns"
    echo "3. Emergency Protocol - Critical situation management"
    echo "4. Infrastructure Ratcheting - Progressive tool/equipment building"
    echo ""
    ;;
  "puzzle")
    echo "🧩 PUZZLE PATTERNS:"
    echo "1. Systematic Exploration - Pattern discovery methods"
    echo "2. Rapid Iterative Feedback Loops - Quick testing cycles"
    echo "3. Multi-Agent Delegation - Solution collaboration approaches"
    echo "4. Pattern Discovery - Recognizing recurring solution patterns"
    echo ""
    ;;
  "strategy")
    echo "♟️ STRATEGY PATTERNS:"
    echo "1. Systematic Exploration - Opening/midgame/endgame analysis"
    echo "2. Combat Patience - Positional advantage building"
    echo "3. Multi-Agent Delegation - Piece coordination strategies"
    echo "4. Pattern Discovery - Recognizing tactical/strategic patterns"
    echo ""
    ;;
  "simulation")
    echo "🏗️ SIMULATION PATTERNS:"
    echo "1. Systematic Documentation - Process recording"
    echo "2. Infrastructure Ratcheting - System building progression"
    echo "3. Rapid Iterative Feedback Loops - Quick iteration cycles"
    echo "4. Multi-Agent Delegation - Resource/role allocation"
    echo ""
    ;;
  *)
    echo "❓ GENERAL PATTERNS (all game types):"
    echo "1. Systematic Exploration - Methodical approach to discovery"
    echo "2. Task Reassignment - Efficient restart/recovery methods"
    echo "3. Combat Patience - Optimal timing in conflict situations"
    echo "4. Pattern Discovery - Recognizing and leveraging patterns"
    echo ""
    ;;
esac

echo "📊 ANALYSIS QUESTIONS:"
echo "======================"
echo ""
echo "1. What was the most time-consuming part of your session?"
echo "2. Were there any moments where you felt stuck or unsure?"
echo "3. Did you have to restart or recover from a setback?"
echo "4. What strategy worked particularly well?"
echo "5. What would you do differently next time?"
echo ""
echo "💡 PATTERN APPLICATION SUGGESTIONS:"
echo "==================================="
echo ""
echo "Based on common $GAME_TYPE challenges:"

# Generate pattern suggestions based on common issues
if [ -f "$SESSION_FILE" ]; then
  echo "Session file detected. Analyzing for common patterns..."
  # Simple keyword analysis
  if grep -qi "stuck\|lost\|confused" "$SESSION_FILE"; then
    echo "→ Consider: Systematic Exploration pattern"
  fi
  if grep -qi "restart\|recover\|reset" "$SESSION_FILE"; then
    echo "→ Consider: Task Reassignment pattern"
  fi
  if grep -qi "combat\|fight\|attack\|hp\|health" "$SESSION_FILE"; then
    echo "→ Consider: Combat Patience or Emergency Protocol patterns"
  fi
  if grep -qi "npc\|character\|dialog\|talk" "$SESSION_FILE"; then
    echo "→ Consider: Multi-Agent Delegation pattern"
  fi
else
  echo "No session file provided. General suggestions:"
  echo "→ Review the 22 patterns at: https://gitlab.com/ai-village-agents/village/deepseek-pattern-archive"
  echo "→ Use find_patterns.sh to discover relevant patterns"
  echo "→ Consider documenting your successful strategies as new patterns"
fi

echo ""
echo "📈 NEXT STEPS:"
echo "=============="
echo ""
echo "1. Review suggested patterns above"
echo "2. Consider applying 1-2 patterns in your next session"
echo "3. Document what worked/didn't work"
echo "4. Share success stories with #patternsuccess tag"
echo ""
echo "🔗 RESOURCES:"
echo "============="
echo "- Full pattern library: https://gitlab.com/ai-village-agents/village/deepseek-pattern-archive"
echo "- Pattern discovery: ./find_patterns.sh <keyword>"
echo "- Quick success story template: quick-success-story-template.md"
echo ""
echo "🎯 Remember: Patterns are tools, not rules. Use what works for you!"
