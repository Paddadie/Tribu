// Âge et libellés de décès. Fonctions pures : la date du jour est toujours passée en paramètre.

import { accorder, libelleNaissance } from './liste';
import { anneeDe, estDecede, joursDuMois, MOTIF_DATE } from './modele';
import type { Personne } from './types';

/** « 2026-10-19 », date locale. */
function iso(date: Date): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

/**
 * Plus tôt et plus tard possibles d'une date partielle, en nombre AAAAMMJJ : sans jour, tout le mois ;
 * sans mois, toute l'année. Une différence de deux nombres, divisée par 10 000, donne des années entières.
 */
function bornes(date: string): [number, number] {
  const m = date.match(MOTIF_DATE) as RegExpMatchArray;
  const annee = Number(m[1]);
  const mois = m[2] === undefined ? undefined : Number(m[2]);
  const jour = m[3] === undefined ? undefined : Number(m[3]);
  const bas = annee * 10000 + (mois ?? 1) * 100 + (jour ?? 1);
  const haut = annee * 10000 + (mois ?? 12) * 100 + (jour ?? joursDuMois(annee, mois ?? 12));
  return [bas, haut];
}

/**
 * La date tombe entièrement après `aujourdhui` : « 2027 » l'est en 2026, « 2026 » ne l'est pas (elle peut désigner un
 * jour passé). Une date sans année (« --MM-JJ ») ou invalide ne l'est jamais.
 */
export function estDansLeFutur(date: string | undefined, aujourdhui: Date): boolean {
  if (!date || !MOTIF_DATE.test(date)) return false;
  const jour = aujourdhui.getFullYear() * 10000 + (aujourdhui.getMonth() + 1) * 100 + aujourdhui.getDate();
  return bornes(date)[0] > jour;
}

export interface Age {
  annees: number;
  /** Les dates sont trop partielles pour trancher : l'âge est à un an près. */
  approximatif: boolean;
}

/**
 * Âge à `jusqua` d'une personne née à `naissance` (dates partielles admises) ; undefined si `jusqua` précède la naissance.
 * Quand les dates ne tranchent pas entre deux âges, c'est l'âge au milieu de ces périodes qui est donné (le plus probable).
 */
export function ageEntre(naissance: string, jusqua: string): Age | undefined {
  const [nBas, nHaut] = bornes(naissance);
  const [jBas, jHaut] = bornes(jusqua);
  const plus = Math.floor((jHaut - nBas) / 10000);
  if (plus < 0) return undefined;
  const moins = Math.max(0, Math.floor((jBas - nHaut) / 10000));
  if (moins === plus) return { annees: moins, approximatif: false };
  const milieu = Math.floor((jBas + jHaut - nBas - nHaut) / 2 / 10000);
  return { annees: Math.min(plus, Math.max(moins, milieu)), approximatif: true };
}

/** Âge actuel, ou à la mort ; undefined sans année de naissance, ou pour un décès sans année. */
export function agePersonne(p: Pick<Personne, 'naissance' | 'deces' | 'decede'>, aujourdhui: Date): Age | undefined {
  if (!p.naissance || !anneeDe(p.naissance)) return undefined;
  if (!estDecede(p)) return ageEntre(p.naissance, iso(aujourdhui));
  return p.deces && anneeDe(p.deces) ? ageEntre(p.naissance, p.deces) : undefined;
}

function enAnnees({ annees, approximatif }: Age): string {
  if (annees < 1) return 'moins d’un an';
  return `${approximatif ? 'environ ' : ''}${annees === 1 ? '1 an' : `${annees} ans`}`;
}

/** « 34 ans » ou « environ 34 ans » ; vide pour une personne décédée (voir `libelleAgeDeces`) ou sans naissance. */
export function libelleAge(p: Pick<Personne, 'naissance' | 'deces' | 'decede'>, aujourdhui: Date): string {
  if (estDecede(p)) return '';
  const age = agePersonne(p, aujourdhui);
  return age ? enAnnees(age) : '';
}

/** « Morte à 82 ans » ; vide si la personne n'est pas décédée ou si sa naissance est inconnue. */
export function libelleAgeDeces(p: Pick<Personne, 'naissance' | 'deces' | 'decede' | 'sexe'>, aujourdhui: Date): string {
  if (!estDecede(p)) return '';
  const age = agePersonne(p, aujourdhui);
  return age ? `${accorder(p.sexe, 'Mort', 'Morte', 'Mort(e)')} à ${enAnnees(age)}` : '';
}

/**
 * Seconde ligne d'une personne dans une liste. Décédée : « 1941 – 2024 », « 1941 – ? » sans année de décès,
 * « décédée en 2024 » sans année de naissance, « décédée » sans aucune des deux. Sinon naissance et âge.
 */
export function detailPersonne(p: Personne, aujourdhui: Date): string {
  if (estDecede(p)) {
    const [naissance, deces] = [anneeDe(p.naissance), anneeDe(p.deces)];
    if (naissance) return `${naissance} – ${deces ?? '?'}`;
    const decede = accorder(p.sexe, 'décédé', 'décédée', 'décédé(e)');
    return deces ? `${decede} en ${deces}` : decede;
  }
  return [libelleNaissance(p.naissance, p.sexe), libelleAge(p, aujourdhui)].filter(Boolean).join(' · ');
}

/**
 * Seconde ligne d'un proche sur une fiche : le lien (« sœur ») puis l'âge « 65 ans » à la place de la date de naissance.
 * Décédée : les années comme dans `detailPersonne`. La date complète reste sur la fiche de la personne.
 */
export function detailProche(p: Personne, aujourdhui: Date, lien?: string): string {
  const detail = estDecede(p) ? detailPersonne(p, aujourdhui) : libelleAge(p, aujourdhui);
  return [lien, detail].filter(Boolean).join(' · ');
}
