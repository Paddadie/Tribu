// Gestion des groupes d'amis (Réglages → Groupes d'amis) : liste, création, détail d'un groupe
// (nom, membres, ajout d'un membre, suppression). Tous les membres d'un groupe sont amis entre eux.

import { nomGroupe, raisonGroupe } from '../modele/deductions';
import { comparateur, filtrerParNom, nomListe } from '../modele/liste';
import { ajouterAuGroupe, creerGroupe, groupesDe, personnesListees, renommerGroupe, retirerDuGroupe, supprimerGroupe } from '../modele/modele';
import { ficheMoi } from '../modele/reglages';
import type { Donnees, GroupeAmis, Personne } from '../modele/types';
import { changerAvecAnnulation, rafraichirEcran } from './annulation';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { contenuLigne } from './lignePersonne';
import { garderSaisie, lienRetour, remplacer, revenir } from './navigation';
import { selecteurPersonne } from './selecteurPersonne';

const appel = (p: Personne) => p.prenom || p.nom;
const pluriel = (n: number) => `${n} personne${n > 1 ? 's' : ''}`;

const membresDe = (d: Donnees, g: GroupeAmis): Personne[] =>
  d.personnes.filter((p) => g.membres.includes(p.id)).sort(comparateur(lireReglages().tri));

function barre(retour: string, titre: string): HTMLElement {
  return h('div', { class: 'barre' }, lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Retour' }, icone('retour', 26)), h('h1', { class: 'titre-formulaire' }, titre));
}

/** Liste des groupes, avec « Nouveau groupe ». */
export function ecranGroupes(): HTMLElement {
  const d = lireDonnees();
  const groupes = [...d.groupes].sort((a, b) => nomGroupe(d, a).localeCompare(nomGroupe(d, b), 'fr'));
  const lignes = groupes.map((g) =>
    h(
      'a',
      { class: 'ligne ligne-lien', href: `#/groupe/${g.id}` },
      icone('ami', 24),
      h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomGroupe(d, g)), h('span', { class: 'secondaire' }, pluriel(g.membres.length))),
      icone('chevron', 20),
    ),
  );
  return h(
    'div',
    { class: 'ecran' },
    barre('#/reglages', 'Groupes d’amis'),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'secondaire' }, 'Les personnes d’un groupe sont amies entre elles. Une personne ne peut être que dans un groupe.'),
      lignes.length > 0 ? h('div', { class: 'carte' }, ...lignes) : h('p', { class: 'vide' }, 'Aucun groupe d’amis pour l’instant.'),
      h('a', { class: 'bouton bouton-plein', href: '#/groupe/nouveau' }, icone('plus', 20), 'Nouveau groupe'),
    ),
  );
}

/** Création d'un groupe : un nom facultatif et au moins deux personnes pas encore dans un groupe. */
export function ecranNouveauGroupe(): HTMLElement {
  const choisies = new Set<string>();
  let filtre = '';
  const nom = h('input', { id: 'nom-groupe', type: 'text', autocomplete: 'off', autocapitalize: 'words', placeholder: 'Ex. Les voisins' });
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const liste = h('div', { class: 'liste-choix' });
  const valider = h('button', { type: 'button', class: 'bouton bouton-plein' });

  const majBouton = () => {
    valider.textContent = choisies.size >= 2 ? `Créer le groupe de ${choisies.size}` : 'Créer le groupe';
    valider.disabled = choisies.size < 2;
  };
  const dessiner = () => {
    const d = lireDonnees();
    const libres = personnesListees(d).filter((p) => groupesDe(d, p.id).length === 0).sort(comparateur(lireReglages().tri));
    const trouvees = filtrerParNom(libres, filtre);
    liste.replaceChildren(
      libres.length === 0
        ? h('p', { class: 'vide' }, 'Toutes les personnes sont déjà dans un groupe.')
        : trouvees.length === 0
          ? h('p', { class: 'vide' }, 'Aucun résultat.')
          : h(
              'div',
              { class: 'carte' },
              ...trouvees.map((p) =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: `ligne ligne-choix${choisies.has(p.id) ? ' choisie' : ''}`,
                    'aria-pressed': String(choisies.has(p.id)),
                    onclick: () => {
                      if (choisies.has(p.id)) choisies.delete(p.id);
                      else choisies.add(p.id);
                      dessiner();
                      majBouton();
                    },
                  },
                  ...contenuLigne(p, nomListe(p, lireReglages().tri)),
                ),
              ),
            ),
    );
  };
  const recherche = h('input', {
    type: 'search',
    placeholder: 'Rechercher par prénom ou nom',
    autocomplete: 'off',
    enterkeyhint: 'search',
    oninput: () => {
      filtre = recherche.value;
      dessiner();
    },
  });

  valider.addEventListener('click', () => {
    erreur.hidden = true;
    try {
      let id = '';
      modifierDonnees((d) => {
        const r = creerGroupe(d, [...choisies], nom.value.trim(), ficheMoi(lireReglages(), d)?.id);
        id = r.groupe.id;
        return r.donnees;
      });
      remplacer(`#/groupe/${id}`);
    } catch (e) {
      erreur.textContent = e instanceof Error ? e.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
  });
  garderSaisie(() => choisies.size > 0 || nom.value.trim() !== '');
  majBouton();
  dessiner();

  return h(
    'div',
    { class: 'ecran' },
    barre('#/groupes', 'Nouveau groupe'),
    h(
      'div',
      { class: 'contenu' },
      h('div', { class: 'champ' }, h('label', { for: 'nom-groupe' }, 'Nom du groupe (facultatif)'), nom),
      h('h2', { class: 'titre-section' }, 'Membres'),
      h('label', { class: 'champ-filtre champ-filtre-forme' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Rechercher une personne'), recherche),
      liste,
      erreur,
      valider,
    ),
  );
}

/** Détail d'un groupe : renommer, retirer un membre (annulable), ajouter un membre, supprimer le groupe. */
export function ecranGroupe(g: GroupeAmis): HTMLElement {
  const d = lireDonnees();
  const retour = '#/groupes';
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const echec = (e: unknown, defaut: string) => {
    erreur.textContent = e instanceof Error ? e.message : defaut;
    erreur.hidden = false;
  };

  const nom = h('input', {
    id: 'nom-groupe',
    type: 'text',
    value: g.nom,
    autocomplete: 'off',
    autocapitalize: 'words',
    placeholder: nomGroupe(d, { ...g, nom: '' }),
    onchange: () => {
      erreur.hidden = true;
      try {
        modifierDonnees((x) => renommerGroupe(x, g.id, nom.value));
      } catch (e) {
        echec(e, 'Enregistrement impossible');
      }
    },
  });

  const retirer = (p: Personne) => {
    erreur.hidden = true;
    try {
      const dernier = g.membres.length <= 2;
      changerAvecAnnulation(
        (x) => retirerDuGroupe(x, g.id, p.id),
        dernier ? `${appel(p)} a quitté le groupe, qui est supprimé.` : `${appel(p)} a quitté « ${nomGroupe(d, g)} ».`,
        'Groupe rétabli.',
      );
    } catch (e) {
      echec(e, 'Retrait impossible');
      return;
    }
    if (g.membres.length <= 2) remplacer(retour);
    else rafraichirEcran();
  };

  const supprimer = async () => {
    const message = `Supprimer le groupe « ${nomGroupe(d, g)} » ? Ses ${g.membres.length} membres ne seront plus amis entre eux ; aucune fiche n’est supprimée.`;
    if (!(await confirmer(message, 'Supprimer'))) return;
    try {
      changerAvecAnnulation((x) => supprimerGroupe(x, g.id), `Groupe « ${nomGroupe(d, g)} » supprimé.`, 'Groupe rétabli.');
    } catch (e) {
      echec(e, 'Suppression impossible');
      return;
    }
    remplacer(retour);
  };

  return h(
    'div',
    { class: 'ecran' },
    barre(retour, nomGroupe(d, g)),
    h(
      'div',
      { class: 'contenu' },
      h('div', { class: 'champ' }, h('label', { for: 'nom-groupe' }, 'Nom du groupe'), nom),
      h('h2', { class: 'titre-section' }, `Membres (${g.membres.length})`),
      h(
        'div',
        { class: 'carte' },
        ...membresDe(d, g).map((p) =>
          h(
            'div',
            { class: 'ligne ligne-union' },
            h('a', { class: 'ligne-lien', href: `#/personne/${p.id}` }, ...contenuLigne(p)),
            h('button', { type: 'button', class: 'bouton-icone', 'aria-label': `Retirer ${appel(p)} du groupe`, onclick: () => retirer(p) }, icone('croix', 20)),
          ),
        ),
      ),
      h('a', { class: 'bouton', href: `#/groupe/${g.id}/ajouter` }, icone('plus', 20), 'Ajouter un membre'),
      erreur,
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: () => void supprimer() }, 'Supprimer le groupe'),
    ),
  );
}

/** Ajout d'un membre à un groupe : personne existante pas encore groupée, ou nouvelle personne. */
export function ecranAjoutMembre(g: GroupeAmis): HTMLElement {
  const retour = `#/groupe/${g.id}`;
  const d = lireDonnees();
  const premier = d.personnes.find((p) => p.id === g.membres[0])!;
  const selecteur = selecteurPersonne({
    personne: premier,
    libelleOrigine: 'Origine du membre',
    libelleValider: 'Ajouter au groupe',
    libelleValiderPlusieurs: (n) => `Ajouter ${n} personnes`,
    indisponible: (x, c) => raisonGroupe(x, c, g, ficheMoi(lireReglages(), x)?.id),
    lier: (x, autre) => ajouterAuGroupe(x, g.id, autre),
    apres: () => revenir(retour),
  });
  garderSaisie(selecteur.modifie);
  return h(
    'div',
    { class: 'ecran' },
    barre(retour, `Ajouter à « ${nomGroupe(d, g)} »`),
    h('div', { class: 'contenu' }, selecteur.onglets, selecteur.zone, selecteur.erreur, selecteur.valider),
  );
}
