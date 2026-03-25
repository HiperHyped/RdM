from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from app.config import SAVE_ROOT_DIR, SUPABASE_KEY, SUPABASE_STORAGE_BUCKET, SUPABASE_STORAGE_PREFIX, SUPABASE_URL

SaveMode = Literal['game', 'robots']
SaveRuntime = Literal['game-ui', 'game-ai-ui', 'game-ai-ui-v2', 'game-ai-ui-v3', 'robots-ui', 'robots-ai-ui', 'robots-ai-ui-v2']

SAVE_FILE_VERSION = 1
_VALID_MODES: set[str] = {'game', 'robots'}
_SUPPORTED_SCHEMA = 'rdm-ui-save-v1'
_SAVE_SPACE_ID_PATTERN = re.compile(r'^[a-z0-9](?:[a-z0-9-]{6,62})$')
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


def _normalize_save_space_id(value: str | None) -> str | None:
    resolved = str(value or '').strip().lower()
    if not resolved:
        return None
    if not _SAVE_SPACE_ID_PATTERN.fullmatch(resolved):
        raise ValueError('Invalid save space id.')
    return resolved


class _StorageBackend:
    name = 'local'

    def list_file_names(self, *, mode: SaveMode, save_space_id: str | None) -> list[str]:
        raise NotImplementedError

    def read_text(self, *, mode: SaveMode, save_space_id: str | None, file_name: str) -> str:
        raise NotImplementedError

    def write_text(self, *, mode: SaveMode, save_space_id: str | None, file_name: str, content: str) -> None:
        raise NotImplementedError


class _LocalStorageBackend(_StorageBackend):
    name = 'local'

    def __init__(self, root_dir: Path) -> None:
        self.root_dir = Path(root_dir)

    def _mode_dir(self, mode: SaveMode, save_space_id: str | None) -> Path:
        mode_dir = self.root_dir / mode
        if save_space_id:
            return mode_dir / save_space_id
        return mode_dir

    def list_file_names(self, *, mode: SaveMode, save_space_id: str | None) -> list[str]:
        mode_dir = self._mode_dir(mode, save_space_id)
        if not mode_dir.exists():
            return []
        return sorted(path.name for path in mode_dir.glob('*.json') if path.is_file())

    def read_text(self, *, mode: SaveMode, save_space_id: str | None, file_name: str) -> str:
        path = self._mode_dir(mode, save_space_id) / file_name
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(file_name)
        return path.read_text(encoding='utf-8-sig')

    def write_text(self, *, mode: SaveMode, save_space_id: str | None, file_name: str, content: str) -> None:
        path = self._mode_dir(mode, save_space_id) / file_name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8')


class _SupabaseStorageBackend(_StorageBackend):
    name = 'supabase'

    def __init__(self, *, base_url: str, service_key: str, bucket: str, prefix: str) -> None:
        self.base_url = base_url.rstrip('/')
        self.service_key = service_key
        self.bucket = bucket
        self.prefix = prefix.strip().strip('/')

    @classmethod
    def from_env(cls) -> _SupabaseStorageBackend | None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return None
        return cls(
            base_url=SUPABASE_URL,
            service_key=SUPABASE_KEY,
            bucket=SUPABASE_STORAGE_BUCKET,
            prefix=SUPABASE_STORAGE_PREFIX,
        )

    def _headers(self, *, content_type: str | None = None) -> dict[str, str]:
        headers = {
            'apikey': self.service_key,
            'Authorization': f'Bearer {self.service_key}',
        }
        if content_type:
            headers['Content-Type'] = content_type
        return headers

    def _object_path(self, mode: SaveMode, save_space_id: str | None, file_name: str | None = None) -> str:
        parts = [segment for segment in [self.prefix, mode, save_space_id, file_name] if segment]
        return '/'.join(parts)

    def _request(self, *, method: str, path: str, payload: bytes | None = None, content_type: str | None = None) -> bytes:
        request = urllib_request.Request(
            f'{self.base_url}{path}',
            data=payload,
            headers=self._headers(content_type=content_type),
            method=method,
        )
        try:
            with urllib_request.urlopen(request, timeout=20) as response:
                return response.read()
        except urllib_error.HTTPError as exc:
            detail = ''
            try:
                detail = exc.read().decode('utf-8', errors='replace')
            except OSError:
                detail = ''
            if exc.code == 404:
                raise FileNotFoundError(path) from exc
            raise RuntimeError(f'Supabase storage request failed ({exc.code}): {detail or exc.reason}') from exc
        except OSError as exc:
            raise RuntimeError(f'Supabase storage request failed: {exc}') from exc

    def list_file_names(self, *, mode: SaveMode, save_space_id: str | None) -> list[str]:
        prefix = self._object_path(mode, save_space_id)
        payload = json.dumps({
            'prefix': prefix,
            'limit': 500,
            'offset': 0,
            'sortBy': {'column': 'name', 'order': 'asc'},
        }).encode('utf-8')
        raw = self._request(
            method='POST',
            path=f'/storage/v1/object/list/{urllib_parse.quote(self.bucket, safe="")}',
            payload=payload,
            content_type='application/json',
        )
        listing = json.loads(raw.decode('utf-8'))
        if not isinstance(listing, list):
            raise RuntimeError('Supabase storage list response is invalid.')
        return sorted(
            str(item.get('name') or '').strip()
            for item in listing
            if isinstance(item, dict) and str(item.get('name') or '').strip().endswith('.json')
        )

    def read_text(self, *, mode: SaveMode, save_space_id: str | None, file_name: str) -> str:
        object_path = urllib_parse.quote(self._object_path(mode, save_space_id, file_name), safe='/')
        raw = self._request(
            method='GET',
            path=f'/storage/v1/object/{urllib_parse.quote(self.bucket, safe="")}/{object_path}',
        )
        return raw.decode('utf-8-sig')

    def write_text(self, *, mode: SaveMode, save_space_id: str | None, file_name: str, content: str) -> None:
        object_path = urllib_parse.quote(self._object_path(mode, save_space_id, file_name), safe='/')
        self._request(
            method='POST',
            path=f'/storage/v1/object/{urllib_parse.quote(self.bucket, safe="")}/{object_path}',
            payload=content.encode('utf-8'),
            content_type='application/json',
        )


class SaveStore:
    def __init__(self, root_dir: Path | None = None) -> None:
        self.root_dir = Path(root_dir or SAVE_ROOT_DIR)
        self.backend = _SupabaseStorageBackend.from_env() or _LocalStorageBackend(self.root_dir)

    def _mode_dir(self, mode: SaveMode) -> Path:
        if mode not in _VALID_MODES:
            raise ValueError(f'Unsupported save mode: {mode}')
        return self.root_dir / mode

    def _runtime_rule(self, runtime: SaveRuntime) -> dict[str, Any]:
        rule = _RUNTIME_RULES.get(str(runtime).strip())
        if rule is None:
            raise ValueError(f'Unsupported save runtime: {runtime}')
        return rule

    def _load_record(self, *, mode: SaveMode, save_space_id: str | None, file_name: str) -> dict[str, Any]:
        return json.loads(self.backend.read_text(mode=mode, save_space_id=save_space_id, file_name=file_name))

    def _build_meta(self, record: dict[str, Any], file_name: str) -> dict[str, Any]:
        snapshot = record.get('snapshot') if isinstance(record, dict) else None
        session = snapshot.get('session') if isinstance(snapshot, dict) else None
        return {
            'file_name': file_name,
            'save_id': record.get('save_id', ''),
            'save_space_id': record.get('save_space_id', ''),
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

    def list_compatible_saves(self, *, runtime: SaveRuntime, save_space_id: str | None = None) -> list[dict[str, Any]]:
        rule = self._runtime_rule(runtime)
        resolved_space_id = _normalize_save_space_id(save_space_id)

        entries: list[dict[str, Any]] = []
        for file_name in self.backend.list_file_names(mode=rule['mode'], save_space_id=resolved_space_id):
            try:
                record = self._load_record(mode=rule['mode'], save_space_id=resolved_space_id, file_name=file_name)
            except (OSError, json.JSONDecodeError, RuntimeError, FileNotFoundError):
                continue
            if not self._is_record_compatible(record, runtime):
                continue
            entries.append(self._build_meta(record, file_name))
        entries.sort(key=lambda item: str(item.get('saved_at', '')), reverse=True)
        return entries

    def load_compatible_save(self, *, runtime: SaveRuntime, file_name: str, save_space_id: str | None = None) -> dict[str, Any]:
        rule = self._runtime_rule(runtime)
        resolved_name = str(file_name or '').strip()
        if not resolved_name or '/' in resolved_name or '\\' in resolved_name:
            raise ValueError('Invalid save file name.')
        resolved_space_id = _normalize_save_space_id(save_space_id)

        record = self._load_record(mode=rule['mode'], save_space_id=resolved_space_id, file_name=resolved_name)
        if not self._is_record_compatible(record, runtime):
            raise ValueError(f'Save file is not compatible with runtime: {runtime}')
        return {
            'meta': self._build_meta(record, resolved_name),
            'record': record,
        }

    def _build_record(
        self,
        *,
        mode: SaveMode,
        variant: str,
        snapshot: dict[str, Any],
        label: str | None,
        save_space_id: str | None,
        now: datetime | None,
    ) -> tuple[dict[str, Any], str]:
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
            'save_space_id': save_space_id or '',
            'mode': mode,
            'variant': resolved_variant,
            'label': resolved_label,
            'saved_at': timestamp.isoformat().replace('+00:00', 'Z'),
            'version': SAVE_FILE_VERSION,
            'snapshot': snapshot,
        }
        file_stem = _filenameify(resolved_label)
        existing_names = set(self.backend.list_file_names(mode=mode, save_space_id=save_space_id))
        file_name = f'{file_stem}.json'
        suffix = 2
        while file_name in existing_names:
            file_name = f'{file_stem}__{suffix:02d}.json'
            suffix += 1
        return record, file_name

    def save_snapshot(
        self,
        *,
        mode: SaveMode,
        variant: str,
        snapshot: dict[str, Any],
        label: str | None = None,
        save_space_id: str | None = None,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        resolved_space_id = _normalize_save_space_id(save_space_id)
        record, file_name = self._build_record(
            mode=mode,
            variant=variant,
            snapshot=snapshot,
            label=label,
            save_space_id=resolved_space_id,
            now=now,
        )
        self.backend.write_text(
            mode=mode,
            save_space_id=resolved_space_id,
            file_name=file_name,
            content=json.dumps(record, indent=2, sort_keys=True),
        )
        return {
            'save_id': record['save_id'],
            'save_space_id': record['save_space_id'],
            'mode': record['mode'],
            'variant': record['variant'],
            'label': record['label'],
            'saved_at': record['saved_at'],
            'version': record['version'],
            'file_name': file_name,
        }

    def describe_backend(self) -> dict[str, Any]:
        payload: dict[str, Any] = {'name': self.backend.name}
        if isinstance(self.backend, _SupabaseStorageBackend):
            payload['bucket'] = self.backend.bucket
            payload['prefix'] = self.backend.prefix
            payload['url'] = self.backend.base_url
        else:
            payload['root_dir'] = str(self.root_dir)
        return payload
