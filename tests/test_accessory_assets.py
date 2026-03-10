from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_cargo_icons_extracted_to_assets_folder() -> None:
    cargo_dir = ROOT / 'assets' / 'cargo'
    expected = {'bulk.png', 'container.png', 'oil.png', 'gas.png', 'cruise.png', 'cars.png'}
    present = {path.name for path in cargo_dir.glob('*.png')}

    assert expected.issubset(present)

    manifest = json.loads((cargo_dir / 'cargo_assets_manifest.json').read_text(encoding='utf-8'))
    assert set(manifest['icons']) == {'bulk', 'container', 'oil', 'gas', 'cruise', 'cars'}
    assert manifest['format'] == 'png-transparent'


def test_ship_masks_generated_for_recoloring() -> None:
    ships_dir = ROOT / 'assets' / 'ships' / 'recolorable'
    manifest = json.loads((ships_dir / 'ship_assets_manifest.json').read_text(encoding='utf-8'))

    assert set(manifest['ships']) == {'bulk', 'container', 'oil', 'gas', 'cruise', 'cars'}
    for payload in manifest['ships'].values():
        assert Path(payload['mask']).exists()
        assert payload['usage'] == 'css-mask'


def test_generated_asset_previews_exist() -> None:
    ship_preview = ROOT / 'app' / 'static' / 'generated' / 'ship-recolor-preview.html'
    cargo_preview = ROOT / 'app' / 'static' / 'generated' / 'cargo-extract-preview.html'
    assert ship_preview.exists()
    assert cargo_preview.exists()
