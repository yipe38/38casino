// src/mines.js
// Glück/Pech Mines – ohne Hinweise/Zahlen, nur Safe vs. Bombe.
// Multiplikator wächst fair nach Wahrscheinlichkeit * House Edge.
//
// onUpdate({ hits, multiplier, ended, busted }) wird nach jedem Klick aufgerufen.
// Rückgabe: { openAll() } zum Aufdecken am Rundenende (z. B. bei Cashout).

const HOUSE_EDGE = 0.98; // 2% Hausvorteil pro Safe-Pick (1.00 = fair, <1.00 = Edge für Casino)

export function newRound(boardEl, size, bombs, onUpdate) {
  const total = size * size;
  const safesTotal = total - bombs;

  // State
  const cells = Array.from({ length: total }, () => ({ bomb: false, open: false }));
  const bombIdx = pickBombs(total, bombs);
  bombIdx.forEach(i => (cells[i].bomb = true));

  // Render Board
  boardEl.replaceChildren();
  boardEl.dataset.size = String(size);

  for (let i = 0; i < total; i++) {
    const btn = document.createElement('button');
    btn.className = 'cell hidden';
    btn.dataset.idx = i;
    btn.addEventListener('click', () => reveal(i));
    boardEl.appendChild(btn);
  }

  // Laufende Variablen
  let hits = 0;
  let multiplier = 1.0;
  let ended = false;

  // Für Wahrscheinlichkeiten
  let remainingTotal = total;
  let remainingSafes = safesTotal;

  // Initiales HUD
  onUpdate({ hits, multiplier, ended: false, busted: false });

  function reveal(i) {
    if (ended) return;

    const cell = cells[i];
    const btn = boardEl.querySelector(`.cell[data-idx="${i}"]`);
    if (!btn || !btn.classList.contains('hidden')) return;

    // VOR dem Öffnen die Safe-Wahrscheinlichkeit bestimmen:
    const pSafe = remainingSafes / remainingTotal; // Wahrscheinlichkeit, dass dieses Feld safe ist

    // Feld öffnen
    btn.classList.remove('hidden');
    cell.open = true;

    // Zähler VOR Anpassung verwenden (oben getan), danach updaten
    remainingTotal -= 1;

    if (cell.bomb) {
      // BOOM – Runde vorbei
      btn.classList.add('bomb');
      btn.textContent = '💣';
      ended = true;
      showAllBombs();
      onUpdate({ hits, multiplier: 0, ended: true, busted: true });
      return;
    }

    // Safe: kein Hinweis/keine Zahl – nur Farbe
    hits += 1;
    remainingSafes -= 1;

    btn.classList.add('safe'); // bewusst ohne Text/Zahl

    // Multiplikator fortschreiben (fair * House Edge)
    multiplier = +(multiplier * pSafe * HOUSE_EDGE).toFixed(2);
    if (multiplier < 1 && hits === 1) {
      // Falls niedrige Edge & viele Bomben → runde optisch auf 1.00 beim ersten Hit
      multiplier = Math.max(1.0, multiplier);
    }

    onUpdate({ hits, multiplier, ended: false, busted: false });
  }

  function showAllBombs() {
    cells.forEach((c, j) => {
      if (c.bomb) {
        const b = boardEl.querySelector(`.cell[data-idx="${j}"]`);
        if (!b) return;
        if (b.classList.contains('hidden')) b.classList.remove('hidden');
        b.classList.add('bomb');
        b.textContent = '💣';
      }
    });
  }

  return {
    openAll: () => {
      // Zum Cashout: alle Felder visualisieren (ohne Zahlen)
      cells.forEach((c, j) => {
        const b = boardEl.querySelector(`.cell[data-idx="${j}"]`);
        if (!b) return;
        if (b.classList.contains('hidden')) b.classList.remove('hidden');
        b.classList.add(c.bomb ? 'bomb' : 'safe');
        if (c.bomb) b.textContent = '💣';
      });
    }
  };
}

/* Helpers */
function pickBombs(total, bombs) {
  const set = new Set();
  while (set.size < bombs) set.add(Math.floor(Math.random() * total));
  return [...set];
}
