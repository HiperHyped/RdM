from __future__ import annotations

import random

from app.domain import CouponKind
from app.engine import ReiDosMaresEngine


def test_draw_chance_card_removes_card_from_draw_pile() -> None:
    engine = ReiDosMaresEngine(rng=random.Random(11))
    initial_draw_pile = list(engine.state.chance_deck.draw_pile)

    card = engine.draw_chance_card()

    assert len(engine.state.chance_deck.draw_pile) == len(initial_draw_pile) - 1
    assert card.id in initial_draw_pile
    assert card.id not in engine.state.chance_deck.draw_pile


def test_coupon_card_is_held_out_of_deck_until_consumed() -> None:
    engine = ReiDosMaresEngine(rng=random.Random(12))
    player = engine.add_player('Ana', color_id='blue', assign_initial_permission=False)
    engine.state.chance_deck.draw_pile = ['atalho']

    card = engine.draw_chance_card()
    coupon = engine.store_chance_coupon(player.id, card.id)

    assert coupon.kind == CouponKind.SHORTCUT_IGNORE_TOLL
    assert player.coupons == [coupon.id]
    assert card.id in engine.state.chance_deck.held_card_ids
    assert card.id not in engine.state.chance_deck.discard_pile

    consumed = engine.consume_coupon(coupon.id)

    assert consumed.status == 'consumed'
    assert player.coupons == []
    assert card.id not in engine.state.chance_deck.held_card_ids
    assert engine.state.chance_deck.discard_pile == [card.id]


def test_discard_reshuffle_keeps_held_coupon_out_of_draw_pile() -> None:
    engine = ReiDosMaresEngine(rng=random.Random(13))
    player = engine.add_player('Bia', color_id='yellow', assign_initial_permission=False)
    engine.state.chance_deck.draw_pile = ['atalho']

    held_card = engine.draw_chance_card()
    engine.store_chance_coupon(player.id, held_card.id)
    engine.state.chance_deck.draw_pile = []
    engine.state.chance_deck.discard_pile = ['baleias', held_card.id]

    drawn = engine.draw_chance_card()

    assert drawn.id == 'baleias'
    assert held_card.id not in engine.state.chance_deck.draw_pile
    assert held_card.id in engine.state.chance_deck.held_card_ids
