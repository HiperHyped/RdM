from __future__ import annotations

from app.domain import PropertyKind
from app.services import load_ai_v2_config, load_ai_v2_rules_config, load_ai_v2_rules_original_config, load_game_data, load_player_colors


def test_game_data_uses_local_ports_file_and_merges_geo_coordinates() -> None:
    data = load_game_data()

    assert len(data.properties) == 36
    assert data.properties["RIO"].kind == PropertyKind.PORT
    assert data.properties["CAP"].kind == PropertyKind.TOLL
    assert data.properties["RIO"].lat is not None
    assert data.properties["TOK"].lon is not None
    assert data.continent_styles["AF"] == {
        "fill": "#1db159",
        "text": "#edf6ff",
    }
    assert data.continents["AF"] == ["DAK", "DAR", "LAG"]
    assert data.cards[0].category == "sorte"
    assert data.cards[0].accent == "#18C43A"
    assert data.cards[-1].category == "reves"


def test_player_colors_match_new_requested_palette() -> None:
    colors = load_player_colors()
    assert [item["id"] for item in colors] == [
        "blue",
        "yellow",
        "green",
        "red",
        "orange",
        "purple",
    ]


def test_ai_v2_config_exposes_normalized_presets_and_descriptions() -> None:
    config = load_ai_v2_config()

    assert config["version"] == "ai-presets-v2"
    assert config["parameter_groups"]["vision"]["label"] == "Visao"
    assert config["parameter_groups"]["skill"]["label"] == "Habilidades"
    assert config["parameter_groups"]["vision"]["parameters"][-1]["id"] == "planning_horizon_turns"
    assert config["parameter_groups"]["vision"]["parameters"][-1]["max"] == 1
    assert config["parameter_groups"]["vision"]["presets"][0]["values"]["weight_port"] == 0.6
    assert config["parameter_groups"]["vision"]["presets"][3]["values"]["planning_horizon_turns"] == 0.45
    assert config["parameter_groups"]["skill"]["presets"][0]["values"]["evaluation_noise"] == 1.0
    assert config["compatibility"]["skill_aliases"]["ai_expert"] == "elite"


def test_ai_v2_rules_config_exposes_decision_families_and_thresholds() -> None:
    config = load_ai_v2_rules_config()
    original = load_ai_v2_rules_original_config()

    assert config["version"] == "ai-rules-v2"
    assert config["schema_version"] == "declarative-formulas-v1"
    assert config["signal_catalog"]["planning_horizon"]["max_turns"] == 20
    assert config["derived_signals"]["cash_headroom"]["type"] == "normalized_ratio"
    assert config["derived_signals"]["cash_headroom"]["numerator"]["terms"][0]["signal"] == "cash_after_action"
    assert config["derived_signals"]["cash_pressure"]["numerator"]["terms"][1]["signal"] == "cash_after_action"
    assert config["runtime_context_signals"]["remaining_steps"]["description"].startswith("Passos de rota")
    assert config["runtime_context_signals"]["coupon_age_turns"]["description"].startswith("Quantidade de rodadas")
    assert config["decision_families"]["acquisition"]["decisions"]["bank_property_purchase"]["thresholds"]["buy"] == 0.58
    assert config["decision_families"]["acquisition"]["decisions"]["bank_property_purchase"]["scoring_formula"]["terms"][0]["signal"] == "asset_focus"
    assert config["decision_families"]["liquidity"]["decisions"]["reserve_cash_target"]["formula_spec"]["terms"][0]["weight"] == 0.32
    assert config["decision_families"]["negotiation"]["decisions"]["owned_property_price_band"]["price_formula"]["buyer_max"]["terms"][1]["weight"] == 0.24
    assert config["decision_families"]["negotiation"]["decisions"]["human_buy_negotiation"]["dialogue"]["opening_by_stance"]["irredutivel"].startswith("{owner_name}")
    assert config["decision_families"]["negotiation"]["decisions"]["human_sale_negotiation"]["dialogue"]["counter_offer_template"] == "Posso subir para {amount}, mas esse e o meu limite agora."
    assert config["derived_signals"]["coupon_age_pressure"]["type"] == "normalized_ratio"
    assert config["decision_families"]["tactical_resources"]["decisions"]["coupon_usage"]["coupon_rules"]["free_fuel"]["play_threshold"] == 0.45
    assert config["decision_families"]["tactical_resources"]["decisions"]["coupon_usage"]["coupon_rules"]["free_fuel"]["scoring_formula"]["terms"][0]["constant"] == 0.78
    assert config["decision_families"]["tactical_resources"]["decisions"]["coupon_usage"]["coupon_rules"]["cancel_contract"]["scoring_formula"]["terms"][0]["signal"] == "contract_failure_risk"
    assert original["decision_families"]["liquidity"]["decisions"]["reserve_cash_target"]["formula_spec"]["terms"][0]["weight"] == 0.42
    assert original["decision_families"]["negotiation"]["decisions"]["owned_property_interest"]["scoring_formula"]["terms"][9]["weight"] == -0.12
