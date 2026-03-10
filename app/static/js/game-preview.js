const DEFAULT_PROPERTY_STYLE = { fill: '#07b14d', text: '#edf6ff' };
const FUEL_STYLES = {
  1: { fillFraction: 0, size: 10 },
  2: { fillFraction: 0.25, size: 10 },
  3: { fillFraction: 0.5, size: 10 },
  4: { fillFraction: 0.75, size: 10 },
  5: { fillFraction: 1, size: 10 },
};

const state = {
  nodes: [],
  projectedNodes: [],
  edges: [],
  nodesById: {},
  adjacency: {},
  propertyNodesByCode: {},
  propertyMetaByCode: {},
  portCards: [],
  tollCards: [],
  chanceCards: [],
  freightPermissionCards: [],
  propertyCardsByCode: {},
  playerColors: [],
  players: [],
  rivals: [],
  humanCompany: null,
  activeContract: null,
  session: null,
  assets: { ship_masks: {}, cargo_icons: {} },
  distances: {},
  rules: {},
  flow: { openingRoundRunning: false },
  setup: {
    started: false,
    companyName: '',
    selectedColorId: '',
    rivalCount: 5,
    submitting: false,
  },
  permissionDraw: {
    drawing: false,
    selectedCardId: '',
    order: [],
    frame: 0,
    rafId: 0,
    resolver: null,
  },
  portDraw: {
    drawing: false,
    mode: 'origin',
    originCode: '',
    tollCode: '',
    selectedCardCode: '',
    order: [],
    frame: 0,
    rafId: 0,
    resolver: null,
    extraPrimary: null,
    extraSecondary: null,
  },
  movementDice: {
    rolling: false,
    values: [1, 1],
    finalValues: [1, 1],
    rafId: 0,
    resolver: null,
  },
  decision: {
    resolver: null,
  },
  view: {
    rotationLon: -18,
    zoom: 1,
  },
  projection: {
    plot: null,
    fallback: null,
  },
  drag: {
    pointerDown: false,
    dragging: false,
    startX: 0,
    startRotationLon: 0,
    lastRelayoutPromise: null,
    rafScheduled: false,
  },
};

function byId(id) {
  return document.getElementById(id);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatCurrency(value) {
  return `$ ${Number(value || 0).toLocaleString('pt-BR')}`;
}

function normalizeLon(value) {
  let lon = value;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDie() {
  return 1 + Math.floor(Math.random() * 6);
}

function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

function setHtml(id, value) {
  const node = byId(id);
  if (node) node.innerHTML = value;
}

function propertyStyle(meta) {
  return {
    fill: meta?.fill || DEFAULT_PROPERTY_STYLE.fill,
    text: meta?.text || DEFAULT_PROPERTY_STYLE.text,
  };
}

function getPlotDiv() { return byId('game-preview-map'); }
function getRouteOverlay() { return byId('game-preview-routes'); }
function getNodeOverlay() { return byId('game-preview-nodes'); }
function getShipOverlay() { return byId('game-preview-ships'); }
function getHitLayer() { return byId('game-preview-hitlayer'); }
function getSetupOverlay() { return byId('game-setup-overlay'); }

function humanPlayer() {
  return state.players.find((player) => player.id === 'human') || null;
}

function rivalPlayers() {
  return state.players.filter((player) => player.id !== 'human');
}

function getPropertyCard(code) {
  return state.propertyCardsByCode[(code || '').toUpperCase()] || null;
}

function getPropertyNode(code) {
  return state.propertyNodesByCode[(code || '').toUpperCase()] || null;
}

function ownerPlayerOf(code) {
  const normalized = (code || '').toUpperCase();
  return state.players.find((player) => player.property_codes.includes(normalized)) || null;
}

function parseFuelLevel(node) {
  if (!node || node.kind !== 'fuel') return null;
  if (/^[1-5]$/.test(node.label || '')) return Number(node.label);
  const match = (node.notes || '').match(/fuel_level=(\d)/);
  return match ? Number(match[1]) : 1;
}

function buildGraphIndexes() {
  state.nodesById = Object.fromEntries(state.projectedNodes.map((node) => [node.id, node]));
  state.propertyNodesByCode = Object.fromEntries(
    state.projectedNodes
      .filter((node) => (node.kind === 'port' || node.kind === 'toll') && node.label)
      .map((node) => [(node.label || '').toUpperCase(), node])
  );
  state.adjacency = {};
  state.projectedNodes.forEach((node) => {
    state.adjacency[node.id] = [];
  });
  state.edges.forEach((edge) => {
    if (!state.nodesById[edge.from_node_id] || !state.nodesById[edge.to_node_id]) return;
    state.adjacency[edge.from_node_id].push(edge.to_node_id);
    state.adjacency[edge.to_node_id].push(edge.from_node_id);
  });
}

function buildCardIndexes() {
  state.propertyCardsByCode = {};
  [...state.portCards, ...state.tollCards].forEach((card) => {
    state.propertyCardsByCode[(card.code || '').toUpperCase()] = card;
  });
}

function syncDerivedState() {
  state.humanCompany = humanPlayer();
  state.rivals = rivalPlayers();
  state.activeContract = state.humanCompany?.active_contract || null;
}

function updatePlayerCash(player, delta) {
  player.cash += delta;
  player.cash_display = formatCurrency(player.cash);
}

function refreshOwnedCounts(player) {
  player.ports_owned = player.property_codes.filter((code) => getPropertyCard(code)?.kind === 'port').length;
  player.tolls_owned = player.property_codes.filter((code) => getPropertyCard(code)?.kind === 'toll').length;
}

function addPropertyToPlayer(player, code) {
  const normalized = (code || '').toUpperCase();
  if (!player.property_codes.includes(normalized)) {
    player.property_codes.push(normalized);
    refreshOwnedCounts(player);
  }
}

function buyProperty(player, code) {
  const card = getPropertyCard(code);
  if (!card) return false;
  if (player.property_codes.includes((code || '').toUpperCase())) return true;
  if (player.cash < card.price) return false;
  updatePlayerCash(player, -card.price);
  addPropertyToPlayer(player, code);
  return true;
}

function getRate(card, shipType) {
  return card?.rows?.find((row) => row.kind === shipType) || null;
}

function setPlayerNode(player, nodeId) {
  const node = state.nodesById[nodeId] || null;
  player.board_node_id = nodeId;
  player.ship_visible = Boolean(player.ship_type && nodeId);
  player.lat = node?.lat ?? null;
  player.lon = node?.lon ?? null;

  if (!node) {
    player.location_code = null;
    player.location_label = '--';
    return;
  }

  if (node.kind === 'port' || node.kind === 'toll') {
    player.location_code = (node.label || '').toUpperCase();
    player.location_label = player.location_code;
    return;
  }

  if (node.kind === 'fuel') {
    const level = parseFuelLevel(node) || 1;
    player.location_code = null;
    player.location_label = `Abastecimento ${level * 5}`;
    return;
  }

  if (node.kind === 'chance') {
    player.location_code = null;
    player.location_label = 'Sorte / Reves';
    return;
  }

  player.location_code = null;
  player.location_label = 'Em rota';
}

function setSession(patch) {
  state.session = { ...(state.session || {}), ...patch };
  renderHud();
}

function cargoIconMarkup(kind, className) {
  const src = state.assets?.cargo_icons?.[kind];
  return src ? `<img src="${src}" class="${className}" alt="${kind}" />` : `<span class="${className}">${kind}</span>`;
}

function tollDiamondSvg() {
  return '<svg viewBox="0 0 28 18" class="port-draw-toll-diamond" aria-hidden="true"><polygon points="14,2 26,9 14,16 2,9" fill="none" stroke="#05070a" stroke-width="2.8"></polygon></svg>';
}

function renderCompanyList(company) {
  setText('preview-company-location', company?.location_label || '--');
  setText('preview-company-active-permission', company?.active_permission_label || '--');
  setText('preview-company-status', company?.status_label || 'aguardando primeiro turno');

  const permissionsTarget = byId('preview-company-permissions');
  const propertiesTarget = byId('preview-company-properties');

  if (permissionsTarget) {
    permissionsTarget.innerHTML = '';
    const permissions = company?.permissions || [];
    if (!permissions.length) {
      permissionsTarget.innerHTML = '<span class="preview-inline-chip is-muted">sem permissao</span>';
    } else {
      permissions.forEach((permission) => {
        const chip = document.createElement('span');
        chip.className = 'preview-inline-chip';
        chip.textContent = permission.title;
        permissionsTarget.appendChild(chip);
      });
    }
  }

  if (propertiesTarget) {
    propertiesTarget.innerHTML = '';
    const properties = company?.property_codes || [];
    if (!properties.length) {
      propertiesTarget.innerHTML = '<span class="preview-inline-chip is-muted">sem titulos</span>';
    } else {
      properties.forEach((code) => {
        const chip = document.createElement('span');
        chip.className = 'preview-inline-chip';
        chip.textContent = code;
        propertiesTarget.appendChild(chip);
      });
    }
  }
}

function renderRivals() {
  const target = byId('preview-rival-list');
  if (!target) return;
  target.innerHTML = '';
  state.rivals.forEach((player) => {
    const contract = player.active_contract;
    const card = document.createElement('article');
    card.className = 'preview-rival-card';
    card.innerHTML = `
      <div class="preview-rival-top">
        <span class="preview-rival-dot" style="background:${player.color_hex}"></span>
        <strong>${player.name}</strong>
        <span class="preview-rival-cash">${player.cash_display}</span>
      </div>
      <div class="preview-rival-meta">${contract ? `${player.active_permission_label} | ${contract.deadline_progress}` : player.status_label}</div>
      <div class="preview-rival-route">${contract ? `${contract.origin} › ${contract.mandatory_toll} › ${contract.destination}` : 'primeiro turno pendente'}</div>
    `;
    target.appendChild(card);
  });
}

function renderHud() {
  const human = humanPlayer();
  const contract = human?.active_contract || null;
  setText('preview-turn', state.session?.turn_label || 'Turno 01');
  setText('preview-phase', state.session?.phase || 'Preparacao inicial');
  setText('preview-action', state.session?.action_label || 'Sortear permissao de frete');
  setText('preview-deadline', contract?.deadline_label || '--');
  setText('preview-die-1', String(state.session?.dice?.[0] ?? '-'));
  setText('preview-die-2', String(state.session?.dice?.[1] ?? '-'));
  setText('preview-origin', contract?.origin || '--');
  setText('preview-toll', contract?.mandatory_toll || '--');
  setText('preview-destination', contract?.destination || '--');
  setText('preview-contract-note', contract?.note || state.session?.note || 'A partida comeca sem navios, sem contratos e sem porto de partida definido.');
  setText('preview-human-name', human?.name || 'Minha Companhia');
  setText('preview-human-port', human?.location_label || '--');
  setText('preview-cash', human?.cash_display || formatCurrency(state.rules.initial_cash || 0));

  const metricsTarget = byId('preview-contract-metrics');
  if (metricsTarget) {
    metricsTarget.innerHTML = '';
    const metrics = contract ? [contract.distance_label, contract.cargo_label, contract.freight_label] : ['Sem contrato'];
    metrics.forEach((value) => {
      const chip = document.createElement('span');
      chip.className = 'preview-chip';
      chip.textContent = value;
      metricsTarget.appendChild(chip);
    });
  }

  renderCompanyList(human);
  renderRivals();
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
  const projection = d3.geoNaturalEarth1()
    .rotate([state.view.rotationLon, 0, 0])
    .fitExtent([[0, 0], [rect.width, rect.height]], { type: 'Sphere' });
  projection.scale(projection.scale() * state.view.zoom);
  state.projection.fallback = projection;
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

function projectLonLat(lon, lat) {
  const projection = activeProjection();
  if (!projection || typeof projection !== 'function') return null;
  return projection([lon, lat]);
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
        rotation: { lon: state.view.rotationLon, lat: 0, roll: 0 },
        scale: state.view.zoom,
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
    uirevision: 'game-preview-map',
  };
}

function buildTraces() {
  return [{
    type: 'scattergeo',
    mode: 'markers',
    lon: [0],
    lat: [0],
    marker: { size: 1, color: 'rgba(0,0,0,0)' },
    hoverinfo: 'skip',
    showlegend: false,
  }];
}

function contractHighlightCodes() {
  const contract = humanPlayer()?.active_contract;
  if (!contract) return new Set();
  return new Set([contract.origin, contract.mandatory_toll, contract.destination]);
}

function appendLine(overlay, x1, y1, x2, y2, color, width) {
  const svgNs = 'http://www.w3.org/2000/svg';
  const segment = document.createElementNS(svgNs, 'line');
  segment.setAttribute('x1', x1);
  segment.setAttribute('y1', y1);
  segment.setAttribute('x2', x2);
  segment.setAttribute('y2', y2);
  segment.setAttribute('stroke', color);
  segment.setAttribute('stroke-width', width);
  segment.setAttribute('stroke-linecap', 'round');
  overlay.appendChild(segment);
}

function renderRouteOverlay() {
  const overlay = getRouteOverlay();
  const plot = getPlotDiv();
  if (!overlay || !plot) return;

  const rect = plot.getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  overlay.innerHTML = '';

  state.edges.forEach((edge) => {
    const left = state.nodesById[edge.from_node_id];
    const right = state.nodesById[edge.to_node_id];
    if (!left || !right || left.lat === null || right.lat === null || left.lon === null || right.lon === null) return;

    const a = projectLonLat(left.lon, left.lat);
    const b = projectLonLat(right.lon, right.lat);
    if (!a || !b) return;

    const [x1, y1] = a;
    const [x2, y2] = b;
    const color = 'rgba(6, 17, 26, 0.84)';
    const width = 2.35;

    if (Math.abs(x1 - x2) > (rect.width / 2)) {
      if (x1 < x2) {
        appendLine(overlay, x1 + rect.width, y1, x2, y2, color, width);
        appendLine(overlay, x1, y1, x2 - rect.width, y2, color, width);
      } else {
        appendLine(overlay, x1 - rect.width, y1, x2, y2, color, width);
        appendLine(overlay, x1, y1, x2 + rect.width, y2, color, width);
      }
      return;
    }
    appendLine(overlay, x1, y1, x2, y2, color, width);
  });
}

function renderNodeOverlay() {
  const overlay = getNodeOverlay();
  const plot = getPlotDiv();
  if (!overlay || !plot) return;

  const rect = plot.getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  overlay.innerHTML = '';
  const svgNs = 'http://www.w3.org/2000/svg';
  const highlightCodes = contractHighlightCodes();

  function appendCircle(cx, cy, radius, fill, stroke, strokeWidth, opacity = 1) {
    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', stroke);
    circle.setAttribute('stroke-width', strokeWidth);
    circle.setAttribute('opacity', opacity);
    overlay.appendChild(circle);
    return circle;
  }

  function appendDiamond(cx, cy, radius, fill, stroke, strokeWidth, opacity = 1) {
    const diamond = document.createElementNS(svgNs, 'polygon');
    diamond.setAttribute('points', `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`);
    diamond.setAttribute('fill', fill);
    diamond.setAttribute('stroke', stroke);
    diamond.setAttribute('stroke-width', strokeWidth);
    diamond.setAttribute('opacity', opacity);
    overlay.appendChild(diamond);
    return diamond;
  }

  function appendLabel(x, y, textValue, fill, size) {
    const textNode = document.createElementNS(svgNs, 'text');
    textNode.setAttribute('x', x);
    textNode.setAttribute('y', y);
    textNode.setAttribute('fill', fill);
    textNode.setAttribute('font-size', size);
    textNode.setAttribute('font-weight', '600');
    textNode.setAttribute('text-anchor', 'middle');
    textNode.setAttribute('dominant-baseline', 'central');
    textNode.textContent = textValue;
    overlay.appendChild(textNode);
  }

  function appendFuelMarker(cx, cy, radius, fillFraction) {
    const base = appendCircle(cx, cy, radius, '#ffffff', '#06111a', 1.7);
    if (fillFraction <= 0) return base;
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
  }

  state.projectedNodes.forEach((node) => {
    if (node.lat === null || node.lon === null) return;
    const projected = projectLonLat(node.lon, node.lat);
    if (!projected) return;
    const [x, y] = projected;

    if ((node.kind === 'port' || node.kind === 'toll') && highlightCodes.has((node.label || '').toUpperCase())) {
      if (node.kind === 'port') appendCircle(x, y, 18, 'rgba(143, 215, 255, 0.15)', '#8fd7ff', 1.8, 0.95);
      else appendDiamond(x, y, 19, 'rgba(143, 215, 255, 0.12)', '#8fd7ff', 1.8, 0.95);
    }

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
      const style = propertyStyle(state.propertyMetaByCode[(node.label || '').toUpperCase()]);
      if (node.kind === 'port') {
        appendCircle(x, y, 12, style.fill, '#06111a', 2.2);
        appendLabel(x, y + 0.5, node.label || node.id.toUpperCase(), style.text, 9);
      } else {
        appendDiamond(x, y, 13, style.fill, '#06111a', 2.2);
        appendLabel(x, y + 0.5, node.label || node.id.toUpperCase(), style.text, 8);
      }
    }
  });
}

function renderShipOverlay() {
  const overlay = getShipOverlay();
  if (!overlay) return;
  overlay.innerHTML = '';

  const grouped = {};
  state.players.filter((player) => player.ship_visible && player.board_node_id).forEach((player) => {
    grouped[player.board_node_id] = grouped[player.board_node_id] || [];
    grouped[player.board_node_id].push(player);
  });

  const offsets = [[18, -18], [28, -4], [18, 10], [-18, -16], [-26, 2], [-12, 18]];
  Object.entries(grouped).forEach(([nodeId, playersAtNode]) => {
    const node = state.nodesById[nodeId];
    if (!node || node.lat === null || node.lon === null) return;
    const projected = projectLonLat(node.lon, node.lat);
    if (!projected) return;
    playersAtNode.forEach((player, index) => {
      const [dx, dy] = offsets[index % offsets.length];
      const token = document.createElement('div');
      token.className = `game-ship-token${player.id === 'human' ? ' is-human' : ''}`;
      token.style.left = `${projected[0] + dx}px`;
      token.style.top = `${projected[1] + dy}px`;
      token.style.setProperty('--ship-color', player.color_hex || '#8fd7ff');
      token.style.setProperty('--ship-mask', `url(${state.assets.ship_masks[player.ship_type] || ''})`);
      overlay.appendChild(token);
    });
  });
}

async function renderMap() {
  buildFallbackProjection();
  await Plotly.react(getPlotDiv(), buildTraces(), currentLayout(), { displayModeBar: false, responsive: true });
  syncPlotProjection();
  renderRouteOverlay();
  renderNodeOverlay();
  renderShipOverlay();
  updateCursor();
}

function scheduleViewRelayout() {
  if (state.drag.rafScheduled) return;
  state.drag.rafScheduled = true;
  window.requestAnimationFrame(() => {
    state.drag.rafScheduled = false;
    const plot = getPlotDiv();
    buildFallbackProjection();
    state.drag.lastRelayoutPromise = Plotly.relayout(plot, {
      'geo.projection.rotation.lon': state.view.rotationLon,
      'geo.projection.rotation.lat': 0,
      'geo.projection.rotation.roll': 0,
      'geo.projection.scale': state.view.zoom,
    }).then(() => {
      syncPlotProjection();
      renderRouteOverlay();
      renderNodeOverlay();
      renderShipOverlay();
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

function updateCursor() {
  const layer = getHitLayer();
  if (!layer) return;
  layer.style.cursor = state.drag.dragging ? 'grabbing' : 'grab';
}

function beginDrag(event) {
  if (event.button !== 0 || !state.setup.started) return;
  state.drag.pointerDown = true;
  state.drag.dragging = false;
  state.drag.startX = event.clientX;
  state.drag.startRotationLon = state.view.rotationLon;
  updateCursor();
}

function moveDrag(event) {
  if (!state.drag.pointerDown || !state.setup.started) return;
  const deltaX = event.clientX - state.drag.startX;
  if (!state.drag.dragging && Math.abs(deltaX) >= 4) {
    state.drag.dragging = true;
    updateCursor();
  }
  if (!state.drag.dragging) return;
  const layer = getHitLayer();
  const sensitivity = 180 / Math.max(720, layer.clientWidth);
  state.view.rotationLon = normalizeLon(state.drag.startRotationLon + (deltaX * sensitivity));
  buildFallbackProjection();
  renderRouteOverlay();
  renderNodeOverlay();
  renderShipOverlay();
  scheduleViewRelayout();
}

async function endDrag(event) {
  if (event.button !== 0 || !state.drag.pointerDown) return;
  state.drag.pointerDown = false;
  state.drag.dragging = false;
  updateCursor();
  await settleProjection();
}

function handleWheel(event) {
  event.preventDefault();
}
