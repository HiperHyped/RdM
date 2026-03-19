from __future__ import annotations

from app.services import build_chance_cards, load_game_data


def test_chance_cards_preview_data_matches_full_deck() -> None:
    cards = build_chance_cards()

    assert len(cards) == 39
    assert sum(1 for card in cards if card['category'] == 'sorte') == 22
    assert sum(1 for card in cards if card['category'] == 'reves') == 17
    assert cards[0]['title'] == 'Baleias'
    assert cards[0]['accent'] == '#18C43A'
    assert cards[0]['effect']['type'] == 'gain_money'
    assert cards[-1]['id'] == 'desastre_maritimo'
    assert cards[-1]['accent'] == '#F01B12'
    assert cards[-1]['effect']['type'] == 'pay_each'


def test_loaded_cards_keep_category_color_and_effect_metadata() -> None:
    data = load_game_data()

    assert data.cards[0].category == 'sorte'
    assert data.cards[0].accent == '#18C43A'
    assert data.cards[0].effect['type'] == 'gain_money'
    assert data.cards[18].category == 'sorte'
    assert data.cards[18].effect['type'] == 'coupon'
    assert data.cards[21].category == 'sorte'
    assert data.cards[21].effect['type'] == 'coupon'
    assert data.cards[22].category == 'reves'
    assert data.cards[22].effect['type'] == 'pay_money'
