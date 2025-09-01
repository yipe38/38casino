export function newRound(boardEl, size, bombs, onUpdate) {
  const total = size * size;
  const cells = Array.from({ length: total }, () => ({ bomb: false, open: false }));
  const bombIdx = pickBombs(total, bombs);
  bombIdx.forEach(i => (cells[i].bomb = true));

  boardEl.replaceChildren();
  boardEl.dataset.size = size;

  cells.forEach((cell, i) => {
    const btn = document.createElement('button');
    btn.className = 'cell hidden';
    btn.dataset.idx = i;
    btn.addEventListener('click', () => reveal(i));
    boardEl.appendChild(btn);
  });

  let hits = 0, ended = false;

  function reveal(i) {
    if (ended) return;
    const cell = cells[i];
    const btn = boardEl.querySelector(`.cell[data-idx="${i}"]`);
    if (!btn || !btn.classList.contains('hidden')) return;

    btn.classList.remove('hidden');
    cell.open = true;

    if (cell.bomb) {
      btn.classList.add('bomb');
      btn.textContent = '💣';
      ended = true;
      onUpdate({ hits, multiplier: 0, ended, busted: true });
      return;
    }

    hits++;
    const adj = countAdjBombs(i, size, cells);
    if (adj > 0) btn.textContent = adj;
    btn.classList.add('safe');

    const multiplier = 1 + (hits * (bombs / size));
    onUpdate({ hits, multiplier, ended: false, busted: false });
  }

  return {
    openAll: () => {
      cells.forEach((c, j) => {
        const b = boardEl.querySelector(`.cell[data-idx="${j}"]`);
        if (!b) return;
        b.classList.remove('hidden');
        if (c.bomb) {
          b.classList.add('bomb');
          b.textContent = '💣';
        } else {
          b.classList.add('safe');
        }
      });
    }
  };
}

function pickBombs(total, bombs) {
  const set = new Set();
  while (set.size < bombs) set.add(Math.floor(Math.random() * total));
  return [...set];
}

function countAdjBombs(i, size, cells) {
  const r = Math.floor(i / size), c = i % size;
  let cnt = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      if (cells[rr * size + cc].bomb) cnt++;
    }
  }
  return cnt;
}
