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
    var h = c.home_hero || {};
    function hero(name, fn) { var el = document.querySelector('[data-hero="' + name + '"]'); if (el) fn(el); }
    if (h.eyebrow) hero("eyebrow", function (el) { el.textContent = h.eyebrow; });
    if (h.text) hero("text", function (el) { el.textContent = h.text; });
    if (h.headline_line_1 || h.headline_line_2 || h.headline_accent) hero("headline", function (el) {
      el.innerHTML = esc(h.headline_line_1) + "<br>" + esc(h.headline_line_2) + (h.headline_accent ? " <em>" + esc(h.headline_accent) + "</em>" : "");
    });
  }

  get("apparatus?select=*&is_active=eq.true&order=sort_order.asc").then(apparatus).catch(function () {});
  get("site_content?select=key,value").then(content).catch(function () {});
})();
