import os

import launch
from modules import cmd_args, script_loading
from modules.paths_internal import models_path, script_path, data_path, sd_configs_path, sd_default_config, sd_model_file, default_sd_model_file, extensions_dir, extensions_builtin_dir  # noqa: F401

parser = cmd_args.parser

settings_file = getattr(launch.args, 'ui_settings_file', os.path.join(data_path, 'config.json'))
script_loading.preload_extensions(extensions_dir, parser, extension_list=launch.list_extensions(settings_file))
script_loading.preload_extensions(extensions_builtin_dir, parser)

if os.environ.get('IGNORE_CMD_ARGS_ERRORS', None) is None:
    cmd_opts = parser.parse_args()
else:
    cmd_opts, _ = parser.parse_known_args()

cmd_opts.webui_is_non_local = any([getattr(cmd_opts, 'share', False), getattr(cmd_opts, 'listen', False), getattr(cmd_opts, 'ngrok', False), getattr(cmd_opts, 'server_name', None)])
cmd_opts.disable_extension_access = cmd_opts.webui_is_non_local and not getattr(cmd_opts, 'enable_insecure_extension_access', False)
