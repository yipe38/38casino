export class MinesUI {
  constructor(root, game, bus) {
    this.root = root;
    this.game = game;
    this.bus = bus;
    this.cells = [];
    this.onReveal = this.onReveal.bind(this);
    this.onFlag = this.onFlag.bind(this);
    this.onNewRound = this.onNewRound.bind(this);
    this.onBoom = this.onBoom.bind(this);

    this.renderBoard();
    this.attach();
  }

  renderBoard() {
    this.root.innerHTML = '';
    this.root.style.gridTemplateColumns = `repeat(${this.game.cols}, 1fr)`;
    this.cells = new Array(this.game.total).fill(null).map((_, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Feld aufdecken');
      btn.addEventListener('click', () => this.game.reveal(i));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.game.toggleFlag(i);
      });
      btn.innerHTML = '<span class="icon">?</span>';
      cell.appendChild(btn);
      this.root.appendChild(cell);
      return cell;
    });
  }

  attach() {
    this.bus.on('reveal', this.onReveal);
    this.bus.on('flag', this.onFlag);
    this.bus.on('newRound', this.onNewRound);
    this.bus.on('boom', this.onBoom);
    this.bus.on('layout', () => {
      // could show a subtle ready state if needed
    });
  }

  onReveal({ index, bomb }) {
    const cell = this.cells[index];
    if (!cell) return;
    cell.classList.add('revealed');
    const btn = cell.querySelector('button');
    if (bomb) {
      cell.classList.add('bomb');
      btn.innerHTML = '<span class="icon bomb">💣</span>';
    } else {
      cell.classList.add('safe');
      btn.innerHTML = '<span class="icon safe">◆</span>';
    }
  }

  onFlag({ index, flagged }) {
    const cell = this.cells[index];
    if (!cell || cell.classList.contains('revealed')) return;
    cell.classList.toggle('flagged', flagged);
    const btn = cell.querySelector('button');
    btn.innerHTML = flagged ? '<span class="icon flag">⚑</span>' : '<span class="icon">?</span>';
  }

  onNewRound() {
    this.cells.forEach((cell) => {
      cell.className = 'cell';
      const btn = cell.querySelector('button');
      if (btn) btn.innerHTML = '<span class="icon">?</span>';
    });
  }

  onBoom() {
    // reveal all bombs
    if (!this.game || !this.cells?.length) return;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.game.bombs.has(i)) {
        const cell = this.cells[i];
        if (!cell.classList.contains('revealed')) {
          cell.classList.add('revealed', 'bomb');
          const btn = cell.querySelector('button');
          btn.innerHTML = '<span class="icon bomb">💣</span>';
        }
      }
    }
  }

  destroy() {
    // no-op for now
  }
}
