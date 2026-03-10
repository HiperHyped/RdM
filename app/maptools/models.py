from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


NodeKind = Literal['port', 'toll', 'route', 'fuel', 'chance']


class AnchorRecord(BaseModel):
    id: str
    label: str
    x: float
    y: float
    lat: float
    lon: float


class CalibrationConfig(BaseModel):
    image_width: int
    image_height: int
    source_image_url: str = '/static/assets/board-source-updated.png'
    lon_min: float = -180.0
    lon_max: float = 180.0
    lat_min: float = -90.0
    lat_max: float = 90.0
    anchors: list[AnchorRecord] = Field(default_factory=list)


class BoardNodeCreate(BaseModel):
    kind: NodeKind
    label: str = ''
    x: float
    y: float
    route_id: str | None = None
    order: int | None = None
    lat: float | None = None
    lon: float | None = None
    notes: str = ''


class BoardNodeRecord(BoardNodeCreate):
    id: str


class BoardEdgeRecord(BaseModel):
    id: str
    from_node_id: str
    to_node_id: str


class MapWorkspaceSnapshot(BaseModel):
    nodes: list[BoardNodeRecord]
    edges: list[BoardEdgeRecord]
    calibration: CalibrationConfig
