// Réglages de l'appli (tri de la liste, thème), mémorisés dans localStorage sous
// leur propre clé : un import ou un effacement des données ne les touche pas.

import type { Tri } from './liste';

export type Theme = 'auto' | 'clair' | 'sombre';

export interface Reglages {
  tri: Tri;
  theme: Theme;
}

export const CLE_REGLAGES = 'tribu:reglages';

type Magasin = Pick<Storage, 'getItem' | 'setItem'>;

export const REGLAGES_PAR_DEFAUT: Reglages = { tri: 'prenom', theme: 'auto' };

/** Charge les réglages ; chaque valeur absente ou inconnue retombe sur sa valeur par défaut. */
export function chargerReglages(magasin: Magasin): Reglages {
  try {
    const brut = magasin.getItem(CLE_REGLAGES);
    const lu: unknown = brut === null ? null : JSON.parse(brut);
    const o = typeof lu === 'object' && lu !== null ? (lu as Record<string, unknown>) : {};
    return {
      tri: o.tri === 'prenom' || o.tri === 'nom' ? o.tri : REGLAGES_PAR_DEFAUT.tri,
      theme: o.theme === 'auto' || o.theme === 'clair' || o.theme === 'sombre' ? o.theme : REGLAGES_PAR_DEFAUT.theme,
    };
  } catch {
    return { ...REGLAGES_PAR_DEFAUT };
  }
}

export function sauvegarderReglages(magasin: Magasin, reglages: Reglages): void {
  magasin.setItem(CLE_REGLAGES, JSON.stringify(reglages));
}
