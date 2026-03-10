from __future__ import annotations

import random

import pytest

from app.domain import ShipType
from app.engine import ReiDosMaresEngine, RuleViolation


def test_stop_quote_for_unowned_property_uses_bank_fee() -> None:
    engine = ReiDosMaresEngine(rng=random.Random(7))
    visitor = engine.add_player("Visitante", color_id="blue", assign_initial_permission=False)

    quote = engine.stop_quote(visitor.id, "RIO", ShipType.OIL)

    assert quote.can_buy is True
    assert quote.bank_fee == engine.data.properties["RIO"].rates[ShipType.OIL].fee
    assert quote.owner_fee == 0
    assert quote.owner_player_id is None


def test_stop_quote_for_owned_property_uses_owner_multiplier() -> None:
    engine = ReiDosMaresEngine(rng=random.Random(8))
    owner = engine.add_player("Dono", color_id="yellow", assign_initial_permission=False)
    visitor = engine.add_player("Visitante", color_id="blue", assign_initial_permission=False)
    owner.cash = 99999
    engine.buy_property(owner.id, "RIO")

    quote = engine.stop_quote(visitor.id, "RIO", ShipType.OIL)

    assert quote.can_buy is False
    assert quote.bank_fee == 0
    assert quote.owner_fee == engine.data.properties["RIO"].rates[ShipType.OIL].multiplier
    assert quote.owner_player_id == owner.id


def test_contract_rejects_destination_in_same_region() -> None:
    engine = ReiDosMaresEngine(rng=random.Random(9))
    player = engine.add_player("Ana", color_id="green", assign_initial_permission=False)
    ship = engine.assign_initial_permission(player.id, ShipType.OIL, "RIO")

    with pytest.raises(RuleViolation):
        engine.create_contract(
            player_id=player.id,
            ship_id=ship.id,
            origin="RIO",
            destination="REC",
            mandatory_toll="CAP",
        )


def test_complete_contract_splits_origin_and_toll_income() -> None:
    engine = ReiDosMaresEngine(rng=random.Random(10))
    shipper = engine.add_player("Shipper", color_id="blue", assign_initial_permission=False)
    origin_owner = engine.add_player("Origin", color_id="yellow", assign_initial_permission=False)
    toll_owner = engine.add_player("Toll", color_id="red", assign_initial_permission=False)

    origin_owner.cash = 20000
    toll_owner.cash = 20000

    engine.buy_property(origin_owner.id, "RIO")
    engine.buy_property(toll_owner.id, "CAP")

    ship = engine.assign_initial_permission(shipper.id, ShipType.OIL, "RIO")
    contract = engine.create_contract(
        player_id=shipper.id,
        ship_id=ship.id,
        origin="RIO",
        destination="HAM",
        mandatory_toll="CAP",
    )

    before_shipper = shipper.cash
    before_origin = origin_owner.cash
    before_toll = toll_owner.cash

    net = engine.complete_contract(contract.id, rounds_elapsed=4, passed_mandatory_toll=True)

    assert contract.gross_payment == engine.data.distances["RIO"]["HAM"] * engine.data.properties["RIO"].rates[ShipType.OIL].fee
    assert net == 0
    assert shipper.cash == before_shipper
    assert origin_owner.cash == before_origin + int(contract.gross_payment * 0.5)
    assert toll_owner.cash == before_toll + int(contract.gross_payment * 0.5)
