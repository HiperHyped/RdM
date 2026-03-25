from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.services.save_store import SaveStore
from app.ui.server import create_app


def test_save_store_writes_snapshot_in_mode_specific_folder(tmp_path) -> None:
    store = SaveStore(tmp_path)
    snapshot = {
        'title': 'Rei dos Mares',
        'session': {'turn_label': 'Turno 07'},
        'players': [{'id': 'human'}],
    }

    meta = store.save_snapshot(
        mode='game',
        variant='game-ai-ui',
        snapshot=snapshot,
        now=datetime(2026, 3, 17, 12, 30, 45, 123456, tzinfo=timezone.utc),
    )

    save_path = tmp_path / 'game' / meta['file_name']
    assert save_path.exists()

    record = json.loads(save_path.read_text(encoding='utf-8'))
    assert record['save_id'] == meta['save_id']
    assert record['mode'] == 'game'
    assert record['variant'] == 'game-ai-ui'
    assert record['label'] == 'Turno 07'
    assert record['saved_at'] == '2026-03-17T12:30:45.123456Z'
    assert record['snapshot'] == snapshot
    assert meta['file_name'] == 'Turno_07.json'


def test_save_store_uses_incremented_suffix_for_duplicate_file_names(tmp_path) -> None:
    store = SaveStore(tmp_path)
    snapshot = {'session': {'turn_label': 'Turno 07'}}

    first = store.save_snapshot(mode='game', variant='game-ai-ui', snapshot=snapshot, label='Meu Save')
    second = store.save_snapshot(mode='game', variant='game-ai-ui', snapshot=snapshot, label='Meu Save')

    assert first['file_name'] == 'Meu_Save.json'
    assert second['file_name'] == 'Meu_Save__02.json'


def test_game_save_endpoint_persists_snapshot(tmp_path) -> None:
    client = TestClient(create_app(save_root_dir=tmp_path))

    response = client.post(
        '/api/saves/game',
        json={
            'variant': 'game-ui',
            'snapshot': {
                'title': 'Rei dos Mares',
                'session': {'turn_label': 'Turno 03'},
            },
        },
    )

    assert response.status_code == 200
    response_payload = response.json()
    payload = response_payload['save']
    assert response_payload['save_backend']['name'] == 'local'

    save_path = tmp_path / 'game' / payload['file_name']
    record = json.loads(save_path.read_text(encoding='utf-8'))
    assert record['mode'] == 'game'
    assert record['variant'] == 'game-ui'
    assert record['label'] == 'Turno 03'


def test_save_store_isolates_namespaced_saves(tmp_path) -> None:
    store = SaveStore(tmp_path)
    snapshot = {
        'schema': 'rdm-ui-save-v1',
        'session': {'turn_label': 'Turno 09'},
    }

    meta = store.save_snapshot(
        mode='game',
        variant='game-ai-ui-v3',
        snapshot=snapshot,
        label='Save Privado',
        save_space_id='space-abcd1234',
    )

    assert (tmp_path / 'game' / 'space-abcd1234' / meta['file_name']).exists()
    assert store.list_compatible_saves(runtime='game-ai-ui-v3', save_space_id='space-abcd1234')
    assert store.list_compatible_saves(runtime='game-ai-ui-v3', save_space_id='space-efgh5678') == []


def test_healthcheck_reports_service_status(tmp_path) -> None:
    layout_path = tmp_path / 'game_ai_ui_v3_layout.json'
    client = TestClient(create_app(save_root_dir=tmp_path, layout_config_path=layout_path))

    response = client.get('/api/health')

    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'
    assert payload['service'] == 'rei-dos-mares'
    assert payload['save_root'] == str(tmp_path)
    assert payload['layout_config'] == str(layout_path)


def test_root_renders_game_ai_ui_v3(tmp_path) -> None:
    layout_path = tmp_path / 'game_ai_ui_v3_layout.json'
    client = TestClient(create_app(save_root_dir=tmp_path, layout_config_path=layout_path))

    response = client.get('/')

    assert response.status_code == 200
    assert 'Preview do Jogo AI V3' in response.text
    assert 'rdm-game-v3-layout-config' in response.text


def test_game_v3_layout_endpoint_reads_and_writes_json_file(tmp_path) -> None:
    layout_path = tmp_path / 'game_ai_ui_v3_layout.json'
    client = TestClient(create_app(save_root_dir=tmp_path, layout_config_path=layout_path))

    read_response = client.get('/api/layouts/game-ai-ui-v3')
    assert read_response.status_code == 200
    assert read_response.json()['path'] == str(layout_path)
    assert layout_path.exists()

    update_response = client.put(
        '/api/layouts/game-ai-ui-v3',
        json={
            'map': {'x': 12, 'y': -18, 'width': None},
            'leftStack': {'x': 4, 'y': 9, 'width': 260},
        },
    )
    assert update_response.status_code == 200
    payload = update_response.json()
    assert payload['saved'] is True
    assert payload['layout']['map'] == {'x': 12, 'y': -18, 'width': None}
    assert payload['layout']['leftStack'] == {'x': 4, 'y': 9, 'width': 260}

    saved = json.loads(layout_path.read_text(encoding='utf-8'))
    assert saved['map'] == {'x': 12, 'y': -18, 'width': None}
    assert saved['leftStack'] == {'x': 4, 'y': 9, 'width': 260}


def test_game_v3_layout_endpoint_recovers_from_invalid_json(tmp_path) -> None:
    layout_path = tmp_path / 'game_ai_ui_v3_layout.json'
    layout_path.write_text('{ invalid json', encoding='utf-8')
    client = TestClient(create_app(save_root_dir=tmp_path, layout_config_path=layout_path))

    response = client.get('/api/layouts/game-ai-ui-v3')

    assert response.status_code == 200
    payload = response.json()['layout']
    assert payload['map'] == {'x': 0, 'y': 0, 'width': None}
    assert payload['leftStack'] == {'x': 0, 'y': 0, 'width': None}

    saved = json.loads(layout_path.read_text(encoding='utf-8'))
    assert saved['map'] == {'x': 0, 'y': 0, 'width': None}


def test_game_v3_layout_endpoint_recovers_from_invalid_structure(tmp_path) -> None:
    layout_path = tmp_path / 'game_ai_ui_v3_layout.json'
    layout_path.write_text(json.dumps({'map': 'broken'}), encoding='utf-8')
    client = TestClient(create_app(save_root_dir=tmp_path, layout_config_path=layout_path))

    response = client.get('/api/layouts/game-ai-ui-v3')

    assert response.status_code == 200
    payload = response.json()['layout']
    assert payload['map'] == {'x': 0, 'y': 0, 'width': None}
    assert payload['reportModal'] == {'x': 0, 'y': 0, 'width': None}


def test_robots_save_endpoint_persists_snapshot_in_robot_folder(tmp_path) -> None:
    client = TestClient(create_app(save_root_dir=tmp_path))

    response = client.post(
        '/api/saves/robots',
        json={
            'variant': 'robots-ai-ui',
            'snapshot': {
                'title': 'Rei dos Mares',
                'session': {'turn_label': 'Turno 18'},
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()['save']

    save_path = tmp_path / 'robots' / payload['file_name']
    record = json.loads(save_path.read_text(encoding='utf-8'))
    assert record['mode'] == 'robots'
    assert record['variant'] == 'robots-ai-ui'
    assert record['label'] == 'Turno 18'


def test_lists_only_saves_compatible_with_runtime(tmp_path) -> None:
    store = SaveStore(tmp_path)
    base_snapshot = {
        'schema': 'rdm-ui-save-v1',
        'session': {'turn_label': 'Turno 12'},
    }
    store.save_snapshot(mode='robots', variant='robots-ai-ui', snapshot=base_snapshot, label='Robots AI')
    store.save_snapshot(mode='robots', variant='robots-ui', snapshot=base_snapshot, label='Robots Base')
    store.save_snapshot(mode='game', variant='game-ai-ui', snapshot=base_snapshot, label='Game AI')

    compatible = store.list_compatible_saves(runtime='robots-ai-ui')

    assert len(compatible) == 1
    assert compatible[0]['variant'] == 'robots-ai-ui'
    assert compatible[0]['mode'] == 'robots'
    assert compatible[0]['schema'] == 'rdm-ui-save-v1'


def test_load_compatible_save_rejects_incompatible_variant(tmp_path) -> None:
    store = SaveStore(tmp_path)
    meta = store.save_snapshot(
        mode='robots',
        variant='robots-ui',
        snapshot={'schema': 'rdm-ui-save-v1', 'session': {'turn_label': 'Turno 03'}},
        label='Robots Base',
    )

    try:
        store.load_compatible_save(runtime='robots-ai-ui', file_name=meta['file_name'])
    except ValueError as exc:
        assert 'not compatible' in str(exc)
    else:
        raise AssertionError('Expected incompatible save to be rejected.')


def test_runtime_save_endpoints_list_and_load_compatible_file(tmp_path) -> None:
    client = TestClient(create_app(save_root_dir=tmp_path))

    save_response = client.post(
        '/api/saves/robots',
        json={
            'variant': 'robots-ai-ui',
            'label': 'Robots AI Save',
            'snapshot': {
                'schema': 'rdm-ui-save-v1',
                'session': {'turn_label': 'Turno 21'},
            },
        },
    )
    file_name = save_response.json()['save']['file_name']

    list_response = client.get('/api/saves/runtime/robots-ai-ui')
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload['save_backend']['name'] == 'local'
    saves = list_payload['saves']
    assert len(saves) == 1
    assert saves[0]['file_name'] == file_name
    assert saves[0]['variant'] == 'robots-ai-ui'

    load_response = client.get(f'/api/saves/runtime/robots-ai-ui/{file_name}')
    assert load_response.status_code == 200
    payload = load_response.json()
    assert payload['save_backend']['name'] == 'local'
    assert payload['meta']['file_name'] == file_name
    assert payload['record']['variant'] == 'robots-ai-ui'
    assert payload['record']['snapshot']['session']['turn_label'] == 'Turno 21'


def test_runtime_save_endpoints_filter_by_save_space_id(tmp_path) -> None:
    client = TestClient(create_app(save_root_dir=tmp_path))

    save_response = client.post(
        '/api/saves/game',
        json={
            'variant': 'game-ai-ui-v3',
            'label': 'Save da Ana',
            'save_space_id': 'space-ana1234',
            'snapshot': {
                'schema': 'rdm-ui-save-v1',
                'session': {'turn_label': 'Turno 04'},
            },
        },
    )
    file_name = save_response.json()['save']['file_name']

    other_response = client.post(
        '/api/saves/game',
        json={
            'variant': 'game-ai-ui-v3',
            'label': 'Save do Bruno',
            'save_space_id': 'space-bruno12',
            'snapshot': {
                'schema': 'rdm-ui-save-v1',
                'session': {'turn_label': 'Turno 05'},
            },
        },
    )
    assert other_response.status_code == 200

    list_response = client.get('/api/saves/runtime/game-ai-ui-v3?save_space_id=space-ana1234')
    assert list_response.status_code == 200
    saves = list_response.json()['saves']
    assert len(saves) == 1
    assert saves[0]['file_name'] == file_name

    hidden_response = client.get('/api/saves/runtime/game-ai-ui-v3?save_space_id=space-bruno12')
    assert hidden_response.status_code == 200
    assert len(hidden_response.json()['saves']) == 1
    assert hidden_response.json()['saves'][0]['file_name'] != file_name

    load_response = client.get(f'/api/saves/runtime/game-ai-ui-v3/{file_name}?save_space_id=space-ana1234')
    assert load_response.status_code == 200
    assert load_response.json()['meta']['save_space_id'] == 'space-ana1234'

    blocked_response = client.get(f'/api/saves/runtime/game-ai-ui-v3/{file_name}?save_space_id=space-bruno12')
    assert blocked_response.status_code == 404
