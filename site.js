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

  /* ----- homepage announcement pop-up ----- */
  var ANN_CLASS = { "Community Events": "community", "Fundraisers": "fundraiser", "Recruitment": "recruit", "Public Safety Notices": "safety", "Department Announcements": "dept", "Special Events": "special" };
  function safeUrl(u) { return /^(https?:\/\/[^\s]+|[a-z0-9_.\/#?=&%-]+)$/i.test(u || "") ? u : ""; }
  function announcement() {
    if (!document.querySelector(".hero")) return;                      // homepage only
    get("announcements?select=*&limit=1").then(function (rows) {
      var a = rows[0]; if (!a) return;
      var key = "bcvfd-ann:" + a.id + ":" + a.revision;                 // new announcement OR new revision = shows again
      try { if (localStorage.getItem(key)) return; } catch (e) {}
      var url = safeUrl(a.button_url), external = /^https?:/i.test(url);
      var wrap = document.createElement("div"); wrap.className = "ann-overlay";
      wrap.innerHTML = '<div class="ann ann-' + (ANN_CLASS[a.category] || "dept") + (a.importance === "important" ? " ann-important" : "") + '" role="dialog" aria-modal="true" aria-labelledby="ann-t"' + (a.body ? ' aria-describedby="ann-d"' : "") + ' tabindex="-1">' +
        '<button type="button" class="ann-x" aria-label="Close announcement">&times;</button>' +
        (a.image_path ? '<img class="ann-img" src="' + esc(photoUrl(a.image_path)) + '" alt="">' : "") +
        '<div class="ann-body"><p class="ann-tag"><span>' + esc(a.category) + "</span>" + (a.importance === "important" ? '<span class="ann-flag">Important</span>' : "") + '</p><h2 id="ann-t">' + esc(a.title) + "</h2>" +
        (a.body ? '<div id="ann-d">' + para(a.body) + "</div>" : "") +
        '<div class="ann-actions">' + (a.button_label && url ? '<a class="btn primary" href="' + esc(url) + '"' + (external ? ' target="_blank" rel="noopener"' : "") + ">" + esc(a.button_label) + "</a>" : "") +
        '<button type="button" class="btn ghost ann-close">Close</button></div></div></div>';
      var opener = document.activeElement, dlg = wrap.firstChild;
      function close() {
        try { localStorage.setItem(key, "1"); } catch (e) {}
        document.removeEventListener("keydown", onKey, true); wrap.remove(); document.body.style.overflow = "";
        if (opener && opener.focus) opener.focus();
      }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); close(); return; }
        if (e.key !== "Tab") return;
        var f = dlg.querySelectorAll("a[href],button:not([disabled])"); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
      dlg.querySelector(".ann-x").addEventListener("click", close); dlg.querySelector(".ann-close").addEventListener("click", close);
      var link = dlg.querySelector(".ann-actions a"); if (link) link.addEventListener("click", function () { try { localStorage.setItem(key, "1"); } catch (e) {} });
      document.body.appendChild(wrap); document.body.style.overflow = "hidden"; document.addEventListener("keydown", onKey, true);
      dlg.querySelector(".ann-x").focus();
    }).catch(function () {});
  }
  function storeApplication(f) {
    var fd = new FormData(f), n = function (k) { var v = fd.get(k); return v ? String(v).trim() : null; };
    var row = { full_name: n("name"), phone: n("Phone"), email: n("email"), age: n("Age") ? parseInt(n("Age"), 10) : null, address: n("Address"), experience: n("Experience"),
      motivation: n("Why you want to join"), availability: n("Availability"), agreed_to_contact: !!fd.get("Agreed to be contacted") };
    return fetch(C.url + "/rest/v1/applications", { method: "POST", headers: { apikey: C.key, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(row) })
      .then(function (r) { if (!r.ok) throw new Error("store " + r.status); });
  }
  var S2 = { s: {}, c: {} };
  function moreSettings() {
    var s = S2.s, c = S2.c, here = location.pathname.split("/").pop() || "index.html", detail = /[?&](id|album)=/.test(location.search);
    var seo = s.seo && s.seo[here];
    if (seo && !detail) {
      if (seo.title) document.title = seo.title;
      if (seo.description) { var m = document.querySelector('meta[name="description"]'); if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); } m.content = seo.description; }
    }
    var soc = s.social || {}, links = [["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["x", "X"], ["tiktok", "TikTok"]].filter(function (p) { return /^https:\/\//i.test(soc[p[0]] || ""); });
    var col = document.querySelector("footer .grid > div");
    if (col && links.length && !col.querySelector(".social")) {
      var sp = document.createElement("p"); sp.className = "social";
      sp.innerHTML = links.map(function (p2) { return '<a href="' + esc(soc[p2[0]]) + '" target="_blank" rel="noopener">' + p2[1] + "</a>"; }).join(" &middot; "); col.appendChild(sp);
    }
    var d = c.donation;
    if (d) {
      document.querySelectorAll('[data-rich="donation.intro"]').forEach(function (el) { if (d.intro) el.innerHTML = rich(d.intro); });
      document.querySelectorAll("[data-donation-ways]").forEach(function (ul) {
        if (d.ways) ul.innerHTML = String(d.ways).split("\n").map(function (l) { return l.trim().replace(/^[-\u2022*]\s*/, ""); }).filter(Boolean).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("");
        var box = ul.parentNode;
        if (/^https:\/\//i.test(d.online_url || "") && !box.querySelector(".donate-online")) { var q = document.createElement("p"); q.className = "donate-online"; q.innerHTML = '<a class="btn primary" href="' + esc(d.online_url) + '" target="_blank" rel="noopener">' + esc(d.online_label || "Donate online") + "</a>"; box.appendChild(q); }
        if (d.tax_id && !box.querySelector(".taxid")) { var t = document.createElement("p"); t.className = "taxid muted"; t.textContent = "Tax ID (EIN): " + d.tax_id; box.appendChild(t); }
      });
    }
  }

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
    S2.c = c; moreSettings();
    var ab = c.about || {};
    document.querySelectorAll("[data-para]").forEach(function (el) { var v = (ab[el.getAttribute("data-para").split(".")[1]] || ""); if (v) el.innerHTML = para(v); });
    if (r.what_to_expect) document.querySelectorAll('[data-rich="recruitment.what_to_expect"]').forEach(function (el) { el.innerHTML = rich(r.what_to_expect); });
    if (r.who_can_apply) document.querySelectorAll('[data-rich="recruitment.who_can_apply"]').forEach(function (el) { el.innerHTML = rich(r.who_can_apply); });
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
  function rich(t) {
    return String(t || "").split(/\n\s*\n/).map(function (b) {
      var lines = b.split("\n").map(function (l) { return l.trim(); }).filter(Boolean); if (!lines.length) return "";
      if (lines.every(function (l) { return /^[-\u2022*]\s+/.test(l); })) return "<ul>" + lines.map(function (l) { return "<li>" + esc(l.replace(/^[-\u2022*]\s+/, "")) + "</li>"; }).join("") + "</ul>";
      return "<p>" + esc(lines.join("\n")).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function people(rows) {
    var box = document.querySelector("[data-people]"); if (!box || !rows.length) return;
    var yr = new Date().getFullYear();
    box.innerHTML = rows.map(function (m) {
      var ini = (m.full_name || "").split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
      var img = m.photo_path ? '<img src="' + esc(photoUrl(m.photo_path)) + '" alt="' + esc(m.full_name) + '" loading="lazy">' : '<div class="ph" role="img" aria-label="No photo of ' + esc(m.full_name) + '">' + esc(ini) + "</div>";
      var svc = "";
      if (m.member_since) { var n = yr - m.member_since; svc = "Member since " + m.member_since + (n >= 1 ? " &middot; " + n + (n === 1 ? " year" : " years") + " of service" : ""); }
      return '<article class="person">' + img + '<div class="body"><h3>' + esc(m.full_name) + "</h3>" + (m.title ? '<p class="role">' + esc(m.title) + "</p>" : "") + (svc ? '<p class="svc">' + svc + "</p>" : "") + "</div></article>";
    }).join("");
  }

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

  /* ----- Recent Calls detail page ----- */
  var AG_ICONS = {
    fire: '<path d="M12 2c1 3.5-1.5 5-1.5 8a3 3 0 0 0 6 0c0-1.2-.5-2-1-3 2.6 1.6 4.5 4.3 4.5 7.5a8 8 0 1 1-16 0C4 9 8.5 7 12 2z"/>',
    law: '<path d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5l8-3zm0 5l1.5 3.2 3.5.4-2.6 2.4.7 3.5L12 14.8 8.9 16.5l.7-3.5L7 10.6l3.5-.4L12 7z"/>',
    ems: '<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z"/>',
    rescue: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill-rule="evenodd"/>',
    other: '<path d="M3 21V9l9-6 9 6v12h-6v-7H9v7H3z"/>'
  };
  var CLS_LABEL = { primary: "Primary Responding Agency", automatic_aid: "Automatic Aid", mutual_aid: "Mutual Aid", additional: "Additional Responding Agency" };
  function timeText(t) { if (!t) return ""; var p = String(t).split(":"), h = parseInt(p[0], 10); if (isNaN(h)) return ""; return (h % 12 || 12) + ":" + p[1] + " " + (h >= 12 ? "PM" : "AM"); }
  function incidentRender(box, a, photos, ags, isPreview) {
    var title = a.title || (a.category + (a.general_location ? " \u2014 " + a.general_location : ""));
    document.title = (a.title || a.category) + " | Bluff City Volunteer Fire Department";
    var when = fmtDate(a.incident_date + "T12:00:00Z") + (a.incident_time ? " \u00b7 " + timeText(a.incident_time) : ""), apps = (a.responding_apparatus || []).join(", ");
    function meta(k, v) { return v ? '<div><span class="k">' + k + '</span><span class="v">' + esc(v) + "</span></div>" : ""; }
    var html = (isPreview ? '<div class="preview-bar">PREVIEW &mdash; this is how the page will look. It is not published.</div>' : "") + '<article class="incident">' +
      '<header class="inc-head"><div class="eyebrow">' + esc(a.category) + '</div><h2 class="inc-title">' + esc(title) + '</h2><div class="inc-meta">' +
      meta("Date &amp; time", when).replace(esc(when), esc(when)) + meta("Incident type", a.category) + meta("Location", a.general_location) + meta("Responding apparatus", apps) + "</div></header>" +
      (a.narrative ? '<div class="inc-narr">' + para(a.narrative) + "</div>" : "");
    var n = photos.length;
    function fig(p, k, src, cls, cap) {
      return '<figure class="' + cls + '"><button type="button" class="g-btn" data-k="' + k + '" aria-label="' + esc(p.caption || ("Enlarge photo " + (k + 1))) + '"><img src="' + esc(src) + '" alt="' + esc(p.caption || ("Incident photo " + (k + 1))) + '"' + (k > 0 ? ' loading="lazy"' : "") + "></button>" +
        (cap && p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "") + "</figure>";
    }
    if (n === 1) html += '<section class="inc-gallery" aria-label="Incident photographs">' + fig(photos[0], 0, photos[0].url, "g-single", true) + "</section>";
    else if (n === 2) html += '<section class="inc-gallery" aria-label="Incident photographs"><div class="g-pair">' + fig(photos[0], 0, photos[0].url, "g-cell", false) + fig(photos[1], 1, photos[1].url, "g-cell", false) + "</div></section>";
    else if (n > 2) {
      var rest = n - 1, cols = { 2: 2, 3: 3, 4: 2, 5: 3, 6: 3 }[rest] || 4;
      html += '<section class="inc-gallery" aria-label="Incident photographs">' + fig(photos[0], 0, photos[0].url, "g-feature", true) + '<div class="g-rest" style="grid-template-columns:repeat(' + cols + ',1fr)">' +
        photos.slice(1).map(function (p, i) { return fig(p, i + 1, cols <= 2 ? p.url : p.thumb, "g-cell", false); }).join("") + "</div></section>";
    }
    if (ags.length) html += '<section class="inc-agencies" aria-labelledby="ag-h"><h2 id="ag-h">Responding &amp; Assisting Agencies</h2><div class="agency-grid">' + ags.map(function (g) {
      var icon = g.logo ? '<img src="' + esc(g.logo) + '" alt="">' : '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">' + (AG_ICONS[g.type] || AG_ICONS.other) + "</svg>";
      return '<div class="agency"><span class="ic">' + icon + '</span><div><h3>' + esc(g.name) + "</h3>" + (g.classification && CLS_LABEL[g.classification] ? '<span class="cls">' + CLS_LABEL[g.classification] + "</span>" : "") + "</div></div>";
    }).join("") + "</div></section>";
    html += '<p class="inc-back"><a class="btn ghost" href="calls.html">&larr; Back to Recent Calls</a></p></article>';
    box.innerHTML = html;
    if (n) { var open = lightbox(photos), btns = box.querySelectorAll(".g-btn"); btns.forEach(function (b) { b.addEventListener("click", function () { open(+b.getAttribute("data-k"), b); }); }); }
  }

  function signPaths(paths) {
    if (!paths.length) return Promise.resolve({});
    return fetch(C.url + "/storage/v1/object/sign/incident-media", { method: "POST", headers: { apikey: C.key, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3600, paths: paths }) })
      .then(function (r) { return r.json(); }).then(function (arr) { var m = {}; (arr || []).forEach(function (x) { if (x.signedURL) m[x.path] = C.url + "/storage/v1" + x.signedURL; }); return m; });
  }
  function calls() {
    var box = document.getElementById("calls"); if (!box) return;
    var id = new URLSearchParams(location.search).get("id");
    var preview = new URLSearchParams(location.search).get("preview") === "1";
    if (id || preview) {
      if (preview) {
        var pv = null; try { pv = JSON.parse(localStorage.getItem("bcvfd-preview") || "null"); } catch (e) {}
        if (!pv || Date.now() - pv.t > 30 * 60 * 1000) { box.innerHTML = "<p>This preview has expired. Go back to the dashboard and click Preview again.</p>"; return; }
        incidentRender(box, pv.incident, pv.photos || [], pv.agencies || [], true); return;
      }
      if (!/^[0-9a-f-]{36}$/i.test(id)) { box.innerHTML = "<p>That response could not be found.</p>"; return; }
      Promise.all([get("incidents?select=*&id=eq." + id), get("incident_photos?select=*&incident_id=eq." + id + "&order=sort_order.asc"),
        get("incident_agencies?select=classification,sort_order,agencies(name,agency_type,logo_path)&incident_id=eq." + id + "&order=sort_order.asc").catch(function () { return []; })]).then(function (r) {
        var a = r[0][0], ph = r[1]; if (!a) { box.innerHTML = "<p>That response could not be found.</p>"; return; }
        var paths = []; ph.forEach(function (p) { paths.push(p.path, thumbOf(p.path)); });
        return signPaths(paths).then(function (m) {
          var photos = ph.map(function (p) { return { url: m[p.path], thumb: m[thumbOf(p.path)] || m[p.path], caption: p.caption }; }).filter(function (p) { return p.url; });
          var ags = (r[2] || []).filter(function (x) { return x.agencies; }).map(function (x) { return { name: x.agencies.name, type: x.agencies.agency_type, logo: x.agencies.logo_path ? photoUrl(x.agencies.logo_path) : "", classification: x.classification }; });
          incidentRender(box, a, photos, ags, false);
        });
      }).catch(function () { box.innerHTML = "<p>This response could not be loaded right now. Please try again later.</p>"; });
      return;
    }
    get("incidents?select=id,incident_date,category,title,general_location,responding_apparatus,narrative&order=incident_date.desc&limit=300").then(function (rows) {
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
          return '<article class="card"><a class="cardlink" href="calls.html?id=' + encodeURIComponent(r.id) + '"><div class="body"><p class="meta up">' + esc(fmtDate(r.incident_date + "T12:00:00Z")) + "</p><h3>" + esc(r.title || r.category) + "</h3>" +
            (r.title ? '<p class="meta up">' + esc(r.category) + "</p>" : "") + (r.general_location ? '<p class="type">' + esc(r.general_location) + "</p>" : "") + (r.responding_apparatus && r.responding_apparatus.length ? '<p class="meta">' + esc(r.responding_apparatus.join(", ")) + "</p>" : "") +
            (n ? '<p class="meta">' + esc(n) + "</p>" : "") + "</div></a></article>";
        }).join("") : '<p class="muted">No calls match those filters.</p>';
      }
      document.getElementById("fc").addEventListener("change", draw); document.getElementById("fy").addEventListener("change", draw); draw();
    }).catch(function () { box.innerHTML = "<p>Recent calls could not be loaded right now. Please try again later.</p>"; });
  }
  function siteSettings(rows) {
    var s = {}; rows.forEach(function (r) { s[r.key] = r.value; });
    S2.s = s; moreSettings();
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
        var fd = new FormData(f); if (fd.get("botcheck")) return;
        var isApp = !!f.closest("#apply"), key = f.closest("#message") ? (C.web3formsContactKey || C.web3formsKey) : C.web3formsKey, tasks = [];
        if (isApp) tasks.push(storeApplication(f));
        if (key) {
          var data = {}; fd.forEach(function (v, k) { if (k !== "botcheck") data[k] = v; });
          data.access_key = key; data.subject = f.getAttribute("data-subject"); data.from_name = "Bluff City VFD website";
          tasks.push(fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
            .then(function (r) { return r.json(); }).then(function (j) { if (!j.success) throw new Error(j.message || "failed"); }));
        }
        if (!tasks.length) { status.textContent = "This form is not connected yet. Please call 423-538-5221 or come to our Tuesday night meeting at 7 PM."; return; }
        btn.disabled = true; status.textContent = "Sending\u2026";
        Promise.allSettled(tasks).then(function (res) {
          var ok = res.some(function (r) { return r.status === "fulfilled"; });
          if (ok) { f.reset(); status.textContent = f.getAttribute("data-thanks"); } else status.textContent = fallback;
          btn.disabled = false;
        });
      });
    });
  }

  get("apparatus?select=*&is_active=eq.true&order=sort_order.asc").then(apparatus).catch(function () {});
  get("site_content?select=key,value").then(content).catch(function () {});
  if (document.querySelector("[data-events-upcoming],[data-home-events]")) get("events?select=*&status=eq.published&order=starts_at.asc&limit=300").then(events).catch(function () {});
  if (document.querySelector("[data-news],[data-home-news]")) get("news?select=id,title,category,summary,cover_path,published_at&status=eq.published&order=published_at.desc&limit=60").then(news).catch(function () {});
  article();
  announcement();
  if (document.querySelector("[data-people]")) get("members?select=*&is_active=eq.true&order=sort_order.asc").then(people).catch(function () {});
  forms();
  calls();
  get("site_settings?select=key,value").then(siteSettings).catch(function () {});
  gallery();
  if (document.querySelector("[data-collage]")) get("homepage_photos?select=path&is_featured=eq.true&order=sort_order.asc&limit=5").then(collage).catch(function () {});
})();
