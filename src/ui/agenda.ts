// Agenda (#/agenda) : les 12 prochains mois, groupés par mois, filtrables par genre ; en bas, l'export vers l'agenda
// du téléphone (écran Réglages).

import { detailEvenement, evenementsAVenir, jourCourt, libelleAnnees, nomEvenement, type Evenement, type GenreEvenement } from '../modele/evenements';
import { MOIS } from '../modele/liste';
import { h, icone } from './dom';
import { lireDonnees, lireReglages } from './etat';
import { lienRetour } from './navigation';

type Filtre = 'tout' | GenreEvenement;

const FILTRES: { filtre: Filtre; libelle: string }[] = [
  { filtre: 'tout', libelle: 'Tout' },
  { filtre: 'anniversaire', libelle: 'Anniversaires' },
  { filtre: 'union', libelle: 'Noces' },
  { filtre: 'fete', libelle: 'Fêtes' },
  { filtre: 'deces', libelle: 'Décès' },
];

// Le filtre survit à l'aller-retour agenda → fiche → agenda.
let filtre: Filtre = 'tout';

const majuscule = (t: string) => t.charAt(0).toLocaleUpperCase('fr') + t.slice(1);

function ligne(e: Evenement): HTMLElement {
  const pastille = e.genre === 'union' ? (e.annees === 0 ? '' : libelleAnnees(e.annees)) : e.genre === 'fete' ? '' : libelleAnnees(e.annees);
  return h(
    'a',
    { class: e.genre === 'deces' ? 'ligne gris' : 'ligne', href: `#/personne/${e.personnes[0].id}` },
    h('span', { class: e.dans === 0 ? 'datebloc auj' : 'datebloc' }, h('strong', {}, String(e.jour)), h('span', {}, jourCourt(e))),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomEvenement(e)), h('span', { class: 'secondaire' }, detailEvenement(e))),
    pastille && h('span', { class: e.dans === 0 ? 'etiquette accent' : 'etiquette' }, pastille),
  );
}

/** Sections par mois ; l'année n'est écrite que hors de l'année en cours. */
function mois(evs: Evenement[], anneeCourante: number): HTMLElement[] {
  const groupes: { cle: string; titre: string; evs: Evenement[] }[] = [];
  for (const e of evs) {
    const cle = `${e.annee}-${e.mois}`;
    let g = groupes[groupes.length - 1];
    if (!g || g.cle !== cle) {
      g = { cle, titre: majuscule(MOIS[e.mois - 1]) + (e.annee === anneeCourante ? '' : ` ${e.annee}`), evs: [] };
      groupes.push(g);
    }
    g.evs.push(e);
  }
  return groupes.map((g) => h('section', { class: 'groupe' }, h('h2', { class: 'titre-section' }, g.titre), h('div', { class: 'carte' }, ...g.evs.map(ligne))));
}

export function ecranAgenda(): HTMLElement {
  const aujourdhui = new Date();
  const avecFetes = lireReglages().fetes;
  if (!avecFetes && filtre === 'fete') filtre = 'tout';
  // 12 mois : jusqu'à la veille du même jour l'an prochain.
  const tous = evenementsAVenir(lireDonnees(), aujourdhui, 364, { fetes: avecFetes });
  const zone = h('div', { class: 'agenda' });
  const puces = FILTRES.filter((f) => avecFetes || f.filtre !== 'fete').map((f) =>
    h(
      'button',
      {
        type: 'button',
        class: 'puce',
        'data-filtre': f.filtre,
        onclick: () => {
          filtre = f.filtre;
          montrer();
        },
      },
      f.libelle,
    ),
  );
  const montrer = () => {
    for (const p of puces) p.setAttribute('aria-pressed', String(p.dataset.filtre === filtre));
    const evs = filtre === 'tout' ? tous : tous.filter((e) => e.genre === filtre);
    zone.replaceChildren(...(evs.length === 0 ? [h('p', { class: 'vide' }, 'Rien dans les 12 prochains mois.')] : mois(evs, aujourdhui.getFullYear())));
  };
  montrer();

  return h(
    'div',
    { class: 'ecran' },
    h(
      'header',
      { class: 'entete-accueil' },
      h(
        'div',
        { class: 'entete-ligne' },
        h('div', { class: 'entete-gauche' }, lienRetour('#/', { class: 'bouton-icone', 'aria-label': 'Retour' }, icone('retour', 26)), h('h1', {}, 'Agenda')),
      ),
      h('div', { class: 'puces', role: 'group', 'aria-label': 'Filtrer' }, ...puces),
    ),
    h('div', { class: 'contenu' }, zone, h('a', { class: 'lien-ics', href: '#/reglages' }, icone('agenda'), 'Ajouter à l’agenda du téléphone')),
  );
}
