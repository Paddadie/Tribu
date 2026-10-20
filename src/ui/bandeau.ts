// Bandeau en bas de l'écran : un message et, au besoin, une action
// (« Annuler »). Un seul à la fois ; il survit au changement d'écran et
// disparaît seul au bout de quelques secondes. Réutilisé en S2b (UX-07).
// Avec une durée infinie (« Nouvelle version prête »), il reste jusqu'à son
// action, et revient après un bandeau temporaire qui l'a recouvert.

import { h } from './dom';

type Action = { libelle: string; faire: () => void };

let actuel: { element: HTMLElement; minuteur?: number } | null = null;
let enAttente: { message: string; action?: Action } | null = null;

function retirer(): void {
  if (!actuel) return;
  clearTimeout(actuel.minuteur);
  actuel.element.remove();
  actuel = null;
}

/** Ferme le bandeau affiché ; un bandeau persistant recouvert reprend sa place. */
export function fermerBandeau(): void {
  retirer();
  if (enAttente) afficherBandeau(enAttente.message, enAttente.action, Infinity);
}

export function afficherBandeau(message: string, action?: Action, duree = 8000): void {
  retirer();
  const persistant = duree === Infinity;
  if (persistant) enAttente = { message, action };
  const bouton =
    action &&
    h(
      'button',
      {
        type: 'button',
        class: 'bandeau-action',
        onclick: () => {
          if (persistant) enAttente = null;
          fermerBandeau();
          action.faire();
        },
      },
      action.libelle,
    );
  const element = h('div', { class: 'bandeau', role: 'status' }, h('span', {}, message), bouton);
  document.body.append(element);
  actuel = { element, minuteur: persistant ? undefined : window.setTimeout(fermerBandeau, duree) };
}
