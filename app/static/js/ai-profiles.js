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
  };

  const archetypes = {
    legacy_open: {
      id: 'legacy_open',
      label: 'Legacy Aberto',
      description: 'Replica o comportamento atual das UIs legado, sem nova IA ativa.',
      negotiation: 'open_market',
      vision: 'legacy_accumulator',
      personality: 'legacy_aggressive',
      skill: 'legacy_normal',
      overrides: {},
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
      },
    };
    return deepMerge(profile, overrides);
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
    negotiationPresets,
    visionPresets,
    personalityPresets,
    skillPresets,
    archetypes,
    buildProfile,
    assignProfile,
  };
})(window);
