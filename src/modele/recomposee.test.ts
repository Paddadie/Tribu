import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { conjoint, exConjoints } from './deductions';
import { familleProche } from './familleProche';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele';
import { estDonneesValides } from './stockage';
import type { Donnees } from './types';

/** Isabelle : Alain B (ex) → Nicolas, Julien ; Alain D (actuel) → Antoine. */
function famille() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  for (const [prenom, sexe] of [['AlainB', 'M'], ['Isabelle', 'F'], ['AlainD', 'M'], ['Nicolas', 'M'], ['Julien', 'M'], ['Antoine', 'M']] as const) {
    const r = creerPersonne(d, { prenom, nom: 'X', sexe, naissance: prenom === 'Antoine' ? '1996' : '1990' });
    d = r.donnees;
    id[prenom] = r.personne.id;
  }
  d = ajouterUnion(d, id.Isabelle, id.AlainD).donnees;
  d = ajouterUnion(d, id.Isabelle, id.AlainB, false, 'separee').donnees;
  for (const e of ['Nicolas', 'Julien']) for (const p of ['AlainB', 'Isabelle']) d = ajouterFiliation(d, id[p], id[e], 'biologique').donnees;
  for (const p of ['AlainD', 'Isabelle']) d = ajouterFiliation(d, id[p], id.Antoine, 'biologique').donnees;
  return { d, id };
}

describe('Famille recomposée : un ex en plus du conjoint actuel', () => {
  it('accepte un ex pour une personne déjà en couple, mais pas un second conjoint actuel', () => {
    const { d, id } = famille();
    expect(conjoint(d, id.Isabelle)?.personne.id).toBe(id.AlainD);
    expect(exConjoints(d, id.Isabelle).map((e) => e.personne.id)).toEqual([id.AlainB]);
    const r = creerPersonne(d, { prenom: 'Autre', nom: 'X' });
    expect(() => ajouterUnion(r.donnees, id.Isabelle, r.personne.id)).toThrow('un seul conjoint');
    expect(estDonneesValides(JSON.parse(JSON.stringify(d)))).toBe(true);
  });

  it('refuse un doublon d’union, même pour un ex', () => {
    const { d, id } = famille();
    expect(() => ajouterUnion(d, id.AlainB, id.Isabelle, false, 'separee')).toThrow('déjà une union');
  });

  it('aligne ex – Isabelle – conjoint actuel, chaque enfant centré sous son couple', () => {
    const { d, id } = famille();
    const disp = disposerArbre(d, id.Antoine);
    const x = (nom: string) => disp.places.find((p) => p.personne.id === id[nom])!.x;
    const y = (nom: string) => disp.places.find((p) => p.personne.id === id[nom])!.y;
    expect(Math.abs(x('Isabelle') - x('AlainB'))).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(Math.abs(x('Isabelle') - x('AlainD'))).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(Math.sign(x('AlainB') - x('Isabelle'))).toBe(-Math.sign(x('AlainD') - x('Isabelle')));
    expect(disp.couples.find((c) => [c.a, c.b].includes(id.AlainB))?.separe).toBe(true);
    // Une seule branche par couple, partant du milieu du couple.
    expect(disp.branches).toHaveLength(2);
    const milieuEx = (x('AlainB') + x('Isabelle')) / 2;
    const milieuActuel = (x('AlainD') + x('Isabelle')) / 2;
    const brancheEx = disp.branches.find((b) => b.enfants.some((e) => e.id === id.Nicolas))!;
    const branchePaul = disp.branches.find((b) => b.enfants.some((e) => e.id === id.Antoine))!;
    expect(brancheEx.origines).toHaveLength(1);
    expect(brancheEx.origines[0].x).toBeCloseTo(milieuEx);
    expect(brancheEx.enfants.map((e) => e.id).sort()).toEqual([id.Nicolas, id.Julien].sort());
    expect(branchePaul.origines[0].x).toBeCloseTo(milieuActuel);
    expect(branchePaul.enfants).toHaveLength(1);
    expect(x('Antoine')).toBeCloseTo(milieuActuel);
    expect(y('Nicolas')).toBe(y('Antoine'));
  });

  it('relie en pointillés deux parents sans union enregistrée, et garde l’état marié', () => {
    const { d, id } = famille();
    const sansUnion = { ...d, unions: d.unions.filter((u) => ![u.personneA, u.personneB].includes(id.AlainB)) };
    const couples = disposerArbre(sansUnion, id.Antoine).couples;
    expect(couples.find((c) => [c.a, c.b].includes(id.AlainB))).toMatchObject({ separe: true, marie: false });
    expect(couples.filter((c) => [c.a, c.b].includes(id.AlainB))).toHaveLength(1);
    const marie = { ...d, unions: d.unions.map((u) => (u.personneA === id.Isabelle || u.personneB === id.Isabelle ? { ...u, marie: true } : u)) };
    expect(disposerArbre(marie, id.Antoine).couples.some((c) => c.marie)).toBe(true);
  });

  it('un couple prend la couleur de celui des deux qui est le plus proche de Moi', () => {
    const { d, id } = famille();
    const f = creerPersonne(d, { prenom: 'Fille', nom: 'Autre', sexe: 'F', naissance: '1992' });
    const d2 = ajouterUnion(f.donnees, id.Nicolas, f.personne.id).donnees;
    const disp = disposerArbre(d2, id.Antoine);
    const couple = disp.couples.find((c) => [c.a, c.b].includes(f.personne.id))!;
    const lignee = (nom: string) => disp.places.find((p) => p.personne.id === id[nom])!.lignee;
    expect(couple.lignee).toBe(lignee('Nicolas'));
  });

  it('famille proche : statut de l’union des parents (séparés, ou non)', () => {
    const { d, id } = famille();
    expect(familleProche(d, id.Nicolas).couples[0].statut).toBe('separee');
    expect(familleProche(d, id.Antoine).couples[0].statut).not.toBe('separee');
  });
});
