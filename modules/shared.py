import os
import sys

from modules import shared_cmd_options, options, shared_items, sd_models_types
from modules.paths_internal import models_path, script_path, data_path, sd_configs_path, sd_default_config, sd_model_file, default_sd_model_file, extensions_dir, extensions_builtin_dir  # noqa: F401
from modules import util
from typing import TYPE_CHECKING
from backend import memory_management

if TYPE_CHECKING:
    from modules import shared_state, styles, interrogate, shared_total_tqdm, memmon

cmd_opts = shared_cmd_options.cmd_opts
parser = shared_cmd_options.parser

batch_cond_uncond = True  # old field, unused now in favor of shared.opts.batch_cond_uncond
parallel_processing_allowed = True
default_styles_paths = [os.path.join(data_path, 'styles.csv'), os.path.join(data_path, 'styles_integrated.csv')]
styles_filename = getattr(cmd_opts, 'styles_file', default_styles_paths)
if hasattr(cmd_opts, 'styles_file') and len(cmd_opts.styles_file) > 0:
    cmd_opts.styles_file = styles_filename
elif hasattr(cmd_opts, 'styles_file') and len(cmd_opts.styles_file) == 0:
    # If styles_file is explicitly set to empty list, use default paths
    styles_filename = default_styles_paths
config_filename = getattr(cmd_opts, 'ui_settings_file', os.path.join(data_path, 'config.json'))
hide_dirs = {"visible": not getattr(cmd_opts, 'hide_ui_dir_config', False)}

demo = None

device: str = None

weight_load_location: str = None

xformers_available = memory_management.xformers_enabled()

hypernetworks = {}

loaded_hypernetworks = []

state: 'shared_state.State' = None

prompt_styles: 'styles.StyleDatabase' = None

interrogator: 'interrogate.InterrogateModels' = None

face_restorers = []

options_templates: dict = None
opts: options.Options = None
restricted_opts: set[str] = None

sd_model = None

settings_components: dict = None
"""assigned from ui.py, a mapping on setting names to gradio components responsible for those settings"""

tab_names = []

latent_upscale_default_mode = "Latent"
latent_upscale_modes = {
    "Latent": {"mode": "bilinear", "antialias": False},
    "Latent (antialiased)": {"mode": "bilinear", "antialias": True},
    "Latent (bicubic)": {"mode": "bicubic", "antialias": False},
    "Latent (bicubic antialiased)": {"mode": "bicubic", "antialias": True},
    "Latent (nearest)": {"mode": "nearest", "antialias": False},
    "Latent (nearest-exact)": {"mode": "nearest-exact", "antialias": False},
}

sd_upscalers = []

clip_model = None

progress_print_out = sys.stdout

gradio_theme = None

total_tqdm: 'shared_total_tqdm.TotalTQDM' = None

mem_mon: 'memmon.MemUsageMonitor' = None

options_section = options.options_section
OptionInfo = options.OptionInfo
OptionHTML = options.OptionHTML

natural_sort_key = util.natural_sort_key
listfiles = util.listfiles
html_path = util.html_path
html = util.html
walk_files = util.walk_files
ldm_print = util.ldm_print

reload_gradio_theme = lambda: None  # Mock for API-only mode

list_checkpoint_tiles = shared_items.list_checkpoint_tiles
refresh_checkpoints = shared_items.refresh_checkpoints
list_samplers = shared_items.list_samplers
reload_hypernetworks = shared_items.reload_hypernetworks

hf_endpoint = os.getenv('HF_ENDPOINT', 'https://huggingface.co')
