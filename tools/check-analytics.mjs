// Checks the analytics plumbing: events fired before the tracker script arrives are queued,
// then sent once it loads, and only the allowed properties travel with them.
// Run from the game folder:  node tools/check-analytics.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let problems = 0;
const fail = (where, msg) => { problems++; console.log(`✗ ${where}: ${msg}`); };
const ok = (msg) => console.log(`✓ ${msg}`);

// A fake browser: enough DOM for the loader in index.html, and a window to run the game in.
function makeBrowser(cfgPatch) {
  const sent = [];
  const scripts = [];
  const ctx = {
    console, Intl, Date, Math, JSON, URL, URLSearchParams, TextEncoder, TextDecoder,
    location: { origin: "https://liarhunt.com", href: "https://liarhunt.com/", hostname: "liarhunt.com", search: "" },
    localStorage: undefined, navigator: { language: "en" }, setTimeout, clearTimeout,
    document: {
      title: "Who's Lying?",
      head: { appendChild: (el) => { scripts.push(el); return el; } },
      createElement: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: () => { }
    }
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(root, "js/config.js"), "utf8"), ctx, { filename: "js/config.js" });
  if (cfgPatch) cfgPatch(ctx.WL_CONFIG.analytics);
  vm.runInContext(readFileSync(join(root, "js/engine.js"), "utf8"), ctx, { filename: "js/engine.js" });
  // the tracker, once it "loads"
  ctx.loadTracker = function () {
    ctx.umami = { track: (name, data) => sent.push(["umami", name, data]) };
    if (scripts[0] && scripts[0].onload) scripts[0].onload();
  };
  return { ctx, sent, scripts };
}

// The loader is the inline script in index.html that wires up the tracker.
function loaderSource() {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const m = html.match(/<script>\s*\/\/ Analytics:[\s\S]*?<\/script>/);
  if (!m) throw new Error("the analytics loader is missing from index.html");
  return m[0].replace(/^<script>/, "").replace(/<\/script>$/, "");
}

// ---- 1. off by default: no tracker, no requests ----
{
  const { ctx, scripts } = makeBrowser();
  vm.runInContext(loaderSource(), ctx, { filename: "loader" });
  if (scripts.length) fail("off by default", `a tracker script was loaded (${scripts.length}) even though no ID is set`);
  else ok("no ID set: nothing is loaded and nothing is sent");
  ctx.WL.track("career_solved", { level: 3, stars: 3 });
  if (ctx.WLAnalytics && ctx.WLAnalytics.queue.length !== 1) fail("off by default", "events should still be queued for later");
  else ok("events fired while off are queued, not lost");
}

// ---- 2. umami: queue -> load -> flush, then straight through ----
{
  const { ctx, sent, scripts } = makeBrowser((a) => { a.umami.websiteId = "11111111-2222-3333-4444-555555555555"; });
  vm.runInContext(loaderSource(), ctx, { filename: "loader" });
  if (scripts.length !== 1) fail("umami", `expected 1 tracker script, got ${scripts.length}`);
  else {
    const s = scripts[0];
    if (s.src !== "https://cloud.umami.is/script.js") fail("umami", "wrong script url: " + s.src);
    if (s.attrs["data-website-id"] !== "11111111-2222-3333-4444-555555555555") fail("umami", "the website id is not on the script");
    if (!s.attrs["data-domains"] || s.attrs["data-domains"].indexOf("liarhunt.com") < 0) fail("umami", "the domain filter is missing");
    else ok("umami script wired up with the website id and the domain filter");
  }

  // fired before the tracker arrives
  ctx.WL.track("career_solved", { level: 8, stars: 3, wrong: 0, hint: false });
  if (sent.length) fail("umami", "an event was sent before the tracker loaded");
  else ok("events fired before the tracker loads are held back");

  ctx.loadTracker();
  if (sent.length !== 1) fail("umami", `the queued event was not sent (sent ${sent.length})`);
  else if (sent[0][1] !== "career_solved") fail("umami", "wrong event name: " + sent[0][1]);
  else if (!sent[0][2] || sent[0][2].level !== 8) fail("umami", "the level property was lost");
  else if (sent[0][2].stars === undefined) fail("umami", "the stars property was lost");
  else if (sent[0][2].wrong !== undefined) fail("umami", `too many properties sent: ${JSON.stringify(sent[0][2])}`);
  else ok(`queued event flushed with ${Object.keys(sent[0][2]).length} properties: ${JSON.stringify(sent[0][2])}`);

  // fired after the tracker arrives
  ctx.WL.track("daily_complete", { day: 7, score: 4, replay: false, catchup: false, seconds: 90 });
  if (sent.length !== 2) fail("umami", `an event after load was not sent (sent ${sent.length})`);
  else if (sent[1][1] !== "daily_complete" || sent[1][2].day !== 7) fail("umami", "the event after load is wrong: " + JSON.stringify(sent[1]));
  else ok("events after the tracker loads go straight through");
}

// ---- 3. property allowlist: unknown keys are dropped ----
{
  const { ctx, sent } = makeBrowser((a) => { a.umami.websiteId = "test"; });
  vm.runInContext(loaderSource(), ctx, { filename: "loader" });
  ctx.loadTracker();
  ctx.WL.track("career_start", { level: 2, secret_player_data: "nope" });
  const d = sent[0][2] || {};
  if (d.secret_player_data !== undefined) fail("allowlist", "a key that isn't allowed was sent");
  else if (d.level !== 2) fail("allowlist", "an allowed key was dropped");
  else ok("only allowed properties are sent");
}

// ---- 4. props switched off: names only ----
{
  const { ctx, sent } = makeBrowser((a) => { a.umami.websiteId = "test"; a.props = false; });
  vm.runInContext(loaderSource(), ctx, { filename: "loader" });
  ctx.loadTracker();
  ctx.WL.track("career_solved", { level: 8, stars: 3 });
  if (sent[0][2] !== undefined) fail("props off", "properties were sent even though props are off");
  else ok("props off: the event name is sent on its own");
}

// ---- 5. plausible fallback still works if you switch to it ----
{
  const { ctx, scripts } = makeBrowser((a) => { a.plausibleDomain = "liarhunt.com"; });
  vm.runInContext(loaderSource(), ctx, { filename: "loader" });
  if (scripts.length !== 1) fail("plausible", `expected 1 tracker script, got ${scripts.length}`);
  else if (scripts[0].src !== "https://plausible.io/js/script.js") fail("plausible", "wrong script url: " + scripts[0].src);
  else if (scripts[0].attrs["data-domain"] !== "liarhunt.com") fail("plausible", "the site domain is not on the script");
  else ok("plausible works as the paid fallback");
}

// ---- 6. umami wins if both are set ----
{
  const { ctx, scripts } = makeBrowser((a) => { a.umami.websiteId = "test"; a.plausibleDomain = "liarhunt.com"; });
  vm.runInContext(loaderSource(), ctx, { filename: "loader" });
  if (scripts.length !== 1 || scripts[0].src.indexOf("umami") < 0) fail("both", "umami should be used when both are set");
  else ok("umami is used when both are set");
}

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll good. No problems found.");
process.exit(problems ? 1 : 0);
