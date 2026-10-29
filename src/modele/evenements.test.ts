import { describe, expect, it } from 'vitest';
import { estDansLeFutur } from './age';
import {
  dateEvenement,
  depuisUnion,
  detailEvenement,
  evenementsAVenir,
  nomEvenement,
  pastilleJour,
  quandCourt,
  fetesDuJour,
  titreEvenement,
  type Evenement,
} from './evenements';
import { paques } from './fetes';
import { ajouterUnion, creerPersonne, donneesVides } from './modele';
import type { Donnees, Personne } from './types';

// Mercredi 21 octobre 2026 : fête des Céline.
const AUJOURDHUI = new Date(2026, 9, 21);

function ajouter(d: Donnees, champs: Partial<Personne> & { prenom: string }): [Donnees, Personne] {
  const r = creerPersonne(d, { nom: 'Essai', ...champs });
  return [r.donnees, r.personne];
}

const resume = (e: Evenement) => `${e.dans} ${e.genre} ${e.personnes.map((p) => p.prenom).join('+')}${e.annees === undefined ? '' : ` ${e.annees}`}`;

describe('evenementsAVenir', () => {
  it('donne anniversaires, fêtes et décès triés par date puis par genre', () => {
    let d = donneesVides();
    [d] = ajouter(d, { prenom: 'Céline', naissance: '1990-10-21' });
    [d] = ajouter(d, { prenom: 'Zorglub', naissance: '--10-22' });
    [d] = ajouter(d, { prenom: 'Odile', naissance: '1930-01-01', deces: '2015-10-22' });
    [d] = ajouter(d, { prenom: 'Zorglub', naissance: '1980-05' });
    expect(evenementsAVenir(d, AUJOURDHUI, 30).map(resume)).toEqual([
      '0 anniversaire Céline 36',
      '0 fete Céline',
      '1 anniversaire Zorglub',
      '1 deces Odile 11',
    ]);
  });

  it('respecte l’horizon et passe à l’année suivante', () => {
    let d = donneesVides();
    [d] = ajouter(d, { prenom: 'Zorglub', naissance: '2000-10-20' });
    expect(evenementsAVenir(d, AUJOURDHUI, 30)).toEqual([]);
    const [e] = evenementsAVenir(d, AUJOURDHUI, 365);
    expect([e.dans, e.annee, e.annees]).toEqual([364, 2027, 27]);
  });

  it('ne fête ni ne souhaite l’anniversaire d’une personne décédée, et cache les fêtes sur demande', () => {
    let d = donneesVides();
    [d] = ajouter(d, { prenom: 'Céline', naissance: '1990-10-21', decede: true });
    [d] = ajouter(d, { prenom: 'Luc', naissance: '1990-10-25' });
    expect(evenementsAVenir(d, AUJOURDHUI, 30).map(resume)).toEqual(['4 anniversaire Luc 36']);
    expect(evenementsAVenir(d, AUJOURDHUI, 365, { fetes: true }).map((e) => e.genre)).toContain('fete');
    expect(evenementsAVenir(d, AUJOURDHUI, 365, { fetes: false }).map((e) => e.genre)).not.toContain('fete');
  });

  it('ignore les personnes sans nom et le premier jour d’une vie', () => {
    let d = donneesVides();
    [d] = ajouter(d, { prenom: '?', naissance: '1990-10-22' });
    d = { ...d, personnes: d.personnes.map((p) => ({ ...p, sansNom: true as const })) };
    [d] = ajouter(d, { prenom: 'Zorglub', naissance: '2026-10-22' });
    expect(evenementsAVenir(d, AUJOURDHUI, 30)).toEqual([]);
  });

  it('fête un 29 février le 28 les années non bissextiles', () => {
    let d = donneesVides();
    [d] = ajouter(d, { prenom: 'Zorglub', naissance: '2000-02-29' });
    const [e] = evenementsAVenir(d, AUJOURDHUI, 365);
    expect([e.jour, e.mois, e.annee, e.annees]).toEqual([28, 2, 2027, 27]);
  });

  describe('unions', () => {
    function couple(union: { marie?: boolean; statut?: 'actuelle' | 'separee'; date?: string; decesA?: string; decesB?: string }) {
      let d = donneesVides();
      let a: Personne, b: Personne;
      [d, a] = ajouter(d, { prenom: 'Xavière', deces: union.decesA });
      [d, b] = ajouter(d, { prenom: 'Zorglub', deces: union.decesB });
      d = ajouterUnion(d, a.id, b.id, union.marie ?? true, union.statut ?? 'actuelle', union.date).donnees;
      return evenementsAVenir(d, AUJOURDHUI, 365, { fetes: false });
    }

    it('compte les années de mariage', () => {
      const [e] = couple({ date: '2016-10-23' });
      expect(resume(e)).toBe('2 union Xavière+Zorglub 10');
      expect(titreEvenement(e)).toBe('Noces d’étain');
      expect(dateEvenement(e)).toBe('23 octobre');
    });

    it('dit « ensemble » hors mariage et nomme les années sans noces', () => {
      expect(titreEvenement(couple({ marie: false, date: '2016-10-23' })[0])).toBe('10 ans ensemble');
      expect(titreEvenement(couple({ date: '1970-10-23' })[0])).toBe('56 ans de mariage');
      expect(titreEvenement(couple({ date: '--10-23' })[0])).toBe('Anniversaire de mariage');
    });

    it('annonce le grand jour d’une union à venir, et rien avant', () => {
      const [e] = couple({ date: '2027-06-12' });
      expect([e.annees, e.annee, titreEvenement(e)]).toEqual([0, 2027, 'Mariage']);
      expect(titreEvenement(couple({ marie: false, date: '2027-06-12' })[0])).toBe('Union');
      expect(couple({ date: '2028-01-12' })).toEqual([]);
    });

    it('oublie les couples séparés, sans jour ou tous deux décédés, garde un veuvage', () => {
      expect(couple({ statut: 'separee', date: '2016-10-23' })).toEqual([]);
      expect(couple({ date: '2016-10' })).toEqual([]);
      expect(couple({ date: '2016-10-23', decesA: '2020', decesB: '2021' })).toEqual([]);
      expect(couple({ date: '2016-10-23', decesA: '2020' }).map((e) => e.genre)).toEqual(['union']);
    });
  });
});

describe('fetesDuJour', () => {
  it('donne le saint du jour sans aucun proche', () => {
    expect(evenementsAVenir(donneesVides(), AUJOURDHUI, 0)).toEqual([]);
    expect(fetesDuJour(AUJOURDHUI)).toEqual([{ nom: 'Sainte Céline', type: 'saint', ferie: false, personnes: [] }]);
  });

  it('place les proches sous le saint qu’ils portent, et garde les autres saints du jour', () => {
    const [d1, raymond] = ajouter(donneesVides(), { prenom: 'Raymond' });
    const jour = new Date(2026, 0, 7);
    const fetes = fetesDuJour(jour, evenementsAVenir(d1, jour, 0));
    expect(fetes.map((f) => [f.nom, f.personnes.map((p) => p.id)])).toEqual([
      ['Saint Raymond', [raymond.id]],
      ['Sainte Virginie', []],
    ]);
  });

  it('rattache une variante de prénom à son saint, sans doublon', () => {
    const [d1, ginette] = ajouter(donneesVides(), { prenom: 'Ginette' });
    const jour = new Date(2026, 0, 3);
    expect(fetesDuJour(jour, evenementsAVenir(d1, jour, 0))).toEqual([{ nom: 'Sainte Geneviève', type: 'saint', ferie: false, personnes: [ginette] }]);
  });

  it('ignore la fête d’un proche un autre jour', () => {
    const [d1] = ajouter(donneesVides(), { prenom: 'Raymond' });
    expect(fetesDuJour(AUJOURDHUI, evenementsAVenir(d1, AUJOURDHUI, 30))).toEqual([{ nom: 'Sainte Céline', type: 'saint', ferie: false, personnes: [] }]);
  });

  it('fête le 29 février les années bissextiles, le 28 sinon (avec le saint du 28)', () => {
    expect(fetesDuJour(new Date(2028, 1, 29)).map((f) => f.nom)).toEqual(['Saint Auguste']);
    expect(fetesDuJour(new Date(2028, 1, 28)).map((f) => f.nom)).toEqual(['Saint Romain']);
    expect(fetesDuJour(new Date(2027, 1, 28)).map((f) => f.nom)).toEqual(['Saint Romain', 'Saint Auguste']);
  });

  it('donne le nom des fêtes civiles et religieuses, avec leur caractère férié', () => {
    expect(fetesDuJour(new Date(2026, 0, 1))).toEqual([
      { nom: 'Jour de l’an', type: 'civile', ferie: true, personnes: [] },
      { nom: 'Sainte Marie, Mère de Dieu', type: 'religieuse', ferie: false, personnes: [] },
    ]);
    expect(fetesDuJour(new Date(2026, 10, 1))[0]).toMatchObject({ nom: 'Toussaint', type: 'religieuse', ferie: true });
    expect(fetesDuJour(new Date(2026, 10, 2))).toEqual([{ nom: 'Commémoration des défunts', type: 'religieuse', ferie: false, personnes: [] }]);
    expect(fetesDuJour(new Date(2026, 11, 8))[0]).toMatchObject({ nom: 'Immaculée Conception', ferie: false });
  });

  it('garde le saint et ajoute la fête fériée du même jour', () => {
    expect(fetesDuJour(new Date(2026, 6, 14)).map((f) => [f.nom, f.ferie])).toEqual([
      ['Sainte Camille', false],
      ['Fête nationale', true],
    ]);
  });

  it('calcule les fêtes mobiles d’après Pâques', () => {
    expect(paques(2026)).toEqual(new Date(2026, 3, 5));
    expect(paques(2027)).toEqual(new Date(2027, 2, 28));
    const nomsFeries = (d: Date) =>
      fetesDuJour(d)
        .filter((f) => f.type !== 'saint')
        .map((f) => [f.nom, f.ferie]);
    expect(nomsFeries(new Date(2026, 3, 6))).toEqual([['Lundi de Pâques', true]]);
    expect(nomsFeries(new Date(2026, 4, 14))).toEqual([['Ascension', true]]);
    expect(nomsFeries(new Date(2026, 4, 24))).toEqual([['Pentecôte', false]]);
    expect(nomsFeries(new Date(2026, 4, 25))).toEqual([['Lundi de Pentecôte', true]]);
  });

  it('couvre le cycle liturgique catholique (Carême, Semaine sainte, Avent, Noël)', () => {
    const religieuses = (d: Date) =>
      fetesDuJour(d)
        .filter((f) => f.type === 'religieuse')
        .map((f) => f.nom);
    expect(religieuses(new Date(2026, 1, 18))).toEqual(['Mercredi des Cendres']);
    expect(religieuses(new Date(2026, 2, 29))).toEqual(['Dimanche des Rameaux']);
    expect(religieuses(new Date(2026, 3, 2))).toEqual(['Jeudi saint']);
    expect(religieuses(new Date(2026, 3, 3))).toEqual(['Vendredi saint']);
    expect(religieuses(new Date(2026, 3, 4))).toEqual(['Samedi saint']);
    expect(religieuses(new Date(2026, 3, 12))).toEqual(['Dimanche de la Divine Miséricorde']);
    expect(religieuses(new Date(2026, 4, 31))).toEqual(['Visitation de la Vierge Marie', 'Sainte Trinité']);
    expect(religieuses(new Date(2026, 5, 7))).toEqual(['Fête-Dieu (Saint-Sacrement)']);
    expect(religieuses(new Date(2026, 5, 12))).toEqual(['Sacré-Cœur de Jésus']);
    expect(religieuses(new Date(2026, 5, 13))).toEqual(['Cœur immaculé de Marie']);
    expect(religieuses(new Date(2026, 0, 4))).toEqual(['Épiphanie']);
    expect(religieuses(new Date(2026, 0, 11))).toEqual(['Baptême du Seigneur']);
    expect(religieuses(new Date(2026, 10, 22))).toEqual(['Christ, Roi de l’univers']);
    expect(religieuses(new Date(2026, 10, 29))).toEqual(['1er dimanche de l’Avent']);
    expect(religieuses(new Date(2026, 11, 20))).toEqual(['4e dimanche de l’Avent']);
    expect(religieuses(new Date(2026, 11, 27))).toEqual(['Sainte Famille']);
  });

  it('place les fêtes liturgiques mobiles selon l’année (Épiphanie le 8, Sainte Famille le 30)', () => {
    const religieuses = (d: Date) =>
      fetesDuJour(d)
        .filter((f) => f.type === 'religieuse')
        .map((f) => f.nom);
    expect(religieuses(new Date(2023, 0, 8))).toEqual(['Épiphanie']);
    expect(religieuses(new Date(2023, 0, 9))).toEqual(['Baptême du Seigneur']);
    expect(religieuses(new Date(2022, 11, 30))).toEqual(['Sainte Famille']);
  });

  it('reste vide un jour sans saint ni fête', () => {
    expect(fetesDuJour(new Date(2026, 2, 2))).toEqual([]);
  });
});

describe('libellés', () => {
  it('nomme une personne ou un couple', () => {
    let d = donneesVides();
    let a: Personne, b: Personne, c: Personne;
    [d, a] = ajouter(d, { prenom: 'Henri', nom: 'Bastide' });
    [d, b] = ajouter(d, { prenom: 'Odette', nom: 'Bastide' });
    [d, c] = ajouter(d, { prenom: 'Sophie', nom: 'Lemaire' });
    expect(nomEvenement({ personnes: [a] })).toBe('Henri Bastide');
    expect(nomEvenement({ personnes: [a, b] })).toBe('Henri et Odette Bastide');
    expect(nomEvenement({ personnes: [a, c] })).toBe('Henri Bastide et Sophie Lemaire');
    expect(nomEvenement({ personnes: [a, c] }, true)).toBe('Henri et Sophie');
  });

  it('détaille chaque genre pour l’agenda', () => {
    let d = donneesVides();
    let a: Personne, b: Personne;
    [d, a] = ajouter(d, { prenom: 'Céline', naissance: '1990-10-21' });
    [d] = ajouter(d, { prenom: 'Zorglub', naissance: '1930', deces: '2015-10-22' });
    [d, b] = ajouter(d, { prenom: 'Zorglub' });
    d = ajouterUnion(d, a.id, b.id, true, 'actuelle', '1975-10-25').donnees;
    const evs = evenementsAVenir(d, AUJOURDHUI, 30);
    expect(evs.map(detailEvenement)).toEqual(['anniversaire', 'fête · Sainte Céline', 'décès en 2015', '51 ans de mariage']);
    expect(depuisUnion(evs[3])).toBe('mariés le 25 octobre 1975');
  });

  it('date une vignette, avec le mois s’il change', () => {
    expect(quandCourt({ annee: 2026, mois: 10, jour: 23 }, AUJOURDHUI)).toBe('ven. 23');
    expect(quandCourt({ annee: 2026, mois: 11, jour: 1 }, AUJOURDHUI)).toBe('dim. 1er nov.');
  });

  it('met une pastille de date : le jour de la semaine, ou le mois s’il change', () => {
    expect(pastilleJour({ annee: 2026, mois: 10, jour: 23 }, AUJOURDHUI)).toEqual({ haut: 'ven', jour: '23' });
    expect(pastilleJour({ annee: 2026, mois: 11, jour: 1 }, AUJOURDHUI)).toEqual({ haut: 'nov', jour: '1er' });
  });
});

describe('estDansLeFutur', () => {
  it('ne refuse que les dates entièrement à venir', () => {
    expect(estDansLeFutur('2027', AUJOURDHUI)).toBe(true);
    expect(estDansLeFutur('2026', AUJOURDHUI)).toBe(false);
    expect(estDansLeFutur('2026-11', AUJOURDHUI)).toBe(true);
    expect(estDansLeFutur('2026-10', AUJOURDHUI)).toBe(false);
    expect(estDansLeFutur('2026-10-22', AUJOURDHUI)).toBe(true);
    expect(estDansLeFutur('2026-10-21', AUJOURDHUI)).toBe(false);
    expect(estDansLeFutur('--12-25', AUJOURDHUI)).toBe(false);
    expect(estDansLeFutur(undefined, AUJOURDHUI)).toBe(false);
  });
});
