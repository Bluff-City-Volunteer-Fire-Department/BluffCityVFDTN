// Fills the public pages with content from the department database.
// If anything fails, the page keeps its built-in text, so the site never goes blank.
(function () {
  var C = window.BCVFD; if (!C) return;
  function get(path) {
    return fetch(C.url + "/rest/v1/" + path, { headers: { apikey: C.key } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function photoUrl(p) { return C.url + "/storage/v1/object/public/media/" + p.split("/").map(encodeURIComponent).join("/"); }

  function apparatus(rows) {
    var boxes = document.querySelectorAll("[data-apparatus]");
    if (!boxes.length || !rows.length) return;
    var html = rows.map(function (a) {
      var src = a.photo_path ? photoUrl(a.photo_path) : (a.legacy_photo || "");
      var img = src
        ? '<img src="' + esc(src) + '" alt="' + esc(a.unit_number) + '" loading="lazy">'
        : '<div class="nophoto" role="img" aria-label="Photo of ' + esc(a.unit_number) + ' coming soon">Photo coming soon</div>';
      return '<article class="card">' + img + '<div class="body"><h3>' + esc(a.unit_number) + "</h3>" +
        (a.apparatus_type ? '<p class="type">' + esc(a.apparatus_type) + "</p>" : "") +
        (a.year_make_model ? '<p class="meta">' + esc(a.year_make_model) + "</p>" : "") +
        (a.description ? '<p class="meta">' + esc(a.description) + "</p>" : "") + "</div></article>";
    }).join("");
    boxes.forEach(function (b) { b.innerHTML = html; });
  }

  function setTel(oldHref, number) {
    if (!number) return;
    var digits = number.replace(/\D/g, "");
    document.querySelectorAll('a[href="' + oldHref + '"]').forEach(function (a) {
      a.textContent = number;
      if (digits.length === 10) a.setAttribute("href", "tel:+1" + digits);
    });
  }
  function twoLines(el, text) {
    var i = text.indexOf(", ");
    el.innerHTML = i > 0 ? esc(text.slice(0, i)) + "<br>" + esc(text.slice(i + 2)) : esc(text);
  }

  function content(rows) {
    var c = {}; rows.forEach(function (r) { c[r.key] = r.value || {}; });
    var k = c.contact || {};
    setTel("tel:+14235385221", k.phone);
    setTel("tel:+14232797330", k.non_emergency_phone);
    document.querySelectorAll('[data-contact="station_address"]').forEach(function (el) { if (k.station_address) twoLines(el, k.station_address); });
    document.querySelectorAll('[data-contact="mailing_address"]').forEach(function (el) {
      if (!k.mailing_address) return;
      if (el.hasAttribute("data-break")) twoLines(el, k.mailing_address); else el.textContent = k.mailing_address;
    });
    var m = c.meetings || {};
    if (m.text) document.querySelectorAll('[data-content="meetings.text"]').forEach(function (el) { el.textContent = m.text; });
    var r = c.recruitment || {};
    if (r.text) document.querySelectorAll('[data-content="recruitment.text"]').forEach(function (el) { el.textContent = r.text; });
    if (r.how_to_start) document.querySelectorAll('[data-content="recruitment.how_to_start"]').forEach(function (el) { el.textContent = r.how_to_start; });
    featured(c.featured);
    var h = c.home_hero || {};
    function hero(name, fn) { var el = document.querySelector('[data-hero="' + name + '"]'); if (el) fn(el); }
    if (h.eyebrow) hero("eyebrow", function (el) { el.textContent = h.eyebrow; });
    if (h.text) hero("text", function (el) { el.textContent = h.text; });
    if (h.headline_line_1 || h.headline_line_2 || h.headline_accent) hero("headline", function (el) {
      el.innerHTML = esc(h.headline_line_1) + "<br>" + esc(h.headline_line_2) + (h.headline_accent ? " <em>" + esc(h.headline_accent) + "</em>" : "");
    });
  }


  var TZ = "America/New_York";
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: TZ }) : ""; }
  function para(t) { return String(t || "").split(/\n\s*\n/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""); }
  function eventHTML(e) {
    var d = new Date(e.starts_at);
    var mon = d.toLocaleDateString("en-US", { month: "short", timeZone: TZ }), day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: TZ });
    var time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
    return '<article class="event"><div class="date"><span>' + esc(mon) + "</span><b>" + esc(day) + "</b><span>" + esc(time) + "</span></div><div><h3>" + esc(e.name) + "</h3>" +
      (e.location ? "<p><strong>" + esc(e.location) + "</strong></p>" : "") +
      (e.photo_path ? '<img src="' + esc(photoUrl(e.photo_path)) + '" alt="" loading="lazy">' : "") +
      (e.description ? para(e.description) : "") + (e.contact_info ? "<p>Contact: " + esc(e.contact_info) + "</p>" : "") + "</div></article>";
  }
  function newsHTML(n) {
    return '<article class="card"><a class="cardlink" href="article.html?id=' + encodeURIComponent(n.id) + '">' +
      (n.cover_path ? '<img src="' + esc(photoUrl(n.cover_path)) + '" alt="" loading="lazy">' : "") +
      '<div class="body"><p class="meta up">' + esc(fmtDate(n.published_at)) + " &middot; " + esc(n.category) + "</p><h3>" + esc(n.title) + "</h3>" +
      (n.summary ? '<p class="type" style="font-weight:400">' + esc(n.summary) + "</p>" : "") + "</div></a></article>";
  }
  function fill(box, html, hasAny) {
    box.innerHTML = html;
    var next = box.nextElementSibling; if (hasAny && next && next.hasAttribute("data-empty")) next.remove();
  }
  function events(rows) {
    var now = Date.now(), up = [], past = [];
    rows.forEach(function (e) { var end = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 3 * 3600e3; (end >= now ? up : past).push(e); });
    past.reverse();
    document.querySelectorAll("[data-events-upcoming]").forEach(function (b) { b.innerHTML = up.map(eventHTML).join(""); });
    document.querySelectorAll("[data-home-events]").forEach(function (b) { b.innerHTML = up.slice(0, 3).map(eventHTML).join(""); });
    document.querySelectorAll("[data-events-past]").forEach(function (b) {
      if (!past.length) return; b.innerHTML = past.slice(0, 60).map(eventHTML).join("");
      var sec = b.closest("[data-past]"); if (sec) sec.hidden = false;
    });
  }
  function news(rows) {
    document.querySelectorAll("[data-news]").forEach(function (b) {
      var comm = b.getAttribute("data-news") === "community";
      var list = rows.filter(function (n) { return (n.category === "Community Events") === comm; });
      fill(b, list.map(newsHTML).join(""), list.length > 0);
    });
    document.querySelectorAll("[data-home-news]").forEach(function (b) { b.innerHTML = rows.slice(0, 3).map(newsHTML).join(""); });
  }
  function featured(f) {
    if (!f) return;
    var cards = document.querySelectorAll("[data-featured]");
    if (f.show === false || (!f.title && !f.text)) { cards.forEach(function (c) { c.remove(); }); return; }
    cards.forEach(function (c) {
      ["label", "big", "title", "text"].forEach(function (k) { var el = c.querySelector('[data-f="' + k + '"]'); if (el && f[k] != null) el.textContent = f[k]; });
    });
  }
  function article() {
    var box = document.querySelector("[data-article]"); if (!box) return;
    var id = new URLSearchParams(location.search).get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) { box.innerHTML = "<p>That article could not be found.</p>"; return; }
    get("news?select=*&id=eq." + id).then(function (rows) {
      var a = rows[0]; if (!a) { box.innerHTML = "<p>That article could not be found.</p>"; return; }
      document.title = a.title + " | Bluff City Volunteer Fire Department";
      box.innerHTML = '<div class="eyebrow">' + esc(fmtDate(a.published_at)) + " &middot; " + esc(a.category) + "</div><h2>" + esc(a.title) + "</h2>" +
        (a.cover_path ? '<img class="cover" src="' + esc(photoUrl(a.cover_path)) + '" alt="">' : "") + para(a.body || a.summary) +
        ((a.extra_paths && a.extra_paths.length) ? '<div class="photos">' + a.extra_paths.map(function (p) { return '<img src="' + esc(photoUrl(p)) + '" alt="" loading="lazy">'; }).join("") + "</div>" : "");
    }).catch(function () { box.innerHTML = "<p>This article could not be loaded right now. Please try again later.</p>"; });
  }

  get("apparatus?select=*&is_active=eq.true&order=sort_order.asc").then(apparatus).catch(function () {});
  get("site_content?select=key,value").then(content).catch(function () {});
  if (document.querySelector("[data-events-upcoming],[data-home-events]")) get("events?select=*&status=eq.published&order=starts_at.asc&limit=300").then(events).catch(function () {});
  if (document.querySelector("[data-news],[data-home-news]")) get("news?select=id,title,category,summary,cover_path,published_at&status=eq.published&order=published_at.desc&limit=60").then(news).catch(function () {});
  article();
})();
