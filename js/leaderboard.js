/*
  WHO'S LYING? — leaderboard + top-100 rewards
  Backend: Firebase (Firestore + anonymous sign-in), free plan is plenty.
  Switched on by pasting your Firebase web config into js/config.js (see README).
  Add ?lb=demo to the address to try the leaderboard with demo players (nothing is uploaded).

  WLLB.enabled()                      is the leaderboard switched on?
  WLLB.submitDaily(entry)             post today's result      -> Promise
  WLLB.submitEndless(entry)           post an endless best     -> Promise
  WLLB.topDaily(day) / topEndless()   top 100 lists            -> Promise<rows>
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
  var LIMIT = 100;
  var db = null, uid = null, readyP = null;

  var TIERS = [
    { max: 1, icon: "🥇", name: "Chief Inspector" },
    { max: 2, icon: "🥈", name: "Inspector" },
    { max: 3, icon: "🥉", name: "Sergeant" },
    { max: 10, icon: "🎖️", name: "Detective" },
    { max: 100, icon: "🏅", name: "Sharp Eye" }
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
    readyP = loadScript(SDK + "firebase-app-compat.js")
      .then(function () { return loadScript(SDK + "firebase-auth-compat.js"); })
      .then(function () { return loadScript(SDK + "firebase-firestore-compat.js"); })
      .then(function () {
        var firebase = window.firebase;
        if (!firebase.apps.length) firebase.initializeApp(fb);
        db = firebase.firestore();
        // testing only (?test=1&tabauth=1): every tab signs in as its own player, to try a live room alone
        var solo = /[?&]test=1/.test(location.search) && /[?&]tabauth=1/.test(location.search);
        return (solo ? firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE) : Promise.resolve())
          .then(function () { return firebase.auth().signInAnonymously(); });
      })
      .then(function (cred) { uid = cred.user.uid; return uid; });
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
  var DEMO_NAMES = ["Sherlock_K", "NoirNeha", "AgentOmar", "Miss Marple", "TruthSeeker", "Kenji.D", "LieDetector", "Amara77", "Inspector V",
    "Detective Li", "CaseClosed", "Priya_P", "Sam Spade", "ColdCase", "Zara Q", "Hiro", "Lucía", "Femi", "Astrid", "Rafael",
    "SharpEyes", "Watson2", "Nadia", "Poirot_fan", "Arjun", "Jonas", "Mei", "Diego", "Ingrid", "Kwame"];
  function demoId() {
    try { var id = localStorage.getItem(DEMO_KEY + ":id"); if (!id) { id = "demo-" + Math.random().toString(36).slice(2, 10); localStorage.setItem(DEMO_KEY + ":id", id); } return id; }
    catch (e) { return "demo-me"; }
  }
  function demoStore() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || { scores: {}, endless: {} }; } catch (e) { return { scores: {}, endless: {} }; } }
  function demoSave(s) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
  function demoRivals(day) {
    var r = window.WL.rngFrom("lbdemo-" + day), out = [];
    for (var i = 0; i < DEMO_NAMES.length; i++) {
      var score = 5 - Math.floor(Math.pow(r(), 1.7) * 4);
      out.push({ uid: "rival" + i, name: DEMO_NAMES[i], badge: i < 3 ? TIERS[i].icon : r() < 0.2 ? TIERS[4].icon : "", day: day, score: score, timeMs: Math.round(55000 + r() * 160000) });
    }
    return out;
  }
  function sortDaily(rows) { return rows.sort(function (a, b) { return b.score - a.score || a.timeMs - b.timeMs; }); }

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

  /* ---------- weekly league ----------
     One doc per player per week. Points = liars caught in that week's Dailies (from the
     player's own posted scores, which the rules re-add to check). 5 tiers. */
  var LEAGUES = [
    { name: "Bronze", icon: "🥉" }, { name: "Silver", icon: "🥈" }, { name: "Gold", icon: "🥇" },
    { name: "Platinum", icon: "💠" }, { name: "Diamond", icon: "💎" }
  ];
  // Top 20% move up, bottom 20% move down (only when there are 5+ players in the tier).
  function leagueMove(tier, rank, total, pts) {
    var up = Math.max(1, Math.round(total * 0.2)), down = total >= 5 ? Math.floor(total * 0.2) : 0;
    if (tier < LEAGUES.length - 1 && pts > 0 && rank <= up) return 1;
    if (tier > 0 && down && rank > total - down) return -1;
    return 0;
  }
  function weekTotals(week) {
    var ids = [];
    for (var i = 0; i < 7; i++) ids.push(((week - 1) * 7 + 1 + i) + "_" + uid);
    return Promise.all(ids.map(function (id) { return db.collection("scores").doc(id).get(); })).then(function (snaps) {
      var t = { pts: 0, timeMs: 0, days: 0 };
      snaps.forEach(function (s) { if (s.exists) { t.pts += s.data().score; t.timeMs += s.data().timeMs; t.days++; } });
      return t;
    });
  }

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

  /* ---------- cloud saves: a private 12-letter save code is the key ---------- */
  function newSaveCode() {
    var a = new Uint32Array(12), c = "";
    window.crypto.getRandomValues(a);
    for (var i = 0; i < 12; i++) c += CODE_CHARS[a[i] % CODE_CHARS.length];
    return c;
  }
  function cleanSaveCode(raw) { var c = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return /^[A-Z2-9]{12}$/.test(c) ? c : ""; }

  /* ---------- live rooms: one link, several players, the same cases at the same time ----------
     rooms/{code}: host, hostName, seed, season, state (lobby, play, end), round, rounds, roundAt
     rooms/{code}/players/{uid}: name, score, ans { round: { ok, ms, pts } }
     In demo mode (?lb=demo) a room lives in localStorage, so tabs on one computer can play together:
     each tab is its own player. */
  var ROOM_MAX = 10, DEMO_ROOM = "whoslying:room:", roomWatchers = {};
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
    // o: { name, seed, season, rounds } -> Promise of the new room code
    create: function (o) {
      return ready().then(function () {
        var doc = { host: roomMe(), hostName: o.name, seed: o.seed, season: o.season, state: "lobby", round: 0, rounds: o.rounds };
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
          if (!r.players[me] && Object.keys(r.players).length >= ROOM_MAX) throw err("room-full", "Room full");
          r.players[me] = Object.assign({ score: 0, ans: {}, joinedAt: Date.now() }, r.players[me] || {}, { name: name });
          demoRoomSave(code, r);
          return r.room;
        }
        return roomRef(code).get().then(function (s) {
          if (!s.exists) throw err("no-room", "No such room");
          return roomRef(code).collection("players").get().then(function (ps) {
            var mine = ps.docs.some(function (d) { return d.id === uid; });
            if (!mine && ps.size >= ROOM_MAX) throw err("room-full", "Room full");
            var p = roomRef(code).collection("players").doc(uid);
            return (mine ? p.update({ name: name }) : p.set({ name: name, score: 0, ans: {}, joinedAt: stamp() })).then(function () { return s.data(); });
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
        q.docs.forEach(function (d) { out[d.id] = d.data(); });
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

  /* ---------- public API ---------- */
  window.WLLB = {
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

    submitEndless: function (e) {
      return ready().then(function () {
        var doc = { uid: uid, name: e.name, badge: e.badge || "", best: e.best };
        if (provider === "demo") {
          var s = demoStore(); var old = s.endless[uid];
          if (!old || old.best < e.best) { s.endless[uid] = doc; demoSave(s); }
          return true;
        }
        doc.updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
        return db.collection("endless").doc(uid).set(doc).then(function () { return true; }, function (err) {
          if (err && err.code === "permission-denied") return false; // not higher than the saved best
          throw err;
        });
      });
    },

    topDaily: function (day) {
      return ready().then(function () {
        if (provider === "demo") {
          var s = demoStore(), mine = [];
          Object.keys(s.scores).forEach(function (k) { if (s.scores[k].day === day) mine.push(s.scores[k]); });
          return sortDaily(demoRivals(day).concat(mine)).slice(0, LIMIT);
        }
        return db.collection("scores").where("day", "==", day).orderBy("score", "desc").orderBy("timeMs", "asc").limit(LIMIT).get()
          .then(function (snap) { return snap.docs.map(function (d) { return d.data(); }); });
      });
    },

    topEndless: function () {
      return ready().then(function () {
        if (provider === "demo") {
          var s = demoStore(), r = window.WL.rngFrom("lbdemo-endless");
          var rows = DEMO_NAMES.map(function (n, i) { return { uid: "rival" + i, name: n, badge: i < 2 ? TIERS[i].icon : "", best: Math.round(4 + r() * 40) }; });
          Object.keys(s.endless).forEach(function (k) { rows.push(s.endless[k]); });
          return rows.sort(function (a, b) { return b.best - a.best; }).slice(0, LIMIT);
        }
        return db.collection("endless").orderBy("best", "desc").limit(LIMIT).get()
          .then(function (snap) { return snap.docs.map(function (d) { return d.data(); }); });
      });
    },

    /* Rank among everyone who posted today: { rank, total } */
    dailyStanding: function (day, score, timeMs) {
      return standing("scores", [["day", day]], "score", score, Math.max(20000, Math.round(timeMs)));
    },
    // Everyone's Daily result is posted (without a name until they join), so counts and percentiles are real.
    // This puts the name on today's result once they join.
    nameDaily: function (day, name, badge) {
      return ready().then(function () {
        if (provider === "demo") { var s = demoStore(), d = s.scores[day + "_" + uid]; if (d) { d.name = name; d.badge = badge || ""; demoSave(s); } return true; }
        return db.collection("scores").doc(day + "_" + uid).update({ name: name, badge: badge || "" }).then(function () { return true; }, function () { return false; });
      });
    },

    /* ---------- season scoreboard ----------
       One entry per player per season: the sum of their 4 weekly league entries (the rules re-add them to check).
       Season 1 is weeks 3 to 6 (Daily #15 to #42); firebase/firestore.rules assumes the same. */
    syncSeason: function (e) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () {
        var w = e.season * 4 - 1;
        return Promise.all([w, w + 1, w + 2, w + 3].map(function (x) { return db.collection("league").doc(x + "_" + uid).get(); }));
      }).then(function (snaps) {
        var t = { pts: 0, timeMs: 0, days: 0 };
        snaps.forEach(function (s) { if (s.exists) { var d = s.data(); t.pts += d.pts; t.timeMs += d.timeMs; t.days += d.days; } });
        var doc = { uid: uid, name: e.name, badge: e.badge || "", season: e.season, pts: t.pts, timeMs: t.timeMs, days: t.days,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() };
        return db.collection("seasons").doc(e.season + "_" + uid).set(doc).then(function () { return doc; });
      });
    },
    seasonTop: function (season) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () {
        return db.collection("seasons").where("season", "==", season).orderBy("pts", "desc").orderBy("timeMs", "asc").limit(LIMIT).get();
      }).then(function (snap) { return snap.docs.map(function (d) { return d.data(); }); });
    },
    seasonStanding: function (season, pts, timeMs) { return standing("seasons", [["season", season]], "pts", pts, timeMs); },

    LEAGUES: LEAGUES,
    leagueMove: leagueMove,
    // Writes this week's league entry from the player's posted Daily scores. -> the entry
    syncLeague: function (e) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () { return weekTotals(e.week); }).then(function (t) {
        var doc = { uid: uid, name: e.name, badge: e.badge || "", week: e.week, tier: e.tier, pts: t.pts, timeMs: t.timeMs, days: t.days,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() };
        return db.collection("league").doc(e.week + "_" + uid).set(doc).then(function () { return doc; });
      });
    },
    leagueMine: function (week) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () { return db.collection("league").doc(week + "_" + uid).get(); })
        .then(function (s) { return s.exists ? s.data() : null; });
    },
    leagueTop: function (week, tier) {
      if (provider !== "firebase") return demoOff();
      return ready().then(function () {
        return db.collection("league").where("week", "==", week).where("tier", "==", tier)
          .orderBy("pts", "desc").orderBy("timeMs", "asc").limit(50).get();
      }).then(function (snap) { return snap.docs.map(function (d) { return d.data(); }); });
    },
    leagueStanding: function (week, tier, pts, timeMs) { return standing("league", [["week", week], ["tier", tier]], "pts", pts, timeMs); },

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
