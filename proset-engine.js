const SUITS = [
    { symbol: "♣", mask: 0 << 4, isRed: false },
    { symbol: "♦", mask: 1 << 4, isRed: true },
    { symbol: "♥", mask: 2 << 4, isRed: true },
    { symbol: "♠", mask: 3 << 4, isRed: false },
];
const RANKS = [
    "",
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
];

let deck = [];
let table = [];
let selectedIndices = [];
let startTime = null;
let timerInterval = null;
let isGameOver = false;

let hotkeys = ["1", "2", "3", "4", "5", "6", "7"];

function initDeck() {
    deck = [];
    for (let s = 0; s < 4; s++) {
        for (let r = 1; r <= 13; r++) {
            deck.push({
                rank: RANKS[r],
                suit: SUITS[s],
                vectorValue: SUITS[s].mask | r,
            });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function resetGame() {
    clearInterval(timerInterval);
    initDeck();
    table = [];
    selectedIndices = [];
    isGameOver = false;
    startTime = null;
    document.getElementById("game-timer").innerText = "Time: 00:00";
    document.getElementById("deck-count").innerText = "Deck: 52";

    for (let i = 0; i < 7; i++) {
        if (deck.length > 0) table.push(deck.pop());
    }
    renderTable();
    renderLeaderboard();
    renderHotkeyConfig();
    showStatus("Game ready.", "#666");
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const diff = Date.now() - startTime;
        const m = String(Math.floor(diff / 60000)).padStart(2, "0");
        const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        document.getElementById("game-timer").innerText = `Time: ${m}:${s}`;
    }, 1000);
}

function renderTable() {
    const rowTop = document.getElementById("row-top");
    const rowBottom = document.getElementById("row-bottom");

    rowTop.innerHTML = "";
    rowBottom.innerHTML = "";

    document.getElementById("deck-count").innerText = `Deck: ${deck.length}`;

    table.forEach((card, index) => {
        const cardDiv = document.createElement("div");
        const isSelected = selectedIndices.includes(index);

        cardDiv.style.background = isSelected ? "#f4f7fb" : "#fff";
        cardDiv.style.border = isSelected
            ? "2px solid #2b4c7e"
            : "2px solid #e1e5eb";
        cardDiv.style.borderRadius = "8px";
        cardDiv.style.width = "100px";
        cardDiv.style.height = "140px";
        cardDiv.style.padding = "12px";
        cardDiv.style.cursor = "pointer";
        cardDiv.style.display = "flex";
        cardDiv.style.flexDirection = "column";
        cardDiv.style.justifyContent = "space-between";
        cardDiv.style.position = "relative";
        cardDiv.style.userSelect = "none";

        if (card.suit.isRed) {
            cardDiv.style.color = "#ff5a5f";
        } else {
            cardDiv.style.color = "#2c3038";
        }
        cardDiv.onclick = () => toggleCard(index);

        cardDiv.innerHTML = `
            <div style="font-size: 1.2em; font-weight: bold;
                         line-height: 1.1;">
                ${card.rank}<br>${card.suit.symbol}
            </div>
            <div style="font-size: 2.2em; align-self: center;
                         margin-bottom: 5px;">
                ${card.suit.symbol}
            </div>
            <div style="position: absolute; bottom: 4px; right: 6px;
                         font-size: 0.75em; font-family: monospace;
                         color: #888;">
                [${hotkeys[index].toUpperCase()}]
            </div>
        `;

        if (index < 4) {
            rowTop.appendChild(cardDiv);
        } else {
            rowBottom.appendChild(cardDiv);
        }
    });
}

function renderHotkeyConfig() {
    const container = document.getElementById("hotkey-config");
    container.innerHTML = "";
    hotkeys.forEach((key, index) => {
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex; align-items:center; gap:5px;";
        wrap.innerHTML = `
            <span style="font-size:0.9em;">Card ${index + 1}:</span>
            <input type="text" class="key-input" value="${key.toUpperCase()}"
                   readonly onclick="rebindKey(this, ${index})">
        `;
        container.appendChild(wrap);
    });
}

function rebindKey(inputEl, index) {
    inputEl.value = "...";
    const handler = (e) => {
        e.preventDefault();
        const pressed = e.key.toLowerCase();
        if (pressed !== "enter" && pressed !== " ") {
            hotkeys[index] = pressed;
        }
        window.removeEventListener("keydown", handler);
        renderHotkeyConfig();
        renderTable();
    };
    window.addEventListener("keydown", handler);
}

function toggleCard(index) {
    if (isGameOver) return;
    if (!startTime) startTimer();

    const pos = selectedIndices.indexOf(index);
    if (pos > -1) {
        selectedIndices.splice(pos, 1);
    } else {
        selectedIndices.push(index);
    }
    renderTable();
    autoValidate();
}

function autoValidate() {
    if (selectedIndices.length === 0) {
        showStatus("Select cards to begin.", "#666");
        return;
    }

    const xorSum = selectedIndices.reduce(
        (acc, idx) => acc ^ table[idx].vectorValue,
        0,
    );

    if (xorSum === 0) {
        showStatus("Valid Proset cleared!", "#00a699");

        selectedIndices
            .sort((a, b) => b - a)
            .forEach((idx) => {
                if (deck.length > 0) {
                    table[idx] = deck.pop();
                } else {
                    table.splice(idx, 1);
                }
            });

        selectedIndices = [];

        setTimeout(() => {
            renderTable();
            showStatus("Cards replaced. Keep going!", "#666");
        }, 300);

        if (table.length === 0) {
            clearInterval(timerInterval);
            isGameOver = true;
            const fTime = document
                .getElementById("game-timer")
                .innerText.replace("Time: ", "");
            showStatus(`Cleared in ${fTime}!`, "#00a699");
            saveScore(fTime);
        }
    } else {
        showStatus(`${selectedIndices.length} cards active...`, "#2b4c7e");
    }
}

function saveScore(timeStr) {
    let scores = JSON.parse(localStorage.getItem("proset_scores") || "[]");
    scores.push(timeStr);
    scores.sort().splice(5);
    localStorage.setItem("proset_scores", JSON.stringify(scores));
    renderLeaderboard();
}

function renderLeaderboard() {
    const scores = JSON.parse(localStorage.getItem("proset_scores") || "[]");
    const list = document.getElementById("leaderboard");

    if (scores.length === 0) {
        list.innerHTML = '<li style="color:#888;">No records logged yet.</li>';
        return;
    }

    list.innerHTML = scores.map((s) => `<li>${s}</li>`).join("");
}

function showStatus(msg, color) {
    const status = document.getElementById("status");
    status.innerText = msg;
    status.style.color = color;
}

window.addEventListener("keydown", (e) => {
    if (document.activeElement.tagName === "INPUT") return;

    const pressedKey = e.key.toLowerCase();
    const targetIdx = hotkeys.indexOf(pressedKey);

    if (targetIdx > -1 && targetIdx < table.length) {
        toggleCard(targetIdx);
    }
});

resetGame();
