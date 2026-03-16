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
const PLAYER_CASH_FLASH_ANIMATION_MS = 1600;
const PLAYER_CASH_FLASH_CLEAR_MS = 1700;

const REPORT_MILESTONE_TURNS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 250, 300, 350];

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
  chanceDeck: { draw_pile: [], discard_pile: [], held_card_ids: [] },
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
  flow: { openingRoundRunning: false, followupSetupRunning: false, turnCycleRunning: false },
  setup: {
    started: false,
    companyName: '',
    selectedColorId: '',
    rivalCount: 6,
    submitting: false,
  },
  permissionDraw: {
    drawing: false,
    selectedCardId: '',
    order: [],
    cardIds: [],
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
    rolled: false,
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
    closeTimerId: 0,
    resolver: null,
    playerId: '',
    autoStart: false,
    revealOnly: false,
  },
  actionFeed: [],
  settings: {
    cpuSpeed: 50,
    logLifetimeMs: 12000,
    logMode: 'player',
    runInBackground: true,
  },
  report: {
    activeKey: 'cash-by-turn',
    cashHistory: [],
    snapshotKeys: [],
    windowModes: {
      'cash-by-turn': 'full',
      'patrimony-by-turn': 'full',
      'holdings-by-turn': 'full',
    },
  },
  pause: {
    waiters: [],
  },
  view: {
    rotationLon: 0,
    zoom: 1,
    openSystemDrawerId: null,
    humanDrawerOpen: true,
    selectedMiniCardsByPlayer: {},
    expandedActionFeedsByPlayer: {},
    paused: false,
    actionFeedExpanded: false,
    propertyInspectorCode: '',
    deferredUiRefresh: false,
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
    blockClickUntil: 0,
  },
};

function byId(id) {
  return document.getElementById(id);
}

function nextMacrotask() {
  if (typeof MessageChannel === 'function') {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(0);
    });
  }
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function getPauseIndicator() {
  return byId('game-pause-indicator');
}

function getPropertyInspectorOverlay() { return byId('property-inspector-overlay'); }
function getPropertyInspectorStage() { return byId('property-inspector-stage'); }
function getLogOverlay() { return byId('game-log-overlay'); }
function getReportOverlay() { return byId('game-report-overlay'); }
function getReportTabs() { return byId('report-tabs'); }
function getReportBody() { return byId('report-body'); }

function hasCentralOverlayOpen() {
  const ids = [
    'game-setup-overlay',
    'permission-draw-overlay',
    'port-draw-overlay',
    'movement-dice-overlay',
    'chance-draw-overlay',
    'decision-overlay',
    'property-inspector-overlay',
    'game-settings-overlay',
    'game-log-overlay',
    'game-report-overlay',
  ];
  return ids.some((id) => {
    const node = byId(id);
    return node && !node.classList.contains('is-hidden');
  });
}

function renderPauseIndicator() {
  const node = getPauseIndicator();
  if (!node) return;
  node.classList.toggle('is-hidden', !state.view.paused);
}

function propertyInspectorMarkup(card) {
  if (!card) return '';
  return `
    <article class="port-draw-card${card.is_toll ? ' toll-draw-card' : ''} property-inspector-card" style="--title-fill:${card.fill}; --title-text:${card.text};">
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
}

function renderPropertyInspector({ force = false } = {}) {
  if (!force && shouldDeferUiRefresh()) {
    markDeferredUiRefresh();
    return;
  }
  const overlay = getPropertyInspectorOverlay();
  const stage = getPropertyInspectorStage();
  if (!overlay || !stage) return;
  const code = String(state.view.propertyInspectorCode || '').toUpperCase();
  const card = getPropertyCard(code);
  overlay.classList.toggle('is-hidden', !card);
  stage.innerHTML = card ? propertyInspectorMarkup(card) : '';
}

function openPropertyInspector(code) {
  state.view.propertyInspectorCode = String(code || '').toUpperCase();
  renderPropertyInspector();
}

function closePropertyInspector() {
  if (!state.view.propertyInspectorCode) return;
  state.view.propertyInspectorCode = '';
  renderPropertyInspector();
}

function findPropertyCardAtClientPoint(clientX, clientY) {
  const layer = getHitLayer();
  if (!layer) return null;
  const rect = layer.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  let best = null;
  let bestDistance = Infinity;
  state.projectedNodes.forEach((node) => {
    if (!(node.kind === 'port' || node.kind === 'toll')) return;
    if (node.lat === null || node.lon === null) return;
    const projected = projectLonLat(node.lon, node.lat);
    if (!projected) return;
    const [x, y] = projected;
    const dx = localX - x;
    const dy = localY - y;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    const threshold = node.kind === 'toll' ? 20 : 18;
    if (distance <= threshold && distance < bestDistance) {
      best = getPropertyCard(node.label || '');
      bestDistance = distance;
    }
  });
  return best;
}

function handleMapClick(event) {
  if (!state.setup.started) return;
  if (Date.now() < Number(state.drag.blockClickUntil || 0)) return;
  if (hasCentralOverlayOpen()) return;
  const card = findPropertyCardAtClientPoint(event.clientX, event.clientY);
  if (card) {
    openPropertyInspector(card.code);
  }
}

function waitForResume() {
  if (!state.view.paused) return Promise.resolve();
  return new Promise((resolve) => {
    state.pause.waiters.push(resolve);
  });
}

function setPaused(paused) {
  const next = Boolean(paused);
  if (state.view.paused === next) return;
  state.view.paused = next;
  renderPauseIndicator();
  if (!next) {
    const waiters = state.pause.waiters.splice(0, state.pause.waiters.length);
    waiters.forEach((resolve) => resolve());
  }
}

function togglePaused() {
  if (hasCentralOverlayOpen()) return;
  setPaused(!state.view.paused);
}

async function delay(ms) {
  if (shouldRunRobotsInBackground()) {
    await nextMacrotask();
    return;
  }

  let remaining = Math.max(0, Number(ms) || 0);
  while (remaining > 0) {
    if (shouldRunRobotsInBackground()) return;
    if (state.view.paused) {
      await waitForResume();
      continue;
    }
    const slice = Math.min(remaining, 40);
    const startedAt = performance.now();
    await new Promise((resolve) => window.setTimeout(resolve, slice));
    if (shouldRunRobotsInBackground()) return;
    if (state.view.paused) continue;
    remaining -= (performance.now() - startedAt);
  }
}

function formatCurrency(value) {
  return `$ ${Number(value || 0).toLocaleString('pt-BR')}`;
}

function formatSignedCurrency(value) {
  const amount = Number(value || 0);
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
}

function formatCompactCurrencyValue(value) {
  const amount = Number(value || 0);
  const absoluteAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absoluteAmount >= 1000000) {
    const digits = absoluteAmount >= 10000000 ? 0 : 1;
    return `${sign}${(absoluteAmount / 1000000).toFixed(digits).replace(/\.0$/, '')}M`;
  }
  if (absoluteAmount >= 1000) {
    const digits = absoluteAmount >= 100000 ? 0 : 1;
    return `${sign}${(absoluteAmount / 1000).toFixed(digits).replace(/\.0$/, '')}k`;
  }
  return `${sign}${Math.round(absoluteAmount)}`;
}

function cpuSpeedFactor() {
  return Math.max(0.1, Number(state.settings?.cpuSpeed || 1));
}

function scaledCpuDelay(baseMs, minMs = 80) {
  return Math.max(minMs, Math.round((Number(baseMs) || 0) / cpuSpeedFactor()));
}

function currentCpuMoveDelay() {
  return scaledCpuDelay(CPU_MOVE_DELAY_MS, 4);
}

function currentCpuStepDelay() {
  return scaledCpuDelay(CPU_STEP_DELAY_MS, 6);
}

function currentCpuRevealDelay(baseMs = 650) {
  return scaledCpuDelay(baseMs, 10);
}

function currentLogLifetimeMs() {
  return Math.max(4000, Number(state.settings?.logLifetimeMs || 12000));
}

function currentLogMode() {
  return state.settings?.logMode === 'global' ? 'global' : 'player';
}

function settingsLogModeLabel(mode = currentLogMode()) {
  return mode === 'global' ? 'Geral' : 'Por jogador';
}

function settingsCpuSpeedLabel(value = cpuSpeedFactor()) {
  return `${Number(value || 1).toFixed(2).replace('.', ',')}x`;
}

function settingsLogLifetimeLabel(ms = currentLogLifetimeMs()) {
  return `${Math.round((Number(ms) || 0) / 1000)} s`;
}

function backgroundExecutionEnabled() {
  return Boolean(state.settings?.runInBackground);
}

function isDocumentHidden() {
  return document.visibilityState === 'hidden';
}

function shouldRunRobotsInBackground() {
  return backgroundExecutionEnabled() && isDocumentHidden();
}

function settingsBackgroundModeLabel(enabled = backgroundExecutionEnabled()) {
  return enabled ? 'Ligado' : 'Desligado';
}

function shouldDeferUiRefresh() {
  return shouldRunRobotsInBackground();
}

function markDeferredUiRefresh() {
  state.view.deferredUiRefresh = true;
}

function flushDeferredUiRefresh() {
  if (shouldDeferUiRefresh() || !state.view.deferredUiRefresh) return;
  state.view.deferredUiRefresh = false;
  renderHud({ force: true });
  renderActionFeed({ force: true });
  renderNodeOverlay({ force: true });
  renderShipOverlay({ force: true });
  renderPropertyInspector({ force: true });
  if (!getReportOverlay()?.classList.contains('is-hidden')) {
    renderReportOverlay();
  }
}

function pruneActionFeed() {
  const now = Date.now();
  state.actionFeed = (state.actionFeed || []).filter((entry) => (entry.expiresAt || 0) > now).slice(0, 18);
  return state.actionFeed;
}

function applyActionFeedLifetime() {
  const lifetimeMs = currentLogLifetimeMs();
  const now = Date.now();
  state.actionFeed = (state.actionFeed || []).map((entry) => ({
    ...entry,
    expiresAt: (entry.createdAt || now) + lifetimeMs,
  })).filter((entry) => entry.expiresAt > now);
}

function setSettingsVisible(visible) {
  const overlay = getSettingsOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function renderSettingsOverlay() {
  const cpuInput = getSettingsCpuSpeedInput();
  const cpuValue = getSettingsCpuSpeedValue();
  const logInput = getSettingsLogLifetimeInput();
  const logValue = getSettingsLogLifetimeValue();
  const logModeValue = getSettingsLogModeValue();
  const logModeGlobalInput = getSettingsLogModeGlobalInput();
  const logModePlayerInput = getSettingsLogModePlayerInput();
  const backgroundModeValue = getSettingsBackgroundModeValue();
  const backgroundModeOffInput = getSettingsBackgroundModeOffInput();
  const backgroundModeOnInput = getSettingsBackgroundModeOnInput();
  const logMode = currentLogMode();
  const backgroundEnabled = backgroundExecutionEnabled();
  if (cpuInput) cpuInput.value = String(cpuSpeedFactor());
  if (cpuValue) cpuValue.textContent = settingsCpuSpeedLabel();
  if (logInput) logInput.value = String(Math.round(currentLogLifetimeMs() / 1000));
  if (logValue) logValue.textContent = settingsLogLifetimeLabel();
  if (logModeValue) logModeValue.textContent = settingsLogModeLabel(logMode);
  if (logModeGlobalInput) logModeGlobalInput.checked = logMode === 'global';
  if (logModePlayerInput) logModePlayerInput.checked = logMode !== 'global';
  if (backgroundModeValue) backgroundModeValue.textContent = settingsBackgroundModeLabel(backgroundEnabled);
  if (backgroundModeOffInput) backgroundModeOffInput.checked = !backgroundEnabled;
  if (backgroundModeOnInput) backgroundModeOnInput.checked = backgroundEnabled;
}

function openSettingsOverlay() {
  renderSettingsOverlay();
  setSettingsVisible(true);
}

function closeSettingsOverlay() {
  setSettingsVisible(false);
}

function setLogVisible(visible) {
  const overlay = getLogOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function setReportVisible(visible) {
  const overlay = getReportOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function reportTurnLabel(snapshot) {
  const normalizedTurn = Number(snapshot?.turnNumber || 0);
  const label = String(snapshot?.label || '').trim();
  if (normalizedTurn <= 0) return label || 'Inicio';
  return label || `Turno ${String(normalizedTurn).padStart(2, '0')}`;
}

function compactReportTurnLabel(snapshot) {
  const normalizedTurn = Number(snapshot?.turnNumber || 0);
  if (normalizedTurn <= 0) return 'T0';
  return `T${normalizedTurn}`;
}

function reportEmptyMarkup(message = 'O historico do relatorio vai aparecer conforme os turnos avancarem.') {
  return `<div class="report-empty">${message}</div>`;
}

function reportWindowModeFor(reportKey) {
  return state.report?.windowModes?.[reportKey] === 'full' ? 'full' : 'recent';
}

function reportVisibleSnapshots(snapshots, reportKey) {
  return reportWindowModeFor(reportKey) === 'full' ? snapshots : snapshots.slice(-100);
}

function reportCountLabel(snapshots, visibleSnapshots) {
  if (!snapshots.length) return '0 marco(s)';
  if (visibleSnapshots.length === snapshots.length) return `${snapshots.length} marco(s)`;
  return `${visibleSnapshots.length} de ${snapshots.length} marco(s)`;
}

function reportWindowToggleMarkup(reportKey) {
  const mode = reportWindowModeFor(reportKey);
  return `
    <div class="report-range-toggle" role="group" aria-label="Janela do grafico">
      <button type="button" class="report-range-button${mode === 'full' ? ' is-active' : ''}" data-report-window-key="${reportKey}" data-report-window-mode="full">Desde o inicio</button>
      <button type="button" class="report-range-button${mode !== 'full' ? ' is-active' : ''}" data-report-window-key="${reportKey}" data-report-window-mode="recent">Ultimos 100</button>
    </div>
  `;
}

function reportPlayerSnapshotEntry(snapshot, playerId) {
  return (snapshot?.players || []).find((player) => player.id === playerId) || null;
}

function cashSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.cash || 0);
}

function assetSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.asset_total || 0);
}

function patrimonySnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.patrimony_total || 0);
}

function titleCountSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.title_count || 0);
}

function tollCountSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.toll_count || 0);
}

function permissionCountSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.permission_count || 0);
}

function reportCountMetricValue(snapshot, playerId, metricKey) {
  if (metricKey === 'toll_count') return tollCountSnapshotValue(snapshot, playerId);
  if (metricKey === 'permission_count') return permissionCountSnapshotValue(snapshot, playerId);
  return titleCountSnapshotValue(snapshot, playerId);
}

function reportHeatmapLabelStride(total) {
  if (total <= 8) return 1;
  if (total <= 16) return 2;
  if (total <= 30) return 3;
  if (total <= 60) return 5;
  return Math.max(6, Math.ceil(total / 12));
}

function reportCountHeatmapMarkup(snapshots, players, { reportKey = 'holdings-by-turn', metricKey = 'title_count', ariaLabel = 'Mapa de calor do relatorio' } = {}) {
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup('Ainda nao ha dados suficientes para montar este mapa de calor.');
  }

  const visibleSnapshots = reportVisibleSnapshots(snapshots, reportKey);
  const values = [];
  visibleSnapshots.forEach((snapshot) => {
    players.forEach((player) => {
      values.push(reportCountMetricValue(snapshot, player.id, metricKey));
    });
  });

  const maxValue = Math.max(1, ...values);
  const width = 960;
  const frame = { top: 14, right: 18, bottom: 34, left: 120 };
  const rowHeight = 34;
  const rowGap = 6;
  const innerHeight = (players.length * rowHeight) + (Math.max(0, players.length - 1) * rowGap);
  const height = frame.top + innerHeight + frame.bottom;
  const innerWidth = width - frame.left - frame.right;
  const cellWidth = innerWidth / Math.max(1, visibleSnapshots.length);
  const labelStride = reportHeatmapLabelStride(visibleSnapshots.length);
  const showValues = visibleSnapshots.length <= 40 && cellWidth >= 15;

  const dividerMarkup = players.slice(1).map((_, index) => {
    const y = frame.top + (index * (rowHeight + rowGap)) + rowHeight + (rowGap / 2);
    return `<line class="report-heatmap-divider" x1="${frame.left}" y1="${y.toFixed(2)}" x2="${(width - frame.right).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
  }).join('');

  const rowsMarkup = players.map((player, rowIndex) => {
    const rowY = frame.top + (rowIndex * (rowHeight + rowGap));
    const labelY = rowY + (rowHeight / 2) + 4;
    const rowLabel = `
      <circle cx="${frame.left - 102}" cy="${(rowY + (rowHeight / 2)).toFixed(2)}" r="5.5" fill="${player.color_hex || '#8fd7ff'}"></circle>
      <text class="report-heatmap-row-label" x="${frame.left - 90}" y="${labelY.toFixed(2)}">${player.name}</text>
    `;

    const cells = visibleSnapshots.map((snapshot, columnIndex) => {
      const x = frame.left + (columnIndex * cellWidth);
      const value = reportCountMetricValue(snapshot, player.id, metricKey);
      const intensity = value <= 0 ? 0.08 : (0.18 + ((value / maxValue) * 0.78));
      const textFill = value >= (maxValue * 0.58) ? '#06121f' : '#edf6ff';
      return `
        <rect class="report-heatmap-cell" x="${x.toFixed(2)}" y="${rowY.toFixed(2)}" width="${Math.max(1, cellWidth - 1).toFixed(2)}" height="${rowHeight}" rx="6" fill="${player.color_hex || '#8fd7ff'}" fill-opacity="${intensity.toFixed(3)}"></rect>
        ${showValues ? `<text class="report-heatmap-value" x="${(x + (cellWidth / 2)).toFixed(2)}" y="${labelY.toFixed(2)}" text-anchor="middle" fill="${textFill}">${Math.round(value)}</text>` : ''}
      `;
    }).join('');

    return `<g>${rowLabel}${cells}</g>`;
  }).join('');

  const xLabelsMarkup = visibleSnapshots.map((snapshot, index) => {
    if (index !== visibleSnapshots.length - 1 && (index % labelStride) !== 0) return '';
    const x = frame.left + (index * cellWidth) + (cellWidth / 2);
    return `<text class="report-heatmap-xlabel" x="${x.toFixed(2)}" y="${height - 10}" text-anchor="middle">${compactReportTurnLabel(snapshot)}</text>`;
  }).join('');

  return `
    <div class="report-heatmap-shell">
      <svg class="report-heatmap" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">
        ${dividerMarkup}
        ${rowsMarkup}
        ${xLabelsMarkup}
      </svg>
    </div>
  `;
}

function reportHeatmapCardMarkup(snapshots, players, { reportKey = 'holdings-by-turn', metricKey = 'title_count', title = '', subtitle = '', ariaLabel = 'Mapa de calor do relatorio' } = {}) {
  return `
    <article class="report-metric-card">
      <div class="report-metric-card-head">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      ${reportCountHeatmapMarkup(snapshots, players, { reportKey, metricKey, ariaLabel })}
    </article>
  `;
}

function reportMetricChartMarkup(snapshots, players, { reportKey = 'cash-by-turn', metric, ariaLabel = 'Grafico do relatorio' } = {}) {
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup('Ainda nao ha dados suficientes para montar o grafico.');
  }

  const visibleSnapshots = reportVisibleSnapshots(snapshots, reportKey);
  const valueGetter = metric === 'patrimony'
    ? patrimonySnapshotValue
    : cashSnapshotValue;

  const values = [];
  visibleSnapshots.forEach((snapshot) => {
    players.forEach((player) => {
      values.push(valueGetter(snapshot, player.id));
    });
  });

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rawRange = Math.max(1, maxValue - minValue);
  const padding = Math.max(180, Math.round(rawRange * 0.16));
  const domainMin = Math.max(0, minValue - padding);
  const domainMax = maxValue + padding;
  const domainRange = Math.max(1, domainMax - domainMin);
  const height = 460;
  const frame = { top: 22, right: 22, bottom: 56, left: 96 };
  const width = Math.max(860, Math.min(980, frame.left + frame.right + (visibleSnapshots.length * 28)));
  const innerWidth = width - frame.left - frame.right;
  const innerHeight = height - frame.top - frame.bottom;
  const xFor = (index) => {
    if (visibleSnapshots.length <= 1) return frame.left + (innerWidth / 2);
    return frame.left + ((index / (visibleSnapshots.length - 1)) * innerWidth);
  };
  const yFor = (value) => frame.top + (((domainMax - value) / domainRange) * innerHeight);
  const ticks = Array.from({ length: 5 }, (_, index) => domainMin + ((domainRange / 4) * index));

  const gridMarkup = ticks.map((value) => {
    const y = yFor(value);
    return `
      <g>
        <line class="report-grid-line" x1="${frame.left}" y1="${y.toFixed(2)}" x2="${(width - frame.right).toFixed(2)}" y2="${y.toFixed(2)}"></line>
        <text class="report-axis-label" x="${frame.left - 10}" y="${(y + 4).toFixed(2)}" text-anchor="end">${formatCurrency(Math.round(value))}</text>
      </g>
    `;
  }).join('');

  const labelStride = reportHeatmapLabelStride(visibleSnapshots.length);
  const xLabelsMarkup = visibleSnapshots.map((snapshot, index) => {
    if (index !== 0 && index !== visibleSnapshots.length - 1 && (index % labelStride) !== 0) return '';
    const x = xFor(index);
    return `<text class="report-axis-xlabel" x="${x.toFixed(2)}" y="${height - 12}" text-anchor="middle">${compactReportTurnLabel(snapshot)}</text>`;
  }).join('');

  const seriesMarkup = players.map((player) => {
    const points = visibleSnapshots.map((snapshot, index) => `${xFor(index).toFixed(2)},${yFor(valueGetter(snapshot, player.id)).toFixed(2)}`).join(' ');
    return `<g><polyline class="report-series-line" stroke="${player.color_hex || '#8fd7ff'}" points="${points}"></polyline></g>`;
  }).join('');

  const legendMarkup = players.map((player) => `
    <span class="report-legend-item">
      <span class="report-legend-swatch" style="background:${player.color_hex || '#8fd7ff'}; color:${player.color_hex || '#8fd7ff'};"></span>
      <span>${player.name}</span>
    </span>
  `).join('');

  return `
    <div class="report-chart-shell">
      <div class="report-legend">${legendMarkup}</div>
      <div class="report-chart-scroll">
        <svg class="report-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">
          ${gridMarkup}
          ${seriesMarkup}
          ${xLabelsMarkup}
        </svg>
      </div>
    </div>
  `;
}

function cashByTurnChartMarkup(snapshots, players) {
  return reportMetricChartMarkup(snapshots, players, {
    reportKey: 'cash-by-turn',
    metric: 'cash',
    ariaLabel: 'Grafico de dinheiro por turno',
  });
}

function patrimonyByTurnChartMarkup(snapshots, players) {
  return reportMetricChartMarkup(snapshots, players, {
    reportKey: 'patrimony-by-turn',
    metric: 'patrimony',
    ariaLabel: 'Grafico de patrimonio por turno',
  });
}

function reportCountTickValues(maxValue) {
  const safeMax = Math.max(1, Math.round(maxValue));
  const step = Math.max(1, Math.ceil(safeMax / 6));
  const ticks = [0];
  for (let value = step; value <= (safeMax + step); value += step) {
    ticks.push(value);
  }
  return Array.from(new Set(ticks.map((value) => Math.round(value)))).sort((left, right) => left - right);
}

function reportStepPolylinePoints(visibleSnapshots, playerId, metricKey, xFor, yFor) {
  const points = [];
  let previousY = 0;
  visibleSnapshots.forEach((snapshot, index) => {
    const x = xFor(index);
    const value = reportCountMetricValue(snapshot, playerId, metricKey);
    const y = yFor(value);
    if (index === 0) {
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    } else {
      points.push(`${x.toFixed(2)},${previousY.toFixed(2)}`);
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    previousY = y;
  });
  return points.join(' ');
}

function reportCountLegendMarkup(visibleSnapshots, players, metricKey) {
  const latestSnapshot = visibleSnapshots[visibleSnapshots.length - 1] || null;
  const sortedPlayers = players
    .map((player) => ({
      ...player,
      metricValue: reportCountMetricValue(latestSnapshot, player.id, metricKey),
    }))
    .sort((left, right) => {
      if (right.metricValue !== left.metricValue) return right.metricValue - left.metricValue;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });

  return sortedPlayers.map((player) => `
    <span class="report-legend-item">
      <span class="report-legend-swatch" style="background:${player.color_hex || '#8fd7ff'}; color:${player.color_hex || '#8fd7ff'};"></span>
      <span>${player.name}</span>
      <strong class="report-legend-value">${Math.round(player.metricValue)}</strong>
    </span>
  `).join('');
}

function reportTrafficLightTone(value, maxValue) {
  const safeValue = Math.max(0, Number(value || 0));
  const safeMax = Math.max(1, Number(maxValue || 0));
  if (safeValue <= 0) return 'tone-zero';
  const ratio = safeValue / safeMax;
  if (ratio < 0.34) return 'tone-low';
  if (ratio < 0.67) return 'tone-mid';
  return 'tone-high';
}

function reportStepAreaPoints(visibleSnapshots, playerId, metricKey, xFor, yFor, baselineY) {
  if (!visibleSnapshots.length) return '';
  const points = [];
  let previousY = baselineY;
  visibleSnapshots.forEach((snapshot, index) => {
    const x = xFor(index);
    const value = reportCountMetricValue(snapshot, playerId, metricKey);
    const y = yFor(value);
    if (index === 0) {
      points.push(`${x.toFixed(2)},${baselineY.toFixed(2)}`);
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    } else {
      points.push(`${x.toFixed(2)},${previousY.toFixed(2)}`);
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    previousY = y;
  });
  const lastX = xFor(visibleSnapshots.length - 1);
  points.push(`${lastX.toFixed(2)},${baselineY.toFixed(2)}`);
  return points.join(' ');
}

function reportPlayerSparkCardMarkup(player, visibleSnapshots, { metricKey = 'title_count', metricMax = 1, ariaLabel = 'Grafico de jogador' } = {}) {
  const width = 250;
  const height = 118;
  const frame = { top: 12, right: 8, bottom: 20, left: 8 };
  const innerWidth = width - frame.left - frame.right;
  const innerHeight = height - frame.top - frame.bottom;
  const xFor = (index) => {
    if (visibleSnapshots.length <= 1) return frame.left + (innerWidth / 2);
    return frame.left + ((index / (visibleSnapshots.length - 1)) * innerWidth);
  };
  const yFor = (value) => frame.top + (((metricMax - value) / Math.max(1, metricMax)) * innerHeight);
  const baselineY = yFor(0);
  const startSnapshot = visibleSnapshots[0] || null;
  const endSnapshot = visibleSnapshots[visibleSnapshots.length - 1] || null;
  const startValue = reportCountMetricValue(startSnapshot, player.id, metricKey);
  const endValue = reportCountMetricValue(endSnapshot, player.id, metricKey);
  const delta = endValue - startValue;
  const deltaLabel = `${delta > 0 ? '+' : ''}${delta}`;
  const gridValues = Array.from(new Set([0, Math.round(metricMax / 2), metricMax].filter((value) => value >= 0))).sort((left, right) => left - right);
  const gridMarkup = gridValues.map((value) => {
    const y = yFor(value);
    return `<line class="report-player-spark-gridline" x1="${frame.left}" y1="${y.toFixed(2)}" x2="${(width - frame.right).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
  }).join('');
  const areaPoints = reportStepAreaPoints(visibleSnapshots, player.id, metricKey, xFor, yFor, baselineY);
  const linePoints = reportStepPolylinePoints(visibleSnapshots, player.id, metricKey, xFor, yFor);
  return `
    <article class="report-player-spark-card" style="--report-player-accent:${player.color_hex || '#8fd7ff'}">
      <div class="report-player-spark-head">
        <span class="report-player-head">
          <span class="report-player-dot" style="background:${player.color_hex || '#8fd7ff'}"></span>
          <span>${player.name}</span>
        </span>
        <div class="report-player-spark-badges">
          <strong class="report-player-spark-value">${Math.round(endValue)}</strong>
          <span class="report-player-spark-delta${delta > 0 ? ' is-positive' : delta < 0 ? ' is-negative' : ''}">${deltaLabel}</span>
        </div>
      </div>
      <svg class="report-player-spark-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}: ${player.name}">
        ${gridMarkup}
        <polygon class="report-player-spark-area" fill="${player.color_hex || '#8fd7ff'}" points="${areaPoints}"></polygon>
        <polyline class="report-player-spark-line" stroke="${player.color_hex || '#8fd7ff'}" points="${linePoints}"></polyline>
      </svg>
      <div class="report-player-spark-foot">
        <span>${compactReportTurnLabel(startSnapshot)}</span>
        <span>escala 0-${Math.round(metricMax)}</span>
        <span>${compactReportTurnLabel(endSnapshot)}</span>
      </div>
    </article>
  `;
}

function reportCountTrendChartMarkup(snapshots, players, { reportKey = 'holdings-by-turn', metricKey = 'title_count', ariaLabel = 'Grafico de contagem do relatorio' } = {}) {
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup('Ainda nao ha dados suficientes para montar o grafico.');
  }

  const visibleSnapshots = reportVisibleSnapshots(snapshots, reportKey);
  const values = [];
  visibleSnapshots.forEach((snapshot) => {
    players.forEach((player) => {
      values.push(reportCountMetricValue(snapshot, player.id, metricKey));
    });
  });

  const metricMax = Math.max(1, ...values);
  const latestSnapshot = visibleSnapshots[visibleSnapshots.length - 1] || null;
  const rankedPlayers = players
    .map((player) => ({
      ...player,
      latestValue: reportCountMetricValue(latestSnapshot, player.id, metricKey),
    }))
    .sort((left, right) => {
      if (right.latestValue !== left.latestValue) return right.latestValue - left.latestValue;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });

  return `
    <div class="report-count-spark-shell">
      <div class="report-count-scale-note">Ordenado pelo valor final. Escala comum: 0-${Math.round(metricMax)}.</div>
      <div class="report-player-spark-grid">
        ${rankedPlayers.map((player) => reportPlayerSparkCardMarkup(player, visibleSnapshots, { metricKey, metricMax, ariaLabel })).join('')}
      </div>
    </div>
  `;
}

function reportCountTrendCardMarkup(snapshots, players, { reportKey = 'holdings-by-turn', metricKey = 'title_count', title = '', subtitle = '', ariaLabel = 'Grafico de contagem do relatorio' } = {}) {
  return `
    <article class="report-metric-card report-trend-card">
      <div class="report-metric-card-head">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      ${reportCountTrendChartMarkup(snapshots, players, { reportKey, metricKey, ariaLabel })}
    </article>
  `;
}

function reportPlayers() {
  return (state.players || []).map((player) => ({
    id: player.id,
    name: player.name,
    color_hex: player.color_hex || '#8fd7ff',
  }));
}

function cashByTurnReportMarkup() {
  const snapshots = reportSnapshots();
  const players = reportPlayers();
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup();
  }

  const visibleSnapshots = reportVisibleSnapshots(snapshots, 'cash-by-turn');
  return `
    <section class="report-panel">
      <div class="report-summary">
        <div class="report-summary-copy">
          <strong>Dinheiro de jogador por turno</strong>
          <span>Historico de caixa fechado no fim de cada turno global da simulacao.</span>
        </div>
        <div class="report-summary-actions">
          ${reportWindowToggleMarkup('cash-by-turn')}
          <span class="report-count-badge">${reportCountLabel(snapshots, visibleSnapshots)}</span>
        </div>
      </div>
      ${cashByTurnChartMarkup(snapshots, players)}
    </section>
  `;
}

function patrimonyByTurnReportMarkup() {
  const snapshots = reportSnapshots();
  const players = reportPlayers();
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup();
  }

  const visibleSnapshots = reportVisibleSnapshots(snapshots, 'patrimony-by-turn');
  return `
    <section class="report-panel">
      <div class="report-summary">
        <div class="report-summary-copy">
          <strong>Patrimonio de jogador por turno</strong>
          <span>Dinheiro somado ao valor-base dos ativos de cada jogador em cada fechamento.</span>
        </div>
        <div class="report-summary-actions">
          ${reportWindowToggleMarkup('patrimony-by-turn')}
          <span class="report-count-badge">${reportCountLabel(snapshots, visibleSnapshots)}</span>
        </div>
      </div>
      ${patrimonyByTurnChartMarkup(snapshots, players)}
    </section>
  `;
}

function holdingsByTurnReportMarkup() {
  const snapshots = reportSnapshots();
  const players = reportPlayers();
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup();
  }

  const visibleSnapshots = reportVisibleSnapshots(snapshots, 'holdings-by-turn');
  return `
    <section class="report-panel">
      <div class="report-summary">
        <div class="report-summary-copy">
          <strong>Ativos por turno</strong>
          <span>Graficos de degrau para comparar aquisicoes, paradas e arrancadas de cada jogador ao longo da mesa.</span>
        </div>
        <div class="report-summary-actions">
          ${reportWindowToggleMarkup('holdings-by-turn')}
          <span class="report-count-badge">${reportCountLabel(snapshots, visibleSnapshots)}</span>
        </div>
      </div>
      <div class="report-metric-grid report-holdings-grid">
        ${reportCountTrendCardMarkup(snapshots, players, {
          reportKey: 'holdings-by-turn',
          metricKey: 'title_count',
          title: 'Titulos',
          subtitle: 'Portos conquistados por turno.',
          ariaLabel: 'Grafico de titulos por turno',
        })}
        ${reportCountTrendCardMarkup(snapshots, players, {
          reportKey: 'holdings-by-turn',
          metricKey: 'toll_count',
          title: 'Pedagios',
          subtitle: 'Pedagios conquistados por turno.',
          ariaLabel: 'Grafico de pedagios por turno',
        })}
        ${reportCountTrendCardMarkup(snapshots, players, {
          reportKey: 'holdings-by-turn',
          metricKey: 'permission_count',
          title: 'Permissoes',
          subtitle: 'Permissoes ativas por turno.',
          ariaLabel: 'Grafico de permissoes por turno',
        })}
      </div>
    </section>
  `;
}

function reportMilestoneTurns(snapshots) {
  const maxTurn = Math.max(0, ...snapshots.map((snapshot) => Number(snapshot?.turnNumber || 0)));
  if (maxTurn <= 0) return [];
  const turns = [...REPORT_MILESTONE_TURNS].filter((turn) => turn <= maxTurn);
  let nextTurn = REPORT_MILESTONE_TURNS[REPORT_MILESTONE_TURNS.length - 1] + 50;
  while (nextTurn <= maxTurn) {
    turns.push(nextTurn);
    nextTurn += 50;
  }
  return turns;
}

function milestoneTableReportMarkup() {
  const snapshots = reportSnapshots();
  const players = reportPlayers();
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup();
  }

  const milestoneTurns = reportMilestoneTurns(snapshots);
  if (!milestoneTurns.length) {
    return reportEmptyMarkup('Os milestones vao aparecer quando a simulacao ultrapassar o turno 5.');
  }

  const snapshotByTurn = new Map(snapshots.map((snapshot) => [Number(snapshot?.turnNumber || 0), snapshot]));
  const rowsMarkup = milestoneTurns.map((turnNumber) => {
    const snapshot = snapshotByTurn.get(turnNumber);
    if (!snapshot) return '';

    const entries = players.map((player) => ({
      player,
      entry: reportPlayerSnapshotEntry(snapshot, player.id) || {
        cash: 0,
        patrimony_total: 0,
        title_count: 0,
        toll_count: 0,
        permission_count: 0,
      },
    }));

    const leaderByMetric = {
      cash: Math.max(0, ...entries.map(({ entry }) => Number(entry.cash || 0))),
      patrimony_total: Math.max(0, ...entries.map(({ entry }) => Number(entry.patrimony_total || 0))),
      title_count: Math.max(0, ...entries.map(({ entry }) => Number(entry.title_count || 0))),
      toll_count: Math.max(0, ...entries.map(({ entry }) => Number(entry.toll_count || 0))),
    };

    const playerCellsMarkup = entries.map(({ player, entry }) => {
      const accent = player.color_hex || '#8fd7ff';
      const cash = Number(entry.cash || 0);
      const patrimony = Number(entry.patrimony_total || 0);
      const titleCount = Math.round(Number(entry.title_count || 0));
      const tollCount = Math.round(Number(entry.toll_count || 0));
      const permissionCount = Math.round(Number(entry.permission_count || 0));
      return `
        <td class="report-milestone-player-col" style="--report-player-accent:${accent}">
          <div class="report-milestone-cell">
            <div class="report-milestone-primary">
              <span class="report-milestone-stat${cash === leaderByMetric.cash && leaderByMetric.cash > 0 ? ' is-leading' : ''}">
                <small>Caixa</small>
                <strong>${formatCompactCurrencyValue(cash)}</strong>
              </span>
              <span class="report-milestone-stat${patrimony === leaderByMetric.patrimony_total && leaderByMetric.patrimony_total > 0 ? ' is-leading' : ''}">
                <small>Patr.</small>
                <strong>${formatCompactCurrencyValue(patrimony)}</strong>
              </span>
            </div>
            <div class="report-milestone-secondary">
              <span class="report-milestone-stat report-milestone-stat-compact ${reportTrafficLightTone(titleCount, leaderByMetric.title_count)}">
                <small>PO</small>
                <strong>${titleCount}</strong>
              </span>
              <span class="report-milestone-stat report-milestone-stat-compact ${reportTrafficLightTone(tollCount, leaderByMetric.toll_count)}">
                <small>PE</small>
                <strong>${tollCount}</strong>
              </span>
              <span class="report-milestone-stat report-milestone-stat-compact ${reportTrafficLightTone(permissionCount, 6)}">
                <small>NA</small>
                <strong>${permissionCount}</strong>
              </span>
            </div>
          </div>
        </td>
      `;
    }).join('');

    return `
      <tr>
        <td class="report-turn-pivot-cell">
          <div class="report-turn-cell">
            <strong>${compactReportTurnLabel(snapshot)}</strong>
            <span>${reportTurnLabel(snapshot)}</span>
          </div>
        </td>
        ${playerCellsMarkup}
      </tr>
    `;
  }).join('');

  const headerMarkup = players.map((player) => `
    <th class="report-milestone-player-head" scope="col" style="--report-player-accent:${player.color_hex || '#8fd7ff'}">
      <span class="report-player-head">
        <span class="report-player-dot" style="background:${player.color_hex || '#8fd7ff'}"></span>
        <span>${player.name}</span>
      </span>
    </th>
  `).join('');

  return `
    <section class="report-panel">
      <div class="report-summary">
        <div class="report-summary-copy">
          <strong>Milestones da simulacao</strong>
          <span>Uma linha por marco e uma coluna por jogador, com PO, PE e NA em escala semaforica.</span>
        </div>
        <div class="report-summary-actions">
          <span class="report-count-badge">${milestoneTurns.length} marco(s)</span>
        </div>
      </div>
      <div class="report-table-wrap">
        <table class="report-table report-milestone-table">
          <thead>
            <tr>
              <th scope="col">Marco</th>
              ${headerMarkup}
            </tr>
          </thead>
          <tbody>
            ${rowsMarkup}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderReportOverlay() {
  const tabs = getReportTabs();
  const body = getReportBody();
  if (!tabs || !body) return;

  const activeKey = state.report?.activeKey || 'cash-by-turn';
  tabs.innerHTML = `
    <button type="button" class="report-tab${activeKey === 'cash-by-turn' ? ' is-active' : ''}" data-report-key="cash-by-turn" role="tab" aria-selected="${activeKey === 'cash-by-turn' ? 'true' : 'false'}">Dinheiro por turno</button>
    <button type="button" class="report-tab${activeKey === 'patrimony-by-turn' ? ' is-active' : ''}" data-report-key="patrimony-by-turn" role="tab" aria-selected="${activeKey === 'patrimony-by-turn' ? 'true' : 'false'}">Patrimonio por turno</button>
    <button type="button" class="report-tab${activeKey === 'holdings-by-turn' ? ' is-active' : ''}" data-report-key="holdings-by-turn" role="tab" aria-selected="${activeKey === 'holdings-by-turn' ? 'true' : 'false'}">Ativos por turno</button>
    <button type="button" class="report-tab${activeKey === 'milestones-table' ? ' is-active' : ''}" data-report-key="milestones-table" role="tab" aria-selected="${activeKey === 'milestones-table' ? 'true' : 'false'}">Tabela por marco</button>
  `;

  if (activeKey === 'patrimony-by-turn') {
    body.innerHTML = patrimonyByTurnReportMarkup();
    return;
  }
  if (activeKey === 'holdings-by-turn') {
    body.innerHTML = holdingsByTurnReportMarkup();
    return;
  }
  if (activeKey === 'milestones-table') {
    body.innerHTML = milestoneTableReportMarkup();
    return;
  }

  body.innerHTML = activeKey === 'cash-by-turn'
    ? cashByTurnReportMarkup()
    : reportEmptyMarkup('Esse relatorio ainda nao foi implementado.');
}

function openLogOverlay() {
  renderActionFeed();
  setLogVisible(true);
}

function closeLogOverlay() {
  setLogVisible(false);
}

function openReportOverlay() {
  renderReportOverlay();
  setReportVisible(true);
}

function closeReportOverlay() {
  setReportVisible(false);
}

function playerAssetBookValue(player) {
  if (!player) return 0;
  const propertiesValue = (player.property_codes || [])
    .map((code) => getPropertyCard(code))
    .filter(Boolean)
    .reduce((total, card) => total + Math.max(0, Number(card.price || 0)), 0);
  const permissionsValue = (player.permissions || [])
    .reduce((total, permission) => total + permissionPurchasePrice(permission), 0);
  return propertiesValue + permissionsValue;
}

function playerTitleCount(player) {
  return Math.max(0, Number(player?.ports_owned || 0));
}

function playerTollCount(player) {
  return Math.max(0, Number(player?.tolls_owned || 0));
}

function playerPermissionCount(player) {
  return Array.isArray(player?.permissions) ? player.permissions.length : 0;
}

function captureCashSnapshot({
  label = state.session?.turn_label || 'Turno --',
  turnNumber = Number(state.session?.turn_number || 0),
  phase = state.session?.phase || '',
  force = false,
} = {}) {
  if (!(state.players || []).length) return;

  const normalizedTurn = Number(turnNumber || 0);
  const normalizedLabel = String(label || '').trim() || (normalizedTurn > 0 ? `Turno ${String(normalizedTurn).padStart(2, '0')}` : 'Inicio');
  const key = `${normalizedTurn}|${normalizedLabel}`;
  const snapshot = {
    key,
    turnNumber: normalizedTurn,
    label: normalizedLabel,
    phase: String(phase || ''),
    players: (state.players || []).map((player) => {
      const cash = Number(player.cash || 0);
      const assetTotal = playerAssetBookValue(player);
      const titleCount = playerTitleCount(player);
      const tollCount = playerTollCount(player);
      const permissionCount = playerPermissionCount(player);
      return {
        id: player.id,
        name: player.name,
        cash,
        asset_total: assetTotal,
        patrimony_total: cash + assetTotal,
        title_count: titleCount,
        toll_count: tollCount,
        permission_count: permissionCount,
        property_count: titleCount + tollCount,
        color: player.color_hex || '#8fd7ff',
      };
    }),
  };

  const existingIndex = (state.report?.snapshotKeys || []).indexOf(key);
  if (existingIndex >= 0) {
    if (!force) return;
    state.report.cashHistory[existingIndex] = snapshot;
  } else {
    state.report.snapshotKeys.push(key);
    state.report.cashHistory.push(snapshot);
  }
  renderReportOverlay();
}

function resetReportData() {
  state.report.cashHistory = [];
  state.report.snapshotKeys = [];
  captureCashSnapshot({
    label: 'Inicio',
    turnNumber: 0,
    phase: 'Mesa inicial',
    force: true,
  });
}

function playerActionLogEntries(playerId) {
  pruneActionFeed();
  return (state.actionFeed || []).filter((entry) => entry.playerId === playerId).slice(0, 5);
}

function togglePlayerActionFeedExpanded(playerId) {
  state.view.expandedActionFeedsByPlayer[playerId] = !state.view.expandedActionFeedsByPlayer[playerId];
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
function getSettingsOverlay() { return byId('game-settings-overlay'); }
function getSettingsLogModeValue() { return byId('settings-log-mode-value'); }
function getSettingsLogModeGlobalInput() { return byId('settings-log-mode-global'); }
function getSettingsLogModePlayerInput() { return byId('settings-log-mode-player'); }
function getSettingsCpuSpeedInput() { return byId('settings-cpu-speed'); }
function getSettingsCpuSpeedValue() { return byId('settings-cpu-speed-value'); }
function getSettingsLogLifetimeInput() { return byId('settings-log-lifetime'); }
function getSettingsLogLifetimeValue() { return byId('settings-log-lifetime-value'); }
function getSettingsBackgroundModeValue() { return byId('settings-background-mode-value'); }
function getSettingsBackgroundModeOffInput() { return byId('settings-background-mode-off'); }
function getSettingsBackgroundModeOnInput() { return byId('settings-background-mode-on'); }
function reportSnapshots() { return state.report?.cashHistory || []; }

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
  return playerById(state.session?.active_player_id) || humanPlayer() || alivePlayers()[0] || state.players[0] || null;
}

function defaultSessionPlayerId() {
  return alivePlayers()[0]?.id || state.players[0]?.id || '';
}

function focusPlayer() {
  return humanPlayer() || activePlayer() || state.players[0] || null;
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
  state.activeContract = state.humanCompany?.active_contract || focusPlayer()?.active_contract || null;
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

function globalActionFeedMarkup(entries) {
  const visibleEntries = (entries || []).slice(0, 18);
  if (!visibleEntries.length) {
    return `
      <article class="game-action-entry is-empty">
        <span class="game-action-entry-accent" style="background:rgba(143, 215, 255, 0.45);"></span>
        <div class="game-action-entry-body">
          <strong class="game-action-entry-title">Nenhuma acao recente</strong>
          <span class="game-action-entry-detail">Os eventos do turno vao aparecer aqui.</span>
        </div>
      </article>
    `;
  }
  return visibleEntries.map((entry, index) => {
    const detail = entry.detail ? `${entry.turnLabel} - ${entry.detail}` : entry.turnLabel;
    return `
      <article class="game-action-entry${index === 0 ? ' is-newest' : ''}">
        <span class="game-action-entry-accent" style="background:${entry.color}; box-shadow:0 0 8px ${entry.glow};"></span>
        <div class="game-action-entry-body">
          <strong class="game-action-entry-title">${entry.playerName} - ${entry.action}</strong>
          <span class="game-action-entry-detail">${detail}</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderActionFeed({ force = false } = {}) {
  if (!force && shouldDeferUiRefresh()) {
    markDeferredUiRefresh();
    return;
  }
  const entries = pruneActionFeed();
  const target = byId('game-action-feed');
  if (target) target.innerHTML = globalActionFeedMarkup(entries);
  renderRivals({ force });
}

function scheduleActionLogExpiry(entryId) {
  const entry = (state.actionFeed || []).find((item) => item.id === entryId);
  if (!entry) return;
  const waitMs = Math.max(140, Math.round((entry.expiresAt || 0) - Date.now()) + 40);
  window.setTimeout(() => {
    const currentEntry = (state.actionFeed || []).find((item) => item.id === entryId);
    if (!currentEntry) return;
    if ((currentEntry.expiresAt || 0) > Date.now()) {
      scheduleActionLogExpiry(entryId);
      return;
    }
    state.actionFeed = (state.actionFeed || []).filter((item) => item.id !== entryId);
    renderActionFeed();
  }, waitMs);
}

function pushActionLog(player, action, detail) {
  const color = player?.color_hex || '#8fd7ff';
  const createdAt = Date.now();
  const entry = {
    id: `${createdAt}-${Math.random().toString(16).slice(2)}`,
    playerId: player?.id || '',
    playerName: playerActionName(player),
    action,
    detail: detail || '',
    color,
    glow: brightenHex(color, 0.42),
    turnLabel: state.session?.turn_label || 'Turno --',
    createdAt,
    expiresAt: createdAt + currentLogLifetimeMs(),
  };
  state.actionFeed = [entry, ...(state.actionFeed || [])].slice(0, 18);
  renderActionFeed();
  scheduleActionLogExpiry(entry.id);
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

function couponKind(coupon) {
  return typeof coupon === 'string' ? coupon : String(coupon?.kind || '');
}

function couponDisplayLabel(coupon) {
  if (typeof coupon === 'string') return couponLabelFromCode(coupon);
  return coupon?.label || couponSourceCard(coupon)?.title || couponLabelFromCode(coupon?.kind);
}

function playerCoupons(player) {
  return Array.isArray(player?.coupons) ? player.coupons : [];
}

function firstCouponOfKind(player, kind) {
  return playerCoupons(player).find((coupon) => couponKind(coupon) === kind) || null;
}

function removeCouponFromPlayer(player, coupon) {
  if (!player || !coupon) return;
  const key = couponCardKey(coupon);
  player.coupons = playerCoupons(player).filter((entry) => String(couponCardKey(entry)) !== String(key));
}

function consumeCouponForPlayer(player, coupon, { detail = '', statusLabel = null, action = 'Cupom usado' } = {}) {
  if (!player || !coupon) return null;
  const label = couponDisplayLabel(coupon);
  removeCouponFromPlayer(player, coupon);
  if (typeof coupon !== 'string' && coupon?.source_card_id) {
    releaseHeldChanceCardToDiscard(coupon.source_card_id);
  }
  player.status_label = statusLabel || `usou ${label}`;
  pushActionLog(player, action, detail ? `${label}: ${detail}` : label);
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return { coupon, label };
}

async function maybeSpendCoupon(player, kind, {
  title = '',
  copy = '',
  detail = '',
  statusLabel = null,
  cardCode = '',
  action = 'Cupom usado',
  primaryLabel = '',
  secondaryLabel = 'Nao usar',
  hideSecondary = false,
  autoUse = true,
} = {}) {
  const coupon = firstCouponOfKind(player, kind);
  if (!coupon) return null;

  if (player?.is_human) {
    const choice = await openDecisionModal({
      title: title || couponDisplayLabel(coupon),
      copy: copy || `Deseja usar o cupom ${couponDisplayLabel(coupon)} agora?`,
      primaryLabel: primaryLabel || `Usar ${couponDisplayLabel(coupon)}`,
      secondaryLabel,
      hideSecondary,
      cardCode,
    });
    if (choice !== 'primary') return null;
  } else if (!autoUse) {
    return null;
  }

  const detailText = typeof detail === 'function' ? detail(coupon) : detail;
  return consumeCouponForPlayer(player, coupon, {
    detail: detailText,
    statusLabel,
    action,
  });
}

function contractNeedsMandatoryToll(contract) {
  return Boolean(contract && !contract.toll_requirement_waived && contract.mandatory_toll && contract.mandatory_toll !== '--');
}

function contractArrivalText(contract) {
  return contract?.toll_requirement_waived
    ? 'com atalho ativado'
    : `depois de passar por ${contract?.mandatory_toll || '--'}`;
}

function destinationBeforeTollSuffix(contract, reachedDestination, passedToll) {
  if (!reachedDestination || passedToll || !contractNeedsMandatoryToll(contract)) return '';
  return ` A entrega ainda nao vale porque falta passar em ${contract?.mandatory_toll || '--'}.`;
}

async function maybeUseFreePortStayCoupon(player, card, charge, owner = null) {
  if (!player || !(charge > 0)) return null;
  return maybeSpendCoupon(player, 'free_port_stay', {
    title: 'Porto Livre',
    copy: owner
      ? `Usar Porto Livre para zerar a estadia de ${formatCurrency(charge)} em ${card.code}, cobrada por ${owner.name}?`
      : `Usar Porto Livre para zerar a estadia de ${formatCurrency(charge)} em ${card.code}?`,
    primaryLabel: 'Usar Porto Livre',
    secondaryLabel: 'Pagar normalmente',
    cardCode: card.code,
    detail: owner
      ? `Zerou a estadia de ${card.code} que seria paga a ${owner.name}.`
      : `Zerou a estadia de ${card.code} que seria paga ao banco.`,
    statusLabel: `porto livre ${card.code}`,
  });
}

async function maybeUseFreeTollCoupon(player, card, charge, owner = null) {
  if (!player || !(charge > 0)) return null;
  const spent = await maybeSpendCoupon(player, 'free_toll', {
    title: 'Pedagio Livre',
    copy: owner
      ? `Usar Pedagio Livre para zerar a cobranca de ${formatCurrency(charge)} em ${card.code}, pertencente a ${owner.name}?`
      : `Usar Pedagio Livre para zerar a cobranca de ${formatCurrency(charge)} em ${card.code}?`,
    primaryLabel: 'Usar Pedagio Livre',
    secondaryLabel: 'Pagar normalmente',
    cardCode: card.code,
    detail: owner
      ? `Zerou o pedagio de ${card.code} que seria pago a ${owner.name}.`
      : `Zerou o pedagio de ${card.code} que seria pago ao banco.`,
    statusLabel: `pedagio livre ${card.code}`,
  });
  if (spent && player?.active_contract?.mandatory_toll === card.code) {
    player.active_contract.toll_passed = true;
    player.active_contract.route_stage = 'to_destination';
  }
  return spent;
}

function scheduleCashFlashClear(player, token) {
  window.setTimeout(() => {
    if (!player || player.cashFlashToken !== token) return;
    player.cashFlashValue = 0;
    player.cashFlashExpiresAt = 0;
    player.cashFlashToken = '';
    renderRivals();
  }, PLAYER_CASH_FLASH_CLEAR_MS);
}

function updatePlayerCash(player, delta) {
  const amount = Number(delta || 0);
  player.cash += amount;
  player.cash_display = formatCurrency(player.cash);
  if (amount === 0) return;
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  player.cashFlashValue = amount;
  player.cashFlashExpiresAt = Date.now() + PLAYER_CASH_FLASH_ANIMATION_MS;
  player.cashFlashToken = token;
  renderRivals();
  scheduleCashFlashClear(player, token);
}

function fuelStopCost(node) {
  const level = parseFuelLevel(node);
  return level ? (level * 5) : 0;
}

async function resolveFuelStopForPlayer(player, node) {
  if (!player || node?.kind !== 'fuel') {
    return { paid: 0, usedCoupon: false, note: '', statusLabel: player?.status_label || '--' };
  }

  const amount = fuelStopCost(node);
  if (amount <= 0) {
    return {
      paid: 0,
      usedCoupon: false,
      note: `${playerActionName(player)} parou em ${player.location_label} sem custo de abastecimento.`,
      statusLabel: player.status_label || player.location_label,
    };
  }

  const couponUse = await maybeSpendCoupon(player, 'free_fuel', {
    title: 'Gasolina Livre',
    copy: `Usar Gasolina Livre para zerar este abastecimento de ${formatCurrency(amount)}?`,
    primaryLabel: 'Usar Gasolina Livre',
    secondaryLabel: 'Pagar normalmente',
    detail: `Abastecimento em ${player.location_label} sem custo.`,
    statusLabel: 'abastecimento gratis',
  });
  if (couponUse) {
    return {
      paid: 0,
      usedCoupon: true,
      note: `${playerActionName(player)} usou Gasolina Livre em ${player.location_label} e nao pagou abastecimento.`,
      statusLabel: player.status_label,
    };
  }

  const outcome = await bankChargeOutcome(player, amount, {
    action: 'Abastecimento',
    detail: `Pagou ${formatCurrency(amount)} ao banco.`,
    statusLabel: `abasteceu ${formatCurrency(amount)}`,
    reason: `abastecimento em ${player.location_label}`,
  });
  renderHud();
  if (outcome.bankrupt) {
    return {
      paid: 0,
      usedCoupon: false,
      note: `${playerActionName(player)} nao conseguiu pagar o abastecimento em ${player.location_label} e faliu.`,
      statusLabel: player.status_label,
    };
  }
  return {
    paid: amount,
    usedCoupon: false,
    note: `${playerActionName(player)} parou em ${player.location_label} e pagou ${formatCurrency(amount)} ao banco.`,
    statusLabel: player.status_label,
  };
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
  if (!player || player.bankrupt || !card) return false;
  if (player.property_codes.includes((code || '').toUpperCase())) return true;
  if (player.cash < card.price) return false;
  updatePlayerCash(player, -card.price);
  setPropertyMortgaged(card.code, false);
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
  if (!fromPlayer || !toPlayer || fromPlayer.bankrupt || toPlayer.bankrupt) return false;
  if (!fromPlayer.property_codes?.includes(normalized)) return false;
  if (isPropertyMortgaged(normalized)) return false;
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

// ===== Advanced Economy Integration START =====
function economyLib() {
  return window.RDMEconomy || null;
}

function normalizedGameRules() {
  const lib = economyLib();
  return lib?.normalizeRules ? lib.normalizeRules(state.rules || {}) : (state.rules || {});
}

function alivePlayers() {
  return (state.players || []).filter((player) => !player?.bankrupt);
}

function isPropertyMortgaged(code) {
  return Boolean(getPropertyCard(code)?.mortgaged);
}

function setPropertyMortgaged(code, mortgaged) {
  const card = getPropertyCard(code);
  if (!card) return null;
  card.mortgaged = Boolean(mortgaged);
  return card;
}

function findPermissionRecord(player, permissionId) {
  return (player?.permissions || []).find((permission) => String(permission.id) === String(permissionId)) || null;
}

function activePermissionRecord(player) {
  return findPermissionRecord(player, player?.active_permission_id || '');
}

function availablePermissionRecords(player) {
  return (player?.permissions || []).filter(Boolean);
}

function permissionPurchasePrice(permission) {
  return Math.max(0, Number(permission?.purchase_price || normalizedGameRules().extra_permission_cost || 2000));
}

function isPermissionMortgaged(player, permissionId) {
  return Boolean(findPermissionRecord(player, permissionId)?.mortgaged);
}

function regionPortCards(continent) {
  return (state.portCards || []).filter((card) => String(card.continent || '') === String(continent || ''));
}

function playerHasRegionMonopoly(player, continent) {
  if (!player || player.bankrupt || !continent) return false;
  const cards = regionPortCards(continent);
  if (!cards.length) return false;
  return cards.every((card) => player.property_codes?.includes(card.code) && !isPropertyMortgaged(card.code));
}

function monopolyRegionsForPlayer(player) {
  if (!player || player.bankrupt) return [];
  return [...new Set((state.portCards || []).map((card) => card.continent).filter(Boolean))]
    .filter((continent) => playerHasRegionMonopoly(player, continent));
}

function propertyMortgageCredit(card) {
  return economyLib()?.mortgageCredit ? economyLib().mortgageCredit(card?.price || 0, normalizedGameRules()) : Math.floor(Number(card?.price || 0) * 0.5);
}

function propertyRedeemCost(card) {
  return economyLib()?.redeemCost ? economyLib().redeemCost(card?.price || 0, normalizedGameRules()) : Math.round(propertyMortgageCredit(card) * 1.5);
}

function permissionMortgageCredit(permission) {
  return 0;
}

function permissionRedeemCost(permission) {
  return 0;
}

function syncActivePermissionAfterEconomyChange(player) {
  if (!player) return;
  const available = availablePermissionRecords(player);
  const active = activePermissionRecord(player);
  if (active) return;
  if (available.length) {
    const next = available[0];
    player.active_permission_id = next.id;
    player.active_permission_label = next.title;
    player.ship_type = next.kind;
    player.ship_type_label = next.title;
    return;
  }
  player.active_permission_id = null;
  player.active_permission_label = '--';
  player.ship_type = null;
  player.ship_type_label = '--';
  player.ship_visible = false;
}

function setActivePermissionForPlayer(player, permissionId, { statusLabel = null } = {}) {
  const permission = findPermissionRecord(player, permissionId);
  if (!player || !permission) return { permission: null, changed: false };
  const changed = String(player.active_permission_id || '') !== String(permission.id);
  player.active_permission_id = permission.id;
  player.active_permission_label = permission.title;
  player.ship_type = permission.kind;
  player.ship_type_label = permission.title;
  player.ship_visible = Boolean(player.ship_type && player.board_node_id);
  if (statusLabel) {
    player.status_label = statusLabel;
  }
  if (player.active_contract && !player.active_contract.completed) {
    player.active_contract.cargo_label = permission.title;
  }
  syncDerivedState();
  renderHud();
  renderShipOverlay();
  return { permission, changed };
}

function contractPermissionChoicesForOrigin(player, originCode = null) {
  const resolvedOriginCode = String(originCode || player?.active_contract?.origin || player?.location_code || '').toUpperCase();
  const originCard = getPropertyCard(resolvedOriginCode);
  const ownsOrigin = Boolean(player?.property_codes?.includes(resolvedOriginCode) && !isPropertyMortgaged(resolvedOriginCode));
  const currentPermissionId = String(player?.active_permission_id || '');
  const choices = availablePermissionRecords(player).map((permission) => {
    const rate = getRate(originCard, permission.kind || permission.id) || { fee: 0, multiplier: 1 };
    const fee = Number(rate.fee || 0);
    const multiplier = Number(rate.multiplier || 1);
    return {
      permission,
      fee,
      multiplier,
      comparisonValue: ownsOrigin ? (fee * Math.max(1, multiplier)) : fee,
      isCurrent: String(permission.id) === currentPermissionId,
    };
  });
  return {
    originCode: resolvedOriginCode,
    ownsOrigin,
    choices,
  };
}

function applyBestContractPermissionForRobot(player, originCode = null) {
  const selection = contractPermissionChoicesForOrigin(player, originCode);
  const bestChoice = selection.choices.reduce((best, entry) => {
    if (!best) return entry;
    if (entry.comparisonValue > best.comparisonValue) return entry;
    if (entry.comparisonValue < best.comparisonValue) return best;
    if (entry.isCurrent) return entry;
    return best;
  }, null);
  if (!bestChoice) return null;
  const result = setActivePermissionForPlayer(player, bestChoice.permission.id, {
    statusLabel: 'permissao ativa definida',
  });
  if (result.changed && result.permission) {
    pushActionLog(player, 'Permissao escolhida', `${result.permission.title} (${selection.ownsOrigin ? `melhor frete no porto inicial ${selection.originCode}` : 'maior estadia'}).`);
    renderHud();
  }
  return { ...bestChoice, changed: result.changed, ownsOrigin: selection.ownsOrigin, originCode: selection.originCode };
}

function canMortgageProperty(player, code) {
  const normalized = String(code || '').toUpperCase();
  if (!player || player.bankrupt || !normalized) return false;
  if (!player.property_codes?.includes(normalized)) return false;
  return !isPropertyMortgaged(normalized);
}

function canRedeemProperty(player, code) {
  const normalized = String(code || '').toUpperCase();
  const card = getPropertyCard(normalized);
  if (!player || player.bankrupt || !card) return false;
  if (!player.property_codes?.includes(normalized) || !card.mortgaged) return false;
  return player.cash >= propertyRedeemCost(card);
}

function canMortgagePermission(player, permissionId) {
  return false;
}

function canRedeemPermission(player, permissionId) {
  return false;
}

function mortgagePropertyForPlayer(player, code, { auto = false, reason = 'hipoteca' } = {}) {
  if (!canMortgageProperty(player, code)) return false;
  const card = setPropertyMortgaged(code, true);
  const credit = propertyMortgageCredit(card);
  updatePlayerCash(player, credit);
  player.status_label = `hipotecou ${card.code}`;
  pushActionLog(player, auto ? 'Hipoteca automatica' : 'Hipoteca', `${card.code}: recebeu ${formatCurrency(credit)} (${reason}).`);
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return true;
}

function redeemPropertyForPlayer(player, code, { auto = false } = {}) {
  if (!canRedeemProperty(player, code)) return false;
  const card = getPropertyCard(code);
  const cost = propertyRedeemCost(card);
  updatePlayerCash(player, -cost);
  setPropertyMortgaged(code, false);
  player.status_label = `resgatou ${card.code}`;
  pushActionLog(player, auto ? 'Resgate automatico' : 'Resgate', `${card.code}: pagou ${formatCurrency(cost)} ao banco.`);
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return true;
}

function mortgagePermissionForPlayer(player, permissionId, { auto = false, reason = 'hipoteca' } = {}) {
  return false;
}

function redeemPermissionForPlayer(player, permissionId, { auto = false } = {}) {
  return false;
}

function mortgageCandidatesForPlayer(player) {
  if (!player || player.bankrupt) return [];
  const propertyCandidates = (player.property_codes || [])
    .map((code) => getPropertyCard(code))
    .filter((card) => card && !card.mortgaged)
    .map((card) => ({
      type: 'property',
      key: card.code,
      label: card.code,
      credit: propertyMortgageCredit(card),
      priority: playerHasRegionMonopoly(player, card.continent) ? 2 : 1,
    }));
  return [...propertyCandidates]
    .filter((entry) => entry.credit > 0)
    .sort((left, right) => (left.priority - right.priority) || (left.credit - right.credit) || String(left.label).localeCompare(String(right.label)));
}

function performMortgageCandidate(player, candidate, reason) {
  if (!player || !candidate) return false;
  if (candidate.type === 'property') return mortgagePropertyForPlayer(player, candidate.key, { auto: true, reason });
  return false;
}

function releaseCouponsOnBankruptcy(player) {
  (player?.coupons || []).forEach((coupon) => {
    if (typeof coupon !== 'string' && coupon?.source_card_id) {
      releaseHeldChanceCardToDiscard(coupon.source_card_id);
    }
  });
  player.coupons = [];
}

function bankruptPlayer(player, { creditor = null, reason = 'divida nao honrada', detail = '' } = {}) {
  if (!player || player.bankrupt) return false;
  const remainingCash = Math.max(0, Number(player.cash || 0));
  if (creditor && remainingCash > 0) {
    updatePlayerCash(player, -remainingCash);
    updatePlayerCash(creditor, remainingCash);
    pushActionLog(creditor, 'Recebeu espolio', `${player.name}: ${formatCurrency(remainingCash)}.`);
  }
  (player.property_codes || []).forEach((code) => {
    setPropertyMortgaged(code, false);
  });
  player.property_codes = [];
  refreshOwnedCounts(player);
  (player.permissions || []).forEach((permission) => {
    permission.mortgaged = false;
  });
  player.permissions = [];
  player.active_permission_id = null;
  player.active_permission_label = '--';
  player.ship_type = null;
  player.ship_type_label = '--';
  player.active_contract = null;
  player.needs_new_contract = false;
  player.ship_visible = false;
  player.bankrupt = true;
  player.status_label = 'falido';
  releaseCouponsOnBankruptcy(player);
  pushActionLog(player, 'Falencia', detail ? `${reason}: ${detail}.` : `${reason}.`);
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return true;
}

function mortgageCandidateKey(candidate) {
  return `${candidate?.type || ''}:${candidate?.key || ''}`;
}

function mortgageCandidateLabel(candidate) {
  if (!candidate) return 'ativo';
  if (candidate.type === 'property') {
    const card = getPropertyCard(candidate.key);
    return `${candidate.label} (${card?.is_toll ? 'Pedagio' : 'Porto'})`;
  }
  return `${candidate.label} (Permissao)`;
}

function mortgageCandidateCardCode(candidate) {
  return candidate?.type === 'property' ? String(candidate.key || '').toUpperCase() : '';
}

async function promptHumanMortgageForLiquidity(player, due, { reason = 'pagamento obrigatorio', creditor = null } = {}) {
  const skippedCandidates = new Set();

  while (player && !player.bankrupt && player.cash < due) {
    const availableCandidates = mortgageCandidatesForPlayer(player)
      .filter((candidate) => !skippedCandidates.has(mortgageCandidateKey(candidate)));
    if (!availableCandidates.length) break;

    const candidate = availableCandidates[0];
    const shortage = Math.max(0, due - player.cash);
    const projectedCash = player.cash + Number(candidate.credit || 0);
    const canContinueAfterMortgage = projectedCash >= due;
    const choice = await openDecisionModal({
      title: 'Hipoteca necessaria',
      copy: `Faltam ${formatCurrency(shortage)} para ${reason}. Hipotecar ${mortgageCandidateLabel(candidate)} por ${formatCurrency(candidate.credit)}?${canContinueAfterMortgage ? '' : ` Ainda faltara ${formatCurrency(Math.max(0, due - projectedCash))} depois disso.`}`,
      primaryLabel: `Hipotecar ${formatCurrency(candidate.credit)}`,
      secondaryLabel: availableCandidates.length > 1 ? 'Ver outra opcao' : 'Declarar falencia',
      cardCode: mortgageCandidateCardCode(candidate),
    });

    if (choice === 'primary') {
      const mortgaged = performMortgageCandidate(player, candidate, reason);
      if (mortgaged) {
        skippedCandidates.clear();
        continue;
      }
    }

    skippedCandidates.add(mortgageCandidateKey(candidate));
  }

  if (player && player.cash >= due) return true;
  bankruptPlayer(player, { creditor, reason, detail: `faltavam ${formatCurrency(Math.max(0, due - (player?.cash || 0)))}` });
  return false;
}

async function ensurePlayerLiquidity(player, amount, { reason = 'pagamento obrigatorio', creditor = null } = {}) {
  const due = Math.max(0, Number(amount || 0));
  if (!player || due <= 0 || player.bankrupt) return true;
  if (player.cash >= due) return true;

  if (player.is_human) {
    return promptHumanMortgageForLiquidity(player, due, { reason, creditor });
  }

  const candidates = mortgageCandidatesForPlayer(player);
  for (const candidate of candidates) {
    if (player.cash >= due) break;
    performMortgageCandidate(player, candidate, reason);
  }
  if (player.cash >= due) return true;
  bankruptPlayer(player, { creditor, reason, detail: `faltavam ${formatCurrency(Math.max(0, due - player.cash))}` });
  return false;
}

async function bankChargeOutcome(player, amount, { action = 'Pagamento ao banco', detail = '', statusLabel = null, reason = 'pagamento ao banco' } = {}) {
  const due = Math.max(0, Number(amount || 0));
  if (!player || due <= 0) return { paid: 0, bankrupt: false };
  if (!await ensurePlayerLiquidity(player, due, { reason })) {
    return { paid: 0, bankrupt: true };
  }
  updatePlayerCash(player, -due);
  player.status_label = statusLabel || `pagou ${formatCurrency(due)}`;
  pushActionLog(player, action, detail || `${formatCurrency(due)} ao banco.`);
  return { paid: due, bankrupt: false };
}

async function playerChargeOutcome(player, receiver, amount, { payerAction = 'Pagamento', receiverAction = 'Recebimento', payerDetail = '', receiverDetail = '', statusLabel = null, reason = 'pagamento a outro jogador' } = {}) {
  const due = Math.max(0, Number(amount || 0));
  if (!player || !receiver || due <= 0) return { paid: 0, bankrupt: false };
  if (!await ensurePlayerLiquidity(player, due, { reason, creditor: receiver })) {
    return { paid: 0, bankrupt: true };
  }
  updatePlayerCash(player, -due);
  updatePlayerCash(receiver, due);
  player.status_label = statusLabel || `pagou ${formatCurrency(due)}`;
  pushActionLog(player, payerAction, payerDetail || `${formatCurrency(due)} para ${receiver.name}.`);
  pushActionLog(receiver, receiverAction, receiverDetail || `${formatCurrency(due)} de ${player.name}.`);
  return { paid: due, bankrupt: false };
}

function contractSettlementBreakdown(player, contract, modifiers = {}) {
  const originOwner = ownerPlayerOf(contract?.origin || '');
  const tollOwner = ownerPlayerOf(contract?.mandatory_toll || '');
  const originCard = getPropertyCard(contract?.origin || '');
  const tollIncomeEligible = Boolean(
    tollOwner
    && tollOwner.id !== player?.id
    && !tollOwner.bankrupt
    && !isPropertyMortgaged(contract?.mandatory_toll || '')
    && !contract?.toll_requirement_waived
  );
  const originCommissionEligible = Boolean(
    originOwner
    && originOwner.id !== player?.id
    && !originOwner.bankrupt
    && !isPropertyMortgaged(contract?.origin || '')
  );
  const monopolyDouble = Boolean(
    originCard
    && originCard.kind === 'port'
    && player?.property_codes?.includes(originCard.code)
    && !isPropertyMortgaged(originCard.code)
    && playerHasRegionMonopoly(player, originCard.continent)
  );
  const lib = economyLib();
  const breakdown = lib?.computeContractSettlement
    ? lib.computeContractSettlement({
        baseFreightValue: Number(contract?.base_freight_value || contract?.freight_value || 0),
        roundsElapsed: Number(contract?.rounds_elapsed || 1),
        targetRounds: Number(contract?.target_rounds || state.rules.target_rounds || 4),
        freightMultiplier: Number(modifiers.freightMultiplier || 1),
        waiveOriginShare: Boolean(modifiers.waiveOriginShare),
        originOwnerEligible: originCommissionEligible,
        tollOwnerEligible: tollIncomeEligible,
        originMonopolyDouble: monopolyDouble,
        rules: normalizedGameRules(),
      })
    : { base: 0, adjustedBase: 0, gross: 0, targetRounds: 4, roundsElapsed: 1, earlyRounds: 0, lateRounds: 0, adjustment: 0, freightMultiplier: 1, waiveOriginShare: false, monopolyMultiplier: 1, originCommission: 0, tollShare: 0, total: 0 };
  return {
    ...breakdown,
    originOwner: originCommissionEligible ? originOwner : null,
    tollOwner: tollIncomeEligible ? tollOwner : null,
  };
}

function stopChargeBreakdown(player, card) {
  const owner = ownerPlayerOf(card?.code || '');
  const { fee, multiplier } = getPropertyStopRate(player, card);
  const ownerEligible = Boolean(owner && owner.id !== player?.id && !owner.bankrupt && !isPropertyMortgaged(card?.code || ''));
  const lib = economyLib();
  const breakdown = lib?.computeStopCharge
    ? lib.computeStopCharge({
        fee,
        multiplier,
        ownerEligible,
        hasRegionMonopoly: ownerEligible && card?.kind === 'port' && playerHasRegionMonopoly(owner, card?.continent || ''),
        regionSize: regionPortCards(card?.continent || '').length || 1,
        propertyKind: card?.kind || 'port',
        rules: normalizedGameRules(),
      })
    : { bankFee: fee, ownerCharge: ownerEligible ? (fee * multiplier) : 0, monopolyApplied: false, monopolyRegionSize: 1 };
  return {
    owner,
    fee,
    multiplier,
    ownerEligible,
    bankFee: breakdown.bankFee,
    ownerCharge: breakdown.ownerCharge,
    monopolyApplied: breakdown.monopolyApplied,
    monopolyRegionSize: breakdown.monopolyRegionSize,
    mortgaged: isPropertyMortgaged(card?.code || ''),
  };
}
// ===== Advanced Economy Integration END =====

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
  if (Object.prototype.hasOwnProperty.call(patch || {}, 'active_player_id')) {
    renderNodeOverlay();
  }
}

function cargoIconMarkup(kind, className) {
  const src = state.assets?.cargo_icons?.[kind];
  return src ? `<img src="${src}" class="${className}" alt="${kind}" />` : `<span class="${className}">${kind}</span>`;
}

function permissionMiniMarkup(permission) {
  const mortgaged = Boolean(permission?.mortgaged);
  return `
    <article class="preview-permission-mini${mortgaged ? ' is-mortgaged' : ''}" style="--permission-accent:${permission.accent}; --permission-text:${permission.text};">
      
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
  const mortgaged = Boolean(card?.mortgaged);
  return `
    <article class="preview-property-mini${card.is_toll ? ' is-toll' : ''}${mortgaged ? ' is-mortgaged' : ''}" style="--title-fill:${card.fill}; --title-text:${card.text};">
      
      <header class="preview-property-mini-head${tollHeadClass}">
        ${card.is_toll ? `<span class="preview-property-mini-diamond">${tollDiamondSvg()}</span>` : `<span class="preview-property-mini-number-spacer"></span>`}
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
        <span>${mortgaged ? 'Resgate' : 'Preco'}</span>
        <strong>${mortgaged ? formatCurrency(propertyRedeemCost(card)) : card.price}</strong>
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

function couponCardKey(coupon) {
  if (typeof coupon === 'string') return coupon;
  return String(coupon?.source_card_id || coupon?.id || coupon?.kind || coupon?.label || 'coupon');
}

function couponSourceCard(coupon) {
  if (typeof coupon === 'string') return null;
  return chanceCardById(coupon?.source_card_id || '') || null;
}

function couponMiniMarkup(coupon) {
  const sourceCard = couponSourceCard(coupon);
  const fallbackLabel = typeof coupon === 'string'
    ? coupon
    : (coupon?.label || coupon?.title || coupon?.kind || 'Cupom');
  const title = sourceCard?.title || fallbackLabel;
  const body = sourceCard?.description || couponLabelFromCode(typeof coupon === 'string' ? coupon : coupon?.kind);
  const foot = sourceCard?.effect_text || couponLabelFromCode(typeof coupon === 'string' ? coupon : coupon?.kind);
  const accent = sourceCard?.accent || '#18C43A';
  const textColor = sourceCard?.text || '#FFFFFF';
  return `
    <article class="preview-chance-mini" style="--chance-accent:${accent}; --chance-text:${textColor};">
      <header class="preview-chance-mini-head">${title}</header>
      <div class="preview-chance-mini-body">${body}</div>
      <footer class="preview-chance-mini-foot">${foot}</footer>
    </article>
  `;
}

function readableTextColor(backgroundHex, light = '#edf6ff', dark = '#06111a') {
  const normalized = String(backgroundHex || '').trim().replace('#', '');
  if (!normalized) return light;
  const hex = normalized.length === 3
    ? normalized.split('').map((value) => `${value}${value}`).join('')
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return light;
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;
  return luminance >= 0.62 ? dark : light;
}

const REGION_LABELS = {
  AF: 'Africa',
  AS: 'Asia',
  EU: 'Europa',
  NA: 'America do Norte',
  OC: 'Oceania',
  OM: 'Oriente Medio',
  SA: 'America do Sul',
};

function monopolyRegionStyle(regionCode) {
  const card = regionPortCards(regionCode)?.[0] || null;
  const background = card?.fill || '#8fd7ff';
  const text = card?.text || readableTextColor(background);
  return { background, text };
}

function monopolyRegionLabel(regionCode) {
  const normalized = String(regionCode || '').trim().toUpperCase();
  return REGION_LABELS[normalized] || normalized;
}

function monopolyChipMarkup(player, regionCode) {
  const normalized = String(regionCode || '').trim().toUpperCase();
  const style = monopolyRegionStyle(normalized);
  return `<span class="preview-monopoly-chip" style="background:${style.background}; color:${style.text}; border-color:${style.background};">${monopolyRegionLabel(normalized)}</span>`;
}

function contractDeadlineTone(contract) {
  const progress = String(contract?.deadline_progress || '0/4').split('/').map((value) => Number(value) || 0);
  const current = progress[0] || 0;
  const target = progress[1] || 4;
  if (current >= 5 || current > target) return 'danger';
  if (current >= 4) return 'warning';
  return 'good';
}


function miniHandStyle(type, count) {
  if (!count || count <= 1) return '';
  const config = {
    permission: { overlap: 46, scale: 1 },
    property: { overlap: 44, scale: 0.82 },
    coupon: { overlap: 48, scale: 0.84 },
  }[type] || { overlap: 40, scale: 1 };
  return ` style="--stack-overlap:${config.overlap}px; --stack-scale:${config.scale};"`;
}

function playerCashFlashMarkup(player) {
  const expiresAt = Number(player?.cashFlashExpiresAt || 0);
  const value = Number(player?.cashFlashValue || 0);
  const now = Date.now();
  if (!(value) || expiresAt <= now) return '';
  const remainingMs = Math.max(0, expiresAt - now);
  const elapsedMs = Math.max(0, Math.min(PLAYER_CASH_FLASH_ANIMATION_MS, PLAYER_CASH_FLASH_ANIMATION_MS - remainingMs));
  const style = `animation-delay:-${elapsedMs}ms; animation-duration:${PLAYER_CASH_FLASH_ANIMATION_MS}ms;`;
  return `<span class="preview-rival-cash-flash ${value > 0 ? 'is-positive' : 'is-negative'}" style="${style}">${formatSignedCurrency(value)}</span>`;
}

function playerActionLogMarkup(player) {
  if (currentLogMode() !== 'player') return '';
  const entries = playerActionLogEntries(player?.id || '');
  if (!entries.length) return '';
  const expanded = Boolean(state.view.expandedActionFeedsByPlayer?.[player.id]);
  return `
    <div class="preview-rival-action-log${expanded ? ' is-expanded' : ' is-collapsed'}" data-player-log-player-id="${player.id}">
      <div class="preview-rival-action-log-chip">${entries.length} ${entries.length > 1 ? 'acoes' : 'acao'}</div>
      <div class="preview-rival-action-feed">
        ${entries.map((entry, index) => `
          <article class="preview-rival-action-entry${index === 0 ? ' is-newest' : ''}">
            <span class="preview-rival-action-entry-accent" style="background:${entry.color}; box-shadow:0 0 8px ${entry.glow};"></span>
            <div class="preview-rival-action-entry-body">
              <strong class="preview-rival-action-entry-title">${entry.action}</strong>
              <span class="preview-rival-action-entry-detail">${entry.detail}</span>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function contractSummaryMarkup(player, contract) {
  if (player?.bankrupt) {
    return `
      <div class="preview-rival-contract-line is-empty">
        <span class="preview-rival-contract-muted">companhia falida</span>
      </div>
    `;
  }
  if (!contract || !player?.active_permission_label || player.active_permission_label === '--') {
    return `
      <div class="preview-rival-contract-line is-empty">
        <span class="preview-rival-contract-muted">primeiro turno pendente</span>
      </div>
    `;
  }
  const tone = contractDeadlineTone(contract);
  const lastRollIsDouble = Array.isArray(player?.last_roll)
    && player.last_roll.length === 2
    && player.last_roll[0] === player.last_roll[1];
  const lastRollMarkup = Array.isArray(player?.last_roll) && player.last_roll.length === 2
    ? `
      <div class="preview-rival-last-roll${lastRollIsDouble ? ' is-double' : ''}" aria-label="Ultima jogada">
        <span class="preview-rival-die${lastRollIsDouble ? ' is-double' : ''}">${player.last_roll[0]}</span>
        <span class="preview-rival-die${lastRollIsDouble ? ' is-double' : ''}">${player.last_roll[1]}</span>
      </div>
    `
    : '';
  return `
    <div class="preview-rival-contract-line">
      <span class="preview-rival-contract-cargo">${cargoIconMarkup(player.active_permission_id, 'preview-rival-contract-cargo-icon')}${player.active_permission_label}</span>
      <span class="preview-rival-contract-turns is-${tone}">(${contract.deadline_progress || '0/4'}) turnos</span>
      <span class="preview-rival-contract-freight">${contract.freight_label || 'Sem frete'}</span>
    </div>
    <div class="preview-rival-bottomline">
      <div class="preview-rival-route">${contractRouteMarkup(contract, { emptyText: 'primeiro turno pendente' })}</div>
      ${lastRollMarkup}
    </div>
  `;
}

function miniHandMarkup(content, extraClass = '', style = '') {
  const empty = /is-muted/.test(content || '');
  return `<div class="preview-rival-mini-strip${extraClass ? ` ${extraClass}` : ''}${empty ? ' is-empty' : ''}"${style}>${content}</div>`;
}

let miniHandLayoutFrame = 0;

function miniHandMinVisible(strip) {
  if (strip.classList.contains('properties-hand')) return 8;
  if (strip.classList.contains('permissions-hand')) return 18;
  if (strip.classList.contains('coupons-hand')) return 18;
  return 12;
}

function layoutMiniHand(strip) {
  if (!strip || strip.classList.contains('is-empty')) return;
  const items = [...strip.children].filter((node) => node.nodeType === 1);
  if (items.length <= 1) {
    strip.style.setProperty('--stack-overlap', '0px');
    return;
  }

  const availableWidth = Math.floor(strip.clientWidth || strip.getBoundingClientRect().width || 0);
  const itemWidth = Math.ceil(items[0].getBoundingClientRect().width || items[0].offsetWidth || 0);
  if (!availableWidth || !itemWidth) return;

  const minVisible = miniHandMinVisible(strip);
  const visibleWidth = Math.max(minVisible, Math.floor((availableWidth - itemWidth) / Math.max(1, items.length - 1)));
  const overlap = Math.max(0, Math.min(itemWidth - minVisible, itemWidth - visibleWidth));
  strip.style.setProperty('--stack-overlap', `${overlap}px`);
}

function layoutMiniHands() {
  document.querySelectorAll('.preview-rival-mini-strip').forEach((strip) => layoutMiniHand(strip));
}

function syncPlayerActionLogOffsets() {
  document.querySelectorAll('.preview-rival-card').forEach((card) => {
    const drawer = card.querySelector('.preview-rival-drawer');
    const drawerHeight = drawer ? Math.ceil(drawer.getBoundingClientRect().height || drawer.offsetHeight || 0) : 0;
    const offset = drawerHeight > 0 ? drawerHeight + 16 : 8;
    card.style.setProperty('--player-log-offset', `${offset}px`);
  });
}

function scheduleMiniHandLayout() {
  if (miniHandLayoutFrame) {
    window.cancelAnimationFrame(miniHandLayoutFrame);
  }
  miniHandLayoutFrame = window.requestAnimationFrame(() => {
    miniHandLayoutFrame = 0;
    layoutMiniHands();
    syncPlayerActionLogOffsets();
  });
}

function propertyCardSortValue(card) {
  return `${card?.fill || ''}|${card?.code || ''}`;
}

function selectedMiniKey(playerId, type) {
  return state.view.selectedMiniCardsByPlayer?.[playerId]?.[type] || '';
}

function setSelectedMiniKey(playerId, type, key) {
  state.view.selectedMiniCardsByPlayer[playerId] = {
    ...(state.view.selectedMiniCardsByPlayer[playerId] || {}),
    [type]: key,
  };
}

function moveSelectedToEnd(items, selectedKey, keyFn) {
  if (!selectedKey) return items.slice();
  const sorted = [];
  let selected = null;
  items.forEach((item) => {
    if (String(keyFn(item)) === String(selectedKey)) {
      selected = item;
    } else {
      sorted.push(item);
    }
  });
  if (selected) sorted.push(selected);
  return selected ? sorted : items.slice();
}

function miniCardWrapper({ playerId, type, key, selected = false, innerMarkup = '', extraClass = '' }) {
  return `
    <button type="button" class="preview-mini-selectable ${extraClass}${selected ? ' is-selected' : ''}" data-player-id="${playerId}" data-mini-type="${type}" data-mini-key="${key}">
      ${innerMarkup}
    </button>
  `;
}

function miniCouponMarkup(playerId, coupon, selected = false) {
  return miniCardWrapper({
    playerId,
    type: 'coupon',
    key: couponCardKey(coupon),
    selected,
    extraClass: 'preview-mini-selectable-coupon',
    innerMarkup: couponMiniMarkup(coupon),
  });
}


function routeStopMarkup(code, { large = false } = {}) {
  const normalized = String(code || '').toUpperCase();
  const largeClass = large ? ' is-large' : '';
  if (!normalized || normalized === '--') {
    return `<span class="preview-route-stop port is-empty${largeClass}"><span class="preview-route-stop-label">--</span></span>`;
  }
  const card = getPropertyCard(normalized);
  if (!card) {
    return `<span class="preview-route-stop port is-empty${largeClass}"><span class="preview-route-stop-label">${normalized}</span></span>`;
  }
  return `
    <span class="preview-route-stop ${card.is_toll ? 'toll' : 'port'}${largeClass}" style="--route-fill:${card.fill}; --route-text:${card.text};">
      <span class="preview-route-stop-label">${card.code}</span>
    </span>
  `;
}

function contractRouteMarkup(contract, { emptyText = 'primeiro turno pendente', large = false } = {}) {
  if (!contract) {
    return `<span class="preview-route-empty">${emptyText}</span>`;
  }
  const hasAnySelection = [contract.origin, contract.mandatory_toll, contract.destination].some((code) => code && code !== '--');
  if (!hasAnySelection) {
    return `<span class="preview-route-empty">${emptyText}</span>`;
  }
  return `
    <div class="preview-route-inline${large ? ' is-large' : ''}">
      ${routeStopMarkup(contract.origin, { large })}
      <span class="preview-route-arrow">&rsaquo;</span>
      ${routeStopMarkup(contract.mandatory_toll, { large })}
      <span class="preview-route-arrow">&rsaquo;</span>
      ${routeStopMarkup(contract.destination, { large })}
    </div>
  `;
}

function playerDrawerMarkup(player) {
  const selectedPermissionKey = selectedMiniKey(player.id, 'permission');
  const selectedPropertyKey = selectedMiniKey(player.id, 'property');
  const selectedCouponKey = selectedMiniKey(player.id, 'coupon');
  const monopolyItems = monopolyRegionsForPlayer(player)
    .map((region) => String(region || '').toUpperCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  const permissionItems = moveSelectedToEnd(
    [...(player.permissions || [])].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))),
    selectedPermissionKey,
    (permission) => permission.id,
  );
  const propertyItems = moveSelectedToEnd(
    (player.property_codes || [])
      .map((code) => getPropertyCard(code))
      .filter(Boolean)
      .sort((a, b) => propertyCardSortValue(a).localeCompare(propertyCardSortValue(b))),
    selectedPropertyKey,
    (card) => card.code,
  );
  const couponItems = moveSelectedToEnd(
    [...(player.coupons || [])].sort((a, b) => couponLabelFromCode(typeof a === 'string' ? a : a?.kind).localeCompare(couponLabelFromCode(typeof b === 'string' ? b : b?.kind))),
    selectedCouponKey,
    (coupon) => couponCardKey(coupon),
  );

  const permissionsMarkup = permissionItems.map((permission) => miniCardWrapper({
    playerId: player.id,
    type: 'permission',
    key: permission.id,
    selected: String(permission.id) === String(selectedPermissionKey),
    extraClass: 'preview-mini-selectable-permission',
    innerMarkup: permissionMiniMarkup(permission),
  })).join('');

  const propertiesMarkup = propertyItems.map((card) => miniCardWrapper({
    playerId: player.id,
    type: 'property',
    key: card.code,
    selected: String(card.code) === String(selectedPropertyKey),
    extraClass: 'preview-mini-selectable-property',
    innerMarkup: propertyMiniMarkup(card),
  })).join('');

  const couponsMarkup = couponItems.map((coupon) => miniCouponMarkup(
    player.id,
    coupon,
    String(couponCardKey(coupon)) === String(selectedCouponKey),
  )).join('');
  const monopoliesMarkup = monopolyItems.map((regionCode) => monopolyChipMarkup(player, regionCode)).join('');

  return `
    <div class="preview-rival-drawer">
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Permissoes</span>
        ${miniHandMarkup(permissionsMarkup || '<span class="preview-inline-chip is-muted">sem permissao</span>', 'permissions-hand', miniHandStyle('permission', permissionItems.length))}
      </div>
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Titulos e pedagios</span>
        ${miniHandMarkup(propertiesMarkup || '<span class="preview-inline-chip is-muted">sem titulos</span>', 'properties-hand', miniHandStyle('property', propertyItems.length))}
      </div>
      ${couponItems.length ? `
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Cupons</span>
        ${miniHandMarkup(couponsMarkup, 'coupons-hand preview-rival-coupons', miniHandStyle('coupon', couponItems.length))}
      </div>
      ` : ''}
      ${monopolyItems.length ? `
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Monopolio</span>
        <div class="preview-rival-monopoly-list">${monopoliesMarkup}</div>
      </div>
      ` : ''}
    </div>
  `;
}

function renderRivals({ force = false } = {}) {
  if (!force && shouldDeferUiRefresh()) {
    markDeferredUiRefresh();
    return;
  }
  pruneActionFeed();

  const target = byId('preview-rival-list');
  if (!target) return;
  target.innerHTML = '';

  const human = humanPlayer();
  const rivals = state.rivals || [];
  const players = [human, ...rivals].filter(Boolean);
  const active = activePlayer();
  target.style.setProperty('--rival-count', String(Math.max(1, players.length)));

  players.forEach((player) => {
    const contract = player.active_contract;
    const isHuman = Boolean(player.is_human);
    const isOpen = isHuman ? state.view.humanDrawerOpen : state.view.openSystemDrawerId === player.id;
    const isActive = Boolean(active && active.id === player.id);
    const card = document.createElement('article');
    card.className = `preview-rival-card${isOpen ? ' is-open' : ''}${isHuman ? ' is-human' : ''}${isActive ? ' is-active-player' : ''}${player.bankrupt ? ' is-bankrupt' : ''}`;
    card.dataset.playerId = player.id;
    card.style.setProperty('--rival-accent', player.color_hex || '#8fd7ff');
    card.style.setProperty('--card-grow', '1');
    card.innerHTML = `
      ${playerActionLogMarkup(player)}
      <div class="preview-rival-top">
        <span class="preview-rival-dot" style="background:${player.color_hex}"></span>
        <strong>${isHuman ? player.name : `&#129302; ${player.name}`}${player.bankrupt ? ' (falido)' : ''}</strong>
        <span class="preview-rival-cash-wrap">${playerCashFlashMarkup(player)}<span class="preview-rival-cash">${player.cash_display}</span></span>
      </div>
      ${contractSummaryMarkup(player, contract)}
      ${isOpen ? playerDrawerMarkup(player) : ''}
    `;
    target.appendChild(card);
  });
  syncPlayerActionLogOffsets();
  scheduleMiniHandLayout();
}

function renderHud({ force = false } = {}) {
  if (!force && shouldDeferUiRefresh()) {
    markDeferredUiRefresh();
    return;
  }

  const focus = focusPlayer();
  setText('preview-turn', state.session?.turn_label || 'Turno 01');
  setText('preview-human-name', focus?.name || 'Mesa de Robos');
  setText('preview-human-port', focus?.location_label || '--');
  setText('preview-cash', focus?.cash_display || formatCurrency(state.rules.initial_cash || 0));

  renderCompanyList(focus);
  renderRivals({ force });
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
      toll_passed: false,
      toll_requirement_waived: false,
      route_stage: 'to_toll',
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

function permissionCardsForDraw() {
  const ids = state.permissionDraw.cardIds || [];
  const pool = ids.length
    ? ids.map((id) => state.freightPermissionCards.find((card) => card.id === id)).filter(Boolean)
    : state.freightPermissionCards.slice();
  return pool;
}

function availablePermissionCardsForPlayer(player, { excludeOwned = false } = {}) {
  const allCards = state.freightPermissionCards || [];
  if (!excludeOwned) return allCards.slice();
  const ownedKinds = new Set((player?.permissions || []).map((permission) => permission.kind).filter(Boolean));
  return allCards.filter((card) => !ownedKinds.has(card.kind));
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

  const drawCards = permissionCardsForDraw();
  const orderedCards = state.permissionDraw.order
    .map((id) => drawCards.find((card) => card.id === id))
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
    button.textContent = state.permissionDraw.drawing ? 'Embaralhando...' : 'Sortear';
    button.style.display = state.permissionDraw.selectedCardId ? 'none' : 'inline-flex';
  }
}

function createPermissionRecord(card) {
  return {
    id: card.id,
    kind: card.kind,
    title: card.title,
    accent: card.accent,
    text: card.text,
    purchase_price: Number(card.purchase_price || normalizedGameRules().extra_permission_cost || 2000),
    mortgaged: Boolean(card.mortgaged),
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
  state.permissionDraw.cardIds = [];
  if (resolver) resolver(card);
}

function startPermissionDraw() {
  const drawCards = permissionCardsForDraw();
  if (state.permissionDraw.drawing || !drawCards.length) return;

  state.permissionDraw.drawing = true;
  state.permissionDraw.selectedCardId = '';
  state.permissionDraw.frame = 0;
  state.permissionDraw.order = shuffleArray(drawCards.map((card) => card.id));
  setPermissionDrawResult('Embaralhando...');
  renderPermissionDraw();

  const durationMs = 1800;
  const shuffleEveryMs = 110;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    state.permissionDraw.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      state.permissionDraw.order = shuffleArray(drawCards.map((card) => card.id));
      lastShuffleAt = now;
    }

    renderPermissionDraw();

    if (elapsed < durationMs) {
      state.permissionDraw.rafId = window.requestAnimationFrame(step);
      return;
    }

    state.permissionDraw.drawing = false;
    state.permissionDraw.order = shuffleArray(drawCards.map((card) => card.id));
    const selectedId = randomChoice(state.permissionDraw.order);
    state.permissionDraw.selectedCardId = selectedId;
    const card = drawCards.find((item) => item.id === selectedId) || null;
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

function openHumanPermissionDraw({ promptText = 'Pressione Enter ou clique para embaralhar.', onSelected = null, cards = null } = {}) {
  const drawCards = Array.isArray(cards) && cards.length ? cards : state.freightPermissionCards;
  state.permissionDraw.drawing = false;
  state.permissionDraw.selectedCardId = '';
  state.permissionDraw.frame = 0;
  state.permissionDraw.cardIds = drawCards.map((card) => card.id);
  state.permissionDraw.order = drawCards.map((card) => card.id);
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
  if (extra) {
    extra.classList.add('is-hidden');
    extra.classList.remove('is-inline');
  }
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

function configurePortDrawExtra({ copy = '', copyHtml = '', primaryLabel, secondaryLabel = 'Cancelar', onPrimary, onSecondary = null, hideSecondary = false, layout = 'stack' }) {
  const extra = getPortDrawExtra();
  const copyNode = getPortDrawExtraCopy();
  const primary = getPortDrawExtraPrimary();
  const secondary = getPortDrawExtraSecondary();
  if (!extra || !primary || !secondary || !copyNode) {
    return;
  }
  extra.classList.remove('is-hidden');
  extra.classList.toggle('is-inline', layout === 'inline');
  if (copyHtml) copyNode.innerHTML = copyHtml;
  else copyNode.textContent = copy;
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
  const modal = getPortDrawOverlay()?.querySelector('.port-draw-modal') || null;
  if (!stage) return;

  const isTollMode = state.portDraw.mode === 'toll';
  const isDestinationMode = state.portDraw.mode === 'destination';
  const cards = currentPortDrawCards();

  if (modal) {
    modal.classList.toggle('is-origin', state.portDraw.mode === 'origin');
    modal.classList.toggle('is-destination', isDestinationMode);
    modal.classList.toggle('is-toll', isTollMode);
  }

  if (eyebrow) eyebrow.textContent = 'Primeiro turno';
  if (title) {
    title.textContent = isTollMode
      ? 'Sorteio do pedagio obrigatorio'
      : (isDestinationMode ? 'Sorteio do porto de destino' : 'Sorteio do porto de partida');
  }
  if (copy) {
    copy.textContent = isTollMode
      ? 'Embaralhe para sortear o pedagio.'
      : (isDestinationMode
          ? 'Embaralhe para sortear o porto de destino.'
          : 'Embaralhe para sortear o porto de partida.');
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

  const footer = getPortDrawFooter();
  const hasSelection = Boolean(state.portDraw.selectedCardCode);
  if (button) {
    button.disabled = state.portDraw.drawing || hasSelection;
    button.textContent = state.portDraw.drawing ? 'Embaralhando...' : 'Sortear';
    button.style.display = hasSelection ? 'none' : 'inline-flex';
  }
  if (footer) {
    footer.classList.toggle('is-hidden', hasSelection);
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
  const ownsOrigin = Boolean(player?.property_codes?.includes(resolvedOriginCode) && !isPropertyMortgaged(resolvedOriginCode));
  const hasOriginMonopoly = Boolean(ownsOrigin && originCard?.kind === 'port' && playerHasRegionMonopoly(player, originCard.continent));
  const lib = economyLib();
  const preview = lib?.computeContractPreview
    ? lib.computeContractPreview({
        distance,
        fee: Number(rate.fee || 0),
        multiplier: Number(rate.multiplier || 1),
        ownsOrigin,
        hasOriginMonopoly,
        rules: normalizedGameRules(),
      })
    : {
        base: distance * Number(rate.fee || 0),
        ownedBase: distance * Number(rate.fee || 0),
        total: distance * Number(rate.fee || 0),
        formula: `${distance} x ${Number(rate.fee || 0)} = ${distance * Number(rate.fee || 0)}`,
      };
  return {
    originCode: resolvedOriginCode,
    destinationCode: destinationCard.code,
    distance,
    fee: Number(rate.fee || 0),
    multiplier: Number(rate.multiplier || 1),
    ownsOrigin,
    hasOriginMonopoly,
    base: Number(preview.base || 0),
    ownedBase: Number(preview.ownedBase || preview.total || 0),
    total: Number(preview.total || 0),
    formula: preview.formula || `${distance} x ${Number(rate.fee || 0)} = ${Number(preview.total || 0)}`,
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
    contract.toll_passed = false;
    contract.toll_requirement_waived = false;
    contract.route_stage = 'to_toll';
    contract.completed = false;
    contract.deadline_label = `1 / ${contract.target_rounds}`;
    contract.deadline_progress = `1/${contract.target_rounds}`;
    contract.distance_label = `Distancia ${preview.distance}`;
    contract.cargo_label = player.active_permission_label || 'Sem carga';
    contract.freight_label = `Frete ${formatCurrency(preview.total)}`;
    contract.freight_value = preview.total;
    contract.base_freight_value = preview.ownedBase;
    contract.settlement_adjustment = 0;
    contract.settlement_value = preview.total;
    contract.distance_value = preview.distance;
    contract.origin_owned = preview.ownsOrigin;
    contract.origin_monopoly = preview.hasOriginMonopoly;
    const reasonParts = [];
    if (preview.ownsOrigin) reasonParts.push('porto de partida comprado');
    if (preview.hasOriginMonopoly) reasonParts.push('monopolio no porto de partida');
    contract.note = reasonParts.length
      ? `Contrato: ${preview.formula}. Aplicado ${reasonParts.join(' + ')}.`
      : `Contrato: ${preview.formula}. Sem bonus de propriedade no porto de partida.`;
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

function sameValueDestinationCandidatesForPlayer(player) {
  const contract = player?.active_contract;
  if (!player || !contract || contract.completed || !contract.origin || !contract.destination || contract.destination === '--') {
    return [];
  }

  const currentValue = Number(contract.base_freight_value || contract.freight_value || 0);
  return destinationCandidatesForOrigin(contract.origin)
    .filter((card) => card.code !== contract.destination)
    .map((card) => ({
      card,
      preview: calculateContractPreviewForPlayer(player, card, contract.origin),
    }))
    .filter((entry) => Number(entry.preview?.total || 0) === currentValue)
    .sort((left, right) => String(left.card.code || '').localeCompare(String(right.card.code || '')));
}

function applyReroutedDestinationForPlayer(player, card, preview = null) {
  const contract = ensurePlayerContractDraft(player);
  if (!player || !contract || !card) return null;

  const resolvedPreview = preview || calculateContractPreviewForPlayer(player, card, contract.origin);
  const destinationNodeId = getPropertyNode(card.code)?.id || '';
  contract.destination = card.code;
  contract.distance_label = `Distancia ${resolvedPreview.distance}`;
  contract.cargo_label = player.active_permission_label || 'Sem carga';
  contract.freight_label = `Frete ${formatCurrency(resolvedPreview.total)}`;
  contract.freight_value = resolvedPreview.total;
  contract.base_freight_value = resolvedPreview.ownedBase;
  contract.settlement_value = resolvedPreview.total;
  contract.distance_value = resolvedPreview.distance;
  contract.origin_owned = resolvedPreview.ownsOrigin;
  contract.origin_monopoly = resolvedPreview.hasOriginMonopoly;
  contract.route_stage = destinationNodeId && player.board_node_id === destinationNodeId && contract.toll_passed
    ? 'arrived'
    : (contract.toll_passed ? 'to_destination' : 'to_toll');
  contract.note = `Rota alterada para ${card.code}, mantendo frete de ${formatCurrency(resolvedPreview.total)}.`;
  syncDerivedState();
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return resolvedPreview;
}

function canUseShortcutIgnoreTollCoupon(player) {
  const contract = player?.active_contract;
  return Boolean(
    player
    && contract
    && !contract.completed
    && contractNeedsMandatoryToll(contract)
    && !contract.toll_passed
    && contract.destination
    && contract.destination !== '--'
  );
}

async function maybeUseShortcutIgnoreTollCoupon(player) {
  if (!canUseShortcutIgnoreTollCoupon(player)) return null;
  const contract = ensurePlayerContractDraft(player);
  const spent = await maybeSpendCoupon(player, 'shortcut_ignore_toll', {
    title: 'Atalho',
    copy: `Usar Atalho para dispensar a passagem obrigatoria por ${contract.mandatory_toll} neste contrato?`,
    primaryLabel: 'Usar Atalho',
    secondaryLabel: 'Manter rota',
    detail: `Dispensou a passagem obrigatoria por ${contract.mandatory_toll}.`,
    statusLabel: 'atalho ativado',
  });
  if (!spent) return null;

  contract.toll_requirement_waived = true;
  contract.toll_passed = true;
  contract.route_stage = playerReachedDestination(player) ? 'arrived' : 'to_destination';
  contract.note = `Atalho ativado: ${contract.mandatory_toll} deixou de ser obrigatorio neste contrato.`;
  syncDerivedState();
  renderHud();
  renderNodeOverlay();
  renderShipOverlay();
  return {
    coupon: spent.coupon,
    note: `${playerActionName(player)} ativou Atalho e segue direto para ${contract.destination}.`,
  };
}

async function maybeUseRerouteCoupon(player) {
  const contract = player?.active_contract;
  const coupon = firstCouponOfKind(player, 'reroute_same_value');
  const candidates = sameValueDestinationCandidatesForPlayer(player);
  if (!player || !contract || contract.completed || !coupon || !candidates.length) return null;

  let selected = null;
  if (player.is_human) {
    for (const entry of candidates) {
      const choice = await openDecisionModal({
        title: 'Mudanca de Rota',
        copy: `Trocar o destino ${contract.destination} por ${entry.card.code}, mantendo o frete em ${formatCurrency(entry.preview.total)}?`,
        primaryLabel: `Trocar para ${entry.card.code}`,
        secondaryLabel: 'Proxima opcao',
        cardCode: entry.card.code,
      });
      if (choice === 'primary') {
        selected = entry;
        break;
      }
    }
  } else {
    [selected] = candidates;
  }

  if (!selected) return null;

  const previousDestination = contract.destination;
  applyReroutedDestinationForPlayer(player, selected.card, selected.preview);
  consumeCouponForPlayer(player, coupon, {
    detail: `Destino alterado de ${previousDestination} para ${selected.card.code}, mantendo frete de ${formatCurrency(selected.preview.total)}.`,
    statusLabel: `rota para ${selected.card.code}`,
  });
  return {
    coupon,
    destination: selected.card.code,
    note: `${playerActionName(player)} mudou a rota do contrato para ${selected.card.code}.`,
  };
}

async function maybeUseTurnStartCoupons(player) {
  if (!player?.active_contract || player.active_contract.completed) return false;
  let usedAny = false;
  if (await maybeUseShortcutIgnoreTollCoupon(player)) {
    usedAny = true;
  }
  if (await maybeUseRerouteCoupon(player)) {
    usedAny = true;
  }
  return usedAny;
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
  contract.toll_passed = false;
  contract.toll_requirement_waived = false;
  contract.route_stage = 'to_toll';
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

async function maybeHandleCurrentPortAfterDelivery(player) {
  if (!player || player.bankrupt) return false;
  const card = getPropertyCard(player.location_code || '');
  if (!card || card.kind !== 'port') return false;
  const owner = ownerPlayerOf(card.code);
  const negotiationPrice = Math.round(card.price * 1.5);

  if (owner && owner.id !== player.id && isPropertyMortgaged(card.code)) {
    pushActionLog(player, 'Titulo hipotecado', `${card.code} esta hipotecado e nao pode ser negociado agora.`);
    renderHud();
    return false;
  }

  if (player.is_human) {
    if (!owner) {
      if (player.cash < card.price) return false;
      const choice = await openDecisionModal({
        title: `${card.code} chegou ao destino`,
        copy: `Deseja comprar o porto ${card.code} por ${formatCurrency(card.price)} antes de abrir o novo contrato?`,
        primaryLabel: `Comprar ${formatCurrency(card.price)}`,
        secondaryLabel: 'Nao comprar',
        cardCode: card.code,
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
      cardCode: card.code,
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

  if (!owner) {
    if (cpuShouldBuyOrigin(player, card) && buyProperty(player, card.code)) {
      pushActionLog(player, 'Porto comprado no destino', `${card.code} por ${formatCurrency(card.price)}.`);
      renderHud();
      return true;
    }
    return false;
  }

  if (owner.id !== player.id && player.cash >= negotiationPrice && transferProperty(owner, player, card.code, negotiationPrice)) {
    pushActionLog(player, 'Negociacao aceita', `${card.code} por ${formatCurrency(negotiationPrice)}.`);
    pushActionLog(owner, 'Vendeu porto', `${card.code} por ${formatCurrency(negotiationPrice)} para ${player.name}.`);
    renderHud();
    return true;
  }
  return false;
}

async function maybeHandleExtraPermissionAfterDelivery(player) {
  if (!player) return false;
  const extraCost = Number(state.rules.extra_permission_cost || 2000);
  if (player.cash < extraCost) return false;

  const availablePermissionCards = availablePermissionCardsForPlayer(player, { excludeOwned: true });
  if (!availablePermissionCards.length) {
    player.status_label = 'ja possui todas as permissoes';
    pushActionLog(player, 'Sem nova permissao', 'Ja possui todos os tipos de carga disponiveis.');
    renderHud();
    return false;
  }

  if (player.is_human) {
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
      cards: availablePermissionCards,
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

  if ((player.purchase_policy || 'always') === 'never') return false;
  updatePlayerCash(player, -extraCost);
  const permissionCard = randomChoice(availablePermissionCards);
  if (permissionCard) {
    applyPermissionSelectionForPlayer(player, permissionCard, {
      append: true,
      setActive: true,
      updateSession: false,
      note: `${player.name} comprou uma nova permissao e sorteou ${permissionCard.title}.`,
    });
    pushActionLog(player, 'Nova permissao comprada', `${formatCurrency(extraCost)} investidos em ${permissionCard.title}.`);
    renderHud();
    return true;
  }
  return false;
}

async function runPostContractForPlayer(player, {
  phaseLabel = 'Novo turno',
  advanceGlobalTurn = false,
  autoRollAfterSetup = false,
} = {}) {
  if (!player?.needs_new_contract) return null;
  if (player.is_human && state.flow.followupSetupRunning) return null;

  if (player.is_human) {
    state.flow.followupSetupRunning = true;
  }

  try {
    player.needs_new_contract = false;
    if (advanceGlobalTurn) {
      const nextTurn = Number(state.session?.turn_number || 1) + 1;
      setSession({
        turn_number: nextTurn,
        turn_label: `Turno ${String(nextTurn).padStart(2, '0')}`,
        phase: phaseLabel,
        active_player_id: player.id,
        action_label: 'Preparar novo contrato',
        note: player.is_human
          ? 'Agora voce decide a compra do porto atual, a compra de nova permissao e a abertura do novo contrato.'
          : `${player.name} esta preparando o novo contrato.`,
      });
    } else {
      setSession({
        active_player_id: player.id,
        phase: phaseLabel,
        action_label: player.is_human ? 'Preparar novo contrato' : `${player.name}: novo contrato`,
        note: player.is_human
          ? 'Agora voce decide a compra do porto atual, a compra de nova permissao e a abertura do novo contrato.'
          : `${player.name} esta preparando o novo contrato.`,
      });
    }

    await delay(preparationDelayFor(player, false));
    await maybeHandleCurrentPortAfterDelivery(player);
    await delay(preparationDelayFor(player, false));
    await maybeHandleExtraPermissionAfterDelivery(player);
    await delay(preparationDelayFor(player, false));

    const contract = await runContractOpeningForPlayer(player, {
      phaseLabel,
      needsPermission: false,
      originMode: 'current',
    });
    if (!contract) return null;

    player.status_label = 'novo contrato pronto';
    renderHud();

    if (autoRollAfterSetup) {
      await runTurnExecutionForPlayer(player, {
        phaseLabel,
        humanActionLabel: 'Rolar 2 dados',
        humanNote: 'O novo contrato foi preparado. Agora voce pode rolar os dados do proximo turno.',
      });
    }

    return contract;
  } finally {
    if (player.is_human) {
      state.flow.followupSetupRunning = false;
    }
  }
}

async function prepareCpuNextContractAfterDelivery(player) {
  return runPostContractForPlayer(player, {
    phaseLabel: `${player.name}: novo turno`,
    advanceGlobalTurn: false,
    autoRollAfterSetup: false,
  });
}

async function runHumanPostDeliveryTurn() {
  const player = humanPlayer();
  return runPostContractForPlayer(player, {
    phaseLabel: 'Novo turno',
    advanceGlobalTurn: true,
    autoRollAfterSetup: true,
  });
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
  setPortDrawResult('');
  renderPortDraw();

  if (!card) {
    closePortDraw(null);
    return;
  }

  configurePortDrawExtra({
    copy: `Comprar ${card.code} por ${card.price}?`,
    layout: 'inline',
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
  setPortDrawResult('');
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
  setPortDrawResult('');
  renderPortDraw();

  if (!card) {
    closePortDraw(null);
    return;
  }

  const preview = calculateHumanContractPreview(card);
  const cargoIcon = cargoIconMarkup(humanPlayer()?.active_permission_id || '', 'port-draw-contract-cargo-icon');
  const detailParts = [`Distancia: ${preview.distance}`, `Estadia: ${preview.fee}`];
  if (preview.ownsOrigin) detailParts.push(`Multiplicador: ${preview.multiplier}`);
  const detailLine = `${cargoIcon}${detailParts.join(' | ')} &rarr; ${preview.formula}`;
  configurePortDrawExtra({
    copyHtml: `<div class="port-draw-contract-preview"><span class="port-draw-contract-legend">${detailLine}</span></div>`,
    primaryLabel: 'Confirmar contrato',
    layout: 'inline',
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
  setPortDrawResult('Embaralhando...');
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
  setPortDrawResult('Pressione Enter ou clique para embaralhar.');
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
  setPortDrawResult('Pressione Enter ou clique para embaralhar.');
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
  setPortDrawResult('Pressione Enter ou clique para embaralhar.');
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

function triggerEnterOnOverlay() {
  if (!hasCentralOverlayOpen()) return false;
  if (!getSettingsOverlay()?.classList.contains('is-hidden')) {
    const button = byId('settings-close-button');
    if (button && !button.disabled) { button.click(); return true; }
  }
  if (!getReportOverlay()?.classList.contains('is-hidden')) {
    const button = byId('report-close-button');
    if (button && !button.disabled) { button.click(); return true; }
  }
  if (!getPermissionDrawOverlay()?.classList.contains('is-hidden')) {
    const button = getPermissionDrawButton();
    if (button && !button.disabled) { button.click(); return true; }
  }
  if (!getPortDrawOverlay()?.classList.contains('is-hidden')) {
    const extra = getPortDrawExtra();
    const primary = getPortDrawExtraPrimary();
    if (extra && !extra.classList.contains('is-hidden') && primary && !primary.disabled) {
      primary.click();
      return true;
    }
    const button = getPortDrawButton();
    if (button && !button.disabled) { button.click(); return true; }
  }
  if (!getMovementDiceOverlay()?.classList.contains('is-hidden')) {
    const button = getMovementDiceButton();
    if (button && !button.disabled) { button.click(); return true; }
  }
  if (!getChanceDrawOverlay()?.classList.contains('is-hidden')) {
    const button = getChanceDrawButton();
    if (button && !button.disabled && !state.chanceDraw.revealOnly) { button.click(); return true; }
  }
  if (!getDecisionOverlay()?.classList.contains('is-hidden')) {
    const button = getDecisionPrimary();
    if (button && !button.disabled) { button.click(); return true; }
  }
  return false;
}

function renderMovementDice() {
  const stage = getMovementDiceStage();
  const button = getMovementDiceButton();
  if (!stage) return;

  const total = state.movementDice.values[0] + state.movementDice.values[1];
  const isDouble = state.movementDice.values[0] === state.movementDice.values[1];
  const highlightDouble = Boolean(state.movementDice.rolled && !state.movementDice.rolling && isDouble);
  const rollingClass = state.movementDice.rolling ? ' is-rolling' : '';
  const doubleClass = highlightDouble ? ' is-double' : '';
  const note = state.movementDice.rolling
    ? 'Rolando...'
    : (highlightDouble ? 'Dupla: jogada extra.' : 'Sem dupla.');

  stage.innerHTML = `
    <div class="movement-dice-pair${doubleClass}">
      <article class="movement-die${rollingClass}${doubleClass}">
        <span class="movement-die-value">${state.movementDice.values[0]}</span>
      </article>
      <article class="movement-die${rollingClass}${doubleClass}">
        <span class="movement-die-value">${state.movementDice.values[1]}</span>
      </article>
    </div>
    <div class="movement-dice-summary${doubleClass}">
      <strong class="movement-dice-total">Total ${total}</strong>
      <span class="movement-dice-note">${note}</span>
    </div>
  `;

  if (button) {
    button.disabled = state.movementDice.rolling;
    button.textContent = state.movementDice.rolling ? 'Rolando...' : 'Rolar Dados';
    button.style.display = state.movementDice.rolled ? 'none' : 'inline-flex';
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

function syncContractRouteProgress(player, traveledNodeIds = []) {
  const contract = player?.active_contract;
  if (!player || !contract || contract.completed) return contract;

  const tollNodeId = contractNeedsMandatoryToll(contract)
    ? getPropertyNode(contract.mandatory_toll)?.id
    : '';
  const destinationNodeId = getPropertyNode(contract.destination)?.id;
  const currentNodeId = player.board_node_id || null;

  if (!tollNodeId) {
    contract.toll_passed = true;
  } else if (contract.toll_passed || currentNodeId === tollNodeId || traveledNodeIds.includes(tollNodeId)) {
    contract.toll_passed = true;
  } else {
    contract.toll_passed = false;
  }

  if (destinationNodeId && currentNodeId === destinationNodeId && contract.toll_passed) {
    contract.route_stage = 'arrived';
  } else {
    contract.route_stage = contract.toll_passed ? 'to_destination' : 'to_toll';
  }
  return contract;
}

function mergeRoutePaths(...segments) {
  return segments.reduce((route, segment) => {
    if (!Array.isArray(segment) || !segment.length) return route;
    if (!route.length) return segment.slice();
    const startIndex = route[route.length - 1] === segment[0] ? 1 : 0;
    return [...route, ...segment.slice(startIndex)];
  }, []);
}

function buildContractRouteContext(player) {
  const contract = player?.active_contract;
  if (!player || !contract) {
    return {
      originNodeId: '',
      tollNodeId: '',
      destinationNodeId: '',
      fullPath: [],
      forwardPath: [],
      currentIndex: -1,
      tollIndex: -1,
      segment: 'direct',
    };
  }

  const originNodeId = getPropertyNode(contract.origin)?.id || '';
  const tollNodeId = contractNeedsMandatoryToll(contract)
    ? (getPropertyNode(contract.mandatory_toll)?.id || '')
    : '';
  const destinationNodeId = getPropertyNode(contract.destination)?.id || '';
  const currentNodeId = player.board_node_id || originNodeId;
  if (!originNodeId || !destinationNodeId || !currentNodeId) {
    return {
      originNodeId,
      tollNodeId,
      destinationNodeId,
      fullPath: [],
      forwardPath: [],
      currentIndex: -1,
      tollIndex: -1,
      segment: 'direct',
    };
  }

  let fullPath = [];
  let forwardPath = [];
  let currentIndex = -1;
  let tollIndex = -1;

  if (tollNodeId) {
    const originToToll = shortestPath(originNodeId, tollNodeId);
    if (contract.toll_passed) {
      const tollToCurrent = shortestPath(tollNodeId, currentNodeId);
      const currentToDestination = shortestPath(currentNodeId, destinationNodeId);
      const prefixToCurrent = mergeRoutePaths(originToToll, tollToCurrent);
      fullPath = mergeRoutePaths(prefixToCurrent, currentToDestination);
      forwardPath = currentToDestination;
      currentIndex = prefixToCurrent.length ? prefixToCurrent.length - 1 : -1;
      tollIndex = originToToll.length ? originToToll.length - 1 : -1;
    } else {
      const originToCurrent = shortestPath(originNodeId, currentNodeId);
      const currentToToll = shortestPath(currentNodeId, tollNodeId);
      const tollToDestination = shortestPath(tollNodeId, destinationNodeId);
      const prefixToToll = mergeRoutePaths(originToCurrent, currentToToll);
      fullPath = mergeRoutePaths(prefixToToll, tollToDestination);
      forwardPath = mergeRoutePaths(currentToToll, tollToDestination);
      currentIndex = originToCurrent.length ? originToCurrent.length - 1 : -1;
      tollIndex = prefixToToll.length ? prefixToToll.length - 1 : -1;
    }
  } else {
    const originToCurrent = shortestPath(originNodeId, currentNodeId);
    const currentToDestination = shortestPath(currentNodeId, destinationNodeId);
    fullPath = mergeRoutePaths(originToCurrent, currentToDestination);
    forwardPath = currentToDestination;
    currentIndex = originToCurrent.length ? originToCurrent.length - 1 : -1;
  }

  if (!fullPath.length && forwardPath.length) {
    fullPath = forwardPath.slice();
  }
  if (!forwardPath.length && currentNodeId) {
    forwardPath = [currentNodeId];
  }
  if (currentIndex < 0 && currentNodeId && fullPath.length) {
    currentIndex = fullPath.indexOf(currentNodeId);
  }

  return {
    originNodeId,
    tollNodeId,
    destinationNodeId,
    fullPath,
    forwardPath,
    currentIndex,
    tollIndex,
    segment: tollNodeId && !contract.toll_passed ? 'pp_to_pe' : (tollNodeId ? 'pe_to_pd' : 'direct'),
  };
}

function buildMovementPathForPlayer(player) {
  return buildContractRouteContext(player).forwardPath;
}

function advanceContractRoundForPlayer(player) {
  const contract = player?.active_contract;
  if (!player || !contract || contract.completed) return contract;
  const targetRounds = Number(contract.target_rounds || state.rules.target_rounds || 4);
  const roundsElapsed = Math.max(1, Number(contract.rounds_elapsed || 1)) + 1;
  contract.rounds_elapsed = roundsElapsed;
  contract.target_rounds = targetRounds;
  contract.deadline_label = `${roundsElapsed} / ${targetRounds}`;
  contract.deadline_progress = `${roundsElapsed}/${targetRounds}`;
  return contract;
}

function resolveContractSettlement(player, contract, { freightMultiplier = 1, waiveOriginShare = false } = {}) {
  return contractSettlementBreakdown(player, contract, { freightMultiplier, waiveOriginShare });
}

async function resolveSettlementCouponModifiersForPlayer(player, contract) {
  const modifiers = { freightMultiplier: 1, waiveOriginShare: false };
  if (!player || !contract) return modifiers;

  const usedDoubleFreight = await maybeSpendCoupon(player, 'double_freight', {
    title: 'Lucro Extra',
    copy: `Usar Lucro Extra para dobrar o frete deste contrato na chegada a ${contract.destination}?`,
    primaryLabel: 'Usar Lucro Extra',
    secondaryLabel: 'Receber normal',
    detail: `Dobrou o frete na liquidacao do contrato para ${contract.destination}.`,
    statusLabel: 'lucro extra ativado',
  });
  if (usedDoubleFreight) {
    modifiers.freightMultiplier = 2;
  }

  const originOwner = ownerPlayerOf(contract.origin || '');
  if (originOwner && originOwner.id !== player.id && !originOwner.bankrupt && !isPropertyMortgaged(contract.origin || '')) {
    const usedSkipOwnerShare = await maybeSpendCoupon(player, 'skip_owner_share', {
      title: 'Quebra de Contrato',
      copy: `Usar Quebra de Contrato para impedir a comissao de ${originOwner.name} sobre o frete deste contrato?`,
      primaryLabel: 'Usar Quebra de Contrato',
      secondaryLabel: 'Pagar comissao',
      cardCode: contract.origin,
      detail: `Bloqueou a comissao de ${originOwner.name} sobre o frete deste contrato.`,
      statusLabel: 'comissao bloqueada',
    });
    if (usedSkipOwnerShare) {
      modifiers.waiveOriginShare = true;
    }
  }

  return modifiers;
}

async function completeContractForPlayer(player) {
  const contract = player?.active_contract;
  if (!player || !contract || contract.completed) {
    return null;
  }

  const modifiers = await resolveSettlementCouponModifiersForPlayer(player, contract);
  const settlement = resolveContractSettlement(player, contract, modifiers);
  updatePlayerCash(player, settlement.total);
  if (settlement.originCommission > 0 && settlement.originOwner) {
    updatePlayerCash(settlement.originOwner, settlement.originCommission);
    pushActionLog(
      settlement.originOwner,
      'Recebeu comissao do porto inicial',
      `${contract.origin}: ${formatCurrency(settlement.originCommission)} de ${player.name}.`,
    );
  }
  if (settlement.tollShare > 0 && settlement.tollOwner) {
    updatePlayerCash(settlement.tollOwner, settlement.tollShare);
    pushActionLog(
      settlement.tollOwner,
      'Recebeu comissao do pedagio',
      `${contract.mandatory_toll}: ${formatCurrency(settlement.tollShare)} de ${player.name}.`,
    );
  }

  contract.completed = true;
  contract.toll_passed = true;
  contract.route_stage = 'arrived';
  player.needs_new_contract = true;
  contract.settlement_adjustment = settlement.adjustment;
  contract.settlement_value = settlement.total;
  contract.freight_value = settlement.total;
  contract.deadline_label = `${settlement.roundsElapsed} / ${settlement.targetRounds}`;
  contract.deadline_progress = `${settlement.roundsElapsed}/${settlement.targetRounds}`;

  const detailParts = [];
  if (settlement.monopolyMultiplier > 1) {
    detailParts.push('monopolio do porto de partida x2');
  }
  if (settlement.freightMultiplier > 1) {
    detailParts.push(`cupom de frete x${settlement.freightMultiplier}`);
  }
  if (settlement.adjustment > 0) {
    detailParts.push(`bonus ${formatCurrency(settlement.adjustment)}`);
  } else if (settlement.adjustment < 0) {
    detailParts.push(`onus ${formatCurrency(Math.abs(settlement.adjustment))}`);
  }
  if (settlement.originCommission > 0 && settlement.originOwner) {
    detailParts.push(`comissao do porto inicial ${formatCurrency(settlement.originCommission)} para ${settlement.originOwner.name}`);
  } else if (settlement.waiveOriginShare && settlement.originOwner) {
    detailParts.push(`comissao do porto inicial de ${settlement.originOwner.name} bloqueada`);
  }
  if (settlement.tollShare > 0 && settlement.tollOwner) {
    detailParts.push(`comissao do pedagio ${formatCurrency(settlement.tollShare)} para ${settlement.tollOwner.name}`);
  }
  const detailLine = detailParts.length
    ? `${formatCurrency(settlement.total)} liquidos (${detailParts.join(' | ')}).`
    : `${formatCurrency(settlement.total)} sem ajuste adicional.`;

  contract.note = `${playerActionName(player)} concluiu o contrato e recebeu ${formatCurrency(settlement.total)} liquidos.`;
  player.status_label = `recebeu ${formatCurrency(settlement.total)}`;
  pushActionLog(player, 'Contrato concluido', detailLine);
  renderHud();
  return settlement;
}

function buildHumanMovementPath() {
  return buildMovementPathForPlayer(humanPlayer());
}

function isDoubleRoll(values) {
  return Array.isArray(values) && values.length === 2 && values[0] === values[1];
}

function playerReachedDestination(player) {
  const contract = player?.active_contract;
  const destinationNodeId = getPropertyNode(contract?.destination)?.id;
  return Boolean(destinationNodeId && player?.board_node_id === destinationNodeId);
}

function canTakeExtraRollFromDouble(player, diceResult) {
  if (!player || !diceResult?.isDouble) return false;
  if (!player.active_contract) return false;
  if (playerReachedDestination(player)) return false;
  if (player.active_contract.completed || player.needs_new_contract) return false;
  return true;
}

function doubleRollPrompt(player, diceResult) {
  const [left, right] = diceResult?.values || [0, 0];
  if (player?.is_human) {
    return {
      actionLabel: 'Dados duplos: nova rolagem',
      note: `Voce tirou dupla ${left} + ${right}. Pode rolar novamente.`,
    };
  }
  return {
    actionLabel: `${player?.name || 'Jogador'}: dupla ${left} + ${right}`,
    note: `${player?.name || 'Jogador'} tirou dupla ${left} + ${right} e vai jogar novamente.`,
  };
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
        note: 'Nao foi possivel calcular a rota do contrato.',
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
      note: contract.toll_passed
        ? `O navio vai percorrer ${maxMoves} casas no menor caminho ate ${contract.destination}.`
        : `O navio vai percorrer ${maxMoves} casas no menor caminho ate ${contract.destination}, passando por ${contract.mandatory_toll}.`,
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
  const passedTollThisMove = tollNodeId ? traveled.includes(tollNodeId) : false;
  syncContractRouteProgress(player, traveled);
  const passedToll = Boolean(contract.toll_passed);
  const reachedDestination = Boolean(destinationNodeId && player.board_node_id === destinationNodeId);
  const destinationBeforeToll = reachedDestination && !passedToll;
  const contractCompletion = reachedDestination && passedToll
    ? await completeContractForPlayer(player)
    : null;
  const fuelOutcome = finalNode?.kind === 'fuel' ? await resolveFuelStopForPlayer(player, finalNode) : null;
  const chanceOutcome = finalNode?.kind === 'chance'
    ? await resolveChanceStopForPlayer(player, { stepDelay })
    : null;
  const portOutcome = finalNode?.kind === 'port' && (!reachedDestination || destinationBeforeToll)
    ? await resolvePortStopForPlayer(player, finalNode, { stepDelay })
    : null;
  const tollOutcome = finalNode?.kind === 'toll'
    ? await resolveTollStopForPlayer(player, finalNode, { stepDelay })
    : null;
  const propertyOutcome = portOutcome || tollOutcome;

  let note = `O navio terminou a jogada em ${player.location_label}.`;
  if (reachedDestination && passedToll) {
    if (contractCompletion?.adjustment > 0) {
      note = `O navio chegou em ${contract.destination} ${contractArrivalText(contract)} e recebeu ${formatCurrency(contractCompletion.total)} (${formatCurrency(contractCompletion.adjustedBase || contractCompletion.base)} + bonus ${formatCurrency(contractCompletion.adjustment)}).`;
    } else if (contractCompletion?.adjustment < 0) {
      note = `O navio chegou em ${contract.destination} ${contractArrivalText(contract)} e recebeu ${formatCurrency(contractCompletion.total)} (${formatCurrency(contractCompletion.adjustedBase || contractCompletion.base)} - onus ${formatCurrency(Math.abs(contractCompletion.adjustment))}).`;
    } else {
      note = `O navio chegou em ${contract.destination} ${contractArrivalText(contract)} e recebeu ${formatCurrency(contractCompletion?.total || 0)}.`;
    }
  } else if (propertyOutcome) {
    note = `${propertyOutcome.note}${destinationBeforeTollSuffix(contract, reachedDestination, passedToll)}`.trim();
  } else if (chanceOutcome) {
    note = chanceOutcome.note;
  } else if (fuelOutcome) {
    note = fuelOutcome.note;
  } else if (!passedToll) {
    note = `O navio avancou ${maxMoves} casas e segue rumo ao pedagio ${contract.mandatory_toll}.`;
  } else if (passedTollThisMove && !reachedDestination) {
    note = `O navio passou por ${contract.mandatory_toll} e agora segue rumo ao destino ${contract.destination}.`;
  } else if (!reachedDestination) {
    note = `O navio avancou ${maxMoves} casas e segue rumo ao destino ${contract.destination}.`;
  }

  contract.note = note;
  player.status_label = reachedDestination && passedToll
    ? `recebeu ${formatCurrency(contractCompletion?.total || 0)}`
    : (propertyOutcome?.statusLabel || chanceOutcome?.statusLabel || fuelOutcome?.statusLabel || player.location_label);
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

async function runTurnExecutionForPlayer(player, {
  phaseLabel = 'Turno',
  humanActionLabel = 'Rolar 2 dados',
  humanNote = 'Agora o usuario deve jogar os dois dados de movimentacao.',
  cpuActionLabel = null,
  cpuNote = null,
  humanStepDelay = 360,
  cpuStepDelay = currentCpuMoveDelay(),
} = {}) {
  if (!player?.active_contract) return null;

  await maybeUseTurnStartCoupons(player);

  if (player.is_human) {
    let diceResult = null;
    let rerollIndex = 0;

    while (player?.active_contract) {
      const prompt = rerollIndex > 0
        ? doubleRollPrompt(player, diceResult)
        : { actionLabel: humanActionLabel, note: humanNote };

      setSession({
        active_player_id: player.id,
        action_label: prompt.actionLabel,
        note: prompt.note,
      });

      diceResult = await openHumanMovementDice({
        promptText: rerollIndex > 0
          ? 'Saiu dupla. Pressione Enter ou clique para rolar novamente.'
          : 'Pressione Enter ou clique para rolar.',
      });
      if (!diceResult?.total) return diceResult;

      player.last_roll = [...diceResult.values];
      await animatePlayerMovement(player, diceResult.total, {
        stepDelay: humanStepDelay,
        diceValues: [...diceResult.values],
        updateSession: true,
      });

      if (!canTakeExtraRollFromDouble(player, diceResult)) {
        return diceResult;
      }

      pushActionLog(player, 'Dados duplos', `Rolou ${diceResult.values[0]} + ${diceResult.values[1]} e ganhou uma nova rolagem.`);
      renderHud();
      rerollIndex += 1;
    }

    return diceResult;
  }

  let diceResult = null;
  let rerollIndex = 0;

  while (player?.active_contract) {
    const dice = [randomDie(), randomDie()];
    diceResult = { values: [...dice], total: dice[0] + dice[1], isDouble: isDoubleRoll(dice) };
    player.last_roll = [...dice];

    const prompt = rerollIndex > 0
      ? {
        actionLabel: `${player.name}: jogada extra ${dice[0]} + ${dice[1]}`,
        note: `${player.name} ganhou uma nova rolagem por dupla e agora move com ${dice[0]} + ${dice[1]}.`,
      }
      : {
        actionLabel: cpuActionLabel || `${player.name}: ${dice[0]} + ${dice[1]}`,
        note: cpuNote || `${player.name} rolou ${dice[0]} + ${dice[1]} e iniciou o movimento.`,
      };

    setSession({
      active_player_id: player.id,
      phase: phaseLabel,
      action_label: prompt.actionLabel,
      dice: [...dice],
      note: prompt.note,
    });
    renderHud();
    await delay(currentCpuRevealDelay());
    await animatePlayerMovement(player, diceResult.total, {
      stepDelay: cpuStepDelay,
      diceValues: [...dice],
      updateSession: true,
    });

    if (!canTakeExtraRollFromDouble(player, diceResult)) {
      await delay(currentCpuStepDelay());
      return diceResult;
    }

    pushActionLog(player, 'Dados duplos', `${player.name} rolou ${dice[0]} + ${dice[1]} e vai jogar novamente.`);
    renderHud();
    rerollIndex += 1;
    await delay(currentCpuStepDelay());
  }

  return diceResult;
}

function startMovementDiceRoll() {
  if (state.movementDice.rolling) return;

  state.movementDice.rolling = true;
  state.movementDice.rolled = false;
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
    state.movementDice.rolled = true;
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

function openHumanMovementDice({ promptText = 'Pressione Enter ou clique para rolar.' } = {}) {
  state.movementDice.rolling = false;
  state.movementDice.rolled = false;
  state.movementDice.values = [randomDie(), randomDie()];
  state.movementDice.finalValues = [1, 1];
  setMovementDiceActive('Aguardando rolagem');
  setMovementDiceResult(promptText);
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

function getDecisionCardStage() {
  return byId('decision-card-stage');
}

function getPortDrawFooter() {
  return getPortDrawOverlay()?.querySelector('.port-draw-footer') || null;
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

function openDecisionModal({ title, copy, primaryLabel = 'Continuar', secondaryLabel = 'Cancelar', hideSecondary = false, cardCode = '' } = {}) {
  const titleNode = getDecisionTitle();
  const copyNode = getDecisionCopy();
  const cardStage = getDecisionCardStage();
  const primary = getDecisionPrimary();
  const secondary = getDecisionSecondary();
  if (titleNode) titleNode.textContent = title || 'Confirmar acao';
  if (copyNode) copyNode.textContent = copy || '';
  if (cardStage) {
    const card = cardCode ? getPropertyCard(cardCode) : null;
    cardStage.innerHTML = card ? propertyInspectorMarkup(card) : '';
    cardStage.classList.toggle('is-hidden', !card);
  }
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

function clearChanceDrawTimers() {
  if (state.chanceDraw.rafId) {
    window.cancelAnimationFrame(state.chanceDraw.rafId);
    state.chanceDraw.rafId = 0;
  }
  if (state.chanceDraw.closeTimerId) {
    window.clearTimeout(state.chanceDraw.closeTimerId);
    state.chanceDraw.closeTimerId = 0;
  }
}

function chanceCardById(cardId) {
  return state.chanceCards.find((card) => card.id === cardId) || null;
}

function ensureChanceDeck() {
  state.chanceDeck = state.chanceDeck || { draw_pile: [], discard_pile: [], held_card_ids: [] };
  state.chanceDeck.draw_pile = Array.isArray(state.chanceDeck.draw_pile) ? state.chanceDeck.draw_pile : [];
  state.chanceDeck.discard_pile = Array.isArray(state.chanceDeck.discard_pile) ? state.chanceDeck.discard_pile : [];
  state.chanceDeck.held_card_ids = Array.isArray(state.chanceDeck.held_card_ids) ? state.chanceDeck.held_card_ids : [];
  return state.chanceDeck;
}

function heldChanceCardIds() {
  return new Set(ensureChanceDeck().held_card_ids || []);
}

function chanceDrawPoolIds() {
  const deck = ensureChanceDeck();
  if (deck.draw_pile.length) return deck.draw_pile.slice();
  const held = heldChanceCardIds();
  return state.chanceCards
    .map((card) => card.id)
    .filter((cardId) => !held.has(cardId));
}

function reshuffleChanceDiscardIntoDraw() {
  const deck = ensureChanceDeck();
  if (deck.draw_pile.length) return deck.draw_pile.slice();
  const held = heldChanceCardIds();
  const freshDraw = (deck.discard_pile || []).filter((cardId) => !held.has(cardId));
  deck.discard_pile = [];
  deck.draw_pile = shuffleArray(freshDraw);
  return deck.draw_pile.slice();
}

function drawChanceCardFromDeck() {
  const deck = ensureChanceDeck();
  if (!deck.draw_pile.length) {
    reshuffleChanceDiscardIntoDraw();
  }
  if (!deck.draw_pile.length) return null;
  const cardId = deck.draw_pile.shift();
  return chanceCardById(cardId);
}

function discardChanceCardToDeck(cardId) {
  const deck = ensureChanceDeck();
  if (!cardId) return;
  if (deck.held_card_ids.includes(cardId)) return;
  if (!deck.discard_pile.includes(cardId)) {
    deck.discard_pile.push(cardId);
  }
}

function holdChanceCardInDeck(cardId) {
  const deck = ensureChanceDeck();
  if (!cardId) return;
  if (!deck.held_card_ids.includes(cardId)) {
    deck.held_card_ids.push(cardId);
  }
  deck.discard_pile = deck.discard_pile.filter((item) => item !== cardId);
  deck.draw_pile = deck.draw_pile.filter((item) => item !== cardId);
}

function releaseHeldChanceCardToDiscard(cardId) {
  const deck = ensureChanceDeck();
  if (!cardId) return;
  deck.held_card_ids = deck.held_card_ids.filter((item) => item !== cardId);
  discardChanceCardToDeck(cardId);
}

function chanceVisibleCards() {
  if (state.chanceDraw.revealOnly && state.chanceDraw.selectedCardId) {
    const selected = chanceCardById(state.chanceDraw.selectedCardId);
    return selected ? [selected] : [];
  }

  if (state.chanceDraw.selectedCardId) {
    const selected = chanceCardById(state.chanceDraw.selectedCardId);
    const rest = state.chanceDraw.order
      .filter((id) => id !== state.chanceDraw.selectedCardId)
      .slice(0, 10)
      .map((id) => chanceCardById(id))
      .filter(Boolean);
    return selected ? [selected, ...rest] : rest;
  }

  return state.chanceDraw.order
    .slice(0, 12)
    .map((id) => chanceCardById(id))
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
  const modal = getChanceDrawOverlay()?.querySelector('.chance-draw-modal') || null;
  if (!stage) return;

  if (modal) {
    modal.classList.toggle('is-reveal-only', Boolean(state.chanceDraw.revealOnly));
  }

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
    button.disabled = state.chanceDraw.drawing || state.chanceDraw.revealOnly || Boolean(state.chanceDraw.selectedCardId);
    button.textContent = state.chanceDraw.drawing ? 'Embaralhando...' : 'Sortear';
    button.style.display = (state.chanceDraw.revealOnly || Boolean(state.chanceDraw.selectedCardId)) ? 'none' : 'inline-flex';
  }
}

function closeChanceDraw(card = null) {
  clearChanceDrawTimers();
  setChanceDrawVisible(false);
  const resolver = state.chanceDraw.resolver;
  state.chanceDraw.resolver = null;
  state.chanceDraw.playerId = '';
  state.chanceDraw.autoStart = false;
  state.chanceDraw.revealOnly = false;
  state.chanceDraw.selectedCardId = '';
  state.chanceDraw.drawing = false;
  if (resolver) resolver(card);
}

function startChanceDraw() {
  if (state.chanceDraw.revealOnly || state.chanceDraw.selectedCardId) return;
  if (state.chanceDraw.drawing || !chanceDrawPoolIds().length) return;
  clearChanceDrawTimers();
  state.chanceDraw.drawing = true;
  state.chanceDraw.selectedCardId = '';
  state.chanceDraw.frame = 0;
  setChanceDrawActive('Embaralhando');
  setChanceDrawResult('Embaralhando...');
  renderChanceDraw();

  const durationMs = 1900;
  const shuffleEveryMs = 100;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    state.chanceDraw.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      state.chanceDraw.order = shuffleArray(chanceDrawPoolIds());
      lastShuffleAt = now;
    }

    renderChanceDraw();

    if (elapsed < durationMs) {
      state.chanceDraw.rafId = window.requestAnimationFrame(step);
      return;
    }

    state.chanceDraw.drawing = false;
    const card = drawChanceCardFromDeck();
    const selected = card?.id || '';
    state.chanceDraw.selectedCardId = selected;
    state.chanceDraw.order = selected ? [selected, ...chanceDrawPoolIds().filter((id) => id !== selected)] : chanceDrawPoolIds();
    setChanceDrawActive(card ? `${chanceCategoryLabel(card)}: ${card.title}` : 'Carta sorteada');
    setChanceDrawResult(`Carta sorteada: ${card?.title || '--'}.`);
    renderChanceDraw();

    state.chanceDraw.closeTimerId = window.setTimeout(() => closeChanceDraw(card), 850);
  }

  if (state.chanceDraw.rafId) {
    window.cancelAnimationFrame(state.chanceDraw.rafId);
  }
  state.chanceDraw.rafId = window.requestAnimationFrame(step);
}

function openChanceDrawForPlayer(player, { autoStart = false } = {}) {
  clearChanceDrawTimers();
  state.chanceDraw.drawing = false;
  state.chanceDraw.selectedCardId = '';
  state.chanceDraw.frame = 0;
  state.chanceDraw.order = chanceDrawPoolIds();
  state.chanceDraw.playerId = player?.id || '';
  state.chanceDraw.autoStart = autoStart;
  state.chanceDraw.revealOnly = false;
  const copy = byId('chance-draw-copy');

  if (autoStart) {
    const card = drawChanceCardFromDeck();
    if (shouldRunRobotsInBackground()) {
      state.chanceDraw.playerId = '';
      state.chanceDraw.autoStart = false;
      state.chanceDraw.revealOnly = false;
      state.chanceDraw.selectedCardId = '';
      return Promise.resolve(card);
    }
    const selectedId = card?.id || '';
    state.chanceDraw.selectedCardId = selectedId;
    state.chanceDraw.order = selectedId ? [selectedId] : [];
    state.chanceDraw.revealOnly = true;
    setChanceDrawActive(card ? `${chanceCategoryLabel(card)}: ${card.title}` : 'Carta revelada');
    setChanceDrawResult(card ? `${playerActionName(player)} revelou ${card.title}.` : 'Carta revelada.');
    if (copy) {
      copy.textContent = '';
    }
    renderChanceDraw();
    setChanceDrawVisible(true);
    return new Promise((resolve) => {
      state.chanceDraw.resolver = resolve;
      if (shouldRunRobotsInBackground()) {
        closeChanceDraw(card);
        return;
      }
      state.chanceDraw.closeTimerId = window.setTimeout(() => closeChanceDraw(card), currentCpuRevealDelay(1800));
    });
  }

  state.chanceDraw.order = chanceDrawPoolIds();
  setChanceDrawActive('Aguardando sorteio');
  setChanceDrawResult('Pressione Enter ou clique para sortear.');
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
  const route = buildContractRouteContext(player);
  const fullPath = route.fullPath;
  const currentIndex = route.currentIndex;
  if (!fullPath.length || currentIndex < 0) {
    return { moved: false, label: player.location_label };
  }
  const targetIndex = Math.max(0, Math.min(fullPath.length - 1, currentIndex + steps));
  const segment = buildRouteSegment(fullPath, currentIndex, targetIndex);
  await animatePathSegment(player, segment, { stepDelay });
  return {
    moved: targetIndex !== currentIndex,
    label: player.location_label,
    targetNodeId: fullPath[targetIndex],
    stepsMoved: Math.abs(targetIndex - currentIndex),
    segment: route.segment,
    reachedOrigin: Boolean(route.originNodeId && fullPath[targetIndex] === route.originNodeId),
  };
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
  const route = buildContractRouteContext(player);
  const fullPath = route.fullPath;
  const currentIndex = route.currentIndex;
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
  return alivePlayers().filter((entry) => entry.id !== player?.id);
}

async function resolveLandingAfterForcedMovement(player, { stepDelay = 260 } = {}) {
  const contract = player?.active_contract;
  const finalNode = state.nodesById[player?.board_node_id] || null;
  if (!player || !contract || !finalNode) {
    return { note: `${playerActionName(player)} terminou em ${player?.location_label || '--'}.`, statusLabel: player?.status_label || player?.location_label || '--' };
  }

  syncContractRouteProgress(player, player.board_node_id ? [player.board_node_id] : []);
  const destinationNodeId = getPropertyNode(contract.destination)?.id;
  const passedToll = Boolean(contract.toll_passed);
  const reachedDestination = Boolean(destinationNodeId && player.board_node_id === destinationNodeId);
  const destinationBeforeToll = reachedDestination && !passedToll;

  if (reachedDestination && passedToll && !contract.completed) {
    const settlement = await completeContractForPlayer(player);
    return {
      note: `${playerActionName(player)} chegou em ${contract.destination} ${contractArrivalText(contract)} e concluiu o contrato, recebendo ${formatCurrency(settlement?.total || 0)}.`,
      statusLabel: player.status_label,
    };
  }

  if (finalNode.kind === 'fuel') {
    const fuelOutcome = await resolveFuelStopForPlayer(player, finalNode);
    return {
      note: fuelOutcome?.note || `${playerActionName(player)} parou em ${player.location_label}.`,
      statusLabel: fuelOutcome?.statusLabel || player.status_label,
    };
  }

  if (finalNode.kind === 'chance') {
    return resolveChanceStopForPlayer(player, { stepDelay });
  }

  if (finalNode.kind === 'port' && (!reachedDestination || destinationBeforeToll)) {
    const portOutcome = await resolvePortStopForPlayer(player, finalNode, { stepDelay });
    return {
      note: `${portOutcome.note}${destinationBeforeTollSuffix(contract, reachedDestination, passedToll)}`.trim(),
      statusLabel: portOutcome.statusLabel,
    };
  }

  if (finalNode.kind === 'toll') {
    return resolveTollStopForPlayer(player, finalNode, { stepDelay });
  }

  return {
    note: `${playerActionName(player)} terminou o movimento em ${player.location_label}.`,
    statusLabel: player.location_label,
  };
}

async function applyChanceCardEffect(player, card, { stepDelay = 260 } = {}) {
  const effect = card?.effect || {};
  const contract = ensurePlayerContractDraft(player);
  let note = card?.effect_text || 'Carta aplicada.';
  let detail = note;
  let statusLabel = `${chanceCategoryLabel(card).toLowerCase()}: ${card?.title || 'carta'}`;
  let keepHeld = false;

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
      const amount = effect.amount || 0;
      const outcome = await bankChargeOutcome(player, amount, {
        action: 'Carta: pagamento ao banco',
        detail: `Pagou ${formatCurrency(amount)} ao banco.`,
        statusLabel: `pagou ${formatCurrency(amount)}`,
        reason: `carta ${card.title}`,
      });
      note = outcome.bankrupt
        ? `${playerActionName(player)} nao conseguiu pagar ${formatCurrency(amount)} ao banco e faliu.`
        : `${playerActionName(player)} pagou ${formatCurrency(amount)}.`;
      detail = outcome.bankrupt
        ? `Nao honrou ${formatCurrency(amount)} ao banco e faliu.`
        : `Pagou ${formatCurrency(amount)}.`;
      statusLabel = player.status_label;
      break;
    }
    case 'gain_from_each': {
      const amount = effect.amount || 0;
      const rivals = otherPlayers(player);
      let totalReceived = 0;
      for (const entry of rivals) {
        const outcome = await playerChargeOutcome(entry, player, amount, {
          payerAction: 'Carta: pagamento',
          receiverAction: 'Carta: recebimento',
          payerDetail: `${formatCurrency(amount)} para ${player.name}.`,
          receiverDetail: `${formatCurrency(amount)} de ${entry.name}.`,
          statusLabel: `pagou ${formatCurrency(amount)}`,
          reason: `carta ${card.title}`,
        });
        totalReceived += Number(outcome.paid || 0);
      }
      note = `${playerActionName(player)} recebeu ${formatCurrency(totalReceived)} dos demais jogadores.`;
      detail = `Recebeu ${formatCurrency(totalReceived)} de ${rivals.length} jogador(es).`;
      statusLabel = totalReceived > 0 ? `recebeu ${formatCurrency(totalReceived)}` : player.status_label;
      break;
    }
    case 'pay_each': {
      const amount = effect.amount || 0;
      const rivals = otherPlayers(player);
      let totalPaid = 0;
      let paidCount = 0;
      for (const entry of rivals) {
        const outcome = await playerChargeOutcome(player, entry, amount, {
          payerAction: 'Carta: pagamento',
          receiverAction: 'Carta: recebimento',
          payerDetail: `${formatCurrency(amount)} para ${entry.name}.`,
          receiverDetail: `${formatCurrency(amount)} de ${player.name}.`,
          statusLabel: `pagou ${formatCurrency(amount)}`,
          reason: `carta ${card.title}`,
        });
        totalPaid += Number(outcome.paid || 0);
        if (outcome.paid > 0) paidCount += 1;
        if (outcome.bankrupt) break;
      }
      note = player.bankrupt
        ? `${playerActionName(player)} nao conseguiu pagar todos os jogadores e faliu.`
        : `${playerActionName(player)} pagou ${formatCurrency(amount)} a cada adversario.`;
      detail = `Pagou ${formatCurrency(totalPaid)} para ${paidCount} jogador(es).`;
      statusLabel = player.status_label;
      break;
    }
    case 'receive_half_current_freight': {
      const previousValue = Number(contract?.base_freight_value || contract?.freight_value || 0);
      const reducedValue = Math.round(previousValue / 2);
      if (contract) {
        contract.base_freight_value = reducedValue;
        contract.freight_value = reducedValue;
        contract.settlement_value = reducedValue;
        contract.freight_label = `Frete ${formatCurrency(reducedValue)}`;
      }
      note = `${playerActionName(player)} teve o frete atual reduzido para metade: ${formatCurrency(reducedValue)}.`;
      detail = `Frete reduzido para ${formatCurrency(reducedValue)}.`;
      statusLabel = `frete ${formatCurrency(reducedValue)}`;
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
      const coupon = { kind: effect.coupon, label: card.title, source_card_id: card.id };
      player.coupons = [...(player.coupons || []), coupon];
      keepHeld = true;
      note = `${playerActionName(player)} guardou o cupom ${card.title}.`;
      detail = `Guardou o cupom ${card.title}.`;
      statusLabel = `cupom ${card.title}`;
      break;
    }
    case 'double_dice_once': {
      const lastRollTotal = Array.isArray(player.last_roll) && player.last_roll.length === 2
        ? ((Number(player.last_roll[0]) || 0) + (Number(player.last_roll[1]) || 0))
        : 0;
      if (lastRollTotal > 0) {
        const moved = await movePlayerByRouteSteps(player, lastRollTotal, { stepDelay });
        const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
        note = `${playerActionName(player)} ativou ${card.title} e repetiu o valor da ultima rolagem (${lastRollTotal}). ${landing?.note || ''}`.trim();
        detail = `Moveu novamente ${lastRollTotal} casa(s). ${landing?.note || ''}`.trim();
        statusLabel = landing?.statusLabel || moved.label || player.location_label;
      } else {
        note = `${playerActionName(player)} revelou ${card.title}, mas nao havia uma rolagem anterior valida para duplicar.`;
        detail = 'Sem rolagem anterior valida para aplicar Dados x2.';
        statusLabel = player.status_label || player.location_label;
      }
      break;
    }
    case 'move_steps': {
      const moved = await movePlayerByRouteSteps(player, effect.steps || 0, { stepDelay });
      const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
      const verb = (effect.steps || 0) >= 0 ? 'avancou' : 'voltou';
      const shownSteps = moved.moved ? moved.stepsMoved : Math.abs(effect.steps || 0);
      const segmentLabel = moved.segment === 'pe_to_pd' ? 'trecho final' : (moved.segment === 'pp_to_pe' ? 'trecho inicial' : 'rota atual');
      const originSuffix = moved.reachedOrigin ? ' O recuo parou no porto de origem.' : '';
      note = `${playerActionName(player)} ${verb} ${shownSteps} casa(s) pela rota ${segmentLabel} e foi para ${moved.label}.${originSuffix} ${landing?.note || ''}`.trim();
      detail = `${verb[0].toUpperCase() + verb.slice(1)} ${shownSteps} casa(s) ate ${moved.label}.${originSuffix} ${landing?.note || ''}`.trim();
      statusLabel = landing?.statusLabel || moved.label;
      break;
    }
    case 'move_to_toll': {
      const moved = await movePlayerToContractToll(player, { stepDelay });
      const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
      note = `${playerActionName(player)} foi para o pedagio ${player.active_contract?.mandatory_toll || moved.label}. ${landing?.note || ''}`.trim();
      detail = `Foi para o pedagio ${player.active_contract?.mandatory_toll || moved.label}. ${landing?.note || ''}`.trim();
      statusLabel = landing?.statusLabel || moved.label;
      break;
    }
    case 'move_ports': {
      const moved = await movePlayerByPortOffset(player, effect.offset || 0, { stepDelay });
      const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
      note = `${playerActionName(player)} foi para ${moved.label}. ${landing?.note || ''}`.trim();
      detail = `Reposicionado para ${moved.label}. ${landing?.note || ''}`.trim();
      statusLabel = landing?.statusLabel || moved.label;
      break;
    }
    case 'move_to_origin_port': {
      const moved = await movePlayerToOriginPort(player, { stepDelay });
      const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
      note = `${playerActionName(player)} voltou ao porto de origem ${player.active_contract?.origin || moved.label}. ${landing?.note || ''}`.trim();
      detail = `Voltou ao porto de origem ${player.active_contract?.origin || moved.label}. ${landing?.note || ''}`.trim();
      statusLabel = landing?.statusLabel || moved.label;
      break;
    }
    default: {
      note = card.effect_text || `${playerActionName(player)} comprou uma carta.`;
      detail = note;
      break;
    }
  }

  if (keepHeld) holdChanceCardInDeck(card.id);
  else discardChanceCardToDeck(card.id);

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

  const stop = stopChargeBreakdown(player, card);
  const owner = stop.owner;
  const negotiationPrice = Math.round(card.price * 1.5);
  const monopolySuffix = stop.monopolyApplied ? ` (monopolio x${stop.monopolyRegionSize})` : '';

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

      const freeStay = await maybeUseFreePortStayCoupon(player, card, stop.bankFee);
      if (freeStay) {
        return {
          note: `${playerActionName(player)} usou Porto Livre em ${card.code} e nao pagou estadia ao banco.`,
          statusLabel: player.status_label,
        };
      }

      const outcome = await bankChargeOutcome(player, stop.bankFee, {
        action: 'Estadia ao banco',
        detail: `${card.code}: ${formatCurrency(stop.bankFee)}.`,
        statusLabel: `pagou ${formatCurrency(stop.bankFee)}`,
        reason: `estadia em ${card.code}`,
      });
      renderHud();
      if (outcome.bankrupt) {
        return {
          note: `${playerActionName(player)} nao conseguiu pagar a estadia de ${formatCurrency(stop.bankFee)} em ${card.code} e faliu.`,
          statusLabel: player.status_label,
        };
      }
      return {
        note: `${playerActionName(player)} pagou ${formatCurrency(stop.bankFee)} ao banco em ${card.code}.`,
        statusLabel: player.status_label,
      };
    }

    const canBuy = player.cash >= card.price;
    const choice = await openDecisionModal({
      title: `${card.code} sem dono`,
      copy: canBuy
        ? `Comprar o porto por ${formatCurrency(card.price)} ou pagar estadia de ${formatCurrency(stop.bankFee)} ao banco?`
        : `Voce nao tem caixa para comprar ${card.code}. Pague estadia de ${formatCurrency(stop.bankFee)} ao banco.`,
      primaryLabel: canBuy ? `Comprar ${formatCurrency(card.price)}` : `Pagar ${formatCurrency(stop.bankFee)}`,
      secondaryLabel: `Pagar ${formatCurrency(stop.bankFee)}`,
      hideSecondary: !canBuy,
      cardCode: card.code,
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

    const freeStay = await maybeUseFreePortStayCoupon(player, card, stop.bankFee);
    if (freeStay) {
      return {
        note: `Voce usou Porto Livre em ${card.code} e nao pagou estadia ao banco.`,
        statusLabel: player.status_label,
      };
    }

    const outcome = await bankChargeOutcome(player, stop.bankFee, {
      action: 'Estadia ao banco',
      detail: `${card.code}: ${formatCurrency(stop.bankFee)}.`,
      statusLabel: `pagou ${formatCurrency(stop.bankFee)}`,
      reason: `estadia em ${card.code}`,
    });
    renderHud();
    if (outcome.bankrupt) {
      return {
        note: `Voce nao conseguiu pagar a estadia de ${formatCurrency(stop.bankFee)} em ${card.code} e faliu.`,
        statusLabel: player.status_label,
      };
    }
    return {
      note: `Voce pagou ${formatCurrency(stop.bankFee)} ao banco em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  if (owner.id === player.id) {
    if (player.is_human) {
      await openDecisionModal({
        title: stop.mortgaged ? `${card.code} hipotecado` : `${card.code} ja e seu`,
        copy: stop.mortgaged
          ? `O porto ${card.code} esta hipotecado. Ele nao rende estadia nem conta para monopolio ate ser resgatado.`
          : `O porto ${card.code} ja pertence a sua companhia. Nenhuma acao e necessaria.`,
        primaryLabel: 'Continuar',
        hideSecondary: true,
        cardCode: card.code,
      });
    }
    player.status_label = stop.mortgaged ? `porto hipotecado ${card.code}` : `porto proprio ${card.code}`;
    pushActionLog(player, stop.mortgaged ? 'Porto hipotecado' : 'Porto proprio', stop.mortgaged
      ? `${card.code} esta hipotecado e sem renda.`
      : `${card.code} ja pertence a sua companhia.`);
    renderHud();
    return {
      note: stop.mortgaged
        ? `${playerActionName(player)} parou em ${card.code}, que esta hipotecado e sem cobranca de estadia.`
        : `${playerActionName(player)} parou em ${card.code}, que ja pertence a sua companhia.`,
      statusLabel: player.status_label,
    };
  }

  if (stop.mortgaged || !stop.ownerEligible || stop.ownerCharge <= 0) {
    player.status_label = `porto hipotecado ${card.code}`;
    pushActionLog(player, 'Porto hipotecado', `${card.code} pertence a ${owner.name}, mas esta hipotecado e nao cobra estadia.`);
    renderHud();
    return {
      note: `${playerActionName(player)} parou em ${card.code}, mas nao pagou estadia porque o titulo de ${owner.name} esta hipotecado.`,
      statusLabel: player.status_label,
    };
  }

  if (!player.is_human) {
    const canNegotiate = cpuShouldNegotiateOwnedProperty(player, negotiationPrice);
    if (canNegotiate && transferProperty(owner, player, card.code, negotiationPrice)) {
      player.status_label = `comprou ${card.code}`;
      pushActionLog(player, 'Negociacao aceita', `${card.code} por ${formatCurrency(negotiationPrice)}.`);
      pushActionLog(owner, 'Vendeu porto', `${card.code} por ${formatCurrency(negotiationPrice)} para ${player.name}.`);
      renderHud();
      return {
        note: `${playerActionName(player)} negociou e comprou ${card.code} de ${owner.name} por ${formatCurrency(negotiationPrice)}.`,
        statusLabel: player.status_label,
      };
    }

    const freeStay = await maybeUseFreePortStayCoupon(player, card, stop.ownerCharge, owner);
    if (freeStay) {
      return {
        note: `${playerActionName(player)} usou Porto Livre em ${card.code} e nao pagou estadia a ${owner.name}.`,
        statusLabel: player.status_label,
      };
    }

    const outcome = await playerChargeOutcome(player, owner, stop.ownerCharge, {
      payerAction: 'Estadia ao dono',
      receiverAction: 'Recebeu estadia',
      payerDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} para ${owner.name}${monopolySuffix}.`,
      receiverDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} de ${player.name}${monopolySuffix}.`,
      statusLabel: `pagou ${formatCurrency(stop.ownerCharge)}`,
      reason: `estadia em ${card.code}`,
    });
    renderHud();
    if (outcome.bankrupt) {
      return {
        note: `${playerActionName(player)} nao conseguiu pagar a estadia de ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code} e faliu.`,
        statusLabel: player.status_label,
      };
    }
    return {
      note: `${playerActionName(player)} pagou ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  const canNegotiate = player.cash >= negotiationPrice;
  const choice = await openDecisionModal({
    title: `${card.code} pertence a ${owner.name}`,
    copy: canNegotiate
      ? `Pague ${formatCurrency(stop.ownerCharge)} de estadia ao dono ou negocie a compra do porto por ${formatCurrency(negotiationPrice)}.`
      : `Pague ${formatCurrency(stop.ownerCharge)} de estadia ao dono. Voce nao tem caixa para a oferta padrao de ${formatCurrency(negotiationPrice)}.`,
    primaryLabel: `Pagar ${formatCurrency(stop.ownerCharge)}`,
    secondaryLabel: `Negociar ${formatCurrency(negotiationPrice)}`,
    hideSecondary: !canNegotiate,
    cardCode: card.code,
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

  const freeStay = await maybeUseFreePortStayCoupon(player, card, stop.ownerCharge, owner);
  if (freeStay) {
    return {
      note: `Voce usou Porto Livre em ${card.code} e nao pagou estadia a ${owner.name}.`,
      statusLabel: player.status_label,
    };
  }

  const outcome = await playerChargeOutcome(player, owner, stop.ownerCharge, {
    payerAction: 'Estadia ao dono',
    receiverAction: 'Recebeu estadia',
    payerDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} para ${owner.name}${monopolySuffix}.`,
    receiverDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} de voce${monopolySuffix}.`,
    statusLabel: `pagou ${formatCurrency(stop.ownerCharge)}`,
    reason: `estadia em ${card.code}`,
  });
  renderHud();
  if (outcome.bankrupt) {
    return {
      note: `Voce nao conseguiu pagar a estadia de ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code} e faliu.`,
      statusLabel: player.status_label,
    };
  }
  return {
    note: `Voce pagou ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code}.`,
    statusLabel: player.status_label,
  };
}


async function resolveTollStopForPlayer(player, node, { stepDelay = 260 } = {}) {
  const card = getPropertyCard(node?.label || '');
  if (!player || !card) {
    return { note: `${playerActionName(player)} parou em pedagio sem dados.`, statusLabel: player?.status_label || '--' };
  }

  const stop = stopChargeBreakdown(player, card);
  const owner = stop.owner;
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

      const freeToll = await maybeUseFreeTollCoupon(player, card, stop.bankFee);
      if (freeToll) {
        return {
          note: `${playerActionName(player)} usou Pedagio Livre em ${card.code} e nao pagou ao banco.`,
          statusLabel: player.status_label,
        };
      }

      const outcome = await bankChargeOutcome(player, stop.bankFee, {
        action: 'Pedagio ao banco',
        detail: `${card.code}: ${formatCurrency(stop.bankFee)}.`,
        statusLabel: `pagou ${formatCurrency(stop.bankFee)}`,
        reason: `pedagio em ${card.code}`,
      });
      renderHud();
      if (outcome.bankrupt) {
        return {
          note: `${playerActionName(player)} nao conseguiu pagar o pedagio de ${formatCurrency(stop.bankFee)} em ${card.code} e faliu.`,
          statusLabel: player.status_label,
        };
      }
      return {
        note: `${playerActionName(player)} pagou ${formatCurrency(stop.bankFee)} ao banco em ${card.code}.`,
        statusLabel: player.status_label,
      };
    }

    const canBuy = player.cash >= card.price;
    const choice = await openDecisionModal({
      title: `${card.code} sem dono`,
      copy: canBuy
        ? `Comprar o pedagio por ${formatCurrency(card.price)} ou pagar ${formatCurrency(stop.bankFee)} ao banco?`
        : `Voce nao tem caixa para comprar ${card.code}. Pague ${formatCurrency(stop.bankFee)} ao banco.`,
      primaryLabel: canBuy ? `Comprar ${formatCurrency(card.price)}` : `Pagar ${formatCurrency(stop.bankFee)}`,
      secondaryLabel: `Pagar ${formatCurrency(stop.bankFee)}`,
      hideSecondary: !canBuy,
      cardCode: card.code,
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

    const freeToll = await maybeUseFreeTollCoupon(player, card, stop.bankFee);
    if (freeToll) {
      return {
        note: `Voce usou Pedagio Livre em ${card.code} e nao pagou ao banco.`,
        statusLabel: player.status_label,
      };
    }

    const outcome = await bankChargeOutcome(player, stop.bankFee, {
      action: 'Pedagio ao banco',
      detail: `${card.code}: ${formatCurrency(stop.bankFee)}.`,
      statusLabel: `pagou ${formatCurrency(stop.bankFee)}`,
      reason: `pedagio em ${card.code}`,
    });
    renderHud();
    if (outcome.bankrupt) {
      return {
        note: `Voce nao conseguiu pagar o pedagio de ${formatCurrency(stop.bankFee)} em ${card.code} e faliu.`,
        statusLabel: player.status_label,
      };
    }
    return {
      note: `Voce pagou ${formatCurrency(stop.bankFee)} ao banco em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  if (owner.id === player.id) {
    if (player.is_human) {
      await openDecisionModal({
        title: stop.mortgaged ? `${card.code} hipotecado` : `${card.code} ja e seu`,
        copy: stop.mortgaged
          ? `O pedagio ${card.code} esta hipotecado. Ele nao rende cobranca nem comissao sobre frete ate ser resgatado.`
          : `O pedagio ${card.code} ja pertence a sua companhia. Nenhuma acao e necessaria.`,
        primaryLabel: 'Continuar',
        hideSecondary: true,
        cardCode: card.code,
      });
    }
    player.status_label = stop.mortgaged ? `pedagio hipotecado ${card.code}` : `pedagio proprio ${card.code}`;
    pushActionLog(player, stop.mortgaged ? 'Pedagio hipotecado' : 'Pedagio proprio', stop.mortgaged
      ? `${card.code} esta hipotecado e sem renda.`
      : `${card.code} ja pertence a sua companhia.`);
    renderHud();
    return {
      note: stop.mortgaged
        ? `${playerActionName(player)} parou em ${card.code}, que esta hipotecado e sem cobranca.`
        : `${playerActionName(player)} parou em ${card.code}, que ja pertence a sua companhia.`,
      statusLabel: player.status_label,
    };
  }

  if (stop.mortgaged || !stop.ownerEligible || stop.ownerCharge <= 0) {
    player.status_label = `pedagio hipotecado ${card.code}`;
    pushActionLog(player, 'Pedagio hipotecado', `${card.code} pertence a ${owner.name}, mas esta hipotecado e nao cobra pedagio.`);
    renderHud();
    return {
      note: `${playerActionName(player)} parou em ${card.code}, mas nao pagou porque o titulo de ${owner.name} esta hipotecado.`,
      statusLabel: player.status_label,
    };
  }

  if (!player.is_human) {
    const canNegotiate = cpuShouldNegotiateOwnedProperty(player, negotiationPrice);
    if (canNegotiate && transferProperty(owner, player, card.code, negotiationPrice)) {
      player.status_label = `comprou ${card.code}`;
      pushActionLog(player, 'Negociacao aceita', `${card.code} por ${formatCurrency(negotiationPrice)}.`);
      pushActionLog(owner, 'Vendeu pedagio', `${card.code} por ${formatCurrency(negotiationPrice)} para ${player.name}.`);
      renderHud();
      return {
        note: `${playerActionName(player)} negociou e comprou o pedagio ${card.code} de ${owner.name} por ${formatCurrency(negotiationPrice)}.`,
        statusLabel: player.status_label,
      };
    }

    const freeToll = await maybeUseFreeTollCoupon(player, card, stop.ownerCharge, owner);
    if (freeToll) {
      return {
        note: `${playerActionName(player)} usou Pedagio Livre em ${card.code} e nao pagou a ${owner.name}.`,
        statusLabel: player.status_label,
      };
    }

    const outcome = await playerChargeOutcome(player, owner, stop.ownerCharge, {
      payerAction: 'Pedagio ao dono',
      receiverAction: 'Recebeu pedagio',
      payerDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} para ${owner.name}.`,
      receiverDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} de ${player.name}.`,
      statusLabel: `pagou ${formatCurrency(stop.ownerCharge)}`,
      reason: `pedagio em ${card.code}`,
    });
    renderHud();
    if (outcome.bankrupt) {
      return {
        note: `${playerActionName(player)} nao conseguiu pagar o pedagio de ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code} e faliu.`,
        statusLabel: player.status_label,
      };
    }
    return {
      note: `${playerActionName(player)} pagou ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code}.`,
      statusLabel: player.status_label,
    };
  }

  const canNegotiate = player.cash >= negotiationPrice;
  const choice = await openDecisionModal({
    title: `${card.code} pertence a ${owner.name}`,
    copy: canNegotiate
      ? `Pague ${formatCurrency(stop.ownerCharge)} ao dono ou negocie a compra do pedagio por ${formatCurrency(negotiationPrice)}.`
      : `Pague ${formatCurrency(stop.ownerCharge)} ao dono. Voce nao tem caixa para a oferta padrao de ${formatCurrency(negotiationPrice)}.`,
    primaryLabel: `Pagar ${formatCurrency(stop.ownerCharge)}`,
    secondaryLabel: `Negociar ${formatCurrency(negotiationPrice)}`,
    hideSecondary: !canNegotiate,
    cardCode: card.code,
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

  const freeToll = await maybeUseFreeTollCoupon(player, card, stop.ownerCharge, owner);
  if (freeToll) {
    return {
      note: `Voce usou Pedagio Livre em ${card.code} e nao pagou a ${owner.name}.`,
      statusLabel: player.status_label,
    };
  }

  const outcome = await playerChargeOutcome(player, owner, stop.ownerCharge, {
    payerAction: 'Pedagio ao dono',
    receiverAction: 'Recebeu pedagio',
    payerDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} para ${owner.name}.`,
    receiverDetail: `${card.code}: ${formatCurrency(stop.ownerCharge)} de voce.`,
    statusLabel: `pagou ${formatCurrency(stop.ownerCharge)}`,
    reason: `pedagio em ${card.code}`,
  });
  renderHud();
  if (outcome.bankrupt) {
    return {
      note: `Voce nao conseguiu pagar o pedagio de ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code} e faliu.`,
      statusLabel: player.status_label,
    };
  }
  return {
    note: `Voce pagou ${formatCurrency(stop.ownerCharge)} a ${owner.name} em ${card.code}.`,
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

function renderRouteOverlay() {
  const overlay = getRouteOverlay();
  const plot = getPlotDiv();
  if (!overlay || !plot) return;

  const rect = plot.getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  overlay.innerHTML = '';
  const projection = activeProjection();
  if (!projection || typeof projection !== 'function') return;

  const pathBuilder = d3.geoPath(projection);
  const svgNs = 'http://www.w3.org/2000/svg';

  state.edges.forEach((edge) => {
    const left = state.nodesById[edge.from_node_id];
    const right = state.nodesById[edge.to_node_id];
    if (!left || !right || left.lat === null || right.lat === null || left.lon === null || right.lon === null) return;

    const routePath = pathBuilder({
      type: 'LineString',
      coordinates: [
        [left.lon, left.lat],
        [right.lon, right.lat],
      ],
    });
    if (!routePath) return;

    const segment = document.createElementNS(svgNs, 'path');
    segment.setAttribute('d', routePath);
    segment.setAttribute('fill', 'none');
    segment.setAttribute('stroke', 'rgba(6, 17, 26, 0.84)');
    segment.setAttribute('stroke-width', 2.35);
    segment.setAttribute('stroke-linecap', 'round');
    overlay.appendChild(segment);
  });
}

function renderNodeOverlay({ force = false } = {}) {
  if (!force && shouldDeferUiRefresh()) {
    markDeferredUiRefresh();
    return;
  }
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

function renderShipOverlay({ force = false } = {}) {
  if (!force && shouldDeferUiRefresh()) {
    markDeferredUiRefresh();
    return;
  }
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
      token.style.width = '39px';
      token.style.height = '21px';
      token.style.marginLeft = '0';
      token.style.marginTop = '0';
      token.style.transform = 'translate(-50%, -50%)';
      token.innerHTML = sprite ? `<img class="game-ship-image" alt="" src="${sprite}" style="display:block;width:47px;height:25px;object-fit:contain;">` : '';
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
  const sensitivity = 360 / Math.max(600, layer?.clientWidth || 0);
  state.view.rotationLon = normalizeLon(state.drag.startRotationLon - (deltaX * sensitivity));
  buildFallbackProjection();
  renderRouteOverlay();
  renderNodeOverlay();
  renderShipOverlay();
  scheduleViewRelayout();
}

async function endDrag(event) {
  if (event.button !== 0 || !state.drag.pointerDown) return;
  state.drag.pointerDown = false;
  if (state.drag.dragging) state.drag.blockClickUntil = Date.now() + 180;
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
  state.rules = economyLib()?.normalizeRules ? economyLib().normalizeRules(payload.rules || {}) : (payload.rules || {});
  state.portCards = (payload.port_cards || []).map((card) => ({ ...card, mortgaged: Boolean(card.mortgaged) }));
  state.tollCards = (payload.toll_cards || []).map((card) => ({ ...card, mortgaged: Boolean(card.mortgaged) }));
  state.chanceCards = payload.chance_cards || [];
  state.chanceDeck = payload.chance_deck || { draw_pile: [], discard_pile: [], held_card_ids: [] };
  if (state.chanceDeck.draw_pile?.length && !state.chanceDeck.discard_pile?.length && !state.chanceDeck.held_card_ids?.length) {
    state.chanceDeck.draw_pile = shuffleArray(state.chanceDeck.draw_pile);
  }
  state.freightPermissionCards = payload.freight_permission_cards || [];
  const defaultPermissionPrice = Number(state.rules.extra_permission_cost || 2000);
  state.players = (payload.players || []).map((player) => ({
    coupons: [],
    last_roll: null,
    skip_turns: 0,
    needs_new_contract: false,
    cashFlashValue: 0,
    cashFlashExpiresAt: 0,
    cashFlashToken: '',
    bankrupt: false,
    ...player,
    property_codes: (player.property_codes || []).map((code) => String(code || '').toUpperCase()),
    permissions: (player.permissions || []).map((permission) => ({
      ...permission,
      purchase_price: Number(permission.purchase_price || defaultPermissionPrice),
      mortgaged: false,
    })),
    coupons: player.coupons || [],
    last_roll: player.last_roll || null,
    skip_turns: player.skip_turns || 0,
    needs_new_contract: Boolean(player.needs_new_contract),
    bankrupt: Boolean(player.bankrupt),
    cashFlashValue: 0,
    cashFlashExpiresAt: 0,
    cashFlashToken: '',
    active_contract: player.active_contract
      ? {
          toll_requirement_waived: false,
          ...player.active_contract,
          toll_requirement_waived: Boolean(player.active_contract.toll_requirement_waived),
        }
      : player.active_contract,
  }));
  state.players.forEach((player) => syncActivePermissionAfterEconomyChange(player));
  state.assets = payload.assets || { ship_masks: {}, ship_fill_masks: {}, ship_sprites: {}, cargo_icons: {} };
  state.distances = payload.distances || {};
  state.session = payload.session || null;
  state.activeContract = payload.active_contract || null;
  state.view.openSystemDrawerId = null;
  state.view.humanDrawerOpen = true;
  state.view.actionFeedExpanded = false;
  state.view.selectedMiniCardsByPlayer = {};
  state.view.expandedActionFeedsByPlayer = {};
  state.flow.openingRoundRunning = false;
  state.flow.followupSetupRunning = false;
  state.flow.turnCycleRunning = false;
  state.actionFeed = [];
  buildCardIndexes();
  syncDerivedState();
  resetReportData();
  renderSettingsOverlay();
  renderReportOverlay();
  renderHud();
  renderShipOverlay();
  renderActionFeed();
  renderPropertyInspector();
}

function setSetupOverlayVisible(visible) {
  const overlay = getSetupOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function updateSetupStartButton() {
  const button = byId('setup-start-button');
  if (!button) return;
  button.disabled = state.setup.submitting;
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
  [2, 3, 4, 5, 6].forEach((count) => {
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
  state.setup.companyName = '';
  state.setup.selectedColorId = '';
  state.setup.rivalCount = defaults.robot_count || defaults.rival_count || 6;
  state.setup.submitting = false;

  renderSetupRivalCounts();
  updateSetupStartButton();
}

function cpuShouldBuyPropertyAtPrice(player, price) {
  const policy = player?.purchase_policy || 'always';
  const normalizedPrice = Math.max(0, Number(price || 0));
  if (player?.bankrupt) return false;
  if (policy === 'never') return false;
  if (policy === 'random') return player.cash >= normalizedPrice && Math.random() >= 0.5;
  return player.cash >= normalizedPrice;
}

function cpuShouldBuyOrigin(player, card) {
  if (!card) return false;
  return cpuShouldBuyPropertyAtPrice(player, card.price);
}

function cpuShouldNegotiateOwnedProperty(player, negotiationPrice) {
  return cpuShouldBuyPropertyAtPrice(player, negotiationPrice);
}

function preparationDelayFor(player, longDelay = false) {
  return player?.is_human
    ? (longDelay ? PREP_STEP_DELAY_LONG_MS : PREP_STEP_DELAY_MS)
    : currentCpuStepDelay();
}

async function runContractOpeningForPlayer(player, { phaseLabel = 'Preparacao', needsPermission = true, originMode = 'draw' } = {}) {
  if (!player || player.bankrupt) return null;

  syncActivePermissionAfterEconomyChange(player);
  if (!needsPermission && !activePermissionRecord(player)) {
    player.status_label = 'sem permissao ativa';
    pushActionLog(player, 'Sem permissao ativa', player.is_human
      ? 'Voce nao tem permissao disponivel para abrir novo contrato.'
      : `${player.name} nao tem permissao disponivel para novo contrato.`);
    renderHud();
    return null;
  }

  const shortDelay = preparationDelayFor(player, false);
  const longDelay = preparationDelayFor(player, true);
  let originResult = null;

  if (needsPermission) {
    if (player.is_human) {
      await openHumanPermissionDraw();
      await delay(shortDelay);
    } else {
      setSession({
        active_player_id: player.id,
        phase: phaseLabel,
        action_label: `${player.name}: permissao`,
        dice: [0, 0],
        note: `${player.name} esta sorteando a permissao de frete.`,
      });
      renderHud();
      renderNodeOverlay();
      renderShipOverlay();
      await delay(shortDelay);
      const permissionCard = randomChoice(state.freightPermissionCards);
      applyPermissionSelectionForPlayer(player, permissionCard, {
        updateSession: true,
        actionLabel: `${player.name}: permissao sorteada`,
        note: `${player.name} recebeu a permissao ${permissionCard.title}.`,
      });
      await delay(shortDelay);
    }
  }

  if (originMode === 'draw') {
    if (player.is_human) {
      setSession({
        active_player_id: player.id,
        action_label: 'Sortear porto de partida',
        note: 'Agora o jogo vai sortear o porto de partida e perguntar se voce quer comprar a posse dele.',
      });
      await openHumanOriginPortDraw();
      await delay(longDelay);
      originResult = { bought: Boolean(player.property_codes?.includes(player.location_code || '')), note: ensurePlayerContractDraft(player)?.note || '' };
    } else {
      const originCard = randomChoice(state.portCards);
      const shouldBuyOrigin = cpuShouldBuyOrigin(player, originCard);
      originResult = applyOriginSelectionForPlayer(player, originCard, shouldBuyOrigin, {
        updateSession: true,
        actionLabel: `${player.name}: porto inicial`,
        note: shouldBuyOrigin
          ? `${player.name} sorteou ${originCard.code} e comprou o porto inicial.`
          : `${player.name} sorteou ${originCard.code} sem comprar o porto inicial.`,
      });
      await delay(shortDelay);
    }
  } else {
    resetContractFromCurrentPort(player, {
      updateSession: true,
      actionLabel: player.is_human ? 'Novo porto de partida' : `${player.name}: novo porto de partida`,
      note: `${player.location_code} agora e o novo porto de partida${player.is_human ? '' : ` de ${player.name}`}.`,
    });
    originResult = { bought: Boolean(player.property_codes?.includes(player.location_code || '')), note: ensurePlayerContractDraft(player)?.note || '' };
    await delay(shortDelay);
  }

  const originCode = player.location_code || ensurePlayerContractDraft(player)?.origin || '';

  if (!needsPermission && !player.is_human) {
    applyBestContractPermissionForRobot(player, originCode);
  }

  if (player.is_human) {
    setSession({
      active_player_id: player.id,
      action_label: 'Sortear pedagio',
      note: 'Agora o jogo vai sortear o pedagio obrigatorio da rota inicial.',
    });
    await openHumanTollDraw();
    await delay(shortDelay);
  } else {
    const tollCard = randomChoice(state.tollCards);
    applyTollSelectionForPlayer(player, tollCard, {
      updateSession: true,
      actionLabel: `${player.name}: pedagio definido`,
      note: `${player.name} vai precisar passar por ${tollCard.code}.`,
    });
    await delay(shortDelay);
  }

  if (player.is_human) {
    setSession({
      active_player_id: player.id,
      action_label: 'Sortear porto de destino',
      note: 'Agora o jogo vai sortear o porto de destino e calcular o valor inicial do contrato.',
    });
    await openHumanDestinationPortDraw();
    await delay(longDelay);
  } else {
    const originCode = player.location_code || ensurePlayerContractDraft(player)?.origin || '';
    const destinationPool = destinationCandidatesForOrigin(originCode);
    const destinationCard = randomChoice(destinationPool);
    applyDestinationSelectionForPlayer(player, destinationCard, {
      updateSession: true,
      actionLabel: `${player.name}: destino definido`,
      note: originResult?.bought
        ? `${player.name} vai de ${originCode} para ${destinationCard.code} com multiplicador de posse no porto inicial.`
        : `${player.name} vai de ${originCode} para ${destinationCard.code}.`,
    });
    await delay(shortDelay);
  }

  return ensurePlayerContractDraft(player);
}

async function runCpuOpeningTurn(player) {
  if (!player) return;

  await runContractOpeningForPlayer(player, {
    phaseLabel: `Primeiro turno - ${player.name}`,
    needsPermission: true,
    originMode: 'draw',
  });

  await runTurnExecutionForPlayer(player, {
    phaseLabel: `Primeiro turno - ${player.name}`,
    cpuActionLabel: `${player.name}: rolar dados`,
    cpuNote: `${player.name} vai rolar os dados do primeiro turno.`,
  });
}

async function runPlayerSubsequentTurn(player, turnNumber) {
  if (!player || player.bankrupt) return;

  const phaseLabel = `Turno ${String(turnNumber).padStart(2, '0')}`;
  renderHud();

  if ((player.skip_turns || 0) > 0) {
    player.skip_turns = Math.max(0, (player.skip_turns || 0) - 1);
    player.status_label = player.skip_turns > 0 ? `parado ${player.skip_turns} rodada(s)` : 'retoma na proxima';
    const note = player.is_human
      ? `Voce perdeu a vez nesta rodada.`
      : `${player.name} perdeu a vez nesta rodada.`;
    pushActionLog(player, 'Rodada perdida', player.skip_turns > 0 ? `Ainda faltam ${player.skip_turns} rodada(s).` : 'Volta a jogar na proxima rodada.');
    setSession({
      active_player_id: player.id,
      phase: phaseLabel,
      action_label: player.is_human ? 'Rodada perdida' : `${player.name}: rodada perdida`,
      dice: [0, 0],
      note,
    });
    renderHud();
    await delay(preparationDelayFor(player, false));
    return;
  }

  if (player.needs_new_contract) {
    await runPostContractForPlayer(player, {
      phaseLabel,
      advanceGlobalTurn: false,
      autoRollAfterSetup: true,
    });
    return;
  }

  if (!player.active_contract || !player.active_contract.destination || player.active_contract.destination === '--') {
    await runContractOpeningForPlayer(player, {
      phaseLabel,
      needsPermission: !(player.permissions || []).length,
      originMode: player.location_code ? 'current' : 'draw',
    });
    await runTurnExecutionForPlayer(player, {
      phaseLabel,
      humanActionLabel: 'Rolar 2 dados',
      humanNote: 'Agora voce pode rolar os dados da rodada.',
      cpuActionLabel: `${player.name}: rolar dados`,
      cpuNote: `${player.name} vai rolar os dados da rodada.`,
    });
    return;
  }

  advanceContractRoundForPlayer(player);
  setSession({
    active_player_id: player.id,
    phase: phaseLabel,
    action_label: player.is_human ? 'Contrato em andamento' : `${player.name}: contrato em andamento`,
    note: player.is_human
      ? `Seu contrato segue em andamento. Prazo atual: ${player.active_contract.deadline_progress}.`
      : `${player.name} segue com o contrato em andamento. Prazo atual: ${player.active_contract.deadline_progress}.`,
  });
  renderHud();
  await delay(preparationDelayFor(player, false));
  await runTurnExecutionForPlayer(player, {
    phaseLabel,
    humanActionLabel: 'Rolar 2 dados',
    humanNote: 'Seu contrato segue em andamento. Role os dados desta rodada.',
    cpuActionLabel: `${player.name}: rolar dados`,
    cpuNote: `${player.name} vai rolar os dados desta rodada.`,
  });
}

async function runSubsequentTurnCycle() {
  if (state.flow.turnCycleRunning) return;
  state.flow.turnCycleRunning = true;
  try {
    while (state.setup.started) {
      const nextTurn = Number(state.session?.turn_number || 1) + 1;
      setSession({
        turn_number: nextTurn,
        turn_label: `Turno ${String(nextTurn).padStart(2, '0')}`,
        phase: `Turno ${String(nextTurn).padStart(2, '0')}`,
        active_player_id: defaultSessionPlayerId(),
        action_label: 'Nova rodada',
        note: `A rodada ${String(nextTurn).padStart(2, '0')} vai comecar.`,
        dice: [0, 0],
      });
      renderHud();
      await delay(PREP_STEP_DELAY_LONG_MS);

      for (const player of alivePlayers()) {
        await runPlayerSubsequentTurn(player, nextTurn);
      }

      captureCashSnapshot({
        label: `Turno ${String(nextTurn).padStart(2, '0')}`,
        turnNumber: nextTurn,
        phase: 'Fechamento da rodada',
        force: true,
      });
    }
  } finally {
    state.flow.turnCycleRunning = false;
  }
}

async function runCpuOpeningRound() {
  if (state.flow.openingRoundRunning) return;

  state.flow.openingRoundRunning = true;
  try {
    for (const player of rivalPlayers()) {
      await runCpuOpeningTurn(player);
    }

    state.view.openSystemDrawerId = null;
    setSession({
      active_player_id: defaultSessionPlayerId(),
      phase: 'Primeiro turno concluido',
      action_label: 'Todos os jogadores preparados',
      note: 'Todos os jogadores concluiram o primeiro turno inicial.',
    });
    captureCashSnapshot({
      label: 'Turno 01',
      turnNumber: 1,
      phase: 'Fechamento do primeiro turno',
      force: true,
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
    const payload = await fetchJson('/api/robots/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        robot_count: state.setup.rivalCount,
      }),
    });

    applyBootstrapPayload(payload);
    state.setup.started = true;
    setSetupOverlayVisible(false);
    await renderMap();
    await delay(currentCpuRevealDelay(PREP_STEP_DELAY_MS));
    await runCpuOpeningRound();
    state.setup.submitting = false;
    updateSetupStartButton();
    delay(currentCpuRevealDelay(PREP_STEP_DELAY_LONG_MS)).then(() => {
      runSubsequentTurnCycle().catch(() => {});
    });
  } catch (_error) {
    state.setup.submitting = false;
    updateSetupStartButton();
    window.alert('Nao foi possivel iniciar a partida de robos.');
  }
}

async function bootstrap() {
  const [mapPayload, uiPayload] = await Promise.all([
    fetchJson('/api/map/bootstrap'),
    fetchJson('/api/robots/bootstrap'),
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

  document.addEventListener('keydown', (event) => {
    const active = document.activeElement;
    const tag = active?.tagName || '';
    if (active?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (event.code === 'Escape' && !event.repeat) {
      if (!getSettingsOverlay()?.classList.contains('is-hidden')) {
        event.preventDefault();
        closeSettingsOverlay();
        return;
      }
      if (!getLogOverlay()?.classList.contains('is-hidden')) {
        event.preventDefault();
        closeLogOverlay();
        return;
      }
      if (!getReportOverlay()?.classList.contains('is-hidden')) {
        event.preventDefault();
        closeReportOverlay();
        return;
      }
    }

    if (event.code === 'Enter' && !event.repeat) {
      if (triggerEnterOnOverlay()) {
        event.preventDefault();
      }
      return;
    }

    if (event.code !== 'Space' || event.repeat) return;
    if (hasCentralOverlayOpen()) return;
    event.preventDefault();
    togglePaused();
  });

  byId('preview-settings-button')?.addEventListener('click', () => {
    openSettingsOverlay();
  });
  byId('preview-report-button')?.addEventListener('click', () => {
    openReportOverlay();
  });
  byId('preview-log-button')?.addEventListener('click', () => {
    openLogOverlay();
  });
  byId('settings-close-button')?.addEventListener('click', () => {
    closeSettingsOverlay();
  });
  byId('log-close-button')?.addEventListener('click', () => {
    closeLogOverlay();
  });
  byId('report-close-button')?.addEventListener('click', () => {
    closeReportOverlay();
  });
  getSettingsOverlay()?.addEventListener('click', (event) => {
    if (event.target === getSettingsOverlay()) {
      closeSettingsOverlay();
    }
  });
  getLogOverlay()?.addEventListener('click', (event) => {
    if (event.target === getLogOverlay()) {
      closeLogOverlay();
    }
  });
  getReportOverlay()?.addEventListener('click', (event) => {
    if (event.target === getReportOverlay()) {
      closeReportOverlay();
    }
  });
  getReportTabs()?.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-report-key]');
    if (!tab?.dataset?.reportKey) return;
    state.report.activeKey = tab.dataset.reportKey;
    renderReportOverlay();
  });
  getReportBody()?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-report-window-key]');
    if (!button?.dataset?.reportWindowKey || !button?.dataset?.reportWindowMode) return;
    const reportKey = button.dataset.reportWindowKey;
    const mode = button.dataset.reportWindowMode === 'full' ? 'full' : 'recent';
    state.report.windowModes = {
      ...(state.report.windowModes || {}),
      [reportKey]: mode,
    };
    renderReportOverlay();
  });
  [getSettingsLogModeGlobalInput(), getSettingsLogModePlayerInput()].forEach((input) => {
    input?.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      state.settings.logMode = event.target.value === 'global' ? 'global' : 'player';
      renderSettingsOverlay();
      renderActionFeed();
    });
  });
  getSettingsCpuSpeedInput()?.addEventListener('input', (event) => {
    state.settings.cpuSpeed = Number(event.target.value || 50);
    renderSettingsOverlay();
  });
  getSettingsLogLifetimeInput()?.addEventListener('input', (event) => {
    state.settings.logLifetimeMs = Math.round(Number(event.target.value || 12) * 1000);
    applyActionFeedLifetime();
    renderSettingsOverlay();
    renderActionFeed();
  });
  [getSettingsBackgroundModeOffInput(), getSettingsBackgroundModeOnInput()].forEach((input) => {
    input?.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      state.settings.runInBackground = event.target.value === 'on';
      renderSettingsOverlay();
      if (shouldRunRobotsInBackground() && state.chanceDraw.revealOnly && state.chanceDraw.resolver) {
        const card = chanceCardById(state.chanceDraw.selectedCardId);
        closeChanceDraw(card);
      }
    });
  });

  byId('preview-rival-list')?.addEventListener('click', (event) => {
    const playerLog = event.target.closest('.preview-rival-action-log');
    if (playerLog?.dataset?.playerLogPlayerId) {
      event.stopPropagation();
      togglePlayerActionFeedExpanded(playerLog.dataset.playerLogPlayerId);
      renderRivals();
      return;
    }

    const mini = event.target.closest('.preview-mini-selectable');
    if (mini?.dataset?.playerId && mini?.dataset?.miniType && mini?.dataset?.miniKey) {
      event.stopPropagation();
      setSelectedMiniKey(mini.dataset.playerId, mini.dataset.miniType, mini.dataset.miniKey);
      renderRivals();
      return;
    }
    const card = event.target.closest('.preview-rival-card');
    if (!card?.dataset?.playerId) return;
    if (card.dataset.playerId === 'human') {
      state.view.humanDrawerOpen = !state.view.humanDrawerOpen;
    } else {
      state.view.openSystemDrawerId = state.view.openSystemDrawerId === card.dataset.playerId
        ? null
        : card.dataset.playerId;
    }
    renderRivals();
  });

  getPropertyInspectorOverlay()?.addEventListener('click', () => {
    closePropertyInspector();
  });

  layer?.addEventListener('mousedown', beginDrag);
  layer?.addEventListener('click', handleMapClick);
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
    scheduleMiniHandLayout();
  });
  document.addEventListener('visibilitychange', () => {
    if (shouldRunRobotsInBackground()) {
      if (state.chanceDraw.revealOnly && state.chanceDraw.resolver) {
        const card = chanceCardById(state.chanceDraw.selectedCardId);
        closeChanceDraw(card);
      }
      return;
    }
    flushDeferredUiRefresh();
  });

  try {
    await bootstrap();
  } catch (_error) {
    window.alert('Nao foi possivel carregar a tela inicial do jogo.');
  }
});


