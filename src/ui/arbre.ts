// Dessins de la fiche (FEAT-09) : « Famille proche » (parents, fratrie, conjoint, enfants) et « Lien avec toi »
// (chemin depuis « Moi », l'ancêtre commun en haut). Positions calculées en pixels d'après la largeur réelle :
// le dessin se fait une fois l'écran inséré dans la page, puis à chaque changement de largeur.

import type { Etape, Foyer } from '../modele/deductions';
import { anneeDe, estDecede } from '../modele/modele';
import { motsChemin } from '../modele/parente';
import { estParentSansNom } from '../modele/parentSansNom';
import type { Donnees, Personne } from '../modele/types';
import { h } from './dom';
import { avatarPersonne } from './lignePersonne';
import { faireApparaitre } from './surbrillance';

const SVG = 'http://www.w3.org/2000/svg';

interface Trait {
  d: string;
  pointille?: boolean;
}

/** Hauteur d'une 2e ligne de nom (prénom composé) : réservée sous chaque nom, pour que ni trait ni rang suivant ne la touche. */
export const LIGNE_EN_PLUS = 16;

interface OptionsNoeud {
  /** Personne de la fiche : pas de lien, nœud plus grand. */
  ici?: boolean;
  larg?: number;
  annee?: boolean;
  /** Case « + Parent » : lien vers l'ajout d'un parent à cette personne. */
  manque?: string;
}

/** « 1990 », « 1938–2019 », « ?–2019 », « 1938–? » (décès sans année) ; vide sans année connue. */
function annees(p: Personne): string {
  const n = anneeDe(p.naissance);
  const d = anneeDe(p.deces) ?? (estDecede(p) && n ? '?' : undefined);
  return d ? `${n ?? '?'}–${d}` : (n ?? '');
}

/** Naissance comparable ; sans date ou sans année : en dernier. */
const datee = (p: Personne) => (anneeDe(p.naissance) && p.naissance) || '9999';
const parNaissance = (a: Personne, b: Personne) => datee(a).localeCompare(datee(b));

export function noeud(p: Personne | undefined, moi: string | undefined, x: number, y: number, r: number, o: OptionsNoeud = {}): HTMLElement {
  const larg = o.larg ?? 64;
  const style = `left: ${x - larg / 2}px; top: ${y - r}px; width: ${larg}px`;
  if (!p) {
    return h(
      'a',
      { class: 'noeud manque', href: `#/parent/${o.manque}`, style, 'aria-label': 'Ajouter un parent' },
      h('span', { class: 'avatar' }, '+'),
      h('span', { class: 'nom' }, 'Parent'),
    );
  }
  const sansNom = estParentSansNom(p);
  const avatar = sansNom ? h('span', { class: 'avatar sans-nom' }, '?') : avatarPersonne(p);
  if (estDecede(p)) avatar.classList.add('decede');
  const an = o.annee && annees(p);
  const contenu = [
    avatar,
    sansNom ? undefined : p.id === moi ? h('span', { class: 'nom toi' }, 'Toi') : h('span', { class: 'nom' }, p.prenom || p.nom),
    an && h('span', { class: 'an' }, an),
  ];
  return o.ici
    ? h('span', { class: 'noeud ici', style, 'aria-current': 'page' }, ...contenu)
    : h('a', { class: 'noeud', href: `#/personne/${p.id}`, style }, ...contenu);
}

function svg(l: number, haut: number, traits: Trait[]): SVGSVGElement {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('width', String(l));
  s.setAttribute('height', String(haut));
  s.setAttribute('viewBox', `0 0 ${l} ${haut}`);
  s.setAttribute('aria-hidden', 'true');
  for (const t of traits) {
    const chemin = document.createElementNS(SVG, 'path');
    chemin.setAttribute('class', t.pointille ? 'trait pointille' : 'trait');
    chemin.setAttribute('d', t.d);
    s.append(chemin);
  }
  return s;
}

/**
 * Bloc de dessin : `dessiner(arbre, largeur)` est appelé dès que la largeur est connue (élément dans la page),
 * puis à chaque changement de largeur. Une sonde de hauteur nulle est observée, et non l'arbre lui-même.
 * La hauteur, qui ne dépend pas de la largeur, est fixée d'emblée : la page garde sa longueur avant le dessin
 * (sinon un écran redessiné en bas de fiche remonterait).
 */
function bloc(classe: string, hauteur: number, dessiner: (arbre: HTMLElement, largeur: number) => void, ...apres: HTMLElement[]): HTMLElement {
  const sonde = h('div', { class: 'sonde' });
  const arbre = h('div', { class: `arbre ${classe}`, style: `height: ${hauteur}px` });
  let largeur = 0;
  if (typeof ResizeObserver === 'function') {
    const observateur = new ResizeObserver(() => {
      if (!sonde.isConnected) return observateur.disconnect();
      const l = sonde.clientWidth;
      if (l === 0 || l === largeur) return;
      largeur = l;
      dessiner(arbre, l);
    });
    observateur.observe(sonde);
  }
  return h('div', { class: 'carte dessin' }, sonde, arbre, ...apres);
}

/** Largeur d'une place de frère ou sœur sur la rangée de la personne. */
const SL = 64;
/** Place d'un frère ou d'une sœur quand les demis ne tiennent pas à 64. */
const SL_SERRE = 52;
/** Place d'un demi dans le dessin en familles (le dessin entier est ensuite réduit à l'écran). */
const SL_DEMIS = 60;

interface FamilleDemis {
  /** L'autre parent des demis, s'il est connu : dessiné sur la rangée des parents, à côté du parent commun. */
  autre?: Personne;
  /** Union terminée avec le parent commun : trait pointillé entre eux. */
  separe?: boolean;
  enfants: Personne[];
  /** Abscisse de l'autre parent, relative au centre de la personne. */
  xAutre?: number;
  /** Où le groupe se rattache au trait des parents (milieu du trait vers l'autre parent). */
  h: number;
  xs: number[];
  gauche: boolean;
}

/** Écart entre le parent commun et l'autre parent des demis, sur la rangée des parents. */
const ECART_AUTRE = 80;

/**
 * Place les demis en familles de chaque côté de la rangée de la personne (abscisses relatives au centre de la personne).
 * L'autre parent se tient tout près du parent commun ; le groupe pend au milieu de ce trait, puis s'étale sur son rang.
 * Retourne aussi l'étendue de chaque côté.
 */
function planDemis(
  f: Foyer,
  nB: number,
  bw: number,
  decal: number,
  sl: number,
  gap: number,
  deuxHauts: boolean,
): { familles: FamilleDemis[]; gauche: number; droite: number } {
  const dernier = nB > 0 ? -decal + bw + (nB - 0.5) * sl : 0;
  const cible = nB > 0 ? dernier / 2 : 0;
  const xParents = deuxHauts ? [cible - 42, cible + 42] : [cible];
  const brutes: { parent: string; autre?: Personne; separe?: boolean; enfants: Personne[] }[] = [];
  for (const x of f.demis) {
    let fam = brutes.find((b) => b.parent === x.parent && b.autre?.id === x.autre?.id);
    if (!fam) brutes.push((fam = { parent: x.parent, autre: x.autre, separe: x.autreSepare, enfants: [] }));
    fam.enfants.push(x.personne);
  }
  for (const b of brutes) b.enfants.sort(parNaissance);
  const familles: FamilleDemis[] = [];
  let gauche = Math.max(decal, 34 - xParents[0]);
  let droite = Math.max(-decal + bw + nB * sl, xParents[xParents.length - 1] + 34);
  for (const versGauche of [true, false]) {
    const dir = versGauche ? -1 : 1;
    const xPar = versGauche ? xParents[0] : xParents[xParents.length - 1];
    let curseur = (versGauche ? -decal : -decal + bw + nB * sl) + dir * gap;
    let k = 0;
    for (const b of brutes.filter((x) => (f.parents[1]?.personne.id !== x.parent) === versGauche)) {
      const m = b.enfants.length;
      const c = curseur + (dir * m * sl) / 2;
      const bord = c + (dir * m * sl) / 2;
      let xAutre: number | undefined;
      let h = c;
      if (b.autre) {
        k++;
        xAutre = xPar + dir * ECART_AUTRE * k;
        h = xPar + dir * (ECART_AUTRE * (k - 1) + ECART_AUTRE / 2);
      }
      const dehors = dir * Math.max(dir * bord, xAutre === undefined ? 0 : dir * xAutre + 34);
      if (versGauche) gauche = Math.max(gauche, -dehors);
      else droite = Math.max(droite, dehors);
      curseur = bord + dir * gap;
      familles.push({
        autre: b.autre,
        separe: b.separe,
        enfants: b.enfants,
        xAutre,
        h,
        xs: b.enfants.map((_, i) => c + (i - (m - 1) / 2) * sl),
        gauche: versGauche,
      });
    }
  }
  return { familles, gauche, droite };
}

/** « Famille proche » : parents (ou « + Parent »), la rangée de la fratrie par âge avec la personne et son conjoint, enfants rangés par union. */
export function dessinFoyer(p: Personne, f: Foyer, moi: string | undefined): HTMLElement {
  const cles = h('div', { class: 'cles', hidden: true });
  const R = 19,
    RG = 26,
    LBL = 14,
    RANG = 92 + LBL + LIGNE_EN_PLUS;
  const nbHaut = f.parents.length + f.manque;
  const n = f.enfants.length;
  const yP = R + 2;
  // Fratrie sans parent dessiné : la place du trait de fratrie, au-dessus de la rangée.
  const yM = nbHaut > 0 ? yP + RANG : f.fratrie.length > 0 ? RG + 22 : RG + 2;
  const yE = yM + RANG + 14;
  const H = (n > 0 ? yE + R : yM + RG) + 26 + LBL + LIGNE_EN_PLUS;
  return bloc(
    'foyer',
    H,
    (el, largeurReelle) => {
      let W = largeurReelle;
      const cj = f.conjoint?.personne;
      const fr = f.fratrie;
      const traits: Trait[] = [];
      const noeuds: HTMLElement[] = [];
      let deces = estDecede(p);
      let adoption = false;
      const bandes: HTMLElement[] = [];

      // Rangée de la personne : le conjoint à sa gauche, toute la fratrie à sa droite (du plus âgé au plus jeune), sans trait croisé.
      const nB = fr.length;
      const cadets = [...fr].sort(parNaissance);
      // Largeur de la personne avec son conjoint à gauche et, le cas échéant, son ex (enfants en commun) à droite.
      const bw = (cj ? 166 : 84) + (f.ex ? 92 : 0);
      /** Distance du bord gauche de la rangée au centre de la personne. */
      const decal = cj ? 124 : 42;
      // Demi-frères et sœurs aux bouts de la rangée, du côté de leur parent commun.
      const GAP = 16;
      const deDroite = (x: { parent: string }) => f.parents[1]?.personne.id === x.parent;
      const demisG = f.demis
        .filter((x) => !deDroite(x))
        .map((x) => x.personne)
        .sort(parNaissance);
      const demisD = f.demis
        .filter(deDroite)
        .map((x) => x.personne)
        .sort(parNaissance);
      // Demis en familles (avec l'autre parent) : tout le dessin est réduit s'il ne tient pas ; trop large même réduit : retour à la rangée simple.
      const plan = f.demis.length > 0 ? planDemis(f, nB, bw, decal, SL_DEMIS, GAP, f.parents.length + f.manque === 2) : undefined;
      const besoin = plan ? plan.gauche + plan.droite + 16 : 0;
      const etendu = !!plan && besoin * 0.5 <= largeurReelle;
      el.style.zoom = etendu && besoin > largeurReelle ? String(largeurReelle / besoin) : '';
      if (etendu) W = Math.max(besoin, largeurReelle);
      // Sur grand écran, le foyer garde ses proportions de téléphone, centré ; seuls les enfants s'étalent.
      const o = (W - Math.min(W, 400)) / 2;
      const largeurRang = (s: number) => nB * s + bw + (demisG.length ? demisG.length * s + GAP : 0) + (demisD.length ? demisD.length * s + GAP : 0);
      // Trop large avec des demis : les places rétrécissent ; encore trop large : la rangée défile.
      const sl = etendu ? SL_DEMIS : f.demis.length > 0 && largeurRang(SL) > W - 8 ? SL_SERRE : SL;
      const totalFr = nB * sl + bw;
      const extraG = demisG.length ? demisG.length * sl + GAP : 0;
      const extraD = demisD.length ? demisD.length * sl + GAP : 0;
      // Trop large : la personne reste au centre, ses aînés, ses cadets et ses demis défilent de chaque côté.
      const defilant = !etendu && (fr.length > 0 || f.demis.length > 0) && largeurRang(sl) > W - 8;
      const avecDemis = !etendu && f.demis.length > 0 && !defilant;
      let xM: number;
      let xC: number;
      if (etendu && plan) {
        xM = (W - plan.gauche - plan.droite) / 2 + plan.gauche;
        xC = xM - 92;
      } else if (avecDemis) {
        xM = (W - totalFr - extraG - extraD) / 2 + extraG + decal;
        xC = xM - 92;
      } else if (fr.length === 0) {
        xM = W / 2 + (cj && !f.ex ? 50 : 0);
        xC = xM - 100;
      } else if (defilant) {
        xM = W / 2 + (cj ? 46 : 0);
        xC = xM - 92;
      } else {
        xM = (W - totalFr) / 2 + decal;
        xC = xM - 92;
      }

      noeuds.push(noeud(p, moi, xM, yM, RG, { ici: true, larg: 84, annee: true }));
      const xX = xM + (xM - xC);
      if (f.ex) {
        noeuds.push(noeud(f.ex.personne, moi, xX, yM, R, { annee: true }));
        deces ||= estDecede(f.ex.personne);
        traits.push({ d: `M${xM + RG + 5} ${yM}H${xX - R - 5}`, pointille: true });
      }
      if (cj) {
        noeuds.push(noeud(cj, moi, xC, yM, R, { annee: true }));
        deces ||= estDecede(cj);
        traits.push({ d: `M${xC + R + 5} ${yM}H${xM - RG - 5}`, pointille: f.conjoint?.separe });
      }

      // Trait de fratrie (au-dessus de la rangée) : du premier au dernier frère ou sœur, en passant par la personne.
      const yJ = yM - RG - 18;
      let busG = xM;
      let busD = xM;
      for (const s of fr) deces ||= estDecede(s);
      if (fr.length > 0 && !defilant) {
        const x0 = xM - decal;
        const place = (s: Personne, x: number) => {
          traits.push({ d: `M${x} ${yJ}V${yM - R - 5}` });
          noeuds.push(noeud(s, moi, x, yM, R, { annee: true, larg: sl - 4 }));
          busG = Math.min(busG, x);
          busD = Math.max(busD, x);
        };
        cadets.forEach((s, i) => place(s, x0 + bw + (i + 0.5) * sl));
      } else if (defilant) {
        busG = xM;
        busD = nB > 0 ? W - 4 : xM;
        const demisBande = [...demisG, ...demisD];
        for (const s of demisBande) deces ||= estDecede(s);
        const haut0 = yJ - 2;
        const hB = yM + R + 30 + LBL + LIGNE_EN_PLUS - haut0;
        const bande = (liste: Personne[]) => {
          if (liste.length === 0) return;
          const g = xM + (f.ex ? 136 : 44);
          const lb = W - g;
          const cw = Math.max(lb, liste.length * sl + 8);
          const tB: Trait[] = [];
          const nB2: HTMLElement[] = liste.map((s, i) => {
            const x = (i + 0.5) * sl;
            // Les demis sont reliés en pointillé ; sans fratrie, aucun trait ne les rattache à la rangée.
            if (nB > 0) tB.push({ d: `M${x} 2V${yM - R - 5 - haut0}`, pointille: i >= nB });
            return noeud(s, moi, x, yM - haut0, R, { annee: true, larg: sl - 4 });
          });
          const defile = h(
            'div',
            {
              class: 'defile',
              style: `left: ${g}px; top: ${haut0}px; width: ${lb}px; height: ${hB}px`,
              role: 'group',
              'aria-label': `${liste.length} frères, sœurs et demis, faire défiler`,
            },
            h('div', { style: `width: ${cw}px` }, svg(cw, hB, tB), ...nB2),
          );
          const fondus = () => {
            const max = defile.scrollWidth - defile.clientWidth;
            defile.classList.toggle('fondu-g', defile.scrollLeft > 2);
            defile.classList.toggle('fondu-d', defile.scrollLeft < max - 2);
          };
          defile.addEventListener('scroll', fondus, { passive: true });
          requestAnimationFrame(fondus);
          bandes.push(defile);
        };
        bande([...cadets, ...demisBande]);
      }

      // Parents (et case « + Parent »), puis la fratrie sous les mêmes parents.
      let milieu: number | undefined;
      let xParents: number[] = [];
      if (nbHaut > 0) {
        const hauts: (Personne | undefined)[] = [...f.parents.map((x) => x.personne), ...Array<undefined>(f.manque).fill(undefined)];
        const cible = fr.length === 0 ? xM : defilant ? W / 2 : (busG + busD) / 2;
        // Trait pointillé quand aucun parent biologique n'est dessiné.
        const pointille = f.parents.every((x) => x.adoptif);
        adoption ||= f.parents.some((x) => x.adoptif);
        let depart: number;
        if (hauts.length === 2) {
          const x0 = etendu ? cible - 42 : Math.max(o + 34, cible - 42);
          const x1 = x0 + 84;
          hauts.forEach((x, i) => {
            noeuds.push(noeud(x, moi, i ? x1 : x0, yP, R, { annee: true, manque: p.id }));
            if (x && estDecede(x)) deces = true;
          });
          traits.push({ d: `M${x0 + R + 5} ${yP}H${x1 - R - 5}`, pointille: f.manque > 0 || f.parentsSepares });
          milieu = (x0 + x1) / 2;
          xParents = [x0, x1];
          depart = yP;
        } else {
          noeuds.push(noeud(hauts[0], moi, cible, yP, R, { annee: true, manque: p.id }));
          if (hauts[0] && estDecede(hauts[0])) deces = true;
          milieu = cible;
          xParents = [cible];
          depart = yP + R + 24 + (hauts[0] ? LBL + LIGNE_EN_PLUS : 0);
        }
        if (fr.length > 0) {
          traits.push({ d: `M${milieu} ${depart}V${yJ}`, pointille });
        } else if (milieu === xM) {
          traits.push({ d: `M${xM} ${depart}V${yM - RG - 5}`, pointille });
        } else {
          traits.push({ d: `M${milieu} ${depart}V${(yP + yM) / 2}H${xM}V${yM - RG - 5}`, pointille });
        }
      }
      if (fr.length > 0) {
        traits.push({ d: `M${Math.min(busG, milieu ?? busG)} ${yJ}H${Math.max(busD, milieu ?? busD)}` });
        traits.push({ d: `M${xM} ${yJ}V${yM - RG - 5}` });
      }

      // Demis en familles : le groupe pend sous le trait entre le parent commun et l'autre parent (trait plein : le pointillé est réservé à l'adoption et aux parents séparés).
      if (etendu && plan && xParents.length > 0) {
        const yBus = yM - RG - 18;
        for (const fam of plan.familles) {
          const xPar = fam.gauche ? xParents[0] : xParents[xParents.length - 1];
          const h = xM + fam.h;
          const xs = fam.xs.map((x) => xM + x);
          if (fam.autre && fam.xAutre !== undefined) {
            const xA = xM + fam.xAutre;
            noeuds.push(noeud(fam.autre, moi, xA, yP, R, { annee: true }));
            deces ||= estDecede(fam.autre);
            const sens = Math.sign(xPar - xA);
            traits.push({ d: `M${xA + sens * (R + 5)} ${yP}H${xPar - sens * (R + 5)}`, pointille: fam.separe });
            traits.push({ d: `M${h} ${yP}V${yBus}` });
          } else {
            traits.push({ d: `M${xPar + (fam.gauche ? -1 : 1) * (R + 5)} ${yP}H${h}V${yBus}` });
          }
          const bords = [h, ...xs];
          const g = Math.min(...bords);
          const d = Math.max(...bords);
          if (g < d) traits.push({ d: `M${g} ${yBus}H${d}` });
          fam.enfants.forEach((s, i) => {
            traits.push({ d: `M${xs[i]} ${yBus}V${yM - R - 5}` });
            noeuds.push(noeud(s, moi, xs[i], yM, R, { annee: true, larg: sl - 4 }));
            deces ||= estDecede(s);
          });
        }
      }

      // Demis : trait pointillé depuis leur parent commun, à hauteur des parents, puis descente jusqu'à chacun.
      if (avecDemis && xParents.length > 0) {
        const gaucheRang = xM - decal;
        const droiteRang = xM - decal + bw + nB * sl;
        const cote = (liste: Personne[], gauche: boolean) => {
          if (liste.length === 0) return;
          const xs = liste.map((_, i) => (gauche ? gaucheRang - GAP - (liste.length - i - 0.5) * sl : droiteRang + GAP + (i + 0.5) * sl));
          const xPar = gauche ? xParents[0] - R - 5 : xParents[xParents.length - 1] + R + 5;
          traits.push({ d: `M${xPar} ${yP}H${gauche ? xs[0] : xs[xs.length - 1]}`, pointille: true });
          liste.forEach((s, i) => {
            traits.push({ d: `M${xs[i]} ${yP}V${yM - R - 5}` });
            noeuds.push(noeud(s, moi, xs[i], yM, R, { annee: true, larg: sl - 4 }));
            deces ||= estDecede(s);
          });
        };
        cote(demisG, true);
        cote(demisD, false);
      }

      // Enfants, de gauche à droite : ceux du couple sous le couple, ceux d'une autre union sous la personne seule,
      // ceux de l'ex sous la personne et son ex. S'ils ne tiennent pas tous, leur rang défile de côté.
      const groupe = (e: Foyer['enfants'][number]) => (e.duCouple ? 0 : e.duEx ? 2 : 1);
      const ordonnes = [...f.enfants].sort((a, b) => groupe(a) - groupe(b));
      if (n > 0) {
        const oS = xM;
        const oC = (xM + xC) / 2;
        const oX = (xM + xX) / 2;
        const yBus = yE - R - 14;
        const departS = yM + RG + 28 + LBL + LIGNE_EN_PLUS;
        const presents = (
          [
            [0, oC, yM],
            [1, oS, departS],
            [2, oX, yM],
          ] as const
        ).filter(([g]) => ordonnes.some((e) => groupe(e) === g));
        for (const e of f.enfants) {
          adoption ||= e.adoptif;
          deces ||= estDecede(e.personne);
        }

        if (n * 60 <= W - 8) {
          const pas = Math.min(70, (W - 8) / n);
          const total = (n - 1) * pas;
          const origines = presents.map(([, o]) => o);
          const centre = (Math.min(...origines) + Math.max(...origines)) / 2;
          const debut = Math.max(34, Math.min(centre - total / 2, W - 34 - total));
          const bus = (g: number) => (g === 1 && presents.length > 1 ? yBus - 10 : yBus);
          for (const [g, origine, haut] of presents) {
            const xs = ordonnes.flatMap((e, i) => (groupe(e) === g ? [debut + i * pas] : []));
            traits.push({ d: `M${origine} ${haut}V${bus(g)}` });
            traits.push({ d: `M${Math.min(xs[0], origine)} ${bus(g)}H${Math.max(xs[xs.length - 1], origine)}` });
          }
          ordonnes.forEach((e, i) => {
            const x = debut + i * pas;
            traits.push({ d: `M${x} ${bus(groupe(e))}V${yE - R - 5}`, pointille: e.adoptif });
            noeuds.push(noeud(e.personne, moi, x, yE, R, { annee: true }));
          });
        } else {
          // Bande qui défile, débordant jusqu'aux bords de la carte : son trait horizontal va du premier au dernier enfant ;
          // le trait vertical du couple, fixe, tombe toujours dessus. Du plus âgé, à gauche au départ, au plus jeune,
          // toutes unions confondues.
          const ordre = [...f.enfants].sort((a, b) => parNaissance(a.personne, b.personne));
          const Wd = W + 20;
          const k = Math.floor((Wd - 16) / 64);
          const pasD = (Wd - 16) / (k + 0.5);
          const largD = 16 + n * pasD;
          const haut0 = yBus - 2;
          const hD = yE + R + 30 + LBL + LIGNE_EN_PLUS - haut0;
          for (const [, origine, haut] of presents) traits.push({ d: `M${origine} ${haut}V${yBus}` });
          const xPremier = 8 + pasD / 2;
          const tD: Trait[] = [{ d: `M${xPremier} 2H${xPremier + (n - 1) * pasD}` }];
          const nD: HTMLElement[] = [];
          ordre.forEach((e, i) => {
            const x = xPremier + i * pasD;
            tD.push({ d: `M${x} 2V${yE - R - 5 - haut0}`, pointille: e.adoptif });
            nD.push(noeud(e.personne, moi, x, yE - haut0, R, { annee: true, larg: Math.min(64, pasD - 4) }));
          });
          const defile = h(
            'div',
            {
              class: 'defile',
              style: `left: -10px; top: ${haut0}px; width: ${Wd}px; height: ${hD}px`,
              role: 'group',
              'aria-label': `${n} enfants, faire défiler`,
            },
            h('div', { style: `width: ${largD}px` }, svg(largD, hD, tD), ...nD),
          );
          const fondus = () => {
            const max = defile.scrollWidth - defile.clientWidth;
            defile.classList.toggle('fondu-g', defile.scrollLeft > 2);
            defile.classList.toggle('fondu-d', defile.scrollLeft < max - 2);
          };
          defile.addEventListener('scroll', fondus, { passive: true });
          requestAnimationFrame(fondus);
          bandes.push(defile);
        }
      }

      el.replaceChildren(svg(W, H, traits), ...noeuds, ...bandes);
      faireApparaitre(el);
      cles.replaceChildren(
        ...(adoption ? [h('span', {}, h('i', { class: 'cle-pointille' }), 'adoption')] : []),
        ...(deces ? [h('span', {}, h('i', { class: 'cle-decede' }), 'décédé(e)')] : []),
      );
      cles.hidden = !adoption && !deces;
    },
    cles,
  );
}

/** « Lien avec toi » : chemin de « Moi » à la personne, coude pour parent et enfant, trait double pour un couple, simple pour une amitié. */
export function dessinChemin(etapes: Etape[], moi: string, d?: Donnees): HTMLElement {
  const phrase = h('p', { class: 'legende' }, h('b', {}, 'Toi'), ` → ${motsChemin(etapes, d).join(' → ')}`);
  const R = 17,
    RANG = 58,
    CO = 8,
    n = etapes.length;
  let g = 0;
  const gens = etapes.map((e) => {
    if (e.par === 'parent') g++;
    else if (e.par === 'enfant') g--;
    return g;
  });
  const gMax = Math.max(...gens);
  const gMin = Math.min(...gens);
  const H = (gMax - gMin) * RANG + 2 * R + 26 + LIGNE_EN_PLUS;
  return bloc(
    'chemin',
    H,
    (el, W) => {
      const pas = Math.min(68, (W - 56) / (n - 1));
      const debut = (W - (n - 1) * pas) / 2;
      const pts = etapes.map((_, i) => ({ x: debut + i * pas, y: (gMax - gens[i]) * RANG + R + 2 }));
      const traits: Trait[] = [];
      const noeuds: HTMLElement[] = [];
      etapes.forEach((e, i) => {
        const a = pts[i];
        noeuds.push(noeud(e.personne, moi, a.x, a.y, R, { ici: i === n - 1, larg: Math.min(64, pas - 4) }));
        if (i === n - 1) return;
        const b = pts[i + 1];
        const par = etapes[i + 1].par;
        const g1 = a.x + R + 4;
        const g2 = b.x - R - 4;
        if (par === 'parent') traits.push({ d: `M${a.x} ${a.y - R - 4}V${b.y + CO}Q${a.x} ${b.y} ${a.x + CO} ${b.y}H${g2}` });
        else if (par === 'enfant') traits.push({ d: `M${g1} ${a.y}H${b.x - CO}Q${b.x} ${a.y} ${b.x} ${a.y + CO}V${b.y - R - 4}` });
        else if (par === 'conjoint') traits.push({ d: `M${g1} ${a.y - 2.5}H${g2}` }, { d: `M${g1} ${a.y + 2.5}H${g2}` });
        else traits.push({ d: `M${g1} ${a.y}H${g2}` });
      });
      el.replaceChildren(svg(W, H, traits), ...noeuds);
    },
    phrase,
  );
}
