'use client';
// Nur für lokale Tests (NEXT_PUBLIC_MOCK=1): simuliert Supabase Realtime zwischen Browser-Tabs.
class MockChannel {
  constructor(name, opts) {
    this.name = name;
    this.key = opts?.config?.presence?.key || String(Math.random());
    this.handlers = [];
    this.peers = {};
    this.me = null;
    this.bc = new BroadcastChannel('mock-' + name);
    this.bc.onmessage = (e) => this._recv(e.data);
  }
  on(type, filter, cb) { this.handlers.push({ type, event: filter.event, cb }); return this; }
  _emit(type, event, arg) { this.handlers.filter((h) => h.type === type && h.event === event).forEach((h) => h.cb(arg)); }
  _recv(m) {
    if (m.kind === 'bc') this._emit('broadcast', m.event, { payload: m.payload });
    if (m.kind === 'pres') {
      const isNew = !this.peers[m.key];
      this.peers[m.key] = { meta: m.meta, at: Date.now() };
      if (isNew && this.me) this.bc.postMessage({ kind: 'pres', key: this.key, meta: this.me });
      this._emit('presence', 'sync');
    }
    if (m.kind === 'leave') { delete this.peers[m.key]; this._emit('presence', 'sync'); }
  }
  subscribe(cb) {
    setTimeout(() => cb('SUBSCRIBED'), 50);
    this.hb = setInterval(() => {
      if (this.me) this.bc.postMessage({ kind: 'pres', key: this.key, meta: this.me });
      const now = Date.now();
      let ch = false;
      for (const k of Object.keys(this.peers)) if (now - this.peers[k].at > 3500) { delete this.peers[k]; ch = true; }
      if (ch) this._emit('presence', 'sync');
    }, 1000);
    this.unload = () => this.bc.postMessage({ kind: 'leave', key: this.key });
    window.addEventListener('pagehide', this.unload);
    return this;
  }
  async track(meta) { this.me = meta; this.bc.postMessage({ kind: 'pres', key: this.key, meta }); this._emit('presence', 'sync'); }
  presenceState() {
    const st = {};
    for (const [k, v] of Object.entries(this.peers)) st[k] = [v.meta];
    if (this.me) st[this.key] = [this.me];
    return st;
  }
  send({ event, payload }) { this.bc.postMessage({ kind: 'bc', event, payload: JSON.parse(JSON.stringify(payload)) }); return Promise.resolve('ok'); }
  _close() { clearInterval(this.hb); this.unload && this.unload(); window.removeEventListener('pagehide', this.unload); this.bc.close(); }
}
export const mockClient = {
  channel: (name, opts) => new MockChannel(name, opts),
  removeChannel: (ch) => ch._close(),
};
