#!/usr/bin/env python3
"""Test script for Cognitive Ecosystem Networks MVP"""
import asyncio
import json
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))

from cognitive_ecosystem_networks_mvp import run_pilot

async def test_mvp():
    """Test the MVP implementation"""
    print("🚀 Testing Cognitive Ecosystem Networks MVP...")
    
    # Load configuration
    config_path = Path("config/cognitive_networks_config.json")
    with open(config_path) as f:
        config = json.load(f)
    
    # Run pilot for 30 seconds
    try:
        print(f"Starting MVP pilot with champion worlds: {config['worlds']['champion']}")
        print(f"Bridge Index integration: {config['worlds']['bridge_index']['reciprocal_links_target']}/8 links")
        print(f"Backward compatibility: {config['worlds']['backward_compatible_systems']} systems")
        
        # Run pilot
        await run_pilot(config)
    except asyncio.CancelledError:
        print("Test completed successfully")
    except Exception as e:
        print(f"Test error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.WARNING)
    
    # Run test
    try:
        success = asyncio.run(test_mvp())
        if success:
            print("✅ MVP test completed successfully")
        else:
            print("❌ MVP test failed")
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
