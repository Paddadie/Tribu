// Arbre global : place toutes les personnes reliées à « Moi », une ligne par génération (maquette A).
// Unités : x en « places » (deux conjoints voisins sont à 1 l'un de l'autre), y en générations (Moi en 0, 0).
// La famille de Moi forme l'arbre principal ; ses amis et leurs familles vont dans une bulle sous l'arbre.
// Les personnes sans lien avec Moi ne sont pas placées.

import { comparerParNaissance, nomGroupe } from './deductions';
import { avecParentsSansNom } from './parentSansNom';
import type { Donnees, Personne } from './types';

/** Écart minimal entre deux personnes de blocs voisins d'une même ligne (deux conjoints : 1). */
export const ECART_BLOCS = 1.25;
/** Écart entre deux blocs voisins de familles différentes (sans parent commun) : un peu d'air pour les distinguer. */
export const ECART_FAMILLES = 2;
/** Hauteurs possibles du trait commun, sous la ligne des parents (en générations), et écart entre deux niveaux. */
const BANDE_BUS: [number, number] = [0.56, 0.8];
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
}

export interface Disposition {
  places: PlaceArbre[];
  couples: { a: string; b: string; separe: boolean; marie: boolean; lignee?: number }[];
  branches: Branche[];
  /** Amitiés à tracer hors des cadres : celles de Moi avec la bulle sont remplacées par un seul trait vers la bulle, et les amis d'un même groupe de la bulle n'en ont pas. */
  amities: { a: string; b: string }[];
  groupes: GroupeDessine[];
  etiquettes: EtiquetteFamille[];
}

type Voisins = Map<string, string[]>;

function lier(m: Voisins, a: string, b: string): void {
  const va = m.get(a) ?? [];
  va.push(b);
  m.set(a, va);
  const vb = m.get(b) ?? [];
  vb.push(a);
  m.set(b, vb);
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

/** Une partie de l'arbre (la famille, ou la bulle) avec ses liens internes. */
interface Partie {
  ids: string[];
  /** Départs du calcul des générations : la première trouvée de chaque composante est en génération 0. */
  racines: string[];
  /** Liens qui gardent deux personnes côte à côte sur la même ligne : unions, et l'amitié qui rattache un ami. */
  liensBloc: [string, string][];
}

interface Bloc {
  membres: string[];
  g: number;
  gauche: number;
}

export function disposerArbre(donnees: Donnees, moi: string): Disposition {
  // Un enfant qui n'a qu'un parent reçoit un autre parent « ? », dessiné à côté (voir parentSansNom.ts).
  const d = avecParentsSansNom(donnees);
  const personnes = new Map(d.personnes.map((p) => [p.id, p]));
  const vide: Disposition = { places: [], couples: [], branches: [], amities: [], groupes: [], etiquettes: [] };
  if (!personnes.has(moi)) return vide;

  const famille: Voisins = new Map();
  const amis: Voisins = new Map();
  for (const f of d.filiations) if (personnes.has(f.parent) && personnes.has(f.enfant)) lier(famille, f.parent, f.enfant);
  for (const u of d.unions) if (personnes.has(u.personneA) && personnes.has(u.personneB)) lier(famille, u.personneA, u.personneB);
  // Les membres d'un groupe d'amis sont amis deux à deux.
  for (const g of d.groupes) {
    const presents = g.membres.filter((m) => personnes.has(m));
    presents.forEach((a, i) => presents.slice(i + 1).forEach((b) => lier(amis, a, b)));
  }
  const parFamille = (id: string) => famille.get(id) ?? [];
  const parAmitie = (id: string) => amis.get(id) ?? [];
  const parPrenom = (ids: string[]) =>
    [...ids].sort((a, b) => {
      const pa = personnes.get(a)!;
      const pb = personnes.get(b)!;
      return `${pa.prenom} ${pa.nom}`.localeCompare(`${pb.prenom} ${pb.nom}`, 'fr');
    });

  // Tous les groupes d'amis sont montrés, même ceux qui ne touchent ni Moi ni sa famille.
  const departs = [moi, ...d.groupes.flatMap((g) => g.membres.filter((m) => personnes.has(m)))];
  const visibles = new Set(parcourir(departs, (id) => [...parFamille(id), ...parAmitie(id)]));
  const deFamille = new Set(parcourir([moi], parFamille));

  // Groupes d'amis : chaque ami avec sa propre famille (composantes par les liens de famille, hors famille de Moi).
  const groupeDe = new Map<string, number>();
  const groupes: string[][] = [];
  for (const p of d.personnes) {
    if (!visibles.has(p.id) || deFamille.has(p.id) || groupeDe.has(p.id)) continue;
    const g = parcourir([p.id], parFamille);
    g.forEach((id) => groupeDe.set(id, groupes.length));
    groupes.push(g);
  }

  // Où va chaque groupe : amis de Moi dans la bulle ; amis d'un autre membre de la famille à côté de lui ;
  // puis, de proche en proche, l'ami d'un ami suit le groupe de son ami.
  const place: ('famille' | 'bulle' | undefined)[] = groupes.map(() => undefined);
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

  const dansFamille = (id: string) => deFamille.has(id) || place[groupeDe.get(id)!] === 'famille';
  const unionsDans = (ids: Set<string>) =>
    d.unions.filter((u) => ids.has(u.personneA) && ids.has(u.personneB)).map((u): [string, string] => [u.personneA, u.personneB]);

  const idsFamille = d.personnes.map((p) => p.id).filter((id) => visibles.has(id) && dansFamille(id));
  const idsBulle = d.personnes.map((p) => p.id).filter((id) => visibles.has(id) && !dansFamille(id));
  const ensFamille = new Set(idsFamille);
  const ensBulle = new Set(idsBulle);

  const parents = parentsPrincipaux(d, visibles);
  const tousParents = new Map<string, string[]>();
  for (const f of d.filiations) {
    if (visibles.has(f.parent) && visibles.has(f.enfant)) tousParents.set(f.enfant, [...(tousParents.get(f.enfant) ?? []), f.parent]);
  }
  // Deux parents d'un même enfant sans union enregistrée (un ex) restent côte à côte, près de leurs enfants.
  const coparents = (ids: Set<string>): [string, string][] =>
    [...parents.values()].filter((ps) => ps.length === 2 && ps.every((x) => ids.has(x))).map((ps): [string, string] => [ps[0], ps[1]]);
  const positions = new Map<string, Point>();
  const blocDe = new Map<string, Bloc>();

  const principale = disposerPartie(
    { ids: idsFamille, racines: [moi], liensBloc: [...unionsDans(ensFamille), ...coparents(ensFamille), ...ancrages.filter(([a]) => ensFamille.has(a))] },
    personnes,
    parents,
    tousParents,
  );
  const xMoi = principale.positions.get(moi)!.x;
  for (const [id, p] of principale.positions) positions.set(id, { x: p.x - xMoi, y: p.y });
  principale.blocs.forEach((b, id) => blocDe.set(id, b));

  if (idsBulle.length > 0) {
    // Chaque groupe d'amis (avec les groupes qui partagent une famille) est disposé à part, puis posé à côté
    // du précédent : leurs cadres ne peuvent pas se mêler.
    const parent = groupes.map((_, i) => i);
    const racine = (i: number): number => (parent[i] === i ? i : (parent[i] = racine(parent[i])));
    for (const g of d.groupes) {
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
    let bord: number | undefined;
    for (const ids of [...amas.values()].sort((u, v) => rangRacine(u) - rangRacine(v))) {
      const ens = new Set(ids);
      const racines = racinesBulle.filter((r) => ens.has(r));
      const partie = disposerPartie(
        { ids, racines: racines.length > 0 ? racines : [ids[0]], liensBloc: [...unionsDans(ens), ...coparents(ens), ...ancrages.filter(([a]) => ens.has(a))] },
        personnes,
        parents,
        tousParents,
      );
      // Familles d'amis voisines : les grands vides entre deux familles sont resserrés (sans changer leur ordre).
      resserrer(partie.positions, groupes.map((g) => g.filter((id) => ens.has(id))).filter((g) => g.length > 0));
      const xs = [...partie.positions.values()].map((p) => p.x);
      const ys = [...partie.positions.values()].map((p) => p.y);
      const decalage = bord === undefined ? 0 : bord - Math.min(...xs);
      for (const [id, p] of partie.positions) positions.set(id, { x: p.x + decalage, y: p.y + haut - Math.min(...ys) });
      bord = Math.max(...xs) + decalage + ECART_FAMILLES;
      partie.blocs.forEach((b, id) => blocDe.set(id, b));
    }
    // La bulle entière est centrée sous Moi.
    const xsBulle = idsBulle.map((id) => positions.get(id)!.x);
    const milieuX = (Math.min(...xsBulle) + Math.max(...xsBulle)) / 2;
    for (const id of idsBulle) positions.get(id)!.x -= milieuX;
  }

  const deLignee = couleursParNom(personnes, positions);
  // Un parent inconnu occupe une place pour le calcul, mais n'est pas dessiné.
  const places = d.personnes.flatMap((p) => {
    const pos = positions.get(p.id);
    return pos && !p.inconnu ? [{ personne: p, x: pos.x, y: pos.y, bulle: ensBulle.has(p.id), lignee: deLignee.get(p.id) }] : [];
  });
  const couples: Disposition['couples'] = d.unions
    .filter((u) => positions.has(u.personneA) && positions.has(u.personneB))
    .map((u) => ({ a: u.personneA, b: u.personneB, separe: u.statut === 'separee', marie: u.marie }));
  // Deux parents d'un même enfant sans union enregistrée : un ex, relié lui aussi (en pointillés).
  const cle = (a: string, b: string) => [a, b].sort().join('|');
  const vus = new Set(couples.map((c) => cle(c.a, c.b)));
  for (const [x, y] of [...coparents(new Set(positions.keys()))]) {
    if (vus.has(cle(x, y)) || !visibles.has(x) || !visibles.has(y)) continue;
    vus.add(cle(x, y));
    couples.push({ a: x, b: y, separe: true, marie: false });
  }
  // Un couple prend la couleur de celui des deux qui est le plus proche de Moi (parenté, unions comprises).
  const voisinsMoi = new Map<string, string[]>();
  const relier = (a: string, b: string) => {
    voisinsMoi.set(a, [...(voisinsMoi.get(a) ?? []), b]);
    voisinsMoi.set(b, [...(voisinsMoi.get(b) ?? []), a]);
  };
  for (const u of d.unions) relier(u.personneA, u.personneB);
  for (const f of d.filiations) relier(f.parent, f.enfant);
  const distance = new Map<string, number>([[moi, 0]]);
  for (const file = [moi]; file.length > 0; ) {
    const c = file.shift()!;
    for (const v of voisinsMoi.get(c) ?? []) if (!distance.has(v)) (distance.set(v, distance.get(c)! + 1), file.push(v));
  }
  for (const c of couples) {
    const [da, db] = [distance.get(c.a) ?? Infinity, distance.get(c.b) ?? Infinity];
    const [la, lb] = [deLignee.get(c.a), deLignee.get(c.b)];
    // À égalité (deux parents), la couleur de ma famille si l'un en est.
    c.lignee = da === db ? (lb !== undefined && lb === deLignee.get(moi) ? lb : la) : da < db ? la : lb;
  }
  const dansBulle = (id: string) => ensBulle.has(id) && positions.has(id);
  const cadres: GroupeDessine[] = d.groupes.flatMap((g) => {
    const membres = g.membres.filter(dansBulle);
    if (membres.length === 0) return [];
    const ids = [...new Set(membres.flatMap((m) => parcourir([m], parFamille).filter(dansBulle)))];
    return [{ id: g.id, nom: nomGroupe(d, g), membres, ids, amis: g.membres.filter((m) => m !== moi && positions.has(m)).length }];
  });
  // Tracé des amitiés hors des cadres : pas entre deux membres de la bulle, ni de Moi vers la bulle.
  const vusAmities = new Set<string>();
  const amities: { a: string; b: string }[] = [];
  for (const g of d.groupes) {
    const presents = g.membres.filter((m) => positions.has(m));
    presents.forEach((a, i) =>
      presents.slice(i + 1).forEach((b) => {
        const cle = [a, b].sort().join('|');
        if (vusAmities.has(cle) || (dansBulle(a) && dansBulle(b)) || (a === moi && dansBulle(b)) || (b === moi && dansBulle(a))) return;
        vusAmities.add(cle);
        amities.push({ a, b });
      }),
    );
  }
  return { places, couples, branches: branches(d, visibles, positions, blocDe, deLignee), amities, groupes: cadres, etiquettes: etiquettes(personnes, positions, blocDe, tousParents, deLignee) };
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
 * Un nom de famille par lignée : au-dessus de chaque bloc (couple ou personne) sans parent dans l'arbre, et
 * au-dessus de chaque conjoint venu d'ailleurs (sans parent dans l'arbre) dont le nom diffère.
 */
function etiquettes(
  personnes: Map<string, Personne>,
  positions: Map<string, Point>,
  blocDe: Map<string, Bloc>,
  tousParents: Map<string, string[]>,
  couleur: Map<string, number>,
): EtiquetteFamille[] {
  const res: EtiquetteFamille[] = [];
  const sansParent = (id: string) => (tousParents.get(id) ?? []).length === 0;
  // Une lignée n'est nommée que si elle a une suite : un enfant, ou un frère ou une sœur (parent en commun).
  const parentsAvecEnfants = new Map<string, number>();
  for (const ps of tousParents.values()) for (const x of ps) parentsAvecEnfants.set(x, (parentsAvecEnfants.get(x) ?? 0) + 1);
  const aUneSuite = (id: string) =>
    parentsAvecEnfants.has(id) || (tousParents.get(id) ?? []).some((x) => (parentsAvecEnfants.get(x) ?? 0) > 1);
  for (const bloc of new Set(blocDe.values())) {
    const membres = bloc.membres.map((id) => personnes.get(id)!).filter((p) => !p.inconnu && positions.has(p.id));
    if (membres.length === 0) continue;
    // Un conjoint qui porte déjà le nom de l'autre (nom d'usage) n'a pas d'étiquette : celle de la lignée suffit.
    const nomsDeLaLignee = new Set(membres.filter((p) => !sansParent(p.id)).map((p) => p.nom.trim()).filter(Boolean));
    const libres = membres.filter((p) => sansParent(p.id) && !nomsDeLaLignee.has(p.nom.trim()) && aUneSuite(p.id));
    if (libres.length === 0) continue;
    const nomme = libres.filter((p) => p.nom.trim());
    if (nomme.length === 0) {
      if (membres.some((p) => !sansParent(p.id))) continue;
      const xs = libres.map((p) => positions.get(p.id)!.x);
      res.push({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: positions.get(libres[0].id)!.y, lignee: couleur.get(libres[0].id), texte: `Famille de ${libres[0].prenom || libres[0].nom}` });
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
    // Deux noms au-dessus d'un même couple : écartés l'un de l'autre pour ne pas se recouvrir.
    entrees.forEach((e, i) => {
      const decal = entrees.length === 1 ? 0 : i === 0 ? -0.35 : i === entrees.length - 1 ? 0.35 : 0;
      res.push({ x: e.x + decal, y: positions.get(e.ps[0].id)!.y, lignee: couleur.get(e.ps[0].id), texte: `Famille ${e.nom}` });
    });
  }
  // Frères et sœurs sans parent connu (parent inconnu caché) : un nom par fratrie et par nom, centré sur elle.
  const fratries = new Map<string, Personne[]>();
  for (const [enfant, ps] of tousParents) {
    const e = personnes.get(enfant)!;
    if (e.inconnu || !positions.has(enfant) || !e.nom.trim()) continue;
    for (const x of ps) if (personnes.get(x)?.inconnu) fratries.set(`${x}|${e.nom.trim()}`, [...(fratries.get(`${x}|${e.nom.trim()}`) ?? []), e]);
  }
  for (const fr of fratries.values()) {
    if (fr.length < 2) continue;
    const xs = fr.map((e) => positions.get(e.id)!.x);
    res.push({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: positions.get(fr[0].id)!.y, lignee: couleur.get(fr[0].id), texte: `Famille ${fr[0].nom.trim()}`, fratrie: true });
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
    for (const [type, ps] of [['biologique', t.biologique], ['adoptif', t.adoptif]] as const) {
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
      parents.length === 2 &&
      blocDe.get(a) === blocDe.get(b) &&
      Math.abs(blocDe.get(a)!.membres.indexOf(a) - blocDe.get(a)!.membres.indexOf(b)) === 1;
    const origines = voisins
      ? [{ x: (pts[0].x + pts[1].x) / 2, y: pts[0].y }]
      : parents.map((id, i) => ({ ...pts[i], parent: id, ...(inconnus.has(id) ? { inconnu: true as const } : {}) }));
    return {
      origines,
      // La couleur de la lignée des parents (celui qui n'a pas de parents dans l'arbre en premier), pas celle d'un enfant qui porte un autre nom.
      lignee: deLignee.get(parents.find((id) => !parType.has(id)) ?? parents[0]) ?? deLignee.get(enfants[0].id),
      bus: Math.max(...pts.map((p) => p.y)) + 0.5,
      enfants: enfants
        .map((e) => ({ ...e, ...positions.get(e.id)! }))
        .sort((x, y) => x.x - y.x),
    };
  });
  etagerBus(res);
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
 */
function etagerBus(brs: Branche[]): void {
  const parLigne = new Map<number, Branche[]>();
  for (const b of brs) parLigne.set(b.bus, [...(parLigne.get(b.bus) ?? []), b]);
  for (const [base, ligne] of parLigne) {
    const niveaux: number[] = [];
    const niveauDe = new Map<Branche, number>();
    for (const b of [...ligne].sort((p, q) => portee(p)[0] - portee(q)[0])) {
      const [lo, hi] = portee(b);
      let k = niveaux.findIndex((fin) => fin < lo - MARGE_BUS);
      if (k < 0) k = niveaux.length;
      niveaux[k] = hi;
      niveauDe.set(b, k);
    }
    if (niveaux.length < 2) continue;
    const pas = Math.min(PAS_BUS, (BANDE_BUS[1] - BANDE_BUS[0]) / (niveaux.length - 1));
    for (const b of ligne) b.bus = base - 0.5 + BANDE_BUS[0] + niveauDe.get(b)! * pas;
  }
}

/** Place une partie : générations, blocs côte à côte, ordre dans chaque ligne, puis abscisses. */
function disposerPartie(
  partie: Partie,
  personnes: Map<string, Personne>,
  parentsDe: Map<string, string[]>,
  tousParents: Map<string, string[]>,
): { positions: Map<string, Point>; blocs: Map<string, Bloc> } {
  const dans = new Set(partie.ids);
  const p = (id: string) => personnes.get(id)!;

  // Blocs : personnes reliées par les liens de bloc (union-find).
  const chef = new Map(partie.ids.map((id) => [id, id]));
  const trouver = (id: string): string => {
    let r = id;
    while (chef.get(r) !== r) r = chef.get(r)!;
    chef.set(id, r);
    return r;
  };
  for (const [a, b] of partie.liensBloc) chef.set(trouver(a), trouver(b));
  const membresDe = new Map<string, string[]>();
  for (const id of partie.ids) membresDe.set(trouver(id), [...(membresDe.get(trouver(id)) ?? []), id]);

  // Parents et enfants dans la partie (les parents principaux seulement, pour le placement).
  const parents = (id: string) => (parentsDe.get(id) ?? []).filter((x) => dans.has(x));
  const enfantsDe = new Map<string, string[]>();
  for (const id of partie.ids) for (const x of parents(id)) enfantsDe.set(x, [...(enfantsDe.get(x) ?? []), id]);
  const enfants = (id: string) => enfantsDe.get(id) ?? [];
  // Pour les générations, tous les parents comptent (adoptifs compris).
  const tousParentsDe = new Map<string, string[]>();
  const tousEnfantsDe = new Map<string, string[]>();
  for (const id of partie.ids) {
    for (const x of tousParents.get(id) ?? []) {
      if (!dans.has(x)) continue;
      tousParentsDe.set(id, [...(tousParentsDe.get(id) ?? []), x]);
      tousEnfantsDe.set(x, [...(tousEnfantsDe.get(x) ?? []), id]);
    }
  }

  // Générations, bloc par bloc : un parent est une ligne au-dessus. En cas de contradiction, la première trouvée reste.
  const gen = new Map<string, number>();
  const ordreDecouverte: string[] = [];
  for (const depart of [...partie.racines, ...partie.ids]) {
    const c0 = trouver(depart);
    if (gen.has(c0)) continue;
    gen.set(c0, 0);
    const file = [c0];
    for (let i = 0; i < file.length; i++) {
      const c = file[i];
      ordreDecouverte.push(c);
      const g = gen.get(c)!;
      for (const m of membresDe.get(c)!) {
        for (const [voisins, dg] of [[tousParentsDe.get(m) ?? [], -1], [tousEnfantsDe.get(m) ?? [], 1]] as const) {
          for (const v of voisins) {
            const cv = trouver(v);
            if (gen.has(cv)) continue;
            gen.set(cv, g + dg);
            file.push(cv);
          }
        }
      }
    }
  }

  // Lignes de blocs, dans l'ordre de découverte au départ.
  const blocDe = new Map<string, Bloc>();
  const lignes = new Map<number, Bloc[]>();
  for (const c of ordreDecouverte) {
    const bloc: Bloc = { membres: chaine(membresDe.get(c)!, partie.liensBloc, p), g: gen.get(c)!, gauche: 0 };
    bloc.membres.forEach((m) => blocDe.set(m, bloc));
    lignes.set(bloc.g, [...(lignes.get(bloc.g) ?? []), bloc]);
  }
  const gens = [...lignes.keys()].sort((a, b) => a - b);
  // Écart entre deux voisins d'un bloc : 1, sauf dans une chaîne (ex – personne – conjoint) où il s'élargit
  // pour que les enfants de chaque couple se centrent sous leurs parents.
  const ecartPaire = new Map<string, number>();
  const clePaire = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const decalages = (b: Bloc) => {
    const r = [0];
    for (let i = 1; i < b.membres.length; i++) r.push(r[i - 1] + (ecartPaire.get(clePaire(b.membres[i - 1], b.membres[i])) ?? 1));
    return r;
  };
  const largeur = (b: Bloc) => decalages(b)[b.membres.length - 1];
  const x = (id: string) => blocDe.get(id)!.gauche + decalages(blocDe.get(id)!)[blocDe.get(id)!.membres.indexOf(id)];
  /** Deux blocs voisins sont de la même famille s'ils ont un parent en commun (ou aucun parent ni l'un ni l'autre). */
  const parentsDuBloc = (b: Bloc) => new Set(b.membres.flatMap(parents));
  const ecartApres = (ligne: Bloc[], i: number) => {
    const [a, b] = [parentsDuBloc(ligne[i]), parentsDuBloc(ligne[i + 1])];
    if (a.size === 0 && b.size === 0) return ECART_BLOCS;
    return [...a].some((x) => b.has(x)) ? ECART_BLOCS : ECART_FAMILLES;
  };
  const pasDe = (ligne: Bloc[]) => ligne.map((b, i) => largeur(b) + (i < ligne.length - 1 ? ecartApres(ligne, i) : ECART_BLOCS));
  const tasser = (ligne: Bloc[]) => {
    const pas = pasDe(ligne);
    let g = 0;
    ligne.forEach((b, i) => {
      b.gauche = g;
      g += pas[i];
    });
  };
  const moyenne = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : undefined);
  /** Position de référence d'un membre : milieu de ses parents (vers le haut) ou de ses enfants (vers le bas). */
  const repere = (id: string, versHaut: boolean) => moyenne((versHaut ? parents(id) : enfants(id)).map(x));

  // Sens de chaque bloc : un membre se met du côté de ses parents (ou de ses enfants). Sans indice, un couple
  // met l'homme à gauche (côté paternel à gauche), sinon l'aîné.
  const orienter = (b: Bloc, versHaut: boolean) => {
    if (b.membres.length < 2) return;
    const n = b.membres.length;
    const centre = b.gauche + largeur(b) / 2;
    const dec = decalages(b);
    let score = 0;
    b.membres.forEach((m, i) => {
      // Une chaîne (ex – personne – conjoint) tient compte des parents et des enfants à la fois.
      for (const haut of n >= 3 ? [true, false] : [versHaut]) {
        const r = repere(m, haut);
        if (r !== undefined) score += (r - centre) * (dec[i] - largeur(b) / 2);
      }
    });
    if (score < -1e-9) b.membres.reverse();
    else if (Math.abs(score) <= 1e-9 && n === 2 && !b.membres.some((m) => repere(m, true) !== undefined || repere(m, false) !== undefined)) {
      const [a, c] = b.membres.map(p);
      const inverser = a.sexe === 'F' && c.sexe === 'M' ? true : a.sexe === c.sexe || !a.sexe || !c.sexe ? comparerParNaissance(a, c) > 0 : false;
      if (inverser) b.membres.reverse();
    }
  };

  // Ordre dans chaque ligne : barycentres des parents en descendant, des enfants en remontant.
  const trier = (g: number, versHaut: boolean) => {
    const ligne = lignes.get(g)!;
    const cle = new Map<Bloc, number>();
    for (const b of ligne) {
      // Clé : où les membres reliés veulent être, sans tenir compte de leur rang dans le bloc
      // (sinon un frère suivi de son conjoint passerait après son cadet).
      const reps = b.membres.flatMap((m) => {
        const r = repere(m, versHaut);
        return r === undefined ? [] : [r];
      });
      cle.set(b, moyenne(reps) ?? b.gauche + largeur(b) / 2);
    }
    // À égalité (frères et sœurs sous les mêmes parents), l'aîné à gauche.
    const aine = (b: Bloc) => b.membres.find((m) => parents(m).length > 0) ?? b.membres[0];
    ligne.sort((a, b) => cle.get(a)! - cle.get(b)! || (versHaut ? comparerParNaissance(p(aine(a)), p(aine(b))) : 0));
    // Les frères et sœurs (un parent en commun) restent côte à côte : un bloc sans lien ne s'intercale pas entre eux.
    const groupes: Bloc[] = [];
    for (const b of ligne) {
      if (groupes.includes(b)) continue;
      groupes.push(b);
      const mien = parentsDuBloc(b);
      if (mien.size === 0) continue;
      for (const autre of ligne) if (!groupes.includes(autre) && [...parentsDuBloc(autre)].some((x) => mien.has(x))) groupes.push(autre);
    }
    ligne.splice(0, ligne.length, ...groupes);
    tasser(ligne);
    for (const b of ligne) orienter(b, versHaut);
  };
  gens.forEach((g) => tasser(lignes.get(g)!));
  for (const g of gens) lignes.get(g)!.forEach((b) => orienter(b, true));
  for (let tour = 0; tour < 8; tour++) {
    for (const g of gens.slice(1)) trier(g, true);
    for (const g of [...gens].reverse().slice(1)) trier(g, false);
  }
  for (const g of gens.slice(1)) trier(g, true);

  // Abscisses : les enfants se centrent sous leurs parents, les parents au-dessus de leurs enfants ;
  // l'ordre et l'écart minimal de chaque ligne sont gardés (régression isotone).
  const placer = (g: number, versHaut: boolean) => {
    const ligne = lignes.get(g)!;
    const voeux = ligne.map((b) => {
      const dec = decalages(b);
      // Chaque lien compte : vers les parents (une fois) et vers les enfants (une fois par enfant).
      const reps = b.membres.flatMap((m, i) =>
        [true, false].flatMap((haut) => {
          const r = repere(m, haut);
          return r === undefined ? [] : Array<number>(haut ? 1 : 12 * enfants(m).length).fill(r - dec[i]);
        }),
      );
      const v = moyenne(reps);
      return v === undefined ? { cible: b.gauche, poids: 0.5 } : { cible: v, poids: reps.length };
    });
    const gauches = isotone(voeux, pasDe(ligne));
    ligne.forEach((b, i) => (b.gauche = gauches[i]));
    // Le sens se règle sur les vraies positions : le conjoint ou l'ami se met du côté opposé à la fratrie.
    if (versHaut) ligne.forEach((b) => orienter(b, true));
  };
  const placerTout = () => {
    for (let tour = 0; tour < 12; tour++) {
      for (const g of gens.slice(1)) placer(g, true);
      for (const g of [...gens].reverse().slice(1)) placer(g, false);
    }
  };
  placerTout();
  // Chaîne de plus de deux personnes : chaque couple s'écarte de la largeur de ses enfants, puis on replace.
  for (let essai = 0; essai < 3; essai++) {
    let change = false;
    for (const b of new Set(blocDe.values())) {
      if (b.membres.length < 3) continue;
      for (let i = 1; i < b.membres.length; i++) {
        const [u, v] = [b.membres[i - 1], b.membres[i]];
        const enfs = [...new Set([...enfants(u), ...enfants(v)])].filter((e) => parents(e).includes(u) && parents(e).includes(v));
        if (enfs.length === 0) continue;
        const gauches = enfs.map((e) => blocDe.get(e)!.gauche);
        const droites = enfs.map((e) => blocDe.get(e)!.gauche + largeur(blocDe.get(e)!));
        // Largeur des enfants, plus la place entre ce groupe et celui du couple voisin.
        const voisins = (i > 1 ? 1 : 0) + (i < b.membres.length - 1 ? 1 : 0);
        const voulu = Math.max(1, Math.max(...droites) - Math.min(...gauches) + voisins * ECART_BLOCS);
        const cle = clePaire(u, v);
        if (Math.abs((ecartPaire.get(cle) ?? 1) - voulu) > 0.01) {
          ecartPaire.set(cle, voulu);
          change = true;
        }
      }
    }
    if (!change) break;
    placerTout();
  }
  for (const g of gens) lignes.get(g)!.forEach((b) => orienter(b, true));

  // Enfant unique de deux parents côte à côte : exactement au milieu d'eux. Le déplacer pousse ses voisins
  // de la ligne seulement si leur marge est épuisée.
  const glisser = (b: Bloc, voulu: number) => {
    const ligne = lignes.get(b.g)!;
    const pas = pasDe(ligne);
    const i = ligne.indexOf(b);
    b.gauche = voulu;
    for (let k = i + 1; k < ligne.length && ligne[k].gauche < ligne[k - 1].gauche + pas[k - 1]; k++) ligne[k].gauche = ligne[k - 1].gauche + pas[k - 1];
    for (let k = i - 1; k >= 0 && ligne[k].gauche > ligne[k + 1].gauche - pas[k]; k--) ligne[k].gauche = ligne[k + 1].gauche - pas[k];
  };
  for (const g of gens) {
    for (const b of lignes.get(g)!) {
      if (b.membres.length !== 1) continue;
      const m = b.membres[0];
      const [u, v] = parents(m);
      if (u === undefined || v === undefined || parents(m).length !== 2) continue;
      const bp = blocDe.get(u)!;
      if (bp !== blocDe.get(v) || bp.membres.length !== 2) continue;
      if (new Set([...enfants(u), ...enfants(v)]).size !== 1) continue;
      glisser(b, (x(u) + x(v)) / 2);
    }
  }

  const positions = new Map<string, Point>();
  for (const id of partie.ids) positions.set(id, { x: x(id), y: blocDe.get(id)!.g });
  return { positions, blocs: blocDe };
}

/**
 * Ordre des membres d'un bloc : une chaîne (ex – personne – conjoint actuel), parcourue en profondeur depuis
 * un bout (le moins relié, l'aîné à égalité).
 */
function chaine(membres: string[], liens: [string, string][], p: (id: string) => Personne): string[] {
  if (membres.length === 1) return membres;
  const ens = new Set(membres);
  const v: Voisins = new Map();
  for (const [a, b] of liens) if (ens.has(a) && ens.has(b)) lier(v, a, b);
  const degre = (id: string) => new Set(v.get(id) ?? []).size;
  const ordre = (a: string, b: string) => degre(a) - degre(b) || comparerParNaissance(p(a), p(b));
  const res: string[] = [];
  const vus = new Set<string>();
  const visiter = (id: string) => {
    if (vus.has(id)) return;
    vus.add(id);
    res.push(id);
    [...new Set(v.get(id) ?? [])].sort(ordre).forEach(visiter);
  };
  [...membres].sort(ordre).forEach(visiter);
  return res;
}

/**
 * Positions gauches les plus proches des voeux (moindres carrés pondérés), en gardant l'ordre et
 * `pas[i]` d'écart entre le bloc i et le suivant : régression isotone (regroupement des voisins en désaccord).
 */
export function isotone(voeux: { cible: number; poids: number }[], pas: number[]): number[] {
  const decalage: number[] = [];
  let s = 0;
  for (let i = 0; i < voeux.length; i++) {
    decalage.push(s);
    s += pas[i];
  }
  const piles: { somme: number; poids: number; n: number }[] = [];
  voeux.forEach((v, i) => {
    piles.push({ somme: (v.cible - decalage[i]) * v.poids, poids: v.poids, n: 1 });
    while (piles.length > 1) {
      const b = piles[piles.length - 1];
      const a = piles[piles.length - 2];
      if (a.somme / a.poids <= b.somme / b.poids) break;
      piles.splice(-2, 2, { somme: a.somme + b.somme, poids: a.poids + b.poids, n: a.n + b.n });
    }
  });
  const res: number[] = [];
  for (const pile of piles) for (let k = 0; k < pile.n; k++) res.push(pile.somme / pile.poids + decalage[res.length]);
  return res;
}

/** Clé d'un nom de famille : sans casse ni accents ; le nom actuel prime, le nom de naissance sert à défaut. Vide : pas de couleur. */
function cleNom(p: Personne): string {
  return (p.nom || p.nomNaissance || '').trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** Une couleur par nom de famille, numérotée dans l'ordre de lecture (de haut en bas, de gauche à droite). */
function couleursParNom(personnes: Map<string, Personne>, positions: Map<string, Point>): Map<string, number> {
  const numero = new Map<string, number>();
  const res = new Map<string, number>();
  const ordre = [...positions].sort(([, a], [, b]) => a.y - b.y || a.x - b.x);
  for (const [id] of ordre) {
    const p = personnes.get(id);
    const cle = p && !p.inconnu ? cleNom(p) : '';
    if (!cle) continue;
    if (!numero.has(cle)) numero.set(cle, numero.size);
    res.set(id, numero.get(cle)!);
  }
  return res;
}

