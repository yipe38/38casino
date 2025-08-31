import { MinesGame } from './game/minesGame.js';
import { MinesUI } from './ui/minesUI.js';
import { EventBus } from './utils/eventBus.js';
import { ProvablyFair } from './utils/provablyFair.js';

const bus = new EventBus();

const els = {
  balance: document.getElementById('balance'),
  bet: document.getElementById('bet'),
  half: document.getElementById('half'),
  double: document.getElementById('double'),
  clear: document.getElementById('clear'),
  chips: Array.from(document.querySelectorAll('.chip')),
  bombs: document.getElementById('bombs'),
  grid: document.getElementById('grid'),
  newRound: document.getElementById('newRound'),
  cashout: document.getElementById('cashout'),
  board: document.getElementById('board'),
  hits: document.getElementById('hits'),
  multiplier: document.getElementById('multiplier'),
  payout: document.getElementById('payout'),
  edge: document.getElementById('edge'),
  pf: {
    serverSeed: document.getElementById('serverSeed'),
    clientSeed: document.getElementById('clientSeed'),
    nonce: document.getElementById('nonce'),
    reroll: document.getElementById('reroll'),
  },
  cashoutPulse: document.getElementById('cashoutPulse'),
};

const state = {
  balance: 1000,
  bet: 1.0,
  rows: 5, cols: 5,
  bombs: 3,
  edgePct: 1.0,
  pf: {
    serverSeed: 'server-seed-demo',
    clientSeed: 'client-seed-demo',
    nonce: 0
  }
};

// Populate bombs dropdown depending on grid size
function populateBombs(maxCells) {
  els.bombs.innerHTML = '';
  const maxBombs = Math.max(1, maxCells - 1);
  for (let i = 1; i <= maxBombs; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = String(i);
    if (i === state.bombs) opt.selected = true;
    els.bombs.appendChild(opt);
  }
}

function gridFromValue(v) {
  const [r, c] = v.split('x').map(Number);
  return {rows: r, cols: c};
}

function updateUIStats(game) {
  els.hits.textContent = String(game.hits);
  els.multiplier.textContent = game.multiplier.toFixed(2) + '×';
  const cashoutValue = game.getCashoutValue(state.bet);
  els.payout.textContent = cashoutValue.toFixed(2);
  els.cashout.disabled = !(game.hits > 0 && !game.isOver);
}

function applyCashoutPulse() {
  document.body.classList.add('cashout-glow');
  setTimeout(() => document.body.classList.remove('cashout-glow'), 720);
}

// Initialize
const {rows, cols} = gridFromValue(els.grid.value);
state.rows = rows; state.cols = cols;
populateBombs(rows * cols);

els.balance.textContent = state.balance.toFixed(2);
els.bet.value = state.bet.toFixed(1);
els.edge.value = state.edgePct.toFixed(1);

// setup ProvablyFair helper
const pfHelper = new ProvablyFair();

let game = new MinesGame({
  rows: state.rows, cols: state.cols, bombs: state.bombs, edgePct: state.edgePct
}, bus, pfHelper, state.pf);
let ui = new MinesUI(els.board, game, bus);

// UI bindings
els.chips.forEach(btn => btn.addEventListener('click', () => {
  const add = parseFloat(btn.dataset.chip);
  const v = Math.max(0.1, (parseFloat(els.bet.value) || 0) + add);
  els.bet.value = v.toFixed(1);
}));
els.half.addEventListener('click', () => {
  const v = Math.max(0.1, (parseFloat(els.bet.value) || 0) / 2);
  els.bet.value = v.toFixed(1);
});
els.double.addEventListener('click', () => {
  const v = Math.max(0.1, (parseFloat(els.bet.value) || 0) * 2);
  els.bet.value = v.toFixed(1);
});
els.clear.addEventListener('click', () => { els.bet.value = '0.0'; });

els.grid.addEventListener('change', () => {
  const g = gridFromValue(els.grid.value);
  state.rows = g.rows; state.cols = g.cols;
  populateBombs(state.rows * state.cols);
  // rebuild game with new grid (keep bombs if still valid)
  state.bombs = Math.min(state.bombs, state.rows * state.cols - 1);
  remakeGame();
});

els.bombs.addEventListener('change', () => {
  state.bombs = parseInt(els.bombs.value, 10);
  remakeGame();
});

els.edge.addEventListener('change', () => {
  state.edgePct = Math.max(0, Math.min(10, parseFloat(els.edge.value) || 0));
  game.setEdge(state.edgePct);
  updateUIStats(game);
});

els.newRound.addEventListener('click', () => {
  state.bet = Math.max(0.1, parseFloat(els.bet.value) || 0.1);
  if (state.bet > state.balance) {
    alert('Nicht genug Balance.');
    return;
  }
  state.balance -= state.bet;
  els.balance.textContent = state.balance.toFixed(2);
  game.startRound();
  updateUIStats(game);
});

els.cashout.addEventListener('click', () => {
  const won = game.getCashoutValue(state.bet);
  state.balance += won;
  els.balance.textContent = state.balance.toFixed(2);
  applyCashoutPulse();
  game.endRound(true);
  updateUIStats(game);
});

// Provably Fair controls
els.pf.serverSeed.addEventListener('input', e => { state.pf.serverSeed = e.target.value; });
els.pf.clientSeed.addEventListener('input', e => { state.pf.clientSeed = e.target.value; });
els.pf.nonce.addEventListener('input', e => { state.pf.nonce = parseInt(e.target.value || '0', 10); });
els.pf.reroll.addEventListener('click', () => {
  game.rerollWithSeeds(state.pf);
  updateUIStats(game);
});

// Subscribe to game events
bus.on('reveal', () => updateUIStats(game));
bus.on('roundOver', () => {
  updateUIStats(game);
});
bus.on('boom', () => {
  // reveal all bombs already handled by UI; just update stats
  updateUIStats(game);
});

function remakeGame() {
  game.destroy();
  game = new MinesGame({
    rows: state.rows, cols: state.cols, bombs: state.bombs, edgePct: state.edgePct
  }, bus, pfHelper, state.pf);
  ui.destroy();
  ui = new MinesUI(els.board, game, bus);
  updateUIStats(game);
}

// initial render
updateUIStats(game);
