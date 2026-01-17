# Mock ui_common for API-only mode
class ToolButton:
    def __init__(self, *args, **kwargs):
        pass

def create_refresh_button(*args, **kwargs):
    return None

def plaintext_to_html(text):
    """Convert plaintext to HTML for display"""
    if not text:
        return ""
    # Basic HTML escaping and line break conversion
    return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')

refresh_symbol = "🔄"