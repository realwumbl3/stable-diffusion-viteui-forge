# Mock ui_common for API-only mode
class ToolButton:
    def __init__(self, *args, **kwargs):
        pass

def create_refresh_button(*args, **kwargs):
    return None

refresh_symbol = "🔄"