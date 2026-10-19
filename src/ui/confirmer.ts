// Boîte de confirmation modale (élément <dialog>). Résout true si confirmé.

import { h } from './dom';

export function confirmer(message: string, libelleConfirmer: string): Promise<boolean> {
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
        h('button', { type: 'button', class: 'bouton', onclick: () => fermer(false) }, 'Annuler'),
        h('button', { type: 'button', class: 'bouton bouton-danger-plein', onclick: () => fermer(true) }, libelleConfirmer),
      ),
    );
    document.body.append(dialogue);
    dialogue.showModal();
  });
}
