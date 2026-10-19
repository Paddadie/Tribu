// Champs d'identité d'une personne (prénom, nom, sexe, naissance, note), partagés
// par le formulaire de fiche et l'ajout d'un conjoint à créer.

import { assemblerDate, decouperDate, MOIS } from '../modele/liste';
import type { ChampsPersonne } from '../modele/modele';
import type { Personne, Sexe } from '../modele/types';
import { h } from './dom';

export interface ChampsIdentite {
  /** Contrôles à insérer dans un formulaire, dans l'ordre d'affichage. */
  noeuds: HTMLElement[];
  lire: () => ChampsPersonne;
}

const champ = (libelle: string, id: string, controle: HTMLElement) =>
  h('div', { class: 'champ' }, h('label', { for: id }, libelle), controle);

/** `existante` préremplit les champs ; `avecNote` ajoute la note libre. */
export function champsIdentite(existante: Personne | undefined, avecNote: boolean): ChampsIdentite {
  const prenom = h('input', { id: 'prenom', type: 'text', value: existante?.prenom ?? '', autocomplete: 'off', autocapitalize: 'words' });
  const nom = h('input', { id: 'nom', type: 'text', value: existante?.nom ?? '', autocomplete: 'off', autocapitalize: 'words' });
  // Date partielle possible : année seule, mois + année, ou date complète.
  const date = decouperDate(existante?.naissance);
  const jour = h('input', { id: 'jour', type: 'text', inputmode: 'numeric', maxlength: 2, placeholder: 'JJ', value: date.jour, autocomplete: 'off' });
  const mois = h(
    'select',
    { id: 'mois', 'aria-label': 'Mois de naissance' },
    h('option', { value: '' }, 'Mois'),
    ...MOIS.map((m, i) => h('option', { value: String(i + 1), selected: date.mois === String(i + 1) }, m)),
  );
  const annee = h('input', { id: 'annee', type: 'text', inputmode: 'numeric', maxlength: 4, placeholder: 'AAAA', value: date.annee, autocomplete: 'off' });

  // Homme par défaut (création, et personnes enregistrées avant l'ajout du champ).
  const sexeInitial: Sexe = existante?.sexe ?? 'M';
  const radios = (
    [
      ['M', 'Homme'],
      ['F', 'Femme'],
    ] as const
  ).map(([valeur, libelle]) => ({
    valeur,
    radio: h('input', { type: 'radio', name: 'sexe', value: valeur, checked: valeur === sexeInitial }),
    libelle,
  }));
  const choixSexe = radios.map(({ radio, libelle }) => h('label', { class: 'choix' }, radio, h('span', {}, libelle)));

  const note = h('textarea', { id: 'note', rows: 5, value: existante?.note ?? '' });

  return {
    noeuds: [
      champ('Prénom', 'prenom', prenom),
      champ('Nom', 'nom', nom),
      h('fieldset', { class: 'champ' }, h('legend', {}, 'Sexe'), h('div', { class: 'choix-groupe' }, ...choixSexe)),
      h(
        'fieldset',
        { class: 'champ' },
        h('legend', {}, 'Date de naissance (facultative, année seule possible)'),
        h('div', { class: 'date-groupe' }, jour, mois, annee),
      ),
      ...(avecNote ? [champ('Note', 'note', note)] : []),
    ],
    lire: () => ({
      prenom: prenom.value,
      nom: nom.value,
      naissance: assemblerDate({ jour: jour.value, mois: mois.value, annee: annee.value }),
      sexe: radios.find((r) => r.radio.checked)?.valeur ?? 'M',
      note: avecNote ? note.value : (existante?.note ?? ''),
    }),
  };
}
