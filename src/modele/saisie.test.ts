import { describe, expect, it } from 'vitest';
import { fratrie } from './deductions';
import { avecDe, enumerer, grouperParLettre, groupeVise, homonymes, lettresIndex } from './liste';
import { ajouterFiliation, ajouterFiliations, ajouterUnion, creerPersonne, donneesVides } from './modele';
import { nomsEnfant, suggestions } from './saisie';
import type { Donnees, Personne, Sexe } from './types';

/** Petit constructeur de scénario : personnes par prénom, liens par prénom. */
function monde() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  return {
    get d() {
      return d;
    },
    id,
    pers(prenom: string, nom = prenom, sexe?: Sexe, naissance?: string) {
      const r = creerPersonne(d, { prenom, nom, sexe, naissance });
      d = r.donnees;
      id[prenom] = r.personne.id;
    },
    union(a: string, b: string) {
      d = ajouterUnion(d, id[a], id[b]).donnees;
    },
    filiation(parent: string, enfant: string) {
      d = ajouterFiliation(d, id[parent], id[enfant], 'biologique').donnees;
    },
  };
}

const personne = (prenom: string, nom: string, sexe?: Sexe): Personne => ({ id: prenom, prenom, nom, note: '', ...(sexe ? { sexe } : {}) });
const prenoms = (l: { personne: Personne }[]) => l.map((s) => s.personne.prenom);

describe('ajouterFiliations', () => {
  it('relie un enfant aux deux parents d’un couple en une fois', () => {
    const m = monde();
    ['Léa', 'Mathis', 'Jules'].forEach((p) => m.pers(p));
    const d = ajouterFiliations(m.d, [m.id.Léa, m.id.Mathis], m.id.Jules, 'biologique');
    expect(d.filiations.filter((f) => f.enfant === m.id.Jules).map((f) => f.parent)).toEqual([m.id.Léa, m.id.Mathis]);
  });

  it('passe un parent déjà relié et garde le type demandé pour les autres', () => {
    const m = monde();
    ['Léa', 'Mathis', 'Jules'].forEach((p) => m.pers(p));
    m.filiation('Mathis', 'Jules');
    const d = ajouterFiliations(m.d, [m.id.Léa, m.id.Mathis], m.id.Jules, 'adoptif');
    expect(d.filiations).toHaveLength(2);
    expect(d.filiations.find((f) => f.parent === m.id.Léa)?.type).toBe('adoptif');
  });

  it('demande au moins un parent', () => {
    const m = monde();
    m.pers('Jules');
    expect(() => ajouterFiliations(m.d, [], m.id.Jules, 'biologique')).toThrow('Coche au moins un parent');
  });

  it('fait d’un frère ajouté un frère, ou un demi avec un seul parent coché', () => {
    const m = monde();
    ['Marc', 'Claire', 'Léa', 'Hugo', 'Inès'].forEach((p) => m.pers(p));
    m.filiation('Marc', 'Léa');
    m.filiation('Claire', 'Léa');
    let d = ajouterFiliations(m.d, [m.id.Marc, m.id.Claire], m.id.Hugo, 'biologique');
    d = ajouterFiliations(d, [m.id.Marc], m.id.Inès, 'biologique');
    const { freresSoeurs, demis } = fratrie(d, m.id.Léa);
    expect(freresSoeurs.map((p) => p.prenom)).toEqual(['Hugo']);
    expect(demis.map((p) => p.prenom)).toEqual(['Inès']);
  });

  it('refuse toute la saisie si un des liens est refusé', () => {
    const m = monde();
    ['Léa', 'Mathis', 'Jules'].forEach((p) => m.pers(p));
    m.filiation('Jules', 'Mathis');
    expect(() => ajouterFiliations(m.d, [m.id.Léa, m.id.Mathis], m.id.Jules, 'biologique')).toThrow('boucle');
  });
});

describe('nomsEnfant', () => {
  const lea = personne('Léa', 'Dubois', 'F');
  const thomas = personne('Mathis', 'Petit', 'M');

  it('propose le nom du père, puis celui de la mère, quel que soit le parent de départ', () => {
    expect(nomsEnfant([lea, thomas]).map((n) => n.nom)).toEqual(['Petit', 'Dubois']);
    expect(nomsEnfant([thomas, lea]).map((n) => n.nom)).toEqual(['Petit', 'Dubois']);
    expect(nomsEnfant([lea, thomas])[0].de).toBe(thomas);
  });

  it('suit l’ordre reçu sans couple homme-femme identifiable', () => {
    expect(nomsEnfant([lea, personne('Sophie', 'Roux', 'F')]).map((n) => n.nom)).toEqual(['Dubois', 'Roux']);
    expect(nomsEnfant([personne('Sam', 'Roux'), thomas]).map((n) => n.nom)).toEqual(['Roux', 'Petit']);
  });

  it('un seul parent : son nom seul', () => {
    expect(nomsEnfant([lea]).map((n) => n.nom)).toEqual(['Dubois']);
  });

  it('retire les noms vides et les doublons', () => {
    expect(nomsEnfant([lea, personne('Paul', 'Dubois', 'M')]).map((n) => n.nom)).toEqual(['Dubois']);
    expect(nomsEnfant([personne('Paul', ' ', 'M'), lea]).map((n) => n.nom)).toEqual(['Dubois']);
    expect(nomsEnfant([personne('Paul', '', 'M')])).toEqual([]);
  });
});

describe('suggestions', () => {
  function famille() {
    const m = monde();
    ['Léa', 'Mathis', 'Jules', 'Rose', 'Hugo'].forEach((p) => m.pers(p));
    m.union('Léa', 'Mathis');
    return m;
  }

  it('parent : le conjoint d’un parent déjà saisi', () => {
    const m = famille();
    m.filiation('Léa', 'Jules');
    const s = suggestions(m.d, m.id.Jules, 'parent');
    expect(prenoms(s)).toEqual(['Mathis']);
    expect(s[0].detail).toBe('Conjoint de Léa');
  });

  it('parent : rien quand les deux parents du couple sont déjà saisis', () => {
    const m = famille();
    m.filiation('Léa', 'Jules');
    m.filiation('Mathis', 'Jules');
    expect(suggestions(m.d, m.id.Jules, 'parent')).toEqual([]);
  });

  it('enfant : les enfants du conjoint qui ne sont pas encore les siens', () => {
    const m = famille();
    m.filiation('Mathis', 'Jules');
    m.filiation('Mathis', 'Rose');
    m.filiation('Léa', 'Rose');
    const s = suggestions(m.d, m.id.Léa, 'enfant');
    expect(prenoms(s)).toEqual(['Jules']);
    expect(s[0].detail).toBe('Enfant de Mathis');
  });

  it('conjoint : l’autre parent de ses enfants, s’il n’est pas en couple', () => {
    const m = monde();
    ['Léa', 'Marc', 'Jules', 'Rose', 'Paul', 'Zoé'].forEach((p) => m.pers(p));
    m.filiation('Léa', 'Jules');
    m.filiation('Marc', 'Jules');
    m.filiation('Léa', 'Rose');
    m.filiation('Paul', 'Rose');
    m.union('Paul', 'Zoé');
    const s = suggestions(m.d, m.id.Léa, 'conjoint');
    expect(prenoms(s)).toEqual(['Marc']);
    expect(s[0].detail).toBe('Parent de Jules');
  });

  it('même nom de famille : proposé après les liens déduits, sans casse ni accents', () => {
    const m = monde();
    m.pers('Jules', 'Dupont');
    m.pers('Léa', 'Dupont');
    m.pers('Mathis', 'dupont');
    m.pers('Éric', 'Durand');
    m.union('Léa', 'Mathis');
    m.filiation('Léa', 'Jules');
    const s = suggestions(m.d, m.id.Jules, 'parent');
    expect(prenoms(s)).toEqual(['Mathis']);
    expect(s[0].detail).toBe('Conjoint de Léa');
    const frere = suggestions(m.d, m.id.Jules, 'frere');
    expect(prenoms(frere)).toEqual(['Mathis']);
    expect(frere[0].detail).toBe('Même nom : dupont');
  });

  it('le nom de jeune fille permet aussi de proposer un lien de famille', () => {
    const m = monde();
    m.pers('Jules', 'Dupont');
    const d = creerPersonne(m.d, { prenom: 'Nathalie', nom: 'Prévot', sexe: 'F', nomNaissance: 'Dupont' }).donnees;
    expect(prenoms(suggestions(d, m.id.Jules, 'frere'))).toEqual(['Nathalie']);
  });

  it('même nom de famille : jamais un ascendant ni un descendant, ni un nom vide', () => {
    const m = monde();
    m.pers('Jules', 'Dupont');
    m.pers('Papy', 'Dupont');
    m.pers('Pierre', 'Dupont');
    m.pers('Sans', '');
    m.pers('Autre', '');
    m.filiation('Papy', 'Jules');
    m.filiation('Jules', 'Pierre');
    expect(suggestions(m.d, m.id.Jules, 'parent')).toEqual([]);
    expect(suggestions(m.d, m.id.Jules, 'enfant')).toEqual([]);
    expect(suggestions(m.d, m.id.Sans, 'parent')).toEqual([]);
  });

  it('même nom de famille : écart d’âge vraisemblable', () => {
    const m = monde();
    m.pers('Jules', 'Dupont', undefined, '1990');
    m.pers('Pere', 'Dupont', undefined, '1960');
    m.pers('Cousin', 'Dupont', undefined, '1995');
    m.pers('Fils', 'Dupont', undefined, '2020');
    m.pers('Papy', 'Dupont', undefined, '1930');
    m.pers('Inconnu', 'Dupont');
    expect(prenoms(suggestions(m.d, m.id.Jules, 'parent'))).toEqual(['Inconnu', 'Papy', 'Pere']);
    expect(prenoms(suggestions(m.d, m.id.Jules, 'enfant'))).toEqual(['Fils', 'Inconnu']);
    expect(prenoms(suggestions(m.d, m.id.Jules, 'frere'))).toEqual(['Cousin', 'Fils', 'Inconnu', 'Pere']);
    expect(suggestions(m.d, m.id.Jules, 'conjoint')).toEqual([]);
  });

  it('aucune suggestion sans lien', () => {
    const m = famille();
    expect(suggestions(m.d, m.id.Hugo, 'parent')).toEqual([]);
    expect(suggestions(m.d, m.id.Hugo, 'enfant')).toEqual([]);
    expect(suggestions(m.d, m.id.Hugo, 'conjoint')).toEqual([]);
  });
});

describe('homonymes', () => {
  const liste = [personne('Léa', 'Dubois'), personne('Lea', 'Martin'), { ...personne('Hugo', 'Dubois'), id: 'h' }];

  it('repère le même prénom et le même nom, sans casse, accents ni espaces superflus', () => {
    expect(homonymes(liste, { prenom: ' lea ', nom: 'DUBOIS' }).map((p) => p.id)).toEqual(['Léa']);
    expect(homonymes([personne('Jean  Paul', 'Roux')], { prenom: 'Jean Paul', nom: 'Roux' })).toHaveLength(1);
  });

  it('ne confond pas un prénom seul ou un autre nom', () => {
    expect(homonymes(liste, { prenom: 'Léa', nom: '' })).toEqual([]);
    expect(homonymes(liste, { prenom: 'Léa', nom: 'Petit' })).toEqual([]);
  });

  it('ignore la fiche exclue', () => {
    expect(homonymes(liste, { prenom: 'Hugo', nom: 'Dubois' }, 'h')).toEqual([]);
  });
});

describe('enumerer', () => {
  it('relie les noms par des virgules et un « et » final', () => {
    expect(enumerer([])).toBe('');
    expect(enumerer(['Marc'])).toBe('Marc');
    expect(enumerer(['Marc', 'Claire'])).toBe('Marc et Claire');
    expect(enumerer(['Marc', 'Claire', 'Jean'])).toBe('Marc, Claire et Jean');
  });
});

describe('avecDe', () => {
  it('élide devant une voyelle, même accentuée, pas devant une consonne ni un h', () => {
    expect(avecDe('Anne')).toBe('d’Anne');
    expect(avecDe('Élise')).toBe('d’Élise');
    expect(avecDe('Yves')).toBe('d’Yves');
    expect(avecDe('Marc')).toBe('de Marc');
    expect(avecDe('Hugo')).toBe('de Hugo');
  });
});

describe('index alphabétique', () => {
  const groupes = grouperParLettre([personne('Anne', 'A'), personne('Marc', 'M'), personne('Zoé', 'Z')], 'prenom');

  it('donne les 26 lettres, plus « # » seulement si un groupe le porte', () => {
    expect(lettresIndex(groupes)).toHaveLength(26);
    const avecDiese = grouperParLettre([personne('2Pac', 'X'), personne('Anne', 'A')], 'prenom');
    expect(lettresIndex(avecDiese).at(-1)).toBe('#');
  });

  it('vise la lettre touchée, sinon la suivante présente, sinon le dernier groupe', () => {
    expect(groupeVise(groupes, 'M')).toBe('M');
    expect(groupeVise(groupes, 'B')).toBe('M');
    expect(groupeVise(groupes, 'N')).toBe('Z');
    const sansZ = grouperParLettre([personne('Anne', 'A'), personne('Marc', 'M')], 'prenom');
    expect(groupeVise(sansZ, 'Y')).toBe('M');
  });
});
