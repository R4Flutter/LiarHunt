/*
  LIARHUNT — the game screens
  Modes:
    Career  Book 1, The Black Ledger: one story in 30 missions (js/book.js plays it, js/book1.js holds it)
    Train   the training case every new player starts with, with the coach
    Daily   5 cases a day, the same for everyone, one try each, share grid
    Rush    unlimited cases against the clock, 3 lives, one continue per run
  Also: headquarters (HQ), the Book map, shop,
  achievements, missions, login rewards, streak shields, comeback gifts, friend
  challenges, level-ups, tutorial, and (web only) the Firebase leaderboard,
  weekly leagues, friend groups and reminders.
*/
(function () {
  "use strict";
  var WL = window.WL, P = window.WLP, Plat = window.WLPlat, Snd = window.WLAudio, FX = window.WLFX;
  var LB = window.WLLB || { enabled: function () { return false; } };
  var Book = window.WLBook;
  var CFG = WL.cfg, esc = WL.esc;
  function $(id) { return document.getElementById(id); }
  var TODAY = WL.dayNumber();
  var WEEK = WL.weekOf(TODAY), WDAY = WL.weekday(TODAY);
  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var reduceMotion = mq("(prefers-reduced-motion: reduce)").matches;
  var coarse = mq("(pointer: coarse)").matches;
  var GRID = { g: "✅", y: "☑️", r: "❌", "-": "🔒" }; // ☑️: caught with a hint. 🔒: a Daily 5 case locked after a wrong answer
  var LEVEL = { easy: "Easy case", medium: "Medium case", hard: "Hard case", twist: "Twist case" };
  var DAILY_TITLES = ["Every liar walked free.", "Rough day at the office.", "The liars won this round.", "Not bad, detective.", "Sharp eyes.", "Perfect. Nobody fooled you."];
  var CAUGHT = ["Caught!", "Got them!", "Case closed!", "Nailed it!", "Busted!"];
  var COIN_SVG = '<svg class="coin-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 1.8c0 2.4-5 1.6-5 4.2 0 1.1 1.1 2 2.5 2s2.5-.8 2.5-2"/></svg>';
  var AD_SVG = '<svg class="ad-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>';
  var PENCIL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
  var FLAME_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4-3 5.5-3 9.5A3 3 0 0 0 12 15a3 3 0 0 0 3-3.2c0-1.6-1-2.6-1-4.3 2.7 1.4 5 4.6 5 8A7 7 0 0 1 5 15.5C5 9.6 10.5 7.4 12 2z"/></svg>';

  var S = null;            // saved state (see progress.js)
  var user = null;         // CrazyGames user, when signed in
  var run = null;          // the case or run being played
  var screen = "";
  var adblocked = false;
  var bootTime = Date.now();
  var paused = { ad: false, hidden: false };
  var queue = [];          // celebrations to show after a verdict (level-ups etc.)
  var notices = [];        // messages to show at HQ, one at a time (comeback gift, shield saves...)
  // The web save lives in the player's account (players/{uid}). on: saving to the account; rev: the revision this device
  // loaded; gone: stop saving (the game is being replaced); reload: another device saved newer progress.
  var cloud = { on: false, rev: 0, timer: 0, last: 0, busy: false, gone: false, migrate: false, reload: false };
  var bootSearch = location.search;

  function persist() { if (cloud.gone) return; if (!cloud.on) Plat.save(S); cloudDirty(); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function scoreOf(results) { return results.filter(function (r) { return r === "g" || r === "y"; }).length; }
  // A tick for each liar caught (amber if a hint helped), a cross for a miss, a lock for a Daily 5 case that never opened,
  // an empty slot for a case not played yet.
  var TICK = '<path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/>', MARK = { g: TICK, y: TICK, r: '<path pathLength="1" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', l: '<path d="M8 11V8.5a4 4 0 0 1 8 0V11M6.5 11h11v8h-11z"/>' };
  function cellClass(r) { return r === "-" ? "l" : r || "n"; }
  function cells(results, total) {
    var out = "";
    for (var i = 0; i < (total || results.length); i++) {
      var r = cellClass(results[i]);
      out += '<span class="cell-' + r + '">' + (MARK[r] ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + MARK[r] + "</svg>" : "") + "</span>";
    }
    return out;
  }
  function stars(n, of) {
    var out = '<span class="stars">';
    for (var i = 0; i < (of || 3); i++) out += '<span class="st' + (i < n ? " on" : "") + '"></span>';
    return out + "</span>";
  }
  function dailyStreak() { return S.stats.lastDay >= TODAY - 1 ? S.stats.streak : 0; }
  function web() { return Plat.allowExternal(); }
  function lbOn() { return LB.enabled() && web(); }
  function dayName(d) { return DAY_NAMES[WL.weekday(d)]; }
  // New players meet the modes one at a time: Rush on day 2, leagues in week 2 (or sooner if they play a lot).
  function unlocked(what) {
    var days = TODAY - S.firstDay;
    if (what === "rush") return days >= 1 || S.tot.solved >= 10;
    if (what === "league") return days >= 7 || S.tot.dailyDone >= 5;
    return true;
  }
  function myName() { return (user && user.username) || S.settings.playerName || ""; }
  function myFace() { return WL.okFace(S.settings.avatar) ? S.settings.avatar : ""; }

  /* ---------- polygraph trace (canvas) ---------- */
  function Trace(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext("2d"); this.o = opts || {};
    this.t = 100; this.scroll = 0; this.acc = 0; this.buf = []; this.agit = 0.2;
    this.spikeT = -1; this.spikeBig = false; this.active = false; this.raf = 0; this.w = 0; this.h = 0;
    this.readColors();
    var self = this;
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); self.draw(); }).observe(canvas);
  }
  Trace.prototype.readColors = function () {
    var cs = getComputedStyle(document.documentElement);
    var g = function (n) { return cs.getPropertyValue(n).trim(); };
    this.col = { ink: g("--ink"), needle: g("--needle"), grid: g("--grid"), gridS: g("--grid-strong") };
  };
  Trace.prototype.resize = function () {
    var r = this.c.getBoundingClientRect();
    if (r.width < 2) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.round(r.width); this.h = Math.round(r.height);
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var speed = this.o.speed || 50;
    while (this.buf.length < this.w) { this.buf.unshift(this.sample(this.t - this.buf.length / speed)); }
    if (this.buf.length > this.w) this.buf = this.buf.slice(-this.w);
  };
  Trace.prototype.sample = function (t) {
    var g = this.agit;
    var breath = Math.sin(t * 1.7) * 0.55 + Math.sin(t * 0.63 + 1.3) * 0.3 + (Math.random() - 0.5) * 0.06 * (1 + g * 3);
    var rate = 1.05 + g * 1.7, ph = (((t * rate) % 1) + 1) % 1;
    var beat = ph < 0.05 ? -Math.sin((ph / 0.05) * Math.PI) : ph < 0.11 ? Math.sin(((ph - 0.05) / 0.06) * Math.PI) * 0.45 : 0;
    var pulse = beat * (0.5 + g * 0.5) + (Math.random() - 0.5) * 0.08 * (1 + g * 4);
    if (this.spikeT >= 0) {
      var st = t - this.spikeT;
      if (st >= 0 && st < 0.6) {
        var env = Math.sin((st / 0.6) * Math.PI);
        pulse = Math.sin(st * 72) * env * (this.spikeBig ? 1.25 : 0.9);
        breath += Math.sin(st * 40) * env * 0.55;
      } else if (st >= 0.6) this.spikeT = -1;
    }
    return [Math.max(-1.6, Math.min(1.6, breath)), Math.max(-1.6, Math.min(1.6, pulse))];
  };
  Trace.prototype.advance = function (dt) {
    var speed = this.o.speed || 50;
    this.acc += (speed * dt) / 1000;
    while (this.acc >= 1) {
      this.acc -= 1; this.t += 1 / speed; this.scroll += 1;
      this.buf.push(this.sample(this.t));
      if (this.buf.length > this.w) this.buf.shift();
    }
  };
  Trace.prototype.draw = function () {
    if (!this.w) return;
    var ctx = this.ctx, w = this.w, h = this.h, col = this.col, gs = 12, off = this.scroll % gs, x, y;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (x = -off; x < w; x += gs) {
      var major = Math.round((x + this.scroll) / gs) % 5 === 0;
      ctx.strokeStyle = major ? col.gridS : col.grid;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); ctx.stroke();
    }
    ctx.strokeStyle = col.grid;
    for (y = gs; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
    var b = this.buf, n = b.length, i;
    var A = { y: h * (this.o.aY || 0.36), amp: h * 0.13 }, B = { y: h * (this.o.bY || 0.7), amp: h * 0.2 };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = col.ink; ctx.lineWidth = 1.4; ctx.beginPath();
    for (i = 0; i < n; i++) { x = w - n + i; y = A.y + b[i][0] * A.amp; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = col.needle; ctx.lineWidth = 1.9; ctx.beginPath();
    for (i = 0; i < n; i++) { x = w - n + i; y = B.y + b[i][1] * B.amp; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    if (n) {
      ctx.fillStyle = col.needle; ctx.beginPath(); ctx.arc(w - 2.5, B.y + b[n - 1][1] * B.amp, 2.8, 0, 7); ctx.fill();
      ctx.fillStyle = col.ink; ctx.beginPath(); ctx.arc(w - 2.5, A.y + b[n - 1][0] * A.amp, 2.2, 0, 7); ctx.fill();
    }
  };
  Trace.prototype.start = function () {
    if (this.active) return;
    this.active = true; this.resize();
    var self = this, last = performance.now();
    if (reduceMotion) { this.draw(); return; }
    var loop = function (now) {
      if (!self.active) return;
      self.advance(Math.min(64, now - last)); last = now;
      self.draw();
      self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  };
  Trace.prototype.stop = function () { this.active = false; cancelAnimationFrame(this.raf); };
  Trace.prototype.spike = function (big) {
    this.spikeT = this.t; this.spikeBig = !!big;
    if (reduceMotion || !this.active) {
      for (var i = 0; i < 32; i++) { this.t += 1 / 50; this.buf.push(this.sample(this.t)); if (this.buf.length > this.w) this.buf.shift(); }
      this.draw();
    }
  };
  var hqTrace = new Trace($("hq-trace"), { speed: 38, aY: 0.36, bY: 0.68 });
  var gameTrace = new Trace($("trace"), { speed: 52, aY: 0.5, bY: 0.76 });
  var traces = [hqTrace, gameTrace];
  function refreshTraceColors() { traces.forEach(function (t) { t.readColors(); t.draw(); }); }
  mq("(prefers-color-scheme: dark)").addEventListener("change", refreshTraceColors);

  /* ---------- small UI helpers ---------- */
  function toast(msg, cls, ms) {
    var box = $("toasts");
    while (box.children.length > 1) box.firstChild.remove();
    var t = document.createElement("div");
    t.className = "toast " + (cls || "");
    t.innerHTML = msg;
    box.appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 320); }, ms || 2600);
  }
  function openDialog(id) {
    var d = $(id);
    if (!d) return;
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
  }
  function closeDialog(id) {
    var d = $(id);
    if (!d) return;
    if (typeof d.close === "function") { if (d.open) d.close(); } else d.removeAttribute("open");
    if (screen === "hq") setTimeout(pumpNotices, 300); // messages that arrived while this dialog was open
  }
  [].forEach.call(document.querySelectorAll("dialog"), function (d) {
    d.addEventListener("click", function (e) {
      if (e.target === d || (e.target.closest && e.target.closest("[data-close]"))) { Snd.play("click"); closeDialog(d.id); }
    });
  });
  function rw(coins, xp, mult) {
    var h = "";
    if (coins) h += '<span class="rw coin">' + COIN_SVG + "+" + coins + "</span>";
    if (xp) h += '<span class="rw xp">+' + xp + " XP</span>";
    if (mult && mult > 1.001) h += '<span class="rw mult">Streak ×' + mult.toFixed(1) + "</span>";
    return h;
  }
  var shownCoins = 0, coinTok = 0;
  function renderCoins(animate) {
    var from = shownCoins, to = S.coins, tok = ++coinTok;
    shownCoins = to;
    if (!animate || to === from) { $("coin-n").textContent = FX.fmt(to); return; }
    var count = function () { if (tok === coinTok) { FX.countTo($("coin-n"), from, to, 700); FX.pop($("coins")); } }; // skipped if a newer update already showed the total
    // A case's coins fly from the result card into the wallet, once the card has slid in.
    var chip = to > from && !$("verdict").hidden && $("verdict-rewards").querySelector(".rw.coin");
    if (chip) setTimeout(function () { FX.coinFly(chip, $("coins"), count); }, 240);
    else count();
  }
  function applyTheme() {
    var id = S.themes.current;
    if (!id || id === "auto") document.documentElement.removeAttribute("data-skin");
    else document.documentElement.setAttribute("data-skin", id);
    refreshTraceColors();
  }
  function canRewarded() { return Plat.hasAds() && !adblocked; }
  function adFailed() {
    var code = Plat.lastAdError();
    if (code === "adblock") { adblocked = true; toast("Ads are blocked in this browser, so ad rewards are off."); }
    else toast("No ad is available right now. Try again in a bit.");
  }
  // Midgame ads block the screen until they finish (CrazyGames rule).
  function midgame(placement) {
    var allowed = S.tot.solved >= 3 && Date.now() - bootTime > 60000;
    if (!allowed || !Plat.hasAds()) return Promise.resolve();
    var shield = document.createElement("div");
    shield.className = "ad-demo"; shield.setAttribute("aria-hidden", "true"); shield.style.background = "transparent";
    document.body.appendChild(shield);
    return Plat.midgame(placement).then(function () { shield.remove(); }, function () { shield.remove(); });
  }

  /* ---------- screens + HUD ---------- */
  var SCREENS = ["hq", "case", "book", "results", "map", "shop", "ach", "write", "room"];
  function show(name) {
    screen = name;
    SCREENS.forEach(function (n) { $("scr-" + n).hidden = n !== name; });
    var onHQ = name === "hq";
    $("btn-home").hidden = onHQ;
    $("brand").hidden = !onHQ;
    $("hud-title").hidden = onHQ;
    if (name !== "case") { Plat.gameplayStop(); hideCoach(); $("stage-card").hidden = true; }
    Snd.mood(name === "case" ? (run && run.kind === "rush" ? "rush" : run && run.d5 && run.c && run.c.n === 5 ? "verdict" : "case") : name === "book" ? "case" : "hq");
    if (onHQ) harborSoon();
    if (onHQ) { gameTrace.stop(); hqTrace.start(); } else if (name === "case") { hqTrace.stop(); gameTrace.start(); } else { hqTrace.stop(); gameTrace.stop(); }
    if (name === "hq" || name === "results") setTimeout(cloudFlush, 0);
    var el = $("scr-" + name);
    el.scrollTop = 0;
    if (name !== "case") $("verdict").hidden = true;
  }
  // Each screen (or, on a case, each mode) gets its own small icon next to the title.
  var CAL_SVG = '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  var HUD_ICO = {
    daily: CAL_SVG, replay: CAL_SVG, results: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/></svg>',
    train: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M9 8h7M9 11.5h5"/></svg>',
    rush: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/></svg>',
    room: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 19.5c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5M15 14.2c2.9 0 5.2 1.9 5.2 4.8"/></svg>',
    friend: PENCIL_SVG, write: PENCIL_SVG, story: PENCIL_SVG,
    map: '<svg viewBox="0 0 24 24"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    shop: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>',
    ach: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="5"/><path d="M8.6 10.7L6 3h4l2 4 2-4h4l-2.6 7.7"/></svg>',
  };
  // Season 1 is a foggy harbor town: a far-off foghorn when you come back to HQ, at most every 3 minutes.
  var harborAt = 0, harborWait = 0;
  function harborSoon() {
    var pk = WL.packFor(Math.max(1, SEASON));
    if (!pk || pk.town !== "Port Ellery" || harborWait || Date.now() - harborAt < 180000) return;
    harborWait = setTimeout(function () {
      harborWait = 0;
      if (screen === "hq" && Snd.ambient("harbor", 0.5)) harborAt = Date.now(); // only counts when it really played
    }, 2500);
  }
  function setHud(main, sub) {
    $("hud-main").textContent = main || ""; $("hud-sub").textContent = sub || "";
    var k = screen === "case" && run ? run.kind : screen;
    $("hud-ico").innerHTML = HUD_ICO[k] || ""; $("hud-ico").setAttribute("data-kind", k);
  }

  /* ---------- HQ ---------- */
  function playerName() {
    if (user && user.username) return user.username;
    if (S.settings.playerName) return S.settings.playerName;
    return "Detective";
  }
  function renderHQ() {
    var li = P.levelInfo(S.xp);
    $("player-badge").innerHTML = FX.badge(li.level, li.tier, 64);
    $("player-name").textContent = playerName();
    var av = $("player-avatar");
    if (user && user.profilePictureUrl) { av.src = user.profilePictureUrl; av.hidden = false; } else av.hidden = true;
    var nt = P.nextTitle(li.level);
    $("player-title").textContent = "Level " + li.level + " · " + li.title;
    $("xpfill").style.width = Math.round((li.into / li.need) * 100) + "%";
    $("xpbar").setAttribute("aria-valuemax", li.need); $("xpbar").setAttribute("aria-valuenow", li.into);
    $("xpbar").setAttribute("aria-label", "Experience: " + li.into + " of " + li.need);
    $("xp-text").textContent = (li.need - li.into) + " XP to level " + (li.level + 1) + (nt ? " · " + nt[1] + " at level " + nt[0] : "");
    var streak = dailyStreak(), sh = S.inv.shield || 0;
    $("streak-n").textContent = streak;
    $("streak-shields").innerHTML = new Array(sh + 1).join('<span class="sp"></span>');
    $("streak-chip").classList.toggle("lit", streak > 0);
    $("streak-chip").setAttribute("aria-label", "Daily streak: " + streak + " days. Streak Shields: " + sh);

    renderToday();
    renderSeason();
    $("rush-sub").textContent = !unlocked("rush") ? "Opens tomorrow, or after 10 solved cases" : S.endless.best > 0 ? "Your best: " + S.endless.best + " liars" : "Catch liars against the clock";
    $("tile-rush").classList.toggle("locked", !unlocked("rush"));

    Book.renderCard();

    renderMissions();
    $("btn-board").hidden = !lbOn();
    $("btn-friends").hidden = !lbOn();
    renderFriendsBadge();
    $("tile-room").hidden = !lbOn();
    renderBanner();
    renderCoins(false);
  }
  // A v2 story on HQ: the scene in a photo, five chapter pins on a red thread, and the day's suspects.
  function d5Folder(ed, res, done) {
    var A = window.WLArt, cs = ed.cases || [], cur = Math.min(res.length, 4), sc = (cs[cur] && cs[cur].scene) || (cs[0] && cs[0].scene);
    var pins = cs.map(function (c, i) {
      var r = res[i], ok = r === "g" || r === "y", cls = ok ? "ok" : r === "r" ? "bad" : r === "-" ? "lock" : i === res.length && !done ? "now" : "";
      var mark = ok ? "✓" : r === "r" ? "✗" : i === 4 && A ? A.icon("scales") : String(i + 1);
      var lab = i === 4 ? "Verdict" : (A && A.SCENES[c.scene] || {}).name || c.title;
      return '<li class="' + cls + '"><span>' + mark + "</span><em>" + esc(lab) + "</em></li>";
    }).join("");
    var faces = (ed.cast || []).map(function (p) { return '<span class="d5f-mug">' + WL.avatar(p.name, p.face) + "<b>" + esc(p.name.split(" ")[0]) + "</b></span>"; }).join("");
    return (done ? "" : '<span class="d5f-stamp" aria-hidden="true">Confidential</span>') +
      (sc && A ? '<figure class="d5f-photo">' + A.scene(sc) + "<figcaption>" + esc(ed.place || "") + "</figcaption></figure>" : "") +
      '<ol class="d5f-thread" aria-label="Five chapters">' + pins + "</ol>" +
      '<p class="d5f-h">Your suspects, all day</p><div class="d5f-faces">' + faces + "</div>";
  }
  function renderToday() {
    var d = S.daily && S.daily.day === TODAY ? S.daily : null, streak = dailyStreak();
    var res = d ? d.results : [], done = !!(d && d.done);
    var ed = d5Today(); // today's Daily 5 story, if there is one
    $("today-eyebrow").textContent = WL.formatDate(WL.dateForDay(TODAY)) + (ed ? " · Daily 5" : "");
    $("today-tab").textContent = "Daily #" + TODAY;
    $("today-cells").hidden = !res.length;
    $("today-cells").innerHTML = res.length ? cells(res, 5) : "";
    var title, sub, btn, v2 = !!(ed && ed.fmt === 2);
    if (ed) {
      if (done) {
        title = scoreOf(res) === 5 ? "Solved: " + ed.title : ed.title + ": the trail went cold";
        sub = (scoreOf(res) === 5 ? "A new mystery" : "The ending, and a new mystery,") + ' in <strong data-countdown="1">' + WL.fmtCountdown(WL.msToNextDay()) + "</strong>";
        btn = "See your result";
      } else if (res.length) {
        title = (v2 ? "Chapter " : "Case ") + (res.length + 1) + " of 5 · " + ed.title;
        sub = v2 ? "Your notebook is waiting." : "Your notebook is waiting. One wrong answer ends the day.";
        btn = "Continue the investigation";
      } else {
        title = ed.title;
        sub = v2 ? "One crime in five chapters. Search the scenes, question the suspects, then accuse. About 20 minutes." + (streak > 0 ? " Play to keep your <strong>" + streak + "-day streak</strong>." : "")
          : "One mystery in five connected cases. " + (streak > 0 ? "Play to keep your <strong>" + streak + "-day streak</strong>." : "One wrong answer ends the day.");
        btn = "Open the case file";
      }
    } else if (done) {
      title = scoreOf(res) + " of 5 caught";
      sub = 'New cases in <strong data-countdown="1">' + WL.fmtCountdown(WL.msToNextDay()) + "</strong>";
      btn = "See your result";
    } else if (res.length) {
      title = "Case " + (res.length + 1) + " of 5";
      sub = "You're part way through today's cases.";
      btn = "Continue";
    } else {
      title = "5 new cases";
      sub = streak > 0 ? "Play today to keep your <strong>" + streak + "-day streak</strong> alive." : "The same 5 cases for every detective today.";
      btn = "Play today's cases";
    }
    $("today-title").textContent = title;
    $("today-sub").innerHTML = sub;
    $("today-d5").hidden = !v2;
    if (v2) $("today-cells").hidden = true; // the chapter pins show the results
    $("today-d5").innerHTML = v2 ? d5Folder(ed, res, done) : "";
    $("btn-daily").textContent = btn;
    // a finished day gets the precinct's rubber stamp (added once, so it doesn't re-stamp every minute)
    var tc = $("today-card"), st0 = tc.querySelector(".folder-stamp");
    if (done && !st0) tc.insertAdjacentHTML("beforeend", '<span class="stamp folder-stamp" aria-hidden="true">Closed</span>');
    if (!done && st0) st0.remove();
    $("btn-daily").className = "btn big wide " + (done ? "ghost" : "danger");
    var meta = [], st = S.lb.stand && S.lb.stand.day === TODAY ? S.lb.stand : null;
    if (done && st && st.total >= RANK_MIN) meta.push("🏆 #" + st.rank + " of " + st.total + " today");
    var sc = WL.seasonClock(WL.now());
    if (sc.phase === "during" && sc.urgency === 2) meta.push("⏳ Last day of Season " + sc.season + ": finish today to lock in your league.");
    var c = S.challenge;
    if (c && c.day === TODAY && !done) meta.push("⚔️ " + esc(c.name) + " challenged you: " + scoreOf(c.grid.split("")) + "/5 in " + WL.fmtTime(c.time * 1000));
    // a story you didn't finish yesterday: its ending is open now
    var yh = S.history[TODAY - 1];
    if (D5 && yh && yh.story && yh.score < 5) meta.push('<button class="link-btn" type="button" id="btn-yesterday">📜 How “' + esc(yh.story) + "” ended</button>");
    $("today-meta").hidden = !meta.length;
    $("today-meta").innerHTML = meta.join("<br>");
    if ($("btn-yesterday")) $("btn-yesterday").addEventListener("click", function () { Snd.play("click"); openFinale(TODAY - 1); });
  }
  /* ---------- seasons: 45 days each, with their own cases (js/seasons.js) ----------
     The season score is the liars caught in that season's Dailies, played on the day (catch-ups and practice don't count),
     so it's the same number the season scoreboard checks. */
  var SEASON = WL.seasonOf(TODAY);
  function seasonRange(s) { var a = WL.seasonStart(s); return [a, a + WL.SEASON_DAYS - 1]; }
  // The season card: the season's name, a countdown that ticks every second, and (web) the player's league.
  function renderSeason() {
    var c = WL.seasonClock(WL.now()), pk = WL.packFor(c.season);
    $("season-card").hidden = !pk;
    if (!pk) return;
    $("season-title").textContent = pk.name;
    $("season-eyebrow").textContent = c.phase === "before" ? "Season 1 starts " + WL.formatDate(WL.dateForDay(WL.SEASON_ONE))
      : "Season " + c.season + " · day " + (TODAY - WL.seasonStart(c.season) + 1) + " of " + WL.SEASON_DAYS;
    $("season-sub").textContent = pk.tagline;
    $("season-next").textContent = c.phase === "before" ? "New cases, a cast of locals and a season league: climb from Bronze to Diamond before the season ends." : "";
    paintSeasonClock(c);
    // web: your league, LP and the way to the next league
    var row = $("season-league"), L = S.ladder, X = WL.LADDER;
    row.hidden = !lbOn() || !S.settings.playerName || c.phase !== "during";
    if (row.hidden) return;
    var mine = L.season === c.season, lp = mine ? L.lp : 0, t = mine ? L.tier : 0, nx = X.marks[t + 1];
    $("season-emblem").className = "league-emblem t" + t;
    $("season-emblem").textContent = X.icons[t];
    $("season-lname").textContent = X.names[t] + " League";
    $("season-lp").textContent = (mine ? lp.toLocaleString("en") + " LP" + (L.rank && L.total >= RANK_MIN ? " · #" + L.rank + " of " + L.total : "") : "Finish today's Daily to enter") +
      (nx != null ? " · " + (nx - lp).toLocaleString("en") + " LP to " + X.names[t + 1] : " · Top league");
    $("season-bar").firstElementChild.style.width = (nx != null ? Math.round((100 * (lp - X.marks[t])) / (nx - X.marks[t])) : 100) + "%";
  }
  function paintSeasonClock(c) {
    c = c || WL.seasonClock(WL.now());
    var el = $("season-clock");
    if (el) {
      el.textContent = (c.phase === "before" ? "Starts in " : "Ends in ") + WL.fmtLong(c.left);
      el.className = "season-clock" + (c.phase === "during" && c.urgency ? " u" + c.urgency : "");
    }
    return c;
  }
  // At start-up: say hello to a new season.
  function seasonCheck() {
    if (SEASON && S.seasonHello !== SEASON) {
      S.seasonHello = SEASON;
      var pk = WL.packFor(SEASON), r = seasonRange(SEASON);
      if (S.tot.solved >= 3) {
        notice({ icon: pk.icon || "🕵️", eyebrow: "Season " + SEASON + " is here", title: pk.name, sound: "levelup",
          text: esc(pk.tagline) + " It runs until " + WL.formatDate(WL.dateForDay(r[1])) + ".",
          html: '<ul class="reward-list"><li>🧾 Every accusation needs proof: tap the fact the lie breaks</li><li>🧩 Some lies only break with two facts together</li>' +
            "<li>🎭 A cast of locals who keep turning up</li><li>🏆 A season league: climb from Bronze to Diamond before the countdown runs out</li></ul>",
          yes: "Let's go" });
      }
    }
  }
  // One banner at a time: Google sign-in, then the daily reminder.
  function renderBanner() {
    var b = $("hq-banner"), html = "";
    if (cloudOn() && !google() && S.tot.solved <= 2 && !S.stats.played && !S.pwa.noRestore) {
      html = '<span class="hb-ico" aria-hidden="true">☁️</span><span class="hb-txt"><b>Played before?</b><span>Sign in with Google to bring back your progress.</span></span>' +
        '<button class="btn small primary" type="button" data-banner="google">Sign in</button><button class="icon-btn" type="button" data-banner="x-restore" aria-label="Not now"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    } else if (web() && S.tot.dailyDone >= 2 && !S.pwa.reminder && !S.pwa.noReminder) {
      html = '<span class="hb-ico" aria-hidden="true">⏰</span><span class="hb-txt"><b>Never miss a case</b><span>Add a daily reminder to your calendar.</span></span>' +
        '<button class="btn small primary" type="button" data-banner="reminder">Remind me</button><button class="icon-btn" type="button" data-banner="x-reminder" aria-label="Not now"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    }
    b.innerHTML = html; b.hidden = !html;
  }
  function renderMissions() {
    var ms = P.ensureMissions();
    $("mission-list").innerHTML = ms.list.map(function (m, i) {
      var done = m.progress >= m.target;
      var side = m.claimed ? '<span class="m-claimed">Claimed</span>'
        : done ? '<button class="btn small primary m-claim" type="button" data-claim="' + i + '">' + COIN_SVG + "Claim " + m.reward + "</button>"
        : '<span class="m-count">' + m.progress + "/" + m.target + '</span><span class="m-reward">' + COIN_SVG + m.reward + "</span>";
      return '<li class="mission' + (done ? " done" : "") + (m.claimed ? " claimed" : "") + '"><span class="m-check"></span>' +
        '<span class="m-body"><span class="m-text">' + esc(P.missionText(m)) + '</span><span class="m-bar"><span style="width:' +
        Math.round((m.progress / m.target) * 100) + '%"></span></span></span><span class="m-side">' + side + "</span></li>";
    }).join("");
    var chest = $("chest"), ready = P.chestReady(), got = ms.list.filter(function (m) { return m.progress >= m.target; }).length;
    chest.className = "chest" + (ms.chest ? " opened" : ready ? " ready" : "");
    chest.innerHTML = '<svg class="chest-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9H3z"/><path d="M3 12h18M10.5 12v2.5h3V12"/></svg>' +
      '<span class="chest-txt"><b>' + (ms.chest ? "Chest opened" : "Mission chest") + "</b><span>" +
      (ms.chest ? "New missions tomorrow." : (ready ? "" : "Finish all 3: ") + P.CHEST.coins + " coins and a Magnifier") + "</span></span>" +
      (ms.chest ? "" : ready ? '<button class="btn small danger" type="button" id="btn-chest">Open</button>'
        : '<span class="chest-meter" role="img" aria-label="' + got + ' of 3 missions done">' + ms.list.map(function (m) { return '<i class="' + (m.progress >= m.target ? "on" : "") + '"></i>'; }).join("") + "</span>");
    var now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), left = next - now;
    $("missions-reset").textContent = "New in " + Math.floor(left / 3600000) + "h " + Math.floor((left % 3600000) / 60000) + "m";
  }
  $("mission-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-claim]");
    if (!b) return;
    var r = P.claimMission(+b.dataset.claim);
    if (r) { Snd.play("coin"); FX.float("+" + r.coins, b, "coin"); persist(); renderMissions(); renderCoins(true); }
  });
  $("chest").addEventListener("click", function (e) {
    if (!e.target.closest("#btn-chest")) return;
    var r = P.claimChest();
    if (r) {
      Snd.play("achieve"); FX.confetti({ y: e.target.getBoundingClientRect().top });
      toast("Chest opened: " + r.coins + " coins and a Magnifier", "gold");
      persist(); renderMissions(); renderCoins(true);
    }
  });
  function goHQ() {
    if (cloud.reload) { reloadWith("Your newer progress from another device is here."); return; }
    stopClock(); hideConfirm();
    if (run && run.prog) { saveElapsed(); persist(); }
    if (run && run.kind === "rush" && !run.over) { run.over = true; P.rushEnd(run.score); persist(); }
    Book.leave();
    if (room) leaveRoom(); // going back to HQ leaves a live room
    run = null;
    try {
      var q = location.search.replace(/([?&])(c|g|w|room|day|restore)=[^&]*&?/g, "$1").replace(/[?&]$/, "");
      if (location.hash || q !== location.search) history.replaceState(null, "", location.pathname + q);
    } catch (e) { /* ignore */ }
    applyTheme();
    renderHQ();
    show("hq");
    if (cloudOn() && !google() && !S.sync.told && (S.stats.played >= 2 || S.tot.solved >= 12)) { S.sync.told = true; persist(); notice(signInTip()); }
    setTimeout(pumpNotices, 350);
  }

  /* ---------- notices: one message at a time on HQ ----------
     n = { icon, eyebrow, title, text, html, yes: "label", onYes, no: "label", onNo } */
  var noticeNow = null;
  function notice(n) { notices.push(n); if (screen === "hq") setTimeout(pumpNotices, 50); }
  function pumpNotices() {
    if (screen !== "hq" || document.querySelector("dialog[open]")) return;
    var n = notices.shift();
    if (!n) { maybeLogin(); return; }
    showNotice(n);
  }
  function showNotice(n) {
    noticeNow = n;
    $("notice-icon").textContent = n.icon || "";
    $("notice-eyebrow").hidden = !n.eyebrow; $("notice-eyebrow").textContent = n.eyebrow || "";
    $("notice-h").textContent = n.title;
    $("notice-text").innerHTML = n.text || "";
    $("notice-body").innerHTML = n.html || "";
    $("notice-yes").textContent = n.yes || "OK";
    $("notice-no").hidden = !n.no; $("notice-no").textContent = n.no || "";
    if (n.sound) Snd.play(n.sound);
    openDialog("dlg-notice");
  }
  function closeNotice(yes) {
    var n = noticeNow; noticeNow = null;
    closeDialog("dlg-notice");
    if (n && yes && n.onYes) n.onYes();
    if (n && !yes && n.onNo) n.onNo();
    setTimeout(pumpNotices, 250); // don't wait for the "close" event: hidden tabs may not fire it
  }
  $("notice-yes").addEventListener("click", function () { Snd.play("click"); closeNotice(true); });
  $("notice-no").addEventListener("click", function () { Snd.play("click"); closeNotice(false); });
  // Esc or a tap outside just dismisses the notice.
  $("dlg-notice").addEventListener("close", function () { noticeNow = null; setTimeout(pumpNotices, 250); });
  function rewardList(r) {
    var li = [];
    if (r.coins) li.push("<li>" + COIN_SVG + " " + r.coins + " coins</li>");
    if (r.magnifier) li.push("<li>🔍 " + r.magnifier + " Magnifier" + (r.magnifier > 1 ? "s" : "") + "</li>");
    if (r.shield) li.push("<li>🛡️ " + r.shield + " Streak Shield" + (r.shield > 1 ? "s" : "") + "</li>");
    if (r.freeze) li.push("<li>❄ " + r.freeze + " Time Freeze</li>");
    return '<ul class="reward-list">' + li.join("") + "</ul>";
  }
  function streakInfo() {
    var st = dailyStreak(), sh = S.inv.shield || 0;
    notice({
      icon: "🔥", title: st ? st + "-day streak" : "Start a streak",
      text: (st ? "You've played the Daily Case " + st + " day" + (st > 1 ? "s" : "") + " in a row. " : "Play the Daily Case every day to build a streak. ") +
        "Every 7 days in a row you get a Streak Shield and 100 coins.",
      html: '<p class="shield-line"><b>🛡️ Streak Shields: ' + sh + " of " + P.MAX_SHIELDS + "</b><br>If you miss a day, a shield saves your streak automatically.</p>",
      yes: "Got it", no: sh < P.MAX_SHIELDS ? "Get a shield in the Shop" : "", onNo: function () { openShop(false); }
    });
  }

  /* ---------- login calendar ---------- */
  function maybeLogin() {
    // never on a player's first day: new players get one clear thing to do, not a reward calendar
    if (screen !== "hq" || TODAY <= S.firstDay || document.querySelector("dialog[open]")) return;
    var r = P.checkLogin();
    persist();
    if (!r) return;
    var day = ((r.day - 1) % 7) + 1;
    $("login-text").textContent = r.day > 1 ? "Day " + r.day + " in a row. Keep it going!" : "Come back every day. Rewards grow for 7 days.";
    $("calendar").innerHTML = P.LOGIN.map(function (rew, i) {
      var parts = [COIN_SVG + rew.coins];
      if (rew.magnifier) parts.push(rew.magnifier + " 🔍");
      if (rew.freeze) parts.push(rew.freeze + " ❄");
      return '<li class="' + (i + 1 < day ? "past" : i + 1 === day ? "today" : "") + '"><b>' + (i + 1) + "</b>" + parts.join("<br>") + "</li>";
    }).join("");
    var dbl = $("btn-login-double");
    dbl.hidden = !canRewarded();
    dbl.innerHTML = AD_SVG + "Watch an ad to double the coins";
    openDialog("dlg-login");
  }
  function claimLogin(double) {
    var r = P.claimLogin(double);
    closeDialog("dlg-login");
    if (!r) return;
    persist();
    Snd.play("coin");
    toast("Daily reward: " + r.coins + " coins" + (r.magnifier ? " + " + r.magnifier + " Magnifier" + (r.magnifier > 1 ? "s" : "") : "") + (r.freeze ? " + a Time Freeze" : ""), "gold");
    renderCoins(true); renderHQ();
  }
  $("btn-login-claim").addEventListener("click", function () { claimLogin(false); });
  $("btn-login-double").addEventListener("click", function () {
    if (P.coolLeft("loginAd", 30) > 0) return;
    P.coolStart("loginAd");
    Plat.rewarded("login_double").then(function (ok) {
      if (ok) { claimLogin(true); FX.confetti(); }
      else { adFailed(); claimLogin(false); }
    });
  });
  $("dlg-login").addEventListener("cancel", function (e) { e.preventDefault(); claimLogin(false); });

  /* ---------- clock ---------- */
  var clock = { running: false, raf: 0, last: 0, lastTickSec: -1, sinceSave: 0, hiddenAt: 0 };
  // The Daily and Rush have leaderboards, so they count real time: switching tabs or opening Settings
  // doesn't stop their clock. Time away still counts, up to AWAY_MAX a go.
  var AWAY_MAX = 120000; // ponytail: 2 min cap, so a phone call doesn't wreck a run but thinking off-screen still costs
  function realClock() { return !!run && (run.kind === "daily" || run.kind === "replay" || run.kind === "rush" || run.kind === "room"); }
  function counting() { return clock.running && run && !paused.ad && !run.revealed && !run.coachHold && !run.hold; }
  function startClock() {
    clock.running = true; clock.last = performance.now(); clock.lastTickSec = -1;
    if (!clock.raf) clock.raf = requestAnimationFrame(tick);
  }
  function stopClock() { clock.running = false; }
  function tick(now) {
    clock.raf = 0;
    var real = realClock(), dt = now - clock.last; clock.last = now;
    if (!real) dt = Math.min(250, dt);
    if (counting() && !paused.hidden && (real || !document.querySelector("dialog[open]"))) {
      run.caseElapsed += dt;
      if (run.kind === "rush") {
        // one clock for the whole run; catches add time
        var left = run.time -= dt * (rule("fast") ? 1.25 : 1), sec = Math.ceil(Math.max(0, left) / 1000);
        $("rec-time").textContent = WL.fmtTime(sec * 1000);
        $("rec-time").classList.toggle("urgent", left < 10000);
        gameTrace.agit = 0.2 + 0.85 * Math.max(0, 1 - left / 60000);
        if (left < 5500 && sec !== clock.lastTickSec && sec > 0) { clock.lastTickSec = sec; Snd.play("tick"); }
        if (left <= 0) accuse(true);
      } else if (run.kind === "room") {
        var rl = run.limit - run.caseElapsed, rs = Math.ceil(Math.max(0, rl) / 1000);
        $("rec-time").textContent = WL.fmtTime(rs * 1000);
        $("rec-time").classList.toggle("urgent", rl < 10000);
        if (rl < 5500 && rs !== clock.lastTickSec && rs > 0) { clock.lastTickSec = rs; Snd.play("tick"); }
        if (rl <= 0) accuse(true);
      } else if (run.kind === "train" || run.kind === "friend" || run.kind === "story") {
        $("rec-time").textContent = WL.fmtTime(run.caseElapsed);
        clock.sinceSave += dt;
        if (clock.sinceSave > 4000) { clock.sinceSave = 0; saveMemo(); }
      } else {
        run.elapsed += dt; clock.sinceSave += dt;
        $("rec-time").textContent = WL.fmtTime(run.elapsed);
        if (clock.sinceSave > 4000) { clock.sinceSave = 0; saveElapsed(); persist(); }
      }
    }
    if (clock.running) clock.raf = requestAnimationFrame(tick);
  }
  // A Daily case left open (tab closed, HQ, reload) carries the time it was left at, so coming back adds the time away.
  function saveElapsed() { run.prog.elapsed = run.elapsed; run.prog.at = run.revealed ? 0 : Date.now(); }
  document.addEventListener("visibilitychange", function () {
    paused.hidden = document.hidden;
    if (document.hidden) {
      clock.hiddenAt = performance.now();
      if (run && run.prog) { saveElapsed(); persist(); }
      traces.forEach(function (t) { if (t.active) { t.stop(); t.wasActive = true; } });
      Plat.flush();
      cloudFlush();
    } else {
      if (realClock() && counting() && clock.hiddenAt) {
        var away = performance.now() - clock.hiddenAt;
        if (run.kind === "room") run.caseElapsed += away; // a live room's clock runs for everyone, even while you're in WhatsApp
        else if (run.kind === "rush") run.time -= Math.min(AWAY_MAX, away); else run.elapsed += Math.min(AWAY_MAX, away);
      }
      clock.last = performance.now();
      traces.forEach(function (t) { if (t.wasActive) { t.wasActive = false; t.start(); } });
    }
  });

  /* ---------- starting a case ---------- */
  // New players start with one training case and the coach. It can't be failed: a wrong guess is just crossed out.
  function startTraining() {
    run = { kind: "train", n: 1, c: WL.tutorialCase(), wrong: 0, hint: false };
    WL.track("training_start", {});
    show("case");
    loadCase();
  }
  function careerLabel() { return Book.finished() ? "Career: Book 1 map" : "Continue Career: mission " + Book.current(); }
  function newProg(day) { return { day: day, results: [], hints: [], elapsed: 0, done: false }; }
  function progressFor(day) {
    var key = day === TODAY ? "daily" : "replay";
    var p = S[key];
    if (!p || p.day !== day) { p = S[key] = newProg(day); persist(); }
    return p;
  }
  // mode: "practice" plays a past day for fun (no rewards).
  function startDaily(day, mode) {
    day = day || TODAY;
    if (mode !== "classic" && d5Wants(day, mode)) { startD5(day, mode); return; }
    if (mode === "classic") mode = undefined;
    var replay = day !== TODAY;
    var prog = progressFor(day);
    if (prog.done) { showDailyResults(day, prog, replay, null); return; }
    var away = prog.at ? Math.min(AWAY_MAX, Math.max(0, Date.now() - prog.at)) : 0; // a case left open counts the time away
    run = { kind: replay ? "replay" : "daily", day: day, cases: WL.buildDay(day), prog: prog, idx: prog.results.length, elapsed: (prog.elapsed || 0) + away };
    run.c = run.cases[run.idx];
    WL.track(replay ? "replay_start" : "daily_start", { day: day, case: run.idx + 1 });
    show("case");
    loadCase();
  }

  /* ---------- Daily 5: one story, five connected cases ----------
     The cases come from Firebase one at a time (WLLB.d5 in leaderboard.js), and the run is kept there too, so a reload,
     another device or a lost connection never counts as a wrong answer. The rules only open a case once the one before
     is solved, and check every answer against a key players can't read. Past days replay from the public archive,
     judged on this device. A day without a story plays the classic Daily. */
  var D5 = LB.d5 || null, d5Edition = {}, d5Loading = {};
  var D5_LEVEL = ["easy", "medium", "medium", "hard", "twist"];
  function d5Today() {
    var ed = d5Edition[TODAY], p = S.daily && S.daily.day === TODAY ? S.daily : null;
    return ed && !(p && p.results.length && !p.d5) ? ed : null;
  }
  // Load a day's story (null: that day has none). Today's waits for this before it starts.
  function d5Load(day) {
    if (!D5 || (D5.mode === "local" && day !== TODAY)) { d5Edition[day] = null; return Promise.resolve(null); }
    if (d5Edition[day] !== undefined) return Promise.resolve(d5Edition[day]);
    if (!d5Loading[day]) {
      d5Loading[day] = D5.edition(day).then(function (ed) { d5Edition[day] = ed || null; return d5Edition[day]; }, function (e) {
        console.warn("[daily5]", e && e.message ? e.message : e);
        delete d5Loading[day];
        if (day === TODAY) d5Edition[day] = null; // no connection to the stories: today plays the classic Daily
        return null;
      });
    }
    return d5Loading[day];
  }
  function d5Wants(day, mode) {
    if (!D5 || (D5.mode === "local" && day !== TODAY)) return false;
    var p = day === TODAY ? (S.daily && S.daily.day === day ? S.daily : null) : (S.replay && S.replay.day === day ? S.replay : null);
    if (p && p.results.length && !p.d5) return false; // started as a classic Daily: finish it that way
    return day === TODAY ? d5Edition[day] !== null : !!d5Edition[day];
  }
  // What this device keeps of a story: the cases and reveals it opened (for the notebook), and the player's notes.
  function d5St(day) {
    S.d5 = S.d5 || {};
    Object.keys(S.d5).forEach(function (k) { if (+k < TODAY - 3 && +k !== day) delete S.d5[k]; });
    return (S.d5[day] = S.d5[day] || { cases: {}, reveals: {}, notes: {}, seen: 0 });
  }
  // Today goes through Firebase. A past day plays from its public archive and keeps its run in this save.
  function d5Api(day, prog) {
    if (day === TODAY) return D5;
    var mine = function () { return prog.d5run; };
    return {
      run: function () { return Promise.resolve(mine() || null); },
      start: function (d, strikes) { prog.d5run = { picks: {}, grid: "", strikes: strikes, hunch: 0 }; return Promise.resolve(prog.d5run); },
      caseDoc: D5.caseDoc, reveal: D5.reveal, finale: D5.finale,
      commit: function (d, n, pick) { var r = mine(); r.picks["c" + n] = r.picks["c" + n] || { s: pick.s, p: pick.p }; return Promise.resolve(r); },
      resolve: function (d, n, letter) { var r = mine(); if (r.grid.length === n - 1) r.grid += letter; return Promise.resolve(r); },
      over: function () { mine().over = true; return Promise.resolve(mine()); },
      hunch: function (d, n) { mine().hunch = n; return D5.hunchDoc(d, n); }
    };
  }
  function reds(g) { return (String(g).match(/r/g) || []).length; }
  function d5Over(r) { return r.grid.length >= 5 || reds(r.grid) >= (r.strikes || 1) || !!r.over; }
  // A miss in a story that allows a second chance, and the player hasn't chosen yet: Revive, or stop for today.
  function d5Pending(r, st) { var g = r.grid; return !d5Over(r) && g.length > 0 && g.charAt(g.length - 1) === "r" && st.revived !== g.length; }
  function d5Results(r) { var out = r.grid.split(""); if (d5Over(r)) while (out.length < 5) out.push("-"); return out; }
  function d5Failed(results, strikes) { return results.indexOf("-") >= 0 || reds(results.join("")) >= (strikes || 1); }
  function verdictKey(v) { return Object.keys(v).sort().map(function (q) { return q + "=" + v[q]; }).join(";"); }
  function d5Fail(e) {
    var code = e && e.code;
    console.warn("[daily5]", e);
    toast(code === "permission-denied" ? (run && run.day !== TODAY ? "This story opens for replay at 6 AM the day after." : "The case file is locked. Reload to carry on.")
      : LB.friendlyError(e).replace("leaderboard", "case file"), "", 3800);
    if (screen === "case" && !run.revealed) {
      if (run.c && run.c.fmt === 2) { Chapter.unlock(); $("confirm").hidden = true; $("tools").hidden = false; }
      else { $("btn-accuse").disabled = false; $("confirm").hidden = false; }
    }
  }
  // While Firebase answers: the daily button and the accuse bar say so, and can't be pressed twice.
  function d5Busy(on, label) {
    $("btn-daily").disabled = on;
    if (on && screen === "hq") $("btn-daily").textContent = "Opening the case file…";
    if (screen === "case") {
      $("btn-accuse").disabled = on; $("btn-cancel").disabled = on;
      if (on && label) $("btn-accuse").textContent = label;
    }
    if (!on && screen === "hq") renderToday();
  }
  function startD5(day, mode) {
    var ed = d5Edition[day];
    if (ed === undefined) { // still finding out whether this day has a story
      d5Busy(true);
      d5Load(day).then(function () { d5Busy(false); if (d5Wants(day, mode)) startD5(day, mode); else startDaily(day, "classic"); });
      return;
    }
    var replay = day !== TODAY;
    var prog = progressFor(day), st = d5St(day), api = d5Api(day, prog), kept = chLocal();
    if (kept && kept.day === day && kept.revived > (st.revived || 0)) st.revived = kept.revived; // the account copy may be up to 20 s behind
    prog.d5 = ed.id; prog.title = ed.title; prog.strikes = ed.strikes; prog.fmt = ed.fmt || 1;
    if (prog.done) { showDailyResults(day, prog, replay, null); return; }
    d5Busy(true);
    api.run(day).then(function (r) { return r || api.start(day, ed.strikes); }).then(function (r) {
      st.run = r;
      prog.results = d5Results(r); persist();
      var away = prog.at ? Math.min(AWAY_MAX, Math.max(0, Date.now() - prog.at)) : 0;
      run = { kind: replay ? "replay" : "daily", day: day, cases: [null, null, null, null, null], prog: prog, idx: r.grid.length,
        elapsed: (prog.elapsed || 0) + away, d5: { ed: ed, st: st, api: api, r: r } };
      if (d5Over(r)) { d5Busy(false); finishDaily(); return; }
      if (!r.grid.length) WL.track(replay ? "replay_start" : "d5_start", { day: day, story: ed.id });
      d5Open(d5Pending(r, st) ? r.grid.length : r.grid.length + 1); // a miss still waiting for Revive or Stop comes back to that choice
    }).catch(function (e) { d5Busy(false); d5Fail(e); });
  }
  function d5Case(doc, n) {
    if (doc.fmt === 2 && doc.mode === "liar") return d5Chapter(doc, n);
    // Story files often list the liar, the proof and the right verdict first, so show them in a fixed shuffled order.
    var rng = WL.rngFrom((doc.title || "") + ":" + n), f = WL.shuffle(doc.facts || [], rng), sus = WL.shuffle(doc.suspects || [], rng);
    return { d5: true, n: n, title: doc.title, setup: doc.intro, prev: doc.previously || "", ask: doc.ask, mode: doc.mode, level: D5_LEVEL[n - 1],
      facts: f, clues: f.map(function (x) { return x.text; }), factIds: f.map(function (x) { return x.id; }),
      suspects: sus.map(function (s) { return { name: s.name, role: s.role, says: s.says }; }),
      sids: sus.map(function (s) { return s.sid; }), pids: sus.map(function (s) { return s.id; }),
      parts: doc.parts ? doc.parts.map(function (q) { return Object.assign({}, q, { options: WL.shuffle(q.options || [], rng) }); }) : null, answer: -1, proof: new Array(doc.need || 0).fill(-1), alt: [], why: "" };
  }
  // A v2 chapter (js/chapter.js draws it). The verdict card reads the statements as "suspects" and the evidence as "clues".
  function d5Chapter(doc, n) {
    var cast = {}, facts = (doc.evidence || []).concat(doc.carried || []);
    (run.d5.ed.cast || []).forEach(function (p) { cast[p.id] = p; });
    var name = function (pid) { return (cast[pid] || {}).name || pid; };
    return { d5: true, fmt: 2, n: n, title: doc.title, setup: doc.intro, prev: doc.previously || "", ask: doc.ask, mode: "liar", level: D5_LEVEL[n - 1], need: doc.need || 1,
      scene: doc.scene, time: doc.time, people: doc.suspects || [], spots: doc.spots || [], evidence: doc.evidence || [], carried: doc.carried || [],
      questions: doc.questions || [], presses: doc.presses || [], statements: doc.statements || [], cast: cast,
      facts: facts, clues: facts.map(function (f) { return f.text; }), factIds: facts.map(function (f) { return f.id; }),
      sids: (doc.statements || []).map(function (x) { return x.id; }), pids: (doc.statements || []).map(function (x) { return x.by; }),
      suspects: (doc.statements || []).map(function (x) { return { name: name(x.by), role: (cast[x.by] || {}).role || "", says: x.text }; }),
      parts: null, answer: -1, proof: new Array(doc.need || 0).fill(-1), alt: [], why: "" };
  }
  // A chapter's progress (what was searched, asked, picked). The account saves at most every 20 s, so each tap is also
  // kept on this device: a reload or a switch to another app comes back exactly where it was.
  function chState(n) {
    var st = run.d5.st, mine = !run.night && chLocal();
    st.ch = st.ch || {};
    st.ch[n] = st.ch[n] || {};
    if (mine && mine.day === run.day && mine.ch && mine.ch[n]) Object.assign(st.ch[n], mine.ch[n]);
    return st.ch[n];
  }
  function chLocal(keep) {
    try { if (keep) localStorage.setItem("wl-ch", JSON.stringify(keep)); else return JSON.parse(localStorage.getItem("wl-ch")); } catch (e) { return null; }
  }
  function chSave() { persist(); if (run && run.d5 && !run.night) chLocal({ day: run.day, ch: run.d5.st.ch, revived: run.d5.st.revived || 0 }); }
  // Open case n: fetch it (the rules only allow the next one), show its intro card, and carry on an answer already on file.
  function d5Open(n) {
    var d5 = run.d5, st = d5.st, keep = run;
    var have = st.cases[n] ? Promise.resolve(st.cases[n]) : d5.api.caseDoc(run.day, n).then(function (doc) { if (doc) { st.cases[n] = doc; persist(); } return doc; });
    have.then(function (doc) {
      if (run !== keep) return;
      d5Busy(false);
      if (!doc) throw new Error("This case is missing from the file.");
      run.idx = n - 1; run.c = run.cases[n - 1] = d5Case(doc, n); run.vpick = {};
      show("case");
      var fresh = !(run.prog.cur && run.prog.cur.idx === run.idx);
      if (run.c.fmt === 2) { var cs = chState(n); fresh = !((cs.searched || []).length || (cs.heard || []).length); }
      loadCase();
      if (run.night) nightOpened();
      var pk = d5.r.picks && d5.r.picks["c" + n];
      if (pk) d5Judge(pk); // answered before a reload: finish judging it
      else if (fresh) d5Intro(n);
    }).catch(function (e) { if (run !== keep) return; d5Busy(false); d5Fail(e); goHQ(); });
  }
  // The card between cases: where the story stands, then the new case. The clock waits.
  function d5Intro(n) {
    var c = run.c, ed = run.d5.ed, el = $("stage-card"), keep = run;
    var v2 = ed.fmt === 2, art = $("stage-art"), A = window.WLArt;
    $("stage-n").textContent = n === 1 ? (run.night ? (run.label || "Story Night") + " · " : "Daily 5 · ") + ed.title : (v2 ? (n === 5 ? "The verdict" : "Chapter " + n + " of 5") : "Case " + n + " of 5");
    $("stage-name").textContent = n === 1 ? (v2 ? "Chapter 1 · " : "Case 1 · ") + c.title : c.title;
    var who = c.fmt === 2 ? c.people : v2 ? (ed.cast || []).map(function (p) { return p.id; }) : [];
    art.hidden = !v2 || !A;
    art.innerHTML = v2 && A ? (c.scene ? '<span class="stage-photo">' + A.scene(c.scene) + "</span>" : "") + '<span class="stage-faces">' + who.map(function (pid) {
      var p = (ed.cast || []).filter(function (x) { return x.id === pid; })[0] || { name: pid };
      return "<span>" + WL.avatar(p.name, p.face) + "</span>";
    }).join("") + "</span>" : "";
    $("stage-text").textContent = n === 1 ? ed.intro : c.prev;
    el.querySelector(".stage-tap").textContent = v2 ? (n === 5 ? "Tap to give your verdict" : "Tap to open the chapter") : "Tap to open the case";
    el.classList.add("story"); el.hidden = false; run.hold = true;
    Snd.play(n === 5 ? "twist" : "whoosh");
    var done = function () { el.hidden = true; el.classList.remove("story"); art.hidden = true; art.innerHTML = ""; el.querySelector(".stage-tap").textContent = "Tap to start"; if (run === keep) run.hold = false; el.onclick = null; };
    el.onclick = function () { Snd.play("click"); done(); };
  }
  // Present the answer: commit it (it can't change after this), then judge it.
  function d5Submit(chPick) {
    var c = run.c, d5 = run.d5, n = c.n, keep = run, pick;
    if (chPick) pick = { s: chPick.s, p: chPick.p };
    else if (c.mode === "verdict") pick = { s: verdictKey(run.vpick), p: "" };
    else pick = { s: c.sids[run.pick], p: run.sel.map(function (i) { return c.factIds[i]; }).sort().join(",") };
    hideConfirm(); $("tools").hidden = true; $("confirm").hidden = false;
    $("accuse-q").textContent = c.mode === "verdict" ? "Your verdict is in." : "Your proof is in.";
    d5Busy(true, "Checking the file…");
    d5.api.commit(run.day, n, pick).catch(function (e) {
      // already on file (another tab, or a retry after a lost reply): carry on with the answer the file holds
      return d5.api.run(run.day).then(function (r) { if (r && r.picks && r.picks["c" + n]) return r; throw e; });
    }).then(function (r) {
      if (run !== keep) return;
      d5.r = d5.st.run = r;
      if (!run.night) WL.track("d5_answer", { day: run.day, case: n });
      d5Judge(r.picks["c" + n]);
    }).catch(function (e) { if (run !== keep) return; d5Busy(false); $("confirm").hidden = true; $("tools").hidden = false; d5Fail(e); });
  }
  // The answer is on file: open the reveal, record right or wrong, and show it.
  function d5Judge(pk) {
    var d5 = run.d5, c = run.c, n = c.n, keep = run;
    d5Busy(true, "Checking the file…");
    var have = d5.st.reveals[n] ? Promise.resolve(d5.st.reveals[n]) : d5.api.reveal(run.day, n);
    have.then(function (rev) {
      if (!rev) throw new Error("The reveal is missing.");
      d5.st.reveals[n] = rev;
      var right = pk.s === rev.answer.s && (c.mode === "verdict" || rev.answer.p.indexOf(pk.p) >= 0); // proofs are written "e7,f2", sorted
      var letter = right ? (d5.r.hunch === n ? "y" : "g") : "r";
      run.again = d5.r.grid.length >= n; // judged before (a reload at the Revive choice): no second reward
      var saved = d5.r.grid.length >= n ? Promise.resolve(d5.r) : d5.api.resolve(run.day, n, letter, d5.r.grid);
      return saved.then(function (r) {
        if (run !== keep) return;
        d5.r = d5.st.run = r; persist();
        d5Busy(false); $("confirm").hidden = true;
        d5Merge(c, rev, pk);
        right = r.grid[n - 1] !== "r";
        if (c.mode === "verdict") revealVerdict(right, run.timedOut ? "timeout" : "verdict");
        else if (c.fmt === 2) revealChapter(right, run.timedOut ? "timeout" : right ? "ok" : pk.s !== rev.answer.s ? "pick" : "proof", rev);
        else reveal(right, run.timedOut ? "timeout" : right ? "ok" : pk.s !== rev.answer.s ? "pick" : "proof");
        if (run.night) return;
        WL.track("d5_case", { day: run.day, n: n, ok: right, hunch: d5.r.hunch === n, ms: Math.round(run.caseElapsed) });
        if (!right) WL.track("d5_fail", { day: run.day, n: n });
      });
    }).catch(function (e) { if (run !== keep) return; d5Busy(false); d5Fail(e); });
  }
  // The reveal turns the case into a normal one (answer, proof, why), so the usual verdict screen can show it.
  function d5Merge(c, rev, pk) {
    c.why = rev.why;
    if (c.mode === "verdict") {
      c.vanswer = rev.answer.parts;
      pk.s.split(";").forEach(function (x) { var kv = x.split("="); run.vpick[kv[0]] = kv[1]; });
      return;
    }
    var idx = function (id) { return c.factIds.indexOf(id); }, num = function (a, b) { return a - b; };
    var sets = rev.answer.p.map(function (p) { return p.split(",").map(idx).sort(num); });
    c.answer = c.sids.indexOf(rev.answer.s); c.proof = sets[0] || []; c.alt = sets.slice(1);
    c.finding = rev.finding; c.timeline = rev.timeline || [];
    if (run.pick == null) run.pick = c.sids.indexOf(pk.s);
    if (!run.sel || !run.sel.length) run.sel = pk.p ? pk.p.split(",").map(idx) : [];
  }
  function revealChapter(correct, how, rev) {
    run.revealed = true;
    stopClock(); Plat.gameplayStop();
    Chapter.reveal(rev, correct);
    $("actionbar").hidden = true;
    gameTrace.spike(!correct);
    Snd.play("stamp");
    if (correct) Snd.play("cuffs", { delay: 0.3 });
    setTimeout(function () { Snd.play(how === "timeout" ? "timeout" : correct ? "correct" : "wrong"); }, correct ? 700 : 170);
    if (!correct) { FX.shake($("case-grid")); if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) { /* ignore */ } } }
    if (run.kind === "room") verdictRoom(correct, how); else if (run.kind === "story") verdictStory(correct, how); else verdictDaily(correct, how);
  }
  function revealVerdict(correct, how) {
    var c = run.c;
    run.revealed = true;
    stopClock(); Plat.gameplayStop();
    $("task").textContent = correct ? "Case closed." : "Here's what really happened.";
    [].forEach.call($("suspects").querySelectorAll(".vopt"), function (b) {
      var q = b.getAttribute("data-q"), o = b.getAttribute("data-o");
      b.disabled = true;
      if (c.vanswer[q] === o) b.classList.add("is-answer");
      else if (run.vpick[q] === o) b.classList.add("is-wrong");
    });
    $("actionbar").hidden = true;
    if (correct && run.c.d5) $("suspects").insertAdjacentHTML("afterbegin", '<span class="stamp case-closed" aria-hidden="true">Case closed</span>');
    gameTrace.spike(!correct);
    Snd.play("stamp");
    if (correct) Snd.play("cuffs", { delay: 0.3 });
    setTimeout(function () { Snd.play(correct ? "correct" : "wrong"); }, correct ? 700 : 170);
    if (!correct) FX.shake($("case-grid"));
    if (run.kind === "room") verdictRoom(correct, how || "verdict"); else if (run.kind === "story") verdictStory(correct, "verdict"); else verdictDaily(correct, "verdict");
  }
  // Case 5: one choice per question, then submit them together.
  function renderVerdictParts(c) {
    var box = $("suspects");
    box.innerHTML = c.parts.map(function (q) {
      return '<fieldset class="vpart"><legend class="vq">' + esc(q.ask) + '</legend><div class="vopts">' + q.options.map(function (o) {
        var pic = o.face ? '<span class="vface">' + WL.avatar(o.label, o.face) + "</span>" : o.icon && window.WLArt ? window.WLArt.icon(o.icon) : "";
        return '<button type="button" class="vopt' + (o.face ? " has-face" : o.icon ? " has-icon" : "") + '" aria-pressed="false" data-q="' + esc(q.id) + '" data-o="' + esc(o.id) + '">' + pic + "<span>" + esc(o.label) + "</span></button>";
      }).join("") + "</div></fieldset>";
    }).join("");
    [].forEach.call(box.querySelectorAll(".vopt"), function (b) { b.addEventListener("click", function () { pickVerdict(b); }); });
  }
  function pickVerdict(b) {
    if (!run || run.revealed || b.disabled) return;
    var q = b.getAttribute("data-q");
    run.vpick[q] = b.getAttribute("data-o");
    [].forEach.call($("suspects").querySelectorAll('.vopt[data-q="' + q + '"]'), function (x) { var on = x === b; x.classList.toggle("is-picked", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
    Snd.play("tap");
    var left = run.c.parts.filter(function (p) { return !run.vpick[p.id]; }).length;
    if (left) { hideConfirm(); $("tool-note").textContent = left + " question" + (left > 1 ? "s" : "") + " left."; return; }
    $("accuse-q").textContent = "Is this your final verdict? One try.";
    $("btn-accuse").textContent = "Submit verdict";
    $("tools").hidden = true; $("confirm").hidden = false;
  }
  // The second chance: a rewarded ad when ads are on. With no ads, or no ad to show, it's free (the owner's call);
  // closing the ad early is the only way to miss it, and the choice stays open.
  function revive(name) {
    if (!canRewarded()) return Promise.resolve(true);
    return Plat.rewarded(name).then(function (ok) { return ok !== false; });
  }
  function d5Revive() {
    var keep = run, b = $("btn-next");
    if (b.disabled) return; // an ad is already playing
    b.disabled = true;
    revive("d5_revive").then(function (ok) {
      b.disabled = false;
      if (run !== keep) return;
      if (!ok) { toast("No reward this time. Try again, or stop for today."); return; }
      run.d5.st.revived = run.d5.r.grid.length; run.reviveAsk = false; chSave();
      $("verdict").hidden = true;
      if (!run.night) WL.track("d5_revive", { day: run.day, n: run.c.n });
      d5Next();
    });
  }
  function d5Stop() {
    var keep = run;
    if ($("btn-verdict-hq").disabled) return;
    $("btn-verdict-hq").disabled = true;
    run.d5.api.over(run.day).then(function (r) {
      $("btn-verdict-hq").disabled = false;
      if (run !== keep) return;
      run.d5.r = run.d5.st.run = r; run.reviveAsk = false;
      run.prog.results = d5Results(r); persist();
      WL.track("d5_stop", { day: run.day, n: run.c.n });
      $("verdict").hidden = true;
      finishDaily();
    }).catch(function (e) { $("btn-verdict-hq").disabled = false; if (run === keep) d5Fail(e); });
  }
  // Next case: the next doc only opens once this one is solved, so fetch it now.
  function d5Next() {
    var res = run.prog.results;
    if (res.length >= 5) { if (run.kind === "story") storyEnd(); else finishDaily(); return; }
    persist();
    Snd.play("pen"); // the finding is written into the notebook
    $("verdict").hidden = true;
    d5Busy(true);
    d5Open(res.length + 1);
  }
  // The full story: everyone who finished all five gets it at once, everyone else at the next reset.
  function fmtClock(t) { var h = +t.slice(0, 2), m = t.slice(3); return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM"); }
  function finaleHtml(f) {
    return '<p class="end-text">' + esc(f.text) + '</p><ol class="end-time">' + (f.chronology || []).map(function (t) {
      return '<li><span class="t">' + esc(fmtClock(t.at)) + "</span><span>" + esc(t.text) + (t.case ? ' <em class="end-case">Case ' + t.case + "</em>" : "") + "</span></li>";
    }).join("") + "</ol>";
  }
  function openFinale(day) {
    d5Load(day).then(function (ed) { return D5.finale(day).then(function (f) { return { ed: ed, f: f }; }); }).then(function (x) {
      if (!x.f) { toast(WL.istHour() < 6 ? "That story's ending opens at 6 AM." : "That ending isn't open yet."); return; }
      showNotice({ icon: "📜", eyebrow: "Daily #" + day + " · the ending", title: x.ed ? x.ed.title : "The ending", html: finaleHtml(x.f), yes: "Close" });
      WL.track("d5_finale_view", { day: day, from: screen });
    }).catch(function () { toast("Couldn't open that story. Try again in a moment."); });
  }
  function d5EndCard(day, p) {
    var box = $("d5-end");
    if (!box || !D5) return;
    box.innerHTML = '<p class="muted small">Opening the full story…</p>';
    D5.finale(day).then(function (f) {
      if (f) { box.innerHTML = '<h3 class="sec">How it happened</h3>' + finaleHtml(f); WL.track("d5_finale_view", { day: day, from: "results" }); }
      else box.innerHTML = '<div class="d5-locked"><b>The full story opens at midnight</b><span>Come back in <strong data-countdown="1">' + WL.fmtCountdown(WL.msToNextDay()) +
        "</strong> to see how “" + esc(p.title) + "” ended, and to start a new mystery.</span></div>";
    }).catch(function () { box.innerHTML = '<p class="muted small">The ending opens on the Daily card once the day is over.</p>'; });
  }

  /* ---------- the Investigation Notebook ----------
     Everything this player has legitimately opened today: evidence from every case so far, the findings of solved
     cases, the suspects (what's confirmed apart from their own notes), and a timeline. Future cases were never
     loaded, so they can't show up here. */
  var nbTab = "evidence";
  var KIND = { cctv: "CCTV", log: "Log", document: "Document", witness: "Witness", photo: "Photo", record: "Record", phone: "Phone", object: "Object", finding: "Finding" };
  function nbData() {
    var d5 = run.d5, st = d5.st, cur = run.c.n, ev = [], fi = [], tl = [], says = {};
    for (var n = 1; n <= cur; n++) {
      var c = st.cases[n], rv = n < cur || run.revealed ? st.reveals[n] : null; // never the open case's answer
      if (!c) continue;
      if (c.fmt === 2 && c.mode === "liar") {
        var ch = (st.ch && st.ch[n]) || {}, got = Chapter.found(c, ch), hd = Chapter.heard(c, ch);
        (c.evidence || []).forEach(function (f) { if (got.indexOf(f.id) < 0) return; ev.push({ n: n, f: f }); if (f.time) tl.push({ at: f.time, text: f.title + ": " + f.text, n: n, sure: false }); });
        (c.statements || []).forEach(function (x) { if (hd.indexOf(x.id) >= 0) (says[x.by] = says[x.by] || []).push({ n: n, text: x.text, liar: !!(rv && rv.answer && rv.answer.s === x.id) }); });
      } else {
        (c.facts || []).forEach(function (f) { if (f.kind !== "finding") ev.push({ n: n, f: f }); });
        (c.suspects || []).forEach(function (s) { (says[s.id] = says[s.id] || []).push({ n: n, text: s.says, liar: !!(rv && rv.answer && rv.answer.s === s.sid) }); });
        (c.facts || []).forEach(function (f) { if (f.time && f.kind !== "finding") tl.push({ at: f.time, text: f.title + ": " + f.text, n: n, sure: false }); });
      }
      if (rv && rv.finding) fi.push({ n: n, f: rv.finding, why: rv.why });
      if (rv && rv.timeline) rv.timeline.forEach(function (t) { tl.push({ at: t.at, text: t.text, n: n, sure: true }); });
    }
    tl.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : (b.sure ? 1 : 0) - (a.sure ? 1 : 0); });
    return { ev: ev, fi: fi, tl: tl, says: says };
  }
  function openNotebook(tab) {
    if (!run || !run.d5) return;
    nbTab = tab || nbTab;
    var x = nbData();
    run.d5.st.seen = x.ev.length + x.fi.length; persist();
    $("nb-eyebrow").textContent = (run.night ? run.label || "Story Night" : "Daily #" + run.day) + " · " + run.d5.ed.title;
    renderNotebook(x);
    openDialog("dlg-notebook");
    renderMeta();
    WL.track("d5_notebook_open", { tab: nbTab, case: run.c.n });
  }
  function renderNotebook(x) {
    x = x || nbData();
    var count = { evidence: x.ev.length, findings: x.fi.length, suspects: run.d5.ed.cast.length, timeline: x.tl.length };
    [].forEach.call(document.querySelectorAll("#dlg-notebook [data-tab]"), function (b) {
      var on = b.getAttribute("data-tab") === nbTab;
      b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      b.querySelector("b").textContent = count[b.getAttribute("data-tab")];
    });
    var h = "", notes = run.d5.st.notes, NOTE = { ok: "Checks out", sus: "Suspicious" };
    if (nbTab === "evidence") {
      h = x.ev.length ? x.ev.slice().reverse().map(function (e, i) {
        var f = e.f;
        return '<details class="nb-item"' + (i === 0 ? " open" : "") + '><summary><span class="ev-kind">' + esc(KIND[f.kind] || f.kind) + "</span><b>" + esc(f.title) + "</b>" +
          '<span class="nb-from">Case ' + e.n + (f.time ? " · " + esc(fmtClock(f.time)) : "") + "</span></summary><p>" + esc(f.text) + '</p><p class="nb-src">Source: ' + esc(f.source) + "</p></details>";
      }).join("") : '<p class="nb-empty">No evidence yet.</p>';
    } else if (nbTab === "findings") {
      h = x.fi.length ? x.fi.map(function (e) {
        return '<div class="nb-item nb-finding"><span class="nb-stamp">Confirmed · Case ' + e.n + "</span><p><b>" + esc(e.f.text) + "</b></p></div>";
      }).join("") : '<p class="nb-empty">Solve a case to confirm what really happened. Findings go here, and the next case builds on them.</p>';
    } else if (nbTab === "suspects") {
      h = run.d5.ed.cast.map(function (p) {
        var said = x.says[p.id] || [], mine = notes[p.id];
        return '<div class="nb-item nb-person"><span class="mug">' + WL.avatar(p.name) + '</span><div><p class="nb-name"><b>' + esc(p.name) + "</b> · " + esc(p.role) +
          (mine ? ' <span class="nb-note ' + mine + '">Your note: ' + NOTE[mine] + "</span>" : "") + '</p><p class="nb-bg">' + esc(p.background) + "</p>" +
          (said.length ? '<ul class="nb-said">' + said.map(function (s) { return '<li class="' + (s.liar ? "lied" : "") + '"><span class="nb-from">Case ' + s.n + (s.liar ? " · caught lying" : "") + "</span>“" + esc(s.text) + "”</li>"; }).join("") + "</ul>"
            : '<p class="nb-from">Hasn\'t spoken yet.</p>') + "</div></div>";
      }).join("");
    } else {
      h = x.tl.length ? '<ol class="end-time nb-tl">' + x.tl.map(function (t) {
        return '<li class="' + (t.sure ? "sure" : "") + '"><span class="t">' + esc(fmtClock(t.at)) + "</span><span>" + esc(t.text) + ' <em class="end-case">' + (t.sure ? "Confirmed · " : "Evidence · ") + "Case " + t.n + "</em></span></li>";
      }).join("") + "</ol>" : '<p class="nb-empty">Nothing on the timeline yet.</p>';
    }
    $("nb-body").innerHTML = h;
    $("nb-body").scrollTop = 0;
  }
  [].forEach.call(document.querySelectorAll("#dlg-notebook [data-tab]"), function (b) {
    b.addEventListener("click", function () { Snd.play("tap"); nbTab = b.getAttribute("data-tab"); renderNotebook(); WL.track("d5_notebook_tab", { tab: nbTab }); });
    b.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var tabs = [].slice.call(document.querySelectorAll("#dlg-notebook [data-tab]")), i = tabs.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1);
      var t = tabs[(i + tabs.length) % tabs.length]; t.click(); t.focus(); e.preventDefault();
    });
  });
  $("nb-body").addEventListener("toggle", function (e) { if (e.target.open) WL.track("d5_evidence_open", {}); }, true);
  $("btn-notebook").addEventListener("click", function () { Snd.play("folder"); openNotebook(); });
  var RUSH_START = 60000;
  /* Rush stages: every 5 cases a new stage starts with one new rule, so a long run keeps changing.
     Stage 1 has no rule; then the rules take turns. */
  var RUSH_RULES = [
    { id: "fast", name: "Fast clock", text: "The clock runs 25% faster." },
    { id: "fog", name: "Fog", text: "The facts are blurred. Tap a fact to read it." },
    { id: "nohint", name: "No magnifier", text: "Magnifiers don't work in this stage." },
    { id: "thin", name: "Thin bonus", text: "Each catch adds half the usual time." }
  ];
  function rushStage(n) { return Math.floor((n - 1) / 5) + 1; }
  function rushRule(n) { var st = rushStage(n); return st > 1 ? RUSH_RULES[(st - 2) % RUSH_RULES.length] : null; }
  function rule(id) { return !!(run && run.kind === "rush" && run.rule && run.rule.id === id); }
  // A new stage: show its rule for a moment (the clock waits), then play on. A tap skips it.
  function stageCard() {
    var r = run.rule, el = $("stage-card"), keep = run;
    if (!r) return;
    $("stage-n").textContent = "Stage " + rushStage(run.n);
    $("stage-name").textContent = r.name;
    $("stage-text").textContent = r.text;
    el.hidden = false; run.hold = true;
    Snd.play("twist");
    var done = function () { el.hidden = true; if (run === keep) run.hold = false; clearTimeout(t); el.onclick = null; };
    var t = setTimeout(done, 2600);
    el.onclick = done;
  }
  function startRush() {
    if (!S.endless.rules) { // the first run starts with the rules, so the clock isn't a surprise
      S.endless.rules = true; persist();
      showNotice({ icon: "⏱️", eyebrow: "Rush", title: "Beat the clock", yes: "Start the clock", no: "Not now", onYes: startRush,
        text: "You get <b>60 seconds</b> for the whole run. Every liar you catch, with proof, adds time: more for twists and two-fact proofs. " +
          "A wrong suspect or a wrong proof costs one of your <b>3 lives</b>. Catch liars in a row for a combo. " +
          "Every 5 cases a new stage starts with <b>a new rule</b>." });
      return;
    }
    run = {
      kind: "rush", n: 0, score: 0, lives: 3, combo: 0, bestCombo: 0, secondUsed: false, over: false, time: RUSH_START,
      avoid: seenAvoid(), rng: WL.rngFrom("rush:" + Date.now() + ":" + Math.random())
    };
    S.endless.runs++; persist();
    WL.track("rush_start", {});
    show("case");
    nextRush();
  }
  function nextRush() {
    run.n++;
    run.rule = rushRule(run.n);
    run.c = WL.rushCase(run.rng, run.n, run.avoid);
    rememberSeen(run.avoid);
    loadCase();
    if (run.n > 1 && (run.n - 1) % 5 === 0) stageCard();
  }
  function rushBonus(c) {
    var b = 8 + (c.mode !== "liar" ? 5 : 0) + ((c.proof || []).length > 1 ? 5 : 0);
    return rule("thin") ? Math.ceil(b / 2) : b;
  }
  /* What Rush showed you lately (facts, lines, openers, names), kept in the save so the next run starts with something else. */
  function seenAvoid() {
    var a = WL.newAvoid(), s = S.seen || {};
    ["facts", "lines", "premises", "names"].forEach(function (k) { Object.assign(a[k], s[k] || {}); });
    a.t = s.t || 0;
    return a;
  }
  function rememberSeen(a) {
    var newest = function (map, n) {
      return Object.keys(map).sort(function (x, y) { return map[y] - map[x]; }).slice(0, n).reduce(function (o, k) { o[k] = map[k]; return o; }, {});
    };
    S.seen = { t: a.t, facts: newest(a.facts, 60), lines: newest(a.lines, 120), premises: newest(a.premises, 16), names: newest(a.names, 30) };
  }

  /* ---------- rendering a case ---------- */
  function loadCase() {
    var c = run.c;
    run.pick = null; run.revealed = false; run.caseElapsed = 0; run.hint = false; run.froze = false; run.acts = [];
    if (run.kind === "train") run.wrong = 0;
    $("actionbar").hidden = false;
    renderCase(c);
    var m = memo().get(); // a case left half-way: same mistakes, hint and clock as before the reload
    // ...but only for the same case: an update can change a generated case, and old taps must not land on new suspects
    if (m && m.t && m.t !== c.title) m = null;
    if (m) {
      run.wrong = m.wrong || 0; run.hint = !!m.hint; run.caseElapsed = m.ms || 0;
      (m.acts || []).forEach(function (a) { act(a, true); });
      renderTools();
    }
    renderMeta();
    hideConfirm();
    $("verdict").hidden = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    gameTrace.agit = run.kind === "rush" ? 0.2 : 0.28;
    $("rec-time").classList.remove("urgent", "frozen");
    $("rec-time").textContent = run.kind === "rush" ? WL.fmtTime(run.time) : run.kind === "room" ? WL.fmtTime(run.limit) : run.kind === "train" ? WL.fmtTime(run.caseElapsed) : WL.fmtTime(run.elapsed);
    $("case-grid").scrollTop = 0;
    [].forEach.call(document.querySelectorAll(".pane"), function (p) { p.scrollTop = 0; });
    if (c.mode !== "liar") Snd.play("twist");
    else if (run.kind === "rush" ? run.n > 1 : run.kind === "train" ? false : run.idx > 0) Snd.play(c.d5 ? "camera" : "whoosh"); // a Daily 5 case brings new evidence
    Plat.gameplayStart();
    startClock();
    if (run.kind === "train" && !S.settings.tutorialDone) startCoach();
  }
  function renderCase(c) {
    var planted = c.mode === "planted";
    if (run.kind === "train") {
      setHud("Training", "Your first case");
      $("case-kicker").textContent = "Training case · Take your time";
    } else if (run.kind === "rush") {
      setHud("Rush", "Case " + run.n + " · " + (run.rule ? run.rule.name : "Stage 1"));
      $("case-kicker").textContent = LEVEL[c.level] || "Case";
    } else if (run.kind === "story") {
      setHud(run.label, "Case " + c.n + " of 5 · " + run.d5.ed.title);
      $("case-kicker").textContent = run.label + " · Case " + c.n + " of 5 · " + (c.n === 5 ? "The verdict" : "One try");
    } else if (run.kind === "room" && run.night) {
      setHud("Story Night", "Case " + c.n + " of 5 · " + run.d5.ed.title);
      $("case-kicker").textContent = "Story Night · Case " + c.n + " of 5 · " + (c.n === 5 ? "The verdict" : "One try");
    } else if (run.kind === "room") {
      setHud(run.pt ? "Partners" : "Live room", "Case " + run.round + " of " + (room && room.data ? room.data.rounds : 5));
      $("case-kicker").textContent = (LEVEL[c.level] || "Case") + (run.pt ? " · You have the " + (run.pt.side === "suspects" ? "stories" : "facts") + " · One try" : " · Everyone has the same case · One try");
    } else if (run.kind === "friend") {
      setHud(run.preview ? "Your case" : "A friend's case", run.preview ? "Try it like your friends will" : "Written by " + c.by);
      $("case-kicker").textContent = "Written by " + c.by + " · One try";
    } else {
      var unit = c.d5 && run.d5.ed.fmt === 2 ? "Chapter " : "Case ";
      setHud("Daily #" + run.day + (run.kind === "replay" ? " practice" : ""), unit + (run.idx + 1) + " of 5" + (c.d5 ? " · " + run.d5.ed.title : ""));
      $("case-kicker").textContent = c.d5 ? unit + c.n + " of 5 · " + (c.n === 5 ? "The verdict" : "One wrong answer ends the day") : (LEVEL[c.level] || "Case") + " · One try";
    }
    var chap = c.fmt === 2;
    $("scr-case").classList.toggle("chapter-mode", chap);
    $("chapter").hidden = !chap;
    if (chap) {
      $("case-kicker").textContent = "Chapter " + c.n + " of 5";
      setHud(run.night ? run.label || "Story Night" : "Daily #" + run.day + (run.kind === "replay" ? " practice" : ""), "Chapter " + c.n + " of 5 · " + run.d5.ed.title);
      run.notes = []; run.sel = []; run.phase = "pick";
      Chapter.open(c, chState(c.n));
      renderTools();
      return;
    }
    Chapter.close();
    $("case-title").textContent = c.title;
    $("case-setup").textContent = c.setup;
    $("case-prev").hidden = !c.prev;
    $("case-prev").innerHTML = c.prev ? "<b>Previously</b> " + esc(c.prev) : "";
    var tw = $("twist");
    if (c.mode === "honest") { tw.innerHTML = "<strong>Twist!</strong><span>Two of them are lying. Find the only one telling the truth.</span>"; tw.hidden = false; }
    else if (planted) { tw.innerHTML = "<strong>Twist!</strong><span>All three are telling the truth. One of the facts was planted. Find the fake fact.</span>"; tw.hidden = false; }
    else tw.hidden = true;

    // Facts and suspects are all buttons: one side is picked (the liar, or the fake fact), the other proves it.
    var ul = $("clues"); ul.innerHTML = "";
    c.clues.forEach(function (txt, i) {
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "clue" + (rule("fog") ? " fogged" : ""); b.textContent = txt;
      var fact = c.d5 && c.facts[i];
      if (fact) { // Daily 5 evidence says what it is and where it came from; a finding carried from an earlier case says so
        b.className += fact.kind === "finding" ? " carried" : "";
        b.innerHTML = '<span class="ev-tag">' + esc(fact.kind === "finding" ? fact.title : (KIND[fact.kind] || fact.kind) + " · " + fact.title + (fact.time ? " · " + fmtClock(fact.time) : "")) + "</span>" + esc(txt);
      }
      if (rule("fog")) b.setAttribute("aria-description", "Blurred. Tap to read it.");
      b.addEventListener("click", function () { tap("clue", i); });
      li.appendChild(b); ul.appendChild(li);
    });
    var box = $("suspects"); box.innerHTML = "";
    run.notes = c.d5 ? c.pids.map(function (id) { return run.d5.st.notes[id] || ""; }) : []; // Daily 5 notes follow a person through the story
    if (c.mode === "verdict") renderVerdictParts(c);
    c.suspects.forEach(function (s, i) {
      var wrap = document.createElement("div"), el = document.createElement("button"), nb = document.createElement("button");
      wrap.className = "suspect-wrap";
      el.type = "button"; el.className = "suspect";
      el.addEventListener("click", function () { tap("suspect", i); });
      el.innerHTML = '<span class="mug">' + WL.avatar(s.name) + '</span><span class="who"><span class="who-top"><span class="who-name">' + esc(s.name) +
        '</span><span class="who-role">' + esc(s.role) + '</span><span class="who-key" aria-hidden="true">' + (i + 1) + "</span>" +
        '</span><span class="says">' + esc(s.says) + "</span></span>";
      nb.type = "button"; nb.className = "note-btn";
      nb.addEventListener("click", function () { noteSuspect(i); });
      wrap.appendChild(el); wrap.appendChild(nb);
      box.appendChild(wrap);
    });
    ptClear();
    if (run.pt) ptApply();
    setPhase("pick");
    renderTools();
  }
  /* Notebook: tag a suspect while you check their story. Notes only, they never count as an answer. */
  var NOTES = { "": ["Add a note", PENCIL_SVG], ok: ["Checks out", "✓"], sus: ["Suspicious", "?"] };
  function noteSuspect(i) {
    if (!run || run.revealed) return;
    run.notes[i] = { "": "ok", ok: "sus", sus: "" }[run.notes[i] || ""];
    if (run.c.d5) { run.d5.st.notes[run.c.pids[i]] = run.notes[i]; persist(); }
    Snd.play("pin");
    renderNotes();
  }
  function renderNotes() {
    var off = run.revealed || run.phase === "proof";
    [].forEach.call($("suspects").querySelectorAll(".suspect-wrap"), function (w, i) {
      var n = run.notes[i] || "", el = w.firstChild, nb = w.lastChild, name = run.c.suspects[i].name;
      el.classList.toggle("note-ok", n === "ok"); el.classList.toggle("note-sus", n === "sus");
      nb.hidden = off || el.classList.contains("is-wrong") || el.classList.contains("is-out");
      nb.className = "note-btn" + (n ? " on " + n : "");
      nb.innerHTML = NOTES[n][1];
      nb.setAttribute("aria-label", "Your note on " + name + ": " + (n ? NOTES[n][0] : "none") + ". Tap to change it.");
      nb.title = n ? NOTES[n][0] : "Add a note";
    });
  }
  function pickKind() { return run.c.mode === "planted" ? "clue" : "suspect"; }
  function proofKind() { return run.c.mode === "planted" ? "suspect" : "clue"; }
  function els(kind) { return [].slice.call(kind === "clue" ? $("clues").querySelectorAll(".clue") : $("suspects").querySelectorAll(".suspect")); }
  // "pick": choose the liar (or the fake fact). "proof": point at what proves it.
  function setPhase(p) {
    var c = run.c, on = p === "proof" ? proofKind() : pickKind(), n = (c.proof || []).length;
    run.phase = p; run.sel = [];
    ["clue", "suspect"].forEach(function (k) {
      // while picking the liar, facts can be ticked off like notes as each story is checked
      var note = k === "clue" && p === "pick" && c.mode !== "planted";
      els(k).forEach(function (e) {
        e.disabled = (k !== on && !note) || e.classList.contains("is-out") || e.classList.contains("is-wrong");
        e.classList.toggle("static", k !== on && !note);
        e.classList.remove("is-picked");
        if (k === on) e.setAttribute("aria-pressed", "false"); else e.removeAttribute("aria-pressed");
      });
    });
    renderNotes();
    var scr = $("scr-case");
    scr.classList.toggle("proving", p === "proof");
    scr.classList.toggle("planted", c.mode === "planted");
    var ask = p === "proof" && c.mode !== "planted";
    $("facts-h").textContent = ask ? (n > 1 ? "Tap the " + n + " facts that prove it" : "Tap the fact that proves it")
      : c.mode === "verdict" ? "What your investigation proved" : c.d5 ? "Evidence on file" : "Facts the police checked";
    $("facts-h").classList.toggle("ask", ask);
    drawStrings();
    // Daily 5 doesn't know the answer until the file is checked, so the proof step names the player's own pick
    var who = c.d5 && !run.revealed ? run.pick : c.answer;
    var name = c.mode === "planted" || c.mode === "verdict" ? "" : (c.suspects[who] || {}).name || "";
    $("task").textContent = p === "pick"
      ? (c.mode === "verdict" ? c.ask + " Answer every question, then submit." : c.d5 ? c.ask + " Tap the liar."
        : c.mode === "liar" ? "One of them is lying. Tap the liar." : c.mode === "honest" ? "Tap the one person telling the truth." : "Every story is true. Tap the fact that can't be right.")
      : c.mode === "liar" ? "You accused " + name + ". Now prove it: tap the fact" + (n > 1 ? "s" : "") + " " + name + "'s story breaks."
      : c.mode === "honest" ? name + " is the honest one. Now prove the other two lied: tap the fact" + (n > 1 ? "s" : "") + " their stories break."
      : "That fact is fake. Now prove it: tap the story that shows it can't be true.";
    ptGate();
  }
  function tap(kind, i) {
    if (!run || run.revealed) return;
    if (run.pt && (!els(kind)[i] || els(kind)[i].disabled)) return; // Partners: number keys can't tap your partner's half
    var fe = kind === "clue" && els("clue")[i];
    if (fe && fe.classList.contains("fogged")) { fe.classList.remove("fogged"); fe.removeAttribute("aria-description"); Snd.play("tap"); return; }
    if (run.phase === "pick" && kind === "clue" && run.c.mode !== "planted") {
      var f = els("clue")[i], on = f.classList.toggle("ticked");
      f.setAttribute("aria-pressed", on ? "true" : "false");
      Snd.play("pin");
      return;
    }
    if (run.phase === "proof") { if (kind === proofKind()) toggleProof(i); }
    else if (kind === pickKind()) select(i);
  }

  /* In-progress case, saved so a reload can't wipe a wrong guess or a hint. Rush runs aren't saved.
     run.acts lists what happened (["c", i] wrong pick, ["o", kind, i] hint, ["b", i] wrong proof, ["p"] proof step). */
  function memo() {
    var k = run.kind;
    if (k === "daily" || k === "replay") {
      return { get: function () { var m = run.prog.cur; return m && m.idx === run.idx ? m : null; },
        set: function (m) { run.prog.cur = m ? Object.assign({ idx: run.idx }, m) : null; } };
    }
    return { get: function () { return null; }, set: function () {} };
  }
  function saveMemo() {
    if (!run || run.revealed) return;
    memo().set({ v: run.v || 0, t: run.c.title, wrong: run.wrong || 0, hint: run.hint, ms: Math.round(run.caseElapsed), acts: run.acts });
    persist();
  }
  function act(a, silent) {
    if (!silent) run.acts.push(a);
    var c = run.c, el;
    if (a[0] === "p") { if (a[1] != null) run.pick = a[1]; startProof(silent); return; } // Daily 5 keeps whom you accused
    if (a[0] === "c") {
      el = els(pickKind())[a[1]];
      el.classList.add("is-wrong");
      stamp(el, c.mode === "liar" ? "Cleared" : c.mode === "honest" ? "Liar" : "True", c.mode === "honest" ? "" : "cleared");
    } else if (a[0] === "o") {
      el = els(a[1])[a[2]];
      el.classList.add("is-out");
      el.setAttribute("aria-label", (a[1] === "clue" ? c.clues[a[2]] : c.suspects[a[2]].name) + ", ruled out by a hint");
    } else {
      el = els(proofKind())[a[1]];
      el.classList.add("is-wrong");
    }
    el.classList.remove("is-picked");
    el.disabled = true;
    renderNotes();
  }
  function renderMeta() {
    var k = run.kind;
    $("pips").hidden = !(k === "daily" || k === "replay");
    var nb = $("btn-notebook");
    nb.hidden = !run.d5;
    if (run.d5 && run.c) { var nx = nbData(), fresh = nx.ev.length + nx.fi.length - (run.d5.st.seen || 0); $("nb-new").hidden = fresh <= 0; $("nb-new").textContent = fresh; nb.setAttribute("aria-label", "Open the notebook" + (fresh > 0 ? ", " + fresh + " new" : "")); }
    $("stars-live").hidden = true;
    $("lives").hidden = k !== "rush";
    $("replay-tag").hidden = !(k === "replay" || k === "friend" || k === "room" || k === "story");
    $("replay-tag").textContent = k === "room" ? "Live" : k === "story" ? (run.story.mine ? "Yours" : "Friend's story") : k === "friend" ? (run.preview ? "Preview" : run.again ? "Again" : "Friend's case") : k === "replay" ? "Practice" : "Replay";
    var combo = k === "rush" ? run.combo : 0;
    $("combo").hidden = combo < 2;
    $("combo").innerHTML = FLAME_SVG + "×" + combo;
    $("combo").setAttribute("aria-label", "Streak: " + combo + " in a row");
    if (k === "rush") {
      $("lives").innerHTML = [0, 1, 2].map(function (i) { return '<span class="' + (i < run.lives ? "on" : "") + '"></span>'; }).join("");
      $("lives").setAttribute("aria-label", run.lives + " of 3 lives left");
      $("rec-left").textContent = "Score " + run.score;
    } else if (k === "train") {
      $("rec-left").textContent = "Training";
    } else if (k === "friend" || k === "room") {
      $("rec-left").textContent = k === "room" ? (run.d5 && run.d5.ed && run.d5.ed.fmt === 2 ? "Chapter " : "Case ") + run.round : "Friend's case";
    } else {
      var res = run.prog.results;
      $("pips").innerHTML = run.cases.map(function (_, i) {
        return '<span class="' + (res[i] ? "cell-" + cellClass(res[i]) : i === run.idx ? "now" : "") + '">' + (res[i] === "r" ? "✗" : res[i] === "-" ? "" : res[i] ? "✓" : i + 1) + "</span>";
      }).join("");
      $("pips").setAttribute("aria-label", "Case " + (Math.min(run.idx, 4) + 1) + " of 5. " + scoreOf(res) + " caught so far.");
      $("rec-left").textContent = (run.d5 && run.d5.ed.fmt === 2 ? "Chapter " : "Case ") + (Math.min(run.idx, 4) + 1) + " of 5";
    }
  }
  function optionEls() { return els(run.phase === "proof" ? proofKind() : pickKind()); }
  function proofSets(c) { return [c.proof || []].concat(c.alt || []); }

  /* ---------- power-ups ---------- */
  function hintMode() {
    if (!run || run.revealed || run.hint) return "used";
    if (run.kind === "friend" || run.kind === "room" || run.kind === "story" || rule("nohint")) return "off"; // played straight: everyone on equal terms
    if (run.c && run.c.d5) return run.d5.r.hunch ? "spent" : run.phase === "pick" ? "hunch" : "later"; // one free Hunch a day, checked by the file
    if ((S.inv.magnifier || 0) > 0) return "item";
    if (run.kind !== "rush" && canRewarded() && P.coolLeft("hintAd", 90) === 0) return "ad";
    return "none";
  }
  function renderTools() {
    var m = hintMode(), hb = $("btn-hint"), n = $("hint-n");
    if (run.c && run.c.d5) {
      var need = (run.c.proof || []).length;
      hb.disabled = m !== "hunch"; n.classList.remove("ad");
      $("hint-label").textContent = "Hunch"; n.textContent = m === "hunch" ? 1 : 0;
      hb.setAttribute("aria-label", m === "hunch" ? "Use your Hunch: rule out one innocent suspect. One free Hunch a day." : "Hunch used");
      $("btn-freeze").hidden = true;
      $("tool-note").textContent = run.phase === "proof" && !run.c.fmt ? "Tap the " + (need > 1 ? need + " facts that prove" : "fact that proves") + " it." :
        m === "hunch" ? (run.c.mode === "verdict" ? "Your free Hunch rules out one wrong answer." : run.c.fmt === 2 ? "Your free Hunch rules out one suspect who isn't lying here." : "Your free Hunch rules out one innocent suspect.") + " The case turns amber." :
        m === "used" ? "Your Hunch ruled one out." : m === "spent" ? "You've used today's Hunch." : m === "off" ? "No Hunch in " + (run.kind === "story" ? "a player's story" : "Story Night") + ". One try per case." : "";
      return;
    }
    hb.disabled = m === "used" || m === "none" || m === "off";
    n.classList.toggle("ad", m === "ad");
    if (m === "ad") { $("hint-label").textContent = "Hint"; n.textContent = "AD"; hb.setAttribute("aria-label", "Watch an ad for a hint"); }
    else { $("hint-label").textContent = "Magnifier"; n.textContent = S.inv.magnifier || 0; hb.setAttribute("aria-label", "Magnifier: rule out one wrong answer. " + (S.inv.magnifier || 0) + " left"); }
    var fb = $("btn-freeze");
    fb.hidden = run.kind !== "rush";
    fb.disabled = run.froze || (S.inv.freeze || 0) <= 0 || run.revealed;
    $("freeze-n").textContent = S.inv.freeze || 0;
    var note = "", n = (run.c.proof || []).length;
    if (run.phase === "proof" && run.pt && run.pt.picker) note = "Your partner taps the proof.";
    else if (run.phase === "proof") note = run.c.mode === "planted" ? "Tap the story that proves it." : "Tap the " + (n > 1 ? n + " facts that prove" : "fact that proves") + " it.";
    else if (m === "used") note = run.hint ? "One option ruled out." : "";
    else if (m === "off") note = run.kind === "rush" ? "No magnifier in this stage." : run.kind === "room" ? "No hints in a live room. One try." : "No hints in a friend's case. One try.";
    else if (m === "none") note = "Out of magnifiers. Get more in the Shop.";
    else if (run.kind === "daily" || run.kind === "replay") note = "A hint turns this case yellow.";
    else if (run.kind === "train") note = "No pressure: a wrong guess is just crossed out.";
    $("tool-note").textContent = note;
  }
  function useHint() {
    if (run && run.c && run.c.d5) { useHunch(); return; }
    var m = hintMode();
    if (m !== "item" && m !== "ad") return;
    // Rules out one wrong option: an innocent suspect while picking, a fact that proves nothing while proving.
    var give = function () {
      if (!run || run.revealed) return;
      var c = run.c, list = optionEls(), proving = run.phase === "proof";
      var right = function (i) { return proving ? proofSets(c).some(function (p) { return p.indexOf(i) >= 0; }) : i === c.answer; };
      var cands = list.map(function (_, i) { return i; }).filter(function (i) { return !right(i) && !list[i].disabled; });
      if (!cands.length) return;
      var k = cands[Math.floor(Math.random() * cands.length)];
      if (run.pick === k || run.sel.indexOf(k) >= 0) cancelPick();
      act(["o", proving ? proofKind() : pickKind(), k]);
      list[k].scrollIntoView({ block: "nearest" });
      run.hint = true;
      Snd.play("whoosh");
      renderTools();
      saveMemo();
      WL.track("hint_used", { kind: run.kind, type: m });
    };
    if (m === "item") { P.useItem("magnifier"); give(); }
    else {
      P.coolStart("hintAd"); persist();
      Plat.rewarded("hint").then(function (ok) {
        if (ok) { toast("Hint unlocked"); give(); } else { adFailed(); renderTools(); }
      });
    }
  }
  // Daily 5's free Hunch: the file says which innocent suspect (or wrong answer) to rule out, once a day.
  function useHunch() {
    if (hintMode() !== "hunch") return;
    var d5 = run.d5, c = run.c, n = c.n, keep = run;
    $("btn-hint").disabled = true;
    d5.api.hunch(run.day, n).then(function (h) {
      if (run !== keep || !h) return;
      d5.r.hunch = n; if (d5.st.run) d5.st.run.hunch = n;
      run.hint = true;
      if (c.fmt === 2) Chapter.hunch(h.who);
      else if (c.mode === "verdict") {
        var b = $("suspects").querySelector('.vopt[data-q="' + h.part + '"][data-o="' + h.out + '"]');
        if (b) { b.classList.add("is-out"); b.classList.remove("is-picked"); b.disabled = true; if (run.vpick[h.part] === h.out) { delete run.vpick[h.part]; hideConfirm(); } }
      } else {
        var i = c.sids.indexOf(h.out);
        if (run.pick === i) cancelPick();
        if (i >= 0) { act(["o", "suspect", i]); els("suspect")[i].scrollIntoView({ block: "nearest" }); }
      }
      Snd.play("whoosh");
      renderTools(); saveMemo(); persist();
      WL.track("hint_used", { kind: "d5", type: "hunch", case: n });
    }).catch(function (e) { if (run === keep) { renderTools(); d5Fail(e); } });
  }
  function useFreeze() {
    if (!run || run.kind !== "rush" || run.froze || run.revealed || !P.useItem("freeze")) return;
    run.froze = true;
    run.time += 10000;
    $("rec-time").classList.add("frozen");
    setTimeout(function () { $("rec-time").classList.remove("frozen"); }, 1200);
    Snd.play("combo");
    FX.float("+10s", $("rec-time"));
    renderTools(); persist();
  }

  /* ---------- picking + accusing ---------- */
  function select(i) {
    if (!run || run.revealed) return;
    var c = run.c, list = optionEls(), el = list[i];
    if (!el || el.classList.contains("is-out") || el.classList.contains("is-wrong")) return;
    run.pick = i;
    list.forEach(function (e, k) { e.classList.toggle("is-picked", k === i); e.setAttribute("aria-pressed", k === i ? "true" : "false"); });
    Snd.play("tap");
    var name = c.mode === "planted" ? "" : c.suspects[i].name;
    $("accuse-q").textContent = (c.mode === "liar" ? "Is " + name + " the liar?" : c.mode === "honest" ? "Is " + name + " the only honest one?" : "Is this fact fake?") +
      (run.kind === "train" || run.kind === "rush" ? "" : " One try."); // a wrong pick ends the case here
    $("btn-accuse").textContent = c.mode === "liar" ? "Accuse " + name : c.mode === "honest" ? name + " is honest" : "It's fake";
    $("tools").hidden = true; $("confirm").hidden = false;
    if (run.coachStep === 2) hideCoach();
  }
  function cancelPick() {
    if (!run || run.revealed) return;
    if (run.phase === "proof") run.sel = []; else run.pick = null;
    optionEls().forEach(function (e) { e.classList.remove("is-picked"); e.setAttribute("aria-pressed", "false"); });
    drawStrings();
    hideConfirm();
  }
  function confirmNow() { if (run && run.c && run.c.mode === "verdict" && !run.revealed) d5Submit(); else if (run && run.phase === "proof") present(); else accuse(false); }
  function hideConfirm() { $("confirm").hidden = true; $("tools").hidden = false; }
  function stamp(el, text, cls) {
    var old = el.querySelector(".stamp"); if (old) old.remove();
    var s = document.createElement("span");
    s.className = "stamp " + (cls || "");
    s.textContent = text;
    el.classList.add("has-stamp");
    el.appendChild(s);
  }
  // Step 1: accuse. The right suspect (or fake fact) opens the proof step; a wrong one is a miss (training: crossed out).
  function accuse(timeout) {
    if (!run || run.revealed) return;
    var c = run.c, pick = timeout ? -1 : run.pick;
    if (!timeout && pick == null) return;
    hideConfirm();
    hideCoach();
    if (timeout) { if (c.d5) { run.timedOut = true; d5Judge({ s: "", p: "" }); } else reveal(false, "timeout"); return; }
    if (c.d5) { act(["p", pick]); return; }
    if (run.pt) { ptPick(pick); return; } // Daily 5: accuse, then prove; the file is checked once both are in
    if (pick !== c.answer) { if (run.kind === "train") mistake(pick); else reveal(false, "pick"); return; }
    if (!(c.proof || []).length) { reveal(true, "ok"); return; }
    act(["p"]);
  }
  function startProof(silent) {
    var c = run.c, at = c.d5 ? run.pick : c.answer, el = els(pickKind())[at];
    setPhase("proof");
    run.pick = at;
    el.classList.add("is-accused");
    stamp(el, c.mode === "honest" ? "Honest" : c.mode === "planted" ? "Fake" : "Accused", "pending");
    renderTools();
    if (silent) return;
    saveMemo();
    Snd.play("stamp"); gameTrace.spike(false);
    (c.mode === "planted" ? $("task") : $("facts-h")).scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    if (run.kind === "train" && !S.settings.tutorialDone) {
      run.coachStep = 3;
      coach($("clues"), "Good! Now prove it. Tap the fact that shows " + c.suspects[c.answer].name + "'s story can't be true, then press Present proof.", "");
    }
  }
  // Step 2: point at the proof. Needs exactly the facts (or the story) that show it.
  function toggleProof(i) {
    var c = run.c, need = c.proof.length, list = els(proofKind());
    if (!list[i] || list[i].disabled) return;
    var k = run.sel.indexOf(i);
    if (k >= 0) run.sel.splice(k, 1);
    else { run.sel.push(i); if (run.sel.length > need) run.sel.shift(); }
    list.forEach(function (e, j) { var on = run.sel.indexOf(j) >= 0; e.classList.toggle("is-picked", on); e.setAttribute("aria-pressed", on ? "true" : "false"); });
    drawStrings();
    Snd.play("tap");
    if (run.coachStep === 3) hideCoach();
    if (run.sel.length < need) { hideConfirm(); return; }
    $("accuse-q").textContent = c.mode === "planted" ? "Does " + c.suspects[run.sel[0]].name + "'s story prove it?" : need > 1 ? "Do these " + need + " facts prove it?" : "Does this fact prove it?";
    $("btn-accuse").textContent = "Present proof";
    $("tools").hidden = true; $("confirm").hidden = false;
  }
  function present() {
    if (!run || run.revealed || run.phase !== "proof") return;
    if (run.c.d5) { d5Submit(); return; }
    hideConfirm(); hideCoach();
    var c = run.c, s = run.sel.slice().sort(function (a, b) { return a - b; }).join();
    if (proofSets(c).some(function (p) { return p.join() === s; })) reveal(true, "ok");
    else if (run.kind === "train") mistake(-1);
    else reveal(false, "proof");
  }
  // The training case can't be failed: a wrong guess (suspect or proof) is crossed out and the player tries again.
  function mistake(pick) {
    var c = run.c, el = $("clues"), msg;
    run.wrong++;
    if (pick >= 0) {
      act(["c", pick]);
      el = els(pickKind())[pick];
      msg = c.mode === "liar" ? esc(c.suspects[pick].name) + "'s story checks out." : c.mode === "honest" ? esc(c.suspects[pick].name) + " is lying, but you need the honest one." : "That fact is true.";
      run.pick = null;
    } else {
      run.sel.forEach(function (i) { if (!proofSets(c).some(function (p) { return p.indexOf(i) >= 0; })) act(["b", i]); });
      msg = c.mode === "planted" ? "That story doesn't prove it." : "That doesn't prove it.";
      cancelPick();
    }
    Snd.play("wrong"); FX.shake(el); gameTrace.spike(true);
    toast(msg + " Try again: check each story against the facts.", "", 3200);
    renderMeta(); renderTools();
  }
  // how: "ok", "pick" (wrong suspect), "proof" (right suspect, wrong proof), "timeout"
  function reveal(correct, how) {
    var c = run.c, pk = els(pickKind()), pf = els(proofKind());
    run.revealed = true;
    if (run.pt) ptClear(); // the verdict shows both halves
    renderNotes();
    stopClock();
    Plat.gameplayStop();
    $("scr-case").classList.remove("proving");
    $("task").textContent = correct ? "Case closed." : "Here's what really happened.";
    $("facts-h").textContent = "Facts the police checked"; $("facts-h").classList.remove("ask");
    pk.concat(pf).forEach(function (e) { e.classList.remove("is-picked", "fogged"); e.disabled = true; });
    var ansEl = pk[c.answer];
    ansEl.classList.remove("is-accused");
    stamp(ansEl, c.mode === "honest" ? "Honest" : c.mode === "planted" ? "Fake" : "Liar", c.mode === "honest" ? "ok" : "");
    if (c.mode !== "planted") ansEl.classList.add("is-answer");
    if (c.mode === "honest") ansEl.classList.add("ok-answer");
    (c.proof || []).forEach(function (i) { if (pf[i]) pf[i].classList.add("is-proof"); });
    drawStrings();
    if (how === "pick" && run.pick != null && pk[run.pick]) {
      pk[run.pick].classList.add("is-wrong");
      if (c.mode !== "planted") { var tag = document.createElement("span"); tag.className = "your-pick"; tag.textContent = "Your pick"; pk[run.pick].appendChild(tag); }
    }
    if (how === "proof") run.sel.forEach(function (i) { if (c.proof.indexOf(i) < 0) pf[i].classList.add("is-wrong"); });
    $("actionbar").hidden = true;
    gameTrace.spike(!correct);
    Snd.play("stamp");
    if (correct && c.mode !== "planted") Snd.play("cuffs", { delay: 0.3 });
    setTimeout(function () { Snd.play(how === "timeout" ? "timeout" : correct ? "correct" : "wrong"); }, correct ? 700 : 170);
    if (!correct) { FX.shake($("case-grid")); if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) { /* ignore */ } } }

    if (run.kind === "train") verdictTrain(ansEl);
    else if (run.kind === "rush") verdictRush(correct, how);
    else if (run.kind === "friend") verdictFriend(correct, how);
    else if (run.kind === "room") verdictRoom(correct, how);
    else if (run.kind === "story") verdictStory(correct, how);
    else verdictDaily(correct, how);
  }
  /* ---------- case board string ----------
     A red thread from the accused to the facts you point at (or, after the verdict, to the facts that prove it),
     like the string on a detective's pin board. Drawn in an SVG laid over the board, redrawn when anything moves. */
  var strKey = "", strRaf = 0;
  function drawStrings() { if (!strRaf) strRaf = requestAnimationFrame(function () { strRaf = 0; paintStrings(); }); }
  function pinAt(e, g) {
    var r = e.getBoundingClientRect(), pane = e.closest(".pane"), pr = pane ? pane.getBoundingClientRect() : g;
    var clue = e.classList.contains("clue"), em = parseFloat(getComputedStyle(e).fontSize) || 16;
    var x = clue ? r.left + em * 1.12 : r.left + r.width / 2, y = clue ? r.top + r.height / 2 : r.top + 5;
    var off = y < pr.top || y > pr.bottom; // scrolled out of its pane: the string ends at the pane's edge
    return { x: x - g.left, y: Math.min(Math.max(y, pr.top), pr.bottom) - g.top, off: off };
  }
  function paintStrings() {
    var svg = $("strings"), pairs = [];
    if (run && run.c && !run.c.fmt && screen === "case" && (run.phase === "proof" || run.revealed)) {
      var c = run.c, g = svg.getBoundingClientRect(), from = els(pickKind())[c.d5 && !run.revealed ? run.pick : c.answer], pf = els(proofKind());
      (run.revealed ? c.proof || [] : run.sel).forEach(function (i) { if (from && pf[i]) pairs.push([pinAt(from, g), pinAt(pf[i], g), i]); });
    }
    var key = pairs.map(function (p) { return p[2]; }).join() + (run && run.revealed ? "r" : "");
    var d = pairs.map(function (p) {
      var a = p[0], b = p[1], sag = 14 + Math.abs(b.x - a.x) * 0.12; // a little slack, so it hangs like real string
      return "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) + "Q" + ((a.x + b.x) / 2).toFixed(1) + " " + ((a.y + b.y) / 2 + sag).toFixed(1) + " " + b.x.toFixed(1) + " " + b.y.toFixed(1);
    });
    if (key !== strKey) {
      strKey = key;
      svg.innerHTML = d.map(function (path, k) {
        var a = pairs[k][0], b = pairs[k][1];
        return '<g class="thread' + (a.off || b.off ? " off" : "") + '"><path class="str-shade" d="' + path + '"/><path class="str" pathLength="1" d="' + path + '"/>' +
          '<circle class="knot" r="3.6" cx="' + a.x.toFixed(1) + '" cy="' + a.y.toFixed(1) + '"/><circle class="knot" r="3.6" cx="' + b.x.toFixed(1) + '" cy="' + b.y.toFixed(1) + '"/></g>';
      }).join("");
      return;
    }
    [].forEach.call(svg.querySelectorAll(".thread"), function (t, k) {
      var a = pairs[k][0], b = pairs[k][1], ps = t.querySelectorAll("path"), ks = t.querySelectorAll("circle");
      ps[0].setAttribute("d", d[k]); ps[1].setAttribute("d", d[k]);
      ks[0].setAttribute("cx", a.x.toFixed(1)); ks[0].setAttribute("cy", a.y.toFixed(1));
      ks[1].setAttribute("cx", b.x.toFixed(1)); ks[1].setAttribute("cy", b.y.toFixed(1));
      t.classList.toggle("off", a.off || b.off);
    });
  }
  [].forEach.call(document.querySelectorAll("#case-grid .pane"), function (p) { p.addEventListener("scroll", drawStrings, { passive: true }); });
  window.addEventListener("resize", drawStrings);

  function missLine(how) {
    if (how === "proof") return run.c.mode === "planted" ? "You found the fake fact, but not the story that proves it. " : "Right suspect, wrong proof. Without proof, the liar walks. ";
    return "";
  }
  // The proof, spelled out: what they said, what the facts say, and why it can't be both.
  function proofHtml(c) {
    if (c.mode === "verdict") return verdictHtml(c);
    var said = c.mode === "planted" ? c.proof.slice(0, 1) : c.mode === "honest" ? [0, 1, 2].filter(function (i) { return i !== c.answer; }) : [c.answer];
    var facts = c.mode === "planted" ? [c.answer] : c.proof;
    return said.map(function (i) { return '<p class="pb-said"><b>' + esc(c.suspects[i].name) + " said</b> <q>" + esc(c.suspects[i].says) + "</q></p>"; }).join("") +
      '<p class="pb-but">' + (c.mode === "planted" ? "But the planted fact said" : facts.length > 1 ? "But the facts say" : "But the fact says") + "</p>" +
      '<ul class="pb-facts">' + facts.map(function (i) { return "<li>" + esc(c.clues[i]) + "</li>"; }).join("") + "</ul>" +
      (facts.some(function (i) { return c.clues[i] === c.why; }) ? "" : '<p class="pb-so">' + esc(c.why) + "</p>") + // some explanations are just the fact again
      (c.motive ? '<p class="pb-motive"><b>Motive</b> ' + esc(c.motive) + "</p>" : "");
  }

  // Case 5: each question, the right answer, and yours when it was different.
  function verdictHtml(c) {
    var lab = function (q, id) { var o = q.options.filter(function (x) { return x.id === id; })[0]; return o ? o.label : "–"; };
    return '<ul class="pb-facts verdict-list">' + c.parts.map(function (q) {
      var right = c.vanswer[q.id], mine = run.vpick[q.id];
      return "<li><b>" + esc(q.ask) + "</b> " + esc(lab(q, right)) + (mine === right ? ' <span class="pb-ok">✓</span>' : ' <span class="pb-miss">You said: ' + esc(lab(q, mine)) + "</span>") + "</li>";
    }).join("") + '</ul><p class="pb-so">' + esc(c.why) + "</p>";
  }
  function setVerdict(o) {
    milestones();
    var v = $("verdict");
    $("verdict-head").textContent = o.head;
    $("verdict-head").className = "verdict-head " + (o.good ? "good" : "bad");
    var vs = $("verdict-stars");
    vs.hidden = o.stars == null;
    if (o.stars != null) vs.innerHTML = [0, 1, 2].map(function (i) { return '<span class="st' + (i < o.stars ? " on" : "") + '"></span>'; }).join("");
    vs.setAttribute("aria-label", (o.stars || 0) + " of 3 stars");
    $("verdict-banner").hidden = !o.banner; $("verdict-banner").textContent = o.banner || "";
    $("btn-verdict-hq").textContent = o.hq || "HQ";
    $("btn-verdict-hq").classList.toggle("stop", !!o.hq && o.hq === "Stop for today");
    $("verdict-rewards").innerHTML = o.rewards || "";
    $("why").innerHTML = "<strong>" + esc(o.sub) + "</strong>";
    $("proof-box").innerHTML = proofHtml(run.c);
    var tr = $("twist-reveal");
    if (run.c.twist) { tr.textContent = run.c.twist; tr.hidden = false; } else tr.hidden = true;
    $("story-beat").hidden = !o.story; $("story-beat").textContent = o.story || "";
    $("btn-next").textContent = o.next;
    v.classList.toggle("over-suspects", run.c.mode === "planted");
    v.hidden = false;
    v.scrollTop = 0;
    try { $("btn-next").focus({ preventScroll: true }); } catch (e) { $("btn-next").focus(); }
    if (o.stars) {
      for (var i = 0; i < o.stars; i++) Snd.play("star", { delay: 0.35 + i * 0.18, rate: 1 + i * 0.12 });
    }
    setTimeout(flushQueue, o.stars === 3 ? 1100 : 700);
    cloudFlush(); // every finished case reaches the account at once
  }
  function answerLine() {
    var c = run.c;
    if (c.mode === "verdict") return "";
    if (c.mode === "planted") return "You found the planted fact.";
    var n = c.suspects[c.answer].name;
    return c.mode === "honest" ? n + " was the only honest one." : n + " was the liar.";
  }

  function verdictTrain(ansEl) {
    var r = P.trainDone({ hint: run.hint });
    S.settings.tutorialDone = true;
    persist();
    setVerdict({
      head: run.wrong ? "Case closed." : pick(CAUGHT), good: true, rewards: rw(r.coins, r.xp), sub: answerLine(),
      story: "That's the whole job: check every story against the facts, then prove the lie. Your first real case is waiting in Career, Book 1.",
      next: "Start Career: Book 1"
    });
    if (r.coins) FX.float("+" + r.coins, $("coins"), "coin");
    renderCoins(true);
    renderMeta();
    FX.confetti({ count: 60, y: ansEl.getBoundingClientRect().top });
    WL.track("training_done", { wrong: run.wrong, hint: run.hint });
  }
  function verdictDaily(correct, how) {
    var c = run.c, code = correct ? (run.hint ? "y" : "g") : "r";
    if (run.d5) run.prog.results = d5Results(run.d5.r); // the file's record, with the cases locked after a wrong answer
    else run.prog.results.push(code);
    run.prog.hints.push(run.hint); run.prog.elapsed = run.elapsed; run.prog.cur = null; run.prog.at = 0;
    var r = run.again ? { coins: 0, xp: 0 } : P.dailyCase({ correct: correct, hint: run.hint, twist: c.mode !== "liar" && !c.d5, replay: run.kind === "replay" });
    run.again = false;
    persist();
    var last = run.prog.results.length >= run.cases.length, locked = c.d5 && !correct && last && c.n < 5;
    run.reviveAsk = !!(c.d5 && !correct && c.n < 5 && d5Pending(run.d5.r, run.d5.st));
    setVerdict({
      head: correct ? (c.mode === "verdict" ? "Case closed!" : pick(CAUGHT)) : how === "proof" ? "Not proven." : c.mode === "verdict" ? "Not the whole truth." : "Not quite.", good: correct,
      banner: run.reviveAsk ? "You get one second chance today." : locked ? "The trail went cold. " + (run.d5.ed.fmt === 2 ? "Chapters " : "Cases ") + (c.n + 1) + "-5 are locked." : c.d5 && correct && c.n === 4 ? "One step left: your final verdict" : "",
      rewards: rw(r.coins, r.xp),
      sub: c.mode === "verdict" ? (correct ? "You named everyone behind it." : "Here's what the file proves.") : missLine(how) + answerLine(),
      story: c.d5 && c.finding ? "📓 New in your notebook: " + c.finding.text : "",
      next: run.reviveAsk ? (canRewarded() ? "Revive: watch a short ad" : "Use your second chance") : last ? (c.d5 && correct && c.n === 5 ? "See how it all happened" : "See your result") : c.fmt === 2 ? "Next chapter" : "Next case",
      hq: run.reviveAsk ? "Stop for today" : ""
    });
    if (r.coins) { FX.float("+" + r.coins, $("coins"), "coin"); renderCoins(true); }
    renderMeta();
    WL.track("daily_answer", { correct: correct, level: c.level, hint: run.hint, miss: correct ? "" : how });
  }
  function verdictRush(correct, how) {
    var r = null, timeout = how === "timeout";
    if (correct) {
      // a catch adds time and moves straight on, so the run keeps its rhythm
      run.score++; run.combo++; run.bestCombo = Math.max(run.bestCombo, run.combo);
      r = P.rushCatch({ combo: run.combo, hint: run.hint, twist: run.c.mode !== "liar" });
      var bonus = rushBonus(run.c);
      run.time += bonus * 1000;
      persist();
      FX.float("+" + bonus + "s", $("rec-time"));
      FX.float("+" + r.coins, $("coins"), "coin"); renderCoins(true);
      if (run.combo >= 2) { FX.float("Combo ×" + run.combo, $("combo"), "combo"); Snd.play("combo", { delay: 0.2, rate: 1 + Math.min(run.combo, 10) * 0.04 }); }
      renderMeta();
      var keep = run;
      setTimeout(function () { if (run === keep && run.revealed && !run.over) nextRush(); }, 950);
      return;
    }
    run.combo = 0;
    if (timeout) run.time = 0; else run.lives--;
    persist();
    var dead = run.lives <= 0 || run.time <= 0;
    setVerdict({
      head: timeout ? "Time's up." : how === "proof" ? "Not proven." : "Not quite.", good: false,
      sub: missLine(how) + answerLine(), next: dead ? "Continue" : "Next case"
    });
    FX.float(timeout ? "Time!" : "-1 life", $("lives"), "bad");
    renderMeta();
  }

  function next() {
    if (!run) return;
    Snd.play("click");
    if (run.d5 && run.reviveAsk) { d5Revive(); return; } // the choice stays on screen until the Revive is taken
    if (run.kind === "friend" && !run.preview && !run.again) { shareFriendResult(); return; } // stays on the result
    $("verdict").hidden = true;
    if (run.kind === "friend") { openWrite(); return; }
    if (run.kind === "room") { if (room) { show("room"); setHud("Live room", "Room " + room.code); renderRoom(); } else goHQ(); return; }
    if (run.kind === "train") { run = null; if (needsSetup()) openSetup(function () { Book.start(); }); else Book.start(); return; }
    if (run.kind === "rush") {
      if (run.lives <= 0 || run.time <= 0) { outOfLives(); return; }
      nextRush();
      return;
    }
    if (run.d5) { d5Next(); return; }
    run.idx = run.prog.results.length;
    if (run.idx >= run.cases.length) { finishDaily(); return; }
    run.c = run.cases[run.idx];
    persist();
    loadCase();
  }

  /* ---------- celebrations queued during play ---------- */
  function flushQueue() {
    if (!queue.length || document.querySelector("dialog[open]")) return;
    var item = queue.shift();
    // During a case, small news goes on the result card instead of popping up over it.
    var card = screen === "case" && !$("verdict").hidden ? $("verdict-rewards") : null;
    if (card && !(item.type === "levelup" && item.newTitle)) {
      var more = 0;
      if (item.type === "mission") while (queue.length && queue[0].type === "mission") { queue.shift(); more++; }
      card.insertAdjacentHTML("beforeend", item.type === "levelup" ? '<span class="rw xp">Level ' + item.level + "!</span>"
        : item.type === "achievement" ? '<span class="rw coin">🏆 ' + esc(item.a.name) + " +" + item.a.coins + "</span>"
        : '<span class="rw">✓ ' + (more ? more + 1 + " missions done" : "Mission done") + "</span>");
      Snd.play(item.type === "achievement" ? "achieve" : item.type === "levelup" ? "levelup" : "coin", { volume: 0.7 });
      renderCoins(true);
      setTimeout(flushQueue, 450);
      return;
    }
    if (item.type === "levelup") {
      if (item.newTitle) {
        $("rank-badge").innerHTML = FX.badge(item.level, P.tierFor(item.level), 112);
        $("rank-eyebrow").textContent = "Promoted to level " + item.level;
        $("rank-h").textContent = item.title;
        $("rank-text").textContent = "The precinct noticed your work. New title, new badge.";
        $("rank-rewards").innerHTML = "<li>" + item.reward.coins + " coins</li>" + (item.reward.magnifier ? "<li>A free Magnifier</li>" : "");
        Snd.play("levelup");
        FX.confetti({ count: 120 });
        Plat.happytime();
        openDialog("dlg-rank");
      } else {
        Snd.play("levelup", { volume: 0.7 });
        toast("Level " + item.level + "! +" + item.reward.coins + " coins", "gold");
        setTimeout(flushQueue, 2700);
      }
      renderCoins(true);
    } else if (item.type === "achievement") {
      Snd.play("achieve");
      toast("Achievement: " + esc(item.a.name) + " · +" + item.a.coins + " coins", "gold", 2800);
      renderCoins(true);
      setTimeout(flushQueue, 2900);
    } else if (item.type === "mission") {
      var more = 0;
      while (queue.length && queue[0].type === "mission") { queue.shift(); more++; }
      toast(more ? (more + 1) + " missions done. Claim your coins at HQ." : "Mission done: " + esc(item.m.text) + ". Claim it at HQ.", "", 2800);
      setTimeout(flushQueue, 2900);
    }
  }
  $("dlg-rank").addEventListener("close", function () { setTimeout(flushQueue, 200); });

  /* ---------- daily end ---------- */
  function finishDaily() {
    var p = run.prog, day = run.day, replay = run.kind === "replay";
    p.done = true; p.elapsed = run.elapsed;
    var score = scoreOf(p.results), st = S.stats, extra = {};
    if (!replay) {
      if (st.lastDay !== day) {
        st.played++;
        st.streak = st.lastDay === day - 1 ? st.streak + 1 : 1;
        st.maxStreak = Math.max(st.maxStreak, st.streak);
        st.lastDay = day;
        if (score === 5) st.perfect++;
        st.dist[score] = (st.dist[score] || 0) + 1;
        extra.streak = P.streakDay(st.streak);
      }
      S.history[day] = { score: score, grid: p.results.join(""), time: p.elapsed };
    } else if (!S.history[day]) {
      S.history[day] = { score: score, grid: p.results.join(""), time: p.elapsed, replay: true };
    }
    if (run.d5 && S.history[day]) S.history[day].story = run.d5.ed.title;
    var failed = !!run.d5 && d5Failed(p.results, run.d5.ed.strikes);
    var r = P.dailyDone(score, replay, failed);
    persist();
    WL.track(run.d5 ? (failed ? "d5_over" : "d5_complete") : "daily_complete", { day: day, score: score, replay: replay, seconds: Math.round(p.elapsed / 1000), days_played: st.played });
    midgame("daily_done").then(function () {
      showDailyResults(day, p, replay, r, extra);
      Snd.play(score >= 3 ? "fanfare" : "fail");
      if (score === 5 && !replay) { FX.confetti({ count: 140 }); Plat.happytime(); }
    });
  }

  /* ---------- rush end ---------- */
  function outOfLives() {
    if (run.secondUsed) { endRush(false); return; }
    run.secondUsed = true;
    var ads = canRewarded();
    $("chance-h").textContent = run.time <= 0 ? "Out of time" : "Out of lives";
    $("chance-text").textContent = ads
      ? "Watch a short ad to get a life and 15 more seconds, and keep your run of " + run.score + " going."
      : "You get one free second chance per run: a life and 15 more seconds. Keep your run of " + run.score + " going?";
    $("btn-chance-yes").innerHTML = ads ? AD_SVG + "Watch an ad to keep going" : "Use my second chance";
    run.continueOffered = ads;
    openDialog("dlg-chance");
  }
  $("btn-chance-yes").addEventListener("click", function () {
    closeDialog("dlg-chance");
    var go = function () {
      run.lives = Math.max(run.lives, 1); run.time = Math.max(run.time, 0) + 15000;
      WL.track("rush_continue", { score: run.score }); toast("One more life and 15 seconds!"); nextRush();
    };
    if (run.continueOffered) {
      Plat.rewarded("rush_continue").then(function (ok) { if (ok) go(); else { adFailed(); endRush(true); } });
    } else go();
  });
  $("btn-chance-no").addEventListener("click", function () { closeDialog("dlg-chance"); endRush(true); });
  $("dlg-chance").addEventListener("cancel", function (e) { e.preventDefault(); closeDialog("dlg-chance"); endRush(true); });
  function endRush(offeredNow) {
    stopClock();
    run.over = true;
    var prevBest = S.endless.best, isBest = run.score > prevBest;
    if (isBest) S.endless.best = run.score;
    var r = P.rushEnd(run.score);
    run.endBonus = r.bonus;
    persist();
    WL.track("rush_over", { score: run.score, cases: run.n });
    Plat.submitScore(S.endless.best);
    var keep = run;
    // A rewarded continue was just offered: no midgame ad on this same break.
    (offeredNow && keep.continueOffered ? Promise.resolve() : midgame("rush_over")).then(function () {
      showRushResults(keep, isBest, prevBest);
      Snd.play(isBest && keep.score > 0 ? "fanfare" : "fail");
      if (isBest && keep.score >= 10) { FX.confetti({ count: 120 }); Plat.happytime(); }
    });
  }

  /* ---------- results screens ---------- */
  function statsRow(pairs) { return pairs.map(function (p) { return "<div><dt>" + p[0] + "</dt><dd>" + p[1] + "</dd></div>"; }).join(""); }
  function actionBtn(label, cls, onClick, href) {
    var el = document.createElement(href ? "a" : "button");
    el.className = "btn wide " + cls; el.textContent = label;
    if (href) el.href = href; else { el.type = "button"; el.addEventListener("click", function () { Snd.play("click"); onClick(); }); }
    return el;
  }
  /* What's next: level bar + the closest mission, so every results screen points at one more goal. */
  function resProgress() {
    var el = $("res-progress");
    if (!el) return;
    var li = P.levelInfo(S.xp), nt = P.nextTitle(li.level), ms = P.ensureMissions();
    var ready = ms.list.filter(function (m) { return m.progress >= m.target && !m.claimed; }).length;
    var open = ms.list.filter(function (m) { return m.progress < m.target; })
      .sort(function (x, y) { return (y.progress / y.target) - (x.progress / x.target); })[0];
    var h = '<div class="rp-level">' + FX.badge(li.level, li.tier, 40) + '<div class="rp-body"><div class="rp-top"><b>Level ' + li.level + "</b> · " + esc(li.title) +
      '<span class="muted">' + (li.need - li.into) + " XP to go</span></div>" +
      '<span class="m-bar"><span style="width:' + Math.round((li.into / li.need) * 100) + '%"></span></span>' +
      (nt ? '<span class="muted small">' + esc(nt[1]) + " at level " + nt[0] + "</span>" : "") + "</div></div>";
    if (ready) h += '<button class="rp-mission ready" type="button" id="rp-claim">' + COIN_SVG + ready + " mission reward" + (ready > 1 ? "s" : "") + " ready. Claim at HQ</button>";
    else if (open) h += '<div class="rp-mission"><span>Next mission: ' + esc(P.missionText(open)) + '</span><span class="muted">' + open.progress + "/" + open.target + "</span></div>";
    el.innerHTML = h;
    var c = $("rp-claim");
    if (c) c.addEventListener("click", function () { Snd.play("click"); goHQ(); });
  }
  function focusTitle() { try { $("res-title").focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  function showDailyResults(day, p, replay, bonus, extra) {
    stopClock();
    show("results");
    var label = replay ? " practice" : "";
    setHud("Daily #" + day, replay ? "Practice" : "Results");
    var score = scoreOf(p.results), hints = p.results.filter(function (r) { return r === "y"; }).length;
    $("res-kicker").textContent = "Daily #" + day + label + (p.d5 ? " · " + p.title : " complete");
    $("res-title").textContent = DAILY_TITLES[score];
    $("res-body").innerHTML = '<div class="res-grid" role="img" aria-label="' + score + ' of 5 caught">' + cells(p.results, 5) + "</div>" +
      '<p class="res-line">You caught <strong>' + score + " of 5</strong> liars" + (replay ? "" : " in <strong>" + WL.fmtTime(p.elapsed) + "</strong>") +
      (hints ? ", with " + hints + " hint" + (hints > 1 ? "s" : "") : "") + ".</p>";
    if (p.d5) { // one story: how far the investigation got, then how it ends (now, or at midnight)
      var cold = d5Failed(p.results, p.strikes), at = p.results.lastIndexOf("r") + 1; // with a second chance, the miss that ended it
      $("res-title").textContent = score === 5 ? "Case closed. Nobody fooled you." : cold ? "The trail went cold" + (at ? (p.fmt === 2 ? " at Chapter " : " at Case ") + at : "") + "." : "Case closed.";
      $("res-body").innerHTML = '<div class="res-grid" role="img" aria-label="' + score + ' of 5 solved">' + cells(p.results, 5) + "</div>" +
        '<p class="res-line">You cracked <strong>' + score + " of 5</strong> " + (p.fmt === 2 ? "chapters" : "cases") + (replay ? "" : " in <strong>" + WL.fmtTime(p.elapsed) + "</strong>") +
        (hints ? ", with your Hunch" : "") + ".</p>" + (D5 ? '<div class="d5-end" id="d5-end"></div>' : "");
      d5EndCard(day, p);
    }
    $("res-rewards").innerHTML = (bonus && bonus.bonus ? '<span class="rw coin">' + COIN_SVG + "Daily done +" + bonus.bonus + "</span>" : "") +
      (bonus && bonus.perfect ? '<span class="rw coin">' + COIN_SVG + "Perfect day +" + bonus.perfect + "</span>" : "");
    var known = !replay && day === TODAY ? S.lb.ranks[day] : 0;
    setShare(function () { return dailyShareText(day, p, replay, known); });
    rankCard("");
    renderVersus(day, p);
    renderExtras(day, replay, extra || {});
    if (!replay && day === TODAY && lbOn()) {
      var onRank = function (rank) { known = rank; setShare(shareFn); };
      if (S.settings.playerName) postDaily(day, p, onRank);
      else {
        joinCard("See where you rank against other detectives today.", function () { postDaily(day, p, onRank); });
        // posted without a name, so today's player count is honest; joining later puts the name on it
        postAnon(day, p).then(function () { return LB.dailyStanding(day, score, p.elapsed); }).then(function (st) {
          S.lb.stand = { day: day, rank: st.rank, total: st.total }; persist();
          var h = $("res-rank").querySelector(".rank-head");
          if (h && st.total >= RANK_MIN) h.innerHTML = "You'd be <strong>#" + st.rank + "</strong> of " + st.total + " today: " + pctText(st) + ". Join to put your name up.";
          setShare(shareFn);
        }).catch(function () { /* the join card still works */ });
      }
    }
    var st = S.stats;
    $("res-stats").innerHTML = statsRow([["Days played", st.played], ["Streak", dailyStreak()], ["Best streak", st.maxStreak], ["Perfect days", st.perfect]]);
    resProgress();
    $("res-next").innerHTML = 'New cases in <strong data-countdown="1">' + WL.fmtCountdown(WL.msToNextDay()) + "</strong>";
    var acts = $("res-actions"); acts.innerHTML = "";
    acts.appendChild(actionBtn(careerLabel(), "primary", function () { Book.start(); }));
    if (replay) {
      acts.appendChild(actionBtn("Practice this day again", "ghost", function () { S.replay = null; persist(); startDaily(day, "practice"); }));
    }
    $("review").hidden = false; $("review").open = false;
    var d5st = p.d5 && S.d5 && S.d5[day];
    if (p.d5) $("review-list").innerHTML = [1, 2, 3, 4, 5].map(function (n) { // only the cases this player opened
      var c = d5st && d5st.cases[n], rv = d5st && d5st.reveals[n], r = cellClass(p.results[n - 1]);
      if (!c || !rv) return '<div class="review-item locked"><h4><span class="cell-' + r + '"></span>Case ' + n + ' · locked</h4><p class="muted">This case never opened.</p></div>';
      var ans = c.mode === "verdict" ? c.parts.map(function (q) { var o = q.options.filter(function (x) { return x.id === rv.answer.parts[q.id]; })[0]; return q.ask + " " + (o ? o.label : ""); }).join(" · ")
        : "The liar: " + ((c.suspects || []).filter(function (s) { return s.sid === rv.answer.s; })[0] || {}).name;
      return '<div class="review-item"><h4><span class="cell-' + r + '"></span>' + esc(c.title) + '</h4><p class="ans">' + esc(ans) + "</p><p>" + esc(rv.why) + "</p></div>";
    }).join("");
    var cases = p.d5 ? [] : WL.buildDay(day);
    if (!p.d5) $("review-list").innerHTML = cases.map(function (c, i) {
      var r = p.results[i] || "n";
      var ans = c.mode === "planted" ? "Planted fact: " + c.clues[c.answer]
        : (c.mode === "honest" ? "The honest one: " : "The liar: ") + c.suspects[c.answer].name + " (" + c.suspects[c.answer].role + ")";
      return '<div class="review-item"><h4><span class="cell-' + r + '"></span>' + esc(c.title) + '</h4><p class="ans">' + esc(ans) + "</p><p>" + esc(c.why) + "</p></div>";
    }).join("");
    if (window.WLAds && Plat.allowExternal()) window.WLAds.display($("ad-results"));
    run = null;
    renderCoins(false);
    focusTitle();
  }
  function showRushResults(r, isBest, prevBest) {
    show("results");
    setTimeout(flushQueue, 1200); // level-ups and achievements that waited for the run to end
    setHud("Rush", "Results");
    var score = r.score;
    $("res-kicker").textContent = "Rush · stage " + rushStage(Math.max(1, r.n)) + " · " + r.n + " cases";
    $("res-title").textContent = score === 0 ? "The liars won." : isBest && prevBest > 0 ? "New personal best!" : "Run over.";
    $("res-body").innerHTML = '<p class="res-big">' + score + "</p>" +
      '<p class="res-line">liar' + (score === 1 ? "" : "s") + " caught." + (r.bestCombo > 1 ? " Best combo ×" + r.bestCombo + "." : "") +
      (score === 0 ? " Tip: read every statement before the clock gets loud." : " Your best: <strong>" + S.endless.best + "</strong>") + "</p>" +
      (isBest && score > 0 ? '<span class="new-best">New best</span>' : "");
    $("res-rewards").innerHTML = r.endBonus ? '<span class="rw coin">' + COIN_SVG + "Run bonus +" + r.endBonus + "</span>" : "";
    setShare(rushShareText(score));
    rankCard("");
    $("res-stats").innerHTML = statsRow([["Cases", r.n], ["Caught", score], ["Best", S.endless.best], ["Runs", S.endless.runs]]);
    resProgress();
    var dailyDone = S.daily && S.daily.day === TODAY && S.daily.done;
    $("res-next").innerHTML = dailyDone ? 'New daily cases in <strong data-countdown="1">' + WL.fmtCountdown(WL.msToNextDay()) + "</strong>" : "Today's Daily Case is still waiting for you.";
    var acts = $("res-actions"); acts.innerHTML = "";
    acts.appendChild(actionBtn("Play Rush again", "primary", startRush));
    acts.appendChild(actionBtn(careerLabel(), "ghost", function () { Book.start(); }));
    if (!dailyDone) acts.appendChild(actionBtn("Play today's Daily Case", "ghost", function () { startDaily(TODAY); }));
    $("review").hidden = true;
    if (window.WLAds && Plat.allowExternal()) window.WLAds.display($("ad-results"));
    run = null;
    renderCoins(false);
    focusTitle();
  }

  /* ---------- sharing ---------- */
  var shareTextNow = "";
  // Below this many posted results a rank only says how few people play ("#1 of 1"), so it stays hidden.
  var RANK_MIN = 25;
  function pctText(st) {
    if (st.total <= 1) return "you're the first to finish";
    return "better than " + Math.round(100 * (st.total - st.rank) / (st.total - 1)) + "% of players";
  }
  // Every shared Daily result is also a challenge: the link carries your score.
  function challengeCode(day, p) { return day + "." + p.results.join("") + "." + Math.round(p.elapsed / 1000) + "." + (myName() || "A friend"); }
  function dailyShareText(day, p, replay, rank) {
    var grid = p.results.map(function (r) { return GRID[r]; }).join("");
    var lines = [(CFG.siteName || "LiarHunt") + " #" + day + (p.d5 ? " · " + p.title : "") + (replay ? " (replay)" : ""), grid + " " + scoreOf(p.results) + "/5  ⏱️ " + WL.fmtTime(p.elapsed)];
    var st = dailyStreak(), stand = !replay && S.lb.stand && S.lb.stand.day === day ? S.lb.stand : null;
    if (!replay && st > 1) lines.push("🔥 " + st + "-day streak");
    if (stand && stand.total >= RANK_MIN) lines.push("🕵️ Top " + Math.max(1, Math.ceil((100 * stand.rank) / stand.total)) + "% today");
    else if (!replay && rank) lines.push("🏆 #" + rank + " on today's leaderboard");
    lines.push("Can you beat me? ⚔️");
    var u = Plat.shareLink({ day: day, c: challengeCode(day, p) }); if (u) lines.push(u);
    return lines.join("\n");
  }
  function rushShareText(score) {
    var lines = [(CFG.siteName || "LiarHunt") + " Rush 🕵️", "I caught " + score + " liar" + (score === 1 ? "" : "s") + " in a row. Can you beat that?"];
    var u = Plat.shareLink({ mode: "rush" }); if (u) lines.push(u);
    return lines.join("\n");
  }
  // t: the text, or a function that builds it (so it can be rebuilt once the player picks a name)
  var shareFn = function () { return ""; };
  function setShare(t) {
    shareFn = typeof t === "function" ? t : function () { return t; };
    var text = shareTextNow = shareFn();
    if ($("share-wa")) {
      $("share-wa").href = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
      $("share-x").href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
    }
    $("share-text").hidden = true;
    $("btn-share").textContent = Plat.allowExternal() ? "Share your result" : "Copy your result";
  }
  // The first share asks for a name, so the challenge your friends get isn't signed "A friend".
  function share() {
    WL.track("share", { method: "button" });
    if (!myName() && lbOn() && !S.pwa.askedShareName) {
      S.pwa.askedShareName = true; persist();
      var named = false;
      askName(function () { named = true; afterJoin(); setShare(shareFn); shareOut(shareTextNow); }, "share");
      $("dlg-name").addEventListener("close", function () { if (!named) shareOut(shareTextNow); }, { once: true });
      return;
    }
    shareOut(shareTextNow);
  }
  function postAnon(day, p) {
    if (S.lb.posted[day]) return Promise.resolve();
    return LB.submitDaily({ name: "", badge: "", day: day, score: scoreOf(p.results), timeMs: p.elapsed, grid: p.results.join("") }).then(function (ok) {
      if (ok) { S.lb.posted[day] = 1; S.lb.anon = S.lb.anon || {}; S.lb.anon[day] = 1; persist(); }
    }).catch(function () { /* the rules may not allow unnamed results yet */ });
  }
  function shareOut(text, copiedMsg) {
    if (web() && coarse && navigator.share) {
      navigator.share({ text: text }).catch(function (e) { if (!e || e.name !== "AbortError") copyText(text, copiedMsg); });
      return;
    }
    copyText(text, copiedMsg);
  }
  function copy() { copyText(shareTextNow); }
  function copyText(text, msg) {
    var ok = function () { toast(msg || "Copied. Paste it to a friend."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(text, msg); });
    else fallbackCopy(text, msg);
  }
  function fallbackCopy(text, msg) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    if (ok) { toast(msg || "Copied. Paste it to a friend."); return; }
    var box = $("share-text");
    box.value = text; box.hidden = false; box.focus(); box.select();
    toast("Select the text in the box and copy it.");
  }

  /* ---------- Book map (Career) ---------- */
  function openMap() {
    show("map");
    setHud("Book map", "Career · " + Book.title);
    $("map-sub").textContent = Book.total + " missions, 5 chapters, one conspiracy. " + Book.starsTotal() + " of " + Book.total * 3 +
      " stars so far. Replay any solved mission for the story: you keep your first-run stars.";
    Book.renderMap($("chapters"));
  }
  $("chapters").addEventListener("click", function (e) {
    var b = e.target.closest("[data-m]");
    if (!b || b.disabled) return;
    Snd.play("click");
    Book.start(+b.dataset.m);
  });

  /* ---------- shop ---------- */
  function openShop(focusThemes) {
    show("shop");
    setHud("Shop", "Spend your coins");
    renderShop();
    if (focusThemes) setTimeout(function () { $("shop-themes").scrollIntoView({ block: "start" }); }, 30);
  }
  function renderShop() {
    var fc = $("free-coins");
    fc.hidden = !canRewarded();
    if (!fc.hidden) {
      var left = P.coolLeft("coinsAd", 240);
      fc.innerHTML = '<span><b>Free coins</b><br><span class="muted small">Watch a short ad for 40 coins.</span></span>' +
        '<button class="btn small primary" type="button" id="btn-free-coins"' + (left ? " disabled" : "") + ">" + AD_SVG +
        (left ? "Ready in " + Math.ceil(left / 60000) + " min" : "Get 40 coins") + "</button>";
    }
    $("shop-items").innerHTML = Object.keys(P.ITEMS).map(function (id) {
      var it = P.ITEMS[id], can = S.coins >= it.price;
      return '<div class="shop-card"><h4>' + esc(it.name) + "</h4><p>" + esc(it.desc) + '</p><p class="own">You have ' + (S.inv[it.item] || 0) + "</p>" +
        '<button class="btn small ' + (can ? "primary" : "ghost") + '" type="button" data-buy="' + id + '">' + COIN_SVG + it.price + "</button></div>";
    }).join("");
    $("shop-themes").innerHTML = P.THEMES.map(function (t) {
      var owned = S.themes.owned.indexOf(t.id) >= 0, cur = S.themes.current === t.id;
      var label = cur ? "In use" : owned ? "Use" : COIN_SVG + t.price;
      return '<div class="shop-card' + (cur ? " current" : "") + '"><div class="swatch">' + t.swatch.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join("") +
        "</div><h4>" + esc(t.name) + "</h4>" + (t.id === "auto" ? "<p>Light or dark, like your device.</p>" : "") +
        '<button class="btn small ' + (cur ? "ghost" : owned || S.coins >= t.price ? "primary" : "ghost") + '" type="button" data-buy="' + t.id + '"' + (cur ? " disabled" : "") + ">" + label + "</button></div>";
    }).join("");
  }
  $("scr-shop").addEventListener("click", function (e) {
    var b = e.target.closest("[data-buy]");
    if (b) {
      // anything over 100 coins asks first, so a stray tap can't spend a week of savings
      var id = b.dataset.buy, it = P.ITEMS[id] || P.THEMES.filter(function (t) { return t.id === id; })[0];
      var owned = S.themes.owned.indexOf(id) >= 0;
      if (it && it.price > 100 && !owned && S.coins >= it.price && b.dataset.sure !== "1") {
        b.dataset.sure = "1"; b.innerHTML = "Sure? " + COIN_SVG + it.price;
        setTimeout(function () { if (b.isConnected) { b.dataset.sure = ""; b.innerHTML = COIN_SVG + it.price; } }, 3000);
        Snd.play("tap");
        return;
      }
      var r = P.buy(id);
      if (r.ok) {
        Snd.play(r.theme && !r.bought ? "click" : "buy");
        if (r.theme) applyTheme();
        if (r.bought) FX.confetti({ count: 70, y: b.getBoundingClientRect().top });
        toast(esc(r.msg), r.bought ? "gold" : "");
        persist(); renderCoins(true); renderShop();
      } else { Snd.play("wrong"); toast(esc(r.msg)); }
      return;
    }
    if (e.target.closest("#btn-free-coins")) {
      if (P.coolLeft("coinsAd", 240) > 0) return;
      P.coolStart("coinsAd"); persist(); renderShop();
      Plat.rewarded("shop_coins").then(function (ok) {
        if (ok) { P.addCoins(40); persist(); Snd.play("coin"); toast("+40 coins", "gold"); renderCoins(true); }
        else { S.cool.coinsAd = 0; persist(); adFailed(); }
        renderShop();
      });
    }
  });

  /* ---------- achievements ---------- */
  function openAch() {
    show("ach");
    setHud("Achievements", "Rewards for big moments");
    var list = P.achList(), done = list.filter(function (a) { return a.done; }).length;
    $("ach-sum").textContent = done + " of " + list.length + " unlocked. Each one pays coins.";
    $("ach-list").innerHTML = list.map(function (a) {
      return '<li class="ach' + (a.done ? " done" : "") + '"><span class="ach-ico"><span class="st"></span></span><span><h4>' + esc(a.name) + "</h4><p>" + esc(a.desc) +
        " · " + a.coins + " coins" + (a.done ? "" : " · <b>" + a.value + " / " + a.goal + "</b>") + '</p><span class="m-bar"><span style="width:' + Math.round((a.value / a.goal) * 100) + '%"></span></span></span></li>';
    }).join("");
  }

  /* ---------- stats ---------- */
  /* ---------- profile: an ID card with the name, the stats below ----------
     Anyone can name themselves here (on CrazyGames the platform name is used). A name also puts you on the leaderboards. */
  function renderProfile() {
    var li = P.levelInfo(S.xp), name = playerName(), cg = !!(user && user.username);
    $("stats-h").textContent = name;
    $("pf-mug").innerHTML = WL.avatar(name, myFace());
    $("pf-badge").innerHTML = FX.badge(li.level, li.tier, 64);
    $("pf-title").textContent = "Level " + li.level + " · " + li.title;
    $("pf-xp").style.width = Math.round((li.into / li.need) * 100) + "%";
    $("pf-xpbar").setAttribute("aria-valuemax", li.need); $("pf-xpbar").setAttribute("aria-valuenow", li.into);
    $("pf-xpbar").setAttribute("aria-label", "Experience: " + li.into + " of " + li.need);
    $("pf-since").textContent = "On the case since " + WL.formatDate(WL.dateForDay(S.firstDay || TODAY), "short");
    var inp = $("pf-input");
    var nr = WL.nameRule(S.settings), locked = !cg && !nr.canChange;
    inp.value = cg ? user.username : S.settings.playerName || ""; inp.disabled = cg || locked;
    $("pf-save").hidden = cg || locked; $("pf-error").hidden = true;
    renderAccount();
    $("pf-note").textContent = cg ? "This is your CrazyGames name. Change it in your CrazyGames account."
      : locked ? "Name locked. You've used your one name change."
      : (S.settings.playerName ? "You can change your name once. " : "") +
        (lbOn() ? "Other players see it on leaderboards and on challenges you share." : "It signs the challenges you share.");
    renderStats();
  }
  /* ---------- create your detective: a face (and on the web a name), once, after the training case ---------- */
  var setupCb = null, setupFace = "";
  function needsSetup() { return !S.settings.setupDone && (!myFace() || (web() && !S.settings.playerName)); }
  // facesOnly: just change the face (from the profile).
  function openSetup(cb, facesOnly) {
    setupCb = cb || null;
    setupFace = myFace(); // "" = the face drawn from the name, so nobody's face changes unless they pick one
    var askName = !facesOnly && web() && !S.settings.playerName;
    $("setup-h").textContent = facesOnly ? "Pick your face" : "Create your detective";
    $("setup-why").textContent = facesOnly ? "Other detectives see it next to your name." : askName ? "Pick a face and a name. Other detectives see them on the leaderboards." : "Pick the face other detectives will see.";
    $("setup-name-box").hidden = !askName;
    $("setup-name").value = "";
    $("setup-error").hidden = true;
    $("setup-go").textContent = facesOnly ? "Save" : "Start";
    renderFacePicks();
    openDialog("dlg-setup");
  }
  function renderFacePicks() {
    var nm = $("setup-name").value.trim() || myName() || "Detective";
    $("setup-faces").innerHTML = '<button class="face-pick keep" type="button" role="radio" data-face="" aria-checked="' + (setupFace === "") + '" aria-label="Keep the face drawn from your name">' +
      WL.avatar(nm) + "</button>" + WL.FACES.map(function (f, i) {
      var code = "f" + String(i).padStart(2, "0");
      return '<button class="face-pick" type="button" role="radio" data-face="' + code + '" aria-checked="' + (code === setupFace) + '" aria-label="Face ' + (i + 1) + '">' + WL.avatar(nm, code) + "</button>";
    }).join("");
  }
  $("setup-faces").addEventListener("click", function (e) {
    var b = e.target.closest("[data-face]");
    if (!b) return;
    Snd.play("tap"); setupFace = b.dataset.face;
    [].forEach.call($("setup-faces").children, function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
  });
  $("setup-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!$("setup-name-box").hidden && !saveName($("setup-name").value, $("setup-error"))) { FX.shake($("setup-name")); return; }
    S.settings.avatar = setupFace; S.settings.setupDone = true; persist();
    Snd.play("stamp");
    WL.track("setup_done", { face: setupFace });
    closeDialog("dlg-setup");
    if (screen === "hq") renderHQ();
    if ($("dlg-stats").open) renderProfile();
    if (lbOn() && S.settings.playerName) afterJoin(); // a name is a leaderboard entry: post today's score under it
    var cb = setupCb; setupCb = null;
    if (cb) cb();
  });
  // On the web a name is needed to carry on; Esc can't skip it. Otherwise closing keeps the current face, shows once, and carries on.
  $("dlg-setup").addEventListener("cancel", function (e) {
    if (!$("setup-name-box").hidden) { e.preventDefault(); return; }
    S.settings.setupDone = true; persist();
    var cb = setupCb; setupCb = null;
    if (cb) setTimeout(cb, 0);
  });
  $("pf-mug").addEventListener("click", function () { Snd.play("click"); openSetup(null, true); });

  function openProfile() { renderProfile(); openDialog("dlg-stats"); }
  // Saves a detective name typed into a form. Shows why (and returns false) when it isn't allowed.
  function saveName(raw, errEl) {
    var r = WL.cleanName(raw);
    if (!r.ok) { errEl.textContent = r.msg; errEl.hidden = false; return false; }
    errEl.hidden = true;
    if (r.name === S.settings.playerName) return true;
    var first = !S.settings.playerName;
    if (!first && !WL.nameRule(S.settings).canChange) { errEl.textContent = "You've used your one name change."; errEl.hidden = false; return false; }
    if (!first) S.settings.nameChanges = (S.settings.nameChanges || 0) + 1;
    S.settings.playerName = r.name; persist();
    toast(first ? "Welcome, " + esc(r.name) + "!" : "Name saved. It shows on your next score.");
    renderHQ();
    return true;
  }
  $("pf-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var first = !S.settings.playerName;
    if (!saveName($("pf-input").value, $("pf-error"))) { FX.shake($("pf-input")); return; }
    Snd.play("stamp");
    WL.track(first ? "name_set" : "name_change", {});
    if (first && lbOn()) afterJoin(); // a name is a leaderboard entry: post today's score under it
    renderProfile();
  });
  $("pf-input").addEventListener("input", function () {
    var v = WL.cleanName(this.value), n = v.ok ? v.name : playerName();
    $("pf-mug").innerHTML = WL.avatar(n, myFace()); $("stats-h").textContent = n;
  });
  function renderStats() {
    var li = P.levelInfo(S.xp), t = S.tot, st = S.stats;
    $("stats-row").innerHTML = statsRow([["Level", li.level], ["Cases solved", t.solved], ["3-star cases", t.stars3], ["Best combo", t.bestCombo]]);
    var max = Math.max.apply(null, [1].concat(st.dist));
    var todayScore = S.history[TODAY] && !S.history[TODAY].replay ? S.history[TODAY].score : -1, rows = "";
    for (var s = 5; s >= 0; s--) {
      var n = st.dist[s] || 0;
      rows += '<div class="dist-row"><b>' + s + '/5</b><div><div class="dist-bar' + (s === todayScore ? " today" : "") + '" style="width:' + Math.max(8, (n / max) * 100) + '%">' + n + "</div></div></div>";
    }
    $("stats-dist").innerHTML = rows;
    $("stats-row2").innerHTML = statsRow([["Daily played", st.played], ["Daily streak", dailyStreak()], ["Perfect days", st.perfect], ["Rush best", S.endless.best]]);
    var counts = {}, order = [];
    S.lb.badges.forEach(function (b) { if (!counts[b.icon]) { counts[b.icon] = 0; order.push(b); } counts[b.icon]++; });
    var showBadges = (LB.enabled() && Plat.allowExternal()) || S.lb.badges.length > 0;
    $("stats-badges-h").hidden = !showBadges; $("stats-badges").hidden = !showBadges;
    if (showBadges) {
      $("stats-badges").innerHTML = S.lb.badges.length
        ? order.map(function (b) { return '<span class="badge-chip">' + b.icon + " " + esc(b.name) + " ×" + counts[b.icon] + "</span>"; }).join("")
        : "No badges yet. Finish in a day's top 10 to win one.";
    }
  }

  /* ---------- settings ---------- */
  function syncSettings() {
    var forced = Plat.muteForced();
    $("set-music").checked = !!S.settings.music; $("set-sound").checked = !!S.settings.sound;
    $("set-music").disabled = forced; $("set-sound").disabled = forced;
    $("mute-note").hidden = !forced;
    $("reset-confirm").hidden = true;
    if ($("cloud-box")) {
      $("cloud-box").hidden = !cloudOn();
      var a = cloudOn() ? LB.account.info() || {} : {};
      $("cloud-text").innerHTML = a.google ? "Saved to your Google account, <b>" + esc(a.email || a.name) + "</b>."
        : "Saved online for this browser. Sign in with Google to keep it on any device.";
    }
  }
  $("btn-settings").addEventListener("click", function () { Snd.play("click"); syncSettings(); openDialog("dlg-settings"); });
  $("set-music").addEventListener("change", function () { S.settings.music = this.checked; Snd.setMusic(this.checked); persist(); });
  $("set-sound").addEventListener("change", function () { S.settings.sound = this.checked; Snd.setSound(this.checked); if (this.checked) Snd.play("click"); persist(); });
  $("btn-themes").addEventListener("click", function () { closeDialog("dlg-settings"); if (screen === "case") return toast("Finish this case first, then open the Shop."); openShop(true); });
  $("btn-help").addEventListener("click", function () { closeDialog("dlg-settings"); openDialog("dlg-help"); });
  $("btn-reset").addEventListener("click", function () { $("reset-confirm").hidden = false; });
  $("btn-reset-no").addEventListener("click", function () { $("reset-confirm").hidden = true; });
  $("btn-reset-yes").addEventListener("click", function () {
    cloud.gone = true; clearTimeout(cloud.timer);
    var done = function () {
      try { window.localStorage.removeItem("whoslying:v1"); } catch (e) { /* ignore */ }
      if (!cloud.on) Plat.save({ noAutoRestore: true }, true);
      location.reload();
    };
    if (!cloud.on) { done(); return; }
    LB.account.remove().then(done, function () { cloud.gone = false; toast("Couldn't reach the server, so nothing was deleted. Try again."); });
  });

  /* ---------- tutorial coach ---------- */
  var coachTarget = null;
  function startCoach() {
    run.coachStep = 1;
    run.coachHold = true;
    coach(document.querySelector(".pane-facts .clues"), "These facts are true. The police checked them.", "Got it");
  }
  function coach(el, text, btn) {
    coachTarget = el;
    $("coach-text").textContent = text;
    $("coach-next").textContent = btn;
    $("coach-next").hidden = !btn;
    $("coach").hidden = false;
    $("coach").classList.toggle("passthrough", !btn);
    placeCoach();
  }
  function placeCoach() {
    if (!coachTarget || $("coach").hidden) return;
    var r = coachTarget.getBoundingClientRect(), pad = 6, ring = $("coach-ring"), b = $("coach-bubble");
    ring.style.left = (r.left - pad) + "px"; ring.style.top = (r.top - pad) + "px";
    ring.style.width = (r.width + pad * 2) + "px"; ring.style.height = (r.height + pad * 2) + "px";
    var bw = b.offsetWidth, bh = b.offsetHeight, vw = innerWidth, vh = innerHeight;
    var top = r.bottom + 14 + bh < vh ? r.bottom + 14 : Math.max(10, r.top - bh - 14);
    if (top + bh > vh - 10) top = Math.max(10, vh - bh - 10);
    var left = Math.min(Math.max(10, r.left + r.width / 2 - bw / 2), vw - bw - 10);
    b.style.top = top + "px"; b.style.left = left + "px";
  }
  function hideCoach() {
    $("coach").hidden = true; coachTarget = null;
    if (run) { run.coachHold = false; run.coachStep = 0; }
  }
  $("coach-next").addEventListener("click", function () {
    Snd.play("click");
    if (run && run.coachStep === 1) {
      run.coachStep = 2;
      coach($("suspects"), "One of these stories can't be true. Tap the liar, then press Accuse.", "");
      run.coachHold = false;
    } else hideCoach();
  });
  $("coach-skip").addEventListener("click", function () { S.settings.tutorialDone = true; persist(); hideCoach(); });
  window.addEventListener("resize", placeCoach);
  document.addEventListener("scroll", placeCoach, true);

  /* ---------- web leaderboard (Firebase) ---------- */
  var nameCb = null, boardTab = "today", boardTok = 0;
  function bestBadge() {
    var order = (LB.TIERS || []).map(function (t) { return t.icon; }), best = "", bi = 99;
    S.lb.badges.forEach(function (b) { var i = order.indexOf(b.icon); if (i >= 0 && i < bi) { bi = i; best = b.icon; } });
    return best;
  }
  function rankOf(rows) {
    var me = LB.myId && LB.myId();
    for (var i = 0; i < rows.length; i++) if (me && rows[i].uid === me) return i + 1;
    return 0;
  }
  function rankCard(html) { var el = $("res-rank"); el.innerHTML = html; el.hidden = !html; }
  function askName(cb, why) {
    nameCb = cb || null;
    var sign = why === "share", live = why === "room";
    $("name-input").value = S.settings.playerName || "";
    $("name-error").hidden = true;
    $("name-h").textContent = sign ? "Sign your challenge" : live ? "Your name in the room" : "Join the leaderboard";
    $("name-why").textContent = sign ? "Friends will see this name on your result and know who to beat. It's also your name on the leaderboard."
      : live ? "Everyone in the room will see it on the scoreboard. It's also your name on the leaderboard."
      : "Pick a detective name. Other players will see it next to your score.";
    $("name-save").textContent = sign ? "Sign and share" : live ? "Let's play" : S.settings.playerName ? "Save name" : "Join";
    openDialog("dlg-name");
    setTimeout(function () { try { $("name-input").focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function postDaily(day, p, onRank) {
    if (!LB.enabled() || !S.settings.playerName) return;
    rankCard('<p class="rank-sub">Checking the leaderboard...</p>');
    var entry = { name: S.settings.playerName, av: myFace(), badge: bestBadge(), day: day, score: scoreOf(p.results), timeMs: p.elapsed, grid: p.results.join("") };
    var anon = S.lb.anon && S.lb.anon[day];
    var step = !S.lb.posted[day] ? LB.submitDaily(entry) : anon ? LB.nameDaily(day, entry.name, entry.badge, entry.av) : Promise.resolve(true);
    step.then(function () {
      S.lb.posted[day] = 1;
      if (anon) delete S.lb.anon[day];
      persist();
      return Promise.all([LB.topDaily(day), LB.dailyStanding(day, entry.score, entry.timeMs).catch(function () { return null; })]);
    }).then(function (res) {
      var rank = rankOf(res[0]), stand = res[1];
      if (stand) S.lb.stand = { day: day, rank: stand.rank, total: stand.total };
      S.lb.ranks[day] = rank; persist();
      showRankCard(rank, stand);
      if (onRank) onRank(rank);
      postLadder(day, p).catch(function () { ladderFailed(day, p); });
    }).catch(function (e) {
      rankCard('<p class="rank-sub">' + esc(LB.friendlyError(e)) + '</p><button class="btn ghost wide" type="button" id="rank-retry">Try again</button>');
      $("rank-retry").addEventListener("click", function () { postDaily(day, p, onRank); });
    });
  }
  function showRankCard(rank, stand) {
    var tier = rank ? LB.tierFor(rank) : null;
    var head = stand && stand.total >= RANK_MIN ? "You're <strong>#" + stand.rank + "</strong> of " + stand.total + " detectives today: " + pctText(stand) + "."
      : rank ? "You're <strong>#" + rank + "</strong> on today's leaderboard so far." : "You're not in today's top 10 yet.";
    var sub = rank ? "Ranks lock in once the day ends everywhere. Hold your spot to win " + (tier ? tier.icon + " " + tier.name : "a badge") + " and a free Magnifier."
      : "Catch more liars, or catch them faster, to climb. The top 10 each day win a badge and a free Magnifier.";
    rankCard('<p class="rank-head">' + head + '</p><p class="rank-sub">' + sub + '</p><button class="btn ghost wide" type="button" id="rank-view">View leaderboard</button>');
    $("rank-view").addEventListener("click", function () { openBoard("today"); });
  }
  function joinCard(text, onJoined) {
    rankCard('<p class="rank-head">' + text + '</p><p class="rank-sub">The top 10 each day win a badge and a free Magnifier.</p><button class="btn primary wide" type="button" id="rank-join">Join the leaderboard</button>');
    $("rank-join").addEventListener("click", function () { askName(onJoined); });
  }
  function afterJoin() {
    var p = S.daily && S.daily.day === TODAY && S.daily.done ? S.daily : null;
    if (p && (!S.lb.posted[TODAY] || (S.lb.anon && S.lb.anon[TODAY]))) postDaily(TODAY, p, function (rank) { setShare(dailyShareText(TODAY, p, false, rank)); if ($("dlg-board") && $("dlg-board").open) loadBoard(); });
  }
  function openBoard(tab) {
    if (!LB.enabled() || !$("dlg-board")) return;
    boardTab = tab || "today"; // "league" only from the HQ season card
    $("board-h").textContent = boardTab === "league" ? "Season league" : "Leaderboard";
    $("board-demo").hidden = !(LB.isDemo && LB.isDemo());
    openDialog("dlg-board");
    loadBoard();
  }
  function loadBoard() {
    $("board-head").hidden = true;
    var tok = ++boardTok;
    if (boardTab === "league") { loadLadder(tok); return; }
    var list = $("board-list");
    $("board-note").textContent = "Daily #" + TODAY + ". Ranks lock in once the day ends everywhere. The top 10 win a badge.";
    list.innerHTML = '<li class="board-empty">Loading...</li>';
    LB.topDaily(TODAY).then(function (rows) {
      if (tok !== boardTok) return;
      list.innerHTML = boardRows(rows, function (r) {
        return '<span class="b-score">' + r.score + '/5</span><span class="b-time">' + WL.fmtTime(r.timeMs) + "</span>";
      });
      renderBoardMe(rows);
    }).catch(function (e) { if (tok === boardTok) list.innerHTML = '<li class="board-empty">' + esc(LB.friendlyError(e)) + "</li>"; });
  }
  // The top 3 stand on a podium (CSS puts 2nd left, 1st in the middle); 4th to 10th follow as rows.
  function boardRows(rows, score) {
    if (!rows.length) return '<li class="board-empty">Nobody on the board yet. Be the first!</li>';
    var me = LB.myId();
    function who(r) { return (r.name ? esc(r.name) : '<span class="muted">Unnamed detective</span>') + (r.uid === me ? " <em>(you)</em>" : ""); }
    var pod = rows.slice(0, 3).map(function (r, i) {
      return '<div class="pod p' + (i + 1) + (r.uid === me ? " me" : "") + '"><span class="pod-face face">' + WL.avatar(r.name || "Detective", r.av) +
        '<b class="pod-medal" aria-hidden="true">' + LB.TIERS[i].icon + '</b></span><span class="pod-name">' + who(r) + '</span><span class="pod-score">' + score(r) +
        '</span><span class="pod-block"><span class="sr">Number </span>' + (i + 1) + "</span></div>";
    }).join("");
    return '<li class="podium">' + pod + "</li>" + rows.slice(3).map(function (r, i) {
      return '<li class="board-row' + (r.uid === me ? " me" : "") + '" style="--i:' + i + '"><span class="b-rank">' + (i + 4) + '</span><span class="b-name">' +
        (r.badge ? '<span class="b-badge" aria-hidden="true">' + esc(r.badge) + "</span>" : "") + who(r) + "</span>" + score(r) + "</li>";
    }).join("");
  }
  function renderBoardMe(rows) {
    var box = $("board-me");
    if (!S.settings.playerName) {
      var doneToday = S.daily && S.daily.day === TODAY && S.daily.done;
      box.innerHTML = "<p>" + (doneToday ? "Join to put your name on today's board." : "Want your name up here? Finish today's Daily Case, then join.") +
        '</p><button class="btn primary wide" type="button" id="board-join">Join the leaderboard</button>';
      $("board-join").addEventListener("click", function () { askName(afterJoin); });
      return;
    }
    var rank = rows ? rankOf(rows) : 0;
    if (rank && rank <= 3) setTimeout(function () { FX.confetti({ count: 70 }); }, 800); // you're on the podium
    box.innerHTML = "<p>Playing as <strong>" + esc(S.settings.playerName) + "</strong>" + (rank ? ", ranked <strong>#" + rank + "</strong>" : "") + ".</p>";
  }
  function checkRewards() {
    if (!LB.enabled() || !S.settings.playerName) return;
    var days = Object.keys(S.lb.posted).map(Number).filter(function (d) { return !(d in S.lb.claimed) && d < TODAY && d >= TODAY - 10; });
    if (!days.length) return;
    LB.rewardsFor(days).then(function (res) {
      var won = [];
      res.forEach(function (r) {
        S.lb.claimed[r.day] = r.rank;
        var t = LB.tierFor(r.rank);
        if (t) { S.lb.badges.push({ day: r.day, rank: r.rank, icon: t.icon, name: t.name }); S.inv.magnifier = (S.inv.magnifier || 0) + 1; won.push({ day: r.day, rank: r.rank, tier: t }); }
      });
      persist();
      if (won.length) showReward(won);
    }).catch(function () { /* try again next visit */ });
  }
  function showReward(won) {
    won.sort(function (a, b) { return a.rank - b.rank; });
    var top = won[0];
    $("reward-badge").textContent = top.tier.icon;
    $("reward-h").textContent = top.rank === 1 ? "Number one detective!" : "You made the top 10!";
    $("reward-text").textContent = "You finished #" + top.rank + " on Daily #" + top.day + (won.length > 1 ? ", and made the top 10 on " + (won.length - 1) + " more day" + (won.length > 2 ? "s" : "") : "") + ".";
    $("reward-list").innerHTML = won.map(function (w) { return "<li>" + w.tier.icon + " " + esc(w.tier.name) + " badge for Daily #" + w.day + "</li>"; }).join("") +
      "<li>" + won.length + " free Magnifier" + (won.length > 1 ? "s" : "") + "</li><li>Your best badge now shows next to your name</li>";
    WL.track("reward_won", { rank: top.rank });
    Snd.play("fanfare");
    openDialog("dlg-reward");
  }
  if ($("dlg-board")) {
    $("name-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var first = !S.settings.playerName;
      if (!saveName($("name-input").value, $("name-error"))) return;
      closeDialog("dlg-name");
      WL.track(first ? "leaderboard_join" : "leaderboard_rename", {});
      var cb = nameCb; nameCb = null;
      if (cb) cb();
    });
  }

  /* ---------- friend challenges (head to head) ---------- */
  // Link format: day.grid.seconds.name  e.g. 6.ggyrg.92.Raj
  function parseChallenge(raw) {
    if (!raw) return null;
    var p = String(raw).split(".");
    if (p.length < 4) return null;
    var day = parseInt(p[0], 10), grid = p[1], time = parseInt(p[2], 10);
    var name = p.slice(3).join(".").replace(/\s+/g, " ").trim().slice(0, 16);
    if (!(day >= 1 && day <= TODAY + 1) || !/^[gyr-]{5}$/.test(grid) || !(time >= 0 && time < 86400) || !name) return null;
    return { day: day, grid: grid, time: time, name: name };
  }
  function versus(mine, c) {
    var me = { s: scoreOf(mine.grid.split("")), t: mine.time }, them = { s: scoreOf(c.grid.split("")), t: c.time };
    var tie = me.s === them.s && me.t === them.t, win = !tie && (me.s > them.s || (me.s === them.s && me.t < them.t));
    var side = function (who, grid, o, won) {
      return '<span class="vs-side' + (won ? " win" : "") + '"><b>' + esc(who) + '</b><span class="res-grid small">' + cells(grid.split(""), 5) +
        "</span><span>" + o.s + "/5 · " + WL.fmtTime(o.t * 1000) + "</span></span>";
    };
    return {
      win: win, tie: tie,
      head: tie ? "It's a tie!" : win ? "You beat " + c.name + "!" : c.name + " wins this one.",
      html: '<div class="vs-row">' + side("You", mine.grid, me, win) + '<span class="vs-x">vs</span>' + side(c.name, c.grid, them, !win && !tie) + "</div>"
    };
  }
  function countWin(v, c) { if (v.win && !c.counted) { c.counted = true; P.count("challengesWon"); persist(); } }
  function renderVersus(day, p) {
    var c = S.challenge, box = $("res-versus");
    if (!c || c.day !== day) { box.hidden = true; return; }
    var v = versus({ grid: p.results.join(""), time: Math.round(p.elapsed / 1000) }, c);
    box.innerHTML = '<p class="vs-head">' + esc(v.head) + "</p>" + v.html +
      '<button class="btn primary wide" type="button" id="vs-rematch">' + (v.win ? "Rub it in: send your result" : "Send a rematch") + "</button>";
    box.classList.toggle("won", v.win);
    box.hidden = false;
    $("vs-rematch").addEventListener("click", function () { Snd.play("click"); share(); });
    countWin(v, c);
    if (v.win) Snd.play("achieve", { delay: 0.8 });
  }
  function handleChallenge(c) {
    var mineToday = S.daily && S.daily.day === TODAY && S.daily.done ? S.daily : null;
    var h = c.day === TODAY ? (mineToday ? { grid: mineToday.results.join(""), time: Math.round(mineToday.elapsed / 1000) } : null)
      : S.history[c.day] ? { grid: S.history[c.day].grid, time: Math.round(S.history[c.day].time / 1000) } : null;
    if (h && h.grid === c.grid && h.time === c.time) return; // your own link
    WL.track("challenge_open", { day: c.day, played: !!h });
    if (c.day > TODAY) {
      notice({ icon: "⚔️", title: c.name + " challenged you!", text: "Their Daily #" + c.day + " starts tomorrow where you live. Come back then to take them on.", yes: "OK" });
      return;
    }
    S.challenge = c; persist();
    if (h) {
      var v = versus(h, c);
      countWin(v, c);
      notice({ icon: v.win ? "🏆" : "⚔️", eyebrow: "Daily #" + c.day + " challenge", title: v.head, html: v.html, yes: "Send a rematch", no: "Close",
        onYes: function () { shareOut(dailyShareText(c.day, { results: h.grid.split(""), elapsed: h.time * 1000 }, false, 0)); } });
      return;
    }
    notice({
      icon: "⚔️", eyebrow: "Daily #" + c.day + " challenge", title: c.name + " challenged you!",
      text: "They caught <b>" + scoreOf(c.grid.split("")) + " of 5</b> liars in <b>" + WL.fmtTime(c.time * 1000) + "</b>. Same cases, one try each. Can you beat that?",
      html: '<div class="res-grid small">' + cells(c.grid.split(""), 5) + "</div>",
      yes: "Accept the challenge", no: "Later",
      onYes: function () { startDaily(c.day, c.day === TODAY ? undefined : "practice"); }
    });
  }

  /* ---------- what's next after a Daily ---------- */
  function nextCard(icon, title, text, btn) {
    return '<div class="next-card"><span class="nc-ico" aria-hidden="true">' + icon + '</span><span class="nc-txt"><b>' + title + "</b><span>" + text + "</span></span>" +
      (btn ? '<button class="btn small primary" type="button" data-next="' + btn[0] + '">' + btn[1] + "</button>" : "") + "</div>";
  }
  function renderExtras(day, replay, extra) {
    var h = [];
    if (extra.streak) h.push(nextCard("🔥", dailyStreak() + " days in a row!", "You earned a Streak Shield and 100 coins.", null));
    if (!replay && day === TODAY) {
      if (unlocked("rush")) h.push(nextCard("⏱️", "Fancy a quick Rush?", "Catch as many liars as you can before the clock runs out.", ["rush", "Play"]));
      if (web()) h.push(nextCard("🖋️", "Fool your friends", "Write your own case, hide one lie and send it to them.", ["write", "Write"]));
    }
    $("res-extra").innerHTML = h.join("");
  }
  $("res-extra").addEventListener("click", function (e) {
    var b = e.target.closest("[data-next]");
    if (!b) return;
    Snd.play("click");
    var k = b.dataset.next;
    if (k === "rush") startRush(); else if (k === "reminder") openReminder(); else if (k === "write") openWrite();
  });

  /* ---------- season ladder (web): league points from each Daily (js/engine.js LADDER, LB.ladder) ---------- */
  function setLadder(doc) {
    var L = S.ladder;
    ["season", "lp", "tier", "days", "rate", "failRate"].forEach(function (k) { L[k] = doc[k]; });
    persist();
    if (screen === "hq") renderSeason();
  }
  // Reads this season's entry and rank (at most every 5 minutes unless forced).
  function refreshLadder(force) {
    if (!lbOn() || !S.settings.playerName || !SEASON) return Promise.resolve();
    if (!force && Date.now() - (S.ladder.at || 0) < 300000) return Promise.resolve();
    return LB.ladder.mine(SEASON).then(function (doc) {
      if (!doc) return;
      setLadder(doc);
      return LB.ladder.standing(SEASON, doc.lp).then(function (st) {
        S.ladder.rank = st.rank; S.ladder.total = st.total; S.ladder.at = Date.now(); persist();
        if (screen === "hq") renderSeason();
      });
    }).catch(function () { /* keep the old numbers */ });
  }
  // After today's Daily is posted: add the day to the ladder. Rejects when it couldn't be saved.
  function postLadder(day, p) {
    if (!lbOn() || !S.settings.playerName || day !== TODAY || !WL.seasonOf(day)) return Promise.resolve(null);
    var before = S.ladder.season === WL.seasonOf(day) ? S.ladder.tier : null;
    return LB.ladder.post({ name: S.settings.playerName, av: myFace(), badge: bestBadge(), day: day, grid: p.results.join("") }).then(function (doc) {
      var e = $("ladder-err"); if (e) e.remove();
      if (!doc) return refreshLadder(true);
      setLadder(doc);
      var N = WL.LADDER.names;
      if (before != null && doc.tier > before) { P.count("promotions"); Snd.play("levelup"); toast("Promoted to " + N[doc.tier] + " League!", "gold", 3600); }
      else if (before != null && doc.tier < before) toast("Down to " + N[doc.tier] + " League. Win it back tomorrow.", "", 3600);
      return refreshLadder(true);
    });
  }
  function ladderFailed(day, p) {
    var box = $("res-rank"), old = $("ladder-err");
    if (old) old.remove();
    box.hidden = false;
    box.insertAdjacentHTML("beforeend", '<p class="rank-sub" id="ladder-err">Couldn\'t update your league. <button class="link-btn" type="button" id="ladder-retry">Try again</button></p>');
    $("ladder-retry").addEventListener("click", function () { Snd.play("click"); postLadder(day, p).catch(function () { ladderFailed(day, p); }); });
  }
  // The first visit in a new season: coins for the league you finished last season.
  function ladderSeasonEnd() {
    var prev = SEASON - 1;
    if (!lbOn() || prev < 1 || !S.settings.playerName || S.ladder.paid[prev]) return;
    LB.ladder.mine(prev).then(function (doc) {
      S.ladder.paid[prev] = true; persist();
      if (!doc) return;
      var X = WL.LADDER, coins = X.rewards[doc.tier], start = WL.tierOf(WL.seasonStartLp(doc.tier));
      P.grant({ coins: coins }); persist(); renderCoins(true);
      notice({ icon: X.icons[doc.tier], eyebrow: "Season " + prev + " is over", title: "You finished in the " + X.names[doc.tier] + " League", sound: "fanfare",
        text: "You played " + doc.days + " Dail" + (doc.days === 1 ? "y" : "ies") + " and solved " + Math.round(doc.rate / 10) + "% of the cases. You start Season " + SEASON + " in the " + X.names[start] + " League.",
        html: rewardList({ coins: coins }), yes: "On to Season " + SEASON });
    }).catch(function () { /* try again next visit */ });
  }
  function ladderRow(r, rank, me) {
    var every = r.failRate ? Math.round(1000 / r.failRate) : 0;
    var fr = !every ? "no fails" : every <= 1 ? "fails every day" : "fails 1 day in " + every;
    return '<li class="board-row lad' + (r.uid === me ? " me" : "") + '"><span class="b-rank">' + rank + '</span><span class="b-face">' + WL.avatar(r.name || "Detective", r.av) +
      '</span><span class="b-name">' + (r.badge ? '<span class="b-badge" aria-hidden="true">' + esc(r.badge) + "</span>" : "") + esc(r.name || "Detective") + (r.uid === me ? " <em>(you)</em>" : "") +
      '<span class="b-sub">' + Math.round((r.rate || 0) / 10) + "% solved · " + fr + '</span></span><span class="b-score">' + (r.lp || 0).toLocaleString("en") + "<small> LP</small></span></li>";
  }
  function loadLadder(tok) {
    var list = $("board-list"), c = WL.seasonClock(WL.now()), season = c.phase === "during" ? c.season : 0, X = WL.LADDER;
    var L = S.ladder, mine = !!season && L.season === season, t = mine ? L.tier : 0, me = LB.myId();
    $("board-head").hidden = false;
    $("board-head").innerHTML = '<span class="league-emblem t' + t + '" aria-hidden="true">' + X.icons[t] + "</span><span><b>Season " + Math.max(1, season) + " league</b>" +
      '<span class="muted small">' + (season ? "Ends in " + WL.fmtLong(c.left) : "Starts " + WL.formatDate(WL.dateForDay(WL.SEASON_ONE))) + "</span></span>";
    $("board-note").textContent = "Top " + LB.ladder.TOP + " this season. Solving earns league points (LP), wrong answers cost LP (not in Bronze). Silver 400 · Gold 1,000 · Platinum 1,800 · Diamond 2,800 LP.";
    if (!season) { list.innerHTML = '<li class="board-empty">Season 1 starts ' + WL.formatDate(WL.dateForDay(WL.SEASON_ONE)) + ". Every Daily you play then earns league points.</li>"; renderBoardMe(null); return; }
    if (!S.settings.playerName) { list.innerHTML = '<li class="board-empty">Join the leaderboard to enter the season league.</li>'; renderBoardMe(null); return; }
    list.innerHTML = '<li class="board-empty">Loading...</li>';
    LB.ladder.top(season).then(function (rows) {
      if (tok !== boardTok) return;
      var html = "", lastT = -1, inTop = false;
      rows.forEach(function (r, i) {
        if (r.tier !== lastT) { lastT = r.tier; html += '<li class="board-div t' + r.tier + '"><span aria-hidden="true">' + X.icons[r.tier] + "</span> " + X.names[r.tier] + " League</li>"; }
        if (r.uid === me) inTop = true;
        html += ladderRow(r, i + 1, me);
      });
      list.innerHTML = html || '<li class="board-empty">Nobody has league points yet this season. Finish today\'s Daily to take the lead!</li>';
      if (!inTop && mine) {
        LB.ladder.standing(season, L.lp).then(function (st) {
          if (tok !== boardTok) return;
          list.insertAdjacentHTML("beforeend", '<li class="board-gap" aria-hidden="true">⋯</li>' +
            ladderRow({ uid: me, name: S.settings.playerName, av: myFace(), badge: bestBadge(), lp: L.lp, rate: L.rate, failRate: L.failRate }, st.rank, me));
        }).catch(function () { /* the list is enough */ });
      }
      renderBoardMe(rows);
    }).catch(function (e) { if (tok === boardTok) list.innerHTML = '<li class="board-empty">' + esc(LB.friendlyError(e)) + "</li>"; });
  }

  /* ---------- friends (web): up to 8, added with a friend code (LB.friends) ---------- */
  function friendMe() { return { name: S.settings.playerName || "", av: myFace() }; }
  function friendLink(code) { return (WL.siteUrl() || location.origin) + "/?f=" + code; }
  function renderFriendsBadge() { var b = $("btn-friends"); if (b) b.dataset.badge = S.pals.asks ? String(S.pals.asks) : ""; }
  // At start-up: apply answers to your requests and count the requests waiting for you.
  function friendsBoot() {
    if (!lbOn() || !S.settings.playerName) return;
    LB.friends.inbox().then(function (list) {
      return LB.friends.settle(list, S.pals.asked, friendMe()).then(function (r) {
        r.added.forEach(function (id) {
          var who = list.filter(function (x) { return x.from === id; })[0];
          delete S.pals.asked[id];
          toast(esc((who && who.name) || "A detective") + " accepted your friend request.", "gold", 3600);
        });
        S.pals.asks = list.filter(function (x) { return x.kind === "ask"; }).length;
        persist(); renderFriendsBadge();
      });
    }).catch(function () { /* next visit */ });
  }
  function byLp(a, b) { return b.lp - a.lp || b.rate - a.rate; }
  function friendCard(f, acts) {
    var X = WL.LADDER, today = f.today ? f.today.score + "/5 today" : "Not played yet";
    return '<li class="fr-card"><span class="mug">' + WL.avatar(f.name, f.av) + '</span><span class="fr-who"><b>' + esc(f.name) + "</b>" +
      '<span class="b-sub">' + X.icons[f.tier] + " " + X.names[f.tier] + " · " + (f.lp || 0).toLocaleString("en") + " LP · " + Math.round((f.rate || 0) / 10) + "% solved</span>" +
      '<span class="b-sub">' + today + "</span></span>" +
      (acts ? '<span class="fr-acts"><button class="btn small ghost" type="button" data-challenge="' + esc(f.uid) + '">Challenge</button>' +
        '<button class="link-btn small" type="button" data-remove="' + esc(f.uid) + '" data-name="' + esc(f.name) + '">Remove</button></span>' : "") + "</li>";
  }
  function openFriends(prefill) {
    if (!lbOn()) return;
    if (!S.settings.playerName) { openSetup(function () { openFriends(prefill); }); return; }
    $("fr-add-input").value = prefill || "";
    $("fr-error").hidden = true;
    openDialog("dlg-friends");
    renderFriends();
    if (prefill) setTimeout(function () { try { $("fr-add").focus(); } catch (e) { /* ignore */ } }, 60);
  }
  var frTok = 0;
  function renderFriends() {
    var tok = ++frTok;
    $("fr-list").innerHTML = '<li class="board-empty">Loading...</li>';
    LB.friends.me(friendMe()).then(function (m) {
      if (tok !== frTok) return;
      S.pals.code = m.code; persist();
      $("fr-code").textContent = m.code;
      $("fr-count").textContent = m.list.length + " of " + LB.friends.MAX + " friends";
      return Promise.all([LB.friends.inbox(), m.list.length ? LB.friends.cards(m.list, SEASON || 1, TODAY) : []]).then(function (x) {
        if (tok !== frTok) return;
        var asks = x[0].filter(function (e) { return e.kind === "ask"; });
        S.pals.asks = asks.length; persist(); renderFriendsBadge();
        $("fr-inbox-h").hidden = !asks.length;
        $("fr-inbox").innerHTML = asks.map(function (e) {
          return '<li class="fr-card"><span class="mug">' + WL.avatar(e.name || "Detective", e.av) + '</span><span class="fr-who"><b>' + esc(e.name || "A detective") +
            '</b><span class="b-sub">wants to be friends</span></span><span class="fr-acts"><button class="btn small primary" type="button" data-accept="' + esc(e.from) + '">Accept</button>' +
            '<button class="link-btn small" type="button" data-decline="' + esc(e.from) + '">Decline</button></span></li>';
        }).join("");
        $("fr-list").innerHTML = x[1].length ? x[1].sort(byLp).map(function (f) { return friendCard(f, true); }).join("")
          : '<li class="board-empty">No friends yet. Send your code to someone you play with.</li>';
      });
    }).catch(function (e) { if (tok === frTok) $("fr-list").innerHTML = '<li class="board-empty">' + esc(LB.friendlyError(e)) + "</li>"; });
  }
  if ($("dlg-friends")) {
    $("fr-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var err = function (m) { $("fr-error").textContent = m; $("fr-error").hidden = false; };
      $("fr-error").hidden = true;
      var code = LB.friends.clean($("fr-add-input").value);
      if (!code) { err("A friend code has 6 letters and numbers, like ABC234."); return; }
      if (code === S.pals.code) { err("That's your own code."); return; }
      $("fr-add").disabled = true;
      LB.friends.lookup(code).then(function (who) {
        if (!who) { err("No detective has that code. Check it and try again."); return; }
        return LB.friends.ask(who.uid, friendMe()).then(function () {
          S.pals.asked[who.uid] = Date.now(); persist();
          $("fr-add-input").value = "";
          Snd.play("stamp");
          toast("Request sent to " + esc(who.name || "your friend") + ". You'll be friends once they accept.", "gold", 3800);
          WL.track("friend_ask", {});
        });
      }).catch(function (e) { err(LB.friendlyError(e)); }).then(function () { $("fr-add").disabled = false; });
    });
    $("fr-add-input").addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); });
    $("fr-copy").addEventListener("click", function () { Snd.play("click"); copyText(S.pals.code, "Friend code copied."); });
    $("fr-share").addEventListener("click", function () {
      Snd.play("click");
      shareOut("Add me on LiarHunt, the daily detective game. My friend code is " + S.pals.code + ": " + friendLink(S.pals.code), "Invite copied. Paste it to a friend.");
      WL.track("friend_share", {});
    });
    $("dlg-friends").addEventListener("click", function (e) {
      var b = e.target.closest("[data-accept], [data-decline], [data-remove], [data-challenge]");
      if (!b) return;
      Snd.play("click");
      var oops = function (er) { toast(esc(LB.friendlyError(er))); renderFriends(); };
      if (b.dataset.accept) { LB.friends.accept(b.dataset.accept, friendMe()).then(function () { WL.track("friend_accept", {}); renderFriends(); }, oops); return; }
      if (b.dataset.decline) { LB.friends.decline(b.dataset.decline).then(renderFriends, oops); return; }
      if (b.dataset.remove) {
        var id = b.dataset.remove, nm = b.dataset.name || "them";
        showNotice({ icon: "👋", title: "Remove " + nm + "?", text: "You'll both drop off each other's friends list.", yes: "Remove", no: "Keep",
          onYes: function () { LB.friends.remove(id, friendMe()).then(renderFriends, oops); } });
        return;
      }
      if (b.dataset.challenge) {
        var d = S.daily && S.daily.day === TODAY && S.daily.done ? S.daily : null;
        if (!d) { toast("Play today's Daily first, then send them your result to beat."); return; }
        shareOut(dailyShareText(TODAY, d, false, S.lb.ranks[TODAY] || 0));
      }
    });
  }

  /* ---------- write a case for friends ----------
     The whole case goes into the link (see WL.packWritten), so nothing is stored online.
     The draft is kept in the save, so a half-written case survives a reload. */
  var EXAMPLE = {
    t: "The Missing Birthday Cake", s: "Someone ate half of Grandma's birthday cake before the party started.",
    f: ["The cake was in the kitchen fridge from 2 PM.", "The kitchen door was locked from 3 PM to 6 PM.", "It rained all afternoon."],
    p: [["Sam", "Brother", "I played football in the garden all afternoon. Not a cloud in the sky!"],
      ["Priya", "Cousin", "I helped Grandma blow up balloons in the living room."],
      ["Leo", "Neighbor", "I knocked on the front door at four, but nobody answered."]],
    a: 0, x: [2], y: "It rained all afternoon, so Sam couldn't have played football under a cloudless sky."
  };
  var writeSave = 0;
  function blankDraft() { return { t: "", s: "", f: ["", "", ""], p: [["", "", ""], ["", "", ""], ["", "", ""]], a: -1, x: [], y: "", b: myName() }; }
  function openWrite(fresh) {
    if (fresh || !S.draft) S.draft = blankDraft();
    show("write");
    renderWrite();
    setWriteKind(wKind);
    WL.track("write_open", {});
  }
  function renderWrite() {
    var d = S.draft;
    $("w-t").value = d.t; $("w-s").value = d.s; $("w-y").value = d.y; $("w-b").value = d.b || "";
    $("w-facts").innerHTML = d.f.map(function (f, i) {
      return '<li><input class="field" data-f="' + i + '" maxlength="110" placeholder="A fact that is true" aria-label="Fact ' + (i + 1) + '" value="' + esc(f) + '">' +
        (d.f.length > 3 ? '<button type="button" class="icon-btn" data-del="' + i + '" aria-label="Remove fact ' + (i + 1) + '">×</button>' : "") + "</li>";
    }).join("");
    $("w-add").hidden = d.f.length >= 5;
    $("w-sus").innerHTML = d.p.map(function (p, i) {
      return '<fieldset class="w-person' + (d.a === i ? " liar" : "") + '"><legend>Suspect ' + (i + 1) + "</legend>" +
        '<div class="row2"><input class="field" data-p="' + i + '" data-k="0" maxlength="16" placeholder="Name" aria-label="Suspect ' + (i + 1) + ' name" value="' + esc(p[0]) + '">' +
        '<input class="field" data-p="' + i + '" data-k="1" maxlength="24" placeholder="Job (optional)" aria-label="Suspect ' + (i + 1) + ' job" value="' + esc(p[1]) + '"></div>' +
        '<textarea class="field" data-p="' + i + '" data-k="2" maxlength="160" rows="2" placeholder="Their story" aria-label="Suspect ' + (i + 1) + ' story">' + esc(p[2]) + "</textarea>" +
        '<label class="w-liar"><input type="radio" name="w-a" value="' + i + '"' + (d.a === i ? " checked" : "") + "> This one is lying</label></fieldset>";
    }).join("");
    $("w-proof").innerHTML = d.f.map(function (f, i) {
      return '<label class="w-check"><input type="checkbox" data-x="' + i + '"' + (d.x.indexOf(i) >= 0 ? " checked" : "") + "> Fact " + (i + 1) + ": <span>" + esc(f) + "</span></label>";
    }).join("");
    writeError("");
  }
  function readWrite() {
    var d = S.draft;
    d.t = $("w-t").value; d.s = $("w-s").value; d.y = $("w-y").value; d.b = $("w-b").value;
    [].forEach.call($("w-facts").querySelectorAll("[data-f]"), function (el) { d.f[+el.dataset.f] = el.value; });
    [].forEach.call($("w-sus").querySelectorAll("[data-p]"), function (el) { d.p[+el.dataset.p][+el.dataset.k] = el.value; });
    var a = $("w-sus").querySelector("input[name=w-a]:checked");
    d.a = a ? +a.value : -1;
    d.x = [].map.call($("w-proof").querySelectorAll("[data-x]:checked"), function (el) { return +el.dataset.x; });
    return d;
  }
  // The draft as it goes into the link: trimmed, and without the optional parts left empty (a shorter link).
  function writtenFrom(d) {
    var t = function (s) { return String(s || "").trim(); };
    var w = { t: t(d.t), s: t(d.s), f: d.f.map(t), p: d.p.map(function (p) { return [t(p[0]), t(p[1]), t(p[2])]; }), a: d.a, x: d.x.slice().sort(function (a, b) { return a - b; }) };
    if (t(d.y)) w.y = t(d.y);
    if (t(d.b)) w.b = t(d.b);
    return w;
  }
  function writeError(msg) {
    $("w-error").textContent = msg; $("w-error").hidden = !msg;
    if (msg) { Snd.play("wrong"); $("w-error").scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" }); }
  }
  function readyWritten() {
    var w = writtenFrom(readWrite()), err = WL.checkWritten(w);
    persist();
    if (err) { writeError(err); return null; }
    writeError("");
    return w;
  }
  $("write-form").addEventListener("input", function (e) {
    readWrite();
    var f = e.target.dataset.f;
    if (f != null) { var span = $("w-proof").querySelectorAll(".w-check span")[+f]; if (span) span.textContent = e.target.value; }
    clearTimeout(writeSave); writeSave = setTimeout(persist, 600);
  });
  $("write-form").addEventListener("change", function (e) {
    if (e.target.dataset.x != null && $("w-proof").querySelectorAll("[data-x]:checked").length > 2) {
      e.target.checked = false;
      toast("Tick one fact, or two that only catch the lie together.");
    }
    readWrite();
    if (e.target.name === "w-a") [].forEach.call($("w-sus").querySelectorAll(".w-person"), function (el, i) { el.classList.toggle("liar", i === S.draft.a); });
    persist();
  });
  $("write-form").addEventListener("click", function (e) {
    var del = e.target.closest("[data-del]");
    if (!del) return;
    Snd.play("click");
    var d = readWrite(), i = +del.dataset.del;
    d.f.splice(i, 1);
    d.x = d.x.filter(function (k) { return k !== i; }).map(function (k) { return k > i ? k - 1 : k; });
    renderWrite(); persist();
  });
  $("w-add").addEventListener("click", function () {
    Snd.play("click");
    var d = readWrite();
    if (d.f.length >= 5) return;
    d.f.push(""); renderWrite();
    var inputs = $("w-facts").querySelectorAll("[data-f]");
    inputs[inputs.length - 1].focus();
  });
  $("w-example").addEventListener("click", function () {
    Snd.play("click");
    S.draft = JSON.parse(JSON.stringify(EXAMPLE)); S.draft.b = myName();
    renderWrite(); persist();
    toast("Here's an example. Change anything you like.");
  });
  $("w-clear").addEventListener("click", function () { Snd.play("click"); S.draft = blankDraft(); renderWrite(); persist(); $("scr-write").scrollTop = 0; });
  $("w-try").addEventListener("click", function () {
    Snd.play("click");
    var w = readyWritten();
    if (w) startFriend(w, "preview:" + JSON.stringify(w), "preview");
  });
  $("write-form").addEventListener("submit", function (e) {
    e.preventDefault();
    Snd.play("pen");
    var w = readyWritten();
    if (!w) return;
    WL.packWritten(w).then(function (code) {
      var u = Plat.shareLink({ w: code });
      if (!u) { toast("Case links can't be shared from here."); return; }
      WL.track("write_send", { facts: w.f.length, proof: w.x.length, length: u.length });
      shareOut("🕵️ I wrote a LiarHunt case for you: “" + w.t + "”.\nOne of three suspects is lying. Can you catch them, and prove it?\n" + u,
        "Link copied. Paste it to a friend!");
    });
  });

  /* ---------- playing a friend's case: one try, no hints ----------
     how: "preview" (the writer trying their own case), "again" (a friend's case already played), or nothing */
  function startFriend(w, code, how) {
    run = { kind: "friend", c: WL.writtenCase(w, code), key: WL.hash(code), preview: how === "preview", again: how === "again", elapsed: 0 };
    WL.track(how === "preview" ? "write_try" : "friend_case_open", { again: how === "again" });
    show("case");
    loadCase();
  }
  function openFriend(w, code) {
    var c = WL.writtenCase(w, code), done = (S.friends || {})[WL.hash(code)];
    if (!done) { startFriend(w, code); return; }
    notice({ icon: done.ok ? "🕵️" : "🎭", eyebrow: "A case by " + c.by, title: c.title,
      text: done.ok ? "You already caught the liar in this one." : "This one fooled you last time.",
      yes: "Write one back", onYes: function () { openWrite(); }, no: "Play it again", onNo: function () { startFriend(w, code, "again"); } });
  }
  function verdictFriend(correct, how) {
    var c = run.c, F = S.friends = S.friends || {};
    if (!run.preview && !run.again) {
      F[run.key] = { ok: correct };
      var keys = Object.keys(F);
      if (keys.length > 40) delete F[keys[0]]; // only the last 40 friends' cases are remembered
      persist();
    }
    setVerdict({
      head: correct ? "You caught them!" : how === "proof" ? "Not proven." : "Fooled!", good: correct,
      sub: missLine(how) + answerLine(),
      next: run.preview ? "Back to your case" : run.again ? "Write one back" : "Tell " + c.by + " how you did",
      hq: run.preview || run.again ? "HQ" : "Write one back"
    });
    if (correct && !run.preview) FX.confetti({ count: 70 });
    WL.track("friend_case_done", { correct: correct, preview: run.preview, again: run.again });
  }
  // The answer back to the writer: no names, so it doesn't spoil the case for anyone else in the chat.
  function shareFriendResult() {
    var c = run.c, ok = ((S.friends || {})[run.key] || {}).ok;
    var lines = ["🕵️ " + (ok ? "I caught the liar in your case “" + c.title + "”, and I proved it!" : "Your case “" + c.title + "” fooled me. Well played!"),
      "Your turn: write me another one, or try today's cases."];
    var u = Plat.shareLink({}); if (u) lines.push(u);
    WL.track("friend_result_share", { ok: !!ok });
    shareOut(lines.join("\n"));
  }

  /* ---------- stories made with an AI chat: a Daily 5 story or a Career investigation ----------
     The player copies a blueprint (blueprints/*.txt) into any AI chat, adds their idea and pastes the reply back.
     js/storycheck.js checks it strictly: nothing can be played or sent before it passes. Like a written case, the whole
     story travels in the ?w= link as { k: "d5" | "career", s: story, b: author }, and the friend's game checks it again
     before playing. No rewards. The last 5 the player made are kept in S.made (as link codes). */
  var STORY = window.WLStory || null, LINK_MAX = 12000;
  var BLUEPRINT = { d5: "blueprints/daily5-story.txt", career: "blueprints/career-investigation.txt" }, bpText = {};
  var KIND_NAME = { d5: "Daily 5 story", career: "Career investigation" };
  var wKind = "quick", wFix = "";
  function setWriteKind(k) {
    if (!STORY && k !== "quick") k = "quick";
    wKind = k;
    [].forEach.call($("w-kinds").querySelectorAll("[data-wk]"), function (b) { b.setAttribute("aria-pressed", b.dataset.wk === k ? "true" : "false"); });
    $("write-form").hidden = k !== "quick";
    $("w-ai").hidden = k === "quick";
    setHud("Write a case", k === "quick" ? "Hide a lie, fool your friends" : KIND_NAME[k] + " · made with an AI chat");
    if (k === "quick") return;
    $("w-ai-intro").textContent = k === "d5"
      ? "Five connected cases. Each one you solve adds a finding to the notebook, and case 5 names everyone behind it. You bring the idea, an AI chat writes the story, and the game checks that every case has exactly one answer."
      : "A short investigation in 3 to 6 missions: searches, interviews, documents and an accusation at the end. You bring the idea, an AI chat writes it, and the game checks that it can be solved.";
    $("w-bp-dl").href = BLUEPRINT[k];
    $("w-bp-dl").setAttribute("download", BLUEPRINT[k].split("/").pop());
    $("w-result").innerHTML = "";
    loadBlueprint(k).catch(function () { /* Copy says so */ });
    renderRecent();
  }
  // fetched when the screen opens, so Copy can write it straight away (phones only allow that inside the tap)
  function loadBlueprint(k) {
    if (bpText[k]) return Promise.resolve(bpText[k]);
    return fetch(BLUEPRINT[k]).then(function (r) { if (!r.ok) throw new Error("blueprint " + r.status); return r.text(); }).then(function (t) { bpText[k] = t; return t; });
  }
  function cleanBy(b) { return String(b || "").replace(/\s+/g, " ").trim().slice(0, 16) || "A friend"; }
  function storyCast(k, s) {
    return k === "d5" ? s.people.map(function (p) { return p.name; })
      : Object.keys(s.people).filter(function (id) { return !s.people[id].org; }).map(function (id) { return s.people[id].name; });
  }
  function checkMine() {
    var raw = $("w-paste").value;
    if (!raw.trim()) { toast("Paste the AI's reply first, or upload its file."); return; }
    var r = STORY.parse(raw);
    if (!r.ok) { showProblems(r); return; }
    WL.packWritten({ k: r.kind, s: r.story, b: myName() || "" }).then(function (code) {
      if (code.length > LINK_MAX) {
        showProblems({ errors: ["Too long for a link (" + code.length + " characters, the most is " + LINK_MAX + "). Ask the AI to shorten it: fewer suspects, shorter texts."], warnings: [] });
        return;
      }
      var m = { k: r.kind, t: r.story.title, code: code, at: Date.now() };
      S.made = [m].concat((S.made || []).filter(function (x) { return x.code !== code; })).slice(0, 5);
      persist();
      showPassed(m, r);
      renderRecent();
      WL.track("story_pass", { kind: r.kind, length: code.length });
    });
  }
  // "case 3 statement s7: ..." reads better with a capital letter; at most 20, then "…and N more"
  function problemLines(errors) {
    var out = errors.slice(0, 20).map(function (e) { return e.charAt(0).toUpperCase() + e.slice(1); });
    if (errors.length > 20) out.push("…and " + (errors.length - 20) + " more");
    return out;
  }
  function showProblems(r) {
    var lines = problemLines(r.errors), n = r.errors.length;
    wFix = "Fix these problems in the LiarHunt story and send the whole JSON again, as one code block:\n" +
      lines.map(function (e, i) { return e.charAt(0) === "…" ? e : i + 1 + ". " + e; }).join("\n");
    $("w-result").innerHTML = '<div class="w-problems"><p class="field-error">' + (n === 1 ? "1 problem" : n + " problems") + " to fix before anyone can play it</p>" +
      "<ol>" + lines.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ol>" +
      (r.warnings && r.warnings.length ? '<p class="muted small">Style notes (they don\'t stop the story): ' + esc(problemLines(r.warnings).join(" · ")) + "</p>" : "") +
      '<button type="button" class="btn primary small" data-w="fix">Copy the problems for the AI</button>' +
      '<p class="muted small">Paste them into the same chat. When the AI sends the whole story again, paste it above and check it again.</p></div>';
    Snd.play("wrong");
    $("w-result").scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    WL.track("story_fail", { problems: n });
  }
  function storyCardHtml(m, i, s) {
    var count = m.k === "d5" ? "5 connected cases" : s.missions.length + " missions";
    return '<p class="w-tag">' + KIND_NAME[m.k] + "</p><b>" + esc(m.t) + '</b><span class="muted small">' + esc(count + " · " + storyCast(m.k, s).join(", ")) + "</span>" +
      '<span class="w-acts"><button type="button" class="btn ghost small" data-w="try" data-i="' + i + '">Try it</button>' +
      '<button type="button" class="btn primary small" data-w="send" data-i="' + i + '">Send to friends</button>' +
      (m.k === "d5" && lbOn() ? '<button type="button" class="btn ghost small" data-w="room" data-i="' + i + '">Play in a room</button>' : "") + "</span>";
  }
  function showPassed(m, r) {
    $("w-result").innerHTML = '<div class="w-card w-pass"><p class="eyebrow">✓ Passed the check</p>' + storyCardHtml(m, 0, r.story) +
      (r.warnings.length ? '<p class="muted small">Style notes (optional): ' + esc(problemLines(r.warnings).join(" · ")) + "</p>" : "") + "</div>";
    Snd.play("stamp");
    $("w-result").scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }
  function renderRecent() {
    var list = S.made || [];
    if (!list.length) { $("w-recent").innerHTML = ""; return; }
    $("w-recent").innerHTML = '<h3 class="sec">Your recent stories</h3><div class="w-list2">' + list.map(function (m, i) {
      return '<div class="w-card">' + '<p class="w-tag">' + KIND_NAME[m.k] + "</p><b>" + esc(m.t) + "</b>" +
        '<span class="w-acts"><button type="button" class="btn ghost small" data-w="try" data-i="' + i + '">Try it</button>' +
        '<button type="button" class="btn primary small" data-w="send" data-i="' + i + '">Send</button>' +
        (m.k === "d5" && lbOn() ? '<button type="button" class="btn ghost small" data-w="room" data-i="' + i + '">Room</button>' : "") + "</span></div>";
    }).join("") + "</div>";
  }
  function sendStory(m) {
    var u = Plat.shareLink({ w: m.code });
    if (!u) { toast("Story links can't be shared from here."); return; }
    WL.track("story_send", { kind: m.k, length: u.length });
    shareOut((m.k === "d5" ? "📖 I made a LiarHunt mystery for you: “" + m.t + "”. Five connected cases, one try each. How many can you solve?"
      : "🕵️ I made a LiarHunt investigation for you: “" + m.t + "”. Can you crack it?") + "\n" + u, "Link copied. Paste it to a friend!");
  }
  function shareStoryResult(o, score) {
    var u = Plat.shareLink({});
    WL.track("story_result_share", { kind: o.k });
    shareOut("🕵️ I played your LiarHunt " + (o.k === "d5" ? "story" : "investigation") + " “" + o.t + "”: " + score + ".\nYour turn: make me another one, or try today's cases." + (u ? "\n" + u : ""));
  }
  // A story from a link (or the player's own): check it again, then play it. -> false if it's broken
  function openStory(code, w, how) {
    var r = STORY && w && w.s ? STORY.checkStory(w.s) : null;
    if (!r || !r.ok || r.kind !== w.k) { toast("This story link is broken. Ask your friend to send it again.", "", 4000); return false; }
    var mine = how === "preview" || (S.made || []).some(function (x) { return x.code === code; });
    var o = { k: w.k, t: r.story.title, code: code, key: "s" + WL.hash(code), by: mine ? "you" : cleanBy(w.b), mine: mine, preview: how === "preview" };
    WL.track(o.preview ? "story_try" : "story_open", { kind: o.k });
    if (w.k === "d5") startStoryD5(r.story, o); else startCareer(r.story, o);
    return true;
  }
  function openMade(i, how) {
    var m = (S.made || [])[i];
    if (!m) return;
    WL.unpackWritten(m.code).then(function (w) { if (w) openStory(m.code, w, how); else toast("That story can't be opened any more."); });
  }
  function startCareer(book, o) {
    var b = JSON.parse(JSON.stringify(book));
    b.id = o.key;
    run = null;
    Book.startStory(b, { key: o.key, by: o.by, label: o.mine ? "Send it to friends" : "Tell " + o.by + " how you did",
      share: function (got, of) { if (o.mine) sendStory(o); else shareStoryResult(o, got + " of " + of + " stars"); } });
  }
  // Story Night's rules: one try per case, no Hunch; a wrong answer scores 0, shows the answer and the story carries on.
  function memNight(id, dx) { return { id: id, docs: dx, ed: dx.edition, finale: dx.finale, st: { cases: {}, reveals: {}, notes: {}, ch: {}, seen: 0 }, r: { picks: {}, grid: "", strikes: 99, hunch: 0 } }; }
  function startStoryD5(story, o) {
    var n = memNight(o.key, STORY.docs(story));
    run = { kind: "story", night: true, label: o.mine ? "Your story" : "A friend's story", story: o, day: 0, cases: [null, null, null, null, null], idx: 0, elapsed: 0,
      prog: { results: [], cur: null }, d5: { ed: n.ed, st: n.st, api: nightApi(n), r: n.r, fin: n.finale } };
    d5Open(1);
  }
  function verdictStory(correct, how) {
    var c = run.c;
    run.prog.results = d5Results(run.d5.r);
    setVerdict({
      head: correct ? (c.mode === "verdict" ? "Case closed!" : pick(CAUGHT)) : how === "proof" ? "Not proven." : c.mode === "verdict" ? "Not the whole truth." : "Not quite.", good: correct,
      sub: c.mode === "verdict" ? (correct ? "You named everyone behind it." : "Here's what the file proves.") : missLine(how) + answerLine(),
      story: c.finding ? "📓 New in your notebook: " + c.finding.text : "",
      next: c.n === 5 ? "See how it ended" : "Next case", hq: run.story.preview ? "Back to your story" : "HQ"
    });
    renderMeta();
  }
  function storyEnd() {
    var o = run.story, ed = run.d5.ed, fin = run.d5.fin, got = scoreOf(run.prog.results);
    if (o.preview) openWrite(); else goHQ();
    showNotice({ icon: "📜", eyebrow: ed.title + " · the ending", title: "You solved " + got + " of 5", html: finaleHtml(fin),
      yes: o.mine ? "Send it to friends" : "Tell " + o.by + " how you did", onYes: function () { if (o.mine) sendStory(o); else shareStoryResult(o, "I solved " + got + " of 5 cases"); },
      no: "Close" });
    if (got === 5) FX.confetti({ count: 120 });
    WL.track("story_done", { kind: "d5", solved: got, preview: o.preview });
  }
  $("w-kinds").addEventListener("click", function (e) {
    var b = e.target.closest("[data-wk]");
    if (!b || b.dataset.wk === wKind) return;
    Snd.play("click"); setWriteKind(b.dataset.wk);
  });
  $("w-bp-copy").addEventListener("click", function () {
    Snd.play("click");
    var t = bpText[wKind];
    if (t) { copyText(t, "Blueprint copied. Paste it into your AI chat, then add your idea."); WL.track("story_blueprint", { kind: wKind, how: "copy" }); return; }
    toast("The blueprint is still loading. Try again in a moment, or use Download.");
    loadBlueprint(wKind).catch(function () { toast("Couldn't load the blueprint. Check your connection."); });
  });
  $("w-check").addEventListener("click", function () { Snd.play("click"); checkMine(); });
  $("w-file").addEventListener("change", function () {
    var f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    if (f.size > STORY.MAX_IN) { showProblems({ errors: ["This file is too big (over 60 KB). Ask the AI to make the story shorter: fewer suspects, shorter texts."], warnings: [] }); return; }
    var rd = new FileReader();
    rd.onload = function () { $("w-paste").value = String(rd.result || ""); checkMine(); };
    rd.onerror = function () { toast("Couldn't read that file."); };
    rd.readAsText(f);
  });
  $("w-ai").addEventListener("click", function (e) {
    var b = e.target.closest("[data-w]");
    if (!b) return;
    Snd.play("click");
    var a = b.dataset.w, i = +b.dataset.i, m = (S.made || [])[i];
    if (a === "fix") { copyText(wFix, "Copied. Paste it into the same AI chat."); return; }
    if (!m) return;
    if (a === "try") openMade(i, "preview");
    else if (a === "send") sendStory(m);
    else if (a === "room") withName(function () { createRoom("night", { story: "u-" + WL.hash(m.code), pack: m.code }); }, "room");
  });

  /* ---------- live rooms: one link, friends playing together (they talk on a call or WhatsApp) ----------
     Three kinds of room (room.data.mode):
       race      up to 10 players race through the same 5 cases (WL.roomCase). A proven catch scores 100, plus up to 50 for speed.
       partners  2 players share each case. One sees the suspects' stories, the other the police facts. Whoever can see the
                 pick makes it, the other proves it, so neither can finish alone. Sides swap every case. One team score.
       night     Story Night: up to 10 players play one five-case story from nights/{id} on the Daily 5 case screen. No strikes:
                 a wrong answer scores 0 and the story carries on. Between cases everyone sees what the case revealed, and
                 the host moves the room on (anyone else can after NIGHT_WAIT).
     One try per case, no hints. The host's game moves the room on; anyone else's does it if the host has gone quiet.
     Answers carry the game's seed (s), so a new game in the same room never mixes with the last one. Every player pings
     "still here" every PING_MS; one quiet for LB.rooms.STALE (phone locked in WhatsApp, tab closed) doesn't hold the
     room up. Friends' rooms run on the honor system: each phone checks its own answers. */
  var ROUND_MS = 90000, PING_MS = 30000, NIGHT_WAIT = 90000, room = null;
  function rmode() { return (room && room.data && room.data.mode) || "race"; }
  function roomLimit(c) {
    var m = rmode();
    if (m === "night") return room && room.night && room.night.ed && room.night.ed.fmt === 2 ? 480000 : 300000; // a v2 chapter is searched and questioned: 8 minutes
    if (m === "partners") return 180000; // talking it through takes time
    return c && c.mode === "liar" ? ROUND_MS : ROUND_MS + 30000;
  }
  function roomAns(p, r) { var a = p && p.ans && p.ans[r]; return a && room && a.s === room.seed ? a : null; }
  function roomDone(p, r) { var a = roomAns(p, r); return a && a.ok != null ? a : null; } // a partner's pick is saved before the case is done
  function isLive(id) { var p = room.players[id]; return id === room.me || !p || !p.at || Date.now() - p.at < LB.rooms.STALE; }
  function liveIds() { return Object.keys(room.players).filter(isLive); }
  function mateId() { return Object.keys(room.players).filter(function (id) { return id !== room.me; })[0] || ""; }
  // Partners: the host has the suspects' stories in odd cases, the facts in even ones.
  function ptSide(id, r) { return (id === room.data.host) === (r % 2 === 1) ? "suspects" : "facts"; }
  function roomTotal(p) { var t = 0; if (p && p.ans) Object.keys(p.ans).forEach(function (r) { var a = roomAns(p, r); if (a) t += a.pts || 0; }); return t; }
  function roomRanked() {
    return Object.keys(room.players).map(function (id) {
      var p = room.players[id], ms = 0;
      Object.keys(p.ans || {}).forEach(function (r) { var a = roomAns(p, r); if (a && a.ok) ms += a.ms; });
      return { id: id, name: p.name, score: roomTotal(p), ms: ms, p: p };
    }).sort(function (a, b) { return b.score - a.score || a.ms - b.ms; });
  }
  function newSeed() { return Math.random().toString(36).slice(2, 10); }
  function once(key) { try { if (localStorage.getItem(key)) return false; localStorage.setItem(key, "1"); } catch (e) { /* count it */ } return true; }
  function nightsPlayed() { try { return JSON.parse(localStorage.getItem("wl-nights")) || {}; } catch (e) { return {}; } }
  function markNight(id) { var m = nightsPlayed(); m[id] = 1; try { localStorage.setItem("wl-nights", JSON.stringify(m)); } catch (e) { /* ignore */ } }
  function withName(cb, why) {
    if (myName()) { cb(myName()); return; }
    askName(function () { cb(myName()); }, why);
  }

  var ROOM_MODES = [
    ["race", "🏁", "Race", "Up to 10 friends, the same 5 cases at the same time. The fastest proven catches win."],
    ["partners", "🤝", "Partners", "Two of you, one case. One sees the stories, the other sees the facts. Talk it out."],
    ["night", "📖", "Story Night", "One five-case mystery for the whole group, made for playing together."]
  ];
  function openRoom() {
    withName(function () {
      showNotice({ icon: "🕵️", title: "Play with friends", text: "Get everyone on a call or WhatsApp, then pick a game.", yes: "Not now",
        html: '<div class="rmode-list">' + ROOM_MODES.map(function (m) {
          return '<button class="rmode" type="button" data-rmode="' + m[0] + '"><span class="rmode-ico" aria-hidden="true">' + m[1] +
            '</span><span class="rmode-txt"><b>' + m[2] + "</b><span>" + m[3] + "</span></span></button>";
        }).join("") + "</div>" });
      var nb = $("notice-body").querySelector('[data-rmode="night"]'), soon = function () {
        if (!nb.isConnected) return;
        nb.disabled = true; nb.querySelector(".rmode-txt span").textContent = "Coming soon: the first stories are on their way.";
      };
      if (!LB.nights) { soon(); return; }
      var made = (S.made || []).some(function (m) { return m.k === "d5"; });
      LB.nights.list().then(function (l) { if (!l.length && !made) soon(); }).catch(function () { /* checked again in the lobby */ });
    }, "room");
  }
  $("notice-body").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rmode]");
    if (!b || b.disabled) return;
    Snd.play("click"); closeNotice(false); createRoom(b.getAttribute("data-rmode"));
  });
  // pick: a first change to the room (a Story Night opened from "Play in a room" starts with that story picked)
  function createRoom(mode, pick) {
    var name = myName();
    toast("Opening a room...");
    LB.rooms.create({ name: name, seed: newSeed(), season: Math.max(1, SEASON), rounds: 5, mode: mode }).then(function (code) {
      WL.track("room_create", { mode: mode, mine: !!pick });
      return (pick ? LB.rooms.update(code, pick) : Promise.resolve()).then(function () { return joinRoom(code, name); });
    }).catch(function (e) { toast(esc(LB.friendlyError(e))); });
  }
  function joinRoom(code, name) {
    return LB.rooms.join(code, name).then(function (d) {
      enterRoom(code);
      if (once("wl-rj:" + code)) WL.track("room_join", { mode: (d && d.mode) || "race", host: !!d && d.host === LB.rooms.me() }); // a reload isn't a new join
    }).catch(function (e) { goHQ(); toast(esc(LB.friendlyError(e)), "", 4000); });
  }
  function enterRoom(code) {
    if (!room || room.code !== code) {
      leaveRoom(true);
      room = { code: code, me: LB.rooms.me(), data: null, players: {}, gotPlayers: false, seed: "", pts: {}, pinged: Date.now(), night: null, nightList: null };
      room.stop = LB.rooms.watch(code, function (d) { if (room) { onRoomData(d); } }, function (p) {
        if (!room) return;
        room.players = p; room.gotPlayers = true;
        syncRound(); partnerSync(); renderRoom(); roomTick();
      });
      room.tick = setInterval(roomTick, 1000);
    }
    try { history.replaceState(null, "", location.pathname + "?room=" + code); } catch (e) { /* ignore */ }
    show("room");
    setHud("Live room", "Room " + code);
    renderRoom();
  }
  function leaveRoom(quiet) {
    if (!room) return;
    var r = room;
    room = null;
    if (r.stop) r.stop();
    clearInterval(r.tick);
    LB.rooms.leave(r.code).catch(function () { /* already gone */ });
    try { history.replaceState(null, "", location.pathname); } catch (e) { /* ignore */ }
    if (!quiet) toast("You left the room.");
  }
  // Back from WhatsApp: say "still here" at once and catch up with the room.
  document.addEventListener("visibilitychange", function () { if (room && !document.hidden) { room.pinged = 0; roomTick(); } });
  function onRoomData(d) {
    // the host started a new game (the seed is taken first: a demo room answers the reset at once, and would loop)
    if (room.seed && d.seed !== room.seed) { room.pts = {}; room.night = null; room.seed = d.seed; LB.rooms.reset(room.code).catch(function () {}); }
    room.seed = d.seed; room.data = d;
    if (room.overRound !== d.round) { room.overRound = d.round; room.overAt = 0; } // a new case isn't closed yet (or Story Night would load its answer)
    if (d.state === "end" && once("wl-re:" + room.code + ":" + d.seed)) {
      WL.track("room_end", { mode: rmode(), players: room.gotPlayers ? liveIds().length : 0, host: d.host === room.me });
      if (rmode() === "night" && d.story) markNight(d.story);
    }
    // the game ended (or went back to the lobby) while this player was still on a case: show the room
    if (d.state !== "play" && screen === "case" && run && run.kind === "room" && !run.revealed) { stopClock(); show("room"); }
    if (rmode() === "night") {
      if (d.story && room.seenFor !== d.story) { room.seenFor = d.story; LB.rooms.ping(room.code, { seen: !!nightsPlayed()[d.story] }).catch(function () {}); }
      if (d.story) loadNight(d.story).then(function () { renderRoom(); }, function () {});
      if (d.state === "lobby" && d.host === room.me && !room.nightList) {
        room.nightList = [];
        LB.nights.list().then(function (l) { if (room) { room.nightList = l; renderRoom(); } }).catch(function () { if (room) room.nightList = null; });
      }
    }
    syncRound(); renderRoom(); roomTick();
  }
  // Start the room's current case here, unless this player already finished it (or is playing it).
  function syncRound() {
    var d = room && room.data;
    if (!d || !room.gotPlayers || d.state !== "play" || d.round < 1) return;
    if (roomDone(room.players[room.me], d.round) || room.pts[d.round] != null) return;
    if (run && run.kind === "room" && run.round === d.round && run.seed === d.seed) return;
    if (room.starting === d.seed + d.round) return; // a Story Night case is still loading
    startRoomRound(d.round);
  }
  function startRoomRound(r) {
    var d = room.data;
    if (rmode() === "night") { startNightRound(r); return; }
    run = { kind: "room", round: r, seed: d.seed, c: WL.roomCase(d.seed, r, d.season), elapsed: 0 };
    run.limit = roomLimit(run.c);
    if (rmode() === "partners") run.pt = { side: ptSide(room.me, r) };
    show("case");
    loadCase();
    roomLate(d);
    partnerSync();
  }
  // Joined late or reloaded: the clock already ran since the case opened for everyone.
  // ponytail: trusts this phone's clock against the server's; kept to at least 15 s left in case it runs fast
  function roomLate(d) { var late = Date.now() - d.roundAt; if (late > 3000) run.caseElapsed = Math.min(late, run.limit - 15000); }

  /* Partners: hide the other player's half, and let only the right player tap. */
  function ptApply() {
    var c = run.c, side = run.pt.side, scr = $("scr-case");
    run.pt.picker = (pickKind() === "suspect") === (side === "suspects");
    scr.classList.add("pt"); scr.classList.toggle("pt-suspects", side === "suspects"); scr.classList.toggle("pt-facts", side === "facts");
    $("pt-note").hidden = side !== "suspects";
    $("pt-note").innerHTML = "<b>Your partner has the police facts.</b> Read them every story, word for word, and ask what the facts say.";
    if (side === "facts") [].forEach.call($("suspects").querySelectorAll(".says"), function (el, i) { el.textContent = "Your partner has " + c.suspects[i].name + "'s story. Ask them what they said."; });
  }
  function ptClear() {
    var scr = $("scr-case");
    scr.classList.remove("pt", "pt-suspects", "pt-facts"); $("pt-note").hidden = true;
    if (run && run.c && run.pt) [].forEach.call($("suspects").querySelectorAll(".says"), function (el, i) { el.textContent = run.c.suspects[i].says; });
  }
  function ptGate() {
    if (!run || !run.pt || run.revealed) return;
    var c = run.c, pick = run.phase === "pick", actor = pick ? run.pt.picker : !run.pt.picker, n = (c.proof || []).length;
    var who = c.mode === "planted" ? "" : (c.suspects[run.pick] || {}).name || "";
    if (!actor) { els(pick ? pickKind() : proofKind()).forEach(function (e) { e.disabled = true; e.classList.add("static"); }); hideConfirm(); }
    $("task").textContent = pick
      ? (actor
        ? (c.mode === "planted" ? "Every story is true, but one fact was planted. Your partner has the stories: check each fact with them, then tap the fake one."
          : c.mode === "honest" ? "Two of them are lying. Your partner has the facts: talk it through, then tap the only honest one."
            : "One of them is lying. Your partner has the facts: talk it through, then tap the liar.")
        : run.pt.side === "facts" ? "Your partner has the stories and makes the call. Read out the facts and ask what each suspect said."
          : "Your partner has the facts and picks the fake one. Read out every story.")
      : actor
        ? (c.mode === "planted" ? "Your partner found the fake fact. Tap the story that proves it can't be true."
          : "Your partner " + (c.mode === "honest" ? "says " + who + " is the honest one" : "accused " + who) + ". Ask exactly what " + (c.mode === "honest" ? "the other two" : who) +
            " said, then tap the fact" + (n > 1 ? "s" : "") + " that break" + (n > 1 ? "" : "s") + " it.")
        : (c.mode === "planted" ? "You found the fake fact. Now your partner proves it with one of the stories."
          : "You " + (c.mode === "honest" ? "picked " + who + " as the honest one" : "accused " + who) + ". Now your partner taps the proof: tell them exactly what " +
            (c.mode === "honest" ? "the other two" : who) + " said.");
  }
  // The picker's choice: a wrong one ends the case for both; a right one goes to the partner to prove.
  function ptPick(i) {
    if (i !== run.c.answer) { reveal(false, "pick"); return; }
    if (!(run.c.proof || []).length) { reveal(true, "ok"); return; }
    LB.rooms.answer(room.code, run.round, { s: run.seed, pick: i }, roomTotal(room.players[room.me])).catch(function () { /* the next write carries it */ });
    ptProof(i);
  }
  function ptProof(i) {
    if (run.phase === "proof") return;
    var c = run.c, el = els(pickKind())[i];
    run.pick = i;
    setPhase("proof");
    if (el) { el.classList.add("is-accused"); stamp(el, c.mode === "honest" ? "Honest" : c.mode === "planted" ? "Fake" : "Accused", "pending"); }
    renderTools();
    Snd.play("stamp");
  }
  // Catch up with the partner: their pick opens the proof step, their finished case closes it the same way here.
  function partnerSync() {
    if (!room || !run || !run.pt || run.revealed || run.seed !== room.seed || screen !== "case") return;
    var r = run.round, a = roomAns(room.players[mateId()], r), mine = roomAns(room.players[room.me], r);
    if (a && a.ok != null) {
      run.ptShared = a;
      if (a.pick != null) run.pick = a.pick;
      run.sel = a.proof ? a.proof.slice() : [];
      reveal(!!a.ok, a.how || (a.ok ? "ok" : "pick"));
      return;
    }
    var pk = a && a.pick != null ? a.pick : mine && mine.pick != null ? mine.pick : null;
    if (pk != null && run.phase === "pick") ptProof(pk);
  }

  /* Story Night: the story's docs come from nights/{id}; the run lives in room.night, never in the Daily's save. */
  // A player's story ("u-" + hash, from "Write a case") isn't in nights/: the room carries its link code (pack),
  // and every phone unpacks it and checks it before playing.
  function loadNight(id) {
    if (room.night && room.night.id === id) return room.night.ready;
    var n = room.night = { id: id, ed: null, finale: null, st: { cases: {}, reveals: {}, notes: {}, seen: 0 }, r: { picks: {}, grid: "", strikes: 99, hunch: 0 } };
    var broken = function () { var e = new Error("This story is broken, so it can't be played. Pick another one."); e.story = true; throw e; };
    var ed = id.indexOf("u-") !== 0 ? LB.nights.edition(id) : WL.unpackWritten((room.data && room.data.pack) || "").then(function (w) {
      var r = w && w.k === "d5" && STORY ? STORY.checkStory(w.s) : null;
      if (!r || !r.ok) broken();
      n.docs = STORY.docs(r.story);
      return Object.assign({ id: id, by: cleanBy(w.b) }, n.docs.edition);
    });
    n.ready = ed.then(function (x) { if (!x) throw new Error("That story isn't there any more."); n.ed = x; return n; });
    n.ready.catch(function (e) { if (room && room.night === n) { room.night = null; toast(esc(e && e.story ? e.message : LB.friendlyError(e))); } });
    return n.ready;
  }
  // a story's case or reveal: from memory (a player's story), or from nights/{id}
  function nightDoc(n, sub, k) {
    if (n.docs) return Promise.resolve(n.docs[sub][k] || null);
    return sub === "cases" ? LB.nights.caseDoc(n.id, k) : LB.nights.reveal(n.id, k);
  }
  function nightApi(n) {
    return {
      caseDoc: function (d, k) { return nightDoc(n, "cases", k); },
      reveal: function (d, k) { return nightDoc(n, "reveals", k); },
      run: function () { return Promise.resolve(n.r); },
      commit: function (d, k, pick) { n.r.picks["c" + k] = n.r.picks["c" + k] || { s: pick.s, p: pick.p }; return Promise.resolve(n.r); },
      resolve: function (d, k, letter) { n.r.grid = (n.r.grid + "-----").slice(0, k - 1) + letter; return Promise.resolve(n.r); },
      hunch: function () { return Promise.reject(new Error("No Hunch in Story Night")); }
    };
  }
  function startNightRound(r) {
    var d = room.data, keep = room, key = d.seed + r;
    if (!d.story) return;
    room.starting = key;
    loadNight(d.story).then(function (n) {
      // the notebook carries every earlier case and what it revealed, even for someone who just joined
      var need = [];
      for (var k = 1; k < r; k++) (function (k) {
        if (!n.st.cases[k]) need.push(nightDoc(n, "cases", k).then(function (doc) { n.st.cases[k] = doc; }));
        if (!n.st.reveals[k]) need.push(nightDoc(n, "reveals", k).then(function (rev) { n.st.reveals[k] = rev; }));
      })(k);
      return Promise.all(need).then(function () {
        if (room !== keep || room.starting !== key) return;
        room.starting = "";
        if (!room.data || room.data.state !== "play" || room.data.round !== r) return;
        run = { kind: "room", night: true, round: r, seed: d.seed, day: 0, cases: [null, null, null, null, null], idx: r - 1, elapsed: 0,
          prog: { results: [], cur: null }, d5: { ed: n.ed, st: n.st, api: nightApi(n), r: n.r } };
        run.limit = roomLimit(null);
        if (r === 1) markNight(n.id);
        d5Open(r);
      });
    }).catch(function (e) { if (room === keep) { room.starting = ""; toast(esc(LB.friendlyError(e))); } });
  }
  // Called by the case screen once it's open (d5Open's loadCase): the shared clock may already have run.
  function nightOpened() { if (room && room.data) roomLate(room.data); }

  function verdictRoom(correct, how) {
    var m = rmode(), sh = run.ptShared, ms = Math.min(run.caseElapsed, run.limit);
    var pts = sh ? sh.pts || 0 : !correct ? 0 : m === "race" ? 100 + Math.max(0, 50 - Math.floor(ms / 1000)) : 100 + Math.max(0, Math.round(50 * (1 - ms / run.limit)));
    if (room && room.seed === run.seed) {
      room.pts[run.round] = pts;
      // total = this game's points so far: what's saved online, plus answers not saved yet
      var mine = room.players[room.me] || {}, byRound = {}, total = 0;
      Object.keys(mine.ans || {}).forEach(function (r) { var a = roomAns(mine, r); if (a) byRound[r] = a.pts || 0; });
      Object.keys(room.pts).forEach(function (r) { byRound[r] = room.pts[r]; });
      Object.keys(byRound).forEach(function (r) { total += byRound[r]; });
      var a = { ok: correct, ms: Math.round(ms), pts: pts, s: run.seed };
      if (m === "partners") {
        a.how = how;
        if (!sh && run.pick != null && run.pick >= 0) a.pick = run.pick;
        if (!sh && how !== "pick" && run.sel && run.sel.length) a.proof = run.sel.slice();
      }
      LB.rooms.answer(room.code, run.round, a, total).catch(function () { /* retried on the next answer */ });
    }
    var head = correct ? (m === "partners" ? "Cracked it together!" : pick(CAUGHT)) : how === "timeout" ? "Time's up." : how === "proof" ? "Not proven." : "Not quite.";
    setVerdict({
      head: head, good: correct,
      rewards: pts ? '<span class="rw coin">+' + pts + (m === "partners" ? " team points" : " points") + "</span>" : "",
      sub: missLine(how) + answerLine(), next: m === "night" ? "Back to the group" : "See the scores", hq: "Leave room"
    });
    WL.track("room_answer", { round: run.round, correct: correct, mode: m });
  }
  // The host's game moves the room on 5 s after everyone answered (or time ran out); anyone else's after 25 s.
  // Story Night waits for the host, so the group can read what the case revealed; anyone else can after NIGHT_WAIT.
  function roomTick() {
    if (!room || !room.data || !room.gotPlayers) return;
    if (Date.now() - (room.pinged || 0) > PING_MS && room.players[room.me]) {
      room.pinged = Date.now();
      LB.rooms.ping(room.code).catch(function () { if (room) room.pinged = 0; });
    }
    var d = room.data, m = rmode();
    if (d.state !== "play" || d.round < 1) return;
    var ids = liveIds(), done = function (id) { return roomDone(room.players[id], d.round); };
    var lim = m === "race" ? roomLimit(WL.roomCase(d.seed, d.round, d.season)) : roomLimit(null);
    var allIn = ids.length > 0 && (m === "partners" ? ids.some(done) : ids.every(done)); // partners: one finished case is the team's
    if (room.overRound !== d.round) { room.overRound = d.round; room.overAt = 0; }
    if (!allIn && Date.now() - d.roundAt < lim + 8000) return;
    if (!room.overAt) { room.overAt = Date.now(); if (screen === "room") renderRoom(); }
    var wait = m === "night" ? (d.host === room.me && isLive(d.host) ? Infinity : NIGHT_WAIT) : d.host === room.me ? 5000 : 25000;
    if (m === "night" && d.host !== room.me && !isLive(d.host)) wait = 5000; // the host has gone: don't keep everyone waiting
    if (Date.now() - room.overAt < wait || room.moving === d.seed + d.round) return;
    room.moving = d.seed + d.round;
    LB.rooms.update(room.code, d.round < d.rounds ? { round: d.round + 1, roundAt: true } : { state: "end" }).catch(function () { if (room) room.moving = ""; });
  }

  var MODE_NAME = { race: "Live room", partners: "Partners", night: "Story Night" };
  // Who plays against whom, said in words and in colour: rivals each get their own colour (in the order they joined),
  // partners share one team colour.
  var VS_LINE = {
    race: "⚔️ You're playing against each other. Everyone has their own score.",
    partners: "🤝 You're one team. You crack every case together and share one score.",
    night: "📖 You play the story together, but everyone answers for their own score."
  };
  var RIVAL_COLORS = ["#e0475b", "#3b82f6", "#22a55a", "#f08a24", "#a855f7", "#14b8a6", "#ec4899", "#b8860b", "#84cc16", "#64748b"];
  function rivalColor(id) {
    var ids = Object.keys(room.players).sort(function (a, b) { return (room.players[a].joinedAt || 9e15) - (room.players[b].joinedAt || 9e15) || (a < b ? -1 : 1); });
    return RIVAL_COLORS[ids.indexOf(id) % RIVAL_COLORS.length];
  }
  function renderRoom() {
    if (!room || screen !== "room") return;
    var d = room.data, m = rmode(), host = d && d.host === room.me, list = d ? roomRanked() : [], acts = [], extra = "";
    if (!d) { $("room-h").textContent = "Joining the room..."; $("room-extra").innerHTML = ""; return; }
    setHud(MODE_NAME[m], "Room " + room.code);
    var live = list.filter(function (x) { return isLive(x.id); }), n = room.night, story = n && n.ed && n.id === d.story ? n.ed : null;
    $("room-code").innerHTML = d.state === "end" ? "" : '<span class="room-code-big" aria-label="Room code">' + room.code + "</span>" +
      '<button class="btn small primary" type="button" data-room="invite">' + (m === "partners" ? "Invite your partner" : "Invite friends") + "</button>";
    var r = d.round, waiting = live.filter(function (x) { return !roomDone(x.p, r); }).length;
    if (d.state === "lobby") {
      var max = LB.rooms.maxFor(d), ready = m === "partners" ? live.length === 2 : live.length >= 2;
      $("room-eyebrow").textContent = MODE_NAME[m] + " · " + live.length + " of " + max + " detectives";
      if (m === "partners") {
        $("room-h").textContent = host ? (ready ? "Your partner is in" : "Get your partner in") : "You're in!";
        $("room-sub").textContent = (host ? "Send the link to one friend and get on a call or WhatsApp. " : "Waiting for " + d.hostName + " to start. ") +
          "One of you sees the suspects' stories, the other sees the police facts. Neither of you can solve a case alone. You swap sides every case.";
      } else if (m === "night") {
        $("room-h").textContent = host ? (story ? "Tonight: " + story.title : "Pick tonight's story") : "You're in!";
        $("room-sub").textContent = (host ? "Send the link and get everyone on a call. " : "Waiting for " + d.hostName + " to " + (story ? "start." : "pick a story.") + " ") +
          "Everyone plays the same five connected cases. After each one, you all see what it revealed.";
        if (host) extra = nightPicker(d);
        else if (story) extra = '<div class="night-card"><b>' + esc(story.title) + "</b><span>" + esc(story.place || "") + (story.by ? " · made by " + esc(story.by) : "") + "</span></div>";
        ready = ready && !!story;
      } else {
        $("room-h").textContent = host ? "Get your friends in" : "You're in!";
        $("room-sub").textContent = host ? "Send the link. Everyone who opens it joins this room, and you all get the same " + d.rounds + " cases at the same time. 3 or more is best."
          : "Waiting for " + d.hostName + " to start. Everyone gets the same " + d.rounds + " cases at the same time.";
      }
      if (host) acts.push('<button class="btn danger big wide" type="button" data-room="start"' + (ready ? "" : " disabled") + ">" +
        (ready ? "Start the game (" + live.length + " detectives)" : m === "night" && live.length >= 2 ? "Pick a story to start" : m === "partners" ? "Waiting for your partner to join" : "Waiting for a friend to join") + "</button>");
    } else if (d.state === "play") {
      var over = room.gotPlayers && (!waiting || room.overAt) || (m === "partners" && live.some(function (x) { return roomDone(x.p, r); }));
      var mate = m === "partners" ? room.players[mateId()] : null;
      $("room-eyebrow").textContent = (m === "night" && story ? story.title + " · " : "") + "Case " + r + " of " + d.rounds +
        (m === "partners" ? " · You have the " + (ptSide(room.me, r) === "suspects" ? "stories" : "facts") : "");
      if (m === "partners" && !mate) {
        $("room-h").textContent = "Your partner left the room";
        $("room-sub").textContent = host ? "Send the link to someone else and start again." : "Wait for " + d.hostName + " to start a new game.";
        if (host) acts.push('<button class="btn primary wide" type="button" data-room="lobby">Back to the lobby</button>');
      } else {
        $("room-h").textContent = over ? "Case " + r + " is closed" : roomDone(room.players[room.me], r) || room.pts[r] != null ? "Waiting for " + waiting + " more" : "Case " + r + " is on";
        $("room-sub").textContent = m === "partners" && mate && !isLive(mateId()) ? "Your partner seems to be away. The case clock keeps running."
          : over ? (m === "night" ? (host ? "Read what it revealed together, then move on when everyone's ready." : (r < d.rounds ? "The next case starts when " : "The ending opens when ") + d.hostName + " is ready.")
            : r < d.rounds ? "The next case starts in a moment." : "The final scores are coming.")
            : "The next case starts when everyone has answered, or when time runs out.";
        if (m === "night" && over) extra = nightReveal(r);
        if (!roomDone(room.players[room.me], r) && room.pts[r] == null && !over) acts.push('<button class="btn danger wide" type="button" data-room="back">Back to the case</button>');
        if (host && over) acts.push('<button class="btn primary wide" type="button" data-room="next">' + (r < d.rounds ? "Next case now" : m === "night" ? "See how it ended" : "Final scores now") + "</button>");
      }
    } else {
      var solved = Object.keys((room.players[room.me] || {}).ans || {}).filter(function (k) { var a = roomAns(room.players[room.me], k); return a && a.ok; }).length;
      $("room-eyebrow").textContent = m === "partners" ? "Partners · final score" : "Final scores";
      if (m === "partners") {
        $("room-h").textContent = "Team score: " + ((list[0] && list[0].score) || 0);
        $("room-sub").textContent = "You cracked " + solved + " of " + d.rounds + " cases together. Points: 100 for a proven catch, up to 50 more for speed.";
      } else {
        $("room-h").textContent = list[0] && list[0].id === room.me ? "You won!" : list[0] ? list[0].name + " wins!" : "Game over";
        $("room-sub").textContent = m === "night" ? "Everyone played the same story. Here's how it really happened." : "Everyone played the same " + d.rounds + " cases. Points: 100 for a proven catch, up to 50 more for speed.";
      }
      if (m === "night") extra = nightFinale();
      if (host) acts.push('<button class="btn danger wide" type="button" data-room="again">' + (m === "night" ? "Play another story" : "Play again with new cases") + "</button>");
      acts.push('<button class="btn primary wide" type="button" data-room="share">Share the result</button>');
    }
    acts.push('<button class="btn ghost wide" type="button" data-room="leave">Leave room</button>');
    $("room-acts").innerHTML = acts.join("");
    $("room-extra").innerHTML = extra;
    $("room-vs").textContent = VS_LINE[m];
    $("room-vs").className = "room-vs " + (m === "partners" ? "team" : "vs");
    $("room-players").innerHTML = list.map(function (x, i) {
      var a = roomDone(x.p, r), away = !isLive(x.id), mark = d.state !== "play" ? "" : a ? (a.ok ? '<span class="rm-mark ok">✓ +' + a.pts + "</span>" : '<span class="rm-mark no">✕</span>')
        : '<span class="rm-mark wait">' + (away ? "away" : room.overAt ? "no answer" : "thinking…") + "</span>";
      var place = d.state === "end" && m !== "partners" ? ["🥇", "🥈", "🥉"][i] || i + 1 : d.state === "play" && m !== "partners" ? i + 1 : m === "partners" ? "🤝" : "🕵️";
      var tags = (x.id === d.host ? " <em>host</em>" : "") + (x.id === room.me ? " <em>(you)</em>" : "") +
        (m === "partners" && d.state === "play" ? " <em>" + (ptSide(x.id, r) === "suspects" ? "stories" : "facts") + "</em>" : "") +
        (m === "night" && d.state === "lobby" && x.p.seen ? ' <em class="seen">played it</em>' : "") + (away && d.state !== "play" ? " <em>away</em>" : "");
      return '<li class="' + (x.id === room.me ? "me" : "") + (away ? " away" : "") + (d.state === "end" && i === 0 && m !== "partners" ? " win" : "") + '"' +
        (m === "partners" ? "" : ' style="--pc:' + rivalColor(x.id) + '"') + '><span class="rm-rank">' + place + '</span><span class="rm-name">' + esc(x.name) +
        tags + "</span>" + mark + '<span class="rm-score">' + (d.state === "lobby" ? "" : x.score) + "</span></li>";
    }).join("");
  }
  function nightPicker(d) {
    var l = room.nightList, played = nightsPlayed(), made = (S.made || []).map(function (m, i) { return { m: m, i: i }; }).filter(function (x) { return x.m.k === "d5"; });
    var mine = made.length ? '<h3 class="sec">A story I made</h3><div class="night-list" role="list">' + made.map(function (x) {
      var id = "u-" + WL.hash(x.m.code), on = id === d.story;
      return '<button class="night-pick' + (on ? " on" : "") + '" type="button" role="listitem" aria-pressed="' + on + '" data-room="mystory" data-i="' + x.i + '"><b>' + esc(x.m.t) +
        "</b><span>Made in Write a case" + (played[id] ? " · you've played it" : "") + "</span></button>";
    }).join("") + "</div>" : "";
    if (!l || !l.length) return (l && made.length ? "" : '<p class="muted small">' + (l ? "No stories yet. The first Story Nights are on their way." : "Opening the story shelf…") + "</p>") + mine;
    // a past Daily 5 retold (someone else did it) stays off the shelf until its day's story is public (6 AM IST the day after)
    var shelf = l.filter(function (s) { return !s.origDay || s.origDay < TODAY - 1 || (s.origDay === TODAY - 1 && WL.istHour() >= 6); });
    return '<div class="night-list" role="list">' + shelf.map(function (s) {
      var on = s.id === d.story, past = !!s.remixOf;
      return '<button class="night-pick' + (on ? " on" : "") + (past ? " twist" : "") + '" type="button" role="listitem" aria-pressed="' + on + '" data-room="story" data-id="' + esc(s.id) + '">' +
        (past ? '<em class="night-twist">Past case, new twist</em>' : "") + "<b>" + esc(s.title) + "</b><span>" +
        (past ? "Daily #" + s.origDay + " · Someone else did it this time" : esc(s.place || "")) + (played[s.id] ? " · you've played it" : "") + "</span></button>";
    }).join("") + "</div>" + mine;
  }
  function nightReveal(r) {
    var n = room.night, rev = n && n.st.reveals[r];
    if (!n) return "";
    if (rev === undefined) { n.st.reveals[r] = null; nightDoc(n, "reveals", r).then(function (x) { n.st.reveals[r] = x; renderRoom(); }, function () { delete n.st.reveals[r]; }); }
    if (!rev || !rev.finding) return r === 5 ? '<p class="muted small">The verdict is in. The full story is next.</p>' : "";
    return '<div class="night-card reveal"><span class="eyebrow">What case ' + r + " revealed</span><b>" + esc(rev.finding.text) + "</b></div>";
  }
  function nightFinale() {
    var n = room.night;
    if (!n) return "";
    if (n.finale === null) { n.finale = false; (n.docs ? Promise.resolve(n.docs.finale) : LB.nights.finale(n.id)).then(function (f) { n.finale = f || false; renderRoom(); }, function () { n.finale = null; }); }
    return n.finale ? '<div class="night-card end"><h3 class="sec">How it happened</h3>' + finaleHtml(n.finale) + "</div>" : '<p class="muted small">Opening the full story…</p>';
  }
  $("scr-room").addEventListener("click", function (e) {
    var b = e.target.closest("[data-room]");
    if (!b || b.disabled || !room) return;
    Snd.play("click");
    var k = b.dataset.room, d = room.data, m = rmode();
    if (k === "invite") {
      WL.track("room_invite", { mode: m });
      var pitch = m === "partners" ? "🤝 Be my LiarHunt partner! One of us gets the suspects' stories, the other gets the facts. We crack the case together on a call."
        : m === "night" ? "📖 Join my LiarHunt Story Night! One mystery in five connected cases, and we play it together. Get on the call!"
          : "🕵️ Join my live LiarHunt room! We all get the same cases at the same time. Can you catch the liars faster than me?";
      shareOut(pitch + "\n" + Plat.shareLink({ room: room.code }) + "\nRoom code: " + room.code, "Link copied. Send it on WhatsApp!");
    } else if (k === "start") {
      WL.track("room_start", { mode: m, players: liveIds().length });
      LB.rooms.update(room.code, { state: "play", round: 1, roundAt: true }).catch(function (er) { toast(esc(LB.friendlyError(er))); });
    } else if (k === "story" || k === "mystory") {
      var mm = k === "mystory" ? (S.made || [])[+b.dataset.i] : null;
      if (k === "mystory" && !mm) return;
      // pack: the link code of a story the host made. Only sent when it changes, so a published pick still works if the rules don't know pack yet.
      var patch = mm ? { story: "u-" + WL.hash(mm.code), pack: mm.code } : { story: b.dataset.id };
      if (!mm && d.pack) patch.pack = "";
      LB.rooms.update(room.code, patch).catch(function (er) { toast(esc(LB.friendlyError(er))); });
    }
    else if (k === "next") { room.moving = d.seed + d.round; LB.rooms.update(room.code, d.round < d.rounds ? { round: d.round + 1, roundAt: true } : { state: "end" }); }
    else if (k === "again") {
      WL.track("room_rematch", { mode: m, players: liveIds().length });
      room.nightList = null;
      var again = m === "night" ? { state: "lobby", round: 0, story: "", seed: newSeed() } : { state: "play", round: 1, seed: newSeed(), roundAt: true };
      if (m === "night" && d.pack) again.pack = "";
      LB.rooms.update(room.code, again);
    } else if (k === "lobby") LB.rooms.update(room.code, { state: "lobby", round: 0, seed: newSeed() });
    else if (k === "back") { room.starting = ""; startRoomRound(d.round); }
    else if (k === "leave") { leaveRoom(); goHQ(); }
    else if (k === "share") {
      var list = roomRanked(), i = list.map(function (x) { return x.id; }).indexOf(room.me), me = list[i], u = Plat.shareLink({});
      shareOut(m === "partners" ? "🤝 My partner and I scored " + (me ? me.score : 0) + " points cracking LiarHunt cases together. Team up with me next time: " + u
        : m === "night" ? "📖 I came " + (i === 0 ? "first" : "#" + (i + 1)) + " of " + list.length + " at a LiarHunt Story Night" + (room.night && room.night.ed ? ", “" + room.night.ed.title + "”" : "") + ". Join the next one: " + u
          : "🕵️ I came " + (i === 0 ? "first" : "#" + (i + 1)) + " of " + list.length + " in a live LiarHunt room, with " + (me ? me.score : 0) + " points.\nPlay with us next time: " + u);
    }
  });

  /* ---------- daily reminder (calendar event, web) ---------- */
  function pad2(n) { return String(n).padStart(2, "0"); }
  function calDate(d) { return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00"; }
  function remStart() {
    var t = ($("rem-time").value || "09:00").split(":"), d = new Date();
    d.setDate(d.getDate() + 1); d.setHours(+t[0] || 0, +t[1] || 0, 0, 0);
    return d;
  }
  function remUrl() { return Plat.shareLink({}); }
  function openReminder() {
    if (!$("dlg-reminder")) return;
    updateRemLink();
    openDialog("dlg-reminder");
  }
  function updateRemLink() {
    var d = remStart(), end = new Date(d.getTime() + 5 * 60000), url = remUrl(), tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* ignore */ }
    $("rem-google").href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("🕵️ New LiarHunt cases") +
      "&details=" + encodeURIComponent("5 new cases are waiting. Keep your streak alive: " + url) +
      "&dates=" + calDate(d) + "/" + calDate(end) + "&recur=" + encodeURIComponent("RRULE:FREQ=DAILY") + (tz ? "&ctz=" + encodeURIComponent(tz) : "");
  }
  function downloadIcs() {
    var d = remStart(), url = remUrl(), now = new Date();
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LiarHunt//Daily reminder//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:liarhunt-" + now.getTime() + "@liarhunt", "DTSTAMP:" + now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
      "DTSTART:" + calDate(d), "DURATION:PT5M", "RRULE:FREQ=DAILY", "SUMMARY:🕵️ New LiarHunt cases",
      "DESCRIPTION:5 new cases are waiting. Keep your streak alive: " + url, "URL:" + url,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:New LiarHunt cases", "TRIGGER:PT0M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "liarhunt-reminder.ics";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    reminderSet("ics");
  }
  function reminderSet(how) {
    S.pwa.reminder = true; persist();
    WL.track("reminder_set", { how: how });
    closeDialog("dlg-reminder");
    toast("Reminder added. See you tomorrow, detective!", "gold");
    if (screen === "hq") renderBanner();
  }
  if ($("dlg-reminder")) {
    $("rem-time").addEventListener("change", updateRemLink);
    $("rem-google").addEventListener("click", function () { updateRemLink(); reminderSet("google"); });
    $("rem-ics").addEventListener("click", downloadIcs);
    $("btn-reminder").addEventListener("click", function () { closeDialog("dlg-settings"); openReminder(); });
  }

  /* ---------- offline cache (web) ---------- */
  if (web()) {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { /* offline play is a bonus */ }); });
    }
  }
  $("hq-banner").addEventListener("click", function (e) {
    var b = e.target.closest("[data-banner]");
    if (!b) return;
    Snd.play("click");
    var k = b.dataset.banner;
    if (k === "reminder") openReminder();
    else if (k === "restore") openRestore();
    else if (k === "google") signInGoogle();
    else if (k === "x-restore") { S.pwa.noRestore = true; persist(); renderBanner(); }
    else if (k === "x-reminder") { S.pwa.noReminder = true; persist(); renderBanner(); }
  });

  /* ---------- cloud save (web) ----------
     The game is saved in the player's Firebase account (players/{uid}), not on the device: every player has an
     account from the first visit, and "Sign in with Google" makes it follow them to any device. Saves are
     throttled while playing and sent at once at the end of a case, at HQ and when the app is closed. A save
     is refused when another device saved since this one loaded; this device then reloads the newer progress.
     CrazyGames saves through its own SDK, and without Firebase the game falls back to this device. */
  function cloudOn() { return cloud.on; }
  function google() { return cloudOn() && !!(LB.account.info() || {}).google; }
  function started() { return S.settings.tutorialDone || S.tot.solved > 0; } // brand-new visitors who leave at once cost no writes
  function fmtCode(c) { return c ? c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8) : ""; }
  function reloadWith(note) {
    try { sessionStorage.setItem("wl-note", note); } catch (e) { /* ignore */ }
    var q = bootSearch.replace(/([?&])restore=[^&]*&?/, "$1").replace(/[?&]$/, "");
    location.replace(location.pathname + q + location.hash);
  }
  // Loads the save: from the account, or (first visit after the update) the old save on this device, or the
  // backup behind its old save code if that got further. Rejects when there's no connection.
  function loadSave() {
    if (!lbOn() || (LB.provider !== "firebase" && LB.provider !== "demo")) return Promise.resolve(Plat.load());
    return LB.account.load().then(function (doc) {
      cloud.on = true;
      if (doc) { cloud.rev = doc.rev || 0; try { return JSON.parse(doc.data) || {}; } catch (e) { return {}; } }
      var local = Plat.load(), code = local.sync && local.sync.code;
      cloud.migrate = true;
      if (!code || LB.provider !== "firebase") return local;
      return LB.pullSave(code).then(function (d) {
        var x = null; try { x = d && JSON.parse(d.data); } catch (e) { /* ignore */ }
        return x && (d.xp || 0) > (local.xp || 0) ? x : local;
      }, function () { return local; });
    }, function (e) {
      // The Firestore rules don't know player saves yet (firebase/firestore.rules not deployed): keep playing on this device.
      if (e && e.code === "permission-denied") { console.warn("[save] Player saves aren't allowed by the Firestore rules yet. Saving on this device."); return Plat.load(); }
      throw e;
    });
  }
  function cloudDirty() {
    if (!S || !S.sync) return;
    S.sync.dirty = true;
    if (!cloudOn() || !started() || cloud.timer) return;
    // ponytail: at most one save every 20 s while playing; the end of a case, HQ, results and leaving the app save at once
    cloud.timer = setTimeout(function () { cloud.timer = 0; cloudPush(); }, Math.max(3000, 20000 - (Date.now() - cloud.last)));
  }
  function cloudFlush() {
    if (!S || !S.sync || !S.sync.dirty) return Promise.resolve(false);
    clearTimeout(cloud.timer); cloud.timer = 0;
    return cloudPush();
  }
  function cloudPush() {
    if (!cloudOn() || !S.sync.dirty || cloud.busy || cloud.gone || !started()) return Promise.resolve(false);
    cloud.busy = true;
    S.sync.dirty = false;
    return LB.account.save(JSON.stringify(S), S.xp || 0, cloud.rev).then(function (rev) {
      cloud.rev = rev; cloud.last = Date.now();
      if (cloud.migrate) { cloud.migrate = false; Plat.clearLocal(); } // the old copy on this device is in the account now
      return true;
    }, function (e) {
      S.sync.dirty = true;
      if (e && e.code === "conflict") { // another device saved newer progress: take it (at HQ now, otherwise when you get there)
        cloud.gone = true; cloud.reload = true;
        if (screen === "hq" && !run) goHQ();
        else toast("You played on another device. Your newer progress loads when you go back to HQ.", "", 4200);
      }
      return false;
    }).then(function (ok) { cloud.busy = false; return ok; });
  }
  function summaryOf(x) {
    var li = P.levelInfo(x.xp || 0), st = x.stats || {}, streak = st.lastDay >= TODAY - 1 ? st.streak || 0 : 0;
    return "Level " + li.level + (streak ? " · " + streak + "-day streak" : "") + " · " + FX.fmt(x.coins || 0) + " coins";
  }

  /* Google sign-in. Usually this upgrades the player's account in place. If that Google account already has a
     game (from another device), this device signs in to it: we load that game, or ask which one to keep. */
  // Google refuses sign-in inside WhatsApp's, Instagram's and other apps' browsers, so say so instead of failing.
  function openInBrowser() {
    var url = WL.siteUrl() || location.origin, android = /Android/i.test(navigator.userAgent);
    closeDialog("dlg-stats");
    showNotice({ icon: "🔒", title: "Open in your browser to sign in",
      text: "Google doesn't allow sign-in inside this app's browser. Open LiarHunt in Chrome or Safari and sign in there, and your game follows you from then on. (A game played only inside this app's browser stays here.)",
      html: android ? '<a class="btn ghost wide" href="intent://' + esc(url.replace(/^https?:\/\//, "")) + '#Intent;scheme=https;package=com.android.chrome;end">Open in Chrome</a>' : "",
      yes: "Copy link", no: "Not now",
      onYes: function () {
        var done = function () { toast("Link copied. Paste it into Chrome or Safari."); };
        try { navigator.clipboard.writeText(url).then(done, function () { toast(esc(url), "", 6000); }); } catch (e) { toast(esc(url), "", 6000); }
      } });
  }
  function signInGoogle() {
    if (!cloudOn()) return;
    if (WL.inAppBrowser(navigator.userAgent)) { WL.track("google_sign_in_blocked", { app: WL.inAppBrowser(navigator.userAgent) }); openInBrowser(); return; }
    var mine = S, json = JSON.stringify(S);
    cloudFlush().then(function () { return LB.account.google(); }).then(function (r) {
      if (!r.switched) {
        Snd.play("achieve"); toast("Signed in. Your progress now saves to your Google account.", "gold", 3600);
        WL.track("google_sign_in", { type: "link" });
        renderAccount(); renderBanner();
        return;
      }
      WL.track("google_sign_in", { type: "switch" });
      cloud.gone = true; clearTimeout(cloud.timer); // this game belongs to the old account: never write it into this one by accident
      return LB.account.load().then(function (doc) {
        var theirs = null;
        try { theirs = doc && JSON.parse(doc.data); } catch (e) { /* ignore */ }
        var keepMine = function () {
          LB.account.save(json, mine.xp || 0, 0, true).then(function () { reloadWith("Signed in. This device's game is now in your Google account."); },
            function () { reloadWith("Signed in. Your account's game is here."); });
        };
        if (!theirs) { keepMine(); return; }
        if (mine.tot.solved <= 2 && !mine.stats.played) { reloadWith("Welcome back! Your progress is here."); return; }
        var decided = false;
        closeDialog("dlg-stats");
        showNotice({ icon: "☁️", title: "This Google account already has a game",
          text: "<b>In your account:</b> " + esc(summaryOf(theirs)) + "<br><b>On this device:</b> " + esc(summaryOf(mine)) +
            "<br>Which one do you want to keep? The other one is replaced.",
          yes: "Keep my account's game", no: "Keep this device's game",
          onYes: function () { decided = true; reloadWith("Welcome back! Your progress is here."); },
          onNo: function () { decided = true; keepMine(); } });
        // closed without choosing: the account's game wins
        $("dlg-notice").addEventListener("close", function () { setTimeout(function () { if (!decided) reloadWith("Welcome back! Your progress is here."); }, 300); }, { once: true });
      });
    }).catch(function (e) { var m = LB.accountError(e); if (m) toast(esc(m), "", 4200); });
  }
  function signOutGoogle() {
    closeDialog("dlg-stats");
    showNotice({ icon: "👋", title: "Sign out?", yes: "Sign out", no: "Stay signed in",
      text: "Your progress stays safe in your Google account. This browser starts a new game until you sign in again.",
      onYes: function () {
        cloudFlush().then(function () {
          cloud.gone = true;
          return LB.account.signOut();
        }).then(function () { reloadWith("Signed out."); }, function () { cloud.gone = false; toast("Couldn't sign out. Check your connection and try again."); });
      } });
  }
  function signInTip() {
    return { icon: "☁️", eyebrow: "Keep your progress safe", title: "Sign in with Google",
      text: "Your progress is saved online for this browser only. Sign in with Google so a new phone or a cleared browser doesn't lose it.",
      yes: "Sign in with Google", no: "Later", onYes: signInGoogle };
  }
  // The account box in the profile.
  function renderAccount() {
    var box = $("acct");
    if (!box) return;
    box.hidden = !cloudOn();
    if (!cloudOn()) return;
    var a = LB.account.info() || {};
    $("acct-text").innerHTML = a.google
      ? "Signed in as <b>" + esc(a.email || a.name || "your Google account") + "</b>. Your progress is saved to your Google account and loads on any device you sign in on."
      : "Your progress is saved online for this browser. Sign in with Google to keep it if you change phones or clear your browser.";
    $("btn-google").hidden = !!a.google;
    $("btn-signout").hidden = !a.google;
    $("btn-oldcode").hidden = LB.provider !== "firebase";
  }
  if ($("acct")) {
    $("btn-google").addEventListener("click", function () { Snd.play("click"); signInGoogle(); });
    $("btn-signout").addEventListener("click", function () { Snd.play("click"); signOutGoogle(); });
    $("btn-oldcode").addEventListener("click", function () { Snd.play("click"); closeDialog("dlg-stats"); openRestore(); });
    $("btn-account").addEventListener("click", function () { Snd.play("click"); closeDialog("dlg-settings"); openProfile(); });
  }

  /* Old save codes (retired): a code or restore link from the old backup brings that progress into this account. */
  function cloudPull(code) {
    return LB.pullSave(code).then(function (doc) {
      if (!doc) { restoreFailed("We couldn't find saved progress for that code. Check it and try again."); return; }
      var data;
      try { data = JSON.parse(doc.data); } catch (e) { return; }
      closeDialog("dlg-restore");
      if (S.tot.solved <= 2 && !S.stats.played && !S.noAutoRestore) { useSave(data, "Progress restored. Welcome back, detective!"); return; }
      showNotice({ icon: "☁️", title: "Restore your saved progress?",
        text: "<b>Saved progress:</b> " + esc(summaryOf(data)) + "<br><b>Your game now:</b> " + esc(summaryOf(S)) + "<br>Restoring replaces your game now.",
        yes: "Restore", no: "Keep my game", onYes: function () { useSave(data, "Progress restored."); } });
    }).catch(function (e) { restoreFailed(LB.friendlyError(e)); });
  }
  // Swap in a saved copy and restart the game with it.
  function useSave(data, note) {
    cloud.gone = true; clearTimeout(cloud.timer);
    data.sync = Object.assign({}, data.sync || {}, { code: "", dirty: false, note: note });
    var go = function () { WL.track("progress_restored", {}); reloadWith(note); };
    if (!cloud.on) { Plat.save(data, true); go(); return; }
    LB.account.save(JSON.stringify(data), data.xp || 0, 0, true).then(go, function (e) { cloud.gone = false; restoreFailed(LB.friendlyError(e)); });
  }
  function openRestore() {
    if (!$("dlg-restore")) return;
    $("restore-code").value = ""; $("restore-error").hidden = true; $("restore-go").disabled = false;
    openDialog("dlg-restore");
  }
  function restoreFailed(msg) {
    if ($("dlg-restore") && $("dlg-restore").open) { $("restore-error").textContent = msg; $("restore-error").hidden = false; $("restore-go").disabled = false; }
    else toast(esc(msg));
  }
  if ($("dlg-restore")) {
    $("restore-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var code = LB.cleanSaveCode($("restore-code").value);
      if (!code) return restoreFailed("Save codes have 12 letters and numbers, like ABCD-EFGH-JKMN.");
      $("restore-go").disabled = true;
      cloudPull(code);
    });
  }
  // Moving to a new web address (config movedTo): back up this browser's progress first,
  // then open the new address with the restore code, so nobody starts again from zero.
  function moveAway() {
    var to = CFG.movedTo;
    if (!to || !web()) return false;
    try { if (new URL(to, location.href).origin === location.origin) return false; } catch (e) { return false; }
    var note = document.createElement("p");
    note.className = "boot-note"; note.textContent = "We've moved! Bringing your progress along...";
    $("boot").appendChild(note);
    var go = function (code) {
      var q = bootSearch.replace(/^\?/, "").split("&").filter(function (x) { return x && !/^restore=/.test(x); });
      if (code) q.unshift("restore=" + code);
      location.replace(to.replace(/\/$/, "") + "/" + (q.length ? "?" + q.join("&") : "") + location.hash);
    };
    // Google players just sign in at the new address. Anyone else carries their progress over with a one-time save code.
    if (!cloudOn() || LB.provider !== "firebase" || S.tot.solved < 1 || google()) { go(""); return true; }
    var code = LB.newSaveCode(), tries = 0;
    (function attempt() {
      LB.pushSave(code, JSON.stringify(S), S.xp || 0, Date.now()).then(function () { go(code); }, function () { if (++tries >= 3) go(""); else setTimeout(attempt, 1500); });
    })();
    return true;
  }

  /* ---------- start-up checks: streak shields and comeback gift ---------- */
  // Funnel events for analytics: first case, fifth case, and players coming back.
  function milestones() {
    var t = S.pwa.tracked = S.pwa.tracked || {};
    [[1, "first_case_done"], [5, "case_5_done"], [25, "case_25_done"]].forEach(function (m) {
      if (S.tot.solved >= m[0] && !t[m[1]]) { t[m[1]] = 1; WL.track(m[1], { day_of_play: TODAY - S.firstDay + 1 }); }
    });
  }
  function startupChecks() {
    seasonCheck();
    if (S.settings.tutorialDone && needsSetup()) openSetup(function () { renderHQ(); });
    if (S.keysRetired) { toast("Case Keys are retired: you got " + S.keysRetired + " coins.", "gold", 4200); S.keysRetired = 0; persist(); renderCoins(true); }
    var gift = Book.migrate(); // players of the old endless Career: the news, and a thank-you
    if (gift) {
      notice({ icon: "📒", eyebrow: "Career has changed", title: "Career is now one big story", sound: "fanfare",
        text: "The endless chapters have retired. Career is now <b>Book 1: The Black Ledger</b>, one mystery in 30 missions: search scenes, question suspects, " +
          "rebuild timelines and expose a conspiracy. Your level, coins and achievements stay yours. Thanks for playing the old Career:",
        html: rewardList(gift), yes: "Start Book 1", no: "Later", onYes: function () { Book.start(); } });
      WL.track("book_migrated", {});
    }
    if (S.lastSeen && S.lastSeen < TODAY) WL.track("return_visit", { days_away: TODAY - S.lastSeen, day_of_play: TODAY - S.firstDay + 1 });
    var away = S.lastSeen ? TODAY - S.lastSeen : 0;
    if (away >= 3 && S.tot.solved > 0) {
      var g = P.comeback();
      notice({ icon: "🕵️", eyebrow: "Welcome back", title: "We missed you, detective!", sound: "fanfare",
        text: "You've been away for " + away + " days. Here's a care package to get you back on the case:", html: rewardList(g),
        yes: "Play today's cases", no: "Later", onYes: function () { startDaily(TODAY); } });
      WL.track("comeback", { days: away });
    }
    var saved = P.coverStreak(TODAY);
    if (saved) {
      notice({ icon: "🛡️", title: "Streak saved!", sound: "achieve",
        text: "You missed " + (saved.used > 1 ? saved.used + " days" : "a day") + ", so " + (saved.used > 1 ? saved.used + " Streak Shields" : "a Streak Shield") +
          " kept your <b>" + saved.streak + "-day streak</b> alive. Play today to keep it going!",
        yes: "Play today's cases", no: "Later", onYes: function () { startDaily(TODAY); } });
      WL.track("shield_used", { days: saved.used });
    }
    S.lastSeen = TODAY;
  }

  /* ---------- wiring ---------- */
  $("brand").addEventListener("click", function () { Snd.play("click"); goHQ(); });
  $("btn-home").addEventListener("click", function () { Snd.play("click"); goHQ(); });

  /* Browser Back (web): close the open dialog, or go back to HQ like the button above. From HQ, Back leaves as usual.
     ponytail: one spare history entry, added on the first tap (browsers skip entries added without one) and after each handled Back. */
  var backArmed = false;
  function armBack() {
    if (backArmed || Plat.isCrazy()) return;
    try { history.pushState({ wl: 1 }, ""); backArmed = true; } catch (e) { /* ignore */ }
  }
  ["pointerdown", "keydown"].forEach(function (ev) { document.addEventListener(ev, armBack, true); });
  window.addEventListener("popstate", function () {
    if (!backArmed) return;
    backArmed = false;
    var d = document.querySelector("dialog[open]");
    if (d) { if (d.dispatchEvent(new Event("cancel", { cancelable: true }))) closeDialog(d.id); } // same as Esc
    else if (screen !== "hq") goHQ();
    else { history.back(); return; }
    armBack();
  });
  $("coins").addEventListener("click", function () {
    Snd.play("click");
    if (screen === "case") return toast("Finish this case first, then open the Shop.");
    if (screen === "book") return toast("Finish this mission first, then open the Shop.");
    openShop(false);
  });
  $("btn-play").addEventListener("click", function () { Snd.play("click"); Book.start(); });
  $("btn-map").addEventListener("click", function () { Snd.play("click"); openMap(); });
  $("btn-dossier").addEventListener("click", function () { Snd.play("click"); Book.openDossier(); });
  $("btn-daily").addEventListener("click", function () { Snd.play("folder"); startDaily(TODAY); });
  $("streak-chip").addEventListener("click", function () { Snd.play("click"); streakInfo(); });
  $("btn-friends").addEventListener("click", function () { Snd.play("click"); openFriends(); });
  $("season-card").addEventListener("click", function () { if (lbOn() && SEASON) { Snd.play("click"); openBoard("league"); } });
  $("tile-rush").addEventListener("click", function () { Snd.play("click"); if (!unlocked("rush")) return toast("Rush opens tomorrow, or after 10 solved cases."); startRush(); });
  $("btn-shop").addEventListener("click", function () { Snd.play("click"); openShop(false); });
  $("btn-ach").addEventListener("click", function () { Snd.play("click"); openAch(); });
  $("btn-stats").addEventListener("click", function () { Snd.play("click"); openProfile(); });
  $("btn-profile").addEventListener("click", function () { Snd.play("click"); openProfile(); });
  $("btn-board").addEventListener("click", function () { Snd.play("click"); openBoard(); });
  $("btn-accuse").addEventListener("click", confirmNow);
  $("btn-cancel").addEventListener("click", function () { Snd.play("click"); cancelPick(); });
  $("btn-next").addEventListener("click", next);
  $("btn-verdict-hq").addEventListener("click", function () {
    Snd.play("click");
    if (run && run.kind === "train") { S.settings.tutorialDone = true; persist(); }
    if (run && run.kind === "rush" && run.lives <= 0) { $("verdict").hidden = true; endRush(false); return; }
    if (run && run.d5 && run.reviveAsk) { d5Stop(); return; } // "Stop for today"
    if (run && (run.kind === "daily" || run.kind === "replay") && run.prog.results.length >= run.cases.length) { $("verdict").hidden = true; finishDaily(); return; }
    if (run && run.kind === "friend" && !run.preview && !run.again) { openWrite(); return; } // "Write one back"
    if (run && run.kind === "room") { leaveRoom(); goHQ(); return; } // "Leave room"
    if (run && run.kind === "story" && run.story.preview) { $("verdict").hidden = true; openWrite(); return; } // "Back to your story"
    goHQ();
  });
  $("tile-write").addEventListener("click", function () { Snd.play("click"); openWrite(); });
  $("tile-room").addEventListener("click", function () { Snd.play("click"); openRoom(); });
  $("btn-hint").addEventListener("click", useHint);
  $("btn-freeze").addEventListener("click", useFreeze);
  $("btn-share").addEventListener("click", share);
  if ($("share-wa")) {
    $("btn-copy").addEventListener("click", copy);
    $("share-wa").addEventListener("click", function () { WL.track("share", { method: "whatsapp" }); });
    $("share-x").addEventListener("click", function () { WL.track("share", { method: "x" }); });
  }

  document.addEventListener("keydown", function (e) {
    if (document.querySelector("dialog[open]")) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "TEXTAREA" || tag === "INPUT") return;
    if (screen === "book") { Book.key(e); return; }
    if (screen !== "case" || !run) {
      if (e.key === "Escape" && screen !== "hq" && screen !== "case") goHQ();
      return;
    }
    if ((e.key === "n" || e.key === "N") && run.d5 && !e.ctrlKey && !e.metaKey) { openNotebook(); e.preventDefault(); return; }
    if (!$("verdict").hidden) {
      if ((e.key === "Enter" || e.key === " ") && e.target.tagName !== "BUTTON") { next(); e.preventDefault(); }
      return;
    }
    if (run.c && run.c.fmt === 2) { if (Chapter.key(e)) e.preventDefault(); return; }
    if (/^[1-5]$/.test(e.key)) { tap(run.phase === "proof" ? proofKind() : pickKind(), parseInt(e.key, 10) - 1); e.preventDefault(); }
    else if (e.key === "Enter" && !$("confirm").hidden && e.target.tagName !== "BUTTON") { confirmNow(); e.preventDefault(); }
    else if (e.key === "Escape") cancelPick();
  });

  setInterval(function () {
    var left = WL.msToNextDay();
    [].forEach.call(document.querySelectorAll("[data-countdown]"), function (el) { el.textContent = WL.fmtCountdown(left); });
    if (screen === "hq" && paintSeasonClock().left <= 0) renderSeason();
    if (screen === "hq" && !run) {
      if (WL.dayNumber() !== TODAY) location.reload();
      else if (new Date().getSeconds() === 0) { renderHQ(); refreshLadder(false); harborSoon(); }
    }
    if (screen === "shop" && P.coolLeft("coinsAd", 240) === 0 && $("btn-free-coins") && $("btn-free-coins").disabled) renderShop();
  }, 1000);

  /* ---------- progress events ---------- */
  var hooks = {
    levelup: function (d) { queue.push({ type: "levelup", level: d.level, title: d.title, newTitle: d.newTitle, reward: d.reward }); if (screen !== "case") flushQueue(); },
    achievement: function (a) { queue.push({ type: "achievement", a: a }); if (screen !== "case") flushQueue(); },
    mission: function (m) { queue.push({ type: "mission", m: m }); }
  };

  /* ---------- Career: Book 1 (js/book.js) gets the helpers it shares with the rest of the game ---------- */
  function bookHintMode() {
    if ((S.inv.magnifier || 0) > 0) return "item";
    if (canRewarded() && P.coolLeft("hintAd", 90) === 0) return "ad";
    return "none";
  }
  function bookUseHint(mode, give) {
    if (mode === "item") { if (P.useItem("magnifier")) { give(); persist(); } return; }
    P.coolStart("hintAd"); persist();
    Plat.rewarded("hint").then(function (ok) { if (ok) { toast("Hint unlocked"); give(); } else adFailed(); });
  }
  // A Daily 5 chapter in a v2 story (js/chapter.js). Without it (an old cached page) v2 days fall back to nothing new.
  var Chapter = window.WLChapter || { open: function () {}, close: function () {}, reveal: function () {}, hunch: function () {}, key: function () { return false; }, unlock: function () {}, found: function () { return []; }, heard: function () { return []; }, mount: function () {} };
  Chapter.mount({
    persist: function () { chSave(); }, toast: toast, Snd: Snd,
    submit: function (pick) { if (run && run.c && run.c.fmt === 2 && !run.revealed) d5Submit(pick); }
  });
  Book.mount({
    S: function () { return S; }, persist: persist, flush: cloudFlush, show: show, setHud: setHud, goHQ: goHQ, openMap: openMap,
    toast: toast, rw: rw, P: P, Snd: Snd, FX: FX, Plat: Plat, midgame: midgame, renderCoins: renderCoins, flushQueue: flushQueue,
    hintMode: bookHintMode, useHint: bookUseHint, openDialog: openDialog, closeDialog: closeDialog
  });

  /* ---------- start-up ---------- */
  function loadState(data) {
    S = data || {};
    S.stats = Object.assign({ played: 0, streak: 0, maxStreak: 0, lastDay: 0, perfect: 0, dist: [0, 0, 0, 0, 0, 0] }, S.stats || {});
    S.history = S.history || {};
    S.endless = Object.assign({ best: 0, runs: 0 }, S.endless || {});
    // music starts off on phones (people play in public, and it saves data); they can switch it on in Settings
    S.settings = Object.assign({ sound: true, music: !coarse, tutorialDone: false, playerName: "" }, S.settings || {});
    S.lb = Object.assign({ posted: {}, claimed: {}, badges: [], ranks: {} }, S.lb || {});
    delete S.arc; delete S.night; // the Case of the Week and the Night Shift are gone
    S.ladder = Object.assign({ season: 0, lp: 0, tier: 0, days: 0, rate: 0, failRate: 0, rank: 0, total: 0, at: 0, paid: {} }, S.ladder || {});
    delete S.league; // the old weekly league
    // Friends list state. (S.friends is the store of friends' written cases you played: a different thing.)
    S.pals = Object.assign({ code: "", asked: {}, asks: 0 }, S.pals || {});
    delete S.groups; delete S.groupSel; // Friend groups are retired
    S.pwa = S.pwa || {};
    S.sync = Object.assign({ code: "", dirty: false, stamp: 0 }, S.sync || {});
    if (S.challenge && S.challenge.day < TODAY - 7) S.challenge = null;
    P.init(S, hooks);
    // The day this player started (players from before this existed count as day 1, so nothing is locked for them).
    if (!S.firstDay) S.firstDay = S.tot.solved > 0 || S.stats.played > 0 ? 1 : TODAY;
    // Old saves (before career mode) skip the tutorial.
    if ((S.stats.played > 0 || S.endless.runs > 0) && !S.settings.tutorialDone) S.settings.tutorialDone = true;
    applyTheme();
    Snd.init({ sound: S.settings.sound, music: S.settings.music });
    shownCoins = S.coins;
    renderCoins(false); // a link can open straight into a case, before HQ ever draws the wallet
  }
  function route() {
    var rc = cloudOn() && LB.provider === "firebase" ? LB.cleanSaveCode(Plat.inviteParam("restore")) : "";
    if (rc && rc !== S.sync.code) { goHQ(); toast("Looking for your saved progress..."); cloudPull(rc); return; }
    var rm = lbOn() ? LB.cleanCode(Plat.inviteParam("room")) : ""; // a live room link
    if (rm) { goHQ(); withName(function (name) { joinRoom(rm, name); }, "room"); return; }
    var wc = Plat.inviteParam("w"); // a case a friend wrote
    if (wc) {
      goHQ();
      WL.unpackWritten(wc).then(function (w) {
        if (!w) toast("That case link doesn't work. Ask your friend to send it again.", "", 4000);
        else if (!w.k) openFriend(w, wc);
        // a story: keep the link in the address bar while it plays, so a reload picks the investigation up again
        else if (openStory(wc, w)) { try { history.replaceState(null, "", location.pathname + (location.search ? location.search + "&" : "?") + "w=" + wc); } catch (e) { /* ignore */ } }
      });
      return;
    }
    var ch = parseChallenge(Plat.inviteParam("c"));
    if (ch) { handleChallenge(ch); goHQ(); return; }
    var fc = lbOn() ? LB.friends.clean(Plat.inviteParam("f")) : "";
    if (fc) { goHQ(); openFriends(fc); return; }
    if (lbOn() && Plat.inviteParam("g")) { // an old Friend group link
      goHQ();
      notice({ icon: "🤝", title: "Friend groups are now Friends", text: "Ask your friend for their friend code and add them in Friends. You can have up to 8.", yes: "Open Friends", no: "Later", onYes: function () { openFriends(); } });
      return;
    }
    var invDay = parseInt(Plat.inviteParam("day"), 10), invMode = Plat.inviteParam("mode");
    if (invDay >= 1 && invDay <= TODAY) { startDaily(invDay); return; }
    if (invMode === "rush") { startRush(); return; }
    var m = location.hash.match(/^#day-(\d+)$/) || location.search.match(/[?&]day=(\d+)/);
    if (m) { var d = parseInt(m[1], 10); if (d >= 1 && d < TODAY) { startDaily(d); return; } }
    if (location.hash === "#endless") { startRush(); return; }
    if (D5 && D5.mode === "local") { startDaily(TODAY); return; } // a preview from the Daily 5 admin desk
    // New players go straight into their first case.
    if (!S.settings.tutorialDone && S.tot.solved === 0) { startTraining(); return; }
    goHQ();
  }
  // A brand-new visitor has nothing to load. Firebase keeps its sign-in in this IndexedDB database, so when
  // it's missing (and there's no save on the device) nobody has played in this browser yet.
  function newVisitor() {
    if (!lbOn() || LB.provider !== "firebase" || CFG.movedTo || /[?&]restore=/.test(bootSearch) || Object.keys(Plat.load()).length) return Promise.resolve(false);
    if (!window.indexedDB || !indexedDB.databases) return Promise.resolve(false); // can't tell: load as before
    return indexedDB.databases().then(function (l) { return !l.some(function (d) { return d.name === "firebaseLocalStorageDb"; }); }, function () { return false; });
  }
  // The background load for a new visitor finished: their account is ready, so their game starts saving to it.
  function cloudReady(found) {
    cloud.busy = false;
    if (cloud.rev > 0 && (found.xp || 0) >= (S.xp || 0)) { // this browser had a game after all, and it got further
      hideCoach(); stopClock(); run = null;
      loadState(found); goHQ(); toast("Welcome back! Your progress is loaded.", "gold", 3600);
      return;
    }
    if (started()) { S.sync.dirty = true; cloudFlush(); }
  }
  function boot() {
    if (Plat.isCrazy()) document.documentElement.classList.add("cg");
    var fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]) : Promise.resolve();
    var later = null; // a new visitor's save load, running in the background
    Plat.init().then(function () {
      Plat.loadingStart(); // the SDK only accepts calls once init has finished
      return newVisitor();
    }).then(function (fresh) {
      if (fresh) {
        cloud.busy = true; // nothing reaches the account until the background load has decided
        later = loadSave().then(null, function (e) { console.warn("[save] playing on this device for now", e); return null; });
        return Plat.load();
      }
      return loadSave().catch(function (e) { bootFailed(e); throw "offline"; });
    }).then(function (data) {
      loadState(data);
      if (cloud.migrate) S.sync.code = ""; // old save codes are retired once the save is in the account
      Snd.setForced(Plat.muteForced());
      Plat.on("mute", function (m) { Snd.setForced(m); syncSettings(); });
      Plat.on("adStart", function () { paused.ad = true; Snd.adPause(); });
      Plat.on("adEnd", function () { paused.ad = false; clock.last = performance.now(); Snd.adResume(); });
      Plat.on("auth", function () {
        loadState(Plat.load());
        Plat.getUser().then(function (u) { user = u; if (screen === "hq") renderHQ(); });
      });
      if (Plat.isCrazy()) Plat.hasAdblock().then(function (b) { adblocked = b; });
      return Promise.all([Plat.getUser().then(function (u) { user = u; }), fontsReady]);
    }).then(function () {
      if (moveAway()) return;
      Plat.loadingStop();
      document.body.classList.remove("booting");
      startupChecks();
      d5Preview();
      route();
      d5Load(TODAY).then(function () { if (screen === "hq") renderToday(); }); // is there a story today?
      var note = S.sync.note || "";
      delete S.sync.note;
      try { note = sessionStorage.getItem("wl-note") || note; sessionStorage.removeItem("wl-note"); } catch (e) { /* ignore */ }
      if (note) setTimeout(function () { toast(esc(note), "gold", 3800); }, 700);
      if (cloud.migrate && started()) { S.sync.dirty = true; cloudFlush(); } // this device's old save moves into the account now
      if (lbOn()) {
        setTimeout(checkRewards, 1500);
        if (S.settings.playerName) { refreshLadder(true); ladderSeasonEnd(); friendsBoot(); }
      }
      persist();
      if (later) later.then(function (d) { if (d) cloudReady(d); else cloud.busy = false; }); // offline: keeps saving on this device
    }).catch(function (e) {
      if (e === "offline") return;
      console.error(e);
      document.body.classList.remove("booting");
    });
  }
  // Admin desk preview (?d5=local&fresh=1): start the draft from Case 1 in this preview save.
  function d5Preview() {
    if (!D5 || D5.mode !== "local" || !/[?&]fresh=1/.test(location.search)) return;
    if (S.daily && S.daily.day === TODAY) S.daily = null;
    delete S.history[TODAY]; if (S.d5) delete S.d5[TODAY]; delete S.lb.posted[TODAY];
    if (S.stats.lastDay === TODAY) S.stats.lastDay = TODAY - 1;
    try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]fresh=1/, "").replace(/^&/, "?")); } catch (e) { /* ignore */ }
  }
  // No connection at start-up: the save is online, so say so and try again when the connection is back.
  function bootFailed(e) {
    console.warn("[save] couldn't load progress", e);
    var b = $("boot");
    b.innerHTML = '<img class="boot-ico" src="assets/icon-192.png" alt="" width="192" height="192"><span class="boot-title">Liar<span class="q">Hunt</span></span>' +
      '<p class="boot-note">Can\'t connect. Your progress is saved online, so the game needs the internet to start.</p>' +
      '<button class="btn primary" type="button" id="boot-retry">Try again</button>';
    b.removeAttribute("aria-hidden"); b.setAttribute("role", "alert");
    $("boot-retry").addEventListener("click", function () { location.reload(); });
    window.addEventListener("online", function () { location.reload(); }, { once: true });
  }
  // Test hook for automated checks (only with ?test=1 in the address).
  if (/[?&]test=1/.test(location.search)) window.__WLtest = {
    run: function () { return run; }, room: function () { return room; }, state: function () { return S; }, persist: persist,
    hq: goHQ, train: startTraining, book: Book, rush: startRush, daily: startDaily,
    cloud: function () { return cloud; }, push: function () { S.sync.dirty = true; return cloudPush(); },
    d5: function () { return { editions: d5Edition, store: S.d5, run: run && run.d5 ? run.d5.r : null }; }, notebook: openNotebook
  };
  boot();
})();
