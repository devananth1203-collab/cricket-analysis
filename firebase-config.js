// ===== FIREBASE CONFIG FOR CRICANALYTICS PRO =====
// 🔧 HOW TO SETUP (One-time, takes 3 minutes):
// 1. Go to https://console.firebase.google.com/
// 2. Click "+ Add project" → name it "CricAnalytics"
// 3. Disable Google Analytics → Create project
// 4. Click "Realtime Database" in left menu → Create Database → Start in TEST mode
// 5. Click the gear icon → Project Settings → scroll to "Your apps" → Web (</>)
// 6. Register app → copy the firebaseConfig values below
// 7. Replace the placeholder values below with your real values

const firebaseConfig = {
  apiKey: "AIzaSyDEMO_REPLACE_WITH_YOUR_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// ===== FIREBASE INITIALIZATION =====
let db = null;
let firebaseEnabled = false;

// In-memory cache (used as fallback when Firebase is offline/unconfigured)
let _playersCache = null;
let _matchesCache = null;
let _adminPwCache = null;

// Detect if config is placeholder
const isFirebaseConfigured = () =>
  firebaseConfig.databaseURL &&
  !firebaseConfig.databaseURL.includes('your-project') &&
  !firebaseConfig.apiKey.includes('DEMO');

// Initialize Firebase
function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.warn('[CricDB] Firebase not configured — using localStorage fallback. See firebase-config.js for setup instructions.');
    return false;
  }
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    firebaseEnabled = true;
    console.log('[CricDB] Firebase connected ✅');
    return true;
  } catch (e) {
    console.warn('[CricDB] Firebase init failed, using localStorage:', e.message);
    return false;
  }
}

// ===== ONLINE DATA HELPERS =====

// Read data from Firebase (returns Promise)
function fbRead(path) {
  return db.ref(path).once('value').then(snap => snap.val());
}

// Write data to Firebase (returns Promise)
function fbWrite(path, data) {
  return db.ref(path).set(data);
}

// Subscribe to real-time updates
function fbListen(path, callback) {
  if (!firebaseEnabled) return;
  db.ref(path).on('value', snap => callback(snap.val()));
}

// ===== ONLINE PLAYER FUNCTIONS =====

async function loadPlayersFromDB() {
  if (!firebaseEnabled) {
    _playersCache = JSON.parse(localStorage.getItem('crick_players') || '[]');
    return _playersCache;
  }
  const data = await fbRead('players');
  _playersCache = data ? Object.values(data) : [];
  return _playersCache;
}

async function savePlayerToDB(player) {
  // Update cache immediately
  if (!_playersCache) _playersCache = [];
  const idx = _playersCache.findIndex(p => p.mobile === player.mobile);
  if (idx >= 0) _playersCache[idx] = player;
  else _playersCache.push(player);

  if (!firebaseEnabled) {
    localStorage.setItem('crick_players', JSON.stringify(_playersCache));
    return;
  }
  // Use mobile as key (sanitized)
  const key = player.mobile.replace(/[.#$[\]]/g, '_');
  await fbWrite(`players/${key}`, player);
}

async function deletePlayerFromDB(mobile) {
  if (!_playersCache) _playersCache = [];
  _playersCache = _playersCache.filter(p => p.mobile !== mobile);

  if (!firebaseEnabled) {
    localStorage.setItem('crick_players', JSON.stringify(_playersCache));
    await deletePlayerMatchesFromDB(mobile);
    return;
  }
  const key = mobile.replace(/[.#$[\]]/g, '_');
  await db.ref(`players/${key}`).remove();
  await deletePlayerMatchesFromDB(mobile);
}

// ===== ONLINE MATCH FUNCTIONS =====

async function loadMatchesFromDB() {
  if (!firebaseEnabled) {
    _matchesCache = JSON.parse(localStorage.getItem('crick_matches') || '[]');
    return _matchesCache;
  }
  const data = await fbRead('matches');
  _matchesCache = data ? Object.values(data) : [];
  return _matchesCache;
}

async function saveMatchToDB(match) {
  if (!_matchesCache) _matchesCache = [];
  const idx = _matchesCache.findIndex(m => m.id === match.id);
  if (idx >= 0) _matchesCache[idx] = match;
  else _matchesCache.push(match);

  if (!firebaseEnabled) {
    localStorage.setItem('crick_matches', JSON.stringify(_matchesCache));
    return;
  }
  await fbWrite(`matches/${match.id}`, match);
}

async function saveMatchesToDB(matches) {
  _matchesCache = matches;
  if (!firebaseEnabled) {
    localStorage.setItem('crick_matches', JSON.stringify(matches));
    return;
  }
  // Rebuild the matches node
  const obj = {};
  matches.forEach(m => { obj[m.id] = m; });
  await fbWrite('matches', Object.keys(obj).length ? obj : null);
}

async function deleteMatchFromDB(id) {
  if (!_matchesCache) _matchesCache = [];
  _matchesCache = _matchesCache.filter(m => m.id !== id);

  if (!firebaseEnabled) {
    localStorage.setItem('crick_matches', JSON.stringify(_matchesCache));
    return;
  }
  await db.ref(`matches/${id}`).remove();
}

async function deletePlayerMatchesFromDB(mobile) {
  if (!_matchesCache) await loadMatchesFromDB();
  const remaining = (_matchesCache || []).filter(m => m.playerMobile !== mobile);
  await saveMatchesToDB(remaining);
}

// ===== ADMIN PASSWORD =====
async function loadAdminPwFromDB() {
  if (!firebaseEnabled) {
    _adminPwCache = localStorage.getItem('crick_admin_pw') || 'admin@cricket123';
    return _adminPwCache;
  }
  const pw = await fbRead('adminPw');
  _adminPwCache = pw || 'admin@cricket123';
  return _adminPwCache;
}

async function saveAdminPwToDB(pw) {
  _adminPwCache = pw;
  if (!firebaseEnabled) {
    localStorage.setItem('crick_admin_pw', pw);
    return;
  }
  await fbWrite('adminPw', pw);
}

// ===== INIT ON SCRIPT LOAD =====
initFirebase();
