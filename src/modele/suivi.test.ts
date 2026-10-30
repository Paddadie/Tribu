// « Qui suivre » : cercles depuis « Moi », exceptions des fiches, et leur effet sur les rappels et « À compléter ».
import { describe, expect, it } from 'vitest';
import { evenementsAgenda } from './agenda';
import { evenementsAVenir } from './evenements';
import { filtrerListe } from './filtres';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import { CERCLES, cercleDe, lireCercles, SUIVI_FAMILLE_PROCHE, SUIVI_TOUT, suivis, type Suivi } from './suivi';
import type { Donnees, Personne } from './types';

/**
 * Moi (Alix) ; ses parents Bruno et Carla ; Denise, mère de Bruno, et Émile, père de Denise ; Fanny, sœur d'Alix ;
 * Gaston, frère de Bruno, et son fils Hugo ; Igor, fils d'Hugo ; Julie, conjointe d'Alix, et Karl, son père ;
 * Léon, mari de Fanny ; Mila, amie d'Alix ; Noé, sans lien.
 */
function famille() {
  let d = donneesVides();
  const ids: Record<string, string> = {};
  for (const prenom of ['Alix', 'Bruno', 'Carla', 'Denise', 'Emile', 'Fanny', 'Gaston', 'Hugo', 'Igor', 'Julie', 'Karl', 'Leon', 'Mila', 'Noe']) {
    const r = creerPersonne(d, { prenom, nom: 'Morel', naissance: '1990-11-05' });
    [d, ids[prenom]] = [r.donnees, r.personne.id];
  }
  const filiation = (parent: string, enfant: string) => (d = ajouterFiliation(d, ids[parent], ids[enfant], 'biologique').donnees);
  filiation('Bruno', 'Alix');
  filiation('Carla', 'Alix');
  filiation('Bruno', 'Fanny');
  filiation('Carla', 'Fanny');
  filiation('Denise', 'Bruno');
  filiation('Denise', 'Gaston');
  filiation('Emile', 'Denise');
  filiation('Gaston', 'Hugo');
  filiation('Hugo', 'Igor');
  filiation('Karl', 'Julie');
  d = ajouterUnion(d, ids.Alix, ids.Julie, true, 'actuelle').donnees;
  d = ajouterUnion(d, ids.Fanny, ids.Leon, true, 'actuelle', '2010-11-06').donnees;
  d = creerGroupe(d, [ids.Mila], '', ids.Alix).donnees;
  return { d, ids };
}

const qui = (d: Donnees, id: string): Personne => d.personnes.find((p) => p.id === id)!;
const avec = (d: Donnees, id: string, champs: Partial<Personne>): Donnees => ({
  ...d,
  personnes: d.personnes.map((p) => (p.id === id ? { ...p, ...champs } : p)),
});

describe('cercles depuis « Moi »', () => {
  it('range chaque fiche selon son lien', () => {
    const { d, ids } = famille();
    const cercle = (prenom: string) => cercleDe(d, ids.Alix, ids[prenom]);
    expect(cercle('Alix')).toBeUndefined();
    expect(cercle('Julie')).toBeUndefined();
    expect(['Bruno', 'Carla'].map(cercle)).toEqual(['parents', 'parents']);
    expect(cercle('Fanny')).toBe('fratrie');
    expect(cercle('Denise')).toBe('grandsParents');
    expect(cercle('Gaston')).toBe('oncles');
    expect(cercle('Hugo')).toBe('cousins');
    expect(['Emile', 'Igor'].map(cercle)).toEqual(['loin', 'loin']);
    expect(['Karl', 'Leon'].map(cercle)).toEqual(['alliance', 'alliance']);
    expect(cercle('Mila')).toBe('amis');
    expect(cercle('Noe')).toBe('sansLien');
    // Vu depuis l'autre bout : enfants, petits-enfants, neveux.
    expect(cercleDe(d, ids.Denise, ids.Alix)).toBe('grandsParents');
    expect(cercleDe(d, ids.Gaston, ids.Alix)).toBe('oncles');
    expect(cercleDe(d, ids.Bruno, ids.Alix)).toBe('parents');
  });

  it('« Famille proche » : rappels jusqu’aux cousins germains, belle-famille et amis compris', () => {
    const { d, ids } = famille();
    const s = suivis(d, ids.Alix, SUIVI_FAMILLE_PROCHE);
    const rappels = Object.keys(ids).filter((n) => s.rappel(qui(d, ids[n])));
    expect(rappels).toEqual(['Alix', 'Bruno', 'Carla', 'Denise', 'Fanny', 'Gaston', 'Hugo', 'Julie', 'Karl', 'Leon', 'Mila']);
    const signales = Object.keys(ids).filter((n) => s.signale(qui(d, ids[n])));
    expect(signales).toEqual(['Alix', 'Bruno', 'Carla', 'Denise', 'Fanny', 'Gaston', 'Hugo', 'Julie']);
  });

  it('sans « Moi », ou avec une fiche « Moi » disparue, tout le monde est suivi', () => {
    const { d } = famille();
    const rien: Suivi = { rappels: lireCercles({}, SUIVI_FAMILLE_PROCHE.rappels), completer: lireCercles(null, SUIVI_TOUT.completer) };
    for (const moi of [undefined, 'disparue']) {
      const s = suivis(d, moi, { ...rien, rappels: Object.fromEntries(CERCLES.map((c) => [c.cercle, false])) as Suivi['rappels'] });
      expect(d.personnes.every((p) => s.rappel(p) && s.signale(p) && s.cercle(p) === undefined)).toBe(true);
    }
  });

  it('l’exception de la fiche l’emporte sur le cercle, dans les deux sens', () => {
    const f = famille();
    let d = avec(f.d, f.ids.Igor, { avecRappel: true, signalerIncomplet: true });
    d = avec(d, f.ids.Fanny, { sansRappel: true, ignorerIncomplet: true });
    const s = suivis(d, f.ids.Alix, SUIVI_FAMILLE_PROCHE);
    expect([s.rappel(qui(d, f.ids.Igor)), s.signale(qui(d, f.ids.Igor))]).toEqual([true, true]);
    expect([s.rappelDuCercle(qui(d, f.ids.Igor)), s.signaleDuCercle(qui(d, f.ids.Igor))]).toEqual([false, false]);
    expect([s.rappel(qui(d, f.ids.Fanny)), s.signale(qui(d, f.ids.Fanny))]).toEqual([false, false]);
  });

  it('lireCercles garde chaque valeur valide et complète le reste', () => {
    const lus = lireCercles({ loin: false, amis: 'non', inconnu: true }, SUIVI_TOUT.rappels);
    expect(lus).toEqual({ ...SUIVI_TOUT.rappels, loin: false });
  });
});

describe('effet sur les rappels et « À compléter »', () => {
  const aujourdhui = new Date(2026, 10, 1);

  it('les rappels ne gardent que les fiches suivies ; une union reste si l’un des deux est suivi', () => {
    const { d, ids } = famille();
    const evs = evenementsAVenir(d, aujourdhui, 30, { fetes: false, moi: ids.Alix, suivi: SUIVI_FAMILLE_PROCHE });
    const anniversaires = evs.filter((e) => e.genre === 'anniversaire').map((e) => e.personnes[0].prenom);
    expect(anniversaires).not.toContain('Igor');
    expect(anniversaires).not.toContain('Noe');
    expect(anniversaires).toContain('Hugo');
    const sansBelleFamille = { ...SUIVI_FAMILLE_PROCHE, rappels: { ...SUIVI_FAMILLE_PROCHE.rappels, alliance: false } };
    const unions = evenementsAVenir(d, aujourdhui, 30, { moi: ids.Alix, suivi: sansBelleFamille }).filter((e) => e.genre === 'union');
    expect(unions.map((e) => e.personnes.map((p) => p.prenom))).toEqual([['Fanny', 'Leon']]);
    // Une exception « sans rappel » coupe toujours l'union.
    const coupee = evenementsAVenir(avec(d, ids.Leon, { sansRappel: true }), aujourdhui, 30, { moi: ids.Alix, suivi: SUIVI_FAMILLE_PROCHE });
    expect(coupee.some((e) => e.genre === 'union')).toBe(false);
  });

  it('sans réglage, rien ne change : tout le monde a ses rappels', () => {
    const { d, ids } = famille();
    const evs = evenementsAVenir(d, aujourdhui, 30, { fetes: false, moi: ids.Alix });
    expect(evs.filter((e) => e.genre === 'anniversaire')).toHaveLength(d.personnes.length);
  });

  it('l’export .ics suit les mêmes rappels', () => {
    const { d, ids } = famille();
    const titres = evenementsAgenda(d, { moi: ids.Alix, suivi: SUIVI_FAMILLE_PROCHE }).map((e) => e.titre);
    expect(titres).toContain('Anniversaire de Hugo Morel');
    expect(titres).not.toContain('Anniversaire de Igor Morel');
    expect(titres).toContain('Anniversaire de mariage de Fanny Morel et Leon Morel');
    expect(evenementsAgenda(avec(d, ids.Igor, { sansRappel: true })).map((e) => e.titre)).not.toContain('Anniversaire de Igor Morel');
  });

  it('« À compléter » ne signale que les fiches suivies', () => {
    const { d, ids } = famille();
    // Les fiches de la famille ont toutes une naissance : on les rend incomplètes.
    const incompletes: Donnees = { ...d, personnes: d.personnes.map(({ naissance: _, ...p }) => p) };
    const signalees = filtrerListe(incompletes, incompletes.personnes, { filtre: 'acompleter' }, ids.Alix, SUIVI_FAMILLE_PROCHE);
    expect(signalees.map((p) => p.prenom)).toEqual(['Alix', 'Bruno', 'Carla', 'Denise', 'Fanny', 'Gaston', 'Hugo', 'Julie']);
    expect(filtrerListe(incompletes, incompletes.personnes, { filtre: 'acompleter' }, ids.Alix)).toHaveLength(d.personnes.length);
  });
});
