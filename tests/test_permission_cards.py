from __future__ import annotations

from app.services import build_freight_permission_cards


def test_freight_permission_cards_cover_all_models() -> None:
    cards = build_freight_permission_cards()

    assert len(cards) == 6
    assert [card['id'] for card in cards] == ['bulk', 'container', 'oil', 'gas', 'cruise', 'cars']
    assert [card['title'] for card in cards] == ['Granel', 'Container', 'Petróleo', 'Gás', 'Cruzeiro', 'Automóveis']
    assert all(card['body_text'] == 'Permissão de Frete' for card in cards)
