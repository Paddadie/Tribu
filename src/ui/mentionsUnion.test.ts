// Dates d'union sur les familles fictives et la fixture anonymisée : posées là où on les attend, et jamais sur un
// trait de parenté, un avatar ni un nom de famille (variante C).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID_MOI } from '../modele/anonymiser';
import { disposerArbre } from '../modele/arbreGlobal';
import { disposerFoyer, familleProche } from '../modele/familleProche';
import { boiteLigne, coupe, mentionsFoyer, segmentsDe, TAILLE_MENTION, type Boite, type Cercle, type MentionUnion } from '../modele/mentionsUnion';
import { dupontel, famillesDeReference } from '../modele/test/familles';
import type { Donnees } from '../modele/types';
import { boiteEtiquette, calculerCadres, lieuxEtiquettes, mentionsArbre, positions, R, traitsArbre, zoneBulle } from './geometrieArbre';

const fixture: Donnees = JSON.parse(readFileSync(new URL('../modele/fixtures/arbre-anonyme.json', import.meta.url), 'utf-8'));
const cas = [...famillesDeReference().map((f) => ({ nom: f.fichier, d: f.donnees, moi: f.moi })), { nom: 'fixture', d: fixture, moi: ID_MOI }];
const auj = new Date(2026, 9, 30);

const touche = (c: Cercle, b: Boite) => Math.hypot(c.x - Math.max(b.g, Math.min(c.x, b.d)), c.y - Math.max(b.h, Math.min(c.y, b.b))) < c.r;
const recouvre = (a: Boite, b: Boite) => a.g < b.d && b.g < a.d && a.h < b.b && b.h < a.b;

/** Ce que chaque ligne de mention recouvre : trait, avatar, boîte ou autre mention. */
function fautes(mentions: MentionUnion[], traits: string[], cercles: Cercle[], boites: Boite[]): string[] {
  const segments = traits.flatMap(segmentsDe);
  const lignes = mentions.flatMap((m) => m.lignes);
  return lignes.flatMap((l, i) => {
    const b = boiteLigne(l);
    return [
      ...(segments.some((s) => coupe(s, b)) ? [`${l.texte} : trait`] : []),
      ...(cercles.some((c) => touche(c, b)) ? [`${l.texte} : avatar`] : []),
      ...(boites.some((x) => recouvre(x, b)) ? [`${l.texte} : nom`] : []),
      ...(lignes.some((m, j) => j !== i && recouvre(boiteLigne(m), b)) ? [`${l.texte} : mention`] : []),
    ];
  });
}

describe('arbre global', () => {
  for (const { nom, d, moi } of cas)
    it(`${nom} : aucune date d'union sur un trait, un avatar ou un nom de famille`, () => {
      const disp = disposerArbre(d, moi);
      const pos = positions(disp);
      const cadres = calculerCadres(disp, pos.centres);
      const traits = traitsArbre(disp, pos, zoneBulle(disp, pos.centres, cadres), moi);
      const anneau = new Set([moi, ...disp.groupes.flatMap((g) => g.membres)]);
      const cercles = [...pos.centres].map(([id, c]) => ({ ...c, r: anneau.has(id) ? R + 5 : R }));
      const lieux = lieuxEtiquettes(disp, pos, traits);
      const etiquettes = disp.etiquettes.map((e) => boiteEtiquette(disp, pos.px, e, lieux.get(e)));
      for (const palier of ['annee', 'detail'] as const) {
        const m = mentionsArbre(disp, pos, traits, cadres, d.unions, palier, moi, auj);
        expect(
          fautes(
            m,
            traits.map((t) => t.d),
            cercles,
            etiquettes,
          ),
        ).toEqual([]);
      }
    });

  it('dupontel : années de près, date et lieu tout près, gris pour un ex', () => {
    const f = dupontel();
    const disp = disposerArbre(f.donnees, f.moi);
    const pos = positions(disp);
    const cadres = calculerCadres(disp, pos.centres);
    const traits = traitsArbre(disp, pos, zoneBulle(disp, pos.centres, cadres), f.moi);
    const annees = mentionsArbre(disp, pos, traits, cadres, f.donnees.unions, 'annee', f.moi, auj);
    const textes = annees.flatMap((m) => m.lignes.map((l) => l.texte));
    expect(textes).toEqual(expect.arrayContaining(['1890', '1944', '1972', '2001']));
    // Sans année (« --05-20 ») : rien de près.
    expect(textes).not.toContain('20 mai');
    const detail = mentionsArbre(disp, pos, traits, cadres, f.donnees.unions, 'detail', f.moi, auj).map((m) => m.lignes.map((l) => l.texte));
    expect(detail).toEqual(
      expect.arrayContaining([
        ['22 avril 1890', 'Quimperlé'],
        ['16 juin 2001', 'Dinard'],
      ]),
    );
    expect(detail.flat().find((t) => t.startsWith('Saint-'))).toMatch(/…$/);
    expect(annees.find((m) => m.lignes[0].texte === '1998')?.ex).toBe(true);
  });

  it('image PNG : l’année seule garde le corps du palier « annee », le reste celui du détail', () => {
    const f = dupontel();
    const disp = disposerArbre(f.donnees, f.moi);
    const pos = positions(disp);
    const cadres = calculerCadres(disp, pos.centres);
    const traits = traitsArbre(disp, pos, zoneBulle(disp, pos.centres, cadres), f.moi);
    const lignes = (enGrand: boolean) => mentionsArbre(disp, pos, traits, cadres, f.donnees.unions, 'detail', f.moi, auj, enGrand).flatMap((m) => m.lignes);
    const image = lignes(true);
    expect(image.find((l) => l.texte === '1998')?.taille).toBe(TAILLE_MENTION.annee);
    expect(image.find((l) => l.texte === 'Dinard')?.taille).toBe(TAILLE_MENTION.detail);
    expect(lignes(false).find((l) => l.texte === '1998')?.taille).toBe(TAILLE_MENTION.detail);
  });
});

describe('fiche « Famille proche »', () => {
  for (const { nom, d, moi } of cas)
    it(`${nom} : sur chaque fiche, aucune année d'union sur un trait, un avatar ou un nom`, () => {
      for (const p of d.personnes) {
        const f = familleProche(d, p.id, moi);
        for (const largeur of [294, 360]) {
          const dis = disposerFoyer(f, largeur);
          const m = mentionsFoyer(dis, f.unions, auj);
          const cercles = dis.noeuds.map((n) => ({ x: n.x, y: n.y, r: n.rayon }));
          expect(
            fautes(
              m,
              dis.traits.map((t) => t.d),
              cercles,
              [],
            ),
            `${p.id} à ${largeur}`,
          ).toEqual([]);
          expect(m.every((x) => x.lignes.length === 1 && /^\d{4}$/.test(x.lignes[0].texte))).toBe(true);
        }
      }
    });

  it('dupontel : l’année du mariage de Gaspard sur sa fiche', () => {
    const f = dupontel();
    const gaspard = f.donnees.personnes.find((p) => p.prenom === 'Gaspard')!;
    const fp = familleProche(f.donnees, gaspard.id, f.moi);
    const textes = mentionsFoyer(disposerFoyer(fp, 360), fp.unions, auj).map((m) => m.lignes[0].texte);
    expect(textes).toContain('2001');
  });
});
