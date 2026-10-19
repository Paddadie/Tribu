// Formulaire de création / modification d'une personne.

import { assemblerDate, decouperDate, MOIS } from '../modele/liste';
import { creerPersonne, modifierPersonne } from '../modele/modele';
import type { Personne, Sexe } from '../modele/types';
import { h } from './dom';
import { modifierDonnees } from './etat';

/** `existante` absente = création. `naviguer` remplace la route courante (pas d'empilement dans l'historique). */
export function formulaire(existante: Personne | undefined, naviguer: (route: string) => void): HTMLElement {
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
  const choixSexe = ([
    ['M', 'Homme'],
    ['F', 'Femme'],
  ] as const).map(([valeur, libelle]) =>
    h(
      'label',
      { class: 'choix' },
      h('input', { type: 'radio', name: 'sexe', value: valeur, checked: valeur === sexeInitial }),
      h('span', {}, libelle),
    ),
  );

  const note = h('textarea', { id: 'note', rows: 5, value: existante?.note ?? '' });
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const retour = existante ? `#/personne/${existante.id}` : '#/';

  const enregistrer = (e: Event) => {
    e.preventDefault();
    try {
      const sexe: Sexe = document.querySelector<HTMLInputElement>('input[name="sexe"]:checked')?.value === 'F' ? 'F' : 'M';
      const champs = {
        prenom: prenom.value,
        nom: nom.value,
        naissance: assemblerDate({ jour: jour.value, mois: mois.value, annee: annee.value }),
        sexe,
        note: note.value,
      };
      let id = existante?.id ?? '';
      modifierDonnees((d) => {
        if (existante) return modifierPersonne(d, existante.id, champs);
        const r = creerPersonne(d, champs);
        id = r.personne.id;
        return r.donnees;
      });
      naviguer(`#/personne/${id}`);
    } catch (err) {
      erreur.textContent = err instanceof Error ? err.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
  };

  const champ = (libelle: string, id: string, controle: HTMLElement) =>
    h('div', { class: 'champ' }, h('label', { for: id }, libelle), controle);

  return h(
    'div',
    { class: 'ecran' },
    h('div', { class: 'barre' }, h('h1', { class: 'titre-formulaire' }, existante ? 'Modifier' : 'Nouvelle personne')),
    h(
      'form',
      { class: 'contenu', onsubmit: enregistrer, novalidate: true },
      champ('Prénom', 'prenom', prenom),
      champ('Nom', 'nom', nom),
      h('fieldset', { class: 'champ' }, h('legend', {}, 'Sexe'), h('div', { class: 'choix-groupe' }, ...choixSexe)),
      h(
        'fieldset',
        { class: 'champ' },
        h('legend', {}, 'Date de naissance (facultative, année seule possible)'),
        h('div', { class: 'date-groupe' }, jour, mois, annee),
      ),
      champ('Note', 'note', note),
      erreur,
      h('button', { type: 'submit', class: 'bouton bouton-plein' }, 'Enregistrer'),
      h('a', { class: 'bouton', href: retour }, 'Annuler'),
    ),
  );
}
