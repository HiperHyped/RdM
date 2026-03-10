from __future__ import annotations

import re
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from app.config import STATIC_DIR, TEMPLATE_DIR
from app.maptools import (
    BoardEdgeRecord,
    BoardNodeCreate,
    BoardNodeRecord,
    BoardWorkspaceRepository,
    CalibrationConfig,
    MapWorkspaceSnapshot,
    geo_to_pixel,
    project_node_records,
)
from app.services import build_chance_cards, build_freight_permission_cards, build_port_title_cards, build_toll_title_cards, build_ui_bootstrap, load_game_data


class GameSetupRequest(BaseModel):
    company_name: str = Field(default='Minha Companhia', min_length=1, max_length=28)
    color_id: str
    rival_count: int = Field(default=5, ge=2, le=5)


class EditorNodeCreate(BaseModel):
    kind: Literal['port', 'toll', 'fuel', 'chance']
    lat: float
    lon: float
    fuel_level: int | None = Field(default=None, ge=1, le=5)
    label: str = ''


class EditorEdgeCreate(BaseModel):
    from_node_id: str
    to_node_id: str


class EditorDeleteRequest(BaseModel):
    edge_id: str


def _inject_known_geo(payload: BoardNodeCreate, known_properties: dict[str, Any]) -> BoardNodeCreate:
    label = payload.label.strip().upper()
    if payload.kind not in {'port', 'toll'} or not label:
        return payload

    card = known_properties.get(label)
    if card is None or card.lat is None or card.lon is None:
        return payload

    return payload.model_copy(update={'label': label, 'lat': card.lat, 'lon': card.lon})


def _serialize_snapshot(
    snapshot: MapWorkspaceSnapshot,
    known_properties: dict[str, Any],
    continent_styles: dict[str, dict[str, str]],
) -> dict[str, Any]:
    projected = project_node_records(snapshot.nodes, snapshot.calibration)
    return {
        'nodes': [node.model_dump(mode='json') for node in snapshot.nodes],
        'projected_nodes': [node.model_dump(mode='json') for node in projected],
        'edges': [edge.model_dump(mode='json') for edge in snapshot.edges],
        'calibration': snapshot.calibration.model_dump(mode='json'),
        'reference_properties': [
            {
                'code': card.code,
                'name': card.name,
                'kind': card.kind.value,
                'continent': card.continent,
                'lat': card.lat,
                'lon': card.lon,
                'fill': continent_styles.get(card.continent, {}).get('fill', '#07b14d'),
                'text': continent_styles.get(card.continent, {}).get('text', '#edf6ff'),
            }
            for card in known_properties.values()
            if card.lat is not None and card.lon is not None
        ],
    }


def _next_edge_id(edges: list[BoardEdgeRecord]) -> str:
    highest = 0
    for edge in edges:
        match = re.search(r'(\d+)$', edge.id)
        if match:
            highest = max(highest, int(match.group(1)))
    return f'edge-{highest + 1:03d}'


def _next_node_id(nodes: list[BoardNodeRecord], prefix: str) -> str:
    highest = 0
    pattern = re.compile(rf'^{re.escape(prefix)}-(\d+)$')
    for node in nodes:
        match = pattern.match(node.id)
        if match:
            highest = max(highest, int(match.group(1)))
    return f'{prefix}-{highest + 1:03d}'


def _persist_snapshot(workspace: BoardWorkspaceRepository, nodes: list[BoardNodeRecord], edges: list[BoardEdgeRecord]) -> MapWorkspaceSnapshot:
    calibration = workspace.load_calibration()
    snapshot = MapWorkspaceSnapshot(nodes=nodes, edges=edges, calibration=calibration)
    workspace.save_snapshot(snapshot)
    return snapshot


def _sync_property_nodes(
    snapshot: MapWorkspaceSnapshot,
    known_properties: dict[str, Any],
) -> tuple[MapWorkspaceSnapshot, bool]:
    existing_codes = {
        node.label.strip().upper()
        for node in snapshot.nodes
        if node.kind in {'port', 'toll'} and node.label
    }
    missing_nodes: list[BoardNodeRecord] = []

    for card in known_properties.values():
        if card.kind.value not in {'port', 'toll'}:
            continue
        if card.lat is None or card.lon is None or card.code in existing_codes:
            continue
        x, y = geo_to_pixel(card.lat, card.lon, snapshot.calibration)
        missing_nodes.append(
            BoardNodeRecord(
                id=card.code.lower(),
                kind=card.kind.value,
                label=card.code,
                x=x,
                y=y,
                route_id=None,
                order=None,
                lat=card.lat,
                lon=card.lon,
                notes='property-anchor',
            )
        )

    if not missing_nodes:
        return snapshot, False

    merged_nodes = list(snapshot.nodes) + missing_nodes
    merged_nodes.sort(key=lambda node: (0 if node.kind in {'port', 'toll'} else 1, node.id))
    return (
        MapWorkspaceSnapshot(
            nodes=merged_nodes,
            edges=snapshot.edges,
            calibration=snapshot.calibration,
        ),
        True,
    )


def _load_synced_snapshot(
    workspace: BoardWorkspaceRepository,
    known_properties: dict[str, Any],
) -> MapWorkspaceSnapshot:
    snapshot = workspace.load_snapshot()
    synced_snapshot, changed = _sync_property_nodes(snapshot, known_properties)
    if changed:
        workspace.save_snapshot(synced_snapshot)
        return synced_snapshot
    return snapshot


def create_app() -> FastAPI:
    app = FastAPI(title='Rei dos Mares')
    app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')
    templates = Jinja2Templates(directory=str(TEMPLATE_DIR))
    workspace = BoardWorkspaceRepository()
    data = load_game_data()

    @app.get('/', response_class=HTMLResponse)
    async def index(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='index.html',
            context={'page_title': 'Rei dos Mares'},
        )

    @app.get('/tools/map', response_class=HTMLResponse)
    async def map_tool(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='map_tool.html',
            context={'page_title': 'Ferramenta de Coordenadas'},
        )

    @app.get('/tools/map-editor', response_class=HTMLResponse)
    async def map_editor(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='map_editor.html',
            context={'page_title': 'Editor do Mapa'},
        )

    @app.get('/preview/game-ui', response_class=HTMLResponse)
    async def game_preview(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='game_preview.html',
            context={'page_title': 'Preview do Jogo'},
        )

    @app.get('/preview/port-titles', response_class=HTMLResponse)
    async def port_titles_preview(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='port_titles_preview.html',
            context={
                'page_title': 'Titulos de Porto',
                'port_cards': build_port_title_cards(),
                'toll_cards': build_toll_title_cards(),
            },
        )

    @app.get('/preview/chance-cards', response_class=HTMLResponse)
    async def chance_cards_preview(request: Request) -> HTMLResponse:
        cards = build_chance_cards()
        return templates.TemplateResponse(
            request=request,
            name='chance_cards_preview.html',
            context={
                'page_title': 'Cartoes de Sorte e Reves',
                'fortune_cards': [card for card in cards if card['category'] == 'sorte'],
                'setback_cards': [card for card in cards if card['category'] == 'reves'],
            },
        )

    @app.get('/preview/chance-card-draw', response_class=HTMLResponse)
    async def chance_card_draw_preview(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='chance_card_draw_preview.html',
            context={
                'page_title': 'Sorteio de Sorte e Reves',
                'cards': build_chance_cards(),
            },
        )

    @app.get('/preview/freight-permissions', response_class=HTMLResponse)
    async def freight_permissions_preview(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='freight_permissions_preview.html',
            context={
                'page_title': 'Permissoes de Frete',
                'cards': build_freight_permission_cards(),
            },
        )

    @app.get('/preview/freight-permission-draw', response_class=HTMLResponse)
    async def freight_permission_draw_preview(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='freight_permission_draw_preview.html',
            context={
                'page_title': 'Sorteio de Permissao de Frete',
                'cards': build_freight_permission_cards(),
            },
        )

    @app.get('/preview/origin-port-draw', response_class=HTMLResponse)
    async def origin_port_draw_preview(request: Request) -> HTMLResponse:
        cards = build_port_title_cards()
        return templates.TemplateResponse(
            request=request,
            name='port_draw_preview.html',
            context={
                'page_title': 'Sorteio do Porto de Saida',
                'mode': 'origin',
                'cards': cards,
                'default_origin': 'RIO',
            },
        )

    @app.get('/preview/destination-port-draw', response_class=HTMLResponse)
    async def destination_port_draw_preview(request: Request) -> HTMLResponse:
        cards = build_port_title_cards()
        return templates.TemplateResponse(
            request=request,
            name='port_draw_preview.html',
            context={
                'page_title': 'Sorteio do Porto de Destino',
                'mode': 'destination',
                'cards': cards,
                'default_origin': 'RIO',
            },
        )

    @app.get('/preview/toll-draw', response_class=HTMLResponse)
    async def toll_draw_preview(request: Request) -> HTMLResponse:
        cards = build_toll_title_cards()
        return templates.TemplateResponse(
            request=request,
            name='port_draw_preview.html',
            context={
                'page_title': 'Sorteio do Pedagio',
                'mode': 'toll',
                'cards': cards,
                'default_origin': 'RIO',
            },
        )

    @app.get('/preview/movement-dice', response_class=HTMLResponse)
    async def movement_dice_preview(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request=request,
            name='movement_dice_preview.html',
            context={
                'page_title': 'Sorteio dos Dados de Movimento',
            },
        )

    @app.get('/api/bootstrap')
    async def bootstrap() -> dict[str, Any]:
        return build_ui_bootstrap()

    @app.post('/api/game/setup')
    async def game_setup(payload: GameSetupRequest) -> dict[str, Any]:
        return build_ui_bootstrap(
            company_name=payload.company_name,
            human_color_id=payload.color_id,
            rival_count=payload.rival_count,
        )

    @app.get('/api/map/bootstrap')
    async def map_bootstrap() -> dict[str, Any]:
        snapshot = _load_synced_snapshot(workspace, data.properties)
        return _serialize_snapshot(snapshot, data.properties, data.continent_styles)

    @app.get('/api/map/editor/bootstrap')
    async def map_editor_bootstrap() -> dict[str, Any]:
        snapshot = _load_synced_snapshot(workspace, data.properties)
        payload = _serialize_snapshot(snapshot, data.properties, data.continent_styles)
        payload['property_codes'] = sorted(
            card.code for card in data.properties.values() if card.kind.value in {'port', 'toll'}
        )
        return payload

    @app.post('/api/map/nodes')
    async def create_map_node(node: BoardNodeCreate) -> dict[str, Any]:
        enriched = _inject_known_geo(node, data.properties)
        created = workspace.create_node(enriched)
        snapshot = workspace.load_snapshot()
        projected = project_node_records(snapshot.nodes, snapshot.calibration)
        return {
            'created': created.model_dump(mode='json'),
            'nodes': [item.model_dump(mode='json') for item in snapshot.nodes],
            'projected_nodes': [item.model_dump(mode='json') for item in projected],
        }

    @app.delete('/api/map/nodes/{node_id}')
    async def delete_map_node(node_id: str) -> dict[str, Any]:
        deleted = workspace.delete_node(node_id)
        if not deleted:
            raise HTTPException(status_code=404, detail='Node not found.')
        snapshot = workspace.load_snapshot()
        projected = project_node_records(snapshot.nodes, snapshot.calibration)
        return {
            'deleted': node_id,
            'nodes': [item.model_dump(mode='json') for item in snapshot.nodes],
            'projected_nodes': [item.model_dump(mode='json') for item in projected],
        }

    @app.put('/api/map/calibration')
    async def save_calibration(calibration: CalibrationConfig) -> dict[str, Any]:
        saved = workspace.save_calibration(calibration)
        projected = project_node_records(workspace.load_nodes(), saved)
        return {
            'calibration': saved.model_dump(mode='json'),
            'projected_nodes': [item.model_dump(mode='json') for item in projected],
        }

    @app.post('/api/map/editor/nodes')
    async def editor_create_node(payload: EditorNodeCreate) -> dict[str, Any]:
        calibration = workspace.load_calibration()
        nodes = workspace.load_nodes()
        edges = workspace.load_edges()
        x, y = geo_to_pixel(payload.lat, payload.lon, calibration)

        if payload.kind in {'port', 'toll'}:
            code = payload.label.strip().upper()
            property_card = data.properties.get(code)
            if property_card is None or property_card.kind.value != payload.kind:
                raise HTTPException(status_code=400, detail='Codigo de porto/pedagio invalido.')

            existing = next(
                (node for node in nodes if node.kind == payload.kind and node.label.upper() == code),
                None,
            )
            record = BoardNodeRecord(
                id=existing.id if existing else code.lower(),
                kind=payload.kind,
                label=code,
                x=x,
                y=y,
                route_id=None,
                order=None,
                lat=payload.lat,
                lon=payload.lon,
                notes=f'manual-{payload.kind}',
            )
            if existing:
                nodes = [record if node.id == existing.id else node for node in nodes]
            else:
                nodes.append(record)
            snapshot = _persist_snapshot(workspace, nodes, edges)
            return _serialize_snapshot(snapshot, data.properties, data.continent_styles)

        if payload.kind == 'fuel' and payload.fuel_level is None:
            raise HTTPException(status_code=400, detail='Fuel level is required.')

        if payload.kind == 'fuel':
            fuel_level = int(payload.fuel_level or 1)
            record = BoardNodeRecord(
                id=_next_node_id(nodes, 'fuel'),
                kind='fuel',
                label=str(fuel_level),
                x=x,
                y=y,
                route_id=None,
                order=None,
                lat=payload.lat,
                lon=payload.lon,
                notes=f'fuel_level={fuel_level}; fuel_value={fuel_level * 5}; manual=true',
            )
        else:
            record = BoardNodeRecord(
                id=_next_node_id(nodes, 'chance'),
                kind='chance',
                label='',
                x=x,
                y=y,
                route_id=None,
                order=None,
                lat=payload.lat,
                lon=payload.lon,
                notes='manual-chance',
            )

        nodes.append(record)
        snapshot = _persist_snapshot(workspace, nodes, edges)
        return _serialize_snapshot(snapshot, data.properties, data.continent_styles)

    @app.delete('/api/map/editor/nodes/{node_id}')
    async def editor_delete_node(node_id: str) -> dict[str, Any]:
        nodes = workspace.load_nodes()
        edges = workspace.load_edges()
        target_node = next((node for node in nodes if node.id == node_id), None)
        if target_node is None:
            raise HTTPException(status_code=404, detail='Node not found.')
        if target_node.kind in {'port', 'toll'}:
            raise HTTPException(status_code=400, detail='Portos e pedagios sao fixos no tabuleiro.')
        filtered_nodes = [node for node in nodes if node.id != node_id]
        filtered_edges = [edge for edge in edges if edge.from_node_id != node_id and edge.to_node_id != node_id]
        snapshot = _persist_snapshot(workspace, filtered_nodes, filtered_edges)
        return _serialize_snapshot(snapshot, data.properties, data.continent_styles)

    @app.post('/api/map/editor/edges')
    async def editor_create_edge(payload: EditorEdgeCreate) -> dict[str, Any]:
        nodes = workspace.load_nodes()
        edges = workspace.load_edges()
        node_ids = {node.id for node in nodes}
        if payload.from_node_id not in node_ids or payload.to_node_id not in node_ids:
            raise HTTPException(status_code=400, detail='Node not found for edge.')
        if payload.from_node_id == payload.to_node_id:
            raise HTTPException(status_code=400, detail='A rota precisa ligar dois pontos diferentes.')
        already_exists = next(
            (
                edge
                for edge in edges
                if {edge.from_node_id, edge.to_node_id} == {payload.from_node_id, payload.to_node_id}
            ),
            None,
        )
        if already_exists is not None:
            snapshot = MapWorkspaceSnapshot(nodes=nodes, edges=edges, calibration=workspace.load_calibration())
            return _serialize_snapshot(snapshot, data.properties, data.continent_styles)

        edges.append(
            BoardEdgeRecord(
                id=_next_edge_id(edges),
                from_node_id=payload.from_node_id,
                to_node_id=payload.to_node_id,
            )
        )
        snapshot = _persist_snapshot(workspace, nodes, edges)
        return _serialize_snapshot(snapshot, data.properties, data.continent_styles)

    @app.delete('/api/map/editor/edges/{edge_id}')
    async def editor_delete_edge(edge_id: str) -> dict[str, Any]:
        nodes = workspace.load_nodes()
        edges = workspace.load_edges()
        filtered_edges = [edge for edge in edges if edge.id != edge_id]
        if len(filtered_edges) == len(edges):
            raise HTTPException(status_code=404, detail='Edge not found.')
        snapshot = _persist_snapshot(workspace, nodes, filtered_edges)
        return _serialize_snapshot(snapshot, data.properties, data.continent_styles)

    return app
