// Écran « Arbre » (#/arbre) : toutes les personnes reliées à « Moi », une ligne par génération, ses amis dans
// une bulle sous la famille (maquette A). On s'y déplace au doigt (glisser, pincer, double toucher) ou à la
// souris (molette) ; toucher une personne ouvre sa fiche. Le placement vient de `disposerArbre` (modèle testé).

import { disposerArbre, type Disposition, type Point } from '../modele/arbreGlobal';
import { nomGroupe } from '../modele/deductions';
import { prochesDeFamille } from '../modele/filtres';
import { couleurFamille, filtrerParNom, nomComplet, simplifier } from '../modele/liste';
import { enregistrerParentSansNom, estVirtuel } from '../modele/parentSansNom';
import { ficheMoi } from '../modele/reglages';
import type { Personne } from '../modele/types';
import { noeud } from './arbre';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { avatarPersonne } from './lignePersonne';
import {
  calculerCadres,
  hautEtiquette,
  LARG,
  positions,
  R,
  SOUS_NOM,
  traitsArbre,
  zoneBulle,
  type Cadre,
} from './geometrieArbre';
import { lienRetour } from './navigation';

const SVG = 'http://www.w3.org/2000/svg';
const ECHELLE_MIN = 0.2;
const ECHELLE_MAX = 3;
/** En dessous de cette échelle, les noms s'effacent : il ne reste que les pastilles. */
const ECHELLE_LOIN = 0.6;

/** Hauteur d'une étiquette de famille (sa ligne de texte). */
const HAUT_ETIQUETTE = 16;

/** Une famille de la liste « Familles » : nom, couleur de lignée, effectif, zone occupée (pixels) et personne la plus haute, qui pulse à l'arrivée. */
interface FamilleListee extends ResumeFamille {
  zone: Zone;
  cibles: string[];
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

/** Une famille = un nom de famille et tous les placés qui le portent : clé (nom simplifié), nom affiché, couleur, effectif. */
export interface ResumeFamille {
  nom: string;
  cle: string;
  couleur: number | undefined;
  n: number;
  /** Les placés qui portent ce nom. */
  ids: string[];
  /** Vrai si tous les porteurs sont dans la bulle des amis : ni lien ni nom commun avec l'arbre de la famille. */
  amis: boolean;
}

/** Une entrée par nom de famille présent sur l'arbre (amis compris), par ordre alphabétique. */
export function resumesFamilles(disp: Disposition): ResumeFamille[] {
  const parNom = new Map<string, ResumeFamille>();
  for (const p of disp.places) {
    const nom = p.personne.nom.trim();
    if (!nom || estVirtuel(p.personne.id)) continue;
    const cle = simplifier(nom);
    const f = parNom.get(cle) ?? { nom: `Famille ${nom}`, cle, couleur: couleurFamille(p.personne), n: 0, ids: [], amis: true };
    f.n++;
    f.ids.push(p.personne.id);
    if (!p.bulle) f.amis = false;
    parNom.set(cle, f);
  }
  return [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Zone sur laquelle l'arbre s'ouvre (pop-ups de l'accueil) : une famille par son nom simplifié, un groupe par son identifiant. */
export interface FocusArbre {
  quoi: 'famille' | 'groupe';
  cle: string;
}

/** Zoom et position gardés pendant la session : au retour d'une fiche, l'arbre est tel qu'on l'a laissé. */
let vueGardee: Vue | undefined;
let activeGardee: VueActive;
/** Vues quittées par un saut (Toi, Tout, Familles, Amis, recherche) : « Revenir » les reprend une à une. */
const pile: { v: Vue; active: VueActive }[] = [];
const PILE_MAX = 30;
let astuceMontree = false;

/** Douze couleurs pastel de CSS (--c0 à --c11) : une par nom de famille ; les groupes d'amis reprennent la série en décalé. */
export const couleur = (k: number) => `var(--c${k % 12})`;
/** Teinte des traits et des textes : la couleur pastel assombrie, pour rester lisible sur le fond. */
const couleurTrait = (k: number) => `color-mix(in srgb, ${couleur(k)} 62%, var(--encre))`;
const couleurGroupe = (i: number) => couleurTrait(i + 5);

const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** `feuille` : liste ouverte d'emblée (raccourci « Familles » de l'accueil, route #/arbre/familles). */
export function ecranArbre(feuille?: 'familles', focus?: FocusArbre): HTMLElement {
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
  const carte = new Carte(disp, moi, focus);
  loupe.addEventListener('click', () => carte.basculerRecherche());
  if (feuille) carte.ouvrirFeuille(feuille);
  return h('div', { class: 'ecran ecran-arbre' }, barre, carte.vue);
}

/** Zone déplaçable : un calque (traits + nœuds) transformé par translation et échelle. */
class Carte {
  readonly vue: HTMLElement;
  private readonly calque: HTMLElement;
  private readonly noeuds = new Map<string, HTMLElement>();
  private readonly centres: Map<string, Point>;
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

  constructor(disp: Disposition, moi: Personne, focus?: FocusArbre) {
    this.disp = disp;
    this.moi = moi;
    const pos = positions(disp);
    this.largeur = pos.largeur;
    this.hauteur = pos.hauteur;
    const px = pos.px;
    this.centres = pos.centres;

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

    this.cadres = calculerCadres(disp, this.centres);
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
      this.familles.some((f) => !f.amis) && this.puceListe('familles', 'Familles'),
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
        this.appliquer();
        // Arrivée depuis une pop-up de l'accueil : saut sur la zone (la vue de départ va sur la pile de « Revenir »).
        const cap = this.zoneDe(focus);
        if (cap) this.sauter(this.surZone(cap.zone), undefined, cap.cibles);
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
      if (lignee !== undefined) c.style.stroke = couleurTrait(lignee);
      s.append(c);
    };
    // Bulle des amis, derrière tout le reste : la zone « TES AMIS » et, dedans, un cadre par groupe.
    const bulle = zoneBulle(this.disp, this.centres, this.cadres);
    if (bulle) {
      const { g, dr, ha, ba } = bulle;
      const zone = document.createElementNS(SVG, 'rect');
      for (const [k, val] of Object.entries({ x: g, y: ha, width: dr - g, height: ba - ha, rx: 28, class: 'zone-amis' })) zone.setAttribute(k, String(val));
      const titre = document.createElementNS(SVG, 'text');
      for (const [k, val] of Object.entries({ x: g + 18, y: ha + 22, class: 'titre-amis' })) titre.setAttribute(k, String(val));
      titre.textContent = 'TES AMIS';
      s.append(zone, titre);
      for (const c of this.cadres) {
        const r = document.createElementNS(SVG, 'rect');
        for (const [k, val] of Object.entries({ x: c.x, y: c.y, width: c.l, height: c.ha, rx: 16, class: 'cadre-groupe' })) r.setAttribute(k, String(val));
        r.style.setProperty('--cc', couleurGroupe(this.cadres.indexOf(c)));
        s.append(r);
      }
    }

    for (const t of traitsArbre(this.disp, { largeur: this.largeur, hauteur: this.hauteur, px, centres: this.centres }, bulle, this.moi.id)) trait(t.d, t.classe, t.lignee);
    return s;
  }

  /** Une entrée par nom de famille, avec la zone qui contient tous ceux qui le portent. */
  private calculerFamilles(): FamilleListee[] {
    const membres = new Map<string, (Point & { id: string })[]>();
    for (const p of this.disp.places) {
      const nom = p.personne.nom.trim();
      const c = this.centres.get(p.personne.id);
      if (!nom || !c || estVirtuel(p.personne.id)) continue;
      const cle = simplifier(nom);
      membres.set(cle, [...(membres.get(cle) ?? []), { ...c, id: p.personne.id }]);
    }
    return resumesFamilles(this.disp)
      .filter((r) => membres.has(r.cle))
      .map((r) => {
        const porteurs = membres.get(r.cle)!;
        // Le zoom englobe aussi les proches directs de nom différent (enfants, conjoint, ex avec enfant).
        const proches = prochesDeFamille(lireDonnees(), new Set(porteurs.map((p) => p.id)));
        const pts = [...porteurs, ...this.disp.places.filter((p) => proches.has(p.personne.id) && this.centres.has(p.personne.id)).map((p) => ({ ...this.centres.get(p.personne.id)!, id: p.personne.id }))];
        const x = Math.min(...pts.map((p) => p.x)) - LARG / 2;
        const y = Math.min(...pts.map((p) => p.y)) - R - 24;
        const l = Math.max(...pts.map((p) => p.x)) + LARG / 2 - x;
        return { ...r, cibles: pts.map((p) => p.id), zone: { x, y, l, ha: Math.max(...pts.map((p) => p.y)) + SOUS_NOM - y } };
      });
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

  /** Ouvre la liste si elle existe et n'est pas déjà ouverte. */
  ouvrirFeuille(quoi: 'familles' | 'amis'): void {
    if (this.puces.has(quoi) && this.feuilleOuverte !== quoi) this.basculerFeuille(quoi);
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
        ? this.familles.filter((f) => !f.amis).map((f) => {
            const pastille = h('span', { class: 'pastille-feuille' });
            if (f.couleur !== undefined) pastille.style.background = couleur(f.couleur);
            return ligne(pastille, f.nom, `${f.n} pers.`, f.zone, f.cibles);
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

  private zoneDe(focus?: FocusArbre): { zone: Zone; cibles: string[] } | undefined {
    if (focus?.quoi === 'famille') {
      const f = this.familles.find((x) => x.cle === focus.cle);
      return f && { zone: f.zone, cibles: f.cibles };
    }
    const c = focus && this.cadres.find((x) => x.groupe.id === focus.cle);
    return c && { zone: c, cibles: c.groupe.membres };
  }

  /** Vue qui montre toute la zone au plus gros possible (marges fixes en pixels), centrée au-dessus de la barre des puces. */
  private surZone(z: Zone): Vue {
    const margeX = 72;
    const margeY = 140;
    const utile = this.hauteurUtile();
    const s = borne(Math.min((this.vue.clientWidth - margeX) / z.l, (utile - margeY) / z.ha), this.echelleMin(), ECHELLE_MAX);
    return { s, tx: this.vue.clientWidth / 2 - (z.x + z.l / 2) * s, ty: (utile + 16) / 2 - (z.y + z.ha / 2) * s };
  }

  /** Zone « TES AMIS » : autour de tous les cadres et de toute personne de la bulle ; absente sans bulle. */
  /** Textes posés sur le dessin : nom et effectif de chaque groupe, nom de famille au-dessus de chaque lignée. */
  private legendes(px: (p: Point) => Point): HTMLElement[] {
    const placer = (el: HTMLElement, x: number, y: number) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      return el;
    };
    const d = lireDonnees();
    const bulle = zoneBulle(this.disp, this.centres, this.cadres);
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
      const haut = hautEtiquette(this.disp, px, e);
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
