import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aDuMonde, disposerFoyer, familleProche, type DispositionFoyer } from './familleProche';
import type { Donnees, Personne, StatutUnion, TypeFiliation } from './types';

const fixture = (nom: string): Donnees => JSON.parse(readFileSync(`tests/fixtures/famille-proche/${nom}.json`, 'utf8'));

/** Petite famille d'emprunt : `p('a', 1980)`, `union('a', 'b', 'actuelle')`, `enfant(['a', 'b'], 'c')`. */
function famille() {
  const d: Donnees = { version: 6, personnes: [], unions: [], filiations: [], groupes: [] };
  const f = {
    d,
    p(id: string, naissance = '1980', plus: Partial<Personne> = {}) {
      d.personnes.push({ id, prenom: id[0].toUpperCase() + id.slice(1), nom: 'Martin', naissance, note: '', ...plus });
      return f;
    },
    union(a: string, b: string, statut: StatutUnion) {
      d.unions.push({ id: `u${d.unions.length}`, personneA: a, personneB: b, marie: false, statut });
      return f;
    },
    enfant(parents: string[], enfant: string, type: TypeFiliation = 'biologique') {
      for (const parent of parents) d.filiations.push({ id: `f${d.filiations.length}`, parent, enfant, type });
      return f;
    },
  };
  return f;
}

const noeud = (dis: DispositionFoyer, id: string) => dis.noeuds.find((n) => n.id === id);
/** Trait horizontal au niveau de deux nœuds (une union). */
const unionEntre = (dis: DispositionFoyer, a: string, b: string) => {
  const A = noeud(dis, a)!;
  const B = noeud(dis, b)!;
  const [g, d] = A.x < B.x ? [A, B] : [B, A];
  return dis.traits.find((t) => t.d === `M${g.x + g.rayon + 4} ${g.y}H${d.x - d.rayon - 4}`);
};

describe('familleProche : qui dessiner', () => {
  it('dessine les parents, la fratrie, le conjoint et les enfants', () => {
    const f = familleProche(fixture('01-simple'), 'centre', 'centre');
    expect(f.couples).toEqual([{ membres: ['pere', 'mere'], adoptif: false, statut: 'actuelle', manque: false }]);
    expect(f.freres.map((x) => x.id)).toEqual(['lea', 'tom']);
    expect(aDuMonde(f)).toBe(true);
  });

  it('propose « + Parent » à la famille seulement', () => {
    const d = famille().p('mere', '1970').p('centre', '2000').p('ami', '2000').enfant(['mere'], 'centre').d;
    expect(familleProche(d, 'centre', 'centre').couples[0].manque).toBe(true);
    expect(familleProche(d, 'centre', 'ami').couples[0].manque).toBe(false);
    const seul = famille().p('centre').d;
    expect(familleProche(seul, 'centre').couples).toEqual([{ membres: [], adoptif: false, statut: null, manque: true }]);
    expect(aDuMonde(familleProche(seul, 'centre'))).toBe(false);
  });

  it('ne dessine pas le nouveau conjoint d’un parent sans enfant avec lui (cas 18)', () => {
    const d = famille()
      .p('pere', '1960')
      .p('mere', '1962')
      .p('nouvelle', '1965')
      .p('centre', '1990')
      .union('pere', 'mere', 'separee')
      .union('pere', 'nouvelle', 'actuelle')
      .enfant(['pere', 'mere'], 'centre').d;
    const f = familleProche(d, 'centre');
    expect(f.autresCouples).toEqual([]);
    expect(noeud(disposerFoyer(f, 360), 'nouvelle')).toBeUndefined();
  });

  it('ne dessine pas les enfants qu’un ex d’un parent a eus avec quelqu’un d’autre (cas 09)', () => {
    const ids = disposerFoyer(familleProche(fixture('09-ex-d-un-parent'), 'centre'), 360).noeuds.map((n) => n.id);
    expect(ids).toContain('d1');
    expect(ids).not.toContain('x1');
    expect(ids).not.toContain('y1');
    expect(ids).not.toContain('tierce1');
  });

  it('range les demis par couple, l’union actuelle d’abord', () => {
    const f = familleProche(fixture('06-recomposee-deux-cotes'), 'centre');
    expect(f.autresCouples[0]).toMatchObject({ parent: 'pere', autre: 'conjp', statut: 'actuelle' });
    expect(f.autresCouples.map((a) => a.autre).sort()).toEqual(['conjp', 'exm1', 'exm2', 'exp']);
  });
});

describe('disposerFoyer : où dessiner', () => {
  it('relie un couple sans union enregistrée en pointillé droit, comme un couple séparé', () => {
    const dis = disposerFoyer(familleProche(fixture('07-parents-sans-union'), 'centre'), 360);
    expect(unionEntre(dis, 'pere', 'mere')?.pointille).toBe(true);
  });

  it('garde un trait plein avec un conjoint décédé', () => {
    const d = famille().p('centre', '1950').p('conj', '1948', { deces: '2020' }).union('centre', 'conj', 'actuelle').enfant(['centre', 'conj'], 'k1').d;
    d.personnes.push({ id: 'k1', prenom: 'Kim', nom: 'Martin', naissance: '1980', note: '' });
    const dis = disposerFoyer(familleProche(d, 'centre'), 360);
    expect(unionEntre(dis, 'centre', 'conj')?.pointille).toBe(false);
  });

  it('met l’ex co-parent du côté opposé au conjoint (cas 10)', () => {
    const dis = disposerFoyer(familleProche(fixture('10-conjoint-ex-enfants'), 'centre'), 390);
    const x = (id: string) => noeud(dis, id)!.x;
    expect(x('conj')).toBeLessThan(x('centre'));
    expect(x('ex')).toBeGreaterThan(x('centre'));
    expect(x('aut')).toBeGreaterThan(x('centre'));
  });

  it('sans conjoint, met le co-parent le plus récent à gauche et les autres à droite (cas 21)', () => {
    const f = familleProche(fixture('21-deux-ex-sans-conjoint'), 'centre');
    const dis = disposerFoyer(f, 390);
    const [recent, ...autres] = f.partenaires;
    expect(noeud(dis, recent.id)!.x).toBeLessThan(noeud(dis, 'centre')!.x);
    for (const p of autres) expect(noeud(dis, p.id)!.x).toBeGreaterThan(noeud(dis, 'centre')!.x);
  });

  it('replie une grande fratrie au lieu de défiler (cas 04)', () => {
    const dis = disposerFoyer(familleProche(fixture('04-famille-nombreuse'), 'centre'), 360);
    expect(dis.defile).toBe(false);
    expect(dis.largeur).toBeLessThanOrEqual(360);
    expect(new Set(dis.noeuds.filter((n) => n.id.startsWith('f')).map((n) => n.y)).size).toBeGreaterThan(1);
  });

  it('garde l’ordre des âges de haut en bas quand la fratrie se replie (cas 04)', () => {
    const f = familleProche(fixture('04-famille-nombreuse'), 'centre');
    for (const budget of [254, 294]) {
      const dis = disposerFoyer(f, budget);
      const freres = f.freres.map((x) => dis.noeuds.find((n) => n.id === x.id)!);
      const lecture = [...freres].sort((a, b) => a.y - b.y || a.x - b.x).map((n) => n.id);
      expect(lecture).toEqual(f.freres.map((x) => x.id));
      // Lignes égalisées : pas de frère seul sur une ligne au-dessus d'une ligne pleine.
      const parLigne = [...new Set(freres.map((n) => n.y))].map((y) => freres.filter((n) => n.y === y).length);
      expect(Math.max(...parLigne.slice(0, -1)) - Math.min(...parLigne.slice(0, -1))).toBeLessThanOrEqual(1);
    }
  });

  it('défile seulement quand la rangée des parents ne tient pas', () => {
    const f = famille().p('pere', '1950').p('mere', '1952').p('centre', '1980').union('pere', 'mere', 'actuelle').enfant(['pere', 'mere'], 'centre');
    for (const ex of ['ex1', 'ex2', 'ex3']) f.p(ex, '1950').union('pere', ex, 'separee').p(`d${ex}`, '1975').enfant(['pere', ex], `d${ex}`);
    expect(disposerFoyer(familleProche(f.d, 'centre'), 360).defile).toBe(false);
    f.p('ex4', '1950').union('pere', 'ex4', 'separee').p('dex4', '1975').enfant(['pere', 'ex4'], 'dex4');
    const dis = disposerFoyer(familleProche(f.d, 'centre'), 320);
    expect(dis.defile).toBe(true);
    expect(dis.largeur).toBeGreaterThan(320);
  });

  it('dessine un nom long sur deux lignes au plus, et la personne en grand', () => {
    const dis = disposerFoyer(familleProche(fixture('15-noms-longs'), 'centre'), 360);
    for (const n of dis.noeuds) expect(n.lignes).toBeLessThanOrEqual(2);
    expect(noeud(dis, 'centre')!.rayon).toBeGreaterThan(dis.noeuds.find((n) => !n.ici)!.rayon);
  });

  it('relie une fratrie sans parent dessiné par son seul trait', () => {
    const d = famille().p('centre', '1990').p('soeur', '1992').p('inc', '1960', { inconnu: true }).enfant(['inc'], 'centre').enfant(['inc'], 'soeur').d;
    const dis = disposerFoyer(familleProche(d, 'centre'), 360);
    expect(noeud(dis, 'inc')).toBeUndefined();
    expect(noeud(dis, 'soeur')).toBeDefined();
    expect(dis.traits.length).toBeGreaterThan(0);
  });
});
