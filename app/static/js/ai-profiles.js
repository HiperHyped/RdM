(function initRdMAiProfiles(global) {
  const deepClone = (value) => JSON.parse(JSON.stringify(value));

  function deepMerge(base, overrides) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      return overrides === undefined ? base : overrides;
    }
    const seed = (base && typeof base === 'object' && !Array.isArray(base))
      ? { ...base }
      : {};
    Object.entries(overrides).forEach(([key, value]) => {
      const current = seed[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        seed[key] = deepMerge(current, value);
        return;
      }
      seed[key] = value;
    });
    return seed;
  }

  const marketRegimes = {
    legacy_open_market: {
      id: 'legacy_open_market',
      label: 'Mercado Legado Aberto',
      description: 'Mantem a mesa equivalente ao legado: compra aberta e sem precificacao dinamica.',
      negotiation_enabled: true,
      dynamic_pricing: false,
      negotiation_phases: ['legacy_accept_or_reject'],
      default_markup_mode: 'legacy_fixed_markup',
      buy_openness: 1,
      sell_openness: 1,
    },
    stage4_robot_dynamic_market: {
      id: 'stage4_robot_dynamic_market',
      label: 'Mercado Dinamico Stage 4',
      description: 'Ativa negociacao em fases e preco variavel apenas para robo x robo.',
      negotiation_enabled: true,
      dynamic_pricing: true,
      negotiation_phases: ['interest', 'opening_offer', 'counter_offer', 'closing'],
      default_markup_mode: 'ai_dynamic_overlap',
      buy_openness: 1,
      sell_openness: 1,
    },
    stage5_human_dynamic_market: {
      id: 'stage5_human_dynamic_market',
      label: 'Mercado Dinamico Stage 5',
      description: 'Ativa negociacao em fases e preco variavel para robo x robo e humano x robo.',
      negotiation_enabled: true,
      dynamic_pricing: true,
      human_negotiation_enabled: true,
      negotiation_phases: ['interest', 'opening_offer', 'counter_offer', 'closing'],
      default_markup_mode: 'ai_dynamic_overlap',
      buy_openness: 1,
      sell_openness: 1,
    },
    stage6_profile_market: {
      id: 'stage6_profile_market',
      label: 'Mercado de Perfis Stage 6',
      description: 'Mantem a negociacao dinamica e ativa perfis distintos de investimento para os robos.',
      negotiation_enabled: true,
      dynamic_pricing: true,
      human_negotiation_enabled: true,
      negotiation_phases: ['interest', 'opening_offer', 'counter_offer', 'closing'],
      default_markup_mode: 'ai_dynamic_overlap',
      buy_openness: 0.85,
      sell_openness: 0.6,
    },
  };

  const negotiationPresets = {
    open_market: {
      id: 'open_market',
      label: 'Mercado Aberto',
      buy_openness: 1,
      sell_openness: 1,
      premium_tolerance: 1,
      discount_tolerance: 1,
      strategic_lock: 0,
      desperation_discount: 0,
    },
    acquisitive_market: {
      id: 'acquisitive_market',
      label: 'Comprador Agressivo',
      buy_openness: 0.94,
      sell_openness: 0.46,
      premium_tolerance: 0.74,
      discount_tolerance: 0.24,
      strategic_lock: 0.28,
      desperation_discount: 0.18,
    },
    balanced_market: {
      id: 'balanced_market',
      label: 'Mercado Equilibrado',
      buy_openness: 0.72,
      sell_openness: 0.62,
      premium_tolerance: 0.58,
      discount_tolerance: 0.42,
      strategic_lock: 0.44,
      desperation_discount: 0.18,
    },
    selective_market: {
      id: 'selective_market',
      label: 'Negociacao Seletiva',
      buy_openness: 0.48,
      sell_openness: 0.34,
      premium_tolerance: 0.46,
      discount_tolerance: 0.26,
      strategic_lock: 0.74,
      desperation_discount: 0.08,
    },
  };

  const visionPresets = {
    legacy_accumulator: {
      id: 'legacy_accumulator',
      label: 'Acumulador Legado',
      weight_port: 1,
      weight_permission: 1,
      weight_toll: 1,
      weight_monopoly: 1,
      weight_origin_bonus: 1,
      planning_horizon_turns: 0,
    },
    balanced_growth: {
      id: 'balanced_growth',
      label: 'Crescimento Balanceado',
      weight_port: 0.9,
      weight_permission: 0.8,
      weight_toll: 0.7,
      weight_monopoly: 0.7,
      weight_origin_bonus: 0.9,
      planning_horizon_turns: 4,
    },
    port_sprint: {
      id: 'port_sprint',
      label: 'Sprint de Portos',
      weight_port: 1,
      weight_permission: 0.22,
      weight_toll: 0.08,
      weight_monopoly: 0.18,
      weight_origin_bonus: 1,
      planning_horizon_turns: 2,
    },
    cargo_network: {
      id: 'cargo_network',
      label: 'Rede de Cargas',
      weight_port: 0.46,
      weight_permission: 1,
      weight_toll: 0.16,
      weight_monopoly: 0.24,
      weight_origin_bonus: 0.68,
      planning_horizon_turns: 6,
    },
    toll_investor: {
      id: 'toll_investor',
      label: 'Investidor de Pedagios',
      weight_port: 0.18,
      weight_permission: 0.2,
      weight_toll: 1,
      weight_monopoly: 0.14,
      weight_origin_bonus: 0.18,
      planning_horizon_turns: 9,
    },
    monopoly_drive: {
      id: 'monopoly_drive',
      label: 'Busca de Monopolio',
      weight_port: 0.62,
      weight_permission: 0.12,
      weight_toll: 0.18,
      weight_monopoly: 1,
      weight_origin_bonus: 0.42,
      planning_horizon_turns: 12,
    },
  };

  const personalityPresets = {
    legacy_aggressive: {
      id: 'legacy_aggressive',
      label: 'Agressivo Legado',
      cash_reserve_ratio: 0,
      risk_tolerance: 1,
      impulsiveness: 1,
      coupon_patience: 0,
      asset_attachment: 0,
    },
    bold_operator: {
      id: 'bold_operator',
      label: 'Operador Audaz',
      cash_reserve_ratio: 0.08,
      risk_tolerance: 0.84,
      impulsiveness: 0.74,
      coupon_patience: 0.26,
      asset_attachment: 0.32,
    },
    balanced_operator: {
      id: 'balanced_operator',
      label: 'Operador Balanceado',
      cash_reserve_ratio: 0.18,
      risk_tolerance: 0.56,
      impulsiveness: 0.42,
      coupon_patience: 0.44,
      asset_attachment: 0.46,
    },
    cautious_operator: {
      id: 'cautious_operator',
      label: 'Operador Cauteloso',
      cash_reserve_ratio: 0.32,
      risk_tolerance: 0.28,
      impulsiveness: 0.16,
      coupon_patience: 0.58,
      asset_attachment: 0.64,
    },
    opportunistic_operator: {
      id: 'opportunistic_operator',
      label: 'Operador Oportunista',
      cash_reserve_ratio: 0.14,
      risk_tolerance: 0.62,
      impulsiveness: 0.36,
      coupon_patience: 0.34,
      asset_attachment: 0.28,
    },
  };

  const skillPresets = {
    legacy_normal: {
      id: 'legacy_normal',
      label: 'Normal Legado',
      foresight: 0,
      evaluation_noise: 0,
      liquidity_discipline: 0,
      combo_awareness: 0,
      timing_quality: 0,
    },
    ai_easy: {
      id: 'ai_easy',
      label: 'Facil',
      foresight: 0.18,
      evaluation_noise: 0.18,
      liquidity_discipline: 0.22,
      combo_awareness: 0.2,
      timing_quality: 0.18,
    },
    ai_normal: {
      id: 'ai_normal',
      label: 'Normal',
      foresight: 0.42,
      evaluation_noise: 0.08,
      liquidity_discipline: 0.56,
      combo_awareness: 0.52,
      timing_quality: 0.44,
    },
    ai_hard: {
      id: 'ai_hard',
      label: 'Dificil',
      foresight: 0.62,
      evaluation_noise: 0.04,
      liquidity_discipline: 0.68,
      combo_awareness: 0.7,
      timing_quality: 0.58,
    },
    ai_expert: {
      id: 'ai_expert',
      label: 'Expert',
      foresight: 0.82,
      evaluation_noise: 0.02,
      liquidity_discipline: 0.84,
      combo_awareness: 0.86,
      timing_quality: 0.78,
    },
    stage6_standard: {
      id: 'stage6_standard',
      label: 'Padrao Stage 6',
      foresight: 0.42,
      evaluation_noise: 0.08,
      liquidity_discipline: 0.56,
      combo_awareness: 0.52,
      timing_quality: 0.44,
    },
    stage6_sharp: {
      id: 'stage6_sharp',
      label: 'Afiado Stage 6',
      foresight: 0.62,
      evaluation_noise: 0.04,
      liquidity_discipline: 0.68,
      combo_awareness: 0.7,
      timing_quality: 0.58,
    },
  };

  const archetypes = {
    legacy_open: {
      id: 'legacy_open',
      label: 'Legado atual',
      description: 'Replica a mesa AI anterior e serve como referencia para comparar as novas regulagens.',
      negotiation: 'open_market',
      vision: 'legacy_accumulator',
      personality: 'legacy_aggressive',
      skill: 'legacy_normal',
      tablePresetId: 'legacy_open_table',
      overrides: {},
    },
    balanced_trader: {
      id: 'balanced_trader',
      label: 'Equilibrado',
      description: 'Mantem um portifolio equilibrado entre porto, pedagio e permissao, sem se expor demais.',
      negotiation: 'balanced_market',
      vision: 'balanced_growth',
      personality: 'balanced_operator',
      skill: 'stage6_standard',
      tablePresetId: 'stage6_profile_table',
      overrides: {},
    },
    open_profile: {
      id: 'open_profile',
      label: 'Perfil aberto',
      description: 'Aplica a um unico robo um comportamento de mercado aberto, comprando e vendendo com extrema facilidade.',
      negotiation: 'open_market',
      vision: 'balanced_growth',
      personality: 'balanced_operator',
      skill: 'stage6_standard',
      tablePresetId: 'stage6_profile_table',
      overrides: {
        negotiation: {
          buy_openness: 1,
          sell_openness: 1,
          premium_tolerance: 0.82,
          discount_tolerance: 1,
          strategic_lock: 0,
          desperation_discount: 0.92,
          force_buy: 1,
          force_sell: 1,
          trade_forced: 1,
        },
      },
    },
    closed_profile: {
      id: 'closed_profile',
      label: 'Perfil fechado',
      description: 'Aplica a um unico robo um comportamento de mercado fechado, protegendo seus ativos e evitando qualquer venda.',
      negotiation: 'balanced_market',
      vision: 'balanced_growth',
      personality: 'cautious_operator',
      skill: 'stage6_standard',
      tablePresetId: 'stage6_profile_table',
      overrides: {
        negotiation: {
          buy_openness: 0.08,
          sell_openness: 0.02,
          premium_tolerance: 0.18,
          discount_tolerance: 0.02,
          strategic_lock: 1,
          desperation_discount: 0,
          buy_blocked: 1,
          sell_blocked: 1,
          trade_locked: 1,
        },
      },
    },
    port_sprinter: {
      id: 'port_sprinter',
      label: 'Foco em portos',
      description: 'Companhia de curto prazo: disputa portos cedo para reforcar a origem e acelerar o frete.',
      negotiation: 'acquisitive_market',
      vision: 'port_sprint',
      personality: 'bold_operator',
      skill: 'stage6_standard',
      tablePresetId: 'stage6_profile_table',
      overrides: {},
    },
    cargo_planner: {
      id: 'cargo_planner',
      label: 'Foco em permissoes',
      description: 'Companhia de medio prazo: amplia permissoes para abrir mais contratos valiosos ao longo da mesa.',
      negotiation: 'balanced_market',
      vision: 'cargo_network',
      personality: 'opportunistic_operator',
      skill: 'stage6_standard',
      tablePresetId: 'stage6_profile_table',
      overrides: {},
    },
    toll_broker: {
      id: 'toll_broker',
      label: 'Foco em pedagios',
      description: 'Companhia de longo prazo: investe em pedagios para capturar renda recorrente no mapa.',
      negotiation: 'balanced_market',
      vision: 'toll_investor',
      personality: 'balanced_operator',
      skill: 'stage6_standard',
      tablePresetId: 'stage6_profile_table',
      overrides: {},
    },
    monopoly_hunter: {
      id: 'monopoly_hunter',
      label: 'Foco em monopolios',
      description: 'Companhia de longuissimo prazo: fecha regioes, protege pecas-chave e mira monopolios completos.',
      negotiation: 'selective_market',
      vision: 'monopoly_drive',
      personality: 'cautious_operator',
      skill: 'stage6_sharp',
      tablePresetId: 'stage6_profile_table',
      overrides: {},
    },
  };

  const tablePresets = {
    legacy_open_table: {
      id: 'legacy_open_table',
      label: 'Mesa Legacy Aberto',
      description: 'Baseline formal para comparar as proximas etapas com o comportamento atual.',
      marketRegimeId: 'legacy_open_market',
      defaultRobotProfileId: 'legacy_open',
      defaultSkillPresetId: 'legacy_normal',
      baselineLocked: true,
      setupDefaults: {},
    },
    stage4_dynamic_negotiation_table: {
      id: 'stage4_dynamic_negotiation_table',
      label: 'Mesa AI Stage 4',
      description: 'Ativa negociacao dinamica entre robos mantendo o resto do fluxo atual.',
      marketRegimeId: 'stage4_robot_dynamic_market',
      defaultRobotProfileId: 'legacy_open',
      defaultSkillPresetId: 'legacy_normal',
      baselineReferenceId: 'legacy_open_table',
      baselineLocked: false,
      setupDefaults: {},
    },
    stage5_human_dynamic_negotiation_table: {
      id: 'stage5_human_dynamic_negotiation_table',
      label: 'Mesa AI Stage 5',
      description: 'Ativa negociacao dinamica para robos e para a interacao humano x robo.',
      marketRegimeId: 'stage5_human_dynamic_market',
      defaultRobotProfileId: 'legacy_open',
      defaultSkillPresetId: 'legacy_normal',
      baselineReferenceId: 'legacy_open_table',
      baselineLocked: false,
      setupDefaults: {},
    },
    stage6_profile_table: {
      id: 'stage6_profile_table',
      label: 'Mesa AI Stage 6',
      description: 'Ativa perfis distintos de investimento para que os robos comprem de forma diferente.',
      marketRegimeId: 'stage6_profile_market',
      defaultRobotProfileId: 'balanced_trader',
      defaultSkillPresetId: 'stage6_standard',
      robotArchetypeOrder: ['balanced_trader', 'port_sprinter', 'cargo_planner', 'toll_broker', 'monopoly_hunter'],
      baselineReferenceId: 'legacy_open_table',
      baselineLocked: false,
      setupDefaults: {},
    },
  };

  function buildProfile({ archetypeId = 'legacy_open', overrides = {} } = {}) {
    const archetype = archetypes[archetypeId] || archetypes.legacy_open;
    const profile = {
      id: archetype.id,
      label: archetype.label,
      description: archetype.description,
      negotiation: deepClone(negotiationPresets[archetype.negotiation] || negotiationPresets.open_market),
      vision: deepClone(visionPresets[archetype.vision] || visionPresets.legacy_accumulator),
      personality: deepClone(personalityPresets[archetype.personality] || personalityPresets.legacy_aggressive),
      skill: deepClone(skillPresets[archetype.skill] || skillPresets.legacy_normal),
      metadata: {
        archetype_id: archetype.id,
        negotiation_preset_id: archetype.negotiation,
        vision_preset_id: archetype.vision,
        personality_preset_id: archetype.personality,
        skill_preset_id: archetype.skill,
        table_preset_id: archetype.tablePresetId || 'legacy_open_table',
      },
    };
    const withArchetypeOverrides = deepMerge(profile, deepClone(archetype.overrides || {}));
    return deepMerge(withArchetypeOverrides, overrides);
  }

  function buildTableConfig({ presetId = 'legacy_open_table', overrides = {} } = {}) {
    const preset = tablePresets[presetId] || tablePresets.legacy_open_table;
    const config = {
      ...deepClone(preset),
      marketRegime: deepClone(marketRegimes[preset.marketRegimeId] || marketRegimes.legacy_open_market),
    };
    return deepMerge(config, overrides);
  }

  function assignProfile(player, { archetypeId = 'legacy_open', overrides = null } = {}) {
    if (!player) return null;
    const resolvedOverrides = overrides || player.ai_profile_overrides || {};
    const resolvedArchetype = player.ai_archetype_id || archetypeId;
    const profile = buildProfile({
      archetypeId: resolvedArchetype,
      overrides: resolvedOverrides,
    });
    player.ai_profile = profile;
    player.ai_profile_id = profile.id;
    return profile;
  }

  global.RdMAiProfiles = {
    marketRegimes,
    negotiationPresets,
    visionPresets,
    personalityPresets,
    skillPresets,
    archetypes,
    tablePresets,
    buildProfile,
    buildTableConfig,
    assignProfile,
  };
})(window);
