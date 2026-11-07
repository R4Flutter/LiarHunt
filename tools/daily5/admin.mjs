// The Daily 5 admin desk. Runs on your computer only.
//   node tools/daily5/admin.mjs        then open http://127.0.0.1:8787
// Review drafts, play them in the real game, approve, schedule, publish to Firebase, and watch stock and player stats.
// Reviewing and playing need nothing else. Generating needs ANTHROPIC_API_KEY; publishing and stats need
// `npm install` in tools/daily5 plus Google credentials for the Firebase project:
//   gcloud auth application-default login     (or GOOGLE_APPLICATION_CREDENTIALS=C:\keys\liarhunt.json, outside this repo)
import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, extname, relative } from "node:path";
import { check, split, dataDir, readJson, writeJson, ROOT, importDraft } from "./lib.mjs";

const PORT = +process.env.PORT || 8787, HOST = "127.0.0.1";
const DRAFTS = dataDir("drafts");
const STOCK_WARN = 14;
const PROJECT = (readJson(join(ROOT, ".firebaserc"), { projects: {} }).projects || {}).default;
const launch = (readFileSync(join(ROOT, "js/config.js"), "utf8").match(/launchDate:\s*"(\d{4})-(\d{2})-(\d{2})"/) || []).slice(1).map(Number);
const DAY = 86400000, LAUNCH = Date.UTC(launch[0], launch[1] - 1, launch[2]), IST = 330 * 60000;

/* ---------- days (IST, same as the game and the rules) ---------- */
const istDay = (t = Date.now()) => { const x = new Date(t + IST); return Math.floor((Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) - LAUNCH) / DAY) + 1; };
const dayDate = (n) => new Date(LAUNCH + (n - 1) * DAY).toISOString().slice(0, 10);
const dayOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Math.floor((Date.UTC(y, m - 1, d) - LAUNCH) / DAY) + 1; };

/* ---------- drafts ---------- */
const draftPath = (id) => { if (!/^[a-z0-9-]{3,60}$/.test(id)) throw httpErr(400, "bad id"); return join(DRAFTS, id + ".json"); };
const loadDraft = (id) => { const p = draftPath(id); if (!existsSync(p)) throw httpErr(404, "No draft " + id); return readJson(p); };
const saveDraft = (d) => { d.meta.updatedAt = new Date().toISOString(); writeJson(draftPath(d.meta.id), d); };
function allDrafts() {
  return readdirSync(DRAFTS).filter((f) => f.endsWith(".json")).map((f) => { try { return readJson(join(DRAFTS, f)); } catch (e) { return null; } }).filter(Boolean)
    .sort((a, b) => (a.meta.day || 1e9) - (b.meta.day || 1e9) || String(b.meta.createdAt).localeCompare(a.meta.createdAt));
}
function summary(d) {
  const r = d.meta.report || {}, issues = (r.critic && r.critic.issues) || [];
  return { id: d.meta.id, title: d.story ? d.story.title : "(no story)", place: d.story ? d.story.setting.place : "", status: d.meta.status, day: d.meta.day || 0,
    date: d.meta.day ? dayDate(d.meta.day) : "", createdAt: d.meta.createdAt, gate: !!r.gate, stage: r.stage, solverOk: !!r.solverOk,
    errors: (r.errors || []).length, warnings: (r.warnings || []).length, critic: r.critic ? r.critic.verdict : "",
    blockers: issues.filter((i) => i.severity === "blocker").length, majors: issues.filter((i) => i.severity === "major").length, usd: d.meta.cost ? d.meta.cost.usd : 0,
    for: d.meta.for || "daily", remixOf: d.meta.remixOf || "" };
}
function stock(list) {
  const today = istDay(), taken = new Map();
  list.forEach((d) => { if (d.meta.day && ["scheduled", "published"].includes(d.meta.status)) taken.set(d.meta.day, d.meta); });
  let ahead = 0; while (taken.has(today + ahead)) ahead++;
  const upcoming = [...taken.keys()].filter((n) => n >= today).length;
  const approved = list.filter((d) => d.meta.status === "approved" && d.meta.for !== "night").length;
  let next = today; while (taken.has(next)) next++;
  return { today, todayDate: dayDate(today), ahead, upcoming, approved, unpublished: list.filter((d) => d.meta.status === "scheduled").length,
    nextEmpty: next, nextEmptyDate: dayDate(next), warn: ahead < STOCK_WARN };
}

/* ---------- Firebase (loaded only when needed) ---------- */
let fs = null;
async function firestore() {
  if (fs) return fs;
  let app, store;
  try { app = await import("firebase-admin/app"); store = await import("firebase-admin/firestore"); }
  catch (e) { throw httpErr(500, "firebase-admin isn't installed. Run: cd tools/daily5 && npm install"); }
  if (!app.getApps().length) app.initializeApp({ credential: app.applicationDefault(), projectId: PROJECT });
  fs = { db: store.getFirestore(), FieldValue: store.FieldValue };
  return fs;
}
const PATHS = (day) => {
  const d = String(day), list = [["d5", d], ["d5keys", d], ["d5", d, "end", "finale"]];
  for (let n = 1; n <= 5; n++) list.push(["d5", d, "cases", String(n)], ["d5", d, "reveals", String(n)], ["d5", d, "hunch", String(n)]);
  return list.map((p) => p.join("/"));
};
async function publish(d) {
  if (d.meta.status !== "scheduled" || !d.meta.day) throw httpErr(400, "Schedule the story for a day first.");
  const day = d.meta.day, out = split(d.story, day);
  const { db, FieldValue } = await firestore();
  const live = await db.doc("d5/" + day).get();
  if (live.exists && live.data().hash === out.edition.hash) { d.meta.status = "published"; d.meta.publishedHash = out.edition.hash; saveDraft(d); return "Already live with this exact story. Nothing changed."; }
  if (live.exists && istDay() >= day) throw httpErr(409, `Daily #${day} has already started with another story. A started day can't change.`);
  const b = db.batch();
  b.set(db.doc("d5/" + day), Object.assign({}, out.edition, { publishedAt: FieldValue.serverTimestamp() }));
  b.set(db.doc("d5keys/" + day), out.keys);
  b.set(db.doc(`d5/${day}/end/finale`), out.finale);
  for (let n = 1; n <= 5; n++) {
    b.set(db.doc(`d5/${day}/cases/${n}`), out.cases[n]);
    b.set(db.doc(`d5/${day}/reveals/${n}`), out.reveals[n]);
    b.set(db.doc(`d5/${day}/hunch/${n}`), out.hunch[n]);
  }
  await b.commit(); // all or nothing
  d.meta.status = "published"; d.meta.publishedHash = out.edition.hash; d.meta.publishedAt = new Date().toISOString(); saveDraft(d);
  return `Published as Daily #${day} (${dayDate(day)}). It opens at midnight IST.`;
}
// Story Night: the same split as a Daily, minus the keys and the Hunch (friends' rooms check answers on each phone).
const NIGHT_PATHS = (id) => [`nights/${id}`, `nights/${id}/end/finale`].concat([1, 2, 3, 4, 5].flatMap((n) => [`nights/${id}/cases/${n}`, `nights/${id}/reveals/${n}`]));
async function nightPublish(d) {
  if (d.meta.for !== "night") throw httpErr(400, "Only Story Night remixes go to Story Night.");
  if (d.meta.status !== "approved") throw httpErr(400, "Approve it first.");
  const id = d.meta.id, out = split(d.story, 0);
  const { db, FieldValue } = await firestore();
  const b = db.batch();
  b.set(db.doc(`nights/${id}`), Object.assign({}, out.edition, { id, publishedAt: FieldValue.serverTimestamp() }));
  b.set(db.doc(`nights/${id}/end/finale`), out.finale);
  for (let n = 1; n <= 5; n++) { b.set(db.doc(`nights/${id}/cases/${n}`), out.cases[n]); b.set(db.doc(`nights/${id}/reveals/${n}`), out.reveals[n]); }
  await b.commit();
  d.meta.status = "night"; d.meta.publishedHash = out.edition.hash; d.meta.publishedAt = new Date().toISOString(); saveDraft(d);
  return "Published to Story Night. Hosts can pick it in the lobby now.";
}
async function nightUnpublish(d) {
  const { db } = await firestore();
  const b = db.batch(); NIGHT_PATHS(d.meta.id).forEach((p) => b.delete(db.doc(p))); await b.commit();
  d.meta.status = "approved"; delete d.meta.publishedHash; saveDraft(d);
  return "Taken off Story Night. Rooms already playing it may lose it mid-story.";
}
async function unpublish(d) {
  if (!d.meta.day || istDay() >= d.meta.day) throw httpErr(409, "That day has started (or passed). Players are on it, so it stays.");
  const { db } = await firestore();
  const b = db.batch(); PATHS(d.meta.day).forEach((p) => b.delete(db.doc(p))); await b.commit();
  d.meta.status = "scheduled"; delete d.meta.publishedHash; saveDraft(d);
  return "Taken down. It's still scheduled; publish it again when ready.";
}
// How players did: read straight from the run docs, no tracker needed.
async function stats(day) {
  const { db } = await firestore();
  const runsOf = async (n) => (await db.collection("d5runs").where("day", "==", n).get()).docs.map((x) => x.data());
  const [runs, next, week] = await Promise.all([runsOf(day), runsOf(day + 1), runsOf(day + 7)]);
  const reds = (g) => (g.match(/r/g) || []).length;
  const out = { day, date: dayDate(day), started: runs.length, reached: [0, 0, 0, 0, 0], solved: [0, 0, 0, 0, 0], failed: [0, 0, 0, 0, 0], completed: 0, perfect: 0, abandoned: 0, hunch: 0, medianMinutes: null, nextDay: 0, sevenDay: 0 };
  const times = [], over = istDay() > day;
  for (const r of runs) {
    const g = r.grid || "";
    for (let i = 0; i < 5; i++) {
      if (i < g.length || (i === g.length && reds(g) < (r.strikes || 1))) out.reached[i]++; // played it, or it's their open case
      if (g[i] === "g" || g[i] === "y") out.solved[i]++;
      if (g[i] === "r") out.failed[i]++;
    }
    if (g.length === 5) { out.completed++; if (!/r/.test(g)) out.perfect++; }
    else if (over && reds(g) < (r.strikes || 1)) out.abandoned++;
    if (r.hunch) out.hunch++;
    const end = r.picks && r.picks["c" + g.length] && r.picks["c" + g.length].at;
    if (g.length === 5 && end && r.startedAt) times.push((end.toMillis() - r.startedAt.toMillis()) / 60000);
  }
  times.sort((a, b) => a - b);
  if (times.length) out.medianMinutes = Math.round(times[Math.floor(times.length / 2)] * 10) / 10;
  const ids = new Set(runs.map((r) => r.uid));
  out.nextDay = next.filter((r) => ids.has(r.uid)).length; out.sevenDay = week.filter((r) => ids.has(r.uid)).length;
  return out;
}

/* ---------- generation (one job at a time, as a child process) ---------- */
let job = null;
function startJob(args) {
  if (job && job.running) throw httpErr(409, "A generation job is already running.");
  const p = spawn(process.execPath, [join(ROOT, "tools/daily5/generate.mjs"), ...args], { cwd: ROOT, env: process.env });
  job = { args, running: true, log: [], startedAt: new Date().toISOString() };
  const keep = (buf) => { job.log.push(...String(buf).split(/\r?\n/).filter(Boolean)); job.log = job.log.slice(-200); };
  p.stdout.on("data", keep); p.stderr.on("data", keep);
  p.on("close", (code) => { job.running = false; job.code = code; });
}

/* ---------- preview play: the same steps and limits as the Firestore rules, in memory ---------- */
const plays = {};
const playErr = () => httpErr(403, "permission-denied");
function play(id, action, n, body) {
  const d = loadDraft(id), out = split(d.story, 0), st = plays[id] = plays[id] || { run: null };
  const r = st.run, k = "c" + n, reds = (g) => (g.match(/r/g) || []).length;
  const canSee = (m) => r && (m <= r.grid.length || (m === r.grid.length + 1 && reds(r.grid) < r.strikes));
  switch (action) {
    case "edition": return out.edition;
    case "run": return r;
    case "start": if (!r) st.run = { uid: "preview", day: 0, picks: {}, grid: "", strikes: out.edition.strikes, hunch: 0, startedAt: Date.now() }; return st.run;
    case "case": if (!canSee(n)) throw playErr(); return out.cases[n];
    case "commit":
      if (!r || n !== r.grid.length + 1 || n > 5 || reds(r.grid) >= r.strikes || r.picks[k]) throw playErr();
      if (typeof body.s !== "string" || typeof body.p !== "string") throw playErr();
      r.picks[k] = { s: body.s, p: body.p, at: Date.now() }; return r;
    case "reveal": if (!r || !r.picks[k]) throw playErr(); return out.reveals[n];
    case "resolve": {
      if (!r || n !== r.grid.length + 1 || !r.picks[k]) throw playErr();
      const key = out.keys[k], pk = r.picks[k], right = pk.s === key.s && key.proofs.includes(pk.p);
      const letter = right ? (r.hunch === n ? "y" : "g") : "r";
      if (body.letter !== letter) throw playErr();
      r.grid += letter; return r;
    }
    case "hunch": if (!r || r.hunch || n !== r.grid.length + 1 || r.picks[k] || reds(r.grid) >= r.strikes) throw playErr(); r.hunch = n; return out.hunch[n];
    case "finale": if (!r || !(r.grid.length === 5)) throw playErr(); return out.finale; // failed players wait for the next reset, as in the game
    case "reset": st.run = null; return { ok: true };
  }
  throw httpErr(404, "unknown action");
}

/* ---------- HTTP ---------- */
function httpErr(code, msg) { const e = new Error(msg); e.code = code; return e; }
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".webmanifest": "application/manifest+json" };
function serveFile(res, rel) {
  const p = resolve(ROOT, "." + rel), r = relative(ROOT, p);
  if (r.startsWith("..") || /(^|[\\/])\.|^tools|^firebase|^node_modules/.test(r) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(readFileSync(p));
}
const body = (req) => new Promise((ok, bad) => { let s = ""; req.on("data", (c) => { s += c; if (s.length > 1e6) req.destroy(); }); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(httpErr(400, "bad JSON")); } }); });

const server = http.createServer(async (req, res) => {
  const send = (code, data) => { res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(data)); };
  try {
    // Only this computer, and only this page: other websites can't drive the desk from your browser.
    if (!new RegExp(`^(127\\.0\\.0\\.1|localhost):${PORT}$`).test(req.headers.host || "")) throw httpErr(403, "wrong host");
    if (req.method !== "GET" && req.headers["x-d5"] !== "1") throw httpErr(403, "missing header");
    const url = new URL(req.url, "http://x"), path = url.pathname, m = path.split("/").filter(Boolean);
    if (path === "/" || path === "/admin") { res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" }); return res.end(readFileSync(join(ROOT, "tools/daily5/admin.html"))); }
    if (path === "/sw.js") { res.writeHead(404); return res.end(); } // no offline cache in previews
    if (m[0] !== "api") return serveFile(res, path === "/index.html" ? "/index.html" : path);

    if (m[1] === "play") return send(200, play(m[2], m[3], parseInt(m[4] || "0", 10), req.method === "POST" ? await body(req) : {}));
    if (req.method === "GET" && m[1] === "state") {
      const list = allDrafts();
      return send(200, { stock: stock(list), drafts: list.map(summary), job: job && { running: job.running, code: job.code, log: job.log.slice(-40), args: job.args }, project: PROJECT });
    }
    // A story written somewhere else comes in as a draft; the checker runs at once.
    if (req.method === "POST" && m[1] === "import") {
      const story = await body(req);
      if (!story || typeof story !== "object" || !Array.isArray(story.cases) || !Array.isArray(story.people)) {
        throw httpErr(400, "That isn't a story file. It needs a title, people and five cases (see tools/daily5/WRITING.md).");
      }
      const id = "imp-" + new Date().toISOString().slice(0, 19).replace(/\D/g, "");
      const d = importDraft(story, id);
      saveDraft(d);
      return send(200, { id, ok: d.meta.status === "ready", errors: d.meta.report.errors.slice(0, 12),
        message: d.meta.status === "ready" ? "Imported and it passes the check. Play it, then approve it." : "Imported, but it doesn't pass the check yet: " + d.meta.report.errors.length + " problem(s)." });
    }
    // The story file itself, to edit and import again. It holds the answers: keep it out of the game folder.
    if (req.method === "GET" && m[1] === "draft" && m[3] === "export") {
      const d = loadDraft(m[2]);
      if (!d.story) throw httpErr(400, "This draft has no story yet.");
      res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${d.meta.id}.json"`, "Cache-Control": "no-store" });
      return res.end(JSON.stringify(d.story, null, 2));
    }
    // Approved Daily drafts (oldest first) fill the empty days from a start day onward.
    if (req.method === "POST" && m[1] === "schedule-run") {
      const b = await body(req), from = b.date ? dayOf(b.date) : +b.from;
      if (!(from > istDay())) throw httpErr(400, "Pick a day after today (IST).");
      const list = allDrafts(), taken = new Set(list.filter((x) => x.meta.day && ["scheduled", "published"].includes(x.meta.status)).map((x) => x.meta.day));
      const free = list.filter((x) => x.meta.status === "approved" && !x.meta.day && x.meta.for !== "night")
        .sort((a, c) => String(a.meta.createdAt).localeCompare(String(c.meta.createdAt)));
      const out = [];
      let day = from;
      for (const d of free) {
        while (taken.has(day)) day++;
        d.meta.day = day; d.meta.status = "scheduled";
        d.meta.notes = (d.meta.notes || []).concat({ at: new Date().toISOString(), text: "Scheduled for Daily #" + day });
        saveDraft(d); taken.add(day); out.push({ id: d.meta.id, day });
      }
      return send(200, { scheduled: out, message: out.length ? `Scheduled ${out.length} stor${out.length > 1 ? "ies" : "y"}: Daily #${out[0].day} to #${out[out.length - 1].day}. Publish each one to upload it.` : "No approved stories are waiting." });
    }
    if (req.method === "GET" && m[1] === "draft") {
      const d = loadDraft(m[2]), res2 = d.story ? check(d.story) : null;
      return send(200, { draft: d, check: res2, keys: res2 && res2.ok ? split(d.story, d.meta.day || 0).keys : null, date: d.meta.day ? dayDate(d.meta.day) : "" });
    }
    if (req.method === "GET" && m[1] === "stats") return send(200, await stats(parseInt(url.searchParams.get("day"), 10) || istDay() - 1));
    if (req.method === "POST" && m[1] === "generate") {
      const b = await body(req);
      if (b.remix) startJob(["--remix", String(b.remix)].concat(b.dry ? ["--dry-run"] : []));
      else if (b.redo) startJob(["--redo", String(b.redo)].concat(b.case ? ["--case", String(b.case)] : []).concat(b.dry ? ["--dry-run"] : []));
      else startJob(["--count", String(Math.max(1, Math.min(30, +b.count || 5)))].concat(+b.season > 0 ? ["--season", String(+b.season)] : []).concat(b.dry ? ["--dry-run"] : []));
      return send(200, { ok: true });
    }
    if (req.method === "POST" && m[1] === "draft") {
      const d = loadDraft(m[2]), action = m[3], b = await body(req), list = allDrafts();
      const note = (t) => { d.meta.notes = (d.meta.notes || []).concat({ at: new Date().toISOString(), text: t }); };
      if (action === "night-publish") { const msg = await nightPublish(d); note(msg); saveDraft(d); return send(200, { message: msg }); }
      if (action === "night-unpublish") { if (d.meta.status !== "night") throw httpErr(400, "It isn't on Story Night."); const msg = await nightUnpublish(d); note(msg); saveDraft(d); return send(200, { message: msg }); }
      if (d.meta.status === "night" && action !== "note") throw httpErr(409, "This story is on Story Night. Take it off first.");
      if (["published"].includes(d.meta.status) && action !== "unpublish") throw httpErr(409, "This story is live. Take it down first (only possible before its day starts).");
      if (action === "approve") {
        const r = check(d.story);
        if (!r.ok) throw httpErr(400, "It doesn't pass the check: " + r.errors[0]);
        d.meta.status = "approved"; note("Approved"); saveDraft(d); return send(200, { message: "Approved. Pick a day to schedule it." });
      }
      if (action === "reject") { d.meta.status = "rejected"; d.meta.day = 0; note("Rejected: " + (b.reason || "no reason given")); saveDraft(d); return send(200, { message: "Rejected." }); }
      if (action === "schedule") {
        if (!["approved", "scheduled"].includes(d.meta.status)) throw httpErr(400, "Approve it first.");
        if (d.meta.for === "night") throw httpErr(400, "This is a Story Night remix. Players may have it on Story Night, so it can't be a Daily.");
        const day = b.date ? dayOf(b.date) : +b.day;
        if (!(day > istDay())) throw httpErr(400, "Pick a day after today (IST).");
        const clash = list.find((x) => x.meta.id !== d.meta.id && x.meta.day === day && ["scheduled", "published"].includes(x.meta.status));
        if (clash) throw httpErr(409, `Daily #${day} already has "${clash.story.title}".`);
        d.meta.day = day; d.meta.status = "scheduled"; note("Scheduled for Daily #" + day); saveDraft(d);
        return send(200, { message: `Scheduled for Daily #${day} (${dayDate(day)}). Publish it to upload.` });
      }
      if (action === "unschedule") { if (d.meta.status !== "scheduled") throw httpErr(400, "Not scheduled."); d.meta.day = 0; d.meta.status = "approved"; note("Unscheduled"); saveDraft(d); return send(200, { message: "Unscheduled." }); }
      if (action === "publish") { const msg = await publish(d); note(msg); saveDraft(d); return send(200, { message: msg }); }
      if (action === "unpublish") { const msg = await unpublish(d); note(msg); saveDraft(d); return send(200, { message: msg }); }
      if (action === "note") { note(String(b.text || "").slice(0, 500)); saveDraft(d); return send(200, { ok: true }); }
    }
    throw httpErr(404, "Not found");
  } catch (e) {
    if (!e.code || typeof e.code !== "number") console.error(e);
    send(typeof e.code === "number" ? e.code : 500, { error: e.message });
  }
});
server.listen(PORT, HOST, () => {
  const s = stock(allDrafts());
  console.log(`Daily 5 admin desk: http://${HOST}:${PORT}`);
  console.log(`Drafts: ${DRAFTS}`);
  console.log(`Today is Daily #${s.today} (IST). ${s.ahead} day(s) ready ahead${s.warn ? `, below ${STOCK_WARN}: time to generate more` : ""}.`);
});
