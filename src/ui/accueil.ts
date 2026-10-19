// Écran d'accueil : liste des personnes (par lettre), filtre par nom, bouton +.

import { filtrerParNom, grouperParLettre, initiales, libelleNaissance, nomComplet } from '../modele/liste';
import type { Personne } from '../modele/types';
import { h, icone } from './dom';
import { lireDonnees } from './etat';

// Le filtre survit à l'aller-retour liste → fiche → liste.
let filtre = '';

function ligne(p: Personne): HTMLElement {
  const detail = libelleNaissance(p.naissance, p.sexe);
  return h(
    'a',
    { class: 'ligne', href: `#/personne/${p.id}` },
    h('span', { class: 'avatar' }, initiales(p)),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(p)), detail && h('span', { class: 'secondaire' }, detail)),
    icone('chevron', 18),
  );
}

function liste(): HTMLElement[] {
  const toutes = lireDonnees().personnes;
  if (toutes.length === 0) {
    return [h('p', { class: 'vide' }, 'Aucune personne pour l’instant. Touchez + pour en ajouter une.')];
  }
  const trouvees = filtrerParNom(toutes, filtre);
  if (trouvees.length === 0) return [h('p', { class: 'vide' }, 'Aucun résultat.')];
  return grouperParLettre(trouvees).map((g) =>
    h(
      'section',
      { class: 'groupe' },
      h('h2', { class: 'titre-section' }, g.lettre),
      h('div', { class: 'carte' }, ...g.personnes.map(ligne)),
    ),
  );
}

export function accueil(): HTMLElement {
  const total = lireDonnees().personnes.length;
  const zoneListe = h('div', { class: 'liste' }, ...liste());

  const champ = h('input', {
    type: 'search',
    placeholder: 'Filtrer par prénom ou nom',
    value: filtre,
    autocomplete: 'off',
    enterkeyhint: 'search',
    oninput: () => {
      filtre = champ.value;
      zoneListe.replaceChildren(...liste());
    },
  });

  const date = new Date(__BUILD_DATE__).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  return h(
    'div',
    { class: 'ecran' },
    h(
      'header',
      { class: 'entete-accueil' },
      h('div', { class: 'entete-ligne' }, h('h1', {}, 'Tribu'), h('span', { class: 'secondaire' }, `${total} ${total > 1 ? 'personnes' : 'personne'}`)),
      h('label', { class: 'champ-filtre' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Filtrer par nom'), champ),
    ),
    zoneListe,
    h('p', { class: 'version' }, `v${__APP_VERSION__} · build du ${date}`),
    h('a', { class: 'ajout', href: '#/nouveau', 'aria-label': 'Ajouter une personne' }, icone('plus', 28)),
  );
}
