// Ajout d'un ami à une personne, toujours par un groupe d'amis (tous les membres sont amis entre eux).
// - La personne est déjà dans un groupe : on y ajoute les amis choisis (une personne n'est que dans un groupe).
// - Sinon : en haut les groupes à rejoindre, en dessous les personnes pour former un nouveau groupe.

import { nomGroupe, raisonGroupe } from '../modele/deductions';
import { avecDe } from '../modele/liste';
import { ajouterAuGroupe, creerGroupe, groupesDe } from '../modele/modele';
import { ficheMoi } from '../modele/reglages';
import type { Donnees, GroupeAmis, Personne } from '../modele/types';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { garderSaisie, lienRetour, revenir } from './navigation';
import { selecteurPersonne } from './selecteurPersonne';
import { signaler } from './surbrillance';

const appel = (p: Personne) => p.prenom || p.nom;

/** « Karim, Mathis, Julie » : les membres d'un groupe, sans la personne éventuelle `sauf`. */
function resume(d: Donnees, g: GroupeAmis, sauf?: string): string {
  const noms = d.personnes.filter((p) => g.membres.includes(p.id) && p.id !== sauf).map(appel);
  return noms.length > 3 ? `${noms.slice(0, 3).join(', ')}… (${noms.length})` : noms.join(', ');
}

/** Moi est d'office dans chaque groupe créé, pour que tous apparaissent dans ton arbre (sa fiche : le groupe se forme avec l'ami). */
function moiAjoute(d: Donnees, p: Personne): Personne | undefined {
  const moi = ficheMoi(lireReglages(), d);
  return moi && moi.id !== p.id ? moi : undefined;
}

export function ajoutAmi(p: Personne): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const depart = lireDonnees();
  // Moi est dans plusieurs groupes : ses amis ne rejoignent pas « son » groupe, ils en forment un nouveau avec lui.
  const estMoi = ficheMoi(lireReglages(), depart)?.id === p.id;
  const groupe = estMoi ? undefined : groupesDe(depart, p.id)[0];

  const nomChamp = h('input', { id: 'nom-groupe', type: 'text', autocomplete: 'off', autocapitalize: 'words', placeholder: 'Ex. Les voisins' });
  const moi = groupe ? undefined : moiAjoute(depart, p);

  const selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: 'Origine de l’ami',
    libelleValider: groupe ? 'Ajouter au groupe' : 'Former un groupe',
    libelleValiderPlusieurs: (n) => (groupe ? `Ajouter ${n} amis au groupe` : `Former un groupe de ${n + 1}`),
    indisponible: (d, c) => raisonGroupe(d, c, groupe, ficheMoi(lireReglages(), d)?.id),
    // Le premier ami forme le groupe (avec la fiche et Moi) ; les suivants le rejoignent.
    lier: (d, autre) => {
      const existant = estMoi ? undefined : groupesDe(d, p.id)[0];
      if (existant) return ajouterAuGroupe(d, existant.id, autre);
      return creerGroupe(d, [p.id, autre], nomChamp.value.trim(), moi?.id).donnees;
    },
    apres: () => revenir(retour),
  });
  garderSaisie(selecteur.modifie);

  const rejoindre = (g: GroupeAmis) => {
    try {
      modifierDonnees((d) => ajouterAuGroupe(d, g.id, p.id));
      signaler(g.membres[0]);
      revenir(retour);
    } catch (e) {
      selecteur.erreur.textContent = e instanceof Error ? e.message : 'Enregistrement impossible';
      selecteur.erreur.hidden = false;
    }
  };

  const groupes = depart.groupes;
  const aRejoindre =
    !groupe && groupes.length > 0
      ? h(
          'section',
          { class: 'bloc-choix' },
          h('h2', { class: 'titre-section' }, 'Rejoindre un groupe'),
          h(
            'div',
            { class: 'carte' },
            ...groupes.map((g) =>
              h(
                'button',
                { type: 'button', class: 'ligne ligne-choix', onclick: () => rejoindre(g) },
                icone('ami', 24),
                h(
                  'span',
                  { class: 'ligne-texte' },
                  h('span', { class: 'ligne-nom' }, nomGroupe(depart, g)),
                  h('span', { class: 'secondaire' }, resume(depart, g)),
                ),
              ),
            ),
          ),
        )
      : null;

  const intro = groupe
    ? h(
        'p',
        { class: 'secondaire' },
        `${appel(p)} est dans « ${nomGroupe(depart, groupe)} » (${resume(depart, groupe, p.id)}). Les amis ajoutés rejoignent ce groupe.`,
      )
    : null;

  const champNom = groupe
    ? null
    : h(
        'div',
        { class: 'champ' },
        h('label', { for: 'nom-groupe' }, 'Nom du nouveau groupe'),
        nomChamp,
        moi ? h('p', { class: 'secondaire' }, `${appel(moi)} fera aussi partie du groupe, comme de tous tes groupes.`) : null,
      );

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, `Ami ${avecDe(appel(p))}`),
    ),
    h(
      'div',
      { class: 'contenu' },
      intro,
      aRejoindre,
      aRejoindre && h('h2', { class: 'titre-section' }, 'Ou former un nouveau groupe'),
      champNom,
      selecteur.onglets,
      selecteur.zone,
      selecteur.pied,
    ),
  );
}
