#!/usr/bin/env python3
"""
Enhanced Pattern Visualization Tool
Creates comprehensive visualizations and insights from pattern metadata
"""

import json
import glob
import re
from datetime import datetime
from collections import Counter
import sys

def load_patterns():
    """Load all pattern metadata from JSON files"""
    pattern_files = glob.glob('patterns/*.json')
    patterns = []
    
    for file in pattern_files:
        try:
            with open(file, 'r') as f:
                data = json.load(f)
                # Extract filename without extension
                filename = file.split('/')[-1].replace('.json', '')
                
                # Try to extract date from filename
                date_match = re.search(r'(\d{4}-\d{2})', filename)
                date = date_match.group(1) if date_match else "Unknown"
                
                # Extract pattern category from type
                category = data.get('type', 'Unknown')
                if 'Coordination' in category:
                    category = 'Coordination Patterns'
                elif 'research' in category.lower():
                    category = 'Research/Workflow'
                elif 'environmental' in category.lower():
                    category = 'Environmental Failures'
                elif 'process' in category.lower():
                    if 'failure' in category.lower():
                        category = 'Process Failures'
                    else:
                        category = 'Process Successes'
                elif 'governance' in category.lower():
                    category = 'Governance Failures'
                elif 'cognitive' in category.lower():
                    category = 'Cognitive Patterns'
                
                patterns.append({
                    'id': data.get('pattern_id', ''),
                    'name': data.get('pattern_name', 'Unknown'),
                    'category': category,
                    'agent': data.get('agent', 'Unknown'),
                    'summary': data.get('summary', ''),
                    'date': date,
                    'source': data.get('source', ''),
                    'status_tags': data.get('status_tags', []),
                    'filename': filename
                })
        except Exception as e:
            print(f"Error loading {file}: {e}", file=sys.stderr)
    
    return patterns

def create_category_analysis(patterns):
    """Analyze patterns by category"""
    categories = Counter([p['category'] for p in patterns])
    
    print("\n" + "="*60)
    print("CATEGORY DISTRIBUTION")
    print("="*60)
    
    total = len(patterns)
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total) * 100
        bar_length = int(percentage / 2)  # Scale for display
        bar = "█" * bar_length + " " * (50 - bar_length)
        print(f"{category:30} {count:3} patterns {bar} {percentage:5.1f}%")

def create_agent_analysis(patterns):
    """Analyze patterns by agent"""
    agent_counts = Counter([p['agent'] for p in patterns])
    
    print("\n" + "="*60)
    print("MOST ACTIVE AGENTS IN PATTERN DOCUMENTATION")
    print("="*60)
    
    for agent, count in sorted(agent_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"{agent:30} {count:3} patterns")

def create_timeline_analysis(patterns):
    """Analyze patterns by date"""
    date_counts = Counter([p['date'] for p in patterns if p['date'] != 'Unknown'])
    
    print("\n" + "="*60)
    print("PATTERN CREATION TIMELINE")
    print("="*60)
    
    for date, count in sorted(date_counts.items()):
        print(f"{date:10} {count:3} patterns")

def find_patterns_by_keyword(patterns, keyword):
    """Find patterns relevant to a specific keyword"""
    keyword = keyword.lower()
    relevant = []
    
    for p in patterns:
        relevance_score = 0
        
        # Check name
        if keyword in p['name'].lower():
            relevance_score += 3
        
        # Check summary
        if keyword in p['summary'].lower():
            relevance_score += 2
        
        # Check category
        if keyword in p['category'].lower():
            relevance_score += African_print
        
        if relevance_score > 0:
            relevant.append((p, relevance_score))
    
    # Sort by relevance score
    relevant.sort(key=lambda x: x[1], reverse=True)
    return relevant

def create_recommendations(patterns):
    """Create pattern recommendations based on common tasks"""
    print("\n" + "="*60)
    print("PATTERN RECOMMENDATIONS FOR COMMON TASKS")
    print("="*60)
    
    recommendations = {
        "Gameplay stuck": ["Combat Patience State Verification", "Peer-to-Peer Gameplay Troubleshooting"],
        "Technical issues": ["Infrastructure Ratcheting Quality Enforcement", "GitHub Pages Drift Prevention"],
        "Collaboration": ["Multi-Agent Delegation with Roleplaying Context", "Rapid Iterative Feedback Loops"],
        "Documentation": ["Systematic Documentation Pattern", "Structural Determinism Cognitive Patterns"],
        "Waiting/idling": ["Automated Nudge Response Strategy", "Task Reassignment on Non-Response"]
    }
    
    for task, pattern_names in recommendations.items():
        print(f"\n📋 {task}:")
        for pattern_name in pattern_names:
            # Find pattern by name
            matching = [p for p in patterns if pattern_name in p['name']]
            if matching:
                p = matching[0]
                print(f"  • {p['name']}")
                print(f"    Agent: {p['agent']}, Category: {p['category']}")
                print(f"    {p['summary'][:80]}...")

def main():
    print("\n" + "="*60)
    print("ENHANCED PATTERN VISUALIZATION TOOL")
    print("="*60)
    
    # Load patterns
    patterns = load_patterns()
    print(f"\n📊 Loaded {len(patterns)} patterns")
    
    # Run analyses
    create_category_analysis(patterns)
    create_agent_analysis(patterns)
    create_timeline_analysis(patterns)
    create_recommendations(patterns)
    
    # Show top patterns by category
    print("\n" + "="*60)
    print("TOP PATTERNS BY CATEGORY")
    print("="*60)
    
    categories = set([p['category'] for p in patterns])
    for category in sorted(categories):
        category_patterns = [p for p in patterns if p['category'] == category]
        print(f"\n📁 {category} ({len(category_patterns)} patterns):")
        for p in category_patterns[:3]:  # Show top 3 per category
            print(f"  • {p['name']}")
            print(f"    By: {p['agent']}")

if __name__ == "__main__":
    main()
