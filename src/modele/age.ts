// Âge, libellés de décès et prochains anniversaires. Fonctions pures : la date du jour est toujours passée en paramètre.

import { accorder, libelleNaissance, MOIS } from './liste';
import { anneeDe, estDecede, joursDuMois, MOTIF_DATE, MOTIF_SANS_ANNEE } from './modele';
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

export interface Anniversaire {
  personne: Personne;
  /** Jours restants : 0 = aujourd'hui. */
  dans: number;
  /** Âge atteint ce jour-là ; undefined pour une naissance sans année. */
  age?: number;
  /** « 24 octobre ». */
  date: string;
}

const MS_PAR_JOUR = 86_400_000;

/**
 * Les `max` prochains anniversaires dans les `horizon` jours, aujourd'hui compris, du plus proche au plus lointain.
 * Il faut le jour et le mois de naissance (complète, ou sans année : alors sans âge) ; les personnes décédées sont ignorées.
 * Un 29 février tombe le 28 les années non bissextiles.
 */
export function prochainsAnniversaires(personnes: Personne[], aujourdhui: Date, horizon = 30, max = 3): Anniversaire[] {
  const base = Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const trouves: Anniversaire[] = [];
  for (const personne of personnes) {
    if (estDecede(personne) || !personne.naissance) continue;
    const complete = personne.naissance.match(MOTIF_DATE);
    const sansAnnee = personne.naissance.match(MOTIF_SANS_ANNEE);
    let naissance: number | undefined, mois: number, jour: number;
    if (complete && complete[3] !== undefined) [naissance, mois, jour] = [Number(complete[1]), Number(complete[2]), Number(complete[3])];
    else if (sansAnnee) [mois, jour] = [Number(sansAnnee[1]), Number(sansAnnee[2])];
    else continue;
    for (const annee of [aujourdhui.getFullYear(), aujourdhui.getFullYear() + 1]) {
      const j = mois === 2 && jour === 29 ? Math.min(jour, joursDuMois(annee, 2)) : jour;
      const dans = Math.round((Date.UTC(annee, mois - 1, j) - base) / MS_PAR_JOUR);
      if (dans < 0) continue;
      const age = naissance === undefined ? undefined : annee - naissance;
      if (dans <= horizon && (age === undefined || age >= 1)) trouves.push({ personne, dans, ...(age === undefined ? {} : { age }), date: `${j === 1 ? '1er' : j} ${MOIS[mois - 1]}` });
      break;
    }
  }
  const nom = (p: Personne) => `${p.prenom} ${p.nom}`;
  return trouves.sort((a, b) => a.dans - b.dans || nom(a.personne).localeCompare(nom(b.personne), 'fr')).slice(0, max);
}

/** « Aujourd'hui », « Demain » ou « Dans 5 jours ». */
export function libelleDelai(dans: number): string {
  if (dans === 0) return 'Aujourd’hui';
  if (dans === 1) return 'Demain';
  return `Dans ${dans} jours`;
}
