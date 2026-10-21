// Pop-up du bas d'écran (élément <dialog>) : une liste de liens. Toucher une ligne ferme la fenêtre et suit le lien.

import { h } from './dom';

export interface LigneListe {
  href: string;
  pastille: HTMLElement;
  nom: string;
  detail: string;
}

/** Un filtre en puce : son texte et les lignes qu'il laisse voir. */
export interface FiltreListe {
  texte: string;
  lignes: LigneListe[];
}

/**
 * `pied` : lien facultatif sous la liste (ex. gérer les groupes). `vide` : texte quand il n'y a aucune ligne.
 * `filtres` : puces au-dessus de la liste ; la première est active à l'ouverture et remplace `lignes`.
 */
export function ouvrirListe(titre: string, lignes: LigneListe[], vide: string, pied?: { href: string; texte: string }, filtres: FiltreListe[] = []): void {
  const fermer = () => {
    dialogue.close();
    dialogue.remove();
  };
  const corps = h('div', { class: 'corps-liste' });
  const montrer = (ls: LigneListe[]) =>
    corps.replaceChildren(
      ...(ls.length === 0
        ? [h('p', { class: 'vide' }, vide)]
        : ls.map((l) =>
            h('a', { class: 'ligne-feuille', href: l.href, onclick: fermer }, l.pastille, h('span', { class: 'nom-feuille' }, l.nom), h('small', {}, l.detail)),
          )),
    );
  const puces: HTMLElement[] = filtres.map((f, i) =>
    h(
      'button',
      {
        type: 'button',
        class: 'puce',
        'aria-pressed': String(i === 0),
        onclick: () => {
          puces.forEach((p, j) => p.setAttribute('aria-pressed', String(j === i)));
          montrer(f.lignes);
        },
      },
      f.texte,
    ),
  );
  montrer(filtres[0]?.lignes ?? lignes);
  const dialogue = h(
    'dialog',
    { class: 'fenetre-liste', 'aria-label': titre, oncancel: fermer, onclick: (e: Event) => e.target === dialogue && fermer() },
    h('h2', {}, titre),
    puces.length > 1 && h('div', { class: 'puces puces-liste' }, ...puces),
    corps,
    pied && h('a', { class: 'ligne-pied', href: pied.href, onclick: fermer }, pied.texte),
  );
  document.body.append(dialogue);
  dialogue.showModal();
}
