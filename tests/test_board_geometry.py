from __future__ import annotations

import json
from pathlib import Path

from app.config import DATA_DIR, STATIC_DIR
from app.maptools.calibration import geo_to_pixel, pixel_to_geo
from app.maptools.models import CalibrationConfig


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def test_anchor_calibration_uses_updated_board_image() -> None:
    payload = load_json(DATA_DIR / 'map_calibration.json')
    calibration = CalibrationConfig.model_validate(payload)

    assert calibration.image_width == 2526
    assert calibration.image_height == 1786
    assert calibration.source_image_url == '/static/assets/board-source-updated.png'
    assert len(calibration.anchors) == 36

    for anchor in calibration.anchors[:8]:
        lat, lon = pixel_to_geo(anchor.x, anchor.y, calibration)
        assert abs(lat - anchor.lat) < 1.0
        assert abs(lon - anchor.lon) < 1.0

        x, y = geo_to_pixel(anchor.lat, anchor.lon, calibration)
        assert abs(x - anchor.x) < 5.0
        assert abs(y - anchor.y) < 5.0


def test_board_geometry_files_are_consistent() -> None:
    nodes = load_json(DATA_DIR / 'board_nodes.json')
    edges = load_json(DATA_DIR / 'board_edges.json')
    node_ids = {node['id'] for node in nodes}

    ports = [node for node in nodes if node['kind'] == 'port']
    tolls = [node for node in nodes if node['kind'] == 'toll']
    fuels = [node for node in nodes if node['kind'] == 'fuel']
    chances = [node for node in nodes if node['kind'] == 'chance']

    assert len(ports) == 30
    assert len({node['label'] for node in ports}) == 30
    assert len(tolls) == 6
    assert len({node['label'] for node in tolls}) == 6
    assert len(fuels) > 0
    assert len(chances) > 0
    assert len(edges) > 0
    assert all(node['lat'] is not None and node['lon'] is not None for node in nodes)

    for edge in edges:
        assert edge['from_node_id'] in node_ids
        assert edge['to_node_id'] in node_ids
        assert edge['from_node_id'] != edge['to_node_id']


def test_board_preview_html_is_generated() -> None:
    preview_path = STATIC_DIR / 'generated' / 'board-preview.html'
    assert preview_path.exists()
    assert preview_path.stat().st_size > 0
