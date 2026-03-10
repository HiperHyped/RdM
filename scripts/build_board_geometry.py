from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import plotly.graph_objects as go
from PIL import Image
from scipy import ndimage as ndi
from scipy.cluster.hierarchy import fclusterdata
from skimage.color import rgb2gray
from skimage.feature import canny
from skimage.graph import route_through_array
from skimage.transform import hough_circle, hough_circle_peaks

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / 'data'
STATIC_DIR = ROOT_DIR / 'app' / 'static'
ASSET_PATH = STATIC_DIR / 'assets' / 'board-source-updated.png'
PREVIEW_PATH = STATIC_DIR / 'generated' / 'board-preview.html'
OLD_DATA_DIR = Path(r'C:\Users\Haroldo Duraes\Desktop\GOvGO\Rei dos Mares\v3\data')

BOARD_TITLE_MASKS = [
    (slice(0, 200), slice(750, 1750)),
    (slice(0, 250), slice(1900, 2526)),
    (slice(1450, 1786), slice(0, 2526)),
    (slice(0, 200), slice(0, 450)),
]

ROUTE_GUIDES: dict[tuple[str, str], list[Any]] = {
    ('CAP', 'SIN'): [(1814.0, 1212.0)],
}

WRAP_SEGMENTS: dict[tuple[str, str], list[tuple[Any, Any]]] = {
    ('TOK', 'VAN'): [('TOK', (2448.0, 540.0)), ((102.0, 510.0), 'VAN')],
    ('MAN', 'MAZ'): [('MAN', (2452.0, 790.0)), ((102.0, 777.0), 'MAZ')],
    ('USH', 'AUC'): [('USH', (102.0, 1292.0)), ((2448.0, 1290.0), 'AUC')],
}

CLUSTER_DISTANCE = 18.0
PROPERTY_RADIUS = 18.0
GUIDE_RADIUS = 14.0


@dataclass(frozen=True)
class Anchor:
    code: str
    x: float
    y: float
    lat: float
    lon: float
    kind: str


@dataclass
class RawIntermediateNode:
    route_key: str
    order: int
    kind: str
    x: float
    y: float
    radius: int | None
    score: float | None


@dataclass
class CanonicalIntermediateNode:
    id: str
    kind: str
    x: float
    y: float
    memberships: list[tuple[str, int]]
    notes: str


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding='utf-8'))


def scale_property_pixels(image_width: int, image_height: int) -> dict[str, tuple[float, float]]:
    layout = load_json(OLD_DATA_DIR / 'board_layout.json')
    old_w = float(layout['board_size']['width'])
    old_h = float(layout['board_size']['height'])
    scale_x = image_width / old_w
    scale_y = image_height / old_h
    return {
        code: (coords[0] * scale_x, coords[1] * scale_y)
        for code, coords in layout['port_coords'].items()
    }


def build_anchors(property_pixels: dict[str, tuple[float, float]]) -> list[Anchor]:
    property_cards = load_json(DATA_DIR / 'ports.json')
    coords = load_json(DATA_DIR / 'port_coordinates.json')['ports']
    coords_by_code = {item['code']: item for item in coords}
    kind_by_code = {item['code']: item['kind'] for item in property_cards}
    anchors: list[Anchor] = []
    for code, (x, y) in property_pixels.items():
        geo = coords_by_code[code]
        anchors.append(
            Anchor(
                code=code,
                x=float(x),
                y=float(y),
                lat=float(geo['lat']),
                lon=float(geo['lon']),
                kind=str(kind_by_code[code]),
            )
        )
    return anchors


def _tps_kernel(distances: np.ndarray) -> np.ndarray:
    safe = np.where(distances > 0, distances, 1.0)
    values = (safe ** 2) * np.log(safe)
    values[distances == 0] = 0.0
    return values


def fit_projection(anchors: list[Anchor]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    points = np.array([[anchor.x, anchor.y] for anchor in anchors], dtype=float)
    lat_targets = np.array([anchor.lat for anchor in anchors], dtype=float)
    lon_targets = np.array([anchor.lon for anchor in anchors], dtype=float)

    pairwise = np.linalg.norm(points[:, None, :] - points[None, :, :], axis=2)
    kernel = _tps_kernel(pairwise)
    affine = np.column_stack([np.ones(len(points)), points])
    system = np.block(
        [
            [kernel, affine],
            [affine.T, np.zeros((3, 3), dtype=float)],
        ]
    )

    lat_rhs = np.concatenate([lat_targets, np.zeros(3, dtype=float)])
    lon_rhs = np.concatenate([lon_targets, np.zeros(3, dtype=float)])
    lat_solution = np.linalg.solve(system, lat_rhs)
    lon_solution = np.linalg.solve(system, lon_rhs)

    weights_lat = lat_solution[: len(points)]
    affine_lat = lat_solution[len(points) :]
    weights_lon = lon_solution[: len(points)]
    affine_lon = lon_solution[len(points) :]
    return points, weights_lat, affine_lat, weights_lon, affine_lon


def project_pixel(x: float, y: float, points: np.ndarray, weights_lat: np.ndarray, affine_lat: np.ndarray, weights_lon: np.ndarray, affine_lon: np.ndarray) -> tuple[float, float]:
    query = np.array([x, y], dtype=float)
    distances = np.linalg.norm(points - query, axis=1)
    kernel = _tps_kernel(distances)
    lat = float((kernel @ weights_lat) + affine_lat[0] + (affine_lat[1] * x) + (affine_lat[2] * y))
    lon = float((kernel @ weights_lon) + affine_lon[0] + (affine_lon[1] * x) + (affine_lon[2] * y))
    lat = max(-89.9, min(89.9, lat))
    if lon < -180.0:
        lon = -180.0 + ((lon + 180.0) % 360.0)
    elif lon > 180.0:
        lon = -180.0 + ((lon + 180.0) % 360.0)
    return lat, lon


def build_allowed_mask(image_rgb: np.ndarray, property_pixels: dict[str, tuple[float, float]]) -> np.ndarray:
    dark_mask = image_rgb.max(axis=2) < 120
    for row_slice, col_slice in BOARD_TITLE_MASKS:
        dark_mask[row_slice, col_slice] = False

    labels, _ = ndi.label(dark_mask)
    counts = np.bincount(labels.ravel())
    counts[0] = 0
    largest_component = int(counts.argmax())
    allowed = labels == largest_component

    extra_points = list(property_pixels.values())
    for route_guides in ROUTE_GUIDES.values():
        extra_points.extend(point for point in route_guides if isinstance(point, tuple))
    for segments in WRAP_SEGMENTS.values():
        for start, end in segments:
            if isinstance(start, tuple):
                extra_points.append(start)
            if isinstance(end, tuple):
                extra_points.append(end)

    height, width = allowed.shape
    yy, xx = np.ogrid[:height, :width]
    for x, y in extra_points:
        radius = PROPERTY_RADIUS if (x, y) in property_pixels.values() else GUIDE_RADIUS
        allowed |= (xx - x) ** 2 + (yy - y) ** 2 <= radius ** 2

    return allowed


def resolve_ref(ref: Any, property_pixels: dict[str, tuple[float, float]]) -> tuple[float, float]:
    if isinstance(ref, str):
        return property_pixels[ref]
    return float(ref[0]), float(ref[1])


def shortest_path(cost_map: np.ndarray, start: tuple[float, float], end: tuple[float, float]) -> list[tuple[float, float]]:
    start_yx = (int(round(start[1])), int(round(start[0])))
    end_yx = (int(round(end[1])), int(round(end[0])))
    path, _ = route_through_array(cost_map, start_yx, end_yx, fully_connected=True, geometric=False)
    return [(float(x), float(y)) for y, x in path]


def concat_segments(segments: list[list[tuple[float, float]]]) -> list[tuple[float, float]]:
    merged: list[tuple[float, float]] = []
    for segment in segments:
        if not segment:
            continue
        if not merged:
            merged.extend(segment)
        else:
            merged.extend(segment[1:])
    return merged


def build_route_polyline(
    origin: str,
    destination: str,
    cost_map: np.ndarray,
    property_pixels: dict[str, tuple[float, float]],
) -> tuple[list[tuple[float, float]], list[list[tuple[float, float]]]]:
    route_key = (origin, destination)
    if route_key in WRAP_SEGMENTS:
        visible_segments = []
        for start_ref, end_ref in WRAP_SEGMENTS[route_key]:
            start = resolve_ref(start_ref, property_pixels)
            end = resolve_ref(end_ref, property_pixels)
            visible_segments.append(shortest_path(cost_map, start, end))
        return concat_segments(visible_segments), visible_segments

    refs: list[Any] = [origin]
    refs.extend(ROUTE_GUIDES.get(route_key, []))
    refs.append(destination)
    visible_segments = []
    for left_ref, right_ref in zip(refs, refs[1:]):
        visible_segments.append(
            shortest_path(
                cost_map,
                resolve_ref(left_ref, property_pixels),
                resolve_ref(right_ref, property_pixels),
            )
        )
    return concat_segments(visible_segments), visible_segments


def cumulative_lengths(points: list[tuple[float, float]]) -> list[float]:
    values = [0.0]
    for left, right in zip(points, points[1:]):
        values.append(values[-1] + math.dist(left, right))
    return values


def interpolate_point(
    points: list[tuple[float, float]],
    lengths: list[float],
    target: float,
) -> tuple[float, float]:
    if target <= 0.0:
        return points[0]
    if target >= lengths[-1]:
        return points[-1]
    for index in range(1, len(lengths)):
        if lengths[index] >= target:
            left_length = lengths[index - 1]
            right_length = lengths[index]
            if right_length == left_length:
                return points[index]
            ratio = (target - left_length) / (right_length - left_length)
            x0, y0 = points[index - 1]
            x1, y1 = points[index]
            return (x0 + ((x1 - x0) * ratio), y0 + ((y1 - y0) * ratio))
    return points[-1]


def local_hough(gray_image: np.ndarray, x: float, y: float) -> tuple[str, float, float, int | None, float | None]:
    pad = 26
    height, width = gray_image.shape
    x0 = max(0, int(round(x)) - pad)
    y0 = max(0, int(round(y)) - pad)
    x1 = min(width, int(round(x)) + pad + 1)
    y1 = min(height, int(round(y)) + pad + 1)
    patch = gray_image[y0:y1, x0:x1]
    edges = canny(patch, sigma=1.0, low_threshold=0.03, high_threshold=0.15)
    radii = np.arange(5, 16, 1)
    response = hough_circle(edges, radii)
    accums, centers_x, centers_y, detected_radii = hough_circle_peaks(
        response,
        radii,
        total_num_peaks=12,
        min_xdistance=4,
        min_ydistance=4,
        normalize=True,
    )
    if len(detected_radii) == 0:
        return 'fuel', x, y, None, None

    peaks = [
        (float(accum), float(center_x + x0), float(center_y + y0), int(radius))
        for accum, center_x, center_y, radius in zip(accums, centers_x, centers_y, detected_radii)
    ]
    large_peaks = [peak for peak in peaks if peak[3] >= 8 and peak[0] >= 0.4]
    if large_peaks:
        score, center_x, center_y, radius = max(large_peaks, key=lambda item: (item[3], item[0]))
        return 'chance', center_x, center_y, radius, score

    score, center_x, center_y, radius = max(peaks, key=lambda item: (item[0], -item[3]))
    return 'fuel', center_x, center_y, radius, score


def sample_route_nodes(
    route_key: str,
    steps: int,
    route_polyline: list[tuple[float, float]],
    gray_image: np.ndarray,
) -> list[RawIntermediateNode]:
    if steps <= 1:
        return []
    route_lengths = cumulative_lengths(route_polyline)
    total_length = route_lengths[-1]
    nodes: list[RawIntermediateNode] = []
    for order in range(1, steps):
        target = total_length * (order / steps)
        approx_x, approx_y = interpolate_point(route_polyline, route_lengths, target)
        kind, center_x, center_y, radius, score = local_hough(gray_image, approx_x, approx_y)
        nodes.append(
            RawIntermediateNode(
                route_key=route_key,
                order=order,
                kind=kind,
                x=center_x,
                y=center_y,
                radius=radius,
                score=score,
            )
        )
    return nodes


def cluster_intermediate_nodes(raw_nodes: list[RawIntermediateNode]) -> tuple[list[CanonicalIntermediateNode], dict[int, str]]:
    if not raw_nodes:
        return [], {}

    points = np.array([[node.x, node.y] for node in raw_nodes], dtype=float)
    labels = fclusterdata(points, t=CLUSTER_DISTANCE, criterion='distance', method='single')

    grouped: dict[int, list[tuple[int, RawIntermediateNode]]] = defaultdict(list)
    for raw_index, (label, raw_node) in enumerate(zip(labels, raw_nodes)):
        grouped[int(label)].append((raw_index, raw_node))

    canonical_nodes: list[CanonicalIntermediateNode] = []
    raw_index_to_id: dict[int, str] = {}
    fuel_index = 1
    chance_index = 1

    for label in sorted(grouped):
        items = grouped[label]
        xs = [raw_node.x for _, raw_node in items]
        ys = [raw_node.y for _, raw_node in items]
        kinds = [raw_node.kind for _, raw_node in items]
        memberships = sorted({(raw_node.route_key, raw_node.order) for _, raw_node in items})
        scores = [raw_node.score or 0.0 for _, raw_node in items]
        radii = [raw_node.radius or 0 for _, raw_node in items]

        if Counter(kinds).most_common(1)[0][0] == 'chance' or max(radii) >= 8:
            kind = 'chance'
            node_id = f'chance-{chance_index:03d}'
            chance_index += 1
        else:
            kind = 'fuel'
            node_id = f'fuel-{fuel_index:03d}'
            fuel_index += 1

        route_notes = ', '.join(f'{route_key}:{order}' for route_key, order in memberships)
        note_parts = [f'routes={route_notes}']
        if any(score > 0 for score in scores):
            note_parts.append(f'detect={max(scores):.3f}')
        canonical = CanonicalIntermediateNode(
            id=node_id,
            kind=kind,
            x=float(np.mean(xs)),
            y=float(np.mean(ys)),
            memberships=memberships,
            notes='; '.join(note_parts),
        )
        canonical_nodes.append(canonical)
        for raw_index, _ in items:
            raw_index_to_id[raw_index] = node_id

    return canonical_nodes, raw_index_to_id


def build_property_nodes(anchors: list[Anchor]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for anchor in anchors:
        records.append(
            {
                'id': anchor.code.lower(),
                'kind': anchor.kind,
                'label': anchor.code,
                'x': round(anchor.x, 2),
                'y': round(anchor.y, 2),
                'route_id': None,
                'order': None,
                'lat': anchor.lat,
                'lon': anchor.lon,
                'notes': 'property-anchor',
            }
        )
    return records


def build_route_memberships(
    routes: list[dict[str, Any]],
    raw_nodes: list[RawIntermediateNode],
    raw_index_to_id: dict[int, str],
) -> dict[str, list[str]]:
    by_route: dict[str, list[tuple[int, str]]] = defaultdict(list)
    for raw_index, raw_node in enumerate(raw_nodes):
        by_route[raw_node.route_key].append((raw_node.order, raw_index_to_id[raw_index]))

    sequences: dict[str, list[str]] = {}
    for route in routes:
        route_key = f"{route['from'].lower()}-{route['to'].lower()}"
        ordered = [node_id for _, node_id in sorted(by_route.get(route_key, []), key=lambda item: item[0])]
        sequences[route_key] = [route['from'].lower(), *ordered, route['to'].lower()]
    return sequences


def build_intermediate_records(
    canonical_nodes: list[CanonicalIntermediateNode],
    projection: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray],
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for canonical in canonical_nodes:
        lat, lon = project_pixel(canonical.x, canonical.y, *projection)
        route_id = canonical.memberships[0][0] if len(canonical.memberships) == 1 else None
        order = canonical.memberships[0][1] if len(canonical.memberships) == 1 else None
        records.append(
            {
                'id': canonical.id,
                'kind': canonical.kind,
                'label': '',
                'x': round(canonical.x, 2),
                'y': round(canonical.y, 2),
                'route_id': route_id,
                'order': order,
                'lat': round(lat, 6),
                'lon': round(lon, 6),
                'notes': canonical.notes,
            }
        )
    return sorted(records, key=lambda item: item['id'])


def build_edges(route_sequences: dict[str, list[str]]) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    index = 1
    seen: set[tuple[str, str]] = set()
    for route_key, sequence in route_sequences.items():
        for order, (left_id, right_id) in enumerate(zip(sequence, sequence[1:]), start=1):
            pair = (left_id, right_id)
            if pair in seen:
                continue
            seen.add(pair)
            records.append(
                {
                    'id': f'edge-{index:03d}',
                    'from_node_id': left_id,
                    'to_node_id': right_id,
                }
            )
            index += 1
    return records


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')


def build_preview(nodes: list[dict[str, Any]], edges: list[dict[str, str]], route_sequences: dict[str, list[str]]) -> None:
    node_by_id = {node['id']: node for node in nodes}
    edge_lons: list[float | None] = []
    edge_lats: list[float | None] = []

    for edge in edges:
        left = node_by_id[edge['from_node_id']]
        right = node_by_id[edge['to_node_id']]
        left_lon = float(left['lon'])
        right_lon = float(right['lon'])
        left_lat = float(left['lat'])
        right_lat = float(right['lat'])
        if abs(left_lon - right_lon) > 300 or abs(float(left['x']) - float(right['x'])) > 1800:
            left_boundary_lon = 179.5 if left_lon >= 0 else -179.5
            right_boundary_lon = 179.5 if right_lon >= 0 else -179.5
            edge_lons.extend([left_lon, left_boundary_lon, None, right_boundary_lon, right_lon, None])
            edge_lats.extend([left_lat, left_lat, None, right_lat, right_lat, None])
            continue
        edge_lons.extend([left_lon, right_lon, None])
        edge_lats.extend([left_lat, right_lat, None])

    def typed(kind: str) -> list[dict[str, Any]]:
        return [node for node in nodes if node['kind'] == kind]

    figure = go.Figure()
    figure.add_trace(
        go.Scattergeo(
            lon=edge_lons,
            lat=edge_lats,
            mode='lines',
            line={'width': 2, 'color': 'rgba(248, 185, 59, 0.5)'},
            hoverinfo='skip',
            name='Rotas',
        )
    )
    for kind, color, size, symbol, label in [
        ('port', '#ffffff', 10, 'circle', 'Portos'),
        ('toll', '#f4b400', 11, 'diamond', 'Pedágios'),
        ('fuel', '#23b5d3', 7, 'circle', 'Abastecimento'),
        ('chance', '#111827', 9, 'circle-open', 'Sorte/Revés'),
    ]:
        subset = typed(kind)
        if not subset:
            continue
        figure.add_trace(
            go.Scattergeo(
                lon=[node['lon'] for node in subset],
                lat=[node['lat'] for node in subset],
                text=[node['label'] or node['id'] for node in subset],
                customdata=[node['notes'] for node in subset],
                mode='markers+text' if kind in {'port', 'toll'} else 'markers',
                textposition='top center',
                marker={
                    'size': size,
                    'color': color,
                    'symbol': symbol,
                    'line': {'width': 1.2, 'color': '#0f172a'},
                },
                name=label,
                hovertemplate='%{text}<br>%{customdata}<extra></extra>',
            )
        )

    figure.update_layout(
        paper_bgcolor='#03111f',
        plot_bgcolor='#03111f',
        margin={'l': 0, 'r': 0, 't': 0, 'b': 0},
        legend={'orientation': 'h', 'y': -0.03, 'x': 0, 'font': {'color': '#d7e6f5'}},
        geo={
            'scope': 'world',
            'projection': {'type': 'natural earth'},
            'showland': True,
            'landcolor': '#a5b4c4',
            'showocean': True,
            'oceancolor': '#0b7bc0',
            'showcountries': True,
            'countrycolor': '#8ea0b7',
            'bgcolor': '#03111f',
        },
        annotations=[
            {
                'text': f"{len(nodes)} nós | {len(edges)} arestas | {len(route_sequences)} rotas-base",
                'xref': 'paper',
                'yref': 'paper',
                'x': 0.01,
                'y': 0.99,
                'showarrow': False,
                'font': {'size': 14, 'color': '#d7e6f5'},
                'align': 'left',
            }
        ],
    )

    PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
    figure.write_html(PREVIEW_PATH, include_plotlyjs=True, full_html=True)


def main() -> None:
    image_rgb = np.array(Image.open(ASSET_PATH).convert('RGB'))
    gray_image = rgb2gray(image_rgb)
    image_height, image_width = image_rgb.shape[0], image_rgb.shape[1]

    property_pixels = scale_property_pixels(image_width, image_height)
    anchors = build_anchors(property_pixels)
    projection = fit_projection(anchors)

    allowed_mask = build_allowed_mask(image_rgb, property_pixels)
    cost_map = np.where(allowed_mask, 1.0, 200.0)

    routes = load_json(OLD_DATA_DIR / 'routes.json')['routes']
    raw_nodes: list[RawIntermediateNode] = []
    for route in routes:
        route_key = f"{route['from'].lower()}-{route['to'].lower()}"
        polyline, _segments = build_route_polyline(route['from'], route['to'], cost_map, property_pixels)
        raw_nodes.extend(sample_route_nodes(route_key, int(route['steps']), polyline, gray_image))

    canonical_nodes, raw_index_to_id = cluster_intermediate_nodes(raw_nodes)
    property_records = build_property_nodes(anchors)
    intermediate_records = build_intermediate_records(canonical_nodes, projection)
    all_nodes = sorted([*property_records, *intermediate_records], key=lambda item: item['id'])

    calibration_payload = {
        'image_width': image_width,
        'image_height': image_height,
        'source_image_url': '/static/assets/board-source-updated.png',
        'lon_min': -180.0,
        'lon_max': 180.0,
        'lat_min': -90.0,
        'lat_max': 90.0,
        'anchors': [
            {
                'id': anchor.code.lower(),
                'label': anchor.code,
                'x': round(anchor.x, 2),
                'y': round(anchor.y, 2),
                'lat': anchor.lat,
                'lon': anchor.lon,
            }
            for anchor in anchors
        ],
    }

    route_sequences = build_route_memberships(routes, raw_nodes, raw_index_to_id)
    edges = build_edges(route_sequences)

    write_json(DATA_DIR / 'board_nodes.json', all_nodes)
    write_json(DATA_DIR / 'board_edges.json', edges)
    write_json(DATA_DIR / 'map_calibration.json', calibration_payload)
    build_preview(all_nodes, edges, route_sequences)

    print('board_nodes', len(all_nodes))
    print('board_edges', len(edges))
    print('fuel_nodes', sum(1 for node in all_nodes if node['kind'] == 'fuel'))
    print('chance_nodes', sum(1 for node in all_nodes if node['kind'] == 'chance'))
    print('port_nodes', sum(1 for node in all_nodes if node['kind'] == 'port'))
    print('toll_nodes', sum(1 for node in all_nodes if node['kind'] == 'toll'))
    print('preview', PREVIEW_PATH)


if __name__ == '__main__':
    main()





