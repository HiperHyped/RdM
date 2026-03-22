from __future__ import annotations

from app.services import build_robots_ui_bootstrap, build_ui_bootstrap


def test_ui_bootstrap_exposes_empty_first_turn_session() -> None:
    payload = build_ui_bootstrap()

    assert payload['session']['active_player_id'] == 'human'
    assert payload['session']['dice'] == [0, 0]
    assert payload['session']['turn_label'] == 'Turno 01'
    assert payload['human_company']['name'] == 'Minha Companhia'
    assert payload['human_company']['location_code'] is None
    assert payload['human_company']['active_permission_id'] is None
    assert payload['active_contract'] is None
    assert len(payload['freight_permission_cards']) == 6
    assert len(payload['chance_cards']) == 39
    assert len(payload['port_cards']) == 30
    assert len(payload['toll_cards']) == 6
    assert payload['chance_cards'][0]['effect']['type'] == 'gain_money'
    assert payload['chance_deck'] == {
        'draw_pile': [card['id'] for card in payload['chance_cards']],
        'discard_pile': [],
        'held_card_ids': [],
    }
    assert payload['rules']['origin_owner_commission_share'] == 0.5
    assert payload['rules']['toll_owner_share'] == 0.5
    assert payload['rules']['extra_permission_cost'] == 2000
    assert payload['rules']['mortgage_credit_ratio'] == 0.5
    assert payload['rules']['mortgage_release_multiplier'] == 1.5

    players = payload['players']
    rivals = payload['rivals']

    assert len(players) == 6
    assert len(rivals) == 5
    assert [rival['name'] for rival in rivals] == [
        'Jogador 1',
        'Jogador 2',
        'Jogador 3',
        'Jogador 4',
        'Jogador 5',
    ]
    assert all(player['active_contract'] is None for player in players)
    assert all(player['ship_visible'] is False for player in players)
    assert all(player['location_code'] is None for player in players)


def test_ui_bootstrap_respects_setup_choices() -> None:
    payload = build_ui_bootstrap(
        company_name='Atlante',
        human_color_id='red',
        rival_count=3,
    )

    assert payload['setup_defaults'] == {
        'company_name': 'Atlante',
        'human_color_id': 'red',
        'rival_count': 3,
    }
    assert payload['human_company']['name'] == 'Atlante'
    assert payload['human_company']['color_id'] == 'red'
    assert len(payload['players']) == 4
    assert len(payload['rivals']) == 3
    assert all(rival['color_id'] != 'red' for rival in payload['rivals'])
    assert [rival['name'] for rival in payload['rivals']] == ['Jogador 1', 'Jogador 2', 'Jogador 3']

def test_robots_ui_bootstrap_creates_only_cpu_players() -> None:
    payload = build_robots_ui_bootstrap(robot_count=6)

    assert payload['human_company'] is None
    assert payload['session']['active_player_id'] == 'cpu-1'
    assert payload['setup_defaults'] == {'robot_count': 6}
    assert len(payload['players']) == 6
    assert len(payload['rivals']) == 6
    assert all(player['is_human'] is False for player in payload['players'])
    assert [player['name'] for player in payload['players']] == [
        'Jogador 1',
        'Jogador 2',
        'Jogador 3',
        'Jogador 4',
        'Jogador 5',
        'Jogador 6',
    ]
