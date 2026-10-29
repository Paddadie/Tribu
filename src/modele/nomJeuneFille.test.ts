import { describe, expect, it } from 'vitest';
import {
  ajouterUnion,
  creerPersonne,
  donneesVides,
  modifierPersonne,
  modifierUnion,
  quiPeutReprendreSonNom,
  reprendreNomDeNaissance,
  separerUnion,
} from './modele';

function couple(sexeA: 'F' | 'M', nomA: string, sexeB: 'F' | 'M', nomB: string, marie = false) {
  let d = donneesVides();
  const a = creerPersonne(d, { prenom: 'A', nom: nomA, sexe: sexeA });
  const b = creerPersonne(a.donnees, { prenom: 'B', nom: nomB, sexe: sexeB });
  const u = ajouterUnion(b.donnees, a.personne.id, b.personne.id, marie);
  return { d: u.donnees, a: a.personne.id, b: b.personne.id, union: u.union.id };
}
const nom = (d: ReturnType<typeof donneesVides>, id: string) => d.personnes.find((p) => p.id === id)!;

describe('nom de jeune fille', () => {
  it('au mariage, la femme garde son nom en jeune fille et prend celui du conjoint', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    const d = modifierUnion(c.d, c.union, true);
    expect(nom(d, c.a)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
    expect(nom(d, c.b).nom).toBe('Martin');
  });

  it('marié dès la création du couple', () => {
    const c = couple('M', 'Martin', 'F', 'Durand', true);
    expect(nom(c.d, c.b)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
  });

  it('un nom de jeune fille déjà saisi est conservé', () => {
    const c = couple('F', 'Leroy', 'M', 'Martin');
    const d0 = modifierPersonne(c.d, c.a, { prenom: 'A', nom: 'Leroy', sexe: 'F', nomNaissance: 'Durand' });
    expect(nom(modifierUnion(d0, c.union, true), c.a)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
  });

  it('case « Prend le nom » décochée : le mariage ne change aucun nom', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    const d = modifierUnion(c.d, c.union, true, false);
    expect(d.unions[0].marie).toBe(true);
    expect(nom(d, c.a)).toMatchObject({ nom: 'Durand' });
    expect(nom(d, c.a).nomNaissance).toBeUndefined();
    const neuf = donneesVides();
    const a = creerPersonne(neuf, { prenom: 'A', nom: 'Durand', sexe: 'F' });
    const b = creerPersonne(a.donnees, { prenom: 'B', nom: 'Martin', sexe: 'M' });
    const u = ajouterUnion(b.donnees, a.personne.id, b.personne.id, true, 'actuelle', undefined, false);
    expect(nom(u.donnees, a.personne.id).nom).toBe('Durand');
  });

  it('couple non marié, séparé ou couple de femmes : rien ne change', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    expect(nom(modifierUnion(c.d, c.union, false), c.a).nom).toBe('Durand');
    const f = couple('F', 'Durand', 'F', 'Martin');
    expect(nom(modifierUnion(f.d, f.union, true), f.a).nom).toBe('Durand');
  });

  it('ne se refait pas si l’union est déjà mariée ; un nom de naissance se garde pour tous, sauf égal au nom', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    let d = modifierUnion(c.d, c.union, true);
    d = modifierPersonne(d, c.a, { prenom: 'A', nom: 'Dupont', sexe: 'F', nomNaissance: 'Durand' });
    expect(nom(modifierUnion(d, c.union, true), c.a).nom).toBe('Dupont');
    expect(nom(modifierPersonne(d, c.b, { prenom: 'B', nom: 'Martin', sexe: 'M', nomNaissance: 'Garnier' }), c.b).nomNaissance).toBe('Garnier');
    expect(nom(modifierPersonne(d, c.b, { prenom: 'B', nom: 'Martin', nomNaissance: 'Garnier' }), c.b).nomNaissance).toBe('Garnier');
    expect(nom(modifierPersonne(d, c.b, { prenom: 'B', nom: 'Martin', sexe: 'M', nomNaissance: ' Martin ' }), c.b).nomNaissance).toBeUndefined();
  });

  it('mariage déclaré depuis chaque côté, avec une personne existante : l’épouse prend le nom', () => {
    for (const [sexeA, sexeB] of [
      ['F', 'M'],
      ['M', 'F'],
    ] as const) {
      const c = couple(sexeA, sexeA === 'F' ? 'Durand' : 'Martin', sexeB, sexeB === 'F' ? 'Durand' : 'Martin', true);
      const epouse = sexeA === 'F' ? c.a : c.b;
      expect(nom(c.d, epouse)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
    }
  });

  it('sexe non précisé : aucun nom ne change au mariage', () => {
    let d = donneesVides();
    const a = creerPersonne(d, { prenom: 'A', nom: 'Durand' });
    const b = creerPersonne(a.donnees, { prenom: 'B', nom: 'Martin', sexe: 'M' });
    d = ajouterUnion(b.donnees, a.personne.id, b.personne.id, true).donnees;
    expect(nom(d, a.personne.id).nom).toBe('Durand');
  });
});

describe('reprise du nom de naissance', () => {
  const marie = () => couple('F', 'Durand', 'M', 'Martin', true);

  it('séparation : proposée à l’épouse qui porte encore le nom du mari, puis reprise', () => {
    const c = marie();
    const separes = separerUnion(c.d, c.union);
    expect(quiPeutReprendreSonNom(separes, c.union).map((p) => p.id)).toEqual([c.a]);
    const repris = reprendreNomDeNaissance(separes, c.a);
    expect(nom(repris, c.a).nom).toBe('Durand');
    expect(nom(repris, c.a).nomNaissance).toBeUndefined();
    expect(quiPeutReprendreSonNom(repris, c.union)).toEqual([]);
  });

  it('rien à proposer si elle a déjà changé de nom, ou sans nom de naissance', () => {
    const c = marie();
    const autre = modifierPersonne(c.d, c.a, { prenom: 'A', nom: 'Leroy', sexe: 'F', nomNaissance: 'Durand' });
    expect(quiPeutReprendreSonNom(autre, c.union)).toEqual([]);
    const sansCase = couple('F', 'Durand', 'M', 'Martin');
    expect(quiPeutReprendreSonNom(modifierUnion(sansCase.d, sansCase.union, true, false), sansCase.union)).toEqual([]);
    expect(() => reprendreNomDeNaissance(sansCase.d, sansCase.a)).toThrow('Aucun nom de naissance');
  });

  it('remariage après un divorce, avec ou sans reprise : le nom de jeune fille reste celui de naissance', () => {
    const c = marie();
    const separes = separerUnion(c.d, c.union);
    const r = creerPersonne(separes, { prenom: 'R', nom: 'Garnier', sexe: 'M' });
    const sansReprise = ajouterUnion(r.donnees, r.personne.id, c.a, true).donnees;
    expect(nom(sansReprise, c.a)).toMatchObject({ nom: 'Garnier', nomNaissance: 'Durand' });
    const avecReprise = ajouterUnion(reprendreNomDeNaissance(r.donnees, c.a), r.personne.id, c.a, true).donnees;
    expect(nom(avecReprise, c.a)).toMatchObject({ nom: 'Garnier', nomNaissance: 'Durand' });
  });

  it('veuvage : le nom reste, rien n’est proposé par le modèle tant que l’union est actuelle', () => {
    const c = marie();
    const veuve = modifierPersonne(c.d, c.b, { prenom: 'B', nom: 'Martin', sexe: 'M', decede: true });
    expect(nom(veuve, c.a)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
    expect(veuve.unions[0].statut).toBe('actuelle');
  });

  it('deux femmes : aucun changement, donc rien à reprendre', () => {
    const c = couple('F', 'Durand', 'F', 'Martin', true);
    expect(quiPeutReprendreSonNom(separerUnion(c.d, c.union), c.union)).toEqual([]);
  });
});
