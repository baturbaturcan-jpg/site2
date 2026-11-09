(function () {
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // Menüde açık sayfayı işaretle
  var path = location.pathname.replace(/index\.html$/, '');
  $$('nav a').forEach(function (a) {
    var h = a.getAttribute('href');
    if (h === path || (h !== '/' && path.indexOf(h) === 0)) a.setAttribute('aria-current', 'page');
  });

  // Şimdi açık / kapalı
  $$('.open').forEach(function (el) {
    var h; try { h = JSON.parse(el.dataset.hours); } catch (e) { return; }
    var now = new Date(), t = h[(now.getDay() + 6) % 7], cur = now.getHours() * 60 + now.getMinutes();
    var m = function (s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
    var isOpen = t && !t.closed && cur >= m(t.open) && cur < m(t.close);
    el.classList.add(isOpen ? 'on' : 'off');
    el.querySelector('.txt').textContent = isOpen ? 'Şimdi açığız · ' + t.close + "'e kadar" :
      (t && !t.closed && cur < m(t.open) ? 'Şu an kapalı · bugün ' + t.open + "'de açılıyoruz" : 'Şu an kapalı');
  });

  // Formlar (Netlify Forms)
  $$('form.js-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = form.querySelector('button'), m = form.querySelector('.fmsg');
      b.disabled = true;
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
        .then(function (r) { if (!r.ok) throw 0; form.reset(); m.textContent = 'Teşekkürler! Talebiniz bize ulaştı.'; m.className = 'fmsg ok'; })
        .catch(function () { m.textContent = 'Gönderilemedi, lütfen tekrar deneyin.'; m.className = 'fmsg err'; })
        .then(function () { b.disabled = false; });
    });
  });

  // WhatsApp balonu (tüm sayfalarda sabit)
  var wa = document.querySelector('.wa');
  if (wa) {
    var box = wa.querySelector('.wa-box'), ta = wa.querySelector('textarea'), send = wa.querySelector('.wa-send');
    var link = function () { send.href = 'https://wa.me/' + wa.dataset.wa + '?text=' + encodeURIComponent(ta.value || 'Merhaba'); };
    ta.addEventListener('input', link); link();
    wa.querySelector('.wa-fab').addEventListener('click', function () { box.hidden = !box.hidden; if (!box.hidden) ta.focus(); });
    wa.querySelector('.wa-x').addEventListener('click', function () { box.hidden = true; });
  }

  // Duyurular: tarih aralığına göre göster (her yıl tekrar desteği), birden fazlaysa döndür
  var wrapA = document.querySelector('.annwrap');
  if (wrapA) {
    var tdy = new Date(), t = tdy.getFullYear() + '-' + (tdy.getMonth() < 9 ? '0' : '') + (tdy.getMonth() + 1) + '-' + (tdy.getDate() < 10 ? '0' : '') + tdy.getDate();
    var inRange = function (a) {
      var f = a.dataset.from || '', u = a.dataset.until || '';
      if (a.dataset.yearly === '1') {
        var md = t.slice(5), fm = f ? f.slice(5) : '01-01', um = u ? u.slice(5) : '12-31';
        return fm <= um ? (md >= fm && md <= um) : (md >= fm || md <= um);
      }
      return (!f || t >= f) && (!u || t <= u);
    };
    var live = $$('.ann').filter(inRange);
    if (!live.length) { wrapA.remove(); }
    else {
      var cur = 0, timer;
      var show = function (i) { cur = i; live.forEach(function (a, k) { a.hidden = k !== i; }); $$('.adots button').forEach(function (b, k) { b.className = k === i ? 'on' : ''; }); };
      show(0);
      if (live.length > 1) {
        var dots = document.createElement('div'); dots.className = 'adots';
        live.forEach(function (a, k) { var b = document.createElement('button'); b.setAttribute('aria-label', (k + 1) + '. duyuru'); b.onclick = function () { show(k); }; dots.appendChild(b); });
        wrapA.appendChild(dots); show(0);
        timer = setInterval(function () { show((cur + 1) % live.length); }, 7000);
        wrapA.addEventListener('mouseenter', function () { clearInterval(timer); });
      }
    }
  }

  // Etkinlikler
  var evEl = document.getElementById('evdata'), EV = [];
  try { EV = JSON.parse(evEl.textContent); } catch (e) {}
  var MON = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var WD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var key = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
  var hue = function (s) { var h = 0; for (var i = 0; i < s.length; i++) h += s.charCodeAt(i); return 15 + (h * 7) % 35; };
  var phs = function (title, img) { return '<div class="ph" style="--h:' + hue(title) + '">' + (img ? '<img src="' + esc(img) + '" alt="' + esc(title) + '" loading="lazy" onerror="this.remove()">' : '') + '</div>'; };
  var fdate = function (k) { var p = k.split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; };
  var icon = function (e) { return e.ii ? '<img src="' + esc(e.ii) + '" alt="">' : esc(e.i || '📌'); };
  var now = new Date(), tk = key(now.getFullYear(), now.getMonth(), now.getDate());
  var by = {}; EV.forEach(function (e) { (by[e.d] = by[e.d] || []).push(e); });
  var next = EV.filter(function (e) { return e.d >= tk; })[0];

  var upc = document.getElementById('upc');
  if (upc) {
    var ups = EV.filter(function (e) { return e.d >= tk; }).slice(0, 3);
    upc.innerHTML = ups.length ? ups.map(function (e) {
      return '<a class="upcard" href="/etkinlikler/">' + phs(e.t, e.im) + '<div class="t"><small>' + icon(e) + ' ' + fdate(e.d) + (e.tm ? ' · ' + esc(e.tm) : '') + '</small><h4>' + esc(e.t) + '</h4></div></a>';
    }).join('') : '<p>Yakında yeni etkinlikler eklenecek.</p>';
  }

  var cal = document.getElementById('cal'), panel = document.getElementById('evpanel');
  if (cal && panel) {
    var cur = next ? new Date(+next.d.slice(0, 4), +next.d.slice(5, 7) - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
    var sel = by[tk] ? tk : (next ? next.d : null);
    var draw = function () {
      var y = cur.getFullYear(), m = cur.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), h = '';
      h += '<div class="cal-h"><button data-nav="-1" aria-label="Önceki ay">‹</button><b>' + MON[m] + ' ' + y + '</b><button data-nav="1" aria-label="Sonraki ay">›</button></div><div class="cal-g">';
      WD.forEach(function (w) { h += '<div class="cal-w">' + w + '</div>'; });
      for (var i = 0; i < first; i++) h += '<div></div>';
      for (var d = 1; d <= n; d++) {
        var k = key(y, m, d), es = by[k];
        h += es ? '<button class="day has' + (k === tk ? ' today' : '') + (k === sel ? ' sel' : '') + '" data-d="' + k + '"><span>' + d + '</span><span class="ic">' + es.map(icon).join('') + '</span></button>'
          : '<div class="day' + (k === tk ? ' today' : '') + '"><span>' + d + '</span></div>';
      }
      cal.innerHTML = h + '</div>';
      var ph = '';
      if (sel && by[sel]) {
        ph = by[sel].map(function (e) {
          return '<article class="evc">' + phs(e.t, e.im) + '<div class="eb"><div class="ei">' + icon(e) + '</div><h3>' + esc(e.t) + '</h3><div class="em">' + fdate(e.d) + (e.tm ? ' · ' + esc(e.tm) : '') + '</div><p>' + esc(e.x) + '</p><a class="btn" href="/rezervasyon/">Yer Ayırt</a></div></article>';
        }).join('');
      } else ph = '<p class="lead">Etkinliğini görmek için takvimde işaretli bir güne tıklayın.</p>';
      var list = EV.filter(function (e) { return e.d.slice(0, 7) === y + '-' + pad(m + 1); });
      ph += '<div class="emonth"><h3>' + MON[m] + ' ayındaki etkinlikler</h3>' + (list.length ? list.map(function (e) {
        return '<button data-d="' + e.d + '"><span>' + icon(e) + '</span><span>' + fdate(e.d) + ' · ' + esc(e.t) + '</span></button>';
      }).join('') : '<p>Bu ay etkinlik yok.</p>') + '</div>';
      panel.innerHTML = ph;
    };
    var click = function (e) {
      var nv = e.target.closest('[data-nav]');
      if (nv) { cur = new Date(cur.getFullYear(), cur.getMonth() + (+nv.dataset.nav), 1); draw(); return; }
      var d = e.target.closest('[data-d]');
      if (d) { sel = d.dataset.d; draw(); }
    };
    cal.addEventListener('click', click); panel.addEventListener('click', click);
    draw();
  }
})();
