// Écran d'accueil : liste des personnes (par lettre), filtre par nom, bouton +.
// Liste vide : « Ajouter la première personne » et « Restaurer une sauvegarde ».

import { filtrerParNom, grouperParLettre, nomListe, type Tri } from '../modele/liste';
import type { Personne } from '../modele/types';
import { importerJson } from '../modele/stockage';
import { changerAvecAnnulation, rafraichirEcran } from './annulation';
import { h, icone } from './dom';
import { lireDonnees, lireReglages } from './etat';
import { contenuLigne } from './lignePersonne';
import { messageImport } from './reglages';

// Le filtre survit à l'aller-retour liste → fiche → liste.
let filtre = '';

function ligne(p: Personne, tri: Tri): HTMLElement {
  return h('a', { class: 'ligne', href: `#/personne/${p.id}` }, ...contenuLigne(p, nomListe(p, tri)), icone('chevron', 18));
}

/** Premier lancement ou données effacées : créer une fiche ou restaurer une sauvegarde. */
function accueilVide(): HTMLElement {
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const fichier = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: -1, 'aria-hidden': true });
  fichier.addEventListener('change', async () => {
    const choisi = fichier.files?.[0];
    fichier.value = '';
    erreur.hidden = true;
    if (!choisi) return;
    try {
      const importees = importerJson(await choisi.text());
      changerAvecAnnulation(() => importees, messageImport(importees.personnes.length), 'Restauration annulée.');
      rafraichirEcran();
    } catch (e) {
      erreur.textContent = e instanceof Error ? `${e.message}.` : 'Restauration impossible.';
      erreur.hidden = false;
    }
  });
  return h(
    'div',
    { class: 'accueil-vide' },
    h('div', { class: 'avatar avatar-grand' }, icone('famille', 40)),
    h('h2', {}, 'Aucune personne pour l’instant'),
    h('p', { class: 'secondaire' }, 'Commencez par une fiche, ou reprenez une sauvegarde exportée depuis Tribu.'),
    h(
      'div',
      { class: 'accueil-vide-actions' },
      h('a', { class: 'bouton bouton-plein', href: '#/nouveau' }, 'Ajouter la première personne'),
      h('button', { type: 'button', class: 'bouton', onclick: () => fichier.click() }, 'Restaurer une sauvegarde'),
      fichier,
      erreur,
    ),
  );
}

function liste(): HTMLElement[] {
  const toutes = lireDonnees().personnes;
  const tri = lireReglages().tri;
  const trouvees = filtrerParNom(toutes, filtre);
  if (trouvees.length === 0) return [h('p', { class: 'vide' }, 'Aucun résultat.')];
  return grouperParLettre(trouvees, tri).map((g) =>
    h(
      'section',
      { class: 'groupe' },
      h('h2', { class: 'titre-section' }, g.lettre),
      h('div', { class: 'carte' }, ...g.personnes.map((p) => ligne(p, tri))),
    ),
  );
}

export function accueil(): HTMLElement {
  const total = lireDonnees().personnes.length;
  const titre = h(
    'div',
    { class: 'entete-ligne' },
    h('h1', {}, 'Tribu'),
    h(
      'div',
      { class: 'entete-droite' },
      h('span', { class: 'secondaire' }, `${total} ${total > 1 ? 'personnes' : 'personne'}`),
      h('a', { class: 'bouton-icone bouton-reglages', href: '#/reglages', 'aria-label': 'Réglages' }, icone('reglages', 24)),
    ),
  );
  if (total === 0) return h('div', { class: 'ecran' }, h('header', { class: 'entete-accueil' }, titre), accueilVide());

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

  return h(
    'div',
    { class: 'ecran' },
    h(
      'header',
      { class: 'entete-accueil' },
      titre,
      h('label', { class: 'champ-filtre' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Filtrer par nom'), champ),
    ),
    zoneListe,
    h('a', { class: 'ajout', href: '#/nouveau', 'aria-label': 'Ajouter une personne' }, icone('plus', 28)),
  );
}
