// Tests the season ladder and friends Firestore rules against the emulator: league points can only move by exactly
// what the player's own posted Daily earned, and friends lists stay small and owned.
//   cd tools/daily5 && npm run test:social        (needs Java and the Firebase CLI)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ROOT } from "./lib.mjs";

// The game's own ladder maths, so the expected numbers come from js/engine.js.
const ctx = { console, Intl, Date, Math, location: { origin: "null", search: "" } };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["js/config.js", "js/engine.js"]) vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx);
const WL = ctx.WL;

const env = await initializeTestEnvironment({ projectId: "demo-liarhunt", firestore: { rules: readFileSync(join(ROOT, "firebase/firestore.rules"), "utf8") } });
const score = (uid, day, grid) => ({ uid, name: "", badge: "", day, score: grid.replace(/[^gy]/g, "").length, timeMs: 90000, grid, createdAt: new Date() });
const seeded = (uid, season, f) => Object.assign({ uid, name: uid.toUpperCase(), badge: "", season }, f, { updatedAt: new Date() });
await env.withSecurityRulesDisabled(async (c) => { // posted Dailies, and ladder entries from earlier days
  const db = c.firestore();
  for (const [u, d, g] of [["ana", 15, "ggggg"], ["ana", 16, "gyr--"], ["ana", 17, "ggggg"], ["dee", 16, "r----"], ["fay", 16, "r----"], ["eve", 43, "ggggg"], ["gus", 43, "ggggg"], ["hal", 43, "ggggg"]]) {
    await setDoc(doc(db, "scores", d + "_" + u), score(u, d, g));
  }
  const base = { days: 1, solved: 5, cases: 5, fails: 0, rate: 1000, failRate: 0, last: 15 };
  await setDoc(doc(db, "ladder", "1_dee"), seeded("dee", 1, Object.assign({}, base, { lp: 100, tier: 0 })));
  await setDoc(doc(db, "ladder", "1_fay"), seeded("fay", 1, Object.assign({}, base, { lp: 500, tier: 1 })));
  await setDoc(doc(db, "ladder", "1_eve"), seeded("eve", 1, Object.assign({}, base, { lp: 1200, tier: 2 })));
});

let failed = 0;
async function t(name, fn) { try { await fn(); console.log("✓ " + name); } catch (e) { failed++; console.log("✗ " + name + "\n    " + (e && e.message ? e.message.split("\n")[0] : e)); } }
const as = (uid) => env.authenticatedContext(uid).firestore();
const entry = (uid, season, fields, extra = {}) => Object.assign({ uid, name: uid.toUpperCase(), badge: "", season }, fields, extra, { updatedAt: serverTimestamp() });
const lad = (db, uid, season) => doc(db, "ladder", season + "_" + uid);
const ana = as("ana"), ben = as("ben");

/* ---------- season ladder ---------- */
const d15 = WL.ladderApply(null, 15, "ggggg", 0);
await t("a faked first entry (+10 LP) is refused", async () => {
  await assertFails(setDoc(lad(ana, "ana", 1), entry("ana", 1, Object.assign({}, d15, { lp: d15.lp + 10 }))));
});
await t("the first entry from a posted Daily is accepted", async () => {
  await assertSucceeds(setDoc(lad(ana, "ana", 1), entry("ana", 1, d15)));
});
await t("an entry for a day with no posted Daily is refused", async () => {
  await assertFails(setDoc(lad(ben, "ben", 1), entry("ben", 1, WL.ladderApply(null, 16, "ggggg", 0))));
});
await t("an entry outside its season's days is refused", async () => {
  await assertFails(setDoc(lad(as("hal"), "hal", 1), entry("hal", 1, WL.ladderApply(null, 43, "ggggg", 0))));
});
const d16 = WL.ladderApply(d15, 16, "gyr--", 0);
await t("the next day is added", async () => {
  await assertSucceeds(updateDoc(lad(ana, "ana", 1), Object.assign({}, d16, { updatedAt: serverTimestamp() })));
});
await t("the same day can't be added twice", async () => {
  await assertFails(updateDoc(lad(ana, "ana", 1), Object.assign({}, d16, { lp: d16.lp + 50, updatedAt: serverTimestamp() })));
});
await t("a tier that doesn't match the LP is refused", async () => {
  const d17 = WL.ladderApply(d16, 17, "ggggg", 0);
  await assertFails(updateDoc(lad(ana, "ana", 1), Object.assign({}, d17, { tier: 1, updatedAt: serverTimestamp() })));
});
await t("Bronze loses no LP for a wrong answer", async () => {
  const dee = as("dee"), prev = { lp: 100, tier: 0, days: 1, solved: 5, cases: 5, fails: 0, last: 15 };
  const ok = WL.ladderApply(prev, 16, "r----", 0);
  await assertFails(updateDoc(lad(dee, "dee", 1), Object.assign({}, ok, { lp: 50, updatedAt: serverTimestamp() })));
  await assertSucceeds(updateDoc(lad(dee, "dee", 1), Object.assign({}, ok, { updatedAt: serverTimestamp() })));
});
await t("Silver loses 50 LP for a wrong answer at case 1", async () => {
  const fay = as("fay"), prev = { lp: 500, tier: 1, days: 1, solved: 5, cases: 5, fails: 0, last: 15 };
  const ok = WL.ladderApply(prev, 16, "r----", 0);
  await assertFails(updateDoc(lad(fay, "fay", 1), Object.assign({}, ok, { lp: 500, tier: 1, updatedAt: serverTimestamp() })));
  await assertSucceeds(updateDoc(lad(fay, "fay", 1), Object.assign({}, ok, { updatedAt: serverTimestamp() })));
});
await t("a new season starts one league below last season's finish", async () => {
  const eve = as("eve");
  await assertFails(setDoc(lad(eve, "eve", 2), entry("eve", 2, WL.ladderApply(null, 43, "ggggg", 0))));
  await assertSucceeds(setDoc(lad(eve, "eve", 2), entry("eve", 2, WL.ladderApply(null, 43, "ggggg", WL.seasonStartLp(2)))));
  await assertSucceeds(setDoc(lad(as("gus"), "gus", 2), entry("gus", 2, WL.ladderApply(null, 43, "ggggg", 0))));
});
await t("a name, face or badge can change on its own", async () => {
  await assertSucceeds(updateDoc(lad(ana, "ana", 1), { name: "Ana B", av: "f02", badge: "", updatedAt: serverTimestamp() }));
});
await t("but not with the LP", async () => {
  await assertFails(updateDoc(lad(ana, "ana", 1), { name: "Ana C", lp: 9999, updatedAt: serverTimestamp() }));
});
await t("a bad face code is refused", async () => {
  await assertFails(updateDoc(lad(ana, "ana", 1), { av: "zz", updatedAt: serverTimestamp() }));
});
await t("nobody writes someone else's entry", async () => {
  await assertFails(updateDoc(lad(ben, "ana", 1), { name: "Hacked", updatedAt: serverTimestamp() }));
});
await t("entries are public to read", async () => {
  await assertSucceeds(getDoc(lad(env.unauthenticatedContext().firestore(), "ana", 1)));
});

/* ---------- friends ---------- */
const fr = (uid, list, extra = {}) => Object.assign({ code: uid.toUpperCase().slice(0, 3) + "234", name: uid.toUpperCase(), list }, extra, { updatedAt: serverTimestamp() });
await t("a player claims a free friend code for themselves", async () => {
  await assertSucceeds(setDoc(doc(ana, "fcodes", "ANA234"), { uid: "ana" }));
});
await t("a taken code can't be claimed again", async () => {
  await assertFails(setDoc(doc(ben, "fcodes", "ANA234"), { uid: "ben" }));
});
await t("a code can't point at someone else", async () => {
  await assertFails(setDoc(doc(ben, "fcodes", "BEN234"), { uid: "ana" }));
});
await t("a badly formed code is refused", async () => {
  await assertFails(setDoc(doc(ben, "fcodes", "ben-1"), { uid: "ben" }));
});
await t("anyone signed in can look a code up", async () => {
  await assertSucceeds(getDoc(doc(ben, "fcodes", "ANA234")));
});
await t("a friends list holds up to 8", async () => {
  await assertSucceeds(setDoc(doc(ana, "friends", "ana"), fr("ana", ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"])));
});
await t("a ninth friend is refused", async () => {
  await assertFails(setDoc(doc(ana, "friends", "ana"), fr("ana", ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9"])));
});
await t("nobody writes someone else's list", async () => {
  await assertFails(setDoc(doc(ana, "friends", "ben"), fr("ben", ["ana"])));
});
const ask = (from) => ({ from, name: from.toUpperCase(), kind: "ask", at: serverTimestamp() });
await t("a player sends a friend request in their own name", async () => {
  await assertSucceeds(setDoc(doc(ana, "friends/ben/inbox/ana"), ask("ana")));
});
await t("a request can't be sent as someone else", async () => {
  await assertFails(setDoc(doc(ana, "friends/ben/inbox/cy"), ask("cy")));
  await assertFails(setDoc(doc(ana, "friends/ben/inbox/ana2"), ask("ana")));
});
await t("a request of an unknown kind is refused", async () => {
  await assertFails(setDoc(doc(as("cy"), "friends/ben/inbox/cy"), Object.assign(ask("cy"), { kind: "spam" })));
});
await t("only the receiver reads their requests", async () => {
  await assertSucceeds(getDoc(doc(ben, "friends/ben/inbox/ana")));
  await assertFails(getDoc(doc(ana, "friends/ben/inbox/ana")));
});
await t("a sent request can't be edited or taken back by the sender", async () => {
  await assertFails(updateDoc(doc(ana, "friends/ben/inbox/ana"), { name: "Changed" }));
  await assertFails(deleteDoc(doc(ana, "friends/ben/inbox/ana")));
});
await t("the receiver clears a request", async () => {
  await assertSucceeds(deleteDoc(doc(ben, "friends/ben/inbox/ana")));
});

await env.cleanup();
console.log(failed ? `\n${failed} rules test(s) failed.` : "\nAll ladder and friends rules tests passed.");
process.exit(failed ? 1 : 0);
