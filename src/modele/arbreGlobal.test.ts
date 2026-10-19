import { describe, expect, it } from 'vitest';
import { disposerArbre, isotone, type Disposition } from './arbreGlobal';
import { ajouterFiliation, ajouterFrereSansParent, ajouterUnion, creerGroupe, creerPersonne, donneesVides, separerUnion } from './modele';
import { estVirtuel } from './parentSansNom';
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
    pers: (prenom: string, sexe: Sexe | undefined, annee: string) => {
      const r = creerPersonne(d, { prenom, nom: 'X', sexe, naissance: annee });
      d = r.donnees;
      id[prenom] = r.personne.id;
    },
    union: (x: string, y: string, separes = false) => {
      const r = ajouterUnion(d, id[x], id[y]);
      d = separes ? separerUnion(r.donnees, r.union.id) : r.donnees;
    },
    enfant: (e: string, parents: string[], type: TypeFiliation = 'biologique') =>
      parents.forEach((p) => (d = ajouterFiliation(d, id[p], id[e], type).donnees)),
    ami: (x: string, y: string) => (d = creerGroupe(d, [id[x], id[y]]).donnees),
  };
  return a;
}

/**
 * Famille de la maquette A (Paul est « Moi ») :
 * Jean † ∞ Simone → Michel, Alain ; Robert ∞ Agnès → Claire, Isabelle ; Michel ∞ Claire → Paul, Emma
 * Paul ∞ Julie → Lou, Nathan ; Emma ∞ Nicolas ; Alain ∞ Sophie (séparés) → Léa, Hugo ; Isabelle ∞ Karim → Inès, Théo
 * Zoé, amie d'Inès. Amis de Paul : Thomas ∞ Laure → Jules ; Camille, Marc, Sarah ; Yanis, ami de Camille.
 * Odile : sans aucun lien.
 */
function maquette() {
  const a = atelier();
  const gens: [string, Sexe, string][] = [
    ['Paul', 'M', '1990'], ['Julie', 'F', '1991'], ['Michel', 'M', '1962'], ['Claire', 'F', '1964'],
    ['Emma', 'F', '1993'], ['Nicolas', 'M', '1990'], ['Lou', 'F', '2020'], ['Nathan', 'M', '2022'],
    ['Jean', 'M', '1938'], ['Simone', 'F', '1940'], ['Alain', 'M', '1965'], ['Sophie', 'F', '1967'],
    ['Léa', 'F', '1995'], ['Hugo', 'M', '1998'], ['Robert', 'M', '1937'], ['Agnès', 'F', '1941'],
    ['Isabelle', 'F', '1968'], ['Karim', 'M', '1966'], ['Inès', 'F', '1997'], ['Théo', 'M', '2000'],
    ['Zoé', 'F', '1997'], ['Thomas', 'M', '1989'], ['Laure', 'F', '1990'], ['Jules', 'M', '2019'],
    ['Camille', 'F', '1991'], ['Marc', 'M', '1988'], ['Sarah', 'F', '1992'], ['Yanis', 'M', '1990'],
    ['Odile', 'F', '1950'],
  ];
  gens.forEach(([p, s, n]) => a.pers(p, s, n));
  a.union('Jean', 'Simone');
  a.enfant('Michel', ['Jean', 'Simone']);
  a.enfant('Alain', ['Jean', 'Simone']);
  a.union('Robert', 'Agnès');
  a.enfant('Claire', ['Robert', 'Agnès']);
  a.enfant('Isabelle', ['Robert', 'Agnès']);
  a.union('Michel', 'Claire');
  a.enfant('Paul', ['Michel', 'Claire']);
  a.enfant('Emma', ['Michel', 'Claire']);
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
  a.ami('Paul', 'Thomas');
  a.ami('Paul', 'Camille');
  a.ami('Paul', 'Marc');
  a.ami('Paul', 'Sarah');
  a.ami('Camille', 'Yanis');
  a.union('Thomas', 'Laure');
  a.enfant('Jules', ['Thomas', 'Laure']);
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
    expect(p('Michel').y).toBe(-1);
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
    expect(p('Michel').x).toBeLessThan(p('Claire').x);
    expect((p('Jean').x + p('Simone').x) / 2).toBeLessThan((p('Robert').x + p('Agnès').x) / 2);
    expect(p('Lou').x).toBeLessThan(p('Nathan').x);
    expect(p('Léa').x).toBeLessThan(p('Hugo').x);
  });

  it('place les parents au-dessus de leurs enfants', () => {
    const milieu = (x: string, y: string) => (p(x).x + p(y).x) / 2;
    expect(milieu('Michel', 'Claire')).toBeCloseTo(milieu('Paul', 'Emma'), 0);
    expect(Math.abs(milieu('Paul', 'Julie') - milieu('Lou', 'Nathan'))).toBeLessThan(1);
  });

  it('garde les frères et sœurs groupés (seuls leurs conjoints et amis peuvent s’intercaler)', () => {
    const lies = (x: string) => [
      ...d.unions.flatMap((u) => (u.personneA === x ? [u.personneB] : u.personneB === x ? [u.personneA] : [])),
      ...d.groupes.flatMap((g) => (g.membres.includes(x) ? g.membres.filter((m) => m !== x) : [])),
    ];
    for (const fratrie of [['Paul', 'Emma'], ['Léa', 'Hugo'], ['Inès', 'Théo'], ['Michel', 'Alain'], ['Claire', 'Isabelle']]) {
      const xs = fratrie.map((f) => p(f).x);
      const admis = new Set(fratrie.flatMap((f) => [id[f], ...lies(id[f])]));
      const y = p(fratrie[0]).y;
      const entre = disp.places.filter((pl) => pl.y === y && pl.x > Math.min(...xs) && pl.x < Math.max(...xs));
      for (const pl of entre) expect(admis.has(pl.personne.id), pl.personne.prenom).toBe(true);
    }
  });

  it('met les amis de Moi et leurs familles dans la bulle, sous la famille', () => {
    const bulle = ['Thomas', 'Laure', 'Jules', 'Camille', 'Marc', 'Sarah', 'Yanis'];
    for (const pl of disp.places) expect(pl.bulle, pl.personne.prenom).toBe(bulle.includes(pl.personne.prenom));
    const basFamille = Math.max(...disp.places.filter((pl) => !pl.bulle).map((pl) => pl.y));
    for (const b of bulle) expect(p(b).y).toBeGreaterThan(basFamille + 1);
    expect(p('Jules').y - p('Thomas').y).toBe(1);
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
    expect(b.origines[0].x).toBeCloseTo((p('Michel').x + p('Claire').x) / 2);
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
    for (const [p, s] of [['Max', 'M'], ['Ex1', 'F'], ['Ex2', 'F'], ['Eve', 'F'], ['Fils', 'M']] as const) a.pers(p, s, '1980');
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
    for (const [p, s] of [['Ana', 'F'], ['Bio', 'M'], ['Bia', 'F'], ['Ado', 'M'], ['Ada', 'F']] as const) a.pers(p, s, '1980');
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
    for (const [p, s] of [['Aïeul', 'M'], ['Aïeule', 'F'], ['Fa', 'M'], ['Fb', 'F'], ['Ca', 'M'], ['Cb', 'F'], ['Petit', 'M']] as const) a.pers(p, s, '1980');
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
    expect(isotone([{ cible: 0, poids: 1 }, { cible: 5, poids: 1 }], [1, 1])).toEqual([0, 5]);
  });

  it('répartit deux voeux en conflit autour de leur moyenne', () => {
    expect(isotone([{ cible: 2, poids: 1 }, { cible: 2, poids: 1 }], [2, 2])).toEqual([1, 3]);
  });

  it('pondère les voeux', () => {
    const [x, y] = isotone([{ cible: 0, poids: 3 }, { cible: 0, poids: 1 }], [2, 2]);
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

    // Largeur d'un cadre en pixels (80 px par place, nœud de 76 px, marge de 8 px) : les intervalles restent disjoints.
    const x = new Map(disp.places.map((pl) => [pl.personne.id, pl.x]));
    const bornes = disp.groupes
      .map((g) => [Math.min(...g.ids.map((i) => x.get(i)! * 80)) - 46, Math.max(...g.ids.map((i) => x.get(i)! * 80)) + 46])
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
    pers('Paul', 'Dabadie', 'M');
    pers('Michel', 'DABADIE', 'M');
    pers('Cécile', 'Dabadie', 'F', { nomNaissance: 'Léger' });
    pers('Léo', 'Leger', 'M');
    pers('Anonyme', '', 'M');
    d = ajouterUnion(d, id.Michel, id.Cécile).donnees;
    d = ajouterFiliation(d, id.Michel, id.Paul, 'biologique').donnees;
    d = ajouterFiliation(d, id.Cécile, id.Paul, 'biologique').donnees;
    d = ajouterFiliation(d, id.Michel, id.Anonyme, 'biologique').donnees;
    d = ajouterFiliation(d, id.Cécile, id.Léo, 'biologique').donnees;
    const disp = disposerArbre(d, id.Paul);
    const l = (prenom: string) => pos(disp, id[prenom]).lignee;
    expect(l('Michel')).toBe(l('Paul'));
    expect(l('Cécile')).toBe(l('Paul'));
    expect(l('Cécile')).not.toBe(l('Léo'));
    expect(l('Paul')).toBeDefined();
    expect(l('Anonyme')).toBeUndefined();
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
    const xs = d.places.filter((p) => p.bulle).map((p) => p.x).sort((u, v) => u - v);
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
    for (const [p, s] of [['Moi', 'M'], ['Baptiste', 'M'], ['Marie', 'F'], ['Corentin', 'M'], ['Mélanie', 'F'], ['Paul', 'M'], ['Côme', 'M']] as [string, Sexe][]) a.pers(p, s, '1990');
    a.union('Baptiste', 'Marie');
    a.union('Corentin', 'Mélanie');
    a.d = creerGroupe(a.d, ['Moi', 'Baptiste', 'Corentin', 'Paul'].map((n) => a.id[n])).donnees;
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
    for (const [p, s] of [['Moi', 'M'], ['Adrien', 'M'], ['Marie', 'F'], ['Baptiste', 'M'], ['Corentin', 'M'], ['Kilian', 'M'], ['Côme', 'M']] as [string, Sexe][]) a.pers(p, s, '1990');
    a.union('Adrien', 'Marie');
    a.d = creerGroupe(a.d, ['Adrien', 'Baptiste', 'Corentin', 'Kilian'].map((n) => a.id[n])).donnees;
    a.d = ajouterFrereSansParent(a.d, a.id.Baptiste, a.id['Côme']);
    const disp = disposerArbre(a.d, a.id.Moi);
    const x = (n: string) => disp.places.find((pl) => pl.personne.id === a.id[n])!.x;
    expect(Math.abs(x('Adrien') - x('Marie'))).toBeCloseTo(1, 5);
    expect(Math.abs(x('Baptiste') - x('Côme'))).toBeLessThan(2);
    expect(disp.etiquettes.filter((e) => e.texte === 'Famille X')).toHaveLength(1);
  });
});
