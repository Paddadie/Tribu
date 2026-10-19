// État de l'appli : les données en mémoire, écrites dans localStorage à chaque
// modification. Si l'écriture échoue (quota, navigation privée…), l'erreur
// remonte à l'appelant et les données en mémoire restent celles d'avant.

import { chargerReglages, sauvegarderReglages, type Reglages } from '../modele/reglages';
import { charger, sauvegarder } from '../modele/stockage';
import type { Donnees } from '../modele/types';

let donnees: Donnees = charger(localStorage);
let reglages: Reglages = chargerReglages(localStorage);

export function lireDonnees(): Donnees {
  return donnees;
}

/** Applique une transformation (fonction du modèle), la sauvegarde, puis la garde en mémoire. */
export function modifierDonnees(transformation: (d: Donnees) => Donnees): void {
  const suivantes = transformation(donnees);
  sauvegarder(localStorage, suivantes);
  donnees = suivantes;
}

export function lireReglages(): Reglages {
  return reglages;
}

/** Applique le thème : « auto » suit le téléphone (pas d'attribut), les deux autres le forcent. */
export function appliquerTheme(theme: Reglages['theme'] = reglages.theme): void {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

/** Change un ou plusieurs réglages, les mémorise et applique le thème. Garde le changement en mémoire même si l'écriture échoue. */
export function modifierReglages(changement: Partial<Reglages>): void {
  reglages = { ...reglages, ...changement };
  appliquerTheme();
  try {
    sauvegarderReglages(localStorage, reglages);
  } catch {
    // Mémorisation impossible (stockage plein ou bloqué) : le réglage vaut pour cette session.
  }
}
