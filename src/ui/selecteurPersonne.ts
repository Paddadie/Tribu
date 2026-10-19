// Sélecteur de la personne à relier (conjoint, parent, enfant), commun aux
// écrans d'ajout : onglets « Personne existante » / « Nouvelle personne »,
// recherche, lignes choisissables, bouton de validation et erreur. La création
// éventuelle et le lien sont enregistrés ensemble, en une seule modification.

import { comparateur, filtrerParNom, nomListe } from '../modele/liste';
import { creerPersonne } from '../modele/modele';
import type { Donnees, Personne, Sexe } from '../modele/types';
import { champsIdentite } from './champsPersonne';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { contenuLigne } from './lignePersonne';

type Mode = 'existante' | 'nouvelle';

export interface OptionsSelecteur {
  /** Personne de départ : absente de la liste. */
  personne: Personne;
  /** Nom accessible des onglets (« Origine du conjoint »). */
  libelleOrigine: string;
  /** Bouton de validation pour une personne existante (« Ajouter ce conjoint »). */
  libelleValider: string;
  /** Sexe coché d'avance pour une nouvelle personne. */
  sexeParDefaut?: Sexe;
  /** Raison affichée à la place de la naissance quand `c` n'est pas choisissable. */
  indisponible: (d: Donnees, c: Personne) => string | undefined;
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
}

export function selecteurPersonne(o: OptionsSelecteur): Selecteur {
  let mode: Mode = 'existante';
  let choisie: string | undefined;
  let filtre = '';

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const identite = champsIdentite(undefined, false, o.sexeParDefaut);
  const zone = h('div', { class: 'zone-conjoint' });
  const valider = h('button', { type: 'button', class: 'bouton bouton-plein' });

  const ligne = (c: Personne, raison: string | undefined, liste: HTMLElement): HTMLElement =>
    h(
      'button',
      {
        type: 'button',
        class: `ligne ligne-choix${choisie === c.id ? ' choisie' : ''}`,
        disabled: raison !== undefined,
        'aria-pressed': choisie === c.id,
        onclick: () => {
          choisie = c.id;
          liste.replaceChildren(...lignes(liste));
          majBouton();
        },
      },
      ...contenuLigne(c, nomListe(c, lireReglages().tri), raison),
      choisie === c.id && icone('coche', 22),
    );

  const lignes = (liste: HTMLElement): HTMLElement[] => {
    const d = lireDonnees();
    const autres = d.personnes.filter((c) => c.id !== o.personne.id).sort(comparateur(lireReglages().tri));
    const trouvees = filtrerParNom(autres, filtre);
    if (autres.length === 0) return [h('p', { class: 'vide' }, 'Aucune autre personne. Créez-en une avec « Nouvelle personne ».')];
    if (trouvees.length === 0) return [h('p', { class: 'vide' }, 'Aucun résultat.')];
    return trouvees.map((c) => ligne(c, o.indisponible(d, c), liste));
  };

  const majBouton = () => {
    valider.textContent = mode === 'existante' ? o.libelleValider : 'Créer et ajouter';
    valider.disabled = mode === 'existante' && !choisie;
  };

  const dessiner = () => {
    erreur.hidden = true;
    if (mode === 'nouvelle') {
      zone.replaceChildren(...identite.noeuds);
    } else {
      const liste = h('div', { class: 'carte' });
      liste.replaceChildren(...lignes(liste));
      const champ = h('input', {
        type: 'search',
        placeholder: 'Rechercher par prénom ou nom',
        value: filtre,
        autocomplete: 'off',
        enterkeyhint: 'search',
        oninput: () => {
          filtre = champ.value;
          liste.replaceChildren(...lignes(liste));
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

  valider.addEventListener('click', () => {
    try {
      modifierDonnees((d) => {
        if (mode === 'existante') {
          if (!choisie) throw new Error('Choisissez une personne');
          return o.lier(d, choisie);
        }
        const nouvelle = creerPersonne(d, identite.lire());
        return o.lier(nouvelle.donnees, nouvelle.personne.id);
      });
      o.apres();
    } catch (err) {
      erreur.textContent = err instanceof Error ? err.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
  });

  dessiner();

  return {
    onglets: h('div', { class: 'choix-groupe', role: 'radiogroup', 'aria-label': o.libelleOrigine }, onglet('existante', 'Personne existante'), onglet('nouvelle', 'Nouvelle personne')),
    zone,
    erreur,
    valider,
  };
}
