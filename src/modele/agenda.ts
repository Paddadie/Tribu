// Export des dates vers un agenda (.ics, RFC 5545) : naissances, décès et unions datées deviennent des événements
// annuels sur la journée. Les UID sont stables (id + type), donc réimporter met à jour sans créer de doublon.

import { nomComplet } from './liste';
import { MOTIF_DATE, MOTIF_SANS_ANNEE, estDateSansAnneeValide, estDateValide, personnesVisibles } from './modele';
import type { Donnees } from './types';

export type TypeEvenement = 'naissance' | 'deces' | 'union';

export interface EvenementAgenda {
  uid: string;
  type: TypeEvenement;
  titre: string;
  description?: string;
  mois: number;
  jour: number;
  /** Année de la date, absente quand elle est inconnue. */
  annee?: number;
}

export interface BilanAgenda {
  naissances: number;
  deces: number;
  unions: number;
}

const DOMAINE_UID = 'tribu';
/** Année de départ d'un événement sans année : bissextile, pour accepter le 29 février. */
const ANNEE_DEFAUT = 2000;

/** Mois et jour d'une date complète (« AAAA-MM-JJ ») ou sans année (« --MM-JJ ») ; undefined si le jour manque ou si la date est invalide. */
function jourDeLAnnee(date: string | undefined): { annee?: number; mois: number; jour: number } | undefined {
  if (!date) return undefined;
  if (estDateSansAnneeValide(date)) {
    const m = date.match(MOTIF_SANS_ANNEE)!;
    return { mois: Number(m[1]), jour: Number(m[2]) };
  }
  if (!estDateValide(date)) return undefined;
  const m = date.match(MOTIF_DATE)!;
  if (m[3] === undefined) return undefined;
  return { annee: Number(m[1]), mois: Number(m[2]), jour: Number(m[3]) };
}

/** Les événements annuels du carnet, triés par mois puis jour. Les fiches sans jour et mois sont ignorées, comme les ex. */
export function evenementsAgenda(d: Donnees): EvenementAgenda[] {
  const visibles = personnesVisibles(d);
  const parId = new Map(visibles.map((p) => [p.id, p]));
  const evenements: EvenementAgenda[] = [];

  for (const p of visibles) {
    const nom = nomComplet(p);
    const naissance = jourDeLAnnee(p.naissance);
    if (naissance) {
      evenements.push({
        uid: `${p.id}-naissance@${DOMAINE_UID}`,
        type: 'naissance',
        titre: `Anniversaire de ${nom}`,
        description: naissance.annee ? `Naissance en ${naissance.annee}.` : undefined,
        ...naissance,
      });
    }
    const deces = jourDeLAnnee(p.deces);
    if (deces) {
      evenements.push({
        uid: `${p.id}-deces@${DOMAINE_UID}`,
        type: 'deces',
        titre: `Souvenir de ${nom}`,
        description: deces.annee ? `Décès en ${deces.annee}.` : undefined,
        ...deces,
      });
    }
  }

  for (const u of d.unions) {
    if (u.statut !== 'actuelle') continue;
    const a = parId.get(u.personneA);
    const b = parId.get(u.personneB);
    const date = jourDeLAnnee(u.date);
    if (!a || !b || !date) continue;
    const noms = `${nomComplet(a)} et ${nomComplet(b)}`;
    evenements.push({
      uid: `${u.id}-union@${DOMAINE_UID}`,
      type: 'union',
      titre: u.marie ? `Anniversaire de mariage de ${noms}` : `Anniversaire de ${noms}`,
      description: date.annee ? `Union en ${date.annee}.` : undefined,
      ...date,
    });
  }

  return evenements.sort((x, y) => x.mois - y.mois || x.jour - y.jour || x.uid.localeCompare(y.uid));
}

export function bilanAgenda(evenements: EvenementAgenda[]): BilanAgenda {
  const compte = (type: TypeEvenement) => evenements.filter((e) => e.type === type).length;
  return { naissances: compte('naissance'), deces: compte('deces'), unions: compte('union') };
}

function echapper(texte: string): string {
  return texte.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Coupe une ligne à 60 caractères (sous la limite de 75 octets, accents compris) ; les suites commencent par une espace. */
function plier(ligne: string): string {
  const morceaux = Array.from(ligne);
  const lignes: string[] = [];
  for (let i = 0; i < morceaux.length; i += 60) lignes.push(morceaux.slice(i, i + 60).join(''));
  return lignes.join('\r\n ');
}

const deux = (n: number) => String(n).padStart(2, '0');

function horodatage(maintenant: Date): string {
  const t = maintenant;
  return `${t.getUTCFullYear()}${deux(t.getUTCMonth() + 1)}${deux(t.getUTCDate())}T${deux(t.getUTCHours())}${deux(t.getUTCMinutes())}${deux(t.getUTCSeconds())}Z`;
}

/** Le fichier .ics (fins de ligne CRLF). Le 29 février revient le dernier jour de février les années non bissextiles. */
export function construireIcs(evenements: EvenementAgenda[], maintenant: Date): string {
  const lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tribu//Agenda//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Tribu'];
  for (const e of evenements) {
    const debut = `${String(e.annee ?? ANNEE_DEFAUT).padStart(4, '0')}${deux(e.mois)}${deux(e.jour)}`;
    const regle = e.mois === 2 && e.jour === 29 ? 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'FREQ=YEARLY';
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${horodatage(maintenant)}`,
      `DTSTART;VALUE=DATE:${debut}`,
      `RRULE:${regle}`,
      `SUMMARY:${echapper(e.titre)}`,
    );
    if (e.description) lignes.push(`DESCRIPTION:${echapper(e.description)}`);
    lignes.push('TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lignes.push('END:VCALENDAR');
  return lignes.map(plier).join('\r\n') + '\r\n';
}

export const NOM_FICHIER_AGENDA = 'tribu.ics';
