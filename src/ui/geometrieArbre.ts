// Géométrie de l'arbre global en pixels (à l'échelle 1), partagée par l'écran (arbreGlobal.ts) et l'export PNG
// (arbreImage.ts) : positions, cadres des groupes, zone de la bulle, passage vers la bulle et tracés des traits.

import type { Disposition, GroupeDessine, Point } from '../modele/arbreGlobal';
import { LIGNE_EN_PLUS } from './arbre';

/** Pixels entre deux places voisines, et entre deux générations (à l'échelle 1). */
export const PAS_X = 80;
export const PAS_Y = 140;
/** Rayon de l'avatar, largeur d'un nœud. */
export const R = 19;
export const LARG = 76;
/** Sous l'avatar, le nom (sur 2 lignes si besoin) et l'année : un trait qui part d'un parent seul commence en dessous. */
export const SOUS_NOM = R + 40 + LIGNE_EN_PLUS;
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
  d: string;
  classe: string;
  lignee?: number;
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
  const oy = MARGE + R - Math.min(...ys) * PAS_Y;
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
    // Marié(e) : trait plein ; en couple : pointillé court ; séparé(e) : gris.
    traits.push({ d, classe: `trait couple${c.marie ? '' : ' libre'}${c.separe ? ' ex' : ''}`, lignee: c.separe ? undefined : c.lignee });
  }

  for (const br of disp.branches) {
    const bus = px({ x: 0, y: br.bus }).y;
    // Un parent inconnu n'a ni nom ni trait : seul le trait commun relie les frères et sœurs.
    const origines = br.origines.filter((o) => !o.inconnu).map((o) => ({ ...px(o), seul: o.parent !== undefined }));
    const enfants = br.enfants.map((e) => ({ ...px(e), adoptif: e.adoptif }));
    const classe = enfants.every((e) => e.adoptif) ? 'trait pointille' : 'trait';
    for (const o of origines) traits.push({ d: `M ${o.x} ${o.seul ? o.y + SOUS_NOM : o.y} V ${bus}`, classe, lignee: br.lignee });
    const xs = [...origines, ...enfants].map((q) => q.x);
    if (Math.max(...xs) - Math.min(...xs) > 0.5) traits.push({ d: `M ${Math.min(...xs)} ${bus} H ${Math.max(...xs)}`, classe, lignee: br.lignee });
    for (const e of enfants) traits.push({ d: `M ${e.x} ${bus} V ${e.y - R - 3}`, classe: e.adoptif ? 'trait pointille' : 'trait', lignee: br.lignee });
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
  if (bulle) traits.push({ d: lisse(versBulle(disp, centres, moi, { x: (bulle.g + bulle.dr) / 2, y: bulle.ha })), classe: 'trait ami' });
  return traits;
}

/**
 * Ordonnée du haut du nom de famille d'une lignée. Une fratrie reliée par un trait commun (parents non renseignés) :
 * le nom se met au-dessus du trait, pas dessous.
 */
export function hautEtiquette(disp: Disposition, px: (p: Point) => Point, e: Disposition['etiquettes'][number]): number {
  const c = px(e);
  let haut = c.y - R - 24;
  for (const br of e.fratrie ? disp.branches : []) {
    const bus = px({ x: 0, y: br.bus }).y;
    const xs = br.enfants.map((f) => px(f).x);
    if (bus >= c.y - R - 24 || bus < c.y - PAS_Y || !br.enfants.some((f) => px(f).y === c.y)) continue;
    if (c.x >= Math.min(...xs) - 1 && c.x <= Math.max(...xs) + 1) haut = Math.min(haut, bus - 24);
  }
  return haut;
}
