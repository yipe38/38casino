// Wallet / Guthaben-Logik
let balance = parseInt(localStorage.getItem("casino_balance")) || 1000;
const balanceEl = document.getElementById("balance");
updateBalance();

// Balance aktualisieren
function updateBalance() {
  balanceEl.textContent = balance;
  localStorage.setItem("casino_balance", balance);
}

// Balance verändern (z. B. nach Gewinn/Verlust)
function changeBalance(amount) {
  balance += amount;
  if (balance < 0) balance = 0;
  updateBalance();
}

// Game Loader
function loadGame(game) {
  const container = document.getElementById("game-container");

  if (game === "mines") {
    container.innerHTML = `<h2>Mines 💣</h2><div id="mines-board"></div>`;
    import("./games/mines.js").then(module => {
      module.initMinesGame(changeBalance);
    });
  } else {
    container.innerHTML = `<p>🚧 ${game} ist noch nicht verfügbar.</p>`;
  }
}
