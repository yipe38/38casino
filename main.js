// ====== TAB TITLE & FAVICON ======
const BASE_TITLE = "🎰 Fake Casino";
let currentGame = ""; // z.B. "Mines"

function refreshTitle() {
  document.title = `${BASE_TITLE} — ${balance} Coins${currentGame ? " · " + currentGame : ""}`;
}

function flashTitleWin(amount, ms = 1800) {
  const orig = document.title;
  const msg  = `💸 +${amount} Coins!`;
  let on = false;
  const id = setInterval(() => {
    document.title = on ? msg : orig;
    on = !on;
  }, 350);
  setTimeout(() => { clearInterval(id); refreshTitle(); }, ms);
}

const FAV_BASE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><radialGradient id="g" cx="50%" cy="40%" r="60%">
    <stop offset="0%" stop-color="#44c780"/><stop offset="100%" stop-color="#0f3d2a"/>
  </radialGradient></defs>
  <circle cx="32" cy="32" r="28" fill="url(#g)"/>
  <circle cx="32" cy="32" r="20" fill="none" stroke="white" stroke-width="4"/>
</svg>`;

const FAV_MINES = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#222"/>
  <g transform="translate(32 32)">
    <circle r="18" fill="#111" stroke="#444" stroke-width="3"/>
    <g stroke="#fff" stroke-width="4" stroke-linecap="round">
      <line x1="-6" y1="-6" x2="6" y2="6"/>
      <line x1="-6" y1="6" x2="6" y2="-6"/>
    </g>
  </g>
</svg>`;

const FAV_WIN = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0f3d2a"/>
  <path d="M16 34 l10 10 l22 -22" fill="none" stroke="#4ade80" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function setFavicon(svg) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; link.type = 'image/svg+xml'; document.head.appendChild(link); }
  link.href = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function getFavForState() {
  return currentGame === "Mines" ? FAV_MINES : FAV_BASE;
}
function flashFavicon(svg, ms = 1200) {
  setFavicon(svg);
  setTimeout(() => setFavicon(getFavForState()), ms);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshTitle(); });

// ====== WALLET / FX (dein Stand + kleine Hooks) ======
let balance = parseInt(localStorage.getItem("casino_balance")) || 1000;
const balanceEl = document.getElementById("balance");
const walletEl  = document.getElementById("wallet");
updateBalance();
setFavicon(getFavForState());
refreshTitle();

function updateBalance() {
  balanceEl.textContent = balance;
  localStorage.setItem("casino_balance", balance);
  refreshTitle();
}

// smooth counter
function animateBalanceNumber(from, to, duration = 650) {
  const diff = to - from;
  if (diff === 0) return;
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(from + diff * eased);
    balanceEl.textContent = val;
    if (t < 1) requestAnimationFrame(step);
    else { balance = to; updateBalance(); }
  };
  requestAnimationFrame(step);
}

// +Betrag fliegt zur Wallet + Screen-Glow
function flyAmountToWallet(amount, originEl) {
  const startEl =
    originEl ||
    document.querySelector("#cashoutBtn") ||
    document.querySelector("#payout") ||
    document.querySelector("#game-container");

  const s = startEl.getBoundingClientRect();
  const t = walletEl.getBoundingClientRect();

  const n = document.createElement("div");
  n.className = "fly-amount";
  n.textContent = `+${amount}`;
  document.body.appendChild(n);

  const sx = s.left + s.width / 2;
  const sy = s.top + s.height / 2;
  n.style.left = `${sx}px`;
  n.style.top  = `${sy}px`;

  const dx = t.left + t.width / 2 - sx;
  const dy = t.top  + t.height / 2 - sy;

  n.animate(
    [
      { transform: "translate(-50%,-50%) scale(0.9)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(1.15)", opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.85)`, opacity: 0 }
    ],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" }
  ).onfinish = () => n.remove();

  document.body.classList.add("cashout-glow");
  walletEl.classList.add("bump");
  setTimeout(() => {
    document.body.classList.remove("cashout-glow");
    walletEl.classList.remove("bump");
  }, 650);
}

// Balance ändern (+ Titel/Favicon Flash bei Gewinn)
function changeBalance(amount) {
  const oldVal = balance;
  let newVal = balance + amount;
  if (newVal < 0) newVal = 0;

  if (amount > 0) {
    flyAmountToWallet(amount);
    flashTitleWin(amount);
    flashFavicon(FAV_WIN);
    animateBalanceNumber(oldVal, newVal, 650);
  } else {
    balance = newVal;
    updateBalance();
  }
}

// ====== Game Loader ======
function loadGame(game) {
  const container = document.getElementById("game-container");

  if (game === "mines") {
    currentGame = "Mines";
    setFavicon(getFavForState());
    refreshTitle();

    container.innerHTML = `<h2 style="margin-top:.2rem">Mines</h2><div id="mines-board"></div>`;
    import("./games/mines.js").then(module => {
      module.initMinesGame(changeBalance);
    });
  } else {
    currentGame = ""; setFavicon(getFavForState()); refreshTitle();
    container.innerHTML = `<p>🚧 ${game} ist noch nicht verfügbar.</p>`;
  }
}
window.loadGame = loadGame;
