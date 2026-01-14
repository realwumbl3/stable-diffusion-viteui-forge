#!/usr/bin/env python3
"""
Test WebSocket progress broadcasting
"""
import asyncio
import json
import websockets
import requests
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
            while time.time() - start_time < 15:  # Listen for 15 seconds
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"Received: {data}")
                except asyncio.TimeoutError:
                    pass  # No message received, continue

            print("WebSocket listener finished")

    except Exception as e:
        print(f"WebSocket error: {e}")

def api_caller():
    """Make API calls to trigger progress broadcasts"""
    time.sleep(2)  # Wait for WebSocket to connect

    url = 'http://localhost:7861/internal/progress'
    data = {'id_task': 'test-task-123', 'id_live_preview': -1, 'live_preview': True}

    print("Making API calls...")
    for i in range(5):
        try:
            response = requests.post(url, json=data)
            print(f'API call {i+1}: Status {response.status_code}')
            if 'task_id' in data and data['id_task']:
                # This should trigger WebSocket broadcast since req.id_task is set
                print("Should broadcast progress update via WebSocket")
        except Exception as e:
            print(f"API call error: {e}")
        time.sleep(2)

if __name__ == "__main__":
    print("Testing WebSocket progress broadcasting...")

    # Start API caller in background
    api_thread = threading.Thread(target=api_caller)
    api_thread.daemon = True
    api_thread.start()

    # Start WebSocket listener (this will block)
    asyncio.run(websocket_listener())

    print("Test completed")