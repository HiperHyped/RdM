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
    payload = response.json()['save']

    save_path = tmp_path / 'game' / payload['file_name']
    record = json.loads(save_path.read_text(encoding='utf-8'))
    assert record['mode'] == 'game'
    assert record['variant'] == 'game-ui'
    assert record['label'] == 'Turno 03'


def test_healthcheck_reports_service_status(tmp_path) -> None:
    client = TestClient(create_app(save_root_dir=tmp_path))

    response = client.get('/api/health')

    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'
    assert payload['service'] == 'rei-dos-mares'
    assert payload['save_root'] == str(tmp_path)


def test_root_renders_game_ai_ui_v3(tmp_path) -> None:
    client = TestClient(create_app(save_root_dir=tmp_path))

    response = client.get('/')

    assert response.status_code == 200
    assert 'Preview do Jogo AI V3' in response.text


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
    saves = list_response.json()['saves']
    assert len(saves) == 1
    assert saves[0]['file_name'] == file_name
    assert saves[0]['variant'] == 'robots-ai-ui'

    load_response = client.get(f'/api/saves/runtime/robots-ai-ui/{file_name}')
    assert load_response.status_code == 200
    payload = load_response.json()
    assert payload['meta']['file_name'] == file_name
    assert payload['record']['variant'] == 'robots-ai-ui'
    assert payload['record']['snapshot']['session']['turn_label'] == 'Turno 21'
