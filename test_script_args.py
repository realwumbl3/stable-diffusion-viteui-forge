#!/usr/bin/env python3

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test script args initialization without full initialization
from modules import scripts

# Load scripts
scripts.load_scripts()

print("Testing script args initialization...")

# Create a mock API class just to test the method
class MockApi:
    def init_default_script_args(self, script_runner):
        #find max idx from the scripts in runner and generate a none array to init script_args
        last_arg_index = 1
        current_arg_index = 1  # Start after the script selector at index 0

        # Initialize script argument ranges for API-only mode
        for script in script_runner.scripts:
            if script.args_from is None:
                script.args_from = current_arg_index
                # Count controls by calling ui() method without creating actual UI
                try:
                    controls = script.ui(script.is_img2img)
                    if controls is not None:
                        if isinstance(controls, (list, tuple)):
                            control_count = len(controls)
                        else:
                            control_count = 1
                    else:
                        control_count = 0
                    script.args_to = current_arg_index + control_count
                    current_arg_index += control_count
                except Exception as e:
                    print(f"Error getting UI for {script.filename}: {e}")
                    # If UI creation fails, assume no arguments
                    script.args_to = current_arg_index

        for script in script_runner.scripts:
            if script.args_to is not None and last_arg_index < script.args_to:
                last_arg_index = script.args_to

        # None everywhere except position 0 to initialize script args
        script_args = [None]*last_arg_index
        script_args[0] = 0

        # get default values - simplified for API-only service
        # Removed Gradio UI dependency per STRIP_WEB_UI_PLAN.md
        for script in script_runner.scripts:
            if script.args_from is not None and script.args_to is not None:
                # Extract default values from script controls
                script_range = script.args_to - script.args_from
                if script_range > 0:
                    try:
                        controls = script.ui(script.is_img2img)
                        if controls is not None:
                            defaults = []
                            if isinstance(controls, (list, tuple)):
                                for control in controls:
                                    # Get default value from control
                                    default_val = getattr(control, 'value', None)
                                    defaults.append(default_val)
                            else:
                                default_val = getattr(controls, 'value', None)
                                defaults.append(default_val)
                            script_args[script.args_from:script.args_to] = defaults
                        else:
                            script_args[script.args_from:script.args_to] = [None] * script_range
                    except Exception as e:
                        print(f"Error getting defaults for {script.filename}: {e}")
                        # If UI creation fails, use None defaults
                        script_args[script.args_from:script.args_to] = [None] * script_range
        return script_args

api = MockApi()

# Test txt2img scripts
script_args = api.init_default_script_args(scripts.scripts_txt2img)
print(f"Txt2img script_args length: {len(script_args)}")
print(f"Txt2img script_args: {script_args}")

# Check individual scripts
for script in scripts.scripts_txt2img.scripts:
    print(f"Script: {script.filename}")
    print(f"  args_from: {script.args_from}")
    print(f"  args_to: {script.args_to}")
    if script.args_from is not None and script.args_to is not None:
        script_range = script.args_to - script.args_from
        print(f"  expected args: {script_range}")
        script_slice = script_args[script.args_from:script.args_to]
        print(f"  script_args slice: {script_slice}")

print("\nTest completed!")