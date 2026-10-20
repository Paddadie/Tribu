// Boîte de choix modale (élément <dialog>) : une question, plusieurs réponses, et « Annuler »
// qui abandonne tout. Résout l'index de la réponse, ou null si annulé.

import { h } from './dom';

export function choisir(message: string, options: string[], libelleAnnuler = 'Annuler l’import'): Promise<number | null> {
  return new Promise((resoudre) => {
    const fermer = (reponse: number | null) => {
      dialogue.close();
      dialogue.remove();
      resoudre(reponse);
    };
    const dialogue = h(
      'dialog',
      { class: 'confirmation', 'aria-label': 'Choix', oncancel: () => fermer(null) },
      h('p', {}, message),
      h(
        'div',
        { class: 'confirmation-actions confirmation-pile' },
        ...options.map((libelle, i) => h('button', { type: 'button', class: 'bouton', onclick: () => fermer(i) }, libelle)),
        h('button', { type: 'button', class: 'bouton', onclick: () => fermer(null) }, libelleAnnuler),
      ),
    );
    document.body.append(dialogue);
    dialogue.showModal();
  });
}
