// Champs d'identité d'une personne (prénom, nom, sexe, naissance, note, décès, réglages de la fiche), partagés
// par le formulaire de fiche et l'ajout d'un conjoint à créer.

import { estDansLeFutur } from '../modele/age';
import { accorder, assemblerDate, decouperDate, homonymes, lieuxConnus, MOIS, nomComplet, nomsConnus } from '../modele/liste';
import { estDecede, personnesVisibles, type ChampsPersonne } from '../modele/modele';
import type { Personne, Sexe } from '../modele/types';
import { confirmer } from './confirmer';
import { h } from './dom';
import { lireDonnees } from './etat';

export interface ChampsIdentite {
  /** Contrôles à insérer dans un formulaire, dans l'ordre d'affichage. */
  noeuds: HTMLElement[];
  /** Interrupteur « Décédé », sa date et son lieu, puis (fiche existante) Rappels et « À compléter » : à placer en dernier. */
  noeudDeces: HTMLElement;
  /** Nom de jeune fille saisi, et remplacement (sans compter comme une saisie). */
  lireNomNaissance: () => string;
  definirNomNaissance: (nom: string) => void;
  /** Sexe coché. */
  sexe: () => Sexe | undefined;
  /** Appelle `rappel` quand le sexe change. */
  surSexe: (rappel: () => void) => void;
  lire: () => ChampsPersonne;
  /** Bloc du champ Nom, pour y ajouter un bouton. */
  champNom: HTMLElement;
  /** Prénom et nom saisis, tels quels (sans contrôle de la date, contrairement à `lire`). */
  lirePrenom: () => string;
  lireNom: () => string;
  /** Remplace le nom sans compter comme une saisie. */
  definirNom: (nom: string) => void;
  /** Place le curseur dans le prénom (clavier ouvert). */
  viserPrenom: () => void;
  /** Un champ diffère de son contenu de départ. */
  modifie: () => boolean;
}

const champ = (libelle: string, id: string, controle: HTMLElement) => h('div', { class: 'champ' }, h('label', { for: id }, libelle), controle);

/**
 * Jour, mois et année d'une date partielle possible (année seule, mois + année, ou date complète).
 * `suffixe` distingue les ids de deux dates sur le même écran ; `de` complète les libellés (« de naissance ») ;
 * `sansAnnee` admet aussi jour et mois sans année.
 */
/** `passee` refuse une date entièrement à venir (naissance, décès) ; une union peut être annoncée. */
export function champDate(suffixe: string, de: string, valeur: string | undefined, sansAnnee = false, passee = false) {
  const date = decouperDate(valeur);
  const jour = h('input', {
    id: `jour${suffixe}`,
    type: 'text',
    inputmode: 'numeric',
    maxlength: 2,
    placeholder: 'JJ',
    value: date.jour,
    autocomplete: 'off',
    'aria-label': `Jour ${de}`,
  });
  const mois = h(
    'select',
    { id: `mois${suffixe}`, 'aria-label': `Mois ${de}` },
    h('option', { value: '' }, 'Mois'),
    ...MOIS.map((m, i) => h('option', { value: String(i + 1), selected: date.mois === String(i + 1) }, m)),
  );
  const annee = h('input', {
    id: `annee${suffixe}`,
    type: 'text',
    inputmode: 'numeric',
    maxlength: 4,
    placeholder: 'AAAA',
    value: date.annee,
    autocomplete: 'off',
    'aria-label': `Année ${de}`,
  });
  return {
    groupe: h('div', { class: 'date-groupe' }, jour, mois, annee),
    valeurs: () => [jour.value, mois.value, annee.value],
    viserAnnee: () => annee.focus(),
    lire: () => {
      const lue = assemblerDate({ jour: jour.value, mois: mois.value, annee: annee.value }, de, sansAnnee);
      if (passee && estDansLeFutur(lue, new Date())) throw new Error(`Date ${de} dans le futur`);
      return lue;
    },
  };
}

/** `existante` préremplit les champs ; `avecNote` ajoute la note libre ; `nomInitial` et `prenomInitial` préremplissent une création. */
export function champsIdentite(
  existante: Personne | undefined,
  avecNote: boolean,
  sexeParDefaut: Sexe = 'M',
  nomInitial = '',
  prenomInitial = '',
): ChampsIdentite {
  const prenom = h('input', { id: 'prenom', type: 'text', value: existante?.prenom ?? prenomInitial, autocomplete: 'off', autocapitalize: 'words' });
  // Propositions : les noms de famille déjà saisis (liste native, filtrée par le navigateur pendant la frappe).
  const donnees = lireDonnees();
  const propositions = h('datalist', { id: 'noms-connus' }, ...nomsConnus(personnesVisibles(donnees)).map((n) => h('option', { value: n })));
  const lieux = h('datalist', { id: 'lieux-connus' }, ...lieuxConnus(personnesVisibles(donnees), donnees.unions).map((n) => h('option', { value: n })));
  const lieuNaissance = h('input', {
    id: 'lieu-naissance',
    type: 'text',
    value: existante?.lieuNaissance ?? '',
    autocomplete: 'off',
    autocapitalize: 'words',
    list: 'lieux-connus',
  });
  const lieuDeces = h('input', {
    id: 'lieu-deces',
    type: 'text',
    value: existante?.lieuDeces ?? '',
    autocomplete: 'off',
    autocapitalize: 'words',
    list: 'lieux-connus',
  });
  const nom = h('input', { id: 'nom', type: 'text', value: existante?.nom ?? nomInitial, autocomplete: 'off', autocapitalize: 'words', list: 'noms-connus' });
  const naissance = champDate('', 'de naissance', existante?.naissance, true, true);
  const deces = champDate('-deces', 'de décès', existante?.deces, true, true);

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
  const sexeCoche = () => radios.find((r) => r.radio.checked)?.valeur;

  // Nom de naissance : « de jeune fille » pour une femme ; à la création, proposé pour une femme seulement.
  const nomNaissance = h('input', {
    id: 'nom-naissance',
    type: 'text',
    value: existante?.nomNaissance ?? '',
    autocomplete: 'off',
    autocapitalize: 'words',
    list: 'noms-connus',
  });
  const libelleNomNaissance = h('label', { for: 'nom-naissance' });
  const champNomNaissance = h('div', { class: 'champ' }, libelleNomNaissance, nomNaissance);
  const accorderNomNaissance = () => {
    libelleNomNaissance.textContent = sexeCoche() === 'F' ? 'Nom de jeune fille' : 'Nom de naissance';
    champNomNaissance.hidden = !existante && sexeCoche() !== 'F';
  };
  accorderNomNaissance();
  for (const { radio } of radios) radio.addEventListener('change', accorderNomNaissance);

  // Décès : un interrupteur, la date et le lieu (facultatifs) n'apparaissent qu'une fois allumé.
  const decede = h('input', { id: 'decede', type: 'checkbox', class: 'bascule', checked: !!existante && estDecede(existante) });
  const motDecede = h('span', { class: 'ligne-nom' });
  const dateDeces = h(
    'div',
    { class: 'date-deces', hidden: !decede.checked },
    h('div', { class: 'champ' }, deces.groupe),
    champ('Lieu du décès', 'lieu-deces', lieuDeces),
  );
  const accorderDecede = () => (motDecede.textContent = accorder(sexeCoche(), 'Décédé', 'Décédée', 'Décédé(e)'));
  accorderDecede();
  for (const { radio } of radios) radio.addEventListener('change', accorderDecede);
  decede.addEventListener('change', () => {
    dateDeces.hidden = !decede.checked;
    if (decede.checked) deces.viserAnnee();
  });

  const note = h('textarea', { id: 'note', rows: 3, value: existante?.note ?? '' });

  // Réglages d'une fiche existante : allumés d'office ; éteints, ils enregistrent `sansRappel` / `ignorerIncomplet`.
  const rappels = h('input', { id: 'rappels', type: 'checkbox', class: 'bascule', checked: !existante?.sansRappel });
  const signaler = h('input', { id: 'signaler', type: 'checkbox', class: 'bascule', checked: !existante?.ignorerIncomplet });
  const interrupteur = (id: string, libelle: string, caseACocher: HTMLElement) =>
    h('label', { class: 'carte interrupteur', for: id }, h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, libelle)), caseACocher);
  const reglages = existante
    ? [interrupteur('rappels', 'Rappels (anniversaire, fête…)', rappels), interrupteur('signaler', 'Signaler dans « À compléter »', signaler)]
    : [];
  const champNom = champ('Nom', 'nom', nom);
  champNom.append(propositions);

  // Contenu de départ, comparé à l'actuel pour savoir si une saisie serait perdue (date de décès : seulement si affichée).
  // Index 1 = nom et 2 = nom de naissance (`definirNom`, `definirNomNaissance`).
  const valeurs = () => [
    prenom.value,
    nom.value,
    nomNaissance.value,
    sexeCoche(),
    ...naissance.valeurs(),
    lieuNaissance.value,
    note.value,
    rappels.checked,
    signaler.checked,
    decede.checked,
    ...(decede.checked ? [...deces.valeurs(), lieuDeces.value] : []),
  ];
  const depart = valeurs();

  return {
    champNom,
    lirePrenom: () => prenom.value,
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
      champNomNaissance,
      h('fieldset', { class: 'champ' }, h('legend', {}, 'Date de naissance'), naissance.groupe),
      h('div', { class: 'champ' }, h('label', { for: 'lieu-naissance' }, 'Lieu de naissance'), lieuNaissance, lieux),
      ...(avecNote ? [champ('Note', 'note', note)] : []),
    ],
    noeudDeces: h(
      'div',
      { class: 'bloc-deces' },
      h('label', { class: 'carte interrupteur', for: 'decede' }, h('span', { class: 'ligne-texte' }, motDecede), decede),
      dateDeces,
      ...reglages,
    ),
    lireNomNaissance: () => nomNaissance.value,
    definirNomNaissance: (valeur) => {
      nomNaissance.value = valeur;
      depart[2] = valeur;
    },
    sexe: sexeCoche,
    surSexe: (rappel) => {
      for (const { radio } of radios) radio.addEventListener('change', rappel);
    },
    lire: () => ({
      prenom: prenom.value,
      nom: nom.value,
      naissance: naissance.lire(),
      decede: decede.checked,
      // Interrupteur éteint : une date restée dans les champs cachés est ignorée, sans erreur.
      ...(decede.checked ? { deces: deces.lire() } : {}),
      sexe: sexeCoche(),
      nomNaissance: nomNaissance.value,
      lieuNaissance: lieuNaissance.value,
      ...(decede.checked ? { lieuDeces: lieuDeces.value } : {}),
      note: avecNote ? note.value : (existante?.note ?? ''),
      ...(existante ? { sansRappel: !rappels.checked, ignorerIncomplet: !signaler.checked } : {}),
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
