// games/mines.js

// Öffentliche Init-Funktion, wird aus main.js aufgerufen
export function initMinesGame(changeBalanceCb) {
  const host = document.getElementById("mines-board");
  host.innerHTML = "";
  injectStyles();

  // --- Konfiguration ---
  const SIZE = 5;                 // 5x5 Grid
  const CELLS = SIZE * SIZE;      // 25 Felder
  const HOUSE_EDGE = 0.01;        // 1% Hausvorteil (kannst du auf 0 setzen)
  const MIN_BOMBS = 3;
  const MAX_BOMBS = 15;

  // --- State ---
  let bombs = 5;
  let bet = 10;
  let roundActive = false;
  let bombSet = new Set();   // Indizes der Bomben
  let revealed = new Set();  // bereits aufgedeckte Safe-Felder
  let betLocked = 0;         // tatsächlich gesetzter Betrag (abgezogen)
  let currentMultiplier = 1;

  // --- UI ---
  const panel = document.createElement("div");
  panel.className = "mines-panel";
  panel.innerHTML = `
    <div class="controls">
      <label>Einsatz:
        <input id="betInput" type="number" min="1" value="10" />
      </label>
      <label>Bomben:
        <input id="bombInput" type="number" min="${MIN_BOMBS}" max="${MAX_BOMBS}" value="5" />
      </label>
      <button id="startBtn">Start</button>
      <button id="cashoutBtn" disabled>Cashout</button>
    </div>
    <div class="status">
      <div>Multiplikator: <span id="multiplier">1.00×</span></div>
      <div>Pot. Auszahlung: <span id="payout">0</span> Coins</div>
      <div id="message"></div>
    </div>
    <div class="grid" id="grid"></div>
  `;
  host.appendChild(panel);

  const betInput = panel.querySelector("#betInput");
  const bombInput = panel.querySelector("#bombInput");
  const startBtn = panel.querySelector("#startBtn");
  const cashoutBtn = panel.querySelector("#cashoutBtn");
  const gridEl = panel.querySelector("#grid");
  const multiplierEl = panel.querySelector("#multiplier");
  const payoutEl = panel.querySelector("#payout");
  const messageEl = panel.querySelector("#message");

  renderGrid();

  startBtn.addEventListener("click", startRound);
  cashoutBtn.addEventListener("click", handleCashout);

  function startRound() {
    if (roundActive) return;

    bet = clampInt(betInput.value, 1, 1e9);
    bombs = clampInt(bombInput.value, MIN_BOMBS, MAX_BOMBS);

    // Versuche Einsatz abzubuchen (wir kennen nur changeBalance, daher hier ein kleiner Trick):
    // Wir ziehen den Einsatz "optimistisch" ab, indem wir -bet aufrufen. Wenn dein System
    // eine Validierung braucht, bau sie in main.js ein (z.B. blockieren, wenn balance < bet).
    changeBalanceCb(-bet);
    betLocked = bet;

    // Runde vorbereiten
    revealed.clear();
    currentMultiplier = 1;
    roundActive = true;
    message("");
    cashoutBtn.disabled = true;
    betInput.disabled = true;
    bombInput.disabled = true;

    // Bomben sicher zufällig verteilen
    bombSet = pickUniqueRandomIndices(CELLS, bombs);

    // Grid neu aufbauen & entsperren
    renderGrid(true);
    updatePayoutUI();
  }

  function handleClickCell(idx, btn) {
    if (!roundActive) return;
    if (revealed.has(idx)) return;

    if (bombSet.has(idx)) {
      // VERLOREN
      btn.classList.add("bomb", "blow");
      revealAll(true);
      endRound(false);
      return;
    }

    // Safe
    revealed.add(idx);
    btn.classList.add("safe");

    // Multiplikator updaten (fair = Produkt der 1/Überlebenswahrscheinlichkeit je Schritt)
    currentMultiplier = computeMultiplier(revealed.size, CELLS, bombs, HOUSE_EDGE);
    updatePayoutUI();

    // Cashout jetzt möglich
    cashoutBtn.disabled = false;

    // Gewinn, wenn alle Safes gefunden wurden (maximaler Cashout)
    const totalSafes = CELLS - bombs;
    if (revealed.size >= totalSafes) {
      revealAll(false);
      endRound(true, true); // auto max cashout
    }
  }

  function handleCashout() {
    if (!roundActive) return;
    const payout = currentPayout();
    // Da wir den Einsatz bereits abgezogen haben, zahlen wir die gesamte Auszahlung zurück:
    // Effektiver Gewinn = payout - betLocked
    changeBalanceCb(payout);
    endRound(true);
  }

  function endRound(won, auto = false) {
    roundActive = false;
    cashoutBtn.disabled = true;
    betInput.disabled = false;
    bombInput.disabled = false;

    if (won) {
      const payout = currentPayout();
      message(auto
        ? `✅ Maximale Auszahlung! Erhalten: ${payout} Coins.`
        : `✅ Cashout! Erhalten: ${payout} Coins.`);
    } else {
      message(`💥 Boom! Einsatz verloren (-${betLocked}).`);
    }
  }

  function currentPayout() {
    // Auszahlung = Einsatz * aktueller Multiplikator (gerundet)
    return Math.max(0, Math.floor(betLocked * currentMultiplier));
  }

  function updatePayoutUI() {
    multiplierEl.textContent = `${currentMultiplier.toFixed(2)}×`;
    payoutEl.textContent = `${currentPayout()}`;
  }

  function renderGrid(enableClicks = false) {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--size", SIZE);
    for (let i = 0; i < CELLS; i++) {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.textContent = ""; // minimal clean
      if (enableClicks) {
        btn.addEventListener("click", () => handleClickCell(i, btn));
      } else {
        btn.disabled = true;
      }
      gridEl.appendChild(btn);
    }
  }

function revealAll(lose) {
  const cells = gridEl.querySelectorAll(".cell");
  for (let i = 0; i < CELLS; i++) {
    const c = cells[i];
    c.disabled = true;
    if (bombSet.has(i)) {
      c.classList.add("bomb");
      // kein Emoji mehr – CSS-Styles übernehmen Darstellung
    } else if (revealed.has(i)) {
      c.classList.add("safe");
    } else {
      c.classList.add("hidden");
    }
  }
}


  function message(txt) {
    messageEl.textContent = txt;
  }
}

/* -------------------- Helper -------------------- */

// Multiplier nach k sicheren Klicks
// Fair-Formel: Produkt_{i=0..k-1} (Total / SafesRemainingVorKlick_i)
// = Produkt 1 / P(Safe_i)
// Mit kleinem Hausvorteilfaktor (1 - edge) pro Schritt.
function computeMultiplier(k, totalCells, bombCount, houseEdge = 0) {
  if (k <= 0) return 1;
  let m = 1;
  for (let i = 0; i < k; i++) {
    const remaining = totalCells - i;                  // verbleibende Felder vor diesem Klick
    const safesRemaining = (totalCells - bombCount) - i;
    const pSafe = safesRemaining / remaining;
    const stepMult = (1 / pSafe) * (1 - houseEdge);
    m *= stepMult;
  }
  return Math.max(1, m);
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// Wählt "count" eindeutige Zufalls-Indizes von 0..(poolSize-1)
function pickUniqueRandomIndices(poolSize, count) {
  if (count >= poolSize) throw new Error("Zu viele Bomben.");
  const set = new Set();
  // kryptografisch sicher
  while (set.size < count) {
    const idx = secureRandomInt(0, poolSize - 1);
    set.add(idx);
  }
  return set;
}

// kryptografisch sicherer Int in [min, max]
function secureRandomInt(min, max) {
  const range = max - min + 1;
  if (range <= 0) return min;
  // 32-bit random
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const x = buf[0] / 0xFFFFFFFF;
  return min + Math.floor(x * range);
}

// Styles nur für das Mines-Game injizieren
function injectStyles() {
  if (document.getElementById("mines-style")) return;
  const style = document.createElement("style");
  style.id = "mines-style";
  style.textContent = `
    .mines-panel { max-width: 680px; margin: 0 auto; display: grid; gap: 1rem; }
    .controls { display: flex; gap: .5rem; justify-content: center; align-items: center; flex-wrap: wrap; }
    .controls label { background:#2b2b2b; padding:.5rem .75rem; border-radius:8px; }
    .controls input { width: 80px; margin-left:.5rem; background:#1e1e1e; color:#fff; border:1px solid #444; border-radius:6px; padding:.3rem .5rem; }
    .controls button { background:#555; color:#fff; border:none; padding:.6rem 1rem; border-radius:8px; cursor:pointer; }
    .controls button:hover { background:#777; }
    .status { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }
    .status #message { width:100%; margin-top:.25rem; color:#ddd; }
    .grid { display:grid; grid-template-columns: repeat(var(--size,5), 56px); gap:8px; justify-content:center; padding:8px; }
    .cell { width:56px; height:56px; background:#444; border:2px solid #3a3a3a; border-radius:10px; cursor:pointer; font-size:1.2rem; }
    .cell:hover { filter:brightness(1.1); }
    .cell.safe { background:#2e7d32; border-color:#2a6e2d; }
    .cell.bomb { background:#9b1c1c; border-color:#821818; color:#fff; }
    .cell.hidden { opacity:.7; }
    .cell.blow { animation: shake .35s linear 1; }
    @keyframes shake {
      0%{ transform: translate(0,0); }
      25%{ transform: translate(2px,-2px); }
      50%{ transform: translate(-2px,2px); }
      75%{ transform: translate(2px,2px); }
      100%{ transform: translate(0,0); }
    }
  `;
  document.head.appendChild(style);
}
