const AI_ANALYSIS_GROUPS = [
  {
    id: 'negotiation',
    label: 'Negociacao',
    fields: [
      { key: 'buy_openness', label: 'Compra', min: 0, max: 1, step: 0.01 },
      { key: 'sell_openness', label: 'Venda', min: 0, max: 1, step: 0.01 },
      { key: 'premium_tolerance', label: 'Agio', min: 0, max: 1, step: 0.01 },
      { key: 'discount_tolerance', label: 'Desagio', min: 0, max: 1, step: 0.01 },
      { key: 'strategic_lock', label: 'Apego estrategico', min: 0, max: 1, step: 0.01 },
      { key: 'desperation_discount', label: 'Desespero por caixa', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: 'vision',
    label: 'Visao',
    fields: [
      { key: 'weight_port', label: 'Portos', min: 0, max: 1, step: 0.01 },
      { key: 'weight_permission', label: 'Permissoes', min: 0, max: 1, step: 0.01 },
      { key: 'weight_toll', label: 'Pedagios', min: 0, max: 1, step: 0.01 },
      { key: 'weight_monopoly', label: 'Monopolio', min: 0, max: 1, step: 0.01 },
      { key: 'weight_origin_bonus', label: 'Origem', min: 0, max: 1, step: 0.01 },
      { key: 'planning_horizon_turns', label: 'Horizonte', min: 0, max: 12, step: 1 },
    ],
  },
  {
    id: 'personality',
    label: 'Personalidade',
    fields: [
      { key: 'cash_reserve_ratio', label: 'Reserva de caixa', min: 0, max: 0.8, step: 0.01 },
      { key: 'risk_tolerance', label: 'Risco', min: 0, max: 1, step: 0.01 },
      { key: 'impulsiveness', label: 'Impulso', min: 0, max: 1, step: 0.01 },
      { key: 'coupon_patience', label: 'Paciencia com cupom', min: 0, max: 1, step: 0.01 },
      { key: 'asset_attachment', label: 'Apego a ativo', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: 'skill',
    label: 'Skill',
    fields: [
      { key: 'foresight', label: 'Previsao', min: 0, max: 1, step: 0.01 },
      { key: 'evaluation_noise', label: 'Ruido', min: 0, max: 0.3, step: 0.01 },
      { key: 'liquidity_discipline', label: 'Disciplina de caixa', min: 0, max: 1, step: 0.01 },
      { key: 'combo_awareness', label: 'Leitura de combo', min: 0, max: 1, step: 0.01 },
      { key: 'timing_quality', label: 'Timing', min: 0, max: 1, step: 0.01 },
    ],
  },
];

const AI_ANALYSIS_STATUS = {
  vivo: { label: 'Vivo', className: 'is-vivo' },
  meio_vivo: { label: 'Meio vivo', className: 'is-meio-vivo' },
  morto: { label: 'Morto', className: 'is-morto' },
};

const AI_ANALYSIS_PROFILE_ORDER = [
  'legacy_open',
  'balanced_trader',
  'open_profile',
  'closed_profile',
  'port_sprinter',
  'cargo_planner',
  'toll_broker',
  'monopoly_hunter',
];

const AI_SLIDER_ANALYSIS = [
  {
    key: 'negotiation.buy_openness',
    group: 'negotiation',
    slider: 'Compra',
    equation: 'agressividade do comprador = 0,28 + 0,22*compra + 0,12*risco + 0,08*impulso',
    effect: 'Aumenta a vontade do robo de comprar ativo de outro jogador e ajuda a subir o teto da oferta.',
    usedIn: 'Negociacao robo x robo; robo comprando do humano.',
    status: 'vivo',
  },
  {
    key: 'negotiation.sell_openness',
    group: 'negotiation',
    slider: 'Venda',
    equation: 'flexibilidade do vendedor = 0,18 + 0,22*venda + 0,06*risco + 0,10*desespero_por_caixa',
    effect: 'Quanto maior, mais o vendedor abre espaco para conceder e baixar a exigencia.',
    usedIn: 'Negociacao robo x robo; humano comprando do robo.',
    status: 'vivo',
  },
  {
    key: 'negotiation.premium_tolerance',
    group: 'negotiation',
    slider: 'Agio',
    equation: 'Hoje nao entra em buyerMax nem em sellerMin; so participa da deteccao de fechamento extremo quando combinado com compra muito baixa.',
    effect: 'No estado atual, quase nao gera agio real; serve mais como marcador de mercado duro.',
    usedIn: 'Flags de bloqueio do comprador.',
    status: 'meio_vivo',
  },
  {
    key: 'negotiation.discount_tolerance',
    group: 'negotiation',
    slider: 'Desagio',
    equation: 'Hoje nao entra no preco final; so participa da deteccao de fechamento extremo do vendedor quando combinado com venda muito baixa e apego alto.',
    effect: 'No estado atual, quase nao gera desagio real; ajuda apenas a sinalizar mercado travado.',
    usedIn: 'Flags de bloqueio do vendedor.',
    status: 'meio_vivo',
  },
  {
    key: 'negotiation.strategic_lock',
    group: 'negotiation',
    slider: 'Apego estrategico',
    equation: 'apego do vendedor = 0,16 + 0,12*apego_a_ativo + 0,16*apego_estrategico + bonus_de_monopolio',
    effect: 'Faz o robo tratar ativos-chave como pecas que exigem premio maior para sair da mao dele.',
    usedIn: 'Negociacao robo x robo; humano comprando do robo.',
    status: 'vivo',
  },
  {
    key: 'negotiation.desperation_discount',
    group: 'negotiation',
    slider: 'Desespero por caixa',
    equation: 'flexibilidade do vendedor = 0,18 + 0,22*venda + 0,06*risco + 0,10*desespero_por_caixa',
    effect: 'Quanto maior, mais o robo cede para transformar ativo em caixa.',
    usedIn: 'Negociacao robo x robo; humano comprando do robo.',
    status: 'vivo',
  },
  {
    key: 'vision.weight_port',
    group: 'vision',
    slider: 'Portos',
    equation: 'score_porto += 0,62*peso_portos; hipoteca/resgate de porto usam esse peso como valor estrategico.',
    effect: 'Empurra a companhia para investir, proteger e resgatar portos.',
    usedIn: 'Compra de porto; hipoteca; resgate.',
    status: 'vivo',
  },
  {
    key: 'vision.weight_permission',
    group: 'vision',
    slider: 'Permissoes',
    equation: 'score_permissao += 0,72*peso_permissoes; porto ganha sinergia com permissoes; escolha de carga soma 6*peso_permissoes.',
    effect: 'Aumenta a atracao por ampliar cobertura de cargas e melhora a leitura do valor de uma permissao.',
    usedIn: 'Compra de permissao; compra de porto; escolha da permissao ativa.',
    status: 'vivo',
  },
  {
    key: 'vision.weight_toll',
    group: 'vision',
    slider: 'Pedagios',
    equation: 'score_pedagio += 0,86*peso_pedagios; reserva e cupons ligados a pedagio tambem usam esse peso.',
    effect: 'Faz o robo aceitar investir mais em renda de longo prazo via pedagios.',
    usedIn: 'Compra de pedagio; cupons de pedagio/atalho; hipoteca; resgate.',
    status: 'vivo',
  },
  {
    key: 'vision.weight_monopoly',
    group: 'vision',
    slider: 'Monopolio',
    equation: 'score_porto += peso_monopolio * bonus_monopolio; protecao de monopolio entra em hipoteca e resgate.',
    effect: 'Aumenta o valor das pecas que aproximam ou protegem um monopolio.',
    usedIn: 'Compra de porto; hipoteca; resgate.',
    status: 'vivo',
  },
  {
    key: 'vision.weight_origin_bonus',
    group: 'vision',
    slider: 'Origem',
    equation: 'score_porto += peso_origem * bonus_origem; escolha de permissao na origem usa peso_origem no frete projetado.',
    effect: 'Valoriza controlar a origem e explorar multiplicadores de frete.',
    usedIn: 'Compra de porto; escolha da permissao ativa.',
    status: 'vivo',
  },
  {
    key: 'vision.planning_horizon_turns',
    group: 'vision',
    slider: 'Horizonte',
    equation: 'horizonte_normalizado = horizonte/10; reserva += 0,26*horizonte; score_pedagio += 0,34*horizonte*peso_pedagios',
    effect: 'Quanto maior o horizonte, mais o robo aceita segurar caixa e investir em retorno demorado.',
    usedIn: 'Reserva de caixa; compra de pedagio.',
    status: 'vivo',
  },
  {
    key: 'personality.cash_reserve_ratio',
    group: 'personality',
    slider: 'Reserva de caixa',
    equation: 'multiplicador_reserva = 0,18 + 1,15*reserva + 0,26*horizonte + 0,24*disciplina + ajustes',
    effect: 'Faz o robo exigir mais caixa livre antes de comprar, usar cupom ou resgatar ativo.',
    usedIn: 'Reserva de caixa; compra; cupons; resgate.',
    status: 'vivo',
  },
  {
    key: 'personality.risk_tolerance',
    group: 'personality',
    slider: 'Risco',
    equation: 'compra e negociacao recebem bonus de risco; agressividade/flexibilidade usam 0,12*risco e 0,06*risco.',
    effect: 'Aumenta a exposicao do robo, tanto em investimento quanto em negociacao.',
    usedIn: 'Compra; negociacao; cupons; escolha de permissao.',
    status: 'vivo',
  },
  {
    key: 'personality.impulsiveness',
    group: 'personality',
    slider: 'Impulso',
    equation: 'agressividade do comprador += 0,08*impulso ou 0,10*impulso; compra tambem ganha 0,08*impulso.',
    effect: 'Faz o robo reagir mais rapido a oportunidades e segurar menos a permissao atual.',
    usedIn: 'Compra; negociacao; cupons; escolha da permissao ativa.',
    status: 'vivo',
  },
  {
    key: 'personality.coupon_patience',
    group: 'personality',
    slider: 'Paciencia com cupom',
    equation: 'threshold_do_cupom = base + 0,12 a 0,16 * paciencia, conforme o tipo do cupom.',
    effect: 'Quanto maior, mais o robo segura cupons esperando um momento melhor.',
    usedIn: 'Uso de cupons.',
    status: 'vivo',
  },
  {
    key: 'personality.asset_attachment',
    group: 'personality',
    slider: 'Apego a ativo',
    equation: 'entra no apego do vendedor, no bonus de manter a permissao atual e no valor estrategico de hipoteca/resgate.',
    effect: 'Faz o robo defender mais o que ja possui, especialmente pecas importantes.',
    usedIn: 'Negociacao; escolha da permissao ativa; hipoteca; resgate.',
    status: 'vivo',
  },
  {
    key: 'skill.foresight',
    group: 'skill',
    slider: 'Previsao',
    equation: 'score de compra e de permissao recebe +0,08*previsao; escolha de carga sem origem usa +0,08*previsao no frete.',
    effect: 'Melhora a leitura do retorno futuro e do valor de ampliar a companhia.',
    usedIn: 'Compra; compra de permissao; escolha da permissao ativa.',
    status: 'vivo',
  },
  {
    key: 'skill.evaluation_noise',
    group: 'skill',
    slider: 'Ruido',
    equation: 'Nao entra em nenhuma formula do engine atual.',
    effect: 'Hoje nao muda o comportamento do robo; e um campo pronto, mas sem efeito real.',
    usedIn: 'Apenas presets e UI.',
    status: 'morto',
  },
  {
    key: 'skill.liquidity_discipline',
    group: 'skill',
    slider: 'Disciplina de caixa',
    equation: 'multiplicador_reserva += 0,24*disciplina_de_caixa',
    effect: 'Quanto maior, mais o robo se protege contra sufoco financeiro.',
    usedIn: 'Reserva de caixa; por tabela influencia compra, cupons e resgate.',
    status: 'vivo',
  },
  {
    key: 'skill.combo_awareness',
    group: 'skill',
    slider: 'Leitura de combo',
    equation: 'compra de ativo ganha +0,16*combo; permissao nova usa +0,14*combo na melhora de frete.',
    effect: 'Faz o robo enxergar melhor sinergias entre porto, permissao, pedagio e monopolio.',
    usedIn: 'Compra; compra de permissao; escolha da permissao ativa.',
    status: 'vivo',
  },
  {
    key: 'skill.timing_quality',
    group: 'skill',
    slider: 'Timing',
    equation: 'Nao entra em nenhuma formula do engine atual.',
    effect: 'Hoje nao muda compra, venda, cupom nem resgate; e so um campo preparado para futuro uso.',
    usedIn: 'Apenas presets e UI.',
    status: 'morto',
  },
];

const AI_METADATA_ANALYSIS = [
  {
    field: 'market.dynamic_pricing',
    equation: 'Se verdadeiro, troca a negociacao legada por faixas dinamicas e transcript em fases.',
    effect: 'Liga a negociacao dinamica.',
    status: 'vivo',
  },
  {
    field: 'market.human_negotiation_enabled',
    equation: 'Se falso, volta para o fluxo legado quando houver humano.',
    effect: 'Liga ou desliga a negociacao dinamica com usuario.',
    status: 'vivo',
  },
  {
    field: 'negotiation.buy_blocked',
    equation: 'Se >= 0,5, o comprador ja entra travado e a negociacao retorna bloqueada.',
    effect: 'Fecha o mercado do lado comprador.',
    status: 'vivo',
  },
  {
    field: 'negotiation.sell_blocked',
    equation: 'Se >= 0,5, o vendedor ja entra travado e a negociacao retorna bloqueada.',
    effect: 'Fecha o mercado do lado vendedor.',
    status: 'vivo',
  },
  {
    field: 'negotiation.trade_locked',
    equation: 'Se >= 0,5, o motor considera o ativo fora de negociacao nesta configuracao.',
    effect: 'Bloqueio duro de compra e venda.',
    status: 'vivo',
  },
  {
    field: 'negotiation.force_buy',
    equation: 'Hoje a flag e lida, mas nunca entra nas decisoes finais.',
    effect: 'Nenhum efeito real no engine atual.',
    status: 'morto',
  },
  {
    field: 'negotiation.force_sell',
    equation: 'Hoje a flag e lida, mas nunca entra nas decisoes finais.',
    effect: 'Nenhum efeito real no engine atual.',
    status: 'morto',
  },
  {
    field: 'negotiation.trade_forced',
    equation: 'Hoje a flag e lida, mas nunca entra nas decisoes finais.',
    effect: 'Nenhum efeito real no engine atual.',
    status: 'morto',
  },
  {
    field: 'market.negotiation_enabled',
    equation: 'Existe nos regimes de mercado, mas nao e consultado pelo motor decisorio.',
    effect: 'Hoje e so metadado.',
    status: 'morto',
  },
  {
    field: 'market.negotiation_phases',
    equation: 'Descreve as fases esperadas, mas o fluxo real nao consulta esse array.',
    effect: 'Hoje e so documentacao de intencao.',
    status: 'morto',
  },
  {
    field: 'market.default_markup_mode',
    equation: 'Nome do modo de precificacao, sem leitura real no engine atual.',
    effect: 'Hoje nao muda nenhum preco.',
    status: 'morto',
  },
];

const AI_ANALYSIS_STATE = {
  filter: 'all',
  profileId: 'balanced_trader',
};

const AI_FIELD_META = Object.fromEntries(
  AI_ANALYSIS_GROUPS.flatMap((group) => group.fields.map((field) => [`${group.id}.${field.key}`, { ...field, group: group.id }]))
);

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function aiProfilesApi() {
  return window.RdMAiProfiles || null;
}

function aiEngineApi() {
  return window.RdMAiPolicyEngine || null;
}

function statusBadge(status) {
  const meta = AI_ANALYSIS_STATUS[status] || AI_ANALYSIS_STATUS.morto;
  return `<span class="ai-analysis-status ${meta.className}">${meta.label}</span>`;
}

function formatValue(field, rawValue) {
  const value = Number(rawValue || 0);
  if (field.step >= 1) return String(Math.round(value));
  return value.toFixed(2);
}

function percentFill(field, rawValue) {
  const value = Number(rawValue || 0);
  const min = Number(field.min || 0);
  const max = Number(field.max || 1);
  if (max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function getArchetypeIds() {
  const api = aiProfilesApi();
  if (!api?.archetypes) return [];
  const existing = Object.keys(api.archetypes);
  const ordered = AI_ANALYSIS_PROFILE_ORDER.filter((id) => existing.includes(id));
  return [...ordered, ...existing.filter((id) => !ordered.includes(id))];
}

function getProfile(archetypeId) {
  const api = aiProfilesApi();
  if (!api?.buildProfile) return null;
  return api.buildProfile({ archetypeId });
}

function renderSummary() {
  const target = byId('analysis-summary');
  if (!target) return;
  const total = AI_SLIDER_ANALYSIS.length;
  const alive = AI_SLIDER_ANALYSIS.filter((entry) => entry.status === 'vivo').length;
  const partial = AI_SLIDER_ANALYSIS.filter((entry) => entry.status === 'meio_vivo').length;
  const dead = AI_SLIDER_ANALYSIS.filter((entry) => entry.status === 'morto').length;
  target.innerHTML = [
    { value: total, label: 'sliders auditados' },
    { value: alive, label: 'sliders vivos' },
    { value: partial, label: 'sliders meio vivos' },
    { value: dead, label: 'sliders mortos' },
  ].map((item) => `
    <article class="ai-analysis-summary-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </article>
  `).join('');
}

function renderFilters() {
  const target = byId('analysis-filter-bar');
  if (!target) return;
  const options = [
    { id: 'all', label: 'Todos' },
    ...AI_ANALYSIS_GROUPS.map((group) => ({ id: group.id, label: group.label })),
  ];
  target.innerHTML = options.map((option) => `
    <button type="button" class="ai-analysis-filter-button${AI_ANALYSIS_STATE.filter === option.id ? ' is-active' : ''}" data-analysis-filter="${escapeHtml(option.id)}">
      ${escapeHtml(option.label)}
    </button>
  `).join('');
  target.querySelectorAll('[data-analysis-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      AI_ANALYSIS_STATE.filter = button.dataset.analysisFilter || 'all';
      renderFilters();
      renderSliderTable();
    });
  });
}

function renderSliderTable() {
  const target = byId('analysis-slider-table');
  if (!target) return;
  const rows = AI_SLIDER_ANALYSIS.filter((entry) => AI_ANALYSIS_STATE.filter === 'all' || entry.group === AI_ANALYSIS_STATE.filter);
  target.innerHTML = rows.map((entry) => {
    const groupLabel = AI_ANALYSIS_GROUPS.find((group) => group.id === entry.group)?.label || entry.group;
    return `
      <tr>
        <td>
          <div class="ai-analysis-slider-name">
            <span>${escapeHtml(groupLabel)}</span>
            <strong>${escapeHtml(entry.slider)}</strong>
          </div>
        </td>
        <td>${escapeHtml(entry.equation)}</td>
        <td>${escapeHtml(entry.effect)}</td>
        <td>${escapeHtml(entry.usedIn)}</td>
        <td>${statusBadge(entry.status)}</td>
      </tr>
    `;
  }).join('');
}

function renderProfilePicker() {
  const target = byId('analysis-profile-picker');
  if (!target) return;
  const api = aiProfilesApi();
  const ids = getArchetypeIds();
  target.innerHTML = ids.map((id) => {
    const archetype = api?.archetypes?.[id];
    if (!archetype) return '';
    return `
      <button type="button" class="ai-analysis-profile-button${AI_ANALYSIS_STATE.profileId === id ? ' is-active' : ''}" data-analysis-profile="${escapeHtml(id)}">
        ${escapeHtml(archetype.label || id)}
      </button>
    `;
  }).join('');
  target.querySelectorAll('[data-analysis-profile]').forEach((button) => {
    button.addEventListener('click', () => {
      AI_ANALYSIS_STATE.profileId = button.dataset.analysisProfile || 'balanced_trader';
      renderProfilePicker();
      renderProfileInspector();
    });
  });
}

function renderProfileInspector() {
  const copyTarget = byId('analysis-profile-copy');
  const groupsTarget = byId('analysis-profile-groups');
  const api = aiProfilesApi();
  if (!copyTarget || !groupsTarget || !api?.archetypes) return;
  const archetype = api.archetypes[AI_ANALYSIS_STATE.profileId] || api.archetypes.legacy_open;
  const profile = getProfile(AI_ANALYSIS_STATE.profileId);
  copyTarget.textContent = archetype?.description || 'Perfil sem descricao.';
  groupsTarget.innerHTML = AI_ANALYSIS_GROUPS.map((group) => {
    const values = profile?.[group.id] || {};
    const rows = group.fields.map((field) => {
      const key = `${group.id}.${field.key}`;
      const detail = AI_SLIDER_ANALYSIS.find((entry) => entry.key === key) || { status: 'morto' };
      const fill = percentFill(field, values[field.key]);
      return `
        <div class="ai-analysis-meter-row">
          <div class="ai-analysis-meter-head">
            <span>${escapeHtml(field.label)} ${statusBadge(detail.status)}</span>
            <strong>${escapeHtml(formatValue(field, values[field.key]))}</strong>
          </div>
          <div class="ai-analysis-meter-track">
            <div class="ai-analysis-meter-fill" style="width:${fill}%"></div>
          </div>
        </div>
      `;
    }).join('');
    return `
      <article class="ai-analysis-group-card">
        <h3>${escapeHtml(group.label)}</h3>
        <div class="ai-analysis-meter-list">${rows}</div>
      </article>
    `;
  }).join('');
}

function renderMetadataTable() {
  const target = byId('analysis-metadata-table');
  if (!target) return;
  target.innerHTML = AI_METADATA_ANALYSIS.map((entry) => `
    <tr>
      <td><strong>${escapeHtml(entry.field)}</strong></td>
      <td>${escapeHtml(entry.equation)}</td>
      <td>${escapeHtml(entry.effect)}</td>
      <td>${statusBadge(entry.status)}</td>
    </tr>
  `).join('');
}

function renderFallback(message) {
  const sliderTarget = byId('analysis-slider-table');
  const metadataTarget = byId('analysis-metadata-table');
  const summaryTarget = byId('analysis-summary');
  const profilePicker = byId('analysis-profile-picker');
  const profileCopy = byId('analysis-profile-copy');
  const profileGroups = byId('analysis-profile-groups');
  if (summaryTarget) {
    summaryTarget.innerHTML = `<article class="ai-analysis-summary-card"><span>Status</span><strong>Falha</strong></article>`;
  }
  if (sliderTarget) {
    sliderTarget.innerHTML = `<tr><td colspan="5" class="ai-analysis-empty">${escapeHtml(message)}</td></tr>`;
  }
  if (metadataTarget) {
    metadataTarget.innerHTML = `<tr><td colspan="4" class="ai-analysis-empty">${escapeHtml(message)}</td></tr>`;
  }
  if (profilePicker) profilePicker.innerHTML = '';
  if (profileCopy) profileCopy.textContent = message;
  if (profileGroups) profileGroups.innerHTML = '';
}

function initAiAnalysisUi() {
  const profiles = aiProfilesApi();
  const engine = aiEngineApi();
  if (!profiles || !engine) {
    renderFallback('Nao foi possivel carregar os dados da IA. Recarregue a pagina com Ctrl+F5.');
    return;
  }
  renderSummary();
  renderFilters();
  renderSliderTable();
  renderProfilePicker();
  renderProfileInspector();
  renderMetadataTable();
}

document.addEventListener('DOMContentLoaded', initAiAnalysisUi);
