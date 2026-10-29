import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { chemin, familleElargie, fratrie, liensParents, parentsCommuns, relation } from './deductions';
import { familleProche } from './familleProche';
import {
  aDesLiens,
  ajouterFiliation,
  ajouterFiliations,
  ajouterFrereSansParent,
  creerPersonne,
  donneesVides,
  personnesVisibles,
  supprimerFiliation,
  supprimerPersonne,
} from './modele';
import { lienAvecMoi, motsChemin } from './parente';
import { estDonneesValides } from './stockage';
import type { Donnees } from './types';

/** Des personnes sans lien, par prénom. */
function avec(...noms: string[]): { d: Donnees; id: Record<string, string> } {
  let d = donneesVides();
  const id: Record<string, string> = {};
  for (const prenom of noms) {
    const r = creerPersonne(d, { prenom, nom: 'Martin' });
    d = r.donnees;
    id[prenom] = r.personne.id;
  }
  return { d, id };
}

const inconnus = (d: Donnees) => d.personnes.filter((p) => p.inconnu);
const nomsDe = (l: { prenom: string }[]) => l.map((p) => p.prenom).sort();

describe('frère ou sœur sans parent connu', () => {
  it('relie deux personnes sans parent par un parent inconnu caché', () => {
    const { d, id } = avec('Ana', 'Bob');
    const r = ajouterFrereSansParent(d, id.Ana, id.Bob);

    expect(inconnus(r)).toHaveLength(1);
    expect(personnesVisibles(r).map((p) => p.prenom)).toEqual(['Ana', 'Bob']);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob']);
    expect(nomsDe(fratrie(r, id.Bob).freresSoeurs)).toEqual(['Ana']);
    expect(fratrie(r, id.Ana).demis).toEqual([]);
    expect(liensParents(r, id.Ana)).toEqual([]);
    expect(parentsCommuns(r, id.Ana, id.Bob)).toEqual([]);
    expect(relation(r, id.Ana, id.Bob)).toMatchObject({ type: 'sang', montee: 1, descente: 1, demi: false });
  });

  it('ne modifie pas les données reçues', () => {
    const { d, id } = avec('Ana', 'Bob');
    ajouterFrereSansParent(d, id.Ana, id.Bob);
    expect(d.personnes).toHaveLength(2);
    expect(d.filiations).toHaveLength(0);
  });

  it('un troisième frère rejoint le même parent inconnu', () => {
    const { d, id } = avec('Ana', 'Bob', 'Cléo');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFrereSansParent(r, id.Ana, id.Cléo);

    expect(inconnus(r)).toHaveLength(1);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob', 'Cléo']);
    expect(nomsDe(fratrie(r, id.Cléo).freresSoeurs)).toEqual(['Ana', 'Bob']);
  });

  it('ajouté depuis le frère : même résultat', () => {
    const { d, id } = avec('Ana', 'Bob', 'Cléo');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFrereSansParent(r, id.Cléo, id.Bob);
    expect(inconnus(r)).toHaveLength(1);
    expect(nomsDe(fratrie(r, id.Cléo).freresSoeurs)).toEqual(['Ana', 'Bob']);
  });

  it('fusionne deux fratries inconnues en une seule', () => {
    const { d, id } = avec('Ana', 'Bob', 'Cléo', 'Dan');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFrereSansParent(r, id.Cléo, id.Dan);
    expect(inconnus(r)).toHaveLength(2);

    r = ajouterFrereSansParent(r, id.Ana, id.Cléo);
    expect(inconnus(r)).toHaveLength(1);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob', 'Cléo', 'Dan']);
    expect(nomsDe(fratrie(r, id.Dan).freresSoeurs)).toEqual(['Ana', 'Bob', 'Cléo']);
  });

  it('refuse deux personnes déjà frères et sœurs, ou la même personne', () => {
    const { d, id } = avec('Ana', 'Bob');
    const r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    expect(() => ajouterFrereSansParent(r, id.Ana, id.Bob)).toThrow('déjà frères');
    expect(() => ajouterFrereSansParent(r, id.Ana, id.Ana)).toThrow();
  });

  it('refuse si la fiche a des parents connus', () => {
    const { d, id } = avec('Ana', 'Bob', 'Maman');
    const avecMere = ajouterFiliation(d, id.Maman, id.Ana, 'biologique').donnees;
    expect(() => ajouterFrereSansParent(avecMere, id.Ana, id.Bob)).toThrow('parents connus');
  });

  it('si l’autre a des parents connus, la fiche devient leur enfant (sans parent inconnu)', () => {
    const { d, id } = avec('Ana', 'Bob', 'Maman', 'Papa');
    let r = ajouterFiliation(d, id.Maman, id.Bob, 'biologique').donnees;
    r = ajouterFiliation(r, id.Papa, id.Bob, 'biologique').donnees;
    r = ajouterFrereSansParent(r, id.Ana, id.Bob);

    expect(inconnus(r)).toHaveLength(0);
    expect(nomsDe(liensParents(r, id.Ana).map((l) => l.personne))).toEqual(['Maman', 'Papa']);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob']);
  });

  it('si la fiche a un parent inconnu et l’autre des parents connus, toute sa fratrie passe aux parents connus', () => {
    const { d, id } = avec('Ana', 'Ben', 'Bob', 'Maman');
    let r = ajouterFrereSansParent(d, id.Ana, id.Ben);
    r = ajouterFiliation(r, id.Maman, id.Bob, 'biologique').donnees;
    r = ajouterFrereSansParent(r, id.Ana, id.Bob);

    expect(inconnus(r)).toHaveLength(0);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Ben', 'Bob']);
    expect(fratrie(r, id.Ana).demis).toEqual([]);
  });

  it('les parents inconnus ne comptent ni comme liens ni comme personnes', () => {
    const { d, id } = avec('Ana', 'Bob');
    const r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    expect(aDesLiens(r, id.Ana)).toBe(true);
    const f = familleProche(r, id.Ana);
    expect(f.couples).toEqual([{ membres: [], adoptif: false, statut: null, manque: true }]);
    expect(f.freres.map((x) => x.id)).toEqual([id.Bob]);
  });
});

describe('un vrai parent remplace le parent inconnu', () => {
  it('pour toute la fratrie, qui reste en frères et sœurs', () => {
    const { d, id } = avec('Ana', 'Bob', 'Cléo', 'Maman');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFrereSansParent(r, id.Ana, id.Cléo);
    r = ajouterFiliation(r, id.Maman, id.Bob, 'biologique').donnees;

    expect(inconnus(r)).toHaveLength(0);
    for (const e of ['Ana', 'Bob', 'Cléo']) {
      expect(nomsDe(liensParents(r, id[e]).map((l) => l.personne))).toEqual(['Maman']);
    }
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob', 'Cléo']);
    expect(fratrie(r, id.Ana).demis).toEqual([]);
  });

  it('plusieurs parents ajoutés d’un coup : tous les enfants les ont', () => {
    const { d, id } = avec('Ana', 'Bob', 'Maman', 'Papa');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFiliations(r, [id.Maman, id.Papa], id.Ana, 'biologique');

    expect(inconnus(r)).toHaveLength(0);
    expect(nomsDe(liensParents(r, id.Bob).map((l) => l.personne))).toEqual(['Maman', 'Papa']);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob']);
    expect(fratrie(r, id.Ana).demis).toEqual([]);
  });

  it('garde le type du lien de chaque enfant (adoptif pour celui qui reçoit le parent)', () => {
    const { d, id } = avec('Ana', 'Bob', 'Maman');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFiliation(r, id.Maman, id.Ana, 'adoptif').donnees;

    expect(liensParents(r, id.Ana)[0].filiation.type).toBe('adoptif');
    expect(liensParents(r, id.Bob)[0].filiation.type).toBe('biologique');
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob']);
  });

  it('refuse une boucle : un frère ne devient pas le parent de son frère', () => {
    const { d, id } = avec('Ana', 'Bob');
    const r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    expect(() => ajouterFiliation(r, id.Bob, id.Ana, 'biologique')).toThrow('boucle');
  });

  it('un parent ajouté à une personne sans frère inconnu ne touche personne d’autre', () => {
    const { d, id } = avec('Ana', 'Bob', 'Dan', 'Maman');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFiliation(r, id.Maman, id.Dan, 'biologique').donnees;
    expect(inconnus(r)).toHaveLength(1);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob']);
  });
});

describe('nettoyage du parent inconnu', () => {
  it('disparaît quand il ne relie plus qu’une personne', () => {
    const { d, id } = avec('Ana', 'Bob');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = supprimerPersonne(r, id.Bob);
    expect(inconnus(r)).toHaveLength(0);
    expect(r.filiations).toHaveLength(0);
    expect(aDesLiens(r, id.Ana)).toBe(false);
  });

  it('reste tant qu’il relie deux personnes', () => {
    const { d, id } = avec('Ana', 'Bob', 'Cléo');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFrereSansParent(r, id.Ana, id.Cléo);
    r = supprimerPersonne(r, id.Cléo);
    expect(inconnus(r)).toHaveLength(1);
    expect(nomsDe(fratrie(r, id.Ana).freresSoeurs)).toEqual(['Bob']);
  });

  it('disparaît aussi quand un lien est retiré', () => {
    const { d, id } = avec('Ana', 'Bob');
    const r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    const lien = r.filiations.find((f) => f.enfant === id.Ana)!;
    const apres = supprimerFiliation(r, lien.id);
    expect(inconnus(apres)).toHaveLength(0);
    expect(apres.filiations).toHaveLength(0);
  });
});

describe('déductions avec un parent inconnu', () => {
  it('neveu, nièce, cousin et grand-parent : jamais le parent inconnu', () => {
    const { d, id } = avec('Ana', 'Bob', 'Cléo', 'Dan');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFiliation(r, id.Bob, id.Cléo, 'biologique').donnees;
    r = ajouterFiliation(r, id.Ana, id.Dan, 'biologique').donnees;

    expect(nomsDe(familleElargie(r, id.Ana).neveuxNieces.map((e) => e.personne))).toEqual(['Cléo']);
    expect(nomsDe(familleElargie(r, id.Cléo).onclesTantes.map((e) => e.personne))).toEqual(['Ana']);
    expect(nomsDe(familleElargie(r, id.Cléo).cousins.map((e) => e.personne))).toEqual(['Dan']);
    expect(familleElargie(r, id.Cléo).grandsParents).toEqual([]);
    expect(familleElargie(r, id.Dan).grandsParents).toEqual([]);
  });

  it('lien avec « Moi » : « ton frère »', () => {
    const { d, id } = avec('Ana', 'Bob');
    const r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    expect(lienAvecMoi(r, id.Ana, id.Bob)).toBe('ton frère ou ta sœur');
  });

  it('chemin : le parent inconnu n’apparaît pas, l’étape est un frère ou une sœur', () => {
    let { d, id } = avec('Ana', 'Bob', 'Cléo');
    d = creerPersonne(d, { prenom: 'Zoé', nom: 'Martin', sexe: 'F' }).donnees;
    const zoe = d.personnes.find((p) => p.prenom === 'Zoé')!.id;
    let r = ajouterFrereSansParent(d, id.Ana, zoe);
    r = ajouterFiliation(r, zoe, id.Cléo, 'biologique').donnees;
    r = ajouterFiliation(r, id.Cléo, id.Bob, 'biologique').donnees;

    const etapes = chemin(r, id.Ana, zoe)!;
    expect(etapes.map((e) => e.personne.prenom)).toEqual(['Ana', 'Zoé']);
    expect(etapes[1].par).toBe('frere');
    expect(motsChemin(etapes)).toEqual(['ta sœur']);

    const long = chemin(r, id.Ana, id.Bob)!;
    expect(long.map((e) => e.personne.prenom)).toEqual(['Ana', 'Zoé', 'Cléo', 'Bob']);
    expect(motsChemin(long)).toEqual(['ta sœur', 'son enfant', 'son enfant']);
  });
});

describe('arbre global avec un parent inconnu', () => {
  it('place les frères et sœurs, sans dessiner le parent inconnu', () => {
    const { d, id } = avec('Ana', 'Bob', 'Cléo');
    let r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    r = ajouterFrereSansParent(r, id.Ana, id.Cléo);
    const disp = disposerArbre(r, id.Ana);

    expect(disp.places.map((p) => p.personne.prenom).sort()).toEqual(['Ana', 'Bob', 'Cléo']);
    expect(new Set(disp.places.map((p) => p.y)).size).toBe(1);
    expect(disp.branches).toHaveLength(1);
    expect(disp.branches[0].enfants).toHaveLength(3);
    expect(disp.branches[0].origines.every((o) => o.inconnu)).toBe(true);
  });
});

describe('sauvegarde', () => {
  it('un export avec parent inconnu est valide ; un drapeau erroné ne l’est pas', () => {
    const { d, id } = avec('Ana', 'Bob');
    const r = ajouterFrereSansParent(d, id.Ana, id.Bob);
    expect(estDonneesValides(JSON.parse(JSON.stringify(r)))).toBe(true);
    const faux = JSON.parse(JSON.stringify(r));
    faux.personnes.find((p: { inconnu?: unknown }) => p.inconnu).inconnu = false;
    expect(estDonneesValides(faux)).toBe(false);
  });
});
