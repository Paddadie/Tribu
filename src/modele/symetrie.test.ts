import { describe, expect, it } from 'vitest';
import { amis, conjoint, exConjoints, fratrie, liensEnfants, liensParents, relation } from './deductions';
import { etiquette } from './parente';
import {
  ajouterAuGroupe,
  ajouterFiliation,
  ajouterFiliations,
  ajouterFrereSansParent,
  ajouterUnion,
  creerGroupe,
  creerPersonne,
  donneesVides,
  separerUnion,
  supprimerFiliation,
  supprimerUnion,
} from './modele';
import type { Donnees } from './types';

// Un lien noté depuis une fiche doit se lire sur l'autre fiche, sans seconde saisie.
function trois() {
  let d: Donnees = donneesVides();
  const faire = (prenom: string) => {
    const r = creerPersonne(d, { prenom, nom: 'Test', note: '' });
    d = r.donnees;
    return r.personne.id;
  };
  return { ids: [faire('Alix'), faire('Brice'), faire('Chloé')], lire: () => d, ecrire: (x: Donnees) => (d = x) };
}

describe('liens à deux personnes : un seul enregistrement, lisible des deux côtés', () => {
  it('union actuelle : noté depuis A, B a le conjoint A ; pas de doublon dans le sens inverse', () => {
    const {
      ids: [a, b],
      lire,
      ecrire,
    } = trois();
    ecrire(ajouterUnion(lire(), a, b, true).donnees);
    expect(conjoint(lire(), b)?.personne.id).toBe(a);
    expect(conjoint(lire(), a)?.personne.id).toBe(b);
    expect(() => ajouterUnion(lire(), b, a)).toThrow(/déjà une union/);
    expect(lire().unions).toHaveLength(1);
  });

  it('ex : séparer ou supprimer depuis un côté se voit de l’autre', () => {
    const {
      ids: [a, b],
      lire,
      ecrire,
    } = trois();
    const { donnees, union } = ajouterUnion(lire(), a, b);
    ecrire(separerUnion(donnees, union.id));
    expect(conjoint(lire(), b)).toBeUndefined();
    expect(exConjoints(lire(), a).map((x) => x.personne.id)).toEqual([b]);
    expect(exConjoints(lire(), b).map((x) => x.personne.id)).toEqual([a]);
    ecrire(supprimerUnion(lire(), union.id));
    expect(exConjoints(lire(), a)).toEqual([]);
    expect(exConjoints(lire(), b)).toEqual([]);
  });

  it('parent ↔ enfant : étiquettes adaptées à chaque point de vue, suppression des deux côtés', () => {
    const {
      ids: [parent, enfant],
      lire,
      ecrire,
    } = trois();
    const { donnees, filiation } = ajouterFiliation(lire(), parent, enfant, 'biologique');
    ecrire(donnees);
    expect(liensEnfants(lire(), parent).map((l) => l.personne.id)).toEqual([enfant]);
    expect(liensParents(lire(), enfant).map((l) => l.personne.id)).toEqual([parent]);
    expect(relation(lire(), parent, enfant)).toEqual(expect.objectContaining({}));
    expect(etiquette(lire(), parent, enfant)).not.toEqual(etiquette(lire(), enfant, parent));
    expect(() => ajouterFiliation(lire(), parent, enfant, 'biologique')).toThrow(/existe déjà/);
    ecrire(supprimerFiliation(lire(), filiation.id));
    expect(liensEnfants(lire(), parent)).toEqual([]);
    expect(liensParents(lire(), enfant)).toEqual([]);
  });

  it('frère ou sœur : déduit des parents, visible des deux côtés', () => {
    const {
      ids: [p, a, b],
      lire,
      ecrire,
    } = trois();
    ecrire(ajouterFiliations(lire(), [p], a, 'biologique'));
    ecrire(ajouterFiliations(lire(), [p], b, 'biologique'));
    expect(fratrie(lire(), a).freresSoeurs.map((x) => x.id)).toEqual([b]);
    expect(fratrie(lire(), b).freresSoeurs.map((x) => x.id)).toEqual([a]);
  });

  it('frère ou sœur sans parent connu : lien visible des deux fiches', () => {
    const {
      ids: [a, b],
      lire,
      ecrire,
    } = trois();
    ecrire(ajouterFrereSansParent(lire(), a, b));
    expect(fratrie(lire(), a).freresSoeurs.map((x) => x.id)).toEqual([b]);
    expect(fratrie(lire(), b).freresSoeurs.map((x) => x.id)).toEqual([a]);
  });

  it('amitié : un groupe, donc réciproque', () => {
    const {
      ids: [a, b],
      lire,
      ecrire,
    } = trois();
    ecrire(creerGroupe(lire(), [a, b]).donnees);
    expect(amis(lire(), a).map((x) => x.id)).toEqual([b]);
    expect(amis(lire(), b).map((x) => x.id)).toEqual([a]);
    // Ajouter encore le même ami est refusé : pas de doublon.
    expect(() => ajouterAuGroupe(lire(), lire().groupes[0].id, b)).toThrow(/déjà dans ce groupe/);
    expect(lire().groupes[0].membres).toEqual([a, b]);
  });
});
