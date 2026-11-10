/*
  LIARHUNT — a Daily 5 chapter in a v2 story (WLChapter): search the scene, question the suspects, then accuse.
  game.js mounts it with the helpers it shares and opens each chapter with open(c, st):
    c   the chapter from d5Case (scene, spots, evidence, carried findings, questions, presses, statements, cast)
    st  what this player has done in it, saved with the day: { tab, searched, open, who, asked, pressed, heard, pick, proof, hunchOut }
  It never knows the answer. Accusing hands game.js a pick { s: statement id, p: proof key }, which is judged by the
  file as before; reveal(rev, right) then marks the answer.
*/
(function () {
  "use strict";
  var WL = window.WL, ART = window.WLArt;
  if (!ART) return;
  var api = null, box = null, C = null, S = null, sheet = false, flash = "";
  var TABS = [["search", "search", "Search"], ["question", "ask", "Question"], ["accuse", "scales", "Accuse"]];
  var KIND = { cctv: "Camera", log: "Log", document: "Document", witness: "Witness", photo: "Photo", record: "Record", phone: "Phone", object: "Object", finding: "Finding" };
  function esc(t) { return WL.esc(t == null ? "" : String(t)); }
  function icon(id, cls) { return ART.icon(id, cls); }
  function clock(t) { if (!t) return ""; var h = +t.slice(0, 2), m = t.slice(3); return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM"); }

  /* ---------- what the player has (also used by the notebook, on the raw chapter docs) ---------- */
  function found(c, st) {
    var out = [];
    (c.spots || []).forEach(function (x) { if (x.finds && (st.searched || []).indexOf(x.id) >= 0) out.push(x.finds); });
    return out;
  }
  function heard(c, st) { return (st.heard || []).slice(); }
  function person(pid) { return (C.cast && C.cast[pid]) || { name: pid, role: "", face: "" }; }
  function stOf(id) { return C.statements.filter(function (s) { return s.id === id; })[0]; }
  function evOf(id) { return C.evidence.filter(function (e) { return e.id === id; })[0] || C.carried.filter(function (f) { return f.id === id; })[0]; }
  function have() { return found(C, S).map(evOf).concat(C.carried); }
  function isOpen(q) { var f = found(C, S); return q.needs.every(function (id) { return f.indexOf(id) >= 0; }); }
  function asked(q) { return S.asked.indexOf(q.id) >= 0; }
  function face(pid, cls) { var p = person(pid); return '<span class="ch-face ' + (cls || "") + '">' + WL.avatar(p.name, p.face) + "</span>"; }
  function ready() { return !!S.pick && S.proof.length === C.need; }
  function done(tab) {
    if (tab === "search") return found(C, S).length === C.evidence.length;
    if (tab === "question") return C.questions.every(asked);
    return !!C.locked;
  }

  /* ---------- drawing ---------- */
  function slip(e) {
    if (!e) return "";
    var meta = e.kind === "finding" ? e.title : (KIND[e.kind] || e.kind) + (e.source ? " · " + e.source : "") + (e.time ? " · " + clock(e.time) : "");
    return '<div class="slip k-' + esc(e.kind) + '"><span class="slip-meta">' + esc(meta) + '</span><b class="slip-t">' + esc(e.title) + '</b><p class="slip-x">' + esc(e.text) + "</p></div>";
  }
  function head() {
    return '<header class="ch-head"><p class="ch-kicker">Chapter ' + C.n + " of 5</p><h2 class=\"ch-title\">" + esc(C.title) + "</h2>" +
      (C.prev ? '<p class="ch-prev"><b>So far</b> ' + esc(C.prev) + "</p>" : "") + '<p class="ch-intro">' + esc(C.setup) + "</p></header>";
  }
  function tabs() {
    return '<div class="ch-tabs" role="tablist">' + TABS.map(function (t, i) {
      var on = S.tab === t[0], ok = done(t[0]);
      return '<button type="button" role="tab" class="ch-tab' + (on ? " on" : "") + (ok ? " done" : "") + '" aria-selected="' + on + '" data-tab="' + t[0] + '" data-k="tab:' + t[0] + '">' +
        icon(ok && !on ? "check" : t[1]) + "<span>" + t[2] + '</span><kbd aria-hidden="true">' + (i + 1) + "</kbd></button>";
    }).join("") + "</div>";
  }
  function searchTab() {
    var sc = ART.SCENES[C.scene] || { anchors: {}, name: "" }, n = 0, first = true;
    var pins = C.spots.map(function (x) {
      var a = sc.anchors[x.anchor] || [50, 50], seen = S.searched.indexOf(x.id) >= 0, next = !seen && first && !S.searched.length;
      if (!seen) first = false; else n++;
      return '<button type="button" class="pin' + (seen ? " seen" : "") + (next ? " next" : "") + (S.open === x.id ? " open" : "") + '" style="left:' + a[0] + "%;top:" + a[1] + '%" data-spot="' + x.id +
        '" data-k="spot:' + x.id + '" aria-label="' + (seen ? "Searched: " : "Search: ") + esc(x.label) + '">' + icon(seen ? "check" : "search") + "</button>";
    }).join("");
    var x = C.spots.filter(function (s) { return s.id === S.open; })[0], e = x && x.finds ? evOf(x.finds) : null;
    var detail = x ? '<div class="ch-spot"><p class="ch-spot-h">' + icon(x.icon) + "<b>" + esc(x.label) + '</b>' + (e ? '<span class="tag-new">Evidence</span>' : "") + "</p><p>" + esc(x.text) + "</p>" +
      (e ? slip(e) : '<p class="ch-none">Nothing useful here.</p>') + "</div>"
      : '<p class="ch-hint">Tap a red pin to look closer. Some spots hold evidence, some hold nothing.</p>';
    var bar = C.spots.map(function (s) { return '<i class="' + (S.searched.indexOf(s.id) >= 0 ? "on" : "") + '"></i>'; }).join("");
    return '<div class="ch-search"><div class="ch-scene-wrap"><div class="ch-scene">' + ART.scene(C.scene) + pins + '<span class="ch-where">' + esc(sc.name) + " · " + esc(clock(C.time)) + "</span></div>" +
      '<p class="ch-meter"><span>Searched ' + n + " of " + C.spots.length + '</span><span class="ch-bar">' + bar + "</span><span>" + found(C, S).length + " evidence</span></p></div>" + detail + "</div>";
  }
  function questionTab() {
    var who = S.who, p = person(who), mine = heard(C, S).filter(function (id) { var s = stOf(id); return s && s.by === who; });
    var rows = mine.map(function (sid) {
      var q = C.questions.filter(function (x) { return x.says === sid; })[0], pr = !q && C.presses.filter(function (x) { return x.says === sid; })[0];
      var shown = pr ? evOf(pr.shown) : null;
      return '<div class="ch-qa' + (flash === sid ? " fresh" : "") + '"><p class="ch-asked">' + icon(pr ? "pin" : "ask") + (pr ? "You showed " + esc(p.name.split(" ")[0]) + ": " + esc(shown ? shown.title : "") : esc(q.ask)) + "</p>" +
        '<p class="bubble' + (pr ? " changed" : "") + '">' + esc(stOf(sid).text) + (pr ? '<span class="tag-changed">Story changed</span>' : "") + "</p></div>";
    }).join("");
    var mineQ = C.questions.filter(function (q) { return q.by === who; });
    var open = mineQ.filter(function (q) { return isOpen(q) && !asked(q); }), shut = mineQ.filter(function (q) { return !isOpen(q); }).length;
    var asks = open.map(function (q) {
      return '<button type="button" class="ch-ask' + (q.needs.length ? " new" : "") + '" data-ask="' + q.id + '" data-k="ask:' + q.id + '">' + icon("ask") + "<span>" + esc(q.ask) + "</span>" + (q.needs.length ? '<span class="tag-new">New</span>' : "") + "</button>";
    }).join("") + (shut ? '<p class="ch-locked">' + icon("lock") + "Find more evidence to ask " + p.name.split(" ")[0] + " more.</p>" : "");
    var strip = C.people.map(function (pid) {
      var left = C.questions.filter(function (q) { return q.by === pid && isOpen(q) && !asked(q); }).length;
      return '<button type="button" class="ch-pick' + (pid === who ? " on" : "") + '" data-who="' + pid + '" data-k="who:' + pid + '" aria-label="' + esc(person(pid).name) + (left ? ", " + left + " new question" + (left > 1 ? "s" : "") : "") + '">' +
        face(pid) + "<span>" + esc(person(pid).name.split(" ")[0]) + "</span>" + (left ? "<b>" + left + "</b>" : "") + "</button>";
    }).join("");
    return '<div class="ch-question"><div class="ch-strip">' + strip + '</div><div class="ch-who">' + face(who, "big") + "<div><b>" + esc(p.name) + "</b><span>" + esc(p.role) + " · " + mine.length + " statement" + (mine.length === 1 ? "" : "s") + "</span></div></div>" +
      '<div class="ch-talk">' + (rows || '<p class="ch-hint">Ask ' + esc(p.name.split(" ")[0]) + " something.</p>") + asks +
      '<button type="button" class="btn ghost ch-show" data-show="1" data-k="show">' + icon("pin") + "Show " + esc(p.name.split(" ")[0]) + " evidence…</button></div></div>";
  }
  function accuseTab() {
    var h = heard(C, S), rev = C.rev;
    var groups = C.people.map(function (pid) {
      var list = h.filter(function (id) { return stOf(id).by === pid; });
      if (!list.length) return "";
      var out = S.hunchOut === pid;
      return '<div class="ch-grp' + (out ? " out" : "") + '">' + face(pid) + '<div class="ch-sts"><p class="ch-grp-n">' + esc(person(pid).name) + (out ? " · ruled out by your Hunch" : "") + "</p>" + list.map(function (id) {
        var cls = S.pick === id ? " picked" : "";
        if (rev) cls += (id === rev.answer.s ? " is-answer" : "") + (S.pick === id && id !== rev.answer.s ? " is-wrong" : "");
        return '<button type="button" class="ch-st' + cls + '" data-st="' + id + '" data-k="st:' + id + '"' + (out || rev ? " disabled" : "") + ">" + esc(stOf(id).text) +
          (rev && id === rev.answer.s ? '<span class="stamp-lie">Lie</span>' : S.pick === id ? '<span class="stamp-lie soft">Lie?</span>' : "") + "</button>";
      }).join("") + "</div></div>";
    }).join("");
    var proof = rev ? (rev.answer.p[0] || "").split(",") : [];
    var chips = have().map(function (e) {
      var on = S.proof.indexOf(e.id) >= 0, cls = (on ? " on" : "") + (e.kind === "finding" ? " nb" : "") + (rev && proof.indexOf(e.id) >= 0 ? " is-proof" : "") + (rev && on && proof.indexOf(e.id) < 0 ? " is-wrong" : "");
      return '<button type="button" class="chip' + cls + '" data-pf="' + e.id + '" data-k="pf:' + e.id + '"' + (rev ? " disabled" : "") + ">" + icon(e.kind === "finding" ? "pin" : chipIcon(e)) + "<span>" + esc(e.title) + "</span></button>";
    }).join("");
    var name = S.pick ? person(stOf(S.pick).by).name.split(" ")[0] : "";
    return '<div class="ch-accuse"><p class="ch-ask-q">' + esc(C.ask) + "</p>" +
      '<h3 class="ch-step"><span>1</span>Which statement can\'t be true?</h3>' + (groups || '<p class="ch-hint">You haven\'t heard anyone yet. Question the suspects first.</p>') +
      '<h3 class="ch-step"><span>2</span>What proves it? <em>Pick ' + C.need + "</em></h3>" + '<div class="chips">' + chips + "</div>" +
      (rev ? "" : '<button type="button" class="btn danger wide ch-go" data-accuse="1" data-k="accuse"' + (ready() ? "" : " disabled") + ">" + (name ? "Accuse " + esc(name) : "Accuse") + "</button>" +
        '<p class="ch-odds">' + icon("lock") + "A wrong statement or a wrong proof is a miss.</p>") + "</div>";
  }
  function chipIcon(e) {
    var x = C.spots.filter(function (s) { return s.finds === e.id; })[0];
    return x ? x.icon : "photo";
  }
  function sheetHtml() {
    var p = person(S.who), list = have();
    return '<div class="ch-sheet" role="dialog" aria-label="Show ' + esc(p.name) + ' evidence"><div class="ch-sheet-in"><p class="ch-sheet-h">Show ' + esc(p.name.split(" ")[0]) + ' evidence</p>' +
      '<p class="ch-hint">Innocent people explain themselves too. A changed story isn\'t proof on its own.</p><div class="chips">' +
      (list.length ? list.map(function (e) {
        var tried = S.pressed.indexOf(S.who + ">" + e.id) >= 0;
        return '<button type="button" class="chip' + (tried ? " tried" : "") + (e.kind === "finding" ? " nb" : "") + '" data-press="' + e.id + '" data-k="press:' + e.id + '">' + icon(e.kind === "finding" ? "pin" : chipIcon(e)) + "<span>" + esc(e.title) + "</span></button>";
      }).join("") : '<p class="ch-hint">You have no evidence yet. Search the scene first.</p>') +
      '</div><button type="button" class="btn ghost wide" data-close="1" data-k="close">Close</button></div></div>';
  }
  function render() {
    if (!C) return;
    var f = document.activeElement, k = f && box.contains(f) ? f.getAttribute("data-k") : null;
    var body = S.tab === "search" ? searchTab() : S.tab === "question" ? questionTab() : accuseTab();
    box.innerHTML = head() + tabs() + '<div class="ch-body ch-' + S.tab + '-tab">' + body + "</div>" + (sheet ? sheetHtml() : "");
    if (k) { var again = box.querySelector('[data-k="' + k + '"]'); if (again && !again.disabled) again.focus({ preventScroll: true }); }
    flash = "";
  }
  function save() { api.persist(); }

  /* ---------- actions ---------- */
  function tab(t) { if (S.tab === t) return; S.tab = t; sheet = false; api.Snd.play("tap"); save(); render(); box.scrollTop = 0; }
  function search(id) {
    var x = C.spots.filter(function (s) { return s.id === id; })[0];
    if (!x) return;
    var fresh = S.searched.indexOf(id) < 0;
    if (fresh) S.searched.push(id);
    S.open = id;
    api.Snd.play(fresh && x.finds ? "camera" : "tap");
    save(); render();
    var d = box.querySelector(".ch-spot");
    if (d && fresh) d.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function ask(id) {
    var q = C.questions.filter(function (x) { return x.id === id; })[0];
    if (!q || asked(q) || !isOpen(q)) return;
    S.asked.push(q.id);
    if (S.heard.indexOf(q.says) < 0) S.heard.push(q.says);
    flash = q.says;
    api.Snd.play("pen");
    save(); render();
  }
  function press(id) {
    var key = S.who + ">" + id, pr = C.presses.filter(function (x) { return x.by === S.who && x.shown === id; })[0], p = person(S.who);
    sheet = false;
    if (S.pressed.indexOf(key) < 0) S.pressed.push(key);
    if (pr) {
      if (S.heard.indexOf(pr.says) < 0) S.heard.push(pr.says);
      flash = pr.says;
      api.Snd.play("stamp");
    } else {
      api.toast(esc(p.name.split(" ")[0]) + " doesn't know anything about that.", "", 2400);
      api.Snd.play("tap");
    }
    save(); render();
    var fresh = box.querySelector(".ch-qa.fresh");
    if (fresh) fresh.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function pickSt(id) {
    if (C.locked) return;
    var s = stOf(id);
    if (!s || s.by === S.hunchOut) return;
    S.pick = S.pick === id ? "" : id;
    api.Snd.play("pin");
    save(); render();
  }
  function pickProof(id) {
    if (C.locked) return;
    var i = S.proof.indexOf(id);
    if (i >= 0) S.proof.splice(i, 1);
    else { S.proof.push(id); while (S.proof.length > C.need) S.proof.shift(); }
    api.Snd.play("pin");
    save(); render();
  }
  function accuse() {
    if (C.locked || !ready()) return;
    C.locked = true;
    render();
    api.submit({ s: S.pick, p: S.proof.slice().sort().join(",") });
  }
  function onClick(e) {
    var b = e.target.closest("button");
    if (!b || !box.contains(b) || b.disabled || !C) return;
    var d = b.dataset;
    if (d.tab) tab(d.tab);
    else if (d.spot) search(d.spot);
    else if (d.who) { S.who = d.who; api.Snd.play("tap"); save(); render(); }
    else if (d.ask) ask(d.ask);
    else if (d.show) { sheet = true; api.Snd.play("folder"); render(); var c = box.querySelector(".ch-sheet button"); if (c) c.focus(); }
    else if (d.close) { sheet = false; render(); }
    else if (d.press) press(d.press);
    else if (d.st) pickSt(d.st);
    else if (d.pf) pickProof(d.pf);
    else if (d.accuse) accuse();
  }

  /* ---------- what game.js calls ---------- */
  function mount(a) {
    api = a; box = document.getElementById("chapter");
    box.addEventListener("click", onClick);
  }
  function open(c, st) {
    C = c; S = st; sheet = false; flash = ""; C.locked = false; C.rev = null;
    ["searched", "asked", "pressed", "heard", "proof"].forEach(function (k) { if (!Array.isArray(S[k])) S[k] = []; });
    S.tab = S.tab || "search"; S.who = C.people.indexOf(S.who) >= 0 ? S.who : C.people[0]; S.pick = S.pick || ""; S.open = S.open || "";
    render(); box.scrollTop = 0;
  }
  // the answer is in: show the lie and its proof, and lock the chapter
  function reveal(rev, right) {
    if (!C) return;
    C.locked = true; C.rev = rev; S.tab = "accuse"; sheet = false;
    render();
    var a = box.querySelector(".ch-st.is-answer");
    if (a) a.scrollIntoView({ block: "center" });
    return right;
  }
  function hunch(pid) {
    if (!C) return;
    S.hunchOut = pid;
    if (S.pick && stOf(S.pick).by === pid) S.pick = "";
    save(); render();
  }
  // keys while a chapter is open: 1-3 tabs, Esc closes the evidence sheet, Enter accuses when everything is picked
  function key(e) {
    if (!C) return false;
    if (/^[1-3]$/.test(e.key)) { tab(TABS[+e.key - 1][0]); return true; }
    if (e.key === "Escape" && sheet) { sheet = false; render(); return true; }
    if (e.key === "Enter" && S.tab === "accuse" && ready() && !C.locked && (!e.target || e.target.tagName !== "BUTTON")) { accuse(); return true; }
    return false;
  }
  function unlock() { if (C && !C.rev) { C.locked = false; render(); } } // the file couldn't be reached: try again

  window.WLChapter = { mount: mount, open: open, reveal: reveal, hunch: hunch, key: key, unlock: unlock, found: found, heard: heard,
    close: function () { C = null; S = null; sheet = false; if (box) box.innerHTML = ""; } };
})();
