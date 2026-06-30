#!/usr/bin/env python3
"""
Pattern Evolution Analysis Tool
Analyzes how patterns have evolved over time and provides actionable insights
"""

import json
import glob
import re
from collections import defaultdict, Counter
from datetime import datetime

def normalize_category(category):
    """Normalize category names for consistent analysis"""
    category_lower = str(category).lower()
    
    if 'coordination' in category_lower:
        if 'success' in category_lower:
            return 'Coordination Successes'
        return 'Coordination Patterns'
    elif 'research' in category_lower or 'workflow' in category_lower:
        return 'Research & Workflow'
    elif 'environment' in category_lower:
        return 'Environmental Patterns'
    elif 'process' in category_lower:
        if 'failure' in category_lower:
            return 'Process Failures'
        return 'Process Successes'
    elif 'governance' in category_lower:
        return 'Governance Patterns'
    elif 'cognitive' in category_lower:
        return 'Cognitive Patterns'
    elif 'deployment' in category_lower:
        return 'Deployment Patterns'
    elif 'ui' in category_lower or 'input' in category_lower:
        return 'UI/Input Patterns'
    else:
        return 'Other Patterns'

def load_and_normalize_patterns():
    """Load patterns and normalize their categories"""
    pattern_files = glob.glob('patterns/*.json')
    patterns = []
    
    for file in pattern_files:
        try:
            with open(file, 'r') as f:
                data = json.load(f)
                
                # Extract date
                filename = file.split('/')[-1]
                date_match = re.search(r'(\d{4}-\d{2})', filename)
                date = date_match.group(1) if date_match else "2026-06"  # Default to current month
                
                # Extract month for timeline
                year_month = date
                month_name = datetime.strptime(year_month + "-01", "%Y-%m-%d").strftime("%b %Y")
                
                # Get and normalize category
                raw_category = data.get('type', 'Unknown')
                normalized_category = normalize_category(raw_category)
                
                patterns.append({
                    'name': data.get('pattern_name', 'Unknown'),
                    'raw_category': raw_category,
                    'category': normalized_category,
                    'agent': data.get('agent', 'Unknown'),
                    'summary': data.get('summary', ''),
                    'date': date,
                    'month_name': month_name,
                    'source': data.get('source', ''),
                    'filename': filename.replace('.json', '')
                })
        except Exception as e:
            print(f"Error loading {file}: {e}")
    
    return patterns

def analyze_evolution_timeline(patterns):
    """Analyze pattern creation over time"""
    monthly_counts = defaultdict(list)
    
    for p in patterns:
        monthly_counts[p['date']].append(p)
    
    print("\n" + "="*70)
    print("PATTERN EVOLUTION TIMELINE")
    print("="*70)
    
    for date in sorted(monthly_counts.keys()):
        month_patterns = monthly_counts[date]
        month_display = datetime.strptime(date + "-01", "%Y-%m-%d").strftime("%b %Y")
        print(f"\n📅 {month_display} ({len(month_patterns)} patterns):")
        
        # Show pattern categories for this month
        categories = Counter([p['category'] for p in month_patterns])
        for cat, count in sorted(categories.items()):
            print(f"   {cat}: {count} pattern(s)")
            
        # Show sample patterns
        for p in month_patterns[:2]:  # Show first 2
            print(f"   • {p['name']}")

def analyze_category_evolution(patterns):
    """Analyze how categories have evolved over time"""
    category_by_month = defaultdict(lambda: defaultdict(int))
    
    for p in patterns:
        category_by_month[p['date']][p['category']] += 1
    
    print("\n" + "="*70)
    print("CATEGORY EVOLUTION OVER TIME")
    print("="*70)
    
    # Get all unique categories
    all_categories = set([p['category'] for p in patterns])
    
    # Print header
    print("Month        ", end="")
    for cat in sorted(all_categories):
        print(f" {cat[:12]:12}", end="")
    print()
    print("-" * (13 + len(all_categories) * 13))
    
    # Print monthly data
    for date in sorted(category_by_month.keys()):
        month_display = datetime.strptime(date + "-01", "%Y-%m-%d").strftime("%b %Y")
        print(f"{month_display:12}", end="")
        for cat in sorted(all_categories):
            count = category_by_month[date].get(cat, 0)
            if count > 0:
                print(f" {count:12}", end="")
            else:
                print(f" {'-':12}", end="")
        print()

def analyze_agent_specializations(patterns):
    """Analyze which agents specialize in which categories"""
    agent_categories = defaultdict(lambda: defaultdict(int))
    
    for p in patterns:
        agent_categories[p['agent']][p['category']] += 1
    
    print("\n" + "="*70)
    print("AGENT SPECIALIZATIONS BY CATEGORY")
    print("="*70)
    
    for agent in sorted(agent_categories.keys(), key=lambda a: sum(agent_categories[a].values()), reverse=True):
        total_patterns = sum(agent_categories[agent].values())
        if total_patterns >= 2:  # Only show agents with 2+ patterns
            print(f"\n{agent}: {total_patterns} total patterns")
            for category, count in sorted(agent_categories[agent].items(), key=lambda x: x[1], reverse=True):
                percentage = (count / total_patterns) * 100
                print(f"  {category}: {count} ({percentage:.0f}%)")

def provide_actionable_insights(patterns):
    """Provide actionable insights based on pattern analysis"""
    print("\n" + "="*70)
    print("ACTIONABLE INSIGHTS & RECOMMENDATIONS")
    print("="*70)
    
    total_patterns = len(patterns)
    
    # Insight 1: Growth rate
    monthly_counts = Counter([p['date'] for p in patterns])
    recent_months = sorted(monthly_counts.keys())[-3:] if len(monthly_counts) >= 3 else sorted(monthly_counts.keys())
    recent_growth = sum(monthly_counts[m] for m in recent_months)
    
    print(f"\n📈 **Growth Rate**: {recent_growth} patterns created in recent months")
    print(f"   ({recent_growth}/{total_patterns} = {recent_growth/total_patterns*100:.0f}% of all patterns)")
    
    # Insight evidence: Most productive month
    most_productive_month = max(monthly_counts.items(), key=lambda x: x[1])
    month_display = datetime.strptime(most_productive_month[0] + "-01", "%Y-%m-%d").strftime("%B %Y")
    print(f"   Most productive month: {month_display} ({most_productive_month[1]} patterns)")
    
    # Insight 2: Category gaps
    categories = Counter([p['category'] for p in patterns])
    all_possible_categories = [
        'Coordination Patterns', 'Research & Workflow', 'Process Successes',
        'Process Failures', 'Cognitive Patterns', 'Environmental Patterns',
        'Governance Patterns', 'UI/Input Patterns'
    ]
    
    missing_categories = [cat for cat in all_possible_categories if cat not in categories]
    if missing_categories:
        print(f"\n🎯 **Opportunity Areas**: Missing patterns in these categories:")
        for cat in missing_categories[:3]:  # Show top 3
            print(f"   • {cat}")
    
    # Insight 3: Recent trends
    recent_patterns = [p for p in patterns if p['date'] in ['2026-06', '2026-05']]
    if recent_patterns:
        recent_categories = Counter([p['category'] for p in recent_patterns])
        trending_category = max(recent_categories.items(), key=lambda x: x[1])[0]
        print(f"\n📊 **Current Trend**: {trending_category} patterns are trending")
        print(f"   ({recent_categories[trending_category]} of {len(recent_patterns)} recent patterns)")
    
    # Insight 4: Application opportunities
    print(f"\n💡 **Application Opportunities**:")
    application_suggestions = {
        'Coordination Patterns': 'Multi-agent collaboration tasks',
        'Research & Workflow': 'Long-term projects requiring systematic documentation',
        'Process Successes': 'Infrastructure improvements and quality enforcement',
        'Cognitive Patterns': 'Complex problem-solving requiring structured thinking'
    }
    
    for category, suggestion in application_suggestions.items():
        if category in categories:
            print(f"   • {category}: {suggestion}")

def main():
    print("\n" + "="*70)
    print("PATTERN EVOLUTION ANALYSIS")
    print("="*70)
    print("Analyzing 21 documented patterns from AI Village\n")
    
    # Load and normalize patterns
    patterns = load_and_normalize_patterns()
    print(f"📊 Loaded {len(patterns)} patterns")
    print(f"📁 Normalized into {len(set([p['category'] for p in patterns]))} categories")
    
    # Run analyses
    analyze_evolution_timeline(patterns)
    analyze_category_evolution(patterns)
    analyze_agent_specializations(patterns)
    provide_actionable_insights(patterns)
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"• Total patterns: {len(patterns)}")
    print(f"• Time span: {min([p['date'] for p in patterns])} to {max([p['date'] for p in patterns])}")
    print(f"• Most active category: {max(Counter([p['category'] for p in patterns]).items(), key=lambda x: x[1])[0]}")
    print(f"• Most active agent: {max(Counter([p['agent'] for p in patterns]).items(), key=lambda x: x[1])[0]}")
    print(f"• Evolution status: Framework mature with infrastructure automation")

if __name__ == "__main__":
    main()
