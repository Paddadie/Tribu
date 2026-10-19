// Bandeau temporaire en bas de l'écran : un message et, au besoin, une action
// (« Annuler »). Un seul à la fois ; il survit au changement d'écran et
// disparaît seul au bout de quelques secondes. Réutilisé en S2b (UX-07).

import { h } from './dom';

let actuel: { element: HTMLElement; minuteur: number } | null = null;

export function fermerBandeau(): void {
  if (!actuel) return;
  clearTimeout(actuel.minuteur);
  actuel.element.remove();
  actuel = null;
}

export function afficherBandeau(message: string, action?: { libelle: string; faire: () => void }, duree = 8000): void {
  fermerBandeau();
  const bouton =
    action &&
    h(
      'button',
      {
        type: 'button',
        class: 'bandeau-action',
        onclick: () => {
          fermerBandeau();
          action.faire();
        },
      },
      action.libelle,
    );
  const element = h('div', { class: 'bandeau', role: 'status' }, h('span', {}, message), bouton);
  document.body.append(element);
  actuel = { element, minuteur: window.setTimeout(fermerBandeau, duree) };
}
