/*
  LIARHUNT — the story checker, shared by the game and the owner's tools.
    WLStory.check(story)          a Daily 5 story: every case has exactly one answer (tools/daily5/WRITING.md)
    WLStory.docs(story, res)      a checked Daily 5 story as the documents the case screen reads (no answer keys)
    WLStory.checkBook(book, b1)   a Career book: every mission can be solved, evidence is found before it's needed.
                                  b1: Book 1's own rules too (5 chapters of 6, season names). The answer lock stays in check-book.mjs.
    WLStory.parse(text)           a player's pasted or uploaded file -> { ok, kind: "d5" | "career", story, errors, warnings }
  index.html loads it in the game; tools/daily5/lib.mjs and tools/check-book.mjs load it with node:vm.
  One file, so the owner's desk and the game can never disagree about what a good story is.
*/
(function () {
  "use strict";

  /* ================= Daily 5 ================= */
  // A fact ("claim" in a statement, "shows" in evidence, "facts" in a finding) is
  //   { slot, value, from, to, not }
  // slot: at:<person|item>  value: a place       (where someone or something was)
  //       holder:<item>     value: person|place|item (who or what had it)
  //       doer:<act>        value: a person      (who did it)
  //       state:<item|place> value: a word       (live, replay, shipped...)
  // Two facts clash when they share a slot, their times overlap, and they can't both be true
  // (different values, or one says "not" this value). One rule joins two facts:
  // if a person holds an item and the item was at a place, the person was at that place.
  const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  function mins(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
  function norm(f, src) { return { slot: f.slot, value: f.value, from: mins(f.from), to: mins(f.to || f.from), not: !!f.not, src }; }
  const overlap = (a, b) => a.from <= b.to && b.from <= a.to;
  // v2 stories may list walking times between places (tr: "l1|l2" -> minutes, ids sorted). Being at one place and
  // then another, too soon to have walked between them, is a clash too.
  function tooFast(a, b, tr) {
    if (!tr || a.not || b.not || a.value === b.value || !a.slot.startsWith("at:")) return false;
    const m = tr.get([a.value, b.value].sort().join("|"));
    if (!m) return false;
    return (a.from > b.to ? a.from - b.to : b.from - a.to) < m;
  }
  function clash(a, b, tr) {
    if (a.slot !== b.slot) return false;
    if (!overlap(a, b)) return tooFast(a, b, tr);
    if (a.not && b.not) return false;
    if (a.not || b.not) return a.value === b.value;
    return a.value !== b.value;
  }
  // the facts, plus what follows from "holder + where the item was"
  function closure(list, isPerson) {
    const out = list.slice();
    for (const h of list) {
      if (h.not || !h.slot.startsWith("holder:") || !isPerson(h.value)) continue;
      const item = h.slot.slice(7);
      for (const l of list) {
        if (l.not || l.slot !== "at:" + item || !overlap(h, l)) continue;
        out.push({ slot: "at:" + h.value, value: l.value, from: Math.max(h.from, l.from), to: Math.min(h.to, l.to), not: false, src: h.src + "+" + l.src });
      }
    }
    return out;
  }
  const covered = (f, truth) => f.not ? !truth.some((t) => clash(f, t)) : truth.some((t) => !t.not && t.slot === f.slot && t.value === f.value && t.from <= f.from && t.to >= f.to);
  function* subsets(items, max) {
    const n = items.length;
    for (let k = 1; k <= Math.min(max, n); k++) {
      const idx = Array.from({ length: k }, (_, i) => i);
      while (true) {
        yield idx.map((i) => items[i]);
        let i = k - 1;
        while (i >= 0 && idx[i] === n - k + i) i--;
        if (i < 0) break;
        idx[i]++;
        for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
      }
    }
  }

  const KINDS = ["cctv", "log", "document", "witness", "photo", "record", "phone", "object"];
  const ABOUT = ["mastermind", "accomplice", "route", "item", "motive", "other"];
  const LIMIT = { title: 44, intro: 460, previously: 280, ask: 90, says: 230, evTitle: 50, evSource: 50, evText: 220, why: 380, finding: 260, line: 140, finale: 1400, label: 48, background: 220, spotLabel: 28, spotText: 160 };
  // the six kinds of lie a v2 chapter names (WLArt.LIES draws them)
  const LIE_KINDS = ["time", "place", "travel", "seen", "holder", "count"];

  function check(story) {
    const errors = [], warnings = [];
    const err = (where, msg) => errors.push(`${where}: ${msg}`);
    const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
    const s = story || {};
    const str = (v, max, where, name, opt) => {
      if (typeof v !== "string" || (!opt && !v.trim())) { err(where, `${name} is missing`); return false; }
      if (v.length > max) err(where, `${name} is ${v.length} characters (max ${max})`);
      return true;
    };
    const ids = new Map();
    const addId = (id, kind, where, re) => {
      if (typeof id !== "string" || !re.test(id)) return err(where, `bad id "${id}" (expected ${re})`);
      if (ids.has(id)) return err(where, `id "${id}" is used twice`);
      ids.set(id, kind);
    };
    const obj = (x) => (x && typeof x === "object" ? x : {});

    if (typeof s.id !== "string" || !/^[a-z0-9][a-z0-9-]{2,40}$/.test(s.id)) err("story", "id must be 3-41 lowercase letters, digits or dashes");
    str(s.title, LIMIT.title, "story", "title");
    str(s.summary, 600, "story", "summary");
    if (!s.setting) err("story", "setting is missing");
    else { str(s.setting.place, 80, "setting", "place"); str(s.setting.intro, LIMIT.intro, "setting", "intro"); }
    const v2 = s.v === 2, art = (typeof window !== "undefined" && window.WLArt) || null;
    if (v2 && !art) err("story", "the art kit (js/art.js) isn't loaded, so scenes and icons can't be checked");
    if (v2 ? s.strikes !== 2 : !Number.isInteger(s.strikes) || s.strikes < 1 || s.strikes > 5) err("story", v2 ? "strikes must be 2 in a v2 story (one miss, then the Revive)" : "strikes must be 1 to 5");

    const people = (Array.isArray(s.people) ? s.people : []).map(obj);
    if (v2 ? people.length < 5 || people.length > 6 : people.length < 4 || people.length > 8) err("story", v2 ? "needs 5 or 6 people" : "needs 4 to 8 people");
    if (v2) {
      const faces = people.map((p) => p.face);
      faces.forEach((f, i) => { if (typeof f !== "string" || !/^f(0\d|1[0-5])$/.test(f)) err(`person ${people[i].id || i}`, `face must be f00 to f15 (has "${f}")`); });
      if (new Set(faces).size !== faces.length) err("story", "two people share a face");
    }
    people.forEach((p, i) => {
      const w = `person ${p.id || i}`;
      addId(p.id, "person", w, /^p\d{1,2}$/);
      str(p.name, 40, w, "name"); str(p.role, 40, w, "role"); str(p.background, LIMIT.background, w, "background");
      if (!["mastermind", "accomplice", "innocent"].includes(p.part)) err(w, "part must be mastermind, accomplice or innocent");
      str(p.motive, 240, w, "motive", true); str(p.secret, 240, w, "secret", true);
    });
    const masterminds = people.filter((p) => p.part === "mastermind");
    if (masterminds.length !== 1) err("story", "needs exactly one mastermind");
    if (people.filter((p) => p.part === "accomplice").length > 2) err("story", "at most two accomplices");
    const names = new Set(people.map((p) => p.name));
    if (names.size !== people.length) err("story", "people need different names");
    for (const [k, re, min, max] of [["places", /^l\d{1,2}$/, 2, 14], ["items", /^i\d{1,2}$/, 0, 12], ["acts", /^a\d{1,2}$/, 0, 12]]) {
      const list = (Array.isArray(s[k]) ? s[k] : []).map(obj);
      if (list.length < min || list.length > max) err("story", `needs ${min} to ${max} ${k}`);
      list.forEach((x, i) => { addId(x.id, k.slice(0, -1), `${k} ${x.id || i}`, re); str(x.name, 50, `${k} ${x.id}`, "name"); });
    }
    const kindOf = (id) => ids.get(id);
    const isPerson = (id) => kindOf(id) === "person";
    // walking times between places (v2): { a, b, mins }
    const tr = new Map();
    if (v2 && s.travel != null) {
      if (!Array.isArray(s.travel)) err("story", "travel must be a list of { a, b, mins }");
      else s.travel.map(obj).forEach((t, i) => {
        const w = `travel ${i + 1}`, key = [t.a, t.b].sort().join("|");
        if (kindOf(t.a) !== "place" || kindOf(t.b) !== "place" || t.a === t.b) err(w, "a and b must be two different place ids");
        else if (!Number.isInteger(t.mins) || t.mins < 1 || t.mins > 180) err(w, "mins must be 1 to 180");
        else if (tr.has(key)) err(w, "lists the same two places twice");
        else tr.set(key, t.mins);
      });
    }
    const cl = (a, b) => clash(a, b, tr);

    // a fact must use real ids, a known slot shape and real times
    const okFact = (f, where) => {
      if (!f || typeof f !== "object") return err(where, "fact is not an object"), false;
      const m = /^(at|holder|doer|state):(.+)$/.exec(typeof f.slot === "string" ? f.slot : "");
      if (!m) return err(where, `bad slot "${f.slot}"`), false;
      const [, rel, subj] = m, sk = kindOf(subj), vk = kindOf(f.value);
      const ok =
        rel === "at" ? (sk === "person" || sk === "item") && vk === "place"
        : rel === "holder" ? sk === "item" && ["person", "place", "item"].includes(vk)
        : rel === "doer" ? sk === "act" && vk === "person"
        : (sk === "item" || sk === "place") && /^[a-z]{2,16}$/.test(f.value || "");
      if (!ok) return err(where, `"${f.slot} = ${f.value}" doesn't fit (check the ids)`), false;
      if (!TIME.test(f.from || "") || !TIME.test(f.to || f.from || "")) return err(where, `bad time in ${f.slot} (use HH:MM, 24-hour)`), false;
      if (mins(f.to || f.from) < mins(f.from)) return err(where, `${f.slot}: "to" is before "from"`), false;
      return true;
    };
    // max keeps a pasted file from making the proof search run for minutes
    const facts = (list, where, src, need, max) => {
      if (!Array.isArray(list) || list.length < need) { err(where, `needs at least ${need} fact${need > 1 ? "s" : ""}`); return []; }
      if (list.length > (max || 8)) { err(where, `has ${list.length} facts (max ${max || 8})`); return []; }
      return list.filter((f, i) => okFact(f, `${where} fact ${i + 1}`)).map((f) => norm(f, src));
    };

    const truth = facts(s.truth, "truth", "truth", 6, 60);
    const truthAll = closure(truth, isPerson);
    for (let i = 0; i < truthAll.length; i++) for (let j = i + 1; j < truthAll.length; j++) {
      if (cl(truthAll[i], truthAll[j])) err("truth", `contradicts itself: ${show(truthAll[i])} vs ${show(truthAll[j])}`);
    }

    const cases = (Array.isArray(s.cases) ? s.cases : []).map(obj);
    if (cases.length !== 5) err("story", `needs exactly 5 cases (has ${cases.length})`);
    const findingOf = {}, evidenceOf = {}, proofs = {}, need = {}, kinds = {};
    const knownBefore = [];   // everything a player has seen before case n: earlier evidence and findings
    const liars = [];

    cases.slice(0, 5).forEach((c, k) => {
      const n = k + 1, w = `case ${n}`;
      if (c.n !== n) err(w, `n should be ${n}`);
      str(c.title, LIMIT.title, w, "title"); str(c.intro, LIMIT.intro, w, "intro"); str(c.ask, LIMIT.ask, w, "ask");
      str(c.previously, LIMIT.previously, w, "previously", n === 1);
      str(c.why, LIMIT.why, w, "why");
      let uses = Array.isArray(c.uses) ? c.uses : [];
      if (new Set(uses).size !== uses.length) err(w, "uses lists a finding twice");
      if (uses.length > 4) { err(w, "uses can list at most 4 findings"); uses = []; }
      uses = [...new Set(uses)];
      uses.forEach((f) => { if (!Object.prototype.hasOwnProperty.call(findingOf, f)) err(w, `uses "${f}", which isn't a finding from an earlier case`); });
      if (n === 1 && uses.length) err(w, "case 1 can't use earlier findings");
      if (n > 1 && n < 5 && !uses.length) err(w, "needs at least one finding from an earlier case (uses)");

      if (n === 5) {
        if (c.mode !== "verdict") err(w, 'case 5 must be mode "verdict"');
        if (uses.length < 2) err(w, "the verdict needs at least 2 earlier findings");
        const parts = (Array.isArray(c.parts) ? c.parts : []).map(obj);
        if (parts.length < 2 || parts.length > 4) err(w, "needs 2 to 4 verdict questions");
        if (v2 && (parts.length !== 4 || parts.map((q) => q.about).sort().join() !== "accomplice,item,mastermind,route")) err(w, "needs exactly 4 questions: mastermind, accomplice, route and item");
        const hasAccomplice = people.some((p) => p.part === "accomplice");
        const usedF = new Set();
        parts.forEach((q, j) => {
          const qw = `${w} question ${q.id || j + 1}`;
          addId(q.id, "question", qw, /^q\d$/);
          str(q.ask, LIMIT.ask, qw, "ask");
          if (!ABOUT.includes(q.about)) err(qw, `about must be one of ${ABOUT.join(", ")}`);
          const opts = Array.isArray(q.options) ? q.options : [];
          if (opts.length < 3 || opts.length > 5) err(qw, "needs 3 to 5 options");
          const oids = new Set();
          const nobody = (o) => v2 && q.about === "accomplice" && !!o && o.id === "none";
          opts.forEach((o) => { if (!o || typeof o.id !== "string" || (!/^[a-z]\d{1,2}$/.test(o.id) && !nobody(o)) || oids.has(o.id)) err(qw, `bad or repeated option id "${o && o.id}"`); oids.add(o && o.id); str(o && o.label, LIMIT.label, qw, "option label"); });
          if (v2 && (q.about === "route" || q.about === "item")) opts.forEach((o) => { if (!o || !art || !art.ICONS.includes(o.icon)) err(qw, `option ${o && o.id} needs an icon from the icon set`); });
          if (!oids.has(q.answer)) err(qw, `answer "${q.answer}" isn't one of the options`);
          if (q.about === "mastermind" && masterminds[0] && q.answer !== masterminds[0].id) err(qw, "the answer isn't the story's mastermind");
          if (q.about === "accomplice" && q.answer === "none" && v2) { if (hasAccomplice) err(qw, 'the answer is "none", but the story has an accomplice'); }
          else if (q.about === "accomplice" && kindOf(q.answer) !== "person") err(qw, "the answer must be a person");
          if (q.about === "accomplice" && isPerson(q.answer) && people.find((p) => p.id === q.answer).part !== "accomplice") err(qw, "the answer isn't an accomplice");
          if ((q.about === "mastermind" || q.about === "accomplice") && opts.some((o) => !isPerson(o && o.id) && !nobody(o))) err(qw, "every option must be a person id");
          const because = Array.isArray(q.because) ? q.because : [];
          if (!because.length || because.length > 4) err(qw, "needs 1 to 4 findings that prove it (because)");
          because.forEach((f) => { if (!Object.prototype.hasOwnProperty.call(findingOf, f)) err(qw, `because "${f}" isn't a finding from cases 1-4`); usedF.add(f); });
        });
        Object.keys(findingOf).forEach((f) => { if (!usedF.has(f)) warn(w, `finding ${f} isn't used by any verdict question, so that case matters less`); });
        return;
      }

      if (c.mode !== "liar") err(w, 'cases 1-4 must be mode "liar"');
      const sus = Array.isArray(c.suspects) ? c.suspects : [];
      if (sus.length < 3 || sus.length > 5) err(w, "needs 3 to 5 suspects");
      if (new Set(sus).size !== sus.length) err(w, "a suspect is listed twice");
      sus.forEach((p) => { if (!isPerson(p)) err(w, `suspect "${p}" isn't a person`); });
      const sts = (Array.isArray(c.statements) ? c.statements : []).map(obj);
      if (v2 ? sts.length < 8 || sts.length > 14 : sts.length !== sus.length) err(w, v2 ? "needs 8 to 14 statements" : "needs one statement per suspect, in the same order");
      const claimsOf = {};
      sts.forEach((st, j) => {
        const sw = `${w} statement ${st.id || j + 1}`;
        addId(st.id, "statement", sw, /^s\d{1,2}$/);
        if (v2 ? !sus.includes(st.by) : st.by !== sus[j]) err(sw, v2 ? `is by "${st.by}", who isn't a suspect in this case` : `is by "${st.by}" but suspect ${j + 1} is "${sus[j]}"`);
        str(st.text, LIMIT.says, sw, "text");
        claimsOf[st.id] = facts(st.claims, sw, st.id, 1);
      });
      const ev = (Array.isArray(c.evidence) ? c.evidence : []).map(obj);
      if (v2 ? ev.length < 5 || ev.length > 8 : ev.length < 2 || ev.length > 6) err(w, v2 ? "needs 5 to 8 pieces of evidence" : "needs 2 to 6 pieces of evidence");
      const pane = [];
      ev.forEach((e, j) => {
        const ew = `${w} evidence ${e.id || j + 1}`;
        addId(e.id, "evidence", ew, /^e\d{1,2}$/);
        if (!KINDS.includes(e.kind)) err(ew, `kind must be one of ${KINDS.join(", ")}`);
        str(e.title, LIMIT.evTitle, ew, "title"); str(e.source, LIMIT.evSource, ew, "source"); str(e.text, LIMIT.evText, ew, "text");
        if (e.time && !TIME.test(e.time)) err(ew, "time must be HH:MM or empty");
        const sh = facts(e.shows, ew, e.id, 1);
        sh.forEach((f) => { if (!covered(f, truthAll)) err(ew, `shows ${show(f)}, which the truth doesn't back`); });
        evidenceOf[e.id] = sh;
        pane.push({ id: e.id, facts: sh });
      });
      uses.forEach((f) => { if (findingOf[f]) pane.push({ id: f, facts: findingOf[f] }); });
      if (v2) v2Chapter(c, w, sus, sts, ev, uses);

      if (!Object.prototype.hasOwnProperty.call(claimsOf, c.answer)) err(w, `answer "${c.answer}" isn't one of this case's statements`);
      else {
        if (!claimsOf[c.answer].some((f) => truthAll.some((t) => cl(f, t)))) err(w, `the answer ${c.answer} doesn't lie: none of its claims goes against the truth`);
        liars.push(sts.find((x) => x.id === c.answer).by);
      }
      sts.forEach((st) => {
        if (st.id === c.answer) return;
        (claimsOf[st.id] || []).forEach((f) => { if (!covered(f, truthAll)) err(w, `${st.id} isn't the liar but says ${show(f)}, which the truth doesn't back. Only the liar may lie.`); });
      });

      // exactly one statement is caught by what the player knows
      const known = closure(knownBefore.concat(...ev.map((e) => evidenceOf[e.id] || [])), isPerson);
      const caught = sts.filter((st) => (claimsOf[st.id] || []).some((f) => known.some((a) => cl(f, a)))).map((st) => st.id);
      if (caught.length === 0) err(w, "nothing the player knows catches the liar");
      else if (caught.length > 1 || caught[0] !== c.answer) err(w, `the facts catch ${caught.join(" and ")}, but the answer is ${c.answer}. Exactly the liar must be caught.`);

      // proofs: the smallest sets of facts on screen (this case's evidence + carried findings) that catch the liar
      const lie = claimsOf[c.answer] || [];
      const found = [];
      for (const set of subsets(pane, 3)) {
        if (found.some((f) => f.every((id) => set.some((x) => x.id === id)))) continue; // has a smaller proof inside
        const all = closure([].concat(...set.map((x) => x.facts)), isPerson);
        if (lie.some((f) => all.some((a) => cl(f, a)))) found.push(set.map((x) => x.id).sort());
      }
      if (!found.length && caught[0] === c.answer) err(w, "the liar can be caught, but not with the facts on this case's screen (add the evidence, or carry the finding in uses)");
      if (found.length && new Set(found.map((f) => f.length)).size > 1) err(w, `proofs of different sizes (${found.map((f) => f.join("+")).join(", ")}). Every proof must need the same number of facts.`);
      if (n > 1 && found.some((f) => !f.some((id) => findingOf[id]))) err(w, `can be proven without any earlier finding (${found.filter((f) => !f.some((id) => findingOf[id])).map((f) => f.join("+")).join(", ")}). Each case must build on the one before.`);
      if (found.length > 3) warn(w, `${found.length} different proofs work; fewer is clearer`);
      proofs[n] = found; need[n] = found.length ? found[0].length : 0;
      if (v2 && LIE_KINDS.includes(c.lie) && lie.length) {
        // what catches it: a plain clash (same slot, same time), or only a walking time
        const plain = lie.some((f) => known.some((a) => clash(f, a)));
        const fast = lie.some((f) => known.some((a) => !clash(f, a) && cl(f, a)));
        if (c.lie === "travel" && !(fast && !plain)) err(w, `lie is "travel", but ${c.answer} is caught without a walking time`);
        if (c.lie !== "travel" && !plain && fast) err(w, `${c.answer} is only caught by a walking time, so its lie is "travel"`);
        if (c.lie === "holder" && !lie.some((f) => f.slot.startsWith("holder:") && known.some((a) => clash(f, a)))) err(w, `lie is "holder", but ${c.answer} isn't caught on who had something`);
        kinds[n] = c.lie;
      }

      // the finding this case adds to the notebook
      const fd = obj(c.finding);
      addId(fd.id, "finding", `${w} finding`, /^f\d{1,2}$/);
      str(fd.text, LIMIT.finding, `${w} finding`, "text");
      const ff = facts(fd.facts, `${w} finding`, fd.id, 1);
      ff.forEach((f) => { if (!covered(f, truthAll)) err(`${w} finding`, `${show(f)} isn't backed by the truth`); });
      if (typeof fd.id === "string") findingOf[fd.id] = ff;
      const tl = Array.isArray(c.timeline) ? c.timeline : [];
      if (!tl.length || tl.length > 6) err(w, "needs 1 to 6 timeline lines");
      tl.slice(0, 6).map(obj).forEach((t, j) => { if (!TIME.test(t.at || "")) err(`${w} timeline ${j + 1}`, "bad time"); str(t.text, LIMIT.line, `${w} timeline ${j + 1}`, "text"); });
      knownBefore.push(...ev.map((e) => evidenceOf[e.id] || []).flat(), ...ff);
    });

    if (liars.length === 4) {
      const most = Math.max(...liars.map((p) => liars.filter((x) => x === p).length));
      if (most >= 3) warn("story", "the same person is the liar in 3 or more cases");
      if (masterminds[0] && liars[0] === masterminds[0].id) warn("story", "the mastermind is caught in case 1, which gives the ending away early");
    }

    // the ending
    const fin = obj(s.finale);
    str(fin.text, LIMIT.finale, "finale", "text");
    const chron = (Array.isArray(fin.chronology) ? fin.chronology : []).map(obj);
    if (chron.length < 5 || chron.length > 20) err("finale", "needs 5 to 20 chronology lines");
    chron.slice(0, 20).forEach((t, j) => {
      if (!TIME.test(t.at || "")) err(`finale line ${j + 1}`, "bad time");
      str(t.text, LIMIT.line, `finale line ${j + 1}`, "text");
      if (!Number.isInteger(t.case) || t.case < 0 || t.case > 5) err(`finale line ${j + 1}`, "case must be 0-5 (0 = not found in a case)");
      if (j && TIME.test(t.at || "") && TIME.test(chron[j - 1].at || "") && mins(t.at) < mins(chron[j - 1].at)) err(`finale line ${j + 1}`, "chronology is out of order");
    });

    // nothing private may show up early: case n's story text (intro, ask, recap) can't repeat what case n or later
    // reveals, unless the player can already read it in the evidence and statements so far
    if (cases.length === 5) {
      let seen = "";
      for (let n = 1; n <= 5; n++) {
        const c0 = cases[n - 1];
        seen += " \n " + factText(c0);
        const story = [c0.title, c0.intro, c0.previously, c0.ask, n === 1 && s.setting ? s.setting.intro : ""].filter((x) => typeof x === "string" && x).join(" \n ");
        const later = [];
        for (let m = n; m <= 5; m++) { const c = cases[m - 1]; later.push(c.why || ""); if (c.finding) later.push(c.finding.text || ""); (Array.isArray(c.timeline) ? c.timeline : []).forEach((t) => later.push((t && t.text) || "")); }
        later.push(fin.text || ""); chron.forEach((t) => later.push(t.text || ""));
        const hit = sharedPhrase(story, later.join(" \n "), seen);
        if (hit) err(`case ${n}`, `its story text gives away "${hit}", which is only revealed later`);
        seen += " \n " + story;
      }
      // plain English: long sentences are hard on a phone
      cases.forEach((c, k) => {
        for (const sent of sentences(publicText(c))) {
          const words = sent.split(/\s+/).filter(Boolean).length;
          if (words > 30) warn(`case ${k + 1}`, `long sentence (${words} words): "${sent.slice(0, 60)}..."`);
        }
      });
    }
    if (v2 && Object.keys(kinds).length === 4 && new Set(Object.values(kinds)).size < 4) warn("story", `uses ${new Set(Object.values(kinds)).size} kinds of lie; use at least 4 across the four cases`);
    return { ok: errors.length === 0, errors, warnings, proofs, need, kinds };

    // A v2 chapter: a drawn scene with spots to search, questions per suspect, presses (showing someone evidence),
    // and the rule that the lie is only heard after finding evidence, so the player has to investigate.
    function v2Chapter(c, w, sus, sts, ev, uses) {
      const scene = art && art.SCENES[c.scene];
      if (!scene) err(w, `scene "${c.scene}" isn't one of the drawn scenes${art ? " (" + Object.keys(art.SCENES).join(", ") + ")" : ""}`);
      if (!TIME.test(c.time || "")) err(w, "time must be HH:MM (when the scene is searched)");
      const evIds = new Set(ev.map((e) => e.id));
      const spots = (Array.isArray(c.spots) ? c.spots : []).map(obj);
      if (spots.length < 7 || spots.length > 10) err(w, "needs 7 to 10 spots to search");
      const anchors = new Set(), findsOf = {};
      spots.forEach((x, j) => {
        const xw = `${w} spot ${x.id || j + 1}`;
        addId(x.id, "spot", xw, /^x\d{1,2}$/);
        if (scene && !Object.prototype.hasOwnProperty.call(scene.anchors, x.anchor)) err(xw, `anchor "${x.anchor}" isn't in the ${c.scene} scene (${Object.keys(scene.anchors).join(", ")})`);
        if (anchors.has(x.anchor)) err(xw, `anchor "${x.anchor}" is used twice`);
        anchors.add(x.anchor);
        if (art && !art.ICONS.includes(x.icon)) err(xw, `icon "${x.icon}" isn't in the icon set`);
        str(x.label, LIMIT.spotLabel, xw, "label"); str(x.text, LIMIT.spotText, xw, "text");
        if (x.finds) { if (!evIds.has(x.finds)) err(xw, `finds "${x.finds}", which isn't this case's evidence`); else findsOf[x.finds] = (findsOf[x.finds] || 0) + 1; }
      });
      ev.forEach((e) => { if (findsOf[e.id] !== 1) err(w, `evidence ${e.id} must be found by exactly one spot`); });
      if (spots.filter((x) => !x.finds).length < 2) err(w, "at least 2 spots must find nothing");

      const stBy = {}, heard = {};
      sts.forEach((st) => { stBy[st.id] = st.by; heard[st.id] = 0; });
      const qs = (Array.isArray(c.questions) ? c.questions : []).map(obj), per = {};
      qs.forEach((q, j) => {
        const qw = `${w} question ${q.id || j + 1}`;
        addId(q.id, "ask", qw, /^k\d{1,2}$/);
        if (!sus.includes(q.by)) err(qw, `is asked of "${q.by}", who isn't a suspect here`);
        per[q.by] = (per[q.by] || 0) + 1;
        str(q.ask, LIMIT.ask, qw, "ask");
        if (!Array.isArray(q.needs)) err(qw, "needs must be a list of evidence ids (empty when it's open from the start)");
        else q.needs.forEach((id) => { if (!evIds.has(id)) err(qw, `needs "${id}", which isn't this case's evidence`); });
        if (!Object.prototype.hasOwnProperty.call(stBy, q.says)) err(qw, `says "${q.says}", which isn't one of this case's statements`);
        else { heard[q.says]++; if (stBy[q.says] !== q.by) err(qw, `says ${q.says}, which is by ${stBy[q.says]}, not ${q.by}`); }
      });
      sus.forEach((p) => { const k = per[p] || 0; if (k < 2 || k > 3) err(w, `${p} needs 2 or 3 questions (has ${k})`); });
      const prs = (Array.isArray(c.presses) ? c.presses : []).map(obj), shownOk = new Set([...evIds, ...uses]), pairs = new Set();
      if (prs.length < 1 || prs.length > 4) err(w, "needs 1 to 4 presses (showing a suspect a piece of evidence)");
      prs.forEach((pr, j) => {
        const pw = `${w} press ${j + 1}`;
        if (!sus.includes(pr.by)) err(pw, `press of "${pr.by}", who isn't a suspect here`);
        if (!shownOk.has(pr.shown)) err(pw, `press shows "${pr.shown}", which isn't this case's evidence or a finding it uses`);
        if (pairs.has(pr.by + ">" + pr.shown)) err(pw, "the same press is listed twice");
        pairs.add(pr.by + ">" + pr.shown);
        if (!Object.prototype.hasOwnProperty.call(stBy, pr.says)) err(pw, `press says "${pr.says}", which isn't one of this case's statements`);
        else { heard[pr.says]++; if (stBy[pr.says] !== pr.by) err(pw, `press says ${pr.says}, which is by ${stBy[pr.says]}, not ${pr.by}`); }
      });
      sts.forEach((st) => { if (heard[st.id] !== 1) err(w, `${st.id} must be heard through exactly one question or press (it is heard ${heard[st.id]} times)`); });
      const liar = stBy[c.answer];
      if (liar && prs.length && !prs.some((pr) => pr.by !== liar)) err(w, "at least one press must be of a suspect who isn't the liar (innocent people react too)");
      const viaQ = qs.find((q) => q.says === c.answer);
      if (viaQ && !(Array.isArray(viaQ.needs) && viaQ.needs.length)) err(w, `the lie (${c.answer}) must be heard only after finding evidence, but its question needs nothing`);
      if (!LIE_KINDS.includes(c.lie)) err(w, `lie must be one of ${LIE_KINDS.join(", ")}`);
    }
  }
  function show(f) { const t = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); return `${f.slot} ${f.not ? "≠" : "="} ${f.value} @ ${t(f.from)}${f.to !== f.from ? "-" + t(f.to) : ""}`; }
  const text = (x) => (typeof x === "string" ? x : "");
  const list = (x) => (Array.isArray(x) ? x : []).filter((y) => y && typeof y === "object");
  function publicText(c, setting) {
    const out = [c.title, c.intro, c.previously, c.ask];
    if (setting) out.push(setting.intro);
    list(c.statements).forEach((s) => out.push(s.text));
    list(c.evidence).forEach((e) => out.push(e.title, e.source, e.text));
    list(c.spots).forEach((x) => out.push(x.label, x.text));
    list(c.questions).forEach((q) => out.push(q.ask));
    list(c.parts).forEach((q) => { out.push(q.ask); list(q.options).forEach((o) => out.push(o.label)); });
    return out.map(text).filter(Boolean).join(" \n ");
  }
  function factText(c) {
    return [].concat(list(c.statements).map((s) => text(s.text)), list(c.evidence).map((e) => text(e.title) + " \n " + text(e.text)),
      list(c.spots).map((x) => text(x.label) + " \n " + text(x.text)), list(c.questions).map((q) => text(q.ask))).join(" \n ");
  }
  const words = (t) => t.toLowerCase().replace(/[^a-z0-9:' \n]+/g, " ").split(/\s+/).filter(Boolean);
  const grams = (t, n) => { const w = words(t), set = new Set(); for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(" ")); return set; };
  // a 6-word phrase found in both a and b, and not already public (in "known")
  function sharedPhrase(a, b, known, n = 6) {
    const inB = grams(b, n), inKnown = grams(known || "", n);
    for (const p of grams(a, n)) if (inB.has(p) && !inKnown.has(p)) return p;
    return "";
  }
  // (no lookbehind in the regex: older Safari can't parse it, and one bad regex would stop the whole game script)
  function sentences(t) { return t.replace(/([.!?])\s+/g, "$1\n").split("\n").map((x) => x.trim()).filter(Boolean); }

  // The answer for a proof or a verdict, written the same way in the tools, the rules and the game.
  const proofKey = (ids) => ids.slice().sort().join(",");
  const verdictKey = (picks) => Object.keys(picks).sort().map((q) => q + "=" + picks[q]).join(";");

  // A checked story as the documents the case screen reads: the edition, each case, each reveal, the finale.
  // lib.mjs adds what only the owner's tools need (day, hash, Hunch, answer keys).
  function docs(story, res) {
    res = res || check(story);
    const person = (id) => story.people.find((p) => p.id === id);
    const caseOfFinding = {};
    story.cases.forEach((c) => { if (c.finding) caseOfFinding[c.finding.id] = c; });
    const v2 = story.v === 2;
    const carried = (fid) => { const c = caseOfFinding[fid]; return { id: fid, kind: "finding", title: v2 ? "Chapter " + c.n + " finding" : "From Case " + c.n, source: "Your notebook", time: "", text: c.finding.text, from: c.n }; };
    const out = {
      edition: {
        title: story.title, place: story.setting.place, intro: story.setting.intro, strikes: story.strikes,
        cast: story.people.map((p) => Object.assign({ id: p.id, name: p.name, role: p.role, background: p.background }, v2 ? { face: p.face } : {})),
        cases: story.cases.map((c) => Object.assign({ n: c.n, title: c.title }, v2 && c.scene ? { scene: c.scene } : {}))
      },
      cases: {}, reveals: {},
      finale: { text: story.finale.text, chronology: story.finale.chronology }
    };
    if (v2) out.edition.fmt = 2;
    story.cases.forEach((c) => {
      const n = c.n;
      if (c.mode === "verdict") {
        out.cases[n] = { n, mode: "verdict", title: c.title, intro: c.intro, previously: c.previously, ask: c.ask,
          facts: c.uses.map(carried),
          parts: c.parts.map((q) => ({ id: q.id, ask: q.ask, options: q.options.map((o) => {
            const x = { id: o.id, label: o.label };
            if (v2 && person(o.id)) x.face = person(o.id).face;
            if (v2 && o.icon) x.icon = o.icon;
            return x;
          }) })) };
        if (v2) out.cases[n].fmt = 2;
        const picks = {}; c.parts.forEach((q) => { picks[q.id] = q.answer; });
        out.reveals[n] = { n, answer: { s: verdictKey(picks), parts: picks, p: [] }, why: c.why,
          because: Object.fromEntries(c.parts.map((q) => [q.id, q.because])), timeline: [] };
        return;
      }
      if (v2) {
        // everything a player can find, ask and hear in this chapter; the answer and the proofs stay in the reveal and the keys
        out.cases[n] = { n, fmt: 2, mode: "liar", title: c.title, intro: c.intro, previously: c.previously || "", ask: c.ask, need: res.need[n],
          scene: c.scene, time: c.time, suspects: c.suspects.slice(),
          spots: c.spots.map((x) => ({ id: x.id, anchor: x.anchor, icon: x.icon, label: x.label, text: x.text, finds: x.finds || "" })),
          evidence: c.evidence.map((e) => ({ id: e.id, kind: e.kind, title: e.title, source: e.source, time: e.time || "", text: e.text })),
          carried: c.uses.map(carried),
          questions: c.questions.map((q) => ({ id: q.id, by: q.by, ask: q.ask, needs: q.needs.slice(), says: q.says })),
          presses: c.presses.map((x) => ({ by: x.by, shown: x.shown, says: x.says })),
          statements: c.statements.map((x) => ({ id: x.id, by: x.by, text: x.text })) };
        out.reveals[n] = { n, answer: { s: c.answer, p: res.proofs[n].map(proofKey) }, why: c.why, lie: c.lie, finding: { id: c.finding.id, text: c.finding.text }, timeline: c.timeline };
        return;
      }
      out.cases[n] = { n, mode: "liar", title: c.title, intro: c.intro, previously: c.previously || "", ask: c.ask, need: res.need[n],
        suspects: c.suspects.map((pid, j) => ({ id: pid, name: person(pid).name, role: person(pid).role, sid: c.statements[j].id, says: c.statements[j].text })),
        facts: c.evidence.map((e) => ({ id: e.id, kind: e.kind, title: e.title, source: e.source, time: e.time || "", text: e.text })).concat(c.uses.map(carried)) };
      // proofs are written "e7,f2" (Firestore can't store an array inside an array)
      out.reveals[n] = { n, answer: { s: c.answer, p: res.proofs[n].map(proofKey) }, why: c.why, finding: { id: c.finding.id, text: c.finding.text }, timeline: c.timeline };
    });
    return out;
  }

  /* ================= Career ================= */
  const PER = 6, STEPS = ["search", "talk", "timeline", "compare", "link", "accuse", "think"];
  const ID = /^[A-Za-z0-9_-]{1,24}$/;
  const own = (o, k) => !!o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
  const isObj = (o) => !!o && typeof o === "object" && !Array.isArray(o);

  // -> { problems: ["where: what"], lock: { mission: [its answers] } }
  function checkBook(B, b1, seasons) {
    const problems = [], lock = {};
    const fail = (where, msg) => { problems.push(`${where}: ${msg}`); };
    const long = (where, t, max) => { if (typeof t !== "string" || !t.trim()) fail(where, "missing text"); else if (t.length > max) fail(where, `text is ${t.length} characters (max ${max}): "${t.slice(0, 50)}..."`); };
    const short = (where, t, max) => { if (t != null && (typeof t !== "string" || t.length > max)) fail(where, `must be text of at most ${max} characters`); };
    const arr = (v, where, name) => { if (Array.isArray(v)) return v; fail(where, `${name} must be a list`); return []; };
    const id = (where, x) => { if (typeof x !== "string" || !ID.test(x)) fail(where, `bad id "${x}" (use 1 to 24 letters, digits, - or _)`); };
    if (!isObj(B)) { fail("story", "isn't a story object"); return { problems, lock }; }
    const people = isObj(B.people) ? B.people : (fail("story", "people is missing"), {});
    const evidence = isObj(B.evidence) ? B.evidence : (fail("story", "evidence is missing"), {});
    const chapters = arr(B.chapters, "story", "chapters"), missions = arr(B.missions, "story", "missions");

    if (b1) {
      if (missions.length % PER || missions.length / PER !== chapters.length) fail("book", `${missions.length} missions don't make ${chapters.length} chapters of ${PER}`);
    } else {
      long("story title", B.title, 44); long("story tagline", B.tagline, 200);
      if (chapters.length !== 1) fail("story", `needs exactly one chapter (has ${chapters.length})`);
      if (missions.length < 3 || missions.length > PER) fail("story", `needs 3 to ${PER} missions (has ${missions.length})`);
    }
    const titles = new Set();
    chapters.forEach((c, i) => {
      const w = `chapter ${i + 1}`;
      if (!isObj(c)) return fail(w, "isn't an object");
      titles.add(c.title);
      long(w, c.intro, 360);
      if (i < chapters.length - 1) long(w + " outro", c.outro, 360);
      if (b1 ? !c.title || !c.badge || !c.icon : !c.title || !c.icon) fail(w, b1 ? "needs a title, badge and icon" : "needs a title and an icon");
      short(w + " title", c.title, 40); short(w + " icon", c.icon, 8); short(w + " badge", c.badge, 40); short(w + " outro", c.outro, 360);
    });
    Object.keys(evidence).forEach((k) => {
      const e = evidence[k], w = `evidence ${k}`;
      id(w, k);
      if (!Array.isArray(e) || e.length !== 3) return fail(w, "needs [icon, name, text]");
      short(w + " icon", e[0], 8); long(w, e[2], 260); long(w + " name", e[1], 28);
    });
    // Story characters must not share a first name with the Daily season casts (a local's name always means that local).
    const seasonNames = new Set((b1 && seasons || []).flatMap((s) => (s.cast || []).map((c) => c[0])));
    Object.keys(people).forEach((k) => {
      const p = people[k], w = `person ${k}`;
      id(w, k);
      if (!isObj(p)) return fail(w, "isn't an object");
      long(w + " name", p.name, 40); long(w + " role", p.role, 40); short(w + " org", p.org, 8);
      if (p.notes != null && (!Array.isArray(p.notes) || p.notes.some((x) => !Array.isArray(x) || typeof x[0] !== "number" || typeof x[1] !== "string" || x[1].length > 200))) fail(w, "notes must be a list of [mission, text]");
      if (b1 && !p.org && typeof p.name === "string" && seasonNames.has(p.name.split(" ")[0])) fail(w, `"${p.name}" shares a first name with a season local`);
    });

    const have = new Set(), givenAt = {}, used = new Set();
    const person = (where, x) => { if (!own(people, x)) fail(where, `unknown person "${x}"`); };
    const give = (where, ids) => arr(ids == null ? [] : ids, where, "gives").forEach((x) => {
      if (!own(evidence, x)) return fail(where, `gives unknown evidence "${x}"`);
      if (have.has(x)) fail(where, `gives "${x}" again (first given in ${givenAt[x]})`);
      have.add(x); givenAt[x] = where;
    });
    const need = (where, ids, what) => arr(ids == null ? [] : ids, where, what).forEach((x) => {
      used.add(x);
      if (!own(evidence, x)) fail(where, `${what}: unknown evidence "${x}"`);
      else if (!have.has(x)) fail(where, `${what}: "${x}" isn't found until ${givenAt[x] || "never"}`);
    });
    const texts = (where, list, n, max) => list.forEach((x) => { if (!Array.isArray(x)) fail(where, "each entry must be a list"); else long(where, x[n], max); });

    missions.forEach((m, mi) => {
      const n = mi + 1, at = `mission ${n} "${isObj(m) ? m.title : ""}"`;
      if (!isObj(m)) return fail(at, "isn't an object");
      if (titles.has(m.title)) fail(at, "title is used twice (or matches a chapter)");
      titles.add(m.title);
      long(at + " title", m.title, 40); long(at + " brief", m.brief, 620); long(at + " goal", m.goal, 90);
      if (n < missions.length) long(at + " outro", m.outro, 200); else short(at + " outro", m.outro, 200);
      arr(m.cast == null ? [] : m.cast, at, "cast").forEach((p) => person(at, p));
      give(at, m.gives);
      const steps = arr(m.steps, at, "steps");
      if (!steps.length || steps.length > 4) fail(at, "needs 1 to 4 steps");
      const lastStep = steps[steps.length - 1];
      if ((b1 ? n % PER === 0 : n === missions.length) && (!lastStep || lastStep.type !== "accuse")) fail(at, b1 ? "a chapter finale ends with an accusation" : "the last mission must end with an accusation");
      const answers = [];
      steps.forEach((k, ki) => {
        const w = `${at} step ${ki + 1} (${isObj(k) ? k.type : "?"})`;
        if (!isObj(k) || !STEPS.includes(k.type)) return fail(w, "unknown step type");
        long(w + " title", k.title, 40); long(w + " ask", k.ask, 200); long(w + " done", k.done, 320);
        const ask = typeof k.ask === "string" ? k.ask : "";
        if (k.type === "search") {
          const items = arr(k.items, w, "items").filter((i) => Array.isArray(i) || fail(w, "each item must be [id, icon, name, look, 1 or 0]"));
          const ids = new Set(items.map((i) => i[0])), keys = items.filter((i) => i[4]);
          if (ids.size !== items.length) fail(w, "item ids repeat");
          if (items.length < 5 || items.length > 9) fail(w, "needs 5 to 9 items");
          if (!keys.length || items.length - keys.length < 2) fail(w, "needs at least 1 clue and 2 things that aren't");
          if (!ask.includes(String(keys.length))) fail(w, `the question should say how many to mark (${keys.length})`);
          items.forEach((i) => { id(w + " item", i[0]); short(w + " item icon", i[1], 8); long(w + " item", i[2], 28); long(w + " look", i[3], 150); });
          answers.push(keys.map((i) => i[0]).sort());
        } else if (k.type === "talk") {
          person(w, k.who);
          need(w, k.pool, "evidence tray");
          const pool = Array.isArray(k.pool) ? k.pool : [];
          long(w + " intro", k.intro, 220); long(w + " wrong", k.wrong, 200);
          const qs = arr(k.qs, w, "qs").filter((q) => isObj(q) || fail(w, "each question must be an object"));
          const brs = arr(k.breaks, w, "breaks").filter((b) => isObj(b) || fail(w, "each break must be an object"));
          const says = new Map(), qids = new Set(qs.map((q) => q.id)), bids = new Set(brs.map((b) => b.id));
          if (qids.size !== qs.length) fail(w, "question ids repeat");
          qs.forEach((q) => {
            id(w + " question", q.id);
            long(w + " question", q.q, 70);
            if (q.after != null && !qids.has(q.after) && !bids.has(q.after)) fail(w, `question "${q.id}" waits for unknown "${q.after}"`);
            arr(q.a, w, `question "${q.id}" answers`).forEach((x) => {
              if (!Array.isArray(x)) return fail(w, "each answer must be [id, text]");
              id(w + " statement", x[0]);
              if (says.has(x[0])) fail(w, `statement "${x[0]}" repeats`);
              says.set(x[0], q); long(w + " statement", x[1], 220);
            });
          });
          if (!brs.length) fail(w, "needs at least one statement to break");
          brs.forEach((b) => {
            id(w + " break", b.id);
            const bs = arr(b.s, w, `break "${b.id}" statements`), be = arr(b.ev, w, `break "${b.id}" evidence`);
            long(w + " reaction", b.react, 460);
            if (!bs.length || bs.some((s) => !says.has(s))) fail(w, `break "${b.id}" points at an unknown statement`);
            if (bs.length && bs.every((s) => says.get(s) && says.get(s).after === b.id)) fail(w, `break "${b.id}" can only be heard after itself`);
            if (!be.length || be.some((e) => !pool.includes(e))) fail(w, `break "${b.id}" needs evidence that's in the tray`);
          });
          if (pool.length < brs.length + 2) fail(w, "the evidence tray needs at least 2 wrong choices");
          answers.push(brs.map((b) => [b.s, b.ev]));
          brs.forEach((b) => give(w, b.gives));
        } else if (k.type === "timeline") {
          const events = arr(k.events, w, "events").filter((e) => Array.isArray(e) || fail(w, "each event must be [id, text, time]"));
          if (events.length < 4 || events.length > 8) fail(w, "needs 4 to 8 events");
          if (new Set(events.map((e) => e[0])).size !== events.length) fail(w, "event ids repeat");
          events.forEach((e) => { id(w + " event", e[0]); long(w + " event", e[1], 100); short(w + " event time", e[2], 16); });
          answers.push(events.map((e) => e[0]));
        } else if (k.type === "compare") {
          const docsL = arr(k.docs, w, "docs").filter((d) => isObj(d) || fail(w, "each document must be an object"));
          const rows = docsL.flatMap((d) => arr(d.rows, w, "rows").filter((r) => Array.isArray(r) || fail(w, "each row must be [id, label, text]")));
          const ids = new Set(rows.map((r) => r[0])), answer = arr(k.answer, w, "answer");
          if (!docsL.length || docsL.length > 3) fail(w, "needs 1 to 3 documents");
          docsL.forEach((d) => { long(w + " document", d.title, 60); const rs = Array.isArray(d.rows) ? d.rows.filter(Array.isArray) : []; if (new Set(rs.map((r) => r[0])).size !== rs.length) fail(w, `row ids repeat in "${d.title}"`); });
          rows.forEach((r) => { id(w + " row", r[0]); long(w + " row", r[1], 30); long(w + " row", r[2], 120); });
          if (!answer.length || answer.some((a) => !ids.has(a))) fail(w, "the answer points at a missing row");
          if (ids.size - new Set(answer).size < 2) fail(w, "needs at least 2 rows that aren't the answer");
          if (answer.length > 1 && !ask.includes(String(answer.length))) fail(w, `the question should say how many lines to tap (${answer.length})`);
          answers.push([...answer].sort());
        } else if (k.type === "link") {
          const left = arr(k.left, w, "left").filter((x) => Array.isArray(x) || fail(w, "each left item must be [id, text]"));
          const right = arr(k.right, w, "right").filter((x) => Array.isArray(x) || fail(w, "each right item must be [id, text]"));
          const pairs = isObj(k.pairs) ? k.pairs : (fail(w, "pairs is missing"), {});
          const L = new Set(left.map((x) => x[0])), R = new Set(right.map((x) => x[0]));
          left.forEach((x) => { id(w + " left", x[0]); long(w + " left", x[1], 80); });
          right.forEach((x) => { id(w + " right", x[0]); long(w + " right", x[1], 100); short(w + " right", x[2], 60); });
          if (L.size !== left.length || R.size !== right.length) fail(w, "item ids repeat");
          if (!left.length || Object.keys(pairs).length !== L.size || [...L].some((l) => !own(pairs, l) || !R.has(pairs[l]))) fail(w, "every left item needs one partner on the right");
          if (R.size - new Set(Object.values(pairs)).size < 1) fail(w, "needs at least one right-hand item that isn't a match");
          answers.push(pairs);
        } else if (k.type === "accuse") {
          const who = arr(k.who, w, "who"), pool = arr(k.pool, w, "pool"), proof = arr(k.proof, w, "proof");
          who.forEach((p) => person(w, p));
          if (!who.includes(k.answer) || who.length < 3) fail(w, "needs 3+ people, the answer among them");
          if (new Set(who).size !== who.length) fail(w, "a person is listed twice");
          need(w, pool, "evidence");
          if (proof.some((p) => !pool.includes(p))) fail(w, "proof evidence must be in the pool");
          if (!(Number.isInteger(k.need) && k.need >= 1 && k.need <= proof.length)) fail(w, "need must be between 1 and the number of valid proofs");
          if (pool.length - proof.length < 2) fail(w, "the pool needs at least 2 wrong choices");
          long(w + " proof question", k.proofAsk, 200);
          if (!String(k.proofAsk).includes(String(k.need))) fail(w, `the proof question should say how many to pick (${k.need})`);
          if (k.motive != null) {
            const mo = isObj(k.motive) ? k.motive : {}, opts = arr(mo.options, w, "motive options");
            long(w + " motive", mo.ask, 120);
            if (opts.length < 2 || opts.length > 4) fail(w, "the motive needs 2 to 4 options");
            opts.forEach((o) => long(w + " motive option", o, 120));
            if (!(Number.isInteger(mo.answer) && mo.answer >= 0 && mo.answer < opts.length)) fail(w, "motive answer out of range");
          }
          if (k.notes != null && !isObj(k.notes)) fail(w, "notes must be an object");
          Object.keys(isObj(k.notes) ? k.notes : {}).forEach((p) => { if (!who.includes(p)) fail(w, `note for someone who isn't a suspect: ${p}`); long(w + " note", k.notes[p], 120); });
          answers.push([k.answer, [...proof].sort(), k.need, k.motive ? k.motive.answer : -1]);
        } else if (k.type === "think") {
          need(w, k.show, "evidence shown");
          const opts = arr(k.options, w, "options");
          if (opts.length < 2 || opts.length > 4 || !(Number.isInteger(k.answer) && k.answer >= 0 && k.answer < opts.length)) fail(w, "needs 2 to 4 options and a valid answer");
          opts.forEach((o) => long(w + " option", o, 120));
          answers.push(k.answer);
        }
        give(w, k.gives);
      });
      lock[n] = answers;
    });
    Object.keys(evidence).forEach((x) => { if (!have.has(x)) fail(`evidence ${x}`, "is never given to the player"); });
    if (B.board != null) arr(B.board, "board", "board").forEach((x) => {
      if (!Array.isArray(x)) return fail("board", "each entry must be [person, from mission, ruled out after, note]");
      const [who, from, out] = x;
      person("board", who); long("board note", x[3], 160);
      if (!(from >= 1 && from <= missions.length) || (out && out < from)) fail("board", `bad missions for ${who}`);
    });
    const end = isObj(B.ending) ? B.ending : {};
    long("ending", end.text, 1200); long("ending hook", end.hook, 300); short("ending title", end.title, 40);
    return { problems, lock };
  }

  /* ================= a player's file ================= */
  const NOT_JSON = "This isn't a complete story file. Ask the AI to send the whole thing again as one JSON code block.";
  const MAX_IN = 60000;
  // Takes what the AI sent (code fences, a sentence before or after, all fine), reads the JSON and checks it.
  function parse(raw) {
    const bad = (msg) => ({ ok: false, kind: "", story: null, errors: [msg], warnings: [] });
    const t = String(raw == null ? "" : raw);
    if (t.length > MAX_IN) return bad("This file is too big (over 60 KB). Ask the AI to make the story shorter: fewer suspects, shorter texts.");
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    let s;
    try { if (a < 0 || b < a) throw new Error("no braces"); s = JSON.parse(t.slice(a, b + 1)); } catch (e) { return bad(NOT_JSON); }
    return checkStory(s);
  }
  // An already-read story (from a link): the same check again, so a damaged link never plays.
  function checkStory(s) {
    const bad = (msg) => ({ ok: false, kind: "", story: null, errors: [msg], warnings: [] });
    if (!isObj(s)) return bad(NOT_JSON);
    const kind = Array.isArray(s.cases) ? "d5" : Array.isArray(s.missions) ? "career" : "";
    if (!kind) return bad("This doesn't look like a LiarHunt story: it has no \"cases\" or \"missions\". Give the AI the blueprint again and ask for the whole story as one JSON code block.");
    let r;
    try {
      if (kind === "d5") { s.id = "player-story"; s.strikes = 1; r = check(s); } // the game sets these, not the AI
      else { const b = checkBook(s, false); r = { ok: !b.problems.length, errors: b.problems, warnings: [] }; }
    } catch (e) {
      r = { ok: false, errors: ["Part of the story is in the wrong shape, so it can't be checked. Ask the AI to follow the blueprint's format exactly and send the whole JSON again."], warnings: [] };
    }
    return { ok: r.ok, kind, story: s, errors: r.errors, warnings: r.warnings || [], res: r };
  }

  window.WLStory = { check, docs, checkBook, parse, checkStory, proofKey, verdictKey, MAX_IN, LIE_KINDS };
})();
