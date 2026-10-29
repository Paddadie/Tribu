import { describe, expect, it } from 'vitest';
import {
  assemblerDate,
  comparateur,
  decouperDate,
  filtrerParNom,
  grouperParLettre,
  initiales,
  libelleAdoptif,
  libelleMarie,
  libelleDeces,
  libelleNaissance,
  libelleUnion,
  nomComplet,
  nomListe,
  nomsConnus,
  lieuxConnus,
  couleurFamille,
  couleursDesFamilles,
  couleursProches,
  mentionNaissance,
  NB_COULEURS,
  majuscule,
  prenomOuNom,
} from './liste';
import { creerPersonne, donneesVides } from './modele';
import type { Donnees, Personne } from './types';

let n = 0;
function p(prenom: string, nom: string, naissance?: string): Personne {
  return { id: `id${++n}`, prenom, nom, note: '', ...(naissance ? { naissance } : {}) };
}

describe('nomsConnus', () => {
  it("regroupe casse et accents, garde la graphie la plus fréquente, les plus répandus d'abord", () => {
    const liste = [p('A', 'Dupont'), p('B', 'Martin'), p('C', 'martin'), p('D', 'Martin'), p('E', 'Dupont'), p('F', 'Éloi'), p('G', 'Eloi')];
    expect(nomsConnus(liste)).toEqual(['Martin', 'Dupont', 'Eloi']);
  });

  it('compte aussi les noms de naissance et ignore les noms vides', () => {
    const jeuneFille = { ...p('H', 'Durand'), nomNaissance: 'Lemaire' };
    expect(nomsConnus([jeuneFille, p('I', '  '), p('J', '')])).toEqual(['Durand', 'Lemaire']);
  });
});

describe('lieuxConnus', () => {
  it('réunit lieux de naissance, de décès et de mariage, graphies proches regroupées', () => {
    const a = { ...p('A', 'X'), lieuNaissance: 'Quimper', lieuDeces: 'Brest' };
    const b = { ...p('B', 'Y'), lieuNaissance: 'quimper ' };
    const c = { ...p('C', 'Y'), lieuDeces: 'Quimper' };
    expect(lieuxConnus([a, b, c, p('D', 'Z')], [{ lieu: 'Brest' }, { lieu: 'Brest' }, {}])).toEqual(['Brest', 'Quimper']);
  });
});

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
  it('appelle par le prénom, ou par le nom à défaut', () => {
    expect(prenomOuNom(p('Marie', 'Girard'))).toBe('Marie');
    expect(prenomOuNom(p('', 'Girard'))).toBe('Girard');
  });
});

describe('majuscule', () => {
  it('met une capitale à la première lettre seulement', () => {
    expect(majuscule('cousine de Marie')).toBe('Cousine de Marie');
    expect(majuscule('élodie')).toBe('Élodie');
    expect(majuscule('')).toBe('');
  });
});

describe('couleurFamille', () => {
  const c = (nom: string, nomNaissance?: string) => couleurFamille({ nom, nomNaissance });
  it('est stable pour un même nom, sans tenir compte de la casse, des accents ni des espaces', () => {
    expect(c('Lefèvre')).toBe(c('  LEFEVRE '));
    expect(c('Martin')).toBe(c('Martin'));
  });
  it('reste entre 0 et 11', () => {
    for (const nom of ['Martin', 'Roux', 'Benali', 'Lefèvre', 'Moreau', 'Dubois']) {
      expect(c(nom)).toBeGreaterThanOrEqual(0);
      expect(c(nom)).toBeLessThan(NB_COULEURS);
    }
  });
  it('prend le nom actuel, le nom de naissance à défaut', () => {
    expect(c('Martin', 'Roux')).toBe(c('Martin'));
    expect(c('', 'Roux')).toBe(c('Roux'));
  });
  it("n'en donne aucune sans nom", () => {
    expect(c('')).toBeUndefined();
    expect(c(' - ')).toBeUndefined();
    expect(c('', '')).toBeUndefined();
  });
  it('répartit des noms variés sur plusieurs couleurs', () => {
    const noms = ['Martin', 'Roux', 'Benali', 'Lefèvre', 'Moreau', 'Dubois', 'Girard', 'Bernard', 'Petit', 'Durand'];
    expect(new Set(noms.map((n) => c(n))).size).toBeGreaterThanOrEqual(5);
  });
});

describe('mentionNaissance', () => {
  it('accorde selon le sexe', () => {
    expect(mentionNaissance({ nom: 'Lambert', nomNaissance: 'Kervadec', sexe: 'F' })).toBe('née Kervadec');
    expect(mentionNaissance({ nom: 'Lambert', nomNaissance: 'Kervadec', sexe: 'M' })).toBe('né Kervadec');
    expect(mentionNaissance({ nom: 'Lambert', nomNaissance: 'Kervadec' })).toBe('né(e) Kervadec');
  });
  it('ne dit rien sans nom de naissance ou s’il est le même que le nom actuel', () => {
    expect(mentionNaissance({ nom: 'Lambert', sexe: 'F' })).toBeUndefined();
    expect(mentionNaissance({ nom: 'Lambert', nomNaissance: ' lambert ', sexe: 'F' })).toBeUndefined();
  });
});

describe('couleursDesFamilles', () => {
  const personne = (id: string, nom: string, nomNaissance?: string): Personne => ({
    ...creerPersonne(donneesVides(), { prenom: id, nom }).personne,
    id,
    ...(nomNaissance ? { nomNaissance } : {}),
  });
  const donnees = (personnes: Personne[], unions: [string, string][] = []): Donnees => ({
    ...donneesVides(),
    personnes,
    unions: unions.map(([a, b], i) => ({ id: `u${i}`, personneA: a, personneB: b, marie: true, statut: 'actuelle' })),
  });
  // Deux noms que le hachage met sur la même couleur.
  const [nomA, nomB] = (() => {
    const vus = new Map<number, string>();
    for (let i = 0; ; i++) {
      const nom = `Nom${i}`;
      const k = couleurFamille({ nom })!;
      if (vus.has(k)) return [vus.get(k)!, nom];
      vus.set(k, nom);
    }
  })();

  it('garde la couleur du nom quand rien ne la gêne', () => {
    const d = donnees([personne('a', 'Martin')]);
    expect(couleurFamille({ nom: 'Martin' }, d)).toBe(couleurFamille({ nom: 'Martin' }));
  });
  it('sépare deux familles de couleurs trop proches, la plus grande garde la sienne', () => {
    const d = donnees([personne('a', nomA), personne('b', nomA), personne('c', nomB)], [['a', 'c']]);
    const [ka, kb] = [couleurFamille({ nom: nomA }, d)!, couleurFamille({ nom: nomB }, d)!];
    expect(ka).toBe(couleurFamille({ nom: nomA }));
    expect(couleursProches(ka, kb)).toBe(false);
  });
  it('donne la même couleur à toute une famille, nom de naissance compris pour une personne sans nom actuel', () => {
    const d = donnees([personne('a', nomA), personne('b', nomA), personne('c', nomB), personne('d', '', nomB)]);
    expect(couleurFamille(d.personnes[3], d)).toBe(couleurFamille(d.personnes[2], d));
  });
  it('quand la palette ne suffit plus, garde distinctes les familles liées', () => {
    const noms = Array.from({ length: 30 }, (_, i) => `Famille${i}`);
    const ps = noms.flatMap((n, i) => Array.from({ length: 30 - i }, (_, j) => personne(`${n}-${j}`, n)));
    const unions: [string, string][] = noms.slice(1).map((n, i) => [`${noms[i]}-0`, `${n}-0`]);
    const d = donnees(ps, unions);
    for (const [a, b] of unions)
      expect(
        couleursProches(
          couleurFamille(
            d.personnes.find((p) => p.id === a)!,
            d,
          )!,
          couleurFamille(
            d.personnes.find((p) => p.id === b)!,
            d,
          )!,
        ),
      ).toBe(false);
  });
  it('est mémorisée par objet de données', () => {
    const d = donnees([personne('a', 'Martin')]);
    expect(couleursDesFamilles(d)).toBe(couleursDesFamilles(d));
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

describe('lieux dans les libellés (naissance, décès, union)', () => {
  it('ajoute « à <lieu> » après la date, ou seul sans date', () => {
    expect(libelleNaissance('1950-02-08', 'F', 'Quimper')).toBe('née le 8 février 1950 à Quimper');
    expect(libelleNaissance(undefined, 'M', ' Brest ')).toBe('né à Brest');
    expect(libelleNaissance('1950', 'M', '  ')).toBe('né en 1950');
    expect(libelleDeces('2024-01-14', 'F', true, 'Lorient')).toBe('décédée le 14 janvier 2024 à Lorient');
    expect(libelleDeces(undefined, 'M', true, 'Lorient')).toBe('décédé à Lorient');
    expect(libelleDeces(undefined, 'M', true)).toBe('décédé');
    expect(libelleUnion('1975', 'Brest')).toBe('en 1975 à Brest');
    expect(libelleUnion(undefined, undefined)).toBe('');
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
  it('formule une date sans année', () => {
    expect(libelleNaissance('--10-24', 'F')).toBe('née le 24 octobre');
    expect(libelleNaissance('--05-01')).toBe('né(e) le 1er mai');
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
  it('avec sansAnnee, assemble jour et mois en « --MM-JJ » et découpe en retour', () => {
    expect(assemblerDate({ jour: '4', mois: '5', annee: '' }, 'de naissance', true)).toBe('--05-04');
    expect(decouperDate('--05-04')).toEqual({ jour: '4', mois: '5', annee: '' });
    expect(assemblerDate({ jour: '4', mois: '5', annee: '1961' }, 'de naissance', true)).toBe('1961-05-04');
  });
  it('avec sansAnnee, refuse encore un mois seul ou un jour seul', () => {
    expect(() => assemblerDate({ jour: '', mois: '5', annee: '' }, 'de naissance', true)).toThrow('année ou le jour');
    expect(() => assemblerDate({ jour: '4', mois: '', annee: '' }, 'de naissance', true)).toThrow('mois');
    expect(() => assemblerDate({ jour: 'x', mois: '5', annee: '' }, 'de naissance', true)).toThrow('Jour');
  });
});

describe('accords des étiquettes', () => {
  it('accorde « Marié » et « Adoptif » selon le sexe de la personne affichée', () => {
    expect([libelleMarie('M'), libelleMarie('F'), libelleMarie()]).toEqual(['Marié', 'Mariée', 'Marié(e)']);
    expect([libelleAdoptif('M'), libelleAdoptif('F'), libelleAdoptif()]).toEqual(['Adoptif', 'Adoptive', 'Adoptif(ve)']);
  });
});
