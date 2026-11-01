// Checks the case library and the generator for mistakes.
// Run from the game folder:  node tools/check-cases.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, console, Intl, Date, Math, location: { origin: "null" }, localStorage: undefined,
  TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Response, Blob, atob, btoa };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["js/config.js", "js/cases.js", "js/seasons.js", "js/engine.js"]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
}
const { WL_CASES: C, WL } = ctx;
let problems = 0;
const fail = (where, msg) => { problems++; console.log(`✗ ${where}: ${msg}`); };

function checkCase(c, where, generated) {
  const mode = c.mode || "liar";
  if (!["liar", "honest", "planted"].includes(mode)) fail(where, `unknown mode "${mode}"`);
  for (const k of ["title", "setup", "why"]) if (!c[k] || typeof c[k] !== "string") fail(where, `missing "${k}"`);
  if (!Array.isArray(c.clues) || c.clues.length < 2 || c.clues.length > 5) fail(where, "needs 2 to 5 clues");
  if (!Array.isArray(c.suspects) || c.suspects.length !== 3) fail(where, "needs exactly 3 suspects");
  (c.suspects || []).forEach((s, i) => {
    if (!s.name || !s.role || !s.says) fail(where, `suspect ${i} needs name, role and says`);
  });
  const names = new Set((c.suspects || []).map((s) => s.name));
  if (names.size !== 3) fail(where, "suspect names must be different");
  const max = mode === "planted" ? c.clues.length : 3;
  if (!Number.isInteger(c.answer) || c.answer < 0 || c.answer >= max) fail(where, `answer must be 0-${max - 1}`);
  if (!generated && mode !== "planted" && !c.why.includes(c.suspects[c.answer]?.name ?? "§")) {
    fail(where, `"why" doesn't mention the answer (${c.suspects[c.answer]?.name})`);
  }
}

C.medium.forEach((c, i) => checkCase(c, `medium #${i + 1} "${c.title}"`));
C.hard.forEach((c, i) => checkCase(c, `hard #${i + 1} "${c.title}"`));
C.twist.forEach((c, i) => {
  if (!c.mode) fail(`twist #${i + 1}`, 'twist cases need mode "honest" or "planted"');
  checkCase(c, `twist #${i + 1} "${c.title}"`);
});

// Generator + daily builder: 400 days and 600 endless cases.
const seen = new Set();
for (let d = 1; d <= 400; d++) {
  const day = WL.buildDay(d);
  if (day.length !== 5) fail(`day ${d}`, "should have 5 cases");
  day.forEach((c, i) => checkCase(c, `day ${d} case ${i + 1}`, true));
  seen.add(JSON.stringify(day[0]));
}
for (let n = 1; n <= 600; n++) {
  const spec = WL.endlessSpec(n);
  const c = WL.generateCase(WL.rngFrom("t" + n), { ...spec, avoid: { names: {}, premises: {}, facts: {} } });
  checkCase(c, `endless ${n}`, true);
}
// Career: 500 levels. Rush: 300 cases with growing difficulty.
const repeats = [];
for (let n = 1; n <= 500; n++) {
  const c = WL.buildCareerLevel(n);
  checkCase(c, `career ${n}`, n > 1);
  if (n > 1 && WL.buildCareerLevel(n - 1).title === c.title) repeats.push(n);
  const spec = WL.careerSpec(n);
  if (spec.mode !== c.mode) fail(`career ${n}`, "mode doesn't match its spec");
}
if (repeats.length) fail("career", `same story opener twice in a row at levels ${repeats.slice(0, 5).join(", ")}`);
// Career levels skip the facts of the levels before them, so no statement comes back within 5 levels.
let near = 0;
for (let n = 7; n <= 500; n++) {
  const prev = new Set([1, 2, 3, 4, 5].flatMap((k) => WL.buildCareerLevel(n - k).suspects.map((s) => s.says)));
  WL.buildCareerLevel(n).suspects.forEach((s) => { if (prev.has(s.says)) near++; });
}
if (near) fail("career", `${near} statement(s) repeat within 5 levels`);
// Night Shift skips the facts used in that day's Daily.
for (let d = 9; d <= 400; d++) {
  const dayClues = new Set(WL.buildDay(d).flatMap((c) => c.clues));
  if (WL.buildNight(d).clues.some((cl) => dayClues.has(cl))) fail(`night ${d}`, "reuses a fact from that day's Daily");
}
for (let n = 1; n <= 300; n++) {
  const spec = WL.endlessSpec(n);
  const c = WL.generateCase(WL.rngFrom("rush" + n), { ...spec, avoid: { names: {}, premises: {}, facts: {} } });
  checkCase(c, `rush ${n}`, true);
}
// Parametric facts: times must stay inside one day and prices must make sense.
for (let n = 1; n <= 2000; n++) {
  const c = WL.generateCase(WL.rngFrom("p" + n), { mode: "liar", clueCount: 5, maxTier: 3, needTier: 3, avoid: { names: {}, premises: {}, facts: {} } });
  const text = JSON.stringify(c);
  if (/NaN|undefined|\$-|\$0\b/.test(text)) fail(`number puzzle ${n}`, "bad number in: " + text.slice(0, 160));
}
// Seasons (js/seasons.js): every template is complete, and generated cases use every template without bad numbers.
(ctx.WL_SEASONS || []).forEach((pk, si) => {
  const where = `season ${si + 1}`, ids = new Set(), h = { clock: WL.clock, dur: (m) => m + " minutes", pick: WL.pick, cap: (s) => s };
  if (!pk.name || !pk.premises?.length || !pk.cast?.length) fail(where, "needs a name, premises and a cast");
  if (new Set(pk.cast.map((c) => c[0])).size !== pk.cast.length) fail(where, "two locals share a name");
  pk.premises.forEach((p) => { if (!p.title || !p.setup || !(p.motives || []).every((m) => m.includes("{name}"))) fail(where, `premise "${p.title}" needs a title, setup and motives with {name}`); });
  [...(pk.facts || []), ...(pk.combos || [])].forEach((f) => {
    if (!f.id || ids.has(f.id)) fail(where, `fact id "${f.id}" is missing or used twice`);
    ids.add(f.id);
    for (let n = 0; n < (f.make ? 30 : 1); n++) {
      const m = f.make ? f.make(WL.rngFrom(f.id + n), h, { npc: { name: "Nell", role: "Caretaker" } }) : f;
      const clues = m.clues || [m.clue], combo = (pk.combos || []).includes(f);
      if (clues.length !== (combo ? 2 : 1) || clues.some((c) => !c)) fail(where, `"${f.id}" needs ${combo ? "2 clues" : "a clue"}`);
      if (!m.truths?.length || !m.lies?.length || m.lies.some((l) => !l.say || !l.why)) fail(where, `"${f.id}" needs truths and lies with say and why`);
      if (/NaN|undefined|\$-|\$0\b/.test(JSON.stringify(m))) fail(where, `"${f.id}" has a bad number: ` + JSON.stringify(m).slice(0, 120));
    }
  });
  Object.keys(pk.more || {}).concat(Object.keys(pk.regroup || {})).forEach((id) => { if (!WL.FACTS.some((f) => f.id === id)) fail(where, `"${id}" isn't a built-in fact`); });
});
if (WL.packFor(1)) {
  const avoid = WL.newAvoid();
  for (let n = 1; n <= 1500; n++) {
    const spec = { mode: ["liar", "liar", "honest", "planted"][n % 4], clueCount: 3 + (n % 3), maxTier: 3, combo: n % 2 === 0, near: n % 3 === 0 };
    const c = WL.generateCase2(WL.rngFrom("s" + n), { pack: WL.packFor(1), avoid, ...spec });
    checkCase(c, `season case ${n}`, true);
    checkProof(c, `season case ${n}`);
    if (/NaN|undefined|\$-|\$0\b/.test(JSON.stringify(c))) fail(`season case ${n}`, "bad text: " + JSON.stringify(c).slice(0, 160));
  }
}
// Night Shift: 400 days.
for (let d = 1; d <= 400; d++) checkCase(WL.buildNight(d), `night ${d}`, true);
// Case of the Week: 400 weeks. The mastermind fits every clue, everyone else is ruled out,
// and every clue rules out someone that no other clue does (so no clue is wasted).
for (let w = 1; w <= 400; w++) {
  const k = WL.buildWeek(w), where = `week ${w}`;
  if (k.suspects.length !== 8 || k.clues.length !== 6) { fail(where, "needs 8 suspects and 6 clues"); continue; }
  if (new Set(k.suspects.map((s) => s.name)).size !== 8) fail(where, "suspect names must be different");
  const hits = {};
  k.clues.forEach((c) => {
    if (c.out.includes(k.answer)) fail(where, `a clue rules out the mastermind: ${c.text}`);
    c.out.forEach((s) => { hits[s] = (hits[s] || 0) + 1; });
  });
  if (Object.keys(hits).length !== 7) fail(where, "the clues don't rule out everyone else");
  k.clues.forEach((c, i) => { if (!c.out.some((s) => hits[s] === 1)) fail(where, `clue ${i + 1} isn't needed`); });
}
// Same day must build the same cases every time (everyone plays the same puzzle).
const a = JSON.stringify(WL.buildDay(7)), b = JSON.stringify(WL.generateCase && WL.buildDay(7));
if (a !== b) fail("determinism", "day 7 changed between builds");
// Days 1-14 (before Season 1) are already played or published: they must never change.
const see = (c) => JSON.stringify([c.title, c.setup, c.clues, c.suspects, c.mode, c.answer, c.why, c.twist]);
let early = "";
for (let d = 1; d <= 14; d++) early += WL.buildDay(d).map(see).join() + see(WL.buildNight(d));
if (createHash("sha1").update(early).digest("hex") !== "549402aa2bb70a5caf0337f380d5b5d377af7831") fail("days 1-14", "the cases of an earlier day changed");
// Every case can be proved: liar and honest cases by clues, planted twists by a suspect's story.
function checkProof(c, where) {
  const sets = [c.proof || []].concat(c.alt || []), max = c.mode === "planted" ? 3 : c.clues.length;
  if (!sets[0].length) return fail(where, "has no proof");
  sets.forEach((s) => {
    if (s.length !== sets[0].length || new Set(s).size !== s.length || s.some((i) => !Number.isInteger(i) || i < 0 || i >= max)) fail(where, "bad proof " + JSON.stringify(s));
  });
  if (c.mode === "planted" && sets[0][0] === -1) fail(where, "proof suspect not found");
}
for (let d = 1; d <= 400; d++) WL.buildDay(d).forEach((c, i) => checkProof(c, `day ${d} case ${i + 1}`));
for (let n = 1; n <= 500; n++) checkProof(WL.buildCareerLevel(n), `career ${n}`);
for (let n = 1; n <= 60; n++) checkProof(WL.careerRetry(n, 1), `career retry ${n}`);
for (let d = 1; d <= 400; d++) checkProof(WL.buildNight(d), `night ${d}`);

// Cases players write: a case packed into a link comes back exactly the same, and broken links are refused.
const written = {
  t: "The Missing Birthday Cake", s: "Someone ate half of Grandma's birthday cake before the party.",
  f: ["The cake was in the kitchen fridge from 2 PM.", "The kitchen door was locked from 3 PM to 6 PM.", "It rained all afternoon."],
  p: [["Sam", "Brother", "I played football in the garden all afternoon. Not a cloud in the sky!"], ["Priya", "Cousin", "I helped Grandma blow up balloons."], ["Leo", "", "I knocked on the front door at four. Nobody answered. Ça va?"]],
  a: 0, x: [2], y: "It rained all afternoon, so Sam couldn't have played under a cloudless sky.", b: "Raj"
};
if (WL.checkWritten(written)) fail("written case", WL.checkWritten(written));
for (const code of [await WL.packWritten(written), "j" + Buffer.from(JSON.stringify(written)).toString("base64url")]) {
  if (JSON.stringify(await WL.unpackWritten(code)) !== JSON.stringify(written)) fail("written case", `the link (${code[0]}) didn't bring the case back the same`);
}
for (const bad of ["zabc", "jeyJ0IjoxfQ", "x", ""]) if (await WL.unpackWritten(bad)) fail("written case", `a broken link was accepted: "${bad}"`);
if (!WL.checkWritten({ ...written, x: [0, 0] }) || !WL.checkWritten({ ...written, a: 3 })) fail("written case", "a case with no proper answer or proof was accepted");
const wc = WL.writtenCase(written, "test");
checkCase(wc, "written case", true); checkProof(wc, "written case");
if (wc.suspects[wc.answer].name !== "Sam" || wc.clues[wc.proof[0]] !== written.f[2]) fail("written case", "the answer or the proof moved in the shuffle");

console.log(`\nHand-written:${C.medium.length} medium, ${C.hard.length} hard, ${C.twist.length} twist`);
const handDays = Math.min(C.medium.length, C.hard.length, C.twist.length);
console.log(`Hand-written dailies last ${handDays} days (until ${WL.formatDate(WL.dateForDay(handDays))}); after that the generator takes over.`);
console.log(`Generator: ${WL.FACTS.length} facts (${WL.FACTS.filter(f => f.make).length} with random times/prices), ${WL.PREMISES.length} story openers, ${seen.size} different opening cases in 400 days.`);
console.log(`Career: checked 500 levels (${Math.ceil(500 / 10)} chapters). Rush: checked 300 cases.`);
console.log(problems ? `\n${problems} problem(s) found.` : "\nAll good. No problems found.");
process.exit(problems ? 1 : 0);
