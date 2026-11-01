// Recherche des générations souples (variante V1b, voir souple.ts) : on compte les croisements et les ambiguïtés du
// dessin en pixels, puis on décale, fratrie par fratrie, ce qui fait baisser un coût. Portage fidèle de la maquette
// (mockups/generations-souples/js/souple.js) : mêmes définitions, même ordre de parcours, donc mêmes décalages.

import type { Branche, PlaceArbre } from './arbreGlobal';
import { LARG, PAS_X, PAS_Y, R, SOUS_NOM } from './geometrie';
import { deformer, MAX, niveaux, preparer, type Decalages, type Structure } from './souple';
import type { Donnees } from './types';
import type { Disposition } from './arbreGlobal';

const AMBIGUITES = ['sousCarte', 'chevauchements', 'faussesFratries', 'recouvrements', 'contacts'] as const;
const COUT = { interdit: 10000, croisement: 100, sousCarte: 100, chevauchement: 200, fausseFratrie: 60, coupleCoupe: 20, sousNiveau: 15 };
/** Poids d'un sous-niveau de décalage selon la proximité avec Moi : famille proche, oncles et cousins, le reste. */
const POIDS: Record<number, number> = { 1: 4, 2: 2, 3: 1 };
/** Nombre maximal de tours de la recherche. */
const TOURS = 80;
/** Marge du dessin, comme à l'écran (l'origine des pixels n'est pas neutre pour les arrondis). */
const MARGE = 70;

/**
 * Proximité avec Moi : 1 = parents, frères et sœurs, conjoints, enfants, grands-parents ; 2 = oncles, tantes, cousins
 * et leurs conjoints. Les autres (absents de la table) comptent pour 3. Plus on est proche, plus un décalage coûte.
 */
export function proximites(d: Donnees, moi: string): Map<string, number> {
  const inconnu = new Set(d.personnes.filter((p) => p.inconnu).map((p) => p.id));
  const vrai = (ids: string[]) => ids.filter((id) => !inconnu.has(id));
  const parentsDe = (x: string) => d.filiations.filter((f) => f.enfant === x).map((f) => f.parent);
  const enfantsDe = (x: string) => d.filiations.filter((f) => f.parent === x).map((f) => f.enfant);
  const conjointsDe = (x: string) =>
    d.unions
      .filter((u) => u.personneA === x || u.personneB === x)
      .sort((u, v) => Number(u.statut === 'actuelle') - Number(v.statut === 'actuelle'))
      .map((u) => (u.personneA === x ? u.personneB : u.personneA));
  const c = new Map<string, number>();
  const mettre = (ids: string[], k: number) => ids.forEach((id) => !c.has(id) && id !== moi && c.set(id, k));
  const parents = vrai(parentsDe(moi));
  const gp = vrai(parents.flatMap(parentsDe));
  mettre(parents, 1);
  mettre(vrai(parentsDe(moi).flatMap(enfantsDe)), 1);
  mettre(vrai(conjointsDe(moi)), 1);
  mettre(vrai(enfantsDe(moi)), 1);
  mettre(gp, 1);
  const oncles = vrai(gp.flatMap(enfantsDe)).filter((o) => !c.has(o) || !parents.includes(o));
  const cousins = vrai(oncles.flatMap(enfantsDe));
  const deux = [...oncles, ...cousins].filter((id) => !parents.includes(id) && !c.has(id));
  mettre(deux, 2);
  mettre(vrai(deux.flatMap(conjointsDe)), 2);
  return c;
}

type Pt = [number, number];
interface Lien {
  groupe: string;
  type: 'couple' | 'fratrie';
  branche?: number;
  membres: Set<string>;
  chemins: Pt[][];
}
interface Carte {
  id: string;
  g: number;
  d: number;
  h: number;
  b: number;
}
interface Scene {
  cartes: Carte[];
  liens: Lien[];
}

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const u = 1 - t;
    pts.push([0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]) as Pt);
  }
  return pts;
}

/** Le dessin de la famille en pixels, avec la géométrie des traits de l'écran (traitsArbre), amis exclus. */
function scene(places: PlaceArbre[], couples: Disposition['couples'], branches: Branche[], parentsDe: string[][]): Scene {
  const ox = MARGE + LARG / 2 - Math.min(...places.map((p) => p.x)) * PAS_X;
  const oy = MARGE + R - Math.min(...places.map((p) => p.y)) * PAS_Y;
  const px = (p: { x: number; y: number }) => ({ x: ox + p.x * PAS_X, y: oy + p.y * PAS_Y });
  const centres = new Map(places.map((pl) => [pl.personne.id, px(pl)]));
  const cle = (c: { x: number; y: number }) => c.x.toFixed(2) + ',' + c.y.toFixed(2);
  const ici = new Map(places.map((pl) => [cle(px(pl)), pl.personne.id]));
  const cartes = places.map((pl): Carte => {
    const { x, y } = px(pl);
    const id = pl.personne.id;
    return pl.personne.inconnu
      ? { id, g: x - R + 3, d: x + R - 3, h: y - R + 3, b: y + R - 3 }
      : { id, g: x - LARG / 2, d: x + LARG / 2, h: y - R, b: y + R + 40 };
  });
  const groupe = (ids: string[]) => 'g:' + ids.slice().sort().join('+');
  const liens: Lien[] = [];
  for (const c of couples) {
    const [a, b] = [centres.get(c.a)!, centres.get(c.b)!].sort((u, v) => u.x - v.x);
    const chemin: Pt[] =
      a.y === b.y
        ? [
            [a.x + R, a.y],
            [b.x - R, b.y],
          ]
        : bezier([a.x, a.y - R], [a.x, a.y - R - 46], [b.x, b.y - R - 46], [b.x, b.y - R]);
    liens.push({ groupe: groupe([c.a, c.b]), type: 'couple', membres: new Set([c.a, c.b]), chemins: [chemin] });
  }
  branches.forEach((br, i) => {
    const bus = px({ x: 0, y: br.bus }).y;
    const origines = br.origines.filter((o) => !o.inconnu).map((o) => ({ ...px(o), seul: o.parent !== undefined }));
    const parents = origines.map((o) => ici.get(cle(o))).filter((id): id is string => id !== undefined);
    const enfants = br.enfants.map((e) => ({ ...px(e), id: e.id }));
    const ps = parentsDe[i];
    const chemins: Pt[][] = [];
    for (const o of origines)
      for (const e of enfants) {
        const y0 = o.seul ? o.y + SOUS_NOM : o.y;
        chemins.push(
          Math.abs(o.x - e.x) < 0.5
            ? [
                [o.x, y0],
                [e.x, e.y - R - 3],
              ]
            : [
                [o.x, y0],
                [o.x, bus],
                [e.x, bus],
                [e.x, e.y - R - 3],
              ],
        );
      }
    liens.push({ groupe: groupe(ps), type: 'fratrie', branche: i, membres: new Set([...parents, ...ps, ...enfants.map((e) => e.id)]), chemins });
  });
  return { cartes, liens };
}

/** Une faute et ce qui la cause : deux liens (ou un seul), et des personnes en cause ou le point du croisement. */
type Paire = [Lien | null, Lien | null, ...(string | number)[]];
interface Fautes {
  croisements: number;
  sousCarte: number;
  chevauchements: number;
  faussesFratries: number;
  recouvrements: number;
  contacts: number;
  paires: Paire[];
}
interface Segment {
  l: Lien;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  a: Pt;
  b: Pt;
}

/** Croisements, traits sous une carte, cartes qui se recouvrent et autres ambiguïtés d'une scène (définitions des mesures de la maquette). */
function fautes(sc: Scene): Fautes {
  const E = 0.5;
  const hs: Segment[] = [];
  const vs: Segment[] = [];
  const autres: Segment[] = [];
  for (const l of sc.liens) {
    const vus = new Set<string>();
    for (const c of l.chemins)
      for (let i = 0; i + 1 < c.length; i++) {
        const [a, b] = [c[i], c[i + 1]];
        const k = [a, b]
          .map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1))
          .sort()
          .join(';');
        if (vus.has(k)) continue;
        vus.add(k);
        const s = { l, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]), a, b };
        if (s.y1 - s.y0 < E) hs.push(s);
        else if (s.x1 - s.x0 < E) vs.push(s);
        else autres.push(s);
      }
  }
  const res: Fautes = { croisements: 0, sousCarte: 0, chevauchements: 0, faussesFratries: 0, recouvrements: 0, contacts: 0, paires: [] };
  // Tri par hauteur : chaque trait ne regarde que les traits horizontaux et les cartes de sa tranche.
  hs.sort((a, b) => a.y0 - b.y0);
  const premier = <T>(tab: T[], cle: (t: T) => number, y: number) => {
    let [lo, hi] = [0, tab.length];
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (cle(tab[m]) < y) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  // Vertical × horizontal : croisement franc, ou contact en T (un bout posé sur l'autre trait).
  for (const v of vs)
    for (let j = premier(hs, (h) => h.y0, v.y0 - E); j < hs.length && hs[j].y0 < v.y1 + E; j++) {
      const h = hs[j];
      if (v.l.groupe === h.l.groupe || v.x0 < h.x0 - E || v.x0 > h.x1 + E) continue;
      const dedansV = h.y0 > v.y0 + E && h.y0 < v.y1 - E;
      const dedansH = v.x0 > h.x0 + E && v.x0 < h.x1 - E;
      if (dedansV && dedansH) {
        res.croisements++;
        res.paires.push([v.l, h.l, v.x0, h.y0]);
      } else if (dedansV || dedansH) res.contacts++;
    }
  const coupe = (s: Segment, t: Segment) => {
    const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const [d1, d2, d3, d4] = [o(t.a, t.b, s.a), o(t.a, t.b, s.b), o(s.a, s.b, t.a), o(s.a, s.b, t.b)];
    return d1 * d2 < -1e-6 && d3 * d4 < -1e-6;
  };
  for (let i = 0; i < autres.length; i++)
    for (const t of [...hs, ...vs, ...autres.slice(i + 1)]) {
      const s = autres[i];
      if (s.l.groupe !== t.l.groupe && s.x0 <= t.x1 && t.x0 <= s.x1 && s.y0 <= t.y1 && t.y0 <= s.y1 && coupe(s, t)) {
        res.croisements++;
        res.paires.push([s.l, t.l]);
      }
    }
  // Bout d'une courbe de couple (conjoints sur deux hauteurs) contre le bout d'une verticale d'un autre groupe :
  // le trait des parents semble se prolonger vers le conjoint.
  const bouts = autres.flatMap((s) => [s.a, s.b].map((p) => ({ p, l: s.l })));
  for (const v of vs)
    for (const { p, l } of bouts)
      if (l.groupe !== v.l.groupe && Math.abs(p[0] - v.x0) < 4 && (Math.abs(p[1] - v.y0) < 4 || Math.abs(p[1] - v.y1) < 4)) res.contacts++;
  // Traits superposés : deux traits de groupes différents sur la même droite, qui se recouvrent.
  const superposes = (tab: Segment[], pos: (s: Segment) => number, de: (s: Segment) => number, a: (s: Segment) => number) => {
    const t = [...tab].sort((u, v) => pos(u) - pos(v));
    for (let i = 0; i < t.length; i++)
      for (let j = i + 1; j < t.length && pos(t[j]) - pos(t[i]) < E; j++)
        if (t[i].l.groupe !== t[j].l.groupe && de(t[i]) < a(t[j]) - E && de(t[j]) < a(t[i]) - E) res.recouvrements++;
  };
  superposes(
    hs,
    (s) => s.y0,
    (s) => s.x0,
    (s) => s.x1,
  );
  superposes(
    vs,
    (s) => s.x0,
    (s) => s.y0,
    (s) => s.y1,
  );
  // Traits communs de fratries différentes à la même hauteur qui se recouvrent : ils se confondraient.
  const bus = hs.filter((h) => h.l.type === 'fratrie' && h.x1 - h.x0 > 1);
  for (let i = 0; i < bus.length; i++)
    for (let j = i + 1; j < bus.length; j++) {
      const [u, v] = [bus[i], bus[j]];
      if (u.l.groupe !== v.l.groupe && Math.abs(u.y0 - v.y0) <= 3 && u.x0 < v.x1 + 8 && v.x0 < u.x1 + 8) {
        res.faussesFratries++;
        res.paires.push([u.l, v.l]);
      }
    }
  const tri = [...sc.cartes].sort((a, b) => a.h - b.h);
  const hautMax = Math.max(0, ...tri.map((k) => k.b - k.h));
  for (const s of [...hs, ...vs, ...autres])
    for (let j = premier(tri, (k) => k.h, s.y0 - hautMax); j < tri.length && tri[j].h < s.y1 - 2; j++) {
      const k = tri[j];
      if (!s.l.membres.has(k.id) && s.x0 < k.d - 2 && s.x1 > k.g + 2 && s.y0 < k.b - 2 && s.y1 > k.h + 2) {
        res.sousCarte++;
        res.paires.push([s.l, null, k.id]);
      }
    }
  for (let i = 0; i < tri.length; i++)
    for (let j = i + 1; j < tri.length && tri[j].h < tri[i].b - 1; j++) {
      const [a, b] = [tri[i], tri[j]];
      if (a.g < b.d - 1 && b.g < a.d - 1) {
        res.chevauchements++;
        res.paires.push([null, null, a.id, b.id]);
      }
    }
  return res;
}

/** Résultat d'une évaluation : coût, et de quoi le comprendre. */
interface Evaluation {
  c: number;
  niv: Map<string, number>;
  f: Fautes;
}

/** Fautes d'une famille déformée selon `d` et `h` (pour les tests et les mesures). */
export function fautesDe(S: Structure, d: number[], h: boolean[]): Omit<Fautes, 'paires'> & { sousNiveaux: number } {
  const f = deformer(S, niveaux(S, d), h);
  const { paires: _, ...res } = fautes(
    scene(
      f.places,
      S.couples,
      f.branches,
      S.brs.map((b) => b.parents),
    ),
  );
  return { ...res, sousNiveaux: f.sousNiveaux };
}

/**
 * Décalages qui font baisser le coût : 100 par croisement, 15 par sous-niveau ajouté, 4, 2 ou 1 par personne décalée
 * selon sa proximité avec Moi ; une nouvelle ambiguïté (trait sous une carte, fausse fratrie…) est interdite.
 * Gloutonne : à chaque tour, le coup qui fait le plus baisser le coût, puis on retire les décalages devenus inutiles.
 */
export function chercher(S: Structure, classe: Map<string, number>): Decalages {
  const n = S.brs.length;
  const parentsDe = S.brs.map((b) => b.parents);
  let f0: Fautes | null = null;
  const evaluer = (d: number[], h: boolean[]): Evaluation => {
    const niv = niveaux(S, d);
    const def = deformer(S, niv, h);
    const f = fautes(scene(def.places, S.couples, def.branches, parentsDe));
    let c = COUT.croisement * f.croisements + COUT.sousCarte * f.sousCarte + COUT.chevauchement * f.chevauchements + COUT.fausseFratrie * f.faussesFratries;
    // Aucune nouvelle ambiguïté : un coup qui en ajoute une par rapport à l'arbre actuel est refusé.
    if (f0) for (const k of AMBIGUITES) c += COUT.interdit * Math.max(0, f[k] - f0[k]);
    for (const cp of S.couples) if ((niv.get(cp.a) ?? 0) !== (niv.get(cp.b) ?? 0) && S.pos.get(cp.a)!.y === S.pos.get(cp.b)!.y) c += COUT.coupleCoupe;
    for (const [id, v] of niv) c += Math.abs(v) * (POIDS[classe.get(id) || (id === S.moi ? 1 : 3)] || 1);
    c += COUT.sousNiveau * def.sousNiveaux;
    return { c, niv, f };
  };
  // Fratries à essayer de bouger pour une faute : celles des deux liens, et celles de leurs membres.
  const candidats = (f: Fautes) => {
    const res = new Set<number>();
    const ajouter = (id: string | number) => {
      if (typeof id === 'string') for (const i of S.commeEnfant.get(id) ?? []) res.add(i);
    };
    for (const [a, b, ...ids] of f.paires) {
      for (const l of [a, b])
        if (l) {
          if (l.branche !== undefined) res.add(l.branche);
          for (const id of l.membres) ajouter(id);
        }
      ids.forEach(ajouter);
    }
    return [...res];
  };
  let d = new Array<number>(n).fill(0);
  let h = new Array<boolean>(n).fill(false);
  let cour = evaluer(d, h);
  f0 = cour.f;
  const NIVEAUX: number[] = [];
  for (let v = -MAX; v <= MAX; v++) NIVEAUX.push(v);
  for (let tours = 0; tours < TOURS; tours++) {
    let meilleur: { d: number[]; h: boolean[]; r: Evaluation } | null = null;
    const essayer = (e: number[], f: boolean[]) => {
      const r = evaluer(e, f);
      if (r.c < cour.c - 1e-9 && (!meilleur || r.c < meilleur.r.c)) meilleur = { d: e, h: f, r };
    };
    // 1. Une fratrie à n'importe quel niveau, ou son trait commun en haut / en bas.
    for (const i of candidats(cour.f)) {
      for (const v of NIVEAUX)
        if (v !== d[i]) {
          const e = d.slice();
          e[i] = v;
          essayer(e, h);
        }
      const f = h.slice();
      f[i] = !f[i];
      essayer(d, f);
    }
    // 2. Sinon, les deux fratries d'un même croisement ensemble (un ordre vertical à trouver à deux).
    if (!meilleur) {
      const vues = new Set<string>();
      for (const [a, b] of cour.f.paires) {
        if (!a || !b || a.branche === undefined || b.branche === undefined) continue;
        const [i, j] = [a.branche, b.branche];
        const k = Math.min(i, j) + ':' + Math.max(i, j);
        if (vues.has(k)) continue;
        vues.add(k);
        const autour = (v: number) => [v - 1, v, v + 1].filter((x) => Math.abs(x) <= MAX);
        for (const vi of autour(d[i]))
          for (const vj of autour(d[j]))
            for (const hi of [false, true])
              for (const hj of [false, true]) {
                if (vi === d[i] && vj === d[j] && hi === h[i] && hj === h[j]) continue;
                const e = d.slice();
                const f = h.slice();
                [e[i], e[j], f[i], f[j]] = [vi, vj, hi, hj];
                essayer(e, f);
              }
      }
    }
    if (!meilleur) break;
    const m: { d: number[]; h: boolean[]; r: Evaluation } = meilleur;
    d = m.d;
    h = m.h;
    cour = m.r;
  }
  // Nettoyage : un décalage ou un trait haut devenu inutile revient à la normale.
  for (let i = 0; i < n; i++) {
    if (d[i]) {
      const e = d.slice();
      e[i] = 0;
      const r = evaluer(e, h);
      if (r.c <= cour.c) {
        d = e;
        cour = r;
      }
    }
    if (h[i]) {
      const f = h.slice();
      f[i] = false;
      const r = evaluer(d, f);
      if (r.c <= cour.c) {
        h = f;
        cour = r;
      }
    }
  }
  return { d: d.flatMap((v, i): [number, number][] => (v ? [[i, v]] : [])), h: h.flatMap((v, i) => (v ? [i] : [])) };
}

/** Décalages d'une disposition : la recherche complète (quelques secondes sur un grand arbre). */
export function chercherDecalages(d: Donnees, disp: Disposition, moi: string): Decalages {
  const S = preparer(disp, moi);
  return S ? chercher(S, proximites(d, moi)) : { d: [], h: [] };
}
