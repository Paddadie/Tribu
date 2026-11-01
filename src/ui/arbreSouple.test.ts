// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { disposerArbre } from '../modele/arbreGlobal';
import { assouplir, signature } from '../modele/souple';
import { chercherDecalages } from '../modele/soupleRecherche';
import { demo } from '../modele/test/demoSouple';
import { arbreSouple } from './arbreSouple';
import { boiteEtiquette, LARG, lieuxEtiquettes, positions, R, SOUS_NOM, traitsArbre } from './geometrieArbre';

describe('arbre souple de l’écran', () => {
  beforeEach(() => localStorage.clear());

  it('sans décalages gardés ni Worker : l’arbre d’avant, et rien n’arrive ensuite', async () => {
    const { donnees, moi } = demo();
    let pret = false;
    expect(arbreSouple(donnees, moi, undefined, () => (pret = true))).toEqual(disposerArbre(donnees, moi));
    await new Promise((r) => setTimeout(r, 20));
    expect(pret).toBe(false);
  });

  it('décalages gardés pour cette disposition : l’arbre souple tout de suite', () => {
    const { donnees, moi } = demo();
    const disp = disposerArbre(donnees, moi);
    const dec = chercherDecalages(donnees, disp, moi);
    localStorage.setItem(
      'tribu:souple',
      JSON.stringify([
        ['autre', { d: [[0, 1]], h: [] }],
        [signature(disp, moi), dec],
      ]),
    );
    expect(arbreSouple(donnees, moi)).toEqual(assouplir(disp, moi, dec));
  });

  it('noms de famille de l’arbre souple : ni trait droit ni personne dessous', () => {
    const { donnees, moi } = demo();
    const base = disposerArbre(donnees, moi);
    const disp = assouplir(base, moi, chercherDecalages(donnees, base, moi));
    const pos = positions(disp);
    const traits = traitsArbre(disp, pos, undefined, moi);
    const lieux = lieuxEtiquettes(disp, pos, traits);
    const segments = traits.flatMap((t) => {
      const m = /^M (\S+) (\S+) ([VH]) (\S+)$/.exec(t.d);
      if (!m) return [];
      const [a, b, c] = [+m[1], +m[2], +m[4]];
      return [m[3] === 'V' ? { g: a, d: a, h: Math.min(b, c), b: Math.max(b, c) } : { g: Math.min(a, c), d: Math.max(a, c), h: b, b }];
    });
    const cartes = [...pos.centres.values()].map((c) => ({ g: c.x - LARG / 2, d: c.x + LARG / 2, h: c.y - R, b: c.y + SOUS_NOM }));
    expect(disp.etiquettes.length).toBeGreaterThan(0);
    for (const e of disp.etiquettes) {
      const n = boiteEtiquette(disp, pos.px, e, lieux.get(e));
      const touche = (o: { g: number; d: number; h: number; b: number }) => o.g < n.d && o.d > n.g && o.h < n.b && o.b > n.h;
      expect(segments.some(touche) || cartes.some(touche), e.texte).toBe(false);
    }
  });

  it('cache illisible : l’arbre d’avant', () => {
    const { donnees, moi } = demo();
    localStorage.setItem('tribu:souple', '{pas du json');
    expect(arbreSouple(donnees, moi)).toEqual(disposerArbre(donnees, moi));
  });
});
