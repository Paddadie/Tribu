// Réglages de l'appli (tri de la liste, thème, date du dernier export, fiche « Moi », « Qui suivre »), mémorisés dans localStorage sous
// leur propre clé : un import ou un effacement des données ne les touche pas.

import type { Tri } from './liste';
import { lireCercles, SUIVI_TOUT, type Suivi } from './suivi';
import type { Donnees, Personne } from './types';

export type Theme = 'auto' | 'clair' | 'sombre';

export interface Reglages {
  tri: Tri;
  theme: Theme;
  /** Date ISO du dernier export réussi ou lancé, null si jamais. */
  dernierExport: string | null;
  /** Id de ma fiche, null si non choisie. Gardé même si la fiche disparaît : voir `ficheMoi`. */
  moi: string | null;
  /** Fêtes du prénom à l'accueil et dans l'agenda. */
  fetes: boolean;
  /** Fêtes du prénom dans l'export .ics (non par défaut : une par personne, ça fait beaucoup). */
  fetesDansIcs: boolean;
  /** Cercles suivis pour les rappels et « À compléter » (suivi.ts) ; tous par défaut. */
  suivi: Suivi;
}

export const CLE_REGLAGES = 'tribu:reglages';

type Magasin = Pick<Storage, 'getItem' | 'setItem'>;

export const REGLAGES_PAR_DEFAUT: Reglages = {
  tri: 'prenom',
  theme: 'auto',
  dernierExport: null,
  moi: null,
  fetes: true,
  fetesDansIcs: false,
  suivi: SUIVI_TOUT,
};

/** Charge les réglages ; chaque valeur absente ou inconnue retombe sur sa valeur par défaut. */
export function chargerReglages(magasin: Magasin): Reglages {
  try {
    const brut = magasin.getItem(CLE_REGLAGES);
    const lu: unknown = brut === null ? null : JSON.parse(brut);
    const o = typeof lu === 'object' && lu !== null ? (lu as Record<string, unknown>) : {};
    return {
      tri: o.tri === 'prenom' || o.tri === 'nom' ? o.tri : REGLAGES_PAR_DEFAUT.tri,
      theme: o.theme === 'auto' || o.theme === 'clair' || o.theme === 'sombre' ? o.theme : REGLAGES_PAR_DEFAUT.theme,
      dernierExport: typeof o.dernierExport === 'string' && !Number.isNaN(Date.parse(o.dernierExport)) ? o.dernierExport : null,
      moi: typeof o.moi === 'string' && o.moi !== '' ? o.moi : null,
      fetes: typeof o.fetes === 'boolean' ? o.fetes : REGLAGES_PAR_DEFAUT.fetes,
      fetesDansIcs: typeof o.fetesDansIcs === 'boolean' ? o.fetesDansIcs : REGLAGES_PAR_DEFAUT.fetesDansIcs,
      suivi: lireSuivi(o.suivi),
    };
  } catch {
    return { ...REGLAGES_PAR_DEFAUT };
  }
}

function lireSuivi(v: unknown): Suivi {
  const o = typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  return { rappels: lireCercles(o.rappels, SUIVI_TOUT.rappels), completer: lireCercles(o.completer, SUIVI_TOUT.completer) };
}

export function sauvegarderReglages(magasin: Magasin, reglages: Reglages): void {
  magasin.setItem(CLE_REGLAGES, JSON.stringify(reglages));
}

/**
 * Ma fiche, si elle existe dans les données. Une fiche absente (supprimée, autres données importées)
 * vaut « non choisie », sans message ; l'id reste mémorisé, si bien qu'annuler l'import la retrouve.
 */
export function ficheMoi(reglages: Reglages, d: Donnees): Personne | undefined {
  return reglages.moi === null ? undefined : d.personnes.find((p) => p.id === reglages.moi);
}

/** « 12/10/2026 · il y a 7 jours », « Jamais » si aucun export. Jours comptés en dates locales. */
export function libelleDernierExport(iso: string | null, maintenant: Date): string {
  if (iso === null) return 'Jamais';
  const date = new Date(iso);
  const minuit = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const jours = Math.round((minuit(maintenant) - minuit(date)) / 86_400_000);
  const ecart = jours <= 0 ? 'aujourd’hui' : jours === 1 ? 'hier' : `il y a ${jours} jours`;
  return `${date.toLocaleDateString('fr-FR')} · ${ecart}`;
}
