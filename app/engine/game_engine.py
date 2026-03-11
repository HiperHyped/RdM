from __future__ import annotations

import random
import re

from app.domain import (
    ChanceCard,
    ChanceDeckState,
    Contract,
    ContractStatus,
    CouponKind,
    GameData,
    GameRules,
    GameState,
    Player,
    PropertyCard,
    PropertyKind,
    Ship,
    ShipPermission,
    ShipType,
    StopQuote,
    StoredCoupon,
)
from app.services.data_loader import load_game_data, load_game_rules


class RuleViolation(Exception):
    pass


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "player"


class ReiDosMaresEngine:
    def __init__(
        self,
        data: GameData | None = None,
        rules: GameRules | None = None,
        rng: random.Random | None = None,
    ) -> None:
        self.rng = rng or random.Random()
        loaded_data = data or load_game_data()
        loaded_rules = rules or load_game_rules()
        self.state = GameState(data=loaded_data, rules=loaded_rules)
        self._ship_counter = 0
        self._permission_counter = 0
        self._contract_counter = 0
        self._coupon_counter = 0
        self.reset_chance_deck(shuffle=True)

    @property
    def data(self) -> GameData:
        return self.state.data

    @property
    def rules(self) -> GameRules:
        return self.state.rules

    def ordered_chance_cards(self) -> list[ChanceCard]:
        return sorted(self.data.cards, key=lambda card: card.order)

    def reset_chance_deck(self, *, shuffle: bool = True) -> ChanceDeckState:
        draw_pile = [card.id for card in self.ordered_chance_cards()]
        if shuffle:
            self.rng.shuffle(draw_pile)
        self.state.chance_deck = ChanceDeckState(
            draw_pile=draw_pile,
            discard_pile=[],
            held_card_ids=set(),
        )
        return self.state.chance_deck

    def draw_chance_card(self) -> ChanceCard:
        deck = self.state.chance_deck
        if not deck.draw_pile:
            self._reshuffle_chance_discard_into_draw()
        if not deck.draw_pile:
            raise RuleViolation("No chance cards available.")
        return self.require_chance_card(deck.draw_pile.pop(0))

    def discard_chance_card(self, card_id: str) -> ChanceCard:
        card = self.require_chance_card(card_id)
        deck = self.state.chance_deck
        if card.id in deck.held_card_ids:
            raise RuleViolation("Held chance cards cannot be discarded.")
        if card.id in deck.draw_pile:
            raise RuleViolation("Chance card must be drawn before being discarded.")
        if card.id not in deck.discard_pile:
            deck.discard_pile.append(card.id)
        return card

    def store_chance_coupon(self, player_id: str, card_id: str) -> StoredCoupon:
        player = self.require_player(player_id)
        card = self.require_chance_card(card_id)
        deck = self.state.chance_deck
        if card.id in deck.draw_pile:
            raise RuleViolation("Chance card must be drawn before becoming a held coupon.")
        if card.id in deck.held_card_ids:
            raise RuleViolation("Chance card is already being held as coupon.")

        coupon = StoredCoupon(
            id=self.next_coupon_id(),
            kind=self._coupon_kind_for_card(card),
            owner_id=player.id,
            source_card_id=card.id,
            label=card.title,
        )
        self.state.coupons[coupon.id] = coupon
        player.coupons.append(coupon.id)
        deck.held_card_ids.add(card.id)
        deck.discard_pile = [item for item in deck.discard_pile if item != card.id]
        return coupon

    def consume_coupon(self, coupon_id: str) -> StoredCoupon:
        coupon = self.require_coupon(coupon_id)
        if coupon.status != "held":
            raise RuleViolation(f"Coupon {coupon_id} is not available anymore.")

        player = self.require_player(coupon.owner_id)
        player.coupons = [item for item in player.coupons if item != coupon.id]

        coupon.status = "consumed"
        deck = self.state.chance_deck
        deck.held_card_ids.discard(coupon.source_card_id)
        if coupon.source_card_id not in deck.discard_pile:
            deck.discard_pile.append(coupon.source_card_id)
        return coupon

    def _reshuffle_chance_discard_into_draw(self) -> None:
        deck = self.state.chance_deck
        if deck.draw_pile:
            return
        fresh_draw = [card_id for card_id in deck.discard_pile if card_id not in deck.held_card_ids]
        if not fresh_draw:
            return
        self.rng.shuffle(fresh_draw)
        deck.draw_pile = fresh_draw
        deck.discard_pile = []

    def _coupon_kind_for_card(self, card: ChanceCard) -> CouponKind:
        effect_type = card.effect.get("type")
        if effect_type != "coupon":
            raise RuleViolation(f"Chance card {card.id} does not create a stored coupon.")

        raw_kind = str(card.effect.get("coupon") or "")
        try:
            return CouponKind(raw_kind)
        except ValueError as exc:
            raise RuleViolation(f"Unknown coupon kind: {raw_kind}") from exc

    def add_player(
        self,
        name: str,
        color_id: str,
        player_id: str | None = None,
        assign_initial_permission: bool = False,
        ship_type: ShipType | None = None,
        starting_port: str | None = None,
    ) -> Player:
        pid = player_id or _slugify(name)
        if pid in self.state.players:
            suffix = 2
            while f"{pid}-{suffix}" in self.state.players:
                suffix += 1
            pid = f"{pid}-{suffix}"

        player = Player(id=pid, name=name, color_id=color_id, cash=self.rules.initial_cash)
        self.state.players[pid] = player
        self.state.turn_order.append(pid)

        if assign_initial_permission:
            chosen_ship = ship_type or self.rng.choice(list(ShipType))
            chosen_port = starting_port or self.rng.choice(self.port_codes())
            self.assign_initial_permission(pid, chosen_ship, chosen_port)

        return player

    def assign_initial_permission(
        self,
        player_id: str,
        ship_type: ShipType,
        starting_port: str,
    ) -> Ship:
        player = self.require_player(player_id)
        property_card = self.require_property(starting_port)
        if property_card.kind != PropertyKind.PORT:
            raise RuleViolation("Initial ship must start in a port.")

        permission = ShipPermission(
            id=self.next_permission_id(),
            owner_id=player.id,
            ship_type=ship_type,
            purchase_price=self.rules.extra_permission_cost,
        )
        ship = Ship(
            id=self.next_ship_id(),
            owner_id=player.id,
            permission_id=permission.id,
            ship_type=ship_type,
            color_id=player.color_id,
            location_code=starting_port,
        )
        permission.ship_id = ship.id

        self.state.permissions[permission.id] = permission
        self.state.ships[ship.id] = ship
        player.permission_ids.append(permission.id)
        player.ship_ids.append(ship.id)
        return ship

    def buy_property(self, player_id: str, property_code: str) -> PropertyCard:
        player = self.require_player(player_id)
        card = self.require_property(property_code)
        if card.owner_id is not None:
            raise RuleViolation(f"Property {property_code} already has an owner.")
        if player.cash < card.purchase_price:
            raise RuleViolation(f"{player.name} does not have enough cash to buy {property_code}.")

        player.cash -= card.purchase_price
        card.owner_id = player.id
        player.property_codes.add(card.code)
        return card

    def port_codes(self) -> list[str]:
        return [code for code, card in self.data.properties.items() if card.kind == PropertyKind.PORT]

    def toll_codes(self) -> list[str]:
        return [code for code, card in self.data.properties.items() if card.kind == PropertyKind.TOLL]

    def list_valid_destinations(self, origin_code: str) -> list[str]:
        origin = self.require_property(origin_code)
        valid: list[str] = []
        for code in self.port_codes():
            if code == origin_code:
                continue
            candidate = self.require_property(code)
            if candidate.continent == origin.continent:
                continue
            valid.append(code)
        return valid

    def create_contract(
        self,
        player_id: str,
        ship_id: str,
        origin: str,
        destination: str,
        mandatory_toll: str,
    ) -> Contract:
        player = self.require_player(player_id)
        ship = self.require_ship(ship_id)
        if ship.owner_id != player.id:
            raise RuleViolation("Ship does not belong to this player.")
        if ship.active_contract_id is not None:
            raise RuleViolation("Ship already has an active contract.")
        if self.rules.single_active_contract_per_player and self.player_has_active_contract(player.id):
            raise RuleViolation("Only one active contract per player is allowed.")

        origin_card = self.require_property(origin)
        destination_card = self.require_property(destination)
        toll_card = self.require_property(mandatory_toll)
        if origin_card.kind != PropertyKind.PORT or destination_card.kind != PropertyKind.PORT:
            raise RuleViolation("Contracts must start and end in ports.")
        if toll_card.kind != PropertyKind.TOLL:
            raise RuleViolation("Mandatory toll must be a toll card.")
        if destination_card.continent == origin_card.continent:
            raise RuleViolation("Destination must be outside the origin continent group.")

        distance = self.lookup_distance(origin, destination)
        rate = origin_card.rates[ship.ship_type]
        origin_multiplier: int | None = None
        base_value = distance * rate.fee
        if origin_card.owner_id == player.id and not origin_card.mortgaged:
            origin_multiplier = rate.multiplier
            if self.rules.freight_uses_multiplier_value_when_origin_owned:
                base_value = distance * rate.fee * rate.multiplier

        contract = Contract(
            id=self.next_contract_id(),
            player_id=player.id,
            ship_id=ship.id,
            origin=origin,
            destination=destination,
            mandatory_toll=mandatory_toll,
            distance=distance,
            cargo_fee=rate.fee,
            origin_multiplier=origin_multiplier,
            base_value=base_value,
        )
        self.state.contracts[contract.id] = contract
        player.contract_ids.append(contract.id)
        ship.active_contract_id = contract.id
        ship.location_code = origin
        return contract

    def complete_contract(
        self,
        contract_id: str,
        rounds_elapsed: int,
        passed_mandatory_toll: bool = True,
    ) -> int:
        contract = self.require_contract(contract_id)
        if contract.status != ContractStatus.ACTIVE:
            raise RuleViolation("Contract is not active.")
        if not passed_mandatory_toll:
            raise RuleViolation("Contract requires the mandatory toll to be passed.")

        player = self.require_player(contract.player_id)
        ship = self.require_ship(contract.ship_id)
        origin_card = self.require_property(contract.origin)
        toll_card = self.require_property(contract.mandatory_toll)

        gross = contract.base_value
        if (
            self.rules.monopoly_origin_doubles_freight
            and origin_card.owner_id == player.id
            and self.has_region_monopoly(player.id, origin_card.continent)
        ):
            gross *= 2

        gross = max(0, gross + self.timing_adjustment(rounds_elapsed))
        net = gross

        if origin_card.owner_id and origin_card.owner_id != player.id and not origin_card.mortgaged:
            commission = int(gross * self.rules.origin_owner_commission_share)
            self.require_player(origin_card.owner_id).cash += commission
            net -= commission

        if toll_card.owner_id and toll_card.owner_id != player.id and not toll_card.mortgaged:
            toll_share = int(gross * self.rules.toll_owner_share)
            self.require_player(toll_card.owner_id).cash += toll_share
            net -= toll_share

        net = max(0, net)
        player.cash += net
        ship.location_code = contract.destination
        ship.active_contract_id = None

        contract.status = ContractStatus.COMPLETED
        contract.rounds_elapsed = rounds_elapsed
        contract.passed_mandatory_toll = True
        contract.gross_payment = gross
        contract.net_payment = net
        return net

    def stop_quote(self, visitor_player_id: str, property_code: str, ship_type: ShipType) -> StopQuote:
        visitor = self.require_player(visitor_player_id)
        card = self.require_property(property_code)
        rate = card.rates[ship_type]

        if card.owner_id is None:
            return StopQuote(
                property_code=card.code,
                property_kind=card.kind,
                can_buy=True,
                purchase_price=card.purchase_price,
                bank_fee=rate.fee,
                owner_fee=0,
                owner_player_id=None,
            )

        if card.owner_id == visitor.id or card.mortgaged:
            return StopQuote(
                property_code=card.code,
                property_kind=card.kind,
                can_buy=False,
                purchase_price=card.purchase_price,
                bank_fee=0,
                owner_fee=0,
                owner_player_id=card.owner_id,
            )

        owner_fee = rate.multiplier
        if (
            card.kind == PropertyKind.PORT
            and self.rules.monopoly_stay_uses_multiplier_times_region_size
            and self.has_region_monopoly(card.owner_id, card.continent)
        ):
            owner_fee *= len(self.data.continents[card.continent])

        return StopQuote(
            property_code=card.code,
            property_kind=card.kind,
            can_buy=False,
            purchase_price=card.purchase_price,
            bank_fee=0,
            owner_fee=owner_fee,
            owner_player_id=card.owner_id,
        )

    def has_region_monopoly(self, player_id: str, continent: str) -> bool:
        player = self.require_player(player_id)
        required_codes = set(self.data.continents.get(continent, []))
        if not required_codes:
            return False
        if not required_codes.issubset(player.property_codes):
            return False

        for code in required_codes:
            card = self.require_property(code)
            if card.owner_id != player.id or card.mortgaged:
                return False
        return True

    def player_has_active_contract(self, player_id: str) -> bool:
        player = self.require_player(player_id)
        return any(self.state.ships[ship_id].active_contract_id for ship_id in player.ship_ids)

    def timing_adjustment(self, rounds_elapsed: int) -> int:
        diff = self.rules.target_rounds - rounds_elapsed
        if diff > 0:
            return diff * self.rules.bonus_per_early_round
        if diff < 0:
            return diff * self.rules.penalty_per_late_round
        return 0

    def lookup_distance(self, origin: str, destination: str) -> int:
        row = self.data.distances.get(origin)
        if row is None or destination not in row:
            raise RuleViolation(f"Missing distance for {origin}->{destination}.")
        return int(row[destination])

    def next_turn(self) -> str:
        if not self.state.turn_order:
            raise RuleViolation("No players available.")
        self.state.active_turn_index = (self.state.active_turn_index + 1) % len(self.state.turn_order)
        return self.state.turn_order[self.state.active_turn_index]

    def next_ship_id(self) -> str:
        self._ship_counter += 1
        return f"ship-{self._ship_counter:03d}"

    def next_permission_id(self) -> str:
        self._permission_counter += 1
        return f"perm-{self._permission_counter:03d}"

    def next_contract_id(self) -> str:
        self._contract_counter += 1
        return f"ct-{self._contract_counter:04d}"

    def next_coupon_id(self) -> str:
        self._coupon_counter += 1
        return f"coupon-{self._coupon_counter:04d}"

    def require_player(self, player_id: str) -> Player:
        player = self.state.players.get(player_id)
        if player is None:
            raise RuleViolation(f"Unknown player id: {player_id}")
        return player

    def require_ship(self, ship_id: str) -> Ship:
        ship = self.state.ships.get(ship_id)
        if ship is None:
            raise RuleViolation(f"Unknown ship id: {ship_id}")
        return ship

    def require_contract(self, contract_id: str) -> Contract:
        contract = self.state.contracts.get(contract_id)
        if contract is None:
            raise RuleViolation(f"Unknown contract id: {contract_id}")
        return contract

    def require_property(self, property_code: str) -> PropertyCard:
        card = self.state.data.properties.get(property_code)
        if card is None:
            raise RuleViolation(f"Unknown property code: {property_code}")
        return card

    def require_chance_card(self, card_id: str) -> ChanceCard:
        card = next((item for item in self.data.cards if item.id == card_id), None)
        if card is None:
            raise RuleViolation(f"Unknown chance card id: {card_id}")
        return card

    def require_coupon(self, coupon_id: str) -> StoredCoupon:
        coupon = self.state.coupons.get(coupon_id)
        if coupon is None:
            raise RuleViolation(f"Unknown coupon id: {coupon_id}")
        return coupon
