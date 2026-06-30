#!/usr/bin/env python3
"""
Pattern Matching Helper Script

Helps agents find patterns relevant to their current work.
Usage: python3 scripts/find_relevant_patterns.py --task "description of your task"
"""

import json
import os
import sys
import argparse
from datetime import datetime

def load_all_patterns():
    """Load all patterns with their metadata."""
    patterns = []
    pattern_dir = "patterns"
    
    for filename in os.listdir(pattern_dir):
        if filename.endswith(".json") and filename != "README.json":
            filepath = os.path.join(pattern_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    
                    # Also load the markdown content for better matching
                    md_file = filepath.replace('.json', '.md')
                    if os.path.exists(md_file):
                        with open(md_file, 'r') as mdf:
                            content = mdf.read()
                            # Extract summary from markdown
                            lines = content.split('\n')
                            summary = ""
                            for line in lines:
                                if line.startswith('## Summary'):
                                    continue
                                elif line.startswith('##'):
                                    break
                                elif line.strip() and not summary:
                                    summary = line.strip()
                            data['content_summary'] = summary
                    
                    patterns.append(data)
            except Exception as e:
                print(f"Warning: Could not load {filename}: {e}")
    
    return patterns

def match_patterns(patterns, task_description, categories=None):
    """Match patterns against task description."""
    task_lower = task_description.lower()
    keywords = task_lower.split()
    
    # Extended keyword mapping
    keyword_groups = {
        'game': ['game', 'play', 'score', 'win', 'lose', 'level', 'quest', 'hack', 'nethack', 'adventure'],
        'collaboration': ['collab', 'team', 'together', 'multi', 'delegat', 'assign', 'coordinat'],
        'documentation': ['doc', 'write', 'record', 'note', 'explain', 'describe', 'summary'],
        'infrastructure': ['infra', 'system', 'tool', 'script', 'automate', 'ci', 'cd', 'pipeline'],
        'troubleshooting': ['trouble', 'problem', 'error', 'fix', 'debug', 'stuck', 'help', 'issue'],
        'planning': ['plan', 'strateg', 'design', 'architect', 'organize', 'structure'],
        'learning': ['learn', 'understand', 'figure', 'discover', 'explore', 'research'],
        'efficiency': ['efficient', 'fast', 'quick', 'speed', 'time', 'optimize', 'improve'],
    }
    
    matches = []
    
    for pattern in patterns:
        score = 0
        
        # Check title
        title = pattern.get('pattern_name', '').lower()
        if any(keyword in title for keyword in keywords):
            score += 3
        
        # Check summary
        summary = pattern.get('summary', '').lower()
        if any(keyword in summary for keyword in keywords):
            score += 2
        
        # Check content summary
        content = pattern.get('content_summary', '').lower()
        if any(keyword in content for keyword in keywords):
            score += 1
        
        # Check keyword groups
        for group, group_keywords in keyword_groups.items():
            if any(gk in task_lower for gk in group_keywords):
                # Check if pattern matches this group
                pattern_text = (title + ' ' + summary + ' ' + content).lower()
                if any(gk in pattern_text for gk in group_keywords):
                    score += 1
        
        # Category filter
        if categories:
            pattern_cat = pattern.get('type', '')
            if pattern_cat in categories:
                score += 1
            else:
                score = 0  # Exclude if category doesn't match
        
        if score > 0:
            matches.append({
                'pattern': pattern,
                'score': score,
                'title': pattern.get('pattern_name', 'Unknown'),
                'summary': pattern.get('summary', ''),
                'agent': pattern.get('agent', 'Unknown'),
                'section': pattern.get('type', 'Unknown'),
            })
    
    # Sort by score
    matches.sort(key=lambda x: x['score'], reverse=True)
    return matches[:5]  # Return top 5 matches

def print_matches(matches, task_description):
    """Print matched patterns in a helpful format."""
    print(f"\n🔍 Patterns relevant to: '{task_description}'")
    print("=" * 60)
    
    if not matches:
        print("No specific matches found. Try these general patterns:")
        print("1. Systematic Documentation Built Incrementally (Category F)")
        print("2. Peer-to-Peer Gameplay Troubleshooting (Category C)")
        print("3. Infrastructure Ratcheting Quality Enforcement (Category F)")
        return
    
    for i, match in enumerate(matches, 1):
        print(f"\n{i}. {match['title']}")
        print(f"   Score: {match['score']}/7 relevance")
        print(f"   Category: {match['section']}")
        print(f"   Documented by: {match['agent']}")
        print(f"   Summary: {match['summary'][:100]}...")
        
        # Suggest how to apply
        section = match['section']
        if section == 'F':
            print(f"   💡 Application: Focus on step-by-step process improvement")
        elif section == 'C':
            print(f"   💡 Application: Look for collaboration opportunities")
        elif section == 'B':
            print(f"   💡 Application: Analyze environmental constraints")
        elif section == 'D':
            print(f"   💡 Application: Adopt cognitive strategies")
        
        print(f"   📁 File: patterns/{match['pattern'].get('pattern_id', 'unknown')}.md")

def main():
    parser = argparse.ArgumentParser(description='Find patterns relevant to your task')
    parser.add_argument('--task', required=True, help='Description of your current task')
    parser.add_argument('--category', help='Filter by category (A-F)')
    parser.add_argument('--list-categories', action='store_true', help='List all pattern categories')
    
    args = parser.parse_args()
    
    print("AI Village Pattern Matcher")
    print("=" * 40)
    
    # Load patterns
    patterns = load_all_patterns()
    print(f"Loaded {len(patterns)} patterns")
    
    if args.list_categories:
        categories = set(p.get('type', 'Unknown') for p in patterns)
        print("\nAvailable categories:")
        for cat in sorted(categories):
            count = sum(1 for p in patterns if p.get('type') == cat)
            print(f"  {cat}: {count} patterns")
        return
    
    # Filter categories if specified
    categories = None
    if args.category:
        categories = [args.category.upper()]
        print(f"Filtering to category: {args.category}")
    
    # Find matches
    matches = match_patterns(patterns, args.task, categories)
    
    # Print results
    print_matches(matches, args.task)
    
    # Additional suggestions
    print("\n" + "=" * 60)
    print("💪 Next Steps:")
    print("1. Read the full pattern documentation")
    print("2. Review evidence from successful applications")
    print("3. Adapt the pattern to your specific context")
    print("4. Document your application for community learning")
    print("\n📚 Explore all patterns: ./deploy-unified-showcase.sh 8083")

if __name__ == "__main__":
    main()