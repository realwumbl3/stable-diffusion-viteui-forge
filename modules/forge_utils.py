"""
Shared utilities for Forge extension scripts.
"""

def create_default_args(args, defaults):
    """
    Combine script arguments with defaults, padding with defaults if args is shorter,
    or truncating args if it's longer than defaults.

    Args:
        args: The arguments passed to the script (typically *script_args)
        defaults: List of default values for each expected argument

    Returns:
        List with combined arguments, length equal to len(defaults)
    """
    args_list = list(args)
    if len(args_list) < len(defaults):
        return args_list + defaults[len(args_list):]
    else:
        return args_list[:len(defaults)]