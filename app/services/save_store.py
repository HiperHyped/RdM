from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from app.config import SAVE_ROOT_DIR

SaveMode = Literal['game', 'robots']
SaveRuntime = Literal['game-ui', 'game-ai-ui', 'game-ai-ui-v2', 'game-ai-ui-v3', 'robots-ui', 'robots-ai-ui', 'robots-ai-ui-v2']

SAVE_FILE_VERSION = 1
_VALID_MODES: set[str] = {'game', 'robots'}
_SUPPORTED_SCHEMA = 'rdm-ui-save-v1'
_RUNTIME_RULES: dict[str, dict[str, Any]] = {
    'game-ui': {
        'mode': 'game',
        'variants': {'game-ui'},
    },
    'game-ai-ui': {
        'mode': 'game',
        'variants': {'game-ai-ui'},
    },
    'game-ai-ui-v2': {
        'mode': 'game',
        'variants': {'game-ai-ui-v2'},
    },
    'game-ai-ui-v3': {
        'mode': 'game',
        'variants': {'game-ai-ui-v2', 'game-ai-ui-v3'},
    },
    'robots-ui': {
        'mode': 'robots',
        'variants': {'robots-ui'},
    },
    'robots-ai-ui': {
        'mode': 'robots',
        'variants': {'robots-ai-ui'},
    },
    'robots-ai-ui-v2': {
        'mode': 'robots',
        'variants': {'robots-ai-ui-v2'},
    },
}


def _slugify(value: str) -> str:
    normalized = re.sub(r'[^a-z0-9]+', '-', value.strip().lower())
    normalized = normalized.strip('-')
    return normalized or 'save'


def _filenameify(value: str) -> str:
    normalized = re.sub(r'\s+', '_', value.strip())
    normalized = re.sub(r'[^A-Za-z0-9_-]+', '_', normalized)
    normalized = re.sub(r'_+', '_', normalized).strip('_')
    return normalized or 'save'


def _default_label(snapshot: dict[str, Any]) -> str:
    session = snapshot.get('session') if isinstance(snapshot, dict) else None
    if isinstance(session, dict):
        turn_label = str(session.get('turn_label') or '').strip()
        if turn_label:
            return turn_label
    title = str(snapshot.get('title') or '').strip() if isinstance(snapshot, dict) else ''
    if title:
        return title
    return 'Save'


class SaveStore:
    def __init__(self, root_dir: Path | None = None) -> None:
        self.root_dir = Path(root_dir or SAVE_ROOT_DIR)

    def _mode_dir(self, mode: SaveMode) -> Path:
        if mode not in _VALID_MODES:
            raise ValueError(f'Unsupported save mode: {mode}')
        return self.root_dir / mode

    def _runtime_rule(self, runtime: SaveRuntime) -> dict[str, Any]:
        rule = _RUNTIME_RULES.get(str(runtime).strip())
        if rule is None:
            raise ValueError(f'Unsupported save runtime: {runtime}')
        return rule

    def _load_record(self, path: Path) -> dict[str, Any]:
        return json.loads(path.read_text(encoding='utf-8'))

    def _build_meta(self, record: dict[str, Any], path: Path) -> dict[str, Any]:
        snapshot = record.get('snapshot') if isinstance(record, dict) else None
        session = snapshot.get('session') if isinstance(snapshot, dict) else None
        return {
            'file_name': path.name,
            'save_id': record.get('save_id', ''),
            'mode': record.get('mode', ''),
            'variant': record.get('variant', ''),
            'label': record.get('label', ''),
            'saved_at': record.get('saved_at', ''),
            'version': record.get('version'),
            'schema': snapshot.get('schema', '') if isinstance(snapshot, dict) else '',
            'turn_label': session.get('turn_label', '') if isinstance(session, dict) else '',
        }

    def _is_record_compatible(self, record: dict[str, Any], runtime: SaveRuntime) -> bool:
        rule = self._runtime_rule(runtime)
        snapshot = record.get('snapshot') if isinstance(record, dict) else None
        schema = snapshot.get('schema') if isinstance(snapshot, dict) else None
        return (
            record.get('mode') == rule['mode']
            and record.get('variant') in rule['variants']
            and record.get('version') == SAVE_FILE_VERSION
            and schema == _SUPPORTED_SCHEMA
        )

    def list_compatible_saves(self, *, runtime: SaveRuntime) -> list[dict[str, Any]]:
        rule = self._runtime_rule(runtime)
        mode_dir = self._mode_dir(rule['mode'])
        if not mode_dir.exists():
            return []

        entries: list[dict[str, Any]] = []
        for path in sorted(mode_dir.glob('*.json')):
            try:
                record = self._load_record(path)
            except (OSError, json.JSONDecodeError):
                continue
            if not self._is_record_compatible(record, runtime):
                continue
            entries.append(self._build_meta(record, path))
        entries.sort(key=lambda item: str(item.get('saved_at', '')), reverse=True)
        return entries

    def load_compatible_save(self, *, runtime: SaveRuntime, file_name: str) -> dict[str, Any]:
        rule = self._runtime_rule(runtime)
        resolved_name = str(file_name or '').strip()
        if not resolved_name or '/' in resolved_name or '\\' in resolved_name:
            raise ValueError('Invalid save file name.')

        path = self._mode_dir(rule['mode']) / resolved_name
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(resolved_name)

        record = self._load_record(path)
        if not self._is_record_compatible(record, runtime):
            raise ValueError(f'Save file is not compatible with runtime: {runtime}')
        return {
            'meta': self._build_meta(record, path),
            'record': record,
        }

    def _build_record(
        self,
        *,
        mode: SaveMode,
        variant: str,
        snapshot: dict[str, Any],
        label: str | None,
        now: datetime | None,
    ) -> tuple[dict[str, Any], Path]:
        timestamp = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        resolved_variant = variant.strip()
        if not resolved_variant:
            raise ValueError('Save variant must not be empty.')

        resolved_label = (label or '').strip() or _default_label(snapshot)
        save_id = '-'.join([
            timestamp.strftime('%Y%m%dT%H%M%S%fZ'),
            _slugify(resolved_variant),
            _slugify(resolved_label),
        ])
        record = {
            'save_id': save_id,
            'mode': mode,
            'variant': resolved_variant,
            'label': resolved_label,
            'saved_at': timestamp.isoformat().replace('+00:00', 'Z'),
            'version': SAVE_FILE_VERSION,
            'snapshot': snapshot,
        }
        mode_dir = self._mode_dir(mode)
        file_stem = _filenameify(resolved_label)
        path = mode_dir / f'{file_stem}.json'
        suffix = 2
        while path.exists():
            path = mode_dir / f'{file_stem}__{suffix:02d}.json'
            suffix += 1
        return record, path

    def save_snapshot(
        self,
        *,
        mode: SaveMode,
        variant: str,
        snapshot: dict[str, Any],
        label: str | None = None,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        record, path = self._build_record(
            mode=mode,
            variant=variant,
            snapshot=snapshot,
            label=label,
            now=now,
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(record, indent=2, sort_keys=True), encoding='utf-8')
        return {
            'save_id': record['save_id'],
            'mode': record['mode'],
            'variant': record['variant'],
            'label': record['label'],
            'saved_at': record['saved_at'],
            'version': record['version'],
            'file_name': path.name,
        }
