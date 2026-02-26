// ===== CRICKET ANALYSIS - CORE APP JS =====
// Data is stored ONLINE via Firebase Realtime Database (see firebase-config.js)
// Falls back to localStorage if Firebase is not configured.

// ===== SYNC CACHE ACCESSORS =====
// These are called by all existing page code synchronously.
// The cache is pre-loaded at page load (see initDB below).

function getPlayers() {
  return _playersCache || JSON.parse(localStorage.getItem('crick_players') || '[]');
}
function savePlayers(players) {
  _playersCache = players;
  if (!firebaseEnabled) localStorage.setItem('crick_players', JSON.stringify(players));
  // Save to Firebase (async, background)
  if (firebaseEnabled) {
    const obj = {};
    players.forEach(p => { obj[p.mobile.replace(/[.#$[\]]/g, '_')] = p; });
    fbWrite('players', Object.keys(obj).length ? obj : null).catch(console.error);
  }
}
function getPlayerByMobile(mobile) {
  return getPlayers().find(p => p.mobile === mobile) || null;
}
function savePlayer(player) {
  const players = getPlayers();
  const idx = players.findIndex(p => p.mobile === player.mobile);
  if (idx >= 0) players[idx] = player;
  else players.push(player);
  savePlayers(players);
}
function deletePlayer(mobile) {
  const players = getPlayers().filter(p => p.mobile !== mobile);
  savePlayers(players);
  const matches = getMatches().filter(m => m.playerMobile !== mobile);
  saveMatches(matches);
}

// ===== MATCH HELPERS =====
function getMatches() {
  return _matchesCache || JSON.parse(localStorage.getItem('crick_matches') || '[]');
}
function saveMatches(matches) {
  _matchesCache = matches;
  if (!firebaseEnabled) {
    localStorage.setItem('crick_matches', JSON.stringify(matches));
    return;
  }
  const obj = {};
  matches.forEach(m => { obj[m.id] = m; });
  fbWrite('matches', Object.keys(obj).length ? obj : null).catch(console.error);
}
function getMatchesByPlayer(mobile) {
  return getMatches().filter(m => m.playerMobile === mobile)
    .sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate));
}
function saveMatch(match) {
  const matches = getMatches();
  const idx = matches.findIndex(m => m.id === match.id);
  if (idx >= 0) matches[idx] = match;
  else matches.push(match);
  saveMatches(matches);
}
function deleteMatch(id) {
  saveMatches(getMatches().filter(m => m.id !== id));
}
function generateMatchId() {
  return 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ===== ADMIN HELPERS =====
const DEFAULT_ADMIN_PW = 'admin@cricket123';
function getAdminPw() {
  return _adminPwCache || localStorage.getItem('crick_admin_pw') || DEFAULT_ADMIN_PW;
}
function checkAdmin(pw) { return pw === getAdminPw(); }

// ===== SESSION (current player) =====
function getCurrentPlayer() {
  const m = sessionStorage.getItem('current_player');
  return m ? getPlayerByMobile(m) : null;
}
function setCurrentPlayer(mobile) {
  sessionStorage.setItem('current_player', mobile);
}
function clearCurrentPlayer() {
  sessionStorage.removeItem('current_player');
}
function requireLogin() {
  if (!getCurrentPlayer()) {
    window.location.href = 'index.html';
  }
}

// ===== STATS CALCULATION =====
function calcStats(mobile) {
  const matches = getMatchesByPlayer(mobile);
  if (!matches.length) return defaultStats();

  const bat = {
    total: matches.length,
    runs: 0, balls: 0, fours: 0, sixes: 0,
    dismissals: 0, highest: 0, fifties: 0, hundreds: 0,
    notOuts: 0, motm: 0,
  };
  const bowl = { overs: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noballs: 0 };
  const field = { catches: 0, runouts: 0, stumpings: 0 };
  const byType = { Leather: defaultStats(), Tennis: defaultStats(), Box: defaultStats() };

  matches.forEach(m => {
    const r = parseInt(m.runs) || 0;
    const b = parseInt(m.balls) || 0;
    const out = m.dismissal !== 'Not Out' && m.dismissal !== '';
    bat.runs += r;
    bat.balls += b;
    bat.fours += parseInt(m.fours) || 0;
    bat.sixes += parseInt(m.sixes) || 0;
    if (out) bat.dismissals++;
    else bat.notOuts++;
    if (r > bat.highest) bat.highest = r;
    if (r >= 100) bat.hundreds++;
    else if (r >= 50) bat.fifties++;
    if (m.motm) bat.motm++;

    bowl.overs += parseFloat(m.overs) || 0;
    bowl.runs += parseInt(m.bRuns) || 0;
    bowl.wickets += parseInt(m.wickets) || 0;
    bowl.maidens += parseInt(m.maidens) || 0;
    bowl.wides += parseInt(m.wides) || 0;
    bowl.noballs += parseInt(m.noballs) || 0;

    field.catches += parseInt(m.catches) || 0;
    field.runouts += parseInt(m.runouts) || 0;
    field.stumpings += parseInt(m.stumpings) || 0;

    const type = m.matchType;
    if (byType[type]) {
      byType[type].matches++;
      byType[type].runs += r;
      byType[type].wickets += parseInt(m.wickets) || 0;
    }
  });

  const avg = bat.dismissals > 0 ? (bat.runs / bat.dismissals).toFixed(2) : bat.runs.toFixed(2);
  const sr = bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(2) : '0.00';
  const eco = bowl.overs > 0 ? (bowl.runs / bowl.overs).toFixed(2) : '0.00';
  const ba = bowl.wickets > 0 ? (bowl.runs / bowl.wickets).toFixed(2) : '∞';

  let bestBowl = '-';
  let bestW = 0, bestR = Infinity;
  matches.forEach(m => {
    const w = parseInt(m.wickets) || 0;
    const r = parseInt(m.bRuns) || 0;
    if (w > bestW || (w === bestW && r < bestR)) { bestW = w; bestR = r; }
  });
  if (bestW > 0) bestBowl = `${bestW}/${bestR}`;

  return { bat, bowl, field, avg, sr, eco, ba, bestBowl, byType, matches };
}

function defaultStats() {
  return { matches: 0, runs: 0, wickets: 0 };
}

// ===== ANALYSIS INSIGHTS =====
function getInsights(stats) {
  const insights = [];
  const { bat, bowl, avg, sr, eco, ba } = stats;
  const srNum = parseFloat(sr);
  const avgNum = parseFloat(avg);
  const ecoNum = parseFloat(eco);
  const baNum = parseFloat(ba);
  const wpMatch = bat.total > 0 ? (bowl.wickets / bat.total) : 0;

  if (srNum > 150) insights.push({ type: 'strength', emoji: '🔥', title: 'Aggressive Batsman', desc: `Strike Rate ${sr} — hits big from ball one.` });
  else if (srNum > 120) insights.push({ type: 'strength', emoji: '⚡', title: 'Power Hitter', desc: `Strike Rate ${sr} — scores at a very good pace.` });
  else if (srNum < 70 && bat.total > 2) insights.push({ type: 'weakness', emoji: '🐢', title: 'Needs to Accelerate', desc: `Strike Rate ${sr} is below par.` });

  if (avgNum > 40) insights.push({ type: 'strength', emoji: '📈', title: 'Consistent Performer', desc: `Batting average of ${avg} — rarely gets out cheaply.` });
  else if (avgNum < 15 && bat.total > 2) insights.push({ type: 'weakness', emoji: '🔴', title: 'Inconsistent Batting', desc: `Average of ${avg} needs improvement.` });

  if (bat.sixes >= 5 && bat.total > 0) insights.push({ type: 'strength', emoji: '💪', title: 'Six-Hitting Machine', desc: `${bat.sixes} sixes across career.` });

  if (bowl.wickets > 0) {
    if (wpMatch > 2) insights.push({ type: 'strength', emoji: '🎯', title: 'Strike Bowler', desc: `${wpMatch.toFixed(1)} wickets per match.` });
    if (ecoNum < 6) insights.push({ type: 'strength', emoji: '🛡️', title: 'Economical Bowler', desc: `Economy rate of ${eco} is excellent.` });
    else if (ecoNum > 10 && bowl.wickets > 0) insights.push({ type: 'weakness', emoji: '💸', title: 'Costly Bowler', desc: `Economy of ${eco} — concedes too many runs.` });
    if (!isNaN(baNum) && baNum < 20 && bowl.wickets > 3) insights.push({ type: 'strength', emoji: '🏆', title: 'Bowling Ace', desc: `Bowling average of ${ba} is outstanding.` });
  }

  if (bat.hundreds > 0) insights.push({ type: 'strength', emoji: '💯', title: 'Century Scorer', desc: `${bat.hundreds} century(s) in career!` });
  if (bat.fifties >= 3) insights.push({ type: 'strength', emoji: '⭐', title: 'Half-Century Maker', desc: `${bat.fifties} fifties — loves to build innings.` });

  if (stats.field.catches + stats.field.stumpings + stats.field.runouts >= 5)
    insights.push({ type: 'strength', emoji: '🧤', title: 'Sharp Fielder', desc: `${stats.field.catches} catches, ${stats.field.runouts} run-outs.` });

  if (bat.motm >= 3) insights.push({ type: 'strength', emoji: '🏅', title: 'Match Winner', desc: `${bat.motm} Man of the Match awards!` });

  if (!insights.length) insights.push({ type: 'neutral', emoji: '📊', title: 'Building Career', desc: 'Add more matches to unlock detailed insights.' });

  return insights;
}

// ===== LAST N MATCH TREND =====
function getLastNMatches(mobile, n = 5) {
  return getMatchesByPlayer(mobile).slice(0, n).reverse();
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

// ===== SIDEBAR TOGGLE =====
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');
  const closeBtn = document.getElementById('sidebar-close');
  if (!sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  if (hamburger) hamburger.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
}

// ===== HIGHLIGHT ACTIVE NAV =====
function highlightNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href === current) item.classList.add('active');
  });
}

// ===== FORMAT HELPERS =====
function fmt(v, decimals = 2) {
  const n = parseFloat(v);
  return isNaN(n) ? '-' : n.toFixed(decimals);
}
function fmtInt(v) { return parseInt(v) || 0; }
function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ===== EXPORT TO TEXT =====
function exportToText(mobile) {
  const player = getPlayerByMobile(mobile);
  if (!player) return;
  const stats = calcStats(mobile);
  const matches = getMatchesByPlayer(mobile);

  let txt = `CRICKET CAREER SCORECARD\n`;
  txt += `${'='.repeat(50)}\n`;
  txt += `Player: ${player.name}\n`;
  txt += `Mobile: ${player.mobile}\n`;
  txt += `Type: ${player.matchType}  Role: ${player.role}\n`;
  txt += `${'='.repeat(50)}\n\n`;

  txt += `BATTING STATS\n${'-'.repeat(30)}\n`;
  txt += `Matches: ${stats.bat.total}  Runs: ${stats.bat.runs}  Highest: ${stats.bat.highest}\n`;
  txt += `Average: ${stats.avg}  Strike Rate: ${stats.sr}\n`;
  txt += `4s: ${stats.bat.fours}  6s: ${stats.bat.sixes}  50s: ${stats.bat.fifties}  100s: ${stats.bat.hundreds}\n`;
  txt += `Man of Match: ${stats.bat.motm}\n\n`;

  txt += `BOWLING STATS\n${'-'.repeat(30)}\n`;
  txt += `Wickets: ${stats.bowl.wickets}  Best: ${stats.bestBowl}\n`;
  txt += `Economy: ${stats.eco}  Average: ${stats.ba}  Maidens: ${stats.bowl.maidens}\n\n`;

  txt += `FIELDING STATS\n${'-'.repeat(30)}\n`;
  txt += `Catches: ${stats.field.catches}  Run Outs: ${stats.field.runouts}  Stumpings: ${stats.field.stumpings}\n\n`;

  txt += `MATCH HISTORY\n${'-'.repeat(30)}\n`;
  matches.forEach((m, i) => {
    txt += `${i + 1}. ${fmtDate(m.matchDate)} | ${m.tournament || '-'} | ${m.matchType}\n`;
    txt += `   Bat: ${m.runs}(${m.balls}) | Bowl: ${m.wickets}/${m.bRuns} (${m.overs} ov) | Catches: ${m.catches}\n`;
  });

  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${player.name.replace(/ /g, '_')}_career.txt`;
  a.click();
  showToast('Career stats downloaded!');
}

// ===== DB INIT — LOADS DATA INTO CACHE ON PAGE LOAD =====
// All pages call this so the sync functions work correctly
async function initDB() {
  try {
    await Promise.all([
      loadPlayersFromDB(),
      loadMatchesFromDB(),
      loadAdminPwFromDB()
    ]);
  } catch (e) {
    console.warn('[CricDB] Failed to load from Firebase, falling back to localStorage', e);
    _playersCache = JSON.parse(localStorage.getItem('crick_players') || '[]');
    _matchesCache = JSON.parse(localStorage.getItem('crick_matches') || '[]');
    _adminPwCache = localStorage.getItem('crick_admin_pw') || 'admin@cricket123';
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  highlightNav();
});
