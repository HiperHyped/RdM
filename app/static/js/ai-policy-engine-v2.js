(function initRdMAiPolicyEngine(global) {
  const profileLib = global.RdMAiProfiles;
  const rulesLib = global.__RDM_AI_V2_RULES__ || {};
  const PROFILE_SIGNAL_PATHS = {
    buy_openness: ['negotiation', 'buy_openness'],
    sell_openness: ['negotiation', 'sell_openness'],
    premium_tolerance: ['negotiation', 'premium_tolerance'],
    discount_tolerance: ['negotiation', 'discount_tolerance'],
    strategic_lock: ['negotiation', 'strategic_lock'],
    desperation_discount: ['negotiation', 'desperation_discount'],
    focus_port: ['vision', 'weight_port'],
    focus_permission: ['vision', 'weight_permission'],
    focus_toll: ['vision', 'weight_toll'],
    focus_monopoly: ['vision', 'weight_monopoly'],
    focus_origin_bonus: ['vision', 'weight_origin_bonus'],
    planning_horizon: ['vision', 'planning_horizon_turns'],
    cash_reserve_ratio: ['personality', 'cash_reserve_ratio'],
    risk_tolerance: ['personality', 'risk_tolerance'],
    impulsiveness: ['personality', 'impulsiveness'],
    coupon_patience: ['personality', 'coupon_patience'],
    asset_attachment: ['personality', 'asset_attachment'],
    foresight: ['skill', 'foresight'],
    skill_noise: ['skill', 'evaluation_noise'],
    liquidity_discipline: ['skill', 'liquidity_discipline'],
    combo_awareness: ['skill', 'combo_awareness'],
    timing_quality: ['skill', 'timing_quality'],
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function numeric(value, fallback = 0) {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  }

  function money(value) {
    return Math.max(0, Math.round(numeric(value, 0)));
  }

  function toSnakeCase(value) {
    return String(value || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  function activeRulesConfig() {
    return rulesLib && typeof rulesLib === 'object' ? rulesLib : {};
  }

  function getDecisionRule(familyId, decisionId) {
    return activeRulesConfig()?.decision_families?.[familyId]?.decisions?.[decisionId] || null;
  }

  function getDerivedSignalDefinition(signalId) {
    return activeRulesConfig()?.derived_signals?.[signalId] || null;
  }

  function getProfileSignalValue(profile, signalId) {
    const path = PROFILE_SIGNAL_PATHS[signalId];
    if (!path) return undefined;
    return path.reduce((current, key) => current?.[key], profile);
  }

  function clampFromDefinition(value, clampDefinition) {
    if (!clampDefinition || typeof clampDefinition !== 'object') return value;
    const min = clampDefinition.min === undefined ? -Infinity : numeric(clampDefinition.min, -Infinity);
    const max = clampDefinition.max === undefined ? Infinity : numeric(clampDefinition.max, Infinity);
    return clamp(value, min, max);
  }

  function evaluateWeightedTerm(term, env, stack = []) {
    if (!term || typeof term !== 'object') return 0;
    const signalValue = term.signal ? resolveSignalValue(term.signal, env, stack) : numeric(term.constant, 0);
    return signalValue * numeric(term.weight, 1);
  }

  function resolveValueNode(node, env, stack = []) {
    if (!node || typeof node !== 'object') return numeric(node, 0);
    if (node.constant !== undefined) return numeric(node.constant, 0);
    if (node.signal) return resolveSignalValue(node.signal, env, stack);
    if (node.type === 'weighted_sum') {
      const sum = (node.terms || []).reduce((total, term) => total + evaluateWeightedTerm(term, env, stack), 0);
      return clampFromDefinition(sum, node.clamp);
    }
    if (node.type === 'max') {
      return Math.max(...(node.candidates || []).map((candidate) => resolveValueNode(candidate, env, stack)));
    }
    return 0;
  }

  function evaluateDerivedSignal(signalId, definition, env, stack = []) {
    if (!definition || typeof definition !== 'object') return 0;
    if (definition.type === 'asset_kind_lookup') {
      const assetKind = String(env.assetKind || env.runtimeSignals?.asset_kind || 'other');
      const resolvedEntry = definition.mapping?.[assetKind] || definition.mapping?.other || { constant: 0 };
      return resolvedEntry.signal
        ? resolveSignalValue(resolvedEntry.signal, env, stack.concat(signalId))
        : numeric(resolvedEntry.constant, 0);
    }
    if (definition.type === 'weighted_sum') {
      const sum = (definition.terms || []).reduce((total, term) => total + evaluateWeightedTerm(term, env, stack.concat(signalId)), 0);
      return clampFromDefinition(sum, definition.clamp);
    }
    if (definition.type === 'weighted_product') {
      const product = (definition.factors || []).reduce((total, factor) => {
        const value = factor.signal ? resolveSignalValue(factor.signal, env, stack.concat(signalId)) : numeric(factor.constant, 0);
        return total * (value * numeric(factor.weight, 1));
      }, 1);
      return clampFromDefinition(product, definition.clamp);
    }
    if (definition.type === 'normalized_ratio') {
      const numerator = resolveValueNode(definition.numerator, env, stack.concat(signalId));
      const denominator = Math.max(0.0001, resolveValueNode(definition.denominator, env, stack.concat(signalId)));
      return clampFromDefinition(numerator / denominator, definition.clamp);
    }
    return 0;
  }

  function resolveSignalValue(signalId, env, stack = []) {
    const cache = env.signalCache || (env.signalCache = {});
    if (Object.prototype.hasOwnProperty.call(cache, signalId)) {
      return cache[signalId];
    }
    if (stack.includes(signalId)) {
      return 0;
    }
    const directProfileValue = getProfileSignalValue(env.profile || null, signalId);
    if (directProfileValue !== undefined) {
      cache[signalId] = numeric(directProfileValue, 0);
      return cache[signalId];
    }
    if (env.runtimeSignals && Object.prototype.hasOwnProperty.call(env.runtimeSignals, signalId)) {
      cache[signalId] = numeric(env.runtimeSignals[signalId], 0);
      return cache[signalId];
    }
    const derivedDefinition = getDerivedSignalDefinition(signalId);
    if (derivedDefinition) {
      cache[signalId] = evaluateDerivedSignal(signalId, derivedDefinition, env, stack.concat(signalId));
      return cache[signalId];
    }
    cache[signalId] = 0;
    return 0;
  }

  function evaluateNoise(noiseDefinition, env) {
    if (!noiseDefinition || typeof noiseDefinition !== 'object') return 0;
    const amplitude = Math.max(0, numeric(noiseDefinition.amplitude, 0));
    if (amplitude <= 0) return 0;
    const signalValue = clamp(resolveSignalValue(noiseDefinition.signal || 'skill_noise', env), 0, 1);
    if (signalValue <= 0) return 0;
    return ((Math.random() * 2) - 1) * signalValue * amplitude;
  }

  function evaluateFormulaDefinition(definition, env) {
    if (!definition || typeof definition !== 'object') return 0;
    if (definition.type === 'weighted_sum_with_context') {
      let total = numeric(definition.base, 0);
      total += (definition.terms || []).reduce((sum, term) => sum + evaluateWeightedTerm(term, env), 0);
      total += (definition.context_adjustments || []).reduce((sum, term) => sum + evaluateWeightedTerm(term, env), 0);
      return clampFromDefinition(total, definition.clamp);
    }
    if (definition.type === 'weighted_sum_with_noise') {
      let total = (definition.terms || []).reduce((sum, term) => sum + evaluateWeightedTerm(term, env), 0);
      total += evaluateNoise(definition.noise, env);
      return clampFromDefinition(total, definition.clamp);
    }
    if (definition.type === 'weighted_sum') {
      const total = (definition.terms || []).reduce((sum, term) => sum + evaluateWeightedTerm(term, env), 0);
      return clampFromDefinition(total, definition.clamp);
    }
    if (definition.type === 'price_multiplier') {
      const baseValue = resolveValueNode(definition.base, env);
      const multiplier = 1 + (definition.terms || []).reduce((sum, term) => sum + evaluateWeightedTerm(term, env), 0);
      return baseValue * multiplier;
    }
    return 0;
  }

  function buildRuleEvaluationEnv({ profile = null, runtimeSignals = {}, assetKind = 'other' } = {}) {
    return {
      profile,
      runtimeSignals,
      assetKind,
      signalCache: {},
    };
  }

  function normalizeRuleScore(value) {
    return clamp(numeric(value, 0), 0, 1);
  }

  function resolveConditionTarget(condition, env) {
    if (!condition || typeof condition !== 'object') return 0;
    if (condition.value !== undefined) return numeric(condition.value, 0);
    if (condition.constant !== undefined) return numeric(condition.constant, 0);
    if (condition.signal) return resolveSignalValue(condition.signal, env);
    return 0;
  }

  function evaluateRuleCondition(condition, env) {
    if (!condition || typeof condition !== 'object') return true;
    const operator = String(condition.operator || '>=').trim();
    const left = condition.signal ? resolveSignalValue(condition.signal, env) : numeric(condition.left, 0);
    const right = resolveConditionTarget(condition.target !== undefined ? condition.target : condition.value_definition, env)
      || resolveConditionTarget(condition, env);
    if (operator === '>=') return left >= right;
    if (operator === '>') return left > right;
    if (operator === '<=') return left <= right;
    if (operator === '<') return left < right;
    if (operator === '==') return Math.abs(left - right) <= 0.000001;
    if (operator === '!=') return Math.abs(left - right) > 0.000001;
    return true;
  }

  function evaluateRuleConditions(conditions, env) {
    if (!Array.isArray(conditions) || !conditions.length) return true;
    return conditions.every((condition) => evaluateRuleCondition(condition, env));
  }

  function buildCouponRuntimeSignals({
    signals = {},
    reserveTarget = 0,
    cash = 0,
    charge = 0,
    freightValue = 0,
    candidateCount = 0,
    remainingRounds = 0,
    remainingSteps = 0,
    fuelStopsRemaining = 0,
    couponAgeTurns = 0,
    couponExpirationTurns = 50,
    turnsUntilCouponExpiry = 0,
  } = {}) {
    const runtimeSignals = {
      reserve_cash_target_amount: reserveTarget,
      current_cash: cash,
      cash_after_action: Math.max(0, cash - charge),
      action_cost: charge,
      charge,
      candidate_count: candidateCount,
      remaining_rounds: remainingRounds,
      remaining_steps: remainingSteps,
      fuel_stops_remaining: fuelStopsRemaining,
      mandatory_toll_flag: signals.mandatoryToll ? 1 : numeric(signals.mandatoryTollFlag, 0),
      owner_present_flag: signals.ownerPresent ? 1 : numeric(signals.ownerPresentFlag, 0),
      owner_monopoly_flag: signals.ownerMonopoly ? 1 : numeric(signals.ownerMonopolyFlag, 0),
      freight_value: freightValue,
      coupon_age_turns: couponAgeTurns,
      coupon_expiration_turns: couponExpirationTurns,
      turns_until_coupon_expiry: turnsUntilCouponExpiry,
      route_unlock_gain_norm: clamp(numeric(signals.routeUnlockGainNorm, 0), 0, 1),
      region_completion_after_action_norm: clamp(numeric(signals.regionCompletionRatio, 0), 0, 1),
      opponent_region_completion_norm: clamp(numeric(signals.opponentRegionCompletionRatio, 0), 0, 1),
      opponent_income_swing_norm: clamp(numeric(signals.opponentIncomeSwingNorm, signals.ownerPresent ? 0.75 : 0.15), 0, 1),
    };
    Object.entries(signals || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const signalId = toSnakeCase(key);
      if (!signalId || Object.prototype.hasOwnProperty.call(runtimeSignals, signalId)) return;
      runtimeSignals[signalId] = numeric(value, 0);
    });
    return runtimeSignals;
  }

  function estimateLateGameSignal(signals = {}) {
    const explicit = numeric(signals.lateGame, -1);
    if (explicit >= 0) return clamp(explicit, 0, 1);
    const roundsElapsed = Math.max(0, numeric(signals.roundsElapsed, 0));
    const targetRounds = Math.max(1, numeric(signals.targetRounds, 4));
    return clamp(roundsElapsed / targetRounds, 0, 1);
  }

  function negotiationAssetLabel(card = null) {
    return card?.kind === 'toll' ? `o pedagio ${card?.code || '--'}` : `o porto ${card?.code || '--'}`;
  }

  function formatNegotiationText(template, values = {}) {
    return String(template || '').replace(/\{([a-z_]+)\}/gi, (_, key) => {
      const value = values[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }

  function negotiationTextContext({ card = null, owner = null, buyer = null, amount = 0 } = {}) {
    return {
      asset: negotiationAssetLabel(card),
      owner_name: owner?.name || 'O dono',
      owner_name_lower: owner?.name || 'o dono',
      buyer_name: buyer?.name || 'O comprador',
      buyer_name_lower: buyer?.name || 'o comprador',
      amount: amount ? money(amount) : 0,
    };
  }

  function negotiationDialogueTemplate(decisionId, section, key, fallback) {
    return getDecisionRule('negotiation', decisionId)?.dialogue?.[section]?.[key]
      || getDecisionRule('negotiation', decisionId)?.dialogue?.[section]?.default
      || fallback;
  }

  function normalizedPlanningHorizon(profile = null) {
    return clamp(numeric(profile?.vision?.planning_horizon_turns, 0), 0, 1);
  }

  function focusIntensity(weight, neutralPoint = 0.5) {
    return clamp((numeric(weight, neutralPoint) - neutralPoint) / Math.max(0.001, 1 - neutralPoint), 0, 1);
  }

  function evaluationNoise(profile = null, amplitude = 0.1) {
    const noiseLevel = clamp(numeric(profile?.skill?.evaluation_noise, 0), 0, 1);
    if (noiseLevel <= 0 || amplitude <= 0) return 0;
    return ((Math.random() * 2) - 1) * noiseLevel * amplitude;
  }

  function resolveNegotiationProfileFlags(profile = null) {
    const negotiation = profile?.negotiation || {};
    const buyOpenness = clamp(numeric(negotiation.buy_openness, 1), 0, 1);
    const sellOpenness = clamp(numeric(negotiation.sell_openness, 1), 0, 1);
    const strategicLock = clamp(numeric(negotiation.strategic_lock, 0), 0, 1);
    const discountTolerance = clamp(numeric(negotiation.discount_tolerance, 1), 0, 1);
    const premiumTolerance = clamp(numeric(negotiation.premium_tolerance, 1), 0, 1);
    const thresholdRule = getDecisionRule('negotiation', 'profile_flags');
    const thresholds = thresholdRule?.thresholds || {};
    const tradeLocked = buyOpenness <= numeric(thresholds.trade_locked_buy_openness_max, 0.03)
      && sellOpenness <= numeric(thresholds.trade_locked_sell_openness_max, 0.03)
      && strategicLock >= numeric(thresholds.trade_locked_strategic_lock_min, 0.95);
    const buyBlocked = buyOpenness <= numeric(thresholds.buy_blocked_buy_openness_max, 0.03)
      && premiumTolerance <= numeric(thresholds.buy_blocked_premium_tolerance_max, 0.12);
    const sellBlocked = sellOpenness <= numeric(thresholds.sell_blocked_sell_openness_max, 0.03)
      && strategicLock >= numeric(thresholds.sell_blocked_strategic_lock_min, 0.95)
      && discountTolerance <= numeric(thresholds.sell_blocked_discount_tolerance_max, 0.08);
    return {
      tradeLocked,
      buyBlocked,
      sellBlocked,
      forceBuy: buyOpenness >= numeric(thresholds.force_buy_buy_openness_min, 0.94)
        && premiumTolerance >= numeric(thresholds.force_buy_premium_tolerance_min, 0.78)
        && strategicLock <= numeric(thresholds.force_buy_strategic_lock_max, 0.18),
      forceSell: sellOpenness >= numeric(thresholds.force_sell_sell_openness_min, 0.92)
        && discountTolerance >= numeric(thresholds.force_sell_discount_tolerance_min, 0.78)
        && strategicLock <= numeric(thresholds.force_sell_strategic_lock_max, 0.18),
      tradeForced: buyOpenness >= numeric(thresholds.trade_forced_buy_openness_min, 0.9)
        && sellOpenness >= numeric(thresholds.trade_forced_sell_openness_min, 0.9)
        && strategicLock <= numeric(thresholds.trade_forced_strategic_lock_max, 0.16),
      buyOpenness,
      sellOpenness,
      strategicLock,
      discountTolerance,
      premiumTolerance,
    };
  }

  function buildBlockedOwnedNegotiationDecision({ player, owner = null, card = null, price = 0, resolvedContext, reason = 'trade_blocked' } = {}) {
    const finalPrice = money(price || card?.price || 0);
    return {
      accepted: false,
      shouldBuy: false,
      mode: 'blocked',
      phase: 'rejected',
      ownerId: owner?.id || null,
      owner,
      card,
      basePrice: money(card?.price || price || 0),
      listPrice: finalPrice,
      buyerMax: money(player?.cash || 0),
      sellerMin: null,
      finalPrice: null,
      rejectionReason: reason,
      profileId: resolvedContext.profile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'stage6_profile_table',
      context: resolvedContext,
      transcript: [
        {
          phase: 'interest',
          accepted: false,
          amount: 0,
          reason,
        },
        {
          phase: 'closing',
          accepted: false,
          amount: 0,
          reason,
        },
      ],
    };
  }

  function buildBlockedOwnedBarterDecision({ resolvedContext, reason = 'trade_locked' } = {}) {
    return {
      accepted: false,
      reason,
      offeredEntries: [],
      context: resolvedContext,
    };
  }

  function currentPurchasePolicy(player) {
    return player?.purchase_policy || 'always';
  }

  function buildFallbackTableConfig(overrides = {}) {
    return {
      id: 'legacy_open_table',
      label: 'Mesa Legacy Aberto',
      marketRegime: { id: 'legacy_open_market', dynamic_pricing: false },
      defaultRobotProfileId: 'legacy_open',
      defaultSkillPresetId: 'legacy_normal',
      baselineLocked: true,
      setupDefaults: {},
      ...overrides,
    };
  }

  function resolveTableConfig(tableConfig = null) {
    if (tableConfig) return tableConfig;
    if (profileLib?.buildTableConfig) {
      return profileLib.buildTableConfig({ presetId: 'legacy_open_table' });
    }
    return buildFallbackTableConfig();
  }

  function buildLegacyBaseline(overrides = {}) {
    if (profileLib?.buildTableConfig) {
      return profileLib.buildTableConfig({
        presetId: 'legacy_open_table',
        overrides,
      });
    }
    return buildFallbackTableConfig(overrides);
  }

  function buildStageTableConfig({ presetId = 'stage4_dynamic_negotiation_table', overrides = {} } = {}) {
    if (profileLib?.buildTableConfig) {
      return profileLib.buildTableConfig({
        presetId,
        overrides,
      });
    }
    return buildFallbackTableConfig({
      id: presetId,
      marketRegime: {
        id: 'stage4_robot_dynamic_market',
        dynamic_pricing: true,
        negotiation_enabled: true,
        negotiation_phases: ['interest', 'opening_offer', 'counter_offer', 'closing'],
      },
      baselineLocked: false,
      ...overrides,
    });
  }

  function clonePreset(preset) {
    return preset ? JSON.parse(JSON.stringify(preset)) : null;
  }

  function deepMergeLocal(base, overrides) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      return overrides === undefined ? base : overrides;
    }
    const seed = (base && typeof base === 'object' && !Array.isArray(base)) ? { ...base } : {};
    Object.entries(overrides).forEach(([key, value]) => {
      const current = seed[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        seed[key] = deepMergeLocal(current, value);
        return;
      }
      seed[key] = value;
    });
    return seed;
  }

  function resolveRobotArchetypeId(player, tableConfig = null, robotIndex = 0) {
    const resolvedTableConfig = resolveTableConfig(tableConfig);
    if (player?.ai_manual_profile && player?.ai_archetype_id) {
      return player.ai_archetype_id;
    }
    const order = Array.isArray(resolvedTableConfig.robotArchetypeOrder)
      ? resolvedTableConfig.robotArchetypeOrder.filter(Boolean)
      : [];
    if (order.length) {
      return order[Math.max(0, robotIndex) % order.length];
    }
    return player?.ai_archetype_id || resolvedTableConfig.defaultRobotProfileId || 'legacy_open';
  }

  function buildProfileOverridesForTable(player, tableConfig = null) {
    const tableOverrides = clonePreset(tableConfig?.defaultProfileOverrides || {}) || {};
    const baseOverrides = deepMergeLocal(tableOverrides, clonePreset(player?.ai_profile_overrides || {}) || {});
    const hasManualSkillOverride = Boolean(
      player?.ai_manual_profile
      && baseOverrides.skill
      && typeof baseOverrides.skill === 'object'
      && Object.keys(baseOverrides.skill).length
    );
    const forcedSkillPresetId = String(tableConfig?.forcedSkillPresetId || '').trim();
    const forcedSkillPreset = forcedSkillPresetId && profileLib?.skillPresets
      ? clonePreset(profileLib.skillPresets[forcedSkillPresetId])
      : null;
    if (!forcedSkillPreset || hasManualSkillOverride) return baseOverrides;
    return {
      ...baseOverrides,
      skill: forcedSkillPreset,
      metadata: {
        ...(baseOverrides.metadata || {}),
        skill_preset_id: forcedSkillPresetId,
      },
    };
  }

  function ensureProfile(player, tableConfig = null) {
    if (!player || player.is_human) return null;
    const resolvedTableConfig = resolveTableConfig(tableConfig);
    const resolvedArchetypeId = player.ai_archetype_id || resolvedTableConfig.defaultRobotProfileId || 'legacy_open';
    if (player.ai_profile && player.ai_profile_id === resolvedArchetypeId && player.ai_table_config_id === resolvedTableConfig.id) {
      return player.ai_profile;
    }
    if (!profileLib?.assignProfile) return player.ai_profile || null;
    const profile = profileLib.assignProfile(player, {
      archetypeId: resolvedArchetypeId,
      overrides: buildProfileOverridesForTable(player, resolvedTableConfig),
    });
    player.ai_archetype_id = resolvedArchetypeId;
    player.ai_table_config_id = resolvedTableConfig.id;
    player.ai_market_regime_id = resolvedTableConfig.marketRegime?.id || 'legacy_open_market';
    player.ai_skill_id = profile?.metadata?.skill_preset_id || resolvedTableConfig.defaultSkillPresetId || 'legacy_normal';
    player.ai_profile_label = profile?.label || resolvedArchetypeId;
    return profile;
  }

  function applyTableConfigToPlayers(players = [], tableConfig = null) {
    const resolvedTableConfig = resolveTableConfig(tableConfig);
    const resolvedPlayers = Array.isArray(players) ? players : [];
    let robotIndex = 0;
    resolvedPlayers.forEach((player) => {
      if (!player) return;
      player.ai_table_config_id = resolvedTableConfig.id;
      player.ai_market_regime_id = resolvedTableConfig.marketRegime?.id || 'legacy_open_market';
      if (player.is_human) return;
      if (!player.ai_manual_profile) {
        player.ai_archetype_id = resolveRobotArchetypeId(player, resolvedTableConfig, robotIndex);
      }
      ensureProfile(player, resolvedTableConfig);
      robotIndex += 1;
    });
    return resolvedTableConfig;
  }

  function applyBaselineToPlayers(players = [], tableConfig = null) {
    return applyTableConfigToPlayers(players, tableConfig);
  }

  function availablePermissionCount(player) {
    return (player?.permissions || []).filter((permission) => !permission?.mortgaged).length;
  }

  function reserveCashTarget(player, amount = 0, profile = null, reason = 'property_purchase') {
    const normalizedAmount = money(amount);
    const cash = money(player?.cash || 0);
    const decisionRule = getDecisionRule('liquidity', 'reserve_cash_target');
    if (!decisionRule?.formula_spec) {
      return money(Math.min(cash, normalizedAmount * 0.18));
    }
    const underThreat = clamp((normalizedAmount - cash) / Math.max(1, normalizedAmount || cash || 1), 0, 1);
    const aheadOnCash = clamp((cash - normalizedAmount * 1.8) / Math.max(1, normalizedAmount * 2), 0, 1);
    const lateGame = clamp(
      reason === 'redeem' ? 0.55 : (reason === 'coupon_usage' ? 0.3 : 0),
      0,
      1,
    );
    const env = buildRuleEvaluationEnv({
      profile,
      runtimeSignals: {
        under_threat: underThreat,
        ahead_on_cash: aheadOnCash,
        late_game: lateGame,
      },
    });
    const reserveRatio = normalizeRuleScore(evaluateFormulaDefinition(decisionRule.formula_spec, env));
    return money(Math.min(cash, normalizedAmount * Math.max(0.08, reserveRatio)));
  }

  function scoreBankPropertyPurchase({ player, card = null, price = 0, resolvedContext }) {
    const profile = resolvedContext.profile || null;
    const signals = resolvedContext.purchaseSignals || {};
    const normalizedPrice = money(price || card?.price || 0);
    const cash = money(player?.cash || 0);
    const cashAfter = cash - normalizedPrice;
    const propertyKind = String(signals.propertyKind || card?.kind || 'port');
    const regionOwnedRatio = clamp(numeric(signals.regionOwnedRatio, 0), 0, 1);
    const wouldCompleteMonopoly = Boolean(signals.wouldCompleteMonopoly);
    const rateFee = Math.max(0, numeric(signals.rateFee, 0));
    const rateMultiplier = Math.max(1, numeric(signals.rateMultiplier, 1));
    const freightPotential = Math.max(0, numeric(signals.freightPotential, rateFee * rateMultiplier));
    const yieldRatio = clamp(freightPotential / Math.max(1, normalizedPrice), 0, 1.35);
    const permissionCount = Math.max(0, numeric(signals.permissionCount, availablePermissionCount(player)));
    const availablePermissionCountValue = Math.max(0, numeric(signals.availablePermissionCount, 0));
    const reserveTarget = reserveCashTarget(player, normalizedPrice, profile, resolvedContext.reason || 'property_purchase');
    const reservePressure = clamp((reserveTarget - cashAfter) / Math.max(1, normalizedPrice), 0, 1.8);
    const pricePressure = clamp(normalizedPrice / Math.max(1, cash), 0, 1.6);
    const decisionRule = getDecisionRule('acquisition', 'bank_property_purchase');
    const env = buildRuleEvaluationEnv({
      profile,
      assetKind: propertyKind,
      runtimeSignals: {
        origin_control_gain_norm: clamp(
          ((resolvedContext.reason === 'origin_purchase' || resolvedContext.reason === 'post_delivery_port_purchase') ? 0.6 : 0.15)
          + Math.max(0, rateMultiplier - 1) * 0.18
          + yieldRatio * 0.18,
          0,
          1,
        ),
        region_completion_after_action_norm: clamp(regionOwnedRatio + (wouldCompleteMonopoly ? 0.35 : 0), 0, 1),
        route_unlock_gain_norm: clamp((permissionCount / 6) + (availablePermissionCountValue * 0.06), 0, 1),
        projected_income_norm: clamp(yieldRatio, 0, 1),
        cash_after_action: cashAfter,
        reserve_cash_target_amount: reserveTarget,
        action_cost: normalizedPrice,
        current_cash: cash,
      },
    });
    let score = normalizeRuleScore(evaluateFormulaDefinition(decisionRule?.scoring_formula, env));
    if (decisionRule?.price_pressure) {
      score -= reservePressure * numeric(decisionRule.price_pressure.reserve_cash_penalty, 0);
      score -= pricePressure * numeric(decisionRule.price_pressure.premium_tolerance_cap, 0);
      score += estimateLateGameSignal(signals) * numeric(decisionRule.price_pressure.late_game_relief, 0);
    }
    score = clamp(score, 0, 1);
    const threshold = numeric(decisionRule?.thresholds?.buy, 0.58);
    const shouldBuy = cash >= normalizedPrice && score >= threshold;
    return {
      shouldBuy,
      score,
      threshold,
      reserveTarget,
      pricePressure,
      reservePressure,
      yieldRatio,
    };
  }

  function scoreExtraPermissionPurchase({ player, extraCost = 0, availableCount = 0, resolvedContext }) {
    const profile = resolvedContext.profile || null;
    const signals = resolvedContext.permissionSignals || {};
    const normalizedCost = money(extraCost);
    const cash = money(player?.cash || 0);
    const cashAfter = cash - normalizedCost;
    const permissionCount = Math.max(0, numeric(signals.permissionCount, availablePermissionCount(player)));
    const bestCurrentFreight = Math.max(0, numeric(signals.bestCurrentFreight, 0));
    const bestNewPermissionFreight = Math.max(0, numeric(signals.bestNewPermissionFreight, 0));
    const reserveTarget = reserveCashTarget(player, normalizedCost, profile, resolvedContext.reason || 'extra_permission_after_delivery');
    const reservePressure = clamp((reserveTarget - cashAfter) / Math.max(1, normalizedCost), 0, 1.8);
    const upgradeRatio = clamp((bestNewPermissionFreight - bestCurrentFreight) / Math.max(1, bestCurrentFreight || bestNewPermissionFreight || 1), -0.3, 1.4);
    const decisionRule = getDecisionRule('acquisition', 'extra_permission_purchase');
    const env = buildRuleEvaluationEnv({
      profile,
      assetKind: 'permission',
      runtimeSignals: {
        open_contract_slots_pressure: clamp(1 - (permissionCount / 6), 0, 1),
        route_unlock_gain_norm: clamp(Math.max(0, upgradeRatio), 0, 1),
        cash_after_action: cashAfter,
        reserve_cash_target_amount: reserveTarget,
        action_cost: normalizedCost,
        current_cash: cash,
      },
    });
    let score = normalizeRuleScore(evaluateFormulaDefinition(decisionRule?.scoring_formula, env));
    score -= reservePressure * 0.12;
    score = clamp(score, 0, 1);
    const threshold = numeric(decisionRule?.thresholds?.buy, 0.6);
    const shouldBuy = availableCount > 0 && cash >= normalizedCost && score >= threshold;
    return {
      shouldBuy,
      score,
      threshold,
      reserveTarget,
      reservePressure,
      coverageRatio: clamp(permissionCount / 6, 0, 1),
      upgradeRatio,
    };
  }

  function buildDecisionContext(player, extra = {}) {
    const tableConfig = resolveTableConfig(extra.tableConfig || null);
    const profile = ensureProfile(player, tableConfig);
    return {
      player,
      profile,
      tableConfig,
      marketRegime: tableConfig.marketRegime || null,
      rules: extra.rules || activeRulesConfig(),
      session: extra.session || null,
      reason: extra.reason || 'legacy',
      ...extra,
    };
  }

  function decideBuyBankProperty({ player, card = null, price = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const normalizedPrice = Math.max(0, numeric(price || card?.price, 0));
    const policy = currentPurchasePolicy(player);

    if (player?.bankrupt || policy === 'never') {
      return {
        shouldBuy: false,
        accepted: false,
        policy,
        price: normalizedPrice,
        finalPrice: normalizedPrice,
        profileId: resolvedContext.profile?.id || 'legacy_open',
        tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
        context: resolvedContext,
      };
    }

    if (policy === 'random') {
      const shouldBuy = player.cash >= normalizedPrice && Math.random() >= 0.5;
      return {
        shouldBuy,
        accepted: shouldBuy,
        policy,
        price: normalizedPrice,
        finalPrice: normalizedPrice,
        profileId: resolvedContext.profile?.id || 'legacy_open',
        tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
        context: resolvedContext,
      };
    }

    const profileId = resolvedContext.profile?.id || 'legacy_open';
    if (profileId === 'legacy_open') {
      const shouldBuy = player.cash >= normalizedPrice;
      return {
        shouldBuy,
        accepted: shouldBuy,
        policy,
        price: normalizedPrice,
        finalPrice: normalizedPrice,
        profileId,
        tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
        context: resolvedContext,
      };
    }

    const scored = scoreBankPropertyPurchase({
      player,
      card,
      price: normalizedPrice,
      resolvedContext,
    });
    return {
      shouldBuy: Boolean(scored.shouldBuy),
      accepted: Boolean(scored.shouldBuy),
      policy,
      price: normalizedPrice,
      finalPrice: normalizedPrice,
      score: scored.score,
      threshold: scored.threshold,
      reserveTarget: scored.reserveTarget,
      profileId,
      tableConfigId: resolvedContext.tableConfig?.id || 'stage6_profile_table',
      context: resolvedContext,
    };
  }

  function legacyOwnedPropertyNegotiation({ player, owner = null, card = null, price = 0, resolvedContext }) {
    const baseDecision = decideBuyBankProperty({
      player,
      card,
      price,
      context: resolvedContext,
    });
    const accepted = Boolean(owner && owner.id !== player?.id && baseDecision.shouldBuy);
    const finalPrice = money(price || card?.price || 0);
    return {
      ...baseDecision,
      accepted,
      shouldBuy: accepted,
      mode: 'legacy',
      phase: accepted ? 'closing' : 'rejected',
      ownerId: owner?.id || null,
      basePrice: money(card?.price || price || 0),
      listPrice: finalPrice,
      buyerMax: money(player?.cash || 0),
      sellerMin: finalPrice,
      finalPrice,
      rejectionReason: accepted ? null : 'legacy_rejected',
      transcript: [
        {
          phase: 'closing',
          accepted,
          amount: accepted ? finalPrice : 0,
          reason: accepted ? 'legacy_fixed_price' : 'legacy_rejected',
        },
      ],
    };
  }

  function ownedPropertyNegotiationFloor(basePrice, {
    propertyKind = 'port',
    sellerWouldLoseMonopoly = false,
    sellerRegionBeforeRatio = 0,
    sellerRegionAfterRatio = 0,
  } = {}) {
    const normalizedBasePrice = Math.max(1, money(basePrice));
    const monopolyLossPressure = sellerWouldLoseMonopoly && propertyKind === 'port'
      ? clamp(
        Math.max(0, sellerRegionBeforeRatio - sellerRegionAfterRatio) + sellerRegionBeforeRatio,
        0,
        1.5,
      )
      : 0;
    const premiumRatio = 0.04
      + (sellerWouldLoseMonopoly && propertyKind === 'port' ? 0.08 : 0)
      + monopolyLossPressure * 0.10;
    return money(Math.max(
      normalizedBasePrice + 1,
      Math.ceil(normalizedBasePrice * (1 + premiumRatio)),
    ));
  }

  function dynamicOwnedPropertyNegotiation({ player, owner = null, card = null, price = 0, resolvedContext }) {
    const buyerProfile = resolvedContext.profile || ensureProfile(player, resolvedContext.tableConfig);
    const ownerProfile = ensureProfile(owner, resolvedContext.tableConfig);
    const sellerFlags = resolveNegotiationProfileFlags(ownerProfile);
    if (sellerFlags.tradeLocked || sellerFlags.sellBlocked) {
      const sessionRule = getDecisionRule('negotiation', 'human_buy_negotiation');
      const closedReason = sellerFlags.tradeLocked ? 'trade_locked' : 'seller_closed_market';
      return {
        ...legacyOwnedPropertyNegotiation({
          player,
          owner,
          card,
          price,
          resolvedContext,
        }),
        accepted: false,
        shouldBuy: false,
        canNegotiate: false,
        currentAsk: money(price || card?.price || 0),
        sellerLine: humanNegotiationReplyLine(closedReason, { card, owner }),
        sellerStanceId: 'irredutivel',
        sellerStanceLabel: 'Postura fechada',
        maxRounds: Math.max(1, numeric(sessionRule?.session_limits?.max_rounds, 4)),
        round: 0,
        rejectionReason: closedReason,
      };
    }
    const signals = resolvedContext.negotiationSignals || {};
    const basePrice = Math.max(1, money(card?.price || price || 0));
    const listPrice = Math.max(basePrice, money(price || basePrice));
    const mortgageFloor = Math.max(money(signals.mortgageFloor || 0), Math.floor(basePrice * 0.5));
    const propertyKind = String(signals.propertyKind || card?.kind || 'port');
    const ownerCharge = Math.max(0, numeric(signals.ownerCharge, 0));
    const rateFee = Math.max(0, numeric(signals.rateFee, 0));
    const rateMultiplier = Math.max(1, numeric(signals.rateMultiplier, 1));
    const freightPotential = Math.max(0, numeric(signals.freightPotential, rateFee * rateMultiplier));
    const buyerCash = Math.max(0, numeric(player?.cash, 0));
    const ownerCash = Math.max(0, numeric(owner?.cash, 0));
    const buyerRegionBeforeRatio = clamp(numeric(signals.buyerRegionBeforeRatio, 0), 0, 1);
    const buyerRegionAfterRatio = clamp(numeric(signals.buyerRegionAfterRatio, buyerRegionBeforeRatio), 0, 1);
    const sellerRegionBeforeRatio = clamp(numeric(signals.sellerRegionBeforeRatio, 0), 0, 1);
    const sellerRegionAfterRatio = clamp(numeric(signals.sellerRegionAfterRatio, sellerRegionBeforeRatio), 0, 1);
    const buyerWouldCompleteMonopoly = Boolean(signals.buyerWouldCompleteMonopoly);
    const sellerWouldLoseMonopoly = Boolean(signals.sellerWouldLoseMonopoly);
    const strategicSellerFloor = ownedPropertyNegotiationFloor(basePrice, {
      propertyKind,
      sellerWouldLoseMonopoly,
      sellerRegionBeforeRatio,
      sellerRegionAfterRatio,
    });
    const reason = String(resolvedContext.reason || 'owned_property_negotiation');
    const normalizedYield = clamp((Math.max(ownerCharge, freightPotential * 0.35)) / basePrice, 0, 1);
    const interestRule = getDecisionRule('negotiation', 'owned_property_interest');
    const priceRule = getDecisionRule('negotiation', 'owned_property_price_band');
    const buyerEnv = buildRuleEvaluationEnv({
      profile: buyerProfile,
      assetKind: propertyKind,
      runtimeSignals: {
        origin_control_gain_norm: clamp(((reason === 'post_delivery_port_negotiation') ? 0.65 : 0.2) + Math.max(0, rateMultiplier - 1) * 0.18, 0, 1),
        region_completion_after_action_norm: clamp(buyerRegionAfterRatio + (buyerWouldCompleteMonopoly ? 0.25 : 0), 0, 1),
        route_unlock_gain_norm: clamp((propertyKind === 'port' ? 0.3 : 0.18) + normalizedYield * 0.18, 0, 1),
        projected_income_norm: normalizedYield,
        cash_after_action: Math.max(0, buyerCash - basePrice),
        reserve_cash_target_amount: reserveCashTarget(player, basePrice, buyerProfile, 'owned_property_negotiation'),
        action_cost: basePrice,
        current_cash: buyerCash,
        seller_lock: clamp(numeric(ownerProfile?.negotiation?.strategic_lock, 0) + (sellerWouldLoseMonopoly ? 0.2 : 0), 0, 1),
        buyer_attachment: clamp(numeric(buyerProfile?.personality?.asset_attachment, 0.3), 0, 1),
      },
    });
    const interestScore = normalizeRuleScore(evaluateFormulaDefinition(interestRule?.scoring_formula, buyerEnv));
    const sellerEnv = buildRuleEvaluationEnv({
      profile: ownerProfile,
      assetKind: propertyKind,
      runtimeSignals: {
        origin_control_gain_norm: clamp((reason === 'stop_port_negotiation' ? 0.35 : 0.12) + normalizedYield * 0.14, 0, 1),
        region_completion_after_action_norm: clamp(sellerRegionBeforeRatio - sellerRegionAfterRatio + (sellerWouldLoseMonopoly ? 0.35 : 0), 0, 1),
        route_unlock_gain_norm: clamp((propertyKind === 'port' ? 0.2 : 0.1) + normalizedYield * 0.08, 0, 1),
        projected_income_norm: normalizedYield,
        cash_after_action: ownerCash + basePrice,
        reserve_cash_target_amount: reserveCashTarget(owner, basePrice, ownerProfile, 'owned_property_negotiation'),
        action_cost: basePrice,
        current_cash: ownerCash,
        seller_lock: clamp(numeric(ownerProfile?.negotiation?.strategic_lock, 0) + (sellerWouldLoseMonopoly ? 0.2 : 0), 0, 1),
        buyer_attachment: clamp(numeric(buyerProfile?.personality?.asset_attachment, 0.3), 0, 1),
        interest_score: interestScore,
        base_price: basePrice,
      },
    });
    buyerEnv.runtimeSignals.interest_score = interestScore;
    buyerEnv.runtimeSignals.base_price = basePrice;
    const buyerMax = money(Math.min(buyerCash, evaluateFormulaDefinition(priceRule?.price_formula?.buyer_max, buyerEnv)));
    const sellerMin = money(Math.max(
      mortgageFloor * 1.1,
      strategicSellerFloor,
      evaluateFormulaDefinition(priceRule?.price_formula?.seller_min, sellerEnv),
    ));
    const overlap = buyerMax - sellerMin;
    const minimumOverlap = basePrice * Math.max(0, numeric(priceRule?.thresholds?.acceptable_overlap, 0));
    const buyerAggression = clamp(0.25 + interestScore * 0.45, 0.18, 0.85);
    const sellerAttachment = clamp(numeric(ownerProfile?.personality?.asset_attachment, 0.3), 0, 1);
    const sellerFlexibility = clamp(
      numeric(ownerProfile?.negotiation?.sell_openness, 0.5) * 0.55
      + numeric(ownerProfile?.negotiation?.desperation_discount, 0.5) * 0.25,
      0.12,
      0.78,
    );
    const buyerOpening = buyerMax >= strategicSellerFloor
      ? money(clamp(
          basePrice + Math.max(0, (buyerMax - basePrice) * (0.34 + buyerAggression * 0.22)),
          strategicSellerFloor,
          Math.max(strategicSellerFloor, buyerMax),
        ))
      : 0;
    const sellerCounter = money(Math.max(
      sellerMin,
      Math.min(
        Math.max(
          strategicSellerFloor,
          listPrice,
          sellerMin + Math.max(0, (buyerMax - sellerMin) * (0.32 + sellerFlexibility * 0.14 + sellerAttachment * 0.10)),
        ),
        buyerCash,
      ),
    ));

    let accepted = overlap >= minimumOverlap && buyerMax >= sellerMin;
    let finalPrice = null;
    let rejectionReason = null;

    if (!accepted) {
      rejectionReason = buyerMax < sellerMin ? 'no_overlap' : 'spread_too_small';
    } else {
      finalPrice = money(clamp(
        ((sellerMin + buyerMax) / 2) + ((sellerAttachment - buyerAggression) * basePrice * 0.04),
        sellerMin,
        buyerMax,
      ));
      if (finalPrice > buyerCash || finalPrice <= 0) {
        accepted = false;
        finalPrice = null;
        rejectionReason = 'insufficient_cash';
      }
    }

    const transcript = [
      {
        phase: 'interest',
        accepted,
        buyerMax,
        sellerMin,
        overlap,
        minimumOverlap,
        reason: accepted ? 'overlap' : rejectionReason,
      },
    ];

    if (buyerOpening > 0) {
      transcript.push({
        phase: 'opening_offer',
        actor: 'buyer',
        amount: Math.min(buyerOpening, buyerCash),
      });
    }

    if (sellerCounter > 0) {
      transcript.push({
        phase: 'counter_offer',
        actor: 'seller',
        amount: sellerCounter,
      });
    }

    transcript.push({
      phase: 'closing',
      accepted,
      amount: accepted ? finalPrice : 0,
      reason: accepted ? 'agreement' : rejectionReason,
    });

    return {
      accepted,
      shouldBuy: accepted,
      mode: 'dynamic',
      phase: accepted ? 'closing' : 'rejected',
      ownerId: owner?.id || null,
      owner,
      card,
      basePrice,
      listPrice,
      buyerMax,
      sellerMin,
      buyerOpening,
      sellerCounter,
      finalPrice,
      overlap,
      minimumOverlap,
      rejectionReason,
      profileId: resolvedContext.profile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'stage4_dynamic_negotiation_table',
      context: resolvedContext,
      transcript,
    };
  }

  function decideOwnedPropertyNegotiation({ player, owner = null, card = null, price = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const dynamicPricing = Boolean(resolvedContext.marketRegime?.dynamic_pricing);
    const buyerFlags = resolveNegotiationProfileFlags(resolvedContext.profile || ensureProfile(player, resolvedContext.tableConfig));
    if (buyerFlags.tradeLocked || buyerFlags.buyBlocked) {
      return buildBlockedOwnedNegotiationDecision({
        player,
        owner,
        card,
        price,
        resolvedContext,
        reason: buyerFlags.tradeLocked ? 'trade_locked' : 'buyer_closed_market',
      });
    }
    if (owner && !owner.is_human) {
      const ownerProfile = ensureProfile(owner, resolvedContext.tableConfig);
      const sellerFlags = resolveNegotiationProfileFlags(ownerProfile);
      if (sellerFlags.tradeLocked || sellerFlags.sellBlocked) {
        return buildBlockedOwnedNegotiationDecision({
          player,
          owner,
          card,
          price,
          resolvedContext,
          reason: sellerFlags.tradeLocked ? 'trade_locked' : 'seller_closed_market',
        });
      }
    }
    if (!dynamicPricing || player?.is_human || owner?.is_human) {
      return legacyOwnedPropertyNegotiation({
        player,
        owner,
        card,
        price,
        resolvedContext,
      });
    }
    return dynamicOwnedPropertyNegotiation({
      player,
      owner,
      card,
      price,
      resolvedContext,
    });
  }

  function negotiationReferenceValue(decision, fallbackAmount, side = 'buyer') {
    const fallback = Math.max(1, money(fallbackAmount || 0));
    if (side === 'seller') {
      return money(Math.max(
        fallback,
        numeric(decision?.sellerMin, 0),
        numeric(decision?.finalPrice, 0),
        numeric(decision?.currentAsk, 0),
        numeric(decision?.openingOffer, 0),
        numeric(decision?.currentBid, 0),
        numeric(decision?.openingBid, 0),
      ));
    }
    return money(Math.max(
      fallback,
      numeric(decision?.buyerMax, 0),
      numeric(decision?.finalPrice, 0),
      numeric(decision?.currentAsk, 0),
      numeric(decision?.openingOffer, 0),
      numeric(decision?.currentBid, 0),
      numeric(decision?.openingBid, 0),
    ));
  }

  function evaluateOwnedPropertyBarter({ player, owner = null, card = null, price = 0, offeredBundle = [], context = {} } = {}) {
    if (!player || !owner || !card || player.bankrupt || owner.bankrupt || player.id === owner.id) {
      return {
        accepted: false,
        reason: 'invalid_parties',
        offeredEntries: [],
      };
    }

    const normalizedBundle = (Array.isArray(offeredBundle) ? offeredBundle : [])
      .filter((entry) => entry?.card)
      .map((entry) => ({
        card: entry.card,
        price: Math.max(1, money(entry?.price || entry?.card?.price || 0)),
        negotiationSignals: entry?.negotiationSignals || {},
      }));

    if (!normalizedBundle.length) {
      return {
        accepted: false,
        reason: 'empty_bundle',
        offeredEntries: [],
      };
    }

    const resolvedContext = buildDecisionContext(player, context);
    const buyerProfile = resolvedContext.profile || ensureProfile(player, resolvedContext.tableConfig);
    const ownerProfile = ensureProfile(owner, resolvedContext.tableConfig);
    const buyerFlags = resolveNegotiationProfileFlags(buyerProfile);
    const sellerFlags = resolveNegotiationProfileFlags(ownerProfile);
    if (buyerFlags.tradeLocked || sellerFlags.tradeLocked) {
      return buildBlockedOwnedBarterDecision({
        resolvedContext,
        reason: 'trade_locked',
      });
    }
    if (buyerFlags.buyBlocked || buyerFlags.sellBlocked) {
      return buildBlockedOwnedBarterDecision({
        resolvedContext,
        reason: 'buyer_closed_market',
      });
    }
    if (sellerFlags.buyBlocked || sellerFlags.sellBlocked) {
      return buildBlockedOwnedBarterDecision({
        resolvedContext,
        reason: 'seller_closed_market',
      });
    }

    const barterRule = getDecisionRule('negotiation', 'owned_property_barter');
    const barterThresholds = barterRule?.thresholds || {};
    const targetPrice = Math.max(1, money(price || card?.price || 0));
    const targetSignals = resolvedContext.negotiationSignals || {};
    const targetDecision = decideOwnedPropertyNegotiation({
      player,
      owner,
      card,
      price: targetPrice,
      context: {
        ...context,
        negotiationSignals: targetSignals,
      },
    });
    const buyerTargetValue = negotiationReferenceValue(targetDecision, targetPrice, 'buyer');
    const sellerTargetFloor = negotiationReferenceValue(targetDecision, targetPrice, 'seller');
    const buyerFlex = clamp(
      numeric(buyerProfile?.negotiation?.premium_tolerance, 0.5) * 0.08
        + (targetSignals.buyerWouldCompleteMonopoly ? 0.14 : 0),
      0,
      0.24,
    );
    const sellerFlex = clamp(
      numeric(ownerProfile?.negotiation?.discount_tolerance, 0.5) * 0.06
        + numeric(ownerProfile?.negotiation?.sell_openness, 0.5) * 0.08
        + (targetSignals.sellerWouldLoseMonopoly ? -0.08 : 0),
      -0.08,
      0.2,
    );
    const buyerCap = money(Math.max(targetPrice, buyerTargetValue + (targetPrice * buyerFlex)));
    const sellerNeed = money(Math.max(
      targetPrice,
      sellerTargetFloor - (targetPrice * Math.max(0, sellerFlex)),
    ));

    const offeredEntries = normalizedBundle.map((entry) => {
      const offerDecision = decideOwnedPropertyNegotiation({
        player: owner,
        owner: player,
        card: entry.card,
        price: entry.price,
        context: {
          ...context,
          reason: 'owned_property_barter_offer',
          negotiationSignals: entry.negotiationSignals,
        },
      });
      return {
        ...entry,
        decision: offerDecision,
        receiverValue: negotiationReferenceValue(offerDecision, entry.price, 'buyer'),
        giverCost: negotiationReferenceValue(offerDecision, entry.price, 'seller'),
      };
    });

    const offeredReceiverValue = money(offeredEntries.reduce((total, entry) => total + numeric(entry.receiverValue, 0), 0));
    const offeredGiverCost = money(offeredEntries.reduce((total, entry) => total + numeric(entry.giverCost, 0), 0));
    const sellerMargin = money(offeredReceiverValue - sellerNeed);
    const buyerMargin = money(buyerCap - offeredGiverCost);
    const sellerMarginMin = money(numeric(barterThresholds.seller_margin_min, 0));
    const buyerMarginMin = money(numeric(barterThresholds.buyer_margin_min, 0));
    const accepted = sellerMargin >= sellerMarginMin && buyerMargin >= buyerMarginMin;

    return {
      accepted,
      reason: accepted ? 'balanced_bundle' : (offeredReceiverValue < sellerNeed ? 'seller_value_shortfall' : 'buyer_overpay'),
      card,
      targetDecision,
      buyerTargetValue,
      sellerTargetFloor,
      buyerCap,
      sellerNeed,
      offeredEntries,
      offeredReceiverValue,
      offeredGiverCost,
      sellerMargin,
      buyerMargin,
      context: resolvedContext,
    };
  }


  function resolveHumanNegotiationStance({ sellerFlexibility = 0, sellerCashStress = 0, sellerAttachment = 0, strategicLockScore = 0, thresholds = {} } = {}) {
    if (strategicLockScore >= numeric(thresholds.irredutivel_strategic_lock_min, 0.84)
      && sellerCashStress < numeric(thresholds.irredutivel_cash_stress_max, 0.25)) {
      return { id: 'irredutivel', label: 'Postura irredutivel' };
    }
    if (sellerCashStress >= numeric(thresholds.pressionado_cash_stress_min, 0.55)) {
      return { id: 'pressionado', label: 'Postura pressionada' };
    }
    if (sellerFlexibility >= numeric(thresholds.aberto_flexibility_min, 0.56)
      && sellerAttachment <= numeric(thresholds.aberto_attachment_max, 0.28)) {
      return { id: 'aberto', label: 'Postura aberta' };
    }
    if (sellerAttachment >= numeric(thresholds.duro_attachment_min, 0.46)
      || strategicLockScore >= numeric(thresholds.duro_strategic_lock_min, 0.70)) {
      return { id: 'duro', label: 'Postura dura' };
    }
    return { id: 'firme', label: 'Postura firme' };
  }

  function openingHumanNegotiationLine({ stance = null, card = null, owner = null } = {}) {
    const template = negotiationDialogueTemplate(
      'human_buy_negotiation',
      'opening_by_stance',
      stance?.id || 'firme',
      '{owner_name} escuta proposta por {asset} se o valor fizer sentido.',
    );
    return formatNegotiationText(template, negotiationTextContext({ card, owner }));
  }

  function humanNegotiationReplyLine(reason, { card = null, owner = null, amount = 0 } = {}) {
    const template = negotiationDialogueTemplate(
      'human_buy_negotiation',
      'reply_by_reason',
      reason,
      '{owner_name} preferiu manter {asset}.',
    );
    return formatNegotiationText(template, negotiationTextContext({ card, owner, amount }));
  }

  function buildHumanOwnedPropertyNegotiation({ player, owner = null, card = null, price = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const dynamicPricing = Boolean(resolvedContext.marketRegime?.dynamic_pricing);
    const humanNegotiationEnabled = resolvedContext.marketRegime?.human_negotiation_enabled !== false;
    const sessionRule = getDecisionRule('negotiation', 'human_buy_negotiation');

    if (!dynamicPricing || !humanNegotiationEnabled || !player?.is_human || !owner || owner?.is_human) {
      return {
        ...legacyOwnedPropertyNegotiation({
          player,
          owner,
          card,
          price,
          resolvedContext,
        }),
        canNegotiate: Boolean(player?.cash >= money(price || card?.price || 0)),
        currentAsk: money(price || card?.price || 0),
        sellerLine: openingHumanNegotiationLine({ stance: { id: 'firme' }, card, owner }),
        sellerStanceId: 'firme',
        sellerStanceLabel: 'Postura firme',
        maxRounds: Math.max(1, numeric(sessionRule?.session_limits?.max_rounds, 4)),
        round: 0,
      };
    }

    const ownerProfile = ensureProfile(owner, resolvedContext.tableConfig);
    const sellerFlags = resolveNegotiationProfileFlags(ownerProfile);
    if (sellerFlags.tradeLocked || sellerFlags.sellBlocked) {
      const closedReason = sellerFlags.tradeLocked ? 'trade_locked' : 'seller_closed_market';
      return {
        ...legacyOwnedPropertyNegotiation({
          player,
          owner,
          card,
          price,
          resolvedContext,
        }),
        canNegotiate: false,
        currentAsk: money(price || card?.price || 0),
        sellerLine: humanNegotiationReplyLine(closedReason, { card, owner }),
        sellerStanceId: 'firme',
        sellerStanceLabel: 'Mercado fechado',
        maxRounds: Math.max(1, numeric(sessionRule?.session_limits?.max_rounds, 4)),
        round: 0,
        rejectionReason: closedReason,
        diagnostics: {
          sellerFlags,
          sessionScore: 0,
          strategicLockScore: sellerFlags.strategicLock,
          sellerCashStress: 0,
          sellerWouldLoseMonopoly: false,
        },
      };
    }
    const signals = resolvedContext.negotiationSignals || {};
    const basePrice = Math.max(1, money(card?.price || price || 0));
    const listPrice = Math.max(basePrice, money(price || basePrice));
    const mortgageFloor = Math.max(money(signals.mortgageFloor || 0), Math.floor(basePrice * 0.5));
    const propertyKind = String(signals.propertyKind || card?.kind || 'port');
    const ownerCharge = Math.max(0, numeric(signals.ownerCharge, 0));
    const rateFee = Math.max(0, numeric(signals.rateFee, 0));
    const rateMultiplier = Math.max(1, numeric(signals.rateMultiplier, 1));
    const freightPotential = Math.max(0, numeric(signals.freightPotential, rateFee * rateMultiplier));
    const buyerCash = Math.max(0, numeric(player?.cash, 0));
    const ownerCash = Math.max(0, numeric(owner?.cash, 0));
    const sellerRegionBeforeRatio = clamp(numeric(signals.sellerRegionBeforeRatio, 0), 0, 1);
    const sellerRegionAfterRatio = clamp(numeric(signals.sellerRegionAfterRatio, sellerRegionBeforeRatio), 0, 1);
    const sellerWouldLoseMonopoly = Boolean(signals.sellerWouldLoseMonopoly);
    const strategicSellerFloor = ownedPropertyNegotiationFloor(basePrice, {
      propertyKind,
      sellerWouldLoseMonopoly,
      sellerRegionBeforeRatio,
      sellerRegionAfterRatio,
    });
    const reason = String(resolvedContext.reason || 'owned_property_negotiation');
    const normalizedYield = clamp((Math.max(ownerCharge, freightPotential * 0.35)) / basePrice, 0, 1);
    const priceRule = getDecisionRule('negotiation', 'owned_property_price_band');
    const sessionLimits = sessionRule?.session_limits || {};
    const offerPolicy = sessionRule?.offer_policy || {};
    const sellerEnv = buildRuleEvaluationEnv({
      profile: ownerProfile,
      assetKind: propertyKind,
      runtimeSignals: {
        origin_control_gain_norm: clamp((reason === 'stop_port_negotiation' ? 0.35 : 0.12) + normalizedYield * 0.14, 0, 1),
        region_completion_after_action_norm: clamp(sellerRegionBeforeRatio - sellerRegionAfterRatio + (sellerWouldLoseMonopoly ? 0.35 : 0), 0, 1),
        route_unlock_gain_norm: clamp((propertyKind === 'port' ? 0.2 : 0.1) + normalizedYield * 0.08, 0, 1),
        projected_income_norm: normalizedYield,
        cash_after_action: ownerCash + basePrice,
        reserve_cash_target_amount: reserveCashTarget(owner, basePrice, ownerProfile, 'owned_property_negotiation'),
        action_cost: basePrice,
        current_cash: ownerCash,
        base_price: basePrice,
      },
    });
    const sessionScore = normalizeRuleScore(evaluateFormulaDefinition(sessionRule?.session_formula, sellerEnv));
    sellerEnv.runtimeSignals.interest_score = sessionScore;
    const sellerFlexibility = clamp(numeric(ownerProfile?.negotiation?.sell_openness, 0.5) * 0.55 + numeric(ownerProfile?.negotiation?.desperation_discount, 0.5) * 0.25, 0.12, 0.78);
    const sellerAttachment = clamp(numeric(ownerProfile?.personality?.asset_attachment, 0.3), 0, 1);
    const sellerCashStress = clamp((basePrice - ownerCash) / basePrice, 0, 1);
    const strategicLockScore = clamp(1 - sessionScore + (sellerWouldLoseMonopoly ? 0.12 : 0), 0, 1);
    const stance = resolveHumanNegotiationStance({
      sellerFlexibility,
      sellerCashStress,
      sellerAttachment,
      strategicLockScore,
      thresholds: sessionRule?.stance_thresholds || {},
    });
    const privateFloor = money(Math.max(
      mortgageFloor * 1.10,
      strategicSellerFloor,
      evaluateFormulaDefinition(priceRule?.price_formula?.seller_min, sellerEnv),
    ));
    const targetMarkup = clamp(
      numeric(offerPolicy.target_markup_base, 0.05)
        + (1 - sessionScore) * numeric(offerPolicy.target_markup_session_penalty, 0.08)
        + sellerAttachment * numeric(offerPolicy.target_markup_attachment_weight, 0.05),
      numeric(offerPolicy.target_markup_min, 0.05),
      numeric(offerPolicy.target_markup_max, 0.18),
    );
    const privateTarget = money(Math.max(
      privateFloor,
      privateFloor + basePrice * targetMarkup,
    ));
    const askMarkup = clamp(
      numeric(offerPolicy.ask_markup_base, 0.03)
        + sellerAttachment * numeric(offerPolicy.ask_markup_attachment_weight, 0.05)
        + sellerCashStress * numeric(offerPolicy.ask_markup_cash_stress_weight, -0.04),
      numeric(offerPolicy.ask_markup_min, 0.02),
      numeric(offerPolicy.ask_markup_max, 0.12),
    );
    const initialAsk = money(Math.max(
      privateTarget,
      privateTarget + basePrice * askMarkup,
    ));
    const canOpenConversation = buyerCash >= Math.max(mortgageFloor, Math.floor(privateFloor * numeric(offerPolicy.entry_cash_floor_ratio, 0.72)));
    const hardRejectThreshold = numeric(sessionRule?.thresholds?.hard_reject, 0.34);
    const hardLockStrategicFloor = numeric(sessionRule?.stance_thresholds?.irredutivel_strategic_lock_min, 0.84);
    const hardLock = Boolean(sellerWouldLoseMonopoly) || (
      sessionScore <= hardRejectThreshold
      && strategicLockScore >= hardLockStrategicFloor
      && sellerCashStress < numeric(offerPolicy.hard_lock_cash_stress_cap, 0.30)
    );
    const canNegotiate = canOpenConversation && !hardLock;
    const transcript = [
      {
        phase: 'interest',
        accepted: canNegotiate,
        buyerCash,
        sellerAsk: initialAsk,
        reason: canNegotiate ? 'opening_ready' : (hardLock ? 'strategic_lock' : 'cash_short'),
      },
      {
        phase: 'opening_offer',
        actor: 'seller',
        amount: initialAsk,
      },
    ];
    const sellerLine = canNegotiate
      ? openingHumanNegotiationLine({ stance, card, owner })
      : humanNegotiationReplyLine(hardLock ? 'strategic_lock' : 'cash_short', { card, owner });
    const suggestedDiscount = clamp(
      numeric(offerPolicy.suggested_offer_discount_base, 0.08)
        + sellerFlexibility * numeric(offerPolicy.suggested_offer_flexibility_weight, 0.08)
        + sellerCashStress * numeric(offerPolicy.suggested_offer_cash_stress_weight, 0.04),
      numeric(offerPolicy.suggested_offer_discount_min, 0.08),
      numeric(offerPolicy.suggested_offer_discount_max, 0.18),
    );
    const suggestedOffer = buyerCash > 0
      ? money(clamp(
          Math.max(privateFloor, initialAsk - (basePrice * suggestedDiscount)),
          Math.max(mortgageFloor, Math.floor(privateFloor * numeric(offerPolicy.suggested_offer_floor_ratio, 0.82))),
          Math.min(buyerCash, Math.max(privateFloor, initialAsk - 1)),
        ))
      : 0;

    return {
      accepted: false,
      shouldBuy: false,
      mode: 'dynamic_human',
      phase: canNegotiate ? 'opening_offer' : 'rejected',
      ownerId: owner?.id || null,
      owner,
      card,
      basePrice,
      listPrice,
      buyerCash: money(buyerCash),
      currentAsk: initialAsk,
      openingOffer: initialAsk,
      privateFloor,
      privateTarget,
      suggestedOffer,
      sellerFlexibility,
      sellerAttachment,
      sellerCashStress,
      sellerStanceId: stance.id,
      sellerStanceLabel: stance.label,
      sellerLine,
      introLine: sellerLine,
      maxRounds: Math.max(1, numeric(sessionLimits.max_rounds, 4)),
      round: 0,
      rejectionReason: canNegotiate ? null : (hardLock ? 'strategic_lock' : 'cash_short'),
      diagnostics: {
        sellerFlags,
        sessionScore,
        strategicLockScore,
        sellerCashStress,
        sellerWouldLoseMonopoly,
      },
      canNegotiate,
      ruleConfig: sessionRule,
      profileId: ownerProfile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'stage5_human_dynamic_negotiation_table',
      context: resolvedContext,
      transcript,
    };
  }

  function acceptHumanOwnedPropertyOffer({ session = null } = {}) {
    if (!session) {
      return { status: 'invalid', reason: 'missing_session', session };
    }
    const currentAsk = money(session.currentAsk || session.openingOffer || 0);
    const buyerCash = money(session.buyerCash || 0);
    const transcript = [...(session.transcript || [])];

    if (!(currentAsk > 0) || buyerCash < currentAsk) {
      transcript.push({
        phase: 'closing',
        accepted: false,
        amount: 0,
        reason: 'insufficient_cash',
      });
      return {
        status: 'rejected',
        accepted: false,
        reason: 'insufficient_cash',
        robotLine: humanNegotiationReplyLine('cash_gap', { card: session.card || null, owner: session.owner || null }),
        session: {
          ...session,
          phase: 'rejected',
          rejectionReason: 'insufficient_cash',
          transcript,
        },
      };
    }

    transcript.push({
      phase: 'closing',
      accepted: true,
      amount: currentAsk,
      reason: 'accepted_current_offer',
    });
    return {
      status: 'accepted',
      accepted: true,
      finalPrice: currentAsk,
      robotLine: humanNegotiationReplyLine('accepted_current_offer', {
        card: session.card || null,
        owner: session.owner || null,
        amount: currentAsk,
      }),
      session: {
        ...session,
        round: numeric(session.round, 0) + 1,
        phase: 'closing',
        sellerLine: humanNegotiationReplyLine('accepted_current_offer', {
          card: session.card || null,
          owner: session.owner || null,
          amount: currentAsk,
        }),
        transcript,
      },
    };
  }

  function respondToHumanOwnedPropertyOffer({ session = null, offer = 0 } = {}) {
    if (!session) {
      return { status: 'invalid', reason: 'missing_session', session };
    }

    const normalizedOffer = money(offer);
    const buyerCash = money(session.buyerCash || 0);
    const privateFloor = money(session.privateFloor || 0);
    const privateTarget = money(session.privateTarget || privateFloor);
    const currentAsk = money(session.currentAsk || session.openingOffer || privateTarget || privateFloor);
    const basePrice = money(session.basePrice || privateFloor || normalizedOffer);
    const sessionRule = session.ruleConfig || getDecisionRule('negotiation', 'human_buy_negotiation');
    const responsePolicy = sessionRule?.response_policy || {};
    const maxRounds = Math.max(1, numeric(session.maxRounds, numeric(sessionRule?.session_limits?.max_rounds, 4)));
    const nextRound = numeric(session.round, 0) + 1;
    const sellerFlexibility = clamp(numeric(session.sellerFlexibility, 0), 0, 1);
    const sellerAttachment = clamp(numeric(session.sellerAttachment, 0), 0, 1);
    const sellerCashStress = clamp(numeric(session.sellerCashStress, 0), 0, 1);
    const card = session.card || null;
    const owner = session.owner || null;

    if (!(normalizedOffer > 0)) {
      return { status: 'invalid', reason: 'offer_too_low', session };
    }
    if (normalizedOffer > buyerCash) {
      return { status: 'invalid', reason: 'offer_exceeds_cash', session };
    }

    const transcript = [
      ...(session.transcript || []),
      {
        phase: 'counter_offer',
        actor: 'buyer',
        amount: normalizedOffer,
      },
    ];

    const insultingThreshold = money(Math.max(
      Math.floor(privateFloor * (
        numeric(responsePolicy.insult_private_floor_base, 0.90)
        + sellerAttachment * numeric(responsePolicy.insult_private_floor_attachment_weight, 0.05)
        + sellerCashStress * numeric(responsePolicy.insult_private_floor_cash_stress_weight, -0.08)
      )),
      Math.floor(privateTarget * (
        numeric(responsePolicy.insult_private_target_base, 0.80)
        + sellerAttachment * numeric(responsePolicy.insult_private_target_attachment_weight, 0.06)
        + sellerCashStress * numeric(responsePolicy.insult_private_target_cash_stress_weight, -0.08)
      )),
      Math.floor(currentAsk * (
        numeric(responsePolicy.insult_current_ask_base, 0.66)
        + sellerAttachment * numeric(responsePolicy.insult_current_ask_attachment_weight, 0.04)
        + sellerCashStress * numeric(responsePolicy.insult_current_ask_cash_stress_weight, -0.05)
      )),
    ));
    const acceptanceThreshold = money(clamp(
      Math.max(privateFloor, privateTarget * (
        numeric(responsePolicy.accept_private_target_base, 0.96)
        + sellerFlexibility * numeric(responsePolicy.accept_flexibility_weight, -0.08)
        + sellerCashStress * numeric(responsePolicy.accept_cash_stress_weight, -0.06)
        + sellerAttachment * numeric(responsePolicy.accept_attachment_weight, 0.03)
      )),
      privateFloor,
      currentAsk,
    ));

    if (normalizedOffer <= insultingThreshold) {
      transcript.push({
        phase: 'closing',
        accepted: false,
        amount: 0,
        reason: 'lowball',
      });
      const robotLine = humanNegotiationReplyLine('lowball', { card, owner });
      return {
        status: 'rejected',
        accepted: false,
        reason: 'lowball',
        robotLine,
        session: {
          ...session,
          round: nextRound,
          phase: 'rejected',
          rejectionReason: 'lowball',
          sellerLine: robotLine,
          transcript,
        },
      };
    }

    if (normalizedOffer >= currentAsk || normalizedOffer >= acceptanceThreshold) {
      transcript.push({
        phase: 'closing',
        accepted: true,
        amount: normalizedOffer,
        reason: normalizedOffer >= currentAsk ? 'matched_ask' : 'accepted_counter_offer',
      });
      const acceptedReason = normalizedOffer >= currentAsk ? 'matched_ask' : 'accepted_counter_offer';
      const robotLine = humanNegotiationReplyLine(acceptedReason, { card, owner, amount: normalizedOffer });
      return {
        status: 'accepted',
        accepted: true,
        finalPrice: normalizedOffer,
        robotLine,
        session: {
          ...session,
          round: nextRound,
          currentAsk: normalizedOffer,
          phase: 'closing',
          sellerLine: robotLine,
          transcript,
        },
      };
    }

    if (nextRound >= maxRounds) {
      transcript.push({
        phase: 'closing',
        accepted: false,
        amount: 0,
        reason: 'final_refusal',
      });
      const robotLine = humanNegotiationReplyLine('final_refusal', { card, owner });
      return {
        status: 'rejected',
        accepted: false,
        reason: 'final_refusal',
        robotLine,
        session: {
          ...session,
          round: nextRound,
          phase: 'rejected',
          rejectionReason: 'final_refusal',
          sellerLine: robotLine,
          transcript,
        },
      };
    }

    const concessionRatio = clamp(
      numeric(responsePolicy.concession_base, 0.42)
        + sellerFlexibility * numeric(responsePolicy.concession_flexibility_weight, 0.16)
        + sellerCashStress * numeric(responsePolicy.concession_cash_stress_weight, 0.14)
        + sellerAttachment * numeric(responsePolicy.concession_attachment_weight, -0.10),
      numeric(responsePolicy.concession_min, 0.26),
      numeric(responsePolicy.concession_max, 0.58),
    );
    let counterPrice = money(clamp(
      currentAsk - Math.max(
        basePrice * (numeric(responsePolicy.counter_step_base, 0.05) + sellerCashStress * numeric(responsePolicy.counter_step_cash_stress_weight, 0.03)),
        (currentAsk - normalizedOffer) * concessionRatio,
      ),
      acceptanceThreshold,
      Math.max(acceptanceThreshold, currentAsk - 1),
    ));

    if (!(counterPrice > normalizedOffer)) {
      counterPrice = money(Math.max(
        acceptanceThreshold,
        normalizedOffer + Math.ceil(basePrice * numeric(responsePolicy.counter_min_increment_ratio, 0.03)),
      ));
    }

    if (counterPrice > buyerCash) {
      transcript.push({
        phase: 'closing',
        accepted: false,
        amount: 0,
        reason: 'cash_gap',
      });
      const robotLine = humanNegotiationReplyLine('cash_gap', { card, owner });
      return {
        status: 'rejected',
        accepted: false,
        reason: 'cash_gap',
        robotLine,
        session: {
          ...session,
          round: nextRound,
          phase: 'rejected',
          rejectionReason: 'cash_gap',
          sellerLine: robotLine,
          transcript,
        },
      };
    }

    transcript.push({
      phase: 'counter_offer',
      actor: 'seller',
      amount: counterPrice,
    });
    const robotLine = formatNegotiationText(
      getDecisionRule('negotiation', 'human_buy_negotiation')?.dialogue?.counter_offer_template
        || 'Posso descer para {amount}, mas so fecho nesse patamar.',
      negotiationTextContext({ card, owner, amount: counterPrice }),
    );
    return {
      status: 'countered',
      accepted: false,
      counterPrice,
      robotLine,
      session: {
        ...session,
        round: nextRound,
        currentAsk: counterPrice,
        phase: 'counter_offer',
        sellerLine: robotLine,
        transcript,
      },
    };
  }

  function closeHumanOwnedPropertyNegotiation({ session = null, reason = 'human_declined' } = {}) {
    if (!session) {
      return { status: 'rejected', accepted: false, reason, session };
    }
    const transcript = [
      ...(session.transcript || []),
      {
        phase: 'closing',
        accepted: false,
        amount: 0,
        reason,
      },
    ];
    const card = session.card || null;
    const owner = session.owner || null;
    const robotLine = humanNegotiationReplyLine(reason, { card, owner });
    return {
      status: 'rejected',
      accepted: false,
      reason,
      robotLine,
      session: {
        ...session,
        phase: 'rejected',
        rejectionReason: reason,
        sellerLine: robotLine,
        transcript,
      },
    };
  }

  
  function resolveHumanSaleNegotiationStance({ buyerAggression = 0, buyerCashStress = 0, buyerStrategicLift = 0, thresholds = {} } = {}) {
    if (buyerCashStress >= numeric(thresholds.limitado_cash_stress_min, 0.58)) {
      return { id: 'limitado', label: 'Oferta limitada' };
    }
    if (buyerStrategicLift >= numeric(thresholds.forte_interest_min, 0.74)) {
      return { id: 'forte', label: 'Interesse alto' };
    }
    if (buyerAggression >= numeric(thresholds.agressivo_aggression_min, 0.68)) {
      return { id: 'agressivo', label: 'Comprador agressivo' };
    }
    return { id: 'moderado', label: 'Interesse moderado' };
  }

  function openingHumanSaleNegotiationLine({ stance = null, card = null, buyer = null } = {}) {
    const template = negotiationDialogueTemplate(
      'human_sale_negotiation',
      'opening_by_stance',
      stance?.id || 'moderado',
      '{buyer_name} abriu conversa por {asset} e espera uma resposta sua.',
    );
    return formatNegotiationText(template, negotiationTextContext({ card, buyer }));
  }

  function humanSaleNegotiationReplyLine(reason, { card = null, buyer = null, amount = 0 } = {}) {
    const template = negotiationDialogueTemplate(
      'human_sale_negotiation',
      'reply_by_reason',
      reason,
      '{buyer_name} preferiu nao fechar {asset}.',
    );
    return formatNegotiationText(template, negotiationTextContext({ card, buyer, amount }));
  }

  function buildHumanSalePropertyNegotiation({ player, owner = null, card = null, price = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const dynamicPricing = Boolean(resolvedContext.marketRegime?.dynamic_pricing);
    const humanNegotiationEnabled = resolvedContext.marketRegime?.human_negotiation_enabled !== false;
    const sessionRule = getDecisionRule('negotiation', 'human_sale_negotiation');

    if (!dynamicPricing || !humanNegotiationEnabled || player?.is_human || !owner?.is_human) {
      return {
        ...legacyOwnedPropertyNegotiation({
          player,
          owner,
          card,
          price,
          resolvedContext,
        }),
        canNegotiate: Boolean(player?.cash >= money(price || card?.price || 0)),
        currentBid: money(price || card?.price || 0),
        buyerLine: openingHumanSaleNegotiationLine({ stance: { id: 'moderado' }, card, buyer: player }),
        buyerStanceId: 'moderado',
        buyerStanceLabel: 'Interesse moderado',
        maxRounds: Math.max(1, numeric(sessionRule?.session_limits?.max_rounds, 4)),
        round: 0,
      };
    }

    const buyerProfile = resolvedContext.profile || ensureProfile(player, resolvedContext.tableConfig);
    const buyerFlags = resolveNegotiationProfileFlags(buyerProfile);
    if (buyerFlags.tradeLocked || buyerFlags.buyBlocked) {
      const closedReason = buyerFlags.tradeLocked ? 'trade_locked' : 'buyer_closed_market';
      return {
        ...legacyOwnedPropertyNegotiation({
          player,
          owner,
          card,
          price,
          resolvedContext,
        }),
        canNegotiate: false,
        currentBid: money(price || card?.price || 0),
        buyerLine: humanSaleNegotiationReplyLine(closedReason, { card, buyer: player }),
        buyerStanceId: 'moderado',
        buyerStanceLabel: 'Interesse travado',
        maxRounds: Math.max(1, numeric(sessionRule?.session_limits?.max_rounds, 4)),
        round: 0,
        rejectionReason: closedReason,
      };
    }
    const signals = resolvedContext.negotiationSignals || {};
    const basePrice = Math.max(1, money(card?.price || price || 0));
    const listPrice = Math.max(basePrice, money(price || basePrice));
    const mortgageFloor = Math.max(money(signals.mortgageFloor || 0), Math.floor(basePrice * 0.5));
    const propertyKind = String(signals.propertyKind || card?.kind || 'port');
    const ownerCharge = Math.max(0, numeric(signals.ownerCharge, 0));
    const rateFee = Math.max(0, numeric(signals.rateFee, 0));
    const rateMultiplier = Math.max(1, numeric(signals.rateMultiplier, 1));
    const freightPotential = Math.max(0, numeric(signals.freightPotential, rateFee * rateMultiplier));
    const buyerCash = Math.max(0, numeric(player?.cash, 0));
    const buyerRegionBeforeRatio = clamp(numeric(signals.buyerRegionBeforeRatio, 0), 0, 1);
    const buyerRegionAfterRatio = clamp(numeric(signals.buyerRegionAfterRatio, buyerRegionBeforeRatio), 0, 1);
    const buyerWouldCompleteMonopoly = Boolean(signals.buyerWouldCompleteMonopoly);
    const sellerRegionBeforeRatio = clamp(numeric(signals.sellerRegionBeforeRatio, 0), 0, 1);
    const sellerRegionAfterRatio = clamp(numeric(signals.sellerRegionAfterRatio, sellerRegionBeforeRatio), 0, 1);
    const sellerWouldLoseMonopoly = Boolean(signals.sellerWouldLoseMonopoly);
    const strategicSellerFloor = ownedPropertyNegotiationFloor(basePrice, {
      propertyKind,
      sellerWouldLoseMonopoly,
      sellerRegionBeforeRatio,
      sellerRegionAfterRatio,
    });
    const reason = String(resolvedContext.reason || 'owned_property_negotiation');
    const normalizedYield = clamp((Math.max(ownerCharge, freightPotential * 0.35)) / basePrice, 0, 1);
    const interestRule = getDecisionRule('negotiation', 'owned_property_interest');
    const priceRule = getDecisionRule('negotiation', 'owned_property_price_band');
    const buyerCashStress = clamp((listPrice - buyerCash) / listPrice, 0, 1);
    const sessionLimits = sessionRule?.session_limits || {};
    const offerPolicy = sessionRule?.offer_policy || {};
    const buyerEnv = buildRuleEvaluationEnv({
      profile: buyerProfile,
      assetKind: propertyKind,
      runtimeSignals: {
        origin_control_gain_norm: clamp(((reason === 'post_delivery_port_negotiation') ? 0.65 : 0.2) + Math.max(0, rateMultiplier - 1) * 0.18, 0, 1),
        region_completion_after_action_norm: clamp(buyerRegionAfterRatio + (buyerWouldCompleteMonopoly ? 0.25 : 0), 0, 1),
        route_unlock_gain_norm: clamp((propertyKind === 'port' ? 0.3 : 0.18) + normalizedYield * 0.18, 0, 1),
        projected_income_norm: normalizedYield,
        cash_after_action: Math.max(0, buyerCash - basePrice),
        reserve_cash_target_amount: reserveCashTarget(player, basePrice, buyerProfile, 'owned_property_negotiation'),
        action_cost: basePrice,
        current_cash: buyerCash,
        seller_lock: 0,
        buyer_attachment: clamp(numeric(buyerProfile?.personality?.asset_attachment, 0.3), 0, 1),
        base_price: basePrice,
      },
    });
    const interestScore = normalizeRuleScore(evaluateFormulaDefinition(interestRule?.scoring_formula, buyerEnv));
    const sessionScore = normalizeRuleScore(evaluateFormulaDefinition(sessionRule?.session_formula, buyerEnv));
    buyerEnv.runtimeSignals.interest_score = interestScore;
    const buyerAggression = clamp(0.22 + sessionScore * 0.46, 0.14, 0.88);
    const buyerStrategicLift = interestScore;
    const stance = resolveHumanSaleNegotiationStance({
      buyerAggression,
      buyerCashStress,
      buyerStrategicLift,
      thresholds: sessionRule?.stance_thresholds || {},
    });
    const privateCeiling = money(Math.min(
      buyerCash,
      Math.max(
        strategicSellerFloor,
        mortgageFloor * 1.10,
        evaluateFormulaDefinition(priceRule?.price_formula?.buyer_max, buyerEnv),
      ),
    ));
    const canReachSellerFloor = privateCeiling >= strategicSellerFloor;
    const privateTarget = canReachSellerFloor
      ? money(Math.min(
          privateCeiling,
          Math.max(
            strategicSellerFloor,
            basePrice + Math.max(0, (privateCeiling - basePrice) * clamp(
              numeric(offerPolicy.target_window_base, 0.42)
                + buyerAggression * numeric(offerPolicy.target_window_aggression_weight, 0.12)
                + buyerCashStress * numeric(offerPolicy.target_window_cash_stress_weight, -0.10),
              numeric(offerPolicy.target_window_min, 0.2),
              numeric(offerPolicy.target_window_max, 0.7),
            )),
          ),
        ))
      : 0;
    const openingBid = canReachSellerFloor
      ? money(Math.min(
          privateCeiling,
          Math.max(
            strategicSellerFloor,
            privateTarget - basePrice * clamp(
              numeric(offerPolicy.opening_discount_base, 0.03) + (1 - sessionScore) * numeric(offerPolicy.opening_discount_session_weight, 0.03),
              numeric(offerPolicy.opening_discount_min, 0.02),
              numeric(offerPolicy.opening_discount_max, 0.08),
            ),
            listPrice,
          ),
        ))
      : 0;
    const canNegotiate = canReachSellerFloor
      && buyerCash >= Math.max(strategicSellerFloor, Math.floor(privateTarget * numeric(offerPolicy.entry_target_ratio, 0.92)))
      && sessionScore >= numeric(sessionRule?.thresholds?.hard_reject, 0.36);
    const suggestedAsk = canNegotiate
      ? money(Math.max(
          openingBid + Math.ceil(basePrice * numeric(offerPolicy.suggested_ask_step_ratio, 0.10)),
          Math.min(buyerCash, privateCeiling + Math.ceil(basePrice * numeric(offerPolicy.suggested_ask_ceiling_ratio, 0.06))),
        ))
      : 0;
    const transcript = [
      {
        phase: 'interest',
        accepted: canNegotiate,
        buyerCash,
        buyerBid: openingBid,
        reason: canNegotiate ? 'opening_ready' : 'buyer_not_interested',
      },
      {
        phase: 'opening_offer',
        actor: 'buyer',
        amount: openingBid,
      },
    ];
    const buyerLine = canNegotiate
      ? openingHumanSaleNegotiationLine({ stance, card, buyer: player })
      : humanSaleNegotiationReplyLine('buyer_not_interested', { card, buyer: player });

    return {
      accepted: false,
      shouldBuy: false,
      mode: 'dynamic_human_sell',
      phase: canNegotiate ? 'opening_offer' : 'rejected',
      ownerId: owner?.id || null,
      owner,
      buyer: player,
      card,
      basePrice,
      listPrice,
      buyerCash: money(buyerCash),
      currentBid: openingBid,
      openingBid,
      privateTarget,
      privateCeiling,
      suggestedAsk,
      buyerAggression,
      buyerCashStress,
      buyerStanceId: stance.id,
      buyerStanceLabel: stance.label,
      buyerLine,
      introLine: buyerLine,
      maxRounds: Math.max(1, numeric(sessionLimits.max_rounds, 4)),
      round: 0,
      rejectionReason: canNegotiate ? null : 'buyer_not_interested',
      canNegotiate,
      ruleConfig: sessionRule,
      profileId: buyerProfile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'stage5_human_dynamic_negotiation_table',
      context: resolvedContext,
      transcript,
    };
  }

  function acceptHumanSaleOffer({ session = null } = {}) {
    if (!session) {
      return { status: 'invalid', reason: 'missing_session', session };
    }
    const currentBid = money(session.currentBid || session.openingBid || 0);
    const buyerCash = money(session.buyerCash || 0);
    const transcript = [...(session.transcript || [])];

    if (!(currentBid > 0) || buyerCash < currentBid) {
      transcript.push({ phase: 'closing', accepted: false, amount: 0, reason: 'insufficient_cash' });
      return {
        status: 'rejected',
        accepted: false,
        reason: 'insufficient_cash',
        robotLine: humanSaleNegotiationReplyLine('cash_gap', { card: session.card || null, buyer: session.buyer || null }),
        session: {
          ...session,
          phase: 'rejected',
          rejectionReason: 'insufficient_cash',
          transcript,
        },
      };
    }

    transcript.push({ phase: 'closing', accepted: true, amount: currentBid, reason: 'accepted_current_bid' });
    const robotLine = humanSaleNegotiationReplyLine('accepted_current_bid', {
      card: session.card || null,
      buyer: session.buyer || null,
      amount: currentBid,
    });
    return {
      status: 'accepted',
      accepted: true,
      finalPrice: currentBid,
      robotLine,
      session: {
        ...session,
        round: numeric(session.round, 0) + 1,
        phase: 'closing',
        buyerLine: robotLine,
        transcript,
      },
    };
  }

  function respondToHumanSaleCounterOffer({ session = null, ask = 0 } = {}) {
    if (!session) {
      return { status: 'invalid', accepted: false, reason: 'missing_session', session };
    }
    const normalizedAsk = money(ask);
    const currentBid = money(session.currentBid || session.openingBid || 0);
    const buyerCash = money(session.buyerCash || 0);
    const privateTarget = money(session.privateTarget || currentBid || 0);
    const privateCeiling = money(session.privateCeiling || privateTarget || buyerCash || 0);
    const basePrice = money(session.basePrice || session.listPrice || 0);
    const round = numeric(session.round, 0);
    const sessionRule = session.ruleConfig || getDecisionRule('negotiation', 'human_sale_negotiation');
    const responsePolicy = sessionRule?.response_policy || {};
    const maxRounds = Math.max(1, numeric(session.maxRounds, numeric(sessionRule?.session_limits?.max_rounds, 4)));
    const nextRound = round + 1;
    const transcript = [...(session.transcript || [])];

    transcript.push({ phase: 'counter_offer', actor: 'seller', amount: normalizedAsk });

    if (!(normalizedAsk > 0)) {
      return {
        status: 'rejected',
        accepted: false,
        reason: 'invalid_counter',
        robotLine: humanSaleNegotiationReplyLine('high_ask', { card: session.card || null, buyer: session.buyer || null }),
        session: {
          ...session,
          round: nextRound,
          phase: 'rejected',
          rejectionReason: 'invalid_counter',
          transcript,
        },
      };
    }

    if (normalizedAsk <= currentBid) {
      transcript.push({ phase: 'closing', accepted: true, amount: currentBid, reason: 'matched_bid' });
      const robotLine = humanSaleNegotiationReplyLine('matched_bid', {
        card: session.card || null,
        buyer: session.buyer || null,
        amount: currentBid,
      });
      return {
        status: 'accepted',
        accepted: true,
        finalPrice: currentBid,
        robotLine,
        session: {
          ...session,
          round: nextRound,
          phase: 'closing',
          buyerLine: robotLine,
          transcript,
        },
      };
    }

    if (normalizedAsk > buyerCash || normalizedAsk > privateCeiling) {
      transcript.push({ phase: 'closing', accepted: false, amount: 0, reason: normalizedAsk > buyerCash ? 'cash_gap' : 'high_ask' });
      const rejectionReason = normalizedAsk > buyerCash ? 'cash_gap' : 'high_ask';
      const robotLine = humanSaleNegotiationReplyLine(rejectionReason, { card: session.card || null, buyer: session.buyer || null });
      return {
        status: 'rejected',
        accepted: false,
        reason: rejectionReason,
        robotLine,
        session: {
          ...session,
          round: nextRound,
          phase: 'rejected',
          rejectionReason,
          buyerLine: robotLine,
          transcript,
        },
      };
    }

    const acceptanceThreshold = nextRound >= maxRounds
      ? privateCeiling
      : Math.min(
          privateCeiling,
          Math.max(privateTarget, currentBid + Math.ceil(basePrice * numeric(responsePolicy.accept_bid_step_ratio, 0.08))),
        );
    if (normalizedAsk <= acceptanceThreshold) {
      transcript.push({ phase: 'closing', accepted: true, amount: normalizedAsk, reason: 'accepted_counter_ask' });
      const robotLine = humanSaleNegotiationReplyLine('accepted_counter_ask', {
        card: session.card || null,
        buyer: session.buyer || null,
        amount: normalizedAsk,
      });
      return {
        status: 'accepted',
        accepted: true,
        finalPrice: normalizedAsk,
        robotLine,
        session: {
          ...session,
          round: nextRound,
          currentBid: normalizedAsk,
          phase: 'closing',
          buyerLine: robotLine,
          transcript,
        },
      };
    }

    if (nextRound >= maxRounds) {
      transcript.push({ phase: 'closing', accepted: false, amount: 0, reason: 'final_refusal' });
      const robotLine = humanSaleNegotiationReplyLine('final_refusal', { card: session.card || null, buyer: session.buyer || null });
      return {
        status: 'rejected',
        accepted: false,
        reason: 'final_refusal',
        robotLine,
        session: {
          ...session,
          round: nextRound,
          phase: 'rejected',
          rejectionReason: 'final_refusal',
          buyerLine: robotLine,
          transcript,
        },
      };
    }

    const concessionRatio = clamp(
      numeric(responsePolicy.concession_base, 0.42)
        + (session.buyerAggression || 0.4) * numeric(responsePolicy.concession_aggression_weight, 0.18)
        + (session.buyerCashStress || 0) * numeric(responsePolicy.concession_cash_stress_weight, -0.12),
      numeric(responsePolicy.concession_min, 0.24),
      numeric(responsePolicy.concession_max, 0.56),
    );
    let counterBid = money(clamp(
      currentBid + Math.max(
        basePrice * (numeric(responsePolicy.counter_step_base, 0.04) + (session.buyerAggression || 0.4) * numeric(responsePolicy.counter_step_aggression_weight, 0.04)),
        (normalizedAsk - currentBid) * concessionRatio,
      ),
      currentBid + 1,
      Math.min(privateCeiling, normalizedAsk - 1),
    ));
    if (!(counterBid > currentBid)) {
      transcript.push({ phase: 'closing', accepted: false, amount: 0, reason: 'final_refusal' });
      const robotLine = humanSaleNegotiationReplyLine('final_refusal', { card: session.card || null, buyer: session.buyer || null });
      return {
        status: 'rejected',
        accepted: false,
        reason: 'final_refusal',
        robotLine,
        session: {
          ...session,
          round: nextRound,
          phase: 'rejected',
          rejectionReason: 'final_refusal',
          buyerLine: robotLine,
          transcript,
        },
      };
    }

    transcript.push({ phase: 'counter_offer', actor: 'buyer', amount: counterBid });
    const robotLine = formatNegotiationText(
      getDecisionRule('negotiation', 'human_sale_negotiation')?.dialogue?.counter_offer_template
        || 'Posso subir para {amount}, mas esse e o meu limite agora.',
      negotiationTextContext({ card: session.card || null, buyer: session.buyer || null, amount: counterBid }),
    );
    return {
      status: 'countered',
      accepted: false,
      counterPrice: counterBid,
      robotLine,
      session: {
        ...session,
        round: nextRound,
        currentBid: counterBid,
        phase: 'counter_offer',
        buyerLine: robotLine,
        transcript,
      },
    };
  }

  function closeHumanSaleNegotiation({ session = null, reason = 'seller_declined' } = {}) {
    if (!session) {
      return { status: 'rejected', accepted: false, reason, session };
    }
    const transcript = [
      ...(session.transcript || []),
      {
        phase: 'closing',
        accepted: false,
        amount: 0,
        reason,
      },
    ];
    const robotLine = humanSaleNegotiationReplyLine(reason, {
      card: session.card || null,
      buyer: session.buyer || null,
    });
    return {
      status: 'rejected',
      accepted: false,
      reason,
      robotLine,
      session: {
        ...session,
        phase: 'rejected',
        rejectionReason: reason,
        buyerLine: robotLine,
        transcript,
      },
    };
  }

function chooseBestPermission({ player, selection = null, choices = [], originCode = null, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const resolvedSelection = selection || {};
    const resolvedChoices = Array.isArray(choices) && choices.length
      ? choices
      : (resolvedSelection.choices || []);
    const profile = resolvedContext.profile || null;
    const ownsOrigin = Boolean(resolvedSelection.ownsOrigin);
    const decisionRule = getDecisionRule('acquisition', 'permission_selection');
    const scale = Math.max(1, freightScale(resolvedChoices));

    const scoredChoices = resolvedChoices.map((entry) => {
      const emValue = Math.max(0, numeric(entry.emValue, numeric(entry.fee, 0) * Math.max(1, numeric(entry.multiplier, 1))));
      const freight = Math.max(0, numeric(entry.projectedFreight, emValue));
      const switchCost = Math.max(0, numeric(entry.switchCost, 0));
      const netFreight = Math.max(0, numeric(entry.effectiveComparisonValue, freight - switchCost));
      const env = buildRuleEvaluationEnv({
        profile,
        assetKind: 'permission',
        runtimeSignals: {
          reachable_destinations_gain_norm: clamp(netFreight / scale, 0, 1),
          route_unlock_gain_norm: clamp(Math.max(0, numeric(entry.multiplier, 1) - 1) / 3, 0, 1),
          contract_value_gain_norm: clamp(netFreight / scale, 0, 1),
        },
      });
      let score = normalizeRuleScore(evaluateFormulaDefinition(decisionRule?.ranking_formula, env));
      if (entry.isCurrent) score += 0.04;
      if (ownsOrigin) score += 0.03;
      score = clamp(score, 0, 1);
      return {
        ...entry,
        emValue,
        netFreight,
        aiScore: score,
      };
    });

    const affordableChoices = scoredChoices.filter((entry) => entry.isCurrent || entry.canAffordSwitch);
    const candidateChoices = affordableChoices.length ? affordableChoices : scoredChoices;
    const bestChoice = candidateChoices.reduce((best, entry) => {
      if (!best) return entry;
      if (entry.emValue > best.emValue) return entry;
      if (entry.emValue < best.emValue) return best;
      if (entry.aiScore > best.aiScore) return entry;
      if (entry.aiScore < best.aiScore) return best;
      if (entry.effectiveComparisonValue > best.effectiveComparisonValue) return entry;
      if (entry.effectiveComparisonValue < best.effectiveComparisonValue) return best;
      if (entry.isCurrent) return entry;
      return best;
    }, null);
    const resolvedOriginCode = originCode ?? resolvedSelection.originCode ?? null;
    return {
      choice: bestChoice,
      originCode: resolvedOriginCode,
      ownsOrigin,
      reason: ownsOrigin ? 'maior frete projetado na origem' : 'melhor combinacao de frete atual',
      explanation: ownsOrigin ? 'maior frete projetado na origem' : 'melhor combinacao de frete atual',
      profileId: resolvedContext.profile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
      context: resolvedContext,
    };
  }

  function decideExtraPermissionPurchase({ player, extraCost = 0, availableCount = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const normalizedCost = Math.max(0, numeric(extraCost, 0));
    const policy = currentPurchasePolicy(player);
    const profileId = resolvedContext.profile?.id || 'legacy_open';

    if (player?.bankrupt || policy === 'never' || availableCount <= 0 || player.cash < normalizedCost) {
      return {
        shouldBuy: false,
        accepted: false,
        policy,
        price: normalizedCost,
        profileId,
        tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
        context: resolvedContext,
      };
    }

    if (profileId === 'legacy_open') {
      return {
        shouldBuy: true,
        accepted: true,
        policy,
        price: normalizedCost,
        profileId,
        tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
        context: resolvedContext,
      };
    }

    const scored = scoreExtraPermissionPurchase({
      player,
      extraCost: normalizedCost,
      availableCount,
      resolvedContext,
    });
    return {
      shouldBuy: Boolean(scored.shouldBuy),
      accepted: Boolean(scored.shouldBuy),
      policy,
      price: normalizedCost,
      score: scored.score,
      threshold: scored.threshold,
      reserveTarget: scored.reserveTarget,
      profileId,
      tableConfigId: resolvedContext.tableConfig?.id || 'stage6_profile_table',
      context: resolvedContext,
    };
  }

  function decideCouponUsage({ player, kind = '', autoUse = true, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const profile = resolvedContext.profile || null;
    const signals = resolvedContext.couponSignals || {};
    const activeContract = player?.active_contract || null;
    const charge = money(signals.charge || signals.amount || 0);
    const cash = money(player?.cash || 0);
    const freightValue = money(signals.freightValue || activeContract?.base_freight_value || activeContract?.freight_value || 0);
    const targetRounds = Math.max(1, numeric(signals.targetRounds ?? signals.currentTargetRounds, numeric(activeContract?.target_rounds, 4)));
    const roundsElapsed = Math.max(1, numeric(signals.roundsElapsed, numeric(activeContract?.rounds_elapsed, 1)));
    const remainingRounds = Math.max(0, numeric(signals.remainingRounds, targetRounds - roundsElapsed));
    const remainingSteps = Math.max(0, numeric(signals.remainingSteps, 0));
    const fuelStopsRemaining = Math.max(0, numeric(signals.fuelStopsRemaining, 0));
    const candidateCount = Math.max(0, numeric(signals.candidateCount, 0));
    const couponAgeTurns = Math.max(0, numeric(signals.couponAgeTurns, 0));
    const couponExpirationTurns = Math.max(1, numeric(signals.couponExpirationTurns, 50));
    const turnsUntilCouponExpiry = Math.max(0, numeric(signals.turnsUntilCouponExpiry, couponExpirationTurns - couponAgeTurns));
    const reserveBasis = Math.max(charge, freightValue, 120);
    const reserveTarget = reserveCashTarget(player, reserveBasis, profile, 'coupon_usage');
    const couponFamilyRule = getDecisionRule('tactical_resources', 'coupon_usage');
    const couponRule = couponFamilyRule?.coupon_rules?.[kind] || null;
    const env = buildRuleEvaluationEnv({
      profile,
      runtimeSignals: buildCouponRuntimeSignals({
        signals,
        reserveTarget,
        cash,
        charge,
        freightValue,
        candidateCount,
        remainingRounds,
        remainingSteps,
        fuelStopsRemaining,
        couponAgeTurns,
        couponExpirationTurns,
        turnsUntilCouponExpiry,
      }),
    });
    let score = normalizeRuleScore(evaluateFormulaDefinition(couponRule?.scoring_formula, env));
    score += evaluateNoise(couponFamilyRule?.noise, env);
    score = clamp(score, 0, 1);
    const threshold = numeric(couponRule?.play_threshold, 0.56);
    const conditionsMet = evaluateRuleConditions(couponRule?.play_conditions, env);
    const shouldUse = Boolean(autoUse) && conditionsMet && score >= threshold;
    return {
      shouldUse,
      accepted: shouldUse,
      kind,
      score,
      threshold,
      conditionsMet,
      profileId: resolvedContext.profile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
      context: resolvedContext,
    };
  }

  function decideMortgageCandidate({ player, candidates = [], due = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const profile = resolvedContext.profile || null;
    const cash = money(player?.cash || 0);
    const shortage = Math.max(0, money(due) - cash);
    const decisionRule = getDecisionRule('liquidity', 'mortgage_candidate');
    const shortageRatio = clamp(shortage / Math.max(1, money(due) || shortage || 1), 0, 1.5);
    if (!decisionRule || shortageRatio < numeric(decisionRule.thresholds?.skip_if_safe_ratio, 0.03)) {
      return {
        candidate: null,
        score: 0,
        shouldMortgage: false,
        profileId: resolvedContext.profile?.id || 'legacy_open',
        tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
        context: resolvedContext,
      };
    }
    const scored = (Array.isArray(candidates) ? candidates : []).map((candidate) => {
      const creditFactor = clamp(numeric(candidate?.credit, 0) / Math.max(1, shortage || money(due) || numeric(candidate?.credit, 1)), 0, 1);
      const env = buildRuleEvaluationEnv({
        profile,
        assetKind: candidate?.type === 'property' ? String(candidate?.propertyKind || 'port') : 'permission',
        runtimeSignals: {
          cash_generated: creditFactor,
          origin_control_gain_norm: candidate?.type === 'property' && candidate?.propertyKind !== 'toll' ? 0.4 : 0.1,
          combo_break_loss_norm: clamp((candidate?.monopolyProtected ? 0.85 : 0.25) + (numeric(candidate?.remainingPermissionCount, 2) <= 1 ? 0.2 : 0), 0, 1),
          late_game_keep_penalty: clamp(candidate?.monopolyProtected ? 0.8 : 0.2, 0, 1),
        },
      });
      const score = evaluateFormulaDefinition(decisionRule.ranking_formula, env);
      return { candidate, score };
    });
    const best = scored.reduce((winner, entry) => {
      if (!winner) return entry;
      return entry.score > winner.score ? entry : winner;
    }, null);
    return {
      candidate: best?.candidate || null,
      score: best?.score || 0,
      shouldMortgage: Boolean(best?.candidate) && shortageRatio >= numeric(decisionRule.thresholds?.must_raise_cash_gap_ratio, 0.12),
      profileId: resolvedContext.profile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
      context: resolvedContext,
    };
  }

  function decideRedeemCandidate({ player, candidates = [], context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const profile = resolvedContext.profile || null;
    const cash = money(player?.cash || 0);
    const reserveTarget = reserveCashTarget(player, Math.max(120, Math.floor(cash * 0.22)), profile, 'redeem');
    const decisionRule = getDecisionRule('liquidity', 'redeem_candidate');
    const scored = (Array.isArray(candidates) ? candidates : []).map((candidate) => {
      const cost = money(candidate?.cost || 0);
      const env = buildRuleEvaluationEnv({
        profile,
        assetKind: candidate?.type === 'property' ? String(candidate?.propertyKind || 'port') : 'permission',
        runtimeSignals: {
          origin_control_gain_norm: candidate?.type === 'property' && candidate?.propertyKind !== 'toll' ? 0.4 : 0.1,
          combo_restore_gain_norm: clamp((candidate?.monopolyProtected ? 0.85 : 0.3) + (numeric(candidate?.remainingPermissionCount, 2) <= 1 ? 0.15 : 0), 0, 1),
          yield_recovery: clamp(cost > 0 ? numeric(candidate?.yieldRecovery, candidate?.credit || 0) / Math.max(1, cost) : 0, 0, 1),
          reserve_cash_target_amount: reserveTarget,
          current_cash: cash,
        },
      });
      const score = evaluateFormulaDefinition(decisionRule?.ranking_formula, env);
      return { candidate, score };
    });
    const best = scored.reduce((winner, entry) => {
      if (!winner) return entry;
      return entry.score > winner.score ? entry : winner;
    }, null);
    const spareCash = cash - reserveTarget;
    const shouldRedeem = Boolean(best?.candidate)
      && spareCash >= Math.max(0, money(best.candidate?.cost || 0) * 0.55)
      && best.score >= numeric(decisionRule?.thresholds?.redeem, 0.57);
    return {
      candidate: best?.candidate || null,
      score: best?.score || 0,
      reserveTarget,
      shouldRedeem,
      profileId: resolvedContext.profile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
      context: resolvedContext,
    };
  }

  function freightScale(choices = []) {
    return (Array.isArray(choices) ? choices : []).reduce((best, entry) => {
      const freight = Math.max(0, numeric(entry?.projectedFreight, numeric(entry?.fee, 0) * Math.max(1, numeric(entry?.multiplier, 1))));
      return Math.max(best, freight);
    }, 0);
  }

  global.RdMAiPolicyEngine = {
    resolveTableConfig,
    buildLegacyBaseline,
    buildStageTableConfig,
    ensureProfile,
    applyTableConfigToPlayers,
    applyBaselineToPlayers,
    buildDecisionContext,
    decideBuyBankProperty,
    decideOwnedPropertyNegotiation,
    evaluateOwnedPropertyBarter,
    buildHumanOwnedPropertyNegotiation,
    acceptHumanOwnedPropertyOffer,
    respondToHumanOwnedPropertyOffer,
    closeHumanOwnedPropertyNegotiation,
    buildHumanSalePropertyNegotiation,
    acceptHumanSaleOffer,
    respondToHumanSaleCounterOffer,
    closeHumanSaleNegotiation,
    chooseBestPermission,
    decideExtraPermissionPurchase,
    decideCouponUsage,
    decideMortgageCandidate,
    decideRedeemCandidate,
  };
})(window);
