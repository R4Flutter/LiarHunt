/*
  LIARHUNT — seasons
  ----------------------
  A season lasts 4 weeks, Monday to Sunday. Season 1 starts with Daily #15 (Monday 9 November 2026).
  Each season brings its own case templates: a town, a cast of locals who keep turning up, story openers
  with motives, facts, and two-fact puzzles. The case generator mixes them with the game's built-in facts.

  To add a season, copy Season 1's shape and append it to the list. A season with no entry of its own
  (the list ran out) reuses the last season's templates, so the game never stops. Every Daily and Rush case
  uses the current season. Run `node tools/check-cases.mjs` after editing.

  name, tagline   shown on the season card
  cast            [name, role]: locals who appear as suspects all season (first names, not used elsewhere)
  premises        { title, setup, motives: ["{name} ..."], at }: what happened. {name} becomes the liar.
                  at: "night" (the default) or "day". The game adds the crime's time window to the setup and only
                  uses facts with the same at (or none), so every story is about that window.
  facts           { id, at, groups, tier, clue, truths, near, lies: [{ say, why }] }
                  tier 1 easy, 2 needs a moment, 3 needs a little maths. groups: two facts sharing a group never
                  meet in one case (a blackout would also stop the lift). near: true lines that sound suspicious.
                  Or make(r, h, ctx) returning { clue, truths, near, lies } with new times or prices each time.
  combos          two facts that only catch the liar together: make(r, h, ctx) returning { clues: [a, b], truths, near, lies }
                  h: h.clock(minutes) "9:30 PM", h.dur(minutes) "1 hour 30 minutes", h.pick(list, r), h.cap(text)
                  ctx.npc: { name, role }, a local who isn't a suspect in this case
  more, drop      extra lies for the built-in facts (by id), and built-in lies not to use any more
  regroup         new groups for built-in facts (by id)
*/
window.WL_SEASONS = [
  {
    name: "The Port Ellery Files",
    icon: "⚓",
    tagline: "Fog, ferries and a harbor full of secrets. Four weeks, one small town, a lot of lies.",
    cast: [
      ["Marta", "Harbor master"], ["Otto", "Ferry captain"], ["Ines", "Fishmonger"], ["Jonah", "Lighthouse keeper"],
      ["Priya", "Hotel manager"], ["Leo", "Boatbuilder"], ["Sadie", "Café owner"], ["Tomas", "Dock worker"],
      ["Hana", "Marine biologist"], ["Felix", "Gazette reporter"], ["Ruth", "Mayor's aide"], ["Kwame", "Night watchman"],
      ["Elsa", "Art dealer"], ["Dev", "Ferry ticket clerk"], ["Bea", "Yacht club secretary"], ["Arlo", "Cannery foreman"]
    ],
    premises: [
      { title: "The Lighthouse Lens", setup: "The brass cover of the lighthouse lens vanished some time last night.",
        motives: ["{name} meant to sell the old brass to a scrap dealer inland.", "{name} wanted the lighthouse dark so a smuggler's boat could slip in."] },
      { title: "The Ferry Strongbox", setup: "The night ferry's strongbox, full of ticket money, came back to port empty.",
        motives: ["{name} owed money to half the harbor.", "{name} was saving to leave Port Ellery for good."] },
      { title: "The Cut Mooring Line", setup: "Someone cut the mooring line of the mayor's yacht, and it drifted onto the rocks.",
        motives: ["{name} lost a bet to the mayor and wanted to get even.", "{name} was furious about the new harbor fees."] },
      { title: "The Cannery Ledger", setup: "The old cannery's account book disappeared from the foreman's desk.",
        motives: ["The ledger showed {name} had been taking cash for months.", "{name} wanted proof that the cannery was cheating its workers."] },
      { title: "The Wren's Figurehead", setup: "The carved figurehead of the old ship Wren vanished from the Maritime Museum's yard.",
        motives: ["A collector had offered {name} a small fortune for it.", "{name} said it belonged to their family and wanted it back."] },
      { title: "The Gazette Scoop", setup: "A reporter's notebook was stolen the night before a big story about the harbor.",
        motives: ["The story was about {name}.", "{name} wanted to sell the scoop to a city paper first."] },
      { title: "The Pearl Buoy", at: "day", setup: "A pearl necklace hidden inside a buoy for the town treasure hunt was gone before anyone found it.",
        motives: ["{name} knew which buoy it was in and couldn't resist.", "{name} needed money for a new boat engine."] },
      { title: "The Regatta Cup", setup: "The silver Regatta Cup disappeared from the yacht club's glass case.",
        motives: ["{name} came second three years running and was sick of it.", "{name} planned to melt it down and sell the silver."] },
      { title: "The Fish Market Till", at: "day", setup: "The fish market's till was emptied while the stallholders were busy.",
        motives: ["{name} was months behind on rent for their stall.", "{name} wanted the market to look badly run before the council vote."] },
      { title: "The Night Market Lanterns", setup: "Someone slashed every paper lantern hung over the quay for tomorrow's night market.",
        motives: ["{name} wanted the night market moved away from their front door.", "{name} lost the lantern contract and took it badly."] },
      { title: "The Master Key Card", setup: "The master key card of the Harbor Hotel went missing from the reception desk.",
        motives: ["{name} wanted a look inside a guest's room.", "{name} was paid to copy it."] },
      { title: "The Harbor Master's Telescope", setup: "The old brass telescope was taken from the harbor master's office window.",
        motives: ["{name} wanted to watch who came and went at night.", "{name} knew an antiques dealer who'd pay well for it."] },
      { title: "The Paperless Crate", setup: "A crate of rare whisky left the docks overnight without a single paper.",
        motives: ["{name} was paid a week's wages to look the other way.", "{name} had a buyer waiting in the city."] },
      { title: "The Splashed Gallery", setup: "Someone threw red paint over three seascapes in the harbor gallery.",
        motives: ["One of the paintings showed {name}'s boat in a bad light.", "{name} lost the gallery's summer show to the painter."] },
      { title: "The Missing Logbook", setup: "The harbor logbook, with every boat that came in last week, disappeared.",
        motives: ["The logbook showed {name}'s boat coming in at a very odd hour.", "{name} was hiding a late-night trip to Gull Rock."] },
      { title: "The Drifting Lifeboat", setup: "Someone untied the harbor lifeboat, and it drifted out to sea.",
        motives: ["{name} wanted the lifeboat crew busy and far away for one night.", "{name} was angry at being dropped from the crew."] },
      { title: "The Broken Radio Mast", setup: "The radio mast on the harbor office roof was snapped in half.",
        motives: ["{name} didn't want a certain message reaching the coast guard.", "{name} wanted the job of fixing it."] },
      { title: "The Vanished Lobsters", setup: "Forty kilos of fresh lobster disappeared from the cold store.",
        motives: ["{name} had a restaurant in the city waiting for them.", "{name} wanted to ruin a rival's big order."] },
      { title: "The Ship in a Bottle", setup: "The famous ship in a bottle vanished from the shelf of the Anchor pub.",
        motives: ["{name} had wanted it since they were a child.", "{name} lost it to the landlord in a card game and wanted it back."] },
      { title: "The Swapped Sea Chart", setup: "An old sea chart at the Maritime Museum was swapped for a copy.",
        motives: ["The chart marked a wreck {name} meant to dive on alone.", "{name} had a buyer for the original."] },
      { title: "The Boatyard Part", setup: "A new engine part vanished from the boatyard the night before a big repair.",
        motives: ["{name} wanted the repair job to fail.", "{name} needed the part for their own boat and couldn't pay for it."] },
      { title: "The Wren's Bell", setup: "The old ship's bell was taken from its post outside the harbor office.",
        motives: ["{name} wanted to sell it to a collector.", "{name} said the bell had been stolen from their grandfather years ago."] },
      { title: "The Charity Tin", at: "day", setup: "The lifeboat charity tin on the Anchor pub's bar was found empty.",
        motives: ["{name} needed money fast and thought nobody would notice.", "{name} wanted the lifeboat appeal to fail."] },
      { title: "The Painted Ferry", setup: "Someone painted a rude word across the hull of the ferry overnight.",
        motives: ["{name} was fired from the ferry crew last month.", "{name} lost a shouting match with the captain."] }
    ],
    facts: [
      { id: "foghorn", at: "night", groups: ["noise"], tier: 2, clue: "The foghorn sounded once a minute from 8 PM until 2 AM.",
        truths: ["That foghorn kept me awake half the night.", "I slept with a pillow over my head because of the foghorn."],
        lies: [{ say: "It was a silent night. I didn't hear a single sound after nine.", why: "The foghorn sounded every minute from 8 PM to 2 AM, so the night was anything but silent." },
          { say: "I sat on my balcony at eleven and enjoyed the perfect quiet.", why: "At eleven the foghorn was still sounding every minute. There was no perfect quiet." }] },
      { id: "lighthousedark", at: "night", groups: ["lighthouse"], tier: 1, clue: "The lighthouse lamp was switched off for repairs all night.",
        truths: ["With the lighthouse dark, I kept my boat in the harbor.", "It felt strange to see no beam over the bay."],
        lies: [{ say: "From my window I watched the lighthouse beam sweep across the bay.", why: "The lighthouse lamp was off for repairs all night, so there was no beam to watch." },
          { say: "I steered home by the lighthouse beam, like I always do.", why: "The lighthouse was dark all night. Nobody steered home by its beam." }] },
      { id: "noferry", at: "day", groups: ["ferry"], tier: 1, clue: "No ferries ran yesterday because of the storm warning.",
        truths: ["With no ferry, I spent the day on the mainland.", "I had to call off my trip to Gull Rock."],
        lies: [{ say: "I took the ferry to Gull Rock yesterday to see my sister.", why: "No ferries ran yesterday, so nobody took one to Gull Rock." },
          { say: "The ferry was so packed yesterday that I had to stand on deck.", why: "There were no ferries at all yesterday because of the storm warning." },
          { say: "I bought a coffee on the noon ferry yesterday.", why: "No ferries ran yesterday, so there was no noon ferry to buy a coffee on." }] },
      { id: "hotellift", groups: ["lift"], tier: 1, clue: "The Harbor Hotel's only lift has been broken since Friday.",
        truths: ["I carried my suitcase up five flights of stairs at the hotel.", "The stairs in that hotel nearly finished me off."],
        lies: [{ say: "I took the hotel lift up to the fifth floor with my suitcase.", why: "The hotel's only lift has been broken since Friday, so nobody rode it to the fifth floor." },
          { say: "I bumped into the manager in the hotel lift on my way down to breakfast.", why: "The hotel's only lift was broken, so nobody met anyone in it on the way to breakfast." }] },
      { id: "pierlamps", at: "night", groups: ["pierlight"], tier: 1, clue: "Every lamp on the pier was broken last night.",
        truths: ["I walked the pier by the light of my phone.", "I tripped over a rope on the dark pier."],
        lies: [{ say: "I read the ferry timetable under the pier lamps at ten.", why: "Every lamp on the pier was broken, so there was no lamp to read by." },
          { say: "The pier was so well lit that I could see every face clearly.", why: "All the pier lamps were broken last night. The pier was dark." }] },
      { id: "anchorcash", groups: ["card"], tier: 1, clue: "The Anchor pub's card machine has been broken all week. Cash only.",
        truths: ["I had to borrow coins to pay for my drink at the Anchor.", "I ran to the cash machine before I could order at the Anchor."],
        lies: [{ say: "I paid for a round at the Anchor with my card.", why: "The Anchor's card machine was broken all week, so nobody paid there by card." },
          { say: "I tapped my phone to pay for my fish pie at the Anchor.", why: "The Anchor has been cash only all week. Nobody paid by phone." }] },
      { id: "boatyardchain", at: "night", groups: ["boatyard"], tier: 2, clue: "The boatyard gate was chained shut at 6 PM and stayed shut all night.",
        truths: ["I couldn't get to my boat after six. The gate was chained.", "I left the boatyard at five, well before they chained the gate."],
        near: ["I slipped out of the boatyard at five to six, just before the chain went on."],
        lies: [{ say: "At eight I let myself into the boatyard to check on my boat.", why: "The boatyard gate was chained shut from 6 PM, so nobody walked in at eight." },
          { say: "I worked on my engine in the boatyard until nine.", why: "The gate was chained from 6 PM. Nobody was working in the boatyard at nine." }] },
      { id: "radiodown", at: "night", groups: ["radio"], tier: 2, clue: "The harbor radio was down from 7 PM until morning.",
        truths: ["I tried the harbor radio at eight. Nothing but crackle.", "With the radio down, I watched the harbor mouth myself."],
        lies: [{ say: "I radioed the harbor master at nine to say I was coming in.", why: "The harbor radio was down from 7 PM until morning, so no call got through at nine." },
          { say: "I listened to the harbor radio chatter all evening while I mended my nets.", why: "The harbor radio was down from 7 PM. There was no chatter to listen to." }] },
      { id: "gullsignal", groups: ["signal"], tier: 2, clue: "There is no phone signal anywhere on Gull Rock.",
        truths: ["On Gull Rock my phone is just a torch.", "I read my messages once the ferry got back to the mainland."],
        lies: [{ say: "I called my wife from Gull Rock to say goodnight.", why: "There's no phone signal on Gull Rock, so no call went out from there." },
          { say: "I posted photos from Gull Rock all evening.", why: "Gull Rock has no phone signal. Nothing was posted from there." }] },
      { id: "wetrail", at: "night", groups: ["paint"], tier: 2, clue: "The pier railing was painted yesterday afternoon. The paint was still wet at night, and there isn't a mark on it.",
        truths: ["I kept well away from that wet railing.", "I saw the wet paint signs on the pier and kept to the middle."],
        lies: [{ say: "I leaned on the pier railing for ten minutes to watch the boats.", why: "The railing was still wet and there isn't a mark on it. Ten minutes of leaning would have left a smudge." }] },
      { id: "gale", at: "night", groups: ["sky"], tier: 1, clue: "A gale blew all evening. Gusts knocked people off their feet on the pier.",
        truths: ["I could barely stand up on the pier in that wind.", "The wind tore my umbrella inside out."],
        lies: [{ say: "It was such a calm evening. The sea was like glass.", why: "A gale blew all evening, so the sea was nothing like glass." },
          { say: "I lit a candle on my table outside the café. It burned all evening.", why: "A gale blew all evening. No candle stays lit outdoors in that wind." }] },
      { id: "clouds", at: "night", groups: ["sky"], tier: 1, clue: "Thick clouds hid the moon and the stars all night.",
        truths: ["It was so dark that I walked into a bollard.", "I couldn't see a single star from the beach."],
        lies: [{ say: "The full moon was so bright that I didn't need a torch.", why: "Thick clouds hid the moon all night, so there was no bright moonlight." },
          { say: "I lay on the deck of my boat and counted the stars.", why: "Clouds hid every star all night. There was nothing to count." }] },
      { id: "whistle", at: "day", groups: ["whistle"], tier: 2, clue: "The cannery whistle is broken. It hasn't sounded all week.",
        truths: ["Without the whistle, we watch the clock to know when to stop.", "It's odd working at the cannery with no whistle."],
        lies: [{ say: "I put my tools down when the cannery whistle blew at six.", why: "The cannery whistle is broken and hasn't sounded all week." }] },
      { id: "lowtide", at: "day", groups: ["tide"], tier: 2, clue: "The harbor was at low tide all afternoon. Every boat sat on the mud.",
        truths: ["My boat sat on the mud all afternoon. I couldn't go anywhere.", "I waited all afternoon for the tide to come back in."],
        lies: [{ say: "I sailed out of the harbor at three for a quick trip round the bay.", why: "Every boat sat on the mud all afternoon at low tide. Nobody sailed out at three." }] },
      { id: "crabsold", at: "day", groups: ["market"], tier: 2, clue: "The fish market sold its last crab at 6:45 AM.",
        truths: ["I got to the fish market at eight. No crab left.", "I wanted crab for lunch, but the market had sold out."],
        near: ["I bought the very last crab at the fish market at twenty to seven."],
        lies: [{ say: "I bought two crabs at the fish market at eight for lunch.", why: "The market sold its last crab at 6:45 AM, so there was none left at eight." }] },
      { id: "kitchennine", at: "night", groups: ["kitchen"], tier: 2, clue: "The Harbor Hotel kitchen closed at 9 PM sharp.",
        truths: ["The kitchen was closed, so I ate crisps from the minibar.", "I asked for soup at half past nine, but the kitchen had closed."],
        near: ["I got the last bowl of soup from the hotel kitchen at ten to nine."],
        lies: [{ say: "I ordered a hot dinner from the hotel kitchen at ten.", why: "The hotel kitchen closed at 9 PM, so nobody got a hot dinner from it at ten." }] },
      { id: "museumshut", at: "day", groups: ["museum", "weekday"], tier: 1, clue: "The Maritime Museum has been closed all week for repairs.",
        truths: ["We wanted to see the ship models, but the museum was shut.", "There were builders' vans outside the Maritime Museum all week."],
        lies: [{ say: "I showed my nephew the ship models in the Maritime Museum yesterday.", why: "The Maritime Museum has been closed all week, so nobody saw the ship models yesterday." }] },
      { id: "clubcold", at: "night", groups: ["temp"], tier: 1, clue: "The yacht club's heating broke. It was 4°C inside all evening.",
        truths: ["I kept my coat and hat on at the yacht club all evening.", "My tea went cold in two minutes at the club."],
        lies: [{ say: "The yacht club was so warm that I sat there in a T-shirt.", why: "The club's heating was broken and it was 4°C inside. Nobody sat there in a T-shirt." }] },
      { id: "barshut", groups: ["bar"], tier: 1, clue: "The yacht club bar has been closed all week while it's repainted.",
        truths: ["I fancied a drink at the club, but the bar was under dust sheets."],
        lies: [{ say: "I had a glass of wine at the yacht club bar on Tuesday.", why: "The club bar has been closed all week, so nobody had a drink there on Tuesday." }] },
      { id: "regattaoff", at: "day", groups: ["regatta"], tier: 1, clue: "Saturday's regatta was cancelled because of the storm.",
        truths: ["I was meant to race on Saturday, but the regatta was called off.", "I spent Saturday at home instead of at the regatta."],
        lies: [{ say: "I watched the regatta boats race past the lighthouse on Saturday.", why: "The regatta was cancelled. No boats raced past the lighthouse on Saturday." }] },
      { id: "postnoon", at: "day", groups: ["post"], tier: 2, clue: "The harbor post office closes at noon on Saturdays.",
        truths: ["I got to the post office at two on Saturday and it was shut."],
        near: ["I posted my parcel at a quarter to twelve on Saturday, just in time."],
        lies: [{ say: "I posted a parcel at the harbor post office on Saturday afternoon.", why: "The post office closes at noon on Saturdays, so nobody posted anything there in the afternoon." }] },
      { id: "gatecam", at: "night", groups: ["camera"], tier: 1, clue: "The camera at the harbor gate was switched off for repairs all night.",
        truths: ["The repair man was still up his ladder at the gate when I left.", "There's no gate footage from last night."],
        lies: [{ say: "I watched last night's gate footage. You can see the thief clearly.", why: "The gate camera was switched off all night, so there's no footage of anyone." }] },
      { id: "dinghy", groups: ["dinghy"], tier: 1, clue: "The harbor's only rowing boat has had a hole in it all week.",
        truths: ["I wanted to row out to my boat, but the dinghy had a hole in it."],
        lies: [{ say: "I rowed the harbor dinghy out to the buoys on Thursday.", why: "The harbor's only rowing boat had a hole in it all week. Nobody rowed it anywhere." }] },
      { id: "nightferry", at: "night", groups: ["ferry"], tier: 2, make: function (r, h) {
        var T = h.pick([21 * 60 + 30, 22 * 60, 22 * 60 + 30], r), late = T + h.pick([30, 45], r);
        return { clue: "The night ferry to Gull Rock left at " + h.clock(T) + ". It was the last one.",
          truths: ["I watched the night ferry pull out at " + h.clock(T) + "."],
          near: ["I jumped on the night ferry a minute before it left."],
          lies: [{ say: "I caught the " + h.clock(late) + " ferry to Gull Rock.", why: "The " + h.clock(T) + " night ferry was the last one, so there was no " + h.clock(late) + " ferry." }] };
      } },
      { id: "cafeopen", at: "day", groups: ["cafe"], tier: 2, make: function (r, h) {
        var H = h.pick([7 * 60, 7 * 60 + 30, 8 * 60], r), early = H - h.pick([30, 40, 45], r);
        return { clue: "Sadie's Café on the quay opens at " + h.clock(H) + ", never earlier.",
          truths: ["I waited outside Sadie's Café until it opened at " + h.clock(H) + "."],
          near: ["I was first in line when Sadie's Café opened at " + h.clock(H) + "."],
          lies: [{ say: "I had breakfast at Sadie's Café at " + h.clock(early) + ".", why: "Sadie's Café never opens before " + h.clock(H) + ", so nobody had breakfast there at " + h.clock(early) + "." }] };
      } }
    ],
    combos: [
      { id: "ferrywalk", at: "night", groups: ["ferry", "distance"], make: function (r, h) {
        var from = h.pick(["the fish market", "the Harbor Hotel", "the cannery", "the boatyard"], r);
        var d = h.pick([15, 20, 25, 30], r), T = h.pick([21 * 60 + 40, 22 * 60, 22 * 60 + 15], r);
        var late = T - d + h.pick([10, 15], r), ok = T - d - h.pick([10, 15], r);
        return { clues: [h.cap(from) + " is a " + d + "-minute walk from the ferry pier.", "The last ferry left the pier at " + h.clock(T) + " sharp."],
          truths: ["I left " + from + " at " + h.clock(ok) + " and walked to the pier. I made the last ferry with time to spare."],
          lies: [{ say: "I left " + from + " at " + h.clock(late) + ", walked to the pier and still caught the last ferry.",
            why: "It's a " + d + "-minute walk, so leaving at " + h.clock(late) + " gets you to the pier at " + h.clock(late + d) + ". The last ferry had gone at " + h.clock(T) + "." }] };
      } },
      { id: "filmtime", at: "night", groups: ["cinema"], make: function (r, h) {
        var film = "“" + h.pick(["Deep Water", "The Lantern Keeper", "Salt and Smoke", "Port of Shadows", "The Last Tide"], r) + "”";
        var S = h.pick([18 * 60 + 30, 19 * 60, 19 * 60 + 15, 20 * 60], r), L = h.pick([105, 120, 135], r), E = S + L, early = E - h.pick([25, 35, 45], r);
        return { clues: ["The Regal showed " + film + " once last night, starting at " + h.clock(S) + ".", film + " runs for " + h.dur(L) + "."],
          truths: ["I watched " + film + " at the Regal to the very end and came out at " + h.clock(E + 5) + "."],
          lies: [{ say: "I watched all of " + film + " at the Regal and was outside by " + h.clock(early) + ".",
            why: film + " started at " + h.clock(S) + " and runs " + h.dur(L) + ", so it ended at " + h.clock(E) + ". Nobody saw all of it and got out by " + h.clock(early) + "." }] };
      } },
      { id: "shutday", at: "day", groups: ["weekday"], make: function (r, h) {
        var day = h.pick(["Monday", "Tuesday", "Wednesday", "Thursday"], r);
        var p = h.pick([["the Anchor pub's kitchen", "a fish pie"], ["the chandlery", "a new rope"], ["the bakery on the quay", "a loaf of bread"], ["the bait shop", "a box of bait"]], r);
        return { clues: [h.cap(p[0]) + " is closed every " + day + ".", "Yesterday was " + day + "."],
          truths: ["I went to " + p[0] + " yesterday for " + p[1] + ", but it was shut."],
          lies: [{ say: "I got " + p[1] + " at " + p[0] + " yesterday afternoon.",
            why: "Yesterday was " + day + ", and " + p[0] + " is closed every " + day + ". Nobody got anything there." }] };
      } },
      { id: "onlykey", at: "night", groups: ["keys"], make: function (r, h, ctx) {
        var n = ctx.npc, room = h.pick(["the cold store", "the harbor office safe room", "the museum stores", "the boatyard paint shed"], r);
        var a = h.pick([19 * 60, 19 * 60 + 30, 20 * 60], r), b = a + h.pick([120, 150, 180], r), t = a + h.pick([45, 60, 75], r);
        return { clues: ["Only " + n.name + ", the " + n.role.toLowerCase() + ", has a key to " + room + ".", n.name + " was at the town council meeting from " + h.clock(a) + " to " + h.clock(b) + "."],
          truths: ["I waited by " + room + " until " + n.name + " came back from the council meeting."],
          lies: [{ say: n.name + " unlocked " + room + " for me at " + h.clock(t) + ".",
            why: n.name + " has the only key and was at the council meeting from " + h.clock(a) + " to " + h.clock(b) + ", so nobody unlocked " + room + " at " + h.clock(t) + "." }] };
      } },
      { id: "powercut", at: "night", groups: ["power"], make: function (r, h) {
        var a = h.pick([19 * 60 + 30, 20 * 60, 20 * 60 + 30], r), b = a + h.pick([90, 120, 150], r), t = a + h.pick([30, 45, 60], r);
        return { clues: ["The power went out along the whole quay at " + h.clock(a) + ".", "The power on the quay came back on at " + h.clock(b) + "."],
          truths: ["I read by candlelight until the lights on the quay came back at " + h.clock(b) + "."],
          lies: [{ say: "At " + h.clock(t) + " I was watching the football on TV in my flat on the quay.",
            why: "The power on the quay was out from " + h.clock(a) + " to " + h.clock(b) + ", so no TV there was on at " + h.clock(t) + "." }] };
      } },
      { id: "causeway", at: "night", groups: ["tide"], make: function (r, h) {
        var T = h.pick([20 * 60 + 30, 21 * 60, 21 * 60 + 30, 22 * 60], r), t = T - h.pick([20, 30, 40], r);
        return { clues: ["High tide last night was at " + h.clock(T) + ".", "The causeway to Gull Rock is under water from an hour before high tide until an hour after."],
          truths: ["I waited on Gull Rock until the causeway was clear again, just after " + h.clock(T + 60) + "."],
          lies: [{ say: "I walked back over the causeway from Gull Rock at " + h.clock(t) + ".",
            why: "High tide was at " + h.clock(T) + ", so the causeway was under water from " + h.clock(T - 60) + " to " + h.clock(T + 60) + ". Nobody walked over it at " + h.clock(t) + "." }] };
      } },
      { id: "swingbridge", at: "night", groups: ["bridge"], make: function (r, h) {
        var a = h.pick([20 * 60, 20 * 60 + 30, 21 * 60], r), b = a + h.pick([40, 60], r), t = a + h.pick([15, 20, 25], r);
        return { clues: ["When the swing bridge opens to let boats through, the road over it is closed.", "Last night the swing bridge was open from " + h.clock(a) + " to " + h.clock(b) + "."],
          truths: ["I sat in my car at the swing bridge until it closed again at " + h.clock(b) + "."],
          lies: [{ say: "I drove over the swing bridge at " + h.clock(t) + " on my way home.",
            why: "The swing bridge was open for boats from " + h.clock(a) + " to " + h.clock(b) + ", and the road is closed while it's open. Nobody drove over it at " + h.clock(t) + "." }] };
      } },
      { id: "frost", at: "night", groups: ["frost", "sky"], make: function (r, h) {
        var t = h.pick([21 * 60, 21 * 60 + 30, 22 * 60], r);
        return { clues: ["Frost covered the yacht club's wooden deck from " + h.clock(t) + " until morning.", "In the morning there wasn't a single footprint in the frost on the deck."],
          truths: ["I crossed the yacht club deck at " + h.clock(t - 60) + ", well before the frost."],
          lies: [{ say: "I crossed the yacht club deck at " + h.clock(t + h.pick([30, 60, 90], r)) + " to check my boat.",
            why: "The deck was frosted over from " + h.clock(t) + ", and there wasn't one footprint in the frost. Nobody crossed it after " + h.clock(t) + "." }] };
      } },
      { id: "rocco", at: "night", groups: ["dog"], make: function () {
        return { clues: ["Rocco, the boatyard dog, barks at every stranger.", "Rocco didn't bark once last night."],
          truths: ["Rocco knows me. He just wagged his tail when I came in."],
          lies: [{ say: "I'd never met Rocco before, but I walked right past him at midnight.",
            why: "Rocco barks at every stranger, and he didn't bark once all night. A stranger walking past him at midnight would have set him off." }] };
      } },
      { id: "childfare", groups: ["tickets"], make: function (r, h) {
        var p = h.pick([6, 8, 10, 12], r), right = 2 * p, wrong = right + h.pick([3, 4, 5], r) * (r() < 0.5 ? 1 : -1);
        return { clues: ["A ferry ticket to Gull Rock costs $" + p + ".", "Children under 12 ride the ferry for half price."],
          truths: ["I paid $" + right + " for me and my two little ones."],
          lies: [{ say: "I paid $" + wrong + " for me and my two kids, aged 6 and 9.",
            why: "One adult at $" + p + " and two children at $" + p / 2 + " each comes to $" + right + ", not $" + wrong + "." }] };
      } },
      { id: "crossing", at: "night", groups: ["ferry"], make: function (r, h) {
        var t = h.pick([19 * 60, 19 * 60 + 30, 20 * 60, 20 * 60 + 30], r), d = h.pick([35, 40, 50], r), early = t + d - h.pick([15, 20], r);
        return { clues: ["The last boat from Gull Rock left at " + h.clock(t) + ".", "The crossing from Gull Rock to Port Ellery takes " + d + " minutes."],
          truths: ["I came back on the " + h.clock(t) + " boat from Gull Rock and was on the quay at " + h.clock(t + d) + "."],
          lies: [{ say: "I came back on the last boat from Gull Rock and was in the Anchor by " + h.clock(early) + ".",
            why: "The last boat left Gull Rock at " + h.clock(t) + " and the crossing takes " + d + " minutes, so it didn't land until " + h.clock(t + d) + ". Nobody on it was in the Anchor by " + h.clock(early) + "." }] };
      } }
    ],
    // Built-in facts: a few more lies each, so the same line doesn't keep coming back.
    more: {
      rain: [{ say: "I spent the evening on a park bench reading a paperback. Not a drop on me.", why: "It rained hard all evening, from 6 PM to midnight. Nobody read on a park bench and stayed dry." },
        { say: "I hung my washing on the line at seven, and it was dry by nine.", why: "It rained hard from 6 PM to midnight, so no washing dried outside that evening." }],
      fog: [{ say: "From the beach I could see every boat in the bay.", why: "The fog was so thick you couldn't see five meters, so nobody saw the boats in the bay." }],
      streetlights: [{ say: "I took a photo of the sunset's afterglow under the bright Lake Road lamps.", why: "Every street light on Lake Road was broken last night." }],
      blackout: [{ say: "I spent the evening charging my phone and playing video games at home.", why: "There was no power in the building from 8 to 11 PM, so no games and no charging." }],
      elevator: [{ say: "I rode the elevator up and down twice to carry my shopping.", why: "The elevator has been out of order all week, so nobody rode it." }],
      internet: [{ say: "I had a video call with my mum from home all evening.", why: "The internet was down in the whole neighborhood all evening, so no video call worked from home." }],
      train: [{ say: "I was on the 10:30 PM train, reading my book.", why: "No trains ran after 9:15 PM, so there was no 10:30 train." }],
      bus: [{ say: "I caught the bus to the shops yesterday afternoon.", why: "There were no buses at all yesterday because of the strike." }],
      bridge: [{ say: "I cycled over the Old Bridge at eleven to get home faster.", why: "The Old Bridge was closed all night for repairs. Nobody cycled over it." }],
      card: [{ say: "I tapped my phone to pay for a round at the bar.", why: "The bar's card machine was broken all night. It was cash only." }],
      pool: [{ say: "I did my morning laps in the pool before work, like every day this week.", why: "The pool has been empty for cleaning all week, so nobody swam laps in it." }],
      dog: [{ say: "Bruno barked his head off at a stranger by the bins around eleven.", why: "Bruno didn't bark once all night." }],
      water: [{ say: "I ran a hot bath at nine to warm up.", why: "The water in the building was off from 6 PM to 6 AM, so nobody ran a bath at nine." }],
      gas: [{ say: "I fried eggs on my gas hob for dinner.", why: "The gas in the building was shut off all day, so nothing was fried on a gas hob." }],
      roof: [{ say: "I watered the plants up on the roof last night.", why: "The roof door is always locked, and the only key is in the caretaker's safe." }],
      coffee: [{ say: "The office coffee machine made me a perfect cappuccino this morning.", why: "The office coffee machine has been broken all week." }],
      parkgates: [{ say: "I jogged the lake path inside the park at ten last night.", why: "The park gates are locked every night at 8 PM, so nobody was jogging inside the park at ten." },
        { say: "I fed the ducks at the park pond at nine last night.", why: "The park gates are locked at 8 PM, so nobody was at the pond inside the park at nine." }],
      snacks: [{ say: "I got a bag of crisps from the lobby snack machine this morning.", why: "The snack machine in the lobby has been empty all week." }],
      school: [{ say: "I picked my daughter up from school at three yesterday.", why: "All schools in town were closed yesterday, so there was no school pick-up." }],
      ink: [{ say: "I printed my boarding pass on the office printer yesterday.", why: "The office printer has been out of ink all week, so it printed nothing." }]
    },
    // ambiguous: you can jog around the outside of a locked park
    drop: ["I jogged around the park at ten last night."],
    // it can't be 36°C outside while the yacht club is 4°C inside with broken heating
    regroup: { heat: ["sky", "temp"] }
  }
];
