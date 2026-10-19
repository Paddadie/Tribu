// Sélecteur de la personne à relier (conjoint, parent, enfant, frère ou sœur), commun aux
// écrans d'ajout : onglets « Nouvelle personne » (ouvert d'abord) / « Personne existante »,
// recherche, lignes choisissables (suggestions en tête, personnes indisponibles en fin),
// bouton de validation et erreur. La création éventuelle et le lien sont enregistrés
// ensemble, en une seule modification.

import { avecDe, comparateur, filtrerParNom, nomListe } from '../modele/liste';
import { creerPersonne, personnesVisibles } from '../modele/modele';
import type { NomPropose, Suggestion } from '../modele/saisie';
import type { Donnees, Personne, Sexe } from '../modele/types';
import { accepterHomonyme, champsIdentite } from './champsPersonne';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { signaler } from './surbrillance';
import { contenuLigne } from './lignePersonne';

type Mode = 'existante' | 'nouvelle';

export interface OptionsSelecteur {
  /** Personne de départ : absente de la liste. */
  personne: Personne;
  /** Nom accessible des onglets (« Origine du conjoint »). */
  libelleOrigine: string;
  /** Bouton de validation pour une personne existante (« Ajouter ce conjoint »). */
  libelleValider: string;
  /** Si présent, plusieurs personnes existantes peuvent être cochées d'un coup ; donne le bouton pour `n` ≥ 2 personnes. */
  libelleValiderPlusieurs?: (n: number) => string;
  /** Sexe coché d'avance pour une nouvelle personne. */
  sexeParDefaut?: Sexe;
  /** Noms proposés pour une nouvelle personne : le premier est prérempli, un bouton passe au suivant. */
  noms?: () => NomPropose[];
  /** Personnes proposées en tête de liste, avec la raison. */
  suggestions?: (d: Donnees) => Suggestion[];
  /** Raison affichée à la place de la naissance quand `c` n'est pas choisissable. */
  indisponible: (d: Donnees, c: Personne) => string | undefined;
  /** Condition de l'écran en plus du choix d'une personne (au moins un parent coché). */
  pret?: () => boolean;
  /** Relie la personne de départ à `autre` (id) ; lève une erreur si le lien est refusé. */
  lier: (d: Donnees, autre: string) => Donnees;
  /** Après un enregistrement réussi. */
  apres: () => void;
}

/** Morceaux à placer dans l'écran, dans cet ordre, avec les champs propres au lien entre eux. */
export interface Selecteur {
  onglets: HTMLElement;
  zone: HTMLElement;
  erreur: HTMLElement;
  valider: HTMLButtonElement;
  /** Erreur et bouton de validation, collés au bas de l'écran : à placer en dernier. */
  pied: HTMLElement;
  /** À appeler quand un réglage de l'écran change (parents cochés) : liste, nom proposé et bouton. */
  rafraichir: () => void;
  /** Une saisie de nouvelle personne serait perdue. */
  modifie: () => boolean;
}

const appel = (p: Personne) => p.prenom || p.nom;

export function selecteurPersonne(o: OptionsSelecteur): Selecteur {
  let mode: Mode = 'nouvelle';
  /** Personnes existantes cochées (une seule hors choix multiple). */
  const choisies = new Set<string>();
  const multiple = o.libelleValiderPlusieurs !== undefined;
  let filtre = '';

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const identite = champsIdentite(undefined, false, o.sexeParDefaut);
  const zone = h('div', { class: 'zone-conjoint' });
  const liste = h('div', { class: 'liste-choix' });
  const valider = h('button', { type: 'button', class: 'bouton bouton-plein' });

  // Nom prérempli : remplacé quand les parents changent, sauf s'il a été modifié à la main.
  let rangNom = 0;
  let nomAuto = '';
  const boutonNom = h('button', { type: 'button', class: 'bouton-nom', hidden: true });
  const poserNom = (forcer: boolean) => {
    const noms = o.noms?.() ?? [];
    if (rangNom >= noms.length) rangNom = 0;
    if (forcer || identite.lireNom().trim() === nomAuto) {
      nomAuto = noms[rangNom]?.nom ?? '';
      identite.definirNom(nomAuto);
    }
    const suivant = noms[(rangNom + 1) % noms.length];
    boutonNom.hidden = noms.length < 2;
    if (suivant) boutonNom.replaceChildren(icone('echange', 16), `Prendre ${suivant.nom}, le nom ${avecDe(appel(suivant.de))}`);
  };
  boutonNom.addEventListener('click', () => {
    rangNom += 1;
    poserNom(true);
  });
  identite.champNom.append(boutonNom);

  // La coche à droite de la ligne choisie est dessinée par le CSS (`.ligne-choix.choisie::after`).
  const ligne = (c: Personne, detail: string | undefined, inactive: boolean): HTMLElement =>
    h(
      'button',
      {
        type: 'button',
        class: `ligne ligne-choix${choisies.has(c.id) ? ' choisie' : ''}`,
        disabled: inactive,
        'aria-pressed': String(choisies.has(c.id)),
        onclick: () => {
          if (choisies.has(c.id)) choisies.delete(c.id);
          else {
            if (!multiple) choisies.clear();
            choisies.add(c.id);
          }
          dessinerListe();
          majBouton();
        },
      },
      ...contenuLigne(c, nomListe(c, lireReglages().tri), detail),
    );

  const bloc = (titre: string, lignes: HTMLElement[]) =>
    h('section', { class: 'bloc-choix' }, h('h2', { class: 'titre-section' }, titre), h('div', { class: 'carte' }, ...lignes));

  /** Suggestions en tête, puis les autres personnes choisissables, puis les indisponibles avec leur raison. */
  const lignes = (): HTMLElement[] => {
    const d = lireDonnees();
    const autres = personnesVisibles(d).filter((c) => c.id !== o.personne.id).sort(comparateur(lireReglages().tri));
    if (autres.length === 0) return [h('p', { class: 'vide' }, 'Aucune autre personne. Créez-en une avec « Nouvelle personne ».')];
    // Une personne cochée devenue indisponible (parent coché ou décoché) est décochée, même si la recherche la masque.
    for (const c of autres) if (choisies.has(c.id) && o.indisponible(d, c) !== undefined) choisies.delete(c.id);
    const trouvees = filtrerParNom(autres, filtre);
    if (trouvees.length === 0) return [h('p', { class: 'vide' }, 'Aucun résultat.')];
    const raisons = new Map(trouvees.map((c) => [c.id, o.indisponible(d, c)]));
    const suggerees = new Map((o.suggestions?.(d) ?? []).map((s) => [s.personne.id, s.detail]));

    const enTete = trouvees.filter((c) => suggerees.has(c.id) && raisons.get(c.id) === undefined);
    const reste = [...trouvees.filter((c) => !enTete.includes(c) && raisons.get(c.id) === undefined), ...trouvees.filter((c) => raisons.get(c.id) !== undefined)];
    const lignesReste = reste.map((c) => ligne(c, raisons.get(c.id), raisons.get(c.id) !== undefined));
    if (enTete.length === 0) return [h('div', { class: 'carte' }, ...lignesReste)];
    return [
      bloc(enTete.length > 1 ? 'Suggestions' : 'Suggestion', enTete.map((c) => ligne(c, suggerees.get(c.id), false))),
      reste.length > 0 && bloc('Toutes les personnes', lignesReste),
    ].filter((x): x is HTMLElement => x !== false);
  };

  const dessinerListe = () => liste.replaceChildren(...lignes());

  const majBouton = () => {
    valider.textContent = mode !== 'existante' ? 'Créer et ajouter' : o.libelleValiderPlusieurs && choisies.size > 1 ? o.libelleValiderPlusieurs(choisies.size) : o.libelleValider;
    valider.disabled = (mode === 'existante' && choisies.size === 0) || o.pret?.() === false;
  };

  const dessiner = () => {
    erreur.hidden = true;
    if (mode === 'nouvelle') {
      zone.replaceChildren(...identite.noeuds);
      queueMicrotask(identite.viserPrenom);
    } else {
      dessinerListe();
      const champ = h('input', {
        type: 'search',
        placeholder: 'Rechercher par prénom ou nom',
        value: filtre,
        autocomplete: 'off',
        enterkeyhint: 'search',
        oninput: () => {
          filtre = champ.value;
          dessinerListe();
        },
      });
      zone.replaceChildren(h('label', { class: 'champ-filtre champ-filtre-forme' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Rechercher une personne'), champ), liste);
    }
    majBouton();
  };

  const onglet = (valeur: Mode, libelle: string) =>
    h(
      'label',
      { class: 'choix' },
      h('input', {
        type: 'radio',
        name: 'mode-personne',
        value: valeur,
        checked: valeur === mode,
        onchange: () => {
          mode = valeur;
          dessiner();
        },
      }),
      h('span', {}, libelle),
    );

  valider.addEventListener('click', async () => {
    erreur.hidden = true;
    try {
      if (mode === 'existante') {
        if (choisies.size === 0) throw new Error('Choisissez une personne');
        const autres = [...choisies];
        // Un seul enregistrement : si un lien est refusé, aucun n'est ajouté.
        modifierDonnees((d) => autres.reduce(o.lier, d));
        signaler(autres[0]);
      } else {
        const champs = identite.lire();
        // Saisie vérifiée avant de parler d'homonyme.
        creerPersonne(lireDonnees(), champs);
        if (!(await accepterHomonyme(personnesVisibles(lireDonnees()), champs, 'Pour relier celle qui existe, choisissez-la dans « Personne existante ».'))) return;
        let idNouvelle = '';
        modifierDonnees((d) => {
          const nouvelle = creerPersonne(d, champs);
          idNouvelle = nouvelle.personne.id;
          return o.lier(nouvelle.donnees, nouvelle.personne.id);
        });
        signaler(idNouvelle);
      }
      o.apres();
    } catch (err) {
      erreur.textContent = err instanceof Error ? err.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
  });

  poserNom(true);
  dessiner();

  return {
    onglets: h('div', { class: 'choix-groupe', role: 'radiogroup', 'aria-label': o.libelleOrigine }, onglet('nouvelle', 'Nouvelle personne'), onglet('existante', 'Personne existante')),
    zone,
    erreur,
    valider,
    pied: h('div', { class: 'pied-collant' }, erreur, valider),
    rafraichir: () => {
      majBouton();
      poserNom(false);
      if (mode === 'existante') dessinerListe();
    },
    modifie: () => mode === 'nouvelle' && identite.modifie(),
  };
}
