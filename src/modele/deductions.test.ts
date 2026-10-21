import { describe, expect, it } from 'vitest';
import { conjoint, enfantsDuCouple, fratrie, freresComplets, liensEnfants, liensParents, parentsCommuns } from './deductions';
import { familleProche } from './familleProche';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele';
import type { Donnees, TypeFiliation } from './types';

/** Petit constructeur de scénario : personnes par prénom, liens par prénom. */
function monde() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  return {
    get d() {
      return d;
    },
    id,
    pers(prenom: string, naissance?: string) {
      const r = creerPersonne(d, { prenom, nom: 'X', naissance });
      d = r.donnees;
      id[prenom] = r.personne.id;
    },
    union(a: string, b: string) {
      d = ajouterUnion(d, id[a], id[b]).donnees;
    },
    filiation(parent: string, enfant: string, type: TypeFiliation = 'biologique') {
      d = ajouterFiliation(d, id[parent], id[enfant], type).donnees;
    },
  };
}

const prenoms = (l: { prenom: string }[]) => l.map((p) => p.prenom);

/** Enfants dans l'ordre de la fiche. */
const enfants = (d: Donnees, id: string) => liensEnfants(d, id).map((l) => l.personne);

describe('conjoint et ordre des enfants', () => {
  it('donne le conjoint et son union, quel que soit le côté de l’union', () => {
    const m = monde();
    ['Anne', 'Bob', 'Cléo'].forEach((p) => m.pers(p));
    m.union('Anne', 'Bob');
    expect(conjoint(m.d, m.id.Anne)?.personne.prenom).toBe('Bob');
    expect(conjoint(m.d, m.id.Bob)?.personne.prenom).toBe('Anne');
    expect(conjoint(m.d, m.id.Bob)?.union).toBe(m.d.unions[0]);
    expect(conjoint(m.d, m.id.Cléo)).toBeUndefined();
  });

  it('trie les enfants par naissance, sans date en fin de liste', () => {
    const m = monde();
    m.pers('Parent');
    m.pers('Sans date');
    m.pers('Cadet', '2005-03-01');
    m.pers('Aîné', '2001-12-24');
    ['Sans date', 'Cadet', 'Aîné'].forEach((e) => m.filiation('Parent', e));
    expect(prenoms(enfants(m.d, m.id.Parent))).toEqual(['Aîné', 'Cadet', 'Sans date']);
  });

  it('départage les naissances identiques par ordre alphabétique', () => {
    const m = monde();
    m.pers('Parent');
    m.pers('Zoé', '2000-01-01');
    m.pers('Alice', '2000-01-01');
    m.filiation('Parent', 'Zoé');
    m.filiation('Parent', 'Alice');
    expect(prenoms(enfants(m.d, m.id.Parent))).toEqual(['Alice', 'Zoé']);
  });
});

describe('enfants d’un couple', () => {
  it('ne garde que les enfants communs aux deux, adoptifs compris', () => {
    const m = monde();
    ['Anne', 'Bob', 'Cléo', 'Commun', 'AdoptéCommun', 'DeAnneSeule', 'DeBobSeul'].forEach((p) => m.pers(p));
    m.union('Anne', 'Bob');
    m.filiation('Anne', 'Commun');
    m.filiation('Bob', 'Commun');
    m.filiation('Anne', 'AdoptéCommun', 'adoptif');
    m.filiation('Bob', 'AdoptéCommun', 'adoptif');
    m.filiation('Anne', 'DeAnneSeule');
    m.filiation('Bob', 'DeBobSeul');
    expect(prenoms(enfantsDuCouple(m.d, m.id.Anne, m.id.Bob)).sort()).toEqual(['AdoptéCommun', 'Commun']);
    expect(enfantsDuCouple(m.d, m.id.Anne, m.id.Cléo)).toEqual([]);
  });

  it('est symétrique et trié par naissance', () => {
    const m = monde();
    ['Anne', 'Bob'].forEach((p) => m.pers(p));
    m.pers('Petit', '2010-01-01');
    m.pers('Grand', '2000-01-01');
    for (const e of ['Petit', 'Grand']) {
      m.filiation('Anne', e);
      m.filiation('Bob', e);
    }
    expect(prenoms(enfantsDuCouple(m.d, m.id.Anne, m.id.Bob))).toEqual(['Grand', 'Petit']);
    expect(prenoms(enfantsDuCouple(m.d, m.id.Bob, m.id.Anne))).toEqual(['Grand', 'Petit']);
  });
});

describe('frères et sœurs', () => {
  it('distingue frères/sœurs (mêmes parents) et demis (un parent en commun)', () => {
    const m = monde();
    ['Mère', 'Père', 'Beau-père', 'Moi', 'Frère', 'Demi-frère', 'Cousin'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Père', 'Moi');
    m.filiation('Mère', 'Frère');
    m.filiation('Père', 'Frère');
    m.filiation('Mère', 'Demi-frère');
    m.filiation('Beau-père', 'Demi-frère');
    const f = fratrie(m.d, m.id.Moi);
    expect(prenoms(f.freresSoeurs)).toEqual(['Frère']);
    expect(prenoms(f.demis)).toEqual(['Demi-frère']);
  });

  it('donne l’autre parent des demis, et si leur union est terminée', () => {
    const m = monde();
    ['Mère', 'Père', 'Beau-père', 'Moi', 'Demi-frère'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Père', 'Moi');
    m.filiation('Mère', 'Demi-frère');
    m.filiation('Beau-père', 'Demi-frère');
    // Sans union enregistrée : statut inconnu (trait en pointillé, comme une union terminée).
    expect(familleProche(m.d, m.id.Moi).autresCouples.map((a) => [a.autre, a.statut])).toEqual([[m.id['Beau-père'], null]]);
    m.d.unions.push(...ajouterUnion(m.d, m.id.Mère, m.id['Beau-père'], false, 'separee').donnees.unions);
    expect(familleProche(m.d, m.id.Moi).autresCouples[0].statut).toBe('separee');
  });

  it('dessine l’ex avec qui il a des enfants, avec ou sans conjoint actuel', () => {
    const m = monde();
    ['Michel', 'Catherine', 'Alice', 'Enfant', 'Autre'].forEach((p) => m.pers(p));
    m.filiation('Michel', 'Enfant');
    m.filiation('Catherine', 'Enfant');
    m.d.unions.push(...ajouterUnion(m.d, m.id.Michel, m.id.Catherine, false, 'separee').donnees.unions);
    const f = familleProche(m.d, m.id.Michel);
    expect(f.conjoint).toBeNull();
    expect(f.partenaires).toEqual([{ id: m.id.Catherine, statut: 'separee' }]);
    expect(f.enfants.map((e) => e.autre)).toEqual([m.id.Catherine]);
    m.d.unions.push(...ajouterUnion(m.d, m.id.Michel, m.id.Alice).donnees.unions);
    const g = familleProche(m.d, m.id.Michel);
    expect(g.conjoint?.id).toBe(m.id.Alice);
    expect(g.partenaires.map((p) => p.id)).toEqual([m.id.Catherine]);
  });

  it('est symétrique et exclut la personne elle-même', () => {
    const m = monde();
    ['Mère', 'Père', 'Moi', 'Frère'].forEach((p) => m.pers(p));
    for (const e of ['Moi', 'Frère']) {
      m.filiation('Mère', e);
      m.filiation('Père', e);
    }
    expect(prenoms(fratrie(m.d, m.id.Frère).freresSoeurs)).toEqual(['Moi']);
    expect(prenoms(fratrie(m.d, m.id.Moi).freresSoeurs)).toEqual(['Frère']);
  });

  it('traite pareil parents biologiques et adoptifs', () => {
    const m = monde();
    ['Mère', 'Père', 'Moi', 'Adopté'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Père', 'Moi');
    m.filiation('Mère', 'Adopté', 'adoptif');
    m.filiation('Père', 'Adopté', 'adoptif');
    expect(prenoms(fratrie(m.d, m.id.Moi).freresSoeurs)).toEqual(['Adopté']);
  });

  it('adopté par mes parents, avec ses parents biologiques enregistrés : frère, pas demi', () => {
    const m = monde();
    ['Mère', 'Père', 'Génitrice', 'Géniteur', 'Moi', 'Adopté'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Père', 'Moi');
    m.filiation('Génitrice', 'Adopté');
    m.filiation('Géniteur', 'Adopté');
    m.filiation('Mère', 'Adopté', 'adoptif');
    m.filiation('Père', 'Adopté', 'adoptif');
    expect(fratrie(m.d, m.id.Moi)).toMatchObject({ freresSoeurs: [{ prenom: 'Adopté' }], demis: [] });
    expect(fratrie(m.d, m.id.Adopté)).toMatchObject({ freresSoeurs: [{ prenom: 'Moi' }], demis: [] });
    expect(freresComplets(m.d, m.id.Moi, m.id.Adopté)).toBe(true);
  });

  it('adopté avec parents biologiques : les autres enfants de ses parents adoptifs sont ses frères', () => {
    const m = monde();
    ['Génitrice', 'Géniteur', 'Adoptante', 'Adoptant', 'Moi', 'Sœur', 'Autre adopté'].forEach((p) => m.pers(p));
    m.filiation('Génitrice', 'Moi');
    m.filiation('Géniteur', 'Moi');
    m.filiation('Adoptante', 'Moi', 'adoptif');
    m.filiation('Adoptant', 'Moi', 'adoptif');
    m.filiation('Adoptante', 'Sœur');
    m.filiation('Adoptant', 'Sœur');
    m.filiation('Adoptante', 'Autre adopté', 'adoptif');
    m.filiation('Adoptant', 'Autre adopté', 'adoptif');
    const f = fratrie(m.d, m.id.Moi);
    expect(prenoms(f.freresSoeurs).sort()).toEqual(['Autre adopté', 'Sœur']);
    expect(f.demis).toEqual([]);
  });

  it('un seul parent adoptif en commun : demi', () => {
    const m = monde();
    ['Mère', 'Père', 'Adoptante', 'Son conjoint', 'Moi', 'Autre'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Père', 'Moi');
    m.filiation('Adoptante', 'Moi', 'adoptif');
    m.filiation('Adoptante', 'Autre');
    m.filiation('Son conjoint', 'Autre');
    expect(fratrie(m.d, m.id.Moi)).toMatchObject({ freresSoeurs: [], demis: [{ prenom: 'Autre' }] });
    expect(freresComplets(m.d, m.id.Autre, m.id.Moi)).toBe(false);
  });

  it('beau-père qui adopte : mêmes parents de part et d’autre, frères', () => {
    const m = monde();
    ['Mère', 'Beau-père', 'Moi', 'Cadet'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Beau-père', 'Moi', 'adoptif');
    m.filiation('Mère', 'Cadet');
    m.filiation('Beau-père', 'Cadet');
    expect(prenoms(fratrie(m.d, m.id.Moi).freresSoeurs)).toEqual(['Cadet']);
  });

  it('même mère seule, mais adopté par un autre d’un seul côté : demi', () => {
    const m = monde();
    ['Mère', 'Adoptant', 'Moi', 'Autre'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Mère', 'Autre');
    m.filiation('Adoptant', 'Autre', 'adoptif');
    expect(fratrie(m.d, m.id.Moi)).toMatchObject({ freresSoeurs: [], demis: [{ prenom: 'Autre' }] });
  });

  it('un seul parent connu de part et d’autre, le même : frères et sœurs', () => {
    const m = monde();
    ['Mère', 'Moi', 'Autre'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Mère', 'Autre');
    const f = fratrie(m.d, m.id.Moi);
    expect(prenoms(f.freresSoeurs)).toEqual(['Autre']);
    expect(f.demis).toEqual([]);
  });

  it('deux parents connus d’un côté, un seul de l’autre en commun : demi', () => {
    const m = monde();
    ['Mère', 'Père', 'Moi', 'Autre'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Père', 'Moi');
    m.filiation('Mère', 'Autre');
    const f = fratrie(m.d, m.id.Moi);
    expect(f.freresSoeurs).toEqual([]);
    expect(prenoms(f.demis)).toEqual(['Autre']);
  });

  it('personne sans parent ou sans parent commun : aucune fratrie', () => {
    const m = monde();
    ['Mère', 'Moi', 'Étranger', 'Autre'].forEach((p) => m.pers(p));
    m.filiation('Mère', 'Moi');
    m.filiation('Mère', 'Autre');
    expect(fratrie(m.d, m.id.Mère)).toEqual({ freresSoeurs: [], demis: [] });
    expect(fratrie(m.d, m.id.Étranger)).toEqual({ freresSoeurs: [], demis: [] });
  });

  it('trie la fratrie par naissance', () => {
    const m = monde();
    m.pers('Mère');
    m.pers('Moi', '1995-01-01');
    m.pers('Plus jeune', '2000-01-01');
    m.pers('Plus âgé', '1990-01-01');
    ['Moi', 'Plus jeune', 'Plus âgé'].forEach((e) => m.filiation('Mère', e));
    expect(prenoms(fratrie(m.d, m.id.Moi).freresSoeurs)).toEqual(['Plus âgé', 'Plus jeune']);
  });
});

describe('parents communs', () => {
  it('donne le parent partagé par un demi-frère, et les deux pour un frère', () => {
    const m = monde();
    ['Mère', 'Père', 'Beau-père', 'Moi', 'Frère', 'Demi'].forEach((p) => m.pers(p));
    for (const e of ['Moi', 'Frère']) {
      m.filiation('Mère', e);
      m.filiation('Père', e);
    }
    m.filiation('Mère', 'Demi');
    m.filiation('Beau-père', 'Demi');
    expect(prenoms(parentsCommuns(m.d, m.id.Moi, m.id.Demi))).toEqual(['Mère']);
    expect(prenoms(parentsCommuns(m.d, m.id.Moi, m.id.Frère))).toEqual(['Mère', 'Père']);
    expect(parentsCommuns(m.d, m.id.Moi, m.id['Beau-père'])).toEqual([]);
  });
});

describe('tri avec dates partielles', () => {
  it('place une année seule avant les dates complètes de la même année, sans date en fin', () => {
    const m = monde();
    m.pers('Parent');
    m.pers('Sans');
    m.pers('Complet', '1990-06-01');
    m.pers('Annee', '1990');
    m.pers('Mois', '1990-03');
    for (const e of ['Sans', 'Complet', 'Annee', 'Mois']) m.filiation('Parent', e);
    expect(enfants(m.d, m.id.Parent).map((p) => p.prenom)).toEqual(['Annee', 'Mois', 'Complet', 'Sans']);
  });
  it('range une naissance sans année avec les sans date', () => {
    const m = monde();
    m.pers('Parent');
    m.pers('Zoé');
    m.pers('Anniv', '--10-24');
    m.pers('Complet', '1990-06-01');
    for (const e of ['Zoé', 'Anniv', 'Complet']) m.filiation('Parent', e);
    expect(enfants(m.d, m.id.Parent).map((p) => p.prenom)).toEqual(['Complet', 'Anniv', 'Zoé']);
  });
});

describe('liens avec type de filiation', () => {
  it('liste les parents (biologiques puis adoptifs) et les enfants (du plus âgé au plus jeune) avec leur lien', () => {
    const w = monde();
    w.pers('Zoé', '1960');
    w.pers('Adam', '1958');
    w.pers('Bea', '2010');
    w.pers('Cid', '2005');
    w.pers('Moi', '1985');
    w.filiation('Adam', 'Moi', 'adoptif');
    w.filiation('Zoé', 'Moi', 'biologique');
    w.filiation('Moi', 'Bea', 'biologique');
    w.filiation('Moi', 'Cid', 'adoptif');
    const p = liensParents(w.d, w.id.Moi);
    expect(prenoms(p.map((l) => l.personne))).toEqual(['Zoé', 'Adam']);
    expect(p.map((l) => l.filiation.type)).toEqual(['biologique', 'adoptif']);
    const e = liensEnfants(w.d, w.id.Moi);
    expect(prenoms(e.map((l) => l.personne))).toEqual(['Cid', 'Bea']);
    expect(e.map((l) => l.filiation.type)).toEqual(['adoptif', 'biologique']);
    expect(liensParents(w.d, w.id.Zoé)).toEqual([]);
  });
});
