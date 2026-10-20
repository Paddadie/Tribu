import { describe, expect, it } from 'vitest';
import { familleElargie, inverser, relation } from './deductions';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele';
import { libelleRelation, lienAvecMoi } from './parente';
import type { Donnees, Sexe, TypeFiliation } from './types';

/**
 * Famille de test à 4 générations (sexe entre crochets, parents après la flèche) :
 * 1. Arthur [M] ∞ Berthe [F] (mariés)
 * 2. Claude [M] ← Arthur, Berthe ; Denise [F] ← Arthur, Berthe ; Gaston [M] ← Arthur seul
 *    Claude ∞ Eva [F] (mariés) ; Denise ∞ Fred [M] ; Gaston ∞ Dominique [?] ; Tom [M] ∞ Ursule [F] (mariés)
 * 3. Moi [M] et Zoé [F] ← Claude, Eva ; Nina [F] ← Eva seule ; Ondine [F] ← Denise, Fred ; Rémi [M] ← Gaston seul
 *    Sarah [F] et Yasmine [F] ← Tom, Ursule ; Moi ∞ Sarah (mariés) ; Zoé ∞ Karim [M]
 * 4. Xavier [M] ← Moi, Sarah ; Wanda [F] ← Moi, Sarah (adoptée) ; Victor [M] ← Sarah seule ;
 *    Léa [F] et Sam [?] ← Zoé, Karim ; Hugo [M] ← Yasmine seule
 * Étranger [?] : aucun lien.
 */
function famille() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  const pers = (prenom: string, sexe?: Sexe) => {
    const r = creerPersonne(d, { prenom, nom: 'X', sexe });
    d = r.donnees;
    id[prenom] = r.personne.id;
  };
  const union = (a: string, b: string, marie = false) => (d = ajouterUnion(d, id[a], id[b], marie).donnees);
  const enfant = (e: string, parents: string[], type: TypeFiliation = 'biologique') =>
    parents.forEach((p) => (d = ajouterFiliation(d, id[p], id[e], type).donnees));

  for (const p of ['Arthur', 'Claude', 'Gaston', 'Fred', 'Tom', 'Moi', 'Rémi', 'Karim', 'Xavier', 'Victor', 'Hugo']) pers(p, 'M');
  for (const p of ['Berthe', 'Denise', 'Eva', 'Ursule', 'Zoé', 'Nina', 'Ondine', 'Sarah', 'Yasmine', 'Wanda', 'Léa']) pers(p, 'F');
  for (const p of ['Dominique', 'Sam', 'Étranger']) pers(p);

  union('Arthur', 'Berthe', true);
  union('Claude', 'Eva', true);
  union('Denise', 'Fred');
  union('Gaston', 'Dominique');
  union('Tom', 'Ursule', true);
  union('Moi', 'Sarah', true);
  union('Zoé', 'Karim');

  enfant('Claude', ['Arthur', 'Berthe']);
  enfant('Denise', ['Arthur', 'Berthe']);
  enfant('Gaston', ['Arthur']);
  enfant('Moi', ['Claude', 'Eva']);
  enfant('Zoé', ['Claude', 'Eva']);
  enfant('Nina', ['Eva']);
  enfant('Ondine', ['Denise', 'Fred']);
  enfant('Rémi', ['Gaston']);
  enfant('Sarah', ['Tom', 'Ursule']);
  enfant('Yasmine', ['Tom', 'Ursule']);
  enfant('Xavier', ['Moi', 'Sarah']);
  enfant('Wanda', ['Moi', 'Sarah'], 'adoptif');
  enfant('Victor', ['Sarah']);
  enfant('Léa', ['Zoé', 'Karim']);
  enfant('Sam', ['Zoé', 'Karim']);
  enfant('Hugo', ['Yasmine']);

  return { d, id, lien: (de: string, vers: string) => lienAvecMoi(d, id[de], id[vers]) };
}

const f = famille();

describe('lien avec moi', () => {
  it('nomme soi-même, le conjoint, les parents et les enfants', () => {
    expect(f.lien('Moi', 'Moi')).toBe('c’est toi');
    expect(f.lien('Moi', 'Sarah')).toBe('ton épouse');
    expect(f.lien('Sarah', 'Moi')).toBe('ton époux');
    expect(f.lien('Zoé', 'Karim')).toBe('ton compagnon');
    expect(f.lien('Moi', 'Eva')).toBe('ta mère');
    expect(f.lien('Moi', 'Xavier')).toBe('ton fils');
  });

  it('précise une adoption, pour le parent comme pour l’enfant', () => {
    expect(f.lien('Moi', 'Wanda')).toBe('ta fille adoptive');
    expect(f.lien('Wanda', 'Moi')).toBe('ton père adoptif');
    expect(f.lien('Wanda', 'Arthur')).toBe('ton arrière-grand-père');
  });

  it('remonte et descend les générations, avec « ton » devant une voyelle', () => {
    expect(f.lien('Moi', 'Berthe')).toBe('ta grand-mère');
    expect(f.lien('Arthur', 'Moi')).toBe('ton petit-fils');
    expect(f.lien('Xavier', 'Berthe')).toBe('ton arrière-grand-mère');
    expect(f.lien('Berthe', 'Xavier')).toBe('ton arrière-petit-fils');
    expect(f.lien('Berthe', 'Wanda')).toBe('ton arrière-petite-fille');
  });

  it('nomme frères, sœurs, demis, oncles, neveux et cousins', () => {
    expect(f.lien('Moi', 'Zoé')).toBe('ta sœur');
    expect(f.lien('Moi', 'Nina')).toBe('ta demi-sœur');
    expect(f.lien('Xavier', 'Victor')).toBe('ton demi-frère');
    expect(f.lien('Moi', 'Denise')).toBe('ta tante');
    expect(f.lien('Moi', 'Gaston')).toBe('ton oncle');
    expect(f.lien('Denise', 'Moi')).toBe('ton neveu');
    expect(f.lien('Moi', 'Léa')).toBe('ta nièce');
    expect(f.lien('Moi', 'Ondine')).toBe('ta cousine');
    expect(f.lien('Moi', 'Rémi')).toBe('ton cousin');
    expect(f.lien('Xavier', 'Denise')).toBe('ta grand-tante');
    expect(f.lien('Denise', 'Xavier')).toBe('ton petit-neveu');
  });

  it('nomme la belle-famille, des deux côtés du conjoint', () => {
    expect(f.lien('Moi', 'Tom')).toBe('ton beau-père');
    expect(f.lien('Moi', 'Ursule')).toBe('ta belle-mère');
    expect(f.lien('Tom', 'Moi')).toBe('ton gendre');
    expect(f.lien('Claude', 'Sarah')).toBe('ta belle-fille');
    expect(f.lien('Moi', 'Victor')).toBe('ton beau-fils');
    expect(f.lien('Victor', 'Moi')).toBe('ton beau-père');
    expect(f.lien('Moi', 'Karim')).toBe('ton beau-frère');
    expect(f.lien('Moi', 'Yasmine')).toBe('ta belle-sœur');
    expect(f.lien('Moi', 'Fred')).toBe('ton oncle par alliance');
    expect(f.lien('Sarah', 'Denise')).toBe('ta tante par alliance');
    expect(f.lien('Moi', 'Hugo')).toBe('ton neveu par alliance');
  });

  it('donne une forme neutre, ou les deux formes, quand le sexe n’est pas précisé', () => {
    expect(f.lien('Arthur', 'Sam')).toBe('ton arrière-petit-enfant');
    expect(f.lien('Moi', 'Sam')).toBe('ton neveu ou ta nièce');
    expect(f.lien('Moi', 'Dominique')).toBe('ton oncle ou ta tante par alliance');
    expect(f.lien('Rémi', 'Dominique')).toBe('ton beau-parent');
    expect(f.lien('Claude', 'Dominique')).toBe('ton beau-frère ou ta belle-sœur');
  });

  it('n’affiche rien sans lien, ou pour un lien sans nom usuel', () => {
    expect(f.lien('Moi', 'Étranger')).toBeUndefined();
    expect(f.lien('Xavier', 'Ondine')).toBeUndefined(); // cousine d'un parent
    expect(f.lien('Claude', 'Tom')).toBeUndefined(); // parent du conjoint d'un enfant
    expect(f.lien('Claude', 'Victor')).toBeUndefined(); // enfant de la belle-fille
  });
});

describe('relation', () => {
  it('est cohérente dans les deux sens, pour chaque paire de la famille', () => {
    for (const a of f.d.personnes) {
      for (const b of f.d.personnes) {
        const r = relation(f.d, a.id, b.id);
        const retour = relation(f.d, b.id, a.id);
        expect(retour, `${a.prenom} → ${b.prenom}`).toEqual(r && inverser(r));
      }
    }
  });

  it('se termine sur une boucle de filiations venue d’un import', () => {
    const d: Donnees = {
      version: 5,
      personnes: [
        { id: 'a', prenom: 'A', nom: 'X', note: '' },
        { id: 'b', prenom: 'B', nom: 'X', note: '' },
      ],
      unions: [],
      filiations: [
        { id: 'f1', parent: 'a', enfant: 'b', type: 'biologique' },
        { id: 'f2', parent: 'b', enfant: 'a', type: 'biologique' },
      ],
      groupes: [],
    };
    expect(relation(d, 'a', 'b')).toBeDefined();
  });
});

describe('libelleRelation', () => {
  const sang = { type: 'sang', montee: 2, descente: 1, demi: false, adoptif: false } as const;
  it('accorde selon le sexe, sans déterminant', () => {
    expect(libelleRelation(sang, 'F')).toBe('tante');
    expect(libelleRelation({ type: 'alliance', cote: 'sien', base: sang }, 'M')).toBe('oncle par alliance');
    expect(libelleRelation({ type: 'alliance', cote: 'sien', base: sang }, undefined)).toBe('oncle ou tante par alliance');
    expect(libelleRelation({ type: 'soi' }, 'M')).toBeUndefined();
  });
});

describe('famille élargie', () => {
  const sections = (qui: string) => {
    const s = familleElargie(f.d, f.id[qui]);
    const noms = (l: { personne: { prenom: string } }[]) => l.map((e) => e.personne.prenom);
    return {
      grandsParents: noms(s.grandsParents),
      petitsEnfants: noms(s.petitsEnfants),
      onclesTantes: noms(s.onclesTantes),
      neveuxNieces: noms(s.neveuxNieces),
      cousins: noms(s.cousins),
      belleFamille: noms(s.belleFamille),
    };
  };

  it('remplit les sections de Moi, par alliance comprise', () => {
    expect(sections('Moi')).toEqual({
      grandsParents: ['Arthur', 'Berthe'],
      petitsEnfants: [],
      onclesTantes: ['Denise', 'Dominique', 'Fred', 'Gaston'],
      neveuxNieces: ['Hugo', 'Léa', 'Sam'],
      cousins: ['Ondine', 'Rémi'],
      belleFamille: ['Tom', 'Ursule', 'Victor'],
    });
  });

  it('compte les petits-enfants adoptés, et exclut de la belle-famille mes propres enfants', () => {
    expect(sections('Claude')).toEqual({
      grandsParents: [],
      petitsEnfants: ['Léa', 'Sam', 'Wanda', 'Xavier'],
      onclesTantes: [],
      neveuxNieces: ['Ondine', 'Rémi'],
      cousins: [],
      belleFamille: ['Nina'],
    });
  });

  it('garde la relation de chaque entrée pour son libellé', () => {
    const fred = familleElargie(f.d, f.id.Moi).onclesTantes.find((e) => e.personne.prenom === 'Fred')!;
    expect(libelleRelation(fred.relation, 'M')).toBe('oncle par alliance');
  });

  it('est vide pour une personne sans lien', () => {
    expect(Object.values(sections('Étranger')).flat()).toEqual([]);
  });
});
