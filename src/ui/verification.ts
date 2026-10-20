// Écran « Vérifier mes données » (#/verification) : doublons probables, personnes isolées, dates incohérentes et
// fiches « Test ». Lecture seule ; chaque ligne ouvre la fiche concernée.

import { verifier } from '../modele/verification';
import type { Personne } from '../modele/types';
import { nomComplet } from '../modele/liste';
import { h, icone } from './dom';
import { lireDonnees } from './etat';
import { contenuLigne } from './lignePersonne';
import { lienRetour } from './navigation';

const ligne = (p: Personne, detail?: string) =>
  h('a', { class: 'ligne', href: `#/personne/${p.id}` }, ...contenuLigne(p, nomComplet(p), detail), icone('chevron', 18));

function rubrique(titre: string, nombre: number, vide: string, ...lignes: HTMLElement[]): HTMLElement {
  return h(
    'section',
    { class: 'groupe-reglages' },
    h('h2', { class: 'titre-section' }, `${titre} · ${nombre}`),
    nombre === 0 ? h('p', { class: 'secondaire' }, vide) : h('div', { class: 'carte' }, ...lignes),
  );
}

export function ecranVerification(): HTMLElement {
  const v = verifier(lireDonnees());
  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour('#/reglages', { class: 'bouton-icone', 'aria-label': 'Retour' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, 'Vérifier mes données'),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'secondaire' }, 'Tribu relit tes fiches et signale ce qui mérite un coup d’œil. Rien n’est modifié.'),
      rubrique(
        'Doublons probables',
        v.doublons.length,
        'Aucun doublon probable.',
        ...v.doublons.flatMap((x) => [h('p', { class: 'secondaire aide-section' }, x.raison), ligne(x.a), ligne(x.b)]),
      ),
      rubrique(
        'Personnes isolées',
        v.isolees.length,
        'Tout le monde est relié à quelqu’un.',
        ...v.isolees.map((p) => ligne(p, 'Aucun lien familial, d’union ni d’amitié')),
      ),
      rubrique('Dates incohérentes', v.dates.length, 'Aucune date incohérente.', ...v.dates.map((x) => ligne(x.personne, x.raison))),
      rubrique('Fiches « Test »', v.tests.length, 'Aucune fiche dont le nom est « test ».', ...v.tests.map((p) => ligne(p))),
    ),
  );
}
