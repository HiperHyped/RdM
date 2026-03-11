from __future__ import annotations

from typing import Any

from app.domain import PropertyKind, ShipType
from app.services.data_loader import load_game_data

PORT_TITLE_ORDER = [
    ShipType.BULK,
    ShipType.CONTAINER,
    ShipType.OIL,
    ShipType.GAS,
    ShipType.CRUISE,
    ShipType.CARS,
]


CARGO_LABELS = {
    ShipType.BULK: 'Granéis',
    ShipType.CONTAINER: 'Container',
    ShipType.OIL: 'Petróleo',
    ShipType.GAS: 'Gás',
    ShipType.CRUISE: 'Passageiros',
    ShipType.CARS: 'Carros',
}


PERMISSION_MODELS: dict[ShipType, dict[str, str]] = {
    ShipType.BULK: {
        'title': 'Granel',
        'accent': '#17C51A',
        'text': '#FFFFFF',
    },
    ShipType.CONTAINER: {
        'title': 'Container',
        'accent': '#4467A8',
        'text': '#FFFFFF',
    },
    ShipType.OIL: {
        'title': 'Petróleo',
        'accent': '#4C4C4C',
        'text': '#FFFFFF',
    },
    ShipType.GAS: {
        'title': 'Gás',
        'accent': '#F2B400',
        'text': '#FFFFFF',
    },
    ShipType.CRUISE: {
        'title': 'Cruzeiro',
        'accent': '#D60A00',
        'text': '#FFFFFF',
    },
    ShipType.CARS: {
        'title': 'Automóveis',
        'accent': '#A9C4E4',
        'text': '#FFFFFF',
    },
}


DEFAULT_STYLE = {
    'fill': '#07b14d',
    'text': '#edf6ff',
}

DEFAULT_CHANCE_STYLE = {
    'accent': '#18C43A',
    'text': '#FFFFFF',
}


def _build_property_title_cards(kind: PropertyKind) -> list[dict[str, Any]]:
    data = load_game_data()
    property_cards = [card for card in data.properties.values() if card.kind == kind]

    cards: list[dict[str, Any]] = []
    for index, card in enumerate(property_cards, start=1):
        rows = []
        for ship_type in PORT_TITLE_ORDER:
            rate = card.rates[ship_type]
            rows.append(
                {
                    'kind': ship_type.value,
                    'label': CARGO_LABELS[ship_type],
                    'fee': rate.fee,
                    'multiplier': rate.multiplier,
                }
            )

        style = data.continent_styles.get(card.continent, DEFAULT_STYLE)
        cards.append(
            {
                'number': index,
                'number_display': str(index),
                'code': card.code,
                'name': card.name,
                'country': card.country,
                'price': card.purchase_price,
                'continent': card.continent,
                'fill': style['fill'],
                'text': style['text'],
                'rows': rows,
                'kind': kind.value,
                'is_toll': kind == PropertyKind.TOLL,
                'column_fee_label': 'Estadia',
                'column_multiplier_label': '(x)',
            }
        )

    return cards


def build_port_title_cards() -> list[dict[str, Any]]:
    return _build_property_title_cards(PropertyKind.PORT)


def build_toll_title_cards() -> list[dict[str, Any]]:
    return _build_property_title_cards(PropertyKind.TOLL)


def build_chance_cards() -> list[dict[str, Any]]:
    data = load_game_data()
    cards: list[dict[str, Any]] = []

    for item in sorted(data.cards, key=lambda card: card.order):
        style = {
            'accent': item.accent or DEFAULT_CHANCE_STYLE['accent'],
            'text': item.text or DEFAULT_CHANCE_STYLE['text'],
        }
        cards.append(
            {
                'id': item.id,
                'order': item.order,
                'title': item.title,
                'description': item.description,
                'effect_text': item.effect_text,
                'effect': item.effect,
                'category': item.category,
                'category_label': 'Sorte' if item.category == 'sorte' else 'Revés',
                'accent': style['accent'],
                'text': style['text'],
            }
        )

    return cards


def build_freight_permission_cards() -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for ship_type in PORT_TITLE_ORDER:
        style = PERMISSION_MODELS[ship_type]
        cards.append(
            {
                'id': ship_type.value,
                'kind': ship_type.value,
                'title': style['title'],
                'accent': style['accent'],
                'text': style['text'],
                'body_text': 'Permissão de Frete',
            }
        )
    return cards
