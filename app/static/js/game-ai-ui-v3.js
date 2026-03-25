const DEFAULT_PROPERTY_STYLE = { fill: '#07b14d', text: '#edf6ff' };
const DEFAULT_PERMISSION_STYLE = { accent: '#17C51A', text: '#FFFFFF' };
const ROUTE_HALO_COLOR = '#8fd7ff';
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
const COUPON_EXPIRATION_TURNS = 100;
const COUPON_EXPIRATION_TURNS_BY_KIND = {
  free_port_stay: 140,
  free_toll: 140,
  free_fuel_contract: 160,
  cancel_contract: 160,
  extended_contract_deadline: 160,
  skip_owner_share: 180,
  anti_monopoly_owner_share: 200,
};
const COUPON_EXPIRATION_MODE_BY_KIND = {
  free_port_stay: 'eligible_checks',
  free_toll: 'eligible_checks',
  free_fuel: 'eligible_checks',
  free_fuel_contract: 'eligible_checks',
  cancel_contract: 'eligible_checks',
  extended_contract_deadline: 'eligible_checks',
  double_freight: 'eligible_checks',
  skip_owner_share: 'eligible_checks',
  anti_monopoly_owner_share: 'eligible_checks',
  shortcut_ignore_toll: 'eligible_checks',
  reroute_same_value: 'eligible_checks',
};

const AI_DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Facil', skillPresetId: 'ai_easy' },
  { id: 'normal', label: 'Normal', skillPresetId: 'ai_normal' },
  { id: 'hard', label: 'Dificil', skillPresetId: 'ai_hard' },
  { id: 'expert', label: 'Expert', skillPresetId: 'ai_expert' },
];

const AI_PROFILE_MODE_OPTIONS = [
  { id: 'balanced', label: 'Balanceados', description: 'Todos os robos usam o perfil equilibrado.' },
  { id: 'random', label: 'Mistura aleatoria', description: 'A mesa embaralha focos diferentes de investimento.' },
  { id: 'closed_market', label: 'Mercado fechado', description: 'Ninguem vende ativos para ninguem.' },
  { id: 'liquid_market', label: 'Mercado aberto', description: 'Os ativos circulam com extrema facilidade.' },
];

const AI_BASE_ARCHETYPE_ORDER = ['balanced_trader', 'port_sprinter', 'cargo_planner', 'toll_broker', 'monopoly_hunter'];

const AI_PARAMETER_LABEL_OVERRIDES = {
  buy_openness: 'Compra',
  sell_openness: 'Venda',
  premium_tolerance: 'Agio',
  discount_tolerance: 'Desagio',
  strategic_lock: 'Apego estrategico',
  desperation_discount: 'Desespero por caixa',
  weight_port: 'Portos',
  weight_permission: 'Permissoes',
  weight_toll: 'Pedagios',
  weight_monopoly: 'Monopolio',
  weight_origin_bonus: 'Origem',
  planning_horizon_turns: 'Horizonte',
  cash_reserve_ratio: 'Reserva de caixa',
  risk_tolerance: 'Risco',
  impulsiveness: 'Impulso',
  coupon_patience: 'Paciencia com cupom',
  asset_attachment: 'Apego a ativo',
  foresight: 'Previsao',
  evaluation_noise: 'Ruido',
  liquidity_discipline: 'Disciplina de caixa',
  combo_awareness: 'Leitura de combo',
  timing_quality: 'Timing',
};

const AI_BASIC_PROFILE_MODE_ORDERS = {
  balanced: ['balanced_trader'],
  random: [...AI_BASE_ARCHETYPE_ORDER],
  closed_market: ['closed_profile', 'toll_broker', 'monopoly_hunter', 'balanced_trader'],
  liquid_market: ['open_profile', 'port_sprinter', 'cargo_planner', 'balanced_trader'],
};

const AI_GROUP_PRESET_METADATA_KEYS = {
  negotiation: 'negotiation_preset_id',
  vision: 'vision_preset_id',
  personality: 'personality_preset_id',
  skill: 'skill_preset_id',
};

const AI_PROFILE_PARAMETER_GROUP_ORDER = ['negotiation', 'vision', 'personality', 'skill'];

const AI_DEFAULT_GROUP_PRESET_IDS = {
  negotiation: 'equilibrado',
  vision: 'balanceado',
  personality: 'temperado',
  skill: 'operacional',
};

function buildAiProfileParameterGroups() {
  const groups = aiProfilesLib()?.parameterGroups || {};
  return Object.values(groups)
    .map((group) => ({
      key: group.id,
      label: group.label,
      description: group.description,
      presets: (group.presets || []).map((preset) => ({
        id: preset.id,
        label: preset.label || preset.id,
        description: preset.description || '',
        values: cloneAiData(preset.values || {}),
      })),
      fields: (group.parameters || []).map((parameter) => ({
        key: parameter.id,
        label: AI_PARAMETER_LABEL_OVERRIDES[parameter.id] || parameter.label || parameter.short_label || parameter.id,
        min: Number(parameter.min ?? 0),
        max: Number(parameter.max ?? 1),
        step: Math.max(Number(parameter.step ?? 0.1), 0.1),
        tickStep: Number(parameter.max ?? 1) - Number(parameter.min ?? 0) >= 1 ? 0.1 : 0.1,
      })),
    }))
    .filter((group) => group.key && group.fields.length)
    .sort((left, right) => AI_PROFILE_PARAMETER_GROUP_ORDER.indexOf(left.key) - AI_PROFILE_PARAMETER_GROUP_ORDER.indexOf(right.key));
}

function buildAiSetupFieldHelp() {
  const groups = aiProfilesLib()?.parameterGroups || {};
  return Object.values(groups).reduce((acc, group) => {
    (group.parameters || []).forEach((parameter) => {
      acc[`${group.id}.${parameter.id}`] = parameter.description || '';
    });
    return acc;
  }, {});
}

const AI_PROFILE_PARAMETER_GROUPS = buildAiProfileParameterGroups();

const GAME_V3_TUTORIAL_VERSION = 'v2';
const GAME_V3_TUTORIAL_STORAGE_KEYS = {
  seen: 'rdm-game-v3-tutorial-seen',
  skipped: 'rdm-game-v3-tutorial-skipped',
  version: 'rdm-game-v3-tutorial-version',
};

const GAME_V3_TUTORIAL_AUTHORING_STORAGE_KEY = 'rdm-game-v3-tutorial-authoring-v2';
const GAME_V3_TUTORIAL_AUTHORING_UI_STORAGE_KEY = 'rdm-game-v3-tutorial-authoring-ui-v2';
const GAME_V3_TUTORIAL_PERSIST_PROGRESS = true;
const GAME_V3_TUTORIAL_MODE_QUERY_KEY = 'tutorial';
const GAME_V3_TUTORIAL_MODE_AUTHORING = 'editing';
const GAME_V3_TUTORIAL_MODE_RUNTIME = 'runtime';
const GAME_V3_TUTORIAL_MODE = (() => {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const rawMode = String(params.get(GAME_V3_TUTORIAL_MODE_QUERY_KEY) || '').trim().toLowerCase();
    if (rawMode === GAME_V3_TUTORIAL_MODE_AUTHORING || rawMode === 'authoring') {
      return GAME_V3_TUTORIAL_MODE_AUTHORING;
    }
    return GAME_V3_TUTORIAL_MODE_RUNTIME;
  } catch (_error) {
    return GAME_V3_TUTORIAL_MODE_RUNTIME;
  }
})();
const GAME_V3_TUTORIAL_CONFIG_URL = '/api/tutorials/game-ai-ui-v3';
const GAME_V3_TUTORIAL_SAVE_URL = '/api/tutorials/game-ai-ui-v3';
const GAME_V3_TUTORIAL_FILE_LABEL = 'data/game_v3_tutorial_v2.json';
const GAME_V3_TUTORIAL_BUTTON_ADVANCE_STEP_IDS = new Set();
const GAME_V3_TUTORIAL_SETUP_LOCK_STEP_IDS = new Set([
  'welcome',
  'objective',
  'setup-overview',
  'setup-name',
  'setup-color',
  'setup-rivals',
  'setup-ai-mode',
  'setup-ai-difficulty',
  'setup-profiles',
  'setup-continue',
  'setup-load-button',
]);
const GAME_V3_TUTORIAL_PERMISSION_LOCK_STEP_IDS = new Set(['first-contract']);
const GAME_V3_TUTORIAL_PORT_LOCK_STEP_IDS = new Set(['origin-card-details']);
const GAME_V3_TUTORIAL_FORCE_PAUSE_STEP_IDS = new Set(['human-player-bar', 'rivals-bars', 'top-toolbar']);

const GAME_V3_TUTORIAL_STEPS = [];

function defaultTutorialCardLayout(index = 0) {
  return {
    x: 56 + (index * 12),
    y: 72 + (index * 6),
    width: 372,
    height: 250,
  };
}

function normalizeTutorialStepDefinition(step = {}, index = 0) {
  const fallbackCard = defaultTutorialCardLayout(index);
  const rawCard = step?.card || {};
  const rawFocusStyle = String(step.focusStyle || step.focus_style || 'frame').trim().toLowerCase();
  const focusStyle = ['frame', 'pulse', 'button', 'beacon'].includes(rawFocusStyle) ? rawFocusStyle : 'frame';
  const rawBadgePosition = String(step.badgePosition || step.badge_position || 'auto').trim().toLowerCase();
  const badgePosition = ['auto', 'top', 'right', 'bottom', 'left'].includes(rawBadgePosition) ? rawBadgePosition : 'auto';
  const stepId = String(step.id || `step_${index + 1}`);
  const stepOrder = Number.isFinite(Number(step.order)) ? Math.max(1, Math.round(Number(step.order))) : (index + 1);
  const rawAdvanceMode = String(step.advanceMode || step.advance_mode || '').trim().toLowerCase();
  const advanceMode = rawAdvanceMode === 'event'
    ? 'event'
    : (rawAdvanceMode === 'button' || GAME_V3_TUTORIAL_BUTTON_ADVANCE_STEP_IDS.has(stepId) ? 'button' : 'manual');
  const rawAdvanceTargets = Array.isArray(step.advanceTargets || step.advance_targets)
    ? (step.advanceTargets || step.advance_targets)
    : [];
  const fallbackAdvanceTarget = String(step.advanceTarget || step.advance_target || step.target || '').trim();
  const advanceTargets = rawAdvanceTargets.length
    ? rawAdvanceTargets.map((entry) => String(entry || '').trim()).filter(Boolean)
    : (fallbackAdvanceTarget ? [fallbackAdvanceTarget] : []);
  return {
    order: stepOrder,
    id: stepId,
    title: String(step.title || ''),
    body: String(step.body || ''),
    hint: String(step.hint || ''),
    target: String(step.target || ''),
    triggerEvent: String(step.triggerEvent || step.trigger_event || ''),
    advanceMode,
    advanceTargets,
    focusStyle,
    clickLabel: String(step.clickLabel || step.click_label || ''),
    badgePosition,
    card: {
      x: Number.isFinite(Number(rawCard.x)) ? Number(rawCard.x) : fallbackCard.x,
      y: Number.isFinite(Number(rawCard.y)) ? Number(rawCard.y) : fallbackCard.y,
      width: Math.max(260, Number.isFinite(Number(rawCard.width)) ? Number(rawCard.width) : fallbackCard.width),
      height: Math.max(180, Number.isFinite(Number(rawCard.height)) ? Number(rawCard.height) : fallbackCard.height),
    },
  };
}

function cloneTutorialStepDefinition(step = {}) {
  return {
    ...step,
    advanceTargets: Array.isArray(step.advanceTargets) ? [...step.advanceTargets] : [],
    card: { ...(step.card || {}) },
  };
}

function tutorialStepSlug(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'passo';
}

function buildTutorialStepId(seed = 'passo', existingSteps = []) {
  const base = tutorialStepSlug(seed);
  const existingIds = new Set(existingSteps.map((step) => String(step?.id || '')));
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function createTutorialAuthoringStep(overrides = {}, existingSteps = []) {
  const baseTitle = String(overrides.title || 'Novo passo');
  const index = Math.max(0, existingSteps.length);
  return normalizeTutorialStepDefinition({
    id: buildTutorialStepId(overrides.id || baseTitle, existingSteps),
    title: baseTitle,
    body: overrides.body || 'Descreva o que o jogador deve observar ou fazer neste momento.',
    hint: overrides.hint || 'Escolha um alvo e refine este passo no editor.',
    target: overrides.target || '',
    triggerEvent: overrides.triggerEvent || '',
    advanceMode: overrides.advanceMode || 'manual',
    advanceTargets: Array.isArray(overrides.advanceTargets) ? overrides.advanceTargets : [],
    focusStyle: overrides.focusStyle || 'frame',
    clickLabel: overrides.clickLabel || '',
    badgePosition: overrides.badgePosition || 'auto',
    card: overrides.card || defaultTutorialCardLayout(index),
  }, index);
}

let GAME_V3_DEFAULT_TUTORIAL_STEPS = GAME_V3_TUTORIAL_STEPS
  .map((step, index) => normalizeTutorialStepDefinition(step, index));

function setGameV3DefaultTutorialSteps(steps = []) {
  const normalizedSteps = Array.isArray(steps) && steps.length
    ? steps.map((step, index) => normalizeTutorialStepDefinition(step, index))
    : [];
  GAME_V3_DEFAULT_TUTORIAL_STEPS = normalizedSteps;
  if (state?.tutorial) {
    state.tutorial.steps = normalizedSteps.map((step) => cloneTutorialStepDefinition(step));
    if (!state.tutorial.currentStepId) {
      state.tutorial.currentStepId = normalizedSteps[0]?.id || '';
      state.tutorial.currentIndex = normalizedSteps.length ? 0 : -1;
    }
    if (!state.tutorial.editor.selectedStepId || !state.tutorial.steps.some((step) => step.id === state.tutorial.editor.selectedStepId)) {
      state.tutorial.editor.selectedStepId = normalizedSteps[0]?.id || '';
    }
  }
}

const AI_PARAMETER_FIELD_MAP = Object.fromEntries(
  AI_PROFILE_PARAMETER_GROUPS.flatMap((group) => group.fields.map((field) => [`${group.key}.${field.key}`, { ...field, groupKey: group.key }]))
);

const AI_SETUP_FIELD_HELP = buildAiSetupFieldHelp();

function aiDefaultPresetIdForGroup(groupKey = '') {
  return AI_DEFAULT_GROUP_PRESET_IDS[groupKey] || '';
}

function aiPresetByGroupAndId(groupKey = '', presetId = '') {
  const group = AI_PROFILE_PARAMETER_GROUPS.find((entry) => entry.key === groupKey);
  if (!group) return null;
  return group.presets.find((preset) => preset.id === presetId) || null;
}

function resolveAiProfilePresetId(profile, groupKey = '') {
  const metadataKey = AI_GROUP_PRESET_METADATA_KEYS[groupKey];
  const group = AI_PROFILE_PARAMETER_GROUPS.find((entry) => entry.key === groupKey);
  if (!metadataKey || !group) return aiDefaultPresetIdForGroup(groupKey);
  const presetOptions = group.presets || [];
  const metadata = profile?.overrides?.metadata && typeof profile.overrides.metadata === 'object'
    ? profile.overrides.metadata
    : (profile?.metadata && typeof profile.metadata === 'object' ? profile.metadata : {});
  const metadataPresetId = String(metadata?.[metadataKey] || '').trim();
  if (metadataPresetId && presetOptions.some((preset) => preset.id === metadataPresetId)) {
    return metadataPresetId;
  }
  const values = profile?.overrides?.[groupKey] && typeof profile.overrides[groupKey] === 'object'
    ? profile.overrides[groupKey]
    : (profile?.[groupKey] && typeof profile[groupKey] === 'object' ? profile[groupKey] : {});
  const matchedPreset = presetOptions.find((preset) => group.fields.every((field) => Number(values[field.key] ?? 0) === Number(preset.values?.[field.key] ?? 0)));
  return matchedPreset?.id || aiDefaultPresetIdForGroup(groupKey);
}

function normalizeAiProfileModeId(mode = 'balanced') {
  const resolved = String(mode || 'balanced').trim();
  if (resolved === 'varied') return 'random';
  if (resolved === 'sell_nothing') return 'closed_market';
  if (resolved === 'sell_everything') return 'liquid_market';
  return AI_PROFILE_MODE_OPTIONS.some((entry) => entry.id === resolved) ? resolved : 'balanced';
}

const AI_MARKET_CASE_OPTIONS = [
  { id: 'balanced_market', label: 'Mercado equilibrado', presetId: 'balanced_market', description: 'Mistura compra, defesa e negociacao sem extremos.' },
  {
    id: 'flex_sellers_market',
    label: 'Vendedores flexiveis',
    values: {
      buy_openness: 0.52,
      sell_openness: 0.84,
      premium_tolerance: 0.42,
      discount_tolerance: 0.74,
      strategic_lock: 0.18,
      desperation_discount: 0.34,
    },
    description: 'Os donos vendem com mais facilidade, mas sem chegar ao giro total do mercado aberto.',
  },
  { id: 'selective_market', label: 'Negociacao seletiva', presetId: 'selective_market', description: 'Cada venda passa por uma analise mais fria e menos impulsiva.' },
  { id: 'acquisitive_market', label: 'Compradores ofensivos', presetId: 'acquisitive_market', description: 'Os robos buscam ativos com forca, mas relutam mais em vender.' },
  {
    id: 'sell_nothing',
    label: 'Mercado fechado',
    values: {
      buy_openness: 0.08,
      sell_openness: 0.02,
      premium_tolerance: 0.18,
      discount_tolerance: 0.02,
      strategic_lock: 1,
      desperation_discount: 0,
    },
    description: 'Ninguem vende ativos: cada companhia fecha a guarda sobre o que conquista.',
  },
  {
    id: 'sell_everything',
    label: 'Mercado aberto',
    values: {
      buy_openness: 1,
      sell_openness: 1,
      premium_tolerance: 0.82,
      discount_tolerance: 1,
      strategic_lock: 0,
      desperation_discount: 0.92,
    },
    description: 'Os ativos circulam com extrema facilidade sempre que houver caixa na mesa.',
  },
];


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
    rivalCount: 5,
    aiDifficulty: 'normal',
    aiProfileMode: 'balanced',
    aiProfileOrder: [...AI_BASE_ARCHETYPE_ORDER],
    aiAdvancedProfiles: false,
    manualRobotProfiles: {},
    manualRobotConfigs: {},
    aiEditorOpen: false,
    aiEditorRobotIndex: 0,
    aiEditorApplyAll: false,
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
  saveName: {
    resolver: null,
    suggestedName: '',
    wasPaused: false,
  },
  loadBrowser: {
    resolver: null,
    runtime: 'game-ai-ui-v2',
    items: [],
    selectedFileName: '',
    selectedSave: null,
    loading: false,
    error: '',
    wasPaused: false,
  },
  negotiation: {
    resolver: null,
    session: null,
    mode: 'buy',
    title: '',
    copy: '',
    cardCode: '',
    sellerName: '',
    buyerName: '',
    feedback: '',
    draftCounter: '',
    barterEnabled: false,
    barterOpen: false,
    barterSourcePlayerId: '',
    barterSourceName: '',
    barterAvailableCodes: [],
    barterSelectedCodes: [],
    barterCopy: '',
  },
  permissionChoice: {
    resolver: null,
    playerId: '',
    originCode: '',
    ownsOrigin: false,
    choices: [],
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
    cpuSpeed: 5,
    logLifetimeMs: 12000,
    logMode: 'player',
    runInBackground: true,
    tradeLockBuy: false,
    tradeLockSell: false,
  },
  report: {
    activeKey: 'cash-by-turn',
    cashHistory: [],
    snapshotKeys: [],
    couponExpirationEvents: [],
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
    overlayPause: {
      settingsWasPaused: false,
      reportWasPaused: false,
      aiEditorWasPaused: false,
    },
    actionFeedExpanded: false,
    propertyInspectorCode: '',
    propertyInspectorAnchor: null,
    deferredUiRefresh: false,
  },
  tutorial: {
    active: false,
    seen: false,
    skipped: false,
    completed: false,
    currentStepId: '',
    currentIndex: -1,
    waitingForEvent: '',
    canAdvance: false,
    spotlightTarget: '',
    lastEvent: null,
    forcePauseActive: false,
    forcePausePreviousState: false,
    version: GAME_V3_TUTORIAL_VERSION,
    steps: GAME_V3_DEFAULT_TUTORIAL_STEPS.map((step) => cloneTutorialStepDefinition(step)),
    editor: {
      open: false,
      minimized: false,
      maximized: false,
      selectedStepId: GAME_V3_DEFAULT_TUTORIAL_STEPS[0]?.id || '',
      dragMode: '',
      startX: 0,
      startY: 0,
      startCard: null,
      status: '',
      lastSavedAt: 0,
    },
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

let saveBrowser = null;
let ephemeralSaveSpaceId = '';
const SAVE_SPACE_STORAGE_KEY = 'ultramarine.save-space-id';

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch (_error) {
    return null;
  }
}

function generateSaveSpaceId() {
  if (window.crypto?.randomUUID) {
    return String(window.crypto.randomUUID()).toLowerCase();
  }
  const randomChunk = Math.random().toString(36).slice(2, 10);
  return `space-${Date.now().toString(36)}-${randomChunk}`.toLowerCase();
}

function getOrCreateSaveSpaceId() {
  const storage = safeLocalStorage();
  if (!storage) {
    if (!ephemeralSaveSpaceId) {
      ephemeralSaveSpaceId = generateSaveSpaceId();
    }
    return ephemeralSaveSpaceId;
  }
  const existing = String(storage.getItem(SAVE_SPACE_STORAGE_KEY) || '').trim().toLowerCase();
  if (existing) {
    return existing;
  }
  const created = generateSaveSpaceId();
  storage.setItem(SAVE_SPACE_STORAGE_KEY, created);
  return created;
}

function readTutorialStorageFlag(key) {
  const storage = safeLocalStorage();
  if (!storage) return false;
  return storage.getItem(key) === '1';
}

function writeTutorialStorageFlag(key, value) {
  const storage = safeLocalStorage();
  if (!storage) return;
  if (value) {
    storage.setItem(key, '1');
  } else {
    storage.removeItem(key);
  }
}

function readTutorialStorageVersion() {
  const storage = safeLocalStorage();
  if (!storage) return '';
  return String(storage.getItem(GAME_V3_TUTORIAL_STORAGE_KEYS.version) || '');
}

function writeTutorialStorageVersion(version = GAME_V3_TUTORIAL_VERSION) {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.setItem(GAME_V3_TUTORIAL_STORAGE_KEYS.version, String(version || GAME_V3_TUTORIAL_VERSION));
}

function tutorialState() {
  return state.tutorial || null;
}

function tutorialMode() {
  return GAME_V3_TUTORIAL_MODE;
}

function tutorialIsAuthoringMode() {
  return tutorialMode() === GAME_V3_TUTORIAL_MODE_AUTHORING;
}

function tutorialIsRuntimeMode() {
  return tutorialMode() === GAME_V3_TUTORIAL_MODE_RUNTIME;
}

function tutorialSteps() {
  return Array.isArray(tutorialState()?.steps) ? tutorialState().steps : [];
}

function tutorialStepIndex(stepId = '') {
  return tutorialSteps().findIndex((step) => step.id === stepId);
}

function tutorialStepById(stepId = '') {
  return tutorialSteps().find((step) => step.id === stepId) || null;
}

function defaultTutorialStepById(stepId = '') {
  return GAME_V3_DEFAULT_TUTORIAL_STEPS.find((step) => step.id === stepId) || null;
}

function tutorialCurrentStep() {
  return tutorialStepById(tutorialState()?.currentStepId || '');
}

function tutorialAdvanceMode(step = tutorialCurrentStep()) {
  const mode = String(step?.advanceMode || '').trim().toLowerCase();
  return ['manual', 'button', 'event'].includes(mode) ? mode : 'manual';
}

function tutorialStepAllowsKeyboardAdvance(step = tutorialCurrentStep()) {
  return tutorialAdvanceMode(step) === 'manual';
}

function tutorialStepRequiresButtonClick(step = tutorialCurrentStep()) {
  return tutorialAdvanceMode(step) === 'button';
}

function tutorialStepWaitsForEvent(step = tutorialCurrentStep()) {
  return Boolean(String(step?.triggerEvent || '').trim());
}

function tutorialButtonAdvanceTargets(step = tutorialCurrentStep()) {
  const rawTargets = Array.isArray(step?.advanceTargets) ? step.advanceTargets : [];
  if (rawTargets.length) {
    return rawTargets.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const fallback = String(step?.target || '').trim();
  return fallback ? [fallback] : [];
}

function tutorialCanAdvanceNow(step = tutorialCurrentStep()) {
  const tutorial = tutorialState();
  if (!tutorial?.active || !step) return false;
  if (!tutorial.canAdvance) return false;
  return tutorialStepAllowsKeyboardAdvance(step);
}

function tutorialRequiresStrictButtonInteraction(step = tutorialCurrentStep()) {
  const tutorial = tutorialState();
  if (!tutorial?.active || !step) return false;
  return tutorialStepRequiresButtonClick(step);
}

function tutorialBlockedInteractionScope(step = tutorialCurrentStep()) {
  const tutorial = tutorialState();
  if (!tutorial?.active || !step) return '';
  if (GAME_V3_TUTORIAL_SETUP_LOCK_STEP_IDS.has(String(step.id || ''))) return '#game-setup-overlay';
  if (GAME_V3_TUTORIAL_PERMISSION_LOCK_STEP_IDS.has(String(step.id || ''))) return '#permission-draw-overlay';
  if (GAME_V3_TUTORIAL_PORT_LOCK_STEP_IDS.has(String(step.id || ''))) return '#port-draw-overlay';
  return '';
}

function tutorialShouldForcePause(step = tutorialCurrentStep()) {
  const tutorial = tutorialState();
  if (!tutorial?.active || !step) return false;
  if (tutorial.waitingForEvent) return false;
  return GAME_V3_TUTORIAL_FORCE_PAUSE_STEP_IDS.has(String(step.id || ''));
}

function releaseTutorialForcedPause() {
  const tutorial = tutorialState();
  if (!tutorial?.forcePauseActive) return;
  const shouldResume = !tutorial.forcePausePreviousState;
  tutorial.forcePauseActive = false;
  tutorial.forcePausePreviousState = false;
  if (shouldResume) {
    setPaused(false, { ignoreTutorialForce: true });
  }
}

function ensureTutorialForcedPause(step = tutorialCurrentStep()) {
  const tutorial = tutorialState();
  if (!tutorialShouldForcePause(step)) return;
  if (tutorial.forcePauseActive) return;
  tutorial.forcePausePreviousState = Boolean(state.view.paused);
  tutorial.forcePauseActive = true;
  setPaused(true, { ignoreTutorialForce: true });
}

function syncTutorialForcedPause(step = tutorialCurrentStep()) {
  const tutorial = tutorialState();
  if (!tutorial?.active) {
    releaseTutorialForcedPause();
    return;
  }
  if (tutorialShouldForcePause(step)) {
    ensureTutorialForcedPause(step);
  }
}

function isTutorialAdvanceKey(event) {
  if (!event || event.repeat) return false;
  const key = String(event.key || '');
  return ![
    'Alt',
    'AltGraph',
    'CapsLock',
    'Control',
    'Meta',
    'NumLock',
    'ScrollLock',
    'Shift',
    'Tab',
    'Escape',
  ].includes(key);
}

function maybeAdvanceTutorialFromKeyboard(event) {
  const step = tutorialCurrentStep();
  if (!tutorialCanAdvanceNow(step)) return false;
  if (!isTutorialAdvanceKey(event)) return false;
  event.preventDefault();
  advanceTutorial();
  return true;
}

function maybeAdvanceTutorialFromButtonClick(target = '', payload = {}) {
  const tutorial = tutorialState();
  const step = tutorialCurrentStep();
  const normalizedTarget = String(target || '').trim();
  if (!tutorial?.active || !step || !normalizedTarget) return false;
  if (!tutorialStepRequiresButtonClick(step)) return false;
  if (tutorial.waitingForEvent) return false;
  if (!tutorialButtonAdvanceTargets(step).includes(normalizedTarget)) return false;
  tutorial.lastEvent = { id: 'button_click', payload: { target: normalizedTarget, ...payload } };
  advanceTutorial();
  return true;
}

function isTutorialInteractiveElement(node) {
  return Boolean(node?.closest?.('button, a[href], [role="button"], input[type="button"], input[type="submit"]'));
}

function tutorialElementTargets(node) {
  const targets = new Set();
  let current = node?.nodeType === 1 ? node : node?.parentElement || null;
  while (current && current !== document.body) {
    const anchor = String(current.dataset?.tutorialAnchor || '').trim();
    if (anchor) targets.add(anchor);
    const id = String(current.id || '').trim();
    if (id) targets.add(id);
    current = current.parentElement;
  }
  return targets;
}

function isInsideTutorialAuthoringUi(node) {
  return Boolean(node?.closest?.('#tutorial-authoring-panel') || node?.closest?.('#tutorial-authoring-toggle'));
}

function tutorialInteractionAllowed(node) {
  if (isInsideTutorialAuthoringUi(node)) return true;
  const targets = tutorialElementTargets(node);
  if (targets.has('tutorial-preview-skip')) return true;
  if (tutorialRequiresStrictButtonInteraction()) {
    const allowedTargets = new Set(tutorialButtonAdvanceTargets());
    return Array.from(targets).some((target) => allowedTargets.has(target));
  }
  const blockedScope = tutorialBlockedInteractionScope();
  if (blockedScope && node?.closest?.(blockedScope)) return false;
  return true;
}

function shouldBlockTutorialInteraction(node) {
  const tutorial = tutorialState();
  if (!tutorial?.active) return false;
  if (!isTutorialInteractiveElement(node)) return false;
  return !tutorialInteractionAllowed(node);
}

function tutorialAuthoringState() {
  return tutorialState()?.editor || null;
}

function currentEditedTutorialStep() {
  const selectedStepId = tutorialAuthoringState()?.selectedStepId || '';
  return tutorialStepById(selectedStepId) || tutorialSteps()[0] || null;
}

function tutorialStepSnapshot(step = {}, index = 0) {
  return normalizeTutorialStepDefinition({
    ...step,
    card: { ...(step.card || {}) },
  }, index);
}

function migrateTutorialStepDefinition(step = {}) {
  if (!step || typeof step !== 'object') return step;
  if (String(step.id || '').trim() !== 'setup-overview') return step;
  if (String(step.target || '').trim() !== 'setup-overlay') return step;
  return {
    ...step,
    target: 'setup-form',
  };
}

function readTutorialAuthoringPayload() {
  const storage = safeLocalStorage();
  if (!storage) return null;
  const raw = storage.getItem(GAME_V3_TUTORIAL_AUTHORING_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { steps: parsed };
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function readTutorialAuthoringUiPayload() {
  const storage = safeLocalStorage();
  if (!storage) return null;
  const raw = storage.getItem(GAME_V3_TUTORIAL_AUTHORING_UI_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function writeTutorialAuthoringUiConfig() {
  const storage = safeLocalStorage();
  const editor = tutorialAuthoringState();
  if (!storage || !editor) return;
  storage.setItem(GAME_V3_TUTORIAL_AUTHORING_UI_STORAGE_KEY, JSON.stringify({
    minimized: Boolean(editor.minimized),
    maximized: Boolean(editor.maximized),
    lastSavedAt: Number(editor.lastSavedAt || 0),
  }));
}

function tutorialSavedLabel(timestamp = 0) {
  if (!(timestamp > 0)) return `Autosave ativo em ${GAME_V3_TUTORIAL_FILE_LABEL}`;
  try {
    return `Salvo em ${GAME_V3_TUTORIAL_FILE_LABEL} as ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch (_error) {
    return `Salvo em ${GAME_V3_TUTORIAL_FILE_LABEL}`;
  }
}

let tutorialAuthoringSaveTimer = 0;
let tutorialAuthoringSaveInFlight = false;
let tutorialAuthoringPendingPayload = null;

function tutorialAuthoringPayloadSnapshot() {
  return tutorialSteps().map((step, index) => tutorialStepSnapshot({
    ...step,
    order: index + 1,
  }, index));
}

function clearTutorialAuthoringPayloadCache() {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.removeItem(GAME_V3_TUTORIAL_AUTHORING_STORAGE_KEY);
}

async function flushTutorialAuthoringConfigSave() {
  if (tutorialAuthoringSaveInFlight || !tutorialAuthoringPendingPayload) return;
  tutorialAuthoringSaveInFlight = true;
  const payload = tutorialAuthoringPendingPayload;
  tutorialAuthoringPendingPayload = null;
  const editor = tutorialAuthoringState();
  try {
    await fetchJson(GAME_V3_TUTORIAL_SAVE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    clearTutorialAuthoringPayloadCache();
    if (editor) {
      editor.lastSavedAt = Date.now();
      editor.status = tutorialSavedLabel(editor.lastSavedAt);
      writeTutorialAuthoringUiConfig();
    }
  } catch (_error) {
    if (editor) {
      editor.status = `Falha ao salvar ${GAME_V3_TUTORIAL_FILE_LABEL}`;
    }
  } finally {
    tutorialAuthoringSaveInFlight = false;
    renderTutorialAuthoring();
    if (tutorialAuthoringPendingPayload) {
      flushTutorialAuthoringConfigSave().catch(() => {});
    }
  }
}

function scheduleTutorialAuthoringConfigSave({ immediate = false } = {}) {
  tutorialAuthoringPendingPayload = tutorialAuthoringPayloadSnapshot();
  const editor = tutorialAuthoringState();
  if (editor) {
    editor.status = `Salvando em ${GAME_V3_TUTORIAL_FILE_LABEL}...`;
  }
  writeTutorialAuthoringUiConfig();
  if (tutorialAuthoringSaveTimer) {
    window.clearTimeout(tutorialAuthoringSaveTimer);
    tutorialAuthoringSaveTimer = 0;
  }
  if (immediate) {
    flushTutorialAuthoringConfigSave().catch(() => {});
    return;
  }
  tutorialAuthoringSaveTimer = window.setTimeout(() => {
    tutorialAuthoringSaveTimer = 0;
    flushTutorialAuthoringConfigSave().catch(() => {});
  }, 180);
}

function writeTutorialAuthoringConfig() {
  const editor = tutorialAuthoringState();
  if (editor) {
    editor.status = `Salvando em ${GAME_V3_TUTORIAL_FILE_LABEL}...`;
  }
  writeTutorialAuthoringUiConfig();
  scheduleTutorialAuthoringConfigSave();
}

function loadTutorialAuthoringConfig() {
  const tutorial = tutorialState();
  const editor = tutorialAuthoringState();
  if (!tutorial || !editor) return;
  clearTutorialAuthoringPayloadCache();
  tutorial.steps = GAME_V3_DEFAULT_TUTORIAL_STEPS.map((step) => cloneTutorialStepDefinition(step));
  editor.selectedStepId = tutorial.steps[0]?.id || '';
  const uiState = readTutorialAuthoringUiPayload();
  editor.minimized = Boolean(uiState?.minimized);
  editor.maximized = Boolean(uiState?.maximized);
  editor.lastSavedAt = Number(uiState?.lastSavedAt || 0);
  if (editor.lastSavedAt > 0) {
    editor.status = tutorialSavedLabel(editor.lastSavedAt);
  }
}

function syncTutorialPersistence() {
  const tutorial = tutorialState();
  if (!tutorial) return;
  if (!GAME_V3_TUTORIAL_PERSIST_PROGRESS) return;
  writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.seen, tutorial.seen || tutorial.completed);
  writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.skipped, tutorial.skipped);
  writeTutorialStorageVersion(tutorial.version || GAME_V3_TUTORIAL_VERSION);
}

function loadTutorialProgress() {
  const tutorial = tutorialState();
  if (!tutorial) return;
  if (!GAME_V3_TUTORIAL_PERSIST_PROGRESS) {
    writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.seen, false);
    writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.skipped, false);
    writeTutorialStorageVersion(GAME_V3_TUTORIAL_VERSION);
    tutorial.version = GAME_V3_TUTORIAL_VERSION;
    tutorial.seen = false;
    tutorial.skipped = false;
    tutorial.completed = false;
    tutorial.active = false;
    tutorial.currentStepId = '';
    tutorial.currentIndex = -1;
    tutorial.waitingForEvent = '';
    tutorial.canAdvance = false;
    tutorial.spotlightTarget = '';
    tutorial.lastEvent = null;
    return;
  }
  const storedVersion = readTutorialStorageVersion();
  if (storedVersion && storedVersion !== GAME_V3_TUTORIAL_VERSION) {
    writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.seen, false);
    writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.skipped, false);
  }
  tutorial.version = GAME_V3_TUTORIAL_VERSION;
  tutorial.seen = readTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.seen);
  tutorial.skipped = readTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.skipped);
  tutorial.completed = tutorial.seen && !tutorial.skipped;
  tutorial.active = false;
  tutorial.currentStepId = '';
  tutorial.currentIndex = -1;
  tutorial.waitingForEvent = '';
  tutorial.canAdvance = false;
  tutorial.spotlightTarget = '';
  tutorial.lastEvent = null;
}

function shouldStartTutorial() {
  const tutorial = tutorialState();
  if (!tutorial) return false;
  if (tutorial.skipped) return false;
  if (tutorialIsRuntimeMode()) return true;
  if (tutorial.seen || tutorial.completed) return false;
  return true;
}

function setTutorialStep(stepId = '') {
  const tutorial = tutorialState();
  const step = tutorialStepById(stepId);
  if (!tutorial || !step) return null;
  tutorial.currentStepId = step.id;
  tutorial.currentIndex = tutorialStepIndex(step.id);
  tutorial.waitingForEvent = step.triggerEvent || '';
  tutorial.canAdvance = tutorialStepWaitsForEvent(step)
    ? false
    : tutorialStepAllowsKeyboardAdvance(step);
  tutorial.spotlightTarget = step.target || '';
  syncTutorialForcedPause(step);
  return step;
}

function startTutorial() {
  const tutorial = tutorialState();
  const steps = tutorialSteps();
  if (!tutorial || !steps.length) return null;
  tutorial.active = true;
  tutorial.skipped = false;
  tutorial.completed = false;
  const step = setTutorialStep(steps[0].id);
  renderTutorialAuthoring();
  return step;
}

function advanceTutorial() {
  const tutorial = tutorialState();
  const steps = tutorialSteps();
  if (!tutorial || !tutorial.active) return null;
  const nextIndex = tutorial.currentIndex + 1;
  if (nextIndex >= steps.length) {
    completeTutorial();
    return null;
  }
  const step = setTutorialStep(steps[nextIndex].id);
  renderTutorialAuthoring();
  return step;
}

function backTutorial() {
  const tutorial = tutorialState();
  const steps = tutorialSteps();
  if (!tutorial || !tutorial.active) return null;
  const previousIndex = Math.max(0, tutorial.currentIndex - 1);
  const step = setTutorialStep(steps[previousIndex]?.id || '');
  renderTutorialAuthoring();
  return step;
}

function skipTutorial() {
  const tutorial = tutorialState();
  if (!tutorial) return;
  tutorial.active = false;
  tutorial.skipped = true;
  tutorial.seen = false;
  tutorial.completed = false;
  tutorial.currentStepId = '';
  tutorial.currentIndex = -1;
  tutorial.waitingForEvent = '';
  tutorial.canAdvance = false;
  tutorial.spotlightTarget = '';
  tutorial.lastEvent = null;
  releaseTutorialForcedPause();
  syncTutorialPersistence();
  renderTutorialAuthoring();
}

function completeTutorial() {
  const tutorial = tutorialState();
  if (!tutorial) return;
  tutorial.active = false;
  tutorial.completed = true;
  tutorial.seen = true;
  tutorial.skipped = false;
  tutorial.currentStepId = '';
  tutorial.currentIndex = -1;
  tutorial.waitingForEvent = '';
  tutorial.canAdvance = false;
  tutorial.spotlightTarget = '';
  tutorial.lastEvent = null;
  releaseTutorialForcedPause();
  syncTutorialPersistence();
  renderTutorialAuthoring();
}

function resetTutorialProgress() {
  const tutorial = tutorialState();
  if (!tutorial) return;
  tutorial.active = false;
  tutorial.seen = false;
  tutorial.skipped = false;
  tutorial.completed = false;
  tutorial.currentStepId = '';
  tutorial.currentIndex = -1;
  tutorial.waitingForEvent = '';
  tutorial.canAdvance = false;
  tutorial.spotlightTarget = '';
  tutorial.lastEvent = null;
  releaseTutorialForcedPause();
  if (GAME_V3_TUTORIAL_PERSIST_PROGRESS) {
    writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.seen, false);
    writeTutorialStorageFlag(GAME_V3_TUTORIAL_STORAGE_KEYS.skipped, false);
    writeTutorialStorageVersion(GAME_V3_TUTORIAL_VERSION);
  }
  renderTutorialAuthoring();
}

function handleTutorialEvent(eventId = '', payload = {}) {
  const tutorial = tutorialState();
  if (!tutorial?.active) return false;
  const currentStep = tutorialCurrentStep();
  if (!currentStep || !currentStep.triggerEvent) return false;
  if (currentStep.triggerEvent !== eventId) return false;
  tutorial.canAdvance = tutorialStepAllowsKeyboardAdvance(currentStep);
  tutorial.waitingForEvent = '';
  tutorial.lastEvent = { id: eventId, payload };
  syncTutorialForcedPause(currentStep);
  if (tutorialAdvanceMode(currentStep) === 'event') {
    advanceTutorial();
    return true;
  }
  renderTutorialAuthoring();
  return true;
}

function tutorialAnchorEntries() {
  return Array.from(document.querySelectorAll('[data-tutorial-anchor]')).map((node) => ({
    value: String(node.dataset.tutorialAnchor || '').trim(),
    label: String(node.dataset.tutorialAnchorLabel || node.dataset.tutorialAnchor || '').trim(),
    node,
  })).filter((entry) => entry.value);
}

function tutorialAnchorElement(anchorKey = '') {
  return tutorialAnchorEntries().find((entry) => entry.value === anchorKey)?.node || null;
}

function tutorialAnchorRect(anchorKey = '') {
  const node = tutorialAnchorElement(anchorKey);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return rect;
}

function getTutorialAuthoringToggle() { return byId('tutorial-authoring-toggle'); }
function getTutorialAuthoringPanel() { return byId('tutorial-authoring-panel'); }
function getTutorialAuthoringMinimizeButton() { return byId('tutorial-authoring-minimize'); }
function getTutorialAuthoringMaximizeButton() { return byId('tutorial-authoring-maximize'); }
function getTutorialAuthoringPrevMiniButton() { return byId('tutorial-authoring-prev-mini'); }
function getTutorialAuthoringNextMiniButton() { return byId('tutorial-authoring-next-mini'); }
function getTutorialAuthoringStepSelect() { return byId('tutorial-authoring-step'); }
function getTutorialAuthoringTargetSelect() { return byId('tutorial-authoring-target'); }
function getTutorialAuthoringAdvanceModeSelect() { return byId('tutorial-authoring-advance-mode'); }
function getTutorialAuthoringTitleInput() { return byId('tutorial-authoring-title'); }
function getTutorialAuthoringBodyInput() { return byId('tutorial-authoring-body'); }
function getTutorialAuthoringHintInput() { return byId('tutorial-authoring-hint'); }
function getTutorialAuthoringFocusStyleSelect() { return byId('tutorial-authoring-focus-style'); }
function getTutorialAuthoringClickLabelInput() { return byId('tutorial-authoring-click-label'); }
function getTutorialAuthoringBadgePositionSelect() { return byId('tutorial-authoring-badge-position'); }
function getTutorialAuthoringXInput() { return byId('tutorial-authoring-x'); }
function getTutorialAuthoringYInput() { return byId('tutorial-authoring-y'); }
function getTutorialAuthoringWidthInput() { return byId('tutorial-authoring-width'); }
function getTutorialAuthoringHeightInput() { return byId('tutorial-authoring-height'); }
function getTutorialAuthoringJsonOutput() { return byId('tutorial-authoring-json'); }
function getTutorialAuthoringStatus() { return byId('tutorial-authoring-status'); }
function getTutorialPreviewLayer() { return byId('tutorial-preview-layer'); }
function getTutorialTargetHighlight() { return byId('tutorial-target-highlight'); }
function getTutorialTargetConnector() { return byId('tutorial-target-connector'); }
function getTutorialTargetBadge() { return byId('tutorial-target-badge'); }
function getTutorialPreviewCard() { return byId('tutorial-preview-card'); }
function getTutorialPreviewDragHandle() { return byId('tutorial-preview-drag'); }
function getTutorialPreviewResizeHandle() { return byId('tutorial-preview-resize'); }
function getTutorialPreviewSkipButton() { return byId('tutorial-preview-skip'); }
function getTutorialPreviewModeLabel() { return byId('tutorial-preview-mode-label'); }

function setTutorialAuthoringOpen(visible) {
  if (!tutorialIsAuthoringMode()) return;
  const editor = tutorialAuthoringState();
  if (!editor) return;
  editor.open = Boolean(visible);
  if (editor.open && !editor.selectedStepId) {
    editor.selectedStepId = tutorialSteps()[0]?.id || '';
  }
  if (!editor.open) {
    editor.minimized = false;
  }
  writeTutorialAuthoringUiConfig();
  renderTutorialAuthoring();
}

function setTutorialAuthoringMinimized(visible) {
  if (!tutorialIsAuthoringMode()) return;
  const editor = tutorialAuthoringState();
  if (!editor) return;
  editor.minimized = Boolean(visible);
  if (editor.minimized) {
    editor.maximized = false;
  }
  writeTutorialAuthoringUiConfig();
  renderTutorialAuthoring();
}

function setTutorialAuthoringMaximized(visible) {
  if (!tutorialIsAuthoringMode()) return;
  const editor = tutorialAuthoringState();
  if (!editor) return;
  editor.maximized = Boolean(visible);
  if (editor.maximized) {
    editor.minimized = false;
  }
  writeTutorialAuthoringUiConfig();
  renderTutorialAuthoring();
}

function cycleTutorialAuthoringStep(direction = 1) {
  if (!tutorialIsAuthoringMode()) return;
  const steps = tutorialSteps();
  const editor = tutorialAuthoringState();
  if (!steps.length || !editor) return;
  const currentIndex = Math.max(0, tutorialStepIndex(editor.selectedStepId));
  const nextIndex = Math.min(steps.length - 1, Math.max(0, currentIndex + direction));
  editor.selectedStepId = steps[nextIndex].id;
  setTutorialStep(editor.selectedStepId);
  renderTutorialAuthoring();
}

function setTutorialAuthoringStatus(message = '') {
  const editor = tutorialAuthoringState();
  if (!editor) return;
  editor.status = String(message || '');
}

function restoreTutorialAuthoringAutosaveStatus() {
  const editor = tutorialAuthoringState();
  if (!editor) return;
  editor.status = tutorialSavedLabel(editor.lastSavedAt);
}

function updateTutorialAuthoringField(field, value) {
  if (!tutorialIsAuthoringMode()) return;
  const step = currentEditedTutorialStep();
  if (!step) return;
  step[field] = String(value || '');
  if (field === 'target') {
    setTutorialStep(step.id);
  }
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

function updateTutorialAuthoringCardField(field, value) {
  if (!tutorialIsAuthoringMode()) return;
  const step = currentEditedTutorialStep();
  if (!step) return;
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return;
  if (field === 'width') step.card.width = Math.max(260, Math.round(numeric));
  else if (field === 'height') step.card.height = Math.max(180, Math.round(numeric));
  else step.card[field] = Math.max(0, Math.round(numeric));
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

function resetTutorialAuthoringCurrentStep() {
  if (!tutorialIsAuthoringMode()) return;
  const tutorial = tutorialState();
  const editor = tutorialAuthoringState();
  const current = currentEditedTutorialStep();
  const fallback = defaultTutorialStepById(current?.id || '');
  if (!tutorial || !editor || !current || !fallback) return;
  const index = tutorialStepIndex(current.id);
  tutorial.steps[index] = cloneTutorialStepDefinition(fallback);
  editor.selectedStepId = fallback.id;
  setTutorialAuthoringStatus('Passo resetado para o padrao.');
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

function resetTutorialAuthoringAllSteps() {
  if (!tutorialIsAuthoringMode()) return;
  const tutorial = tutorialState();
  const editor = tutorialAuthoringState();
  if (!tutorial || !editor) return;
  tutorial.steps = GAME_V3_DEFAULT_TUTORIAL_STEPS.map((step) => cloneTutorialStepDefinition(step));
  editor.selectedStepId = tutorial.steps[0]?.id || '';
  setTutorialAuthoringStatus('Todos os passos voltaram ao padrao.');
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

function insertTutorialAuthoringStep({ duplicate = false } = {}) {
  if (!tutorialIsAuthoringMode()) return;
  const tutorial = tutorialState();
  const editor = tutorialAuthoringState();
  const current = currentEditedTutorialStep();
  if (!tutorial || !editor) return;
  const steps = tutorialSteps();
  const currentIndex = current ? tutorialStepIndex(current.id) : (steps.length - 1);
  const insertIndex = Math.max(0, currentIndex + 1);
  const newStep = duplicate && current
    ? createTutorialAuthoringStep({
      ...tutorialStepSnapshot(current, insertIndex),
      id: '',
      title: `${current.title} (copia)`,
      card: {
        ...(current.card || defaultTutorialCardLayout(insertIndex)),
        x: Math.round((current.card?.x || 0) + 28),
        y: Math.round((current.card?.y || 0) + 28),
      },
    }, steps)
    : createTutorialAuthoringStep({
      title: 'Novo passo intermediario',
      target: current?.target || '',
      focusStyle: current?.focusStyle || 'frame',
      badgePosition: current?.badgePosition || 'auto',
      card: current
        ? {
          ...(current.card || defaultTutorialCardLayout(insertIndex)),
          x: Math.round((current.card?.x || 0) + 28),
          y: Math.round((current.card?.y || 0) + 28),
        }
        : defaultTutorialCardLayout(insertIndex),
    }, steps);
  tutorial.steps.splice(insertIndex, 0, newStep);
  editor.selectedStepId = newStep.id;
  setTutorialAuthoringStatus(duplicate ? 'Passo duplicado.' : 'Novo passo inserido.');
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

function moveTutorialAuthoringStep(offset = 0) {
  if (!tutorialIsAuthoringMode()) return;
  const tutorial = tutorialState();
  const editor = tutorialAuthoringState();
  const current = currentEditedTutorialStep();
  if (!tutorial || !editor || !current || !offset) return;
  const steps = tutorialSteps();
  const fromIndex = tutorialStepIndex(current.id);
  const toIndex = Math.max(0, Math.min(steps.length - 1, fromIndex + offset));
  if (fromIndex === toIndex) return;
  const [step] = tutorial.steps.splice(fromIndex, 1);
  tutorial.steps.splice(toIndex, 0, step);
  editor.selectedStepId = step.id;
  setTutorialAuthoringStatus(offset < 0 ? 'Passo movido para cima.' : 'Passo movido para baixo.');
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

function deleteTutorialAuthoringCurrentStep() {
  if (!tutorialIsAuthoringMode()) return;
  const tutorial = tutorialState();
  const editor = tutorialAuthoringState();
  const current = currentEditedTutorialStep();
  if (!tutorial || !editor || !current) return;
  if (tutorial.steps.length <= 1) {
    setTutorialAuthoringStatus('Nao e possivel excluir o ultimo passo.');
    renderTutorialAuthoring();
    return;
  }
  const index = tutorialStepIndex(current.id);
  tutorial.steps.splice(index, 1);
  const fallback = tutorial.steps[Math.min(index, tutorial.steps.length - 1)] || tutorial.steps[0] || null;
  editor.selectedStepId = fallback?.id || '';
  setTutorialAuthoringStatus('Passo excluido. A numeracao foi recalculada automaticamente.');
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

async function copyTutorialAuthoringJson() {
  if (!tutorialIsAuthoringMode()) return;
  const output = getTutorialAuthoringJsonOutput();
  const text = String(output?.value || '');
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setTutorialAuthoringStatus('JSON copiado para a area de transferencia.');
    } else {
      setTutorialAuthoringStatus('Clipboard indisponivel neste navegador.');
    }
  } catch (_error) {
    setTutorialAuthoringStatus('Nao foi possivel copiar o JSON automaticamente.');
  }
  renderTutorialAuthoring();
}

function tutorialRectCenter(rect) {
  return {
    x: rect.left + (rect.width / 2),
    y: rect.top + (rect.height / 2),
  };
}

function tutorialBadgePlacement(rect, badgePosition = 'auto') {
  const margin = 12;
  const positions = {
    top: {
      left: Math.round(rect.left + (rect.width / 2) - 70),
      top: Math.round(rect.top - 46),
    },
    right: {
      left: Math.round(rect.left + rect.width + margin),
      top: Math.round(rect.top + (rect.height / 2) - 18),
    },
    bottom: {
      left: Math.round(rect.left + (rect.width / 2) - 70),
      top: Math.round(rect.top + rect.height + margin),
    },
    left: {
      left: Math.round(rect.left - 154),
      top: Math.round(rect.top + (rect.height / 2) - 18),
    },
  };
  const placement = positions[badgePosition] || positions.right;
  return {
    left: Math.max(12, placement.left),
    top: Math.max(12, placement.top),
  };
}

function renderTutorialAuthoring() {
  const editor = tutorialAuthoringState();
  const panel = getTutorialAuthoringPanel();
  const minimizeButton = getTutorialAuthoringMinimizeButton();
  const maximizeButton = getTutorialAuthoringMaximizeButton();
  const closeButton = byId('tutorial-authoring-close');
  const toggle = getTutorialAuthoringToggle();
  const previewLayer = getTutorialPreviewLayer();
  const previewCard = getTutorialPreviewCard();
  const highlight = getTutorialTargetHighlight();
  const connector = getTutorialTargetConnector();
  const badge = getTutorialTargetBadge();
  const output = getTutorialAuthoringJsonOutput();
  const status = getTutorialAuthoringStatus();
  const skipButton = getTutorialPreviewSkipButton();
  const modeLabel = getTutorialPreviewModeLabel();
  if (!editor || !panel || !toggle || !previewLayer || !previewCard || !highlight || !connector || !badge) return;

  const isAuthoringMode = tutorialIsAuthoringMode();
  const isRuntimeMode = tutorialIsRuntimeMode();
  const tutorial = tutorialState();

  const steps = tutorialSteps();
  if (!editor.selectedStepId) {
    editor.selectedStepId = steps[0]?.id || '';
  }
  const step = isAuthoringMode ? currentEditedTutorialStep() : tutorialCurrentStep();
  toggle.hidden = !isAuthoringMode;
  toggle.setAttribute('aria-hidden', isAuthoringMode ? 'false' : 'true');
  toggle.style.display = isAuthoringMode ? '' : 'none';
  panel.classList.toggle('is-hidden', !isAuthoringMode || !editor.open);
  panel.classList.toggle('is-minimized', Boolean(editor.minimized));
  panel.classList.toggle('is-maximized', Boolean(editor.maximized));
  panel.setAttribute('aria-hidden', isAuthoringMode && editor.open ? 'false' : 'true');
  toggle.classList.toggle('is-active', isAuthoringMode && editor.open);
  toggle.setAttribute('aria-expanded', isAuthoringMode && editor.open ? 'true' : 'false');
  toggle.textContent = isAuthoringMode && editor.open ? 'Fechar editor' : 'Editor de Tutorial';
  if (minimizeButton) {
    minimizeButton.textContent = editor.minimized ? '+' : '_';
    minimizeButton.setAttribute('aria-label', editor.minimized ? 'Restaurar editor do tutorial' : 'Minimizar editor do tutorial');
    minimizeButton.title = editor.minimized ? 'Restaurar editor' : 'Minimizar editor';
  }
  if (maximizeButton) {
    maximizeButton.textContent = editor.maximized ? '▣' : '□';
    maximizeButton.setAttribute('aria-label', editor.maximized ? 'Restaurar tamanho do editor do tutorial' : 'Maximizar editor do tutorial');
    maximizeButton.title = editor.maximized ? 'Restaurar tamanho' : 'Maximizar editor';
  }
  if (closeButton) {
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Fechar editor do tutorial');
    closeButton.title = 'Fechar editor do tutorial';
  }

  previewCard.classList.toggle('is-runtime', isRuntimeMode);
  previewCard.classList.toggle('is-authoring', isAuthoringMode);
  if (skipButton) {
    skipButton.hidden = !isRuntimeMode;
    skipButton.setAttribute('aria-hidden', isRuntimeMode ? 'false' : 'true');
  }
  if (modeLabel) {
    modeLabel.hidden = !isAuthoringMode;
    modeLabel.textContent = 'Arraste para reposicionar';
  }
  if (getTutorialPreviewDragHandle()) {
    getTutorialPreviewDragHandle().classList.toggle('is-runtime', isRuntimeMode);
  }
  const headerActions = getTutorialPreviewSkipButton()?.parentElement || null;
  if (headerActions) {
    headerActions.classList.toggle('is-authoring', isAuthoringMode);
  }
  if (getTutorialPreviewResizeHandle()) {
    getTutorialPreviewResizeHandle().hidden = isRuntimeMode;
    getTutorialPreviewResizeHandle().setAttribute('aria-hidden', isRuntimeMode ? 'true' : 'false');
  }

  const shouldShowPreview = isAuthoringMode
    ? Boolean(editor.open && step)
    : Boolean(tutorial?.active && step && !tutorial.waitingForEvent);
  if (!shouldShowPreview) {
    previewLayer.classList.add('is-hidden');
    highlight.classList.add('is-hidden');
    connector.classList.add('is-hidden');
    badge.classList.add('is-hidden');
    return;
  }

  const stepSelect = getTutorialAuthoringStepSelect();
  const targetSelect = getTutorialAuthoringTargetSelect();
  const advanceModeSelect = getTutorialAuthoringAdvanceModeSelect();
  const titleInput = getTutorialAuthoringTitleInput();
  const bodyInput = getTutorialAuthoringBodyInput();
  const hintInput = getTutorialAuthoringHintInput();
  const focusStyleSelect = getTutorialAuthoringFocusStyleSelect();
  const clickLabelInput = getTutorialAuthoringClickLabelInput();
  const badgePositionSelect = getTutorialAuthoringBadgePositionSelect();
  const xInput = getTutorialAuthoringXInput();
  const yInput = getTutorialAuthoringYInput();
  const widthInput = getTutorialAuthoringWidthInput();
  const heightInput = getTutorialAuthoringHeightInput();
  const anchors = tutorialAnchorEntries();

  if (stepSelect && isAuthoringMode) {
    stepSelect.innerHTML = steps.map((item, index) => (
      `<option value="${escapeHtml(item.id)}"${item.id === step.id ? ' selected' : ''}>${String(index + 1).padStart(2, '0')} - ${escapeHtml(item.title || item.id)}</option>`
    )).join('');
  }
  if (targetSelect && isAuthoringMode) {
    targetSelect.innerHTML = [`<option value="">Sem destaque</option>`].concat(
      anchors.map((anchor) => `<option value="${escapeHtml(anchor.value)}"${anchor.value === step.target ? ' selected' : ''}>${escapeHtml(anchor.label || anchor.value)}</option>`),
    ).join('');
  }
  if (advanceModeSelect && isAuthoringMode) {
    advanceModeSelect.value = tutorialAdvanceMode(step);
  }
  if (titleInput && isAuthoringMode) titleInput.value = step.title;
  if (bodyInput && isAuthoringMode) bodyInput.value = step.body;
  if (hintInput && isAuthoringMode) hintInput.value = step.hint;
  if (focusStyleSelect && isAuthoringMode) focusStyleSelect.value = step.focusStyle || 'frame';
  if (clickLabelInput && isAuthoringMode) clickLabelInput.value = step.clickLabel || '';
  if (badgePositionSelect && isAuthoringMode) badgePositionSelect.value = step.badgePosition || 'auto';
  if (xInput && isAuthoringMode) xInput.value = String(Math.round(step.card.x));
  if (yInput && isAuthoringMode) yInput.value = String(Math.round(step.card.y));
  if (widthInput && isAuthoringMode) widthInput.value = String(Math.round(step.card.width));
  if (heightInput && isAuthoringMode) heightInput.value = String(Math.round(step.card.height));
  if (output && isAuthoringMode) {
    output.value = JSON.stringify(tutorialAuthoringPayloadSnapshot(), null, 2);
  }
  if (status && isAuthoringMode) {
    status.textContent = editor.status || tutorialSavedLabel(editor.lastSavedAt);
  }

  previewLayer.classList.remove('is-hidden');
  previewCard.style.left = `${Math.round(step.card.x)}px`;
  previewCard.style.top = `${Math.round(step.card.y)}px`;
  previewCard.style.width = `${Math.round(step.card.width)}px`;
  previewCard.style.minHeight = `${Math.round(step.card.height)}px`;
  const stepNumber = Math.max(1, tutorialStepIndex(step.id) + 1);
  setText('tutorial-preview-step', `Passo ${String(stepNumber).padStart(2, '0')}/${String(Math.max(1, steps.length)).padStart(2, '0')}`);
  setText('tutorial-preview-title', step.title || 'Sem titulo');
  setText('tutorial-preview-body', step.body || 'Sem texto principal.');
  setText('tutorial-preview-hint', step.hint || '');

  const rect = tutorialAnchorRect(step.target || tutorialCurrentStep()?.target || '');
  highlight.classList.remove('is-pulse', 'is-button', 'is-beacon');
  connector.classList.remove('is-button', 'is-beacon');
  badge.classList.remove('is-button', 'is-beacon');
  if (rect) {
    highlight.classList.remove('is-hidden');
    const isBeacon = step.focusStyle === 'beacon';
    const isButtonStyle = step.focusStyle === 'button';
    const focusPadding = 10 + (isButtonStyle ? 6 : 0);
    const left = isBeacon ? Math.round(rect.left + (rect.width / 2) - 38) : Math.round(rect.left - focusPadding);
    const top = isBeacon ? Math.round(rect.top + (rect.height / 2) - 38) : Math.round(rect.top - focusPadding);
    const width = isBeacon ? 76 : Math.round(rect.width + (focusPadding * 2));
    const height = isBeacon ? 76 : Math.round(rect.height + (focusPadding * 2));
    highlight.style.left = `${left}px`;
    highlight.style.top = `${top}px`;
    highlight.style.width = `${width}px`;
    highlight.style.height = `${height}px`;
    if (step.focusStyle === 'pulse') highlight.classList.add('is-pulse');
    if (isButtonStyle) highlight.classList.add('is-button');
    if (isBeacon) highlight.classList.add('is-beacon');

    const showConnector = ['button', 'beacon', 'pulse'].includes(step.focusStyle);
    if (showConnector) {
      connector.classList.remove('is-hidden');
      if (isButtonStyle) connector.classList.add('is-button');
      if (isBeacon) connector.classList.add('is-beacon');
      const cardRect = {
        left: step.card.x,
        top: step.card.y,
        width: step.card.width,
        height: step.card.height,
      };
      const cardCenter = tutorialRectCenter(cardRect);
      const targetCenter = tutorialRectCenter({ left, top, width, height });
      const deltaX = targetCenter.x - cardCenter.x;
      const deltaY = targetCenter.y - cardCenter.y;
      const distance = Math.max(0, Math.sqrt((deltaX ** 2) + (deltaY ** 2)) - 28);
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      connector.style.left = `${Math.round(cardCenter.x)}px`;
      connector.style.top = `${Math.round(cardCenter.y)}px`;
      connector.style.width = `${Math.round(distance)}px`;
      connector.style.transform = `rotate(${angle}deg)`;
    } else {
      connector.classList.add('is-hidden');
    }

    const clickLabel = String(step.clickLabel || '').trim();
    const showBadge = Boolean(clickLabel);
    if (showBadge) {
      badge.classList.remove('is-hidden');
      if (isButtonStyle) badge.classList.add('is-button');
      if (isBeacon) badge.classList.add('is-beacon');
      badge.textContent = clickLabel;
      const placement = tutorialBadgePlacement(rect, step.badgePosition || 'auto');
      badge.style.top = `${placement.top}px`;
      badge.style.left = `${placement.left}px`;
    } else {
      badge.classList.add('is-hidden');
    }
  } else {
    highlight.classList.add('is-hidden');
    connector.classList.add('is-hidden');
    badge.classList.add('is-hidden');
  }
}

function beginTutorialAuthoringManipulation(event, mode = 'move') {
  if (!tutorialIsAuthoringMode()) return;
  const editor = tutorialAuthoringState();
  const step = currentEditedTutorialStep();
  if (!editor || !step) return;
  event.preventDefault();
  event.stopPropagation();
  editor.dragMode = mode;
  editor.startX = event.clientX;
  editor.startY = event.clientY;
  editor.startCard = { ...(step.card || {}) };
}

function updateTutorialAuthoringManipulation(event) {
  if (!tutorialIsAuthoringMode()) return;
  const editor = tutorialAuthoringState();
  const step = currentEditedTutorialStep();
  if (!editor?.dragMode || !step || !editor.startCard) return;
  const deltaX = event.clientX - editor.startX;
  const deltaY = event.clientY - editor.startY;
  if (editor.dragMode === 'move') {
    step.card.x = Math.max(0, Math.round(editor.startCard.x + deltaX));
    step.card.y = Math.max(0, Math.round(editor.startCard.y + deltaY));
  } else if (editor.dragMode === 'resize') {
    step.card.width = Math.max(260, Math.round(editor.startCard.width + deltaX));
    step.card.height = Math.max(180, Math.round(editor.startCard.height + deltaY));
  }
  renderTutorialAuthoring();
}

function endTutorialAuthoringManipulation() {
  if (!tutorialIsAuthoringMode()) return;
  const editor = tutorialAuthoringState();
  if (!editor?.dragMode) return;
  editor.dragMode = '';
  editor.startCard = null;
  writeTutorialAuthoringConfig();
  renderTutorialAuthoring();
}

function aiProfilesLib() {
  return window.RdMAiProfiles || null;
}

function aiPolicyEngine() {
  return window.RdMAiPolicyEngine || null;
}

function aiSetupDefaults(setupDefaults = {}) {
  const slotCount = Math.max(0, Number(setupDefaults.robot_count || setupDefaults.rival_count || state?.setup?.rivalCount || 0));
  const resolvedMode = normalizeAiProfileModeId(setupDefaults.ai_profile_mode || 'balanced');
  const manualConfigs = normalizeManualRobotConfigs(setupDefaults.ai_manual_robot_configs || {}, slotCount);
  const manualProfiles = normalizeManualRobotProfiles(
    setupDefaults.ai_manual_profiles || manualProfileIdsFromConfigs(manualConfigs),
    slotCount,
  );
  return {
    aiDifficulty: String(setupDefaults.ai_difficulty || 'normal'),
    aiProfileMode: resolvedMode,
    aiProfileOrder: buildSetupProfileOrder(resolvedMode, setupDefaults.ai_profile_order || []),
    aiAdvancedProfiles: Boolean(setupDefaults.ai_advanced_profiles),
    aiManualProfiles: manualProfiles,
    aiManualRobotConfigs: manualConfigs,
  };
}

function buildAiSetupDefaults(setupDefaults = {}, overrides = {}) {
  const merged = { ...setupDefaults, ...overrides };
  const resolved = aiSetupDefaults(merged);
  const slotCount = Math.max(0, Number(merged.robot_count || merged.rival_count || state?.setup?.rivalCount || 0));
  return {
    ...merged,
    ai_difficulty: resolved.aiDifficulty,
    ai_profile_mode: resolved.aiProfileMode,
    ai_profile_order: resolved.aiProfileOrder,
    ai_advanced_profiles: resolved.aiAdvancedProfiles,
    ai_manual_profiles: resolved.aiAdvancedProfiles
      ? serializeManualRobotProfiles(resolved.aiManualProfiles, slotCount)
      : [],
    ai_manual_robot_configs: resolved.aiAdvancedProfiles
      ? serializeManualRobotConfigs(resolved.aiManualRobotConfigs, slotCount)
      : [],
  };
}

function aiDifficultyOption(id = 'normal') {
  return AI_DIFFICULTY_OPTIONS.find((entry) => entry.id === id) || AI_DIFFICULTY_OPTIONS[1];
}

function aiProfileModeOption(id = 'balanced') {
  const resolvedId = normalizeAiProfileModeId(id);
  return AI_PROFILE_MODE_OPTIONS.find((entry) => entry.id === resolvedId) || AI_PROFILE_MODE_OPTIONS[0];
}

function aiBasicProfileModeBlueprint(mode = 'balanced', rawOrder = null) {
  const resolvedMode = normalizeAiProfileModeId(mode);
  const explicitOrder = normalizeAiProfileOrder(rawOrder);
  if (resolvedMode === 'random') {
    return {
      order: explicitOrder.length ? explicitOrder : shuffleArray(AI_BASIC_PROFILE_MODE_ORDERS.random),
      marketCaseId: '',
    };
  }
  return {
    order: explicitOrder.length ? explicitOrder : [...(AI_BASIC_PROFILE_MODE_ORDERS[resolvedMode] || AI_BASIC_PROFILE_MODE_ORDERS.balanced)],
    marketCaseId: resolvedMode === 'closed_market'
      ? 'sell_nothing'
      : (resolvedMode === 'liquid_market' ? 'sell_everything' : ''),
  };
}

function aiProfileOrderForMode(mode = 'balanced') {
  return [...aiBasicProfileModeBlueprint(mode).order];
}

function normalizeAiProfileOrder(rawOrder = null) {
  if (!Array.isArray(rawOrder)) return [];
  const allowed = new Set(AI_BASE_ARCHETYPE_ORDER);
  return rawOrder
    .map((entry) => String(entry || '').trim())
    .filter((entry) => allowed.has(entry));
}

function buildSetupProfileOrder(mode = 'balanced', rawOrder = null) {
  return [...aiBasicProfileModeBlueprint(mode, rawOrder).order];
}

function aiProfileModeMarketCaseId(mode = 'balanced') {
  return aiBasicProfileModeBlueprint(mode).marketCaseId;
}

function syncSetupProfileOrder(mode = state.setup.aiProfileMode, rawOrder = null) {
  const order = buildSetupProfileOrder(mode, rawOrder);
  state.setup.aiProfileOrder = order;
  return order;
}

function clampAiSetting(value, min, max, step = 0.01) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return min;
  const safeStep = step > 0 ? step : 0.01;
  const rounded = Math.round(numericValue / safeStep) * safeStep;
  const decimals = String(safeStep).includes('.') ? String(safeStep).split('.')[1].length : 0;
  return Math.min(max, Math.max(min, Number(rounded.toFixed(decimals))));
}

function normalizeManualRobotProfiles(rawProfiles = null, slotCount = 0) {
  const normalized = {};
  if (Array.isArray(rawProfiles)) {
    rawProfiles.forEach((value, index) => {
      if (index >= slotCount) return;
      const resolved = String(value || '').trim();
      if (resolved) normalized[index] = resolved;
    });
    return normalized;
  }
  if (rawProfiles && typeof rawProfiles === 'object') {
    Object.entries(rawProfiles).forEach(([key, value]) => {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= slotCount) return;
      const resolved = String(value || '').trim();
      if (resolved) normalized[index] = resolved;
    });
  }
  return normalized;
}

function serializeManualRobotProfiles(rawProfiles = state.setup.manualRobotProfiles, slotCount = 0) {
  const normalized = normalizeManualRobotProfiles(rawProfiles, slotCount);
  return Array.from({ length: slotCount }, (_, index) => String(normalized[index] || ''));
}

function aiArchetypeById(id = '') {
  return aiProfilesLib()?.archetypes?.[String(id || '').trim()] || null;
}

function aiSkillPresetForDifficulty(difficultyId = state.setup.aiDifficulty) {
  const option = aiDifficultyOption(difficultyId);
  return cloneAiData(aiProfilesLib()?.skillPresets?.[option.skillPresetId] || null);
}

function buildManualRobotConfig(archetypeId = 'balanced_trader', { difficultyId = state.setup.aiDifficulty } = {}) {
  const resolvedArchetype = aiArchetypeById(archetypeId) ? archetypeId : 'balanced_trader';
  const baseProfile = aiProfilesLib()?.buildProfile
    ? aiProfilesLib().buildProfile({ archetypeId: resolvedArchetype })
    : null;
  const defaultNegotiationPreset = aiPresetByGroupAndId('negotiation', aiDefaultPresetIdForGroup('negotiation'));
  const defaultVisionPreset = aiPresetByGroupAndId('vision', aiDefaultPresetIdForGroup('vision'));
  const defaultPersonalityPreset = aiPresetByGroupAndId('personality', aiDefaultPresetIdForGroup('personality'));
  const defaultSkillPreset = aiPresetByGroupAndId('skill', aiDefaultPresetIdForGroup('skill'));
  return {
    archetypeId: resolvedArchetype,
    overrides: {
      negotiation: cloneAiData(defaultNegotiationPreset?.values || baseProfile?.negotiation || {}),
      vision: cloneAiData(defaultVisionPreset?.values || baseProfile?.vision || {}),
      personality: cloneAiData(defaultPersonalityPreset?.values || baseProfile?.personality || {}),
      skill: cloneAiData(defaultSkillPreset?.values || aiSkillPresetForDifficulty(difficultyId) || baseProfile?.skill || {}),
      metadata: {
        ...(cloneAiData(baseProfile?.metadata || {}) || {}),
        negotiation_preset_id: '',
        vision_preset_id: '',
        personality_preset_id: '',
        skill_preset_id: '',
        setup_customized: true,
        setup_archetype_id: resolvedArchetype,
      },
    },
  };
}

function normalizeManualRobotConfig(rawConfig = null, slotIndex = 0) {
  if (!rawConfig || typeof rawConfig !== 'object') return null;
  const archetypeId = aiArchetypeById(rawConfig.archetypeId || rawConfig.profileId || rawConfig.id || defaultSetupArchetypeIdForSlot(slotIndex))
    ? String(rawConfig.archetypeId || rawConfig.profileId || rawConfig.id || defaultSetupArchetypeIdForSlot(slotIndex))
    : defaultSetupArchetypeIdForSlot(slotIndex);
  const seeded = buildManualRobotConfig(archetypeId);
  const source = rawConfig.overrides && typeof rawConfig.overrides === 'object'
    ? rawConfig.overrides
    : rawConfig;
  AI_PROFILE_PARAMETER_GROUPS.forEach((group) => {
    const sourceGroup = source[group.key] && typeof source[group.key] === 'object' ? source[group.key] : {};
    group.fields.forEach((field) => {
      if (sourceGroup[field.key] === undefined) return;
      seeded.overrides[group.key][field.key] = clampAiSetting(sourceGroup[field.key], field.min, field.max, field.step);
    });
  });
  seeded.overrides.metadata = {
    ...(seeded.overrides.metadata || {}),
    ...(source.metadata && typeof source.metadata === 'object' ? cloneAiData(source.metadata) : {}),
    setup_customized: true,
    setup_archetype_id: archetypeId,
  };
  return seeded;
}

function normalizeManualRobotConfigs(rawConfigs = null, slotCount = 0) {
  const normalized = {};
  if (Array.isArray(rawConfigs)) {
    rawConfigs.forEach((value, index) => {
      if (index >= slotCount) return;
      const config = normalizeManualRobotConfig(value, index);
      if (config) normalized[index] = config;
    });
    return normalized;
  }
  if (rawConfigs && typeof rawConfigs === 'object') {
    Object.entries(rawConfigs).forEach(([key, value]) => {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= slotCount) return;
      const config = normalizeManualRobotConfig(value, index);
      if (config) normalized[index] = config;
    });
  }
  return normalized;
}

function serializeManualRobotConfigs(rawConfigs = state.setup.manualRobotConfigs, slotCount = 0) {
  const normalized = normalizeManualRobotConfigs(rawConfigs, slotCount);
  return Array.from({ length: slotCount }, (_, index) => normalized[index] ? cloneAiData(normalized[index]) : null);
}

function manualProfileIdsFromConfigs(configs = {}) {
  const resolved = {};
  Object.entries(configs || {}).forEach(([key, config]) => {
    if (config?.archetypeId) resolved[key] = config.archetypeId;
  });
  return resolved;
}

function aiArchetypeSetupOptions() {
  return Object.values(aiProfilesLib()?.archetypes || {})
    .map((entry) => ({ id: entry.id, label: entry.label, description: entry.description || '' }))
    .filter((entry) => entry && entry.id && entry.id !== 'legacy_open');
}

function setupRobotSlotCount() {
  return Math.max(0, Number(state.setup.rivalCount || 0));
}

function pruneManualRobotProfiles(slotCount = setupRobotSlotCount()) {
  state.setup.manualRobotProfiles = normalizeManualRobotProfiles(state.setup.manualRobotProfiles, slotCount);
  state.setup.manualRobotConfigs = normalizeManualRobotConfigs(state.setup.manualRobotConfigs, slotCount);
  return state.setup.manualRobotProfiles;
}

function defaultSetupArchetypeIdForSlot(slotIndex = 0) {
  const order = Array.isArray(state.setup.aiProfileOrder) && state.setup.aiProfileOrder.length
    ? state.setup.aiProfileOrder
    : syncSetupProfileOrder(state.setup.aiProfileMode);
  return order[Math.max(0, slotIndex) % order.length] || 'balanced_trader';
}

function persistSetupRobotConfig(slotIndex = 0, config = null) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0) return null;
  const normalized = normalizeManualRobotConfig(config, slotIndex);
  if (!normalized) {
    delete state.setup.manualRobotConfigs[slotIndex];
    delete state.setup.manualRobotProfiles[slotIndex];
    return null;
  }
  state.setup.manualRobotConfigs[slotIndex] = normalized;
  state.setup.manualRobotProfiles[slotIndex] = normalized.archetypeId;
  applyCurrentAiSetupToRunningGame({ refreshUi: false });
  return normalized;
}

function ensureSetupRobotConfig(slotIndex = 0) {
  const existing = normalizeManualRobotConfig(state.setup.manualRobotConfigs?.[slotIndex], slotIndex);
  if (existing) {
    state.setup.manualRobotConfigs[slotIndex] = existing;
    state.setup.manualRobotProfiles[slotIndex] = existing.archetypeId;
    return existing;
  }
  return persistSetupRobotConfig(slotIndex, buildManualRobotConfig(defaultSetupArchetypeIdForSlot(slotIndex)));
}

function seedSetupRobotConfigs(slotCount = setupRobotSlotCount()) {
  const resolvedSlotCount = Math.max(0, Number(slotCount || 0));
  for (let index = 0; index < resolvedSlotCount; index += 1) {
    ensureSetupRobotConfig(index);
  }
}

function resetSetupRobotConfig(slotIndex = 0) {
  delete state.setup.manualRobotConfigs[slotIndex];
  delete state.setup.manualRobotProfiles[slotIndex];
}

function applyManualProfilesToPlayers(players = [], setupDefaults = {}) {
  const robots = (players || []).filter((player) => !player?.is_human);
  const incomingManualConfigs = normalizeManualRobotConfigs(
    setupDefaults.ai_manual_robot_configs || state.setup.manualRobotConfigs,
    robots.length,
  );
  const profileSource = setupDefaults.ai_manual_profiles !== undefined
    ? setupDefaults.ai_manual_profiles
    : (Object.keys(incomingManualConfigs).length ? manualProfileIdsFromConfigs(incomingManualConfigs) : state.setup.manualRobotProfiles);
  const incomingManualProfiles = normalizeManualRobotProfiles(profileSource, robots.length);
  const useManualProfiles = Boolean(setupDefaults.ai_advanced_profiles);
  const effectiveConfigs = {};
  const effectiveProfiles = {};

  robots.forEach((player, index) => {
    const fallbackProfileId = String(incomingManualProfiles[index] || '').trim();
    const resolvedConfig = normalizeManualRobotConfig(
      incomingManualConfigs[index] || (fallbackProfileId ? { archetypeId: fallbackProfileId } : null),
      index,
    );
    if (useManualProfiles && resolvedConfig) {
      effectiveConfigs[index] = resolvedConfig;
      effectiveProfiles[index] = resolvedConfig.archetypeId;
      player.ai_manual_profile = true;
      player.ai_archetype_id = resolvedConfig.archetypeId;
      player.ai_profile_overrides = cloneAiData(resolvedConfig.overrides || {});
      player.ai_profile = null;
      player.ai_profile_id = '';
      player.ai_profile_label = '';
      return;
    }
    player.ai_manual_profile = false;
    player.ai_archetype_id = '';
    player.ai_profile_overrides = null;
    player.ai_profile = null;
    player.ai_profile_id = '';
    player.ai_profile_label = '';
  });

  state.setup.manualRobotConfigs = effectiveConfigs;
  state.setup.manualRobotProfiles = effectiveProfiles;
  state.setup.aiAdvancedProfiles = useManualProfiles;
}

function ensureAiProfile(player) {
  if (!player || player.is_human) return null;
  const defaultArchetypeId = player.ai_archetype_id || state.ai?.tableConfig?.defaultRobotProfileId || 'legacy_open';
  const engine = aiPolicyEngine();
  if (engine?.ensureProfile) return engine.ensureProfile(player, state.ai?.tableConfig || null);
  const profiles = aiProfilesLib();
  return profiles?.assignProfile
    ? profiles.assignProfile(player, { archetypeId: defaultArchetypeId })
    : null;
}


function applyAiStageConfiguration(payload = {}) {
  const engine = aiPolicyEngine();
  const profiles = aiProfilesLib();
  const setupDefaults = buildAiSetupDefaults(payload.setup_defaults || {});
  const selectedAiSetup = aiSetupDefaults(setupDefaults);
  const difficulty = aiDifficultyOption(selectedAiSetup.aiDifficulty);
  const profileMode = aiProfileModeOption(selectedAiSetup.aiProfileMode);
  const profileModeMarketCaseId = selectedAiSetup.aiAdvancedProfiles ? '' : aiProfileModeMarketCaseId(selectedAiSetup.aiProfileMode);
  const tableNegotiationOverride = profileModeMarketCaseId ? aiMarketCaseNegotiationValues(profileModeMarketCaseId) : null;
  const robotArchetypeOrder = selectedAiSetup.aiProfileOrder.length
    ? [...selectedAiSetup.aiProfileOrder]
    : aiProfileOrderForMode(selectedAiSetup.aiProfileMode);
  const baselineConfig = engine?.buildLegacyBaseline
    ? engine.buildLegacyBaseline({ setupDefaults })
    : {
        id: 'legacy_open_table',
        label: 'Mesa Legacy Aberto',
        marketRegime: { id: 'legacy_open_market', dynamic_pricing: false },
        defaultRobotProfileId: 'legacy_open',
        defaultSkillPresetId: 'legacy_normal',
        baselineLocked: true,
        setupDefaults,
      };
  const tableConfig = engine?.buildStageTableConfig
    ? engine.buildStageTableConfig({
        presetId: 'stage6_profile_table',
        overrides: {
          label: `Mesa AI ${difficulty.label} / ${profileMode.label}`,
          setupDefaults,
          baselineReferenceId: baselineConfig.id || 'legacy_open_table',
          defaultRobotProfileId: robotArchetypeOrder[0] || 'balanced_trader',
          defaultSkillPresetId: difficulty.skillPresetId,
          forcedSkillPresetId: difficulty.skillPresetId,
          defaultProfileOverrides: tableNegotiationOverride ? { negotiation: tableNegotiationOverride } : null,
          robotArchetypeOrder,
        },
      })
    : (profiles?.buildTableConfig
      ? profiles.buildTableConfig({
          presetId: 'stage6_profile_table',
          overrides: {
            label: `Mesa AI ${difficulty.label} / ${profileMode.label}`,
            setupDefaults,
            baselineReferenceId: baselineConfig.id || 'legacy_open_table',
            defaultRobotProfileId: robotArchetypeOrder[0] || 'balanced_trader',
            defaultSkillPresetId: difficulty.skillPresetId,
            forcedSkillPresetId: difficulty.skillPresetId,
            defaultProfileOverrides: tableNegotiationOverride ? { negotiation: tableNegotiationOverride } : null,
            robotArchetypeOrder,
          },
        })
      : baselineConfig);
  applyManualProfilesToPlayers(state.players, setupDefaults);
  state.ai = {
    enabled: true,
    stageId: 'stage8_profile_setup',
    stageLabel: 'Perfis, cupons e caixa',
    baselineConfig,
    tableConfig,
    tableConfigId: tableConfig.id || 'stage6_profile_table',
    baselineLocked: baselineConfig.baselineLocked !== false,
    aiDifficultyId: selectedAiSetup.aiDifficulty,
    aiProfileModeId: selectedAiSetup.aiProfileMode,
    baselineSummary: {
      label: baselineConfig.label || 'Mesa Legacy Aberto',
      marketRegimeId: baselineConfig.marketRegime?.id || 'legacy_open_market',
      defaultRobotProfileId: baselineConfig.defaultRobotProfileId || 'legacy_open',
      defaultSkillPresetId: baselineConfig.defaultSkillPresetId || 'legacy_normal',
    },
    activeSummary: {
      label: tableConfig.label || 'Mesa AI Stage 8',
      marketRegimeId: tableConfig.marketRegime?.id || 'stage6_profile_market',
      defaultRobotProfileId: tableConfig.defaultRobotProfileId || 'balanced_trader',
      defaultSkillPresetId: difficulty.skillPresetId,
      difficultyLabel: difficulty.label,
      profileModeLabel: profileMode.label,
    },
  };
  if (engine?.applyTableConfigToPlayers) {
    engine.applyTableConfigToPlayers(state.players, tableConfig);
    return tableConfig;
  }
  if (engine?.applyBaselineToPlayers) {
    engine.applyBaselineToPlayers(state.players, tableConfig);
    return tableConfig;
  }
  state.players.forEach((player) => ensureAiProfile(player));
  return tableConfig;
}

function aiDecisionContext(player, extra = {}) {
  const tableConfig = extra.tableConfig || state.ai?.tableConfig || null;
  const engine = aiPolicyEngine();
  if (engine?.buildDecisionContext) {
    return engine.buildDecisionContext(player, {
      tableConfig,
      rules: state.rules,
      session: state.session,
      ...extra,
    });
  }
  return {
    player,
    tableConfig,
    marketRegime: tableConfig?.marketRegime || null,
    rules: state.rules,
    session: state.session,
    ...extra,
  };
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cloneAiData(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
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
    'save-name-overlay',
    'load-browser-overlay',
    'negotiation-overlay',
    'permission-choice-overlay',
    'property-inspector-overlay',
    'game-settings-overlay',
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

function propertyInspectorMarkup(card, { centered = false } = {}) {
  if (!card) return '';
  const owner = ownerPlayerOf(card.code);
  const ownerName = owner ? (owner.is_human ? owner.name : owner.name) : 'Banco';
  const ownerAccent = owner?.color_hex || '#8fa5bb';
  const ownerLabel = owner ? 'Pertence a' : 'Sem proprietario';
  const propertyCardMarkup = `
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
  return `
    <section class="property-inspector-modal">
      <div class="property-inspector-owner-row" style="--property-owner-accent:${ownerAccent};">
        <span class="property-inspector-owner-bar" aria-hidden="true"></span>
        <div class="property-inspector-owner-copy">
          <span class="property-inspector-owner-label">${ownerLabel}</span>
          <strong class="property-inspector-owner-name">${ownerName}</strong>
        </div>
      </div>
      ${propertyCardMarkup}
    </section>
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
  const centered = !state.view.propertyInspectorAnchor;
  overlay.classList.toggle('is-hidden', !card);
  stage.innerHTML = card ? propertyInspectorMarkup(card, { centered }) : '';
  stage.style.removeProperty('--inspector-left');
  stage.style.removeProperty('--inspector-top');
  stage.classList.toggle('is-anchored', false);
  if (!card) return;
  const anchor = state.view.propertyInspectorAnchor;
  const modalNode = stage.querySelector('.property-inspector-modal');
  if (!anchor || !modalNode) return;
  const margin = 16;
  const horizontalOffset = 18;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const modalWidth = Math.ceil(modalNode.getBoundingClientRect().width || modalNode.offsetWidth || 0);
  const modalHeight = Math.ceil(modalNode.getBoundingClientRect().height || modalNode.offsetHeight || 0);
  if (!modalWidth || !modalHeight || !viewportWidth || !viewportHeight) return;
  const left = Math.max(margin, Math.min(viewportWidth - modalWidth - margin, Number(anchor.x || 0) + horizontalOffset));
  const top = Math.max(margin, Math.min(viewportHeight - modalHeight - margin, Number(anchor.y || 0) - (modalHeight / 2)));
  stage.style.setProperty('--inspector-left', `${Math.round(left)}px`);
  stage.style.setProperty('--inspector-top', `${Math.round(top)}px`);
  stage.classList.toggle('is-anchored', true);
}

function openPropertyInspector(code, anchor = null) {
  state.view.propertyInspectorCode = String(code || '').toUpperCase();
  state.view.propertyInspectorAnchor = anchor && Number.isFinite(Number(anchor.x)) && Number.isFinite(Number(anchor.y))
    ? { x: Number(anchor.x), y: Number(anchor.y) }
    : null;
  renderPropertyInspector();
}

function closePropertyInspector() {
  if (!state.view.propertyInspectorCode) return;
  state.view.propertyInspectorCode = '';
  state.view.propertyInspectorAnchor = null;
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

function setPaused(paused, { ignoreTutorialForce = false } = {}) {
  const next = Boolean(paused);
  if (!next && tutorialState()?.forcePauseActive && !ignoreTutorialForce) return;
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

function formatLedgerCurrency(value, { forceSign = false } = {}) {
  const amount = Number(value || 0);
  if (amount < 0) {
    return `- ${formatCurrency(Math.abs(amount))}`;
  }
  if (forceSign && amount > 0) {
    return `+ ${formatCurrency(amount)}`;
  }
  return formatCurrency(amount);
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
  return scaledCpuDelay(CPU_MOVE_DELAY_MS, 60);
}

function currentCpuStepDelay() {
  return scaledCpuDelay(CPU_STEP_DELAY_MS, 90);
}

function currentCpuRevealDelay(baseMs = 650) {
  return scaledCpuDelay(baseMs, 120);
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

function isOverlayVisible(overlay) {
  return Boolean(overlay && !overlay.classList.contains('is-hidden'));
}

function hasBlockingToolbarOverlayOpen() {
  return [
    getSettingsOverlay(),
    getReportOverlay(),
    getSetupAiEditorOverlay(),
    getSaveNameOverlay(),
    byId('load-browser-overlay'),
  ].some((overlay) => isOverlayVisible(overlay));
}

function pauseForToolbarOverlay(key) {
  const pauseState = state.view.overlayPause || (state.view.overlayPause = {});
  pauseState[key] = state.view.paused;
  setPaused(true);
}

function resumeAfterToolbarOverlay(key) {
  const pauseState = state.view.overlayPause || (state.view.overlayPause = {});
  const wasPaused = Boolean(pauseState[key]);
  pauseState[key] = false;
  if (!wasPaused && !hasBlockingToolbarOverlayOpen()) {
    setPaused(false);
  }
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
  const buyLocked = isTradeLockBuyEnabled();
  const sellLocked = isTradeLockSellEnabled();
  const buyLockValue = getSettingsTradeLockBuyValue();
  const buyLockOff = getSettingsTradeLockBuyOffInput();
  const buyLockOn = getSettingsTradeLockBuyOnInput();
  const sellLockValue = getSettingsTradeLockSellValue();
  const sellLockOff = getSettingsTradeLockSellOffInput();
  const sellLockOn = getSettingsTradeLockSellOnInput();
  if (buyLockValue) buyLockValue.textContent = buyLocked ? 'Travada' : 'Livre';
  if (buyLockOff) buyLockOff.checked = !buyLocked;
  if (buyLockOn) buyLockOn.checked = buyLocked;
  if (sellLockValue) sellLockValue.textContent = sellLocked ? 'Travada' : 'Livre';
  if (sellLockOff) sellLockOff.checked = !sellLocked;
  if (sellLockOn) sellLockOn.checked = sellLocked;
  renderTutorialAuthoring();
}

function openSettingsOverlay() {
  renderSettingsOverlay();
  pauseForToolbarOverlay('settingsWasPaused');
  setSettingsVisible(true);
}

function closeSettingsOverlay() {
  setSettingsVisible(false);
  resumeAfterToolbarOverlay('settingsWasPaused');
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

function couponUsedTurnSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.coupon_used_turn_count || 0);
}

function couponExpiredTurnSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.coupon_expired_turn_count || 0);
}

function couponUsedTotalSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.coupon_used_total || 0);
}

function couponExpiredTotalSnapshotValue(snapshot, playerId) {
  return Number(reportPlayerSnapshotEntry(snapshot, playerId)?.coupon_expired_total || 0);
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
  const height = 240;
  const frame = { top: 12, right: 16, bottom: 34, left: 76 };
  const targetStepWidth = visibleSnapshots.length > 18 ? 16 : 18;
  const width = Math.max(760, Math.min(940, frame.left + frame.right + (visibleSnapshots.length * targetStepWidth)));
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
        <text class="report-axis-label" x="${frame.left - 8}" y="${(y + 3).toFixed(2)}" text-anchor="end">${formatCurrency(Math.round(value))}</text>
      </g>
    `;
  }).join('');

  const labelStride = reportHeatmapLabelStride(visibleSnapshots.length);
  const xLabelsMarkup = visibleSnapshots.map((snapshot, index) => {
    if (index !== 0 && index !== visibleSnapshots.length - 1 && (index % labelStride) !== 0) return '';
    const x = xFor(index);
    return `<text class="report-axis-xlabel" x="${x.toFixed(2)}" y="${height - 7}" text-anchor="middle">${compactReportTurnLabel(snapshot)}</text>`;
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
        <svg class="report-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${ariaLabel}">
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
      </div>
      <div class="report-player-spark-badges report-player-spark-badges-below">
        <strong class="report-player-spark-value">${Math.round(endValue)}</strong>
        <span class="report-player-spark-delta${delta > 0 ? ' is-positive' : delta < 0 ? ' is-negative' : ''}">${deltaLabel}</span>
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

function reportCountTrendChartMarkup(snapshots, players, { reportKey = 'holdings-by-turn', metricKey = 'title_count', ariaLabel = 'Grafico de contagem do relatorio', gridClass = '' } = {}) {
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
      <div class="report-player-spark-grid${gridClass ? ` ${gridClass}` : ''}" style="--report-player-count:${rankedPlayers.length}">
        ${rankedPlayers.map((player) => reportPlayerSparkCardMarkup(player, visibleSnapshots, { metricKey, metricMax, ariaLabel })).join('')}
      </div>
    </div>
  `;
}

function reportCountTrendCardMarkup(snapshots, players, { reportKey = 'holdings-by-turn', metricKey = 'title_count', title = '', subtitle = '', ariaLabel = 'Grafico de contagem do relatorio', gridClass = '' } = {}) {
  return `
    <article class="report-metric-card report-trend-card">
      <div class="report-metric-card-head">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      ${reportCountTrendChartMarkup(snapshots, players, { reportKey, metricKey, ariaLabel, gridClass })}
    </article>
  `;
}

function reportSimpleSeriesPolylinePoints(visibleSnapshots, valueGetter, xFor, yFor) {
  return visibleSnapshots.map((snapshot, index) => `${xFor(index).toFixed(2)},${yFor(valueGetter(snapshot)).toFixed(2)}`).join(' ');
}

function reportCouponExpirationEvents() {
  return Array.isArray(state.report?.couponExpirationEvents) ? state.report.couponExpirationEvents : [];
}

function recordCouponExpirationEvent(player, coupon, turnNumber = currentTurnNumber()) {
  if (!player || !coupon) return;
  const events = reportCouponExpirationEvents();
  const normalizedTurn = Number(turnNumber || 0);
  events.unshift({
    id: `${player.id || 'player'}|${couponCardKey(coupon)}|${normalizedTurn}|${Date.now()}`,
    turnNumber: normalizedTurn,
    turnLabel: state.session?.turn_label || (normalizedTurn > 0 ? `Turno ${String(normalizedTurn).padStart(2, '0')}` : 'Inicio'),
    playerId: player.id,
    playerName: player.name || player.id || 'Jogador',
    playerColor: player.color_hex || '#8fd7ff',
    couponLabel: couponDisplayLabel(coupon),
  });
  state.report.couponExpirationEvents = events.slice(0, 24);
}

function reportCouponExpirationFeedMarkup() {
  const entries = reportCouponExpirationEvents();
  if (!entries.length) {
    return '<div class="report-coupon-expiration-empty">Nenhum cupom expirou nesta simulacao ate agora.</div>';
  }
  return `
    <div class="report-coupon-expiration-list">
      ${entries.map((entry) => `
        <article class="report-coupon-expiration-item">
          <span class="report-coupon-expiration-turn">${entry.turnLabel}</span>
          <span class="report-player-head report-coupon-expiration-player">
            <span class="report-player-dot" style="background:${entry.playerColor}"></span>
            <span>${entry.playerName}</span>
          </span>
          <strong class="report-coupon-expiration-label">${entry.couponLabel}</strong>
        </article>
      `).join('')}
    </div>
  `;
}

function reportCouponActivityPlayerCardMarkup(player, visibleSnapshots, { ariaLabel = 'Grafico de cupons por turno' } = {}) {
  const width = 250;
  const height = 126;
  const frame = { top: 12, right: 8, bottom: 26, left: 8 };
  const innerWidth = width - frame.left - frame.right;
  const innerHeight = height - frame.top - frame.bottom;
  const xFor = (index) => {
    if (visibleSnapshots.length <= 1) return frame.left + (innerWidth / 2);
    return frame.left + ((index / (visibleSnapshots.length - 1)) * innerWidth);
  };
  const usedValues = visibleSnapshots.map((snapshot) => couponUsedTurnSnapshotValue(snapshot, player.id));
  const expiredValues = visibleSnapshots.map((snapshot) => couponExpiredTurnSnapshotValue(snapshot, player.id));
  const metricMax = Math.max(1, ...usedValues, ...expiredValues);
  const yFor = (value) => frame.top + (((metricMax - value) / Math.max(1, metricMax)) * innerHeight);
  const startSnapshot = visibleSnapshots[0] || null;
  const endSnapshot = visibleSnapshots[visibleSnapshots.length - 1] || null;
  const usedTotal = couponUsedTotalSnapshotValue(endSnapshot, player.id);
  const expiredTotal = couponExpiredTotalSnapshotValue(endSnapshot, player.id);
  const gridValues = Array.from(new Set([0, Math.round(metricMax / 2), metricMax].filter((value) => value >= 0))).sort((left, right) => left - right);
  const gridMarkup = gridValues.map((value) => {
    const y = yFor(value);
    return `<line class="report-player-spark-gridline" x1="${frame.left}" y1="${y.toFixed(2)}" x2="${(width - frame.right).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
  }).join('');
  const usedPolyline = reportSimpleSeriesPolylinePoints(visibleSnapshots, (snapshot) => couponUsedTurnSnapshotValue(snapshot, player.id), xFor, yFor);
  const expiredPolyline = reportSimpleSeriesPolylinePoints(visibleSnapshots, (snapshot) => couponExpiredTurnSnapshotValue(snapshot, player.id), xFor, yFor);
  const usedDots = visibleSnapshots.map((snapshot, index) => {
    const value = couponUsedTurnSnapshotValue(snapshot, player.id);
    if (!(value > 0)) return '';
    return `<circle class="report-coupon-event-dot report-coupon-event-dot-use" cx="${xFor(index).toFixed(2)}" cy="${yFor(value).toFixed(2)}" r="2.8"></circle>`;
  }).join('');
  const expiredDots = visibleSnapshots.map((snapshot, index) => {
    const value = couponExpiredTurnSnapshotValue(snapshot, player.id);
    if (!(value > 0)) return '';
    return `<circle class="report-coupon-event-dot report-coupon-event-dot-expired" cx="${xFor(index).toFixed(2)}" cy="${yFor(value).toFixed(2)}" r="2.8"></circle>`;
  }).join('');
  return `
    <article class="report-player-spark-card report-coupon-player-card" style="--report-player-accent:${player.color_hex || '#8fd7ff'}">
      <div class="report-player-spark-head">
        <span class="report-player-head">
          <span class="report-player-dot" style="background:${player.color_hex || '#8fd7ff'}"></span>
          <span>${player.name}</span>
        </span>
      </div>
      <div class="report-player-spark-badges report-player-spark-badges-below">
        <span class="report-coupon-total-badge report-coupon-total-badge-use">Uso ${usedTotal}</span>
        <span class="report-coupon-total-badge report-coupon-total-badge-expired">Exp ${expiredTotal}</span>
      </div>
      <svg class="report-player-spark-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}: ${player.name}">
        ${gridMarkup}
        <polyline class="report-player-spark-line report-coupon-activity-line report-coupon-activity-line-use" points="${usedPolyline}"></polyline>
        <polyline class="report-player-spark-line report-coupon-activity-line report-coupon-activity-line-expired" points="${expiredPolyline}"></polyline>
        ${usedDots}
        ${expiredDots}
      </svg>
      <div class="report-player-spark-foot report-coupon-player-foot">
        <span>${compactReportTurnLabel(startSnapshot)}</span>
        <span>${compactReportTurnLabel(endSnapshot)}</span>
      </div>
    </article>
  `;
}

function reportCouponActivityChartMarkup(snapshots, players, { reportKey = 'holdings-by-turn', ariaLabel = 'Grafico de cupons por turno' } = {}) {
  if (!snapshots.length || !players.length) {
    return reportEmptyMarkup('Ainda nao ha dados suficientes para montar o grafico.');
  }

  const visibleSnapshots = reportVisibleSnapshots(snapshots, reportKey);
  const latestSnapshot = visibleSnapshots[visibleSnapshots.length - 1] || null;
  const rankedPlayers = players
    .map((player) => ({
      ...player,
      usedTotal: couponUsedTotalSnapshotValue(latestSnapshot, player.id),
      expiredTotal: couponExpiredTotalSnapshotValue(latestSnapshot, player.id),
    }))
    .sort((left, right) => {
      if (right.usedTotal !== left.usedTotal) return right.usedTotal - left.usedTotal;
      if (left.expiredTotal !== right.expiredTotal) return left.expiredTotal - right.expiredTotal;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });

  return `
    <div class="report-count-spark-shell report-coupon-activity-shell">
      <div class="report-count-scale-note">Linhas por evento. Verde = uso estrategico. Laranja = expiracao por rodada.</div>
      <div class="report-player-spark-grid report-player-spark-grid-holdings" style="--report-player-count:${rankedPlayers.length}">
        ${rankedPlayers.map((player) => reportCouponActivityPlayerCardMarkup(player, visibleSnapshots, { ariaLabel })).join('')}
      </div>
    </div>
  `;
}

function reportCouponActivityCardMarkup(snapshots, players, { reportKey = 'holdings-by-turn', title = '', subtitle = '', ariaLabel = 'Grafico de cupons por turno' } = {}) {
  return `
    <article class="report-metric-card report-trend-card report-coupon-activity-card">
      <div class="report-metric-card-head">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      ${reportCouponActivityChartMarkup(snapshots, players, { reportKey, ariaLabel })}
      <div class="report-coupon-expiration-shell">
        <div class="report-count-scale-note">Ultimos cupons expirados: turno, jogador e cupom.</div>
        ${reportCouponExpirationFeedMarkup()}
      </div>
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
    <section class="report-panel report-panel-trend">
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
    <section class="report-panel report-panel-trend">
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
          gridClass: 'report-player-spark-grid-holdings',
        })}
        ${reportCountTrendCardMarkup(snapshots, players, {
          reportKey: 'holdings-by-turn',
          metricKey: 'toll_count',
          title: 'Pedagios',
          subtitle: 'Pedagios conquistados por turno.',
          ariaLabel: 'Grafico de pedagios por turno',
          gridClass: 'report-player-spark-grid-holdings',
        })}
        ${reportCountTrendCardMarkup(snapshots, players, {
          reportKey: 'holdings-by-turn',
          metricKey: 'permission_count',
          title: 'Permissoes',
          subtitle: 'Permissoes ativas por turno.',
          ariaLabel: 'Grafico de permissoes por turno',
          gridClass: 'report-player-spark-grid-holdings',
        })}
        ${reportCouponActivityCardMarkup(snapshots, players, {
          reportKey: 'holdings-by-turn',
          title: 'Cupons',
          subtitle: 'Uso estrategico e perdas por expiracao ao longo da mesa.',
          ariaLabel: 'Grafico de uso e expiracao de cupons por turno',
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

let reportTrendLayoutRafId = 0;

function resetReportTrendLayout() {
  const body = getReportBody();
  const panel = body?.querySelector?.('.report-panel-trend') || null;
  const chartShell = panel?.querySelector?.('.report-chart-shell') || null;
  const chartScroll = chartShell?.querySelector?.('.report-chart-scroll') || null;
  if (body) body.style.removeProperty('overflow');
  if (panel) panel.style.removeProperty('height');
  if (chartShell) chartShell.style.removeProperty('height');
  if (chartScroll) chartScroll.style.removeProperty('height');
}

function syncReportTrendLayout() {
  const body = getReportBody();
  const activeKey = body?.dataset?.reportKey || '';
  if (!body || (activeKey !== 'cash-by-turn' && activeKey !== 'patrimony-by-turn')) {
    resetReportTrendLayout();
    return;
  }

  const panel = body.querySelector('.report-panel-trend');
  const summary = panel?.querySelector('.report-summary');
  const chartShell = panel?.querySelector('.report-chart-shell');
  const legend = chartShell?.querySelector('.report-legend');
  const chartScroll = chartShell?.querySelector('.report-chart-scroll');
  if (!panel || !summary || !chartShell || !chartScroll) return;

  const bodyHeight = Math.floor(body.clientHeight || 0);
  if (!(bodyHeight > 0)) return;

  const panelStyle = window.getComputedStyle(panel);
  const chartShellStyle = window.getComputedStyle(chartShell);
  const panelGap = parseFloat(panelStyle.rowGap || panelStyle.gap || '0') || 0;
  const chartShellGap = parseFloat(chartShellStyle.rowGap || chartShellStyle.gap || '0') || 0;
  const summaryHeight = Math.ceil(summary.getBoundingClientRect().height || 0);
  const legendHeight = Math.ceil(legend?.getBoundingClientRect().height || 0);
  const chartShellHeight = Math.max(120, bodyHeight - summaryHeight - Math.ceil(panelGap));
  const chartScrollHeight = Math.max(80, chartShellHeight - legendHeight - Math.ceil(chartShellGap));

  body.style.overflow = 'hidden';
  panel.style.height = `${bodyHeight}px`;
  chartShell.style.height = `${chartShellHeight}px`;
  chartScroll.style.height = `${chartScrollHeight}px`;
}

function queueReportTrendLayoutSync() {
  if (reportTrendLayoutRafId) {
    window.cancelAnimationFrame(reportTrendLayoutRafId);
  }
  reportTrendLayoutRafId = window.requestAnimationFrame(() => {
    reportTrendLayoutRafId = 0;
    syncReportTrendLayout();
    window.requestAnimationFrame(() => {
      syncReportTrendLayout();
    });
  });
}

function renderReportOverlay() {
  const tabs = getReportTabs();
  const body = getReportBody();
  if (!tabs || !body) return;

  const activeKey = state.report?.activeKey || 'cash-by-turn';
  body.dataset.reportKey = activeKey;
  tabs.innerHTML = `
    <button type="button" class="report-tab${activeKey === 'cash-by-turn' ? ' is-active' : ''}" data-report-key="cash-by-turn" role="tab" aria-selected="${activeKey === 'cash-by-turn' ? 'true' : 'false'}">Dinheiro por turno</button>
    <button type="button" class="report-tab${activeKey === 'patrimony-by-turn' ? ' is-active' : ''}" data-report-key="patrimony-by-turn" role="tab" aria-selected="${activeKey === 'patrimony-by-turn' ? 'true' : 'false'}">Patrimonio por turno</button>
    <button type="button" class="report-tab${activeKey === 'holdings-by-turn' ? ' is-active' : ''}" data-report-key="holdings-by-turn" role="tab" aria-selected="${activeKey === 'holdings-by-turn' ? 'true' : 'false'}">Ativos por turno</button>
    <button type="button" class="report-tab${activeKey === 'milestones-table' ? ' is-active' : ''}" data-report-key="milestones-table" role="tab" aria-selected="${activeKey === 'milestones-table' ? 'true' : 'false'}">Tabela por marco</button>
  `;

  if (activeKey === 'patrimony-by-turn') {
    body.innerHTML = patrimonyByTurnReportMarkup();
    queueReportTrendLayoutSync();
    return;
  }
  if (activeKey === 'holdings-by-turn') {
    body.innerHTML = holdingsByTurnReportMarkup();
    resetReportTrendLayout();
    return;
  }
  if (activeKey === 'milestones-table') {
    body.innerHTML = milestoneTableReportMarkup();
    resetReportTrendLayout();
    return;
  }

  body.innerHTML = activeKey === 'cash-by-turn'
    ? cashByTurnReportMarkup()
    : reportEmptyMarkup('Esse relatorio ainda nao foi implementado.');
  if (activeKey === 'cash-by-turn') {
    queueReportTrendLayoutSync();
  } else {
    resetReportTrendLayout();
  }
}

function openReportOverlay() {
  renderReportOverlay();
  pauseForToolbarOverlay('reportWasPaused');
  setReportVisible(true);
}

function closeReportOverlay() {
  setReportVisible(false);
  resumeAfterToolbarOverlay('reportWasPaused');
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

function playerOwnedPropertyCountByKind(player, kind) {
  const normalizedKind = kind === 'toll' ? 'toll' : 'port';
  if (Array.isArray(player?.property_codes)) {
    return player.property_codes.reduce((count, code) => {
      return count + (getPropertyCard(code)?.kind === normalizedKind ? 1 : 0);
    }, 0);
  }
  return normalizedKind === 'toll'
    ? Math.max(0, Number(player?.tolls_owned || 0))
    : Math.max(0, Number(player?.ports_owned || 0));
}

function playerTitleCount(player) {
  return playerOwnedPropertyCountByKind(player, 'port');
}

function playerTollCount(player) {
  return playerOwnedPropertyCountByKind(player, 'toll');
}

function playerPermissionCount(player) {
  return Array.isArray(player?.permissions) ? player.permissions.length : 0;
}

function playerCouponUsedTotal(player) {
  return Math.max(0, Number(player?.coupon_usage_total || 0));
}

function playerCouponExpiredTotal(player) {
  return Math.max(0, Number(player?.coupon_expired_total || 0));
}

function playerCouponUsedTurnCount(player) {
  return Math.max(0, Number(player?.coupon_usage_turn_count || 0));
}

function playerCouponExpiredTurnCount(player) {
  return Math.max(0, Number(player?.coupon_expired_turn_count || 0));
}

function incrementPlayerCouponMetrics(player, { used = 0, expired = 0 } = {}) {
  if (!player) return;
  player.coupon_usage_total = playerCouponUsedTotal(player) + Math.max(0, Number(used || 0));
  player.coupon_expired_total = playerCouponExpiredTotal(player) + Math.max(0, Number(expired || 0));
  player.coupon_usage_turn_count = playerCouponUsedTurnCount(player) + Math.max(0, Number(used || 0));
  player.coupon_expired_turn_count = playerCouponExpiredTurnCount(player) + Math.max(0, Number(expired || 0));
}

function resetPlayerCouponTurnMetrics(player) {
  if (!player) return;
  player.coupon_usage_turn_count = 0;
  player.coupon_expired_turn_count = 0;
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
        coupon_used_total: playerCouponUsedTotal(player),
        coupon_expired_total: playerCouponExpiredTotal(player),
        coupon_used_turn_count: playerCouponUsedTurnCount(player),
        coupon_expired_turn_count: playerCouponExpiredTurnCount(player),
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
  (state.players || []).forEach((player) => {
    resetPlayerCouponTurnMetrics(player);
  });
  renderReportOverlay();
}

function resetReportData() {
  state.report.cashHistory = [];
  state.report.snapshotKeys = [];
  state.report.couponExpirationEvents = [];
  captureCashSnapshot({
    label: 'Inicio',
    turnNumber: 0,
    phase: 'Mesa inicial',
    force: true,
  });
}

function reportSnapshots() { return state.report?.cashHistory || []; }

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

function findPermissionCatalogCard(permission) {
  const normalizedKey = String(permission?.kind || permission?.id || '').trim().toLowerCase();
  if (!normalizedKey) return null;
  return (state.freightPermissionCards || []).find((card) => String(card?.kind || card?.id || '').trim().toLowerCase() === normalizedKey) || null;
}

function normalizePermissionState(permission) {
  if (!permission) return null;
  const source = findPermissionCatalogCard(permission);
  return {
    ...(source || {}),
    ...permission,
    id: permission.id || source?.id || null,
    kind: permission.kind || source?.kind || permission.id || null,
    title: permission.title || source?.title || '--',
    accent: permission.accent || source?.accent || DEFAULT_PERMISSION_STYLE.accent,
    text: permission.text || source?.text || DEFAULT_PERMISSION_STYLE.text,
    purchase_price: Number(permission.purchase_price || source?.purchase_price || 0),
    mortgaged: Boolean(permission.mortgaged),
  };
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
function getSetupAiEditorOverlay() { return byId('setup-ai-editor-overlay'); }
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
function getSettingsTradeLockBuyValue() { return byId('settings-trade-lock-buy-value'); }
function getSettingsTradeLockBuyOffInput() { return byId('settings-trade-lock-buy-off'); }
function getSettingsTradeLockBuyOnInput() { return byId('settings-trade-lock-buy-on'); }
function getSettingsTradeLockSellValue() { return byId('settings-trade-lock-sell-value'); }
function getSettingsTradeLockSellOffInput() { return byId('settings-trade-lock-sell-off'); }
function getSettingsTradeLockSellOnInput() { return byId('settings-trade-lock-sell-on'); }

function isTradeLockBuyEnabled() { return Boolean(state.settings.tradeLockBuy); }
function isTradeLockSellEnabled() { return Boolean(state.settings.tradeLockSell); }

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

function globalActionFeedMarkup(entries) {
  const visibleEntries = (entries || []).slice(0, 8);
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
  const panel = byId('game-action-log');
  const target = byId('game-action-feed');
  const globalMode = currentLogMode() === 'global';
  if (panel) {
    panel.classList.toggle('is-hidden', !globalMode);
    panel.classList.toggle('is-collapsed', globalMode && !state.view.actionFeedExpanded);
  }
  if (target) target.innerHTML = globalMode ? globalActionFeedMarkup(entries) : '';
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
    free_fuel_contract: 'Viagem de Graca',
    extended_contract_deadline: 'Prazo Estendido',
    double_freight: 'Lucro Extra',
    free_port_stay: 'Porto Livre',
    skip_owner_share: 'Quebra de Contrato',
    anti_monopoly_owner_share: 'Contra o Monopolio',
    reroute_same_value: 'Mudanca de Rota',
    cancel_contract: 'Contrato Cancelado',
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

function couponExpiresAfterTurns(coupon) {
  return Math.max(1, Number(typeof coupon === 'string' ? COUPON_EXPIRATION_TURNS : (coupon?.expires_after_turns || COUPON_EXPIRATION_TURNS)));
}

function couponExpirationTurnsForKind(kind = '') {
  const normalizedKind = String(kind || '').trim();
  return Math.max(1, Number(COUPON_EXPIRATION_TURNS_BY_KIND[normalizedKind] || COUPON_EXPIRATION_TURNS));
}

function couponExpirationModeForKind(kind = '') {
  const normalizedKind = String(kind || '').trim();
  return COUPON_EXPIRATION_MODE_BY_KIND[normalizedKind] || 'rounds';
}

function normalizeCouponRecord(coupon, { defaultTurn = null } = {}) {
  if (!coupon || typeof coupon !== 'object' || Array.isArray(coupon)) return coupon;
  const resolvedDefaultTurn = Math.max(0, Number(defaultTurn ?? Math.max(0, currentTurnNumber() - COUPON_EXPIRATION_TURNS)) || 0);
  const acquiredTurnRaw = Number(coupon?.acquired_turn);
  const acquiredTurn = Number.isFinite(acquiredTurnRaw) ? Math.max(0, acquiredTurnRaw) : resolvedDefaultTurn;
  const expiresAfterTurns = couponExpiresAfterTurns(coupon);
  const eligibleChecks = Math.max(0, Number(coupon?.eligible_checks || 0));
  if (
    Number(coupon?.acquired_turn) === acquiredTurn
    && Number(coupon?.expires_after_turns || COUPON_EXPIRATION_TURNS) === expiresAfterTurns
    && Number(coupon?.eligible_checks || 0) === eligibleChecks
  ) {
    return coupon;
  }
  return {
    ...coupon,
    acquired_turn: acquiredTurn,
    expires_after_turns: expiresAfterTurns,
    eligible_checks: eligibleChecks,
  };
}

function couponElapsedExpirationUnits(coupon, turnNumber = currentTurnNumber()) {
  if (!coupon || typeof coupon === 'string') return 0;
  if (couponExpirationModeForKind(couponKind(coupon)) === 'eligible_checks') {
    return Math.max(0, Number(coupon?.eligible_checks || 0));
  }
  const acquiredTurn = Number.isFinite(Number(coupon?.acquired_turn))
    ? Math.max(0, Number(coupon.acquired_turn))
    : Math.max(0, turnNumber - couponExpiresAfterTurns(coupon));
  return Math.max(0, Number(turnNumber || 0) - acquiredTurn);
}

function couponHeldTurns(coupon, turnNumber = currentTurnNumber()) {
  return couponElapsedExpirationUnits(coupon, turnNumber);
}

function couponTurnsUntilExpiry(coupon, turnNumber = currentTurnNumber()) {
  return Math.max(0, couponExpiresAfterTurns(coupon) - couponHeldTurns(coupon, turnNumber));
}

function noteCouponOpportunity(coupon) {
  if (!coupon || typeof coupon === 'string') return coupon;
  if (couponExpirationModeForKind(couponKind(coupon)) !== 'eligible_checks') return coupon;
  coupon.eligible_checks = Math.max(0, Number(coupon.eligible_checks || 0)) + 1;
  return coupon;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value || 0)));
}

function contractCouponDerivedSignals(signals = {}) {
  const mandatoryTollPressure = Number(signals.mandatoryToll ? 1 : 0);
  const fuelStopsRemaining = Math.max(0, Number(signals.fuelStopsRemaining || 0));
  const remainingSteps = Math.max(0, Number(signals.remainingSteps || 0));
  const remainingRounds = Math.max(0, Number(signals.remainingRounds || 0));
  const fuelRoutePressure = clamp01(fuelStopsRemaining / Math.max(3, fuelStopsRemaining || 0));
  const remainingStepsPressure = clamp01(remainingSteps / Math.max(8, remainingSteps || 0));
  const remainingRoundPressure = clamp01((remainingSteps + (mandatoryTollPressure * 2)) / Math.max(1, remainingRounds * 3));
  const contractFailureRisk = clamp01(
    (remainingRoundPressure * 0.48)
    + (remainingStepsPressure * 0.24)
    + (mandatoryTollPressure * 0.14)
    + (fuelRoutePressure * 0.14),
  );
  return {
    mandatoryTollPressure,
    fuelRoutePressure,
    remainingStepsPressure,
    remainingRoundPressure,
    contractFailureRisk,
  };
}

function shouldCountContractCouponOpportunity(kind, signals = {}, currentTargetRounds = 0) {
  const derived = contractCouponDerivedSignals(signals);
  if (kind === 'free_fuel_contract') {
    return derived.fuelRoutePressure >= 0.333333;
  }
  if (kind === 'cancel_contract') {
    return derived.contractFailureRisk >= 0.18 || Number(signals.freightWeaknessNorm || 0) >= 0.45;
  }
  if (kind === 'extended_contract_deadline') {
    return currentTargetRounds < 6 && derived.contractFailureRisk >= 0.18;
  }
  return true;
}

function couponHasExpired(coupon, turnNumber = currentTurnNumber()) {
  return couponHeldTurns(coupon, turnNumber) >= couponExpiresAfterTurns(coupon);
}

function playerCoupons(player) {
  const coupons = Array.isArray(player?.coupons) ? player.coupons : [];
  const normalized = coupons.map((coupon) => normalizeCouponRecord(coupon));
  if (player && normalized.some((coupon, index) => coupon !== coupons[index])) {
    player.coupons = normalized;
  }
  return normalized;
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
  incrementPlayerCouponMetrics(player, { used: 1 });
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

function expireCouponsForPlayer(player, { turnNumber = currentTurnNumber(), silent = false } = {}) {
  if (!player) return [];
  const coupons = playerCoupons(player);
  if (!coupons.length) return [];
  const expired = coupons.filter((coupon) => couponHasExpired(coupon, turnNumber));
  if (!expired.length) return [];
  player.coupons = coupons.filter((coupon) => !couponHasExpired(coupon, turnNumber));
  incrementPlayerCouponMetrics(player, { expired: expired.length });
  expired.forEach((coupon) => {
    recordCouponExpirationEvent(player, coupon, turnNumber);
    if (typeof coupon !== 'string' && coupon?.source_card_id) {
      releaseHeldChanceCardToDiscard(coupon.source_card_id);
    }
    if (!silent) {
      pushActionLog(player, 'Cupom expirado', `${couponDisplayLabel(coupon)}: expirou apos ${couponExpiresAfterTurns(coupon)} rodadas e voltou ao deck.`);
    }
  });
  if (!silent) {
    player.status_label = expired.length === 1 ? 'cupom expirado' : `${expired.length} cupons expirados`;
    renderHud();
    renderNodeOverlay();
    renderShipOverlay();
  }
  return expired;
}

function expireCouponsForAllPlayers({ turnNumber = currentTurnNumber(), activePlayerId = '' } = {}) {
  let expiredAny = false;
  (state.players || []).forEach((player) => {
    const expired = expireCouponsForPlayer(player, { turnNumber, silent: true });
    if (!expired.length) return;
    expiredAny = true;
    player.status_label = player.id === activePlayerId
      ? (expired.length === 1 ? 'cupom expirado' : `${expired.length} cupons expirados`)
      : (player.status_label || 'cupom expirado');
    expired.forEach((coupon) => {
      pushActionLog(player, 'Cupom expirado', `${couponDisplayLabel(coupon)}: expirou apos ${couponExpiresAfterTurns(coupon)} rodadas e voltou ao deck.`);
    });
  });
  if (expiredAny) {
    renderHud();
    renderNodeOverlay();
    renderShipOverlay();
  }
  return expiredAny;
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
  couponSignals = {},
  countOpportunity = true,
} = {}) {
  const coupon = firstCouponOfKind(player, kind);
  if (!coupon) return null;
  if (countOpportunity) {
    noteCouponOpportunity(coupon);
  }
  const couponAgeTurns = couponHeldTurns(coupon);
  const couponExpirationTurns = couponExpiresAfterTurns(coupon);
  const turnsUntilCouponExpiry = couponTurnsUntilExpiry(coupon);

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
  } else {
    const couponDecision = aiPolicyEngine()?.decideCouponUsage
      ? aiPolicyEngine().decideCouponUsage({
          player,
          kind,
          autoUse,
          context: aiDecisionContext(player, {
            reason: 'coupon_usage',
            action,
            cardCode,
            couponSignals: {
              couponAgeTurns,
              couponExpirationTurns,
              turnsUntilCouponExpiry,
              ...couponSignals,
            },
          }),
        })
      : null;
    if (!(couponDecision ? couponDecision.shouldUse : autoUse)) {
      return null;
    }
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

function countFuelStopsOnPath(path = []) {
  return (Array.isArray(path) ? path : []).reduce((total, nodeId) => total + (state.nodesById[nodeId]?.kind === 'fuel' ? 1 : 0), 0);
}

function routeUnlockGainForDestination(player, destinationCode = '') {
  const contract = player?.active_contract;
  const currentNodeId = player?.board_node_id || getPropertyNode(contract?.origin || '')?.id || '';
  const destinationNodeId = getPropertyNode(destinationCode || contract?.destination || '')?.id || '';
  if (!currentNodeId || !destinationNodeId) return 0;
  const routeContext = buildContractRouteContext(player);
  const currentSteps = Math.max(0, ((routeContext?.forwardPath?.length || 1) - 1));
  const directSteps = Math.max(0, ((shortestPath(currentNodeId, destinationNodeId)?.length || 1) - 1));
  return Math.min(1, Math.max(0, (currentSteps - directSteps) / Math.max(1, currentSteps || directSteps || 1)));
}

function buildContractCouponSignals(player, extra = {}) {
  const contract = player?.active_contract;
  const rules = normalizedGameRules();
  const currentTargetRounds = Math.max(1, Number(contract?.target_rounds || state.rules.target_rounds || 4));
  const roundsElapsed = Math.max(1, Number(contract?.rounds_elapsed || 1));
  const remainingRounds = Math.max(0, currentTargetRounds - roundsElapsed);
  const originCode = String(contract?.origin || '').toUpperCase();
  const destinationCode = String(contract?.destination || '').toUpperCase();
  const tollCode = contractNeedsMandatoryToll(contract)
    ? String(contract?.mandatory_toll || '').toUpperCase()
    : '';
  const routeContext = buildContractRouteContext(player);
  const forwardPath = Array.isArray(routeContext?.forwardPath) ? routeContext.forwardPath : [];
  const remainingSteps = Math.max(0, forwardPath.length ? forwardPath.length - 1 : 0);
  const freightValue = Number(contract?.base_freight_value || contract?.freight_value || 0);
  const directFreightDistance = Math.max(
    0,
    Number(contract?.distance_value || state.distances?.[originCode]?.[destinationCode] || 0),
  );
  const travelRouteDistance = tollCode
    ? Math.max(
        0,
        Number(state.distances?.[originCode]?.[tollCode] || 0)
          + Number(state.distances?.[tollCode]?.[destinationCode] || 0),
      )
    : directFreightDistance;
  const freightDensity = directFreightDistance > 0 ? (freightValue / directFreightDistance) : 0;
  const originOwned = Boolean(contract?.origin_owned);
  const contractValueBandNorm = originOwned
    ? Math.min(1, Math.max(0, (freightValue - 168) / 552))
    : Math.min(1, Math.max(0, (freightValue - 51) / 111));
  const freightDensityNorm = originOwned
    ? Math.min(1, Math.max(0, (freightDensity - 15) / 35))
    : Math.min(1, Math.max(0, (freightDensity - 4) / 6));
  const freightWeaknessNorm = Math.min(
    1,
    Math.max(0, 1 - ((contractValueBandNorm * 0.55) + (freightDensityNorm * 0.45))),
  );
  const travelDistanceNorm = Math.min(1, Math.max(0, (travelRouteDistance - 17) / 14));
  const detourPressure = Math.min(
    1,
    Math.max(0, (Math.max(0, travelRouteDistance - directFreightDistance) - 3) / 12),
  );
  const originCommissionShare = Math.max(0, Number(rules.origin_owner_commission_share || 0.5));
  const commissionAvoidedValue = Math.max(0, Math.floor(Math.max(0, freightValue) * originCommissionShare));
  const commissionAvoidedNorm = Math.min(1, Math.max(0, (commissionAvoidedValue - 84) / 276));
  return {
    targetRounds: currentTargetRounds,
    currentTargetRounds,
    roundsElapsed,
    remainingRounds,
    remainingSteps,
    fuelStopsRemaining: countFuelStopsOnPath(forwardPath),
    mandatoryToll: Boolean(contractNeedsMandatoryToll(contract) && !contract?.toll_passed),
    freightValue,
    directFreightDistance,
    travelRouteDistance,
    freightDensity,
    contractValueBandNorm,
    freightDensityNorm,
    freightWeaknessNorm,
    travelDistanceNorm,
    detourPressure,
    commissionAvoidedValue,
    commissionAvoidedNorm,
    ...extra,
  };
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
    couponSignals: {
      charge,
      ownerPresent: Boolean(owner),
      propertyKind: 'port',
    },
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
    couponSignals: {
      charge,
      ownerPresent: Boolean(owner),
      propertyKind: 'toll',
      mandatoryToll: player?.active_contract?.mandatory_toll === card.code,
    },
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

  if (player?.active_contract?.free_fuel_for_contract) {
    return {
      paid: 0,
      usedCoupon: true,
      note: `${playerActionName(player)} seguiu com Viagem de Graca e nao pagou abastecimento em ${player.location_label}.`,
      statusLabel: player.status_label || 'viagem de graca',
    };
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
    couponSignals: {
      charge: amount,
      propertyKind: 'fuel',
    },
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

function refreshAllOwnedCounts() {
  (state.players || []).forEach((player) => {
    if (!player) return;
    if (!Array.isArray(player.property_codes)) {
      player.property_codes = [];
    }
    refreshOwnedCounts(player);
  });
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

function canExecuteAiSaleTransfer(fromPlayer, toPlayer, card, amount) {
  if (!fromPlayer || !toPlayer || fromPlayer.is_human || toPlayer.is_human) return true;
  const engine = aiPolicyEngine();
  if (!engine?.decideOwnedPropertyNegotiation || !card) return true;
  const decision = engine.decideOwnedPropertyNegotiation({
    player: toPlayer,
    owner: fromPlayer,
    card,
    price: amount,
    context: aiDecisionContext(toPlayer, { reason: 'owned_property_negotiation' }),
  });
  return Boolean(decision?.accepted);
}

function canExecuteAiBarterTransfer(seller, buyer, card, bundleCodes = []) {
  if (!seller || !buyer || seller.is_human || buyer.is_human) return true;
  if (!card) return false;
  const evaluation = evaluateOwnedPropertyBarterProposal(buyer, seller, card, bundleCodes, {
    reason: 'owned_property_negotiation',
  });
  return Boolean(evaluation?.accepted);
}

function transferProperty(fromPlayer, toPlayer, code, amount) {
  const normalized = (code || '').toUpperCase();
  const card = getPropertyCard(normalized);
  if (!fromPlayer || !toPlayer || fromPlayer.bankrupt || toPlayer.bankrupt) return false;
  if (!fromPlayer.property_codes?.includes(normalized)) return false;
  if (isPropertyMortgaged(normalized)) return false;
  if (toPlayer.cash < amount) return false;
  if (!canExecuteAiSaleTransfer(fromPlayer, toPlayer, card, amount)) return false;
  updatePlayerCash(toPlayer, -amount);
  updatePlayerCash(fromPlayer, amount);
  removePropertyFromPlayer(fromPlayer, normalized);
  addPropertyToPlayer(toPlayer, normalized);
  return true;
}

function canTransferPropertyOwnership(fromPlayer, toPlayer, code) {
  const normalized = String(code || '').toUpperCase();
  if (!fromPlayer || !toPlayer || fromPlayer.bankrupt || toPlayer.bankrupt) return false;
  if (!normalized || !fromPlayer.property_codes?.includes(normalized)) return false;
  if (isPropertyMortgaged(normalized)) return false;
  return true;
}

function movePropertyOwnership(fromPlayer, toPlayer, code) {
  const normalized = String(code || '').toUpperCase();
  if (!canTransferPropertyOwnership(fromPlayer, toPlayer, normalized)) return false;
  removePropertyFromPlayer(fromPlayer, normalized);
  addPropertyToPlayer(toPlayer, normalized);
  return true;
}

function exchangePropertyBundle(seller, buyer, targetCode, bundleCodes = []) {
  const normalizedTarget = String(targetCode || '').toUpperCase();
  const normalizedBundle = Array.from(new Set((Array.isArray(bundleCodes) ? bundleCodes : [])
    .map((code) => String(code || '').toUpperCase())
    .filter(Boolean)));
  const targetCard = getPropertyCard(normalizedTarget);
  if (!canTransferPropertyOwnership(seller, buyer, normalizedTarget)) return false;
  if (!normalizedBundle.length) return false;
  if (normalizedBundle.includes(normalizedTarget)) return false;
  if (!normalizedBundle.every((code) => canTransferPropertyOwnership(buyer, seller, code))) return false;
  if (!canExecuteAiBarterTransfer(seller, buyer, targetCard, normalizedBundle)) return false;
  if (!movePropertyOwnership(seller, buyer, normalizedTarget)) return false;
  normalizedBundle.forEach((code) => {
    movePropertyOwnership(buyer, seller, code);
  });
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
  const rules = normalizedGameRules();
  return economyLib()?.mortgageCredit
    ? economyLib().mortgageCredit(card?.price || 0, rules)
    : Math.floor(Number(card?.price || 0) * Math.max(0, Number(rules?.mortgage_credit_ratio || 0)));
}

function propertyRedeemCost(card) {
  const rules = normalizedGameRules();
  return economyLib()?.redeemCost
    ? economyLib().redeemCost(card?.price || 0, rules)
    : Math.round(propertyMortgageCredit(card) * Math.max(1, Number(rules?.mortgage_release_multiplier || 1)));
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
  if (active) {
    player.active_permission_id = active.id;
    player.active_permission_label = active.title;
    player.ship_type = active.kind;
    player.ship_type_label = active.title;
    player.ship_visible = Boolean(player.ship_type && player.board_node_id);
    if (player.active_contract && !player.active_contract.completed) {
      player.active_contract.cargo_label = active.title;
    }
    return;
  }
  if (available.length) {
    const next = available[0];
    player.active_permission_id = next.id;
    player.active_permission_label = next.title;
    player.ship_type = next.kind;
    player.ship_type_label = next.title;
    player.ship_visible = Boolean(player.ship_type && player.board_node_id);
    if (player.active_contract && !player.active_contract.completed) {
      player.active_contract.cargo_label = next.title;
    }
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

function hydrateLoadedPlayerState(player) {
  if (!player) return;
  syncActivePermissionAfterEconomyChange(player);

  if (player.board_node_id && state.nodesById[player.board_node_id]) {
    setPlayerNode(player, player.board_node_id);
  } else {
    const currentLocationNodeId = getPropertyNode(player.location_code)?.id || '';
    if (currentLocationNodeId) {
      setPlayerNode(player, currentLocationNodeId);
    } else {
      player.ship_visible = Boolean(player.ship_type && player.board_node_id);
    }
  }

  if (!player.active_contract) return;

  const contract = ensurePlayerContractDraft(player);
  contract.target_rounds = Math.max(1, Number(contract.target_rounds || state.rules.target_rounds || 4));
  if (!contract.cargo_label || contract.cargo_label === '--' || contract.cargo_label === 'Sem carga') {
    contract.cargo_label = player.active_permission_label || 'Sem carga';
  }
  if (!contract.deadline_progress || contract.deadline_progress === '--') {
    const roundsElapsed = Math.max(0, Number(contract.rounds_elapsed || 0));
    contract.deadline_progress = `${Math.min(roundsElapsed, contract.target_rounds)}/${contract.target_rounds}`;
  }
  if (!contract.deadline_label || contract.deadline_label === '--') {
    contract.deadline_label = contract.deadline_progress;
  }
  syncContractRouteProgress(player, player.board_node_id ? [player.board_node_id] : []);
}

function contractPermissionChoicesForOrigin(player, originCode = null) {
  const resolvedOriginCode = String(originCode || player?.active_contract?.origin || player?.location_code || '').toUpperCase();
  const originCard = getPropertyCard(resolvedOriginCode);
  const ownsOrigin = Boolean(player?.property_codes?.includes(resolvedOriginCode) && !isPropertyMortgaged(resolvedOriginCode));
  const currentPermissionId = String(player?.active_permission_id || '');
  const switchCost = Math.max(0, Number(state.rules?.permission_switch_cost || 50));
  const rawChoices = availablePermissionRecords(player).map((permission) => {
    const rate = getRate(originCard, permission.kind || permission.id) || { fee: 0, multiplier: 1 };
    const fee = Number(rate.fee || 0);
    const multiplier = Number(rate.multiplier || 1);
    const emValue = fee * Math.max(1, multiplier);
    const isCurrent = String(permission.id) === currentPermissionId;
    const permissionSwitchCost = isCurrent ? 0 : switchCost;
    return {
      permission,
      fee,
      multiplier,
      emValue,
      comparisonValue: ownsOrigin ? (fee * Math.max(1, multiplier)) : fee,
      projectedFreight: ownsOrigin ? (fee * Math.max(1, multiplier)) : fee,
      effectiveComparisonValue: Math.max(0, (ownsOrigin ? (fee * Math.max(1, multiplier)) : fee) - permissionSwitchCost),
      isCurrent,
      switchCost: permissionSwitchCost,
      canAffordSwitch: isCurrent || Number(player?.cash || 0) >= permissionSwitchCost,
    };
  });
  const maxDisplayedValue = rawChoices.reduce((maxValue, entry) => (
    Math.max(maxValue, Number(entry.comparisonValue || 0))
  ), 0);
  const choices = rawChoices.map((entry) => ({
    ...entry,
    isBestDisplayedValue: Number(entry.comparisonValue || 0) === maxDisplayedValue,
  }));
  return {
    originCode: resolvedOriginCode,
    ownsOrigin,
    choices,
  };
}

function bestContractPermissionChoiceForOrigin(player, originCode = null) {
  const selection = contractPermissionChoicesForOrigin(player, originCode);
  return selection.choices.reduce((best, entry) => {
    if (!best) return entry;
    if (entry.effectiveComparisonValue > best.effectiveComparisonValue) return entry;
    if (entry.effectiveComparisonValue < best.effectiveComparisonValue) return best;
    if (entry.isCurrent) return entry;
    return best;
  }, null);
}

async function applyContractPermissionChoice(player, permissionId, {
  statusLabel = 'permissao escolhida',
  actionLabel = 'Mudanca de permissao',
  reason = 'mudanca de permissao no novo contrato',
} = {}) {
  const permission = findPermissionRecord(player, permissionId);
  if (!player || !permission) {
    return { permission: null, changed: false, charged: 0, blocked: 'invalid_permission' };
  }

  const previousPermission = findPermissionRecord(player, player.active_permission_id);
  const changed = String(player.active_permission_id || '') !== String(permission.id);
  const switchCost = changed ? Math.max(0, Number(state.rules?.permission_switch_cost || 50)) : 0;

  if (switchCost > 0) {
    const charge = await bankChargeOutcome(player, switchCost, {
      action: actionLabel,
      detail: `Pagou ${formatCurrency(switchCost)} ao banco para trocar ${previousPermission?.title || 'a permissao atual'} por ${permission.title}.`,
      statusLabel: `pagou ${formatCurrency(switchCost)}`,
      reason,
    });
    if (charge.bankrupt) {
      return { permission: null, changed: false, charged: 0, blocked: 'bankrupt_on_switch_cost' };
    }
  }

  const result = setActivePermissionForPlayer(player, permission.id, { statusLabel });
  return {
    ...result,
    changed,
    charged: switchCost,
    previousPermission,
  };
}

async function applyBestContractPermissionForRobot(player, originCode = null) {
  const selection = contractPermissionChoicesForOrigin(player, originCode);
  const bestPermissionDecision = aiPolicyEngine()?.chooseBestPermission
    ? aiPolicyEngine().chooseBestPermission({
        player,
        selection,
        originCode,
      })
    : null;
  const bestChoice = bestPermissionDecision?.choice || selection.choices.reduce((best, entry) => {
    if (!best) return entry;
    if (entry.emValue > best.emValue) return entry;
    if (entry.emValue < best.emValue) return best;
    if (entry.effectiveComparisonValue > best.effectiveComparisonValue) return entry;
    if (entry.effectiveComparisonValue < best.effectiveComparisonValue) return best;
    if (entry.isCurrent) return entry;
    return best;
  }, null);
  if (!bestChoice) return null;
  const result = await applyContractPermissionChoice(player, bestChoice.permission.id, {
    statusLabel: 'permissao ativa definida',
    actionLabel: 'Mudanca de permissao',
    reason: 'mudanca de permissao do robo no novo contrato',
  });
  if (result.changed && result.permission) {
    pushActionLog(player, 'Permissao escolhida', `${result.permission.title} (${bestPermissionDecision?.explanation || (selection.ownsOrigin ? `melhor frete no porto inicial ${selection.originCode}` : 'melhor combinacao atual')}).`);
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

async function maybeOpenHumanOwnedPropertyMortgage(player, code) {
  const normalized = String(code || '').toUpperCase();
  const card = getPropertyCard(normalized);
  if (!player?.is_human || !card || card.mortgaged) return false;
  if (!player.property_codes?.includes(normalized)) return false;
  if (!canMortgageProperty(player, normalized)) return false;

  const mortgageCredit = propertyMortgageCredit(card);
  const currentCash = Math.max(0, Number(player.cash || 0));
  const projectedCash = currentCash + mortgageCredit;
  const propertyLabel = card.is_toll ? 'O pedagio' : 'O porto';

  closePropertyInspector();
  const choice = await openDecisionModal({
    eyebrowLabel: 'Hipoteca',
    title: `${card.code} disponivel`,
    copy: `${propertyLabel} ${card.code} esta livre. Hipotecar agora por ${formatCurrency(mortgageCredit)}? Caixa atual: ${formatCurrency(currentCash)}. Caixa apos a hipoteca: ${formatCurrency(projectedCash)}.`,
    primaryLabel: `Hipotecar ${formatCurrency(mortgageCredit)}`,
    secondaryLabel: 'Cancelar',
    cardCode: card.code,
  });
  if (choice !== 'primary') return true;
  return mortgagePropertyForPlayer(player, normalized);
}

async function maybeOpenHumanMortgagedPropertyRedeem(player, code) {
  const normalized = String(code || '').toUpperCase();
  const card = getPropertyCard(normalized);
  if (!player?.is_human || !card || !card.mortgaged) return false;
  if (!player.property_codes?.includes(normalized)) return false;

  const redeemCost = propertyRedeemCost(card);
  const canAfford = canRedeemProperty(player, normalized);
  const currentCash = Math.max(0, Number(player.cash || 0));
  const propertyLabel = card.is_toll ? 'O pedagio' : 'O porto';

  closePropertyInspector();
  const choice = await openDecisionModal({
    eyebrowLabel: 'Hipoteca',
    title: `${card.code} hipotecado`,
    copy: canAfford
      ? `${propertyLabel} ${card.code} esta hipotecado. Resgatar agora por ${formatCurrency(redeemCost)}? Caixa atual: ${formatCurrency(currentCash)}.`
      : `${propertyLabel} ${card.code} esta hipotecado. O resgate custa ${formatCurrency(redeemCost)}, mas seu caixa atual e ${formatCurrency(currentCash)}.`,
    primaryLabel: canAfford ? `Resgatar ${formatCurrency(redeemCost)}` : 'Caixa insuficiente',
    primaryDisabled: !canAfford,
    secondaryLabel: 'Cancelar',
    cardCode: card.code,
  });
  if (choice !== 'primary' || !canAfford) return true;
  return redeemPropertyForPlayer(player, normalized);
}

function mortgagePermissionForPlayer(player, permissionId, { auto = false, reason = 'hipoteca' } = {}) {
  return false;
}

function redeemPermissionForPlayer(player, permissionId, { auto = false } = {}) {
  return false;
}

function mortgageCandidatesForPlayer(player) {
  if (!player || player.bankrupt) return [];
  const activePermissionCount = availablePermissionRecords(player).length;
  const propertyCandidates = (player.property_codes || [])
    .map((code) => getPropertyCard(code))
    .filter((card) => card && !card.mortgaged)
    .map((card) => ({
      type: 'property',
      key: card.code,
      label: card.code,
      credit: propertyMortgageCredit(card),
      propertyKind: card.is_toll ? 'toll' : 'port',
      continent: card.continent || '',
      monopolyProtected: !card.is_toll && playerHasRegionMonopoly(player, card.continent),
      remainingPermissionCount: activePermissionCount,
    }));
  return [...propertyCandidates]
    .filter((entry) => entry.credit > 0);
}

function redeemCandidatesForPlayer(player) {
  if (!player || player.bankrupt) return [];
  const activePermissionCount = availablePermissionRecords(player).length;
  const propertyCandidates = (player.property_codes || [])
    .map((code) => getPropertyCard(code))
    .filter((card) => card && card.mortgaged)
    .map((card) => ({
      type: 'property',
      key: card.code,
      label: card.code,
      cost: propertyRedeemCost(card),
      propertyKind: card.is_toll ? 'toll' : 'port',
      continent: card.continent || '',
      monopolyProtected: !card.is_toll && regionPortCards(card.continent).every((entry) => player.property_codes?.includes(entry.code)),
      remainingPermissionCount: activePermissionCount,
    }));
  return [...propertyCandidates]
    .filter((entry) => entry.cost > 0);
}

function performMortgageCandidate(player, candidate, reason) {
  if (!player || !candidate) return false;
  if (candidate.type === 'property') return mortgagePropertyForPlayer(player, candidate.key, { auto: true, reason });
  return false;
}

function performRedeemCandidate(player, candidate) {
  if (!player || !candidate) return false;
  if (candidate.type === 'property') return redeemPropertyForPlayer(player, candidate.key, { auto: true });
  return false;
}

async function maybeAutoRedeemForRobot(player) {
  if (!player || player.is_human || player.bankrupt) return false;
  let redeemedAny = false;
  let loops = 0;
  while (loops < 2) {
    const candidates = redeemCandidatesForPlayer(player);
    if (!candidates.length) break;
    const decision = aiPolicyEngine()?.decideRedeemCandidate
      ? aiPolicyEngine().decideRedeemCandidate({
          player,
          candidates,
          context: aiDecisionContext(player, { reason: 'auto_redeem' }),
        })
      : null;
    if (!(decision?.shouldRedeem) || !decision?.candidate) break;
    if (!performRedeemCandidate(player, decision.candidate)) break;
    redeemedAny = true;
    loops += 1;
  }
  return redeemedAny;
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

  while (player.cash < due) {
    const candidates = mortgageCandidatesForPlayer(player);
    if (!candidates.length) break;
    const decision = aiPolicyEngine()?.decideMortgageCandidate
      ? aiPolicyEngine().decideMortgageCandidate({
          player,
          candidates,
          due,
          context: aiDecisionContext(player, { reason: 'auto_mortgage' }),
        })
      : null;
    const candidate = decision?.candidate || candidates[0];
    if (!candidate || !performMortgageCandidate(player, candidate, reason)) break;
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

function playerRegionPortCount(player, continent) {
  if (!player || player.bankrupt || !continent) return 0;
  return regionPortCards(continent)
    .filter((card) => player.property_codes?.includes(card.code) && !isPropertyMortgaged(card.code))
    .length;
}


function buildAiBankPurchaseSignals(player, card, { reason = 'property_purchase' } = {}) {
  const propertyKind = card?.kind || 'port';
  const regionSize = propertyKind === 'port' ? (regionPortCards(card?.continent || '').length || 0) : 0;
  const regionOwned = regionSize ? playerRegionPortCount(player, card?.continent || '') : 0;
  const { fee, multiplier } = getPropertyStopRate(player, card);
  return {
    propertyKind,
    propertyCode: card?.code || '',
    propertyContinent: card?.continent || '',
    regionSize,
    regionOwnedRatio: regionSize ? (regionOwned / regionSize) : 0,
    wouldCompleteMonopoly: Boolean(propertyKind === 'port' && regionSize && regionOwned + 1 >= regionSize),
    rateFee: fee,
    rateMultiplier: multiplier,
    freightPotential: fee * Math.max(1, multiplier),
    mortgageFloor: propertyMortgageCredit(card),
    portsOwned: Math.max(0, Number(player?.ports_owned || 0)),
    tollsOwned: Math.max(0, Number(player?.tolls_owned || 0)),
    permissionCount: availablePermissionRecords(player).length,
    availablePermissionCount: availablePermissionCardsForPlayer(player, { excludeOwned: true }).length,
    reason,
  };
}

function buildAiPermissionSignals(player, availableCards = [], extraCost = 0, { reason = 'extra_permission_after_delivery' } = {}) {
  const livePermissions = availablePermissionRecords(player);
  const ownedPortCards = (player?.property_codes || [])
    .map((code) => getPropertyCard(code))
    .filter((card) => card?.kind === 'port' && !isPropertyMortgaged(card.code));
  let bestCurrentFreight = 0;
  let bestNewPermissionFreight = 0;

  ownedPortCards.forEach((card) => {
    livePermissions.forEach((permission) => {
      const row = getRate(card, permission.kind || permission.id) || { fee: 0, multiplier: 1 };
      bestCurrentFreight = Math.max(bestCurrentFreight, Number(row.fee || 0) * Math.max(1, Number(row.multiplier || 1)));
    });
    availableCards.forEach((permissionCard) => {
      const row = getRate(card, permissionCard.kind || permissionCard.id) || { fee: 0, multiplier: 1 };
      bestNewPermissionFreight = Math.max(bestNewPermissionFreight, Number(row.fee || 0) * Math.max(1, Number(row.multiplier || 1)));
    });
  });

  return {
    ownedPortCount: Math.max(0, Number(player?.ports_owned || 0)),
    ownedTollCount: Math.max(0, Number(player?.tolls_owned || 0)),
    permissionCount: livePermissions.length,
    availableCount: availableCards.length,
    extraCost,
    bestCurrentFreight,
    bestNewPermissionFreight,
    reason,
  };
}

function buildAiNegotiationSignals(buyer, seller, card, { reason = 'owned_property_negotiation', stop = null, listPrice = 0 } = {}) {
  const propertyKind = card?.kind || 'port';
  const regionSize = propertyKind === 'port' ? (regionPortCards(card?.continent || '').length || 0) : 0;
  const buyerRegionOwned = regionSize ? playerRegionPortCount(buyer, card?.continent || '') : 0;
  const sellerRegionOwned = regionSize ? playerRegionPortCount(seller, card?.continent || '') : 0;
  const { fee, multiplier } = getPropertyStopRate(buyer, card);
  return {
    propertyKind,
    propertyCode: card?.code || '',
    propertyContinent: card?.continent || '',
    listPrice,
    ownerCharge: stop?.ownerCharge || 0,
    bankFee: stop?.bankFee || 0,
    rateFee: fee,
    rateMultiplier: multiplier,
    freightPotential: fee * Math.max(1, multiplier),
    mortgageFloor: propertyMortgageCredit(card),
    regionSize,
    buyerRegionBeforeRatio: regionSize ? (buyerRegionOwned / regionSize) : 0,
    buyerRegionAfterRatio: regionSize ? (Math.min(regionSize, buyerRegionOwned + 1) / regionSize) : 0,
    sellerRegionBeforeRatio: regionSize ? (sellerRegionOwned / regionSize) : 0,
    sellerRegionAfterRatio: regionSize ? (Math.max(0, sellerRegionOwned - 1) / regionSize) : 0,
    buyerWouldCompleteMonopoly: Boolean(propertyKind === 'port' && regionSize && buyerRegionOwned + 1 >= regionSize),
    sellerWouldLoseMonopoly: Boolean(propertyKind === 'port' && regionSize && sellerRegionOwned >= regionSize),
    buyerPortsOwned: buyer?.ports_owned || 0,
    buyerTollsOwned: buyer?.tolls_owned || 0,
    sellerPortsOwned: seller?.ports_owned || 0,
    sellerTollsOwned: seller?.tolls_owned || 0,
    reason,
  };
}

function barterEligiblePropertyCards(player, { excludeCodes = [] } = {}) {
  if (!player || player.bankrupt) return [];
  const excluded = new Set((Array.isArray(excludeCodes) ? excludeCodes : []).map((code) => String(code || '').toUpperCase()));
  return (player.property_codes || [])
    .map((code) => getPropertyCard(code))
    .filter((card) => card && (card.kind === 'port' || card.kind === 'toll' || card.is_toll))
    .filter((card) => !excluded.has(String(card.code || '').toUpperCase()))
    .filter((card) => !card.mortgaged);
}

function barterBundleLabel(codes = []) {
  return (Array.isArray(codes) ? codes : [])
    .map((code) => String(code || '').toUpperCase())
    .filter(Boolean)
    .join(' + ');
}

function buildBarterOfferEntries(giver, receiver, codes, { reason = 'owned_property_negotiation', stop = null } = {}) {
  return Array.from(new Set((Array.isArray(codes) ? codes : [])
    .map((code) => String(code || '').toUpperCase())
    .filter(Boolean)))
    .map((code) => getPropertyCard(code))
    .filter((card) => card && giver?.property_codes?.includes(card.code) && !card.mortgaged)
    .map((offerCard) => ({
      card: offerCard,
      price: offerCard.price,
      negotiationSignals: buildAiNegotiationSignals(receiver, giver, offerCard, {
        reason: `${reason}_barter_offer`,
        stop,
        listPrice: offerCard.price,
      }),
    }));
}

function evaluateOwnedPropertyBarterProposal(buyer, seller, card, offeredCodes, {
  listPrice = 0,
  reason = 'owned_property_negotiation',
  stop = null,
} = {}) {
  const targetSignals = buildAiNegotiationSignals(buyer, seller, card, { reason, stop, listPrice });
  const offeredBundle = buildBarterOfferEntries(buyer, seller, offeredCodes, { reason, stop });
  return aiPolicyEngine()?.evaluateOwnedPropertyBarter
    ? aiPolicyEngine().evaluateOwnedPropertyBarter({
        player: buyer,
        owner: seller,
        card,
        price: listPrice,
        offeredBundle,
        context: aiDecisionContext(buyer, {
          reason,
          negotiationSignals: targetSignals,
        }),
      })
    : { accepted: false, reason: 'engine_missing', offeredEntries: [] };
}

function barterRejectionDetail(evaluation, receiverName) {
  if (!evaluation) return 'A proposta de troca nao pode ser avaliada agora.';
  if (evaluation.reason === 'trade_locked' || evaluation.reason === 'seller_closed_market') {
    return `${receiverName} nao abre troca nesta configuracao de mesa.`;
  }
  if (evaluation.reason === 'buyer_closed_market') {
    return 'Seu perfil atual nao permite abrir troca nesta configuracao de mesa.';
  }
  if (evaluation.reason === 'seller_value_shortfall') {
    return `${receiverName} achou o pacote fraco para compensar o ativo pedido.`;
  }
  if (evaluation.reason === 'buyer_overpay') {
    return 'A troca exigiria ativos demais do ofertante.';
  }
  if (evaluation.reason === 'empty_bundle') {
    return 'Selecione pelo menos um porto ou pedagio para propor a troca.';
  }
  return 'A proposta de troca nao ficou equilibrada.';
}

function barterActionLabel(saleAction = 'Vendeu porto') {
  if (saleAction === 'Vendeu pedagio') return 'Trocou pedagio';
  if (saleAction === 'Vendeu porto') return 'Trocou porto';
  return saleAction.replace(/^Vendeu\s+/i, 'Trocou ');
}

function logBarterNegotiationOutcome(buyer, seller, card, offeredCodes, evaluation, { saleAction = 'Vendeu porto' } = {}) {
  if (!buyer || !seller || !card || !evaluation) return;
  const bundleLabel = barterBundleLabel(offeredCodes) || '--';
  if (evaluation.accepted) {
    pushActionLog(buyer, 'Troca aceita', `${card.code} por ${bundleLabel} com ${seller.name}.`);
    pushActionLog(seller, barterActionLabel(saleAction), `${card.code} por troca (${bundleLabel}) para ${buyer.name}.`);
    return;
  }
  const detail = barterRejectionDetail(evaluation, seller.name);
  pushActionLog(buyer, 'Troca recusada', `${card.code} com ${seller.name}: ${detail}`);
  pushActionLog(seller, 'Troca recusada', `${card.code} ficou com ${seller.name}.`);
}

function findCpuOwnedPropertyBarterOffer(buyer, seller, card, {
  listPrice = 0,
  reason = 'owned_property_negotiation',
  stop = null,
} = {}) {
  const eligibleCards = barterEligiblePropertyCards(buyer, { excludeCodes: [card?.code] });
  if (!eligibleCards.length) return null;
  const rankedCards = eligibleCards
    .map((offerCard) => {
      const evaluation = evaluateOwnedPropertyBarterProposal(buyer, seller, card, [offerCard.code], {
        listPrice,
        reason,
        stop,
      });
      const entry = evaluation?.offeredEntries?.[0] || null;
      return {
        card: offerCard,
        receiverValue: Number(entry?.receiverValue || offerCard.price || 0),
      };
    })
    .sort((left, right) => right.receiverValue - left.receiverValue)
    .slice(0, 8)
    .map((entry) => entry.card);

  let best = null;
  const maxBundleSize = Math.min(3, rankedCards.length);
  const walk = (startIndex, bundle) => {
    if (bundle.length) {
      const offeredCodes = bundle.map((entry) => entry.code);
      const evaluation = evaluateOwnedPropertyBarterProposal(buyer, seller, card, offeredCodes, {
        listPrice,
        reason,
        stop,
      });
      if (evaluation?.accepted) {
        const score = Math.abs(Number(evaluation.sellerMargin || 0))
          + (Math.abs(Number(evaluation.buyerMargin || 0)) * 0.35)
          + (bundle.length * 10);
        if (!best || score < best.score) {
          best = { offeredCodes, evaluation, score };
        }
      }
    }
    if (bundle.length >= maxBundleSize) return;
    for (let index = startIndex; index < rankedCards.length; index += 1) {
      bundle.push(rankedCards[index]);
      walk(index + 1, bundle);
      bundle.pop();
    }
  };
  walk(0, []);
  return best;
}

function logCpuNegotiationTranscript(buyer, seller, card, decision, { saleAction = 'Vendeu porto' } = {}) {
  if (!buyer || !seller || !card || !decision) return;
  const opening = (decision.transcript || []).find((entry) => entry.phase === 'opening_offer' && entry.amount > 0);
  const counter = (decision.transcript || []).find((entry) => entry.phase === 'counter_offer' && entry.amount > 0);

  if (decision.mode === 'dynamic') {
    if (opening?.amount) {
      pushActionLog(buyer, 'Oferta enviada', `${card.code} para ${seller.name}: ${formatCurrency(opening.amount)}.`);
    }
    if (counter?.amount) {
      pushActionLog(seller, 'Contraoferta', `${card.code} para ${buyer.name}: ${formatCurrency(counter.amount)}.`);
    }
    if (!decision.accepted) {
      const rejectionDetail = decision.rejectionReason === 'no_overlap'
        ? `sem faixa em comum. Maximo ${formatCurrency(decision.buyerMax || 0)}.`
        : decision.rejectionReason === 'spread_too_small'
          ? `sem margem para fechar ${card.code}.`
          : `sem caixa suficiente para fechar ${card.code}.`;
      pushActionLog(buyer, 'Negociacao recusada', `${card.code} com ${seller.name}: ${rejectionDetail}`);
      pushActionLog(seller, 'Negociacao recusada', `${card.code} ficou com ${seller.name}. Minimo ${formatCurrency(decision.sellerMin || 0)}.`);
      return;
    }
  }

  if (decision.accepted) {
    const detailSuffix = opening?.amount && counter?.amount
      ? ` Oferta ${formatCurrency(opening.amount)} | contraoferta ${formatCurrency(counter.amount)}.`
      : '';
    pushActionLog(buyer, 'Negociacao aceita', `${card.code} por ${formatCurrency(decision.finalPrice || 0)}.${detailSuffix}`.trim());
    pushActionLog(seller, saleAction, `${card.code} por ${formatCurrency(decision.finalPrice || 0)} para ${buyer.name}.`);
  }
}

function executeCpuOwnedPropertyNegotiation(buyer, seller, card, {
  listPrice = 0,
  reason = 'owned_property_negotiation',
  stop = null,
  saleAction = 'Vendeu porto',
} = {}) {
  if (!buyer || !seller || !card || buyer.bankrupt || seller.bankrupt || seller.id === buyer.id) {
    return { accepted: false, finalPrice: 0, decision: null, statusLabel: buyer?.status_label || '--' };
  }

  const signals = buildAiNegotiationSignals(buyer, seller, card, { reason, stop, listPrice });
  const legacyFallbackAccepted = cpuShouldNegotiateOwnedProperty(buyer, listPrice, seller, card);
  const decision = aiPolicyEngine()?.decideOwnedPropertyNegotiation
    ? aiPolicyEngine().decideOwnedPropertyNegotiation({
        player: buyer,
        owner: seller,
        card,
        price: listPrice,
        context: aiDecisionContext(buyer, {
          reason,
          negotiationSignals: signals,
        }),
      })
    : {
        accepted: legacyFallbackAccepted,
        shouldBuy: legacyFallbackAccepted,
        finalPrice: listPrice,
        mode: 'legacy',
        transcript: [],
      };

  if (!decision?.accepted || !(decision.finalPrice > 0)) {
    const barterOffer = findCpuOwnedPropertyBarterOffer(buyer, seller, card, {
      listPrice,
      reason,
      stop,
    });
    if (barterOffer?.evaluation?.accepted && exchangePropertyBundle(seller, buyer, card.code, barterOffer.offeredCodes)) {
      buyer.status_label = `trocou por ${card.code}`;
      logBarterNegotiationOutcome(buyer, seller, card, barterOffer.offeredCodes, barterOffer.evaluation, { saleAction });
      renderHud();
      return {
        accepted: true,
        finalPrice: 0,
        barter: true,
        offeredCodes: barterOffer.offeredCodes,
        decision: barterOffer.evaluation,
        statusLabel: buyer.status_label,
      };
    }
    if (decision?.mode === 'dynamic') {
      logCpuNegotiationTranscript(buyer, seller, card, decision, { saleAction });
      renderHud();
    }
    return {
      accepted: false,
      finalPrice: 0,
      decision,
      statusLabel: buyer.status_label || '--',
    };
  }

  const finalPrice = Math.round(Number(decision.finalPrice || 0));
  if (!(finalPrice > 0) || !transferProperty(seller, buyer, card.code, finalPrice)) {
    const barterOffer = findCpuOwnedPropertyBarterOffer(buyer, seller, card, {
      listPrice,
      reason,
      stop,
    });
    if (barterOffer?.evaluation?.accepted && exchangePropertyBundle(seller, buyer, card.code, barterOffer.offeredCodes)) {
      buyer.status_label = `trocou por ${card.code}`;
      logBarterNegotiationOutcome(buyer, seller, card, barterOffer.offeredCodes, barterOffer.evaluation, { saleAction });
      renderHud();
      return {
        accepted: true,
        finalPrice: 0,
        barter: true,
        offeredCodes: barterOffer.offeredCodes,
        decision: barterOffer.evaluation,
        statusLabel: buyer.status_label,
      };
    }
    if (decision?.mode === 'dynamic') {
      pushActionLog(buyer, 'Negociacao recusada', `${card.code} com ${seller.name}: nao conseguiu fechar por ${formatCurrency(finalPrice)}.`);
      pushActionLog(seller, 'Negociacao recusada', `${card.code} permaneceu com ${seller.name}.`);
      renderHud();
    }
    return {
      accepted: false,
      finalPrice: 0,
      decision,
      statusLabel: buyer.status_label || '--',
    };
  }

  buyer.status_label = `comprou ${card.code}`;
  logCpuNegotiationTranscript(buyer, seller, card, {
    ...decision,
    accepted: true,
    finalPrice,
  }, { saleAction });
  renderHud();
  return {
    accepted: true,
    finalPrice,
    decision,
    statusLabel: buyer.status_label,
  };
}
function prepareHumanOwnedPropertyNegotiation(buyer, seller, card, {
  listPrice = 0,
  reason = 'owned_property_negotiation',
  stop = null,
  saleAction = 'Vendeu porto',
} = {}) {
  const signals = buildAiNegotiationSignals(buyer, seller, card, { reason, stop, listPrice });
  const decision = aiPolicyEngine()?.buildHumanOwnedPropertyNegotiation
    ? aiPolicyEngine().buildHumanOwnedPropertyNegotiation({
        player: buyer,
        owner: seller,
        card,
        price: listPrice,
        context: aiDecisionContext(buyer, {
          reason,
          negotiationSignals: signals,
        }),
      })
    : null;

  return {
    saleAction,
    reason,
    signals,
    decision,
    canNegotiate: Boolean(decision?.canNegotiate),
  };
}

function humanNegotiationRejectionDetail(decision, seller, card) {
  if (decision?.robotLine) return decision.robotLine;
  if (decision?.reason === 'human_declined') {
    return `${card.code} ficou com ${seller.name}.`;
  }
  if (decision?.reason === 'insufficient_cash') {
    return `sem caixa para fechar ${card.code}.`;
  }
  if (decision?.reason === 'lowball') {
    return `a proposta ficou baixa demais para ${card.code}.`;
  }
  if (decision?.reason === 'final_refusal') {
    return `${seller.name} preferiu manter ${card.code}.`;
  }
  if (decision?.reason === 'cash_gap') {
    return `seu caixa nao chegou onde ${seller.name} queria.`;
  }
  return `${card.code} ficou com ${seller.name}.`;
}

function logHumanNegotiationStart(buyer, seller, card, session) {
  if (!buyer || !seller || !card || !session?.currentAsk) return;
  const suffix = session?.sellerLine ? ` ${session.sellerLine}` : '';
  pushActionLog(seller, 'Oferta enviada', `${card.code} para voce: ${formatCurrency(session.currentAsk)}.${suffix}`);
}

function logHumanNegotiationCounter(buyer, seller, card, amount) {
  if (!buyer || !seller || !card || !(amount > 0)) return;
  pushActionLog(buyer, 'Contraoferta', `${card.code} para ${seller.name}: ${formatCurrency(amount)}.`);
}

function logHumanNegotiationOutcome(buyer, seller, card, result, { saleAction = 'Vendeu porto' } = {}) {
  if (!buyer || !seller || !card || !result) return;
  if (result.accepted) {
    pushActionLog(buyer, 'Negociacao aceita', `${card.code} por ${formatCurrency(result.finalPrice || 0)} com ${seller.name}.`);
    pushActionLog(seller, saleAction, `${card.code} por ${formatCurrency(result.finalPrice || 0)} para ${buyer.name}.`);
    return;
  }
  const detail = humanNegotiationRejectionDetail(result, seller, card);
  pushActionLog(buyer, 'Negociacao recusada', `${card.code} com ${seller.name}: ${detail}`);
  pushActionLog(seller, 'Negociacao recusada', `${card.code} ficou com ${seller.name}.`);
}


function logHumanSaleNegotiationStart(buyer, seller, card, session) {
  if (!buyer || !seller || !card || !session?.currentBid) return;
  const suffix = session?.buyerLine ? ` ${session.buyerLine}` : '';
  pushActionLog(buyer, 'Oferta enviada', `${card.code} para ${seller.name}: ${formatCurrency(session.currentBid)}.${suffix}`);
}

function humanSaleNegotiationRejectionDetail(decision, buyer, card) {
  if (decision?.robotLine) return decision.robotLine;
  if (decision?.reason === 'seller_declined') {
    return `${card.code} ficou com voce.`;
  }
  if (decision?.reason === 'cash_gap') {
    return `${buyer.name} nao chegou no seu pedido por ${card.code}.`;
  }
  if (decision?.reason === 'high_ask') {
    return `${buyer.name} achou alto demais o pedido por ${card.code}.`;
  }
  if (decision?.reason === 'final_refusal') {
    return `${buyer.name} desistiu de ${card.code}.`;
  }
  return `${card.code} ficou com voce.`;
}

function logHumanSaleNegotiationCounter(buyer, seller, card, amount) {
  if (!buyer || !seller || !card || !(amount > 0)) return;
  pushActionLog(seller, 'Contraoferta', `${card.code} para ${buyer.name}: ${formatCurrency(amount)}.`);
}

function logHumanSaleNegotiationOutcome(buyer, seller, card, result, { saleAction = 'Vendeu porto' } = {}) {
  if (!buyer || !seller || !card || !result) return;
  if (result.accepted) {
    pushActionLog(buyer, 'Negociacao aceita', `${card.code} por ${formatCurrency(result.finalPrice || 0)} com ${seller.name}.`);
    pushActionLog(seller, saleAction, `${card.code} por ${formatCurrency(result.finalPrice || 0)} para ${buyer.name}.`);
    return;
  }
  const detail = humanSaleNegotiationRejectionDetail(result, buyer, card);
  pushActionLog(buyer, 'Negociacao recusada', `${card.code} ficou com ${seller.name}: ${detail}`);
  pushActionLog(seller, 'Negociacao recusada', `${card.code} ficou com voce.`);
}

function prepareHumanSaleToRobotNegotiation(seller, buyer, card, {
  listPrice = 0,
  reason = 'owned_property_negotiation',
  stop = null,
  saleAction = 'Vendeu porto',
} = {}) {
  const signals = buildAiNegotiationSignals(buyer, seller, card, { reason, stop, listPrice });
  const decision = aiPolicyEngine()?.buildHumanSalePropertyNegotiation
    ? aiPolicyEngine().buildHumanSalePropertyNegotiation({
        player: buyer,
        owner: seller,
        card,
        price: listPrice,
        context: aiDecisionContext(buyer, {
          reason,
          negotiationSignals: signals,
        }),
      })
    : null;
  return {
    saleAction,
    reason,
    signals,
    decision,
    canNegotiate: Boolean(decision?.canNegotiate),
  };
}

async function runHumanSaleToRobotNegotiation(seller, buyer, card, {
  listPrice = 0,
  reason = 'owned_property_negotiation',
  stop = null,
  saleAction = 'Vendeu porto',
  title = 'Negociacao',
  copy = 'O robo abriu uma oferta pelo seu ativo.',
} = {}) {
  if (!buyer || !seller || !card || buyer.bankrupt || seller.bankrupt || seller.id === buyer.id) {
    return { accepted: false, finalPrice: 0, decision: null };
  }
  if (isTradeLockSellEnabled()) {
    return { accepted: false, finalPrice: 0, decision: null, blocked: true };
  }

  const prepared = prepareHumanSaleToRobotNegotiation(seller, buyer, card, {
    listPrice,
    reason,
    stop,
    saleAction,
  });
  let session = prepared.decision;
  if (!session?.canNegotiate) {
    return {
      accepted: false,
      finalPrice: 0,
      decision: session,
      blocked: true,
    };
  }

  logHumanSaleNegotiationStart(buyer, seller, card, session);
  renderHud();

  const barterCards = barterEligiblePropertyCards(buyer, { excludeCodes: [card.code] });

  while (session?.canNegotiate) {
    const response = await openHumanNegotiationRound({
      session,
      title,
      copy,
      cardCode: card.code,
      sellerName: seller.name,
      buyerName: buyer.name,
      mode: 'sell',
      barter: {
        enabled: barterCards.length > 0,
        sourcePlayerId: buyer.id,
        sourceName: buyer.name,
        availableCodes: barterCards.map((entry) => entry.code),
        copy: `Selecione os portos e pedagios de ${buyer.name} para pedir em troca do ativo.`,
      },
    });

    if (!response || response.action === 'refuse') {
      const decision = aiPolicyEngine()?.closeHumanSaleNegotiation
        ? aiPolicyEngine().closeHumanSaleNegotiation({
            session,
            reason: 'seller_declined',
          })
        : { status: 'rejected', accepted: false, reason: 'seller_declined', session };
      logHumanSaleNegotiationOutcome(buyer, seller, card, decision, { saleAction });
      renderHud();
      return { accepted: false, finalPrice: 0, decision };
    }

    if (response.action === 'accept') {
      const decision = aiPolicyEngine()?.acceptHumanSaleOffer
        ? aiPolicyEngine().acceptHumanSaleOffer({ session })
        : { status: 'accepted', accepted: true, finalPrice: session.currentBid, session };
      const finalPrice = Math.round(Number(decision.finalPrice || 0));
      if (!(finalPrice > 0) || !transferProperty(seller, buyer, card.code, finalPrice)) {
        const failed = { ...decision, accepted: false, reason: 'insufficient_cash' };
        logHumanSaleNegotiationOutcome(buyer, seller, card, failed, { saleAction });
        renderHud();
        return { accepted: false, finalPrice: 0, decision: failed };
      }
      buyer.status_label = `comprou ${card.code}`;
      logHumanSaleNegotiationOutcome(buyer, seller, card, { ...decision, accepted: true, finalPrice }, { saleAction });
      renderHud();
      return { accepted: true, finalPrice, decision };
    }

    if (response.action === 'barter') {
      const evaluation = evaluateOwnedPropertyBarterProposal(buyer, seller, card, response.codes, {
        listPrice,
        reason,
        stop,
      });
      if (evaluation?.accepted && exchangePropertyBundle(seller, buyer, card.code, response.codes)) {
        buyer.status_label = `trocou por ${card.code}`;
        logBarterNegotiationOutcome(buyer, seller, card, response.codes, evaluation, { saleAction });
        renderHud();
        return { accepted: true, finalPrice: 0, barter: true, offeredCodes: response.codes, decision: evaluation };
      }
      session = {
        ...session,
        buyerLine: barterRejectionDetail(evaluation, seller.name),
      };
      pushActionLog(buyer, 'Troca recusada', `${card.code} para ${seller.name}: ${session.buyerLine}`);
      renderHud();
      continue;
    }

    logHumanSaleNegotiationCounter(buyer, seller, card, response.amount);
    const decision = aiPolicyEngine()?.respondToHumanSaleCounterOffer
      ? aiPolicyEngine().respondToHumanSaleCounterOffer({
          session,
          ask: response.amount,
        })
      : { status: 'rejected', accepted: false, reason: 'engine_missing', session };

    if (decision.status === 'accepted') {
      const finalPrice = Math.round(Number(decision.finalPrice || 0));
      if (!(finalPrice > 0) || !transferProperty(seller, buyer, card.code, finalPrice)) {
        const failed = { ...decision, accepted: false, reason: 'insufficient_cash' };
        logHumanSaleNegotiationOutcome(buyer, seller, card, failed, { saleAction });
        renderHud();
        return { accepted: false, finalPrice: 0, decision: failed };
      }
      buyer.status_label = `comprou ${card.code}`;
      logHumanSaleNegotiationOutcome(buyer, seller, card, { ...decision, accepted: true, finalPrice }, { saleAction });
      renderHud();
      return { accepted: true, finalPrice, decision };
    }

    if (decision.status === 'countered') {
      const counterAmount = Number(decision.counterPrice || decision.session?.currentBid || 0);
      if (counterAmount > 0) {
        const suffix = decision.robotLine ? ` ${decision.robotLine}` : '';
        pushActionLog(buyer, 'Contraoferta', `${card.code} para ${seller.name}: ${formatCurrency(counterAmount)}.${suffix}`);
      }
      session = decision.session;
      renderHud();
      continue;
    }

    logHumanSaleNegotiationOutcome(buyer, seller, card, decision, { saleAction });
    renderHud();
    return { accepted: false, finalPrice: 0, decision };
  }

  return { accepted: false, finalPrice: 0, decision: session };
}

async function runHumanOwnedPropertyNegotiation(buyer, seller, card, {
  listPrice = 0,
  reason = 'owned_property_negotiation',
  stop = null,
  saleAction = 'Vendeu porto',
  title = 'Negociacao',
  copy = 'Negocie o valor com o outro jogador.',
} = {}) {
  if (!buyer || !seller || !card || buyer.bankrupt || seller.bankrupt || seller.id === buyer.id) {
    return { accepted: false, finalPrice: 0, decision: null };
  }

  const prepared = prepareHumanOwnedPropertyNegotiation(buyer, seller, card, {
    listPrice,
    reason,
    stop,
    saleAction,
  });
  let session = prepared.decision;

  if (!session?.canNegotiate) {
    return {
      accepted: false,
      finalPrice: 0,
      decision: session,
      blocked: true,
    };
  }

  logHumanNegotiationStart(buyer, seller, card, session);
  renderHud();

  const barterCards = barterEligiblePropertyCards(buyer, { excludeCodes: [card.code] });

  while (session?.canNegotiate) {
    const response = await openHumanNegotiationRound({
      session,
      title,
      copy,
      cardCode: card.code,
      sellerName: seller.name,
      buyerName: buyer.name,
      barter: {
        enabled: barterCards.length > 0,
        sourcePlayerId: buyer.id,
        sourceName: buyer.name,
        availableCodes: barterCards.map((entry) => entry.code),
        copy: `Selecione os seus portos e pedagios para oferecer a ${seller.name} em troca do ativo.`,
      },
    });

    if (!response || response.action === 'refuse') {
      const decision = aiPolicyEngine()?.closeHumanOwnedPropertyNegotiation
        ? aiPolicyEngine().closeHumanOwnedPropertyNegotiation({
            session,
            reason: 'human_declined',
          })
        : { status: 'rejected', accepted: false, reason: 'human_declined', session };
      logHumanNegotiationOutcome(buyer, seller, card, decision, { saleAction });
      renderHud();
      return { accepted: false, finalPrice: 0, decision };
    }

    if (response.action === 'accept') {
      const decision = aiPolicyEngine()?.acceptHumanOwnedPropertyOffer
        ? aiPolicyEngine().acceptHumanOwnedPropertyOffer({ session })
        : { status: 'accepted', accepted: true, finalPrice: session.currentAsk, session };
      const finalPrice = Math.round(Number(decision.finalPrice || 0));
      if (!(finalPrice > 0) || !transferProperty(seller, buyer, card.code, finalPrice)) {
        const failed = { ...decision, accepted: false, reason: 'insufficient_cash' };
        logHumanNegotiationOutcome(buyer, seller, card, failed, { saleAction });
        renderHud();
        return { accepted: false, finalPrice: 0, decision: failed };
      }
      buyer.status_label = `comprou ${card.code}`;
      logHumanNegotiationOutcome(buyer, seller, card, { ...decision, accepted: true, finalPrice }, { saleAction });
      renderHud();
      return { accepted: true, finalPrice, decision };
    }

    if (response.action === 'barter') {
      const evaluation = evaluateOwnedPropertyBarterProposal(buyer, seller, card, response.codes, {
        listPrice,
        reason,
        stop,
      });
      if (evaluation?.accepted && exchangePropertyBundle(seller, buyer, card.code, response.codes)) {
        buyer.status_label = `trocou por ${card.code}`;
        logBarterNegotiationOutcome(buyer, seller, card, response.codes, evaluation, { saleAction });
        renderHud();
        return { accepted: true, finalPrice: 0, barter: true, offeredCodes: response.codes, decision: evaluation };
      }
      session = {
        ...session,
        sellerLine: barterRejectionDetail(evaluation, seller.name),
      };
      pushActionLog(buyer, 'Troca recusada', `${card.code} com ${seller.name}: ${session.sellerLine}`);
      renderHud();
      continue;
    }

    logHumanNegotiationCounter(buyer, seller, card, response.amount);
    const decision = aiPolicyEngine()?.respondToHumanOwnedPropertyOffer
      ? aiPolicyEngine().respondToHumanOwnedPropertyOffer({
          session,
          offer: response.amount,
        })
      : { status: 'rejected', accepted: false, reason: 'engine_missing', session };

    if (decision.status === 'accepted') {
      const finalPrice = Math.round(Number(decision.finalPrice || 0));
      if (!(finalPrice > 0) || !transferProperty(seller, buyer, card.code, finalPrice)) {
        const failed = { ...decision, accepted: false, reason: 'insufficient_cash' };
        logHumanNegotiationOutcome(buyer, seller, card, failed, { saleAction });
        renderHud();
        return { accepted: false, finalPrice: 0, decision: failed };
      }
      buyer.status_label = `comprou ${card.code}`;
      logHumanNegotiationOutcome(buyer, seller, card, { ...decision, accepted: true, finalPrice }, { saleAction });
      renderHud();
      return { accepted: true, finalPrice, decision };
    }

    if (decision.status === 'countered') {
      const counterAmount = Number(decision.counterPrice || decision.session?.currentAsk || 0);
      if (counterAmount > 0) {
        const suffix = decision.robotLine ? ` ${decision.robotLine}` : '';
        pushActionLog(seller, 'Contraoferta', `${card.code} para voce: ${formatCurrency(counterAmount)}.${suffix}`);
      }
      session = decision.session;
      renderHud();
      continue;
    }

    logHumanNegotiationOutcome(buyer, seller, card, decision, { saleAction });
    renderHud();
    return { accepted: false, finalPrice: 0, decision };
  }

  return { accepted: false, finalPrice: 0, decision: session };
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

function currentTurnNumber() {
  return Math.max(0, Number(state.session?.turn_number || 0));
}

function cargoIconMarkup(kind, className) {
  const src = state.assets?.cargo_icons?.[kind];
  return src ? `<img src="${src}" class="${className}" alt="${kind}" />` : `<span class="${className}">${kind}</span>`;
}

function permissionMiniMarkup(permission) {
  const normalized = normalizePermissionState(permission) || permission || {};
  const mortgaged = Boolean(normalized?.mortgaged);
  return `
    <article class="preview-permission-mini${mortgaged ? ' is-mortgaged' : ''}" style="--permission-accent:${normalized.accent}; --permission-text:${normalized.text};">
      
      <header class="preview-permission-mini-head">${normalized.title}</header>
      <div class="preview-permission-mini-row top">
        <span class="preview-permission-mini-icon">${cargoIconMarkup(normalized.kind, 'preview-permission-mini-image')}</span>
        <span class="preview-permission-mini-icon">${cargoIconMarkup(normalized.kind, 'preview-permission-mini-image')}</span>
      </div>
      <div class="preview-permission-mini-body">Permissao</div>
      <div class="preview-permission-mini-row bottom">
        <span class="preview-permission-mini-icon">${cargoIconMarkup(normalized.kind, 'preview-permission-mini-image')}</span>
        <span class="preview-permission-mini-icon">${cargoIconMarkup(normalized.kind, 'preview-permission-mini-image')}</span>
      </div>
    </article>
  `;
}

function tollDiamondSvg(stroke = '#05070a') {
  return `<svg viewBox="0 0 28 18" class="port-draw-toll-diamond" aria-hidden="true"><polygon points="14,2 26,9 14,16 2,9" fill="none" stroke="${stroke}" stroke-width="2.8"></polygon></svg>`;
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
        ${card.is_toll ? `<span class="preview-property-mini-diamond">${tollDiamondSvg('#05070a')}</span>` : `<span class="preview-property-mini-number-spacer"></span>`}
        <div class="preview-property-mini-heading">
          <strong class="preview-property-mini-code">${card.code}</strong>
          <span class="preview-property-mini-name">${card.name}</span>
        </div>
        ${card.is_toll ? `<span class="preview-property-mini-diamond">${tollDiamondSvg('#05070a')}</span>` : '<span class="preview-property-mini-number-spacer"></span>'}
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

const REGION_ORDER = Object.keys(REGION_LABELS);

function regionOrderIndex(regionCode) {
  const normalized = String(regionCode || '').trim().toUpperCase();
  const index = REGION_ORDER.indexOf(normalized);
  return index >= 0 ? index : REGION_ORDER.length;
}

function propertyRegionSortValue(card) {
  return `${String(regionOrderIndex(card?.continent || '')).padStart(2, '0')}|${String(card?.continent || '').toUpperCase()}|${String(card?.code || '').toUpperCase()}`;
}

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

function resolveDrawerAiProfile(player) {
  if (!player || player.is_human) return null;
  return cloneAiData(
    player.ai_profile
    || (aiProfilesLib()?.buildProfile
      ? aiProfilesLib().buildProfile({
        archetypeId: player.ai_archetype_id || player.ai_profile_id || 'legacy_open',
        overrides: cloneAiData(player.ai_profile_overrides || {}) || {},
      })
      : null)
    || null
  );
}

function playerProfileDrawerMarkup(player) {
  const profile = resolveDrawerAiProfile(player);
  if (!profile) return '';
  const presetMaps = aiProfilesLib?.() || {};
  const chips = [
    { family: 'Negociacao', short: 'NEG', groupKey: 'negotiation', presets: presetMaps.negotiationPresets || {} },
    { family: 'Visao', short: 'VIS', groupKey: 'vision', presets: presetMaps.visionPresets || {} },
    { family: 'Personalidade', short: 'PER', groupKey: 'personality', presets: presetMaps.personalityPresets || {} },
    { family: 'Habilidades', short: 'HAB', groupKey: 'skill', presets: presetMaps.skillPresets || {} },
  ]
    .map((entry) => {
      const resolvedPresetId = resolveAiProfilePresetId(profile, entry.groupKey);
      const resolvedLabel = entry.presets[resolvedPresetId]?.label
        ? String(entry.presets[resolvedPresetId].label).toLowerCase()
        : String(aiDefaultPresetIdForGroup(entry.groupKey) || '').toLowerCase();
      return `<span class="preview-rival-profile" title="${escapeHtml(entry.family)}: ${escapeHtml(resolvedLabel)}"><span class="preview-rival-profile-prefix">${escapeHtml(entry.short)}</span> <span class="preview-rival-profile-value">${escapeHtml(resolvedLabel)}</span></span>`;
    })
    .join('');
  if (!chips) return '';
  return `
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Perfil</span>
        <div class="preview-rival-monopoly-list">${chips}</div>
      </div>
  `;
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
      <div class="preview-rival-action-log-chip" style="font-size:0.58rem;">${entries.length} ${entries.length > 1 ? 'acoes' : 'acao'}</div>
      <div class="preview-rival-action-feed">
        ${entries.map((entry, index) => `
          <article class="preview-rival-action-entry${index === 0 ? ' is-newest' : ''}">
            <span class="preview-rival-action-entry-accent" style="background:${entry.color}; box-shadow:0 0 8px ${entry.glow};"></span>
            <div class="preview-rival-action-entry-body">
              <strong class="preview-rival-action-entry-title" style="font-size:0.72rem;">${entry.action}</strong>
              <span class="preview-rival-action-entry-detail" style="font-size:0.64rem;">${entry.detail}</span>
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
  if (!contract) {
    return `
      <div class="preview-rival-contract-line is-empty">
        <span class="preview-rival-contract-muted">primeiro turno pendente</span>
      </div>
    `;
  }
  const cargoLabel = contract.cargo_label || player?.active_permission_label || 'Sem carga';
  const cargoIcon = player?.active_permission_id ? cargoIconMarkup(player.active_permission_id, 'preview-rival-contract-cargo-icon') : '';
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
  const freightCheck = contract.completed ? '<span class="preview-rival-contract-check" aria-label="Contrato concluido">&#10003;</span>' : '';
  return `
    <div class="preview-rival-contract-line">
      <span class="preview-rival-contract-cargo">${cargoIconMarkup(player.active_permission_id, 'preview-rival-contract-cargo-icon')}${player.active_permission_label}</span>
      <span class="preview-rival-contract-turns is-${tone}">(${contract.deadline_progress || '0/4'}) turnos</span>
      <span class="preview-rival-contract-freight">${freightCheck}${contract.freight_label || 'Sem frete'}</span>
    </div>
    <div class="preview-rival-bottomline">
      <div class="preview-rival-route">${contractRouteMarkup(contract, { emptyText: 'primeiro turno pendente', player })}</div>
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
  items.forEach((item, index) => {
    item.style.zIndex = item.classList.contains('is-selected') ? String(items.length + 2) : String(index + 1);
  });
  if (items.length <= 1) {
    strip.style.setProperty('--stack-overlap', '0px');
    return;
  }
  const computed = window.getComputedStyle(strip);
  const paddingLeft = parseFloat(computed.paddingLeft || '0') || 0;
  const paddingRight = parseFloat(computed.paddingRight || '0') || 0;
  const rawWidth = strip.clientWidth || strip.getBoundingClientRect().width || 0;
  const availableWidth = Math.floor(Math.max(0, rawWidth - paddingLeft - paddingRight));
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

function propertyChipMarkup(card) {
  const mortgaged = Boolean(card?.mortgaged);
  const background = card?.fill || '#8fd7ff';
  const text = card?.text || readableTextColor(background);
  return `
      <span class="preview-monopoly-chip preview-property-chip${card.is_toll ? ' is-toll' : ' is-port'}${mortgaged ? ' is-mortgaged' : ''}" style="--property-chip-fill:${background}; --property-chip-text:${text}; background-color:${background}; color:${text}; border-color:${background};">
      <span class="preview-property-chip-code">${card.code}</span>
      ${mortgaged ? '<span class="preview-property-chip-badge">H</span>' : ''}
    </span>
  `;
}

function propertyChipButtonMarkup(playerId, card, selected = false) {
  return miniCardWrapper({
    playerId,
    type: 'property',
    key: card.code,
    selected,
    extraClass: 'preview-mini-selectable-property preview-mini-selectable-property-chip',
    innerMarkup: propertyChipMarkup(card),
  });
}


function routeStopMarkup(code, { large = false, halo = false, haloColor = '', emptyKind = 'port' } = {}) {
  const normalized = String(code || '').toUpperCase();
  const largeClass = large ? ' is-large' : '';
  const haloClass = halo ? ' has-halo' : '';
  const haloStyle = halo && haloColor ? ` --halo-color:${haloColor};` : '';
  const emptyType = emptyKind === 'toll' ? 'toll' : 'port';
  if (!normalized || normalized === '--') {
    return `<span class="preview-route-stop ${emptyType} is-empty${largeClass}"><span class="preview-route-stop-label">--</span></span>`;
  }
  const card = getPropertyCard(normalized);
  if (!card) {
    return `<span class="preview-route-stop ${emptyType} is-empty${largeClass}"><span class="preview-route-stop-label">${normalized}</span></span>`;
  }
  return `
    <span class="preview-route-stop ${card.is_toll ? 'toll' : 'port'}${largeClass}${haloClass}" style="--route-fill:${card.fill}; --route-text:${card.text};${haloStyle}">
      <span class="preview-route-stop-label">${card.code}</span>
    </span>
  `;
}

function contractRouteMarkup(contract, { emptyText = 'primeiro turno pendente', large = false, player = null } = {}) {
  if (!contract) {
    return `<span class="preview-route-empty">${emptyText}</span>`;
  }
  const hasAnySelection = [contract.origin, contract.mandatory_toll, contract.destination].some((code) => code && code !== '--');
  if (!hasAnySelection) {
    return `<span class="preview-route-empty">${emptyText}</span>`;
  }
  const haloColor = ROUTE_HALO_COLOR;
  const loc = String(player?.location_code || '').toUpperCase();
  const originCode = String(contract.origin || '').toUpperCase();
  const originHalo = Boolean(haloColor && originCode && originCode !== '--' && loc !== originCode);
  const tollHalo = Boolean(haloColor && contract.toll_passed);
  const destHalo = Boolean(haloColor && (contract.route_stage === 'arrived' || contract.completed));
  return `
    <div class="preview-route-inline${large ? ' is-large' : ''}">
      ${routeStopMarkup(contract.origin, { large, halo: originHalo, haloColor, emptyKind: 'port' })}
      <span class="preview-route-arrow">&rsaquo;</span>
      ${routeStopMarkup(contract.mandatory_toll, { large, halo: tollHalo, haloColor, emptyKind: 'toll' })}
      <span class="preview-route-arrow">&rsaquo;</span>
      ${routeStopMarkup(contract.destination, { large, halo: destHalo, haloColor, emptyKind: 'port' })}
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
    .sort((left, right) => regionOrderIndex(left) - regionOrderIndex(right) || left.localeCompare(right));

  const permissionItems = moveSelectedToEnd(
    [...(player.permissions || [])].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))),
    selectedPermissionKey,
    (permission) => permission.id,
  );
  const ownedPropertyCodes = new Set((player.property_codes || []).map((code) => String(code || '').toUpperCase()));
  const portPropertyItems = (state.portCards || [])
    .filter((card) => ownedPropertyCodes.has(String(card?.code || '').toUpperCase()))
    .sort((left, right) => propertyRegionSortValue(left).localeCompare(propertyRegionSortValue(right)));
  const tollPropertyItems = (state.tollCards || [])
    .filter((card) => ownedPropertyCodes.has(String(card?.code || '').toUpperCase()))
    .sort((left, right) => propertyRegionSortValue(left).localeCompare(propertyRegionSortValue(right)));
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

  const portPropertiesMarkup = portPropertyItems.map((card) => propertyChipButtonMarkup(
    player.id,
    card,
    String(card.code) === String(selectedPropertyKey),
  )).join('');

  const tollPropertiesMarkup = tollPropertyItems.map((card) => propertyChipButtonMarkup(
    player.id,
    card,
    String(card.code) === String(selectedPropertyKey),
  )).join('');

  const couponsMarkup = couponItems.map((coupon) => miniCouponMarkup(
    player.id,
    coupon,
    String(couponCardKey(coupon)) === String(selectedCouponKey),
  )).join('');
  const monopoliesMarkup = monopolyItems.map((regionCode) => monopolyChipMarkup(player, regionCode)).join('');
  const profileMarkup = playerProfileDrawerMarkup(player);

  return `
    <div class="preview-rival-drawer">
      ${profileMarkup}
      <div class="preview-rival-drawer-section">
        <span class="preview-rival-drawer-label">Permissoes</span>
        ${miniHandMarkup(permissionsMarkup || '<span class="preview-inline-chip is-muted">sem permissao</span>', 'permissions-hand', miniHandStyle('permission', permissionItems.length))}
      </div>
      <div class="preview-rival-drawer-section">
        <div class="preview-rival-chip-group">
          <span class="preview-rival-drawer-label">Portos</span>
          <div class="preview-rival-chip-strip preview-rival-property-chip-strip">
            ${portPropertiesMarkup || '<span class="preview-inline-chip is-muted">sem titulos</span>'}
          </div>
          ${tollPropertyItems.length ? `
          <span class="preview-rival-drawer-label">Pedagios</span>
          <div class="preview-rival-chip-strip preview-rival-property-chip-strip is-tolls">
            ${tollPropertiesMarkup}
          </div>
          ` : ''}
        </div>
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
    if (isHuman) {
      card.dataset.tutorialAnchor = 'human-player-bar';
      card.dataset.tutorialAnchorLabel = 'Balao do jogador humano';
    }
    card.style.setProperty('--rival-accent', player.color_hex || '#8fd7ff');
    card.style.setProperty('--card-grow', '1');
    card.innerHTML = `
      ${playerActionLogMarkup(player)}
      <div class="preview-rival-top">
        <span class="preview-rival-dot" style="background:${player.color_hex}"></span>
        <div class="preview-rival-name-stack">
          <strong>${isHuman ? player.name : `&#129302; ${player.name}`}${player.bankrupt ? ' (falido)' : ''}</strong>
        </div>
        <span class="preview-rival-cash-wrap">${playerCashFlashMarkup(player)}<span class="preview-rival-cash">${player.cash_display}</span></span>
      </div>
      ${contractSummaryMarkup(player, contract)}
      ${isOpen ? playerDrawerMarkup(player) : ''}
    `;
    target.appendChild(card);
  });
  syncPlayerActionLogOffsets();
  scheduleMiniHandLayout();
  renderTutorialAuthoring();
}

function renderHud({ force = false } = {}) {
  if (!force && shouldDeferUiRefresh()) {
    markDeferredUiRefresh();
    return;
  }

  const human = humanPlayer();
  const contract = human?.active_contract || null;
  setText('preview-turn', state.session?.turn_label || 'Turno 01');
  const active = activePlayer();
  const activeContract = active?.active_contract || null;
  setText('preview-human-name', human?.name || 'Minha Companhia');
  setText('preview-human-port', human?.location_label || '--');
  setText('preview-cash', human?.cash_display || formatCurrency(state.rules.initial_cash || 0));

  renderCompanyList(human);
  renderRivals({ force });
  renderTutorialAuthoring();
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
      free_fuel_for_contract: false,
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

function originMonopolyOwnerForContract(player, contract) {
  if (!player || !contract) return null;
  const originOwner = ownerPlayerOf(contract.origin || '');
  const originCard = getPropertyCard(contract.origin || '');
  if (!originOwner || originOwner.id === player.id || originOwner.bankrupt || !originCard || isPropertyMortgaged(contract.origin || '')) {
    return null;
  }
  return playerHasRegionMonopoly(originOwner, originCard.continent) ? originOwner : null;
}

async function maybeUseCancelContractCoupon(player) {
  const contract = player?.active_contract;
  const coupon = firstCouponOfKind(player, 'cancel_contract');
  if (!player || !contract || contract.completed || !coupon) return null;
  const couponSignals = buildContractCouponSignals(player);
  if (shouldCountContractCouponOpportunity('cancel_contract', couponSignals)) {
    noteCouponOpportunity(coupon);
  }

  if (player.is_human) {
    const choice = await openDecisionModal({
      title: 'Contrato Cancelado',
      copy: `Cancelar o contrato atual ${contract.origin || '--'} -> ${contract.mandatory_toll || '--'} -> ${contract.destination || '--'} e abrir um novo agora?`,
      primaryLabel: 'Cancelar contrato',
      secondaryLabel: 'Manter contrato',
      cardCode: contract.origin || '',
    });
    if (choice !== 'primary') return null;
  } else {
    const couponDecision = aiPolicyEngine()?.decideCouponUsage
      ? aiPolicyEngine().decideCouponUsage({
          player,
          kind: 'cancel_contract',
          autoUse: true,
          context: aiDecisionContext(player, {
            reason: 'coupon_usage',
            couponSignals,
          }),
        })
      : null;
    if (!(couponDecision ? couponDecision.shouldUse : true)) return null;
  }

  const previousRoute = `${contract.origin || '--'} -> ${contract.mandatory_toll || '--'} -> ${contract.destination || '--'}`;
  consumeCouponForPlayer(player, coupon, {
    detail: `Cancelou o contrato ${previousRoute} para abrir um novo.`,
    statusLabel: 'contrato cancelado',
    action: 'Contrato cancelado',
  });
  player.active_contract = null;
  player.needs_new_contract = false;
  const currentCard = getPropertyCard(player.location_code || '');
  await runContractOpeningForPlayer(player, {
    phaseLabel: player.is_human ? 'Novo contrato' : `${player.name}: novo contrato`,
    needsPermission: !(player.permissions || []).length,
    originMode: currentCard?.kind === 'port' ? 'current' : 'draw',
  });
  return { note: `${playerActionName(player)} cancelou o contrato atual e abriu um novo.` };
}

async function maybeUseFreeFuelContractCoupon(player) {
  const contract = player?.active_contract;
  const coupon = firstCouponOfKind(player, 'free_fuel_contract');
  if (!player || !contract || contract.completed || contract.free_fuel_for_contract || !coupon) return null;
  const couponSignals = buildContractCouponSignals(player, {
    destination: contract.destination || '',
  });
  if (shouldCountContractCouponOpportunity('free_fuel_contract', couponSignals)) {
    noteCouponOpportunity(coupon);
  }

  if (player.is_human) {
    const choice = await openDecisionModal({
      title: 'Viagem de Graca',
      copy: `Ativar Viagem de Graca para nao pagar abastecimentos durante todo o contrato ate ${contract.destination || '--'}?`,
      primaryLabel: 'Ativar Viagem de Graca',
      secondaryLabel: 'Guardar cupom',
      cardCode: contract.destination || contract.origin || '',
    });
    if (choice !== 'primary') return null;
  } else {
    const couponDecision = aiPolicyEngine()?.decideCouponUsage
      ? aiPolicyEngine().decideCouponUsage({
          player,
          kind: 'free_fuel_contract',
          autoUse: true,
          context: aiDecisionContext(player, {
            reason: 'coupon_usage',
            couponSignals,
          }),
        })
      : null;
    if (!(couponDecision ? couponDecision.shouldUse : true)) return null;
  }

  contract.free_fuel_for_contract = true;
  consumeCouponForPlayer(player, coupon, {
    detail: `Ativou abastecimento gratis ate o fim do contrato ${contract.destination || '--'}.`,
    statusLabel: 'viagem de graca',
    action: 'Viagem de graca ativada',
  });
  return { note: `${playerActionName(player)} ativou Viagem de Graca para o contrato atual.` };
}

async function maybeUseExtendedDeadlineCoupon(player) {
  const contract = player?.active_contract;
  const coupon = firstCouponOfKind(player, 'extended_contract_deadline');
  if (!player || !contract || contract.completed || !coupon) return null;

  const currentTargetRounds = Math.max(1, Number(contract.target_rounds || state.rules.target_rounds || 4));
  if (currentTargetRounds >= 6) return null;
  const couponSignals = buildContractCouponSignals(player, {
    currentTargetRounds,
    destination: contract.destination || '',
  });
  if (shouldCountContractCouponOpportunity('extended_contract_deadline', couponSignals, currentTargetRounds)) {
    noteCouponOpportunity(coupon);
  }

  if (player.is_human) {
    const choice = await openDecisionModal({
      title: 'Prazo Estendido',
      copy: `Ativar Prazo Estendido para ampliar o prazo deste contrato ate ${contract.destination || '--'} de ${currentTargetRounds} para 6 rodadas?`,
      primaryLabel: 'Ativar Prazo Estendido',
      secondaryLabel: 'Guardar cupom',
      cardCode: contract.destination || contract.origin || '',
    });
    if (choice !== 'primary') return null;
  } else {
    const couponDecision = aiPolicyEngine()?.decideCouponUsage
      ? aiPolicyEngine().decideCouponUsage({
          player,
          kind: 'extended_contract_deadline',
          autoUse: true,
          context: aiDecisionContext(player, {
            reason: 'coupon_usage',
            couponSignals,
          }),
        })
      : null;
    if (!(couponDecision ? couponDecision.shouldUse : true)) return null;
  }

  const roundsElapsed = Math.max(1, Number(contract.rounds_elapsed || 1));
  contract.target_rounds = 6;
  contract.deadline_label = `${roundsElapsed} / 6`;
  contract.deadline_progress = `${roundsElapsed}/6`;
  consumeCouponForPlayer(player, coupon, {
    detail: `Ampliou o prazo do contrato ${contract.destination || '--'} para 6 rodadas sem mudar bonus e onus por rodada.`,
    statusLabel: 'prazo estendido',
    action: 'Prazo estendido ativado',
  });
  return { note: `${playerActionName(player)} ampliou para 6 rodadas o prazo do contrato atual.` };
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
  renderTutorialAuthoring();
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
  handleTutorialEvent('permission_draw_opened', { playerId: 'human' });
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
  renderTutorialAuthoring();
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
    couponSignals: buildContractCouponSignals(player, {
      mandatoryToll: true,
      tollCode: contract.mandatory_toll,
      routeUnlockGainNorm: routeUnlockGainForDestination(player, contract.destination || ''),
    }),
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
  noteCouponOpportunity(coupon);

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
    const scoredCandidates = candidates.map((entry) => {
      const currentNodeId = player.board_node_id || getPropertyNode(contract.origin || '')?.id || '';
      const destinationNodeId = getPropertyNode(entry.card.code || '')?.id || '';
      const directPath = currentNodeId && destinationNodeId ? shortestPath(currentNodeId, destinationNodeId) : [];
      const remainingSteps = Math.max(0, (directPath?.length || 1) - 1);
      const fuelStopsRemaining = countFuelStopsOnPath(directPath);
      const routeUnlockGainNorm = routeUnlockGainForDestination(player, entry.card.code || '');
      return {
        entry,
        remainingSteps,
        fuelStopsRemaining,
        routeUnlockGainNorm,
      };
    }).sort((left, right) => {
      if (right.routeUnlockGainNorm !== left.routeUnlockGainNorm) return right.routeUnlockGainNorm - left.routeUnlockGainNorm;
      if (left.remainingSteps !== right.remainingSteps) return left.remainingSteps - right.remainingSteps;
      if (left.fuelStopsRemaining !== right.fuelStopsRemaining) return left.fuelStopsRemaining - right.fuelStopsRemaining;
      return String(left.entry.card.code || '').localeCompare(String(right.entry.card.code || ''));
    });
    const bestCandidate = scoredCandidates[0] || null;
    const couponDecision = aiPolicyEngine()?.decideCouponUsage
      ? aiPolicyEngine().decideCouponUsage({
          player,
          kind: 'reroute_same_value',
          autoUse: true,
          context: aiDecisionContext(player, {
            reason: 'coupon_usage',
            couponSignals: buildContractCouponSignals(player, {
              candidateCount: candidates.length,
              routeUnlockGainNorm: bestCandidate?.routeUnlockGainNorm || 0,
              remainingSteps: bestCandidate?.remainingSteps ?? 0,
              fuelStopsRemaining: bestCandidate?.fuelStopsRemaining ?? 0,
            }),
          }),
        })
      : null;
    if (!(couponDecision ? couponDecision.shouldUse : true)) {
      return null;
    }
    selected = bestCandidate?.entry || candidates[0];
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
  if (await maybeUseCancelContractCoupon(player)) {
    usedAny = true;
  }
  if (!player?.active_contract || player.active_contract.completed) {
    return usedAny;
  }
  if (await maybeUseExtendedDeadlineCoupon(player)) {
    usedAny = true;
  }
  if (await maybeUseFreeFuelContractCoupon(player)) {
    usedAny = true;
  }
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
    if (isTradeLockBuyEnabled()) return false;
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

    if (owner.id === player.id) return false;
    const negotiation = prepareHumanOwnedPropertyNegotiation(player, owner, card, {
      listPrice: negotiationPrice,
      reason: 'post_delivery_port_negotiation',
      saleAction: 'Vendeu porto',
    });
    if (!negotiation.canNegotiate) {
      await openDecisionModal({
        title: `${card.code} pertence a ${owner.name}`,
        copy: negotiation.decision?.sellerLine || `${owner.name} nao esta disposto a vender agora.`,
        primaryLabel: 'Continuar',
        hideSecondary: true,
        cardCode: card.code,
      });
      return false;
    }
    const choice = await openDecisionModal({
      title: `${card.code} pertence a ${owner.name}`,
      copy: `Deseja abrir uma negociacao pela compra do porto ${card.code} antes do novo contrato?`,
      primaryLabel: 'Negociar agora',
      secondaryLabel: 'Nao negociar',
      cardCode: card.code,
    });
    if (choice !== 'primary') return false;
    const outcome = await runHumanOwnedPropertyNegotiation(player, owner, card, {
      listPrice: negotiationPrice,
      reason: 'post_delivery_port_negotiation',
      saleAction: 'Vendeu porto',
      title: `${card.code} pertence a ${owner.name}`,
      copy: `Negocie a compra do porto ${card.code} com ${owner.name} antes de abrir o proximo contrato.`,
    });
    return Boolean(outcome.accepted);
  }

  if (!owner) {
    if (cpuShouldBuyOrigin(player, card, 'post_delivery_port_purchase') && buyProperty(player, card.code)) {
      pushActionLog(player, 'Porto comprado no destino', `${card.code} por ${formatCurrency(card.price)}.`);
      renderHud();
      return true;
    }
    return false;
  }

  if (owner.id !== player.id) {
    if (owner.is_human) {
      const negotiation = await runHumanSaleToRobotNegotiation(owner, player, card, {
        listPrice: negotiationPrice,
        reason: 'post_delivery_port_negotiation',
        saleAction: 'Vendeu porto',
        title: `${player.name} quer ${card.code}`,
        copy: `${player.name} quer comprar o porto ${card.code} antes da abertura do proximo contrato.` ,
      });
      if (negotiation.accepted) {
        return true;
      }
    } else {
      const negotiation = executeCpuOwnedPropertyNegotiation(player, owner, card, {
        listPrice: negotiationPrice,
        reason: 'post_delivery_port_negotiation',
        saleAction: 'Vendeu porto',
      });
      if (negotiation.accepted) {
        return true;
      }
    }
  }
  return false;
}

async function maybeHandleOwnedOriginPortNegotiation(player, card, { forceHumanPrompt = false } = {}) {
  if (!player || player.bankrupt || !card || card.kind !== 'port') {
    return { attempted: false, accepted: false };
  }
  const owner = ownerPlayerOf(card.code);
  if (!owner || owner.id === player.id || owner.bankrupt) {
    return { attempted: false, accepted: false };
  }
  if (isPropertyMortgaged(card.code)) {
    return { attempted: false, accepted: false, blocked: 'mortgaged' };
  }

  const negotiationPrice = Math.round(Number(card.price || 0) * 1.5);

  if (player.is_human) {
    const negotiation = prepareHumanOwnedPropertyNegotiation(player, owner, card, {
      listPrice: negotiationPrice,
      reason: 'origin_port_negotiation',
      saleAction: 'Vendeu porto',
    });
    if (!forceHumanPrompt || !negotiation.canNegotiate || isTradeLockBuyEnabled()) {
      return {
        attempted: false,
        accepted: false,
        blocked: negotiation.canNegotiate ? 'trade_lock_buy' : 'seller_declined',
        decision: negotiation.decision || null,
      };
    }
    const outcome = await runHumanOwnedPropertyNegotiation(player, owner, card, {
      listPrice: negotiationPrice,
      reason: 'origin_port_negotiation',
      saleAction: 'Vendeu porto',
      title: `${card.code} pertence a ${owner.name}`,
      copy: `Negocie a compra do porto ${card.code} com ${owner.name} antes da abertura do contrato.`,
    });
    return {
      attempted: true,
      accepted: Boolean(outcome?.accepted),
      outcome,
    };
  }

  const outcome = owner.is_human
    ? await runHumanSaleToRobotNegotiation(owner, player, card, {
        listPrice: negotiationPrice,
        reason: 'origin_port_negotiation',
        saleAction: 'Vendeu porto',
        title: `${player.name} quer ${card.code}`,
        copy: `${player.name} quer comprar o porto ${card.code} antes da abertura do contrato.`,
      })
    : executeCpuOwnedPropertyNegotiation(player, owner, card, {
        listPrice: negotiationPrice,
        reason: 'origin_port_negotiation',
        saleAction: 'Vendeu porto',
      });
  return {
    attempted: true,
    accepted: Boolean(outcome?.accepted),
    outcome,
  };
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

  const extraPermissionDecision = aiPolicyEngine()?.decideExtraPermissionPurchase
    ? aiPolicyEngine().decideExtraPermissionPurchase({
        player,
        extraCost,
        availableCount: availablePermissionCards.length,
        context: aiDecisionContext(player, {
          reason: 'extra_permission_after_delivery',
          permissionSignals: buildAiPermissionSignals(player, availablePermissionCards, extraCost, {
            reason: 'extra_permission_after_delivery',
          }),
        }),
      })
    : null;
  if (!(extraPermissionDecision ? extraPermissionDecision.shouldBuy : (player.purchase_policy || 'always') !== 'never')) {
    return false;
  }
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
    await maybeAutoRedeemForRobot(player);
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

  const player = humanPlayer();
  const owner = ownerPlayerOf(card.code);
  const isOwnedByOther = Boolean(owner && player && owner.id !== player.id);
  const isMortgaged = isOwnedByOther && isPropertyMortgaged(card.code);
  const negotiationPrice = Math.round(Number(card.price || 0) * 1.5);
  const negotiation = isOwnedByOther && !isMortgaged && player
    ? prepareHumanOwnedPropertyNegotiation(player, owner, card, {
        listPrice: negotiationPrice,
        reason: 'origin_port_negotiation',
        saleAction: 'Vendeu porto',
      })
    : null;
  const canNegotiateOwnedOrigin = Boolean(negotiation?.canNegotiate) && !isTradeLockBuyEnabled();

  if (isOwnedByOther) {
    if (isMortgaged) {
      configurePortDrawExtra({
        copy: `${card.code} pertence a ${owner.name} e esta hipotecado. O porto inicial sera definido sem compra.`,
        layout: 'inline',
        primaryLabel: 'Continuar',
        hideSecondary: true,
        onPrimary: () => {
          applyHumanOriginSelection(card, false);
          closePortDraw({ card, bought: false, negotiate: false });
        },
      });
      handleTutorialEvent('origin_purchase_ready', { playerId: 'human', portCode: card.code, decision: 'continue' });
      return;
    }

    if (canNegotiateOwnedOrigin) {
      configurePortDrawExtra({
        copy: `${card.code} pertence a ${owner.name}. Deseja abrir uma negociacao antes de iniciar o contrato?`,
        layout: 'inline',
        primaryLabel: 'Negociar',
        secondaryLabel: 'Nao',
        onPrimary: () => {
          applyHumanOriginSelection(card, false);
          closePortDraw({ card, bought: false, negotiate: true });
        },
        onSecondary: () => {
          applyHumanOriginSelection(card, false);
          closePortDraw({ card, bought: false, negotiate: false });
        },
      });
      handleTutorialEvent('origin_purchase_ready', { playerId: 'human', portCode: card.code, decision: 'negotiate' });
      return;
    }

    configurePortDrawExtra({
      copy: `${card.code} pertence a ${owner.name}. ${negotiation?.sellerLine || `${owner.name} nao esta disposto a vender agora.`}`,
      layout: 'inline',
      primaryLabel: 'Continuar',
      hideSecondary: true,
      onPrimary: () => {
        applyHumanOriginSelection(card, false);
        closePortDraw({ card, bought: false, negotiate: false });
      },
    });
    handleTutorialEvent('origin_purchase_ready', { playerId: 'human', portCode: card.code, decision: 'continue' });
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
  handleTutorialEvent('origin_purchase_ready', { playerId: 'human', portCode: card.code, decision: 'buy_or_skip' });
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
  handleTutorialEvent('contract_confirmation_ready', { playerId: 'human', destinationCode: card.code });
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
  handleTutorialEvent('origin_port_draw_opened', { playerId: 'human' });
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
  handleTutorialEvent('toll_port_draw_opened', { playerId: 'human' });
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
  handleTutorialEvent('destination_port_draw_opened', { playerId: 'human' });
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
  if (saveBrowser?.triggerEnterOnOverlay?.()) return true;
  if (!getSaveNameOverlay()?.classList.contains('is-hidden')) {
    const button = getSaveNamePrimary();
    if (button && !button.disabled) { button.click(); return true; }
  }
  if (!getPermissionChoiceOverlay()?.classList.contains('is-hidden')) {
    const button = getPermissionChoiceStage()?.querySelector('.permission-choice-card.is-current, .permission-choice-card');
    if (button && !button.disabled) { button.click(); return true; }
  }
  if (!getNegotiationOverlay()?.classList.contains('is-hidden')) {
    const button = getNegotiationAccept();
    if (button && !button.disabled) { button.click(); return true; }
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
  renderTutorialAuthoring();
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

function contractSettlementStatus(total) {
  const value = Number(total || 0);
  if (value < 0) {
    return `pagou ${formatCurrency(Math.abs(value))}`;
  }
  return `recebeu ${formatCurrency(value)}`;
}

function contractSettlementNarrative(total) {
  const value = Number(total || 0);
  if (value < 0) {
    return `pagou ${formatCurrency(Math.abs(value))} liquidos`;
  }
  return `recebeu ${formatCurrency(value)} liquidos`;
}

async function resolveSettlementCouponModifiersForPlayer(player, contract) {
  const modifiers = { freightMultiplier: 1, waiveOriginShare: false };
  if (!player || !contract) return modifiers;

  const antiMonopolyCoupon = firstCouponOfKind(player, 'anti_monopoly_owner_share');
  if (antiMonopolyCoupon) {
    noteCouponOpportunity(antiMonopolyCoupon);
  }

  const usedDoubleFreight = await maybeSpendCoupon(player, 'double_freight', {
    title: 'Lucro Extra',
    copy: `Usar Lucro Extra para dobrar o frete deste contrato na chegada a ${contract.destination}?`,
    primaryLabel: 'Usar Lucro Extra',
    secondaryLabel: 'Receber normal',
    detail: `Dobrou o frete na liquidacao do contrato para ${contract.destination}.`,
    statusLabel: 'lucro extra ativado',
    couponSignals: buildContractCouponSignals(player, {
      destination: contract.destination || '',
    }),
  });
  if (usedDoubleFreight) {
    modifiers.freightMultiplier = 2;
  }

  const monopolyOwner = originMonopolyOwnerForContract(player, contract);
  if (monopolyOwner) {
    const usedAntiMonopolyOwnerShare = await maybeSpendCoupon(player, 'anti_monopoly_owner_share', {
      title: 'Contra o Monopolio',
      copy: `Usar Contra o Monopolio para impedir a comissao de ${monopolyOwner.name} sobre este contrato monopolista?`,
      primaryLabel: 'Usar Contra o Monopolio',
      secondaryLabel: 'Pagar comissao',
      cardCode: contract.origin,
      detail: `Bloqueou a comissao do dono do monopolio ${monopolyOwner.name} neste contrato.`,
      statusLabel: 'monopolio bloqueado',
      countOpportunity: false,
      couponSignals: buildContractCouponSignals(player, {
        ownerId: monopolyOwner.id,
        destination: contract.destination || '',
        ownerPresent: true,
        ownerMonopoly: true,
      }),
    });
    if (usedAntiMonopolyOwnerShare) {
      modifiers.waiveOriginShare = true;
      return modifiers;
    }
  }

  const originOwner = ownerPlayerOf(contract.origin || '');
  if (originOwner && originOwner.id !== player.id && !originOwner.bankrupt && !isPropertyMortgaged(contract.origin || '')) {
    const skipOwnerCoupon = firstCouponOfKind(player, 'skip_owner_share');
    if (skipOwnerCoupon) {
      noteCouponOpportunity(skipOwnerCoupon);
    }
    const usedSkipOwnerShare = await maybeSpendCoupon(player, 'skip_owner_share', {
      title: 'Quebra de Contrato',
      copy: `Usar Quebra de Contrato para impedir a comissao de ${originOwner.name} sobre o frete deste contrato?`,
      primaryLabel: 'Usar Quebra de Contrato',
      secondaryLabel: 'Pagar comissao',
      cardCode: contract.origin,
      detail: `Bloqueou a comissao de ${originOwner.name} sobre o frete deste contrato.`,
      statusLabel: 'comissao bloqueada',
      countOpportunity: false,
      couponSignals: buildContractCouponSignals(player, {
        ownerId: originOwner.id,
        destination: contract.destination || '',
        ownerPresent: true,
      }),
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
  if (settlement.total < 0) {
    const due = Math.abs(settlement.total);
    await ensurePlayerLiquidity(player, due, { reason: 'liquidacao negativa de contrato' });
    if (!player.bankrupt) {
      updatePlayerCash(player, -due);
    }
  } else {
    updatePlayerCash(player, settlement.total);
  }
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
  contract.freight_label = `Frete ${formatLedgerCurrency(settlement.total)}`;
  contract.deadline_label = `${settlement.roundsElapsed} / ${settlement.targetRounds}`;
  contract.deadline_progress = `${settlement.roundsElapsed}/${settlement.targetRounds}`;

  const detailParts = [];
  detailParts.push(`Valor Frete: ${formatCurrency(settlement.adjustedBase)}`);
  if (settlement.adjustment > 0) {
    detailParts.push(`bonus (${settlement.roundsElapsed}/${settlement.targetRounds} turnos): ${formatLedgerCurrency(settlement.adjustment, { forceSign: true })}`);
  } else if (settlement.adjustment < 0) {
    detailParts.push(`onus (${settlement.roundsElapsed}/${settlement.targetRounds} turnos): ${formatCurrency(Math.abs(settlement.adjustment))}`);
  }
  if (settlement.originCommission > 0 && settlement.originOwner) {
    detailParts.push(`comissao inicial (${settlement.originOwner.name}): ${formatLedgerCurrency(-settlement.originCommission)}`);
  } else if (settlement.waiveOriginShare && settlement.originOwner) {
    detailParts.push(`comissao inicial (${settlement.originOwner.name}): bloqueada`);
  }
  if (settlement.tollShare > 0 && settlement.tollOwner) {
    detailParts.push(`comissao de pedagio (${settlement.tollOwner.name}): ${formatLedgerCurrency(-settlement.tollShare)}`);
  }
  detailParts.push(`Total: ${formatLedgerCurrency(settlement.total)}`);
  const detailLine = detailParts.join(' | ');

  contract.note = `${playerActionName(player)} concluiu o contrato. ${detailLine}.`;
  player.status_label = contractSettlementStatus(settlement.total);
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
    const settlementLead = contractCompletion?.total < 0
      ? `e pagou ${formatCurrency(Math.abs(contractCompletion.total))}`
      : `e recebeu ${formatCurrency(contractCompletion?.total || 0)}`;
    if (contractCompletion?.adjustment > 0) {
      note = `O navio chegou em ${contract.destination} ${contractArrivalText(contract)} ${settlementLead} (${formatCurrency(contractCompletion.adjustedBase || contractCompletion.base)} + bonus ${formatCurrency(contractCompletion.adjustment)}).`;
    } else if (contractCompletion?.adjustment < 0) {
      note = `O navio chegou em ${contract.destination} ${contractArrivalText(contract)} ${settlementLead} (${formatCurrency(contractCompletion.adjustedBase || contractCompletion.base)} - onus ${formatCurrency(Math.abs(contractCompletion.adjustment))}).`;
    } else {
      note = `O navio chegou em ${contract.destination} ${contractArrivalText(contract)} ${settlementLead}.`;
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
    ? contractSettlementStatus(contractCompletion?.total || 0)
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

  expireCouponsForAllPlayers({ turnNumber: currentTurnNumber(), activePlayerId: player.id });

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

      handleTutorialEvent('movement_dice_resolved', {
        playerId: player.id,
        values: [...diceResult.values],
        total: diceResult.total,
        isDouble: Boolean(diceResult.isDouble),
      });
      if (tutorialState()?.forcePauseActive) {
        await waitForResume();
      }

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
  handleTutorialEvent('movement_dice_opened', { playerId: 'human' });
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

function openDecisionModal({ eyebrowLabel = 'Resolucao', title, copy, primaryLabel = 'Continuar', secondaryLabel = 'Cancelar', hideSecondary = false, hideTitle = false, copyIsHtml = false, cardCode = '', primaryDisabled = false } = {}) {
  const modal = getDecisionOverlay()?.querySelector('.decision-modal') || null;
  const eyebrow = getDecisionOverlay()?.querySelector('.eyebrow') || null;
  const titleNode = getDecisionTitle();
  const copyNode = getDecisionCopy();
  const cardStage = getDecisionCardStage();
  const primary = getDecisionPrimary();
  const secondary = getDecisionSecondary();
  if (modal) modal.classList.toggle('is-inline-confirm', Boolean(hideSecondary && !cardCode));
  if (eyebrow) eyebrow.textContent = eyebrowLabel || 'Resolucao';
  if (titleNode) {
    titleNode.textContent = hideTitle ? '' : (title || 'Confirmar acao');
    titleNode.classList.toggle('is-hidden', hideTitle);
  }
  if (copyNode) {
    if (copyIsHtml) copyNode.innerHTML = copy || '';
    else copyNode.textContent = copy || '';
  }
  if (cardStage) {
    const card = cardCode ? getPropertyCard(cardCode) : null;
    cardStage.innerHTML = card ? propertyInspectorMarkup(card) : '';
    cardStage.classList.toggle('is-hidden', !card);
  }
  if (primary) {
    primary.textContent = primaryLabel;
    primary.disabled = Boolean(primaryDisabled);
    primary.onclick = primaryDisabled ? null : (() => closeDecision('primary'));
  }
  if (secondary) {
    secondary.textContent = secondaryLabel;
    secondary.classList.toggle('is-hidden', hideSecondary);
    secondary.disabled = false;
    secondary.onclick = hideSecondary ? null : (() => closeDecision('secondary'));
  }
  setDecisionVisible(true);
  return new Promise((resolve) => {
    state.decision.resolver = resolve;
  });
}

function buildSuggestedSaveName(date = new Date()) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `game_${year}_${month}_${day}_-_${hour}_${minute}_${second}`;
}

function getSaveNameOverlay() { return byId('save-name-overlay'); }
function getSaveNameTitle() { return byId('save-name-title'); }
function getSaveNameCopy() { return byId('save-name-copy'); }
function getSaveNameInput() { return byId('save-name-input'); }
function getSaveNamePrimary() { return byId('save-name-primary'); }
function getSaveNameSecondary() { return byId('save-name-secondary'); }

function setSaveNameVisible(visible) {
  const overlay = getSaveNameOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function closeSaveName(result = 'primary') {
  const input = getSaveNameInput();
  const resolver = state.saveName.resolver;
  const fallback = state.saveName.suggestedName || buildSuggestedSaveName();
  const shouldResume = !state.saveName.wasPaused;
  setSaveNameVisible(false);
  state.saveName.resolver = null;
  state.saveName.suggestedName = '';
  state.saveName.wasPaused = false;
  if (input) input.onkeydown = null;
  if (shouldResume) setPaused(false);
  if (resolver) resolver(result === 'primary' ? (String(input?.value || '').trim() || fallback) : null);
}

function openSaveNameModal({ title = 'Nome do arquivo', copy = 'Edite o nome do save ou pressione Enter para usar o nome sugerido.', suggestedName = '' } = {}) {
  const resolvedSuggestedName = String(suggestedName || '').trim() || buildSuggestedSaveName();
  const titleNode = getSaveNameTitle();
  const copyNode = getSaveNameCopy();
  const input = getSaveNameInput();
  const primary = getSaveNamePrimary();
  const secondary = getSaveNameSecondary();
  if (titleNode) titleNode.textContent = title;
  if (copyNode) copyNode.textContent = copy;
  if (input) {
    input.value = resolvedSuggestedName;
    input.onkeydown = (event) => {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        closeSaveName('primary');
        return;
      }
      if (event.key === 'Escape' && !event.repeat) {
        event.preventDefault();
        closeSaveName('secondary');
      }
    };
  }
  if (primary) primary.onclick = () => closeSaveName('primary');
  if (secondary) secondary.onclick = () => closeSaveName('secondary');
  state.saveName.suggestedName = resolvedSuggestedName;
  state.saveName.wasPaused = state.view.paused;
  setPaused(true);
  setSaveNameVisible(true);
  window.requestAnimationFrame(() => {
    if (!input) return;
    input.focus();
    input.select();
  });
  return new Promise((resolve) => {
    state.saveName.resolver = resolve;
  });
}


function getNegotiationOverlay() {
  return byId('negotiation-overlay');
}

function getNegotiationTitle() {
  return byId('negotiation-title');
}

function getNegotiationRound() {
  return byId('negotiation-round');
}

function getNegotiationCopy() {
  return byId('negotiation-copy');
}

function getNegotiationAsk() {
  return byId('negotiation-ask');
}

function getNegotiationCash() {
  return byId('negotiation-cash');
}

function getNegotiationStance() {
  return byId('negotiation-stance');
}

function getNegotiationCardStage() {
  return byId('negotiation-card-stage');
}

function getNegotiationStatusTitle() {
  return byId('negotiation-status-title');
}

function getNegotiationStatusCopy() {
  return byId('negotiation-status-copy');
}

function getNegotiationCounterInput() {
  return byId('negotiation-counter-input');
}

function getNegotiationCounterLabel() {
  return byId('negotiation-counter-label');
}

function getNegotiationBarterPanel() {
  return byId('negotiation-barter-panel');
}

function getNegotiationBarterTitle() {
  return byId('negotiation-barter-title');
}

function getNegotiationBarterCopy() {
  return byId('negotiation-barter-copy');
}

function getNegotiationBarterSummary() {
  return byId('negotiation-barter-summary');
}

function getNegotiationBarterStage() {
  return byId('negotiation-barter-stage');
}

function getNegotiationBarterEmpty() {
  return byId('negotiation-barter-empty');
}

function getNegotiationBarterToggle() {
  return byId('negotiation-barter-toggle');
}

function getNegotiationBarterClear() {
  return byId('negotiation-barter-clear');
}

function getNegotiationBarterConfirm() {
  return byId('negotiation-barter-confirm');
}

function getNegotiationHelper() {
  return byId('negotiation-helper');
}

function getNegotiationAccept() {
  return byId('negotiation-accept');
}

function getNegotiationCounterButton() {
  return byId('negotiation-counter');
}

function getNegotiationRefuse() {
  return byId('negotiation-refuse');
}

function setNegotiationVisible(visible) {
  const overlay = getNegotiationOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function suggestedNegotiationOffer(session) {
  const buyerCash = Math.max(0, Math.round(Number(session?.buyerCash || 0)));
  const currentAsk = Math.max(0, Math.round(Number(session?.currentAsk || session?.openingOffer || 0)));
  const suggested = Math.max(0, Math.round(Number(session?.suggestedOffer || 0)));
  if (!(buyerCash > 0)) return 0;
  if (suggested > 0) {
    return Math.min(buyerCash, suggested);
  }
  const fallback = Math.round(currentAsk * 0.88);
  return Math.max(1, Math.min(buyerCash, fallback || buyerCash));
}

function suggestedNegotiationAsk(session) {
  const currentBid = Math.max(0, Math.round(Number(session?.currentBid || session?.openingBid || 0)));
  const suggested = Math.max(0, Math.round(Number(session?.suggestedAsk || 0)));
  if (suggested > 0) return suggested;
  return Math.max(currentBid + 1, Math.round(currentBid * 1.1));
}

function toggleNegotiationBarterPanel(forceOpen = null) {
  const next = forceOpen === null ? !state.negotiation.barterOpen : Boolean(forceOpen);
  state.negotiation.barterOpen = state.negotiation.barterEnabled && next;
  renderHumanNegotiation();
}

function toggleNegotiationBarterSelection(code) {
  const normalized = String(code || '').toUpperCase();
  if (!normalized) return;
  const selected = new Set(state.negotiation.barterSelectedCodes || []);
  if (selected.has(normalized)) selected.delete(normalized);
  else selected.add(normalized);
  state.negotiation.barterSelectedCodes = Array.from(selected);
  renderHumanNegotiation();
}

function renderHumanNegotiation() {
  const session = state.negotiation.session;
  const mode = state.negotiation.mode === 'sell' ? 'sell' : 'buy';
  const sellerName = state.negotiation.sellerName || 'Oponente';
  const buyerName = state.negotiation.buyerName || 'Comprador';
  const card = getPropertyCard(state.negotiation.cardCode || '');
  const titleNode = getNegotiationTitle();
  const roundNode = getNegotiationRound();
  const copyNode = getNegotiationCopy();
  const askNode = getNegotiationAsk();
  const cashNode = getNegotiationCash();
  const stanceNode = getNegotiationStance();
  const cardStage = getNegotiationCardStage();
  const statusTitle = getNegotiationStatusTitle();
  const statusCopy = getNegotiationStatusCopy();
  const input = getNegotiationCounterInput();
  const inputLabel = getNegotiationCounterLabel();
  const helper = getNegotiationHelper();
  const acceptButton = getNegotiationAccept();
  const counterButton = getNegotiationCounterButton();
  const refuseButton = getNegotiationRefuse();
  const barterPanel = getNegotiationBarterPanel();
  const barterTitle = getNegotiationBarterTitle();
  const barterCopy = getNegotiationBarterCopy();
  const barterSummary = getNegotiationBarterSummary();
  const barterStage = getNegotiationBarterStage();
  const barterEmpty = getNegotiationBarterEmpty();
  const barterToggle = getNegotiationBarterToggle();
  const barterClear = getNegotiationBarterClear();
  const barterConfirm = getNegotiationBarterConfirm();
  const barterEnabled = Boolean(state.negotiation.barterEnabled);
  const barterCards = (state.negotiation.barterAvailableCodes || [])
    .map((code) => getPropertyCard(code))
    .filter(Boolean);
  const barterSelected = new Set((state.negotiation.barterSelectedCodes || []).map((code) => String(code || '').toUpperCase()));

  if (titleNode) titleNode.textContent = state.negotiation.title || 'Negociacao';
  if (roundNode) {
    const currentRound = Math.min(Number(session?.round || 0) + 1, Number(session?.maxRounds || 2));
    roundNode.textContent = `Rodada ${currentRound} de ${Number(session?.maxRounds || 2)}`;
  }
  if (copyNode) {
    copyNode.textContent = state.negotiation.copy
      || session?.introLine
      || (mode === 'sell'
        ? 'O robo abriu uma oferta pelo seu ativo.'
        : 'Faca sua proposta e veja se o robo topa vender.');
  }
  if (askNode) {
    askNode.textContent = mode === 'sell'
      ? `Oferta ${formatCurrency(session?.currentBid || session?.openingBid || 0)}`
      : `Pedido ${formatCurrency(session?.currentAsk || session?.openingOffer || 0)}`;
  }
  if (cashNode) {
    cashNode.textContent = mode === 'sell'
      ? `Caixa de ${buyerName} ${formatCurrency(session?.buyerCash || 0)}`
      : `Seu caixa ${formatCurrency(session?.buyerCash || 0)}`;
  }
  if (stanceNode) {
    stanceNode.textContent = mode === 'sell'
      ? (session?.buyerStanceLabel || 'Interesse moderado')
      : (session?.sellerStanceLabel || 'Postura firme');
  }

  if (cardStage) {
    cardStage.innerHTML = card ? propertyInspectorMarkup(card) : '';
    cardStage.classList.toggle('is-hidden', !card);
  }

  if (statusTitle) {
    statusTitle.textContent = state.negotiation.feedback
      ? (mode === 'sell' ? 'Ajuste seu pedido' : 'Ajuste sua proposta')
      : (mode === 'sell' ? `${buyerName} diz` : `${sellerName} diz`);
  }
  if (statusCopy) {
    statusCopy.textContent = state.negotiation.feedback
      || session?.buyerLine
      || session?.sellerLine
      || session?.introLine
      || 'Aguardando proposta.';
  }

  const suggested = mode === 'sell'
    ? String(state.negotiation.draftCounter || suggestedNegotiationAsk(session) || '')
    : String(state.negotiation.draftCounter || suggestedNegotiationOffer(session) || '');
  if (input && document.activeElement !== input) {
    input.value = suggested;
  }
  if (inputLabel) {
    inputLabel.textContent = mode === 'sell' ? 'Seu pedido' : 'Sua proposta';
  }

  if (helper) {
    helper.textContent = state.negotiation.feedback
      ? 'Corrija o valor e tente de novo.'
      : (Number(session?.round || 0) + 1 >= Number(session?.maxRounds || 2)
        ? 'Esta e a ultima rodada. O robo pode desistir de vez.'
        : (mode === 'sell'
          ? 'Aceite a oferta, recuse ou peca outro valor.'
          : 'Envie uma proposta fechada ou aceite o pedido atual.'));
    helper.classList.toggle('is-error', Boolean(state.negotiation.feedback));
  }

  if (barterPanel) {
    barterPanel.classList.toggle('is-hidden', !(barterEnabled && state.negotiation.barterOpen));
  }
  if (barterTitle) {
    barterTitle.textContent = mode === 'sell'
      ? `Pedir ativos de ${buyerName}`
      : `Oferecer ativos para ${sellerName}`;
  }
  if (barterCopy) {
    barterCopy.textContent = state.negotiation.barterCopy
      || (mode === 'sell'
        ? `Selecione os portos e pedagios de ${buyerName} que voce quer receber em troca.`
        : `Selecione os seus portos e pedagios para oferecer a ${sellerName}.`);
  }
  if (barterSummary) {
    barterSummary.textContent = barterSelected.size
      ? `${barterSelected.size} ativo${barterSelected.size > 1 ? 's' : ''}: ${Array.from(barterSelected).join(' + ')}`
      : 'Nenhum ativo selecionado';
  }
  if (barterStage) {
    barterStage.innerHTML = barterCards.map((offerCard) => propertyChipButtonMarkup(
      state.negotiation.barterSourcePlayerId || 'negotiation',
      offerCard,
      barterSelected.has(String(offerCard.code || '').toUpperCase()),
    )).join('');
  }
  if (barterEmpty) {
    barterEmpty.classList.toggle('is-hidden', barterCards.length > 0);
  }
  if (barterToggle) {
    barterToggle.textContent = barterEnabled
      ? (state.negotiation.barterOpen ? 'Fechar troca' : 'Troca')
      : 'Troca indisponivel';
    barterToggle.disabled = !barterEnabled;
  }
  if (barterClear) barterClear.disabled = !barterSelected.size;
  if (barterConfirm) barterConfirm.disabled = !barterSelected.size;

  if (acceptButton) {
    acceptButton.textContent = mode === 'sell'
      ? `Aceitar ${formatCurrency(session?.currentBid || 0)}`
      : `Fechar por ${formatCurrency(session?.currentAsk || 0)}`;
    acceptButton.disabled = mode === 'sell'
      ? (!session?.canNegotiate || !(Number(session?.currentBid || 0) > 0))
      : (!session?.canNegotiate || !(Number(session?.currentAsk || 0) > 0) || Number(session?.buyerCash || 0) < Number(session?.currentAsk || 0));
  }
  if (counterButton) {
    counterButton.textContent = mode === 'sell' ? 'Pedir outro valor' : 'Enviar proposta';
    counterButton.disabled = mode === 'sell'
      ? !session?.canNegotiate
      : (!session?.canNegotiate || !(Number(session?.buyerCash || 0) > 0));
  }
  if (refuseButton) {
    refuseButton.textContent = mode === 'sell' ? 'Recusar' : 'Sair';
    refuseButton.disabled = false;
  }
}

function resetHumanNegotiationState() {
  state.negotiation.resolver = null;
  state.negotiation.session = null;
  state.negotiation.mode = 'buy';
  state.negotiation.title = '';
  state.negotiation.copy = '';
  state.negotiation.cardCode = '';
  state.negotiation.sellerName = '';
  state.negotiation.buyerName = '';
  state.negotiation.feedback = '';
  state.negotiation.draftCounter = '';
  state.negotiation.barterEnabled = false;
  state.negotiation.barterOpen = false;
  state.negotiation.barterSourcePlayerId = '';
  state.negotiation.barterSourceName = '';
  state.negotiation.barterAvailableCodes = [];
  state.negotiation.barterSelectedCodes = [];
  state.negotiation.barterCopy = '';
}

function closeHumanNegotiation(result = { action: 'refuse' }) {
  setNegotiationVisible(false);
  const resolver = state.negotiation.resolver;
  resetHumanNegotiationState();
  if (resolver) resolver(result);
}

function openHumanNegotiationRound({ session, title, copy, cardCode = '', sellerName = '', buyerName = '', mode = 'buy', barter = null } = {}) {
  state.negotiation.session = session;
  state.negotiation.mode = mode === 'sell' ? 'sell' : 'buy';
  state.negotiation.title = title || 'Negociacao';
  state.negotiation.copy = copy || '';
  state.negotiation.cardCode = cardCode || '';
  state.negotiation.sellerName = sellerName || 'Oponente';
  state.negotiation.buyerName = buyerName || 'Comprador';
  state.negotiation.feedback = '';
  state.negotiation.draftCounter = String((mode === 'sell' ? suggestedNegotiationAsk(session) : suggestedNegotiationOffer(session)) || '');
  state.negotiation.barterEnabled = Boolean(barter?.enabled);
  state.negotiation.barterOpen = false;
  state.negotiation.barterSourcePlayerId = String(barter?.sourcePlayerId || '');
  state.negotiation.barterSourceName = String(barter?.sourceName || '');
  state.negotiation.barterAvailableCodes = Array.isArray(barter?.availableCodes) ? barter.availableCodes.slice() : [];
  state.negotiation.barterSelectedCodes = [];
  state.negotiation.barterCopy = String(barter?.copy || '');
  renderHumanNegotiation();
  setNegotiationVisible(true);
  window.setTimeout(() => {
    const input = getNegotiationCounterInput();
    input?.focus();
    input?.select();
  }, 0);
  return new Promise((resolve) => {
    state.negotiation.resolver = resolve;
  });
}

function submitHumanNegotiation(action = 'accept') {
  if (action === 'barter') {
    const codes = Array.from(new Set((state.negotiation.barterSelectedCodes || [])
      .map((code) => String(code || '').toUpperCase())
      .filter(Boolean)));
    if (!codes.length) {
      state.negotiation.feedback = 'Selecione ao menos um ativo para montar a troca.';
      state.negotiation.barterOpen = true;
      renderHumanNegotiation();
      return;
    }
    closeHumanNegotiation({ action: 'barter', codes });
    return;
  }
  if (action !== 'counter') {
    closeHumanNegotiation({ action });
    return;
  }
  const rawValue = String(state.negotiation.draftCounter || getNegotiationCounterInput()?.value || '').trim();
  const amount = Math.round(Number(rawValue));
  const buyerCash = Math.max(0, Math.round(Number(state.negotiation.session?.buyerCash || 0)));
  const mode = state.negotiation.mode === 'sell' ? 'sell' : 'buy';
  if (!(amount > 0)) {
    state.negotiation.feedback = mode === 'sell' ? 'Digite um pedido valido.' : 'Digite uma proposta valida.';
    renderHumanNegotiation();
    return;
  }
  if (mode !== 'sell' && amount > buyerCash) {
    state.negotiation.feedback = 'Sua proposta precisa caber no seu caixa.';
    renderHumanNegotiation();
    return;
  }
  closeHumanNegotiation({ action: 'counter', amount });
}

function getPermissionChoiceOverlay() {
  return byId('permission-choice-overlay');
}

function getPermissionChoiceTitle() {
  return byId('permission-choice-title');
}

function getPermissionChoiceOrigin() {
  return byId('permission-choice-origin');
}

function getPermissionChoiceCopy() {
  return byId('permission-choice-copy');
}

function getPermissionChoiceStage() {
  return byId('permission-choice-stage');
}

function setPermissionChoiceVisible(visible) {
  const overlay = getPermissionChoiceOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
}

function closePermissionChoice(permissionId = '') {
  setPermissionChoiceVisible(false);
  const resolver = state.permissionChoice.resolver;
  state.permissionChoice.resolver = null;
  state.permissionChoice.playerId = '';
  state.permissionChoice.originCode = '';
  state.permissionChoice.ownsOrigin = false;
  state.permissionChoice.choices = [];
  if (resolver) resolver(permissionId);
}

function renderPermissionChoice() {
  const titleNode = getPermissionChoiceTitle();
  const originNode = getPermissionChoiceOrigin();
  const copyNode = getPermissionChoiceCopy();
  const stage = getPermissionChoiceStage();
  if (!titleNode || !originNode || !copyNode || !stage) return;

  const player = playerById(state.permissionChoice.playerId);
  const selection = {
    originCode: state.permissionChoice.originCode,
    ownsOrigin: state.permissionChoice.ownsOrigin,
    choices: state.permissionChoice.choices || [],
  };

  titleNode.textContent = 'Escolha a permissao';
  originNode.textContent = selection.originCode ? `Origem ${selection.originCode}` : 'Origem --';
  copyNode.textContent = `Permissao atual: ${player?.active_permission_label || '--'}. Trocar de permissao custa ${formatCurrency(Math.max(0, Number(state.rules?.permission_switch_cost || 50)))} ao banco.`;

  stage.innerHTML = selection.choices.map((entry) => {
    const factorLabel = `${Number(entry.multiplier || 1).toFixed(0)}x`;
    const detailLabel = selection.ownsOrigin
      ? `Frete base: ${formatCurrency(entry.fee)} | Multiplicador: ${factorLabel}`
      : `Estadia: ${formatCurrency(entry.fee)}`;
    return `
      <button type="button" class="permission-choice-card${entry.isCurrent ? ' is-current' : ''}" data-permission-choice-id="${entry.permission.id}">
        <span class="permission-choice-card-icon">${cargoIconMarkup(entry.permission.kind, 'permission-choice-icon-image')}</span>
        <span class="permission-choice-card-copy">
          <strong>${entry.permission.title}</strong>
          <span class="permission-choice-card-detail">${detailLabel}</span>
        </span>
        <span class="permission-choice-card-badge">${entry.isCurrent ? 'Atual' : 'Usar'}</span>
        <span class="permission-choice-card-metrics">
          <span class="permission-choice-card-total${entry.isBestDisplayedValue ? ' is-best' : ''}">Valor: ${Number(entry.comparisonValue || 0).toFixed(0)}x</span>
          ${entry.isCurrent ? '' : `<span class="permission-choice-card-switch-chip">Troca: - ${formatCurrency(entry.switchCost || 0)}</span>`}
        </span>
      </button>
    `;
  }).join('');

  if (!player || !selection.choices.length) {
    closePermissionChoice(player?.active_permission_id || '');
  }
}

function openHumanPermissionChoice(player, { originCode = null } = {}) {
  const selection = contractPermissionChoicesForOrigin(player, originCode);
  if (!player || selection.choices.length <= 1) {
    return Promise.resolve(selection.choices[0]?.permission?.id || player?.active_permission_id || '');
  }
  state.permissionChoice.playerId = player.id;
  state.permissionChoice.originCode = selection.originCode;
  state.permissionChoice.ownsOrigin = selection.ownsOrigin;
  state.permissionChoice.choices = selection.choices;
  renderPermissionChoice();
  setPermissionChoiceVisible(true);
  return new Promise((resolve) => {
    state.permissionChoice.resolver = resolve;
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
      const coupon = {
        kind: effect.coupon,
        label: card.title,
        source_card_id: card.id,
        acquired_turn: currentTurnNumber(),
        expires_after_turns: couponExpirationTurnsForKind(effect.coupon),
        eligible_checks: 0,
      };
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
        detail = `Moveu novamente ${lastRollTotal} casa(s).`;
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
      detail = `${verb[0].toUpperCase() + verb.slice(1)} ${shownSteps} casa(s) ate ${moved.label}.${originSuffix}`.trim();
      statusLabel = landing?.statusLabel || moved.label;
      break;
    }
    case 'move_to_toll': {
      const moved = await movePlayerToContractToll(player, { stepDelay });
      const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
      note = `${playerActionName(player)} foi para o pedagio ${player.active_contract?.mandatory_toll || moved.label}. ${landing?.note || ''}`.trim();
      detail = `Foi para o pedagio ${player.active_contract?.mandatory_toll || moved.label}.`;
      statusLabel = landing?.statusLabel || moved.label;
      break;
    }
    case 'move_ports': {
      const moved = await movePlayerByPortOffset(player, effect.offset || 0, { stepDelay });
      const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
      note = `${playerActionName(player)} foi para ${moved.label}. ${landing?.note || ''}`.trim();
      detail = `Reposicionado para ${moved.label}.`;
      statusLabel = landing?.statusLabel || moved.label;
      break;
    }
    case 'move_to_origin_port': {
      const moved = await movePlayerToOriginPort(player, { stepDelay });
      const landing = moved.moved ? await resolveLandingAfterForcedMovement(player, { stepDelay }) : null;
      note = `${playerActionName(player)} voltou ao porto de origem ${player.active_contract?.origin || moved.label}. ${landing?.note || ''}`.trim();
      detail = `Voltou ao porto de origem ${player.active_contract?.origin || moved.label}.`;
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
      const shouldBuy = cpuShouldBuyOrigin(player, card, 'stop_port_purchase');
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

    const canBuy = player.cash >= card.price && !isTradeLockBuyEnabled();
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
    const negotiation = owner.is_human
      ? await runHumanSaleToRobotNegotiation(owner, player, card, {
          listPrice: negotiationPrice,
          reason: 'stop_port_negotiation',
          stop,
          saleAction: 'Vendeu porto',
          title: `${player.name} quer ${card.code}`,
          copy: `${player.name} quer comprar o porto ${card.code} antes de decidir a estadia.`,
        })
      : executeCpuOwnedPropertyNegotiation(player, owner, card, {
          listPrice: negotiationPrice,
          reason: 'stop_port_negotiation',
          stop,
          saleAction: 'Vendeu porto',
        });
    if (negotiation.accepted) {
      return {
        note: `${playerActionName(player)} negociou e comprou ${card.code} de ${owner.name} por ${formatCurrency(negotiation.finalPrice)}.`,
        statusLabel: negotiation.statusLabel || player.status_label,
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

  const negotiation = prepareHumanOwnedPropertyNegotiation(player, owner, card, {
    listPrice: negotiationPrice,
    reason: 'stop_port_negotiation',
    stop,
    saleAction: 'Vendeu porto',
  });
  const canNegotiate = negotiation.canNegotiate && !isTradeLockBuyEnabled();
  const choice = await openDecisionModal({
    title: `${card.code} pertence a ${owner.name}`,
    copy: canNegotiate
      ? `Pague ${formatCurrency(stop.ownerCharge)} de estadia ou abra uma negociacao pela compra do porto.`
      : `Pague ${formatCurrency(stop.ownerCharge)} de estadia. ${negotiation.decision?.sellerLine || `${owner.name} nao esta disposto a vender agora.`}`,
    primaryLabel: `Pagar ${formatCurrency(stop.ownerCharge)}`,
    secondaryLabel: 'Negociar',
    hideSecondary: !canNegotiate,
    cardCode: card.code,
  });

  if (canNegotiate && choice === 'secondary') {
    const outcome = await runHumanOwnedPropertyNegotiation(player, owner, card, {
      listPrice: negotiationPrice,
      reason: 'stop_port_negotiation',
      stop,
      saleAction: 'Vendeu porto',
      title: `${card.code} pertence a ${owner.name}`,
      copy: `Negocie a compra do porto ${card.code} com ${owner.name} antes de decidir a estadia.`,
    });
    if (outcome.accepted) {
      return {
        note: `Voce negociou e comprou ${card.code} de ${owner.name} por ${formatCurrency(outcome.finalPrice || 0)}.`,
        statusLabel: player.status_label,
      };
    }
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
      const shouldBuy = cpuShouldBuyOrigin(player, card, 'stop_toll_purchase');
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

    const canBuy = player.cash >= card.price && !isTradeLockBuyEnabled();
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
    const negotiation = owner.is_human
      ? await runHumanSaleToRobotNegotiation(owner, player, card, {
          listPrice: negotiationPrice,
          reason: 'stop_toll_negotiation',
          stop,
          saleAction: 'Vendeu pedagio',
          title: `${player.name} quer ${card.code}`,
          copy: `${player.name} quer comprar o pedagio ${card.code} antes de decidir o pagamento.`,
        })
      : executeCpuOwnedPropertyNegotiation(player, owner, card, {
          listPrice: negotiationPrice,
          reason: 'stop_toll_negotiation',
          stop,
          saleAction: 'Vendeu pedagio',
        });
    if (negotiation.accepted) {
      return {
        note: `${playerActionName(player)} negociou e comprou o pedagio ${card.code} de ${owner.name} por ${formatCurrency(negotiation.finalPrice)}.`,
        statusLabel: negotiation.statusLabel || player.status_label,
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

  const negotiation = prepareHumanOwnedPropertyNegotiation(player, owner, card, {
    listPrice: negotiationPrice,
    reason: 'stop_toll_negotiation',
    stop,
    saleAction: 'Vendeu pedagio',
  });
  const canNegotiate = negotiation.canNegotiate && !isTradeLockBuyEnabled();
  const choice = await openDecisionModal({
    title: `${card.code} pertence a ${owner.name}`,
    copy: canNegotiate
      ? `Pague ${formatCurrency(stop.ownerCharge)} ao dono ou abra uma negociacao pela compra do pedagio.`
      : `Pague ${formatCurrency(stop.ownerCharge)} ao dono. ${negotiation.decision?.sellerLine || `${owner.name} nao esta disposto a vender agora.`}`,
    primaryLabel: `Pagar ${formatCurrency(stop.ownerCharge)}`,
    secondaryLabel: 'Negociar',
    hideSecondary: !canNegotiate,
    cardCode: card.code,
  });

  if (canNegotiate && choice === 'secondary') {
    const outcome = await runHumanOwnedPropertyNegotiation(player, owner, card, {
      listPrice: negotiationPrice,
      reason: 'stop_toll_negotiation',
      stop,
      saleAction: 'Vendeu pedagio',
      title: `${card.code} pertence a ${owner.name}`,
      copy: `Negocie a compra do pedagio ${card.code} com ${owner.name} antes de decidir o pagamento.`,
    });
    if (outcome.accepted) {
      return {
        note: `Voce negociou e comprou ${card.code} de ${owner.name} por ${formatCurrency(outcome.finalPrice || 0)}.`,
        statusLabel: player.status_label,
      };
    }
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

  function appendChanceMarker(cx, cy, radius) {
    const leftHalf = document.createElementNS(svgNs, 'path');
    leftHalf.setAttribute('d', `M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 0 ${cx} ${cy + radius} L ${cx} ${cy - radius} Z`);
    leftHalf.setAttribute('fill', '#d94b45');
    overlay.appendChild(leftHalf);

    const rightHalf = document.createElementNS(svgNs, 'path');
    rightHalf.setAttribute('d', `M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 1 ${cx} ${cy + radius} L ${cx} ${cy - radius} Z`);
    rightHalf.setAttribute('fill', '#2ea65a');
    overlay.appendChild(rightHalf);

    const meridian = document.createElementNS(svgNs, 'line');
    meridian.setAttribute('x1', cx);
    meridian.setAttribute('y1', cy - radius);
    meridian.setAttribute('x2', cx);
    meridian.setAttribute('y2', cy + radius);
    meridian.setAttribute('stroke', '#06111a');
    meridian.setAttribute('stroke-width', '1.2');
    overlay.appendChild(meridian);

    const border = document.createElementNS(svgNs, 'circle');
    border.setAttribute('cx', cx);
    border.setAttribute('cy', cy);
    border.setAttribute('r', radius);
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', '#06111a');
    border.setAttribute('stroke-width', '3.2');
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
      appendChanceMarker(x, y, 6.9);
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
  renderTutorialAuthoring();
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

async function loadGameV3TutorialConfig() {
  try {
    const payload = await fetchJson(GAME_V3_TUTORIAL_CONFIG_URL, { cache: 'no-store' });
    const steps = Array.isArray(payload) ? payload : [];
    if (steps.length) {
      setGameV3DefaultTutorialSteps(steps);
      return;
    }
  } catch (_error) {
    // The tutorial source of truth lives in the data file served by the API.
  }
  setGameV3DefaultTutorialSteps([]);
}

function buildCurrentSetupDefaults() {
  const company = (state.players || []).find((player) => player?.is_human) || null;
  const rivalCount = (state.players || []).filter((player) => !player?.is_human).length || state.setup.rivalCount || 5;
  if (state.setup.aiAdvancedProfiles) {
    seedSetupRobotConfigs(Number(rivalCount));
  }
  return buildAiSetupDefaults({}, {
    company_name: String(state.setup.companyName || company?.name || 'Minha Companhia'),
    human_color_id: String(state.setup.selectedColorId || company?.color_id || state.playerColors[0]?.id || ''),
    rival_count: Number(rivalCount),
    ai_difficulty: state.setup.aiDifficulty || 'normal',
    ai_profile_mode: state.setup.aiProfileMode || 'balanced',
    ai_profile_order: state.setup.aiProfileOrder || [],
    ai_advanced_profiles: Boolean(state.setup.aiAdvancedProfiles),
    ai_manual_profiles: state.setup.aiAdvancedProfiles
      ? serializeManualRobotProfiles(state.setup.manualRobotProfiles, Number(rivalCount))
      : [],
    ai_manual_robot_configs: state.setup.aiAdvancedProfiles
      ? serializeManualRobotConfigs(state.setup.manualRobotConfigs, Number(rivalCount))
      : [],
  });
}

function buildActiveActionFeedSnapshot() {
  return pruneActionFeed().map((entry) => ({
    id: entry.id,
    playerId: entry.playerId,
    playerName: entry.playerName,
    action: entry.action,
    detail: entry.detail,
    turnLabel: entry.turnLabel,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    color: entry.color,
    glow: entry.glow,
  }));
}

let liveAiSetupRefreshFrame = 0;

function scheduleLiveAiSetupUiRefresh() {
  if (liveAiSetupRefreshFrame) {
    window.cancelAnimationFrame(liveAiSetupRefreshFrame);
  }
  liveAiSetupRefreshFrame = window.requestAnimationFrame(() => {
    liveAiSetupRefreshFrame = 0;
    renderHud({ force: true });
    renderNodeOverlay();
    renderShipOverlay();
    if (!getReportOverlay()?.classList.contains('is-hidden')) {
      renderReportOverlay();
    }
  });
}

function applyCurrentAiSetupToRunningGame({ refreshUi = true } = {}) {
  if (!state.setup.started || !Array.isArray(state.players) || !state.players.length) return null;
  const tableConfig = applyAiStageConfiguration({
    setup_defaults: buildCurrentSetupDefaults(),
  });
  if (refreshUi) {
    scheduleLiveAiSetupUiRefresh();
  }
  return tableConfig;
}

function buildPermissionSaveSnapshot(permission) {
  const normalized = normalizePermissionState(permission);
  if (!normalized) return null;
  return {
    id: normalized.id,
    kind: normalized.kind,
    title: normalized.title,
    accent: normalized.accent,
    text: normalized.text,
    purchase_price: Number(normalized.purchase_price || 0),
    mortgaged: Boolean(normalized.mortgaged),
  };
}

function buildPlayerSaveSnapshot(player) {
  const snapshot = {
    id: player.id,
    name: player.name,
    is_human: Boolean(player.is_human),
    color_id: player.color_id,
    color_hex: player.color_hex,
    cash: Number(player.cash || 0),
    cash_display: player.cash_display,
    location_code: player.location_code || null,
    location_label: player.location_label || '--',
    board_node_id: player.board_node_id || null,
    ship_type: player.ship_type || null,
    ship_type_label: player.ship_type_label || '--',
    active_permission_id: player.active_permission_id || null,
    active_permission_label: player.active_permission_label || '--',
    permissions: (player.permissions || []).map(buildPermissionSaveSnapshot).filter(Boolean),
    property_codes: (player.property_codes || []).map((code) => String(code || '').toUpperCase()),
    coupons: Array.isArray(player.coupons) ? player.coupons : [],
    coupon_used_total: playerCouponUsedTotal(player),
    coupon_expired_total: playerCouponExpiredTotal(player),
    coupon_used_turn_count: playerCouponUsedTurnCount(player),
    coupon_expired_turn_count: playerCouponExpiredTurnCount(player),
    monopoly_regions: monopolyRegionsForPlayer(player),
    active_contract: player.active_contract || null,
    status_label: player.status_label || '--',
    skip_turns: Number(player.skip_turns || 0),
    needs_new_contract: Boolean(player.needs_new_contract),
    bankrupt: Boolean(player.bankrupt),
    last_roll: player.last_roll || null,
  };
  if (!player.is_human) {
    const resolvedProfile = cloneAiData(
      player.ai_profile
      || (aiProfilesLib()?.buildProfile
        ? aiProfilesLib().buildProfile({
          archetypeId: player.ai_archetype_id || player.ai_profile_id || 'legacy_open',
          overrides: cloneAiData(player.ai_profile_overrides || {}) || {},
        })
        : null)
      || null
    );
    snapshot.ai = {
      manual_profile: Boolean(player.ai_manual_profile),
      archetype_id: player.ai_archetype_id || '',
      profile_id: player.ai_profile_id || resolvedProfile?.id || '',
      profile_label: player.ai_profile_label || resolvedProfile?.label || '',
      skill_preset_id: resolvedProfile?.metadata?.skill_preset_id || player.ai_skill_id || '',
      skill: cloneAiData(resolvedProfile?.skill || {}),
      profile_overrides: player.ai_profile_overrides || null,
    };
  }
  return snapshot;
}

function buildMortgagedPropertyCodesSnapshot() {
  return [...(state.portCards || []), ...(state.tollCards || [])]
    .filter((card) => card?.mortgaged)
    .map((card) => String(card.code || '').toUpperCase());
}

function buildMilestoneSnapshotSummary(snapshot) {
  return {
    turnNumber: Number(snapshot?.turnNumber || 0),
    label: String(snapshot?.label || '').trim() || compactReportTurnLabel(snapshot),
    phase: String(snapshot?.phase || ''),
    players: (snapshot?.players || []).map((player) => ({
      id: player.id,
      cash: Number(player.cash || 0),
      patrimony_total: Number(player.patrimony_total || 0),
      title_count: Number(player.title_count || 0),
      toll_count: Number(player.toll_count || 0),
      permission_count: Number(player.permission_count || 0),
      property_count: Number(player.property_count || 0),
      coupon_used_total: Number(player.coupon_used_total || 0),
      coupon_expired_total: Number(player.coupon_expired_total || 0),
      coupon_used_turn_count: Number(player.coupon_used_turn_count || 0),
      coupon_expired_turn_count: Number(player.coupon_expired_turn_count || 0),
    })),
  };
}

function buildReportSaveSnapshot() {
  const snapshots = state.report?.cashHistory || [];
  const milestoneTurns = reportMilestoneTurns(snapshots);
  const milestoneSnapshots = milestoneTurns
    .map((turnNumber) => snapshots.find((snapshot) => Number(snapshot?.turnNumber || 0) === turnNumber))
    .filter(Boolean);
  return {
    activeKey: state.report?.activeKey || 'cash-by-turn',
    milestones: milestoneSnapshots.map(buildMilestoneSnapshotSummary),
    couponExpirationEvents: reportCouponExpirationEvents(),
  };
}

function buildAiSaveSnapshot() {
  return {
    stageId: state.ai?.stageId || 'stage8_profile_setup',
    stageLabel: state.ai?.stageLabel || 'Perfis, cupons e caixa',
    aiDifficultyId: state.ai?.aiDifficultyId || state.setup.aiDifficulty || 'normal',
    aiProfileModeId: state.ai?.aiProfileModeId || state.setup.aiProfileMode || 'balanced',
  };
}

function buildRobotSkillsSaveSnapshot() {
  return Object.fromEntries(
    (state.players || [])
      .filter((player) => player && !player.is_human)
      .map((player) => {
        const resolvedProfile = cloneAiData(
          player.ai_profile
          || (aiProfilesLib()?.buildProfile
            ? aiProfilesLib().buildProfile({
              archetypeId: player.ai_archetype_id || player.ai_profile_id || 'legacy_open',
              overrides: cloneAiData(player.ai_profile_overrides || {}) || {},
            })
            : null)
          || null
        );
        return [player.id, {
          name: player.name || player.id,
          manual_profile: Boolean(player.ai_manual_profile),
          archetype_id: player.ai_archetype_id || '',
          profile_id: player.ai_profile_id || resolvedProfile?.id || '',
          profile_label: player.ai_profile_label || resolvedProfile?.label || '',
          skill_preset_id: resolvedProfile?.metadata?.skill_preset_id || player.ai_skill_id || '',
          skill: cloneAiData(resolvedProfile?.skill || {}),
        }];
      }),
  );
}

function buildSaveSnapshot() {
  return {
    schema: 'rdm-ui-save-v1',
    session: state.session || null,
    setup_defaults: buildCurrentSetupDefaults(),
    players: (state.players || []).map(buildPlayerSaveSnapshot),
    chance_deck: state.chanceDeck || { draw_pile: [], discard_pile: [], held_card_ids: [] },
    mortgaged_property_codes: buildMortgagedPropertyCodesSnapshot(),
    active_action_feed: buildActiveActionFeedSnapshot(),
    robot_skills: buildRobotSkillsSaveSnapshot(),
    report: buildReportSaveSnapshot(),
    ai: buildAiSaveSnapshot(),
  };
}

function buildLoadBootstrapPayload(snapshot) {
  const mortgagedCodes = new Set((snapshot?.mortgaged_property_codes || []).map((code) => String(code || '').toUpperCase()));
  return {
    player_colors: state.playerColors || [],
    rules: state.rules || {},
    port_cards: (state.portCards || []).map((card) => ({
      ...card,
      mortgaged: mortgagedCodes.has(String(card?.code || '').toUpperCase()),
    })),
    toll_cards: (state.tollCards || []).map((card) => ({
      ...card,
      mortgaged: mortgagedCodes.has(String(card?.code || '').toUpperCase()),
    })),
    chance_cards: state.chanceCards || [],
    chance_deck: snapshot?.chance_deck || { draw_pile: [], discard_pile: [], held_card_ids: [] },
    freight_permission_cards: state.freightPermissionCards || [],
    players: snapshot?.players || [],
    assets: state.assets || { ship_masks: {}, ship_fill_masks: {}, ship_sprites: {}, cargo_icons: {} },
    distances: state.distances || {},
    session: snapshot?.session || null,
    active_contract: (snapshot?.players || []).find((player) => player?.is_human)?.active_contract || null,
    setup_defaults: buildAiSetupDefaults(snapshot?.setup_defaults || {}),
    ai: snapshot?.ai || null,
    robot_skills: snapshot?.robot_skills || {},
  };
}

function restoreActionFeedFromSnapshot(entries = []) {
  const now = Date.now();
  const lifetimeMs = currentLogLifetimeMs();
  state.actionFeed = (entries || []).slice(0, 18).map((entry, index) => ({
    ...entry,
    id: entry?.id || `restored-${now}-${index}`,
    createdAt: now - (index * 40),
    expiresAt: now + lifetimeMs - (index * 40),
  })).filter((entry) => (entry.expiresAt || 0) > now);
}

function restoreReportFromSnapshot(reportSnapshot) {
  const milestones = Array.isArray(reportSnapshot?.milestones) ? reportSnapshot.milestones : [];
  if (!milestones.length) {
    resetReportData();
    renderReportOverlay();
    return;
  }

  const playersById = Object.fromEntries((state.players || []).map((player) => [player.id, player]));
  state.report.activeKey = reportSnapshot?.activeKey || 'cash-by-turn';
  state.report.cashHistory = milestones.map((snapshot) => {
  state.report.couponExpirationEvents = Array.isArray(reportSnapshot?.couponExpirationEvents)
    ? reportSnapshot.couponExpirationEvents.slice(0, 24).map((entry, index) => ({
      id: entry?.id || `restored-expiration-${index}`,
      turnNumber: Number(entry?.turnNumber || 0),
      turnLabel: String(entry?.turnLabel || '').trim() || 'Inicio',
      playerId: entry?.playerId || '',
      playerName: entry?.playerName || 'Jogador',
      playerColor: entry?.playerColor || '#8fd7ff',
      couponLabel: entry?.couponLabel || 'Cupom',
    }))
    : [];
    const turnNumber = Number(snapshot?.turnNumber || 0);
    const label = String(snapshot?.label || '').trim() || (turnNumber > 0 ? `Turno ${String(turnNumber).padStart(2, '0')}` : 'Inicio');
    return {
      key: `${turnNumber}|${label}`,
      turnNumber,
      label,
      phase: String(snapshot?.phase || ''),
      players: (snapshot?.players || []).map((player) => {
        const currentPlayer = playersById[player?.id] || {};
        const cash = Number(player?.cash || 0);
        const patrimonyTotal = Number(player?.patrimony_total || cash);
        const titleCount = Number(player?.title_count || 0);
        const tollCount = Number(player?.toll_count || 0);
        return {
          id: player?.id,
          name: currentPlayer.name || player?.id || '--',
          cash,
          asset_total: Math.max(0, patrimonyTotal - cash),
          patrimony_total: patrimonyTotal,
          title_count: titleCount,
          toll_count: tollCount,
          permission_count: Number(player?.permission_count || 0),
          property_count: Number(player?.property_count || (titleCount + tollCount)),
          coupon_used_total: Number(player?.coupon_used_total || 0),
          coupon_expired_total: Number(player?.coupon_expired_total || 0),
          coupon_used_turn_count: Number(player?.coupon_used_turn_count || 0),
          coupon_expired_turn_count: Number(player?.coupon_expired_turn_count || 0),
          color: currentPlayer.color_hex || '#8fd7ff',
        };
      }),
    };
  });
  state.report.snapshotKeys = state.report.cashHistory.map((snapshot) => snapshot.key);
  renderReportOverlay();
}

async function loadGameFromSavePayload(payload) {
  const snapshot = payload?.record?.snapshot;
  if (!snapshot || snapshot.schema !== 'rdm-ui-save-v1') {
    throw new Error('Invalid save snapshot.');
  }

  state.setup.started = false;
  state.setup.submitting = false;

  const bootstrapPayload = buildLoadBootstrapPayload(snapshot);
  applyBootstrapPayload(bootstrapPayload);
  refreshAllOwnedCounts();
  populateSetupFromPayload(bootstrapPayload);
  restoreActionFeedFromSnapshot(snapshot.active_action_feed || []);
  restoreReportFromSnapshot(snapshot.report || null);
  state.setup.started = true;
  updateSetupStartButton();
  setSetupOverlayVisible(false);
  await renderMap();
  renderHud();
  renderActionFeed();
  renderReportOverlay();
  renderPropertyInspector();
  setPaused(true);
}

async function saveCurrentGame() {
  const button = byId('preview-save-button');
  if (button?.disabled) return;

  const saveLabel = await openSaveNameModal({ suggestedName: buildSuggestedSaveName() });
  if (!saveLabel) return;

  const previousLabel = button?.getAttribute('aria-label') || 'Salvar';
  const response = await persistGameSave({
    button,
    previousLabel,
    saveLabel,
    savingAriaLabel: 'Salvando',
  });

  if (!response) {
    await openDecisionModal({
      title: 'Falha ao salvar',
      copy: 'Nao foi possivel salvar a partida.',
      primaryLabel: 'OK',
      hideSecondary: true,
    });
    return;
  }

  await openDecisionModal({
    title: 'Partida salva',
    eyebrowLabel: 'Salvamento de partida',
    copy: `Arquivo ${response?.save?.label || response?.save?.save_id || 'Save'} salvo.`,
    primaryLabel: 'OK',
    hideSecondary: true,
  });
}

async function persistGameSave({ button = null, previousLabel = '', saveLabel = '', savingAriaLabel = 'Salvando' } = {}) {
  const resolvedLabel = String(saveLabel || '').trim();
  if (!resolvedLabel) return null;

  if (button) {
    button.disabled = true;
    button.setAttribute('aria-label', savingAriaLabel);
  }

  try {
    const snapshot = buildSaveSnapshot();
    const response = await fetchJson('/api/saves/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant: 'game-ai-ui-v3',
        label: resolvedLabel,
        save_space_id: getOrCreateSaveSpaceId(),
        snapshot,
      }),
    });
    if (button && response?.save?.file_name) {
      button.title = `Ultimo save: ${response.save.file_name}`;
    }
    return response;
  } catch (_error) {
    return null;
  } finally {
    if (button) {
      button.disabled = false;
      button.setAttribute('aria-label', previousLabel);
    }
  }
}

function returnToInitialScreen() {
  state.setup.started = false;
  state.setup.submitting = false;
  updateSetupStartButton();
  closeSetupAiEditor();
  closeSettingsOverlay();
  closeReportOverlay();
  saveBrowser?.close('secondary', { restorePause: false });
  setPaused(true);
  setSetupOverlayVisible(true);
}

async function autoSaveAndReturnHome() {
  const button = byId('preview-home-button');
  if (button?.disabled) return;

  if (!state.setup.started) {
    returnToInitialScreen();
    return;
  }

  const wasPaused = Boolean(state.view.paused);
  setPaused(true);

  const previousLabel = button?.getAttribute('aria-label') || 'Sair';
  const response = await persistGameSave({
    button,
    previousLabel,
    saveLabel: buildSuggestedSaveName(),
    savingAriaLabel: 'Salvando e saindo',
  });

  if (!response) {
    if (!wasPaused) {
      setPaused(false);
    }
    await openDecisionModal({
      title: 'Falha ao salvar',
      copy: 'Nao foi possivel salvar a partida atual antes de voltar para a tela inicial.',
      primaryLabel: 'OK',
      hideSecondary: true,
    });
    return;
  }

  if (button && response?.save?.file_name) {
    button.title = `Ultimo auto-save: ${response.save.file_name}`;
  }
  returnToInitialScreen();
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
    coupon_usage_total: 0,
    coupon_expired_total: 0,
    coupon_usage_turn_count: 0,
    coupon_expired_turn_count: 0,
    last_roll: null,
    skip_turns: 0,
    needs_new_contract: false,
    cashFlashValue: 0,
    cashFlashExpiresAt: 0,
    cashFlashToken: '',
    bankrupt: false,
    ...player,
    property_codes: (player.property_codes || []).map((code) => String(code || '').toUpperCase()),
    permissions: (player.permissions || []).map((permission) => normalizePermissionState({
      ...permission,
      purchase_price: Number(permission.purchase_price || defaultPermissionPrice),
      mortgaged: Boolean(permission.mortgaged),
    })).filter(Boolean),
    coupons: player.coupons || [],
    coupon_usage_total: Number(player.coupon_used_total || 0),
    coupon_expired_total: Number(player.coupon_expired_total || 0),
    coupon_usage_turn_count: Number(player.coupon_used_turn_count || 0),
    coupon_expired_turn_count: Number(player.coupon_expired_turn_count || 0),
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
  state.players.forEach((player) => {
    hydrateLoadedPlayerState(player);
  });
  state.assets = payload.assets || { ship_masks: {}, ship_fill_masks: {}, ship_sprites: {}, cargo_icons: {} };
  state.distances = payload.distances || {};
  state.session = payload.session || null;
  state.activeContract = payload.active_contract || null;
  applyAiStageConfiguration(payload);
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
  renderSettingsOverlay();
  resetReportData();
  renderHud();
  renderShipOverlay();
  renderActionFeed();
  renderPropertyInspector();
}

function setSetupOverlayVisible(visible) {
  const overlay = getSetupOverlay();
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
  if (!visible) {
    state.setup.aiEditorOpen = false;
    setSetupAiEditorVisible(false);
  }
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
    button.setAttribute('aria-label', color.label || color.id || 'Cor');
    button.title = color.label || color.id || 'Cor';
    button.innerHTML = `<span class="game-setup-swatch" style="background:${color.hex}"></span>`;
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
      pruneManualRobotProfiles(count);
      state.setup.aiEditorRobotIndex = Math.min(state.setup.aiEditorRobotIndex || 0, Math.max(0, count - 1));
      renderSetupRivalCounts();
      renderSetupAiProfileGrid();
      if (state.setup.aiEditorOpen) renderSetupAiEditor();
      updateSetupStartButton();
    });
    target.appendChild(button);
  });
}

function renderSetupAiDifficulties() {
  const target = byId('setup-ai-difficulties');
  if (!target) return;
  const disabled = Boolean(state.setup.aiAdvancedProfiles);
  target.innerHTML = '';
  AI_DIFFICULTY_OPTIONS.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `game-setup-count${state.setup.aiDifficulty === option.id ? ' is-active' : ''}`;
    button.textContent = option.label;
    button.disabled = disabled;
    button.title = disabled ? 'Desative o modo detalhado para mexer neste controle rapido.' : `Dificuldade ${option.label}.`;
    button.addEventListener('click', () => {
      if (disabled) return;
      state.setup.aiDifficulty = option.id;
      renderSetupAiDifficulties();
    });
    target.appendChild(button);
  });
}

function renderSetupAiProfileModes() {
  const target = byId('setup-ai-profile-modes');
  if (!target) return;
  const disabled = Boolean(state.setup.aiAdvancedProfiles);
  target.innerHTML = '';
  AI_PROFILE_MODE_OPTIONS.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `game-setup-count${state.setup.aiProfileMode === option.id ? ' is-active' : ''}`;
    button.textContent = option.label;
    button.disabled = disabled;
    button.title = disabled ? 'Desative o modo detalhado para mexer neste controle rapido.' : option.description;
    button.addEventListener('click', () => {
      if (disabled) return;
      state.setup.aiProfileMode = option.id;
      syncSetupProfileOrder(option.id);
      renderSetupAiProfileModes();
      renderSetupAiProfileGrid();
      if (state.setup.aiEditorOpen) renderSetupAiEditor();
    });
    target.appendChild(button);
  });
}

function setSetupAiEditorVisible(visible) {
  const overlay = getSetupAiEditorOverlay?.() || byId('setup-ai-editor-overlay');
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function activeSetupEditorRobotIndex() {
  const slotCount = setupRobotSlotCount();
  if (!slotCount) return 0;
  return Math.min(Math.max(0, Number(state.setup.aiEditorRobotIndex || 0)), slotCount - 1);
}

function setupAiTargetRobotIndexes() {
  if (state.setup.aiEditorApplyAll) {
    return Array.from({ length: setupRobotSlotCount() }, (_, index) => index);
  }
  return [activeSetupEditorRobotIndex()];
}

function setupRobotDisplayName(index = 0) {
  return `Robo ${index + 1}`;
}

function setupRobotEditorColor(index = 0) {
  const allColors = Array.isArray(state.playerColors) ? state.playerColors : [];
  const humanColorId = String(state.setup.selectedColorId || '');
  const palette = allColors.filter((color) => String(color?.id || '') !== humanColorId);
  const fallbackHex = '#8fd7ff';
  const activePalette = palette.length ? palette : allColors;
  const entry = activePalette[index % (activePalette.length || 1)] || null;
  const accentHex = entry?.hex || fallbackHex;
  return {
    accentHex,
    accentSoftHex: brightenHex(accentHex, 0.72),
    accentTextHex: brightenHex(accentHex, 0.18),
  };
}

function aiMarketCaseOption(id = '') {
  return AI_MARKET_CASE_OPTIONS.find((entry) => entry.id === id) || null;
}

function aiMarketCaseNegotiationValues(caseId = '') {
  const option = aiMarketCaseOption(caseId);
  if (!option) return null;
  if (option.presetId) {
    return cloneAiData(aiProfilesLib()?.negotiationPresets?.[option.presetId] || null);
  }
  return cloneAiData(option.values || null);
}

function formatAiSetupValue(field, value) {
  const numericValue = Number(value || 0);
  if ((field?.step || 0) >= 1) return String(Math.round(numericValue));
  const stepText = String(field?.step || 0.1);
  const decimals = stepText.includes('.') ? stepText.split('.')[1].length : 1;
  return numericValue.toFixed(Math.max(1, decimals));
}

function updateSetupAiSliderFill(input, field, rawValue) {
  if (!input || !field) return;
  const min = Number(field.min || 0);
  const max = Number(field.max || 0);
  const value = Number(rawValue || 0);
  const span = max - min;
  const ratio = span > 0 ? (value - min) / span : 0;
  const percent = Math.max(0, Math.min(1, ratio)) * 100;
  const tickStep = Number(field.tickStep || field.step || 0.1);
  const tickPercent = span > 0 ? Math.max((tickStep / span) * 100, 0) : 0;
  input.style.setProperty('--setup-ai-fill', `${percent}%`);
  input.style.setProperty('--setup-ai-step-percent', `${tickPercent}%`);
}

function resolveSetupRobotConfig(index = 0) {
  const stored = normalizeManualRobotConfig(state.setup.manualRobotConfigs?.[index], index);
  if (stored) return stored;
  return buildManualRobotConfig(defaultSetupArchetypeIdForSlot(index));
}

function robotProfileLabelForSetup(index = 0) {
  const config = normalizeManualRobotConfig(state.setup.manualRobotConfigs?.[index], index);
  const profile = aiArchetypeById(config?.archetypeId || defaultSetupArchetypeIdForSlot(index));
  return profile?.label || 'Equilibrado';
}

function renderSetupAiEditorSummary(config, robotIndex) {
  const target = byId('setup-ai-editor-summary');
  const descriptionTarget = byId('setup-ai-editor-description');
  const profile = aiArchetypeById(config?.archetypeId || defaultSetupArchetypeIdForSlot(robotIndex));
  if (descriptionTarget) {
    descriptionTarget.textContent = state.setup.aiEditorApplyAll
      ? 'Ajuste fino completo de todos os robos.'
      : (profile?.description || 'Ajuste fino completo do robo atual.');
  }
  if (!target) return;
  const negotiation = config?.overrides?.negotiation || {};
  const vision = config?.overrides?.vision || {};
  const personality = config?.overrides?.personality || {};
  const skill = config?.overrides?.skill || {};
  target.innerHTML = `
    <div class="setup-ai-editor-summary-row"><span>Perfil base</span><strong>${escapeHtml(profile?.label || 'Custom')}</strong></div>
    <div class="setup-ai-editor-summary-row"><span>Compra / venda</span><strong>${formatAiSetupValue({ step: 0.01 }, negotiation.buy_openness || 0)} / ${formatAiSetupValue({ step: 0.01 }, negotiation.sell_openness || 0)}</strong></div>
    <div class="setup-ai-editor-summary-row"><span>Portos / pedagios</span><strong>${formatAiSetupValue({ step: 0.01 }, vision.weight_port || 0)} / ${formatAiSetupValue({ step: 0.01 }, vision.weight_toll || 0)}</strong></div>
    <div class="setup-ai-editor-summary-row"><span>Reserva / risco</span><strong>${formatAiSetupValue({ step: 0.01 }, personality.cash_reserve_ratio || 0)} / ${formatAiSetupValue({ step: 0.01 }, personality.risk_tolerance || 0)}</strong></div>
    <div class="setup-ai-editor-summary-row"><span>Previsao / timing</span><strong>${formatAiSetupValue({ step: 0.01 }, skill.foresight || 0)} / ${formatAiSetupValue({ step: 0.01 }, skill.timing_quality || 0)}</strong></div>
    <div class="setup-ai-editor-summary-row"><span>Companhia</span><strong>${state.setup.aiEditorApplyAll ? 'Todos os robos' : setupRobotDisplayName(robotIndex)}</strong></div>
  `;
}

function updateSetupAiParameter(groupKey, fieldKey, rawValue) {
  const robotIndex = activeSetupEditorRobotIndex();
  const field = AI_PARAMETER_FIELD_MAP[`${groupKey}.${fieldKey}`];
  if (!field) return;
  const value = clampAiSetting(rawValue, field.min, field.max, field.step);
  let summaryConfig = null;
  setupAiTargetRobotIndexes().forEach((targetRobotIndex) => {
    const config = ensureSetupRobotConfig(targetRobotIndex);
    config.overrides[groupKey][fieldKey] = value;
    persistSetupRobotConfig(targetRobotIndex, config);
    if (targetRobotIndex === robotIndex) summaryConfig = config;
  });
  renderSetupAiEditorSummary(summaryConfig || resolveSetupRobotConfig(robotIndex), robotIndex);
  renderSetupAiProfileGrid();
}

function aiPresetOptionsForGroup(groupKey = '') {
  return AI_PROFILE_PARAMETER_GROUPS.find((group) => group.key === groupKey)?.presets || [];
}

function resolveSetupAiGroupPresetId(config, groupKey = '') {
  const metadataKey = AI_GROUP_PRESET_METADATA_KEYS[groupKey];
  const presetOptions = aiPresetOptionsForGroup(groupKey);
  const metadataPresetId = String(config?.overrides?.metadata?.[metadataKey] || '').trim();
  if (metadataPresetId && presetOptions.some((preset) => preset.id === metadataPresetId)) {
    return metadataPresetId;
  }
  const group = AI_PROFILE_PARAMETER_GROUPS.find((entry) => entry.key === groupKey);
  if (!group) return '';
  const values = config?.overrides?.[groupKey] || {};
  const matchedPreset = presetOptions.find((preset) => group.fields.every((field) => Number(values[field.key] ?? 0) === Number(preset.values?.[field.key] ?? 0)));
  return matchedPreset?.id || '';
}

function applySetupAiGroupPreset(groupKey = '', presetId = '') {
  const group = AI_PROFILE_PARAMETER_GROUPS.find((entry) => entry.key === groupKey);
  const preset = aiPresetOptionsForGroup(groupKey).find((entry) => entry.id === presetId);
  if (!group || !preset) return;
  const robotIndex = activeSetupEditorRobotIndex();
  setupAiTargetRobotIndexes().forEach((targetRobotIndex) => {
    const config = ensureSetupRobotConfig(targetRobotIndex);
    config.overrides[groupKey] = cloneAiData(preset.values || {});
    config.overrides.metadata = {
      ...(config.overrides.metadata || {}),
      [AI_GROUP_PRESET_METADATA_KEYS[groupKey]]: preset.id,
    };
    persistSetupRobotConfig(targetRobotIndex, config);
  });
  state.setup.aiAdvancedProfiles = true;
  renderSetupAiProfileGrid();
  renderSetupAiEditor();
}

function renderSetupAiParameterGrid() {
  const target = byId('setup-ai-parameter-grid');
  if (!target) return;
  const robotIndex = activeSetupEditorRobotIndex();
  const config = resolveSetupRobotConfig(robotIndex);
  target.innerHTML = AI_PROFILE_PARAMETER_GROUPS.map((group) => `
    <section class="setup-ai-family-card">
      <div class="setup-ai-family-presets">
        ${group.presets.map((preset) => `
          <button
            type="button"
            class="setup-ai-preset-button${resolveSetupAiGroupPresetId(config, group.key) === preset.id ? ' is-active' : ''}"
            data-setup-ai-group-preset="${group.key}:${preset.id}"
            aria-label="${escapeHtml(preset.label)}: ${escapeHtml(preset.description || preset.label)}"
          >
            <span class="setup-ai-button-label">${escapeHtml(preset.label)}</span>
            <span class="setup-ai-button-help" aria-hidden="true" data-help="${escapeHtml(preset.description || preset.label)}">?</span>
          </button>
        `).join('')}
      </div>
      <div class="setup-ai-parameter-card setup-ai-family-panel">
        <div class="setup-ai-parameter-card-head">
          <span class="setup-ai-group-title">
            <strong>${escapeHtml(group.label)}</strong>
          </span>
        </div>
        <p class="setup-ai-group-description">${escapeHtml(group.description || '')}</p>
        <div class="setup-ai-parameter-list">
          ${group.fields.map((field) => {
            const value = Number(config?.overrides?.[group.key]?.[field.key] ?? 0);
            const helpText = escapeHtml(AI_SETUP_FIELD_HELP[`${group.key}.${field.key}`] || group.description || '');
            return `
              <label class="setup-ai-slider-row">
                <span class="setup-ai-slider-label">
                  <span>${escapeHtml(field.label)}</span>
                  <span class="setup-ai-inline-help" tabindex="0" data-help="${helpText}">?</span>
                </span>
                <div class="setup-ai-slider-shell">
                  <input
                    class="setup-ai-slider"
                    type="range"
                    min="${field.min}"
                    max="${field.max}"
                    step="${field.step}"
                    value="${value}"
                    data-setup-ai-group="${group.key}"
                    data-setup-ai-field="${field.key}"
                  />
                </div>
                <strong data-setup-ai-slider-value="${group.key}.${field.key}">${formatAiSetupValue(field, value)}</strong>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `).join('');

  target.querySelectorAll('[data-setup-ai-group-preset]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const [groupKey, presetId] = String(event.currentTarget.dataset.setupAiGroupPreset || '').split(':');
      if (!groupKey || !presetId) return;
      applySetupAiGroupPreset(groupKey, presetId);
    });
  });

  target.querySelectorAll('[data-setup-ai-group][data-setup-ai-field]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const groupKey = String(event.currentTarget.dataset.setupAiGroup || '');
      const fieldKey = String(event.currentTarget.dataset.setupAiField || '');
      const field = AI_PARAMETER_FIELD_MAP[`${groupKey}.${fieldKey}`];
      if (!field) return;
      const value = clampAiSetting(event.currentTarget.value, field.min, field.max, field.step);
      event.currentTarget.value = value;
      const label = target.querySelector(`[data-setup-ai-slider-value="${groupKey}.${fieldKey}"]`);
      if (label) label.textContent = formatAiSetupValue(field, value);
      updateSetupAiSliderFill(event.currentTarget, field, value);
      updateSetupAiParameter(groupKey, fieldKey, value);
    });
    const field = AI_PARAMETER_FIELD_MAP[`${input.dataset.setupAiGroup || ''}.${input.dataset.setupAiField || ''}`];
    if (field) updateSetupAiSliderFill(input, field, input.value);
  });
}

function applySetupAiPreset(archetypeId = '') {
  const robotIndex = activeSetupEditorRobotIndex();
  if (!archetypeId) {
    resetSetupRobotConfig(robotIndex);
    renderSetupAiProfileGrid();
    renderSetupAiEditor();
    return;
  }
  state.setup.aiAdvancedProfiles = true;
  persistSetupRobotConfig(robotIndex, buildManualRobotConfig(archetypeId));
  renderSetupAiProfileGrid();
  renderSetupAiEditor();
}

function applySetupAiMarketCase(caseId = '') {
  const values = aiMarketCaseNegotiationValues(caseId);
  if (!values) return;
  state.setup.aiAdvancedProfiles = true;
  for (let index = 0; index < setupRobotSlotCount(); index += 1) {
    const config = ensureSetupRobotConfig(index);
    config.overrides.negotiation = {
      ...(config.overrides.negotiation || {}),
      ...cloneAiData(values),
    };
    persistSetupRobotConfig(index, config);
  }
  renderSetupAiAdvancedToggle();
  renderSetupAiProfileGrid();
  renderSetupAiEditor();
}

function renderSetupAiMarketCases() {
  const target = byId('setup-ai-market-cases');
  if (!target) return;
  target.innerHTML = '';
  AI_MARKET_CASE_OPTIONS.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'setup-ai-preset-button setup-ai-market-button';
    button.setAttribute('aria-label', `${option.label}: ${option.description}`);
    button.innerHTML = `<span class="setup-ai-button-label">${escapeHtml(option.label)}</span><span class="setup-ai-button-help" aria-hidden="true" data-help="${escapeHtml(option.description || option.label)}">?</span>`;
    button.addEventListener('click', () => applySetupAiMarketCase(option.id));
    target.appendChild(button);
  });
}

function renderSetupAiRobotTabs() {
  const target = byId('setup-ai-robot-tabs');
  if (!target) return;
  const slotCount = setupRobotSlotCount();
  const activeIndex = activeSetupEditorRobotIndex();
  const applyAll = Boolean(state.setup.aiEditorApplyAll);
  target.style.gridTemplateColumns = `repeat(${slotCount + 1}, minmax(0, 1fr))`;
  target.innerHTML = '';
  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `game-setup-count setup-ai-robot-tab is-all${applyAll ? ' is-active' : ''}`;
  allButton.innerHTML = '<span class="setup-ai-robot-tab-label">TODOS</span>';
  allButton.title = 'Aplicar mudancas a todos os robos';
  allButton.addEventListener('click', () => {
    state.setup.aiEditorApplyAll = !state.setup.aiEditorApplyAll;
    renderSetupAiEditor();
  });
  target.appendChild(allButton);
  for (let index = 0; index < slotCount; index += 1) {
    const colors = setupRobotEditorColor(index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `game-setup-count setup-ai-robot-tab${!applyAll && activeIndex === index ? ' is-active' : ''}`;
    button.style.setProperty('--setup-ai-robot-accent', colors.accentHex);
    button.style.setProperty('--setup-ai-robot-accent-soft', colors.accentSoftHex);
    button.style.setProperty('--setup-ai-robot-text', colors.accentTextHex);
    button.innerHTML = `<span class="setup-ai-robot-tab-swatch" aria-hidden="true"></span><span class="setup-ai-robot-tab-index">${index + 1}</span>`;
    button.title = `${setupRobotDisplayName(index)} - ${robotProfileLabelForSetup(index)}`;
    button.addEventListener('click', () => {
      state.setup.aiEditorApplyAll = false;
      state.setup.aiEditorRobotIndex = index;
      renderSetupAiEditor();
    });
    target.appendChild(button);
  }
}

function renderSetupAiPresetButtons() {
  const target = byId('setup-ai-preset-buttons');
  if (!target) return;
  const robotIndex = activeSetupEditorRobotIndex();
  const activeConfig = resolveSetupRobotConfig(robotIndex);
  const options = aiArchetypeSetupOptions();
  target.innerHTML = '';
  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `setup-ai-preset-button${activeConfig.archetypeId === option.id ? ' is-active' : ''}`;
    button.dataset.setupAiPreset = option.id;
    button.setAttribute('aria-label', `${option.label}: ${option.description || option.label}`);
    button.innerHTML = `<span class="setup-ai-button-label">${escapeHtml(option.label)}</span><span class="setup-ai-button-help" aria-hidden="true" data-help="${escapeHtml(option.description || option.label)}">?</span>`;
    button.addEventListener('click', () => applySetupAiPreset(option.id));
    target.appendChild(button);
  });
}

function renderSetupAiEditor() {
  if (!state.setup.aiEditorOpen) return;
  const slotCount = setupRobotSlotCount();
  if (!slotCount) {
    closeSetupAiEditor();
    return;
  }
  state.setup.aiEditorRobotIndex = activeSetupEditorRobotIndex();
  setSetupAiEditorVisible(true);
  renderSetupAiRobotTabs();
  const config = resolveSetupRobotConfig(state.setup.aiEditorRobotIndex);
  renderSetupAiEditorSummary(config, state.setup.aiEditorRobotIndex);
  renderSetupAiParameterGrid();
}

function openSetupAiEditor(robotIndex = 0) {
  if (!setupRobotSlotCount()) return;
  state.setup.aiAdvancedProfiles = true;
  seedSetupRobotConfigs();
  state.setup.aiEditorOpen = true;
  state.setup.aiEditorApplyAll = false;
  state.setup.aiEditorRobotIndex = Math.max(0, Math.min(robotIndex, setupRobotSlotCount() - 1));
  renderSetupAiAdvancedToggle();
  renderSetupAiProfileGrid();
  renderSetupAiModeVisibility();
  renderSetupAiEditor();
  applyCurrentAiSetupToRunningGame({ refreshUi: false });
  pauseForToolbarOverlay('aiEditorWasPaused');
}

function deactivateSetupAiAdvanced() {
  state.setup.aiAdvancedProfiles = false;
  state.setup.aiEditorOpen = false;
  setSetupAiEditorVisible(false);
  renderSetupAiAdvancedToggle();
  renderSetupAiProfileGrid();
  renderSetupAiModeVisibility();
  applyCurrentAiSetupToRunningGame();
}

function closeSetupAiEditor() {
  state.setup.aiEditorOpen = false;
  setSetupAiEditorVisible(false);
  applyCurrentAiSetupToRunningGame();
  resumeAfterToolbarOverlay('aiEditorWasPaused');
}

function renderSetupAiModeVisibility() {
  const advancedEnabled = Boolean(state.setup.aiAdvancedProfiles);
  const difficultyField = byId('setup-ai-difficulty-field');
  const profileField = byId('setup-ai-profile-mode-field');
  difficultyField?.classList.toggle('is-disabled', advancedEnabled);
  profileField?.classList.toggle('is-disabled', advancedEnabled);
  difficultyField?.setAttribute('aria-disabled', advancedEnabled ? 'true' : 'false');
  profileField?.setAttribute('aria-disabled', advancedEnabled ? 'true' : 'false');
  renderSetupAiDifficulties();
  renderSetupAiProfileModes();
}

function renderSetupAiAdvancedToggle() {
  const target = byId('setup-ai-advanced-toggle');
  if (!target) return;
  target.innerHTML = `
    <label class="settings-choice" data-setup-ai-mode="basic">
      <input id="setup-ai-mode-basic" type="radio" name="setup-ai-mode" value="basic" ${state.setup.aiAdvancedProfiles ? '' : 'checked'} />
      <span>Basico</span>
    </label>
    <label class="settings-choice" data-setup-ai-mode="advanced">
      <input id="setup-ai-mode-advanced" type="radio" name="setup-ai-mode" value="advanced" ${state.setup.aiAdvancedProfiles ? 'checked' : ''} />
      <span>Detalhado</span>
    </label>
  `;
  target.querySelector('#setup-ai-mode-basic')?.addEventListener('change', () => {
    if (!state.setup.aiAdvancedProfiles) return;
    deactivateSetupAiAdvanced();
  });
  target.querySelector('#setup-ai-mode-advanced')?.addEventListener('change', () => {
    openSetupAiEditor(activeSetupEditorRobotIndex());
  });
  target.querySelector('[data-setup-ai-mode="advanced"]')?.addEventListener('click', () => {
    if (state.setup.aiAdvancedProfiles && !state.setup.aiEditorOpen) {
      openSetupAiEditor(activeSetupEditorRobotIndex());
    }
  });
  renderSetupAiModeVisibility();
}

function renderSetupAiProfileGrid() {
  const target = byId('setup-ai-profile-grid');
  if (!target) return;
  target.classList.add('is-hidden');
  target.innerHTML = '';
}


function populateSetupFromPayload(payload) {
  const defaults = buildAiSetupDefaults(payload.setup_defaults || {});
  state.setup.companyName = defaults.company_name || 'Minha Companhia';
  state.setup.selectedColorId = defaults.human_color_id || state.playerColors[0]?.id || '';
  state.setup.rivalCount = defaults.rival_count || 5;
  state.setup.aiDifficulty = defaults.ai_difficulty || 'normal';
  state.setup.aiProfileMode = normalizeAiProfileModeId(defaults.ai_profile_mode || 'balanced');
  state.setup.aiProfileOrder = buildSetupProfileOrder(state.setup.aiProfileMode, defaults.ai_profile_order || []);
  state.setup.aiAdvancedProfiles = Boolean(defaults.ai_advanced_profiles);
  state.setup.manualRobotProfiles = normalizeManualRobotProfiles(defaults.ai_manual_profiles || {}, state.setup.rivalCount);
  state.setup.manualRobotConfigs = normalizeManualRobotConfigs(defaults.ai_manual_robot_configs || {}, state.setup.rivalCount);
  state.setup.aiEditorOpen = false;
  state.setup.aiEditorRobotIndex = 0;
  state.setup.submitting = false;

  const nameInput = byId('setup-company-name');
  if (nameInput) {
    nameInput.value = state.setup.companyName;
    nameInput.oninput = (event) => {
      state.setup.companyName = event.target.value;
      updateSetupStartButton();
    };
  }

  renderSetupColorGrid();
  renderSetupRivalCounts();
  renderSetupAiDifficulties();
  renderSetupAiProfileModes();
  renderSetupAiAdvancedToggle();
  renderSetupAiProfileGrid();
  updateSetupStartButton();
}

function cpuShouldBuyPropertyAtPrice(player, price, card = null, reason = 'property_purchase') {
  const engine = aiPolicyEngine();
  if (engine?.decideBuyBankProperty) {
    const decision = engine.decideBuyBankProperty({
      player,
      card,
      price,
      context: aiDecisionContext(player, {
        reason,
        purchaseSignals: card ? buildAiBankPurchaseSignals(player, card, { reason }) : { reason },
      }),
    });
    return Boolean(decision?.shouldBuy);
  }

  const policy = player?.purchase_policy || 'always';
  const normalizedPrice = Math.max(0, Number(price || 0));
  if (player?.bankrupt) return false;
  if (policy === 'never') return false;
  if (policy === 'random') return player.cash >= normalizedPrice && Math.random() >= 0.5;
  return player.cash >= normalizedPrice;
}

function cpuShouldBuyOrigin(player, card, reason = 'origin_purchase') {
  if (!card) return false;
  return cpuShouldBuyPropertyAtPrice(player, card.price, card, reason);
}

function cpuShouldNegotiateOwnedProperty(player, negotiationPrice, owner = null, card = null) {
  const engine = aiPolicyEngine();
  if (engine?.decideOwnedPropertyNegotiation) {
    const decision = engine.decideOwnedPropertyNegotiation({
      player,
      owner,
      card,
      price: negotiationPrice,
      context: aiDecisionContext(player, { reason: 'owned_property_negotiation' }),
    });
    return Boolean(decision?.shouldBuy);
  }
  return cpuShouldBuyPropertyAtPrice(player, negotiationPrice, card, 'owned_property_negotiation');
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
      const drawResult = await openHumanOriginPortDraw();
      await delay(longDelay);
      if (drawResult?.card && drawResult.negotiate) {
        await maybeHandleOwnedOriginPortNegotiation(player, drawResult.card, { forceHumanPrompt: true });
      }
      originResult = { bought: Boolean(player.property_codes?.includes(player.location_code || '')), note: ensurePlayerContractDraft(player)?.note || '' };
    } else {
      const originCard = randomChoice(state.portCards);
      const originOwner = ownerPlayerOf(originCard?.code || '');
      const shouldBuyOrigin = !originOwner && cpuShouldBuyOrigin(player, originCard, 'origin_purchase');
      originResult = applyOriginSelectionForPlayer(player, originCard, shouldBuyOrigin, {
        updateSession: true,
        actionLabel: `${player.name}: porto inicial`,
        note: shouldBuyOrigin
          ? `${player.name} sorteou ${originCard.code} e comprou o porto inicial.`
          : `${player.name} sorteou ${originCard.code} sem comprar o porto inicial.`,
      });
      if (originOwner && originOwner.id !== player.id) {
        await maybeHandleOwnedOriginPortNegotiation(player, originCard);
      }
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

  if (!needsPermission) {
    if (player.is_human) {
      const selection = contractPermissionChoicesForOrigin(player, originCode);
      if (selection.choices.length > 1) {
        setSession({
          active_player_id: player.id,
          phase: phaseLabel,
          action_label: 'Escolher permissao',
          note: 'Escolha a permissao para o proximo contrato.',
        });
        renderHud();
        const selectedPermissionId = await openHumanPermissionChoice(player, { originCode: selection.originCode });
        if (selectedPermissionId) {
          const result = await applyContractPermissionChoice(player, selectedPermissionId, {
            statusLabel: 'permissao escolhida',
            actionLabel: 'Mudanca de permissao',
            reason: 'mudanca de permissao do jogador no novo contrato',
          });
          if (result.changed && result.permission) {
            pushActionLog(player, 'Permissao escolhida', result.permission.title);
            renderHud();
          }
        }
        await delay(shortDelay);
      }
    } else {
      await applyBestContractPermissionForRobot(player, originCode);
    }
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
    if (!tollCard) {
      throw new Error(`Nao foi encontrada carta de pedagio para ${player.name}.`);
    }
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
    const resolvedContract = ensurePlayerContractDraft(player);
    if (!resolvedContract?.destination || resolvedContract.destination === '--') {
      throw new Error('O porto de destino nao foi definido para o contrato inicial.');
    }
  } else {
    const originCode = player.location_code || ensurePlayerContractDraft(player)?.origin || '';
    const destinationPool = destinationCandidatesForOrigin(originCode);
    const destinationCard = randomChoice(destinationPool);
    if (!destinationCard) {
      throw new Error(`Nao foi encontrado porto de destino para ${player.name} a partir de ${originCode || '--'}.`);
    }
    applyDestinationSelectionForPlayer(player, destinationCard, {
      updateSession: true,
      actionLabel: `${player.name}: destino definido`,
      note: originResult?.bought
        ? `${player.name} vai de ${originCode} para ${destinationCard.code} com multiplicador de posse no porto inicial.`
        : `${player.name} vai de ${originCode} para ${destinationCard.code}.`,
    });
    await delay(shortDelay);
  }

  const contract = ensurePlayerContractDraft(player);
  handleTutorialEvent('contract_ready', {
    playerId: player.id,
    origin: String(contract?.origin || ''),
    toll: String(contract?.mandatory_toll || ''),
    destination: String(contract?.destination || ''),
  });
  return contract;
}

async function runCpuOpeningTurn(player) {
  if (!player) return;

  state.view.openRivalDrawerId = player.id;
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
  if (!player.is_human) {
    state.view.openRivalDrawerId = player.id;
    renderHud();
  } else {
    state.view.openRivalDrawerId = null;
    renderHud();
  }

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
        active_player_id: 'human',
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

    state.view.openRivalDrawerId = null;
    setSession({
      active_player_id: 'human',
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
  let setupStage = 'enviando configuracao inicial';

  try {
    setupStage = 'carregando configuracao da partida';
    const payload = await fetchJson('/api/game-ai/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: state.setup.companyName.trim() || 'Minha Companhia',
        color_id: state.setup.selectedColorId,
        rival_count: state.setup.rivalCount,
      }),
    });

    setupStage = 'aplicando dados iniciais';
    payload.setup_defaults = buildAiSetupDefaults(payload.setup_defaults || {}, {
      ai_difficulty: state.setup.aiDifficulty,
      ai_profile_mode: state.setup.aiProfileMode,
      ai_profile_order: state.setup.aiProfileOrder,
      ai_advanced_profiles: state.setup.aiAdvancedProfiles,
      ai_manual_profiles: state.setup.aiAdvancedProfiles
        ? serializeManualRobotProfiles(state.setup.manualRobotProfiles, state.setup.rivalCount)
        : [],
      ai_manual_robot_configs: state.setup.aiAdvancedProfiles
        ? serializeManualRobotConfigs(state.setup.manualRobotConfigs, state.setup.rivalCount)
        : [],
    });
    applyBootstrapPayload(payload);
    state.setup.started = true;
    setSetupOverlayVisible(false);
    setPaused(false);
    setupStage = 'renderizando mapa inicial';
    await renderMap();
    await delay(140);
    setupStage = 'abrindo contrato inicial do jogador';
    await runContractOpeningForPlayer(humanPlayer(), {
      phaseLabel: 'Primeiro turno',
      needsPermission: true,
      originMode: 'draw',
    });
    await delay(PREP_STEP_DELAY_MS);
    setupStage = 'abrindo dados do primeiro turno';
    await runTurnExecutionForPlayer(humanPlayer(), {
      phaseLabel: 'Primeiro turno',
      humanActionLabel: 'Rolar 2 dados',
      humanNote: 'Agora o usuario deve jogar os dois dados de movimentacao.',
    });

    await delay(currentCpuRevealDelay(PREP_STEP_DELAY_LONG_MS));
    setupStage = 'executando primeiro turno dos robos';
    await runCpuOpeningRound();
    state.setup.submitting = false;
    updateSetupStartButton();
    delay(currentCpuRevealDelay(PREP_STEP_DELAY_LONG_MS)).then(() => {
      runSubsequentTurnCycle().catch(() => {});
    });
  } catch (error) {
    state.setup.submitting = false;
    updateSetupStartButton();
    console.error('Falha ao iniciar partida do game-v3', { stage: setupStage, error });
    const detail = String(error?.message || '').trim();
    window.alert(detail
      ? `Nao foi possivel iniciar a partida.\n\nEtapa: ${setupStage}\nErro: ${detail}`
      : `Nao foi possivel iniciar a partida.\n\nEtapa: ${setupStage}`);
  }
}

async function bootstrap() {
  const [mapPayload, uiPayload] = await Promise.all([
    fetchJson('/api/map/bootstrap'),
    fetchJson('/api/game-ai/bootstrap'),
  ]);

  uiPayload.setup_defaults = buildAiSetupDefaults(uiPayload.setup_defaults || {});
  applyMapPayload(mapPayload);
  applyBootstrapPayload(uiPayload);
  populateSetupFromPayload(uiPayload);
  state.setup.started = false;
  await renderMap();
  setSetupOverlayVisible(true);
  if (shouldStartTutorial()) {
    startTutorial();
  }
  renderTutorialAuthoring();
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = byId('game-setup-form');
  const layer = getHitLayer();

  loadTutorialProgress();
  await loadGameV3TutorialConfig();
  loadTutorialAuthoringConfig();

  saveBrowser = window.createSaveBrowserController?.({
    state,
    byId,
    fetchJson,
    setPaused,
    openDecisionModal,
    runtime: 'game-ai-ui-v3',
    getSaveSpaceId: getOrCreateSaveSpaceId,
    onLoad: loadGameFromSavePayload,
    onAfterSuccess: async () => {
      if (state.setup.started && !state.flow.turnCycleRunning) {
        runSubsequentTurnCycle().catch(() => {});
      }
    },
    confirmEyebrow: 'Carregamento de Arquivo',
    confirmTitle: 'Carregamento de Arquivo',
    confirmCopyBuilder: (payload) => `Arquivo <strong>${String(payload?.meta?.file_name || payload?.meta?.label || 'selecionado').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</strong> carregado com sucesso.`,
  }) || null;

  form?.addEventListener('submit', (event) => {
    submitSetupSelection(event).catch(() => {
      state.setup.submitting = false;
      updateSetupStartButton();
    });
  });
  byId('setup-continue-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('setup-continue-button', { stepId: tutorialCurrentStep()?.id || '' });
    saveBrowser?.loadLatestCompatibleSave().catch(() => {});
  });
  byId('setup-load-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('setup-load-button', { stepId: tutorialCurrentStep()?.id || '' });
    saveBrowser?.browseCompatibleSaves().catch(() => {});
  });
  byId('setup-start-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('setup-start-button', { stepId: tutorialCurrentStep()?.id || '' });
  });

  getTutorialAuthoringToggle()?.addEventListener('click', () => {
    setTutorialAuthoringOpen(!tutorialAuthoringState()?.open);
  });
  byId('tutorial-authoring-close')?.addEventListener('click', () => {
    setTutorialAuthoringOpen(false);
  });
  getTutorialAuthoringMinimizeButton()?.addEventListener('click', () => {
    const editor = tutorialAuthoringState();
    setTutorialAuthoringMinimized(!editor?.minimized);
  });
  getTutorialAuthoringMaximizeButton()?.addEventListener('click', () => {
    const editor = tutorialAuthoringState();
    setTutorialAuthoringMaximized(!editor?.maximized);
  });
  byId('tutorial-authoring-prev')?.addEventListener('click', () => {
    cycleTutorialAuthoringStep(-1);
  });
  byId('tutorial-authoring-next')?.addEventListener('click', () => {
    cycleTutorialAuthoringStep(1);
  });
  getTutorialAuthoringPrevMiniButton()?.addEventListener('click', () => {
    cycleTutorialAuthoringStep(-1);
  });
  getTutorialAuthoringNextMiniButton()?.addEventListener('click', () => {
    cycleTutorialAuthoringStep(1);
  });
  byId('tutorial-authoring-insert')?.addEventListener('click', () => {
    insertTutorialAuthoringStep({ duplicate: false });
  });
  byId('tutorial-authoring-duplicate')?.addEventListener('click', () => {
    insertTutorialAuthoringStep({ duplicate: true });
  });
  byId('tutorial-authoring-move-up')?.addEventListener('click', () => {
    moveTutorialAuthoringStep(-1);
  });
  byId('tutorial-authoring-move-down')?.addEventListener('click', () => {
    moveTutorialAuthoringStep(1);
  });
  byId('tutorial-authoring-delete')?.addEventListener('click', () => {
    deleteTutorialAuthoringCurrentStep();
  });
  getTutorialAuthoringStepSelect()?.addEventListener('change', (event) => {
    const stepId = String(event.target.value || '');
    if (!stepId) return;
    tutorialAuthoringState().selectedStepId = stepId;
    setTutorialStep(stepId);
    renderTutorialAuthoring();
  });
  getTutorialAuthoringTargetSelect()?.addEventListener('change', (event) => {
    updateTutorialAuthoringField('target', event.target.value);
  });
  getTutorialAuthoringAdvanceModeSelect()?.addEventListener('change', (event) => {
    updateTutorialAuthoringField('advanceMode', event.target.value);
  });
  getTutorialAuthoringFocusStyleSelect()?.addEventListener('change', (event) => {
    updateTutorialAuthoringField('focusStyle', event.target.value);
  });
  getTutorialAuthoringClickLabelInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringField('clickLabel', event.target.value);
  });
  getTutorialAuthoringBadgePositionSelect()?.addEventListener('change', (event) => {
    updateTutorialAuthoringField('badgePosition', event.target.value);
  });
  getTutorialAuthoringTitleInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringField('title', event.target.value);
  });
  getTutorialAuthoringBodyInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringField('body', event.target.value);
  });
  getTutorialAuthoringHintInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringField('hint', event.target.value);
  });
  getTutorialAuthoringXInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringCardField('x', event.target.value);
  });
  getTutorialAuthoringYInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringCardField('y', event.target.value);
  });
  getTutorialAuthoringWidthInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringCardField('width', event.target.value);
  });
  getTutorialAuthoringHeightInput()?.addEventListener('input', (event) => {
    updateTutorialAuthoringCardField('height', event.target.value);
  });
  byId('tutorial-authoring-reset-step')?.addEventListener('click', () => {
    resetTutorialAuthoringCurrentStep();
  });
  byId('tutorial-authoring-reset-all')?.addEventListener('click', () => {
    resetTutorialAuthoringAllSteps();
  });
  byId('tutorial-authoring-copy')?.addEventListener('click', () => {
    copyTutorialAuthoringJson().catch(() => {});
  });
  getTutorialPreviewDragHandle()?.addEventListener('mousedown', (event) => {
    beginTutorialAuthoringManipulation(event, 'move');
  });
  getTutorialPreviewResizeHandle()?.addEventListener('mousedown', (event) => {
    beginTutorialAuthoringManipulation(event, 'resize');
  });
  getTutorialPreviewSkipButton()?.addEventListener('click', () => {
    skipTutorial();
  });
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!shouldBlockTutorialInteraction(target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  byId('start-permission-draw')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('start-permission-draw', { stepId: tutorialCurrentStep()?.id || '' });
    startPermissionDraw();
  });
  byId('port-draw-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('port-draw-button', {
      mode: String(state.portDraw.mode || ''),
      stepId: tutorialCurrentStep()?.id || '',
    });
    startCurrentPortDraw();
  });
  byId('port-draw-extra-primary')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('port-draw-extra-primary', {
      mode: String(state.portDraw.mode || ''),
      stepId: tutorialCurrentStep()?.id || '',
    });
  });
  byId('port-draw-extra-secondary')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('port-draw-extra-secondary', {
      mode: String(state.portDraw.mode || ''),
      stepId: tutorialCurrentStep()?.id || '',
    });
  });
  byId('movement-dice-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('movement-dice-button', { stepId: tutorialCurrentStep()?.id || '' });
    startMovementDiceRoll();
  });
  byId('chance-draw-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('chance-draw-button', { stepId: tutorialCurrentStep()?.id || '' });
    startChanceDraw();
  });
  getPermissionChoiceStage()?.addEventListener('click', (event) => {
    const button = event.target.closest('.permission-choice-card');
    if (!button?.dataset?.permissionChoiceId) return;
    closePermissionChoice(button.dataset.permissionChoiceId);
  });

  getNegotiationCounterInput()?.addEventListener('input', (event) => {
    state.negotiation.draftCounter = String(event.target.value || '').trim();
    if (state.negotiation.feedback) {
      state.negotiation.feedback = '';
      renderHumanNegotiation();
    }
  });
  getNegotiationCounterInput()?.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' && !event.repeat) {
      event.preventDefault();
      submitHumanNegotiation('counter');
      return;
    }
    if (event.code === 'Escape' && !event.repeat) {
      event.preventDefault();
      submitHumanNegotiation('refuse');
    }
  });
  getNegotiationAccept()?.addEventListener('click', () => submitHumanNegotiation('accept'));
  getNegotiationBarterToggle()?.addEventListener('click', () => toggleNegotiationBarterPanel());
  getNegotiationBarterClear()?.addEventListener('click', () => {
    state.negotiation.barterSelectedCodes = [];
    renderHumanNegotiation();
  });
  getNegotiationBarterConfirm()?.addEventListener('click', () => submitHumanNegotiation('barter'));
  getNegotiationBarterStage()?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mini-type="property"][data-mini-key]');
    if (!button) return;
    toggleNegotiationBarterSelection(button.dataset.miniKey || '');
  });
  getNegotiationCounterButton()?.addEventListener('click', () => submitHumanNegotiation('counter'));
  getNegotiationRefuse()?.addEventListener('click', () => submitHumanNegotiation('refuse'));

  document.addEventListener('keydown', (event) => {
    const active = document.activeElement;
    const tag = active?.tagName || '';
    if (active?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (tutorialRequiresStrictButtonInteraction()) {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        return;
      }
    }

    if (maybeAdvanceTutorialFromKeyboard(event)) {
      return;
    }

    if (event.code === 'Escape' && !event.repeat) {
      if (!getNegotiationOverlay()?.classList.contains('is-hidden')) {
        event.preventDefault();
        submitHumanNegotiation('refuse');
        return;
      }
      if (!getSetupAiEditorOverlay()?.classList.contains('is-hidden')) {
        event.preventDefault();
        closeSetupAiEditor();
        return;
      }
      if (!getSettingsOverlay()?.classList.contains('is-hidden')) {
        event.preventDefault();
        closeSettingsOverlay();
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

  byId('game-action-log')?.addEventListener('click', () => {
    if (currentLogMode() !== 'global') return;
    state.view.actionFeedExpanded = !state.view.actionFeedExpanded;
    renderActionFeed();
  });

  byId('preview-settings-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('preview-settings-button', { stepId: tutorialCurrentStep()?.id || '' });
    openSettingsOverlay();
  });
  byId('preview-home-button')?.addEventListener('click', async () => {
    maybeAdvanceTutorialFromButtonClick('preview-home-button', { stepId: tutorialCurrentStep()?.id || '' });
    await autoSaveAndReturnHome();
  });
  byId('preview-load-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('preview-load-button', { stepId: tutorialCurrentStep()?.id || '' });
    saveBrowser?.browseCompatibleSaves().catch(() => {});
  });
  byId('preview-save-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('preview-save-button', { stepId: tutorialCurrentStep()?.id || '' });
    saveCurrentGame().catch(() => {});
  });
  byId('preview-report-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('preview-report-button', { stepId: tutorialCurrentStep()?.id || '' });
    openReportOverlay();
  });
  byId('preview-robot-ai-button')?.addEventListener('click', () => {
    maybeAdvanceTutorialFromButtonClick('preview-robot-ai-button', { stepId: tutorialCurrentStep()?.id || '' });
    openSetupAiEditor(activeSetupEditorRobotIndex());
  });
  byId('settings-close-button')?.addEventListener('click', () => {
    closeSettingsOverlay();
  });
  byId('report-close-button')?.addEventListener('click', () => {
    closeReportOverlay();
  });
  byId('setup-ai-editor-close-button')?.addEventListener('click', () => {
    closeSetupAiEditor();
  });
  byId('setup-ai-editor-disable-button')?.addEventListener('click', () => {
    deactivateSetupAiAdvanced();
  });
  getSetupAiEditorOverlay()?.addEventListener('click', (event) => {
    if (event.target === getSetupAiEditorOverlay()) {
      closeSetupAiEditor();
    }
  });
  getSettingsOverlay()?.addEventListener('click', (event) => {
    if (event.target === getSettingsOverlay()) {
      closeSettingsOverlay();
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
    state.settings.cpuSpeed = Number(event.target.value || 5);
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
  [getSettingsTradeLockBuyOffInput(), getSettingsTradeLockBuyOnInput()].forEach((input) => {
    input?.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      state.settings.tradeLockBuy = event.target.value === 'on';
      renderSettingsOverlay();
    });
  });
  [getSettingsTradeLockSellOffInput(), getSettingsTradeLockSellOnInput()].forEach((input) => {
    input?.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      state.settings.tradeLockSell = event.target.value === 'on';
      renderSettingsOverlay();
    });
  });

  byId('preview-rival-list')?.addEventListener('click', async (event) => {
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
      if (mini.dataset.miniType === 'property') {
        const player = playerById(mini.dataset.playerId);
        const card = getPropertyCard(mini.dataset.miniKey);
        if (player?.is_human && player.property_codes?.includes(card?.code || '')) {
          renderRivals();
          if (card?.mortgaged) {
            await maybeOpenHumanMortgagedPropertyRedeem(player, card.code);
          } else {
            await maybeOpenHumanOwnedPropertyMortgage(player, card.code);
          }
          return;
        }
        openPropertyInspector(mini.dataset.miniKey, { x: event.clientX, y: event.clientY });
      }
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
  window.addEventListener('mousemove', updateTutorialAuthoringManipulation);
  window.addEventListener('mouseup', (event) => {
    endDrag(event).catch(() => {});
  });
  window.addEventListener('mouseup', () => {
    endTutorialAuthoringManipulation();
    restoreTutorialAuthoringAutosaveStatus();
  });
  layer?.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('resize', () => {
    renderMap().catch(() => {});
    const plot = getPlotDiv();
    if (plot && window.Plotly?.Plots?.resize) {
      window.Plotly.Plots.resize(plot);
    }
    scheduleMiniHandLayout();
    renderTutorialAuthoring();
    queueReportTrendLayoutSync();
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
    renderTutorialAuthoring();
  } catch (_error) {
    window.alert('Nao foi possivel carregar a tela inicial do jogo.');
  }
});
