import { describe, expect, it } from 'vitest';
import { disposerArbre, type Disposition } from './arbreGlobal';
import { isotone } from './partie';
import { couleurFamille } from './liste';
import { ajouterFiliation, ajouterFrereSansParent, ajouterUnion, creerGroupe, creerPersonne, donneesVides, separerUnion } from './modele';
import { estVirtuel } from './parentSansNom';
import { martinezVasseur, rochefort } from './test/familles';
import type { Donnees, Sexe, TypeFiliation } from './types';

/** Petit atelier de données : personnes par prénom, liens par prénoms. */
function atelier() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  const a = {
    get d() {
      return d;
    },
    set d(v: Donnees) {
      d = v;
    },
    id,
    pers: (prenom: string, sexe: Sexe | undefined, annee: string, noms: { nom?: string; nomNaissance?: string } = {}) => {
      const r = creerPersonne(d, { prenom, nom: 'X', sexe, naissance: annee, ...noms });
      d = r.donnees;
      id[prenom] = r.personne.id;
    },
    union: (x: string, y: string, separes = false) => {
      const r = ajouterUnion(d, id[x], id[y]);
      d = separes ? separerUnion(r.donnees, r.union.id) : r.donnees;
    },
    enfant: (e: string, parents: string[], type: TypeFiliation = 'biologique') => parents.forEach((p) => (d = ajouterFiliation(d, id[p], id[e], type).donnees)),
    ami: (x: string, y: string) => (d = creerGroupe(d, [id[x], id[y]]).donnees),
  };
  return a;
}

/**
 * Famille de la maquette A (Paul est « Moi ») :
 * Jean † ∞ Simone → Gérard, Alain ; Robert ∞ Agnès → Claire, Isabelle ; Gérard ∞ Claire → Paul, Emma
 * Paul ∞ Julie → Lou, Nathan ; Emma ∞ Nicolas ; Alain ∞ Sophie (séparés) → Léa, Hugo ; Isabelle ∞ Karim → Inès, Théo
 * Zoé, amie d'Inès. Amis de Paul : Mathis ∞ Laure → Jules ; Camille, Marc, Sarah ; Yanis, ami de Camille.
 * Odile : sans aucun lien.
 */
function maquette() {
  const a = atelier();
  const gens: [string, Sexe, string][] = [
    ['Paul', 'M', '1990'],
    ['Julie', 'F', '1991'],
    ['Gérard', 'M', '1962'],
    ['Claire', 'F', '1964'],
    ['Emma', 'F', '1993'],
    ['Nicolas', 'M', '1990'],
    ['Lou', 'F', '2020'],
    ['Nathan', 'M', '2022'],
    ['Jean', 'M', '1938'],
    ['Simone', 'F', '1940'],
    ['Alain', 'M', '1965'],
    ['Sophie', 'F', '1967'],
    ['Léa', 'F', '1995'],
    ['Hugo', 'M', '1998'],
    ['Robert', 'M', '1937'],
    ['Agnès', 'F', '1941'],
    ['Isabelle', 'F', '1968'],
    ['Karim', 'M', '1966'],
    ['Inès', 'F', '1997'],
    ['Théo', 'M', '2000'],
    ['Zoé', 'F', '1997'],
    ['Mathis', 'M', '1989'],
    ['Laure', 'F', '1990'],
    ['Jules', 'M', '2019'],
    ['Camille', 'F', '1991'],
    ['Marc', 'M', '1988'],
    ['Sarah', 'F', '1992'],
    ['Yanis', 'M', '1990'],
    ['Odile', 'F', '1950'],
  ];
  gens.forEach(([p, s, n]) => a.pers(p, s, n));
  a.union('Jean', 'Simone');
  a.enfant('Gérard', ['Jean', 'Simone']);
  a.enfant('Alain', ['Jean', 'Simone']);
  a.union('Robert', 'Agnès');
  a.enfant('Claire', ['Robert', 'Agnès']);
  a.enfant('Isabelle', ['Robert', 'Agnès']);
  a.union('Gérard', 'Claire');
  a.enfant('Paul', ['Gérard', 'Claire']);
  a.enfant('Emma', ['Gérard', 'Claire']);
  a.union('Paul', 'Julie');
  a.enfant('Lou', ['Paul', 'Julie']);
  a.enfant('Nathan', ['Paul', 'Julie']);
  a.union('Emma', 'Nicolas');
  a.union('Alain', 'Sophie', true);
  a.enfant('Léa', ['Alain', 'Sophie']);
  a.enfant('Hugo', ['Alain', 'Sophie']);
  a.union('Isabelle', 'Karim');
  a.enfant('Inès', ['Isabelle', 'Karim']);
  a.enfant('Théo', ['Isabelle', 'Karim']);
  a.ami('Inès', 'Zoé');
  a.ami('Paul', 'Mathis');
  a.ami('Paul', 'Camille');
  a.ami('Paul', 'Marc');
  a.ami('Paul', 'Sarah');
  a.ami('Camille', 'Yanis');
  a.union('Mathis', 'Laure');
  a.enfant('Jules', ['Mathis', 'Laure']);
  return a;
}

const EPS = 1e-6;

function pos(disp: Disposition, id: string) {
  const p = disp.places.find((pl) => pl.personne.id === id);
  if (!p) throw new Error(`absent : ${id}`);
  return p;
}

/** Invariants communs à toute disposition. */
function verifierInvariants(d: Donnees, disp: Disposition, moi: string) {
  expect(pos(disp, moi)).toMatchObject({ x: 0, y: 0 });
  // Une seule place par personne, aucun chevauchement dans une ligne.
  const ids = disp.places.map((p) => p.personne.id);
  expect(new Set(ids).size).toBe(ids.length);
  const lignes = new Map<number, number[]>();
  for (const p of disp.places) lignes.set(p.y, [...(lignes.get(p.y) ?? []), p.x]);
  for (const xs of lignes.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(1 - EPS);
  }
  for (const p of disp.places) {
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  }
  // Toute branche part de parents placés vers des enfants placés, le trait commun entre les deux.
  for (const b of disp.branches) {
    for (const o of b.origines) expect(b.bus).toBeGreaterThan(o.y - EPS);
    expect(b.enfants.length).toBeGreaterThan(0);
  }
  // Les couples tracés relient des personnes placées.
  for (const c of disp.couples) {
    expect(ids).toContain(c.a);
    expect(ids).toContain(c.b);
  }
  // Les parents « ? » d'un enfant à parent seul sont calculés pour le dessin : ils ne sont pas dans les données.
  expect(d.personnes.length).toBeGreaterThanOrEqual(disp.places.filter((p) => !estVirtuel(p.personne.id)).length);
}

describe('disposerArbre : maquette A', () => {
  const a = maquette();
  const { d, id } = a;
  const disp = disposerArbre(d, id.Paul);
  const p = (prenom: string) => pos(disp, id[prenom]);

  it('respecte les invariants et met Moi en (0, 0)', () => {
    verifierInvariants(d, disp, id.Paul);
  });

  it('masque la personne sans lien, montre toutes les autres', () => {
    expect(disp.places.some((pl) => pl.personne.id === id.Odile)).toBe(false);
    expect(disp.places).toHaveLength(d.personnes.length - 1);
  });

  it('met une ligne par génération', () => {
    expect(p('Gérard').y).toBe(-1);
    expect(p('Jean').y).toBe(-2);
    expect(p('Agnès').y).toBe(-2);
    expect(p('Léa').y).toBe(0);
    expect(p('Inès').y).toBe(0);
    expect(p('Lou').y).toBe(1);
    for (const f of d.filiations) {
      const parent = disp.places.find((pl) => pl.personne.id === f.parent);
      const enfant = disp.places.find((pl) => pl.personne.id === f.enfant);
      if (parent && enfant) expect(enfant.y - parent.y).toBe(1);
    }
  });

  it('garde les conjoints côte à côte, séparés compris', () => {
    for (const u of d.unions) {
      const x = pos(disp, u.personneA);
      const y = pos(disp, u.personneB);
      expect(x.y).toBe(y.y);
      expect(Math.abs(x.x - y.x)).toBeCloseTo(1);
    }
    expect(disp.couples.find((c) => [c.a, c.b].includes(id.Alain))?.separe).toBe(true);
    expect(disp.couples.find((c) => [c.a, c.b].includes(id.Paul))?.separe).toBe(false);
  });

  it('met le côté paternel à gauche, l’aîné avant le cadet', () => {
    expect(p('Gérard').x).toBeLessThan(p('Claire').x);
    expect((p('Jean').x + p('Simone').x) / 2).toBeLessThan((p('Robert').x + p('Agnès').x) / 2);
    expect(p('Lou').x).toBeLessThan(p('Nathan').x);
    expect(p('Léa').x).toBeLessThan(p('Hugo').x);
  });

  it('place les parents au-dessus de leurs enfants', () => {
    const milieu = (x: string, y: string) => (p(x).x + p(y).x) / 2;
    expect(milieu('Gérard', 'Claire')).toBeCloseTo(milieu('Paul', 'Emma'), 0);
    expect(Math.abs(milieu('Paul', 'Julie') - milieu('Lou', 'Nathan'))).toBeLessThan(1);
  });

  it('garde les frères et sœurs groupés (seuls leurs conjoints et amis peuvent s’intercaler)', () => {
    const lies = (x: string) => [
      ...d.unions.flatMap((u) => (u.personneA === x ? [u.personneB] : u.personneB === x ? [u.personneA] : [])),
      ...d.groupes.flatMap((g) => (g.membres.includes(x) ? g.membres.filter((m) => m !== x) : [])),
    ];
    for (const fratrie of [
      ['Paul', 'Emma'],
      ['Léa', 'Hugo'],
      ['Inès', 'Théo'],
      ['Gérard', 'Alain'],
      ['Claire', 'Isabelle'],
    ]) {
      const xs = fratrie.map((f) => p(f).x);
      const admis = new Set(fratrie.flatMap((f) => [id[f], ...lies(id[f])]));
      const y = p(fratrie[0]).y;
      const entre = disp.places.filter((pl) => pl.y === y && pl.x > Math.min(...xs) && pl.x < Math.max(...xs));
      for (const pl of entre) expect(admis.has(pl.personne.id), pl.personne.prenom).toBe(true);
    }
  });

  it('met les amis de Moi et leurs familles dans la bulle, sous la famille', () => {
    const bulle = ['Mathis', 'Laure', 'Jules', 'Camille', 'Marc', 'Sarah', 'Yanis'];
    for (const pl of disp.places) expect(pl.bulle, pl.personne.prenom).toBe(bulle.includes(pl.personne.prenom));
    const basFamille = Math.max(...disp.places.filter((pl) => !pl.bulle).map((pl) => pl.y));
    for (const b of bulle) expect(p(b).y).toBeGreaterThan(basFamille + 1);
    expect(p('Jules').y - p('Mathis').y).toBe(1);
    expect(Math.abs(p('Yanis').x - p('Camille').x)).toBeCloseTo(1);
  });

  it('met l’amie d’un proche à côté de lui, dans la famille, hors de la fratrie', () => {
    expect(p('Zoé').y).toBe(p('Inès').y);
    expect(Math.abs(p('Zoé').x - p('Inès').x)).toBeCloseTo(1);
    const [g, dr] = [p('Inès').x, p('Théo').x].sort((x, y) => x - y);
    expect(disp.places.filter((pl) => pl.y === 0 && pl.x > g && pl.x < dr)).toEqual([]);
  });

  it('met les conjoints à l’extérieur de la fratrie', () => {
    expect(p('Julie').x).toBeLessThan(p('Paul').x);
    expect(p('Nicolas').x).toBeGreaterThan(p('Emma').x);
    expect(p('Paul').x).toBeLessThan(p('Emma').x);
  });

  it('remplace les amitiés de Moi vers la bulle par un seul trait', () => {
    const avecMoi = disp.amities.filter((m) => m.a === id.Paul || m.b === id.Paul);
    expect(avecMoi).toHaveLength(0);
    const paires = disp.amities.map((m) => [m.a, m.b].sort().join());
    expect(paires).toContain([id.Inès, id.Zoé].sort().join());
    // Camille et Yanis sont tous deux dans la bulle : leur groupe y devient un cadre, sans trait.
    expect(paires).not.toContain([id.Camille, id.Yanis].sort().join());
    expect(disp.groupes.some((g) => g.membres.includes(id.Camille) && g.membres.includes(id.Yanis))).toBe(true);
  });

  it('fait partir les enfants d’un couple du milieu des parents', () => {
    const b = disp.branches.find((br) => br.enfants.some((e) => e.id === id.Paul))!;
    expect(b.origines).toHaveLength(1);
    expect(b.origines[0].x).toBeCloseTo((p('Gérard').x + p('Claire').x) / 2);
    expect(b.bus).toBe(-0.5);
    expect(b.enfants.map((e) => e.id)).toEqual([id.Paul, id.Emma].sort((x, y) => pos(disp, x).x - pos(disp, y).x));
  });
});

describe('disposerArbre : cas limites', () => {
  it('rend vide si Moi est inconnu', () => {
    const a = atelier();
    a.pers('Ana', 'F', '1990');
    expect(disposerArbre(a.d, 'inconnu').places).toEqual([]);
  });

  it('place Moi seul', () => {
    const a = atelier();
    a.pers('Ana', 'F', '1990');
    a.pers('Bob', 'M', '1990');
    const disp = disposerArbre(a.d, a.id.Ana);
    expect(disp.places).toHaveLength(1);
    verifierInvariants(a.d, disp, a.id.Ana);
  });

  it('enchaîne trois unions sur une ligne (ex – personne – ex – conjoint)', () => {
    const a = atelier();
    for (const [p, s] of [
      ['Max', 'M'],
      ['Ex1', 'F'],
      ['Ex2', 'F'],
      ['Eve', 'F'],
      ['Fils', 'M'],
    ] as const)
      a.pers(p, s, '1980');
    a.union('Max', 'Ex1', true);
    a.union('Max', 'Ex2', true);
    a.union('Max', 'Eve');
    a.enfant('Fils', ['Max', 'Ex2']);
    const disp = disposerArbre(a.d, a.id.Max);
    verifierInvariants(a.d, disp, a.id.Max);
    expect(new Set(['Max', 'Ex1', 'Ex2', 'Eve'].map((p) => pos(disp, a.id[p]).y))).toEqual(new Set([0]));
    expect(pos(disp, a.id.Fils).y).toBe(1);
  });

  it('sépare parents biologiques et adoptifs en deux branches', () => {
    const a = atelier();
    for (const [p, s] of [
      ['Ana', 'F'],
      ['Bio', 'M'],
      ['Bia', 'F'],
      ['Ado', 'M'],
      ['Ada', 'F'],
    ] as const)
      a.pers(p, s, '1980');
    a.union('Bio', 'Bia', true);
    a.union('Ado', 'Ada');
    a.enfant('Ana', ['Bio', 'Bia']);
    a.enfant('Ana', ['Ado', 'Ada'], 'adoptif');
    const disp = disposerArbre(a.d, a.id.Ana);
    verifierInvariants(a.d, disp, a.id.Ana);
    expect(disp.branches).toHaveLength(2);
    expect(disp.branches.map((b) => b.enfants[0].adoptif).sort()).toEqual([false, true]);
    expect(pos(disp, a.id.Ado).y).toBe(-1);
  });

  it('supporte un mariage entre cousins', () => {
    const a = atelier();
    for (const [p, s] of [
      ['Aïeul', 'M'],
      ['Aïeule', 'F'],
      ['Fa', 'M'],
      ['Fb', 'F'],
      ['Ca', 'M'],
      ['Cb', 'F'],
      ['Petit', 'M'],
    ] as const)
      a.pers(p, s, '1980');
    a.union('Aïeul', 'Aïeule');
    a.enfant('Fa', ['Aïeul', 'Aïeule']);
    a.enfant('Fb', ['Aïeul', 'Aïeule']);
    a.enfant('Ca', ['Fa']);
    a.enfant('Cb', ['Fb']);
    a.union('Ca', 'Cb');
    a.enfant('Petit', ['Ca', 'Cb']);
    const disp = disposerArbre(a.d, a.id.Petit);
    verifierInvariants(a.d, disp, a.id.Petit);
    expect(disp.places.filter((p) => !estVirtuel(p.personne.id))).toHaveLength(7);
    expect(pos(disp, a.id.Aïeul).y).toBe(-3);
  });

  it('ne boucle pas sur des données incohérentes (cycle, générations contradictoires)', () => {
    const a = atelier();
    for (const p of ['A', 'B', 'C']) a.pers(p, undefined, '1980');
    a.enfant('B', ['A']);
    a.enfant('C', ['B']);
    // Saisie impossible dans l'application, mais un import peut l'apporter.
    a.d = {
      ...a.d,
      filiations: [...a.d.filiations, { id: 'f-cycle', parent: a.id.C, enfant: a.id.A, type: 'biologique' }],
      unions: [{ id: 'u-x', personneA: a.id.A, personneB: a.id.C, marie: false, statut: 'actuelle' }],
    };
    const disp = disposerArbre(a.d, a.id.A);
    verifierInvariants(a.d, disp, a.id.A);
    expect(disp.places.filter((p) => !estVirtuel(p.personne.id))).toHaveLength(3);
  });

  it('suit un ami d’ami jusque dans la bulle', () => {
    const a = atelier();
    for (const p of ['Moi', 'Ami', 'AmiDAmi', 'Loin']) a.pers(p, undefined, '1990');
    a.ami('Moi', 'Ami');
    a.ami('Ami', 'AmiDAmi');
    a.ami('AmiDAmi', 'Loin');
    const disp = disposerArbre(a.d, a.id.Moi);
    verifierInvariants(a.d, disp, a.id.Moi);
    expect(disp.places.filter((pl) => pl.bulle)).toHaveLength(3);
  });
});

describe('isotone', () => {
  it('garde les voeux compatibles', () => {
    expect(
      isotone(
        [
          { cible: 0, poids: 1 },
          { cible: 5, poids: 1 },
        ],
        [1, 1],
      ),
    ).toEqual([0, 5]);
  });

  it('répartit deux voeux en conflit autour de leur moyenne', () => {
    expect(
      isotone(
        [
          { cible: 2, poids: 1 },
          { cible: 2, poids: 1 },
        ],
        [2, 2],
      ),
    ).toEqual([1, 3]);
  });

  it('pondère les voeux', () => {
    const [x, y] = isotone(
      [
        { cible: 0, poids: 3 },
        { cible: 0, poids: 1 },
      ],
      [2, 2],
    );
    expect(y - x).toBe(2);
    expect(x).toBeCloseTo(-0.5);
  });
});

describe('disposerArbre : groupes d’amis et étiquettes', () => {
  /** Moi, et trois familles amies (couple + un enfant) : deux dans un groupe, la troisième dans un autre. */
  function troisFamilles() {
    const a = atelier();
    a.pers('Moi', undefined, '1985');
    for (const f of ['A', 'B', 'C']) {
      a.pers(`Pere${f}`, 'M', '1980');
      a.pers(`Mere${f}`, 'F', '1982');
      a.pers(`Enfant${f}`, undefined, '2010');
      a.union(`Pere${f}`, `Mere${f}`);
      a.enfant(`Enfant${f}`, [`Pere${f}`, `Mere${f}`]);
    }
    const { id } = a;
    a.d = creerGroupe(a.d, [id.Moi, id.PereA, id.PereB], 'Fac').donnees;
    a.d = creerGroupe(a.d, [id.Moi, id.PereC], 'Voisins').donnees;
    return a;
  }

  it('dessine un cadre par groupe, avec les membres et leurs familles, sans que deux cadres se chevauchent', () => {
    const a = troisFamilles();
    const disp = disposerArbre(a.d, a.id.Moi);
    verifierInvariants(a.d, disp, a.id.Moi);
    expect(disp.groupes.map((g) => g.nom).sort()).toEqual(['Fac', 'Voisins']);
    const fac = disp.groupes.find((g) => g.nom === 'Fac')!;
    expect(fac.membres.sort()).toEqual([a.id.PereA, a.id.PereB].sort());
    expect(fac.amis).toBe(2);
    for (const f of ['A', 'B']) for (const p of ['Pere', 'Mere', 'Enfant']) expect(fac.ids).toContain(a.id[p + f]);
    expect(fac.ids).not.toContain(a.id.PereC);

    // Les groupes sont superposés : les intervalles de lignes des cadres restent disjoints (avec la marge du cadre).
    const y = new Map(disp.places.map((pl) => [pl.personne.id, pl.y]));
    const bornes = disp.groupes
      .map((g) => [Math.min(...g.ids.map((i) => y.get(i)!)) - 0.4, Math.max(...g.ids.map((i) => y.get(i)!)) + 0.4])
      .sort((p, q) => p[0] - q[0]);
    for (let i = 1; i < bornes.length; i++) expect(bornes[i][0]).toBeGreaterThan(bornes[i - 1][1]);
  });

  it('n’écrit aucune amitié en pointillé entre membres d’un même cadre', () => {
    const a = troisFamilles();
    const disp = disposerArbre(a.d, a.id.Moi);
    expect(disp.amities).toEqual([]);
  });

  it('écrit un nom de famille au-dessus de chaque lignée sans parent, pas au-dessus d’un conjoint venu d’ailleurs', () => {
    const a = troisFamilles();
    const disp = disposerArbre(a.d, a.id.Moi);
    // Trois couples d'amis avec enfant ; Moi, seul, sans parent, enfant ni frère, n'est pas nommé.
    expect(disp.etiquettes).toHaveLength(3);
    const place = (n: string) => disp.places.find((pl) => pl.personne.id === a.id[n])!;
    const couple = disp.etiquettes.find((e) => Math.abs(e.x - (place('PereA').x + place('MereA').x) / 2) < 1e-9);
    expect(couple?.texte).toBe('Famille X');
    expect(couple?.y).toBe(place('PereA').y);
  });

  it('cale deux noms au-dessus d’un même couple de part et d’autre de son milieu (V4, défaut du lot 4)', () => {
    const f = martinezVasseur();
    const disp = disposerArbre(f.donnees, f.moi);
    const fins = disp.etiquettes.filter((e) => e.ancre === 'fin');
    expect(fins.length).toBeGreaterThan(0);
    for (const g of fins) {
      const dr = disp.etiquettes.find((e) => e.ancre === 'debut' && e.y === g.y && Math.abs(e.x - g.x - 0.16) < 1e-9);
      expect(dr, g.texte).toBeDefined();
    }
    expect(disp.etiquettes.filter((e) => !e.ancre).every((e) => !disp.etiquettes.some((o) => o !== e && o.y === e.y && Math.abs(o.x - e.x) < 0.5))).toBe(true);
  });

  it('nomme une fratrie par son nom de naissance, dans sa couleur, pas par celui du mari d’une sœur', () => {
    const f = rochefort();
    const disp = disposerArbre(f.donnees, f.moi);
    const fr = disp.etiquettes.find((e) => e.fratrie && e.texte === 'Famille Noiraud');
    expect(fr).toBeDefined();
    expect(fr!.lignee).toBe(couleurFamille({ nom: 'Noiraud' }, f.donnees));
  });
});

describe('disposerArbre : couleurs par nom de famille', () => {
  it('même nom de famille, même couleur (sans casse ni accents) ; le nom actuel prime sur le nom de naissance ; sans nom, pas de couleur', () => {
    let d = donneesVides();
    const id: Record<string, string> = {};
    const pers = (prenom: string, nom: string, sexe: Sexe, extra: { nomNaissance?: string } = {}) => {
      const r = creerPersonne(d, { prenom, nom, sexe, naissance: '1990', ...extra });
      d = r.donnees;
      id[prenom] = r.personne.id;
    };
    pers('Paul', 'Dupont', 'M');
    pers('Gérard', 'DUPONT', 'M');
    pers('Nathalie', 'Dupont', 'F', { nomNaissance: 'Lefèvre' });
    pers('Léo', 'Lefevre', 'M');
    pers('Anonyme', '', 'M');
    d = ajouterUnion(d, id.Gérard, id.Nathalie).donnees;
    d = ajouterFiliation(d, id.Gérard, id.Paul, 'biologique').donnees;
    d = ajouterFiliation(d, id.Nathalie, id.Paul, 'biologique').donnees;
    d = ajouterFiliation(d, id.Gérard, id.Anonyme, 'biologique').donnees;
    d = ajouterFiliation(d, id.Nathalie, id.Léo, 'biologique').donnees;
    const disp = disposerArbre(d, id.Paul);
    const l = (prenom: string) => pos(disp, id[prenom]).lignee;
    expect(l('Gérard')).toBe(l('Paul'));
    expect(l('Nathalie')).toBe(l('Paul'));
    expect(l('Nathalie')).not.toBe(l('Léo'));
    expect(l('Paul')).toBeDefined();
    expect(l('Anonyme')).toBeUndefined();
    // Même couleur que dans la liste et la fiche, quel que soit l'ordre de lecture.
    expect(l('Paul')).toBe(couleurFamille({ nom: 'Dupont' }));
    expect(l('Léo')).toBe(couleurFamille({ nom: 'Lefèvre' }));
  });
});

describe('disposerArbre : parent sans union et familles d’amis', () => {
  it('un parent sans union (ex) se place à côté de l’autre parent, près de ses enfants', () => {
    const a = atelier();
    ['Papi', 'Mamie', 'Oncle', 'Cousin'].forEach((n, i) => a.pers(n, i % 2 ? 'F' : 'M', String(1940 + i)));
    a.pers('Cath', 'F', '1965');
    a.pers('Mich', 'M', '1960');
    a.pers('Moi', 'M', '1996');
    a.pers('Demi', 'M', '1990');
    a.union('Papi', 'Mamie');
    a.enfant('Cath', ['Papi', 'Mamie']);
    a.enfant('Oncle', ['Papi', 'Mamie']);
    a.enfant('Cousin', ['Oncle']);
    a.enfant('Moi', ['Cath']);
    a.enfant('Demi', ['Cath', 'Mich']);
    const x = (n: string) => disposerArbre(a.d, a.id.Moi).places.find((p) => p.personne.id === a.id[n])!.x;
    // Moi n'a que Cath : un « ? » vient aussi près d'elle, d'où un écart de bloc plutôt que de couple.
    expect(Math.abs(x('Mich') - x('Cath'))).toBeLessThanOrEqual(1.3);
  });

  it('deux familles d’amis voisines ne sont pas séparées par un grand vide', () => {
    const a = atelier();
    ['Moi', 'A1', 'A2', 'B1', 'C1', 'C2'].forEach((n) => a.pers(n, undefined, '1990'));
    ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'].forEach((n) => a.pers(n, undefined, '2015'));
    a.d = creerGroupe(a.d, [a.id.Moi, a.id.A1, a.id.B1, a.id.C1]).donnees;
    a.union('A1', 'A2');
    a.union('C1', 'C2');
    ['E1', 'E2', 'E3'].forEach((e) => a.enfant(e, ['A1', 'A2']));
    ['E4', 'E5', 'E6'].forEach((e) => a.enfant(e, ['C1', 'C2']));
    const d = disposerArbre(a.d, a.id.Moi);
    const xs = d.places
      .filter((p) => p.bulle)
      .map((p) => p.x)
      .sort((u, v) => u - v);
    const vide = Math.max(...xs.slice(1).map((v, i) => v - xs[i]));
    expect(vide).toBeLessThanOrEqual(2.01);
  });
  it('montre aussi un groupe d’amis sans lien avec Moi ni sa famille', () => {
    const a = atelier();
    for (const n of ['Moi', 'Ami', 'Nantais1', 'Nantais2']) a.pers(n, undefined, '1990');
    a.ami('Moi', 'Ami');
    a.ami('Nantais1', 'Nantais2');
    const d = disposerArbre(a.d, a.id.Moi);
    expect(d.groupes).toHaveLength(2);
    expect(d.places.map((p) => p.personne.id)).toEqual(expect.arrayContaining([a.id.Nantais1, a.id.Nantais2]));
  });
});

describe('disposerArbre : frères d’un groupe d’amis', () => {
  it('aucun ami ne s’intercale entre deux frères sans parent connu ; un conjoint sans suite n’est pas nommé', () => {
    const a = atelier();
    for (const [p, s] of [
      ['Moi', 'M'],
      ['Baptiste', 'M'],
      ['Marie', 'F'],
      ['Corentin', 'M'],
      ['Mélanie', 'F'],
      ['Paul', 'M'],
      ['Côme', 'M'],
    ] as [string, Sexe][])
      a.pers(p, s, '1990');
    a.union('Baptiste', 'Marie');
    a.union('Corentin', 'Mélanie');
    a.d = creerGroupe(
      a.d,
      ['Moi', 'Baptiste', 'Corentin', 'Paul'].map((n) => a.id[n]),
    ).donnees;
    a.d = ajouterFrereSansParent(a.d, a.id.Baptiste, a.id['Côme']);
    const disp = disposerArbre(a.d, a.id.Moi);
    const x = (n: string) => disp.places.find((pl) => pl.personne.id === a.id[n])!.x;
    const [g, dr] = [x('Baptiste'), x('Côme')].sort((u, v) => u - v);
    for (const n of ['Marie', 'Corentin', 'Mélanie', 'Paul']) {
      const v = x(n);
      expect(v < g || v > dr).toBe(true);
    }
    expect(disp.etiquettes.some((e) => e.texte === 'Famille X' && Math.abs(e.x - x('Corentin')) < 1)).toBe(false);
  });
});

describe('disposerArbre : groupe d’amis sans Moi', () => {
  it('un ami seul ne s’intercale pas entre deux conjoints ; la fratrie sans parent connu porte son nom', () => {
    const a = atelier();
    for (const [p, s] of [
      ['Moi', 'M'],
      ['Adrien', 'M'],
      ['Marie', 'F'],
      ['Baptiste', 'M'],
      ['Corentin', 'M'],
      ['Kilian', 'M'],
      ['Côme', 'M'],
    ] as [string, Sexe][])
      a.pers(p, s, '1990');
    a.union('Adrien', 'Marie');
    a.d = creerGroupe(
      a.d,
      ['Adrien', 'Baptiste', 'Corentin', 'Kilian'].map((n) => a.id[n]),
    ).donnees;
    a.d = ajouterFrereSansParent(a.d, a.id.Baptiste, a.id['Côme']);
    const disp = disposerArbre(a.d, a.id.Moi);
    const x = (n: string) => disp.places.find((pl) => pl.personne.id === a.id[n])!.x;
    expect(Math.abs(x('Adrien') - x('Marie'))).toBeCloseTo(1, 5);
    expect(Math.abs(x('Baptiste') - x('Côme'))).toBeLessThan(2);
    expect(disp.etiquettes.filter((e) => e.texte === 'Famille X')).toHaveLength(1);
  });
});

/** Écart entre le milieu de chaque couple et le milieu de ses enfants (branches parties du milieu d'un couple). */
function decalagesFratries(disp: Disposition): number[] {
  return disp.branches
    .filter((b) => b.origines.length === 1 && b.origines[0].parent === undefined)
    .map((b) => {
      const xs = b.enfants.map((e) => e.x);
      return Math.abs(b.origines[0].x - (Math.min(...xs) + Math.max(...xs)) / 2);
    });
}

/** Fratries d'un couple décentrées de plus d'un centième de place, nommées par leurs prénoms. */
function fratriesDecentrees(disp: Disposition): string[] {
  const prenom = new Map(disp.places.map((p) => [p.personne.id, p.personne.prenom]));
  return disp.branches
    .filter((b) => b.origines.length === 1 && b.origines[0].parent === undefined)
    .flatMap((b) => {
      const xs = b.enfants.map((e) => e.x);
      const ecart = b.origines[0].x - (Math.min(...xs) + Math.max(...xs)) / 2;
      return Math.abs(ecart) < 0.01 ? [] : [`${b.enfants.map((e) => prenom.get(e.id)).join(', ')} : ${ecart.toFixed(2)}`];
    });
}

describe('disposerArbre : centrage des enfants (UX-20)', () => {
  it('centre sous leurs parents les fratries libres de la maquette A', () => {
    const a = maquette();
    const disp = disposerArbre(a.d, a.id.Paul);
    verifierInvariants(a.d, disp, a.id.Paul);
    const p = (prenom: string) => pos(disp, a.id[prenom]).x;
    // Alain et Gérard, Claire et Isabelle : deux fratries tenues l'une à l'autre par le couple Gérard – Claire.
    for (const [pa, pb, ea, eb] of [
      ['Gérard', 'Claire', 'Paul', 'Emma'],
      ['Paul', 'Julie', 'Lou', 'Nathan'],
      ['Alain', 'Sophie', 'Léa', 'Hugo'],
      ['Isabelle', 'Karim', 'Inès', 'Théo'],
    ])
      expect(Math.abs((p(pa) + p(pb)) / 2 - (p(ea) + p(eb)) / 2)).toBeLessThan(0.01);
  });

  it('centre les enfants d’un ex sous le couple séparé ; le beau-père reste à côté', () => {
    const a = atelier();
    for (const [p, s, n] of [
      ['Alain', 'M', '1960'],
      ['Mère', 'F', '1962'],
      ['Karl', 'M', '1958'],
      ['Léo', 'M', '1988'],
      ['Mia', 'F', '1990'],
      ['Tim', 'M', '1999'],
      ['Julie', 'F', '1989'],
      ['Lou', 'F', '2015'],
      ['Nat', 'M', '2017'],
      ['Ugo', 'M', '2019'],
    ] as const)
      a.pers(p, s, n);
    a.union('Alain', 'Mère', true);
    a.union('Mère', 'Karl');
    a.enfant('Léo', ['Alain', 'Mère']);
    a.enfant('Mia', ['Alain', 'Mère']);
    a.enfant('Tim', ['Mère', 'Karl']);
    a.union('Léo', 'Julie');
    for (const e of ['Lou', 'Nat', 'Ugo']) a.enfant(e, ['Léo', 'Julie']);
    const disp = disposerArbre(a.d, a.id.Léo);
    verifierInvariants(a.d, disp, a.id.Léo);
    for (const ecart of decalagesFratries(disp)) expect(ecart).toBeLessThan(0.01);
    // La chaîne ex – mère – beau-père reste dans cet ordre.
    const [alain, mere, karl] = ['Alain', 'Mère', 'Karl'].map((x) => pos(disp, a.id[x]).x);
    expect((mere - alain) * (karl - mere)).toBeGreaterThan(0);
  });
});

describe('disposerArbre : anneau de groupe (UX-21)', () => {
  it('marque les personnes de l’arbre principal qui sont dans un groupe d’amis, sans Moi ni la bulle', () => {
    const a = maquette();
    const disp = disposerArbre(a.d, a.id.Paul);
    const groupe = a.d.groupes.find((g) => g.membres.includes(a.id.Inès))!.id;
    // Inès, de la famille, et Zoé, son amie posée à côté d'elle : le même anneau.
    expect(disp.anneaux).toEqual(
      expect.arrayContaining([
        { id: a.id.Inès, groupe },
        { id: a.id.Zoé, groupe },
      ]),
    );
    expect(disp.anneaux).toHaveLength(2);
  });

  it('pas de second anneau pour une proche déjà membre d’un cadre de groupe', () => {
    const a = maquette();
    a.ami('Paul', 'Emma');
    const disp = disposerArbre(a.d, a.id.Paul);
    const dansUnCadre = new Set(disp.groupes.flatMap((g) => g.membres));
    for (const r of disp.anneaux) expect(dansUnCadre.has(r.id)).toBe(false);
  });
});

describe('disposerArbre : fratries collées (V4, point 13)', () => {
  it('deux fratries mariées entre elles, côte à côte, ont des traits communs à deux hauteurs', () => {
    const a = atelier();
    for (const [p, s, an] of [
      ['Arnaud', 'M', '1930'],
      ['Berthe', 'F', '1932'],
      ['Anatole', 'M', '1960'],
      ['Barnabé', 'M', '1962'],
      ['Cyrille', 'M', '1931'],
      ['Denise', 'F', '1933'],
      ['Claire', 'F', '1961'],
      ['Diane', 'F', '1963'],
    ] as const)
      a.pers(p, s, an);
    a.union('Arnaud', 'Berthe');
    a.union('Cyrille', 'Denise');
    a.union('Anatole', 'Claire');
    a.enfant('Anatole', ['Arnaud', 'Berthe']);
    a.enfant('Barnabé', ['Arnaud', 'Berthe']);
    a.enfant('Claire', ['Cyrille', 'Denise']);
    a.enfant('Diane', ['Cyrille', 'Denise']);
    const disp = disposerArbre(a.d, a.id.Anatole);
    const de = (prenom: string) => disp.branches.find((b) => b.enfants.some((e) => e.id === a.id[prenom]))!;
    const [anatole, claire] = [de('Anatole'), de('Claire')];
    const ecart = Math.abs(Math.min(...claire.enfants.map((e) => e.x)) - Math.max(...anatole.enfants.map((e) => e.x)));
    expect(ecart).toBeLessThan(2);
    expect(anatole.bus).not.toBe(claire.bus);
  });
});

describe('disposerArbre : noms de famille et « née X » (défauts relevés sur un arbre réel, octobre 2026)', () => {
  /**
   * Gaston Castel ∞ Mireille Castel → Maëlys (née Castel, épouse Varlov), Yann, Rémi.
   * Igor Varlov (sans parents) ∞ Maëlys → Zoé ; Yann ∞ Nadia (née Ferrand, sans parents) → Nora ;
   * Rémi ∞ Odette (née Garnier), sœur de Solène par un parent inconnu.
   */
  function castel() {
    const a = atelier();
    a.pers('Gaston', 'M', '1930', { nom: 'Castel' });
    a.pers('Mireille', 'F', '1932', { nom: 'Castel' });
    a.pers('Maëlys', 'F', '1960', { nom: 'Varlov', nomNaissance: 'Castel' });
    a.pers('Yann', 'M', '1962', { nom: 'Castel' });
    a.pers('Rémi', 'M', '1964', { nom: 'Castel' });
    a.pers('Igor', 'M', '1958', { nom: 'Varlov' });
    a.pers('Nadia', 'F', '1963', { nom: 'Castel', nomNaissance: 'Ferrand' });
    a.pers('Odette', 'F', '1965', { nom: 'Castel', nomNaissance: 'Garnier' });
    a.pers('Solène', 'F', '1967', { nom: 'Garnier' });
    a.pers('Zoé', 'F', '1990', { nom: 'Varlov' });
    a.pers('Nora', 'F', '1992', { nom: 'Castel' });
    a.union('Gaston', 'Mireille');
    for (const e of ['Maëlys', 'Yann', 'Rémi']) a.enfant(e, ['Gaston', 'Mireille']);
    a.union('Igor', 'Maëlys');
    a.union('Yann', 'Nadia');
    a.union('Rémi', 'Odette');
    a.enfant('Zoé', ['Igor', 'Maëlys']);
    a.enfant('Nora', ['Yann', 'Nadia']);
    a.d = ajouterFrereSansParent(a.d, a.id.Odette, a.id.Solène);
    return a;
  }

  it('nomme le mari sans parents d’une épouse qui porte son nom mais a ses parents dans l’arbre', () => {
    const a = castel();
    const disp = disposerArbre(a.d, a.id.Zoé);
    const igor = pos(disp, a.id.Igor);
    const varlov = disp.etiquettes.filter((e) => e.texte === 'Famille Varlov');
    expect(varlov).toHaveLength(1);
    expect(varlov[0]).toMatchObject({ x: igor.x, y: igor.y });
    // L'épouse sans parents qui porte le nom de la lignée de son mari n'a toujours pas d'étiquette.
    expect(disp.etiquettes.filter((e) => e.texte === 'Famille Castel').map((e) => e.y)).toEqual([pos(disp, a.id.Gaston).y]);
  });

  it('« née X » seulement pour la seule de sa famille : ni parent connu, ni frère ou sœur', () => {
    const a = castel();
    const disp = disposerArbre(a.d, a.id.Zoé);
    const naissance = (prenom: string) => disp.places.find((pl) => pl.personne.id === a.id[prenom])!.naissance;
    expect(naissance('Nadia')).toBe(true);
    expect(naissance('Maëlys')).toBeUndefined();
    expect(naissance('Odette')).toBeUndefined();
    expect(disp.etiquettes.some((e) => e.fratrie && e.texte === 'Famille Garnier')).toBe(true);
  });

  it('centre chaque nom sur sa personne quand les deux personnes ne sont pas voisines dans la chaîne', () => {
    // Odile Ravel – Bruno Morel – Inès (née Castel) – Hugo Delmas – Tess : seuls Odile et Hugo n'ont pas de parents.
    const a = atelier();
    a.pers('Roger', 'M', '1930', { nom: 'Morel' });
    a.pers('Jeanne', 'F', '1932', { nom: 'Morel' });
    a.pers('Gilles', 'M', '1931', { nom: 'Castel' });
    a.pers('Rose', 'F', '1933', { nom: 'Castel' });
    a.pers('Odile', 'F', '1955', { nom: 'Ravel' });
    a.pers('Bruno', 'M', '1956', { nom: 'Morel' });
    a.pers('Inès', 'F', '1958', { nom: 'Morel', nomNaissance: 'Castel' });
    a.pers('Hugo', 'M', '1957', { nom: 'Delmas' });
    a.pers('Tess', 'F', '1960', { nom: '' });
    for (const [e, n] of [
      ['Ulysse', 'Morel'],
      ['Noé', 'Morel'],
      ['Noam', 'Delmas'],
      ['Gus', 'Delmas'],
    ])
      a.pers(e, undefined, '1985', { nom: n });
    a.union('Roger', 'Jeanne');
    a.union('Gilles', 'Rose');
    a.enfant('Bruno', ['Roger', 'Jeanne']);
    a.enfant('Inès', ['Gilles', 'Rose']);
    a.enfant('Ulysse', ['Odile', 'Bruno']);
    a.union('Bruno', 'Inès', true);
    a.enfant('Noé', ['Bruno', 'Inès']);
    a.enfant('Noam', ['Inès', 'Hugo']);
    a.enfant('Gus', ['Inès', 'Hugo']);
    const disp = disposerArbre(a.d, a.id.Noé);
    verifierInvariants(a.d, disp, a.id.Noé);
    for (const [texte, prenom] of [
      ['Famille Ravel', 'Odile'],
      ['Famille Delmas', 'Hugo'],
    ]) {
      const e = disp.etiquettes.find((x) => x.texte === texte);
      expect(e, texte).toMatchObject({ x: pos(disp, a.id[prenom]).x, y: pos(disp, a.id[prenom]).y });
      expect(e!.ancre, texte).toBeUndefined();
    }
  });
});

describe('disposerArbre : fratrie tenue par une chaîne (défaut relevé sur un arbre réel, octobre 2026)', () => {
  /**
   * Arnaud ∞ Berthe → Gilles (l’aîné), Fabien. Fabien ∞ Lise → Denis (ex Odette, ∞ Ysaline).
   * Roger ∞ Jeanne → Ferdinand, Léandre, Bruno. Gilles ∞ Rose → Inès, Rémi (∞ Mireille), Flore.
   * Bruno ∞ Inès → Noé (Moi) : la chaîne Bruno – Inès porte deux fratries. Les parents du cousin Denis tombent
   * entre Gilles et Roger : trié par ses parents, Denis passait entre Bruno et ses frères.
   */
  it('garde ensemble les frères et sœurs d’un aîné pris dans la chaîne d’une autre fratrie ; le cousin reste dehors', () => {
    const a = atelier();
    for (const [p, s, n] of [
      ['Arnaud', 'M', '1900'],
      ['Berthe', 'F', '1902'],
      ['Fabien', 'M', '1928'],
      ['Lise', 'F', '1927'],
      ['Gilles', 'M', '1925'],
      ['Rose', 'F', '1930'],
      ['Roger', 'M', '1926'],
      ['Jeanne', 'F', '1929'],
      ['Ferdinand', 'M', '1950'],
      ['Léandre', 'M', '1952'],
      ['Bruno', 'M', '1954'],
      ['Inès', 'F', '1955'],
      ['Rémi', 'M', '1957'],
      ['Mireille', 'F', '1958'],
      ['Flore', 'F', '1960'],
      ['Denis', 'M', '1953'],
      ['Odette', 'F', '1954'],
      ['Ysaline', 'F', '1956'],
      ['Noé', 'M', '1985'],
    ] as const)
      a.pers(p, s, n);
    a.union('Arnaud', 'Berthe');
    for (const e of ['Fabien', 'Gilles']) a.enfant(e, ['Arnaud', 'Berthe']);
    a.union('Fabien', 'Lise');
    a.enfant('Denis', ['Fabien', 'Lise']);
    a.union('Denis', 'Odette', true);
    a.union('Denis', 'Ysaline');
    a.union('Roger', 'Jeanne');
    for (const e of ['Ferdinand', 'Léandre', 'Bruno']) a.enfant(e, ['Roger', 'Jeanne']);
    a.union('Gilles', 'Rose');
    for (const e of ['Inès', 'Rémi', 'Flore']) a.enfant(e, ['Gilles', 'Rose']);
    a.union('Rémi', 'Mireille');
    a.union('Bruno', 'Inès');
    a.enfant('Noé', ['Bruno', 'Inès']);
    const disp = disposerArbre(a.d, a.id.Noé);
    verifierInvariants(a.d, disp, a.id.Noé);
    const x = (prenom: string) => pos(disp, a.id[prenom]).x;
    for (const fratrie of [
      ['Inès', 'Rémi', 'Flore'],
      ['Bruno', 'Ferdinand', 'Léandre'],
    ]) {
      const xs = fratrie.map(x);
      for (const cousin of ['Denis', 'Odette', 'Ysaline']) {
        expect(x(cousin) < Math.min(...xs) || x(cousin) > Math.max(...xs), `${cousin} hors de ${fratrie[0]}`).toBe(true);
      }
    }
  });
});

describe('disposerArbre : fratries de trois enfants au plus, toujours centrées (défaut relevé sur un arbre réel, octobre 2026)', () => {
  /**
   * Chaîne Odile – Bruno – Inès – Hugo – Tess : Ulysse et Lina (Odile – Bruno), Noé (Bruno – Inès, Moi),
   * Noam, Gus et Élie mariés (Inès – Hugo). Bruno a deux frères, Inès un frère et une sœur.
   */
  it('centre chaque fratrie d’une longue chaîne sous son couple, quitte à élargir l’arbre', () => {
    const a = atelier();
    for (const [p, s, n] of [
      ['Roger', 'M', '1926'],
      ['Jeanne', 'F', '1929'],
      ['Armel', 'M', '1950'],
      ['Gaspard', 'M', '1952'],
      ['Bruno', 'M', '1954'],
      ['Gilles', 'M', '1925'],
      ['Rose', 'F', '1930'],
      ['Inès', 'F', '1955'],
      ['Rémi', 'M', '1957'],
      ['Flore', 'F', '1960'],
      ['Odile', 'F', '1953'],
      ['Hugo', 'M', '1952'],
      ['Tess', 'F', '1960'],
      ['Ulysse', 'M', '1978'],
      ['Lina', 'F', '1980'],
      ['Noé', 'M', '1985'],
      ['Noam', 'M', '1988'],
      ['Gus', 'M', '1990'],
      ['Élie', 'M', '1992'],
      ['Zoé', 'F', '1989'],
      ['Ana', 'F', '1991'],
      ['Maud', 'F', '1993'],
    ] as const)
      a.pers(p, s, n);
    a.union('Roger', 'Jeanne');
    for (const e of ['Armel', 'Gaspard', 'Bruno']) a.enfant(e, ['Roger', 'Jeanne']);
    a.union('Gilles', 'Rose');
    for (const e of ['Inès', 'Rémi', 'Flore']) a.enfant(e, ['Gilles', 'Rose']);
    a.union('Odile', 'Bruno', true);
    a.union('Inès', 'Hugo', true);
    a.union('Bruno', 'Inès');
    a.union('Hugo', 'Tess');
    for (const e of ['Ulysse', 'Lina']) a.enfant(e, ['Odile', 'Bruno']);
    a.enfant('Noé', ['Bruno', 'Inès']);
    for (const [e, c] of [
      ['Noam', 'Zoé'],
      ['Gus', 'Ana'],
      ['Élie', 'Maud'],
    ]) {
      a.enfant(e, ['Inès', 'Hugo']);
      a.union(e, c);
    }
    const disp = disposerArbre(a.d, a.id.Noé);
    verifierInvariants(a.d, disp, a.id.Noé);
    expect(fratriesDecentrees(disp)).toEqual([]);
  });

  /**
   * Anselme ∞ Perrine (séparés) → Ombeline, Blanche ; Anselme a un frère, Octave, par un parent inconnu.
   * Achille, seul parent connu, → Gaétan, Marius ; Achille a un frère, Timéo. Gaétan ∞ Ombeline (séparés) → Noé (Moi).
   */
  it('centre deux sœurs sous leurs parents quand l’aînée tient à la fratrie de son mari', () => {
    const a = atelier();
    for (const [p, s, n] of [
      ['Anselme', 'M', '1880'],
      ['Perrine', 'F', '1882'],
      ['Octave', 'M', '1884'],
      ['Ombeline', 'F', '1905'],
      ['Blanche', 'F', '1908'],
      ['Achille', 'M', '1875'],
      ['Timéo', 'M', '1878'],
      ['Gaétan', 'M', '1900'],
      ['Marius', 'M', '1898'],
      ['Noé', 'M', '1930'],
    ] as const)
      a.pers(p, s, n);
    a.union('Anselme', 'Perrine', true);
    for (const e of ['Ombeline', 'Blanche']) a.enfant(e, ['Anselme', 'Perrine']);
    a.d = ajouterFrereSansParent(a.d, a.id.Octave, a.id.Anselme);
    for (const e of ['Marius', 'Gaétan']) a.enfant(e, ['Achille']);
    a.d = ajouterFrereSansParent(a.d, a.id.Timéo, a.id.Achille);
    a.union('Gaétan', 'Ombeline', true);
    a.enfant('Noé', ['Gaétan', 'Ombeline']);
    const disp = disposerArbre(a.d, a.id.Noé);
    verifierInvariants(a.d, disp, a.id.Noé);
    expect(fratriesDecentrees(disp)).toEqual([]);
  });
});
