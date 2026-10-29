// Placement d'une partie de l'arbre global (la famille, ou un amas de la bulle des amis), en étapes :
// blocs (couples et amis rattachés), générations, ordre dans chaque ligne, abscisses, puis deux centrages.
// Unités : celles de arbreGlobal.ts (x en places, y en générations).

import type { Point } from './arbreGlobal';
import { comparerParNaissance } from './deductions';
import type { Personne } from './types';

/** Écart minimal entre deux personnes de blocs voisins d'une même ligne (deux conjoints : 1). */
export const ECART_BLOCS = 1.25;
/** Écart entre deux blocs voisins de familles différentes (sans parent commun) : un peu d'air pour les distinguer. */
export const ECART_FAMILLES = 2;
/** Allers-retours (descente par les parents, remontée par les enfants) pour ordonner les lignes, puis pour les placer. */
const TOURS_ORDRE = 8;
const TOURS_PLACEMENT = 12;
/** Poids d'un enfant face au parent dans le placement : un parent se centre sur ses enfants plus qu'un enfant ne suit ses parents. */
const POIDS_PAR_ENFANT = 12;
/** Poids d'un bloc sans parent ni enfant : il reste à peu près où il est. */
const POIDS_SANS_LIEN = 0.5;
/** Essais d'élargissement des chaînes (ex – personne – conjoint) ; un écart qui change de moins de `SEUIL_ECART` est gardé. */
const ESSAIS_CHAINES = 3;
const SEUIL_ECART = 0.01;
/** Étape 7 : fratries centrées exactement sous leurs parents (trois enfants au plus), en quelques passes au plus. */
const MAX_FRATRIE_CENTREE = 3;
const TOURS_PETITES_FRATRIES = 6;
const SEUIL_CENTRAGE = 1e-6;
/** Tolérance des comparaisons de scores et de décalages. */
const EPSILON = 1e-9;

/** Une partie de l'arbre (la famille, ou la bulle) avec ses liens internes. */
export interface Partie {
  ids: string[];
  /** Départs du calcul des générations : la première trouvée de chaque composante est en génération 0. */
  racines: string[];
  /** Liens qui gardent deux personnes côte à côte sur la même ligne : unions, et l'amitié qui rattache un ami. */
  liensBloc: [string, string][];
}

export interface Bloc {
  membres: string[];
  g: number;
  gauche: number;
}

export type Voisins = Map<string, string[]>;

export function lier(m: Voisins, a: string, b: string): void {
  const va = m.get(a) ?? [];
  va.push(b);
  m.set(a, va);
  const vb = m.get(b) ?? [];
  vb.push(a);
  m.set(b, vb);
}

const moyenne = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : undefined);
const clePaire = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Étape 1. Blocs : personnes reliées par les liens de bloc (union-find). `membresDe` : représentant → membres, dans l'ordre de `ids`. */
export function regrouperEnBlocs(ids: string[], liens: [string, string][]): { chefDe: Map<string, string>; membresDe: Map<string, string[]> } {
  const chef = new Map(ids.map((id) => [id, id]));
  const trouver = (id: string): string => {
    let r = id;
    while (chef.get(r) !== r) r = chef.get(r)!;
    chef.set(id, r);
    return r;
  };
  for (const [a, b] of liens) chef.set(trouver(a), trouver(b));
  const chefDe = new Map(ids.map((id) => [id, trouver(id)]));
  const membresDe = new Map<string, string[]>();
  for (const id of ids) membresDe.set(chefDe.get(id)!, [...(membresDe.get(chefDe.get(id)!) ?? []), id]);
  return { chefDe, membresDe };
}

/** Liens de parenté internes à la partie. */
export interface Parentes {
  /** Parents principaux (biologiques, sinon adoptifs) : ce sont eux qui comptent pour le placement. */
  parents: (id: string) => string[];
  enfants: (id: string) => string[];
  /** Tous les parents et enfants (adoptifs compris) : ils comptent pour les générations. */
  tousParentsDe: Map<string, string[]>;
  tousEnfantsDe: Map<string, string[]>;
}

export function parentesDansPartie(ids: string[], parentsDe: Map<string, string[]>, tousParents: Map<string, string[]>): Parentes {
  const dans = new Set(ids);
  const parents = (id: string) => (parentsDe.get(id) ?? []).filter((x) => dans.has(x));
  const enfantsDe = new Map<string, string[]>();
  for (const id of ids) for (const x of parents(id)) enfantsDe.set(x, [...(enfantsDe.get(x) ?? []), id]);
  const tousParentsDe = new Map<string, string[]>();
  const tousEnfantsDe = new Map<string, string[]>();
  for (const id of ids) {
    for (const x of tousParents.get(id) ?? []) {
      if (!dans.has(x)) continue;
      tousParentsDe.set(id, [...(tousParentsDe.get(id) ?? []), x]);
      tousEnfantsDe.set(x, [...(tousEnfantsDe.get(x) ?? []), id]);
    }
  }
  return { parents, enfants: (id) => enfantsDe.get(id) ?? [], tousParentsDe, tousEnfantsDe };
}

/**
 * Étape 2. Générations, bloc par bloc : un parent est une ligne au-dessus. En cas de contradiction, la première
 * trouvée reste. `ordre` : les blocs (par représentant) dans l'ordre de découverte.
 */
export function generations(
  departs: string[],
  chefDe: Map<string, string>,
  membresDe: Map<string, string[]>,
  liens: Pick<Parentes, 'tousParentsDe' | 'tousEnfantsDe'>,
): { gen: Map<string, number>; ordre: string[] } {
  const gen = new Map<string, number>();
  const ordre: string[] = [];
  for (const depart of departs) {
    const c0 = chefDe.get(depart)!;
    if (gen.has(c0)) continue;
    gen.set(c0, 0);
    const file = [c0];
    for (let i = 0; i < file.length; i++) {
      const c = file[i];
      ordre.push(c);
      const g = gen.get(c)!;
      for (const m of membresDe.get(c)!) {
        for (const [voisins, dg] of [
          [liens.tousParentsDe.get(m) ?? [], -1],
          [liens.tousEnfantsDe.get(m) ?? [], 1],
        ] as const) {
          for (const v of voisins) {
            const cv = chefDe.get(v)!;
            if (gen.has(cv)) continue;
            gen.set(cv, g + dg);
            file.push(cv);
          }
        }
      }
    }
  }
  return { gen, ordre };
}

/**
 * Ordre des membres d'un bloc : une chaîne (ex – personne – conjoint actuel), parcourue en profondeur depuis
 * un bout (le moins relié, l'aîné à égalité).
 */
export function chaine(membres: string[], liens: [string, string][], p: (id: string) => Personne): string[] {
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

/** Lignes de blocs d'une partie et leurs abscisses : les étapes 3 à 6 les font évoluer. */
export class Lignes {
  readonly blocDe = new Map<string, Bloc>();
  readonly lignes = new Map<number, Bloc[]>();
  /** Générations présentes, de haut en bas. */
  readonly gens: number[];
  /**
   * Écart entre deux voisins d'un bloc : 1, sauf dans une chaîne (ex – personne – conjoint) où il s'élargit
   * pour que les enfants de chaque couple se centrent sous leurs parents.
   */
  private readonly ecartPaire = new Map<string, number>();

  constructor(
    ordre: string[],
    gen: Map<string, number>,
    membresDe: Map<string, string[]>,
    liensBloc: [string, string][],
    private readonly p: (id: string) => Personne,
    private readonly liens: Parentes,
  ) {
    // Lignes de blocs, dans l'ordre de découverte au départ.
    for (const c of ordre) {
      const bloc: Bloc = { membres: chaine(membresDe.get(c)!, liensBloc, p), g: gen.get(c)!, gauche: 0 };
      bloc.membres.forEach((m) => this.blocDe.set(m, bloc));
      this.lignes.set(bloc.g, [...(this.lignes.get(bloc.g) ?? []), bloc]);
    }
    this.gens = [...this.lignes.keys()].sort((a, b) => a - b);
  }

  decalages(b: Bloc): number[] {
    const r = [0];
    for (let i = 1; i < b.membres.length; i++) r.push(r[i - 1] + (this.ecartPaire.get(clePaire(b.membres[i - 1], b.membres[i])) ?? 1));
    return r;
  }

  largeur(b: Bloc): number {
    return this.decalages(b)[b.membres.length - 1];
  }

  x(id: string): number {
    const b = this.blocDe.get(id)!;
    return b.gauche + this.decalages(b)[b.membres.indexOf(id)];
  }

  positions(ids: string[]): Map<string, Point> {
    return new Map(ids.map((id) => [id, { x: this.x(id), y: this.blocDe.get(id)!.g }]));
  }

  private parentsDuBloc(b: Bloc): Set<string> {
    return new Set(b.membres.flatMap(this.liens.parents));
  }

  /** Deux blocs voisins sont de la même famille s'ils ont un parent en commun (ou aucun parent ni l'un ni l'autre). */
  private ecartApres(ligne: Bloc[], i: number): number {
    const [a, b] = [this.parentsDuBloc(ligne[i]), this.parentsDuBloc(ligne[i + 1])];
    if (a.size === 0 && b.size === 0) return ECART_BLOCS;
    return [...a].some((x) => b.has(x)) ? ECART_BLOCS : ECART_FAMILLES;
  }

  /** `pas[i]` : écart minimal entre le bord gauche du bloc i et celui du suivant. */
  pasDe(ligne: Bloc[]): number[] {
    return ligne.map((b, i) => this.largeur(b) + (i < ligne.length - 1 ? this.ecartApres(ligne, i) : ECART_BLOCS));
  }

  private tasser(ligne: Bloc[]): void {
    const pas = this.pasDe(ligne);
    let g = 0;
    ligne.forEach((b, i) => {
      b.gauche = g;
      g += pas[i];
    });
  }

  /** Position de référence d'un membre : milieu de ses parents (vers le haut) ou de ses enfants (vers le bas). */
  private repere(id: string, versHaut: boolean): number | undefined {
    return moyenne((versHaut ? this.liens.parents(id) : this.liens.enfants(id)).map((m) => this.x(m)));
  }

  /**
   * Sens d'un bloc : un membre se met du côté de ses parents (ou de ses enfants). Sans indice, un couple
   * met l'homme à gauche (côté paternel à gauche), sinon l'aîné.
   */
  private orienter(b: Bloc, versHaut: boolean): void {
    if (b.membres.length < 2) return;
    const n = b.membres.length;
    const centre = b.gauche + this.largeur(b) / 2;
    const dec = this.decalages(b);
    let score = 0;
    b.membres.forEach((m, i) => {
      // Une chaîne (ex – personne – conjoint) tient compte des parents et des enfants à la fois.
      for (const haut of n >= 3 ? [true, false] : [versHaut]) {
        const r = this.repere(m, haut);
        if (r !== undefined) score += (r - centre) * (dec[i] - this.largeur(b) / 2);
      }
    });
    if (score < -EPSILON) b.membres.reverse();
    else if (Math.abs(score) <= EPSILON && n === 2 && !b.membres.some((m) => this.repere(m, true) !== undefined || this.repere(m, false) !== undefined)) {
      const [a, c] = b.membres.map(this.p);
      const inverser = a.sexe === 'F' && c.sexe === 'M' ? true : a.sexe === c.sexe || !a.sexe || !c.sexe ? comparerParNaissance(a, c) > 0 : false;
      if (inverser) b.membres.reverse();
    }
  }

  private orienterTout(): void {
    for (const g of this.gens) this.lignes.get(g)!.forEach((b) => this.orienter(b, true));
  }

  /** Ordre d'une ligne : barycentres des parents en descendant, des enfants en remontant. */
  private trier(g: number, versHaut: boolean): void {
    const ligne = this.lignes.get(g)!;
    const cle = new Map<Bloc, number>();
    for (const b of ligne) {
      // Clé : où les membres reliés veulent être, sans tenir compte de leur rang dans le bloc
      // (sinon un frère suivi de son conjoint passerait après son cadet).
      const reps = b.membres.flatMap((m) => {
        const r = this.repere(m, versHaut);
        return r === undefined ? [] : [r];
      });
      cle.set(b, moyenne(reps) ?? b.gauche + this.largeur(b) / 2);
    }
    // À égalité (frères et sœurs sous les mêmes parents), l'ordre de leurs enfants, sans quoi les traits se croisent ;
    // sinon l'aîné à gauche.
    const aine = (b: Bloc) => b.membres.find((m) => this.liens.parents(m).length > 0) ?? b.membres[0];
    const enfants = (b: Bloc) => moyenne(b.membres.flatMap((m) => this.liens.enfants(m).map((e) => this.x(e))));
    const parEnfants = (a: Bloc, b: Bloc) => {
      const [ea, eb] = [enfants(a), enfants(b)];
      return ea === undefined || eb === undefined ? 0 : ea - eb;
    };
    ligne.sort((a, b) => cle.get(a)! - cle.get(b)! || (versHaut ? parEnfants(a, b) || comparerParNaissance(this.p(aine(a)), this.p(aine(b))) : 0));
    // Les frères et sœurs (un parent en commun) restent côte à côte : un bloc sans lien ne s'intercale pas entre eux.
    // De proche en proche : une chaîne qui porte deux fratries amène aussi les frères et sœurs de l'autre conjoint.
    const groupes: Bloc[] = [];
    for (const b of ligne) {
      if (groupes.includes(b)) continue;
      for (let i = groupes.push(b) - 1; i < groupes.length; i++) {
        const mien = this.parentsDuBloc(groupes[i]);
        if (mien.size === 0) continue;
        for (const autre of ligne) if (!groupes.includes(autre) && [...this.parentsDuBloc(autre)].some((x) => mien.has(x))) groupes.push(autre);
      }
    }
    ligne.splice(0, ligne.length, ...groupes);
    this.tasser(ligne);
    for (const b of ligne) this.orienter(b, versHaut);
  }

  /** Étape 3. Ordre de chaque ligne, par allers-retours entre les générations. */
  ordonner(): void {
    this.gens.forEach((g) => this.tasser(this.lignes.get(g)!));
    this.orienterTout();
    for (let tour = 0; tour < TOURS_ORDRE; tour++) {
      for (const g of this.gens.slice(1)) this.trier(g, true);
      for (const g of [...this.gens].reverse().slice(1)) this.trier(g, false);
    }
    for (const g of this.gens.slice(1)) this.trier(g, true);
  }

  /**
   * Abscisses d'une ligne : les enfants se centrent sous leurs parents, les parents au-dessus de leurs enfants ;
   * l'ordre et l'écart minimal de la ligne sont gardés (régression isotone).
   */
  private placer(g: number, versHaut: boolean): void {
    const ligne = this.lignes.get(g)!;
    const voeux = ligne.map((b) => {
      const dec = this.decalages(b);
      // Chaque lien compte : vers les parents (une fois) et vers les enfants (une fois par enfant).
      const reps = b.membres.flatMap((m, i) =>
        [true, false].flatMap((haut) => {
          const r = this.repere(m, haut);
          return r === undefined ? [] : Array<number>(haut ? 1 : POIDS_PAR_ENFANT * this.liens.enfants(m).length).fill(r - dec[i]);
        }),
      );
      const v = moyenne(reps);
      return v === undefined ? { cible: b.gauche, poids: POIDS_SANS_LIEN } : { cible: v, poids: reps.length };
    });
    const gauches = isotone(voeux, this.pasDe(ligne));
    ligne.forEach((b, i) => (b.gauche = gauches[i]));
    // Le sens se règle sur les vraies positions : le conjoint ou l'ami se met du côté opposé à la fratrie.
    if (versHaut) ligne.forEach((b) => this.orienter(b, true));
  }

  private placerTout(): void {
    for (let tour = 0; tour < TOURS_PLACEMENT; tour++) {
      for (const g of this.gens.slice(1)) this.placer(g, true);
      for (const g of [...this.gens].reverse().slice(1)) this.placer(g, false);
    }
  }

  /** Une chaîne de plus de deux personnes : chaque couple s'écarte de la largeur de ses enfants. Rend vrai si un écart a changé. */
  private elargirChaines(): boolean {
    let change = false;
    for (const b of new Set(this.blocDe.values())) {
      if (b.membres.length < 3) continue;
      for (let i = 1; i < b.membres.length; i++) {
        const [u, v] = [b.membres[i - 1], b.membres[i]];
        const enfs = [...new Set([...this.liens.enfants(u), ...this.liens.enfants(v)])].filter(
          (e) => this.liens.parents(e).includes(u) && this.liens.parents(e).includes(v),
        );
        if (enfs.length === 0) continue;
        const gauches = enfs.map((e) => this.blocDe.get(e)!.gauche);
        const droites = enfs.map((e) => this.blocDe.get(e)!.gauche + this.largeur(this.blocDe.get(e)!));
        // Largeur des enfants, plus la place entre ce groupe et celui du couple voisin.
        const voisins = (i > 1 ? 1 : 0) + (i < b.membres.length - 1 ? 1 : 0);
        const voulu = Math.max(1, Math.max(...droites) - Math.min(...gauches) + voisins * ECART_BLOCS);
        const cle = clePaire(u, v);
        if (Math.abs((this.ecartPaire.get(cle) ?? 1) - voulu) > SEUIL_ECART) {
          this.ecartPaire.set(cle, voulu);
          change = true;
        }
      }
    }
    return change;
  }

  /** Étape 4. Abscisses de toutes les lignes, chaînes élargies, puis le sens final de chaque bloc. */
  placerAbscisses(): void {
    this.placerTout();
    for (let essai = 0; essai < ESSAIS_CHAINES && this.elargirChaines(); essai++) this.placerTout();
    this.orienterTout();
  }

  /** Déplace un bloc ; ses voisins de ligne ne sont poussés que si leur marge est épuisée. */
  private glisser(b: Bloc, voulu: number): void {
    const ligne = this.lignes.get(b.g)!;
    const i = ligne.indexOf(b);
    this.pousser(ligne, i, i, voulu - b.gauche);
  }

  /** Décale les blocs i à j de la ligne ; leurs voisins ne sont poussés que si leur marge est épuisée. */
  /** Déplace les blocs i à j et, d'un seul tenant, tout ce qui est de leur côté sur la ligne (à gauche s'ils vont à gauche). */
  private deporter(ligne: Bloc[], i: number, j: number, delta: number): void {
    for (let k = delta < 0 ? 0 : i; k <= (delta < 0 ? j : ligne.length - 1); k++) ligne[k].gauche += delta;
  }

  private pousser(ligne: Bloc[], i: number, j: number, delta: number): void {
    const pas = this.pasDe(ligne);
    for (let k = i; k <= j; k++) ligne[k].gauche += delta;
    for (let k = j + 1; k < ligne.length && ligne[k].gauche < ligne[k - 1].gauche + pas[k - 1]; k++) ligne[k].gauche = ligne[k - 1].gauche + pas[k - 1];
    for (let k = i - 1; k >= 0 && ligne[k].gauche > ligne[k + 1].gauche - pas[k]; k--) ligne[k].gauche = ligne[k + 1].gauche - pas[k];
  }

  /** Étape 5. Enfant unique (seul dans son bloc) de deux parents formant un bloc à eux deux : exactement au milieu d'eux. */
  centrerEnfantsUniques(): void {
    const { parents, enfants } = this.liens;
    for (const g of this.gens) {
      for (const b of this.lignes.get(g)!) {
        if (b.membres.length !== 1) continue;
        const m = b.membres[0];
        const [u, v] = parents(m);
        if (u === undefined || v === undefined || parents(m).length !== 2) continue;
        const bp = this.blocDe.get(u)!;
        if (bp !== this.blocDe.get(v) || bp.membres.length !== 2) continue;
        if (new Set([...enfants(u), ...enfants(v)]).size !== 1) continue;
        this.glisser(b, (this.x(u) + this.x(v)) / 2);
      }
    }
  }

  /** Couple voisin (dans un même bloc) dont descend une personne, sinon rien. */
  private coupleDe(m: string): string | undefined {
    const [u, v] = this.liens.parents(m);
    if (this.liens.parents(m).length !== 2 || this.blocDe.get(u) !== this.blocDe.get(v)) return undefined;
    const bp = this.blocDe.get(u)!;
    return Math.abs(bp.membres.indexOf(u) - bp.membres.indexOf(v)) === 1 ? clePaire(u, v) : undefined;
  }

  /** Enfants de chaque couple voisin (dans un même bloc) d'une ligne, par clé du couple. */
  private fratries(ligne: Bloc[]): Map<string, string[]> {
    const fratries = new Map<string, string[]>();
    for (const b of ligne)
      for (const m of b.membres) {
        const cle = this.coupleDe(m);
        if (cle) fratries.set(cle, [...(fratries.get(cle) ?? []), m]);
      }
    return fratries;
  }

  /** Décale les blocs i à j de la ligne vers `voulu`, sans dépasser la place libre de part et d'autre ; rend le décalage fait. */
  private decaler(ligne: Bloc[], i: number, j: number, voulu: number): number {
    const pas = this.pasDe(ligne);
    const libreG = i > 0 ? ligne[i].gauche - ligne[i - 1].gauche - pas[i - 1] : Infinity;
    const libreD = j < ligne.length - 1 ? ligne[j + 1].gauche - ligne[j].gauche - pas[j] : Infinity;
    const fait = Math.min(Math.max(voulu, -Math.max(0, libreG)), Math.max(0, libreD));
    for (let k = i; k <= j; k++) ligne[k].gauche += fait;
    return fait;
  }

  /**
   * Étape 6. Centrage des enfants d'abord (UX-20) : ligne par ligne en descendant, chaque fratrie de deux parents
   * voisins dans un bloc glisse vers leur milieu, autant que la place libre de la ligne le permet. Les blocs des
   * enfants bougent ensemble (conjoints compris) ; les parents ne bougent pas : un beau-parent reste où il est.
   * Une fratrie dont un bloc tient aussi à une autre famille (mariage entre deux fratries) ne bouge pas.
   */
  centrerFratries(): void {
    for (const g of this.gens) {
      const ligne = this.lignes.get(g)!;
      for (const [cle, enfs] of this.fratries(ligne)) {
        const blocs = [...new Set(enfs.map((e) => this.blocDe.get(e)!))];
        if (blocs.some((b) => b.membres.some((m) => this.coupleDe(m) !== undefined && this.coupleDe(m) !== cle))) continue;
        const rangs = blocs.map((b) => ligne.indexOf(b)).sort((a, b) => a - b);
        const [i, j] = [rangs[0], rangs[rangs.length - 1]];
        if (j - i + 1 !== blocs.length) continue;
        const [u, v] = this.liens.parents(enfs[0]);
        const xs = enfs.map((e) => this.x(e));
        const voulu = (this.x(u) + this.x(v)) / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
        const delta = this.decaler(ligne, i, j, voulu);
        // Enfants à court de place : un couple seul dans son bloc (sans ex ni beau-parent) fait le reste du chemin.
        const bp = this.blocDe.get(u)!;
        // Sauf si l'un d'eux est l'enfant unique d'un couple : il quitterait l'aplomb de ses parents (un coude).
        const unique = bp.membres.some((m) => {
          const c = this.coupleDe(m);
          return c !== undefined && new Set(this.liens.parents(m).flatMap(this.liens.enfants)).size === 1;
        });
        if (Math.abs(voulu - delta) > EPSILON && bp.membres.length === 2 && !unique) {
          const haut = this.lignes.get(bp.g)!;
          this.decaler(haut, haut.indexOf(bp), haut.indexOf(bp), delta - voulu);
        }
      }
    }
  }

  /** Fratrie dont les blocs se suivent sur la ligne : ses blocs i à j et l'écart entre le milieu des parents et le sien. */
  private fratrieSuivie(ligne: Bloc[], enfs: string[]): { i: number; j: number; blocs: Bloc[]; delta: number } | undefined {
    const blocs = [...new Set(enfs.map((e) => this.blocDe.get(e)!))];
    const rangs = blocs.map((b) => ligne.indexOf(b)).sort((a, b) => a - b);
    const [i, j] = [rangs[0], rangs[rangs.length - 1]];
    if (j - i + 1 !== blocs.length) return undefined;
    const [u, v] = this.liens.parents(enfs[0]);
    const xs = enfs.map((e) => this.x(e));
    return { i, j, blocs, delta: (this.x(u) + this.x(v)) / 2 - (Math.min(...xs) + Math.max(...xs)) / 2 };
  }

  /**
   * Après un déplacement sur la ligne `depuis`, les fratries des lignes du dessous suivent leurs parents (sauf celles
   * du bloc `sauf`, qu'on déplace pour les centrer) : elles gardent l'écart qu'elles avaient.
   */
  private entrainer(depuis: number, sauf: Bloc | undefined, xAvant: Map<string, number>): void {
    const avant = (id: string) => xAvant.get(id) ?? this.x(id);
    for (const g of [...this.lignes.keys()].filter((g) => g > depuis).sort((a, b) => a - b)) {
      const ligne = this.lignes.get(g)!;
      for (let passe = 0, pousse = true; pousse && passe < 4; passe++) {
        pousse = false;
        for (const [cle, enfs] of this.fratries(ligne)) {
          if (sauf?.membres.includes(this.liens.parents(enfs[0])[0])) continue;
          const f = this.fratrieSuivie(ligne, enfs);
          if (!f || f.blocs.some((b) => b.membres.some((m) => this.coupleDe(m) !== undefined && this.coupleDe(m) !== cle))) continue;
          const [u, v] = this.liens.parents(enfs[0]);
          const xs = enfs.map(avant);
          const ecart = f.delta - ((avant(u) + avant(v)) / 2 - (Math.min(...xs) + Math.max(...xs)) / 2);
          if (Math.abs(ecart) < SEUIL_CENTRAGE) continue;
          this.pousser(ligne, f.i, f.j, ecart);
          pousse = true;
        }
      }
    }
  }

  /** Bilan du centrage : somme des écarts des fratries de trois enfants au plus, puis celle des plus grandes. */
  private bilanCentrage(): [number, number] {
    let [petites, grandes] = [0, 0];
    for (const ligne of this.lignes.values())
      for (const enfs of this.fratries(ligne).values()) {
        const f = this.fratrieSuivie(ligne, enfs);
        if (!f) continue;
        if (enfs.length <= MAX_FRATRIE_CENTREE) petites += Math.abs(f.delta);
        else grandes += Math.abs(f.delta);
      }
    return [petites, grandes];
  }

  /**
   * Étape 7. Une fratrie de trois enfants au plus, d'un couple voisin dans un bloc, se met exactement sous le milieu
   * de ses parents, quitte à élargir l'arbre : ses voisins de ligne s'écartent. Si un de ses blocs tient aussi à une
   * autre fratrie (mariage entre deux fratries), ce bloc reste et l'enfant du bout opposé s'écarte d'autant qu'il
   * faut ; à défaut, le bloc des parents se déplace au-dessus d'eux. Les fratries du dessous suivent leurs parents.
   * Un essai n'est gardé que s'il réduit la somme des écarts de ces petites fratries (à somme égale, celle des
   * grandes) : quand deux fratries se disputent la place (un trait qui en croise un autre), l'arbre reste tel quel.
   */
  centrerPetitesFratries(): void {
    let bilan = this.bilanCentrage();
    for (let tour = 0; tour < TOURS_PETITES_FRATRIES && bilan[0] >= SEUIL_CENTRAGE; tour++) {
      let bouge = false;
      for (const g of this.gens) {
        const ligne = this.lignes.get(g)!;
        for (const [cle, enfs] of this.fratries(ligne)) {
          if (enfs.length > MAX_FRATRIE_CENTREE) continue;
          const f = this.fratrieSuivie(ligne, enfs);
          if (!f || Math.abs(f.delta) < SEUIL_CENTRAGE) continue;
          const { i, j, delta } = f;
          const tenu = (b: Bloc) => b.membres.some((m) => this.coupleDe(m) !== undefined && this.coupleDe(m) !== cle);
          // Le bout qui s'écarte : celui de droite pour aller à droite, celui de gauche pour aller à gauche.
          const bout = delta > 0 ? j : i;
          const bp = this.blocDe.get(this.liens.parents(enfs[0])[0])!;
          const haut = this.lignes.get(bp.g)!;
          const kp = haut.indexOf(bp);
          // Chaque déplacement s'essaie d'un seul tenant (tout le côté de la ligne), puis en poussant les seuls voisins.
          const facons = (l: Bloc[], a: number, b: number, d: number) => [() => this.deporter(l, a, b, d), () => this.pousser(l, a, b, d)];
          const tenue = f.blocs.some(tenu);
          const essais: { depuis: number; bouger: () => void; parents?: Bloc }[] = [
            ...(tenue ? [] : facons(ligne, i, j, delta)).map((bouger) => ({ depuis: g, bouger })),
            ...(tenue && i !== j && !tenu(ligne[bout]) ? facons(ligne, bout, bout, 2 * delta) : []).map((bouger) => ({ depuis: g, bouger })),
            ...facons(haut, kp, kp, -delta).map((bouger) => ({ depuis: bp.g, bouger, parents: bp })),
          ];
          for (const { depuis, bouger, parents } of essais) {
            const avant = new Map([...this.lignes.values()].flat().map((b) => [b, b.gauche]));
            const xAvant = new Map([...avant.keys()].flatMap((b) => b.membres.map((m) => [m, this.x(m)])));
            bouger();
            this.entrainer(depuis, parents, xAvant);
            const apres = this.bilanCentrage();
            if (apres[0] < bilan[0] - SEUIL_CENTRAGE || (apres[0] < bilan[0] + SEUIL_CENTRAGE && apres[1] < bilan[1] - SEUIL_CENTRAGE)) {
              bilan = apres;
              bouge = true;
              break;
            }
            avant.forEach((x, b) => (b.gauche = x));
          }
        }
      }
      if (!bouge) return;
    }
  }
}

/** Place une partie : blocs, générations, ordre dans chaque ligne, abscisses, puis centrages. */
export function disposerPartie(
  partie: Partie,
  personnes: Map<string, Personne>,
  parentsDe: Map<string, string[]>,
  tousParents: Map<string, string[]>,
): { positions: Map<string, Point>; blocs: Map<string, Bloc> } {
  const { chefDe, membresDe } = regrouperEnBlocs(partie.ids, partie.liensBloc);
  const liens = parentesDansPartie(partie.ids, parentsDe, tousParents);
  const { gen, ordre } = generations([...partie.racines, ...partie.ids], chefDe, membresDe, liens);
  const lignes = new Lignes(ordre, gen, membresDe, partie.liensBloc, (id) => personnes.get(id)!, liens);
  lignes.ordonner();
  lignes.placerAbscisses();
  lignes.centrerEnfantsUniques();
  lignes.centrerFratries();
  lignes.centrerPetitesFratries();
  return { positions: lignes.positions(partie.ids), blocs: lignes.blocDe };
}
