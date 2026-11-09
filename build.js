// Bağımlılıksız site derleyici: content/*.json + templates/*.html -> dist/
const fs = require('fs'), path = require('path');
const root = __dirname, dist = path.join(root, 'dist');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const slugify = s => String(s).toLocaleLowerCase('tr').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const body = t => String(t || '').trim().split(/\n{2,}/).filter(Boolean).map(p => {
  if (/^\s*</.test(p)) return p;
  if (/^##\s/.test(p)) return `<h2>${esc(p.slice(3))}</h2>`;
  return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
}).join('\n');
const list = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => ({ slug: f.slice(0, -5), ...read(path.join(d, f)) })) : [];
const T = n => fs.readFileSync(path.join(root, 'templates', n + '.html'), 'utf8');
const R = (n, v) => T(n).replace(/{{(\w+)}}/g, (_, k) => v[k] ?? '');

const S = { hours: [], gallery: [], menu: [], features: [], reviews: [], venue: [], ads: [], logo_icon: '☕', header_color: '#dfcfb4', header_note: 'Rezervasyon', ...read(path.join(root, 'content/settings.json')) };
const menuCats = list(path.join(root, 'content/menu')).sort((a, b) => (a.order || 99) - (b.order || 99));
const events = list(path.join(root, 'content/events')).filter(e => e.active !== false && e.date).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || '')));
const TAGS = { vegan: 'Vegan', glutensiz: 'Glutensiz', yeni: 'Yeni', soguk: 'Soğuk', sicak: 'Sıcak', sekersiz: 'Şekersiz' };
const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const now = new Date();

// Renkli vektör yer tutucu + üstüne binen resim
const hue = s => 15 + ([...String(s || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 35;
const ph = (name, img, cls = '') => `<div class="ph ${cls}" style="--h:${hue(name)}">` + (img ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy" onerror="this.remove()">` : '') + '</div>';

const hours = DAYS.map((d, i) => ({ day: (S.hours[i] && S.hours[i].day) || d, open: S.hours[i]?.open || '09:00', close: S.hours[i]?.close || '22:00', closed: !!S.hours[i]?.closed }));
const hoursHtml = hours.map(h => `<li><span>${esc(h.day)}</span><b>${h.closed ? 'Kapalı' : esc(h.open) + ' – ' + esc(h.close)}</b></li>`).join('');
const openBox = `<div class="open" data-hours="${esc(JSON.stringify(hours))}"><span class="dot"></span><span class="txt"></span></div>`;
const wa = String(S.whatsapp || '').replace(/\D/g, '');
const tel = String(S.phone || '').replace(/[^\d+]/g, '');
const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(S.map_query || S.address || '')}&output=embed&hl=tr`;
const evdata = '<script type="application/json" id="evdata">' + JSON.stringify(events.map(e => ({ d: String(e.date).slice(0, 10), t: e.title, tm: e.time || '', i: e.icon || '', ii: e.icon_image || '', im: e.image || '', x: e.description || '' }))).replace(/</g, '\\u003c') + '</script>';

// Rahatsız etmeyen reklam alanları (açılır pencere, sabit ya da hareketli reklam yok)
const ADSIZE = { home: '728×90', menu: '728×90', events: '728×90', product: '300×250' };
const ad = slot => {
  if (S.ads_on === false) return '';
  const a = (S.ads || []).find(x => x.slot === slot && x.active !== false && (x.code || x.image));
  if (a) return `<aside class="ad ad-${slot}"><small>REKLAM</small>${a.code ? a.code : `<a href="${esc(a.url || '#')}" target="_blank" rel="sponsored noopener"><img src="${esc(a.image)}" alt="${esc(a.title)}"></a>`}</aside>`;
  return S.ad_placeholders === false ? '' : `<aside class="ad ad-ph ad-${slot}"><small>REKLAM</small><span>Reklam Alanı · ${ADSIZE[slot] || ''}</span></aside>`;
};

// Duyurular (tarih aralığına göre tarayıcıda gösterilir; her yıl tekrar seçeneği)
const anns = list(path.join(root, 'content/announcements')).filter(a => a.active !== false)
  .filter(a => a.yearly || !a.until || new Date(String(a.until).slice(0, 10) + 'T23:59:59') >= now);
const annHtml = anns.length ? `<section class="annwrap">${anns.map(a => `<article class="ann" hidden data-from="${esc(String(a.from || '').slice(0, 10))}" data-until="${esc(String(a.until || '').slice(0, 10))}" data-yearly="${a.yearly ? 1 : 0}" style="--ab:${esc(a.bg_color || '#b5651d')}">` +
  (a.image ? `<img class="bg" src="${esc(a.image)}" alt="" onerror="this.remove()">` : '') +
  `<div class="ann-t">${a.subtitle ? `<small>${esc(a.subtitle)}</small>` : ''}<h2>${esc(a.title)}</h2>${a.text ? `<p>${esc(a.text)}</p>` : ''}${a.link_url ? `<a class="btn" href="${esc(a.link_url)}">${esc(a.link_label || 'Detaylar')}</a>` : ''}</div></article>`).join('')}</section>` : '';

// Menü ürünleri: her ürünün kendi sayfası var
const allItems = menuCats.flatMap(c => (c.items || []).map(it => ({ ...it, _c: c, _s: slugify(it.name) })));
const itemUrl = it => `/urun/${it._s}/`;
const itemCard = it => R('card', { href: itemUrl(it), media: ph(it.name, it.image), name: esc(it.name), desc: esc(it.description), price: esc(it.price) });
const popular = (allItems.filter(i => i.popular).length ? allItems.filter(i => i.popular) : allItems).slice(0, 6);

const menu = (S.menu || []).map(m => `<a href="${esc(m.url)}">${esc(m.label)}</a>`).join('');
const announce = S.announce_on && S.announce_text ? `<div class="announce">${S.announce_url ? `<a href="${esc(S.announce_url)}">${esc(S.announce_text)}</a>` : esc(S.announce_text)}</div>` : '';
const social = S.instagram ? `<a href="${esc(S.instagram)}" target="_blank" rel="noopener">Instagram</a>` : '';
const logoMark = S.logo_image ? `<img class="logo-img" src="${esc(S.logo_image)}" alt="${esc(S.site_title)}">` : `<span class="logo-ico">${esc(S.logo_icon || '☕')}</span>`;

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, 'static'), dist, { recursive: true });
function write(u, title, desc, content) {
  const dir = path.join(dist, u);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), R('base', {
    title: esc(title ? title + ' | ' + S.site_title : S.site_title), description: esc(desc || S.tagline),
    site_title: esc(S.site_title), tagline: esc(S.tagline), menu, announce, content, hours: hoursHtml, logo_mark: logoMark,
    logo_cls: S.logo_uppercase === false ? '' : ' up', header_note: esc(S.header_note), header_color: esc(S.header_color),
    address: esc(S.address), phone: esc(S.phone), tel: esc(tel), email: esc(S.email), social,
    wa: esc(wa), footer: esc(S.footer_text), open: openBox,
  }));
}

// Ana sayfa
write('', '', '', R('home', {
  announcements: annHtml, kicker: esc(S.kicker), hero_title: esc(S.hero_title), hero_text: esc(S.hero_text), hero_media: ph(S.hero_title, S.hero_image, 'hero-ph'),
  open: openBox, popular: popular.map(itemCard).join(''), ad_home: ad('home'),
  about_title: esc(S.about_title), about_text: body(S.about_text), about_media: ph(S.about_title, S.about_image),
  hours: hoursHtml, address: esc(S.address), map: mapSrc, evdata,
  features: (S.features || []).map(f => `<div class="feat"><div class="fi">${f.image ? `<img src="${esc(f.image)}" alt="${esc(f.title)}">` : esc(f.icon)}</div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join(''),
  reviews: (S.reviews || []).map(r => `<blockquote class="rev"><span class="stars">★★★★★</span><p>${esc(r.text)}</p><b>${esc(r.name)}</b></blockquote>`).join(''),
  gallery: (S.gallery || []).map(g => `<figure>${ph(g.caption, g.image)}<figcaption>${esc(g.caption)}</figcaption></figure>`).join(''),
}));

// Menü: satırlara basınca ürün sayfasına gider
write('menu', 'Menü', '', R('menu', {
  chips: menuCats.map(c => `<a href="#${c.slug}">${esc(c.title)}</a>`).join(''),
  sections: menuCats.map((c, ci) => `<section class="mcat" id="${c.slug}"><h2>${esc(c.title)}</h2>${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}<div class="mgrid">` +
    allItems.filter(it => it._c === c).map(it => `<a class="mi" href="${itemUrl(it)}">${ph(it.name, it.image, 'th')}<div class="mi-b"><div class="mi-h"><b>${esc(it.name)}</b>${(it.tags || []).map(t => `<em class="tg tg-${esc(t)}">${esc(TAGS[t] || t)}</em>`).join('')}<span class="dots"></span><span class="pr">${esc(it.price)}</span></div><p>${esc(it.description)}</p></div></a>`).join('') +
    '</div></section>' + (ci === 1 ? ad('menu') : '')).join(''),
}));

// Ürün sayfaları
for (const it of allItems) {
  const facts = (it.ingredients ? `<dt>Malzemeler</dt><dd>${esc(it.ingredients)}</dd>` : '') + (it.allergens ? `<dt>Alerjen bilgisi</dt><dd>${esc(it.allergens)}</dd>` : '');
  write('urun/' + it._s, it.name, it.description, R('urun', {
    cat_slug: it._c.slug, cat_title: esc(it._c.title), media: ph(it.name, it.image, 'big'), name: esc(it.name), price: esc(it.price),
    tags: (it.tags || []).map(t => `<em class="tg tg-${esc(t)}">${esc(TAGS[t] || t)}</em>`).join(''),
    desc: esc(it.description), details: body(it.details), facts: facts ? `<dl class="facts">${facts}</dl>` : '',
    ad_product: ad('product'), related: allItems.filter(x => x._c === it._c && x !== it).slice(0, 3).map(itemCard).join(''),
  }));
}

write('etkinlikler', 'Etkinlik Takvimi', '', R('etkinlikler', { evdata, ad_events: ad('events') }));
write('rezervasyon', 'Rezervasyon', '', T('rezervasyon'));
write('iletisim', 'İletişim', '', R('iletisim', { address: esc(S.address), phone: esc(S.phone), tel: esc(tel), email: esc(S.email), hours: hoursHtml, open: openBox, map: mapSrc, wa: esc(wa),
  venue: (S.venue || []).map(v => `<figure>${ph(v.caption, v.image)}<figcaption>${esc(v.caption)}</figcaption></figure>`).join('') }));

for (const p of list(path.join(root, 'content/pages')))
  write(p.slug, p.title, '', R('page', { title: esc(p.title), body: body(p.body),
    sections: (p.sections || []).map(s => `<section class="srow"><div>${ph(s.title, s.image)}</div><div><h2>${esc(s.title)}</h2>${body(s.text)}</div></section>`).join('') }));
console.log('Derlendi:', menuCats.length, 'kategori,', allItems.length, 'ürün sayfası,', events.length, 'etkinlik,', anns.length, 'duyuru');
