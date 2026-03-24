from __future__ import annotations

import os
from pathlib import Path


def _env_path(name: str, default: Path) -> Path:
    value = os.getenv(name)
    if not value:
        return default
    return Path(value).expanduser()


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / 'data'
STATIC_DIR = ROOT_DIR / 'app' / 'static'
TEMPLATE_DIR = ROOT_DIR / 'app' / 'ui' / 'templates'
SAVE_ROOT_DIR = _env_path('RDM_SAVE_ROOT_DIR', ROOT_DIR / 'saves')
GAME_V3_TUTORIAL_CONFIG_PATH = _env_path('RDM_TUTORIAL_CONFIG_PATH', DATA_DIR / 'game_v3_tutorial_v2.json')
BOARD_SOURCE_IMAGE = STATIC_DIR / 'assets' / 'board-source-updated.png'
