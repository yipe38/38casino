// src/main.js
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
const balanceEl= document.getElementById('balance');

// --- Round / Wallet State ---
let round = null;
let roundActive = false;    // eine laufende Runde?
let roundBet = 0;           // Einsatz der aktuellen Runde

let current = { size: 5, bombs: 5, hits: 0, multiplier: 1, ended: false, busted: false };

// ----------------------- Init -----------------------
init();

function init() {
  // Grid → Bombenliste
  gridSel.addEventListener('change', rebuildBombOptions);
  rebuildBombOptions();

  // Buttons
  btnNew.addEventListener('click', startRound);
  btnCash.addEventListener('click', doCashout);

  // Autostart einer ersten Runde ohne Abzug? -> Nein.
  // User entscheidet selbst: Start nur per Button.
  updateHUD();
}

// ----------------------- UI Helpers -----------------------
function rebuildBombOptions() {
  const [w, h] = gridSel.value.split('x').map(Number);
  const size = w;
  bombsSel.replaceChildren();

  // 1..(size^2 - 1)
  for (let i = 1; i < size * size; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    bombsSel.appendChild(opt);
  }
  bombsSel.value = Math.round((size * size) * 0.2); // ~20%
}

// ----------------------- Balance -----------------------
function getBalance() {
  return parseFloat((balanceEl.textContent || '0').replace(',', '.')) || 0;
}
function setBalance(v) {
  balanceEl.textContent = toMoney(v);
}
function toMoney(v) {
  return (Math.round(v * 100) / 100).toFixed(2);
}
function getBet() {
  const v = parseFloat((betInput.value || '1').replace(',', '.')) || 1;
  return Math.max(0.1, Math.round(v * 100) / 100);
}

// ----------------------- Round Flow -----------------------
function startRound() {
  // keine neue Runde, falls noch aktiv
  if (roundActive && !current.ended && !current.busted) {
    console.warn('Runde läuft bereits. Erst cashouten oder busten.');
    return;
  }

  const [w] = gridSel.value.split('x').map(Number);
  const size = w;
  const bombs = Number(bombsSel.value);
  const bet = getBet();
  const balance = getBalance();

  // genug Guthaben?
  if (bet > balance) {
    // kleines visuelles Feedback
    betInput.classList.add('shake');
    setTimeout(() => betInput.classList.remove('shake'), 400);
    console.warn('Zu wenig Guthaben.');
    return;
  }

  // Einsatz abziehen
  setBalance(balance - bet);
  roundBet = bet;

  // UI sperren bis Runde beendet
  betInput.disabled = true;
  gridSel.disabled = true;
  bombsSel.disabled = true;
  btnCash.disabled = true;

  // State reset
  current = { size, bombs, hits: 0, multiplier: 1, ended: false, busted: false };
  updateHUD();

  // Board erstellen
  round = newRound(boardEl, size, bombs, ({ hits, multiplier, ended, busted }) => {
    current.hits = hits;
    current.multiplier = multiplier;
    current.ended = ended;
    current.busted = busted;

    // Cashout-Button aktivieren, sobald min. 1 Safe
    btnCash.disabled = ended || busted || hits <= 0;

    // Wenn direkt gebustet wurde, Runde schließen
    if (ended && busted) {
      finishRound(false); // kein Gewinn, Einsatz bleibt weg
    } else {
      updateHUD();
    }
  });

  roundActive = true;
}

function doCashout() {
  if (!roundActive || current.ended || current.busted || current.hits <= 0) return;

  const payout = roundBet * current.multiplier;

  // Glow
  pulseEl.classList.add('active');
  setTimeout(() => pulseEl.classList.remove('active'), 600);

  // Board offen zeigen & Runde beenden
  round?.openAll();
  current.ended = true;
  btnCash.disabled = true;

  finishRound(true, payout);
}

function finishRound(won, payout = 0) {
  // UI wieder freigeben
  betInput.disabled = false;
  gridSel.disabled = false;
  bombsSel.disabled = false;

  if (won && payout > 0) {
    setBalance(getBalance() + payout); // Auszahlung brutto (Stake + Gewinn)
    payoutEl.textContent = toMoney(payout);
  } else {
    // Bust: Payout 0.00
    payoutEl.textContent = '0.00';
  }

  roundActive = false;
  updateHUD();
}

// ----------------------- HUD -----------------------
function updateHUD() {
  hitsEl.textContent = String(current.hits);
  multEl.textContent = `${(current.multiplier || 1).toFixed(2)}×`;

  // Vorschau-Cashout (ohne tatsächliche Auszahlung)
  if (roundActive && current.hits > 0 && !current.busted && !current.ended) {
    const preview = roundBet * current.multiplier;
    payoutEl.textContent = toMoney(preview);
  } else if (!roundActive) {
    // außerhalb einer Runde: Vorschau basierend auf aktuellem Bet
    const preview = getBet() * (current.multiplier || 1);
    payoutEl.textContent = toMoney(preview);
  }
}

// --- kleiner CSS Shake-Effekt für Bet bei zu wenig Guthaben ---
const style = document.createElement('style');
style.textContent = `
  .shake { animation: c38-shake 0.4s; }
  @keyframes c38-shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }
`;
document.head.appendChild(style);
