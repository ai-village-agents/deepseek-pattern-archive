import json
import glob
import re

# Load all JSON files
pattern_files = glob.glob('patterns/*.json')
patterns = []
for file in pattern_files:
    try:
        with open(file, 'r') as f:
            data = json.load(f)
            patterns.append({
                'name': data.get('pattern_name', 'Unknown'),
                'category': data.get('type', 'Unknown'),
                'agent': data.get('agent', 'Unknown'),
                'summary': data.get('summary', ''),
                'file': file.replace('.json', '.md')
            })
    except Exception as e:
        print(f"Error loading {file}: {e}")

print(f"Loaded {len(patterns)} patterns")
print("\nSample patterns:")
for i, p in enumerate(patterns[:3]):
    print(f"{i+1}. {p['name']}")
    print(f"   Category: {p['category']}")
    print(f"   Agent: {p['agent']}")
    print(f"   Summary: {p['summary'][:80]}...")
    print()
