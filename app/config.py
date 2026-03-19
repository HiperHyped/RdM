from __future__ import annotations

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / 'data'
STATIC_DIR = ROOT_DIR / 'app' / 'static'
TEMPLATE_DIR = ROOT_DIR / 'app' / 'ui' / 'templates'
SAVE_ROOT_DIR = ROOT_DIR / 'saves'
BOARD_SOURCE_IMAGE = STATIC_DIR / 'assets' / 'board-source-updated.png'
