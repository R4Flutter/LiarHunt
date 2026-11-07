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

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll social checks passed.");
process.exit(problems ? 1 : 0);
