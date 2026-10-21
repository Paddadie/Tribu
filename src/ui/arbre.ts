// Dessins de la fiche (FEAT-09) : « Famille proche » (parents, fratrie, conjoint, enfants) et « Lien avec toi »
// (chemin depuis « Moi », l'ancêtre commun en haut). Positions calculées en pixels d'après la largeur réelle :
// le dessin se fait une fois l'écran inséré dans la page, puis à chaque changement de largeur.

import type { Etape } from '../modele/deductions';
import { annees, disposerFoyer, type FamilleProche } from '../modele/familleProche';
import { estDecede } from '../modele/modele';
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
  /** Passe sur d'autres traits : un halo couleur de carte le détache. */
  halo?: boolean;
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
  // Nom complet au survol (et à l'appui long dans « Famille proche ») : le nom affiché peut être coupé.
  const title = sansNom ? false : `${p.prenom} ${p.nom}`.trim();
  return o.ici
    ? h('span', { class: 'noeud ici', style, 'aria-current': 'page', title }, ...contenu)
    : h('a', { class: 'noeud', href: `#/personne/${p.id}`, style, title }, ...contenu);
}

function svg(l: number, haut: number, traits: Trait[]): SVGSVGElement {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('width', String(l));
  s.setAttribute('height', String(haut));
  s.setAttribute('viewBox', `0 0 ${l} ${haut}`);
  s.setAttribute('aria-hidden', 'true');
  for (const t of traits) {
    if (t.halo) {
      const halo = document.createElementNS(SVG, 'path');
      halo.setAttribute('class', 'halo');
      halo.setAttribute('d', t.d);
      s.append(halo);
    }
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
 * La hauteur est fixée d'emblée : la page garde sa longueur avant le dessin (sinon un écran redessiné en bas de
 * fiche remonterait). « Famille proche » l'estime pour un téléphone courant, puis la corrige à chaque dessin.
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

/** Appui long sur un nœud : son nom complet dans une bulle, sans ouvrir la fiche (le nom affiché peut être coupé). */
function appuiLong(el: HTMLElement): void {
  let minuteur: number | undefined;
  let depart: { x: number; y: number } | undefined;
  let ignorerClic = false;
  let bulle: HTMLElement | undefined;
  const fermer = () => {
    bulle?.remove();
    bulle = undefined;
  };
  const annuler = () => {
    clearTimeout(minuteur);
    minuteur = undefined;
  };
  el.addEventListener('pointerdown', (e) => {
    // Un appui long n'est pas toujours suivi d'un clic : le toucher suivant ne doit pas être avalé.
    ignorerClic = false;
    fermer();
    const n = (e.target as Element).closest<HTMLElement>('.noeud[title]');
    if (!n) return;
    depart = { x: e.clientX, y: e.clientY };
    minuteur = window.setTimeout(() => {
      const carte = el.closest<HTMLElement>('.dessin') ?? el;
      const r = n.getBoundingClientRect();
      const c = carte.getBoundingClientRect();
      bulle = h('span', { class: 'bulle-nom', role: 'status', style: `left: ${r.left + r.width / 2 - c.left}px; top: ${r.top - c.top}px` }, n.title);
      carte.append(bulle);
      ignorerClic = true;
      setTimeout(fermer, 2500);
    }, 500);
  });
  el.addEventListener('pointermove', (e) => {
    if (depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 8) annuler();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(type, annuler);
  el.addEventListener(
    'click',
    (e) => {
      if (!ignorerClic) return;
      ignorerClic = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );
  el.addEventListener('contextmenu', (e) => {
    if ((e.target as Element).closest('.noeud')) e.preventDefault();
  });
}

/**
 * « Famille proche » : la disposition vient de `disposerFoyer` (modele/familleProche.ts), ici seulement le rendu.
 * Trop large même replié : le dessin défile de côté, ouvert centré sur la personne, avec un indice sous la carte.
 */
export function dessinFoyer(f: FamilleProche): HTMLElement {
  const cles = h('div', { class: 'cles', hidden: true });
  const barre = h('b');
  const indice = h('p', { class: 'indice', hidden: true }, h('i', {}, barre), 'Glisse pour voir toute la famille');
  const adoption =
    f.couples.some((K) => K.adoptif) ||
    f.freres.some((x) => x.adoptif) ||
    f.autresCouples.some((a) => a.enfants.some((e) => e.adoptif)) ||
    f.enfants.some((e) => e.adoptif);
  const el = bloc(
    'foyer',
    disposerFoyer(f, 294).hauteur,
    (arbre, largeur) => {
      const dis = disposerFoyer(f, largeur);
      arbre.style.height = `${dis.hauteur}px`;
      const noeuds = dis.noeuds.map((n) => noeud(n.personne, f.moi, n.x, n.y, n.rayon, { ici: n.ici, larg: n.largeur, annee: true, manque: f.centre }));
      const dessin = [svg(dis.largeur, dis.hauteur, dis.traits), ...noeuds];
      if (dis.defile) {
        const defile = h(
          'div',
          {
            class: 'defile',
            style: `left: 0; top: 0; width: ${largeur}px; height: ${dis.hauteur}px`,
            role: 'group',
            'aria-label': 'Famille proche, faire défiler',
          },
          h('div', { style: `width: ${dis.largeur}px` }, ...dessin),
        );
        const suivre = () => {
          const max = defile.scrollWidth - defile.clientWidth;
          defile.classList.toggle('fondu-g', defile.scrollLeft > 2);
          defile.classList.toggle('fondu-d', defile.scrollLeft < max - 2);
          if (defile.scrollWidth > 0) {
            barre.style.left = `${(100 * defile.scrollLeft) / defile.scrollWidth}%`;
            barre.style.width = `${(100 * defile.clientWidth) / defile.scrollWidth}%`;
          }
        };
        defile.addEventListener('scroll', suivre, { passive: true });
        arbre.replaceChildren(defile);
        const ici = dis.noeuds.find((n) => n.ici);
        requestAnimationFrame(() => {
          if (ici) defile.scrollLeft = ici.x - largeur / 2;
          suivre();
        });
      } else arbre.replaceChildren(...dessin);
      indice.hidden = !dis.defile;
      faireApparaitre(arbre);
      const deces = dis.noeuds.some((n) => n.personne && estDecede(n.personne));
      cles.replaceChildren(
        ...(adoption ? [h('span', {}, h('i', { class: 'cle-pointille' }), 'adoption')] : []),
        ...(deces ? [h('span', {}, h('i', { class: 'cle-decede' }), 'décédé(e)')] : []),
      );
      cles.hidden = !adoption && !deces;
    },
    indice,
    cles,
  );
  const arbre = el.querySelector<HTMLElement>('.arbre');
  if (arbre) appuiLong(arbre);
  return el;
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
