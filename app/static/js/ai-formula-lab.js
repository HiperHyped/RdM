(function initAiFormulaLab(window) {
  const profilesApi = () => window.RdMAiProfiles || null;
  const engineApi = () => window.RdMAiPolicyEngine || null;

  const STATUS_META = {
    vivo: { label: 'Vivo', className: 'is-vivo' },
    meio_vivo: { label: 'Meio vivo', className: 'is-meio-vivo' },
    morto: { label: 'Morto', className: 'is-morto' },
  };

  const GROUP_LABELS = {
    negotiation: 'Negociacao',
    vision: 'Visao',
    personality: 'Personalidade',
    skill: 'Skill',
  };

  const PROFILE_FIELD_DEFS = {
    'negotiation.buy_openness': { label: 'Compra', group: 'negotiation', min: 0, max: 1, step: 0.01, equation: '0,22 x compra na agressividade do comprador.', effect: 'Aumenta a disposicao para comprar ativo de outro dono.', status: 'vivo' },
    'negotiation.sell_openness': { label: 'Venda', group: 'negotiation', min: 0, max: 1, step: 0.01, equation: '0,22 x venda na flexibilidade do vendedor.', effect: 'Facilita concessoes na venda.', status: 'vivo' },
    'negotiation.premium_tolerance': { label: 'Agio', group: 'negotiation', min: 0, max: 1, step: 0.01, equation: 'Hoje quase nao entra no preco final.', effect: 'Parametro preparado, mas subutilizado.', status: 'meio_vivo' },
    'negotiation.discount_tolerance': { label: 'Desagio', group: 'negotiation', min: 0, max: 1, step: 0.01, equation: 'Hoje quase nao entra no preco final.', effect: 'Parametro preparado, mas subutilizado.', status: 'meio_vivo' },
    'negotiation.strategic_lock': { label: 'Apego estrategico', group: 'negotiation', min: 0, max: 1, step: 0.01, equation: '0,16 x apego estrategico no apego do vendedor.', effect: 'Protege pecas importantes.', status: 'vivo' },
    'negotiation.desperation_discount': { label: 'Desespero por caixa', group: 'negotiation', min: 0, max: 1, step: 0.01, equation: '0,10 x desespero na flexibilidade do vendedor.', effect: 'Faz vender mais facil quando o caixa aperta.', status: 'vivo' },
    'negotiation.buy_blocked': { label: 'Compra bloqueada', group: 'negotiation', min: 0, max: 1, step: 1, type: 'toggle', equation: 'Bloqueio duro antes da negociacao.', effect: 'Impede o robo de comprar de outro jogador.', status: 'vivo' },
    'negotiation.sell_blocked': { label: 'Venda bloqueada', group: 'negotiation', min: 0, max: 1, step: 1, type: 'toggle', equation: 'Bloqueio duro antes da negociacao.', effect: 'Impede o robo de vender a outro jogador.', status: 'vivo' },
    'negotiation.trade_locked': { label: 'Mercado travado', group: 'negotiation', min: 0, max: 1, step: 1, type: 'toggle', equation: 'Bloqueio duro de compra e venda.', effect: 'Trava a negociacao desse lado.', status: 'vivo' },
    'vision.weight_port': { label: 'Portos', group: 'vision', min: 0, max: 1, step: 0.01, equation: '0,62 x peso de portos no score do porto.', effect: 'Faz o robo priorizar portos.', status: 'vivo' },
    'vision.weight_permission': { label: 'Permissoes', group: 'vision', min: 0, max: 1, step: 0.01, equation: '0,72 x peso de permissoes no score da permissao.', effect: 'Faz o robo ampliar cobertura de cargas.', status: 'vivo' },
    'vision.weight_toll': { label: 'Pedagios', group: 'vision', min: 0, max: 1, step: 0.01, equation: '0,86 x peso de pedagios no score do pedagio.', effect: 'Faz o robo investir em renda recorrente.', status: 'vivo' },
    'vision.weight_monopoly': { label: 'Monopolio', group: 'vision', min: 0, max: 1, step: 0.01, equation: 'Multiplica o bonus de monopolio no porto.', effect: 'Valoriza fechar ou proteger regioes.', status: 'vivo' },
    'vision.weight_origin_bonus': { label: 'Origem', group: 'vision', min: 0, max: 1, step: 0.01, equation: 'Pesa o bonus da origem em portos e permissoes.', effect: 'Valoriza porto de partida proprio.', status: 'vivo' },
    'vision.planning_horizon_turns': { label: 'Horizonte', group: 'vision', min: 0, max: 12, step: 1, equation: 'Horizonte/10 entra na reserva e no score de pedagio.', effect: 'Mede quao longe o robo olha.', status: 'vivo' },
    'personality.cash_reserve_ratio': { label: 'Reserva de caixa', group: 'personality', min: 0, max: 0.8, step: 0.01, equation: '1,15 x reserva na formula de caixa minimo.', effect: 'Faz o robo guardar mais caixa.', status: 'vivo' },
    'personality.risk_tolerance': { label: 'Risco', group: 'personality', min: 0, max: 1, step: 0.01, equation: 'Entra em compra, cupom e negociacao.', effect: 'Aumenta a exposicao do robo.', status: 'vivo' },
    'personality.impulsiveness': { label: 'Impulso', group: 'personality', min: 0, max: 1, step: 0.01, equation: 'Entra na compra e na agressividade.', effect: 'Faz reagir mais rapido.', status: 'vivo' },
    'personality.coupon_patience': { label: 'Paciencia com cupom', group: 'personality', min: 0, max: 1, step: 0.01, equation: 'Sobe o limiar de uso do cupom.', effect: 'Faz guardar cupom para depois.', status: 'vivo' },
    'personality.asset_attachment': { label: 'Apego a ativo', group: 'personality', min: 0, max: 1, step: 0.01, equation: 'Entra em venda, hipoteca, resgate e carga atual.', effect: 'Faz defender melhor o que ja tem.', status: 'vivo' },
    'skill.foresight': { label: 'Previsao', group: 'skill', min: 0, max: 1, step: 0.01, equation: '0,08 x previsao em compra e permissao.', effect: 'Melhora leitura de retorno futuro.', status: 'vivo' },
    'skill.evaluation_noise': { label: 'Ruido', group: 'skill', min: 0, max: 0.3, step: 0.01, equation: 'Nao entra nas formulas atuais.', effect: 'Casca vazia no engine atual.', status: 'morto' },
    'skill.liquidity_discipline': { label: 'Disciplina de caixa', group: 'skill', min: 0, max: 1, step: 0.01, equation: '0,24 x disciplina na reserva.', effect: 'Protege contra sufoco de caixa.', status: 'vivo' },
    'skill.combo_awareness': { label: 'Leitura de combo', group: 'skill', min: 0, max: 1, step: 0.01, equation: '0,16 x combo nas compras.', effect: 'Enxerga melhor sinergias.', status: 'vivo' },
    'skill.timing_quality': { label: 'Timing', group: 'skill', min: 0, max: 1, step: 0.01, equation: 'Nao entra nas formulas atuais.', effect: 'Casca vazia no engine atual.', status: 'morto' },
  };

  const SELECTS = {
    reasonProperty: [
      ['property_purchase', 'Compra generica'],
      ['origin_purchase', 'Compra de origem'],
      ['post_delivery_port_purchase', 'Compra apos entrega'],
      ['stop_toll_purchase', 'Compra ao parar em pedagio'],
    ],
    ownedReason: [
      ['owned_property_negotiation', 'Negocio generico'],
      ['stop_port_negotiation', 'Parada em porto'],
      ['stop_toll_negotiation', 'Parada em pedagio'],
      ['post_delivery_port_negotiation', 'Apos entrega'],
    ],
    propertyKind: [['port', 'Porto'], ['toll', 'Pedagio']],
    couponKind: [['free_fuel', 'Gasolina Livre'], ['free_port_stay', 'Porto Livre'], ['free_toll', 'Pedagio Livre'], ['shortcut_ignore_toll', 'Atalho'], ['reroute_same_value', 'Mudanca de rota']],
    purchasePolicy: [['always', 'Sempre'], ['random', 'Aleatorio'], ['never', 'Nunca']],
    candidateType: [['property', 'Propriedade'], ['permission', 'Permissao']],
    profilePreset: [],
  };

  const FORMULAS = [
    {
      id: 'reserve_cash',
      eyebrow: 'Reserva',
      label: 'Reserva de caixa',
      copy: 'Mostra quanto caixa o robo tenta manter livre antes de se expor.',
      status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo analisado', defaultPreset: 'balanced_trader', fields: ['personality.cash_reserve_ratio', 'vision.planning_horizon_turns', 'skill.liquidity_discipline', 'vision.weight_toll', 'personality.risk_tolerance'] }],
      inputGroups: [{ title: 'Contexto', fields: [
        { path: 'cash', label: 'Caixa atual', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 1200, format: 'money' },
        { path: 'amount', label: 'Valor em jogo', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 440, format: 'money' },
        { path: 'reason', label: 'Tipo de decisao', type: 'select', options: SELECTS.reasonProperty, defaultValue: 'property_purchase' },
      ] }],
    },
    {
      id: 'bank_property', eyebrow: 'Compra', label: 'Compra de porto ou pedagio do banco', copy: 'Abre o score completo de compra de um ativo livre.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo comprador', defaultPreset: 'balanced_trader', fields: ['vision.weight_port','vision.weight_permission','vision.weight_toll','vision.weight_monopoly','vision.weight_origin_bonus','vision.planning_horizon_turns','personality.cash_reserve_ratio','personality.risk_tolerance','personality.impulsiveness','skill.foresight','skill.combo_awareness','skill.liquidity_discipline'] }],
      inputGroups: [
        { title: 'Ativo', fields: [
          { path: 'propertyKind', label: 'Tipo do ativo', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'price', label: 'Preco', type: 'number', min: 1, max: 500000, step: 10, defaultValue: 460, format: 'money' },
          { path: 'rateFee', label: 'Frete ou cobranca base', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 80 },
          { path: 'rateMultiplier', label: 'Multiplicador', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 3 },
          { path: 'freightPotential', label: 'Frete potencial', type: 'number', min: 0, max: 10000, step: 10, defaultValue: 240, format: 'money' },
          { path: 'reason', label: 'Contexto', type: 'select', options: SELECTS.reasonProperty, defaultValue: 'property_purchase' },
          { path: 'purchasePolicy', label: 'Politica de compra', type: 'select', options: SELECTS.purchasePolicy, defaultValue: 'always' },
        ] },
        { title: 'Companhia', fields: [
          { path: 'cash', label: 'Caixa', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 1500, format: 'money' },
          { path: 'regionOwnedRatio', label: 'Fracao da regiao ja dominada', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 0.5, format: 'decimal' },
          { path: 'wouldCompleteMonopoly', label: 'Completa monopolio', type: 'toggle', defaultValue: false },
          { path: 'ownedPorts', label: 'Portos ja possuidos', type: 'number', min: 0, max: 20, step: 1, defaultValue: 3 },
          { path: 'ownedTolls', label: 'Pedagios ja possuidos', type: 'number', min: 0, max: 20, step: 1, defaultValue: 1 },
          { path: 'permissionCount', label: 'Permissoes disponiveis', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2 },
          { path: 'availablePermissionCount', label: 'Permissoes restantes na mesa', type: 'number', min: 0, max: 6, step: 1, defaultValue: 3 },
        ] },
      ],
    },
    {
      id: 'extra_permission', eyebrow: 'Compra', label: 'Compra de nova permissao', copy: 'Avalia se vale pagar por mais uma permissao depois do contrato.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo comprador', defaultPreset: 'cargo_planner', fields: ['vision.weight_permission','vision.weight_port','vision.weight_toll','personality.cash_reserve_ratio','personality.risk_tolerance','skill.foresight','skill.combo_awareness','skill.liquidity_discipline','vision.planning_horizon_turns'] }],
      inputGroups: [{ title: 'Contexto', fields: [
        { path: 'cash', label: 'Caixa', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 1500, format: 'money' },
        { path: 'extraCost', label: 'Custo da nova permissao', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 220, format: 'money' },
        { path: 'availableCount', label: 'Permissoes restantes', type: 'number', min: 0, max: 6, step: 1, defaultValue: 3 },
        { path: 'permissionCount', label: 'Permissoes ja possuidas', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2 },
        { path: 'ownedPorts', label: 'Portos possuidos', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4 },
        { path: 'ownedTolls', label: 'Pedagios possuidos', type: 'number', min: 0, max: 20, step: 1, defaultValue: 1 },
        { path: 'bestCurrentFreight', label: 'Melhor frete atual', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 180, format: 'money' },
        { path: 'bestNewPermissionFreight', label: 'Melhor frete da nova permissao', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 290, format: 'money' },
        { path: 'purchasePolicy', label: 'Politica de compra', type: 'select', options: SELECTS.purchasePolicy, defaultValue: 'always' },
      ] }],
    },
    {
      id: 'choose_permission', eyebrow: 'Escolha', label: 'Escolha da permissao ativa', copy: 'Compara ate tres permissoes e mostra por que a IA escolhe uma delas.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo analisado', defaultPreset: 'balanced_trader', fields: ['vision.weight_permission','vision.weight_origin_bonus','personality.asset_attachment','personality.impulsiveness','personality.risk_tolerance','skill.foresight','skill.combo_awareness'] }],
      inputGroups: [
        { title: 'Contexto', fields: [
          { path: 'ownsOrigin', label: 'Possui a origem', type: 'toggle', defaultValue: true },
        ] },
        { title: 'Opcao A', fields: [
          { path: 'choices.0.fee', label: 'Frete base', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 80 },
          { path: 'choices.0.multiplier', label: 'Multiplicador', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 3 },
          { path: 'choices.0.projectedFreight', label: 'Frete projetado', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 240, format: 'money' },
          { path: 'choices.0.isCurrent', label: 'Eh a permissao atual', type: 'toggle', defaultValue: true },
        ] },
        { title: 'Opcao B', fields: [
          { path: 'choices.1.fee', label: 'Frete base', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 95 },
          { path: 'choices.1.multiplier', label: 'Multiplicador', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 2 },
          { path: 'choices.1.projectedFreight', label: 'Frete projetado', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 190, format: 'money' },
          { path: 'choices.1.isCurrent', label: 'Eh a permissao atual', type: 'toggle', defaultValue: false },
        ] },
        { title: 'Opcao C', fields: [
          { path: 'choices.2.fee', label: 'Frete base', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 70 },
          { path: 'choices.2.multiplier', label: 'Multiplicador', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 4 },
          { path: 'choices.2.projectedFreight', label: 'Frete projetado', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 280, format: 'money' },
          { path: 'choices.2.isCurrent', label: 'Eh a permissao atual', type: 'toggle', defaultValue: false },
        ] },
      ],
    },
    {
      id: 'coupon_usage', eyebrow: 'Cupom', label: 'Uso de cupom', copy: 'Mostra o score e o limiar que fazem o robo usar ou guardar um cupom.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo analisado', defaultPreset: 'balanced_trader', fields: ['personality.coupon_patience','personality.impulsiveness','personality.risk_tolerance','vision.weight_toll','personality.cash_reserve_ratio','vision.planning_horizon_turns','skill.liquidity_discipline'] }],
      inputGroups: [{ title: 'Cupom', fields: [
        { path: 'cash', label: 'Caixa', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 600, format: 'money' },
        { path: 'charge', label: 'Valor economizado', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 90, format: 'money' },
        { path: 'kind', label: 'Tipo de cupom', type: 'select', options: SELECTS.couponKind, defaultValue: 'free_toll' },
        { path: 'autoUse', label: 'Uso automatico', type: 'toggle', defaultValue: true },
        { path: 'candidateCount', label: 'Rotas candidatas', type: 'number', min: 0, max: 10, step: 1, defaultValue: 2 },
        { path: 'mandatoryToll', label: 'Pedagio obrigatorio', type: 'toggle', defaultValue: true },
        { path: 'ownerPresent', label: 'Existe dono no ativo', type: 'toggle', defaultValue: true },
      ] }],
    },
    {
      id: 'mortgage', eyebrow: 'Hipoteca', label: 'Escolha do ativo para hipotecar', copy: 'Compara candidatos e mostra qual ativo a IA sacrifica primeiro.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo analisado', defaultPreset: 'balanced_trader', fields: ['vision.weight_port','vision.weight_permission','vision.weight_toll','vision.weight_monopoly','personality.asset_attachment'] }],
      inputGroups: [
        { title: 'Divida', fields: [
          { path: 'cash', label: 'Caixa', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 120, format: 'money' },
          { path: 'due', label: 'Valor devido', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 400, format: 'money' },
        ] },
        { title: 'Candidato A', fields: [
          { path: 'candidates.0.type', label: 'Tipo', type: 'select', options: SELECTS.candidateType, defaultValue: 'property' },
          { path: 'candidates.0.propertyKind', label: 'Natureza', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'candidates.0.credit', label: 'Credito da hipoteca', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 200, format: 'money' },
          { path: 'candidates.0.monopolyProtected', label: 'Protege monopolio', type: 'toggle', defaultValue: false },
          { path: 'candidates.0.remainingPermissionCount', label: 'Permissoes restantes', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2 },
        ] },
        { title: 'Candidato B', fields: [
          { path: 'candidates.1.type', label: 'Tipo', type: 'select', options: SELECTS.candidateType, defaultValue: 'property' },
          { path: 'candidates.1.propertyKind', label: 'Natureza', type: 'select', options: SELECTS.propertyKind, defaultValue: 'toll' },
          { path: 'candidates.1.credit', label: 'Credito da hipoteca', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 260, format: 'money' },
          { path: 'candidates.1.monopolyProtected', label: 'Protege monopolio', type: 'toggle', defaultValue: false },
          { path: 'candidates.1.remainingPermissionCount', label: 'Permissoes restantes', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2 },
        ] },
        { title: 'Candidato C', fields: [
          { path: 'candidates.2.type', label: 'Tipo', type: 'select', options: SELECTS.candidateType, defaultValue: 'permission' },
          { path: 'candidates.2.propertyKind', label: 'Natureza', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'candidates.2.credit', label: 'Credito da hipoteca', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 160, format: 'money' },
          { path: 'candidates.2.monopolyProtected', label: 'Protege monopolio', type: 'toggle', defaultValue: false },
          { path: 'candidates.2.remainingPermissionCount', label: 'Permissoes restantes', type: 'number', min: 0, max: 6, step: 1, defaultValue: 1 },
        ] },
      ],
    },
    {
      id: 'redeem', eyebrow: 'Resgate', label: 'Escolha do ativo para resgatar', copy: 'Mostra qual ativo hipotecado a IA tenta recuperar primeiro.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo analisado', defaultPreset: 'balanced_trader', fields: ['vision.weight_port','vision.weight_permission','vision.weight_toll','vision.weight_monopoly','personality.asset_attachment','personality.cash_reserve_ratio','vision.planning_horizon_turns','skill.liquidity_discipline','personality.risk_tolerance'] }],
      inputGroups: [
        { title: 'Caixa', fields: [{ path: 'cash', label: 'Caixa atual', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 1400, format: 'money' }] },
        { title: 'Candidato A', fields: [
          { path: 'candidates.0.type', label: 'Tipo', type: 'select', options: SELECTS.candidateType, defaultValue: 'property' },
          { path: 'candidates.0.propertyKind', label: 'Natureza', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'candidates.0.cost', label: 'Custo do resgate', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 220, format: 'money' },
          { path: 'candidates.0.monopolyProtected', label: 'Protege monopolio', type: 'toggle', defaultValue: false },
          { path: 'candidates.0.remainingPermissionCount', label: 'Permissoes restantes', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2 },
        ] },
        { title: 'Candidato B', fields: [
          { path: 'candidates.1.type', label: 'Tipo', type: 'select', options: SELECTS.candidateType, defaultValue: 'property' },
          { path: 'candidates.1.propertyKind', label: 'Natureza', type: 'select', options: SELECTS.propertyKind, defaultValue: 'toll' },
          { path: 'candidates.1.cost', label: 'Custo do resgate', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 260, format: 'money' },
          { path: 'candidates.1.monopolyProtected', label: 'Protege monopolio', type: 'toggle', defaultValue: false },
          { path: 'candidates.1.remainingPermissionCount', label: 'Permissoes restantes', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2 },
        ] },
        { title: 'Candidato C', fields: [
          { path: 'candidates.2.type', label: 'Tipo', type: 'select', options: SELECTS.candidateType, defaultValue: 'permission' },
          { path: 'candidates.2.propertyKind', label: 'Natureza', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'candidates.2.cost', label: 'Custo do resgate', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 180, format: 'money' },
          { path: 'candidates.2.monopolyProtected', label: 'Protege monopolio', type: 'toggle', defaultValue: false },
          { path: 'candidates.2.remainingPermissionCount', label: 'Permissoes restantes', type: 'number', min: 0, max: 6, step: 1, defaultValue: 1 },
        ] },
      ],
    },
    {
      id: 'robot_trade', eyebrow: 'Negociacao', label: 'Negociacao robo x robo', copy: 'Abre piso, teto, sobreposicao e preco final de uma compra entre dois robos.', status: 'vivo',
      profileSides: [
        { id: 'main', label: 'Comprador', defaultPreset: 'balanced_trader', fields: ['negotiation.buy_openness','negotiation.premium_tolerance','negotiation.buy_blocked','negotiation.trade_locked','personality.risk_tolerance','personality.impulsiveness'] },
        { id: 'secondary', label: 'Vendedor', defaultPreset: 'monopoly_hunter', fields: ['negotiation.sell_openness','negotiation.discount_tolerance','negotiation.strategic_lock','negotiation.desperation_discount','negotiation.sell_blocked','negotiation.trade_locked','personality.risk_tolerance','personality.asset_attachment'] },
      ],
      inputGroups: [
        { title: 'Ativo', fields: [
          { path: 'basePrice', label: 'Preco base', type: 'number', min: 1, max: 500000, step: 10, defaultValue: 440, format: 'money' },
          { path: 'listPrice', label: 'Preco pedido', type: 'number', min: 1, max: 500000, step: 10, defaultValue: 660, format: 'money' },
          { path: 'mortgageFloorSignal', label: 'Sinal de piso hipotecario', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 220, format: 'money' },
          { path: 'propertyKind', label: 'Tipo do ativo', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'ownerCharge', label: 'Estadia ou pedagio atual', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 60 },
          { path: 'rateFee', label: 'Frete base da rota', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 90 },
          { path: 'rateMultiplier', label: 'Multiplicador', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 3 },
          { path: 'freightPotential', label: 'Frete potencial', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 270, format: 'money' },
          { path: 'reason', label: 'Contexto', type: 'select', options: SELECTS.ownedReason, defaultValue: 'stop_port_negotiation' },
        ] },
        { title: 'Comprador', fields: [
          { path: 'buyerCash', label: 'Caixa do comprador', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 1500, format: 'money' },
          { path: 'buyerRegionBeforeRatio', label: 'Fracao da regiao antes', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 0.5, format: 'decimal' },
          { path: 'buyerRegionAfterRatio', label: 'Fracao da regiao depois', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 1, format: 'decimal' },
          { path: 'buyerWouldCompleteMonopoly', label: 'Completa monopolio', type: 'toggle', defaultValue: true },
        ] },
        { title: 'Vendedor', fields: [
          { path: 'sellerCash', label: 'Caixa do vendedor', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 320, format: 'money' },
          { path: 'sellerRegionBeforeRatio', label: 'Fracao da regiao antes', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 1, format: 'decimal' },
          { path: 'sellerRegionAfterRatio', label: 'Fracao da regiao depois', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 0.5, format: 'decimal' },
          { path: 'sellerWouldLoseMonopoly', label: 'Perde monopolio', type: 'toggle', defaultValue: true },
        ] },
      ],
    },
    {
      id: 'human_buy_from_robot', eyebrow: 'Negociacao', label: 'Humano comprando do robo', copy: 'Abre a postura do vendedor robo, o piso privado e a resposta a uma oferta humana.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo vendedor', defaultPreset: 'monopoly_hunter', fields: ['negotiation.sell_openness','negotiation.discount_tolerance','negotiation.strategic_lock','negotiation.desperation_discount','negotiation.sell_blocked','negotiation.trade_locked','personality.risk_tolerance','personality.asset_attachment'] }],
      inputGroups: [
        { title: 'Negocio', fields: [
          { path: 'basePrice', label: 'Preco base', type: 'number', min: 1, max: 500000, step: 10, defaultValue: 440, format: 'money' },
          { path: 'listPrice', label: 'Preco pedido', type: 'number', min: 1, max: 500000, step: 10, defaultValue: 660, format: 'money' },
          { path: 'mortgageFloorSignal', label: 'Sinal de piso hipotecario', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 220, format: 'money' },
          { path: 'propertyKind', label: 'Tipo do ativo', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'ownerCharge', label: 'Estadia ou pedagio atual', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 60 },
          { path: 'rateFee', label: 'Frete base', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 90 },
          { path: 'rateMultiplier', label: 'Multiplicador', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 3 },
          { path: 'freightPotential', label: 'Frete potencial', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 270, format: 'money' },
          { path: 'reason', label: 'Contexto', type: 'select', options: SELECTS.ownedReason, defaultValue: 'stop_port_negotiation' },
        ] },
        { title: 'Humano', fields: [
          { path: 'buyerCash', label: 'Caixa do humano', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 1200, format: 'money' },
          { path: 'offer', label: 'Oferta humana', type: 'number', min: 0, max: 500000, step: 1, defaultValue: 540, format: 'money' },
        ] },
        { title: 'Robo vendedor', fields: [
          { path: 'ownerCash', label: 'Caixa do vendedor', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 260, format: 'money' },
          { path: 'sellerRegionBeforeRatio', label: 'Fracao da regiao antes', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 1, format: 'decimal' },
          { path: 'sellerRegionAfterRatio', label: 'Fracao da regiao depois', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 0.5, format: 'decimal' },
          { path: 'sellerWouldLoseMonopoly', label: 'Perde monopolio', type: 'toggle', defaultValue: true },
        ] },
      ],
    },
    {
      id: 'robot_buy_from_human', eyebrow: 'Negociacao', label: 'Robo comprando do humano', copy: 'Abre a postura do comprador robo, o teto privado e a resposta a uma pedida humana.', status: 'vivo',
      profileSides: [{ id: 'main', label: 'Robo comprador', defaultPreset: 'balanced_trader', fields: ['negotiation.buy_openness','negotiation.premium_tolerance','negotiation.buy_blocked','negotiation.trade_locked','personality.risk_tolerance','personality.impulsiveness'] }],
      inputGroups: [
        { title: 'Negocio', fields: [
          { path: 'basePrice', label: 'Preco base', type: 'number', min: 1, max: 500000, step: 10, defaultValue: 440, format: 'money' },
          { path: 'listPrice', label: 'Preco pedido', type: 'number', min: 1, max: 500000, step: 10, defaultValue: 660, format: 'money' },
          { path: 'mortgageFloorSignal', label: 'Sinal de piso hipotecario', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 220, format: 'money' },
          { path: 'propertyKind', label: 'Tipo do ativo', type: 'select', options: SELECTS.propertyKind, defaultValue: 'port' },
          { path: 'ownerCharge', label: 'Estadia ou pedagio atual', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 60 },
          { path: 'rateFee', label: 'Frete base', type: 'number', min: 0, max: 5000, step: 1, defaultValue: 90 },
          { path: 'rateMultiplier', label: 'Multiplicador', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 3 },
          { path: 'freightPotential', label: 'Frete potencial', type: 'number', min: 0, max: 100000, step: 10, defaultValue: 270, format: 'money' },
          { path: 'reason', label: 'Contexto', type: 'select', options: SELECTS.ownedReason, defaultValue: 'stop_port_negotiation' },
        ] },
        { title: 'Robo comprador', fields: [
          { path: 'buyerCash', label: 'Caixa do comprador', type: 'number', min: 0, max: 500000, step: 10, defaultValue: 1200, format: 'money' },
          { path: 'buyerRegionBeforeRatio', label: 'Fracao da regiao antes', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 0.5, format: 'decimal' },
          { path: 'buyerRegionAfterRatio', label: 'Fracao da regiao depois', type: 'range', min: 0, max: 1, step: 0.01, defaultValue: 1, format: 'decimal' },
          { path: 'buyerWouldCompleteMonopoly', label: 'Completa monopolio', type: 'toggle', defaultValue: true },
        ] },
        { title: 'Humano', fields: [
          { path: 'ask', label: 'Pedida humana', type: 'number', min: 0, max: 500000, step: 1, defaultValue: 620, format: 'money' },
        ] },
      ],
    },
  ];

  const FORMULA_MAP = Object.fromEntries(FORMULAS.map((formula) => [formula.id, formula]));
  const LAB_STATE = { formulaId: 'reserve_cash', forms: {} };

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function money(value) { return Math.max(0, Math.round(num(value, 0))); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function esc(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'", '&#39;'); }
  function getByPath(source, path) { return String(path).split('.').reduce((current, part) => (current == null ? undefined : current[part]), source); }
  function setByPath(target, path, value) {
    const parts = String(path).split('.');
    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index];
      const next = parts[index + 1];
      if (cursor[part] == null) cursor[part] = /^\d+$/.test(next) ? [] : {};
      cursor = cursor[part];
    }
    cursor[parts.at(-1)] = value;
  }
  function statusMeta(status) { return STATUS_META[status] || STATUS_META.morto; }
  function statusPill(status) { const meta = statusMeta(status); return `<span class="ai-lab-pill ai-lab-status ${meta.className}">${esc(meta.label)}</span>`; }
  function groupLabel(id) { return GROUP_LABELS[id] || id; }
  function formatValue(value, format = 'decimal') {
    if (format === 'money') return `$ ${money(value).toLocaleString('pt-BR')}`;
    if (format === 'bool') return value ? 'Sim' : 'Nao';
    if (format === 'percent') return `${(num(value) * 100).toFixed(1)}%`;
    if (format === 'integer') return String(Math.round(num(value)));
    return num(value).toFixed(2);
  }
  function presetOptions() {
    const api = profilesApi();
    const archetypes = api?.archetypes || {};
    return Object.keys(archetypes).map((id) => ({ id, label: archetypes[id].label || id }));
  }
  function ensureProfileState(formulaState, side) {
    if (!formulaState.profiles[side.id]) formulaState.profiles[side.id] = { presetId: side.defaultPreset || 'balanced_trader', overrides: {} };
    return formulaState.profiles[side.id];
  }
  function ensureFormulaState(def) {
    if (!LAB_STATE.forms[def.id]) {
      const inputs = {};
      (def.inputGroups || []).forEach((group) => (group.fields || []).forEach((field) => setByPath(inputs, field.path, clone(field.defaultValue))));
      LAB_STATE.forms[def.id] = { inputs, profiles: {} };
    }
    return LAB_STATE.forms[def.id];
  }
  function buildProfile(sideState) {
    const api = profilesApi();
    const profile = clone(api.buildProfile({ archetypeId: sideState.presetId }));
    Object.entries(sideState.overrides || {}).forEach(([path, value]) => setByPath(profile, path, value));
    return profile;
  }
  function buildTableConfig(presetId) {
    return profilesApi().buildTableConfig({ presetId });
  }
  function buildAiPlayer(sideState, options = {}) {
    const tableConfig = options.tableConfig || buildTableConfig('stage6_profile_table');
    const profile = buildProfile(sideState);
    return {
      id: options.id || sideState.presetId,
      name: options.name || profile.label,
      is_human: false,
      bankrupt: false,
      purchase_policy: options.purchasePolicy || 'always',
      cash: money(options.cash || 0),
      permissions: Array.from({ length: Math.max(0, Math.round(num(options.permissionCount || 0))) }, () => ({ mortgaged: false })),
      ports_owned: Math.max(0, Math.round(num(options.ownedPorts || 0))),
      tolls_owned: Math.max(0, Math.round(num(options.ownedTolls || 0))),
      ai_archetype_id: sideState.presetId,
      ai_profile_overrides: clone(sideState.overrides || {}),
      ai_profile: profile,
      ai_profile_id: sideState.presetId,
      ai_table_config_id: tableConfig.id,
    };
  }
  function buildHumanPlayer(options = {}) { return { id: options.id || 'human', name: options.name || 'Humano', is_human: true, bankrupt: false, cash: money(options.cash || 0), purchase_policy: 'always', permissions: [] }; }
  function reserveCalc(profile, cash, amount, reason) {
    const reserveRatio = clamp(num(getByPath(profile, 'personality.cash_reserve_ratio')), 0, 0.8);
    const horizon = clamp(num(getByPath(profile, 'vision.planning_horizon_turns')) / 10, 0, 1.2);
    const discipline = clamp(num(getByPath(profile, 'skill.liquidity_discipline')), 0, 1);
    const tollWeight = num(getByPath(profile, 'vision.weight_toll'), 1);
    const risk = clamp(num(getByPath(profile, 'personality.risk_tolerance')), 0, 1);
    let multiplier = 0.18 + reserveRatio * 1.15 + horizon * 0.26 + discipline * 0.24;
    let contextAdjust = 0;
    if (reason === 'origin_purchase' || reason === 'post_delivery_port_purchase') contextAdjust -= 0.06;
    if (reason === 'stop_toll_purchase') {
      contextAdjust += 0.05;
      contextAdjust -= Math.max(0, tollWeight - 1) * 0.18;
      contextAdjust -= Math.max(0, risk - 0.55) * 0.12;
    }
    multiplier += contextAdjust;
    const raw = amount * Math.max(0.08, multiplier);
    const target = money(Math.min(cash, raw));
    return { reserveRatio, horizon, discipline, tollWeight, risk, contextAdjust, multiplier, raw, target };
  }
  function usedFieldCards(def) {
    const seen = new Set();
    return (def.profileSides || []).flatMap((side) => (side.fields || []).map((path) => {
      if (seen.has(path)) return null;
      seen.add(path);
      const meta = PROFILE_FIELD_DEFS[path];
      if (!meta) return null;
      return { label: `${groupLabel(meta.group)} · ${meta.label}`, value: statusMeta(meta.status).label, detail: `${meta.equation} ${meta.effect}` };
    })).filter(Boolean);
  }
  function addMetaBreakdown(def, breakdown) {
    breakdown.push({ title: 'Parametros desta formula', rows: usedFieldCards(def) });
    return breakdown;
  }
  function computeReserve(def, formulaState) {
    const side = ensureProfileState(formulaState, def.profileSides[0]);
    const profile = buildProfile(side);
    const inputs = formulaState.inputs;
    const cash = money(inputs.cash);
    const amount = money(inputs.amount);
    const calc = reserveCalc(profile, cash, amount, inputs.reason);
    return {
      summary: [
        { label: 'Caixa atual', value: formatValue(cash, 'money') },
        { label: 'Valor em jogo', value: formatValue(amount, 'money') },
        { label: 'Multiplicador', value: formatValue(calc.multiplier) },
        { label: 'Alvo de reserva', value: formatValue(calc.target, 'money') },
      ],
      breakdown: addMetaBreakdown(def, [
        { title: 'Componentes da formula', rows: [
          { label: 'Base fixa', value: '0,18', detail: 'Ponto de partida da reserva minima.' },
          { label: 'Reserva de caixa', value: formatValue(calc.reserveRatio), detail: `1,15 x ${formatValue(calc.reserveRatio)} = ${formatValue(calc.reserveRatio * 1.15)}` },
          { label: 'Horizonte normalizado', value: formatValue(calc.horizon), detail: `0,26 x ${formatValue(calc.horizon)} = ${formatValue(calc.horizon * 0.26)}` },
          { label: 'Disciplina de caixa', value: formatValue(calc.discipline), detail: `0,24 x ${formatValue(calc.discipline)} = ${formatValue(calc.discipline * 0.24)}` },
          { label: 'Ajuste de contexto', value: formatValue(calc.contextAdjust), detail: 'Ajuste por origem ou compra em pedagio.' },
        ] },
        { title: 'Resultado', rows: [
          { label: 'Reserva bruta', value: formatValue(calc.raw, 'money'), detail: `valor_em_jogo x max(0,08, multiplicador)` },
          { label: 'Alvo final', value: formatValue(calc.target, 'money'), detail: 'Menor entre a reserva bruta e o caixa atual.' },
        ] },
      ]),
      notes: [
        'Esta formula influencia compras, cupons e resgates.',
        'Quanto maior a reserva, menor a chance de o robo se expor.',
      ],
    };
  }
  function computeBankProperty(def, formulaState) {
    const side = ensureProfileState(formulaState, def.profileSides[0]);
    const profile = buildProfile(side);
    const i = formulaState.inputs;
    const kind = i.propertyKind;
    const price = money(i.price);
    const cash = money(i.cash);
    const cashAfter = cash - price;
    const weightPort = num(getByPath(profile, 'vision.weight_port'), 1);
    const weightPermission = num(getByPath(profile, 'vision.weight_permission'), 1);
    const weightToll = num(getByPath(profile, 'vision.weight_toll'), 1);
    const weightMonopoly = num(getByPath(profile, 'vision.weight_monopoly'), 1);
    const weightOrigin = num(getByPath(profile, 'vision.weight_origin_bonus'), 1);
    const horizon = clamp(num(getByPath(profile, 'vision.planning_horizon_turns')) / 10, 0, 1);
    const risk = clamp(num(getByPath(profile, 'personality.risk_tolerance')), 0, 1);
    const impulse = clamp(num(getByPath(profile, 'personality.impulsiveness')), 0, 1);
    const reserveRatio = clamp(num(getByPath(profile, 'personality.cash_reserve_ratio')), 0, 0.8);
    const foresight = clamp(num(getByPath(profile, 'skill.foresight')), 0, 1);
    const combo = clamp(num(getByPath(profile, 'skill.combo_awareness')), 0, 1);
    const regionOwnedRatio = clamp(num(i.regionOwnedRatio), 0, 1);
    const rateFee = Math.max(0, num(i.rateFee));
    const rateMultiplier = Math.max(1, num(i.rateMultiplier));
    const freightPotential = Math.max(0, num(i.freightPotential, rateFee * rateMultiplier));
    const yieldRatio = clamp(freightPotential / Math.max(1, price), 0, 1.35);
    const reserve = reserveCalc(profile, cash, price, i.reason);
    const reservePressure = clamp((reserve.target - cashAfter) / Math.max(1, price), 0, 1.8);
    const pricePressure = clamp(price / Math.max(1, cash), 0, 1.6);
    const ownedPorts = Math.max(0, num(i.ownedPorts));
    const ownedTolls = Math.max(0, num(i.ownedTolls));
    const permissionCount = Math.max(0, num(i.permissionCount));
    const availablePermissionCount = Math.max(0, num(i.availablePermissionCount));
    const tollFocus = Math.max(0, weightToll - 1);
    let score = 0;
    const rows = [];
    if (kind === 'port') {
      const originBonus = clamp(((rateMultiplier - 1) * 0.22) + (yieldRatio * 0.18) + ((i.reason === 'origin_purchase' || i.reason === 'post_delivery_port_purchase') ? 0.16 : 0), 0, 0.95);
      const permissionSynergy = weightPermission * clamp(Math.max(0, permissionCount - 1) / 4, 0, 1) * 0.38;
      const monopolyBonus = weightMonopoly * clamp(regionOwnedRatio * 0.42 + (i.wouldCompleteMonopoly ? 0.82 : 0), 0, 1.2);
      const excessPenalty = clamp((ownedPorts - (ownedTolls * 1.6)) / 10, 0, 0.22);
      score += weightPort * 0.62 + yieldRatio * 1.05 + weightOrigin * originBonus + permissionSynergy + monopolyBonus + combo * 0.16 - excessPenalty;
      rows.push(
        { label: 'Peso em portos', value: formatValue(weightPort * 0.62), detail: `0,62 x ${formatValue(weightPort)}` },
        { label: 'Rendimento relativo', value: formatValue(yieldRatio * 1.05), detail: `1,05 x ${formatValue(yieldRatio)}` },
        { label: 'Bonus de origem', value: formatValue(weightOrigin * originBonus), detail: `peso_origem x ${formatValue(originBonus)}` },
        { label: 'Sinergia com permissoes', value: formatValue(permissionSynergy), detail: 'Porto valoriza as permissoes que ja existem.' },
        { label: 'Bonus de monopolio', value: formatValue(monopolyBonus), detail: 'Ganha forca quando aproxima o monopolio.' },
        { label: 'Penalidade por excesso de portos', value: formatValue(-excessPenalty), detail: 'Corta score quando o portifolio ja esta pesado demais em portos.' },
      );
    } else {
      const networkBonus = clamp(((ownedPorts * 0.05) + (permissionCount * 0.04) + (freightPotential / Math.max(1, price)) * 0.26), 0, 1.05);
      const tollPenalty = clamp((ownedTolls - (ownedPorts * 1.6 + permissionCount * 0.3)) / 12, 0, 0.12);
      score += weightToll * 0.86 + yieldRatio * 1.04 + horizon * 0.34 * weightToll + networkBonus + combo * 0.16 + tollFocus * 0.22 + Math.max(0, risk - 0.45) * 0.08 - tollPenalty;
      rows.push(
        { label: 'Peso em pedagios', value: formatValue(weightToll * 0.86), detail: `0,86 x ${formatValue(weightToll)}` },
        { label: 'Rendimento relativo', value: formatValue(yieldRatio * 1.04), detail: `1,04 x ${formatValue(yieldRatio)}` },
        { label: 'Horizonte x pedagio', value: formatValue(horizon * 0.34 * weightToll), detail: 'Premia visao de longo prazo.' },
        { label: 'Valor de rede', value: formatValue(networkBonus), detail: 'Portos, permissoes e renda potencial alimentam esse bonus.' },
        { label: 'Penalidade por excesso de pedagios', value: formatValue(-tollPenalty), detail: 'Corta score se a companhia ja esta pesada em pedagios.' },
      );
    }
    score += risk * 0.18 + impulse * 0.08 + foresight * 0.08 + Math.min(0.12, availablePermissionCount * 0.015);
    const reservePenaltyWeight = kind === 'toll' ? clamp(0.82 - (tollFocus * 0.18) - (risk * 0.08), 0.42, 0.98) : 1.08;
    const pricePenaltyWeight = kind === 'toll' ? clamp(0.22 + reserveRatio * 0.16 - tollFocus * 0.06, 0.14, 0.42) : (0.30 + reserveRatio * 0.18);
    score -= reservePressure * reservePenaltyWeight + pricePressure * pricePenaltyWeight;
    const thresholdBase = kind === 'toll' ? 0.84 - tollFocus * 0.18 : 0.9;
    const threshold = thresholdBase - risk * 0.12 - impulse * 0.08 - combo * 0.08 + reserveRatio * 0.18;
    const cashFloor = Math.max(0, reserve.target - price * (kind === 'toll' ? (0.26 + risk * 0.18 + tollFocus * 0.16) : (0.18 + risk * 0.12)));
    const localShouldBuy = cash >= price && cashAfter >= cashFloor && score >= threshold;
    const tableConfig = buildTableConfig('stage6_profile_table');
    const player = buildAiPlayer(side, { cash, tableConfig, permissionCount, ownedPorts, ownedTolls, purchasePolicy: i.purchasePolicy });
    const engineDecision = engineApi().decideBuyBankProperty({ player, card: { kind, price }, price, context: { tableConfig, reason: i.reason, purchaseSignals: { propertyKind: kind, regionOwnedRatio, wouldCompleteMonopoly: !!i.wouldCompleteMonopoly, rateFee, rateMultiplier, freightPotential, portsOwned: ownedPorts, tollsOwned: ownedTolls, permissionCount, availablePermissionCount } } });
    return {
      summary: [
        { label: 'Score', value: formatValue(score) },
        { label: 'Limiar', value: formatValue(threshold) },
        { label: 'Piso de caixa', value: formatValue(cashFloor, 'money') },
        { label: 'Decisao oficial', value: engineDecision.shouldBuy ? 'Compra' : 'Nao compra' },
      ],
      breakdown: addMetaBreakdown(def, [
        { title: 'Bonus e penalidades', rows: rows.concat([
          { label: 'Risco', value: formatValue(risk * 0.18), detail: 'Robo mais agressivo compra com mais facilidade.' },
          { label: 'Impulso', value: formatValue(impulse * 0.08), detail: 'Acelera a compra.' },
          { label: 'Previsao', value: formatValue(foresight * 0.08), detail: 'Le vantagem futura do ativo.' },
          { label: 'Permissoes restantes', value: formatValue(Math.min(0.12, availablePermissionCount * 0.015)), detail: 'Evita saturacao quando ainda ha muito a expandir.' },
          { label: 'Penalidade de reserva', value: formatValue(-(reservePressure * reservePenaltyWeight)), detail: `pressao ${formatValue(reservePressure)} x peso ${formatValue(reservePenaltyWeight)}` },
          { label: 'Penalidade de preco', value: formatValue(-(pricePressure * pricePenaltyWeight)), detail: `pressao ${formatValue(pricePressure)} x peso ${formatValue(pricePenaltyWeight)}` },
        ]) },
        { title: 'Fechamento', rows: [
          { label: 'Reserva alvo', value: formatValue(reserve.target, 'money'), detail: 'Sai da formula de reserva de caixa.' },
          { label: 'Caixa apos compra', value: formatValue(cashAfter, 'money'), detail: 'Caixa atual menos preco do ativo.' },
          { label: 'Score local', value: formatValue(score), detail: 'Somatorio dos bonus menos as penalidades.' },
          { label: 'Limiar local', value: formatValue(threshold), detail: 'Patamar minimo para a compra ser aceita.' },
          { label: 'Decisao local', value: localShouldBuy ? 'Compra' : 'Nao compra', detail: 'Calculo reaberto do laboratorio.' },
        ] },
      ]),
      notes: [
        side.presetId === 'legacy_open' ? 'Perfil legado ignora o score e compra se tiver caixa.' : 'Nesta formula, a decisao final depende de score, limiar e piso de caixa.',
        kind === 'toll' && tollFocus === 0 ? 'Com a UI atual limitada a 0..1, o bonus extra de foco em pedagio nao passa de zero.' : 'O foco em pedagio ou porto altera o peso do investimento.',
      ],
    };
  }
  function computeExtraPermission(def, formulaState) {
    const side = ensureProfileState(formulaState, def.profileSides[0]);
    const profile = buildProfile(side);
    const i = formulaState.inputs;
    const cost = money(i.extraCost);
    const cash = money(i.cash);
    const cashAfter = cash - cost;
    const weightPermission = num(getByPath(profile, 'vision.weight_permission'), 1);
    const weightPort = num(getByPath(profile, 'vision.weight_port'), 1);
    const weightToll = num(getByPath(profile, 'vision.weight_toll'), 1);
    const risk = clamp(num(getByPath(profile, 'personality.risk_tolerance')), 0, 1);
    const reserveRatio = clamp(num(getByPath(profile, 'personality.cash_reserve_ratio')), 0, 0.8);
    const combo = clamp(num(getByPath(profile, 'skill.combo_awareness')), 0, 1);
    const foresight = clamp(num(getByPath(profile, 'skill.foresight')), 0, 1);
    const availableCount = Math.max(0, num(i.availableCount));
    const permissionCount = Math.max(0, num(i.permissionCount));
    const coverageRatio = clamp(permissionCount / 6, 0, 1);
    const ownedPorts = Math.max(0, num(i.ownedPorts));
    const ownedTolls = Math.max(0, num(i.ownedTolls));
    const bestCurrentFreight = Math.max(0, num(i.bestCurrentFreight));
    const bestNewPermissionFreight = Math.max(0, num(i.bestNewPermissionFreight));
    const reserve = reserveCalc(profile, cash, cost, 'extra_permission_after_delivery');
    const reservePressure = clamp((reserve.target - cashAfter) / Math.max(1, cost), 0, 1.8);
    const upgradeRatio = clamp((bestNewPermissionFreight - bestCurrentFreight) / Math.max(1, bestCurrentFreight || bestNewPermissionFreight || 1), -0.3, 1.4);
    const score = weightPermission * 0.72 + clamp(ownedPorts / 6, 0, 1) * (0.42 + weightPort * 0.18) + clamp(ownedTolls / 6, 0, 1) * weightToll * 0.08 + Math.max(0, upgradeRatio) * (0.46 + combo * 0.14) + availableCount * 0.05 + risk * 0.08 + foresight * 0.08 - coverageRatio * 0.72 - reservePressure * 1.02 - clamp(cost / Math.max(1, cash), 0, 1.4) * (0.28 + reserveRatio * 0.18);
    const threshold = 0.84 - combo * 0.10 - risk * 0.08 + reserveRatio * 0.16;
    const tableConfig = buildTableConfig('stage6_profile_table');
    const player = buildAiPlayer(side, { cash, tableConfig, permissionCount, ownedPorts, ownedTolls, purchasePolicy: i.purchasePolicy });
    const engineDecision = engineApi().decideExtraPermissionPurchase({ player, extraCost: cost, availableCount, context: { tableConfig, permissionSignals: { permissionCount, ownedPortCount: ownedPorts, ownedTollCount: ownedTolls, bestCurrentFreight, bestNewPermissionFreight } } });
    return {
      summary: [
        { label: 'Score', value: formatValue(score) },
        { label: 'Limiar', value: formatValue(threshold) },
        { label: 'Pressao de reserva', value: formatValue(reservePressure) },
        { label: 'Decisao oficial', value: engineDecision.shouldBuy ? 'Compra' : 'Nao compra' },
      ],
      breakdown: addMetaBreakdown(def, [
        { title: 'Bonus da expansao', rows: [
          { label: 'Peso em permissoes', value: formatValue(weightPermission * 0.72), detail: 'Base da atracao por ampliar cargas.' },
          { label: 'Sinergia com portos', value: formatValue(clamp(ownedPorts / 6, 0, 1) * (0.42 + weightPort * 0.18)), detail: 'Portos aumentam o valor de novas permissoes.' },
          { label: 'Sinergia com pedagios', value: formatValue(clamp(ownedTolls / 6, 0, 1) * weightToll * 0.08), detail: 'Pedagios tambem somam um pouco.' },
          { label: 'Melhora de frete', value: formatValue(Math.max(0, upgradeRatio) * (0.46 + combo * 0.14)), detail: `upgrade ${formatValue(upgradeRatio)}` },
          { label: 'Cobertura atual', value: formatValue(-(coverageRatio * 0.72)), detail: 'Quanto mais coberto ja estiver, menor o ganho marginal.' },
        ] },
      ]),
      notes: [
        side.presetId === 'legacy_open' ? 'Perfil legado compra permissao sempre que puder pagar.' : 'Aqui a IA compara ganho marginal de frete com pressao de caixa.',
      ],
    };
  }
  function computeChoosePermission(def, formulaState) {
    const side = ensureProfileState(formulaState, def.profileSides[0]);
    const profile = buildProfile(side);
    const i = formulaState.inputs;
    const weightPermission = num(getByPath(profile, 'vision.weight_permission'), 1);
    const weightOrigin = num(getByPath(profile, 'vision.weight_origin_bonus'), 1);
    const foresight = clamp(num(getByPath(profile, 'skill.foresight')), 0, 1);
    const combo = clamp(num(getByPath(profile, 'skill.combo_awareness')), 0, 1);
    const attachment = clamp(num(getByPath(profile, 'personality.asset_attachment')), 0, 1);
    const impulse = clamp(num(getByPath(profile, 'personality.impulsiveness')), 0, 1);
    const risk = clamp(num(getByPath(profile, 'personality.risk_tolerance')), 0, 1);
    const ownsOrigin = !!i.ownsOrigin;
    const choiceNames = ['Opcao A', 'Opcao B', 'Opcao C'];
    const choices = [0,1,2].map((index) => {
      const fee = Math.max(0, num(getByPath(i, `choices.${index}.fee`)));
      const multiplier = Math.max(1, num(getByPath(i, `choices.${index}.multiplier`)));
      const freight = Math.max(0, num(getByPath(i, `choices.${index}.projectedFreight`), fee * multiplier));
      const current = !!getByPath(i, `choices.${index}.isCurrent`);
      let score = 0;
      if (ownsOrigin) {
        score += freight * (0.84 + weightOrigin * 0.24);
        score += fee * (0.18 + weightPermission * 0.06);
        score += (multiplier - 1) * 34 * (0.34 + weightOrigin * 0.12 + combo * 0.08);
      } else {
        score += fee * (0.88 + weightPermission * 0.18 + foresight * 0.08);
        score += (multiplier - 1) * 12 * (0.22 + combo * 0.10 + risk * 0.06);
      }
      score += weightPermission * 6;
      if (current) score += 10 + attachment * 18 + (1 - impulse) * 7;
      return { label: choiceNames[index], fee, multiplier, freight, isCurrent: current, score };
    });
    const best = choices.reduce((winner, entry) => (!winner || entry.score > winner.score || (entry.score === winner.score && entry.isCurrent)) ? entry : winner, null);
    const player = buildAiPlayer(side, { cash: 1000, tableConfig: buildTableConfig('stage6_profile_table') });
    const engineDecision = engineApi().chooseBestPermission({ player, selection: { ownsOrigin }, choices: choices.map((entry) => ({ fee: entry.fee, multiplier: entry.multiplier, projectedFreight: entry.freight, isCurrent: entry.isCurrent })), context: { tableConfig: buildTableConfig('stage6_profile_table') } });
    return {
      summary: [
        { label: 'Melhor opcao', value: best?.label || '--' },
        { label: 'Maior score', value: formatValue(best?.score || 0) },
        { label: 'Origem propria', value: ownsOrigin ? 'Sim' : 'Nao' },
        { label: 'Escolha oficial', value: best?.label || (engineDecision.choice ? 'Escolhida' : '--') },
      ],
      breakdown: addMetaBreakdown(def, choices.map((entry) => ({
        title: entry.label,
        rows: [
          { label: 'Frete base', value: formatValue(entry.fee, 'money'), detail: 'Valor base da permissao.' },
          { label: 'Multiplicador', value: formatValue(entry.multiplier), detail: 'Multiplicador da permissao.' },
          { label: 'Frete projetado', value: formatValue(entry.freight, 'money'), detail: ownsOrigin ? 'Usado com peso forte na origem.' : 'Perde peso quando a origem nao e propria.' },
          { label: 'Bonus da permissao', value: formatValue(weightPermission * 6), detail: 'Constante aplicada a toda permissao.' },
          { label: 'Bonus de permanencia', value: formatValue(entry.isCurrent ? (10 + attachment * 18 + (1 - impulse) * 7) : 0), detail: 'A permissao atual recebe bonus para evitar troca por pouca diferenca.' },
          { label: 'Score final', value: formatValue(entry.score), detail: 'Maior score vence; em empate, fica com a atual.' },
        ],
      }))),
      notes: ['Quando a origem e propria, o frete projetado domina a conta.', 'Sem origem propria, o robo olha mais para frete base e versatilidade.'],
    };
  }
  function computeCoupon(def, formulaState) {
    const side = ensureProfileState(formulaState, def.profileSides[0]);
    const profile = buildProfile(side); const i = formulaState.inputs;
    const cash = money(i.cash); const charge = money(i.charge); const kind = i.kind; const autoUse = !!i.autoUse;
    const reserve = reserveCalc(profile, cash, Math.max(charge, 120), 'coupon_usage');
    const pressure = clamp((reserve.target - cash) / Math.max(1, reserve.target || cash || 1), -1, 1.4);
    const patience = clamp(num(getByPath(profile, 'personality.coupon_patience')), 0, 1);
    const impulse = clamp(num(getByPath(profile, 'personality.impulsiveness')), 0, 1);
    const risk = clamp(num(getByPath(profile, 'personality.risk_tolerance')), 0, 1);
    const weightToll = num(getByPath(profile, 'vision.weight_toll'), 1);
    let score = autoUse ? 0.52 : 0.22; let threshold = 0.56 + patience * 0.14 - impulse * 0.08 - Math.max(0, pressure) * 0.18;
    if (kind === 'free_fuel') { score += clamp(charge / 40, 0, 1.6) * 0.46 + Math.max(0, pressure) * 0.28; threshold = 0.62 + patience * 0.16 - risk * 0.08; }
    else if (kind === 'free_port_stay') { score += clamp(charge / 90, 0, 1.8) * 0.58 + Math.max(0, pressure) * 0.24 + (i.ownerPresent ? 0.08 : 0); threshold = 0.68 + patience * 0.14 - risk * 0.08; }
    else if (kind === 'free_toll') { score += clamp(charge / 80, 0, 1.8) * 0.56 + Math.max(0, pressure) * 0.24 + (i.mandatoryToll ? 0.12 : 0); threshold = 0.66 + patience * 0.14 - risk * 0.08; }
    else if (kind === 'shortcut_ignore_toll') { score += Math.max(0, pressure) * 0.24 + (i.mandatoryToll ? 0.22 : 0) + clamp((1.15 - weightToll) * 0.32, -0.08, 0.2) + impulse * 0.08; threshold = 0.72 + patience * 0.14 + Math.max(0, weightToll - 1) * 0.12; }
    else { score += (num(i.candidateCount) > 0 ? 0.22 : -0.4) + impulse * 0.1 + risk * 0.06; threshold = 0.66 + patience * 0.12; }
    const shouldUse = autoUse && score >= threshold;
    return {
      summary: [
        { label: 'Score', value: formatValue(score) },
        { label: 'Limiar', value: formatValue(threshold) },
        { label: 'Reserva alvo', value: formatValue(reserve.target, 'money') },
        { label: 'Decisao', value: shouldUse ? 'Usa o cupom' : 'Guarda o cupom' },
      ],
      breakdown: addMetaBreakdown(def, [
        { title: 'Base da formula', rows: [
          { label: 'Score inicial', value: formatValue(autoUse ? 0.52 : 0.22), detail: autoUse ? 'Uso automatico sobe a predisposicao.' : 'Sem auto uso, comeca mais baixo.' },
          { label: 'Pressao de caixa', value: formatValue(pressure), detail: 'Compara reserva alvo e caixa atual.' },
          { label: 'Paciencia', value: formatValue(patience), detail: 'Sobe o limiar de uso.' },
          { label: 'Impulso', value: formatValue(impulse), detail: 'Baixa limiar ou aumenta score, dependendo do cupom.' },
        ] },
      ]),
      notes: [kind === 'shortcut_ignore_toll' && weightToll <= 1 ? 'Com sliders de 0 a 1, a parte max(0, peso_pedagio - 1) fica zerada.' : 'Cada cupom aplica ajustes diferentes ao score e ao limiar.'],
    };
  }
  function computeMortgage(def, formulaState) {
    const side = ensureProfileState(formulaState, def.profileSides[0]); const profile = buildProfile(side); const i = formulaState.inputs;
    const cash = money(i.cash); const due = money(i.due); const shortage = Math.max(0, due - cash); const urgency = clamp(shortage / Math.max(1, due || shortage || 1), 0, 1.5);
    const weightPort = num(getByPath(profile, 'vision.weight_port'), 1); const weightPermission = num(getByPath(profile, 'vision.weight_permission'), 1); const weightToll = num(getByPath(profile, 'vision.weight_toll'), 1); const weightMonopoly = num(getByPath(profile, 'vision.weight_monopoly'), 1); const attachment = clamp(num(getByPath(profile, 'personality.asset_attachment')), 0, 1);
    const candidates = [0,1,2].map((n) => { const c = getByPath(i, `candidates.${n}`) || {}; const credit = money(c.credit); let strategicPenalty = attachment * 0.2; if (c.type === 'property') { if (c.propertyKind === 'toll') strategicPenalty += weightToll * 0.52; else { strategicPenalty += weightPort * 0.48; if (c.monopolyProtected) strategicPenalty += weightMonopoly * 0.62; } } else { strategicPenalty += weightPermission * 0.58; if (num(c.remainingPermissionCount) <= 1) strategicPenalty += 0.5; } const creditFactor = credit / Math.max(1, shortage || due || credit || 1); const score = creditFactor * (0.72 + urgency * 0.38) - strategicPenalty; return { label: `Candidato ${'ABC'[n]}`, ...c, credit, creditFactor, strategicPenalty, score }; });
    const best = candidates.reduce((winner, entry) => (!winner || entry.score > winner.score ? entry : winner), null);
    return { summary: [{ label: 'Ativo escolhido', value: best?.label || '--' }, { label: 'Melhor score', value: formatValue(best?.score || 0) }, { label: 'Falta de caixa', value: formatValue(shortage, 'money') }, { label: 'Acao', value: best ? 'Hipotecar' : 'Sem candidato' }], breakdown: addMetaBreakdown(def, candidates.map((entry) => ({ title: entry.label, rows: [{ label: 'Credito', value: formatValue(entry.credit, 'money'), detail: 'Quanto este ativo resolve da falta.' }, { label: 'Fator de credito', value: formatValue(entry.creditFactor), detail: 'credito / falta de caixa' }, { label: 'Penalidade estrategica', value: formatValue(entry.strategicPenalty), detail: 'Apego e valor estrategico do ativo.' }, { label: 'Score final', value: formatValue(entry.score), detail: 'Maior score sera hipotecado antes.' }] }))), notes: ['Quanto maior o credito util e menor a perda estrategica, mais cedo o ativo cai na hipoteca.'] };
  }
  function computeRedeem(def, formulaState) {
    const side = ensureProfileState(formulaState, def.profileSides[0]); const profile = buildProfile(side); const i = formulaState.inputs;
    const cash = money(i.cash); const reserve = reserveCalc(profile, cash, Math.max(120, Math.floor(cash * 0.22)), 'redeem'); const spareCash = cash - reserve.target; const weightPort = num(getByPath(profile, 'vision.weight_port'), 1); const weightPermission = num(getByPath(profile, 'vision.weight_permission'), 1); const weightToll = num(getByPath(profile, 'vision.weight_toll'), 1); const weightMonopoly = num(getByPath(profile, 'vision.weight_monopoly'), 1); const attachment = clamp(num(getByPath(profile, 'personality.asset_attachment')), 0, 1);
    const candidates = [0,1,2].map((n) => { const c = getByPath(i, `candidates.${n}`) || {}; const cost = money(c.cost); let strategicValue = attachment * 0.16; if (c.type === 'property') { if (c.propertyKind === 'toll') strategicValue += weightToll * 0.78; else { strategicValue += weightPort * 0.56; if (c.monopolyProtected) strategicValue += weightMonopoly * 0.66; } } else { strategicValue += weightPermission * 0.62; if (num(c.remainingPermissionCount) <= 1) strategicValue += 0.22; } const costPressure = cost / Math.max(1, cash); const score = strategicValue - costPressure * 0.72; return { label: `Candidato ${'ABC'[n]}`, ...c, cost, strategicValue, costPressure, score }; });
    const best = candidates.reduce((winner, entry) => (!winner || entry.score > winner.score ? entry : winner), null); const shouldRedeem = !!best && spareCash >= money((best.cost || 0) * 0.55) && best.score >= 0.36;
    return { summary: [{ label: 'Ativo escolhido', value: best?.label || '--' }, { label: 'Melhor score', value: formatValue(best?.score || 0) }, { label: 'Caixa livre', value: formatValue(spareCash, 'money') }, { label: 'Acao', value: shouldRedeem ? 'Resgatar' : 'Nao resgatar' }], breakdown: addMetaBreakdown(def, [{ title: 'Reserva', rows: [{ label: 'Reserva alvo', value: formatValue(reserve.target, 'money'), detail: 'Quanto precisa sobrar antes de pensar em resgatar.' }, { label: 'Caixa livre', value: formatValue(spareCash, 'money'), detail: 'Caixa atual menos a reserva.' }] }].concat(candidates.map((entry) => ({ title: entry.label, rows: [{ label: 'Valor estrategico', value: formatValue(entry.strategicValue), detail: 'Peso do tipo de ativo mais apego.' }, { label: 'Pressao de custo', value: formatValue(entry.costPressure), detail: 'custo / caixa' }, { label: 'Score final', value: formatValue(entry.score), detail: 'Maior score vira prioridade de resgate.' }] })))), notes: ['O resgate so sai se ainda sobrar caixa acima da reserva e o score for suficiente.'] };
  }
  function negotiationContext(i) { return { negotiationSignals: { mortgageFloor: money(i.mortgageFloorSignal), propertyKind: i.propertyKind, ownerCharge: num(i.ownerCharge), rateFee: num(i.rateFee), rateMultiplier: num(i.rateMultiplier), freightPotential: num(i.freightPotential), buyerRegionBeforeRatio: num(i.buyerRegionBeforeRatio), buyerRegionAfterRatio: num(i.buyerRegionAfterRatio), sellerRegionBeforeRatio: num(i.sellerRegionBeforeRatio), sellerRegionAfterRatio: num(i.sellerRegionAfterRatio), buyerWouldCompleteMonopoly: !!i.buyerWouldCompleteMonopoly, sellerWouldLoseMonopoly: !!i.sellerWouldLoseMonopoly }, reason: i.reason }; }
  function computeRobotTrade(def, formulaState) {
    const buyerSide = ensureProfileState(formulaState, def.profileSides[0]); const sellerSide = ensureProfileState(formulaState, def.profileSides[1]); const i = formulaState.inputs; const tableConfig = buildTableConfig('stage6_profile_table');
    const buyer = buildAiPlayer(buyerSide, { id: 'buyer', cash: i.buyerCash, permissionCount: 2, tableConfig, purchasePolicy: 'always' }); const seller = buildAiPlayer(sellerSide, { id: 'seller', cash: i.sellerCash, permissionCount: 2, tableConfig, purchasePolicy: 'always' });
    const decision = engineApi().decideOwnedPropertyNegotiation({ player: buyer, owner: seller, card: { kind: i.propertyKind, price: money(i.basePrice) }, price: money(i.listPrice), context: { tableConfig, ...negotiationContext(i) } });
    return { summary: [{ label: 'Modo', value: decision.mode || '--' }, { label: 'Teto do comprador', value: formatValue(decision.buyerMax || 0, 'money') }, { label: 'Piso do vendedor', value: decision.sellerMin == null ? '--' : formatValue(decision.sellerMin, 'money') }, { label: 'Resultado', value: decision.accepted ? `Acordo em ${formatValue(decision.finalPrice || 0, 'money')}` : (decision.rejectionReason || 'Sem acordo') }], breakdown: addMetaBreakdown(def, [{ title: 'Transcricao oficial do engine', rows: (decision.transcript || []).map((step) => ({ label: step.phase || 'fase', value: step.amount != null ? formatValue(step.amount, 'money') : (step.accepted ? 'aceito' : 'nao'), detail: step.reason || `${step.actor || 'sistema'}` })) }]), notes: [decision.rejectionReason === 'trade_locked' ? 'Neste estado atual, o perfil travado ainda bloqueia a negociacao de forma dura.' : 'Aqui o laboratorio mostra a decisao oficial do motor de negociacao.', 'Os sliders de agio e desagio ainda estao pouco usados na matematica atual.'] };
  }
  function computeHumanBuy(def, formulaState) {
    const sellerSide = ensureProfileState(formulaState, def.profileSides[0]); const i = formulaState.inputs; const tableConfig = buildTableConfig('stage5_human_dynamic_negotiation_table'); const human = buildHumanPlayer({ cash: i.buyerCash }); const seller = buildAiPlayer(sellerSide, { id: 'seller', cash: i.ownerCash, permissionCount: 2, tableConfig });
    const session = engineApi().buildHumanOwnedPropertyNegotiation({ player: human, owner: seller, card: { kind: i.propertyKind, price: money(i.basePrice) }, price: money(i.listPrice), context: { tableConfig, ...negotiationContext({ ...i, sellerRegionBeforeRatio: i.sellerRegionBeforeRatio, sellerRegionAfterRatio: i.sellerRegionAfterRatio, sellerWouldLoseMonopoly: i.sellerWouldLoseMonopoly }) } });
    const response = money(i.offer) > 0 ? engineApi().respondToHumanOwnedPropertyOffer({ session, offer: money(i.offer) }) : null;
    const active = response?.session || session;
    return { summary: [{ label: 'Postura', value: active.sellerStanceLabel || '--' }, { label: 'Pedido atual', value: formatValue(active.currentAsk || 0, 'money') }, { label: 'Piso privado', value: formatValue(active.privateFloor || 0, 'money') }, { label: 'Resposta', value: response ? (response.accepted ? 'Aceitou' : (response.status === 'countered' ? `Contra em ${formatValue(response.counterPrice || 0, 'money')}` : (response.reason || 'Rejeitou'))) : 'Sem oferta testada' }], breakdown: addMetaBreakdown(def, [{ title: 'Sessao oficial do engine', rows: [{ label: 'Pode negociar', value: active.canNegotiate ? 'Sim' : 'Nao', detail: active.rejectionReason || active.sellerLine || '--' }, { label: 'Alvo privado', value: formatValue(active.privateTarget || 0, 'money'), detail: 'Preco que o vendedor gostaria de fechar.' }, { label: 'Oferta sugerida ao humano', value: formatValue(active.suggestedOffer || 0, 'money'), detail: 'Faixa que o proprio robo considera conversavel.' }, { label: 'Linha do robo', value: active.sellerLine || '--', detail: 'Texto contextual exibido na negociacao.' }] }]), notes: ['Esta tela usa diretamente a sessao oficial da negociacao humano x robo.', 'Se a oferta humana estiver preenchida, a resposta mostrada ja vem do motor.'] };
  }
  function computeHumanSale(def, formulaState) {
    const buyerSide = ensureProfileState(formulaState, def.profileSides[0]); const i = formulaState.inputs; const tableConfig = buildTableConfig('stage5_human_dynamic_negotiation_table'); const buyer = buildAiPlayer(buyerSide, { id: 'buyer', cash: i.buyerCash, permissionCount: 2, tableConfig }); const humanOwner = buildHumanPlayer({ cash: 0, id: 'owner', name: 'Humano' });
    const session = engineApi().buildHumanSalePropertyNegotiation({ player: buyer, owner: humanOwner, card: { kind: i.propertyKind, price: money(i.basePrice) }, price: money(i.listPrice), context: { tableConfig, ...negotiationContext({ ...i, buyerRegionBeforeRatio: i.buyerRegionBeforeRatio, buyerRegionAfterRatio: i.buyerRegionAfterRatio, buyerWouldCompleteMonopoly: i.buyerWouldCompleteMonopoly }) } });
    const response = money(i.ask) > 0 ? engineApi().respondToHumanSaleCounterOffer({ session, ask: money(i.ask) }) : null; const active = response?.session || session;
    return { summary: [{ label: 'Postura', value: active.buyerStanceLabel || '--' }, { label: 'Lance atual', value: formatValue(active.currentBid || 0, 'money') }, { label: 'Teto privado', value: formatValue(active.privateCeiling || 0, 'money') }, { label: 'Resposta', value: response ? (response.accepted ? 'Aceitou' : (response.status === 'countered' ? `Contra em ${formatValue(response.counterPrice || 0, 'money')}` : (response.reason || 'Rejeitou'))) : 'Sem pedida testada' }], breakdown: addMetaBreakdown(def, [{ title: 'Sessao oficial do engine', rows: [{ label: 'Pode negociar', value: active.canNegotiate ? 'Sim' : 'Nao', detail: active.rejectionReason || active.buyerLine || '--' }, { label: 'Alvo privado', value: formatValue(active.privateTarget || 0, 'money'), detail: 'Preco que o comprador gostaria de pagar.' }, { label: 'Pedida sugerida ao humano', value: formatValue(active.suggestedAsk || 0, 'money'), detail: 'Faixa que o proprio robo considera viavel ouvir.' }, { label: 'Linha do robo', value: active.buyerLine || '--', detail: 'Texto contextual exibido na negociacao.' }] }]), notes: ['Esta tela usa diretamente a sessao oficial da negociacao robo comprando do humano.', 'O teto privado eh a barreira matematica mais importante desse lado da negociacao.'] };
  }
  const COMPUTE_MAP = { reserve_cash: computeReserve, bank_property: computeBankProperty, extra_permission: computeExtraPermission, choose_permission: computeChoosePermission, coupon_usage: computeCoupon, mortgage: computeMortgage, redeem: computeRedeem, robot_trade: computeRobotTrade, human_buy_from_robot: computeHumanBuy, robot_buy_from_human: computeHumanSale };
  function renderStats(def) { const target = document.getElementById('ai-lab-stats'); const usedFields = (def.profileSides || []).flatMap((side) => side.fields || []); const inputCount = (def.inputGroups || []).flatMap((group) => group.fields || []).length; target.innerHTML = [{ label: 'formulas', value: FORMULAS.length }, { label: 'parametros da formula', value: new Set(usedFields).size }, { label: 'entradas do contexto', value: inputCount }, { label: 'status', value: statusMeta(def.status).label }].map((item) => `<article class="ai-lab-stat"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></article>`).join(''); }
  function renderFormulaList() { const target = document.getElementById('ai-lab-formula-list'); target.innerHTML = FORMULAS.map((formula) => `<button type="button" class="ai-lab-formula-button${LAB_STATE.formulaId === formula.id ? ' is-active' : ''}" data-formula="${esc(formula.id)}">${esc(formula.label)}<small>${esc(formula.copy)}</small></button>`).join(''); target.querySelectorAll('[data-formula]').forEach((button) => button.addEventListener('click', () => { LAB_STATE.formulaId = button.dataset.formula; renderLab(); })); }
  function renderHeader(def) { document.getElementById('ai-lab-formula-eyebrow').textContent = def.eyebrow; document.getElementById('ai-lab-formula-title').textContent = def.label; document.getElementById('ai-lab-formula-copy').textContent = def.copy; const status = statusMeta(def.status); const badge = document.getElementById('ai-lab-formula-status'); badge.textContent = status.label; badge.className = `ai-lab-pill ai-lab-status ${status.className}`; }
  function profileFieldHtml(def, sideId, state, profile) { const meta = PROFILE_FIELD_DEFS[def]; const current = getByPath(profile, def); const overrideKey = def; return `<div class="ai-lab-field"><div class="ai-lab-field-head"><div><div>${esc(meta.label)}</div><small>${esc(statusMeta(meta.status).label)} · ${esc(meta.equation)}</small></div><strong>${meta.type === 'toggle' ? (current ? 'Sim' : 'Nao') : esc(formatValue(current, meta.step >= 1 ? 'integer' : 'decimal'))}</strong></div>${meta.type === 'toggle' ? `<div class="ai-lab-toggle"><label><input type="checkbox" data-profile-field="${esc(sideId)}::${esc(overrideKey)}" ${current ? 'checked' : ''}>Ativo</label></div>` : `<input class="ai-lab-range" type="range" min="${meta.min}" max="${meta.max}" step="${meta.step}" value="${current}" data-profile-field="${esc(sideId)}::${esc(overrideKey)}">`}</div>`; }
  function renderProfilePanels(def, formulaState) { const target = document.getElementById('ai-lab-profile-panels'); target.innerHTML = (def.profileSides || []).map((sideDef) => { const side = ensureProfileState(formulaState, sideDef); const profile = buildProfile(side); const grouped = {}; (sideDef.fields || []).forEach((path) => { const meta = PROFILE_FIELD_DEFS[path]; if (!meta) return; grouped[meta.group] = grouped[meta.group] || []; grouped[meta.group].push(profileFieldHtml(path, sideDef.id, side, profile)); }); return `<article class="ai-lab-group-card"><h3>${esc(sideDef.label)}</h3><div class="ai-lab-field"><div class="ai-lab-field-head"><div><div>Preset do perfil</div><small>Base do robo antes dos ajustes finos.</small></div></div><select class="ai-lab-select" data-profile-preset="${esc(sideDef.id)}">${presetOptions().map((option) => `<option value="${esc(option.id)}" ${option.id === side.presetId ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select></div>${Object.keys(grouped).map((group) => `<div class="ai-lab-fields"><h3>${esc(groupLabel(group))}</h3>${grouped[group].join('')}</div>`).join('')}</article>`; }).join(''); target.querySelectorAll('[data-profile-preset]').forEach((select) => select.addEventListener('change', () => { const side = formulaState.profiles[select.dataset.profilePreset]; side.presetId = select.value; side.overrides = {}; renderLab(); })); target.querySelectorAll('[data-profile-field]').forEach((input) => input.addEventListener('input', () => { const [sideId, path] = input.dataset.profileField.split('::'); const side = formulaState.profiles[sideId]; side.overrides[path] = input.type === 'checkbox' ? input.checked : num(input.value); renderLab(false); })); }
  function inputFieldHtml(field, value) { const valueText = field.type === 'toggle' ? (value ? 'Sim' : 'Nao') : esc(formatValue(value, field.format || (field.step >= 1 ? 'integer' : 'decimal'))); if (field.type === 'select') return `<div class="ai-lab-field"><div class="ai-lab-field-head"><div><div>${esc(field.label)}</div></div><strong>${esc((field.options || []).find((option) => option[0] === value)?.[1] || value)}</strong></div><select class="ai-lab-select" data-input-field="${esc(field.path)}">${(field.options || []).map((option) => `<option value="${esc(option[0])}" ${option[0] === value ? 'selected' : ''}>${esc(option[1])}</option>`).join('')}</select></div>`; if (field.type === 'toggle') return `<div class="ai-lab-field"><div class="ai-lab-field-head"><div><div>${esc(field.label)}</div></div><strong>${valueText}</strong></div><div class="ai-lab-toggle"><label><input type="checkbox" data-input-field="${esc(field.path)}" ${value ? 'checked' : ''}>Ativo</label></div></div>`; return `<div class="ai-lab-field"><div class="ai-lab-field-head"><div><div>${esc(field.label)}</div></div><strong>${valueText}</strong></div>${field.type === 'range' ? `<input class="ai-lab-range" type="range" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" data-input-field="${esc(field.path)}">` : `<input class="ai-lab-number" type="number" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" data-input-field="${esc(field.path)}">`}</div>`; }
  function renderInputPanels(def, formulaState) { const target = document.getElementById('ai-lab-input-panels'); target.innerHTML = (def.inputGroups || []).map((group) => `<article class="ai-lab-group-card"><h3>${esc(group.title)}</h3><div class="ai-lab-fields">${(group.fields || []).map((field) => inputFieldHtml(field, getByPath(formulaState.inputs, field.path))).join('')}</div></article>`).join(''); target.querySelectorAll('[data-input-field]').forEach((input) => input.addEventListener('input', () => { const fieldPath = input.dataset.inputField; const field = (def.inputGroups || []).flatMap((group) => group.fields || []).find((entry) => entry.path === fieldPath); const value = input.type === 'checkbox' ? input.checked : (field.type === 'select' ? input.value : num(input.value)); setByPath(formulaState.inputs, fieldPath, value); renderLab(false); })); }
  function renderSummary(cards) { document.getElementById('ai-lab-summary-grid').innerHTML = (cards || []).map((card) => `<article class="ai-lab-summary-card"><span>${esc(card.label)}</span><strong>${esc(card.value)}</strong></article>`).join(''); }
  function renderBreakdown(sections) { document.getElementById('ai-lab-breakdown-grid').innerHTML = (sections || []).map((section) => `<article class="ai-lab-breakdown-card"><h3>${esc(section.title)}</h3><div class="ai-lab-breakdown-list">${(section.rows || []).map((row) => `<div class="ai-lab-breakdown-row"><div class="ai-lab-breakdown-top"><strong>${esc(row.label)}</strong><span>${esc(row.value)}</span></div><small>${esc(row.detail || '')}</small></div>`).join('')}</div></article>`).join(''); }
  function renderNotes(notes) { document.getElementById('ai-lab-notes').innerHTML = (notes || []).map((note) => `<li>${esc(note)}</li>`).join(''); }
  function renderLab(resetFormulaState = true) { const def = FORMULA_MAP[LAB_STATE.formulaId] || FORMULA_MAP.reserve_cash; const formulaState = ensureFormulaState(def); renderStats(def); renderFormulaList(); renderHeader(def); renderProfilePanels(def, formulaState); renderInputPanels(def, formulaState); const result = (COMPUTE_MAP[def.id] || computeReserve)(def, formulaState); renderSummary(result.summary); renderBreakdown(result.breakdown); renderNotes(result.notes); }
  function initAiFormulaLabUi() { if (!profilesApi() || !engineApi()) { document.getElementById('ai-lab-formula-copy').textContent = 'Nao foi possivel carregar perfis ou engine. Recarregue com Ctrl+F5.'; return; } SELECTS.profilePreset = presetOptions().map((option) => [option.id, option.label]); renderLab(); }
  document.addEventListener('DOMContentLoaded', initAiFormulaLabUi);
})(window);
