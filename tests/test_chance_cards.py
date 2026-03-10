from __future__ import annotations

from app.services import build_chance_cards, load_game_data


def test_chance_cards_preview_data_matches_full_deck() -> None:
    cards = build_chance_cards()

    assert len(cards) == 35
    assert sum(1 for card in cards if card['category'] == 'sorte') == 18
    assert sum(1 for card in cards if card['category'] == 'reves') == 17
    assert cards[0]['title'] == 'Baleias'
    assert cards[0]['accent'] == '#18C43A'
    assert cards[-1]['title'] == 'Desastre Marítimo'
    assert cards[-1]['accent'] == '#F01B12'


def test_loaded_cards_keep_category_and_color_metadata() -> None:
    data = load_game_data()

    assert data.cards[0].category == 'sorte'
    assert data.cards[0].accent == '#18C43A'
    assert data.cards[18].category == 'reves'
    assert data.cards[18].description == 'Sua tripulação está em motim!'
