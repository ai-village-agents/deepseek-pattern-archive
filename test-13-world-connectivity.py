#!/usr/bin/env python3
"""
Test connectivity to all 13 agent worlds in Pattern Archive ecosystem
"""

import requests
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# World data matching SEED_WORLDS
worlds = [
    {"id": "sonnet-45", "name": "Persistence Garden", "agent": "Claude Sonnet 4.5", 
     "url": "https://ai-village-agents.github.io/sonnet-45-world", "expected": 200},
    {"id": "opus-45", "name": "Edge Garden", "agent": "Claude Opus 4.5", 
     "url": "https://ai-village-agents.github.io/edge-garden", "expected": 200},
    {"id": "opus-46", "name": "Liminal Archive", "agent": "Claude Opus 4.6", 
     "url": "https://ai-village-agents.github.io/opus-46-world", "expected": 200},
    {"id": "gpt-5.1", "name": "Canonical Observatory", "agent": "GPT-5.1", 
     "url": "https://ai-village-agents.github.io/gpt-5-1-canonical-observatory", "expected": 200},
    {"id": "gpt-5.4", "name": "Signal Cartographer", "agent": "GPT-5.4", 
     "url": "https://ai-village-agents.github.io/signal-cartographer", "expected": 200},
    {"id": "deepseek", "name": "Pattern Archive", "agent": "DeepSeek-V3.2", 
     "url": "https://ai-village-agents.github.io/deepseek-pattern-archive", "expected": 200},
    {"id": "sonnet-46-drift", "name": "The Drift", "agent": "Claude Sonnet 4.6", 
     "url": "https://claude-sonnet-46-drift.surge.sh", "expected": 200},
    {"id": "haiku-4.5-observatory", "name": "Automation Observatory", "agent": "Claude Haiku 4.5", 
     "url": "https://ai-village-agents.github.io/automation-observatory", "expected": 200},
    {"id": "gpt-5.2-constellation", "name": "Proof Constellation", "agent": "GPT-5.2", 
     "url": "https://ai-village-agents.github.io/gpt-5-2-world", "expected": 200},
    {"id": "opus-47-anchorage", "name": "The Anchorage", "agent": "Claude Opus 4.7", 
     "url": "https://ai-village-agents.github.io/the-anchorage", "expected": 200},
    {"id": "gemini-3.1-canvas", "name": "Canvas of Truth", "agent": "Gemini 3.1 Pro", 
     "url": "https://ai-village-agents.github.io/gemini-interactive-world", "expected": 200},
    {"id": "gpt-5.5-index", "name": "The Luminous Index", "agent": "GPT-5.5", 
     "url": "https://ai-village-agents.github.io/gpt-5-5-luminous-index", "expected": 200},
    {"id": "kimi-k2.6-strata", "name": "STRATA", "agent": "Kimi K2.6", 
     "url": "https://ai-village-agents.github.io/k2-6-world", "expected": 200}
]

def test_world_connectivity(world):
    """Test connectivity to a single world"""
    result = {
        "id": world["id"],
        "name": world["name"],
        "agent": world["agent"],
        "url": world["url"],
        "expected": world["expected"],
        "status": "unknown",
        "http_code": 0,
        "response_time": 0,
        "error": None
    }
    
    start_time = time.time()
    
    try:
        # Try HEAD request first (lighter)
        response = requests.head(
            world["url"],
            timeout=10,
            allow_redirects=True,
            headers={"User-Agent": "PatternArchive/1.0 Connectivity Test"}
        )
        
        result["http_code"] = response.status_code
        result["response_time"] = round((time.time() - start_time) * 1000, 2)  # ms
        
        if response.status_code < 400:
            result["status"] = "online"
        else:
            result["status"] = "error"
            result["error"] = f"HTTP {response.status_code}"
            
    except requests.exceptions.Timeout:
        result["status"] = "timeout"
        result["error"] = "Request timeout (10s)"
        result["response_time"] = 10000  # 10 seconds timeout
        
    except requests.exceptions.ConnectionError as e:
        result["status"] = "connection_error"
        result["error"] = str(e)
        
    except requests.exceptions.RequestException as e:
        result["status"] = "request_error"
        result["error"] = str(e)
        
    except Exception as e:
        result["status"] = "unknown_error"
        result["error"] = str(e)
        
    return result

def main():
    print("=" * 80)
    print("Pattern Archive - 13 World Connectivity Test")
    print("=" * 80)
    print(f"Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total worlds to test: {len(worlds)}")
    print()
    
    # Test all worlds concurrently
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_world = {executor.submit(test_world_connectivity, world): world for world in worlds}
        
        for future in as_completed(future_to_world):
            world = future_to_world[future]
            try:
                result = future.result()
                results.append(result)
                
                # Display individual result
                status_symbol = "✅" if result["status"] == "online" else "❌"
                print(f"{status_symbol} {result['name']:30} ({result['agent']:20})")
                print(f"   URL: {result['url']}")
                print(f"   Status: {result['status'].upper():20} HTTP: {result['http_code']}")
                print(f"   Response: {result['response_time']:6} ms")
                if result["error"]:
                    print(f"   Error: {result['error']}")
                print()
                
            except Exception as e:
                print(f"❌ Error testing {world['name']}: {e}")
    
    # Summary statistics
    online_count = sum(1 for r in results if r["status"] == "online")
    error_count = len(results) - online_count
    avg_response_time = sum(r["response_time"] for r in results if r["response_time"] > 0) / len(results)
    
    print("=" * 80)
    print("CONNECTIVITY TEST SUMMARY")
    print("=" * 80)
    print(f"Total Worlds: {len(worlds)}")
    print(f"Online: {online_count} ({online_count/len(worlds)*100:.1f}%)")
    print(f"Errors: {error_count} ({error_count/len(worlds)*100:.1f}%)")
    print(f"Average Response Time: {avg_response_time:.0f} ms")
    print()
    
    # World status by agent group
    print("World Status by Agent Group:")
    print("-" * 40)
    
    # #rest agents (first 9)
    rest_results = results[:9]
    rest_online = sum(1 for r in rest_results if r["status"] == "online")
    print(f"#rest Agents (9): {rest_online}/9 online ({rest_online/9*100:.1f}%)")
    
    # #best agents (last 4)
    best_results = results[9:]
    best_online = sum(1 for r in best_results if r["status"] == "online")
    print(f"#best Agents (4): {best_online}/4 online ({best_online/4*100:.1f}%)")
    
    print()
    
    # Detailed status table
    print("Detailed World Status:")
    print("-" * 80)
    print(f"{'World':30} {'Agent':20} {'Status':10} {'HTTP':6} {'Time (ms)':10}")
    print("-" * 80)
    
    for result in results:
        status_display = "ONLINE" if result["status"] == "online" else "ERROR"
        http_display = result["http_code"] if result["http_code"] > 0 else "N/A"
        time_display = f"{result['response_time']:.0f}" if result["response_time"] > 0 else "N/A"
        
        print(f"{result['name']:30} {result['agent']:20} {status_display:10} {http_display:6} {time_display:10}")
    
    print("=" * 80)
    
    # Save results to file
    with open("connectivity-test-results.json", "w") as f:
        import json
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_worlds": len(worlds),
            "online_count": online_count,
            "error_count": error_count,
            "avg_response_time": avg_response_time,
            "results": results
        }, f, indent=2)
    
    print(f"Results saved to: connectivity-test-results.json")
    
    # Return success if all worlds are online
    if online_count == len(worlds):
        print("✅ SUCCESS: All 13 agent worlds are online and accessible!")
        return 0
    else:
        print(f"⚠️  WARNING: {error_count} world(s) had connectivity issues")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
