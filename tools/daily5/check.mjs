// Checks a Daily 5 story: structure, one answer per case, cases that build on each other, nothing given away early.
//   node tools/daily5/check.mjs path/to/story.json     check one story (a draft file or a plain story)
//   node tools/daily5/check.mjs --self-test            the Crown Job must pass, and broken copies of it must fail
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { check, split, splitWeek, ROOT, proofKey, importDraft, art, checkRemix, dataDir, writeJson, readJson, archiveOpen } from "./lib.mjs";

const arg = process.argv[2];
if (!arg) { console.log("Usage: node tools/daily5/check.mjs <story.json> | --import <story.json>... [--force] | --player <story.json> | --self-test"); process.exit(2); }
const readStory = (f) => { const raw = JSON.parse(readFileSync(f, "utf8")); return raw.story || raw; };

// --player: only what a player can ever see before answering (for a blind solver). No reveals, keys, why or ending.
if (arg === "--player") {
  const story = readStory(process.argv[3]), out = split(story, 0), ed = Object.assign({}, out.edition);
  delete ed.strikes; delete ed.hash; delete ed.day; delete ed.v;
  console.log(JSON.stringify({ edition: ed, cases: out.cases }, null, 2));
  process.exit(0);
}

// --import: checked stories become drafts for the admin desk, with the id d5-<story id>
if (arg === "--import") {
  const files = process.argv.slice(3).filter((f) => f !== "--force"), force = process.argv.includes("--force");
  let bad = 0;
  for (const f of files) {
    const story = readStory(f), id = "d5-" + story.id, path = join(dataDir("drafts"), id + ".json");
    if (existsSync(path) && !force) { console.log(`✗ ${f}: draft ${id} already exists (add --force to replace it)`); bad++; continue; }
    const d = importDraft(story, id);
    if (story.remixOf) {
      const orig = join(dataDir("drafts"), "d5-" + story.remixOf + ".json");
      const probs = checkRemix(story, existsSync(orig) ? readJson(orig).story : null);
      if (probs.length) { d.meta.status = "failed"; d.meta.report.errors.push(...probs.map((p) => "remix: " + p)); }
    }
    writeJson(path, d);
    if (d.meta.status === "ready") console.log(`✓ ${f} -> draft ${id}`);
    else { bad++; console.log(`✗ ${f} -> draft ${id}, but it fails the check:\n    ` + d.meta.report.errors.slice(0, 8).join("\n    ")); }
  }
  process.exit(bad ? 1 : 0);
}

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

// A story written elsewhere (by hand, or with Claude in a chat) comes in through the admin desk's Import.
const imp = importDraft(clone(), "imp-1");
expect("an imported story that passes is ready", imp.meta.status === "ready" && imp.meta.source === "import" && imp.meta.for === "daily" && imp.meta.day === 0 && imp.story.title === good.title);
const bad = importDraft(Object.assign(clone(), { cases: clone().cases.slice(0, 4) }), "imp-2"); // the fixture has 5 cases
expect("an imported story that fails the check is marked failed, with the reasons", bad.meta.status === "failed" && bad.meta.report.errors.length > 0);

// v2: a chapter is searched, questioned, then accused (fixtures/ferry-strongbox.json, a test story never published)
const v2 = JSON.parse(readFileSync(join(ROOT, "tools/daily5/fixtures/ferry-strongbox.json"), "utf8"));
const clone2 = () => JSON.parse(JSON.stringify(v2));
const r2 = check(v2);
expect("the Ferry Strongbox (v2) passes", r2.ok, r2.errors.slice(0, 8).join("\n    "));
expect("v2 lie kinds", JSON.stringify(r2.kinds) === '{"1":"seen","2":"place","3":"travel","4":"count"}', JSON.stringify(r2.kinds));
expect("v2 case 2 needs the camera plus the case 1 finding", JSON.stringify(r2.proofs[2]) === '[["e6","f1"]]', JSON.stringify(r2.proofs[2]));
expect("v2 case 3 is caught by the walking time alone", JSON.stringify(r2.proofs[3]) === '[["f2"]]', JSON.stringify(r2.proofs[3]));
const out2 = split(v2, 1);
expect("v2 docs carry no answers", !/"(answer|claims|why|lie|truth|motive|secret|part|because|shows)":/.test(JSON.stringify([out2.edition, out2.cases])));
expect("v2 docs say it's v2 and carry faces, spots, questions and presses", out2.edition.fmt === 2 && out2.edition.cast[0].face === "f05" && out2.cases[1].fmt === 2 && out2.cases[1].spots.length === 8 && out2.cases[1].questions.length === 8 && out2.cases[1].presses.length === 2 && out2.cases[1].statements.length === 10);
expect("v2 reveals name the kind of lie", out2.reveals[3].lie === "travel");
expect("v2 verdict options keep faces and icons", out2.cases[5].parts[0].options[0].face === "f05" && out2.cases[5].parts[2].options[0].icon === "crate");
expect("v2 hunch names a suspect who isn't the liar", [1, 2, 3, 4].every((n) => { const c = v2.cases[n - 1], liar = c.statements.find((s) => s.id === c.answer).by; return c.suspects.includes(out2.hunch[n].who) && out2.hunch[n].who !== liar; }));
expect("v2 keys use the same format", out2.keys.c2.s === "s12" && out2.keys.c2.proofs[0] === proofKey(["e6", "f1"]));
expect("the old Crown Job still passes as v1", check(good).ok);
// a week: Monday to Friday, one chapter a day, each judged as case 1 of its day
const week = splitWeek(v2, 22);
expect("a week is five days from a Monday", week.map((x) => x.day).join() === "22,23,24,25,26" && week.every((x, i) => x.edition.ch === i + 1 && x.edition.week === 22 && x.edition.strikes === 1));
expect("each day keys only its own chapter, as c1", week.every((x, i) => Object.keys(x.keys).join() === "c1" && x.keys.c1.s === out2.keys["c" + (i + 1)].s && x.case.n === i + 1));
expect("only Friday carries the full story", week.every((x, i) => (i === 4) === !!x.finale));
expect("a week can't start on a Tuesday", (() => { try { splitWeek(v2, 23); return false; } catch (e) { return /Monday/.test(e.message); } })());
expect("a weekday's public docs carry no answers", !/"(answer|claims|why|lie|truth|motive|secret|part|because|shows)":/.test(JSON.stringify(week.map((x) => [x.edition, x.case]))));
const broken2 = [
  ["a travel lie with no travel times", (s) => { delete s.travel; }, /nothing the player knows catches|doesn't lie/],
  ["a spot on an unknown anchor", (s) => { s.cases[0].spots[0].anchor = "moon"; }, /anchor/],
  ["an unknown icon", (s) => { s.cases[0].spots[0].icon = "unicorn"; }, /icon/],
  ["evidence no spot finds", (s) => { s.cases[0].spots[0].finds = ""; }, /found by exactly one spot/],
  ["only one empty spot", (s) => { s.cases[0].spots.splice(2, 2); }, /nothing|7 to 10/],
  ["the lie heard without any evidence", (s) => { s.cases[0].questions[1].needs = []; }, /only after/],
  ["a statement nobody can hear", (s) => { s.cases[1].questions.pop(); }, /heard/],
  ["a question about evidence from another case", (s) => { s.cases[1].questions[1].needs = ["e1"]; }, /needs/],
  ["a press by someone who isn't a suspect", (s) => { s.cases[0].presses[0].by = "p5"; }, /press/],
  ["only the liar is pressed", (s) => { s.cases[1].presses = [{ by: "p4", shown: "e6", says: "s20" }]; s.cases[1].statements.find((x) => x.id === "s20").by = "p4"; s.cases[1].statements.splice(10, 1); }, /press/],
  ["two people share a face", (s) => { s.people[1].face = s.people[0].face; }, /face/],
  ["a verdict with three parts", (s) => { s.cases[4].parts.pop(); }, /4 questions|exactly 4/],
  ["a route option without an icon", (s) => { delete s.cases[4].parts[2].options[1].icon; }, /icon/],
  ["strikes 1 in v2", (s) => { s.strikes = 1; }, /strikes/],
  ["the lie only comes out by showing a past finding", (s) => { const c = s.cases[1]; c.questions = c.questions.filter((q) => q.says !== "s12"); c.presses.push({ by: "p4", shown: "f1", says: "s12" }); }, /only after|search/],
  ["a lie kind that doesn't fit", (s) => { s.cases[2].lie = "time"; }, /travel/],
  ["an unknown lie kind", (s) => { s.cases[0].lie = "fib"; }, /lie must be/]
];
for (const [name, mutate, reason] of broken2) {
  const s = clone2(); mutate(s);
  const r = check(s);
  expect(`v2 rejects: ${name}`, !r.ok && r.errors.some((e) => reason.test(e)), r.ok ? "it passed" : r.errors.slice(0, 3).join("\n    "));
}
const tw = clone2(); tw.cases[1].finding.text = tw.cases[1].finding.text.replace(/\s*It's a 15-minute walk[^.]*\./, "");
expect("warns when a 'too fast' proof never states the walking time", check(tw).warnings.some((w) => /walking time/.test(w)), check(tw).warnings.join("; "));
expect("no walking-time warning when the proof states it", !r2.warnings.some((w) => /walking time/.test(w)), r2.warnings.join("; "));
const wk = clone2(); wk.cases[1].lie = "seen";
expect("v2 warns when a story uses fewer than 4 kinds of lie", check(wk).warnings.some((w) => /kinds of lie/.test(w)));

// a Story Night remix keeps the people and changes who did it
const rmx = clone2(); rmx.id = "ferry-strongbox-x"; rmx.remixOf = v2.id;
expect("a remix with the same mastermind is refused", checkRemix(rmx, v2).some((p) => /mastermind/.test(p)));
const rmx2 = clone2(); rmx2.remixOf = v2.id; rmx2.people.find((p) => p.id === "p1").part = "innocent"; rmx2.people.find((p) => p.id === "p5").part = "mastermind";
expect("a remix with someone else behind it is fine", checkRemix(rmx2, v2).length === 0, checkRemix(rmx2, v2).join("; "));
const rmx3 = clone2(); rmx3.remixOf = v2.id; rmx3.people[4].part = "mastermind"; rmx3.people[0].part = "innocent"; rmx3.people[2].name = "Ivan Petrov";
expect("a remix that renames someone is refused", checkRemix(rmx3, v2).some((p) => /Ivan Petrov|Ivo Petrov/.test(p)));
const L = Date.UTC(2026, 9, 26); // Daily #1
expect("a day's story stays private until 6 AM IST the next day", archiveOpen(16, Date.UTC(2026, 10, 11, 0, 29), L) === false);
expect("a day's story is public from 6 AM IST the next day", archiveOpen(16, Date.UTC(2026, 10, 11, 0, 30), L) === true);
expect("an imported remix is for Story Night", importDraft(Object.assign(clone2(), { remixOf: "x" }), "d5-r").meta.for === "night");

// the art kit (js/art.js): the scenes and icons a v2 story may name
if (!art) expect("the art kit loads", false, "js/art.js is missing or sets no WLArt");
else {
  expect("12 scenes", Object.keys(art.SCENES).length === 12, Object.keys(art.SCENES).join());
  expect("every scene has 8-12 anchors inside the frame", Object.values(art.SCENES).every((s) => { const a = Object.values(s.anchors); return a.length >= 8 && a.length <= 12 && a.every(([x, y]) => x >= 4 && x <= 96 && y >= 4 && y <= 96); }));
  const tight = []; Object.entries(art.SCENES).forEach(([id, s]) => { const a = Object.entries(s.anchors); a.forEach(([n1, p1], i) => a.slice(i + 1).forEach(([n2, p2]) => { if (Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) < 8) tight.push(id + ": " + n1 + "/" + n2); })); });
  expect("pins in a scene are at least 8% apart", !tight.length, tight.join(", "));
  expect("every scene draws", Object.keys(art.SCENES).every((id) => art.scene(id).startsWith("<svg") && art.scene(id).includes('viewBox="0 0 320 210"')));
  expect("scenes use no hard-coded colours", Object.keys(art.SCENES).every((id) => !/fill="#|stroke="#/.test(art.scene(id))));
  expect("at least 30 icons, all draw", art.ICONS.length >= 30 && art.ICONS.every((i) => art.icon(i).includes("<svg")), art.ICONS.length + " icons");
  expect("six lie kinds", Object.keys(art.LIES).join() === "time,place,travel,seen,holder,count");
  expect("lie icons exist", Object.values(art.LIES).every((l) => art.ICONS.includes(l.icon)));
}

// every season place has a drawn scene, so a story set there can be searched
{
  const sbox = { window: {} };
  vm.createContext(sbox);
  vm.runInContext(readFileSync(join(ROOT, "js/seasons.js"), "utf8"), sbox);
  (sbox.window.WL_SEASONS || []).forEach((pack, i) => {
    const sc = pack.scenes || {}, missing = (pack.places || []).filter((p) => !art || !art.SCENES[sc[p]]);
    expect(`season ${i + 1}: every place has a drawn scene`, !missing.length, "no scene for: " + missing.join(", "));
  });
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll Daily 5 checks passed.");
process.exit(failed ? 1 : 0);
