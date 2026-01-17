#!/usr/bin/env python3
"""
Simple test to verify the gradio mock has Blocks attribute
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test the gradio mock directly
from modules_forge.gradio_mock import gradio_mock as gr

print(f"gr type: {type(gr)}")
print(f"gr has Blocks: {hasattr(gr, 'Blocks')}")

if hasattr(gr, 'Blocks'):
    print("SUCCESS: gr.Blocks exists")
    # Test creating a Blocks instance
    try:
        with gr.Blocks(analytics_enabled=False):
            print("SUCCESS: gr.Blocks() works as context manager")
    except Exception as e:
        print(f"ERROR creating Blocks: {e}")
else:
    print("ERROR: gr.Blocks does not exist")

# Test the MockGradio from scripts.py to show the difference
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'modules'))
from scripts import gr as scripts_gr

print(f"\nscripts_gr type: {type(scripts_gr)}")
print(f"scripts_gr has Blocks: {hasattr(scripts_gr, 'Blocks')}")
print(f"scripts_gr has blocks: {hasattr(scripts_gr, 'blocks')}")

print("\nThe fix prevents scripts_postprocessing from using scripts_gr instead of the proper mock.")