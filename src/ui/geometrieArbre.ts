// Géométrie de l'arbre global en pixels (à l'échelle 1), partagée par l'écran (arbreGlobal.ts) et l'export PNG
// (arbreImage.ts) : positions, cadres des groupes, zone de la bulle, passage vers la bulle et tracés des traits.

import type { Disposition, GroupeDessine, Point } from '../modele/arbreGlobal';
import { LARG, PAS_X, PAS_Y, R, SOUS_NOM } from '../modele/geometrie';
import { placerMentions, sansVoisinEntre, segmentsDe, unionEntre, type Boite, type MentionUnion, type Obstacles, type Palier } from '../modele/mentionsUnion';
import type { Union } from '../modele/types';

export { LARG, LIGNE_EN_PLUS, LIGNE_NAISSANCE, PAS_X, PAS_Y, R, SOUS_NOM } from '../modele/geometrie';
export const MARGE = 70;

/** Cadre d'un groupe d'amis, en pixels : de l'étiquette (haut) au nom de la dernière ligne (bas). */
export interface Cadre {
  groupe: GroupeDessine;
  x: number;
  y: number;
  l: number;
  ha: number;
}
/** Dans la bulle : le cadre commence 56 px au-dessus du centre de l'avatar, la zone « TES AMIS » 34 px plus haut. */
export const HAUT_CADRE = R + 56;
export const HAUT_ZONE = 34;
export const MARGE_CADRE = 8;

export interface ZoneBulle {
  g: number;
  dr: number;
  ha: number;
  ba: number;
}

/** Un trait à tracer : chemin SVG, classes de style (celles du CSS de l'écran) et lignée dont il prend la couleur. */
export interface Trait {
  /** Tracé géométrique : lu par les calculs (noms, mentions d'union), toujours un segment droit pour un trait commun. */
  d: string;
  /** Tracé à dessiner s'il diffère de `d` : le même trait, avec ses petits ponts au-dessus des traits qu'il croise. */
  dessin?: string;
  classe: string;
  lignee?: number;
}

/** Rayon, en pixels, du petit arc d'un trait qui passe au-dessus d'un autre sans lui être relié. */
export const RAYON_PONT = 4;

/**
 * Trait horizontal de `x1` à `x2` à l'ordonnée `y`, avec un petit arc au-dessus de chaque abscisse de `croisements`
 * (traits verticaux d'autres branches). Pas d'arc trop près d'une extrémité ni d'un autre arc : le trait reste droit.
 */
export function trajetAvecPonts(x1: number, x2: number, y: number, croisements: number[]): string {
  let d = `M ${x1} ${y}`;
  let fin = x1;
  for (const x of [...croisements].sort((a, b) => a - b)) {
    if (x - RAYON_PONT < fin + 1 || x + RAYON_PONT > x2 - 1) continue;
    d += ` H ${x - RAYON_PONT} a ${RAYON_PONT} ${RAYON_PONT} 0 0 1 ${2 * RAYON_PONT} 0`;
    fin = x + RAYON_PONT;
  }
  return `${d} H ${x2}`;
}

export interface Positions {
  largeur: number;
  hauteur: number;
  px: (p: Point) => Point;
  centres: Map<string, Point>;
}

/** Position en pixels de chaque personne et taille du dessin, marges comprises. */
export function positions(disp: Disposition): Positions {
  const xs = disp.places.map((p) => p.x);
  const ys = disp.places.map((p) => p.y);
  const ox = MARGE + LARG / 2 - Math.min(...xs) * PAS_X;
  // Une bulle tout en haut (export d'un groupe, Moi dans le cadre : pageAmis.ts) garde la place de son en-tête.
  const oy = MARGE - Math.min(...disp.places.map((p) => p.y * PAS_Y - (p.bulle ? HAUT_CADRE + HAUT_ZONE : R)));
  const px = (p: Point): Point => ({ x: ox + p.x * PAS_X, y: oy + p.y * PAS_Y });
  const centres = new Map(disp.places.map((pl) => [pl.personne.id, px(pl)]));
  return {
    largeur: ox + Math.max(...xs) * PAS_X + LARG / 2 + MARGE,
    hauteur: oy + Math.max(...ys) * PAS_Y + SOUS_NOM + MARGE,
    px,
    centres,
  };
}

/** Courbe douce passant par tous les points, partant et arrivant à la verticale. */
export function lisse(points: Point[]): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const dy = (b.y - a.y) / 2;
    d += ` C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
  }
  return d;
}

/** Un cadre par groupe : le rectangle qui entoure les membres et leurs familles dans la bulle. */
export function calculerCadres(disp: Disposition, centres: Map<string, Point>): Cadre[] {
  return disp.groupes.flatMap((groupe) => {
    const c = groupe.ids.map((id) => centres.get(id)).filter((p): p is Point => p !== undefined);
    if (c.length === 0) return [];
    const x = Math.min(...c.map((p) => p.x)) - LARG / 2 - MARGE_CADRE;
    const y = Math.min(...c.map((p) => p.y)) - HAUT_CADRE;
    return [{ groupe, x, y, l: Math.max(...c.map((p) => p.x)) + LARG / 2 + MARGE_CADRE - x, ha: Math.max(...c.map((p) => p.y)) + SOUS_NOM + MARGE_CADRE - y }];
  });
}

export function zoneBulle(disp: Disposition, centres: Map<string, Point>, cadres: Cadre[]): ZoneBulle | undefined {
  const pts = disp.places.filter((p) => p.bulle).map((p) => centres.get(p.personne.id)!);
  if (pts.length === 0) return undefined;
  const g = Math.min(...pts.map((p) => p.x - LARG / 2), ...cadres.map((c) => c.x)) - 14;
  const dr = Math.max(...pts.map((p) => p.x + LARG / 2), ...cadres.map((c) => c.x + c.l)) + 14;
  const ha = Math.min(...pts.map((p) => p.y - HAUT_CADRE), ...cadres.map((c) => c.y)) - HAUT_ZONE;
  const ba = Math.max(...pts.map((p) => p.y + SOUS_NOM + MARGE_CADRE), ...cadres.map((c) => c.y + c.ha)) + 14;
  return { g, dr, ha, ba };
}

/**
 * Passage du pointillé de Moi jusqu'à la bulle : il descend en se glissant, à chaque ligne de la famille
 * sous Moi, dans l'espace libre le plus proche entre deux personnes (sans traverser de nom).
 */
export function versBulle(disp: Disposition, centres: Map<string, Point>, moi: string, arrivee: Point): Point[] {
  const m = centres.get(moi)!;
  const points: Point[] = [{ x: m.x, y: m.y + SOUS_NOM }];
  const lignes = new Map<number, number[]>();
  for (const p of disp.places) {
    const c = centres.get(p.personne.id)!;
    if (!p.bulle && c.y > m.y) lignes.set(c.y, [...(lignes.get(c.y) ?? []), c.x]);
  }
  let x = m.x;
  for (const [y, xs] of [...lignes].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b);
    const libre = (v: number) => xs.every((c) => Math.abs(c - v) >= LARG / 2 + 4);
    if (!libre(x)) {
      const trous = [xs[0] - LARG, xs[xs.length - 1] + LARG];
      for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] >= LARG + 8) trous.push((xs[i] + xs[i - 1]) / 2);
      x = trous.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
    }
    points.push({ x, y: y + 6 });
  }
  points.push(arrivee);
  return points;
}

/** Tous les traits de liens : couples, branches parents-enfants, amitiés et passage vers la bulle (dans cet ordre). */
export function traitsArbre(disp: Disposition, p: Positions, bulle: ZoneBulle | undefined, moi: string): Trait[] {
  const { px, centres } = p;
  const traits: Trait[] = [];
  const centre = (id: string) => centres.get(id)!;

  for (const c of disp.couples) {
    const [a, b] = [centre(c.a), centre(c.b)].sort((u, v) => u.x - v.x);
    // Même ligne : trait droit, même quand l'écart est grand (chaîne d'ex). Lignes différentes : courbe.
    const d = a.y === b.y ? `M ${a.x + R} ${a.y} H ${b.x - R}` : `M ${a.x} ${a.y - R} C ${a.x} ${a.y - R - 46}, ${b.x} ${b.y - R - 46}, ${b.x} ${b.y - R}`;
    // Marié(e) : trait plein ; en couple : tirets courts ; séparé(e) : points ronds gris.
    traits.push({ d, classe: `trait couple${c.marie ? '' : ' libre'}${c.separe ? ' ex' : ''}`, lignee: c.separe ? undefined : c.lignee });
  }

  // Traits verticaux de chaque branche : un trait commun passe par-dessus ceux des autres branches qui le traversent.
  const verticaux = disp.branches.map((br) => {
    const bus = px({ x: 0, y: br.bus }).y;
    return [
      ...br.origines.filter((o) => !o.inconnu).map((o) => ({ x: px(o).x, haut: o.parent !== undefined ? px(o).y + SOUS_NOM : px(o).y, bas: bus })),
      ...br.enfants.map((e) => ({ x: px(e).x, haut: bus, bas: px(e).y - R - 3 })),
    ];
  });

  for (const [i, br] of disp.branches.entries()) {
    const bus = px({ x: 0, y: br.bus }).y;
    // Un parent inconnu n'a ni nom ni trait : seul le trait commun relie les frères et sœurs.
    const origines = br.origines.filter((o) => !o.inconnu).map((o) => ({ ...px(o), seul: o.parent !== undefined }));
    const enfants = br.enfants.map((e) => ({ ...px(e), adoptif: e.adoptif }));
    // Tous adoptés : toute la branche en tirets longs ; sinon tronc plein et chaque descente selon son type.
    const classe = enfants.every((e) => e.adoptif) ? 'trait adoption' : 'trait';
    for (const o of origines) traits.push({ d: `M ${o.x} ${o.seul ? o.y + SOUS_NOM : o.y} V ${bus}`, classe, lignee: br.lignee });
    const xs = [...origines, ...enfants].map((q) => q.x);
    if (Math.max(...xs) - Math.min(...xs) > 0.5) {
      const [g, dr] = [Math.min(...xs), Math.max(...xs)];
      const croisements = verticaux.flatMap((vs, j) =>
        j === i ? [] : vs.filter((v) => v.x > g + 0.5 && v.x < dr - 0.5 && v.haut < bus - 0.5 && v.bas > bus + 0.5).map((v) => v.x),
      );
      const d = `M ${g} ${bus} H ${dr}`;
      const dessin = croisements.length > 0 ? trajetAvecPonts(g, dr, bus, croisements) : d;
      traits.push({ d, ...(dessin !== d ? { dessin } : {}), classe, lignee: br.lignee });
    }
    for (const e of enfants) traits.push({ d: `M ${e.x} ${bus} V ${e.y - R - 3}`, classe: e.adoptif ? 'trait adoption' : 'trait', lignee: br.lignee });
  }

  const courbe = (a: Point, b: Point) => {
    if (a.y === b.y) {
      const [g, dr] = a.x < b.x ? [a, b] : [b, a];
      return `M ${g.x + R} ${g.y} H ${dr.x - R}`;
    }
    const [hi, ba] = a.y < b.y ? [a, b] : [b, a];
    const m = (ba.y - hi.y) / 2;
    return `M ${hi.x} ${hi.y + SOUS_NOM} C ${hi.x} ${hi.y + SOUS_NOM + m}, ${ba.x} ${ba.y - R - m}, ${ba.x} ${ba.y - R - 3}`;
  };
  for (const a of disp.amities) traits.push({ d: courbe(centre(a.a), centre(a.b)), classe: 'trait ami' });
  // Moi dans la bulle (export d'un groupe) : pas de passage à tracer.
  if (bulle && !disp.places.some((pl) => pl.personne.id === moi && pl.bulle))
    traits.push({ d: lisse(versBulle(disp, centres, moi, { x: (bulle.g + bulle.dr) / 2, y: bulle.ha })), classe: 'trait ami' });
  return traits;
}

/** Largeur estimée d'un nom de famille (capitales espacées de 10,5 px), pour savoir ce qu'il recouvre. */
export const largeurEtiquette = (texte: string) => texte.length * 9.5 + 8;

/**
 * Ordonnée du haut du nom de famille d'une lignée. Une fratrie reliée par un trait commun (parents non renseignés) :
 * le nom se met au-dessus du trait, pas dessous, sauf s'il y recouvrirait le nom ou l'année de la ligne du dessus
 * et que, dessous, aucun trait vers un enfant ne le traverse.
 */
export function hautEtiquette(disp: Disposition, px: (p: Point) => Point, e: Disposition['etiquettes'][number]): number {
  const c = px(e);
  const dessous = c.y - R - 24;
  const demi = largeurEtiquette(e.texte) / 2;
  for (const br of e.fratrie ? disp.branches : []) {
    const bus = px({ x: 0, y: br.bus }).y;
    const xs = br.enfants.map((f) => px(f).x);
    if (bus >= dessous || bus < c.y - PAS_Y || !br.enfants.some((f) => px(f).y === c.y)) continue;
    if (c.x < Math.min(...xs) - 1 || c.x > Math.max(...xs) + 1) continue;
    const recouvre = disp.places.some((p) => {
      const q = px(p);
      return Math.abs(q.y - (c.y - PAS_Y)) < 1 && Math.abs(q.x - c.x) < demi + LARG / 2 && q.y + SOUS_NOM > bus - 24;
    });
    const traverse = xs.some((x) => Math.abs(x - c.x) < demi + 4);
    if (!recouvre || traverse) return bus - 24;
  }
  return dessous;
}

/** Anneau de Moi et des membres d'un groupe autour de l'avatar (arbre.css, `box-shadow`). */
const ANNEAU = 5;
/** Hauteur d'un nom de famille posé sur l'arbre, et d'un titre de groupe. */
export const HAUT_ETIQUETTE = 16;

type Etiquette = Disposition['etiquettes'][number];
/** Bord gauche d'un nom de famille de largeur `l` ancré en `x` : centré, ou finissant (`fin`) ou commençant (`debut`) au milieu d'un couple. */
const gauche = (e: Etiquette, x: number, l: number) => (e.ancre === 'fin' ? x - l : e.ancre === 'debut' ? x : x - l / 2);

/**
 * Lieu de chaque nom de famille : `x` est son point d'ancrage, `y` son haut. D'abord là où le met `hautEtiquette`.
 * Si un trait le traverse (le trait commun d'un sous-niveau passe tout près des enfants, sous le nom), il glisse de
 * côté (au plus 60 % de sa largeur), ou monte juste au-dessus d'un trait commun voisin : à la première place libre.
 */
export function lieuxEtiquettes(disp: Disposition, p: Positions, traits: Trait[]): Map<Etiquette, Point> {
  const segments = traits.flatMap((t) => {
    const m = /^M (\S+) (\S+) ([VH]) (\S+)$/.exec(t.d);
    return m ? [{ v: m[3] === 'V', a: +m[1], b: +m[2], c: +m[4] }] : [];
  });
  const cartes = [...p.centres.values()];
  const libre = (g: number, d: number, h: number) =>
    !segments.some((s) =>
      s.v
        ? s.a > g - 2 && s.a < d + 2 && Math.max(s.b, s.c) > h - 2 && Math.min(s.b, s.c) < h + HAUT_ETIQUETTE + 2
        : s.b > h - 2 && s.b < h + HAUT_ETIQUETTE + 2 && Math.max(s.a, s.c) > g && Math.min(s.a, s.c) < d,
    ) && !cartes.some((q) => q.x + LARG / 2 > g && q.x - LARG / 2 < d && q.y + SOUS_NOM > h && q.y - R < h + HAUT_ETIQUETTE);
  const lieux = new Map<Etiquette, Point>();
  for (const e of disp.etiquettes) {
    const c = p.px(e);
    const l = largeurEtiquette(e.texte);
    const g = gauche(e, c.x, l);
    const h0 = hautEtiquette(disp, p.px, e);
    const hauteurs = [
      h0,
      ...segments
        .filter((s) => !s.v && s.b < c.y - R && s.b > c.y - PAS_Y && Math.max(s.a, s.c) > g && Math.min(s.a, s.c) < g + l)
        .map((s) => s.b - 20)
        .sort((u, v) => v - u),
    ];
    const glissements = [g, ...segments.filter((s) => s.v && Math.abs(s.a - c.x) < l).flatMap((s) => [s.a + 5, s.a - l - 5])]
      .filter((x) => Math.abs(x - g) <= 0.6 * l)
      .sort((u, v) => Math.abs(u - g) - Math.abs(v - g));
    let lieu: Point = { x: c.x, y: h0 };
    for (const y of hauteurs) {
      const x = glissements.find((x) => libre(x, x + l, y));
      if (x !== undefined) {
        lieu = { x: c.x + x - g, y };
        break;
      }
    }
    lieux.set(e, lieu);
  }
  return lieux;
}

/** Boîte d'un nom de famille, à son lieu (`lieuxEtiquettes`) ou, sans lui, à la hauteur de `hautEtiquette`. */
export function boiteEtiquette(disp: Disposition, px: (p: Point) => Point, e: Etiquette, lieu?: Point): Boite {
  const l = largeurEtiquette(e.texte);
  const g = gauche(e, lieu?.x ?? px(e).x, l);
  const h = lieu?.y ?? hautEtiquette(disp, px, e);
  return { g, h, d: g + l, b: h + HAUT_ETIQUETTE };
}

/**
 * Dates d'union de l'arbre global, au palier voulu : seulement entre deux partenaires côte à côte sur la même
 * ligne, sans personne entre eux. Rien ne recouvre un trait (lignes, amitiés, bords des cadres), un avatar, un nom
 * de personne, un nom de famille ni un titre de groupe.
 */
export function mentionsArbre(
  disp: Disposition,
  p: Positions,
  traits: Trait[],
  cadres: Cadre[],
  unions: Union[],
  palier: Palier,
  moi: string,
  aujourdhui = new Date(),
): MentionUnion[] {
  // Moi et les membres d'un groupe ont un anneau autour de l'avatar (arbre.css) : 5 px de plus.
  const anneau = new Set([moi, ...disp.groupes.flatMap((g) => g.membres)]);
  const cercles = new Map([...p.centres].map(([id, c]) => [id, { x: c.x, y: c.y, r: anneau.has(id) ? R + ANNEAU : R }]));
  const lieux = lieuxEtiquettes(disp, p, traits);
  const obstacles: Obstacles = {
    cercles: [...cercles.values()],
    segments: [...traits.flatMap((t) => segmentsDe(t.d)), ...cadres.flatMap((c) => segmentsDe(`M ${c.x} ${c.y} H ${c.x + c.l} V ${c.y + c.ha} H ${c.x} Z`))],
    boites: [
      ...[...p.centres.values()].map((c) => ({ g: c.x - LARG / 2, h: c.y + R, d: c.x + LARG / 2, b: c.y + SOUS_NOM })),
      ...disp.etiquettes.map((e) => boiteEtiquette(disp, p.px, e, lieux.get(e))),
      ...cadres.map((c) => ({ g: c.x + 12, h: c.y + 8, d: c.x + c.l - 12, b: c.y + 8 + HAUT_ETIQUETTE })),
    ],
  };
  const couples = disp.couples.flatMap((c) => {
    const u = unionEntre(unions, c.a, c.b);
    const [g, d] = [cercles.get(c.a)!, cercles.get(c.b)!].sort((a, b) => a.x - b.x);
    return u && g.y === d.y && sansVoisinEntre(g, d, obstacles.cercles) ? [{ g, d, y: g.y, union: u, ex: c.separe }] : [];
  });
  return placerMentions(couples, palier, obstacles, aujourdhui);
}
