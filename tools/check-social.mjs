// Checks the pure rules behind sign-in, names, keys, the season clock, faces and the season ladder.
// Run from the game folder:  node tools/check-social.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, console, Intl, Date, Math, location: { origin: "null", search: "" }, localStorage: undefined,
  TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Response, Blob, atob, btoa };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["js/config.js", "js/cases.js", "js/seasons.js", "js/book1.js", "js/engine.js", "js/progress.js"]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
}
const { WL } = ctx;
let problems = 0;
function eq(name, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) console.log("✓ " + name);
  else { problems++; console.log("✗ " + name + "\n    got  " + a + "\n    want " + b); }
}
const sha = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

/* ---------- Google sign-in: in-app browsers ---------- */
const UA = {
  wa: "Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 WhatsApp/2.23.20",
  ig: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0",
  fb: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]",
  wv: "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36",
  chrome: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  desk: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
};
eq("whatsapp", WL.inAppBrowser(UA.wa), "whatsapp");
eq("instagram", WL.inAppBrowser(UA.ig), "instagram");
eq("facebook", WL.inAppBrowser(UA.fb), "facebook");
eq("android webview", WL.inAppBrowser(UA.wv), "webview");
eq("chrome", WL.inAppBrowser(UA.chrome), "");
eq("safari", WL.inAppBrowser(UA.safari), "");
eq("desktop", WL.inAppBrowser(UA.desk), "");

/* ---------- names: choose once, change once ---------- */
eq("no name yet", WL.nameRule({}), { canChange: true, changesLeft: 1 });
eq("named, unused", WL.nameRule({ playerName: "Raj" }), { canChange: true, changesLeft: 1 });
eq("named, used", WL.nameRule({ playerName: "Raj", nameChanges: 1 }), { canChange: false, changesLeft: 0 });
eq("old save renamed often", WL.nameRule({ playerName: "Raj", nameChanges: undefined }), { canChange: true, changesLeft: 1 });

/* ---------- Case Keys are retired ---------- */
const P = ctx.WLP;
const old = P.init({ coins: 10, inv: { key: 3, magnifier: 1 } }, {});
eq("keys become coins", [old.coins, old.inv.key, old.keysRetired], [370, undefined, 360]);
eq("only once", P.init(old, {}).coins, 370); // ensure() sets keysRetired only when it converts; the game zeroes it after the toast
eq("new player has no keys", P.init({}, {}).inv.key, undefined);
eq("shop sells no keys", Object.keys(P.ITEMS).filter((k) => /^key/.test(k)), []);
eq("login day 7", [P.LOGIN[6].key, P.LOGIN[6].coins], [undefined, 250]);
eq("comeback", [P.COMEBACK.key, P.COMEBACK.coins], [undefined, 250]);
P.init({}, {});
eq("7-day streak", P.streakDay(7), { shield: 1, coins: 100 });
eq("old-shape save loads", typeof P.init({ inv: { key: 1 }, league: { week: 2, tier: 1 }, lb: { season: { s: 1 } } }, {}).coins, "number");

/* ---------- the season clock ---------- */
const H = 3600000, D = 24 * H;
eq("S1 ends", WL.seasonEndsAt(1), Date.UTC(2026, 11, 23, 18, 30));
eq("before S1", WL.seasonClock(Date.UTC(2026, 10, 7, 12)), { season: 1, phase: "before", target: Date.UTC(2026, 10, 8, 18, 30), left: Date.UTC(2026, 10, 8, 18, 30) - Date.UTC(2026, 10, 7, 12), urgency: 0 });
eq("mid S1", [WL.seasonClock(Date.UTC(2026, 10, 20)).phase, WL.seasonClock(Date.UTC(2026, 10, 20)).urgency], ["during", 0]);
eq("not last week yet", WL.seasonClock(Date.UTC(2026, 11, 10)).urgency, 0);
eq("last week", WL.seasonClock(Date.UTC(2026, 11, 18)).urgency, 1);
eq("last day", WL.seasonClock(Date.UTC(2026, 11, 23, 6)).urgency, 2);
eq("S2 begins", [WL.seasonClock(Date.UTC(2026, 11, 23, 19)).season, WL.seasonClock(Date.UTC(2026, 11, 23, 19)).phase], [2, "during"]);
eq("season of day 59/60", [WL.seasonOf(59), WL.seasonOf(60)], [1, 2]);
eq("season length", WL.SEASON_DAYS, 45);
eq("long", WL.fmtLong(28 * D + 4 * H + 12 * 60000 + 9000), "28d 04:12:09");
eq("short", WL.fmtLong(5 * H + 1000), "05:00:01");

/* ---------- faces ---------- */
eq("16 faces", WL.FACES.length, 16);
eq("every hair style", [...new Set(WL.FACES.map((f) => f.hair))].sort(), [0, 1, 2, 3, 4, 5, 6]);
eq("codes", ["f00", "f15", "f16", "x1", undefined].map((c) => WL.okFace(c)), [true, true, false, false, false]);
eq("code wins", WL.avatar("Raj", "f03"), WL.avatar("Zoe", "f03"));
eq("bad code falls back", WL.avatar("Raj", "nope"), WL.avatar("Raj"));
eq("name faces unchanged", ["Raj", "Detective", "Priya"].map((n) => sha(WL.avatar(n))), ["7e642afcddd41fe3", "e1a0efa769e99969", "c4dd278d05bf28d1"]);

/* ---------- the season ladder ---------- */
const L = WL.ladderDay;
eq("perfect day", L("ggggg", 1), 150);
eq("helped", L("ggyyg", 1), 130);
eq("fail at 1", L("r----", 1), -50);
eq("bronze is safe", L("r----", 0), 0);
eq("fail at 3", L("ggr--", 2), 30);
eq("classic day", [L("gyrgr", 1), L("gyrgr", 0)], [40, 80]);
eq("tiers", [0, 399, 400, 999, 1000, 1800, 2799, 2800, 99999].map((x) => WL.tierOf(x)), [0, 0, 1, 1, 2, 3, 3, 4, 4]);
eq("season start", [null, 0, 1, 2, 4].map((x) => WL.seasonStartLp(x)), [0, 0, 0, 400, 1800]);
eq("first day", WL.ladderApply(null, 15, "ggggg", 0), { lp: 150, tier: 0, days: 1, solved: 5, cases: 5, fails: 0, rate: 1000, failRate: 0, last: 15 });
eq("drop to bronze", WL.ladderApply({ lp: 410, tier: 1, days: 3, solved: 12, cases: 15, fails: 1, last: 17 }, 18, "r----", 0),
  { lp: 360, tier: 0, days: 4, solved: 12, cases: 20, fails: 2, rate: 600, failRate: 500, last: 18 });
eq("same day twice", WL.ladderApply({ lp: 10, tier: 0, days: 1, solved: 1, cases: 5, fails: 1, last: 18 }, 18, "ggggg", 0), null);

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll social checks passed.");
process.exit(problems ? 1 : 0);
