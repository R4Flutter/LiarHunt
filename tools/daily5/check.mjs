// Checks a Daily 5 story: structure, one answer per case, cases that build on each other, nothing given away early.
//   node tools/daily5/check.mjs path/to/story.json     check one story (a draft file or a plain story)
//   node tools/daily5/check.mjs --self-test            the Crown Job must pass, and broken copies of it must fail
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { check, split, ROOT, proofKey } from "./lib.mjs";

const arg = process.argv[2];
if (!arg) { console.log("Usage: node tools/daily5/check.mjs <story.json> | --self-test"); process.exit(2); }

if (arg !== "--self-test") {
  const raw = JSON.parse(readFileSync(arg, "utf8"));
  const r = check(raw.story || raw);
  r.errors.forEach((e) => console.log("✗ " + e));
  r.warnings.forEach((w) => console.log("! " + w));
  if (r.ok) console.log(`✓ passes. Proofs: ${Object.entries(r.proofs).map(([n, p]) => `case ${n}: ${p.map((x) => x.join("+")).join(" or ")}`).join(" · ")}`);
  process.exit(r.ok ? 0 : 1);
}

const good = JSON.parse(readFileSync(join(ROOT, "tools/daily5/fixtures/crown-job.json"), "utf8"));
let failed = 0;
const expect = (name, cond, extra) => { if (cond) console.log("✓ " + name); else { failed++; console.log("✗ " + name + (extra ? "\n    " + extra : "")); } };
const clone = () => JSON.parse(JSON.stringify(good));
const caseN = (s, n) => s.cases[n - 1];

const base = check(good);
expect("the Crown Job passes", base.ok, base.errors.join("\n    "));
expect("case 1 is proven by the canteen receipt alone", JSON.stringify(base.proofs[1]) === '[["e1"]]', JSON.stringify(base.proofs[1]));
expect("reveal docs hold no arrays inside arrays (Firestore refuses them)", !JSON.stringify(split(good, 1).reveals).includes("[["));
expect("case 2 needs the case 1 finding", JSON.stringify(base.proofs[2]) === '[["f1"]]', JSON.stringify(base.proofs[2]));
expect("case 3 needs the printer log plus the case 2 finding", JSON.stringify(base.proofs[3]) === '[["e7","f2"]]', JSON.stringify(base.proofs[3]));
expect("case 4 needs the passage log plus the case 3 finding", JSON.stringify(base.proofs[4]) === '[["e10","f3"]]', JSON.stringify(base.proofs[4]));

// each broken copy must fail, and for the right reason
const broken = [
  ["only four cases", (s) => { s.cases.pop(); }, /exactly 5 cases/],
  ["two liars in one case", (s) => { caseN(s, 1).statements[1].claims = [{ slot: "at:p5", value: "l9", from: "21:00", to: "21:20" }]; }, /Only the liar may lie|Exactly the liar/],
  ["an honest suspect contradicted by evidence", (s) => { caseN(s, 1).evidence[2].shows = [{ slot: "at:p5", value: "l8", from: "21:00", to: "21:00" }]; }, /truth doesn't back/],
  ["a missing reference", (s) => { caseN(s, 2).uses = ["f9"]; }, /isn't a finding from an earlier case/],
  ["a case that ignores the case before", (s) => { caseN(s, 2).evidence.push({ id: "e20", kind: "cctv", title: "Office camera", source: "Director's office", time: "21:15", text: "Victor's screen at 9:15 shows the old footage.", shows: [{ slot: "state:i5", value: "replay", from: "21:15", to: "21:15" }] }); }, /without any earlier finding/],
  ["the liar can't be caught", (s) => { caseN(s, 1).evidence.shift(); }, /nothing the player knows catches the liar/],
  ["a bad verdict option", (s) => { caseN(s, 5).parts[0].answer = "p9"; }, /isn't one of the options/],
  ["the wrong mastermind", (s) => { caseN(s, 5).parts[0].answer = "p2"; }, /isn't the story's mastermind/],
  ["a time contradiction in the truth", (s) => { s.truth.push({ slot: "at:p3", value: "l4", from: "21:00", to: "21:05" }); }, /contradicts itself/],
  ["a leak of a later finding", (s) => { caseN(s, 1).intro += " Victor held Elena's real card from 8:40 to 9:05 PM."; }, /gives away/],
  ["an answer that isn't a lie", (s) => { caseN(s, 1).answer = "s2"; }, /doesn't lie|Exactly the liar/],
  ["a bad time", (s) => { caseN(s, 1).statements[0].claims[0].from = "9pm"; }, /bad time/],
  ["proofs of different sizes", (s) => { caseN(s, 3).evidence.push({ id: "e21", kind: "log", title: "Lab door log", source: "Conservation lab", time: "21:08", text: "Ravi badged out of the lab at 9:08 PM.", shows: [{ slot: "at:p4", value: "l1", from: "21:12", to: "21:12" }] }); }, /different sizes|without any earlier finding/]
];
for (const [name, mutate, reason] of broken) {
  const s = clone(); mutate(s);
  const r = check(s);
  expect(`rejects: ${name}`, !r.ok && r.errors.some((e) => reason.test(e)), r.ok ? "it passed" : r.errors.slice(0, 3).join("\n    "));
}

// the split: keys only in keys, every case readable, the proof key matches the rules' format
const out = split(good, 30);
const pub = JSON.stringify([out.edition, out.cases]);
expect("public case docs hold no answers", !/"(answer|why|finding|truth|motive|secret|claims|shows|part|because)":/.test(pub));
expect("the keys use the rules' format", out.keys.c3.s === "s7" && out.keys.c3.proofs[0] === proofKey(["f2", "e7"]) && out.keys.c5.s === "q1=p1;q2=p4;q3=l7;q4=i4");
expect("each case says how many facts to tap", out.cases[1].need === 1 && out.cases[3].need === 2);
expect("the Hunch never rules out the answer", [1, 2, 3, 4].every((n) => out.hunch[n].out !== out.keys["c" + n].s) && out.hunch[5].out !== out.reveals[5].answer.parts[out.hunch[5].part]);
expect("carried findings appear as facts on the next case", out.cases[3].facts.some((f) => f.id === "f2" && f.from === 2));

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll Daily 5 checks passed.");
process.exit(failed ? 1 : 0);
