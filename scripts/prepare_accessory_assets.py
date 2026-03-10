from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS_CARGO_DIR = ROOT / 'assets' / 'cargo'
APP_STATIC_CARGO_DIR = ROOT / 'app' / 'static' / 'assets' / 'cargo'
ASSETS_SHIPS_DIR = ROOT / 'assets' / 'ships'
SHIPS_RECOLORABLE_DIR = ASSETS_SHIPS_DIR / 'recolorable'
APP_SHIPS_RECOLORABLE_DIR = ROOT / 'app' / 'static' / 'assets' / 'ships' / 'recolorable'
APP_GENERATED_DIR = ROOT / 'app' / 'static' / 'generated'
DATA_DIR = ROOT / 'data'

CARGO_CROP_MAP = {
    'cars': (18, 18, 322, 322),
    'cruise': (18, 362, 322, 666),
    'bulk': (362, 362, 666, 666),
    'gas': (18, 706, 322, 1006),
    'container': (362, 706, 666, 1006),
    'oil': (706, 706, 1006, 1006),
}

SHIP_SOURCE_MAP = {
    'bulk': 'bulk_v2.png',
    'container': 'container_v2.jpg',
    'oil': 'petrol_v2.png',
    'gas': 'gaser_v2.jpg',
    'cruise': 'cruiser_v2.png',
    'cars': 'roro_v2.png',
}

COLOR_MAP = {
    'blue': '#2563eb',
    'yellow': '#eab308',
    'green': '#22c55e',
    'red': '#ef4444',
    'orange': '#f97316',
    'purple': '#a855f7',
}


def ensure_dirs() -> None:
    ASSETS_CARGO_DIR.mkdir(parents=True, exist_ok=True)
    APP_STATIC_CARGO_DIR.mkdir(parents=True, exist_ok=True)
    SHIPS_RECOLORABLE_DIR.mkdir(parents=True, exist_ok=True)
    APP_SHIPS_RECOLORABLE_DIR.mkdir(parents=True, exist_ok=True)
    APP_GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def _trim_transparent(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def _extract_cargo_icon(source: Path, crop_box: tuple[int, int, int, int]) -> Image.Image:
    image = Image.open(source).convert('RGBA')
    crop = image.crop(crop_box)
    background = crop.getpixel((0, 0))

    rgba_data: list[tuple[int, int, int, int]] = []
    for pixel in crop.getdata():
        red, green, blue, alpha = pixel
        distance = abs(red - background[0]) + abs(green - background[1]) + abs(blue - background[2])
        is_border = red > 180 and green < 120 and blue < 120
        if distance < 42 or is_border:
            rgba_data.append((0, 0, 0, 0))
        else:
            rgba_data.append((red, green, blue, alpha))

    clean = Image.new('RGBA', crop.size)
    clean.putdata(rgba_data)
    clean = _trim_transparent(clean)
    clean = ImageOps.expand(clean, border=10, fill=(0, 0, 0, 0))
    return clean


def build_cargo_icons() -> dict[str, str]:
    source = ASSETS_CARGO_DIR / 'D6 - CARGAS.jpg'
    manifest: dict[str, str] = {}

    for old_svg in ASSETS_CARGO_DIR.glob('*.svg'):
        old_svg.unlink()
    for old_png in ASSETS_CARGO_DIR.glob('*.png'):
        old_png.unlink()
    for old_png in APP_STATIC_CARGO_DIR.glob('*.png'):
        old_png.unlink()

    for kind, crop_box in CARGO_CROP_MAP.items():
        icon = _extract_cargo_icon(source, crop_box)
        filename = f'{kind}.png'
        assets_target = ASSETS_CARGO_DIR / filename
        app_target = APP_STATIC_CARGO_DIR / filename
        icon.save(assets_target)
        icon.save(app_target)
        manifest[kind] = str(assets_target)

    (ASSETS_CARGO_DIR / 'cargo_assets_manifest.json').write_text(
        json.dumps(
            {
                'icons': {kind: Path(path).name for kind, path in manifest.items()},
                'source': 'assets/cargo/D6 - CARGAS.jpg',
                'format': 'png-transparent',
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding='utf-8',
    )
    return manifest


def _build_ship_mask(source: Path) -> Image.Image:
    grayscale = Image.open(source).convert('L')
    mask = grayscale.point(lambda px: 255 if px < 210 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError(f'No ship silhouette detected in {source.name}')

    cropped_mask = mask.crop(bbox)
    cropped_mask = ImageOps.expand(cropped_mask, border=20, fill=0)
    output = Image.new('RGBA', cropped_mask.size, (0, 0, 0, 0))
    output.putalpha(cropped_mask)
    return output


def build_ship_masks() -> dict[str, dict[str, str]]:
    manifest: dict[str, dict[str, str]] = {}
    for kind, filename in SHIP_SOURCE_MAP.items():
        source = ASSETS_SHIPS_DIR / filename
        mask_image = _build_ship_mask(source)

        mask_name = f'{kind}_mask.png'
        assets_target = SHIPS_RECOLORABLE_DIR / mask_name
        app_target = APP_SHIPS_RECOLORABLE_DIR / mask_name
        mask_image.save(assets_target)
        mask_image.save(app_target)

        manifest[kind] = {
            'source': str(source),
            'mask': str(assets_target),
            'web_mask': f'/static/assets/ships/recolorable/{mask_name}',
            'usage': 'css-mask',
        }

    (SHIPS_RECOLORABLE_DIR / 'ship_assets_manifest.json').write_text(
        json.dumps({'ships': manifest, 'colors': COLOR_MAP}, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    return manifest


def build_ship_preview(manifest: dict[str, dict[str, str]]) -> None:
    colors = json.loads((DATA_DIR / 'player_colors.json').read_text(encoding='utf-8'))
    cards = []
    for ship_kind, payload in manifest.items():
        swatches = []
        for color in colors:
            swatches.append(
                f"<div class='ship-preview-swatch'><div class='ship-preview-figure' style='--ship-color:{color["hex"]}; --ship-mask:url({payload["web_mask"]})'></div><span>{color["label"]}</span></div>"
            )
        cards.append(
            f"<section class='ship-preview-card'><h2>{ship_kind}</h2><div class='ship-preview-grid'>{''.join(swatches)}</div></section>"
        )

    html = f"""<!doctype html>
<html lang='pt-BR'>
<head>
  <meta charset='utf-8'>
  <title>Ship Recolor Preview</title>
  <style>
    :root {{ color-scheme: dark; }}
    body {{ margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #03101a; color: #e9f3ff; }}
    h1 {{ margin: 0 0 18px; font-size: 28px; }}
    .ship-preview-stack {{ display: grid; gap: 18px; }}
    .ship-preview-card {{ padding: 16px; border-radius: 18px; background: linear-gradient(180deg, rgba(7,24,39,.95), rgba(5,18,31,.92)); border: 1px solid rgba(215,230,245,.10); }}
    .ship-preview-card h2 {{ margin: 0 0 12px; font-size: 18px; text-transform: capitalize; }}
    .ship-preview-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }}
    .ship-preview-swatch {{ display: grid; gap: 8px; justify-items: center; padding: 12px; border-radius: 14px; background: rgba(255,255,255,.03); }}
    .ship-preview-figure {{ width: 156px; height: 82px; background: var(--ship-color); -webkit-mask-image: var(--ship-mask); mask-image: var(--ship-mask); -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; -webkit-mask-size: contain; mask-size: contain; }}
    .ship-preview-swatch span {{ font-size: 13px; color: #a9bfd4; }}
  </style>
</head>
<body>
  <h1>Preview de Recolora??o dos Navios</h1>
  <div class='ship-preview-stack'>
    {''.join(cards)}
  </div>
</body>
</html>
"""
    (APP_GENERATED_DIR / 'ship-recolor-preview.html').write_text(html, encoding='utf-8')


def build_cargo_preview(cargo_manifest: dict[str, str]) -> None:
    cards = []
    for kind, path in cargo_manifest.items():
        cards.append(
            f"<section class='cargo-preview-card'><h2>{kind}</h2><div class='cargo-preview-figure'><img src='/static/assets/cargo/{Path(path).name}' alt='{kind}'></div></section>"
        )

    html = f"""<!doctype html>
<html lang='pt-BR'>
<head>
  <meta charset='utf-8'>
  <title>Cargo Extract Preview</title>
  <style>
    :root {{ color-scheme: dark; }}
    body {{ margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #03101a; color: #e9f3ff; }}
    h1 {{ margin: 0 0 18px; font-size: 28px; }}
    .cargo-preview-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }}
    .cargo-preview-card {{ padding: 16px; border-radius: 18px; background: linear-gradient(180deg, rgba(7,24,39,.95), rgba(5,18,31,.92)); border: 1px solid rgba(215,230,245,.10); display: grid; gap: 12px; justify-items: center; }}
    .cargo-preview-card h2 {{ margin: 0; font-size: 18px; text-transform: capitalize; }}
    .cargo-preview-figure {{ min-height: 120px; width: 100%; display: grid; place-items: center; background: rgba(255,255,255,.03); border-radius: 12px; }}
    .cargo-preview-figure img {{ max-width: 120px; max-height: 120px; display: block; }}
  </style>
</head>
<body>
  <h1>Preview de Extra??o das Cargas</h1>
  <div class='cargo-preview-grid'>
    {''.join(cards)}
  </div>
</body>
</html>
"""
    (APP_GENERATED_DIR / 'cargo-extract-preview.html').write_text(html, encoding='utf-8')


def build_manifests(cargo_manifest: dict[str, str], ship_manifest: dict[str, dict[str, str]]) -> None:
    cargo = {kind: f'/static/assets/cargo/{Path(path).name}' for kind, path in cargo_manifest.items()}
    ships = {kind: payload['web_mask'] for kind, payload in ship_manifest.items()}
    (APP_GENERATED_DIR / 'cargo-assets-manifest.json').write_text(
        json.dumps({'cargo': cargo}, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    (APP_GENERATED_DIR / 'icon-pack-manifest.json').write_text(
        json.dumps({'ships': ships, 'cargo': cargo}, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )


def main() -> None:
    ensure_dirs()
    cargo_manifest = build_cargo_icons()
    ship_manifest = build_ship_masks()
    build_ship_preview(ship_manifest)
    build_cargo_preview(cargo_manifest)
    build_manifests(cargo_manifest, ship_manifest)
    print('Accessory assets prepared.')


if __name__ == '__main__':
    main()
