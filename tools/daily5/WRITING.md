# Writing a Daily 5 story

A Daily 5 story is one mystery told in five connected cases. Cases 1 to 4 each have one liar to catch, and each solved case adds a **finding** to the player's notebook that the next case needs. Case 5 is the verdict: who planned it, who helped, how, and where the loot is.

Stories are written by `generate.mjs` (Claude), or by hand, or with Claude in a chat. However it's written, a story only goes live after it passes the checker (`check.mjs`), you review it in the admin desk, and you publish it.

**A story file holds the answers.** Keep it outside the game folder (the default is `~/.liarhunt/daily5`). Never commit it, never put it on GitHub.

## The voice

A cool, professional case file:

- Short declarative sentences, 20 words or fewer, in plain English (many players read English as a second language).
- Exact clock times ("9:14 PM") and named places, every time.
- Evidence reads like records: logs, receipts, camera stills, statements taken down. No jokes, no chatter.
- Suspects sound like real people under questioning: first person, 1 or 2 sentences.
- Never give away a case's answer, or anything a later case reveals, in an intro, an "ask" or a "previously" line.
- Non-violent crimes only (theft, fraud, sabotage, forgery). No real people, brands or companies.
- In a season, every story happens in that season's town (`js/seasons.js`: `town`, `places`). Its locals may appear as witnesses, never as the culprit.

## The shape

The full, working example is `fixtures/crown-job.json`. Start from a copy of it.

| Field | What it is |
|---|---|
| `id`, `title`, `summary` | A short id, the story's name (2 to 5 words), and one line on what really happened (never shown before the end). |
| `setting` | `{ place, intro }`: where it happens and the opening scene (2 or 3 sentences). |
| `strikes` | Wrong answers allowed before the day ends. Use `1`. |
| `people` | 4 to 6 people: `{ id: "p1", name, role, background, part, motive, secret }`. `part` is `mastermind` (exactly one), `accomplice` (at most two) or `innocent`. An innocent person's `secret` is the reason they lie in one case. |
| `places`, `items`, `acts` | Things the facts point at: `{ id: "l1", name }`, `{ id: "i1", name }`, `{ id: "a1", name }`. |
| `truth` | What really happened, as small facts (below). Every statement and piece of evidence must agree with it, except the liar's statement. |
| `cases` | Five cases, `n` 1 to 5. |
| `finale` | `{ text, chronology }`: the whole story in 6 to 9 sentences, plus 6 to 12 `{ at, text, case }` lines in time order (`case` = the case that revealed it, 0 if none). |

**A fact** is `{ slot, value, from, to }`, with `not: true` when it says something did *not* happen. Times are 24-hour `"21:14"`.

- `at:<person or item>` with a place: where someone or something was.
- `holder:<item>` with a person, place or item: who or what had it.
- `doer:<act>` with a person: who did it.
- `state:<item or place>` with a word: what state it was in (live, replay, shipped…).

Two facts clash when they share a slot, their times overlap and they can't both be true. That's how the checker proves the liar.

**Cases 1 to 4** (`mode: "liar"`):

- `title`, `intro`, `previously` (one-sentence recap of the last finding; empty in case 1), `ask` ("Who is lying about the vault?")
- `suspects`: 3 to 5 people ids. `statements`: one per suspect, in the same order, `{ id: "s1", by, text, claims: [facts] }`.
- `evidence`: 2 to 6 of `{ id: "e1", kind, title, source, time, text, shows: [facts] }`. `kind` is `cctv`, `log`, `document`, `witness`, `photo`, `record`, `phone` or `object`.
- `uses`: the findings from earlier cases this case needs (case 2 onward must use at least one).
- `answer`: the liar's statement id. `why`: 2 or 3 sentences naming the liar and the facts that catch them.
- `finding`: `{ id: "f1", text, facts }`, what is now known. `timeline`: 1 to 3 `{ at, text }` notebook captions.

Exactly one statement may clash with what the player knows (this case's evidence plus earlier findings), and that clash must need an earlier finding from case 2 on.

**Case 5** (`mode: "verdict"`): `uses` all four findings, and `parts` holds 2 to 4 questions: `{ id: "q1", about, ask, options: [{ id, label }], answer, because: [finding ids] }` (`ask` is the question). `about` is `mastermind`, `accomplice`, `route`, `item`, `motive` or `other`. Every wrong option must be ruled out by the findings.

## Writing one with Claude in a chat

1. Paste this to Claude, with `fixtures/crown-job.json` attached:

   > Write a new LiarHunt Daily 5 story as one JSON file in exactly the same shape as the attached example, following tools/daily5/WRITING.md (attached too). Setting: *(for example: the ferry terminal in Port Ellery)*. Crime: *(for example: stolen ticket money)*. Give every statement and piece of evidence its facts, make exactly one liar per case, and check each case against the rules before you answer. Reply with the JSON only.

2. Save the reply as a `.json` file outside the game folder.
3. Start the admin desk (`node tools/daily5/admin.mjs`), click **Import JSON** and pick the file. The desk runs the checker straight away and shows what's wrong, if anything. You can also run the blind AI solvers and the critic on it.
4. Fix and re-import until it's **ready**, play it in the real game from the desk, then approve, schedule and publish it as usual.

To make many at once instead, let the generator write them: `node generate.mjs --count 30 --season 1` (about $90 to $150 of Claude API use), then review them in the desk.
