// Ajout d'un conjoint à une personne : choisir une personne existante ou en créer une.
// Une personne n'a qu'un conjoint à la fois ; les personnes déjà en couple ne sont pas choisissables.

import { comparateur, filtrerParNom, initiales, libelleNaissance, nomListe } from '../modele/liste';
import { ajouterUnion, creerPersonne } from '../modele/modele';
import type { Personne } from '../modele/types';
import { champsIdentite } from './champsPersonne';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';

type Mode = 'existante' | 'nouvelle';

export function ajoutConjoint(p: Personne, naviguer: (route: string) => void): HTMLElement {
  const retour = `#/personne/${p.id}`;
  let mode: Mode = 'existante';
  let choisie: string | undefined;
  let filtre = '';

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const afficherErreur = (message: string) => {
    erreur.textContent = message;
    erreur.hidden = false;
  };

  const marie = h('input', { id: 'marie', type: 'checkbox', class: 'bascule' });
  const interrupteur = h(
    'label',
    { class: 'carte interrupteur', for: 'marie' },
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, 'Marié(e)'), h('span', { class: 'secondaire' }, 'À laisser éteint pour un couple non marié')),
    marie,
  );

  // Sexe proposé à l'opposé de celui de la personne ; sans sexe enregistré elle compte comme un homme (défaut du formulaire).
  const identite = champsIdentite(undefined, false, p.sexe === 'F' ? 'M' : 'F');
  const zone = h('div', { class: 'zone-conjoint' });
  const valider = h('button', { type: 'button', class: 'bouton bouton-plein' });

  const enCouple = (id: string) => lireDonnees().unions.some((u) => u.personneA === id || u.personneB === id);

  const ligne = (c: Personne, liste: HTMLElement): HTMLElement => {
    const occupee = enCouple(c.id);
    const detail = occupee ? 'Déjà en couple' : libelleNaissance(c.naissance, c.sexe);
    return h(
      'button',
      {
        type: 'button',
        class: `ligne ligne-choix${choisie === c.id ? ' choisie' : ''}`,
        disabled: occupee,
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
    return trouvees.map((c) => ligne(c, liste));
  };

  const majBouton = () => {
    valider.textContent = mode === 'existante' ? 'Ajouter ce conjoint' : 'Créer et ajouter';
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
        name: 'mode-conjoint',
        value: valeur,
        checked: valeur === mode,
        onchange: () => {
          mode = valeur;
          dessiner();
        },
      }),
      h('span', {}, libelle),
    );

  const enregistrer = () => {
    try {
      modifierDonnees((d) => {
        if (mode === 'existante') {
          if (!choisie) throw new Error('Choisissez une personne');
          return ajouterUnion(d, p.id, choisie, marie.checked).donnees;
        }
        const nouvelle = creerPersonne(d, identite.lire());
        return ajouterUnion(nouvelle.donnees, p.id, nouvelle.personne.id, marie.checked).donnees;
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
      h('h1', { class: 'titre-formulaire' }, `Conjoint de ${p.prenom || p.nom}`),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('div', { class: 'choix-groupe', role: 'radiogroup', 'aria-label': 'Origine du conjoint' }, onglet('existante', 'Personne existante'), onglet('nouvelle', 'Nouvelle personne')),
      zone,
      interrupteur,
      erreur,
      valider,
    ),
  );
}
