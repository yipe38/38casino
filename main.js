// ================================
// Globale Variablen
// ================================
let balance = 100; // Startguthaben – anpassbar
const balanceEl = document.getElementById("balance");
const menuEl = document.getElementById("menu");
const gameFrame = document.getElementById("game-frame");

function updateBalanceDisplay() {
  if (balanceEl) balanceEl.textContent = balance.toFixed(2) + " $";
}

// Spiele laden
function loadGame(gameName) {
  if (!gameFrame) return;
  const safe = String(gameName || "").replace(/[^a-z0-9\-]/gi, "");
  gameFrame.src = `games/${safe}.html`;
}

// Demo-Cashout (Button im Hauptmenü)
function demoCashout() {
  const winAmount = 50;
  balance += winAmount;
  updateBalanceDisplay();
  runCashoutGlow();
}

// ================================
// Einheitliche Casino-Events (Parent <-> Game via postMessage)
// ================================
const CASINO_EVENT = 'casino:event';
const CASINO_REPLY = 'casino:reply';
const CASINO_VERSION = '1.0.0';

// Security: später whitelisten (z. B. [location.origin])
const ALLOWED_ORIGINS = ['*'];
const isAllowedOrigin = (origin) =>
  ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin);

const casinoHandlers = {
  // Game signalisiert Cashout (payload: { amount:number })
  cashout(payload, source, origin) {
    const amount = Number(payload?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      try {
        source.postMessage(
          { kind: CASINO_REPLY, version: CASINO_VERSION, type: 'cashout:err', message: 'Invalid amount' },
          origin
        );
      } catch {}
      return;
    }
    balance += amount;
    updateBalanceDisplay();
    runCashoutGlow();
    // Optional: Sound/Toast/Analytics
    try {
      source.postMessage(
        { kind: CASINO_REPLY, version: CASINO_VERSION, type: 'cashout:ok', balance },
        origin
      );
    } catch {}
  },

  // Game fragt Balance ab
  getBalance(payload, source, origin) {
    try {
      source.postMessage(
        { kind: CASINO_REPLY, version: CASINO_VERSION, type: 'balance', balance },
        origin
      );
    } catch {}
  },

  // optionale FX
  'fx:glow'(payload, source, origin) {
    runCashoutGlow(Number(payload?.durationMs) || 700);
    try {
      source.postMessage(
        { kind: CASINO_REPLY, version: CASINO_VERSION, type: 'fx:glow:ok' },
        origin
      );
    } catch {}
  },

  // optionale Info-Events
  win(payload, source, origin) {
    try {
      source.postMessage({ kind: CASINO_REPLY, version: CASINO_VERSION, type: 'win:ok' }, origin);
    } catch {}
  },
  lose(payload, source, origin) {
    try {
      source.postMessage({ kind: CASINO_REPLY, version: CASINO_VERSION, type: 'lose:ok' }, origin);
    } catch {}
  }
};

window.addEventListener('message', (evt) => {
  const { data, origin, source } = evt;
  if (!source || !isAllowedOrigin(origin)) return;
  if (!data || data.kind !== CASINO_EVENT || data.version !== CASINO_VERSION) return;

  const { type, payload } = data;
  const handler = casinoHandlers[type];
  if (handler) handler(payload, source, origin);
});

// ================================
// Cashout Glow Effekt (zentral & einheitlich)
// ================================
function runCashoutGlow(durationMs = 700) {
  document.querySelectorAll(".cashout-overlay").forEach(n => n.remove());
  const overlay = document.createElement("div");
  overlay.className = "cashout-overlay";
  document.body.appendChild(overlay);

  const fadeStart = Math.max(0, durationMs - 300);
  setTimeout(() => overlay.classList.add("fadeout"), fadeStart);
  setTimeout(() => overlay.remove(), durationMs + 400);
}

// ================================
// Menü-Events
// ================================
if (menuEl) {
  menuEl.addEventListener("click", (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.matches('[data-game]')) {
      loadGame(btn.getAttribute('data-game'));
    } else if (btn.id === 'cashoutBtn') {
      demoCashout();
    }
  });
}

// Init
updateBalanceDisplay();
