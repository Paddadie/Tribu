// Ajout d'un parent ou d'un enfant à une personne : choisir une personne existante ou en créer une,
// puis préciser le lien (biologique ou adoptif). Les personnes déjà liées ne sont pas choisissables.

import { comparateur, filtrerParNom, initiales, libelleNaissance, nomComplet, nomListe } from '../modele/liste';
import { ajouterFiliation, creerPersonne } from '../modele/modele';
import type { Personne, TypeFiliation } from '../modele/types';
import { champsIdentite } from './champsPersonne';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';

export type RoleLien = 'parent' | 'enfant';
type Mode = 'existante' | 'nouvelle';

const TEXTES = {
  parent: { titre: 'Ajouter un parent', deja: 'Déjà parent', valider: 'Ajouter ce parent', origine: 'Origine du parent' },
  enfant: { titre: 'Ajouter un enfant', deja: 'Déjà enfant', valider: 'Ajouter cet enfant', origine: 'Origine de l’enfant' },
} as const;

export function ajoutLien(p: Personne, role: RoleLien, naviguer: (route: string) => void): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const textes = TEXTES[role];
  let mode: Mode = 'existante';
  let type: TypeFiliation = 'biologique';
  let choisie: string | undefined;
  let filtre = '';

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const afficherErreur = (message: string) => {
    erreur.textContent = message;
    erreur.hidden = false;
  };

  const identite = champsIdentite(undefined, false);
  const zone = h('div', { class: 'zone-conjoint' });
  const valider = h('button', { type: 'button', class: 'bouton bouton-plein' });

  /** Personnes déjà reliées directement à `p` dans ce rôle (un même lien ne se crée pas deux fois). */
  const dejaLiees = (): Set<string> => {
    const filiations = lireDonnees().filiations;
    return new Set(role === 'parent' ? filiations.filter((f) => f.enfant === p.id).map((f) => f.parent) : filiations.filter((f) => f.parent === p.id).map((f) => f.enfant));
  };

  const ligne = (c: Personne, liee: boolean, liste: HTMLElement): HTMLElement => {
    const detail = liee ? textes.deja : libelleNaissance(c.naissance, c.sexe);
    return h(
      'button',
      {
        type: 'button',
        class: `ligne ligne-choix${choisie === c.id ? ' choisie' : ''}`,
        disabled: liee,
        'aria-pressed': choisie === c.id,
        onclick: () => {
          choisie = c.id;
          liste.replaceChildren(...lignes(liste));
          majBouton();
        },
      },
      h('span', { class: 'avatar' }, initiales(c)),
      h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomListe(c, lireReglages().tri)), detail && h('span', { class: 'secondaire' }, detail)),
      choisie === c.id && icone('coche', 22),
    );
  };

  const lignes = (liste: HTMLElement): HTMLElement[] => {
    const autres = lireDonnees().personnes.filter((c) => c.id !== p.id).sort(comparateur(lireReglages().tri));
    const trouvees = filtrerParNom(autres, filtre);
    if (autres.length === 0) return [h('p', { class: 'vide' }, 'Aucune autre personne. Créez-en une avec « Nouvelle personne ».')];
    if (trouvees.length === 0) return [h('p', { class: 'vide' }, 'Aucun résultat.')];
    const liees = dejaLiees();
    return trouvees.map((c) => ligne(c, liees.has(c.id), liste));
  };

  const majBouton = () => {
    valider.textContent = mode === 'existante' ? textes.valider : 'Créer et ajouter';
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

  const onglet = (nom: string, valeur: string, libelle: string, actif: boolean, quand: () => void) =>
    h('label', { class: 'choix' }, h('input', { type: 'radio', name: nom, value: valeur, checked: actif, onchange: quand }), h('span', {}, libelle));

  const enregistrer = () => {
    try {
      modifierDonnees((d) => {
        let base = d;
        let autre = choisie;
        if (mode === 'nouvelle') {
          const nouvelle = creerPersonne(d, identite.lire());
          base = nouvelle.donnees;
          autre = nouvelle.personne.id;
        }
        if (!autre) throw new Error('Choisissez une personne');
        return (role === 'parent' ? ajouterFiliation(base, autre, p.id, type) : ajouterFiliation(base, p.id, autre, type)).donnees;
      });
      naviguer(retour);
    } catch (err) {
      afficherErreur(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  };
  valider.addEventListener('click', enregistrer);

  dessiner();

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      h('a', { class: 'bouton-icone', href: retour, 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, textes.titre),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'secondaire' }, `Pour ${nomComplet(p)}`),
      h(
        'fieldset',
        { class: 'champ' },
        h('legend', {}, 'Type de lien'),
        h(
          'div',
          { class: 'choix-groupe' },
          onglet('type-lien', 'biologique', 'Biologique', true, () => (type = 'biologique')),
          onglet('type-lien', 'adoptif', 'Adoptif', false, () => (type = 'adoptif')),
        ),
      ),
      h(
        'div',
        { class: 'choix-groupe', role: 'radiogroup', 'aria-label': textes.origine },
        onglet('mode-lien', 'existante', 'Personne existante', true, () => {
          mode = 'existante';
          dessiner();
        }),
        onglet('mode-lien', 'nouvelle', 'Nouvelle personne', false, () => {
          mode = 'nouvelle';
          dessiner();
        }),
      ),
      zone,
      erreur,
      valider,
    ),
  );
}
