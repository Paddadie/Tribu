// Âge, libellés de décès et prochains anniversaires. Fonctions pures : la date du jour est toujours passée en paramètre.

import { accorder, libelleNaissance, MOIS } from './liste';
import { joursDuMois, MOTIF_DATE } from './modele';
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

/** Âge actuel, ou à la mort ; undefined sans date de naissance. */
export function agePersonne(p: Pick<Personne, 'naissance' | 'deces'>, aujourdhui: Date): Age | undefined {
  return p.naissance ? ageEntre(p.naissance, p.deces ?? iso(aujourdhui)) : undefined;
}

function enAnnees({ annees, approximatif }: Age): string {
  if (annees < 1) return 'moins d’un an';
  return `${approximatif ? 'environ ' : ''}${annees === 1 ? '1 an' : `${annees} ans`}`;
}

/** « 34 ans » ou « environ 34 ans » ; vide pour une personne décédée (voir `libelleAgeDeces`) ou sans naissance. */
export function libelleAge(p: Pick<Personne, 'naissance' | 'deces'>, aujourdhui: Date): string {
  if (p.deces) return '';
  const age = agePersonne(p, aujourdhui);
  return age ? enAnnees(age) : '';
}

/** « Morte à 82 ans » ; vide si la personne n'est pas décédée ou si sa naissance est inconnue. */
export function libelleAgeDeces(p: Pick<Personne, 'naissance' | 'deces' | 'sexe'>, aujourdhui: Date): string {
  if (!p.deces) return '';
  const age = agePersonne(p, aujourdhui);
  return age ? `${accorder(p.sexe, 'Mort', 'Morte', 'Mort(e)')} à ${enAnnees(age)}` : '';
}

/** Seconde ligne d'une personne dans une liste : « 1941 – 2024 » si elle est décédée, sinon naissance et âge. */
export function detailPersonne(p: Personne, aujourdhui: Date): string {
  if (p.deces) {
    const annee = (d?: string) => d?.slice(0, 4);
    if (p.naissance) return `${annee(p.naissance)} – ${annee(p.deces)}`;
    return `décédé${p.sexe === 'F' ? 'e' : p.sexe === 'M' ? '' : '(e)'} en ${annee(p.deces)}`;
  }
  return [libelleNaissance(p.naissance, p.sexe), libelleAge(p, aujourdhui)].filter(Boolean).join(' · ');
}

export interface Anniversaire {
  personne: Personne;
  /** Jours restants : 0 = aujourd'hui. */
  dans: number;
  /** Âge atteint ce jour-là. */
  age: number;
  /** « 24 octobre ». */
  date: string;
}

const MS_PAR_JOUR = 86_400_000;

/**
 * Les `max` prochains anniversaires dans les `horizon` jours, aujourd'hui compris, du plus proche au plus lointain.
 * Il faut une date de naissance complète ; les personnes décédées sont ignorées. Un 29 février tombe le 28 les années non bissextiles.
 */
export function prochainsAnniversaires(personnes: Personne[], aujourdhui: Date, horizon = 30, max = 3): Anniversaire[] {
  const base = Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const trouves: Anniversaire[] = [];
  for (const personne of personnes) {
    const m = personne.naissance?.match(MOTIF_DATE);
    if (personne.deces || !m || m[3] === undefined) continue;
    const [naissance, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (const annee of [aujourdhui.getFullYear(), aujourdhui.getFullYear() + 1]) {
      const j = mois === 2 && jour === 29 ? Math.min(jour, joursDuMois(annee, 2)) : jour;
      const dans = Math.round((Date.UTC(annee, mois - 1, j) - base) / MS_PAR_JOUR);
      if (dans < 0) continue;
      if (dans <= horizon && annee - naissance >= 1) trouves.push({ personne, dans, age: annee - naissance, date: `${j === 1 ? '1er' : j} ${MOIS[mois - 1]}` });
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
