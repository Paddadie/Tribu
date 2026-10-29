import { describe, expect, it } from 'vitest';
import { familleDe, filtrerListe, manquesDe, prochesDeFamille } from './filtres';
import type { Donnees, Personne } from './types';

function p(id: string, extra: Partial<Personne> = {}): Personne {
  return { id, prenom: id, nom: 'Test', note: '', naissance: '1980-01-02', ...extra };
}

// moi — mere (parent) ; moi + conjointe ; ami (groupe g1 avec moi) ; copine (g1) ; voisin sans lien
const moi = p('moi');
const mere = p('mere', { deces: '2010-05-05' });
const conjointe = p('conjointe', { naissance: '1982' });
const ami = p('ami', { nom: '' });
const copine = p('copine', { naissance: undefined });
const voisin = p('voisin', { decede: true, naissance: '--03-12' });
const tous = [moi, mere, conjointe, ami, copine, voisin];
const d: Donnees = {
  version: 6,
  personnes: tous,
  unions: [{ id: 'u1', personneA: 'moi', personneB: 'conjointe', marie: true, statut: 'actuelle' }],
  filiations: [{ id: 'f1', parent: 'mere', enfant: 'moi', type: 'biologique' }],
  groupes: [{ id: 'g1', nom: 'Lycée', membres: ['moi', 'ami', 'copine'] }],
};
const ids = (l: Personne[]) => l.map((x) => x.id);

describe('manquesDe', () => {
  it('repère nom, naissance absente ou incomplète, décès sans date', () => {
    expect(manquesDe(moi)).toEqual([]);
    expect(manquesDe(ami)).toEqual(['nom']);
    expect(manquesDe(copine)).toEqual(['naissance']);
    expect(manquesDe(conjointe)).toEqual(['incomplete']);
    expect(manquesDe(voisin)).toEqual(['incomplete', 'deces']);
    expect(manquesDe(mere)).toEqual([]);
  });
});

describe('familleDe', () => {
  it('suit filiations et unions de proche en proche, sans les amis', () => {
    expect([...familleDe(d, 'moi')].sort()).toEqual(['conjointe', 'mere', 'moi']);
  });
});

describe('prochesDeFamille', () => {
  const f = (parent: string, enfant: string) => ({ id: `${parent}-${enfant}`, parent, enfant, type: 'biologique' as const });
  const u = (a: string, b: string, statut: 'actuelle' | 'separee') => ({ id: `${a}-${b}`, personneA: a, personneB: b, marie: false, statut });
  const dd: Donnees = {
    version: 6,
    personnes: [],
    unions: [u('a', 'actuel', 'actuelle'), u('exAvecEnfant', 'a', 'separee'), u('a', 'exSansEnfant', 'separee')],
    filiations: [f('a', 'fils'), f('exAvecEnfant', 'fils'), f('a', 'fille'), f('fille', 'petit'), f('a', 'fille2'), f('coParent', 'fille2')],
    groupes: [],
  };
  it('prend enfants, conjoint actuel et autre parent des enfants (avec ou sans union), pas les ex sans enfant ni les petits-enfants', () => {
    expect([...prochesDeFamille(dd, new Set(['a']))].sort()).toEqual(['actuel', 'coParent', 'exAvecEnfant', 'fille', 'fille2', 'fils']);
  });
  it('ignore ceux qui portent déjà le nom', () => {
    expect([...prochesDeFamille(dd, new Set(['a', 'fils', 'actuel']))].sort()).toEqual(['coParent', 'exAvecEnfant', 'fille', 'fille2']);
  });
});

describe('filtrerListe', () => {
  it('tous : tout', () => expect(filtrerListe(d, tous, { filtre: 'tous' }, 'moi')).toHaveLength(6));
  it('famille : liés à Moi', () => expect(ids(filtrerListe(d, tous, { filtre: 'famille' }, 'moi'))).toEqual(['moi', 'mere', 'conjointe']));
  it('famille sans Moi : ne filtre rien', () => expect(filtrerListe(d, tous, { filtre: 'famille' })).toHaveLength(6));
  it('amis proches : membres d’un groupe, sans Moi', () => expect(ids(filtrerListe(d, tous, { filtre: 'amis' }, 'moi'))).toEqual(['ami', 'copine']));
  it('groupe : ses membres, sans Moi ; groupe inconnu : personne', () => {
    expect(ids(filtrerListe(d, tous, { filtre: 'groupe', groupe: 'g1' }, 'moi'))).toEqual(['ami', 'copine']);
    expect(filtrerListe(d, tous, { filtre: 'groupe', groupe: 'x' }, 'moi')).toEqual([]);
  });
  it('à compléter : tout manque, ou seulement les manques choisis', () => {
    expect(ids(filtrerListe(d, tous, { filtre: 'acompleter' }))).toEqual(['conjointe', 'ami', 'copine', 'voisin']);
    expect(ids(filtrerListe(d, tous, { filtre: 'acompleter', manques: new Set(['nom', 'deces']) }))).toEqual(['ami', 'voisin']);
  });
});
