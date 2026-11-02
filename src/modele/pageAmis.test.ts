// Export PNG d'un groupe d'amis au format d'une feuille paysage, sur la fixture anonymisée : format exact, Moi dans
// le cadre, familles intactes coupées en lignes, et rien de changé pour les autres exports.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculerCadres, MARGE, positions, R, traitsArbre, zoneBulle } from '../ui/geometrieArbre';
import { dimensionsArbre, pageAmis } from '../ui/arbreImage';
import { ID_MOI } from './anonymiser';
import { disposerArbre, type Disposition } from './arbreGlobal';
import { garderCible } from './cibleImage';
import { enLignes, FORMAT_FEUILLE } from './pageAmis';
import type { Donnees } from './types';

const donnees: Donnees = JSON.parse(readFileSync(new URL('./fixtures/arbre-anonyme.json', import.meta.url), 'utf-8'));
const [petit, grand] = [...donnees.groupes].sort((a, b) => a.membres.length - b.membres.length);
const avant = (groupe: string) => disposerArbre(donnees, ID_MOI, garderCible(donnees, ID_MOI, 'groupe', groupe));
const lieu = (disp: Disposition, id: string) => disp.places.find((p) => p.personne.id === id)!;
const rangees = (disp: Disposition) => new Set(disp.places.map((p) => p.y.toFixed(6))).size;

describe('export d’un groupe d’amis au format A4 / A3 paysage', () => {
  it('donne une image au format de la feuille, pour un petit comme pour un grand groupe', () => {
    for (const g of [petit, grand]) {
      const dim = dimensionsArbre(pageAmis(avant(g.id), ID_MOI));
      expect(dim.pixelsL / dim.pixelsH).toBeCloseTo(FORMAT_FEUILLE, 2);
      expect(dim.possible).toBe(true);
    }
  });

  it('petit groupe : Moi et sa famille proche sont dans le cadre, sans pointillé vers la bulle', () => {
    const av = avant(petit.id);
    const disp = pageAmis(av, ID_MOI);
    const famille = av.places.filter((p) => !p.bulle).map((p) => p.personne.id);
    expect(famille.length).toBeGreaterThan(1);
    expect(disp.places.every((p) => p.bulle)).toBe(true);
    expect(disp.groupes[0].ids).toEqual(expect.arrayContaining(famille));
    expect(disp.groupes[0].membres).not.toContain(ID_MOI);
    const pos = positions(disp);
    const cadres = calculerCadres(disp, pos.centres);
    const traits = traitsArbre(disp, pos, zoneBulle(disp, pos.centres, cadres), ID_MOI);
    expect(traits.filter((t) => t.classe === 'trait ami')).toHaveLength(disp.amities.length);
    // L'en-tête de la bulle tient dans l'image, à la marge habituelle.
    expect(zoneBulle(disp, pos.centres, cadres)!.ha).toBeCloseTo(MARGE, 6);
  });

  it('grand groupe : plusieurs lignes, chaque famille gardée d’un seul tenant et sans chevauchement', () => {
    const av = avant(grand.id);
    const disp = pageAmis(av, ID_MOI);
    expect(rangees(disp)).toBeGreaterThan(rangees(av));
    expect(disp.places.map((p) => p.personne.id).sort()).toEqual(av.places.map((p) => p.personne.id).sort());
    // Un couple garde son écart ; une branche garde ses enfants à la même place sous le trait commun.
    for (const c of disp.couples) {
      const [a, b, a0, b0] = [lieu(disp, c.a), lieu(disp, c.b), lieu(av, c.a), lieu(av, c.b)];
      expect([b.x - a.x, b.y - a.y]).toEqual([b0.x - a0.x, b0.y - a0.y].map((v) => expect.closeTo(v, 6)));
    }
    disp.branches.forEach((br, i) => br.enfants.forEach((e, j) => expect(e.y - br.bus).toBeCloseTo(av.branches[i].enfants[j].y - av.branches[i].bus, 6)));
    for (const [i, p] of disp.places.entries())
      for (const q of disp.places.slice(i + 1)) if (Math.abs(p.y - q.y) < 0.5) expect(Math.abs(p.x - q.x)).toBeGreaterThanOrEqual(1 - 1e-6);
  });

  it('en une seule ligne, la famille de Moi ouvre la bande, Moi à la hauteur de ses amis', () => {
    const av = avant(grand.id);
    const disp = enLignes(av, ID_MOI, 1);
    const famille = new Set(av.places.filter((p) => !p.bulle).map((p) => p.personne.id));
    const [deMoi, autres] = [disp.places.filter((p) => famille.has(p.personne.id)), disp.places.filter((p) => !famille.has(p.personne.id))];
    expect(Math.max(...deMoi.map((p) => p.x))).toBeLessThan(Math.min(...autres.map((p) => p.x)));
    const amis = autres.filter((p) => disp.groupes[0].membres.includes(p.personne.id));
    expect(lieu(disp, ID_MOI).y).toBeCloseTo(Math.min(...amis.map((p) => p.y)), 6);
  });

  it('les autres exports gardent leur taille : ni format, ni place en plus en haut', () => {
    const tout = disposerArbre(donnees, ID_MOI);
    expect(tout.format).toBeUndefined();
    const pos = positions(tout);
    expect(Math.min(...[...pos.centres.values()].map((c) => c.y))).toBe(MARGE + R);
    expect(dimensionsArbre(tout).largeur).toBe(pos.largeur);
  });
});
