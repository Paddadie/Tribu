import { describe, expect, it } from 'vitest';
import { amis, raisonGroupe } from './deductions';
import { ajouterFiliation, creerGroupe, creerPersonne, donneesVides, groupesDe, groupesDeLaFamille } from './modele';

function cas() {
  let d = donneesVides();
  const id: Record<string, string> = {};
  for (const prenom of ['Moi', 'Karim', 'Inès', 'Lina', 'Zoé']) {
    const r = creerPersonne(d, { prenom, nom: 'X' });
    d = r.donnees;
    id[prenom] = r.personne.id;
  }
  d = ajouterFiliation(d, id.Moi, id.Lina, 'biologique').donnees; // Lina : fille de Moi
  d = creerGroupe(d, [id.Karim, id.Inès], 'Nantais', id.Moi).donnees;
  d = creerGroupe(d, [id.Zoé], 'Collègues', id.Moi).donnees;
  return { d, id, personne: (p: string) => d.personnes.find((x) => x.id === id[p])! };
}

describe('Moi dans tous les groupes', () => {
  it('est membre d’office de chaque groupe créé', () => {
    const { d, id } = cas();
    expect(groupesDe(d, id.Moi)).toHaveLength(2);
    expect(amis(d, id.Karim).map((p) => p.id)).toContain(id.Moi);
  });

  it('peut rejoindre un autre groupe, mais pas deux fois le même', () => {
    const { d, id, personne } = cas();
    expect(raisonGroupe(d, personne('Moi'), undefined, id.Moi)).toBeUndefined();
    expect(raisonGroupe(d, personne('Moi'), d.groupes[0], id.Moi)).toBe('Déjà dans le groupe');
  });

  it('sa famille n’est pas « famille d’un membre » des groupes', () => {
    const { d, id, personne } = cas();
    expect(groupesDeLaFamille(d, id.Lina)).toHaveLength(2);
    expect(groupesDeLaFamille(d, id.Lina, id.Moi)).toEqual([]);
    expect(raisonGroupe(d, personne('Lina'), d.groupes[0], id.Moi)).toBeUndefined();
  });
});
