export class EventBus {
  constructor() { this.map = new Map(); }
  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
  }
  off(evt, fn) {
    const set = this.map.get(evt);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) this.map.delete(evt);
  }
  emit(evt, payload) {
    const set = this.map.get(evt);
    if (!set) return;
    for (const fn of set) try { fn(payload); } catch (e) { console.error(e); }
  }
}
