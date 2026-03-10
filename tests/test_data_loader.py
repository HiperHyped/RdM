from __future__ import annotations

from app.domain import PropertyKind
from app.services import load_game_data, load_player_colors


def test_game_data_uses_local_ports_file_and_merges_geo_coordinates() -> None:
    data = load_game_data()

    assert len(data.properties) == 36
    assert data.properties["RIO"].kind == PropertyKind.PORT
    assert data.properties["CAP"].kind == PropertyKind.TOLL
    assert data.properties["RIO"].lat is not None
    assert data.properties["TOK"].lon is not None
    assert data.continent_styles["AF"] == {
        "fill": "#1db159",
        "text": "#edf6ff",
    }
    assert data.continents["AF"] == ["DAK", "DAR", "LAG"]
    assert data.cards[0].category == "sorte"
    assert data.cards[0].accent == "#18C43A"
    assert data.cards[-1].category == "reves"


def test_player_colors_match_new_requested_palette() -> None:
    colors = load_player_colors()
    assert [item["id"] for item in colors] == [
        "blue",
        "yellow",
        "green",
        "red",
        "orange",
        "purple",
    ]
