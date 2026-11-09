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

const S = { hours: [], gallery: [], menu: [], features: [], reviews: [], ...read(path.join(root, 'content/settings.json')) };
const menuCats = list(path.join(root, 'content/menu')).sort((a, b) => (a.order || 99) - (b.order || 99));
const TAGS = { vegan: 'Vegan', glutensiz: 'Glutensiz', yeni: 'Yeni', soguk: 'Soğuk', sicak: 'Sıcak', sekersiz: 'Şekersiz' };
const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

// Renkli vektör yer tutucu + üstüne binen resim
const hue = s => 15 + ([...String(s || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 35;
const ph = (name, img, cls = '') => `<div class="ph ${cls}" style="--h:${hue(name)}">` + (img ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy" onerror="this.remove()">` : '') + '</div>';

const hours = DAYS.map((d, i) => ({ day: (S.hours[i] && S.hours[i].day) || d, open: S.hours[i]?.open || '09:00', close: S.hours[i]?.close || '22:00', closed: !!S.hours[i]?.closed }));
const hoursHtml = hours.map(h => `<li><span>${esc(h.day)}</span><b>${h.closed ? 'Kapalı' : esc(h.open) + ' – ' + esc(h.close)}</b></li>`).join('');
const openBox = `<div class="open" data-hours="${esc(JSON.stringify(hours))}"><span class="dot"></span><span class="txt"></span></div>`;
const wa = String(S.whatsapp || '').replace(/\D/g, '');
const tel = String(S.phone || '').replace(/[^\d+]/g, '');
const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(S.map_query || S.address || '')}&output=embed&hl=tr`;

const itemCard = (it, catSlug) => R('card', { href: `/menu/#${catSlug}`, media: ph(it.name, it.image), name: esc(it.name), desc: esc(it.description), price: esc(it.price) });
const allItems = menuCats.flatMap(c => (c.items || []).map(it => ({ ...it, _c: c.slug })));
const popular = (allItems.filter(i => i.popular).length ? allItems.filter(i => i.popular) : allItems).slice(0, 6);

const menu = (S.menu || []).map(m => `<a href="${esc(m.url)}">${esc(m.label)}</a>`).join('');
const announce = S.announce_on && S.announce_text ? `<div class="announce">${S.announce_url ? `<a href="${esc(S.announce_url)}">${esc(S.announce_text)}</a>` : esc(S.announce_text)}</div>` : '';
const social = S.instagram ? `<a href="${esc(S.instagram)}" target="_blank" rel="noopener">Instagram</a>` : '';

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, 'static'), dist, { recursive: true });
function write(u, title, desc, content) {
  const dir = path.join(dist, u);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), R('base', {
    title: esc(title ? title + ' | ' + S.site_title : S.site_title), description: esc(desc || S.tagline),
    site_title: esc(S.site_title), tagline: esc(S.tagline), menu, announce, content, hours: hoursHtml,
    address: esc(S.address), phone: esc(S.phone), tel: esc(tel), email: esc(S.email), social,
    wa: esc(wa), footer: esc(S.footer_text), open: openBox,
  }));
}

// Ana sayfa
write('', '', '', R('home', {
  kicker: esc(S.kicker), hero_title: esc(S.hero_title), hero_text: esc(S.hero_text), hero_media: ph(S.hero_title, S.hero_image, 'hero-ph'),
  open: openBox, popular: popular.map(i => itemCard(i, i._c)).join(''),
  about_title: esc(S.about_title), about_text: body(S.about_text), about_media: ph(S.about_title, S.about_image),
  hours: hoursHtml, address: esc(S.address), map: mapSrc,
  features: (S.features || []).map(f => `<div class="feat"><i>${esc(f.icon)}</i><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join(''),
  reviews: (S.reviews || []).map(r => `<blockquote class="rev"><span class="stars">★★★★★</span><p>${esc(r.text)}</p><b>${esc(r.name)}</b></blockquote>`).join(''),
  gallery: (S.gallery || []).map(g => `<figure>${ph(g.caption, g.image)}<figcaption>${esc(g.caption)}</figcaption></figure>`).join(''),
}));

// Menü
write('menu', 'Menü', '', R('menu', {
  chips: menuCats.map(c => `<a href="#${c.slug}">${esc(c.title)}</a>`).join(''),
  sections: menuCats.map(c => `<section class="mcat" id="${c.slug}"><h2>${esc(c.title)}</h2>${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}<div class="mgrid">` +
    (c.items || []).map(it => `<div class="mi"><div class="mi-h"><b>${esc(it.name)}</b>${(it.tags || []).map(t => `<em class="tg tg-${esc(t)}">${esc(TAGS[t] || t)}</em>`).join('')}<span class="dots"></span><span class="pr">${esc(it.price)}</span></div><p>${esc(it.description)}</p></div>`).join('') +
    '</div></section>').join(''),
}));

// Rezervasyon, iletişim
write('rezervasyon', 'Rezervasyon', '', T('rezervasyon'));
write('iletisim', 'İletişim', '', R('iletisim', { address: esc(S.address), phone: esc(S.phone), tel: esc(tel), email: esc(S.email), hours: hoursHtml, open: openBox, map: mapSrc, wa: esc(wa) }));

// Normal sayfalar
for (const p of list(path.join(root, 'content/pages')))
  write(p.slug, p.title, '', R('page', { title: esc(p.title), body: body(p.body) }));
console.log('Derlendi:', menuCats.length, 'menü kategorisi,', allItems.length, 'ürün');
