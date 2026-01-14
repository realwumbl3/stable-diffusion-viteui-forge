#!/usr/bin/env python3
"""
Simple test script to verify WebSocket progress functionality
"""
import asyncio
import json
import websockets
import requests
import time
from threading import Thread

async def websocket_client():
    """Test WebSocket client"""
    try:
        uri = "ws://localhost:7861/internal/progress-ws"
        async with websockets.connect(uri) as websocket:
            print("WebSocket connected")

            # Send a test message
            await websocket.send(json.dumps({"type": "ping"}))
            print("Sent ping")

            # Listen for messages
            try:
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    print(f"Received: {data}")
            except websockets.exceptions.ConnectionClosed:
                print("WebSocket connection closed")

    except Exception as e:
        print(f"WebSocket test failed: {e}")

def test_rest_api():
    """Test REST API progress endpoint"""
    try:
        # Test the pending tasks endpoint
        response = requests.get("http://localhost:7861/internal/pending-tasks")
        print(f"Pending tasks response: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")

        # Test the progress endpoint
        progress_data = {
            "id_task": "test-task-123",
            "id_live_preview": -1,
            "live_preview": True
        }
        response = requests.post("http://localhost:7861/internal/progress", json=progress_data)
        print(f"Progress response: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")

    except Exception as e:
        print(f"REST API test failed: {e}")

if __name__ == "__main__":
    print("Testing WebSocket progress functionality...")

    # Start WebSocket test in background
    websocket_thread = Thread(target=lambda: asyncio.run(websocket_client()))
    websocket_thread.daemon = True
    websocket_thread.start()

    # Test REST API
    test_rest_api()

    # Wait a bit for WebSocket test
    time.sleep(2)
    print("Test completed")