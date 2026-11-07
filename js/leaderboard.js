/*
  LIARHUNT — leaderboard + top-10 rewards
  Backend: Firebase (Firestore + anonymous sign-in), free plan is plenty.
  Switched on by pasting your Firebase web config into js/config.js (see README).
  Add ?lb=demo to the address to try the leaderboard with demo players (nothing is uploaded).

  WLLB.enabled()                      is the leaderboard switched on?
  WLLB.submitDaily(entry)             post today's result      -> Promise
  WLLB.topDaily(day)                  top 10 of a day           -> Promise<rows>
  WLLB.ladder.*                       the season ladder (league points)
  WLLB.myId()                         this player's id (after the first call)
  WLLB.rewardsFor(days, history)      finished days -> ranks   -> Promise<[{day, rank}]>
*/
(function () {
  "use strict";
  var CFG = (window.WL_CONFIG && window.WL_CONFIG.leaderboard) || {};
  var fb = CFG.firebase;
  var provider = fb && fb.apiKey && fb.projectId ? "firebase" : "none";
  try { if (new URLSearchParams(location.search).get("lb") === "demo") provider = "demo"; } catch (e) { /* ignore */ }

  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var LIMIT = 10; // the board shows the top 10, and they win the badges
  var db = null, uid = null, readyP = null;

  var TIERS = [
    { max: 1, icon: "🥇", name: "Chief Inspector" },
    { max: 2, icon: "🥈", name: "Inspector" },
    { max: 3, icon: "🥉", name: "Sergeant" },
    { max: 10, icon: "🎖️", name: "Detective" }
  ];
  function tierFor(rank) {
    for (var i = 0; i < TIERS.length; i++) if (rank >= 1 && rank <= TIERS[i].max) return TIERS[i];
    return null;
  }

  /* Names: the same rules everywhere, so they live in engine.js (the profile works without the leaderboard). */
  var BLOCK = window.WL.NAME_BLOCK, cleanName = window.WL.cleanName;

  /* The leaderboard for a day closes 38 hours after that day starts in UTC,
     after every time zone has finished it. Rewards are given after that. */
  function dayStartUTC(d) {
    var p = String((window.WL_CONFIG || {}).launchDate || "2026-10-26").split("-").map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]) + (d - 1) * 86400000;
  }
  function isFinal(d) { return Date.now() >= dayStartUTC(d) + 38 * 3600000; }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = res;
      s.onerror = function () { rej(new Error("Couldn't load " + src)); };
      document.head.appendChild(s);
    });
  }

  function ready() {
    if (readyP) return readyP;
    if (provider === "demo") { uid = demoId(); readyP = Promise.resolve(uid); return readyP; }
    if (provider !== "firebase") return Promise.reject(new Error("Leaderboard is off"));
    // all three download at once; async = false still runs them in this order
    readyP = Promise.all(["app", "auth", "firestore"].map(function (n) { return loadScript(SDK + "firebase-" + n + "-compat.js"); }))
      .then(function () {
        var firebase = window.firebase;
        if (!firebase.apps.length) firebase.initializeApp(fb);
        db = firebase.firestore();
        // testing only (?test=1&tabauth=1): every tab signs in as its own player, to try a live room alone
        var solo = /[?&]test=1/.test(location.search) && /[?&]tabauth=1/.test(location.search);
        var auth = firebase.auth();
        return (solo ? auth.setPersistence(firebase.auth.Auth.Persistence.NONE) : Promise.resolve())
          .then(function () { return new Promise(function (res) { var off = auth.onAuthStateChanged(function (u) { off(); res(u); }); }); })
          .then(function (u) { return u || auth.signInAnonymously().then(function (c) { return c.user; }); });
      })
      .then(function (u) { uid = u.uid; return uid; });
    readyP.catch(function (e) { console.warn("[leaderboard]", e && e.message ? e.message : e); readyP = null; });
    return readyP;
  }

  function friendlyError(e) {
    var code = e && e.code ? e.code : "";
    if (code === "demo") return "Not available in demo mode.";
    if (code === "not-found") return "That group code doesn't exist. Check it and try again.";
    if (code === "full") return "That group is full (50 detectives).";
    if (code === "no-room") return "That room doesn't exist any more. Ask for a new link.";
    if (code === "room-full") return "That room is full (10 detectives).";
    if (code === "room-full-2") return "This Partners room is full. Ask your friend for a new link.";
    if (code === "failed-precondition") {
      console.warn("[leaderboard] Firestore needs an index. Open the link in this message to create it:", e.message);
      return "The leaderboard is still being set up. Try again in a few minutes.";
    }
    if (code === "permission-denied") return "The leaderboard didn't accept that score.";
    if (code === "unavailable" || !navigator.onLine) return "You're offline. Check your connection and try again.";
    return "Couldn't reach the leaderboard. Try again in a moment.";
  }

  /* ---------- demo backend (local only, clearly labelled in the UI) ---------- */
  var DEMO_KEY = "whoslying:lbdemo";
  function demoId() {
    try { var id = localStorage.getItem(DEMO_KEY + ":id"); if (!id) { id = "demo-" + Math.random().toString(36).slice(2, 10); localStorage.setItem(DEMO_KEY + ":id", id); } return id; }
    catch (e) { return "demo-me"; }
  }
  function demoStore() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || { scores: {}, endless: {} }; } catch (e) { return { scores: {}, endless: {} }; } }
  function demoSave(s) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }

  /* ---------- demo detectives ----------
     Made-up players for the ?lb=demo preview only (the board says "demo" there). Real boards show real
     players only: no fake names in ranks, totals or top-10 rewards. Seeded by the day (or season). */
  var BOT_NAMES = ["Sherlock_K", "NoirNeha", "AgentOmar", "Miss Marple", "TruthSeeker", "Kenji.D", "LieDetector", "Amara77", "Inspector V",
    "Detective Li", "CaseClosed", "Priya_P", "Sam Spade", "ColdCase", "Zara Q", "Hiro", "Lucía", "Femi", "Astrid", "Rafael",
    "SharpEyes", "Watson2", "Nadia", "Poirot_fan", "Arjun", "Jonas", "Mei", "Diego", "Ingrid", "Kwame"];
  function bots(kind, key) {
    var W = window.WL, r = W.rngFrom("bots-" + kind + "-" + key), names = BOT_NAMES.slice(), out = [];
    var played = kind === "season" || kind === "ladder" ? Math.max(0, Math.min(W.SEASON_DAYS, W.dayNumber() - (W.SEASON_ONE + (key - 1) * W.SEASON_DAYS) + 1)) : 0;
    for (var i = 0; i < (kind === "ladder" ? 30 : 12); i++) {
      var b = { uid: "bot-" + i, name: names.splice(Math.floor(r() * names.length), 1)[0], badge: r() < 0.3 ? TIERS[Math.floor(r() * TIERS.length)].icon : "" };
      if (kind === "daily") { b.day = key; b.score = 5 - Math.floor(Math.pow(r(), 1.4) * 4); b.timeMs = Math.round(75000 + r() * 180000); }
      else if (kind === "endless") b.best = Math.round(3 + Math.pow(r(), 1.5) * 30);
      else if (kind === "ladder") {
        b.season = key; b.days = played ? Math.max(1, Math.round(played * (0.4 + 0.6 * r()))) : 0; b.lp = Math.round(Math.pow(r(), 1.3) * 3200);
        b.tier = W.tierOf(b.lp); b.rate = Math.round(500 + r() * 480); b.failRate = Math.round(r() * 700); b.av = "f" + String(Math.floor(r() * 16)).padStart(2, "0");
      }
      else { b.days = Math.round(played * (0.5 + r() * 0.5)); b.pts = Math.round(b.days * (3 + r() * 1.6)); b.timeMs = b.days * Math.round(90000 + r() * 120000); }
      if ((kind !== "season" && kind !== "ladder") || b.days) out.push(b);
    }
    return out;
  }
  var ORDER = {
    daily: function (a, b) { return b.score - a.score || a.timeMs - b.timeMs; },
    endless: function (a, b) { return b.best - a.best; },
    season: function (a, b) { return b.pts - a.pts || a.timeMs - b.timeMs; },
    ladder: function (a, b) { return b.lp - a.lp || b.rate - a.rate || a.failRate - b.failRate; }
  };
  function withBots(kind, key, n) {
    return function (rows) { return provider !== "demo" ? rows : rows.concat(bots(kind, key)).sort(ORDER[kind]).slice(0, n || LIMIT); };
  }
  // The standing { rank, total }; the demo preview counts its made-up players too.
  function plusBots(kind, key, me) {
    return function (st) {
      if (provider !== "demo") return st;
      var list = bots(kind, key);
      return { rank: st.rank + list.filter(function (b) { return ORDER[kind](b, me) < 0; }).length, total: st.total + list.length };
    };
  }

  /* ---------- counting (Firestore REST: the compat SDK can't count) ---------- */
  function demoOff() { var e = new Error("demo"); e.code = "demo"; return Promise.reject(e); }
  function restCount(coll, filters, order) {
    var f = filters.map(function (x) { return { fieldFilter: { field: { fieldPath: x[0] }, op: x[1], value: { integerValue: String(x[2]) } } }; });
    var q = { from: [{ collectionId: coll }], where: f.length === 1 ? f[0] : { compositeFilter: { op: "AND", filters: f } } };
    if (order) q.orderBy = order.map(function (o) { return { field: { fieldPath: o[0] }, direction: o[1] }; });
    return fetch("https://firestore.googleapis.com/v1/projects/" + fb.projectId + "/databases/(default)/documents:runAggregationQuery?key=" + fb.apiKey, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: q, aggregations: [{ alias: "n", count: {} }] } })
    }).then(function (r) { return r.json(); }).then(function (j) {
      var row = Array.isArray(j) ? j[0] : j;
      if (!row || !row.result) throw new Error((row && row.error && row.error.message) || "Count failed");
      return +row.result.aggregateFields.n.integerValue;
    });
  }
  // Rank of a result among everyone with the same eq fields: higher `key` first, then less time.
  function standing(coll, eq, key, val, t) {
    if (provider !== "firebase") return demoOff();
    var base = eq.map(function (e) { return [e[0], "EQUAL", e[1]]; });
    return Promise.all([
      restCount(coll, base),
      restCount(coll, base.concat([[key, "GREATER_THAN", val]]), [[key, "DESCENDING"], ["timeMs", "ASCENDING"]]),
      restCount(coll, base.concat([[key, "EQUAL", val], ["timeMs", "LESS_THAN", t]]), [["timeMs", "ASCENDING"]])
    ]).then(function (n) { var rank = n[1] + n[2] + 1; return { rank: rank, total: Math.max(n[0], rank) }; });
  }

  /* ---------- season ladder ----------
     One entry per player per season (ladder/{season}_{uid}). Each Daily adds one day, scored by WL.ladderApply;
     firebase/firestore.rules checks the same sums against the player's posted score, so LP can't be made up. */
  var LADDER_TOP = 40;
  function demoLadder() { var s = demoStore(); s.ladder = s.ladder || {}; return s; }
  var ladder = {
    mine: function (season) {
      if (season < 1) return Promise.resolve(null);
      return ready().then(function () {
        if (provider === "demo") return demoLadder().ladder[season + "_" + uid] || null;
        return db.collection("ladder").doc(season + "_" + uid).get().then(function (s) { return s.exists ? s.data() : null; });
      });
    },
    // e: { name, av, badge, day, grid }. Adds that day to its season's entry. -> the entry, or null (already in, or before Season 1)
    post: function (e) {
      var W = window.WL, season = W.seasonOf(e.day);
      if (!season) return Promise.resolve(null);
      return Promise.all([ladder.mine(season), ladder.mine(season - 1)]).then(function (r) {
        var cur = r[0], f = W.ladderApply(cur, e.day, e.grid, W.seasonStartLp(r[1] ? r[1].tier : null));
        if (!f) return null;
        var doc = Object.assign({ uid: uid, name: e.name, badge: e.badge || "", season: season }, f);
        if (W.okFace(e.av)) doc.av = e.av;
        if (provider === "demo") { var s = demoLadder(); s.ladder[season + "_" + uid] = Object.assign({}, cur || {}, doc); demoSave(s); return doc; }
        doc.updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
        var ref = db.collection("ladder").doc(season + "_" + uid);
        return (cur ? ref.update(doc) : ref.set(doc)).then(function () { return doc; });
      });
    },
    // A new name, face or badge on this season's entry (only if there is one).
    profile: function (season, p) {
      var u = { name: p.name, badge: p.badge || "" };
      if (window.WL.okFace(p.av)) u.av = p.av;
      return ladder.mine(season).then(function (cur) {
        if (!cur) return;
        if (provider === "demo") { var s = demoLadder(); Object.assign(s.ladder[season + "_" + uid], u); demoSave(s); return; }
        u.updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
        return db.collection("ladder").doc(season + "_" + uid).update(u);
      });
    },
    // The season's top 40: most LP first (so the higher league first), then solve rate, then fewer fails.
    top: function (season) {
      return ready().then(function () {
        if (provider === "demo") { var s = demoLadder(); return Object.keys(s.ladder).map(function (k) { return s.ladder[k]; }).filter(function (d) { return d.season === season; }); }
        return db.collection("ladder").where("season", "==", season).orderBy("lp", "desc").orderBy("rate", "desc").orderBy("failRate", "asc").limit(LADDER_TOP).get()
          .then(function (snap) { return snap.docs.map(function (d) { return d.data(); }); });
      }).then(withBots("ladder", season, LADDER_TOP));
    },
    // { rank, total } by LP alone.
    standing: function (season, lp) {
      if (provider === "demo") {
        return ladder.top(season).then(function () {
          var all = bots("ladder", season), mine = demoLadder().ladder[season + "_" + uid];
          if (mine) all.push(mine);
          return { rank: all.filter(function (b) { return b.lp > lp; }).length + 1, total: all.length };
        });
      }
      if (provider !== "firebase") return demoOff();
      var base = [["season", "EQUAL", season]];
      return Promise.all([restCount("ladder", base), restCount("ladder", base.concat([["lp", "GREATER_THAN", lp]]), [["lp", "DESCENDING"]])])
        .then(function (n) { return { rank: n[1] + 1, total: Math.max(n[0], n[1] + 1) }; });
    },
    TOP: LADDER_TOP
  };

  var LEAGUES = window.WL.LADDER.names.map(function (n, i) { return { name: n, icon: window.WL.LADDER.icons[i] }; });

  /* ---------- friend groups ---------- */
  var CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  function newCode() { var c = ""; for (var i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }
  function cleanCode(raw) { var c = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return /^[A-Z2-9]{6}$/.test(c) ? c : ""; }
  function cleanGroupName(raw) {
    var n = String(raw || "").replace(/\s+/g, " ").trim();
    if (n.length < 2 || n.length > 24) return { ok: false, msg: "Use 2 to 24 characters." };
    if (BLOCK.test(n.replace(/[\s._-]/g, ""))) return { ok: false, msg: "Please pick a different name." };
    return { ok: true, name: n };
  }
  function err(code, msg) { var e = new Error(msg); e.code = code; return e; }

  /* ---------- accounts: each player's save lives at players/{uid} ----------
     Every player has a Firebase account from their first visit (anonymous until they sign in with Google).
     Signing in with Google upgrades that same account, so the save keeps its place. On another device,
     signing in with Google switches to the existing account. Saves carry a revision number: a save is
     refused ("conflict") when another device saved since this one loaded, so old progress never
     overwrites newer progress. Demo mode (?lb=demo) keeps the account in localStorage. */
  var DEMO_ACC = "whoslying:demo-account";
  function demoAcc() { try { return JSON.parse(localStorage.getItem(DEMO_ACC)) || {}; } catch (e) { return {}; } }
  function demoAccSave(a) { try { localStorage.setItem(DEMO_ACC, JSON.stringify(a)); } catch (e) { /* ignore */ } }
  function playerRef() { return db.collection("players").doc(uid); }
  var account = {
    // -> { uid, google: bool, email, name }
    info: function () {
      if (provider === "demo") { var a = demoAcc(); return { uid: uid, google: !!a.email, email: a.email || "", name: a.email ? "Demo Detective" : "" }; }
      var u = window.firebase && window.firebase.auth().currentUser;
      if (!u) return null;
      var g = (u.providerData || []).filter(function (x) { return x && x.providerId === "google.com"; })[0];
      return { uid: u.uid, google: !!g, email: (g && g.email) || u.email || "", name: (g && g.displayName) || u.displayName || "" };
    },
    // -> Promise of { data, xp, rev } or null when this account has no save yet
    load: function () {
      return ready().then(function () {
        if (provider === "demo") { var d = demoAcc().save; return d && d.uid === uid ? d : null; }
        // One plain request (same security rules) instead of the SDK's get(), which first opens a streaming
        // channel: several round trips that kept the loading screen up for seconds on slow connections.
        return window.firebase.auth().currentUser.getIdToken().then(function (tok) {
          return fetch("https://firestore.googleapis.com/v1/projects/" + fb.projectId + "/databases/(default)/documents/players/" + uid,
            { headers: { Authorization: "Bearer " + tok }, cache: "no-store" });
        }).then(function (r) {
          if (r.status === 404) return null;
          return r.json().then(function (j) {
            var st = j && j.error && j.error.status;
            if (!r.ok) throw err(st ? String(st).toLowerCase().replace(/_/g, "-") : "unavailable", (j.error && j.error.message) || "Couldn't load the save");
            var f = j.fields || {}, num = function (v) { return v ? +(v.integerValue || v.doubleValue || 0) : 0; };
            return { data: f.data && f.data.stringValue, xp: num(f.xp), rev: num(f.rev) };
          });
        });
      });
    },
    // Saves the game. rev = the revision this device loaded. force: overwrite whatever is there. -> Promise of the new rev
    save: function (json, xp, rev, force) {
      return ready().then(function () {
        if (provider === "demo") {
          var a = demoAcc(), cur = a.save && a.save.uid === uid ? a.save.rev : 0;
          if (!force && cur !== (rev || 0)) throw err("conflict", "Saved on another device");
          a.save = { uid: uid, data: json, xp: xp, rev: cur + 1 }; demoAccSave(a);
          return cur + 1;
        }
        return db.runTransaction(function (t) {
          return t.get(playerRef()).then(function (s) {
            var cur = s.exists ? s.data().rev || 0 : 0;
            if (!force && cur !== (rev || 0)) throw err("conflict", "Saved on another device");
            t.set(playerRef(), { data: json, xp: xp, rev: cur + 1, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
            return cur + 1;
          });
        });
      });
    },
    // Deletes this account's save (Reset all progress).
    remove: function () {
      return ready().then(function () {
        if (provider === "demo") { var a = demoAcc(); delete a.save; demoAccSave(a); return; }
        return playerRef().delete();
      });
    },
    // Signs in with Google. -> Promise of { switched }: true when this Google account already had a game
    // somewhere else, so this device is now signed in to that one (load its save next).
    google: function () {
      return ready().then(function () {
        if (provider === "demo") { var a = demoAcc(); a.email = "detective@example.com"; demoAccSave(a); return { switched: false }; }
        var auth = window.firebase.auth(), G = window.firebase.auth.GoogleAuthProvider, gp = new G(), u = auth.currentUser;
        gp.setCustomParameters({ prompt: "select_account" });
        if (u && !u.isAnonymous) return { switched: false };
        return u.linkWithPopup(gp).then(function () { return { switched: false }; }, function (e) {
          var cred = e && (e.credential || (G.credentialFromError && G.credentialFromError(e)));
          if (e && e.code === "auth/credential-already-in-use" && cred) {
            return auth.signInWithCredential(cred).then(function (c) { uid = c.user.uid; return { switched: true }; });
          }
          throw e;
        });
      });
    },
    // Signs out. The next visit starts a new anonymous account (the Google account keeps its save).
    signOut: function () {
      if (provider === "demo") { var a = demoAcc(); delete a.email; delete a.save; demoAccSave(a); try { localStorage.removeItem(DEMO_KEY + ":id"); } catch (e) { /* ignore */ } return Promise.resolve(); }
      return ready().then(function () { return window.firebase.auth().signOut(); });
    }
  };
  function accountError(e) {
    var c = (e && e.code) || "";
    if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "";
    if (c === "auth/popup-blocked") return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    if (c === "auth/operation-not-allowed") return "Google sign-in isn't switched on for this game yet.";
    if (c === "auth/unauthorized-domain") return "Sign-in isn't set up for this web address yet.";
    if (c === "auth/network-request-failed" || !navigator.onLine) return "You're offline. Check your connection and try again.";
    return "Couldn't sign in. Try again in a moment.";
  }

  /* ---------- old save codes (retired): a 12-letter code could restore a backup ----------
     No new codes are made for players. An old code (or restore link) still brings its progress into the
     player's account, and moving the game to a new web address uses one to carry progress over. */
  function newSaveCode() {
    var a = new Uint32Array(12), c = "";
    window.crypto.getRandomValues(a);
    for (var i = 0; i < 12; i++) c += CODE_CHARS[a[i] % CODE_CHARS.length];
    return c;
  }
  function cleanSaveCode(raw) { var c = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return /^[A-Z2-9]{12}$/.test(c) ? c : ""; }

  /* ---------- live rooms: one link, several players, the same cases at the same time ----------
     rooms/{code}: host, hostName, seed, season, state (lobby, play, end), round, rounds, roundAt,
       mode ("race" when missing, "partners" or "night") and story (Story Night: the nights/{id} it plays)
     rooms/{code}/players/{uid}: name, score, ans { round: { ok, ms, pts } }, at (last "still here" ping), seen (played this story before)
     A player who hasn't pinged for STALE ms (phone locked, tab closed, link reopened in another browser) doesn't hold a seat.
     In demo mode (?lb=demo) a room lives in localStorage, so tabs on one computer can play together:
     each tab is its own player. */
  var ROOM_MAX = 10, STALE = 180000, DEMO_ROOM = "whoslying:room:", roomWatchers = {};
  function roomMax(room) { return room && room.mode === "partners" ? 2 : ROOM_MAX; }
  function seated(players, me) {
    return Object.keys(players).filter(function (id) { var p = players[id]; return id === me || !p.at || Date.now() - p.at < STALE; }).length;
  }
  function tabId() {
    try { var id = sessionStorage.getItem("wl-tab"); if (!id) { id = "tab-" + Math.random().toString(36).slice(2, 8); sessionStorage.setItem("wl-tab", id); } return id; }
    catch (e) { return "tab-me"; }
  }
  function roomMe() { return provider === "demo" ? tabId() : uid; }
  function demoRoom(code) { try { return JSON.parse(localStorage.getItem(DEMO_ROOM + code)); } catch (e) { return null; } }
  function demoRoomSave(code, r) { try { localStorage.setItem(DEMO_ROOM + code, JSON.stringify(r)); } catch (e) { /* ignore */ } fireRoom(code); }
  function fireRoom(code) { (roomWatchers[code] || []).forEach(function (f) { f(); }); }
  window.addEventListener("storage", function (e) { if (e.key && e.key.indexOf(DEMO_ROOM) === 0) fireRoom(e.key.slice(DEMO_ROOM.length)); });
  function roomRef(code) { return db.collection("rooms").doc(code); }
  function stamp() { return window.firebase.firestore.FieldValue.serverTimestamp(); }
  function ms(t) { return t && t.toMillis ? t.toMillis() : typeof t === "number" ? t : Date.now(); }
  var rooms = {
    MAX: ROOM_MAX,
    me: roomMe,
    STALE: STALE,
    maxFor: roomMax,
    // o: { name, seed, season, rounds, mode } -> Promise of the new room code
    create: function (o) {
      return ready().then(function () {
        var doc = { host: roomMe(), hostName: o.name, seed: o.seed, season: o.season, state: "lobby", round: 0, rounds: o.rounds };
        if (o.mode && o.mode !== "race") doc.mode = o.mode;
        if (o.mode === "night") doc.story = "";
        if (provider === "demo") {
          var c = newCode();
          demoRoomSave(c, { room: Object.assign(doc, { roundAt: Date.now(), createdAt: Date.now() }), players: {} });
          return c;
        }
        var tries = 0;
        var attempt = function () {
          var code = newCode();
          return roomRef(code).set(Object.assign({}, doc, { roundAt: stamp(), createdAt: stamp() })).then(function () { return code; }, function (e) {
            if (e && e.code === "permission-denied" && ++tries < 4) return attempt(); // that code is taken
            throw e;
          });
        };
        return attempt();
      });
    },
    // Adds this player to the room (or renames them). -> Promise of the room
    join: function (code, name) {
      return ready().then(function () {
        var me = roomMe();
        if (provider === "demo") {
          var r = demoRoom(code);
          if (!r) throw err("no-room", "No such room");
          if (!r.players[me] && seated(r.players, me) >= roomMax(r.room)) throw err(r.room.mode === "partners" ? "room-full-2" : "room-full", "Room full");
          r.players[me] = Object.assign({ score: 0, ans: {}, joinedAt: Date.now() }, r.players[me] || {}, { name: name, at: Date.now() });
          demoRoomSave(code, r);
          return r.room;
        }
        return roomRef(code).get().then(function (s) {
          if (!s.exists) throw err("no-room", "No such room");
          return roomRef(code).collection("players").get().then(function (ps) {
            var mine = ps.docs.some(function (d) { return d.id === uid; }), all = {};
            ps.docs.forEach(function (d) { var x = d.data(); all[d.id] = { at: x.at ? ms(x.at) : 0 }; });
            if (!mine && seated(all, uid) >= roomMax(s.data())) throw err(s.data().mode === "partners" ? "room-full-2" : "room-full", "Room full");
            var p = roomRef(code).collection("players").doc(uid);
            return (mine ? p.update({ name: name, at: stamp() }) : p.set({ name: name, score: 0, ans: {}, joinedAt: stamp(), at: stamp() })).then(function () { return s.data(); });
          });
        });
      });
    },
    // Calls onRoom(room) and onPlayers({ id: player }) on every change. -> a function that stops watching
    watch: function (code, onRoom, onPlayers) {
      if (provider === "demo") {
        var f = function () { var r = demoRoom(code); if (r) { onRoom(r.room); onPlayers(r.players); } };
        (roomWatchers[code] = roomWatchers[code] || []).push(f);
        setTimeout(f, 0);
        return function () { roomWatchers[code] = (roomWatchers[code] || []).filter(function (x) { return x !== f; }); };
      }
      var stop1 = roomRef(code).onSnapshot(function (s) {
        if (!s.exists) return;
        var d = s.data();
        onRoom(Object.assign({}, d, { roundAt: ms(d.roundAt), createdAt: ms(d.createdAt) }));
      }, function (e) { console.warn("[room]", e && e.message); });
      var stop2 = roomRef(code).collection("players").onSnapshot(function (q) {
        var out = {};
        q.docs.forEach(function (d) { var x = d.data(); if (x.at) x.at = ms(x.at); out[d.id] = x; });
        onPlayers(out);
      }, function (e) { console.warn("[room]", e && e.message); });
      return function () { stop1(); stop2(); };
    },
    // Changes the room: { state, round, seed, roundAt: true (= now) }
    update: function (code, patch) {
      var p = Object.assign({}, patch);
      if (provider === "demo") {
        var r = demoRoom(code);
        if (!r) return Promise.reject(err("no-room", "No such room"));
        if (p.roundAt) p.roundAt = Date.now();
        Object.assign(r.room, p); demoRoomSave(code, r);
        return Promise.resolve();
      }
      if (p.roundAt) p.roundAt = stamp();
      return ready().then(function () { return roomRef(code).update(p); });
    },
    // This player's answer for a round, { ok, ms, pts }, and their new total.
    answer: function (code, round, a, score) {
      if (provider === "demo") {
        var r = demoRoom(code), me = roomMe();
        if (!r || !r.players[me]) return Promise.resolve();
        r.players[me].ans[round] = a; r.players[me].score = score; demoRoomSave(code, r);
        return Promise.resolve();
      }
      var u = { score: score }; u["ans." + round] = a;
      return ready().then(function () { return roomRef(code).collection("players").doc(uid).update(u); });
    },
    // "Still here", plus any of this player's own fields (seen). Keeps the seat while they flip to WhatsApp and back.
    ping: function (code, patch) {
      if (provider === "demo") {
        var r = demoRoom(code), me = roomMe();
        if (!r || !r.players[me]) return Promise.resolve();
        Object.assign(r.players[me], patch || {}, { at: Date.now() }); demoRoomSave(code, r);
        return Promise.resolve();
      }
      var u = Object.assign({}, patch || {}, { at: stamp() });
      return ready().then(function () { return roomRef(code).collection("players").doc(uid).update(u); });
    },
    // Clears this player's answers and score (the host started a new game in the same room).
    reset: function (code) {
      if (provider === "demo") {
        var r = demoRoom(code), me = roomMe();
        if (r && r.players[me]) { r.players[me].ans = {}; r.players[me].score = 0; demoRoomSave(code, r); }
        return Promise.resolve();
      }
      return ready().then(function () { return roomRef(code).collection("players").doc(uid).update({ ans: {}, score: 0 }); });
    },
    leave: function (code) {
      if (provider === "demo") {
        var r = demoRoom(code);
        if (r) { delete r.players[roomMe()]; demoRoomSave(code, r); }
        return Promise.resolve();
      }
      return ready().then(function () { return roomRef(code).collection("players").doc(uid).delete(); });
    }
  };

  /* ---------- Daily 5: one story a day in five connected cases ----------
     Firebase: the rules open each case only when the player reaches it, and check every answer against a key
     no player can read (firebase/firestore.rules). Each answer is two writes: commit the pick (it can't change
     afterwards), then resolve it once the reveal is open, so nobody can try answers until one sticks.
     ?d5=local&draft=ID plays a draft from the admin desk instead (node tools/daily5/admin.mjs).
     Everything returns a Promise. A doc that isn't open yet fails with code "permission-denied". */
  var d5mode = provider === "firebase" ? "firebase" : "", d5draft = "";
  try { var dq = new URLSearchParams(location.search); if (dq.get("d5") === "local" && dq.get("draft")) { d5mode = "local"; d5draft = dq.get("draft"); } } catch (e) { /* ignore */ }
  function d5local(action, n, body) {
    var opts = body ? { method: "POST", headers: { "Content-Type": "application/json", "X-D5": "1" }, body: JSON.stringify(body) } : {};
    return fetch("/api/play/" + encodeURIComponent(d5draft) + "/" + action + "/" + (n || 0), opts).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw err(r.status === 403 ? "permission-denied" : "unavailable", j.error || "preview error"); return j; });
    });
  }
  function d5doc(day, sub, n) { var r = db.collection("d5").doc(String(day)); return sub ? r.collection(sub).doc(String(n)) : r; }
  function runRef(day) { return db.collection("d5runs").doc(day + "_" + uid); }
  function dataOf(s) { return s.exists ? s.data() : null; }
  function deniedIsNull(e) { if (e && e.code === "permission-denied") return null; throw e; }
  function fv() { return window.firebase.firestore.FieldValue; }
  var d5 = !d5mode ? null : d5mode === "local" ? {
    mode: "local",
    edition: function () { return d5local("edition"); },
    run: function () { return d5local("run"); },
    start: function () { return d5local("start", 0, {}); },
    caseDoc: function (day, n) { return d5local("case", n); },
    commit: function (day, n, pick) { return d5local("commit", n, pick); },
    reveal: function (day, n) { return d5local("reveal", n); },
    resolve: function (day, n, letter) { return d5local("resolve", n, { letter: letter }); },
    hunch: function (day, n) { return d5local("hunch", n, {}); },
    hunchDoc: function () { return Promise.reject(err("permission-denied", "preview")); },
    finale: function () { return d5local("finale").catch(deniedIsNull); }
  } : {
    mode: "firebase",
    edition: function (day) { return ready().then(function () { return d5doc(day).get(); }).then(dataOf, deniedIsNull); },
    run: function (day) { return ready().then(function () { return runRef(day).get(); }).then(dataOf); },
    start: function (day, strikes) {
      return ready().then(function () {
        return runRef(day).set({ uid: uid, day: day, picks: {}, grid: "", strikes: strikes, hunch: 0, startedAt: fv().serverTimestamp() })
          .catch(function () { /* another tab started it first: read that one */ });
      }).then(function () { return runRef(day).get(); }).then(dataOf);
    },
    caseDoc: function (day, n) { return ready().then(function () { return d5doc(day, "cases", n).get(); }).then(dataOf); },
    commit: function (day, n, pick) {
      var u = {}; u["picks.c" + n] = { s: pick.s, p: pick.p, at: fv().serverTimestamp() };
      return ready().then(function () { return runRef(day).update(u); }).then(function () { return runRef(day).get(); }).then(dataOf);
    },
    reveal: function (day, n) { return ready().then(function () { return d5doc(day, "reveals", n).get(); }).then(dataOf); },
    resolve: function (day, n, letter, grid) {
      return ready().then(function () { return runRef(day).update({ grid: grid + letter }); }).then(function () { return runRef(day).get(); }).then(dataOf);
    },
    hunch: function (day, n) { return ready().then(function () { return runRef(day).update({ hunch: n }); }).then(function () { return d5.hunchDoc(day, n); }); },
    hunchDoc: function (day, n) { return ready().then(function () { return d5doc(day, "hunch", n).get(); }).then(dataOf); },
    finale: function (day) { return ready().then(function () { return d5doc(day, "end", "finale").get(); }).then(dataOf, deniedIsNull); }
  };

  /* ---------- Story Night: stories made for friends' rooms, never a Daily ----------
     nights/{id}: the edition (title, place, intro, cast, cases), with cases/{n}, reveals/{n} and end/finale.
     All public: friends' rooms check answers on each player's own phone, like every live room.
     Demo mode (?lb=demo) plays one built-in story. */
  var nightDemo = null;
  function demoNight() {
    return nightDemo = nightDemo || fetch("tools/daily5/fixtures/night-demo.json").then(function (r) { if (!r.ok) throw err("unavailable", "no demo story"); return r.json(); });
  }
  function nightDoc(id, sub, n) { var r = db.collection("nights").doc(String(id)); return sub ? r.collection(sub).doc(String(n)) : r; }
  function nightGet(id, sub, n) { return ready().then(function () { return nightDoc(id, sub, n).get(); }).then(dataOf); }
  var nights = provider === "none" ? null : {
    // -> Promise of [{ id, title, place, intro }], newest first
    list: function () {
      if (provider === "demo") return demoNight().then(function (x) { return [x.edition]; });
      return ready().then(function () { return db.collection("nights").orderBy("publishedAt", "desc").limit(40).get(); })
        .then(function (q) { return q.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); }); });
    },
    edition: function (id) { return provider === "demo" ? demoNight().then(function (x) { return x.edition; }) : nightGet(id).then(function (e) { return e && Object.assign(e, { id: id }); }); },
    caseDoc: function (id, n) { return provider === "demo" ? demoNight().then(function (x) { return x.cases[n]; }) : nightGet(id, "cases", n); },
    reveal: function (id, n) { return provider === "demo" ? demoNight().then(function (x) { return x.reveals[n]; }) : nightGet(id, "reveals", n); },
    finale: function (id) { return provider === "demo" ? demoNight().then(function (x) { return x.finale; }) : nightGet(id, "end", "finale"); }
  };

  /* ---------- public API ---------- */
  window.WLLB = {
    d5: d5,
    nights: nights,
    rooms: rooms,
    provider: provider,
    TIERS: TIERS,
    enabled: function () { return provider !== "none"; },
    isDemo: function () { return provider === "demo"; },
    myId: function () { return uid; },
    cleanName: cleanName,
    tierFor: tierFor,
    isFinal: isFinal,
    friendlyError: friendlyError,

    submitDaily: function (e) {
      return ready().then(function () {
        var doc = { uid: uid, name: e.name, badge: e.badge || "", day: e.day, score: e.score, timeMs: Math.max(20000, Math.round(e.timeMs)), grid: e.grid };
        if (window.WL.okFace(e.av)) doc.av = e.av;
        if (provider === "demo") {
          var s = demoStore(); s.scores[e.day + "_" + uid] = s.scores[e.day + "_" + uid] || doc; demoSave(s); return true;
        }
        doc.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        return db.collection("scores").doc(e.day + "_" + uid).set(doc).then(function () { return true; }, function (err) {
          if (err && err.code === "permission-denied") return false; // already posted today, or outside the time window
          throw err;
        });
      });
    },

    topDaily: function (day) {
      return ready().then(function () {
        if (provider === "demo") {
          var s = demoStore(), mine = [];
          Object.keys(s.scores).forEach(function (k) { if (s.scores[k].day === day) mine.push(s.scores[k]); });
          return mine;
        }
        return db.collection("scores").where("day", "==", day).orderBy("score", "desc").orderBy("timeMs", "asc").limit(LIMIT).get()
          .then(function (snap) { return snap.docs.map(function (d) { return d.data(); }); });
      }).then(withBots("daily", day));
    },

    /* Rank among everyone who posted today: { rank, total } */
    dailyStanding: function (day, score, timeMs) {
      var t = Math.max(20000, Math.round(timeMs));
      return standing("scores", [["day", day]], "score", score, t).then(plusBots("daily", day, { score: score, timeMs: t }));
    },
    // Everyone's Daily result is posted (without a name until they join), so counts and percentiles are real.
    // This puts the name on today's result once they join.
    nameDaily: function (day, name, badge, av) {
      var u = { name: name, badge: badge || "" };
      if (window.WL.okFace(av)) u.av = av;
      return ready().then(function () {
        if (provider === "demo") { var s = demoStore(), d = s.scores[day + "_" + uid]; if (d) { Object.assign(d, u); demoSave(s); } return true; }
        return db.collection("scores").doc(day + "_" + uid).update(u).then(function () { return true; }, function () { return false; });
      });
    },

    ladder: ladder,
    LEAGUES: LEAGUES,
    cleanCode: cleanCode,
    cleanGroupName: cleanGroupName,
    getGroup: function (code) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () { return db.collection("groups").doc(code).get(); })
        .then(function (s) { if (!s.exists) throw err("not-found", "No such group"); var g = s.data(); g.code = code; return g; });
    },
    createGroup: function (name, myName) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () {
        var tries = 0;
        var attempt = function () {
          var code = newCode(), m = {}; m[uid] = myName;
          return db.collection("groups").doc(code).set({ name: name, owner: uid, members: m, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() })
            .then(function () { return { code: code, name: name }; }, function (e) {
              if (e && e.code === "permission-denied" && ++tries < 4) return attempt(); // code taken: try another
              throw e;
            });
        };
        return attempt();
      });
    },
    joinGroup: function (code, myName) {
      var self = this;
      return self.getGroup(code).then(function (g) {
        if (!(uid in g.members) && Object.keys(g.members).length >= 50) throw err("full", "Group is full");
        var u = {}; u["members." + uid] = myName;
        return db.collection("groups").doc(code).update(u).then(function () { g.members[uid] = myName; return g; });
      });
    },
    leaveGroup: function (code) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () {
        var u = {}; u["members." + uid] = window.firebase.firestore.FieldValue.delete();
        return db.collection("groups").doc(code).update(u);
      });
    },
    // Today's posted results for every member: { uid: scoreDoc }
    groupScores: function (members, day) {
      if (provider !== "firebase") return demoOff();
      var ids = Object.keys(members).map(function (u) { return day + "_" + u; }), chunks = [];
      for (var i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
      return ready().then(function () {
        return Promise.all(chunks.map(function (c) {
          return db.collection("scores").where(window.firebase.firestore.FieldPath.documentId(), "in", c).get();
        }));
      }).then(function (snaps) {
        var out = {};
        snaps.forEach(function (s) { s.docs.forEach(function (d) { out[d.data().uid] = d.data(); }); });
        return out;
      });
    },

    account: account, accountError: accountError,
    newSaveCode: newSaveCode,
    cleanSaveCode: cleanSaveCode,
    // Back up the whole save. The rules refuse it if the cloud copy has more XP (another device is ahead).
    pushSave: function (code, json, xp, stamp) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () {
        return db.collection("saves").doc(code).set({ data: json, xp: xp, stamp: stamp, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
      });
    },
    pullSave: function (code) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () { return db.collection("saves").doc(code).get(); })
        .then(function (s) { return s.exists ? s.data() : null; });
    },

    /* For each finished day the player posted a score on, find their final rank. */
    rewardsFor: function (days) {
      return ready().then(function () {
        var jobs = days.filter(isFinal).map(function (d) {
          return window.WLLB.topDaily(d).then(function (rows) {
            var rank = 0;
            for (var i = 0; i < rows.length; i++) if (rows[i].uid === uid) { rank = i + 1; break; }
            return { day: d, rank: rank };
          });
        });
        return Promise.all(jobs);
      });
    }
  };
})();
