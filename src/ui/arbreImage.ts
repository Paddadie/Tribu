// Export de l'arbre global en image PNG (Réglages → Exporter l'arbre en image) : l'arbre de la cible choisie
// (cibleImage.ts) est redessiné sur un canvas, fond blanc, couleurs du thème clair. Niveau de détail (detailArbre.ts) :
// Base, dates en clair sous le nom, dates et lieux des unions, légende des traits ; Détaillé, les notes en plus, sous
// la personne ou en carte dans une marge. La géométrie vient de geometrieArbre.ts, la même que celle de l'écran, et
// tout le placement de detailArbre.ts ; seuls le pinceau et les couleurs sont propres à l'image.

import type { Disposition } from '../modele/arbreGlobal';
import { nomGroupe } from '../modele/deductions';
import { couleurFamille, initiales, nomComplet } from '../modele/liste';
import { boiteLigne, type MentionUnion } from '../modele/mentionsUnion';
import { estDecede } from '../modele/modele';
import { mettreEnPage } from '../modele/pageAmis';
import { estParentSansNom } from '../modele/parentSansNom';
import type { Donnees, Personne } from '../modele/types';
import {
  LIBELLES_REPERES,
  legende,
  LIGNE_DATE,
  PAD,
  placerNotes,
  TAILLE_NOTE,
  TAILLE_TITRE,
  texteNoeud,
  type NiveauDetail,
  type NotesPlacees,
  type Repere,
  type TexteNoeud,
} from './detailArbre';
import {
  calculerCadres,
  cerclesArbre,
  lieuxEtiquettes,
  mentionsArbre,
  obstaclesArbre,
  positions,
  R,
  traitsArbre,
  zoneBulle,
  type Cadre,
  type Trait,
  type ZoneBulle,
} from './geometrieArbre';
import { encoderPng } from './png';

type Positions = ReturnType<typeof positions>;

// Limites des canvas relevées par la bibliothèque canvas-size (jhildenbiddle.github.io/canvas-size, « Test Results ») :
// Safari iOS 9+ accepte 4 194 303 px de large mais 4096 × 4096 = 16 777 216 px de surface au plus ; Chrome Android,
// 32 767 ou 65 535 px de côté et 117 à 268 Mpx de surface. Au-delà, le canvas reste vide sans erreur. L'image est donc
// dessinée par bandes de PIXELS_BANDE puis assemblée par png.ts : seule la surface d'une bande compte pour le canvas.

/** Netteté visée (pixels de l'image par pixel du dessin) : les noms restent nets quand on zoome. */
export const ECHELLE_VISEE = 3;
/**
 * Netteté minimale, jamais réduite en silence : le plus petit texte (noms de famille, 10,5) y fait encore 16 px.
 * Pas ×2 : le secours sur un seul canvas (PIXELS_CANVAS) ne tient que ×1,56 pour la fixture.
 */
export const ECHELLE_MIN = 1.5;
/** Plus grand côté confortable : moins que le côté maximal du canvas de Chrome, et lisible par les visionneuses. */
export const COTE_MAX = 16384;
/** Pixels confortables au plus : 48 Mpx, la taille des photos des téléphones récents, que leur galerie sait ouvrir. */
export const PIXELS_MAX = 48_000_000;
/** Plus grand côté possible : celui du canvas de Chrome et de Firefox, une bande étant aussi large que l'image. */
export const COTE_LIMITE = 32767;
/** Pixels possibles au plus, pour un export raisonnable en temps et en mémoire sur téléphone. */
export const PIXELS_LIMITE = 100_000_000;
/** Surface d'une bande : bien sous la limite de Safari iOS, pour ménager la mémoire. */
export const PIXELS_BANDE = 4_000_000;
/** Secours sans bandes (CompressionStream absent ou en échec) : un seul canvas, dans la limite de Safari iOS. */
export const PIXELS_CANVAS = 4096 * 4096;
/** Bande du titre, au-dessus de l'arbre. */
const ENTETE = 56;
const POLICE = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Thème clair de base.css, figé : l'image ne dépend pas du thème de l'appareil. */
const COULEURS = {
  fond: '#ffffff',
  encre: '#1f2a27',
  secondaire: '#56635f',
  accent: '#2f6f5e',
  accentClair: '#dcebe5',
  accentTexte: '#1f5546',
  carte: '#ffffff',
  trait: '#aebcb7',
  traitEx: '#9aa4a0',
  /** Notes : ocre, pour ne se confondre avec aucun trait de parenté. */
  lien: '#b5822b',
  note: '#6e4c14',
  fondNote: '#fdf8ee',
  bordNote: '#ead9b6',
  pastels: ['#8fcfb8', '#f2b98a', '#aab0f0', '#f0a8c8', '#8fc3ec', '#f0a99c', '#d6c16f', '#b79de0', '#9ed67f', '#7fd0d6', '#e2a0e0', '#c8b48f'],
};

const pastel = (k: number) => COULEURS.pastels[k % 12];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `hex` mélangé à `avec` (part de `hex` entre 0 et 1), en #rrggbb : équivalent de color-mix de l'écran. */
export function melanger(hex: string, avec: string, part: number): string {
  const [a, b] = [rgb(hex), rgb(avec)];
  return (
    '#' +
    a
      .map((v, i) =>
        Math.round(v * part + b[i] * (1 - part))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** Teinte des traits et des textes : le pastel assombri, comme à l'écran. */
const teinte = (k: number) => melanger(pastel(k), COULEURS.encre, 0.62);
const teinteGroupe = (i: number) => teinte(i + 5);

export interface DimensionsImage {
  /** Taille du dessin, en unités de l'arbre (bande du titre comprise). */
  largeur: number;
  hauteur: number;
  /** Pixels de l'image par unité du dessin. */
  echelle: number;
  /** Taille de l'image en pixels. */
  pixelsL: number;
  pixelsH: number;
  /** Plus grande que COTE_MAX ou `pixelsMax`, pour ne pas descendre sous ECHELLE_MIN. */
  grande: boolean;
  /** Dans COTE_LIMITE et PIXELS_LIMITE : sinon, pas d'export (les noms ne resteraient pas lisibles). */
  possible: boolean;
}

/**
 * Taille de l'image : ×3 si possible, réduite pour tenir dans COTE_MAX de côté et `pixelsMax` de surface, mais
 * jamais sous ECHELLE_MIN : l'image dépasse alors ces plafonds (`grande`), jusqu'aux limites techniques (`possible`).
 */
export function dimensionsImage(largeur: number, hauteurArbre: number, pixelsMax = PIXELS_MAX): DimensionsImage {
  const hauteur = hauteurArbre + ENTETE;
  const confort = Math.min(ECHELLE_VISEE, COTE_MAX / Math.max(largeur, hauteur), Math.sqrt(pixelsMax / (largeur * hauteur)));
  const echelle = Math.max(confort, ECHELLE_MIN);
  const [pixelsL, pixelsH] = [Math.floor(largeur * echelle), Math.floor(hauteur * echelle)];
  const possible = Math.max(pixelsL, pixelsH) <= COTE_LIMITE && pixelsL * pixelsH <= PIXELS_LIMITE;
  return { largeur, hauteur, echelle, pixelsL, pixelsH, grande: confort < ECHELLE_MIN, possible };
}

/** Image trop grande pour rester lisible (voir ECHELLE_MIN) : l'export est refusé plutôt que flou. */
export class ImageTropGrande extends Error {}

/** Bandes horizontales (en pixels de l'image) de `pixelsBande` au plus, qui couvrent toute la hauteur sans se chevaucher. */
export function bandes(pixelsL: number, pixelsH: number, pixelsBande = PIXELS_BANDE): { y: number; h: number }[] {
  const pas = Math.max(1, Math.floor(pixelsBande / pixelsL));
  const liste: { y: number; h: number }[] = [];
  for (let y = 0; y < pixelsH; y += pas) liste.push({ y, h: Math.min(pas, pixelsH - y) });
  return liste;
}

/** Tout ce que l'image peint, calculé sans canvas : la taille annoncée et le dessin partent du même calcul. */
export interface MiseEnPage {
  pos: Positions;
  cadres: Cadre[];
  bulle: ZoneBulle | undefined;
  traits: Trait[];
  mentions: MentionUnion[];
  textes: Map<string, TexteNoeud>;
  notes: NotesPlacees;
  reperes: Repere[];
  /** Dessin entier, marges des notes comprises, sans la bande du titre. */
  largeur: number;
  hauteur: number;
}

export function miseEnPage(disp: Disposition, d: Donnees | undefined, moi: string, niveau: NiveauDetail, aujourdhui: Date): MiseEnPage {
  const pos = positions(disp);
  const cadres = calculerCadres(disp, pos.centres);
  const bulle = zoneBulle(disp, pos.centres, cadres);
  const traits = traitsArbre(disp, pos, bulle, moi);
  const mentions = d ? mentionsArbre(disp, pos, traits, cadres, d.unions, 'detail', moi, aujourdhui, true) : [];
  const textes = new Map(disp.places.map((pl) => [pl.personne.id, texteNoeud(pl.personne, pl.naissance === true)]));
  let notes: NotesPlacees = { sous: [], cartes: [], gauche: 0, droite: 0, hauteur: pos.hauteur };
  if (niveau === 'detail' && d) {
    const cercles = cerclesArbre(disp, pos, moi);
    const obstacles = obstaclesArbre(disp, pos, traits, cadres, cercles, true);
    obstacles.boites.push(...mentions.flatMap((m) => m.lignes.map(boiteLigne)));
    // La note se lit dans les données : la disposition peut dater d'avant (décalages gardés des générations souples).
    const fiches = new Map(d.personnes.map((p) => [p.id, p]));
    const aPlacer = disp.places
      .map((pl) => fiches.get(pl.personne.id) ?? pl.personne)
      .filter((p) => p.note?.trim() && !estParentSansNom(p))
      .map((p) => {
        const c = pos.centres.get(p.id)!;
        return { id: p.id, titre: nomComplet(p), texte: p.note, x: c.x, y: c.y, r: cercles.get(p.id)!.r, bas: c.y + textes.get(p.id)!.bas };
      });
    notes = placerNotes(aPlacer, [...pos.centres.values()], obstacles, pos.largeur, pos.hauteur);
  }
  const reperes = legende(traits, notes.cartes.length > 0);
  return {
    pos,
    cadres,
    bulle,
    traits,
    mentions,
    textes,
    notes,
    reperes,
    largeur: notes.gauche + pos.largeur + notes.droite,
    hauteur: Math.max(pos.hauteur, notes.hauteur),
  };
}

/**
 * Page de l'image : le dessin (titre compris) centré dans des marges blanches jusqu'au format `disp.format`, s'il
 * est donné ; `hauteur` sans la bande du titre, comme pour `dimensionsImage`.
 */
function page(disp: Disposition, mp: Pick<MiseEnPage, 'largeur' | 'hauteur'>): { largeur: number; hauteur: number; dx: number; dy: number } {
  const [l, h] = [mp.largeur, mp.hauteur + ENTETE];
  const f = disp.format;
  const dx = f && l / h < f ? (h * f - l) / 2 : 0;
  const dy = f && l / h > f ? (l / f - h) / 2 : 0;
  return { largeur: l + 2 * dx, hauteur: mp.hauteur + 2 * dy, dx, dy };
}

/**
 * Taille annoncée avant l'export, sans rien dessiner. Seul le niveau Détaillé l'agrandit (marges des notes) : il
 * demande alors les données et Moi.
 */
export function dimensionsArbre(disp: Disposition, d?: Donnees, moi = '', niveau: NiveauDetail = 'base', aujourdhui = new Date()): DimensionsImage {
  const mp = niveau === 'detail' && d ? miseEnPage(disp, d, moi, niveau, aujourdhui) : positions(disp);
  const { largeur, hauteur } = page(disp, mp);
  return dimensionsImage(largeur, hauteur);
}

/** Export d'un groupe d'amis : en lignes, Moi dans le cadre, au format d'une feuille paysage (pageAmis.ts). */
export function pageAmis(disp: Disposition, moi: string): Disposition {
  return mettreEnPage(disp, moi, (d) => {
    const p = positions(d);
    return p.largeur / (p.hauteur + ENTETE);
  });
}

/** Coupe un nom en deux lignes au plus, dans `max` pixels ; « … » si la fin ne tient pas. */
function lignesNom(ctx: CanvasRenderingContext2D, texte: string, max: number): string[] {
  const mots = texte.split(/[\s-]+/).filter(Boolean);
  const lignes: string[] = [];
  let courante = '';
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (courante && ctx.measureText(essai).width > max) {
      lignes.push(courante);
      courante = mot;
    } else courante = essai;
  }
  if (courante) lignes.push(courante);
  const gardees = lignes.slice(0, 2);
  if (lignes.length > 2) gardees[1] = `${gardees[1]}…`;
  return gardees.map((l) => {
    let t = l;
    while (t.length > 1 && ctx.measureText(t).width > max) t = `${t.slice(0, -2)}…`;
    return t;
  });
}

function dessinerTrait(ctx: CanvasRenderingContext2D, d: string, classe: string, lignee: number | undefined): void {
  const ex = classe.includes('ex');
  const ami = classe.includes('ami');
  const couple = classe.includes('couple');
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = ami || couple ? 2 : 1.5;
  ctx.strokeStyle = ami ? COULEURS.accent : ex ? COULEURS.traitEx : lignee !== undefined ? teinte(lignee) : COULEURS.trait;
  if (ami) {
    ctx.globalAlpha = 0.75;
    ctx.setLineDash([0.5, 6]);
  } else if (ex) ctx.setLineDash([0.1, 5]);
  else if (classe.includes('adoption')) {
    ctx.lineCap = 'butt';
    ctx.setLineDash([9, 5]);
  } else if (classe.includes('libre')) ctx.setLineDash([5, 4]);
  ctx.stroke(new Path2D(d));
  ctx.restore();
}

function dessinerNoeud(
  ctx: CanvasRenderingContext2D,
  p: Personne,
  x: number,
  y: number,
  couleur: string | undefined,
  moi: boolean,
  anneau: string | undefined,
  texte: TexteNoeud,
): void {
  const decede = estDecede(p);
  const sansNom = estParentSansNom(p);
  const fond = couleur ?? COULEURS.accentClair;
  if (moi) {
    ctx.beginPath();
    ctx.arc(x, y, R + 5, 0, Math.PI * 2);
    ctx.fillStyle = COULEURS.accent;
    ctx.fill();
  }
  if (anneau) {
    ctx.beginPath();
    ctx.arc(x, y, R + 4.5, 0, Math.PI * 2);
    ctx.fillStyle = anneau;
    ctx.fill();
  }
  if (moi || anneau) {
    ctx.beginPath();
    ctx.arc(x, y, R + 2, 0, Math.PI * 2);
    ctx.fillStyle = COULEURS.fond;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = decede ? melanger(fond, COULEURS.carte, 0.4) : fond;
  ctx.fill();
  ctx.fillStyle = decede ? COULEURS.secondaire : COULEURS.encre;
  ctx.font = `600 14px ${POLICE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sansNom ? '?' : initiales(p), x, y + 1);
  if (decede) {
    ctx.fillStyle = COULEURS.encre;
    ctx.font = `15px ${POLICE}`;
    ctx.fillText('†', x + R * 0.75, y - R * 0.85);
  }
  if (!sansNom) {
    ctx.fillStyle = COULEURS.encre;
    ctx.font = `13px ${POLICE}`;
    ctx.textBaseline = 'top';
    const lignes = lignesNom(ctx, texte.nom, 104);
    lignes.forEach((l, i) => ctx.fillText(l, x, y + R + 8 + i * 16));
    // « née X » puis les dates sous le nom, choisies par texteNoeud dans la place que SOUS_NOM réserve.
    let bas = y + R + 8 + lignes.length * 16 + 1;
    ctx.fillStyle = COULEURS.secondaire;
    if (texte.naissance) {
      ctx.font = `italic 11px ${POLICE}`;
      ctx.fillText(lignesNom(ctx, texte.naissance, 104)[0], x, bas);
      bas += 14;
    }
    ctx.font = `${texte.dates.taille}px ${POLICE}`;
    texte.dates.lignes.forEach((l, i) => ctx.fillText(l, x, bas + i * LIGNE_DATE));
  }
}

/** Échantillon de chaque style de trait, puis son nom : à droite de `fin`, de droite à gauche ; largeur prise. */
function peindreLegende(ctx: CanvasRenderingContext2D, reperes: Repere[], fin: number, y: number): number {
  ctx.font = `12px ${POLICE}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let x = fin;
  for (const r of [...reperes].reverse()) {
    const l = ctx.measureText(LIBELLES_REPERES[r]).width;
    x -= l;
    ctx.fillStyle = COULEURS.secondaire;
    ctx.fillText(LIBELLES_REPERES[r], x, y);
    x -= 28;
    const trait = `M ${x} ${y} H ${x + 22}`;
    if (r === 'note')
      peindreLien(ctx, [
        { x, y },
        { x: x + 22, y },
      ]);
    else dessinerTrait(ctx, trait, r === 'marie' ? 'couple' : r === 'libre' ? 'couple libre' : r === 'ex' ? 'couple ex' : 'adoption', undefined);
    x -= 18;
  }
  return fin - x;
}

/** Largeur de la légende, sans la peindre. */
function largeurLegende(ctx: CanvasRenderingContext2D, reperes: Repere[]): number {
  ctx.font = `12px ${POLICE}`;
  return reperes.reduce((s, r) => s + ctx.measureText(LIBELLES_REPERES[r]).width + 46, 0);
}

/** Trait de liaison d'une note, ocre, avec un point côté personne. */
function peindreLien(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = COULEURS.lien;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(points[0].x, points[0].y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function peindreNotes(ctx: CanvasRenderingContext2D, notes: NotesPlacees): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COULEURS.note;
  ctx.font = `${TAILLE_NOTE}px ${POLICE}`;
  for (const n of notes.sous) for (const l of n.lignes) ctx.fillText(l.texte, l.x, l.y);
  for (const c of notes.cartes) {
    peindreLien(ctx, c.lien);
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.l, c.h, 8);
    ctx.fillStyle = COULEURS.fondNote;
    ctx.fill();
    ctx.strokeStyle = COULEURS.bordNote;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = COULEURS.encre;
    ctx.font = `600 ${TAILLE_TITRE}px ${POLICE}`;
    ctx.fillText(c.titre, c.x + PAD, c.y + PAD + 10);
    ctx.fillStyle = COULEURS.note;
    ctx.font = `${TAILLE_NOTE}px ${POLICE}`;
    c.lignes.forEach((l, k) => ctx.fillText(l, c.x + PAD, c.y + PAD + 14 + 10 + k * LIGNE_DATE));
  }
}

/** Peint tout l'arbre, en unités du dessin, sur un contexte déjà mis à l'échelle (et décalé quand on peint une bande). */
function peindreArbre(ctx: CanvasRenderingContext2D, disp: Disposition, d: Donnees, moi: Personne, aujourdhui: Date, mp: MiseEnPage, titre: string): void {
  const { pos, cadres, bulle, traits } = mp;
  const largeur = mp.largeur;
  ctx.fillStyle = COULEURS.fond;
  ctx.fillRect(0, 0, largeur, mp.hauteur + ENTETE);

  // Titre, légende des traits si elle tient entre les deux, et date.
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COULEURS.encre;
  ctx.font = `700 20px ${POLICE}`;
  ctx.fillText(titre, 24, ENTETE / 2 + 4);
  const finTitre = 24 + ctx.measureText(titre).width;
  ctx.textAlign = 'right';
  ctx.fillStyle = COULEURS.secondaire;
  ctx.font = `14px ${POLICE}`;
  const date = aujourdhui.toLocaleDateString('fr-FR');
  ctx.fillText(date, largeur - 24, ENTETE / 2 + 4);
  const debutDate = largeur - 24 - ctx.measureText(date).width;
  if (mp.reperes.length && finTitre + 32 + largeurLegende(ctx, mp.reperes) <= debutDate - 24) peindreLegende(ctx, mp.reperes, debutDate - 24, ENTETE / 2 + 4);
  ctx.translate(mp.notes.gauche, ENTETE);

  if (bulle) {
    ctx.beginPath();
    ctx.roundRect(bulle.g, bulle.ha, bulle.dr - bulle.g, bulle.ba - bulle.ha, 28);
    ctx.fillStyle = melanger(COULEURS.accentClair, COULEURS.fond, 0.6);
    ctx.fill();
    ctx.fillStyle = COULEURS.accentTexte;
    ctx.font = `600 12px ${POLICE}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('T E S   A M I S', bulle.g + 18, bulle.ha + 22);
  }
  cadres.forEach((c, i) => {
    const couleur = teinteGroupe(i);
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.l, c.ha, 16);
    ctx.fillStyle = melanger(couleur, COULEURS.carte, 0.12);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = couleur;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const groupe = d.groupes.find((g) => g.id === c.groupe.id);
    ctx.fillStyle = couleur;
    ctx.font = `600 12px ${POLICE}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(groupe ? nomGroupe(d, groupe) : '', c.x + 12, c.y + 16);
    if (c.l > 150) {
      ctx.textAlign = 'right';
      ctx.fillStyle = COULEURS.secondaire;
      ctx.font = `12px ${POLICE}`;
      ctx.fillText(`${c.groupe.amis} ami${c.groupe.amis > 1 ? 's' : ''}`, c.x + c.l - 12, c.y + 16);
    }
  });

  // Traits et dates des unions, puis noms de famille, puis personnes, puis notes.
  for (const t of traits) dessinerTrait(ctx, t.dessin ?? t.d, t.classe, t.lignee);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const m of mp.mentions)
    for (const l of m.lignes) {
      ctx.fillStyle = m.ex ? COULEURS.traitEx : COULEURS.secondaire;
      ctx.font = `italic 600 ${l.taille}px ${POLICE}`;
      ctx.fillText(l.texte, l.x, l.y);
    }
  const lieux = lieuxEtiquettes(disp, pos, traits);
  for (const e of disp.etiquettes) {
    const c = lieux.get(e)!;
    ctx.fillStyle = e.lignee !== undefined ? teinte(e.lignee) : COULEURS.secondaire;
    ctx.font = `600 10.5px ${POLICE}`;
    ctx.textAlign = e.ancre === 'fin' ? 'right' : e.ancre === 'debut' ? 'left' : 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.texte.toLocaleUpperCase('fr').split('').join(' '), c.x, c.y + 8);
  }
  const rangs = new Map(disp.groupes.map((g, i) => [g.id, i]));
  const anneaux = new Map<string, string>();
  disp.groupes.forEach((g, i) => g.membres.forEach((m) => anneaux.set(m, teinteGroupe(i))));
  for (const a of disp.anneaux) {
    if (!rangs.has(a.groupe)) rangs.set(a.groupe, rangs.size);
    anneaux.set(a.id, teinteGroupe(rangs.get(a.groupe)!));
  }
  for (const pl of disp.places) {
    const c = pos.centres.get(pl.personne.id)!;
    const k = pl.lignee !== undefined ? pl.lignee : anneaux.has(pl.personne.id) ? undefined : couleurFamille(pl.personne, d);
    const couleur =
      pl.lignee !== undefined ? pastel(pl.lignee) : anneaux.has(pl.personne.id) ? anneaux.get(pl.personne.id) : k !== undefined ? pastel(k) : undefined;
    dessinerNoeud(ctx, pl.personne, c.x, c.y, couleur, pl.personne.id === moi.id, anneaux.get(pl.personne.id), mp.textes.get(pl.personne.id)!);
  }
  peindreNotes(ctx, mp.notes);
}

type Peindre = (ctx: CanvasRenderingContext2D) => void;

/** Un canvas qui dépasse les limites du navigateur reste vide (transparent) sans erreur : le fond blanc doit s'y lire. */
function estPeint(px: Uint8ClampedArray): boolean {
  return px[3] === 255 && px[px.length - 1] === 255;
}

/** Chemin principal : l'image entière, peinte bande par bande sur un seul petit canvas, et assemblée par encoderPng. */
async function pngParBandes(dim: DimensionsImage, peindre: Peindre): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = dim.pixelsL;
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas indisponible');
    function* peintes(ctx: CanvasRenderingContext2D) {
      for (const b of bandes(dim.pixelsL, dim.pixelsH)) {
        if (canvas.height !== b.h) canvas.height = b.h;
        // Décalage en pixels entiers : chaque bande retombe sur la même grille, sans couture visible.
        ctx.setTransform(dim.echelle, 0, 0, dim.echelle, 0, -b.y);
        peindre(ctx);
        const px = ctx.getImageData(0, 0, dim.pixelsL, b.h).data;
        if (!estPeint(px)) throw new Error('Bande vide');
        yield px;
      }
    }
    return await encoderPng(dim.pixelsL, dim.pixelsH, peintes(ctx));
  } finally {
    // Libère tout de suite la mémoire du canvas (Safari iOS plafonne la mémoire de tous les canvas de la page).
    canvas.width = canvas.height = 0;
  }
}

/** Secours : un seul canvas dans la limite de Safari iOS, encodé par le navigateur. */
async function pngUnCanvas(dim: DimensionsImage, peindre: Peindre): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = dim.pixelsL;
  canvas.height = dim.pixelsH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.scale(dim.echelle, dim.echelle);
  peindre(ctx);
  const coins = [ctx.getImageData(0, 0, 1, 1).data, ctx.getImageData(dim.pixelsL - 1, dim.pixelsH - 1, 1, 1).data];
  if (!coins.every(estPeint)) throw new Error('Canvas vide');
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error('Image impossible à créer');
  return blob;
}

/**
 * PNG de l'arbre autour de `moi`, à la taille de `dimensionsArbre` ; plus petit (PIXELS_CANVAS) si le navigateur ne sait
 * pas l'assembler par bandes. ImageTropGrande si l'une ou l'autre taille passerait sous ECHELLE_MIN.
 */
export async function arbrePng(disp: Disposition, d: Donnees, moi: Personne, aujourdhui: Date, titre: string, niveau: NiveauDetail = 'base'): Promise<Blob> {
  const mp = miseEnPage(disp, d, moi.id, niveau, aujourdhui);
  const pg = page(disp, mp);
  const dim = dimensionsImage(pg.largeur, pg.hauteur);
  if (!dim.possible) throw new ImageTropGrande();
  const peindre: Peindre = (ctx) => {
    if (pg.dx || pg.dy) {
      ctx.fillStyle = COULEURS.fond;
      ctx.fillRect(0, 0, pg.largeur, pg.hauteur + ENTETE);
      ctx.translate(pg.dx, pg.dy);
    }
    peindreArbre(ctx, disp, d, moi, aujourdhui, mp, titre);
  };
  if (typeof CompressionStream === 'function') {
    try {
      return await pngParBandes(dim, peindre);
    } catch {
      // On retombe sur le canvas unique, plus petit mais accepté partout.
    }
  }
  const secours = dimensionsImage(pg.largeur, pg.hauteur, PIXELS_CANVAS);
  if (secours.grande) throw new ImageTropGrande();
  return pngUnCanvas(secours, peindre);
}
