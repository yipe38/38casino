// src/mines.js
// Casino-Style Mines: pure Glück/Pech (keine Zahlen/Hinweise)
// Fairer Multiplikator wächst pro Safe als 1/pSafe; House-Edge pro Pick optional.
// -> HOUSE_EDGE_PER_PICK = 1.00  (fair)
// -> < 1.00 = Hausvorteil (z.B. 0.99 = ~1% Edge pro Safe)

const HOUSE_EDGE_PER_PICK = 0.98; // 2% Edge pro erfolgreichem Pick; setz auf 1.00 für fair

export function newRound(boardEl, size, bombs, onUpdate) {
  const total = size * size;
  const safesTotal = total - bombs;

  // State
  const cells = Array.from({ length: total }, () => ({ bomb: false, open: false }));
  const bombIdx = pickBombs(total, bombs);
  bombIdx.forEach(i => (cells[i].bomb = true));

  // Render
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
  let multiplier = 1.0;        // Start bei 1.00x
  let ended = false;

  // Wahrscheinlichkeiten
  let remainingTotal = total;
  let remainingSafes = safesTotal;

  emit();

  function reveal(i) {
    if (ended) return;

    const cell = cells[i];
    const btn = boardEl.querySelector(`.cell[data-idx="${i}"]`);
    if (!btn || !btn.classList.contains('hidden')) return;

    // pSafe vor dem Öffnen berechnen
    const pSafe = remainingSafes / remainingTotal; // Überlebenswahrscheinlichkeit dieses Klicks

    // Feld öffnen
    btn.classList.remove('hidden');
    cell.open = true;
    remainingTotal -= 1;

    if (cell.bomb) {
      // BUST
      btn.classList.add('bomb');
      btn.textContent = '💣';
      ended = true;
      showAllBombs();
      onUpdate({ hits, multiplier: 0, ended: true, busted: true });
      return;
    }

    // SAFE (keine Hinweise/Zahlen)
    hits += 1;
    remainingSafes -= 1;
    btn.classList.add('safe');

    // KORREKT: Multi wächst um 1/pSafe (und Edge pro Pick)
    // -> kompensiert die Überlebenswahrscheinlichkeit und lässt den Auszahlungsfaktor steigen
    multiplier = multiplier * (1 / pSafe) * HOUSE_EDGE_PER_PICK;

    emit();
  }

  function emit() {
    // fürs HUD nur hübsch runden; intern behalten wir volle Präzision
    onUpdate({ hits, multiplier: +multiplier.toFixed(2), ended: false, busted: false });
  }

  function showAllBombs() {
    cells.forEach((c, j) => {
      const b = boardEl.querySelector(`.cell[data-idx="${j}"]`);
      if (!b) return;
      if (b.classList.contains('hidden')) b.classList.remove('hidden');
      if (c.bomb) {
        b.classList.add('bomb');
        b.textContent = '💣';
      } else {
        b.classList.add('safe');
      }
    });
  }

  return {
    openAll: () => {
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
