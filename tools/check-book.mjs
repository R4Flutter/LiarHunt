// Checks Career Book 1 (js/book1.js): every mission can be solved, evidence is found before it's needed,
// and the answers of released missions never change.
// Run from the game folder:  node tools/check-book.mjs
// After you change an answer on purpose (before release, or to fix a broken mission): node tools/check-book.mjs --lock
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["js/book1.js", "js/seasons.js"]) vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
const B = ctx.window.WL_BOOK1;
const PER = 6, KINDS = ["search", "talk", "timeline", "compare", "link", "accuse", "think"];
let problems = 0;
const fail = (where, msg) => { problems++; console.log(`✗ ${where}: ${msg}`); };
const long = (where, text, max) => { if (typeof text !== "string" || !text.trim()) fail(where, "missing text"); else if (text.length > max) fail(where, `text is ${text.length} characters (max ${max}): "${text.slice(0, 50)}..."`); };

if (B.missions.length % PER || B.missions.length / PER !== B.chapters.length) fail("book", `${B.missions.length} missions don't make ${B.chapters.length} chapters of ${PER}`);
const titles = new Set(B.chapters.map((c) => c.title));
B.chapters.forEach((c, i) => { long(`chapter ${i + 1}`, c.intro, 360); if (i < B.chapters.length - 1) long(`chapter ${i + 1} outro`, c.outro, 360); if (!c.title || !c.badge || !c.icon) fail(`chapter ${i + 1}`, "needs a title, badge and icon"); });
Object.entries(B.evidence).forEach(([id, e]) => { if (e.length !== 3) fail(`evidence ${id}`, "needs [icon, name, text]"); long(`evidence ${id}`, e[2], 260); long(`evidence ${id} name`, e[1], 28); });
// Story characters must not share a first name with the Daily season casts (a local's name always means that local).
const seasonNames = new Set((ctx.window.WL_SEASONS || []).flatMap((s) => (s.cast || []).map((c) => c[0])));
Object.entries(B.people).forEach(([id, p]) => { if (!p.org && seasonNames.has(p.name.split(" ")[0])) fail(`person ${id}`, `"${p.name}" shares a first name with a season local`); });

const have = new Set(), givenAt = {}, used = new Set();
const person = (where, id) => { if (!B.people[id]) fail(where, `unknown person "${id}"`); };
const give = (where, ids) => (ids || []).forEach((id) => {
  if (!B.evidence[id]) return fail(where, `gives unknown evidence "${id}"`);
  if (have.has(id)) fail(where, `gives "${id}" again (first given in mission ${givenAt[id]})`);
  have.add(id); givenAt[id] = where;
});
const need = (where, ids, what) => (ids || []).forEach((id) => {
  used.add(id);
  if (!B.evidence[id]) fail(where, `${what}: unknown evidence "${id}"`);
  else if (!have.has(id)) fail(where, `${what}: "${id}" isn't found until ${givenAt[id] || "never"}`);
});
const lock = {};

B.missions.forEach((m, mi) => {
  const n = mi + 1, at = `mission ${n} "${m.title}"`;
  if (titles.has(m.title)) fail(at, "title is used twice (or matches a chapter)");
  titles.add(m.title);
  long(at + " brief", m.brief, 620); long(at + " goal", m.goal, 90);
  if (n < B.missions.length) long(at + " outro", m.outro, 200);
  (m.cast || []).forEach((p) => person(at, p));
  give(at, m.gives);
  if (!m.steps?.length || m.steps.length > 4) fail(at, "needs 1 to 4 steps");
  if (n % PER === 0 && m.steps.at(-1)?.type !== "accuse") fail(at, "a chapter finale ends with an accusation");
  const answers = [];
  m.steps.forEach((k, ki) => {
    const w = `${at} step ${ki + 1} (${k.type})`;
    if (!KINDS.includes(k.type)) return fail(w, "unknown step type");
    long(w + " title", k.title, 40); long(w + " ask", k.ask, 200); long(w + " done", k.done, 320);
    if (k.type === "search") {
      const ids = new Set(k.items.map((i) => i[0])), keys = k.items.filter((i) => i[4]);
      if (ids.size !== k.items.length) fail(w, "item ids repeat");
      if (k.items.length < 5 || k.items.length > 9) fail(w, "needs 5 to 9 items");
      if (!keys.length || k.items.length - keys.length < 2) fail(w, "needs at least 1 clue and 2 things that aren't");
      if (!k.ask.includes(String(keys.length))) fail(w, `the question should say how many to mark (${keys.length})`);
      k.items.forEach((i) => { long(w + " item", i[2], 28); long(w + " look", i[3], 150); });
      answers.push(keys.map((i) => i[0]).sort());
    } else if (k.type === "talk") {
      person(w, k.who);
      need(w, k.pool, "evidence tray");
      const says = new Map(), qids = new Set(k.qs.map((q) => q.id)), bids = new Set(k.breaks.map((b) => b.id));
      k.qs.forEach((q) => {
        long(w + " question", q.q, 70);
        if (q.after && !qids.has(q.after) && !bids.has(q.after)) fail(w, `question "${q.id}" waits for unknown "${q.after}"`);
        q.a.forEach(([id, t]) => { if (says.has(id)) fail(w, `statement "${id}" repeats`); says.set(id, q); long(w + " statement", t, 220); });
      });
      if (!k.breaks.length) fail(w, "needs at least one statement to break");
      k.breaks.forEach((b) => {
        long(w + " reaction", b.react, 460);
        if (!b.s.length || b.s.some((s) => !says.has(s))) fail(w, `break "${b.id}" points at an unknown statement`);
        if (b.s.every((s) => says.get(s)?.after === b.id)) fail(w, `break "${b.id}" can only be heard after itself`);
        if (!b.ev.length || b.ev.some((e) => !(k.pool || []).includes(e))) fail(w, `break "${b.id}" needs evidence that's in the tray`);
      });
      if ((k.pool || []).length < k.breaks.length + 2) fail(w, "the evidence tray needs at least 2 wrong choices");
      answers.push(k.breaks.map((b) => [b.s, b.ev]));
      k.breaks.forEach((b) => give(w, b.gives));
    } else if (k.type === "timeline") {
      if (k.events.length < 4 || k.events.length > 8) fail(w, "needs 4 to 8 events");
      if (new Set(k.events.map((e) => e[0])).size !== k.events.length) fail(w, "event ids repeat");
      k.events.forEach((e) => long(w + " event", e[1], 100));
      answers.push(k.events.map((e) => e[0]));
    } else if (k.type === "compare") {
      const rows = k.docs.flatMap((d) => d.rows), ids = new Set(rows.map((r) => r[0]));
      if (!k.docs.length || k.docs.length > 3) fail(w, "needs 1 to 3 documents");
      k.docs.forEach((d) => { if (new Set(d.rows.map((r) => r[0])).size !== d.rows.length) fail(w, `row ids repeat in "${d.title}"`); });
      if (!k.answer.length || k.answer.some((a) => !ids.has(a))) fail(w, "the answer points at a missing row");
      if (ids.size - new Set(k.answer).size < 2) fail(w, "needs at least 2 rows that aren't the answer");
      if (k.answer.length > 1 && !k.ask.includes(String(k.answer.length))) fail(w, `the question should say how many lines to tap (${k.answer.length})`);
      answers.push([...k.answer].sort());
    } else if (k.type === "link") {
      const L = new Set(k.left.map((x) => x[0])), R = new Set(k.right.map((x) => x[0]));
      if (Object.keys(k.pairs).length !== L.size || [...L].some((l) => !R.has(k.pairs[l]))) fail(w, "every left item needs one partner on the right");
      if (R.size - new Set(Object.values(k.pairs)).size < 1) fail(w, "needs at least one right-hand item that isn't a match");
      answers.push(k.pairs);
    } else if (k.type === "accuse") {
      k.who.forEach((p) => person(w, p));
      if (!k.who.includes(k.answer) || k.who.length < 3) fail(w, "needs 3+ people, the answer among them");
      need(w, k.pool, "evidence");
      if (k.proof.some((p) => !k.pool.includes(p))) fail(w, "proof evidence must be in the pool");
      if (!(k.need >= 1 && k.need <= k.proof.length)) fail(w, "need must be between 1 and the number of valid proofs");
      if (k.pool.length - k.proof.length < 2) fail(w, "the pool needs at least 2 wrong choices");
      if (!k.proofAsk.includes(String(k.need))) fail(w, `the proof question should say how many to pick (${k.need})`);
      if (k.motive && !(k.motive.answer >= 0 && k.motive.answer < k.motive.options.length)) fail(w, "motive answer out of range");
      Object.keys(k.notes || {}).forEach((p) => { if (!k.who.includes(p)) fail(w, `note for someone who isn't a suspect: ${p}`); });
      answers.push([k.answer, [...k.proof].sort(), k.need, k.motive ? k.motive.answer : -1]);
    } else if (k.type === "think") {
      need(w, k.show, "evidence shown");
      if (k.options.length < 2 || k.options.length > 4 || !(k.answer >= 0 && k.answer < k.options.length)) fail(w, "needs 2 to 4 options and a valid answer");
      k.options.forEach((o) => long(w + " option", o, 120));
      answers.push(k.answer);
    }
    give(w, k.gives);
  });
  lock[n] = createHash("sha1").update(JSON.stringify(answers)).digest("hex").slice(0, 12);
});
Object.keys(B.evidence).forEach((id) => { if (!have.has(id)) fail(`evidence ${id}`, "is never given to the player"); });
(B.board || []).forEach(([who, from, out]) => { person("board", who); if (!(from >= 1 && from <= B.missions.length) || (out && out < from)) fail("board", `bad missions for ${who}`); });
long("ending", B.ending?.text, 1200); long("ending hook", B.ending?.hook, 300);

// Released missions keep their answers: a player halfway through one must find the same puzzle tomorrow.
const lockFile = join(root, "tools", "book1-lock.json");
if (process.argv.includes("--lock")) {
  writeFileSync(lockFile, JSON.stringify(lock, null, 1) + "\n");
  console.log(`Locked the answers of ${Object.keys(lock).length} missions in tools/book1-lock.json.`);
} else if (existsSync(lockFile)) {
  const old = JSON.parse(readFileSync(lockFile, "utf8"));
  Object.keys(old).forEach((n) => { if (old[n] !== lock[n]) fail(`mission ${n}`, "its answers changed. If that's on purpose, run with --lock"); });
} else fail("lock", "no tools/book1-lock.json yet: run node tools/check-book.mjs --lock");

const kinds = {};
B.missions.forEach((m) => m.steps.forEach((k) => { kinds[k.type] = (kinds[k.type] || 0) + 1; }));
console.log(`Book 1 "${B.title}": ${B.missions.length} missions, ${B.missions.reduce((a, m) => a + m.steps.length, 0)} steps (${Object.entries(kinds).map(([k, v]) => v + " " + k).join(", ")}), ${Object.keys(B.evidence).length} pieces of evidence, ${Object.keys(B.people).length} people.`);
console.log(problems ? `\n${problems} problem(s) found.` : "All good. No problems found.");
process.exit(problems ? 1 : 0);
