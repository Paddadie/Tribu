/* Maquettes de l'arbre global : disposition calculée à partir de l'export Tribu (sans DOM, Node et navigateur). */
(function (racine) {
  'use strict';
  const GAP = 1; // deux nœuds voisins d'une même ligne (conjoints)
  const GAPF = 1.3; // deux familles voisines (sous-arbres)

  const pousser = (m, k, v) => (m.get(k) || m.set(k, []).get(k)).push(v);
  const annee = (s) => {
    const m = /^(\d{4})/.exec(s || '');
    return m ? +m[1] : null;
  };

  /** Liens de la famille de Moi, avec un parent « ? » ajouté à tout enfant qui n'a qu'un parent. */
  function graphe(d, moi) {
    const P = new Map(d.personnes.map((p) => [p.id, p]));
    const parents = new Map(),
      enfants = new Map(),
      unionsDe = new Map(),
      typeFil = new Map();
    for (const f of d.filiations) {
      pousser(parents, f.enfant, f.parent);
      pousser(enfants, f.parent, f.enfant);
      typeFil.set(f.parent + '|' + f.enfant, f.type);
    }
    const unions = [...d.unions];
    for (const u of unions) (pousser(unionsDe, u.personneA, u), pousser(unionsDe, u.personneB, u));
    // Composante de Moi.
    const voisins = (x) => [...(parents.get(x) || []), ...(enfants.get(x) || []), ...(unionsDe.get(x) || []).map((u) => (u.personneA === x ? u.personneB : u.personneA))];
    const dans = new Set([moi]);
    for (const x of dans) for (const v of voisins(x)) dans.add(v);
    // Parent « ? » : un par parent seul, partagé par tous ses enfants sans autre parent.
    for (const c of dans) {
      const ps = parents.get(c) || [];
      if (ps.length !== 1) continue;
      const p = ps[0],
        q = '?/' + p;
      if (!P.has(q)) {
        P.set(q, { id: q, prenom: '', nom: '', inconnu: true, pseudo: true });
        const u = { id: 'u' + q, personneA: p, personneB: q, marie: false, statut: 'inconnu' };
        unions.push(u);
        (pousser(unionsDe, p, u), pousser(unionsDe, q, u));
        dans.add(q);
      }
      pousser(parents, c, q);
      pousser(enfants, q, c);
      typeFil.set(q + '|' + c, typeFil.get(p + '|' + c));
    }
    // Deux parents d'un même enfant sans union : un lien « sans union » (pointillés).
    for (const c of dans) {
      const ps = parents.get(c) || [];
      if (ps.length === 2 && !(unionsDe.get(ps[0]) || []).some((u) => u.personneA === ps[1] || u.personneB === ps[1])) {
        const u = { id: 'u~' + ps.join('~'), personneA: ps[0], personneB: ps[1], marie: false, statut: 'separee', sansUnion: true };
        unions.push(u);
        (pousser(unionsDe, ps[0], u), pousser(unionsDe, ps[1], u));
      }
    }
    // Générations : parent −1, enfant +1, conjoint 0.
    const gen = new Map([[moi, 0]]);
    const file = [moi];
    for (const x of file) {
      const g = gen.get(x);
      const vs = [
        ...(parents.get(x) || []).map((p) => [p, g - 1]),
        ...(enfants.get(x) || []).map((e) => [e, g + 1]),
        ...(unionsDe.get(x) || []).map((u) => [u.personneA === x ? u.personneB : u.personneA, g]),
      ];
      for (const [v, gv] of vs) if (!gen.has(v)) (gen.set(v, gv), file.push(v));
    }
    const naissance = (id) => annee(P.get(id)?.naissance) ?? 9999;
    const g = {
      P,
      moi,
      dans,
      unions,
      gen,
      typeFil,
      parents: (id) => parents.get(id) || [],
      enfants: (id) => enfants.get(id) || [],
      unionsDe: (id) => unionsDe.get(id) || [],
      naissance,
    };
    g.autre = (u, x) => (u.personneA === x ? u.personneB : u.personneA);
    g.enfantsDuCouple = (a, b) =>
      g
        .enfants(a)
        .filter((e) => g.parents(e).includes(b))
        .sort((x, y) => naissance(x) - naissance(y));
    // Ex d'abord, puis l'union en cours.
    g.conjoints = (x) =>
      g
        .unionsDe(x)
        .slice()
        .sort((u, v) => (u.statut === 'actuelle') - (v.statut === 'actuelle'))
        .map((u) => g.autre(u, x));
    g.unionEntre = (a, b) => g.unionsDe(a).find((u) => g.autre(u, a) === b);
    // Lignée directe : ancêtres de Moi, et l'enfant par lequel chacun descend vers Moi.
    g.suivant = new Map();
    const pile = [moi];
    for (const x of pile)
      for (const p of g.parents(x))
        if (!g.suivant.has(p)) {
          g.suivant.set(p, x);
          pile.push(p);
        }
    g.direct = (x) => x === moi || g.suivant.has(x);
    g.conjointDirect = (x) => {
      const s = g.suivant.get(x);
      return s ? g.parents(s).find((p) => p !== x) : undefined;
    };
    return g;
  }

  /** Ensemble de nœuds placés : abscisse en cases, ligne = génération. */
  class Bloc {
    constructor() {
      this.n = new Map();
      this.doublons = [];
    }
    x(id) {
      return this.n.get(id).x;
    }
    poser(id, x, r) {
      if (this.n.has(id)) this.doublons.push(id);
      this.n.set(id, { x, r });
      return this;
    }
    miroir() {
      for (const v of this.n.values()) v.x = -v.x;
      return this;
    }
    absorber(b, dx = 0) {
      for (const [id, v] of b.n) this.poser(id, v.x + dx, v.r);
      this.doublons.push(...b.doublons);
      return this;
    }
    contour() {
      const c = new Map();
      for (const v of this.n.values()) {
        const e = c.get(v.r);
        if (!e) c.set(v.r, [v.x, v.x]);
        else ((e[0] = Math.min(e[0], v.x)), (e[1] = Math.max(e[1], v.x)));
      }
      return c;
    }
  }
  /** Décalage minimal de B pour qu'il soit à droite de A sur chaque ligne commune (−∞ sans ligne commune). */
  function ecart(A, B, gap) {
    const ca = A.contour(),
      cb = B.contour();
    let s = -Infinity;
    for (const [r, [, max]] of ca) {
      const e = cb.get(r);
      if (e) s = Math.max(s, max + (typeof gap === 'function' ? gap(r) : gap) - e[0]);
    }
    return s;
  }

  function moteur(g, options = {}) {
    const lateraux = options.lateraux !== false;
    const ligne = (id) => ((v) => g.gen.get(v) ?? g.gen.get(g.conjoints(v)[0]))(vrai(id));
    const feuilles = options.feuilles || new Set();
    // Côté (dans le repère du bloc en cours) où vont les conjoints : vers l'extérieur de Moi. Chaque miroir l'inverse.
    let dehors = -1;
    const sous = (d, f) => {
      const v = dehors;
      dehors = d;
      try {
        return f();
      } finally {
        dehors = v;
      }
    };

    /** Enfants côte à côte, chacun avec sa descendance. `kids` : les enfants dans l'ordre. */
    function fratrie(elements) {
      const b = new Bloc();
      const kids = [];
      for (const { bloc, id } of elements) {
        const s = b.n.size ? ecart(b, bloc, GAPF) : 0;
        b.absorber(bloc, s === -Infinity ? 0 : s);
        kids.push(id);
      }
      return { b, kids, centre: () => (b.x(kids[0]) + b.x(kids[kids.length - 1])) / 2 };
    }

    /**
     * Une ligne de conjoints et les enfants de chaque couple, centrés sous une « case » de la ligne (l'intervalle
     * entre deux voisins). `paires` : les couples ; par défaut, deux voisins. Un couple non voisin (une personne et
     * son 2e, 3e conjoint du même côté) a ses enfants dans la case contre le conjoint, du côté de la personne : son
     * trait passe au-dessus de la ligne et redescend entre deux avatars.
     */
    function chaine(ids, paires) {
      const r = ligne(ids[0]);
      paires = paires || ids.slice(1).map((v, i) => [ids[i], v]);
      const degre = (v) => paires.filter((p) => p.includes(v)).length;
      const parCase = ids.slice(1).map(() => []);
      for (const [a, b] of paires) {
        const [i, j] = [ids.indexOf(a), ids.indexOf(b)].sort((u, v) => u - v);
        const centre = degre(ids[i]) >= degre(ids[j]) ? i : j;
        parCase[j === i + 1 || centre === j ? i : j - 1].push(...g.enfantsDuCouple(a, b));
      }
      const groupes = parCase.map((enf) => (enf.length ? fratrie(enf.map((e) => ({ id: e, bloc: descendance(e) }))) : null));
      // Groupes côte à côte, de gauche à droite.
      const tous = new Bloc();
      const dx = groupes.map(() => 0);
      groupes.forEach((gr, i) => {
        if (!gr) return;
        dx[i] = tous.n.size ? Math.max(0, ecart(tous, gr.b, GAPF)) : 0;
        tous.absorber(gr.b, dx[i]);
      });
      const centre = (i) => groupes[i].centre() + dx[i];
      // Abscisses des conjoints : chaque couple au-dessus du milieu de ses enfants.
      const x = new Array(ids.length);
      const k = groupes.findIndex(Boolean);
      if (k < 0) ids.forEach((_, i) => (x[i] = i * GAP));
      else {
        x[k] = centre(k) - GAP / 2;
        for (let i = k - 1; i >= 0; i--) x[i] = x[i + 1] - GAP;
        for (let i = k; i + 1 < ids.length; i++) {
          if (!groupes[i]) {
            x[i + 1] = x[i] + GAP;
            continue;
          }
          x[i + 1] = 2 * centre(i) - x[i];
          if (x[i + 1] - x[i] < GAP) {
            const d = (GAP - (x[i + 1] - x[i])) / 2;
            for (let j = i; j < groupes.length; j++) dx[j] += d;
            x[i + 1] = 2 * centre(i) - x[i];
          }
        }
      }
      const b = new Bloc();
      groupes.forEach((gr, i) => gr && b.absorber(gr.b, dx[i]));
      ids.forEach((id, i) => b.poser(id, x[i], r));
      return b;
    }

    /** Conjoints de x hors `exclus`, puis leurs autres conjoints, en s'éloignant de x. */
    function versLExterieur(x, exclus) {
      const out = [];
      const vus = new Set([x, ...exclus]);
      let cur = x;
      for (;;) {
        const qs = g.conjoints(cur).filter((q) => !vus.has(q));
        if (!qs.length) break;
        for (const q of qs) (vus.add(q), out.push(q));
        cur = qs[qs.length - 1];
      }
      return out;
    }

    /**
     * Conjoints de x hors `exclus`, du plus proche au plus lointain : le plus récent contre x, les précédents au-delà
     * (en étoile autour de x), puis les autres conjoints du dernier, en s'éloignant. `paires` : les couples.
     */
    function rangee(x, exclus) {
      const qs = g.conjoints(x).filter((q) => !exclus.includes(q)).reverse();
      if (!qs.length) return { ids: [], paires: [] };
      const suite = versLExterieur(qs[qs.length - 1], [x, ...exclus, ...qs]);
      const avant = [x, ...qs];
      const paires = qs.map((q) => [x, q]);
      for (const q of suite) {
        paires.push([[...avant].reverse().find((v) => g.conjoints(q).includes(v)), q]);
        avant.push(q);
      }
      return { ids: [...qs, ...suite], paires };
    }
    /** x au bout de sa ligne, ses autres conjoints vers la gauche (hors q). */
    function cote(x, q) {
      const rg = rangee(x, [q]);
      return chaine([...rg.ids].reverse().concat(x), rg.paires);
    }

    /** Une personne hors lignée directe, ses conjoints (un d'un côté, les autres en étoile de l'autre) et toute sa descendance. */
    function descendance(x) {
      if (feuilles.has(x)) return new Bloc().poser(x, 0, ligne(x));
      // Renvoi (A2) : l'ancêtre en pointillé n'y garde que ses autres unions.
      const ex = options.sans && x === options.sans[0] ? [options.sans[1]] : [];
      const cs = g.conjoints(x).filter((q) => !ex.includes(q));
      if (!cs.length) return new Bloc().poser(x, 0, ligne(x));
      const gauche = cs.length === 1 ? { ids: [], paires: [] } : rangee(x, [...ex, ...cs.slice(1)]);
      const droite = rangee(x, [...ex, ...gauche.ids]);
      const ids = [...[...gauche.ids].reverse(), x, ...droite.ids];
      return chaine(dehors < 0 ? ids.reverse() : ids, [...gauche.paires, ...droite.paires]);
    }

    /** Le couple a (dans L), b (dans R) et leurs enfants K, centrés sous le milieu du couple. */
    function fusion(L, K, R, a, b) {
      const xa = L.x(a),
        xb = R.x(b),
        rp = ligne(a);
      // Couple écarté par des familles intérieures : la descente garde un couloir sur la ligne du couple.
      const cL = L.contour().get(rp),
        cR = R.contour().get(rp);
      if (cL[1] > xa + 1e-6 || cR[0] < xb - 1e-6) {
        K.b.poser('|' + a + '|' + b, K.centre(), rp);
        etires.push([a, b]);
      }
      const k0 = K.centre();
      const gapLR = (r) => (r === rp ? GAP : GAPF);
      const gapK = (r) => (r === rp ? 0.6 : GAPF);
      const sLK = ecart(L, K.b, gapK),
        sLR = ecart(L, R, gapLR),
        sKR = ecart(K.b, R, gapK);
      let r = Math.max(sLR, xa + GAP - xb);
      if (sLK > -Infinity) r = Math.max(r, 2 * (sLK + k0) - xa - xb);
      if (sKR > -Infinity) r = Math.max(r, xa + xb - 2 * k0 + 2 * sKR);
      const k = (xa + xb + r) / 2 - k0;
      return new Bloc().absorber(L).absorber(K.b, k).absorber(R, r);
    }

    const tailleInterieure = (blk, p) => [...blk.n.values()].filter((v) => v.r > ligne(p)).length;
    const choix = []; // côté intérieur retenu à chaque couple d'ancêtres
    const etires = []; // couples écartés par des familles intérieures
    const coupes = []; // personnes dont l'ascendance est pliée (profondeur atteinte)
    const renvois = []; // A2 : familles d'ancêtres intérieurs, dessinées à part à l'extérieur
    const journaux = [choix, etires, coupes, renvois];
    // A2 : sous le parent intérieur, on ne garde que les ancêtres (généalogie pure), le reste part en renvoi.
    let genealogie = !!options.genealogie;
    const enGenealogie = (f) => {
      const v = genealogie;
      genealogie = true;
      try {
        return f();
      } finally {
        genealogie = v;
      }
    };
    const marque = () => journaux.map((j) => j.length);
    const effacer = (de, a) => journaux.forEach((j, i) => j.splice(de[i], a[i] - de[i]));

    /**
     * La personne c de la lignée directe, ses frères et sœurs vers l'extérieur (la gauche), ses parents et leurs
     * familles. Le parent extérieur garde sa famille à gauche ; celle du parent intérieur va vers l'intérieur.
     */
    function ascendance(c, faireUnite, n = 0, partenaire = null) {
      const ps = g.parents(c);
      const unite = faireUnite();
      const autresUnions = () => genealogie && versLExterieur(c, partenaire ? [partenaire] : []).length > 0;
      if (ps.length < 2) {
        if (autresUnions()) renvois.push({ haut: [c], c, partenaire });
        return unite;
      }
      // Profondeur limitée : les ancêtres plus hauts deviennent une pastille (maquette B) ou un renvoi (A, « plier »).
      if (options.profondeur !== undefined && n >= options.profondeur) {
        if (options.renvoyer) renvois.push({ ascendance: true, haut: [c], c, partenaire });
        else coupes.push(c);
        return unite;
      }
      let [a, b] = ps;
      if (options.forcer?.has(b)) [a, b] = [b, a];
      // Implexe : un ancêtre déjà dessiné par un autre chemin n'est ici qu'une copie « voir aussi », sans ascendance.
      const copie = (p) => g.suivant.has(p) && g.suivant.get(p) !== c;
      const ici = (p) => (copie(p) ? '≈' + c + '≈' + p : p);
      // Option « proches » : au-dessus des parents, généalogie seule des deux côtés ; les familles des grands-parents
      // (grands-oncles, autres unions) partent en renvoi au bord, comme celles du côté intérieur.
      const plier = options.proches ? enGenealogie : (f) => f();
      const monter = (p, q) =>
        copie(p) ? new Bloc().poser(ici(p), 0, ligne(p)) : plier(() => ascendance(p, () => (genealogie ? chaine([p]) : cote(p, q)), n + 1, q));
      const m0 = marque();
      const A = monter(a, b);
      const m1 = marque();
      const B = monter(b, a);
      const m2 = marque();
      let [ext, int, E, I] = [a, b, A, B];
      if (!options.forcer?.has(a) && lateraux && tailleInterieure(B, b) > tailleInterieure(A, a)) [ext, int, E, I] = [b, a, B, A];
      // Le bloc intérieur sera retourné : on le refait avec l'orientation inverse (sans garder les traces du premier essai).
      if (int === a) effacer(m0, m1);
      else effacer(m1, m2);
      I = sous(-dehors, () => (options.replier ? enGenealogie(() => monter(int, ext)) : monter(int, ext)));
      if (lateraux && !genealogie) choix.push({ couple: [ext, int], interieur: int, taille: tailleInterieure(I, int) });
      const copies = copie(a) || copie(b);
      if (genealogie && !copies && (g.enfantsDuCouple(a, b).length > 1 || autresUnions())) renvois.push({ haut: [a, b], c, partenaire });
      // Frères et sœurs : sauf ceux qui sont eux-mêmes ancêtres de Moi (implexe), dessinés dans leur propre lignée.
      const freres = lateraux && !genealogie && !copies
        ? g
            .enfantsDuCouple(a, b)
            .filter((e) => e !== c && !g.direct(e))
            .map((e) => ({ id: e, bloc: descendance(e) }))
        : [];
      const K = fratrie([...freres, { id: c, bloc: unite }]);
      return fusion(E, K, I.miroir(), ici(ext), ici(int));
    }

    return { ascendance, descendance, chaine, cote, rangee, versLExterieur, fusion, fratrie, choix, etires, ligne, coupes, sous, renvois };
  }

  const GAPR = 2.5; // entre l'arbre et le premier renvoi
  /** Place B à gauche (cote −1) ou à droite (+1) de tout ce qui est déjà dans `tout`. */
  function accoler(tout, B, cote, gap) {
    let s = cote > 0 ? ecart(tout, B, gap) : ecart(B, tout, gap);
    if (s === -Infinity) {
      const xs = (b) => [...b.n.values()].map((v) => v.x);
      s = cote > 0 ? Math.max(...xs(tout)) - Math.min(...xs(B)) + gap : Math.max(...xs(B)) - Math.min(...xs(tout)) + gap;
    }
    return tout.absorber(B, cote > 0 ? s : -s);
  }

  /**
   * Maquette A2 : comme A, mais à chaque couple d'ancêtres le parent intérieur ne garde que ses ancêtres. Sa famille
   * (frères, sœurs, autres unions et leur descendance) est dessinée en renvoi au bord de l'arbre, sous une copie en
   * pointillé du couple, pour qu'aucun trait ne traverse les familles placées entre deux conjoints.
   */
  function disposerA2(g, o = {}) {
    // o.proches : au-dessus des parents, généalogie seule ; o.plier : ascendance renvoyée au-delà de n générations.
    const m = moteur(g, { replier: true, forcer: o.forcer, proches: o.proches, profondeur: o.plier, renvoyer: true });
    const moi = g.moi;
    const [pere, mere] = parentsOrdonnes(g, moi);
    const L = m.ascendance(pere, () => m.cote(pere, mere));
    const R = m.ascendance(mere, () => m.cote(mere, pere)).miroir();
    const enf = g.enfantsDuCouple(pere, mere);
    const K = m.fratrie(enf.map((e, j) => ({ id: e, bloc: m.sous(j < enf.indexOf(moi) ? -1 : 1, () => m.descendance(e)) })));
    const principal = m.fusion(L, K, R, pere, mere);
    const xMoi = principal.x(moi);
    const tout = new Bloc().absorber(principal);
    const fantomes = new Set();
    const directs = new Set([...g.dans].filter(g.direct));
    const specs = m.renvois.map((r) => {
      const haut = [...r.haut].sort((u, v) => principal.x(u) - principal.x(v));
      const xa = haut.reduce((s, p) => s + principal.x(p), 0) / haut.length;
      return { ...r, haut, xa, cote: xa < xMoi ? -1 : 1, prefixe: '' };
    });
    // Même ordre que les ancres : à gauche, le renvoi de l'ancre la plus proche de l'arbre est posé en premier.
    // Les renvois trouvés dans un renvoi (familles d'ancêtres repliés) suivent, plus loin du même côté.
    const file = [...specs.filter((s) => s.cote < 0).sort((u, v) => v.xa - u.xa), ...specs.filter((s) => s.cote > 0).sort((u, v) => u.xa - v.xa)];
    const premier = { '-1': true, 1: true };
    const renvois = [];
    // Personnes déjà dessinées pour de bon (hors copies) : nom du nœud par personne.
    const places = new Map();
    const noter = (ids) => {
      for (const id of ids) if (id[0] !== '|' && id[0] !== '≈' && !fantomes.has(id) && !places.has(vrai(id))) places.set(vrai(id), id);
    };
    noter(principal.n.keys());
    // Parents d'une personne entrée par alliance (beaux-parents d'un frère, d'un cousin…) : jamais dans l'arbre,
    // ils viennent en dernier, en renvoi « Parents de X » au-dessus d'une copie de X.
    const parentsManquants = () => {
      for (const [v, id] of places) {
        if (g.parents(v).some((p) => !g.P.get(p).pseudo && !places.has(p))) {
          const x = tout.x(id);
          return [{ parents: true, haut: [v], c: v, partenaire: null, cote: x < tout.x(moi) ? -1 : 1, prefixe: id.slice(0, id.length - v.length) }];
        }
      }
      return [];
    };
    for (let k = 1; file.length || file.push(...parentsManquants()); k++) {
      const r = file.shift();
      const mr = r.parents
        ? moteur(g, { replier: true, feuilles: new Set([...places.keys()].filter((v) => v !== r.c)) })
        : r.ascendance
        ? moteur(g, { replier: true, genealogie: true, proches: true, feuilles: directs })
        : moteur(g, { sans: [r.c, r.partenaire], feuilles: new Set([...directs].filter((v) => v !== r.c)) });
      const brut = r.parents
        ? mr.ascendance(r.c, () => mr.chaine([r.c]))
        : r.ascendance
        ? mr.ascendance(r.c, () => mr.chaine([r.c]), 0, r.partenaire)
        : r.haut.length === 2
        ? mr.chaine(r.haut)
        : mr.descendance(r.c);
      const b = new Bloc();
      const id = (v) => '~' + k + '~' + v;
      for (const [v, p] of brut.n) b.poser(id(v), p.x, p.r);
      // Copies en pointillé : l'ancre, et (dans une famille) les ancêtres de Moi qui sont dessinés ailleurs.
      for (const v of brut.n.keys())
        if (r.haut.includes(v) || v === r.c || (!r.ascendance && directs.has(v)) || v[0] === '≈' || (r.parents && places.has(v))) fantomes.add(id(v));
      accoler(tout, b, r.cote, premier[r.cote] ? GAPR : GAPF + 0.4);
      premier[r.cote] = false;
      for (const r2 of mr.renvois) file.push({ ...r2, cote: r.cote, prefixe: '~' + k + '~' });
      const nombre = [...brut.n.keys()].filter((v) => !r.haut.includes(v) && v !== r.c && v[0] !== '≈' && !g.P.get(v)?.inconnu).length;
      renvois.push({ k, ancre: r.haut.map((v) => r.prefixe + v), cote: r.cote, nombre, haut: r.haut.map(id), c: r.c, ascendance: !!r.ascendance, parents: !!r.parents });
      const avant = places.size;
      noter(b.n.keys());
      if (r.parents && places.size === avant) break; // garde-fou : un renvoi « Parents de » doit placer quelqu'un
    }
    for (const id of principal.n.keys()) if (id[0] === '≈') fantomes.add(id);
    return { bloc: tout, choix: m.choix, etires: m.etires, ligne: m.ligne, renvois, fantomes, coupes: m.coupes };
  }

  /** Maquette A : tout l'arbre de la famille de Moi, père à gauche, mère à droite. */
  function disposerA(g) {
    const m = moteur(g);
    const moi = g.moi;
    const [pere, mere] = parentsOrdonnes(g, moi);
    const L = m.ascendance(pere, () => m.cote(pere, mere));
    const R = m.ascendance(mere, () => m.cote(mere, pere)).miroir();
    // Frères et sœurs : conjoints à gauche pour les aînés placés à gauche de Moi, à droite pour les autres.
    const enf = g.enfantsDuCouple(pere, mere);
    const K = m.fratrie(enf.map((e, j) => ({ id: e, bloc: m.sous(j < enf.indexOf(moi) ? -1 : 1, () => m.descendance(e)) })));
    const bloc = m.fusion(L, K, R, pere, mere);
    return { bloc, choix: m.choix, etires: m.etires, ligne: m.ligne };
  }

  function parentsOrdonnes(g, moi) {
    const ps = g.parents(moi);
    const pere = ps.find((p) => g.P.get(p)?.sexe === 'H' || g.P.get(p)?.sexe === 'M') ?? ps[0];
    return [pere, ps.find((p) => p !== pere)];
  }

  /** Maquette B : ascendance seule (sablier replié), les branches latérales sont pliées en pastilles. */
  function disposerB(g) {
    const m = moteur(g, { lateraux: false, profondeur: 2 });
    const moi = g.moi;
    const [pere, mere] = parentsOrdonnes(g, moi);
    // Au-dessus des parents, le père de chaque couple à gauche.
    const L = m.ascendance(pere, () => m.cote(pere, mere));
    const R = m.ascendance(mere, () => m.cote(mere, pere)).miroir();
    // Frères et sœurs : conjoints à gauche pour les aînés placés à gauche de Moi, à droite pour les autres.
    const enf = g.enfantsDuCouple(pere, mere);
    const K = m.fratrie(enf.map((e, j) => ({ id: e, bloc: m.sous(j < enf.indexOf(moi) ? -1 : 1, () => m.descendance(e)) })));
    const bloc = m.fusion(L, K, R, pere, mere);
    // Pastilles : pour chaque couple d'ancêtres au-dessus des parents, ce qui est plié.
    const pastilles = [];
    for (const [p, c] of g.suivant) {
      const ps = g.parents(c);
      if (p !== ps[0] || c === moi) continue;
      const branche = brancheDe(g, ps, c);
      if (branche.size) pastilles.push({ parents: ps, enfant: c, nombre: branche.size });
    }
    // Ascendance pliée au-dessus des arrière-grands-parents.
    for (const c of m.coupes) pastilles.push({ ancetres: true, enfant: c, nombre: ancetresDe(g, c).size });
    return { bloc, pastilles, ligne: m.ligne, fantomes: new Set([...bloc.n.keys()].filter((id) => id[0] === '≈')) };
  }

  function ancetresDe(g, c) {
    const vus = new Set();
    const pile = [c];
    for (const x of pile) for (const p of g.parents(x)) if (!vus.has(p)) (vus.add(p), pile.push(p));
    return vus;
  }

  /** Pastille « ancêtres » ouverte : l'ascendance de c, sans les branches latérales. */
  function disposerAncetres(g, c) {
    const m = moteur(g, { lateraux: false });
    return m.ascendance(c, () => m.chaine([c]));
  }

  /** Personnes d'une branche latérale : autres enfants du couple (et des autres unions de chacun), conjoints et descendance. */
  function brancheDe(g, ps, c) {
    const vus = new Set();
    const ajouter = (x) => {
      if (vus.has(x) || g.direct(x)) return;
      vus.add(x);
      for (const q of g.conjoints(x)) if (!g.direct(q)) vus.add(q);
      for (const e of g.enfants(x)) ajouter(e);
      for (const q of g.conjoints(x)) for (const e of g.enfants(q)) ajouter(e);
    };
    for (const p of ps) {
      for (const e of g.enfants(p)) if (e !== c) ajouter(e);
      for (const q of g.conjoints(p)) if (!ps.includes(q) && !g.direct(q)) vus.add(q);
    }
    return vus;
  }

  /** Branche ouverte de la maquette B : le couple, tous ses enfants (l'enfant de la lignée directe sans sa suite). */
  function disposerBranche(g, ps, c) {
    const m = moteur(g, { feuilles: new Set([c]) });
    const [a, b] = ps;
    const [ra, rb] = [m.rangee(a, [b]), m.rangee(b, [a])];
    return m.chaine([...[...ra.ids].reverse(), a, b, ...rb.ids], [...ra.paires, [a, b], ...rb.paires]);
  }

  // ---------- Traits et contrôles des règles ----------

  /** Couples et fratries à dessiner, à partir des positions. */
  /** Identifiant d'un nœud de renvoi « ~k~id » : la personne et le numéro du renvoi (0 : l'arbre). */
  // Copie d'implexe « ≈c≈p » : l'ancêtre p redessiné au-dessus de c, dans l'arbre (groupe 0).
  const vrai = (id) => {
    while (id[0] === '~' || id[0] === '≈') id = id.slice(id.indexOf(id[0], 1) + 1);
    return id;
  };
  const groupe = (id) => (id[0] === '~' ? +id.slice(1, id.indexOf('~', 1)) : 0);

  function traits(g, pos) {
    // Chaque renvoi est un dessin à part : on ne relie que des nœuds du même groupe.
    const index = new Map();
    const copiesDe = new Map(); // enfant → copies de ses parents (implexe)
    for (const id of pos.keys()) {
      if (id[0] === '|') continue;
      if (id[0] === '≈') {
        const c = id.slice(1, id.indexOf('≈', 1));
        (copiesDe.get(c) || copiesDe.set(c, []).get(c)).push(id);
        continue;
      }
      const k = groupe(id);
      (index.get(k) || index.set(k, new Map()).get(k)).set(vrai(id), id);
    }
    const place = (k, v) => index.get(k)?.get(v);
    const parentsPlaces = (id) =>
      g
        .parents(vrai(id))
        .map((p) => (id[0] !== '~' && copiesDe.get(id)?.find((q) => vrai(q) === p)) || place(groupe(id), p))
        .filter(Boolean);
    const conjointsPlaces = (id) => g.conjoints(vrai(id)).map((q) => place(groupe(id), q)).filter(Boolean);
    const couples = [];
    // Unions redessinées par des copies d'implexe : le couple relie les nœuds placés au-dessus de l'enfant.
    const parCopie = [];
    for (const c of copiesDe.keys()) {
      const ps = parentsPlaces(c);
      const u = ps.length === 2 && g.unionEntre(vrai(ps[0]), vrai(ps[1]));
      if (u) parCopie.push([u, ...ps]);
    }
    // Cas mixte (un seul parent copié) : le parent réel n'est plus relié à l'original lointain de l'autre.
    const reels = new Set(parCopie.flatMap(([u, a, b]) => [a, b].filter((x) => x[0] !== '≈').map((x) => u.id + '|' + x)));
    const poser = (u, a, b, k) => {
      const [pa, pb] = [pos.get(a), pos.get(b)];
      const [x1, x2] = [Math.min(pa.x, pb.x), Math.max(pa.x, pb.x)];
      const entre = [...pos].filter(([id, p]) => p.r === pa.r && p.x > x1 + 1e-6 && p.x < x2 - 1e-6).map(([id]) => id);
      couples.push({ u, a, b, r: pa.r, x1, x2, entre, k });
    };
    for (const u of g.unions)
      for (const [k, ix] of index) {
        const [a, b] = [ix.get(u.personneA), ix.get(u.personneB)];
        if (a && b && !(k === 0 && (reels.has(u.id + '|' + a) || reels.has(u.id + '|' + b)))) poser(u, a, b, k);
      }
    for (const [u, a, b] of parCopie) poser(u, a, b, 0);
    const fratries = new Map();
    for (const id of pos.keys()) {
      if (id[0] === '|') continue;
      const ps = parentsPlaces(id);
      if (!ps.length) continue;
      const cle = ps.slice(0, 2).sort().join('+');
      if (!fratries.has(cle)) fratries.set(cle, { parents: ps.slice(0, 2), enfants: [] });
      fratries.get(cle).enfants.push(id);
    }
    return { couples, fratries: [...fratries.values()], vrai, groupe, place, parentsPlaces, conjointsPlaces };
  }

  /** Contrôles : règle 1 (centrage), règle 2 (croisements), règle 4 (proximité). */
  function controles(g, pos, tr, dessin, fantomes = new Set()) {
    const R1 = [];
    for (const f of tr.fratries) {
      const mid = f.parents.reduce((s, p) => s + pos.get(p).x, 0) / f.parents.length;
      const xs = f.enfants.map((e) => pos.get(e).x);
      const c = (Math.min(...xs) + Math.max(...xs)) / 2;
      if (Math.abs(mid - c) > 0.01) R1.push({ parents: f.parents, ecart: +(c - mid).toFixed(2) });
    }
    // Croisements : segments horizontaux contre segments verticaux de familles différentes.
    const segs = dessin.segments;
    const H = segs.filter((s) => s.y1 === s.y2),
      V = segs.filter((s) => s.x1 === s.x2);
    const croisements = [];
    for (const h of H)
      for (const v of V) {
        if (h.f === v.f) continue;
        const [xa, xb] = [Math.min(h.x1, h.x2), Math.max(h.x1, h.x2)];
        const [ya, yb] = [Math.min(v.y1, v.y2), Math.max(v.y1, v.y2)];
        if (v.x1 > xa + 0.5 && v.x1 < xb - 0.5 && h.y1 > ya + 0.5 && h.y1 < yb - 0.5) croisements.push({ h: h.f, v: v.f, x: v.x1, y: h.y1 });
      }
    // Chevauchements : deux traits horizontaux à la même hauteur qui se recouvrent.
    let chevauchements = 0;
    for (let i = 0; i < H.length; i++)
      for (let j = i + 1; j < H.length; j++) {
        const [a, b] = [H[i], H[j]];
        if (a.f === b.f || Math.abs(a.y1 - b.y1) > 0.5) continue;
        const l = Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2)) - Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2));
        if (l > 1) chevauchements++;
      }
    // Règle 4 : sur chaque ligne et de chaque côté de Moi, un parent plus éloigné placé plus près de Moi.
    const deg = degres(g);
    const xMoi = pos.get(g.moi).x;
    let inversions = 0,
      paires = 0;
    const exemples = [];
    const parLigne = new Map();
    for (const [id, p] of pos) if (!fantomes.has(id) && deg.has(vrai(id))) pousser(parLigne, p.r, id);
    for (const [r, ids] of parLigne)
      for (const cote of [-1, 1]) {
        const c = ids.filter((id) => Math.sign(pos.get(id).x - xMoi) === cote).sort((u, v) => Math.abs(pos.get(u).x - xMoi) - Math.abs(pos.get(v).x - xMoi));
        for (let i = 0; i < c.length; i++)
          for (let j = i + 1; j < c.length; j++) {
            const [di, dj] = [deg.get(vrai(c[i])), deg.get(vrai(c[j]))];
            if (di === dj) continue;
            paires++;
            if (di > dj) {
              inversions++;
              if (r === 0 && exemples.length < 400) exemples.push([c[i], c[j]]);
            }
          }
      }
    return { R1, croisements, chevauchements, inversions, paires, exemples, deg };
  }

  /** Degré de parenté avec Moi (montées + descentes jusqu'à l'ancêtre commun) ; conjoint : celui du partenaire + 0,5. */
  function degres(g) {
    const haut = new Map([[g.moi, 0]]);
    for (const x of haut.keys()) for (const p of g.parents(x)) if (!haut.has(p) && !g.P.get(p)?.inconnu) haut.set(p, haut.get(x) + 1);
    const deg = new Map();
    for (const [a, h] of haut) {
      const bas = new Map([[a, 0]]);
      for (const x of bas.keys()) for (const e of g.enfants(x)) if (!bas.has(e)) bas.set(e, bas.get(x) + 1);
      for (const [x, b] of bas) if (!deg.has(x) || deg.get(x) > h + b) deg.set(x, h + b);
    }
    // Frères et sœurs par un parent inconnu : passer aussi par les parents « ? ».
    for (const id of g.dans)
      if (!deg.has(id) && !g.P.get(id)?.inconnu) {
        const ds = g
          .conjoints(id)
          .map((q) => deg.get(q))
          .filter((v) => v !== undefined);
        if (ds.length) deg.set(id, Math.min(...ds) + 0.5);
      }
    return deg;
  }

  const api = { graphe, disposerA, disposerA2, vrai, disposerB, disposerBranche, disposerAncetres, brancheDe, traits, controles, degres, annee };
  if (typeof module !== 'undefined') module.exports = api;
  else racine.Disposition = api;
})(this);
