// ===== Game engine: state + rules =====

const HOUSES_AVAILABLE = 32;
const HOTELS_AVAILABLE = 12;
const GO_SALARY = 200;
const JAIL_FINE = 50;
const JAIL_POS = 10;
const GOTOJAIL_POS = 30;
const MAX_JAIL_TURNS = 3;

class Player {
  constructor(id, name, token, isBot, botLevel) {
    this.id = id;
    this.name = name;
    this.token = token;
    this.isBot = isBot;
    this.botLevel = botLevel || 'normal';
    this.money = 1500;
    this.pos = 0;
    this.properties = []; // indices into BOARD
    this.inJail = false;
    this.jailTurns = 0;
    this.jailCards = 0; // Get Out of Jail Free cards held (count)
    this.jailCardsList = []; // [{deckName, card}]
    this.bankrupt = false;
    this.doublesCount = 0;
  }
}

class Game {
  constructor(playerConfigs, opts = {}) {
    this.players = playerConfigs.map((c, idx) => new Player(idx, c.name, c.token, c.isBot, c.botLevel));
    this.state = {}; // per-property state: { owner, houses (0-5, 5=hotel), mortgaged }
    BOARD.forEach((sp) => {
      if (sp.type === 'property' || sp.type === 'railroad' || sp.type === 'utility') {
        this.state[sp.i] = { owner: null, houses: 0, mortgaged: false };
      }
    });
    this.chanceDeck = shuffle(CHANCE_CARDS.map((c, i) => ({ ...c, id: 'ch' + i })));
    this.chestDeck = shuffle(CHEST_CARDS.map((c, i) => ({ ...c, id: 'cc' + i })));
    this.houseStock = HOUSES_AVAILABLE;
    this.hotelStock = HOTELS_AVAILABLE;
    this.freeParkingPot = 0;
    this.freeParkingRule = !!opts.freeParkingRule; // house-rule: taxes go to free parking pot
    this.turnIndex = 0;
    this.log = [];
    this.gameOver = false;
    this.winner = null;
    this.lastDice = null;
    this.turnNumber = 1;
  }

  currentPlayer() {
    return this.players[this.turnIndex];
  }

  activePlayers() {
    return this.players.filter((p) => !p.bankrupt);
  }

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 300) this.log.shift();
  }

  rollDice() {
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    this.lastDice = [d1, d2];
    return [d1, d2];
  }

  ownedColorSet(color) {
    return BOARD.filter((s) => s.type === 'property' && s.color === color);
  }

  playerOwnsFullSet(player, color) {
    const set = this.ownedColorSet(color);
    return set.every((s) => this.state[s.i].owner === player.id);
  }

  countRailroadsOwned(playerId) {
    return BOARD.filter((s) => s.type === 'railroad' && this.state[s.i].owner === playerId).length;
  }

  countUtilitiesOwned(playerId) {
    return BOARD.filter((s) => s.type === 'utility' && this.state[s.i].owner === playerId).length;
  }

  getRent(spaceIndex, diceTotal) {
    const sp = BOARD[spaceIndex];
    const st = this.state[spaceIndex];
    if (st.mortgaged) return 0;
    if (sp.type === 'railroad') {
      const n = this.countRailroadsOwned(st.owner);
      return RAILROAD_RENTS[n - 1] || 0;
    }
    if (sp.type === 'utility') {
      const n = this.countUtilitiesOwned(st.owner);
      const mult = n >= 2 ? 10 : 4;
      return mult * (diceTotal || 7);
    }
    if (sp.type === 'property') {
      const houses = st.houses;
      if (houses === 0) {
        const owner = this.players[st.owner];
        const hasMonopoly = this.playerOwnsFullSet(owner, sp.color);
        return hasMonopoly ? sp.rent[0] * 2 : sp.rent[0];
      }
      return sp.rent[houses];
    }
    return 0;
  }

  netWorth(player) {
    let total = player.money;
    player.properties.forEach((i) => {
      const sp = BOARD[i];
      const st = this.state[i];
      total += st.mortgaged ? sp.mortgage : sp.price || sp.mortgage * 2;
      if (sp.type === 'property') {
        total += st.houses < 5 ? st.houses * sp.houseCost * 0.5 : sp.houseCost * 5 * 0.5;
      }
    });
    return total;
  }

  // ---- Money transfer helpers ----
  pay(player, amount, recipient) {
    player.money -= amount;
    if (recipient) recipient.money += amount;
    else if (this.freeParkingRule) this.freeParkingPot += amount;
  }

  collectFreeParkingPot(player) {
    player.money += this.freeParkingPot;
    this.addLog(`${player.name} collects $${this.freeParkingPot} from Free Parking!`);
    this.freeParkingPot = 0;
  }

  canAfford(player, amount) {
    return player.money >= amount;
  }

  // Raise cash by mortgaging / would-be selling; used for bot liquidation and validation
  liquidatableValue(player) {
    let val = player.money;
    player.properties.forEach((i) => {
      const sp = BOARD[i];
      const st = this.state[i];
      if (!st.mortgaged) val += Math.floor(sp.mortgage);
      if (sp.type === 'property' && st.houses > 0) val += st.houses * Math.floor(sp.houseCost / 2);
    });
    return val;
  }

  buyProperty(player, spaceIndex) {
    const sp = BOARD[spaceIndex];
    const st = this.state[spaceIndex];
    if (st.owner !== null) return false;
    if (!this.canAfford(player, sp.price)) return false;
    player.money -= sp.price;
    st.owner = player.id;
    player.properties.push(spaceIndex);
    this.addLog(`${player.name} bought ${sp.name} for $${sp.price}`);
    return true;
  }

  transferProperty(spaceIndex, toPlayerId) {
    const sp = BOARD[spaceIndex];
    const st = this.state[spaceIndex];
    const fromId = st.owner;
    if (fromId !== null) {
      const fromP = this.players[fromId];
      fromP.properties = fromP.properties.filter((i) => i !== spaceIndex);
    }
    st.owner = toPlayerId;
    if (toPlayerId !== null) {
      this.players[toPlayerId].properties.push(spaceIndex);
    }
  }

  mortgageProperty(player, spaceIndex) {
    const sp = BOARD[spaceIndex];
    const st = this.state[spaceIndex];
    if (st.owner !== player.id || st.mortgaged) return false;
    if (sp.type === 'property' && st.houses > 0) return false;
    st.mortgaged = true;
    player.money += sp.mortgage;
    this.addLog(`${player.name} mortgaged ${sp.name} for $${sp.mortgage}`);
    return true;
  }

  unmortgageProperty(player, spaceIndex) {
    const sp = BOARD[spaceIndex];
    const st = this.state[spaceIndex];
    if (st.owner !== player.id || !st.mortgaged) return false;
    const cost = Math.ceil(sp.mortgage * 1.1);
    if (!this.canAfford(player, cost)) return false;
    player.money -= cost;
    st.mortgaged = false;
    this.addLog(`${player.name} unmortgaged ${sp.name} for $${cost}`);
    return true;
  }

  canBuildHouse(player, spaceIndex) {
    const sp = BOARD[spaceIndex];
    if (sp.type !== 'property') return false;
    const st = this.state[spaceIndex];
    if (st.owner !== player.id || st.mortgaged) return false;
    if (!this.playerOwnsFullSet(player, sp.color)) return false;
    if (st.houses >= 5) return false;
    const setSpaces = this.ownedColorSet(sp.color);
    if (setSpaces.some((s) => this.state[s.i].mortgaged)) return false;
    // even building rule: can't build on this one more than any other in the set
    const minHouses = Math.min(...setSpaces.map((s) => this.state[s.i].houses));
    if (st.houses > minHouses) return false;
    if (st.houses === 4) {
      if (this.hotelStock <= 0) return false;
    } else {
      if (this.houseStock <= 0) return false;
    }
    if (!this.canAfford(player, sp.houseCost)) return false;
    return true;
  }

  buildHouse(player, spaceIndex) {
    if (!this.canBuildHouse(player, spaceIndex)) return false;
    const sp = BOARD[spaceIndex];
    const st = this.state[spaceIndex];
    player.money -= sp.houseCost;
    if (st.houses === 4) {
      this.hotelStock--;
      this.houseStock += 4; // returns 4 houses to bank
      st.houses = 5;
      this.addLog(`${player.name} built a hotel on ${sp.name}`);
    } else {
      this.houseStock--;
      st.houses++;
      this.addLog(`${player.name} built a house on ${sp.name} (${st.houses})`);
    }
    return true;
  }

  canSellHouse(player, spaceIndex) {
    const sp = BOARD[spaceIndex];
    if (sp.type !== 'property') return false;
    const st = this.state[spaceIndex];
    if (st.owner !== player.id || st.houses <= 0) return false;
    const setSpaces = this.ownedColorSet(sp.color);
    const maxHouses = Math.max(...setSpaces.map((s) => this.state[s.i].houses));
    if (st.houses < maxHouses) return false;
    if (st.houses === 5 && this.houseStock < 4) return false; // need 4 houses back in bank to convert
    return true;
  }

  sellHouse(player, spaceIndex) {
    if (!this.canSellHouse(player, spaceIndex)) return false;
    const sp = BOARD[spaceIndex];
    const st = this.state[spaceIndex];
    const refund = Math.floor(sp.houseCost / 2);
    if (st.houses === 5) {
      st.houses = 4;
      this.hotelStock++;
      this.houseStock -= 4;
    } else {
      st.houses--;
      this.houseStock++;
    }
    player.money += refund;
    this.addLog(`${player.name} sold a building on ${sp.name} for $${refund}`);
    return true;
  }

  // Handle a player going bankrupt to a creditor (player or null=bank)
  bankruptPlayer(player, creditor) {
    player.bankrupt = true;
    this.addLog(`💀 ${player.name} has gone BANKRUPT${creditor ? ' to ' + creditor.name : ' to the Bank'}!`);
    const props = player.properties.slice();
    props.forEach((i) => {
      const sp = BOARD[i];
      const st = this.state[i];
      if (creditor) {
        this.transferProperty(i, creditor.id);
      } else {
        // to bank: houses removed, property becomes unowned (available for auction later)
        if (st.houses > 0) {
          this.houseStock += st.houses === 5 ? 0 : st.houses;
          if (st.houses === 5) this.hotelStock += 1;
          st.houses = 0;
        }
        st.mortgaged = false;
        this.transferProperty(i, null);
      }
    });
    if (creditor) {
      creditor.money += Math.max(0, player.money);
    }
    player.money = 0;
    player.properties = [];
    // check win condition
    const remaining = this.activePlayers();
    if (remaining.length === 1) {
      this.gameOver = true;
      this.winner = remaining[0];
      this.addLog(`🏆 ${remaining[0].name} wins the game!`);
    }
  }

  nextTurn() {
    const active = this.activePlayers();
    if (active.length <= 1) {
      this.gameOver = true;
      this.winner = active[0] || null;
      return;
    }
    do {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
    } while (this.players[this.turnIndex].bankrupt);
    this.turnNumber++;
    this.currentPlayer().doublesCount = 0;
  }

  sendToJail(player) {
    player.pos = JAIL_POS;
    player.inJail = true;
    player.jailTurns = 0;
    this.addLog(`${player.name} is sent to Jail!`);
  }

  drawCard(deckName) {
    const deck = deckName === 'chance' ? this.chanceDeck : this.chestDeck;
    const card = deck.shift();
    if (card.type !== 'jailFree') deck.push(card);
    return card;
  }

  returnJailFreeCard(deckName, card) {
    const deck = deckName === 'chance' ? this.chanceDeck : this.chestDeck;
    deck.push(card);
  }
}
