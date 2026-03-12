(function initRdMAiPolicyEngine(global) {
  const profileLib = global.RdMAiProfiles;

  function currentPurchasePolicy(player) {
    return player?.purchase_policy || 'always';
  }

  function ensureProfile(player) {
    if (!player) return null;
    if (player.ai_profile) return player.ai_profile;
    if (!profileLib?.assignProfile) return null;
    return profileLib.assignProfile(player, {
      archetypeId: player.ai_archetype_id || 'legacy_open',
    });
  }

  function buildDecisionContext(player, extra = {}) {
    const profile = ensureProfile(player);
    return {
      player,
      profile,
      rules: extra.rules || null,
      session: extra.session || null,
      reason: extra.reason || 'legacy',
      ...extra,
    };
  }

  function decideBuyBankProperty({ player, card = null, price = 0, context = {} } = {}) {
    const profile = ensureProfile(player);
    const normalizedPrice = Math.max(0, Number(price || card?.price || 0));
    const policy = currentPurchasePolicy(player);
    let shouldBuy = false;
    if (player?.bankrupt) {
      shouldBuy = false;
    } else if (policy === 'never') {
      shouldBuy = false;
    } else if (policy === 'random') {
      shouldBuy = player.cash >= normalizedPrice && Math.random() >= 0.5;
    } else {
      shouldBuy = player.cash >= normalizedPrice;
    }
    return {
      shouldBuy,
      policy,
      price: normalizedPrice,
      profileId: profile?.id || 'legacy_open',
      context: buildDecisionContext(player, context),
    };
  }

  function decideOwnedPropertyNegotiation({ player, owner = null, card = null, price = 0, context = {} } = {}) {
    const baseDecision = decideBuyBankProperty({ player, card, price, context });
    return {
      ...baseDecision,
      ownerId: owner?.id || null,
      phase: 'legacy_accept_or_reject',
    };
  }

  function chooseBestPermission({ player, selection = null, choices = [], originCode = null } = {}) {
    ensureProfile(player);
    const resolvedSelection = selection || {};
    const resolvedChoices = Array.isArray(choices) && choices.length
      ? choices
      : (resolvedSelection.choices || []);
    const bestChoice = resolvedChoices.reduce((best, entry) => {
      if (!best) return entry;
      if (entry.comparisonValue > best.comparisonValue) return entry;
      if (entry.comparisonValue < best.comparisonValue) return best;
      if (entry.isCurrent) return entry;
      return best;
    }, null);
    const resolvedOriginCode = originCode ?? resolvedSelection.originCode ?? null;
    const ownsOrigin = Boolean(resolvedSelection.ownsOrigin);
    return {
      choice: bestChoice,
      originCode: resolvedOriginCode,
      ownsOrigin,
      reason: ownsOrigin ? 'legacy_best_origin_freight' : 'legacy_best_stay',
    };
  }

  function decideExtraPermissionPurchase({ player, extraCost = 0, availableCount = 0, context = {} } = {}) {
    const profile = ensureProfile(player);
    const normalizedCost = Math.max(0, Number(extraCost || 0));
    const policy = currentPurchasePolicy(player);
    const shouldBuy = !player?.bankrupt
      && availableCount > 0
      && player.cash >= normalizedCost
      && policy !== 'never';
    return {
      shouldBuy,
      policy,
      price: normalizedCost,
      profileId: profile?.id || 'legacy_open',
      context: buildDecisionContext(player, context),
    };
  }

  function decideCouponUsage({ player, kind = '', autoUse = true, context = {} } = {}) {
    const profile = ensureProfile(player);
    const shouldUse = !player?.is_human && Boolean(autoUse);
    return {
      shouldUse,
      kind,
      profileId: profile?.id || 'legacy_open',
      context: buildDecisionContext(player, context),
    };
  }

  global.RdMAiPolicyEngine = {
    ensureProfile,
    buildDecisionContext,
    decideBuyBankProperty,
    decideOwnedPropertyNegotiation,
    chooseBestPermission,
    decideExtraPermissionPurchase,
    decideCouponUsage,
  };
})(window);
