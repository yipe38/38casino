// Wallet / Guthaben-Logik
let balance = parseInt(localStorage.getItem("casino_balance")) || 1000;
const balanceEl = document.getElementById("balance");
const walletEl  = document.getElementById("wallet");
updateBalance();

function updateBalance() {
  balanceEl.textContent = balance;
  localStorage.setItem("casino_balance", balance);
}

// Zählt die Balance smooth hoch/runter
function animateBalanceNumber(from, to, duration = 650) {
  const diff = to - from;
  if (diff === 0) return;
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const val = Math.round(from + diff * eased);
    balanceEl.textContent = val;
    if (t < 1) requestAnimationFrame(step);
    else { balance = to; updateBalance(); }
  };
  requestAnimationFrame(step);
}

// Grünes "+Betrag" fliegt zum Wallet + Screen-Glow
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

  // Startposition (Mitte)
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

  // Screen-Glow & Wallet-Bump
  document.body.classList.add("cashout-glow");
  walletEl.classList.add("bump");
  setTimeout(() => {
    document.body.classList.remove("cashout-glow");
    walletEl.classList.remove("bump");
  }, 650);
}

// Balance verändern (mit Animation bei Gewinnen)
function changeBalance(amount) {
  const oldVal = balance;
  let newVal = balance + amount;
  if (newVal < 0) newVal = 0;

  if (amount > 0) {
    flyAmountToWallet(amount);
    animateBalanceNumber(oldVal, newVal, 650);
  } else {
    balance = newVal;
    updateBalance();
  }
}

// Game Loader
function loadGame(game) {
  const container = document.getElementById("game-container");

  if (game === "mines") {
    container.innerHTML = `<h2 style="margin-top:.2rem">Mines <span style="font-size:.9rem">💣</span></h2><div id="mines-board"></div>`;
    import("./games/mines.js").then(module => {
      module.initMinesGame(changeBalance);
    });
  } else {
    container.innerHTML = `<p>🚧 ${game} ist noch nicht verfügbar.</p>`;
  }
}
window.loadGame = loadGame; // für onclick in index.html
