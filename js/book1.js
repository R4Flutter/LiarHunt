/*
  LIARHUNT — Career, Book 1: The Black Ledger
  ---------------------------------------------
  The story data. js/book.js plays it. Run `node tools/check-book.mjs` after any edit: it checks that every
  mission can be solved, that evidence is found before it's needed, and that released answers never change.

  What really happened (every clue and lie must agree with this):
  - Helen Marsh, senior partner at the audit firm Ashford & Lane (40 Mercer Street), is "B", the Broker. For years
    her firm's audits passed three fake companies (Greyfield, Northgate, Kestrel, all owned by Mercer Holdings).
    Blackstone Holdings (Adrian Cole) pays fake steel bills into them; the money bribes officials, and 10% goes to B.
  - 1 March: June Park buys three prepaid phones for Helen: 0148 (Helen), 0149 (given to Silas), 0150 (to Marcus).
    3 March: Kestrel pays off the debts of agent Marcus Reed. He becomes her inside man.
  - Mon 3 to Wed 5 March: Daniel Cross audits Blackstone and finds the ledger of payments. Wed 5 March he tells Helen
    and emails the audit mailbox (read by Helen, June and Cal Brooks).
  - Thu 6 March: 6:30 PM Helen threatens Daniel from 0148. 7:10 PM Daniel warns his sister Sara. 8:52 PM he leaves
    with a copy of the ledger, by taxi to the bus station, and takes the 9:20 PM north bus to his late grandfather's
    cabin at Pinewood Lake. 9:30 PM Silas Crane (Blackstone security) parks Kestrel van KL-2207 outside, picks the
    lock, searches the flat, knocks a watch over at 9:41 and leaves at 9:55 with Daniel's wiped work laptop.
    Meanwhile Silas pays Owen Pike's dinner at the Corner Grill (9:15) to set him up as a witness; Greyfield pays
    Owen $2,000 at 9:45.
  - Sat 8 March: 7:45 AM Helen (0148) gives Owen his false train story. 8:02 Owen calls the tip line. 9:00 Helen
    reports Daniel missing, writing that his laptop is "missing" (she had never been inside the flat). She wants
    the agency to find Daniel and the ledger for her.
  - Tue 11 March: during a 6:15 meeting Marcus copies Evelyn's keycard from her bag (7:02). While Helen keeps Evelyn
    at dinner, Marcus uses the copy at 9:08 to copy the raid plan (9:12). At 2:14 AM he edits a lobby photo to frame
    Evelyn. Fri 14 March: Greyfield is warned and cleared before the 6 AM raid.
*/
window.WL_BOOK1 = {
  id: "b1",
  title: "The Black Ledger",
  tagline: "A missing analyst, a hidden network and someone inside the agency. 30 missions, one conspiracy.",

  people: {
    evelyn: { name: "Evelyn Shaw", role: "Head of the agency", notes: [[0, "Your boss. She gave you the Cross case."], [20, "Her keycard was used the night the raid plan was copied."], [22, "Hid a dinner with her old friend Helen Marsh."], [23, "Cleared: at dinner all evening. Her card was copied while her bag sat alone."]] },
    nia: { name: "Nia Carter", role: "Forensic analyst", notes: [[0, "Forensics. She notices everything."], [23, "Cleared: she never left the lab."]] },
    marcus: { name: "Marcus Reed", role: "Your partner", notes: [[0, "Your partner. Always short of money."], [12, "Turned up in a new car. 'Lucky at cards.'"], [24, "The inside man. Paid by Kestrel, working for a woman he never met."]] },
    daniel: { name: "Daniel Cross", role: "Missing analyst, Ashford & Lane", notes: [[0, "Missing since Thursday 6 March."], [8, "Left town on the 9:20 PM north bus."], [27, "Found alive at Pinewood Lake."]] },
    helen: { name: "Helen Marsh", role: "Senior partner, Ashford & Lane", notes: [[0, "Daniel's boss. She reported him missing."], [22, "An old friend of Evelyn's."], [29, "Got all three prepaid phones from June."], [30, "B, the Broker. Under arrest."]] },
    sara: { name: "Sara Cross", role: "Daniel's sister", notes: [[0, "The last person Daniel called."], [26, "Got a postcard from Pinewood Lake."]] },
    alma: { name: "Alma Bell", role: "Neighbor, Flat 4B", notes: [[0, "Lives next door to Daniel."]] },
    silas: { name: "Silas Crane", role: "Head of security, Blackstone", notes: [[0, "Blackstone's head of security."], [6, "Searched Daniel's flat. Blackstone's lawyer had him out within the hour."]] },
    bale: { name: "Tom Bale", role: "Driver, Kestrel Logistics", notes: [] },
    owen: { name: "Owen Pike", role: "Taxi driver", notes: [[0, "Says he saw Daniel get on a train."], [11, "Paid $2,000 to lie."]] },
    bill: { name: "Bill Hanley", role: "Taxi driver, City Taxis", notes: [[0, "Drove Daniel to the bus station."]] },
    mina: { name: "Mina Sol", role: "Ticket clerk, bus station", notes: [[0, "Sold Daniel his bus ticket."]] },
    adrian: { name: "Adrian Cole", role: "Chief executive, Blackstone", notes: [[0, "Runs Blackstone Holdings."], [18, "Runs the money side. Answers to someone."], [25, "Turned informant."]] },
    holt: { name: "Grant Holt", role: "City planning board", notes: [[0, "Took $5,000 for 'advice'."]] },
    finch: { name: "Roy Finch", role: "Company director on paper", notes: [[0, "79. Signs papers for anyone who pays."]] },
    ray: { name: "Ray Duffy", role: "Records clerk", notes: [[0, "Runs the evidence room."], [23, "Cleared: at the records desk, on camera."]] },
    june: { name: "June Park", role: "Helen Marsh's assistant", notes: [[0, "Helen's assistant."], [29, "Bought the prepaid phones for Helen."]] },
    mead: { name: "Harold Mead", role: "Retired partner, Ashford & Lane", notes: [[0, "The other partner who signs as H.M."], [29, "Cleared: in hospital since January."]] },
    cal: { name: "Cal Brooks", role: "IT manager, Ashford & Lane", notes: [[0, "Can read the audit team's mailbox."], [29, "Cleared: in Singapore all month."]] },
    blackstone: { name: "Blackstone Holdings", role: "Building company", org: "🏗️", notes: [[0, "The company Daniel was auditing."]] }
  },

  /* [icon, name, text]. The dossier shows them in the order they're found. */
  evidence: {
    report: ["📄", "Helen's report", "Missing-person report, Sat 8 March, 9:00 AM, from Helen Marsh, Ashford & Lane, 40 Mercer Street: 'Daniel hasn't been at work since Thursday, and his work laptop is missing. I knocked on his door on Friday evening. No answer.'"],
    doorcam: ["📹", "Door camera", "Building door camera, Thu 6 March, 8:52 PM: Daniel leaves with a small sports bag. His brown leather laptop bag isn't with him."],
    packed: ["🧳", "Packed and gone", "Daniel's toothbrush and sports bag are gone, and he emptied his fridge. He packed and left on his own."],
    boot: ["👢", "Boot print", "A muddy boot print by Daniel's desk, size 44. All of Daniel's shoes are size 41."],
    watch: ["⌚", "Broken watch", "A watch knocked off the shelf in Daniel's flat. The glass is smashed and it stopped at 9:41."],
    searched: ["🗄️", "Searched desk", "Every desk drawer pulled out and the papers thrown everywhere, but $300 in the kitchen jar left untouched."],
    greycoat: ["🧥", "Man in a grey coat", "Alma Bell, Flat 4B: at 9:55 PM a man in a grey coat came out of Daniel's flat carrying a brown leather laptop bag."],
    phonelog: ["📞", "Daniel's phone record", "Thu 6 March, 6:30 PM: a 2-minute call from 0770-555-0148, a prepaid phone. Alma heard Daniel shout: 'How do you know about the files?' 7:10 PM: a 1-minute call to his sister Sara."],
    van: ["🚐", "Grey van", "A neighbor's dashcam: grey van KL-2207 parked outside Daniel's building from 9:30 to 10:00 PM on Thursday."],
    saraquote: ["💬", "Daniel's warning", "Daniel to his sister, Thu 7:10 PM: 'I'm going away for a while. Don't trust anyone at my work. Not even the ones who seem to help.'"],
    vanlog: ["📋", "Kestrel van log", "Kestrel Logistics, Dock Road: van KL-2207 was signed out by S. Crane on Thursday from 9:00 to 10:30 PM."],
    silas: ["🪪", "Silas Crane", "Head of security at Blackstone Holdings, the company Daniel was auditing. He wears size 44 boots and had van KL-2207 that night."],
    trainboard: ["🚆", "Station board", "Central Station, Thu 6 March: the last train to the coast left at 9:30 PM. No trains after that."],
    tiplog: ["☎️", "Tip-line log", "Owen called our tip line at 8:02 AM on Saturday: before Helen's report (9:00) and two hours before Daniel's photo went public (10:00)."],
    taxi: ["🚕", "Taxi driver", "Bill Hanley, City Taxis: 'Thursday at 8:55 PM I picked up a man with a sports bag on Daniel's street and dropped him at the bus station at 9:05. He paid cash.'"],
    clerk: ["🎫", "Ticket clerk", "Mina Sol, bus station: 'At 9:10 PM a man with a sports bag paid cash for an open ticket on the north line, good for any stop.'"],
    busticket: ["🚌", "Bus ticket", "The 9:20 PM north-line bus: one open ticket, any stop, paid in cash at 9:10. Daniel left town by bus. The line has 14 stops."],
    grillphoto: ["📸", "Grill party photo", "Corner Grill party photo, posted Thu 9:15 PM: Owen sits at the back with a man in a grey coat. A Blackstone security badge hangs from the man's belt."],
    taxiapp: ["📱", "Owen's taxi app", "Owen's taxi app, Thursday: offline from 8:30 PM. Back online at 9:58 PM, picks up a fare outside the Corner Grill and drives it to the airport, arriving at 10:40."],
    payment: ["💵", "Owen's $2,000", "Thu 6 March, 9:45 PM: Owen received $2,000 from Greyfield Trading. He cut it out of the copy he gave us."],
    greyfield: ["🏢", "Greyfield Trading", "Greyfield Trading is registered at 12 Dock Road, the same address as Kestrel Logistics."],
    caller: ["👤", "The woman on the phone", "Owen: on Saturday at 7:45 AM a woman phoned him with the story to tell (the train, the blonde, the coast) and told him to call our tip line at 8."],
    owencall: ["📞", "The same phone", "The woman who coached Owen called from 0770-555-0148, the same prepaid phone that threatened Daniel on Thursday."],
    clients: ["🧾", "Company records", "Greyfield Trading and Kestrel Logistics each have exactly one customer: Blackstone Holdings."],
    bribes: ["💰", "Greyfield's payments", "On 4 March Greyfield paid $5,000 to Grant Holt (city planning board) and $4,000 to Lisa Varga (port customs), both marked 'advice'."],
    northgate: ["🏭", "Northgate Supplies", "Northgate Supplies sends Blackstone bills for steel. It has no warehouse, no trucks and one phone line."],
    mercer: ["🏛️", "Mercer Holdings", "Greyfield, Northgate and Kestrel are all owned by Mercer Holdings Ltd. Who owns Mercer is hidden."],
    port: ["⚓", "Port notice", "The city port is closed every Sunday. Nothing comes in or goes out."],
    invoice: ["🧾", "Double invoice", "Northgate invoice N-0311: steel 'delivered' on Sunday 2 March, when the port was shut. Blackstone's copy says $84,000, the tax copy $48,000."],
    feeb: ["🅱️", "The 10% to B", "Mercer Holdings passes 10% of everything it gets to an account named only 'B'. B runs the network."],
    tipoff: ["☕", "Warned in time", "Greyfield's office was cleared minutes before our 6 AM raid on Friday 14 March. Only our team knew the time."],
    hmsign: ["✍️", "Signed H.M.", "Ashford & Lane passed Greyfield, Northgate and Kestrel as clean, each in one day, signed 'H.M.' Two partners have used those initials: Helen Marsh, and Harold Mead, who retired last year."],
    schedule: ["📅", "Audit schedule", "Ashford & Lane: Daniel Cross audited Blackstone at its offices from 3 to 5 March, with a meeting with Adrian Cole every day."],
    adrian1: ["🗣️", "Adrian's slip", "Adrian Cole: Daniel asked too many questions about Northgate, so Adrian passed them on 'to the people I answer to'."],
    copied: ["🖨️", "Copied at 9:12", "Tuesday 11 March, 9:12 PM: someone copied the raid plan from Daniel's case file in our evidence room and put it back upside down."],
    keylog: ["💳", "Keycard log", "Tuesday 11 March: Evelyn Shaw's keycard came into the building at 9:08 PM and left at 9:25 PM. Apart from the night guard, everyone else had gone by 9:05."],
    photo: ["🖼️", "Edited photo", "The lobby photo in our binder was edited at 2:14 AM to add a red scarf, Evelyn's trademark. The camera's own file shows no scarf."],
    receipt: ["🍷", "Harbor Club receipt", "Harbor Club, Tuesday 11 March: a table for two from 8:05 to 10:40 PM, paid by Evelyn Shaw."],
    meeting: ["🗓️", "Meeting booking", "Tuesday 11 March, 6:15 to 7:30 PM: staff meeting chaired by Evelyn Shaw. No bags or phones allowed in the room."],
    dinner: ["🍽️", "Evelyn's dinner", "On Tuesday Evelyn had dinner with Helen Marsh from 8:05 to 10:40 PM. Helen asked how the Cross case was going."],
    bagalone: ["👜", "Evelyn's bag", "During Tuesday's 6:15 meeting, Evelyn's bag, with her keycard inside, hung in her empty office."],
    hallcam: ["🎥", "Hallway camera", "Tuesday 7:02 PM: Marcus Reed walks into Evelyn's empty office with a folder and comes out at 7:06."],
    labdoor: ["🔬", "Lab door log", "Nia Carter went into the lab at 5:50 PM on Tuesday and came out at 7:45 PM. The lab has one door."],
    recdesk: ["🗃️", "Records desk", "Ray Duffy worked the records desk from 6:00 to 8:00 PM on Tuesday, in full view of the lobby camera."],
    marcuspay: ["💸", "Marcus's bank", "3 March: Kestrel Logistics paid Marcus Reed $40,000 for 'consulting'. The next day his debts were gone."],
    confession: ["🗝️", "Marcus confesses", "Marcus: a woman on prepaid phone 0770-555-0148 paid his debts, and he copied Evelyn's card for her. 'She knows Evelyn well. Evelyn trusts her completely.'"],
    silascall: ["📞", "Silas's call", "Silas Crane's prepaid phone (0770-555-0149), Thu 6 March, 10:05 PM, to Adrian Cole: 'It's not here. Only the laptop.'"],
    ledgerinfo: ["📒", "The real ledger", "Adrian: the network keeps a ledger of every payment. Daniel copied it before he ran. B sent Silas to get it back. The laptop Silas took had been wiped."],
    pinewood: ["🏕️", "Pinewood Lake", "Daniel is hiding at his late grandfather's cabin at Pinewood Lake, stop 11 on the north bus line."],
    told: ["🤫", "Who Daniel told", "On Wed 5 March Daniel told only Helen Marsh, and emailed the audit team's mailbox, which Helen, June Park and Cal Brooks can read. The threat came the next evening."],
    ledger: ["📒", "The ledger", "Three years of payments: officials, witnesses, Marcus. Every line ends 'approved B'."],
    suite9: ["📦", "Suite 9", "The ledger: every fee for B goes by courier to Suite 9, 40 Mercer Street."],
    phonebuy: ["🧾", "Phone shop receipt", "1 March: three prepaid phones, numbers 0770-555-0148, 0149 and 0150, paid with June Park's company card."],
    june: ["🗣️", "June's statement", "June Park bought the three prepaid phones for Helen Marsh and gave all three to her the same day. Helen asks for new ones every month."]
  },

  chapters: [
    { title: "The First Lead", icon: "🔎", badge: "Rookie Detective",
      intro: "First week at the agency. Evelyn Shaw drops a thin file on your desk: Daniel Cross, a financial analyst, hasn't been seen since Thursday night. His boss is worried. Find him.",
      outro: "Silas Crane works for Blackstone Holdings, the company Daniel was auditing. Daniel didn't just run away. He ran from someone." },
    { title: "The False Witness", icon: "🗣️", badge: "Junior Investigator",
      intro: "A taxi driver calls the tip line: he saw Daniel get on a train, laughing, with a woman. Case closed? Evelyn doesn't think so. Neither do you.",
      outro: "Blackstone paid for Owen's lie. But the woman who wrote his lines used the phone that threatened Daniel, and she knew Daniel would be reported missing before anyone reported it. 'Follow the money,' says Evelyn." },
    { title: "The Hidden Network", icon: "🕸️", badge: "Senior Detective",
      intro: "Follow the money, Evelyn said. Greyfield Trading pays people who should never be paid. Daniel found something big. Now you go looking for it.",
      outro: "Adrian Cole runs Blackstone's dirty money, but 10% of every dollar goes to someone called B. And Greyfield was warned minutes before our raid. Only our team knew the time." },
    { title: "The Inside Man", icon: "🐀", badge: "Elite Detective",
      intro: "Someone in this building told Greyfield we were coming. Evelyn closes her door: 'Find them. Quietly. Trust nobody.'",
      outro: "Marcus was the inside man, but he isn't B. He never saw her face. All he has is a number, 0770-555-0148, and one thing she said: Evelyn trusts her completely." },
    { title: "The Black Ledger", icon: "📒", badge: "Master Detective",
      intro: "B has cut Blackstone loose and Adrian Cole wants a deal. Somewhere out there, Daniel is still holding the proof. Find him before B does.",
      outro: "" }
  ],

  missions: [
    /* ---------- Chapter 1: The First Lead ---------- */
    { title: "The Missing Analyst", goal: "Find out if Daniel left on his own.", cast: ["helen", "marcus", "daniel"], gives: ["report", "doorcam"],
      brief: "Helen Marsh, a senior partner at the audit firm Ashford & Lane, reported her best analyst missing this morning. Daniel Cross, 34, hasn't been seen since Thursday night.\n\nYour new partner, Marcus Reed, meets you at Daniel's flat with a key from the landlord. 'People walk out on their lives all the time, rookie. Let's see if he packed.'",
      steps: [
        { type: "search", title: "Search Daniel's flat", ask: "Tap things to look closer. Mark the 3 signs that Daniel packed and left on his own.",
          items: [
            ["brush", "🪥", "Bathroom cup", "Empty. No toothbrush, and the toothpaste is gone too.", 1],
            ["ward", "🚪", "Wardrobe", "A clean gap on the top shelf, the size of a sports bag. Dust all around it.", 1],
            ["fridge", "🧊", "Fridge", "Emptied and switched off, the door propped open so it won't smell. Someone planned to be away.", 1],
            ["pass", "🛂", "Passport", "Still in the desk drawer. Wherever he went, it wasn't abroad.", 0],
            ["mug", "☕", "Coffee mug", "Half full and cold, on the table. Could be from any day.", 0],
            ["post", "✉️", "Post on the mat", "Two days of letters, unopened.", 0],
            ["plant", "🪴", "Plant", "Healthy and green. Daniel looks after his plants.", 0],
            ["tv", "📺", "TV remote", "On the sofa. Nothing odd about it.", 0]
          ],
          done: "He packed: no toothbrush, no bag, and an emptied fridge. Nobody drags a man away and then cleans out his fridge.", gives: ["packed"] },
        { type: "think", title: "Think it through", ask: "So what happened on Thursday night?", show: ["doorcam", "packed"],
          options: ["Someone took Daniel from his flat by force", "Daniel packed and left on his own, in a hurry", "Daniel never left the building"], answer: 1,
          done: "Daniel walked out with his bag at 8:52 PM. But Marcus is crouched by the front door, frowning at the lock: 'Somebody scratched this. Recently.'" }
      ],
      outro: "Daniel left on his own. But fresh scratches on his lock say somebody else came later." },

    { title: "The Second Visitor", goal: "Find the signs of a second visitor.", cast: ["nia", "marcus"],
      brief: "Nia Carter from forensics arrives with her kit and hands you a pair of gloves. 'If somebody came in after Daniel left, they left something behind. People always do.'",
      steps: [
        { type: "search", title: "Search the flat again", ask: "Mark the 4 signs that someone else was here after Daniel left.",
          items: [
            ["lock", "🔒", "Front door lock", "Fresh, bright scratches around the keyhole. Daniel had a key. Somebody else didn't.", 1],
            ["print", "👣", "Floor by the desk", "A muddy boot print, size 44.", 1],
            ["shoes", "👟", "Shoe rack", "Daniel's trainers and work shoes. Every pair is size 41.", 0],
            ["desk", "🗄️", "Desk", "Every drawer pulled out. Papers, letters and notebooks thrown all over the floor.", 1],
            ["watch", "⌚", "Watch on the floor", "Knocked off the shelf. The glass is smashed and the hands stopped at 9:41.", 1],
            ["jar", "🫙", "Kitchen jar", "$300 in cash, untouched.", 0],
            ["stand", "💻", "Laptop stand", "Empty. A cable and a clean patch in the dust.", 0],
            ["window", "🪟", "Window", "Shut and locked from the inside.", 0]
          ],
          done: "Someone picked the lock, tore the desk apart and smashed a watch, wearing boots three sizes bigger than Daniel's.", gives: ["boot", "watch", "searched"] },
        { type: "think", title: "Think it through", ask: "The visitor tore the desk apart. What were they after?", show: ["searched"],
          options: ["Money", "Daniel himself", "Papers or files"], answer: 2,
          done: "Not money: the cash jar is full. They wanted something on paper, something Daniel had. Nia bags the watch. 'Stopped at 9:41. Hold on to that.'" }
      ],
      outro: "A second visitor picked the lock and searched Daniel's papers. The broken watch says when." },

    { title: "The Last Phone Call", goal: "Find out what the neighbor heard, and who called Daniel.", cast: ["alma"],
      brief: "Alma Bell in Flat 4B has lived next to Daniel for six years. She says she heard 'all sorts' on Thursday. The phone company has also sent over Daniel's calls for that evening.",
      steps: [
        { type: "talk", who: "alma", title: "Talk to Alma Bell", ask: "Ask Alma what she heard. When something she says doesn't fit the evidence, tap it, pick the evidence and present it.",
          intro: "Come in, come in. Poor Daniel. Such a quiet young man.",
          qs: [
            { id: "q1", q: "What did you hear on Thursday?", a: [["s1", "Shouting through the wall, at half past six. Daniel yelled: 'How do you know about the files?'"]] },
            { id: "q2", q: "Did you hear him go out?", a: [["s2", "Oh yes. His door, at ten o'clock. Then footsteps on the stairs. That was Daniel going out."]] },
            { id: "q3", q: "Did you see anyone?", a: [["s3", "I don't spy on my neighbors, detective."]] }
          ],
          breaks: [{ id: "b1", s: ["s2"], ev: ["doorcam"], react: "He left at 8:52? Then... oh dear. The man at ten wasn't Daniel. I looked through my peephole, I'll admit it. A man in a grey coat, carrying a brown leather laptop bag." }],
          pool: ["doorcam", "packed", "boot", "watch", "searched"],
          wrong: "Alma blinks. 'I don't see what that has to do with anything, dear.'",
          done: "Alma wasn't lying, just wrong. The man at ten was a stranger in a grey coat, carrying Daniel's laptop bag.", gives: ["greycoat"] },
        { type: "compare", title: "Read the phone record", ask: "Alma heard shouting at 6:30. Tap the call that set it off.",
          docs: [{ title: "Daniel's phone, Thursday 6 March", rows: [
            ["c1", "12:40 PM", "Call to Pizza Roma, 1 min"],
            ["c2", "6:30 PM", "Call from 0770-555-0148 (prepaid), 2 min"],
            ["c3", "7:10 PM", "Call to Sara Cross, 1 min"],
            ["c4", "8:40 PM", "Call to City Taxis, 1 min"]
          ] }],
          answer: ["c2"],
          done: "6:30 PM, two minutes, from a prepaid phone that can't be traced. Someone called Daniel about his files, and two hours later he was gone.", gives: ["phonelog"] }
      ],
      outro: "A prepaid phone called Daniel about 'the files' at 6:30. A man in a grey coat took his laptop bag at ten." },

    { title: "The Broken Watch", goal: "Rebuild Thursday night in the right order.", cast: ["nia"], gives: ["van"],
      brief: "A neighbor across the street sends in her dashcam video: a grey van parked outside Daniel's building on Thursday night. Nia spreads everything across the table. 'Let's build Thursday night, minute by minute.'",
      steps: [
        { type: "timeline", title: "Rebuild Thursday night", ask: "Tap the events in the order they happened. Times you can't see are in your dossier.",
          events: [
            ["e1", "A prepaid phone calls Daniel about his files.", "6:30 PM"],
            ["e2", "Daniel calls his sister Sara for one minute.", "7:10 PM"],
            ["e3", "Daniel leaves the building with a sports bag.", ""],
            ["e4", "A grey van parks outside the building.", "9:30 PM"],
            ["e5", "Someone knocks Daniel's watch off the shelf.", ""],
            ["e6", "A man in a grey coat leaves with Daniel's laptop bag.", ""]
          ],
          done: "Daniel was gone by 8:52. The van came at 9:30, the watch broke at 9:41, and the man in grey walked out at 9:55." },
        { type: "think", title: "Think it through", ask: "What does the timeline prove?", show: ["doorcam", "watch", "greycoat"],
          options: ["Daniel came back at 9:41 and broke his own watch", "A stranger was in the flat almost an hour after Daniel left, and took the laptop", "Daniel broke the watch on his way out"], answer: 1,
          done: "Daniel left at 8:52 without his laptop. A stranger was inside 49 minutes later and walked out with it." }
      ],
      outro: "Thursday, rebuilt: Daniel left at 8:52, a grey van arrived at 9:30, and a stranger took the laptop at 9:55." },

    { title: "Sara's Call", goal: "Find out what Daniel told his sister.", cast: ["sara"],
      brief: "Sara Cross, Daniel's younger sister, comes in on her own. She's pale and won't take her coat off. Daniel called her at 7:10 on Thursday: the last call he made to anyone he knew.",
      steps: [
        { type: "talk", who: "sara", title: "Talk to Sara Cross", ask: "Sara is scared and holding something back. Find the statement that doesn't fit, then show her the evidence.",
          intro: "Have you found him? Please tell me you've found him.",
          qs: [
            { id: "q1", q: "When did Daniel last call you?", a: [["s1", "Thursday evening, around seven."]] },
            { id: "q2", q: "What did you talk about?", a: [["s2", "Nothing much. We chatted for half an hour, about Mum, about the weekend."]] },
            { id: "q3", q: "Did he say he was going away?", a: [["s3", "No. He sounded completely normal."]] },
            { id: "q4", q: "Does he have enemies?", a: [["s4", "Daniel? He checks spreadsheets for a living. Who'd hate him?"]] }
          ],
          breaks: [{ id: "b1", s: ["s2", "s3"], ev: ["phonelog"], react: "...One minute. You're right, it was one minute. He said: 'I'm going away for a while. Don't trust anyone at my work. Not even the ones who seem to help.' Then he hung up. I was too scared to tell you." }],
          pool: ["phonelog", "doorcam", "packed", "greycoat", "report"],
          wrong: "Sara shakes her head. 'That's got nothing to do with me.'",
          done: "Daniel had one minute, and he used it to warn his sister about his own workplace.", gives: ["saraquote"] },
        { type: "think", title: "Think it through", ask: "Why would Daniel say 'Don't trust anyone at my work'?", show: ["saraquote", "phonelog"],
          options: ["He was in trouble for being late", "He thought someone at Ashford & Lane had told the caller what he'd found", "He wanted Sara to find him a new job"], answer: 1,
          done: "The 6:30 caller knew about 'the files'. Daniel believed the leak came from inside his own firm." }
      ],
      outro: "Daniel warned Sara: don't trust anyone at his work, not even the ones who seem to help." },

    { title: "The First Connection", goal: "Prove who searched Daniel's flat, and why.", cast: ["silas", "marcus"],
      brief: "The van on the dashcam, KL-2207, belongs to Kestrel Logistics, a delivery firm on Dock Road. Their night manager hands over the van log without a fight. Marcus knows one of the names on it: 'Silas Crane. Head of security at Blackstone Holdings. Mean as a snake.'",
      steps: [
        { type: "compare", title: "Read the van log", ask: "Tap the line for the van that was outside Daniel's building.",
          docs: [{ title: "Kestrel Logistics van log, Thursday 6 March", rows: [
            ["k1", "KL-2205", "Out 6:00 PM, back 11:15 PM. Driver: T. Bale"],
            ["k2", "KL-2207", "Out 9:00 PM, back 10:30 PM. Driver: S. Crane"],
            ["k3", "KL-2209", "In the garage all night"],
            ["k4", "KL-2211", "Out 7:30 PM, back 8:45 PM. Driver: J. Ortiz"]
          ] }],
          answer: ["k2"],
          done: "KL-2207: out at 9:00, back at 10:30, signed out by S. Crane.", gives: ["vanlog"] },
        { type: "talk", who: "silas", title: "Interview Silas Crane", ask: "Silas will lie to protect himself. Catch both lies with the evidence.",
          intro: "I've got nothing to hide. Ask your questions. Quickly.",
          qs: [
            { id: "q1", q: "Where were you on Thursday night?", a: [["s1", "At the Blackstone office, all night. Ask anyone."]] },
            { id: "q2", q: "Do you drive Kestrel's vans?", a: [["s2", "Kestrel? Never heard of them."]] },
            { id: "q3", q: "What size are your boots?", a: [["s3", "Forty-four. Why, are you buying?"]] },
            { id: "q4", q: "Have you been to Daniel Cross's building?", a: [["s4", "Never. I don't even know where he lives."]] }
          ],
          breaks: [
            { id: "b1", s: ["s2", "s1"], ev: ["vanlog"], react: "So I borrowed a van. Blackstone is Kestrel's only customer, everyone borrows their vans. So what?" },
            { id: "b2", s: ["s4", "s1"], ev: ["van"], react: "...No comment. I want Blackstone's lawyer. Now." }
          ],
          pool: ["vanlog", "van", "boot", "greycoat", "doorcam", "watch"],
          wrong: "Silas smirks. 'Is that the best you've got?'",
          done: "Silas had the van, and the van sat outside Daniel's building while the flat was searched. His boots are size 44.", gives: ["silas"] },
        { type: "accuse", title: "Name the visitor", ask: "Who searched Daniel's flat on Thursday night?",
          who: ["silas", "bale", "alma", "daniel"],
          notes: { silas: "Had van KL-2207 from 9:00 to 10:30 PM.", bale: "Drove van KL-2205 all evening.", alma: "Saw a man in grey at 9:55.", daniel: "Left the building at 8:52 PM." },
          answer: "silas",
          proofAsk: "Prove it: pick the 2 pieces of evidence that put Silas at the flat.",
          pool: ["vanlog", "van", "greycoat", "phonelog", "packed", "doorcam"], proof: ["vanlog", "van"], need: 2,
          motive: { ask: "Why did Silas search the flat?", options: ["To steal Daniel's cash", "To find the files Daniel had copied", "To bring Daniel his post"], answer: 1 },
          done: "Silas Crane searched the flat for Daniel's files and walked off with his laptop. Blackstone's lawyer has him out within the hour." }
      ],
      outro: "Silas Crane, Blackstone's head of security, searched Daniel's flat for his files." },

    /* ---------- Chapter 2: The False Witness ---------- */
    { title: "The Witness", goal: "Test Owen's story.", cast: ["owen", "marcus"], gives: ["trainboard"],
      brief: "Owen Pike, a taxi driver, phoned our tip line on Saturday morning. He says he saw Daniel at Central Station on Thursday night, laughing with a woman as they boarded the train to the coast.\n\nMarcus is already typing up the report. 'Happy guy, ran off with a girlfriend. Case closed?'",
      steps: [
        { type: "talk", who: "owen", title: "Talk to Owen Pike", ask: "Owen's story has holes. Catch two of them with the evidence.",
          intro: "Happy to help, detective. I've got a good memory for faces.",
          qs: [
            { id: "q1", q: "What did you see?", a: [["s1", "Daniel Cross, getting on the ten o'clock train to the coast. Clear as day."]] },
            { id: "q2", q: "Was he alone?", a: [["s2", "With a woman. Blonde, red dress. They were laughing."]] },
            { id: "q3", q: "What was he carrying?", a: [["s3", "A big red suitcase. Heavy, too. He was going away for a while."]] },
            { id: "q4", q: "How did you know it was Daniel?", a: [["s4", "His photo was on the news. I'd know that face anywhere."]] }
          ],
          breaks: [
            { id: "b1", s: ["s1"], ev: ["trainboard"], react: "Ten, half past nine... it was late. I'm not good with times." },
            { id: "b2", s: ["s3"], ev: ["doorcam"], react: "A sports bag? Well, it was dark. Maybe it was a sports bag." }
          ],
          pool: ["trainboard", "doorcam", "phonelog", "greycoat", "report", "saraquote"],
          wrong: "Owen grins. 'Doesn't change what I saw.'",
          done: "Wrong train, wrong bag. Owen's 'clear as day' memory keeps changing." },
        { type: "compare", title: "Check the tip-line log", ask: "Owen says he knew Daniel's face from the news. Tap the 2 lines that show that's impossible.",
          docs: [{ title: "Agency tip line, Saturday 8 March", rows: [
            ["t1", "8:02 AM", "Call from Owen Pike: saw Daniel at Central Station"],
            ["t2", "9:00 AM", "Missing-person report filed by Helen Marsh"],
            ["t3", "10:00 AM", "Daniel's photo released to the news"],
            ["t4", "11:30 AM", "Call from a woman who saw 'Daniel' at the zoo"]
          ] }],
          answer: ["t1", "t3"],
          done: "Owen called at 8:02. Daniel's photo went out at 10:00. Owen even called before Helen reported Daniel missing.", gives: ["tiplog"] },
        { type: "think", title: "Think it through", ask: "What does that tell you about Owen?", show: ["tiplog"],
          options: ["He mixed up a few details, like anyone would", "Somebody told him about Daniel before anyone knew Daniel was missing", "He saw Daniel by chance"], answer: 1,
          done: "Someone fed Owen his story, and fed it early." }
      ],
      outro: "Owen called the tip line before Daniel was even reported missing. Someone gave him his story." },

    { title: "Three Different Stories", goal: "Find out which stories are true, and where Daniel really went.", cast: ["bill", "mina"], gives: ["taxi", "clerk"],
      brief: "Marcus finds two more people who saw a man with a sports bag on Thursday night: Bill Hanley, a taxi driver, and Mina Sol, who sells tickets at the bus station. Their stories don't match Owen's.",
      steps: [
        { type: "think", title: "Compare the stories", ask: "Two of these stories fit together, and fit the door camera. Which two?", show: ["taxi", "clerk", "doorcam"],
          options: ["Owen and Bill: a taxi to Central Station, then the train", "Bill and Mina: a taxi to the bus station, then a cash ticket north", "Owen and Mina: the train first, then a bus"], answer: 1,
          done: "Bill dropped a man with a sports bag at the bus station at 9:05. At 9:10 Mina sold him a ticket. Owen's train never comes into it." },
        { type: "compare", title: "Check the bus tickets", ask: "Mina remembers an open ticket, paid in cash. Tap Daniel's ticket.",
          docs: [{ title: "North line, 9:20 PM bus: tickets sold", rows: [
            ["b1", "9:02 PM", "Card · to Millbrook · adult"],
            ["b2", "9:06 PM", "Card · to Hadley · return"],
            ["b3", "9:08 PM", "Cash · to Hadley · child"],
            ["b4", "9:10 PM", "Cash · open ticket, any stop · adult"],
            ["b5", "9:14 PM", "Card · to Ashby · adult"]
          ] }],
          answer: ["b4"],
          done: "9:10 PM, cash, good for any stop. Daniel left town on the north bus. The trouble is, the line has 14 stops.", gives: ["busticket"] }
      ],
      outro: "Daniel took the 9:20 PM north bus with an open ticket. Owen's train story was a lie." },

    { title: "The Missing Hour", goal: "Rebuild Owen's real evening.", cast: ["owen"], gives: ["grillphoto", "taxiapp"],
      brief: "Owen swears he drove his taxi all Thursday evening and was waiting at Central Station at ten. But the Corner Grill posted a party photo that night, and his taxi app keeps a record of everything.",
      steps: [
        { type: "timeline", title: "Rebuild Owen's evening", ask: "Put Owen's Thursday evening in order. Check your dossier for the times you can't see.",
          events: [
            ["e1", "Owen switches off his taxi app.", "8:30 PM"],
            ["e2", "Owen sits in the Corner Grill with a man in a grey coat.", ""],
            ["e3", "Owen pays for dinner at the Corner Grill.", "9:31 PM"],
            ["e4", "Owen's app comes back on and he picks up a fare outside the Grill.", ""],
            ["e5", "Owen drops his fare at the airport.", "10:40 PM"]
          ],
          done: "From 8:30 to 9:58 Owen wasn't driving at all. He was at the Corner Grill with a man in grey." },
        { type: "think", title: "Think it through", ask: "Owen says he saw Daniel at Central Station at 10 PM. Could he have?", show: ["taxiapp"],
          options: ["Yes, he could easily drive there by ten", "No: at 9:58 he picked up a fare at the Grill and drove it to the airport", "Yes, the airport is right next to the station"], answer: 1,
          done: "At ten, Owen was driving a fare to the airport. He saw nobody at Central Station." }
      ],
      outro: "At 10 PM Owen was on his way to the airport. At 9:15 he was having dinner with a man in a grey coat." },

    { title: "The Edited Statement", goal: "Find what Owen changed in his bank statement.", cast: ["owen", "nia"],
      brief: "Owen hands over his bank statement to prove he's 'squeaky clean'. Nia gets the same statement straight from the bank and lays both copies side by side.",
      steps: [
        { type: "compare", title: "Compare the statements", ask: "Owen's copy was changed. Tap the 2 lines that give him away: the one he hid, and the one he changed to cover it.",
          docs: [
            { title: "From the bank", rows: [
              ["r1", "Wed 5 Mar", "Groceries −$54.20"],
              ["r2", "Thu 6 Mar, 9:31 PM", "Corner Grill −$38.00"],
              ["r3", "Thu 6 Mar, 9:45 PM", "From GREYFIELD TRADING +$2,000.00"],
              ["r4", "Fri 7 Mar", "Fuel −$61.00"],
              ["r5", "Balance", "$2,412.30"]
            ] },
            { title: "Owen's copy", rows: [
              ["r1", "Wed 5 Mar", "Groceries −$54.20"],
              ["r2", "Thu 6 Mar, 9:31 PM", "Corner Grill −$38.00"],
              ["r4", "Fri 7 Mar", "Fuel −$61.00"],
              ["r5", "Balance", "$412.30"]
            ] }
          ],
          answer: ["r3", "r5"],
          done: "Owen cut out $2,000 from Greyfield Trading, paid 14 minutes after his dinner, and knocked $2,000 off his balance to hide it.", gives: ["payment"] },
        { type: "think", title: "Think it through", ask: "Greyfield Trading is registered at 12 Dock Road, the same address as Kestrel Logistics. What does that tell you?", show: ["payment", "vanlog"],
          options: ["Owen won the money in a raffle", "The same people behind Silas's van paid Owen", "Daniel paid Owen to cover for him"], answer: 1,
          done: "Kestrel lent Silas his van. Greyfield, at the same address, paid Owen. The same hands keep turning up.", gives: ["greyfield"] }
      ],
      outro: "Owen was paid $2,000 by Greyfield Trading, which shares an address with the van company Silas used." },

    { title: "The Confrontation", goal: "Make Owen tell you who gave him his story.", cast: ["owen"],
      brief: "Time to put it all in front of Owen: the photo, the taxi app and the bank. He knows the game is up. He just doesn't know it yet.",
      steps: [
        { type: "talk", who: "owen", title: "Confront Owen Pike", ask: "Break Owen's story with the evidence. He'll give up a little more each time.",
          intro: "This again? I've told you everything I know.",
          qs: [
            { id: "q1", q: "Where were you at 9:15 on Thursday?", a: [["s1", "At home. I went home at eight and stayed in until I went to the station."]] },
            { id: "q2", q: "Who was the man in the grey coat?", a: [["s2", "What man? I always eat alone."]] },
            { id: "q3", q: "What's Greyfield Trading to you?", a: [["s3", "Never heard of them. Is it a band?"]] }
          ],
          breaks: [
            { id: "b1", s: ["s1", "s2"], ev: ["grillphoto"], react: "All right, I was at the Grill. A man in a grey coat bought me dinner. He said a job was coming my way." },
            { id: "b2", s: ["s3"], ev: ["payment"], react: "The money came that same night. Then on Saturday, at a quarter to eight, a woman called me. She gave me the whole story: the train, the blonde, the coast. She said: call the tip line at eight sharp.", gives: ["caller"] }
          ],
          pool: ["grillphoto", "taxiapp", "payment", "greyfield", "tiplog", "trainboard"],
          wrong: "Owen folds his arms. 'Prove it.'",
          done: "A man in grey paid for dinner, Greyfield paid $2,000, and a woman wrote Owen's lines on Saturday morning." },
        { type: "compare", title: "Check Owen's phone", ask: "Owen hands over his phone. Tap the call from a number you've seen before.",
          docs: [{ title: "Owen's calls", rows: [
            ["p1", "Fri 7 Mar, 6:10 PM", "From Mum, 9 min"],
            ["p2", "Sat 8 Mar, 7:30 AM", "From Taxi base, 1 min"],
            ["p3", "Sat 8 Mar, 7:45 AM", "From 0770-555-0148, 3 min"],
            ["p4", "Sat 8 Mar, 8:02 AM", "To Agency tip line, 4 min"]
          ] }],
          answer: ["p3"],
          done: "0770-555-0148: the same prepaid phone that threatened Daniel at 6:30 on Thursday.", gives: ["owencall"] },
        { type: "think", title: "Think it through", ask: "She called Owen at 7:45 on Saturday. Helen reported Daniel missing at 9:00. What does that mean?", show: ["owencall", "tiplog"],
          options: ["The caller knew Daniel would be reported missing before it happened", "The caller saw it on the news", "Owen got the time wrong"], answer: 0,
          done: "At 7:45 nobody knew Daniel was missing, except the people who made him run. The caller was one step ahead of us." }
      ],
      outro: "The woman who wrote Owen's story used the phone that threatened Daniel, and she knew about the missing-person report before it was made." },

    { title: "The Silent Partner", goal: "Find out who was really behind Owen's lie.", cast: ["evelyn", "nia"], gives: ["clients"],
      brief: "Nia pulls the company records for Dock Road. Greyfield Trading and Kestrel Logistics each have exactly one customer. Evelyn wants the whole picture before you go after anyone big.",
      steps: [
        { type: "link", title: "Connect the pieces", ask: "Match each question to who is behind it.",
          left: [["l1", "Who paid Owen $2,000?"], ["l2", "Who bought Owen dinner at the Grill?"], ["l3", "Who gave Owen his story on Saturday?"], ["l4", "Who does Silas work for?"]],
          right: [["r1", "Blackstone Holdings", "Through Greyfield and Kestrel"], ["r2", "Silas Crane", "Blackstone security badge"], ["r3", "A woman on 0770-555-0148", "Never seen"], ["r4", "Sara Cross", "Daniel's sister"], ["r5", "Alma Bell", "Daniel's neighbor"]],
          pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r1" },
          done: "Blackstone's money, Blackstone's man, and a woman nobody has seen." },
        { type: "accuse", title: "Name the payer", ask: "Whose money paid for Owen's lie?",
          who: ["blackstone", "silas", "sara", "owen"],
          notes: { blackstone: "Greyfield's only customer.", silas: "Bought Owen dinner.", sara: "Daniel's sister.", owen: "Told the lie." },
          answer: "blackstone",
          proofAsk: "Prove it: pick the 2 pieces of evidence that tie Owen's money to Blackstone.",
          pool: ["payment", "clients", "grillphoto", "owencall", "tiplog", "vanlog"], proof: ["payment", "clients"], need: 2,
          motive: { ask: "Why plant a false witness?", options: ["To win the reward money", "To make us believe Daniel ran off happy, and close the case", "To help Daniel hide"], answer: 1 },
          done: "Blackstone paid for the lie through Greyfield. They wanted the case closed before anyone looked at Daniel's work." }
      ],
      outro: "Blackstone paid for Owen's lie through Greyfield Trading." },

    /* ---------- Chapter 3: The Hidden Network ---------- */
    { title: "The First Transaction", goal: "Find out where Greyfield's money really goes.", cast: ["marcus", "nia", "holt"],
      brief: "A judge signs the warrant for Greyfield's bank account. Marcus pulls up in a shiny new car, grinning. 'Paid off all my debts. Finally got lucky at cards.'\n\nGreyfield, Nia notes, has exactly one employee, Jo Moss, paid every month. In the city, Grant Holt sits on the planning board and Lisa Varga runs customs at the port.",
      steps: [
        { type: "compare", title: "Read Greyfield's bank account", ask: "Greyfield does no real work. Tap the 2 payments to people who work for the city.",
          docs: [{ title: "Greyfield Trading, March", rows: [
            ["g1", "3 Mar", "In: Northgate Supplies, 'services' +$84,000"],
            ["g2", "3 Mar", "Out: J. Moss, salary −$2,100"],
            ["g3", "4 Mar", "Out: G. Holt, 'advice' −$5,000"],
            ["g4", "4 Mar", "Out: L. Varga, 'advice' −$4,000"],
            ["g5", "5 Mar", "Out: Rent, 12 Dock Road −$1,200"],
            ["g6", "6 Mar", "Out: O. Pike −$2,000"],
            ["g7", "7 Mar", "Out: Mercer Holdings −$66,600"]
          ] }],
          answer: ["g3", "g4"],
          done: "Greyfield paid a planning official and a customs officer for 'advice'. That's what a bribe looks like on paper.", gives: ["bribes"] },
        { type: "think", title: "Think it through", ask: "Why would a company pay a planning official and a customs officer?", show: ["bribes"],
          options: ["To win building permits and get goods past the port unchecked", "To say thank you for good advice", "To pay their taxes early"], answer: 0,
          done: "Permits for Blackstone's buildings, and nobody checking what comes in through the port." }
      ],
      outro: "Greyfield bribes a planning official and a customs officer. Most of its money moves on to something called Mercer Holdings." },

    { title: "Three Companies", goal: "Work out how the companies fit together, and who owns them.", cast: ["nia", "finch"], gives: ["northgate"],
      brief: "Greyfield's money comes from Northgate Supplies and leaves for Mercer Holdings. Nia pulls the company register for all of them. 'Three companies on one street. Let's see who's really in charge.'",
      steps: [
        { type: "link", title: "Sort the companies", ask: "Match each company to what it does for the network.",
          left: [["l1", "Greyfield Trading"], ["l2", "Northgate Supplies"], ["l3", "Kestrel Logistics"]],
          right: [["r1", "Pays the officials, and paid Owen"], ["r2", "Bills Blackstone for steel"], ["r3", "Lent Silas the van"], ["r4", "Audits other companies"], ["r5", "Runs the city's buses"]],
          pairs: { l1: "r1", l2: "r2", l3: "r3" },
          done: "Northgate bills, Greyfield pays, Kestrel drives. Three companies, one machine." },
        { type: "compare", title: "Read the company register", ask: "Nia says Roy Finch, 79, signs papers for anyone who pays him. Tap the line all three share that shows who really owns them.",
          docs: [
            { title: "Greyfield Trading", rows: [["d", "Director", "Roy Finch"], ["o", "Owner", "Mercer Holdings Ltd"], ["a", "Address", "12 Dock Road"], ["y", "Founded", "2021"]] },
            { title: "Northgate Supplies", rows: [["d", "Director", "Roy Finch"], ["o", "Owner", "Mercer Holdings Ltd"], ["a", "Address", "Unit 4, Dock Road"], ["y", "Founded", "2021"]] },
            { title: "Kestrel Logistics", rows: [["d", "Director", "Roy Finch"], ["o", "Owner", "Mercer Holdings Ltd"], ["a", "Address", "12 Dock Road"], ["y", "Founded", "2022"]] }
          ],
          answer: ["o"],
          done: "All three belong to Mercer Holdings. Roy Finch is just a signature. Mercer's own owner is hidden behind lawyers and a post box.", gives: ["mercer"] }
      ],
      outro: "Greyfield, Northgate and Kestrel all belong to Mercer Holdings, and Mercer's owner is hidden." },

    { title: "The Double Invoice", goal: "Prove the steel never existed.", cast: ["nia"], gives: ["port"],
      brief: "Blackstone pays Northgate for steel, lots of it. Nia finds two copies of the same Northgate invoice: one in Northgate's tax file, one in Blackstone's accounts. The port authority adds a note of its own.",
      steps: [
        { type: "compare", title: "Compare the invoices", ask: "Tap the 2 lines that prove this invoice is fake.",
          docs: [
            { title: "Tax office copy", rows: [["n", "Invoice", "N-0311"], ["i", "Item", "200 tonnes of steel"], ["d", "Delivered", "Sunday 2 March, Port Gate 3"], ["p", "Price", "$240 a tonne"], ["t", "Total", "$48,000"]] },
            { title: "Blackstone's copy", rows: [["n", "Invoice", "N-0311"], ["i", "Item", "200 tonnes of steel"], ["d", "Delivered", "Sunday 2 March, Port Gate 3"], ["p", "Price", "$240 a tonne"], ["t", "Total", "$84,000"]] }
          ],
          answer: ["d", "t"],
          done: "Nothing is delivered on a Sunday: the port is shut. And one invoice can't have two totals.", gives: ["invoice"] },
        { type: "think", title: "Think it through", ask: "The steel never existed. So what did Blackstone's $84,000 really pay for?", show: ["invoice", "bribes"],
          options: ["Steel that got lost at sea", "Money moved into the network, dressed up as a steel bill", "A refund for an old order"], answer: 1,
          done: "Fake steel, real money. The bill is how Blackstone feeds cash into the network without anyone asking." }
      ],
      outro: "Northgate's steel never existed. Its invoices are how Blackstone feeds money into the network." },

    { title: "The Money Trail", goal: "Follow the money to the end of the line.", cast: ["nia"],
      brief: "Nia pins every payment to the wall with red string. 'Money has to arrive before it can leave,' she says. 'Follow it and see where it stops.'",
      steps: [
        { type: "timeline", title: "Follow the money", ask: "Put the money's journey in order. Money has to arrive somewhere before it can move on.",
          events: [
            ["e1", "Blackstone pays Northgate $84,000 for 'steel'.", ""],
            ["e2", "Northgate passes the $84,000 to Greyfield.", "3 Mar"],
            ["e3", "Greyfield pays Holt and Varga $9,000 for 'advice'.", "4 Mar"],
            ["e4", "Greyfield sends $66,600 to Mercer Holdings.", "7 Mar"],
            ["e5", "Mercer sends 10% of it, $6,660, to an account named only 'B'.", ""]
          ],
          done: "Blackstone, Northgate, Greyfield, Mercer... and at the very end, a single letter: B." },
        { type: "think", title: "Think it through", ask: "Every time Mercer is paid, 10% goes to 'B'. Who is B?", show: ["mercer"],
          options: ["Blackstone itself", "Whoever runs the whole network", "A bank charging a fee"], answer: 1,
          done: "Banks don't hide behind a single letter. B is at the top, and B takes a cut of everything.", gives: ["feeb"] }
      ],
      outro: "At the end of the money trail is one letter: B, who takes 10% of everything." },

    { title: "The Audit Stamp", goal: "Find out if Greyfield was warned, and who checked its books.", cast: ["evelyn", "marcus", "ray"],
      brief: "Friday 14 March, 6 AM. The team raids Greyfield's office at 12 Dock Road. Only five people knew the time: Evelyn, Nia, Marcus, Ray Duffy from records, and you.\n\nThe office is empty when you go in.",
      steps: [
        { type: "search", title: "Search Greyfield's office", ask: "Mark the 3 signs that Greyfield knew we were coming this morning.",
          items: [
            ["cups", "☕", "Coffee cups", "Three cups on the desk, still warm.", 1],
            ["shred", "🗑️", "Shredder", "The bin is full of fresh strips and the motor is still warm.", 1],
            ["visit", "📖", "Visitor book", "Today's page has been torn out. The tear is clean and new.", 1],
            ["cab", "🗄️", "Filing cabinet", "Empty, with thick dust inside. It's been empty for months.", 0],
            ["plant", "🥀", "Plant", "Dead and dry. Nobody has watered it in weeks.", 0],
            ["cal", "📅", "Wall calendar", "'AUDIT, A&L' circled on 3 March.", 0],
            ["folder", "📁", "Folder under the desk", "Ashford & Lane audit reports for Greyfield, Northgate and Kestrel.", 0],
            ["door", "🚪", "Back door", "Locked, with a rusty bolt nobody has moved in years.", 0]
          ],
          done: "Warm cups, a warm shredder and a torn-out page. They left minutes before we arrived. Someone warned them.", gives: ["tipoff"] },
        { type: "compare", title: "Read the audit reports", ask: "The folder holds Ashford & Lane's audits of all three companies. Tap the line that ties all three clean reports to one person.",
          docs: [
            { title: "Audit: Greyfield Trading", rows: [["c", "Checked by", "Audit team A"], ["r", "Result", "Passed, no problems"], ["t", "Time taken", "1 day"], ["s", "Signed off by", "H.M."]] },
            { title: "Audit: Northgate Supplies", rows: [["c", "Checked by", "Audit team B"], ["r", "Result", "Passed, no problems"], ["t", "Time taken", "1 day"], ["s", "Signed off by", "H.M."]] },
            { title: "Audit: Kestrel Logistics", rows: [["c", "Checked by", "Audit team A"], ["r", "Result", "Passed, no problems"], ["t", "Time taken", "1 day"], ["s", "Signed off by", "H.M."]] }
          ],
          answer: ["s"],
          done: "Three fake companies, each passed in a day, each signed 'H.M.'. Ashford & Lane says two partners have used those initials: Helen Marsh, and Harold Mead, who retired last year.", gives: ["hmsign"] }
      ],
      outro: "Greyfield was warned minutes before our raid. And all three fake companies were passed as clean by someone signing 'H.M.'" },

    { title: "The Network Map", goal: "Map the network and name the man at its center.", cast: ["adrian", "nia"], gives: ["schedule"],
      brief: "Blackstone's chief executive, Adrian Cole, agrees to an interview, with two lawyers. Before he arrives, Nia hands you Ashford & Lane's audit schedule: Daniel spent 3 to 5 March at Blackstone, meeting Adrian every day.",
      steps: [
        { type: "link", title: "Map the money", ask: "Follow each payment to where it went.",
          left: [["l1", "Blackstone's $84,000 for 'steel' went to..."], ["l2", "Northgate passed it on to..."], ["l3", "The $9,000 for 'advice' went to..."], ["l4", "Mercer's 10% fee goes to..."]],
          right: [["r1", "Northgate Supplies"], ["r2", "Greyfield Trading"], ["r3", "Grant Holt and Lisa Varga"], ["r4", "An account named 'B'"], ["r5", "Ashford & Lane"], ["r6", "Kestrel Logistics"]],
          pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
          done: "The map is complete: from Blackstone's fake bills, through the officials, all the way up to B." },
        { type: "talk", who: "adrian", title: "Interview Adrian Cole", ask: "Adrian is smooth. Catch him where the evidence says otherwise.",
          intro: "Detective. Let's make this quick. I have a company to run.",
          qs: [
            { id: "q1", q: "What does Blackstone buy from Northgate?", a: [["s1", "Steel. Lots of it. We build things, detective."]] },
            { id: "q2", q: "Do you know Daniel Cross?", a: [["s2", "Never met the man."]] },
            { id: "q3", q: "Who owns Mercer Holdings?", a: [["s3", "No idea. Ask Mercer."]] },
            { id: "q4", q: "Who is B?", a: [["s4", "A letter of the alphabet, last time I checked."]] }
          ],
          breaks: [
            { id: "b1", s: ["s1"], ev: ["invoice"], react: "The steel is... a paper thing. Everyone in this city does it." },
            { id: "b2", s: ["s2"], ev: ["schedule"], react: "Fine. Cross sat in my office for three days asking about Northgate. I passed his questions on to the people I answer to. That's all I'm saying." }
          ],
          pool: ["invoice", "schedule", "bribes", "mercer", "feeb", "clients"],
          wrong: "One of Adrian's lawyers smiles. 'Next question.'",
          done: "Adrian runs the money, but he answers to someone. He passed Daniel's questions up the line.", gives: ["adrian1"] },
        { type: "accuse", title: "Name the man at the center", ask: "Who runs the money side of the network?",
          who: ["adrian", "silas", "holt", "finch"],
          notes: { adrian: "Chief executive of Blackstone.", silas: "Blackstone's head of security.", holt: "Took 'advice' money.", finch: "Signs papers for cash." },
          answer: "adrian",
          proofAsk: "Prove it: pick the 2 pieces of evidence that show Adrian moves the money.",
          pool: ["invoice", "adrian1", "bribes", "mercer", "feeb", "tipoff"], proof: ["invoice", "adrian1"], need: 2,
          motive: { ask: "Why does Adrian feed money into the network?", options: ["Bribed officials give Blackstone permits and wave its goods through the port", "Daniel was blackmailing him", "To help the city grow"], answer: 0 },
          done: "Adrian Cole is charged with bribery, and Silas Crane is picked up with him. But Adrian answers to someone, and 10% of everything goes to B." }
      ],
      outro: "Adrian Cole runs the money. But he answers to B, and someone warned Greyfield before our raid." },

    /* ---------- Chapter 4: The Inside Man ---------- */
    { title: "The Missing File", goal: "Find out when the raid plan was copied.", cast: ["evelyn", "ray"],
      brief: "Evelyn closes her office door. 'The raid plan was in Daniel's case file, in our own evidence room. Someone here told Greyfield. Find out who. Quietly.'\n\nRay Duffy, who runs the evidence room, unlocks it for you.",
      steps: [
        { type: "search", title: "Search the evidence room", ask: "Mark the 3 clues that show someone copied the raid plan.",
          items: [
            ["file", "📂", "Case file", "Page 4, the raid plan, is back in the file, but upside down.", 1],
            ["copier", "🖨️", "Copier", "The counter shows 4 pages copied on Tuesday at 9:12 PM. Nobody signed for copies.", 1],
            ["note", "📝", "Night guard's note", "'Tuesday, about 9 PM: light on in the evidence room. Thought it was the cleaners.'", 1],
            ["rota", "🧹", "Cleaning rota", "Cleaners come on Mondays and Thursdays only.", 0],
            ["sheet", "📋", "Sign-out sheet", "Last entry Tuesday, 4:30 PM: Ray Duffy returned box 12.", 0],
            ["mug", "☕", "Mug", "'World's Best Boss'. Evelyn's. Cold for days.", 0],
            ["window", "🪟", "Window", "Locked from the inside, with bars outside.", 0],
            ["bin", "🗑️", "Bin", "Empty. Emptied on Monday.", 0]
          ],
          done: "Tuesday, 9:12 PM: someone copied the raid plan and slipped it back into the file, upside down.", gives: ["copied"] },
        { type: "think", title: "Think it through", ask: "After 8 PM our building only opens with a keycard. What do you check next?",
          options: ["The building's keycard log for Tuesday night", "The cleaning company", "The copier's warranty"], answer: 0,
          done: "Every door in the building logs every card." }
      ],
      outro: "Someone copied the raid plan on Tuesday at 9:12 PM, inside our own building." },

    { title: "The Door Log", goal: "Find whose card was in the building at 9:12 PM.", cast: ["ray"],
      brief: "Ray prints the keycard log for Tuesday night. The night guard, Pat Ames, sat at the front desk on camera all evening.",
      steps: [
        { type: "compare", title: "Read the keycard log", ask: "Apart from the night guard, whose card was in the building at 9:12 PM?",
          docs: [{ title: "Keycard log, Tuesday 11 March, from 6 PM", rows: [
            ["k1", "6:00 PM", "P. AMES in (night guard)"],
            ["k2", "6:55 PM", "M. REED in"],
            ["k3", "7:20 PM", "M. REED out"],
            ["k4", "7:40 PM", "E. SHAW out"],
            ["k5", "7:45 PM", "N. CARTER out"],
            ["k6", "9:05 PM", "R. DUFFY out"],
            ["k7", "9:08 PM", "E. SHAW in"],
            ["k8", "9:25 PM", "E. SHAW out"]
          ] }],
          answer: ["k7"],
          done: "Evelyn's card came in at 9:08 and left at 9:25. The copy was made at 9:12.", gives: ["keylog"] },
        { type: "think", title: "Think it through", ask: "Does this prove that Evelyn copied the raid plan?", show: ["keylog"],
          options: ["Yes. Her card was there, so case closed", "Not yet. It proves her card was there, not her", "No. Keycard logs are always wrong"], answer: 1,
          done: "A card isn't a face. Who was holding it?" }
      ],
      outro: "Evelyn's keycard was in the building at 9:12. But was Evelyn?" },

    { title: "The Altered Photograph", goal: "Find out if the photo is real.", cast: ["ray", "marcus", "nia"],
      brief: "Ray brings the lobby photo from the evidence binder: Tuesday, 9:08 PM, a figure in a long coat and a red scarf. Evelyn always wears a red scarf. Marcus whistles. 'Well, well.'\n\nNia asks the camera company for the original file.",
      steps: [
        { type: "compare", title: "Compare the photos", ask: "Tap the 2 lines that show the binder photo was changed.",
          docs: [
            { title: "Original file, camera server", rows: [["c", "Camera", "Lobby 1"], ["t", "Time", "Tue 11 Mar, 9:08 PM"], ["p", "Person", "Long dark coat, face turned away"], ["s", "Scarf", "None"], ["e", "Last changed", "Tue 11 Mar, 9:08 PM"]] },
            { title: "Printed photo in our binder", rows: [["c", "Camera", "Lobby 1"], ["t", "Time", "Tue 11 Mar, 9:08 PM"], ["p", "Person", "Long dark coat, face turned away"], ["s", "Scarf", "Red"], ["e", "Last changed", "Wed 12 Mar, 2:14 AM, PhotoFix"]] }
          ],
          answer: ["s", "e"],
          done: "Someone added a red scarf at 2:14 in the morning. Someone wants this to be Evelyn.", gives: ["photo"] },
        { type: "think", title: "Think it through", ask: "Who gains if Evelyn takes the blame?", show: ["photo"],
          options: ["The real leak, who stays hidden", "Evelyn herself", "Daniel Cross"], answer: 0,
          done: "Frame the boss, and nobody looks at you. Clever. Not clever enough." }
      ],
      outro: "Someone edited the lobby photo to frame Evelyn. The real leak is hiding behind her." },

    { title: "Evelyn's Dinner", goal: "Find out what Evelyn is hiding.", cast: ["evelyn"], gives: ["receipt", "meeting"],
      brief: "Evelyn agrees to be questioned like anyone else. She sits very straight. 'Ask what you need to ask, detective.'",
      steps: [
        { type: "talk", who: "evelyn", title: "Question Evelyn Shaw", ask: "Evelyn is hiding two things. Find them with the evidence.",
          intro: "I've run this agency for twelve years. I didn't leak anything.",
          qs: [
            { id: "q1", q: "Where were you on Tuesday evening?", a: [["s1", "At the Harbor Club. Dinner alone, working on my reports."]] },
            { id: "q2", q: "Where do you keep your keycard?", a: [["s2", "In my bag. It never leaves my sight."]] },
            { id: "q3", q: "Did you go back to the office?", a: [["s3", "No. I went home after dinner."]] }
          ],
          breaks: [
            { id: "b1", s: ["s1"], ev: ["receipt"], react: "...I wasn't alone. I had dinner with Helen Marsh. We've been friends for twenty years. She asked how the Cross case was going. I told her almost nothing. I kept quiet because it looks bad.", gives: ["dinner"] },
            { id: "b2", s: ["s2"], ev: ["meeting"], react: "You're right. During the six-fifteen meeting my bag hung in my office. Anyone could have walked in.", gives: ["bagalone"] }
          ],
          pool: ["receipt", "meeting", "keylog", "photo", "copied", "tipoff"],
          wrong: "Evelyn raises an eyebrow. 'Try again, detective.'",
          done: "Evelyn was at dinner with Helen Marsh all evening. Her keycard sat alone in her office from 6:15 to 7:30." },
        { type: "think", title: "Think it through", ask: "Is Evelyn the leak?", show: ["dinner", "bagalone", "keylog"],
          options: ["Yes: she lied about the dinner", "No: at 9:12 she was at the Harbor Club, and her card could have been copied while her bag sat alone", "There's no way to tell"], answer: 1,
          done: "Evelyn lied to protect a friendship, not a crime. Somebody copied her card during that meeting." }
      ],
      outro: "Evelyn was at dinner with Helen Marsh. Her keycard sat alone in her office during the 6:15 meeting." },

    { title: "The Three Suspects", goal: "Find out who had the chance to copy Evelyn's card.", cast: ["marcus", "nia", "ray"], gives: ["hallcam", "labdoor", "recdesk"],
      brief: "Three people were in the building during Evelyn's meeting without being in it: Marcus, Nia and Ray. Nia pulls her own lab log first, then hands you the hallway camera footage. 'Don't go easy on me,' she says.",
      steps: [
        { type: "link", title: "Check the alibis", ask: "Match each person to where the logs and cameras put them during Evelyn's meeting.",
          left: [["l1", "Nia Carter"], ["l2", "Ray Duffy"], ["l3", "Marcus Reed"]],
          right: [["r1", "In the lab, 5:50 to 7:45 PM, one door"], ["r2", "At the records desk, 6:00 to 8:00 PM, on camera"], ["r3", "Inside Evelyn's empty office, 7:02 to 7:06 PM"], ["r4", "At the Harbor Club"]],
          pairs: { l1: "r1", l2: "r2", l3: "r3" },
          done: "Nia never left the lab. Ray never left the desk. Marcus spent four minutes alone with Evelyn's bag." },
        { type: "think", title: "Think it through", ask: "Who had the chance to copy Evelyn's keycard?", show: ["hallcam", "bagalone"],
          options: ["Nia Carter", "Ray Duffy", "Marcus Reed"], answer: 2,
          done: "Your own partner. The new car. The lucky cards." }
      ],
      outro: "Only Marcus had the chance: four minutes alone in Evelyn's office during the meeting." },

    { title: "The Partner", goal: "Prove Marcus is the inside man, and find out who he works for.", cast: ["marcus"],
      brief: "A judge signs a warrant for Marcus's bank account. He doesn't know yet. He's at his desk, joking with Ray, when you ask him to step into the interview room.",
      steps: [
        { type: "compare", title: "Read Marcus's bank account", ask: "Marcus says poker paid off his debts. Tap the line that says otherwise.",
          docs: [{ title: "Marcus Reed, early March", rows: [
            ["m1", "28 Feb", "Car loan payment −$410"],
            ["m2", "1 Mar", "Poker club winnings +$120"],
            ["m3", "3 Mar", "From KESTREL LOGISTICS, 'consulting' +$40,000"],
            ["m4", "4 Mar", "Poker club debt paid −$22,000"],
            ["m5", "4 Mar", "Car loan paid off −$15,600"]
          ] }],
          answer: ["m3"],
          done: "$40,000 from Kestrel Logistics, three days before Daniel vanished. The next day the debts were gone.", gives: ["marcuspay"] },
        { type: "talk", who: "marcus", title: "Interview Marcus Reed", ask: "Your partner will lie to your face. Break his story.",
          intro: "Come on, rookie. It's me. You know me.",
          qs: [
            { id: "q1", q: "Where were you at 7 PM on Tuesday?", a: [["s1", "Home by seven. Ask my neighbor."]] },
            { id: "q2", q: "How did you pay off your debts?", a: [["s2", "Poker. I told you, I got lucky."]] },
            { id: "q3", q: "Did you touch Evelyn's keycard?", a: [["s3", "Never. Why would I?"]] }
          ],
          breaks: [
            { id: "b1", s: ["s1", "s3"], ev: ["hallcam"], react: "...I dropped a folder on her desk. That's all." },
            { id: "b2", s: ["s2"], ev: ["marcuspay"], react: "All right. All right. I was drowning. A woman called me on a prepaid phone, 0770-555-0148. She paid everything. All I had to do was tell her what we were doing. I copied Evelyn's card. I gave her the raid time. I never saw her face. She knows Evelyn well, even the red scarf. She said Evelyn trusts her completely.", gives: ["confession"] }
          ],
          pool: ["hallcam", "marcuspay", "keylog", "photo", "bagalone", "copied"],
          wrong: "Marcus laughs, too loud. 'You're reaching, partner.'",
          done: "Marcus sold the case to a woman he never met." },
        { type: "accuse", title: "Name the inside man", ask: "Who leaked the raid plan?",
          who: ["marcus", "evelyn", "ray", "nia"],
          notes: { marcus: "Your partner.", evelyn: "Her keycard was used.", ray: "Runs the evidence room.", nia: "Forensic analyst." },
          answer: "marcus",
          proofAsk: "Prove it: pick the 2 pieces of evidence that nail Marcus.",
          pool: ["hallcam", "marcuspay", "confession", "keylog", "photo", "labdoor"], proof: ["hallcam", "marcuspay", "confession"], need: 2,
          motive: { ask: "Why did Marcus do it?", options: ["Someone paid off his debts", "He wanted Evelyn's job", "Daniel asked him to"], answer: 0 },
          done: "Marcus Reed is arrested at his own desk. He hands over his prepaid phone: 0770-555-0150." }
      ],
      outro: "Marcus was the inside man, paid through Kestrel by a woman he never met." },

    /* ---------- Chapter 5: The Black Ledger ---------- */
    { title: "The Betrayal", goal: "Get the truth about the ledger from Adrian.", cast: ["adrian", "nia"], gives: ["silascall"],
      brief: "Three days after Marcus's arrest, every Mercer account is emptied overnight. B has cut Blackstone loose. Adrian Cole asks for you by name. He wants a deal.\n\nNia has also cracked the prepaid phone found on Silas Crane.",
      steps: [
        { type: "talk", who: "adrian", title: "Talk to Adrian Cole", ask: "Adrian wants a deal, but he still lies to protect himself. Catch him.",
          intro: "She's left me to take the fall. So. What do you want to know?",
          qs: [
            { id: "q1", q: "Did you send Silas to Daniel's flat?", a: [["s1", "Never. Silas acts on his own."]] },
            { id: "q2", q: "Who is B?", a: [["s2", "I've never met her. Nobody has. She signs everything with a B."]] },
            { id: "q3", q: "What was Silas looking for?", a: [["s3", "How would I know? I run a building company."]] }
          ],
          breaks: [{ id: "b1", s: ["s1", "s3"], ev: ["silascall"], react: "...Fine. I sent Silas because she told me to. B wanted the ledger, the record of every payment the network ever made. Daniel copied it. Silas only found the laptop, and Daniel had wiped it clean.", gives: ["ledgerinfo"] }],
          pool: ["silascall", "schedule", "adrian1", "feeb", "vanlog", "invoice"],
          wrong: "Adrian sighs. 'If you want a deal, you'll have to do better than that.'",
          done: "B wants the ledger more than anything. And only Daniel has it." },
        { type: "think", title: "Think it through", ask: "Why does B want the ledger so badly?", show: ["ledgerinfo"],
          options: ["It lists every payment and who got it, so it can sink the whole network", "It's worth money to a collector", "It proves Daniel stole from his firm"], answer: 0,
          done: "Whoever finds Daniel first wins. We have to be first." }
      ],
      outro: "B wants the ledger Daniel copied. Whoever finds Daniel first wins." },

    { title: "Sara's Postcard", goal: "Work out where Daniel is hiding.", cast: ["sara"],
      brief: "Sara Cross runs into the agency holding a postcard. It came this morning: no name, a lake on the front. On the back: 'Weather is fine. Still feeding the ducks. Don't worry. D.'\n\nYou go back to her flat with her.",
      steps: [
        { type: "search", title: "Search Sara's kitchen", ask: "Mark the 3 clues that show where Daniel is.",
          items: [
            ["card", "🖼️", "The postcard", "Postmark: Pinewood Lake. 'Still feeding the ducks.'", 1],
            ["photo", "📷", "Photo on the fridge", "Daniel and Sara as kids, feeding ducks by a wooden cabin. On the back: 'Grandpa Joe's, Pinewood Lake'.", 1],
            ["times", "🗺️", "Bus timetable", "North line. Stop 11: Pinewood Lake. Last bus from the city: 9:20 PM.", 1],
            ["invite", "💌", "Wedding invitation", "A cousin's wedding in the city, next month.", 0],
            ["keys", "🔑", "Car keys", "Sara's. She hasn't driven since Thursday.", 0],
            ["menu", "🍕", "Takeaway menu", "Pizza Roma. Daniel's favourite, Sara says.", 0],
            ["report", "📚", "Old school report", "Daniel, age 12: 'Asks too many questions.'", 0]
          ],
          done: "The postcard, the cabin and the 9:20 bus. Daniel went to his grandfather's cabin at Pinewood Lake.", gives: ["pinewood"] },
        { type: "think", title: "Think it through", ask: "Who should you tell before you drive to Pinewood Lake?",
          options: ["Only our own team. B's people are hunting him too", "Helen Marsh, his boss. She's been so worried", "The newspapers"], answer: 0,
          done: "Good. Every time someone outside the team learned something, B knew it within hours." }
      ],
      outro: "Daniel is at his grandfather's cabin at Pinewood Lake. Only the team knows." },

    { title: "The Man at the Lake", goal: "Find out what Daniel knows, and who he told.", cast: ["daniel", "evelyn"],
      brief: "The cabin sits at the end of a dirt road, smoke rising from the chimney. Daniel Cross opens the door with a fire poker in his hand: thin, unshaven and very scared.\n\nEvelyn sits with him by the stove. 'You're safe now. Talk to us.'",
      steps: [
        { type: "talk", who: "daniel", title: "Talk to Daniel Cross", ask: "Daniel doesn't trust anyone yet. Show him what you already know.",
          intro: "How did you find me? Who else knows I'm here?",
          qs: [
            { id: "q1", q: "Why did you run?", a: [["s1", "I got scared, that's all. Stress at work."]] },
            { id: "q2", q: "Did you take anything from work?", a: [["s2", "Nothing. I just packed a bag and left."]] },
            { id: "q3", q: "Who knew what you'd found?", a: [["s3", "Nobody. I kept it to myself."]] }
          ],
          breaks: [
            { id: "b1", s: ["s1", "s3"], ev: ["phonelog"], react: "...The call. At 6:30 a voice I didn't know said: 'Stop digging or you'll regret it.' They knew about my files. On Wednesday I'd told just my boss, Helen Marsh, and emailed the audit team's mailbox. Three people read that mailbox: Helen, her assistant June Park, and Cal Brooks in IT.", gives: ["told"] },
            { id: "b2", s: ["s2"], ev: ["ledgerinfo"], react: "Yes. I copied the ledger before I ran. It's hidden here. It's the only proof there is." }
          ],
          pool: ["phonelog", "ledgerinfo", "saraquote", "busticket", "doorcam", "pinewood"],
          wrong: "Daniel stares at you. 'That's not... that's not what happened.'",
          done: "Daniel told only two places about the ledger, and the network knew within a day." },
        { type: "think", title: "Think it through", ask: "Who could have warned the network about Daniel?", show: ["told"],
          options: ["Someone who could read his news on Wednesday: Helen, June or Cal", "Anyone at Blackstone", "Sara"], answer: 0,
          done: "Three names. One of them is B, or works for B." }
      ],
      outro: "Daniel told only Helen Marsh, and a mailbox read by Helen, June Park and Cal Brooks." },

    { title: "The Missing Ledger", goal: "Find the ledger and see where B's money goes.", cast: ["daniel", "nia"],
      brief: "Daniel won't say where he hid the ledger. 'If they took me, I didn't want to know myself.' He just smiles at the window, at the ducks on the lake.",
      steps: [
        { type: "search", title: "Search the cabin", ask: "Mark the 2 places where Daniel hid the ledger.",
          items: [
            ["feed", "🦆", "Duck feeder by the jetty", "The lid has four shiny new screws. The rest of it is rusty.", 1],
            ["board", "🪵", "Floorboard by the stove", "Loose, with fresh scratches along the edge.", 1],
            ["shelf", "📚", "Bookshelf", "Bird books and old maps. Dusty and untouched.", 0],
            ["stove", "🔥", "Stove", "Warm ash. Nothing in it but wood.", 0],
            ["bed", "🛏️", "Bed", "Blankets, a torch and a kitchen knife under the pillow.", 0],
            ["box", "🎣", "Fishing box", "Hooks, line and a rusty knife.", 0],
            ["tin", "🥫", "Coffee tin", "Coffee. Just coffee.", 0]
          ],
          done: "A memory stick in the duck feeder, and printed pages under the floor. 'Still feeding the ducks', indeed.", gives: ["ledger"] },
        { type: "compare", title: "Read the ledger", ask: "Tap the line that tells you where B's money ends up.",
          docs: [{ title: "The ledger, March", rows: [
            ["l1", "3 Mar", "Kestrel → M. Reed, $40,000 · approved B"],
            ["l2", "4 Mar", "Greyfield → G. Holt, $5,000 · approved B"],
            ["l3", "4 Mar", "Greyfield → L. Varga, $4,000 · approved B"],
            ["l4", "6 Mar", "Greyfield → O. Pike, $2,000 · approved B"],
            ["l5", "7 Mar", "Mercer → B's fee, $6,660 · by courier to Suite 9, 40 Mercer Street"]
          ] }],
          answer: ["l5"],
          done: "Every fee for B goes by courier to Suite 9, 40 Mercer Street.", gives: ["suite9"] },
        { type: "think", title: "Think it through", ask: "40 Mercer Street. Where have you seen that address before?", show: ["suite9"],
          options: ["On Helen Marsh's missing-person report: it's Ashford & Lane's building", "On Kestrel's van log", "On Greyfield's rent payment"], answer: 0,
          done: "B's money goes to Ashford & Lane's own building. The building directory says Suite 9 is the partners' floor." }
      ],
      outro: "B's fees go to Suite 9, 40 Mercer Street: the partners' floor at Ashford & Lane." },

    { title: "The Final Suspects", goal: "Clear the innocent and find out who had B's phone.", cast: ["june", "helen"], gives: ["phonebuy"],
      brief: "Ashford & Lane's partners' floor. Two partners have signed as 'H.M.' and three people could read Daniel's email. A phone shop has also sent a receipt for three prepaid phones bought on 1 March.\n\nHelen Marsh's assistant, June Park, meets you in the lobby with a polite smile.",
      steps: [
        { type: "talk", who: "june", title: "Talk to June Park", ask: "June knows more than she says. Catch the statement that doesn't fit.",
          intro: "I can give you ten minutes. The partners are very busy today.",
          qs: [
            { id: "q1", q: "Have you bought any phones for anyone?", a: [["s1", "Never. Everyone here has a company phone."]] },
            { id: "q2", q: "What about Harold Mead?", a: [["s2", "Mr. Mead retired last year. He's been in hospital since January, poor man."]] },
            { id: "q3", q: "Who reads the audit mailbox?", a: [["s3", "Helen, me, and Cal in IT. Cal has been in Singapore all month."]] },
            { id: "q4", q: "Who gets the courier parcels for Suite 9?", a: [["s4", "The partners. I just sign for them."]] }
          ],
          breaks: [{ id: "b1", s: ["s1"], ev: ["phonebuy"], react: "...Helen asked me to buy them. For 'private clients', she said. She asks for new ones every month. I gave all three to her the same day. I didn't know what they were for, I swear.", gives: ["june"] }],
          pool: ["phonebuy", "suite9", "told", "hmsign", "ledger", "confession"],
          wrong: "June smiles politely. 'I'm not sure what you mean.'",
          done: "June bought the phones. Helen got all three. And Harold Mead and Cal Brooks were nowhere near any of it." },
        { type: "link", title: "Match the phones", ask: "Three prepaid phones, three users. Match each number to who used it.",
          left: [["l1", "0770-555-0148"], ["l2", "0770-555-0149"], ["l3", "0770-555-0150"]],
          right: [["r1", "Silas Crane", "Found on him"], ["r2", "Marcus Reed", "Handed over at his arrest"], ["r3", "The woman who threatened Daniel and coached Owen", "Never seen"], ["r4", "June Park", "Bought them"], ["r5", "Adrian Cole", "Got Silas's call"]],
          pairs: { l1: "r3", l2: "r1", l3: "r2" },
          done: "0149 for Silas, 0150 for Marcus, and 0148 kept for herself: the voice that threatened Daniel, coached Owen and ran Marcus." },
        { type: "think", title: "Think it through", ask: "Harold Mead is in hospital and Cal Brooks is in Singapore. June gave all three phones to one person. Who is B?", show: ["june", "hmsign", "told"],
          options: ["Helen Marsh", "June Park", "Harold Mead", "Cal Brooks"], answer: 0,
          done: "Evelyn goes pale. 'Helen. We've had dinner every month for twenty years.' Then she stands up and reaches for her coat." }
      ],
      outro: "Helen Marsh got all three phones and kept 0148 for herself. Now prove it." },

    { title: "The Broker", goal: "Expose B and prove the whole conspiracy.", cast: ["helen", "evelyn"],
      brief: "Evelyn walks into Suite 9 with you, without knocking. Helen Marsh looks up from her desk, calm as ever. 'Evelyn. And the rookie. Have you found poor Daniel?'\n\nLay out the whole case. Every piece.",
      steps: [
        { type: "timeline", title: "Rebuild Helen's plan", ask: "Put the conspiracy in order, from the first phone to the missing-person report.",
          events: [
            ["e1", "June buys three prepaid phones for Helen.", "1 Mar"],
            ["e2", "Kestrel pays off Marcus's debts.", ""],
            ["e3", "Daniel tells Helen what he found in Blackstone's books.", "Wed 5 Mar"],
            ["e4", "Helen threatens Daniel from 0148.", "Thu 6:30 PM"],
            ["e5", "Silas searches the flat and takes the laptop.", ""],
            ["e6", "Helen gives Owen his story.", ""],
            ["e7", "Helen reports Daniel missing.", "Sat 9:00 AM"]
          ],
          done: "Every step of it, in her order." },
        { type: "link", title: "What each piece proves", ask: "Match each piece of evidence to what it proves about Helen.",
          left: [["l1", "Her report: 'his work laptop is missing'"], ["l2", "Three clean audits signed 'H.M.'"], ["l3", "Suite 9, 40 Mercer Street"], ["l4", "June's three prepaid phones"]],
          right: [["r1", "She knew the laptop was gone, though she'd never been inside the flat"], ["r2", "She passed the fake companies as clean"], ["r3", "B's fees came to her office"], ["r4", "She had the phone that threatened Daniel and coached Owen"], ["r5", "She taught Daniel everything he knows"]],
          pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
          done: "Four pieces, four locks. Helen stops smiling." },
        { type: "accuse", title: "Expose the Broker", ask: "Who is B, the person who ran the whole network?",
          who: ["helen", "june", "adrian", "evelyn"],
          notes: { helen: "Senior partner, Ashford & Lane.", june: "Helen's assistant.", adrian: "Chief executive, Blackstone.", evelyn: "Head of the agency." },
          answer: "helen",
          proofAsk: "Prove it: pick 3 pieces of evidence that point to Helen.",
          pool: ["report", "hmsign", "suite9", "june", "told", "confession", "feeb", "adrian1", "silascall"], proof: ["report", "hmsign", "suite9", "june", "told", "confession"], need: 3,
          motive: { ask: "Why did Helen report Daniel missing herself?", options: ["She was truly worried about him", "To use our agency to find Daniel and the ledger for her", "To get Adrian arrested"], answer: 1 },
          done: "Helen Marsh, B, the Broker, is under arrest." }
      ],
      outro: "" }
  ],

  /* The Broker board in the dossier: [who, shown after mission, ruled out after mission (0 = never), note] */
  board: [
    ["adrian", 16, 25, "Runs Blackstone's money. Ruled out: he answers to B himself."],
    ["helen", 16, 0, "Daniel's boss. She reported him missing."],
    ["mead", 17, 29, "Signs as 'H.M.' too, like Helen. Ruled out: in hospital since January."],
    ["evelyn", 20, 23, "Her keycard was used the night of the leak. Ruled out: at dinner, her card was copied."],
    ["marcus", 24, 24, "The inside man. Ruled out: he worked for B and never saw her face."],
    ["june", 27, 29, "Can read Daniel's mail. Ruled out: she bought the phones but gave them all to Helen."],
    ["cal", 27, 29, "Can read Daniel's mail. Ruled out: in Singapore all month."]
  ],

  /* The Timeline tab in the dossier: [shown after mission, day, time ("" = none), what happened], in the order it
     happened. Each line only says what the player knows by then, so it stays true later and spoils nothing. */
  timeline: [
    [29, "Sat 1 March", "", "June Park buys three prepaid phones, 0148, 0149 and 0150, and gives all three to Helen Marsh."],
    [15, "Sun 2 March", "", "Northgate 'delivers' $84,000 of steel to Blackstone on a day the port is shut. The steel never existed."],
    [18, "Mon 3 March", "", "Daniel starts auditing Blackstone. He meets Adrian Cole every day until Wednesday."],
    [24, "Mon 3 March", "", "Kestrel Logistics pays Marcus Reed $40,000 for 'consulting'. His debts are gone the next day."],
    [16, "Mon 3 March", "", "Northgate passes the $84,000 to Greyfield Trading."],
    [13, "Tue 4 March", "", "Greyfield pays $5,000 to Grant Holt (planning board) and $4,000 to Lisa Varga (port customs) for 'advice'."],
    [27, "Wed 5 March", "", "Daniel tells Helen Marsh what he found and emails the audit mailbox, which Helen, June Park and Cal Brooks can read."],
    [3, "Thu 6 March", "6:30 PM", "Prepaid phone 0148 calls Daniel. He shouts: 'How do you know about the files?'"],
    [5, "Thu 6 March", "7:10 PM", "Daniel calls his sister Sara: he's going away, and she mustn't trust anyone at his work."],
    [9, "Thu 6 March", "8:30 PM", "Owen Pike switches off his taxi app."],
    [1, "Thu 6 March", "8:52 PM", "Daniel leaves his building with a small sports bag, without his laptop bag."],
    [8, "Thu 6 March", "8:55 PM", "Bill Hanley's taxi picks Daniel up and drops him at the bus station at 9:05."],
    [6, "Thu 6 March", "9:00 PM", "Silas Crane, Blackstone's head of security, signs out Kestrel van KL-2207."],
    [8, "Thu 6 March", "9:10 PM", "Daniel pays cash for an open ticket on the north bus line."],
    [9, "Thu 6 March", "9:15 PM", "Owen sits in the Corner Grill with a man in a grey coat who wears a Blackstone security badge."],
    [8, "Thu 6 March", "9:20 PM", "Daniel leaves town on the north bus."],
    [4, "Thu 6 March", "9:30 PM", "Van KL-2207 parks outside Daniel's building. It stays until 10 PM."],
    [2, "Thu 6 March", "9:41 PM", "Someone searching Daniel's flat knocks his watch off the shelf. It stops at 9:41."],
    [10, "Thu 6 March", "9:45 PM", "Greyfield Trading pays Owen $2,000."],
    [3, "Thu 6 March", "9:55 PM", "A man in a grey coat leaves Daniel's flat with his laptop bag."],
    [9, "Thu 6 March", "9:58 PM", "Owen's taxi app comes back on. He drives a fare from the Grill to the airport."],
    [25, "Thu 6 March", "10:05 PM", "Silas calls Adrian Cole from prepaid phone 0149: 'It's not here. Only the laptop.'"],
    [16, "Fri 7 March", "", "Greyfield sends $66,600 to Mercer Holdings. 10% of everything Mercer gets goes to someone called B."],
    [11, "Sat 8 March", "7:45 AM", "A woman calls Owen from 0148 and gives him his story: the train, the blonde, the coast."],
    [7, "Sat 8 March", "8:02 AM", "Owen calls our tip line to say he saw Daniel board a train to the coast."],
    [1, "Sat 8 March", "9:00 AM", "Helen Marsh reports Daniel missing and writes that his work laptop is missing."],
    [22, "Tue 11 March", "6:15 PM", "Evelyn chairs a staff meeting until 7:30. Her bag, with her keycard, stays in her empty office."],
    [23, "Tue 11 March", "7:02 PM", "Marcus walks into Evelyn's empty office with a folder and comes out at 7:06."],
    [22, "Tue 11 March", "8:05 PM", "Evelyn has dinner with Helen Marsh until 10:40. Helen asks how the Cross case is going."],
    [20, "Tue 11 March", "9:08 PM", "Evelyn's keycard comes into our building. It leaves at 9:25."],
    [19, "Tue 11 March", "9:12 PM", "Someone copies the raid plan from Daniel's case file in our evidence room."],
    [21, "Wed 12 March", "2:14 AM", "Someone edits the lobby photo to add a red scarf and frame Evelyn."],
    [17, "Fri 14 March", "6:00 AM", "We raid Greyfield at 12 Dock Road. The office was cleared minutes before."],
    [25, "Later", "", "Three days after Marcus's arrest, every Mercer account is emptied overnight."],
    [26, "Later", "", "Sara gets a postcard from Pinewood Lake. Daniel is at his grandfather's cabin."],
    [27, "Later", "", "You find Daniel alive at Pinewood Lake."],
    [30, "Later", "", "Helen Marsh is arrested in Suite 9. She is B, the Broker."]
  ],

  ending: {
    title: "Case closed",
    text: "Helen Marsh is arrested in Suite 9. For years she ran the network from inside the firm that was meant to check it: her audits passed the fake companies, and 10% of every bribe came back to her. When Daniel told her what he'd found, she threatened him, sent Silas for the ledger, fed Owen his story and reported Daniel missing herself, so our agency would find him for her. Marcus told her every step we took.\n\nThe ledger goes to the city prosecutor. Grant Holt, Lisa Varga, Adrian Cole, Silas Crane and Marcus Reed are charged. Daniel comes home.\n\nEvelyn leaves a note on your desk: 'Twenty years I trusted her. You didn't. Good work, detective.'",
    hook: "One last thing. In Helen's safe: a passport in another name, and a list headed 'Witnesses, moved'. Six names. One is circled in red. Book 2, The Vanishing Witness, is coming."
  }
};
