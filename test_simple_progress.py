#!/usr/bin/env python3
"""
Simple test to check if WebSocket progress broadcasting works
"""
import asyncio
import json
import websockets
import threading
import time

async def websocket_listener():
    """Listen for WebSocket progress updates"""
    try:
        uri = "ws://localhost:7861/internal/progress-ws"
        async with websockets.connect(uri) as websocket:
            print("WebSocket connected")

            # Keep listening for messages
            start_time = time.time()
            while time.time() - start_time < 10:  # Listen for 10 seconds
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"Received: {data}")
                except asyncio.TimeoutError:
                    pass  # No message received, continue

            print("WebSocket test completed")

    except Exception as e:
        print(f"WebSocket error: {e}")

if __name__ == "__main__":
    print("Testing WebSocket progress broadcasting...")

    # Start WebSocket listener in background
    websocket_thread = threading.Thread(target=lambda: asyncio.run(websocket_listener()))
    websocket_thread.daemon = True
    websocket_thread.start()

    # Wait for WebSocket to connect
    time.sleep(2)

    # Wait for test to complete
    websocket_thread.join()
    print("Test completed")