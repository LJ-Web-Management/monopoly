// ===== App controller: DOM, turn flow, modals =====

let game = null;
const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdbb2d', '#8e24aa', '#fb8c00', '#00acc1', '#6d4c41'];

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (n) => `$${n.toLocaleString()}`;

// Retrigger a CSS animation on an element by toggling a class with a forced reflow
function pop(elm, cls = 'pop') {
  if (!elm) return;
  elm.classList.remove(cls);
  void elm.offsetWidth;
  elm.classList.add(cls);
}

function flashSpace(pos) {
  const refs = spaceEls[pos];
  if (!refs) return;
  refs.cell.classList.remove('landing-flash');
  void refs.cell.offsetWidth;
  refs.cell.classList.add('landing-flash');
}

const CONFETTI_EMOJI = ['🎉', '🎊', '💵', '🏠', '⭐', '🎩'];
function spawnConfetti() {
  const layer = el('div', '');
  layer.id = 'confetti-layer';
  document.body.appendChild(layer);
  const count = 80;
  for (let i = 0; i < count; i++) {
    const piece = el('div', 'confetti-piece', CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)]);
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.fontSize = `${1 + Math.random() * 1.4}rem`;
    piece.style.animationDuration = `${2.5 + Math.random() * 2.5}s`;
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    layer.appendChild(piece);
  }
  setTimeout(() => layer.remove(), 6500);
}

// ---------------- Setup screen ----------------
let setupPlayers = [];

function initSetup() {
  setupPlayers = [
    { name: 'Player 1', isBot: false, token: PLAYER_TOKENS[0] },
    { name: 'Player 2', isBot: false, token: PLAYER_TOKENS[1] },
    { name: 'Bot 1', isBot: true, token: PLAYER_TOKENS[2] },
    { name: 'Bot 2', isBot: true, token: PLAYER_TOKENS[3] },
  ];
  renderSetup();
  $('#add-player-btn').onclick = () => {
    if (setupPlayers.length >= 8) return;
    const usedTokens = setupPlayers.map((p) => p.token);
    const token = PLAYER_TOKENS.find((t) => !usedTokens.includes(t)) || PLAYER_TOKENS[setupPlayers.length % PLAYER_TOKENS.length];
    setupPlayers.push({ name: `Player ${setupPlayers.length + 1}`, isBot: false, token });
    renderSetup();
  };
  $('#start-game-btn').onclick = startGame;
}

function renderSetup() {
  const container = $('#setup-players');
  container.innerHTML = '';
  setupPlayers.forEach((p, idx) => {
    const row = el('div', 'setup-row');
    row.innerHTML = `
      <span class="token-badge" style="background:${PLAYER_COLORS[idx % PLAYER_COLORS.length]}">${p.token}</span>
      <input type="text" class="name-input" value="${p.name}" maxlength="16" />
      <select class="type-select">
        <option value="human" ${!p.isBot ? 'selected' : ''}>Human</option>
        <option value="bot" ${p.isBot ? 'selected' : ''}>Bot</option>
      </select>
      <select class="token-select"></select>
      <button class="remove-btn" ${setupPlayers.length <= 2 ? 'disabled' : ''}>✕</button>
    `;
    const tokenSelect = row.querySelector('.token-select');
    PLAYER_TOKENS.forEach((t) => {
      const opt = el('option', '', t);
      opt.value = t;
      if (t === p.token) opt.selected = true;
      tokenSelect.appendChild(opt);
    });
    row.querySelector('.name-input').oninput = (e) => (setupPlayers[idx].name = e.target.value || `Player ${idx + 1}`);
    row.querySelector('.type-select').onchange = (e) => (setupPlayers[idx].isBot = e.target.value === 'bot');
    tokenSelect.onchange = (e) => (setupPlayers[idx].token = e.target.value);
    row.querySelector('.remove-btn').onclick = () => {
      if (setupPlayers.length <= 2) return;
      setupPlayers.splice(idx, 1);
      renderSetup();
    };
    container.appendChild(row);
  });
}

function startGame() {
  const configs = setupPlayers.map((p) => ({ name: p.name.trim() || 'Player', token: p.token, isBot: p.isBot }));
  const freeParkingRule = $('#free-parking-toggle').checked;
  game = new Game(configs, { freeParkingRule });
  $('#setup-screen').classList.add('hidden');
  $('#game-screen').classList.remove('hidden');
  buildBoardDOM();
  $('#properties-overview-btn').onclick = openPropertiesOverviewModal;
  updateUI();
  runGameLoop();
}

// ---------------- Board DOM ----------------
const spaceEls = {};

function gridPos(i) {
  if (i === 0) return { row: 11, col: 11 };
  if (i >= 1 && i <= 9) return { row: 11, col: 11 - i };
  if (i === 10) return { row: 11, col: 1 };
  if (i >= 11 && i <= 19) return { row: 11 - (i - 10), col: 1 };
  if (i === 20) return { row: 1, col: 1 };
  if (i >= 21 && i <= 29) return { row: 1, col: 1 + (i - 20) };
  if (i === 30) return { row: 1, col: 11 };
  return { row: 1 + (i - 30), col: 11 };
}

function buildBoardDOM() {
  const board = $('#board');
  board.innerHTML = '';
  BOARD.forEach((sp) => {
    const { row, col } = gridPos(sp.i);
    const isCorner = [0, 10, 20, 30].includes(sp.i);
    const cell = el('div', `space ${isCorner ? 'corner' : ''} type-${sp.type}`);
    cell.style.gridRow = `${row} / span 1`;
    cell.style.gridColumn = `${col} / span 1`;
    if (sp.color) {
      const bar = el('div', 'color-bar');
      bar.style.background = sp.color;
      cell.appendChild(bar);
    }
    const nameEl = el('div', 'space-name', sp.name);
    cell.appendChild(nameEl);
    if (sp.price) {
      cell.appendChild(el('div', 'space-price', money(sp.price)));
    }
    if (sp.type === 'tax') cell.appendChild(el('div', 'space-price', money(sp.amount)));
    const buildingsEl = el('div', 'buildings');
    cell.appendChild(buildingsEl);
    const tokensEl = el('div', 'tokens');
    cell.appendChild(tokensEl);
    const ownerBar = el('div', 'owner-bar');
    cell.appendChild(ownerBar);
    board.appendChild(cell);
    spaceEls[sp.i] = { cell, buildingsEl, tokensEl, ownerBar };
  });
  // center content
  const center = el('div', 'board-center');
  center.innerHTML = `
    <div class="brand">MONOPOLY</div>
    <div id="game-log"></div>
  `;
  board.appendChild(center);
}

function renderBoardState() {
  BOARD.forEach((sp) => {
    const refs = spaceEls[sp.i];
    if (!refs) return;
    refs.buildingsEl.innerHTML = '';
    refs.tokensEl.innerHTML = '';
    refs.ownerBar.style.background = 'transparent';
    const st = game.state[sp.i];
    if (st) {
      if (st.owner !== null) {
        refs.ownerBar.style.background = PLAYER_COLORS[st.owner % PLAYER_COLORS.length];
        refs.ownerBar.style.opacity = st.mortgaged ? 0.35 : 1;
      }
      if (sp.type === 'property' && st.houses > 0) {
        if (st.houses === 5) {
          refs.buildingsEl.appendChild(el('div', 'hotel', '🏨'));
        } else {
          for (let h = 0; h < st.houses; h++) refs.buildingsEl.appendChild(el('div', 'house', '🏠'));
        }
      }
      if (st.mortgaged) refs.cellMortgaged = true;
    }
  });
  game.players.forEach((p) => {
    if (p.bankrupt) return;
    const refs = spaceEls[p.pos];
    if (!refs) return;
    const t = el('div', 'token', p.token);
    t.style.borderColor = PLAYER_COLORS[p.id % PLAYER_COLORS.length];
    if (p.id === game.currentPlayer().id) t.classList.add('current');
    refs.tokensEl.appendChild(t);
  });
}

function renderLog() {
  const logEl = $('#game-log');
  if (!logEl) return;
  logEl.innerHTML = game.log
    .slice(-40)
    .map((l) => `<div class="log-line">${l}</div>`)
    .join('');
  logEl.scrollTop = logEl.scrollHeight;
}

const prevMoney = {};
function renderPlayersPanel() {
  const panel = $('#players-panel');
  panel.innerHTML = '';
  game.players.forEach((p) => {
    const color = PLAYER_COLORS[p.id % PLAYER_COLORS.length];
    const card = el('div', `player-card ${p.bankrupt ? 'bankrupt' : ''} ${game.currentPlayer().id === p.id ? 'active' : ''}`);
    card.style.setProperty('--pc-color', color);
    const propCount = p.properties.length;
    const prev = prevMoney[p.id];
    const moneyCls = prev !== undefined && p.money > prev ? 'money-up' : prev !== undefined && p.money < prev ? 'money-down' : '';
    prevMoney[p.id] = p.money;
    card.innerHTML = `
      <div class="pc-head">
        <span class="pc-token" style="background:${color}">${p.token}</span>
        <span class="pc-name">${p.name}${p.isBot ? ' 🤖' : ''}</span>
      </div>
      <div class="pc-money ${moneyCls}">${p.bankrupt ? '💀 BANKRUPT' : money(p.money)}</div>
      <div class="pc-meta">${propCount} propert${propCount === 1 ? 'y' : 'ies'}${p.inJail ? ' · 🔒 In Jail' : ''}${p.jailCards > 0 ? ' · 🎫x' + p.jailCards : ''}</div>
    `;
    panel.appendChild(card);
  });
  const potEl = $('#free-parking-pot');
  if (potEl) {
    potEl.style.display = game.freeParkingRule ? 'block' : 'none';
    potEl.textContent = `Free Parking Pot: ${money(game.freeParkingPot)}`;
  }
}

function updateUI() {
  renderBoardState();
  renderPlayersPanel();
  renderLog();
}

function renderTurnBanner(text) {
  const banner = $('#turn-banner');
  banner.innerHTML = text;
  pop(banner);
}

// ---------------- Actions panel (turn-flow prompts) ----------------
function renderActionsPanel(config) {
  const panel = $('#actions-panel');
  panel.innerHTML = '';
  pop(panel);
  const { mode, player } = config;

  if (mode === 'passdevice') {
    renderTurnBanner(`📱 Pass the device to <b>${player.name}</b>`);
    panel.appendChild(el('div', 'pass-token-bounce', player.token));
    panel.appendChild(el('div', 'prompt-title', `${player.name}, it's your turn!`));
    const btn = el('button', 'btn primary big', "I'm ready — Go!");
    btn.onclick = config.onReady;
    panel.appendChild(btn);
    return;
  }

  if (mode === 'roll') {
    renderTurnBanner(`🎲 ${player.name}'s turn`);
    panel.appendChild(el('div', 'prompt-title', 'Ready to roll the dice'));
    const btn = el('button', 'btn primary big', 'Roll Dice 🎲');
    btn.onclick = async () => {
      btn.disabled = true;
      panel.innerHTML = '';
      panel.appendChild(el('div', 'prompt-title', `${player.name} is rolling...`));
      panel.appendChild(el('div', 'dice-display', `<span class="die spinning">🎲</span><span class="die spinning">🎲</span>`));
      await delay(650);
      config.onRoll();
    };
    panel.appendChild(btn);
    return;
  }

  if (mode === 'dice-result') {
    renderTurnBanner(`🎲 ${player.name} rolled`);
    panel.appendChild(el('div', 'dice-display', `<span class="die rolled">${diceFace(config.d1)}</span><span class="die rolled">${diceFace(config.d2)}</span>`));
    panel.appendChild(el('div', 'prompt-title', `Total: ${config.d1 + config.d2}${config.d1 === config.d2 ? ' — Doubles! 🎉' : ''}`));
    return;
  }

  if (mode === 'jail-choice') {
    renderTurnBanner(`🔒 ${player.name} is in Jail`);
    panel.appendChild(el('div', 'prompt-title', `Turn ${player.jailTurns + 1} of 3 in jail`));
    const rollBtn = el('button', 'btn primary', 'Roll for Doubles');
    rollBtn.onclick = () => config.onChoice('roll');
    panel.appendChild(rollBtn);
    const payBtn = el('button', 'btn', `Pay $${JAIL_FINE} Fine`);
    payBtn.disabled = player.money < JAIL_FINE;
    payBtn.onclick = () => config.onChoice('pay');
    panel.appendChild(payBtn);
    if (player.jailCards > 0) {
      const cardBtn = el('button', 'btn', 'Use Get Out of Jail Free');
      cardBtn.onclick = () => config.onChoice('card');
      panel.appendChild(cardBtn);
    }
    return;
  }

  if (mode === 'buy-auction') {
    const sp = BOARD[config.spaceIndex];
    renderTurnBanner(`🏠 ${player.name} landed on ${sp.name}`);
    panel.appendChild(el('div', 'prompt-title', `${sp.name} — ${money(sp.price)}`));
    const buyBtn = el('button', 'btn primary', `Buy for ${money(sp.price)}`);
    buyBtn.disabled = player.money < sp.price;
    buyBtn.onclick = () => config.onChoice('buy');
    panel.appendChild(buyBtn);
    const aucBtn = el('button', 'btn', 'Auction It');
    aucBtn.onclick = () => config.onChoice('auction');
    panel.appendChild(aucBtn);
    return;
  }

  if (mode === 'auction-bid') {
    const sp = BOARD[config.spaceIndex];
    renderTurnBanner(`🔨 Auction: ${sp.name}`);
    panel.appendChild(el('div', 'prompt-title', `${player.name}'s turn to bid`));
    panel.appendChild(el('div', 'auction-info', `Current bid: ${money(config.currentBid)}${config.highBidderName ? ' by ' + config.highBidderName : ''}<br>Your cash: ${money(player.money)}`));
    const input = el('input', 'bid-input');
    input.type = 'number';
    input.min = config.currentBid + 1;
    input.value = config.currentBid + 10;
    panel.appendChild(input);
    const bidBtn = el('button', 'btn primary', 'Bid');
    bidBtn.onclick = () => config.onBid(parseInt(input.value, 10));
    panel.appendChild(bidBtn);
    const passBtn = el('button', 'btn', 'Pass');
    passBtn.onclick = () => config.onBid(null);
    panel.appendChild(passBtn);
    return;
  }

  if (mode === 'card') {
    renderTurnBanner(`${config.deckName === 'chance' ? '❓ Chance' : '📦 Community Chest'}`);
    const cardEl = el('div', `card-display ${config.deckName}`);
    cardEl.innerHTML = `<div class="card-title">${config.deckName === 'chance' ? 'CHANCE' : 'COMMUNITY CHEST'}</div><div class="card-text">${config.card.text}</div>`;
    panel.appendChild(cardEl);
    const okBtn = el('button', 'btn primary', 'OK');
    okBtn.onclick = config.onOk;
    panel.appendChild(okBtn);
    return;
  }

  if (mode === 'postroll') {
    renderTurnBanner(`✅ ${player.name}, manage your turn`);
    panel.appendChild(el('div', 'prompt-title', 'Build, trade, or manage mortgages, then end your turn.'));
    const buildBtn = el('button', 'btn', '🏗️ Build Houses');
    buildBtn.onclick = config.onBuild;
    panel.appendChild(buildBtn);
    const tradeBtn = el('button', 'btn', '🤝 Trade');
    tradeBtn.onclick = config.onTrade;
    panel.appendChild(tradeBtn);
    const mortBtn = el('button', 'btn', '🏦 Mortgages');
    mortBtn.onclick = config.onMortgage;
    panel.appendChild(mortBtn);
    const endBtn = el('button', 'btn primary big', 'End Turn');
    endBtn.onclick = config.onEnd;
    panel.appendChild(endBtn);
    return;
  }

  if (mode === 'info') {
    renderTurnBanner(config.banner || '');
    if (config.emoji) panel.appendChild(el('div', 'info-token', config.emoji));
    panel.appendChild(el('div', 'prompt-title', config.text || ''));
    return;
  }
}

function diceFace(n) {
  return ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][n];
}

// ---------------- Modal system ----------------
function openModal(contentEl) {
  const overlay = $('#modal-overlay');
  const box = $('#modal-box');
  box.innerHTML = '';
  box.appendChild(contentEl);
  overlay.classList.remove('hidden');
}
function closeModal() {
  $('#modal-overlay').classList.add('hidden');
  $('#modal-box').innerHTML = '';
}

// ---------------- Game flow ----------------
async function runGameLoop() {
  while (!game.gameOver) {
    await takeTurn();
  }
  showWinScreen();
}

async function takeTurn() {
  const player = game.currentPlayer();
  if (player.bankrupt) {
    game.nextTurn();
    return;
  }
  updateUI();
  await passDeviceGate(player);
  if (player.inJail) {
    await handleJailStart(player);
  } else {
    await handleRollPhase(player);
  }
  if (!game.gameOver) {
    game.nextTurn();
    updateUI();
  }
}

function passDeviceGate(player) {
  if (player.isBot) {
    renderActionsPanel({ mode: 'info', player, banner: `🤖 ${player.name}'s turn`, text: `${player.name} is thinking...`, emoji: '🤖' });
    return delay(500);
  }
  return new Promise((resolve) => {
    renderActionsPanel({ mode: 'passdevice', player, onReady: resolve });
  });
}

async function handleJailStart(player) {
  let choice;
  if (player.isBot) {
    choice = Bot.decideJailAction(game, player);
    if (choice === 'pay_forced') choice = player.money >= JAIL_FINE ? 'pay' : 'roll';
    await delay(500);
    game.addLog(`${player.name} (in jail) decides to ${choice === 'roll' ? 'roll for doubles' : choice === 'pay' ? 'pay the fine' : 'use a jail-free card'}`);
  } else {
    choice = await new Promise((resolve) => {
      renderActionsPanel({ mode: 'jail-choice', player, onChoice: resolve });
    });
  }

  if (choice === 'card') {
    const held = player.jailCardsList.shift();
    if (held) game.returnJailFreeCard(held.deckName, held.card);
    player.jailCards--;
    player.inJail = false;
    player.jailTurns = 0;
    game.addLog(`${player.name} uses a Get Out of Jail Free card`);
    updateUI();
    await handleRollPhase(player);
    return;
  }
  if (choice === 'pay') {
    game.pay(player, JAIL_FINE, null);
    player.inJail = false;
    player.jailTurns = 0;
    game.addLog(`${player.name} pays $${JAIL_FINE} bail`);
    updateUI();
    await handleRollPhase(player);
    return;
  }
  // roll for doubles
  const [d1, d2] = game.rollDice();
  renderActionsPanel({ mode: 'dice-result', player, d1, d2 });
  updateUI();
  await delay(900);
  const attemptNumber = player.jailTurns + 1;
  if (d1 === d2) {
    player.inJail = false;
    player.jailTurns = 0;
    game.addLog(`${player.name} rolled doubles (${d1},${d2}) and is out of jail!`);
    await movePlayerAndResolve(player, d1 + d2);
  } else if (attemptNumber >= MAX_JAIL_TURNS) {
    game.addLog(`${player.name} failed to roll doubles 3 times — pays $${JAIL_FINE} and moves`);
    game.pay(player, JAIL_FINE, null);
    player.inJail = false;
    player.jailTurns = 0;
    await movePlayerAndResolve(player, d1 + d2);
  } else {
    player.jailTurns++;
    game.addLog(`${player.name} rolled (${d1},${d2}) — no doubles, stays in jail`);
  }
  if (!game.gameOver) await showPostRollActions(player);
}

async function handleRollPhase(player) {
  let doublesStreak = 0;
  while (true) {
    const [d1, d2] = await requestRoll(player);
    renderActionsPanel({ mode: 'dice-result', player, d1, d2 });
    updateUI();
    await delay(700);
    const isDouble = d1 === d2;
    doublesStreak = isDouble ? doublesStreak + 1 : 0;
    if (doublesStreak === 3) {
      game.addLog(`${player.name} rolled doubles 3 times in a row — Go to Jail!`);
      game.sendToJail(player);
      updateUI();
      break;
    }
    await movePlayerAndResolve(player, d1 + d2);
    updateUI();
    if (game.gameOver) return;
    if (player.inJail) break;
    if (isDouble) {
      game.addLog(`${player.name} rolled doubles — roll again!`);
      await delay(500);
      continue;
    }
    break;
  }
  if (!game.gameOver) await showPostRollActions(player);
}

function requestRoll(player) {
  if (player.isBot) {
    renderActionsPanel({ mode: 'info', player, banner: `🎲 ${player.name}'s turn`, text: `${player.name} is rolling...`, emoji: '🎲' });
    return delay(650).then(() => game.rollDice());
  }
  return new Promise((resolve) => {
    renderActionsPanel({ mode: 'roll', player, onRoll: () => resolve(game.rollDice()) });
  });
}

async function movePlayerAndResolve(player, steps) {
  await animateHop(player, steps);
  game.addLog(`${player.name} moves to ${BOARD[player.pos].name}`);
  flashSpace(player.pos);
  updateUI();
  await delay(250);
  await resolveLanding(player, player.pos, steps);
}

// Hop the token forward one space at a time so movement is visible on the board
async function animateHop(player, steps) {
  const hopDelay = steps > 8 ? 90 : 130;
  for (let i = 0; i < steps; i++) {
    player.pos = (player.pos + 1) % 40;
    if (player.pos === 0) {
      player.money += GO_SALARY;
      game.addLog(`${player.name} passes GO and collects $${GO_SALARY}`);
    }
    updateUI();
    await delay(hopDelay);
  }
}

async function advanceToPosition(player, pos, grantPassGo = true) {
  const passed = grantPassGo && pos < player.pos;
  if (passed) {
    player.money += GO_SALARY;
    game.addLog(`${player.name} passes GO and collects $${GO_SALARY}`);
  }
  player.pos = pos;
  game.addLog(`${player.name} advances to ${BOARD[pos].name}`);
  flashSpace(pos);
  updateUI();
  await delay(300);
  await resolveLanding(player, pos, null, { fromCard: true });
}

async function resolveLanding(player, pos, diceTotal, opts = {}) {
  const sp = BOARD[pos];
  if (sp.type === 'property' || sp.type === 'railroad' || sp.type === 'utility') {
    await handlePropertyLanding(player, sp, diceTotal);
  } else if (sp.type === 'tax') {
    game.addLog(`${player.name} owes ${money(sp.amount)} in tax`);
    await payAmount(player, sp.amount, null);
  } else if (sp.type === 'chance') {
    await drawAndApplyCard(player, 'chance');
  } else if (sp.type === 'chest') {
    await drawAndApplyCard(player, 'chest');
  } else if (sp.type === 'gotojail') {
    game.sendToJail(player);
    updateUI();
  } else if (sp.type === 'freeparking') {
    if (game.freeParkingRule && game.freeParkingPot > 0) {
      game.collectFreeParkingPot(player);
    }
  }
  updateUI();
}

async function handlePropertyLanding(player, sp, diceTotal) {
  const st = game.state[sp.i];
  if (st.owner === null) {
    await promptBuyOrAuction(player, sp.i);
  } else if (st.owner !== player.id) {
    const owner = game.players[st.owner];
    if (owner.bankrupt) return;
    if (st.mortgaged) {
      game.addLog(`${sp.name} is mortgaged — no rent due`);
      return;
    }
    const rent = game.getRent(sp.i, diceTotal);
    game.addLog(`${player.name} owes ${money(rent)} rent to ${owner.name}`);
    await payAmount(player, rent, owner);
  }
}

async function promptBuyOrAuction(player, spaceIndex) {
  const sp = BOARD[spaceIndex];
  if (player.isBot) {
    await delay(500);
    if (Bot.decideBuy(game, player, spaceIndex) && game.canAfford(player, sp.price)) {
      game.buyProperty(player, spaceIndex);
    } else {
      game.addLog(`${player.name} declines to buy ${sp.name}`);
      await runAuction(spaceIndex);
    }
    return;
  }
  const choice = await new Promise((resolve) => {
    renderActionsPanel({ mode: 'buy-auction', player, spaceIndex, onChoice: resolve });
  });
  if (choice === 'buy' && game.canAfford(player, sp.price)) {
    game.buyProperty(player, spaceIndex);
  } else {
    await runAuction(spaceIndex);
  }
  updateUI();
}

async function runAuction(spaceIndex) {
  const sp = BOARD[spaceIndex];
  game.addLog(`🔨 Auction begins for ${sp.name}`);
  const order = game.activePlayers().map((p) => p.id);
  const stillIn = new Set(order);
  let currentBid = 0;
  let highBidder = null;
  let i = 0;
  let safety = 0;
  while (stillIn.size > 0 && safety < 200) {
    safety++;
    if (stillIn.size === 1) {
      const only = [...stillIn][0];
      if (highBidder === only || highBidder === null) break;
    }
    const pid = order[i % order.length];
    i++;
    if (!stillIn.has(pid)) continue;
    const p = game.players[pid];
    let bid;
    if (p.isBot) {
      bid = Bot.decideAuctionBid(game, p, spaceIndex, currentBid, highBidder);
      await delay(350);
    } else {
      bid = await new Promise((resolve) => {
        renderActionsPanel({
          mode: 'auction-bid',
          player: p,
          spaceIndex,
          currentBid,
          highBidderName: highBidder !== null ? game.players[highBidder].name : null,
          onBid: resolve,
        });
      });
    }
    if (bid && bid > currentBid && bid <= p.money) {
      currentBid = bid;
      highBidder = pid;
      game.addLog(`${p.name} bids ${money(bid)}`);
    } else {
      game.addLog(`${p.name} passes on the auction`);
      stillIn.delete(pid);
    }
  }
  if (highBidder !== null && currentBid > 0) {
    const winner = game.players[highBidder];
    winner.money -= currentBid;
    game.state[spaceIndex].owner = winner.id;
    winner.properties.push(spaceIndex);
    game.addLog(`🏆 ${winner.name} wins ${sp.name} for ${money(currentBid)}`);
  } else {
    game.addLog(`No bids — ${sp.name} stays with the Bank`);
  }
  updateUI();
}

async function drawAndApplyCard(player, deckName) {
  const card = game.drawCard(deckName);
  if (card.type === 'jailFree') {
    player.jailCardsList.push({ deckName, card });
    player.jailCards++;
  }
  await new Promise((resolve) => {
    renderActionsPanel({ mode: 'card', deckName, card, onOk: resolve });
  });
  if (player.isBot) await delay(200);
  await applyCardEffect(player, card, deckName);
}

async function applyCardEffect(player, card, deckName) {
  switch (card.type) {
    case 'move':
      await advanceToPosition(player, card.pos, true);
      break;
    case 'moveRelative': {
      const newPos = (player.pos + card.delta + 40) % 40;
      player.pos = newPos;
      game.addLog(`${player.name} moves to ${BOARD[newPos].name}`);
      updateUI();
      await delay(300);
      await resolveLanding(player, newPos, null);
      break;
    }
    case 'money':
      if (card.amount >= 0) {
        player.money += card.amount;
        game.addLog(`${player.name} receives ${money(card.amount)}`);
      } else {
        game.addLog(`${player.name} must pay ${money(-card.amount)}`);
        await payAmount(player, -card.amount, null);
      }
      break;
    case 'collectFromEach':
      for (const p of game.activePlayers()) {
        if (p.id === player.id || p.bankrupt) continue;
        await payAmount(p, card.amount, player);
      }
      break;
    case 'payEach':
      for (const p of game.activePlayers()) {
        if (p.id === player.id || player.bankrupt) continue;
        await payAmount(player, card.amount, p);
      }
      break;
    case 'jail':
      game.sendToJail(player);
      break;
    case 'jailFree':
      game.addLog(`${player.name} holds onto a Get Out of Jail Free card`);
      break;
    case 'repair': {
      let cost = 0;
      player.properties.forEach((i) => {
        const st = game.state[i];
        if (st.houses === 5) cost += card.perHotel;
        else cost += st.houses * card.perHouse;
      });
      if (cost > 0) {
        game.addLog(`${player.name} owes ${money(cost)} for repairs`);
        await payAmount(player, cost, null);
      }
      break;
    }
    case 'nearestRailroad': {
      const rails = [5, 15, 25, 35];
      const next = rails.find((r) => r > player.pos) ?? rails[0];
      await advanceToPosition(player, next, true);
      const st = game.state[next];
      if (st.owner !== null && st.owner !== player.id && !st.mortgaged) {
        const owner = game.players[st.owner];
        const rent = game.getRent(next, null) * 2;
        game.addLog(`${player.name} owes double rent: ${money(rent)} to ${owner.name}`);
        await payAmount(player, rent, owner);
      }
      break;
    }
    case 'nearestUtility': {
      const utils = [12, 28];
      const next = utils.find((u) => u > player.pos) ?? utils[0];
      await advanceToPosition(player, next, true);
      const st = game.state[next];
      if (st.owner !== null && st.owner !== player.id && !st.mortgaged) {
        const owner = game.players[st.owner];
        const [rd1, rd2] = game.rollDice();
        const rent = 10 * (rd1 + rd2);
        game.addLog(`${player.name} owes ${money(rent)} to ${owner.name} (10x dice roll of ${rd1 + rd2})`);
        await payAmount(player, rent, owner);
      }
      break;
    }
  }
  updateUI();
}

// ---------------- Payments & bankruptcy ----------------
async function payAmount(payer, amount, recipient) {
  if (amount <= 0) return true;
  if (payer.money >= amount) {
    game.pay(payer, amount, recipient);
    updateUI();
    return true;
  }
  if (payer.isBot) {
    Bot.raiseCash(game, payer, amount);
    updateUI();
    if (payer.money >= amount) {
      game.pay(payer, amount, recipient);
      updateUI();
      return true;
    }
    game.bankruptPlayer(payer, recipient);
    updateUI();
    return false;
  }
  const raised = await promptRaiseCash(payer, amount, recipient);
  updateUI();
  if (raised) {
    game.pay(payer, amount, recipient);
    updateUI();
    return true;
  }
  return false;
}

function promptRaiseCash(payer, amountNeeded, recipient) {
  return new Promise((resolve) => {
    const box = el('div', 'modal-content raise-cash');
    const render = () => {
      box.innerHTML = `
        <h2>Not enough cash!</h2>
        <p>${payer.name} needs ${money(amountNeeded)} but has ${money(payer.money)}.</p>
        <p>Mortgage properties or sell houses to raise cash:</p>
        <div class="asset-list"></div>
        <div class="modal-actions">
          <button class="btn danger" id="rc-bankrupt">Declare Bankruptcy</button>
          <button class="btn primary" id="rc-confirm" ${payer.money >= amountNeeded ? '' : 'disabled'}>Pay Now</button>
        </div>
      `;
      const list = box.querySelector('.asset-list');
      payer.properties.forEach((i) => {
        const sp = BOARD[i];
        const st = game.state[i];
        const row = el('div', 'asset-row');
        let actionHtml = '';
        if (sp.type === 'property' && st.houses > 0 && game.canSellHouse(payer, i)) {
          actionHtml = `<button class="btn small" data-action="sell" data-i="${i}">Sell building (+${money(Math.floor(sp.houseCost / 2))})</button>`;
        } else if (!st.mortgaged && st.houses === 0) {
          actionHtml = `<button class="btn small" data-action="mortgage" data-i="${i}">Mortgage (+${money(sp.mortgage)})</button>`;
        } else if (st.mortgaged) {
          actionHtml = `<span class="muted">mortgaged</span>`;
        } else {
          actionHtml = `<span class="muted">has buildings</span>`;
        }
        row.innerHTML = `<span>${sp.name}${st.houses ? ` (${st.houses === 5 ? 'hotel' : st.houses + ' houses'})` : ''}</span>`;
        row.innerHTML += actionHtml;
        list.appendChild(row);
      });
      list.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.onclick = () => {
          const i = parseInt(btn.dataset.i, 10);
          if (btn.dataset.action === 'sell') game.sellHouse(payer, i);
          else game.mortgageProperty(payer, i);
          updateUI();
          render();
        };
      });
      box.querySelector('#rc-bankrupt').onclick = () => {
        closeModal();
        game.bankruptPlayer(payer, recipient);
        updateUI();
        resolve(false);
      };
      box.querySelector('#rc-confirm').onclick = () => {
        closeModal();
        resolve(true);
      };
    };
    render();
    openModal(box);
  });
}

// ---------------- Post-roll actions: build / trade / mortgage ----------------
async function showPostRollActions(player) {
  if (player.isBot) {
    await delay(300);
    let built;
    let guard = 0;
    do {
      built = Bot.pickHouseBuild(game, player);
      if (built) game.buildHouse(player, built);
      guard++;
    } while (built && guard < 40);
    updateUI();
    await delay(400);
    return;
  }
  return new Promise((resolve) => {
    renderActionsPanel({
      mode: 'postroll',
      player,
      onBuild: () => openBuildModal(player),
      onTrade: () => openTradeModal(player),
      onMortgage: () => openMortgageModal(player),
      onEnd: () => resolve(),
    });
  });
}

function openBuildModal(player) {
  const box = el('div', 'modal-content build-modal');
  const render = () => {
    box.innerHTML = `<h2>Build Houses</h2><p>Cash: ${money(player.money)} · Houses left: ${game.houseStock} · Hotels left: ${game.hotelStock}</p><div class="build-list"></div><div class="modal-actions"><button class="btn primary" id="build-close">Done</button></div>`;
    const list = box.querySelector('.build-list');
    const colors = [...new Set(player.properties.map((i) => BOARD[i].color).filter(Boolean))];
    let any = false;
    colors.forEach((color) => {
      if (!game.playerOwnsFullSet(player, color)) return;
      any = true;
      const set = game.ownedColorSet(color);
      const group = el('div', 'build-group');
      group.innerHTML = `<div class="color-chip" style="background:${color}"></div>`;
      set.forEach((s) => {
        const st = game.state[s.i];
        const row = el('div', 'build-row');
        row.innerHTML = `<span>${s.name} ${st.houses === 5 ? '🏨' : '🏠'.repeat(st.houses)}</span>`;
        const buildBtn = el('button', 'btn small', `Build (${money(s.houseCost)})`);
        buildBtn.disabled = !game.canBuildHouse(player, s.i);
        buildBtn.onclick = () => {
          game.buildHouse(player, s.i);
          updateUI();
          render();
        };
        const sellBtn = el('button', 'btn small', `Sell (+${money(Math.floor(s.houseCost / 2))})`);
        sellBtn.disabled = !game.canSellHouse(player, s.i);
        sellBtn.onclick = () => {
          game.sellHouse(player, s.i);
          updateUI();
          render();
        };
        row.appendChild(buildBtn);
        row.appendChild(sellBtn);
        group.appendChild(row);
      });
      list.appendChild(group);
    });
    if (!any) list.appendChild(el('div', 'muted', 'You need a full color-group monopoly to build houses.'));
    box.querySelector('#build-close').onclick = closeModal;
  };
  render();
  openModal(box);
}

function openMortgageModal(player) {
  const box = el('div', 'modal-content mortgage-modal');
  const render = () => {
    box.innerHTML = `<h2>Mortgages</h2><p>Cash: ${money(player.money)}</p><div class="mortgage-list"></div><div class="modal-actions"><button class="btn primary" id="mort-close">Done</button></div>`;
    const list = box.querySelector('.mortgage-list');
    if (player.properties.length === 0) list.appendChild(el('div', 'muted', 'You own no properties.'));
    player.properties.forEach((i) => {
      const sp = BOARD[i];
      const st = game.state[i];
      const row = el('div', 'asset-row');
      row.innerHTML = `<span>${sp.name} ${st.mortgaged ? '(mortgaged)' : ''}</span>`;
      if (st.mortgaged) {
        const cost = Math.ceil(sp.mortgage * 1.1);
        const btn = el('button', 'btn small', `Unmortgage (${money(cost)})`);
        btn.disabled = player.money < cost;
        btn.onclick = () => {
          game.unmortgageProperty(player, i);
          updateUI();
          render();
        };
        row.appendChild(btn);
      } else {
        const btn = el('button', 'btn small', `Mortgage (+${money(sp.mortgage)})`);
        btn.disabled = st.houses > 0;
        btn.onclick = () => {
          game.mortgageProperty(player, i);
          updateUI();
          render();
        };
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
    box.querySelector('#mort-close').onclick = closeModal;
  };
  render();
  openModal(box);
}

// ---------------- All-properties overview (owner-colored, like the classic asset summary screen) ----------------
function openPropertiesOverviewModal() {
  const box = el('div', 'modal-content properties-overview');
  const groups = [];
  const seen = new Map();
  BOARD.forEach((sp) => {
    if (sp.type === 'property') {
      if (!seen.has(sp.color)) {
        seen.set(sp.color, { color: sp.color, spaces: [] });
        groups.push(seen.get(sp.color));
      }
      seen.get(sp.color).spaces.push(sp);
    }
  });
  const railroads = BOARD.filter((sp) => sp.type === 'railroad');
  const utilities = BOARD.filter((sp) => sp.type === 'utility');

  const ownerTag = (spaceIndex) => {
    const st = game.state[spaceIndex];
    if (st.owner === null) return `<span class="owner-tag bank">🏦 Bank</span>`;
    const owner = game.players[st.owner];
    const color = PLAYER_COLORS[owner.id % PLAYER_COLORS.length];
    const buildings = BOARD[spaceIndex].type === 'property' && st.houses > 0 ? (st.houses === 5 ? ' 🏨' : ' ' + '🏠'.repeat(st.houses)) : '';
    return `<span class="owner-tag" style="background:${color}">${owner.token} ${owner.name}${st.mortgaged ? ' 🔒' : ''}${buildings}</span>`;
  };

  const rowsFor = (spaces) =>
    spaces.map((sp) => `<div class="prop-overview-row"><span class="pov-name">${sp.name}</span>${ownerTag(sp.i)}</div>`).join('');

  let html = `<h2>📋 All Properties</h2><div class="prop-overview-scroll">`;
  groups.forEach((g) => {
    html += `<div class="prop-overview-group"><div class="color-chip" style="background:${g.color}"></div>${rowsFor(g.spaces)}</div>`;
  });
  html += `<div class="prop-overview-group"><div class="pov-group-label">🚂 Railroads</div>${rowsFor(railroads)}</div>`;
  html += `<div class="prop-overview-group"><div class="pov-group-label">💡 Utilities</div>${rowsFor(utilities)}</div>`;
  html += `</div><div class="modal-actions"><button class="btn primary" id="pov-close">Close</button></div>`;
  box.innerHTML = html;
  box.querySelector('#pov-close').onclick = closeModal;
  openModal(box);
}

// ---------------- Trading ----------------
function openTradeModal(player) {
  const others = game.activePlayers().filter((p) => p.id !== player.id);
  const box = el('div', 'modal-content trade-modal');
  let partnerId = others[0]?.id;
  const myOffer = { cash: 0, props: new Set(), card: false };
  const theirOffer = { cash: 0, props: new Set(), card: false };

  const render = () => {
    if (others.length === 0) {
      box.innerHTML = `<h2>Trade</h2><p class="muted">No other players to trade with.</p><div class="modal-actions"><button class="btn primary" id="tr-close">Close</button></div>`;
      box.querySelector('#tr-close').onclick = closeModal;
      return;
    }
    const partner = game.players[partnerId];
    box.innerHTML = `
      <h2>Propose Trade</h2>
      <label>Trade with: </label>
      <select id="tr-partner">${others.map((o) => `<option value="${o.id}" ${o.id === partnerId ? 'selected' : ''}>${o.name}</option>`).join('')}</select>
      <div class="trade-cols">
        <div class="trade-col">
          <h3>You give</h3>
          <label>Cash <input type="number" id="my-cash" min="0" max="${player.money}" value="${myOffer.cash}" /></label>
          ${player.jailCards > 0 ? `<label><input type="checkbox" id="my-card" ${myOffer.card ? 'checked' : ''}/> Get Out of Jail Free</label>` : ''}
          <div class="prop-list">${player.properties.map((i) => `<label><input type="checkbox" data-i="${i}" class="my-prop" ${myOffer.props.has(i) ? 'checked' : ''}/> ${BOARD[i].name}</label>`).join('') || '<span class="muted">none</span>'}</div>
        </div>
        <div class="trade-col">
          <h3>You get</h3>
          <label>Cash <input type="number" id="their-cash" min="0" max="${partner.money}" value="${theirOffer.cash}" /></label>
          ${partner.jailCards > 0 ? `<label><input type="checkbox" id="their-card" ${theirOffer.card ? 'checked' : ''}/> Get Out of Jail Free</label>` : ''}
          <div class="prop-list">${partner.properties.map((i) => `<label><input type="checkbox" data-i="${i}" class="their-prop" ${theirOffer.props.has(i) ? 'checked' : ''}/> ${BOARD[i].name}</label>`).join('') || '<span class="muted">none</span>'}</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" id="tr-cancel">Cancel</button>
        <button class="btn primary" id="tr-propose">Propose Trade</button>
      </div>
    `;
    box.querySelector('#tr-partner').onchange = (e) => {
      partnerId = parseInt(e.target.value, 10);
      myOffer.props.clear();
      theirOffer.props.clear();
      render();
    };
    box.querySelector('#my-cash').oninput = (e) => (myOffer.cash = Math.max(0, parseInt(e.target.value || '0', 10)));
    box.querySelector('#their-cash').oninput = (e) => (theirOffer.cash = Math.max(0, parseInt(e.target.value || '0', 10)));
    const myCardEl = box.querySelector('#my-card');
    if (myCardEl) myCardEl.onchange = (e) => (myOffer.card = e.target.checked);
    const theirCardEl = box.querySelector('#their-card');
    if (theirCardEl) theirCardEl.onchange = (e) => (theirOffer.card = e.target.checked);
    box.querySelectorAll('.my-prop').forEach((cb) => (cb.onchange = (e) => (e.target.checked ? myOffer.props.add(parseInt(cb.dataset.i, 10)) : myOffer.props.delete(parseInt(cb.dataset.i, 10)))));
    box.querySelectorAll('.their-prop').forEach((cb) => (cb.onchange = (e) => (e.target.checked ? theirOffer.props.add(parseInt(cb.dataset.i, 10)) : theirOffer.props.delete(parseInt(cb.dataset.i, 10)))));
    box.querySelector('#tr-cancel').onclick = closeModal;
    box.querySelector('#tr-propose').onclick = () => proposeTrade(player, partner, myOffer, theirOffer);
  };
  render();
  openModal(box);
}

async function proposeTrade(player, partner, myOffer, theirOffer) {
  if (myOffer.cash > player.money || theirOffer.cash > partner.money) {
    alert('Cash offer exceeds available funds.');
    return;
  }
  const offerForPartner = {
    give: { cash: theirOffer.cash, props: [...theirOffer.props] },
    get: { cash: myOffer.cash, props: [...myOffer.props] },
  };
  let accepted;
  if (partner.isBot) {
    accepted = Bot.evaluateTrade(game, partner, offerForPartner);
    await delay(500);
    game.addLog(`${partner.name} ${accepted ? 'accepts' : 'rejects'} a trade offer from ${player.name}`);
  } else {
    accepted = await new Promise((resolve) => {
      const box = el('div', 'modal-content trade-response');
      box.innerHTML = `
        <h2>Trade Offer for ${partner.name}</h2>
        <p><b>${player.name}</b> offers:</p>
        <ul>
          ${myOffer.cash ? `<li>${money(myOffer.cash)} cash</li>` : ''}
          ${[...myOffer.props].map((i) => `<li>${BOARD[i].name}</li>`).join('')}
          ${myOffer.card ? `<li>Get Out of Jail Free card</li>` : ''}
          ${!myOffer.cash && myOffer.props.size === 0 && !myOffer.card ? '<li class="muted">nothing</li>' : ''}
        </ul>
        <p>In exchange for ${partner.name}'s:</p>
        <ul>
          ${theirOffer.cash ? `<li>${money(theirOffer.cash)} cash</li>` : ''}
          ${[...theirOffer.props].map((i) => `<li>${BOARD[i].name}</li>`).join('')}
          ${theirOffer.card ? `<li>Get Out of Jail Free card</li>` : ''}
          ${!theirOffer.cash && theirOffer.props.size === 0 && !theirOffer.card ? '<li class="muted">nothing</li>' : ''}
        </ul>
        <p class="muted">Pass the device to ${partner.name} to respond.</p>
        <div class="modal-actions">
          <button class="btn danger" id="tr-reject">Reject</button>
          <button class="btn primary" id="tr-accept">Accept</button>
        </div>
      `;
      box.querySelector('#tr-reject').onclick = () => {
        closeModal();
        resolve(false);
      };
      box.querySelector('#tr-accept').onclick = () => {
        closeModal();
        resolve(true);
      };
      openModal(box);
    });
  }
  if (accepted) {
    player.money -= myOffer.cash;
    partner.money += myOffer.cash;
    partner.money -= theirOffer.cash;
    player.money += theirOffer.cash;
    myOffer.props.forEach((i) => game.transferProperty(i, partner.id));
    theirOffer.props.forEach((i) => game.transferProperty(i, player.id));
    if (myOffer.card && player.jailCardsList.length > 0) {
      const held = player.jailCardsList.shift();
      player.jailCards--;
      partner.jailCardsList.push(held);
      partner.jailCards++;
    }
    if (theirOffer.card && partner.jailCardsList.length > 0) {
      const held = partner.jailCardsList.shift();
      partner.jailCards--;
      player.jailCardsList.push(held);
      player.jailCards++;
    }
    game.addLog(`🤝 Trade completed between ${player.name} and ${partner.name}`);
    closeModal();
    updateUI();
    openTradeModal(player);
  } else {
    closeModal();
  }
}

// ---------------- Win screen ----------------
function showWinScreen() {
  spawnConfetti();
  const box = el('div', 'modal-content win-screen');
  box.innerHTML = `
    <h1>🏆 ${game.winner ? game.winner.name : 'Nobody'} wins!</h1>
    <p>Thanks for playing Monopoly.</p>
    <div class="modal-actions"><button class="btn primary big" id="win-restart">Play Again</button></div>
  `;
  box.querySelector('#win-restart').onclick = () => location.reload();
  openModal(box);
}

document.addEventListener('DOMContentLoaded', initSetup);
