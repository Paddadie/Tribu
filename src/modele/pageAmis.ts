// Export PNG d'un groupe d'amis (Réglages → Partager, « Un groupe d'amis ») mis en page pour une feuille A4 / A3
// paysage : Moi entre dans le cadre du groupe, en tête de la première ligne ; la bande des familles est coupée en
// lignes entre deux familles (jamais au milieu d'une), et l'image reçoit des marges jusqu'au format de la feuille
// (`format`, appliqué par arbreImage.ts). Passe après `disposerArbre` et les générations souples : l'arbre à l'écran
// et les autres exports n'en passent pas par là.

import type { Disposition, Point } from './arbreGlobal';
import { ECART_FAMILLES } from './partie';

/** Format d'une feuille A4 ou A3 paysage : largeur / hauteur. */
export const FORMAT_FEUILLE = Math.SQRT2;
/** Écart vertical entre la dernière génération d'une ligne et la première de la suivante. */
export const ECART_LIGNES = 1.3;
const EPS = 1e-6;

/** Personne la plus proche d'un point (départ d'une branche au milieu d'un couple, nom de famille). */
const plusProche = (disp: Disposition, o: Point) =>
  disp.places.reduce((a, b) => (Math.hypot(b.x - o.x, b.y - o.y) < Math.hypot(a.x - o.x, a.y - o.y) ? b : a)).personne.id;

/** Familles à garder d'un seul tenant : ids des places, bornes en x et en y. */
interface Bloc {
  ids: string[];
  min: number;
  max: number;
}

/**
 * Blocs dans l'ordre de la bande : d'abord tout ce qui n'est pas dans la bulle (Moi et ceux de sa famille qui sont
 * du groupe), puis les familles de la bulle (couples et branches), de gauche à droite. Deux familles qui se mêlent
 * (moins d'une place entre elles) restent ensemble.
 */
function blocs(disp: Disposition): Bloc[] {
  const parent = new Map(disp.places.map((p) => [p.personne.id, p.personne.id]));
  const racine = (id: string): string => (parent.get(id) === id ? id : racine(parent.get(id)!));
  const unir = (a: string, b: string) => parent.has(a) && parent.has(b) && parent.set(racine(a), racine(b));
  const principal = disp.places.filter((p) => !p.bulle).map((p) => p.personne.id);
  principal.slice(1).forEach((id) => unir(id, principal[0]));
  for (const c of disp.couples) unir(c.a, c.b);
  for (const br of disp.branches) {
    const ids = [...br.enfants.map((e) => e.id), ...br.origines.filter((o) => !o.inconnu).map((o) => o.parent ?? plusProche(disp, o))];
    ids.slice(1).forEach((id) => unir(id, ids[0]));
  }

  const parRacine = new Map<string, Bloc>();
  for (const p of disp.places) {
    const r = racine(p.personne.id);
    const b = parRacine.get(r) ?? { ids: [], min: Infinity, max: -Infinity };
    b.ids.push(p.personne.id);
    b.min = Math.min(b.min, p.x);
    b.max = Math.max(b.max, p.x);
    parRacine.set(r, b);
  }
  const tete = principal.length > 0 ? parRacine.get(racine(principal[0])) : undefined;
  const ensembles: Bloc[] = [];
  for (const b of [...parRacine.values()].filter((b) => b !== tete).sort((u, v) => u.min - v.min)) {
    const dernier = ensembles[ensembles.length - 1];
    if (dernier && b.min - dernier.max < 1 - EPS) {
      dernier.ids.push(...b.ids);
      dernier.max = Math.max(dernier.max, b.max);
    } else ensembles.push({ ...b, ids: [...b.ids] });
  }
  return tete ? [tete, ...ensembles] : ensembles;
}

/** Coupe les blocs en `k` lignes au plus, la plus large aussi étroite que possible ; les blocs gardent leur ordre. */
function couper(liste: Bloc[], k: number): Bloc[][] {
  const n = liste.length;
  const largeur = (i: number, j: number) => liste.slice(i, j).reduce((s, b) => s + b.max - b.min, 0) + ECART_FAMILLES * (j - i - 1);
  // meilleur[m][j] : plus petite largeur maximale pour les j premiers blocs en m lignes ; coupe[m][j] : début de la dernière.
  const meilleur = [[0, ...Array<number>(n).fill(Infinity)]];
  const coupe: number[][] = [[]];
  for (let m = 1; m <= k; m++) {
    meilleur.push([0]);
    coupe.push([0]);
    for (let j = 1; j <= n; j++) {
      let [val, ou] = [Infinity, 0];
      for (let i = m - 1; i < j; i++) {
        const v = Math.max(meilleur[m - 1][i], largeur(i, j));
        if (v < val - EPS) [val, ou] = [v, i];
      }
      meilleur[m].push(val);
      coupe[m].push(ou);
    }
  }
  const lignes: Bloc[][] = [];
  for (let m = Math.min(k, n), j = n; m > 0; m--) {
    const i = coupe[m][j];
    lignes.unshift(liste.slice(i, j));
    j = i;
  }
  return lignes.filter((l) => l.length > 0);
}

/**
 * La disposition en `k` lignes au plus, Moi dans la bulle et dans le cadre du groupe. Chaque ligne est centrée ; dans
 * une ligne, les familles gardent leur dessin et leurs générations alignées. Moi est à la hauteur des amis de sa ligne.
 */
export function enLignes(disp: Disposition, moi: string, k: number): Disposition {
  const liste = blocs(disp);
  const avecTete = disp.places.some((p) => !p.bulle);
  const place = new Map(disp.places.map((p) => [p.personne.id, p]));
  const membres = new Set(disp.groupes.flatMap((g) => g.membres));
  const decalage = new Map<string, Point>();
  let haut = 0;
  for (const [n, ligne] of couper(liste, k).entries()) {
    const ys = (b: Bloc) => b.ids.map((id) => place.get(id)!.y);
    // Le bloc de Moi rejoint la génération des amis (à défaut, le haut) des autres blocs de la première ligne.
    const [tete, autres] = n === 0 && avecTete && ligne.length > 1 ? [ligne[0], ligne.slice(1)] : [undefined, ligne];
    const ysAmis = autres.flatMap((b) => b.ids.filter((id) => membres.has(id)).map((id) => place.get(id)!.y));
    const ref = ysAmis.length > 0 ? Math.min(...ysAmis) : Math.min(...autres.flatMap(ys));
    const dyTete = tete ? ref - place.get(moi)!.y : 0;
    const yDe = (b: Bloc) => ys(b).map((y) => y + (b === tete ? dyTete : 0));
    const [hautLigne, basLigne] = [Math.min(...ligne.flatMap(yDe)), Math.max(...ligne.flatMap(yDe))];
    const largeur = ligne.reduce((s, b) => s + b.max - b.min, 0) + ECART_FAMILLES * (ligne.length - 1);
    let x = -largeur / 2;
    for (const b of ligne) {
      const d = { x: x - b.min, y: haut - hautLigne + (b === tete ? dyTete : 0) };
      for (const id of b.ids) decalage.set(id, d);
      x += b.max - b.min + ECART_FAMILLES;
    }
    haut += basLigne - hautLigne + ECART_LIGNES;
  }

  const bouger = <T extends Point>(p: T, id: string): T => {
    const d = decalage.get(id) ?? { x: 0, y: 0 };
    return { ...p, x: p.x + d.x, y: p.y + d.y };
  };
  const principal = disp.places.filter((p) => !p.bulle).map((p) => p.personne.id);
  const groupes = disp.groupes.map((g, i) => (i === 0 ? { ...g, ids: [...new Set([...principal, ...g.ids])] } : g));
  const memeCadre = (a: string, b: string) => groupes.some((g) => g.ids.includes(a) && g.ids.includes(b));
  return {
    ...disp,
    places: disp.places.map((p) => ({ ...bouger(p, p.personne.id), bulle: true })),
    branches: disp.branches.map((br) => {
      const d = decalage.get(br.enfants[0].id) ?? { x: 0, y: 0 };
      return {
        ...br,
        bus: br.bus + d.y,
        origines: br.origines.map((o) => ({ ...o, x: o.x + d.x, y: o.y + d.y })),
        enfants: br.enfants.map((e) => bouger(e, e.id)),
      };
    }),
    etiquettes: disp.etiquettes.map((e) => bouger(e, plusProche(disp, e))),
    amities: disp.amities.filter((a) => !memeCadre(a.a, a.b)),
    groupes,
  };
}

/** Part de la feuille couverte par une image de ce rapport largeur / hauteur, posée à la plus grande taille. */
export const remplissage = (rapport: number) => Math.min(rapport, FORMAT_FEUILLE) / Math.max(rapport, FORMAT_FEUILLE);

/**
 * Mise en page de l'export d'un groupe : le nombre de lignes qui remplit le mieux la feuille selon `rapport` (largeur
 * / hauteur de l'image finale, titre compris : voir arbreImage.ts), puis `format` pour les marges. Sans bulle, seul
 * le format change.
 */
export function mettreEnPage(disp: Disposition, moi: string, rapport: (d: Disposition) => number): Disposition {
  if (!disp.places.some((p) => p.bulle) || !disp.places.some((p) => p.personne.id === moi)) return { ...disp, format: FORMAT_FEUILLE };
  const n = blocs(disp).length;
  let choix: { d: Disposition; f: number } | undefined;
  for (let k = 1; k <= n; k++) {
    const d = enLignes(disp, moi, k);
    const f = remplissage(rapport(d));
    if (!choix || f > choix.f + EPS) choix = { d, f };
  }
  return { ...choix!.d, format: FORMAT_FEUILLE };
}
