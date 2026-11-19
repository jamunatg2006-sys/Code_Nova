/*
 * OopsieFlip - Achievements & Rewards System
 * Self-contained: injects its own CSS and HTML. Stores progress in localStorage.
 *
 * Integration (one call when a game finishes):
 *   OopsieAchievements.onGameEnd({ nickname, difficulty, time, moves, score });
 *   - difficulty: 'easy' | 'medium' | 'hard'  (case-insensitive)
 *   - time: seconds (number)
 */
(function () {
  'use strict';

  var STORE = 'oopsieflip_achievements_v1';
  var LAST = 'oopsieflip_last_nick';
  var XP_PER_LEVEL = 200;
  var TITLES = ['Rookie', 'Operative', 'Agent', 'Elite', 'Legend'];
  var PAIRS = { easy: 4, medium: 8, hard: 12 };

  // ---------- Achievement definitions (edit thresholds here) ----------
  // g = finished game stats, p = player's saved profile
  var ACHIEVEMENTS = [
    { id: 'first_win', icon: '🎯', name: 'First Mission', desc: 'Finish your first game', xp: 50,
      check: function (g, p) { return p.gamesPlayed >= 1; } },
    { id: 'speed_easy', icon: '⚡', name: 'Speed Demon', desc: 'Finish Easy in under 20 seconds', xp: 100,
      check: function (g) { return g.difficulty === 'easy' && g.time > 0 && g.time < 20; } },
    { id: 'speed_medium', icon: '🚀', name: 'Lightning Mind', desc: 'Finish Medium in under 45 seconds', xp: 150,
      check: function (g) { return g.difficulty === 'medium' && g.time > 0 && g.time < 45; } },
    { id: 'hard_clear', icon: '🔥', name: 'Hard Mode Conqueror', desc: 'Finish a Hard game', xp: 150,
      check: function (g) { return g.difficulty === 'hard'; } },
    { id: 'efficient', icon: '🧠', name: 'Sharp Memory', desc: 'Finish using very few moves', xp: 120,
      check: function (g) { var n = PAIRS[g.difficulty]; return !!n && g.moves > 0 && g.moves <= n * 2; } },
    { id: 'high_score', icon: '💎', name: 'High Roller', desc: 'Score 2000 or more in one game', xp: 150,
      check: function (g) { return g.score >= 2000; } },
    { id: 'all_levels', icon: '🏆', name: 'Triple Threat', desc: 'Finish Easy, Medium and Hard', xp: 200,
      check: function (g, p) { return !!(p.completed.easy && p.completed.medium && p.completed.hard); } },
    { id: 'regular', icon: '🎮', name: 'Regular Operative', desc: 'Play 10 games', xp: 100,
      check: function (g, p) { return p.gamesPlayed >= 10; } }
  ];

  // ---------- Storage helpers ----------
  function readAll() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function writeAll(obj) {
    try { localStorage.setItem(STORE, JSON.stringify(obj)); } catch (e) { /* storage unavailable */ }
  }
  function freshProfile() { return { gamesPlayed: 0, xp: 0, unlocked: {}, completed: {} }; }
  function getProfile(nick) { return readAll()[nick] || freshProfile(); }
  function saveProfile(nick, p) { var all = readAll(); all[nick] = p; writeAll(all); }
  function levelOf(xp) { return Math.floor(xp / XP_PER_LEVEL) + 1; }
  function titleOf(level) { return TITLES[Math.min(level - 1, TITLES.length - 1)]; }
  function lastNick() {
    try { return localStorage.getItem(LAST) || ''; } catch (e) { return ''; }
  }

  // ---------- UI ----------
  var CSS = [
    '#af-btn{position:fixed;right:18px;bottom:18px;z-index:9998;width:52px;height:52px;border-radius:50%;',
    'border:2px solid #0ff;background:#0a0a1a;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 0 14px #0ff8;}',
    '#af-btn:hover{box-shadow:0 0 24px #0ff;}',
    '#af-panel{display:none;position:fixed;right:18px;bottom:80px;z-index:9998;width:min(360px,92vw);max-height:70vh;',
    'overflow:auto;background:#0a0a1ae6;border:2px solid #0ff;border-radius:14px;padding:16px;color:#e8f9ff;',
    'font-family:inherit;box-shadow:0 0 28px #0ff6;}',
    '#af-panel.open{display:block;}',
    '#af-panel h3{margin:0 0 4px;color:#0ff;}',
    '.af-sub{font-size:13px;opacity:.85;margin-bottom:8px;}',
    '.af-bar{height:10px;background:#1b1b3a;border-radius:6px;overflow:hidden;margin:6px 0 14px;}',
    '.af-fill{height:100%;background:linear-gradient(90deg,#0ff,#f0f);width:0;transition:width .4s;}',
    '.af-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '.af-card{border:1px solid #0ff5;border-radius:10px;padding:8px;font-size:12px;text-align:center;}',
    '.af-card .af-ic{font-size:24px;display:block;}',
    '.af-card.locked{opacity:.4;filter:grayscale(1);}',
    '.af-card b{display:block;margin:2px 0;}',
    '#af-toasts{position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;}',
    '.af-toast{background:#0a0a1a;border:2px solid #f0f;color:#fff;border-radius:12px;padding:10px 14px;',
    'box-shadow:0 0 18px #f0f8;font-size:14px;animation:af-in .35s ease;}',
    '@keyframes af-in{from{transform:translateX(120%);opacity:0}to{transform:none;opacity:1}}'
  ].join('');

  var panel, toasts;

  function injectUI() {
    if (document.getElementById('af-btn')) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'af-btn';
    btn.type = 'button';
    btn.title = 'Achievements';
    btn.textContent = '🏅';
    btn.addEventListener('click', function () {
      renderPanel();
      panel.classList.toggle('open');
    });

    panel = document.createElement('div');
    panel.id = 'af-panel';
    toasts = document.createElement('div');
    toasts.id = 'af-toasts';

    document.body.appendChild(btn);
    document.body.appendChild(panel);
    document.body.appendChild(toasts);
  }

  function toast(text) {
    if (!toasts) return;
    var t = document.createElement('div');
    t.className = 'af-toast';
    t.textContent = text;
    toasts.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
  }

  function renderPanel() {
    if (!panel) return;
    var nick = lastNick();
    var p = nick ? getProfile(nick) : freshProfile();
    var level = levelOf(p.xp);
    var into = p.xp % XP_PER_LEVEL;
    var unlockedCount = Object.keys(p.unlocked).length;

    var html = '<h3>🏅 Achievements</h3>' +
      '<div class="af-sub"><span id="af-who"></span></div>' +
      '<div class="af-sub">Level ' + level + ' · ' + titleOf(level) + ' · ' + p.xp + ' XP</div>' +
      '<div class="af-bar"><div class="af-fill" style="width:' + Math.round((into / XP_PER_LEVEL) * 100) + '%"></div></div>' +
      '<div class="af-sub">' + unlockedCount + ' / ' + ACHIEVEMENTS.length + ' unlocked</div>' +
      '<div class="af-grid">';

    ACHIEVEMENTS.forEach(function (a) {
      var on = !!p.unlocked[a.id];
      html += '<div class="af-card' + (on ? '' : ' locked') + '">' +
        '<span class="af-ic">' + a.icon + '</span><b>' + a.name + '</b>' +
        '<span>' + a.desc + '</span><br><span>+' + a.xp + ' XP</span></div>';
    });
    html += '</div>';
    panel.innerHTML = html;

    var who = document.getElementById('af-who');
    if (who) who.textContent = nick ? 'Operative: ' + nick : 'Play a game to start earning achievements';
  }

  // ---------- Public API ----------
  function onGameEnd(game) {
    game = game || {};
    var nick = String(game.nickname || 'Guest');
    var g = {
      nickname: nick,
      difficulty: String(game.difficulty || '').toLowerCase().trim(),
      time: Number(game.time) || 0,
      moves: Number(game.moves) || 0,
      score: Number(game.score) || 0
    };

    var p = getProfile(nick);
    var levelBefore = levelOf(p.xp);
    p.gamesPlayed += 1;
    if (g.difficulty) p.completed[g.difficulty] = true;

    var newly = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (!p.unlocked[a.id] && a.check(g, p)) {
        p.unlocked[a.id] = Date.now();
        p.xp += a.xp;
        newly.push(a);
      }
    });

    saveProfile(nick, p);
    try { localStorage.setItem(LAST, nick); } catch (e) { /* ignore */ }

    newly.forEach(function (a, i) {
      setTimeout(function () {
        toast('🏅 Achievement Unlocked: ' + a.name + ' (+' + a.xp + ' XP)');
      }, i * 1200);
    });
    var levelAfter = levelOf(p.xp);
    if (levelAfter > levelBefore) {
      setTimeout(function () {
        toast('⬆️ Level Up! Level ' + levelAfter + ' · ' + titleOf(levelAfter));
      }, newly.length * 1200);
    }

    renderPanel();
    return newly;
  }

  window.OopsieAchievements = {
    onGameEnd: onGameEnd,
    getProfile: getProfile,
    getTitle: function (nick) { return titleOf(levelOf(getProfile(nick).xp)); },
    getLevel: function (nick) { return levelOf(getProfile(nick).xp); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { injectUI(); renderPanel(); });
  } else {
    injectUI();
    renderPanel();
  }
})();
