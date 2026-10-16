/**
 * ============================================================================
 * NEON MEMORY — MIND FLIP 🧠🎮
 * Leaderboard, Pagination & Single-Page App (SPA) Navigation
 * ============================================================================
 */

// Dynamically determine backend base URL:
// When running on any hosted domain (Vercel, Render, Railway, or port 5000), use relative '/api'
// In local development using a separate static server (e.g. Live Server on port 5500), fallback to localhost:5000
const isLocalSeparateServer = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000';
const API_BASE_URL = isLocalSeparateServer ? 'http://localhost:5000/api' : '/api';

/**
 * SPA Page Navigation Manager
 */
const Navigation = {
    activePage: 'game',

    showPage(pageName) {
        const validPages = ['game', 'leaderboard', 'rules', 'about'];
        if (!validPages.includes(pageName)) pageName = 'game';

        this.activePage = pageName;

        // Hide all page views
        document.querySelectorAll('.page-view').forEach((view) => {
            view.classList.remove('active');
        });

        // Show requested page view
        const targetView = document.getElementById(`view-${pageName}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Update active nav-tab styling
        document.querySelectorAll('.nav-tab').forEach((tab) => {
            if (tab.getAttribute('data-page') === pageName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Sync URL hash without jumping
        if (window.location.hash !== `#${pageName}`) {
            window.history.replaceState(null, '', `#${pageName}`);
        }

        // If switching to leaderboard, auto-refresh scores
        if (pageName === 'leaderboard') {
            LeaderboardAPI.fetchLeaderboard();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    init() {
        // Read hash on initial load
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            this.showPage(hash);
        } else {
            this.showPage('game');
        }

        // Handle browser back/forward buttons
        window.addEventListener('hashchange', () => {
            const currentHash = window.location.hash.replace('#', '');
            if (currentHash && currentHash !== this.activePage) {
                this.showPage(currentHash);
            }
        });
    },
};

/**
 * Leaderboard & MongoDB REST API Manager
 */
const LeaderboardAPI = {
    currentFilter: '', // '' = All, 'Easy', 'Medium', 'Hard'
    currentPage: 1,
    totalPages: 1,
    limit: 10,
    isSubmitting: false,

    /**
     * Check backend and database connectivity via GET /api/health
     */
    async checkServerHealth() {
        const badge = document.getElementById('server-status');
        const text = document.getElementById('server-status-text');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Health check non-200');

            const data = await response.json();

            badge.classList.remove('checking', 'offline');
            badge.classList.add('online');

            if (data.database === 'connected') {
                text.textContent = 'Server & DB: Online 🟢';
                badge.title = `Uptime: ${data.uptime}s | MongoDB Atlas Connected`;
            } else {
                badge.classList.remove('online');
                badge.classList.add('checking');
                text.textContent = 'DB Disconnected ⚠️';
                badge.title = 'Express server active, but MongoDB connection pending in .env';
            }
        } catch (err) {
            badge.classList.remove('checking', 'online');
            badge.classList.add('offline');
            text.textContent = 'Server: Offline 🔴';
            badge.title = 'Cannot reach backend at ' + API_BASE_URL;
        }
    },

    /**
     * Fetch paginated leaderboard rankings
     */
    async fetchLeaderboard(difficulty = this.currentFilter, page = this.currentPage) {
        this.currentFilter = difficulty;
        this.currentPage = page;

        const tbody = document.getElementById('leaderboard-rows');
        const totalPill = document.getElementById('total-operatives-count');
        const pageInfo = document.getElementById('lb-page-info');
        const prevBtn = document.getElementById('lb-prev-btn');
        const nextBtn = document.getElementById('lb-next-btn');

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-msg">📡 Syncing high scores with MongoDB database...</td>
            </tr>
        `;

        try {
            const params = new URLSearchParams({
                limit: String(this.limit),
                page: String(this.currentPage),
            });

            if (difficulty) {
                params.append('difficulty', difficulty);
            }

            const response = await fetch(`${API_BASE_URL}/scores/leaderboard?${params.toString()}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch leaderboard data.');
            }

            const scores = Array.isArray(result.data) ? result.data : [];
            const total = result.total || 0;
            this.totalPages = Math.max(1, result.totalPages || Math.ceil(total / this.limit));

            // Update Total Counter Pill
            if (totalPill) {
                totalPill.textContent = `Records: ${total} Operatives`;
            }

            // Update Pagination Controls
            if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;

            // Render Podium on Page 1
            if (this.currentPage === 1) {
                this.renderPodium(scores);
            }

            this.renderTable(scores);
        } catch (error) {
            console.error('Leaderboard error:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-msg">
                        ⚠️ Unable to reach leaderboard API.<br>
                        <small style="color:var(--text-muted)">Verify your Express server is running on port 5000.</small>
                    </td>
                </tr>
            `;
            if (totalPill) totalPill.textContent = 'Records: Offline';
            this.renderPodium([]);
        }
    },

    /**
     * Render the Top 3 Podium
     */
    renderPodium(scores) {
        const top3 = [scores[0] || null, scores[1] || null, scores[2] || null];

        top3.forEach((player, idx) => {
            const rankNum = idx + 1;
            const nameEl = document.getElementById(`podium-name-${rankNum}`);
            const scoreEl = document.getElementById(`podium-score-${rankNum}`);
            const metaEl = document.getElementById(`podium-meta-${rankNum}`);
            const avatarEl = document.getElementById(`podium-avatar-${rankNum}`);

            if (!nameEl) return;

            if (player) {
                nameEl.textContent = player.nickname;
                scoreEl.textContent = `${Number(player.score).toLocaleString()} pts`;
                metaEl.textContent = `${player.timeTaken}s | ${player.moves} moves (${player.difficulty})`;
                avatarEl.textContent = player.nickname.charAt(0).toUpperCase();
            } else {
                nameEl.textContent = '---';
                scoreEl.textContent = '0 pts';
                metaEl.textContent = 'No record yet';
                avatarEl.textContent = '-';
            }
        });
    },

    /**
     * Render the Leaderboard Table
     */
    renderTable(scores) {
        const tbody = document.getElementById('leaderboard-rows');
        tbody.innerHTML = '';

        const myRawNick = (localStorage.getItem('oopsie_nickname') || document.getElementById('player-nickname')?.value || '').trim();
        const myNick = myRawNick.toLowerCase();

        // Update personal operative status banner
        const bannerEl = document.getElementById('user-leaderboard-banner');
        if (bannerEl) {
            if (myNick) {
                const myEntry = scores && scores.find(s => s.nickname && s.nickname.toLowerCase() === myNick);
                if (myEntry) {
                    bannerEl.innerHTML = `🌟 Welcome, <strong>${this.escapeHTML(myEntry.nickname)}</strong>! Your best score is currently ranked <strong>#${myEntry.rank}</strong> with <strong>${Number(myEntry.score).toLocaleString()} pts</strong> (${myEntry.difficulty} Mode).`;
                    bannerEl.className = 'user-banner active-ranked';
                } else {
                    bannerEl.innerHTML = `👋 Operative <strong>${this.escapeHTML(myRawNick)}</strong>: You haven't finished a game yet! <a href="#game" onclick="Navigation.showPage('game')">▶ Play a game now to get ranked on this leaderboard ↗</a>`;
                    bannerEl.className = 'user-banner active-unranked';
                }
            } else {
                bannerEl.innerHTML = `💡 Want to see your nickname here? <a href="#game" onclick="Navigation.showPage('game')">Enter your nickname & play a game ↗</a>`;
                bannerEl.className = 'user-banner';
            }
        }

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-msg">
                        No operative scores recorded yet${this.currentFilter ? ` for ${this.currentFilter} difficulty` : ''}.
                        Be the first to finish a game and submit!
                    </td>
                </tr>
            `;
            return;
        }

        scores.forEach((entry) => {
            const tr = document.createElement('tr');
            const isMe = myNick && entry.nickname && entry.nickname.toLowerCase() === myNick;
            if (isMe) {
                tr.classList.add('my-score-row');
            }

            // Rank with medals for top 3
            let rankDisplay = `#${entry.rank}`;
            if (entry.rank === 1) rankDisplay = `🥇 #1`;
            else if (entry.rank === 2) rankDisplay = `🥈 #2`;
            else if (entry.rank === 3) rankDisplay = `🥉 #3`;

            // Formatted Date
            let dateStr = 'Recent';
            if (entry.createdAt) {
                const d = new Date(entry.createdAt);
                dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }

            tr.innerHTML = `
                <td class="rank-val">${rankDisplay}</td>
                <td class="player-name-val">
                    ${this.escapeHTML(entry.nickname)}
                    ${isMe ? '<span class="you-badge">YOU</span>' : ''}
                </td>
                <td class="score-num-val">${Number(entry.score).toLocaleString()} pts</td>
                <td>${entry.timeTaken}s</td>
                <td>${entry.moves}</td>
                <td><span class="table-diff-badge ${entry.difficulty}">${entry.difficulty}</span></td>
                <td style="color:var(--text-muted); font-size:0.85rem;">${dateStr}</td>
            `;

            tbody.appendChild(tr);
        });
    },

    /**
     * Submit completed score payload to POST /api/scores
     */
    async submitScore(scoreData) {
        if (this.isSubmitting) return false;

        const statusEl = document.getElementById('modal-submission-status');
        const submitBtn = document.getElementById('modal-submit-btn');

        this.isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving Score...';
        }
        if (statusEl) {
            statusEl.className = 'status-msg-box';
            statusEl.textContent = '📡 Auto-registering operative score in database...';
        }

        try {
            const response = await fetch(`${API_BASE_URL}/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nickname: String(scoreData.nickname).trim(),
                    score: Math.round(Number(scoreData.score)),
                    moves: parseInt(scoreData.moves, 10),
                    timeTaken: Math.round(Number(scoreData.timeTaken) * 100) / 100,
                    difficulty: scoreData.difficulty,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                const errMsg = result.errors ? result.errors.join(' ') : (result.message || 'Submission failed');
                throw new Error(errMsg);
            }

            if (statusEl) {
                statusEl.className = 'status-msg-box success';
                statusEl.textContent = '✅ Score registered in MongoDB Leaderboard!';
            }
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '✓ Saved in Database';
            }

            // Save nickname locally
            try { localStorage.setItem('oopsie_nickname', scoreData.nickname); } catch (e) {}

            // Auto-refresh leaderboard on All Scores so user immediately sees their record
            this.currentFilter = '';
            document.querySelectorAll('.filter-pills .filter-pill').forEach((pill) => {
                pill.classList.toggle('active', pill.getAttribute('data-filter') === '');
            });
            await this.fetchLeaderboard('', 1);
            return true;
        } catch (err) {
            console.error('Score submission error:', err);
            statusEl.className = 'status-msg-box error';
            statusEl.textContent = `❌ ${err.message || 'Failed to submit score.'}`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Retry Submission';
            return false;
        } finally {
            this.isSubmitting = false;
        }
    },

    /**
     * Escape special characters to protect against XSS
     */
    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Initialize listeners for filtering, pagination, and refresh
     */
    init() {
        // Difficulty filter pills
        const pills = document.querySelectorAll('.filter-pills .filter-pill');
        pills.forEach((pill) => {
            pill.addEventListener('click', () => {
                pills.forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.getAttribute('data-filter') || '';
                this.fetchLeaderboard(filter, 1);
            });
        });

        // Pagination buttons
        const prevBtn = document.getElementById('lb-prev-btn');
        const nextBtn = document.getElementById('lb-next-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.fetchLeaderboard(this.currentFilter, this.currentPage - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.fetchLeaderboard(this.currentFilter, this.currentPage + 1);
                }
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-leaderboard-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.checkServerHealth();
                this.fetchLeaderboard(this.currentFilter, this.currentPage);
            });
        }

        // Initial setup
        this.checkServerHealth();
        this.fetchLeaderboard('', 1);

        // Keep server health updated periodically
        setInterval(() => this.checkServerHealth(), 30000);
    },
};

// Initialize Navigation and Leaderboard API on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    Navigation.init();
    LeaderboardAPI.init();
});

// Expose globally
window.Navigation = Navigation;
window.LeaderboardAPI = LeaderboardAPI;
