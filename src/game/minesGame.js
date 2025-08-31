import { chooseBombPositions, fairMultiplier } from '../utils/random.js';

export class MinesGame {
  constructor(config, bus, pfHelper, pfSeeds) {
    this.bus = bus;
    this.pfHelper = pfHelper;
    this.setConfig(config);
    this.reset(pfSeeds);
  }

  setConfig(config) {
    this.rows = config.rows;
    this.cols = config.cols;
    this.total = this.rows * this.cols;
    this.bombCount = Math.min(config.bombs, this.total - 1);
    this.edgePct = config.edgePct ?? 0;
  }

  setEdge(edgePct) {
    this.edgePct = edgePct;
  }

  reset(pfSeeds) {
    this.revealed = new Set();
    this.flags = new Set();
    this.hits = 0;
    this.isOver = false;
    this.bombs = new Set();
    // initial layout via provably fair helper (deterministic) or random fallback
    this.pfSeeds = pfSeeds || this.pfSeeds || {serverSeed:'demo',clientSeed:'demo',nonce:0};
    chooseBombPositions(this.rows, this.cols, this.bombCount, this.pfHelper, this.pfSeeds).then(set => {
      this.bombs = set;
      this.bus.emit('layout', this.bombs);
    });
  }

  index(r, c) { return r * this.cols + c; }
  coords(i) { return [Math.floor(i / this.cols), i % this.cols]; }

  async startRound() {
    this.isOver = false;
    this.hits = 0;
    this.revealed.clear();
    this.flags.clear();
    this.bus.emit('newRound');
  }

  endRound(cashedOut=false) {
    this.isOver = true;
    this.bus.emit('roundOver', { cashedOut });
  }

  rerollWithSeeds(pfSeeds) {
    this.pfSeeds = pfSeeds;
    this.reset(pfSeeds);
    this.bus.emit('newRound');
  }

  getMultiplier() {
    const k = this.hits;
    const n = this.total;
    const b = this.bombCount;
    const edge = this.edgePct / 100;
    const mFair = fairMultiplier(n, b, k);
    return mFair * (1 - edge);
  }

  getCashoutValue(bet) {
    if (this.hits <= 0) return 0;
    return bet * this.getMultiplier();
  }

  toggleFlag(i) {
    if (this.isOver || this.revealed.has(i)) return;
    if (this.flags.has(i)) this.flags.delete(i);
    else this.flags.add(i);
    this.bus.emit('flag', { index: i, flagged: this.flags.has(i) });
  }

  reveal(i) {
    if (this.isOver || this.revealed.has(i) || this.flags.has(i)) return;
    this.revealed.add(i);

    if (this.bombs.has(i)) {
      // boom
      this.isOver = true;
      this.bus.emit('reveal', { index: i, bomb: true });
      this.bus.emit('boom', { index: i });
      this.bus.emit('roundOver', { cashedOut: false });
      return;
    }

    this.hits += 1;
    this.bus.emit('reveal', { index: i, bomb: false });

    // optional auto-win condition if all safes revealed
    if (this.hits === (this.total - this.bombCount)) {
      this.endRound(true);
    }
  }

  destroy() {
    // placeholder for future cleanups (timers, etc.)
  }
}
