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

  function mapPresets(group) {
    const items = group?.presets || [];
    return items.reduce((acc, preset) => {
      if (!preset?.id) return acc;
      acc[preset.id] = {
        id: preset.id,
        label: preset.label || preset.id,
        description: preset.description || '',
        ...deepClone(preset.values || {}),
      };
      return acc;
    }, {});
  }

  const injectedConfig = global.__RDM_AI_V2_CONFIG__ || {};
  const parameterGroups = deepClone(injectedConfig.parameter_groups || {});
  const parameterDefinitions = Object.values(parameterGroups).reduce((acc, group) => {
    (group?.parameters || []).forEach((parameter) => {
      if (parameter?.id) {
        acc[parameter.id] = deepClone(parameter);
      }
    });
    return acc;
  }, {});

  const negotiationPresets = mapPresets(parameterGroups.negotiation);
  const visionPresets = mapPresets(parameterGroups.vision);
  const personalityPresets = mapPresets(parameterGroups.personality);
  const skillPresets = mapPresets(parameterGroups.skill);

  const presetAliases = {
    negotiation: {
      open_market: 'leiloeiro',
      acquisitive_market: 'comprador',
      balanced_market: 'equilibrado',
      selective_market: 'protetor',
    },
    vision: {
      legacy_accumulator: 'balanceado',
      balanced_growth: 'balanceado',
      port_sprint: 'foco_portos',
      cargo_network: 'foco_malha',
      toll_investor: 'foco_pedagios',
      monopoly_drive: 'foco_monopolio',
    },
    personality: {
      legacy_aggressive: 'corsario',
      bold_operator: 'corsario',
      balanced_operator: 'equilibrado',
      cautious_operator: 'tesoureiro',
      opportunistic_operator: 'oportunista',
    },
  };

  Object.entries(presetAliases.negotiation).forEach(([aliasId, targetId]) => {
    if (!negotiationPresets[targetId]) return;
    negotiationPresets[aliasId] = {
      ...deepClone(negotiationPresets[targetId]),
      id: aliasId,
      alias_of: targetId,
    };
  });

  Object.entries(presetAliases.vision).forEach(([aliasId, targetId]) => {
    if (!visionPresets[targetId]) return;
    visionPresets[aliasId] = {
      ...deepClone(visionPresets[targetId]),
      id: aliasId,
      alias_of: targetId,
    };
  });

  Object.entries(presetAliases.personality).forEach(([aliasId, targetId]) => {
    if (!personalityPresets[targetId]) return;
    personalityPresets[aliasId] = {
      ...deepClone(personalityPresets[targetId]),
      id: aliasId,
      alias_of: targetId,
    };
  });

  const skillAliases = deepClone(injectedConfig.compatibility?.skill_aliases || {});
  Object.entries(skillAliases).forEach(([aliasId, targetId]) => {
    if (!aliasId || !targetId || !skillPresets[targetId]) return;
    skillPresets[aliasId] = {
      ...deepClone(skillPresets[targetId]),
      id: aliasId,
      alias_of: targetId,
    };
  });

  const archetypeSeeds = deepClone(injectedConfig.compatibility?.archetypes || {});
  const archetypes = Object.entries(archetypeSeeds).reduce((acc, [archetypeId, seed]) => {
    acc[archetypeId] = {
      id: archetypeId,
      label: seed?.label || archetypeId,
      description: seed?.description || '',
      negotiation: seed?.negotiation_preset_id || 'equilibrado',
      vision: seed?.vision_preset_id || 'balanceado',
      personality: seed?.personality_preset_id || 'equilibrado',
      skill: seed?.skill_preset_id || 'solido',
      tablePresetId: archetypeId === 'legacy_open' ? 'legacy_open_table' : 'stage6_profile_table',
      overrides: deepClone(seed?.overrides || {}),
    };
    return acc;
  }, {});

  if (!archetypes.legacy_open) {
    archetypes.legacy_open = {
      id: 'legacy_open',
      label: 'Legado atual',
      description: 'Compatibilidade do baseline V2 para comparacao com a mesa anterior.',
      negotiation: 'equilibrado',
      vision: 'balanceado',
      personality: 'equilibrado',
      skill: 'legacy_normal',
      tablePresetId: 'legacy_open_table',
      overrides: {},
    };
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
      description: 'Mantem a negociacao dinamica com presets independentes de negociacao, visao, personalidade e habilidades.',
      negotiation_enabled: true,
      dynamic_pricing: true,
      human_negotiation_enabled: true,
      negotiation_phases: ['interest', 'opening_offer', 'counter_offer', 'closing'],
      default_markup_mode: 'ai_dynamic_overlap',
      buy_openness: 0.85,
      sell_openness: 0.6,
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

  function resolveNegotiationPresetId(presetId) {
    return negotiationPresets[presetId] ? presetId : 'equilibrado';
  }

  function resolveVisionPresetId(presetId) {
    return visionPresets[presetId] ? presetId : 'balanceado';
  }

  function resolvePersonalityPresetId(presetId) {
    return personalityPresets[presetId] ? presetId : 'equilibrado';
  }

  function resolveSkillPresetId(presetId) {
    return skillPresets[presetId] ? presetId : 'solido';
  }

  function buildProfile({ archetypeId = 'legacy_open', overrides = {} } = {}) {
    const archetype = archetypes[archetypeId] || archetypes.legacy_open;
    const negotiationPresetId = resolveNegotiationPresetId(archetype.negotiation);
    const visionPresetId = resolveVisionPresetId(archetype.vision);
    const personalityPresetId = resolvePersonalityPresetId(archetype.personality);
    const skillPresetId = resolveSkillPresetId(archetype.skill);
    const profile = {
      id: archetype.id,
      label: archetype.label,
      description: archetype.description,
      negotiation: deepClone(negotiationPresets[negotiationPresetId]),
      vision: deepClone(visionPresets[visionPresetId]),
      personality: deepClone(personalityPresets[personalityPresetId]),
      skill: deepClone(skillPresets[skillPresetId]),
      metadata: {
        archetype_id: archetype.id,
        negotiation_preset_id: negotiationPresetId,
        vision_preset_id: visionPresetId,
        personality_preset_id: personalityPresetId,
        skill_preset_id: skillPresetId,
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
    version: injectedConfig.version || 'ai-presets-v2',
    description: injectedConfig.description || '',
    parameterGroups,
    parameterDefinitions,
    marketRegimes,
    negotiationPresets,
    visionPresets,
    personalityPresets,
    skillPresets,
    presetAliases,
    skillAliases,
    archetypes,
    tablePresets,
    buildProfile,
    buildTableConfig,
    assignProfile,
  };
})(window);
