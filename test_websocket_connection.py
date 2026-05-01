#!/usr/bin/env python3
"""
Simplified WebSocket connectivity test without extra_headers compatibility issues
"""
import asyncio
import websockets
import json
import time
import hashlib
import hmac
import base64

async def test_websocket_connection():
    """Test connection to Phase 5 WebSocket server"""
    try:
        # Generate HMAC signature (using test key)
        message = "test_agent_connect"
        secret_key = b"test_secret_key_123"
        signature = hmac.new(secret_key, message.encode(), hashlib.sha256).digest()
        encoded_sig = base64.b64encode(signature).decode()
        
        # Connect to WebSocket server
        uri = "ws://localhost:18765/ws"
        print(f"Connecting to {uri}")
        
        headers = {
            "X-Agent-ID": "test_agent",
            "X-Signature": encoded_sig,
            "X-Timestamp": str(int(time.time()))
        }
        
        async with websockets.connect(uri, extra_headers=headers) as websocket:
            print("✓ Connected to WebSocket server")
            
            # Test basic message send/receive
            test_msg = {
                "type": "test",
                "agent": "test_agent",
                "world": "test_world",
                "timestamp": time.time()
            }
            
            await websocket.send(json.dumps(test_msg))
            print("✓ Sent test message")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"✓ Received response: {response[:100]}...")
                
                # Parse response
                data = json.loads(response)
                print(f"  Server status: {data.get('status', 'unknown')}")
                print(f"  Message type: {data.get('type', 'unknown')}")
                
                return True
            except asyncio.TimeoutError:
                print("✗ No response received within timeout")
                return False
                
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

def main():
    """Main test function"""
    print("Testing Phase 5 WebSocket Server Connectivity")
    print("=" * 50)
    
    # First check if server is running via HTTP endpoint
    import urllib.request
    try:
        response = urllib.request.urlopen("http://localhost:18080/health")
        health_data = json.loads(response.read().decode())
        print(f"✓ HTTP health endpoint: {health_data}")
    except Exception as e:
        print(f"✗ HTTP health check failed: {e}")
    
    # Test WebSocket connection
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    success = loop.run_until_complete(test_websocket_connection())
    
    if success:
        print("\n✅ WebSocket connectivity test PASSED!")
    else:
        print("\n❌ WebSocket connectivity test FAILED!")
    
    return success

if __name__ == "__main__":
    main()
