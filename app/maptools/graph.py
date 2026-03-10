from __future__ import annotations

from collections import deque
from dataclasses import dataclass

from app.maptools.models import BoardEdgeRecord, BoardNodeRecord


@dataclass(frozen=True)
class BoardPath:
    node_ids: list[str]

    @property
    def steps(self) -> int:
        return max(0, len(self.node_ids) - 1)


class BoardGraph:
    def __init__(self, nodes: list[BoardNodeRecord], edges: list[BoardEdgeRecord]) -> None:
        self.nodes = nodes
        self.edges = edges
        self.nodes_by_id = {node.id: node for node in nodes}
        self.property_nodes_by_code = {
            (node.label or '').upper(): node
            for node in nodes
            if node.kind in {'port', 'toll'} and node.label
        }
        self.adjacency: dict[str, list[str]] = {node.id: [] for node in nodes}
        for edge in edges:
            if edge.from_node_id not in self.nodes_by_id or edge.to_node_id not in self.nodes_by_id:
                continue
            self.adjacency[edge.from_node_id].append(edge.to_node_id)
            self.adjacency[edge.to_node_id].append(edge.from_node_id)

    def get_node(self, node_id: str) -> BoardNodeRecord:
        return self.nodes_by_id[node_id]

    def neighbors(self, node_id: str) -> list[BoardNodeRecord]:
        return [self.nodes_by_id[neighbor_id] for neighbor_id in self.adjacency.get(node_id, [])]

    def find_property_node(self, code: str) -> BoardNodeRecord:
        return self.property_nodes_by_code[code.upper()]

    def shortest_path(self, start_node_id: str, end_node_id: str) -> BoardPath:
        if start_node_id == end_node_id:
            return BoardPath([start_node_id])

        queue: deque[str] = deque([start_node_id])
        visited = {start_node_id}
        parents: dict[str, str | None] = {start_node_id: None}

        while queue:
            current = queue.popleft()
            for neighbor in self.adjacency.get(current, []):
                if neighbor in visited:
                    continue
                visited.add(neighbor)
                parents[neighbor] = current
                if neighbor == end_node_id:
                    return self._rebuild_path(parents, end_node_id)
                queue.append(neighbor)

        raise ValueError(f'No path between {start_node_id} and {end_node_id}.')

    def shortest_path_between_properties(self, start_code: str, end_code: str) -> BoardPath:
        start = self.find_property_node(start_code)
        end = self.find_property_node(end_code)
        return self.shortest_path(start.id, end.id)

    def _rebuild_path(self, parents: dict[str, str | None], end_node_id: str) -> BoardPath:
        cursor: str | None = end_node_id
        node_ids: list[str] = []
        while cursor is not None:
            node_ids.append(cursor)
            cursor = parents.get(cursor)
        node_ids.reverse()
        return BoardPath(node_ids)
