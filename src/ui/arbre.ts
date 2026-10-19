// Dessins de la fiche (FEAT-09) : « Famille proche » (parents, fratrie, conjoint, enfants) et « Lien avec toi »
// (chemin depuis « Moi », l'ancêtre commun en haut). Positions calculées en pixels d'après la largeur réelle :
// le dessin se fait une fois l'écran inséré dans la page, puis à chaque changement de largeur.

import type { Etape, Foyer } from '../modele/deductions';
import { motsChemin } from '../modele/parente';
import type { Personne } from '../modele/types';
import { h } from './dom';
import { avatarPersonne } from './lignePersonne';

const SVG = 'http://www.w3.org/2000/svg';

interface Trait {
  d: string;
  pointille?: boolean;
}

interface OptionsNoeud {
  /** Personne de la fiche : pas de lien, nœud plus grand. */
  ici?: boolean;
  larg?: number;
  annee?: boolean;
  /** Case « + Parent » : lien vers l'ajout d'un parent à cette personne. */
  manque?: string;
}

/** « 1990 », « 1938–2019 », « ?–2019 » ; vide sans date connue. */
function annees(p: Personne): string {
  const n = p.naissance?.slice(0, 4);
  const d = p.deces?.slice(0, 4);
  return d ? `${n ?? '?'}–${d}` : (n ?? '');
}

const parNaissance = (a: Personne, b: Personne) => (a.naissance ?? '9999').localeCompare(b.naissance ?? '9999');

function noeud(p: Personne | undefined, moi: string | undefined, x: number, y: number, r: number, o: OptionsNoeud = {}): HTMLElement {
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
  const avatar = avatarPersonne(p);
  if (p.deces) avatar.classList.add('decede');
  const an = o.annee && annees(p);
  const contenu = [
    avatar,
    p.id === moi ? h('span', { class: 'nom toi' }, 'Toi') : h('span', { class: 'nom' }, p.prenom || p.nom),
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

/** « Famille proche » : parents (ou « + Parent »), la personne avec sa fratrie en pile et son conjoint, enfants rangés par union. */
export function dessinFoyer(p: Personne, f: Foyer, moi: string | undefined): HTMLElement {
  const cles = h('div', { class: 'cles', hidden: true });
  const R = 19, RG = 26, LBL = 14, RANG = 92 + LBL;
  const nbHaut = f.parents.length + f.manque;
  const n = f.enfants.length;
  const yP = R + 2;
  const yM = nbHaut > 0 ? yP + RANG : RG + 2;
  const yE = yM + RANG + 14;
  const H = (n > 0 ? yE + R : yM + RG) + 26 + LBL;
  return bloc('foyer', H, (el, W) => {
    const cj = f.conjoint?.personne;
    const fr = f.fratrie;
    const traits: Trait[] = [];
    const noeuds: HTMLElement[] = [];
    let deces = !!p.deces;
    let adoption = false;
    let bande: HTMLElement | undefined;
    // Sur grand écran, le foyer garde ses proportions de téléphone, centré ; seuls les enfants s'étalent.
    const Wc = Math.min(W, 400);
    const o = (W - Wc) / 2;
    const xS = o + 40;
    let xM: number;
    let xC = 0;
    if (fr.length > 0) {
      xM = o + (cj ? Wc / 2 - 6 : Wc / 2 + 20);
      xC = xM + 92;
    } else {
      xM = W / 2 - (cj ? 50 : 0);
      xC = W / 2 + 50;
    }

    noeuds.push(noeud(p, moi, xM, yM, RG, { ici: true, larg: 84, annee: true }));
    if (cj) {
      noeuds.push(noeud(cj, moi, xC, yM, R, { annee: true }));
      deces ||= !!cj.deces;
      traits.push({ d: `M${xM + RG + 5} ${yM}H${xC - R - 5}` });
    }

    // Parents (et case « + Parent »), puis la fratrie en pile sous les mêmes parents.
    if (nbHaut > 0) {
      const hauts: (Personne | undefined)[] = [...f.parents.map((x) => x.personne), ...Array<undefined>(f.manque).fill(undefined)];
      const cible = fr.length > 0 ? (xS + xM) / 2 : xM;
      // Trait pointillé quand aucun parent biologique n'est dessiné.
      const pointille = f.parents.every((x) => x.adoptif);
      adoption ||= f.parents.some((x) => x.adoptif);
      let milieu: number;
      let depart: number;
      if (hauts.length === 2) {
        const x0 = Math.max(o + 34, cible - 42);
        const x1 = x0 + 84;
        hauts.forEach((x, i) => {
          noeuds.push(noeud(x, moi, i ? x1 : x0, yP, R, { annee: true, manque: p.id }));
          if (x?.deces) deces = true;
        });
        traits.push({ d: `M${x0 + R + 5} ${yP}H${x1 - R - 5}`, pointille: f.manque > 0 });
        milieu = (x0 + x1) / 2;
        depart = yP;
      } else {
        noeuds.push(noeud(hauts[0], moi, cible, yP, R, { annee: true, manque: p.id }));
        if (hauts[0]?.deces) deces = true;
        milieu = cible;
        depart = yP + R + 24 + (hauts[0] ? LBL : 0);
      }
      if (fr.length > 0) {
        const yJ = yM - RG - 18;
        traits.push({ d: `M${milieu} ${depart}V${yJ}`, pointille });
        traits.push({ d: `M${Math.min(xS, milieu)} ${yJ}H${Math.max(xM, milieu)}` });
        traits.push({ d: `M${xS} ${yJ}V${yM - 19}` });
        traits.push({ d: `M${xM} ${yJ}V${yM - RG - 5}` });
        noeuds.push(pile(fr, xS, yM));
      } else if (milieu === xM) {
        traits.push({ d: `M${xM} ${depart}V${yM - RG - 5}`, pointille });
      } else {
        traits.push({ d: `M${milieu} ${depart}V${(yP + yM) / 2}H${xM}V${yM - RG - 5}`, pointille });
      }
    }

    // Enfants : ceux du couple sous le couple, ceux d'une autre union sous la personne seule.
    // S'ils ne tiennent pas tous, leur rang défile de côté.
    if (n > 0) {
      const oS = xM;
      const oC = (xM + xC) / 2;
      const aS = f.enfants.some((e) => !e.duCouple);
      const aC = f.enfants.some((e) => e.duCouple);
      const yBus = yE - R - 14;
      const departS = yM + RG + 28 + LBL;
      for (const e of f.enfants) {
        adoption ||= e.adoptif;
        deces ||= !!e.personne.deces;
      }

      if (n * 60 <= W - 8) {
        const pas = Math.min(70, (W - 8) / n);
        const total = (n - 1) * pas;
        const centre = aS && aC ? (oS + oC) / 2 : aC ? oC : oS;
        const debut = Math.max(34, Math.min(centre - total / 2, W - 34 - total));
        const bus = (duCouple: boolean) => (!duCouple && aS && aC ? yBus - 10 : yBus);
        for (const [duCouple, origine, haut] of [[false, oS, departS], [true, oC, yM]] as const) {
          const xs = f.enfants.flatMap((e, i) => (e.duCouple === duCouple ? [debut + i * pas] : []));
          if (xs.length === 0) continue;
          traits.push({ d: `M${origine} ${haut}V${bus(duCouple)}` });
          traits.push({ d: `M${Math.min(xs[0], origine)} ${bus(duCouple)}H${Math.max(xs[xs.length - 1], origine)}` });
        }
        f.enfants.forEach((e, i) => {
          const x = debut + i * pas;
          traits.push({ d: `M${x} ${bus(e.duCouple)}V${yE - R - 5}`, pointille: e.adoptif });
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
        const hD = yE + R + 30 + LBL - haut0;
        if (aS) traits.push({ d: `M${oS} ${departS}V${yBus}` });
        if (aC) traits.push({ d: `M${oC} ${yM}V${yBus}` });
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
        bande = defile;
      }
    }

    el.replaceChildren(svg(W, H, traits), ...noeuds, ...(bande ? [bande] : []));
    cles.replaceChildren(
      ...(adoption ? [h('span', {}, h('i', { class: 'cle-pointille' }), 'adoption')] : []),
      ...(deces ? [h('span', {}, h('i', { class: 'cle-decede' }), 'décédé(e)')] : []),
    );
    cles.hidden = !adoption && !deces;
  }, cles);
}

/** Pile de la fratrie (trois avatars au plus) : un toucher fait défiler jusqu'à la section « Frères et sœurs ». */
function pile(fr: Personne[], x: number, y: number): HTMLElement {
  const libelle =
    fr.length === 1
      ? [fr[0].sexe === 'F' ? '1 sœur' : fr[0].sexe === 'M' ? '1 frère' : '1 frère ou sœur']
      : [`${fr.length} frères`, h('br'), 'et sœurs'];
  return h(
    'button',
    {
      type: 'button',
      class: 'pile',
      style: `left: ${x - 40}px; top: ${y - 14}px; width: 80px`,
      onclick: () => {
        const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        document.getElementById('section-fratrie')?.scrollIntoView({ block: 'start', behavior: reduit ? 'auto' : 'smooth' });
      },
    },
    h('span', { class: 'avatars' }, ...fr.slice(0, 3).map((s) => avatarPersonne(s))),
    h('span', { class: 'nom' }, ...libelle),
  );
}

/** « Lien avec toi » : chemin de « Moi » à la personne, coude pour parent et enfant, trait double pour un couple, simple pour une amitié. */
export function dessinChemin(etapes: Etape[], moi: string): HTMLElement {
  const phrase = h('p', { class: 'legende' }, h('b', {}, 'Toi'), ` → ${motsChemin(etapes).join(' → ')}`);
  const R = 17, RANG = 58, CO = 8, n = etapes.length;
  let g = 0;
  const gens = etapes.map((e) => {
    if (e.par === 'parent') g++;
    else if (e.par === 'enfant') g--;
    return g;
  });
  const gMax = Math.max(...gens);
  const gMin = Math.min(...gens);
  const H = (gMax - gMin) * RANG + 2 * R + 26;
  return bloc('chemin', H, (el, W) => {
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
  }, phrase);
}
