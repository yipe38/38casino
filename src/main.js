import { newRound } from './mines.js';

const boardEl = document.getElementById('board');
const bombsSel = document.getElementById('bombs');
const gridSel  = document.getElementById('grid');
const betInput = document.getElementById('bet');

const hitsEl   = document.getElementById('hits');
const multEl   = document.getElementById('multiplier');
const payoutEl = document.getElementById('payout');

const btnNew   = document.getElementById('newRound');
const btnCash  = document.getElementById('cashout');
const pulseEl  = document.getElementById('cashoutPulse');

let round = null;
let current = { size: 5, bombs: 5, hits: 0, multiplier: 1, ended: false, busted: false };

init();

function init() {
  gridSel.addEventListener('change', rebuildBombOptions);
  rebuildBombOptions();
  btnNew.addEventListener('click', startRound);
  btnCash.addEventListener('click', doCashout);
  startRound();
}

function rebuildBombOptions() {
  const [w, h] = gridSel.value.split('x').map(Number);
  const size = w;
  bombsSel.replaceChildren();
  for (let i = 1; i < size * size; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    bombsSel.appendChild(opt);
  }
  bombsSel.value = Math.round((size * size) * 0.2);
}

function startRound() {
  const [w] = gridSel.value.split('x').map(Number);
  const size = w;
  const bombs = Number(bombsSel.value);

  current = { size, bombs, hits: 0, multiplier: 1, ended: false, busted: false };
  btnCash.disabled = true;
  updateHUD();

  round = newRound(boardEl, size, bombs, ({ hits, multiplier, ended, busted }) => {
    current.hits = hits;
    current.multiplier = multiplier;
    current.ended = ended;
    current.busted = busted;
    btnCash.disabled = ended || busted || hits <= 0;
    updateHUD();
  });
}

function doCashout() {
  if (current.ended || current.busted || current.hits <= 0) return;
  const bet = parseFloat(betInput.value || '1');
  const payout = bet * current.multiplier;
  pulseEl.classList.add('active');
  setTimeout(() => pulseEl.classList.remove('active'), 600);
  current.ended = true;
  btnCash.disabled = true;
  round?.openAll();
  payoutEl.textContent = payout.toFixed(2);
}

function updateHUD() {
  hitsEl.textContent = current.hits;
  multEl.textContent = `${current.multiplier.toFixed(2)}×`;
  payoutEl.textContent = current.hits > 0 ? (parseFloat(betInput.value) * current.multiplier).toFixed(2) : '0.00';
}
