import requests
import time
import sys
import json

BASE_URL = "http://127.0.0.1:7888/api" 

def test_timelapse(workspace_name):
    print(f"Starting timelapse test for workspace: {workspace_name}")
    
    # 1. Start the timelapse job
    start_url = f"{BASE_URL}/viteapi/timelapse/start"
    payload = {
        "workspace": workspace_name,
        "fps": 5,           
        "max_side": 0,      # No limit
        "last_frame_duration": 3, 
        "show_timestamp": True,   # Render timestamp
        # "range": "0..5"   
    }
    
    try:
        response = requests.post(start_url, json=payload)
        response.raise_for_status()
        data = response.json()
        job_id = data.get("job_id")
        print(f"Job started successfully. Job ID: {job_id}")
    except Exception as e:
        print(f"Failed to start job: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")
        return

    # 2. Poll for status
    status_url = f"{BASE_URL}/viteapi/timelapse/status/{job_id}"
    while True:
        try:
            status_response = requests.get(status_url)
            status_response.raise_for_status()
            status_data = status_response.json()
            
            status = status_data.get("status")
            progress = status_data.get("progress", 0)
            message = status_data.get("message", "")
            
            print(f"Status: {status} | Progress: {progress}% | Message: {message}")
            
            if status == "completed":
                print(f"\nSuccess! Output path: {status_data.get('output_path')}")
                break
            elif status == "failed":
                print(f"\nJob failed: {status_data.get('error')}")
                break
                
            time.sleep(1)
        except Exception as e:
            print(f"Error polling status: {e}")
            break

if __name__ == "__main__":
    workspace = "DJ"
    if len(sys.argv) > 1:
        workspace = sys.argv[1]
    
    test_timelapse(workspace)
