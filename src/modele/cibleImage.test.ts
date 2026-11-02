import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { CIBLES, garderCible, nomFichierImage, personnesDessinees, personnesDuGroupe, pourFichier, titreImage } from './cibleImage';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import type { Donnees } from './types';

/** Moi, ses parents, sa sœur et son ex ; deux amis (l'un marié, avec un enfant) et une cousine dans « Club de voile ». */
function monde() {
  let d: Donnees = donneesVides();
  const ids: Record<string, string> = {};
  for (const [prenom, nom] of [
    ['Léon', 'Dupontel'],
    ['Anselme', 'Dupontel'],
    ['Berthe', 'Dupontel'],
    ['Zélie', 'Dupontel'],
    ['Ottilie', 'Ravier'],
    ['Gaspard', 'Dupontel'],
    ['Inès', 'Dupontel'],
    ['Marius', 'Castagnol'],
    ['Nora', 'Castagnol'],
    ['Pablo', 'Castagnol'],
    ['Barnabé', 'Brémontier'],
    ['Rosalie', 'Brémontier'],
  ]) {
    const r = creerPersonne(d, { prenom, nom });
    d = r.donnees;
    ids[prenom] = r.personne.id;
  }
  const filiation = (parent: string, enfant: string) => (d = ajouterFiliation(d, ids[parent], ids[enfant], 'biologique').donnees);
  filiation('Anselme', 'Léon');
  filiation('Berthe', 'Léon');
  filiation('Anselme', 'Zélie');
  filiation('Berthe', 'Zélie');
  filiation('Anselme', 'Gaspard');
  filiation('Gaspard', 'Inès');
  d = ajouterUnion(d, ids.Anselme, ids.Berthe, true).donnees;
  d = ajouterUnion(d, ids.Léon, ids.Ottilie, false, 'separee').donnees;
  d = ajouterUnion(d, ids.Marius, ids.Nora, true).donnees;
  filiation('Marius', 'Pablo');
  filiation('Nora', 'Pablo');
  // Rosalie, l'ex de Barnabé, n'est pas dans le groupe.
  d = ajouterUnion(d, ids.Barnabé, ids.Rosalie, false, 'separee').donnees;
  const voile = creerGroupe(d, [ids.Marius, ids.Barnabé, ids.Inès], 'Club de voile', ids.Léon);
  d = voile.donnees;
  const seul = creerGroupe(d, [ids.Pablo], '', ids.Léon);
  return { d: seul.donnees, ids, voile: voile.groupe.id, seul: seul.groupe.id };
}

describe('cibles de l’export PNG', () => {
  it('proposent les six cibles, « Toute la famille » à côté de « Tout l’arbre »', () => {
    expect(CIBLES.map(([c]) => c)).toEqual(['tout', 'famille', 'directe', 'fratries', 'conjoints', 'groupe']);
    expect(CIBLES[0][1]).toBe('Tout l’arbre');
  });

  it('« Toute la famille » garde parents, fratrie, cousins et ex, sans aucun ami', () => {
    const { d, ids } = monde();
    const garder = garderCible(d, ids.Léon, 'famille')!;
    expect([...garder].sort()).toEqual([ids.Léon, ids.Anselme, ids.Berthe, ids.Zélie, ids.Ottilie, ids.Gaspard, ids.Inès].sort());
    const disp = disposerArbre(d, ids.Léon, garder);
    expect(disp.groupes).toEqual([]);
    expect(disp.anneaux).toEqual([]);
    expect(personnesDessinees(d, 'famille', disp)).toBe(7);
  });

  it('un groupe garde ses membres, la famille de chacun et Moi, sans la famille de Moi', () => {
    const { d, ids, voile } = monde();
    const garder = personnesDuGroupe(d, voile, ids.Léon);
    // La cousine Inès vient seule : sa famille est celle de Moi.
    expect([...garder].sort()).toEqual([voile, ids.Léon, ids.Marius, ids.Nora, ids.Pablo, ids.Barnabé, ids.Rosalie, ids.Inès].sort());
    const disp = disposerArbre(d, ids.Léon, garder);
    expect(disp.groupes.map((g) => g.id)).toEqual([voile]);
    expect(personnesDessinees(d, 'groupe', disp)).toBe(7);
    expect(disp.places.map((p) => p.personne.id)).not.toContain(ids.Anselme);
  });

  it('un groupe inconnu ou absent ne garde personne', () => {
    const { d, ids } = monde();
    expect(personnesDuGroupe(d, 'absent', ids.Léon).size).toBe(0);
    expect(garderCible(d, ids.Léon, 'groupe')!.size).toBe(0);
    expect(disposerArbre(d, ids.Léon, new Set()).places).toEqual([]);
  });

  it('tout l’arbre et la ligne directe ne changent pas : la ligne directe reste sans amis', () => {
    const { d, ids } = monde();
    expect(garderCible(d, ids.Léon, 'tout')).toBeUndefined();
    const disp = disposerArbre(d, ids.Léon, garderCible(d, ids.Léon, 'conjoints'));
    expect(disp.groupes).toEqual([]);
    expect(disp.anneaux).toEqual([]);
    expect(personnesDessinees(d, 'tout', disposerArbre(d, ids.Léon))).toBe(12);
  });

  it('titre l’image selon la cible', () => {
    const { d, ids, voile, seul } = monde();
    const moi = d.personnes.find((p) => p.id === ids.Léon)!;
    expect(titreImage(d, moi, 'tout')).toBe('Arbre de Léon Dupontel');
    expect(titreImage(d, moi, 'directe')).toBe('Arbre de Léon Dupontel');
    expect(titreImage(d, moi, 'famille')).toBe('Famille de Léon Dupontel');
    expect(titreImage(d, moi, 'groupe', voile)).toBe('Amis : Club de voile');
    expect(titreImage(d, moi, 'groupe', seul)).toBe('Amis : Groupe de Léon, Pablo');
  });

  it('nomme le fichier selon la cible, sans accents ni signes dans le nom du groupe', () => {
    const { d, voile, seul } = monde();
    const jour = new Date('2026-11-02T12:00:00Z');
    expect(nomFichierImage(d, 'tout', jour)).toBe('tribu-arbre-2026-11-02.png');
    expect(nomFichierImage(d, 'fratries', jour)).toBe('tribu-arbre-2026-11-02.png');
    expect(nomFichierImage(d, 'famille', jour)).toBe('tribu-famille-2026-11-02.png');
    expect(nomFichierImage(d, 'groupe', jour, voile)).toBe('tribu-amis-club-de-voile-2026-11-02.png');
    expect(nomFichierImage(d, 'groupe', jour, seul)).toBe('tribu-amis-groupe-de-leon-pablo-2026-11-02.png');
    expect(nomFichierImage(d, 'groupe', jour, 'absent')).toBe('tribu-amis-2026-11-02.png');
  });

  it('pourFichier garde lettres et chiffres, coupe à 40 caractères, sans tiret au bord', () => {
    expect(pourFichier('  Les Copains / d’Été ⛵ 2024 ! ')).toBe('les-copains-d-ete-2024');
    expect(pourFichier('⛵⛵')).toBe('');
    expect(pourFichier('a'.repeat(39) + ' b c')).toBe('a'.repeat(39));
  });
});
