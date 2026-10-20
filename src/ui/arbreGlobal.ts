// Écran « Arbre » (#/arbre) : toutes les personnes reliées à « Moi », une ligne par génération, ses amis dans
// une bulle sous la famille (maquette A). On s'y déplace au doigt (glisser, pincer, double toucher) ou à la
// souris (molette) ; toucher une personne ouvre sa fiche. Le placement vient de `disposerArbre` (modèle testé).

import { disposerArbre, type Disposition, type GroupeDessine, type Point } from '../modele/arbreGlobal';
import { nomGroupe } from '../modele/deductions';
import { filtrerParNom, nomComplet } from '../modele/liste';
import { enregistrerParentSansNom, estVirtuel } from '../modele/parentSansNom';
import { ficheMoi } from '../modele/reglages';
import type { Personne } from '../modele/types';
import { LIGNE_EN_PLUS, noeud } from './arbre';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { avatarPersonne } from './lignePersonne';
import { lienRetour } from './navigation';

const SVG = 'http://www.w3.org/2000/svg';
/** Pixels entre deux places voisines, et entre deux générations (à l'échelle 1). */
const PAS_X = 80;
const PAS_Y = 140;
/** Rayon de l'avatar, largeur d'un nœud. */
const R = 19;
const LARG = 76;
/** Sous l'avatar, le nom (sur 2 lignes si besoin) et l'année : un trait qui part d'un parent seul commence en dessous. */
const SOUS_NOM = R + 40 + LIGNE_EN_PLUS;
const MARGE = 70;
const ECHELLE_MIN = 0.2;
const ECHELLE_MAX = 3;
/** En dessous de cette échelle, les noms s'effacent : il ne reste que les pastilles. */
const ECHELLE_LOIN = 0.6;

/** Cadre d'un groupe d'amis, en pixels : de l'étiquette (haut) au nom de la dernière ligne (bas). */
interface Cadre {
  groupe: GroupeDessine;
  x: number;
  y: number;
  l: number;
  ha: number;
}
/** Dans la bulle : le cadre commence 56 px au-dessus du centre de l'avatar, la zone « TES AMIS » 34 px plus haut. */
const HAUT_CADRE = R + 56;
const HAUT_ZONE = 34;
const MARGE_CADRE = 8;
/** Hauteur d'une étiquette de famille (sa ligne de texte). */
const HAUT_ETIQUETTE = 16;

/** Une famille de la liste « Familles » : nom, couleur de lignée, effectif, zone occupée (pixels) et personne la plus haute, qui pulse à l'arrivée. */
interface FamilleListee {
  nom: string;
  lignee: number;
  n: number;
  zone: Zone;
  cible: string;
}
interface Zone {
  x: number;
  y: number;
  l: number;
  ha: number;
}

interface Vue {
  tx: number;
  ty: number;
  s: number;
}

/** Vue choisie par sa puce (pleine tant qu'on ne s'en écarte pas) ; aucune après un déplacement ou un autre saut. */
type VueActive = 'toi' | 'tout' | undefined;

/** Zoom et position gardés pendant la session : au retour d'une fiche, l'arbre est tel qu'on l'a laissé. */
let vueGardee: Vue | undefined;
let activeGardee: VueActive;
/** Vues quittées par un saut (Toi, Tout, Familles, Amis, recherche) : « Revenir » les reprend une à une. */
const pile: { v: Vue; active: VueActive }[] = [];
const PILE_MAX = 30;
let astuceMontree = false;

/** Douze couleurs pastel de CSS (--c0 à --c11) : une par nom de famille ; les groupes d'amis reprennent la série en décalé. */
const couleur = (k: number) => `var(--c${k % 12})`;
/** Teinte des traits et des textes : la couleur pastel assombrie, pour rester lisible sur le fond. */
const couleurTrait = (k: number) => `color-mix(in srgb, ${couleur(k)} 62%, var(--encre))`;
const couleurGroupe = (i: number) => couleurTrait(i + 5);

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
  private cadres: Cadre[] = [];
  private familles: FamilleListee[] = [];
  /** Noms de famille posés sur le calque (centre et bas en pixels, effectif de la lignée, largeur mesurée une fois). */
  private readonly etiquettes: { el: HTMLElement; x: number; bas: number; poids: number; l?: number }[] = [];
  /** Échelle pour laquelle les chevauchements d'étiquettes ont été réglés (0 : de près, toutes visibles). */
  private echelleEtiquettes = 0;
  /** Liste ouverte par « Familles » ou « Amis », posée au-dessus des commandes : elle en glisse et s'y replie (CSS). */
  private readonly feuille = h('div', { class: 'feuille-arbre' });
  private feuilleOuverte: 'familles' | 'amis' | undefined;
  private readonly puces = new Map<string, HTMLElement>();
  private readonly puceToi: HTMLElement;
  private readonly puceTout: HTMLElement;
  private readonly revenir: HTMLElement;
  private active: VueActive;
  /** Barre des puces, en bas : le dessin passe dessous, « Tout » cadre l'arbre au-dessus. */
  private readonly barreBas: HTMLElement;

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
      if (pl.lignee !== undefined) {
        n.classList.add('lignee');
        n.style.setProperty('--cc', couleur(pl.lignee));
      }
      this.noeuds.set(pl.personne.id, n);
      return n;
    });

    this.cadres = this.calculerCadres();
    disp.groupes.forEach((g, i) => {
      for (const m of g.membres) {
        const n = this.noeuds.get(m);
        n?.classList.add('membre-groupe');
        n?.style.setProperty('--cg', couleurGroupe(i));
      }
    });
    // Petit anneau de groupe (UX-21) : la couleur du cadre si le groupe est dans la bulle, sinon la suite de la série.
    const rangs = new Map(disp.groupes.map((g, i) => [g.id, i]));
    for (const a of disp.anneaux) {
      if (!rangs.has(a.groupe)) rangs.set(a.groupe, rangs.size);
      const anneau = h('span', { class: 'anneau-groupe', 'aria-hidden': 'true' });
      anneau.style.setProperty('--cg', couleurGroupe(rangs.get(a.groupe)!));
      this.noeuds.get(a.id)?.querySelector('.avatar')?.append(anneau);
    }
    this.familles = this.calculerFamilles();
    this.calque = h('div', { class: 'calque' }, this.traits(px), ...this.legendes(px), ...noeuds);
    this.calque.addEventListener('pointerdown', () => this.fermerFeuille());
    this.calque.style.width = `${this.largeur}px`;
    this.calque.style.height = `${this.hauteur}px`;
    const astuce = !astuceMontree && h('div', { class: 'astuce-arbre', 'aria-hidden': 'true' }, 'Glisse pour te déplacer, pince pour zoomer');
    this.puceToi = h('button', { type: 'button', class: 'puce-arbre', onclick: () => this.sauter(this.surPersonne(moi.id, 1), 'toi', [moi.id]) }, 'Toi');
    this.puceTout = h('button', { type: 'button', class: 'puce-arbre', onclick: () => this.sauter(this.toutVoir(), 'tout') }, 'Tout');
    this.revenir = h(
      'button',
      { type: 'button', class: 'rond-arbre revenir', 'aria-label': 'Revenir à la vue d’avant', hidden: true, onclick: () => this.revenirEnArriere() },
      icone('revenir', 22),
    );
    this.barreBas = h(
      'div',
      { class: 'commandes-arbre gauche' },
      this.puceToi,
      this.puceTout,
      this.familles.length > 0 && this.puceListe('familles', 'Familles'),
      this.cadres.length > 0 && this.puceListe('amis', 'Amis'),
    );
    this.vue = h(
      'div',
      { class: 'vue-arbre' },
      this.calque,
      astuce,
      this.feuille,
      this.barreBas,
      h(
        'div',
        { class: 'commandes-arbre droite' },
        this.revenir,
        h('button', { type: 'button', class: 'rond-arbre', 'aria-label': 'Zoomer', onclick: () => this.zoomCentre(1.5) }, icone('plus', 22)),
        h('button', { type: 'button', class: 'rond-arbre', 'aria-label': 'Dézoomer', onclick: () => this.zoomCentre(1 / 1.5) }, icone('moins', 22)),
      ),
    );
    this.marquer(vueGardee ? activeGardee : 'toi');
    if (astuce) {
      astuceMontree = true;
      setTimeout(() => astuce.classList.add('cachee'), 3500);
    }
    this.gestes();
    // Taille connue une fois l'écran dans la page : première vue (gardée, sinon centrée sur Moi), puis bornes
    // à chaque changement de taille (rotation). Rien à taille nulle (tests).
    const observateur = new ResizeObserver(() => {
      // Écran quitté : l'observateur se déconnecte (l'écran suivant ne le garde pas en vie).
      if (this.pret && !this.vue.isConnected) return observateur.disconnect();
      if (this.vue.clientWidth === 0) return;
      if (!this.pret) {
        this.pret = true;
        this.v = vueGardee ? { ...vueGardee } : this.surPersonne(moi.id, 1);
      }
      this.appliquer();
    });
    observateur.observe(this.vue);
  }

  // ——— Dessin ———

  private traits(px: (p: Point) => Point): SVGSVGElement {
    const s = document.createElementNS(SVG, 'svg');
    s.setAttribute('class', 'traits-arbre');
    s.setAttribute('width', String(this.largeur));
    s.setAttribute('height', String(this.hauteur));
    s.setAttribute('aria-hidden', 'true');
    const trait = (d: string, classe: string, lignee?: number) => {
      const c = document.createElementNS(SVG, 'path');
      c.setAttribute('class', classe);
      c.setAttribute('d', d);
      if (lignee !== undefined) c.setAttribute('style', `stroke: ${couleurTrait(lignee)}`);
      s.append(c);
    };
    const centre = (id: string) => this.centres.get(id)!;

    // Bulle des amis, derrière tout le reste : la zone « TES AMIS » et, dedans, un cadre par groupe.
    let hautBulle: Point | undefined;
    const zoneBulle = this.zoneBulle();
    if (zoneBulle) {
      const { g, dr, ha, ba } = zoneBulle;
      const zone = document.createElementNS(SVG, 'rect');
      for (const [k, val] of Object.entries({ x: g, y: ha, width: dr - g, height: ba - ha, rx: 28, class: 'zone-amis' })) zone.setAttribute(k, String(val));
      const titre = document.createElementNS(SVG, 'text');
      for (const [k, val] of Object.entries({ x: g + 18, y: ha + 22, class: 'titre-amis' })) titre.setAttribute(k, String(val));
      titre.textContent = 'TES AMIS';
      s.append(zone, titre);
      for (const c of this.cadres) {
        const r = document.createElementNS(SVG, 'rect');
        for (const [k, val] of Object.entries({ x: c.x, y: c.y, width: c.l, height: c.ha, rx: 16, class: 'cadre-groupe' })) r.setAttribute(k, String(val));
        r.setAttribute('style', `--cc: ${couleurGroupe(this.cadres.indexOf(c))}`);
        s.append(r);
      }
      hautBulle = { x: (g + dr) / 2, y: ha };
    }

    for (const c of this.disp.couples) {
      const [a, b] = [centre(c.a), centre(c.b)].sort((p, q) => p.x - q.x);
      // Même ligne : trait droit, même quand l'écart est grand (chaîne d'ex). Lignes différentes : courbe.
      const d = a.y === b.y ? `M ${a.x + R} ${a.y} H ${b.x - R}` : `M ${a.x} ${a.y - R} C ${a.x} ${a.y - R - 46}, ${b.x} ${b.y - R - 46}, ${b.x} ${b.y - R}`;
      // Marié(e) : trait plein ; en couple : pointillé court ; séparé(e) : gris.
      trait(d, `trait couple${c.marie ? '' : ' libre'}${c.separe ? ' ex' : ''}`, c.separe ? undefined : c.lignee);
    }

    for (const br of this.disp.branches) {
      const bus = px({ x: 0, y: br.bus }).y;
      // Un parent inconnu n'a ni nom ni trait : seul le trait commun relie les frères et sœurs.
      const origines = br.origines.filter((o) => !o.inconnu).map((o) => ({ ...px(o), seul: o.parent !== undefined }));
      const enfants = br.enfants.map((e) => ({ ...px(e), adoptif: e.adoptif }));
      const classe = enfants.every((e) => e.adoptif) ? 'trait pointille' : 'trait';
      for (const o of origines) trait(`M ${o.x} ${o.seul ? o.y + SOUS_NOM : o.y} V ${bus}`, classe, br.lignee);
      const xs = [...origines, ...enfants].map((p) => p.x);
      if (Math.max(...xs) - Math.min(...xs) > 0.5) trait(`M ${Math.min(...xs)} ${bus} H ${Math.max(...xs)}`, classe, br.lignee);
      for (const e of enfants) trait(`M ${e.x} ${bus} V ${e.y - R - 3}`, e.adoptif ? 'trait pointille' : 'trait', br.lignee);
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

  /** Un cadre par groupe : le rectangle qui entoure les membres et leurs familles dans la bulle. */
  private calculerCadres(): Cadre[] {
    return this.disp.groupes.flatMap((groupe) => {
      const c = groupe.ids.map((id) => this.centres.get(id)).filter((p): p is Point => p !== undefined);
      if (c.length === 0) return [];
      const x = Math.min(...c.map((p) => p.x)) - LARG / 2 - MARGE_CADRE;
      const y = Math.min(...c.map((p) => p.y)) - HAUT_CADRE;
      return [
        { groupe, x, y, l: Math.max(...c.map((p) => p.x)) + LARG / 2 + MARGE_CADRE - x, ha: Math.max(...c.map((p) => p.y)) + SOUS_NOM + MARGE_CADRE - y },
      ];
    });
  }

  /** Une entrée par lignée de l'arbre principal (par ordre alphabétique), nommée d'après son étiquette « Famille X ». */
  private calculerFamilles(): FamilleListee[] {
    const parLignee = new Map<number, (Point & { id: string })[]>();
    const noms = new Map<number, Map<string, number>>();
    for (const p of this.disp.places) {
      if (p.lignee === undefined || estVirtuel(p.personne.id)) continue;
      parLignee.set(p.lignee, [...(parLignee.get(p.lignee) ?? []), { ...this.centres.get(p.personne.id)!, id: p.personne.id }]);
      // Sans étiquette (lignée dont la racine a des parents), le nom le plus répandu de la lignée la nomme.
      const nom = p.personne.nom.trim();
      if (nom) {
        const compte = noms.get(p.lignee) ?? new Map<string, number>();
        compte.set(nom, (compte.get(nom) ?? 0) + 1);
        noms.set(p.lignee, compte);
      }
    }
    const plusRepandu = (lignee: number) => [...(noms.get(lignee) ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0];
    return [...parLignee]
      .map(([lignee, pts]) => {
        const x = Math.min(...pts.map((p) => p.x)) - LARG / 2;
        const y = Math.min(...pts.map((p) => p.y)) - R - 24;
        const l = Math.max(...pts.map((p) => p.x)) + LARG / 2 - x;
        const nom =
          this.disp.etiquettes.find((e) => e.lignee === lignee)?.texte ?? (plusRepandu(lignee) ? `Famille ${plusRepandu(lignee)}` : `Famille ${lignee + 1}`);
        // Cible : sur la ligne la plus haute, la personne la plus proche du milieu de la famille.
        const haut = pts.filter((p) => p.y === Math.min(...pts.map((q) => q.y)));
        const cible = haut.reduce((a, b) => (Math.abs(b.x - (x + l / 2)) < Math.abs(a.x - (x + l / 2)) ? b : a)).id;
        return { nom, lignee, n: pts.length, cible, zone: { x, y, l, ha: Math.max(...pts.map((p) => p.y)) + SOUS_NOM - y } };
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  // ——— Listes « Familles » et « Amis » ———

  private puceListe(quoi: 'familles' | 'amis', texte: string): HTMLElement {
    const b = h('button', { type: 'button', class: 'puce-arbre', 'aria-expanded': 'false', onclick: () => this.basculerFeuille(quoi) }, texte);
    this.puces.set(quoi, b);
    return b;
  }

  private fermerFeuille(): void {
    this.feuille.classList.remove('ouverte');
    this.feuilleOuverte = undefined;
    for (const b of this.puces.values()) b.setAttribute('aria-expanded', 'false');
  }

  private basculerFeuille(quoi: 'familles' | 'amis'): void {
    const etait = this.feuilleOuverte;
    this.fermerFeuille();
    if (etait === quoi) return;
    this.feuilleOuverte = quoi;
    this.puces.get(quoi)?.setAttribute('aria-expanded', 'true');
    const ligne = (pastille: HTMLElement, nom: string, detail: string, zone: Zone, cibles: string[]) =>
      h(
        'button',
        { type: 'button', class: 'ligne-feuille', onclick: () => this.sauter(this.surZone(zone), undefined, cibles) },
        pastille,
        h('span', { class: 'nom-feuille' }, nom),
        h('small', {}, detail),
      );
    const lignes =
      quoi === 'familles'
        ? this.familles.map((f) => {
            const pastille = h('span', { class: 'pastille-feuille' });
            pastille.style.background = couleur(f.lignee);
            return ligne(pastille, f.nom, `${f.n} pers.`, f.zone, [f.cible]);
          })
        : this.cadres.map((c, i) => {
            const d = lireDonnees();
            const pastille = h('span', { class: 'pastille-feuille anneau' });
            pastille.style.borderColor = couleurGroupe(i);
            return ligne(
              pastille,
              nomGroupe(
                d,
                d.groupes.find((g) => g.id === c.groupe.id)!,
              ),
              `${c.groupe.amis} ami${c.groupe.amis > 1 ? 's' : ''}`,
              c,
              c.groupe.membres,
            );
          });
    this.feuille.replaceChildren(h('h2', {}, quoi === 'familles' ? 'Familles' : 'Groupes d’amis'), ...lignes);
    this.feuille.classList.add('ouverte');
  }

  /** Vue qui montre toute la zone (jusqu'à l'échelle 1,2), un peu au-dessus du centre pour laisser la place aux commandes. */
  private surZone(z: Zone): Vue {
    const marge = 40;
    const s = borne(Math.min(this.vue.clientWidth / (z.l + marge), (this.vue.clientHeight * 0.75) / (z.ha + marge), 1.2), this.echelleMin(), ECHELLE_MAX);
    return { s, tx: this.vue.clientWidth / 2 - (z.x + z.l / 2) * s, ty: this.vue.clientHeight * 0.42 - (z.y + z.ha / 2) * s };
  }

  /** Zone « TES AMIS » : autour de tous les cadres et de toute personne de la bulle ; absente sans bulle. */
  private zoneBulle(): { g: number; dr: number; ha: number; ba: number } | undefined {
    const pts = this.disp.places.filter((p) => p.bulle).map((p) => this.centres.get(p.personne.id)!);
    if (pts.length === 0) return undefined;
    const g = Math.min(...pts.map((p) => p.x - LARG / 2), ...this.cadres.map((c) => c.x)) - 14;
    const dr = Math.max(...pts.map((p) => p.x + LARG / 2), ...this.cadres.map((c) => c.x + c.l)) + 14;
    const ha = Math.min(...pts.map((p) => p.y - HAUT_CADRE), ...this.cadres.map((c) => c.y)) - HAUT_ZONE;
    const ba = Math.max(...pts.map((p) => p.y + SOUS_NOM + MARGE_CADRE), ...this.cadres.map((c) => c.y + c.ha)) + 14;
    return { g, dr, ha, ba };
  }

  /** Textes posés sur le dessin : nom et effectif de chaque groupe, nom de famille au-dessus de chaque lignée. */
  private legendes(px: (p: Point) => Point): HTMLElement[] {
    const placer = (el: HTMLElement, x: number, y: number) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      return el;
    };
    const d = lireDonnees();
    const bulle = this.zoneBulle();
    const titres = this.cadres.map((c) => {
      const nom = nomGroupe(
        d,
        d.groupes.find((g) => g.id === c.groupe.id)!,
      );
      const el = h(
        'div',
        { class: 'cadre-titre' },
        h('span', { class: 'cadre-nom' }, nom),
        c.l > 150 && h('span', { class: 'cadre-n' }, `${c.groupe.amis} ami${c.groupe.amis > 1 ? 's' : ''}`),
      );
      el.style.width = `${c.l - 24}px`;
      el.style.setProperty('--cc', couleurGroupe(this.cadres.indexOf(c)));
      return placer(el, c.x + 12, c.y + 8);
    });
    const familles = this.disp.etiquettes.map((e) => {
      const c = px(e);
      // Une fratrie reliée par un trait commun (parents non renseignés) : le nom se met au-dessus du trait, pas dessous.
      let haut = c.y - R - 24;
      for (const br of e.fratrie ? this.disp.branches : []) {
        const bus = px({ x: 0, y: br.bus }).y;
        const xs = br.enfants.map((f) => px(f).x);
        if (bus >= c.y - R - 24 || bus < c.y - PAS_Y || !br.enfants.some((f) => px(f).y === c.y)) continue;
        if (c.x >= Math.min(...xs) - 1 && c.x <= Math.max(...xs) + 1) haut = Math.min(haut, bus - 24);
      }
      const el = placer(h('div', { class: 'etiquette-famille' }, e.texte), c.x, haut);
      if (e.lignee !== undefined) el.style.setProperty('--cc', couleurTrait(e.lignee));
      // Dans la bulle, de loin, les titres des groupes suffisent.
      if (bulle && c.y > bulle.ha) el.classList.add('dans-bulle');
      const poids = this.disp.places.filter((p) => e.lignee !== undefined && p.lignee === e.lignee).length;
      this.etiquettes.push({ el, x: c.x, bas: haut + HAUT_ETIQUETTE, poids });
      return el;
    });
    return [...titres, ...familles];
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

  /** Hauteur où l'arbre se voit en entier : au-dessus de la barre des puces. */
  private hauteurUtile(): number {
    return this.vue.clientHeight - this.barreBas.offsetHeight;
  }

  /** Échelle qui cadre tout l'arbre (jamais au-delà de 1). */
  private echelleTout(): number {
    return Math.min(this.vue.clientWidth / this.largeur, this.hauteurUtile() / this.hauteur, 1);
  }

  /** On dézoome jusqu'à ECHELLE_MIN, ou plus loin si c'est ce qu'il faut pour voir tout l'arbre (UX-16). */
  private echelleMin(): number {
    return Math.min(ECHELLE_MIN, Math.max(0.02, this.echelleTout()));
  }

  private borner(v: Vue): Vue {
    const l = this.vue.clientWidth;
    const ha = this.vue.clientHeight;
    const s = borne(v.s, this.echelleMin(), ECHELLE_MAX);
    // Toujours un bout d'arbre au milieu de l'écran : on ne peut pas le perdre de vue.
    return { s, tx: borne(v.tx, l / 2 - this.largeur * s, l / 2), ty: borne(v.ty, ha / 2 - this.hauteur * s, ha / 2) };
  }

  private appliquer(): void {
    this.v = this.borner(this.v);
    this.calque.style.transform = `translate(${this.v.tx}px, ${this.v.ty}px) scale(${this.v.s})`;
    this.calque.style.setProperty('--s', String(this.v.s));
    this.vue.classList.toggle('loin', this.v.s < ECHELLE_LOIN);
    this.eviterChevauchements();
    vueGardee = { ...this.v };
  }

  /**
   * De loin, les noms de famille gardent leur taille à l'écran (CSS) : ceux qui en chevaucheraient un autre se
   * masquent, en gardant d'abord les familles les plus nombreuses. De près, ils sont tous là.
   */
  private eviterChevauchements(): void {
    const s = this.v.s < ECHELLE_LOIN ? this.v.s : 0;
    if (s === this.echelleEtiquettes) return;
    this.echelleEtiquettes = s;
    const gardees: { g: number; d: number; ha: number; ba: number }[] = [];
    for (const e of [...this.etiquettes].filter((x) => !x.el.classList.contains('dans-bulle')).sort((a, b) => b.poids - a.poids)) {
      e.l ??= e.el.offsetWidth || undefined;
      // À l'écran, de loin : la largeur mesurée, le bas de l'étiquette reste à sa place (origine du changement d'échelle).
      const r = { g: e.x * s - (e.l ?? 0) / 2, d: e.x * s + (e.l ?? 0) / 2, ba: e.bas * s, ha: e.bas * s - HAUT_ETIQUETTE };
      const masquee = s > 0 && gardees.some((o) => r.g < o.d + 8 && o.g < r.d + 8 && r.ha < o.ba + 4 && o.ha < r.ba + 4);
      e.el.classList.toggle('masquee', masquee);
      if (!masquee) gardees.push(r);
    }
  }

  /** Vue qui met la personne au milieu de l'écran (un peu au-dessus, la place des commandes en bas). */
  private surPersonne(id: string, s: number): Vue {
    const c = this.centres.get(id)!;
    return { s, tx: this.vue.clientWidth / 2 - c.x * s, ty: this.vue.clientHeight * 0.42 - c.y * s };
  }

  /** Tout l'arbre, centré au-dessus de la barre des puces. */
  private toutVoir(): Vue {
    const s = borne(this.echelleTout(), this.echelleMin(), ECHELLE_MAX);
    return { s, tx: (this.vue.clientWidth - this.largeur * s) / 2, ty: (this.hauteurUtile() - this.hauteur * s) / 2 };
  }

  private zoomAutour(x: number, y: number, facteur: number, depuis: Vue = this.v): Vue {
    const s = borne(depuis.s * facteur, this.echelleMin(), ECHELLE_MAX);
    const k = s / depuis.s;
    return { s, tx: x - (x - depuis.tx) * k, ty: y - (y - depuis.ty) * k };
  }

  private zoomCentre(facteur: number): void {
    this.libre();
    this.aller(this.zoomAutour(this.vue.clientWidth / 2, this.vue.clientHeight / 2, facteur));
  }

  /** Saut vers une vue (puce, liste, recherche) : la vue quittée va sur la pile, les cibles pulsent à l'arrivée. */
  private sauter(cible: Vue, active?: VueActive, cibles: string[] = []): void {
    const fin = this.borner(cible);
    const v = this.v;
    const ailleurs = Math.abs(fin.s - v.s) > v.s * 1e-3 || Math.abs(fin.tx - v.tx) > 1 || Math.abs(fin.ty - v.ty) > 1;
    if (ailleurs) {
      pile.push({ v: { ...v }, active: this.active });
      if (pile.length > PILE_MAX) pile.shift();
    }
    this.marquer(active);
    this.aller(fin);
    this.pulser(cibles);
  }

  private revenirEnArriere(): void {
    const avant = pile.pop();
    if (!avant) return;
    this.marquer(avant.active);
    this.aller(avant.v);
  }

  /** Un geste ou le zoom écarte de la vue choisie : plus aucune puce pleine, et la feuille se replie. */
  private libre(): void {
    this.fermerFeuille();
    if (this.active) this.marquer(undefined);
  }

  /** Puce pleine pour la vue active ; « Revenir » n'apparaît que s'il y a une vue où revenir. */
  private marquer(active: VueActive): void {
    this.active = activeGardee = active;
    for (const [puce, quoi] of [
      [this.puceToi, 'toi'],
      [this.puceTout, 'tout'],
    ] as const) {
      puce.classList.toggle('accent', active === quoi);
      puce.setAttribute('aria-pressed', String(active === quoi));
    }
    this.revenir.hidden = pile.length === 0;
  }

  private pulser(ids: string[]): void {
    for (const id of ids) {
      const n = this.noeuds.get(id);
      if (!n) continue;
      n.classList.remove('pouls');
      void n.offsetWidth;
      n.classList.add('pouls');
      setTimeout(() => n.classList.remove('pouls'), 3400);
    }
  }

  /** Va vers une vue, en glissant (320 ms) sauf si les animations sont réduites. */
  private aller(cible: Vue): void {
    this.fermerFeuille();
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
    const horsCarte = (e: Event) => (e.target as Element).closest('.commandes-arbre, .recherche-arbre, .feuille-arbre');

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
        this.libre();
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
          this.libre();
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
          this.libre();
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
    // Toucher un parent « ? » l'enregistre, puis ouvre sa vraie fiche : la route n'écrit jamais.
    this.vue.addEventListener('click', (e) => {
      const lien = (e.target as Element).closest<HTMLAnchorElement>('a.noeud');
      const id = lien?.dataset.id;
      if (!id || !estVirtuel(id)) return;
      e.preventDefault();
      const creation = enregistrerParentSansNom(lireDonnees(), id);
      if (!creation) return;
      modifierDonnees(() => creation.donnees);
      location.hash = `#/personne/${creation.personne.id}`;
    });
    // Double clic à la souris seulement : au doigt, le double toucher est géré plus haut (Android enverrait les deux).
    this.vue.addEventListener('dblclick', (e) => {
      if (typePointeur !== 'mouse' || horsCarte(e) || (e.target as Element).closest('.noeud')) return;
      const p = local(e);
      this.libre();
      this.aller(this.zoomAutour(p.x, p.y, 1.8));
    });
    this.vue.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        cancelAnimationFrame(this.animation);
        this.libre();
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
    const personnes = this.disp.places.map((p) => p.personne).filter((p) => !estVirtuel(p.id));
    const liste = h('ul', {});
    const champ = h('input', { type: 'search', placeholder: 'Prénom ou nom', 'aria-label': 'Chercher une personne', enterkeyhint: 'search' });
    const remplir = () => {
      const trouves = champ.value.trim() ? filtrerParNom(personnes, champ.value) : [];
      liste.replaceChildren(
        ...trouves
          .slice(0, 8)
          .map((p) => h('li', {}, h('button', { type: 'button', onclick: () => this.montrer(p.id) }, avatarPersonne(p), nomComplet(p) || 'Sans nom'))),
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

  /**
   * Centre la personne cherchée et la fait pulser. Le focus passe sur son nœud (un lien vers sa fiche) :
   * la recherche sert d'accès aux personnes au clavier et au lecteur d'écran (A11Y-02).
   */
  private montrer(id: string): void {
    this.basculerRecherche();
    this.sauter(this.surPersonne(id, Math.max(this.v.s, 1)), undefined, [id]);
    this.noeuds.get(id)?.focus({ preventScroll: true });
  }
}
