/**
 * ============================================================================
 * OOPSIEFLIP 🧠🎮
 * Game Mechanics Engine & Arena View Controller
 * (Feature: Game Mechanics)
 * ============================================================================
 */

(function () {
    // 12 High-Contrast Cyberpunk Neon Symbols
    const SYMBOL_POOL = ['⚡', '🔮', '🧬', '🚀', '👾', '💎', '🔥', '🌌', '🕹️', '🪐', '🤖', '👑'];

    // Difficulty Configuration
    const DIFFICULTY_CONFIG = {
        Easy: { pairs: 4, cards: 8, gridClass: 'grid-easy', multiplier: 1.0 },
        Medium: { pairs: 8, cards: 16, gridClass: 'grid-medium', multiplier: 1.5 },
        Hard: { pairs: 12, cards: 24, gridClass: 'grid-hard', multiplier: 2.0 },
    };

    // Game Engine State
    const gameState = {
        difficulty: 'Medium',
        nickname: '',
        cards: [],
        flippedCards: [],
        matchedPairs: 0,
        totalPairs: 8,
        moves: 0,
        startTime: null,
        elapsedSeconds: 0,
        timerInterval: null,
        score: 0,
        isLocked: false,
        isPlaying: false,
        soundEnabled: true,
        lastCompletedGame: null,
    };

    // Web Audio Synthesizer
    const AudioEngine = {
        ctx: null,

        init() {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            } catch (e) {
                console.warn('Web Audio API not supported.');
            }
        },

        ensureContext() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        playTone(freq, duration = 0.1, type = 'sine', gainVal = 0.15) {
            if (!gameState.soundEnabled || !this.ctx) return;
            this.ensureContext();

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                // Ignore audio errors
            }
        },

        flip() {
            this.playTone(520, 0.08, 'triangle', 0.12);
        },

        match() {
            if (!gameState.soundEnabled || !this.ctx) return;
            this.ensureContext();
            this.playTone(587.33, 0.2, 'sine', 0.15); // D5
            setTimeout(() => this.playTone(880, 0.35, 'sine', 0.18), 80); // A5
        },

        mismatch() {
            if (!gameState.soundEnabled || !this.ctx) return;
            this.ensureContext();
            this.playTone(240, 0.15, 'sawtooth', 0.1);
            setTimeout(() => this.playTone(190, 0.2, 'sawtooth', 0.1), 90);
        },

        victory() {
            if (!gameState.soundEnabled || !this.ctx) return;
            this.ensureContext();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                setTimeout(() => this.playTone(freq, 0.35, 'triangle', 0.2), idx * 110);
            });
        },
    };

    // DOM Elements Cache
    const elements = {
        setupPanel: document.getElementById('game-setup-panel'),
        activeArena: document.getElementById('game-active-arena'),
        nicknameInput: document.getElementById('player-nickname'),
        diffCards: document.querySelectorAll('.difficulty-card'),
        diffBadge: document.getElementById('selected-diff-badge'),
        startBtn: document.getElementById('start-game-btn'),
        gameBoard: document.getElementById('game-board'),
        soundToggleBtn: document.getElementById('sound-toggle-btn'),
        soundIcon: document.getElementById('sound-icon'),

        // HUD Elements
        hudDifficulty: document.getElementById('hud-difficulty'),
        hudTimer: document.getElementById('hud-timer'),
        hudMoves: document.getElementById('hud-moves'),
        hudPairs: document.getElementById('hud-pairs'),
        hudScore: document.getElementById('hud-score'),
        hudRestartBtn: document.getElementById('hud-restart-btn'),
        hudQuitBtn: document.getElementById('hud-quit-btn'),

        // Victory Modal
        winModal: document.getElementById('win-modal'),
        modalPlayerName: document.getElementById('modal-player-name'),
        modalFinalScore: document.getElementById('modal-final-score'),
        modalTimeTaken: document.getElementById('modal-time-taken'),
        modalMovesTaken: document.getElementById('modal-moves-taken'),
        modalDifficulty: document.getElementById('modal-difficulty'),
        modalSubmitBtn: document.getElementById('modal-submit-btn'),
        modalRestartBtn: document.getElementById('modal-play-again-btn'),
        modalStatus: document.getElementById('modal-submission-status'),
    };

    /**
     * Nickname validator strictly conforming to backend requirements
     */
    function validateNickname(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 20) return false;
        return /^[a-zA-Z0-9 _-]+$/.test(trimmed);
    }

    /**
     * Fisher-Yates array shuffle
     */
    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Generate shuffled card deck
     */
    function generateDeck(difficulty) {
        const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Medium;
        const symbols = SYMBOL_POOL.slice(0, config.pairs);
        const deck = [...symbols, ...symbols];
        const shuffled = shuffleArray(deck);

        return shuffled.map((symbol, index) => ({
            id: index,
            symbol: symbol,
            isFlipped: false,
            isMatched: false,
        }));
    }

    /**
     * Format elapsed seconds to mm:ss
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Compute current game score based on pairs matched, moves, time and multiplier
     */
    function calculateScore() {
        const config = DIFFICULTY_CONFIG[gameState.difficulty];
        const baseScore = gameState.matchedPairs * 300;
        const timeAllowance = config.pairs * 40;
        const timeBonus = Math.max(0, Math.floor((timeAllowance - gameState.elapsedSeconds) * 8));
        const movePenalty = gameState.moves * 12;

        const rawScore = baseScore + timeBonus - movePenalty;
        const total = Math.max(50, Math.round(rawScore * config.multiplier));
        return Math.min(1000000, total);
    }

    /**
     * Update HUD visual state
     */
    function updateHUD() {
        elements.hudDifficulty.textContent = gameState.difficulty;
        elements.hudMoves.textContent = gameState.moves;
        elements.hudPairs.textContent = `${gameState.matchedPairs} / ${gameState.totalPairs}`;
        elements.hudScore.textContent = gameState.isPlaying ? calculateScore().toLocaleString() : '0';
        elements.hudTimer.textContent = formatTime(gameState.elapsedSeconds);
    }

    /**
     * Start the countdown / timer
     */
    function startTimer() {
        stopTimer();
        gameState.startTime = Date.now();
        gameState.elapsedSeconds = 0;
        elements.hudTimer.textContent = '00:00';

        gameState.timerInterval = setInterval(() => {
            const now = Date.now();
            gameState.elapsedSeconds = Math.floor((now - gameState.startTime) / 1000);
            elements.hudTimer.textContent = formatTime(gameState.elapsedSeconds);
            elements.hudScore.textContent = calculateScore().toLocaleString();
        }, 1000);
    }

    /**
     * Stop active timer
     */
    function stopTimer() {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }
    }

    /**
     * Render the cards onto the board
     */
    function renderBoard() {
        const config = DIFFICULTY_CONFIG[gameState.difficulty];
        elements.gameBoard.className = `game-board ${config.gridClass}`;
        elements.gameBoard.innerHTML = '';

        gameState.cards.forEach((card) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.dataset.id = card.id;

            cardEl.innerHTML = `
                <div class="card-inner">
                    <div class="card-face card-back">
                        <span class="card-cyber-symbol">⚡</span>
                    </div>
                    <div class="card-face card-front">
                        <span>${card.symbol}</span>
                    </div>
                </div>
            `;

            cardEl.addEventListener('click', () => handleCardClick(card, cardEl));
            elements.gameBoard.appendChild(cardEl);
        });
    }

    /**
     * Handle Card Click
     */
    function handleCardClick(card, cardEl) {
        if (!gameState.isPlaying || gameState.isLocked || card.isFlipped || card.isMatched) {
            return;
        }

        AudioEngine.flip();

        card.isFlipped = true;
        cardEl.classList.add('flipped');
        gameState.flippedCards.push({ card, element: cardEl });

        if (gameState.flippedCards.length === 2) {
            gameState.moves++;
            updateHUD();
            checkForMatch();
        }
    }

    /**
     * Check if two flipped cards match
     */
    function checkForMatch() {
        gameState.isLocked = true;
        const [first, second] = gameState.flippedCards;

        if (first.card.symbol === second.card.symbol) {
            // Match!
            setTimeout(() => {
                AudioEngine.match();
                first.card.isMatched = true;
                second.card.isMatched = true;

                first.element.classList.add('matched');
                second.element.classList.add('matched');

                gameState.matchedPairs++;
                gameState.flippedCards = [];
                gameState.isLocked = false;
                updateHUD();

                if (gameState.matchedPairs === gameState.totalPairs) {
                    handleGameVictory();
                }
            }, 300);
        } else {
            // Mismatch
            setTimeout(() => {
                AudioEngine.mismatch();
                first.element.classList.add('mismatch');
                second.element.classList.add('mismatch');

                setTimeout(() => {
                    first.card.isFlipped = false;
                    second.card.isFlipped = false;
                    first.element.classList.remove('flipped', 'mismatch');
                    second.element.classList.remove('flipped', 'mismatch');

                    gameState.flippedCards = [];
                    gameState.isLocked = false;
                }, 500);
            }, 550);
        }
    }

    /**
     * Victory state handler
     */
    function handleGameVictory() {
        stopTimer();
        gameState.isPlaying = false;
        AudioEngine.victory();

        const exactTimeTaken = Math.max(1, Math.round(((Date.now() - gameState.startTime) / 1000) * 10) / 10);
        const finalScore = calculateScore();

        gameState.lastCompletedGame = {
            nickname: gameState.nickname,
            score: finalScore,
            moves: gameState.moves,
            timeTaken: exactTimeTaken,
            difficulty: gameState.difficulty,
        };

        // Save nickname in localStorage so player doesn't have to re-type it
        try { localStorage.setItem('oopsie_nickname', gameState.nickname); } catch (e) {}

        // Populate Victory Modal
        elements.modalPlayerName.textContent = gameState.nickname;
        elements.modalFinalScore.textContent = `${finalScore.toLocaleString()} pts`;
        elements.modalTimeTaken.textContent = `${exactTimeTaken}s`;
        elements.modalMovesTaken.textContent = gameState.moves;
        elements.modalDifficulty.textContent = gameState.difficulty;

        elements.modalStatus.className = 'status-msg-box';
        elements.modalStatus.textContent = '📡 Auto-saving score to MongoDB Leaderboard...';
        elements.modalSubmitBtn.disabled = true;
        elements.modalSubmitBtn.textContent = 'Saving Score...';

        // Open Modal
        elements.winModal.classList.remove('hidden');

        // Automatically submit score to backend in background (Zero manual friction!)
        if (window.LeaderboardAPI) {
            window.LeaderboardAPI.submitScore(gameState.lastCompletedGame);
        }
    }

    /**
     * Start a new game
     */
    function startNewGame() {
        const rawNickname = elements.nicknameInput.value.trim();

        if (!validateNickname(rawNickname)) {
            elements.nicknameInput.focus();
            elements.nicknameInput.style.borderColor = '#ff007f';
            elements.nicknameInput.style.boxShadow = '0 0 16px rgba(255, 0, 127, 0.6)';
            alert('Please enter a valid nickname:\n• Between 2 and 20 characters\n• Letters, numbers, spaces, _ and - only');
            return;
        }

        elements.nicknameInput.style.borderColor = '';
        elements.nicknameInput.style.boxShadow = '';
        gameState.nickname = rawNickname;

        const config = DIFFICULTY_CONFIG[gameState.difficulty];
        gameState.totalPairs = config.pairs;
        gameState.matchedPairs = 0;
        gameState.moves = 0;
        gameState.flippedCards = [];
        gameState.isLocked = false;
        gameState.isPlaying = true;
        gameState.cards = generateDeck(gameState.difficulty);

        // Transition views: Hide setup, show game arena
        elements.setupPanel.style.display = 'none';
        elements.activeArena.classList.remove('hidden');

        updateHUD();
        renderBoard();
        startTimer();
    }

    /**
     * Exit active game arena back to setup panel
     */
    function exitToSetup() {
        if (gameState.isPlaying && !confirm('Are you sure you want to abandon the current mission?')) {
            return;
        }
        stopTimer();
        gameState.isPlaying = false;
        elements.activeArena.classList.add('hidden');
        elements.setupPanel.style.display = 'block';
    }

    /**
     * Restart current active game with same parameters
     */
    function restartActiveGame() {
        if (!confirm('Restart game from beginning?')) return;
        startNewGame();
    }

    /**
     * Setup Event Listeners
     */
    function setupEventListeners() {
        // Audio Engine initialization on first user click
        window.addEventListener('click', () => AudioEngine.init(), { once: true });

        // Start & Navigation buttons
        elements.startBtn.addEventListener('click', startNewGame);
        elements.hudRestartBtn.addEventListener('click', restartActiveGame);
        elements.hudQuitBtn.addEventListener('click', exitToSetup);

        // Enter key in nickname input
        elements.nicknameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') startNewGame();
        });

        // Difficulty selection cards
        elements.diffCards.forEach((card) => {
            card.addEventListener('click', () => {
                elements.diffCards.forEach((c) => c.classList.remove('active'));
                card.classList.add('active');
                const diff = card.getAttribute('data-diff');
                gameState.difficulty = diff;

                if (elements.diffBadge) {
                    elements.diffBadge.className = `diff-badge ${diff}`;
                    elements.diffBadge.textContent = `${diff} Mode`;
                }
            });
        });

        // Sound Toggle
        elements.soundToggleBtn.addEventListener('click', () => {
            gameState.soundEnabled = !gameState.soundEnabled;
            elements.soundIcon.textContent = gameState.soundEnabled ? '🔊' : '🔇';
            elements.soundToggleBtn.title = gameState.soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX';
        });

        // Victory Modal Buttons
        elements.modalSubmitBtn.addEventListener('click', async () => {
            if (!gameState.lastCompletedGame) return;
            if (window.LeaderboardAPI) {
                await window.LeaderboardAPI.submitScore(gameState.lastCompletedGame);
            }
        });

        elements.modalRestartBtn.addEventListener('click', () => {
            elements.winModal.classList.add('hidden');
            startNewGame();
        });
    }

    // Auto-init
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        try {
            const savedNick = localStorage.getItem('oopsie_nickname');
            if (savedNick && elements.nicknameInput) {
                elements.nicknameInput.value = savedNick;
            }
        } catch (e) {}
    });
})();