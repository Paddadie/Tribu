// @vitest-environment happy-dom
// Référence du dessin « Famille proche » sur les fixtures fictives de tests/fixtures/famille-proche :
// pour chaque cas et chaque largeur de téléphone, (a) chaque personne du périmètre minimal a un nœud,
// (b) aucune boîte de nœud ou de libellé n'en chevauche une autre, (c) le dessin tient dans la largeur
// (sauf si une rangée insécable est trop peuplée : `defileAdmis`), (d) le dessin et la section « Parents et fratrie »
// montrent les mêmes personnes, et personne d'autre que le périmètre.
// happy-dom ne mesure pas le texte : la largeur des noms est estimée (CHASSE px par caractère).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fratrie, liensEnfants, liensParents, conjoint } from '../modele/deductions';
import { familleProche } from '../modele/familleProche';
import { importerJson } from '../modele/stockage';
import type { Donnees } from '../modele/types';
import { verifier } from '../modele/verification';
import { dessinFoyer } from './arbre';

const DOSSIER = join(__dirname, '../../tests/fixtures/famille-proche');
interface Cas {
  fichier: string;
  titre: string;
  centre: string;
  moi: string;
}
const CAS: Cas[] = JSON.parse(readFileSync(join(DOSSIER, 'cas.json'), 'utf-8'));
const lire = (c: Cas): Donnees => importerJson(readFileSync(join(DOSSIER, c.fichier), 'utf-8'));

/** Largeur de la sonde du dessin, mesurée dans Edge, pour chaque largeur de téléphone (gouttières et marges de la carte ôtées). */
const BUDGETS: Record<number, number> = { 320: 254, 360: 294, 390: 324 };
/** En dessous, le texte (12 px) devient illisible. */
const ZOOM_MIN = 0.85;
/** Largeur moyenne d'un caractère du nom (12 px, demi-gras). */
const CHASSE = 6.6;

/** Périmètre minimal : parents, frères, sœurs, demis et l'autre parent de chacun, conjoint actuel, enfants et leur autre parent. */
function perimetre(d: Donnees, id: string): Set<string> {
  const ids = new Set<string>();
  const parents = liensParents(d, id).map((l) => l.personne.id);
  parents.forEach((p) => ids.add(p));
  const { freresSoeurs, demis } = fratrie(d, id);
  freresSoeurs.forEach((p) => ids.add(p.id));
  for (const demi of demis) {
    ids.add(demi.id);
    for (const l of liensParents(d, demi.id)) if (!parents.includes(l.personne.id)) ids.add(l.personne.id);
  }
  const c = conjoint(d, id);
  if (c) ids.add(c.personne.id);
  for (const { personne: enfant } of liensEnfants(d, id)) {
    ids.add(enfant.id);
    for (const l of liensParents(d, enfant.id)) if (l.personne.id !== id) ids.add(l.personne.id);
  }
  return ids;
}

/** Personnes de la section « Parents et fratrie » de la fiche (mêmes fonctions que fiche.ts). */
function listeParentsFratrie(d: Donnees, id: string): string[] {
  const { freresSoeurs, demis } = fratrie(d, id);
  return [...liensParents(d, id).map((l) => l.personne.id), ...freresSoeurs.map((p) => p.id), ...demis.map((p) => p.id)];
}

interface Boite {
  id: string;
  quoi: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Geometrie {
  ids: string[];
  boites: Boite[];
  zoom: number;
  /** Bandes qui défilent (contenu plus large que la bande). */
  defilements: number;
  /** Nœuds hors de la largeur (ou hors de la partie montrée d'une bande). */
  hors: string[];
  largeur: number;
}

let largeurSonde = 0;
/** Rappels des faux ResizeObserver, à lancer une fois le dessin dans la page. */
let enAttente: (() => void)[] = [];
beforeAll(() => {
  // Le dessin attend sa largeur : un faux ResizeObserver la donne dès qu'on le lui demande.
  globalThis.ResizeObserver = class {
    constructor(private rappel: ResizeObserverCallback) {}
    observe() {
      enAttente.push(() => this.rappel([], this as unknown as ResizeObserver));
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('sonde') ? largeurSonde : 0;
    },
  });
});
afterEach(() => document.body.replaceChildren());

const px = (v: string) => Number.parseFloat(v) || 0;

/** Dessine la fiche du cas à la largeur donnée et relève les boîtes (avatar, nom, années) de chaque nœud. */
function geometrie(c: Cas, largeur: number): Geometrie {
  const d = lire(c);
  largeurSonde = largeur;
  const carte = dessinFoyer(familleProche(d, c.centre, c.moi));
  document.body.append(carte);
  enAttente.forEach((f) => f());
  enAttente = [];
  const arbre = carte.querySelector<HTMLElement>('.arbre')!;
  const zoom = Number(arbre.style.zoom || 1);
  const boites: Boite[] = [];
  const hors: string[] = [];
  const ids: string[] = [];
  let defilements = 0;
  for (const bande of arbre.querySelectorAll<HTMLElement>('.defile')) {
    const interieur = bande.firstElementChild as HTMLElement;
    if (px(interieur.style.width) > px(bande.style.width) + 1) defilements++;
  }
  for (const n of arbre.querySelectorAll<HTMLElement>('.noeud')) {
    const id = n.classList.contains('ici') ? c.centre : n.classList.contains('manque') ? '+parent' : (n.getAttribute('href') ?? '').replace('#/personne/', '');
    ids.push(id);
    const bande = n.closest<HTMLElement>('.defile');
    const dx = bande ? px(bande.style.left) : 0;
    const dy = bande ? px(bande.style.top) : 0;
    const larg = px(n.style.width);
    const cx = px(n.style.left) + larg / 2 + dx;
    const haut = px(n.style.top) + dy;
    const ici = n.classList.contains('ici');
    const av = ici ? 52 : 38;
    const nom = n.querySelector('.nom')?.textContent ?? '';
    const chasse = ici ? CHASSE * (14 / 12) : CHASSE;
    const mots = nom.split(/(?<=[-\s])/);
    const plusLong = Math.max(0, ...mots.map((m) => m.trim().length * chasse));
    const total = nom.length * chasse;
    const lNom = Math.min(104, Math.max(plusLong, Math.min(total, larg)));
    const lignes = nom ? (total <= larg ? 1 : 2) : 0;
    const an = n.querySelector('.an')?.textContent ?? '';
    let y = haut;
    const ajoute = (quoi: string, w: number, h: number) => {
      boites.push({ id, quoi, x: (cx - w / 2) * zoom, y: y * zoom, w: w * zoom, h: h * zoom });
      y += h + 4;
    };
    ajoute('avatar', av, av);
    if (lignes) ajoute('nom', lNom, lignes * (ici ? 18 : 16));
    if (an) {
      y -= 4;
      ajoute('an', an.length * CHASSE, 14);
    }
    // Visible si l'avatar, le nom et les dates tiennent tous dans la largeur (et dans la partie montrée de la bande).
    const demi = Math.max(av, lNom, an.length * CHASSE) / 2;
    const g = (cx - demi) * zoom;
    const dr = (cx + demi) * zoom;
    const visible = bande ? cx - dx - demi >= -1 && cx - dx + demi <= px(bande.style.width) + 1 : true;
    if (!visible || g < -1 || dr > largeur + 1) hors.push(id);
  }
  return { ids, boites, zoom, defilements, hors, largeur };
}

function chevauchements(g: Geometrie): string[] {
  const res: string[] = [];
  for (let i = 0; i < g.boites.length; i++)
    for (let j = i + 1; j < g.boites.length; j++) {
      const [a, b] = [g.boites[i], g.boites[j]];
      // Tout le dessin défile d'un bloc : même hors de la partie montrée, deux nœuds ne se chevauchent pas.
      if (a.id === b.id) continue;
      const l = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (l > 1 && h > 1) res.push(`${a.id}.${a.quoi} × ${b.id}.${b.quoi}`);
    }
  return res;
}

/**
 * Défilement admis (DECISIONS.md, 21/10/2026) : une rangée qu'on ne replie pas compte au moins 5 personnes (4 sous
 * 280 px de dessin) : les parents avec leurs autres partenaires, ou la personne avec son conjoint et ses co-parents.
 */
function defileAdmis(c: Cas, budget: number): boolean {
  const f = familleProche(lire(c), c.centre, c.moi);
  const seuil = budget < 280 ? 4 : 5;
  const r0 = f.couples.reduce((s, K) => s + K.membres.length + Number(K.manque), 0) + f.autresCouples.filter((a) => a.autre).length;
  const r1 = 1 + Number(!!f.conjoint) + f.partenaires.length;
  return r0 >= seuil || r1 >= seuil;
}

describe('fixtures « Famille proche »', () => {
  it.each(CAS.map((c) => [c.fichier, c] as const))('%s : sauvegarde valide, dates cohérentes', (_, c) => {
    const d = lire(c);
    expect(d.personnes.some((p) => p.id === c.centre)).toBe(true);
    expect(d.personnes.some((p) => p.id === c.moi)).toBe(true);
    expect(verifier(d, new Date('2026-10-21')).dates).toEqual([]);
  });
});

describe('dessin « Famille proche » (référence)', () => {
  for (const c of CAS)
    for (const largeur of Object.keys(BUDGETS).map(Number)) {
      const budget = BUDGETS[largeur];
      const test = (_critere: string, nom: string, corps: () => void) => it(nom, corps);
      describe(`${c.fichier} en ${largeur}`, () => {
        test('a', '(a) chaque personne du périmètre a un nœud', () => {
          const d = lire(c);
          const g = geometrie(c, budget);
          const manquants = [...perimetre(d, c.centre)].filter((id) => !g.ids.includes(id));
          expect(manquants).toEqual([]);
        });
        test('b', '(b) aucun chevauchement de nœuds ou de libellés', () => {
          expect(chevauchements(geometrie(c, budget))).toEqual([]);
        });
        test('c', '(c) tient dans la largeur', () => {
          const g = geometrie(c, budget);
          if (defileAdmis(c, budget)) return;
          expect({ zoom: g.zoom >= ZOOM_MIN, defilements: g.defilements, hors: g.hors }).toEqual({ zoom: true, defilements: 0, hors: [] });
        });
        test('d', '(d) cohérent avec « Parents et fratrie », personne hors périmètre', () => {
          const d = lire(c);
          const g = geometrie(c, budget);
          const absentsDuDessin = listeParentsFratrie(d, c.centre).filter((id) => !g.ids.includes(id));
          const peri = perimetre(d, c.centre);
          const enTrop = g.ids.filter((id) => id !== c.centre && id !== '+parent' && !peri.has(id));
          expect({ absentsDuDessin, enTrop }).toEqual({ absentsDuDessin: [], enTrop: [] });
        });
      });
    }
});
