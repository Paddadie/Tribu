import { describe, expect, it } from 'vitest';
import { filtresFamillesAmis } from './famillesAmis';
import { creerGroupe, creerPersonne, donneesVides } from './modele';
import type { Donnees } from './types';

/** Trois familles d'amis : Bonnet (Ana, Bea), Garnier (Carl, Dina, Eli), Roussel (Fanny). */
function base() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  for (const [prenom, nom] of [
    ['Ana', 'Bonnet'],
    ['Bea', 'Bonnet'],
    ['Carl', 'Garnier'],
    ['Dina', 'Garnier'],
    ['Eli', 'Garnier'],
    ['Fanny', 'Roussel'],
  ]) {
    const r = creerPersonne(d, { prenom, nom });
    d = r.donnees;
    id[prenom] = r.personne.id;
  }
  const familles = [
    { nom: 'Famille Bonnet', ids: [id.Ana, id.Bea] },
    { nom: 'Famille Garnier', ids: [id.Carl, id.Dina, id.Eli] },
    { nom: 'Famille Roussel', ids: [id.Fanny] },
  ];
  return { d, id, familles };
}

const resume = (fs: ReturnType<typeof filtresFamillesAmis<{ nom: string; ids: string[] }>>) =>
  fs.map((f) => [f.nom, f.familles.map((x) => `${x.famille.nom} ${x.n}`)]);

describe('Familles des amis filtrées par groupe', () => {
  it('sans groupe, seul « Tout » reste, chaque famille sur tous ses porteurs', () => {
    const { d, familles } = base();
    expect(resume(filtresFamillesAmis(d, familles))).toEqual([['Tout', ['Famille Bonnet 2', 'Famille Garnier 3', 'Famille Roussel 1']]]);
  });

  it('un filtre par groupe, par ordre alphabétique ; chaque famille compte ses seuls porteurs du groupe', () => {
    const { d: d0, id, familles } = base();
    let d = creerGroupe(d0, [id.Carl, id.Fanny], 'Rando').donnees;
    d = creerGroupe(d, [id.Ana, id.Dina, id.Eli], 'Collègues').donnees;
    const filtres = filtresFamillesAmis(d, familles);
    expect(resume(filtres)).toEqual([
      ['Tout', ['Famille Bonnet 2', 'Famille Garnier 3', 'Famille Roussel 1']],
      ['Collègues', ['Famille Bonnet 1', 'Famille Garnier 2']],
      ['Rando', ['Famille Garnier 1', 'Famille Roussel 1']],
    ]);
    expect(filtres[0].groupe).toBeUndefined();
    expect(filtres[1].groupe?.nom).toBe('Collègues');
  });

  it('un groupe sans famille d’ami n’a pas de filtre ; un groupe sans nom prend celui de ses membres', () => {
    const { d: d0, id, familles } = base();
    const gus = creerPersonne(d0, { prenom: 'Gus', nom: '' });
    const hal = creerPersonne(gus.donnees, { prenom: 'Hal', nom: '' });
    let d = creerGroupe(hal.donnees, [gus.personne.id, hal.personne.id], 'Vide').donnees;
    d = creerGroupe(d, [id.Bea, id.Carl]).donnees;
    expect(resume(filtresFamillesAmis(d, familles)).map(([nom]) => nom)).toEqual(['Tout', 'Groupe de Bea, Carl']);
  });

  it('sans famille d’ami, « Tout » est vide et aucun groupe n’a de filtre', () => {
    const { d: d0, id } = base();
    const d = creerGroupe(d0, [id.Ana, id.Bea], 'Rando').donnees;
    expect(resume(filtresFamillesAmis(d, []))).toEqual([['Tout', []]]);
  });
});
