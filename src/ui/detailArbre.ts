// Niveau de détail de l'export PNG (Réglages › Partager, DECISIONS.md 03/11/2026) : dates en clair sous le nom,
// légende des traits et, au niveau Détaillé, notes des fiches, sous la personne ou en carte dans une marge.
// Sans DOM ni canvas : le texte est mesuré par `largeurTexte` (mentionsUnion.ts), estimé large ; arbreImage.ts ne
// fait que peindre ce qui est calculé ici. Unités : celles du dessin (pixels à l'échelle 1).

import type { Point } from '../modele/arbreGlobal';
import { annees } from '../modele/familleProche';
import { mentionNaissance, prenomOuNom } from '../modele/liste';
import { boiteLigne, dateEnClair, horsObstacles, largeurTexte, type Boite, type Obstacles, type Segment } from '../modele/mentionsUnion';
import { estDecede } from '../modele/modele';
import { estParentSansNom } from '../modele/parentSansNom';
import type { Personne } from '../modele/types';
import { LARG, PAS_Y, R, SOUS_NOM } from './geometrieArbre';

export type NiveauDetail = 'base' | 'detail';
export const NIVEAUX: [NiveauDetail, string][] = [
  ['base', 'Base : dates et unions'],
  ['detail', 'Détaillé : avec les notes'],
];

// --- Texte sous l'avatar ---

/** Nom : corps 13, 2 lignes au plus dans 104 px (lignesNom d'arbreImage.ts) ; interlignes du nom et de « née X ». */
const TAILLE_NOM = 13;
const LARG_NOM = 104;
const LIGNE_NOM = 16;
const LIGNE_NAISSANCE = 14;
/** Dates en clair : corps 10,5, dans la largeur d'une case pour ne pas toucher la voisine. */
export const TAILLE_DATE = 10.5;
/** Années seules (repli) : le corps d'avant le niveau de détail. */
export const TAILLE_ANNEES = 11;
export const LIGNE_DATE = 13;

/** Nombre de lignes du nom (1 ou 2), estimé large : jamais moins que ce que peint le canvas. */
export function lignesDuNom(texte: string): number {
  let lignes = 1;
  let courante = '';
  for (const mot of texte.split(/[\s-]+/).filter(Boolean)) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (courante && largeurTexte(essai, TAILLE_NOM) > LARG_NOM) {
      lignes++;
      courante = mot;
    } else courante = essai;
  }
  return Math.min(lignes, 2);
}

export interface Dates {
  lignes: string[];
  taille: number;
}

/**
 * Dates sous le nom, dans `place` pixels de haut : naissance puis « † décès » en clair, sinon avec le mois abrégé,
 * chaque ligne dans la largeur d'une case ; sinon les années seules (« 1938–2019 »), comme avant.
 */
export function datesSousNom(p: Pick<Personne, 'naissance' | 'deces' | 'decede'>, place: number): Dates {
  const an = annees(p as Personne);
  const repli: Dates = { lignes: an ? [an] : [], taille: TAILLE_ANNEES };
  // Rien de plus que l'année : les années seules suffisent.
  const plus = [p.naissance, p.deces].some((x) => x && dateEnClair(x) !== x.slice(0, 4));
  if (!plus) return repli;
  const max = Math.floor(place / LIGNE_DATE);
  for (const court of [false, true]) {
    const n = dateEnClair(p.naissance, court);
    const dc = dateEnClair(p.deces, court);
    const lignes = [n, dc ? `† ${dc}` : estDecede(p as Personne) ? '† ?' : ''].filter(Boolean);
    if (lignes.length <= max && lignes.every((l) => largeurTexte(l, TAILLE_DATE) <= LARG)) return { lignes, taille: TAILLE_DATE };
  }
  return repli;
}

export interface TexteNoeud {
  /** Prénom (ou nom) et nombre de lignes estimé. */
  nom: string;
  lignesNom: number;
  naissance?: string;
  dates: Dates;
  /** Bas du texte, sous le centre de l'avatar. */
  bas: number;
}

/** Ce qui s'écrit sous l'avatar : nom, « née X » (si `avecNaissance`), dates ; un parent « ? » n'a rien. */
export function texteNoeud(p: Personne, avecNaissance: boolean): TexteNoeud {
  if (estParentSansNom(p)) return { nom: '', lignesNom: 0, dates: { lignes: [], taille: TAILLE_ANNEES }, bas: R + 2 };
  const nom = prenomOuNom(p);
  const lignesNom = lignesDuNom(nom);
  const naissance = avecNaissance ? mentionNaissance(p) : undefined;
  const haut = R + 8 + lignesNom * LIGNE_NOM + 1 + (naissance ? LIGNE_NAISSANCE : 0);
  const dates = datesSousNom(p, SOUS_NOM - haut);
  return { nom, lignesNom, ...(naissance ? { naissance } : {}), dates, bas: haut + dates.lignes.length * LIGNE_DATE };
}

// --- Légende ---

export type Repere = 'marie' | 'libre' | 'ex' | 'adoption' | 'note';
export const LIBELLES_REPERES: Record<Repere, string> = { marie: 'mariés', libre: 'union libre', ex: 'séparés', adoption: 'adoption', note: 'note' };

/** Styles de trait présents dans le dessin, dans l'ordre de la légende ; « note » si des notes sont reliées. */
export function legende(traits: { classe: string }[], avecLiens: boolean): Repere[] {
  const a = (r: Repere, ok: (c: string[]) => boolean) => (traits.some((t) => ok(t.classe.split(' '))) ? [r] : []);
  return [
    ...a('marie', (c) => c.includes('couple') && !c.includes('libre') && !c.includes('ex')),
    ...a('libre', (c) => c.includes('couple') && c.includes('libre') && !c.includes('ex')),
    ...a('ex', (c) => c.includes('couple') && c.includes('ex')),
    ...a('adoption', (c) => c.includes('adoption')),
    ...(avecLiens ? ['note' as const] : []),
  ];
}

// --- Notes ---

export const TAILLE_NOTE = 10;
export const LIGNE_NOTE = 12.5;
/**
 * Note courte, écrite sous la personne : 2 lignes au plus. Entre le bas des noms et l'avatar suivant il reste ~46 px,
 * coupés par les traits vers les enfants : 2 lignes (25 px) y tiennent avec de l'air, pas 3.
 */
export const NOTE_LIGNES = 2;
/** Largeurs essayées : la case, puis la case et 20 px de chaque côté (≈ 36 caractères sur 2 lignes). */
export const NOTE_LARGEURS = [LARG, LARG + 40];
/** Carte en marge : largeur, marge intérieure, corps du titre. */
export const CARTE = 180;
export const PAD = 10;
export const TAILLE_TITRE = 10.5;
const TITRE = 14;
const ECART_CARTES = 10;
/** Couloirs verticaux des traits de liaison, entre l'arbre et les cartes : écart, et marge avant le premier. */
const COULOIR = 6;
const GOUTTIERE = 12;
/**
 * Hauteurs essayées pour le trait d'une personne qui n'est pas au bord, tous les 4 px : de sous les noms jusqu'au-dessus
 * de l'avatar du rang suivant. Les traits de parenté y sont coupés à angle droit, jamais longés.
 */
const PALIERS_LIEN = Array.from({ length: Math.floor((PAS_Y - R - 7 - SOUS_NOM - 2) / 4) + 1 }, (_, k) => SOUS_NOM + 2 + 4 * k);

/** Retour à la ligne dans `max` pixels ; un mot trop long est coupé ; les paragraphes (`\n`) sont gardés. */
export function couper(texte: string, max: number, taille: number): string[] {
  const lignes: string[] = [];
  for (const para of texte.split('\n')) {
    let courante = '';
    for (let mot of para.split(/\s+/).filter(Boolean)) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (largeurTexte(essai, taille) <= max) {
        courante = essai;
        continue;
      }
      if (courante) lignes.push(courante);
      while (largeurTexte(mot, taille) > max && mot.length > 1) {
        let n = mot.length - 1;
        while (n > 1 && largeurTexte(mot.slice(0, n), taille) > max) n--;
        lignes.push(mot.slice(0, n));
        mot = mot.slice(n);
      }
      courante = mot;
    }
    if (courante) lignes.push(courante);
  }
  return lignes;
}

export interface NoteAPlacer {
  id: string;
  /** Titre de la carte (prénom et nom). */
  titre: string;
  texte: string;
  /** Centre de l'avatar, rayon (anneau compris) et bas du texte sous l'avatar, en absolu. */
  x: number;
  y: number;
  r: number;
  bas: number;
}
/** Ligne écrite sous une personne : centrée sur `x`, `y` est la ligne de base. */
export interface LigneNote {
  texte: string;
  x: number;
  y: number;
}
export interface NoteSous {
  id: string;
  lignes: LigneNote[];
}
export interface CarteNote {
  id: string;
  cote: 'g' | 'd';
  /** Coin haut gauche, en coordonnées de l'arbre : une carte de gauche a un `x` négatif. */
  x: number;
  y: number;
  l: number;
  h: number;
  titre: string;
  lignes: string[];
  /** Trait de liaison, de la personne (point) à la carte. */
  lien: Point[];
}
export interface NotesPlacees {
  sous: NoteSous[];
  cartes: CarteNote[];
  /** Marges ajoutées à gauche et à droite de l'arbre, et hauteur du dessin, cartes comprises. */
  gauche: number;
  droite: number;
  hauteur: number;
}

/** Trajet candidat d'un trait de liaison, dans l'arbre : points depuis la personne, segments jusqu'au bord. */
interface Essai {
  cote: 'g' | 'd';
  points: Point[];
  segs: Segment[];
  obs: Obstacles;
}

const segment = (a: Point, b: Point): Segment => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
const fine = (s: Segment): Boite => ({ g: Math.min(s.x1, s.x2), h: Math.min(s.y1, s.y2), d: Math.max(s.x1, s.x2), b: Math.max(s.y1, s.y2) });

/** Deux segments droits parallèles qui se recouvrent à moins de 2 px : un trait de liaison s'y confondrait. */
function confondus(a: Segment, b: Segment): boolean {
  const h = (s: Segment) => s.y1 === s.y2;
  const v = (s: Segment) => s.x1 === s.x2;
  if (h(a) && h(b))
    return Math.abs(a.y1 - b.y1) < 2 && Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2)) < Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2));
  if (v(a) && v(b))
    return Math.abs(a.x1 - b.x1) < 2 && Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2)) < Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2));
  return false;
}

/** Un segment horizontal et un vertical qui se coupent hors de leurs bouts : deux traits de liaison qui se croisent. */
function croisent(a: Segment, b: Segment): boolean {
  const [h, v] = a.y1 === a.y2 ? [a, b] : [b, a];
  if (h.y1 !== h.y2 || v.x1 !== v.x2) return false;
  const dedans = (t: number, u: number, w: number) => t > Math.min(u, w) + 0.5 && t < Math.max(u, w) - 0.5;
  return dedans(v.x1, h.x1, h.x2) && dedans(h.y1, v.y1, v.y2);
}

/**
 * Place les notes : sous la personne si elle est courte (NOTE_LIGNES dans une des NOTE_LARGEURS) et que la place est
 * libre ; sinon en carte dans la marge du côté de la personne. Le trait de liaison part à l'horizontale de l'avatar si
 * rien n'est sur le chemin (personne au bord de sa ligne), sinon descend sous le texte et file sous les noms ; il peut
 * croiser un trait de parenté à angle droit, jamais le longer, ni passer sur un avatar, un nom ou une note. Les cartes
 * s'empilent dans l'ordre d'arrivée de leurs traits, et les couloirs sont choisis pour que les traits ne se croisent pas.
 * `obstacles` : ceux de l'arbre sans les boîtes des noms (obstaclesArbre), dates d'union comprises ; `noeuds` : centres.
 */
export function placerNotes(notes: NoteAPlacer[], noeuds: Point[], obstacles: Obstacles, largeur: number, hauteur: number): NotesPlacees {
  const noms = (sauf: NoteAPlacer) =>
    noeuds.filter((c) => c.x !== sauf.x || c.y !== sauf.y).map((c) => ({ g: c.x - LARG / 2, h: c.y + R, d: c.x + LARG / 2, b: c.y + SOUS_NOM }));
  const boites: Boite[] = [];
  const sous: NoteSous[] = [];
  const reste: NoteAPlacer[] = [];
  const triees = [...notes].filter((n) => n.texte.trim()).sort((a, b) => a.y - b.y || a.x - b.x);

  // 1. Notes courtes sous la personne.
  for (const n of triees) {
    const obs: Obstacles = { ...obstacles, boites: [...obstacles.boites, ...noms(n), ...boites] };
    let posee: LigneNote[] | undefined;
    for (const l of NOTE_LARGEURS) {
      const lignes = couper(n.texte.trim(), l, TAILLE_NOTE);
      if (lignes.length > NOTE_LIGNES) continue;
      const y0 = n.bas + 2 + 0.78 * TAILLE_NOTE;
      const essai = lignes.map((texte, k) => ({ texte, x: n.x, y: y0 + k * LIGNE_NOTE }));
      const bs = essai.map((e) => boiteLigne({ ...e, taille: TAILLE_NOTE }));
      if (bs.every((b) => b.g >= 0 && b.d <= largeur && b.b <= hauteur && horsObstacles(b, obs))) {
        posee = essai;
        boites.push(...bs);
        break;
      }
    }
    if (posee) sous.push({ id: n.id, lignes: posee });
    else reste.push(n);
  }

  // 2. Trajets des traits de liaison dans l'arbre, jusqu'au bord du côté choisi. Ligne par ligne, la personne la plus
  // près du bord d'abord : elle prend le palier le plus haut, et les traits suivants passent sous le sien sans le couper.
  // Côté bouché (ligne chargée de traits) : la marge d'en face ; partout bouché : le trajet qui gêne le moins.
  const liens: Segment[] = [];
  const auBord = (n: NoteAPlacer, cote: 'g' | 'd') => (cote === 'g' ? n.x : largeur - n.x);
  const prefere = (n: NoteAPlacer): 'g' | 'd' => (n.x < largeur / 2 ? 'g' : 'd');
  const trajets = [...reste]
    .sort((a, b) => a.y - b.y || auBord(a, prefere(a)) - auBord(b, prefere(b)))
    .map((n) => {
      const autres: Obstacles = { ...obstacles, boites: [...obstacles.boites, ...noms(n), ...boites] };
      // Croiser un trait à angle droit est permis sous les noms : seuls avatars, boîtes et traits parallèles comptent.
      const sansTraits: Obstacles = { ...autres, segments: [] };
      const fautes = (segs: Segment[], obs: Obstacles) =>
        segs.filter(
          (s) => !horsObstacles(fine(s), obs) || liens.some((t) => confondus(s, t) || croisent(s, t)) || obstacles.segments.some((t) => confondus(s, t)),
        ).length;
      const cotes: ('g' | 'd')[] = prefere(n) === 'g' ? ['g', 'd'] : ['d', 'g'];
      // Essais dans l'ordre de préférence : droit depuis l'avatar, puis descente sous le texte et palier ; la descente se
      // décale de côté si un trait vers les enfants part déjà de l'avatar.
      function* essais(): Generator<Essai> {
        for (const cote of cotes) {
          const bord = cote === 'g' ? 0 : largeur;
          const sens = cote === 'g' ? -1 : 1;
          const depart = { x: n.x + sens * (n.r + 4), y: n.y };
          yield { cote, points: [depart], segs: [segment(depart, { x: bord, y: n.y })], obs: autres };
          for (const dx of [0, 10 * sens, -10 * sens])
            for (const dy of PALIERS_LIEN) {
              const points = [
                { x: n.x + dx, y: n.bas + 2 },
                { x: n.x + dx, y: n.y + dy },
              ];
              yield { cote, points, segs: [segment(points[0], points[1]), segment(points[1], { x: bord, y: points[1].y })], obs: sansTraits };
            }
        }
      }
      let choisi: (Essai & { cout: number }) | undefined;
      for (const e of essais()) {
        const cout = fautes(e.segs, e.obs);
        if (!choisi || cout < choisi.cout) choisi = { ...e, cout };
        if (cout === 0) break;
      }
      if (!choisi) throw new Error('Aucun trajet');
      liens.push(...choisi.segs);
      return { n, cote: choisi.cote, points: choisi.points, arrivee: choisi.points[choisi.points.length - 1].y };
    });

  // 3. Cartes empilées par côté, dans l'ordre d'arrivée ; couloir de plus en plus près de l'arbre tant qu'un trait
  // précédent descend encore vers sa carte (aucun croisement entre traits de liaison).
  const cartes: CarteNote[] = [];
  const marges = { g: 0, d: 0 };
  let bas = hauteur;
  for (const cote of ['g', 'd'] as const) {
    let fin = -Infinity;
    const ouverts: { jusqua: number; rang: number }[] = [];
    const empilees = trajets
      .filter((t) => t.cote === cote)
      .sort((a, b) => a.arrivee - b.arrivee || auBord(a.n, cote) - auBord(b.n, cote))
      .map((t) => {
        const lignes = couper(t.n.texte.trim(), CARTE - 2 * PAD, TAILLE_NOTE);
        const titres = couper(t.n.titre, CARTE - 2 * PAD, TAILLE_TITRE);
        const titre = titres.length > 1 ? `${titres[0]}…` : (titres[0] ?? '');
        const h = PAD + TITRE + lignes.length * LIGNE_DATE + PAD;
        const y = Math.max(t.arrivee - 15, fin + ECART_CARTES, 8);
        fin = y + h;
        bas = Math.max(bas, fin + 20);
        const yc = y + 15;
        const encore = ouverts.filter((o) => o.jusqua > t.arrivee);
        const rang = encore.length ? Math.max(...encore.map((o) => o.rang)) + 1 : 0;
        if (yc > t.arrivee) ouverts.push({ jusqua: yc, rang });
        return { t, lignes, titre, h, y, yc, rang };
      });
    if (!empilees.length) continue;
    // Autant de couloirs que de traits qui descendent ensemble ; rang 0 : le couloir le plus près des cartes.
    const couloirs = Math.max(...empilees.map((e) => e.rang)) + 1;
    const avant = GOUTTIERE + couloirs * COULOIR + 12;
    marges[cote] = avant + CARTE + 16;
    for (const { t, lignes, titre, h, y, yc, rang } of empilees) {
      const ecart = GOUTTIERE + (couloirs - 1 - rang) * COULOIR;
      const couloir = cote === 'g' ? -ecart : largeur + ecart;
      const x = cote === 'g' ? -(avant + CARTE) : largeur + avant;
      const entree = cote === 'g' ? x + CARTE : x;
      const lien = [...t.points, { x: couloir, y: t.arrivee }, { x: couloir, y: yc }, { x: entree, y: yc }];
      cartes.push({ id: t.n.id, cote, x, y, l: CARTE, h, titre, lignes, lien });
    }
  }
  return { sous, cartes, gauche: marges.g, droite: marges.d, hauteur: bas };
}
