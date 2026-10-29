import { describe, expect, it } from 'vitest';
import { conjoint, conjointsDefunts } from './deductions';
import { evenementsAVenir } from './evenements';
import { disposerFoyer, familleProche } from './familleProche';
import { fusionner } from './fusion';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides, enCouple, modifierPersonne, retablirUnion, separerUnion } from './modele';
import { estDonneesValides } from './stockage';
import type { Donnees } from './types';

const copie = (d: Donnees): Donnees => JSON.parse(JSON.stringify(d));

/** Jeanne, veuve de Pierre (décédé), avec un fils ; Henri, libre. */
function veuve() {
  let d = donneesVides();
  const jeanne = creerPersonne(d, { prenom: 'Jeanne', nom: 'Morel', naissance: '1950' });
  d = jeanne.donnees;
  const pierre = creerPersonne(d, { prenom: 'Pierre', nom: 'Morel', naissance: '1948', deces: '2015' });
  d = pierre.donnees;
  const henri = creerPersonne(d, { prenom: 'Henri', nom: 'Dubois', naissance: '1949' });
  d = henri.donnees;
  const fils = creerPersonne(d, { prenom: 'Louis', nom: 'Morel', naissance: '1975' });
  d = fils.donnees;
  d = ajouterUnion(d, jeanne.personne.id, pierre.personne.id, true, 'actuelle', '1972-06-10').donnees;
  d = ajouterFiliation(d, jeanne.personne.id, fils.personne.id, 'biologique').donnees;
  d = ajouterFiliation(d, pierre.personne.id, fils.personne.id, 'biologique').donnees;
  return { d, jeanne: jeanne.personne.id, pierre: pierre.personne.id, henri: henri.personne.id, fils: fils.personne.id };
}

describe('veuvage', () => {
  it('une union avec un défunt n’empêche pas une nouvelle union', () => {
    const { d, jeanne, pierre, henri } = veuve();
    expect(enCouple(d, jeanne)).toBe(false);
    expect(enCouple(d, pierre)).toBe(true);
    expect(conjoint(d, jeanne)?.personne.id).toBe(pierre);

    const apres = ajouterUnion(d, jeanne, henri, true, 'actuelle', '2018').donnees;
    expect(conjoint(apres, jeanne)?.personne.id).toBe(henri);
    expect(conjointsDefunts(apres, jeanne).map((c) => c.personne.id)).toEqual([pierre]);
    expect(conjoint(apres, pierre)?.personne.id).toBe(jeanne);
    expect(apres.unions.every((u) => u.statut === 'actuelle')).toBe(true);
    expect(estDonneesValides(copie(apres))).toBe(true);
  });

  it('deux conjoints vivants restent interdits', () => {
    const { d, jeanne, henri } = veuve();
    const apres = ajouterUnion(d, jeanne, henri).donnees;
    const autre = creerPersonne(apres, { prenom: 'Marc', nom: 'Petit' });
    expect(() => ajouterUnion(autre.donnees, jeanne, autre.personne.id)).toThrow();
    // Le défunt ne peut pas non plus prendre un autre conjoint tant que sa veuve est en vie.
    expect(() => ajouterUnion(autre.donnees, veuve().pierre, autre.personne.id)).toThrow();

    const invalide = copie(autre.donnees);
    invalide.unions.push({ id: 'u-double', personneA: jeanne, personneB: autre.personne.id, marie: false, statut: 'actuelle' });
    expect(estDonneesValides(invalide)).toBe(false);
  });

  it('refuse de retirer le décès si le veuf s’est remarié, ou de rétablir une union qui ferait deux conjoints vivants', () => {
    const { d, jeanne, pierre, henri } = veuve();
    const apres = ajouterUnion(d, jeanne, henri).donnees;
    expect(() => modifierPersonne(apres, pierre, { prenom: 'Pierre', nom: 'Morel', naissance: '1948' })).toThrow(/remarié/);
    expect(() => modifierPersonne(d, pierre, { prenom: 'Pierre', nom: 'Morel', naissance: '1948' })).not.toThrow();

    const separee = separerUnion(apres, apres.unions.find((u) => u.personneB === pierre)!.id);
    expect(() => retablirUnion(separee, separee.unions.find((u) => u.personneB === pierre)!.id)).not.toThrow();
    const sansHenri = separerUnion(apres, apres.unions.find((u) => u.personneB === henri)!.id);
    const marc = creerPersonne(sansHenri, { prenom: 'Marc', nom: 'Petit' });
    const avecMarc = ajouterUnion(marc.donnees, jeanne, marc.personne.id).donnees;
    expect(() => retablirUnion(avecMarc, avecMarc.unions.find((u) => u.personneB === henri)!.id)).toThrow();
  });

  it('dessine les deux unions en trait plein, le défunt avec ses enfants', () => {
    const { d, jeanne, pierre, henri } = veuve();
    const apres = ajouterUnion(d, jeanne, henri).donnees;
    const f = familleProche(apres, jeanne);
    expect(f.conjoint?.id).toBe(henri);
    expect(f.partenaires).toEqual([{ id: pierre, statut: 'actuelle' }]);
    const dis = disposerFoyer(f, 294);
    expect(dis.traits.filter((t) => t.style === 'ex')).toEqual([]);
  });

  it('ne fête que la nouvelle union', () => {
    const { d, jeanne, henri } = veuve();
    const aujourdhui = new Date(2026, 5, 1);
    const unions = (x: Donnees) => evenementsAVenir(x, aujourdhui, 30).filter((e) => e.genre === 'union');
    expect(unions(d)).toHaveLength(1);
    expect(unions(ajouterUnion(d, jeanne, henri, true, 'actuelle', '2018-06-20').donnees).map((e) => e.personnes.map((p) => p.prenom))).toEqual([
      ['Jeanne', 'Henri'],
    ]);
  });

  it('la fusion ne voit pas de doublon de couple quand l’un des conjoints est décédé', async () => {
    const { d, jeanne, henri } = veuve();
    const importe = ajouterUnion(copie(d), jeanne, henri).donnees;
    const questions: unknown[] = [];
    const r = await fusionner(d, importe, async (q) => (questions.push(q), 0));
    expect(questions).toEqual([]);
    expect(conjoint(r.donnees, jeanne)?.personne.id).toBe(henri);
  });
});
