// Date et lieu d'une union écrits au-dessus de son trait, entre les deux avatars (variante C, DECISIONS.md 30/10/2026).
// Sans DOM, commun à la fiche, à l'arbre global et au PNG : quoi écrire selon le palier (`textesUnion`) et où
// (`placerMentions`). Une mention ne passe jamais sur un trait, un avatar, une étiquette ni une autre mention :
// elle se raccourcit, puis disparaît. Unités : celles du dessin (pixels à l'échelle 1).

import { MOTIF_DATE, MOTIF_SANS_ANNEE } from './dates';
import { sontFiances } from './deductions';
import { bas, type DispositionFoyer } from './familleProche';
import { MOIS, MOIS_COURTS } from './liste';
import type { Union } from './types';

/** Année seule (fiche, PNG, arbre de près) ; date en clair et lieu (arbre tout près). */
export type Palier = 'annee' | 'detail';
/** Corps du texte selon le palier, en unités du dessin. */
export const TAILLE_MENTION: Record<Palier, number> = { annee: 9.5, detail: 6 };
/** Sécurité sur la largeur estimée du texte (`chasse`) : mieux vaut une date de moins qu'une date sur un trait. */
const MARGE_CHASSE = 1.1;
/** Garde autour des avatars, des traits et des boîtes. */
const GARDE_CERCLE = 2;
const GARDE_TRAIT = 1.5;
const GARDE_BOITE = 1;
/** Un lieu tronqué garde au moins ces caractères avant « … ». */
const LIEU_MIN = 3;

export interface Cercle {
  x: number;
  y: number;
  r: number;
}
/** Rectangle : gauche, haut, droite, bas. */
export interface Boite {
  g: number;
  h: number;
  d: number;
  b: number;
}
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Obstacles {
  cercles: Cercle[];
  segments: Segment[];
  boites: Boite[];
}

/** Ligne candidate ; un lieu peut se tronquer. */
export interface LigneTexte {
  texte: string;
  tronquable?: boolean;
}
/** Ligne placée : `y` est la ligne de base, le texte est centré sur `x`. */
export interface LigneMention {
  texte: string;
  x: number;
  y: number;
  taille: number;
}
export interface MentionUnion {
  lignes: LigneMention[];
  ex: boolean;
}

/** Couple dessiné côte à côte : ses deux avatars (gauche, droite), l'ordonnée de son trait et son union. */
export interface CoupleTrace {
  g: Cercle;
  d: Cercle;
  y: number;
  union: Pick<Union, 'date' | 'lieu' | 'statut'>;
  ex: boolean;
}

const jour = (j: number) => (j === 1 ? '1er' : String(j));

/** « 14 juin 1990 », « juin 1990 », « 1990 », « 14 juin » (sans année) ; `court` : « 14 sept. 1990 ». */
export function dateEnClair(date: string | undefined, court = false): string {
  const mois = court ? MOIS_COURTS : MOIS;
  const sa = date?.match(MOTIF_SANS_ANNEE);
  if (sa) return mois[Number(sa[1]) - 1] ? `${jour(Number(sa[2]))} ${mois[Number(sa[1]) - 1]}` : '';
  const m = date?.match(MOTIF_DATE);
  if (!m) return '';
  if (m[2] === undefined) return m[1];
  const nom = mois[Number(m[2]) - 1];
  if (!nom) return '';
  return m[3] === undefined ? `${nom} ${m[1]}` : `${jour(Number(m[3]))} ${nom} ${m[1]}`;
}

/**
 * Textes possibles, du plus complet au plus court, chacun de haut en bas. Fiancés (mariage à venir) : rien.
 * Palier « annee » : l'année seule, rien sans année. Palier « detail » : la date en clair au-dessus du lieu.
 */
export function textesUnion(u: Pick<Union, 'date' | 'lieu' | 'statut'>, palier: Palier, aujourdhui = new Date()): LigneTexte[][] {
  if (sontFiances(u as Union, aujourdhui)) return [];
  const annee = u.date?.match(MOTIF_DATE)?.[1];
  if (palier === 'annee') return annee ? [[{ texte: annee }]] : [];
  const longue = dateEnClair(u.date);
  const courte = dateEnClair(u.date, true);
  const lieu = u.lieu?.trim();
  const l = lieu ? [{ texte: lieu, tronquable: true }] : [];
  const candidats: LigneTexte[][] = [];
  for (const date of [longue, courte]) if (date) candidats.push([{ texte: date }, ...l]);
  if (!longue && lieu) candidats.push(l);
  for (const date of [longue, courte]) if (date && lieu) candidats.push([{ texte: date }]);
  if (annee) candidats.push([{ texte: annee }]);
  // Sans doublon (date courte égale à la longue, année seule déjà proposée).
  const vus = new Set<string>();
  return candidats.filter((c) => {
    const cle = c.map((x) => x.texte).join('\n');
    return !vus.has(cle) && !!vus.add(cle);
  });
}

// --- Géométrie ---

/** Segments d'un chemin SVG en coordonnées absolues (M, L, H, V, C, Q, Z) ; les courbes sont échantillonnées. */
export function segmentsDe(d: string): Segment[] {
  const jetons = d.match(/[MLHVCQZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const segments: Segment[] = [];
  let i = 0;
  let x = 0;
  let y = 0;
  let x0 = 0;
  let y0 = 0;
  let cmd = '';
  const n = () => Number(jetons[i++]);
  const vers = (nx: number, ny: number) => {
    segments.push({ x1: x, y1: y, x2: nx, y2: ny });
    [x, y] = [nx, ny];
  };
  const courbe = (pt: (t: number) => [number, number]) => {
    for (let k = 1; k <= 16; k++) vers(...pt(k / 16));
  };
  while (i < jetons.length) {
    if (/[a-z]/i.test(jetons[i])) cmd = jetons[i++].toUpperCase();
    if (cmd === 'M') {
      [x, y] = [n(), n()];
      [x0, y0] = [x, y];
      cmd = 'L';
    } else if (cmd === 'L') vers(n(), n());
    else if (cmd === 'H') vers(n(), y);
    else if (cmd === 'V') vers(x, n());
    else if (cmd === 'C') {
      const [ax, ay, bx, by, cx, cy, sx, sy] = [n(), n(), n(), n(), n(), n(), x, y];
      courbe((t) => {
        const u = 1 - t;
        return [u ** 3 * sx + 3 * u * u * t * ax + 3 * u * t * t * bx + t ** 3 * cx, u ** 3 * sy + 3 * u * u * t * ay + 3 * u * t * t * by + t ** 3 * cy];
      });
    } else if (cmd === 'Q') {
      const [ax, ay, cx, cy, sx, sy] = [n(), n(), n(), n(), x, y];
      courbe((t) => {
        const u = 1 - t;
        return [u * u * sx + 2 * u * t * ax + t * t * cx, u * u * sy + 2 * u * t * ay + t * t * cy];
      });
    } else if (cmd === 'Z') vers(x0, y0);
    else i++;
  }
  return segments;
}

const elargir = (b: Boite, m: number): Boite => ({ g: b.g - m, h: b.h - m, d: b.d + m, b: b.b + m });

/** Le segment traverse ou touche la boîte (découpage de Liang-Barsky). */
export function coupe(s: Segment, b: Boite): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  for (const [p, q] of [
    [-dx, s.x1 - b.g],
    [dx, b.d - s.x1],
    [-dy, s.y1 - b.h],
    [dy, b.b - s.y1],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

const touche = (c: Cercle, b: Boite) => {
  const dx = c.x - Math.max(b.g, Math.min(c.x, b.d));
  const dy = c.y - Math.max(b.h, Math.min(c.y, b.b));
  return dx * dx + dy * dy < (c.r + GARDE_CERCLE) ** 2;
};
const recouvre = (a: Boite, b: Boite) => a.g < b.d && b.g < a.d && a.h < b.b && b.h < a.b;

/** Chasse d'un caractère, en part du corps (Figtree et police système, demi-gras), estimée large. */
function chasse(c: string): number {
  if (/[ .,:;'’!|iljI]/.test(c)) return 0.3;
  if (/[-()tfr]/.test(c)) return 0.38;
  if (/[mwMW…]/.test(c)) return 0.9;
  if (/[A-ZÀ-Ý]/.test(c)) return 0.72;
  return 0.58;
}

export const largeurTexte = (texte: string, taille: number) => [...texte].reduce((s, c) => s + chasse(c), 0) * MARGE_CHASSE * taille;

/** Boîte d'une ligne de texte centrée sur `x`, de ligne de base `y`. */
export const boiteLigne = (l: LigneMention): Boite => {
  const demi = largeurTexte(l.texte, l.taille) / 2;
  return { g: l.x - demi, h: l.y - 0.78 * l.taille, d: l.x + demi, b: l.y + 0.22 * l.taille };
};

function libre(b: Boite, c: CoupleTrace, obs: Obstacles): boolean {
  if (b.g < c.g.x || b.d > c.d.x) return false;
  if (obs.cercles.some((x) => touche(x, b))) return false;
  const t = elargir(b, GARDE_TRAIT);
  if (obs.segments.some((s) => coupe(s, t))) return false;
  const e = elargir(b, GARDE_BOITE);
  return !obs.boites.some((x) => recouvre(x, e));
}

/** Les lignes du candidat, posées au-dessus du trait (la dernière au plus près) et montées de `leve` lignes. */
function poser(c: CoupleTrace, candidat: LigneTexte[], taille: number, leve: number, obs: Obstacles): LigneMention[] | undefined {
  const x = (c.g.x + c.g.r + c.d.x - c.d.r) / 2;
  const base = c.y - (3 + 0.3 * taille) - leve * 1.25 * taille;
  const lignes: LigneMention[] = [];
  for (const [k, l] of candidat.entries()) {
    const y = base - (candidat.length - 1 - k) * 1.25 * taille;
    let texte = l.texte;
    while (!libre(boiteLigne({ texte, x, y, taille }), c, obs)) {
      const garde = texte.replace(/…$/, '').length - 1;
      if (!l.tronquable || garde < LIEU_MIN) return undefined;
      texte = `${l.texte.slice(0, garde).trimEnd()}…`;
    }
    lignes.push({ texte, x, y, taille });
  }
  return lignes;
}

/**
 * Place une mention par couple, dans l'ordre : le premier candidat qui tient au ras du trait, sinon une ligne
 * plus haut (texte d'une ligne seulement). Chaque mention posée devient un obstacle pour les suivantes.
 */
export function placerMentions(couples: CoupleTrace[], palier: Palier, obstacles: Obstacles, aujourdhui = new Date()): MentionUnion[] {
  const taille = TAILLE_MENTION[palier];
  const obs: Obstacles = { ...obstacles, boites: [...obstacles.boites] };
  const mentions: MentionUnion[] = [];
  for (const c of couples) {
    if (c.d.x <= c.g.x) continue;
    let lignes: LigneMention[] | undefined;
    for (const candidat of textesUnion(c.union, palier, aujourdhui)) {
      for (const leve of candidat.length === 1 ? [0, 1] : [0]) {
        lignes = poser(c, candidat, taille, leve, obs);
        if (lignes) break;
      }
      if (lignes) break;
    }
    if (!lignes) continue;
    obs.boites.push(...lignes.map(boiteLigne));
    mentions.push({ lignes, ex: c.ex });
  }
  return mentions;
}

// --- Rendus ---

/** L'union enregistrée entre deux personnes, dans un sens ou dans l'autre. */
export const unionEntre = (unions: Union[], a: string, b: string) =>
  unions.find((u) => (u.personneA === a && u.personneB === b) || (u.personneA === b && u.personneB === a));

/** Aucun autre avatar sur la même ligne entre les deux : sinon le trait passe derrière lui (chaîne d'ex). */
export const sansVoisinEntre = (g: Cercle, d: Cercle, cercles: Cercle[]) => !cercles.some((c) => c !== g && c !== d && c.y === g.y && c.x > g.x && c.x < d.x);

/** « Famille proche » de la fiche : l'année seule, sur les traits droits entre deux avatars. */
export function mentionsFoyer(dis: DispositionFoyer, unions: Union[], aujourdhui = new Date()): MentionUnion[] {
  const cercles = new Map(dis.noeuds.map((n) => [n.id, { x: n.x, y: n.y, r: n.rayon }]));
  const obstacles: Obstacles = {
    cercles: [...cercles.values()],
    segments: dis.traits.flatMap((t) => segmentsDe(t.d)),
    // Le nom et les années sous chaque avatar.
    boites: dis.noeuds.map((n) => ({ g: n.x - n.largeur / 2, h: n.y + n.rayon, d: n.x + n.largeur / 2, b: n.y + bas(n) })),
  };
  const couples = dis.unions.flatMap(({ g, d }): CoupleTrace[] => {
    const u = unionEntre(unions, g, d);
    const [cg, cd] = [cercles.get(g)!, cercles.get(d)!];
    return u && sansVoisinEntre(cg, cd, obstacles.cercles) ? [{ g: cg, d: cd, y: cg.y, union: u, ex: u.statut !== 'actuelle' }] : [];
  });
  return placerMentions(couples, 'annee', obstacles, aujourdhui);
}
