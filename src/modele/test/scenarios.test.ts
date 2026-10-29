// Scénarios de liaison L1 à L5 (V4, lot 0), joués dans tous les ordres de leurs étapes indépendantes :
// les invariants tiennent après chaque étape et l'état final ne dépend pas de l'ordre (à l'identifiant près).
// Un `it.fails` signale un défaut connu, corrigé dans un lot suivant : il passera au vert sans `fails` ce jour-là (aucun depuis le lot 1).
import { describe, expect, it } from 'vitest';
import { fratrie } from '../deductions';
import {
  ajouterFiliations,
  ajouterFrereSansParent,
  ajouterUnion,
  creerPersonne,
  definirMariageParents,
  donneesVides,
  modifierPersonne,
  quiPeutReprendreSonNom,
  reprendreNomDeNaissance,
  separerUnion,
} from '../modele';
import { enregistrerParentSansNom, PARENT_INCONNU, PREFIXE_VIRTUEL, remplacerParent } from '../parentSansNom';
import type { Donnees, Sexe } from '../types';
import { canonique, finsSelonLOrdre, jouer, type Etape } from './outils';

/** Données de départ : des personnes sans lien, et leurs ids par prénom. */
function depart(personnes: [prenom: string, sexe: Sexe, nom: string][]): { d: Donnees; id: (prenom: string) => string } {
  let d = donneesVides();
  const ids = new Map<string, string>();
  for (const [prenom, sexe, nom] of personnes) {
    const r = creerPersonne(d, { prenom, sexe, nom });
    d = r.donnees;
    ids.set(prenom, r.personne.id);
  }
  return { d, id: (prenom) => ids.get(prenom)! };
}

const unir =
  (a: string, b: string, marie = false, statut: 'actuelle' | 'separee' = 'actuelle'): Etape =>
  (d) =>
    ajouterUnion(d, a, b, marie, statut).donnees;
const enfantDe =
  (parents: string[], enfant: string, type: 'biologique' | 'adoptif' = 'biologique'): Etape =>
  (d) =>
    ajouterFiliations(d, parents, enfant, type);
const frere =
  (fiche: string, autre: string): Etape =>
  (d) =>
    ajouterFrereSansParent(d, fiche, autre);
const prenoms = (ps: { prenom: string }[]) => ps.map((p) => p.prenom).sort();

describe('L1 : couple et enfants, dans tous les ordres', () => {
  const { d, id } = depart([
    ['Marc', 'M', 'Lambert'],
    ['Sophie', 'F', 'Kervadec'],
    ['Jade', 'F', 'Lambert'],
    ['Malo', 'M', 'Lambert'],
  ]);
  const [marc, sophie, jade, malo] = ['Marc', 'Sophie', 'Jade', 'Malo'].map(id);

  it('couple, puis chaque enfant (6 ordres) : même état final', () => {
    expect(finsSelonLOrdre(d, [unir(marc, sophie, true), enfantDe([marc, sophie], jade), enfantDe([marc, sophie], malo)]).size).toBe(1);
  });

  it('enfants reliés un parent à la fois, couple en dernier ou n’importe quand (120 ordres) : même état que par le couple', () => {
    const parCouple = canonique(jouer(d, [unir(marc, sophie, true), enfantDe([marc, sophie], jade), enfantDe([marc, sophie], malo)])).join('\n');
    const fins = finsSelonLOrdre(d, [
      unir(marc, sophie, true),
      enfantDe([marc], jade),
      enfantDe([sophie], jade),
      enfantDe([marc], malo),
      enfantDe([sophie], malo),
    ]);
    expect([...fins.keys()]).toEqual([parCouple]);
  });
});

describe('L2 : frère sans parent, puis les parents', () => {
  const { d, id } = depart([
    ['Arthur', 'M', 'Rochefort'],
    ['Lison', 'F', 'Rochefort'],
    ['Noé', 'M', 'Rochefort'],
    ['Henri', 'M', 'Rochefort'],
    ['Jeanne', 'F', 'Rochefort'],
  ]);
  const [arthur, lison, noe, henri, jeanne] = ['Arthur', 'Lison', 'Noé', 'Henri', 'Jeanne'].map(id);
  const fratrieSansParents = [frere(arthur, lison), frere(lison, noe)];

  it('les deux parents d’un coup : toute la fratrie les reçoit, l’inconnu disparaît', () => {
    const fin = jouer(d, [...fratrieSansParents, enfantDe([henri, jeanne], arthur)]);
    expect(fin.personnes.some((p) => p.inconnu)).toBe(false);
    expect(prenoms(fratrie(fin, noe).freresSoeurs)).toEqual(['Arthur', 'Lison']);
  });

  it('le premier parent seul : toute la fratrie le reçoit', () => {
    const fin = jouer(d, [...fratrieSansParents, enfantDe([henri], arthur)]);
    expect(prenoms(fratrie(fin, lison).freresSoeurs)).toEqual(['Arthur', 'Noé']);
  });

  // Point 6 : présomption de fratrie, le second parent va aussi aux frères et sœurs qui n'avaient que le premier.
  it('puis le second parent : la fratrie entière doit suivre', () => {
    const fin = jouer(d, [...fratrieSansParents, enfantDe([henri], arthur), enfantDe([jeanne], arthur)]);
    expect(prenoms(fratrie(fin, noe).freresSoeurs)).toEqual(['Arthur', 'Lison']);
  });

  // Point 6 : même règle vue par l'ordre des étapes ; un frère ajouté après les deux parents les reçoit aussi.
  it('parents et frère dans tous les ordres : même état final', () => {
    expect(finsSelonLOrdre(d, [enfantDe([henri], arthur), enfantDe([jeanne], arthur), frere(lison, arthur)]).size).toBe(1);
  });
});

describe('L3 : parent, ex, enfant de l’ex', () => {
  const { d, id } = depart([
    ['Marc', 'M', 'Lambert'],
    ['Aurélie', 'F', 'Kervadec'],
    ['Théo', 'M', 'Lambert'],
  ]);
  const [marc, aurelie, theo] = ['Marc', 'Aurélie', 'Théo'].map(id);

  it('ex, enfant du parent, puis l’ex en second parent (6 ordres) : même état, deux parents', () => {
    const etapes = [unir(marc, aurelie, false, 'separee'), enfantDe([marc], theo), enfantDe([aurelie], theo)];
    const fins = finsSelonLOrdre(d, etapes);
    expect(fins.size).toBe(1);
    expect([...fins.keys()][0]).toContain('Aurélie > Théo biologique');
  });

  describe('« ? » remplacé (`remplacerParent`, point 5)', () => {
    const plus = depart([
      ['Marc', 'M', 'Lambert'],
      ['Aurélie', 'F', 'Kervadec'],
      ['Théo', 'M', 'Lambert'],
      ['Léa', 'F', 'Lambert'],
      ['Inès', 'F', 'Roussel'],
    ]);
    const [m, a, t, l, i] = ['Marc', 'Aurélie', 'Théo', 'Léa', 'Inès'].map(plus.id);
    // Marc, son ex Aurélie, deux enfants qui n'ont que Marc : un seul « ? » virtuel pour les deux.
    const base = jouer(plus.d, [unir(m, a, false, 'separee'), enfantDe([m], t), enfantDe([m], l)]);
    const virtuel = `${PREFIXE_VIRTUEL}${m}`;
    const enregistre = enregistrerParentSansNom(base, virtuel)!;
    const attendu = canonique(jouer(base, [enfantDe([m, a], t, 'biologique')])).join('\n');
    const remplacer =
      (qui: string, par: string): Etape =>
      (x) =>
        remplacerParent(x, qui, par);

    it('par l’ex, depuis le « ? » virtuel ou enregistré, ou en l’ajoutant comme parent : même état, aucune union en plus', () => {
      const fins = [
        jouer(base, [remplacer(virtuel, a)]),
        jouer(enregistre.donnees, [remplacer(enregistre.personne.id, a)]),
        jouer(enregistre.donnees, [enfantDe([a], t)]),
      ].map((x) => canonique(x).join('\n'));
      expect(new Set(fins)).toEqual(new Set([attendu]));
      expect(attendu).toContain('Aurélie > Léa biologique');
      expect(attendu).toContain('Aurélie + Marc en couple separee');
    });

    it('par une personne nouvelle : elle devient parent des deux enfants, le « ? » disparaît', () => {
      const fin = jouer(enregistre.donnees, [remplacer(enregistre.personne.id, i)]);
      expect(fin.personnes.some((p) => p.sansNom)).toBe(false);
      expect(prenoms(fratrie(fin, t).freresSoeurs)).toEqual(['Léa']);
      expect(canonique(fin)).toContain('Inès > Théo biologique');
    });

    it('un parent inconnu caché se remplace aussi, pour toute la fratrie', () => {
      const freres = jouer(plus.d, [frere(t, l)]);
      const inconnu = freres.personnes.find((p) => p.inconnu)!.id;
      const fin = jouer(freres, [remplacer(inconnu, a)]);
      expect(canonique(fin)).toEqual(expect.arrayContaining(['Aurélie > Léa biologique', 'Aurélie > Théo biologique']));
      expect(fin.personnes.some((p) => p.inconnu)).toBe(false);
    });

    it('refuse le parent lui-même, un enfant (boucle) ou un « ? » ; un « ? » annoté garde sa place', () => {
      expect(() => remplacerParent(base, virtuel, m)).toThrow('déjà un parent');
      expect(() => remplacerParent(base, virtuel, t)).toThrow('boucle');
      expect(() => remplacerParent(base, m, a)).toThrow('Seul un parent inconnu');
      const annote = modifierPersonne(enregistre.donnees, enregistre.personne.id, { prenom: PARENT_INCONNU, nom: '', note: 'rencontré à Valbrume' });
      expect(() => ajouterFiliations(annote, [a], t, 'biologique')).toThrow('au plus 2 parents');
      const remplace = remplacerParent(annote, enregistre.personne.id, a);
      expect(remplace.personnes.find((p) => p.id === a)!.note).toBe('rencontré à Valbrume');
    });

    it('reporte l’union du « ? » sur la personne, sans doublon', () => {
      const marie = definirMariageParents(enregistre.donnees, m, enregistre.personne.id, true);
      expect(canonique(jouer(marie, [remplacer(enregistre.personne.id, i)]))).toContain('Inès + Marc mariés separee');
      expect(canonique(jouer(marie, [remplacer(enregistre.personne.id, a)])).filter((x) => x.includes(' + '))).toEqual(['Aurélie + Marc en couple separee']);
    });
  });
});

describe('L4 : famille recomposée, adoption, inconnus fusionnés', () => {
  it('ex, nouveau couple, enfants des deux unions, adoption par la belle-mère (120 ordres) : même état, demis réciproques', () => {
    const { d, id } = depart([
      ['Marc', 'M', 'Lambert'],
      ['Aurélie', 'F', 'Kervadec'],
      ['Nathalie', 'F', 'Pellegrue'],
      ['Théo', 'M', 'Lambert'],
      ['Sophie', 'F', 'Lambert'],
    ]);
    const [marc, aurelie, nathalie, theo, sophie] = ['Marc', 'Aurélie', 'Nathalie', 'Théo', 'Sophie'].map(id);
    const etapes = [
      unir(marc, aurelie, false, 'separee'),
      unir(marc, nathalie, true),
      enfantDe([marc, aurelie], theo),
      enfantDe([marc, nathalie], sophie),
      enfantDe([nathalie], theo, 'adoptif'),
    ];
    const fins = finsSelonLOrdre(d, etapes);
    expect(fins.size).toBe(1);
    const fin = jouer(d, etapes);
    expect(prenoms(fratrie(fin, theo).demis)).toEqual(['Sophie']);
    expect(prenoms(fratrie(fin, sophie).demis)).toEqual(['Théo']);
  });

  it('trois liens de fratrie sans parents (6 ordres) : un seul inconnu pour les quatre', () => {
    const { d, id } = depart([
      ['Albane', 'F', 'Ferrandi'],
      ['Baptiste', 'M', 'Ferrandi'],
      ['Clément', 'M', 'Ferrandi'],
      ['Delphine', 'F', 'Ferrandi'],
    ]);
    const [a, b, c, e] = ['Albane', 'Baptiste', 'Clément', 'Delphine'].map(id);
    const fins = finsSelonLOrdre(d, [frere(a, b), frere(c, e), frere(b, c)]);
    expect(fins.size).toBe(1);
    expect([...fins.keys()][0]).toContain('inconnu(Albane,Baptiste,Clément,Delphine) > Albane biologique');
  });
});

describe('L5 : mariage, divorce, remariage', () => {
  const { d, id } = depart([
    ['Hubert', 'M', 'Vasseur'],
    ['Lucia', 'F', 'Martinez'],
    ['Romain', 'M', 'Garnier'],
  ]);
  const [hubert, lucia, romain] = ['Hubert', 'Lucia', 'Romain'].map(id);
  const nomDe = (x: Donnees) => x.personnes.find((p) => p.id === lucia)!;

  it('prend le nom au mariage, le garde à la séparation, prend le nouveau au remariage ; le nom de jeune fille reste', () => {
    const marie = jouer(d, [unir(hubert, lucia, true)]);
    expect(nomDe(marie)).toMatchObject({ nom: 'Vasseur', nomNaissance: 'Martinez' });
    const separee = jouer(marie, [(x) => separerUnion(x, x.unions[0].id)]);
    expect(nomDe(separee)).toMatchObject({ nom: 'Vasseur', nomNaissance: 'Martinez' });
    const remariee = jouer(separee, [unir(romain, lucia, true)]);
    expect(nomDe(remariee)).toMatchObject({ nom: 'Garnier', nomNaissance: 'Martinez' });
  });

  it('reprise du nom de naissance proposée à la séparation, puis remariage (`reprendreNomDeNaissance`, point 2)', () => {
    const separee = jouer(d, [unir(hubert, lucia, true), (x) => separerUnion(x, x.unions[0].id)]);
    expect(quiPeutReprendreSonNom(separee, separee.unions[0].id).map((p) => p.prenom)).toEqual(['Lucia']);
    const reprise = jouer(separee, [(x) => reprendreNomDeNaissance(x, lucia)]);
    expect(nomDe(reprise).nom).toBe('Martinez');
    expect(nomDe(reprise).nomNaissance).toBeUndefined();
    expect(nomDe(jouer(reprise, [unir(romain, lucia, true)]))).toMatchObject({ nom: 'Garnier', nomNaissance: 'Martinez' });
  });
});
