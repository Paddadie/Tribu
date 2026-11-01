import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { assouplir, deplier, niveaux, preparer, signature } from './souple';
import { chercherDecalages, fautesDe } from './soupleRecherche';
import { demo } from './test/demoSouple';
import { famillesDeReference } from './test/familles';
import type { Donnees } from './types';

/** Croisements et ambiguïtés de l'arbre, sans décalage puis avec ceux de la recherche. */
function avantApres(donnees: Donnees, moi: string) {
  const disp = disposerArbre(donnees, moi);
  const S = preparer(disp, moi)!;
  const dec = chercherDecalages(donnees, disp, moi);
  const rien = deplier(S, { d: [], h: [] });
  const { d, h } = deplier(S, dec);
  return { disp, dec, avant: fautesDe(S, rien.d, rien.h), apres: fautesDe(S, d, h) };
}

const ambiguites = (f: ReturnType<typeof fautesDe>) => f.sousCarte + f.chevauchements + f.faussesFratries + f.recouvrements + f.contacts;
const ligne = (disp: ReturnType<typeof disposerArbre>, id: string) => disp.places.find((p) => p.personne.id === id)!.y;

describe('générations souples (V1b)', () => {
  it('démo : le croisement disparaît en montant les seuls cousins de la mère', () => {
    const { donnees, moi } = demo();
    const { disp, dec, avant, apres } = avantApres(donnees, moi);
    expect(avant.croisements).toBe(1);
    expect(apres.croisements).toBe(0);
    expect(ambiguites(apres)).toBeLessThanOrEqual(ambiguites(avant));
    const S = preparer(disp, moi)!;
    const decales = [...niveaux(S, deplier(S, dec).d)].filter(([, n]) => n !== 0).map(([id]) => id);
    expect(decales.sort()).toEqual(['c1', 'c2']);
    // Sur l'arbre, les cousins sont au-dessus de la ligne de la mère.
    const souple = assouplir(disp, moi, dec);
    expect(ligne(souple, 'c1')).toBeLessThan(ligne(souple, 'q1'));
    expect(ligne(souple, 'c1')).toBe(ligne(souple, 'c2'));
  });

  it('démo bloquée : aucune hauteur n’évite le croisement, rien ne bouge', () => {
    const { donnees, moi } = demo(true);
    const { disp, dec, avant, apres } = avantApres(donnees, moi);
    expect(avant.croisements).toBe(1);
    expect(apres).toEqual(avant);
    expect(dec).toEqual({ d: [], h: [] });
    expect(assouplir(disp, moi, dec)).toBe(disp);
  });

  it('les conjoints restent sur la même ligne, la descendance revient à la hauteur normale', () => {
    const { donnees, moi } = demo();
    const { disp, dec } = avantApres(donnees, moi);
    const souple = assouplir(disp, moi, dec);
    for (const c of souple.couples) if (ligne(disp, c.a) === ligne(disp, c.b)) expect(ligne(souple, c.a)).toBe(ligne(souple, c.b));
    // Moi et sa fratrie, sous les parents qui n'ont pas bougé : même écart qu'avant.
    expect(ligne(souple, 'moi') - ligne(souple, 'p1')).toBe(ligne(disp, 'moi') - ligne(disp, 'p1'));
  });

  it('familles de référence : jamais plus de croisements ni de nouvelle ambiguïté ; Lambert et extrêmes en perdent un', () => {
    for (const f of famillesDeReference()) {
      const { dec, avant, apres } = avantApres(f.donnees, f.moi);
      expect(apres.croisements, f.nom).toBeLessThanOrEqual(avant.croisements);
      expect(ambiguites(apres), f.nom).toBeLessThanOrEqual(ambiguites(avant));
      if (f.fichier === 'lambert' || f.fichier === 'extremes') {
        expect(apres.croisements, f.nom).toBeLessThan(avant.croisements);
        expect(dec.d.length, f.nom).toBeGreaterThan(0);
      }
    }
  }, 60000);

  it('les décalages gardés redonnent le même arbre ; la signature suit la disposition', () => {
    const { donnees, moi } = demo();
    const disp = disposerArbre(donnees, moi);
    const dec = chercherDecalages(donnees, disp, moi);
    const garde = JSON.parse(JSON.stringify(dec)) as typeof dec;
    expect(assouplir(disposerArbre(donnees, moi), moi, garde)).toEqual(assouplir(disp, moi, dec));
    expect(signature(disposerArbre(donnees, moi), moi)).toBe(signature(disp, moi));
    expect(signature(disposerArbre(demo(true).donnees, moi), moi)).not.toBe(signature(disp, moi));
    expect(signature(disp, 'p1')).not.toBe(signature(disp, moi));
  });

  it('la bulle des amis descend d’autant que la famille s’allonge', () => {
    const { donnees, moi } = demo();
    donnees.personnes.push({
      ...donnees.personnes.find((p) => p.id === 's1')!,
      id: 'ami',
      prenom: 'Hector',
      nom: 'Marchal',
      naissance: '1982-03-02',
      nomNaissance: undefined,
    });
    donnees.groupes.push({ id: 'g', nom: 'Lycée', membres: ['moi', 'ami'] });
    const disp = disposerArbre(donnees, moi);
    expect(disp.places.find((p) => p.personne.id === 'ami')?.bulle).toBe(true);
    const souple = assouplir(disp, moi, chercherDecalages(donnees, disp, moi));
    // Les cousins montent d'un sous-niveau : la génération de Moi, la dernière, descend d'autant, et la bulle avec elle.
    const descente = ligne(souple, 'moi') - ligne(disp, 'moi');
    expect(descente).toBeGreaterThan(0);
    expect(ligne(souple, 'ami') - ligne(disp, 'ami')).toBeCloseTo(descente);
  });
});
