/*
  LIARHUNT — Career: Book 1, The Black Ledger
  The story lives in js/book1.js; this file plays it on the mission screen (#scr-book).
  A mission is a briefing and 1 to 4 steps. Each step is one of:
    search    tap things in a place to look closer, mark the ones that matter
    talk      ask questions, then catch a statement with a piece of evidence
    timeline  tap events into the order they happened
    compare   find the changed (or impossible) lines in one to three documents
    link      match every item on the left to one on the right
    accuse    name the culprit, prove it with evidence, pick the motive
    think     pick the conclusion the evidence supports
  Steps add evidence to the dossier, which carries across the whole book.
  Stars: 3, minus one per mistake, minus one if a Magnifier helped (at least 1). A third mistake makes the case fall
  apart: the player retries that step and the mission can earn 1 star. Replays keep the first run's stars.
  game.js calls mount() with the helpers it shares (save, screens, sounds, rewards, hints).
  It also plays a player's own investigation (startStory, from "Write a case"): one chapter of 3 to 6 missions that
  js/storycheck.js already passed. Those give no rewards and no hints, and their progress is kept per story (the last 5).
*/
(function () {
  "use strict";
  var WL = window.WL, BOOK1 = window.WL_BOOK1, B = BOOK1;
  if (!B) return;
  var PER = 6, N = 0, MAX_MISTAKES = 3, foundIn = {};
  // mine: null for Book 1, or { key, by, share(stars, of) } while a player's investigation is open
  var mine = null;
  function use(book, o) {
    B = book; mine = o || null; N = B.missions.length; foundIn = {};
    B.missions.forEach(function (m, i) {
      var mark = function (id) { foundIn[id] = foundIn[id] || i + 1; };
      (m.gives || []).forEach(mark);
      m.steps.forEach(function (k) { stepGains(k).forEach(mark); });
    });
  }
  // What HQ and the Book map show is always Book 1, whatever was played last.
  function b1(fn) { return function () { var keep = B, o = mine; if (B !== BOOK1) use(BOOK1); try { return fn.apply(null, arguments); } finally { if (keep !== BOOK1) use(keep, o); } }; }
  function track(e, p) { if (!mine) WL.track(e, p); }
  var KIND = { search: ["🔍", "Search"], talk: ["💬", "Interview"], timeline: ["🕒", "Timeline"], compare: ["📄", "Documents"],
    link: ["🔗", "Connections"], accuse: ["⚖️", "Accusation"], think: ["💡", "Deduction"] };
  var TIP = {
    search: "Tap anything to look closer. Mark the things that matter, then check them.",
    talk: "Ask questions. When a statement doesn't fit the evidence, tap the statement, tap the evidence, then present it.",
    timeline: "Tap the events in the order they happened. Tap a placed event to take it back. Missing times are in your dossier.",
    compare: "Read the documents line by line and tap the lines the question asks for.",
    link: "Tap an item on the left, then its match on the right. Tap a left item again to change it.",
    accuse: "Name the person, prove it with evidence, then pick the motive.",
    think: "Pick the answer the evidence supports."
  };
  var CRACKED = ["Mission solved.", "Case cracked.", "Nailed it.", "Good work, detective."];
  var api = null, R = null;
  function $(id) { return document.getElementById(id); }
  var esc = WL.esc;

  /* ---------- progress ---------- */
  function st() {
    var s = api.S(), b;
    if (mine) {
      var runs = s.storyRuns = s.storyRuns || {};
      if (!runs[mine.key]) { runs[mine.key] = {}; var ks = Object.keys(runs); while (ks.length > 5) delete runs[ks.shift()]; } // the last 5 stories
      b = runs[mine.key];
    } else {
      s.book = s.book || {};
      b = s.book[B.id] = s.book[B.id] || {};
    }
    b.at = b.at || 1; b.stars = b.stars || {}; b.seen = b.seen || {};
    return b;
  }
  function mission(n) { return B.missions[n - 1]; }
  function chapterOf(n) { return Math.ceil(n / PER); }
  function finished() { return !!api && st().at > N; }
  function current() { return Math.min(st().at, N); }
  function stepGains(k) { var out = (k.gives || []).slice(); (k.breaks || []).forEach(function (b) { out = out.concat(b.gives || []); }); return out; }
  // The evidence a player holds when step k of mission n starts (k = 0: right after the briefing).
  function evidenceAt(n, k) {
    var out = [];
    var add = function (ids) { ids.forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); }); };
    for (var i = 1; i < n && i <= N; i++) { add(mission(i).gives || []); mission(i).steps.forEach(function (s) { add(stepGains(s)); }); }
    if (n <= N) { add(mission(n).gives || []); mission(n).steps.slice(0, k).forEach(function (s) { add(stepGains(s)); }); }
    return out;
  }
  use(BOOK1);
  function shuffled(list, seed) { return WL.shuffle(list, WL.rngFrom("book1:" + seed)); }
  function hashOf(m) { return WL.hash(JSON.stringify(m)); }
  // Missions completed in the story so far (on a replay: the ones before it), for notes and the Broker board.
  function storyDone() { return R && R.replay && R.phase !== "end" ? R.n - 1 : st().at - 1; }

  /* ---------- small pieces of HTML ---------- */
  function mug(id, cls) {
    var p = B.people[id];
    return '<span class="mug ' + (cls || "") + '">' + (p.org ? '<span class="bk-org" aria-hidden="true">' + esc(p.org) + "</span>" : WL.avatar(p.name)) + "</span>";
  }
  function evChip(id, attrs) {
    var e = B.evidence[id];
    return '<span class="bk-chip"' + (attrs || "") + '><span aria-hidden="true">' + esc(e[0]) + "</span>" + esc(e[1]) + "</span>";
  }
  function evCard(id, extra, tag) {
    var e = B.evidence[id], t = tag || "div";
    return "<" + t + ' class="bk-evcard ' + (extra || "") + '"' + (t === "button" ? ' type="button" data-a="pe" data-i="' + id + '"' : "") + '><span class="bk-evico" aria-hidden="true">' + esc(e[0]) +
      '</span><span class="bk-evtxt"><b>' + esc(e[1]) + "</b><span>" + esc(e[2]) + "</span></span></" + t + ">";
  }
  function paras(text) { return String(text || "").split("\n\n").map(function (p) { return "<p>" + esc(p) + "</p>"; }).join(""); }
  function starRow(n, cls) { var h = '<span class="stars ' + (cls || "") + '">'; for (var i = 0; i < 3; i++) h += '<span class="st' + (i < n ? " on" : "") + '"></span>'; return h + "</span>"; }
  function pressed(on) { return ' aria-pressed="' + (on ? "true" : "false") + '"'; }

  /* ---------- the seven kinds of step ----------
     init(k, seed) -> state; html(k, s) -> markup; act(k, s, a, id); ready(k, s) -> { ok, label, note };
     check(k, s) -> { ok: true } solved, { more: true } next phase, or { ok: false, msg } a mistake;
     hint(k, s) -> true if it ruled something out (only called when canHint says there's something left). */
  var T = {};

  T.search = {
    init: function (k, seed) { return { order: shuffled(k.items.map(function (_, i) { return i; }), seed), open: null, marked: [], out: {}, ok: {} }; },
    need: function (k) { return k.items.filter(function (i) { return i[4]; }).length; },
    html: function (k, s) {
      return '<div class="bk-grid">' + s.order.map(function (ix) {
        var it = k.items[ix], id = it[0], open = s.open === id, marked = s.marked.indexOf(id) >= 0, out = s.out[id], ok = s.ok[id];
        var cls = "bk-item" + (open ? " open" : "") + (marked ? " marked" : "") + (out ? " out" : "") + (ok ? " ok" : "");
        return '<div class="' + cls + '"><button type="button" class="bk-face" data-a="open" data-i="' + id + '" aria-expanded="' + open + '">' +
          '<span class="bk-ico" aria-hidden="true">' + esc(it[1]) + '</span><span class="bk-nm">' + esc(it[2]) + "</span>" +
          (marked || ok ? '<span class="bk-pin">' + (ok ? "Clue" : "Marked") + "</span>" : out ? '<span class="bk-pin no">Not a clue</span>' : "") + "</button>" +
          (open ? '<p class="bk-look">' + esc(it[3]) + "</p>" + (out || ok ? "" : '<button type="button" class="btn small ' + (marked ? "ghost" : "danger") + '" data-a="mark" data-i="' + id + '">' + (marked ? "Unmark" : "Mark as a clue") + "</button>") : "") +
          "</div>";
      }).join("") + "</div>";
    },
    act: function (k, s, a, id) {
      if (a === "open") { s.open = s.open === id ? null : id; return; }
      if (a !== "mark" || s.out[id] || s.ok[id]) return;
      var i = s.marked.indexOf(id), need = this.need(k);
      if (i >= 0) s.marked.splice(i, 1);
      else if (s.marked.length >= need) { api.toast("You've marked " + need + " already. Unmark one first."); return; }
      else { s.marked.push(id); s.open = null; }
      api.Snd.play("tap");
    },
    ready: function (k, s) { var need = this.need(k); return { ok: s.marked.length === need, label: "Check my clues", note: s.marked.length + " of " + need + " marked" }; },
    check: function (k, s) {
      var key = function (id) { return k.items.some(function (it) { return it[0] === id && it[4]; }); };
      var wrong = s.marked.filter(function (id) { return !key(id); });
      if (!wrong.length) { s.marked.forEach(function (id) { s.ok[id] = 1; }); return { ok: true }; }
      wrong.forEach(function (id) { s.out[id] = 1; });
      s.marked = s.marked.filter(key);
      s.marked.forEach(function (id) { s.ok[id] = 1; });
      return { ok: false, msg: (wrong.length === 1 ? "One of those isn't" : wrong.length + " of those aren't") + " a clue. Crossed out." };
    },
    canHint: function (k, s) { return k.items.some(function (it) { return !it[4] && !s.out[it[0]]; }); },
    hint: function (k, s, r) {
      var c = k.items.filter(function (it) { return !it[4] && !s.out[it[0]]; });
      var it = c[Math.floor(r() * c.length)];
      s.out[it[0]] = 1; s.marked = s.marked.filter(function (id) { return id !== it[0]; });
    }
  };

  T.talk = {
    init: function (k, seed) { return { asked: [], log: [], broke: {}, said: {}, selS: null, selE: null, hintS: null, hintQ: null, pool: shuffled(k.pool, seed), fresh: 0 }; },
    open: function (k, s) {
      return k.qs.filter(function (q) { return s.asked.indexOf(q.id) < 0 && (!q.after || s.asked.indexOf(q.after) >= 0 || s.broke[q.after]); });
    },
    html: function (k, s) {
      var p = B.people[k.who], qs = this.open(k, s), stmt = {};
      k.qs.forEach(function (q) { q.a.forEach(function (x) { stmt[x[0]] = x[1]; }); });
      var bySay = {};
      k.breaks.forEach(function (b) { if (s.broke[b.id]) b.s.forEach(function (x) { bySay[x] = 1; }); });
      var log = '<p class="ln them">' + esc(k.intro) + "</p>" + s.log.map(function (e, i) {
        var nw = i >= s.fresh ? " new" : "";
        if (e.t === "q") {
          var q = k.qs.filter(function (x) { return x.id === e.q; })[0];
          return '<p class="ln you' + nw + '">' + esc(q.q) + "</p>" + q.a.map(function (x) {
            var on = s.selS === x[0];
            return '<button type="button" class="ln them say' + nw + (on ? " sel" : "") + (bySay[x[0]] ? " broken" : "") + (s.hintS === x[0] ? " hint" : "") + '" data-a="say" data-i="' + x[0] + '"' + pressed(on) + ">" + esc(x[1]) + "</button>";
          }).join("");
        }
        var b = e.b && k.breaks.filter(function (x) { return x.id === e.b; })[0];
        return '<p class="ln you show' + nw + '">You show: ' + evChip(e.e) + "</p>" + '<p class="ln them ' + (b ? "react" : "meh") + nw + '">' + esc(b ? b.react : k.wrong) + "</p>";
      }).join("");
      var sel = s.selE ? B.evidence[s.selE] : null;
      return '<div class="bk-talk"><div class="bk-who">' + mug(k.who) + '<span><b>' + esc(p.name) + "</b><span>" + esc(p.role) + "</span></span></div>" +
        '<div class="bk-log" id="bk-log">' + log + "</div>" +
        '<div class="bk-box"><p class="bk-lbl">Ask</p><div class="bk-qs">' + (qs.length ? qs.map(function (q) {
          return '<button type="button" class="chip-btn bk-q' + (s.hintQ === q.id ? " hint" : "") + '" data-a="ask" data-i="' + q.id + '">' + esc(q.q) + "</button>";
        }).join("") : '<span class="muted small">No more questions. Break the story with your evidence.</span>') + "</div></div>" +
        '<div class="bk-box"><p class="bk-lbl">Your evidence</p><div class="bk-tray">' + s.pool.map(function (id) {
          return '<button type="button" class="bk-chip pick' + (s.selE === id ? " sel" : "") + '" data-a="ev" data-i="' + id + '"' + pressed(s.selE === id) + '><span aria-hidden="true">' + esc(B.evidence[id][0]) + "</span>" + esc(B.evidence[id][1]) + "</button>";
        }).join("") + "</div>" + (sel ? '<p class="bk-evtext">' + esc(sel[2]) + "</p>" : "") + "</div></div>";
    },
    act: function (k, s, a, id) {
      if (a === "ask") {
        if (s.asked.indexOf(id) >= 0) return;
        s.asked.push(id); s.log.push({ t: "q", q: id }); s.hintQ = null;
        api.Snd.play("tap"); return "scroll";
      }
      if (a === "say") { s.selS = s.selS === id ? null : id; api.Snd.play("tap"); return; }
      if (a === "ev") { s.selE = s.selE === id ? null : id; api.Snd.play("tap"); }
    },
    ready: function (k, s) {
      var left = k.breaks.filter(function (b) { return !s.broke[b.id]; }).length;
      return { ok: !!(s.selS && s.selE), label: "Present it",
        note: s.selS && s.selE ? "Present this evidence against that statement?" : s.selS ? "Now tap the evidence that breaks it." : s.selE ? "Now tap the statement it breaks." :
          left + " lie" + (left > 1 ? "s" : "") + " to catch" };
    },
    check: function (k, s) {
      var b = k.breaks.filter(function (x) { return !s.broke[x.id] && x.s.indexOf(s.selS) >= 0 && x.ev.indexOf(s.selE) >= 0; })[0];
      s.fresh = s.log.length;
      if (!b) { s.log.push({ t: "x", e: s.selE }); s.selS = s.selE = null; return { ok: false, msg: "That evidence doesn't break that statement.", scroll: true }; }
      s.broke[b.id] = 1; s.log.push({ t: "b", b: b.id, e: s.selE }); s.selS = s.selE = s.hintS = null;
      gain(b.gives || []);
      return k.breaks.every(function (x) { return s.broke[x.id]; }) ? { ok: true, scroll: true } : { more: true, scroll: true };
    },
    canHint: function (k, s) { return !!this.target(k, s); },
    target: function (k, s) {
      var b = k.breaks.filter(function (x) { return !s.broke[x.id]; })[0];
      if (!b) return null;
      var heard = {};
      s.asked.forEach(function (qid) { k.qs.forEach(function (q) { if (q.id === qid) q.a.forEach(function (x) { heard[x[0]] = 1; }); }); });
      var say = b.s.filter(function (x) { return heard[x]; })[0];
      if (say) return { s: say };
      var q = this.open(k, s).filter(function (q) { return q.a.some(function (x) { return b.s.indexOf(x[0]) >= 0; }); })[0];
      return q ? { q: q.id } : null;
    },
    hint: function (k, s) {
      var t = this.target(k, s);
      if (t.s) { s.hintS = t.s; s.selS = t.s; } else s.hintQ = t.q;
    }
  };

  T.timeline = {
    init: function (k, seed) {
      var ids = k.events.map(function (e) { return e[0]; }), order = shuffled(ids, seed);
      if (order.join() === ids.join()) order.push(order.shift()); // never already in order
      return { order: order, placed: [], locked: 0 };
    },
    ev: function (k, id) { return k.events.filter(function (e) { return e[0] === id; })[0]; },
    card: function (k, id, a, cls) {
      var e = this.ev(k, id);
      return '<button type="button" class="bk-ev ' + (cls || "") + '" data-a="' + a + '" data-i="' + id + '"><span>' + esc(e[1]) + "</span>" + (e[2] ? '<span class="bk-when">' + esc(e[2]) + "</span>" : "") + "</button>";
    },
    html: function (k, s) {
      var self = this, html = '<ol class="bk-line">';
      for (var i = 0; i < k.events.length; i++) {
        var id = s.placed[i], lock = i < s.locked;
        html += '<li class="' + (id ? "filled" : "") + (lock ? " locked" : "") + '"><span class="bk-n">' + (i + 1) + "</span>" +
          (id ? (lock ? '<div class="bk-ev locked"><span>' + esc(self.ev(k, id)[1]) + "</span>" + (self.ev(k, id)[2] ? '<span class="bk-when">' + esc(self.ev(k, id)[2]) + "</span>" : "") + "</div>" : self.card(k, id, "take", "placed"))
            : '<span class="bk-empty">' + (i === s.placed.length ? "Tap the next event below" : "") + "</span>") + "</li>";
      }
      var left = s.order.filter(function (id) { return s.placed.indexOf(id) < 0; });
      return html + "</ol>" + (left.length ? '<div class="bk-pile"><p class="bk-lbl">Events</p>' + left.map(function (id) { return self.card(k, id, "put"); }).join("") + "</div>" : "");
    },
    act: function (k, s, a, id) {
      if (a === "put" && s.placed.indexOf(id) < 0) { s.placed.push(id); api.Snd.play("tap"); }
      if (a === "take") { var i = s.placed.indexOf(id); if (i >= s.locked) { s.placed.splice(i, 1); api.Snd.play("tap"); } }
    },
    ready: function (k, s) { return { ok: s.placed.length === k.events.length, label: "Check the order", note: s.placed.length + " of " + k.events.length + " placed" }; },
    check: function (k, s) {
      var right = k.events.map(function (e) { return e[0]; }), p = 0;
      while (p < right.length && s.placed[p] === right[p]) p++;
      if (p === right.length) { s.locked = p; return { ok: true }; }
      s.locked = p; s.placed = s.placed.slice(0, p);
      return { ok: false, msg: p ? "The first " + (p === 1 ? "event is" : p + " are") + " right. The rest go back." : "The first event is wrong, so everything goes back." };
    },
    canHint: function (k, s) { return s.locked < k.events.length - 1; },
    hint: function (k, s) {
      var right = k.events.map(function (e) { return e[0]; }), p = 0;
      while (p < s.placed.length && s.placed[p] === right[p]) p++;
      s.placed = right.slice(0, p + 1); s.locked = p + 1;
    }
  };

  T.compare = {
    init: function () { return { sel: [], out: {}, ok: {} }; },
    html: function (k, s) {
      return '<div class="bk-docs n' + k.docs.length + '">' + k.docs.map(function (d) {
        return '<div class="bk-doc"><p class="bk-doc-h">' + esc(d.title) + '</p><div class="bk-rows">' + d.rows.map(function (r) {
          var on = s.sel.indexOf(r[0]) >= 0;
          return '<button type="button" class="bk-row' + (on ? " sel" : "") + (s.out[r[0]] ? " out" : "") + (s.ok[r[0]] ? " ok" : "") + '" data-a="row" data-i="' + r[0] + '"' + pressed(on) +
            (s.out[r[0]] || s.ok[r[0]] ? " disabled" : "") + '><span class="k">' + esc(r[1]) + '</span><span class="v">' + esc(r[2]) + "</span></button>";
        }).join("") + "</div></div>";
      }).join("") + "</div>";
    },
    act: function (k, s, a, id) {
      if (a !== "row" || s.out[id] || s.ok[id]) return;
      var i = s.sel.indexOf(id);
      if (i >= 0) s.sel.splice(i, 1);
      else { s.sel.push(id); var free = s.sel.filter(function (x) { return !s.ok[x]; }); if (s.sel.length > k.answer.length) s.sel.splice(s.sel.indexOf(free[0]), 1); }
      api.Snd.play("tap");
    },
    ready: function (k, s) { var n = k.answer.length; return { ok: s.sel.length === n, label: "Check", note: n > 1 ? s.sel.length + " of " + n + " picked" : s.sel.length ? "Is this the line?" : "Tap a line" }; },
    check: function (k, s) {
      var wrong = s.sel.filter(function (id) { return k.answer.indexOf(id) < 0; });
      s.sel.forEach(function (id) { if (k.answer.indexOf(id) >= 0) s.ok[id] = 1; });
      if (!wrong.length) return { ok: true };
      wrong.forEach(function (id) { s.out[id] = 1; });
      s.sel = s.sel.filter(function (id) { return k.answer.indexOf(id) >= 0; });
      return { ok: false, msg: wrong.length === s.sel.length + wrong.length && wrong.length === 1 ? "That line isn't it." : "Not quite. The wrong line" + (wrong.length > 1 ? "s are" : " is") + " crossed out." };
    },
    canHint: function (k, s) { return this.free(k, s).length > 0; },
    free: function (k, s) {
      var ids = [];
      k.docs.forEach(function (d) { d.rows.forEach(function (r) { if (k.answer.indexOf(r[0]) < 0 && !s.out[r[0]] && ids.indexOf(r[0]) < 0) ids.push(r[0]); }); });
      return ids;
    },
    hint: function (k, s, r) {
      var c = this.free(k, s), id = c[Math.floor(r() * c.length)];
      s.out[id] = 1; s.sel = s.sel.filter(function (x) { return x !== id; });
    }
  };

  T.link = {
    init: function (k, seed) { return { pairs: {}, cur: k.left[0][0], ok: {}, right: shuffled(k.right, seed) }; },
    letter: function (s, rid) { for (var i = 0; i < s.right.length; i++) if (s.right[i][0] === rid) return String.fromCharCode(65 + i); return "?"; },
    html: function (k, s) {
      var self = this;
      var left = k.left.map(function (l, i) {
        var to = s.pairs[l[0]], on = s.cur === l[0];
        return '<button type="button" class="bk-card left' + (on ? " cur" : "") + (to ? " linked" : "") + (s.ok[l[0]] ? " ok" : "") + '" data-a="l" data-i="' + l[0] + '"' + pressed(on) + (s.ok[l[0]] ? " disabled" : "") + '>' +
          '<span class="bk-tag">' + (i + 1) + '</span><span class="bk-cl"><b>' + esc(l[1]) + "</b>" + (to ? '<span class="bk-to">→ ' + self.letter(s, to) + " · " + esc(s.right.filter(function (r) { return r[0] === to; })[0][1]) + "</span>" : "") + "</span></button>";
      }).join("");
      var right = s.right.map(function (r, i) {
        var by = k.left.map(function (l, j) { return s.pairs[l[0]] === r[0] ? j + 1 : 0; }).filter(Boolean);
        return '<button type="button" class="bk-card right' + (by.length ? " linked" : "") + '" data-a="r" data-i="' + r[0] + '"><span class="bk-tag">' + String.fromCharCode(65 + i) + '</span><span class="bk-cl"><b>' + esc(r[1]) + "</b>" +
          (r[2] ? "<span>" + esc(r[2]) + "</span>" : "") + "</span>" + (by.length ? '<span class="bk-by">' + by.join(" ") + "</span>" : "") + "</button>";
      }).join("");
      return '<div class="bk-link"><div class="bk-col">' + left + '</div><div class="bk-col"><p class="bk-lbl">' + (s.cur ? "Match for " + (k.left.map(function (l) { return l[0]; }).indexOf(s.cur) + 1) : "Pick an item on the left") + "</p>" + right + "</div></div>";
    },
    act: function (k, s, a, id) {
      if (a === "l") { if (!s.ok[id]) { s.cur = id; api.Snd.play("tap"); } return; }
      if (a !== "r") return;
      if (!s.cur) { api.toast("Tap an item on the left first."); return; }
      s.pairs[s.cur] = id; api.Snd.play("tap");
      var next = k.left.filter(function (l) { return !s.pairs[l[0]]; })[0];
      s.cur = next ? next[0] : null;
    },
    ready: function (k, s) { var n = k.left.filter(function (l) { return s.pairs[l[0]]; }).length; return { ok: n === k.left.length, label: "Check the links", note: n + " of " + k.left.length + " linked" }; },
    check: function (k, s) {
      var wrong = k.left.filter(function (l) { return s.pairs[l[0]] !== k.pairs[l[0]]; });
      k.left.forEach(function (l) { if (s.pairs[l[0]] === k.pairs[l[0]]) s.ok[l[0]] = 1; });
      if (!wrong.length) return { ok: true };
      wrong.forEach(function (l) { delete s.pairs[l[0]]; });
      s.cur = wrong[0][0];
      return { ok: false, msg: (wrong.length === 1 ? "One link is" : wrong.length + " links are") + " wrong. The right ones are locked in." };
    },
    canHint: function (k, s) { return k.left.some(function (l) { return !s.ok[l[0]]; }); },
    hint: function (k, s) {
      var l = k.left.filter(function (x) { return !s.ok[x[0]]; })[0];
      s.pairs[l[0]] = k.pairs[l[0]]; s.ok[l[0]] = 1;
      var next = k.left.filter(function (x) { return !s.pairs[x[0]]; })[0];
      s.cur = next ? next[0] : null;
    }
  };

  T.accuse = {
    init: function (k, seed) {
      return { ph: "who", pick: null, out: {}, sel: [], evOut: {}, mot: null, motOut: {}, who: shuffled(k.who, seed + ":w"), pool: shuffled(k.pool, seed + ":p"),
        mots: k.motive ? shuffled(k.motive.options.map(function (_, i) { return i; }), seed + ":m") : [] };
    },
    html: function (k, s) {
      var p = B.people[k.answer];
      if (s.ph === "who") {
        return '<div class="suspects bk-sus">' + s.who.map(function (id) {
          var x = B.people[id], on = s.pick === id;
          return '<button type="button" class="suspect' + (on ? " is-picked" : "") + (s.out[id] ? " is-wrong" : "") + '" data-a="who" data-i="' + id + '"' + pressed(on) + (s.out[id] ? " disabled" : "") + ">" + mug(id) +
            '<span class="who"><span class="who-top"><span class="who-name">' + esc(x.name) + '</span><span class="who-role">' + esc(x.role) + "</span></span>" +
            ((k.notes || {})[id] ? '<span class="says plain">' + esc(k.notes[id]) + "</span>" : "") + "</span>" + (s.out[id] ? '<span class="stamp cleared">Cleared</span>' : "") + "</button>";
        }).join("") + "</div>";
      }
      var accused = '<div class="bk-accused">' + mug(k.answer) + '<span><b>' + esc(p.name) + "</b><span>" + esc(p.role) + '</span></span><span class="stamp">Accused</span></div>';
      if (s.ph === "proof") {
        return accused + '<p class="bk-ask2">' + esc(k.proofAsk) + "</p>" + '<div class="bk-evlist">' + s.pool.map(function (id) {
          var on = s.sel.indexOf(id) >= 0;
          return evCard(id, (on ? "sel" : "") + (s.evOut[id] ? " out" : ""), "button").replace("<button ", "<button" + pressed(on) + (s.evOut[id] ? " disabled" : "") + " ");
        }).join("") + "</div>";
      }
      return accused + '<p class="bk-ask2">' + esc(k.motive.ask) + '</p><div class="bk-opts">' + s.mots.map(function (i) {
        var on = s.mot === i;
        return '<button type="button" class="bk-opt' + (on ? " sel" : "") + (s.motOut[i] ? " out" : "") + '" data-a="mot" data-i="' + i + '"' + pressed(on) + (s.motOut[i] ? " disabled" : "") + ">" + esc(k.motive.options[i]) + "</button>";
      }).join("") + "</div>";
    },
    act: function (k, s, a, id) {
      if (a === "who" && s.ph === "who" && !s.out[id]) { s.pick = s.pick === id ? null : id; api.Snd.play("tap"); }
      if (a === "pe" && s.ph === "proof" && !s.evOut[id]) {
        var i = s.sel.indexOf(id);
        if (i >= 0) s.sel.splice(i, 1); else { s.sel.push(id); if (s.sel.length > k.need) s.sel.shift(); }
        api.Snd.play("tap");
      }
      if (a === "mot" && s.ph === "why" && !s.motOut[+id]) { s.mot = s.mot === +id ? null : +id; api.Snd.play("tap"); }
    },
    ready: function (k, s) {
      if (s.ph === "who") return { ok: !!s.pick, label: s.pick ? "Accuse " + B.people[s.pick].name.split(" ")[0] : "Accuse", note: s.pick ? "Sure? A wrong accusation costs a star." : "Pick the person" };
      if (s.ph === "proof") return { ok: s.sel.length === k.need, label: "Present proof", note: s.sel.length + " of " + k.need + " picked" };
      return { ok: s.mot != null, label: "That's the motive", note: "Why did they do it?" };
    },
    check: function (k, s) {
      if (s.ph === "who") {
        if (s.pick === k.answer) { s.ph = "proof"; return { more: true, stamp: true }; }
        var name = B.people[s.pick].name; s.out[s.pick] = 1; s.pick = null;
        return { ok: false, msg: name + " doesn't fit the evidence." };
      }
      if (s.ph === "proof") {
        var wrong = s.sel.filter(function (id) { return k.proof.indexOf(id) < 0; });
        if (!wrong.length) { if (k.motive) { s.ph = "why"; return { more: true, stamp: true }; } return { ok: true }; }
        wrong.forEach(function (id) { s.evOut[id] = 1; });
        s.sel = s.sel.filter(function (id) { return k.proof.indexOf(id) >= 0; });
        return { ok: false, msg: "That doesn't prove it. The wrong evidence is crossed out." };
      }
      if (s.mot === k.motive.answer) return { ok: true };
      s.motOut[s.mot] = 1; s.mot = null;
      return { ok: false, msg: "The evidence doesn't back that motive." };
    },
    canHint: function (k, s) { return this.free(k, s).length > 0; },
    free: function (k, s) {
      if (s.ph === "who") return s.who.filter(function (id) { return id !== k.answer && !s.out[id]; });
      if (s.ph === "proof") return s.pool.filter(function (id) { return k.proof.indexOf(id) < 0 && !s.evOut[id]; });
      return s.mots.filter(function (i) { return i !== k.motive.answer && !s.motOut[i]; });
    },
    hint: function (k, s, r) {
      var c = this.free(k, s), x = c[Math.floor(r() * c.length)];
      if (s.ph === "who") { s.out[x] = 1; if (s.pick === x) s.pick = null; }
      else if (s.ph === "proof") { s.evOut[x] = 1; s.sel = s.sel.filter(function (id) { return id !== x; }); }
      else { s.motOut[x] = 1; if (s.mot === x) s.mot = null; }
    }
  };

  T.think = {
    init: function (k, seed) { return { sel: null, out: {}, order: shuffled(k.options.map(function (_, i) { return i; }), seed) }; },
    html: function (k, s) {
      return (k.show && k.show.length ? '<div class="bk-evlist small">' + k.show.map(function (id) { return evCard(id, "static"); }).join("") + "</div>" : "") +
        '<div class="bk-opts">' + s.order.map(function (i) {
          var on = s.sel === i;
          return '<button type="button" class="bk-opt' + (on ? " sel" : "") + (s.out[i] ? " out" : "") + '" data-a="opt" data-i="' + i + '"' + pressed(on) + (s.out[i] ? " disabled" : "") + ">" + esc(k.options[i]) + "</button>";
        }).join("") + "</div>";
    },
    act: function (k, s, a, id) { if (a === "opt" && !s.out[+id]) { s.sel = s.sel === +id ? null : +id; api.Snd.play("tap"); } },
    ready: function (k, s) { return { ok: s.sel != null, label: "Confirm", note: s.sel != null ? "Is that your answer?" : "Pick an answer" }; },
    check: function (k, s) {
      if (s.sel === k.answer) return { ok: true };
      s.out[s.sel] = 1; s.sel = null;
      return { ok: false, msg: "The evidence says otherwise." };
    },
    canHint: function (k, s) { return k.options.some(function (_, i) { return i !== k.answer && !s.out[i]; }); },
    hint: function (k, s, r) {
      var c = s.order.filter(function (i) { return i !== k.answer && !s.out[i]; }), x = c[Math.floor(r() * c.length)];
      s.out[x] = 1; if (s.sel === x) s.sel = null;
    }
  };

  /* ---------- playing a mission ---------- */
  function step() { return R.m.steps[R.k]; }
  function initStep() {
    R.st = T[step().type].init(step(), R.n + ":" + R.k);
    R.stepHint = false;
  }
  function gain(ids) { ids.forEach(function (id) { if (R.ev.indexOf(id) < 0) R.ev.push(id); if (R.gained.indexOf(id) < 0) R.gained.push(id); }); }
  function potential() { return R.retried ? 1 : Math.max(1, 3 - R.mistakes - (R.hint ? 1 : 0)); }
  function saveWip(k) {
    if (R.replay) return;
    st().wip = { n: R.n, k: k == null ? R.k : k, mistakes: R.mistakes, hint: R.hint, retried: R.retried, revived: R.revived, h: hashOf(R.m) };
    api.persist();
  }
  // n: a mission up to the one the player is on. No n: the current mission (or the map once the book is done).
  function start(n) { use(BOOK1); open(n); }
  // A player's investigation. o: { key, by, share(stars, of) }
  function startStory(book, o) { use(book, o); open(); }
  function open(n) {
    var b = st();
    if (!n && finished()) { if (mine) n = 1; else { api.openMap(); return; } }
    n = Math.max(1, Math.min(n || b.at, b.at, N));
    var m = mission(n), w = b.wip;
    R = { n: n, m: m, replay: n < b.at, k: 0, phase: "brief", mistakes: 0, hint: false, retried: false, revived: false, gained: [], st: null };
    // a mission left half-way comes back at the same step, with its mistakes and hints (a reload can't wipe them)
    if (!R.replay && w && w.n === n && w.h === hashOf(m) && w.k < m.steps.length && (w.k > 0 || w.mistakes || w.hint || w.retried)) {
      R.k = w.k; R.mistakes = w.mistakes || 0; R.hint = !!w.hint; R.retried = !!w.retried; R.revived = !!w.revived;
      R.phase = R.mistakes >= MAX_MISTAKES ? (canRevive() ? "revive" : "fail") : "play"; // left at the "falling apart" choice: back to it
    }
    R.ev = evidenceAt(n, R.k);
    if (R.phase === "play") initStep();
    api.show("book");
    hud();
    render(true);
    if (R.phase === "play") { api.toast("Picking up where you left off: step " + (R.k + 1) + " of " + m.steps.length + "."); api.Plat.gameplayStart(); }
    track("book_start", { mission: n, replay: R.replay });
  }
  function hud() {
    var ch = chapterOf(R.n);
    if (mine) api.setHud("Mission " + R.n + " of " + N, B.title);
    else api.setHud("Mission " + R.n, "Chapter " + ch + " · " + B.chapters[ch - 1].title);
  }
  function go() {
    if (!R) return;
    api.Snd.play("click");
    if (R.phase === "brief") {
      R.phase = "play"; R.k = 0; initStep(); saveWip(); render(true);
      api.Plat.gameplayStart();
      return;
    }
    if (R.phase === "solved") { R.k++; R.phase = "play"; initStep(); saveWip(); render(true); return; }
    if (R.phase === "fail") { retryStep(); return; }
    if (R.phase === "revive") { reviveNow(); return; }
    if (R.phase === "end") { nextMission(); return; }
    var k = step(), t = T[k.type];
    if (!t.ready(k, R.st).ok) return;
    var res = t.check(k, R.st);
    if (res.ok === true) solved(res);
    else if (res.more) { api.Snd.play(res.stamp ? "stamp" : "pin"); render(false, res.scroll); }
    else mistake(res.msg, res.scroll);
  }
  function solved(res) {
    var k = step();
    gain(k.gives || []);
    if (!R.replay) st().seen[k.type] = 1;
    track("book_step", { mission: R.n, step: R.k + 1, type: k.type });
    if (R.k === R.m.steps.length - 1) { finish(k.done); return; }
    R.phase = "solved";
    saveWip(R.k + 1);
    // An accusation that lands is an arrest; any other step is a note in the file (and a photo if it found evidence).
    if (k.type === "accuse") { api.Snd.play("stamp"); api.Snd.play("cuffs", { delay: 0.3 }); api.Snd.play("correct", { delay: 0.7 }); }
    else { api.Snd.play("pen"); if (stepGains(k).length) api.Snd.play("camera", { delay: 0.35 }); }
    render(false, res && res.scroll);
    var d = document.querySelector(".bk-done");
    if (d) setTimeout(function () { d.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 60);
  }
  // One Revive per mission attempt, in Book 1 only (not replays or a player's own story).
  function canRevive() { return !R.revived && !R.replay && !mine; }
  function retryStep() { R.retried = true; R.mistakes = 0; R.phase = "play"; initStep(); saveWip(); render(true); }
  // The second chance: a rewarded ad when ads are on; free with no ads or no ad to show. Closing the ad keeps the choice.
  function reviveNow() {
    var P = api.Plat, keep = R, go = $("bk-go");
    go.disabled = true;
    (P.hasAds() ? P.rewarded("book_revive").then(function (ok) { return ok !== false; }) : Promise.resolve(true)).then(function (ok) {
      go.disabled = false;
      if (R !== keep || R.phase !== "revive") return;
      if (!ok) { api.toast("No reward this time. Try again, or start the step over."); return; }
      R.revived = true; R.mistakes = MAX_MISTAKES - 1; R.phase = "play";
      if (!R.st) initStep(); // back at the choice after a reload: the step starts fresh (taps aren't saved)
      saveWip(); render(true);
      api.Snd.play("whoosh");
      track("book_revive", { mission: R.n, step: R.k + 1 });
    });
  }
  function mistake(msg, scroll) {
    R.mistakes++;
    api.Snd.play("wrong");
    api.FX.shake($("bk-body"));
    track("book_mistake", { mission: R.n, step: R.k + 1, type: step().type, count: R.mistakes });
    if (R.mistakes >= MAX_MISTAKES) {
      R.phase = canRevive() ? "revive" : "fail"; saveWip(); render(true);
      track("book_failed", { mission: R.n, step: R.k + 1 });
      return;
    }
    api.toast(esc(msg) + (R.mistakes === MAX_MISTAKES - 1 ? " Careful: one more mistake and the case falls apart." : ""), "", 3400);
    saveWip(); render(false, scroll);
  }
  function finish(lastDone) {
    var b = st(), n = R.n, stars = potential(), first = !R.replay, ch = chapterOf(n);
    var chapterDone = !mine && first && n % PER === 0, bookDone = !mine && first && n === N;
    // a player's own story pays nothing, so nobody can farm coins with stories they wrote themselves
    R.result = mine ? {} : api.P.bookSolved({ ch: ch, stars: stars, hint: R.hint, replay: R.replay, chapterDone: chapterDone, bookDone: bookDone });
    if (first) { b.stars[n] = stars; b.at = n + 1; }
    b.wip = null;
    R.phase = "end"; R.stars = stars; R.lastDone = lastDone; R.chapterDone = chapterDone; R.bookDone = bookDone;
    api.persist(); api.flush();
    api.Plat.gameplayStop();
    render(true);
    for (var i = 0; i < stars; i++) api.Snd.play("star", { delay: 0.35 + i * 0.18, rate: 1 + i * 0.12 });
    if (R.result.coins) api.renderCoins(true);
    if (chapterDone) { api.FX.confetti({ count: bookDone ? 200 : 140 }); api.Snd.play("fanfare", { delay: 0.6 }); api.Plat.happytime(); }
    else if (mine && n === N) { api.FX.confetti({ count: 140 }); api.Snd.play("fanfare", { delay: 0.6 }); }
    else if (stars === 3) api.FX.confetti({ count: 60 });
    setTimeout(api.flushQueue, 1100);
    track(first ? "book_done" : "book_replay", { mission: n, stars: stars, hint: R.hint, retried: R.retried });
    if (chapterDone) track("book_chapter_done", { chapter: ch });
    if (bookDone) track("book_finished", {});
  }
  function nextMission() {
    var n = R.n + 1;
    if (n > N || n > st().at) { if (mine) api.goHQ(); else api.openMap(); return; }
    api.midgame("book_next").then(function () { open(n); });
  }
  function useHint() {
    if (!R || R.phase !== "play" || R.stepHint || mine) return;
    var k = step(), t = T[k.type], m = api.hintMode();
    if (!t.canHint(k, R.st) || (m !== "item" && m !== "ad")) return;
    var keep = R;
    api.useHint(m, function () {
      if (R !== keep || R.phase !== "play" || step() !== k || !t.canHint(k, R.st)) return;
      t.hint(k, R.st, WL.rngFrom("hint:" + Date.now()));
      R.hint = true; R.stepHint = true;
      api.Snd.play("whoosh");
      saveWip(); render();
      track("hint_used", { kind: "book", type: m });
    });
  }

  /* ---------- rendering ---------- */
  function render(top, scrollLog) {
    if (!R) return;
    var body = $("bk-body"), h = "";
    if (R.phase === "brief") h = briefHtml();
    else if (R.phase === "end") h = endHtml();
    else if (R.phase === "fail") h = stepHead() + '<div class="bk-fail"><p class="verdict-head bad">The case fell apart.</p><p>Three mistakes on this step. Take a breath and try it again. This mission can now earn 1 star.</p></div>';
    else if (R.phase === "revive") h = stepHead() + '<div class="bk-fail"><p class="verdict-head bad">The case is falling apart.</p><p>Three mistakes on this step. Use your one Revive to keep going from here, or start the step over for 1 star.</p>' +
      '<button type="button" class="btn ghost" data-a="retry">Start the step over</button></div>';
    else {
      var k = step();
      h = stepHead() + '<div class="bk-play' + (R.phase === "solved" ? " is-solved" : "") + '" data-kind="' + k.type + '">' + T[k.type].html(k, R.st) + "</div>" +
        (R.phase === "solved" ? '<div class="bk-done" role="status"><p class="bk-done-h">✓ Step solved</p><p>' + esc(k.done) + "</p>" +
          (stepGains(k).length ? '<p class="bk-lbl">Added to your dossier</p><div class="bk-chips">' + stepGains(k).map(function (id) { return evChip(id); }).join("") + "</div>" : "") + "</div>" : "");
    }
    body.innerHTML = '<div class="bk-in">' + h + "</div>";
    if (top) body.scrollTop = 0;
    if (R.st && R.st.log) R.st.fresh = R.st.log.length;
    if (scrollLog) { var l = $("bk-log"); if (l && l.lastElementChild) l.lastElementChild.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    renderTop(); renderBar();
  }
  function renderTop() {
    var m = R.m, h = '<span class="' + (R.phase === "brief" ? "now" : "done") + '" title="Briefing">' + "📁" + "</span>";
    m.steps.forEach(function (k, i) {
      var state = R.phase === "end" || i < R.k || (i === R.k && R.phase === "solved") ? "done" : i === R.k && R.phase !== "brief" ? "now" : "";
      h += '<span class="' + state + '" title="' + KIND[k.type][1] + '">' + KIND[k.type][0] + "</span>";
    });
    $("bk-steps").innerHTML = h;
    $("bk-steps").setAttribute("aria-label", R.phase === "brief" ? "Briefing" : "Step " + Math.min(R.k + 1, m.steps.length) + " of " + m.steps.length);
    var n = R.phase === "end" ? R.stars : potential();
    $("bk-stars").innerHTML = starRow(n);
    $("bk-stars").setAttribute("aria-label", (R.phase === "end" ? "Stars earned: " : "Stars you can still earn: ") + n);
    $("bk-replay").hidden = !R.replay;
    $("bk-dossier-n").textContent = R.ev.length;
  }
  function renderBar() {
    var bar = $("bk-bar"), goBtn = $("bk-go"), hint = $("bk-hint"), note = $("bk-note");
    bar.hidden = R.phase === "end";
    hint.hidden = R.phase !== "play" || !!mine; // a friend's story is played straight, no hints
    goBtn.disabled = false; goBtn.className = "btn primary";
    if (R.phase === "brief") { goBtn.textContent = "Start the mission"; note.textContent = R.m.goal; return; }
    if (R.phase === "solved") { goBtn.textContent = "Next step"; note.textContent = "Step " + (R.k + 1) + " of " + R.m.steps.length + " done"; return; }
    if (R.phase === "fail") { goBtn.textContent = "Try this step again"; note.textContent = ""; return; }
    if (R.phase === "revive") { goBtn.textContent = api.Plat.hasAds() ? "Revive: watch a short ad" : "Revive: keep going"; goBtn.className = "btn danger"; note.textContent = "One Revive per mission."; return; }
    if (R.phase !== "play") return;
    var k = step(), r = T[k.type].ready(k, R.st), m = api.hintMode(), can = !R.stepHint && T[k.type].canHint(k, R.st);
    goBtn.textContent = r.label; goBtn.disabled = !r.ok; goBtn.className = "btn " + (r.ok ? "danger" : "primary");
    note.textContent = r.note;
    hint.disabled = !can || (m !== "item" && m !== "ad");
    $("bk-hint-n").textContent = m === "ad" ? "AD" : api.S().inv.magnifier || 0;
    $("bk-hint-n").classList.toggle("ad", m === "ad");
    hint.setAttribute("aria-label", R.stepHint ? "Magnifier already used on this step" : m === "ad" ? "Watch an ad for a hint" : "Magnifier: rule out one wrong answer. Costs a star.");
    hint.title = R.stepHint ? "Used on this step" : "Rules out one wrong answer. Costs a star.";
  }
  function stepHead() {
    var k = step(), tip = !R.replay && !st().seen[k.type] && R.phase !== "fail";
    return '<header class="bk-head"><p class="case-kicker">' + KIND[k.type][0] + " " + KIND[k.type][1] + " · Step " + (R.k + 1) + " of " + R.m.steps.length + "</p>" +
      '<h2 class="case-title">' + esc(k.title) + '</h2><p class="bk-ask">' + esc(k.ask) + "</p>" +
      (tip ? '<p class="bk-tip"><b>How it works</b> ' + esc(TIP[k.type]) + "</p>" : "") + "</header>";
  }
  function briefHtml() {
    var n = R.n, m = R.m, ch = chapterOf(n), c = B.chapters[ch - 1], h = "";
    if ((n - 1) % PER === 0) {
      h += '<section class="bk-chapter"><span class="bk-chico" aria-hidden="true">' + esc(c.icon) + '</span><p class="eyebrow">' +
        (mine ? esc(B.title) + " · by " + esc(mine.by) : "Book 1 · Chapter " + ch + " of " + B.chapters.length) + "</p>" +
        '<h2 class="bk-chtitle">' + esc(c.title) + "</h2><p>" + esc(c.intro) + "</p></section>";
    } else if (mission(n - 1).outro) h += '<p class="bk-prev"><b>Previously</b> ' + esc(mission(n - 1).outro) + "</p>";
    h += '<article class="bk-brief"><span class="folder-tab">Mission ' + n + " of " + N + "</span>" +
      '<p class="case-kicker">' + m.steps.map(function (k) { return KIND[k.type][0] + " " + KIND[k.type][1]; }).join(" · ") + "</p>" +
      '<h2 class="case-title">' + esc(m.title) + "</h2>" + '<div class="bk-text">' + paras(m.brief) + "</div>" +
      '<p class="bk-goal"><b>Your goal</b> ' + esc(m.goal) + "</p>" +
      (m.cast && m.cast.length ? '<div class="bk-cast">' + m.cast.map(function (id) { return '<span class="bk-person">' + mug(id, "small") + "<b>" + esc(B.people[id].name) + "</b><span>" + esc(B.people[id].role) + "</span></span>"; }).join("") + "</div>" : "") +
      (m.gives && m.gives.length ? '<p class="bk-lbl">New in your dossier</p><div class="bk-evlist small">' + m.gives.map(function (id) { return evCard(id, "static"); }).join("") + "</div>" : "") +
      (R.replay ? '<p class="muted small">Replay: you keep the stars from your first run.' + (mine ? "" : " Replays give a little XP.") + "</p>" : "") + "</article>";
    return h;
  }
  function endHtml() {
    var n = R.n, c = B.chapters[chapterOf(n) - 1], r = R.result || {}, h = "";
    var items = r.items ? Object.keys(r.items).map(function (x) { return '<span class="rw">' + ({ magnifier: "🔍", key: "🔑" }[x] || "") + " +" + r.items[x] + "</span>"; }).join("") : "";
    h += '<section class="bk-end"><p class="eyebrow">Mission ' + n + " of " + N + " · " + esc(R.m.title) + "</p>" +
      '<p class="verdict-head good">' + (R.bookDone ? "Book 1 solved!" : R.chapterDone ? "Chapter " + chapterOf(n) + " solved!" : mine && n === N ? "Investigation solved!" : CRACKED[n % CRACKED.length]) + "</p>" +
      '<div class="verdict-stars">' + [0, 1, 2].map(function (i) { return '<span class="st' + (i < R.stars ? " on" : "") + '"></span>'; }).join("") + "</div>" +
      (R.chapterDone ? '<p class="verdict-banner">' + esc(c.icon + " New rank badge: " + c.badge) + "</p>" : R.replay ? '<p class="muted">Replay: your first-run stars stay.</p>' : "") +
      '<div class="rewards big">' + api.rw(r.coins, r.xp) + items + "</div>" +
      '<p class="bk-lastdone">' + esc(R.lastDone) + "</p>" +
      (R.gained.length ? '<p class="bk-lbl">Added to your dossier</p><div class="bk-chips">' + R.gained.map(function (id) { return evChip(id); }).join("") + "</div>" : "");
    if (R.bookDone || ((R.replay || mine) && n === N)) {
      h += '<div class="bk-story ending"><p class="bk-lbl">' + esc(B.ending.title || "Case closed") + "</p>" + paras(B.ending.text) + '<p class="bk-hook">' + esc(B.ending.hook) + "</p></div>";
    } else if (!mine && n % PER === 0) {
      h += '<div class="bk-story"><p class="bk-lbl">Chapter ' + chapterOf(n) + " reveal</p><p>" + esc(c.outro) + "</p></div>";
    } else if (R.m.outro) h += '<div class="bk-story"><p>' + esc(R.m.outro) + "</p></div>";
    var more = n < N && n + 1 <= st().at;
    if (mine) {
      var got = starsTotal();
      h += (n === N ? '<p class="muted">' + got + " of " + N * 3 + " stars across the " + N + " missions.</p>" : "") + '<div class="bk-endacts">' +
        (more ? '<button type="button" class="btn primary wide" data-a="next">Next mission</button>' : "") +
        (n === N ? '<button type="button" class="btn primary wide" data-a="share">' + esc(mine.label || "Share your result") + "</button>" : "") +
        '<button type="button" class="btn ghost" data-a="hq">HQ</button></div></section>';
      return h;
    }
    h += '<div class="bk-endacts">' + (more ? '<button type="button" class="btn primary wide" data-a="next">' + (n % PER === 0 ? "Start chapter " + (chapterOf(n) + 1) : "Next mission") + "</button>" : "") +
      '<button type="button" class="btn ' + (more ? "ghost" : "primary wide") + '" data-a="map">Book map</button><button type="button" class="btn ghost" data-a="hq">HQ</button></div></section>';
    return h;
  }

  /* ---------- the dossier ---------- */
  var dosTab = "ev";
  function openDossier(tab) {
    dosTab = tab || dosTab;
    renderDossier();
    api.openDialog("dlg-dossier");
  }
  function renderDossier() {
    var done = storyDone(), held = R && R.phase !== "end" ? R.ev : evidenceAt(st().at, 0).filter(function (id) { return foundIn[id] < st().at; });
    var boardOpen = (B.board || []).some(function (x) { return x[1] <= done; });
    // the Timeline tab hides while a timeline step is on screen: it would give that puzzle away
    var tl = (B.timeline || []).filter(function (x) { return x[0] <= done; }), tlOpen = tl.length && !(R && R.phase === "play" && step().type === "timeline");
    if ((dosTab === "board" && !boardOpen) || (dosTab === "tl" && !tlOpen)) dosTab = "ev";
    $("dos-tabs").innerHTML = [["ev", "Evidence"], ["people", "People"]].concat(tlOpen ? [["tl", "Timeline"]] : [], boardOpen ? [["board", mine ? "Suspects" : "Who is B?"]] : []).map(function (t) {
      return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (dosTab === t[0]) + '">' + t[1] + "</button>";
    }).join("");
    var h = "";
    if (dosTab === "ev") {
      if (!held.length) h = '<p class="muted">Nothing yet.' + (mine ? "" : " Start Book 1 to open the case.") + "</p>";
      B.chapters.forEach(function (c, i) {
        var list = held.filter(function (id) { return chapterOf(foundIn[id]) === i + 1; });
        if (list.length) h += '<h3>' + (i + 1) + ". " + esc(c.title) + '</h3><div class="bk-evlist small">' + list.map(function (id) { return evCard(id, "static"); }).join("") + "</div>";
      });
    } else if (dosTab === "people") {
      // everyone met so far: the agency team, each mission's cast, the people you interviewed or could accuse
      var met = [], upto = R && R.phase !== "end" ? R.n : Math.min(st().at - 1, N);
      var add = function (id) { if (B.people[id] && met.indexOf(id) < 0) met.push(id); };
      if (upto >= 1 && !mine) ["evelyn", "marcus", "nia"].forEach(add);
      for (var n = 1; n <= upto; n++) {
        (mission(n).cast || []).forEach(add);
        mission(n).steps.forEach(function (k) { if (k.type === "talk") add(k.who); if (k.type === "accuse") k.who.forEach(add); });
      }
      h = met.length ? '<div class="bk-people">' + met.map(function (id) {
        var p = B.people[id], note = (p.notes || []).filter(function (x) { return x[0] <= done; }).pop();
        return '<div class="bk-person row">' + mug(id, "small") + "<span><b>" + esc(p.name) + "</b><span>" + esc(p.role) + "</span>" + (note ? "<em>" + esc(note[1]) + "</em>" : "") + "</span></div>";
      }).join("") + "</div>" : '<p class="muted">You haven\'t met anyone yet.</p>';
    } else if (dosTab === "tl") {
      // everything you know so far, in the order it happened, one list per day
      var day = null;
      tl.forEach(function (x) {
        if (x[1] !== day) h += (day === null ? "" : "</ul>") + "<h3>" + esc(day = x[1]) + '</h3><ul class="bk-tl">';
        h += "<li><b>" + esc(x[2]) + "</b><span>" + esc(x[3]) + "</span></li>";
      });
      h += "</ul>";
    } else {
      h = '<p class="muted small">' + (mine ? "Everyone who could be behind it." : "Every payment ends with a 10% fee for someone called B. These are the people who could be B.") + '</p><div class="bk-people">' +
        B.board.filter(function (x) { return x[1] <= done; }).map(function (x) {
          var p = B.people[x[0]], out = x[2] && x[2] <= done, caught = !x[2] && done >= N;
          return '<div class="bk-person row' + (out ? " out" : "") + (caught ? " caught" : "") + '">' + mug(x[0], "small") + "<span><b>" + esc(p.name) + "</b><em>" + esc(caught && !mine ? "B, the Broker. Caught." : x[3]) + "</em></span>" +
            (out ? '<span class="stamp cleared">Ruled out</span>' : caught ? '<span class="stamp">Caught</span>' : "") + "</div>";
        }).join("") + "</div>";
    }
    $("dos-body").innerHTML = h;
    $("dos-sub").textContent = held.length + " piece" + (held.length === 1 ? "" : "s") + " of evidence · " + (finished() ? (mine ? "Solved" : "Book 1 solved") : "Mission " + current() + " of " + N);
  }

  /* ---------- HQ card and Book map ---------- */
  function renderCard() {
    var b = st(), at = current(), ch = chapterOf(at), c = B.chapters[ch - 1], w = b.wip && b.wip.n === at && b.wip.k > 0;
    $("career-chapter").textContent = finished() ? "Career · Book 1 · Solved" : "Career · Book 1 · Chapter " + ch + " of " + B.chapters.length;
    $("career-name").textContent = finished() ? B.title : c.title;
    $("career-story").textContent = finished() ? "Case closed. Replay any mission from the Book map. Book 2, The Vanishing Witness, is coming."
      : b.at === 1 ? B.tagline : (at - 1) % PER === 0 ? c.intro : "Next: " + mission(at).title + ". " + mission(at).goal;
    var h = "";
    for (var k = 1; k <= PER; k++) {
      var n = (ch - 1) * PER + k, s = b.stars[n] || 0, cls = "node" + (n < b.at ? " done" : n === b.at ? " now" : " locked") + (k === PER ? " is-twist" : "");
      h += '<span class="' + cls + '" aria-label="Mission ' + n + (n < b.at ? ", " + s + " stars" : n === b.at ? ", next" : ", locked") + '">' + n +
        (n < b.at ? starRow(s) : '<span class="stars"><span class="st" style="visibility:hidden"></span></span>') + "</span>";
    }
    $("career-nodes").innerHTML = h;
    $("career-bar").innerHTML = '<i style="width:' + Math.round(100 * Math.min(b.at - 1, N) / N) + '%"></i>';
    $("career-bar").setAttribute("aria-label", Math.min(b.at - 1, N) + " of " + N + " missions solved");
    $("btn-play").textContent = finished() ? "Replay a mission" : b.at === 1 ? "Start Book 1" : (w ? "Continue mission " : "Play mission ") + at;
  }
  function renderMap(el) {
    var b = st(), h = "";
    B.chapters.forEach(function (c, i) {
      var first = i * PER + 1, open = first <= b.at, got = 0;
      for (var n = first; n < first + PER; n++) got += b.stars[n] || 0;
      var solved = b.at > first + PER - 1;
      h += '<section class="chapter' + (open ? "" : " locked") + '"><div class="chapter-head"><h3>' + c.icon + " " + (i + 1) + ". " + esc(c.title) + "</h3>" +
        '<span class="muted">' + (open ? '<span class="st on"></span>' + got + " / " + PER * 3 : "Solve chapter " + i + " to open") + "</span></div>" +
        (open ? '<p class="chapter-story">' + esc(solved && c.outro ? c.outro : c.intro) + "</p>" : "") + '<div class="bk-missions">';
      for (n = first; n < first + PER; n++) {
        var m = mission(n), can = n <= b.at, s = b.stars[n] || 0;
        h += '<button type="button" class="bk-mrow' + (n < b.at ? " done" : n === b.at ? " now" : "") + '" data-m="' + n + '"' + (can ? "" : " disabled") + ">" +
          '<span class="bk-mn">' + n + '</span><span class="bk-mt"><b>' + (can ? esc(m.title) : "Locked") + "</b>" +
          (can ? "<span>" + m.steps.map(function (k) { return KIND[k.type][0]; }).join(" ") + "</span>" : "") + "</span>" +
          (n < b.at ? starRow(s) : n === b.at ? '<span class="bk-next">' + (b.wip && b.wip.n === n ? "Continue" : "Next") + "</span>" : "") + "</button>";
      }
      h += "</div></section>";
    });
    if (finished()) h += '<section class="chapter"><div class="chapter-head"><h3>🏆 ' + esc(B.ending.title) + "</h3></div>" + '<p class="chapter-story">' + esc(B.ending.hook) + "</p></section>";
    el.innerHTML = h;
    var now = el.querySelector(".bk-mrow.now");
    if (now) setTimeout(function () { now.scrollIntoView({ block: "center" }); }, 30);
  }
  function starsTotal() { var b = st(), t = 0; Object.keys(b.stars).forEach(function (k) { t += b.stars[k]; }); return t; }

  /* ---------- wiring ---------- */
  function onBody(e) {
    var b = e.target.closest("[data-a]");
    if (!b || !R || b.disabled) return;
    var a = b.dataset.a, id = b.dataset.i;
    if (a === "next") { api.Snd.play("click"); nextMission(); return; }
    if (a === "map") { api.Snd.play("click"); api.openMap(); return; }
    if (a === "hq") { api.Snd.play("click"); api.goHQ(); return; }
    if (a === "retry" && R.phase === "revive") { api.Snd.play("click"); retryStep(); return; }
    if (a === "share" && mine) { api.Snd.play("click"); mine.share(starsTotal(), N * 3); return; }
    if (R.phase !== "play") return;
    var k = step(), res = T[k.type].act(k, R.st, a, id);
    render(false, res === "scroll");
  }
  function key(e) {
    if (!R) return false;
    if (/^[1-9]$/.test(e.key)) {
      var list = [].slice.call($("bk-body").querySelectorAll("button[data-a]:not(:disabled)")), b = list[+e.key - 1];
      if (b) { b.click(); e.preventDefault(); }
      return true;
    }
    if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
      var g = R.phase === "end" ? $("bk-body").querySelector('[data-a="next"],[data-a="map"],[data-a="share"]') : $("bk-go");
      if (g && !g.disabled) { g.click(); e.preventDefault(); }
      return true;
    }
    return false;
  }
  function leave() { R = null; if (B !== BOOK1) use(BOOK1); }
  function migrate() {
    var s = api.S();
    if (s.book && s.book[B.id]) return null;
    st();
    var old = s.career;
    if (!old || !(old.level > 1)) return null;
    var g = { coins: Math.min(400, 100 + 30 * Math.floor((old.level - 1) / 10)), magnifier: 2 };
    api.P.grant(g);
    return g;
  }
  function mount(a) {
    api = a;
    $("bk-body").addEventListener("click", onBody);
    $("bk-go").addEventListener("click", go);
    $("bk-hint").addEventListener("click", useHint);
    $("bk-dossier").addEventListener("click", function () { api.Snd.play("folder"); openDossier(); });
    $("dos-tabs").addEventListener("click", function (e) { var t = e.target.closest("[data-tab]"); if (t) { api.Snd.play("tap"); dosTab = t.dataset.tab; renderDossier(); } });
  }

  window.WLBook = {
    mount: mount, start: start, startStory: startStory, leave: leave, key: key, migrate: b1(migrate),
    renderCard: b1(renderCard), renderMap: b1(renderMap), openDossier: openDossier,
    finished: b1(finished), current: b1(current), starsTotal: b1(starsTotal), total: N, title: B.title,
    // a player's investigation: { at, stars } so far (null if never opened)
    storyProgress: function (key) { var r = api.S().storyRuns; return (r && r[key]) || null; },
    playing: function () { return !!R; },
    // for tools and tests (?test=1)
    _state: function () { return R; }, _evidenceAt: evidenceAt
  };
})();
