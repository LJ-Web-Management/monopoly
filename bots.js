// ===== Bot AI heuristics =====

const Bot = {
  // Reserve cash a bot tries to keep on hand relative to game stage
  reserve(game, player) {
    return 150 + player.properties.length * 10;
  },

  decideBuy(game, player, spaceIndex) {
    const sp = BOARD[spaceIndex];
    const afterMoney = player.money - sp.price;
    if (afterMoney < this.reserve(game, player) * 0.6) return false;
    return true;
  },

  // Returns bid amount to raise to, or null to pass. currentBid is highest bid so far.
  decideAuctionBid(game, player, spaceIndex, currentBid, highBidderId) {
    if (highBidderId === player.id) return null;
    const sp = BOARD[spaceIndex];
    let valuation = sp.price;
    // value more if it completes/extends a monopoly the bot owns
    if (sp.type === 'property') {
      const set = game.ownedColorSet(sp.color);
      const ownedByMe = set.filter((s) => game.state[s.i].owner === player.id).length;
      if (ownedByMe > 0) valuation *= 1.6;
    }
    const maxBid = Math.min(Math.floor(valuation * 1.1), player.money - this.reserve(game, player) * 0.4);
    const next = currentBid + (currentBid < 50 ? 10 : 20);
    if (next <= maxBid && next < player.money) return next;
    return null;
  },

  decideJailAction(game, player) {
    // if bot has good properties to build on, pay to get out fast; otherwise try rolling
    const hasMonopoly = BOARD.filter((s) => s.type === 'property').some(
      (s) => game.state[s.i].owner === player.id && game.playerOwnsFullSet(player, s.color)
    );
    if (player.jailCards > 0) return 'card';
    if (player.jailTurns >= MAX_JAIL_TURNS - 1) return 'pay_forced';
    if (hasMonopoly && player.money > JAIL_FINE + this.reserve(game, player)) return 'pay';
    return 'roll';
  },

  // Decide whether/what houses to build this turn end. Returns array of spaceIndex to build one house on (called iteratively).
  pickHouseBuild(game, player) {
    const colors = [...new Set(player.properties.map((i) => BOARD[i].color).filter(Boolean))];
    let best = null;
    let bestScore = -1;
    colors.forEach((color) => {
      if (!game.playerOwnsFullSet(player, color)) return;
      const set = game.ownedColorSet(color);
      set.forEach((s) => {
        if (game.canBuildHouse(player, s.i)) {
          const score = 100 - game.state[s.i].houses * 5 + s.price / 50;
          if (score > bestScore) {
            bestScore = score;
            best = s.i;
          }
        }
      });
    });
    if (best === null) return null;
    if (player.money - BOARD[best].houseCost < this.reserve(game, player)) return null;
    return best;
  },

  // Try to raise `amount` cash via mortgaging then selling houses, cheapest assets first.
  raiseCash(game, player, amount) {
    while (player.money < amount) {
      // sell houses on least valuable color sets first
      const sellable = player.properties
        .filter((i) => game.canSellHouse(player, i))
        .sort((a, b) => BOARD[a].houseCost - BOARD[b].houseCost);
      if (sellable.length > 0) {
        game.sellHouse(player, sellable[0]);
        continue;
      }
      const mortgageable = player.properties
        .filter((i) => !game.state[i].mortgaged && game.state[i].houses === 0)
        .sort((a, b) => BOARD[a].mortgage - BOARD[b].mortgage);
      if (mortgageable.length > 0) {
        game.mortgageProperty(player, mortgageable[0]);
        continue;
      }
      break;
    }
    return player.money >= amount;
  },

  // Very simple trade acceptance heuristic: accept if it improves monopoly potential and is cash-fair
  evaluateTrade(game, player, offer) {
    // offer: { give: {cash, props:[idx]}, get: {cash, props:[idx]} } from this player's perspective (get = what they receive)
    const valueOf = (props, cash) => {
      let v = cash;
      props.forEach((i) => {
        const sp = BOARD[i];
        v += sp.price || sp.mortgage * 2;
      });
      return v;
    };
    const giveVal = valueOf(offer.give.props, offer.give.cash);
    const getVal = valueOf(offer.get.props, offer.get.cash);
    let bonus = 0;
    offer.get.props.forEach((i) => {
      const sp = BOARD[i];
      if (sp.type === 'property') {
        const set = game.ownedColorSet(sp.color);
        const ownedAfter = set.filter((s) => game.state[s.i].owner === player.id || s.i === i).length;
        if (ownedAfter === set.length) bonus += sp.price * 0.8; // completes a monopoly
      }
    });
    return getVal + bonus >= giveVal * 0.95;
  },
};
