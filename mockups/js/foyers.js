/*
 * Maquette B2 · « Foyers » : chaque foyer (un couple et ses enfants) est une carte-liste ; une courbe relie
 * une personne à son autre foyer (celui de ses parents, ou celui de son union). Les foyers forment un arbre
 * dessiné en carte mentale autour du foyer des parents de Moi : côté paternel à gauche, maternel à droite.
 * Sans croisement par construction : dans chaque colonne, les foyers gardent l'ordre vertical des lignes
 * qui les appellent, et chaque sous-arbre occupe sa propre bande horizontale.
 * Un foyer atteint par deux chemins (implexe, intermariage) n'est dessiné qu'une fois : l'autre apparition
 * de la personne est une ligne-copie « voir aussi » en pointillé.
 */
(function (racine) {
  'use strict';
  const L = 184, // largeur d'une carte-foyer
    HL = 24, // hauteur d'une ligne (une personne)
    HT = 22, // en-tête
    PAD = 6,
    GX = 76, // entre deux colonnes
    GY = 14; // entre deux foyers d'une même colonne

  function disposer(g) {
    const cle = (a, b) => [a, b].sort().join('+');
    const pseudo = (id) => !!g.P.get(id)?.pseudo;
    const foyers = new Map();
    for (const u of g.unions) {
      const [a, b] = [u.personneA, u.personneB];
      if (!g.dans.has(a) || !g.dans.has(b) || foyers.has(cle(a, b))) continue;
      // Le père à gauche (ligne du haut), un parent « ? » en dernier.
      const ps = [a, b].sort((x, y) => pseudo(x) - pseudo(y) || (g.P.get(x)?.sexe === 'F') - (g.P.get(y)?.sexe === 'F'));
      foyers.set(cle(a, b), { cle: cle(a, b), u, parents: ps, enfants: g.enfantsDuCouple(a, b) });
    }
    // Foyers d'une personne : celui de ses parents d'abord, puis ses unions (ex d'abord).
    const foyersDe = (p) => {
      const ps = g.parents(p);
      const r = ps.length === 2 && foyers.has(cle(ps[0], ps[1])) ? [cle(ps[0], ps[1])] : [];
      for (const q of g.conjoints(p)) if (foyers.has(cle(p, q))) r.push(cle(p, q));
      return r;
    };
    const ps0 = g.parents(g.moi);
    let racineF = ps0.length === 2 ? foyers.get(cle(ps0[0], ps0[1])) : foyers.get(foyersDe(g.moi)[0]);
    if (!racineF) foyers.set('seul', (racineF = { cle: 'seul', u: null, parents: [g.moi], enfants: [] }));

    // Parcours en largeur : premier passage = ligne principale ; foyer déjà atteint = copie « voir aussi ».
    const boites = new Map();
    const principal = new Map(); // personne → [cle du foyer, index de ligne]
    const file = [];
    const ouvrir = (F, entree, cote, prof, depuis) => {
      const lignes = [...F.parents.map((id) => ({ id, role: 'parent' })), ...F.enfants.map((id) => ({ id, role: 'enfant' }))];
      const b = { F, lignes, entree, cote, prof, depuis, sous: [] };
      boites.set(F.cle, b);
      file.push(b);
      return b;
    };
    ouvrir(racineF, null, 0, 0, null);
    const naissanceMoi = g.naissance(g.moi);
    for (let i = 0; i < file.length; i++) {
      const b = file[i];
      b.lignes.forEach((l, k) => {
        if (l.id === b.entree) return void (l.genre = 'relais');
        if (principal.has(l.id)) return void ((l.genre = 'copie'), (l.vers = principal.get(l.id)));
        l.genre = 'principal';
        principal.set(l.id, [b.F.cle, k]);
        if (pseudo(l.id)) return;
        for (const c of foyersDe(l.id)) {
          if (c === b.F.cle) continue;
          if (boites.has(c)) {
            l.voirAussi = l.voirAussi || c;
            continue;
          }
          // Côté : à la racine, le père et les aînés à gauche, la mère, Moi et les cadets à droite.
          let cote = b.cote;
          if (!b.prof) cote = l.role === 'parent' ? (k === 0 && b.F.parents.length === 2 ? -1 : 1) : l.id === g.moi || g.naissance(l.id) > naissanceMoi ? 1 : -1;
          b.sous.push({ k, b: ouvrir(foyers.get(c), l.id, cote, b.prof + 1, b) });
        }
      });
    }
    // Hauteurs des sous-arbres, puis positions (y : haut de la carte ; x : bord gauche).
    const haut = (b) => HT + b.lignes.length * HL + PAD;
    const bande = new Map();
    const mesure = (b, cote) => {
      const enfants = b.sous.filter((s) => s.b.cote === cote || b.prof > 0);
      let h = 0;
      for (const s of enfants) h += mesure(s.b, cote) + (h ? GY : 0);
      const H = Math.max(haut(b), h);
      bande.set(b.F.cle + '|' + cote, { h, H });
      return H;
    };
    const colX = (prof, cote) => (cote > 0 ? L / 2 + GX + (prof - 1) * (L + GX) : -L / 2 - GX - (prof - 1) * (L + GX) - L);
    const placer = (b, cote, y0) => {
      const { h, H } = bande.get(b.F.cle + '|' + cote);
      const hb = haut(b);
      if (b.prof) ((b.x = colX(b.prof, cote)), (b.y = y0 + (H - hb) / 2));
      let y = y0 + (H - h) / 2;
      for (const s of b.sous.filter((s) => s.b.cote === cote || b.prof > 0)) {
        placer(s.b, cote, y);
        y += bande.get(s.b.F.cle + '|' + cote).H + GY;
      }
    };
    const rac = boites.get(racineF.cle);
    rac.x = -L / 2;
    rac.y = -haut(rac) / 2;
    for (const cote of [-1, 1]) {
      const H = mesure(rac, cote);
      placer(rac, cote, -H / 2);
      // La carte racine reste centrée : on recentre la bande sur elle.
    }
    return { boites: [...boites.values()], racine: rac };
  }

  const lignee = (p) => (p?.nomNaissance || p?.nom || '').trim();
  const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const an = (s) => (/^(\d{4})/.exec(s || '') || [])[1];
  const PALETTE = ['#8fb77f', '#6fa7b5', '#9b8fd0', '#c98aa0', '#bfa064', '#cf8f73', '#78a98c', '#a985b3', '#a4ab6a', '#7f97c2'];
  function couleur(nom) {
    let h = 0;
    for (const c of nom.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  /** SVG, boîte englobante et scène mesurable (mesures.js). */
  function dessiner(g, lay) {
    const ligneY = (b, k) => b.y + HT + k * HL + HL / 2;
    const cartes = [],
      liens = [],
      traits = [],
      corps = [];
    for (const b of lay.boites) {
      const u = b.F.u;
      const titre = !u
        ? 'Toi'
        : u.statut === 'inconnu'
          ? 'Parent inconnu'
          : u.sansUnion
            ? 'Parents, sans union notée'
            : u.statut === 'separee'
              ? 'Séparés' + (an(u.date) ? ' · ' + an(u.date) : '')
              : (u.marie ? 'Mariés' : 'En couple') + (an(u.date) ? ' · ' + an(u.date) : '');
      corps.push(`<g class="foyer${b.prof ? '' : ' racine'}"><rect x="${b.x}" y="${b.y}" width="${L}" height="${HT + b.lignes.length * HL + PAD}" rx="10"/><text x="${b.x + 10}" y="${b.y + 15}" class="titre">${titre}</text>`);
      b.lignes.forEach((l, k) => {
        const p = g.P.get(l.id);
        const y = ligneY(b, k);
        const x0 = b.x + (l.role === 'enfant' ? 18 : 8);
        const inconnu = p?.inconnu;
        const nom = inconnu ? '?' : ((p.prenom || '') + ' ' + (p.nom || '')).trim();
        const court = nom.length > 19 ? nom.slice(0, 18) + '…' : nom;
        const cls = `ligne ${l.genre}${l.id === g.moi ? ' moi' : ''}${l.role === 'enfant' ? ' enfant' : ''}`;
        const cible = l.genre === 'copie' ? ` data-vers="${l.vers[0]}|${l.vers[1]}"` : l.genre === 'relais' ? ` data-vers="${b.depuis.F.cle}|${b.depuis.lignes.findIndex((m) => m.id === l.id)}"` : '';
        corps.push(
          `<g class="${cls}" data-id="${echapper(l.id)}"${cible}><title>${echapper(nom)}</title>` +
            (l.genre === 'copie' ? `<rect x="${x0 - 4}" y="${y - HL / 2 + 2}" width="${b.x + L - x0 - 2}" height="${HL - 4}" rx="6" class="cadre-copie"/>` : '') +
            `<circle cx="${x0 + 7}" cy="${y}" r="7" fill="${inconnu ? '#fff' : couleur(lignee(p) || l.id)}"${inconnu ? ' class="inconnu"' : ''}/>` +
            `<text x="${x0 + 20}" y="${y + 4}" class="nom">${echapper(court)}</text>` +
            `<text x="${b.x + L - 8}" y="${y + 4}" class="an">${l.genre === 'copie' ? 'voir aussi ↗' : l.id === g.moi ? 'Toi' : an(p?.naissance) || ''}</text></g>`,
        );
        cartes.push({ id: b.F.cle + '#' + k, vrai: l.id, x: b.x + L / 2, y, g: b.x, d: b.x + L, h: y - HL / 2, b: y + HL / 2, fantome: l.genre !== 'principal' });
      });
      corps.push('</g>');
      // Courbe de la ligne de la personne vers la même personne dans le foyer suivant.
      for (const s of b.sous) {
        const c = s.b;
        const kE = c.lignes.findIndex((m) => m.id === c.entree);
        const [y1, y2] = [ligneY(b, s.k), ligneY(c, kE)];
        const droite = c.x > b.x;
        const [x1, x2] = droite ? [b.x + L, c.x] : [b.x, c.x + L];
        const xm = (x1 + x2) / 2;
        const adopte = g.typeFil.get(c.F.parents[0] + '|' + c.entree) === 'adoptif' || g.typeFil.get(c.F.parents[1] + '|' + c.entree) === 'adoptif';
        traits.push(`<path d="M${x1} ${y1}C${xm} ${y1},${xm} ${y2},${x2} ${y2}" class="lien${adopte ? ' adoption' : ''}"/>`);
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16,
            v = 1 - t;
          pts.push([v * v * v * x1 + 3 * v * v * t * xm + 3 * v * t * t * xm + t * t * t * x2, v * v * v * y1 + 3 * v * v * t * y1 + 3 * v * t * t * y2 + t * t * t * y2]);
        }
        liens.push({ groupe: 'l:' + b.F.cle + '#' + s.k, type: 'lien', membres: [b.F.cle + '#' + s.k, c.F.cle + '#' + kE], courbe: true, chemins: [pts] });
      }
    }
    const xs = lay.boites.flatMap((b) => [b.x, b.x + L]),
      ys = lay.boites.flatMap((b) => [b.y, b.y + HT + b.lignes.length * HL + PAD]);
    const boite = { x: Math.min(...xs) - 30, y: Math.min(...ys) - 30, w: Math.max(...xs) - Math.min(...xs) + 60, h: Math.max(...ys) - Math.min(...ys) + 60 };
    const svg = `<g fill="none" stroke-width="1.6">${traits.join('')}</g><g>${corps.join('')}</g>`;
    return { svg, boite, scene: { cartes, liens, pas: 64, lignes: false } };
  }

  /** Coordonnées (centre de ligne) d'une personne dans un foyer : « cle|index ». */
  function point(lay, ref) {
    const [c, k] = ref.split('|');
    const b = lay.boites.find((x) => x.F.cle === c);
    return b && { x: b.x + L / 2, y: b.y + HT + +k * HL + HL / 2 };
  }
  function pointDe(lay, id) {
    for (const b of lay.boites) {
      const k = b.lignes.findIndex((l) => l.id === id && l.genre === 'principal');
      if (k >= 0) return { x: b.x + L / 2, y: b.y + HT + k * HL + HL / 2 };
    }
  }

  const STYLE = `
  .foyer>rect{fill:#fff;stroke:#d6dcd8}.foyer.racine>rect{stroke:#2e7262;stroke-width:1.5}
  .foyer .titre{font:600 10px system-ui,sans-serif;fill:#77847e;letter-spacing:.04em;text-transform:uppercase}
  .ligne .nom{font:500 12px system-ui,sans-serif;fill:#1f2925}.ligne .an{font:10.5px system-ui,sans-serif;fill:#77847e;text-anchor:end}
  .ligne.moi .nom{font-weight:700}.ligne.moi circle{stroke:#2e7262;stroke-width:2.5}
  .ligne.relais .nom{fill:#5d6b65}.ligne.relais circle{opacity:.55}.ligne.relais{cursor:pointer}
  .ligne.copie .nom{fill:#77847e;font-style:italic}.ligne.copie{cursor:pointer}.cadre-copie{fill:#faf7f0;stroke:#b5603f;stroke-dasharray:3 3}
  .ligne.copie .an{fill:#b5603f;font-weight:600}
  .ligne circle.inconnu{stroke:#9aa8a2;stroke-dasharray:2 2}
  .lien{stroke:#8fa39b}.lien.adoption{stroke-dasharray:7 4}`;

  const api = { disposer, dessiner, point, pointDe, STYLE, L };
  if (typeof module !== 'undefined') module.exports = api;
  else racine.Foyers = api;
})(this);
