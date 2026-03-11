from __future__ import annotations

from typing import Any

from app.domain import PropertyKind
from app.maptools.calibration import project_node_records
from app.maptools.repository import BoardWorkspaceRepository
from app.services.card_factory import build_chance_cards, build_freight_permission_cards, build_port_title_cards, build_toll_title_cards
from app.services.data_loader import load_game_data, load_game_rules, load_player_colors

RIVAL_NAMES = ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4', 'Jogador 5']

SHIP_MASKS = {
    'bulk': '/static/assets/ships/recolorable/bulk_mask.png',
    'container': '/static/assets/ships/recolorable/container_mask.png',
    'oil': '/static/assets/ships/recolorable/oil_mask.png',
    'gas': '/static/assets/ships/recolorable/gas_mask.png',
    'cruise': '/static/assets/ships/recolorable/cruise_mask.png',
    'cars': '/static/assets/ships/recolorable/cars_mask.png',
}

SHIP_FILL_MASKS = {
    'bulk': '/static/assets/ships/recolorable/bulk_fill_mask.png',
    'container': '/static/assets/ships/recolorable/container_fill_mask.png',
    'oil': '/static/assets/ships/recolorable/oil_fill_mask.png',
    'gas': '/static/assets/ships/recolorable/gas_fill_mask.png',
    'cruise': '/static/assets/ships/recolorable/cruise_fill_mask.png',
    'cars': '/static/assets/ships/recolorable/cars_fill_mask.png',
}

SHIP_SPRITES = {
    'bulk': {
        'blue': '/static/assets/ships/colored/bulk_blue.png',
        'yellow': '/static/assets/ships/colored/bulk_yellow.png',
        'green': '/static/assets/ships/colored/bulk_green.png',
        'red': '/static/assets/ships/colored/bulk_red.png',
        'orange': '/static/assets/ships/colored/bulk_orange.png',
        'purple': '/static/assets/ships/colored/bulk_purple.png',
    },
    'container': {
        'blue': '/static/assets/ships/colored/container_blue.png',
        'yellow': '/static/assets/ships/colored/container_yellow.png',
        'green': '/static/assets/ships/colored/container_green.png',
        'red': '/static/assets/ships/colored/container_red.png',
        'orange': '/static/assets/ships/colored/container_orange.png',
        'purple': '/static/assets/ships/colored/container_purple.png',
    },
    'oil': {
        'blue': '/static/assets/ships/colored/oil_blue.png',
        'yellow': '/static/assets/ships/colored/oil_yellow.png',
        'green': '/static/assets/ships/colored/oil_green.png',
        'red': '/static/assets/ships/colored/oil_red.png',
        'orange': '/static/assets/ships/colored/oil_orange.png',
        'purple': '/static/assets/ships/colored/oil_purple.png',
    },
    'gas': {
        'blue': '/static/assets/ships/colored/gas_blue.png',
        'yellow': '/static/assets/ships/colored/gas_yellow.png',
        'green': '/static/assets/ships/colored/gas_green.png',
        'red': '/static/assets/ships/colored/gas_red.png',
        'orange': '/static/assets/ships/colored/gas_orange.png',
        'purple': '/static/assets/ships/colored/gas_purple.png',
    },
    'cruise': {
        'blue': '/static/assets/ships/colored/cruise_blue.png',
        'yellow': '/static/assets/ships/colored/cruise_yellow.png',
        'green': '/static/assets/ships/colored/cruise_green.png',
        'red': '/static/assets/ships/colored/cruise_red.png',
        'orange': '/static/assets/ships/colored/cruise_orange.png',
        'purple': '/static/assets/ships/colored/cruise_purple.png',
    },
    'cars': {
        'blue': '/static/assets/ships/colored/cars_blue.png',
        'yellow': '/static/assets/ships/colored/cars_yellow.png',
        'green': '/static/assets/ships/colored/cars_green.png',
        'red': '/static/assets/ships/colored/cars_red.png',
        'orange': '/static/assets/ships/colored/cars_orange.png',
        'purple': '/static/assets/ships/colored/cars_purple.png',
    },
}

CARGO_ICONS = {
    'bulk': '/static/assets/cargo/bulk.png',
    'container': '/static/assets/cargo/container.png',
    'oil': '/static/assets/cargo/oil.png',
    'gas': '/static/assets/cargo/gas.png',
    'cruise': '/static/assets/cargo/cruise.png',
    'cars': '/static/assets/cargo/cars.png',
}


def _currency(value: int) -> str:
    return f'$ {value:,.0f}'.replace(',', '.')


def _resolve_setup(
    company_name: str | None,
    human_color_id: str | None,
    rival_count: int | None,
    player_colors: list[dict[str, Any]],
) -> tuple[str, str, int]:
    valid_color_ids = [item['id'] for item in player_colors]
    resolved_name = (company_name or '').strip() or 'Minha Companhia'
    resolved_color_id = human_color_id if human_color_id in valid_color_ids else player_colors[0]['id']
    resolved_rival_count = max(2, min(5, rival_count if rival_count is not None else 5))
    return resolved_name, resolved_color_id, resolved_rival_count


def _assign_colors(player_colors: list[dict[str, Any]], human_color_id: str, rival_count: int) -> dict[str, str]:
    remaining_color_ids = [item['id'] for item in player_colors if item['id'] != human_color_id]
    assignments = {'human': human_color_id}
    for index in range(rival_count):
        assignments[f'cpu-{index + 1}'] = remaining_color_ids[index]
    return assignments


def _serialize_property(card, continent_styles: dict[str, dict[str, str]]) -> dict[str, Any]:
    style = continent_styles.get(card.continent, {'fill': '#07b14d', 'text': '#edf6ff'})
    return {
        'code': card.code,
        'name': card.name,
        'kind': card.kind.value,
        'continent': card.continent,
        'country': card.country,
        'lat': card.lat,
        'lon': card.lon,
        'price': card.purchase_price,
        'fill': style['fill'],
        'text': style['text'],
    }


def _empty_player_record(
    *,
    player_id: str,
    name: str,
    color_id: str,
    color_hex: str,
    cash: int,
    is_human: bool,
) -> dict[str, Any]:
    return {
        'id': player_id,
        'name': name,
        'color_id': color_id,
        'color_hex': color_hex,
        'cash': cash,
        'cash_display': _currency(cash),
        'location_code': None,
        'location_label': '--',
        'board_node_id': None,
        'ship_type': None,
        'ship_type_label': '--',
        'ship_visible': False,
        'permissions': [],
        'active_permission_id': None,
        'active_permission_label': '--',
        'property_codes': [],
        'ports_owned': 0,
        'tolls_owned': 0,
        'status_label': 'aguardando primeiro turno',
        'active_contract': None,
        'purchase_policy': 'manual' if is_human else 'always',
        'is_human': is_human,
    }


def _build_initial_chance_deck(chance_cards: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        'draw_pile': [card['id'] for card in chance_cards],
        'discard_pile': [],
        'held_card_ids': [],
    }


def build_ui_bootstrap(
    company_name: str | None = None,
    human_color_id: str | None = None,
    rival_count: int | None = None,
) -> dict[str, Any]:
    data = load_game_data()
    rules = load_game_rules()
    player_colors = load_player_colors()
    resolved_name, resolved_color_id, resolved_rival_count = _resolve_setup(
        company_name,
        human_color_id,
        rival_count,
        player_colors,
    )
    color_meta = {item['id']: item for item in player_colors}
    color_assignments = _assign_colors(player_colors, resolved_color_id, resolved_rival_count)

    players = [
        _empty_player_record(
            player_id='human',
            name=resolved_name,
            color_id=color_assignments['human'],
            color_hex=color_meta[color_assignments['human']]['hex'],
            cash=rules.initial_cash,
            is_human=True,
        )
    ]

    for index in range(resolved_rival_count):
        rival_id = f'cpu-{index + 1}'
        players.append(
            _empty_player_record(
                player_id=rival_id,
                name=RIVAL_NAMES[index],
                color_id=color_assignments[rival_id],
                color_hex=color_meta[color_assignments[rival_id]]['hex'],
                cash=rules.initial_cash,
                is_human=False,
            )
        )

    workspace = BoardWorkspaceRepository()
    snapshot = workspace.load_snapshot()
    projected_nodes = project_node_records(snapshot.nodes, snapshot.calibration)
    properties = [_serialize_property(card, data.continent_styles) for card in data.properties.values()]
    chance_cards = build_chance_cards()
    chance_deck = _build_initial_chance_deck(chance_cards)

    human = players[0]
    rivals = players[1:]

    return {
        'title': 'Rei dos Mares',
        'player_colors': player_colors,
        'freight_permission_cards': build_freight_permission_cards(),
        'chance_cards': chance_cards,
        'chance_deck': chance_deck,
        'port_cards': build_port_title_cards(),
        'toll_cards': build_toll_title_cards(),
        'properties': properties,
        'distances': data.distances,
        'rules': {
            'initial_cash': rules.initial_cash,
            'target_rounds': rules.target_rounds,
            'bonus_per_early_round': rules.bonus_per_early_round,
            'penalty_per_late_round': rules.penalty_per_late_round,
            'origin_owner_commission_share': rules.origin_owner_commission_share,
            'toll_owner_share': rules.toll_owner_share,
            'freight_uses_multiplier_value_when_origin_owned': rules.freight_uses_multiplier_value_when_origin_owned,
            'monopoly_stay_uses_multiplier_times_region_size': rules.monopoly_stay_uses_multiplier_times_region_size,
            'monopoly_origin_doubles_freight': rules.monopoly_origin_doubles_freight,
            'mortgage_credit_ratio': 0.5,
            'mortgage_release_multiplier': 1.5,
            'extra_permission_cost': rules.extra_permission_cost,
        },
        'assets': {
            'ship_masks': SHIP_MASKS,
            'ship_fill_masks': SHIP_FILL_MASKS,
            'ship_sprites': SHIP_SPRITES,
            'cargo_icons': CARGO_ICONS,
        },
        'players': players,
        'setup_defaults': {
            'company_name': resolved_name,
            'human_color_id': resolved_color_id,
            'rival_count': resolved_rival_count,
        },
        'human_company': human,
        'active_contract': None,
        'session': {
            'turn_number': 1,
            'turn_label': 'Turno 01',
            'phase': 'Preparacao inicial',
            'active_player_id': 'human',
            'action_label': 'Sortear permissao de frete',
            'dice': [0, 0],
            'note': 'A partida comeca sem navios, sem contratos e sem porto de partida definido.',
        },
        'rivals': rivals,
        'capture_status': {
            'node_count': len(snapshot.nodes),
            'route_groups': len({node.route_id for node in snapshot.nodes if node.route_id}),
            'image_width': snapshot.calibration.image_width,
            'image_height': snapshot.calibration.image_height,
        },
        'board': {
            'nodes': [node.model_dump(mode='json') for node in snapshot.nodes],
            'projected_nodes': [node.model_dump(mode='json') for node in projected_nodes],
            'calibration': snapshot.calibration.model_dump(mode='json'),
            'source_image_url': snapshot.calibration.source_image_url,
        },
    }
