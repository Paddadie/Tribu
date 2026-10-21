// Dessin « Famille proche » de la fiche, sans DOM : qui dessiner (`familleProche`) et où (`disposerFoyer`).
// Stratégie « rangées repliées » (DECISIONS.md, 21/10/2026) : les parents, puis la rangée de la personne
// (frères, sœurs, demis, partenaires), puis ses enfants, chaque groupe sous son couple. Une fratrie ou des enfants
// trop nombreux passent sur une ligne de plus, sous le même couple (la descente traverse par un couloir). Le cadre
// ne défile que si une rangée insécable ne tient pas : les parents avec leurs autres partenaires, ou la personne
// avec les siens. Unités : pixels ; x, y = centre de l'avatar.

import { conjoint, fratrie, liensEnfants, liensParents, relation } from './deductions';
import { anneeDe, estDecede, estInconnu } from './modele';
import { estParentSansNom } from './parentSansNom';
import type { Donnees, Personne, StatutUnion } from './types';

/** Statut de l'union entre deux personnes ; `null` : aucune union enregistrée. */
type Statut = StatutUnion | null;

export interface CoupleParents {
  /** Parents dessinés (sans les parents inconnus) : un ou deux, aucun si seule la case « + Parent » est montrée. */
  membres: string[];
  /** Tous adoptifs : la descente vers la personne est en pointillé. */
  adoptif: boolean;
  statut: Statut;
  /** Case « + Parent » à côté (ou à la place) des membres. */
  manque: boolean;
}

export interface Rattache {
  id: string;
  adoptif: boolean;
}

/** Autre couple d'un parent (avec l'autre parent des demis, s'il est connu) et les demis qui en sont nés. */
export interface AutreCouple {
  parent: string;
  autre: string | null;
  statut: Statut;
  enfants: Rattache[];
}

export interface Partenaire {
  id: string;
  statut: Statut;
}

export interface FamilleProche {
  personnes: Map<string, Personne>;
  centre: string;
  moi?: string;
  /** Biologiques puis adoptifs quand il y a plus de deux parents ; sinon un seul couple. */
  couples: CoupleParents[];
  /** Frères et sœurs (`fratrie`), du plus âgé au plus jeune ; `couple` : indice du couple dont ils descendent. */
  freres: (Rattache & { couple: number })[];
  /** Le plus récent (union actuelle, puis enfants les plus jeunes) d'abord. */
  autresCouples: AutreCouple[];
  conjoint: Partenaire | null;
  /** Autres parents de ses enfants que le conjoint, le plus récent d'abord. */
  partenaires: Partenaire[];
  /** Du plus âgé au plus jeune ; `autre` : leur autre parent dessinable. */
  enfants: (Rattache & { autre: string | null })[];
}

/**
 * Qui dessiner. Pas le conjoint d'un parent sans enfant avec lui (il est sur la fiche du parent), ni les enfants
 * qu'un ex d'un parent a eus avec quelqu'un d'autre. `moi` absent : tout le monde compte comme de la famille
 * (case « + Parent » comprise).
 */
export function familleProche(d: Donnees, id: string, moi?: string): FamilleProche {
  const personnes = new Map(d.personnes.map((p) => [p.id, p]));
  const statut = (a: string, b: string): Statut =>
    d.unions.find((u) => (u.personneA === a && u.personneB === b) || (u.personneA === b && u.personneB === a))?.statut ?? null;
  const parentsDe = (x: string) => new Set(d.filiations.filter((f) => f.enfant === x).map((f) => f.parent));
  const typeDe = (parent: string, enfant: string) => d.filiations.some((f) => f.parent === parent && f.enfant === enfant && f.type === 'adoptif');

  const parents = liensParents(d, id);
  const ids = new Set(parents.map((l) => l.personne.id));
  const famille = !moi || moi === id || relation(d, moi, id) !== undefined;
  const groupes =
    parents.length <= 2 ? [parents] : [parents.filter((l) => l.filiation.type === 'biologique'), parents.filter((l) => l.filiation.type === 'adoptif')];
  const couples: CoupleParents[] = groupes
    .filter((g) => g.length > 0)
    .map((g) => ({
      membres: g.map((l) => l.personne.id),
      adoptif: g.every((l) => l.filiation.type === 'adoptif'),
      statut: g.length === 2 ? statut(g[0].personne.id, g[1].personne.id) : null,
      manque: false,
    }));
  if (famille && parents.length < 2) {
    if (couples.length) couples[0].manque = true;
    else couples.push({ membres: [], adoptif: false, statut: null, manque: true });
  }

  const fr = fratrie(d, id);
  const freres = fr.freresSoeurs.map((s) => {
    const siens = parentsDe(s.id);
    const k = Math.max(
      0,
      couples.findIndex((K) => K.membres.length > 0 && K.membres.every((m) => siens.has(m))),
    );
    const premier = couples[k]?.membres[0];
    return { id: s.id, couple: k, adoptif: !!premier && typeDe(premier, s.id) };
  });

  // Demis, par couple (parent commun, autre parent). Un demi dont le parent commun est inconnu n'a pas où se rattacher.
  const autres = new Map<string, AutreCouple>();
  for (const demi of fr.demis) {
    const siens = liensParents(d, demi.id).map((l) => l.personne.id);
    const commun = siens.find((p) => ids.has(p));
    if (!commun) continue;
    const autre = siens.find((p) => !ids.has(p)) ?? null;
    const cle = `${commun}|${autre ?? ''}`;
    if (!autres.has(cle)) autres.set(cle, { parent: commun, autre, statut: autre ? statut(commun, autre) : null, enfants: [] });
    autres.get(cle)!.enfants.push({ id: demi.id, adoptif: typeDe(commun, demi.id) });
  }
  const naissance = (x: string) => {
    const p = personnes.get(x);
    return (p && anneeDe(p.naissance) && p.naissance) || '9999';
  };
  const autresCouples = [...autres.values()].sort(
    (a, b) => Number(b.statut === 'actuelle') - Number(a.statut === 'actuelle') || naissance(b.enfants[0].id).localeCompare(naissance(a.enfants[0].id)),
  );

  const enfants = liensEnfants(d, id).map(({ filiation, personne }) => ({
    id: personne.id,
    adoptif: filiation.type === 'adoptif',
    autre: liensParents(d, personne.id).find((l) => l.personne.id !== id)?.personne.id ?? null,
  }));
  const c = conjoint(d, id);
  const cj = c && !estInconnu(c.personne) ? c.personne.id : null;
  const partenaires: Partenaire[] = [];
  for (const e of enfants)
    if (e.autre && e.autre !== cj && !partenaires.some((x) => x.id === e.autre)) partenaires.push({ id: e.autre, statut: statut(id, e.autre) });
  partenaires.reverse();

  return { personnes, centre: id, moi, couples, freres, autresCouples, conjoint: cj ? { id: cj, statut: 'actuelle' } : null, partenaires, enfants };
}

/** Le dessin a quelqu'un d'autre que la personne (la case « + Parent » seule ne compte pas). */
export const aDuMonde = (f: FamilleProche) =>
  f.couples.some((K) => K.membres.length > 0) ||
  f.freres.length > 0 ||
  f.autresCouples.length > 0 ||
  !!f.conjoint ||
  f.partenaires.length > 0 ||
  f.enfants.length > 0;

// --- Nœuds ---

const BOITE = 57;
const BOITE_ICI = 76;
/** Entre deux nœuds voisins. */
const ECART = 2;
/** Entre deux partenaires : le trait de descente passe entre leurs noms. */
const ECART_COUPLE = 15;
/** Entre deux groupes de frères et sœurs ou d'enfants. */
const ECART_GROUPE = 8;
const R = 19;
const RG = 26;
/** Largeur moyenne d'un caractère du nom (12 px demi-gras), estimée large ; × 14/12 pour la personne. */
export const CHASSE_NOM = 6.6;
const CHASSE_AN = 7.6;
/** Un mot plus long que la case l'élargit jusque-là (fiche.css, `.noeud .nom`). */
const NOM_MAX = 104;
/** Réserve de largeur par couloir quand une rangée se replie. */
const COULOIR = 34;

/** « 1990 », « 1938–2019 », « ?–2019 », « 1938–? » (décès sans année) ; vide sans année connue. */
export function annees(p: Personne): string {
  const n = anneeDe(p.naissance);
  const dc = anneeDe(p.deces) ?? (estDecede(p) && n ? '?' : undefined);
  return dc ? `${n ?? '?'}–${dc}` : (n ?? '');
}

export interface NoeudFoyer {
  /** `+parent` : la case « + Parent ». */
  id: string;
  personne?: Personne;
  ici: boolean;
  x: number;
  y: number;
  rayon: number;
  largeur: number;
  /** Lignes du nom (0 à 2 ; au-delà, « … »). */
  lignes: number;
  annees: string;
}

export interface TraitFoyer {
  d: string;
  pointille: boolean;
  /** Passe sur d'autres traits : un halo couleur de carte le détache. */
  halo: boolean;
}

export interface DispositionFoyer {
  noeuds: NoeudFoyer[];
  traits: TraitFoyer[];
  largeur: number;
  hauteur: number;
  /** Plus large que la place donnée : le cadre défile de côté. */
  defile: boolean;
}

function creerNoeud(f: FamilleProche, id: string): NoeudFoyer {
  if (id === '+parent') return { id, ici: false, x: 0, y: 0, rayon: R, largeur: BOITE, lignes: 1, annees: '' };
  const p = f.personnes.get(id)!;
  const ici = id === f.centre;
  const sansNom = estParentSansNom(p);
  const an = sansNom ? '' : annees(p);
  const nom = sansNom ? '' : id === f.moi ? 'Toi' : p.prenom || p.nom;
  const chasse = ici ? (CHASSE_NOM * 14) / 12 : CHASSE_NOM;
  const plusLong = Math.max(0, ...nom.split(/(?<=[-\s])/).map((m) => m.trim().length * chasse));
  const largeur = Math.ceil(Math.max(ici ? BOITE_ICI : BOITE, Math.min(NOM_MAX, plusLong), an.length * CHASSE_AN));
  const lignes = !nom ? 0 : nom.length * chasse <= largeur ? 1 : 2;
  return { id, personne: p, ici, x: 0, y: 0, rayon: ici ? RG : R, largeur, lignes, annees: an };
}

/** Bas du nœud (sous les années), depuis le centre de l'avatar. */
const bas = (n: NoeudFoyer) => n.rayon + 4 + n.lignes * (n.ici ? 18 : 16) + (n.annees ? 14 : 0);
const dist = (a: NoeudFoyer, b: NoeudFoyer, couple?: boolean) => (a.largeur + b.largeur) / 2 + (couple ? ECART_COUPLE : ECART);

// --- Placement d'une ligne : blocs contigus attirés vers leur ancre (moindres carrés, sans chevauchement) ---

interface Bloc {
  ids: string[];
  /** Indices des membres qui pendent du couple : la moyenne de leurs x vise l'ancre. */
  refs: number[];
  /** Indices `i` où l'écart entre i - 1 et i est celui d'un couple. */
  couples?: Set<number>;
  ancre?: number;
  /** Nombre de membres de tête qui restent ensemble au repli (la personne et ses partenaires). */
  coeur?: number;
  principal?: boolean;
  couple?: number;
  groupe?: AutreCouple;
  autre?: string | null;
  es?: Rattache[];
}

type Noeuds = Map<string, NoeudFoyer>;

function offsets(b: Bloc, N: Noeuds): number[] {
  const o = [0];
  for (let i = 1; i < b.ids.length; i++) o.push(o[i - 1] + dist(N.get(b.ids[i - 1])!, N.get(b.ids[i])!, b.couples?.has(i)));
  return o;
}

function placerLigne(blocs: Bloc[], N: Noeuds): void {
  const infos = blocs.map((b) => {
    const o = offsets(b, N);
    const refs = b.refs.length ? b.refs : [0];
    const ref = refs.reduce((s, i) => s + o[i], 0) / refs.length;
    return { o, larg: o[o.length - 1], voulu: (b.ancre ?? 0) - ref };
  });
  const ecart = (i: number) => dist(N.get(blocs[i - 1].ids[blocs[i - 1].ids.length - 1])!, N.get(blocs[i].ids[0])!) + ECART_GROUPE;
  interface Grappe {
    debut: number;
    somme: number;
    n: number;
    dec: number[];
    larg: number;
  }
  const grappes: Grappe[] = [];
  infos.forEach((info, i) => {
    let g: Grappe = { debut: i, somme: info.voulu, n: 1, dec: [0], larg: info.larg };
    while (grappes.length) {
      const p = grappes[grappes.length - 1];
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
      infos[g.debut + k].o.forEach((o, j) => (N.get(b.ids[j])!.x = x0 + dx + o));
    });
  }
}

/** Ouvre un couloir de 10 px pour chaque descente qui traverse la ligne : le nœud gêné part du côté de son centre, avec ses voisins. */
function libererCouloirs(ids: string[], couloirs: number[], N: Noeuds): void {
  const ns = ids.map((id) => N.get(id)!).sort((a, b) => a.x - b.x);
  for (const c of couloirs)
    for (let essai = 0; essai < 3; essai++) {
      const k = ns.findIndex((x) => x.x + x.largeur / 2 > c - 5 && x.x - x.largeur / 2 < c + 5);
      if (k < 0) break;
      const m = ns[k];
      if (m.x < c) {
        const l = m.x + m.largeur / 2 - (c - 5);
        ns.slice(0, k + 1).forEach((x) => (x.x -= l));
      } else {
        const r = c + 5 - (m.x - m.largeur / 2);
        ns.slice(k).forEach((x) => (x.x += r));
      }
    }
}

function largeurLigne(blocs: Bloc[], N: Noeuds): number {
  let l = 0;
  blocs.forEach((b, i) => {
    const o = offsets(b, N);
    l += o[o.length - 1] + (i ? dist(N.get(blocs[i - 1].ids[blocs[i - 1].ids.length - 1])!, N.get(b.ids[0])!) + ECART_GROUPE : 0);
  });
  const dernier = blocs[blocs.length - 1];
  return l + (N.get(blocs[0].ids[0])!.largeur + N.get(dernier.ids[dernier.ids.length - 1])!.largeur) / 2;
}

/** Répartit les blocs sur des lignes d'au plus `budget` px ; un bloc trop long est coupé (le cœur reste entier). */
const simple = (b: Bloc, ids: string[]): Bloc => ({ ...b, ids, refs: ids.map((_, i) => i), couples: new Set(), coeur: undefined });

function replierSimple(b: Bloc, budget: number, N: Noeuds): Bloc[] {
  const morceaux: string[][] = [[]];
  for (const id of b.ids) {
    const m = morceaux[morceaux.length - 1];
    if (m.length && largeurLigne([simple(b, [...m, id])], N) > budget) morceaux.push([id]);
    else m.push(id);
  }
  return morceaux.map((m) => simple(b, m));
}

/**
 * Rangée de la personne trop large : sa ligne, dessinée en dernier, garde les plus jeunes ; les aînés montent au-dessus,
 * en lignes égalisées, pour que la lecture de haut en bas suive l'âge.
 */
function replierCoeur(b: Bloc, budget: number, N: Noeuds): Bloc[] {
  const coeur = b.coeur!;
  const avecCoeur = (queue: string[]): Bloc => ({
    ...b,
    ids: [...b.ids.slice(0, coeur), ...queue],
    refs: [...b.refs.filter((r) => r < coeur), ...queue.map((_, i) => coeur + i)],
  });
  const freres = b.ids.slice(coeur);
  let k = freres.length;
  while (k > 0 && largeurLigne([avecCoeur(freres.slice(k - 1))], N) <= budget) k--;
  const tete = freres.slice(0, k);
  // Découpe de la fin vers le début, puis on égalise en faisant remonter les premiers de chaque ligne.
  const lignes: string[][] = [];
  for (let i = tete.length - 1; i >= 0; i--) {
    const l = lignes[0];
    if (l && largeurLigne([simple(b, [tete[i], ...l])], N) <= budget) l.unshift(tete[i]);
    else lignes.unshift([tete[i]]);
  }
  for (let bouge = true; bouge;) {
    bouge = false;
    for (let i = 0; i + 1 < lignes.length; i++) {
      const [haut, suite] = [lignes[i], lignes[i + 1]];
      if (haut.length + 1 < suite.length && largeurLigne([simple(b, [...haut, suite[0]])], N) <= budget) {
        haut.push(suite.shift()!);
        bouge = true;
      }
    }
  }
  return [...lignes.map((l) => simple(b, l)), avecCoeur(freres.slice(k))];
}

function replier(blocs: Bloc[], budget: number, N: Noeuds): Bloc[][] {
  const morceaux: Bloc[] = [];
  for (const b of blocs) {
    if (largeurLigne([b], N) <= budget) {
      morceaux.push(b);
      continue;
    }
    morceaux.push(...(b.coeur ? replierCoeur(b, budget, N) : replierSimple(b, budget, N)));
  }
  const lignes: Bloc[][] = [[]];
  for (const m of morceaux) {
    const l = lignes[lignes.length - 1];
    if (l.length && largeurLigne([...l, m], N) > budget) lignes.push([m]);
    else l.push(m);
  }
  return lignes;
}

// --- Disposition ---

interface Jonction {
  x: number;
  y: number;
}

interface Chaine {
  K: CoupleParents;
  k: number;
  ids: string[];
  couples: Set<number>;
  gauche: AutreCouple[];
  droite: AutreCouple[];
  a: string;
  second: string | null;
  refs: number[];
  ancre: number;
}

/** Où dessiner chacun, pour une largeur de `budget` px. */
export function disposerFoyer(f: FamilleProche, budget: number): DispositionFoyer {
  const N: Noeuds = new Map();
  const n = (id: string) => {
    if (!N.has(id)) N.set(id, creerNoeud(f, id));
    return N.get(id)!;
  };
  const traits: TraitFoyer[] = [];
  const trait = (d: string, pointille = false, halo = false) => traits.push({ d, pointille, halo });
  const rayon = (x: NoeudFoyer) => x.rayon;

  // Rangée des parents : une chaîne par couple, ses autres partenaires de part et d'autre.
  const autresDe = (p: string | undefined) => f.autresCouples.filter((a) => a.parent === p);
  const chaines: Chaine[] = f.couples.map((K, k) => {
    const a = K.membres[0] ?? '+parent';
    const b = K.membres[1];
    const second = b ?? (K.manque && K.membres.length ? '+parent' : null);
    let gauche = autresDe(K.membres[0]);
    let droite = b ? autresDe(b) : [];
    if (!second) [gauche, droite] = [[], gauche];
    const avecNoeud = (l: AutreCouple[]) => l.filter((x) => x.autre).map((x) => x.autre!);
    const ids = [...avecNoeud(gauche).reverse(), a, ...(second ? [second] : []), ...avecNoeud(droite)];
    const couples = new Set<number>();
    const ia = ids.indexOf(a);
    if (ia > 0) couples.add(ia);
    if (second) couples.add(ia + 1);
    const ib = second ? ia + 1 : ia;
    if (ib < ids.length - 1) couples.add(ib + 1);
    return { K, k, ids, couples, gauche, droite, a, second, refs: second ? [ia, ia + 1] : [ia], ancre: 0 };
  });
  const y0 = 30;
  for (const c of chaines) for (const id of c.ids) n(id).y = y0;

  // Rangée de la personne : le conjoint (sinon le premier co-parent) à gauche, les autres co-parents de l'autre côté.
  const ici = f.centre;
  const gaucheP = f.conjoint ?? f.partenaires[0] ?? null;
  const droiteP = f.partenaires.filter((p) => p !== gaucheP);
  const coeurIds = [...(gaucheP ? [gaucheP.id] : []), ici, ...droiteP.map((p) => p.id)];
  const iIci = coeurIds.indexOf(ici);
  const couplesCoeur = new Set<number>();
  if (gaucheP) couplesCoeur.add(1);
  if (droiteP.length) couplesCoeur.add(iIci + 1);
  const blocsG1: Bloc[] = [];
  const demisBloc = (ac: AutreCouple): Bloc => ({ ids: ac.enfants.map((e) => e.id), refs: ac.enfants.map((_, i) => i), groupe: ac });
  const principal = (freres: string[]): Bloc => ({
    ids: [...coeurIds, ...freres],
    refs: [iIci, ...freres.map((_, i) => coeurIds.length + i)],
    couples: couplesCoeur,
    coeur: coeurIds.length,
    principal: true,
  });
  for (const c of chaines) {
    for (const ac of [...c.gauche].reverse()) blocsG1.push(demisBloc(ac));
    const freres = f.freres.filter((x) => x.couple === c.k).map((x) => x.id);
    if (c.k === 0) blocsG1.push(principal(freres));
    else if (freres.length) blocsG1.push({ ids: freres, refs: freres.map((_, i) => i), couple: c.k });
    for (const ac of c.droite) blocsG1.push(demisBloc(ac));
  }
  if (!chaines.length) blocsG1.push(principal(f.freres.map((x) => x.id)));
  for (const b of blocsG1) b.ids.forEach(n);

  const jonctionsG0 = () => {
    const j = new Map<string | AutreCouple, Jonction>();
    for (const c of chaines) {
      const A = n(c.a);
      j.set(`couple${c.k}`, c.second ? { x: (A.x + n(c.second).x) / 2, y: y0 } : { x: A.x, y: y0 + bas(A) + 2 });
      for (const ac of [...c.gauche, ...c.droite]) {
        const Pa = n(ac.parent);
        j.set(ac, ac.autre ? { x: (Pa.x + n(ac.autre).x) / 2, y: y0 } : { x: Pa.x, y: y0 + bas(Pa) + 2 });
      }
    }
    return j;
  };
  const ancreG1 = (b: Bloc, j: Map<string | AutreCouple, Jonction>) => {
    if (b.groupe) return j.get(b.groupe)?.x ?? 0;
    if (b.principal) return chaines.length ? j.get('couple0')!.x : 0;
    return j.get(`couple${b.couple}`)!.x;
  };

  // 1. Parents serrés autour de 0 ; 2. leurs enfants sous les jonctions ; 3. parents recentrés au-dessus ; 4. enfants.
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
    const xs = blocsG1.filter((b) => (b.principal && c.k === 0) || b.couple === c.k).flatMap((b) => b.refs.map((r) => n(b.ids[r]).x));
    if (c.k > 0) xs.push(n(ici).x);
    c.ancre = xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
  }
  placerG0();
  j0 = jonctionsG0();
  for (const b of blocsG1) b.ancre = ancreG1(b, j0);

  // Lignes de la génération de la personne : repliées si trop larges, sauf si la rangée des parents déborde déjà.
  const largeurG0 = chaines.length
    ? largeurLigne(
        chaines.map((c) => ({ ids: c.ids, couples: c.couples, refs: [] })),
        N,
      )
    : 0;
  const plat = largeurG0 > budget;
  const lignesDe = (blocs: Bloc[]) => {
    if (plat || largeurLigne(blocs, N) <= budget) return [blocs];
    // Les lignes du haut laissent passer les descentes des suivantes : on leur réserve la place d'un couloir.
    const l = replier(blocs, budget, N);
    return replier(blocs, budget - COULOIR * (l.length - 1), N);
  };
  let lignesG1 = lignesDe(blocsG1);
  // La ligne de la personne passe en dernier.
  const iP = lignesG1.findIndex((l) => l.some((b) => b.principal && b.coeur));
  if (iP >= 0 && iP < lignesG1.length - 1) lignesG1 = [...lignesG1.filter((_, i) => i !== iP), lignesG1[iP]];

  const hautLigne = (ids: string[]) => Math.max(...ids.map((id) => bas(n(id))));
  const rayonLigne = (ids: string[]) => Math.max(...ids.map((id) => rayon(n(id))));
  // Sans parents dessinés : la place du trait de fratrie au-dessus de la rangée, s'il y en a un.
  let yCourant = chaines.length ? y0 + Math.max(...chaines.flatMap((c) => c.ids.map((id) => bas(n(id))))) : f.freres.length ? -8 : -26;
  yCourant += chaines.reduce((s, c) => s + Math.max(0, c.ids.length - 1 - c.couples.size), 0) * 8;
  interface Ligne {
    blocs: Bloc[];
    y: number;
    ids: string[];
  }
  const placerLignes = (lignes: Bloc[][], ancres: (b: Bloc) => number): Ligne[] =>
    lignes.map((l, i) => {
      const ids = l.flatMap((b) => b.ids);
      const y = yCourant + 30 + rayonLigne(ids);
      ids.forEach((id) => (n(id).y = y));
      placerLigne(
        l.map((b) => ({ ...b, ancre: ancres(b) })),
        N,
      );
      libererCouloirs(
        ids,
        lignes
          .slice(i + 1)
          .flat()
          .map(ancres),
        N,
      );
      yCourant = y + hautLigne(ids);
      return { blocs: l, y, ids };
    });
  // Chaque ligne repliée est ramenée dans le cadre, centré sur la rangée des parents : elle s'écarte un peu de son
  // couple plutôt que de faire déborder le dessin.
  const ids0 = chaines.flatMap((c) => c.ids);
  const milieu0 = ids0.length
    ? (Math.min(...ids0.map((id) => n(id).x - n(id).largeur / 2)) + Math.max(...ids0.map((id) => n(id).x + n(id).largeur / 2))) / 2
    : undefined;
  const cadrer = (lignes: Ligne[]) => {
    if (plat) return;
    for (const l of lignes) {
      const ns = l.ids.map(n);
      const g = Math.min(...ns.map((x) => x.x - x.largeur / 2));
      const d = Math.max(...ns.map((x) => x.x + x.largeur / 2));
      if (d - g > budget) continue;
      const c = milieu0 ?? (g + d) / 2;
      const [gF, dF] = [c - budget / 2, c + budget / 2];
      const dx = g < gF ? gF - g : d > dF ? dF - d : 0;
      ns.forEach((x) => (x.x += dx));
    }
  };
  const lg1 = placerLignes(lignesG1, (b) => b.ancre ?? 0);
  cadrer(lg1);

  // Partenaires de la personne : le premier de chaque côté par un trait direct, les suivants par une voie dessous.
  const I = n(ici);
  interface JonctionUnion extends Jonction {
    voie?: boolean;
    statut?: Statut;
    a?: NoeudFoyer;
    b?: NoeudFoyer;
  }
  const jonctionsG1 = new Map<string | null, JonctionUnion>();
  if (gaucheP) {
    const G = n(gaucheP.id);
    jonctionsG1.set(gaucheP.id, { x: (G.x + I.x) / 2, y: I.y, statut: gaucheP.statut, a: G, b: I });
  }
  const voiesG1 = droiteP.slice(1);
  if (droiteP.length) {
    const D = n(droiteP[0].id);
    jonctionsG1.set(droiteP[0].id, { x: (I.x + D.x) / 2, y: I.y, statut: droiteP[0].statut, a: I, b: D });
  }
  yCourant += voiesG1.length * 8;
  voiesG1.forEach((p, i) => {
    const D = n(p.id);
    jonctionsG1.set(p.id, { x: (I.x + D.x) / 2, y: I.y + Math.max(bas(I), bas(D)) + 6 + i * 8, voie: true, statut: p.statut, a: I, b: D });
  });
  jonctionsG1.set(null, { x: I.x, y: I.y + bas(I) + 2 });

  // Enfants de la personne, par couple ; ceux dont l'autre parent n'est pas dessiné pendent de la personne seule.
  const ordre: (string | null)[] = [gaucheP?.id ?? '§', null, ...droiteP.map((p) => p.id)];
  const blocsG2: Bloc[] = ordre
    .map((autre) => ({ autre, es: f.enfants.filter((e) => e.autre === autre || (autre === null && e.autre && !N.has(e.autre))) }))
    .filter((g) => g.es.length)
    .map((g) => ({ ids: g.es.map((e) => e.id), refs: g.es.map((_, i) => i), autre: g.autre, es: g.es }));
  blocsG2.forEach((b) => b.ids.forEach(n));
  const ancreG2 = (b: Bloc) => jonctionsG1.get(b.autre ?? null)?.x ?? I.x;
  const lg2 = blocsG2.length ? placerLignes(lignesDe(blocsG2), ancreG2) : [];
  cadrer(lg2);

  // Recentrage horizontal.
  const tous = [...N.values()];
  const gMin = Math.min(...tous.map((x) => x.x - x.largeur / 2));
  const dMax = Math.max(...tous.map((x) => x.x + x.largeur / 2));
  let largeur = dMax - gMin;
  let dx = -gMin;
  if (largeur < budget) {
    dx += (budget - largeur) / 2;
    largeur = budget;
  }
  for (const x of tous) x.x += dx;
  for (const m of [j0, jonctionsG1]) for (const v of m.values()) v.x += dx;

  // --- Traits ---
  // Deux barres qui se chevauchent au même niveau passent l'une au-dessus de l'autre (sinon les groupes se confondent).
  const barres: { y: number; g: number; d: number }[] = [];
  const gene = (y: number, g: number, d: number) => barres.some((b) => Math.abs(b.y - y) < 4 && g < b.d + 8 && d > b.g - 8);
  const descente = (x: number | undefined, yDe: number, vers: Rattache[], yLigne: number, rL: number, depuisSous: boolean) => {
    const xs = vers.map((e) => n(e.id).x);
    const g = Math.min(...(x === undefined ? xs : [x, ...xs]));
    const d = Math.max(...(x === undefined ? xs : [x, ...xs]));
    let yb = yLigne - rL - 14;
    while (gene(yb, g, d)) yb -= 9;
    barres.push({ y: yb, g, d });
    if (x !== undefined) trait(`M${x} ${yDe}V${yb}`, false, depuisSous);
    if (g < d) trait(`M${g} ${yb}H${d}`);
    for (const e of vers) {
      const E = n(e.id);
      trait(`M${E.x} ${yb}V${E.y - E.rayon - 4}`, e.adoptif);
    }
  };
  // Couple séparé ou sans union enregistrée : pointillé ; union actuelle (même avec un défunt) : trait plein.
  const union = (A: NoeudFoyer, B: NoeudFoyer, statut: Statut) => {
    const [g, d] = A.x < B.x ? [A, B] : [B, A];
    trait(`M${g.x + g.rayon + 4} ${g.y}H${d.x - d.rayon - 4}`, statut !== 'actuelle');
  };
  const voie = (A: NoeudFoyer, B: NoeudFoyer, yv: number, statut: Statut) => {
    trait(`M${A.x} ${A.y + bas(A) + 2}V${yv}`);
    trait(`M${B.x} ${B.y + bas(B) + 2}V${yv}`);
    trait(`M${Math.min(A.x, B.x)} ${yv}H${Math.max(A.x, B.x)}`, statut !== 'actuelle', true);
  };

  // Parents et leurs autres partenaires.
  for (const c of chaines) {
    if (c.second) union(n(c.a), n(c.second), c.second === '+parent' ? 'separee' : c.K.statut);
    let voieI = 0;
    for (const liste of [c.gauche, c.droite])
      liste
        .filter((x) => x.autre)
        .forEach((ac, i) => {
          const Pa = n(ac.parent);
          const X = n(ac.autre!);
          if (i === 0) return union(Pa, X, ac.statut);
          const yv = y0 + Math.max(bas(Pa), bas(X)) + 6 + voieI++ * 8;
          voie(Pa, X, yv, ac.statut);
          j0.set(ac, { x: (Pa.x + X.x) / 2, y: yv });
        });
  }
  // Fratrie et demis.
  const adoptifG1 = (b: Bloc, id: string) =>
    !!(f.freres.find((x) => x.id === id)?.adoptif || b.groupe?.enfants.find((e) => e.id === id)?.adoptif || (id === ici && f.couples[0]?.adoptif));
  for (const l of lg1) {
    const rL = rayonLigne(l.ids);
    for (const b of l.blocs) {
      const cible = b.ids.filter((_, i) => b.refs.includes(i)).map((id) => ({ id, adoptif: adoptifG1(b, id) }));
      if (!cible.length) continue;
      const j = b.groupe ? j0.get(b.groupe) : chaines.length ? j0.get(`couple${b.principal ? 0 : b.couple}`) : undefined;
      // Sans parent dessiné, la fratrie est seulement reliée par son trait.
      if (j) descente(j.x, j.y, cible, l.y, rL, l !== lg1[0]);
      else if (cible.length > 1) descente(undefined, 0, cible, l.y, rL, false);
    }
  }
  // La personne pend aussi de son couple adoptif, par un trait sous les barres déjà tracées (au-dessus, il couperait
  // les années des parents).
  f.couples.forEach((_, k) => {
    if (k === 0) return;
    const j = j0.get(`couple${k}`)!;
    const g = Math.min(j.x, I.x);
    const d = Math.max(j.x, I.x);
    let yb = I.y - RG - 23;
    while (yb < I.y - RG - 8 && gene(yb, g, d)) yb += 5;
    barres.push({ y: yb, g, d });
    trait(`M${j.x} ${j.y}V${yb}H${I.x}V${I.y - RG - 4}`, true);
  });
  for (const [cle, j] of jonctionsG1) {
    if (cle === null) continue;
    if (j.voie) voie(j.a!, j.b!, j.y, j.statut ?? null);
    else union(j.a!, j.b!, j.statut ?? null);
  }
  for (const l of lg2) {
    const rL = rayonLigne(l.ids);
    for (const b of l.blocs) {
      const j = jonctionsG1.get(b.autre ?? null) ?? jonctionsG1.get(null)!;
      descente(
        j.x,
        j.y,
        b.es!.filter((e) => b.ids.includes(e.id)),
        l.y,
        rL,
        l !== lg2[0],
      );
    }
  }

  // Les traits à halo passent par-dessus les autres.
  traits.sort((a, b) => Number(a.halo) - Number(b.halo));
  return { noeuds: tous, traits, largeur: Math.ceil(largeur), hauteur: Math.ceil(yCourant + 12), defile: largeur > budget + 1 };
}
