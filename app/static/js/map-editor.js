const DEFAULT_PROPERTY_STYLE = { fill: '#07b14d', text: '#edf6ff' };

function propertyStyle(meta) {
  return {
    fill: meta?.fill || DEFAULT_PROPERTY_STYLE.fill,
    text: meta?.text || DEFAULT_PROPERTY_STYLE.text,
  };
}

const FUEL_STYLES = {
  1: { fillFraction: 0.0, size: 10 },
  2: { fillFraction: 0.25, size: 10 },
  3: { fillFraction: 0.5, size: 10 },
  4: { fillFraction: 0.75, size: 10 },
  5: { fillFraction: 1.0, size: 10 },
};

const state = {
  nodes: [],
  projectedNodes: [],
  edges: [],
  calibration: null,
  propertyCodes: [],
  propertyMetaByCode: {},
  mode: 'navigate',
  routeStartId: null,
  view: {
    rotationLon: 0,
  },
  projection: {
    plot: null,
    fallback: null,
  },
  drag: {
    pointerDown: false,
    dragging: false,
    startX: 0,
    startY: 0,
    startRotationLon: 0,
    lastRelayoutPromise: null,
    rafScheduled: false,
  },
};

function getPlotDiv() {
  return document.getElementById('editor-map');
}

function getHitLayer() {
  return document.getElementById('editor-hitlayer');
}

function getRouteOverlay() {
  return document.getElementById('editor-routes');
}

function getNodeOverlay() {
  return document.getElementById('editor-nodes');
}

function normalizeLon(value) {
  let lon = value;
  while (lon > 180) {
    lon -= 360;
  }
  while (lon < -180) {
    lon += 360;
  }
  return lon;
}

function setStatus(message) {
  const status = document.getElementById('editor-status');
  if (status) {
    status.textContent = message;
  }
}

function modeLabel() {
  if (state.mode.startsWith('fuel-')) {
    return `Modo: abastecimento ${state.mode.split('-')[1]}`;
  }
  if (state.mode === 'chance') {
    return 'Modo: sorte / reves';
  }
  if (state.mode === 'route') {
    return state.routeStartId ? `Modo: rota | origem ${state.routeStartId}` : 'Modo: rota | aguardando ponto 1';
  }
  if (state.mode === 'port') {
    return 'Modo: porto / pedagio';
  }
  return 'Modo: navegar';
}

function updateModeHud() {
  const mode = document.getElementById('editor-mode');
  if (mode) {
    mode.textContent = modeLabel();
  }
}

function updateCursor() {
  const layer = getHitLayer();
  if (!layer) {
    return;
  }
  if (state.drag.dragging) {
    layer.style.cursor = 'grabbing';
    return;
  }
  layer.style.cursor = state.mode === 'navigate' ? 'grab' : 'crosshair';
}

function setMode(nextMode) {
  state.mode = nextMode;
  if (nextMode !== 'route') {
    state.routeStartId = null;
  }
  updateModeHud();
  updateCursor();
  if (nextMode === 'navigate') {
    setStatus('Clique curto edita. Arraste na horizontal para mover o globo.');
  }
}

function parseFuelLevel(node) {
  if (node.kind !== 'fuel') {
    return null;
  }
  if (/^[1-5]$/.test(node.label || '')) {
    return Number(node.label);
  }
  const match = (node.notes || '').match(/fuel_level=(\d)/);
  return match ? Number(match[1]) : 1;
}

function buildFallbackProjection() {
  const plot = getPlotDiv();
  if (!plot) {
    state.projection.fallback = null;
    return;
  }
  const rect = plot.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    state.projection.fallback = null;
    return;
  }
  state.projection.fallback = d3.geoNaturalEarth1()
    .rotate([state.view.rotationLon, 0, 0])
    .fitExtent(
      [[0, 0], [rect.width, rect.height]],
      { type: 'Sphere' },
    );
}

function syncPlotProjection() {
  const plot = getPlotDiv();
  const subplot = plot?._fullLayout?.geo?._subplot;
  state.projection.plot = subplot?.projection || subplot?.proj || subplot?._projection || null;
  buildFallbackProjection();
}

function activeProjection() {
  return state.projection.plot || state.projection.fallback;
}

function pointFromClient(clientX, clientY) {
  const plot = getPlotDiv();
  const projection = activeProjection();
  if (!plot || !projection || typeof projection.invert !== 'function') {
    return null;
  }
  const rect = plot.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const lonLat = projection.invert([x, y]);
  if (!lonLat) {
    return null;
  }
  return {
    x,
    y,
    lon: lonLat[0],
    lat: lonLat[1],
  };
}

function projectLonLat(lon, lat) {
  const projection = activeProjection();
  if (!projection || typeof projection !== 'function') {
    return null;
  }
  return projection([lon, lat]);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / ((dx * dx) + (dy * dy))));
  const x = ax + (t * dx);
  const y = ay + (t * dy);
  return Math.hypot(px - x, py - y);
}

function findNearestNode(screenX, screenY, threshold = 18) {
  let best = null;
  state.projectedNodes.forEach((node) => {
    if (node.lat === null || node.lon === null) {
      return;
    }
    const projected = projectLonLat(node.lon, node.lat);
    if (!projected) {
      return;
    }
    const distance = Math.hypot(screenX - projected[0], screenY - projected[1]);
    if (distance > threshold) {
      return;
    }
    if (!best || distance < best.distance) {
      best = { node, distance };
    }
  });
  return best?.node || null;
}

function findNearestEdge(screenX, screenY, threshold = 10) {
  const nodeById = Object.fromEntries(state.projectedNodes.map((node) => [node.id, node]));
  let best = null;
  state.edges.forEach((edge) => {
    const left = nodeById[edge.from_node_id];
    const right = nodeById[edge.to_node_id];
    if (!left || !right || left.lat === null || right.lat === null || left.lon === null || right.lon === null) {
      return;
    }
    const a = projectLonLat(left.lon, left.lat);
    const b = projectLonLat(right.lon, right.lat);
    if (!a || !b) {
      return;
    }
    const distance = distanceToSegment(screenX, screenY, a[0], a[1], b[0], b[1]);
    if (distance > threshold) {
      return;
    }
    if (!best || distance < best.distance) {
      best = { edge, distance };
    }
  });
  return best?.edge || null;
}

function propertyMeta(node) {
  return state.propertyMetaByCode[(node.label || '').toUpperCase()] || null;
}

function renderRouteOverlay() {
  const overlay = getRouteOverlay();
  const plot = getPlotDiv();
  if (!overlay || !plot) {
    return;
  }

  const rect = plot.getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  overlay.innerHTML = '';

  const nodeById = Object.fromEntries(state.projectedNodes.map((node) => [node.id, node]));
  const svgNs = 'http://www.w3.org/2000/svg';

  function appendSegment(x1, y1, x2, y2) {
    const segment = document.createElementNS(svgNs, 'line');
    segment.setAttribute('x1', x1);
    segment.setAttribute('y1', y1);
    segment.setAttribute('x2', x2);
    segment.setAttribute('y2', y2);
    segment.setAttribute('stroke', 'rgba(6, 17, 26, 0.78)');
    segment.setAttribute('stroke-width', '2.3');
    segment.setAttribute('stroke-linecap', 'round');
    overlay.appendChild(segment);
  }

  state.edges.forEach((edge) => {
    const left = nodeById[edge.from_node_id];
    const right = nodeById[edge.to_node_id];
    if (!left || !right || left.lat === null || right.lat === null || left.lon === null || right.lon === null) {
      return;
    }

    const a = projectLonLat(left.lon, left.lat);
    const b = projectLonLat(right.lon, right.lat);
    if (!a || !b) {
      return;
    }

    const x1 = a[0];
    const y1 = a[1];
    const x2 = b[0];
    const y2 = b[1];
    if (Math.abs(x1 - x2) > (rect.width / 2)) {
      if (x1 < x2) {
        appendSegment(x1 + rect.width, y1, x2, y2);
        appendSegment(x1, y1, x2 - rect.width, y2);
        return;
      }
      appendSegment(x1 - rect.width, y1, x2, y2);
      appendSegment(x1, y1, x2 + rect.width, y2);
      return;
    }

    appendSegment(x1, y1, x2, y2);
  });
}


function renderNodeOverlay() {
  const overlay = getNodeOverlay();
  const plot = getPlotDiv();
  if (!overlay || !plot) {
    return;
  }

  const rect = plot.getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  overlay.innerHTML = '';

  const svgNs = 'http://www.w3.org/2000/svg';

  function appendCircle(cx, cy, radius, fill, stroke, strokeWidth) {
    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', stroke);
    circle.setAttribute('stroke-width', strokeWidth);
    overlay.appendChild(circle);
    return circle;
  }

  function appendFuelMarker(cx, cy, radius, fillFraction) {
    const base = appendCircle(cx, cy, radius, '#ffffff', '#06111a', 1.7);
    if (fillFraction <= 0) {
      return base;
    }
    if (fillFraction >= 1) {
      base.setAttribute('fill', '#06111a');
      return base;
    }

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * fillFraction);
    const x1 = cx + (radius * Math.cos(startAngle));
    const y1 = cy + (radius * Math.sin(startAngle));
    const x2 = cx + (radius * Math.cos(endAngle));
    const y2 = cy + (radius * Math.sin(endAngle));
    const largeArc = fillFraction > 0.5 ? 1 : 0;

    const wedge = document.createElementNS(svgNs, 'path');
    wedge.setAttribute('d', `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`);
    wedge.setAttribute('fill', '#06111a');
    overlay.appendChild(wedge);

    const border = document.createElementNS(svgNs, 'circle');
    border.setAttribute('cx', cx);
    border.setAttribute('cy', cy);
    border.setAttribute('r', radius);
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', '#06111a');
    border.setAttribute('stroke-width', '1.7');
    overlay.appendChild(border);
    return border;
  }

  function appendDiamond(cx, cy, radius, fill, stroke, strokeWidth) {
    const diamond = document.createElementNS(svgNs, 'polygon');
    diamond.setAttribute(
      'points',
      `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`,
    );
    diamond.setAttribute('fill', fill);
    diamond.setAttribute('stroke', stroke);
    diamond.setAttribute('stroke-width', strokeWidth);
    overlay.appendChild(diamond);
    return diamond;
  }

  function appendLabel(x, y, textValue, fill, size, weight = '600') {
    const textNode = document.createElementNS(svgNs, 'text');
    textNode.setAttribute('x', x);
    textNode.setAttribute('y', y);
    textNode.setAttribute('fill', fill);
    textNode.setAttribute('font-size', size);
    textNode.setAttribute('font-weight', weight);
    textNode.setAttribute('text-anchor', 'middle');
    textNode.setAttribute('dominant-baseline', 'central');
    textNode.textContent = textValue;
    overlay.appendChild(textNode);
    return textNode;
  }

  state.projectedNodes.forEach((node) => {
    if (node.lat === null || node.lon === null) {
      return;
    }
    const projected = projectLonLat(node.lon, node.lat);
    if (!projected) {
      return;
    }
    const [x, y] = projected;

    if (node.kind === 'fuel') {
      const fuelStyle = FUEL_STYLES[parseFuelLevel(node)] || FUEL_STYLES[1];
      appendFuelMarker(x, y, (fuelStyle.size || 10) / 2, fuelStyle.fillFraction ?? 0);
      return;
    }

    if (node.kind === 'chance') {
      appendCircle(x, y, 6.9, '#f8fafc', '#06111a', 3.2);
      return;
    }

    if (node.kind === 'port' || node.kind === 'toll') {
      const meta = propertyMeta(node);
      const style = propertyStyle(meta);
      if (node.kind === 'port') {
        appendCircle(x, y, 12, style.fill, '#06111a', 2.2);
        appendLabel(x, y + 0.5, node.label || node.id.toUpperCase(), style.text, 9);
      } else {
        appendDiamond(x, y, 13, style.fill, '#06111a', 2.2);
        appendLabel(x, y + 0.5, node.label || node.id.toUpperCase(), style.text, 8);
      }
      return;
    }
  });

  if (state.routeStartId) {
    const selected = state.projectedNodes.find((node) => node.id === state.routeStartId);
    if (selected && selected.lat !== null && selected.lon !== null) {
      const projected = projectLonLat(selected.lon, selected.lat);
      if (projected) {
        appendCircle(projected[0], projected[1], 14, 'none', '#38bdf8', 3);
      }
    }
  }
}

function normalEdgeLines() {
  const nodeById = Object.fromEntries(state.projectedNodes.map((node) => [node.id, node]));
  const lon = [];
  const lat = [];

  state.edges.forEach((edge) => {
    const left = nodeById[edge.from_node_id];
    const right = nodeById[edge.to_node_id];
    if (!left || !right || left.lat === null || right.lat === null || left.lon === null || right.lon === null) {
      return;
    }
    const xDelta = Math.abs((left.x ?? 0) - (right.x ?? 0));
    const lonDelta = Math.abs((left.lon ?? 0) - (right.lon ?? 0));
    if (lonDelta > 300 || xDelta > 1800) {
      const leftBoundaryLon = left.lon >= 0 ? 179.5 : -179.5;
      const rightBoundaryLon = right.lon >= 0 ? 179.5 : -179.5;
      lon.push(left.lon, leftBoundaryLon, null, rightBoundaryLon, right.lon, null);
      lat.push(left.lat, left.lat, null, right.lat, right.lat, null);
      return;
    }
    lon.push(left.lon, right.lon, null);
    lat.push(left.lat, right.lat, null);
  });

  return { lon, lat };
}

function propertyTraces(kind, symbol, size) {
  const groups = {};
  state.projectedNodes
    .filter((node) => node.kind === kind)
    .forEach((node) => {
      const meta = propertyMeta(node);
      const continent = meta?.continent || 'NA';
      if (!groups[continent]) {
        groups[continent] = [];
      }
      groups[continent].push(node);
    });

  return Object.entries(groups).map(([continent, nodes]) => {
    const style = propertyStyle({ fill: nodes[0]?.fill, text: nodes[0]?.text });
    return {
      type: 'scattergeo',
      mode: 'markers+text',
      lon: nodes.map((node) => node.lon),
      lat: nodes.map((node) => node.lat),
      text: nodes.map((node) => node.label || node.id.toUpperCase()),
      textposition: 'middle center',
      marker: {
        size,
        symbol,
        color: style.fill,
        line: { width: 2.2, color: '#06111a' },
      },
      textfont: {
        size: kind === 'toll' ? 8 : 9,
        color: style.text,
      },
      hoverinfo: 'skip',
      showlegend: false,
    };
  });
}

function currentLayout() {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 0, r: 0, t: 0, b: 0 },
    showlegend: false,
    geo: {
      scope: 'world',
      projection: {
        type: 'natural earth',
        rotation: {
          lon: state.view.rotationLon,
          lat: 0,
          roll: 0,
        },
      },
      showframe: false,
      showcoastlines: true,
      coastlinecolor: 'rgba(255,255,255,0.22)',
      coastlinewidth: 0.8,
      showland: true,
      landcolor: '#8fa3b8',
      showocean: true,
      oceancolor: '#0b7bc0',
      showcountries: true,
      countrycolor: 'rgba(255,255,255,0.18)',
      countrywidth: 0.6,
      bgcolor: 'rgba(0,0,0,0)',
    },
    uirevision: 'editor-map',
  };
}

function buildTraces() {
  return [
    {
      type: 'scattergeo',
      mode: 'markers',
      lon: [0],
      lat: [0],
      marker: {
        size: 1,
        color: 'rgba(0,0,0,0)',
      },
      hoverinfo: 'skip',
      showlegend: false,
    },
  ];
}

async function renderMap() {
  buildFallbackProjection();
  const plot = getPlotDiv();
  await Plotly.react(plot, buildTraces(), currentLayout(), { displayModeBar: false, responsive: true });
  syncPlotProjection();
  renderRouteOverlay();
  renderNodeOverlay();
  updateCursor();
}

function scheduleHorizontalRelayout() {
  if (state.drag.rafScheduled) {
    return;
  }
  state.drag.rafScheduled = true;
  window.requestAnimationFrame(() => {
    state.drag.rafScheduled = false;
    const plot = getPlotDiv();
    if (!plot) {
      return;
    }
    buildFallbackProjection();
    state.drag.lastRelayoutPromise = Plotly.relayout(plot, {
      'geo.projection.rotation.lon': state.view.rotationLon,
      'geo.projection.rotation.lat': 0,
      'geo.projection.rotation.roll': 0,
    }).then(() => {
      syncPlotProjection();
      renderRouteOverlay();
      renderNodeOverlay();
    });
  });
}

async function settleProjection() {
  if (state.drag.lastRelayoutPromise) {
    try {
      await state.drag.lastRelayoutPromise;
    } finally {
      state.drag.lastRelayoutPromise = null;
    }
  }
  syncPlotProjection();
}

async function applySnapshot(payload) {
  state.nodes = payload.nodes;
  state.projectedNodes = payload.projected_nodes || payload.nodes;
  state.edges = payload.edges;
  state.calibration = payload.calibration;
  state.propertyCodes = payload.property_codes || state.propertyCodes;
  state.propertyMetaByCode = Object.fromEntries(
    (payload.reference_properties || []).map((item) => [item.code, item]),
  );
  await renderMap();
  updateModeHud();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = 'Falha ao salvar no mapa.';
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch (_error) {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

async function addFuel(lat, lon, fuelLevel) {
  const payload = await fetchJson('/api/map/editor/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'fuel', lat, lon, fuel_level: fuelLevel }),
  });
  await applySnapshot(payload);
  setStatus(`Abastecimento ${fuelLevel} salvo no mapa oficial.`);
}

async function addChance(lat, lon) {
  const payload = await fetchJson('/api/map/editor/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'chance', lat, lon }),
  });
  await applySnapshot(payload);
  setStatus('Sorte / reves salvo no mapa oficial.');
}

async function addProperty(lat, lon) {
  const value = window.prompt('Codigo do porto ou pedagio (ex.: RIO, CAP):', 'RIO');
  if (!value) {
    setStatus('Inclusao de porto / pedagio cancelada.');
    return;
  }
  const code = value.trim().toUpperCase();
  if (!state.propertyCodes.includes(code)) {
    setStatus(`Codigo invalido: ${code}.`);
    return;
  }
  const meta = state.propertyMetaByCode[code];
  if (!meta || (meta.kind !== 'port' && meta.kind !== 'toll')) {
    setStatus(`Codigo invalido: ${code}.`);
    return;
  }
  const payload = await fetchJson('/api/map/editor/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: meta.kind, lat, lon, label: code }),
  });
  await applySnapshot(payload);
  const kindLabel = meta.kind === 'port' ? 'Porto' : 'Pedagio';
  setStatus(`${kindLabel} ${code} salvo no mapa oficial.`);
}

async function addEdge(fromNodeId, toNodeId) {
  const payload = await fetchJson('/api/map/editor/edges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_node_id: fromNodeId, to_node_id: toNodeId }),
  });
  state.routeStartId = null;
  await applySnapshot(payload);
  setStatus('Rota salva no mapa oficial.');
}

async function deleteNode(nodeId) {
  const payload = await fetchJson(`/api/map/editor/nodes/${nodeId}`, { method: 'DELETE' });
  if (state.routeStartId === nodeId) {
    state.routeStartId = null;
  }
  await applySnapshot(payload);
  setStatus(`Ponto ${nodeId} removido do mapa oficial.`);
}

async function deleteEdge(edgeId) {
  const payload = await fetchJson(`/api/map/editor/edges/${edgeId}`, { method: 'DELETE' });
  await applySnapshot(payload);
  setStatus(`Rota ${edgeId} removida do mapa oficial.`);
}

async function handleShortLeftClick(clientX, clientY) {
  await settleProjection();
  const pointer = pointFromClient(clientX, clientY);
  if (!pointer) {
    setStatus('Nao foi possivel ler a posicao do clique no mapa.');
    return;
  }

  if (state.mode.startsWith('fuel-')) {
    await addFuel(pointer.lat, pointer.lon, Number(state.mode.split('-')[1]));
    return;
  }

  if (state.mode === 'chance') {
    await addChance(pointer.lat, pointer.lon);
    return;
  }

  if (state.mode === 'port') {
    await addProperty(pointer.lat, pointer.lon);
    return;
  }

  if (state.mode === 'route') {
    const targetNode = findNearestNode(pointer.x, pointer.y, 20);
    if (!targetNode) {
      setStatus('No modo rota, clique em um ponto existente.');
      return;
    }
    if (!state.routeStartId) {
      state.routeStartId = targetNode.id;
      updateModeHud();
      await renderMap();
      setStatus(`Ponto 1: ${targetNode.id}. Agora clique no ponto 2.`);
      return;
    }
    if (state.routeStartId === targetNode.id) {
      setStatus('Escolha um segundo ponto diferente.');
      return;
    }
    await addEdge(state.routeStartId, targetNode.id);
    return;
  }

  setStatus(`Cursor em ${pointer.lat.toFixed(2)}, ${pointer.lon.toFixed(2)}.`);
}

async function handleRightClick(clientX, clientY) {
  await settleProjection();
  const pointer = pointFromClient(clientX, clientY);
  if (!pointer) {
    setStatus('Nao foi possivel ler a posicao do clique no mapa.');
    return;
  }
  const nearestNode = findNearestNode(pointer.x, pointer.y, 18);
  if (nearestNode) {
    if (nearestNode.kind === 'fuel' || nearestNode.kind === 'chance') {
      await deleteNode(nearestNode.id);
      return;
    }
    if (nearestNode.kind === 'port' || nearestNode.kind === 'toll') {
      setStatus('Use a tecla p para reposicionar portos e pedagios.');
      return;
    }
  }
  const nearestEdge = findNearestEdge(pointer.x, pointer.y, 10);
  if (nearestEdge) {
    await deleteEdge(nearestEdge.id);
    return;
  }
  setStatus('Nenhum objeto editavel encontrado sob o cursor.');
}

function beginDrag(event) {
  if (event.button !== 0) {
    return;
  }
  state.drag.pointerDown = true;
  state.drag.dragging = false;
  state.drag.startX = event.clientX;
  state.drag.startY = event.clientY;
  state.drag.startRotationLon = state.view.rotationLon;
  updateCursor();
}

function moveDrag(event) {
  if (!state.drag.pointerDown) {
    return;
  }
  const deltaX = event.clientX - state.drag.startX;
  const deltaY = event.clientY - state.drag.startY;
  if (!state.drag.dragging && (Math.abs(deltaX) >= 6 || Math.abs(deltaY) >= 6)) {
    state.drag.dragging = true;
    updateCursor();
  }
  if (!state.drag.dragging) {
    return;
  }
  const layer = getHitLayer();
  const sensitivity = 180 / Math.max(720, layer.clientWidth);
  state.view.rotationLon = normalizeLon(state.drag.startRotationLon + (deltaX * sensitivity));
  buildFallbackProjection();
  renderRouteOverlay();
  renderNodeOverlay();
  scheduleHorizontalRelayout();
  setStatus(`Globo em ${state.view.rotationLon.toFixed(1)} graus.`);
}

async function endDrag(event) {
  if (event.button !== 0 || !state.drag.pointerDown) {
    return;
  }
  const wasDragging = state.drag.dragging;
  state.drag.pointerDown = false;
  state.drag.dragging = false;
  updateCursor();

  if (wasDragging) {
    await settleProjection();
    return;
  }
  await handleShortLeftClick(event.clientX, event.clientY);
}

function cancelDrag() {
  state.drag.pointerDown = false;
  state.drag.dragging = false;
  updateCursor();
}

function handleKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.key >= '1' && event.key <= '5') {
    setMode(`fuel-${event.key}`);
    return;
  }
  if (event.key === 's' || event.key === 'S') {
    setMode('chance');
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    setMode('route');
    setStatus('Clique no ponto 1 da rota.');
    void renderMap();
    return;
  }
  if (event.key === 'p' || event.key === 'P') {
    setMode('port');
    setStatus('Clique no mapa para posicionar porto ou pedagio.');
    return;
  }
  if (event.key === 'Escape') {
    setMode('navigate');
    void renderMap();
  }
}

async function bootstrap() {
  const payload = await fetchJson('/api/map/editor/bootstrap');
  await applySnapshot(payload);
  setStatus('Editor pronto. Toda alteracao salva direto no mapa oficial.');
}

document.addEventListener('DOMContentLoaded', async () => {
  const layer = getHitLayer();

  layer.addEventListener('mousedown', beginDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', (event) => {
    endDrag(event).catch((error) => setStatus(error.message));
  });
  layer.addEventListener('mouseleave', () => {
    if (!state.drag.pointerDown && !state.drag.dragging) {
      return;
    }
    cancelDrag();
  });
  layer.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    handleRightClick(event.clientX, event.clientY).catch((error) => setStatus(error.message));
  });
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', () => {
    renderMap().catch((error) => setStatus(error.message));
    Plotly.Plots.resize(getPlotDiv());
  });

  await bootstrap();
  updateModeHud();
  updateCursor();
});
