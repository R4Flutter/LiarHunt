/*
  LIARHUNT — the art kit (WLArt)
  Drawn in code, in the game's ink-on-paper style, so there are no image files and dark mode works through CSS.
    WLArt.scene(id)   a place, 320x210, for the Daily 5 Search step. Fills are classes (sa-*), coloured in css/style.css.
    WLArt.SCENES      { id: { name, anchors: { name: [x%, y%] } } }: where a story may put the things to search
    WLArt.icon(id)    a 32x32 line icon in currentColor
    WLArt.ICONS       every icon id a story may use
    WLArt.LIES        the six kinds of lie: { icon, name, line }
  A story names a scene and, for each spot, an anchor in that scene and an icon (js/storycheck.js checks both).
*/
(function () {
  "use strict";

  /* ---------- drawing helpers: o = outlined in ink, f = fill only, l = ink line ---------- */
  function r(x, y, w, h, c, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : "") + ' class="o ' + c + '"/>'; }
  function fr(x, y, w, h, c, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : "") + ' class="' + c + '"/>'; }
  function p(d, c) { return '<path d="' + d + '" class="o ' + c + '"/>'; }
  function fp(d, c) { return '<path d="' + d + '" class="' + c + '"/>'; }
  function l(d, c) { return '<path d="' + d + '" class="l' + (c ? " " + c : "") + '"/>'; }
  function ci(x, y, rr, c) { return '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" class="o ' + c + '"/>'; }
  function el(x, y, rx, ry, c) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" class="o ' + c + '"/>'; }
  function fel(x, y, rx, ry, c) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" class="' + c + '"/>'; }

  // an inside room: wall with faint stripes, skirting, a plank floor
  function room(wall, floor) {
    var s = fr(0, 0, 320, 130, wall || "sa-wall"), d = "";
    for (var y = 22; y < 130; y += 24) d += "M0 " + y + "h320";
    s += l(d, "t") + fr(0, 128, 320, 6, "sa-trim") + fr(0, 134, 320, 76, floor || "sa-floor");
    s += l("M0 156h320M0 180h320M0 204h320M44 134v22M128 134v22M214 134v22M292 134v22M86 156v24M176 156v24M258 156v24M30 180v24M140 180v24M232 180v24", "t");
    return s;
  }
  // outside: sky, a strip of sea, then ground
  function outside(ground) {
    return fr(0, 0, 320, 110, "sa-sky") + fr(0, 96, 320, 22, "sa-water") + l("M0 104c20-3 30-3 50 0s30 3 50 0 30-3 50 0 30 3 50 0 30-3 50 0 30 3 50 0", "t") +
      fr(0, 116, 320, 94, ground || "sa-sand") + l("M0 116h320", "");
  }
  function windowAt(x, y, w, h, inside) {
    return r(x, y, w, h, "sa-glass") + (inside || "") + l("M" + (x + w / 2) + " " + y + "v" + h + "M" + x + " " + (y + h / 2) + "h" + w, "w3") +
      r(x, y, w, h, "sa-none") + fr(x - 6, y + h, w + 12, 6, "sa-trim");
  }
  function fog(x, y, w, h) {
    return fel(x + w * 0.3, y + h * 0.3, w * 0.24, h * 0.13, "sa-fog") + fel(x + w * 0.66, y + h * 0.66, w * 0.27, h * 0.14, "sa-fog") +
      fel(x + w * 0.28, y + h * 0.82, w * 0.17, h * 0.08, "sa-fog");
  }
  function seaView(x, y, w, h) { // night sea through a window
    return fr(x + 2, y + 2, w - 4, h * 0.55, "sa-night") + fr(x + 2, y + h * 0.55, w - 4, h * 0.45 - 2, "sa-water") + ci(x + w * 0.75, y + h * 0.2, Math.min(w, h) * 0.08, "sa-glow");
  }
  function clock(x, y, R) {
    return ci(x, y, R, "sa-paper") + l("M" + x + " " + y + "l-" + R * 0.3 + "-" + R * 0.45 + "M" + x + " " + y + "l-" + R * 0.5 + " " + R * 0.25, "w3") +
      l("M" + x + " " + (y - R + 3) + "v3M" + x + " " + (y + R - 6) + "v3M" + (x - R + 3) + " " + y + "h3M" + (x + R - 6) + " " + y + "h3");
  }
  function cork(x, y, w, h) {
    return r(x, y, w, h, "sa-cork") + r(x + 6, y + 6, w * 0.32, h * 0.5, "sa-paper") + r(x + w * 0.52, y + 8, w * 0.36, h * 0.36, "sa-tag") +
      r(x + w * 0.3, y + h * 0.58, w * 0.4, h * 0.3, "sa-paper") + ci(x + 6 + w * 0.16, y + 7, 2, "sa-red") + ci(x + w * 0.7, y + 9, 2, "sa-red") + ci(x + w * 0.5, y + h * 0.6, 2, "sa-red");
  }
  function crate(x, y, w, h) {
    return r(x, y, w, h, "sa-wood2") + l("M" + x + " " + (y + h / 3) + "h" + w + "M" + x + " " + (y + 2 * h / 3) + "h" + w, "t") + l("M" + (x + 4) + " " + (y + 4) + "L" + (x + w - 4) + " " + (y + h - 4), "t");
  }
  function bin(x, y) {
    return ci(x + 12, y - 2, 6, "sa-paper") + ci(x + 22, y - 4, 5, "sa-tag") + p("M" + x + " " + y + "h34l-4 36H" + (x + 4) + "z", "sa-metal") + l("M" + (x + 10) + " " + (y + 8) + "v22M" + (x + 17) + " " + (y + 8) + "v22M" + (x + 24) + " " + (y + 8) + "v22", "t");
  }
  function table(x, y, w) { return r(x, y, w, 8, "sa-wood") + r(x + 6, y + 8, 5, 36, "sa-wood") + r(x + w - 11, y + 8, 5, 36, "sa-wood"); }
  function coatRack(x, top, coatCls) {
    return l("M" + x + " " + top + "v104M" + (x - 12) + " " + (top + 104) + "h24M" + (x - 6) + " " + (top + 8) + "l6-6 6 6", "w3") +
      p("M" + (x - 10) + " " + (top + 10) + "l10 4 10-4 6 30-6 2v34h-20V" + (top + 42) + "l-6-2z", coatCls || "sa-metal2") + l("M" + x + " " + (top + 14) + "v62", "t");
  }
  function lampDesk(x, y) { // a desk lamp standing at (x, y)
    return fp("M" + (x + 14) + " " + (y - 24) + "l-14 24h36z", "sa-glow") + l("M" + x + " " + y + "v-18l12-10", "w3") + p("M" + (x + 6) + " " + (y - 32) + "l14-6 4 10-14 4z", "sa-green");
  }
  function book(x, y, w) { return p("M" + x + " " + y + "l4-12h" + (w - 8) + "l4 12z", "sa-paper") + l("M" + (x + w / 2) + " " + (y - 12) + "v12") + l("M" + (x + 7) + " " + (y - 7) + "h" + (w / 2 - 10) + "M" + (x + w / 2 + 4) + " " + (y - 7) + "h" + (w / 2 - 10), "t"); }
  function door(x, y, w, h, c) { return r(x, y, w, h, c || "sa-wood") + r(x + 6, y + 8, w - 12, h * 0.38, "sa-none") + r(x + 6, y + h * 0.52, w - 12, h * 0.4, "sa-none") + ci(x + w - 8, y + h * 0.5, 2.5, "sa-tag"); }
  function bottle(x, y, c) { return p("M" + x + " " + y + "v-14l3-5v-5h4v5l3 5v14z", c); }

  /* ---------- the scenes ---------- */
  function A(x, y) { return [Math.round(x / 3.2 * 10) / 10, Math.round(y / 2.1 * 10) / 10]; } // viewBox px -> percent
  var SCENES = {
    office: { name: "Office", anchors: { window: A(60, 40), clock: A(168, 44), board: A(226, 42), coat: A(288, 66), logbook: A(144, 98), drawer: A(219, 127), bin: A(75, 166), lamp: A(250, 76), mug: A(177, 99) },
      draw: function () {
        return room("sa-wall") + windowAt(18, 20, 84, 78, fog(22, 24, 76, 70)) + clock(168, 44, 20) + cork(200, 22, 52, 40) + coatRack(288, 22) +
          table(112, 104, 150) + r(190, 112, 58, 26, "sa-wood2") + fr(211, 123, 16, 4, "sa-trim") + book(126, 104, 36) + lampDesk(232, 104) +
          r(172, 94, 10, 10, "sa-red", 1.5) + bin(58, 150);
      } },
    cafe: { name: "Café", anchors: { window: A(66, 58), menu: A(170, 38), jars: A(252, 40), till: A(280, 80), cakes: A(220, 82), counter: A(236, 118), cups: A(58, 124), table: A(84, 156), door: A(152, 98), bin: A(156, 170) },
      draw: function () {
        return room("sa-wall2") + windowAt(14, 22, 108, 76, fr(16, 24, 104, 72, "sa-sky") + l("M40 96V50m-6 0h12", "w3") + fel(40, 48, 8, 4, "sa-glow")) +
          p("M10 22h116l-6 -12H16z", "sa-red") + l("M30 10v12M50 10v12M70 10v12M90 10v12M110 10v12", "t") +
          r(140, 16, 60, 44, "sa-night") + l("M148 26h30M148 34h40M148 42h24M148 50h34", "chalk") + door(134, 66, 36, 68, "sa-wood") +
          fr(214, 52, 92, 4, "sa-trim") + r(220, 34, 12, 18, "sa-glass", 3) + r(238, 30, 12, 22, "sa-tag", 3) + r(256, 36, 12, 16, "sa-glass", 3) + r(274, 32, 12, 20, "sa-red", 3) + r(292, 36, 10, 16, "sa-glass", 3) +
          r(180, 98, 134, 36, "sa-wood") + r(176, 92, 142, 8, "sa-wood2") + l("M200 104v24M240 104v24M280 104v24", "t") +
          r(196, 72, 48, 20, "sa-glass") + fel(208, 86, 6, 4, "sa-tag") + fel(222, 86, 6, 4, "sa-tag") + fel(234, 86, 6, 4, "sa-tag") +
          p("M264 92v-16h28l4 16z", "sa-metal2") + r(268, 66, 18, 8, "sa-paper") +
          el(76, 138, 36, 7, "sa-wood") + l("M76 145v34M62 182h28", "w3") + r(52, 120, 10, 11, "sa-paper", 2) + r(86, 122, 10, 9, "sa-red", 2) + bin(140, 152);
      } },
    ferry: { name: "Ferry terminal", anchors: { window: A(90, 50), departures: A(214, 34), clock: A(282, 36), booth: A(234, 92), bench: A(60, 144), luggage: A(155, 166), gate: A(186, 152), bin: A(120, 172), lostproperty: A(278, 168) },
      draw: function () {
        var view = fr(16, 18, 146, 76, "sa-sky") + fr(16, 64, 146, 30, "sa-water") + p("M44 70h88l-10 12H54z", "sa-paper") + p("M62 70V58h44v12", "sa-glass") + fr(62, 60, 44, 3, "sa-red");
        return room("sa-wall") + windowAt(14, 16, 150, 80, view) + r(180, 16, 70, 34, "sa-night") + fr(186, 22, 26, 4, "sa-glow") + fr(216, 22, 28, 4, "sa-glow") + fr(186, 30, 22, 4, "sa-glow") + fr(216, 30, 28, 4, "sa-glow") + fr(186, 38, 30, 4, "sa-glow") +
          clock(282, 34, 16) + r(190, 70, 112, 64, "sa-wood") + r(214, 62, 40, 8, "sa-red") + r(204, 78, 62, 30, "sa-glass") + fr(200, 108, 70, 4, "sa-trim") + ci(235, 104, 3, "sa-paper") + r(276, 80, 18, 24, "sa-paper") +
          r(20, 140, 108, 8, "sa-wood2") + l("M28 148v28M120 148v28M20 132h108", "w3") + r(140, 148, 30, 34, "sa-red", 3) + l("M148 148v-6h14v6") +
          r(176, 138, 8, 50, "sa-metal") + l("M184 150h28", "w3") + bin(104, 158) + crate(258, 150, 42, 34);
      } },
    lighthouse: { name: "Lighthouse lamp room", anchors: { lens: A(160, 76), window: A(55, 53), radio: A(111, 74), map: A(258, 41), stairs: A(40, 172), logbook: A(243, 132), oilcans: A(286, 168), toolbox: A(116, 172), coat: A(302, 74) },
      draw: function () {
        return room("sa-wall2", "sa-floor") + windowAt(20, 18, 70, 70, seaView(20, 18, 70, 70)) + fp("M140 70L90 30v40z", "sa-glow") + fp("M180 70l50-40v40z", "sa-glow") +
          r(140, 108, 40, 30, "sa-metal") + p("M128 108l12-60h40l12 60z", "sa-glass") + l("M134 80h52M131 94h58M137 64h46", "t") + p("M136 48l24-14 24 14z", "sa-metal2") +
          fr(96, 82, 32, 4, "sa-trim") + r(100, 64, 24, 18, "sa-metal2") + ci(108, 73, 4, "sa-paper") + l("M116 64l6-10") +
          r(230, 22, 56, 38, "sa-paper") + l("M236 50c8-10 14 0 22-8s12-2 20-10", "") + ci(266, 40, 2, "sa-red") +
          p("M10 210V150h20v10h20v10h20v10h20v30z", "sa-wood") + r(228, 138, 32, 6, "sa-wood") + l("M232 144v40M256 144v40", "w3") + book(226, 138, 34) +
          r(272, 152, 14, 30, "sa-red", 2) + r(288, 158, 12, 24, "sa-red", 2) + r(96, 160, 42, 22, "sa-green", 2) + l("M106 160v-6h22v6") + coatRack(302, 30, "sa-tag");
      } },
    cannery: { name: "Old cannery", anchors: { crates: A(36, 80), coldroom: A(262, 84), shelf: A(152, 44), conveyor: A(158, 100), clockin: A(197, 56), hooks: A(66, 26), clipboard: A(204, 94), trolley: A(150, 164), drain: A(266, 172) },
      draw: function () {
        var cans = ""; for (var i = 0; i < 6; i++) { cans += r(112 + i * 14, 40, 10, 16, "sa-red", 2); cans += r(114 + i * 14, 62, 8, 12, "sa-metal", 2); }
        return room("sa-wall2", "sa-floor2") + l("M0 30h320M0 60h320M0 90h320M40 0v130M100 0v130M160 0v130M220 0v130M280 0v130", "t") +
          l("M60 0v30M74 0v24M88 0v34", "") + l("M56 30c0 6 8 6 8 0M70 24c0 6 8 6 8 0M84 34c0 6 8 6 8 0", "w3") +
          crate(12, 96, 48, 38) + crate(60, 104, 44, 30) + crate(20, 62, 40, 34) + fr(108, 56, 92, 4, "sa-trim") + fr(108, 78, 92, 4, "sa-trim") + cans +
          r(106, 98, 104, 8, "sa-metal2") + l("M114 106v28M202 106v28", "w3") + r(124, 88, 10, 10, "sa-red", 2) + r(150, 88, 10, 10, "sa-red", 2) + r(176, 88, 10, 10, "sa-red", 2) +
          r(186, 42, 22, 30, "sa-metal2") + r(190, 46, 14, 8, "sa-paper") + r(196, 82, 16, 22, "sa-paper") + l("M200 90h8M200 95h8", "t") +
          r(220, 30, 84, 104, "sa-metal") + r(226, 36, 72, 92, "sa-none") + r(286, 70, 6, 24, "sa-ink", 2) + r(242, 44, 34, 12, "sa-paper") + l("M232 104l6 6M250 110l4 4M268 100l6 6", "frost") +
          r(120, 168, 62, 8, "sa-metal") + ci(130, 182, 6, "sa-ink") + ci(172, 182, 6, "sa-ink") + l("M182 168l10-26", "w3") + p("M130 168c0-14 10-18 22-18s20 6 20 18z", "sa-tag") +
          el(266, 176, 20, 6, "sa-metal2") + l("M252 176h28M258 172v8M266 171v10M274 172v8", "t");
      } },
    museum: { name: "Museum hall", anchors: { painting: A(64, 50), case: A(165, 78), camera: A(262, 22), rope: A(116, 122), chair: A(270, 116), plaque: A(226, 128), door: A(300, 92), panel: A(220, 52), bench: A(64, 154) },
      draw: function () {
        return room("sa-wall", "sa-floor") + l("M0 14h320", "w3") + r(24, 22, 80, 56, "sa-tag") + fr(32, 30, 64, 40, "sa-sky") + p("M32 70l18-20 14 12 12-8 20 16z", "sa-green") + ci(82, 40, 5, "sa-glow") +
          r(140, 98, 50, 36, "sa-paper") + r(134, 56, 62, 42, "sa-glass") + p("M152 90l4-14 6 8 6-10 6 10 6-8 4 14z", "sa-tag") +
          l("M106 134v-28M224 134v-28M214 134v-28", "w3") + ci(106, 104, 4, "sa-tag") + ci(214, 104, 4, "sa-tag") + l("M106 108c30 22 78 22 108 0", "rope") +
          l("M256 6v8", "w3") + p("M244 14l26 6-3 10-25-6z", "sa-metal2") + ci(248, 22, 2, "sa-red") +
          r(210, 40, 22, 26, "sa-metal2") + ci(216, 48, 2.5, "sa-red") + ci(226, 48, 2.5, "sa-green") + l("M215 58h12", "t") +
          r(258, 104, 26, 6, "sa-red") + l("M260 110v24M282 110v24M282 104V78", "w3") + l("M226 134v-14", "w3") + r(214, 112, 24, 10, "sa-paper") +
          door(286, 44, 30, 90, "sa-wood") + r(30, 150, 70, 8, "sa-wood2") + l("M36 158v24M94 158v24", "w3");
      } },
    hotel: { name: "Hotel room", anchors: { bed: A(80, 116), pillow: A(36, 96), phone: A(146, 104), lamp: A(150, 70), window: A(198, 50), wardrobe: A(262, 60), safe: A(294, 112), suitcase: A(206, 164), bin: A(160, 172), rug: A(90, 176) },
      draw: function () {
        return room("sa-wall2", "sa-floor") + l("M10 10l20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20", "t") +
          windowAt(168, 18, 60, 66, fr(170, 20, 56, 62, "sa-night") + ci(214, 32, 4, "sa-glow")) + p("M164 14h12c-4 24-4 48 2 72h-14z", "sa-red") + p("M232 14h-12c4 24 4 48-2 72h14z", "sa-red") +
          fel(90, 178, 60, 14, "sa-red") + r(10, 70, 14, 70, "sa-wood") + r(20, 100, 112, 32, "sa-paper") + r(52, 96, 80, 36, "sa-glass") + el(38, 98, 16, 7, "sa-paper") +
          r(128, 108, 30, 26, "sa-wood") + l("M134 120h18", "t") + r(136, 98, 20, 10, "sa-red", 2) + fp("M148 82l-10 16h20z", "sa-glow") + l("M150 98V80", "w3") + p("M142 64h16l4 14h-24z", "sa-tag") +
          r(244, 20, 66, 114, "sa-wood") + l("M277 20v114", "") + p("M277 20l20 6v102l-20 6z", "sa-wood2") + r(282, 100, 22, 22, "sa-metal2") + ci(290, 111, 3, "sa-paper") +
          r(184, 150, 44, 30, "sa-tag", 4) + l("M198 150v-6h16v6") + ci(196, 164, 4, "sa-red") + bin(146, 160);
      } },
    boatyard: { name: "Boatyard", anchors: { boat: A(100, 110), bench: A(200, 112), rope: A(60, 162), cans: A(128, 172), shed: A(278, 96), tarp: A(270, 162), drum: A(212, 166), ladder: A(236, 86), lamp: A(18, 40) },
      draw: function () {
        return outside("sa-sand") + r(232, 44, 80, 90, "sa-wood2") + p("M226 48l46-22 46 22z", "sa-red") + r(262, 74, 30, 60, "sa-wood") + fr(262, 74, 6, 60, "sa-ink") +
          l("M228 134l14-80M246 134l14-80M233 116h18M237 98h18M241 80h18M245 62h17", "w3") +
          l("M18 120V36", "w3") + p("M10 36h16l-3-8h-10z", "sa-metal2") + fel(18, 44, 10, 6, "sa-glow") +
          p("M22 96h156l-22 34H44z", "sa-paper") + fr(30, 104, 140, 5, "sa-red") + l("M100 96V60M100 60l30 30", "") + l("M56 130l-6 22M146 130l6 22M70 130v22M132 130v22", "w3") +
          r(176, 116, 52, 8, "sa-wood") + l("M182 124v30M222 124v30", "w3") + l("M190 112l12-6M206 114h12", "w3") +
          el(60, 164, 22, 8, "sa-tag") + el(60, 160, 14, 5, "sa-tag") + l("M74 162c10 4 16 0 22 6", "") +
          r(116, 162, 12, 16, "sa-green", 2) + r(130, 166, 12, 12, "sa-red", 2) + r(200, 148, 24, 34, "sa-metal", 3) + l("M200 158h24M200 172h24", "t") +
          p("M244 182c-4-24 8-38 26-38s32 14 28 38z", "sa-glass") + l("M252 160l38 0M256 172h36", "t");
      } },
    pub: { name: "The pub", anchors: { taps: A(238, 80), bottles: A(232, 38), till: A(294, 78), dartboard: A(40, 40), wheel: A(128, 32), fireplace: A(128, 110), table: A(42, 156), glass: A(72, 120), stool: A(206, 154) },
      draw: function () {
        var bottles = ""; ["sa-green", "sa-glass", "sa-tag", "sa-green", "sa-red", "sa-glass", "sa-tag"].forEach(function (c, i) { bottles += bottle(188 + i * 16, 36, c) + bottle(192 + i * 16, 62, i % 2 ? "sa-glass" : "sa-tag"); });
        return room("sa-wall", "sa-floor") + fr(0, 84, 320, 44, "sa-wood2") + l("M0 84h320", "") + fr(180, 36, 130, 4, "sa-trim") + fr(180, 62, 130, 4, "sa-trim") + bottles +
          ci(40, 40, 18, "sa-paper") + ci(40, 40, 12, "sa-red") + ci(40, 40, 6, "sa-paper") + ci(40, 40, 2, "sa-red") +
          ci(128, 32, 16, "sa-none") + ci(128, 32, 5, "sa-wood") + l("M128 12v40M108 32h40M114 18l28 28M142 18l-28 28", "w3") +
          r(100, 80, 56, 54, "sa-metal2") + r(110, 96, 36, 38, "sa-night") + p("M116 134c0-12 6-16 8-24 4 8 10 10 8 24z", "sa-red") + fp("M122 134c0-6 3-9 4-14 2 5 5 7 4 14z", "sa-glow") + r(96, 76, 64, 6, "sa-wood") +
          r(170, 96, 142, 38, "sa-wood") + r(166, 90, 150, 8, "sa-wood2") + l("M226 90V72M240 90V72M254 90V72", "w3") + r(222, 66, 8, 8, "sa-red", 2) + r(236, 66, 8, 8, "sa-tag", 2) + r(250, 66, 8, 8, "sa-red", 2) +
          p("M282 90v-14h24l4 14z", "sa-metal2") + r(286, 70, 14, 6, "sa-paper") +
          r(16, 134, 70, 8, "sa-wood") + l("M24 142v36M78 142v36", "w3") + r(62, 118, 12, 16, "sa-glass", 2) + fr(62, 118, 12, 4, "sa-paper") + r(30, 120, 12, 14, "sa-glass", 2) +
          r(194, 142, 26, 6, "sa-red", 3) + l("M198 148l-4 34M216 148l4 34M200 168h14", "w3");
      } },
    yachtclub: { name: "Yacht club", anchors: { window: A(70, 56), trophies: A(170, 60), notices: A(238, 40), keys: A(290, 44), book: A(252, 92), armchair: A(62, 142), cart: A(170, 144), phone: A(114, 128), bin: A(300, 172) },
      draw: function () {
        var view = fr(18, 18, 106, 82, "sa-sky") + fr(18, 70, 106, 30, "sa-water") + l("M44 70V28M80 70V22M108 70V34", "") + p("M44 28l14 4-14 4z", "sa-red") + p("M80 22l14 4-14 4z", "sa-tag") + p("M30 70h28l-4 6H34zM66 70h30l-4 6H70z", "sa-paper");
        return room("sa-wall", "sa-floor") + fr(0, 86, 320, 42, "sa-wood2") + l("M0 86h320M40 86v42M100 86v42M160 86v42M220 86v42M280 86v42", "t") + windowAt(16, 16, 110, 86, view) +
          r(140, 24, 60, 74, "sa-wood") + r(146, 30, 48, 62, "sa-glass") + p("M154 52h12l-2 8h-8z", "sa-tag") + l("M160 60v6", "") + p("M174 46h12l-2 10h-8z", "sa-tag") + l("M180 56v6M156 76h28", "") + p("M162 68h14l-2 8h-10z", "sa-tag") +
          cork(214, 22, 48, 36) + r(272, 24, 38, 42, "sa-wood2") + l("M280 32v4M292 32v4M304 32v4M280 48v4M292 48v4", "w3") + r(277, 37, 6, 10, "sa-tag", 2) + r(289, 37, 6, 10, "sa-tag", 2) + r(277, 53, 6, 10, "sa-tag", 2) +
          p("M240 134l8-36h8l8 36z", "sa-wood") + p("M234 98l22-10 22 10-22 6z", "sa-paper") +
          p("M34 128c0-22 10-24 28-24s28 2 28 24v12H34z", "sa-green") + r(28, 120, 12, 26, "sa-green", 4) + r(84, 120, 12, 26, "sa-green", 4) + r(36, 140, 54, 10, "sa-green", 2) +
          r(150, 130, 44, 6, "sa-metal") + r(150, 156, 44, 6, "sa-metal") + l("M152 136v20M192 136v20", "w3") + ci(156, 168, 5, "sa-ink") + ci(188, 168, 5, "sa-ink") + bottle(160, 130, "sa-green") + bottle(176, 130, "sa-tag") +
          r(102, 130, 26, 6, "sa-wood") + l("M106 136v40M124 136v40", "w3") + r(106, 120, 18, 10, "sa-red", 2) + bin(284, 160);
      } },
    newsroom: { name: "Newspaper office", anchors: { window: A(48, 44), corkboard: A(136, 40), clock: A(198, 30), cabinet: A(294, 92), typewriter: A(52, 92), phone: A(140, 94), camera: A(98, 92), papers: A(214, 150), coat: A(250, 70), bin: A(178, 172) },
      draw: function () {
        var view = fr(16, 18, 66, 56, "sa-sky") + p("M16 74V50h14v-8h12v14h10v-20h14v38z", "sa-metal2");
        return room("sa-wall2", "sa-floor") + windowAt(14, 16, 70, 60, view) + cork(96, 18, 80, 46) + l("M106 30L150 50M120 54l38-26", "string") + clock(198, 30, 14) +
          r(276, 40, 36, 94, "sa-metal") + l("M276 70h36M276 100h36", "") + r(288, 52, 12, 4, "sa-ink") + r(288, 82, 12, 4, "sa-ink") + r(288, 112, 12, 4, "sa-ink") +
          table(18, 104, 156) + p("M34 104l4-18h28l4 18z", "sa-metal2") + r(40, 80, 24, 8, "sa-paper") + l("M40 96h24", "t") +
          r(88, 88, 20, 16, "sa-ink", 3) + ci(98, 96, 4, "sa-glass") + r(128, 96, 22, 8, "sa-red", 2) + p("M130 96c0-6 18-6 18 0", "sa-red") +
          coatRack(250, 28, "sa-tag") + r(196, 136, 40, 8, "sa-paper") + r(198, 144, 38, 8, "sa-paper") + r(194, 152, 42, 8, "sa-paper") + r(198, 160, 38, 8, "sa-paper") + l("M204 140h22M204 156h22", "t") + bin(160, 158);
      } },
    market: { name: "Fish market", anchors: { lamp: A(160, 32), stall: A(78, 88), board: A(166, 112), scales: A(222, 74), cashbox: A(290, 88), crates: A(36, 166), nets: A(50, 38), icechest: A(246, 166), cart: A(126, 172) },
      draw: function () {
        var fish = ""; for (var i = 0; i < 5; i++) fish += p("M" + (24 + i * 22) + " 84c6-6 14-6 18 0-4 6-12 6-18 0zM" + (42 + i * 22) + " 84l5-4v8z", "sa-fish");
        return room("sa-wall", "sa-floor2") + fr(0, 0, 320, 12, "sa-wood") + l("M0 12h320M40 0v12M120 0v12M200 0v12M280 0v12", "t") +
          l("M20 20h70M20 20l8 40M34 20l8 40M48 20l8 40M62 20l8 40M76 20l8 40M90 20l-8 40M24 34h64M27 48h58", "t") +
          l("M160 12v14", "w3") + p("M148 26h24l6 10h-36z", "sa-metal2") + fp("M146 36l-16 40h60l-16-40z", "sa-glow") +
          r(14, 90, 132, 44, "sa-wood") + r(10, 78, 140, 12, "sa-ice") + fish + r(152, 96, 30, 22, "sa-night") + l("M156 104h18M156 110h14", "chalk") + l("M160 118l-6 16M174 118l6 16", "w3") +
          r(188, 96, 124, 38, "sa-wood") + r(206, 84, 30, 6, "sa-metal") + l("M221 90v6", "w3") + ci(221, 72, 10, "sa-paper") + l("M221 72l4-6") + r(280, 80, 22, 14, "sa-red", 2) +
          crate(12, 150, 44, 34) + crate(58, 158, 40, 26) + r(226, 152, 46, 32, "sa-paper", 3) + r(222, 146, 54, 8, "sa-glass", 3) +
          r(104, 164, 48, 10, "sa-wood2") + ci(114, 182, 6, "sa-ink") + ci(142, 182, 6, "sa-ink") + l("M152 164l14-14", "w3");
      } }
  };

  function scene(id) {
    var s = SCENES[id] || SCENES.office;
    return '<svg class="scene-art" viewBox="0 0 320 210" role="img" aria-label="' + s.name + '">' + s.draw() + "</svg>";
  }

  /* ---------- icons: 32x32, ink lines in currentColor ---------- */
  var IC = {
    bin: "M8 10h16l-2 18H10zM6 10h20M13 6h6v4M13 14v10M19 14v10",
    clock: "M16 5a11 11 0 110 22 11 11 0 010-22zM16 9v7l-5 3",
    logbook: "M5 7c4-2 8-2 11 1 3-3 7-3 11-1v19c-4-2-8-2-11 1-3-3-7-3-11-1zM16 8v19M8 12h5M8 16h5M19 12h5M19 16h5",
    coat: "M16 4v4M12 8l4 3 4-3 6 4-2 6h-2v10H10V18H8l-2-6zM16 11v17",
    window: "M5 4h22v24H5zM16 4v24M5 16h22M8 9c2 1 4-1 6 0M18 21c2 1 4-1 6 0",
    drawer: "M4 6h24v20H4zM4 16h24M13 11h6M13 21h6",
    receipt: "M8 3h16v25l-3-2-2.5 2-2.5-2-2.5 2-2.5-2-3 2zM11 9h10M11 13h10M11 17h6M18 21h3",
    key: "M10 11a5 5 0 110 10 5 5 0 010-10zM15 16h13M24 16v4M28 16v3",
    phone: "M9 3h14v26H9zM14 25h4M12 9h8M12 13h8M12 17h5",
    camera: "M4 9l18 5-2 6L3 14zM20 18l4 2v6M24 26h4",
    photo: "M5 5h22v22H5zM8 8h16v13H8zM8 18l5-5 4 4 3-2 4 4",
    crate: "M4 9h24v18H4zM4 15h24M4 21h24M10 9v18M22 9v18",
    boat: "M3 20h26l-4 6H7zM9 20v-6h12v6M13 14V9h5v5M3 29c3-1.5 5-1.5 8 0s5 1.5 8 0 5-1.5 8 0",
    rope: "M6 26c10 0 3-10 10-10s0 10 10 10M16 16c-5 0-7-4-4-7s8-1 8 3",
    lamp: "M11 4h10l4 10H7zM16 14v10M10 28h12M13 24h6",
    safe: "M4 5h24v22H4zM15 11a5 5 0 110 10 5 5 0 010-10zM15 11v2M15 19v2M24 13v6",
    bag: "M6 11h20l-2 17H8zM11 11V8a5 5 0 0110 0v3",
    ticket: "M4 9h24v4a3 3 0 000 6v4H4v-4a3 3 0 000-6zM20 9v14",
    letter: "M4 8h24v17H4zM4 8l12 10 12-10",
    laptop: "M7 7h18v13H7zM3 24h26l-2-4H5z",
    cup: "M7 10h14v12a4 4 0 01-4 4h-6a4 4 0 01-4-4zM21 13h3a3 3 0 010 6h-3M11 4v3M15 4v3",
    cashbox: "M4 11h24v15H4zM4 16h24M14 16v4h4v-4M9 11V8h14v3",
    door: "M8 3h16v26H8zM20 16v2M4 29h24",
    car: "M4 20l3-8h18l3 8v5H4zM8 25v3M24 25v3M9 12l2-4h10l2 4M9 20h2M21 20h2",
    map: "M4 7l8-3 8 3 8-3v21l-8 3-8-3-8 3zM12 4v21M20 7v21",
    tool: "M20 4a6 6 0 00-6 8L5 21l6 6 9-9a6 6 0 008-6l-4 4-4-4 4-4z",
    bottle: "M13 3h6v5l3 5v15H10V13l3-5zM10 17h12",
    badge: "M16 3l4 4h6v6l4 4-4 4v6h-6l-4 4-4-4H6v-6l-4-4 4-4V7h6z",
    radio: "M4 11h24v16H4zM9 11l14-7M19 16a3 3 0 110 6 3 3 0 010-6zM8 16h6M8 20h6",
    net: "M4 6h24M6 6l4 22M12 6l2 22M20 6l-2 22M26 6l-4 22M5 12h22M6 18h20M8 24h16",
    pins: "M10 28s6-6 6-11a6 6 0 00-12 0c0 5 6 11 6 11zM22 22s5-5 5-9a5 5 0 00-10 0",
    walker: "M17 3a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM16 9l-4 8 4 2 1 8M12 17l-3 9M16 11l5 4 4-1M15 11l-4 3-3-1",
    fog: "M8 18a6 6 0 016-9 7 7 0 0113 3 4 4 0 01-1 8H9a4 4 0 01-1-2zM5 25h22M9 29h14",
    sum: "M5 3h22v26H5zM9 7h14v6H9zM10 18h2M15 18h2M20 18h2M10 23h2M15 23h2M20 23h2",
    // screen icons (also allowed in stories)
    search: "M13 5a8 8 0 110 16 8 8 0 010-16zM19 19l9 9",
    ask: "M5 7h22v14H14l-6 5v-5H5zM13 11.5c0-2 1.5-3 3-3s3 1 3 2.7c0 2.3-3 2.3-3 4.3M16 18v.5",
    scales: "M16 4v24M9 28h14M6 9h20M6 9l-4 9h8zM26 9l-4 9h8z",
    check: "M7 17l6 6 12-13",
    lock: "M7 14h18v13H7zM11 14V10a5 5 0 0110 0v4",
    pin: "M16 29s9-9 9-16a9 9 0 00-18 0c0 7 9 16 9 16zM16 10a3 3 0 110 6 3 3 0 010-6z"
  };
  var ICONS = Object.keys(IC);
  function icon(id, cls) {
    return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="' + (IC[id] || IC.clock) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  var LIES = {
    time: { icon: "clock", name: "Wrong time", line: "A log or receipt shows another time." },
    place: { icon: "pins", name: "Two places at once", line: "Someone else saw them somewhere else." },
    travel: { icon: "walker", name: "Too fast", line: "Nobody gets there that quickly." },
    seen: { icon: "fog", name: "Couldn't have seen it", line: "Fog, dark, or a shop that was shut." },
    holder: { icon: "key", name: "Who had it", line: "The thing was with someone else." },
    count: { icon: "sum", name: "Doesn't add up", line: "The money or the count is wrong." }
  };

  // what a story may name; the drawings stay private to this file
  var PUBLIC = {};
  Object.keys(SCENES).forEach(function (id) { PUBLIC[id] = { name: SCENES[id].name, anchors: SCENES[id].anchors }; });
  window.WLArt = { SCENES: PUBLIC, scene: scene, ICONS: ICONS, icon: icon, LIES: LIES };
})();
