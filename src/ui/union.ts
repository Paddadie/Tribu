// Gestion d'une union : indicateur « marié », nom après le mariage, date et lieu, séparation (l'union est gardée, au statut « séparée »),
// rétablissement d'un couple séparé, suppression d'une union saisie par erreur.
// Séparation et suppression sont annulables depuis le bandeau. Quand le couple n'est plus marié ou n'est plus
// ensemble, celui ou celle qui porte encore le nom de l'autre se voit proposer de reprendre son nom de naissance.

import { avecDe, nomComplet } from '../modele/liste';
import { dureeUnion } from '../modele/noces';
import {
  modifierDateUnion,
  modifierLieuUnion,
  modifierUnion,
  quiPeutReprendreSonNom,
  reprendreNomDeNaissance,
  retablirUnion,
  separerUnion,
  supprimerUnion,
} from '../modele/modele';
import { appliquerNomApres, nomApresActuel, quiAChangeDeNom } from '../modele/nomApres';
import type { Personne, Union } from '../modele/types';
import { changerAvecAnnulation } from './annulation';
import { champDate } from './champsPersonne';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { lireDonnees, modifierDonnees } from './etat';
import { signaler } from './surbrillance';
import { lienRetour, remplacer, revenir } from './navigation';
import { champLieuUnion, choixNomApres, defautNomApres, type Membre } from './nomApresMariage';

/**
 * Après une séparation, une suppression ou le passage à « non mariés » : propose à chacun de ceux qui portent encore
 * le nom de l'autre (ou leur nom composé) de reprendre son nom de naissance. Jamais imposé.
 */
async function proposerRepriseDuNom(personnes: Personne[], union: Union): Promise<void> {
  for (const p of personnes) {
    const d = lireDonnees();
    const actuelle = d.personnes.find((x) => x.id === p.id);
    const autre = d.personnes.find((x) => x.id === (union.personneA === p.id ? union.personneB : union.personneA));
    if (!actuelle?.nomNaissance) continue;
    const porte = autre && autre.nom === actuelle.nom ? `le nom ${avecDe(autre.prenom || autre.nom)}` : `le nom ${actuelle.nom}`;
    const question = `${actuelle.prenom || actuelle.nom} porte encore ${porte}. Reprendre son nom de naissance, ${actuelle.nomNaissance} ?`;
    if (await confirmer(question, `Reprendre ${actuelle.nomNaissance}`, `Garder ${actuelle.nom}`, false)) {
      modifierDonnees((x) => reprendreNomDeNaissance(x, p.id));
    }
  }
}

/** Écran de l'union `idUnion`, ouvert depuis la fiche de `p`. */
export function ecranUnion(p: Personne, idUnion: string): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const d = lireDonnees();
  const union = d.unions.find((u) => u.id === idUnion && (u.personneA === p.id || u.personneB === p.id));
  const autre = union && d.personnes.find((x) => x.id === (union.personneA === p.id ? union.personneB : union.personneA));
  if (!union || !autre) {
    // Union déjà supprimée (ou jamais créée) : retour à la fiche.
    remplacer(retour);
    return h('div', { class: 'ecran' });
  }
  const separee = union.statut === 'separee';
  const prenomAutre = autre.prenom || autre.nom;
  const duree = dureeUnion(union.date, union.marie, new Date());

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const afficherErreur = (e: unknown, defaut: string) => {
    erreur.textContent = e instanceof Error ? e.message : defaut;
    erreur.hidden = false;
  };

  const marie = h('input', { id: 'marie', type: 'checkbox', class: 'bascule', checked: union.marie });
  const date = champDate('-union', 'de l’union', union.date, true);

  // Même écran quel que soit le côté par lequel on arrive : le couple dans l'ordre de l'union. Chacun avec le nom
  // qu'il aurait sans ce mariage, pour nommer les options.
  const changes = new Set(quiAChangeDeNom(d, union).map((x) => x.id));
  const membre = (id: string): Membre => {
    const x = d.personnes.find((q) => q.id === id)!;
    return { id: x.id, prenom: x.prenom, sexe: x.sexe, origine: changes.has(x.id) && x.nomNaissance ? x.nomNaissance : x.nom };
  };
  const couple: [Membre, Membre] = [membre(union.personneA), membre(union.personneB)];
  const nomApres = choixNomApres(() => couple, defautNomApres, union.marie ? nomApresActuel(d, union) : undefined);
  const lieu = champLieuUnion(union.lieu);
  const majMariage = () => {
    nomApres.noeud.hidden = separee || !marie.checked;
    lieu.noeud.hidden = !marie.checked;
  };
  marie.addEventListener('change', majMariage);
  majMariage();

  const enregistrer = async () => {
    try {
      const dateUnion = date.lire();
      modifierDonnees((x) => {
        let maj = modifierDateUnion(modifierUnion(x, union.id, marie.checked, false), union.id, dateUnion);
        if (marie.checked && !separee) maj = appliquerNomApres(maj, union.id, nomApres.lire(union.personneA, union.personneB));
        return modifierLieuUnion(maj, union.id, marie.checked ? lieu.lire() : undefined);
      });
      signaler(autre.id);
      if (union.marie && !marie.checked) await proposerRepriseDuNom(quiPeutReprendreSonNom(lireDonnees(), union.id), union);
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Enregistrement impossible');
    }
  };

  const separer = async () => {
    try {
      changerAvecAnnulation((x) => separerUnion(x, union.id), `Séparation d’avec ${prenomAutre} enregistrée.`, 'Couple rétabli.');
      await proposerRepriseDuNom(quiPeutReprendreSonNom(lireDonnees(), union.id), union);
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Séparation impossible');
    }
  };

  const retablir = () => {
    try {
      modifierDonnees((x) => retablirUnion(x, union.id));
      signaler(autre.id);
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Rétablissement impossible');
    }
  };

  const supprimer = async () => {
    try {
      // Les noms se lisent sur l'union : à relever avant qu'elle disparaisse.
      const aReprendre = quiPeutReprendreSonNom(lireDonnees(), union.id);
      changerAvecAnnulation((x) => supprimerUnion(x, union.id), `Union avec ${prenomAutre} supprimée.`, 'Union rétablie.');
      await proposerRepriseDuNom(aReprendre, union);
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Suppression impossible');
    }
  };

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, separee ? 'Ex-conjoint' : 'Union'),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'resume-union' }, `${nomComplet(p)} et ${nomComplet(autre)}${separee ? ' sont séparés.' : ''}`),
      !separee && duree && h('p', { class: 'secondaire duree-union' }, duree),
      h(
        'label',
        { class: 'carte interrupteur', for: 'marie' },
        h(
          'span',
          { class: 'ligne-texte' },
          h('span', { class: 'ligne-nom' }, 'Marié(e)'),
          h('span', { class: 'secondaire' }, 'Éteint pour un couple non marié'),
        ),
        marie,
      ),
      nomApres.noeud,
      h('div', { class: 'champ' }, h('label', { for: 'jour-union' }, 'Date de l’union'), date.groupe),
      lieu.noeud,
      erreur,
      h('button', { type: 'button', class: 'bouton bouton-plein', onclick: enregistrer }, 'Enregistrer'),
      separee
        ? h('button', { type: 'button', class: 'bouton', onclick: retablir }, 'Rétablir le couple')
        : h('button', { type: 'button', class: 'bouton', onclick: separer }, 'Se sont séparés'),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, 'Supprimer l’union'),
    ),
  );
}
