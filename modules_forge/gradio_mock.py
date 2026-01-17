# Mock gradio module for API-only mode
class MockGradioComponent:
    def __init__(self, *args, **kwargs):
        pass

    def update(self, *args, **kwargs):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def __setattr__(self, name, value):
        self.__dict__[name] = value

class Radio(MockGradioComponent):
    pass

class Dropdown(MockGradioComponent):
    pass

class Slider(MockGradioComponent):
    pass

class Checkbox(MockGradioComponent):
    pass

class Button(MockGradioComponent):
    pass

class Textbox(MockGradioComponent):
    pass

class Number(MockGradioComponent):
    pass

class Markdown(MockGradioComponent):
    pass

class HTML(MockGradioComponent):
    pass

class Row(MockGradioComponent):
    pass

class Column(MockGradioComponent):
    pass

class Group(MockGradioComponent):
    pass

class Tab(MockGradioComponent):
    pass

class TabItem(MockGradioComponent):
    pass

class Tabs(MockGradioComponent):
    pass

class Accordion(MockGradioComponent):
    pass

class Blocks:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def load(self, *args, **kwargs):
        return self

def networking():
    return None

# Mock the gradio module structure
import sys
from types import ModuleType

gradio_mock = ModuleType('gradio')
gradio_mock.Radio = Radio
gradio_mock.Dropdown = Dropdown
gradio_mock.Slider = Slider
gradio_mock.Checkbox = Checkbox
gradio_mock.Button = Button
gradio_mock.Textbox = Textbox
gradio_mock.Number = Number
gradio_mock.Markdown = Markdown
gradio_mock.HTML = HTML
gradio_mock.Row = Row
gradio_mock.Column = Column
gradio_mock.Group = Group
gradio_mock.Tab = Tab
gradio_mock.TabItem = TabItem
gradio_mock.Tabs = Tabs
gradio_mock.Accordion = Accordion
gradio_mock.Blocks = Blocks
gradio_mock.networking = networking

# Mock gradio.context
context_mock = ModuleType('gradio.context')
context_mock.Context = type('Context', (), {'root_block': None, 'block': None})

sys.modules['gradio'] = gradio_mock
sys.modules['gradio.context'] = context_mock
sys.modules['gradio.networking'] = ModuleType('gradio.networking')