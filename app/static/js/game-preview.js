const DEFAULT_PROPERTY_STYLE = { fill: '#07b14d', text: '#edf6ff' };
const FUEL_STYLES = {
  1: { fillFraction: 0, size: 10 },
  2: { fillFraction: 0.25, size: 10 },
  3: { fillFraction: 0.5, size: 10 },
  4: { fillFraction: 0.75, size: 10 },
  5: { fillFraction: 1, size: 10 },
};

const PREP_STEP_DELAY_MS = 1050;
const PREP_STEP_DELAY_LONG_MS = 1300;
const CPU_STEP_DELAY_MS = 520;
const CPU_MOVE_DELAY_MS = 240;

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
  assets: { ship_masks: {}, ship_fill_masks: {}, ship_sprites: {}, cargo_icons: {} },
  distances: {},
  rules: {},
  flow: { openingRoundRunning: false, followupSetupRunning: false },
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
    onSelected: null,
    promptText: '',
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
  chanceDraw: {
    drawing: false,
    selectedCardId: '',
    order: [],
    frame: 0,
    rafId: 0,
    resolver: null,
    playerId: '',
    autoStart: false,
    revealOnly: false,
  },
  actionFeed: [],
  view: {
    rotationLon: -18,
    zoom: 1,
    openRivalDrawerId: null,
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

function playerById(id) {
  return state.players.find((player) => player.id === id) || null;
}

function activePlayer() {
  return playerById(state.session?.active_player_id) || humanPlayer() || state.players[0] || null;
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

function brightenHex(hex, mix = 0.28) {
  const source = String(hex || '#8fd7ff').replace('#', '');
  const value = source.length === 3 ? source.split('').map((char) => char + char).join('') : source.padStart(6, '0').slice(0, 6);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  const mixed = channels.map((channel) => Math.round(channel + ((255 - channel) * mix)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function playerActionName(player) {
  if (!player) return 'Jogador';
  return player.is_human ? (player.name || 'Voce') : (player.name || 'Jogador');
}

function renderActionFeed() {
  const panel = byId('game-action-log');
  const target = byId('game-action-feed');
  if (!target || !panel) return;
  const now = Date.now();
  state.actionFeed = (state.actionFeed || []).filter((entry) => (entry.expiresAt || 0) > now).slice(0, 4);
  panel.classList.toggle('is-hidden', state.actionFeed.length === 0);
  if (!state.actionFeed.length) {
    target.innerHTML = '';
    return;
  }
  target.innerHTML = state.actionFeed.map((entry, index) => `
    <article class="game-action-entry${index === 0 ? ' is-newest' : ''}">
      <span class="game-action-entry-accent" style="background:${entry.color}; box-shadow:0 0 8px ${entry.glow};"></span>
      <div class="game-action-entry-body">
        <strong class="game-action-entry-title">${entry.playerName}: ${entry.action}</strong>
        <span class="game-action-entry-detail">${entry.detail}</span>
      </div>
    </article>
  `).join('');
}

function pushActionLog(player, action, detail) {
  const color = player?.color_hex || '#8fd7ff';
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    playerId: player?.id || '',
    playerName: playerActionName(player),
    action,
    detail: detail || '',
    color,
    glow: brightenHex(color, 0.42),
    turnLabel: state.session?.turn_label || 'Turno --',
    expiresAt: Date.now() + 4200,
  };
  state.actionFeed = [entry, ...(state.actionFeed || [])].slice(0, 4);
  renderActionFeed();
  window.setTimeout(() => {
    state.actionFeed = (state.actionFeed || []).filter((item) => item.id !== entry.id);
    renderActionFeed();
  }, 4300);
}

function chanceCategoryLabel(card) {
  if (!card) return 'Carta';
  return card.category_label || (card.category === 'sorte' ? 'Sorte' : 'Reves');
}

function couponLabelFromCode(code) {
  const labels = {
    shortcut_ignore_toll: 'Atalho',
    free_toll: 'Pedagio Livre',
    free_fuel: 'Gasolina Livre',
    double_freight: 'Lucro Extra',
    free_port_stay: 'Porto Livre',
    skip_owner_share: 'Quebra de Contrato',
    reroute_same_value: 'Mudanca de Rota',
    double_dice_once: 'Dados x2',
  };
  return labels[code] || code || 'Cupom';
}

function updatePlayerCash(player, delta) {
  player.cash += delta;
  player.cash_display = formatCurrency(player.cash);
}

function fuelStopCost(node) {
  const level = parseFuelLevel(node);
  return level ? (level * 5) : 0;
}

function resolveFuelStopForPlayer(player, node) {
  if (!player || node?.kind !== 'fuel') return 0;
  const amount = fuelStopCost(node);
  if (amount > 0) {
    updatePlayerCash(player, -amount);
    pushActionLog(player, 'Abastecimento', `Pagou ${formatCurrency(amount)} ao banco.`);
  }
  return amount;
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

function removePropertyFromPlayer(player, code) {
  const normalized = (code || '').toUpperCase();
  player.property_codes = (player.property_codes || []).filter((entry) => entry !== normalized);
  refreshOwnedCounts(player);
}

function transferProperty(fromPlayer, toPlayer, code, amount) {
  const normalized = (code || '').toUpperCase();
  if (!fromPlayer || !toPlayer) return false;
  if (!fromPlayer.property_codes?.includes(normalized)) return false;
  if (toPlayer.cash < amount) return false;
  updatePlayerCash(toPlayer, -amount);
  updatePlayerCash(fromPlayer, amount);
  removePropertyFromPlayer(fromPlayer, normalized);
  addPropertyToPlayer(toPlayer, normalized);
  return true;
}

function getPropertyStopRate(player, card) {
  const shipType = player?.active_permission_id || player?.ship_type || '';
  const row = getRate(card, shipType) || { fee: 0, multiplier: 1 };
  return {
    fee: Number(row.fee || 0),
    multiplier: Number(row.multiplier || 1),
  };
}

function getPortStopRate(player, card) {
  return getPropertyStopRate(player, card);
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

function permissionMiniMarkup(permission) {
  return `
    <article class="preview-permission-mini" style="--permission-accent:${permission.accent}; --permission-text:${permission.text};">
      <header class="preview-permission-mini-head">${permission.title}</header>
      <div class="preview-permission-mini-row top">
        <span class="preview-permission-mini-icon">${cargoIconMarkup(permission.kind, 'preview-permission-mini-image')}</span>
        <span class="preview-permission-mini-icon">${cargoIconMarkup(permission.kind, 'preview-permission-mini-image')}</span>
      </div>
      <div class="preview-permission-mini-body">Permissao</div>
      <div class="preview-permission-mini-row bottom">
        <span class="preview-permission-mini-icon">${cargoIconMarkup(permission.kind, 'preview-permission-mini-image')}</span>
        <span class="preview-permission-mini-icon">${cargoIconMarkup(permission.kind, 'preview-permission-mini-image')}</span>
      </div>
    </article>
  `;
}

function tollDiamondSvg() {
  return '<svg viewBox="0 0 28 18" class="port-draw-toll-diamond" aria-hidden="true"><polygon points="14,2 26,9 14,16 2,9" fill="none" stroke="#05070a" stroke-width="2.8"></polygon></svg>';
}

function propertyMiniRowsMarkup(card) {
  return (card.rows || []).map((row) => `
    <div class="preview-property-mini-rowdata">
      <span class="preview-property-mini-icon">${cargoIconMarkup(row.kind, 'preview-property-mini-image')}</span>
      <span class="preview-property-mini-fee">${row.fee}</span>
      <span class="preview-property-mini-mult">${row.multiplier}</span>
    </div>
  `).join('');
}

function propertyMiniMarkup(card) {
  const tollHeadClass = card.is_toll ? ' preview-property-mini-head-toll' : '';
  return `
    <article class="preview-property-mini${card.is_toll ? ' is-toll' : ''}" style="--title-fill:${card.fill}; --title-text:${card.text};">
      <header class="preview-property-mini-head${tollHeadClass}">
        ${card.is_toll ? `<span class="preview-property-mini-diamond">${tollDiamondSvg()}</span>` : `<span class="preview-property-mini-number">${card.number_display}</span>`}
        <div class="preview-property-mini-heading">
          <strong class="preview-property-mini-code">${card.code}</strong>
          <span class="preview-property-mini-name">${card.name}</span>
        </div>
        ${card.is_toll ? `<span class="preview-property-mini-diamond">${tollDiamondSvg()}</span>` : '<span class="preview-property-mini-number-spacer"></span>'}
      </header>
      <div class="preview-property-mini-body">
        <div class="preview-property-mini-table-head">
          <span>C</span>
          <span>E</span>
          <span>x</span>
        </div>
        <div class="preview-property-mini-rows">${propertyMiniRowsMarkup(card)}</div>
      </div>
      <footer class="preview-property-mini-foot">
        <span>Preco</span>
        <strong>${card.price}</strong>
      </footer>
    </article>
  `;
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
      permissionsTarget.classList.add('preview-permission-list');
      permissions.forEach((permission) => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = permissionMiniMarkup(permission).trim();
        permissionsTarget.appendChild(wrapper.firstElementChild);
      });
    }
  }

  if (propertiesTarget) {
    propertiesTarget.innerHTML = '';
    const properties = company?.property_codes || [];
    if (!properties.length) {
      propertiesTarget.innerHTML = '<span class="preview-inline-chip is-muted">sem titulos</span>';
    } else {
      propertiesTarget.classList.add('preview-property-list');
      properties.forEach((code) => {
        const card = getPropertyCard(code);
        if (!card) {
          const chip = document.createElement('span');
          chip.className = 'preview-inline-chip';
          chip.textContent = code;
          propertiesTarget.appendChild(chip);
          return;
        }
        const wrapper = document.createElement('div');
        wrapper.innerHTML = propertyMiniMarkup(card).trim();
        propertiesTarget.appendChild(wrapper.firstElementChild);
      });
    }
  }
}

function couponMiniMarkup(coupon) {
  const label = typeof coupon === 'string'
    ? coupon
    : (coupon?.label || coupon?.title || coupon?.kind || 'Cupom');
  return `<span class="preview-inline-chip preview-rival-coupon">${label}</span>`;
}

function rivalDrawerMarkup(player) {
  const contract = player.active_contract;
  const routeLabel = contract
    ? `${contract.origin} › ${contract.mandatory_toll} › ${contract.destination}`
    : 'primeiro turno pendente';
  const lastRoll = Array.isArray(player.last_roll)
    ? `${player.last_roll[0]} + ${player.last_roll[1]}`
    : '--';
  const permissionsMarkup = (player.permissions || []).map((permission) => permissionMiniMarkup(permission)).join('');
  const propertiesMarkup = (player.property_codes || [])
    .map((code) => getPropertyCard(code))
    .filter(Boolean)
    .map((card) => propertyMiniMarkup(card))
    .join('');
  const couponsMarkup = (player.coupons || []).map((coupon) => couponMiniMarkup(coupon)).join('');

  return `
    <div class="preview-rival-drawer">
      <div class="preview-rival-drawer-route">${routeLabel}</div>
      <div class="preview-rival-drawer-metrics">
        <span class="preview-rival-drawer-chip">${contract?.distance_label || 'Sem distancia'}</span>
        <span class="preview-rival-drawer-chip">${contract?.freight_label || 'Sem frete'}</span>
        <span class="preview-rival-drawer-chip">Prazo ${contract?.deadline_progress || '0/4'}</span>
        <span class="preview-rival-drawer-chip">Dados ${lastRoll}</span>
      </div>
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Permissoes</span>
        <div class="preview-rival-mini-strip">${permissionsMarkup || '<span class="preview-inline-chip is-muted">sem permissao</span>'}</div>
      </div>
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Titulos e pedagios</span>
        <div class="preview-rival-mini-strip">${propertiesMarkup || '<span class="preview-inline-chip is-muted">sem titulos</span>'}</div>
      </div>
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Cupons</span>
        <div class="preview-rival-mini-strip preview-rival-coupons">${couponsMarkup || '<span class="preview-inline-chip is-muted">sem cupons</span>'}</div>
      </div>
    </div>
  `;
}

function renderRivals() {
  const target = byId('preview-rival-list');
  if (!target) return;
  target.innerHTML = '';
  state.rivals.forEach((player) => {
    const contract = player.active_contract;
    const isOpen = state.view.openRivalDrawerId === player.id;
    const card = document.createElement('article');
    card.className = `preview-rival-card${isOpen ? ' is-open' : ''}`;
    card.dataset.playerId = player.id;
    card.style.setProperty('--rival-accent', player.color_hex || '#8fd7ff');
    card.innerHTML = `
      <div class="preview-rival-top">
        <span class="preview-rival-dot" style="background:${player.color_hex}"></span>
        <strong>${player.name}</strong>
        <span class="preview-rival-cash">${player.cash_display}</span>
      </div>
      <div class="preview-rival-meta">${contract ? `${player.active_permission_label} | ${contract.deadline_progress}` : player.status_label}</div>
      <div class="preview-rival-route">${contract ? `${contract.origin} › ${contract.mandatory_toll} › ${contract.destination}` : 'primeiro turno pendente'}</div>
      ${isOpen ? rivalDrawerMarkup(player) : ''}
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
    const metrics = contract
      ? [contract.distance_label || 'Sem distancia', contract.cargo_label || 'Sem carga', contract.freight_label || 'Sem frete']
      : ['Sem contrato'];
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

function ensurePlayerContractDraft(player) {
  if (!player) return null;
  if (!player.active_contract) {
    player.active_contract = {
      origin: '--',
      mandatory_toll: '--',
      destination: '--',
      deadline_label: '--',
      deadline_progress: '0/4',
      distance_label: 'Sem distancia',
      cargo_label: player.active_permission_label || 'Sem carga',
      freight_label: 'Sem frete',
      freight_value: 0,
      base_freight_value: 0,
      settlement_adjustment: 0,
      settlement_value: 0,
      rounds_elapsed: 1,
      target_rounds: state.rules.target_rounds || 4,
      completed: false,
      note: 'Contrato em montagem.',
    };
  }
  if (!player.active_contract.deadline_progress) {
    player.active_contract.deadline_progress = player.active_contract.deadline_label && player.active_contract.deadline_label !== '--'
      ? player.active_contract.deadline_label.replace(/\s*\/\s*/g, '/')
      : '0/4';
  }
  return player.active_contract;
}

function ensureHumanContractDraft() {
  return ensurePlayerContractDraft(humanPlayer());
}


function getPermissionDrawOverlay() {
  return byId('permission-draw-overlay');
}

function getPermissionDrawStage() {
  return byId('permission-draw-stage');
}

function getPermissionDrawButton() {
  return byId('start-permission-draw');
}

function getPermissionDrawResult() {
  return byId('permission-draw-result');
}

function setPermissionDrawVisible(visible) {
  const overlay = getPermissionDrawOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function setPermissionDrawResult(message) {
  const node = getPermissionDrawResult();
  if (node) node.textContent = message;
}

function permissionCardTransform(index, cardId) {
  const total = state.permissionDraw.order.length || 1;
  const centeredIndex = index - ((total - 1) / 2);

  if (state.permissionDraw.drawing) {
    const frame = state.permissionDraw.frame;
    const x = Math.sin((frame * 0.18) + index) * 130 + (centeredIndex * 8);
    const y = Math.cos((frame * 0.14) + (index * 0.9)) * 18;
    const rotate = Math.sin((frame * 0.11) + index) * 18;
    return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(0.96)`;
  }

  if (state.permissionDraw.selectedCardId) {
    if (cardId === state.permissionDraw.selectedCardId) {
      return 'translate(0px, -6px) rotate(0deg) scale(1.08)';
    }
    return `translate(${centeredIndex * 82}px, 82px) rotate(${centeredIndex * 6}deg) scale(0.86)`;
  }

  return `translate(${centeredIndex * 8}px, ${Math.abs(centeredIndex) * 1.5}px) rotate(${centeredIndex * 3}deg)`;
}

function renderPermissionDraw() {
  const stage = getPermissionDrawStage();
  const button = getPermissionDrawButton();
  if (!stage) return;

  const orderedCards = state.permissionDraw.order
    .map((id) => state.freightPermissionCards.find((card) => card.id === id))
    .filter(Boolean);

  stage.innerHTML = orderedCards.map((card, index) => {
    const selected = state.permissionDraw.selectedCardId === card.id;
    const faded = Boolean(state.permissionDraw.selectedCardId) && !selected;
    const zIndex = selected ? 1000 : (faded ? 40 + index : 100 + index);
    return `
      <article class="permission-draw-card${selected ? ' is-selected' : ''}${faded ? ' is-faded' : ''}" style="--permission-accent:${card.accent}; --permission-text:${card.text}; transform:${permissionCardTransform(index, card.id)}; z-index:${zIndex};">
        <header class="permission-draw-card-head">${card.title}</header>
        <div class="permission-draw-card-row permission-draw-card-row-top">
          <span class="permission-draw-icon">${cargoIconMarkup(card.kind, 'permission-draw-icon-image')}</span>
          <span class="permission-draw-icon">${cargoIconMarkup(card.kind, 'permission-draw-icon-image')}</span>
        </div>
        <div class="permission-draw-card-body">${card.body_text}</div>
        <div class="permission-draw-card-row permission-draw-card-row-bottom">
          <span class="permission-draw-icon">${cargoIconMarkup(card.kind, 'permission-draw-icon-image')}</span>
          <span class="permission-draw-icon">${cargoIconMarkup(card.kind, 'permission-draw-icon-image')}</span>
        </div>
      </article>
    `;
  }).join('');

  if (button) {
    button.disabled = state.permissionDraw.drawing;
    button.textContent = state.permissionDraw.drawing ? 'Embaralhando...' : 'Embaralhar e sortear';
  }
}

function createPermissionRecord(card) {
  return {
    id: card.id,
    kind: card.kind,
    title: card.title,
    accent: card.accent,
    text: card.text,
  };
}

function applyPermissionSelectionForPlayer(player, card, { updateSession = false, actionLabel = 'Permissao sorteada', note = null, append = false, setActive = true } = {}) {
  if (!player || !card) return null;

  const permission = createPermissionRecord(card);
  player.permissions = append ? ([...(player.permissions || []), permission]) : [permission];
  if (setActive) {
    player.active_permission_id = card.id;
    player.active_permission_label = card.title;
    player.ship_type = card.kind;
    player.ship_type_label = card.title;
  }
  player.status_label = append ? 'nova permissao sorteada' : 'permissao sorteada';

  const resolvedNote = note || `Permissao sorteada: ${card.title}.`;
  pushActionLog(player, append ? 'Nova permissao sorteada' : 'Permissao sorteada', card.title);
  syncDerivedState();
  if (updateSession) {
    setSession({
      active_player_id: player.id,
      action_label: actionLabel,
      note: resolvedNote,
    });
  }
  renderHud();
  return permission;
}

function applyHumanPermissionSelection(card) {
  const player = humanPlayer();
  if (!player || !card) return;
  applyPermissionSelectionForPlayer(player, card, {
    updateSession: true,
    actionLabel: 'Permissao sorteada',
    note: `Permissao sorteada: ${card.title}. A proxima etapa sera o sorteio do porto de partida.`,
  });
}

function closePermissionDraw(card = null) {
  setPermissionDrawVisible(false);
  const resolver = state.permissionDraw.resolver;
  state.permissionDraw.resolver = null;
  state.permissionDraw.onSelected = null;
  state.permissionDraw.promptText = '';
  if (resolver) resolver(card);
}

function startPermissionDraw() {
  if (state.permissionDraw.drawing || !state.freightPermissionCards.length) return;

  state.permissionDraw.drawing = true;
  state.permissionDraw.selectedCardId = '';
  state.permissionDraw.frame = 0;
  state.permissionDraw.order = shuffleArray(state.freightPermissionCards.map((card) => card.id));
  setPermissionDrawResult('Embaralhando as permissoes...');
  renderPermissionDraw();

  const durationMs = 1800;
  const shuffleEveryMs = 110;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    state.permissionDraw.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      state.permissionDraw.order = shuffleArray(state.freightPermissionCards.map((card) => card.id));
      lastShuffleAt = now;
    }

    renderPermissionDraw();

    if (elapsed < durationMs) {
      state.permissionDraw.rafId = window.requestAnimationFrame(step);
      return;
    }

    state.permissionDraw.drawing = false;
    state.permissionDraw.order = shuffleArray(state.freightPermissionCards.map((card) => card.id));
    const selectedId = randomChoice(state.permissionDraw.order);
    state.permissionDraw.selectedCardId = selectedId;
    const card = state.freightPermissionCards.find((item) => item.id === selectedId) || null;
    setPermissionDrawResult(`Permissao sorteada: ${card?.title || '--'}.`);
    renderPermissionDraw();

    window.setTimeout(() => {
      if (card) {
        const customSelection = state.permissionDraw.onSelected;
        if (typeof customSelection === 'function') {
          customSelection(card);
        } else {
          applyHumanPermissionSelection(card);
        }
      }
      closePermissionDraw(card);
    }, 850);
  }

  if (state.permissionDraw.rafId) {
    window.cancelAnimationFrame(state.permissionDraw.rafId);
  }
  state.permissionDraw.rafId = window.requestAnimationFrame(step);
}

function openHumanPermissionDraw({ promptText = 'Clique em embaralhar para sortear uma permissao.', onSelected = null } = {}) {
  state.permissionDraw.drawing = false;
  state.permissionDraw.selectedCardId = '';
  state.permissionDraw.frame = 0;
  state.permissionDraw.order = state.freightPermissionCards.map((card) => card.id);
  state.permissionDraw.onSelected = onSelected;
  state.permissionDraw.promptText = promptText;
  setPermissionDrawResult(promptText);
  renderPermissionDraw();
  setPermissionDrawVisible(true);
  return new Promise((resolve) => {
    state.permissionDraw.resolver = resolve;
  });
}


function getPortDrawOverlay() {
  return byId('port-draw-overlay');
}

function getPortDrawStage() {
  return byId('port-draw-stage');
}

function getPortDrawButton() {
  return byId('port-draw-button');
}

function getPortDrawResult() {
  return byId('port-draw-result');
}

function getPortDrawActive() {
  return byId('port-draw-active');
}

function getPortDrawCopy() {
  return byId('port-draw-copy');
}

function getPortDrawExtra() {
  return byId('port-draw-extra');
}

function getPortDrawExtraCopy() {
  return byId('port-draw-extra-copy');
}

function getPortDrawExtraPrimary() {
  return byId('port-draw-extra-primary');
}

function getPortDrawExtraSecondary() {
  return byId('port-draw-extra-secondary');
}

function setPortDrawVisible(visible) {
  const overlay = getPortDrawOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function setPortDrawResult(message) {
  const node = getPortDrawResult();
  if (node) node.textContent = message;
}

function setPortDrawActive(message) {
  const node = getPortDrawActive();
  if (node) node.textContent = message;
}

function clearPortDrawExtra() {
  const extra = getPortDrawExtra();
  const primary = getPortDrawExtraPrimary();
  const secondary = getPortDrawExtraSecondary();
  if (extra) extra.classList.add('is-hidden');
  if (primary) {
    primary.textContent = 'Confirmar';
    primary.onclick = null;
  }
  if (secondary) {
    secondary.textContent = 'Cancelar';
    secondary.onclick = null;
    secondary.classList.add('is-hidden');
  }
}

function configurePortDrawExtra({ copy, primaryLabel, secondaryLabel = 'Cancelar', onPrimary, onSecondary = null, hideSecondary = false }) {
  const extra = getPortDrawExtra();
  const copyNode = getPortDrawExtraCopy();
  const primary = getPortDrawExtraPrimary();
  const secondary = getPortDrawExtraSecondary();
  if (!extra || !primary || !secondary || !copyNode) {
    return;
  }
  extra.classList.remove('is-hidden');
  copyNode.textContent = copy;
  primary.textContent = primaryLabel;
  primary.onclick = onPrimary;
  secondary.textContent = secondaryLabel;
  secondary.onclick = onSecondary;
  secondary.classList.toggle('is-hidden', hideSecondary || !onSecondary);
}

function renderPortDrawRows(card) {
  return card.rows.map((row) => `
    <div class="port-draw-row">
      <div class="port-draw-icon" title="${row.label}">${cargoIconMarkup(row.kind, 'port-draw-icon-image')}</div>
      <span class="port-draw-fee">${row.fee}</span>
      <span class="port-draw-multiplier">${row.multiplier}</span>
    </div>
  `).join('');
}

function portCardTransform(index, cardCode) {
  const total = state.portDraw.order.length || 1;
  const centeredIndex = index - ((total - 1) / 2);

  if (state.portDraw.drawing) {
    const frame = state.portDraw.frame;
    const x = Math.sin((frame * 0.18) + index) * 220 + (centeredIndex * 12);
    const y = Math.cos((frame * 0.14) + (index * 0.85)) * 22;
    const rotate = Math.sin((frame * 0.09) + index) * 16;
    return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(0.78)`;
  }

  if (state.portDraw.selectedCardCode) {
    if (cardCode === state.portDraw.selectedCardCode) {
      return 'translate(0px, -10px) rotate(0deg) scale(0.98)';
    }
    return `translate(${centeredIndex * 126}px, 132px) rotate(${centeredIndex * 6}deg) scale(0.72)`;
  }

  return `translate(${centeredIndex * 26}px, ${Math.abs(centeredIndex) * 3}px) rotate(${centeredIndex * 4}deg) scale(0.8)`;
}

function destinationCandidatesForOrigin(originCode) {
  const originCard = getPropertyCard(originCode);
  if (!originCard) {
    return [...state.portCards];
  }
  return state.portCards.filter((card) => card.code !== originCard.code && card.continent !== originCard.continent);
}

function destinationCandidates() {
  const contract = ensureHumanContractDraft();
  const originCode = contract?.origin || humanPlayer()?.location_code || '';
  return destinationCandidatesForOrigin(originCode);
}

function currentPortDrawCards() {
  if (state.portDraw.mode === 'toll') return state.tollCards;
  if (state.portDraw.mode === 'destination') return destinationCandidates();
  return state.portCards;
}

function renderPortDraw() {
  const stage = getPortDrawStage();
  const button = getPortDrawButton();
  const copy = getPortDrawCopy();
  const eyebrow = byId('port-draw-eyebrow');
  const title = byId('port-draw-title');
  if (!stage) return;

  const isTollMode = state.portDraw.mode === 'toll';
  const isDestinationMode = state.portDraw.mode === 'destination';
  const cards = currentPortDrawCards();

  if (eyebrow) eyebrow.textContent = 'Primeiro turno';
  if (title) {
    title.textContent = isTollMode
      ? 'Sorteio do pedagio obrigatorio'
      : (isDestinationMode ? 'Sorteio do porto de destino' : 'Sorteio do porto de partida');
  }
  if (copy) {
    copy.textContent = isTollMode
      ? 'Os 6 pedagios entram no embaralhamento. O sorteio define o pedagio obrigatorio da rota inicial.'
      : (isDestinationMode
          ? 'O destino nao pode ser o mesmo porto de partida nem estar na mesma regiao do porto de partida.'
          : 'Os 30 portos entram no embaralhamento. Depois do sorteio, voce decide se quer comprar a posse do porto inicial.');
  }

  const orderedCards = state.portDraw.order
    .map((code) => cards.find((card) => card.code === code))
    .filter(Boolean);

  stage.innerHTML = orderedCards.map((card, index) => {
    const selected = state.portDraw.selectedCardCode === card.code;
    const faded = Boolean(state.portDraw.selectedCardCode) && !selected;
    const zIndex = selected ? 1000 : (faded ? 40 + index : 120 + index);
    return `
      <article class="port-draw-card${card.is_toll ? ' toll-draw-card' : ''}${selected ? ' is-selected' : ''}${faded ? ' is-faded' : ''}" style="--title-fill:${card.fill}; --title-text:${card.text}; transform:${portCardTransform(index, card.code)}; z-index:${zIndex};">
        <header class="port-draw-card-head${card.is_toll ? ' toll-draw-title-head' : ''}">
          ${card.is_toll ? `<span class="port-draw-toll-side-icon">${tollDiamondSvg()}</span>` : `<span class="port-draw-title-number">${card.number_display}</span>`}
          <div class="port-draw-title-heading">
            <strong class="port-draw-title-code">${card.code}</strong>
            <span class="port-draw-title-name">${card.name} (${card.country})</span>
          </div>
          ${card.is_toll ? `<span class="port-draw-toll-side-icon">${tollDiamondSvg()}</span>` : '<span></span>'}
        </header>
        <div class="port-draw-title-body">
          <div class="port-draw-table-head">
            <span>Carga</span>
            <span>${card.column_fee_label}</span>
            <span>${card.column_multiplier_label}</span>
          </div>
          <div class="port-draw-title-rows">${renderPortDrawRows(card)}</div>
        </div>
        <footer class="port-draw-card-foot">
          <span>Preco</span>
          <strong>${card.price}</strong>
        </footer>
      </article>
    `;
  }).join('');

  if (button) {
    button.disabled = state.portDraw.drawing || Boolean(state.portDraw.selectedCardCode);
    button.textContent = state.portDraw.drawing ? 'Embaralhando...' : (state.portDraw.selectedCardCode ? 'Sorteado' : 'Embaralhar e sortear');
  }
}

function applyOriginSelectionForPlayer(player, card, bought, { updateSession = false, actionLabel = 'Porto de partida definido', note = null } = {}) {
  if (!player || !card) return { bought: false, note: '' };

  let resolvedBought = Boolean(bought);
  const originNode = getPropertyNode(card.code);
  if (originNode) setPlayerNode(player, originNode.id);
  else {
    player.location_code = card.code;
    player.location_label = card.code;
  }
  player.status_label = resolvedBought ? 'porto inicial comprado' : 'porto inicial definido';

  if (resolvedBought) {
    const boughtOk = buyProperty(player, card.code);
    if (!boughtOk) {
      resolvedBought = false;
      player.status_label = 'porto inicial definido';
    }
  }

  const contract = ensurePlayerContractDraft(player);
  if (contract) {
    contract.origin = card.code;
    contract.cargo_label = player.active_permission_label || 'Sem carga';
    contract.note = resolvedBought
      ? `Porto inicial sorteado: ${card.code}. O porto foi comprado e entrou na lista de titulos.`
      : `Porto inicial sorteado: ${card.code}. O porto de partida foi definido sem compra.`;
  }

  const resolvedNote = note || contract?.note || '';
  pushActionLog(player, resolvedBought ? 'Porto inicial comprado' : 'Porto inicial definido', resolvedBought ? `${card.code} por ${formatCurrency(card.price)}` : `${card.code} sem compra`);
  syncDerivedState();
  if (updateSession) {
    setSession({
      active_player_id: player.id,
      action_label: actionLabel,
      note: resolvedNote,
    });
  }
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return { bought: resolvedBought, note: resolvedNote };
}

function applyHumanOriginSelection(card, bought) {
  const player = humanPlayer();
  if (!player || !card) return;
  applyOriginSelectionForPlayer(player, card, bought, {
    updateSession: true,
    actionLabel: 'Porto de partida definido',
    note: bought
      ? `Porto inicial sorteado: ${card.code}. O porto foi comprado e entrou na sua lista de titulos.`
      : `Porto inicial sorteado: ${card.code}. O porto de partida foi definido sem compra.`,
  });
}

function applyTollSelectionForPlayer(player, card, { updateSession = false, actionLabel = 'Pedagio definido', note = null } = {}) {
  if (!player || !card) return '';
  const contract = ensurePlayerContractDraft(player);
  if (contract) {
    contract.mandatory_toll = card.code;
    contract.note = `Pedagio obrigatorio sorteado: ${card.code}. A proxima etapa sera o sorteio do porto de destino.`;
  }
  player.status_label = 'pedagio definido';
  const resolvedNote = note || contract?.note || '';
  pushActionLog(player, 'Pedagio sorteado', card.code);
  syncDerivedState();
  if (updateSession) {
    setSession({
      active_player_id: player.id,
      action_label: actionLabel,
      note: resolvedNote,
    });
  }
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return resolvedNote;
}

function applyHumanTollSelection(card) {
  const player = humanPlayer();
  if (!player || !card) return;
  applyTollSelectionForPlayer(player, card, {
    updateSession: true,
    actionLabel: 'Pedagio definido',
    note: `Pedagio obrigatorio sorteado: ${card.code}. A proxima etapa sera o sorteio do porto de destino.`,
  });
}


function calculateContractPreviewForPlayer(player, destinationCard, originCode = null) {
  const contract = ensurePlayerContractDraft(player);
  const resolvedOriginCode = originCode || contract?.origin || player?.location_code || '';
  const originCard = getPropertyCard(resolvedOriginCode);
  const permissionKind = player?.active_permission_id || player?.ship_type || '';
  const distance = Number(state.distances?.[resolvedOriginCode]?.[destinationCard.code] || 0);
  const rate = getRate(originCard, permissionKind) || { fee: 0, multiplier: 1 };
  const ownsOrigin = Boolean(player?.property_codes?.includes(resolvedOriginCode));
  const base = distance * rate.fee;
  const total = ownsOrigin ? (base * rate.multiplier) : base;
  const formula = ownsOrigin
    ? `${distance} x ${rate.fee} x ${rate.multiplier} = ${total}`
    : `${distance} x ${rate.fee} = ${total}`;
  return {
    originCode: resolvedOriginCode,
    destinationCode: destinationCard.code,
    distance,
    fee: rate.fee,
    multiplier: rate.multiplier,
    ownsOrigin,
    total,
    formula,
  };
}

function calculateHumanContractPreview(destinationCard) {
  return calculateContractPreviewForPlayer(humanPlayer(), destinationCard);
}

function applyDestinationSelectionForPlayer(player, card, { updateSession = false, actionLabel = 'Destino definido', note = null } = {}) {
  if (!player || !card) return null;
  const contract = ensurePlayerContractDraft(player);
  const preview = calculateContractPreviewForPlayer(player, card);
  if (contract) {
    contract.destination = card.code;
    contract.target_rounds = state.rules.target_rounds || 4;
    contract.rounds_elapsed = 1;
    contract.completed = false;
    contract.deadline_label = `1 / ${contract.target_rounds}`;
    contract.deadline_progress = `1/${contract.target_rounds}`;
    contract.distance_label = `Distancia ${preview.distance}`;
    contract.cargo_label = player.active_permission_label || 'Sem carga';
    contract.freight_label = `Frete $ ${preview.total}`;
    contract.freight_value = preview.total;
    contract.base_freight_value = preview.total;
    contract.settlement_adjustment = 0;
    contract.settlement_value = preview.total;
    contract.distance_value = preview.distance;
    contract.origin_owned = preview.ownsOrigin;
    contract.note = preview.ownsOrigin
      ? `Contrato: ${preview.formula} (D x E x M), porque o porto de partida foi comprado.`
      : `Contrato: ${preview.formula} (D x E), porque o porto de partida nao foi comprado.`;
  }
  player.status_label = 'contrato inicial definido';
  const resolvedNote = note || contract?.note || 'Contrato inicial calculado.';
  pushActionLog(player, 'Destino definido', `${card.code} | ${formatCurrency(preview.total)}`);
  syncDerivedState();
  if (updateSession) {
    setSession({
      active_player_id: player.id,
      action_label: actionLabel,
      note: resolvedNote,
    });
  }
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return preview;
}

function applyHumanDestinationSelection(card) {
  const player = humanPlayer();
  if (!player || !card) return;
  applyDestinationSelectionForPlayer(player, card, {
    updateSession: true,
    actionLabel: 'Destino definido',
  });
}

function resetContractFromCurrentPort(player, { updateSession = false, actionLabel = 'Novo contrato', note = null } = {}) {
  if (!player) return null;
  const originCode = (player.location_code || '').toUpperCase();
  const originCard = getPropertyCard(originCode);
  if (!originCard || originCard.kind !== 'port') return null;

  const contract = ensurePlayerContractDraft(player);
  contract.origin = originCode;
  contract.mandatory_toll = '--';
  contract.destination = '--';
  contract.deadline_label = '--';
  contract.deadline_progress = '0/4';
  contract.distance_label = 'Sem distancia';
  contract.cargo_label = player.active_permission_label || 'Sem carga';
  contract.freight_label = 'Sem frete';
  contract.freight_value = 0;
  contract.base_freight_value = 0;
  contract.settlement_adjustment = 0;
  contract.settlement_value = 0;
  contract.rounds_elapsed = 1;
  contract.target_rounds = state.rules.target_rounds || 4;
  contract.completed = false;
  contract.origin_owned = Boolean(player.property_codes?.includes(originCode));
  contract.note = note || `${originCode} agora e o novo porto de partida.`;
  player.status_label = 'novo contrato em montagem';
  syncDerivedState();
  if (updateSession) {
    setSession({
      active_player_id: player.id,
      action_label: actionLabel,
      note: contract.note,
    });
  }
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return contract;
}

async function maybeBuyCurrentPortAfterDeliveryForHuman(player) {
  if (!player) return false;
  const card = getPropertyCard(player.location_code || '');
  if (!card || card.kind !== 'port') return false;
  const owner = ownerPlayerOf(card.code);
  const negotiationPrice = Math.round(card.price * 1.5);

  if (!owner) {
    if (player.cash < card.price) return false;
    const choice = await openDecisionModal({
      title: `${card.code} chegou ao destino`,
      copy: `Deseja comprar o porto ${card.code} por ${formatCurrency(card.price)} antes de abrir o novo contrato?`,
      primaryLabel: `Comprar ${formatCurrency(card.price)}`,
      secondaryLabel: 'Nao comprar',
    });
    if (choice === 'primary' && buyProperty(player, card.code)) {
      player.status_label = `comprou ${card.code}`;
      pushActionLog(player, 'Porto comprado no destino', `${card.code} por ${formatCurrency(card.price)}.`);
      renderHud();
      return true;
    }
    return false;
  }

  if (owner.id === player.id || player.cash < negotiationPrice) return false;
  const choice = await openDecisionModal({
    title: `${card.code} pertence a ${owner.name}`,
    copy: `Deseja negociar a compra do porto ${card.code} por ${formatCurrency(negotiationPrice)} antes do novo contrato?`,
    primaryLabel: `Negociar ${formatCurrency(negotiationPrice)}`,
    secondaryLabel: 'Nao negociar',
  });
  if (choice === 'primary' && transferProperty(owner, player, card.code, negotiationPrice)) {
    player.status_label = `comprou ${card.code}`;
    pushActionLog(player, 'Negociacao aceita', `${card.code} por ${formatCurrency(negotiationPrice)}.`);
    pushActionLog(owner, 'Vendeu porto', `${card.code} por ${formatCurrency(negotiationPrice)} para voce.`);
    renderHud();
    return true;
  }
  return false;
}

async function maybeBuyExtraPermissionForHuman(player) {
  if (!player) return false;
  const extraCost = Number(state.rules.extra_permission_cost || 2000);
  if (player.cash < extraCost) return false;
  const choice = await openDecisionModal({
    title: 'Nova permissao',
    copy: `Deseja comprar uma nova permissao por ${formatCurrency(extraCost)} e sortear um novo tipo de frete?`,
    primaryLabel: `Comprar ${formatCurrency(extraCost)}`,
    secondaryLabel: 'Nao comprar',
  });
  if (choice !== 'primary') return false;

  updatePlayerCash(player, -extraCost);
  player.status_label = `investiu ${formatCurrency(extraCost)}`;
  pushActionLog(player, 'Nova permissao comprada', `Investiu ${formatCurrency(extraCost)} para sortear uma nova permissao.`);
  renderHud();
  setSession({
    active_player_id: player.id,
    action_label: 'Sortear nova permissao',
    note: 'Agora o jogo vai sortear a nova permissao de frete comprada.',
  });
  await openHumanPermissionDraw({
    promptText: 'Clique em embaralhar para sortear a nova permissao.',
    onSelected: (card) => {
      applyPermissionSelectionForPlayer(player, card, {
        append: true,
        setActive: true,
        updateSession: true,
        actionLabel: 'Nova permissao sorteada',
        note: `Nova permissao sorteada: ${card.title}. Ela passa a ser a permissao ativa.`,
      });
    },
  });
  return true;
}

function prepareCpuNextContractAfterDelivery(player) {
  if (!player?.needs_new_contract || player.is_human) return null;

  const currentPort = getPropertyCard(player.location_code || '');
  if (currentPort?.kind === 'port') {
    const owner = ownerPlayerOf(currentPort.code);
    const negotiationPrice = Math.round(currentPort.price * 1.5);
    if (!owner) {
      if (cpuShouldBuyOrigin(player, currentPort) && buyProperty(player, currentPort.code)) {
        pushActionLog(player, 'Porto comprado no destino', `${currentPort.code} por ${formatCurrency(currentPort.price)}.`);
      }
    } else if (owner.id !== player.id && player.cash >= negotiationPrice && transferProperty(owner, player, currentPort.code, negotiationPrice)) {
      pushActionLog(player, 'Negociacao aceita', `${currentPort.code} por ${formatCurrency(negotiationPrice)}.`);
      pushActionLog(owner, 'Vendeu porto', `${currentPort.code} por ${formatCurrency(negotiationPrice)} para ${player.name}.`);
    }
  }

  const extraCost = Number(state.rules.extra_permission_cost || 2000);
  if (player.cash >= extraCost && (player.purchase_policy || 'always') !== 'never') {
    updatePlayerCash(player, -extraCost);
    const permissionCard = randomChoice(state.freightPermissionCards);
    if (permissionCard) {
      applyPermissionSelectionForPlayer(player, permissionCard, {
        append: true,
        setActive: true,
        updateSession: false,
        note: `${player.name} comprou uma nova permissao e sorteou ${permissionCard.title}.`,
      });
      pushActionLog(player, 'Nova permissao comprada', `${formatCurrency(extraCost)} investidos em ${permissionCard.title}.`);
    }
  }

  const contract = resetContractFromCurrentPort(player, {
    updateSession: false,
    actionLabel: `${player.name}: novo contrato`,
    note: `${player.location_code} agora e o novo porto de partida de ${player.name}.`,
  });
  if (!contract) return null;

  const tollCard = randomChoice(state.tollCards);
  if (tollCard) {
    applyTollSelectionForPlayer(player, tollCard, {
      updateSession: false,
      actionLabel: `${player.name}: pedagio definido`,
      note: `${player.name} vai precisar passar por ${tollCard.code}.`,
    });
  }

  const destinationPool = destinationCandidatesForOrigin(player.location_code || contract.origin);
  const destinationCard = randomChoice(destinationPool);
  if (destinationCard) {
    applyDestinationSelectionForPlayer(player, destinationCard, {
      updateSession: false,
      actionLabel: `${player.name}: destino definido`,
      note: `${player.name} abriu um novo contrato saindo de ${player.location_code} para ${destinationCard.code}.`,
    });
  }

  player.needs_new_contract = false;
  player.status_label = 'novo contrato pronto';
  renderHud();
  return contract;
}

async function runHumanPostDeliveryTurn() {
  const player = humanPlayer();
  if (!player?.needs_new_contract || state.flow.followupSetupRunning) return;

  state.flow.followupSetupRunning = true;
  try {
    player.needs_new_contract = false;
    const nextTurn = Number(state.session?.turn_number || 1) + 1;
    setSession({
      turn_number: nextTurn,
      turn_label: `Turno ${String(nextTurn).padStart(2, '0')}`,
      phase: 'Novo turno',
      active_player_id: player.id,
      action_label: 'Preparar novo contrato',
      note: 'Agora voce decide a compra do porto atual, a compra de nova permissao e a abertura do novo contrato.',
    });

    await delay(PREP_STEP_DELAY_MS);
    await maybeBuyCurrentPortAfterDeliveryForHuman(player);
    await delay(PREP_STEP_DELAY_MS);
    await maybeBuyExtraPermissionForHuman(player);
    await delay(PREP_STEP_DELAY_MS);

    const contract = resetContractFromCurrentPort(player, {
      updateSession: true,
      actionLabel: 'Novo porto de partida',
      note: `${player.location_code} agora e o novo porto de partida.`,
    });
    if (!contract) return;

    await delay(PREP_STEP_DELAY_MS);
    setSession({
      active_player_id: player.id,
      action_label: 'Sortear pedagio',
      note: 'Agora o jogo vai sortear o novo pedagio obrigatorio.',
    });
    await openHumanTollDraw();
    await delay(PREP_STEP_DELAY_MS);
    setSession({
      active_player_id: player.id,
      action_label: 'Sortear porto de destino',
      note: 'Agora o jogo vai sortear o novo porto de destino e calcular o novo contrato.',
    });
    await openHumanDestinationPortDraw();
    await delay(PREP_STEP_DELAY_LONG_MS);
    setSession({
      active_player_id: player.id,
      action_label: 'Rolar 2 dados',
      note: 'O novo contrato foi preparado. Agora voce pode rolar os dados do proximo turno.',
    });
    const diceResult = await openHumanMovementDice();
    if (diceResult?.total) {
      player.last_roll = [...diceResult.values];
      await animateHumanMovement(diceResult.total);
    }
  } finally {
    state.flow.followupSetupRunning = false;
  }
}

function closePortDraw(result = null) {
  setPortDrawVisible(false);
  clearPortDrawExtra();
  const resolver = state.portDraw.resolver;
  state.portDraw.resolver = null;
  if (resolver) resolver(result);
}

function finishOriginPortDraw() {
  state.portDraw.drawing = false;
  state.portDraw.order = shuffleArray(state.portCards.map((card) => card.code));
  const selectedCode = randomChoice(state.portDraw.order);
  state.portDraw.selectedCardCode = selectedCode;
  const card = state.portCards.find((item) => item.code === selectedCode) || null;
  setPortDrawActive(card ? `Saida: ${card.code}` : 'Saida definida');
  setPortDrawResult(`Porto de partida sorteado: ${card?.code || '--'}.`);
  renderPortDraw();

  if (!card) {
    closePortDraw(null);
    return;
  }

  configurePortDrawExtra({
    copy: `Deseja comprar a posse do porto ${card.code} por ${card.price}?`,
    primaryLabel: 'Sim',
    secondaryLabel: 'Nao',
    onPrimary: () => {
      applyHumanOriginSelection(card, true);
      closePortDraw({ card, bought: true });
    },
    onSecondary: () => {
      applyHumanOriginSelection(card, false);
      closePortDraw({ card, bought: false });
    },
  });
}

function finishTollDraw() {
  state.portDraw.drawing = false;
  state.portDraw.order = shuffleArray(state.tollCards.map((card) => card.code));
  const selectedCode = randomChoice(state.portDraw.order);
  state.portDraw.selectedCardCode = selectedCode;
  const card = state.tollCards.find((item) => item.code === selectedCode) || null;
  setPortDrawActive(card ? `Pedagio: ${card.code}` : 'Pedagio definido');
  setPortDrawResult(`Pedagio sorteado: ${card?.code || '--'}.`);
  renderPortDraw();

  if (!card) {
    closePortDraw(null);
    return;
  }

  window.setTimeout(() => {
    applyHumanTollSelection(card);
    closePortDraw({ card });
  }, 850);
}

function finishDestinationDraw() {
  state.portDraw.drawing = false;
  const candidates = destinationCandidates();
  state.portDraw.order = shuffleArray(candidates.map((card) => card.code));
  const selectedCode = randomChoice(state.portDraw.order);
  state.portDraw.selectedCardCode = selectedCode;
  const card = candidates.find((item) => item.code === selectedCode) || null;
  setPortDrawActive(card ? `Destino: ${card.code}` : 'Destino definido');
  setPortDrawResult(`Porto de destino sorteado: ${card?.code || '--'}.`);
  renderPortDraw();

  if (!card) {
    closePortDraw(null);
    return;
  }

  const preview = calculateHumanContractPreview(card);
  const modeLabel = preview.ownsOrigin ? 'D x E x M' : 'D x E';
  configurePortDrawExtra({
    copy: `Calculo do contrato: ${preview.formula} (${modeLabel}). D = distancia, E = estadia, M = multiplicador.`,
    primaryLabel: 'Confirmar contrato',
    onPrimary: () => {
      applyHumanDestinationSelection(card);
      closePortDraw({ card, contract: preview });
    },
    hideSecondary: true,
  });
}

function startCurrentPortDraw() {
  const cards = currentPortDrawCards();
  if (state.portDraw.drawing || !cards.length) return;

  clearPortDrawExtra();
  state.portDraw.drawing = true;
  state.portDraw.selectedCardCode = '';
  state.portDraw.frame = 0;
  state.portDraw.order = shuffleArray(cards.map((card) => card.code));
  setPortDrawActive('Embaralhando');
  setPortDrawResult(state.portDraw.mode === 'toll' ? 'Embaralhando os pedagios...' : 'Embaralhando os portos de partida...');
  renderPortDraw();

  const durationMs = 1800;
  const shuffleEveryMs = 100;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    state.portDraw.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      state.portDraw.order = shuffleArray(cards.map((card) => card.code));
      lastShuffleAt = now;
    }

    renderPortDraw();

    if (elapsed < durationMs) {
      state.portDraw.rafId = window.requestAnimationFrame(step);
      return;
    }

    if (state.portDraw.mode === 'toll') {
      finishTollDraw();
      return;
    }
    if (state.portDraw.mode === 'destination') {
      finishDestinationDraw();
      return;
    }
    finishOriginPortDraw();
  }

  if (state.portDraw.rafId) {
    window.cancelAnimationFrame(state.portDraw.rafId);
  }
  state.portDraw.rafId = window.requestAnimationFrame(step);
}

function openHumanOriginPortDraw() {
  state.portDraw.mode = 'origin';
  state.portDraw.drawing = false;
  state.portDraw.selectedCardCode = '';
  state.portDraw.frame = 0;
  state.portDraw.order = state.portCards.map((card) => card.code);
  clearPortDrawExtra();
  setPortDrawActive('Aguardando sorteio');
  setPortDrawResult('Clique em embaralhar para sortear o porto de partida.');
  renderPortDraw();
  setPortDrawVisible(true);
  return new Promise((resolve) => {
    state.portDraw.resolver = resolve;
  });
}

function openHumanTollDraw() {
  state.portDraw.mode = 'toll';
  state.portDraw.drawing = false;
  state.portDraw.selectedCardCode = '';
  state.portDraw.frame = 0;
  state.portDraw.order = state.tollCards.map((card) => card.code);
  clearPortDrawExtra();
  setPortDrawActive('Aguardando sorteio');
  setPortDrawResult('Clique em embaralhar para sortear o pedagio obrigatorio.');
  renderPortDraw();
  setPortDrawVisible(true);
  return new Promise((resolve) => {
    state.portDraw.resolver = resolve;
  });
}

function openHumanDestinationPortDraw() {
  state.portDraw.mode = 'destination';
  state.portDraw.drawing = false;
  state.portDraw.selectedCardCode = '';
  state.portDraw.frame = 0;
  state.portDraw.order = destinationCandidates().map((card) => card.code);
  clearPortDrawExtra();
  setPortDrawActive('Aguardando sorteio');
  setPortDrawResult('Clique em embaralhar para sortear o porto de destino.');
  renderPortDraw();
  setPortDrawVisible(true);
  return new Promise((resolve) => {
    state.portDraw.resolver = resolve;
  });
}

function getMovementDiceOverlay() {
  return byId('movement-dice-overlay');
}

function getMovementDiceStage() {
  return byId('movement-dice-stage');
}

function getMovementDiceButton() {
  return byId('movement-dice-button');
}

function getMovementDiceResult() {
  return byId('movement-dice-result');
}

function getMovementDiceActive() {
  return byId('movement-dice-active');
}

function setMovementDiceVisible(visible) {
  const overlay = getMovementDiceOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function setMovementDiceResult(message) {
  const node = getMovementDiceResult();
  if (node) node.textContent = message;
}

function setMovementDiceActive(message) {
  const node = getMovementDiceActive();
  if (node) node.textContent = message;
}

function renderMovementDice() {
  const stage = getMovementDiceStage();
  const button = getMovementDiceButton();
  if (!stage) return;

  const total = state.movementDice.values[0] + state.movementDice.values[1];
  const isDouble = state.movementDice.values[0] === state.movementDice.values[1];
  const rollingClass = state.movementDice.rolling ? ' is-rolling' : '';
  const note = state.movementDice.rolling
    ? 'Rolando...'
    : (isDouble ? 'Dupla. A jogada extra sera tratada depois.' : 'Sem dupla nesta rolagem.');

  stage.innerHTML = `
    <div class="movement-dice-pair">
      <article class="movement-die${rollingClass}">
        <span class="movement-die-value">${state.movementDice.values[0]}</span>
      </article>
      <article class="movement-die${rollingClass}">
        <span class="movement-die-value">${state.movementDice.values[1]}</span>
      </article>
    </div>
    <div class="movement-dice-summary">
      <strong class="movement-dice-total">Total ${total}</strong>
      <span class="movement-dice-note">${note}</span>
    </div>
  `;

  if (button) {
    button.disabled = state.movementDice.rolling;
    button.textContent = state.movementDice.rolling ? 'Rolando...' : 'Rolar 2 dados';
  }
}

function closeMovementDice(result = null) {
  setMovementDiceVisible(false);
  const resolver = state.movementDice.resolver;
  state.movementDice.resolver = null;
  if (resolver) resolver(result);
}

function shortestPath(startNodeId, endNodeId) {
  if (!startNodeId || !endNodeId) return [];
  if (startNodeId === endNodeId) return [startNodeId];
  const queue = [startNodeId];
  const parents = { [startNodeId]: null };

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const neighbors = state.adjacency[current] || [];
    for (const next of neighbors) {
      if (Object.prototype.hasOwnProperty.call(parents, next)) continue;
      parents[next] = current;
      if (next === endNodeId) {
        const path = [endNodeId];
        let cursor = current;
        while (cursor) {
          path.push(cursor);
          cursor = parents[cursor];
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function buildMovementPathForPlayer(player) {
  const contract = player?.active_contract;
  if (!player || !contract) return [];

  const startNodeId = player.board_node_id || getPropertyNode(contract.origin)?.id;
  const tollNodeId = getPropertyNode(contract.mandatory_toll)?.id;
  const destinationNodeId = getPropertyNode(contract.destination)?.id;
  if (!startNodeId || !tollNodeId || !destinationNodeId) return [];

  const firstLeg = shortestPath(startNodeId, tollNodeId);
  const secondLeg = shortestPath(tollNodeId, destinationNodeId);
  if (!firstLeg.length || !secondLeg.length) return [];
  return [...firstLeg, ...secondLeg.slice(1)];
}

function resolveContractSettlement(contract) {
  const base = Number(contract?.base_freight_value || contract?.freight_value || 0);
  const targetRounds = Number(contract?.target_rounds || state.rules.target_rounds || 4);
  const roundsElapsed = Math.max(1, Number(contract?.rounds_elapsed || 1));
  const bonusPerRound = Number(state.rules.bonus_per_early_round || 0);
  const penaltyPerRound = Number(state.rules.penalty_per_late_round || 0);
  const earlyRounds = Math.max(0, targetRounds - roundsElapsed);
  const lateRounds = Math.max(0, roundsElapsed - targetRounds);
  const adjustment = (earlyRounds * bonusPerRound) - (lateRounds * penaltyPerRound);
  return {
    base,
    targetRounds,
    roundsElapsed,
    earlyRounds,
    lateRounds,
    adjustment,
    total: base + adjustment,
  };
}

function completeContractForPlayer(player) {
  const contract = player?.active_contract;
  if (!player || !contract || contract.completed) {
    return null;
  }
  const settlement = resolveContractSettlement(contract);
  updatePlayerCash(player, settlement.total);
  contract.completed = true;
  player.needs_new_contract = true;
  contract.settlement_adjustment = settlement.adjustment;
  contract.settlement_value = settlement.total;
  contract.freight_value = settlement.total;
  contract.deadline_label = `${settlement.roundsElapsed} / ${settlement.targetRounds}`;
  contract.deadline_progress = `${settlement.roundsElapsed}/${settlement.targetRounds}`;
  if (settlement.adjustment > 0) {
    contract.note = `${playerActionName(player)} recebeu ${formatCurrency(settlement.base)} do contrato e bonus de ${formatCurrency(settlement.adjustment)}.`;
    player.status_label = `recebeu ${formatCurrency(settlement.total)}`;
    pushActionLog(player, 'Contrato concluido', `${formatCurrency(settlement.base)} + bonus ${formatCurrency(settlement.adjustment)} = ${formatCurrency(settlement.total)}.`);
  } else if (settlement.adjustment < 0) {
    contract.note = `${playerActionName(player)} recebeu ${formatCurrency(settlement.base)} do contrato com onus de ${formatCurrency(Math.abs(settlement.adjustment))}.`;
    player.status_label = `recebeu ${formatCurrency(settlement.total)}`;
    pushActionLog(player, 'Contrato concluido', `${formatCurrency(settlement.base)} - onus ${formatCurrency(Math.abs(settlement.adjustment))} = ${formatCurrency(settlement.total)}.`);
  } else {
    contract.note = `${playerActionName(player)} recebeu ${formatCurrency(settlement.total)} e concluiu o contrato.`;
    player.status_label = `recebeu ${formatCurrency(settlement.total)}`;
    pushActionLog(player, 'Contrato concluido', `${formatCurrency(settlement.total)} sem ajuste.`);
  }
  renderHud();
  return settlement;
}

function buildHumanMovementPath() {
  return buildMovementPathForPlayer(humanPlayer());
}

async function animatePlayerMovement(player, totalSteps, { stepDelay = 360, diceValues = null, updateSession = true } = {}) {
  const contract = player?.active_contract;
  if (!player || !contract) return;

  const fullPath = buildMovementPathForPlayer(player);
  const resolvedDice = Array.isArray(diceValues) && diceValues.length === 2
    ? [...diceValues]
    : [...state.movementDice.values];

  if (!fullPath.length) {
    if (updateSession) {
      setSession({
        active_player_id: player.id,
        action_label: 'Movimento indisponivel',
        dice: resolvedDice,
        note: 'Nao foi possivel calcular a rota PP -> Pedagio -> PD.',
      });
    }
    return;
  }

  const maxMoves = Math.min(totalSteps, Math.max(0, fullPath.length - 1));
  if (updateSession) {
    setSession({
      active_player_id: player.id,
      action_label: player.is_human ? 'Navio em movimento' : `${player.name}: navio em movimento`,
      dice: resolvedDice,
      note: `O navio vai percorrer ${maxMoves} casas no menor caminho ate ${contract.destination}, passando por ${contract.mandatory_toll}.`,
    });
  }

  const traveled = [];
  for (let step = 1; step <= maxMoves; step += 1) {
    const nodeId = fullPath[step];
    traveled.push(nodeId);
    setPlayerNode(player, nodeId);
    renderHud();
    renderShipOverlay();
    await delay(stepDelay);
  }

  const finalNode = state.nodesById[player.board_node_id] || null;
  const tollNodeId = getPropertyNode(contract.mandatory_toll)?.id;
  const destinationNodeId = getPropertyNode(contract.destination)?.id;
  const passedToll = tollNodeId ? traveled.includes(tollNodeId) : false;
  const reachedDestination = Boolean(destinationNodeId && player.board_node_id === destinationNodeId);
  const contractCompletion = reachedDestination && passedToll
    ? completeContractForPlayer(player)
    : null;
  const fuelCost = finalNode?.kind === 'fuel' ? resolveFuelStopForPlayer(player, finalNode) : 0;
  const chanceOutcome = finalNode?.kind === 'chance'
    ? await resolveChanceStopForPlayer(player, { stepDelay })
    : null;
  const portOutcome = finalNode?.kind === 'port' && !reachedDestination
    ? await resolvePortStopForPlayer(player, finalNode, { stepDelay })
    : null;
  const tollOutcome = finalNode?.kind === 'toll'
    ? await resolveTollStopForPlayer(player, finalNode, { stepDelay })
    : null;
  const propertyOutcome = portOutcome || tollOutcome;

  let note = `O navio terminou a jogada em ${player.location_label}.`;
  if (reachedDestination && passedToll) {
    if (contractCompletion?.adjustment > 0) {
      note = `O navio chegou em ${contract.destination} depois de passar por ${contract.mandatory_toll} e recebeu ${formatCurrency(contractCompletion.total)} (${formatCurrency(contractCompletion.base)} + bonus ${formatCurrency(contractCompletion.adjustment)}).`;
    } else if (contractCompletion?.adjustment < 0) {
      note = `O navio chegou em ${contract.destination} depois de passar por ${contract.mandatory_toll} e recebeu ${formatCurrency(contractCompletion.total)} (${formatCurrency(contractCompletion.base)} - onus ${formatCurrency(Math.abs(contractCompletion.adjustment))}).`;
    } else {
      note = `O navio chegou em ${contract.destination} depois de passar por ${contract.mandatory_toll} e recebeu ${formatCurrency(contractCompletion?.total || 0)}.`;
    }
  } else if (propertyOutcome) {
    note = propertyOutcome.note;
  } else if (chanceOutcome) {
    note = chanceOutcome.note;
  } else if (finalNode?.kind === 'fuel') {
    note = `O navio parou em ${player.location_label} e pagou ${formatCurrency(fuelCost)} ao banco.`;
  } else if (!passedToll) {
    note = `O navio avancou ${maxMoves} casas e segue rumo ao pedagio ${contract.mandatory_toll}.`;
  } else if (!reachedDestination) {
    note = `O navio avancou ${maxMoves} casas e segue rumo ao destino ${contract.destination}.`;
  }

  contract.note = note;
  player.status_label = reachedDestination && passedToll
    ? `recebeu ${formatCurrency(contractCompletion?.total || 0)}`
    : (propertyOutcome?.statusLabel || chanceOutcome?.statusLabel || (finalNode?.kind === 'fuel' ? `abasteceu ${formatCurrency(fuelCost)}` : player.location_label));
  player.last_roll = resolvedDice;
  if (updateSession) {
    setSession({
      active_player_id: player.id,
      action_label: reachedDestination && passedToll
        ? (player.is_human ? 'Contrato concluido' : `${player.name}: contrato concluido`)
        : propertyOutcome
          ? (finalNode?.kind === 'toll'
              ? (player.is_human ? 'Pedagio resolvido' : `${player.name}: pedagio resolvido`)
              : (player.is_human ? 'Porto resolvido' : `${player.name}: porto resolvido`))
          : (chanceOutcome?.card
              ? `${chanceCategoryLabel(chanceOutcome.card)}: ${chanceOutcome.card.title}`
              : (player.is_human ? 'Parada resolvida' : `${player.name}: parada resolvida`)),
      dice: resolvedDice,
      note,
    });
  }
  if (reachedDestination && passedToll) {
    if (player.is_human && !state.flow.openingRoundRunning && !state.flow.followupSetupRunning) {
      window.setTimeout(() => {
        runHumanPostDeliveryTurn().catch(() => {});
      }, PREP_STEP_DELAY_LONG_MS);
    } else if (!player.is_human) {
      prepareCpuNextContractAfterDelivery(player);
    }
  }
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
}

async function animateHumanMovement(totalSteps) {
  return animatePlayerMovement(humanPlayer(), totalSteps, {
    stepDelay: 360,
    diceValues: [...state.movementDice.values],
    updateSession: true,
  });
}

function startMovementDiceRoll() {
  if (state.movementDice.rolling) return;

  state.movementDice.rolling = true;
  state.movementDice.finalValues = [randomDie(), randomDie()];
  setMovementDiceActive('Rolando');
  setMovementDiceResult('Os dois dados estao rolando...');
  renderMovementDice();

  const startedAt = performance.now();
  const durationMs = 1450;
  const tickMs = 80;
  let lastTickAt = 0;

  function step(now) {
    const elapsed = now - startedAt;

    if ((now - lastTickAt) >= tickMs) {
      state.movementDice.values = [randomDie(), randomDie()];
      lastTickAt = now;
      renderMovementDice();
    }

    if (elapsed < durationMs) {
      state.movementDice.rafId = window.requestAnimationFrame(step);
      return;
    }

    state.movementDice.rolling = false;
    state.movementDice.values = [...state.movementDice.finalValues];
    const [left, right] = state.movementDice.values;
    const total = left + right;
    const isDouble = left === right;
    setMovementDiceActive(isDouble ? `Dupla ${left}-${right}` : `Resultado ${left}-${right}`);
    setMovementDiceResult(isDouble
      ? `Resultado final: ${left} + ${right} = ${total}. Saiu dupla.`
      : `Resultado final: ${left} + ${right} = ${total}.`);
    renderMovementDice();

    window.setTimeout(() => {
      closeMovementDice({ values: [...state.movementDice.values], total, isDouble });
    }, 700);
  }

  if (state.movementDice.rafId) {
    window.cancelAnimationFrame(state.movementDice.rafId);
  }
  state.movementDice.rafId = window.requestAnimationFrame(step);
}

function openHumanMovementDice() {
  state.movementDice.rolling = false;
  state.movementDice.values = [randomDie(), randomDie()];
  state.movementDice.finalValues = [1, 1];
  setMovementDiceActive('Aguardando rolagem');
  setMovementDiceResult('Clique em rolar para sortear os dois dados.');
  renderMovementDice();
  setMovementDiceVisible(true);
  return new Promise((resolve) => {
    state.movementDice.resolver = resolve;
  });
}

function getDecisionOverlay() {
  return byId('decision-overlay');
}

function getDecisionTitle() {
  return byId('decision-title');
}

function getDecisionCopy() {
  return byId('decision-copy');
}

function getDecisionPrimary() {
  return byId('decision-primary');
}

function getDecisionSecondary() {
  return byId('decision-secondary');
}

function setDecisionVisible(visible) {
  const overlay = getDecisionOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function closeDecision(result = 'primary') {
  setDecisionVisible(false);
  const resolver = state.decision.resolver;
  state.decision.resolver = null;
  if (resolver) resolver(result);
}

function openDecisionModal({ title, copy, primaryLabel = 'Continuar', secondaryLabel = 'Cancelar', hideSecondary = false } = {}) {
  const titleNode = getDecisionTitle();
  const copyNode = getDecisionCopy();
  const primary = getDecisionPrimary();
  const secondary = getDecisionSecondary();
  if (titleNode) titleNode.textContent = title || 'Confirmar acao';
  if (copyNode) copyNode.textContent = copy || '';
  if (primary) {
    primary.textContent = primaryLabel;
    primary.onclick = () => closeDecision('primary');
  }
  if (secondary) {
    secondary.textContent = secondaryLabel;
    secondary.classList.toggle('is-hidden', hideSecondary);
    secondary.onclick = hideSecondary ? null : (() => closeDecision('secondary'));
  }
  setDecisionVisible(true);
  return new Promise((resolve) => {
    state.decision.resolver = resolve;
  });
}

function getChanceDrawOverlay() {
  return byId('chance-draw-overlay');
}

function getChanceDrawStage() {
  return byId('chance-draw-stage');
}

function getChanceDrawButton() {
  return byId('chance-draw-button');
}

function getChanceDrawResult() {
  return byId('chance-draw-result');
}

function getChanceDrawActive() {
  return byId('chance-draw-active');
}

function setChanceDrawVisible(visible) {
  const overlay = getChanceDrawOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function setChanceDrawResult(message) {
  const node = getChanceDrawResult();
  if (node) node.textContent = message;
}

function setChanceDrawActive(message) {
  const node = getChanceDrawActive();
  if (node) node.textContent = message;
}

function chanceVisibleCards() {
  if (state.chanceDraw.revealOnly && state.chanceDraw.selectedCardId) {
    const selected = state.chanceCards.find((card) => card.id === state.chanceDraw.selectedCardId);
    return selected ? [selected] : [];
  }

  if (state.chanceDraw.selectedCardId) {
    const selected = state.chanceCards.find((card) => card.id === state.chanceDraw.selectedCardId);
    const rest = state.chanceDraw.order
      .filter((id) => id !== state.chanceDraw.selectedCardId)
      .slice(0, 10)
      .map((id) => state.chanceCards.find((card) => card.id === id))
      .filter(Boolean);
    return selected ? [selected, ...rest] : rest;
  }

  return state.chanceDraw.order
    .slice(0, 12)
    .map((id) => state.chanceCards.find((card) => card.id === id))
    .filter(Boolean);
}

function chanceCardTransform(index, cardId) {
  const total = chanceVisibleCards().length || 1;
  const centeredIndex = index - ((total - 1) / 2);

  if (state.chanceDraw.drawing) {
    const frame = state.chanceDraw.frame;
    const x = Math.sin((frame * 0.2) + index) * 170 + (centeredIndex * 12);
    const y = Math.cos((frame * 0.16) + (index * 0.8)) * 36;
    const rotate = Math.sin((frame * 0.1) + index) * 18;
    return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(0.94)`;
  }

  if (state.chanceDraw.revealOnly && state.chanceDraw.selectedCardId) {
    return 'translate(0px, 0px) rotate(0deg) scale(1.04)';
  }

  if (state.chanceDraw.selectedCardId) {
    if (cardId === state.chanceDraw.selectedCardId) {
      return 'translate(0px, -8px) rotate(0deg) scale(1.06)';
    }
    return `translate(${centeredIndex * 90}px, 114px) rotate(${centeredIndex * 7}deg) scale(0.8)`;
  }

  return `translate(${centeredIndex * 18}px, ${Math.abs(centeredIndex) * 3}px) rotate(${centeredIndex * 4}deg)`;
}

function renderChanceDraw() {
  const stage = getChanceDrawStage();
  const button = getChanceDrawButton();
  if (!stage) return;

  const cards = chanceVisibleCards();
  stage.innerHTML = cards.map((card, index) => {
    const selected = state.chanceDraw.selectedCardId === card.id;
    const faded = Boolean(state.chanceDraw.selectedCardId) && !selected;
    const zIndex = selected ? 1000 : (faded ? 50 + index : 120 + index);
    return `
      <article class="chance-draw-card${selected ? ' is-selected' : ''}${faded ? ' is-faded' : ''}" style="--chance-accent:${card.accent}; --chance-text:${card.text}; transform:${chanceCardTransform(index, card.id)}; z-index:${zIndex};">
        <header class="chance-draw-card-head">${card.title}</header>
        <div class="chance-draw-card-body">${card.description}</div>
        <footer class="chance-draw-card-foot">${card.effect_text}</footer>
      </article>
    `;
  }).join('');

  if (button) {
    button.disabled = state.chanceDraw.drawing;
    button.textContent = state.chanceDraw.drawing ? 'Embaralhando...' : 'Embaralhar e sortear';
    button.style.display = state.chanceDraw.revealOnly ? 'none' : 'inline-flex';
  }
}

function closeChanceDraw(card = null) {
  setChanceDrawVisible(false);
  const resolver = state.chanceDraw.resolver;
  state.chanceDraw.resolver = null;
  state.chanceDraw.playerId = '';
  state.chanceDraw.autoStart = false;
  state.chanceDraw.revealOnly = false;
  if (resolver) resolver(card);
}

function startChanceDraw() {
  if (state.chanceDraw.drawing || !state.chanceCards.length) return;
  state.chanceDraw.drawing = true;
  state.chanceDraw.selectedCardId = '';
  state.chanceDraw.frame = 0;
  setChanceDrawActive('Embaralhando');
  setChanceDrawResult('Misturando o baralho de sorte e reves...');
  renderChanceDraw();

  const durationMs = 1900;
  const shuffleEveryMs = 100;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    state.chanceDraw.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      state.chanceDraw.order = shuffleArray(state.chanceCards.map((card) => card.id));
      lastShuffleAt = now;
    }

    renderChanceDraw();

    if (elapsed < durationMs) {
      state.chanceDraw.rafId = window.requestAnimationFrame(step);
      return;
    }

    state.chanceDraw.drawing = false;
    state.chanceDraw.order = shuffleArray(state.chanceCards.map((card) => card.id));
    const selected = randomChoice(state.chanceDraw.order);
    state.chanceDraw.selectedCardId = selected;
    const card = state.chanceCards.find((item) => item.id === selected) || null;
    setChanceDrawActive(card ? `${chanceCategoryLabel(card)}: ${card.title}` : 'Carta sorteada');
    setChanceDrawResult(`Carta sorteada: ${card?.title || '--'}.`);
    renderChanceDraw();

    window.setTimeout(() => closeChanceDraw(card), 850);
  }

  if (state.chanceDraw.rafId) {
    window.cancelAnimationFrame(state.chanceDraw.rafId);
  }
  state.chanceDraw.rafId = window.requestAnimationFrame(step);
}

function openChanceDrawForPlayer(player, { autoStart = false } = {}) {
  state.chanceDraw.drawing = false;
  state.chanceDraw.selectedCardId = '';
  state.chanceDraw.frame = 0;
  state.chanceDraw.order = shuffleArray(state.chanceCards.map((card) => card.id));
  state.chanceDraw.playerId = player?.id || '';
  state.chanceDraw.autoStart = autoStart;
  state.chanceDraw.revealOnly = false;
  const copy = byId('chance-draw-copy');

  if (autoStart) {
    const selectedId = randomChoice(state.chanceDraw.order);
    const card = state.chanceCards.find((item) => item.id === selectedId) || null;
    state.chanceDraw.selectedCardId = selectedId || '';
    state.chanceDraw.order = selectedId ? [selectedId] : state.chanceDraw.order;
    state.chanceDraw.revealOnly = true;
    setChanceDrawActive(card ? `${chanceCategoryLabel(card)}: ${card.title}` : 'Carta revelada');
    setChanceDrawResult(card ? `${playerActionName(player)} revelou ${card.title}.` : 'Carta revelada.');
    if (copy) {
      copy.textContent = `${playerActionName(player)} parou em Sorte / Reves. A carta escolhida aleatoriamente aparece abaixo.`;
    }
    renderChanceDraw();
    setChanceDrawVisible(true);
    return new Promise((resolve) => {
      state.chanceDraw.resolver = resolve;
      window.setTimeout(() => closeChanceDraw(card), 1300);
    });
  }

  setChanceDrawActive('Aguardando sorteio');
  setChanceDrawResult('Clique em embaralhar para sortear uma carta.');
  if (copy) {
    copy.textContent = 'Voce parou em Sorte / Reves. Embaralhe o baralho e revele a carta.';
  }
  renderChanceDraw();
  setChanceDrawVisible(true);
  return new Promise((resolve) => {
    state.chanceDraw.resolver = resolve;
  });
}

function buildRouteSegment(path, currentIndex, targetIndex) {
  if (currentIndex < 0 || targetIndex < 0) return [];
  if (targetIndex >= currentIndex) return path.slice(currentIndex, targetIndex + 1);
  return path.slice(targetIndex, currentIndex + 1).reverse();
}

async function animatePathSegment(player, path, { stepDelay = 260 } = {}) {
  if (!player || !Array.isArray(path) || path.length < 2) return;
  for (const nodeId of path.slice(1)) {
    setPlayerNode(player, nodeId);
    renderHud();
    renderNodeOverlay();
    renderShipOverlay();
    await delay(stepDelay);
  }
}

async function movePlayerByRouteSteps(player, steps, { stepDelay = 260 } = {}) {
  const fullPath = buildMovementPathForPlayer(player);
  const currentIndex = fullPath.lastIndexOf(player.board_node_id);
  if (!fullPath.length || currentIndex < 0) {
    return { moved: false, label: player.location_label };
  }
  const targetIndex = Math.max(0, Math.min(fullPath.length - 1, currentIndex + steps));
  const segment = buildRouteSegment(fullPath, currentIndex, targetIndex);
  await animatePathSegment(player, segment, { stepDelay });
  return { moved: targetIndex !== currentIndex, label: player.location_label, targetNodeId: fullPath[targetIndex] };
}

async function movePlayerToNode(player, targetNodeId, { stepDelay = 260 } = {}) {
  if (!player?.board_node_id || !targetNodeId || player.board_node_id === targetNodeId) {
    return { moved: false, label: player?.location_label || '--', targetNodeId: player?.board_node_id || '' };
  }
  const path = shortestPath(player.board_node_id, targetNodeId);
  if (!path.length) {
    return { moved: false, label: player.location_label, targetNodeId: player.board_node_id };
  }
  await animatePathSegment(player, path, { stepDelay });
  return { moved: true, label: player.location_label, targetNodeId };
}

async function movePlayerToContractToll(player, { stepDelay = 260 } = {}) {
  const tollNodeId = getPropertyNode(player?.active_contract?.mandatory_toll)?.id;
  return movePlayerToNode(player, tollNodeId, { stepDelay });
}

async function movePlayerToOriginPort(player, { stepDelay = 260 } = {}) {
  const originNodeId = getPropertyNode(player?.active_contract?.origin)?.id;
  return movePlayerToNode(player, originNodeId, { stepDelay });
}

async function movePlayerByPortOffset(player, offset, { stepDelay = 260 } = {}) {
  const fullPath = buildMovementPathForPlayer(player);
  const currentIndex = fullPath.lastIndexOf(player.board_node_id);
  if (!fullPath.length || currentIndex < 0) {
    return { moved: false, label: player.location_label };
  }
  const ports = fullPath
    .map((nodeId, index) => ({ nodeId, index, node: state.nodesById[nodeId] }))
    .filter((entry) => entry.node?.kind === 'port');
  if (!ports.length) return { moved: false, label: player.location_label };

  let currentPortIndex = ports.findIndex((entry) => entry.index === currentIndex);
  if (currentPortIndex < 0) {
    currentPortIndex = ports.reduce((best, entry, index) => (entry.index <= currentIndex ? index : best), 0);
  }
  const targetPortIndex = Math.max(0, Math.min(ports.length - 1, currentPortIndex + offset));
  return movePlayerToNode(player, ports[targetPortIndex].nodeId, { stepDelay });
}

function otherPlayers(player) {
  return state.players.filter((entry) => entry.id !== player?.id);
}

async function applyChanceCardEffect(player, card, { stepDelay = 260 } = {}) {
  const effect = card?.effect || {};
  const contract = ensurePlayerContractDraft(player);
  let note = card?.effect_text || 'Carta aplicada.';
  let detail = note;
  let statusLabel = `${chanceCategoryLabel(card).toLowerCase()}: ${card?.title || 'carta'}`;

  if (!player || !card) {
    return { note, detail, statusLabel };
  }

  switch (effect.type) {
    case 'gain_money': {
      updatePlayerCash(player, effect.amount || 0);
      note = `${playerActionName(player)} recebeu ${formatCurrency(effect.amount || 0)}.`;
      detail = `Recebeu ${formatCurrency(effect.amount || 0)}.`;
      statusLabel = `recebeu ${formatCurrency(effect.amount || 0)}`;
      break;
    }
    case 'pay_money': {
      updatePlayerCash(player, -(effect.amount || 0));
      note = `${playerActionName(player)} pagou ${formatCurrency(effect.amount || 0)}.`;
      detail = `Pagou ${formatCurrency(effect.amount || 0)}.`;
      statusLabel = `pagou ${formatCurrency(effect.amount || 0)}`;
      break;
    }
    case 'gain_from_each': {
      const amount = effect.amount || 0;
      const rivals = otherPlayers(player);
      rivals.forEach((entry) => updatePlayerCash(entry, -amount));
      updatePlayerCash(player, amount * rivals.length);
      note = `${playerActionName(player)} recebeu ${formatCurrency(amount)} de cada adversario.`;
      detail = `Recebeu ${formatCurrency(amount * rivals.length)} de ${rivals.length} jogadores.`;
      statusLabel = `recebeu ${formatCurrency(amount * rivals.length)}`;
      break;
    }
    case 'pay_each': {
      const amount = effect.amount || 0;
      const rivals = otherPlayers(player);
      rivals.forEach((entry) => updatePlayerCash(entry, amount));
      updatePlayerCash(player, -(amount * rivals.length));
      note = `${playerActionName(player)} pagou ${formatCurrency(amount)} a cada adversario.`;
      detail = `Pagou ${formatCurrency(amount * rivals.length)} para ${rivals.length} jogadores.`;
      statusLabel = `pagou ${formatCurrency(amount * rivals.length)}`;
      break;
    }
    case 'receive_half_current_freight': {
      const amount = Math.round((contract?.freight_value || 0) / 2);
      updatePlayerCash(player, amount);
      note = `${playerActionName(player)} recebeu metade do frete atual: ${formatCurrency(amount)}.`;
      detail = `Recebeu ${formatCurrency(amount)}.`;
      statusLabel = `recebeu ${formatCurrency(amount)}`;
      break;
    }
    case 'skip_turns': {
      player.skip_turns = (player.skip_turns || 0) + (effect.turns || 0);
      note = `${playerActionName(player)} vai parar ${effect.turns || 0} rodada(s).`;
      detail = `Parado por ${effect.turns || 0} rodada(s).`;
      statusLabel = `parado ${player.skip_turns} rodada(s)`;
      break;
    }
    case 'coupon': {
      const coupon = { kind: effect.coupon, label: card.title };
      player.coupons = [...(player.coupons || []), coupon];
      note = `${playerActionName(player)} guardou o cupom ${card.title}.`;
      detail = `Guardou o cupom ${card.title}.`;
      statusLabel = `cupom ${card.title}`;
      break;
    }
    case 'double_dice_once': {
      const coupon = { kind: 'double_dice_once', label: card.title || couponLabelFromCode('double_dice_once') };
      player.coupons = [...(player.coupons || []), coupon];
      note = `${playerActionName(player)} guardou um bonus de dados x2.`;
      detail = 'Guardou o bonus de dados x2.';
      statusLabel = 'dados x2 guardado';
      break;
    }
    case 'move_steps': {
      const moved = await movePlayerByRouteSteps(player, effect.steps || 0, { stepDelay });
      const verb = (effect.steps || 0) >= 0 ? 'avancou' : 'voltou';
      note = `${playerActionName(player)} ${verb} ${Math.abs(effect.steps || 0)} casa(s) e foi para ${moved.label}.`;
      detail = `${verb[0].toUpperCase() + verb.slice(1)} ${Math.abs(effect.steps || 0)} casa(s) ate ${moved.label}.`;
      statusLabel = moved.label;
      break;
    }
    case 'move_to_toll': {
      const moved = await movePlayerToContractToll(player, { stepDelay });
      note = `${playerActionName(player)} foi para o pedagio ${player.active_contract?.mandatory_toll || moved.label}.`;
      detail = `Foi para o pedagio ${player.active_contract?.mandatory_toll || moved.label}.`;
      statusLabel = moved.label;
      break;
    }
    case 'move_ports': {
      const moved = await movePlayerByPortOffset(player, effect.offset || 0, { stepDelay });
      note = `${playerActionName(player)} foi para ${moved.label}.`;
      detail = `Reposicionado para ${moved.label}.`;
      statusLabel = moved.label;
      break;
    }
    case 'move_to_origin_port': {
      const moved = await movePlayerToOriginPort(player, { stepDelay });
      note = `${playerActionName(player)} voltou ao porto de origem ${player.active_contract?.origin || moved.label}.`;
      detail = `Voltou ao porto de origem ${player.active_contract?.origin || moved.label}.`;
      statusLabel = moved.label;
      break;
    }
    default: {
      note = card.effect_text || `${playerActionName(player)} comprou uma carta.`;
      detail = note;
      break;
    }
  }

  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return { note, detail, statusLabel };
}

async function resolveChanceStopForPlayer(player, { stepDelay = 260 } = {}) {
  setSession({
    active_player_id: player.id,
    action_label: player.is_human ? 'Sorte / Reves' : `${player.name}: sorte / reves`,
    note: `${playerActionName(player)} parou em Sorte / Reves.`,
  });
  const card = await openChanceDrawForPlayer(player, { autoStart: !player.is_human });
  if (!card) {
    return { note: 'Nenhuma carta sorteada.', statusLabel: player.status_label };
  }
  const outcome = await applyChanceCardEffect(player, card, { stepDelay: Math.max(180, stepDelay - 40) });
  pushActionLog(player, `${chanceCategoryLabel(card)}: ${card.title}`, outcome.detail || outcome.note);
  return {
    card,
    note: `${chanceCategoryLabel(card)}: ${card.title}. ${outcome.note}`,
    statusLabel: outcome.statusLabel || player.status_label,
  };
}

async function resolvePortStopForPlayer(player, node, { stepDelay = 260 } = {}) {
  const card = getPropertyCard(node?.label || '');
  if (!player || !card) {
    return { note: `${playerActionName(player)} parou em porto sem dados.`, statusLabel: player?.status_label || '--' };
  }

  const owner = ownerPlayerOf(card.code);
  const { fee, multiplier } = getPropertyStopRate(player, card);
  const ownerCharge = fee * multiplier;
  const negotiationPrice = Math.round(card.price * 1.5);

  setSession({
    active_player_id: player.id,
    action_label: player.is_human ? `Porto ${card.code}` : `${player.name}: porto ${card.code}`,
    note: `${playerActionName(player)} parou em ${card.code}.`,
  });

  if (!owner) {
    if (!player.is_human) {
      const shouldBuy = cpuShouldBuyOrigin(player, card);
      if (shouldBuy && buyProperty(player, card.code)) {
        player.status_label = `comprou ${card.code}`;
        pushActionLog(player, 'Porto comprado', `${card.code} por ${formatCurrency(card.price)}.`);
        renderHud();
        return {
          note: `${playerActionName(player)} comprou o porto ${card.code} por ${formatCurrency(card.price)}.`,
          statusLabel: player.status_label,
        };
      }

      updatePlayerCash(player, -fee);
      player.status_label = `pagou ${formatCurrency(fee)}`;
      pushActionLog(player, 'Estadia ao banco', `${card.code}: ${formatCurrency(fee)}.`);
      renderHud();
      return {
        note: `${playerActionName(player)} pagou ${formatCurrency(fee)} ao banco em ${card.code}.`,
        statusLabel: player.status_label,
      };
    }

    const canBuy = player.cash >= card.price;
    const choice = await openDecisionModal({
      title: `${card.code} sem dono`,
      copy: canBuy
        ? `Comprar o porto por ${formatCurrency(card.price)} ou pagar estadia de ${formatCurrency(fee)} ao banco?`
        : `Voce nao tem caixa para comprar ${card.code}. Pague estadia de ${formatCurrency(fee)} ao banco.`,
      primaryLabel: canBuy ? `Comprar ${formatCurrency(card.price)}` : `Pagar ${formatCurrency(fee)}`,
      secondaryLabel: `Pagar ${formatCurrency(fee)}`,
      hideSecondary: !canBuy,
    });

    if (canBuy && choice === 'primary' && buyProperty(player, card.code)) {
      player.status_label = `comprou ${card.code}`;
      pushActionLog(player, 'Porto comprado', `${card.code} por ${formatCurrency(card.price)}.`);
      renderHud();
      return {
        note: `Voce comprou o porto ${card.code} por ${formatCurrency(card.price)}.`,
        statusLabel: player.status_label,
      };
    }

    updatePlayerCash(player, -fee);
    player.status_label = `pagou ${formatCurrency(fee)}`;
    pushActionLog(player, 'Estadia ao banco', `${card.code}: ${formatCurrency(fee)}.`);
    renderHud();
    return {
      note: `Voce pagou ${formatCurrency(fee)} ao banco em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  if (owner.id === player.id) {
    if (player.is_human) {
      await openDecisionModal({
        title: `${card.code} ja e seu`,
        copy: `O porto ${card.code} ja pertence a sua companhia. Nenhuma acao e necessaria.`,
        primaryLabel: 'Continuar',
        hideSecondary: true,
      });
    }
    player.status_label = `porto proprio ${card.code}`;
    pushActionLog(player, 'Porto proprio', `${card.code} ja pertence a sua companhia.`);
    renderHud();
    return {
      note: `${playerActionName(player)} parou em ${card.code}, que ja pertence a sua companhia.`,
      statusLabel: player.status_label,
    };
  }

  if (!player.is_human) {
    updatePlayerCash(player, -ownerCharge);
    updatePlayerCash(owner, ownerCharge);
    player.status_label = `pagou ${formatCurrency(ownerCharge)}`;
    pushActionLog(player, 'Estadia ao dono', `${card.code}: ${formatCurrency(ownerCharge)} para ${owner.name}.`);
    pushActionLog(owner, 'Recebeu estadia', `${card.code}: ${formatCurrency(ownerCharge)} de ${player.name}.`);
    renderHud();
    return {
      note: `${playerActionName(player)} pagou ${formatCurrency(ownerCharge)} a ${owner.name} em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  const canNegotiate = player.cash >= negotiationPrice;
  const choice = await openDecisionModal({
    title: `${card.code} pertence a ${owner.name}`,
    copy: canNegotiate
      ? `Pague ${formatCurrency(ownerCharge)} de estadia ao dono ou negocie a compra do porto por ${formatCurrency(negotiationPrice)}.`
      : `Pague ${formatCurrency(ownerCharge)} de estadia ao dono. Voce nao tem caixa para a oferta padrao de ${formatCurrency(negotiationPrice)}.`,
    primaryLabel: `Pagar ${formatCurrency(ownerCharge)}`,
    secondaryLabel: `Negociar ${formatCurrency(negotiationPrice)}`,
    hideSecondary: !canNegotiate,
  });

  if (canNegotiate && choice === 'secondary' && transferProperty(owner, player, card.code, negotiationPrice)) {
    player.status_label = `comprou ${card.code}`;
    pushActionLog(player, 'Negociacao aceita', `${card.code} por ${formatCurrency(negotiationPrice)}.`);
    pushActionLog(owner, 'Vendeu porto', `${card.code} por ${formatCurrency(negotiationPrice)} para voce.`);
    renderHud();
    return {
      note: `Voce negociou e comprou ${card.code} de ${owner.name} por ${formatCurrency(negotiationPrice)}.`,
      statusLabel: player.status_label,
    };
  }

  updatePlayerCash(player, -ownerCharge);
  updatePlayerCash(owner, ownerCharge);
  player.status_label = `pagou ${formatCurrency(ownerCharge)}`;
  pushActionLog(player, 'Estadia ao dono', `${card.code}: ${formatCurrency(ownerCharge)} para ${owner.name}.`);
  pushActionLog(owner, 'Recebeu estadia', `${card.code}: ${formatCurrency(ownerCharge)} de voce.`);
  renderHud();
  return {
    note: `Voce pagou ${formatCurrency(ownerCharge)} a ${owner.name} em ${card.code}.`,
    statusLabel: player.status_label,
  };
}


async function resolveTollStopForPlayer(player, node, { stepDelay = 260 } = {}) {
  const card = getPropertyCard(node?.label || '');
  if (!player || !card) {
    return { note: `${playerActionName(player)} parou em pedagio sem dados.`, statusLabel: player?.status_label || '--' };
  }

  const owner = ownerPlayerOf(card.code);
  const { fee, multiplier } = getPropertyStopRate(player, card);
  const ownerCharge = fee * multiplier;
  const negotiationPrice = Math.round(card.price * 1.5);

  setSession({
    active_player_id: player.id,
    action_label: player.is_human ? `Pedagio ${card.code}` : `${player.name}: pedagio ${card.code}`,
    note: `${playerActionName(player)} parou em ${card.code}.`,
  });

  if (!owner) {
    if (!player.is_human) {
      const shouldBuy = cpuShouldBuyOrigin(player, card);
      if (shouldBuy && buyProperty(player, card.code)) {
        player.status_label = `comprou ${card.code}`;
        pushActionLog(player, 'Pedagio comprado', `${card.code} por ${formatCurrency(card.price)}.`);
        renderHud();
        return {
          note: `${playerActionName(player)} comprou o pedagio ${card.code} por ${formatCurrency(card.price)}.`,
          statusLabel: player.status_label,
        };
      }

      updatePlayerCash(player, -fee);
      player.status_label = `pagou ${formatCurrency(fee)}`;
      pushActionLog(player, 'Pedagio ao banco', `${card.code}: ${formatCurrency(fee)}.`);
      renderHud();
      return {
        note: `${playerActionName(player)} pagou ${formatCurrency(fee)} ao banco em ${card.code}.`,
        statusLabel: player.status_label,
      };
    }

    const canBuy = player.cash >= card.price;
    const choice = await openDecisionModal({
      title: `${card.code} sem dono`,
      copy: canBuy
        ? `Comprar o pedagio por ${formatCurrency(card.price)} ou pagar ${formatCurrency(fee)} ao banco?`
        : `Voce nao tem caixa para comprar ${card.code}. Pague ${formatCurrency(fee)} ao banco.`,
      primaryLabel: canBuy ? `Comprar ${formatCurrency(card.price)}` : `Pagar ${formatCurrency(fee)}`,
      secondaryLabel: `Pagar ${formatCurrency(fee)}`,
      hideSecondary: !canBuy,
    });

    if (canBuy && choice === 'primary' && buyProperty(player, card.code)) {
      player.status_label = `comprou ${card.code}`;
      pushActionLog(player, 'Pedagio comprado', `${card.code} por ${formatCurrency(card.price)}.`);
      renderHud();
      return {
        note: `Voce comprou o pedagio ${card.code} por ${formatCurrency(card.price)}.`,
        statusLabel: player.status_label,
      };
    }

    updatePlayerCash(player, -fee);
    player.status_label = `pagou ${formatCurrency(fee)}`;
    pushActionLog(player, 'Pedagio ao banco', `${card.code}: ${formatCurrency(fee)}.`);
    renderHud();
    return {
      note: `Voce pagou ${formatCurrency(fee)} ao banco em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  if (owner.id === player.id) {
    if (player.is_human) {
      await openDecisionModal({
        title: `${card.code} ja e seu`,
        copy: `O pedagio ${card.code} ja pertence a sua companhia. Nenhuma acao e necessaria.`,
        primaryLabel: 'Continuar',
        hideSecondary: true,
      });
    }
    player.status_label = `pedagio proprio ${card.code}`;
    pushActionLog(player, 'Pedagio proprio', `${card.code} ja pertence a sua companhia.`);
    renderHud();
    return {
      note: `${playerActionName(player)} parou em ${card.code}, que ja pertence a sua companhia.`,
      statusLabel: player.status_label,
    };
  }

  if (!player.is_human) {
    updatePlayerCash(player, -ownerCharge);
    updatePlayerCash(owner, ownerCharge);
    player.status_label = `pagou ${formatCurrency(ownerCharge)}`;
    pushActionLog(player, 'Pedagio ao dono', `${card.code}: ${formatCurrency(ownerCharge)} para ${owner.name}.`);
    pushActionLog(owner, 'Recebeu pedagio', `${card.code}: ${formatCurrency(ownerCharge)} de ${player.name}.`);
    renderHud();
    return {
      note: `${playerActionName(player)} pagou ${formatCurrency(ownerCharge)} a ${owner.name} em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  const canNegotiate = player.cash >= negotiationPrice;
  const choice = await openDecisionModal({
    title: `${card.code} pertence a ${owner.name}`,
    copy: canNegotiate
      ? `Pague ${formatCurrency(ownerCharge)} ao dono ou negocie a compra do pedagio por ${formatCurrency(negotiationPrice)}.`
      : `Pague ${formatCurrency(ownerCharge)} ao dono. Voce nao tem caixa para a oferta padrao de ${formatCurrency(negotiationPrice)}.`,
    primaryLabel: `Pagar ${formatCurrency(ownerCharge)}`,
    secondaryLabel: `Negociar ${formatCurrency(negotiationPrice)}`,
    hideSecondary: !canNegotiate,
  });

  if (canNegotiate && choice === 'secondary' && transferProperty(owner, player, card.code, negotiationPrice)) {
    player.status_label = `comprou ${card.code}`;
    pushActionLog(player, 'Negociacao aceita', `${card.code} por ${formatCurrency(negotiationPrice)}.`);
    pushActionLog(owner, 'Vendeu pedagio', `${card.code} por ${formatCurrency(negotiationPrice)} para voce.`);
    renderHud();
    return {
      note: `Voce negociou e comprou ${card.code} de ${owner.name} por ${formatCurrency(negotiationPrice)}.`,
      statusLabel: player.status_label,
    };
  }

  updatePlayerCash(player, -ownerCharge);
  updatePlayerCash(owner, ownerCharge);
  player.status_label = `pagou ${formatCurrency(ownerCharge)}`;
  pushActionLog(player, 'Pedagio ao dono', `${card.code}: ${formatCurrency(ownerCharge)} para ${owner.name}.`);
  pushActionLog(owner, 'Recebeu pedagio', `${card.code}: ${formatCurrency(ownerCharge)} de voce.`);
  renderHud();
  return {
    note: `Voce pagou ${formatCurrency(ownerCharge)} a ${owner.name} em ${card.code}.`,
    statusLabel: player.status_label,
  };
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
  const contract = activePlayer()?.active_contract;
  if (!contract) return new Set();
  return new Set([contract.origin, contract.mandatory_toll, contract.destination].filter(Boolean));
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
  const highlightColor = activePlayer()?.color_hex || '#8fd7ff';

  const defs = document.createElementNS(svgNs, 'defs');
  const softGlow = document.createElementNS(svgNs, 'filter');
  softGlow.setAttribute('id', 'player-halo-soft');
  softGlow.setAttribute('x', '-120%');
  softGlow.setAttribute('y', '-120%');
  softGlow.setAttribute('width', '340%');
  softGlow.setAttribute('height', '340%');
  const softBlur = document.createElementNS(svgNs, 'feGaussianBlur');
  softBlur.setAttribute('stdDeviation', '7.2');
  softGlow.appendChild(softBlur);
  defs.appendChild(softGlow);

  const tightGlow = document.createElementNS(svgNs, 'filter');
  tightGlow.setAttribute('id', 'player-halo-tight');
  tightGlow.setAttribute('x', '-90%');
  tightGlow.setAttribute('y', '-90%');
  tightGlow.setAttribute('width', '280%');
  tightGlow.setAttribute('height', '280%');
  const tightBlur = document.createElementNS(svgNs, 'feGaussianBlur');
  tightBlur.setAttribute('stdDeviation', '3.3');
  tightGlow.appendChild(tightBlur);
  defs.appendChild(tightGlow);
  overlay.appendChild(defs);

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
      if (node.kind === 'port') {
        appendCircle(x, y, 28, '#ffffff', 'none', 0, 0.28).setAttribute('filter', 'url(#player-halo-soft)');
        appendCircle(x, y, 24.5, highlightColor, 'none', 0, 0.34).setAttribute('filter', 'url(#player-halo-soft)');
        appendCircle(x, y, 20.5, '#ffffff', 'none', 0, 0.24).setAttribute('filter', 'url(#player-halo-tight)');
        appendCircle(x, y, 18.8, 'none', highlightColor, 2.9, 0.99);
      } else {
        appendDiamond(x, y, 28.5, '#ffffff', 'none', 0, 0.24).setAttribute('filter', 'url(#player-halo-soft)');
        appendDiamond(x, y, 25, highlightColor, 'none', 0, 0.30).setAttribute('filter', 'url(#player-halo-soft)');
        appendDiamond(x, y, 21.3, '#ffffff', 'none', 0, 0.22).setAttribute('filter', 'url(#player-halo-tight)');
        appendDiamond(x, y, 19.6, 'none', highlightColor, 2.9, 0.99);
      }
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

  const offsets = [[0, 0], [16, -14], [16, 12], [-16, -14], [-18, 10], [0, 18]];
  Object.entries(grouped).forEach(([nodeId, playersAtNode]) => {
    const node = state.nodesById[nodeId];
    if (!node || node.lat === null || node.lon === null) return;
    const projected = projectLonLat(node.lon, node.lat);
    if (!projected) return;
    playersAtNode.forEach((player, index) => {
      const [dx, dy] = playersAtNode.length === 1 ? [0, 0] : offsets[index % offsets.length];
      const token = document.createElement('div');
      token.className = `game-ship-token${player.id === 'human' ? ' is-human' : ''}`;
      const sprite = (player.ship_type && player.color_id)
        ? `/static/assets/ships/colored/${player.ship_type}_${player.color_id}.png`
        : (state.assets.ship_sprites?.[player.ship_type]?.[player.color_id] || '');
      token.style.left = `${projected[0] + dx}px`;
      token.style.top = `${projected[1] + dy}px`;
      token.style.width = '34px';
      token.style.height = '18px';
      token.style.marginLeft = '0';
      token.style.marginTop = '0';
      token.style.transform = 'translate(-50%, -50%)';
      token.innerHTML = sprite ? `<img class="game-ship-image" alt="" src="${sprite}" style="display:block;width:34px;height:18px;object-fit:contain;">` : '';
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${url}`);
  }
  return response.json();
}

function applyMapPayload(payload) {
  state.nodes = payload.nodes || [];
  state.projectedNodes = payload.projected_nodes || payload.nodes || [];
  state.edges = payload.edges || [];
  state.calibration = payload.calibration || null;
  state.propertyMetaByCode = Object.fromEntries(
    (payload.reference_properties || []).map((item) => [item.code, item]),
  );
  buildGraphIndexes();
}

function applyBootstrapPayload(payload) {
  state.playerColors = payload.player_colors || [];
  state.portCards = payload.port_cards || [];
  state.tollCards = payload.toll_cards || [];
  state.chanceCards = payload.chance_cards || [];
  state.freightPermissionCards = payload.freight_permission_cards || [];
  state.players = (payload.players || []).map((player) => ({
    coupons: [],
    last_roll: null,
    skip_turns: 0,
    needs_new_contract: false,
    ...player,
    coupons: player.coupons || [],
    last_roll: player.last_roll || null,
    skip_turns: player.skip_turns || 0,
  }));
  state.rules = payload.rules || {};
  state.assets = payload.assets || { ship_masks: {}, ship_fill_masks: {}, ship_sprites: {}, cargo_icons: {} };
  state.distances = payload.distances || {};
  state.session = payload.session || null;
  state.activeContract = payload.active_contract || null;
  state.view.openRivalDrawerId = null;
  state.flow.openingRoundRunning = false;
  state.flow.followupSetupRunning = false;
  state.actionFeed = [];
  buildCardIndexes();
  syncDerivedState();
  renderHud();
  renderShipOverlay();
  renderActionFeed();
}

function setSetupOverlayVisible(visible) {
  const overlay = getSetupOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function updateSetupStartButton() {
  const button = byId('setup-start-button');
  if (!button) return;
  button.disabled = state.setup.submitting || !state.setup.companyName.trim() || !state.setup.selectedColorId;
}

function renderSetupColorGrid() {
  const target = byId('setup-color-grid');
  if (!target) return;
  target.innerHTML = '';
  state.playerColors.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `game-setup-color${state.setup.selectedColorId === color.id ? ' is-active' : ''}`;
    button.innerHTML = `
      <span class="game-setup-swatch" style="background:${color.hex}"></span>
      <span class="game-setup-color-label">${color.label}</span>
    `;
    button.addEventListener('click', () => {
      state.setup.selectedColorId = color.id;
      renderSetupColorGrid();
      updateSetupStartButton();
    });
    target.appendChild(button);
  });
}

function renderSetupRivalCounts() {
  const target = byId('setup-rival-counts');
  if (!target) return;
  target.innerHTML = '';
  [2, 3, 4, 5].forEach((count) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `game-setup-count${state.setup.rivalCount === count ? ' is-active' : ''}`;
    button.textContent = String(count);
    button.addEventListener('click', () => {
      state.setup.rivalCount = count;
      renderSetupRivalCounts();
      updateSetupStartButton();
    });
    target.appendChild(button);
  });
}

function populateSetupFromPayload(payload) {
  const defaults = payload.setup_defaults || {};
  state.setup.companyName = defaults.company_name || 'Minha Companhia';
  state.setup.selectedColorId = defaults.human_color_id || state.playerColors[0]?.id || '';
  state.setup.rivalCount = defaults.rival_count || 5;
  state.setup.submitting = false;

  const nameInput = byId('setup-company-name');
  if (nameInput) {
    nameInput.value = state.setup.companyName;
    nameInput.addEventListener('input', (event) => {
      state.setup.companyName = event.target.value;
      updateSetupStartButton();
    });
  }

  renderSetupColorGrid();
  renderSetupRivalCounts();
  updateSetupStartButton();
}

function cpuShouldBuyOrigin(player, card) {
  const policy = player?.purchase_policy || 'always';
  if (!card) return false;
  if (policy === 'never') return false;
  if (policy === 'random') return player.cash >= card.price && Math.random() >= 0.5;
  return player.cash >= card.price;
}

async function runCpuOpeningTurn(player) {
  if (!player) return;

  state.view.openRivalDrawerId = player.id;
  setSession({
    active_player_id: player.id,
    phase: `Primeiro turno - ${player.name}`,
    action_label: `${player.name}: permissao`,
    dice: [0, 0],
    note: `${player.name} esta sorteando a permissao de frete.`,
  });
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  await delay(CPU_STEP_DELAY_MS);

  const permissionCard = randomChoice(state.freightPermissionCards);
  applyPermissionSelectionForPlayer(player, permissionCard, {
    updateSession: true,
    actionLabel: `${player.name}: permissao sorteada`,
    note: `${player.name} recebeu a permissao ${permissionCard.title}.`,
  });
  await delay(CPU_STEP_DELAY_MS);

  const originCard = randomChoice(state.portCards);
  const shouldBuyOrigin = cpuShouldBuyOrigin(player, originCard);
  const originResult = applyOriginSelectionForPlayer(player, originCard, shouldBuyOrigin, {
    updateSession: true,
    actionLabel: `${player.name}: porto inicial`,
    note: shouldBuyOrigin
      ? `${player.name} sorteou ${originCard.code} e comprou o porto inicial.`
      : `${player.name} sorteou ${originCard.code} sem comprar o porto inicial.`,
  });
  await delay(CPU_STEP_DELAY_MS);

  const tollCard = randomChoice(state.tollCards);
  applyTollSelectionForPlayer(player, tollCard, {
    updateSession: true,
    actionLabel: `${player.name}: pedagio definido`,
    note: `${player.name} vai precisar passar por ${tollCard.code}.`,
  });
  await delay(CPU_STEP_DELAY_MS);

  const destinationPool = destinationCandidatesForOrigin(originCard.code);
  const destinationCard = randomChoice(destinationPool);
  applyDestinationSelectionForPlayer(player, destinationCard, {
    updateSession: true,
    actionLabel: `${player.name}: destino definido`,
    note: originResult.bought
      ? `${player.name} vai de ${originCard.code} para ${destinationCard.code} com multiplicador de posse no porto inicial.`
      : `${player.name} vai de ${originCard.code} para ${destinationCard.code}.`,
  });
  await delay(CPU_STEP_DELAY_MS);

  const dice = [randomDie(), randomDie()];
  player.last_roll = [...dice];
  setSession({
    active_player_id: player.id,
    phase: `Primeiro turno - ${player.name}`,
    action_label: `${player.name}: ${dice[0]} + ${dice[1]}`,
    dice: [...dice],
    note: `${player.name} rolou ${dice[0]} + ${dice[1]} e iniciou o movimento.`,
  });
  renderHud();
  await delay(650);

  await animatePlayerMovement(player, dice[0] + dice[1], {
    stepDelay: CPU_MOVE_DELAY_MS,
    diceValues: dice,
    updateSession: true,
  });
  await delay(CPU_STEP_DELAY_MS);
}

async function runCpuOpeningRound() {
  if (state.flow.openingRoundRunning) return;

  state.flow.openingRoundRunning = true;
  try {
    for (const player of rivalPlayers()) {
      await runCpuOpeningTurn(player);
    }

    state.view.openRivalDrawerId = null;
    setSession({
      active_player_id: 'human',
      phase: 'Primeiro turno concluido',
      action_label: 'Todos os jogadores preparados',
      note: 'Todos os jogadores concluiram o primeiro turno inicial.',
    });
    renderHud();
    renderNodeOverlay();
    renderShipOverlay();
  } finally {
    state.flow.openingRoundRunning = false;
  }
}

async function submitSetupSelection(event) {
  event.preventDefault();
  if (state.setup.submitting) return;

  state.setup.submitting = true;
  updateSetupStartButton();

  try {
    const payload = await fetchJson('/api/game/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: state.setup.companyName.trim() || 'Minha Companhia',
        color_id: state.setup.selectedColorId,
        rival_count: state.setup.rivalCount,
      }),
    });

    applyBootstrapPayload(payload);
    state.setup.started = true;
    setSetupOverlayVisible(false);
    await renderMap();
    await delay(140);
    await openHumanPermissionDraw();
    await delay(PREP_STEP_DELAY_MS);
    setSession({
      active_player_id: 'human',
      action_label: 'Sortear porto de partida',
      note: 'Agora o jogo vai sortear o porto de partida e perguntar se voce quer comprar a posse dele.',
    });
    await openHumanOriginPortDraw();
    await delay(PREP_STEP_DELAY_LONG_MS);
    setSession({
      active_player_id: 'human',
      action_label: 'Sortear pedagio',
      note: 'Agora o jogo vai sortear o pedagio obrigatorio da rota inicial.',
    });
    await openHumanTollDraw();
    await delay(PREP_STEP_DELAY_MS);
    setSession({
      active_player_id: 'human',
      action_label: 'Sortear porto de destino',
      note: 'Agora o jogo vai sortear o porto de destino e calcular o valor inicial do contrato.',
    });
    await openHumanDestinationPortDraw();
    await delay(PREP_STEP_DELAY_LONG_MS);
    setSession({
      active_player_id: 'human',
      action_label: 'Rolar 2 dados',
      note: 'Agora o usuario deve jogar os dois dados de movimentacao.',
    });
    await delay(PREP_STEP_DELAY_MS);
    const diceResult = await openHumanMovementDice();
    if (diceResult?.total) {
      humanPlayer().last_roll = [...diceResult.values];
      await animateHumanMovement(diceResult.total);
    }

    await delay(PREP_STEP_DELAY_LONG_MS);
    await runCpuOpeningRound();
    if (humanPlayer()?.needs_new_contract) {
      await delay(PREP_STEP_DELAY_LONG_MS);
      await runHumanPostDeliveryTurn();
    }
    state.setup.submitting = false;
    updateSetupStartButton();
  } catch (_error) {
    state.setup.submitting = false;
    updateSetupStartButton();
    window.alert('Nao foi possivel iniciar a partida.');
  }
}

async function bootstrap() {
  const [mapPayload, uiPayload] = await Promise.all([
    fetchJson('/api/map/bootstrap'),
    fetchJson('/api/bootstrap'),
  ]);

  applyMapPayload(mapPayload);
  applyBootstrapPayload(uiPayload);
  populateSetupFromPayload(uiPayload);
  state.setup.started = false;
  await renderMap();
  setSetupOverlayVisible(true);
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = byId('game-setup-form');
  const layer = getHitLayer();

  form?.addEventListener('submit', (event) => {
    submitSetupSelection(event).catch(() => {
      state.setup.submitting = false;
      updateSetupStartButton();
    });
  });

  byId('start-permission-draw')?.addEventListener('click', startPermissionDraw);
  byId('port-draw-button')?.addEventListener('click', startCurrentPortDraw);
  byId('movement-dice-button')?.addEventListener('click', startMovementDiceRoll);
  byId('chance-draw-button')?.addEventListener('click', startChanceDraw);

  byId('preview-rival-list')?.addEventListener('click', (event) => {
    const card = event.target.closest('.preview-rival-card');
    if (!card?.dataset?.playerId) return;
    state.view.openRivalDrawerId = state.view.openRivalDrawerId === card.dataset.playerId
      ? null
      : card.dataset.playerId;
    renderRivals();
  });

  layer?.addEventListener('mousedown', beginDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', (event) => {
    endDrag(event).catch(() => {});
  });
  layer?.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('resize', () => {
    renderMap().catch(() => {});
    const plot = getPlotDiv();
    if (plot && window.Plotly?.Plots?.resize) {
      window.Plotly.Plots.resize(plot);
    }
  });

  try {
    await bootstrap();
  } catch (_error) {
    window.alert('Nao foi possivel carregar a tela inicial do jogo.');
  }
});
