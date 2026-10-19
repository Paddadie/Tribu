// Écran « Arbre » (#/arbre) : toutes les personnes reliées à « Moi », une ligne par génération, ses amis dans
// une bulle sous la famille (maquette A). On s'y déplace au doigt (glisser, pincer, double toucher) ou à la
// souris (molette) ; toucher une personne ouvre sa fiche. Le placement vient de `disposerArbre` (modèle testé).

import { disposerArbre, type Disposition, type Point } from '../modele/arbreGlobal';
import { filtrerParNom, nomComplet } from '../modele/liste';
import { ficheMoi } from '../modele/reglages';
import type { Personne } from '../modele/types';
import { noeud } from './arbre';
import { h, icone } from './dom';
import { lireDonnees, lireReglages } from './etat';
import { avatarPersonne } from './lignePersonne';
import { lienRetour } from './navigation';

const SVG = 'http://www.w3.org/2000/svg';
/** Pixels entre deux places voisines, et entre deux générations (à l'échelle 1). */
const PAS_X = 80;
const PAS_Y = 140;
/** Rayon de l'avatar, largeur d'un nœud. */
const R = 19;
const LARG = 76;
/** Sous l'avatar, le nom et l'année : un trait qui part d'un parent seul commence en dessous. */
const SOUS_NOM = R + 40;
const MARGE = 70;
const ECHELLE_MIN = 0.2;
const ECHELLE_MAX = 3;
/** En dessous de cette échelle, les noms s'effacent : il ne reste que les pastilles. */
const ECHELLE_LOIN = 0.6;

interface Vue {
  tx: number;
  ty: number;
  s: number;
}

/** Zoom et position gardés pendant la session : au retour d'une fiche, l'arbre est tel qu'on l'a laissé. */
let vueGardee: Vue | undefined;
let astuceMontree = false;

const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Courbe douce passant par tous les points, partant et arrivant à la verticale. */
function lisse(points: Point[]): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const dy = (b.y - a.y) / 2;
    d += ` C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
  }
  return d;
}

export function ecranArbre(): HTMLElement {
  const d = lireDonnees();
  const moi = ficheMoi(lireReglages(), d);
  const loupe = h('button', { type: 'button', class: 'bouton-icone', 'aria-label': 'Chercher une personne' }, icone('recherche', 24));
  const barre = h(
    'div',
    { class: 'barre' },
    lienRetour('#/', { class: 'bouton-icone', 'aria-label': 'Retour' }, icone('retour', 26)),
    h('h1', { class: 'titre-formulaire' }, 'Arbre'),
    moi && loupe,
  );
  if (!moi) {
    return h(
      'div',
      { class: 'ecran' },
      barre,
      h(
        'div',
        { class: 'contenu arbre-vide' },
        h('p', {}, 'Choisis d’abord ta fiche : l’arbre se construit autour de toi.'),
        h('a', { class: 'bouton', href: '#/reglages' }, 'Réglages → Moi'),
      ),
    );
  }
  const disp = disposerArbre(d, moi.id);
  const carte = new Carte(disp, moi);
  loupe.addEventListener('click', () => carte.basculerRecherche());
  return h('div', { class: 'ecran ecran-arbre' }, barre, carte.vue);
}

/** Zone déplaçable : un calque (traits + nœuds) transformé par translation et échelle. */
class Carte {
  readonly vue: HTMLElement;
  private readonly calque: HTMLElement;
  private readonly noeuds = new Map<string, HTMLElement>();
  private readonly centres = new Map<string, Point>();
  private readonly largeur: number;
  private readonly hauteur: number;
  private v: Vue = { tx: 0, ty: 0, s: 1 };
  private pret = false;
  private animation = 0;
  private recherche: HTMLElement | undefined;
  private readonly disp: Disposition;
  private readonly moi: Personne;

  constructor(disp: Disposition, moi: Personne) {
    this.disp = disp;
    this.moi = moi;
    const xs = disp.places.map((p) => p.x);
    const ys = disp.places.map((p) => p.y);
    const ox = MARGE + LARG / 2 - Math.min(...xs) * PAS_X;
    const oy = MARGE + R - Math.min(...ys) * PAS_Y;
    this.largeur = ox + Math.max(...xs) * PAS_X + LARG / 2 + MARGE;
    this.hauteur = oy + Math.max(...ys) * PAS_Y + SOUS_NOM + MARGE;
    const px = (p: Point): Point => ({ x: ox + p.x * PAS_X, y: oy + p.y * PAS_Y });

    for (const pl of disp.places) this.centres.set(pl.personne.id, px(pl));
    const noeuds = disp.places.map((pl) => {
      const c = this.centres.get(pl.personne.id)!;
      const n = noeud(pl.personne, moi.id, c.x, c.y, R, { annee: true, larg: LARG });
      n.dataset.id = pl.personne.id;
      n.setAttribute('draggable', 'false');
      if (pl.personne.id === moi.id) n.classList.add('moi');
      this.noeuds.set(pl.personne.id, n);
      return n;
    });

    this.calque = h('div', { class: 'calque' }, this.traits(px), ...noeuds);
    this.calque.style.width = `${this.largeur}px`;
    this.calque.style.height = `${this.hauteur}px`;
    const astuce = !astuceMontree && h('div', { class: 'astuce-arbre', 'aria-hidden': 'true' }, 'Glisse pour te déplacer, pince pour zoomer');
    this.vue = h(
      'div',
      { class: 'vue-arbre' },
      this.calque,
      astuce,
      h(
        'div',
        { class: 'commandes-arbre gauche' },
        h('button', { type: 'button', class: 'puce-arbre accent', onclick: () => this.aller(this.surPersonne(moi.id, 1)) }, 'Toi'),
        h('button', { type: 'button', class: 'puce-arbre', onclick: () => this.aller(this.toutVoir()) }, 'Tout'),
      ),
      h(
        'div',
        { class: 'commandes-arbre droite' },
        h('button', { type: 'button', class: 'rond-arbre', 'aria-label': 'Zoomer', onclick: () => this.zoomCentre(1.5) }, icone('plus', 22)),
        h('button', { type: 'button', class: 'rond-arbre', 'aria-label': 'Dézoomer', onclick: () => this.zoomCentre(1 / 1.5) }, icone('moins', 22)),
      ),
    );
    if (astuce) {
      astuceMontree = true;
      setTimeout(() => astuce.classList.add('cachee'), 3500);
    }
    this.gestes();
    // Taille connue une fois l'écran dans la page : première vue (gardée, sinon centrée sur Moi), puis bornes
    // à chaque changement de taille (rotation). Rien à taille nulle (tests).
    new ResizeObserver(() => {
      if (this.vue.clientWidth === 0) return;
      if (!this.pret) {
        this.pret = true;
        this.v = vueGardee ? { ...vueGardee } : this.surPersonne(moi.id, 1);
      }
      this.appliquer();
    }).observe(this.vue);
  }

  // ——— Dessin ———

  private traits(px: (p: Point) => Point): SVGSVGElement {
    const s = document.createElementNS(SVG, 'svg');
    s.setAttribute('class', 'traits-arbre');
    s.setAttribute('width', String(this.largeur));
    s.setAttribute('height', String(this.hauteur));
    s.setAttribute('aria-hidden', 'true');
    const trait = (d: string, classe: string) => {
      const c = document.createElementNS(SVG, 'path');
      c.setAttribute('class', classe);
      c.setAttribute('d', d);
      s.append(c);
    };
    const centre = (id: string) => this.centres.get(id)!;

    // Bulle des amis, derrière tout le reste.
    const bulle = this.disp.places.filter((p) => p.bulle).map((p) => centre(p.personne.id));
    let hautBulle: Point | undefined;
    if (bulle.length > 0) {
      const g = Math.min(...bulle.map((p) => p.x)) - LARG / 2 - 14;
      const dr = Math.max(...bulle.map((p) => p.x)) + LARG / 2 + 14;
      const ha = Math.min(...bulle.map((p) => p.y)) - R - 40;
      const ba = Math.max(...bulle.map((p) => p.y)) + SOUS_NOM + 14;
      const zone = document.createElementNS(SVG, 'rect');
      for (const [k, val] of Object.entries({ x: g, y: ha, width: dr - g, height: ba - ha, rx: 28, class: 'zone-amis' })) zone.setAttribute(k, String(val));
      const titre = document.createElementNS(SVG, 'text');
      for (const [k, val] of Object.entries({ x: g + 18, y: ha + 24, class: 'titre-amis' })) titre.setAttribute(k, String(val));
      titre.textContent = 'TES AMIS';
      s.append(zone, titre);
      hautBulle = { x: (g + dr) / 2, y: ha };
    }

    for (const c of this.disp.couples) {
      const [a, b] = [centre(c.a), centre(c.b)].sort((p, q) => p.x - q.x);
      const voisins = a.y === b.y && b.x - a.x <= PAS_X * 1.01;
      const d = voisins
        ? `M ${a.x + R} ${a.y} H ${b.x - R}`
        : `M ${a.x} ${a.y - R} C ${a.x} ${a.y - R - 46}, ${b.x} ${b.y - R - 46}, ${b.x} ${b.y - R}`;
      trait(d, c.separe ? 'trait couple ex' : 'trait couple');
    }

    for (const br of this.disp.branches) {
      const bus = px({ x: 0, y: br.bus }).y;
      const origines = br.origines.map((o) => ({ ...px(o), seul: o.parent !== undefined }));
      const enfants = br.enfants.map((e) => ({ ...px(e), adoptif: e.adoptif }));
      const classe = enfants.every((e) => e.adoptif) ? 'trait pointille' : 'trait';
      for (const o of origines) trait(`M ${o.x} ${o.seul ? o.y + SOUS_NOM : o.y} V ${bus}`, classe);
      const xs = [...origines, ...enfants].map((p) => p.x);
      if (Math.max(...xs) - Math.min(...xs) > 0.5) trait(`M ${Math.min(...xs)} ${bus} H ${Math.max(...xs)}`, classe);
      for (const e of enfants) trait(`M ${e.x} ${bus} V ${e.y - R - 3}`, e.adoptif ? 'trait pointille' : 'trait');
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
    for (const a of this.disp.amities) trait(courbe(centre(a.a), centre(a.b)), 'trait ami');
    if (hautBulle) trait(lisse(this.versBulle(hautBulle)), 'trait ami');
    return s;
  }

  /**
   * Passage du pointillé de Moi jusqu'à la bulle : il descend en se glissant, à chaque ligne de la famille
   * sous Moi, dans l'espace libre le plus proche entre deux personnes (sans traverser de nom).
   */
  private versBulle(arrivee: Point): Point[] {
    const m = this.centres.get(this.moi.id)!;
    const points: Point[] = [{ x: m.x, y: m.y + SOUS_NOM }];
    const lignes = new Map<number, number[]>();
    for (const p of this.disp.places) {
      const c = this.centres.get(p.personne.id)!;
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

  // ——— Vue : translation et échelle ———

  private borner(v: Vue): Vue {
    const l = this.vue.clientWidth;
    const ha = this.vue.clientHeight;
    const s = borne(v.s, ECHELLE_MIN, ECHELLE_MAX);
    // Toujours un bout d'arbre au milieu de l'écran : on ne peut pas le perdre de vue.
    return { s, tx: borne(v.tx, l / 2 - this.largeur * s, l / 2), ty: borne(v.ty, ha / 2 - this.hauteur * s, ha / 2) };
  }

  private appliquer(): void {
    this.v = this.borner(this.v);
    this.calque.style.transform = `translate(${this.v.tx}px, ${this.v.ty}px) scale(${this.v.s})`;
    this.calque.style.setProperty('--s', String(this.v.s));
    this.vue.classList.toggle('loin', this.v.s < ECHELLE_LOIN);
    vueGardee = { ...this.v };
  }

  /** Vue qui met la personne au milieu de l'écran (un peu au-dessus, la place des commandes en bas). */
  private surPersonne(id: string, s: number): Vue {
    const c = this.centres.get(id)!;
    return { s, tx: this.vue.clientWidth / 2 - c.x * s, ty: this.vue.clientHeight * 0.42 - c.y * s };
  }

  private toutVoir(): Vue {
    const l = this.vue.clientWidth;
    const ha = this.vue.clientHeight;
    const s = borne(Math.min(l / this.largeur, ha / this.hauteur, 1), ECHELLE_MIN, ECHELLE_MAX);
    return { s, tx: (l - this.largeur * s) / 2, ty: (ha - this.hauteur * s) / 2 };
  }

  private zoomAutour(x: number, y: number, facteur: number, depuis: Vue = this.v): Vue {
    const s = borne(depuis.s * facteur, ECHELLE_MIN, ECHELLE_MAX);
    const k = s / depuis.s;
    return { s, tx: x - (x - depuis.tx) * k, ty: y - (y - depuis.ty) * k };
  }

  private zoomCentre(facteur: number): void {
    this.aller(this.zoomAutour(this.vue.clientWidth / 2, this.vue.clientHeight / 2, facteur));
  }

  /** Va vers une vue, en glissant (320 ms) sauf si les animations sont réduites. */
  private aller(cible: Vue): void {
    cancelAnimationFrame(this.animation);
    const fin = this.borner(cible);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.v = fin;
      this.appliquer();
      return;
    }
    const debut = { ...this.v };
    const t0 = performance.now();
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / 320);
      const e = 1 - (1 - k) ** 3;
      // L'échelle varie de façon géométrique : le zoom paraît régulier.
      const s = debut.s * (fin.s / debut.s) ** e;
      const q = fin.s === debut.s ? e : (s - debut.s) / (fin.s - debut.s);
      this.v = { s, tx: debut.tx + (fin.tx - debut.tx) * q, ty: debut.ty + (fin.ty - debut.ty) * q };
      this.appliquer();
      if (k < 1) this.animation = requestAnimationFrame(pas);
    };
    this.animation = requestAnimationFrame(pas);
  }

  // ——— Gestes ———

  private gestes(): void {
    const pointeurs = new Map<number, Point>();
    let depart: Point | undefined;
    let glisse = false;
    let pince: { ecart: number; milieu: Point } | undefined;
    let dernierToucher: { t: number; p: Point } | undefined;
    let typePointeur = 'mouse';

    const local = (e: { clientX: number; clientY: number }): Point => {
      const r = this.vue.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const mesure = () => {
      const [a, b] = [...pointeurs.values()];
      return { ecart: Math.hypot(a.x - b.x, a.y - b.y) || 1, milieu: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };
    const horsCarte = (e: Event) => (e.target as Element).closest('.commandes-arbre, .recherche-arbre');

    this.vue.addEventListener('pointerdown', (e) => {
      if (horsCarte(e)) return;
      typePointeur = e.pointerType;
      cancelAnimationFrame(this.animation);
      pointeurs.set(e.pointerId, local(e));
      if (pointeurs.size === 1) {
        depart = local(e);
        glisse = false;
      } else if (pointeurs.size === 2) {
        pince = mesure();
        glisse = true;
        for (const id of pointeurs.keys()) this.vue.setPointerCapture?.(id);
      }
    });
    this.vue.addEventListener('pointermove', (e) => {
      const avant = pointeurs.get(e.pointerId);
      if (!avant) return;
      const p = local(e);
      pointeurs.set(e.pointerId, p);
      if (pointeurs.size === 1) {
        // Un toucher reste un toucher (ouverture de fiche) tant que le doigt bouge peu.
        if (!glisse && depart && Math.hypot(p.x - depart.x, p.y - depart.y) > 8) {
          glisse = true;
          this.vue.setPointerCapture?.(e.pointerId);
        }
        if (glisse) {
          this.v = { ...this.v, tx: this.v.tx + p.x - avant.x, ty: this.v.ty + p.y - avant.y };
          this.appliquer();
        }
      } else if (pince) {
        const m = mesure();
        const deplace = { ...this.v, tx: this.v.tx + m.milieu.x - pince.milieu.x, ty: this.v.ty + m.milieu.y - pince.milieu.y };
        this.v = this.zoomAutour(m.milieu.x, m.milieu.y, m.ecart / pince.ecart, deplace);
        this.appliquer();
        pince = m;
      }
    });
    const lever = (e: PointerEvent) => {
      if (!pointeurs.delete(e.pointerId)) return;
      if (pointeurs.size < 2) pince = undefined;
      // Double toucher sur le fond : zoom à cet endroit.
      if (pointeurs.size === 0 && !glisse && e.type === 'pointerup' && e.pointerType === 'touch' && !(e.target as Element).closest('.noeud')) {
        const p = local(e);
        if (dernierToucher && e.timeStamp - dernierToucher.t < 320 && Math.hypot(p.x - dernierToucher.p.x, p.y - dernierToucher.p.y) < 30) {
          this.aller(this.zoomAutour(p.x, p.y, 1.8));
          dernierToucher = undefined;
        } else dernierToucher = { t: e.timeStamp, p };
      }
    };
    this.vue.addEventListener('pointerup', lever);
    this.vue.addEventListener('pointercancel', lever);
    // Après un glissement, le doigt relevé sur une personne n'ouvre pas sa fiche.
    this.vue.addEventListener(
      'click',
      (e) => {
        if (!glisse) return;
        e.preventDefault();
        e.stopPropagation();
        glisse = false;
      },
      true,
    );
    // Double clic à la souris seulement : au doigt, le double toucher est géré plus haut (Android enverrait les deux).
    this.vue.addEventListener('dblclick', (e) => {
      if (typePointeur !== 'mouse' || horsCarte(e) || (e.target as Element).closest('.noeud')) return;
      const p = local(e);
      this.aller(this.zoomAutour(p.x, p.y, 1.8));
    });
    this.vue.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        cancelAnimationFrame(this.animation);
        const p = local(e);
        this.v = this.zoomAutour(p.x, p.y, Math.exp(-e.deltaY * 0.002));
        this.appliquer();
      },
      { passive: false },
    );
    this.vue.addEventListener('dragstart', (e) => e.preventDefault());
  }

  // ——— Recherche ———

  basculerRecherche(): void {
    if (this.recherche) {
      this.recherche.remove();
      this.recherche = undefined;
      return;
    }
    const personnes = this.disp.places.map((p) => p.personne);
    const liste = h('ul', {});
    const champ = h('input', { type: 'search', placeholder: 'Prénom ou nom', 'aria-label': 'Chercher une personne', enterkeyhint: 'search' });
    const remplir = () => {
      const trouves = champ.value.trim() ? filtrerParNom(personnes, champ.value) : [];
      liste.replaceChildren(
        ...trouves.slice(0, 8).map((p) =>
          h('li', {}, h('button', { type: 'button', onclick: () => this.montrer(p.id) }, avatarPersonne(p), nomComplet(p) || 'Sans nom')),
        ),
      );
    };
    champ.addEventListener('input', remplir);
    champ.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.basculerRecherche();
      if (e.key === 'Enter') liste.querySelector('button')?.click();
    });
    this.recherche = h('div', { class: 'recherche-arbre' }, champ, liste);
    this.vue.append(this.recherche);
    champ.focus();
  }

  /** Centre la personne cherchée et la fait pulser. */
  private montrer(id: string): void {
    this.basculerRecherche();
    this.aller(this.surPersonne(id, Math.max(this.v.s, 1)));
    const n = this.noeuds.get(id);
    if (!n) return;
    n.classList.remove('pouls');
    void n.offsetWidth;
    n.classList.add('pouls');
    setTimeout(() => n.classList.remove('pouls'), 3400);
  }
}
