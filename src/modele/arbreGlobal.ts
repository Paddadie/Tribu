// Arbre global : place toutes les personnes reliées à « Moi », une ligne par génération (maquette A).
// Unités : x en « places » (deux conjoints voisins sont à 1 l'un de l'autre), y en générations (Moi en 0, 0).
// La famille de Moi forme l'arbre principal ; ses amis et leurs familles vont dans une bulle sous l'arbre.
// Les personnes sans lien avec Moi ne sont pas placées.

import { comparerParNaissance } from './deductions';
import type { Donnees, Personne } from './types';

/** Écart minimal entre deux personnes de blocs voisins d'une même ligne (deux conjoints : 1). */
export const ECART_BLOCS = 1.25;
/** Distance entre la dernière génération de la famille et la première ligne de la bulle des amis. */
export const ECART_BULLE = 1.3;

export interface Point {
  x: number;
  y: number;
}

export interface PlaceArbre extends Point {
  personne: Personne;
  /** Dans la bulle des amis de Moi. */
  bulle: boolean;
}

/** Enfants d'une même paire de parents (ou d'un parent seul), reliés par un trait commun. */
export interface Branche {
  /** Départs : le milieu d'un couple voisin, sinon chaque parent (`parent` renseigné). */
  origines: (Point & { parent?: string })[];
  /** Ordonnée du trait horizontal commun, entre les parents et les enfants. */
  bus: number;
  enfants: (Point & { id: string; adoptif: boolean })[];
}

export interface Disposition {
  places: PlaceArbre[];
  couples: { a: string; b: string; separe: boolean }[];
  branches: Branche[];
  /** Amitiés à tracer ; celles de Moi avec la bulle sont remplacées par un seul trait vers la bulle. */
  amities: { a: string; b: string }[];
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

export function disposerArbre(d: Donnees, moi: string): Disposition {
  const personnes = new Map(d.personnes.map((p) => [p.id, p]));
  const vide: Disposition = { places: [], couples: [], branches: [], amities: [] };
  if (!personnes.has(moi)) return vide;

  const famille: Voisins = new Map();
  const amis: Voisins = new Map();
  for (const f of d.filiations) if (personnes.has(f.parent) && personnes.has(f.enfant)) lier(famille, f.parent, f.enfant);
  for (const u of d.unions) if (personnes.has(u.personneA) && personnes.has(u.personneB)) lier(famille, u.personneA, u.personneB);
  for (const a of d.amities) if (personnes.has(a.personneA) && personnes.has(a.personneB)) lier(amis, a.personneA, a.personneB);
  const parFamille = (id: string) => famille.get(id) ?? [];
  const parAmitie = (id: string) => amis.get(id) ?? [];
  const parPrenom = (ids: string[]) =>
    [...ids].sort((a, b) => {
      const pa = personnes.get(a)!;
      const pb = personnes.get(b)!;
      return `${pa.prenom} ${pa.nom}`.localeCompare(`${pb.prenom} ${pb.nom}`, 'fr');
    });

  const visibles = new Set(parcourir([moi], (id) => [...parFamille(id), ...parAmitie(id)]));
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
  for (const a of parPrenom(parAmitie(moi))) affecter(moi, a, 'bulle', false);
  for (const id of d.personnes.map((p) => p.id)) {
    if (id !== moi && deFamille.has(id)) for (const a of parPrenom(parAmitie(id))) affecter(id, a, 'famille', true);
  }
  for (let i = 0; i < file.length; i++) {
    for (const m of groupes[file[i]]) for (const a of parPrenom(parAmitie(m))) affecter(m, a, place[file[i]]!, true);
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
  const positions = new Map<string, Point>();
  const blocDe = new Map<string, Bloc>();

  const principale = disposerPartie(
    { ids: idsFamille, racines: [moi], liensBloc: [...unionsDans(ensFamille), ...ancrages.filter(([a]) => ensFamille.has(a))] },
    personnes,
    parents,
    tousParents,
  );
  const xMoi = principale.positions.get(moi)!.x;
  for (const [id, p] of principale.positions) positions.set(id, { x: p.x - xMoi, y: p.y });
  principale.blocs.forEach((b, id) => blocDe.set(id, b));

  if (idsBulle.length > 0) {
    const bulle = disposerPartie(
      { ids: idsBulle, racines: racinesBulle, liensBloc: [...unionsDans(ensBulle), ...ancrages.filter(([a]) => ensBulle.has(a))] },
      personnes,
      parents,
      tousParents,
    );
    const xs = [...bulle.positions.values()].map((p) => p.x);
    const ys = [...bulle.positions.values()].map((p) => p.y);
    const milieuX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const haut = Math.max(...[...positions.values()].map((p) => p.y)) + ECART_BULLE - Math.min(...ys);
    for (const [id, p] of bulle.positions) positions.set(id, { x: p.x - milieuX, y: p.y + haut });
    bulle.blocs.forEach((b, id) => blocDe.set(id, b));
  }

  const places = d.personnes.flatMap((p) => {
    const pos = positions.get(p.id);
    return pos ? [{ personne: p, x: pos.x, y: pos.y, bulle: ensBulle.has(p.id) }] : [];
  });
  const couples = d.unions
    .filter((u) => positions.has(u.personneA) && positions.has(u.personneB))
    .map((u) => ({ a: u.personneA, b: u.personneB, separe: u.statut === 'separee' }));
  const amities = d.amities
    .filter((a) => positions.has(a.personneA) && positions.has(a.personneB))
    .filter((a) => !((a.personneA === moi && ensBulle.has(a.personneB)) || (a.personneB === moi && ensBulle.has(a.personneA))))
    .map((a) => ({ a: a.personneA, b: a.personneB }));
  return { places, couples, branches: branches(d, visibles, positions, blocDe), amities };
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
function branches(d: Donnees, visibles: Set<string>, positions: Map<string, Point>, blocDe: Map<string, Bloc>): Branche[] {
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
  return [...paires.values()].map(({ parents, enfants }) => {
    const pts = parents.map((id) => positions.get(id)!);
    const [a, b] = parents;
    const voisins =
      parents.length === 2 &&
      blocDe.get(a) === blocDe.get(b) &&
      Math.abs(blocDe.get(a)!.membres.indexOf(a) - blocDe.get(a)!.membres.indexOf(b)) === 1;
    const origines = voisins
      ? [{ x: (pts[0].x + pts[1].x) / 2, y: pts[0].y }]
      : parents.map((id, i) => ({ ...pts[i], parent: id }));
    return {
      origines,
      bus: Math.max(...pts.map((p) => p.y)) + 0.5,
      enfants: enfants
        .map((e) => ({ ...e, ...positions.get(e.id)! }))
        .sort((x, y) => x.x - y.x),
    };
  });
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
  const x = (id: string) => blocDe.get(id)!.gauche + blocDe.get(id)!.membres.indexOf(id);
  const tasser = (ligne: Bloc[]) => {
    let g = 0;
    for (const b of ligne) {
      b.gauche = g;
      g += b.membres.length - 1 + ECART_BLOCS;
    }
  };
  const moyenne = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : undefined);
  /** Position de référence d'un membre : milieu de ses parents (vers le haut) ou de ses enfants (vers le bas). */
  const repere = (id: string, versHaut: boolean) => moyenne((versHaut ? parents(id) : enfants(id)).map(x));

  // Sens de chaque bloc : un membre se met du côté de ses parents (ou de ses enfants). Sans indice, un couple
  // met l'homme à gauche (côté paternel à gauche), sinon l'aîné.
  const orienter = (b: Bloc, versHaut: boolean) => {
    if (b.membres.length < 2) return;
    const n = b.membres.length;
    const centre = b.gauche + (n - 1) / 2;
    let score = 0;
    b.membres.forEach((m, i) => {
      const r = repere(m, versHaut);
      if (r !== undefined) score += (r - centre) * (i - (n - 1) / 2);
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
      cle.set(b, moyenne(reps) ?? b.gauche + (b.membres.length - 1) / 2);
    }
    // À égalité (frères et sœurs sous les mêmes parents), l'aîné à gauche.
    const aine = (b: Bloc) => b.membres.find((m) => parents(m).length > 0) ?? b.membres[0];
    ligne.sort((a, b) => cle.get(a)! - cle.get(b)! || (versHaut ? comparerParNaissance(p(aine(a)), p(aine(b))) : 0));
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
      const reps = b.membres.flatMap((m, i) => {
        const r = repere(m, versHaut);
        return r === undefined ? [] : [r - i];
      });
      const v = moyenne(reps);
      return v === undefined ? { cible: b.gauche, poids: 0.5 } : { cible: v, poids: reps.length };
    });
    const gauches = isotone(
      voeux,
      ligne.map((b) => b.membres.length - 1 + ECART_BLOCS),
    );
    ligne.forEach((b, i) => (b.gauche = gauches[i]));
    // Le sens se règle sur les vraies positions : le conjoint ou l'ami se met du côté opposé à la fratrie.
    if (versHaut) ligne.forEach((b) => orienter(b, true));
  };
  for (let tour = 0; tour < 12; tour++) {
    for (const g of gens.slice(1)) placer(g, true);
    for (const g of [...gens].reverse().slice(1)) placer(g, false);
  }
  for (const g of gens) lignes.get(g)!.forEach((b) => orienter(b, true));

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
