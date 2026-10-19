import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { conjoint, exConjoints, foyer } from './deductions';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele';
import { estDonneesValides } from './stockage';
import type { Donnees } from './types';

/** Catherine : Michel B (ex) → Thomas, Alexandre ; Michel D (actuel) → Paul. */
function famille() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  for (const [prenom, sexe] of [['MichelB', 'M'], ['Catherine', 'F'], ['MichelD', 'M'], ['Thomas', 'M'], ['Alexandre', 'M'], ['Paul', 'M']] as const) {
    const r = creerPersonne(d, { prenom, nom: 'X', sexe, naissance: prenom === 'Paul' ? '1996' : '1990' });
    d = r.donnees;
    id[prenom] = r.personne.id;
  }
  d = ajouterUnion(d, id.Catherine, id.MichelD).donnees;
  d = ajouterUnion(d, id.Catherine, id.MichelB, false, 'separee').donnees;
  for (const e of ['Thomas', 'Alexandre']) for (const p of ['MichelB', 'Catherine']) d = ajouterFiliation(d, id[p], id[e], 'biologique').donnees;
  for (const p of ['MichelD', 'Catherine']) d = ajouterFiliation(d, id[p], id.Paul, 'biologique').donnees;
  return { d, id };
}

describe('Famille recomposée : un ex en plus du conjoint actuel', () => {
  it('accepte un ex pour une personne déjà en couple, mais pas un second conjoint actuel', () => {
    const { d, id } = famille();
    expect(conjoint(d, id.Catherine)?.personne.id).toBe(id.MichelD);
    expect(exConjoints(d, id.Catherine).map((e) => e.personne.id)).toEqual([id.MichelB]);
    const r = creerPersonne(d, { prenom: 'Autre', nom: 'X' });
    expect(() => ajouterUnion(r.donnees, id.Catherine, r.personne.id)).toThrow('un seul conjoint');
    expect(estDonneesValides(JSON.parse(JSON.stringify(d)))).toBe(true);
  });

  it('refuse un doublon d’union, même pour un ex', () => {
    const { d, id } = famille();
    expect(() => ajouterUnion(d, id.MichelB, id.Catherine, false, 'separee')).toThrow('déjà une union');
  });

  it('aligne ex – Catherine – conjoint actuel, chaque enfant centré sous son couple', () => {
    const { d, id } = famille();
    const disp = disposerArbre(d, id.Paul);
    const x = (nom: string) => disp.places.find((p) => p.personne.id === id[nom])!.x;
    const y = (nom: string) => disp.places.find((p) => p.personne.id === id[nom])!.y;
    expect(Math.abs(x('Catherine') - x('MichelB'))).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(Math.abs(x('Catherine') - x('MichelD'))).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(Math.sign(x('MichelB') - x('Catherine'))).toBe(-Math.sign(x('MichelD') - x('Catherine')));
    expect(disp.couples.find((c) => [c.a, c.b].includes(id.MichelB))?.separe).toBe(true);
    // Une seule branche par couple, partant du milieu du couple.
    expect(disp.branches).toHaveLength(2);
    const milieuEx = (x('MichelB') + x('Catherine')) / 2;
    const milieuActuel = (x('MichelD') + x('Catherine')) / 2;
    const brancheEx = disp.branches.find((b) => b.enfants.some((e) => e.id === id.Thomas))!;
    const branchePaul = disp.branches.find((b) => b.enfants.some((e) => e.id === id.Paul))!;
    expect(brancheEx.origines).toHaveLength(1);
    expect(brancheEx.origines[0].x).toBeCloseTo(milieuEx);
    expect(brancheEx.enfants.map((e) => e.id).sort()).toEqual([id.Thomas, id.Alexandre].sort());
    expect(branchePaul.origines[0].x).toBeCloseTo(milieuActuel);
    expect(branchePaul.enfants).toHaveLength(1);
    expect(x('Paul')).toBeCloseTo(milieuActuel);
    expect(y('Thomas')).toBe(y('Paul'));
  });

  it('relie en pointillés deux parents sans union enregistrée, et garde l’état marié', () => {
    const { d, id } = famille();
    const sansUnion = { ...d, unions: d.unions.filter((u) => ![u.personneA, u.personneB].includes(id.MichelB)) };
    const couples = disposerArbre(sansUnion, id.Paul).couples;
    expect(couples.find((c) => [c.a, c.b].includes(id.MichelB))).toMatchObject({ separe: true, marie: false });
    expect(couples.filter((c) => [c.a, c.b].includes(id.MichelB))).toHaveLength(1);
    const marie = { ...d, unions: d.unions.map((u) => (u.personneA === id.Catherine || u.personneB === id.Catherine ? { ...u, marie: true } : u)) };
    expect(disposerArbre(marie, id.Paul).couples.some((c) => c.marie)).toBe(true);
  });

  it('un couple prend la couleur de celui des deux qui est le plus proche de Moi', () => {
    const { d, id } = famille();
    const f = creerPersonne(d, { prenom: 'Fille', nom: 'Autre', sexe: 'F', naissance: '1992' });
    const d2 = ajouterUnion(f.donnees, id.Thomas, f.personne.id).donnees;
    const disp = disposerArbre(d2, id.Paul);
    const couple = disp.couples.find((c) => [c.a, c.b].includes(f.personne.id))!;
    const lignee = (nom: string) => disp.places.find((p) => p.personne.id === id[nom])!.lignee;
    expect(couple.lignee).toBe(lignee('Thomas'));
  });

  it('foyer : parents séparés signalés, pas pour des parents sans union ou en couple', () => {
    const { d, id } = famille();
    expect(foyer(d, id.Thomas).parentsSepares).toBe(true);
    expect(foyer(d, id.Paul).parentsSepares).toBe(false);
  });
});
