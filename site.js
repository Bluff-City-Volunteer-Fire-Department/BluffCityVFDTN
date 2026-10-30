// Fills the public pages with content from the department database.
// If anything fails, the page keeps its built-in text, so the site never goes blank.
(function () {
  var C = window.BCVFD; if (!C) return;

  (function logoFallback() {
    var im = document.querySelector(".brand img"); if (!im) return;
    var cands = ["logo.png", "logo.jpg", "logo.jpeg", "logo.webp", "logo.svg"], i = 0;
    function next() {
      if (im.dataset.fromSettings) return;
      i++;
      if (i < cands.length) { im.style.display = ""; im.src = cands[i]; } else { im.removeAttribute("src"); im.style.display = "none"; }
    }
    im.addEventListener("error", next);
    if (im.complete && im.naturalWidth === 0) next();
  })();

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
    var ab = c.about || {};
    document.querySelectorAll("[data-para]").forEach(function (el) { var v = (ab[el.getAttribute("data-para").split(".")[1]] || ""); if (v) el.innerHTML = para(v); });
    if (r.what_to_expect) document.querySelectorAll('[data-content="recruitment.what_to_expect"]').forEach(function (el) { el.textContent = r.what_to_expect; });
    if (r.who_can_apply) document.querySelectorAll('[data-content="recruitment.who_can_apply"]').forEach(function (el) { el.textContent = r.who_can_apply; });
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

  function thumbOf(p) { return /\.jpg$/.test(p) ? p.replace(/\.jpg$/, "_t.jpg") : p; }
  function collage(rows) {
    var box = document.querySelector("[data-collage]"); if (!box || !rows.length) return;
    var n = Math.min(rows.length, 5);
    if (n < 2) { var hero = box.parentNode; hero.style.backgroundImage = "url('" + photoUrl(rows[0].path) + "')"; return; }
    box.className = "collage c" + n;
    box.innerHTML = rows.slice(0, n).map(function (r) { return '<img src="' + esc(photoUrl(r.path)) + '" alt="">'; }).join("");
  }
  /* ----- gallery ----- */
  function lightbox(items) {
    var lb = document.querySelector(".lb"), img = lb.querySelector("img"), cap = lb.querySelector("figcaption"), i = 0, opener = null, x0 = null;
    function show(k) { i = (k + items.length) % items.length; img.src = items[i].url || photoUrl(items[i].path); img.alt = items[i].caption || ""; cap.textContent = items[i].caption || ""; }
    function open(k, el) { opener = el; show(k); lb.hidden = false; document.body.style.overflow = "hidden"; lb.querySelector(".lb-x").focus(); }
    function close() { lb.hidden = true; document.body.style.overflow = ""; if (opener) opener.focus(); }
    lb.querySelector(".lb-x").onclick = close; lb.querySelector(".lb-p").onclick = function () { show(i - 1); }; lb.querySelector(".lb-n").onclick = function () { show(i + 1); };
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) { if (lb.hidden) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
    return open;
  }
  function gallery() {
    var box = document.getElementById("gal"); if (!box) return;
    var id = new URLSearchParams(location.search).get("album");
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) { box.innerHTML = "<p>That album could not be found.</p>"; return; }
      Promise.all([get("albums?select=*&id=eq." + id), get("album_photos?select=*&album_id=eq." + id + "&order=sort_order.asc")]).then(function (r) {
        var a = r[0][0], ph = r[1]; if (!a) { box.innerHTML = "<p>That album could not be found.</p>"; return; }
        document.title = a.title + " | Bluff City Volunteer Fire Department";
        box.innerHTML = '<p><a href="gallery.html">&larr; All albums</a></p><div class="eyebrow">' + esc(a.category) + (a.event_date ? " &middot; " + esc(fmtDate(a.event_date + "T12:00:00Z")) : "") + "</div><h2>" + esc(a.title) + "</h2>" +
          (a.description ? '<div class="prose">' + para(a.description) + "</div>" : "") +
          (ph.length ? '<div class="thumbs">' + ph.map(function (p, k) { return '<button type="button" data-k="' + k + '" aria-label="' + esc(p.caption || ("Photo " + (k + 1))) + '"><img src="' + esc(photoUrl(thumbOf(p.path))) + '" alt="" loading="lazy"></button>'; }).join("") + "</div>" : '<p class="muted">Photos coming soon.</p>');
        if (!ph.length) return;
        var open = lightbox(ph);
        box.querySelectorAll(".thumbs button").forEach(function (b) { b.addEventListener("click", function () { open(+b.getAttribute("data-k"), b); }); });
      }).catch(function () { box.innerHTML = "<p>This album could not be loaded right now. Please try again later.</p>"; });
      return;
    }
    get("albums?select=id,title,category,event_date,description,cover_path&order=event_date.desc.nullslast&limit=200").then(function (rows) {
      if (!rows.length) { box.innerHTML = '<p class="muted">Albums are coming soon. Check back for photos from our events and community activities.</p>'; return; }
      var cats = []; rows.forEach(function (r) { if (cats.indexOf(r.category) < 0) cats.push(r.category); });
      var cur = "All";
      function draw() {
        var list = rows.filter(function (r) { return cur === "All" || r.category === cur; });
        box.innerHTML = '<div class="filters" role="group" aria-label="Filter albums">' + ["All"].concat(cats).map(function (c) { return '<button type="button" aria-pressed="' + (c === cur) + '" data-c="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>" +
          '<div class="albums">' + list.map(function (a) {
            return '<article class="card"><a class="cardlink" href="gallery.html?album=' + encodeURIComponent(a.id) + '">' +
              (a.cover_path ? '<img src="' + esc(photoUrl(thumbOf(a.cover_path))) + '" alt="" loading="lazy">' : '<div class="nophoto">Photos coming soon</div>') +
              '<div class="body"><p class="meta up">' + esc(a.category) + (a.event_date ? " &middot; " + esc(fmtDate(a.event_date + "T12:00:00Z")) : "") + "</p><h3>" + esc(a.title) + "</h3></div></a></article>";
          }).join("") + "</div>";
        box.querySelectorAll(".filters button").forEach(function (b) { b.addEventListener("click", function () { cur = b.getAttribute("data-c"); draw(); box.querySelector('.filters button[aria-pressed="true"]').focus(); }); });
      }
      draw();
    }).catch(function () { box.innerHTML = "<p>The gallery could not be loaded right now. Please try again later.</p>"; });
  }

  function signPaths(paths) {
    if (!paths.length) return Promise.resolve({});
    return fetch(C.url + "/storage/v1/object/sign/incident-media", { method: "POST", headers: { apikey: C.key, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3600, paths: paths }) })
      .then(function (r) { return r.json(); }).then(function (arr) { var m = {}; (arr || []).forEach(function (x) { if (x.signedURL) m[x.path] = C.url + "/storage/v1" + x.signedURL; }); return m; });
  }
  function calls() {
    var box = document.getElementById("calls"); if (!box) return;
    var id = new URLSearchParams(location.search).get("id");
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) { box.innerHTML = "<p>That response could not be found.</p>"; return; }
      Promise.all([get("incidents?select=*&id=eq." + id), get("incident_photos?select=*&incident_id=eq." + id + "&order=sort_order.asc")]).then(function (r) {
        var a = r[0][0], ph = r[1]; if (!a) { box.innerHTML = "<p>That response could not be found.</p>"; return; }
        var paths = []; ph.forEach(function (p) { paths.push(p.path, thumbOf(p.path)); });
        return signPaths(paths).then(function (m) {
          document.title = a.category + " | Bluff City Volunteer Fire Department";
          var apps = (a.responding_apparatus || []).join(", ");
          box.innerHTML = '<p><a href="calls.html">&larr; All recent calls</a></p><div class="eyebrow">' + esc(fmtDate(a.incident_date + "T12:00:00Z")) + "</div><h2>" + esc(a.category) + (a.general_location ? " &mdash; " + esc(a.general_location) : "") + "</h2>" +
            '<div class="meta-grid"><div><span>Type</span>' + esc(a.category) + "</div>" + (a.general_location ? "<div><span>General location</span>" + esc(a.general_location) + "</div>" : "") +
            (apps ? "<div><span>Responding apparatus</span>" + esc(apps) + "</div>" : "") + (a.assisting_agencies ? "<div><span>Assisting agencies</span>" + esc(a.assisting_agencies) + "</div>" : "") + "</div>" +
            (a.narrative ? '<div class="prose">' + para(a.narrative) + "</div>" : "") +
            (ph.length ? '<div class="thumbs">' + ph.map(function (p, k) { return '<button type="button" data-k="' + k + '" aria-label="' + esc(p.caption || ("Photo " + (k + 1))) + '"><img src="' + esc(m[thumbOf(p.path)] || "") + '" alt="" loading="lazy"></button>'; }).join("") + "</div>" : "");
          if (!ph.length) return;
          var items = ph.map(function (p) { return { url: m[p.path], caption: p.caption }; }), open = lightbox(items);
          box.querySelectorAll(".thumbs button").forEach(function (b) { b.addEventListener("click", function () { open(+b.getAttribute("data-k"), b); }); });
        });
      }).catch(function () { box.innerHTML = "<p>This response could not be loaded right now. Please try again later.</p>"; });
      return;
    }
    get("incidents?select=id,incident_date,category,general_location,responding_apparatus,narrative&order=incident_date.desc&limit=300").then(function (rows) {
      if (!rows.length) { box.innerHTML = '<p class="muted">No recent calls have been posted yet. Check back soon.</p>'; return; }
      var cats = [], years = [];
      rows.forEach(function (r) { var y = r.incident_date.slice(0, 4); if (cats.indexOf(r.category) < 0) cats.push(r.category); if (years.indexOf(y) < 0) years.push(y); });
      function sel(label, id, vals) { return '<label><span>' + label + '</span><select id="' + id + '"><option value="">All</option>' + vals.map(function (v) { return '<option>' + esc(v) + "</option>"; }).join("") + "</select></label>"; }
      box.innerHTML = '<div class="ctl">' + sel("Category", "fc", cats) + sel("Year", "fy", years) + '</div><div class="albums" id="clist"></div>';
      function draw() {
        var c = document.getElementById("fc").value, y = document.getElementById("fy").value;
        var list = rows.filter(function (r) { return (!c || r.category === c) && (!y || r.incident_date.slice(0, 4) === y); });
        document.getElementById("clist").innerHTML = list.length ? list.map(function (r) {
          var n = (r.narrative || ""); if (n.length > 160) n = n.slice(0, 160).replace(/\s+\S*$/, "") + "\u2026";
          return '<article class="card"><a class="cardlink" href="calls.html?id=' + encodeURIComponent(r.id) + '"><div class="body"><p class="meta up">' + esc(fmtDate(r.incident_date + "T12:00:00Z")) + "</p><h3>" + esc(r.category) + "</h3>" +
            (r.general_location ? '<p class="type">' + esc(r.general_location) + "</p>" : "") + (r.responding_apparatus && r.responding_apparatus.length ? '<p class="meta">' + esc(r.responding_apparatus.join(", ")) + "</p>" : "") +
            (n ? '<p class="meta">' + esc(n) + "</p>" : "") + "</div></a></article>";
        }).join("") : '<p class="muted">No calls match those filters.</p>';
      }
      document.getElementById("fc").addEventListener("change", draw); document.getElementById("fy").addEventListener("change", draw); draw();
    }).catch(function () { box.innerHTML = "<p>Recent calls could not be loaded right now. Please try again later.</p>"; });
  }
  function siteSettings(rows) {
    var s = {}; rows.forEach(function (r) { s[r.key] = r.value; });
    var items = s.navigation, ul = document.querySelector("header.site nav ul");
    if (Array.isArray(items) && items.length && ul) {
      var here = location.pathname.split("/").pop() || "index.html";
      ul.innerHTML = items.filter(function (it) { return it && typeof it.label === "string" && /^[a-z]+\.html$/.test(it.href || ""); }).map(function (it) {
        return '<li><a href="' + esc(it.href) + '"' + (it.href === here ? ' aria-current="page"' : "") + ">" + esc(it.label) + "</a></li>"; }).join("");
    }
    var logo = s.branding && s.branding.logo_path, im = document.querySelector(".brand img");
    if (logo && im) { im.dataset.fromSettings = "1"; im.src = photoUrl(logo); im.style.display = ""; }
    if (s.footer && s.footer.blurb) document.querySelectorAll('[data-footer="blurb"]').forEach(function (el) { el.textContent = s.footer.blurb; });
  }

  function forms() {
    document.querySelectorAll("form[data-form]").forEach(function (f) {
      var status = f.querySelector(".form-status"), btn = f.querySelector('button[type="submit"]');
      var fallback = "Sorry, that did not send. Please call 423-538-5221 or come to our Tuesday night meeting at 7 PM.";
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!C.web3formsKey) { status.textContent = "This form is not connected yet. Please call 423-538-5221 or come to our Tuesday night meeting at 7 PM."; return; }
        var fd = new FormData(f); if (fd.get("botcheck")) return;
        var data = {}; fd.forEach(function (v, k) { if (k !== "botcheck") data[k] = v; });
        data.access_key = C.web3formsKey; data.subject = f.getAttribute("data-subject"); data.from_name = "Bluff City VFD website";
        btn.disabled = true; status.textContent = "Sending\u2026";
        fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (!j.success) throw new Error(j.message || "failed"); f.reset(); status.textContent = f.getAttribute("data-thanks"); })
          .catch(function () { status.textContent = fallback; })
          .then(function () { btn.disabled = false; });
      });
    });
  }

  get("apparatus?select=*&is_active=eq.true&order=sort_order.asc").then(apparatus).catch(function () {});
  get("site_content?select=key,value").then(content).catch(function () {});
  if (document.querySelector("[data-events-upcoming],[data-home-events]")) get("events?select=*&status=eq.published&order=starts_at.asc&limit=300").then(events).catch(function () {});
  if (document.querySelector("[data-news],[data-home-news]")) get("news?select=id,title,category,summary,cover_path,published_at&status=eq.published&order=published_at.desc&limit=60").then(news).catch(function () {});
  article();
  forms();
  calls();
  get("site_settings?select=key,value").then(siteSettings).catch(function () {});
  gallery();
  if (document.querySelector("[data-collage]")) get("homepage_photos?select=path&is_featured=eq.true&order=sort_order.asc&limit=5").then(collage).catch(function () {});
})();
