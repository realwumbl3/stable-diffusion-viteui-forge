import importlib
import logging
import sys
import warnings
import os

from modules.timer import startup_timer


def imports():
    logging.getLogger("torch.distributed.nn").setLevel(logging.ERROR)  # sshh...
    logging.getLogger("xformers").addFilter(lambda record: 'A matching Triton is not available' not in record.getMessage())

    import torch  # noqa: F401
    startup_timer.record("import torch")
    import pytorch_lightning  # noqa: F401
    startup_timer.record("import torch")
    warnings.filterwarnings(action="ignore", category=DeprecationWarning, module="pytorch_lightning")
    warnings.filterwarnings(action="ignore", category=UserWarning, module="torchvision")

    from modules import paths, timer, import_hook, errors  # noqa: F401
    startup_timer.record("setup paths")

    from modules import shared_init
    shared_init.initialize()
    startup_timer.record("initialize shared")

    from modules import processing  # noqa: F401
    startup_timer.record("other imports")


def check_versions():
    from modules.shared_cmd_options import cmd_opts

    if not cmd_opts.skip_version_check:
        from modules import errors
        errors.check_versions()


def initialize():
    from modules import initialize_util
    initialize_util.fix_torch_version()
    initialize_util.fix_pytorch_lightning()
    initialize_util.fix_asyncio_event_loop_policy()
    initialize_util.validate_tls_options()
    initialize_util.configure_sigint_handler()
    initialize_util.configure_opts_onchange()

    from modules import sd_models
    try:
        sd_models.setup_model()
        startup_timer.record("setup SD model")
    except Exception as e:
        print(f"Warning: Failed to setup SD model: {e}")

    from modules.shared_cmd_options import cmd_opts

    from modules import codeformer_model
    warnings.filterwarnings(action="ignore", category=UserWarning, module="torchvision.transforms.functional_tensor")
    try:
        codeformer_model.setup_model(cmd_opts.codeformer_models_path)
        startup_timer.record("setup codeformer")
    except Exception as e:
        print(f"Warning: Failed to setup codeformer: {e}")

    from modules import gfpgan_model
    try:
        gfpgan_model.setup_model(cmd_opts.gfpgan_models_path)
        startup_timer.record("setup gfpgan")
    except Exception as e:
        print(f"Warning: Failed to setup gfpgan: {e}")

    initialize_rest(reload_script_modules=False)


def initialize_rest(*, reload_script_modules=False):
    """
    Called both from initialize() and when reloading the webui.
    """
    from modules.shared_cmd_options import cmd_opts

    from modules import sd_samplers
    sd_samplers.set_samplers()
    startup_timer.record("set samplers")

    from modules import extensions
    extensions.list_extensions()
    startup_timer.record("list extensions")

    from modules import initialize_util
    initialize_util.restore_config_state_file()
    startup_timer.record("restore config state file")

    from modules import shared, upscaler, scripts
    if getattr(cmd_opts, 'ui_debug_mode', False):
        shared.sd_upscalers = upscaler.UpscalerLanczos().scalers
        scripts.load_scripts()
        return

    from modules import sd_models
    try:
        sd_models.list_models()
        startup_timer.record("list SD models")
    except Exception as e:
        print(f"Warning: Failed to list SD models: {e}")

    from modules import localization
    localization.list_localizations(cmd_opts.localizations_dir)
    startup_timer.record("list localizations")

    with startup_timer.subcategory("load scripts"):
        scripts.load_scripts()

    if reload_script_modules and shared.opts.enable_reloading_ui_scripts:
        for module in [module for name, module in sys.modules.items() if name.startswith("modules.ui")]:
            importlib.reload(module)
        startup_timer.record("reload script modules")

    from modules import modelloader
    modelloader.load_upscalers()
    startup_timer.record("load upscalers")

    from modules import sd_vae
    sd_vae.refresh_vae_list()
    startup_timer.record("refresh VAE")

    from modules import sd_unet
    sd_unet.list_unets()
    startup_timer.record("scripts list_unets")

    from modules import shared_items
    shared_items.reload_hypernetworks()
    startup_timer.record("reload hypernetworks")


    from modules import extra_networks
    extra_networks.initialize()
    extra_networks.register_default_extra_networks()
    startup_timer.record("initialize extra networks")

    return
