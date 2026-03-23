(function attachRdMEconomy(global) {
  const DEFAULT_RULES = {
    origin_owner_commission_share: 0.5,
    toll_owner_share: 0.5,
    freight_uses_multiplier_value_when_origin_owned: true,
    monopoly_stay_uses_multiplier_times_region_size: true,
    monopoly_origin_doubles_freight: true,
    mortgage_credit_ratio: 0.5,
    mortgage_release_multiplier: 1.5,
    extra_permission_cost: 2000,
  };

  function asNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function asBool(value, fallback) {
    if (typeof value === 'boolean') return value;
    return fallback;
  }

  function normalizeRules(rawRules = {}) {
    return {
      ...DEFAULT_RULES,
      ...rawRules,
      origin_owner_commission_share: Math.max(0, asNumber(rawRules.origin_owner_commission_share, DEFAULT_RULES.origin_owner_commission_share)),
      toll_owner_share: Math.max(0, asNumber(rawRules.toll_owner_share, DEFAULT_RULES.toll_owner_share)),
      freight_uses_multiplier_value_when_origin_owned: asBool(rawRules.freight_uses_multiplier_value_when_origin_owned, DEFAULT_RULES.freight_uses_multiplier_value_when_origin_owned),
      monopoly_stay_uses_multiplier_times_region_size: asBool(rawRules.monopoly_stay_uses_multiplier_times_region_size, DEFAULT_RULES.monopoly_stay_uses_multiplier_times_region_size),
      monopoly_origin_doubles_freight: asBool(rawRules.monopoly_origin_doubles_freight, DEFAULT_RULES.monopoly_origin_doubles_freight),
      mortgage_credit_ratio: Math.max(0, asNumber(rawRules.mortgage_credit_ratio, DEFAULT_RULES.mortgage_credit_ratio)),
      mortgage_release_multiplier: Math.max(1, asNumber(rawRules.mortgage_release_multiplier, DEFAULT_RULES.mortgage_release_multiplier)),
      extra_permission_cost: Math.max(0, asNumber(rawRules.extra_permission_cost, DEFAULT_RULES.extra_permission_cost)),
    };
  }

  function computeContractPreview({
    distance = 0,
    fee = 0,
    multiplier = 1,
    ownsOrigin = false,
    hasOriginMonopoly = false,
    rules = {},
  } = {}) {
    const config = normalizeRules(rules);
    const base = Math.max(0, Math.round(asNumber(distance, 0) * asNumber(fee, 0)));
    const originMultiplier = Math.max(1, asNumber(multiplier, 1));
    const ownedBase = ownsOrigin && config.freight_uses_multiplier_value_when_origin_owned
      ? Math.max(0, Math.round(base * originMultiplier))
      : base;
    const monopolyMultiplier = ownsOrigin && hasOriginMonopoly && config.monopoly_origin_doubles_freight ? 2 : 1;
    const total = Math.max(0, Math.round(ownedBase * monopolyMultiplier));

    let formula = `${distance} x ${fee} = ${base}`;
    if (ownsOrigin && config.freight_uses_multiplier_value_when_origin_owned) {
      formula = `${distance} x ${fee} x ${originMultiplier} = ${ownedBase}`;
    }
    if (monopolyMultiplier > 1) {
      formula = `${formula} x ${monopolyMultiplier} = ${total}`;
    }

    return {
      base,
      ownedBase,
      total,
      originMultiplier,
      monopolyMultiplier,
      ownsOrigin: Boolean(ownsOrigin),
      hasOriginMonopoly: Boolean(hasOriginMonopoly),
      formula,
    };
  }

  function computeContractSettlement({
    baseFreightValue = 0,
    roundsElapsed = 1,
    targetRounds = 4,
    freightMultiplier = 1,
    waiveOriginShare = false,
    originOwnerEligible = false,
    tollOwnerEligible = false,
    originMonopolyDouble = false,
    rules = {},
  } = {}) {
    const config = normalizeRules(rules);
    const settledBase = asNumber(baseFreightValue, 0);
    const effectiveFreightMultiplier = Math.max(1, asNumber(freightMultiplier, 1));
    const monopolyMultiplier = originMonopolyDouble && config.monopoly_origin_doubles_freight ? 2 : 1;
    const adjustedBase = Math.round(settledBase * monopolyMultiplier * effectiveFreightMultiplier);
    const resolvedTargetRounds = Math.max(1, asNumber(targetRounds, 4));
    const resolvedRoundsElapsed = Math.max(1, asNumber(roundsElapsed, 1));
    const earlyRounds = Math.max(0, resolvedTargetRounds - resolvedRoundsElapsed);
    const lateRounds = Math.max(0, resolvedRoundsElapsed - resolvedTargetRounds);
    const bonusPerRound = Math.max(0, asNumber(config.bonus_per_early_round, 0));
    const penaltyPerRound = Math.max(0, asNumber(config.penalty_per_late_round, 0));
    const adjustment = (earlyRounds * bonusPerRound) - (lateRounds * penaltyPerRound);
    const commissionBase = Math.max(0, adjustedBase);
    const gross = adjustedBase + adjustment;
    const originCommission = originOwnerEligible && !waiveOriginShare
      ? Math.max(0, Math.floor(commissionBase * config.origin_owner_commission_share))
      : 0;
    const tollShare = tollOwnerEligible
      ? Math.max(0, Math.floor(commissionBase * config.toll_owner_share))
      : 0;

    return {
      base: settledBase,
      adjustedBase,
      commissionBase,
      gross,
      targetRounds: resolvedTargetRounds,
      roundsElapsed: resolvedRoundsElapsed,
      earlyRounds,
      lateRounds,
      adjustment,
      freightMultiplier: effectiveFreightMultiplier,
      waiveOriginShare: Boolean(waiveOriginShare),
      monopolyMultiplier,
      originCommission,
      tollShare,
      total: gross - originCommission - tollShare,
    };
  }

  function computeStopCharge({
    fee = 0,
    multiplier = 1,
    ownerEligible = false,
    hasRegionMonopoly = false,
    regionSize = 1,
    propertyKind = 'port',
    rules = {},
  } = {}) {
    const config = normalizeRules(rules);
    const bankFee = Math.max(0, asNumber(fee, 0));
    let ownerCharge = Math.max(0, Math.round(asNumber(fee, 0) * Math.max(1, asNumber(multiplier, 1))));
    const monopolyApplied = ownerEligible
      && propertyKind === 'port'
      && hasRegionMonopoly
      && config.monopoly_stay_uses_multiplier_times_region_size;
    if (monopolyApplied) {
      ownerCharge *= Math.max(1, asNumber(regionSize, 1));
    }
    return {
      bankFee,
      ownerCharge: ownerEligible ? ownerCharge : 0,
      monopolyApplied,
      monopolyRegionSize: monopolyApplied ? Math.max(1, asNumber(regionSize, 1)) : 1,
    };
  }

  function mortgageCredit(purchasePrice, rules = {}) {
    const config = normalizeRules(rules);
    return Math.max(0, Math.floor(asNumber(purchasePrice, 0) * config.mortgage_credit_ratio));
  }

  function redeemCost(purchasePrice, rules = {}) {
    const credit = mortgageCredit(purchasePrice, rules);
    const config = normalizeRules(rules);
    return Math.max(0, Math.round(credit * config.mortgage_release_multiplier));
  }

  global.RDMEconomy = {
    DEFAULT_RULES,
    normalizeRules,
    computeContractPreview,
    computeContractSettlement,
    computeStopCharge,
    mortgageCredit,
    redeemCost,
  };
})(window);
