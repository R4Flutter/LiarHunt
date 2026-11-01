/*
  WHO'S LYING? — settings
  This is the only file you need to edit before going live.
*/
window.WL_CONFIG = {
  // Your game's name, shown in share messages.
  siteName: "Who's Lying?",

  // Your real web address, with https:// and no slash at the end.
  // It goes into every shared result, so friends get a link they can tap.
  // Change this if you move the game to your own .com.
  siteUrl: "https://liarhunt.com",

  // Moving to a new web address? Put the new address here (with https://) on the OLD site.
  // Players who open the old address get their progress backed up and are sent to the new
  // address with it, so nobody starts again. Leave "" until you move (see README).
  movedTo: "",

  // The date of Daily #1 (YYYY-MM-DD). Every day after this gets the next number.
  // If you change it, change the same date in firebase/firestore.rules too.
  launchDate: "2026-10-26",

  audio: {
    // Background music and sound effect volume, from 0 to 1.
    musicVolume: 0.32,
    sfxVolume: 0.9
  },

  analytics: {
    // Privacy-friendly analytics. Free option first: Umami Cloud, $0 up to 100k events a month.
    // Sign up at umami.is, add the site "liarhunt.com", open it, and paste the Website ID here.
    // Leave "" to keep analytics off.
    umami: {
      websiteId: "",
      scriptUrl: "https://cloud.umami.is/script.js",
      // Only count the real domain, so previews and localhost don't pollute the numbers.
      domains: "liarhunt.com,www.liarhunt.com"
    },

    // Paid fallback: Plausible (30-day free trial, then $9/month). Put its site domain here
    // and leave umami.websiteId empty to use it instead.
    plausibleDomain: "",

    // Umami counts every pageview, every event AND every stored property against its free
    // quota, so only a few useful properties are sent: at most maxProps per event, and only
    // the keys listed in propKeys. Set props to false to send event names only.
    props: true,
    maxProps: 2,
    propKeys: ["level", "case", "stars", "wrong", "hint", "correct", "score", "day", "kind", "type",
      "catchup", "replay", "seconds", "days", "days_away", "day_of_play", "days_played", "rank", "clues", "method"]
  },

  crazygames: {
    // CrazyGames leaderboards are invite-only. If CrazyGames invites the game, paste the
    // Encryption Key from the developer portal here; Rush best scores will then be submitted.
    leaderboardKey: ""
  },

  leaderboard: {
    // Paste your Firebase web app config here to switch on the leaderboard and
    // top-100 rewards (README, step "Switch on the leaderboard"). It looks like:
    // firebase: { apiKey: "AIza...", authDomain: "your-app.firebaseapp.com", projectId: "your-app", appId: "1:123:web:abc" }
    // This key is safe to publish: the security rules in firebase/firestore.rules protect the data.
    // Until then the leaderboard stays hidden. Add ?lb=demo to the address to preview it with demo players.
    firebase: {
      apiKey: "AIzaSyD9pUc9EAFZn1YLbvqq2lCV8zXmNquG1MM",
      authDomain: "whoslying-daily.firebaseapp.com",
      projectId: "whoslying-daily",
      appId: "1:854039661523:web:5b27a8d9d0531c6d683d26"
    }
  },

  ads: {
    // "none"    = no ads (best while you grow; hints and second chances are free)
    // "adsense" = Google AdSense H5 Games Ads (after Google approves your site)
    // "demo"    = grey placeholder boxes that show where ads will appear
    // Tip: add ?ads=demo to the address to preview ad spots without changing this file.
    provider: "none",

    // Your AdSense publisher ID, like "ca-pub-1234567890123456".
    adsenseClient: "ca-pub-5463912491137261",

    // Keep true while testing. Set to false once Google approves you for H5 Games Ads.
    adsenseTestMode: true,

    // Minimum time between full-screen ads. Google decides the exact timing.
    frequencyHint: "45s",

    // Optional: an AdSense display ad unit ID (just the number) for a banner
    // under the results screen and on the past-cases page. Leave "" for none.
    displaySlot: "",

    // Optional: an AdSense display ad unit ID for the tall ads left and right of the game
    // (wide screens only). Leave "" to use displaySlot for them too.
    railSlot: ""
  }
};
