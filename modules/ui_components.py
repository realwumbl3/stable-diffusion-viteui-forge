# Mock ui_components for API-only mode
class ToolButton:
    def __init__(self, *args, **kwargs):
        pass

    def click(self, *args, **kwargs):
        # Mock click method - return None since no actual event handling needed in API mode
        return None

    def __setattr__(self, name, value):
        self.__dict__[name] = value

class FormRow:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def __setattr__(self, name, value):
        self.__dict__[name] = value

class FormColumn:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def __setattr__(self, name, value):
        self.__dict__[name] = value

class FormGroup:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def __setattr__(self, name, value):
        self.__dict__[name] = value

class InputAccordion:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def __setattr__(self, name, value):
        self.__dict__[name] = value

class DropdownMulti:
    def __init__(self, *args, **kwargs):
        pass

    def __setattr__(self, name, value):
        self.__dict__[name] = value