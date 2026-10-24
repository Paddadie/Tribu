import { describe, expect, it } from 'vitest';
import { amis, chemin, nomGroupe, raisonGroupe } from './deductions';
import { disposerFoyer, familleProche, type FamilleProche } from './familleProche';
import {
  aDesLiens,
  ajouterAuGroupe,
  ajouterFiliation,
  ajouterUnion,
  creerGroupe,
  creerPersonne,
  donneesVides,
  groupesDe,
  renommerGroupe,
  retirerDuGroupe,
  separerUnion,
  supprimerGroupe,
  supprimerPersonne,
} from './modele';
import { etiquette, motsChemin } from './parente';
import type { Donnees, Sexe, TypeFiliation } from './types';

/**
 * Famille de la maquette FEAT-09 (sexe entre crochets, parents après la flèche ; Mathis est « Moi ») :
 * Agnès [F] ∞ Bruno [M] ; Sophie [F], Hugo [M] ← Agnès, Bruno ; Marc [M] ∞ Sophie ; Mathis [M] ← Marc, Sophie
 * Hugo + Nadia [F] ; Camille [F] ← Hugo, Nadia ; Jade [F] ← Hugo, Nadia (adoptée) ; Camille + Théo [M] ; Lou [F] ← Camille, Théo
 * Jean [M] ∞ Claire [F] ; Inès [F] ← Jean, Claire ; Mathis ∞ Inès ; Rose [F], Élio [M] ← Mathis, Inès
 * Amis : Mathis – Karim [M], Inès – Julie [F]. Samia [F] → mère de Karim ; Karim + Léa [F] ; Naël [M] ← Karim, Léa.
 * Sacha [?] : personne sans aucun lien.
 */
function famille() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  const pers = (prenom: string, sexe: Sexe | undefined, annee: string) => {
    const r = creerPersonne(d, { prenom, nom: 'X', sexe, naissance: annee });
    d = r.donnees;
    id[prenom] = r.personne.id;
  };
  const union = (a: string, b: string, marie = false) => (d = ajouterUnion(d, id[a], id[b], marie).donnees);
  const enfant = (e: string, parents: string[], type: TypeFiliation = 'biologique') =>
    parents.forEach((p) => (d = ajouterFiliation(d, id[p], id[e], type).donnees));
  const ami = (a: string, b: string) => (d = creerGroupe(d, [id[a], id[b]]).donnees);

  pers('Mathis', 'M', '1990');
  pers('Marc', 'M', '1962');
  pers('Sophie', 'F', '1964');
  pers('Agnès', 'F', '1941');
  pers('Bruno', 'M', '1938');
  pers('Hugo', 'M', '1966');
  pers('Nadia', 'F', '1968');
  pers('Camille', 'F', '1991');
  pers('Jade', 'F', '2003');
  pers('Théo', 'M', '1990');
  pers('Lou', 'F', '2019');
  pers('Jean', 'M', '1960');
  pers('Claire', 'F', '1962');
  pers('Inès', 'F', '1992');
  pers('Rose', 'F', '2021');
  pers('Élio', 'M', '2023');
  pers('Karim', 'M', '1989');
  pers('Samia', 'F', '1961');
  pers('Léa', 'F', '1993');
  pers('Naël', 'M', '2022');
  pers('Julie', 'F', '1992');
  pers('Sacha', undefined, '1990');

  union('Agnès', 'Bruno', true);
  union('Marc', 'Sophie', true);
  union('Hugo', 'Nadia');
  union('Camille', 'Théo');
  union('Jean', 'Claire', true);
  union('Mathis', 'Inès', true);
  union('Karim', 'Léa');

  enfant('Sophie', ['Agnès', 'Bruno']);
  enfant('Hugo', ['Agnès', 'Bruno']);
  enfant('Mathis', ['Marc', 'Sophie']);
  enfant('Camille', ['Hugo', 'Nadia']);
  enfant('Jade', ['Hugo', 'Nadia'], 'adoptif');
  enfant('Lou', ['Camille', 'Théo']);
  enfant('Inès', ['Jean', 'Claire']);
  enfant('Rose', ['Mathis', 'Inès']);
  enfant('Élio', ['Mathis', 'Inès']);
  enfant('Karim', ['Samia']);
  enfant('Naël', ['Karim', 'Léa']);

  ami('Mathis', 'Karim');
  ami('Inès', 'Julie');

  return { d, id };
}

const { d, id } = famille();
const prenoms = (x: Donnees, vers: string) => chemin(x, id.Mathis, id[vers])?.map((e) => e.personne.prenom);
const phrase = (x: Donnees, vers: string) => {
  const etapes = chemin(x, id.Mathis, id[vers]);
  return etapes && ['Toi', ...motsChemin(etapes)].join(' → ');
};
const lib = (x: Donnees, vers: string) => etiquette(x, id.Mathis, id[vers]);

describe('groupes d’amis', () => {
  it('enregistrent le groupe avec son nom nettoyé', () => {
    const x = creerGroupe(d, [id.Mathis, id.Julie, id.Sacha], ' Lycée ').donnees;
    expect(x.groupes[x.groupes.length - 1].nom).toBe('Lycée');
  });

  it('exigent deux personnes existantes et distinctes', () => {
    expect(() => creerGroupe(d, [id.Karim])).toThrow('au moins deux');
    expect(() => creerGroupe(d, [id.Karim, id.Karim])).toThrow('au moins deux');
    expect(() => creerGroupe(d, [id.Karim, 'fantôme'])).toThrow('introuvable');
    // Famille comprise : une cousine peut aussi être une amie.
    expect(creerGroupe(d, [id.Mathis, id.Camille]).donnees.groupes).toHaveLength(3);
  });

  it('se lisent des deux côtés, par ordre alphabétique', () => {
    const x = creerGroupe(d, [id.Mathis, id.Julie]).donnees;
    expect(amis(x, id.Mathis).map((p) => p.prenom)).toEqual(['Julie', 'Karim']);
    expect(amis(x, id.Karim).map((p) => p.prenom)).toEqual(['Mathis']);
    expect(groupesDe(x, id.Mathis)).toHaveLength(2);
  });

  it('accueillent un nouveau membre, une seule fois', () => {
    const g = d.groupes[0];
    const x = ajouterAuGroupe(d, g.id, id.Julie);
    expect(amis(x, id.Karim).map((p) => p.prenom)).toEqual(['Julie', 'Mathis']);
    expect(() => ajouterAuGroupe(x, g.id, id.Julie)).toThrow('déjà');
    expect(() => ajouterAuGroupe(d, 'fantôme', id.Julie)).toThrow('introuvable');
  });

  it('perdent un membre, et disparaissent quand il en reste moins de deux', () => {
    const g = d.groupes[0];
    const trois = ajouterAuGroupe(d, g.id, id.Julie);
    expect(retirerDuGroupe(trois, g.id, id.Julie).groupes).toHaveLength(2);
    const reste = retirerDuGroupe(d, g.id, id.Karim);
    expect(reste.groupes.map((x) => x.id)).not.toContain(g.id);
    expect(amis(reste, id.Mathis)).toEqual([]);
    expect(() => retirerDuGroupe(d, g.id, id.Julie)).toThrow('pas dans');
  });

  it('se renomment et se suppriment sans toucher aux fiches', () => {
    const g = d.groupes[0];
    expect(renommerGroupe(d, g.id, ' Copains ').groupes[0].nom).toBe('Copains');
    const x = supprimerGroupe(d, g.id);
    expect(x.groupes).toHaveLength(1);
    expect(x.personnes).toHaveLength(d.personnes.length);
    expect(() => supprimerGroupe(d, 'fantôme')).toThrow();
  });

  it('comptent comme un lien et suivent la personne supprimée', () => {
    expect(aDesLiens(d, id.Julie)).toBe(true);
    expect(supprimerPersonne(d, id.Julie).groupes).toHaveLength(1);
    expect(supprimerPersonne(d, id.Karim).groupes.map((g) => g.membres)).toEqual([[id.Inès, id.Julie]]);
  });

  it('prennent un nom par défaut tiré des membres', () => {
    expect(nomGroupe(d, d.groupes[0])).toBe('Groupe de Karim, Mathis');
    expect(nomGroupe(d, renommerGroupe(d, d.groupes[0].id, 'Copains').groupes[0])).toBe('Copains');
  });

  it('disent pourquoi une personne déjà groupée ne peut pas entrer', () => {
    const personne = (i: string) => d.personnes.find((p) => p.id === i)!;
    expect(raisonGroupe(d, personne(id.Karim), d.groupes[0])).toBe('Déjà dans le groupe');
    expect(raisonGroupe(d, personne(id.Karim), d.groupes[1])).toBe('Déjà dans « Groupe de Karim, Mathis »');
    expect(raisonGroupe(d, personne(id.Karim))).toBe('Déjà dans « Groupe de Karim, Mathis »');
  });
});

describe('chemin depuis « Moi »', () => {
  it('passe par la famille, du plus court, en suivant les parents d’abord', () => {
    expect(prenoms(d, 'Lou')).toEqual(['Mathis', 'Sophie', 'Hugo', 'Camille', 'Lou']);
    expect(phrase(d, 'Lou')).toBe('Toi → ta mère → son frère → sa fille → sa fille');
    expect(phrase(d, 'Jean')).toBe('Toi → ton épouse → son père');
  });

  it('va directement à un proche (pas de dessin pour un lien direct)', () => {
    expect(prenoms(d, 'Inès')).toEqual(['Mathis', 'Inès']);
    expect(prenoms(d, 'Karim')).toEqual(['Mathis', 'Karim']);
  });

  it('passe par un ami pour qui n’est pas de la famille', () => {
    expect(phrase(d, 'Léa')).toBe('Toi → ton ami → sa copine');
    expect(phrase(d, 'Julie')).toBe('Toi → ton épouse → son amie');
    expect(phrase(d, 'Naël')).toBe('Toi → ton ami → son fils');
  });

  it('préfère la famille même quand une amitié serait plus courte', () => {
    const x = creerGroupe(d, [id.Mathis, id.Camille]).donnees;
    expect(prenoms(x, 'Camille')).toEqual(['Mathis', 'Sophie', 'Hugo', 'Camille']);
  });

  it('ne passe jamais par un ex', () => {
    const union = d.unions.find((u) => u.personneA === id.Karim && u.personneB === id.Léa)!;
    const x = separerUnion(d, union.id);
    // Léa reste reliée par son fils, plus par le couple.
    expect(prenoms(x, 'Léa')).toEqual(['Mathis', 'Karim', 'Naël', 'Léa']);
    const sansFils = separerUnion(supprimerPersonne(d, id.Naël), union.id);
    expect(prenoms(sansFils, 'Léa')).toBeUndefined();
  });

  it('rien pour soi-même ni pour une personne sans lien', () => {
    expect(chemin(d, id.Mathis, id.Mathis)).toBeUndefined();
    expect(prenoms(d, 'Sacha')).toBeUndefined();
  });
});

describe('étiquettes courtes', () => {
  it('famille : sans possessif, conjoint marié dit « Époux » ou « Épouse »', () => {
    expect(lib(d, 'Mathis')).toBe('Toi');
    expect(lib(d, 'Hugo')).toBe('Oncle');
    expect(lib(d, 'Camille')).toBe('Cousine');
    expect(lib(d, 'Inès')).toBe('Épouse');
    expect(lib(d, 'Jean')).toBe('Beau-père');
    expect(etiquette(d, id.Inès, id.Mathis)).toBe('Époux');
  });

  it('un lien de famille sans nom usuel n’a pas d’étiquette', () => {
    // Petite-cousine : fille d'une cousine.
    expect(lib(d, 'Lou')).toBeUndefined();
  });

  it('hors famille : nommée depuis l’ami le plus proche', () => {
    expect(lib(d, 'Karim')).toBe('Ami');
    expect(lib(d, 'Julie')).toBe('Amie d’Inès');
    expect(lib(d, 'Léa')).toBe('Copine de Karim');
    expect(lib(d, 'Naël')).toBe('Fils de Karim');
    expect(lib(d, 'Samia')).toBe('Mère de Karim');
    const sansCouple = separerUnion(d, d.unions.find((u) => u.personneA === id.Karim)!.id);
    expect(lib(sansCouple, 'Léa')).toBe('Proche de Karim');
  });

  it('hors famille : le lien le plus court avec l’ami, pas le détour par ses parents', () => {
    let x = d;
    for (const [prenom, sexe] of [
      ['Zoé', 'F'],
      ['Eli', 'M'],
      ['Tom', 'M'],
    ] as const) {
      const r = creerPersonne(x, { prenom, nom: 'X', sexe, naissance: '2000' });
      x = r.donnees;
      id[prenom] = r.personne.id;
    }
    x = ajouterFiliation(x, id.Samia, id.Zoé, 'biologique').donnees;
    x = ajouterFiliation(x, id.Samia, id.Eli, 'biologique').donnees;
    x = ajouterFiliation(x, id.Eli, id.Tom, 'biologique').donnees;
    expect(lib(x, 'Zoé')).toBe('Sœur de Karim');
    expect(lib(x, 'Tom')).toBe('Neveu de Karim');
    const etapes = chemin(x, id.Mathis, id.Tom)!;
    expect(['Toi', ...motsChemin(etapes, x)].join(' → ')).toBe('Toi → ton ami → son neveu');
    expect(['Toi', ...motsChemin(chemin(x, id.Mathis, id.Zoé)!, x)].join(' → ')).toBe('Toi → ton ami → sa sœur');
  });

  it('la famille l’emporte sur l’amitié', () => {
    expect(lib(creerGroupe(d, [id.Mathis, id.Camille]).donnees, 'Camille')).toBe('Cousine');
  });

  it('accorde selon le sexe, forme mixte sans sexe connu', () => {
    const x = creerGroupe(d, [id.Mathis, id.Sacha]).donnees;
    expect(lib(x, 'Sacha')).toBe('Ami(e)');
    expect(phrase(x, 'Sacha')).toBe('Toi → ton ami(e)');
    expect(lib(creerGroupe(d, [id.Karim, id.Sacha]).donnees, 'Sacha')).toBe('Ami(e) de Karim');
  });

  it('rien pour une personne sans lien', () => {
    expect(lib(d, 'Sacha')).toBeUndefined();
  });
});

describe('famille proche (dessin de la fiche)', () => {
  const prenoms = (f: FamilleProche, ids: (string | null)[]) => ids.map((x) => (x ? f.personnes.get(x)!.prenom : null));

  it('parents, conjoint, frères et sœurs, enfants avec leur lien', () => {
    const f = familleProche(d, id.Hugo, id.Mathis);
    expect(prenoms(f, f.couples[0].membres)).toEqual(['Agnès', 'Bruno']);
    expect(f.couples[0].manque).toBe(false);
    expect(f.conjoint?.id).toBe(id.Nadia);
    expect(
      prenoms(
        f,
        f.freres.map((x) => x.id),
      ),
    ).toEqual(['Sophie']);
    expect(f.enfants.map((e) => [f.personnes.get(e.id)!.prenom, e.adoptif, e.autre === id.Nadia])).toEqual([
      ['Camille', false, true],
      ['Jade', true, true],
    ]);
  });

  it('demi-frères et sœurs groupés par leur parent dessiné en commun et leur autre parent, le plus récent d’abord', () => {
    expect(familleProche(d, id.Hugo, id.Mathis).autresCouples).toEqual([]);
    let y = d;
    const ajout = (prenom: string, naissance: string, parents: string[]) => {
      const r = creerPersonne(y, { prenom, nom: 'X', naissance });
      y = r.donnees;
      for (const par of parents) y = ajouterFiliation(y, par, r.personne.id, 'biologique').donnees;
      return r.personne.id;
    };
    const autre = ajout('Yves', '1950', []);
    ajout('Zoé', '1985', [id.Agnès, autre]);
    ajout('Axel', '1975', [id.Bruno]);
    const f = familleProche(y, id.Hugo, id.Mathis);
    expect(
      f.autresCouples.map((a) => [
        ...prenoms(f, [a.parent, a.autre]),
        ...prenoms(
          f,
          a.enfants.map((e) => e.id),
        ),
      ]),
    ).toEqual([
      ['Agnès', 'Yves', 'Zoé'],
      ['Bruno', null, 'Axel'],
    ]);
    expect(
      prenoms(
        f,
        f.freres.map((x) => x.id),
      ),
    ).toEqual(['Sophie']);
  });

  it('les enfants d’une autre union pendent de la personne seule, à droite de ceux du couple', () => {
    const x = creerPersonne(d, { prenom: 'Malo', nom: 'X', naissance: '2014' });
    const malo = x.personne.id;
    const y = ajouterFiliation(x.donnees, id.Théo, malo, 'biologique').donnees;
    const f = familleProche(y, id.Théo, id.Mathis);
    expect(f.enfants.map((e) => [f.personnes.get(e.id)!.prenom, e.autre === f.conjoint?.id])).toEqual([
      ['Malo', false],
      ['Lou', true],
    ]);
    // Le couple à gauche de la personne : ses enfants aussi, même plus jeunes.
    const dis = disposerFoyer(f, 360);
    const x0 = (p: string) => dis.noeuds.find((n) => n.personne?.prenom === p)!.x;
    expect(x0('Lou')).toBeLessThan(x0('Malo'));
  });

  it('case « + Parent » pour la famille seulement ; un parent adoptif en plus forme son propre couple', () => {
    const manque = (x: string, moi?: string) => familleProche(d, x, moi).couples.some((K) => K.manque);
    expect(manque(id.Marc, id.Mathis)).toBe(true);
    expect(manque(id.Samia, id.Mathis)).toBe(false);
    expect(manque(id.Samia)).toBe(true);
    expect(manque(id.Karim, id.Mathis)).toBe(false);
    // Deux parents biologiques et un adoptif : les biologiques d'abord.
    const x = creerPersonne(d, { prenom: 'Paul', nom: 'X' });
    const z = ajouterFiliation(x.donnees, x.personne.id, id.Mathis, 'adoptif').donnees;
    // Filiation adoptive enregistrée en premier : l'ordre de saisie ne compte pas.
    const y = { ...z, filiations: [z.filiations[z.filiations.length - 1], ...z.filiations.slice(0, -1)] };
    const f = familleProche(y, id.Mathis, id.Mathis);
    expect(f.couples.map((K) => [prenoms(f, K.membres), K.adoptif, K.manque])).toEqual([
      [['Marc', 'Sophie'], false, false],
      [['Paul'], true, false],
    ]);
  });
});

describe('ami le plus proche en âge', () => {
  it('départage deux amis à égale distance : le beau-frère est celui de l’ami au plus près de mon âge', () => {
    let x: Donnees = d;
    const nouveau = (prenom: string, sexe: Sexe, naissance?: string) => {
      const r = creerPersonne(x, { prenom, nom: 'X', sexe, naissance });
      x = r.donnees;
      return r.personne.id;
    };
    // Adrien (1975) passe avant Yann (1989) par ordre alphabétique, mais Mathis est né en 1990.
    const adrien = nouveau('Adrien', 'M', '1975');
    const yann = nouveau('Yann', 'M', '1989');
    const zora = nouveau('Zora', 'F', '1982');
    const cedric = nouveau('Cédric', 'M', '1980');
    const pere = nouveau('Pierre', 'M', '1950');
    [adrien, yann, zora].forEach((e) => (x = ajouterFiliation(x, pere, e, 'biologique').donnees));
    x = ajouterUnion(x, zora, cedric, true).donnees;
    x = creerGroupe(x, [id.Mathis, adrien, yann]).donnees;
    expect(etiquette(x, id.Mathis, cedric)).toBe('Beau-frère d’Yann');
  });
});
