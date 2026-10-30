/*
 * Mesures d'un dessin d'arbre, communes à toutes les maquettes et à l'arbre actuel de Tribu.
 * Un dessin est décrit par une « scène » en pixels :
 *   cartes : [{ id, vrai, x, y, g, d, h, b, fantome }]   (x, y : centre ; g, d, h, b : bords de la carte)
 *   liens  : [{ groupe, type: 'couple' | 'fratrie' | 'renvoi', membres: [ids], chemins: [[[x, y], …], …], courbe }]
 *   pas    : largeur d'une case en pixels (pour exprimer les distances en cases)
 * Un « groupe » réunit un couple et la fratrie qui en descend : leurs traits peuvent se toucher.
 */
(function (racine) {
  'use strict';
  const EPS = 0.5;

  function segmentsDe(lien) {
    const s = [];
    for (const c of lien.chemins) for (let i = 0; i + 1 < c.length; i++) s.push([c[i], c[i + 1]]);
    return s;
  }
  // Doublons d'un même groupe (le trait commun d'une fratrie est partagé par tous ses chemins).
  function segmentsUniques(lien) {
    const vus = new Set();
    return segmentsDe(lien).filter(([a, b]) => {
      const k = [a, b].map((p) => p.map((v) => v.toFixed(1)).join(',')).sort().join(';');
      return !vus.has(k) && vus.add(k);
    });
  }
  const boite = ([a, b]) => [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  const croise = (u, v) => u[0] <= v[1] + EPS && v[0] <= u[1] + EPS && u[2] <= v[3] + EPS && v[2] <= u[3] + EPS;
  const vect = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const horizontal = ([a, b]) => Math.abs(a[1] - b[1]) < EPS;
  const vertical = ([a, b]) => Math.abs(a[0] - b[0]) < EPS;
  function distPointSeg(p, [a, b]) {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  /** 'x' : les deux traits se coupent ; 't' : l'un touche l'autre ; 'colineaire' : ils se recouvrent ; null : rien. */
  function contact(s, t) {
    const [a, b] = s,
      [c, d] = t;
    const d1 = vect(c, d, a),
      d2 = vect(c, d, b),
      d3 = vect(a, b, c),
      d4 = vect(a, b, d);
    const ls = Math.hypot(b[0] - a[0], b[1] - a[1]),
      lt = Math.hypot(d[0] - c[0], d[1] - c[1]);
    const tol = (l) => EPS * Math.max(l, 1);
    const paralleles = Math.abs(vect([0, 0], [b[0] - a[0], b[1] - a[1]], [d[0] - c[0], d[1] - c[1]])) < 1e-3 * Math.max(ls * lt, 1);
    if (paralleles) {
      if (distPointSeg(a, t) > EPS && distPointSeg(c, s) > EPS) return null;
      const touches = [a, b].filter((p) => distPointSeg(p, t) < EPS).length + [c, d].filter((p) => distPointSeg(p, s) < EPS).length;
      return touches >= 2 ? 'colineaire' : 't';
    }
    if (((d1 > tol(lt) && d2 < -tol(lt)) || (d1 < -tol(lt) && d2 > tol(lt))) && ((d3 > tol(ls) && d4 < -tol(ls)) || (d3 < -tol(ls) && d4 > tol(ls)))) return 'x';
    if ([a, b].some((p) => distPointSeg(p, t) < EPS) || [c, d].some((p) => distPointSeg(p, s) < EPS)) return 't';
    return null;
  }
  // Le segment traverse-t-il l'intérieur de la carte (bords rentrés de 2 px) ?
  function traverse([a, b], k) {
    const [g, d, h, bas] = [k.g + 2, k.d - 2, k.h + 2, k.b - 2];
    let [t0, t1] = [0, 1];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    for (const [p, q] of [
      [-dx, a[0] - g],
      [dx, d - a[0]],
      [-dy, a[1] - h],
      [dy, bas - a[1]],
    ]) {
      if (Math.abs(p) < 1e-9) {
        if (q < 0) return false;
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
    return t1 - t0 > 1e-6;
  }

  /**
   * Classe de proximité avec Moi : 1 famille proche (parents, frères et sœurs, conjoints, enfants, grands-parents),
   * 2 oncles, tantes, cousins et leurs conjoints, 3 le reste. `g` : graphe de disposition.js.
   */
  function classes(g) {
    const vrai = (ids) => ids.filter((id) => !g.P.get(id)?.pseudo && !g.P.get(id)?.inconnu);
    const c = new Map();
    const mettre = (ids, k) => ids.forEach((id) => !c.has(id) && id !== g.moi && c.set(id, k));
    const parents = vrai(g.parents(g.moi));
    const gp = vrai(parents.flatMap((p) => g.parents(p)));
    mettre(parents, 1);
    mettre(vrai(g.parents(g.moi).flatMap((p) => g.enfants(p))), 1);
    mettre(vrai(g.conjoints(g.moi)), 1);
    mettre(vrai(g.enfants(g.moi)), 1);
    mettre(gp, 1);
    const oncles = vrai(gp.flatMap((p) => g.enfants(p))).filter((o) => !c.has(o) || !parents.includes(o));
    const cousins = vrai(oncles.flatMap((o) => g.enfants(o)));
    const deux = [...oncles, ...cousins].filter((id) => !parents.includes(id) && !c.has(id));
    mettre(deux, 2);
    mettre(vrai(deux.flatMap((id) => g.conjoints(id))), 2);
    for (const id of g.dans) if (!g.P.get(id)?.pseudo && !g.P.get(id)?.inconnu) mettre([id], 3);
    return c;
  }

  /** Toutes les mesures d'une scène. `classe` : Map id → 1 | 2 | 3 (classes(g)). */
  function mesurer(scene, classe, moi) {
    const { cartes, liens, pas } = scene;
    const segs = [];
    for (const l of liens) for (const s of segmentsUniques(l)) segs.push({ s, l, b: boite(s) });

    // 1. Croisements et contacts entre traits de groupes différents ; recouvrements (fausse fratrie).
    let croisements = 0,
      contacts = 0,
      recouvrements = 0;
    const exemples = [];
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        const [u, v] = [segs[i], segs[j]];
        if (u.l.groupe === v.l.groupe || !croise(u.b, v.b)) continue;
        const k = contact(u.s, v.s);
        if (!k) continue;
        if (k === 'x') croisements++;
        else if (k === 't') contacts++;
        else recouvrements++;
        if (exemples.length < 30) exemples.push({ genre: k, a: u.l.groupe, b: v.l.groupe, x: Math.round(u.s[0][0]), y: Math.round(u.s[0][1]) });
      }
    // Fausse fratrie : deux traits communs de fratrie à la même hauteur, qui se recouvrent ou presque (< 8 px).
    const bus = segs.filter((x) => x.l.type === 'fratrie' && horizontal(x.s) && Math.abs(x.s[0][0] - x.s[1][0]) > 1);
    let faussesFratries = 0;
    for (let i = 0; i < bus.length; i++)
      for (let j = i + 1; j < bus.length; j++) {
        const [u, v] = [bus[i], bus[j]];
        if (u.l.groupe === v.l.groupe || Math.abs(u.b[2] - v.b[2]) > 3) continue;
        if (u.b[0] < v.b[1] + 8 && v.b[0] < u.b[1] + 8) faussesFratries++;
      }

    // 2. Traits qui passent derrière une carte qui n'est pas l'une de leurs extrémités.
    let sousCarte = 0;
    for (const x of segs) {
      const m = new Set(x.l.membres);
      for (const k of cartes) if (!m.has(k.id) && x.b[0] < k.d && x.b[1] > k.g && x.b[2] < k.b && x.b[3] > k.h && traverse(x.s, k)) sousCarte++;
    }

    // 3. Cartes qui se recouvrent.
    let chevauchements = 0;
    for (let i = 0; i < cartes.length; i++)
      for (let j = i + 1; j < cartes.length; j++) {
        const [a, b] = [cartes[i], cartes[j]];
        if (a.g < b.d - 1 && b.g < a.d - 1 && a.h < b.b - 1 && b.h < a.b - 1) chevauchements++;
      }

    // 4. Coudes : changements de direction sur chaque trajet parent → enfant et chaque trait de couple.
    let coudes = 0,
      trajets = 0,
      coudes_ = 0;
    for (const l of liens) {
      if (l.courbe) continue;
      for (const c of l.chemins) {
        trajets++;
        let n = 0;
        for (let i = 1; i + 1 < c.length; i++) {
          const [a, b, d] = [c[i - 1], c[i], c[i + 1]];
          if (Math.abs(vect(a, b, d)) > 1e-6 * Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(d[0] - b[0], d[1] - b[1]))) n++;
        }
        coudes += n;
        if (n) coudes_++;
      }
    }

    // 5. Proximité : distance à Moi par classe, inversions (une classe plus lointaine plus près de Moi).
    const reelles = cartes.filter((k) => !k.fantome && classe.has(k.vrai));
    const km = cartes.find((k) => k.vrai === moi && !k.fantome);
    const dist = (k) => Math.hypot(k.x - km.x, k.y - km.y) / pas;
    const parClasse = { 1: [], 2: [], 3: [] };
    for (const k of reelles) parClasse[classe.get(k.vrai)].push(dist(k));
    const moyenne = (xs) => (xs.length ? +(xs.reduce((s, v) => s + v, 0) / xs.length).toFixed(1) : null);
    const max = (xs) => (xs.length ? +Math.max(...xs).toFixed(1) : null);
    // Inversions par ligne (mêmes y) et par côté de Moi, comme la règle R4 ; pour une maquette sans lignes, sur tout le dessin.
    const parLigne = new Map();
    for (const k of reelles) {
      const cle = scene.lignes === false ? 0 : Math.round(k.y) + ':' + Math.sign(Math.round(k.x - km.x));
      (parLigne.get(cle) || parLigne.set(cle, []).get(cle)).push(k);
    }
    let inversions = 0,
      paires = 0;
    for (const ks of parLigne.values()) {
      const ds = ks.map((k) => [dist(k), classe.get(k.vrai)]);
      for (let i = 0; i < ds.length; i++)
        for (let j = 0; j < ds.length; j++) {
          if (ds[i][1] >= ds[j][1]) continue;
          paires++;
          if (ds[i][0] > ds[j][0] + 0.01) inversions++;
        }
    }

    // 6. Trous injustifiés : écart entre deux voisins d'une ligne > 2,35 cases sans trait horizontal qui traverse le vide.
    let trous = 0,
      vide = 0;
    if (scene.lignes !== false) {
      const lignes = new Map();
      for (const k of cartes) (lignes.get(Math.round(k.y)) || lignes.set(Math.round(k.y), []).get(Math.round(k.y))).push(k);
      const hz = segs.filter((x) => horizontal(x.s));
      for (const [y, ks] of lignes) {
        ks.sort((a, b) => a.x - b.x);
        for (let i = 0; i + 1 < ks.length; i++) {
          const e = (ks[i + 1].x - ks[i].x) / pas;
          if (e <= 2.35) continue;
          const xm = (ks[i].x + ks[i + 1].x) / 2;
          const couvert = hz.some((x) => x.b[0] < xm && x.b[1] > xm && x.b[2] > y - pas * 1.5 && x.b[2] < y + pas * 1.9);
          if (!couvert) (trous++, (vide += e - 2.3));
        }
      }
    }

    // 7. Taille.
    const xs = cartes.flatMap((k) => [k.g, k.d]),
      ys = cartes.flatMap((k) => [k.h, k.b]);
    const largeur = Math.max(...xs) - Math.min(...xs),
      hauteur = Math.max(...ys) - Math.min(...ys);
    const surface = cartes.reduce((s, k) => s + (k.d - k.g) * (k.b - k.h), 0);

    return {
      cartes: cartes.filter((k) => !k.fantome).length,
      copies: cartes.filter((k) => k.fantome).length,
      croisements,
      contacts,
      recouvrements,
      faussesFratries,
      sousCarte,
      chevauchements,
      coudes,
      trajetsCoudes: coudes_,
      trajets,
      distance: { proche: moyenne(parClasse[1]), oncles: moyenne(parClasse[2]), reste: moyenne(parClasse[3]), procheMax: max(parClasse[1]) },
      inversions,
      paires,
      trous,
      vide: +vide.toFixed(1),
      largeur: +(largeur / pas).toFixed(1),
      hauteur: +(hauteur / pas).toFixed(1),
      largeurPx: Math.round(largeur),
      hauteurPx: Math.round(hauteur),
      densite: +(surface / (largeur * hauteur)).toFixed(3),
      exemples,
    };
  }

  /** Couleurs voisines trop proches : paires de cartes voisines (même ligne) de lignées différentes et de teintes proches. */
  function couleursVoisines(cartes, seuil = 40) {
    const lignes = new Map();
    for (const k of cartes) if (k.couleur && !k.fantome) (lignes.get(Math.round(k.y)) || lignes.set(Math.round(k.y), []).get(Math.round(k.y))).push(k);
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const ecart = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
    let proches = 0,
      min = Infinity;
    for (const ks of lignes.values()) {
      ks.sort((a, b) => a.x - b.x);
      for (let i = 0; i + 1 < ks.length; i++) {
        const [a, b] = [ks[i], ks[i + 1]];
        if (a.lignee === b.lignee || !a.lignee || !b.lignee) continue;
        const e = ecart(a.couleur, b.couleur);
        min = Math.min(min, e);
        if (e < seuil) proches++;
      }
    }
    return { proches, min: min === Infinity ? null : Math.round(min) };
  }

  /** Distance moyenne et maximale (en cases) de Moi à ses parents et à sa fratrie (demi compris), cartes réelles seulement. */
  function noyau(scene, g, moi) {
    const ps = g.parents(moi).filter((p) => !g.P.get(p).pseudo);
    const ids = new Set([...ps, ...g.parents(moi).flatMap((p) => g.enfants(p))].filter((x) => x !== moi));
    const km = scene.cartes.find((k) => k.vrai === moi && !k.fantome);
    const ds = scene.cartes.filter((k) => !k.fantome && ids.has(k.vrai)).map((k) => Math.hypot(k.x - km.x, k.y - km.y) / scene.pas);
    return ds.length ? Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10 + ' / ' + Math.round(Math.max(...ds) * 10) / 10 : '—';
  }

  /** Personnes de l'arbre (parents inconnus exclus) qui n'ont aucune carte réelle. */
  function absents(scene, g) {
    const vus = new Set(scene.cartes.filter((k) => !k.fantome).map((k) => k.vrai));
    return [...g.dans].filter((x) => !g.P.get(x).pseudo && !g.P.get(x).inconnu && !vus.has(x)).length;
  }

  /** Lignes du tableau de mesures : [libellé, valeur], partagées par la page et mesurer.mjs. */
  const LIGNES = [
    ['croisements', (m) => m.croisements],
    ['contacts en T', (m) => m.contacts],
    ['traits superposés', (m) => m.recouvrements],
    ['fausses fratries', (m) => m.faussesFratries],
    ['traits sous une carte', (m) => m.sousCarte],
    ['cartes superposées', (m) => m.chevauchements],
    ['trajets coudés / trajets', (m) => m.trajetsCoudes + ' / ' + m.trajets],
    ['dist. parents + fratrie (moy / max)', (m) => m.noyau],
    ['dist. proches (moy / max)', (m) => m.distance.proche + ' / ' + m.distance.procheMax],
    ['dist. oncles, cousins', (m) => m.distance.oncles],
    ['dist. reste', (m) => m.distance.reste],
    ['inversions R4 / paires', (m) => m.inversions + ' / ' + m.paires],
    ['trous (vide en cases)', (m) => m.trous + ' (' + m.vide + ')'],
    ['largeur × hauteur (cases)', (m) => m.largeur + ' × ' + m.hauteur],
    ['personnes absentes', (m) => m.absents],
    ['cartes (+ copies)', (m) => m.cartes + (m.copies ? ' (+' + m.copies + ')' : '')],
    ['couleurs voisines proches', (m) => (m.couleurs && m.couleurs.min !== null ? m.couleurs.proches + ' (écart min ' + m.couleurs.min + ')' : '—')],
  ];

  /** Toutes les mesures d'une scène, prêtes pour LIGNES. */
  function tout(scene, g, moi, couleurs = true) {
    const m = mesurer(scene, classes(g), moi);
    m.noyau = noyau(scene, g, moi);
    m.absents = absents(scene, g);
    m.couleurs = couleurs ? couleursVoisines(scene.cartes) : null;
    delete m.exemples;
    return m;
  }

  const api = { mesurer, classes, couleursVoisines, contact, noyau, absents, tout, LIGNES };
  if (typeof module !== 'undefined') module.exports = api;
  else racine.Mesures = api;
})(this);
