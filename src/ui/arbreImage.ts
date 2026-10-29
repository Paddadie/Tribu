// Export de l'arbre global en image PNG (Réglages → Exporter l'arbre en image) : tout l'arbre est redessiné sur un
// canvas, fond blanc, couleurs du thème clair, années de naissance et de décès sous le nom. La géométrie vient de geometrieArbre.ts, la même
// que celle de l'écran ; seuls le pinceau et les couleurs sont propres à l'image.

import type { Disposition } from '../modele/arbreGlobal';
import { nomGroupe } from '../modele/deductions';
import { annees } from '../modele/familleProche';
import { couleurFamille, initiales, mentionNaissance, prenomOuNom } from '../modele/liste';
import { estDecede } from '../modele/modele';
import { estParentSansNom } from '../modele/parentSansNom';
import type { Donnees, Personne } from '../modele/types';
import { calculerCadres, hautEtiquette, positions, R, traitsArbre, zoneBulle } from './geometrieArbre';

/** Plus grand côté de l'image : au-delà, les navigateurs mobiles refusent ou déforment le canvas. */
export const COTE_MAX = 4096;
/** Netteté visée (pixels de l'image par pixel du dessin). */
const ECHELLE_VISEE = 2;
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
}

/** Taille de l'image : ×2 si possible, réduite pour que le plus grand côté ne dépasse pas COTE_MAX. */
export function dimensionsImage(largeur: number, hauteurArbre: number): DimensionsImage {
  const hauteur = hauteurArbre + ENTETE;
  const echelle = Math.min(ECHELLE_VISEE, COTE_MAX / Math.max(largeur, hauteur));
  return { largeur, hauteur, echelle, pixelsL: Math.round(largeur * echelle), pixelsH: Math.round(hauteur * echelle) };
}

/** Taille annoncée avant l'export, sans rien dessiner. */
export function dimensionsArbre(disp: Disposition): DimensionsImage {
  const { largeur, hauteur } = positions(disp);
  return dimensionsImage(largeur, hauteur);
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
  avecNaissance: boolean,
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
    const lignes = lignesNom(ctx, prenomOuNom(p), 104);
    lignes.forEach((l, i) => ctx.fillText(l, x, y + R + 8 + i * 16));
    // « née X » puis les années sous le nom : la place existe déjà (SOUS_NOM la réserve, comme à l'écran).
    let bas = y + R + 8 + lignes.length * 16 + 1;
    const naissance = avecNaissance ? mentionNaissance(p) : undefined;
    ctx.fillStyle = COULEURS.secondaire;
    if (naissance) {
      ctx.font = `italic 11px ${POLICE}`;
      ctx.fillText(lignesNom(ctx, naissance, 104)[0], x, bas);
      bas += 14;
    }
    const an = annees(p);
    if (an) {
      ctx.font = `11px ${POLICE}`;
      ctx.fillText(an, x, bas);
    }
  }
}

/** Dessine tout l'arbre sur le canvas (déjà à la taille de `dimensionsArbre`). */
export function dessinerArbreImage(canvas: HTMLCanvasElement, disp: Disposition, d: Donnees, moi: Personne, aujourdhui: Date): void {
  const pos = positions(disp);
  const dim = dimensionsImage(pos.largeur, pos.hauteur);
  canvas.width = dim.pixelsL;
  canvas.height = dim.pixelsH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.scale(dim.echelle, dim.echelle);
  ctx.fillStyle = COULEURS.fond;
  ctx.fillRect(0, 0, dim.largeur, dim.hauteur);

  // Titre et date.
  const titre = [moi.prenom, moi.nom].filter(Boolean).join(' ');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COULEURS.encre;
  ctx.font = `700 20px ${POLICE}`;
  ctx.fillText(`Arbre de ${titre}`, 24, ENTETE / 2 + 4);
  ctx.textAlign = 'right';
  ctx.fillStyle = COULEURS.secondaire;
  ctx.font = `14px ${POLICE}`;
  ctx.fillText(aujourdhui.toLocaleDateString('fr-FR'), dim.largeur - 24, ENTETE / 2 + 4);
  ctx.translate(0, ENTETE);

  const cadres = calculerCadres(disp, pos.centres);
  const bulle = zoneBulle(disp, pos.centres, cadres);
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

  // Traits, puis noms de famille, puis personnes.
  for (const t of traitsArbre(disp, pos, bulle, moi.id)) dessinerTrait(ctx, t.d, t.classe, t.lignee);
  for (const e of disp.etiquettes) {
    const c = pos.px(e);
    ctx.fillStyle = e.lignee !== undefined ? teinte(e.lignee) : COULEURS.secondaire;
    ctx.font = `600 10.5px ${POLICE}`;
    ctx.textAlign = e.ancre === 'fin' ? 'right' : e.ancre === 'debut' ? 'left' : 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.texte.toLocaleUpperCase('fr').split('').join(' '), c.x, hautEtiquette(disp, pos.px, e) + 8);
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
    dessinerNoeud(ctx, pl.personne, c.x, c.y, couleur, pl.personne.id === moi.id, anneaux.get(pl.personne.id), pl.naissance === true);
  }
}

/** PNG de l'arbre autour de `moi`. */
export async function arbrePng(disp: Disposition, d: Donnees, moi: Personne, aujourdhui: Date): Promise<Blob> {
  const canvas = document.createElement('canvas');
  dessinerArbreImage(canvas, disp, d, moi, aujourdhui);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Image impossible à créer');
  return blob;
}

export const NOM_FICHIER_ARBRE = (jour: Date) => `tribu-arbre-${jour.toISOString().slice(0, 10)}.png`;
