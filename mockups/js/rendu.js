/* Rendu SVG des maquettes (même style que l'arbre de Tribu) et segments pour les contrôles. */
(function (racine) {
  'use strict';
  const UX = 64,
    UY = 124,
    R = 16,
    BUS = 0.56 * UY, // trait commun d'une fratrie, sous la ligne des parents
    LEVE = 25; // couple écarté : trait relevé au-dessus des avatars
  // 12 teintes régulières (tous les 30°), clarté alternée pour écarter encore deux teintes voisines : [fond, trait].
  function hsl(h, s, l) {
    (s /= 100), (l /= 100);
    const k = (n) => (n + h / 30) % 12,
      a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  const TEINTES = Array.from({ length: 12 }, (_, i) => [hsl(i * 30 + 15, 65, i % 2 ? 72 : 85), hsl(i * 30 + 15, 40, 48)]);
  const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const lignee = (p) => (p?.nomNaissance || p?.nom || '').trim();
  function teinte(nom) {
    let h = 0;
    for (const c of nom.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return TEINTES[h % TEINTES.length];
  }
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const ecartTeintes = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  /**
   * Lignée → [fond, trait]. Deux lignées voisines sur une ligne (côte à côte, ou à un rang d'écart et à moins de
   * 4 cases) sont liées ; coloriage façon DSatur : la lignée qui a le plus de couleurs voisines différentes d'abord,
   * avec la teinte la plus éloignée de celles de ses voisines (à égalité, la teinte tirée de son nom).
   */
  function attribuerCouleurs(g, pos, V, fantomes) {
    const lignes = new Map();
    for (const [id, p] of pos) {
      if (id[0] === '|' || fantomes.has(id)) continue;
      const l = lignee(g.P.get(V(id)));
      if (l) (lignes.get(p.r) || lignes.set(p.r, []).get(p.r)).push([p.x, l]);
    }
    const voisins = new Map(),
      taille = new Map();
    const de = (l) => voisins.get(l) || voisins.set(l, new Set()).get(l);
    const lier = (a, b) => a !== b && (de(a).add(b), de(b).add(a));
    for (const xs of lignes.values()) {
      xs.sort((a, b) => a[0] - b[0]);
      xs.forEach(([x, l], i) => {
        taille.set(l, (taille.get(l) || 0) + 1);
        de(l);
        if (xs[i + 1]) lier(l, xs[i + 1][1]);
        if (xs[i + 2] && xs[i + 2][0] - x < 4) lier(l, xs[i + 2][1]);
      });
    }
    const choix = new Map();
    const reste = new Set(taille.keys());
    while (reste.size) {
      const sat = (l) => new Set([...voisins.get(l)].filter((v) => choix.has(v)).map((v) => choix.get(v))).size;
      const l = [...reste].sort((a, b) => sat(b) - sat(a) || voisins.get(b).size - voisins.get(a).size || taille.get(b) - taille.get(a) || (a < b ? -1 : 1))[0];
      reste.delete(l);
      const pris = [...voisins.get(l)].filter((v) => choix.has(v)).map((v) => choix.get(v)[0]);
      let mieux = teinte(l),
        score = pris.length ? Math.min(...pris.map((p) => ecartTeintes(p, mieux[0]))) : 999;
      for (const t of TEINTES) {
        const s = pris.length ? Math.min(...pris.map((p) => ecartTeintes(p, t[0]))) : 999;
        if (s > score + 0.5) ((score = s), (mieux = t));
      }
      choix.set(l, mieux);
    }
    return (l) => choix.get(l) || teinte(l || '?');
  }
  const annee = (s) => (/^(\d{4})/.exec(s || '') || [])[1];
  function annees(p) {
    const n = annee(p.naissance),
      d = annee(p.deces);
    if (n && d) return n + '–' + d;
    if (d) return '?–' + d;
    return n || '';
  }

  /**
   * Dessine des positions (cases) en SVG. Rend le SVG, la boîte et les segments (en px) pour compter les croisements.
   * `o.pastilles` (maquette B) : branches pliées, `o.marque` : l'enfant de la lignée directe dans une branche ouverte.
   */
  function dessiner(g, pos, tr, o = {}) {
    const px = (id) => pos.get(id).x * UX,
      py = (id) => pos.get(id).r * UY;
    const segments = [];
    const traits = [];
    const seg = (x1, y1, x2, y2, f) => segments.push({ x1, y1, x2, y2, f });
    const V = tr.vrai || ((id) => id);
    const fantomes = o.fantomes || new Set();
    const couleurs = attribuerCouleurs(g, pos, V, fantomes);
    const couleurDe = (id) => couleurs(lignee(g.P.get(V(id))) || id)[1];
    // Scène pour les mesures (mesures.js) : un groupe = un couple et la fratrie qui en descend.
    const liens = [];
    const groupeDe = (ids) => 'g:' + ids.slice().sort().join('+');
    // Couples écartés : le plus long passe plus haut, et chaque jambe part du côté du conjoint, de plus en plus
    // près du centre de l'avatar à mesure qu'on monte (ni contact avec la descente des parents, ni croisement).
    const niveau = new Map();
    const etires = tr.couples.filter((c) => c.entre.length).sort((u, v) => u.x2 - u.x1 - (v.x2 - v.x1));
    for (const c of etires) {
      const dedans = etires.filter((o) => o !== c && niveau.has(o) && o.r === c.r && o.k === c.k && o.x1 >= c.x1 - 1e-6 && o.x2 <= c.x2 + 1e-6);
      niveau.set(c, 1 + Math.max(0, ...dedans.map((o) => niveau.get(o))));
    }
    const hauteur = (c) => LEVE + (niveau.get(c) - 1) * 9;
    const jambe = (c) => Math.max(3, 13 - (niveau.get(c) - 1) * 5);
    // Couples.
    for (const c of tr.couples) {
      const y = c.r * UY;
      const [x1, x2] = [c.x1 * UX, c.x2 * UX];
      const pseudo = c.u.statut === 'inconnu';
      const style = pseudo ? 'stroke-dasharray="1 5"' : c.u.statut === 'separee' ? 'stroke-dasharray="2 5"' : '';
      const f = 'c:' + c.u.id + '@' + (c.k || 0);
      const col = '#9aa8a2';
      if (!c.entre.length) {
        traits.push(`<path d="M${x1 + R} ${y}H${x2 - R}" stroke="${col}" ${style}/>`);
        seg(x1 + R, y, x2 - R, y, f);
        liens.push({ groupe: groupeDe([c.a, c.b]), type: 'couple', membres: [c.a, c.b], chemins: [[[x1 + R, y], [x2 - R, y]]] });
      } else {
        const yl = y - hauteur(c);
        const j = jambe(c),
          y1 = y - Math.sqrt(R * R - j * j);
        const [a1, a2] = [x1 + j, x2 - j];
        traits.push(`<path d="M${a1} ${y1}V${yl}H${a2}V${y1}" stroke="${col}" stroke-width="2.4" ${style}/>`);
        (seg(a1, y1, a1, yl, f), seg(a1, yl, a2, yl, f), seg(a2, yl, a2, y1, f));
        liens.push({ groupe: groupeDe([c.a, c.b]), type: 'couple', membres: [c.a, c.b], chemins: [[[a1, y1], [a1, yl], [a2, yl], [a2, y1]]] });
      }
      if (c.u.date && !pseudo && !c.entre.length) traits.push(`<text x="${(x1 + x2) / 2}" y="${y - 6}" class="date">${annee(c.u.date) || ''}</text>`);
    }
    // Fratries : descente depuis le milieu du couple, trait commun, puis chaque enfant.
    for (const fr of tr.fratries) {
      const ps = fr.parents;
      const etire = tr.couples.find((c) => c.entre.length && ps.includes(c.a) && ps.includes(c.b));
      const xs = fr.enfants.map(px);
      // Couple écarté : la descente part du trait relevé, au-dessus du milieu des enfants (entre deux avatars).
      const xm = etire ? (Math.min(...xs) + Math.max(...xs)) / 2 : ps.reduce((s, p) => s + px(p), 0) / ps.length;
      const y0 = py(ps[0]) + (ps.length === 1 ? R : etire ? -hauteur(etire) : 0);
      const yb = py(ps[0]) + BUS;
      const [g1, g2] = [Math.min(xm, ...xs), Math.max(xm, ...xs)];
      const f = 'f:' + ps.join('+');
            const col = couleurDe(fr.enfants[0]);
      let d = `M${xm} ${y0}V${yb}`;
      seg(xm, y0, xm, yb, f);
      if (g2 - g1 > 0.5) (d += `M${g1} ${yb}H${g2}`, seg(g1, yb, g2, yb, f));
      const adoptifs = [];
      liens.push({
        groupe: groupeDe(ps),
        type: 'fratrie',
        membres: [...ps, ...fr.enfants],
        chemins: fr.enfants.map((e) => (Math.abs(px(e) - xm) < 0.5 ? [[xm, y0], [xm, py(e) - R]] : [[xm, y0], [xm, yb], [px(e), yb], [px(e), py(e) - R]])),
      });
      for (const e of fr.enfants) {
        const adopte = ps.some((p) => g.typeFil.get(V(p) + '|' + V(e)) === 'adoptif');
        const t = `M${px(e)} ${yb}V${py(e) - R}`;
        seg(px(e), yb, px(e), py(e) - R, f);
        if (adopte) adoptifs.push(t);
        else d += t;
      }
      traits.push(`<path d="${d}" stroke="${col}"/>`);
      if (adoptifs.length) traits.push(`<path d="${adoptifs.join('')}" stroke="${col}" stroke-dasharray="7 4"/>`);
    }
    // Pastilles de la maquette B : posées sur la descente du couple d'ancêtres.
    const pastilles = (o.pastilles || []).map((p, i) => {
      if (p.ancetres) {
        const [x, y] = [px(p.enfant), py(p.enfant) - R - 34];
        traits.push(`<path d="M${x} ${y + 11}V${y + 18}" stroke="#2e7262" stroke-dasharray="2 2"/>`);
        return `<g class="pastille" data-i="${i}" transform="translate(${x},${y})"><rect x="-22" y="-11" width="44" height="22" rx="11"/><text y="4">↑ ${p.nombre}</text></g>`;
      }
      const xm = (px(p.parents[0]) + px(p.parents[1])) / 2;
      const y = py(p.parents[0]) + 0.66 * UY;
      return `<g class="pastille" data-i="${i}" transform="translate(${xm},${y})"><rect x="-19" y="-11" width="38" height="22" rx="11"/><text y="4">+${p.nombre}</text></g>`;
    });
    // A2 : pastille « ← N » sur la descente du couple d'ancêtres, titre au-dessus de chaque renvoi.
    const prenom = (id) => g.P.get(V(id))?.prenom || g.P.get(V(id))?.nom || '?';
    const titres = [];
    for (const rv of o.renvois || []) {
      const xm = rv.ancre.reduce((s, p) => s + px(p), 0) / rv.ancre.length;
      const y = rv.ancre.length === 2 ? py(rv.ancre[0]) + 0.36 * UY : py(rv.ancre[0]) - R - 34;
      const txt = rv.cote < 0 ? '← ' + rv.nombre : rv.nombre + ' →';
      pastilles.push(`<g class="pastille renvoi" data-k="${rv.k}" transform="translate(${xm},${y})"><rect x="-21" y="-10" width="42" height="20" rx="10"/><text y="4">${txt}</text></g>`);
      const hx = rv.haut.reduce((s, p) => s + px(p), 0) / rv.haut.length;
      const qui = rv.ancre.map(prenom).join(' et ');
      const ty = rv.ascendance || rv.parents ? py(rv.haut[0]) + R + 46 : py(rv.haut[0]) - R - 30;
      titres.push(`<g class="titre-renvoi" data-k="${rv.k}"><text x="${hx}" y="${ty}">${rv.cote < 0 ? '' : '← '}${rv.ascendance ? 'Ancêtres' : rv.parents ? 'Parents' : 'Famille'} de ${echapper(qui)}${rv.cote < 0 ? ' →' : ''}</text></g>`);
    }
    // Nœuds.
    const noeuds = [];
    for (const [id, p] of pos) {
      if (id.startsWith('|')) continue;
      const pers = g.P.get(V(id));
      const fantome = fantomes.has(id);
      const x = p.x * UX,
        y = p.r * UY;
      if (pers.inconnu) {
        noeuds.push(`<g class="inconnu"><circle cx="${x}" cy="${y}" r="${R - 3}"/><text x="${x}" y="${y + 4}">?</text></g>`);
        continue;
      }
      const [fond] = couleurs(lignee(pers) || id);
      const ini = ((pers.prenom || '?')[0] + (pers.nom || '')[0]).toUpperCase().replace('UNDEFINED', '');
      const moi = id === g.moi;
      const prenom = pers.prenom || pers.nom || '?';
      noeuds.push(
        `<g class="noeud${moi ? ' moi' : ''}${o.marque === id ? ' marque' : ''}${fantome ? ' fantome' : ''}" data-id="${id}"><title>${echapper(((pers.prenom || '') + ' ' + (pers.nom || '')).trim())}</title>` +
          (moi ? `<circle cx="${x}" cy="${y}" r="${R + 4}" class="anneau"/>` : '') +
          `<circle cx="${x}" cy="${y}" r="${R}" fill="${fond}"${pers.decede || pers.deces ? ' opacity=".75"' : ''}/>` +
          `<text x="${x}" y="${y + 4}" class="ini">${echapper(ini)}</text>` +
          `<text x="${x}" y="${y + R + 13}" class="nom">${echapper(prenom.length > 11 ? prenom.slice(0, 10) + '…' : prenom)}</text>` +
          `<text x="${x}" y="${y + R + 25}" class="an">${moi ? 'Toi' : annees(pers)}</text>` +
          (o.marque === id ? `<text x="${x}" y="${y + R + 38}" class="vers">↓ ta lignée</text>` : '') +
          `</g>`,
      );
    }
    // « Famille X » au-dessus de chaque lignée qui commence dans l'arbre.
    const etiquettes = [];
    const vus = new Set();
    const sansEtiquette = new Set((o.pastilles || []).filter((p) => p.ancetres).map((p) => p.enfant));
    const occupe = []; // [ligne, x1, x2] des étiquettes déjà posées
    for (const [id, p] of [...pos].sort((u, v) => u[1].x - v[1].x)) {
      if (sansEtiquette.has(id) || fantomes.has(id) || id.startsWith('|')) continue;
      const pers = g.P.get(V(id));
      if (!pers || pers.inconnu || vus.has(id)) continue;
      if ((tr.parentsPlaces ? tr.parentsPlaces(id) : g.parents(id).filter((q) => pos.has(q))).length) continue;
      const nom = lignee(pers);
      if (!nom) continue;
      const partenaire = (tr.conjointsPlaces ? tr.conjointsPlaces(id) : g.conjoints(id).filter((q) => pos.has(q))).find((q) => !fantomes.has(q) && !(tr.parentsPlaces ? tr.parentsPlaces(q) : g.parents(q).filter((z) => pos.has(z))).length && lignee(g.P.get(V(q))) === nom);
      let x = p.x * UX;
      if (partenaire) (vus.add(partenaire), (x = (x + px(partenaire)) / 2));
      vus.add(id);
      // Deux étiquettes voisines qui se recouvrent : la seconde monte d'un cran.
      const l = (nom.length + 8) * 3.1;
      let cran = 0;
      while (occupe.some(([r, a, b, c]) => r === p.r && c === cran && a < x + l && b > x - l)) cran++;
      const haut = cran * 10;
      occupe.push([p.r, x - l, x + l, cran]);
      etiquettes.push(`<text x="${x}" y="${p.r * UY - R - 12 - haut}" class="famille" fill="${couleurs(nom)[1]}">FAMILLE ${echapper(nom.toUpperCase())}</text>`);
    }
    const xs = [...pos.values()].map((v) => v.x * UX),
      ys = [...pos.values()].map((v) => v.r * UY);
    const boite = { x: Math.min(...xs) - 60, y: Math.min(...ys) - 80, w: Math.max(...xs) - Math.min(...xs) + 120, h: Math.max(...ys) - Math.min(...ys) + 140 };
    const svg =
      `<g fill="none" stroke-width="1.6" stroke-linecap="round">${traits.join('')}</g>` +
      `<g>${etiquettes.join('')}</g><g>${titres.join('')}</g><g>${noeuds.join('')}</g><g>${pastilles.join('')}</g>`;
    const cartes = [];
    for (const [id, p] of pos) {
      if (id[0] === '|') continue;
      const pers = g.P.get(V(id));
      const [x, y] = [p.x * UX, p.r * UY];
      const l = lignee(pers);
      cartes.push(
        pers.inconnu
          ? { id, vrai: V(id), x, y, g: x - R + 3, d: x + R - 3, h: y - R + 3, b: y + R - 3, fantome: fantomes.has(id) }
          : { id, vrai: V(id), x, y, g: x - 28, d: x + 28, h: y - R, b: y + R + 28, fantome: fantomes.has(id), lignee: l, couleur: couleurs(l || id)[0] },
      );
    }
    return { svg, boite, segments, scene: { cartes, liens, pas: UX } };
  }

  const STYLE = `
  .ini{font:600 11px system-ui,sans-serif;text-anchor:middle;fill:#3d4a44}
  .nom{font:600 10.5px system-ui,sans-serif;text-anchor:middle;fill:#1f2925}
  .an{font:9.5px system-ui,sans-serif;text-anchor:middle;fill:#77847e}
  .moi .an{fill:#1f2925;font-weight:600}
  .anneau{fill:none;stroke:#2e7262;stroke-width:2.5}
  .date{font:italic 9px system-ui,sans-serif;text-anchor:middle;fill:#77847e}
  .famille{font:600 8.5px system-ui,sans-serif;letter-spacing:.08em;text-anchor:middle}
  .inconnu circle{fill:#fff;stroke:#9aa8a2;stroke-dasharray:3 3}
  .inconnu text{font:600 12px system-ui,sans-serif;text-anchor:middle;fill:#77847e}
  .pastille rect{fill:#2e7262}.pastille text{font:600 11px system-ui,sans-serif;fill:#fff;text-anchor:middle}
  .pastille{cursor:pointer}
  .marque circle{stroke:#2e7262;stroke-width:2;stroke-dasharray:3 2}
  .vers{font:600 9px system-ui,sans-serif;text-anchor:middle;fill:#2e7262}
  .fantome circle{fill:#fff;stroke:#7d8a84;stroke-dasharray:3 3}.fantome text{opacity:.6}.fantome{cursor:pointer}
  .renvoi rect{fill:#b5603f}
  .titre-renvoi text{font:600 11px system-ui,sans-serif;text-anchor:middle;fill:#b5603f}`;

  const api = { dessiner, STYLE, UX, UY };
  if (typeof module !== 'undefined') module.exports = api;
  else racine.Rendu = api;
})(this);
