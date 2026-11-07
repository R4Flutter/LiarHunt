// Writes new Daily 5 stories with Claude, checks them, and saves drafts for review in the admin tool.
//   node tools/daily5/generate.mjs --count 5             a new batch of 5 (the default)
//   node tools/daily5/generate.mjs --resume <job>        finish a batch that stopped part way; finished steps are never redone
//   node tools/daily5/generate.mjs --redo <draft-id>     write that draft again from a fresh blueprint
//   node tools/daily5/generate.mjs --redo <draft-id> --case 3   rewrite only case 3's wording, keeping the logic
//   node tools/daily5/generate.mjs --remix <draft-id>    a Story Night remix of a past Daily: same setting and kind of crime,
//                                                        a new cast, a different mastermind and a different innocent liar
//   --dry-run                                            every step without calling the API (answers with the Crown Job), free
// Needs ANTHROPIC_API_KEY (or `ant auth login`) and `npm install` in tools/daily5.
// Drafts go to ~/.liarhunt/daily5 (LIARHUNT_DATA moves it), never into this repo: they hold the answers.
import { join } from "node:path";
import { readdirSync, rmSync } from "node:fs";
import { check, split, dataDir, readJson, writeJson, exists, ROOT, hashOf } from "./lib.mjs";
import * as P from "./prompts.mjs";

const MODELS = { writer: "claude-opus-5-5", solver: "claude-sonnet-5-5", critic: "claude-opus-5-5" };
const PRICE = { "claude-opus-5-5": [4, 20, 0.2], "claude-sonnet-5-5": [2, 10, 0.2] }; // $ per million tokens: input, output, cache read
const SOLVER_RUNS = 2;

const args = process.argv.slice(2);
const flag = (name) => args.includes("--" + name);
const opt = (name, d) => { const i = args.indexOf("--" + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const DRY = flag("dry-run");
const DRAFTS = dataDir("drafts");
const EXAMPLE = readJson(join(ROOT, "tools/daily5/fixtures/crown-job.json"));
const log = (...a) => console.log(new Date().toTimeString().slice(0, 8), ...a);

/* ---------- talking to Claude ---------- */
let api = null;
async function client() {
  if (api || DRY) return api;
  let Anthropic;
  try { Anthropic = (await import("@anthropic-ai/sdk")).default; }
  catch (e) { throw new Error("The Anthropic SDK isn't installed. Run: cd tools/daily5 && npm install"); }
  api = new Anthropic({ maxRetries: 4 });
  return api;
}
function newCost() { return { usd: 0, input: 0, output: 0, calls: 0 }; }
function addCost(cost, model, u) {
  const p = PRICE[model] || PRICE[MODELS.writer];
  const inp = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 1.25;
  cost.input += u.input_tokens || 0; cost.output += u.output_tokens || 0; cost.calls++;
  cost.usd += (inp * p[0] + (u.output_tokens || 0) * p[1] + (u.cache_read_input_tokens || 0) * p[2]) / 1e6;
}
// One structured call. Returns the parsed JSON and the reply as sent (thinking blocks included), for a follow-up turn.
async function ask(cost, role, system, messages, schema, effort) {
  if (DRY) return dryAnswer(schema, messages);
  const c = await client();
  const stream = c.beta.messages.stream({
    model: MODELS[role], max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { effort, format: { type: "json_schema", schema } },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" // a declined request is retried on another model
  });
  const msg = await stream.finalMessage();
  addCost(cost, msg.model || MODELS[role], msg.usage || {});
  if (msg.stop_reason === "refusal") throw new Error(`${role}: Claude declined this request`);
  if (msg.stop_reason === "max_tokens") throw new Error(`${role}: the answer ran out of room`);
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try { return { json: JSON.parse(text), content: msg.content }; }
  catch (e) { throw new Error(`${role}: the reply wasn't valid JSON`); }
}
// --dry-run: answers as if Claude wrote the Crown Job (D5_DRY_FAIL=blueprint makes the first blueprint wrong, to test the repair)
let dryFail = process.env.D5_DRY_FAIL || "";
function dryAnswer(schema, messages) {
  const keys = split(EXAMPLE, 0).keys;
  const last = String(messages[messages.length - 1].content);
  if (schema === P.BLUEPRINT_SCHEMA) {
    const bp = P.toBlueprint(EXAMPLE);
    if (dryFail === "blueprint") { dryFail = ""; bp.cases[0].statements[1].claims[0].value = "l9"; }
    return { json: bp, content: [{ type: "text", text: "{}" }] };
  }
  if (schema === P.NARRATIVE_SCHEMA) return { json: P.toNarrative(EXAMPLE), content: [{ type: "text", text: "{}" }] };
  if (schema === P.SOLVE_SCHEMA) {
    const n = +(/CASE (\d)/.exec(last) || [0, 1])[1], k = keys["c" + n];
    return { json: { answer: k.s, proof: k.proofs[0].split(","), confidence: 90, alternatives: [], problems: [] } };
  }
  if (schema === P.VERDICT_SOLVE_SCHEMA) {
    return { json: { answers: keys.c5.s.split(";").map((x) => ({ question: x.split("=")[0], option: x.split("=")[1] })), confidence: 85, problems: [] } };
  }
  return { json: { verdict: "pass", issues: [] } };
}

/* ---------- the steps ---------- */
// Logic errors only: the blueprint has no final wording yet, so text checks wait for Stage B.
const TEXT_ERR = /is missing|characters \(max|gives away|chronology|finale|timeline/;
function blueprintErrors(bp) {
  const shell = P.merge("check-blueprint", bp, {
    intro: "x", finale: { text: "x", chronology: [] },
    cases: (bp.cases || []).map((c) => ({ n: c.n, title: "x", intro: "x", previously: c.n > 1 ? "x" : "", ask: "x", why: "x", finding: (c.finding && c.finding.gist) || "x",
      statements: (c.statements || []).map((s) => ({ id: s.id, text: s.gist })), evidence: (c.evidence || []).map((e) => ({ id: e.id, title: "x", source: "x", text: e.gist })),
      timeline: [{ at: "20:00", text: "x" }], parts: (c.parts || []).map((q) => ({ id: q.id, ask: "x" })) }))
  });
  return check(shell).errors.filter((e) => !TEXT_ERR.test(e));
}
async function stageA(cost, brief, avoid) {
  const p = P.blueprintPrompt(brief, avoid, P.toBlueprint(EXAMPLE));
  const msgs = [{ role: "user", content: p.user }];
  let r = await ask(cost, "writer", p.system, msgs, P.BLUEPRINT_SCHEMA, "high");
  let errs = blueprintErrors(r.json);
  if (errs.length) {
    log(`  blueprint: ${errs.length} problem(s), asking for one repair`);
    msgs.push({ role: "assistant", content: r.content }, { role: "user", content: P.repairPrompt(errs) });
    r = await ask(cost, "writer", p.system, msgs, P.BLUEPRINT_SCHEMA, "high");
    errs = blueprintErrors(r.json);
  }
  return { blueprint: r.json, errors: errs };
}
async function stageB(cost, id, bp, onlyCase, old) {
  const p = P.narrativePrompt(bp, P.toNarrative(EXAMPLE));
  let user = p.user;
  if (onlyCase) user += `\n\nThis is the current wording. Rewrite ONLY case ${onlyCase} (title, intro, previously, ask, statements, evidence, why, finding, timeline) and return everything else exactly as it is:\n` + JSON.stringify(old);
  const msgs = [{ role: "user", content: user }];
  const build = (nar) => {
    if (onlyCase) nar = Object.assign({}, old, { cases: old.cases.map((c) => c.n === onlyCase ? (nar.cases || []).find((x) => x.n === onlyCase) || c : c) });
    return { narrative: nar, story: P.merge(id, bp, nar, 1) };
  };
  let r = await ask(cost, "writer", p.system, msgs, P.NARRATIVE_SCHEMA, "medium");
  let out = build(r.json), res = check(out.story);
  if (!res.ok) {
    log(`  wording: ${res.errors.length} problem(s), asking for one repair`);
    msgs.push({ role: "assistant", content: r.content }, { role: "user", content: P.repairPrompt(res.errors) });
    r = await ask(cost, "writer", p.system, msgs, P.NARRATIVE_SCHEMA, "medium");
    out = build(r.json); res = check(out.story);
  }
  return Object.assign(out, { check: res });
}
// The blind solver gets only what a player sees at each case, never the answers.
async function solve(cost, story) {
  const out = split(story, 0), runs = [];
  for (let n = 1; n <= 5; n++) {
    const view = P.playerView(out, n), verdict = n === 5;
    runs.push(Promise.all(Array.from({ length: SOLVER_RUNS }, () =>
      ask(cost, "solver", verdict ? P.VERDICT_SYSTEM : P.SOLVER_SYSTEM, [{ role: "user", content: view }], verdict ? P.VERDICT_SOLVE_SCHEMA : P.SOLVE_SCHEMA, "medium")
        .then((r) => r.json, (e) => ({ error: e.message }))
    )).then((answers) => {
      const key = out.keys["c" + n];
      const right = answers.map((a) => {
        if (a.error) return false;
        if (verdict) return (a.answers || []).map((x) => x.question + "=" + x.option).sort().join(";") === key.s;
        return a.answer === key.s && key.proofs.includes((a.proof || []).slice().sort().join(","));
      });
      return { n, right, answers };
    }));
  }
  return Promise.all(runs);
}
async function critique(cost, story) {
  return (await ask(cost, "critic", P.CRITIC_SYSTEM, [{ role: "user", content: "Review this story:\n" + JSON.stringify(story) }], P.CRITIC_SCHEMA, "high")).json;
}

/* ---------- briefs and history ---------- */
function rng(seed) { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); }
function history() { return readJson(join(dataDir(), "history.json"), []); }
function remember(entry) {
  const list = history().filter((h) => h.id !== entry.id);
  list.push(entry);
  writeJson(join(dataDir(), "history.json"), list.slice(-200));
}
function pickBrief(jobId, k, taken) {
  const r = rng(jobId + ":" + k), h = history();
  const recent = new Set(h.slice(-21).map((x) => x.setting).concat(taken));
  const recentCrime = new Set(h.slice(-4).map((x) => x.crime));
  const from = (list, avoid) => { const ok = list.filter((x) => !avoid.has(x)); const l = ok.length ? ok : list; return l[Math.floor(r() * l.length)]; };
  return { setting: from(P.SETTINGS, recent), crime: from(P.CRIMES, recentCrime), herring: from(P.HERRINGS, new Set()), mastermind: from(P.MASTERMINDS, new Set()), cast: r() < 0.5 ? 5 : 6 };
}
function avoidList() { return history().slice(-20).flatMap((x) => [x.title].concat(x.names || [])); }
// A Story Night remix keeps the original's setting, crime and cast size, and swaps the twist: a different mastermind
// and a different innocent liar. Every name of the original is banned, so the five answers can't carry over.
function remixBrief(orig, jobId) {
  const b = orig.meta.brief || {}, r = rng(jobId + ":remix");
  const other = (list, not) => { const l = list.filter((x) => x !== not); return l[Math.floor(r() * l.length)]; };
  return { setting: b.setting || orig.story.setting.place, crime: b.crime || P.CRIMES[0], herring: other(P.HERRINGS, b.herring), mastermind: other(P.MASTERMINDS, b.mastermind),
    cast: b.cast || orig.story.people.length, for: "night", remixOf: orig.meta.id, avoid: [orig.story.title].concat(orig.story.people.map((p) => p.name)) };
}

/* ---------- one draft, step by step; each step is saved, so a re-run picks up where it stopped ---------- */
async function runSlot(jobId, k, taken, redo) {
  const id = `${jobId}-s${k}`, dir = dataDir("jobs", jobId, "s" + k), f = (n) => join(dir, n + ".json");
  const draftPath = join(DRAFTS, id + ".json");
  if (exists(draftPath) && !redo) { log(`${id}: already done`); return readJson(draftPath); }
  const cost = readJson(f("cost"), newCost());
  const saveCost = () => writeJson(f("cost"), cost);
  try {
    const brief = readJson(f("brief"), null) || (writeJson(f("brief"), pickBrief(jobId, k, taken)), readJson(f("brief")));
    taken.push(brief.setting);
    log(`${id}: ${brief.setting} · ${brief.crime}`);
    let bp = readJson(f("blueprint"), null);
    if (!bp) {
      const a = await stageA(cost, brief, avoidList().concat(brief.avoid || [])); saveCost();
      bp = a.blueprint; writeJson(f("blueprint"), bp);
      if (a.errors.length) return finish(id, jobId, k, brief, null, { stage: "blueprint", errors: a.errors }, cost);
    }
    let story = readJson(f("story"), null);
    if (!story) {
      const b = await stageB(cost, id, bp, redo && redo.caseN, redo && redo.narrative); saveCost();
      writeJson(f("narrative"), b.narrative);
      if (!b.check.ok) return finish(id, jobId, k, brief, b.story, { stage: "wording", errors: b.check.errors, warnings: b.check.warnings }, cost);
      story = b.story; writeJson(f("story"), story);
    }
    const res = check(story);
    let solved = readJson(f("solve"), null);
    if (!solved) { log(`${id}: blind solving 5 cases × ${SOLVER_RUNS}`); solved = await solve(cost, story); saveCost(); writeJson(f("solve"), solved); }
    let critic = readJson(f("critic"), null);
    if (!critic) { log(`${id}: critic review`); critic = await critique(cost, story); saveCost(); writeJson(f("critic"), critic); }
    return finish(id, jobId, k, brief, story, { stage: "done", errors: res.errors, warnings: res.warnings, solved, critic }, cost);
  } catch (e) {
    saveCost();
    log(`${id}: stopped: ${e.message}. Run again with --resume ${jobId} to carry on.`);
    return null;
  }
}
function finish(id, jobId, k, brief, story, report, cost) {
  if (story && brief.avoid) { // a remix must not bring back anyone from the original
    const first = (n) => n.toLowerCase().split(/\s+/)[0], full = brief.avoid.slice(1).map((n) => n.toLowerCase());
    const reused = story.people.map((p) => p.name).filter((n) => full.includes(n.toLowerCase()) || full.some((o) => first(o) === first(n)));
    if (reused.length) report.errors = (report.errors || []).concat(`reuses names from the original story: ${reused.join(", ")}`);
  }
  const blockers = (report.critic && report.critic.issues || []).filter((i) => i.severity === "blocker");
  const solverOk = !!report.solved && report.solved.every((c) => c.right.every(Boolean));
  const gate = report.stage === "done" && !report.errors.length && solverOk && !blockers.length && report.critic.verdict !== "reject";
  const old = readJson(join(DRAFTS, id + ".json"), null);
  const draft = {
    meta: { id, job: jobId, slot: k, brief, createdAt: (old && old.meta.createdAt) || new Date().toISOString(), updatedAt: new Date().toISOString(),
      status: gate ? "ready" : "failed", report: Object.assign(report, { gate, solverOk }), cost, hash: story ? hashOf(story) : "",
      day: old && old.meta.day || 0, notes: old && old.meta.notes || [],
      for: brief.for || "daily", remixOf: brief.remixOf || "" },
    story
  };
  writeJson(join(DRAFTS, id + ".json"), draft);
  if (story) remember({ id, title: story.title, setting: brief.setting, crime: brief.crime, names: story.people.map((p) => p.name), at: draft.meta.createdAt });
  log(`${id}: ${gate ? "READY for review" : "needs work (" + report.stage + ")"}${story ? " · " + story.title : ""} · $${cost.usd.toFixed(2)}`);
  return draft;
}

/* ---------- main ---------- */
async function main() {
  if (!DRY && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.log("Set ANTHROPIC_API_KEY first (or run `ant auth login`). Add --dry-run to test the pipeline for free.");
  }
  const redoId = opt("redo"), resume = opt("resume"), remixId = opt("remix");
  if (remixId) {
    const orig = readJson(join(DRAFTS, remixId + ".json"), null);
    if (!orig || !orig.story) throw new Error("No finished draft " + remixId);
    const jobId = "r" + new Date().toISOString().slice(0, 16).replace(/\D/g, ""), dir = dataDir("jobs", jobId, "s1");
    writeJson(join(dataDir("jobs", jobId), "job.json"), { id: jobId, count: 1, remixOf: remixId, createdAt: new Date().toISOString() });
    const brief = remixBrief(orig, jobId);
    writeJson(join(dir, "brief.json"), brief);
    log(`Remix ${jobId} of ${remixId} (“${orig.story.title}”) for Story Night${DRY ? " (dry run, no API calls)" : ""}`);
    const d = await runSlot(jobId, 1, []);
    if (!d) process.exitCode = 1;
    return;
  }
  if (redoId) {
    const d = readJson(join(DRAFTS, redoId + ".json"), null);
    if (!d) throw new Error("No draft " + redoId);
    if (["scheduled", "published"].includes(d.meta.status)) throw new Error(`${redoId} is ${d.meta.status}. Unschedule it in the admin tool first.`);
    const dir = dataDir("jobs", d.meta.job, "s" + d.meta.slot), caseN = parseInt(opt("case", "0"), 10);
    const keep = caseN ? ["brief", "blueprint", "cost"] : ["brief", "cost"];
    const narrative = caseN ? readJson(join(dir, "narrative.json"), null) : null;
    if (caseN && !narrative) throw new Error("This draft has no saved wording to edit. Redo it whole instead.");
    for (const n of readdirSync(dir)) if (!keep.includes(n.replace(/\.json$/, ""))) rmSync(join(dir, n));
    await runSlot(d.meta.job, d.meta.slot, [], { caseN, narrative });
    return;
  }
  const jobId = resume || "b" + new Date().toISOString().slice(0, 16).replace(/\D/g, "");
  const job = readJson(join(dataDir("jobs", jobId), "job.json"), null) || { id: jobId, count: Math.max(1, Math.min(10, parseInt(opt("count", "5"), 10) || 5)), createdAt: new Date().toISOString() };
  writeJson(join(dataDir("jobs", jobId), "job.json"), job);
  log(`Batch ${jobId}: ${job.count} stor${job.count > 1 ? "ies" : "y"}${DRY ? " (dry run, no API calls)" : ""}`);
  const taken = [], drafts = [];
  for (let k = 1; k <= job.count; k++) drafts.push(await runSlot(jobId, k, taken));
  const ready = drafts.filter((d) => d && d.meta.status === "ready").length;
  const usd = drafts.reduce((s, d) => s + (d ? d.meta.cost.usd : 0), 0);
  log(`Done: ${ready} of ${job.count} ready for review · about $${usd.toFixed(2)}. Review them: node tools/daily5/admin.mjs`);
  if (drafts.some((d) => !d)) process.exitCode = 1;
}
main().catch((e) => { console.error("✗ " + e.message); process.exit(1); });
