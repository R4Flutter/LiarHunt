# Writing a Daily 5 story

A Daily 5 story is one crime told in five chapters. In chapters 1 to 4 the player **searches** a drawn scene for evidence, **questions** the suspects, then **accuses**: they name the one statement that can't be true and the evidence that proves it. Each solved chapter adds a **finding** to the notebook that the next chapter needs. Chapter 5 is the **verdict**: who planned it, who helped, how, and where the stolen thing is now.

Stories are written by Claude **in Claude Code**, on the owner's own Claude plan (no API bill), or by hand. However a story is written, it only goes live after it passes the checker, a blind solver can solve it, the owner plays it in the admin desk and approves it, and the owner publishes it.

**A story file holds the answers.** Keep it outside the game folder, in `~/.liarhunt/daily5/inbox/`. Never commit it, never put it on GitHub. (The two stories in `fixtures/` are test stories that will never be published.)

## Writing in Claude Code

1. Write the story as JSON to `~/.liarhunt/daily5/inbox/<story-id>.json`. Start from a copy of `fixtures/ferry-strongbox.json`, the full v2 example.
2. Check it: `node tools/daily5/check.mjs ~/.liarhunt/daily5/inbox/<story-id>.json`. Fix every ✗ and re-run until it says ✓. Read the ! warnings too.
3. Solve it blind: run `node tools/daily5/check.mjs --player <file>` (only what a player can ever see) and give that output to a **fresh subagent** with the prompt in `BLIND.md`. If it can't solve every chapter, or solves one without searching and questioning, rewrite and check again.
4. Make it a draft for the desk: `node tools/daily5/check.mjs --import <file>` (the draft id is `d5-<story-id>`).
5. The owner opens the desk (`node tools/daily5/admin.mjs`), plays it in the game from there, approves it, schedules it on a day and publishes it.

## The voice

A cool, professional case file:

- Short declarative sentences, 20 words or fewer, in plain English (many players read English as a second language).
- Exact clock times ("9:14 PM") and named places, every time.
- Evidence reads like records: logs, receipts, camera stills, statements taken down. No jokes, no chatter.
- Suspects sound like real people under questioning: first person, 1 or 2 sentences.
- Never give away a chapter's answer, or anything a later chapter reveals, in an intro, an "ask", a spot text, a question or a "previously" line. The checker refuses any 6-word phrase shared with a later reveal.
- Non-violent crimes only (theft, fraud, sabotage, forgery). No real people, brands or companies.
- In a season, every story happens in that season's town (`js/seasons.js`: `town`, `places`, `scenes`). The season's locals (`cast`) may appear as witnesses, never as a suspect who lies, the mastermind or an accomplice. Give your suspects new names.

## Making it hard (and fair)

- The lie is never heard for free: its question needs a piece of evidence first (`needs`), or it only comes out when the player shows someone evidence (a press).
- Every chapter has 8 to 14 statements. Most are true and boring on purpose. Innocent people have secrets and sound nervous too.
- Proofs from chapter 2 on must need an earlier finding, so the chapters build on each other.
- Use at least four kinds of lie across chapters 1 to 4 (below). Mix single-piece proofs with two-piece ones.
- Two or more spots in every scene find nothing. Some evidence only matters in a later chapter.
- Read every piece of evidence as a player would. If one *seems* to contradict the lie but isn't in the proof (a neighbour who "heard oars at 10:55"), players will pick it and be marked wrong: rewrite it so it doesn't, or make it the proof.
- Don't let a finding hand over the next answer word for word. Prefer proofs that combine a finding with this chapter's evidence (`need` 2), and keep the last finding from naming who planned it: the verdict should take putting findings together.
- A lie should be one false claim. Extra clauses ("...and nobody came by") get disproved by other evidence and give the player a second, wrong-looking proof.
- Keep the story straight across chapters: someone who left at 11:10 can't have seen who arrived at 11:20, and a note signed with an initial points at whoever has that initial.

## Kinds of lie (`lie` on each chapter)

| `lie` | What catches it | Example |
|---|---|---|
| `time` | a log, receipt or camera shows another time | "I left at 9." The door log says 9:40. |
| `place` | someone or something places them elsewhere | Says the café; a photo shows the pier. |
| `travel` | only a walking time: they couldn't get there that fast | At the café at 9:52, "at the cannery at 9:58"; the walk takes 15 minutes. |
| `seen` | they couldn't have seen it: fog, dark, a shop that was shut | "I watched the pier." The glass was fogged. |
| `holder` | the item was with someone else then | "The key never left me." The log shows it out. |
| `count` | the money or the count is wrong | "$8,400, every note." The box was empty from 9:50. |

## The shape (v2)

| Field | What it is |
|---|---|
| `v` | `2` |
| `id`, `title`, `summary` | A short id (lowercase, dashes), the story's name (2 to 5 words), and one line on what really happened (never shown before the end). |
| `setting` | `{ place, intro }`: where it happens and the opening scene (2 or 3 sentences). |
| `strikes` | `2` (one miss, then the Revive). |
| `travel` | Optional walking times: `[{ a: "l2", b: "l4", mins: 15 }]`. Two places with no listed time never clash this way. Say the time ("a 25-minute row") in the finding or evidence the proof uses, or the player can't see why it proves anything; the checker warns if you don't. |
| `people` | 5 or 6: `{ id: "p1", name, role, face, background, part, motive, secret }`. `face` is `f00` to `f15`, different for everyone. `part` is `mastermind` (exactly one), `accomplice` (at most two) or `innocent`. An innocent person's `secret` is why they lie in one chapter. |
| `places`, `items`, `acts` | Things the facts point at: `{ id: "l1", name }`, `{ id: "i1", name }`, `{ id: "a1", name }`. |
| `truth` | What really happened, as small facts (below). Everything except the lies must agree with it. |
| `cases` | Five chapters, `n` 1 to 5. |
| `finale` | `{ text, chronology }`: the whole story in 6 to 9 sentences, plus 5 to 20 `{ at, text, case }` lines in time order (`case` = the chapter that revealed it, 0 if none). |

**A fact** is `{ slot, value, from, to }`, with `not: true` when it says something did *not* happen. Times are 24-hour `"21:14"`.

- `at:<person or item>` with a place: where someone or something was.
- `holder:<item>` with a person, place or item: who or what had it.
- `doer:<act>` with a person: who did it.
- `state:<item or place>` with a word (letters only): what state it was in (fogged, empty, lit, out…).

Two facts clash when they share a slot, their times overlap and they can't both be true, or (with `travel`) when someone is at two places too close in time to walk between them. That's how the checker proves the liar.

**Chapters 1 to 4** (`mode: "liar"`):

| Field | What it is |
|---|---|
| `title`, `intro`, `previously`, `ask` | The chapter's name, its opening (2 or 3 sentences), a one-sentence recap of the last finding (empty in chapter 1), and the question ("Who is lying about the harbor office?"). |
| `scene`, `time` | The drawn scene for the place (`js/art.js`: lighthouse, ferry, office, cannery, museum, hotel, cafe, boatyard, pub, yachtclub, newsroom, market; `js/seasons.js` `scenes` maps the season's places to them) and when it's searched (`"23:45"`). |
| `suspects` | 3 to 5 people ids. |
| `spots` | 7 to 10 things to search: `{ id: "x1", anchor, icon, label, text, finds }`. `anchor` is a named spot in that scene (the checker lists them), `icon` is from the icon set (the checker lists them), `label` 28 characters at most, `text` 160 at most, `finds` an evidence id or `""`. Every evidence is found by exactly one spot; at least 2 spots find nothing. |
| `evidence` | 5 to 8 of `{ id: "e1", kind, title, source, time, text, shows: [facts] }`. `kind` is `cctv`, `log`, `document`, `witness`, `photo`, `record`, `phone` or `object` (each looks different on screen; `record` prints like a till receipt). |
| `questions` | 2 or 3 per suspect: `{ id: "k1", by, ask, needs: [evidence ids], says: statement id }`. `needs` empty means it's open from the start. |
| `presses` | 1 to 4 of `{ by, shown, says }`: showing `by` the evidence (or a carried finding) `shown` gets the statement `says`, marked STORY CHANGED. At least one press is of a suspect who isn't the liar. |
| `statements` | 8 to 14 of `{ id: "s1", by, text, claims: [facts] }`. Each is heard through exactly one question or press. |
| `uses` | The findings from earlier chapters this one needs (chapter 2 on: at least one). |
| `answer`, `lie`, `why` | The lying statement's id, its kind, and 2 or 3 sentences naming the liar and the facts that catch them. |
| `finding`, `timeline` | `{ id: "f1", text, facts }`, what is now known, and 1 to 3 `{ at, text }` notebook lines. |

Ids are unique across the whole story: statements `s1..`, evidence `e1..`, spots `x1..`, questions `k1..`, findings `f1..f4`.

**Chapter 5** (`mode: "verdict"`): `title`, `intro`, `previously`, `ask`, `why`, `uses` (all four findings) and exactly 4 `parts`, one each `about`: `mastermind`, `accomplice`, `route` (how), `item` (where it is now). A part is `{ id: "q1", about, ask, options: [{ id, label, icon? }], answer, because: [finding ids] }`. People options use person ids (and `{ id: "none", label: "Nobody" }` for the accomplice when it fits); route and item options need an `icon`; invented options use ids like `m1`. Every wrong option must be ruled out by the findings.

## Story Night remixes

A remix retells a past Daily for friends' rooms: the same town, places, opening crime and **the same people** (ids, names, roles, faces), but **someone else planned it**. Rewrite every chapter's evidence, lies and findings so remembering the original doesn't help. Add `"remixOf": "<the original story's id>"`. The checker and the desk refuse a remix that changes the people or keeps the mastermind. Import it like any story; the desk publishes it to Story Night (`Publish to Story Night`), and it appears on the room shelf as "Past case, new twist" once the original's day is over.

## Older stories (v1)

Stories without `"v": 2` still play on the old screen: one statement per suspect, 2 to 6 pieces of evidence, `strikes` 1 to 5, and no scene, spots, questions or presses. `fixtures/crown-job.json` is the v1 example. Write new stories as v2.
