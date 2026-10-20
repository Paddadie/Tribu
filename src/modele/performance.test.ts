import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { familleElargie } from './deductions';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele';
import type { Donnees } from './types';

/** Famille générée de `n` personnes : couples qui font deux enfants, chaque enfant se met en couple, génération après génération. */
function familleGeneree(n: number): { donnees: Donnees; moi: string } {
  let d = donneesVides();
  let numero = 0;
  const ajouter = () => {
    const r = creerPersonne(d, { prenom: `P${numero++}`, nom: `N${numero % 9}`, sexe: numero % 2 ? 'F' : 'M' });
    d = r.donnees;
    return r.personne.id;
  };
  let couples: [string, string][] = [[ajouter(), ajouter()]];
  d = ajouterUnion(d, couples[0][0], couples[0][1]).donnees;
  let moi = couples[0][0];
  while (d.personnes.length < n) {
    const suivants: [string, string][] = [];
    for (const [a, b] of couples) {
      for (let i = 0; i < 2 && d.personnes.length < n - 1; i++) {
        const enfant = ajouter();
        const conjoint = ajouter();
        d = ajouterFiliation(d, a, enfant, 'biologique').donnees;
        d = ajouterFiliation(d, b, enfant, 'biologique').donnees;
        d = ajouterUnion(d, enfant, conjoint).donnees;
        suivants.push([enfant, conjoint]);
        moi = enfant;
      }
    }
    couples = suivants;
  }
  return { donnees: d, moi };
}

// Seuils très larges : ils ne servent qu'à repérer une explosion (quadratique ou pire), pas à mesurer.
const SEUIL_MS = 3000;

describe('performance sur 300 fiches générées', () => {
  const { donnees, moi } = familleGeneree(300);

  it('génère bien 300 personnes', () => {
    expect(donnees.personnes).toHaveLength(300);
  });

  it('familleElargie reste rapide', () => {
    const debut = performance.now();
    familleElargie(donnees, moi);
    expect(performance.now() - debut).toBeLessThan(SEUIL_MS);
  });

  it('disposerArbre reste rapide', () => {
    const debut = performance.now();
    const disp = disposerArbre(donnees, moi);
    expect(performance.now() - debut).toBeLessThan(SEUIL_MS);
    expect(disp.places.length).toBeGreaterThan(0);
  });
});
