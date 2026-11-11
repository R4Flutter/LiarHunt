// Daily 5: shared logic for the tools.
// check(story)  proves every case has exactly one answer, from small facts written next to the prose (js/storycheck.js explains them)
// split(story)  turns a checked story into the documents the game reads, plus the answer keys (never public)
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join, resolve, relative, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, renameSync, readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

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
// A story written somewhere else (by hand, or with Claude in a chat), as a draft for the admin desk. It is "ready" when it
// passes the checker; the blind solvers and the critic can still be run on it from the desk ("Run AI review").
export function importDraft(story, id) {
  const r = check(story), now = new Date().toISOString();
  return { meta: { id, job: "import", slot: 0, brief: {}, createdAt: now, updatedAt: now, status: r.ok ? "ready" : "failed", source: "import",
    for: story.remixOf ? "night" : "daily", remixOf: story.remixOf || "",
    report: { stage: "checked", gate: r.ok, errors: r.errors, warnings: r.warnings }, cost: { usd: 0, input: 0, output: 0, calls: 0 }, hash: hashOf(story), day: 0, notes: [] }, story };
}

/* ---------- the check ----------
   It lives in js/storycheck.js, which the game loads too: the desk and the players' "Write a case" check the same way. */
const box = { window: {} };
vm.createContext(box);
// the art kit first: the checker reads its scene and icon ids
if (existsSync(join(ROOT, "js", "art.js"))) vm.runInContext(readFileSync(join(ROOT, "js", "art.js"), "utf8"), box, { filename: "js/art.js" });
vm.runInContext(readFileSync(join(ROOT, "js", "storycheck.js"), "utf8"), box, { filename: "js/storycheck.js" });
const W = box.window.WLStory;
export const art = box.window.WLArt;
// copied out of the checker's sandbox, so callers get plain objects of this realm
const plain = (x) => JSON.parse(JSON.stringify(x));
export function check(story) { return plain(W.check(story)); }

/* ---------- split into what the game reads ---------- */
// The answer for a proof or a verdict, written the same way here, in the rules and in the game.
export const proofKey = W.proofKey;
export const verdictKey = W.verdictKey;

// The public docs come from the shared checker; the Hunch, the answer keys and the hash are added here (never in the game).
export function split(story, day) {
  const res = check(story);
  if (!res.ok) throw new Error("The story doesn't pass the check:\n" + res.errors.join("\n"));
  const pickBy = (list, salt) => list[parseInt(createHash("sha256").update(story.id + salt).digest("hex").slice(0, 8), 16) % list.length];
  const out = plain(W.docs(story, res));
  out.edition = Object.assign({ day, v: 1, hash: hashOf(story), id: story.id }, out.edition);
  out.hunch = {}; out.keys = {};
  story.cases.forEach((c) => {
    const n = c.n;
    if (c.mode === "verdict") {
      const picks = {}; c.parts.forEach((q) => { picks[q.id] = q.answer; });
      const q = c.parts.find((x) => x.options.length >= 3);
      out.hunch[n] = { part: q.id, out: pickBy(q.options.filter((o) => o.id !== q.answer), "h" + n).id };
      out.keys["c" + n] = { s: verdictKey(picks), proofs: [""] };
      return;
    }
    if (story.v === 2) { // v2: rule out one suspect who tells no lie in this chapter
      const liar = c.statements.find((s) => s.id === c.answer).by;
      out.hunch[n] = { who: pickBy(c.suspects.filter((p) => p !== liar), "h" + n) };
    } else out.hunch[n] = { out: pickBy(c.statements.filter((s) => s.id !== c.answer), "h" + n).id };
    out.keys["c" + n] = { s: c.answer, proofs: res.proofs[n].map(proofKey) };
  });
  return out;
}

// A Story Night remix of a past Daily 5 story: the same people (names, roles, faces), someone else behind it.
// -> a list of problems (empty when it's a proper remix)
export function checkRemix(story, original) {
  const out = [];
  if (!original) return ["the original story isn't in the drafts, so the remix can't be compared"];
  if (story.remixOf !== original.id) out.push(`remixOf is "${story.remixOf}", but the original's id is "${original.id}"`);
  const key = (p) => [p.id, p.name, p.role, p.face].join("|");
  const a = new Set((original.people || []).map(key)), b = new Set((story.people || []).map(key));
  (original.people || []).forEach((p) => { if (!b.has(key(p))) out.push(`${p.name} (${p.id}) must keep the same id, name, role and face as in the original`); });
  (story.people || []).forEach((p) => { if (!a.has(key(p))) out.push(`${p.name} (${p.id}) isn't one of the original's people`); });
  const boss = (s) => ((s.people || []).find((p) => p.part === "mastermind") || {}).id;
  if (boss(story) && boss(story) === boss(original)) out.push(`the mastermind is still ${boss(story)}: in a remix someone else did it`);
  return out;
}

// A day's story is public (the archive) from 6 AM IST the day after it ran, as in the Firestore rules.
// launchUTC is Date.UTC of Daily #1 (js/config.js launchDate).
export function archiveOpen(day, now, launchUTC) { return now >= launchUTC + day * 86400000 - 330 * 60000 + 6 * 3600000; }
