// Niveau de détail de l'export PNG : dates sous le nom, légende, notes sous la personne ou en carte reliée, sur des
// familles fictives ; aucune note ni aucun trait de liaison sur un avatar, un trait, un nom ou une autre note.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID_MOI } from '../modele/anonymiser';
import { disposerArbre } from '../modele/arbreGlobal';
import { boiteLigne, coupe, largeurTexte, segmentsDe, type Boite, type Cercle, type Segment } from '../modele/mentionsUnion';
import { dupontel, famillesDeReference } from '../modele/test/familles';
import type { Donnees } from '../modele/types';
import { miseEnPage, type MiseEnPage } from './arbreImage';
import {
  CARTE,
  couper,
  datesSousNom,
  legende,
  lignesDuNom,
  NOTE_LIGNES,
  placerNotes,
  TAILLE_ANNEES,
  TAILLE_DATE,
  TAILLE_NOTE,
  texteNoeud,
} from './detailArbre';
import { boiteEtiquette, boiteNom, cerclesArbre, LARG, lieuxEtiquettes, positions, R, SOUS_NOM } from './geometrieArbre';

const auj = new Date(2026, 10, 3);
const fixture: Donnees = JSON.parse(readFileSync(new URL('../modele/fixtures/arbre-anonyme.json', import.meta.url), 'utf-8'));

const COURTE = 'Tient la boulangerie.';
const LONGUE =
  'A grandi au bord de la mer, puis a tenu pendant trente ans la quincaillerie du bourg avec son frère. ' +
  'Joue de l’accordéon aux mariages de la famille et garde les albums de photos de tout le monde.\n' +
  'Lui demander la recette du far aux pruneaux, et le nom du bateau de son grand-père.';
const MOYENNE = 'Parrain de la petite dernière ; vit à la campagne avec ses chèvres et ses deux chiens.';

describe('dates sous le nom', () => {
  it('naissance puis décès en clair, chaque ligne dans la largeur d’une case', () => {
    const d = datesSousNom({ naissance: '1950-03-12', deces: '2010-05-03' }, 40);
    expect(d).toEqual({ lignes: ['12 mars 1950', '† 3 mai 2010'], taille: TAILLE_DATE });
  });
  it('mois abrégé si le mois en entier déborde', () => {
    const d = datesSousNom({ naissance: '1938-09-28', deces: '2019-11-30' }, 40);
    expect(d.lignes.every((l) => largeurTexte(l, TAILLE_DATE) <= LARG)).toBe(true);
    expect(d.lignes.join(' ')).toMatch(/1938.*2019/);
  });
  it('années seules quand les fiches n’ont que l’année, ou que la place manque', () => {
    expect(datesSousNom({ naissance: '1950', deces: '2010' }, 40)).toEqual({ lignes: ['1950–2010'], taille: TAILLE_ANNEES });
    expect(datesSousNom({ naissance: '1950-03-12', deces: '2010-07-03' }, 14).taille).toBe(TAILLE_ANNEES);
    expect(datesSousNom({}, 40).lignes).toEqual([]);
  });
  it('décédée sans date : « † ? »', () => {
    expect(datesSousNom({ naissance: '1950-03-12', decede: true }, 40).lignes).toEqual(['12 mars 1950', '† ?']);
  });
  it('le texte du nœud ne dépasse jamais la place réservée sous l’avatar', () => {
    const p = {
      id: 'x',
      prenom: 'Ombeline-Bérengère Lisandre-Ysaure',
      nom: 'Fontanel',
      nomNaissance: 'Rousset',
      sexe: 'F' as const,
      naissance: '1950-03-12',
      deces: '2010-07-03',
      note: '',
    };
    expect(lignesDuNom(p.prenom)).toBe(2);
    const t = texteNoeud(p, true);
    expect(t.naissance).toBe('née Rousset');
    expect(t.bas).toBeLessThanOrEqual(SOUS_NOM);
  });
});

describe('couper', () => {
  it('garde les paragraphes et coupe un mot trop long', () => {
    const l = couper('un deux trois\nquatre', 1000, 10);
    expect(l).toEqual(['un deux trois', 'quatre']);
    const mot = couper('anticonstitutionnellement', 40, 10);
    expect(mot.length).toBeGreaterThan(1);
    expect(mot.join('')).toBe('anticonstitutionnellement');
    expect(mot.every((x) => largeurTexte(x, 10) <= 40)).toBe(true);
  });
});

describe('légende', () => {
  it('seulement les styles présents, dans l’ordre', () => {
    expect(legende([{ classe: 'trait couple ex' }, { classe: 'trait' }, { classe: 'trait couple' }], false)).toEqual(['marie', 'ex']);
    expect(legende([{ classe: 'trait adoption' }, { classe: 'trait couple libre' }], true)).toEqual(['libre', 'adoption', 'note']);
  });
});

describe('placerNotes, une personne seule', () => {
  const vide = { cercles: [{ x: 300, y: 100, r: R }], segments: [], boites: [] };
  const note = (texte: string, x = 300) => ({ id: 'a', titre: 'Léon Fontanel', texte, x, y: 100, r: R, bas: 100 + 60 });
  it('note courte sous la personne, sur deux lignes au plus', () => {
    const n = placerNotes([note(COURTE)], [{ x: 300, y: 100 }], vide, 600, 400);
    expect(n.cartes).toEqual([]);
    expect(n.sous[0].lignes.length).toBeLessThanOrEqual(NOTE_LIGNES);
    expect(n.sous[0].lignes[0].y).toBeGreaterThan(160);
    expect([n.gauche, n.droite]).toEqual([0, 0]);
  });
  it('note longue en carte du côté de la personne, reliée par un trait', () => {
    const d = placerNotes([note(LONGUE, 400)], [{ x: 400, y: 100 }], vide, 600, 400);
    expect(d.cartes[0]).toMatchObject({ cote: 'd', l: CARTE });
    expect(d.cartes[0].x).toBeGreaterThan(600);
    expect(d.droite).toBeGreaterThan(0);
    const g = placerNotes([note(LONGUE, 100)], [{ x: 100, y: 100 }], { ...vide, cercles: [{ x: 100, y: 100, r: R }] }, 600, 400);
    expect(g.cartes[0].cote).toBe('g');
    expect(g.cartes[0].x + g.cartes[0].l).toBeLessThan(0);
    // Personne au bord : le trait part droit de l'avatar.
    expect(g.cartes[0].lien[0]).toEqual({ x: 100 - R - 4, y: 100 });
    expect(g.gauche).toBeGreaterThan(0);
  });
  it('la hauteur grandit pour une carte qui dépasse le bas de l’arbre', () => {
    const n = placerNotes([{ ...note(LONGUE, 400), y: 380, bas: 440 }], [{ x: 400, y: 380 }], { ...vide, cercles: [{ x: 400, y: 380, r: R }] }, 600, 400);
    expect(n.hauteur).toBeGreaterThanOrEqual(n.cartes[0].y + n.cartes[0].h);
  });
});

// --- Sur de vrais arbres fictifs ---

const touche = (c: Cercle, b: Boite) => Math.hypot(c.x - Math.max(b.g, Math.min(c.x, b.d)), c.y - Math.max(b.h, Math.min(c.y, b.b))) < c.r;
const recouvre = (a: Boite, b: Boite) => a.g < b.d && b.g < a.d && a.h < b.b && b.h < a.b;
const fine = (s: Segment): Boite => ({ g: Math.min(s.x1, s.x2), h: Math.min(s.y1, s.y2), d: Math.max(s.x1, s.x2), b: Math.max(s.y1, s.y2) });
const droit = (s: Segment) => s.x1 === s.x2 || s.y1 === s.y2;
const confondus = (a: Segment, b: Segment) =>
  droit(b) && droit(a) && recouvre(elargir(fine(a), 0.9), elargir(fine(b), 0.9)) && (a.x1 === a.x2) === (b.x1 === b.x2);
const elargir = (b: Boite, m: number): Boite => ({ g: b.g - m, h: b.h - m, d: b.d + m, b: b.b + m });

/** Ce que les notes et leurs traits recouvrent, en mots ; vide si tout est lisible. */
function fautesNotes(mp: MiseEnPage, disp: ReturnType<typeof disposerArbre>, moi: string): string[] {
  const { pos, traits, notes } = mp;
  const cercles = cerclesArbre(disp, pos, moi);
  const segments = traits.flatMap((t) => segmentsDe(t.d));
  const lieux = lieuxEtiquettes(disp, pos, traits);
  const etiquettes = disp.etiquettes.map((e) => boiteEtiquette(disp, pos.px, e, lieux.get(e)));
  const mentions = mp.mentions.flatMap((m) => m.lignes.map(boiteLigne));
  const fautes: string[] = [];
  const lignes = notes.sous.flatMap((n) => n.lignes.map((l) => ({ id: n.id, b: boiteLigne({ ...l, taille: TAILLE_NOTE }) })));
  for (const { id, b } of lignes) {
    const noms = [...pos.centres].filter(([i]) => i !== id).map(([, c]) => boiteNom(c));
    if (segments.some((s) => coupe(s, b))) fautes.push(`note de ${id} : trait`);
    if ([...cercles.values()].some((c) => touche(c, b))) fautes.push(`note de ${id} : avatar`);
    if ([...noms, ...etiquettes, ...mentions].some((x) => recouvre(x, b))) fautes.push(`note de ${id} : nom`);
    if (lignes.some((m) => m.b !== b && recouvre(m.b, b))) fautes.push(`note de ${id} : autre note`);
  }
  const liens = notes.cartes.map((c) => ({ id: c.id, segs: c.lien.slice(1).map((p, i) => ({ x1: c.lien[i].x, y1: c.lien[i].y, x2: p.x, y2: p.y })) }));
  for (const { id, segs } of liens) {
    const noms = [...pos.centres].filter(([i]) => i !== id).map(([, c]) => boiteNom(c));
    for (const s of segs) {
      const b = fine(s);
      if ([...cercles.values()].some((c) => touche(c, b))) fautes.push(`lien de ${id} : avatar`);
      if ([...noms, ...etiquettes, ...mentions, ...lignes.map((l) => l.b)].some((x) => recouvre(x, b))) fautes.push(`lien de ${id} : nom ou note`);
      if (segments.some((t) => confondus(s, t))) fautes.push(`lien de ${id} : longe un trait`);
      for (const autre of liens)
        if (autre.id !== id && autre.segs.some((t) => confondus(s, t) || croise(s, t))) fautes.push(`lien de ${id} : lien de ${autre.id}`);
    }
  }
  for (const c of notes.cartes) {
    if (c.cote === 'g' ? c.x + c.l > 0 : c.x < pos.largeur) fautes.push(`carte de ${c.id} : sur l'arbre`);
    if (notes.cartes.some((k) => k !== c && recouvre({ g: k.x, h: k.y, d: k.x + k.l, b: k.y + k.h }, { g: c.x, h: c.y, d: c.x + c.l, b: c.y + c.h })))
      fautes.push(`carte de ${c.id} : autre carte`);
    if (c.y + c.h > mp.hauteur) fautes.push(`carte de ${c.id} : hors de l'image`);
  }
  return [...new Set(fautes)];
}

function croise(a: Segment, b: Segment): boolean {
  const [h, v] = a.y1 === a.y2 ? [a, b] : [b, a];
  if (h.y1 !== h.y2 || v.x1 !== v.x2 || h === v) return false;
  const dedans = (t: number, u: number, w: number) => t > Math.min(u, w) + 0.5 && t < Math.max(u, w) - 0.5;
  return dedans(v.x1, h.x1, h.x2) && dedans(h.y1, v.y1, v.y2);
}

/** Copie des données où les fiches choisies reçoivent une note. */
function avecNotes(d: Donnees, notes: Record<string, string>): Donnees {
  return { ...d, personnes: d.personnes.map((p) => (notes[p.id] !== undefined ? { ...p, note: notes[p.id] } : p)) };
}

describe('notes sur la famille Dupontel', () => {
  const f = dupontel();
  const disp = disposerArbre(f.donnees, f.moi);
  const pos = positions(disp);
  const places = disp.places.map((pl) => ({ id: pl.personne.id, ...pos.centres.get(pl.personne.id)! }));
  const aGauche = [...places].sort((a, b) => a.x - b.x)[0];
  const aDroite = [...places].sort((a, b) => b.x - a.x)[0];
  // Deux voisins d'une même ligne, au milieu : notes proches l'une de l'autre.
  const ligne = places.filter((p) => p.y === places.find((q) => q.id === f.moi)!.y).sort((a, b) => a.x - b.x);
  const [v1, v2] = ligne.slice(Math.floor(ligne.length / 2) - 1);
  const courte = places.find((p) => ![aGauche, aDroite, v1, v2].includes(p) && p.y === Math.max(...places.map((q) => q.y)))!;
  const d = avecNotes(f.donnees, { [aGauche.id]: LONGUE, [aDroite.id]: MOYENNE, [v1.id]: MOYENNE, [v2.id]: LONGUE, [courte.id]: COURTE });

  it('Base : aucune note, aucune marge, la taille d’avant', () => {
    const mp = miseEnPage(disp, d, f.moi, 'base', auj);
    expect(mp.notes.sous.length + mp.notes.cartes.length).toBe(0);
    expect([mp.largeur, mp.hauteur]).toEqual([pos.largeur, pos.hauteur]);
    expect(mp.reperes).not.toContain('note');
  });

  it('Détaillé : la note courte sous la personne, les longues en cartes des deux côtés, sans rien recouvrir', () => {
    const mp = miseEnPage(disp, d, f.moi, 'detail', auj);
    expect(mp.notes.sous.map((n) => n.id)).toContain(courte.id);
    const cote = new Map(mp.notes.cartes.map((c) => [c.id, c.cote]));
    expect(cote.get(aGauche.id)).toBe('g');
    expect(cote.get(aDroite.id)).toBe('d');
    expect(cote.has(v2.id)).toBe(true);
    expect(mp.notes.sous.length + mp.notes.cartes.length).toBe(5);
    expect(mp.largeur).toBe(mp.notes.gauche + pos.largeur + mp.notes.droite);
    expect(mp.reperes).toContain('note');
    expect(fautesNotes(mp, disp, f.moi)).toEqual([]);
  });
});

describe('notes nombreuses : rien ne se recouvre', () => {
  const cas = [...famillesDeReference().map((f) => ({ nom: f.fichier, d: f.donnees, moi: f.moi })), { nom: 'fixture', d: fixture, moi: ID_MOI }];
  const textes = [COURTE, MOYENNE, LONGUE, 'Vit à Lyon.'];
  for (const { nom, d, moi } of cas)
    it(nom, () => {
      const disp = disposerArbre(d, moi);
      // Une fiche sur trois reçoit une note, de longueur variable.
      const notes = Object.fromEntries(disp.places.filter((_, i) => i % 3 === 0).map((pl, i) => [pl.personne.id, textes[i % textes.length]]));
      const mp = miseEnPage(disp, avecNotes(d, notes), moi, 'detail', auj);
      expect(mp.notes.sous.length + mp.notes.cartes.length).toBeGreaterThan(0);
      expect(fautesNotes(mp, disp, moi)).toEqual([]);
    });
});
