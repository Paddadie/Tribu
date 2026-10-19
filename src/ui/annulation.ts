// Changement de données annulable (import, effacement) : il est appliqué, puis
// un bandeau propose « Annuler » quelques secondes. L'annulation redessine
// l'écran affiché à ce moment-là, quel qu'il soit.

import { afficherBandeau } from './bandeau';
import { modifierDonneesAnnulable } from './etat';
import type { Donnees } from '../modele/types';

export const EVENEMENT_RAFRAICHIR = 'tribu:rafraichir';

/** Redessine l'écran courant sans changer de route ni de défilement (écouté par main.ts). */
export function rafraichirEcran(): void {
  window.dispatchEvent(new Event(EVENEMENT_RAFRAICHIR));
}

/** Applique le changement (lève une erreur si l'écriture échoue), puis propose de l'annuler. */
export function changerAvecAnnulation(transformation: (d: Donnees) => Donnees, message: string, messageAnnule: string): void {
  const annuler = modifierDonneesAnnulable(transformation);
  afficherBandeau(message, {
    libelle: 'Annuler',
    faire: () => {
      try {
        annuler();
        afficherBandeau(messageAnnule);
      } catch (e) {
        afficherBandeau(e instanceof Error ? e.message : 'Annulation impossible');
      }
      rafraichirEcran();
    },
  });
}
