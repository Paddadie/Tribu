import { describe, expect, it } from 'vitest';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides, modifierPersonne, unionsQuiSeSepareraient, unirParents } from './modele';
import { familleDuInconnu, enregistrerParentSansNom, PREFIXE_VIRTUEL } from './parentSansNom';
import type { Donnees, Sexe } from './types';

function monde(...gens: [string, string, Sexe][]) {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  for (const [prenom, nom, sexe] of gens) {
    const r = creerPersonne(d, { prenom, nom, sexe });
    d = r.donnees;
    id[prenom] = r.personne.id;
  }
  return { d, id };
}
const nom = (d: Donnees, id: string) => d.personnes.find((p) => p.id === id)!.nom;

describe('unirParents', () => {
  it('en couple : l’union actuelle de l’un passe en « séparée »', () => {
    const m = monde(['Marc', 'Lambert', 'M'], ['Nathalie', 'Roy', 'F'], ['Aurélie', 'Faure', 'F']);
    const d0 = ajouterUnion(m.d, m.id.Marc, m.id.Nathalie).donnees;
    expect(unionsQuiSeSepareraient(d0, m.id.Marc, m.id.Aurélie, 'couple')).toHaveLength(1);
    expect(unionsQuiSeSepareraient(d0, m.id.Marc, m.id.Aurélie, 'separee')).toHaveLength(0);
    const d = unirParents(d0, m.id.Marc, m.id.Aurélie, 'couple');
    expect(d.unions.map((u) => u.statut)).toEqual(['separee', 'actuelle']);
  });

  it('séparés : rien d’autre ne change', () => {
    const m = monde(['Marc', 'Lambert', 'M'], ['Nathalie', 'Roy', 'F'], ['Aurélie', 'Faure', 'F']);
    const d0 = ajouterUnion(m.d, m.id.Marc, m.id.Nathalie).donnees;
    const d = unirParents(d0, m.id.Marc, m.id.Aurélie, 'separee');
    expect(d.unions.map((u) => u.statut)).toEqual(['actuelle', 'separee']);
  });

  it('mariés : le nom de l’homme pour les deux', () => {
    const m = monde(['Aurélie', 'Faure', 'F'], ['Marc', 'Lambert', 'M']);
    const d = unirParents(m.d, m.id.Aurélie, m.id.Marc, 'marie');
    expect(nom(d, m.id.Aurélie)).toBe('Lambert');
    expect(d.unions[0]).toMatchObject({ marie: true, statut: 'actuelle' });
  });

  it('une union existante est laissée telle quelle', () => {
    const m = monde(['Marc', 'Lambert', 'M'], ['Aurélie', 'Faure', 'F']);
    const d0 = ajouterUnion(m.d, m.id.Marc, m.id.Aurélie, false, 'separee').donnees;
    expect(unirParents(d0, m.id.Aurélie, m.id.Marc, 'marie')).toBe(d0);
  });
});

describe('familleDuInconnu', () => {
  it('virtuel : les enfants qui n’ont que ce parent, et lui', () => {
    const m = monde(['Marc', 'Lambert', 'M'], ['Zoé', 'Lambert', 'F'], ['Théo', 'Lambert', 'M']);
    let d = ajouterFiliation(m.d, m.id.Marc, m.id.Zoé, 'biologique').donnees;
    d = ajouterFiliation(d, m.id.Marc, m.id.Théo, 'biologique').donnees;
    const f = familleDuInconnu(d, PREFIXE_VIRTUEL + m.id.Marc)!;
    expect(f.enfants.map((p) => p.prenom)).toEqual(['Zoé', 'Théo']);
    expect(f.parents.map((p) => p.prenom)).toEqual(['Marc']);
    // Enregistré : mêmes enfants, même parent connu (le « ? » lui-même écarté).
    const enr = enregistrerParentSansNom(d, PREFIXE_VIRTUEL + m.id.Marc)!;
    const g = familleDuInconnu(enr.donnees, enr.personne.id)!;
    expect(g.enfants.map((p) => p.prenom)).toEqual(['Zoé', 'Théo']);
    expect(g.parents.map((p) => p.prenom)).toEqual(['Marc']);
  });

  it('sans enfant : rien', () => {
    const m = monde(['Marc', 'Lambert', 'M']);
    expect(familleDuInconnu(m.d, PREFIXE_VIRTUEL + m.id.Marc)).toBeUndefined();
    expect(familleDuInconnu(modifierPersonne(m.d, m.id.Marc, { prenom: 'Marc', nom: 'Lambert' }), m.id.Marc)).toBeUndefined();
  });
});
