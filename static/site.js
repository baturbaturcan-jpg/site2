(function () {
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
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
})();
