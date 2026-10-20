import { describe, expect, it } from 'vitest';
import { FusionAnnulee, fusionner, type Question } from './fusion';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import type { Donnees } from './types';

/** Arbitre scripté : répond dans l'ordre et note les questions posées. */
function arbitre(reponses: (number | null)[]) {
  const questions: Question[] = [];
  return { questions, demander: async (q: Question) => (questions.push(q), reponses.length >= questions.length ? reponses[questions.length - 1] : 0) };
}
const copie = (d: Donnees): Donnees => JSON.parse(JSON.stringify(d));

function base() {
  let d = donneesVides();
  const a = creerPersonne(d, { prenom: 'Alix', nom: 'Morel' });
  d = a.donnees;
  const b = creerPersonne(d, { prenom: 'Basile', nom: 'Morel' });
  d = b.donnees;
  return { d, a: a.personne.id, b: b.personne.id };
}

describe('fusionner', () => {
  it('ajoute ce qui est nouveau sans poser de question', async () => {
    const { d } = base();
    const autre = creerPersonne(donneesVides(), { prenom: 'Cyrille', nom: 'Dubois' }).donnees;
    const { demander, questions } = arbitre([]);
    const r = await fusionner(d, autre, demander);
    expect(questions).toEqual([]);
    expect(r.donnees.personnes.map((p) => p.prenom)).toEqual(['Alix', 'Basile', 'Cyrille']);
    expect(r).toMatchObject({ ajoutees: 1, fusionnees: 0, ignores: 0 });
  });

  it('est idempotente : fusionner un fichier avec lui-même ne change rien', async () => {
    let { d, a, b } = base();
    d = ajouterUnion(d, a, b, true, 'actuelle', '2010').donnees;
    d = creerGroupe(d, [a, b], 'Amis').donnees;
    const { demander, questions } = arbitre([]);
    const r = await fusionner(d, copie(d), demander);
    expect(questions).toEqual([]);
    expect(r.donnees).toEqual(d);
  });

  it('complète un champ vide et précise une date sans question', async () => {
    const { d, a } = base();
    d.personnes[0].naissance = '1980';
    const f = copie(d);
    f.personnes[0].naissance = '1980-03-02';
    f.personnes[0].sexe = 'F';
    f.personnes[0].decede = true;
    const { demander, questions } = arbitre([]);
    const r = await fusionner(d, f, demander);
    expect(questions).toEqual([]);
    expect(r.donnees.personnes.find((p) => p.id === a)).toMatchObject({ naissance: '1980-03-02', sexe: 'F', decede: true });
  });

  it('demande quelle date garder en cas de conflit, et respecte la réponse', async () => {
    const { d, a } = base();
    d.personnes[0].naissance = '1980-03-02';
    const f = copie(d);
    f.personnes[0].naissance = '1981-03-02';
    const garde = arbitre([0]);
    expect((await fusionner(d, f, garde.demander)).donnees.personnes.find((p) => p.id === a)!.naissance).toBe('1980-03-02');
    expect(garde.questions).toHaveLength(1);
    expect(garde.questions[0].texte).toContain('naissance');
    const prend = arbitre([1]);
    expect((await fusionner(d, f, prend.demander)).donnees.personnes.find((p) => p.id === a)!.naissance).toBe('1981-03-02');
  });

  it('propose de garder les deux notes', async () => {
    const { d, a } = base();
    d.personnes[0].note = 'Aime le thé';
    const f = copie(d);
    f.personnes[0].note = 'Allergique aux noix';
    const r = await fusionner(d, f, arbitre([2]).demander);
    expect(r.donnees.personnes.find((p) => p.id === a)!.note).toBe('Aime le thé\n\nAllergique aux noix');
  });

  it('demande si deux homonymes sont la même personne', async () => {
    const { d, a } = base();
    const f = creerPersonne(donneesVides(), { prenom: 'alix', nom: 'MOREL', naissance: '1990' }).donnees;
    const oui = arbitre([0]);
    const r = await fusionner(d, f, oui.demander);
    expect(oui.questions[0].texte).toContain('même personne');
    expect(r.donnees.personnes).toHaveLength(2);
    expect(r.donnees.personnes.find((p) => p.id === a)!.naissance).toBe('1990');
    expect(r.fusionnees).toBe(1);

    const non = await fusionner(d, f, arbitre([1]).demander);
    expect(non.donnees.personnes).toHaveLength(3);
    expect(non.ajoutees).toBe(1);
  });

  it('ne pose pas la question quand les naissances sont incompatibles (père et fils)', async () => {
    const { d } = base();
    d.personnes[0].naissance = '1950';
    const f = creerPersonne(donneesVides(), { prenom: 'Alix', nom: 'Morel', naissance: '1980' }).donnees;
    const { demander, questions } = arbitre([]);
    expect((await fusionner(d, f, demander)).donnees.personnes).toHaveLength(3);
    expect(questions).toEqual([]);
  });

  it('rattache les liens d’un homonyme confirmé à la personne existante', async () => {
    const { d, a } = base();
    let f = creerPersonne(donneesVides(), { prenom: 'Alix', nom: 'Morel' }).donnees;
    const enfant = creerPersonne(f, { prenom: 'Dana', nom: 'Morel' });
    f = ajouterFiliation(enfant.donnees, f.personnes[0].id, enfant.personne.id, 'biologique').donnees;
    const r = await fusionner(d, f, arbitre([0]).demander);
    expect(r.donnees.personnes).toHaveLength(3);
    expect(r.donnees.filiations).toMatchObject([{ parent: a, enfant: enfant.personne.id }]);
  });

  it('ajoute unions, filiations et groupes du fichier', async () => {
    const { d, a, b } = base();
    let f = copie(d);
    f = ajouterUnion(f, a, b, false, 'actuelle').donnees;
    const e = creerPersonne(f, { prenom: 'Dana', nom: 'Morel' });
    f = ajouterFiliation(e.donnees, a, e.personne.id, 'biologique').donnees;
    f = creerGroupe(f, [a, e.personne.id], 'Voisins').donnees;
    const { demander, questions } = arbitre([]);
    const r = await fusionner(d, f, demander);
    expect(questions).toEqual([]);
    expect(r.donnees.unions).toHaveLength(1);
    expect(r.donnees.filiations).toHaveLength(1);
    expect(r.donnees.groupes).toHaveLength(1);
  });

  it('une union connue sous une autre id est reconnue par ses deux personnes', async () => {
    const { d, a, b } = base();
    const chez = ajouterUnion(d, a, b, false, 'actuelle').donnees;
    const fichier = ajouterUnion(d, b, a, false, 'actuelle').donnees;
    const r = await fusionner(chez, fichier, arbitre([]).demander);
    expect(r.donnees.unions).toHaveLength(1);
  });

  it('demande quand une union change de statut ou de mariage', async () => {
    const { d, a, b } = base();
    const chez = ajouterUnion(d, a, b, false, 'actuelle').donnees;
    const fichier = copie(chez);
    fichier.unions[0].statut = 'separee';
    fichier.unions[0].marie = true;
    const { demander, questions } = arbitre([1, 1]);
    const r = await fusionner(chez, fichier, demander);
    expect(questions).toHaveLength(2);
    expect(r.donnees.unions[0]).toMatchObject({ statut: 'separee', marie: true });
  });

  it('demande qui reste conjoint actuel quand le fichier en apporte un autre', async () => {
    const { d, a, b } = base();
    const c = creerPersonne(d, { prenom: 'Cléa', nom: 'Roux' });
    const chez = ajouterUnion(c.donnees, a, b, false, 'actuelle').donnees;
    const fichier = ajouterUnion(c.donnees, a, c.personne.id, false, 'actuelle').donnees;

    const garde = await fusionner(chez, fichier, arbitre([0]).demander);
    expect(garde.donnees.unions.map((u) => u.statut).sort()).toEqual(['actuelle', 'separee']);
    expect(garde.donnees.unions.find((u) => u.statut === 'actuelle')!.personneB).toBe(b);

    const prend = await fusionner(chez, fichier, arbitre([1]).demander);
    expect(prend.donnees.unions.find((u) => u.statut === 'actuelle')!.personneB).toBe(c.personne.id);
  });

  it('demande quand le type de filiation diffère', async () => {
    const { d, a, b } = base();
    const chez = ajouterFiliation(d, a, b, 'biologique').donnees;
    const fichier = copie(chez);
    fichier.filiations[0].type = 'adoptif';
    const r = await fusionner(chez, fichier, arbitre([1]).demander);
    expect(r.donnees.filiations[0].type).toBe('adoptif');
  });

  it('ignore un lien qui ferait une boucle de parenté', async () => {
    const { d, a, b } = base();
    const chez = ajouterFiliation(d, a, b, 'biologique').donnees; // a parent de b
    const fichier = copie(d);
    fichier.filiations.push({ id: 'f-x', parent: b, enfant: a, type: 'biologique' }); // b parent de a
    const { demander, questions } = arbitre([]);
    const r = await fusionner(chez, fichier, demander);
    expect(questions).toEqual([]);
    expect(r.ignores).toBe(1);
    expect(r.donnees.filiations).toHaveLength(1);
  });

  it('propose de remplacer un parent quand il y en aurait trois du même type', async () => {
    let { d, a, b } = base();
    const c = creerPersonne(d, { prenom: 'Cléa', nom: 'Roux' });
    const e = creerPersonne(c.donnees, { prenom: 'Dana', nom: 'Morel' });
    d = ajouterFiliation(e.donnees, a, e.personne.id, 'biologique').donnees;
    d = ajouterFiliation(d, b, e.personne.id, 'biologique').donnees;
    const fichier = ajouterFiliation(copie({ ...d, filiations: [] }), c.personne.id, e.personne.id, 'biologique').donnees;

    const ignore = await fusionner(d, fichier, arbitre([0]).demander);
    expect(ignore.donnees.filiations.map((f) => f.parent).sort()).toEqual([a, b].sort());
    expect(ignore.ignores).toBe(1);

    const remplace = await fusionner(d, fichier, arbitre([1]).demander);
    const parents = remplace.donnees.filiations.map((f) => f.parent);
    expect(parents).toHaveLength(2);
    expect(parents).toContain(c.personne.id);
    expect(parents).not.toContain(a);
  });

  it('additionne les membres d’un groupe et demande le nom en cas de conflit', async () => {
    let { d, a, b } = base();
    const c = creerPersonne(d, { prenom: 'Cléa', nom: 'Roux' });
    const chez = creerGroupe(c.donnees, [a, b], 'Collègues').donnees;
    const fichier = copie(chez);
    fichier.groupes[0].membres = [a, c.personne.id];
    fichier.groupes[0].nom = 'Travail';
    const { demander, questions } = arbitre([1]);
    const r = await fusionner(chez, fichier, demander);
    expect(questions).toHaveLength(1);
    expect(r.donnees.groupes).toHaveLength(1);
    expect(r.donnees.groupes[0].nom).toBe('Travail');
    expect([...r.donnees.groupes[0].membres].sort()).toEqual([a, b, c.personne.id].sort());
  });

  it('abandonne sans rien produire quand l’utilisateur annule', async () => {
    const { d } = base();
    const f = copie(d);
    f.personnes[0].naissance = '1980';
    d.personnes[0].naissance = '1970';
    await expect(fusionner(d, f, arbitre([null]).demander)).rejects.toBeInstanceOf(FusionAnnulee);
  });

  it('ne modifie pas les données reçues', async () => {
    const { d } = base();
    d.personnes[0].naissance = '1970';
    const f = copie(d);
    f.personnes[0].naissance = '1980';
    const avant = copie(d);
    await fusionner(d, f, arbitre([1]).demander);
    expect(d).toEqual(avant);
  });
});
