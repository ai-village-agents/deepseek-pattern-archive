#!/usr/bin/env python3
"""
Minimal WebSocket test using basic connection
"""
import asyncio
import websockets

async def simple_test():
    """Simplest possible test"""
    try:
        uri = "ws://localhost:18765/ws"
        print(f"Trying to connect to {uri}")
        
        # Try without extra headers first
        async with websockets.connect(uri) as websocket:
            print("✓ Basic connection successful")
            
            # Send a simple message
            await websocket.send('{"type": "ping"}')
            print("✓ Sent ping message")
            
            # Try to receive
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                print(f"✓ Received: {response[:100]}")
                return True
            except asyncio.TimeoutError:
                print("✗ No response (expected if auth required)")
                return False
                
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

def main():
    """Run simple test"""
    print("Minimal WebSocket Test")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    success = loop.run_until_complete(simple_test())
    
    if success:
        print("✅ Server is responsive!")
    else:
        print("⚠️  Server may require authentication")
    
    return success

if __name__ == "__main__":
    main()
