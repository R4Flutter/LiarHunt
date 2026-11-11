// Tests the Daily 5 Firestore rules against the emulator: one chapter a day, answers can't be tried twice or faked,
// keys never leak, and a Daily score must match the run.
//   cd tools/daily5 && npm install && npm run test:rules        (needs Java and the Firebase CLI)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { splitWeek, ROOT } from "./lib.mjs";

const cfg = readFileSync(join(ROOT, "js/config.js"), "utf8").match(/launchDate:\s*"(\d{4})-(\d{2})-(\d{2})"/).slice(1).map(Number);
const LAUNCH = Date.UTC(cfg[0], cfg[1] - 1, cfg[2]), DAY = 86400000;
const istDay = () => { const x = new Date(Date.now() + 330 * 60000); return Math.floor((Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) - LAUNCH) / DAY) + 1; };
const TODAY = istDay(), TOMORROW = TODAY + 1, OLD = TODAY - 3;
// the week's five days as the admin tool publishes them (fixtures/ferry-strongbox.json, a test story never published)
const story = JSON.parse(readFileSync(join(ROOT, "tools/daily5/fixtures/ferry-strongbox.json"), "utf8"));
const week = splitWeek(story, 1);
const env = await initializeTestEnvironment({ projectId: "demo-liarhunt", firestore: { rules: readFileSync(join(ROOT, "firebase/firestore.rules"), "utf8") } });
// put chapter n on a day (the rules only care which day it is, not which weekday)
const put = (day, n) => env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore(), b = week[n - 1];
  await setDoc(doc(db, "d5", String(day)), Object.assign({}, b.edition, { day }));
  await setDoc(doc(db, "d5keys", String(day)), b.keys);
  await setDoc(doc(db, `d5/${day}/cases/1`), b.case);
  await setDoc(doc(db, `d5/${day}/reveals/1`), b.reveal);
  await setDoc(doc(db, `d5/${day}/hunch/1`), b.hunch);
  if (b.finale) await setDoc(doc(db, `d5/${day}/end/finale`), b.finale);
});
await put(TODAY, 2); await put(TOMORROW, 3); await put(OLD, 5);

let failed = 0;
async function t(name, fn) { try { await fn(); console.log("✓ " + name); } catch (e) { failed++; console.log("✗ " + name + "\n    " + (e && e.message ? e.message.split("\n")[0] : e)); } }
const as = (uid) => env.authenticatedContext(uid).firestore();
const run = (db, uid, day = TODAY) => doc(db, "d5runs", day + "_" + uid);
const start = (db, uid, day = TODAY, extra = {}) => setDoc(run(db, uid, day), Object.assign({ uid, day, picks: {}, grid: "", strikes: 1, hunch: 0, startedAt: serverTimestamp() }, extra));
const commit = (db, uid, n, s, p) => updateDoc(run(db, uid), { ["picks.c" + n]: { s, p, at: serverTimestamp() } });
const grid = (db, uid, g) => updateDoc(run(db, uid), { grid: g });
const RIGHT = ["s12", "e6,f1"]; // chapter 2, today's
const VERDICT = [week[4].keys.c1.s, ""];

const anon = env.unauthenticatedContext().firestore();
const ana = as("ana"), ben = as("ben"), cy = as("cy"), dee = as("dee");

await t("today's chapter is public, tomorrow's is not", async () => {
  await assertSucceeds(getDoc(doc(anon, "d5", String(TODAY))));
  await assertFails(getDoc(doc(anon, "d5", String(TOMORROW))));
});
await t("answer keys can never be read or listed", async () => {
  await assertFails(getDoc(doc(ana, "d5keys", String(TODAY))));
  await assertFails(getDocs(collection(ana, "d5keys")));
  await assertFails(getDoc(doc(anon, "d5keys", String(OLD))));
});
await t("the chapter can't be read before starting a run", async () => {
  await assertFails(getDoc(doc(ana, `d5/${TODAY}/cases/1`)));
});
await t("a run can't start on tomorrow's or an old chapter, or with more strikes or a grid faked", async () => {
  await assertFails(start(ana, "ana", TOMORROW));
  await assertFails(start(ana, "ana", OLD));
  await assertFails(start(ana, "ana", TODAY, { strikes: 2 }));
  await assertFails(start(ana, "ana", TODAY, { grid: "g" }));
});
await t("starting a run opens the day's one chapter", async () => {
  await assertSucceeds(start(ana, "ana"));
  await assertSucceeds(getDoc(doc(ana, `d5/${TODAY}/cases/1`)));
  await assertFails(getDoc(doc(ana, `d5/${TODAY}/cases/2`)));
  await assertFails(getDoc(doc(ana, `d5/${TODAY}/reveals/1`)));
});
await t("another player can't read or change my run", async () => {
  await assertFails(getDoc(run(ben, "ana")));
  await assertFails(updateDoc(run(ben, "ana"), { hunch: 1 }));
});
await t("the chapter can't be resolved before its answer is committed", async () => {
  await assertFails(grid(ana, "ana", "g"));
});
await t("commit, then the reveal opens; a second answer is refused", async () => {
  await assertFails(commit(ana, "ana", 2, ...RIGHT)); // only c1 exists in a day
  await assertSucceeds(commit(ana, "ana", 1, ...RIGHT));
  await assertSucceeds(getDoc(doc(ana, `d5/${TODAY}/reveals/1`)));
  await assertFails(commit(ana, "ana", 1, "s2", "e3"));
});
await t("a right answer can't be resolved as wrong, or with a Hunch it didn't use", async () => {
  await assertFails(grid(ana, "ana", "r"));
  await assertFails(grid(ana, "ana", "y"));
  await assertFails(grid(ana, "ana", "gg"));
  await assertSucceeds(grid(ana, "ana", "g"));
  await assertFails(grid(ana, "ana", "g"));
  await assertFails(commit(ana, "ana", 2, ...RIGHT)); // nothing more today
  await assertFails(updateDoc(run(ana, "ana"), { hunch: 1 }));
});
await t("the Hunch works once, before answering, and turns the chapter amber", async () => {
  await assertSucceeds(start(dee, "dee"));
  await assertFails(updateDoc(run(dee, "dee"), { hunch: 2 }));
  await assertSucceeds(updateDoc(run(dee, "dee"), { hunch: 1 }));
  await assertSucceeds(getDoc(doc(dee, `d5/${TODAY}/hunch/1`)));
  await assertFails(updateDoc(run(dee, "dee"), { hunch: 0 }));
  await assertSucceeds(commit(dee, "dee", 1, ...RIGHT));
  await assertFails(grid(dee, "dee", "g"));
  await assertSucceeds(grid(dee, "dee", "y"));
});
await t("a wrong answer can't be resolved as right", async () => {
  await assertSucceeds(start(ben, "ben"));
  await assertSucceeds(commit(ben, "ben", 1, "s11", "e6,f1"));
  await assertFails(grid(ben, "ben", "g"));
  await assertSucceeds(grid(ben, "ben", "r"));
  await assertSucceeds(getDoc(doc(ben, `d5/${TODAY}/cases/1`))); // what you played stays readable
  await assertFails(commit(ben, "ben", 2, ...RIGHT));
});
await t("the right suspect with the wrong proof is a wrong answer", async () => {
  await assertSucceeds(start(cy, "cy"));
  await assertSucceeds(commit(cy, "cy", 1, "s12", "e6"));
  await assertFails(grid(cy, "cy", "g"));
  await assertSucceeds(grid(cy, "cy", "r"));
});
const score = (db, uid, g, s) => setDoc(doc(db, "scores", TODAY + "_" + uid), { uid, name: "", badge: "", day: TODAY, score: s, timeMs: 90000, grid: g, createdAt: serverTimestamp() });
await t("a Daily score must be the player's chapter, counted as a whole day", async () => {
  await assertFails(score(ana, "ana", "g----", 1));
  await assertFails(score(ana, "ana", "yyyyy", 5));
  await assertSucceeds(score(ana, "ana", "ggggg", 5));
  await assertFails(score(dee, "dee", "ggggg", 5));
  await assertSucceeds(score(dee, "dee", "yyyyy", 5));
  await assertFails(score(ben, "ben", "ggggg", 5));
  await assertFails(score(ben, "ben", "rrrrr", 0));
  await assertSucceeds(score(ben, "ben", "r----", 0));
  const eli = as("eli");
  await assertFails(score(eli, "eli", "ggggg", 5)); // no run at all on a story day
  await assertSucceeds(start(eli, "eli"));
  await assertFails(score(eli, "eli", "r----", 0)); // a run, but no answer yet
});
await t("an old chapter is a public archive, except its key", async () => {
  await assertSucceeds(getDoc(doc(anon, `d5/${OLD}/cases/1`)));
  await assertSucceeds(getDoc(doc(anon, `d5/${OLD}/reveals/1`)));
  await assertSucceeds(getDoc(doc(anon, `d5/${OLD}/end/finale`)));
  await assertFails(getDoc(doc(anon, "d5keys", String(OLD))));
});
await t("nobody can write stories, keys or other docs from the game", async () => {
  await assertFails(setDoc(doc(ana, "d5", String(TODAY + 5)), { title: "x" }));
  await assertFails(setDoc(doc(ana, `d5/${TODAY}/cases/1`), { title: "x" }));
  await assertFails(setDoc(doc(ana, "d5keys", String(TODAY + 5)), { c1: {} }));
});

// Friday: the verdict, and the full story once the player has given theirs (right or wrong)
await put(TODAY, 5);
const fay = as("fay"), gus = as("gus");
await t("Friday: the full story stays shut until the verdict is in", async () => {
  await assertSucceeds(start(fay, "fay"));
  await assertFails(getDoc(doc(fay, `d5/${TODAY}/end/finale`)));
  await assertSucceeds(commit(fay, "fay", 1, ...VERDICT));
  await assertFails(getDoc(doc(fay, `d5/${TODAY}/end/finale`))); // committed, not yet judged
  await assertSucceeds(grid(fay, "fay", "g"));
  await assertSucceeds(getDoc(doc(fay, `d5/${TODAY}/end/finale`)));
});
await t("Friday: a wrong verdict also opens the full story", async () => {
  await assertSucceeds(start(gus, "gus"));
  await assertSucceeds(commit(gus, "gus", 1, "q1=p9", ""));
  await assertSucceeds(grid(gus, "gus", "r"));
  await assertSucceeds(getDoc(doc(gus, `d5/${TODAY}/end/finale`)));
});

// Friends' rooms: Race, Partners and Story Night
const room = (db, code) => doc(db, "rooms", code);
const newRoom = (db, uid, code, extra = {}) => setDoc(room(db, code), Object.assign({ host: uid, hostName: "Host", seed: "abcd1234", season: 1, state: "lobby", round: 0, rounds: 5, roundAt: serverTimestamp(), createdAt: serverTimestamp() }, extra));
const seat = (db, code, uid, extra = {}) => setDoc(doc(db, `rooms/${code}/players/${uid}`), Object.assign({ name: "Pat", score: 0, ans: {}, joinedAt: serverTimestamp(), at: serverTimestamp() }, extra));
await t("rooms: race, partners and night can open; other modes and stray story fields can't", async () => {
  await assertSucceeds(newRoom(ana, "ana", "RACE22"));
  await assertSucceeds(newRoom(ana, "ana", "PART22", { mode: "partners" }));
  await assertSucceeds(newRoom(ana, "ana", "NITE22", { mode: "night", story: "" }));
  await assertFails(newRoom(ana, "ana", "BADM22", { mode: "chaos" }));
  await assertFails(newRoom(ana, "ana", "BADS22", { mode: "partners", story: "x" }));
});
await t("rooms: a player saves a seat with a ping and a seen flag, only their own", async () => {
  await assertSucceeds(seat(ben, "RACE22", "ben"));
  await assertSucceeds(updateDoc(doc(ben, "rooms/RACE22/players/ben"), { at: serverTimestamp(), seen: true }));
  await assertFails(updateDoc(doc(ben, "rooms/RACE22/players/ben"), { seen: "yes" }));
  await assertFails(seat(ben, "RACE22", "cy"));
});
await t("rooms: only a Story Night host can pick its story", async () => {
  await assertSucceeds(seat(ben, "NITE22", "ben"));
  await assertSucceeds(updateDoc(room(ana, "NITE22"), { story: "demo-crown" }));
  await assertFails(updateDoc(room(ben, "NITE22"), { story: "other" }));
  await assertFails(updateDoc(room(ana, "RACE22"), { story: "demo-crown" }));
  await assertSucceeds(updateDoc(room(ana, "NITE22"), { state: "lobby", round: 0, story: "", seed: "newseed1" }));
});
await t("rooms: a Story Night host can play a story they made (its link code in pack, up to 12,000 characters)", async () => {
  await assertSucceeds(updateDoc(room(ana, "NITE22"), { story: "u-1a2b3c", pack: "z" + "A".repeat(11999) }));
  await assertFails(updateDoc(room(ana, "NITE22"), { pack: "z" + "A".repeat(12000) }));
  await assertFails(updateDoc(room(ben, "NITE22"), { pack: "zAAAA" }));
  await assertFails(updateDoc(room(ana, "RACE22"), { pack: "zAAAA" }));
  await assertSucceeds(updateDoc(room(ana, "NITE22"), { story: "demo-crown", pack: "" }));
});
await t("Story Night stories are public to read, and nobody writes them from the game", async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "nights/demo-crown"), { title: "x" }));
  await assertSucceeds(getDoc(doc(anon, "nights/demo-crown")));
  await assertSucceeds(getDoc(doc(anon, "nights/demo-crown/cases/1")));
  await assertFails(setDoc(doc(ana, "nights/mine"), { title: "x" }));
  await assertFails(setDoc(doc(ana, "nights/demo-crown/cases/1"), { title: "x" }));
});

await env.cleanup();
console.log(failed ? `\n${failed} rules test(s) failed.` : "\nAll Daily 5 rules tests passed.");
process.exit(failed ? 1 : 0);
