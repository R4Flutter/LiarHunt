// Checks the checker players use in "Write a case" (js/storycheck.js) for stories made with an AI chat:
// both blueprint examples pass and fit in a link, and broken copies fail with the right plain message.
// Run from the game folder:  node tools/check-stories.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { deflateRawSync } from "node:zlib";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["js/book1.js", "js/seasons.js", "js/storycheck.js"]) vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
const W = ctx.window.WLStory;
let failed = 0;
const expect = (name, cond, extra) => { if (cond) console.log("✓ " + name); else { failed++; console.log("✗ " + name + (extra ? "\n    " + extra : "")); } };
// the example inside a blueprint, exactly as the player's AI chat reads it
const example = (file) => {
  const t = readFileSync(join(root, "blueprints", file), "utf8"), m = /```json\n([\s\S]*?)\n```/.exec(t);
  return { text: t, json: m ? m[1] : "" };
};
const linkLength = (k, s) => 1 + deflateRawSync(Buffer.from(JSON.stringify({ k, s, b: "Sam" }))).toString("base64url").length;

const d5bp = example("daily5-story.txt"), crbp = example("career-investigation.txt");
const d5 = JSON.parse(d5bp.json), cr = JSON.parse(crbp.json);
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ---------- the examples ---------- */
const a = W.parse("Here's your story:\n```json\n" + d5bp.json + "\n```\nEnjoy!");
expect("the Daily 5 blueprint's example passes, wrapped in a code fence and chat", a.ok && a.kind === "d5", a.errors.slice(0, 3).join("\n    "));
const crown = W.parse(readFileSync(join(root, "tools/daily5/fixtures/crown-job.json"), "utf8"));
expect("crown-job.json passes", crown.ok && crown.kind === "d5", crown.errors.slice(0, 3).join("\n    "));
const b = W.parse(crbp.json);
expect("the Career blueprint's example (Book 1, Chapter 1 cut down) passes", b.ok && b.kind === "career", b.errors.slice(0, 3).join("\n    "));
expect("both blueprints say to reply with one JSON code block", [d5bp, crbp].every((x) => /ONE JSON code block only/.test(x.text)));
expect("both examples fit in a story link (12,000 characters)", linkLength("d5", d5) <= 12000 && linkLength("career", cr) <= 12000, linkLength("d5", d5) + " / " + linkLength("career", cr));
expect("the Book 1 rules still apply to Book 1 (it's 5 chapters, not a player story)", !W.checkStory(clone(ctx.window.WL_BOOK1)).ok);

/* ---------- guards before checking ---------- */
const NOT_JSON = /isn't a complete story file/;
expect("half a file gives one plain message", (() => { const r = W.parse(d5bp.json.slice(0, 4000)); return !r.ok && r.errors.length === 1 && NOT_JSON.test(r.errors[0]); })());
expect("no JSON at all gives the same message", NOT_JSON.test(W.parse("Sorry, I can't help with that.").errors[0]));
expect("over 60 KB is refused", /too big/.test(W.parse("{" + " ".repeat(61000) + "}").errors[0]));
expect("JSON that isn't a story says so", /no "cases" or "missions"/.test(W.parse('{"hello": 1}').errors[0]));
expect("the game sets the id and strikes, not the AI", (() => { const s = clone(d5); s.id = "Bad Id!"; s.strikes = 9; return W.checkStory(s).ok; })());

/* ---------- broken Daily 5 stories ---------- */
const caseN = (s, n) => s.cases[n - 1];
const d5Broken = [
  ["only four cases", (s) => { s.cases.pop(); }, /exactly 5 cases/],
  ["two liars in one case", (s) => { caseN(s, 1).statements[1].claims = [{ slot: "at:p5", value: "l9", from: "21:00", to: "21:20" }]; }, /Only the liar may lie|Exactly the liar/],
  ["no right answer", (s) => { caseN(s, 1).evidence.shift(); }, /nothing the player knows catches the liar/],
  ["a case that ignores the one before", (s) => { caseN(s, 2).evidence.push({ id: "e20", kind: "cctv", title: "Office camera", source: "Director's office", time: "21:15", text: "Victor's screen at 9:15 shows the old footage.", shows: [{ slot: "state:i5", value: "replay", from: "21:15", to: "21:15" }] }); }, /without any earlier finding/],
  ["a clue found after it's needed", (s) => { caseN(s, 2).uses = ["f3"]; }, /isn't a finding from an earlier case/],
  ["a leak of a later finding", (s) => { caseN(s, 1).intro += " Victor held Elena's real card from 8:40 to 9:05 PM."; }, /gives away/],
  ["a text that's too long", (s) => { caseN(s, 1).statements[0].text = "I was there. ".repeat(30); }, /characters \(max 230\)/],
  ["a person who is just null", (s) => { s.people[1] = null; }, /bad id/],
  ["a case in the wrong shape", (s) => { s.cases[2] = "case three"; }, /mode/],
];
for (const [name, mutate, reason] of d5Broken) {
  const s = clone(d5); mutate(s);
  const r = W.checkStory(s);
  expect(`rejects: ${name}`, !r.ok && r.errors.some((e) => reason.test(e)), r.ok ? "it passed" : r.errors.slice(0, 3).join("\n    "));
}
{
  // thousands of repeats in "uses" must not make the proof search run for minutes
  const s = clone(d5); caseN(s, 3).uses = Array(5000).fill("f2");
  const t0 = Date.now(), r = W.checkStory(s);
  expect("rejects a case that lists the same finding 5,000 times, quickly", !r.ok && r.errors.some((e) => /twice|at most 4/.test(e)) && Date.now() - t0 < 2000, Date.now() - t0 + " ms");
  const s2 = clone(d5); s2.truth = Array(5000).fill(s2.truth[0]);
  const t1 = Date.now(), r2 = W.checkStory(s2);
  expect("rejects 5,000 truth facts, quickly", !r2.ok && r2.errors.some((e) => /max 60/.test(e)) && Date.now() - t1 < 2000, Date.now() - t1 + " ms");
}

/* ---------- broken Career investigations ---------- */
const crBroken = [
  ["two chapters", (s) => { s.chapters.push(clone(s.chapters[0])); }, /exactly one chapter/],
  ["seven missions", (s) => { while (s.missions.length < 7) s.missions.splice(1, 0, Object.assign(clone(s.missions[0]), { title: "Copy " + s.missions.length, gives: [], steps: [clone(s.missions[0].steps[1])] })); }, /3 to 6 missions/],
  ["no accusation at the end", (s) => { s.missions[2].steps.pop(); }, /must end with an accusation/],
  ["evidence used before it's found", (s) => { s.missions[1].steps[0].pool.push("vanlog"); }, /isn't found until/],
  ["evidence never given", (s) => { s.evidence.extra = ["🧾", "Extra", "Nobody ever finds this."]; }, /never given to the player/],
  ["an unknown person", (s) => { s.missions[2].steps[2].who.push("ghost"); }, /unknown person "ghost"/],
  ["a search that doesn't say how many", (s) => { s.missions[0].steps[0].ask = "Mark the signs that Daniel left on his own."; }, /should say how many to mark/],
  ["an accusation with no wrong choices", (s) => { const k = s.missions[2].steps[2]; k.pool = k.proof.slice(); }, /at least 2 wrong choices/],
  ["an id with HTML in it", (s) => { s.missions[0].steps[0].items[0][0] = 'x" onclick="alert(1)'; }, /bad id/],
  ["steps that aren't a list", (s) => { s.missions[1].steps = "talk to Alma"; }, /steps must be a list/],
  ["notes in the wrong shape", (s) => { s.people.alma.notes = "nosy"; }, /notes must be a list/],
  ["a person called constructor", (s) => { s.missions[2].steps[2].who.push("constructor"); }, /unknown person "constructor"/],
];
for (const [name, mutate, reason] of crBroken) {
  const s = clone(cr); mutate(s);
  let r;
  try { r = W.checkStory(s); } catch (e) { r = { ok: false, errors: ["threw: " + e.message] }; }
  expect(`rejects: ${name}`, !r.ok && r.errors.some((e) => reason.test(e)), r.ok ? "it passed" : r.errors.slice(0, 3).join("\n    "));
}
{
  // a season local's first name is only off limits in Book 1
  const s = clone(cr), local = ((ctx.window.WL_SEASONS || [])[0].cast || [])[0];
  if (local) s.people.alma.name = local[0] + " Bell";
  expect("a player's story may use a season local's name", W.checkStory(s).ok);
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll story checks passed.");
process.exit(failed ? 1 : 0);
