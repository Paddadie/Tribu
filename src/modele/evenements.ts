// Dates à venir de l'accueil et de l'agenda : anniversaires, unions (noces), fêtes du prénom, décès.
// Fonctions pures : la date du jour est passée en paramètre.

import { feteDuPrenom } from './fetes';
import { MOIS, nomComplet } from './liste';
import { estDecede, joursDuMois, MOTIF_DATE, MOTIF_SANS_ANNEE, personnesListees } from './modele';
import { libelleAnniversaireUnion } from './noces';
import type { Donnees, Personne } from './types';

export type GenreEvenement = 'anniversaire' | 'union' | 'fete' | 'deces';

export interface Evenement {
  genre: GenreEvenement;
  /** Jours restants : 0 = aujourd'hui. */
  dans: number;
  mois: number;
  jour: number;
  annee: number;
  /** Une personne, ou les deux d'une union. */
  personnes: Personne[];
  /** Âge atteint, années d'union ou années depuis le décès ; 0 pour le jour même d'une union à venir ; absent sans année. */
  annees?: number;
  /** Union : mariage ou union libre. */
  marie?: boolean;
  /** Fête : « Sainte Céline ». */
  saint?: string;
}

const MS_PAR_JOUR = 86_400_000;
const ORDRE: GenreEvenement[] = ['anniversaire', 'union', 'fete', 'deces'];

/** Jour et mois d'une date complète ou sans année (« --MM-JJ »), et son année si elle est connue. */
function jourMois(date: string | undefined): { mois: number; jour: number; annee?: number } | undefined {
  const complete = date?.match(MOTIF_DATE);
  if (complete && complete[3] !== undefined) return { annee: Number(complete[1]), mois: Number(complete[2]), jour: Number(complete[3]) };
  const sansAnnee = date?.match(MOTIF_SANS_ANNEE);
  return sansAnnee ? { mois: Number(sansAnnee[1]), jour: Number(sansAnnee[2]) } : undefined;
}

/** Prochaine fois (aujourd'hui compris) que tombe ce jour du calendrier ; un 29 février tombe le 28 les années non bissextiles. */
function prochaineFois(mois: number, jour: number, aujourdhui: Date): { dans: number; annee: number; jour: number } {
  const base = Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  for (const annee of [aujourdhui.getFullYear(), aujourdhui.getFullYear() + 1]) {
    const j = mois === 2 && jour === 29 ? joursDuMois(annee, 2) : jour;
    const dans = Math.round((Date.UTC(annee, mois - 1, j) - base) / MS_PAR_JOUR);
    if (dans >= 0) return { dans, annee, jour: j };
  }
  throw new Error('inatteignable');
}

export interface OptionsEvenements {
  /** Fêtes du prénom (réglage) ; vrai par défaut. */
  fetes?: boolean;
}

/**
 * Événements des `horizon` prochains jours (aujourd'hui compris), du plus proche au plus lointain, puis par genre et par nom.
 * - Anniversaire : personne vivante, jour et mois de naissance connus, au moins 1 an si l'année est connue.
 * - Union : union actuelle entre deux personnes listées, dont une au moins vivante, jour et mois connus. Le jour même
 *   d'une union à venir donne 0 an ; avant, rien.
 * - Fête : personne vivante dont le premier prénom est au calendrier.
 * - Décès : date de décès complète, au moins 1 an.
 */
export function evenementsAVenir(d: Donnees, aujourdhui: Date, horizon: number, options: OptionsEvenements = {}): Evenement[] {
  const listees = personnesListees(d);
  const parId = new Map(listees.map((p) => [p.id, p]));
  const trouves: Evenement[] = [];
  const ajouter = (genre: GenreEvenement, personnes: Personne[], mois: number, jour: number, depuis?: number, extra: Partial<Evenement> = {}) => {
    const fois = prochaineFois(mois, jour, aujourdhui);
    if (fois.dans > horizon) return;
    const annees = depuis === undefined ? undefined : fois.annee - depuis;
    if (annees !== undefined && annees < (genre === 'union' ? 0 : 1)) return;
    trouves.push({ genre, dans: fois.dans, mois, jour: fois.jour, annee: fois.annee, personnes, ...(annees === undefined ? {} : { annees }), ...extra });
  };

  for (const p of listees) {
    if (estDecede(p)) {
      const deces = p.deces?.match(MOTIF_DATE);
      if (deces && deces[3] !== undefined) ajouter('deces', [p], Number(deces[2]), Number(deces[3]), Number(deces[1]));
      continue;
    }
    const naissance = jourMois(p.naissance);
    if (naissance) ajouter('anniversaire', [p], naissance.mois, naissance.jour, naissance.annee);
    const fete = options.fetes === false ? undefined : feteDuPrenom(p.prenom);
    if (fete) ajouter('fete', [p], fete.mois, fete.jour, undefined, { saint: fete.saint });
  }

  for (const u of d.unions) {
    const [a, b] = [parId.get(u.personneA), parId.get(u.personneB)];
    const date = jourMois(u.date);
    if (u.statut !== 'actuelle' || !a || !b || !date || (estDecede(a) && estDecede(b))) continue;
    ajouter('union', [a, b], date.mois, date.jour, date.annee, { marie: u.marie });
  }

  const nom = (e: Evenement) => e.personnes.map((p) => `${p.prenom} ${p.nom}`).join(' ');
  return trouves.sort((x, y) => x.dans - y.dans || ORDRE.indexOf(x.genre) - ORDRE.indexOf(y.genre) || nom(x).localeCompare(nom(y), 'fr'));
}

function majuscule(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}

/** Ligne de type des vignettes : « Anniversaire », « Noces d’étain », « 10 ans ensemble », « Mariage », « Fête », « Décès ». */
export function titreEvenement(e: Evenement): string {
  switch (e.genre) {
    case 'anniversaire':
      return 'Anniversaire';
    case 'fete':
      return 'Fête';
    case 'deces':
      return 'Décès';
    case 'union':
      if (e.annees === 0) return e.marie ? 'Mariage' : 'Union';
      if (e.annees === undefined) return e.marie ? 'Anniversaire de mariage' : 'Anniversaire d’union';
      return majuscule(libelleAnniversaireUnion(e.annees, !!e.marie));
  }
}

/** « 21 octobre », « 1er mai ». */
export function dateEvenement(e: Pick<Evenement, 'mois' | 'jour'>): string {
  return `${e.jour === 1 ? '1er' : e.jour} ${MOIS[e.mois - 1]}`;
}

/** « 34 ans », « 1 an » ; vide sans année. */
export function libelleAnnees(annees: number | undefined): string {
  if (annees === undefined) return '';
  return annees > 1 ? `${annees} ans` : `${annees} an`;
}

/** Personne : « Léa Morel ». Couple : « Henri et Odette Bastide » (même nom), sinon les deux noms ; `court` : « Marc et Sophie ». */
export function nomEvenement(e: Pick<Evenement, 'personnes'>, court = false): string {
  const [a, b] = e.personnes;
  if (!b) return nomComplet(a);
  if (court) return `${a.prenom || a.nom} et ${b.prenom || b.nom}`;
  if (a.nom && a.nom === b.nom) return `${a.prenom} et ${b.prenom} ${a.nom}`;
  return `${nomComplet(a)} et ${nomComplet(b)}`;
}

/** Seconde ligne de l'agenda : « anniversaire », « noces d’étain », « le grand jour », « fête · Sainte Céline », « décès en 2015 ». */
export function detailEvenement(e: Evenement): string {
  switch (e.genre) {
    case 'anniversaire':
      return 'anniversaire';
    case 'fete':
      return `fête · ${e.saint}`;
    case 'deces':
      return `décès en ${e.annee - (e.annees ?? 0)}`;
    case 'union':
      if (e.annees === 0) return 'le grand jour';
      if (e.annees === undefined) return e.marie ? 'anniversaire de mariage' : 'anniversaire d’union';
      return libelleAnniversaireUnion(e.annees, !!e.marie);
  }
}

/** Union : « mariés le 14 juin 1975 », « ensemble depuis le 14 juin 1975 », sans année : « mariés un 14 juin ». */
export function depuisUnion(e: Evenement): string {
  const date = e.annees === undefined ? `un ${dateEvenement(e)}` : `le ${dateEvenement(e)} ${e.annee - e.annees}`;
  return e.marie ? `mariés ${date}` : `ensemble depuis ${date}`;
}

const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « ven. » : jour de la semaine de l'événement. */
export function jourCourt(e: Pick<Evenement, 'annee' | 'mois' | 'jour'>): string {
  return JOURS_COURTS[new Date(e.annee, e.mois - 1, e.jour).getDay()];
}

/** Vignette : « ven. 24 » dans le mois en cours, « sam. 1er nov. » au-delà. */
export function quandCourt(e: Pick<Evenement, 'annee' | 'mois' | 'jour'>, aujourdhui: Date): string {
  const jour = `${jourCourt(e)} ${e.jour === 1 ? '1er' : e.jour}`;
  return e.mois === aujourdhui.getMonth() + 1 && e.annee === aujourdhui.getFullYear() ? jour : `${jour} ${MOIS_COURTS[e.mois - 1]}`;
}
