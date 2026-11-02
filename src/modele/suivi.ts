// « Qui suivre » (Réglages › Suivi) : chaque fiche est rangée dans un cercle selon son lien avec « Moi » ; chaque
// cercle est suivi ou non pour les rappels et pour « À compléter ». Une fiche peut faire exception (types.ts).

import { relation } from './deductions';
import type { Donnees, Personne } from './types';

export type Cercle = 'parents' | 'fratrie' | 'grandsParents' | 'oncles' | 'cousins' | 'loin' | 'alliance' | 'amis' | 'sansLien';

/** Dans l'ordre de la grille des réglages. */
export const CERCLES: { cercle: Cercle; libelle: string; detail?: string }[] = [
  { cercle: 'parents', libelle: 'Parents et enfants' },
  { cercle: 'fratrie', libelle: 'Frères et sœurs', detail: 'demi-frères et demi-sœurs compris' },
  { cercle: 'grandsParents', libelle: 'Grands-parents, petits-enfants' },
  { cercle: 'oncles', libelle: 'Oncles, tantes, neveux, nièces' },
  { cercle: 'cousins', libelle: 'Cousins germains' },
  { cercle: 'loin', libelle: 'Plus loin', detail: 'arrière-grands-parents, grands-oncles, petits-neveux, cousins issus de germains…' },
  { cercle: 'alliance', libelle: 'Belle-famille', detail: 'famille de ton conjoint, conjoints de ta famille' },
  { cercle: 'amis', libelle: 'Amis' },
  { cercle: 'sansLien', libelle: 'Sans lien connu' },
];

/** Cercles suivis (vrai) ou non. */
export type Cercles = Record<Cercle, boolean>;

export interface Suivi {
  /** Anniversaires, fêtes, décès et unions : accueil, agenda, export .ics. */
  rappels: Cercles;
  /** Fiches signalées dans « À compléter » ; hors des cercles suivis, elles comptent comme complètes. */
  completer: Cercles;
}

const tous = (valeur: boolean): Cercles => Object.fromEntries(CERCLES.map((c) => [c.cercle, valeur])) as Cercles;

/** Par défaut, tout le monde est suivi : rien ne change tant qu'on n'a pas choisi. */
export const SUIVI_TOUT: Suivi = { rappels: tous(true), completer: tous(true) };

/** Jusqu'aux cousins germains ; la belle-famille et les amis ont leurs rappels, mais ne sont pas signalés « À compléter ». */
export const SUIVI_FAMILLE_PROCHE: Suivi = {
  rappels: { ...tous(true), loin: false, sansLien: false },
  completer: { ...tous(true), loin: false, alliance: false, amis: false, sansLien: false },
};

export function memeSuivi(a: Suivi, b: Suivi): boolean {
  return CERCLES.every(({ cercle }) => a.rappels[cercle] === b.rappels[cercle] && a.completer[cercle] === b.completer[cercle]);
}

/**
 * Cercle de `id` vu depuis `moi`, ou undefined pour moi et mon conjoint (toujours suivis).
 * Lien de sang selon les générations montées et descendues ; toute alliance = belle-famille ;
 * sans parenté, membre d'un groupe d'amis = ami (comme le filtre « Amis ») ; sinon sans lien.
 */
export function cercleDe(d: Donnees, moi: string, id: string): Cercle | undefined {
  const r = relation(d, moi, id);
  if (!r) return d.groupes.some((g) => g.membres.includes(id)) ? 'amis' : 'sansLien';
  if (r.type === 'soi' || r.type === 'conjoint') return undefined;
  if (r.type === 'alliance') return 'alliance';
  const [haut, bas] = [Math.max(r.montee, r.descente), Math.min(r.montee, r.descente)];
  if (bas === 0) return haut === 1 ? 'parents' : haut === 2 ? 'grandsParents' : 'loin';
  if (bas === 1) return haut === 1 ? 'fratrie' : haut === 2 ? 'oncles' : 'loin';
  return haut === 2 && bas === 2 ? 'cousins' : 'loin';
}

export interface Suivis {
  /** Cercle de la personne ; undefined pour moi, mon conjoint, ou sans « Moi » choisi. */
  cercle: (p: Personne) => Cercle | undefined;
  /** Ce que dit le cercle, sans les exceptions de la fiche. */
  rappelDuCercle: (p: Personne) => boolean;
  signaleDuCercle: (p: Personne) => boolean;
  /** Ce qui s'applique : l'exception de la fiche l'emporte sur le cercle. */
  rappel: (p: Personne) => boolean;
  signale: (p: Personne) => boolean;
}

/** Sans « Moi » (ou avec une fiche « Moi » disparue), tout le monde est suivi, sauf exception de la fiche. */
export function suivis(d: Donnees, moi: string | undefined, suivi: Suivi): Suivis {
  const actif = moi !== undefined && d.personnes.some((p) => p.id === moi);
  const memo = new Map<string, Cercle | undefined>();
  const cercle = (p: Personne) => {
    if (!actif) return undefined;
    if (!memo.has(p.id)) memo.set(p.id, cercleDe(d, moi, p.id));
    return memo.get(p.id);
  };
  const duCercle = (quoi: keyof Suivi) => (p: Personne) => {
    const c = cercle(p);
    return c === undefined || suivi[quoi][c];
  };
  const rappelDuCercle = duCercle('rappels');
  const signaleDuCercle = duCercle('completer');
  return {
    cercle,
    rappelDuCercle,
    signaleDuCercle,
    rappel: (p) => !p.sansRappel && (!!p.avecRappel || rappelDuCercle(p)),
    signale: (p) => !p.ignorerIncomplet && (!!p.signalerIncomplet || signaleDuCercle(p)),
  };
}

/** Cercles de sang, du plus proche au plus lointain : les crans de la jauge des réglages. */
export const CERCLES_SANG: Cercle[] = ['parents', 'fratrie', 'grandsParents', 'oncles', 'cousins', 'loin'];

/** Hors de l'échelle de proximité (pas de distance) : un interrupteur chacun. */
export const CERCLES_HORS: Cercle[] = ['alliance', 'amis', 'sansLien'];

/**
 * Cran de la jauge : 0 (aucun cercle de sang) à 6 (tous), quand les cercles suivis sont tous plus proches que les
 * autres ; undefined pour un choix à trous (grands-parents sans la fratrie…), laissé tel quel jusqu'au toucher d'un cran.
 */
export function cranDe(cercles: Cercles): number | undefined {
  const premierEteint = CERCLES_SANG.findIndex((c) => !cercles[c]);
  const cran = premierEteint === -1 ? CERCLES_SANG.length : premierEteint;
  return CERCLES_SANG.slice(cran).every((c) => !cercles[c]) ? cran : undefined;
}

/** Suit les `cran` cercles de sang les plus proches et aucun autre ; belle-famille, amis et sans lien inchangés. */
export function avecCran(cercles: Cercles, cran: number): Cercles {
  return { ...cercles, ...Object.fromEntries(CERCLES_SANG.map((c, i) => [c, i < cran])) };
}

/** Lit des cercles enregistrés ; chaque valeur absente ou invalide vaut `defaut` (un cercle ajouté plus tard reste suivi). */
export function lireCercles(v: unknown, defaut: Cercles): Cercles {
  const o = typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  return Object.fromEntries(CERCLES.map(({ cercle }) => [cercle, typeof o[cercle] === 'boolean' ? o[cercle] : defaut[cercle]])) as Cercles;
}
