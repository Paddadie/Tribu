// Champs d'identité d'une personne (prénom, nom, sexe, naissance, note), partagés
// par le formulaire de fiche et l'ajout d'un conjoint à créer.

import { assemblerDate, decouperDate, homonymes, MOIS, nomComplet } from '../modele/liste';import type { ChampsPersonne } from '../modele/modele';
import type { Personne, Sexe } from '../modele/types';
import { confirmer } from './confirmer';
import { h } from './dom';

export interface ChampsIdentite {
  /** Contrôles à insérer dans un formulaire, dans l'ordre d'affichage. */
  noeuds: HTMLElement[];
  lire: () => ChampsPersonne;
  /** Bloc du champ Nom, pour y ajouter un bouton. */
  champNom: HTMLElement;
  /** Nom saisi, tel quel (sans contrôle de la date, contrairement à `lire`). */
  lireNom: () => string;
  /** Remplace le nom sans compter comme une saisie. */
  definirNom: (nom: string) => void;
  /** Place le curseur dans le prénom (clavier ouvert). */
  viserPrenom: () => void;
  /** Un champ diffère de son contenu de départ. */
  modifie: () => boolean;
}

const champ = (libelle: string, id: string, controle: HTMLElement) =>
  h('div', { class: 'champ' }, h('label', { for: id }, libelle), controle);

/**
 * Jour, mois et année d'une date partielle possible (année seule, mois + année, ou date complète).
 * `suffixe` distingue les ids de deux dates sur le même écran ; `de` complète les libellés (« de naissance »).
 */
function champDate(suffixe: string, de: string, valeur: string | undefined) {
  const date = decouperDate(valeur);
  const jour = h('input', { id: `jour${suffixe}`, type: 'text', inputmode: 'numeric', maxlength: 2, placeholder: 'JJ', value: date.jour, autocomplete: 'off', 'aria-label': `Jour ${de}` });
  const mois = h(
    'select',
    { id: `mois${suffixe}`, 'aria-label': `Mois ${de}` },
    h('option', { value: '' }, 'Mois'),
    ...MOIS.map((m, i) => h('option', { value: String(i + 1), selected: date.mois === String(i + 1) }, m)),
  );
  const annee = h('input', { id: `annee${suffixe}`, type: 'text', inputmode: 'numeric', maxlength: 4, placeholder: 'AAAA', value: date.annee, autocomplete: 'off', 'aria-label': `Année ${de}` });
  return {
    groupe: h('div', { class: 'date-groupe' }, jour, mois, annee),
    valeurs: () => [jour.value, mois.value, annee.value],
    lire: () => assemblerDate({ jour: jour.value, mois: mois.value, annee: annee.value }, de),
  };
}

/** `existante` préremplit les champs ; `avecNote` ajoute la note libre ; `nomInitial` préremplit le nom d'une création. */
export function champsIdentite(existante: Personne | undefined, avecNote: boolean, sexeParDefaut: Sexe = 'M', nomInitial = ''): ChampsIdentite {
  const prenom = h('input', { id: 'prenom', type: 'text', value: existante?.prenom ?? '', autocomplete: 'off', autocapitalize: 'words' });
  const nom = h('input', { id: 'nom', type: 'text', value: existante?.nom ?? nomInitial, autocomplete: 'off', autocapitalize: 'words' });
  const naissance = champDate('', 'de naissance', existante?.naissance);
  const deces = champDate('-deces', 'de décès', existante?.deces);

  // Création : `sexeParDefaut` (Homme sauf indication). Fiche existante : son sexe,
  // ou rien de coché si elle date d'avant l'ajout du champ (il reste alors non précisé).
  const sexeInitial: Sexe | undefined = existante ? existante.sexe : sexeParDefaut;
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
  const champNom = champ('Nom', 'nom', nom);

  // Contenu de départ, comparé à l'actuel pour savoir si une saisie serait perdue.
  const valeurs = () => [prenom.value, nom.value, ...naissance.valeurs(), radios.find((r) => r.radio.checked)?.valeur, note.value, ...deces.valeurs()];
  const depart = valeurs();

  return {
    champNom,
    lireNom: () => nom.value,
    definirNom: (valeur) => {
      nom.value = valeur;
      depart[1] = valeur;
    },
    viserPrenom: () => prenom.focus(),
    modifie: () => valeurs().some((v, i) => v !== depart[i]),
    noeuds: [
      champ('Prénom', 'prenom', prenom),
      champNom,
      h('fieldset', { class: 'champ' }, h('legend', {}, 'Sexe'), h('div', { class: 'choix-groupe' }, ...choixSexe)),
      h(
        'fieldset',
        { class: 'champ' },
        h('legend', {}, 'Date de naissance (facultative, année seule possible)'),
        naissance.groupe,
      ),
      h('fieldset', { class: 'champ' }, h('legend', {}, 'Date de décès (facultative, année seule possible)'), deces.groupe),
      ...(avecNote ? [champ('Note', 'note', note)] : []),
    ],
    lire: () => ({
      prenom: prenom.value,
      nom: nom.value,
      naissance: naissance.lire(),
      deces: deces.lire(),
      sexe: radios.find((r) => r.radio.checked)?.valeur,
      note: avecNote ? note.value : (existante?.note ?? ''),
    }),
  };
}

/**
 * Avant de créer `champs` : s'il existe déjà une fiche de même prénom et même nom, demande confirmation
 * (deux personnes peuvent porter le même nom). `conseil` complète le message. Vrai si la création peut avoir lieu.
 */
export async function accepterHomonyme(personnes: Personne[], champs: ChampsPersonne, conseil = ''): Promise<boolean> {
  const memes = homonymes(personnes, champs);
  if (memes.length === 0) return true;
  // Nom tel qu'écrit sur la fiche existante, pas tel que saisi (« anne MARTIN »).
  const nom = `« ${nomComplet(memes[0])} »`;
  const constat = memes.length === 1 ? `Une fiche ${nom} existe déjà.` : `${memes.length} fiches ${nom} existent déjà.`;
  return confirmer(`${constat} Créer une autre personne avec le même prénom et le même nom ?${conseil && ` ${conseil}`}`, 'Créer quand même', 'Annuler', false);
}
