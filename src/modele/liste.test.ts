import { describe, expect, it } from 'vitest';
import { assemblerDate, comparateur, decouperDate, filtrerParNom, grouperParLettre, initiales, libelleAdoptif, libelleMarie, libelleNaissance, nomComplet, nomListe, teinteFamille } from './liste';
import type { Personne } from './types';

let n = 0;
function p(prenom: string, nom: string, naissance?: string): Personne {
  return { id: `id${++n}`, prenom, nom, note: '', ...(naissance ? { naissance } : {}) };
}

describe('nomComplet et initiales', () => {
  it('assemble prénom et nom', () => {
    expect(nomComplet(p('Marie', 'Girard'))).toBe('Marie Girard');
  });
  it("gère l'absence de prénom ou de nom", () => {
    expect(nomComplet(p('Marie', ''))).toBe('Marie');
    expect(nomComplet(p('', 'Girard'))).toBe('Girard');
  });
  it('donne les initiales en majuscules', () => {
    expect(initiales(p('marie', 'girard'))).toBe('MG');
    expect(initiales(p('Élodie', ''))).toBe('É');
    expect(initiales(p('', ''))).toBe('?');
  });
});

describe('teinteFamille', () => {
  it('est stable pour un même nom, sans tenir compte de la casse, des accents ni des espaces', () => {
    expect(teinteFamille('Lefèvre')).toBe(teinteFamille('  LEFEVRE '));
    expect(teinteFamille('Martin')).toBe(teinteFamille('Martin'));
  });
  it("n'en donne aucune pour un nom vide", () => {
    expect(teinteFamille('')).toBeUndefined();
    expect(teinteFamille(' - ')).toBeUndefined();
  });
  it('répartit des noms variés sur plusieurs teintes', () => {
    const noms = ['Martin', 'Roux', 'Benali', 'Lefèvre', 'Moreau', 'Dubois', 'Girard', 'Bernard', 'Petit', 'Durand'];
    const teintes = new Set(noms.map(teinteFamille));
    expect(teintes.size).toBeGreaterThanOrEqual(5);
  });
});

describe('tri par nom', () => {
  const parNom = comparateur('nom');
  it('trie par nom de famille puis prénom', () => {
    const liste = [p('Pierre', 'Girard'), p('Louis', 'Bernard'), p('Marie', 'Girard')];
    expect(liste.sort(parNom).map((x) => x.prenom)).toEqual(['Louis', 'Marie', 'Pierre']);
  });
  it('ignore les accents dans l’ordre alphabétique', () => {
    const liste = [p('A', 'Zola'), p('B', 'Étienne'), p('C', 'Eric'), p('D', 'Édouard')];
    expect(liste.sort(parNom).map((x) => x.nom)).toEqual(['Édouard', 'Eric', 'Étienne', 'Zola']);
  });
  it('utilise le prénom pour une personne sans nom', () => {
    const liste = [p('Zoé', 'Martin'), p('Anna', '')];
    expect(liste.sort(parNom).map((x) => x.prenom)).toEqual(['Anna', 'Zoé']);
  });
});

describe('filtrerParNom', () => {
  const gens = [p('Marie', 'Girard'), p('Éloïse', 'Lambert'), p('Jean', 'Lambert')];
  it('renvoie tout le monde si la saisie est vide', () => {
    expect(filtrerParNom(gens, '')).toHaveLength(3);
    expect(filtrerParNom(gens, '   ')).toHaveLength(3);
  });
  it('cherche dans le prénom ou le nom', () => {
    expect(filtrerParNom(gens, 'lamb').map((x) => x.prenom)).toEqual(['Éloïse', 'Jean']);
    expect(filtrerParNom(gens, 'mar').map((x) => x.prenom)).toEqual(['Marie']);
  });
  it('ignore casse et accents', () => {
    expect(filtrerParNom(gens, 'ELOISE').map((x) => x.prenom)).toEqual(['Éloïse']);
    expect(filtrerParNom(gens, 'éloïse')).toHaveLength(1);
  });
  it('accepte « prénom nom » et « nom prénom »', () => {
    expect(filtrerParNom(gens, 'jean lambert')).toHaveLength(1);
    expect(filtrerParNom(gens, 'lambert jean')).toHaveLength(1);
  });
  it('ne renvoie rien si personne ne correspond', () => {
    expect(filtrerParNom(gens, 'xyz')).toEqual([]);
  });
});

describe('grouperParLettre', () => {
  it('regroupe par initiale du nom, groupes et membres triés', () => {
    const g = grouperParLettre([p('Pierre', 'Girard'), p('Louis', 'Bernard'), p('Marie', 'Girard'), p('Jean', 'Lambert')]);
    expect(g.map((x) => x.lettre)).toEqual(['B', 'G', 'L']);
    expect(g[1].personnes.map((x) => x.prenom)).toEqual(['Marie', 'Pierre']);
  });
  it('range les accents sous la lettre de base', () => {
    expect(grouperParLettre([p('A', 'Élie')]).map((x) => x.lettre)).toEqual(['E']);
  });
  it('met « # » en dernier pour les noms ne commençant pas par une lettre', () => {
    const g = grouperParLettre([p('A', '3M'), p('B', 'Zola'), p('C', 'Abel')]);
    expect(g.map((x) => x.lettre)).toEqual(['A', 'Z', '#']);
  });
  it('renvoie une liste vide sans personne', () => {
    expect(grouperParLettre([])).toEqual([]);
  });
  it('ne modifie pas le tableau reçu', () => {
    const entree = [p('B', 'Zola'), p('A', 'Abel')];
    grouperParLettre(entree);
    expect(entree.map((x) => x.nom)).toEqual(['Zola', 'Abel']);
  });
});

describe('tri par prénom', () => {
  it('regroupe par initiale du prénom, membres départagés par le nom', () => {
    const g = grouperParLettre([p('Pierre', 'Girard'), p('Louis', 'Bernard'), p('Marie', 'Girard'), p('Marie', 'Bernard')], 'prenom');
    expect(g.map((x) => x.lettre)).toEqual(['L', 'M', 'P']);
    expect(g[1].personnes.map((x) => x.nom)).toEqual(['Bernard', 'Girard']);
  });
  it('utilise le nom pour une personne sans prénom', () => {
    const g = grouperParLettre([p('', 'Zola'), p('Anna', 'Abel')], 'prenom');
    expect(g.map((x) => x.lettre)).toEqual(['A', 'Z']);
  });
  it('trie « prenom » et « nom » différemment', () => {
    const liste = [p('Zoé', 'Abel'), p('Anna', 'Zola')];
    expect([...liste].sort(comparateur('prenom')).map((x) => x.prenom)).toEqual(['Anna', 'Zoé']);
    expect([...liste].sort(comparateur('nom')).map((x) => x.prenom)).toEqual(['Zoé', 'Anna']);
  });
  it('garde le tri par nom par défaut', () => {
    expect(grouperParLettre([p('Anna', 'Zola'), p('Zoé', 'Abel')]).map((x) => x.lettre)).toEqual(['A', 'Z']);
  });
});

describe('nomListe', () => {
  it('écrit « Nom Prénom » en tri par nom et « Prénom Nom » en tri par prénom', () => {
    expect(nomListe(p('Alice', 'Dupont'), 'nom')).toBe('Dupont Alice');
    expect(nomListe(p('Alice', 'Dupont'), 'prenom')).toBe('Alice Dupont');
  });
  it('ignore un champ vide', () => {
    expect(nomListe(p('Alice', ''), 'nom')).toBe('Alice');
    expect(nomListe(p('', 'Dupont'), 'prenom')).toBe('Dupont');
  });
});

describe('libelleNaissance', () => {
  it('formate la date en français', () => {
    expect(libelleNaissance('1961-05-14')).toBe('né(e) le 14 mai 1961');
    expect(libelleNaissance('1989-08-03')).toBe('né(e) le 3 août 1989');
  });
  it('écrit 1er pour le premier du mois', () => {
    expect(libelleNaissance('2018-01-01')).toBe('né(e) le 1er janvier 2018');
  });
  it('renvoie une chaîne vide sans date ou date invalide', () => {
    expect(libelleNaissance(undefined)).toBe('');
    expect(libelleNaissance('')).toBe('');
    expect(libelleNaissance('1961-13-01')).toBe('');
    expect(libelleNaissance('n’importe quoi')).toBe('');
  });
});

describe('libelleNaissance : sexe et dates partielles', () => {
  it('accorde selon le sexe', () => {
    expect(libelleNaissance('1961-05-14', 'F')).toBe('née le 14 mai 1961');
    expect(libelleNaissance('1961-05-14', 'M')).toBe('né le 14 mai 1961');
    expect(libelleNaissance('1961-05-14')).toBe('né(e) le 14 mai 1961');
  });
  it('formule les dates partielles avec « en »', () => {
    expect(libelleNaissance('1938', 'F')).toBe('née en 1938');
    expect(libelleNaissance('1961-05', 'M')).toBe('né en mai 1961');
    expect(libelleNaissance('1961-05')).toBe('né(e) en mai 1961');
  });
  it('ignore un mois impossible', () => {
    expect(libelleNaissance('1961-13')).toBe('');
  });
});

describe('decouperDate / assemblerDate', () => {
  it('découpe une date complète, partielle ou absente', () => {
    expect(decouperDate('1961-05-04')).toEqual({ jour: '4', mois: '5', annee: '1961' });
    expect(decouperDate('1961-05')).toEqual({ jour: '', mois: '5', annee: '1961' });
    expect(decouperDate('1938')).toEqual({ jour: '', mois: '', annee: '1938' });
    expect(decouperDate(undefined)).toEqual({ jour: '', mois: '', annee: '' });
  });
  it('assemble en complétant les zéros', () => {
    expect(assemblerDate({ jour: '4', mois: '5', annee: '1961' })).toBe('1961-05-04');
    expect(assemblerDate({ jour: '', mois: '5', annee: '1961' })).toBe('1961-05');
    expect(assemblerDate({ jour: '', mois: '', annee: '1938' })).toBe('1938');
    expect(assemblerDate({ jour: '', mois: '', annee: '' })).toBe('');
  });
  it('est l’inverse de decouperDate', () => {
    for (const d of ['1961-05-04', '1961-05', '1938', '']) expect(assemblerDate(decouperDate(d))).toBe(d);
  });
  it('refuse un jour ou un mois sans année, un jour sans mois', () => {
    expect(() => assemblerDate({ jour: '', mois: '5', annee: '' })).toThrow('année');
    expect(() => assemblerDate({ jour: '4', mois: '', annee: '' })).toThrow('année');
    expect(() => assemblerDate({ jour: '4', mois: '', annee: '1961' })).toThrow('mois');
  });
  it('refuse les saisies non numériques', () => {
    expect(() => assemblerDate({ jour: '', mois: '', annee: '19a1' })).toThrow();
    expect(() => assemblerDate({ jour: 'x', mois: '5', annee: '1961' })).toThrow();
  });
});

describe('accords des étiquettes', () => {
  it('accorde « Marié » et « Adoptif » selon le sexe de la personne affichée', () => {
    expect([libelleMarie('M'), libelleMarie('F'), libelleMarie()]).toEqual(['Marié', 'Mariée', 'Marié(e)']);
    expect([libelleAdoptif('M'), libelleAdoptif('F'), libelleAdoptif()]).toEqual(['Adoptif', 'Adoptive', 'Adoptif(ve)']);
  });
});
