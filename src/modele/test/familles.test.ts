// Générateur de familles fictives (V4, lot 0) : déterminisme, validité, structures attendues et invariants.
import { describe, expect, it } from 'vitest';
import { fratrie } from '../deductions';
import { ajouterFiliation } from '../modele';
import { estDonneesValides } from '../stockage';
import { aleatoire, dupontel, extremes, famille, famillesDeReference, lambert, martinezVasseur, rochefort } from './familles';
import { verifierInvariants } from './invariants';

const familles = famillesDeReference();

describe('générateur de familles fictives', () => {
  it('le tirage à graine est reproductible et reste dans [0, 1)', () => {
    const [a, b] = [aleatoire(42), aleatoire(42)];
    const suite = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(suite);
    expect(suite.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(aleatoire(43)()).not.toBe(suite[0]);
  });

  it('chaque famille est identique d’un appel à l’autre (octet pour octet)', () => {
    expect(JSON.stringify(famillesDeReference())).toBe(JSON.stringify(familles));
  });

  it.each(familles.map((f) => [f.fichier, f] as const))('%s : données valides, Moi présent, invariants respectés', (_n, f) => {
    expect(estDonneesValides(f.donnees)).toBe(true);
    expect(f.donnees.personnes.some((p) => p.id === f.moi)).toBe(true);
    expect(verifierInvariants(f.donnees)).toEqual([]);
  });

  it('aucune naissance après 2024, aucun décès avant la naissance', () => {
    for (const f of familles) {
      for (const p of f.donnees.personnes) {
        if (p.naissance) expect(Number(p.naissance.slice(0, 4))).toBeLessThanOrEqual(2024);
        if (p.naissance && p.deces) expect(p.deces.slice(0, 4) >= p.naissance.slice(0, 4)).toBe(true);
      }
    }
  });

  it('un mariage fait prendre le nom du mari et garde le nom de jeune fille', () => {
    const { donnees } = famille('Essai', { graine: 1, debut: 1980 }).couple('Marc', 'Sophie', { marie: true }).moi('Marc').construire();
    expect(donnees.personnes.find((p) => p.prenom === 'Sophie')).toMatchObject({ nom: 'Essai', sexe: 'F' });
    expect(donnees.personnes.find((p) => p.prenom === 'Sophie')?.nomNaissance).not.toBe('Essai');
  });

  it('Dupontel : six générations, Bastien avec une ex et une compagne, demi-frère de Moi', () => {
    const f = dupontel();
    const d = f.donnees;
    const bastien = 'dupontel-bastien';
    expect(d.unions.filter((u) => u.personneA === bastien).map((u) => u.statut)).toEqual(['separee', 'actuelle']);
    expect(fratrie(d, f.moi).demis.map((p) => p.prenom)).toEqual(['Noah']);
    const annees = d.personnes.filter((p) => p.naissance).map((p) => Number(p.naissance!.slice(0, 4)));
    expect(Math.max(...annees) - Math.min(...annees)).toBeGreaterThan(5 * 25);
  });

  it('Martinez-Vasseur : aïeux séparés, six frères et sœurs Vasseur, ancêtres sans prénom', () => {
    const d = martinezVasseur().donnees;
    expect(d.unions[0]).toMatchObject({ statut: 'separee', marie: true });
    expect(fratrie(d, 'martinez-vasseur-hubert').freresSoeurs).toHaveLength(5);
    expect(d.personnes.filter((p) => !p.prenom && !p.inconnu)).toHaveLength(3);
  });

  it('Lambert : enfants d’un ex non uni, « ? » enregistré, deux adoptés et un biologique', () => {
    const d = lambert().donnees;
    const marc = 'lambert-marc';
    const aurelie = 'lambert-aurelie';
    expect(d.unions.some((u) => [u.personneA, u.personneB].includes(aurelie))).toBe(false);
    expect(d.filiations.filter((f) => f.parent === aurelie)).toHaveLength(2);
    expect(d.personnes.filter((p) => p.sansNom)).toHaveLength(1);
    expect(d.filiations.filter((f) => f.parent === marc)).toHaveLength(4);
    expect(d.filiations.filter((f) => f.parent === 'lambert-romain').map((f) => f.type)).toEqual(['adoptif', 'adoptif', 'biologique']);
  });

  it('Rochefort : deux inconnus, un veuf remarié, un décès sans date, des dates partielles, un parent unique', () => {
    const d = rochefort().donnees;
    expect(d.personnes.filter((p) => p.inconnu)).toHaveLength(2);
    expect(d.unions.filter((u) => u.personneA === 'rochefort-henri' && u.statut === 'actuelle')).toHaveLength(2);
    expect(d.personnes.find((p) => p.id === 'rochefort-anatole')).toMatchObject({ decede: true });
    expect(d.personnes.some((p) => p.naissance && p.naissance.length < 10)).toBe(true);
    expect(d.filiations.filter((f) => f.enfant === 'rochefort-noe')).toHaveLength(1);
  });

  it('Extrêmes : 12 enfants, couple de même sexe, 3 ex, sans sexe connu ; une boucle est refusée', () => {
    const d = extremes().donnees;
    expect(d.filiations.filter((f) => f.parent === 'extremes-gustave')).toHaveLength(12);
    expect(d.unions.filter((u) => u.personneA === 'extremes-ophelie').map((u) => u.statut)).toEqual(['separee', 'separee', 'separee', 'actuelle']);
    expect(d.personnes.find((p) => p.id === 'extremes-sacha')?.sexe).toBeUndefined();
    expect(() => ajouterFiliation(d, 'extremes-yanis', 'extremes-gustave', 'biologique')).toThrow(/boucle/);
  });
});

describe('verifierInvariants', () => {
  const base = lambert().donnees;
  const avec = (modif: Partial<typeof base>) => verifierInvariants({ ...base, ...modif });

  it('repère un troisième parent, une boucle, un lien orphelin, un doublon, deux conjoints vivants', () => {
    const f = base.filiations[0];
    const neufs = ['n1', 'n2'].map((id) => ({ id, prenom: id, nom: '', note: '' }));
    const troisieme = avec({
      personnes: [...base.personnes, ...neufs],
      filiations: [...base.filiations, ...neufs.map((p) => ({ id: `f-${p.id}`, parent: p.id, enfant: 'lambert-jade', type: 'biologique' as const }))],
    });
    expect(troisieme).toEqual(['4 parents pour lambert-jade/biologique']);
    expect(avec({ filiations: [...base.filiations, { id: 'x', parent: 'lambert-marc', enfant: 'lambert-gerard', type: 'adoptif' }] })).toContain(
      'boucle d’ascendance',
    );
    expect(avec({ filiations: [...base.filiations, { ...f, id: 'x', parent: 'absent' }] }).join()).toMatch(/absente/);
    expect(avec({ filiations: [...base.filiations, { ...f, id: 'x' }] }).join()).toMatch(/en double/);
    expect(
      avec({ unions: [...base.unions, { id: 'x', personneA: 'lambert-marc', personneB: 'lambert-aurelie', marie: false, statut: 'actuelle' }] }).join(),
    ).toMatch(/2 conjoints actuels/);
  });

  it('repère un inconnu à un seul enfant, un « ? » sans lien, un nom de naissance égal au nom', () => {
    const inconnu = { id: 'i', prenom: '', nom: '', note: '', inconnu: true as const };
    expect(
      avec({
        personnes: [...base.personnes, inconnu],
        filiations: [...base.filiations, { id: 'x', parent: 'i', enfant: 'lambert-marc', type: 'biologique' }],
      }).join(),
    ).toMatch(/moins de 2/);
    expect(avec({ personnes: [...base.personnes, { id: 's', prenom: '?', nom: '', note: '', sansNom: true }] }).join()).toMatch(/sans lien/);
    expect(avec({ personnes: base.personnes.map((p) => (p.nomNaissance ? { ...p, nom: p.nomNaissance } : p)) }).join()).toMatch(/nom de naissance/);
  });
});
