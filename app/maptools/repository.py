from __future__ import annotations

import json
import re
from pathlib import Path

from app.config import DATA_DIR
from app.maptools.models import BoardEdgeRecord, BoardNodeCreate, BoardNodeRecord, CalibrationConfig, MapWorkspaceSnapshot


def _slugify(text: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return slug or 'node'


class BoardWorkspaceRepository:
    def __init__(self, data_dir: Path | None = None) -> None:
        self.data_dir = data_dir or DATA_DIR
        self.nodes_path = self.data_dir / 'board_nodes.json'
        self.edges_path = self.data_dir / 'board_edges.json'
        self.calibration_path = self.data_dir / 'map_calibration.json'

    def load_snapshot(self) -> MapWorkspaceSnapshot:
        return MapWorkspaceSnapshot(
            nodes=self.load_nodes(),
            edges=self.load_edges(),
            calibration=self.load_calibration(),
        )

    def save_snapshot(self, snapshot: MapWorkspaceSnapshot) -> None:
        self.save_nodes(snapshot.nodes)
        self.save_edges(snapshot.edges)
        self.save_calibration(snapshot.calibration)

    def load_nodes(self) -> list[BoardNodeRecord]:
        payload = json.loads(self.nodes_path.read_text(encoding='utf-8'))
        return [BoardNodeRecord.model_validate(item) for item in payload]

    def save_nodes(self, nodes: list[BoardNodeRecord]) -> None:
        self.nodes_path.write_text(
            json.dumps([node.model_dump(mode='json') for node in nodes], indent=2, ensure_ascii=False),
            encoding='utf-8',
        )

    def create_node(self, node: BoardNodeCreate) -> BoardNodeRecord:
        nodes = self.load_nodes()
        slug = _slugify(node.label or node.kind)
        next_index = 1 + sum(1 for item in nodes if item.kind == node.kind)
        record = BoardNodeRecord(
            id=f'{node.kind}-{slug}-{next_index:03d}',
            **node.model_dump(mode='json'),
        )
        nodes.append(record)
        self.save_nodes(nodes)
        return record

    def delete_node(self, node_id: str) -> bool:
        nodes = self.load_nodes()
        filtered = [node for node in nodes if node.id != node_id]
        if len(filtered) == len(nodes):
            return False
        self.save_nodes(filtered)
        return True

    def load_edges(self) -> list[BoardEdgeRecord]:
        payload = json.loads(self.edges_path.read_text(encoding='utf-8'))
        return [BoardEdgeRecord.model_validate(item) for item in payload]

    def save_edges(self, edges: list[BoardEdgeRecord]) -> None:
        self.edges_path.write_text(
            json.dumps([edge.model_dump(mode='json') for edge in edges], indent=2, ensure_ascii=False),
            encoding='utf-8',
        )

    def load_calibration(self) -> CalibrationConfig:
        payload = json.loads(self.calibration_path.read_text(encoding='utf-8'))
        return CalibrationConfig.model_validate(payload)

    def save_calibration(self, calibration: CalibrationConfig) -> CalibrationConfig:
        self.calibration_path.write_text(
            json.dumps(calibration.model_dump(mode='json'), indent=2, ensure_ascii=False),
            encoding='utf-8',
        )
        return calibration
