#!/usr/bin/env python3
"""
Pattern Evolution Visualization Script

Creates simple ASCII visualizations of pattern growth and category distribution.
Run with: python3 scripts/visualize_pattern_evolution.py
"""

import json
import os
from datetime import datetime
import sys

def load_patterns():
    """Load all pattern metadata from JSON files."""
    patterns = []
    pattern_dir = "patterns"
    
    for filename in os.listdir(pattern_dir):
        if filename.endswith(".json") and filename != "README.json":
            filepath = os.path.join(pattern_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    patterns.append(data)
            except (json.JSONDecodeError, FileNotFoundError):
                print(f"Warning: Could not load {filename}")
    
    return patterns

def analyze_patterns(patterns):
    """Analyze patterns by day and category."""
    analysis = {
        "total": len(patterns),
        "by_day": {},
        "by_category": {},
        "by_agent": {},
        "by_type": {}
    }
    
    for pattern in patterns:
        # Extract day from type (e.g., "pattern-day455" -> "day455")
        pattern_type = pattern.get("type", "")
        if "day" in pattern_type.lower():
            day = pattern_type.lower().split("day")[-1]
            analysis["by_day"][day] = analysis["by_day"].get(day, 0) + 1
        
        # Count by category
        category = pattern.get("section", "Unknown")
        analysis["by_category"][category] = analysis["by_category"].get(category, 0) + 1
        
        # Count by agent
        agent = pattern.get("agent", "Unknown")
        analysis["by_agent"][agent] = analysis["by_agent"].get(agent, 0) + 1
        
        # Count by type
        analysis["by_type"][pattern_type] = analysis["by_type"].get(pattern_type, 0) + 1
    
    return analysis

def create_ascii_bar_chart(data, title, max_width=50):
    """Create ASCII bar chart."""
    if not data:
        return f"{title}\nNo data available\n"
    
    output = [f"\n{title}"]
    output.append("=" * len(title))
    
    max_value = max(data.values())
    
    for key, value in sorted(data.items()):
        bar_width = int((value / max_value) * max_width) if max_value > 0 else 0
        bar = "█" * bar_width
        output.append(f"{key:10} {bar} {value}")
    
    return "\n".join(output)

def create_evolution_timeline(by_day):
    """Create evolution timeline visualization."""
    if not by_day:
        return "\nNo day-based patterns found\n"
    
    output = ["\nPattern Evolution Timeline"]
    output.append("=" * 25)
    
    # Sort days numerically
    sorted_days = sorted(by_day.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0)
    
    for day, count in sorted_days:
        output.append(f"Day {day:3}: {'●' * min(count, 20)} ({count} patterns)")
    
    # Calculate growth if we have multiple days
    if len(sorted_days) >= 2:
        first_day = sorted_days[0][1]
        last_day = sorted_days[-1][1]
        if first_day > 0:
            growth_pct = ((last_day - first_day) / first_day) * 100
            output.append(f"\nGrowth: {first_day} → {last_day} patterns ({growth_pct:+.1f}%)")
    
    return "\n".join(output)

def main():
    print("AI Village Pattern Evolution Visualization")
    print("=" * 50)
    
    # Load patterns
    patterns = load_patterns()
    
    if not patterns:
        print("No patterns found. Make sure you're in the pattern-archive directory.")
        return
    
    # Analyze patterns
    analysis = analyze_patterns(patterns)
    
    # Display summary
    print(f"\n📊 Summary: {analysis['total']} total patterns")
    
    # Create visualizations
    print(create_ascii_bar_chart(analysis["by_category"], "Patterns by Category"))
    print(create_ascii_bar_chart(analysis["by_agent"], "Patterns by Agent", max_width=30))
    print(create_evolution_timeline(analysis["by_day"]))
    
    # Display type distribution
    if analysis["by_type"]:
        print("\n📈 Pattern Types:")
        for pattern_type, count in sorted(analysis["by_type"].items()):
            print(f"  {pattern_type:20}: {count}")
    
    # Display insights
    print("\n💡 Insights:")
    
    # Most common category
    if analysis["by_category"]:
        most_common = max(analysis["by_category"].items(), key=lambda x: x[1])
        print(f"  • Most common category: {most_common[0]} ({most_common[1]} patterns)")
    
    # Most productive agent
    if analysis["by_agent"]:
        most_agent = max(analysis["by_agent"].items(), key=lambda x: x[1])
        print(f"  • Most patterns documented by: {most_agent[0]} ({most_agent[1]})")
    
    # Evolution insight
    days_with_patterns = len(analysis["by_day"])
    if days_with_patterns >= 2:
        print(f"  • Patterns documented across {days_with_patterns} different days")
    
    print("\n" + "=" * 50)
    print("Run with --json for machine-readable output")
    print("Example: python3 scripts/visualize_pattern_evolution.py --json")

if __name__ == "__main__":
    if "--json" in sys.argv:
        patterns = load_patterns()
        analysis = analyze_patterns(patterns)
        print(json.dumps(analysis, indent=2))
    else:
        main()
