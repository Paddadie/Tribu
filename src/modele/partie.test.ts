import { describe, expect, it } from 'vitest';
import { chaine, disposerPartie, ECART_BLOCS, generations, Lignes, parentesDansPartie, regrouperEnBlocs } from './partie';
import type { Personne } from './types';

const gens = (...specs: [string, string?, Personne['sexe']?][]) =>
  new Map(
    specs.map(([id, naissance, sexe]): [string, Personne] => [
      id,
      { id, prenom: id, nom: 'X', note: '', ...(naissance ? { naissance } : {}), ...(sexe ? { sexe } : {}) },
    ]),
  );
/** Parents de chaque enfant, à partir de couples « parent>enfant ». */
const parentsDe = (...liens: string[]) => {
  const m = new Map<string, string[]>();
  for (const l of liens) {
    const [p, e] = l.split('>');
    m.set(e, [...(m.get(e) ?? []), p]);
  }
  return m;
};

describe('étapes de disposerPartie', () => {
  it('regrouperEnBlocs : une composante par bloc, membres dans l’ordre des ids', () => {
    const { chefDe, membresDe } = regrouperEnBlocs(
      ['a', 'b', 'c', 'd'],
      [
        ['c', 'a'],
        ['b', 'c'],
      ],
    );
    expect([...membresDe.values()]).toEqual([['a', 'b', 'c'], ['d']]);
    expect(new Set(['a', 'b', 'c'].map((id) => chefDe.get(id))).size).toBe(1);
  });

  it('generations : un parent une ligne au-dessus, la première génération trouvée l’emporte, adoptifs compris', () => {
    const ids = ['moi', 'pere', 'fils', 'adopte'];
    const { chefDe, membresDe } = regrouperEnBlocs(ids, []);
    const liens = parentesDansPartie(ids, new Map(), parentsDe('pere>moi', 'moi>fils', 'moi>adopte', 'pere>fils'));
    const { gen, ordre } = generations(['moi', ...ids], chefDe, membresDe, liens);
    expect(Object.fromEntries(ids.map((id) => [id, gen.get(chefDe.get(id)!)]))).toEqual({ moi: 0, pere: -1, fils: 1, adopte: 1 });
    expect(ordre[0]).toBe('moi');
  });

  it('chaine : ex – personne – conjoint, la personne au milieu', () => {
    const p = gens(['moi', '1980'], ['ex', '1979'], ['conj', '1982']);
    const ordre = chaine(
      ['moi', 'ex', 'conj'],
      [
        ['moi', 'conj'],
        ['moi', 'ex'],
      ],
      (id) => p.get(id)!,
    );
    expect(ordre[1]).toBe('moi');
    expect(ordre).toEqual(['ex', 'moi', 'conj']);
  });

  it('Lignes.ordonner : sous les mêmes parents, l’aîné à gauche ; homme à gauche dans un couple sans indice', () => {
    const p = gens(['pere', '1950', 'M'], ['mere', '1952', 'F'], ['cadet', '1990'], ['aine', '1985']);
    const ids = ['mere', 'pere', 'cadet', 'aine'];
    const liensBloc: [string, string][] = [['mere', 'pere']];
    const { chefDe, membresDe } = regrouperEnBlocs(ids, liensBloc);
    const filiations = parentsDe('pere>cadet', 'mere>cadet', 'pere>aine', 'mere>aine');
    const liens = parentesDansPartie(ids, filiations, filiations);
    const { gen, ordre } = generations(ids, chefDe, membresDe, liens);
    const lignes = new Lignes(ordre, gen, membresDe, liensBloc, (id) => p.get(id)!, liens);
    lignes.ordonner();
    expect(lignes.lignes.get(1)!.map((b) => b.membres[0])).toEqual(['aine', 'cadet']);
    expect(lignes.lignes.get(0)![0].membres).toEqual(['pere', 'mere']);
  });

  it('enfant unique au milieu de ses parents ; une fratrie centrée sous eux, écart minimal gardé', () => {
    const p = gens(['pere', '1950', 'M'], ['mere', '1952', 'F'], ['seul', '1980'], ['a', '1981'], ['b', '1983'], ['c', '1985']);
    const seul = parentsDe('pere>seul', 'mere>seul');
    const unique = disposerPartie({ ids: ['pere', 'mere', 'seul'], racines: ['pere'], liensBloc: [['pere', 'mere']] }, p, seul, seul);
    const x = (id: string) => unique.positions.get(id)!.x;
    expect(x('seul')).toBeCloseTo((x('pere') + x('mere')) / 2, 9);

    const enfants = ['a', 'b', 'c'];
    const liens = parentsDe(...enfants.flatMap((e) => [`pere>${e}`, `mere>${e}`]));
    const fratrie = disposerPartie({ ids: ['pere', 'mere', ...enfants], racines: ['pere'], liensBloc: [['pere', 'mere']] }, p, liens, liens);
    const xs = enfants.map((e) => fratrie.positions.get(e)!.x);
    const [xp, xm] = ['pere', 'mere'].map((id) => fratrie.positions.get(id)!.x);
    expect((xs[0] + xs[2]) / 2).toBeCloseTo((xp + xm) / 2, 9);
    expect(xs[1] - xs[0]).toBeCloseTo(ECART_BLOCS, 9);
  });
});
