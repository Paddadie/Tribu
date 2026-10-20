// Écran « Toutes les fiches » (#/personnes) : liste des personnes (par lettre), index alphabétique sur le bord droit,
// filtre par nom, bouton +. Sans personne : le même écran vide que l'accueil.

import { filtrerParNom, grouperParLettre, groupeVise, lettresIndex, nomListe, type Groupe, type Tri } from '../modele/liste';
import { MANQUES, filtrerListe, manquesDe, type Filtre, type Manque } from '../modele/filtres';
import type { Personne } from '../modele/types';
import { nomGroupe } from '../modele/deductions';
import { personnesListees } from '../modele/modele';
import { ficheMoi } from '../modele/reglages';
import { accueilVide } from './accueil';
import { h, icone } from './dom';
import { lireDonnees, lireReglages } from './etat';
import { contenuLigne } from './lignePersonne';
import { lienRetour } from './navigation';

// Le filtre survit à l'aller-retour liste → fiche → liste.
let filtre = '';
// Les puces aussi : filtre principal, groupe visé (« Un groupe »), manques cherchés (« À compléter »).
let puce: Filtre = 'tous';
let groupeChoisi = '';
const manquesChoisis = new Set<Manque>();

const PUCES: { filtre: Filtre; libelle: string }[] = [
  { filtre: 'tous', libelle: 'Toutes' },
  { filtre: 'famille', libelle: 'Famille' },
  { filtre: 'amis', libelle: 'Amis proches' },
  { filtre: 'groupe', libelle: 'Un groupe' },

  { filtre: 'acompleter', libelle: 'À compléter' },
];

function ligne(p: Personne, tri: Tri): HTMLElement {
  const contenu = contenuLigne(p, nomListe(p, tri));
  if (puce === 'acompleter') {
    const pastilles = manquesDe(p).map((m) => h('span', { class: 'pastille-manque' }, MANQUES.find((x) => x.manque === m)?.detail));
    contenu[1].append(h('span', { class: 'pastilles-manque' }, ...pastilles));
  }
  return h('a', { class: 'ligne', href: `#/personne/${p.id}` }, ...contenu, icone('chevron', 18));
}

function fichesFiltrees(): Personne[] {
  const d = lireDonnees();
  const moi = ficheMoi(lireReglages(), d)?.id;
  const criteres = { filtre: puce, groupe: groupeChoisi, manques: manquesChoisis };
  return filtrerListe(d, filtrerParNom(personnesListees(d), filtre), criteres, moi);
}

function liste(): HTMLElement[] {
  const tri = lireReglages().tri;
  const trouvees = fichesFiltrees();
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
  const index = h('div', { class: 'index', 'aria-hidden': true }, ...lettres.map((l) => h('span', { class: presentes.has(l) ? '' : 'absente' }, l)));

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

export function ecranPersonnes(): HTMLElement {
  const total = personnesListees(lireDonnees()).length;
  const compteur = h('span', { class: 'secondaire' });
  const titre = h(
    'div',
    { class: 'entete-ligne' },
    h(
      'div',
      { class: 'entete-gauche' },
      lienRetour('#/', { class: 'bouton-icone', 'aria-label': 'Retour' }, icone('retour', 26)),
      h('h1', {}, 'Toutes les fiches'),
    ),
    compteur,
  );
  if (total === 0) return h('div', { class: 'ecran' }, h('header', { class: 'entete-accueil' }, titre), accueilVide());

  const zoneListe = h('div', { class: 'liste' }, ...liste());
  // Pendant un filtrage, la liste est courte : l'index disparaît.
  const masquerIndex = () => (index.hidden = filtre.trim() !== '' || puce !== 'tous');
  const afficherCompteur = () => {
    const n = fichesFiltrees().length;
    compteur.textContent = n === total ? `${total} ${total > 1 ? 'personnes' : 'personne'}` : `${n} sur ${total}`;
  };
  const actualiser = () => {
    masquerIndex();
    afficherCompteur();
    zoneListe.replaceChildren(...liste());
  };

  const d = lireDonnees();
  const moi = ficheMoi(lireReglages(), d)?.id;
  if (puce === 'famille' && !moi) puce = 'tous';
  if (puce === 'groupe' && !d.groupes.some((g) => g.id === groupeChoisi)) groupeChoisi = d.groupes[0]?.id ?? '';
  if ((puce === 'groupe' || puce === 'amis') && d.groupes.length === 0) puce = 'tous';
  const rangPuces = h('div', { class: 'puces puces-liste', role: 'group', 'aria-label': 'Filtrer les fiches' });
  const rangSous = h('div', { class: 'puces puces-liste', role: 'group' });
  const bouton = (libelle: string, actif: boolean, onclick: () => void) =>
    h('button', { type: 'button', class: 'puce', 'aria-pressed': String(actif), onclick }, libelle);
  const dessinerPuces = () => {
    const dispo = PUCES.filter((x) => (x.filtre === 'famille' ? !!moi : x.filtre === 'amis' || x.filtre === 'groupe' ? d.groupes.length > 0 : true));
    rangPuces.replaceChildren(
      ...dispo.map((x) =>
        bouton(x.libelle, puce === x.filtre, () => {
          puce = x.filtre;
          if (puce === 'groupe' && !groupeChoisi) groupeChoisi = d.groupes[0]?.id ?? '';
          dessinerPuces();
          actualiser();
        }),
      ),
    );
    rangSous.hidden = puce !== 'groupe' && puce !== 'acompleter';
    rangSous.setAttribute('aria-label', puce === 'groupe' ? 'Groupe d’amis' : 'Informations manquantes');
    rangSous.replaceChildren(
      ...(puce === 'groupe'
        ? d.groupes.map((g) =>
            bouton(nomGroupe(d, g), groupeChoisi === g.id, () => {
              groupeChoisi = g.id;
              dessinerPuces();
              actualiser();
            }),
          )
        : puce === 'acompleter'
          ? MANQUES.map((m) =>
              bouton(m.libelle, manquesChoisis.has(m.manque), () => {
                if (!manquesChoisis.delete(m.manque)) manquesChoisis.add(m.manque);
                dessinerPuces();
                actualiser();
              }),
            )
          : []),
    );
  };
  dessinerPuces();

  const champ = h('input', {
    type: 'search',
    placeholder: 'Filtrer par prénom ou nom',
    value: filtre,
    autocomplete: 'off',
    enterkeyhint: 'search',
    oninput: () => {
      filtre = champ.value;
      actualiser();
    },
  });
  const entete = h(
    'header',
    { class: 'entete-accueil' },
    titre,
    h('label', { class: 'champ-filtre' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Filtrer par nom'), champ),
    rangPuces,
    rangSous,
  );
  const { index, bulle } = indexLettres(grouperParLettre(personnesListees(lireDonnees()), lireReglages().tri), zoneListe, entete);
  afficherCompteur();
  masquerIndex();

  return h(
    'div',
    { class: 'ecran' },
    entete,
    zoneListe,
    index,
    bulle,
    h('a', { class: 'ajout', href: '#/nouveau', 'aria-label': 'Ajouter une personne' }, icone('plus', 28)),
  );
}
