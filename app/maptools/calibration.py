from __future__ import annotations

from functools import lru_cache
from typing import Iterable

import numpy as np

from app.maptools.models import AnchorRecord, BoardNodeRecord, CalibrationConfig


def _tps_kernel(distances: np.ndarray) -> np.ndarray:
    safe = np.where(distances > 0, distances, 1.0)
    values = (safe ** 2) * np.log(safe)
    values[distances == 0] = 0.0
    return values


def _solve_tps(points: np.ndarray, values: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    pairwise = np.linalg.norm(points[:, None, :] - points[None, :, :], axis=2)
    kernel = _tps_kernel(pairwise)
    affine = np.column_stack([np.ones(len(points)), points])
    system = np.block(
        [
            [kernel, affine],
            [affine.T, np.zeros((points.shape[1] + 1, points.shape[1] + 1), dtype=float)],
        ]
    )
    rhs = np.concatenate([values, np.zeros(points.shape[1] + 1, dtype=float)])
    solution = np.linalg.solve(system, rhs)
    weights = solution[: len(points)]
    affine_terms = solution[len(points) :]
    return points, weights, affine_terms


def _evaluate_tps(query: np.ndarray, points: np.ndarray, weights: np.ndarray, affine: np.ndarray) -> float:
    distances = np.linalg.norm(points - query, axis=1)
    kernel = _tps_kernel(distances)
    linear = affine[0] + np.dot(affine[1:], query)
    return float((kernel @ weights) + linear)


@lru_cache(maxsize=32)
def _fit_projection(anchor_payload: tuple[tuple[float, float, float, float], ...]) -> tuple[tuple[np.ndarray, np.ndarray, np.ndarray], tuple[np.ndarray, np.ndarray, np.ndarray]] | None:
    if len(anchor_payload) < 3:
        return None

    pixel_points = np.array([[x, y] for x, y, _lat, _lon in anchor_payload], dtype=float)
    lat_targets = np.array([lat for _x, _y, lat, _lon in anchor_payload], dtype=float)
    lon_targets = np.array([lon for _x, _y, _lat, lon in anchor_payload], dtype=float)
    return _solve_tps(pixel_points, lat_targets), _solve_tps(pixel_points, lon_targets)


@lru_cache(maxsize=32)
def _fit_inverse_projection(anchor_payload: tuple[tuple[float, float, float, float], ...]) -> tuple[tuple[np.ndarray, np.ndarray, np.ndarray], tuple[np.ndarray, np.ndarray, np.ndarray]] | None:
    if len(anchor_payload) < 3:
        return None

    geo_points = np.array([[lat, lon] for _x, _y, lat, lon in anchor_payload], dtype=float)
    x_targets = np.array([x for x, _y, _lat, _lon in anchor_payload], dtype=float)
    y_targets = np.array([y for _x, y, _lat, _lon in anchor_payload], dtype=float)
    return _solve_tps(geo_points, x_targets), _solve_tps(geo_points, y_targets)


def _anchor_payload(anchors: Iterable[AnchorRecord]) -> tuple[tuple[float, float, float, float], ...]:
    return tuple((anchor.x, anchor.y, anchor.lat, anchor.lon) for anchor in anchors)


def pixel_to_geo(x: float, y: float, calibration: CalibrationConfig) -> tuple[float, float]:
    payload = _anchor_payload(calibration.anchors)
    fit = _fit_projection(payload)
    if fit is not None:
        lat_model, lon_model = fit
        query = np.array([x, y], dtype=float)
        lat = _evaluate_tps(query, *lat_model)
        lon = _evaluate_tps(query, *lon_model)
        lat = max(-89.9, min(89.9, lat))
        if lon < -180.0:
            lon = -180.0 + ((lon + 180.0) % 360.0)
        elif lon > 180.0:
            lon = -180.0 + ((lon + 180.0) % 360.0)
        return lat, lon

    lon_span = calibration.lon_max - calibration.lon_min
    lat_span = calibration.lat_max - calibration.lat_min
    lon = calibration.lon_min + (x / calibration.image_width) * lon_span
    lat = calibration.lat_max - (y / calibration.image_height) * lat_span
    return lat, lon


def geo_to_pixel(lat: float, lon: float, calibration: CalibrationConfig) -> tuple[float, float]:
    payload = _anchor_payload(calibration.anchors)
    fit = _fit_inverse_projection(payload)
    if fit is not None:
        x_model, y_model = fit
        query = np.array([lat, lon], dtype=float)
        x = _evaluate_tps(query, *x_model)
        y = _evaluate_tps(query, *y_model)
        x = max(0.0, min(float(calibration.image_width), x))
        y = max(0.0, min(float(calibration.image_height), y))
        return x, y

    lon_span = calibration.lon_max - calibration.lon_min
    lat_span = calibration.lat_max - calibration.lat_min
    x = ((lon - calibration.lon_min) / lon_span) * calibration.image_width
    y = ((calibration.lat_max - lat) / lat_span) * calibration.image_height
    return x, y


def project_node_records(
    nodes: list[BoardNodeRecord],
    calibration: CalibrationConfig,
) -> list[BoardNodeRecord]:
    projected: list[BoardNodeRecord] = []
    for node in nodes:
        lat = node.lat
        lon = node.lon
        if lat is None or lon is None:
            lat, lon = pixel_to_geo(node.x, node.y, calibration)
        projected.append(node.model_copy(update={'lat': lat, 'lon': lon}))
    return projected
