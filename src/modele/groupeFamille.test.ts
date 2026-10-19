import { describe, expect, it } from 'vitest';
import { ajouterFiliation, creerGroupe, creerPersonne, donneesVides, groupesDeLaFamille } from './modele';
import type { Donnees } from './types';

/** Karim → Lina (enfant) ; Sophie → Hugo (enfant) ; Zoé seule. */
function base() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  for (const prenom of ['Karim', 'Lina', 'Sophie', 'Hugo', 'Zoe', 'Ami']) {
    const r = creerPersonne(d, { prenom, nom: 'X' });
    d = r.donnees;
    id[prenom] = r.personne.id;
  }
  d = ajouterFiliation(d, id.Karim, id.Lina, 'biologique').donnees;
  d = ajouterFiliation(d, id.Sophie, id.Hugo, 'biologique').donnees;
  return { d, id };
}

describe('Groupes d’amis : la famille d’un membre compte dans son groupe', () => {
  it('retrouve le groupe d’un membre depuis sa famille, de proche en proche', () => {
    const { d, id } = base();
    const r = creerGroupe(d, [id.Karim, id.Ami], 'Voisins');
    expect(groupesDeLaFamille(r.donnees, id.Lina).map((g) => g.id)).toEqual([r.groupe.id]);
    expect(groupesDeLaFamille(r.donnees, id.Karim).map((g) => g.id)).toEqual([r.groupe.id]);
  });

  it('ne voit aucun groupe pour une famille sans membre', () => {
    const { d, id } = base();
    const r = creerGroupe(d, [id.Karim, id.Ami], 'Voisins');
    expect(groupesDeLaFamille(r.donnees, id.Hugo)).toEqual([]);
    expect(groupesDeLaFamille(r.donnees, id.Zoe)).toEqual([]);
  });

  it('plusieurs membres d’une même famille : un seul groupe renvoyé', () => {
    const { d, id } = base();
    const r = creerGroupe(d, [id.Karim, id.Lina], 'Voisins');
    expect(groupesDeLaFamille(r.donnees, id.Lina)).toHaveLength(1);
  });
});
