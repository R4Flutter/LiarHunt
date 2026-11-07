// Daily 5: what we ask the AI, and the JSON shapes it must answer in.
// Stage A writes the logic (who, where, when, the lies, the answers). Stage B writes the words players read.
// The blind solver sees only what a player sees. The critic sees everything.

/* ---------- JSON shapes (structured outputs: every object closed, every field required) ---------- */
const obj = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const arr = (items) => ({ type: "array", items });
const S = { type: "string" }, I = { type: "integer" }, B = { type: "boolean" };
const en = (...v) => ({ type: "string", enum: v });
const FACT = obj({ slot: S, value: S, from: S, to: S, not: B });

export const BLUEPRINT_SCHEMA = obj({
  title: S, summary: S, place: S,
  people: arr(obj({ id: S, name: S, role: S, background: S, part: en("mastermind", "accomplice", "innocent"), motive: S, secret: S })),
  places: arr(obj({ id: S, name: S })), items: arr(obj({ id: S, name: S })), acts: arr(obj({ id: S, name: S })),
  truth: arr(FACT),
  cases: arr(obj({
    n: I, mode: en("liar", "verdict"), focus: S, suspects: arr(S),
    statements: arr(obj({ id: S, by: S, gist: S, claims: arr(FACT) })),
    evidence: arr(obj({ id: S, kind: en("cctv", "log", "document", "witness", "photo", "record", "phone", "object"), time: S, gist: S, shows: arr(FACT) })),
    uses: arr(S), answer: S,
    finding: obj({ id: S, gist: S, facts: arr(FACT) }),
    parts: arr(obj({ id: S, about: en("mastermind", "accomplice", "route", "item", "motive", "other"), options: arr(obj({ id: S, label: S })), answer: S, because: arr(S) }))
  }))
});

export const NARRATIVE_SCHEMA = obj({
  intro: S,
  cases: arr(obj({
    n: I, title: S, intro: S, previously: S, ask: S,
    statements: arr(obj({ id: S, text: S })),
    evidence: arr(obj({ id: S, title: S, source: S, text: S })),
    why: S, finding: S,
    timeline: arr(obj({ at: S, text: S })),
    parts: arr(obj({ id: S, ask: S }))
  })),
  finale: obj({ text: S, chronology: arr(obj({ at: S, text: S, case: I })) })
});

export const SOLVE_SCHEMA = obj({ answer: S, proof: arr(S), confidence: I, alternatives: arr(obj({ id: S, reason: S })), problems: arr(S) });
export const VERDICT_SOLVE_SCHEMA = obj({ answers: arr(obj({ question: S, option: S })), confidence: I, problems: arr(S) });
export const CRITIC_SCHEMA = obj({
  verdict: en("pass", "fix", "reject"),
  issues: arr(obj({ severity: en("blocker", "major", "minor"), where: S, problem: S, fix: S }))
});

/* ---------- converting between the story and the two stages ---------- */
export function toBlueprint(story) {
  return {
    title: story.title, summary: story.summary, place: story.setting.place,
    people: story.people, places: story.places, items: story.items, acts: story.acts, truth: story.truth.map(fact),
    cases: story.cases.map((c) => c.mode === "verdict"
      ? { n: c.n, mode: "verdict", focus: c.ask, suspects: [], statements: [], evidence: [], uses: c.uses, answer: "", finding: { id: "", gist: "", facts: [] },
          parts: c.parts.map((q) => ({ id: q.id, about: q.about, options: q.options, answer: q.answer, because: q.because })) }
      : { n: c.n, mode: "liar", focus: c.ask, suspects: c.suspects,
          statements: c.statements.map((s) => ({ id: s.id, by: s.by, gist: s.text, claims: s.claims.map(fact) })),
          evidence: c.evidence.map((e) => ({ id: e.id, kind: e.kind, time: e.time || "", gist: e.text, shows: e.shows.map(fact) })),
          uses: c.uses, answer: c.answer, finding: { id: c.finding.id, gist: c.finding.text, facts: c.finding.facts.map(fact) }, parts: [] })
  };
}
const fact = (f) => ({ slot: f.slot, value: f.value, from: f.from, to: f.to || f.from, not: !!f.not });
export function toNarrative(story) {
  return {
    intro: story.setting.intro,
    cases: story.cases.map((c) => ({
      n: c.n, title: c.title, intro: c.intro, previously: c.previously || "", ask: c.ask,
      statements: (c.statements || []).map((s) => ({ id: s.id, text: s.text })),
      evidence: (c.evidence || []).map((e) => ({ id: e.id, title: e.title, source: e.source, text: e.text })),
      why: c.why, finding: c.finding ? c.finding.text : "", timeline: c.timeline || [],
      parts: (c.parts || []).map((q) => ({ id: q.id, ask: q.ask }))
    })),
    finale: story.finale
  };
}
// the full story from the two stages. Text the narrative left out stays empty, so the check catches it.
export function merge(id, bp, nar, strikes) {
  const nc = (n) => (nar.cases || []).find((c) => c.n === n) || {};
  const byId = (list, id) => (list || []).find((x) => x.id === id) || {};
  const strip = (f) => { const o = { slot: f.slot, value: f.value, from: f.from, to: f.to }; if (f.not) o.not = true; return o; };
  return {
    id, title: bp.title, summary: bp.summary, setting: { place: bp.place, intro: nar.intro || "" }, strikes: strikes || 1,
    people: bp.people, places: bp.places, items: bp.items, acts: bp.acts, truth: (bp.truth || []).map(strip),
    cases: (bp.cases || []).map((c) => {
      const t = nc(c.n);
      const head = { n: c.n, title: t.title || "", intro: t.intro || "", previously: t.previously || "", ask: t.ask || "", mode: c.mode };
      if (c.mode === "verdict") {
        return Object.assign(head, { uses: c.uses, why: t.why || "",
          parts: c.parts.map((q) => ({ id: q.id, ask: byId(t.parts, q.id).ask || "", about: q.about, options: q.options, answer: q.answer, because: q.because })) });
      }
      return Object.assign(head, {
        suspects: c.suspects,
        statements: c.statements.map((s) => ({ id: s.id, by: s.by, text: byId(t.statements, s.id).text || "", claims: s.claims.map(strip) })),
        evidence: c.evidence.map((e) => { const x = byId(t.evidence, e.id); return { id: e.id, kind: e.kind, title: x.title || "", source: x.source || "", time: e.time || "", text: x.text || "", shows: e.shows.map(strip) }; }),
        uses: c.uses, answer: c.answer, why: t.why || "",
        finding: { id: c.finding.id, text: t.finding || "", facts: c.finding.facts.map(strip) },
        timeline: t.timeline || []
      });
    }),
    finale: nar.finale || { text: "", chronology: [] }
  };
}

/* ---------- the brief: code picks the ingredients, so stories don't repeat ---------- */
export const SETTINGS = [
  "a heritage museum in Mumbai", "a film studio in Hyderabad during a night shoot", "a tea estate bungalow in Darjeeling",
  "a palace hotel in Jaipur during a wedding", "a cricket academy in Chennai before a trial match", "a startup office in Bengaluru on launch night",
  "a houseboat festival in Alleppey", "a school science fair in Pune", "an overnight train from Delhi to Kolkata", "a spice warehouse in Kochi",
  "a music college in Kolkata before a concert", "a TV news studio in Delhi", "a jewellery workshop in Surat", "a hill-station library in Shimla",
  "a bakery in Goa during a food festival", "a chess tournament hall in Ahmedabad", "an art auction house in Mumbai", "a radio station in Lucknow",
  "a botanical research garden in Ooty", "a comic convention in Bengaluru", "a kite festival in Ahmedabad", "a fashion show backstage in Delhi",
  "a puppet theatre in Udaipur", "a shipping office at Visakhapatnam port"
];
export const CRIMES = [
  "the theft of a famous object", "a valuable object swapped for a fake", "a leaked exam paper or secret recipe", "sabotage before a big event",
  "a missing prize trophy", "a forged signature on an important document", "a stolen prototype", "a vanished painting", "rigged results",
  "stolen ticket money"
];
export const HERRINGS = [
  "an innocent person lies to hide a secret friendship", "an innocent person lies to protect a relative", "an innocent person lies to hide a small mistake at work",
  "an innocent person lies about leaving their post", "an innocent person lies to hide a side job", "an innocent person lies to hide a surprise they were planning"
];
export const MASTERMINDS = ["the friendly boss", "the newest employee", "the loyal old hand", "the victim's best friend", "the person who reported the crime", "a visiting guest"];

/* ---------- prompts ---------- */
const RULES = `LiarHunt is a detective game for phones. Each day players get ONE mystery split into FIVE connected cases.
Cases 1-4: suspects each give one statement. Exactly one statement is a lie, and the player must tap the liar, then tap the fact(s) that prove the lie. Case 5 is a final verdict: 2-4 multiple-choice questions (who planned it, who helped, how, where the stolen thing is now).
One wrong answer ends the player's day, so every case must have exactly ONE defensible answer that a careful reader can prove.

Every statement, piece of evidence and finding carries FACTS written as small records next to the prose:
  { "slot": "...", "value": "...", "from": "HH:MM", "to": "HH:MM", "not": false }
slot forms:
  at:<person or item id>      value: place id      (where they were, from-to inclusive)
  holder:<item id>            value: person, place or item id (who or what had the item)
  doer:<act id>               value: person id     (who did the act)
  state:<item or place id>    value: one lowercase word (live, replay, locked, shipped...)
"not": true means "this is NOT the value" (e.g. "I never touched the card" = holder:i2 not p3).
Times are 24-hour HH:MM on one evening (or one day). No times after 23:59.
Two facts CLASH when they share a slot, their times overlap (inclusive), and they can't both be true.
One rule joins two facts: if a person is holder of an item, and the item was at a place at an overlapping time, the person was at that place then. Use it for two-fact proofs (a log says card X opened a door + another record says person P had card X = P was at the door).

Ids: people p1.., places l1.., items i1.., acts a1.., statements s1.. (unique across the whole story), evidence e1.. (unique), findings f1..f4, verdict questions q1..q4. Verdict option ids reuse person/place/item ids where they fit, or x1.. for invented answers.

The checker will reject the story unless ALL of these hold:
1. "truth" is the real timeline. It never contradicts itself (including facts derived by the holder rule). Every evidence fact and finding fact is inside the truth (same slot and value, its time range within a truth fact's range).
2. In each case 1-4, only the answer statement lies: at least one of its claims clashes with the truth. Every claim of every other statement is inside the truth. Innocent suspects never lie in a case where they are not the answer.
3. What the player knows at case n = evidence from cases 1..n plus findings from cases 1..n-1. With that, EXACTLY the answer statement clashes. Check every other statement against every known fact, including earlier cases' evidence. Watch time boundaries: 21:20 and 21:20 overlap.
4. The facts on screen in case n are its own evidence plus the findings listed in "uses". The liar must be provable from those. Every smallest proof must be the same size (1 or 2 facts), and in cases 2-4 every proof must include a finding from an earlier case. So design each case so the new evidence is only half of the proof and an earlier finding is the other half (or the finding alone catches the lie). Don't add evidence that catches the liar on its own in cases 2-4.
5. Case 1 is easy: one piece of its own evidence catches the liar. Cases 3-4 are best as two-fact proofs (new evidence + earlier finding, joined by the holder rule).
6. Each case 1-4 has a finding (2-3 facts) that becomes the next clue. The finding states what was learned, not a guess.
7. Case 5 has mode "verdict", uses all four findings, and 2-4 questions. The "mastermind" question's answer is the one mastermind; "accomplice" is an accomplice; each question lists the findings that prove it ("because"), and all four findings are used somewhere. Wrong options must be ruled out by the findings.
8. 3-5 suspects per case (4-6 people in the cast; one mastermind, at most two accomplices, the rest innocent). Statements are in the same order as suspects, one each. 2-6 pieces of evidence per case.
9. The liar changes from case to case. The mastermind should not be the case 1 liar. Use red herrings: an innocent person may be the liar of one case, lying to hide a personal secret, not the crime.
10. Non-violent crimes only (theft, fraud, sabotage, forgery). No weapons, injuries, drugs or adult themes. No real people, brands or companies. Fictional places inside real Indian cities are fine.`;

const BP_TASK = `Write the Stage A blueprint: the logic of one new mystery. Keep "gist" lines short and plain (what the statement or evidence says). Stage B will write the final wording, so focus on a fair, clever, consistent puzzle.
Before answering, check rules 1-4 for every case carefully, statement by statement and fact by fact.`;

export function blueprintPrompt(brief, avoid, example) {
  return {
    system: RULES + "\n\nHere is a complete example blueprint that passes every check (THE CROWN JOB). Write an original mystery; do not reuse its plot, names or setting.\n" + JSON.stringify(example),
    user: `${BP_TASK}

Brief for this mystery:
- Setting: ${brief.setting}
- Crime: ${brief.crime}
- Red herring: ${brief.herring}
- The mastermind is ${brief.mastermind}
- Cast size: ${brief.cast} people
${brief.remixOf ? "- This is a fresh retelling for a group game night, in the same setting as an earlier story. Invent a completely new cast, a different culprit, a different twist and different clues, so nobody who played the earlier story can guess any answer.\n" : ""}${avoid.length ? "- Don't reuse these titles or names from recent stories: " + avoid.join(", ") : ""}`
  };
}

const STYLE = `Write for a phone screen in simple, vivid English (players are mostly in India, many read English as a second language).
- Sentences of 20 words or fewer. Plain words. No idioms that need explaining.
- Statements sound like real people talking, in first person, 1-2 sentences, and say exactly what their claims say: no extra facts, nothing vaguer.
- Evidence text states exactly what its facts show, with the time written like "9:14 PM". Titles are 2-4 words, sources 1-3 words.
- Case intros (1-3 sentences) set the scene for that case without giving its answer. "previously" (cases 2-5) recaps the last finding in one sentence; case 1's is empty.
- "ask" is the case question, like "Who is lying about the vault?".
- "why" explains the answer in 2-3 sentences, naming the liar and the facts that catch them.
- "finding" is 1-2 sentences saying what is now known; it must state the finding's facts.
- "timeline" lines (1-3 per case) are short captions for the notebook, at the times of the finding.
- The finale (6-9 sentences) tells the whole story in order, including motives and what happened next. Its chronology has 6-12 lines in time order, each tagged with the case that revealed it (0 if none).
- Never reveal a case's answer, or anything a later case reveals, in an intro, ask or previously line.`;

export function narrativePrompt(blueprint, example) {
  return {
    system: RULES + "\n\n" + STYLE + "\n\nExample (the wording for THE CROWN JOB):\n" + JSON.stringify(example),
    user: "Write Stage B: all the player-facing words for this blueprint. Use exactly its ids; don't add, drop or change any fact.\n\n" + JSON.stringify(blueprint)
  };
}

export function repairPrompt(errors) {
  return "The checker rejected this. Fix every problem below, keep everything that already works, and return the complete corrected JSON.\n\n" + errors.map((e) => "- " + e).join("\n");
}

export const SOLVER_SYSTEM = `You are a sharp detective playing LiarHunt. You only know what is written in front of you: the story so far, your notebook, and the current case.
In a liar case exactly one suspect's statement is false, and it can be proven false with the facts on screen (the evidence and the findings carried over from earlier cases, each with an id). Find that statement and the smallest set of facts that proves it.
Be strict: if more than one suspect could be lying, or the proof needs something not written, say so under "problems". List the other suspects you considered under "alternatives". Confidence is 0-100.`;
export const VERDICT_SYSTEM = `You are a sharp detective giving the final verdict in a LiarHunt mystery. Use only the story, your notebook findings and the questions. Answer every question with one option id.
If a question has more than one defensible answer, or the findings don't support any answer, say so under "problems". Confidence is 0-100.`;

export function playerView(out, n) {
  const ed = out.edition, lines = [`STORY: ${ed.title} (${ed.place})`, ed.intro, "", "CAST:"];
  ed.cast.forEach((p) => lines.push(`- ${p.name}, ${p.role}: ${p.background}`));
  lines.push("", "NOTEBOOK (findings from cases you solved):");
  for (let m = 1; m < n; m++) lines.push(`- Case ${m}: ${out.reveals[m].finding.text}`);
  const c = out.cases[n];
  lines.push("", `CASE ${n}: ${c.title}`, c.previously ? "Previously: " + c.previously : "", c.intro, "", "FACTS ON SCREEN:");
  c.facts.forEach((f) => lines.push(`[${f.id}] ${f.title}${f.time ? " (" + f.time + ")" : ""}: ${f.text}`));
  if (c.mode === "verdict") {
    lines.push("", "QUESTIONS:");
    c.parts.forEach((q) => lines.push(`[${q.id}] ${q.ask} Options: ${q.options.map((o) => `${o.id} = ${o.label}`).join("; ")}`));
  } else {
    lines.push("", `QUESTION: ${c.ask}`, `The proof needs ${c.need} fact${c.need > 1 ? "s" : ""}.`, "", "STATEMENTS:");
    c.suspects.forEach((s) => lines.push(`[${s.sid}] ${s.name} (${s.role}): "${s.says}"`));
  }
  return lines.filter((l) => l !== undefined).join("\n");
}

export const CRITIC_SYSTEM = RULES + `

You are the story editor and fact-checker. You see the whole story, including the hidden truth and the facts behind every line.
Find real problems, not style nitpicks:
- a sentence that says something different from (or more than) its facts
- a statement that could reasonably be read as a lie when it isn't the answer, or a lie a player couldn't spot
- timeline, motive or character contradictions anywhere, including in the finale
- a case intro, ask or recap that gives away an answer early
- a finding that states something no case established
- unfair leaps, confusing wording, unsafe or culturally insensitive content
"blocker" = a player could fail while reasoning correctly, or the story contradicts itself. "major" = needs fixing before publishing. "minor" = polish.
Verdict: "pass" if there are no blockers or majors, "fix" if a few targeted edits would do, "reject" if the mystery doesn't work.`;
