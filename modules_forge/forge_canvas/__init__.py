# Mock forge_canvas package for API-only mode
from .canvas import MockCanvas

class ForgeCanvas:
    def __init__(self, *args, **kwargs):
        pass

def create_canvas(*args, **kwargs):
    return None