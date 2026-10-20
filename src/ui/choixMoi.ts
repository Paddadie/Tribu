// Feuille « Quelle est ta fiche ? » : choix de la fiche « Moi » (réglage), avec recherche.

import { filtrerParNom, comparateur, nomListe } from '../modele/liste';
import { personnesListees } from '../modele/modele';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierReglages } from './etat';
import { contenuLigne } from './lignePersonne';

/** Ouvre la feuille ; `apres` est appelé quand le choix a changé (pour redessiner l'écran). */
export function ouvrirChoixMoi(apres: () => void): void {
  let filtre = '';
  const liste = h('div', { class: 'carte' });
  const fermer = () => {
    dialogue.close();
    dialogue.remove();
  };
  const choisir = (moi: string | null) => {
    modifierReglages({ moi });
    fermer();
    apres();
  };

  const dessiner = () => {
    const tri = lireReglages().tri;
    const actuelle = lireReglages().moi;
    const personnes = filtrerParNom(personnesListees(lireDonnees()).sort(comparateur(tri)), filtre);
    liste.replaceChildren(
      ...(personnes.length === 0
        ? [h('p', { class: 'vide' }, filtre ? 'Aucun résultat.' : 'Aucune personne. Crées-en une depuis la liste.')]
        : personnes.map((p) =>
            h(
              'button',
              {
                type: 'button',
                class: `ligne ligne-choix${p.id === actuelle ? ' choisie' : ''}`,
                'aria-pressed': p.id === actuelle,
                onclick: () => choisir(p.id),
              },
              ...contenuLigne(p, nomListe(p, tri)),
            ),
          )),
    );
  };

  const champ = h('input', {
    type: 'search',
    placeholder: 'Rechercher par prénom ou nom',
    autocomplete: 'off',
    enterkeyhint: 'search',
    oninput: () => {
      filtre = champ.value;
      dessiner();
    },
  });

  const dialogue = h(
    'dialog',
    { class: 'feuille', 'aria-label': 'Choisir ma fiche', oncancel: fermer },
    h('h2', { class: 'feuille-titre' }, 'Quelle est ta fiche ?'),
    h('label', { class: 'champ-filtre champ-filtre-forme' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Rechercher une personne'), champ),
    h('div', { class: 'feuille-liste' }, liste),
    lireReglages().moi !== null && h('button', { type: 'button', class: 'bouton bouton-danger', onclick: () => choisir(null) }, 'Ne plus choisir de fiche'),
    h('button', { type: 'button', class: 'bouton', onclick: fermer }, 'Annuler'),
  );
  // Un toucher sur le fond (hors de la feuille) ferme aussi.
  dialogue.addEventListener('click', (e) => {
    const r = dialogue.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) fermer();
  });
  dessiner();
  document.body.append(dialogue);
  dialogue.showModal();
}
