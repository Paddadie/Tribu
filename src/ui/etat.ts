// État de l'appli : les données en mémoire, écrites dans localStorage à chaque
// modification. Si l'écriture échoue (quota, navigation privée…), l'erreur
// remonte à l'appelant et les données en mémoire restent celles d'avant.

import { charger, sauvegarder } from '../modele/stockage';
import type { Donnees } from '../modele/types';

let donnees: Donnees = charger(localStorage);

export function lireDonnees(): Donnees {
  return donnees;
}

/** Applique une transformation (fonction du modèle), la sauvegarde, puis la garde en mémoire. */
export function modifierDonnees(transformation: (d: Donnees) => Donnees): void {
  const suivantes = transformation(donnees);
  sauvegarder(localStorage, suivantes);
  donnees = suivantes;
}
