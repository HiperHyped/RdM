from __future__ import annotations

from dataclasses import dataclass

from app.domain import Contract, PropertyCard


@dataclass
class BotPolicy:
    reserve_cash: int = 450

    def should_buy_property(self, cash: int, property_card: PropertyCard, expected_stop_income: int = 0) -> bool:
        if cash - property_card.purchase_price < self.reserve_cash:
            return False
        if property_card.kind.value == "toll":
            return cash >= property_card.purchase_price + 300
        return expected_stop_income >= 0

    def rank_contracts(self, contracts: list[Contract]) -> list[Contract]:
        return sorted(
            contracts,
            key=lambda contract: (contract.base_value, -contract.distance),
            reverse=True,
        )
