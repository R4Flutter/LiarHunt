# LiarHunt

**Play it: https://liarhunt.com**

A detective game for the browser. In every case the police checked a few facts and three suspects tell their story. One story can't be true. Tap the liar.

It is plain HTML, CSS and JavaScript with no build step. The web version is hosted free on Cloudflare. A one-command build makes the CrazyGames version (section 3).

---

## What's in the game

**Three ways to play, plus friends**

| Mode | What it is |
|---|---|
| Daily Case | 5 cases a day, the same for everyone, with a streak and a shareable result. The hero of the home screen. On days with a **Daily 5** story (web), the five cases are one connected mystery (section 8). |
| Career | **Book 1: The Black Ledger**, one story in 30 missions (5 chapters of 6). A missing analyst leads to a bribery network and a mole inside the agency. Each mission is a briefing and 1 to 4 steps: search a place, question a suspect and catch the lie with evidence, rebuild a timeline, compare documents, connect evidence, and accuse with proof and a motive. A dossier keeps every piece of evidence, the people met and a "Who is B?" board. Up to 3 stars per mission, retries allowed. New players start with one short training case and a coach. |
| Rush | The quick game for spare minutes: catch as many liars as you can against the clock. 3 lives, a combo multiplier, a faster clock as you go, and one second chance per run. |

**Twist cases:** "two are lying, find the honest one" and "everyone is honest, find the fake fact".

**Why players come back**

| Hook | What it does |
|---|---|
| Cloud save (web) | Every player's game is saved in their own Firebase account (`players/{uid}`), not on the device: an anonymous account from the first visit, which **Sign in with Google** (in the profile) turns into one that follows them to any device. The game needs a connection to start. Old 12-letter save codes still bring their progress into the account once; no new codes are made. |
| Streak Shields | Save your Daily streak if you miss a day (used automatically, hold up to 2). Earn one every 7 days in a row or buy one for 200 coins. |
| Comeback gift | Players who return after 3+ days get 250 coins and 2 Magnifiers. |
| Friend challenges | Every shared result is a challenge link. Your friend plays the same Daily and sees "You beat Raj by 12 seconds!" with a rematch button. Works on CrazyGames too (invite links). |
| Rank among everyone | After the Daily: "#37 of 230 today, better than 84% of players", also in the share text. |
| Season league (web) | Bronze → Silver → Gold → Platinum → Diamond, one ladder per season. Each Daily case solved earns league points (LP): +30 clean, +20 with a hint. A wrong answer costs 50/40/30/20/10 LP at case 1/2/3/4/5, never in Bronze. Silver starts at 400 LP, Gold 1,000, Platinum 1,800, Diamond 2,800; dropping below a mark drops a league. At season end everyone gets coins for their league and starts the next season one league lower. The leaderboard shows the top 40 (LP, then solve rate, then fewer fails). |
| Friends (web) | Up to 8 friends, added with a 6-letter friend code or a `?f=CODE` link. The other player accepts the request. See each friend's league, LP, solve rate and today's result. |
| Install + reminder (web) | Installs as an app (works offline). A "Remind me" button adds a daily calendar alarm (Google Calendar or .ics). |
| Stars and chapters | Up to 3 stars per Career mission (a mistake or a Magnifier costs one), a rank badge and coins for every chapter, a Book map, and replays for the story. |
| Streak bonus | Solve cases in a row on the first try for up to ×2 coins. |
| Levels and titles | XP from every case. Rookie → Patrol Officer → … → Legend, with a badge that changes metal. Level-ups pay coins. |
| Coins and shop | Spend coins on Magnifiers (rule out a wrong answer), Time Freezes (+10 s in Rush) and 6 desk themes. |
| Daily missions | 3 new missions every day ("Earn 3 stars on 3 cases"…), plus a mission chest when all 3 are done. |
| 7-day login calendar | A bigger reward each day you come back, with an option to double it by watching an ad. |
| Achievements | 27 achievements with coin rewards. |
| What's next | Every results screen shows your level bar and the next mission, so there's always one more goal. |
| Sound and juice | Sound effects, a noir-jazz music loop, stamps, confetti, floating rewards, screen shake. |

**Works everywhere:** phones, tablets and desktop, 16:9 game frames down to 800×450, light and dark mode, keyboard (1–5, Enter, Esc), reduced motion.

**Never runs out:** 75 hand-written cases plus a generator with 55 fact types and 50 story openers. `node tools/check-cases.mjs` tests 300 Rush cases and 400 days of daily cases; `node tools/check-book.mjs` checks every Career mission.

**Players set up a detective:** after the training case they pick one of 16 faces and a name (on CrazyGames, a face only). A name can be changed once afterwards. Google sign-in doesn't work inside WhatsApp's or Instagram's own browser, so the game asks those players to open Chrome or Safari.

---

## Folder map

```
index.html                 the game
archive.html               past daily cases + answers (web only)
privacy.html, 404.html     web pages
css/style.css              all the styles
js/config.js               ← YOUR SETTINGS (edit this)
js/cases.js                hand-written cases
js/engine.js               case generator, Rush difficulty, the training case, portraits
js/book1.js                Career Book 1: the whole story (missions, people, evidence)
js/book.js                 Career: plays the missions, the dossier, the Book map
js/progress.js             levels, coins, stars, missions, login calendar, shop, achievements
js/game.js                 all the screens
js/platform.js             web vs CrazyGames: ads, saves, mute, username, invite links
js/audio.js, js/fx.js      sound and visual effects
js/leaderboard.js          web leaderboard, top-10 rewards, the season ladder, friends, rooms (Firebase)
js/ads.js                  web ads (none / demo / AdSense)
assets/                    sounds, music, fonts, icons
sw.js                      offline cache (web only)
firebase.json, firebase/   database settings, rules and indexes for the web leaderboard
tools/build-crazygames.mjs builds the CrazyGames zip
tools/check-cases.mjs      checks every case for mistakes
tools/check-book.mjs       checks every Career mission (and that released answers never change)
tools/elevenlabs-audio.mjs remakes all sounds with ElevenLabs
tools/synth-audio.py       rebuilds the built-in sounds
```

---

## 1. Try it on your computer

```
python -m http.server 8000
```

Then open http://localhost:8000.

Test addresses:
- `?ads=demo` shows grey boxes where ads will appear.
- `?lb=demo` turns on the leaderboard with made-up players.
- `#endless` jumps straight into Rush.
- `?c=6.ggyrg.92.Raj` opens a friend challenge (Daily #6, 4 of 5, 92 seconds, from Raj).
- `?f=ABC234` opens Friends with that friend code ready to send a request.
- `?restore=ABCDEFGHJKMN` brings progress from an old save code into the player's account.
- `?test=1` adds `window.__WLtest` for automated checks (start any mode, read the saved state).

Testing on `localhost` uses the real database, so delete test scores afterwards (Firestore console, or `firebase firestore:delete scores/<id>`).

To start over, clear the site's data in your browser (the save is in `localStorage` under `whoslying:v1`).

---

## 2. Web hosting (Cloudflare)

The game is live at **https://liarhunt.com**, served free by Cloudflare (unlimited bandwidth and requests for static files). Every push to `main` updates it within a minute or two.

```
git add -A
git commit -m "Describe your change"
git push
```

`wrangler.jsonc` tells Cloudflare to serve the repo root as plain files. `_headers` sets response headers, `_redirects` makes `/` serve `index.html`, and `.assetsignore` lists what is not uploaded. Pages keep their `.html` addresses (`/privacy.html`), exactly as on GitHub Pages.

Try it on your computer the way Cloudflare serves it: `npx wrangler dev`, then open http://localhost:8787.

The old address `https://r4flutter.github.io/WhoLies` is the separate `old` repository, still on GitHub Pages. It forwards players to liarhunt.com with their progress. Leave it as it is.

### One-time setup (moving from GitHub Pages)

Players keep their progress: the address stays `liarhunt.com`, so their browser saves and Firebase sign-in carry on. Nothing changes for AdSense, Search Console or Firebase.

**A. Put the site on Cloudflare** (liarhunt.com keeps running on GitHub meanwhile)

1. Push `wrangler.jsonc`, `_redirects` and `.assetsignore` to `main`.
2. Sign up free at https://dash.cloudflare.com.
3. **Workers & Pages → Create → Import a repository**, connect GitHub and pick `R4Flutter/LiarHunt`. Project name `liarhunt` (it must match `name` in `wrangler.jsonc`), production branch `main`, build command empty, deploy command `npx wrangler deploy`. Deploy.
4. Open the `liarhunt.<your-name>.workers.dev` link it gives you and play a case. Google sign-in won't work on that test address (Firebase only allows liarhunt.com); that's expected.

**B. Move the domain to Cloudflare**

5. Cloudflare home → **Add a domain** → `liarhunt.com` → **Free** plan. It copies your current DNS records.
6. At GoDaddy: **My Products → liarhunt.com → DNS → Nameservers → Change → I'll use my own nameservers**, and enter the two Cloudflare gives you. Wait for Cloudflare's "your domain is active" email (minutes to a few hours). The site keeps working the whole time, because the copied records still point to GitHub.
7. In Cloudflare **DNS → Records**, delete the four `A` records for `liarhunt.com` (`185.199.x.153`) and the `www` CNAME (`r4flutter.github.io`). Straight away, in **Workers & Pages → liarhunt → Settings → Domains & Routes → Add → Custom domain**, add `liarhunt.com`, then add `www.liarhunt.com`. (The site is down for the minute in between.)
8. **Rules → Redirect Rules → Create from template → Redirect from WWW to root**, so `www.liarhunt.com` forwards to `liarhunt.com` as it did before.
9. Check: `curl -sI https://liarhunt.com/` shows `server: cloudflare`.

**C. Switch off GitHub Pages for this repository**

10. Delete `.github/workflows/publish.yml`, `CNAME` and `.nojekyll`, then push. On GitHub, **LiarHunt → Settings → Pages**, unpublish the site. You can delete the `gh-pages` branch. Don't touch the `old` WhoLies repository.

---

## 3. CrazyGames

### Build the upload file

Needs Node.js 18+:

```
node tools/build-crazygames.mjs
```

This makes `dist/liarhunt-crazygames.zip` (about 6.3 MB, 52 files). Upload that zip. The build:
- adds the CrazyGames SDK v3
- sends ads, saves, the mute setting, the username and invite links through the SDK
- removes everything CrazyGames doesn't allow: AdSense, the Firebase leaderboard, WhatsApp/X buttons, links to other pages

### How it follows the CrazyGames rules

- Players land straight in gameplay (case 1 with a short coach).
- `loadingStart`/`loadingStop` around loading, `gameplayStart`/`gameplayStop` around every case, `happytime` on big wins.
- **Midgame ads** only between cases (next Career mission, end of a Rush run, end of the Daily), never in a player's first minute or first 3 solved cases. The screen is blocked while an ad plays.
- **Rewarded ads** are always the player's choice: a hint when out of Magnifiers (not during Rush, 90-second cooldown), one extra Rush life, double login reward, +40 shop coins (4-minute cooldown). No reward if the ad fails. Never a midgame and a rewarded ad in the same break.
- Sound is muted only once an ad really starts, and comes back after. The CrazyGames mute setting overrides the game's own switches.
- Adblock players can still play. Rewarded buttons fall back to free versions or hide.
- Progress saves through the CrazyGames Data module, so it follows signed-in players across devices.
- Share buttons copy a CrazyGames invite link. Opening one starts that Daily or Rush.
- Relative paths only, no external links, no fullscreen button, readable at 800×450.

### Submit it

1. Sign up at https://developer.crazygames.com and click **Add game**.
2. Upload `dist/liarhunt-crazygames.zip`. Choose **HTML5**.
3. Turn on **Progress Save** (Data module) in the submission form.
4. Orientation: **Both** (it works in landscape and portrait). Mobile: **Yes**.
5. Upload the covers and preview videos from the store-assets pack.
6. Paste the title, description, controls and tags below.
7. Use the **Preview** tool and play a full case, a Rush run and the Daily.

**Title:** LiarHunt

**Short description:**
Catch the liar! Read the facts, compare three stories and tap the suspect whose story can't be true.

**Description:**
LiarHunt is a detective puzzle game for sharp eyes. In every case, the police checked a few facts and three suspects tell you where they were. One of them is lying. Find the story that can't be true and stamp it LIAR.

Play the Career story, The Black Ledger: 30 missions where you search scenes, question suspects, rebuild timelines and follow the money to expose a conspiracy. Watch out for twist cases where two people lie, or everyone tells the truth and a fact was planted. Race the clock in Rush mode, build combos for bonus coins, and come back for 5 new Daily Cases every day.

Level up from Rookie to Legend, finish daily missions, open the mission chest, collect your login reward, unlock 27 achievements and buy new desk themes in the shop.

**Controls:**
- Mouse or touch: tap a suspect (or a fact in twist cases), then tap Accuse
- Keyboard: 1–5 to pick, Enter to accuse, Esc to cancel

**Tags:** detective, logic, puzzle, mystery, brain, casual, deduction, 1 player, mobile, trivia

**Category:** Puzzle

### Leaderboard on CrazyGames

CrazyGames leaderboards are invite-only. If they invite the game, paste the **Encryption Key** from the developer portal into `crazygames.leaderboardKey` in `js/config.js` and rebuild. Rush best scores are then submitted automatically.

---

## 4. Web leaderboard (Firebase, free)

The leaderboard is **on**. It uses the free Firebase project `whoslying-daily` (console: https://console.firebase.google.com/project/whoslying-daily). Its web config is in `js/config.js` → `leaderboard.firebase`. That key is meant to be public; the rules protect the data.

It stores four collections:

| Collection | What's in it |
|---|---|
| `scores` | One Daily result per player per day (can't be changed later). |
| `ladder` | The season league: one entry per player per season. Every write adds exactly one posted Daily, and the rules recompute its LP from that day's grid, so league points can't be faked. |
| `fcodes`, `friends` | Friend codes, each player's list (up to 8) and an inbox of friend requests that only its owner reads. |
| `endless`, `league`, `seasons`, `groups` | Retired (the Rush board, the weekly league, the season scoreboard and friend groups). Old data stays; the game no longer writes them. |
| `players` | Each player's game, under their account ID. Only that player can read or write it, and every save raises a revision number, so a device that loaded an older copy can't overwrite newer progress from another device. |
| `saves` | Old progress backups, one per save code (retired: read once to move into an account, and written when the game moves to a new web address). |

**Free plan limits.** Each player costs about 1 read when the game opens, then 1 read and 1 write per save (at the end of every case, at HQ and results screens, when they leave the app, and at most every 20 seconds while playing). The free Spark plan gives 50,000 reads and 20,000 writes a day, which is enough for a few thousand players a day. Past that, switch the project to the Blaze plan (pay as you go, a few dollars at that size).

**Before the cloud save goes live** (two steps, once):

1. Deploy the rules below, so `players/{uid}` is allowed. Until then the game quietly keeps saving on the device.
2. Firebase console → **Authentication → Sign-in method** → turn on **Google**. Then **Authentication → Settings → Authorized domains**: add `liarhunt.com`, `www.liarhunt.com` and `localhost`. (The project starts with only `whoslying-daily.firebaseapp.com` and `whoslying-daily.web.app`; without your own domain on the list, every Google sign-in fails.) Google never allows sign-in inside apps' own browsers (WhatsApp, Instagram…), so the game asks those players to open Chrome or Safari.

Everything about the database is in this repo: `firebase.json` (location, anonymous sign-in), `firebase/firestore.rules` and `firebase/firestore.indexes.json`. After you change any of them, run:

```
firebase deploy --only firestore,auth
```

To see or delete scores (for example a cheater), open **Firestore Database → Data** in the console.

Daily top-10 players get a badge (🥇 🥈 🥉 🎖️) and a prize hint once the day's ranks lock in (38 hours after it starts). If you change `launchDate`, change the `dayStart` line in `firebase/firestore.rules` too, and pick a **Monday**: weekly leagues run from Daily #1, so #1 has to be a Monday.

**Push notifications** are the next step up from the calendar reminder. They need a Firebase Cloud Messaging key and a small scheduled job (a GitHub Actions cron works on the free plan) that sends "New cases are ready" each morning.

---

## 5. Sound and music

Built-in sounds live in `assets/audio/`. Music and sound switches are in Settings (gear icon). To swap a track, drop a new MP3 with the same name into `assets/audio/` and bump `CACHE` in `sw.js`, or returning players keep the old file.

| File | When it plays |
|---|---|
| `tap`, `click` | picking a suspect, buttons |
| `stamp` | the LIAR / HONEST / FAKE stamp |
| `correct`, `wrong` | after each answer |
| `twist` | a twist case appears |
| `whoosh` | next case, hints |
| `tick`, `timeout` | the last seconds in Rush, time running out |
| `fanfare`, `fail` | results screens |
| `coin`, `star`, `combo`, `levelup`, `buy`, `achieve` | rewards |
| `music-hq`, `music-case`, `music-rush`, `precinct`, `harbor` | music by mood (HQ: Crime Piano with a faint precinct background and, in Season 1, a far-off foghorn; cases: True Crime; Rush and the last Daily 5 case: Grey Colors). A mood change crossfades. From Pixabay; sources and processing are in `tools/audio-sources.md` |
| `cuffs`, `camera`, `folder`, `pin`, `pen` | detective-desk sounds: the arrest after the LIAR stamp, new evidence, opening a case file, notes on the board, a finding written down |

**Remake them with ElevenLabs** on your own computer (Node.js 18+):

Windows (PowerShell):
```
$env:ELEVENLABS_API_KEY="your_key_here"; node tools/elevenlabs-audio.mjs
```
macOS / Linux:
```
ELEVENLABS_API_KEY=your_key_here node tools/elevenlabs-audio.mjs
```

`--only stamp,coin` remakes just those. `--music-only` and `--no-music` also work. Never put your API key in a file in this repo: the repo is public.

---

## 6. Web ads (when you have traffic)

Launch with `provider: "none"`. Later:

1. Apply for Google AdSense, then for **H5 Games Ads**.
2. Paste the AdSense snippet in `index.html` where the comment says **GOOGLE ADSENSE**.
3. Turn on the **European regulations** consent message in AdSense → Privacy & messaging.
4. Edit `ads.txt` with your publisher ID (needs your own domain).
5. In `js/config.js`: `provider: "adsense"`, `adsenseClient: "ca-pub-…"`, `adsenseTestMode: true` until approved.

Ads use the same placements as on CrazyGames (section 3), plus **side ads**: on screens at least 1100 px wide and 660 px tall, a tall ad sits left and right of the game (160×600 on laptops, 300×600 from 1600 px wide). Make a **Display ad** unit in AdSense and paste its number in `railSlot` (or leave it empty to reuse `displaySlot`). Phones and small windows get no side ads. Preview them with `?ads=demo`.

---

## 7. Add your own cases

Open `js/cases.js`. The lists `medium`, `hard` and `twist` feed Daily cases 2, 4 and 5. Day 1 uses the first item of each list, and so on. The generator fills in when a list runs out. Rush always uses the generator. Career has its own written story (below).

```js
{
  title: "The Missing Violin",
  setup: "A rare violin vanished from the music shop last night.",
  clues: [
    "It rained hard from 6 PM until midnight.",
    "The shop's alarm was switched off at 9:10 PM."
  ],
  suspects: [
    { name: "Victor", role: "Delivery driver", says: "I walked home at eight under a sky full of stars." },
    { name: "Mira",   role: "Shop assistant",  says: "I caught the bus with my umbrella at seven." },
    { name: "Theo",   role: "Night cleaner",   says: "I start work at ten." }
  ],
  answer: 0,   // Victor is the liar (0 = first suspect)
  proof: [0],  // the clue(s) the player must tap to prove it; [0, 1] when it takes two facts together
  why: "It rained from 6 PM to midnight, so Victor couldn't have walked under a sky full of stars."
}
```

Twist cases add `mode: "honest"` (`answer` is the one honest suspect, `proof` the clues that break the two liars' stories) or `mode: "planted"` (`answer` is the fake clue, `proof` is `[n]`, the suspect whose story shows it's fake). `alt: [[1]]` accepts another proof of the same size. Optional `twist: "..."` adds a reveal line.

Rules: exactly one statement contradicts the facts, simple English, name the liar in `why`. Then run:

```
node tools/check-cases.mjs
```

The checker also makes sure Dailies #1 to #14 never change (players already played them).

### Seasons

From Daily #15 (Monday 9 November 2026) the game runs in seasons of 45 days. Each season has its own case templates in `js/seasons.js`: a town, a cast of locals, story openers with motives, facts and two-fact puzzles. The generator mixes them with the built-in facts for every Daily and Rush case, so each season feels different.

- To add Season 2, copy Season 1's block in `js/seasons.js`, change the content, and run the checker. When a season ends without a new block, the next season reuses the last one's templates in a new mix, so the game never stops.
- The season league runs on league points from every Daily of the season (see "Why players come back"). `js/engine.js` (`LADDER`) and `firebase/firestore.rules` (season ladder section) hold the same numbers: change both together.
- The ladder needs the Firestore rules and indexes in `firebase/` (run `firebase deploy --only firestore`). The rules assume Season 1 starts at Daily #15; keep that in step with `SEASON_ONE` in `js/engine.js`.
- Each season can name its `town` and `places`: the Daily 5 story tools set every story of that season there (`node tools/daily5/generate.mjs --count 30 --season 1`).
- To try a season early on your computer, open `index.html?test=1&today=20` (pretends today is Daily #20).

### Career: Book 1, The Black Ledger

The whole story is in `js/book1.js`, as plain data; `js/book.js` plays it. The comment at the top of `js/book1.js` says what really happened, and every clue and lie must agree with it.

- A mission has a briefing (`brief`, `goal`, `cast`, evidence it `gives`) and 1 to 4 `steps`. A chapter has 6 missions; the 6th ends with an accusation.
- Step types: `search` (items, mark the ones that matter), `talk` (questions, then `breaks`: a statement and the evidence that breaks it), `timeline` (events in the right order), `compare` (one to three documents, the lines to tap), `link` (left items and their match on the right), `accuse` (who, the proof, the motive) and `think` (one right answer). Steps and breaks can give evidence.
- Stars: 3, minus one per mistake, minus one if a Magnifier helped. A third mistake makes the case fall apart: the player retries that step and the mission can earn 1 star. Replays keep the first run's stars.
- Players of the old endless Career got a one-time notice and a thank-you gift; their old progress stays in the save (`S.career`) but isn't used.

After any change run:

```
node tools/check-book.mjs
```

It checks that every step can be solved, that evidence is found before it's needed, that names don't clash with a season's locals, and that the answers of released missions never change (they're locked in `tools/book1-lock.json`). If you change an answer on purpose, run it once with `--lock`. To try a mission, open `index.html?test=1&lb=demo` and run `__WLtest.book.start(12)` in the console (any mission up to the one you've reached).

### Live rooms

HQ → **Play live** opens a room with one link (`?room=CODE`). Up to 10 players join, and when the host starts they all play the same 5 cases at the same time (built from the room's seed, so nothing about the cases is stored). Each case has a clock (90 seconds, 120 for the twist), one try and no hints. A proven catch scores 100, plus up to 50 for speed, with a live scoreboard between cases and a podium at the end. It uses Firestore (`rooms/{code}` and `rooms/{code}/players/{uid}`), so the rules in `firebase/` must be deployed. With `?lb=demo`, rooms run in the browser instead, and each tab is a player: handy for trying it alone.

### Cases players write

HQ → **Write a case** lets players make their own mystery (3 to 5 facts, 3 suspects, the liar and the proof) and send it as a link (`?w=...`). The whole case is packed into the link, compressed, so nothing is stored online and there's nothing to moderate. Friends get one try, no hints, and can send back how they did or write one back. Web only (hidden on CrazyGames). The checker tests that a packed case comes back unchanged.

---

## 8. Daily 5: one mystery in five connected cases (web)

On a day with an approved story, the web Daily becomes **Daily 5**: one mystery split into five cases. Each solved case adds a finding to the player's **Notebook** (evidence, findings, suspects, timeline), and the next case builds on it. Case 5 is a final verdict (who planned it, who helped, how, where the loot is). One wrong answer ends the day and locks the rest; the streak still counts. Everyone gets one free **Hunch** a day (rules out one wrong answer). Players who finish see the full story at once, everyone else at the next midnight. Days without a story, and the CrazyGames build, play the classic Daily.

**The day turns over at midnight India time (IST) for everyone**, for every mode (`dayNumber()` in `js/engine.js`).

**How answers stay honest.** The game has no server, so the Firestore rules do the checking (`firebase/firestore.rules`, Daily 5 section). A case only opens once the one before is solved. Each answer is two writes: commit the pick (it can never change), then resolve it; the rules compare it with an answer key in `d5keys/{day}` that no player can read. On a story day, the Daily score must match the player's run, so it can't be faked. After 6 AM IST the next morning a story becomes a public archive (everything but the keys), and Case files can replay it.

**Making stories** happens on your computer, never in the game. Stories are written by Claude, checked by code, solved blind by a second model, reviewed by a critic, and only go live after you approve and publish them.

```
cd tools/daily5
npm install
node check.mjs --self-test                 # the checker, against the Crown Job example and broken copies of it
node generate.mjs --count 5 --dry-run      # the whole pipeline for free (no API calls)
node generate.mjs --count 5                # 5 real stories, about $15-25 (needs ANTHROPIC_API_KEY)
node admin.mjs                             # the admin desk: http://127.0.0.1:8787
```

- **Drafts and answer keys live outside this repo**, in `~/.liarhunt/daily5` (set `LIARHUNT_DATA` to move it). The repo is public; the tools refuse to write drafts inside it.
- **The checker** (`tools/daily5/check.mjs`) proves each case has exactly one answer: every statement and piece of evidence carries small facts (who, where, when), and code checks that exactly the liar clashes with what the player knows, that every proof needs an earlier case's finding, and that no story text gives a later answer away.
- **The admin desk** shows each draft's checks, blind-solver results and critic notes, lets you play it in the real game (`?d5=local`), approve or reject it, rewrite one case, schedule it for a day and publish it. It warns when fewer than 14 days are covered, and shows how players did on each day (from the run docs).
- **Publishing** writes the day's docs with the Firebase Admin SDK. It needs Google credentials for the project: `gcloud auth application-default login`, or `GOOGLE_APPLICATION_CREDENTIALS` pointing at a key file outside this repo. A published day can't change once it has started.
- **Rules tests:** `cd tools/daily5 && npm run test:rules` runs `rules.test.mjs` on the Firestore emulator (needs Java; with Java 17 use `npx firebase-tools@13 emulators:exec --only firestore --project demo-liarhunt "node tools/daily5/rules.test.mjs"` from the game folder).
- **Ladder and friends rules tests:** `cd tools/daily5 && npm run test:social` runs `social.rules.test.mjs` the same way. `node tools/check-social.mjs` checks the league maths, the season clock, faces, names and sign-in rules without the emulator.
- After changing the rules: `firebase deploy --only firestore`.

## Tech notes

- Daily cases come from a random number generator seeded with the day number, so everyone gets the same ones.
- The game code, styles and fonts are about 420 KB. Sounds load after the first tap.
- Fonts: Big Shoulders Display and Atkinson Hyperlegible (SIL Open Font License, files in `assets/fonts`).
