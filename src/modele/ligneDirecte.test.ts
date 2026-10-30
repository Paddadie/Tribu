// Filtre « Ligne directe » : qui chaque niveau garde, et l'arbre qui en résulte.
import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { garderPour, ligneDirecte, restreindre } from './ligneDirecte';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import { fautesDisposition } from './test/disposition';
import { famillesDeReference } from './test/familles';
import { verifierInvariants } from './test/invariants';
import type { Donnees, TypeFiliation } from './types';

/**
 * Moi (Octave) et Timothee, enfants de Firmin et Ysee, séparés ; Hugo, enfant de Firmin et de Valentine ; Ines, conjointe de
 * Timothee, et Malo, leur enfant. Sacha et Ambre, parents de Firmin et de Maelle ; Albane, enfant de Sacha et de son ex Yvette,
 * mariée à Gisele, parent de Ulysse ; Maelle et Jasmin, parents de Lison. Anatole, seul parent connu de Ysee et de Leandre ;
 * Capucine, conjointe de Leandre, parent de Soline. Gaspard, conjoint d'Octave, et leur enfant Nina ; Elouan, parent de Gaspard.
 * Romain, ex d'Octave, et leur enfant Zoe. Karim, ami d'Octave ; Noe, sans lien.
 */
function famille() {
  let d = donneesVides();
  const ids: Record<string, string> = {};
  const prenoms = ['Octave', 'Timothee', 'Firmin', 'Ysee', 'Hugo', 'Valentine', 'Ines', 'Malo', 'Sacha', 'Ambre', 'Maelle', 'Albane', 'Yvette', 'Gisele'];
  for (const prenom of [
    ...prenoms,
    'Ulysse',
    'Jasmin',
    'Lison',
    'Anatole',
    'Leandre',
    'Capucine',
    'Soline',
    'Gaspard',
    'Nina',
    'Elouan',
    'Romain',
    'Zoe',
    'Karim',
    'Noe',
  ]) {
    const r = creerPersonne(d, { prenom, nom: 'Moreau' });
    [d, ids[prenom]] = [r.donnees, r.personne.id];
  }
  const enfants = (parents: string[], ...qui: string[]) => {
    for (const e of qui) for (const p of parents) d = ajouterFiliation(d, ids[p], ids[e], 'biologique').donnees;
  };
  const union = (a: string, b: string, statut: 'actuelle' | 'separee' = 'actuelle') => (d = ajouterUnion(d, ids[a], ids[b], true, statut).donnees);
  union('Firmin', 'Ysee', 'separee');
  union('Firmin', 'Valentine');
  enfants(['Firmin', 'Ysee'], 'Octave', 'Timothee');
  enfants(['Firmin', 'Valentine'], 'Hugo');
  union('Timothee', 'Ines');
  enfants(['Timothee', 'Ines'], 'Malo');
  union('Sacha', 'Yvette', 'separee');
  union('Sacha', 'Ambre');
  enfants(['Sacha', 'Ambre'], 'Firmin', 'Maelle');
  enfants(['Sacha', 'Yvette'], 'Albane');
  union('Albane', 'Gisele');
  enfants(['Albane', 'Gisele'], 'Ulysse');
  union('Maelle', 'Jasmin');
  enfants(['Maelle', 'Jasmin'], 'Lison');
  enfants(['Anatole'], 'Ysee', 'Leandre');
  union('Leandre', 'Capucine');
  enfants(['Leandre', 'Capucine'], 'Soline');
  union('Octave', 'Romain', 'separee');
  union('Octave', 'Gaspard');
  enfants(['Octave', 'Gaspard'], 'Nina');
  enfants(['Octave', 'Romain'], 'Zoe');
  enfants(['Elouan'], 'Gaspard');
  d = creerGroupe(d, [ids.Karim], '', ids.Octave).donnees;
  return { d, ids };
}

const noms = (garder: Set<string>, ids: Record<string, string>) =>
  Object.keys(ids)
    .filter((n) => garder.has(ids[n]))
    .sort();

describe('ligneDirecte', () => {
  const { d, ids } = famille();
  const directe = ['Ambre', 'Anatole', 'Firmin', 'Gaspard', 'Nina', 'Octave', 'Romain', 'Sacha', 'Ysee', 'Zoe'];
  const fratries = [...directe, 'Albane', 'Hugo', 'Maelle', 'Leandre', 'Valentine', 'Timothee', 'Yvette'].sort();

  it('niveau 1 : ancêtres, Moi, son conjoint, ses descendants et leurs autres parents (un ex compris)', () => {
    expect(noms(ligneDirecte(d, ids.Octave, 'directe'), ids)).toEqual(directe);
  });

  it('niveau 2 : plus les enfants de chaque ancêtre, demis compris, avec leurs autres parents ; ni cousins ni neveux', () => {
    expect(noms(ligneDirecte(d, ids.Octave, 'fratries'), ids)).toEqual(fratries);
  });

  it('niveau 3 : plus les conjoints et ex de chacun, sans aller plus loin', () => {
    expect(noms(ligneDirecte(d, ids.Octave, 'conjoints'), ids)).toEqual([...fratries, 'Capucine', 'Gisele', 'Ines', 'Jasmin'].sort());
  });

  it('jamais les amis, les beaux-parents ni les personnes sans lien', () => {
    for (const niveau of ['directe', 'fratries', 'conjoints'] as const) {
      const g = ligneDirecte(d, ids.Octave, niveau);
      for (const n of ['Karim', 'Elouan', 'Noe', 'Ulysse', 'Lison', 'Soline', 'Malo']) expect(g.has(ids[n]), `${niveau} : ${n}`).toBe(false);
    }
  });

  it('« Tout l’arbre » ne filtre rien ; une fiche Moi absente donne un ensemble vide', () => {
    expect(garderPour(d, ids.Octave, 'tout')).toBeUndefined();
    expect(garderPour(d, ids.Octave, 'directe')).toEqual(ligneDirecte(d, ids.Octave, 'directe'));
    expect(ligneDirecte(d, 'absent', 'conjoints').size).toBe(0);
  });

  it('Moi sans parents : Moi, son conjoint et ses descendants', () => {
    const r = famille();
    expect(noms(ligneDirecte(r.d, r.ids.Gaspard, 'fratries'), r.ids)).toEqual(['Elouan', 'Gaspard', 'Nina', 'Octave']);
    expect(noms(ligneDirecte(r.d, r.ids.Elouan, 'directe'), r.ids)).toEqual(['Elouan', 'Gaspard', 'Nina', 'Octave']);
    expect(noms(ligneDirecte(r.d, r.ids.Elouan, 'conjoints'), r.ids)).toEqual(['Elouan', 'Gaspard', 'Nina', 'Octave', 'Romain']);
  });

  it('suit les adoptions ; un parent inconnu reste s’il relie encore deux enfants ; un ancêtre commun aux deux côtés n’est compté qu’une fois', () => {
    let x: Donnees = donneesVides();
    const id: Record<string, string> = {};
    for (const prenom of ['Moi', 'Barnabe', 'Mere', 'Aieul', 'Inconnu', 'Oncle', 'Adoptif']) {
      const r = creerPersonne(x, { prenom, nom: 'Aubin' });
      [x, id[prenom]] = [r.donnees, r.personne.id];
    }
    const fil = (p: string, e: string, type: TypeFiliation = 'biologique') => (x = ajouterFiliation(x, id[p], id[e], type).donnees);
    fil('Barnabe', 'Moi');
    fil('Mere', 'Moi');
    fil('Aieul', 'Barnabe');
    fil('Aieul', 'Mere');
    fil('Inconnu', 'Barnabe');
    fil('Inconnu', 'Oncle');
    fil('Adoptif', 'Mere', 'adoptif');
    x = { ...x, personnes: x.personnes.map((p) => (p.id === id.Inconnu ? { ...p, inconnu: true } : p)) };
    expect(noms(ligneDirecte(x, id.Moi, 'directe'), id)).toEqual(['Adoptif', 'Aieul', 'Barnabe', 'Mere', 'Moi']);
    expect(noms(ligneDirecte(x, id.Moi, 'fratries'), id)).toEqual(['Adoptif', 'Aieul', 'Barnabe', 'Inconnu', 'Mere', 'Moi', 'Oncle']);
  });

  it('ignore les liens vers des personnes absentes', () => {
    const x = { ...d, filiations: [...d.filiations, { id: 'f-x', parent: 'absent', enfant: ids.Octave, type: 'biologique' as const }] };
    expect(noms(ligneDirecte(x, ids.Octave, 'directe'), ids)).toEqual(directe);
  });
});

describe('arbre filtré', () => {
  const { d, ids } = famille();
  const virtuels = (disp: ReturnType<typeof disposerArbre>) =>
    new Set(disp.places.filter((p) => p.personne.id.startsWith('virtuel:')).map((p) => p.personne.id));
  const complet = disposerArbre(d, ids.Octave);

  it.each(['directe', 'fratries', 'conjoints'] as const)('%s : seulement les personnes gardées, sans amis, sans « ? » nouveau, mêmes couleurs', (niveau) => {
    const garder = ligneDirecte(d, ids.Octave, niveau);
    const disp = disposerArbre(d, ids.Octave, garder);
    const reelles = disp.places.filter((p) => !p.personne.id.startsWith('virtuel:'));
    expect(new Set(reelles.map((p) => p.personne.id))).toEqual(garder);
    expect(disp.groupes).toEqual([]);
    expect(disp.places.some((p) => p.bulle)).toBe(false);
    for (const v of virtuels(disp)) expect(virtuels(complet).has(v), v).toBe(true);
    const couleur = new Map(complet.places.map((p) => [p.personne.id, p.lignee]));
    for (const p of reelles) expect(p.lignee, p.personne.prenom).toBe(couleur.get(p.personne.id));
  });

  it('sans filtre, la disposition ne change pas', () => {
    expect(disposerArbre(d, ids.Octave, undefined)).toEqual(complet);
  });
});

describe.each(famillesDeReference())('familles de référence filtrées : $nom', ({ donnees, moi }) => {
  it.each(['directe', 'fratries', 'conjoints'] as const)('%s : données cohérentes et arbre sans faute', (niveau) => {
    const garder = ligneDirecte(donnees, moi, niveau);
    const reduites = restreindre(donnees, garder);
    expect(verifierInvariants(reduites)).toEqual([]);
    const fautes = fautesDisposition(reduites, moi, disposerArbre(donnees, moi, garder));
    expect(fautes.chevauchements).toEqual([]);
    expect(fautes.horsDuBus).toEqual([]);
    expect(fautes.absentes).toEqual([]);
  });
});
