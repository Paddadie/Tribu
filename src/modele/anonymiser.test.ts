import { describe, expect, it } from 'vitest';
import { anonymiser, ID_MOI } from './anonymiser';
import { disposerArbre } from './arbreGlobal';
import { ajouterFiliation, ajouterFrereSansParent, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import { PARENT_INCONNU } from './parentSansNom';
import type { ChampsPersonne } from './modele';
import type { Donnees } from './types';

/** Deux lignées, un ex, une adoption, une fratrie sans parent connu, un groupe d'amis nommé et un sans nom. */
function famille() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  const pers = (cle: string, champs: ChampsPersonne) => {
    const r = creerPersonne(d, champs);
    d = r.donnees;
    id[cle] = r.personne.id;
  };
  pers('moi', { prenom: 'Bastien', nom: 'Lefort', sexe: 'M', naissance: '1990-04-02', note: 'Secret de Bastien' });
  pers('conj', { prenom: 'Aurore', nom: 'Lefort', nomNaissance: 'Mercier', sexe: 'F', naissance: '1991', note: 'Note' });
  pers('pere', { prenom: 'Gaston', nom: 'Lefort', sexe: 'M', naissance: '1960-01', deces: '2020-05-03' });
  pers('mere', { prenom: 'Yvette', nom: 'Lefort', nomNaissance: 'Roux', sexe: 'F', naissance: '1962' });
  pers('ex', { prenom: 'Coralie', nom: 'Delmas', sexe: 'F', naissance: '1965' });
  pers('demi', { prenom: 'Félix', nom: 'Lefort', sexe: 'M', naissance: '1985' });
  pers('soeur', { prenom: 'Anaïs', nom: 'Lefort', sexe: 'F', naissance: '1993' });
  pers('enfant', { prenom: 'Zélie', nom: 'Lefort', sexe: 'F', naissance: '2020' });
  pers('adopte', { prenom: 'Bastien', nom: 'Mercier', sexe: 'M', naissance: '--06-01' });
  pers('cousin', { prenom: 'Romain', nom: 'Roux', sexe: 'M' });
  pers('cousine', { prenom: 'Élodie', nom: 'Roux ', sexe: 'F' });
  pers('ami', { prenom: 'Hugo', nom: 'Vasseur', sexe: 'M', naissance: '1989' });
  pers('amie', { prenom: 'Inès', nom: 'Vasseur', sexe: 'F', naissance: '1990' });
  pers('voisin', { prenom: 'Marc', nom: '', sexe: 'M', decede: true });
  d = ajouterUnion(d, id.moi, id.conj, true).donnees;
  d = ajouterUnion(d, id.pere, id.mere, true).donnees;
  d = ajouterUnion(d, id.pere, id.ex, false, 'separee').donnees;
  d = ajouterUnion(d, id.ami, id.amie).donnees;
  for (const e of ['moi', 'soeur']) for (const p of ['pere', 'mere']) d = ajouterFiliation(d, id[p], id[e], 'biologique').donnees;
  d = ajouterFiliation(d, id.pere, id.demi, 'biologique').donnees;
  d = ajouterFiliation(d, id.ex, id.demi, 'biologique').donnees;
  for (const p of ['moi', 'conj']) d = ajouterFiliation(d, id[p], id.enfant, 'biologique').donnees;
  d = ajouterFiliation(d, id.conj, id.adopte, 'adoptif').donnees;
  d = ajouterFrereSansParent(d, id.cousin, id.cousine);
  d = creerGroupe(d, [id.moi, id.ami], 'Escalade').donnees;
  d = creerGroupe(d, [id.soeur, id.voisin, id.cousin]).donnees;
  return { d, id };
}

describe('anonymiser', () => {
  const { d, id } = famille();
  const a = anonymiser(d, id.moi);

  it('ne garde aucun prénom, nom, note ni date réels', () => {
    const texte = JSON.stringify(a);
    const reels = d.personnes.flatMap((p) => [p.prenom, p.nom.trim(), p.nomNaissance ?? '', p.note, p.deces ?? '']);
    for (const v of [...reels, 'Escalade', ...d.personnes.map((p) => p.id)].filter((v) => v.length > 1 && v !== PARENT_INCONNU)) expect(texte).not.toContain(v);
    expect(a.personnes.every((p) => p.note === '' && p.deces === undefined)).toBe(true);
    d.personnes.forEach((p, i) => p.naissance && expect(a.personnes[i].naissance).not.toBe(p.naissance));
  });

  it('garde la forme : ordre, liens, sexes, décès, parent inconnu ; Moi devient « moi »', () => {
    expect(a.personnes.map((p) => p.id)[0]).toBe(ID_MOI);
    expect(a.personnes.length).toBe(d.personnes.length);
    expect(a.personnes.map((p) => [p.sexe, !!p.decede || !!p.deces, !!p.inconnu])).toEqual(
      d.personnes.map((p) => [p.sexe, !!p.decede || !!p.deces, !!p.inconnu]),
    );
    expect(a.unions.map((u) => [u.marie, u.statut])).toEqual(d.unions.map((u) => [u.marie, u.statut]));
    expect(a.filiations.map((f) => f.type)).toEqual(d.filiations.map((f) => f.type));
    expect(a.groupes.map((g) => g.membres.length)).toEqual(d.groupes.map((g) => g.membres.length));
    expect(a.groupes[1].nom).toBe('');
    const i = d.personnes.findIndex((p) => p.inconnu);
    expect(i).toBeGreaterThan(0);
    expect(a.personnes[i].prenom).toBe(d.personnes[i].prenom);
  });

  it('un même nom donne le même mot (noms de naissance compris, espaces ignorés), dans le même ordre', () => {
    const nom = (cle: string) => a.personnes[d.personnes.findIndex((p) => p.id === id[cle])];
    expect(nom('pere').nom).toBe(nom('moi').nom);
    expect(nom('cousine').nom).toBe(nom('cousin').nom);
    expect(nom('conj').nomNaissance).toBe(nom('adopte').nom);
    expect(nom('mere').nomNaissance).toBe(nom('cousin').nom);
    expect(nom('adopte').prenom).toBe(nom('moi').prenom);
    expect(nom('voisin').nom).toBe('');
    const ordre = (ps: string[]) => [...ps].sort((x, y) => x.localeCompare(y, 'fr'));
    const indices = (ps: string[]) => ordre(ps).map((x) => ps.indexOf(x));
    expect(indices(a.personnes.map((p) => p.prenom))).toEqual(indices(d.personnes.map((p) => p.prenom)));
    expect(indices(a.personnes.map((p) => p.nom))).toEqual(indices(d.personnes.map((p) => p.nom.trim())));
  });

  it('les années inventées gardent l’ordre des naissances ; une date sans année disparaît', () => {
    const avecAnnee = d.personnes.flatMap((p, i) => (p.naissance && /^\d{4}/.test(p.naissance) ? [i] : []));
    const parDate = (ds: (string | undefined)[]) => [...avecAnnee].sort((x, y) => (ds[x]! < ds[y]! ? -1 : ds[x]! > ds[y]! ? 1 : x - y));
    expect(parDate(a.personnes.map((p) => p.naissance))).toEqual(parDate(d.personnes.map((p) => p.naissance)));
    expect(a.personnes.filter((p) => p.naissance).length).toBe(avecAnnee.length);
    expect(a.personnes.every((p) => !p.naissance || /^\d{4}$/.test(p.naissance))).toBe(true);
  });

  it('ne change pas la disposition de l’arbre global', () => {
    const avant = disposerArbre(d, id.moi);
    const apres = disposerArbre(a, ID_MOI);
    const rang = (ps: Donnees['personnes'], pid: string) => ps.findIndex((p) => p.id === pid);
    const places = (disp: typeof avant, ps: Donnees['personnes']) => disp.places.map((pl) => [rang(ps, pl.personne.id), pl.x, pl.y, pl.bulle]);
    expect(places(apres, a.personnes)).toEqual(places(avant, d.personnes));
    expect(apres.branches.length).toBe(avant.branches.length);
    expect(apres.etiquettes.map((e) => [e.x, e.y])).toEqual(avant.etiquettes.map((e) => [e.x, e.y]));
  });
});
