/*
  LIARHUNT — hand-written case library
  -----------------------------------------
  These cases feed the daily game. Each day uses:
    slot 2 -> medium[day - 1]
    slot 4 -> hard[day - 1]
    slot 5 -> twist[day - 1]
  (slots 1 and 3 come from the case generator in engine.js)
  When a list runs out, the generator fills that slot automatically,
  so the game never runs out of cases.

  Case format
    title     short name for the case
    setup     one or two sentences: what happened
    clues     facts the police confirmed (always true, except the planted one in "planted" twists)
    suspects  exactly 3 people: name, role, and what they say
    answer    index (0, 1 or 2) of the liar
              - mode "honest":  index of the ONLY honest suspect (the other two lie)
              - mode "planted": index of the FAKE clue (all three suspects tell the truth)
    proof     what the player must tap after accusing, to prove it (indexes into the lists above)
              - mode "liar":    the clue(s) that break the liar's story, e.g. [0] or [0, 2] when it takes two facts together
              - mode "honest":  the clue(s) that break the two liars' stories
              - mode "planted": the suspect whose (true) story shows the fake clue
    alt       (optional) other sets of the same size that also prove it, e.g. [[1]]
    why       the explanation shown after the player answers
    twist     (optional) one extra line revealed after a twist case

  The game shuffles suspects and clues for every player the same way,
  so the answer is not always in the same position.
  Run `node tools/check-cases.mjs` after editing to catch mistakes.
*/
window.WL_CASES = {
  medium: [
    {
      title: "The Missing Violin",
      setup: "A rare violin vanished from the music shop on Fifth Street last night.",
      clues: [
        "It rained hard from 6 PM until midnight.",
        "The shop's alarm was switched off at 9:10 PM.",
        "The back door can only be bolted from the inside."
      ],
      suspects: [
        { name: "Victor", role: "Delivery driver", says: "I dropped off boxes at eight and walked home under a sky full of stars." },
        { name: "Mira", role: "Shop assistant", says: "I locked the front door at seven and caught the bus with my umbrella." },
        { name: "Theo", role: "Night cleaner", says: "I start work at ten, so I wasn't even in the building at nine." }
      ],
      answer: 0,
      proof: [0],
      why: "It rained hard from 6 PM to midnight. Victor could not have walked home under a sky full of stars at eight."
    },
    {
      title: "Blackout at the Gallery",
      setup: "A small gold statue disappeared from the Lumen Gallery during a party.",
      clues: [
        "A blackout hit the whole street from 8:30 to 9:30 PM.",
        "The statue was last seen at 8:15 PM.",
        "Guests' phones still worked during the blackout."
      ],
      suspects: [
        { name: "Anika", role: "Painter", says: "When the lights died, I used my phone torch to find the stairs." },
        { name: "Ravi", role: "Waiter", says: "At nine I was in the kitchen, heating soup in the microwave." },
        { name: "Lena", role: "Art collector", says: "I stood by the window and waited for the lights to come back." }
      ],
      answer: 1,
      proof: [0],
      why: "There was no electricity from 8:30 to 9:30 PM. Ravi could not have used a microwave at nine."
    },
    {
      title: "The Ninth Floor",
      setup: "Someone broke into Apartment 9C while its owner was away.",
      clues: [
        "The building's elevator has been broken since Monday.",
        "The break-in happened on Wednesday evening.",
        "Apartment 9C is on the ninth floor."
      ],
      suspects: [
        { name: "Joon", role: "Neighbor in 9A", says: "I heard nothing. I was asleep by ten." },
        { name: "Carla", role: "Pizza courier", says: "I took the elevator up to the ninth floor with a pizza around eight." },
        { name: "Omar", role: "Building manager", says: "I spent the evening fixing the boiler in the basement." }
      ],
      answer: 1,
      proof: [0],
      why: "The elevator has been broken since Monday, and the break-in was on Wednesday. Carla could not have ridden it up."
    },
    {
      title: "The Monday Coffee",
      setup: "A laptop full of secrets was stolen from a car parked on Mill Road.",
      clues: [
        "The theft happened on Monday at about 4 PM.",
        "Café Rosa on Mill Road is closed every Monday.",
        "The car was parked outside the bakery."
      ],
      suspects: [
        { name: "Felix", role: "Student", says: "I was at the library on the other side of town all afternoon." },
        { name: "Priya", role: "Accountant", says: "I was in a meeting until five. My whole team saw me." },
        { name: "Dmitri", role: "Artist", says: "At four I was sitting in Café Rosa, drawing people walking by." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Café Rosa is closed on Mondays, and the theft happened on a Monday. Dmitri could not have been sitting inside."
    },
    {
      title: "No Signal",
      setup: "Someone made a threatening phone call to the mayor's office at 7 PM.",
      clues: [
        "The call lasted two minutes.",
        "There is no phone signal or Wi-Fi in the basement of the Arcadia Hotel.",
        "All three suspects were at the Arcadia Hotel at 7 PM."
      ],
      suspects: [
        { name: "Hana", role: "Hotel cook", says: "At seven I was in the kitchen on the ground floor, frying onions." },
        { name: "Bruno", role: "Hotel guest", says: "I was down in the basement gym, on a video call with my brother." },
        { name: "Sofia", role: "Receptionist", says: "I was at the front desk, checking in a family of five." }
      ],
      answer: 1,
      proof: [1],
      why: "There is no signal or Wi-Fi in the hotel basement. Bruno could not have been on a video call down there."
    },
    {
      title: "Wet Paint",
      setup: "A box of jewelry vanished from Mrs. Kaur's flat on the second floor.",
      clues: [
        "The hallway walls were painted that afternoon.",
        "The paint was still wet at night, and not one mark was found on it.",
        "Mrs. Kaur's door was found open at 10 PM."
      ],
      suspects: [
        { name: "Liam", role: "Painter", says: "I finished painting at four and went straight home." },
        { name: "Zara", role: "Neighbor", says: "I leaned on the hallway wall for ten minutes, scrolling on my phone." },
        { name: "Kofi", role: "Mrs. Kaur's nephew", says: "I visited my aunt at six and left before seven." }
      ],
      answer: 1,
      proof: [1],
      why: "The wet paint had not one mark on it. If Zara had leaned on the wall for ten minutes, she would have left a big smudge."
    },
    {
      title: "Cash Only",
      setup: "Someone stole the tip jar from the Blue Fox bar on Friday night.",
      clues: [
        "The bar's card machine was broken all Friday night.",
        "Every customer had to pay in cash.",
        "The tip jar vanished just before midnight."
      ],
      suspects: [
        { name: "Ines", role: "Regular customer", says: "I had to run to the cash machine down the street before I could order." },
        { name: "Marco", role: "Tourist", says: "I paid for my drinks with my card, then left at eleven." },
        { name: "Gwen", role: "Bartender", says: "I served drinks all night and never left the counter." }
      ],
      answer: 1,
      proof: [0],
      why: "The card machine was broken all night, so Marco could not have paid with his card."
    },
    {
      title: "The Closed Bridge",
      setup: "A truck full of phones disappeared from a warehouse across the river.",
      clues: [
        "The Old Bridge was closed all night for repairs.",
        "The New Bridge is a 40-minute drive away.",
        "The warehouse is just across the Old Bridge from town."
      ],
      suspects: [
        { name: "Nadia", role: "Truck driver", says: "I drove over the Old Bridge at ten to pick up my last load." },
        { name: "Pedro", role: "Guard", says: "I sat in the guard hut all night, watching the gate camera." },
        { name: "Esther", role: "Warehouse manager", says: "I took the long way round, over the New Bridge. It took forever." }
      ],
      answer: 0,
      proof: [0],
      why: "The Old Bridge was closed all night, so Nadia could not have driven over it at ten."
    },
    {
      title: "The Empty Pool",
      setup: "A gold medal was stolen from the locker room at the city swimming pool.",
      clues: [
        "The pool has been drained for cleaning all week.",
        "The medal belonged to a swimming coach.",
        "Only members can enter the locker room."
      ],
      suspects: [
        { name: "Yuki", role: "Swimmer", says: "I came to train, saw the pool was empty, and went for a run instead." },
        { name: "Hugo", role: "Lifeguard", says: "I sat by the empty pool reading a book. Nobody to rescue this week." },
        { name: "Selin", role: "Member", says: "I swam twenty laps this morning before work. The water was cold!" }
      ],
      answer: 2,
      proof: [0],
      why: "The pool has been empty all week. Selin could not have swum twenty laps this morning."
    },
    {
      title: "The Silent Dog",
      setup: "Someone took a painting from the Grant family's country house.",
      clues: [
        "Rex, the Grants' guard dog, barks loudly at every stranger.",
        "Rex did not bark once all night.",
        "The painting was taken between midnight and 3 AM."
      ],
      suspects: [
        { name: "Tom", role: "Gardener", says: "Rex knows me. He just wagged his tail when I locked the shed at midnight." },
        { name: "Amara", role: "House guest", says: "I couldn't sleep. At two I heard Rex barking like crazy in the garden." },
        { name: "Mr. Grant", role: "Owner", says: "I slept straight through the night. Didn't hear a thing." }
      ],
      answer: 1,
      proof: [1],
      why: "Rex didn't bark once all night, but Amara says she heard him barking like crazy at two."
    },
    {
      title: "The Stopped Clock",
      setup: "A suitcase full of cash went missing at Westgate train station.",
      clues: [
        "The big station clock has been stuck at 6:00 since Sunday.",
        "The suitcase vanished on Tuesday evening.",
        "The station has no other clocks."
      ],
      suspects: [
        { name: "Arjun", role: "Porter", says: "The station clock showed 9:45 when I saw a man with a red suitcase." },
        { name: "Beatriz", role: "Ticket seller", says: "I sold tickets until nine, then counted the money." },
        { name: "Klaus", role: "Traveler", says: "My train was late, so I sat on a bench and read for an hour." }
      ],
      answer: 0,
      proof: [0],
      why: "The station clock has been stuck at 6:00 since Sunday. Arjun could not have seen it showing 9:45 on Tuesday."
    },
    {
      title: "The Last Show",
      setup: "A diamond ring disappeared from a car parked near the Starlight Cinema.",
      clues: [
        "The Starlight Cinema's last film started at 8 PM.",
        "It ended at 10 PM, and the doors were locked at 10:15.",
        "The ring was stolen around 11 PM."
      ],
      suspects: [
        { name: "Chen", role: "Student", says: "I watched the 8 PM film and walked home when it ended." },
        { name: "Rosa", role: "Nurse", says: "I was at the hospital until midnight. My shift ran late." },
        { name: "Duke", role: "Mechanic", says: "I was inside the cinema, watching the 11 PM horror film." }
      ],
      answer: 2,
      proof: [0],
      why: "The last film started at 8 PM and the doors were locked at 10:15. There was no 11 PM film for Duke to watch."
    },
    {
      title: "Library Hours",
      setup: "A rare old map was cut out of a book at the city library.",
      clues: [
        "The library closed early, at 5 PM, for a staff party.",
        "The map was cut out sometime after 3 PM.",
        "Only someone inside the library could have done it."
      ],
      suspects: [
        { name: "Ola", role: "Student", says: "I studied there from two until it closed early." },
        { name: "Viktor", role: "Retired teacher", says: "I read newspapers in the library until about seven, then went home." },
        { name: "June", role: "Librarian", says: "I helped set up the party room from four until five." }
      ],
      answer: 1,
      proof: [0],
      why: "The library closed at 5 PM. Viktor could not have been reading there until seven."
    },
    {
      title: "Dry Taps",
      setup: "Someone stole a valuable watch from a hotel room on the third floor.",
      clues: [
        "The water in the whole hotel was off from 6 PM to 6 AM for pipe repairs.",
        "The watch was stolen during the night.",
        "Every guest got a note about the water."
      ],
      suspects: [
        { name: "Sami", role: "Guest in room 301", says: "I couldn't even brush my teeth before bed. The taps were dry." },
        { name: "Elena", role: "Guest in room 305", says: "I took a long hot shower at eleven, then went to sleep." },
        { name: "Grace", role: "Night porter", says: "I sat at the front desk and answered calls all night." }
      ],
      answer: 1,
      proof: [0],
      why: "The water was off from 6 PM to 6 AM. Elena could not have taken a shower at eleven."
    },
    {
      title: "The Internet Cut",
      setup: "A secret file was deleted from a computer at a game studio.",
      clues: [
        "The internet and mobile data were down across the whole neighborhood from 7 PM to 10 PM.",
        "The file was deleted at 8 PM by someone sitting at that computer.",
        "The studio is in that neighborhood."
      ],
      suspects: [
        { name: "Lucas", role: "Programmer", says: "I live in the same area. With no internet, I gave up working at seven." },
        { name: "Mei", role: "Artist", says: "At eight I was at home nearby, live-streaming a game for my followers." },
        { name: "Raj", role: "Studio boss", says: "I was at the airport, waiting for a flight to Delhi." }
      ],
      answer: 1,
      proof: [0],
      why: "The internet and mobile data were down in the neighborhood from 7 to 10 PM. Mei could not have been live-streaming from home nearby."
    },
    {
      title: "Sold Out",
      setup: "A wedding cake was ruined at the Sunrise Bakery the day before the big day.",
      clues: [
        "The Sunrise Bakery sold every loaf and cake by noon.",
        "The bakery stayed open until 6 PM with empty shelves.",
        "The ruined cake was found in the back room at 5 PM."
      ],
      suspects: [
        { name: "Paulo", role: "Baker", says: "I baked the wedding cake at dawn and left it in the back room." },
        { name: "Ivy", role: "Customer", says: "I bought a fresh loaf of bread there at 4 PM." },
        { name: "Hassan", role: "Delivery boy", says: "I came by at three, saw the empty shelves and left." }
      ],
      answer: 1,
      proof: [0],
      why: "The bakery sold everything by noon. Ivy could not have bought a fresh loaf at 4 PM."
    },
    {
      title: "Bus Strike",
      setup: "A scooter was stolen outside the Green Park post office.",
      clues: [
        "There were no buses in the whole city on Thursday because of a strike.",
        "The scooter was stolen on Thursday at lunchtime.",
        "Taxis and trains ran as normal."
      ],
      suspects: [
        { name: "Diego", role: "Postman", says: "I was sorting letters inside the post office all morning." },
        { name: "Asha", role: "Teacher", says: "I took the number 12 bus to Green Park for lunch with a friend." },
        { name: "Noah", role: "Student", says: "Because of the strike, I took the train and then walked." }
      ],
      answer: 1,
      proof: [0],
      why: "There were no buses at all on Thursday because of the strike. Asha could not have taken the number 12."
    },
    {
      title: "Lights Out on Lake Road",
      setup: "A purse was snatched on Lake Road late at night.",
      clues: [
        "Every street light on Lake Road was broken that night.",
        "Thick clouds hid the moon.",
        "The snatcher ran toward the station."
      ],
      suspects: [
        { name: "Erik", role: "Jogger", says: "It was so dark that I had to run with my phone torch on." },
        { name: "Fatima", role: "Witness", says: "The street lights were so bright that I saw the snatcher's face clearly." },
        { name: "Leo", role: "Shop owner", says: "I closed my shop at nine and drove home on a different road." }
      ],
      answer: 1,
      proof: [0],
      why: "Every street light on Lake Road was broken. Fatima could not have seen anyone under bright street lights."
    },
    {
      title: "The Fire Alarm",
      setup: "Money vanished from the cash box at the Kingsley office building.",
      clues: [
        "The fire alarm rang at 9 PM, loudly, on every floor.",
        "Everyone in the building had to wait outside for an hour.",
        "The cash box was on the fourth floor."
      ],
      suspects: [
        { name: "Amir", role: "Security guard", says: "I counted everyone outside in the parking lot. It took ages." },
        { name: "Clara", role: "Cleaner", says: "I cleaned the fourth floor all evening and heard nothing unusual." },
        { name: "Ben", role: "Lawyer", says: "I stood outside in the cold for an hour, waiting to go back in." }
      ],
      answer: 1,
      proof: [0],
      why: "The fire alarm rang loudly on every floor at 9 PM. Clara says she heard nothing unusual all evening."
    },
    {
      title: "The Parking Lot",
      setup: "A delivery van was broken into behind the Rivera Hotel.",
      clues: [
        "The hotel parking lot was closed all day for repairs.",
        "All cars had to park on the street.",
        "The van was parked on the street behind the hotel."
      ],
      suspects: [
        { name: "Simone", role: "Chef", says: "I parked on the street like everyone else." },
        { name: "Abdul", role: "Hotel guest", says: "I parked in my usual spot in the hotel parking lot and went to bed." },
        { name: "Pia", role: "Receptionist", says: "I came by bike, so parking wasn't a problem." }
      ],
      answer: 1,
      proof: [0],
      why: "The hotel parking lot was closed all day. Abdul could not have parked there."
    },
    {
      title: "Snowed In",
      setup: "A wooden sculpture was stolen from a mountain cabin.",
      clues: [
        "Heavy snow blocked the only road to the cabin by 7 PM.",
        "The sculpture was stolen at 9 PM.",
        "The sculpture stood on the fireplace shelf."
      ],
      suspects: [
        { name: "Ingrid", role: "Cabin owner", says: "I was inside all evening, watching the snow fall." },
        { name: "Marcus", role: "Ski guide", says: "I drove up the road to the cabin at eight to drop off firewood." },
        { name: "Tara", role: "Guest", says: "I arrived at six, just before the road was blocked." }
      ],
      answer: 1,
      proof: [0],
      why: "The only road was blocked by 7 PM. Marcus could not have driven up it at eight."
    },
    {
      title: "The Heatwave",
      setup: "Someone stole a famous recipe book from Chef Lopez's restaurant.",
      clues: [
        "It was the hottest night of the year: 37°C at midnight.",
        "The restaurant's fans were broken.",
        "The book went missing around 11 PM."
      ],
      suspects: [
        { name: "Nikhil", role: "Waiter", says: "I was sweating so much that I changed my shirt twice." },
        { name: "Olga", role: "Food critic", says: "I kept my thick winter coat on all evening because I was freezing." },
        { name: "Sam", role: "Dishwasher", says: "I stood by the open back door, trying to cool down." }
      ],
      answer: 1,
      proof: [0],
      why: "It was 37°C at midnight. Nobody was freezing that night, so Olga's story can't be true."
    },
    {
      title: "Thick Fog",
      setup: "A boat was stolen from the harbor in the middle of the night.",
      clues: [
        "Fog was so thick that night that you could not see five meters ahead.",
        "The boat was tied up at the far end of the pier, 200 meters from the harbor office.",
        "The harbor office has one window, facing the pier."
      ],
      suspects: [
        { name: "Arnav", role: "Harbor guard", says: "From the office window, I clearly saw a man untie the boat at the end of the pier." },
        { name: "Lucia", role: "Fisher", says: "I stayed home. Nobody goes out in fog like that." },
        { name: "Ken", role: "Sailor", says: "I walked along the pier holding the rail. I could barely see my own hands." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "You could not see five meters in that fog. Arnav could not have clearly seen something 200 meters away."
    },
    {
      title: "The Locked Roof",
      setup: "Someone dropped a flowerpot from the roof of Tower B and smashed a car.",
      clues: [
        "The door to the roof of Tower B is always locked.",
        "Only Mr. Ito, the caretaker, has a key.",
        "Mr. Ito was on holiday in Japan that week."
      ],
      suspects: [
        { name: "Kemal", role: "Resident", says: "I went up to the roof to make a phone call. The door was open." },
        { name: "Lucy", role: "Resident", says: "I tried the roof door once last year. It was locked, so I never went back." },
        { name: "Ade", role: "Delivery man", says: "I only went up to the fifth floor to deliver a parcel." }
      ],
      answer: 0,
      proof: [0],
      why: "The roof door is always locked, and the only key was in Japan with Mr. Ito. Kemal says he found it open."
    },
    {
      title: "The Cancelled Train",
      setup: "A briefcase was taken from a café at Central Station at 9:30 PM.",
      clues: [
        "The 9:00 PM train from Riverside was cancelled.",
        "It was the last train from Riverside that night.",
        "The café closes at 10 PM."
      ],
      suspects: [
        { name: "Monika", role: "Banker", says: "I sat in the café from nine, waiting for a friend." },
        { name: "Jae", role: "Salesman", says: "I arrived from Riverside on the 9:00 PM train, like always." },
        { name: "Rahul", role: "Barista", says: "I worked behind the counter until closing." }
      ],
      answer: 1,
      proof: [0],
      why: "The 9:00 PM train from Riverside was cancelled, and it was the last one. Jae could not have arrived on it."
    },
    {
      title: "The Silent Bell",
      setup: "The charity collection box disappeared from St. Mark's church hall on Saturday evening.",
      clues: [
        "The church bell has been broken for a month and hasn't rung once.",
        "The box was last seen on the hall table at 6:45 PM.",
        "Choir practice ended at 6:30 PM."
      ],
      suspects: [
        { name: "Grace", role: "Choir leader", says: "Practice finished at half past six and I went straight to the bus stop." },
        { name: "Tobias", role: "Volunteer", says: "I left the hall when the bell rang at seven. The box was still on the table then." },
        { name: "Hana", role: "Caretaker", says: "I locked up at eight. The hall was empty and the table was bare." }
      ],
      answer: 1,
      proof: [0],
      why: "The church bell has been broken for a month. Tobias couldn't have left the hall when it rang at seven."
    },
    {
      title: "The Wrong Platform",
      setup: "A violinist's case was taken from a bench at Northgate Station.",
      clues: [
        "Platform 2 was closed all day for repairs.",
        "The case was on a bench on Platform 1 at 4:10 PM.",
        "The 4:15 PM train left from Platform 1."
      ],
      suspects: [
        { name: "Arjun", role: "Commuter", says: "I caught the 4:15 from Platform 1. The case was on the bench as I got on." },
        { name: "Elif", role: "Florist", says: "I waited for my train on Platform 2. I never went near Platform 1." },
        { name: "Marcus", role: "Ticket inspector", says: "I checked tickets on the 4:15 until it left." }
      ],
      answer: 1,
      proof: [0],
      why: "Platform 2 was closed all day for repairs. Elif couldn't have waited there for a train."
    },
    {
      title: "No Bread Today",
      setup: "Someone emptied the till at Rosa's Bakery early on Tuesday morning.",
      clues: [
        "The ovens were broken all day Tuesday. No bread was baked.",
        "The till was full when Rosa closed at 7 PM on Monday.",
        "The back door alarm was switched off at 5:40 AM on Tuesday."
      ],
      suspects: [
        { name: "Dario", role: "Baker", says: "I came in at twenty to six and had the first hot loaves out by half past six." },
        { name: "Inés", role: "Cleaner", says: "I mopped the shop floor after closing on Monday and was home by nine." },
        { name: "Pablo", role: "Delivery driver", says: "I waited at the back door at six for bread that never came." }
      ],
      answer: 0,
      proof: [0],
      why: "The ovens were broken all day Tuesday and no bread was baked. Dario's hot loaves never existed."
    },
    {
      title: "The Reading Room",
      setup: "A laptop vanished from the reading room of the Elm Street library.",
      clues: [
        "The library's Wi-Fi was down from noon until closing.",
        "The laptop was last seen at 2 PM.",
        "The reading room was closed to the public from 3 PM to 4 PM for a school visit."
      ],
      suspects: [
        { name: "Freya", role: "Student", says: "I sat in the reading room from two until three and left when the school group arrived." },
        { name: "Rashid", role: "Retired teacher", says: "I spent the afternoon on the library Wi-Fi, video-calling my grandson." },
        { name: "Nell", role: "Librarian", says: "I showed the school group around the reading room from three to four." }
      ],
      answer: 1,
      proof: [0],
      why: "The Wi-Fi was down from noon until closing. Rashid couldn't have spent the afternoon video-calling on it."
    },
    {
      title: "Low Tide",
      setup: "A sailing trophy was taken from the harbour club's display case on Friday night.",
      clues: [
        "From 9 PM to 11 PM the harbour was too shallow for any boat.",
        "The display case was found open at 11:30 PM.",
        "The club's terrace lights stayed on all night."
      ],
      suspects: [
        { name: "Kenji", role: "Fisherman", says: "I sailed my boat into the harbour at ten and tied up by the club." },
        { name: "Maeve", role: "Bar manager", says: "I closed the bar at eleven and wiped the terrace tables under the lights." },
        { name: "Olu", role: "Sailor", says: "I waited on my boat outside the harbour until the water came back after eleven." }
      ],
      answer: 0,
      proof: [0],
      why: "From 9 PM to 11 PM the harbour was too shallow for boats. Kenji couldn't have sailed in at ten."
    },
    {
      title: "Cup Final",
      setup: "A signed football went missing from the stadium shop during the cup final.",
      clues: [
        "The match kicked off at 3 PM and finished at 4:50 PM.",
        "The stadium shop was closed during the match and reopened at 5 PM.",
        "The football was last seen in the shop window at 2:45 PM."
      ],
      suspects: [
        { name: "Bea", role: "Season-ticket holder", says: "I watched every minute of the match from my seat." },
        { name: "Callum", role: "Steward", says: "I stood at gate C for the whole match." },
        { name: "Dmitri", role: "Shop assistant", says: "I sold scarves in the shop all through the second half." }
      ],
      answer: 2,
      proof: [1],
      why: "The shop was closed for the whole match and only reopened at 5 PM. Dmitri couldn't have sold scarves there during the second half."
    },
    {
      title: "Thin Ice",
      setup: "A bag of cash went missing from the ticket office at the Northside ice rink.",
      clues: [
        "The rink closed early, at 6 PM, for repairs to the ice.",
        "The cash was counted at 5:30 PM and locked in the office.",
        "The car park gate was locked at 6:15 PM."
      ],
      suspects: [
        { name: "Lotte", role: "Skating coach", says: "I taught my seven o'clock class on the ice as usual." },
        { name: "Ravi", role: "Cashier", says: "I counted the cash at half past five and locked the office." },
        { name: "Jonah", role: "Driver", says: "I left the car park just before they locked the gate." }
      ],
      answer: 0,
      proof: [0],
      why: "The rink closed at 6 PM for repairs to the ice. Lotte couldn't have taught her seven o'clock class on it."
    },
    {
      title: "The Cold Hall",
      setup: "A box of tools vanished from the community hall on Tuesday evening, between 6 and 9 PM.",
      clues: [
        "The hall's heating broke on Monday. It was 3°C inside all Tuesday evening.",
        "The tools were last seen in the hall cupboard at 6 PM.",
        "The hall's side door was locked all evening."
      ],
      suspects: [
        { name: "Anwen", role: "Choir singer", says: "I sang with the choir in the hall at seven with my scarf and gloves on the whole time." },
        { name: "Bastian", role: "Caretaker", says: "I locked the side door on Monday and left it locked." },
        { name: "Coral", role: "Yoga teacher", says: "My class in the hall got so hot at eight that we opened every window." }
      ],
      answer: 2,
      proof: [0],
      why: "It was 3°C inside the hall all Tuesday evening because the heating was broken. Coral's class didn't get hot enough to open every window."
    },
    {
      title: "The Racing Bike",
      setup: "A racing bike was taken from the shed behind the sports club on Sunday morning.",
      clues: [
        "It rained without a break from 7 AM to noon on Sunday.",
        "The bike was in the shed at 8 AM.",
        "The club's café opened at 10 AM."
      ],
      suspects: [
        { name: "Dario", role: "Cyclist", says: "I rode the long loop from eight until eleven. The roads were bone dry." },
        { name: "Esme", role: "Café owner", says: "I opened the café at ten and served soup to soaked runners." },
        { name: "Faisal", role: "Groundsman", says: "I checked the shed at eight. The bike was still there." }
      ],
      answer: 0,
      proof: [0],
      why: "It rained without a break from 7 AM to noon. Dario couldn't have ridden from eight to eleven on bone-dry roads."
    },
    {
      title: "The Spelling Trophy",
      setup: "The spelling bee trophy disappeared from the school hall on Thursday afternoon.",
      clues: [
        "The school hall was locked from 1 PM to 4 PM while its floor was varnished.",
        "The trophy was on the stage at 12:30 PM.",
        "The school library stayed open until 5 PM."
      ],
      suspects: [
        { name: "Greta", role: "Teacher", says: "I marked homework in the library until five." },
        { name: "Hamid", role: "Pupil", says: "I practised my spelling on the stage at half past two, right next to the trophy." },
        { name: "Isla", role: "Cleaner", says: "I locked the hall at one so the varnish could dry." }
      ],
      answer: 1,
      proof: [0],
      why: "The hall was locked from 1 PM to 4 PM while the floor was varnished. Hamid couldn't have practised on the stage at half past two."
    },
    {
      title: "The Swapped Seascape",
      setup: "A small painting at the Hillcrest Gallery was swapped for a copy on Friday night, between 8 and 10 PM.",
      clues: [
        "A power cut hit every building on Gallery Row from 8 PM to 9:30 PM.",
        "The gallery's alarm runs on a battery and kept working during the power cut.",
        "The painting was checked at 7:45 PM."
      ],
      suspects: [
        { name: "Jun", role: "Security guard", says: "When the lights went out at eight, I checked the alarm panel by torchlight." },
        { name: "Kaia", role: "Neighbour", says: "At nine I was watching the news on TV in my flat on Gallery Row." },
        { name: "Lorcan", role: "Painter", says: "I was in my studio across town all evening. My lights stayed on." }
      ],
      answer: 1,
      proof: [0],
      why: "The power was out on Gallery Row from 8 PM to 9:30 PM. Kaia couldn't have watched TV in her flat there at nine."
    },
    {
      title: "The Missed Ferry",
      setup: "A tourist's wallet was taken at the harbor on Saturday, between 2 and 3 PM.",
      clues: [
        "Strong winds stopped every ferry on Saturday.",
        "The harbor café was open all afternoon.",
        "The wallet was on a café table at 1:50 PM."
      ],
      suspects: [
        { name: "Mabel", role: "Café owner", says: "I served tea all afternoon. Half my customers had come to catch a ferry that never ran." },
        { name: "Nils", role: "Deckhand", says: "I spent Saturday tying down the ferry so the wind didn't smash it." },
        { name: "Oriel", role: "Tourist", says: "I came over on the two o'clock ferry and walked straight up to the café." }
      ],
      answer: 2,
      proof: [0],
      why: "Strong winds stopped every ferry on Saturday. Oriel couldn't have come over on the two o'clock ferry."
    },
    {
      title: "The Prize Marrow",
      setup: "The prize marrow at the village show was slashed on Saturday morning, between 9 and 11 AM.",
      clues: [
        "The village bakery sold out of bread by 8 AM on Saturday.",
        "The show tent was closed to the public until 11 AM.",
        "The marrow was weighed and labelled at 8:45 AM."
      ],
      suspects: [
        { name: "Petra", role: "Judge", says: "I weighed the marrow at a quarter to nine and pinned on its label." },
        { name: "Quentin", role: "Farmer", says: "At half past nine I was at the bakery, buying the last two loaves." },
        { name: "Rhoda", role: "Neighbour", says: "I waited outside the tent until it opened at eleven." }
      ],
      answer: 1,
      proof: [0],
      why: "The bakery sold out of bread by 8 AM. Quentin couldn't have bought the last two loaves there at half past nine."
    },
    {
      title: "The Ninth Floor",
      setup: "Test results were stolen from the university lab on Wednesday night.",
      clues: [
        "The lab building's lifts were switched off at 6 PM every night that week.",
        "The lab is on the ninth floor.",
        "The stairwell doors were locked at 8 PM."
      ],
      suspects: [
        { name: "Sami", role: "Student", says: "I took the lift up to the lab at seven to fetch my laptop." },
        { name: "Tilda", role: "Professor", says: "I walked down nine flights of stairs at half past seven. My knees still hurt." },
        { name: "Ugo", role: "Security guard", says: "I locked the stairwell doors at eight on the dot." }
      ],
      answer: 0,
      proof: [0],
      why: "The lifts were switched off at 6 PM every night that week. Sami couldn't have taken the lift up at seven."
    },
    {
      title: "The Study Room",
      setup: "A laptop vanished from the Riverside library's study room on Monday evening.",
      clues: [
        "The library closed at 5 PM on Monday for a staff meeting.",
        "The laptop was left on a desk at 4:30 PM.",
        "The study room window doesn't open."
      ],
      suspects: [
        { name: "Vera", role: "Librarian", says: "I locked the doors at five and went to the staff meeting." },
        { name: "Wilf", role: "Student", says: "I studied in that room until half past six. It was lovely and quiet." },
        { name: "Xena", role: "Courier", says: "I dropped a parcel at the front desk at a quarter to five." }
      ],
      answer: 1,
      proof: [0],
      why: "The library closed at 5 PM on Monday. Wilf couldn't have studied there until half past six."
    },
    {
      title: "The Bait Shop Rod",
      setup: "A new fishing rod was stolen from the rack outside the harbor bait shop on Thursday evening.",
      clues: [
        "The pier was closed all Thursday while its planks were replaced.",
        "It was a clear, dry evening.",
        "The bait shop closed at 6 PM."
      ],
      suspects: [
        { name: "Yusra", role: "Bait shop owner", says: "I closed the shop at six and left the rods in the rack outside." },
        { name: "Zeke", role: "Angler", says: "I fished off the end of the pier all Thursday evening and caught three mackerel." },
        { name: "Alma", role: "Jogger", says: "I ran along the harbor wall at seven. Lovely clear evening." }
      ],
      answer: 1,
      proof: [0],
      why: "The pier was closed all Thursday while its planks were replaced. Zeke couldn't have fished off the end of it that evening."
    },
    {
      title: "The Cake Topper",
      setup: "The silver cake topper vanished from the reception hall at the Oakfield Hotel on Saturday night.",
      clues: [
        "The hotel's only lift was broken all weekend.",
        "The reception hall is on the fourth floor.",
        "The band played from 8 PM until midnight."
      ],
      suspects: [
        { name: "Bettina", role: "Waitress", says: "I took the lift up to the hall at nine with a tray of glasses." },
        { name: "Cormac", role: "Drummer", says: "We played from eight until midnight. My arms are still aching." },
        { name: "Delphine", role: "Guest", says: "I climbed four flights of stairs in high heels. Never again." }
      ],
      answer: 0,
      proof: [0],
      why: "The hotel's only lift was broken all weekend. Bettina couldn't have taken it up to the hall at nine."
    },
    {
      title: "The Champion's Ribbon",
      setup: "The champion's ribbon vanished from the prize table at the dog show on Sunday afternoon.",
      clues: [
        "Every dog had to stay on its lead all day at the show.",
        "The prize table was in the main tent.",
        "A thunderstorm hit the show at 2 PM and lasted an hour."
      ],
      suspects: [
        { name: "Edgar", role: "Dog owner", says: "My spaniel stayed on his lead all day, even when he saw a cat." },
        { name: "Fenna", role: "Judge", says: "I hung the ribbons on the prize table in the main tent at noon." },
        { name: "Gideon", role: "Visitor", says: "At two I sat on the grass in the sunshine eating my sandwiches." }
      ],
      answer: 2,
      proof: [2],
      why: "A thunderstorm hit the show at 2 PM and lasted an hour. Gideon couldn't have sat in the sunshine at two."
    },
    {
      title: "The Bakery Window",
      setup: "Someone threw a stone through the bakery window on Mill Lane on Tuesday night, at about 11 PM.",
      clues: [
        "Every street light on Mill Lane was broken on Tuesday night.",
        "The pub on the corner closed at 10:30 PM.",
        "The bakery's back door was locked."
      ],
      suspects: [
        { name: "Hester", role: "Barmaid", says: "I closed the pub at half past ten and walked home by torchlight." },
        { name: "Ike", role: "Student", says: "At eleven I was reading the poster in the bakery window under the Mill Lane street lights." },
        { name: "Joy", role: "Taxi driver", says: "I picked up the last pub customers at twenty to eleven." }
      ],
      answer: 1,
      proof: [0],
      why: "Every street light on Mill Lane was broken on Tuesday night. Ike couldn't have read the poster under them at eleven."
    },
    {
      title: "The Jam Stall",
      setup: "The tip jar went missing from the jam stall at the farmers' market on Saturday.",
      clues: [
        "The farmers' market only takes cash.",
        "The market ran from 8 AM to 1 PM.",
        "The jam stall sold out by 11 AM."
      ],
      suspects: [
        { name: "Kemal", role: "Beekeeper", says: "I sold honey next to the jam stall until the market closed at one." },
        { name: "Liesl", role: "Shopper", says: "I tapped my phone to pay for three jars of jam at ten." },
        { name: "Mungo", role: "Jam maker", says: "My jam was all gone by eleven, so I packed up early." }
      ],
      answer: 1,
      proof: [0],
      why: "The farmers' market only takes cash. Liesl couldn't have paid for her jam with her phone."
    },
    {
      title: "The Choir Folder",
      setup: "The choir's music folder vanished from St. Anne's church hall on Wednesday evening.",
      clues: [
        "The church bell is being repaired and hasn't rung for two weeks.",
        "Choir practice ran from 7 PM to 8:30 PM.",
        "The folder was on the piano at 7 PM."
      ],
      suspects: [
        { name: "Nadia", role: "Organist", says: "I put the folder on the piano just before seven." },
        { name: "Osric", role: "Bell ringer", says: "I rang the church bell at eight, like every Wednesday." },
        { name: "Perpetua", role: "Soprano", says: "We sang until half past eight and then went for chips." }
      ],
      answer: 1,
      proof: [0],
      why: "The church bell is being repaired and hasn't rung for two weeks. Osric couldn't have rung it at eight."
    }
  ],

  hard: [
    {
      title: "The Long Walk",
      setup: "A gold chain was stolen from a jewelry shop in the evening.",
      clues: [
        "The jewelry shop is a 30-minute walk from the Riverside Cinema.",
        "The cinema's 6:30 PM film ended at 8:15 PM.",
        "The robbery was reported at 9:00 PM."
      ],
      suspects: [
        { name: "Ali", role: "Bus driver", says: "I watched the whole 6:30 film, then walked straight home." },
        { name: "Bianca", role: "Florist", says: "I watched the 6:30 film to the very end, then walked to the jewelry shop. I got there at 8:20." },
        { name: "Caleb", role: "Chef", says: "I was at my brother's birthday dinner from seven to ten." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "The film ended at 8:15 PM and the shop is a 30-minute walk away. Bianca could not have reached it before 8:45."
    },
    {
      title: "Knows Too Much",
      setup: "Something precious was taken from the Patel family's safe. The police only said that \"something was stolen.\"",
      clues: [
        "The stolen item was a pearl necklace.",
        "Only the Patel family and the police know what was taken.",
        "The safe was opened between 1 AM and 4 AM."
      ],
      suspects: [
        { name: "Gopal", role: "Driver", says: "I was asleep in the staff room. I didn't hear anything." },
        { name: "Rita", role: "Housekeeper", says: "I have no idea what was stolen. I just hope they find that pearl necklace soon." },
        { name: "Sunil", role: "Cook", says: "I left at ten and spent the night at my cousin's place." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "Rita says she has no idea what was stolen, then names the pearl necklace. Only the family and the police knew that."
    },
    {
      title: "After Sunset",
      setup: "A bike was stolen from a garden on Sunflower Lane at 7:30 PM.",
      clues: [
        "The sun set at 6:15 PM that day.",
        "The garden has no lights.",
        "The bike was blue with a white seat."
      ],
      suspects: [
        { name: "Hiro", role: "Neighbor", says: "At 7:30 I was cooking dinner with the radio on." },
        { name: "Nell", role: "Neighbor", says: "At 7:30 I saw a man ride off. His sunglasses flashed in the bright sun." },
        { name: "Owen", role: "Dog walker", says: "At 7:30 I was walking my dog with a flashlight." }
      ],
      answer: 1,
      proof: [0],
      why: "The sun set at 6:15 PM. At 7:30 there was no bright sun, so Nell could not have seen sunglasses flash in it."
    },
    {
      title: "Closed on Mondays",
      setup: "A small painting vanished from the Hartwell Museum. It was reported missing this morning.",
      clues: [
        "The Hartwell Museum is closed every Monday.",
        "A guard last saw the painting on Sunday evening.",
        "Today is Tuesday."
      ],
      suspects: [
        { name: "Wendy", role: "Visitor", says: "I visited the museum on Sunday afternoon with my kids." },
        { name: "Xavier", role: "Art student", says: "I visited the museum yesterday, and the painting was already gone." },
        { name: "Yara", role: "Office worker", says: "I've never been inside. I just walk past it on my way to work." }
      ],
      answer: 1,
      proof: [0, 2],
      why: "Today is Tuesday, so yesterday was Monday, and the museum is closed on Mondays. Xavier could not have visited."
    },
    {
      title: "Lost in Translation",
      setup: "A tourist's camera was stolen in a hotel lobby.",
      clues: [
        "The tourist, Mr. Sato, speaks only Japanese.",
        "Mr. Sato reported the theft through a translator.",
        "The camera was stolen at breakfast time."
      ],
      suspects: [
        { name: "Aditi", role: "Receptionist", says: "Mr. Sato used his hands to show me his camera was gone." },
        { name: "Bastian", role: "Guest", says: "Mr. Sato told me in perfect English that his camera had been taken." },
        { name: "Chloe", role: "Waiter", says: "I served Mr. Sato tea and toast. He pointed at the menu to order." }
      ],
      answer: 1,
      proof: [0],
      why: "Mr. Sato speaks only Japanese. He could not have told Bastian anything in perfect English."
    },
    {
      title: "Two Hours Long",
      setup: "A safe was opened at the Delgado office at 9:00 PM.",
      clues: [
        "The film Red Harbor is exactly 2 hours long.",
        "The Odeon showed Red Harbor only once that night, at 7:30 PM.",
        "The Delgado office is next door to the Odeon."
      ],
      suspects: [
        { name: "Gita", role: "Designer", says: "I watched Red Harbor at the Odeon from start to finish. I walked out at 9:30." },
        { name: "Hector", role: "Delgado's partner", says: "I saw Red Harbor at the Odeon and left the moment it ended, at 9:00 exactly." },
        { name: "Iris", role: "Neighbor", says: "I was home all evening. My neighbor can confirm it." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "The film started at 7:30 PM and is 2 hours long, so it ended at 9:30, not 9:00. Hector's timing is wrong."
    },
    {
      title: "The Hiding Place",
      setup: "Someone stole papers from Professor Hale's house. The police have not said where they were hidden.",
      clues: [
        "The papers were hidden behind a painting in the library.",
        "Only the professor and the police know where they were hidden.",
        "The house was empty from 2 PM to 5 PM."
      ],
      suspects: [
        { name: "Jonas", role: "Assistant", says: "I've worked here ten years and I still don't know where he keeps anything." },
        { name: "Kalinda", role: "Student", says: "I came by at four, knocked, and left when nobody answered." },
        { name: "Leon", role: "Neighbor", says: "I never go into that house. Anyway, who hides papers behind a painting?" }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Only the professor and the police knew the papers were behind a painting. Leon says he never goes in, yet he knows the hiding place."
    },
    {
      title: "The Ice Cream Van",
      setup: "A window was smashed at Alder School in the afternoon.",
      clues: [
        "The beach is a 20-minute drive from Alder School.",
        "Traffic was normal all afternoon.",
        "The window was smashed at exactly 3:00 PM."
      ],
      suspects: [
        { name: "Mateo", role: "Ice cream seller", says: "I sold ice cream at the beach until 2:50, then drove to the school. I got there at 3:30." },
        { name: "Nina", role: "Teacher", says: "I was teaching a math class from two to four." },
        { name: "Otto", role: "Painter", says: "I left the beach at 2:55 and reached the school at 3:05 to pick up my son." }
      ],
      answer: 2,
      proof: [0],
      why: "The drive takes 20 minutes and traffic was normal. Leaving the beach at 2:55, Otto could not have reached the school by 3:05."
    },
    {
      title: "The Cast",
      setup: "Someone climbed a drainpipe at the Rowe house and took a laptop on Friday night.",
      clues: [
        "The thief climbed a drainpipe to a second-floor window.",
        "Paulina's right leg has been in a cast for three weeks.",
        "The laptop was taken on Friday night."
      ],
      suspects: [
        { name: "Paulina", role: "Neighbor", says: "I can't climb anything with this cast. I was home watching TV." },
        { name: "Quentin", role: "Neighbor", says: "I played football with Paulina on Friday evening. She scored twice!" },
        { name: "Rhea", role: "Babysitter", says: "I was babysitting my sister's kids all night." }
      ],
      answer: 1,
      proof: [1],
      why: "Paulina's leg has been in a cast for three weeks. Quentin could not have played football with her on Friday."
    },
    {
      title: "The Red Hair",
      setup: "A necklace vanished from a shop yesterday. The camera caught the thief from behind.",
      clues: [
        "The shop's camera shows a woman with long red hair.",
        "Tess cut her hair very short last month.",
        "Tess's twin sister, Una, has long red hair."
      ],
      suspects: [
        { name: "Tess", role: "Twin", says: "My hair has been short since last month. It wasn't me on that camera." },
        { name: "Una", role: "Twin", says: "I was at my yoga class, then I went straight home." },
        { name: "Victor", role: "Shop owner", says: "I saw Tess outside the shop yesterday, brushing her long red hair." }
      ],
      answer: 2,
      proof: [1],
      why: "Tess cut her hair very short last month. Victor could not have seen her brushing long red hair yesterday."
    },
    {
      title: "The Flight to Oslo",
      setup: "A sculpture was stolen from a gallery in Lisbon on Saturday night.",
      clues: [
        "Ivan's flight from Lisbon to Oslo left on Friday morning.",
        "Ivan has stayed in Oslo since then.",
        "The sculpture was stolen on Saturday night."
      ],
      suspects: [
        { name: "Ivan", role: "Art dealer", says: "I've been in Oslo since Friday. I only heard about the theft on Sunday." },
        { name: "Juno", role: "Gallery visitor", says: "I had dinner with Ivan in Lisbon on Saturday night." },
        { name: "Kai", role: "Gallery owner", says: "I closed the gallery at eight and went home." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "Ivan flew to Oslo on Friday and stayed there. Juno could not have had dinner with him in Lisbon on Saturday."
    },
    {
      title: "Black and White",
      setup: "A thief broke into the Palmer warehouse. The guard says he watched the camera footage.",
      clues: [
        "The warehouse camera only records in black and white.",
        "There is no other camera.",
        "The thief broke in at 2 AM."
      ],
      suspects: [
        { name: "Lars", role: "Guard", says: "On the footage you can clearly see the thief's bright green jacket." },
        { name: "Maya", role: "Owner", says: "I was asleep at home when the guard called me at 2:30." },
        { name: "Ned", role: "Truck driver", says: "I park my truck there, but I wasn't working that night." }
      ],
      answer: 0,
      proof: [0],
      why: "The camera only records in black and white. Lars could not have seen a bright green jacket on the footage."
    },
    {
      title: "Soundproof",
      setup: "A violin was stolen from the storage room of a recording studio.",
      clues: [
        "Studio A is fully soundproof: no sound gets in or out.",
        "The storage room is right next to Studio A.",
        "The theft happened during a recording session in Studio A."
      ],
      suspects: [
        { name: "Opal", role: "Singer", says: "I was recording in Studio A all night. We didn't hear a thing." },
        { name: "Pavel", role: "Drummer", says: "From inside Studio A, I heard someone dragging a case in the storage room." },
        { name: "Quinn", role: "Manager", says: "I was in my office upstairs on a long phone call." }
      ],
      answer: 1,
      proof: [0],
      why: "Studio A is fully soundproof. Pavel could not have heard anything from the storage room."
    },
    {
      title: "The Receipt",
      setup: "A jewelry store was robbed at 4:15 PM.",
      clues: [
        "The Fresh Mart supermarket is a 40-minute drive from the jewelry store.",
        "Sara's Fresh Mart receipt shows she paid there at 4:00 PM.",
        "The robbery happened at 4:15 PM."
      ],
      suspects: [
        { name: "Sara", role: "Customer", says: "I was shopping at Fresh Mart. Here's my receipt." },
        { name: "Tobias", role: "Street seller", says: "I saw Sara outside the jewelry store at 4:10, carrying a big bag." },
        { name: "Uma", role: "Piano teacher", says: "I was teaching a piano lesson from three to five." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "Sara paid at Fresh Mart at 4:00 PM, and it's a 40-minute drive away. Tobias could not have seen her outside the jewelry store at 4:10."
    },
    {
      title: "The Peanut Pie",
      setup: "Someone swapped the prize-winning pie at the village fair for a fake.",
      clues: [
        "The prize pie was a peanut-butter pie.",
        "Vikram is so allergic to peanuts that touching them makes his hands swell up.",
        "The pie was swapped at noon."
      ],
      suspects: [
        { name: "Vikram", role: "Baker", says: "I stayed far away from that pie. Everyone knows about my allergy." },
        { name: "Wanda", role: "Fair judge", says: "At noon I watched Vikram carry the pie in his bare hands. His hands looked totally fine." },
        { name: "Xena", role: "Volunteer", says: "At noon I was judging the jam contest." }
      ],
      answer: 1,
      proof: [1],
      why: "Touching peanuts makes Vikram's hands swell. If Wanda had really seen him carry the pie in his bare hands, they would not look totally fine."
    },
    {
      title: "No Interval",
      setup: "A coat with a famous brooch disappeared from a theater cloakroom during the show.",
      clues: [
        "The show had no interval: it ran without a break from 7 PM to 10 PM.",
        "The theater doors stayed locked during the show.",
        "The coat disappeared during the show."
      ],
      suspects: [
        { name: "Yusuf", role: "Audience member", says: "I watched the whole show from my seat in row F." },
        { name: "Zoe", role: "Audience member", says: "During the interval, I went out to buy an ice cream." },
        { name: "Ari", role: "Cloakroom attendant", says: "I stayed at the cloakroom desk the whole time." }
      ],
      answer: 1,
      proof: [0],
      why: "The show had no interval. Zoe could not have gone out during one."
    },
    {
      title: "The Broken Car",
      setup: "A ring was stolen from a house on Birch Street on Sunday afternoon.",
      clues: [
        "Lena's car broke down on Saturday and is still at the garage.",
        "Lena has no other car.",
        "The ring was stolen on Sunday afternoon."
      ],
      suspects: [
        { name: "Lena", role: "Neighbor", says: "Without my car, I stayed home all Sunday." },
        { name: "Max", role: "Neighbor", says: "I saw Lena drive past the house in her car on Sunday afternoon." },
        { name: "Nora", role: "Teacher", says: "I was at the beach with my kids all Sunday." }
      ],
      answer: 1,
      proof: [0],
      why: "Lena's only car has been at the garage since Saturday. Max could not have seen her driving it on Sunday."
    },
    {
      title: "It's Done",
      setup: "A message saying \"It's done\" was sent from Leo's phone at 9 PM.",
      clues: [
        "Leo's phone was at a repair shop from 6 PM until the next morning.",
        "The repair shop was locked all night.",
        "Leo has only one phone."
      ],
      suspects: [
        { name: "Leo", role: "Phone owner", says: "I didn't send anything. My phone was at the repair shop all night." },
        { name: "Mina", role: "Leo's friend", says: "I texted Leo at nine and he called me right back on his phone." },
        { name: "Kian", role: "Repair shop owner", says: "I locked the shop at six and opened it at nine the next morning." }
      ],
      answer: 1,
      proof: [0, 2],
      why: "Leo's only phone was locked in the repair shop all night. He could not have called Mina back on it at nine."
    },
    {
      title: "The Golden Spoon",
      setup: "The safe at the Golden Spoon restaurant was emptied on Wednesday night.",
      clues: [
        "The Golden Spoon is closed on Wednesdays.",
        "Bruno, the head chef, was in hospital from Monday to Friday.",
        "Only Bruno and the owner know the safe's code."
      ],
      suspects: [
        { name: "Selma", role: "Owner", says: "I was at my daughter's wedding all Wednesday." },
        { name: "Tim", role: "Waiter", says: "I didn't work on Wednesday. We're always closed that day." },
        { name: "Rafa", role: "Cook", says: "Bruno cooked dinner for a big group at the restaurant on Wednesday night." }
      ],
      answer: 2,
      proof: [0],
      alt: [[1]],
      why: "The restaurant is closed on Wednesdays, and Bruno was in hospital all week. Rafa's story can't be true."
    },
    {
      title: "Midnight Snow",
      setup: "A bronze statue was stolen from the Lindqvist garden overnight.",
      clues: [
        "Snow started falling at 11 PM and stopped at 1 AM.",
        "In the morning, fresh footprints in the snow led to where the statue stood.",
        "The statue was still there when the snow started."
      ],
      suspects: [
        { name: "Sven", role: "Neighbor", says: "I took my dog out at 10:30 PM, before the snow." },
        { name: "Tilda", role: "Daughter", says: "I went to bed at midnight and slept until eight." },
        { name: "Ulrik", role: "Neighbor", says: "I walked past the garden at midnight. The ground was completely dry, no snow anywhere." }
      ],
      answer: 2,
      proof: [0],
      why: "Snow fell from 11 PM to 1 AM. Ulrik could not have seen completely dry ground at midnight."
    },
    {
      title: "The Chewed Shoes",
      setup: "A pair of designer shoes was found chewed up at the Moreau apartment.",
      clues: [
        "The Moreaus' puppy, Biscuit, was at the vet from 8 AM to 6 PM.",
        "The shoes were fine at 9 AM.",
        "The chewed shoes were found at 5 PM."
      ],
      suspects: [
        { name: "Mrs. Moreau", role: "Owner", says: "I dropped Biscuit at the vet at eight and picked him up at six." },
        { name: "Jules", role: "Teenage son", says: "It was Biscuit! I saw him chewing something in the hallway at three." },
        { name: "Dalia", role: "Cleaner", says: "I cleaned the kitchen from ten to two." }
      ],
      answer: 1,
      proof: [0],
      why: "Biscuit was at the vet from 8 AM to 6 PM. Jules could not have seen him chewing anything at home at three."
    },
    {
      title: "The Card Swipe",
      setup: "A tablet vanished from a desk at Brightline Insurance at 7 PM.",
      clues: [
        "The office door locks itself at 6 PM. After that, a staff card is needed.",
        "Every card swipe is recorded.",
        "The only swipe after 6 PM was at 6:45 PM, by Wren."
      ],
      suspects: [
        { name: "Wren", role: "Clerk", says: "I came back at 6:45 for my umbrella and left five minutes later." },
        { name: "Yosef", role: "Analyst", says: "I came back at 6:55 to finish a report. I used my card to get in." },
        { name: "Zainab", role: "Manager", says: "I left at 5:30, like always." }
      ],
      answer: 1,
      proof: [2],
      why: "The only card swipe after 6 PM was Wren's. If Yosef had used his card at 6:55, it would be in the records."
    },
    {
      title: "Exam Day",
      setup: "Someone scratched the principal's car in the school parking lot at 11 AM.",
      clues: [
        "All students sat a 3-hour exam from 9 AM to 12 PM.",
        "No one was allowed to leave the exam hall early.",
        "The car was scratched at 11 AM."
      ],
      suspects: [
        { name: "Ravi", role: "Student", says: "I was in the exam hall from nine to twelve. The math was terrible." },
        { name: "Dana", role: "Sports coach", says: "At eleven I was on the sports field with the cleaning crew." },
        { name: "Lily", role: "Student", says: "I finished my exam early and left the hall at 10:30." }
      ],
      answer: 2,
      proof: [1],
      why: "No student was allowed to leave the exam hall early. Lily could not have left at 10:30."
    },
    {
      title: "The Guest List",
      setup: "A rare bottle of wine vanished from the cellar during the Duval party.",
      clues: [
        "Guests needed an invitation to get in.",
        "The doorman checked every name against a list.",
        "Hector was not on the list and was turned away at the door."
      ],
      suspects: [
        { name: "Hector", role: "Neighbor", says: "They didn't let me in, so I went home." },
        { name: "Ines", role: "Guest", says: "I chatted with Hector at the party for an hour, near the wine cellar." },
        { name: "Jasper", role: "DJ", says: "I stayed behind my DJ desk all night." }
      ],
      answer: 1,
      proof: [2],
      why: "Hector was turned away at the door. Ines could not have chatted with him at the party."
    },
    {
      title: "The Lighthouse",
      setup: "A ship's bell was stolen from the old lighthouse museum at noon.",
      clues: [
        "The lighthouse has 120 steps and no lift.",
        "The bell was kept at the very top.",
        "Mr. Okafor uses a wheelchair and cannot climb stairs."
      ],
      suspects: [
        { name: "Mr. Okafor", role: "Museum guide", says: "I stayed in the gift shop downstairs all day." },
        { name: "Dana", role: "Tourist", says: "I saw Mr. Okafor at the top of the lighthouse at noon, right next to the bell." },
        { name: "Felipe", role: "Tourist", says: "I climbed all 120 steps at noon. Great view, but I was out of breath." }
      ],
      answer: 1,
      proof: [2],
      why: "There's no lift, and Mr. Okafor cannot climb stairs. Dana could not have seen him at the top."
    },
    {
      title: "The First Bus",
      setup: "A painting was swapped for a copy at the Linden Museum before it opened on Sunday.",
      clues: [
        "On Sundays the first bus from Hill Street leaves at 9:05 AM.",
        "The bus ride from Hill Street to the museum takes 40 minutes.",
        "The painting was swapped between 9:00 and 9:20 AM, during the guard's coffee break."
      ],
      suspects: [
        { name: "Petra", role: "Curator", says: "I came in at nine, made the guard a coffee and went up to my office." },
        { name: "Samir", role: "Cleaner", says: "I came in on the first bus from Hill Street and started cleaning at ten to ten." },
        { name: "Ottilie", role: "Tour guide", says: "I caught the first bus from Hill Street and was at my desk by half past nine." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "The first Sunday bus leaves Hill Street at 9:05 and takes 40 minutes, so it arrives at 9:45. Ottilie couldn't have caught it and been at her desk by half past nine."
    },
    {
      title: "Room 412",
      setup: "A diamond bracelet was taken from Room 412 at the Grand Weston hotel.",
      clues: [
        "The bracelet was in the room's safe, and the safe was opened with its code. It wasn't forced.",
        "Mrs. Varga set the code to her birth year and told only her husband.",
        "The police have only said that \"a bracelet was taken from the room\"."
      ],
      suspects: [
        { name: "Bruno", role: "Night porter", says: "I carried their bags up at ten and left straight away." },
        { name: "Corinne", role: "Housekeeper", says: "I cleaned 412 in the morning. I don't touch guests' safes." },
        { name: "Felix", role: "Room service waiter", says: "I've never been near that safe. Anyone could guess a code like a birth year." }
      ],
      answer: 2,
      proof: [1],
      alt: [[2]],
      why: "The police only said a bracelet was taken from the room. Felix knows it was in the safe and that the code was a birth year, which only Mrs. Varga and her husband knew."
    },
    {
      title: "The Spare Key",
      setup: "Rare coins disappeared from the locked back room of Hale's Antiques on Thursday.",
      clues: [
        "The back room has only two keys.",
        "Mr. Hale had one key with him in Lisbon all week.",
        "The other key was in the shop safe, and the safe's timer kept it shut from Wednesday evening to Friday morning."
      ],
      suspects: [
        { name: "Ama", role: "Shop assistant", says: "I ran the shop on Thursday. I don't have a key, so I never went into the back room." },
        { name: "Bram", role: "Furniture restorer", says: "I took the spare key out of the safe on Thursday morning to fetch my tools from the back room." },
        { name: "Cleo", role: "Neighbour", says: "I popped in on Thursday afternoon to buy a vase and chatted with Ama." }
      ],
      answer: 1,
      proof: [2],
      why: "The spare key was in the safe, and the timer kept the safe shut from Wednesday evening to Friday morning. Bram couldn't have taken the key out on Thursday, so how did he get into the back room?"
    },
    {
      title: "North of the River",
      setup: "A van full of laptops was stolen from a car park on Market Street on Tuesday night.",
      clues: [
        "On Tuesday night it snowed heavily north of the river. South of the river it stayed dry.",
        "Market Street is south of the river.",
        "The van was taken between 10 PM and midnight."
      ],
      suspects: [
        { name: "Iris", role: "Night nurse", says: "I drove home to the north side at eleven. The roads there were white with snow." },
        { name: "Jasper", role: "Warehouse worker", says: "I parked on Market Street at ten. When I came back at midnight my car was buried in snow." },
        { name: "Mateo", role: "Taxi driver", says: "I waited for fares at the station south of the river all night. Not a single snowflake." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "It only snowed north of the river, and Market Street is south of it. Jasper's car couldn't have been buried in snow there."
    },
    {
      title: "The Day Before",
      setup: "A gold necklace was stolen from Mrs. Okafor's flat on Thursday the 14th.",
      clues: [
        "The farmers' market is held only on Saturdays.",
        "The theft happened on Thursday the 14th.",
        "The flat's door was opened with a key. It wasn't forced."
      ],
      suspects: [
        { name: "Ngozi", role: "Niece", says: "I have a spare key, but I was at work all day on the 14th." },
        { name: "Pieter", role: "Neighbour", says: "The day before the theft I bought her apples at the farmers' market and dropped them off." },
        { name: "Rosa", role: "Cleaner", says: "I clean her flat on Fridays, so I wasn't there on Thursday." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "The theft was on Thursday the 14th, so the day before was a Wednesday. The farmers' market only runs on Saturdays, so Pieter couldn't have bought apples there."
    },
    {
      title: "The Tokyo Call",
      setup: "Someone moved money out of a small company's account from the office computer on Monday evening.",
      clues: [
        "Tokyo is 8 hours ahead of the office's time.",
        "The Tokyo office is open from 9 AM to 6 PM, Tokyo time.",
        "The money was moved at 9 PM on Monday, office time."
      ],
      suspects: [
        { name: "Haruto", role: "Accountant", says: "From nine to ten on Monday evening I was on the phone with the Tokyo office's front desk." },
        { name: "Selma", role: "Office manager", says: "I left at six and went to my daughter's school concert." },
        { name: "Tunde", role: "IT technician", says: "I updated the servers in the basement until eight, then went home." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "At 9 PM office time it was 5 AM in Tokyo, and the Tokyo office doesn't open until 9 AM. Haruto couldn't have been on the phone with its front desk."
    },
    {
      title: "The Causeway",
      setup: "Rare seabird eggs were stolen from the nature reserve on Gull Island on Saturday evening.",
      clues: [
        "High tide on Saturday was at 6 PM.",
        "The causeway to Gull Island is under water from two hours before high tide until two hours after.",
        "The eggs were still in the nest at 3 PM, when the warden checked."
      ],
      suspects: [
        { name: "Una", role: "Warden", says: "I checked the nest at three and walked back across the causeway at half past three." },
        { name: "Viktor", role: "Birdwatcher", says: "I walked over the causeway at half past five to watch the gulls come in." },
        { name: "Wren", role: "Kayaker", says: "I paddled around the island at high tide and never landed." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "High tide was at 6 PM, so the causeway was under water from 4 PM to 8 PM. Viktor couldn't have walked across it at half past five."
    },
    {
      title: "No Footprints",
      setup: "An antique garden gnome vanished from Mrs. Pike's front lawn on Monday night.",
      clues: [
        "Fresh snow fell on Monday night from 10 PM until midnight.",
        "In the morning there wasn't a single footprint on Mrs. Pike's lawn.",
        "The gnome was still on the lawn at 9:30 PM.",
        "Mrs. Pike's gate squeaks loudly."
      ],
      suspects: [
        { name: "Quincy", role: "Neighbour", says: "I cut across Mrs. Pike's lawn at one in the morning to get home faster." },
        { name: "Rosalind", role: "Mrs. Pike's niece", says: "I saw the gnome from the window at half past nine." },
        { name: "Silas", role: "Postman", says: "I heard that gate squeak at ten, just as the snow was starting." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "Snow fell until midnight, and in the morning there wasn't a single footprint on the lawn. If Quincy had cut across it at one in the morning, his footprints would still have been in the snow."
    },
    {
      title: "The 7:40 to Kelton",
      setup: "A briefcase was stolen from the waiting room at Ashby station on Friday evening.",
      clues: [
        "The 7:40 PM train from Ashby to Kelton takes 50 minutes.",
        "On Friday the 7:40 PM train left Ashby on time.",
        "The briefcase was last seen at 7:30 PM.",
        "Kelton's taxi rank closes at 9 PM."
      ],
      suspects: [
        { name: "Tamsin", role: "Commuter", says: "I caught the 7:40 to Kelton and was home in my kitchen by eight." },
        { name: "Udo", role: "Ticket clerk", says: "I saw the briefcase by the bench at half past seven." },
        { name: "Valentina", role: "Nurse", says: "I took the 7:40 to Kelton and got a taxi from the rank at twenty to nine." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "The 7:40 left on time and takes 50 minutes, so it reached Kelton at 8:30. Tamsin couldn't have been home in her kitchen by eight."
    },
    {
      title: "The Bake Sale",
      setup: "The cash box from the charity bake sale disappeared from the town hall on Saturday afternoon.",
      clues: [
        "The bake sale ran from 10 AM to 2 PM, and nothing was sold at a discount.",
        "Brownies cost $2 each.",
        "Lemon cakes cost $3 each.",
        "The cash box was locked in the office at 2:15 PM."
      ],
      suspects: [
        { name: "Wanda", role: "Teacher", says: "I bought three brownies and two lemon cakes for my class. It came to $10." },
        { name: "Xavi", role: "Baker", says: "I baked the lemon cakes and sold my last one at one." },
        { name: "Yolanda", role: "Treasurer", says: "I counted the money and locked the box in the office at a quarter past two." }
      ],
      answer: 0,
      proof: [1, 2],
      why: "Three brownies at $2 and two lemon cakes at $3 come to $12, not $10. Wanda's sum doesn't add up."
    },
    {
      title: "Opening Night",
      setup: "A jade bracelet was taken from a display case during the Linden Gallery's opening night.",
      clues: [
        "The gallery was open from 7 PM to 10 PM.",
        "Guests had to leave their coats and bags in the cloakroom.",
        "The bracelet's case was found open at 9:15 PM.",
        "The cloakroom was closed from 8 PM to 8:30 PM while the attendant took a break."
      ],
      suspects: [
        { name: "Zara", role: "Art student", says: "I got my coat back from the cloakroom at a quarter past eight and went home early." },
        { name: "Albin", role: "Cloakroom attendant", says: "I took my break at eight and was back at my desk by half past." },
        { name: "Bryony", role: "Sculptor", says: "I gave a speech at nine and stayed until the doors closed at ten." }
      ],
      answer: 0,
      proof: [3],
      why: "The cloakroom was closed from 8 PM to 8:30 PM. Zara couldn't have got her coat back at a quarter past eight."
    },
    {
      title: "The Lighthouse Log",
      setup: "The logbook vanished from the Point Ross lighthouse on Tuesday evening.",
      clues: [
        "Sunset on Tuesday was at 5:10 PM.",
        "The lighthouse lamp switches on 30 minutes after sunset, every night.",
        "The lamp runs on a timer. Nobody can switch it on by hand.",
        "The logbook was signed at 6 PM."
      ],
      suspects: [
        { name: "Cyrus", role: "Fisherman", says: "When I rowed past the point at half past five, the lamp was already shining." },
        { name: "Dorota", role: "Lighthouse keeper", says: "I signed the logbook at six, after the lamp came on." },
        { name: "Emrys", role: "Birdwatcher", says: "I watched the sunset from the rocks and left before the lamp came on." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "Sunset was at 5:10 PM and the lamp switches on 30 minutes later, at 5:40. When Cyrus rowed past at half past five, it wasn't shining yet."
    },
    {
      title: "The Marathon Medal",
      setup: "The winner's gold medal vanished from the finish-line tent on Sunday.",
      clues: [
        "The marathon started at 9 AM.",
        "The winner finished in 2 hours and 41 minutes.",
        "Nobody else finished in under 3 hours.",
        "The finish-line tent opened at 11 AM."
      ],
      suspects: [
        { name: "Farah", role: "Runner", says: "I crossed the line at half past eleven, just behind the winner." },
        { name: "Gustav", role: "Medic", says: "I opened the tent at eleven and waited for the first runners." },
        { name: "Hollis", role: "Volunteer", says: "I handed out water at mile 20 until half past twelve." }
      ],
      answer: 0,
      proof: [0, 2],
      alt: [[0, 1]],
      why: "The race started at 9 AM, and nobody but the winner finished in under 3 hours, so nobody else crossed the line before noon. Farah couldn't have finished at half past eleven."
    },
    {
      title: "The Master Tapes",
      setup: "The master tapes of a new album vanished from Blue Room Studios on Thursday night.",
      clues: [
        "The studio's back door only opens with a key card.",
        "The key card system logs every swipe.",
        "The log shows one swipe all night: Ilse's card, at 9:12 PM.",
        "The tapes were in the studio at 8 PM."
      ],
      suspects: [
        { name: "Ilse", role: "Sound engineer", says: "I swiped in at about ten past nine to switch off the lights." },
        { name: "Jasper", role: "Guitarist", says: "I let myself in the back door with my own key card at ten, to fetch my guitar." },
        { name: "Kirsi", role: "Singer", says: "I left by the front door at eight, and the tapes were still on the desk." }
      ],
      answer: 1,
      proof: [1, 2],
      why: "The key card system logs every swipe, and the only swipe all night was Ilse's at 9:12 PM. Jasper didn't swipe his card at ten."
    },
    {
      title: "The Final Whistle",
      setup: "Someone stole the takings from the Corner Café on Friday night, between closing time and 11 PM.",
      clues: [
        "The café closed at 6 PM.",
        "The football match on TV kicked off at 8 PM.",
        "The match lasted two hours, with no extra time.",
        "The café's back door was found open at 11 PM."
      ],
      suspects: [
        { name: "Lucan", role: "Café owner", says: "I locked up at six and counted the takings at a quarter past." },
        { name: "Moira", role: "Waitress", says: "I watched the whole match at the Fox and left the moment it ended, at nine." },
        { name: "Nestor", role: "Neighbour", says: "I noticed the café's back door open when I put my bins out at eleven." }
      ],
      answer: 1,
      proof: [1, 2],
      why: "The match kicked off at 8 PM and lasted two hours, so it ended at 10 PM. Moira couldn't have watched the whole thing and left at nine."
    },
    {
      title: "The Mountain Café",
      setup: "A ski instructor's wallet vanished from the mountain café on Sunday, between 2:30 and 3:30 PM.",
      clues: [
        "The top lift closed at 2 PM because of high winds.",
        "The mountain café sits at the top of the top lift.",
        "The wallet was on the café counter at 2:30 PM.",
        "Skiing down from the café to the village takes at least 25 minutes."
      ],
      suspects: [
        { name: "Orla", role: "Ski instructor", says: "I left my wallet on the café counter at half past two." },
        { name: "Piet", role: "Snowboarder", says: "I rode the lift up to the mountain café at three for a hot chocolate." },
        { name: "Quilla", role: "Café cook", says: "I skied down to the village at a quarter past three and got there at twenty to four." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "The mountain café sits at the top of the top lift, and that lift closed at 2 PM. Piet couldn't have ridden up to the café at three."
    },
    {
      title: "The Violin Bow",
      setup: "A priceless violin bow vanished from the Kessler Hall green room during Friday's concert.",
      clues: [
        "The concert started at 7:30 PM and ran for 95 minutes, with no interval.",
        "The bow was in the green room when the concert began.",
        "Only musicians and stage crew may enter the green room.",
        "The stage door was locked at 7:30 PM and opened again when the concert ended."
      ],
      suspects: [
        { name: "Rasmus", role: "Stagehand", says: "I slipped out through the stage door at half past eight to catch my bus." },
        { name: "Sunniva", role: "Violinist", says: "I played every note of the concert and went straight to the green room afterwards." },
        { name: "Tobiah", role: "Usher", says: "I stood at the back of the hall for all 95 minutes." }
      ],
      answer: 0,
      proof: [0, 3],
      why: "The concert began at 7:30 PM and ran for 95 minutes, so it ended at 9:05. The stage door stayed locked until then, so Rasmus couldn't have left through it at half past eight."
    },
    {
      title: "Grounded Balloons",
      setup: "A camera bag vanished from the launch field of the balloon festival on Saturday morning.",
      clues: [
        "No balloons flew on Saturday: the wind was too strong.",
        "The festival's food stalls opened at 9 AM.",
        "The camera bag was last seen at 8:15 AM.",
        "Mist covered the field until 10 AM."
      ],
      suspects: [
        { name: "Ulla", role: "Balloon pilot", says: "We didn't fly on Saturday. I spent the morning folding our balloon away." },
        { name: "Vaughn", role: "Photographer", says: "At half past eight I photographed three balloons rising out of the mist." },
        { name: "Wilma", role: "Pancake seller", says: "I opened my stall at nine. Nobody could see a thing in that mist." }
      ],
      answer: 1,
      proof: [0],
      why: "No balloons flew on Saturday because the wind was too strong. Vaughn couldn't have photographed three of them rising at half past eight."
    },
    {
      title: "The Twelve-Hour Shift",
      setup: "Medicine went missing from the Riverside Hospital pharmacy between 10 PM and 2 AM on Tuesday night.",
      clues: [
        "Nurse shifts at Riverside last 12 hours.",
        "Xander's shift on Tuesday started at 8 AM.",
        "The pharmacy door logs every time it opens.",
        "The log shows the door opened twice: at 11:10 PM and at 1:40 AM."
      ],
      suspects: [
        { name: "Xander", role: "Nurse", says: "At midnight I was still on my shift, handing out medicine on Ward 3." },
        { name: "Yvette", role: "Pharmacist", says: "I opened the pharmacy at ten past eleven for a doctor's order." },
        { name: "Zephyr", role: "Porter", says: "I wheeled a patient past the pharmacy at twenty to two. The door was open." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "Nurse shifts last 12 hours and Xander's started at 8 AM, so it ended at 8 PM. He wasn't still on his shift at midnight."
    },
    {
      title: "The Hot Kiln",
      setup: "A prize-winning vase was smashed at the Clayworks studio on Thursday evening.",
      clues: [
        "The kiln finished firing at 4 PM. It takes 6 hours to cool.",
        "Nobody can open the kiln while it's hot.",
        "The vase was on the shelf at 7 PM.",
        "The studio lights are on a timer and go off at 9 PM."
      ],
      suspects: [
        { name: "Aurelio", role: "Potter", says: "At eight I opened the kiln and took out my bowls to show a friend." },
        { name: "Beatrix", role: "Teacher", says: "I saw the vase on the shelf at seven when I locked the glaze room." },
        { name: "Cosmo", role: "Student", says: "I kept working in the dark after nine, when the lights went off." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "The kiln finished firing at 4 PM and takes 6 hours to cool, and nobody can open it while it's hot, so it stayed shut until 10 PM. Aurelio didn't open it at eight."
    },
    {
      title: "The Last Ferry",
      setup: "A briefcase of documents vanished from the Harbor Hotel lobby on Sunday evening.",
      clues: [
        "On Sundays the last ferry from the island leaves at 6 PM.",
        "The crossing takes 40 minutes.",
        "The briefcase was in the lobby at 7 PM.",
        "The hotel is a 5-minute walk from the ferry pier."
      ],
      suspects: [
        { name: "Dagny", role: "Lawyer", says: "I came over on the last ferry and was sitting in the hotel lobby by half past six." },
        { name: "Evander", role: "Tourist", says: "I came over on the last ferry, walked up to the hotel and checked in at a quarter to seven." },
        { name: "Freya", role: "Receptionist", says: "I saw the briefcase by the lobby sofa at seven." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "The last ferry left the island at 6 PM and the crossing takes 40 minutes, so it didn't land until 6:40. Dagny couldn't have been sitting in the lobby by half past six."
    }
  ],

  twist: [
    {
      mode: "honest",
      title: "Partners in Crime",
      setup: "A golden trophy vanished from the Riverside Football Club.",
      clues: [
        "The club's lights went out at 9 PM and stayed off until morning.",
        "It rained heavily from 8 PM to 11 PM.",
        "The trophy room is on the top floor."
      ],
      suspects: [
        { name: "Kofi", role: "Kit manager", says: "At ten I was polishing the trophies under the bright lights." },
        { name: "Luis", role: "Coach", says: "I walked home at ten. Not a drop of rain all night." },
        { name: "Mona", role: "Physio", says: "When the lights died, I waited in my car until the rain stopped." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Mona told the truth. Kofi couldn't polish anything under bright lights after 9 PM, and Luis couldn't walk home dry at ten in heavy rain.",
      twist: "Two liars, one story. Kofi and Luis were in it together."
    },
    {
      mode: "planted",
      title: "The Locked Gate",
      setup: "A rare coin went missing at the Alvarez house.",
      clues: [
        "Mrs. Alvarez locked the coin in a drawer at 8 PM.",
        "The garden gate was locked all evening.",
        "The cook left at 9 PM."
      ],
      suspects: [
        { name: "Nina", role: "Gardener", says: "I went in and out through the garden gate all evening, watering the roses." },
        { name: "Omar", role: "Cook", says: "I left at nine, same as always." },
        { name: "Pia", role: "Niece", says: "I saw my aunt lock the drawer around eight." }
      ],
      answer: 1,
      proof: [0],
      why: "Everyone told the truth. Nina used the garden gate all evening, so the gate was not locked.",
      twist: "The locked-gate story was planted so nobody would suspect someone came in from the garden."
    },
    {
      mode: "honest",
      title: "Snow at the Lodge",
      setup: "A famous skier's medal was stolen from the Pine Lodge.",
      clues: [
        "Thick snow covered every road by 6 PM.",
        "The lodge's elevator was broken all day.",
        "The medal was in Room 40, on the fourth floor."
      ],
      suspects: [
        { name: "Arvid", role: "Guest", says: "I took the elevator up to the fourth floor at seven." },
        { name: "Bea", role: "Ski instructor", says: "I cycled to the lodge at eight. The roads were totally clear." },
        { name: "Cyrus", role: "Porter", says: "I walked up the stairs to the fourth floor and was out of breath." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Cyrus told the truth. The elevator was broken all day, so Arvid lied, and the roads were covered in snow, so Bea lied.",
      twist: "Arvid and Bea made up matching alibis. Neither one held up."
    },
    {
      mode: "planted",
      title: "The Fake Rain",
      setup: "Someone took the jewels from Lady Ashford's dressing room.",
      clues: [
        "It rained all evening.",
        "The jewels were taken at 10 PM.",
        "The dressing room window was open."
      ],
      suspects: [
        { name: "Dev", role: "Butler", says: "I sat out on the terrace all evening, looking at the stars." },
        { name: "Ella", role: "Maid", says: "At ten I heard the window bang in the wind." },
        { name: "Fynn", role: "Guest", says: "The jewels were still there when I walked past at 9:30." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Dev spent the evening watching the stars, so it could not have rained all evening.",
      twist: "The rain story was planted so muddy footprints would point at the gardener."
    },
    {
      mode: "honest",
      title: "The Last Train",
      setup: "A painting at the Varga Gallery was swapped for a fake.",
      clues: [
        "The gallery closed at 6 PM.",
        "The last train to the city left at 7 PM.",
        "The fake was hung between 6 PM and 8 PM."
      ],
      suspects: [
        { name: "Greta", role: "Visitor", says: "I walked around the gallery until eight. Nobody stopped me." },
        { name: "Hamid", role: "Art dealer", says: "I caught the 9 PM train back to the city." },
        { name: "Isla", role: "Guide", says: "I left when the gallery closed at six and took the 7 PM train." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Isla told the truth. The gallery closed at 6 PM, so Greta lied, and the last train left at 7 PM, so Hamid lied."
    },
    {
      mode: "planted",
      title: "The Broken Printer",
      setup: "A laptop vanished from the newspaper office.",
      clues: [
        "The internet was down all evening.",
        "The office printer was broken all day.",
        "The laptop was taken after 8 PM."
      ],
      suspects: [
        { name: "Jun", role: "Reporter", says: "I printed my article at seven and took it to the editor." },
        { name: "Kira", role: "Editor", says: "I couldn't send a single email all evening, so I went home at eight." },
        { name: "Leon", role: "Photographer", says: "I saw the laptop on the desk at 8:05." }
      ],
      answer: 1,
      proof: [0],
      why: "Everyone told the truth. Jun printed his article at seven, so the printer was not broken.",
      twist: "The broken-printer note was planted to make Jun's alibi look false."
    },
    {
      mode: "honest",
      title: "The Parrot",
      setup: "A rare talking parrot was taken from its cage at the city zoo.",
      clues: [
        "The zoo closed at 5 PM and the gates were locked.",
        "The water in the zoo was shut off all day.",
        "The parrot's cage was opened at 7 PM."
      ],
      suspects: [
        { name: "Mo", role: "Volunteer", says: "I hosed down the elephants at six." },
        { name: "Nadia", role: "Visitor", says: "I visited the zoo at 6:30 to see the penguins." },
        { name: "Oskar", role: "Keeper", says: "I stayed after closing to feed the animals." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Oskar told the truth. The water was off all day, so Mo lied, and the zoo closed at 5 PM, so Nadia lied."
    },
    {
      mode: "planted",
      title: "Last Orders",
      setup: "A briefcase was stolen from the lobby of the Hotel Royale.",
      clues: [
        "The theft happened at 9 PM.",
        "The hotel bar closes at 8 PM.",
        "The briefcase was left in the lobby."
      ],
      suspects: [
        { name: "Pablo", role: "Bartender", says: "I served drinks at the hotel bar until eleven." },
        { name: "Queenie", role: "Guest", says: "The briefcase was in the lobby when I checked in at 8:30." },
        { name: "Ray", role: "Doorman", says: "At nine I heard someone running out of the lobby." }
      ],
      answer: 1,
      proof: [0],
      why: "Everyone told the truth. Pablo served drinks until eleven, so the bar did not close at 8 PM.",
      twist: "Someone wanted the bar to look empty at nine. It was full of witnesses."
    },
    {
      mode: "honest",
      title: "Full Moon",
      setup: "An ancient mask disappeared from the Hollis Museum.",
      clues: [
        "The museum's back door was bricked up years ago.",
        "It was a clear night with a bright full moon.",
        "The alarm went off at 2 AM."
      ],
      suspects: [
        { name: "Sana", role: "Cleaner", says: "I came in through the back door, like always." },
        { name: "Tariq", role: "Night guard", says: "It was pitch black. Clouds hid the moon all night." },
        { name: "Uri", role: "Neighbor", says: "The alarm woke me at two, so I called the police." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Uri told the truth. The back door is bricked up, so Sana lied, and the sky was clear with a bright moon, so Tariq lied."
    },
    {
      mode: "planted",
      title: "Out of Order",
      setup: "A diamond ring vanished from Apartment 12F.",
      clues: [
        "The elevator was broken all day.",
        "Apartment 12F is on the twelfth floor.",
        "The ring was taken in the afternoon."
      ],
      suspects: [
        { name: "Vera", role: "Visitor", says: "I rode the elevator up to the twelfth floor at three." },
        { name: "Wes", role: "Owner", says: "The ring was on the table when I left at noon." },
        { name: "Xia", role: "Neighbor", says: "I live on the twelfth floor too. I was out all afternoon." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Vera rode the elevator at three, so it was not broken all day.",
      twist: "The out-of-order story was planted so nobody would ask who used the elevator."
    },
    {
      mode: "honest",
      title: "Dinner by Candlelight",
      setup: "A diamond vanished during a dinner party at the Kessler mansion.",
      clues: [
        "Dinner was served at 8 PM sharp.",
        "The power was out from 8 PM to 9 PM.",
        "Guests ate by candlelight."
      ],
      suspects: [
        { name: "Yann", role: "Guest", says: "Dinner was late. We didn't eat until around ten." },
        { name: "Zola", role: "Guest", says: "Under the bright ceiling lights, I could see everyone's face at dinner." },
        { name: "Amos", role: "Guest", says: "I sat between two candles and could barely see my plate." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Amos told the truth. Dinner was at 8 PM sharp, so Yann lied, and the power was out during dinner, so Zola lied."
    },
    {
      mode: "planted",
      title: "The Dog That Barked",
      setup: "A painting was taken from the Pereira farmhouse.",
      clues: [
        "The farm dog barked at a stranger at midnight.",
        "The painting hung in the hallway.",
        "The back door was unlocked."
      ],
      suspects: [
        { name: "Bina", role: "Daughter", says: "I was awake all night with a cold. The dog never barked once." },
        { name: "Caio", role: "Farmhand", says: "I forgot to lock the back door. That's my fault." },
        { name: "Dagny", role: "Grandmother", says: "I saw the painting in the hallway at eleven." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Bina was awake all night and the dog never barked, so the barking story is fake.",
      twist: "The barking story sent everyone looking for a stranger. The thief lived in the house."
    },
    {
      mode: "honest",
      title: "Sold-Out Show",
      setup: "A famous guitar vanished from backstage during the Lunar Lights concert.",
      clues: [
        "Every ticket was sold out weeks before the concert.",
        "Nobody could get in without a ticket.",
        "The guitar vanished during the show."
      ],
      suspects: [
        { name: "Edda", role: "Fan", says: "I bought a ticket at the door, minutes before the show." },
        { name: "Faro", role: "Fan", says: "I walked in without a ticket. Nobody checked." },
        { name: "Gwen", role: "Fan", says: "I bought my ticket a month ago and danced in the front row all night." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Gwen told the truth. Tickets were sold out weeks before, so Edda lied, and nobody got in without a ticket, so Faro lied."
    },
    {
      mode: "planted",
      title: "The Warm Night",
      setup: "Someone smashed the glass greenhouse at the botanical garden.",
      clues: [
        "It snowed heavily that night.",
        "The greenhouse was smashed at 11 PM.",
        "The gardener's shed was locked."
      ],
      suspects: [
        { name: "Hilde", role: "Neighbor", says: "I walked home at eleven in a T-shirt. It was a warm night." },
        { name: "Ishan", role: "Gardener", says: "I locked the shed myself at six." },
        { name: "Juno", role: "Night guard", says: "I heard glass smashing at eleven." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Hilde walked home in a T-shirt on a warm night, so it did not snow heavily.",
      twist: "The snow story was planted to explain away a lack of footprints."
    },
    {
      mode: "honest",
      title: "Fog in the Marina",
      setup: "A sailboat was stolen from the marina around midnight.",
      clues: [
        "The marina gate was locked at 8 PM.",
        "Thick fog covered the marina all night.",
        "The boat was taken around midnight."
      ],
      suspects: [
        { name: "Kaya", role: "Boat owner", says: "I came into the marina at ten. The gate was wide open." },
        { name: "Luca", role: "Fisherman", says: "At midnight I watched the boat sail away. I could see it clearly from across the bay." },
        { name: "Mira", role: "Marina keeper", says: "I locked the gate at eight and went home." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Mira told the truth. The gate was locked at 8 PM, so Kaya lied, and thick fog hid everything, so Luca lied."
    },
    {
      mode: "planted",
      title: "The Second Key",
      setup: "A precious old book vanished from the town library.",
      clues: [
        "The library closed at 5 PM.",
        "Only the librarian has a key.",
        "The book was taken at 7 PM."
      ],
      suspects: [
        { name: "Nell", role: "Cleaner", says: "I have my own key. I clean the library every evening from six to eight." },
        { name: "Otis", role: "Librarian", says: "I locked up at five." },
        { name: "Pari", role: "Reader", says: "I saw the book on its shelf at 4 PM." }
      ],
      answer: 1,
      proof: [0],
      why: "Everyone told the truth. Nell has her own key, so the librarian is not the only one with a key.",
      twist: "Someone wanted the librarian to take the blame."
    },
    {
      mode: "honest",
      title: "Market Day",
      setup: "A bag of gold coins went missing at the Saturday market.",
      clues: [
        "The market only runs on Saturdays.",
        "It rained all day on Saturday.",
        "The coins vanished at noon."
      ],
      suspects: [
        { name: "Quinn", role: "Stall holder", says: "I sold sunglasses at the market on Friday." },
        { name: "Remy", role: "Shopper", says: "Saturday was so sunny that I got sunburned." },
        { name: "Sol", role: "Stall holder", says: "I sold umbrellas on Saturday. Best day ever." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Sol told the truth. The market only runs on Saturdays, so Quinn lied, and it rained all day, so Remy lied."
    },
    {
      mode: "planted",
      title: "The Night Train",
      setup: "A conductor's bag of cash was stolen on the night train.",
      clues: [
        "The train made no stops between 10 PM and midnight.",
        "The bag was stolen at 11 PM.",
        "The lights in coach C were off all night."
      ],
      suspects: [
        { name: "Tova", role: "Passenger in coach C", says: "The lights in coach C were bright all night. I couldn't sleep at all." },
        { name: "Umar", role: "Passenger", says: "The train didn't stop anywhere until midnight. I checked." },
        { name: "Valo", role: "Steward", says: "At eleven I saw the conductor with his bag." }
      ],
      answer: 2,
      proof: [0],
      why: "Everyone told the truth. Tova couldn't sleep because the lights in coach C were bright, so they were not off.",
      twist: "The dark-coach story was planted so the thief could say nobody saw a thing."
    },
    {
      mode: "honest",
      title: "Hot Kitchen",
      setup: "A famous cookbook was stolen from Chef Amari's kitchen.",
      clues: [
        "It was 35°C all night.",
        "The kitchen's gas was shut off all day for repairs.",
        "The book went missing at 10 PM."
      ],
      suspects: [
        { name: "Wiebke", role: "Cook", says: "I cooked a big pot of soup on the gas stove at nine." },
        { name: "Xander", role: "Waiter", says: "I wore a thick wool sweater all night. It was so cold!" },
        { name: "Yasmin", role: "Dishwasher", says: "It was so hot that I stood by the open fridge to cool down." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Yasmin told the truth. The gas was off all day, so Wiebke lied, and it was 35°C, so Xander lied."
    },
    {
      mode: "planted",
      title: "The Cancelled Flight",
      setup: "A sculpture vanished from the Maddox Gallery on Friday night.",
      clues: [
        "Ms. Maddox's flight home was cancelled on Friday.",
        "The gallery alarm was turned off at 9 PM.",
        "The sculpture was gone by 10 PM."
      ],
      suspects: [
        { name: "Zed", role: "Ms. Maddox's friend", says: "I picked Ms. Maddox up at the airport on Friday. Her flight landed right on time." },
        { name: "Abel", role: "Guard", says: "Someone turned off the alarm at nine. I saw its light go out." },
        { name: "Bryn", role: "Cleaner", says: "At 9:30 the sculpture was still there." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Zed picked Ms. Maddox up from her flight, so it was not cancelled.",
      twist: "The cancelled flight made it look like Ms. Maddox was stuck abroad. She was home all along."
    },
    {
      mode: "honest",
      title: "The Locked Office",
      setup: "A lifeguard's watch vanished from the swimming pool office.",
      clues: [
        "The pool was drained for cleaning that day.",
        "The office was locked at 6 PM.",
        "The watch vanished at 5 PM."
      ],
      suspects: [
        { name: "Cleo", role: "Swimmer", says: "I swam 30 laps at five." },
        { name: "Dario", role: "Lifeguard", says: "The office was open until eight. I was in there at seven." },
        { name: "Ebba", role: "Cleaner", says: "I was scrubbing the empty pool at five." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Ebba told the truth. The pool was drained, so Cleo lied, and the office was locked at 6 PM, so Dario lied."
    },
    {
      mode: "planted",
      title: "No Footprints",
      setup: "A bronze statue vanished from the Ito family garden.",
      clues: [
        "It snowed until 10 PM.",
        "There were no footprints in the snow the next morning.",
        "The statue was there at 9 PM."
      ],
      suspects: [
        { name: "Fumi", role: "Daughter", says: "I walked across the garden at eleven to get my bike. I left footprints everywhere." },
        { name: "Goro", role: "Father", says: "Snow fell until ten, then the sky cleared." },
        { name: "Hana", role: "Neighbor", says: "I saw the statue covered in snow at nine." }
      ],
      answer: 1,
      proof: [0],
      why: "Everyone told the truth. Fumi walked across the snowy garden at eleven, so there were footprints the next morning.",
      twist: "Someone swept the snow and then planted the no-footprints story."
    },
    {
      mode: "honest",
      title: "Fresh White Paint",
      setup: "A rare painting vanished from the Delacroix studio.",
      clues: [
        "The studio walls were painted white on Tuesday.",
        "The studio was sealed all day Wednesday. Nobody went in.",
        "The painting was taken on Thursday."
      ],
      suspects: [
        { name: "Ilsa", role: "Artist", says: "I painted inside the studio on Wednesday afternoon." },
        { name: "Jakob", role: "Art buyer", says: "When I visited on Thursday, the studio walls were bright blue." },
        { name: "Kemi", role: "Assistant", says: "On Thursday the studio still smelled of fresh white paint." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Kemi told the truth. The studio was sealed on Wednesday, so Ilsa lied, and the walls were painted white on Tuesday, so Jakob lied."
    },
    {
      mode: "planted",
      title: "No Signal at the Opera",
      setup: "A diamond brooch vanished at the opera.",
      clues: [
        "Phones don't work inside the opera house. There is no signal.",
        "The brooch vanished during the second act.",
        "The second act started at 9 PM."
      ],
      suspects: [
        { name: "Lior", role: "Audience member", says: "During the second act, I called my wife from my seat to check on the kids." },
        { name: "Mara", role: "Usher", says: "The second act began at nine on the dot." },
        { name: "Nils", role: "Audience member", says: "I saw the brooch on Mrs. Black's dress during the first act." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Lior made a phone call from his seat, so phones do work inside the opera house.",
      twist: "The no-signal story was planted so the thief's partner could claim she never got a call."
    },
    {
      mode: "honest",
      title: "The Chief's Badge",
      setup: "The police chief's badge vanished from her own office.",
      clues: [
        "The chief's office door has a code lock.",
        "The code was changed on Monday, and only the chief knows the new one.",
        "The badge vanished on Tuesday."
      ],
      suspects: [
        { name: "Ozzy", role: "Officer", says: "On Tuesday I used the old code to get in. It still worked." },
        { name: "Petra", role: "Officer", says: "The chief told me the new code on Tuesday morning." },
        { name: "Rufus", role: "Officer", says: "The door was locked when I knocked on Tuesday, so I left." }
      ],
      answer: 2,
      proof: [1],
      why: "Rufus told the truth. The code was changed on Monday, so Ozzy lied, and only the chief knows the new code, so Petra lied.",
      twist: "Two officers, one lie each. They were working together."
    },
    {
      mode: "planted",
      title: "The 6:10 to Lindhurst",
      setup: "A briefcase of contracts vanished from the waiting room at Lindhurst Station on Monday evening.",
      clues: [
        "The 6:10 PM train to Lindhurst ran on time.",
        "The waiting room's camera was switched off for repairs on Monday.",
        "The briefcase was left on a bench at 6:30 PM."
      ],
      suspects: [
        { name: "Agnes", role: "Lawyer", says: "My 6:10 train was fifty minutes late, so I didn't reach Lindhurst until seven." },
        { name: "Basil", role: "Station cleaner", says: "The camera repairman was up a ladder in the waiting room all evening." },
        { name: "Cora", role: "Commuter", says: "I put my briefcase down on a bench at half past six to buy a coffee." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Agnes's 6:10 train was fifty minutes late, so the fact \"the 6:10 PM train ran on time\" was fake.",
      twist: "Someone planted the \"on time\" report so their own story about being on that train would hold up."
    },
    {
      mode: "honest",
      title: "The Rooftop Party",
      setup: "A camera was stolen from a rooftop party at the Larkin Hotel.",
      clues: [
        "The hotel's lifts were switched off from 10 PM to 11 PM for safety checks.",
        "A storm hit at 10:30 PM and the party moved inside.",
        "The camera was last seen on the roof at 10:15 PM."
      ],
      suspects: [
        { name: "Dara", role: "DJ", says: "At half past ten I packed my decks into the lift and rode down to the lobby." },
        { name: "Eamon", role: "Guest", says: "I stayed on the roof until eleven. The sky was clear all night." },
        { name: "Femi", role: "Waiter", says: "When the storm hit, I carried trays down the stairs for half an hour." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Femi told the truth. The lifts were off from 10 to 11 PM, so Dara didn't ride one down at half past ten, and the storm hit at 10:30, so Eamon didn't see a clear sky.",
      twist: "Dara and Eamon had matching stories. The storm washed both of them away."
    },
    {
      mode: "planted",
      title: "The Closed Kitchen",
      setup: "A chef's knife roll worth thousands went missing from Café Lune.",
      clues: [
        "The back door was locked at 10 PM on Sunday.",
        "The café's kitchen was closed all day on Sunday.",
        "The knife roll was last seen on Sunday afternoon."
      ],
      suspects: [
        { name: "Gilles", role: "Chef", says: "On Sunday I cooked lunch for forty people in that kitchen." },
        { name: "Hanne", role: "Dishwasher", says: "I washed up until half past nine and left by the front door." },
        { name: "Ivo", role: "Owner", says: "I locked the back door at ten, like every night." }
      ],
      answer: 1,
      proof: [0],
      why: "Everyone told the truth. Gilles cooked lunch for forty people in the kitchen on Sunday, so the fact \"the kitchen was closed all day on Sunday\" was fake.",
      twist: "The \"closed kitchen\" story was planted so the police wouldn't ask who was cooking there that day."
    },
    {
      mode: "honest",
      title: "The Long Lunch",
      setup: "Plans for a new phone were leaked from Brightline's office on Wednesday.",
      clues: [
        "The office printer was out of toner all day Wednesday.",
        "The plans were emailed out at 1:15 PM.",
        "From 1 PM to 2 PM the office was empty: the whole team was at a lunch across the street."
      ],
      suspects: [
        { name: "Jin", role: "Designer", says: "At a quarter past one I was at my desk, printing the plans for a meeting." },
        { name: "Kiri", role: "Engineer", says: "I skipped the team lunch and worked alone in the office all afternoon." },
        { name: "Lucas", role: "Manager", says: "I paid for the team lunch at the restaurant across the street." }
      ],
      answer: 2,
      proof: [2],
      why: "Lucas told the truth. The office was empty from 1 to 2 PM and the printer had no toner, so Jin wasn't printing at his desk at 1:15, and Kiri wasn't working alone in the office all afternoon.",
      twist: "Jin and Kiri both put themselves in an office that was empty. Each was covering for the other."
    },
    {
      mode: "planted",
      title: "Snowed Out",
      setup: "Someone let the air out of the tires of every bus in the school car park over the weekend.",
      clues: [
        "The school car park's gate was locked all weekend.",
        "No snow fell anywhere in town over the weekend.",
        "The flat tires were found on Monday at 7 AM."
      ],
      suspects: [
        { name: "Oona", role: "Bus driver", says: "I found the flat tires at seven on Monday morning." },
        { name: "Piet", role: "Caretaker", says: "I checked the gate on Saturday and on Sunday. It stayed locked." },
        { name: "Quinn", role: "Student", says: "On Sunday I built a snowman in the park with my little brother." }
      ],
      answer: 1,
      proof: [2],
      why: "Everyone told the truth. Quinn built a snowman on Sunday, so the fact \"no snow fell over the weekend\" was fake.",
      twist: "Fresh snow would have shown footprints to the buses. The \"no snow\" story was planted so nobody would look for them."
    },
    {
      mode: "honest",
      title: "The Concert Hall",
      setup: "A cello was swapped for a cheap copy during the Philharmonic's Friday concert.",
      clues: [
        "The concert ran from 7:30 PM to 9:45 PM with no interval.",
        "The stage door was locked during the concert.",
        "Before every concert the orchestra's phones are switched off and locked away."
      ],
      suspects: [
        { name: "Rafa", role: "Violinist", says: "During the interval I slipped out of the stage door for some air." },
        { name: "Sana", role: "Cellist", says: "Halfway through the concert I texted my sister from the stage." },
        { name: "Tomas", role: "Usher", says: "I stood at the back of the hall for the whole concert." }
      ],
      answer: 2,
      proof: [0, 2],
      alt: [[1, 2]],
      why: "Tomas told the truth. There was no interval and the stage door was locked, so Rafa didn't slip out, and the phones were locked away, so Sana didn't text from the stage.",
      twist: "Two musicians, two invented moments. Swapping a cello takes more than one pair of hands."
    },
    {
      mode: "planted",
      title: "The Silent Alarm",
      setup: "Jewels disappeared from the window of Marlow & Sons on Saturday night.",
      clues: [
        "The window display was full when the shop closed at 6 PM.",
        "The street lights worked all night.",
        "The shop's alarm didn't go off on Saturday night."
      ],
      suspects: [
        { name: "Uma", role: "Neighbour", says: "The shop's alarm woke me at two and rang for twenty minutes." },
        { name: "Vince", role: "Shop assistant", says: "I locked up at six. The window display was full." },
        { name: "Willa", role: "Taxi driver", says: "I drove down that street at three. It was bright as day under the street lights." }
      ],
      answer: 2,
      proof: [0],
      why: "Everyone told the truth. Uma heard the shop's alarm ring at two, so the fact \"the alarm didn't go off\" was fake.",
      twist: "The \"silent alarm\" story was planted so nobody would ask who switched it off at twenty past two."
    },
    {
      mode: "honest",
      title: "The Harvest Fair",
      setup: "The prize pumpkin vanished from the harvest fair on Saturday evening.",
      clues: [
        "The fair's Ferris wheel was broken all Saturday.",
        "It rained hard from 5 PM to 8 PM.",
        "The pumpkin tent closed at 6 PM."
      ],
      suspects: [
        { name: "Gilda", role: "Farmer", says: "I rode the Ferris wheel at six and could see the whole fair from the top." },
        { name: "Hector", role: "Fair worker", says: "I closed the pumpkin tent at six and ran to my van in the rain." },
        { name: "Imogen", role: "Visitor", says: "I sat on the grass and ate an ice cream at seven. Lovely dry evening." }
      ],
      answer: 1,
      proof: [0, 1],
      why: "Hector told the truth. Gilda lied: the Ferris wheel was broken all Saturday. Imogen lied: it rained hard from 5 PM to 8 PM, so it wasn't a dry evening at seven.",
      twist: "Two made-up evenings at the fair. The pumpkin left in the back of a farmer's trailer."
    },
    {
      mode: "planted",
      title: "The Closed Museum",
      setup: "An old map vanished from the Bramley Museum on Tuesday afternoon.",
      clues: [
        "The museum was closed all Tuesday.",
        "The map was in its case at noon.",
        "The museum café sells only tea and cake."
      ],
      suspects: [
        { name: "Jolene", role: "Tour guide", says: "I led a school tour round the museum at two on Tuesday." },
        { name: "Kit", role: "Café waiter", says: "Our café only does tea and cake. People ask for sandwiches every day." },
        { name: "Lars", role: "Curator", says: "I checked the map case at noon. The map was there." }
      ],
      answer: 0,
      proof: [0],
      why: "Everyone told the truth. Jolene led a school tour round the museum at two on Tuesday, so the fact \"the museum was closed all Tuesday\" was fake.",
      twist: "Someone wanted the police to think nobody was in the museum that afternoon. A whole school class was."
    },
    {
      mode: "honest",
      title: "The Rooftop Orchids",
      setup: "Rare orchids were stolen from the rooftop greenhouse of the Elm Street flats on Thursday night.",
      clues: [
        "The flats' lift was out of order all Thursday.",
        "The roof door was locked at 8 PM.",
        "A storm knocked out the power on Elm Street from 9 PM to 11 PM."
      ],
      suspects: [
        { name: "Magnus", role: "Resident", says: "I watered the orchids at seven and walked down all six flights." },
        { name: "Nell", role: "Resident", says: "I took the lift up to the roof at half past seven to fetch my washing." },
        { name: "Oskar", role: "Caretaker", says: "I watched a film on the TV in my basement flat from nine until eleven." }
      ],
      answer: 0,
      proof: [0, 2],
      why: "Magnus told the truth. Nell lied: the lift was out of order all Thursday. Oskar lied: the power on Elm Street was out from 9 PM to 11 PM, so his TV wasn't on.",
      twist: "Two neighbours, two invented evenings. The orchids went down the fire escape in a laundry basket."
    },
    {
      mode: "planted",
      title: "The 11:15 Bus",
      setup: "A handbag was snatched at the Fenwick bus stop on Wednesday night, at about 11 PM.",
      clues: [
        "The last bus from Fenwick left at 10:30 PM.",
        "The bus stop's shelter light was broken.",
        "The thief ran towards the park."
      ],
      suspects: [
        { name: "Ralph", role: "Student", says: "I waited at the stop in the dark, because the shelter light was broken." },
        { name: "Pippa", role: "Bus driver", says: "I drove the 11:15 bus out of Fenwick. It was my last run of the night." },
        { name: "Selma", role: "Victim's friend", says: "She screamed at about eleven, and someone ran off towards the park." }
      ],
      answer: 0,
      proof: [1],
      why: "Everyone told the truth. Pippa drove the 11:15 bus out of Fenwick, so the fact \"the last bus left at 10:30 PM\" was fake.",
      twist: "With the last bus 'gone', nobody would ask who got off the 11:15."
    },
    {
      mode: "honest",
      title: "The Recipe Book",
      setup: "The bakery on Quay Street was broken into on Monday night, and the family recipe book was taken.",
      clues: [
        "Thick fog covered Quay Street all Monday night.",
        "The bakery's oven was switched off at 6 PM.",
        "The harbor's foghorn sounded every minute all night."
      ],
      suspects: [
        { name: "Tove", role: "Fisherman", says: "At ten I could see every light across the bay from Quay Street." },
        { name: "Ulric", role: "Baker", says: "I switched the oven off at six and went home." },
        { name: "Vesna", role: "Neighbour", says: "It was a silent night. I didn't hear a sound until morning." }
      ],
      answer: 1,
      proof: [0, 2],
      why: "Ulric told the truth. Tove lied: thick fog covered Quay Street all night, so no lights across the bay could be seen. Vesna lied: the foghorn sounded every minute all night.",
      twist: "Two neighbours who swore they saw and heard nothing. One of them walked off with a hundred years of recipes."
    },
    {
      mode: "planted",
      title: "The New Bench",
      setup: "Someone carved initials into the brand-new bench in Victoria Park on Friday.",
      clues: [
        "The bench was painted on Friday morning.",
        "The paint was dry by 2 PM.",
        "The park gates closed at 8 PM."
      ],
      suspects: [
        { name: "Wyatt", role: "Gardener", says: "I painted the bench first thing on Friday morning." },
        { name: "Zola", role: "Office worker", says: "I sat on the new bench at three and ruined my coat with wet paint." },
        { name: "Ximena", role: "Park keeper", says: "I locked the park gates at eight on the dot." }
      ],
      answer: 1,
      proof: [1],
      why: "Everyone told the truth. Zola sat on the bench at three and got wet paint on her coat, so the fact \"the paint was dry by 2 PM\" was fake.",
      twist: "Dry paint would mean anyone in the afternoon. Wet paint means the carver came later."
    },
    {
      mode: "honest",
      title: "The Silver Saddle",
      setup: "A champion horse's silver saddle vanished from the Ridgeway Stables on Sunday night.",
      clues: [
        "Snow closed every road to the stables from 6 PM on Sunday.",
        "The stables' generator failed at 9 PM, and the lights went out.",
        "The saddle was polished at 7 PM."
      ],
      suspects: [
        { name: "Agnes", role: "Groom", says: "I polished the saddle at seven and stayed in the hayloft all night because of the snow." },
        { name: "Barnaby", role: "Vet", says: "I drove up to the stables at eight to check on a sick foal." },
        { name: "Clementine", role: "Rider", says: "I groomed my horse under the stable lights at ten." }
      ],
      answer: 0,
      proof: [0, 1],
      why: "Agnes told the truth. Barnaby lied: snow closed every road to the stables from 6 PM. Clementine lied: the lights went out at 9 PM, so she didn't groom her horse under them at ten.",
      twist: "Two alibis, both built on a night nobody could check. The saddle left on a sledge."
    },
    {
      mode: "planted",
      title: "The Pier Arcade",
      setup: "The coin machines in the pier arcade were emptied on Saturday night.",
      clues: [
        "The arcade closed at 11 PM.",
        "The pier gate was locked at 11:30 PM.",
        "Nobody walked onto the pier after 10 PM."
      ],
      suspects: [
        { name: "Desmond", role: "Arcade owner", says: "I closed the arcade at eleven and counted the coins in the machines." },
        { name: "Esther", role: "Security guard", says: "I locked the pier gate at half past eleven." },
        { name: "Florin", role: "Teenager", says: "I walked onto the pier at half past ten to meet my friends at the arcade." }
      ],
      answer: 2,
      proof: [2],
      why: "Everyone told the truth. Florin walked onto the pier at half past ten, so the fact \"nobody walked onto the pier after 10 PM\" was fake.",
      twist: "The fake fact kept the late crowd off the suspect list. Someone in that crowd left with a bag full of coins."
    },
    {
      mode: "honest",
      title: "The Box Office",
      setup: "A stack of concert tickets vanished from the box office at the Rialto on Friday.",
      clues: [
        "The box office only opens from 10 AM to 4 PM.",
        "Every ticket for Friday's concert sold out on Monday.",
        "The Rialto's car park was closed all Friday."
      ],
      suspects: [
        { name: "Gaspard", role: "Box office clerk", says: "I opened the box office at ten and locked it at four." },
        { name: "Henrike", role: "Fan", says: "I bought two tickets for Friday's concert at the box office on Thursday." },
        { name: "Ignatius", role: "Delivery driver", says: "I parked in the Rialto car park at noon on Friday to drop off posters." }
      ],
      answer: 0,
      proof: [1, 2],
      why: "Gaspard told the truth. Henrike lied: every ticket sold out on Monday, so she didn't buy two on Thursday. Ignatius lied: the car park was closed all Friday.",
      twist: "Two people with reasons to be near the box office, and both reasons made up. The tickets were for sale online by evening."
    },
    {
      mode: "planted",
      title: "The Bookshop Cat",
      setup: "A first edition was stolen from Hartley's Books on Thursday afternoon.",
      clues: [
        "The shop's cat, Biscuit, hisses at every customer.",
        "The first edition was on the counter at 1 PM.",
        "The shop was shut from 2 PM to 3 PM for lunch."
      ],
      suspects: [
        { name: "Juno", role: "Customer", says: "Biscuit hissed at me the moment I walked in." },
        { name: "Kasimir", role: "Owner", says: "I put the first edition on the counter at one to show a buyer." },
        { name: "Lilou", role: "Hiker", says: "I bought a map at Hartley's at half past two. The owner wrapped it for me." }
      ],
      answer: 2,
      proof: [2],
      why: "Everyone told the truth. Lilou bought a map at half past two and the owner wrapped it, so the fact \"the shop was shut from 2 PM to 3 PM\" was fake.",
      twist: "A shop that was 'shut' has no customers to ask. This one had at least one."
    },
    {
      mode: "honest",
      title: "The Treehouse Comics",
      setup: "A box of rare comics vanished from the Carter twins' treehouse on Tuesday afternoon.",
      clues: [
        "The treehouse ladder was taken down on Monday to be fixed.",
        "Tuesday was the hottest day of the year: 34°C at 3 PM.",
        "The twins' dog barks at every stranger. On Tuesday afternoon it barked once, at 4 PM."
      ],
      suspects: [
        { name: "Mags", role: "Neighbour", says: "I climbed the ladder to the treehouse at two to fetch my son's ball." },
        { name: "Nico", role: "Twins' cousin", says: "It was a cold, grey afternoon, so I stayed indoors with a hot chocolate." },
        { name: "Odette", role: "Postwoman", says: "The dog barked at me when I brought the post at four." }
      ],
      answer: 2,
      proof: [0, 1],
      why: "Odette told the truth. Mags lied: the ladder was taken down on Monday, so she didn't climb it. Nico lied: it was 34°C at 3 PM, not a cold, grey afternoon.",
      twist: "The comics didn't need a ladder: they came down on a rope, into a cousin's backpack."
    },
    {
      mode: "planted",
      title: "The Marina Key",
      setup: "Fuel was siphoned from the boats at Saltmarsh Marina on Sunday night.",
      clues: [
        "The marina gate is locked from 10 PM to 6 AM.",
        "The only gate key is kept by the harbor master.",
        "The harbor master was away all Sunday."
      ],
      suspects: [
        { name: "Rowena", role: "Boat owner", says: "I left the marina at nine, before the gate was locked." },
        { name: "Pascal", role: "Fisherman", says: "The harbor master locked the gate behind me at ten on Sunday night." },
        { name: "Sven", role: "Night fisherman", says: "I couldn't get to my boat at midnight, because the gate was locked." }
      ],
      answer: 2,
      proof: [1],
      why: "Everyone told the truth. Pascal saw the harbor master lock the gate at ten on Sunday night, so the fact \"the harbor master was away all Sunday\" was fake.",
      twist: "With the harbor master 'away', nobody would ask who held the only key."
    },
    {
      mode: "honest",
      title: "The Vicarage Teapot",
      setup: "A silver teapot vanished from the vicarage garden party on Saturday afternoon.",
      clues: [
        "The party ran from 2 PM to 5 PM.",
        "A wasp nest by the front gate meant every guest came in through the back garden.",
        "The brass band didn't turn up."
      ],
      suspects: [
        { name: "Philippa", role: "Vicar's wife", says: "I poured tea from the silver teapot at half past two." },
        { name: "Reuben", role: "Guest", says: "I walked in through the front gate at three, right past the vicar's roses." },
        { name: "Saskia", role: "Guest", says: "The brass band played my favourite march at four." }
      ],
      answer: 0,
      proof: [1, 2],
      why: "Philippa told the truth. Reuben lied: because of the wasp nest, every guest came in through the back garden. Saskia lied: the brass band didn't turn up, so it played nothing at four.",
      twist: "Two guests who weren't where they said. The teapot left the party under a picnic blanket."
    },
    {
      mode: "planted",
      title: "The Empty Pool",
      setup: "Someone stole the lifeguard's radio from the lido on Wednesday evening.",
      clues: [
        "The lido's pool was emptied for cleaning on Monday.",
        "The lido closed at 8 PM.",
        "The radio was on the lifeguard chair at 7:30 PM."
      ],
      suspects: [
        { name: "Ursula", role: "Lifeguard", says: "I left my radio on my chair at half past seven while I locked the changing rooms." },
        { name: "Valentin", role: "Ticket seller", says: "I closed the till at eight and went home." },
        { name: "Tobias", role: "Swimmer", says: "I swam forty lengths of the lido pool on Wednesday evening, until it closed." }
      ],
      answer: 0,
      proof: [2],
      why: "Everyone told the truth. Tobias swam forty lengths of the pool on Wednesday evening, so the fact \"the pool was emptied for cleaning on Monday\" was fake.",
      twist: "An 'empty pool' meant no swimmers to question. Tobias saw who lingered by the lifeguard chair."
    }
  ]
};
