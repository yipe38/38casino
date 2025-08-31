// games/mines.js
// Kompletter, eigenständiger Mines-Modus (5x5) mit einfachem Payout & zentralem Cashout via SDK.
// - Erstellt seine eigene UI (falls kein Markup vorhanden).
// - Nutzt window.Casino.cashout(...) wenn vorhanden; Fallback via postMessage.
// - Unterstützt URL-Parameter: ?size=5&bombs=3&bet=10 (alles optional)

(function () {
  "use strict";

  // =========================
  // Param-Helper
  // =========================
  const params = new URLSearchParams(location.search);
  const GRID_SIZE = clamp(int(params.get("size"), 5), 3, 10);   // 3..10
  const BOMB_COUNT = clamp(int(params.get("bombs"), 3), 1, Math.max(1, GRID_SIZE * GRID_SIZE - 1));
  let   bet = Math.max(1, float(params.get("bet"), 10));        // Einsatz (min 1)

  function int(v, d = 0) { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : d; }
  function float(v, d = 0) { const n = Number.parseFloat(v); return Number.isFinite(n) ? n : d; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  // =========================
  // SDK / Messaging
  // =========================
  const CASINO_EVENT = "casino:event";
  const CASINO_VERSION = "1.0.0";

  function parentCashout(amount) {
    amount = Number(amount) || 0;
    if (amount <= 0) return;
    if (window.Casino && typeof window.Casino.cashout === "function") {
      window.Casino.cashout(amount);
    } else if (window.parent && window.parent !== window) {
      // Fallback, falls SDK im Game nicht eingebunden wäre
      window.parent.postMessage({ kind: CASINO_EVENT, version: CASINO_VERSION, type: "cashout", payload: { amount } }, "*");
    } else {
      // Im Notfall nur anzeigen
      alert(`Cashout: +$${amount.toFixed(2)}`);
    }
  }

  // =========================
  // State
  // =========================
  let bombs = new Set();           // Set mit "r,c" Strings
  let revealed = new Set();        // bereits aufgedeckte Felder "r,c"
  let flagged = new Set();         // (optional)
  let gameOver = false;

  // Gewinnmultiplikator:
  // Einfaches Beispiel: steigt mit jedem safe Reveal stärker bei hoher Bombendichte.
  function multiplier() {
    const total = GRID_SIZE * GRID_SIZE;
    const safeTotal = total - BOMB_COUNT;
    const safeRevealed = revealed.size;
    if (safeRevealed <= 0) return 1.0;

    // Base-Kurve (anpassbar)
    const density = BOMB_COUNT / total; // 0..1
    // Steiler bei höherer Bombendichte
    const k = 0.12 + density * 0.28;    // 0.12..0.40
    const m = 1 + safeRevealed * k;

    // kleiner Bonus je Reihe (macht frühes Cashout etwas lohnender)
    const rowBonus = 0.02 * Math.floor(safeRevealed / GRID_SIZE);

    return round2(m + rowBonus);
  }

  // potenzieller Gewinn
  function potentialWin() {
    return round2(bet * multiplier());
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // =========================
  // UI erstellen (autark)
  // =========================
  const root = ensureRoot();
  const ui = buildUI(root);

  function ensureRoot() {
    // Falls es schon ein Wrapper-Element gibt, nutzen
    const existing = document.getElementById("mines-root");
    if (existing) return existing;

    // Sonst alles minimal selbst bauen
    document.documentElement.style.background = "transparent";
    document.body.style.margin = "0";
    document.body.style.background = "#111";
    document.body.style.color = "#eee";
    document.body.style.fontFamily = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    document.body.style.display = "grid";
    document.body.style.placeItems = "center";
    document.body.style.height = "100vh";

    const wrap = document.createElement("div");
    wrap.id = "mines-root";
    wrap.style.width = "min(95vw, 900px)";
    wrap.style.textAlign = "center";
    wrap.style.padding = "16px";
    wrap.style.boxSizing = "border-box";
    document.body.appendChild(wrap);
    return wrap;
  }

  function buildUI(root) {
    root.innerHTML = "";

    const title = el("h2", { text: "💣 Mines" });
    root.appendChild(title);

    // Controls: Bet, Size, Bombs
    const controls = el("div", { style: "margin: 8px 0 14px 0; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;" });
    controls.appendChild(makeNumber("Einsatz ($)", bet, 1, 100000, 0.5, (v) => { bet = Math.max(1, v); refreshTop(); }));
    controls.appendChild(makeNumber("Feldgröße", GRID_SIZE, 3, 10, 1, null, true));
    controls.appendChild(makeNumber("Bomben", BOMB_COUNT, 1, GRID_SIZE * GRID_SIZE - 1, 1, null, true));
    root.appendChild(controls);

    // Top-Bar: Bet, Multiplier, Potential
    const topBar = el("div", { style: "display:flex; gap:12px; justify-content:center; margin: 10px 0; flex-wrap:wrap;" });
    const betBox = pill("Einsatz", `$${bet.toFixed(2)}`);
    const multiBox = pill("Multi", "x1.00");
    const potBox = pill("Auszahlung", "$0.00");
    topBar.append(betBox.el, multiBox.el, potBox.el);
    root.appendChild(topBar);

    // Grid
    const grid = el("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    grid.style.gap = "10px";
    grid.style.margin = "14px auto";
    grid.style.width = "min(600px, 90%)";
    root.appendChild(grid);

    // Bottom: Reveal/Cashout/Reset
    const bottom = el("div", { style: "display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:6px;" });
    const cashoutBtn = button("💸 Cashout", () => cashoutAction());
    const resetBtn = button("🔁 Neue Runde", () => resetGame());
    bottom.append(cashoutBtn, resetBtn);
    root.appendChild(bottom);

    // Build grid buttons
    const cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement("button");
        cell.dataset.r = r;
        cell.dataset.c = c;
        stylizeCell(cell);
        cell.addEventListener("click", () => onCellClick(cell));
        cell.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          toggleFlag(cell);
        });
        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    // Init round
    newRound();

    function refreshTop() {
      betBox.setValue(`$${bet.toFixed(2)}`);
      multiBox.setValue(`x${multiplier().toFixed(2)}`);
      potBox.setValue(`$${potentialWin().toFixed(2)}`);
    }

    function onCellClick(cell) {
      if (gameOver) return;
      const key = keyOf(cell);
      if (revealed.has(key)) return;

      if (bombs.has(key)) {
        // BOOM
        revealBomb(cell);
        endGame(false);
        return;
      }
      revealSafe(cell);
      refreshTop();
    }

    function cashoutAction() {
      if (gameOver) return;
      const win = potentialWin();
      disableBoard();
      gameOver = true;
      // Visuelles Feedback lokal
      toast(`Ausgezahlt: $${win.toFixed(2)}`, 1600);
      // Zentrale Auszahlung (Parent übernimmt Glow & Balance)
      parentCashout(win);
    }

    function resetGame() {
      gameOver = false;
      revealed.clear();
      flagged.clear();
      // Reset UI
      for (const cell of cells) {
        cell.disabled = false;
        cell.textContent = "";
        cell.style.background = "#222";
        cell.style.color = "#eee";
        cell.style.boxShadow = "inset 0 0 0 2px #444";
      }
      newRound();
      refreshTop();
    }

    function newRound() {
      bombs = rollBombs(GRID_SIZE, BOMB_COUNT);
      refreshTop();
    }

    function disableBoard() {
      for (const cell of cells) {
        cell.disabled = true;
      }
    }

    function endGame(won) {
      gameOver = true;
      // Alle Bomben anzeigen
      for (const cell of cells) {
        const key = keyOf(cell);
        if (bombs.has(key)) revealBomb(cell, true);
        cell.disabled = true;
      }
      toast(won ? "Gewonnen!" : "💥 Boom! Verloren.", 1500);
    }

    // helpers
    function revealSafe(cell) {
      const key = keyOf(cell);
      revealed.add(key);
      const adj = adjacentBombs(keyToRC(key));
      cell.textContent = adj > 0 ? String(adj) : "✓";
      cell.style.background = "#193a2a";
      cell.style.color = "#b7ffd3";
      cell.style.boxShadow = "inset 0 0 0 2px #0f7048";
    }

    function revealBomb(cell, silent = false) {
      cell.textContent = "💣";
      cell.style.background = "#3a1919";
      cell.style.color = "#ffd0d0";
      cell.style.boxShadow = "inset 0 0 0 2px #702a2a";
      if (!silent) {
        // Rest wird in endGame erledigt
      }
    }

    function toggleFlag(cell) {
      if (gameOver) return;
      const key = keyOf(cell);
      if (revealed.has(key)) return;
      if (flagged.has(key)) {
        flagged.delete(key);
        cell.textContent = "";
        cell.style.opacity = "1";
      } else {
        flagged.add(key);
        cell.textContent = "🚩";
        cell.style.opacity = "0.9";
      }
    }

    function adjacentBombs([r, c]) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= GRID_SIZE || cc >= GRID_SIZE) continue;
          if (bombs.has(`${rr},${cc}`)) n++;
        }
      }
      return n;
    }

    return {
      refreshTop,
      cashoutAction,
      resetGame
    };
  }

  // =========================
  // Game-Logik Helpers
  // =========================
  function rollBombs(size, count) {
    const total = size * size;
    const all = new Array(total).fill(0).map((_, i) => i);
    // Fisher-Yates
    for (let i = all.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [all[i], all[j]] = [all[j], all[i]];
    }
    const set = new Set();
    for (let i = 0; i < count; i++) {
      const idx = all[i];
      const r = (idx / size) | 0;
      const c = idx % size;
      set.add(`${r},${c}`);
    }
    return set;
  }

  function keyOf(cell) {
    return `${cell.dataset.r},${cell.dataset.c}`;
  }
  function keyToRC(key) {
    const [r, c] = key.split(",").map((n) => Number(n));
    return [r, c];
  }

  function stylizeCell(btn) {
    btn.type = "button";
    btn.style.width = "100%";
    btn.style.aspectRatio = "1 / 1";
    btn.style.border = "none";
    btn.style.borderRadius = "10px";
    btn.style.cursor = "pointer";
    btn.style.background = "#222";
    btn.style.color = "#eee";
    btn.style.boxShadow = "inset 0 0 0 2px #444";
    btn.style.fontSize = "clamp(14px, 2.5vw, 20px)";
    btn.style.userSelect = "none";
    btn.style.transition = "transform .05s ease, background .15s ease";
    btn.onmousedown = () => (btn.style.transform = "translateY(1px)");
    btn.onmouseup = () => (btn.style.transform = "translateY(0)");
  }

  // =========================
  // Micro UI helpers
  // =========================
  function el(tag, opts = {}) {
    const n = document.createElement(tag);
    if (opts.text) n.textContent = opts.text;
    if (opts.html) n.innerHTML = opts.html;
    if (opts.class) n.className = opts.class;
    if (opts.style) n.setAttribute("style", opts.style);
    return n;
  }

  function pill(label, value) {
    const wrap = el("div");
    wrap.style.display = "inline-flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.minWidth = "120px";
    const t = el("div", { text: label });
    t.style.fontSize = "12px";
    t.style.opacity = "0.8";
    const v = el("div", { text: value });
    v.style.fontSize = "18px";
    v.style.fontWeight = "700";
    v.style.marginTop = "4px";
    v.style.padding = "6px 10px";
    v.style.borderRadius = "999px";
    v.style.background = "#1a1a1a";
    v.style.boxShadow = "inset 0 0 0 2px #333";
    wrap.append(t, v);
    return {
      el: wrap,
      setValue: (txt) => (v.textContent = txt)
    };
  }

  function button(text, onClick) {
    const b = el("button", { text });
    b.style.background = "#333";
    b.style.color = "#eee";
    b.style.border = "none";
    b.style.padding = "10px 14px";
    b.style.borderRadius = "10px";
    b.style.cursor = "pointer";
    b.style.boxShadow = "inset 0 0 0 2px #444";
    b.onmouseenter = () => (b.style.background = "#444");
    b.onmouseleave = () => (b.style.background = "#333");
    b.onclick = onClick;
    return b;
  }

  function makeNumber(label, value, min, max, step, onChange, disabled = false) {
    const wrap = el("label");
    wrap.style.display = "inline-flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";
    wrap.style.padding = "6px 10px";
    wrap.style.borderRadius = "10px";
    wrap.style.background = "#1a1a1a";
    wrap.style.boxShadow = "inset 0 0 0 2px #333";

    const span = el("span", { text: label });
    span.style.fontSize = "12px";
    span.style.opacity = "0.8";

    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value);
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.style.width = "90px";
    input.style.background = "transparent";
    input.style.color = "#eee";
    input.style.border = "none";
    input.style.outline = "none";
    input.disabled = !!disabled;

    if (onChange && !disabled) {
      input.addEventListener("change", () => {
        const v = Number(input.value);
        if (Number.isFinite(v)) onChange(clamp(v, min, max));
      });
    }

    wrap.append(span, input);
    return wrap;
  }

  function toast(message, ms = 1200) {
    const t = el("div", { text: message });
    t.style.position = "fixed";
    t.style.bottom = "18px";
    t.style.left = "50%";
    t.style.transform = "translateX(-50%)";
    t.style.background = "#222";
    t.style.color = "#eee";
    t.style.padding = "10px 14px";
    t.style.borderRadius = "10px";
    t.style.boxShadow = "0 6px 24px rgba(0,0,0,.35), inset 0 0 0 2px #444";
    t.style.fontSize = "14px";
    t.style.opacity = "0";
    t.style.transition = "opacity .15s ease";
    document.body.appendChild(t);
    requestAnimationFrame(() => (t.style.opacity = "1"));
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 200);
    }, ms);
  }

})();
