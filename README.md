# Casino38 • Mines (Standalone MVP)

Ein leichtgewichtiges, erweiterbares **Mines**-Spiel als Startpunkt. Läuft komplett lokal im Browser (kein Build, kein Backend).

## Quick Start
1. ZIP entpacken
2. `index.html` im Browser öffnen

## Features
- Grid 5×5 / 6×6 / 7×7
- Bombenanzahl variabel
- Einsatz, Chips (+0.5/+1/+5/+10), ½, 2×, Clear
- Fairer Multiplikator (kombinatorisch) + konfigurierbare **House Edge**
- **Cashout** mit grünem **Screen-Pulse**
- Rechtsklick zum **Flaggen**
- **Provably Fair** (Demo): deterministisches Layout aus Server-/Client-Seed + Nonce

## Architektur
- `src/game/minesGame.js`: Spiel-Logik, Zustände, Events
- `src/ui/minesUI.js`: Rendering der Zellen + Interaktion
- `src/utils/*`: EventBus, Provably Fair, RNG/Multiplikator
- `assets/style.css`: Styles
- `index.html`: UI & Controls; `src/main.js` wired alles zusammen

### Erweiterungspunkte
- Wallet/API: Balance-Änderungen an API binden (statt lokal)
- Auth: Login-Overlay ergänzen
- Mehr Spiele: Weitere Ordner unter `src/game/*`, `src/ui/*`
- Server-Commitment: `hash(serverSeed)` beim Rundenstart anzeigen; nach Runde `serverSeed` veröffentlichen

## Lizenz
Nur für Demo-/Lernzwecke.
