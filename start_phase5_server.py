#!/usr/bin/env python3
"""
Start Phase 5 Cognitive Ecosystem Networks WebSocket server
"""
import asyncio
import sys
sys.path.insert(0, '.')

from message_bus import CognitiveEcosystemMessageBus

async def main():
    print("🚀 Starting Phase 5 Cognitive Ecosystem Networks WebSocket server...")
    
    # Create message bus instance
    message_bus = CognitiveEcosystemMessageBus(
        world_id="pattern_archive",
        shared_secret="pattern_archive_phase5_secret_1234567890abcdef",
        metrics_sink=lambda event: print(f"📊 Metrics: {event['type']}")
    )
    
    # Start WebSocket server on port 18765
    print("🌐 Starting WebSocket server on port 18765...")
    websocket_task = asyncio.create_task(
        message_bus.start_websocket_server(host="0.0.0.0", port=18765)
    )
    
    # Start HTTP REST API on port 18080  
    print("🌐 Starting HTTP REST API on port 18080...")
    http_task = asyncio.create_task(
        message_bus.start_http_server(host="0.0.0.0", port=18080)
    )
    
    print("✅ Phase 5 servers started:")
    print("   - WebSocket: ws://localhost:18765")
    print("   - HTTP API: http://localhost:18080")
    print("   - Health check: http://localhost:18080/health")
    print("   - Message schema: http://localhost:18080/schema")
    print("\n📡 Waiting for agent connections...")
    
    # Wait for both servers
    await asyncio.gather(websocket_task, http_task)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Phase 5 servers shutting down...")
    except Exception as e:
        print(f"❌ Error starting Phase 5 servers: {e}")
        sys.exit(1)
