// Daily 5: shared logic for the tools.
// check(story)  proves every case has exactly one answer, from small facts written next to the prose
// split(story)  turns a checked story into the documents the game reads, plus the answer keys (never public)
//
// A fact ("claim" in a statement, "shows" in evidence, "facts" in a finding) is
//   { slot, value, from, to, not }
// slot: at:<person|item>  value: a place       (where someone or something was)
//       holder:<item>     value: person|place|item (who or what had it)
//       doer:<act>        value: a person      (who did it)
//       state:<item|place> value: a word       (live, replay, shipped...)
// Two facts clash when they share a slot, their times overlap, and they can't both be true
// (different values, or one says "not" this value). One rule joins two facts:
// if a person holds an item and the item was at a place, the person was at that place.
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join, resolve, relative, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, renameSync, readFileSync, existsSync } from "node:fs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Drafts hold answer keys and the repo is public, so they live outside it.
export const DATA = resolve(process.env.LIARHUNT_DATA || join(homedir(), ".liarhunt", "daily5"));
export function dataDir(...parts) {
  const rel = relative(ROOT, DATA);
  if (!rel || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error(`LIARHUNT_DATA (${DATA}) is inside the game folder. Answer keys must never sit in the public repo.`);
  const p = join(DATA, ...parts);
  mkdirSync(p, { recursive: true });
  return p;
}
export function readJson(p, fallback) { try { return JSON.parse(readFileSync(p, "utf8")); } catch (e) { if (fallback !== undefined) return fallback; throw e; } }
// write to a temp file, then rename: a crash never leaves half a file behind
export function writeJson(p, data) {
  mkdirSync(dirname(p), { recursive: true });
  const tmp = p + ".tmp" + process.pid;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, p);
}
export const exists = existsSync;
export function hashOf(story) { return createHash("sha256").update(JSON.stringify(story)).digest("hex").slice(0, 16); }

/* ---------- facts ---------- */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function mins(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function norm(f, src) { return { slot: f.slot, value: f.value, from: mins(f.from), to: mins(f.to || f.from), not: !!f.not, src }; }
const overlap = (a, b) => a.from <= b.to && b.from <= a.to;
export function clash(a, b) {
  if (a.slot !== b.slot || !overlap(a, b)) return false;
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

/* ---------- the check ---------- */
const KINDS = ["cctv", "log", "document", "witness", "photo", "record", "phone", "object"];
const ABOUT = ["mastermind", "accomplice", "route", "item", "motive", "other"];
const LIMIT = { title: 44, intro: 460, previously: 280, ask: 90, says: 230, evTitle: 50, evSource: 50, evText: 220, why: 380, finding: 260, line: 140, finale: 1400, label: 48, background: 220 };

export function check(story) {
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

  if (typeof s.id !== "string" || !/^[a-z0-9][a-z0-9-]{2,40}$/.test(s.id)) err("story", "id must be 3-41 lowercase letters, digits or dashes");
  str(s.title, LIMIT.title, "story", "title");
  str(s.summary, 600, "story", "summary");
  if (!s.setting) err("story", "setting is missing");
  else { str(s.setting.place, 80, "setting", "place"); str(s.setting.intro, LIMIT.intro, "setting", "intro"); }
  if (!Number.isInteger(s.strikes) || s.strikes < 1 || s.strikes > 5) err("story", "strikes must be 1 to 5");

  const people = Array.isArray(s.people) ? s.people : [];
  if (people.length < 4 || people.length > 8) err("story", "needs 4 to 8 people");
  people.forEach((p, i) => {
    const w = `person ${p && p.id || i}`;
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
    const list = Array.isArray(s[k]) ? s[k] : [];
    if (list.length < min || list.length > max) err("story", `needs ${min} to ${max} ${k}`);
    list.forEach((x, i) => { addId(x.id, k.slice(0, -1), `${k} ${x && x.id || i}`, re); str(x.name, 50, `${k} ${x.id}`, "name"); });
  }
  const kindOf = (id) => ids.get(id);
  const isPerson = (id) => kindOf(id) === "person";

  // a fact must use real ids, a known slot shape and real times
  const okFact = (f, where) => {
    if (!f || typeof f !== "object") return err(where, "fact is not an object"), false;
    const m = /^(at|holder|doer|state):(.+)$/.exec(f.slot || "");
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
  const facts = (list, where, src, need) => {
    if (!Array.isArray(list) || list.length < need) { err(where, `needs at least ${need} fact${need > 1 ? "s" : ""}`); return []; }
    return list.filter((f, i) => okFact(f, `${where} fact ${i + 1}`)).map((f) => norm(f, src));
  };

  const truth = facts(s.truth, "truth", "truth", 6);
  const truthAll = closure(truth, isPerson);
  for (let i = 0; i < truthAll.length; i++) for (let j = i + 1; j < truthAll.length; j++) {
    if (clash(truthAll[i], truthAll[j])) err("truth", `contradicts itself: ${show(truthAll[i])} vs ${show(truthAll[j])}`);
  }

  const cases = Array.isArray(s.cases) ? s.cases : [];
  if (cases.length !== 5) err("story", `needs exactly 5 cases (has ${cases.length})`);
  const findingOf = {}, evidenceOf = {}, proofs = {}, need = {};
  const knownBefore = [];   // everything a player has seen before case n: earlier evidence and findings
  const liars = [];

  cases.slice(0, 5).forEach((c, k) => {
    const n = k + 1, w = `case ${n}`;
    if (c.n !== n) err(w, `n should be ${n}`);
    str(c.title, LIMIT.title, w, "title"); str(c.intro, LIMIT.intro, w, "intro"); str(c.ask, LIMIT.ask, w, "ask");
    str(c.previously, LIMIT.previously, w, "previously", n === 1);
    str(c.why, LIMIT.why, w, "why");
    const uses = Array.isArray(c.uses) ? c.uses : [];
    uses.forEach((f) => { if (!findingOf[f]) err(w, `uses "${f}", which isn't a finding from an earlier case`); });
    if (n === 1 && uses.length) err(w, "case 1 can't use earlier findings");
    if (n > 1 && n < 5 && !uses.length) err(w, "needs at least one finding from an earlier case (uses)");

    if (n === 5) {
      if (c.mode !== "verdict") err(w, 'case 5 must be mode "verdict"');
      if (uses.length < 2) err(w, "the verdict needs at least 2 earlier findings");
      const parts = Array.isArray(c.parts) ? c.parts : [];
      if (parts.length < 2 || parts.length > 4) err(w, "needs 2 to 4 verdict questions");
      const usedF = new Set();
      parts.forEach((q, j) => {
        const qw = `${w} question ${q && q.id || j + 1}`;
        addId(q.id, "question", qw, /^q\d$/);
        str(q.ask, LIMIT.ask, qw, "ask");
        if (!ABOUT.includes(q.about)) err(qw, `about must be one of ${ABOUT.join(", ")}`);
        const opts = Array.isArray(q.options) ? q.options : [];
        if (opts.length < 3 || opts.length > 5) err(qw, "needs 3 to 5 options");
        const oids = new Set();
        opts.forEach((o) => { if (!o || typeof o.id !== "string" || !/^[a-z]\d{1,2}$/.test(o.id) || oids.has(o.id)) err(qw, `bad or repeated option id "${o && o.id}"`); oids.add(o && o.id); str(o && o.label, LIMIT.label, qw, "option label"); });
        if (!oids.has(q.answer)) err(qw, `answer "${q.answer}" isn't one of the options`);
        if (q.about === "mastermind" && masterminds[0] && q.answer !== masterminds[0].id) err(qw, "the answer isn't the story's mastermind");
        if (q.about === "accomplice" && kindOf(q.answer) !== "person") err(qw, "the answer must be a person");
        if (q.about === "accomplice" && isPerson(q.answer) && people.find((p) => p.id === q.answer).part !== "accomplice") err(qw, "the answer isn't an accomplice");
        if ((q.about === "mastermind" || q.about === "accomplice") && opts.some((o) => !isPerson(o.id))) err(qw, "every option must be a person id");
        const because = Array.isArray(q.because) ? q.because : [];
        if (!because.length) err(qw, "needs the findings that prove it (because)");
        because.forEach((f) => { if (!findingOf[f]) err(qw, `because "${f}" isn't a finding from cases 1-4`); usedF.add(f); });
      });
      Object.keys(findingOf).forEach((f) => { if (!usedF.has(f)) warn(w, `finding ${f} isn't used by any verdict question, so that case matters less`); });
      return;
    }

    if (c.mode !== "liar") err(w, 'cases 1-4 must be mode "liar"');
    const sus = Array.isArray(c.suspects) ? c.suspects : [];
    if (sus.length < 3 || sus.length > 5) err(w, "needs 3 to 5 suspects");
    if (new Set(sus).size !== sus.length) err(w, "a suspect is listed twice");
    sus.forEach((p) => { if (!isPerson(p)) err(w, `suspect "${p}" isn't a person`); });
    const sts = Array.isArray(c.statements) ? c.statements : [];
    if (sts.length !== sus.length) err(w, "needs one statement per suspect, in the same order");
    const claimsOf = {};
    sts.forEach((st, j) => {
      const sw = `${w} statement ${st && st.id || j + 1}`;
      addId(st.id, "statement", sw, /^s\d{1,2}$/);
      if (st.by !== sus[j]) err(sw, `is by "${st.by}" but suspect ${j + 1} is "${sus[j]}"`);
      str(st.text, LIMIT.says, sw, "text");
      claimsOf[st.id] = facts(st.claims, sw, st.id, 1);
    });
    const ev = Array.isArray(c.evidence) ? c.evidence : [];
    if (ev.length < 2 || ev.length > 6) err(w, "needs 2 to 6 pieces of evidence");
    const pane = [];
    ev.forEach((e, j) => {
      const ew = `${w} evidence ${e && e.id || j + 1}`;
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

    if (!claimsOf[c.answer]) err(w, `answer "${c.answer}" isn't one of this case's statements`);
    else {
      if (!claimsOf[c.answer].some((f) => truthAll.some((t) => clash(f, t)))) err(w, `the answer ${c.answer} doesn't lie: none of its claims goes against the truth`);
      liars.push(sts.find((x) => x.id === c.answer).by);
    }
    sts.forEach((st) => {
      if (st.id === c.answer) return;
      (claimsOf[st.id] || []).forEach((f) => { if (!covered(f, truthAll)) err(w, `${st.id} isn't the liar but says ${show(f)}, which the truth doesn't back. Only the liar may lie.`); });
    });

    // exactly one statement is caught by what the player knows
    const known = closure(knownBefore.concat(...ev.map((e) => evidenceOf[e.id] || [])), isPerson);
    const caught = sts.filter((st) => (claimsOf[st.id] || []).some((f) => known.some((a) => clash(f, a)))).map((st) => st.id);
    if (caught.length === 0) err(w, "nothing the player knows catches the liar");
    else if (caught.length > 1 || caught[0] !== c.answer) err(w, `the facts catch ${caught.join(" and ")}, but the answer is ${c.answer}. Exactly the liar must be caught.`);

    // proofs: the smallest sets of facts on screen (this case's evidence + carried findings) that catch the liar
    const lie = claimsOf[c.answer] || [];
    const found = [];
    for (const set of subsets(pane, 3)) {
      if (found.some((f) => f.every((id) => set.some((x) => x.id === id)))) continue; // has a smaller proof inside
      const all = closure([].concat(...set.map((x) => x.facts)), isPerson);
      if (lie.some((f) => all.some((a) => clash(f, a)))) found.push(set.map((x) => x.id).sort());
    }
    if (!found.length && caught[0] === c.answer) err(w, "the liar can be caught, but not with the facts on this case's screen (add the evidence, or carry the finding in uses)");
    if (found.length && new Set(found.map((f) => f.length)).size > 1) err(w, `proofs of different sizes (${found.map((f) => f.join("+")).join(", ")}). Every proof must need the same number of facts.`);
    if (n > 1 && found.some((f) => !f.some((id) => findingOf[id]))) err(w, `can be proven without any earlier finding (${found.filter((f) => !f.some((id) => findingOf[id])).map((f) => f.join("+")).join(", ")}). Each case must build on the one before.`);
    if (found.length > 3) warn(w, `${found.length} different proofs work; fewer is clearer`);
    proofs[n] = found; need[n] = found.length ? found[0].length : 0;

    // the finding this case adds to the notebook
    const fd = c.finding || {};
    addId(fd.id, "finding", `${w} finding`, /^f\d{1,2}$/);
    str(fd.text, LIMIT.finding, `${w} finding`, "text");
    const ff = facts(fd.facts, `${w} finding`, fd.id, 1);
    ff.forEach((f) => { if (!covered(f, truthAll)) err(`${w} finding`, `${show(f)} isn't backed by the truth`); });
    if (fd.id) findingOf[fd.id] = ff;
    if (!Array.isArray(c.timeline) || !c.timeline.length) err(w, "needs at least one timeline line");
    (c.timeline || []).forEach((t, j) => { if (!TIME.test(t.at || "")) err(`${w} timeline ${j + 1}`, "bad time"); str(t.text, LIMIT.line, `${w} timeline ${j + 1}`, "text"); });
    knownBefore.push(...ev.map((e) => evidenceOf[e.id] || []).flat(), ...ff);
  });

  if (liars.length === 4) {
    const most = Math.max(...liars.map((p) => liars.filter((x) => x === p).length));
    if (most >= 3) warn("story", "the same person is the liar in 3 or more cases");
    if (masterminds[0] && liars[0] === masterminds[0].id) warn("story", "the mastermind is caught in case 1, which gives the ending away early");
  }

  // the ending
  const fin = s.finale || {};
  str(fin.text, LIMIT.finale, "finale", "text");
  const chron = Array.isArray(fin.chronology) ? fin.chronology : [];
  if (chron.length < 5) err("finale", "needs at least 5 chronology lines");
  chron.forEach((t, j) => {
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
      const story = [c0.title, c0.intro, c0.previously, c0.ask, n === 1 && s.setting ? s.setting.intro : ""].filter(Boolean).join(" \n ");
      const later = [];
      for (let m = n; m <= 5; m++) { const c = cases[m - 1]; later.push(c.why || ""); if (c.finding) later.push(c.finding.text || ""); (c.timeline || []).forEach((t) => later.push(t.text || "")); }
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
  return { ok: errors.length === 0, errors, warnings, proofs, need };
}
function show(f) { const t = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); return `${f.slot} ${f.not ? "≠" : "="} ${f.value} @ ${t(f.from)}${f.to !== f.from ? "-" + t(f.to) : ""}`; }
function publicText(c, setting) {
  const out = [c.title, c.intro, c.previously, c.ask];
  if (setting) out.push(setting.intro);
  (c.statements || []).forEach((s) => out.push(s.text));
  (c.evidence || []).forEach((e) => out.push(e.title, e.source, e.text));
  (c.parts || []).forEach((q) => { out.push(q.ask); (q.options || []).forEach((o) => out.push(o.label)); });
  return out.filter(Boolean).join(" \n ");
}
function factText(c) { return [].concat((c.statements || []).map((s) => s.text), (c.evidence || []).map((e) => e.title + " \n " + e.text)).join(" \n "); }
const words = (t) => t.toLowerCase().replace(/[^a-z0-9:' \n]+/g, " ").split(/\s+/).filter(Boolean);
const grams = (t, n) => { const w = words(t), set = new Set(); for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(" ")); return set; };
// a 6-word phrase found in both a and b, and not already public (in "known")
function sharedPhrase(a, b, known, n = 6) {
  const inB = grams(b, n), inKnown = grams(known || "", n);
  for (const p of grams(a, n)) if (inB.has(p) && !inKnown.has(p)) return p;
  return "";
}
function sentences(t) { return t.split(/(?<=[.!?])\s+|\n/).map((x) => x.trim()).filter(Boolean); }

/* ---------- split into what the game reads ---------- */
// The answer for a proof or a verdict, written the same way here, in the rules and in the game.
export const proofKey = (ids) => ids.slice().sort().join(",");
export const verdictKey = (picks) => Object.keys(picks).sort().map((q) => q + "=" + picks[q]).join(";");

export function split(story, day) {
  const res = check(story);
  if (!res.ok) throw new Error("The story doesn't pass the check:\n" + res.errors.join("\n"));
  const person = (id) => story.people.find((p) => p.id === id);
  const caseOfFinding = {};
  story.cases.forEach((c) => { if (c.finding) caseOfFinding[c.finding.id] = c; });
  const carried = (fid) => { const c = caseOfFinding[fid]; return { id: fid, kind: "finding", title: "From Case " + c.n, source: "Your notebook", time: "", text: c.finding.text, from: c.n }; };
  const pickBy = (list, salt) => list[parseInt(createHash("sha256").update(story.id + salt).digest("hex").slice(0, 8), 16) % list.length];
  const out = {
    edition: {
      day, v: 1, hash: hashOf(story), id: story.id, title: story.title, place: story.setting.place, intro: story.setting.intro, strikes: story.strikes,
      cast: story.people.map((p) => ({ id: p.id, name: p.name, role: p.role, background: p.background })),
      cases: story.cases.map((c) => ({ n: c.n, title: c.title }))
    },
    cases: {}, reveals: {}, hunch: {}, keys: {},
    finale: { text: story.finale.text, chronology: story.finale.chronology }
  };
  story.cases.forEach((c) => {
    const n = c.n;
    if (c.mode === "verdict") {
      out.cases[n] = { n, mode: "verdict", title: c.title, intro: c.intro, previously: c.previously, ask: c.ask,
        facts: c.uses.map(carried),
        parts: c.parts.map((q) => ({ id: q.id, ask: q.ask, options: q.options.map((o) => ({ id: o.id, label: o.label })) })) };
      const picks = {}; c.parts.forEach((q) => { picks[q.id] = q.answer; });
      out.reveals[n] = { n, answer: { s: verdictKey(picks), parts: picks, p: [] }, why: c.why,
        because: Object.fromEntries(c.parts.map((q) => [q.id, q.because])), timeline: [] };
      const q = c.parts.find((x) => x.options.length >= 3);
      out.hunch[n] = { part: q.id, out: pickBy(q.options.filter((o) => o.id !== q.answer), "h" + n).id };
      out.keys["c" + n] = { s: verdictKey(picks), proofs: [""] };
      return;
    }
    out.cases[n] = { n, mode: "liar", title: c.title, intro: c.intro, previously: c.previously || "", ask: c.ask, need: res.need[n],
      suspects: c.suspects.map((pid, j) => ({ id: pid, name: person(pid).name, role: person(pid).role, sid: c.statements[j].id, says: c.statements[j].text })),
      facts: c.evidence.map((e) => ({ id: e.id, kind: e.kind, title: e.title, source: e.source, time: e.time || "", text: e.text })).concat(c.uses.map(carried)) };
    // proofs are written "e7,f2" (Firestore can't store an array inside an array)
    out.reveals[n] = { n, answer: { s: c.answer, p: res.proofs[n].map(proofKey) }, why: c.why, finding: { id: c.finding.id, text: c.finding.text }, timeline: c.timeline };
    out.hunch[n] = { out: pickBy(c.statements.filter((s) => s.id !== c.answer), "h" + n).id };
    out.keys["c" + n] = { s: c.answer, proofs: res.proofs[n].map(proofKey) };
  });
  return out;
}
