// Arbre global sur un vrai arbre anonymisé (ARCH-05) : invariants de la disposition et instantané des places.
// La fixture se régénère avec `npm run anonymiser -- <export.json> <Moi>` (voir scripts/anonymiser.mjs).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID_MOI } from './anonymiser';
import { disposerArbre } from './arbreGlobal';
import type { Donnees } from './types';

const donnees: Donnees = JSON.parse(readFileSync(new URL('./fixtures/arbre-anonyme.json', import.meta.url), 'utf-8'));
const disposition = disposerArbre(donnees, ID_MOI);
const EPS = 1e-6;
const xDe = new Map(disposition.places.map((p) => [p.personne.id, p]));
const memeLigne = (a: number, b: number) => Math.abs(a - b) < EPS;

describe('arbre global sur la fixture anonymisée', () => {
  it('place Moi et au moins une autre personne', () => {
    expect(xDe.get(ID_MOI)).toMatchObject({ x: 0, y: 0 });
    expect(disposition.places.length).toBeGreaterThan(1);
  });

  it('aucun chevauchement : deux personnes d’une même ligne sont à une place au moins', () => {
    const trop: string[] = [];
    for (const p of disposition.places) {
      for (const q of disposition.places) {
        if (p !== q && memeLigne(p.y, q.y) && Math.abs(p.x - q.x) < 1 - EPS) trop.push(`${p.personne.id} / ${q.personne.id}`);
      }
    }
    expect(trop).toEqual([]);
  });

  it('couples adjacents : un couple actuel est sur la même ligne, sans personne entre eux', () => {
    const fautes = disposition.couples
      .filter((c) => !c.separe)
      .flatMap((c) => {
        const [a, b] = [xDe.get(c.a), xDe.get(c.b)];
        if (!a || !b) return [];
        if (!memeLigne(a.y, b.y)) return [`${c.a} / ${c.b} : lignes ${a.y} et ${b.y}`];
        const [lo, hi] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
        const entre = disposition.places.filter((p) => memeLigne(p.y, a.y) && p.x > lo + EPS && p.x < hi - EPS);
        return entre.length > 0 ? [`${c.a} / ${c.b} : ${entre.map((p) => p.personne.id).join(', ')} entre eux`] : [];
      });
    expect(fautes).toEqual([]);
  });

  it('enfant unique centré : seul enfant d’un couple sans autre lien, exactement sous le milieu de ses parents', () => {
    const dansGroupe = new Set(donnees.groupes.flatMap((g) => g.membres));
    const nbCouples = (id: string) => disposition.couples.filter((c) => c.a === id || c.b === id).length;
    const enfantsDe = (id: string) => new Set(donnees.filiations.filter((f) => f.parent === id).map((f) => f.enfant));
    const fautes: string[] = [];
    let vus = 0;
    for (const enfant of disposition.places) {
      const id = enfant.personne.id;
      const parents = donnees.filiations.filter((f) => f.enfant === id).map((f) => f.parent);
      if (parents.length !== 2 || nbCouples(id) > 0 || dansGroupe.has(id)) continue;
      const [u, v] = parents.map((p) => xDe.get(p));
      if (!u || !v || !memeLigne(u.y, v.y) || Math.abs(u.x - v.x) > 1 + EPS) continue;
      if (parents.some((p) => nbCouples(p) !== 1 || dansGroupe.has(p) || enfantsDe(p).size !== 1)) continue;
      vus++;
      const milieu = (u.x + v.x) / 2;
      if (Math.abs(enfant.x - milieu) > EPS) fautes.push(`${id} : x = ${enfant.x.toFixed(3)}, milieu des parents ${milieu.toFixed(3)}`);
    }
    expect(fautes).toEqual([]);
    expect(vus).toBeGreaterThan(0);
  });

  it('instantané des places (abscisses et lignes arrondies au centième)', () => {
    const arrondi = (v: number) => (Math.round(v * 100) / 100 || 0).toFixed(2);
    expect(disposition.places.map((p) => `${p.personne.prenom} ${p.personne.nom} (${p.personne.id}) : ${arrondi(p.x)}, ${arrondi(p.y)}`)).toMatchSnapshot();
  });
});
