from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ShipType(str, Enum):
    BULK = "bulk"
    CONTAINER = "container"
    OIL = "oil"
    GAS = "gas"
    CRUISE = "cruise"
    CARS = "cars"


class PropertyKind(str, Enum):
    PORT = "port"
    TOLL = "toll"


class ContractStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CouponKind(str, Enum):
    SHORTCUT_IGNORE_TOLL = "shortcut_ignore_toll"
    FREE_TOLL = "free_toll"
    FREE_FUEL = "free_fuel"
    DOUBLE_FREIGHT = "double_freight"
    FREE_PORT_STAY = "free_port_stay"
    SKIP_OWNER_SHARE = "skip_owner_share"
    REROUTE_SAME_VALUE = "reroute_same_value"


@dataclass(frozen=True)
class Rate:
    fee: int
    multiplier: int


@dataclass
class PropertyCard:
    code: str
    name: str
    country: str
    kind: PropertyKind
    purchase_price: int
    rates: dict[ShipType, Rate]
    continent: str
    lat: float | None = None
    lon: float | None = None
    owner_id: str | None = None
    mortgaged: bool = False


@dataclass
class ChanceCard:
    id: str
    title: str
    description: str
    effect_text: str
    effect: dict[str, Any]
    order: int
    category: str = "sorte"
    accent: str = "#18C43A"
    text: str = "#FFFFFF"


@dataclass
class StoredCoupon:
    id: str
    kind: CouponKind
    owner_id: str
    source_card_id: str
    label: str
    status: str = "held"


@dataclass
class ChanceDeckState:
    draw_pile: list[str] = field(default_factory=list)
    discard_pile: list[str] = field(default_factory=list)
    held_card_ids: set[str] = field(default_factory=set)


@dataclass
class ShipPermission:
    id: str
    owner_id: str
    ship_type: ShipType
    purchase_price: int
    mortgaged: bool = False
    ship_id: str | None = None


@dataclass
class Ship:
    id: str
    owner_id: str
    permission_id: str
    ship_type: ShipType
    color_id: str
    location_code: str | None = None
    board_node_id: str | None = None
    skip_turns: int = 0
    active_contract_id: str | None = None


@dataclass
class Contract:
    id: str
    player_id: str
    ship_id: str
    origin: str
    destination: str
    mandatory_toll: str
    distance: int
    cargo_fee: int
    origin_multiplier: int | None
    base_value: int
    status: ContractStatus = ContractStatus.ACTIVE
    rounds_elapsed: int = 0
    passed_mandatory_toll: bool = False
    gross_payment: int = 0
    net_payment: int = 0


@dataclass
class Player:
    id: str
    name: str
    color_id: str
    cash: int
    ship_ids: list[str] = field(default_factory=list)
    permission_ids: list[str] = field(default_factory=list)
    property_codes: set[str] = field(default_factory=set)
    contract_ids: list[str] = field(default_factory=list)
    coupons: list[str] = field(default_factory=list)
    bankrupt: bool = False


@dataclass(frozen=True)
class StopQuote:
    property_code: str
    property_kind: PropertyKind
    can_buy: bool
    purchase_price: int
    bank_fee: int
    owner_fee: int
    owner_player_id: str | None


@dataclass(frozen=True)
class BoardNode:
    id: str
    kind: str
    x: float
    y: float
    lat: float | None = None
    lon: float | None = None
    label: str = ""
    route_id: str | None = None
    order: int | None = None


@dataclass(frozen=True)
class BoardEdge:
    id: str
    from_node_id: str
    to_node_id: str


@dataclass
class GameRules:
    initial_cash: int = 1960
    target_rounds: int = 4
    bonus_per_early_round: int = 50
    penalty_per_late_round: int = 20
    single_active_contract_per_player: bool = True
    first_permission_free: bool = True
    extra_permission_cost: int = 2000
    origin_owner_commission_share: float = 0.5
    toll_owner_share: float = 0.5
    freight_uses_multiplier_value_when_origin_owned: bool = True
    monopoly_stay_uses_multiplier_times_region_size: bool = True
    monopoly_origin_doubles_freight: bool = True


@dataclass
class GameData:
    properties: dict[str, PropertyCard]
    distances: dict[str, dict[str, int]]
    continents: dict[str, list[str]]
    ship_types: dict[ShipType, str]
    cards: list[ChanceCard]
    continent_styles: dict[str, dict[str, str]] = field(default_factory=dict)


@dataclass
class GameState:
    data: GameData
    rules: GameRules
    players: dict[str, Player] = field(default_factory=dict)
    permissions: dict[str, ShipPermission] = field(default_factory=dict)
    ships: dict[str, Ship] = field(default_factory=dict)
    contracts: dict[str, Contract] = field(default_factory=dict)
    coupons: dict[str, StoredCoupon] = field(default_factory=dict)
    chance_deck: ChanceDeckState = field(default_factory=ChanceDeckState)
    turn_order: list[str] = field(default_factory=list)
    active_turn_index: int = 0
