/*
  LIARHUNT — sound effects and background music
  Files live in assets/audio/. If one is missing, a small built-in synth sound
  plays instead, so the game never goes silent.
  Mute rules: the player's own switches, the platform's mute setting
  (CrazyGames muteAudio wins over everything), and ads (muted while one plays).
*/
(function () {
  "use strict";
  var ACFG = (window.WL_CONFIG && window.WL_CONFIG.audio) || {};
  var MUSIC_VOL = ACFG.musicVolume == null ? 0.32 : ACFG.musicVolume;
  var SFX_VOL = ACFG.sfxVolume == null ? 0.9 : ACFG.sfxVolume;
  var SFX = {
    tap: 0.5, stamp: 0.85, correct: 0.42, wrong: 0.45, tick: 0.55, timeout: 0.42, twist: 0.6,
    fanfare: 0.6, fail: 0.55, whoosh: 0.6, coin: 0.5, star: 0.55, levelup: 0.6, combo: 0.5, click: 0.45, buy: 0.55, achieve: 0.55
  };
  var BIG = { fanfare: 1, fail: 1, twist: 1, levelup: 1, achieve: 1 };

  var A = {
    ctx: null, master: null, sfxGain: null, musicGain: null, buffers: {}, loaded: false,
    soundOn: true, musicOn: true, forced: false, adMuted: false, hidden: false, touched: false,
    music: { playing: false, wanted: false, mood: "hq" }, tracks: {}
  };

  function audible() { return !A.forced && !A.adMuted; }
  function applyMaster() {
    if (!A.master) return;
    var t = A.ctx.currentTime, v = audible() ? 1 : 0;
    A.master.gain.cancelScheduledValues(t);
    A.master.gain.setTargetAtTime(v, t, 0.03);
  }
  function ensure() {
    // No audio engine before the first touch or key press: browsers block it and log a warning.
    if (!A.touched) return null;
    if (!A.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { A.ctx = new AC(); } catch (e) { return null; }
      A.master = A.ctx.createGain(); A.master.gain.value = audible() ? 1 : 0; A.master.connect(A.ctx.destination);
      A.sfxGain = A.ctx.createGain(); A.sfxGain.gain.value = SFX_VOL; A.sfxGain.connect(A.master);
      A.musicGain = A.ctx.createGain(); A.musicGain.gain.value = MUSIC_VOL; A.musicGain.connect(A.master);
    }
    if (A.ctx.state !== "running" && !A.hidden) { try { A.ctx.resume(); } catch (e) { /* ignore */ } }
    if (!A.loaded) loadAll();
    return A.ctx;
  }
  function decode(ab) {
    return new Promise(function (res, rej) {
      var p = A.ctx.decodeAudioData(ab, res, rej);
      if (p && p.then) p.then(res, rej);
    });
  }
  function fetchBuf(name) {
    return fetch("assets/audio/" + name + ".mp3").then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.arrayBuffer();
    }).then(decode);
  }
  // The first tap only fetches the small sounds every case uses; the rest follow once the game is running.
  var CORE = ["tap", "click", "stamp", "whoosh", "correct", "wrong"], asked = {};
  function want(n) {
    if (asked[n]) return;
    asked[n] = 1;
    fetchBuf(n).then(function (b) { A.buffers[n] = b; }, function () { /* keep synth fallback */ });
  }
  function loadAll() {
    A.loaded = true;
    CORE.forEach(want);
    setTimeout(function () { Object.keys(SFX).forEach(want); }, 6000);
  }

  /* ---------- synth fallbacks ---------- */
  function tone(f, dur, type, vol, delay, slide) {
    var c = A.ctx, t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  function thud() {
    var c = A.ctx, len = Math.floor(c.sampleRate * 0.12), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 900; g.gain.value = 0.5;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(A.sfxGain); s.start();
    tone(95, 0.16, "sine", 0.35);
  }
  function synth(name) {
    if (name === "tap" || name === "click") tone(620, 0.05, "triangle", 0.05);
    else if (name === "stamp" || name === "twist") thud();
    else if (name === "correct" || name === "fanfare" || name === "levelup" || name === "achieve") { tone(523, 0.12, "triangle", 0.12); tone(784, 0.2, "triangle", 0.12, 0.1); }
    else if (name === "coin" || name === "buy" || name === "star" || name === "combo") { tone(988, 0.08, "square", 0.04); tone(1319, 0.14, "square", 0.04, 0.07); }
    else if (name === "wrong" || name === "fail" || name === "timeout") tone(190, 0.32, "sawtooth", 0.07, 0, 110);
    else if (name === "tick") tone(1150, 0.03, "square", 0.025);
  }

  /* ---------- effects ---------- */
  function play(name, opts) {
    if (!A.soundOn || !audible()) return;
    if (!ensure()) return;
    opts = opts || {};
    var b = A.buffers[name];
    try {
      if (b) {
        var s = A.ctx.createBufferSource(), g = A.ctx.createGain();
        s.buffer = b; g.gain.value = (SFX[name] || 0.6) * (opts.volume || 1);
        if (opts.rate) s.playbackRate.value = opts.rate;
        s.connect(g); g.connect(A.sfxGain); s.start(A.ctx.currentTime + (opts.delay || 0));
        if (BIG[name]) duck(b.duration);
      } else { want(name); synth(name); }
    } catch (e) { /* audio not available */ }
  }
  function duck(sec) {
    if (!A.musicGain) return;
    var g = A.musicGain.gain, t = A.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(MUSIC_VOL * 0.35, t + 0.15);
    g.setValueAtTime(MUSIC_VOL * 0.35, t + Math.max(0.3, sec - 0.4));
    g.linearRampToValueAtTime(MUSIC_VOL, t + sec + 0.4);
  }

  /* ---------- music: one track per mood, plus rain under the cases ----------
     Each track is a looping <audio> element, streamed and decoded a little at a time (a few hundred KB of memory, not
     the ~16 MB a decoded buffer takes). They run through musicGain, so mute, ads and ducking work as before, and a mood
     change crossfades. Royalty-free (CC0) tracks; where they came from is in tools/audio-sources.md.
     ponytail: a plain loop can leave a tiny gap at the seam; crossfade two copies if that ever bothers anyone. */
  var MOODS = {
    hq: { track: "music-hq", rain: 0 },
    "case": { track: "music-case", rain: 0.35 },
    rush: { track: "music-rush", rain: 0 },
    verdict: { track: "music-case", rain: 0.6 }
  };
  var FADE = 1.5; // seconds
  function track(name) {
    var t = A.tracks[name];
    if (t) return t;
    var el = new Audio("assets/audio/" + name + ".mp3");
    el.loop = true; el.preload = "auto";
    t = A.tracks[name] = { el: el, g: null, on: false, stop: 0 };
    try { var src = A.ctx.createMediaElementSource(el); t.g = A.ctx.createGain(); t.g.gain.value = 0; src.connect(t.g); t.g.connect(A.musicGain); }
    catch (e) { el.volume = 0; } // no Web Audio: plain element volume
    return t;
  }
  function level(t, v, secs) {
    if (t.g) {
      var g = t.g.gain, now = A.ctx.currentTime;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(v, now + secs);
    } else t.el.volume = Math.min(1, v * MUSIC_VOL);
  }
  // Plays the mood's track (and rain), fades every other track out and pauses it once it's silent.
  function applyMood() {
    var m = A.music, md = MOODS[m.mood] || MOODS.hq, want = {};
    want[md.track] = 1;
    if (md.rain) want.rain = md.rain;
    Object.keys(want).forEach(function (n) {
      var t = track(n);
      t.on = true; clearTimeout(t.stop);
      if (t.el.paused) { var p = t.el.play(); if (p && p.catch) p.catch(function () { m.playing = false; }); }
      level(t, want[n], FADE);
    });
    Object.keys(A.tracks).forEach(function (n) {
      var t = A.tracks[n];
      if (want[n] || !t.on) return;
      t.on = false; level(t, 0, FADE);
      clearTimeout(t.stop);
      t.stop = setTimeout(function () { if (!t.on) t.el.pause(); }, FADE * 1000 + 150);
    });
  }
  function startMusic() {
    var m = A.music;
    m.wanted = true;
    if (!A.musicOn || m.playing || !A.touched || !ensure()) return;
    m.playing = true;
    applyMood();
  }
  function stopMusic(keepWanted) {
    var m = A.music;
    m.playing = false;
    if (!keepWanted) m.wanted = false;
    Object.keys(A.tracks).forEach(function (n) { var t = A.tracks[n]; t.on = false; clearTimeout(t.stop); t.el.pause(); level(t, 0, 0); });
  }
  // hq | case | rush | verdict: which music fits the screen.
  function mood(name) {
    var m = A.music;
    if (!MOODS[name] || m.mood === name) return;
    m.mood = name;
    if (m.playing) applyMood();
  }

  /* ---------- switches ---------- */
  function setSound(on) { A.soundOn = !!on; }
  function setMusic(on) {
    A.musicOn = !!on;
    if (on) { if (A.ctx) startMusic(); else A.music.wanted = true; } else stopMusic();
  }
  function setForced(muted) { A.forced = !!muted; applyMaster(); }
  function adPause() { A.adMuted = true; applyMaster(); }
  function adResume() { A.adMuted = false; applyMaster(); }

  // Browsers only allow sound after the player touches the page.
  // iOS also stops audio when the app goes to the background, so every touch tries to resume it.
  function onGesture() {
    A.touched = true;
    if (!A.soundOn && !A.musicOn) return;
    if (!ensure()) return;
    if (A.musicOn && A.music.wanted && !A.music.playing) startMusic();
  }
  ["pointerdown", "touchend", "keydown", "click"].forEach(function (ev) { document.addEventListener(ev, onGesture, true); });
  document.addEventListener("visibilitychange", function () {
    A.hidden = document.hidden;
    if (!A.ctx) return;
    if (document.hidden) { Object.keys(A.tracks).forEach(function (n) { A.tracks[n].el.pause(); }); try { A.ctx.suspend(); } catch (e) { /* ignore */ } }
    else {
      var p; try { p = A.ctx.resume(); } catch (e) { p = null; }
      var go = function () {
        if (!A.music.playing) return;
        Object.keys(A.tracks).forEach(function (n) { var t = A.tracks[n]; if (t.on) t.el.play().catch(function () { /* needs a tap */ }); });
      };
      if (p && p.then) p.then(go, go); else go();
    }
  });

  window.WLAudio = {
    init: function (o) { A.soundOn = o.sound !== false; A.musicOn = o.music !== false; A.music.wanted = A.musicOn; },
    play: play, startMusic: startMusic, stopMusic: stopMusic, mood: mood,
    setSound: setSound, setMusic: setMusic, setForced: setForced, adPause: adPause, adResume: adResume,
    unlocked: function () { return !!A.ctx && A.ctx.state === "running"; }
  };
})();
