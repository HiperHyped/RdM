from __future__ import annotations

from app.maptools import BoardGraph, BoardWorkspaceRepository


def test_board_graph_finds_property_nodes_and_neighbors() -> None:
    snapshot = BoardWorkspaceRepository().load_snapshot()
    graph = BoardGraph(snapshot.nodes, snapshot.edges)

    rio = graph.find_property_node('RIO')
    cap = graph.find_property_node('CAP')

    assert rio.kind == 'port'
    assert cap.kind == 'toll'
    assert len(graph.neighbors(rio.id)) > 0
    assert len(graph.neighbors(cap.id)) > 0


def test_board_graph_shortest_path_between_properties() -> None:
    snapshot = BoardWorkspaceRepository().load_snapshot()
    graph = BoardGraph(snapshot.nodes, snapshot.edges)

    path = graph.shortest_path_between_properties('RIO', 'CAP')

    assert path.node_ids[0] == 'rio'
    assert path.node_ids[-1] == 'cap'
    assert path.steps > 0
