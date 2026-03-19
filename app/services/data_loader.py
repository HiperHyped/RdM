from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import DATA_DIR
from app.domain import ChanceCard, GameData, GameRules, PropertyCard, PropertyKind, Rate, ShipType


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_player_colors(data_dir: Path | None = None) -> list[dict[str, Any]]:
    base = data_dir or DATA_DIR
    return load_json(base / "player_colors.json")


def load_ai_v2_config(data_dir: Path | None = None) -> dict[str, Any]:
    base = data_dir or DATA_DIR
    return load_json(base / "ai_v2_presets.json")


def load_ai_v2_rules_config(data_dir: Path | None = None) -> dict[str, Any]:
    base = data_dir or DATA_DIR
    return load_json(base / "ai_v2_rules.json")


def load_ai_v2_rules_original_config(data_dir: Path | None = None) -> dict[str, Any]:
    base = data_dir or DATA_DIR
    return load_json(base / "ai_v2_rules_original.json")


def load_game_rules(data_dir: Path | None = None) -> GameRules:
    base = data_dir or DATA_DIR
    payload = load_json(base / "rules_v2.json")
    return GameRules(
        initial_cash=int(payload.get("initial_cash", 1960)),
        target_rounds=int(payload.get("target_rounds", 4)),
        bonus_per_early_round=int(payload.get("bonus_per_early_round", 50)),
        penalty_per_late_round=int(payload.get("penalty_per_late_round", 20)),
        single_active_contract_per_player=bool(payload.get("single_active_contract_per_player", True)),
        first_permission_free=bool(payload.get("first_permission_free", True)),
        extra_permission_cost=int(payload.get("extra_permission_cost", 2000)),
        origin_owner_commission_share=float(payload.get("origin_owner_commission_share", 0.5)),
        toll_owner_share=float(payload.get("toll_owner_share", 0.5)),
        freight_uses_multiplier_value_when_origin_owned=bool(
            payload.get("freight_uses_multiplier_value_when_origin_owned", True)
        ),
        monopoly_stay_uses_multiplier_times_region_size=bool(
            payload.get("monopoly_stay_uses_multiplier_times_region_size", True)
        ),
        monopoly_origin_doubles_freight=bool(payload.get("monopoly_origin_doubles_freight", True)),
    )


def _normalize_continents(payload: dict[str, Any]) -> tuple[dict[str, list[str]], dict[str, dict[str, str]]]:
    continents: dict[str, list[str]] = {}
    styles: dict[str, dict[str, str]] = {}

    for region, value in payload.items():
        if isinstance(value, list):
            continents[region] = value
            continue

        ports = list(value.get('ports', []))
        continents[region] = ports
        styles[region] = {
            'fill': str(value.get('fill', '#07b14d')),
            'text': str(value.get('text', '#edf6ff')),
        }

    return continents, styles


def load_game_data(data_dir: Path | None = None) -> GameData:
    base = data_dir or DATA_DIR
    properties_payload = load_json(base / "ports.json")
    distances_payload = load_json(base / "distances.json")
    continents_payload = load_json(base / "continents.json")
    ship_types_payload = load_json(base / "ship_types.json")
    cards_payload = load_json(base / "cards.json")
    coords_payload = load_json(base / "port_coordinates.json")

    coords_by_code = {item["code"]: item for item in coords_payload.get("ports", [])}
    continents, continent_styles = _normalize_continents(continents_payload)

    properties: dict[str, PropertyCard] = {}
    for item in properties_payload:
        rates: dict[ShipType, Rate] = {}
        for ship_key, rate_payload in item["rates"].items():
            rates[ShipType(ship_key)] = Rate(
                fee=int(rate_payload["fee"]),
                multiplier=int(rate_payload["multiplier"]),
            )

        coords = coords_by_code.get(item["code"], {})
        properties[item["code"]] = PropertyCard(
            code=item["code"],
            name=item["name"],
            country=item["country"],
            kind=PropertyKind(item["kind"]),
            purchase_price=int(item["purchase_price"]),
            rates=rates,
            continent=item["continent"],
            lat=float(coords["lat"]) if "lat" in coords else None,
            lon=float(coords["lon"]) if "lon" in coords else None,
        )

    ship_types = {ShipType(item["id"]): item["name_pt"] for item in ship_types_payload}
    cards = [
        ChanceCard(
            id=item["id"],
            title=item["title"],
            description=item["description"],
            effect_text=item["effect_text"],
            effect=item["effect"],
            order=int(item["order"]),
            category=str(item.get("category", "sorte")),
            accent=str(item.get("accent", "#18C43A")),
            text=str(item.get("text", "#FFFFFF")),
        )
        for item in cards_payload
    ]

    distances = {
        origin: {destination: int(value) for destination, value in row.items()}
        for origin, row in distances_payload.items()
    }

    return GameData(
        properties=properties,
        distances=distances,
        continents=continents,
        ship_types=ship_types,
        cards=cards,
        continent_styles=continent_styles,
    )
