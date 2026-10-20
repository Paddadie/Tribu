import { describe, expect, it } from 'vitest';
import { bilanAgenda, construireIcs, evenementsAgenda } from './agenda';
import { ajouterUnion, creerPersonne, donneesVides } from './modele';

const MAINTENANT = new Date('2026-10-20T08:30:00Z');

function carnet() {
  let d = donneesVides();
  const a = creerPersonne(d, { prenom: 'Camille', nom: 'Test', naissance: '1990-03-14' });
  d = a.donnees;
  const b = creerPersonne(d, { prenom: 'Joseph', nom: 'Test', naissance: '1940-02-29', deces: '2010-11-02' });
  d = b.donnees;
  const c = creerPersonne(d, { prenom: 'Léa', nom: 'Test', naissance: '--07-01' });
  d = c.donnees;
  const e = creerPersonne(d, { prenom: 'Marc', nom: 'Test', naissance: '1985-05' });
  d = e.donnees;
  d = ajouterUnion(d, c.personne.id, e.personne.id, true, 'actuelle', '2012-06-09').donnees;
  return { d, a: a.personne, b: b.personne, c: c.personne, e: e.personne };
}

describe('evenementsAgenda', () => {
  it('liste naissances, décès et unions datées, triés par mois et jour', () => {
    const { d } = carnet();
    const ev = evenementsAgenda(d);
    expect(ev.map((x) => `${x.mois}/${x.jour} ${x.titre}`)).toEqual([
      '2/29 Anniversaire de Joseph Test',
      '3/14 Anniversaire de Camille Test',
      '6/9 Anniversaire de mariage de Léa Test et Marc Test',
      '7/1 Anniversaire de Léa Test',
      '11/2 Souvenir de Joseph Test',
    ]);
    expect(bilanAgenda(ev)).toEqual({ naissances: 3, deces: 1, unions: 1 });
  });

  it('ignore une date sans jour et une union séparée', () => {
    const { d, c, e } = carnet();
    const sansUnion = { ...d, unions: d.unions.map((u) => ({ ...u, statut: 'separee' as const })) };
    const ev = evenementsAgenda(sansUnion);
    expect(ev.some((x) => x.type === 'union')).toBe(false);
    expect(ev.some((x) => x.uid.startsWith(e.id))).toBe(false);
    expect(ev.some((x) => x.uid.startsWith(c.id))).toBe(true);
  });

  it('donne des UID stables (id + type)', () => {
    const { d, a } = carnet();
    expect(evenementsAgenda(d).find((x) => x.titre.includes('Camille'))!.uid).toBe(`${a.id}-naissance@tribu`);
    expect(evenementsAgenda(d).map((x) => x.uid)).toEqual(evenementsAgenda(d).map((x) => x.uid));
  });
});

describe('construireIcs', () => {
  const ics = construireIcs(evenementsAgenda(carnet().d), MAINTENANT);

  it('a la structure d’un calendrier avec fins de ligne CRLF', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(5);
    expect(ics).toContain('X-WR-CALNAME:Tribu');
    expect(ics).toContain('DTSTAMP:20261020T083000Z');
  });

  it('répète chaque année et garde l’année connue', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:19900314\r\nRRULE:FREQ=YEARLY\r\n');
    expect(ics).toContain('DESCRIPTION:Naissance en 1990.');
  });

  it('place une naissance sans année sur une année bissextile de départ', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20000701');
  });

  it('replie le 29 février sur le dernier jour de février', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:19400229\r\nRRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1');
  });

  it('plie les lignes longues sans dépasser 75 caractères', () => {
    const long = construireIcs([{ uid: 'x@tribu', type: 'naissance', titre: 'Anniversaire de ' + 'Élodie '.repeat(20), mois: 1, jour: 2 }], MAINTENANT);
    for (const ligne of long.split('\r\n')) expect(Array.from(ligne).length).toBeLessThanOrEqual(75);
  });

  it('échappe virgules et points-virgules', () => {
    const t = construireIcs([{ uid: 'x@tribu', type: 'naissance', titre: 'A, B; C', mois: 1, jour: 2 }], MAINTENANT);
    expect(t).toContain('SUMMARY:A\\, B\\; C');
  });
});
