// Bağımlılıksız site derleyici: content/*.json + templates/*.html -> dist/
const fs = require('fs'), path = require('path');
const root = __dirname, dist = path.join(root, 'dist');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const body = t => String(t || '').trim().split(/\n{2,}/).filter(Boolean).map(p => {
  if (/^\s*</.test(p)) return p;
  if (/^##\s/.test(p)) return `<h2>${esc(p.slice(3))}</h2>`;
  return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
}).join('\n');
const list = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => ({ slug: f.slice(0, -5), ...read(path.join(d, f)) })) : [];
const T = n => fs.readFileSync(path.join(root, 'templates', n + '.html'), 'utf8');
const R = (n, v) => T(n).replace(/{{(\w+)}}/g, (_, k) => v[k] ?? '');

const S = { hours: [], gallery: [], menu: [], features: [], reviews: [], venue: [], logo_icon: '☕', header_color: '#dfcfb4', ...read(path.join(root, 'content/settings.json')) };
const menuCats = list(path.join(root, 'content/menu')).sort((a, b) => (a.order || 99) - (b.order || 99));
const events = list(path.join(root, 'content/events')).filter(e => e.active !== false && e.date).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || '')));
const TAGS = { vegan: 'Vegan', glutensiz: 'Glutensiz', yeni: 'Yeni', soguk: 'Soğuk', sicak: 'Sıcak', sekersiz: 'Şekersiz' };
const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

// Renkli vektör yer tutucu + üstüne binen resim
const hue = s => 15 + ([...String(s || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 35;
const ph = (name, img, cls = '') => `<div class="ph ${cls}" style="--h:${hue(name)}">` + (img ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy" onerror="this.remove()">` : '') + '</div>';

const hours = DAYS.map((d, i) => ({ day: (S.hours[i] && S.hours[i].day) || d, open: S.hours[i]?.open || '09:00', close: S.hours[i]?.close || '22:00', closed: !!S.hours[i]?.closed }));
const hoursHtml = hours.map(h => `<li><span>${esc(h.day)}</span><b>${h.closed ? 'Kapalı' : esc(h.open) + ' – ' + esc(h.close)}</b></li>`).join('');
const openBox = `<div class="open" data-hours="${esc(JSON.stringify(hours))}"><span class="dot"></span><span class="txt"></span></div>`;
const wa = String(S.wa || S.whatsapp || '').replace(/\D/g, '');
const tel = String(S.phone || '').replace(/[^\d+]/g, '');
const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(S.map_query || S.address || '')}&output=embed&hl=tr`;
const evdata = '<script type="application/json" id="evdata">' + JSON.stringify(events.map(e => ({ d: String(e.date).slice(0, 10), t: e.title, tm: e.time || '', i: e.icon || '', ii: e.icon_image || '', im: e.image || '', x: e.description || '' }))).replace(/</g, '\\u003c') + '</script>';

const itemCard = (it, catSlug) => R('card', { href: `/menu/#${catSlug}`, media: ph(it.name, it.image), name: esc(it.name), desc: esc(it.description), price: esc(it.price) });
const allItems = menuCats.flatMap(c => (c.items || []).map(it => ({ ...it, _c: c.slug })));
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
    header_color: esc(S.header_color), address: esc(S.address), phone: esc(S.phone), tel: esc(tel), email: esc(S.email), social,
    wa: esc(wa), footer: esc(S.footer_text), open: openBox,
  }));
}

// Ana sayfa
write('', '', '', R('home', {
  kicker: esc(S.kicker), hero_title: esc(S.hero_title), hero_text: esc(S.hero_text), hero_media: ph(S.hero_title, S.hero_image, 'hero-ph'),
  open: openBox, popular: popular.map(i => itemCard(i, i._c)).join(''),
  about_title: esc(S.about_title), about_text: body(S.about_text), about_media: ph(S.about_title, S.about_image),
  hours: hoursHtml, address: esc(S.address), map: mapSrc, evdata,
  features: (S.features || []).map(f => `<div class="feat"><div class="fi">${f.image ? `<img src="${esc(f.image)}" alt="${esc(f.title)}">` : esc(f.icon)}</div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join(''),
  reviews: (S.reviews || []).map(r => `<blockquote class="rev"><span class="stars">★★★★★</span><p>${esc(r.text)}</p><b>${esc(r.name)}</b></blockquote>`).join(''),
  gallery: (S.gallery || []).map(g => `<figure>${ph(g.caption, g.image)}<figcaption>${esc(g.caption)}</figcaption></figure>`).join(''),
}));

// Menü (her ürünün küçük resmi solda)
write('menu', 'Menü', '', R('menu', {
  chips: menuCats.map(c => `<a href="#${c.slug}">${esc(c.title)}</a>`).join(''),
  sections: menuCats.map(c => `<section class="mcat" id="${c.slug}"><h2>${esc(c.title)}</h2>${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}<div class="mgrid">` +
    (c.items || []).map(it => `<div class="mi">${ph(it.name, it.image, 'th')}<div class="mi-b"><div class="mi-h"><b>${esc(it.name)}</b>${(it.tags || []).map(t => `<em class="tg tg-${esc(t)}">${esc(TAGS[t] || t)}</em>`).join('')}<span class="dots"></span><span class="pr">${esc(it.price)}</span></div><p>${esc(it.description)}</p></div></div>`).join('') +
    '</div></section>').join(''),
}));

write('etkinlikler', 'Etkinlik Takvimi', '', R('etkinlikler', { evdata }));
write('rezervasyon', 'Rezervasyon', '', T('rezervasyon'));
write('iletisim', 'İletişim', '', R('iletisim', { address: esc(S.address), phone: esc(S.phone), tel: esc(tel), email: esc(S.email), hours: hoursHtml, open: openBox, map: mapSrc, wa: esc(wa),
  venue: (S.venue || []).map(v => `<figure>${ph(v.caption, v.image)}<figcaption>${esc(v.caption)}</figcaption></figure>`).join('') }));

// Normal sayfalar (isteğe bağlı resimli bölümlerle)
for (const p of list(path.join(root, 'content/pages')))
  write(p.slug, p.title, '', R('page', { title: esc(p.title), body: body(p.body),
    sections: (p.sections || []).map(s => `<section class="srow"><div>${ph(s.title, s.image)}</div><div><h2>${esc(s.title)}</h2>${body(s.text)}</div></section>`).join('') }));
console.log('Derlendi:', menuCats.length, 'menü kategorisi,', allItems.length, 'ürün,', events.length, 'etkinlik');
