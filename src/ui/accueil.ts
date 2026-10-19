// Écran d'accueil : liste des personnes (par lettre), index alphabétique sur le bord droit,
// filtre par nom, bouton +. Liste vide : « Ajouter la première personne » et « Restaurer une sauvegarde ».

import { libelleDelai, prochainsAnniversaires, type Anniversaire } from '../modele/age';
import { filtrerParNom, grouperParLettre, groupeVise, lettresIndex, nomComplet, nomListe, type Groupe, type Tri } from '../modele/liste';
import type { Personne } from '../modele/types';
import { importerJson } from '../modele/stockage';
import { changerAvecAnnulation, rafraichirEcran } from './annulation';
import { h, icone } from './dom';
import { lireDonnees, lireReglages } from './etat';
import { avatarPersonne, contenuLigne } from './lignePersonne';
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
      { class: 'groupe', 'data-lettre': g.lettre },
      h('h2', { class: 'titre-section' }, g.lettre),
      h('div', { class: 'carte' }, ...g.personnes.map((p) => ligne(p, tri))),
    ),
  );
}

/**
 * Index latéral : toucher ou glisser sur une lettre fait défiler jusqu'à son groupe (sinon le suivant présent),
 * avec la lettre en grand au centre. Les lettres sans personne sont estompées.
 * Réservé au doigt : au clavier ou au lecteur d'écran, le filtre fait mieux.
 */
function indexLettres(groupes: Groupe[], zoneListe: HTMLElement, entete: HTMLElement): { index: HTMLElement; bulle: HTMLElement } {
  const presentes = new Set(groupes.map((g) => g.lettre));
  const lettres = lettresIndex(groupes);
  const bulle = h('div', { class: 'bulle', 'aria-hidden': true, hidden: true });
  const index = h(
    'div',
    { class: 'index', 'aria-hidden': true },
    ...lettres.map((l) => h('span', { class: presentes.has(l) ? '' : 'absente' }, l)),
  );

  const aller = (e: PointerEvent) => {
    const r = index.getBoundingClientRect();
    const rang = Math.min(lettres.length - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * lettres.length)));
    const cible = groupeVise(groupes, lettres[rang]);
    const section = cible && zoneListe.querySelector<HTMLElement>(`[data-lettre="${cible}"]`);
    if (!section) return;
    bulle.textContent = cible;
    bulle.hidden = false;
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - entete.offsetHeight);
  };
  const lacher = () => (bulle.hidden = true);

  index.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    index.setPointerCapture?.(e.pointerId);
    aller(e);
  });
  index.addEventListener('pointermove', (e) => {
    if (!bulle.hidden) aller(e);
  });
  index.addEventListener('pointerup', lacher);
  index.addEventListener('pointercancel', lacher);
  return { index, bulle };
}

function ligneAnniversaire({ personne, dans, age, date }: Anniversaire): HTMLElement {
  return h(
    'a',
    { class: dans === 0 ? 'ligne aujourdhui' : 'ligne', href: `#/personne/${personne.id}` },
    avatarPersonne(personne),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(personne)), h('span', { class: 'secondaire' }, date)),
    h('span', { class: 'quand' }, h('strong', {}, libelleDelai(dans)), h('span', { class: 'etiquette' }, `${age} ans`)),
  );
}

/** Les 3 prochains anniversaires des 30 jours à venir, au-dessus de la liste ; le bloc est vide s'il n'y en a pas. */
function blocAnniversaires(): HTMLElement {
  const proches = prochainsAnniversaires(lireDonnees().personnes, new Date());
  return h(
    'section',
    { class: 'anniversaires', hidden: proches.length === 0 },
    h('h2', { class: 'titre-section' }, 'Prochains anniversaires'),
    h('div', { class: 'carte' }, ...proches.map(ligneAnniversaire)),
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
  const anniversaires = blocAnniversaires();
  const avecAnniversaires = !anniversaires.hidden;
  // Pendant un filtrage, la liste est courte : l'index et les anniversaires disparaissent.
  const masquerIndex = () => {
    index.hidden = filtre.trim() !== '';
    anniversaires.hidden = !avecAnniversaires || filtre.trim() !== '';
  };

  const champ = h('input', {
    type: 'search',
    placeholder: 'Filtrer par prénom ou nom',
    value: filtre,
    autocomplete: 'off',
    enterkeyhint: 'search',
    oninput: () => {
      filtre = champ.value;
      masquerIndex();
      zoneListe.replaceChildren(...liste());
    },
  });
  const entete = h(
    'header',
    { class: 'entete-accueil' },
    titre,
    h('label', { class: 'champ-filtre' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Filtrer par nom'), champ),
  );
  const { index, bulle } = indexLettres(grouperParLettre(lireDonnees().personnes, lireReglages().tri), zoneListe, entete);
  masquerIndex();

  return h(
    'div',
    { class: 'ecran' },
    entete,
    anniversaires,
    zoneListe,
    index,
    bulle,
    h('a', { class: 'ajout', href: '#/nouveau', 'aria-label': 'Ajouter une personne' }, icone('plus', 28)),
  );
}
