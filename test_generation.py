#!/usr/bin/env python3
"""
Simple test script to generate an image and check WebSocket progress updates
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
            print("WebSocket connected for generation test")

            # Keep listening for messages
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                print(f"Progress update: {data}")

                # Exit when task is completed
                if data.get('completed') and data.get('active') == False:
                    print("Generation completed!")
                    break

    except Exception as e:
        print(f"WebSocket error: {e}")

def generate_image():
    """Make API call to generate an image"""
    try:
        url = "http://localhost:7861/sdapi/v1/txt2img"
        payload = {
            "prompt": "a beautiful landscape",
            "steps": 20,
            "width": 512,
            "height": 512,
            "cfg_scale": 7,
            "sampler_name": "Euler a"
        }

        print("Starting image generation...")
        response = requests.post(url, json=payload)

        if response.status_code == 200:
            result = response.json()
            print(f"Generation successful! Got {len(result.get('images', []))} images")
        else:
            print(f"Generation failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"API call failed: {e}")

if __name__ == "__main__":
    print("Testing WebSocket progress updates during image generation...")

    # Start WebSocket listener in background
    websocket_thread = threading.Thread(target=lambda: asyncio.run(websocket_listener()))
    websocket_thread.daemon = True
    websocket_thread.start()

    # Wait a moment for WebSocket to connect
    time.sleep(2)

    # Start image generation
    generate_image()

    # Wait for WebSocket thread to finish
    websocket_thread.join(timeout=60)
    print("Test completed")