/* LIARHUNT — past cases page */
(function () {
  "use strict";
  var WL = window.WL, esc = WL.esc;
  var TODAY = WL.dayNumber();
  var hist = (WL.load().history) || {};
  var list = document.getElementById("days"), more = document.getElementById("more");
  var PAGE = 30, next = TODAY - 1;

  if (window.WLAds) { window.WLAds.init(); window.WLAds.display(document.getElementById("ad-archive")); }

  if (next < 1) {
    list.innerHTML = '<div class="empty"><p><strong>No past cases yet.</strong> Daily #1 is today.</p>' +
      "<p>Come back tomorrow to replay it here, with every answer explained.</p>" +
      '<a class="btn primary wide" href="./">Play today\'s cases</a></div>';
    return;
  }

  function answerHtml(c, i) {
    var who = c.mode === "planted"
      ? "<strong>The planted fact:</strong> " + esc(c.clues[c.answer])
      : "<strong>" + (c.mode === "honest" ? "The only honest one:" : "The liar:") + "</strong> " +
        esc(c.suspects[c.answer].name) + " (" + esc(c.suspects[c.answer].role) + ")";
    var proof = !(c.proof || []).length ? "" : "<span><strong>The proof:</strong> " + (c.mode === "planted" ? esc(c.suspects[c.proof[0]].name) + "'s story"
      : c.proof.map(function (k) { return "“" + esc(c.clues[k]) + "”"; }).join(" + ")) + "</span>";
    return "<li><b>Case " + (i + 1) + ": " + esc(c.title) + "</b><span>" + esc(c.setup) + "</span><span>" + who + "</span>" + proof + "<span>" + esc(c.why) + "</span></li>";
  }

  function row(d) {
    var h = hist[d];
    var art = document.createElement("article");
    art.className = "day"; art.id = "day-" + d;
    art.innerHTML =
      '<div class="day-head"><h2>Daily #' + d + '</h2><span class="day-date">' + WL.formatDate(WL.dateForDay(d), "short") + "</span>" +
      (h ? '<span class="chip">' + h.score + "/5" + (h.replay ? " replay" : "") + "</span>" : "") + "</div>" +
      '<div class="day-actions"><a class="btn small primary" href="./#day-' + d + '">' + (h ? "Play again" : "Play") + "</a>" +
      // answers are built up front (still folded away) so search engines can read every past case
      "<details><summary>Show answers (spoilers)</summary><ol class=\"answers\">" + WL.buildDay(d).map(answerHtml).join("") + "</ol></details></div>";
    return art;
  }

  function showMore(untilDay) {
    var stop = Math.max(1, Math.min(next - PAGE + 1, untilDay || Infinity));
    for (var d = next; d >= stop; d--) list.appendChild(row(d));
    next = stop - 1;
    more.hidden = next < 1;
  }
  more.addEventListener("click", function () { showMore(); });

  var m = location.hash.match(/^#day-(\d+)$/);
  var target = m ? parseInt(m[1], 10) : 0;
  showMore(target > 0 && target < TODAY ? target : undefined);
  if (target) {
    var el = document.getElementById("day-" + target);
    if (el) el.scrollIntoView({ block: "center" });
  }
})();
