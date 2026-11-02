// « Qui suivre » : cercles depuis « Moi », exceptions des fiches, et leur effet sur les rappels et « À compléter ».
import { describe, expect, it } from 'vitest';
import { evenementsAgenda } from './agenda';
import { evenementsAVenir } from './evenements';
import { filtrerListe } from './filtres';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import {
  aException,
  avecCran,
  CERCLES,
  CERCLES_HORS,
  CERCLES_SANG,
  cercleDe,
  cranDe,
  lireCercles,
  retirerException,
  SUIVI_FAMILLE_PROCHE,
  SUIVI_TOUT,
  suivis,
  suivreFiche,
  type Cercles,
  type Suivi,
} from './suivi';
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

describe('jauge de proximité', () => {
  const rien = Object.fromEntries(CERCLES.map((c) => [c.cercle, false])) as Cercles;

  it('les crans suivent les cercles de sang, du plus proche au plus lointain, sans les trois autres', () => {
    expect(CERCLES_SANG).toEqual(['parents', 'fratrie', 'grandsParents', 'oncles', 'cousins', 'loin']);
    expect([...CERCLES_SANG, ...CERCLES_HORS].sort()).toEqual(CERCLES.map((c) => c.cercle).sort());
  });

  it('cranDe : préréglages, tout éteint, choix à trous', () => {
    expect(cranDe(SUIVI_TOUT.rappels)).toBe(6);
    expect(cranDe(SUIVI_FAMILLE_PROCHE.rappels)).toBe(5);
    expect(cranDe(SUIVI_FAMILLE_PROCHE.completer)).toBe(5);
    expect(cranDe(rien)).toBe(0);
    expect(cranDe({ ...rien, parents: true, fratrie: true })).toBe(2);
    // Grands-parents sans la fratrie, ou plus loin sans les cousins : à trous.
    expect(cranDe({ ...rien, parents: true, grandsParents: true })).toBeUndefined();
    expect(cranDe({ ...SUIVI_TOUT.rappels, cousins: false })).toBeUndefined();
  });

  it('cranDe ignore belle-famille, amis et sans lien', () => {
    expect(cranDe({ ...rien, alliance: true, amis: true, sansLien: true })).toBe(0);
    expect(cranDe({ ...SUIVI_TOUT.rappels, alliance: false, amis: false })).toBe(6);
  });

  it('avecCran réécrit les cercles de sang et garde les trois autres', () => {
    for (let cran = 0; cran <= CERCLES_SANG.length; cran++) {
      const c = avecCran(SUIVI_FAMILLE_PROCHE.rappels, cran);
      expect(cranDe(c)).toBe(cran);
      for (const h of CERCLES_HORS) expect(c[h]).toBe(SUIVI_FAMILLE_PROCHE.rappels[h]);
    }
    expect(avecCran(SUIVI_FAMILLE_PROCHE.rappels, 5)).toEqual(SUIVI_FAMILLE_PROCHE.rappels);
    expect(avecCran(SUIVI_TOUT.completer, 6)).toEqual(SUIVI_TOUT.completer);
  });

  it('un choix à trous ne change qu’au cran touché, sans toucher aux autres cercles', () => {
    const trous: Cercles = { ...rien, parents: true, grandsParents: true, amis: true };
    expect(avecCran(trous, 3)).toEqual({ ...rien, parents: true, fratrie: true, grandsParents: true, amis: true });
    expect(avecCran(trous, 1)).toEqual({ ...rien, parents: true, amis: true });
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

describe('basculer une fiche (Réglages › Suivi, fiche par fiche)', () => {
  const champs = (p: Personne) => ({
    avecRappel: p.avecRappel,
    sansRappel: p.sansRappel,
    signalerIncomplet: p.signalerIncomplet,
    ignorerIncomplet: p.ignorerIncomplet,
  });
  const aucune = { avecRappel: undefined, sansRappel: undefined, signalerIncomplet: undefined, ignorerIncomplet: undefined };

  it('crée l’exception qui force le choix quand le cercle dit l’inverse', () => {
    const { d, ids } = famille();
    const proche = SUIVI_FAMILLE_PROCHE;
    // Noé (sans lien) n'a pas de rappels ; Karl (belle-famille) n'est pas signalé.
    let e = suivreFiche(d, ids.Alix, proche, ids.Noe, 'rappels', true);
    expect(champs(qui(e, ids.Noe))).toEqual({ ...aucune, avecRappel: true });
    e = suivreFiche(e, ids.Alix, proche, ids.Karl, 'completer', true);
    expect(champs(qui(e, ids.Karl))).toEqual({ ...aucune, signalerIncomplet: true });
    // Bruno (parent) suivi partout : l'éteindre crée l'exception contraire.
    e = suivreFiche(e, ids.Alix, proche, ids.Bruno, 'rappels', false);
    e = suivreFiche(e, ids.Alix, proche, ids.Bruno, 'completer', false);
    expect(champs(qui(e, ids.Bruno))).toEqual({ ...aucune, sansRappel: true, ignorerIncomplet: true });
    const s = suivis(e, ids.Alix, proche);
    expect([s.rappel(qui(e, ids.Noe)), s.signale(qui(e, ids.Karl)), s.rappel(qui(e, ids.Bruno))]).toEqual([true, true, false]);
    // Les autres fiches et les cercles ne bougent pas.
    expect(champs(qui(e, ids.Carla))).toEqual(aucune);
    expect(proche).toEqual(SUIVI_FAMILLE_PROCHE);
  });

  it('retire l’exception quand on revient à ce que dit le cercle', () => {
    const { d, ids } = famille();
    const depart = avec(avec(d, ids.Fanny, { sansRappel: true }), ids.Noe, { signalerIncomplet: true });
    let e = suivreFiche(depart, ids.Alix, SUIVI_FAMILLE_PROCHE, ids.Fanny, 'rappels', true);
    e = suivreFiche(e, ids.Alix, SUIVI_FAMILLE_PROCHE, ids.Noe, 'completer', false);
    expect(champs(qui(e, ids.Fanny))).toEqual(aucune);
    expect(champs(qui(e, ids.Noe))).toEqual(aucune);
    // Aucune clé à false : le stockage n'accepte que true.
    expect(Object.keys(qui(e, ids.Fanny))).not.toContain('sansRappel');
  });

  it('ne crée rien quand le choix est déjà celui du cercle', () => {
    const { d, ids } = famille();
    const e = suivreFiche(d, ids.Alix, SUIVI_FAMILLE_PROCHE, ids.Hugo, 'rappels', true);
    expect(champs(qui(e, ids.Hugo))).toEqual(aucune);
    expect(aException(qui(e, ids.Hugo), 'rappels')).toBe(false);
    // Le choix contraire d'une exception sans effet la remplace par l'exception utile.
    const sansEffet = avec(d, ids.Hugo, { avecRappel: true });
    expect(champs(qui(suivreFiche(sansEffet, ids.Alix, SUIVI_FAMILLE_PROCHE, ids.Hugo, 'rappels', false), ids.Hugo))).toEqual({ ...aucune, sansRappel: true });
  });

  it('retire une exception, même sans effet, sans toucher à l’autre réglage', () => {
    const { d, ids } = famille();
    const depart = avec(d, ids.Hugo, { avecRappel: true, ignorerIncomplet: true });
    expect(aException(qui(depart, ids.Hugo), 'rappels')).toBe(true);
    const e = retirerException(depart, ids.Hugo, 'rappels');
    expect(champs(qui(e, ids.Hugo))).toEqual({ ...aucune, ignorerIncomplet: true });
    expect(aException(qui(e, ids.Hugo), 'rappels')).toBe(false);
    expect(aException(qui(e, ids.Hugo), 'completer')).toBe(true);
  });

  it('sans « Moi » choisi, tout le monde est suivi : éteindre crée l’exception, rallumer la retire', () => {
    const { d, ids } = famille();
    for (const moi of [undefined, 'disparu']) {
      const e = suivreFiche(d, moi, SUIVI_FAMILLE_PROCHE, ids.Noe, 'rappels', false);
      expect(champs(qui(e, ids.Noe))).toEqual({ ...aucune, sansRappel: true });
      const f = suivreFiche(e, moi, SUIVI_FAMILLE_PROCHE, ids.Noe, 'rappels', true);
      expect(champs(qui(f, ids.Noe))).toEqual(aucune);
      expect(champs(qui(suivreFiche(d, moi, SUIVI_FAMILLE_PROCHE, ids.Noe, 'completer', true), ids.Noe))).toEqual(aucune);
    }
  });
});
