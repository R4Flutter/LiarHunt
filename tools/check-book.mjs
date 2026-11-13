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
// the rules live in js/storycheck.js, shared with the players' own investigations in "Write a case"
for (const f of ["js/book1.js", "js/seasons.js", "js/storycheck.js"]) vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
const B = ctx.window.WL_BOOK1;
const res = ctx.window.WLStory.checkBook(B, true, ctx.window.WL_SEASONS);
let problems = 0;
const fail = (where, msg) => { problems++; console.log(`✗ ${where}: ${msg}`); };
res.problems.forEach((p) => { problems++; console.log("✗ " + p); });
const lock = {};
Object.keys(res.lock).forEach((n) => { lock[n] = createHash("sha1").update(JSON.stringify(res.lock[n])).digest("hex").slice(0, 12); });

// Released missions keep their answers: a player halfway through one must find the same puzzle tomorrow.
const lockFile = join(root, "tools", "book1-lock.json");
if (process.argv.includes("--lock")) {
  writeFileSync(lockFile, JSON.stringify(lock, null, 1) + "\n");
  console.log(`Locked the answers of ${Object.keys(lock).length} missions in tools/book1-lock.json.`);
} else if (existsSync(lockFile)) {
  const old = JSON.parse(readFileSync(lockFile, "utf8"));
  Object.keys(old).forEach((n) => { if (old[n] !== lock[n]) fail(`mission ${n}`, "its answers changed. If that's on purpose, run with --lock"); });
} else fail("lock", "no tools/book1-lock.json yet: run node tools/check-book.mjs --lock");

// The dossier's Timeline: each line unlocks after a real mission, days stay together, and times run forward within a day.
const mins = (t) => { const m = /^(\d{1,2}):(\d\d) (AM|PM)$/.exec(t); return m ? (+m[1] % 12 + (m[3] === "PM" ? 12 : 0)) * 60 + +m[2] : NaN; };
const daysSeen = [];
let last = -1;
(B.timeline || []).forEach((x, i) => {
  const [n, day, time, text] = x, where = `timeline line ${i + 1}`;
  if (x.length !== 4 || !Number.isInteger(n) || n < 1 || n > B.missions.length) fail(where, "needs [mission 1-" + B.missions.length + ", day, time, text]");
  if (!day || !text) fail(where, "day and text can't be empty");
  if (daysSeen[daysSeen.length - 1] !== day) { if (daysSeen.includes(day)) fail(where, `"${day}" comes back after another day`); daysSeen.push(day); last = -1; }
  if (time) { const t = mins(time); if (Number.isNaN(t)) fail(where, `time "${time}" should look like 9:05 PM`); else if (t < last) fail(where, `${time} comes before the line above it`); else last = t; }
});

const kinds = {};
B.missions.forEach((m) => m.steps.forEach((k) => { kinds[k.type] = (kinds[k.type] || 0) + 1; }));
console.log(`Book 1 "${B.title}": ${B.missions.length} missions, ${B.missions.reduce((a, m) => a + m.steps.length, 0)} steps (${Object.entries(kinds).map(([k, v]) => v + " " + k).join(", ")}), ${Object.keys(B.evidence).length} pieces of evidence, ${Object.keys(B.people).length} people.`);
console.log(problems ? `\n${problems} problem(s) found.` : "All good. No problems found.");
process.exit(problems ? 1 : 0);
