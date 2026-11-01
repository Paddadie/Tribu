// Générations souples (variante V1b de la maquette mockups/generations-souples) : on part de la disposition de
// `disposerArbre` et on ne change que des hauteurs. Une fratrie dont la descente croise le trait d'une autre famille
// monte ou descend d'un sous-niveau dans sa génération ; ses parents restent, ses enfants reviennent à la hauteur
// normale. Les sous-niveaux d'une génération s'empilent et repoussent d'autant les générations suivantes et la bulle.
// Ici : la structure (`preparer`), le dessin déformé (`deformer`, `assouplir`) et la signature d'une disposition ;
// la recherche des décalages est dans soupleRecherche.ts.

import type { Branche, Disposition, PlaceArbre, Point } from './arbreGlobal';

/** Pas d'un sous-niveau, en générations : carte, nom et un trait commun. */
export const SOUS = 0.9;
/** Décalage maximal d'une fratrie, en sous-niveaux. */
export const MAX = 2;

/** Décalages trouvés : [indice de la fratrie, sous-niveaux] pour celles qui bougent, et celles dont le trait commun passe en haut. */
export interface Decalages {
  d: [number, number][];
  h: number[];
}

/** Départ d'une branche : un parent seul, ou le milieu d'un couple. */
type Depart = { parent: string } | { couple: { a: string; b: string } };

/** Une fratrie de la famille (la bulle des amis ne bouge qu'en bloc). */
export interface Fratrie {
  i: number;
  br: Branche;
  parents: string[];
  departs: Depart[];
  enfants: string[];
  /** Hauteur du trait commun au-dessus des enfants, et sous les parents, en générations. */
  ecartBus: number;
  ecartParents: number;
}

/** Ce qu'il faut pour déformer une disposition : la famille (sans la bulle), ses fratries et ses lignes. */
export interface Structure {
  disp: Disposition;
  places: PlaceArbre[];
  couples: Disposition['couples'];
  pos: Map<string, PlaceArbre>;
  brs: Fratrie[];
  /** Indice dans `disp.branches` de chaque fratrie de la famille. */
  rangs: number[];
  conjoints: Map<string, string[]>;
  commeEnfant: Map<string, number[]>;
  /** Ordonnées des générations de la famille, de haut en bas. */
  lignes: number[];
  moi: string;
}

const pousser = <T>(m: Map<string, T[]>, k: string, v: T) => {
  const l = m.get(k);
  if (l) l.push(v);
  else m.set(k, [v]);
};

/** Structure de la famille, ou `undefined` si la disposition est vide ou d'une forme inattendue (on la garde alors telle quelle). */
export function preparer(disp: Disposition, moi: string): Structure | undefined {
  const bulle = new Set(disp.places.filter((p) => p.bulle).map((p) => p.personne.id));
  const places = disp.places.filter((p) => !p.bulle);
  if (places.length === 0) return undefined;
  const couples = disp.couples.filter((c) => !bulle.has(c.a) && !bulle.has(c.b));
  const pos = new Map(places.map((p) => [p.personne.id, p]));
  const brs: Fratrie[] = [];
  const rangs: number[] = [];
  for (const [k, br] of disp.branches.entries()) {
    if (br.enfants.some((e) => bulle.has(e.id))) continue;
    const parents: string[] = [];
    const departs: Depart[] = [];
    for (const o of br.origines) {
      if (o.parent) {
        parents.push(o.parent);
        departs.push({ parent: o.parent });
        continue;
      }
      const c = couples.find((c) => {
        const [a, b] = [pos.get(c.a), pos.get(c.b)];
        return a && b && a.y === o.y && b.y === o.y && Math.abs((a.x + b.x) / 2 - o.x) < 1e-6;
      });
      if (!c) return undefined;
      parents.push(c.a, c.b);
      departs.push({ couple: c });
    }
    brs.push({
      i: brs.length,
      br,
      parents,
      departs,
      enfants: br.enfants.map((e) => e.id),
      ecartBus: br.enfants[0].y - br.bus,
      ecartParents: br.bus - Math.max(...br.origines.map((o) => o.y)),
    });
    rangs.push(k);
  }
  const conjoints = new Map<string, string[]>();
  for (const c of couples) {
    pousser(conjoints, c.a, c.b);
    pousser(conjoints, c.b, c.a);
  }
  const commeEnfant = new Map<string, number[]>();
  for (const b of brs) for (const e of b.enfants) pousser(commeEnfant, e, b.i);
  const lignes = [...new Set(places.map((p) => p.y))].sort((a, b) => a - b);
  return { disp, places, couples, pos, brs, rangs, conjoints, commeEnfant, lignes, moi };
}

/** La valeur la plus forte en valeur absolue (vers le bas en cas d'égalité). */
const fort = (vs: number[]) => vs.reduce((m, v) => (Math.abs(v) > Math.abs(m) || (Math.abs(v) === Math.abs(m) && v > m) ? v : m), 0);

/** Sous-niveau de chaque personne de la famille, d'après le décalage `d[i]` de chaque fratrie. */
export function niveaux(S: Structure, d: number[]): Map<string, number> {
  const niv = new Map<string, number>();
  const parLigne = new Map<number, string[]>();
  for (const p of S.places) {
    const l = parLigne.get(p.y);
    if (l) l.push(p.personne.id);
    else parLigne.set(p.y, [p.personne.id]);
  }
  for (const y of S.lignes) {
    const ids = parLigne.get(y)!;
    const allies: string[] = [];
    for (const id of ids) {
      const enf = S.commeEnfant.get(id) ?? [];
      // Un allié (sans parents dans l'arbre) suit son conjoint.
      if (!enf.length) {
        allies.push(id);
        continue;
      }
      niv.set(id, Math.max(-MAX * 2, Math.min(MAX * 2, fort(enf.map((i) => d[i])))));
    }
    // Les conjoints d'une même ligne restent à la même hauteur (alliés compris, remariages en chaîne) :
    // chaque groupe de conjoints prend le décalage le plus fort de ses membres.
    for (const id of allies) niv.set(id, 0);
    const vus = new Set<string>();
    for (const id of ids) {
      if (vus.has(id)) continue;
      const groupe = [id];
      vus.add(id);
      for (let k = 0; k < groupe.length; k++)
        for (const c of S.conjoints.get(groupe[k]) ?? [])
          if (!vus.has(c) && S.pos.get(c)!.y === y) {
            vus.add(c);
            groupe.push(c);
          }
      const v = fort(groupe.map((c) => niv.get(c)!));
      for (const c of groupe) niv.set(c, v);
    }
  }
  return niv;
}

/** La famille déformée : places, branches et noms de famille aux nouvelles hauteurs. */
export interface Deformee {
  places: PlaceArbre[];
  /** Branches de la famille, dans l'ordre de `S.brs`. */
  branches: Branche[];
  /** Sous-niveaux ajoutés, toutes générations comprises. */
  sousNiveaux: number;
  /** Ordonnée d'une génération d'avant → ordonnée de sa ligne normale (sous-niveau 0). */
  base: Map<number, number>;
  /** Descente de tout ce qui est sous la dernière génération de la famille (la bulle). */
  descente: number;
  Y: (id: string) => number;
}

/** Ordonnées empilées, départs et traits communs recalculés. `hauts[i]` : le trait commun de la fratrie passe juste sous ses parents. */
export function deformer(S: Structure, niv: Map<string, number>, hauts: boolean[]): Deformee {
  const { pos } = S;
  const bornes = new Map<number, [number, number]>();
  for (const p of S.places) {
    const v = niv.get(p.personne.id) ?? 0;
    const b = bornes.get(p.y) ?? bornes.set(p.y, [0, 0]).get(p.y)!;
    b[0] = Math.min(b[0], v);
    b[1] = Math.max(b[1], v);
  }
  // Base de chaque ligne : la ligne suivante commence un écart d'origine sous le dernier sous-niveau de la précédente.
  const base = new Map<number, number>();
  let prec: number | null = null;
  for (const y of S.lignes) {
    const [lo] = bornes.get(y)!;
    base.set(y, prec === null ? y : base.get(prec)! + bornes.get(prec)![1] * SOUS + (y - prec) - lo * SOUS);
    prec = y;
  }
  const Y = (id: string) => base.get(pos.get(id)!.y)! + (niv.get(id) ?? 0) * SOUS;
  const X = (id: string) => pos.get(id)!.x;
  const places = S.places.map((p) => ({ ...p, y: Y(p.personne.id) }));
  const enHaut = (id: string) => (niv.get(id) ?? 0) === bornes.get(pos.get(id)!.y)![0];
  const branches: (Omit<Branche, 'bus'> & { bus: number | null; haut: Point })[] = S.brs.map((b) => {
    const enfants = b.br.enfants.map((e) => ({ ...e, y: Y(e.id) })).sort((p, q) => p.x - q.x);
    const origines = b.departs.flatMap((o, k): Branche['origines'] => {
      const avant = b.br.origines[k];
      // Un parent inconnu n'a pas de carte : son départ (non dessiné) reste sur la base de sa ligne.
      if ('parent' in o && !pos.has(o.parent)) return [{ ...avant, y: base.get(avant.y) ?? avant.y }];
      if ('parent' in o) return [{ ...avant, x: X(o.parent), y: Y(o.parent) }];
      const [ya, yb] = [Y(o.couple.a), Y(o.couple.b)];
      if (Math.abs(ya - yb) < 1e-9) return [{ x: (X(o.couple.a) + X(o.couple.b)) / 2, y: ya }];
      // Couple coupé par un décalage : chaque parent descend de sous son nom.
      return [o.couple.a, o.couple.b].map((id) => ({ x: X(id), y: Y(id), parent: id }));
    });
    const haut = enfants.reduce((m, e) => (e.y < m.y ? e : m));
    // Trait commun haut : juste sous les parents (même écart qu'avant), pour passer au-dessus d'une famille placée
    // plus bas. Sinon juste au-dessus des enfants, si la fratrie est sur le sous-niveau le plus haut de sa ligne.
    const bus = hauts[b.i] ? Math.max(...origines.map((o) => o.y)) + b.ecartParents : enHaut(haut.id) ? haut.y - b.ecartBus : null;
    return { ...b.br, origines, enfants, bus, haut };
  });
  // Traits communs d'un sous-niveau : juste au-dessus des enfants, étagés quand ils se chevauchent.
  const aEtager = new Map<string, typeof branches>();
  for (const br of branches) {
    if (br.bus !== null) continue;
    const k = br.haut.y.toFixed(4);
    const l = aEtager.get(k);
    if (l) l.push(br);
    else aEtager.set(k, [br]);
  }
  const portee = (br: (typeof branches)[number]) => {
    const v = [...br.origines.filter((o) => !o.inconnu).map((o) => o.x), ...br.enfants.map((e) => e.x)];
    return [Math.min(...v), Math.max(...v)];
  };
  for (const ligne of aEtager.values()) {
    const fins: number[] = [];
    for (const br of ligne.sort((p, q) => portee(p)[0] - portee(q)[0])) {
      const [lo, hi] = portee(br);
      let k = fins.findIndex((f) => f < lo - 0.3);
      if (k < 0) k = fins.length;
      fins[k] = hi;
      br.bus = br.haut.y - (0.17 + 0.06 * Math.min(k, 2));
    }
  }
  const derniere = S.lignes[S.lignes.length - 1];
  return {
    places,
    branches: branches.map(({ haut, ...br }) => ({ ...br, bus: br.bus! })),
    sousNiveaux: [...bornes.values()].reduce((s, [lo, hi]) => s + hi - lo, 0),
    base,
    descente: base.get(derniere)! + bornes.get(derniere)![1] * SOUS - derniere,
    Y,
  };
}

/** Décalages par fratrie (tableaux complets) à partir de leur forme compacte. */
export function deplier(S: Structure, dec: Decalages): { d: number[]; h: boolean[] } {
  const d = new Array<number>(S.brs.length).fill(0);
  const h = new Array<boolean>(S.brs.length).fill(false);
  for (const [i, v] of dec.d) if (i < d.length) d[i] = v;
  for (const i of dec.h) if (i < h.length) h[i] = true;
  return { d, h };
}

/** Disposition complète avec la famille déformée : la bulle des amis descend d'autant que la famille s'est allongée. */
export function recomposer(S: Structure, f: Deformee): Disposition {
  const { disp } = S;
  const descendre = <T extends Point>(p: T): T => ({ ...p, y: p.y + f.descente });
  const parId = new Map(f.places.map((p) => [p.personne.id, p]));
  const places = disp.places.map((p) => parId.get(p.personne.id) ?? descendre(p));
  const branches = disp.branches.map((br) => ({ ...br, origines: br.origines.map(descendre), bus: br.bus + f.descente, enfants: br.enfants.map(descendre) }));
  S.rangs.forEach((k, i) => (branches[k] = f.branches[i]));
  const derniere = S.lignes[S.lignes.length - 1];
  const etiquettes = disp.etiquettes.map((e) => {
    // Un nom de famille suit la personne de sa ligne la plus proche ; sous la famille, il descend avec la bulle.
    let m: PlaceArbre | null = null;
    for (const p of S.places) if (Math.abs(p.y - e.y) < 1 && (!m || Math.abs(p.x - e.x) < Math.abs(m.x - e.x))) m = p;
    if (m) return { ...e, y: e.y + f.Y(m.personne.id) - m.y };
    return e.y > derniere ? descendre(e) : e;
  });
  return { ...disp, places, branches, etiquettes };
}

/** Disposition avec les décalages trouvés par la recherche (ou ceux d'un calcul gardé). */
export function assouplir(disp: Disposition, moi: string, dec: Decalages): Disposition {
  if (dec.d.length === 0 && dec.h.length === 0) return disp;
  const S = preparer(disp, moi);
  if (!S) return disp;
  const { d, h } = deplier(S, dec);
  return recomposer(S, deformer(S, niveaux(S, d), h));
}

/** Empreinte d'une disposition (personnes, places, couples, branches) : les décalages gardés ne valent que pour elle. */
export function signature(disp: Disposition, moi: string): string {
  const n = (v: number) => (Math.round(v * 1000) / 1000).toString();
  const parties = [
    moi,
    ...disp.places.map((p) => `${p.personne.id}@${n(p.x)},${n(p.y)}${p.bulle ? 'b' : ''}`),
    ...disp.couples.map((c) => `${c.a}+${c.b}`),
    ...disp.branches.map(
      (b) => `${b.origines.map((o) => `${o.parent ?? ''}:${n(o.x)},${n(o.y)}`).join(';')}>${n(b.bus)}>${b.enfants.map((e) => e.id).join(',')}`,
    ),
  ];
  // Deux empreintes FNV-1a de 32 bits (dans les deux sens), et le nombre de places.
  let a = 0x811c9dc5;
  let b = 0x811c9dc5;
  const texte = parties.join('|');
  for (let i = 0; i < texte.length; i++) {
    a = Math.imul(a ^ texte.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ texte.charCodeAt(texte.length - 1 - i), 0x01000193);
  }
  return `${disp.places.length}-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
}
