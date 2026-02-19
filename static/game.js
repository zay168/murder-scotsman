const socket = io();

// State
let myId = null;
let currentRoll = 0;
let myRole = "";

// Element Refs
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const statusMsg = document.getElementById('status-message');
const btnStart = document.getElementById('btn-start');
const btnRoll = document.getElementById('btn-roll');
const playerList = document.getElementById('player-list');
const gameLog = document.getElementById('game-log');
const stationsDisplay = document.getElementById('stations-display');
const questionModal = document.getElementById('question-modal');
const optionsGrid = document.getElementById('q-options');
const qText = document.getElementById('q-text');

// Stations Data for visualization
const STATIONS = ["Edinburgh", "Berwick", "Newcastle", "Durham", "Darlington", "York", "Leeds", "Sheffield", "Doncaster", "Grantham", "Peterborough", "Stevenage", "London"];

// --- Setup ---
function initTrack() {
    stationsDisplay.innerHTML = ''; // Clear
    STATIONS.forEach((city, index) => {
        const div = document.createElement('div');
        div.className = 'station';
        div.style.left = `${(index / (STATIONS.length - 1)) * 100}%`;

        const label = document.createElement('div');
        label.className = 'station-label';
        label.innerText = city;
        div.appendChild(label);

        stationsDisplay.appendChild(div);
    });
}
initTrack();

// --- Socket Handlers ---

socket.on('connect', () => {
    console.log("Socket connected with ID:", socket.id);
    document.querySelector('.server-status').innerText = "Connected to Server";
});

socket.on('join_success', (data) => {
    myId = data.my_id;
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    addToLog("You have boarded the train.");
});

socket.on('update_state', (state) => {
    renderPlayers(state.players);
    renderLog(state.log);

    // Check game started
    if (!state.game_started) {
        if (state.winner) {
            document.getElementById('game-over-modal').classList.remove('hidden');
            document.getElementById('winner-display').innerText = `Winner: ${state.winner}`;

            // KILLER VICTORY SEQUENCE
            if (state.winner === "Le Tueur") {
                playKillerVictory();
                // Add visual overlay
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.backgroundColor = 'black';
                overlay.style.color = 'red';
                overlay.style.display = 'flex';
                overlay.style.flexDirection = 'column';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                overlay.style.zIndex = '9999';
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 2s';

                overlay.innerHTML = `<h1 style="font-size: 5rem; font-family: 'Courier Prime'; text-shadow: 0 0 10px red;">LE TUEUR S'ÉCHAPPE</h1>`;

                document.body.appendChild(overlay);

                // Trigger Fade In
                setTimeout(() => {
                    overlay.style.opacity = '1';
                }, 100);
            }
        } else {
            // LOBBY LOGIC
            const players = Object.values(state.players);
            const allReady = players.length >= 2 && players.every(p => p.is_ready);
            const amIReady = state.players[myId] && state.players[myId].is_ready;

            statusMsg.innerText = allReady ? "Tous les passagers sont prêts !" : "En attente que tout le monde soit prêt...";

            // Ready Button Logic
            const readyBtn = document.getElementById('btn-ready');
            if (readyBtn) {
                readyBtn.style.display = 'inline-block';
                readyBtn.innerText = amIReady ? "✅ PRÊT (ATTENDRE)" : "SE PRÉPARER";
                readyBtn.style.backgroundColor = amIReady ? "#4caf50" : "#d4af37";
            }

            // Start Button Logic
            if (allReady) {
                btnStart.classList.remove('hidden');
            } else {
                btnStart.classList.add('hidden');
            }
        }
    } else {
        // GAME LOGIC
        btnStart.classList.add('hidden');
        const readyBtn = document.getElementById('btn-ready');
        if (readyBtn) readyBtn.style.display = 'none';

        if (state.current_turn) {
            const turnPlayer = state.players[state.current_turn];
            if (turnPlayer) {
                statusMsg.innerText = `Tour actuel : ${turnPlayer.name}`;
            }
        }
    }
});

socket.on('game_over', (data) => {
    // Backup handler to ensure victory sequence runs
    if (data.winner === "Le Tueur") {
        playKillerVictory();

        // Add visual overlay if not already present
        if (!document.querySelector('.killer-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'killer-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'black';
            overlay.style.color = 'red';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '9999';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 2s';

            overlay.innerHTML = `<h1 style="font-size: 5rem; font-family: 'Courier Prime'; text-shadow: 0 0 10px red;">LE TUEUR S'ÉCHAPPE</h1>`;

            document.body.appendChild(overlay);

            // Trigger Fade In
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 100);
        }
    }
});

socket.on('role_assigned', (data) => {
    myRole = data.role;
    document.getElementById('my-role').innerText = `Role: ${myRole}`;
    addToLog(`You are the ${myRole}. Check your objectives.`);
});

socket.on('your_turn', (data) => {
    if (data.player_id === myId) {
        statusMsg.innerText = "YOUR TURN! Roll the dice.";
        btnRoll.classList.remove('hidden');
    }
});

socket.on('dice_rolled', (data) => {
    addToLog(`${data.player} rolled a ${data.roll}.`);
});

socket.on('spectator_mode', (state) => {
    // Enable Visuals
    document.body.classList.add('spectator-theme');

    // Hide Lobby, Show Game
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    // Set text
    document.getElementById('my-role').innerText = "OBSERVER";
    statusMsg.innerText = "/// RECEIVING TRANSMISSION ///";

    // Disable Controls
    btnStart.classList.add('hidden');
    btnRoll.classList.add('hidden');
    const actions = document.getElementById('actions');
    if (actions) actions.innerHTML = ''; // Clear buttons

    // Initial Render
    renderPlayers(state.players);
    renderLog(state.log);
});

socket.on('question_phase', (data) => {
    currentRoll = data.roll;
    btnRoll.classList.add('hidden');
    showQuestion(data.question);
});

socket.on('action_phase', (data) => {
    // Show Action Buttons based on Role
    // Reset buttons first
    const actionContainer = document.getElementById('actions');
    // Clear dynamic buttons (keep roll/start)
    Array.from(actionContainer.querySelectorAll('.dynamic-btn')).forEach(btn => btn.remove());

    const moveBtn = document.createElement('button');
    moveBtn.className = 'dynamic-btn';
    moveBtn.innerText = `MOVE ${data.roll} SPACES`;
    moveBtn.onclick = () => {
        socket.emit('perform_move', { steps: data.roll });
        clearDynamicButtons();
    };
    actionContainer.appendChild(moveBtn);

    // SABOTAGE (Killer Only)
    if (myRole === 'Killer') {
        const sabBtn = document.createElement('button');
        sabBtn.className = 'dynamic-btn';
        sabBtn.innerText = "SABOTAGE (Move Player Back)";
        sabBtn.style.color = "red";
        sabBtn.style.borderColor = "red";
        sabBtn.onclick = () => {
            // Simple prompt for target ID for now (or a modal selection)
            // Ideally we show a list of players to select
            const targetName = prompt("Enter the NAME of the player to Sabotage:");
            // Find ID by name
            // Note: In a real app we'd likely pass player list to a modal selection
            // We need access to the player list... let's rely on the DOM for now or global state?
            // Let's use a simpler approach: Show buttons for each other player
            showPlayerSelectionForSabotage();
        };
        actionContainer.appendChild(sabBtn);
    }

    // ACCUSE (Detective Only - Once per game)
    // Note: Accusation logic is usually separate from movement turn, but let's allow it during action phase
    if (myRole === 'Detective') {
        const accuseBtn = document.createElement('button');
        accuseBtn.className = 'dynamic-btn';
        accuseBtn.innerText = "ACCUSE SOMEONE";
        accuseBtn.style.color = "cyan";
        accuseBtn.onclick = () => {
            showPlayerSelectionForAccuse();
        }
        actionContainer.appendChild(accuseBtn);
    }
});

socket.on('game_log', (data) => {
    // Handled in update_state usually, but if separate event:
    // addToLog(data.message);
});

socket.on('game_over', (data) => {
    // Handled in update_state
});

// --- Actions ---

function joinGame() {
    console.log("Join button clicked!");
    const name = document.getElementById('player-name').value;
    if (name) {
        console.log("Emitting join_game for name:", name);
        socket.emit('join_game', { name: name });
    } else {
        console.warn("No name entered!");
    }
}

function startGame() {
    socket.emit('start_game');
}

function rollDice() {
    socket.emit('roll_dice');
}

// --- Helper UI Functions ---

function addToLog(msg) {
    // const p = document.createElement('div');
    // p.innerText = `> ${msg}`;
    // gameLog.appendChild(p);
    // gameLog.scrollTop = gameLog.scrollHeight;
    // Handled by renderLog from state now mainly
}

function renderLog(logs) {
    gameLog.innerHTML = '';
    logs.forEach(msg => {
        const p = document.createElement('div');
        p.innerText = `> ${msg}`;
        gameLog.appendChild(p);
    });
    gameLog.scrollTop = gameLog.scrollHeight;
}

function renderPlayers(playersWrapper) {
    // playersWrapper is {id: PlayerObj}
    playerList.innerHTML = '';

    // Clear old tokens from track
    document.querySelectorAll('.player-token').forEach(el => el.remove());

    Object.values(playersWrapper).forEach(p => {
        // List Item
        const div = document.createElement('div');
        div.innerText = `${p.name} [${p.station_name}] ${p.is_frozen ? '(FROZEN)' : ''}`;
        div.style.color = (p.id === myId) ? 'var(--gold)' : 'var(--text-color)';
        playerList.appendChild(div);

        // Map Token
        const token = document.createElement('div');
        token.className = 'player-token';
        token.title = p.name;
        token.style.backgroundColor = stringToColor(p.name); // Unique color per player name

        // Calculate Position %
        // 8 stations .. 0 to 7
        // left % = (pos / 7) * 100
        const pct = (p.position / (STATIONS.length - 1)) * 100;
        token.style.left = `${pct}%`;

        // Stagger vertical play tokens if same spot (simple hack)
        // We can't easily detect collisions without more logic, just random offset 
        // to avoid exact overlap
        // const offset = (parseInt(p.id.substring(0, 2), 16) % 20) - 10;
        // token.style.marginTop = `${offset}px`;

        stationsDisplay.appendChild(token);
    });
}

function showQuestion(qData) {
    qText.innerText = qData.q;
    optionsGrid.innerHTML = '';

    // Shuffle options
    const shuffled = qData.options.sort(() => Math.random() - 0.5);

    shuffled.forEach(opt => {
        const btn = document.createElement('button');
        btn.innerText = opt;
        btn.onclick = () => {
            const isCorrect = (opt === qData.a);
            socket.emit('submit_answer', { correct: isCorrect, roll: currentRoll });
            questionModal.classList.add('hidden');
        };
        optionsGrid.appendChild(btn);
    });

    questionModal.classList.remove('hidden');
}

function clearDynamicButtons() {
    const actionContainer = document.getElementById('actions');
    Array.from(actionContainer.querySelectorAll('.dynamic-btn')).forEach(btn => btn.remove());
}

function showPlayerSelectionForSabotage() {
    clearDynamicButtons();
    const actionContainer = document.getElementById('actions');
    const header = document.createElement('div');
    header.innerText = "SELECT TARGET TO SABOTAGE:";
    header.className = 'dynamic-btn'; // styling hack
    actionContainer.appendChild(header);

    // Get current players from DOM list or... simpler to ask server for list?
    // We don't have the full player list in a global var easily without parsing renderPlayers input.
    // Let's rely on the DOM 'playerList' is just text.
    // Better: We should store the last received state.
    // Hack: Assuming `renderPlayers` was just called, we don't have the raw object stored globally.
    // Optimization: Let's store `lastStatePlayers`
}

// Store last state for selection logic
let lastStatePlayers = {};
const originalRenderPlayers = renderPlayers;
renderPlayers = function (players) {
    lastStatePlayers = players;
    originalRenderPlayers(players);
}

function showPlayerSelectionForSabotage() {
    clearDynamicButtons();
    const container = document.getElementById('actions');

    Object.values(lastStatePlayers).forEach(p => {
        if (p.id === myId) return; // Don't sabotage self

        const btn = document.createElement('button');
        btn.className = 'dynamic-btn';
        btn.innerText = `SABOTAGE ${p.name}`;
        btn.style.borderColor = "red";
        btn.onclick = () => {
            socket.emit('perform_sabotage', { target_id: p.id });
            clearDynamicButtons();
        };
        container.appendChild(btn);
    });

    // Cancel button
    const cancel = document.createElement('button');
    cancel.className = 'dynamic-btn';
    cancel.innerText = "CANCEL";
    cancel.onclick = () => {
        // Re-trigger action phase logic?
        // Actually, we lost the roll info. Ideally we just hide/show buttons.
        // For MVP, just reload page or better yet, don't clear default buttons.
        // Simplest: just emit a "skip" or wait for next turn? No, that breaks flow.
        // We should just restore the Move button.
        // Re-creating the move button requires knowing the roll... stored in `currentRoll`.
        clearDynamicButtons();
        // Restore Move Button
        const moveBtn = document.createElement('button');
        moveBtn.className = 'dynamic-btn';
        moveBtn.innerText = `MOVE ${currentRoll} SPACES`;
        moveBtn.onclick = () => {
            socket.emit('perform_move', { steps: currentRoll });
            clearDynamicButtons();
        };
        container.appendChild(moveBtn);
    };
    container.appendChild(cancel);
}

function showPlayerSelectionForAccuse() {
    // Similar to Sabotage but emits 'perform_accuse'
    clearDynamicButtons();
    const container = document.getElementById('actions');

    Object.values(lastStatePlayers).forEach(p => {
        if (p.id === myId) return;

        const btn = document.createElement('button');
        btn.className = 'dynamic-btn';
        btn.innerText = `ACCUSE ${p.name}`;
        btn.style.borderColor = "cyan";
        btn.onclick = () => {
            if (confirm(`Are you sure you want to accuse ${p.name}? If wrong, you freeze for 3 turns.`)) {
                socket.emit('perform_accuse', { target_id: p.id });
                clearDynamicButtons();
            }
        };
        container.appendChild(btn);
    });

    // Cancel logic similar to above
    const cancel = document.createElement('button');
    cancel.className = 'dynamic-btn';
    cancel.innerText = "CANCEL";
    cancel.onclick = () => {
        clearDynamicButtons();
        // Restore Move Button
        const moveBtn = document.createElement('button');
        moveBtn.className = 'dynamic-btn';
        moveBtn.innerText = `MOVE ${currentRoll} SPACES`;
        moveBtn.onclick = () => {
            socket.emit('perform_move', { steps: currentRoll });
            clearDynamicButtons();
        };
        container.appendChild(moveBtn);
    };
    container.appendChild(cancel);
}


// Utility
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

// --- Actions ---

function joinGame() {
    const name = document.getElementById('player-name').value;
    if (name) {
        socket.emit('join_game', { name: name });
    } else {
        alert("Please enter a name on your ticket.");
    }
}

function startGame() {
    socket.emit('start_game');
}

function rollDice() {
    socket.emit('roll_dice');
}

function toggleReady() {
    socket.emit('toggle_ready');
}

function playKillerVictory() {
    const bgm = document.getElementById('bgm');
    const victory = document.getElementById('victory-music');

    // Fade out BGM
    if (bgm && !bgm.paused) {
        let vol = bgm.volume;
        const fadeOut = setInterval(() => {
            if (vol > 0.1) {
                vol -= 0.1;
                bgm.volume = vol;
            } else {
                clearInterval(fadeOut);
                bgm.pause();
                bgm.currentTime = 0;
                bgm.volume = 0.5; // Reset for next time

                // Play Victory Theme
                if (victory) victory.play().catch(e => console.log("Audio play failed", e));
            }
        }, 50); // 0.1 per 50ms = 0.5s fade out
    } else {
        // Just play if BGM wasn't playing
        if (victory) victory.play().catch(e => console.log("Audio play failed", e));
    }
}
