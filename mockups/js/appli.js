/* Page d'une maquette : calcule la disposition depuis les données embarquées, dessine, gère déplacement et zoom. */
(function () {
  'use strict';
  const D = window.Disposition,
    Rd = window.Rendu;
  const g = D.graphe(window.DONNEES, window.MOI);
  const res = window.VARIANTE === 'A' ? D.disposerA(g) : window.VARIANTE === 'A2' ? D.disposerA2(g) : D.disposerB(g);
  const pos = res.bloc.n;
  const tr = D.traits(g, pos);
  const pastilles = (res.pastilles || []).filter((p) => (p.parents || [p.enfant]).every((q) => pos.has(q)));
  const des = Rd.dessiner(g, pos, tr, { pastilles, renvois: res.renvois, fantomes: res.fantomes });
  const ctl = D.controles(g, pos, tr, des, res.fantomes);
  const nom = (id) => {
    const p = g.P.get(D.vrai(id));
    return p?.inconnu ? '?' : ((p?.prenom || '') + ' ' + (p?.nom || '')).trim();
  };

  const svg = document.getElementById('carte');
  const vue = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  vue.innerHTML = des.svg;
  svg.appendChild(vue);
  let t = { x: 0, y: 0, k: 1 };
  const appliquer = () => vue.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
  const taille = () => svg.getBoundingClientRect();
  function surMoi() {
    t.k = +(/k=([0-9.]+)/.exec(location.hash) || [0, 1])[1];
    centrer(g.moi);
  }
  // Amène un nœud au milieu de l'écran, à l'échelle courante.
  function centrer(id) {
    const m = pos.get(id),
      s = taille();
    t.x = s.width / 2 - m.x * Rd.UX * t.k;
    t.y = s.height * 0.62 - m.r * Rd.UY * t.k;
    appliquer();
  }
  function tout() {
    const b = des.boite,
      s = taille();
    t.k = Math.min(s.width / b.w, s.height / b.h);
    t.x = (s.width - b.w * t.k) / 2 - b.x * t.k;
    t.y = (s.height - b.h * t.k) / 2 - b.y * t.k;
    appliquer();
  }
  // Déplacement à un doigt, zoom à deux doigts ou à la molette.
  const doigts = new Map();
  let avant = null;
  svg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pastille, .fantome')) return;
    svg.setPointerCapture(e.pointerId);
    doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    avant = null;
  });
  svg.addEventListener('pointermove', (e) => {
    if (!doigts.has(e.pointerId)) return;
    const p = doigts.get(e.pointerId);
    if (doigts.size === 1) {
      t.x += e.clientX - p.x;
      t.y += e.clientY - p.y;
    } else {
      const [a, b] = [...doigts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (avant) zoomer(d / avant, (a.x + b.x) / 2, (a.y + b.y) / 2);
      avant = d;
    }
    doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    appliquer();
  });
  const lacher = (e) => (doigts.delete(e.pointerId), (avant = null));
  svg.addEventListener('pointerup', lacher);
  svg.addEventListener('pointercancel', lacher);
  function zoomer(f, cx, cy) {
    const r = taille();
    cx -= r.left;
    cy -= r.top;
    const k = Math.min(3, Math.max(0.08, t.k * f));
    t.x = cx - ((cx - t.x) * k) / t.k;
    t.y = cy - ((cy - t.y) * k) / t.k;
    t.k = k;
    appliquer();
  }
  svg.addEventListener('wheel', (e) => (e.preventDefault(), zoomer(Math.exp(-e.deltaY / 400), e.clientX, e.clientY)), { passive: false });
  document.getElementById('toi').onclick = surMoi;
  document.getElementById('tout').onclick = tout;

  // Panneau des contrôles.
  const cases = (() => {
    const xs = [...pos.values()].map((v) => v.x);
    return Math.max(...xs) - Math.min(...xs);
  })();
  const liste = (xs, f) => (xs.length ? '<ul>' + xs.map((x) => '<li>' + f(x) + '</li>').join('') + '</ul>' : ' aucun');
  const croisParFamille = new Map();
  for (const c of ctl.croisements) {
    const cle = c.h + ' × ' + c.v;
    croisParFamille.set(cle, (croisParFamille.get(cle) || 0) + 1);
  }
  const familleLisible = (f) => {
    const [genre, ids] = [f[0], f.slice(2).split('@')[0]];
    if (genre === 'c') {
      const u = g.unions.find((u) => u.id === ids);
      return 'couple ' + nom(u.personneA) + ' + ' + nom(u.personneB);
    }
    return 'enfants de ' + ids.split('+').map(nom).join(' + ');
  };
  const personnes = [...pos.keys()].filter((id) => !id.startsWith('|') && !res.fantomes?.has(id) && !g.P.get(D.vrai(id)).inconnu).length;
  document.getElementById('panneau').innerHTML =
    `<h2>Contrôles</h2><p>${personnes} personnes dessinées, largeur ${cases.toFixed(0)} cases (${Math.round(cases * Rd.UX)} px).</p>` +
    `<h3>Règle 1 : parents centrés</h3><p>Décalages :${liste(ctl.R1, (r) => r.parents.map(nom).join(' + ') + ' : ' + r.ecart + ' case')}</p>` +
    `<h3>Règle 2 : croisements</h3><p>${ctl.croisements.length} croisement(s) :${liste([...croisParFamille], ([k, n]) => k.split(' × ').map(familleLisible).join(' coupe ') + (n > 1 ? ' (×' + n + ')' : ''))}</p>` +
    (res.renvois ? `<p>Renvois (familles d'ancêtres intérieurs dessinées au bord) : ${res.renvois.length}, ${res.renvois.reduce((s, r) => s + r.nombre, 0)} personnes.</p>` : '') +
    (res.etires ? `<p>Couples écartés (trait relevé au-dessus des familles intérieures) :${liste(res.etires, (c) => c.map(nom).join(' + '))}</p>` : '') +
    `<h3>Règle 3 : une génération par ligne</h3><p>Respectée par construction (ligne = génération).</p>` +
    `<h3>Règle 4 : proximité</h3><p>${ctl.inversions} inversion(s) sur ${ctl.paires} paires comparées (même ligne, même côté de toi).</p>`;
  document.getElementById('controles').onclick = () => document.getElementById('panneau').classList.toggle('ouvert');

  // Maquette B : une pastille ouvre la branche pliée dans une feuille en bas.
  const feuille = document.getElementById('feuille');
  svg.addEventListener('click', (e) => {
    // A2 : la pastille mène au renvoi, une copie en pointillé ramène à la personne dans l'arbre.
    const rv = e.target.closest('.renvoi');
    if (rv) return centrer(res.renvois.find((r) => r.k === +rv.dataset.k).haut[0]);
    const fa = e.target.closest('.fantome');
    if (fa) return pos.has(D.vrai(fa.dataset.id)) && centrer(D.vrai(fa.dataset.id));
    const el = e.target.closest('.pastille');
    if (!el) return;
    const p = pastilles[+el.dataset.i];
    const b = p.ancetres ? D.disposerAncetres(g, p.enfant) : D.disposerBranche(g, p.parents, p.enfant);
    const tr2 = D.traits(g, b.n);
    const d2 = Rd.dessiner(g, b.n, tr2, { marque: p.enfant });
    const bx = d2.boite;
    feuille.querySelector('h2').textContent = p.ancetres ? 'Ancêtres de ' + nom(p.enfant) : 'Famille de ' + p.parents.map(nom).join(' et ');
    const s = feuille.querySelector('svg');
    s.setAttribute('viewBox', `${bx.x} ${bx.y} ${bx.w} ${bx.h}`);
    const largeur = Math.max(bx.w * 0.8, 340);
    s.style.width = largeur + 'px';
    s.innerHTML = d2.svg;
    feuille.classList.add('ouvert');
    // La personne de ta lignée au milieu de la feuille.
    const defile = feuille.querySelector('.defile');
    defile.scrollLeft = ((b.n.get(p.enfant).x * Rd.UX - bx.x) * largeur) / bx.w - defile.clientWidth / 2;
  });
  document.getElementById('fermer').onclick = () => feuille.classList.remove('ouvert');

  window.CONTROLES = { R1: ctl.R1.length, croisements: ctl.croisements.length, inversions: ctl.inversions, paires: ctl.paires, cases, personnes };
  (location.hash === '#tout' ? tout : surMoi)();
  // Capture : #k=…&r=<k> centre l'écran sur le k-ième renvoi.
  const rh = /r=([0-9]+)/.exec(location.hash);
  if (rh && res.renvois) centrer(res.renvois.find((r) => r.k === +rh[1]).haut[0]);
  // Capture : #pastille=<n> ouvre la n-ième pastille.
  const m = /^#pastille=([0-9]+)/.exec(location.hash);
  if (m) feuille.style.transition = 'none';
  if (m) svg.querySelector('.pastille[data-i="' + m[1] + '"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
})();
