(function initRdMAiPolicyEngine(global) {
  const profileLib = global.RdMAiProfiles;

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

  function resolveNegotiationProfileFlags(profile = null) {
    const negotiation = profile?.negotiation || {};
    const buyOpenness = clamp(numeric(negotiation.buy_openness, 1), 0, 1);
    const sellOpenness = clamp(numeric(negotiation.sell_openness, 1), 0, 1);
    const strategicLock = clamp(numeric(negotiation.strategic_lock, 0), 0, 1);
    const discountTolerance = clamp(numeric(negotiation.discount_tolerance, 1), 0, 1);
    const premiumTolerance = clamp(numeric(negotiation.premium_tolerance, 1), 0, 1);
    return {
      tradeLocked: Boolean(numeric(negotiation.trade_locked, 0) >= 0.5),
      buyBlocked: Boolean(numeric(negotiation.buy_blocked, 0) >= 0.5) || (buyOpenness <= 0.03 && premiumTolerance <= 0.12),
      sellBlocked: Boolean(numeric(negotiation.sell_blocked, 0) >= 0.5) || (sellOpenness <= 0.03 && strategicLock >= 0.95 && discountTolerance <= 0.08),
      forceBuy: Boolean(numeric(negotiation.force_buy, 0) >= 0.5),
      forceSell: Boolean(numeric(negotiation.force_sell, 0) >= 0.5),
      tradeForced: Boolean(numeric(negotiation.trade_forced, 0) >= 0.5),
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
    const reserveRatio = clamp(numeric(profile?.personality?.cash_reserve_ratio, 0), 0, 0.8);
    const horizon = clamp(numeric(profile?.vision?.planning_horizon_turns, 0) / 10, 0, 1.2);
    const discipline = clamp(numeric(profile?.skill?.liquidity_discipline, 0), 0, 1);
    const tollWeight = numeric(profile?.vision?.weight_toll, 1);
    const riskTolerance = clamp(numeric(profile?.personality?.risk_tolerance, 0.5), 0, 1);
    let multiplier = 0.18 + (reserveRatio * 1.15) + (horizon * 0.26) + (discipline * 0.24);
    if (reason === 'origin_purchase' || reason === 'post_delivery_port_purchase') {
      multiplier -= 0.06;
    }
    if (reason === 'stop_toll_purchase') {
      multiplier += 0.05;
      multiplier -= Math.max(0, tollWeight - 1) * 0.18;
      multiplier -= Math.max(0, riskTolerance - 0.55) * 0.12;
    }
    return money(Math.min(cash, normalizedAmount * Math.max(0.08, multiplier)));
  }

  function scoreBankPropertyPurchase({ player, card = null, price = 0, resolvedContext }) {
    const profile = resolvedContext.profile || null;
    const signals = resolvedContext.purchaseSignals || {};
    const normalizedPrice = money(price || card?.price || 0);
    const cash = money(player?.cash || 0);
    const cashAfter = cash - normalizedPrice;
    const propertyKind = String(signals.propertyKind || card?.kind || 'port');
    const weightPort = numeric(profile?.vision?.weight_port, 1);
    const weightPermission = numeric(profile?.vision?.weight_permission, 1);
    const weightToll = numeric(profile?.vision?.weight_toll, 1);
    const weightMonopoly = numeric(profile?.vision?.weight_monopoly, 1);
    const weightOrigin = numeric(profile?.vision?.weight_origin_bonus, 1);
    const horizon = clamp(numeric(profile?.vision?.planning_horizon_turns, 0) / 10, 0, 1);
    const risk = clamp(numeric(profile?.personality?.risk_tolerance, 0.5), 0, 1);
    const impulse = clamp(numeric(profile?.personality?.impulsiveness, 0.5), 0, 1);
    const reserveRatio = clamp(numeric(profile?.personality?.cash_reserve_ratio, 0), 0, 0.8);
    const foresight = clamp(numeric(profile?.skill?.foresight, 0), 0, 1);
    const combo = clamp(numeric(profile?.skill?.combo_awareness, 0), 0, 1);
    const regionOwnedRatio = clamp(numeric(signals.regionOwnedRatio, 0), 0, 1);
    const wouldCompleteMonopoly = Boolean(signals.wouldCompleteMonopoly);
    const rateFee = Math.max(0, numeric(signals.rateFee, 0));
    const rateMultiplier = Math.max(1, numeric(signals.rateMultiplier, 1));
    const freightPotential = Math.max(0, numeric(signals.freightPotential, rateFee * rateMultiplier));
    const yieldRatio = clamp(freightPotential / Math.max(1, normalizedPrice), 0, 1.35);
    const ownedPorts = Math.max(0, numeric(signals.portsOwned, 0));
    const ownedTolls = Math.max(0, numeric(signals.tollsOwned, 0));
    const permissionCount = Math.max(0, numeric(signals.permissionCount, availablePermissionCount(player)));
    const availablePermissionCountValue = Math.max(0, numeric(signals.availablePermissionCount, 0));
    const reserveTarget = reserveCashTarget(player, normalizedPrice, profile, resolvedContext.reason || 'property_purchase');
    const reservePressure = clamp((reserveTarget - cashAfter) / Math.max(1, normalizedPrice), 0, 1.8);
    const pricePressure = clamp(normalizedPrice / Math.max(1, cash), 0, 1.6);
    const tollFocus = Math.max(0, weightToll - 1);

    let score = 0;
    if (propertyKind === 'port') {
      score += weightPort * 0.62;
      score += yieldRatio * 1.05;
      score += weightOrigin * clamp(((rateMultiplier - 1) * 0.22) + (yieldRatio * 0.18) + ((resolvedContext.reason === 'origin_purchase' || resolvedContext.reason === 'post_delivery_port_purchase') ? 0.16 : 0), 0, 0.95);
      score += weightPermission * clamp(Math.max(0, permissionCount - 1) / 4, 0, 1) * 0.38;
      score += weightMonopoly * clamp((regionOwnedRatio * 0.42) + (wouldCompleteMonopoly ? 0.82 : 0), 0, 1.2);
      score += combo * 0.16;
      score -= clamp((ownedPorts - (ownedTolls * 1.6)) / 10, 0, 0.22);
    } else {
      score += weightToll * 0.86;
      score += yieldRatio * 1.04;
      score += horizon * 0.34 * weightToll;
      score += clamp(((ownedPorts * 0.05) + (permissionCount * 0.04) + (freightPotential / Math.max(1, normalizedPrice)) * 0.26), 0, 1.05);
      score += combo * 0.16;
      score += tollFocus * 0.22;
      score += Math.max(0, risk - 0.45) * 0.08;
      score -= clamp((ownedTolls - (ownedPorts * 1.6 + permissionCount * 0.3)) / 12, 0, 0.12);
    }

    score += risk * 0.18;
    score += impulse * 0.08;
    score += foresight * 0.08;
    score += Math.min(0.12, availablePermissionCountValue * 0.015);
    const reservePenaltyWeight = propertyKind === 'toll'
      ? clamp(0.82 - (tollFocus * 0.18) - (risk * 0.08), 0.42, 0.98)
      : 1.08;
    const pricePenaltyWeight = propertyKind === 'toll'
      ? clamp(0.22 + (reserveRatio * 0.16) - (tollFocus * 0.06), 0.14, 0.42)
      : (0.30 + reserveRatio * 0.18);
    score -= reservePressure * reservePenaltyWeight;
    score -= pricePressure * pricePenaltyWeight;

    const thresholdBase = propertyKind === 'toll'
      ? 0.84 - (tollFocus * 0.18)
      : 0.9;
    const threshold = thresholdBase - (risk * 0.12) - (impulse * 0.08) - (combo * 0.08) + (reserveRatio * 0.18);
    const cashFloor = Math.max(
      0,
      reserveTarget - normalizedPrice * (
        propertyKind === 'toll'
          ? (0.26 + (risk * 0.18) + (tollFocus * 0.16))
          : (0.18 + (risk * 0.12))
      ),
    );
    const shouldBuy = cash >= normalizedPrice && cashAfter >= cashFloor && score >= threshold;
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
    const weightPermission = numeric(profile?.vision?.weight_permission, 1);
    const weightPort = numeric(profile?.vision?.weight_port, 1);
    const weightToll = numeric(profile?.vision?.weight_toll, 1);
    const risk = clamp(numeric(profile?.personality?.risk_tolerance, 0.5), 0, 1);
    const reserveRatio = clamp(numeric(profile?.personality?.cash_reserve_ratio, 0), 0, 0.8);
    const combo = clamp(numeric(profile?.skill?.combo_awareness, 0), 0, 1);
    const foresight = clamp(numeric(profile?.skill?.foresight, 0), 0, 1);
    const permissionCount = Math.max(0, numeric(signals.permissionCount, availablePermissionCount(player)));
    const ownedPorts = Math.max(0, numeric(signals.ownedPortCount, player?.ports_owned || 0));
    const ownedTolls = Math.max(0, numeric(signals.ownedTollCount, player?.tolls_owned || 0));
    const bestCurrentFreight = Math.max(0, numeric(signals.bestCurrentFreight, 0));
    const bestNewPermissionFreight = Math.max(0, numeric(signals.bestNewPermissionFreight, 0));
    const reserveTarget = reserveCashTarget(player, normalizedCost, profile, resolvedContext.reason || 'extra_permission_after_delivery');
    const reservePressure = clamp((reserveTarget - cashAfter) / Math.max(1, normalizedCost), 0, 1.8);
    const coverageRatio = clamp(permissionCount / 6, 0, 1);
    const upgradeRatio = clamp((bestNewPermissionFreight - bestCurrentFreight) / Math.max(1, bestCurrentFreight || bestNewPermissionFreight || 1), -0.3, 1.4);

    let score = 0;
    score += weightPermission * 0.72;
    score += clamp(ownedPorts / 6, 0, 1) * (0.42 + weightPort * 0.18);
    score += clamp(ownedTolls / 6, 0, 1) * weightToll * 0.08;
    score += Math.max(0, upgradeRatio) * (0.46 + combo * 0.14);
    score += availableCount * 0.05;
    score += risk * 0.08;
    score += foresight * 0.08;
    score -= coverageRatio * 0.72;
    score -= reservePressure * 1.02;
    score -= clamp(normalizedCost / Math.max(1, cash), 0, 1.4) * (0.28 + reserveRatio * 0.18);

    const threshold = 0.84 - (combo * 0.1) - (risk * 0.08) + (reserveRatio * 0.16);
    const shouldBuy = availableCount > 0 && cash >= normalizedCost && score >= threshold;
    return {
      shouldBuy,
      score,
      threshold,
      reserveTarget,
      reservePressure,
      coverageRatio,
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
      rules: extra.rules || null,
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

  function dynamicOwnedPropertyNegotiation({ player, owner = null, card = null, price = 0, resolvedContext }) {
    const buyerProfile = resolvedContext.profile || ensureProfile(player, resolvedContext.tableConfig);
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
        accepted: false,
        shouldBuy: false,
        canNegotiate: false,
        currentAsk: money(price || card?.price || 0),
        sellerLine: humanNegotiationReplyLine(closedReason, { card, owner }),
        sellerStanceId: 'irredutivel',
        sellerStanceLabel: 'Postura fechada',
        maxRounds: 2,
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
    const reason = String(resolvedContext.reason || 'owned_property_negotiation');
    const normalizedYield = clamp((Math.max(ownerCharge, freightPotential * 0.35)) / basePrice, 0, 0.24);
    const reasonBonus = reason === 'post_delivery_port_negotiation'
      ? 0.18
      : reason === 'stop_toll_negotiation'
        ? 0.14
        : reason === 'stop_port_negotiation'
          ? 0.08
          : 0.05;
    const buyerAggression = clamp(
      0.28
      + numeric(buyerProfile?.negotiation?.buy_openness, 1) * 0.22
      + numeric(buyerProfile?.personality?.risk_tolerance, 1) * 0.12
      + numeric(buyerProfile?.personality?.impulsiveness, 1) * 0.08,
      0.2,
      0.82,
    );
    const sellerFlexibility = clamp(
      0.18
      + numeric(ownerProfile?.negotiation?.sell_openness, 1) * 0.22
      + numeric(ownerProfile?.personality?.risk_tolerance, 1) * 0.06
      + numeric(ownerProfile?.negotiation?.desperation_discount, 0) * 0.10,
      0.12,
      0.72,
    );
    const sellerAttachment = clamp(
      0.16
      + numeric(ownerProfile?.personality?.asset_attachment, 0) * 0.12
      + numeric(ownerProfile?.negotiation?.strategic_lock, 0) * 0.16
      + (sellerWouldLoseMonopoly ? 0.24 : 0),
      0.1,
      0.85,
    );
    const buyerCashComfort = clamp((buyerCash - basePrice) / (basePrice * 2.2), -0.4, 0.55);
    const sellerCashStress = clamp((basePrice - ownerCash) / basePrice, 0, 1);
    const buyerStrategicLift = reasonBonus
      + normalizedYield * 0.85
      + (propertyKind === 'toll' ? 0.12 : 0.05)
      + clamp((buyerRegionAfterRatio - buyerRegionBeforeRatio) * 0.45, 0, 0.18)
      + (buyerWouldCompleteMonopoly ? 0.42 : 0);
    const sellerStrategicLift = normalizedYield * 0.65
      + (propertyKind === 'toll' ? 0.14 : 0.06)
      + clamp((sellerRegionBeforeRatio - sellerRegionAfterRatio) * 0.40, 0, 0.16)
      + (sellerWouldLoseMonopoly ? 0.34 : 0);

    const buyerMax = money(Math.min(
      buyerCash,
      basePrice * (0.94 + buyerStrategicLift + buyerAggression * 0.08 + Math.max(0, buyerCashComfort) * 0.16),
    ));
    const sellerMin = money(Math.max(
      mortgageFloor * 1.15,
      basePrice * (0.80 + sellerStrategicLift + sellerAttachment * 0.10 - sellerCashStress * 0.18 - sellerFlexibility * 0.05),
    ));
    const overlap = buyerMax - sellerMin;
    const minimumOverlap = basePrice * clamp(0.02 + sellerAttachment * 0.04 - buyerAggression * 0.015, 0.01, 0.07);
    const buyerOpening = money(clamp(
      basePrice * (0.86 + buyerStrategicLift * 0.42 + buyerAggression * 0.05 + Math.max(0, buyerCashComfort) * 0.05),
      mortgageFloor,
      Math.max(mortgageFloor, buyerMax),
    ));
    const sellerCounter = money(Math.max(
      sellerMin,
      Math.min(
        Math.max(listPrice * 0.95, basePrice * (1.02 + sellerStrategicLift * 0.38 + sellerAttachment * 0.06 - sellerCashStress * 0.05)),
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
        ((sellerMin + buyerMax) / 2) + ((sellerAttachment - buyerAggression) * basePrice * 0.05),
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


  function resolveHumanNegotiationStance({ sellerFlexibility = 0, sellerCashStress = 0, sellerAttachment = 0, strategicLockScore = 0 } = {}) {
    if (strategicLockScore >= 0.84 && sellerCashStress < 0.25) {
      return { id: 'irredutivel', label: 'Postura irredutivel' };
    }
    if (sellerCashStress >= 0.55) {
      return { id: 'pressionado', label: 'Postura pressionada' };
    }
    if (sellerFlexibility >= 0.56 && sellerAttachment <= 0.28) {
      return { id: 'aberto', label: 'Postura aberta' };
    }
    if (sellerAttachment >= 0.46 || strategicLockScore >= 0.70) {
      return { id: 'duro', label: 'Postura dura' };
    }
    return { id: 'firme', label: 'Postura firme' };
  }

  function openingHumanNegotiationLine({ stance = null, card = null, owner = null } = {}) {
    const asset = card?.kind === 'toll' ? `o pedagio ${card?.code || '--'}` : `o porto ${card?.code || '--'}`;
    if (stance?.id === 'irredutivel') {
      return `${owner?.name || 'O dono'} nao costuma soltar ${asset}. Se vier proposta, precisa ser muito forte.`;
    }
    if (stance?.id === 'pressionado') {
      return `${owner?.name || 'O dono'} topa conversar sobre ${asset}, mas quer caixa de verdade.`;
    }
    if (stance?.id === 'aberto') {
      return `${owner?.name || 'O dono'} aceita conversar sobre ${asset}, mas nao vai entregar barato.`;
    }
    if (stance?.id === 'duro') {
      return `${owner?.name || 'O dono'} trata ${asset} como peca importante da companhia.`;
    }
    return `${owner?.name || 'O dono'} escuta proposta por ${asset} se o valor fizer sentido.`;
  }

  function humanNegotiationReplyLine(reason, { card = null, owner = null, amount = 0 } = {}) {
    const asset = card?.kind === 'toll' ? `o pedagio ${card?.code || '--'}` : `o porto ${card?.code || '--'}`;
    if (reason === 'accepted_current_offer') {
      return `Fechado. ${asset} sai por $ ${amount ? money(amount) : 0}.`;
    }
    if (reason === 'accepted_counter_offer') {
      return `Fechado por $ ${amount ? money(amount) : 0}. Nao abaixo disso.`;
    }
    if (reason === 'matched_ask') {
      return `Fechamos por $ ${amount ? money(amount) : 0}.`;
    }
    if (reason === 'strategic_lock') {
      return `${owner?.name || 'O dono'} nao abre negociacao por ${asset} agora.`;
    }
    if (reason === 'cash_short') {
      return `Seu caixa ainda nao abre uma proposta crivel por ${asset}.`;
    }
    if (reason === 'lowball') {
      return `Essa proposta ficou baixa demais para ${asset}.`;
    }
    if (reason === 'final_refusal') {
      return `Por esse valor, ${owner?.name || 'o dono'} prefere manter ${asset}.`;
    }
    if (reason === 'cash_gap') {
      return `Seu caixa nao chega onde ${owner?.name || 'o dono'} aceitaria vender ${asset}.`;
    }
    if (reason === 'no_counter_window') {
      return `${owner?.name || 'O dono'} nao viu espaco para fechar ${asset}.`;
    }
    if (reason === 'human_declined') {
      return `Sem acordo. ${asset} continua com ${owner?.name || 'o dono'}.`;
    }
    if (reason === 'seller_closed_market' || reason === 'trade_locked') {
      return `${owner?.name || 'O dono'} nao abre negocio por ${asset} nesta configuracao de mesa.`;
    }
    return `${owner?.name || 'O dono'} preferiu manter ${asset}.`;
  }

  function buildHumanOwnedPropertyNegotiation({ player, owner = null, card = null, price = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const dynamicPricing = Boolean(resolvedContext.marketRegime?.dynamic_pricing);
    const humanNegotiationEnabled = resolvedContext.marketRegime?.human_negotiation_enabled !== false;

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
        maxRounds: 2,
        round: 0,
      };
    }

    const ownerProfile = ensureProfile(owner, resolvedContext.tableConfig);
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
    const reason = String(resolvedContext.reason || 'owned_property_negotiation');
    const normalizedYield = clamp((Math.max(ownerCharge, freightPotential * 0.35)) / basePrice, 0, 0.24);
    const reasonBonus = reason === 'post_delivery_port_negotiation'
      ? 0.18
      : reason === 'stop_toll_negotiation'
        ? 0.14
        : reason === 'stop_port_negotiation'
          ? 0.08
          : 0.05;
    const sellerFlexibility = clamp(
      0.18
      + numeric(ownerProfile?.negotiation?.sell_openness, 1) * 0.22
      + numeric(ownerProfile?.personality?.risk_tolerance, 1) * 0.06
      + numeric(ownerProfile?.negotiation?.desperation_discount, 0) * 0.10,
      0.12,
      0.72,
    );
    const sellerAttachment = clamp(
      0.16
      + numeric(ownerProfile?.personality?.asset_attachment, 0) * 0.12
      + numeric(ownerProfile?.negotiation?.strategic_lock, 0) * 0.16
      + (sellerWouldLoseMonopoly ? 0.24 : 0),
      0.1,
      0.88,
    );
    const sellerCashStress = clamp((basePrice - ownerCash) / basePrice, 0, 1);
    const sellerStrategicLift = reasonBonus
      + normalizedYield * 0.65
      + (propertyKind === 'toll' ? 0.14 : 0.06)
      + clamp((sellerRegionBeforeRatio - sellerRegionAfterRatio) * 0.40, 0, 0.16)
      + (sellerWouldLoseMonopoly ? 0.34 : 0);
    const strategicLockScore = clamp(
      sellerStrategicLift * 0.72
      + sellerAttachment * 0.34
      + (sellerWouldLoseMonopoly ? 0.22 : 0)
      - sellerCashStress * 0.28,
      0,
      1,
    );
    const stance = resolveHumanNegotiationStance({
      sellerFlexibility,
      sellerCashStress,
      sellerAttachment,
      strategicLockScore,
    });
    const privateFloor = money(Math.max(
      mortgageFloor * 1.10,
      basePrice * (0.82 + sellerStrategicLift * 0.22 + sellerAttachment * 0.08 - sellerCashStress * 0.12),
    ));
    const privateTarget = money(Math.max(
      privateFloor,
      listPrice * (0.93 + sellerAttachment * 0.05) + basePrice * (sellerStrategicLift * 0.12),
    ));
    const initialAsk = money(Math.max(
      privateTarget,
      listPrice * (1.00 + sellerAttachment * 0.05) + basePrice * (0.04 + sellerStrategicLift * 0.12 - sellerCashStress * 0.05),
    ));
    const canOpenConversation = buyerCash >= Math.max(mortgageFloor, Math.floor(privateFloor * 0.72));
    const hardLock = strategicLockScore >= 0.90 && sellerCashStress < 0.30;
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
    const suggestedOffer = buyerCash > 0
      ? money(clamp(
          Math.max(privateFloor, initialAsk - (basePrice * clamp(0.08 + sellerFlexibility * 0.08 + sellerCashStress * 0.04, 0.08, 0.18))),
          Math.max(mortgageFloor, Math.floor(privateFloor * 0.82)),
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
      maxRounds: 2,
      round: 0,
      rejectionReason: canNegotiate ? null : (hardLock ? 'strategic_lock' : 'cash_short'),
      canNegotiate,
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
    const maxRounds = Math.max(1, numeric(session.maxRounds, 2));
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
      Math.floor(privateFloor * (0.90 + sellerAttachment * 0.05 - sellerCashStress * 0.08)),
      Math.floor(privateTarget * (0.80 + sellerAttachment * 0.06 - sellerCashStress * 0.08)),
      Math.floor(currentAsk * (0.66 + sellerAttachment * 0.04 - sellerCashStress * 0.05)),
    ));
    const acceptanceThreshold = money(clamp(
      Math.max(privateFloor, privateTarget * (0.96 - sellerFlexibility * 0.08 - sellerCashStress * 0.06 + sellerAttachment * 0.03)),
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
      0.42 + sellerFlexibility * 0.16 + sellerCashStress * 0.14 - sellerAttachment * 0.10,
      0.26,
      0.58,
    );
    let counterPrice = money(clamp(
      currentAsk - Math.max(basePrice * (0.05 + sellerCashStress * 0.03), (currentAsk - normalizedOffer) * concessionRatio),
      acceptanceThreshold,
      Math.max(acceptanceThreshold, currentAsk - 1),
    ));

    if (!(counterPrice > normalizedOffer)) {
      counterPrice = money(Math.max(acceptanceThreshold, normalizedOffer + Math.ceil(basePrice * 0.03)));
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
    const robotLine = `Posso descer para ${counterPrice}, mas so fecho nesse patamar.`;
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

  
  function resolveHumanSaleNegotiationStance({ buyerAggression = 0, buyerCashStress = 0, buyerStrategicLift = 0 } = {}) {
    if (buyerCashStress >= 0.58) {
      return { id: 'limitado', label: 'Oferta limitada' };
    }
    if (buyerStrategicLift >= 0.74) {
      return { id: 'forte', label: 'Interesse alto' };
    }
    if (buyerAggression >= 0.68) {
      return { id: 'agressivo', label: 'Comprador agressivo' };
    }
    return { id: 'moderado', label: 'Interesse moderado' };
  }

  function openingHumanSaleNegotiationLine({ stance = null, card = null, buyer = null } = {}) {
    const asset = card?.kind === 'toll' ? `o pedagio ${card?.code || '--'}` : `o porto ${card?.code || '--'}`;
    if (stance?.id === 'forte') {
      return `${buyer?.name || 'O comprador'} quer mesmo ${asset}, mas ainda tenta fechar por baixo do teto dele.`;
    }
    if (stance?.id === 'agressivo') {
      return `${buyer?.name || 'O comprador'} veio para negociar ${asset} com postura bem direta.`;
    }
    if (stance?.id === 'limitado') {
      return `${buyer?.name || 'O comprador'} topa conversar sobre ${asset}, mas o caixa esta apertado.`;
    }
    return `${buyer?.name || 'O comprador'} abriu conversa por ${asset} e espera uma resposta sua.`;
  }

  function humanSaleNegotiationReplyLine(reason, { card = null, buyer = null, amount = 0 } = {}) {
    const asset = card?.kind === 'toll' ? `o pedagio ${card?.code || '--'}` : `o porto ${card?.code || '--'}`;
    if (reason === 'accepted_current_bid') {
      return `Fechado. ${buyer?.name || 'O comprador'} leva ${asset} por $ ${amount ? money(amount) : 0}.`;
    }
    if (reason === 'accepted_counter_ask') {
      return `${buyer?.name || 'O comprador'} aceitou pagar $ ${amount ? money(amount) : 0} por ${asset}.`;
    }
    if (reason === 'matched_bid') {
      return `Negocio fechado por $ ${amount ? money(amount) : 0}.`;
    }
    if (reason === 'cash_gap') {
      return `${buyer?.name || 'O comprador'} nao chega nesse valor para ${asset}.`;
    }
    if (reason === 'high_ask') {
      return `${buyer?.name || 'O comprador'} achou alto demais o pedido por ${asset}.`;
    }
    if (reason === 'final_refusal') {
      return `${buyer?.name || 'O comprador'} desistiu de ${asset} nesse patamar.`;
    }
    if (reason === 'seller_declined') {
      return `Sem acordo. ${asset} continua na sua companhia.`;
    }
    if (reason === 'buyer_not_interested') {
      return `${buyer?.name || 'O comprador'} nao abriu uma proposta seria por ${asset}.`;
    }
    if (reason === 'buyer_closed_market' || reason === 'trade_locked') {
      return `${buyer?.name || 'O comprador'} nao negocia ${asset} nesta configuracao de mesa.`;
    }
    return `${buyer?.name || 'O comprador'} preferiu nao fechar ${asset}.`;
  }

  function buildHumanSalePropertyNegotiation({ player, owner = null, card = null, price = 0, context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const dynamicPricing = Boolean(resolvedContext.marketRegime?.dynamic_pricing);
    const humanNegotiationEnabled = resolvedContext.marketRegime?.human_negotiation_enabled !== false;

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
        maxRounds: 2,
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
        maxRounds: 2,
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
    const reason = String(resolvedContext.reason || 'owned_property_negotiation');
    const normalizedYield = clamp((Math.max(ownerCharge, freightPotential * 0.35)) / basePrice, 0, 0.24);
    const reasonBonus = reason === 'post_delivery_port_negotiation'
      ? 0.18
      : reason === 'stop_toll_negotiation'
        ? 0.14
        : reason === 'stop_port_negotiation'
          ? 0.08
          : 0.05;
    const buyerAggression = clamp(
      0.26
      + numeric(buyerProfile?.negotiation?.buy_openness, 1) * 0.24
      + numeric(buyerProfile?.personality?.risk_tolerance, 1) * 0.12
      + numeric(buyerProfile?.personality?.impulsiveness, 1) * 0.10,
      0.14,
      0.88,
    );
    const buyerCashStress = clamp((listPrice - buyerCash) / listPrice, 0, 1);
    const buyerStrategicLift = reasonBonus
      + normalizedYield * 0.58
      + (propertyKind === 'toll' ? 0.10 : 0.06)
      + clamp((buyerRegionAfterRatio - buyerRegionBeforeRatio) * 0.34, 0, 0.14)
      + (buyerWouldCompleteMonopoly ? 0.28 : 0);
    const stance = resolveHumanSaleNegotiationStance({
      buyerAggression,
      buyerCashStress,
      buyerStrategicLift,
    });
    const privateCeiling = money(Math.min(
      buyerCash,
      Math.max(
        mortgageFloor * 1.10,
        basePrice * (0.96 + buyerStrategicLift * 0.26 + buyerAggression * 0.12 - buyerCashStress * 0.18),
        listPrice * (0.88 + buyerAggression * 0.06 - buyerCashStress * 0.10),
      ),
    ));
    const privateTarget = money(Math.min(
      privateCeiling,
      Math.max(
        mortgageFloor,
        basePrice * (0.82 + buyerStrategicLift * 0.18 + buyerAggression * 0.06 - buyerCashStress * 0.12),
      ),
    ));
    const openingBid = money(Math.min(
      privateCeiling,
      Math.max(
        mortgageFloor,
        privateTarget - basePrice * (0.03 + (1 - buyerAggression) * 0.02),
        listPrice * (0.74 + buyerAggression * 0.08 - buyerCashStress * 0.12),
      ),
    ));
    const canNegotiate = buyerCash >= Math.max(mortgageFloor, Math.floor(privateTarget * 0.92)) && buyerStrategicLift >= 0.18;
    const suggestedAsk = money(Math.max(
      openingBid + Math.ceil(basePrice * 0.10),
      Math.min(buyerCash, privateCeiling + Math.ceil(basePrice * 0.06)),
    ));
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
      maxRounds: 2,
      round: 0,
      rejectionReason: canNegotiate ? null : 'buyer_not_interested',
      canNegotiate,
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
    const maxRounds = Math.max(1, numeric(session.maxRounds, 2));
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
      : Math.min(privateCeiling, Math.max(privateTarget, currentBid + Math.ceil(basePrice * 0.08)));
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

    const concessionRatio = clamp(0.42 + (session.buyerAggression || 0.4) * 0.18 - (session.buyerCashStress || 0) * 0.12, 0.24, 0.56);
    let counterBid = money(clamp(
      currentBid + Math.max(basePrice * (0.04 + (session.buyerAggression || 0.4) * 0.04), (normalizedAsk - currentBid) * concessionRatio),
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
    const robotLine = `Posso subir para ${counterBid}, mas esse e o meu limite agora.`;
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
    const weightPermission = numeric(profile?.vision?.weight_permission, 1);
    const weightOrigin = numeric(profile?.vision?.weight_origin_bonus, 1);
    const foresight = clamp(numeric(profile?.skill?.foresight, 0), 0, 1);
    const combo = clamp(numeric(profile?.skill?.combo_awareness, 0), 0, 1);
    const attachment = clamp(numeric(profile?.personality?.asset_attachment, 0.3), 0, 1);
    const impulse = clamp(numeric(profile?.personality?.impulsiveness, 0.5), 0, 1);
    const risk = clamp(numeric(profile?.personality?.risk_tolerance, 0.5), 0, 1);

    const scoredChoices = resolvedChoices.map((entry) => {
      const freight = Math.max(0, numeric(entry.projectedFreight, numeric(entry.fee, 0) * Math.max(1, numeric(entry.multiplier, 1))));
      const fee = Math.max(0, numeric(entry.fee, 0));
      const multiplier = Math.max(1, numeric(entry.multiplier, 1));
      let score = 0;
      if (ownsOrigin) {
        score += freight * (0.84 + (weightOrigin * 0.24));
        score += fee * (0.18 + weightPermission * 0.06);
        score += (multiplier - 1) * 34 * (0.34 + weightOrigin * 0.12 + combo * 0.08);
      } else {
        score += fee * (0.88 + weightPermission * 0.18 + foresight * 0.08);
        score += (multiplier - 1) * 12 * (0.22 + combo * 0.1 + risk * 0.06);
      }
      score += weightPermission * 6;
      if (entry.isCurrent) {
        score += 10 + (attachment * 18) + ((1 - impulse) * 7);
      }
      return {
        ...entry,
        aiScore: score,
      };
    });

    const bestChoice = scoredChoices.reduce((best, entry) => {
      if (!best) return entry;
      if (entry.aiScore > best.aiScore) return entry;
      if (entry.aiScore < best.aiScore) return best;
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
    const freightValue = money(activeContract?.base_freight_value || activeContract?.freight_value || 0);
    const roundsElapsed = Math.max(1, numeric(signals.roundsElapsed, numeric(activeContract?.rounds_elapsed, 1)));
    const targetRounds = Math.max(1, numeric(signals.targetRounds ?? signals.currentTargetRounds, numeric(activeContract?.target_rounds, 4)));
    const remainingRounds = Math.max(0, targetRounds - roundsElapsed);
    const reserveTarget = reserveCashTarget(player, Math.max(charge, 120), profile, 'coupon_usage');
    const pressure = clamp((reserveTarget - cash) / Math.max(1, reserveTarget || cash || 1), -1, 1.4);
    const patience = clamp(numeric(profile?.personality?.coupon_patience, 0.4), 0, 1);
    const impulse = clamp(numeric(profile?.personality?.impulsiveness, 0.4), 0, 1);
    const risk = clamp(numeric(profile?.personality?.risk_tolerance, 0.5), 0, 1);
    const weightToll = numeric(profile?.vision?.weight_toll, 1);
    const candidateCount = Math.max(0, numeric(signals.candidateCount, 0));
    let score = autoUse ? 0.52 : 0.22;
    let threshold = 0.56 + (patience * 0.14) - (impulse * 0.08) - (Math.max(0, pressure) * 0.18);

    if (kind === 'free_fuel') {
      score += clamp(charge / 40, 0, 1.6) * 0.46;
      score += Math.max(0, pressure) * 0.28;
      threshold = 0.62 + (patience * 0.16) - (risk * 0.08);
    } else if (kind === 'free_port_stay') {
      score += clamp(charge / 90, 0, 1.8) * 0.58;
      score += Math.max(0, pressure) * 0.24;
      if (signals.ownerPresent) score += 0.08;
      threshold = 0.68 + (patience * 0.14) - (risk * 0.08);
    } else if (kind === 'free_toll') {
      score += clamp(charge / 80, 0, 1.8) * 0.56;
      score += Math.max(0, pressure) * 0.24;
      if (signals.mandatoryToll) score += 0.12;
      threshold = 0.66 + (patience * 0.14) - (risk * 0.08);
    } else if (kind === 'shortcut_ignore_toll') {
      score += Math.max(0, pressure) * 0.24;
      score += signals.mandatoryToll ? 0.22 : 0;
      score += clamp((1.15 - weightToll) * 0.32, -0.08, 0.2);
      score += impulse * 0.08;
      threshold = 0.72 + (patience * 0.14) + Math.max(0, weightToll - 1) * 0.12;
    } else if (kind === 'reroute_same_value') {
      score += candidateCount > 0 ? 0.22 : -0.4;
      score += impulse * 0.1;
      score += risk * 0.06;
      threshold = 0.66 + (patience * 0.12);
    } else if (kind === 'free_fuel_contract') {
      score += autoUse ? 0.34 : -0.24;
      score += clamp(freightValue / 180, 0, 1.4) * 0.12;
      score += Math.max(0, pressure) * 0.18;
      threshold = 0.54 + (patience * 0.12) - (risk * 0.08);
    } else if (kind === 'extended_contract_deadline') {
      score += autoUse ? 0.36 : -0.26;
      score += remainingRounds <= 1 ? 0.18 : 0;
      score += roundsElapsed >= targetRounds ? 0.2 : 0;
      score += Math.max(0, pressure) * 0.12;
      threshold = 0.56 + (patience * 0.12) - (risk * 0.06);
    } else if (kind === 'cancel_contract') {
      score += autoUse ? 0.34 : -0.28;
      score += remainingRounds <= 1 ? 0.16 : 0;
      score += roundsElapsed >= targetRounds ? 0.2 : 0;
      score += freightValue > 0 && freightValue <= 120 ? 0.08 : 0;
      threshold = 0.57 + (patience * 0.12) - (impulse * 0.06) - (risk * 0.04);
    } else if (kind === 'double_freight') {
      score += clamp(freightValue / 150, 0, 1.8) * 0.46;
      score += Math.max(0, pressure) * 0.16;
      score += autoUse ? 0.08 : 0;
      threshold = 0.62 + (patience * 0.12) - (risk * 0.06);
    } else if (kind === 'anti_monopoly_owner_share' || kind === 'skip_owner_share') {
      score += clamp(freightValue / 160, 0, 1.6) * 0.44;
      score += signals.ownerId ? 0.12 : 0;
      score += Math.max(0, pressure) * 0.14;
      score += autoUse ? 0.08 : 0;
      threshold = 0.6 + (patience * 0.1) - (risk * 0.04);
    } else {
      score += Math.max(0, pressure) * 0.16;
      threshold = 0.64 + (patience * 0.14);
    }

    const shouldUse = Boolean(autoUse) && score >= threshold;
    return {
      shouldUse,
      accepted: shouldUse,
      kind,
      score,
      threshold,
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
    const weightPort = numeric(profile?.vision?.weight_port, 1);
    const weightPermission = numeric(profile?.vision?.weight_permission, 1);
    const weightToll = numeric(profile?.vision?.weight_toll, 1);
    const weightMonopoly = numeric(profile?.vision?.weight_monopoly, 1);
    const attachment = clamp(numeric(profile?.personality?.asset_attachment, 0.4), 0, 1);
    const urgency = clamp(shortage / Math.max(1, money(due) || shortage || 1), 0, 1.5);
    const scored = (Array.isArray(candidates) ? candidates : []).map((candidate) => {
      const creditFactor = numeric(candidate?.credit, 0) / Math.max(1, shortage || money(due) || numeric(candidate?.credit, 1));
      let strategicPenalty = attachment * 0.2;
      if (candidate?.type === 'property') {
        if (candidate?.propertyKind === 'toll') {
          strategicPenalty += weightToll * 0.52;
        } else {
          strategicPenalty += weightPort * 0.48;
          if (candidate?.monopolyProtected) strategicPenalty += weightMonopoly * 0.62;
        }
      } else {
        strategicPenalty += weightPermission * 0.58;
        if (numeric(candidate?.remainingPermissionCount, 0) <= 1) strategicPenalty += 0.5;
      }
      const score = creditFactor * (0.72 + urgency * 0.38) - strategicPenalty;
      return { candidate, score };
    });
    const best = scored.reduce((winner, entry) => {
      if (!winner) return entry;
      return entry.score > winner.score ? entry : winner;
    }, null);
    return {
      candidate: best?.candidate || null,
      score: best?.score || 0,
      shouldMortgage: Boolean(best?.candidate),
      profileId: resolvedContext.profile?.id || 'legacy_open',
      tableConfigId: resolvedContext.tableConfig?.id || 'legacy_open_table',
      context: resolvedContext,
    };
  }

  function decideRedeemCandidate({ player, candidates = [], context = {} } = {}) {
    const resolvedContext = buildDecisionContext(player, context);
    const profile = resolvedContext.profile || null;
    const weightPort = numeric(profile?.vision?.weight_port, 1);
    const weightPermission = numeric(profile?.vision?.weight_permission, 1);
    const weightToll = numeric(profile?.vision?.weight_toll, 1);
    const weightMonopoly = numeric(profile?.vision?.weight_monopoly, 1);
    const attachment = clamp(numeric(profile?.personality?.asset_attachment, 0.4), 0, 1);
    const cash = money(player?.cash || 0);
    const reserveTarget = reserveCashTarget(player, Math.max(120, Math.floor(cash * 0.22)), profile, 'redeem');
    const scored = (Array.isArray(candidates) ? candidates : []).map((candidate) => {
      let strategicValue = attachment * 0.16;
      if (candidate?.type === 'property') {
        if (candidate?.propertyKind === 'toll') {
          strategicValue += weightToll * 0.78;
        } else {
          strategicValue += weightPort * 0.56;
          if (candidate?.monopolyProtected) strategicValue += weightMonopoly * 0.66;
        }
      } else {
        strategicValue += weightPermission * 0.62;
        if (numeric(candidate?.remainingPermissionCount, 0) <= 1) strategicValue += 0.22;
      }
      const costPressure = money(candidate?.cost || 0) / Math.max(1, cash);
      const score = strategicValue - costPressure * 0.72;
      return { candidate, score };
    });
    const best = scored.reduce((winner, entry) => {
      if (!winner) return entry;
      return entry.score > winner.score ? entry : winner;
    }, null);
    const spareCash = cash - reserveTarget;
    const shouldRedeem = Boolean(best?.candidate) && spareCash >= Math.max(0, money(best.candidate?.cost || 0) * 0.55) && best.score >= 0.36;
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
