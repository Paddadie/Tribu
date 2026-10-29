import { describe, expect, it } from 'vitest';
import { chemin, inverser, relation } from './deductions';
import { ajouterFiliation, ajouterUnion, creerPersonne, personnesVisibles, separerUnion } from './modele';
import { composer, etiquette, lienAvecMoi, motsChemin } from './parente';
import { dupontel, famillesDeReference } from './test/familles';
import type { Donnees, Sexe, TypeFiliation } from './types';

const aujourdhui = new Date('2026-10-29');

/**
 * Famille fictive Dupontel (Moi = Léon), avec en plus : son ex Inès et ses parents Hortense et Achille ; son épouse
 * Capucine et la mère de celle-ci, Rosalie ; leurs enfants Elio (adopté) et Alix (sexe non précisé) ; Ernest, frère
 * d'Auguste ; Gaston, fils d'Apolline, et sa fille Zélie ; Sasha (sexe non précisé), enfant de Clara.
 */
function famille() {
  const f = dupontel();
  let d: Donnees = f.donnees;
  const id = (cle: string) => {
    const p = d.personnes.find((x) => x.prenom === cle);
    if (!p) throw new Error(cle);
    return p.id;
  };
  const pers = (prenom: string, sexe?: Sexe) => (d = creerPersonne(d, { prenom, nom: 'Fictif', sexe }).donnees);
  const enfant = (e: string, parents: string[], type: TypeFiliation = 'biologique') =>
    parents.forEach((p) => (d = ajouterFiliation(d, id(p), id(e), type).donnees));
  pers('Inès', 'F');
  pers('Hortense', 'F');
  pers('Achille', 'M');
  pers('Capucine', 'F');
  pers('Rosalie', 'F');
  pers('Elio', 'M');
  pers('Alix');
  pers('Ernest', 'M');
  pers('Gaston', 'M');
  pers('Zélie', 'F');
  pers('Sasha');
  const ex = ajouterUnion(d, id('Léon'), id('Inès'));
  d = separerUnion(ex.donnees, ex.union.id);
  enfant('Inès', ['Hortense', 'Achille']);
  d = ajouterUnion(d, id('Léon'), id('Capucine'), true).donnees;
  enfant('Capucine', ['Rosalie']);
  enfant('Elio', ['Léon', 'Capucine'], 'adoptif');
  enfant('Alix', ['Léon', 'Capucine']);
  enfant('Ernest', ['Honoré', 'Léontine']);
  enfant('Gaston', ['Apolline']);
  enfant('Zélie', ['Gaston']);
  enfant('Sasha', ['Clara']);
  return { d, moi: f.moi, id };
}

describe('composer : chemins en relations composées (point 11)', () => {
  const { d, moi, id } = famille();
  const phrase = (vers: string) => ['Toi', ...composer(d, chemin(d, moi, id(vers))!, aujourdhui)].join(' → ');

  it.each([
    ['Gaspard', 'Toi → ton père'],
    ['Margaux', 'Toi → ta mère'],
    ['Mathilde', 'Toi → ta sœur'],
    ['Noah', 'Toi → ton demi-frère'],
    ['Firmin', 'Toi → ton grand-père'],
    ['Odile', 'Toi → ta grand-mère'],
    ['Auguste', 'Toi → ton arrière-grand-père'],
    ['Germaine', 'Toi → ton arrière-grand-mère'],
    ['Honoré', 'Toi → ton arrière-arrière-grand-père'],
    ['Léontine', 'Toi → ton arrière-arrière-grand-mère'],
    ['Anselme', 'Toi → ton arrière-arrière-arrière-grand-père'],
    ['Berthe', 'Toi → ton arrière-arrière-arrière-grand-mère'],
    ['Apolline', 'Toi → ta tante'],
    ['Clara', 'Toi → ta tante'],
    ['Marcel', 'Toi → ton grand-oncle'],
    ['Ernest', 'Toi → ton arrière-grand-oncle'],
    ['Yvonne', 'Toi → ta grand-tante par alliance'],
    ['Gaston', 'Toi → ton cousin'],
    ['Sasha', 'Toi → ton cousin ou ta cousine'],
    // (2,3) : deux segments ; à égalité, le premier pivot le plus proche (« ton père » plutôt que « ton cousin »).
    ['Zélie', 'Toi → ton père → sa petite-nièce'],
    // (3,2) : sans nom, décomposé.
    ['Bastien', 'Toi → ton père → son cousin'],
    ['Gaël', 'Toi → ton cousin issu de germain'],
    ['Lison', 'Toi → ta cousine issue de germain'],
    ['Timothée', 'Toi → ton cousin issu de germain'],
    ['Jules', 'Toi → ton cousin issu de germain'],
    ['Anaïs', 'Toi → ta cousine issue de germain'],
    // La compagne non mariée d'un proche se dit par ce proche, pas « ton grand-oncle → sa belle-fille ».
    ['Romane', 'Toi → ton père → son cousin → sa compagne'],
    ['Capucine', 'Toi → ton épouse'],
    ['Rosalie', 'Toi → ta belle-mère'],
    ['Elio', 'Toi → ton fils adoptif'],
    ['Alix', 'Toi → ton enfant'],
  ])('%s : %s', (vers, attendu) => {
    expect(phrase(vers)).toBe(attendu);
  });

  it('motsChemin sans les données : étape par étape (le « Détail »)', () => {
    expect(motsChemin(chemin(d, moi, id('Bastien'))!)).toEqual(['ton père', 'son père', 'son frère', 'son fils']);
    expect(motsChemin(chemin(d, moi, id('Bastien'))!, d, aujourdhui)).toEqual(['ton père', 'son cousin']);
  });
});

describe('passe globale du nommage (point 12)', () => {
  const { d, moi, id } = famille();
  const lien = (vers: string, de = moi) => lienAvecMoi(d, de, id(vers), aujourdhui);
  const court = (vers: string) => etiquette(d, moi, id(vers), aujourdhui);

  it('ex : le mien, ses parents, l’ex d’un proche (avec son prénom en étiquette)', () => {
    expect([lien('Inès'), court('Inès')]).toEqual(['ton ex', 'Ex']);
    expect([lien('Hortense'), court('Hortense')]).toEqual(['ton ex-belle-mère', 'Ex-belle-mère']);
    expect([lien('Achille'), court('Achille')]).toEqual(['ton ex-beau-père', 'Ex-beau-père']);
    expect([lien('Solène'), court('Solène')]).toEqual(['l’ex de ton père', 'Ex de Gaspard']);
    // Une ex reste hors de la parenté : pas de lien de famille, pas de chemin.
    expect(relation(d, moi, id('Solène'))).toBeUndefined();
    expect(chemin(d, moi, id('Solène'))).toBeUndefined();
  });

  it('plusieurs générations : arrière-grand-oncle et arrière-petit-neveu, (3,3) nommé', () => {
    expect(lien('Ernest')).toBe('ton arrière-grand-oncle');
    expect(lien('Léon', id('Ernest'))).toBe('ton arrière-petit-neveu');
    expect(lien('Gaël')).toBe('ton cousin issu de germain');
    expect(lien('Léon', id('Lison'))).toBe('ton cousin issu de germain');
    // (3,2) et (2,3) restent sans nom d'un seul tenant.
    expect(lien('Bastien')).toBeUndefined();
    expect(lien('Léon', id('Bastien'))).toBeUndefined();
  });

  it('genre non précisé, adoption au premier degré seulement, demi pour la fratrie seulement', () => {
    expect(lien('Alix')).toBe('ton enfant');
    expect(lien('Sasha')).toBe('ton cousin ou ta cousine');
    expect(lien('Elio')).toBe('ton fils adoptif');
    expect(lien('Firmin', id('Elio'))).toBe('ton arrière-grand-père');
    expect(lien('Noah')).toBe('ton demi-frère');
    expect(lien('Noah', id('Firmin'))).toBe('ton petit-fils');
  });

  it('alliance : belle-mère par le conjoint, beau-fils, gendre ou belle-fille', () => {
    expect(lien('Rosalie')).toBe('ta belle-mère');
    expect(lien('Léon', id('Rosalie'))).toBe('ton gendre');
    expect(lien('Capucine', id('Gaspard'))).toBe('ta belle-fille');
    expect(lien('Margaux', id('Noah'))).toBe('ta belle-mère');
  });

  it('veuf remarié : le défunt reste son époux, des deux côtés', () => {
    let x: Donnees = d;
    const nouvelle = creerPersonne(x, { prenom: 'Ninon', nom: 'Fictif', sexe: 'F' });
    x = nouvelle.donnees;
    const odile = { ...x.personnes.find((p) => p.prenom === 'Odile')!, deces: '2010-03-01' };
    x = { ...x, personnes: x.personnes.map((p) => (p.id === odile.id ? odile : p)) };
    x = ajouterUnion(x, id('Firmin'), nouvelle.personne.id, true).donnees;
    expect(lienAvecMoi(x, id('Firmin'), odile.id, aujourdhui)).toBe('ton épouse');
    expect(lienAvecMoi(x, odile.id, id('Firmin'), aujourdhui)).toBe('ton époux');
    expect(lienAvecMoi(x, id('Firmin'), nouvelle.personne.id, aujourdhui)).toBe('ton épouse');
  });
});

describe('symétrie et chemins sur toutes les paires des familles fictives', () => {
  for (const f of famillesDeReference()) {
    it(f.nom, () => {
      const d = f.donnees;
      const ids = personnesVisibles(d).map((p) => p.id);
      for (const a of ids)
        for (const b of ids) {
          if (a === b) continue;
          const r = relation(d, a, b);
          const inverse = relation(d, b, a);
          expect(!!inverse, `${a} → ${b}`).toBe(!!r);
          if (r && inverse) expect(inverse, `${a} → ${b}`).toEqual(inverser(r));
          const etapes = chemin(d, a, b);
          if (!etapes) continue;
          const mots = composer(d, etapes, aujourdhui);
          expect(mots.length, `${a} → ${b}`).toBeGreaterThan(0);
          expect(
            mots.every((m) => m.trim() !== ''),
            `${a} → ${b}`,
          ).toBe(true);
        }
    });
  }
});
