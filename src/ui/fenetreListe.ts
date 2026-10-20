// Pop-up du bas d'écran (élément <dialog>) : une liste de liens. Toucher une ligne ferme la fenêtre et suit le lien.

import { h } from './dom';

export interface LigneListe {
  href: string;
  pastille: HTMLElement;
  nom: string;
  detail: string;
}

/** `pied` : lien facultatif sous la liste (ex. gérer les groupes). `vide` : texte quand il n'y a aucune ligne. */
export function ouvrirListe(titre: string, lignes: LigneListe[], vide: string, pied?: { href: string; texte: string }): void {
  const fermer = () => {
    dialogue.close();
    dialogue.remove();
  };
  const dialogue = h(
    'dialog',
    { class: 'fenetre-liste', 'aria-label': titre, oncancel: fermer, onclick: (e: Event) => e.target === dialogue && fermer() },
    h('h2', {}, titre),
    ...(lignes.length === 0
      ? [h('p', { class: 'vide' }, vide)]
      : lignes.map((l) =>
          h('a', { class: 'ligne-feuille', href: l.href, onclick: fermer }, l.pastille, h('span', { class: 'nom-feuille' }, l.nom), h('small', {}, l.detail)),
        )),
    pied && h('a', { class: 'ligne-pied', href: pied.href, onclick: fermer }, pied.texte),
  );
  document.body.append(dialogue);
  dialogue.showModal();
}
