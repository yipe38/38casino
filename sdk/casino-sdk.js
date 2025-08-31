// sdk/casino-sdk.js
(function (global) {
  const CASINO_EVENT = 'casino:event';
  const CASINO_VERSION = '1.0.0';

  function postToParent(type, payload = {}) {
    if (!window.parent || window.parent === window) return;
    window.parent.postMessage({ kind: CASINO_EVENT, version: CASINO_VERSION, type, payload }, '*');
  }

  const Casino = {
    version: CASINO_VERSION,

    // Games rufen das, wenn eine Auszahlung stattfinden soll:
    cashout(amount) {
      postToParent('cashout', { amount });
    },

    // Optionale FX aus dem Parent anfordern:
    fxGlow(durationMs = 700) {
      postToParent('fx:glow', { durationMs });
    },

    // Balance abfragen (Antwort kommt asynchron per message):
    getBalance() {
      postToParent('getBalance');
    },

    // Info-Events (optional):
    win(meta = {}) { postToParent('win', meta); },
    lose(meta = {}) { postToParent('lose', meta); }
  };

  // global bereitstellen
  global.Casino = Casino;
})(window);
