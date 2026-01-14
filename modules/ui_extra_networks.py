# Mock ui_extra_networks for API-only mode
class ExtraNetworksPage:
    def __init__(self, *args, **kwargs):
        pass

def register_page(*args, **kwargs):
    pass

def create_ui(*args, **kwargs):
    return None, None

def quote_js(text):
    return str(text).replace("'", "\\'").replace('"', '\\"')