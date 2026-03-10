from __future__ import annotations

from app.services import build_port_title_cards, build_toll_title_cards


def test_port_title_cards_cover_all_ports() -> None:
    cards = build_port_title_cards()

    assert len(cards) == 30
    assert cards[0]['code'] == 'ATE'
    assert cards[-1]['code'] == 'VAN'
    assert all(len(card['rows']) == 6 for card in cards)
    assert all(card['price'] > 0 for card in cards)
    assert all(row['kind'] in {'bulk', 'container', 'oil', 'gas', 'cruise', 'cars'} for card in cards for row in card['rows'])
    assert cards[0]['fill'] == '#ff4b99'
    assert cards[1]['fill'] == '#2ccaf0'
    assert all(card['column_fee_label'] == 'Estadia' for card in cards)
    assert all(card['column_multiplier_label'] == '(x)' for card in cards)


def test_toll_title_cards_cover_all_tolls() -> None:
    cards = build_toll_title_cards()

    assert len(cards) == 6
    assert [card['code'] for card in cards] == ['CAP', 'GIB', 'PAN', 'SIN', 'SUZ', 'USH']
    assert all(card['is_toll'] for card in cards)
    assert cards[0]['rows'][0]['fee'] == 20
    assert cards[0]['rows'][0]['multiplier'] == 6
    assert all(card['column_fee_label'] == 'Estadia' for card in cards)
    assert all(card['column_multiplier_label'] == '(x)' for card in cards)
