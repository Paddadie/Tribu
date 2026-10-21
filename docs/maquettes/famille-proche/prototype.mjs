// Prototype de mise en page du dessin « Famille proche », pour les maquettes seulement (Node, hors code de l'appli).
// famille(d, centre, moi) : qui dessiner (regroupé par couple) ; disposer(fam, strategie, budget) : où ;
// rendu(dispo) : HTML statique (nœuds en HTML, traits en SVG), au style de la fiche.
// Stratégies : S1 « une rangée par génération » (défilement du cadre au-delà du budget),
// S2 « rangées repliées » (fratrie et enfants sur plusieurs lignes ; défilement seulement si la rangée des parents
// déborde), S3 « tronc et branches » (les autres couples des parents descendent en branches ; jamais de défilement).

const BOITE = 57; // largeur d'un nœud (le nom passe sur 2 lignes au plus)
const BOITE_ICI = 76;
const ECART = 2; // entre deux nœuds voisins : 59 px d'un centre à l'autre
const ECART_COUPLE = 15; // entre deux partenaires : le trait de descente passe entre leurs noms
const ECART_GROUPE = 8; // entre deux groupes de frères et sœurs ou d'enfants
const R = 19;
const RG = 26;
const CHASSE = 6.1; // largeur moyenne d'un caractère (Figtree 12 px demi-gras)
const CHASSE_ICI = 7.1; // 14 px
const GOUTTIERE = 12; // couloir des rails (S3)

const annee = (s) => /^\d{4}/.exec(s ?? '')?.[0] ?? '';
const cleAge = (p) => (annee(p?.naissance) ? p.naissance : '9999');

/** Qui dessiner, regroupé par couple. Les frères et sœurs sont regroupés par couple de parents (jeu de parents). */
export function famille(d, centre, moi) {
  const P = new Map(d.personnes.map((p) => [p.id, p]));
  const visible = (id) => P.has(id) && !P.get(id).inconnu;
  const parentsDe = (id) => d.filiations.filter((f) => f.enfant === id && visible(f.parent)).map((f) => ({ id: f.parent, adoptif: f.type === 'adoptif' }));
  const enfantsDe = (id) => d.filiations.filter((f) => f.parent === id && visible(f.enfant)).map((f) => ({ id: f.enfant, adoptif: f.type === 'adoptif' }));
  const statut = (a, b) => d.unions.find((u) => (u.personneA === a && u.personneB === b) || (u.personneA === b && u.personneB === a))?.statut ?? null;
  const parAge = (a, b) => cleAge(P.get(a.id)).localeCompare(cleAge(P.get(b.id)));

  const pc = parentsDe(centre);
  const ids = new Set(pc.map((p) => p.id));
  const couples = [];
  for (const adoptif of [false, true]) {
    const membres = pc.filter((p) => p.adoptif === adoptif).map((p) => p.id);
    if (!membres.length) continue;
    const autreEnregistre = d.filiations.some((f) => f.enfant === centre && (f.type === 'adoptif') === adoptif && !membres.includes(f.parent));
    couples.push({ membres, adoptif, statut: membres.length === 2 ? statut(membres[0], membres[1]) : null, manque: !adoptif && membres.length === 1 && !autreEnregistre });
  }

  const freres = [];
  const autres = new Map();
  const vus = new Set([centre]);
  for (const p of pc)
    for (const e of enfantsDe(p.id)) {
      if (vus.has(e.id)) continue;
      vus.add(e.id);
      const ps = parentsDe(e.id);
      const psIds = new Set(ps.map((x) => x.id));
      const k = couples.findIndex((K) => K.membres.every((m) => psIds.has(m)) && (K.membres.length === 2 || ps.every((x) => ids.has(x.id))));
      if (k >= 0) {
        freres.push({ id: e.id, couple: k, adoptif: ps.find((x) => x.id === couples[k].membres[0]).adoptif });
        continue;
      }
      const commun = ps.find((x) => ids.has(x.id));
      const autre = ps.find((x) => !ids.has(x.id));
      const cle = `${commun.id}|${autre?.id ?? ''}`;
      if (!autres.has(cle)) autres.set(cle, { parent: commun.id, autre: autre?.id ?? null, statut: autre ? statut(commun.id, autre.id) : null, enfants: [] });
      autres.get(cle).enfants.push({ id: e.id, adoptif: commun.adoptif });
    }
  freres.sort(parAge);
  const autresCouples = [...autres.values()];
  for (const a of autresCouples) a.enfants.sort(parAge);
  // Le plus récent (enfants les plus jeunes, ou union actuelle) le plus près du parent.
  autresCouples.sort((a, b) => (b.statut === 'actuelle') - (a.statut === 'actuelle') || cleAge(P.get(b.enfants[0].id)).localeCompare(cleAge(P.get(a.enfants[0].id))));

  const enfants = enfantsDe(centre)
    .map((e) => ({ id: e.id, autre: parentsDe(e.id).find((x) => x.id !== centre)?.id ?? null, adoptif: e.adoptif }))
    .sort(parAge);
  const u = d.unions.find((x) => x.statut === 'actuelle' && (x.personneA === centre || x.personneB === centre));
  const conjoint = u ? (u.personneA === centre ? u.personneB : u.personneA) : null;
  const partenaires = [];
  for (const e of enfants) if (e.autre && e.autre !== conjoint && !partenaires.some((x) => x.id === e.autre)) partenaires.push({ id: e.autre, statut: statut(centre, e.autre) });
  partenaires.reverse(); // le plus récent d'abord
  return { P, centre, moi, couples, freres, autresCouples, conjoint: conjoint && visible(conjoint) ? { id: conjoint, statut: 'actuelle' } : null, partenaires, enfants };
}

// --- Nœuds ---

function lignesNom(texte, larg, chasse) {
  const morceaux = texte.split(/(?<=[-\s])/);
  const lignes = [];
  for (const m of morceaux) {
    const der = lignes.length - 1;
    if (der >= 0 && (lignes[der] + m).trim().length * chasse <= larg) lignes[der] += m;
    else lignes.push(m);
  }
  const max = Math.floor(larg / chasse);
  const coupe = (s) => (s.trim().length > max ? s.trim().slice(0, max - 1) + '…' : s.trim());
  if (lignes.length > 2) return [coupe(lignes[0]), coupe(lignes.slice(1).join('')).replace(/…?$/, '…')];
  return lignes.map(coupe);
}

function creerNoeud(fam, id) {
  if (id === '+parent') return { id, manque: true, lignes: ['Parent'], an: '' };
  const p = fam.P.get(id);
  const ici = id === fam.centre;
  const toi = id === fam.moi;
  const nais = annee(p.naissance);
  const dec = p.deces ? annee(p.deces) || '?' : p.decede ? '?' : '';
  const an = dec ? `${nais}–${dec}` : nais;
  return {
    id,
    p,
    ici,
    toi,
    sansNom: !!p.sansNom,
    decede: !!(p.deces || p.decede),
    lignes: p.sansNom ? [] : toi ? ['Toi'] : lignesNom(p.prenom, ici ? BOITE_ICI : BOITE, ici ? CHASSE_ICI : CHASSE),
    an: p.sansNom ? '' : an,
  };
}
/** Largeur du nœud : celle du nom, ou celle des années si elles sont plus longues (« 1962–2005 »). */
const boite = (n) => Math.max(n.ici ? BOITE_ICI : BOITE, Math.ceil(n.an.length * 7.6));
const rayon = (n) => (n.ici ? RG : R);
/** Bas du nœud (sous les années), depuis le centre de l'avatar. */
const bas = (n) => rayon(n) + 4 + n.lignes.length * (n.ici || n.toi ? 18 : 16) + (n.an ? 10 : 0);
const dist = (a, b, couple) => (boite(a) + boite(b)) / 2 + (couple ? ECART_COUPLE : ECART);

// --- Placement d'une ligne : blocs contigus attirés vers leur ancre (moindres carrés, sans chevauchement) ---

function offsets(bloc, N) {
  const o = [0];
  for (let i = 1; i < bloc.ids.length; i++) o.push(o[i - 1] + dist(N.get(bloc.ids[i - 1]), N.get(bloc.ids[i]), bloc.couples?.has(i)));
  return o;
}

function placerLigne(blocs, N) {
  const infos = blocs.map((b) => {
    const o = offsets(b, N);
    const refs = b.refs?.length ? b.refs : [0];
    const ref = refs.reduce((s, i) => s + o[i], 0) / refs.length;
    return { o, larg: o.at(-1), voulu: b.ancre - ref };
  });
  const ecart = (i) => dist(N.get(blocs[i - 1].ids.at(-1)), N.get(blocs[i].ids[0]), false) + ECART_GROUPE;
  const grappes = [];
  infos.forEach((info, i) => {
    let g = { debut: i, somme: info.voulu, n: 1, dec: [0], larg: info.larg };
    while (grappes.length) {
      const p = grappes.at(-1);
      const off = p.larg + ecart(g.debut);
      if (g.somme / g.n >= p.somme / p.n + off) break;
      p.somme += g.somme - g.n * off;
      p.n += g.n;
      p.dec.push(...g.dec.map((x) => x + off));
      p.larg = off + g.larg;
      grappes.pop();
      g = p;
    }
    grappes.push(g);
  });
  for (const g of grappes) {
    const x0 = g.somme / g.n;
    g.dec.forEach((dx, k) => {
      const b = blocs[g.debut + k];
      infos[g.debut + k].o.forEach((o, j) => (N.get(b.ids[j]).x = x0 + dx + o));
    });
  }
}

/** Ouvre un couloir de 10 px dans une ligne pour chaque descente qui la traverse : chaque nœud gêné part du côté
 * de son centre, avec ses voisins (coût d'au plus une demi-boîte par couloir). */
const COULOIR = 34; // réserve de largeur par couloir quand une rangée se replie
function libererCouloirs(ids, couloirs, N) {
  const ns = ids.map((id) => N.get(id)).sort((a, b) => a.x - b.x);
  for (const c of couloirs)
    for (let essai = 0; essai < 3; essai++) {
      const k = ns.findIndex((x) => x.x + boite(x) / 2 > c - 5 && x.x - boite(x) / 2 < c + 5);
      if (k < 0) break;
      const m = ns[k];
      if (m.x < c) {
        const l = m.x + boite(m) / 2 - (c - 5);
        ns.slice(0, k + 1).forEach((x) => (x.x -= l));
      } else {
        const r = c + 5 - (m.x - boite(m) / 2);
        ns.slice(k).forEach((x) => (x.x += r));
      }
    }
}

const largeurLigne = (blocs, N) => {
  let l = 0;
  blocs.forEach((b, i) => {
    l += offsets(b, N).at(-1) + (i ? dist(N.get(blocs[i - 1].ids.at(-1)), N.get(b.ids[0]), false) + ECART_GROUPE : 0);
  });
  return l + (boite(N.get(blocs[0].ids[0])) + boite(N.get(blocs.at(-1).ids.at(-1)))) / 2;
};

/** Répartit les blocs sur des lignes d'au plus `budget` px ; un bloc trop long est coupé (le cœur reste entier). */
function replier(blocs, budget, N) {
  const morceaux = [];
  for (const b of blocs) {
    if (largeurLigne([b], N) <= budget) {
      morceaux.push(b);
      continue;
    }
    // Le cœur (conjoint, personne, ex) reste entier ; le reste part en tronçons.
    const coeur = b.coeur ?? 0;
    let i = 0;
    const tete = b.ids.slice(0, coeur);
    let courant = { ...b, ids: [...tete], refs: b.refs.filter((r) => r < coeur), couples: b.couples };
    for (i = coeur; i < b.ids.length; i++) {
      const essai = { ...courant, ids: [...courant.ids, b.ids[i]] };
      if (courant.ids.length && largeurLigne([essai], N) > budget) {
        morceaux.push(courant);
        courant = { ...b, ids: [], refs: [], couples: new Set(), coeur: undefined };
      }
      courant.refs = [...courant.refs, courant.ids.length];
      courant.ids.push(b.ids[i]);
    }
    morceaux.push(courant);
  }
  const lignes = [[]];
  for (const m of morceaux) {
    const l = lignes.at(-1);
    if (l.length && largeurLigne([...l, m], N) > budget) lignes.push([m]);
    else l.push(m);
  }
  return lignes;
}

// --- Disposition ---

export function disposer(fam, strategie, budget) {
  const N = new Map();
  const n = (id) => {
    if (!N.has(id)) N.set(id, creerNoeud(fam, id));
    return N.get(id);
  };
  const S3 = strategie === 'S3';
  const traits = [];
  const trait = (d, style = '', passant = false) => traits.push({ d, style, passant });
  const styleUnion = (s) => (s === 'actuelle' ? '' : s === 'separee' ? 'pointille' : 'libre');

  // Rangée des parents : une chaîne par couple de parents.
  const autresDe = (p) => fam.autresCouples.filter((a) => a.parent === p);
  const chaines = fam.couples.map((K, k) => {
    const [a, b] = K.membres;
    const second = b ?? (K.manque ? '+parent' : null);
    let gauche = S3 ? [] : autresDe(a);
    let droite = S3 || !b ? [] : autresDe(b);
    if (!second && !S3) [gauche, droite] = [[], gauche];
    const avecNoeud = (l) => l.filter((x) => x.autre);
    const ids = [...avecNoeud(gauche).map((x) => x.autre).reverse(), a, ...(second ? [second] : []), ...avecNoeud(droite).map((x) => x.autre)];
    const couples = new Set();
    const ia = ids.indexOf(a);
    if (ia > 0) couples.add(ia);
    if (second) couples.add(ia + 1);
    const ib = second ? ia + 1 : ia;
    if (ib < ids.length - 1) couples.add(ib + 1);
    return { K, k, ids, couples, gauche, droite, a, second, refs: second ? [ia, ia + 1] : [ia] };
  });
  for (const c of chaines) c.ids.forEach(n);

  const y0 = S3 && fam.autresCouples.length ? 46 : 30;
  for (const c of chaines) for (const id of c.ids) n(id).y = y0;

  // Rangée de la personne.
  const ici = fam.centre;
  n(ici);
  const gaucheP = fam.conjoint ?? fam.partenaires[0] ?? null;
  const droiteP = fam.partenaires.filter((p) => p !== gaucheP);
  const coeurIds = [...(gaucheP ? [gaucheP.id] : []), ici, ...droiteP.map((p) => p.id)];
  coeurIds.forEach(n);
  const blocsG1 = [];
  const demisBloc = (ac) => ({ ids: ac.enfants.map((e) => e.id), refs: ac.enfants.map((_, i) => i), groupe: ac });
  for (const c of chaines) {
    if (!S3) for (const ac of [...c.gauche].reverse()) blocsG1.push(demisBloc(ac));
    const freres = fam.freres.filter((f) => f.couple === c.k).map((f) => f.id);
    if (c.k === 0) {
      const ids = [...coeurIds, ...freres];
      const iIci = coeurIds.indexOf(ici);
      const couples = new Set();
      if (gaucheP) couples.add(1);
      if (droiteP.length) couples.add(iIci + 1);
      blocsG1.push({ ids, refs: [iIci, ...freres.map((_, i) => coeurIds.length + i)], couples, coeur: coeurIds.length, principal: true });
    } else if (freres.length) blocsG1.push({ ids: freres, refs: freres.map((_, i) => i), couple: c.k });
    if (!S3) for (const ac of c.droite) blocsG1.push(demisBloc(ac));
  }
  if (!fam.couples.length) {
    const couples = new Set();
    if (gaucheP) couples.add(1);
    if (droiteP.length) couples.add(coeurIds.indexOf(ici) + 1);
    blocsG1.push({ ids: coeurIds, refs: [coeurIds.indexOf(ici)], couples, coeur: coeurIds.length, principal: true });
  }
  for (const b of blocsG1) b.ids.forEach(n);

  // Jonctions de la rangée des parents (calculées après placement).
  const jonctionsG0 = () => {
    const j = new Map();
    for (const c of chaines) {
      const A = n(c.a);
      j.set(`couple${c.k}`, c.second ? { x: (A.x + n(c.second).x) / 2, y: y0, union: true } : { x: A.x, y: y0 + bas(A) + 2 });
      for (const ac of fam.autresCouples.filter((x) => x.parent === c.a || x.parent === c.K.membres[1])) {
        if (S3) continue;
        const Pa = n(ac.parent);
        if (!ac.autre) j.set(ac, { x: Pa.x, y: y0 + bas(Pa) + 2 });
        else j.set(ac, { x: (Pa.x + n(ac.autre).x) / 2, y: y0, union: true });
      }
    }
    return j;
  };
  const ancreG1 = (b, j) => {
    if (b.groupe) return j.get(b.groupe)?.x ?? 0;
    if (b.principal) return fam.couples.length ? j.get('couple0').x : 0;
    return j.get(`couple${b.couple}`).x;
  };

  // 1. Parents serrés autour de 0, 2. enfants sous leurs jonctions, 3. parents recentrés au-dessus, 4. enfants.
  for (const c of chaines) c.ancre = 0;
  const placerG0 = () =>
    placerLigne(
      chaines.map((c) => ({ ids: c.ids, couples: c.couples, refs: c.refs, ancre: c.ancre })),
      N,
    );
  placerG0();
  let j0 = jonctionsG0();
  for (const b of blocsG1) b.ancre = ancreG1(b, j0);
  placerLigne(blocsG1, N);
  for (const c of chaines) {
    const enfantsX = [...blocsG1.filter((b) => (b.principal && c.k === 0) || b.couple === c.k).flatMap((b) => b.refs.map((r) => n(b.ids[r]).x))];
    if (c.k > 0) enfantsX.push(n(ici).x);
    c.ancre = enfantsX.length ? enfantsX.reduce((s, x) => s + x, 0) / enfantsX.length : 0;
  }
  placerG0();
  j0 = jonctionsG0();
  for (const b of blocsG1) b.ancre = ancreG1(b, j0);

  // Lignes de la génération de la personne (repliées en S2/S3 si trop larges).
  const largeurG0 = chaines.length ? largeurLigne(chaines.map((c) => ({ ids: c.ids, couples: c.couples })), N) : 0;
  const plat = strategie === 'S1' || (strategie === 'S2' && largeurG0 > budget - 2 * (S3 ? GOUTTIERE : 0));
  const budgetLigne = budget - (S3 ? 2 * GOUTTIERE : 0);
  const lignesDe = (blocs) => {
    if (plat || largeurLigne(blocs, N) <= budgetLigne) return [blocs];
    // Les lignes du haut laissent passer les descentes des suivantes : on leur réserve la place d'un couloir.
    const l = replier(blocs, budgetLigne, N);
    return replier(blocs, budgetLigne - COULOIR * (l.length - 1), N);
  };
  let lignesG1 = lignesDe(blocsG1);
  // La ligne de la personne passe en dernier.
  const iP = lignesG1.findIndex((l) => l.some((b) => b.principal));
  if (iP >= 0 && iP < lignesG1.length - 1) lignesG1 = [...lignesG1.filter((_, i) => i !== iP), lignesG1[iP]];

  // Hauteurs et placement des lignes, avec couloirs pour les descentes qui traversent.
  const hautLigne = (ids) => Math.max(...ids.map((id) => bas(n(id))));
  const rayonLigne = (ids) => Math.max(...ids.map((id) => rayon(n(id))));
  let yCourant = y0 + Math.max(0, ...chaines.flatMap((c) => c.ids.map((id) => bas(n(id)))));
  const voies0 = chaines.reduce((s, c) => s + Math.max(0, c.ids.length - 1 - c.couples.size), 0) + fam.couples.filter((K) => K.statut === null && K.membres.length === 2).length * 0;
  yCourant += voies0 * 8;
  const placerLignes = (lignes, ancres) => {
    const res = [];
    lignes.forEach((l, i) => {
      const ids = l.flatMap((b) => b.ids);
      const y = yCourant + 30 + rayonLigne(ids);
      ids.forEach((id) => (n(id).y = y));
      const blocs = l.map((b) => ({ ...b, ancre: ancres(b) }));
      placerLigne(blocs, N);
      const couloirs = lignes
        .slice(i + 1)
        .flat()
        .map((b) => ancres(b));
      libererCouloirs(ids, couloirs, N);
      res.push({ blocs: l, y, ids });
      yCourant = y + hautLigne(ids);
    });
    return res;
  };
  // Hors S1, chaque ligne repliée est ramenée dans le cadre (centré sur la rangée des parents) :
  // elle s'écarte un peu de son couple plutôt que de faire déborder le dessin.
  const ids0 = chaines.flatMap((c) => c.ids);
  const centre = ids0.length
    ? (Math.min(...ids0.map((id) => n(id).x - boite(n(id)) / 2)) + Math.max(...ids0.map((id) => n(id).x + boite(n(id)) / 2))) / 2
    : null;
  const cadrer = (lignes) => {
    if (plat) return;
    for (const l of lignes) {
      const ns = l.ids.map(n);
      const g = Math.min(...ns.map((x) => x.x - boite(x) / 2));
      const d = Math.max(...ns.map((x) => x.x + boite(x) / 2));
      const c = centre ?? (g + d) / 2;
      const [gW, dW] = [c - budgetLigne / 2, c + budgetLigne / 2];
      if (d - g > budgetLigne) continue;
      const dx = g < gW ? gW - g : d > dW ? dW - d : 0;
      ns.forEach((x) => (x.x += dx));
    }
  };
  const lg1 = placerLignes(lignesG1, (b) => b.ancre);
  cadrer(lg1);
  const lignePrincipale = lg1.find((l) => l.blocs.some((b) => b.principal)) ?? lg1.at(-1);

  // Partenaires de la personne : jonctions.
  const I = n(ici);
  const voiesG1 = [];
  const jonctionsG1 = new Map();
  if (gaucheP) {
    const G = n(gaucheP.id);
    jonctionsG1.set(gaucheP.id, { x: (G.x + I.x) / 2, y: I.y, union: true, statut: gaucheP.statut, a: G, b: I });
  }
  droiteP.forEach((p, i) => {
    const D = n(p.id);
    if (i === 0) jonctionsG1.set(p.id, { x: (I.x + D.x) / 2, y: I.y, union: true, statut: p.statut, a: I, b: D });
    else voiesG1.push(p);
  });
  if (voiesG1.length) yCourant += voiesG1.length * 8;
  voiesG1.forEach((p, i) => {
    const D = n(p.id);
    const yv = I.y + Math.max(bas(I), bas(D)) + 6 + i * 8;
    jonctionsG1.set(p.id, { x: (I.x + D.x) / 2, y: yv, voie: true, statut: p.statut, a: I, b: D });
  });
  jonctionsG1.set(null, { x: I.x, y: I.y + bas(I) + 2 });

  // Enfants de la personne, par couple.
  const ordre = [gaucheP?.id ?? '§', null, ...droiteP.map((p) => p.id)];
  const groupesEnfants = ordre
    .map((autre) => fam.enfants.filter((e) => e.autre === autre || (autre === null && e.autre && !N.has(e.autre))))
    .map((es, i) => ({ es, autre: ordre[i] }))
    .filter((g) => g.es.length);
  const blocsG2 = groupesEnfants.map((g) => ({ ids: g.es.map((e) => e.id), refs: g.es.map((_, i) => i), autre: g.autre, es: g.es }));
  blocsG2.forEach((b) => b.ids.forEach(n));
  const ancreG2 = (b) => jonctionsG1.get(b.autre)?.x ?? I.x;
  const lg2 = blocsG2.length ? placerLignes(lignesDe(blocsG2), ancreG2) : [];
  cadrer(lg2);

  // Branches (S3) : chaque autre couple d'un parent, sous le tronc, relié au parent par un rail sur la marge.
  const branches = [];
  if (S3)
    for (const ac of fam.autresCouples) {
      const c = chaines.find((x) => x.K.membres.includes(ac.parent));
      const cote = c && c.a === ac.parent && c.second ? -1 : 1;
      branches.push({ ac, cote });
    }

  // Recentrage horizontal.
  const tous = [...N.values()];
  const gMin = Math.min(...tous.map((x) => x.x - boite(x) / 2));
  const dMax = Math.max(...tous.map((x) => x.x + boite(x) / 2));
  let largeur = dMax - gMin;
  let dx = -gMin;
  if (largeur < budget) {
    dx += (budget - largeur) / 2;
    largeur = budget;
  }
  if (S3) largeur = budget;
  for (const x of tous) x.x += dx;
  for (const m of [j0, jonctionsG1]) for (const v of m.values()) v.x += dx;

  // Branches : placées après le recentrage (le cadre est connu).
  if (S3) {
    const rails = { [-1]: GOUTTIERE / 2, 1: largeur - GOUTTIERE / 2 };
    const railsParent = new Map();
    let y = yCourant + 26;
    const parCote = { [-1]: branches.filter((b) => b.cote < 0), 1: branches.filter((b) => b.cote > 0) };
    // Une branche de chaque côté par étage quand elles tiennent ensemble.
    const etages = [];
    const g = [...parCote[-1]];
    const dr = [...parCote[1]];
    const largeurBranche = (b) => GOUTTIERE / 2 + 10 + Math.max(b.ac.autre ? 72 : 0, b.ac.enfants.length * (BOITE + ECART));
    while (g.length || dr.length) {
      const e = [];
      if (g.length) e.push(g.shift());
      if (dr.length && (!e.length || largeurBranche(e[0]) + largeurBranche(dr[0]) <= largeur)) e.push(dr.shift());
      etages.push(e);
    }
    for (const etage of etages) {
      let yFin = y;
      for (const b of etage) {
        const rx = rails[b.cote];
        const s = -b.cote; // vers l'intérieur du cadre
        const yU = y + R;
        let jx;
        if (b.ac.autre) {
          const A = n(b.ac.autre);
          A.x = rx + s * (14 + 58);
          A.y = yU;
          jx = rx + s * 22;
          trait(`M${rx} ${yU}H${A.x - s * (R + 4)}`, styleUnion(b.ac.statut));
        } else jx = rx;
        const yE = yU + (b.ac.autre ? bas(n(b.ac.autre)) : 0) + 30 + R;
        const parLigne = Math.max(1, Math.floor((largeur - GOUTTIERE - 4) / (BOITE + ECART)));
        let yL = yE;
        const lignesE = [];
        for (let i = 0; i < b.ac.enfants.length; i += parLigne) lignesE.push(b.ac.enfants.slice(i, i + parLigne));
        lignesE.forEach((ligne, k) => {
          ligne.forEach((e, i) => {
            const E = n(e.id);
            E.x = rx + s * (GOUTTIERE / 2 + 8 + BOITE / 2 + i * (BOITE + ECART));
            E.y = yL;
          });
          const xs = ligne.map((e) => n(e.id).x);
          const yb = yL - R - 12;
          trait(`M${jx} ${k ? yb - 30 - 8 : b.ac.autre ? yU : yU}V${yb}`, '', k > 0);
          trait(`M${Math.min(jx, ...xs)} ${yb}H${Math.max(jx, ...xs)}`);
          ligne.forEach((e) => trait(`M${n(e.id).x} ${yb}V${yL - R - 4}`, e.adoptif ? 'pointille' : ''));
          yFin = Math.max(yFin, yL + bas(n(ligne[0].id)));
          if (k < lignesE.length - 1) yL += bas(n(ligne[0].id)) + 30 + R + 8;
        });
        const cle = b.ac.parent;
        railsParent.set(cle, { rx, s, yFin: Math.max(railsParent.get(cle)?.yFin ?? 0, b.ac.autre ? yU : yE - R - 12) });
      }
      y = yFin + 30;
    }
    yCourant = y - 30;
    for (const [parent, r] of railsParent) {
      const Pa = n(parent);
      const yh = Pa.y - R - 12;
      trait(`M${Pa.x} ${Pa.y - R - 4}V${yh}H${r.rx}V${r.yFin}`, '', true);
    }
  }

  // --- Traits ---
  // Deux barres qui se chevauchent au même niveau passent l'une au-dessus de l'autre (sinon les groupes se confondent).
  const barres = [];
  const descente = (x, yDe, versIds, yLigne, rL, depuisSous = false) => {
    const xs = versIds.map((e) => n(e.id ?? e).x);
    const g = Math.min(x, ...xs);
    const d = Math.max(x, ...xs);
    let yb = yLigne - rL - 14;
    while (barres.some((b) => Math.abs(b.y - yb) < 4 && g < b.d + 8 && d > b.g - 8)) yb -= 9;
    barres.push({ y: yb, g, d });
    trait(`M${x} ${yDe}V${yb}`, '', depuisSous);
    if (xs.length) trait(`M${Math.min(x, ...xs)} ${yb}H${Math.max(x, ...xs)}`);
    for (const e of versIds) {
      const E = n(e.id ?? e);
      trait(`M${E.x} ${yb}V${E.y - rayon(E) - 4}`, e.adoptif ? 'pointille' : '');
    }
  };
  const union = (A, B, statut) => {
    const [g, d] = A.x < B.x ? [A, B] : [B, A];
    if (statut === null) {
      const jx = (g.x + d.x) / 2;
      trait(`M${g.x + rayon(g) + 3} ${g.y}L${jx} ${g.y + R + 4}L${d.x - rayon(d) - 3} ${d.y}`, 'libre');
    } else trait(`M${g.x + rayon(g) + 4} ${g.y}H${d.x - rayon(d) - 4}`, styleUnion(statut));
  };
  const voie = (A, B, yv, statut) => {
    trait(`M${A.x} ${A.y + bas(A) + 2}V${yv}`);
    trait(`M${B.x} ${B.y + bas(B) + 2}V${yv}`);
    trait(`M${Math.min(A.x, B.x)} ${yv}H${Math.max(A.x, B.x)}`, `${styleUnion(statut)} voie`);
  };

  // Parents.
  for (const c of chaines) {
    const A = n(c.a);
    if (c.second) union(A, n(c.second), c.second === '+parent' ? 'separee' : c.K.statut);
    let voieI = 0;
    for (const [cote, liste] of [
      [c.gauche, -1],
      [c.droite, 1],
    ].map(([l, s]) => [s, l])) {
      liste
        .filter((x) => x.autre)
        .forEach((ac, i) => {
          const Pa = n(ac.parent);
          const X = n(ac.autre);
          if (i === 0) union(Pa, X, ac.statut);
          else {
            const yv = y0 + Math.max(bas(Pa), bas(X)) + 6 + voieI++ * 8;
            voie(Pa, X, yv, ac.statut);
            j0.set(ac, { x: (Pa.x + X.x) / 2, y: yv });
          }
        });
      void cote;
    }
  }
  // Fratrie et demis.
  for (const l of lg1) {
    const rL = rayonLigne(l.ids);
    for (const b of l.blocs) {
      const cible = b.ids.map((id, i) => ({ id, i })).filter(({ i }) => b.refs.includes(i));
      if (!cible.length) continue;
      const adoptif = (id) => fam.freres.find((f) => f.id === id)?.adoptif || b.groupe?.enfants.find((e) => e.id === id)?.adoptif || (id === ici && fam.couples[0]?.adoptif);
      const j = b.groupe ? j0.get(b.groupe) : fam.couples.length ? j0.get(`couple${b.principal ? 0 : b.couple}`) : null;
      if (!j) continue;
      descente(
        j.x,
        j.y,
        cible.map(({ id }) => ({ id, adoptif: adoptif(id) })),
        l.y,
        rL,
        l !== lg1[0],
      );
    }
  }
  // La personne pend aussi de son couple adoptif.
  fam.couples.forEach((K, k) => {
    if (k === 0) return;
    const j = j0.get(`couple${k}`);
    const g = Math.min(j.x, I.x);
    const d = Math.max(j.x, I.x);
    // Sous les barres déjà tracées (au-dessus, il couperait les années des parents).
    let yb = I.y - RG - 23;
    while (yb < I.y - RG - 8 && barres.some((b) => Math.abs(b.y - yb) < 4 && g < b.d + 8 && d > b.g - 8)) yb += 5;
    barres.push({ y: yb, g, d });
    trait(`M${j.x} ${j.y}V${yb}H${I.x}V${I.y - RG - 4}`, 'pointille');
  });
  // Partenaires de la personne.
  for (const [cle, j] of jonctionsG1) {
    if (cle === null) continue;
    if (j.voie) voie(j.a, j.b, j.y, j.statut);
    else union(j.a, j.b, j.statut);
  }
  for (const l of lg2) {
    const rL = rayonLigne(l.ids);
    for (const b of l.blocs) {
      const j = jonctionsG1.get(b.autre) ?? jonctionsG1.get(null);
      descente(j.x, j.y, b.es.filter((e) => b.ids.includes(e.id)), l.y, rL, l !== lg2[0]);
    }
  }

  const hauteur = yCourant + 12;
  return {
    strategie,
    budget,
    noeuds: [...N.values()],
    traits,
    largeur: Math.ceil(largeur),
    hauteur: Math.ceil(hauteur),
    defile: largeur > budget + 1,
    lignes: { g1: lg1.length, g2: lg2.length },
  };
}

// --- Rendu HTML ---

const echap = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const teinte = (nom) => [...(nom || '?')].reduce((s, c) => s + c.charCodeAt(0), 0) % 10;

export function rendu(dispo) {
  const svg = dispo.traits
    .slice()
    .sort((a, b) => a.passant - b.passant)
    .flatMap((t) => {
      const cls = `trait ${t.style}`.trim();
      const halo = t.passant || t.style.includes('voie') ? [`<path class="halo" d="${t.d}"/>`] : [];
      return [...halo, `<path class="${cls}" d="${t.d}"/>`];
    })
    .join('');
  const noeuds = dispo.noeuds
    .map((n) => {
      const b = boite(n);
      const r = rayon(n);
      const cls = ['noeud', n.ici && 'ici', n.decede && 'decede', n.manque && 'manque', n.sansNom && 'sans-nom'].filter(Boolean).join(' ');
      const p = n.p;
      const titre = n.manque ? 'Ajouter un parent' : n.sansNom ? 'Parent sans nom' : `${p.prenom} ${p.nom}${n.an ? ` (${n.an})` : ''}${n.decede ? ', décédé(e)' : ''}`;
      const initiales = n.manque ? '+' : n.sansNom ? '?' : `${p.prenom[0] ?? ''}${p.nom[0] ?? ''}`.toUpperCase();
      const fond = n.manque || n.sansNom ? '' : ` style="--c: var(--c${teinte(p.nom)})"`;
      const nom = n.lignes.length ? `<span class="nom${n.toi ? ' toi' : ''}">${n.lignes.map((l) => `<span>${echap(l)}</span>`).join('')}</span>` : '';
      const an = n.an ? `<span class="an">${echap(n.an)}</span>` : '';
      return `<a class="${cls}" title="${echap(titre)}" style="left:${(n.x - b / 2).toFixed(1)}px;top:${(n.y - r).toFixed(1)}px;width:${b}px"><span class="avatar"${fond}>${initiales}</span>${nom}${an}</a>`;
    })
    .join('');
  const ici = dispo.noeuds.find((n) => n.ici);
  return `<div class="cadre${dispo.defile ? ' defile' : ''}" data-ici="${ici ? ici.x.toFixed(0) : 0}"><div class="arbre" style="width:${dispo.largeur}px;height:${dispo.hauteur}px"><svg width="${dispo.largeur}" height="${dispo.hauteur}" aria-hidden="true">${svg}</svg>${noeuds}</div></div>`;
}

/** Feuille de style des maquettes (jetons de l'appli, clair et sombre). */
export const STYLE = `
:root{--fond:#f3f6f4;--encre:#1f2a27;--secondaire:#56635f;--accent:#2f6f5e;--accent-clair:#dcebe5;--pastille:#ebe8e3;--carte:#fff;--bord:#e1e8e4;--trait:#aebcb7;--trait-ex:#9aa4a0;
--c0:#8fcfb8;--c1:#f2b98a;--c2:#aab0f0;--c3:#f0a8c8;--c4:#8fc3ec;--c5:#f0a99c;--c6:#d6c16f;--c7:#b79de0;--c8:#9ed67f;--c9:#7fd0d6;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--fond:#121a17;--encre:#e6eeea;--secondaire:#9aaba5;--accent:#62bfa4;--accent-clair:#1f3b33;--pastille:#26302c;--carte:#1b2622;--bord:#2a3833;--trait:#4d605a;--trait-ex:#6f7c77;
--c0:#6fb89f;--c1:#dfa070;--c2:#8f96dd;--c3:#de8db0;--c4:#72a9d6;--c5:#de8e80;--c6:#bfa954;--c7:#9d85cc;--c8:#86bd68;--c9:#62b5bb;color-scheme:dark}}
:root[data-theme=dark]{--fond:#121a17;--encre:#e6eeea;--secondaire:#9aaba5;--accent:#62bfa4;--accent-clair:#1f3b33;--pastille:#26302c;--carte:#1b2622;--bord:#2a3833;--trait:#4d605a;--trait-ex:#6f7c77;
--c0:#6fb89f;--c1:#dfa070;--c2:#8f96dd;--c3:#de8db0;--c4:#72a9d6;--c5:#de8e80;--c6:#bfa954;--c7:#9d85cc;--c8:#86bd68;--c9:#62b5bb;color-scheme:dark}
.fp-carte{background:var(--carte);border:1px solid var(--bord);border-radius:20px;padding:16px;position:relative}
.fp-titre{font:600 14px/1 'Figtree',system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--secondaire);margin:0 0 10px}
.cadre{position:relative}
.cadre.defile{overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%)}
.cadre.defile::-webkit-scrollbar{display:none}
.indice{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:8px;font:12px/1.2 'Figtree',system-ui,sans-serif;color:var(--secondaire)}
.indice i{display:inline-block;width:28px;height:4px;border-radius:2px;background:var(--bord);position:relative;overflow:hidden}
.indice i b{position:absolute;top:0;bottom:0;background:var(--trait);border-radius:2px}
.arbre{position:relative;font-family:'Figtree',system-ui,sans-serif}
.arbre svg{position:absolute;inset:0;overflow:visible}
.trait{fill:none;stroke:var(--trait);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.trait.pointille{stroke-dasharray:3 4;stroke:var(--trait-ex)}
.trait.libre{stroke-dasharray:1 3.5;stroke:var(--trait-ex)}
.halo{fill:none;stroke:var(--carte);stroke-width:7;stroke-linecap:butt}
.noeud{position:absolute;display:flex;flex-direction:column;align-items:center;gap:4px;color:inherit;text-decoration:none;cursor:pointer}
.noeud .avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--c);color:#17201d;font:600 14px/1 'Figtree',system-ui,sans-serif;position:relative}
.noeud.ici .avatar{width:52px;height:52px;font-size:18px}
.noeud.decede .avatar{background:color-mix(in srgb,var(--c) 40%,var(--carte));color:color-mix(in srgb,#17201d 55%,var(--carte))}
.noeud.decede .avatar::after{content:'†';position:absolute;top:-6px;right:-5px;font-size:14px;color:var(--encre)}
.noeud.sans-nom .avatar{background:transparent;border:1.5px dashed var(--trait-ex);color:var(--secondaire);box-sizing:border-box}
.noeud.manque .avatar{background:transparent;border:1.5px dashed var(--accent);color:var(--accent);font-size:20px;font-weight:400;box-sizing:border-box}
.noeud .nom{display:flex;flex-direction:column;align-items:center;max-width:100%;font-size:12px;font-weight:600;line-height:16px;color:var(--encre);text-align:center}
.noeud .nom span{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.noeud.ici .nom{font-size:14px;line-height:18px}
.noeud .nom.toi{padding:0 8px;border-radius:999px;background:var(--pastille);line-height:18px;font-size:14px}
.noeud.manque .nom{color:var(--accent)}
.noeud .an{margin-top:-4px;font-size:12px;line-height:14px;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--secondaire)}
`;
