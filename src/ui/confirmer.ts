// Boîte de confirmation modale (élément <dialog>). Résout true si confirmé.
// `danger` à false : bouton de confirmation dans la couleur principale.

import { h } from './dom';

export function confirmer(message: string, libelleConfirmer: string, libelleAnnuler = 'Annuler', danger = true): Promise<boolean> {
  return new Promise((resoudre) => {
    const fermer = (reponse: boolean) => {
      dialogue.close();
      dialogue.remove();
      resoudre(reponse);
    };
    const dialogue = h(
      'dialog',
      { class: 'confirmation', 'aria-label': 'Confirmation', oncancel: () => fermer(false) },
      h('p', {}, message),
      h(
        'div',
        { class: 'confirmation-actions' },
        h('button', { type: 'button', class: 'bouton', onclick: () => fermer(false) }, libelleAnnuler),
        h('button', { type: 'button', class: `bouton ${danger ? 'bouton-danger-plein' : 'bouton-plein'}`, onclick: () => fermer(true) }, libelleConfirmer),
      ),
    );
    document.body.append(dialogue);
    dialogue.showModal();
  });
}
