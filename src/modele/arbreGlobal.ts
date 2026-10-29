// Arbre global : place toutes les personnes reliées à « Moi », une ligne par génération (maquette A).
// Unités : x en « places » (deux conjoints voisins sont à 1 l'un de l'autre), y en générations (Moi en 0, 0).
// La famille de Moi forme l'arbre principal ; ses amis et leurs familles vont dans une bulle sous l'arbre.
// Les personnes sans lien avec Moi ne sont pas placées. Le placement d'une partie est dans partie.ts.

import { nomGroupe } from './deductions';
import { couleurFamille } from './liste';
import { avecParentsSansNom, estParentSansNom } from './parentSansNom';
import { disposerPartie, ECART_FAMILLES, lier, type Bloc, type Voisins } from './partie';
import type { Donnees, Personne } from './types';

/** Hauteurs possibles du trait commun, sous la ligne des parents (en générations), et écart entre deux niveaux. */
export const BANDE_BUS: [number, number] = [0.62, 0.8];
const PAS_BUS = 0.1;
/** Deux portées à moins de cet écart (en places) comptent comme se touchant. */
const MARGE_BUS = 0.2;
/** Distance entre la dernière génération de la famille et la première ligne de la bulle des amis. */
export const ECART_BULLE = 1.7;

export interface Point {
  x: number;
  y: number;
}

export interface PlaceArbre extends Point {
  personne: Personne;
  /** Dans la bulle des amis de Moi. */
  bulle: boolean;
  /** Lignée (famille d'origine) dans l'arbre principal, numérotée de gauche à droite ; absente dans la bulle. */
  lignee?: number;
  /** « née X » sous le nom : la personne est la seule de sa famille dans l'arbre (ni parent connu, ni frère ou sœur). */
  naissance?: true;
}

/** Enfants d'une même paire de parents (ou d'un parent seul), reliés par un trait commun. */
export interface Branche {
  /** Départs : le milieu d'un couple voisin, sinon chaque parent (`parent` renseigné). Un parent inconnu n'est pas dessiné (`inconnu`). */
  origines: (Point & { parent?: string; inconnu?: true })[];
  /** Ordonnée du trait horizontal commun, entre les parents et les enfants. */
  bus: number;
  enfants: (Point & { id: string; adoptif: boolean })[];
  /** Lignée des enfants (couleur du trait), absente dans la bulle. */
  lignee?: number;
}

/** Groupe d'amis à encadrer dans la bulle : ses membres et, avec eux, leurs familles. */
export interface GroupeDessine {
  id: string;
  nom: string;
  /** Membres placés dans la bulle (ils portent l'anneau). */
  membres: string[];
  /** Toutes les personnes à encadrer : les membres et leurs familles. */
  ids: string[];
  /** Nombre d'amis de Moi dans le groupe (Moi n'est pas compté). */
  amis: number;
}

/** Nom de famille écrit au-dessus d'une lignée : un couple ou une personne dont aucun parent n'est dans l'arbre. */
export interface EtiquetteFamille extends Point {
  texte: string;
  /** Lignée de l'arbre principal ; absente dans la bulle. */
  lignee?: number;
  /** Fratrie sans parent connu : le nom se place au-dessus du trait commun des enfants. */
  fratrie?: boolean;
  /** Deux noms au-dessus d'un couple : le premier finit en `x` (« fin »), le second y commence (« debut »). Centré sinon. */
  ancre?: 'fin' | 'debut';
}

export interface Disposition {
  places: PlaceArbre[];
  couples: { a: string; b: string; separe: boolean; marie: boolean; lignee?: number }[];
  branches: Branche[];
  /** Amitiés à tracer hors des cadres : celles de Moi avec la bulle sont remplacées par un seul trait vers la bulle, et les amis d'un même groupe de la bulle n'en ont pas. */
  amities: { a: string; b: string }[];
  groupes: GroupeDessine[];
  etiquettes: EtiquetteFamille[];
  /** Personnes de l'arbre principal (famille et amis posés à côté d'elle, sans Moi) qui sont dans un groupe d'amis : un petit anneau à la couleur du groupe. */
  anneaux: { id: string; groupe: string }[];
}

/** Parcours en largeur depuis `departs`, dans l'ordre de découverte. */
function parcourir(departs: string[], suivants: (id: string) => string[]): string[] {
  const vus = new Set(departs);
  const file = [...departs];
  for (let i = 0; i < file.length; i++) {
    for (const v of suivants(file[i])) {
      if (vus.has(v)) continue;
      vus.add(v);
      file.push(v);
    }
  }
  return file;
}

/** Ce que toutes les étapes de `disposerArbre` lisent : les données (parents sans nom compris) et leurs liens. */
interface Graphe {
  d: Donnees;
  moi: string;
  personnes: Map<string, Personne>;
  /** Voisins par la famille (parents, enfants, conjoints). */
  parFamille: (id: string) => string[];
  /** Voisins par l'amitié (membres d'un même groupe). */
  parAmitie: (id: string) => string[];
  /** Tri par « prénom nom ». */
  parPrenom: (ids: string[]) => string[];
}

function graphe(d: Donnees, moi: string): Graphe {
  const personnes = new Map(d.personnes.map((p) => [p.id, p]));
  const famille: Voisins = new Map();
  const amis: Voisins = new Map();
  for (const f of d.filiations) if (personnes.has(f.parent) && personnes.has(f.enfant)) lier(famille, f.parent, f.enfant);
  for (const u of d.unions) if (personnes.has(u.personneA) && personnes.has(u.personneB)) lier(famille, u.personneA, u.personneB);
  // Les membres d'un groupe d'amis sont amis deux à deux.
  for (const g of d.groupes) {
    const presents = g.membres.filter((m) => personnes.has(m));
    presents.forEach((a, i) => presents.slice(i + 1).forEach((b) => lier(amis, a, b)));
  }
  return {
    d,
    moi,
    personnes,
    parFamille: (id) => famille.get(id) ?? [],
    parAmitie: (id) => amis.get(id) ?? [],
    parPrenom: (ids) =>
      [...ids].sort((a, b) => {
        const pa = personnes.get(a)!;
        const pb = personnes.get(b)!;
        return `${pa.prenom} ${pa.nom}`.localeCompare(`${pb.prenom} ${pb.nom}`, 'fr');
      }),
  };
}

/** Amis hors de la famille de Moi, chacun avec sa propre famille (composantes par les liens de famille), et où va chacun. */
interface Repartition {
  groupeDe: Map<string, number>;
  groupes: string[][];
  place: ('famille' | 'bulle' | undefined)[];
  /** Ami rattaché à quelqu'un (il se place à côté de lui) : [qui, ami]. */
  ancrages: [string, string][];
  /** Amis posés dans la bulle sans ancrage, dans l'ordre. */
  racinesBulle: string[];
}

/**
 * Étape 1. Où va chaque groupe : amis de Moi dans la bulle ; amis d'un autre membre de la famille à côté de lui ;
 * puis, de proche en proche, l'ami d'un ami suit le groupe de son ami.
 */
function repartirAmis(gr: Graphe, visibles: Set<string>, deFamille: Set<string>): Repartition {
  const { d, moi, personnes, parFamille, parAmitie, parPrenom } = gr;
  const groupeDe = new Map<string, number>();
  const groupes: string[][] = [];
  for (const p of d.personnes) {
    if (!visibles.has(p.id) || deFamille.has(p.id) || groupeDe.has(p.id)) continue;
    const g = parcourir([p.id], parFamille);
    g.forEach((id) => groupeDe.set(id, groupes.length));
    groupes.push(g);
  }

  const place: Repartition['place'] = groupes.map(() => undefined);
  const ancrages: [string, string][] = [];
  const racinesBulle: string[] = [];
  const file: number[] = [];
  const affecter = (de: string, ami: string, ou: 'famille' | 'bulle', ancrer: boolean) => {
    const g = groupeDe.get(ami);
    if (g === undefined || place[g]) return;
    place[g] = ou;
    if (ancrer) ancrages.push([de, ami]);
    else racinesBulle.push(ami);
    file.push(g);
  };
  // Les groupes de Moi l'un après l'autre, pour que les amis d'un groupe se suivent dans la bulle.
  const groupesDeMoi = d.groupes.filter((g) => g.membres.includes(moi)).sort((a, b) => nomGroupe(d, a).localeCompare(nomGroupe(d, b), 'fr'));
  for (const g of groupesDeMoi) for (const a of parPrenom(g.membres.filter((m) => m !== moi && personnes.has(m)))) affecter(moi, a, 'bulle', false);
  for (const id of d.personnes.map((p) => p.id)) {
    if (id !== moi && deFamille.has(id)) for (const a of parPrenom(parAmitie(id))) affecter(id, a, 'famille', true);
  }
  const propager = (debut: number) => {
    for (let i = debut; i < file.length; i++) {
      for (const m of groupes[file[i]]) for (const a of parPrenom(parAmitie(m))) affecter(m, a, place[file[i]]!, true);
    }
  };
  propager(0);
  // Les groupes sans lien avec Moi ni sa famille : dans la bulle, sans ancrage.
  for (const g of d.groupes) {
    // Tous les membres d'abord, puis la propagation : un ami du même groupe ne s'ancre pas à un autre (sinon un
    // ami se glisse entre deux conjoints).
    const debut = file.length;
    for (const a of parPrenom(g.membres.filter((m) => personnes.has(m)))) {
      const i = groupeDe.get(a);
      if (i !== undefined && !place[i]) affecter(a, a, 'bulle', false);
    }
    propager(debut);
  }
  return { groupeDe, groupes, place, ancrages, racinesBulle };
}

/** Tous les parents de chaque enfant visible (adoptifs compris). */
function tousLesParents(d: Donnees, visibles: Set<string>): Map<string, string[]> {
  const res = new Map<string, string[]>();
  for (const f of d.filiations) {
    if (visibles.has(f.parent) && visibles.has(f.enfant)) res.set(f.enfant, [...(res.get(f.enfant) ?? []), f.parent]);
  }
  return res;
}

/** Ce qu'il faut pour disposer une partie : ses liens de bloc, les parents principaux et tous les parents. */
interface Placement {
  liensBloc: (ids: Set<string>) => [string, string][];
  parents: Map<string, string[]>;
  tousParents: Map<string, string[]>;
}

/**
 * Étape 3. La bulle : chaque groupe d'amis (avec les groupes qui partagent une famille) est disposé à part, puis
 * posé sous le précédent (leurs cadres ne peuvent pas se mêler), sous l'arbre principal ; chacun est centré sous Moi.
 */
function disposerBulle(gr: Graphe, idsBulle: string[], rep: Repartition, pl: Placement, positions: Map<string, Point>, blocDe: Map<string, Bloc>): void {
  const ensBulle = new Set(idsBulle);
  const { groupeDe, groupes, racinesBulle } = rep;
  const parent = groupes.map((_, i) => i);
  const racine = (i: number): number => (parent[i] === i ? i : (parent[i] = racine(parent[i])));
  for (const g of gr.d.groupes) {
    const comps = [...new Set(g.membres.filter((m) => ensBulle.has(m)).map((m) => groupeDe.get(m)!))];
    for (const c of comps.slice(1)) parent[racine(c)] = racine(comps[0]);
  }
  const amas = new Map<number, string[]>();
  for (const id of idsBulle) {
    const r = racine(groupeDe.get(id)!);
    amas.set(r, [...(amas.get(r) ?? []), id]);
  }
  const rangRacine = (ids: string[]) => {
    const rangs = ids.map((id) => racinesBulle.indexOf(id)).filter((i) => i >= 0);
    return rangs.length > 0 ? Math.min(...rangs) : Infinity;
  };
  const haut = Math.max(...[...positions.values()].map((p) => p.y)) + ECART_BULLE;
  let bas: number | undefined;
  for (const ids of [...amas.values()].sort((u, v) => rangRacine(u) - rangRacine(v))) {
    const ens = new Set(ids);
    const racines = racinesBulle.filter((r) => ens.has(r));
    const partie = disposerPartie(
      { ids, racines: racines.length > 0 ? racines : [ids[0]], liensBloc: pl.liensBloc(ens) },
      gr.personnes,
      pl.parents,
      pl.tousParents,
    );
    // Familles d'amis voisines : les grands vides entre deux familles sont resserrés (sans changer leur ordre).
    resserrer(
      partie.positions,
      groupes.map((g) => g.filter((id) => ens.has(id))).filter((g) => g.length > 0),
    );
    const xs = [...partie.positions.values()].map((p) => p.x);
    const ys = [...partie.positions.values()].map((p) => p.y);
    // Chaque amas est centré sous Moi (x = 0) et posé sous le précédent.
    const milieuX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const decalageY = (bas ?? haut) - Math.min(...ys);
    for (const [id, p] of partie.positions) positions.set(id, { x: p.x - milieuX, y: p.y + decalageY });
    bas = Math.max(...ys) + decalageY + ECART_BULLE;
    partie.blocs.forEach((b, id) => blocDe.set(id, b));
  }
}

/**
 * Étape 4. Couples à relier : les unions, et deux parents d'un même enfant sans union enregistrée (un ex, en
 * pointillés). Un couple prend la couleur de celui des deux qui est le plus proche de Moi (parenté, unions comprises).
 */
function couplesDessines(
  gr: Graphe,
  positions: Map<string, Point>,
  coparents: [string, string][],
  visibles: Set<string>,
  deLignee: Map<string, number>,
): Disposition['couples'] {
  const { d, moi } = gr;
  const couples: Disposition['couples'] = d.unions
    .filter((u) => positions.has(u.personneA) && positions.has(u.personneB))
    .map((u) => ({ a: u.personneA, b: u.personneB, separe: u.statut === 'separee', marie: u.marie }));
  const cle = (a: string, b: string) => [a, b].sort().join('|');
  const vus = new Set(couples.map((c) => cle(c.a, c.b)));
  for (const [x, y] of coparents) {
    if (vus.has(cle(x, y)) || !visibles.has(x) || !visibles.has(y)) continue;
    vus.add(cle(x, y));
    couples.push({ a: x, b: y, separe: true, marie: false });
  }
  const voisinsMoi = new Map<string, string[]>();
  const relier = (a: string, b: string) => {
    voisinsMoi.set(a, [...(voisinsMoi.get(a) ?? []), b]);
    voisinsMoi.set(b, [...(voisinsMoi.get(b) ?? []), a]);
  };
  for (const u of d.unions) relier(u.personneA, u.personneB);
  for (const f of d.filiations) relier(f.parent, f.enfant);
  const distance = new Map<string, number>([[moi, 0]]);
  for (const file = [moi]; file.length > 0;) {
    const c = file.shift()!;
    for (const v of voisinsMoi.get(c) ?? []) if (!distance.has(v)) (distance.set(v, distance.get(c)! + 1), file.push(v));
  }
  for (const c of couples) {
    const [da, db] = [distance.get(c.a) ?? Infinity, distance.get(c.b) ?? Infinity];
    const [la, lb] = [deLignee.get(c.a), deLignee.get(c.b)];
    // À égalité (deux parents), la couleur de ma famille si l'un en est.
    c.lignee = da === db ? (lb !== undefined && lb === deLignee.get(moi) ? lb : la) : da < db ? la : lb;
  }
  return couples;
}

/** Étape 5. Cadres des groupes d'amis de la bulle : les membres placés et leurs familles. */
function cadresDeGroupes(gr: Graphe, dansBulle: (id: string) => boolean, positions: Map<string, Point>): GroupeDessine[] {
  return gr.d.groupes.flatMap((g) => {
    const membres = g.membres.filter(dansBulle);
    if (membres.length === 0) return [];
    const ids = [...new Set(membres.flatMap((m) => parcourir([m], gr.parFamille).filter(dansBulle)))];
    return [{ id: g.id, nom: nomGroupe(gr.d, g), membres, ids, amis: g.membres.filter((m) => m !== gr.moi && positions.has(m)).length }];
  });
}

/** Étape 6. Amitiés tracées hors des cadres : pas entre deux membres de la bulle, ni de Moi vers la bulle. */
function amitiesHorsCadres(gr: Graphe, dansBulle: (id: string) => boolean, positions: Map<string, Point>): Disposition['amities'] {
  const vus = new Set<string>();
  const amities: Disposition['amities'] = [];
  for (const g of gr.d.groupes) {
    const presents = g.membres.filter((m) => positions.has(m));
    presents.forEach((a, i) =>
      presents.slice(i + 1).forEach((b) => {
        const cle = [a, b].sort().join('|');
        if (vus.has(cle) || (dansBulle(a) && dansBulle(b)) || (a === gr.moi && dansBulle(b)) || (b === gr.moi && dansBulle(a))) return;
        vus.add(cle);
        amities.push({ a, b });
      }),
    );
  }
  return amities;
}

/**
 * Étape 7. Personnes de l'arbre principal (hors Moi) qui sont dans un groupe d'amis : le premier groupe trouvé,
 * une personne n'étant que dans un seul groupe à la saisie.
 */
function anneauxDeGroupe(gr: Graphe, places: PlaceArbre[]): Disposition['anneaux'] {
  return places.flatMap((pl) => {
    const g = !pl.bulle && pl.personne.id !== gr.moi ? gr.d.groupes.find((x) => x.membres.includes(pl.personne.id)) : undefined;
    return g ? [{ id: pl.personne.id, groupe: g.id }] : [];
  });
}

export function disposerArbre(donnees: Donnees, moi: string): Disposition {
  // Un enfant qui n'a qu'un parent reçoit un autre parent « ? », dessiné à côté (voir parentSansNom.ts).
  const d = avecParentsSansNom(donnees);
  const gr = graphe(d, moi);
  const { personnes } = gr;
  if (!personnes.has(moi)) return { places: [], couples: [], branches: [], amities: [], groupes: [], etiquettes: [], anneaux: [] };

  // Tous les groupes d'amis sont montrés, même ceux qui ne touchent ni Moi ni sa famille.
  const departs = [moi, ...d.groupes.flatMap((g) => g.membres.filter((m) => personnes.has(m)))];
  const visibles = new Set(parcourir(departs, (id) => [...gr.parFamille(id), ...gr.parAmitie(id)]));
  const deFamille = new Set(parcourir([moi], gr.parFamille));
  const rep = repartirAmis(gr, visibles, deFamille);

  const dansFamille = (id: string) => deFamille.has(id) || rep.place[rep.groupeDe.get(id)!] === 'famille';
  const idsFamille = d.personnes.map((p) => p.id).filter((id) => visibles.has(id) && dansFamille(id));
  const idsBulle = d.personnes.map((p) => p.id).filter((id) => visibles.has(id) && !dansFamille(id));
  const ensBulle = new Set(idsBulle);

  const parents = parentsPrincipaux(d, visibles);
  // Deux parents d'un même enfant sans union enregistrée (un ex) restent côte à côte, près de leurs enfants.
  const coparents = (ids: Set<string>): [string, string][] =>
    [...parents.values()].filter((ps) => ps.length === 2 && ps.every((x) => ids.has(x))).map((ps): [string, string] => [ps[0], ps[1]]);
  const pl: Placement = {
    liensBloc: (ids) => [
      ...d.unions.filter((u) => ids.has(u.personneA) && ids.has(u.personneB)).map((u): [string, string] => [u.personneA, u.personneB]),
      ...coparents(ids),
      ...rep.ancrages.filter(([a]) => ids.has(a)),
    ],
    parents,
    tousParents: tousLesParents(d, visibles),
  };

  // Étape 2. L'arbre principal, Moi en x = 0.
  const positions = new Map<string, Point>();
  const blocDe = new Map<string, Bloc>();
  const principale = disposerPartie({ ids: idsFamille, racines: [moi], liensBloc: pl.liensBloc(new Set(idsFamille)) }, personnes, pl.parents, pl.tousParents);
  const xMoi = principale.positions.get(moi)!.x;
  for (const [id, p] of principale.positions) positions.set(id, { x: p.x - xMoi, y: p.y });
  principale.blocs.forEach((b, id) => blocDe.set(id, b));
  if (idsBulle.length > 0) disposerBulle(gr, idsBulle, rep, pl, positions, blocDe);

  const deLignee = couleursParNom(personnes, positions, donnees);
  const seule = seuleDeSaFamille(personnes, pl.tousParents);
  // Un parent inconnu occupe une place pour le calcul, mais n'est pas dessiné.
  const places = d.personnes.flatMap((p): PlaceArbre[] => {
    const pos = positions.get(p.id);
    if (!pos || p.inconnu) return [];
    return [{ personne: p, x: pos.x, y: pos.y, bulle: ensBulle.has(p.id), lignee: deLignee.get(p.id), ...(seule(p.id) ? { naissance: true as const } : {}) }];
  });
  const dansBulle = (id: string) => ensBulle.has(id) && positions.has(id);
  return {
    places,
    couples: couplesDessines(gr, positions, coparents(new Set(positions.keys())), visibles, deLignee),
    branches: branches(d, visibles, positions, blocDe, deLignee),
    amities: amitiesHorsCadres(gr, dansBulle, positions),
    groupes: cadresDeGroupes(gr, dansBulle, positions),
    etiquettes: etiquettes(personnes, positions, blocDe, pl.tousParents, deLignee, donnees),
    anneaux: anneauxDeGroupe(gr, places),
  };
}

/**
 * Rapproche les familles : chaque famille occupe un intervalle d'abscisses (toutes lignes confondues) ;
 * les familles qui se touchent ou se mêlent forment un ensemble qui ne bouge pas en bloc, et un vide
 * de plus de `ECART_FAMILLES` entre deux ensembles est ramené à `ECART_FAMILLES`.
 */
function resserrer(positions: Map<string, Point>, familles: string[][]) {
  const bornes = familles
    .map((ids) => {
      const xs = ids.flatMap((id) => (positions.has(id) ? [positions.get(id)!.x] : []));
      return { ids, min: Math.min(...xs), max: Math.max(...xs) };
    })
    .filter((f) => f.ids.length > 0 && Number.isFinite(f.min))
    .sort((a, b) => a.min - b.min);
  const ensembles: { ids: string[]; min: number; max: number }[] = [];
  for (const f of bornes) {
    const dernier = ensembles[ensembles.length - 1];
    if (dernier && f.min - dernier.max < ECART_FAMILLES) {
      dernier.ids.push(...f.ids);
      dernier.max = Math.max(dernier.max, f.max);
    } else ensembles.push({ ids: [...f.ids], min: f.min, max: f.max });
  }
  let decalage = 0;
  ensembles.forEach((e, i) => {
    if (i > 0) decalage += Math.max(0, e.min - ensembles[i - 1].max - ECART_FAMILLES);
    for (const id of e.ids) positions.get(id)!.x -= decalage;
    e.min -= decalage;
    e.max -= decalage;
  });
}

/**
 * Seule de sa famille dans l'arbre : aucun parent connu (un parent inconnu ou « ? » ne compte pas) et aucun frère ou
 * sœur. Sinon une étiquette « Famille X » nomme déjà sa famille, et « née X » sous son nom serait de trop.
 */
function seuleDeSaFamille(personnes: Map<string, Personne>, tousParents: Map<string, string[]>): (id: string) => boolean {
  const enfants = new Map<string, number>();
  for (const ps of tousParents.values()) for (const x of ps) enfants.set(x, (enfants.get(x) ?? 0) + 1);
  return (id) =>
    (tousParents.get(id) ?? []).every((x) => {
      const p = personnes.get(x);
      return !!p && (!!p.inconnu || estParentSansNom(p)) && enfants.get(x) === 1;
    });
}

/**
 * Un nom de famille par lignée : au-dessus de chaque bloc (couple ou personne) sans parent dans l'arbre, et
 * au-dessus de chaque conjoint venu d'ailleurs (sans parent dans l'arbre) dont le nom diffère.
 */
function etiquettes(
  personnes: Map<string, Personne>,
  positions: Map<string, Point>,
  blocDe: Map<string, Bloc>,
  tousParents: Map<string, string[]>,
  couleur: Map<string, number>,
  donnees: Donnees,
): EtiquetteFamille[] {
  const res: EtiquetteFamille[] = [];
  const sansParent = (id: string) => (tousParents.get(id) ?? []).length === 0;
  // Une lignée n'est nommée que si elle a une suite : un enfant, ou un frère ou une sœur (parent en commun).
  const parentsAvecEnfants = new Map<string, number>();
  for (const ps of tousParents.values()) for (const x of ps) parentsAvecEnfants.set(x, (parentsAvecEnfants.get(x) ?? 0) + 1);
  const aUneSuite = (id: string) => parentsAvecEnfants.has(id) || (tousParents.get(id) ?? []).some((x) => (parentsAvecEnfants.get(x) ?? 0) > 1);
  for (const bloc of new Set(blocDe.values())) {
    const membres = bloc.membres.map((id) => personnes.get(id)!).filter((p) => !p.inconnu && positions.has(p.id));
    if (membres.length === 0) continue;
    // Un conjoint qui porte déjà le nom de l'autre (nom d'usage) n'a pas d'étiquette : celle de la lignée suffit.
    // La lignée se lit au nom de naissance : une épouse qui porte le nom de son mari ne rend pas son étiquette inutile.
    const nomsDeLaLignee = new Set(
      membres
        .filter((p) => !sansParent(p.id))
        .map((p) => (p.nomNaissance || p.nom).trim())
        .filter(Boolean),
    );
    const libres = membres.filter((p) => sansParent(p.id) && !nomsDeLaLignee.has(p.nom.trim()) && aUneSuite(p.id));
    if (libres.length === 0) continue;
    const nomme = libres.filter((p) => p.nom.trim());
    if (nomme.length === 0) {
      if (membres.some((p) => !sansParent(p.id))) continue;
      const xs = libres.map((p) => positions.get(p.id)!.x);
      res.push({
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: positions.get(libres[0].id)!.y,
        lignee: couleur.get(libres[0].id),
        texte: `Famille de ${libres[0].prenom || libres[0].nom}`,
      });
      continue;
    }
    // Une étiquette par nom distinct ; les hommes d'abord, comme avant, pour la couleur.
    const parNom = new Map<string, Personne[]>();
    for (const p of [...nomme].sort((u, v) => Number(v.sexe === 'M') - Number(u.sexe === 'M'))) {
      const n = p.nom.trim();
      parNom.set(n, [...(parNom.get(n) ?? []), p]);
    }
    const entrees = [...parNom].map(([nom, ps]) => {
      const xs = ps.map((p) => positions.get(p.id)!.x);
      return { nom, ps, x: (Math.min(...xs) + Math.max(...xs)) / 2 };
    });
    entrees.sort((u, v) => u.x - v.x);
    // Deux noms au-dessus d'un même couple : calés de part et d'autre de son milieu, quelle que soit leur longueur.
    // Deux personnes éloignées dans une chaîne ont chacune leur nom centré au-dessus d'elles.
    const rang = new Map(bloc.membres.map((id, i) => [id, i]));
    const voisins = entrees.length === 2 && entrees[0].ps.some((p) => entrees[1].ps.some((q) => Math.abs(rang.get(p.id)! - rang.get(q.id)!) === 1));
    const milieu = (entrees[0].x + entrees[entrees.length - 1].x) / 2;
    entrees.forEach((e, i) => {
      res.push({
        x: voisins ? milieu + (i === 0 ? -0.08 : 0.08) : e.x,
        y: positions.get(e.ps[0].id)!.y,
        lignee: couleur.get(e.ps[0].id),
        texte: `Famille ${e.nom}`,
        ...(voisins ? { ancre: i === 0 ? ('fin' as const) : ('debut' as const) } : {}),
      });
    });
  }
  // Frères et sœurs sans parent connu (parent inconnu caché) : un nom par fratrie et par nom, centré sur elle.
  const fratries = new Map<string, Personne[]>();
  for (const [enfant, ps] of tousParents) {
    const e = personnes.get(enfant)!;
    // Le nom de naissance d'abord : une sœur mariée porte le nom de son mari, pas celui de sa fratrie.
    const nom = (e.nomNaissance || e.nom).trim();
    if (e.inconnu || !positions.has(enfant) || !nom) continue;
    for (const x of ps) if (personnes.get(x)?.inconnu) fratries.set(`${x}|${nom}`, [...(fratries.get(`${x}|${nom}`) ?? []), e]);
  }
  for (const [cle, fr] of fratries) {
    if (fr.length < 2) continue;
    const nom = cle.slice(cle.indexOf('|') + 1);
    const xs = fr.map((e) => positions.get(e.id)!.x);
    res.push({
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: positions.get(fr[0].id)!.y,
      lignee: couleurFamille({ nom }, donnees),
      texte: `Famille ${nom}`,
      fratrie: true,
    });
  }
  return res;
}

/**
 * Parents qui placent l'enfant : les biologiques s'il y en a, sinon les adoptifs (comme `foyer`).
 * Seuls ceux qui sont dans l'arbre comptent.
 */
function parentsPrincipaux(d: Donnees, visibles: Set<string>): Map<string, string[]> {
  const bio = new Map<string, string[]>();
  const adoptifs = new Map<string, string[]>();
  for (const f of d.filiations) {
    if (!visibles.has(f.parent) || !visibles.has(f.enfant)) continue;
    const m = f.type === 'biologique' ? bio : adoptifs;
    m.set(f.enfant, [...(m.get(f.enfant) ?? []), f.parent]);
  }
  const res = new Map(adoptifs);
  for (const [e, p] of bio) res.set(e, p);
  return res;
}

/** Branches : une par paire de parents (biologiques, puis adoptifs), avec ses enfants. */
function branches(d: Donnees, visibles: Set<string>, positions: Map<string, Point>, blocDe: Map<string, Bloc>, deLignee: Map<string, number>): Branche[] {
  const inconnus = new Set(d.personnes.filter((p) => p.inconnu).map((p) => p.id));
  const paires = new Map<string, { parents: string[]; enfants: { id: string; adoptif: boolean }[] }>();
  const parType = new Map<string, { biologique: string[]; adoptif: string[] }>();
  for (const f of d.filiations) {
    if (!visibles.has(f.parent) || !visibles.has(f.enfant)) continue;
    const t = parType.get(f.enfant) ?? { biologique: [], adoptif: [] };
    t[f.type].push(f.parent);
    parType.set(f.enfant, t);
  }
  for (const [enfant, t] of parType) {
    for (const [type, ps] of [
      ['biologique', t.biologique],
      ['adoptif', t.adoptif],
    ] as const) {
      if (ps.length === 0) continue;
      const parents = [...ps].sort((a, b) => positions.get(a)!.x - positions.get(b)!.x);
      const cle = parents.join('|');
      const paire = paires.get(cle) ?? { parents, enfants: [] };
      paire.enfants.push({ id: enfant, adoptif: type === 'adoptif' });
      paires.set(cle, paire);
    }
  }
  const res = [...paires.values()].map(({ parents, enfants }) => {
    const pts = parents.map((id) => positions.get(id)!);
    const [a, b] = parents;
    const voisins =
      parents.length === 2 && blocDe.get(a) === blocDe.get(b) && Math.abs(blocDe.get(a)!.membres.indexOf(a) - blocDe.get(a)!.membres.indexOf(b)) === 1;
    const origines = voisins
      ? [{ x: (pts[0].x + pts[1].x) / 2, y: pts[0].y }]
      : parents.map((id, i) => ({ ...pts[i], parent: id, ...(inconnus.has(id) ? { inconnu: true as const } : {}) }));
    return {
      origines,
      // La couleur de la lignée des parents (celui qui n'a pas de parents dans l'arbre en premier), pas celle d'un enfant qui porte un autre nom.
      lignee: deLignee.get(parents.find((id) => !parType.has(id)) ?? parents[0]) ?? deLignee.get(enfants[0].id),
      bus: Math.max(...pts.map((p) => p.y)) + 0.5,
      enfants: enfants.map((e) => ({ ...e, ...positions.get(e.id)! })).sort((x, y) => x.x - y.x),
    };
  });
  const parentsDe = new Map(res.map((b, i) => [b, [...paires.values()][i].parents]));
  etagerBus(res, parentsDe);
  return res;
}

/** Portée horizontale d'une branche : de son parent le plus à gauche à son enfant le plus à droite. */
function portee(b: Branche): [number, number] {
  const xs = [...b.origines.filter((o) => !o.inconnu).map((o) => o.x), ...b.enfants.map((e) => e.x)];
  return [Math.min(...xs), Math.max(...xs)];
}

/**
 * Deux traits communs de la même ligne qui se chevauchent se confondraient : chacun prend alors sa hauteur
 * (coloration d'intervalles). Une branche seule sur sa portée garde la hauteur d'origine.
 * Deux fratries sans parent commun à moins de `ECART_FAMILLES` l'une de l'autre (point 13) prennent aussi deux
 * hauteurs : au même niveau, leurs traits paraîtraient n'en faire qu'un.
 */
function etagerBus(brs: Branche[], parentsDe: Map<Branche, string[]>): void {
  const collees = (a: Branche, b: Branche) =>
    !parentsDe.get(a)!.some((p) => parentsDe.get(b)!.includes(p)) &&
    Math.min(...b.enfants.map((e) => e.x)) - Math.max(...a.enfants.map((e) => e.x)) < ECART_FAMILLES - 1e-6;
  const parLigne = new Map<number, Branche[]>();
  for (const b of brs) parLigne.set(b.bus, [...(parLigne.get(b.bus) ?? []), b]);
  for (const [base, ligne] of parLigne) {
    const niveaux: { fin: number; derniere: Branche }[] = [];
    const niveauDe = new Map<Branche, number>();
    for (const b of [...ligne].sort((p, q) => portee(p)[0] - portee(q)[0])) {
      const [lo, hi] = portee(b);
      let k = niveaux.findIndex((n) => n.fin < lo - MARGE_BUS && !collees(n.derniere, b));
      if (k < 0) k = niveaux.length;
      niveaux[k] = { fin: hi, derniere: b };
      niveauDe.set(b, k);
    }
    if (niveaux.length < 2) continue;
    const pas = Math.min(PAS_BUS, (BANDE_BUS[1] - BANDE_BUS[0]) / (niveaux.length - 1));
    for (const b of ligne) b.bus = base - 0.5 + BANDE_BUS[0] + niveauDe.get(b)! * pas;
  }
}

/** Couleur de famille de chaque personne placée (la même que dans la liste et la fiche). */
function couleursParNom(personnes: Map<string, Personne>, positions: Map<string, Point>, d: Donnees): Map<string, number> {
  const res = new Map<string, number>();
  for (const id of positions.keys()) {
    const p = personnes.get(id);
    const k = p && !p.inconnu ? couleurFamille(p, d) : undefined;
    if (k !== undefined) res.set(id, k);
  }
  return res;
}
