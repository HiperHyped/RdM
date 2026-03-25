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
GAME_V3_LAYOUT_CONFIG_PATH = _env_path('RDM_GAME_V3_LAYOUT_CONFIG_PATH', DATA_DIR / 'game_ai_ui_v3_layout.json')
BOARD_SOURCE_IMAGE = STATIC_DIR / 'assets' / 'board-source-updated.png'
SUPABASE_URL = str(os.getenv('RDM_SUPABASE_URL') or '').strip().rstrip('/')
SUPABASE_KEY = str(
    os.getenv('RDM_SUPABASE_KEY')
    or os.getenv('RDM_SUPABASE_ANON_KEY')
    or os.getenv('RDM_SUPABASE_SERVICE_KEY')
    or ''
).strip()
SUPABASE_STORAGE_BUCKET = str(os.getenv('RDM_SUPABASE_STORAGE_BUCKET') or 'ultramarine').strip() or 'ultramarine'
SUPABASE_STORAGE_PREFIX = str(os.getenv('RDM_SUPABASE_STORAGE_PREFIX') or 'FILES').strip().strip('/')
