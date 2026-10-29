import { describe, expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { etiquette } from './parente';
import { autreParent, chemin } from './deductions';
import { familleProche } from './familleProche';
import { ajouterFiliation, creerPersonne, definirMariageParents, donneesVides, modifierPersonne, personnesListees, personnesVisibles } from './modele';
import { avecParentsSansNom, enregistrerParentSansNom, estParentSansNom, estVirtuel, PARENT_INCONNU } from './parentSansNom';
import type { Donnees } from './types';

/** Florence a un enfant, Sabine, sans autre parent connu. Moi = Sabine. */
function seul() {
  let d: Donnees = donneesVides();
  const f = creerPersonne(d, { prenom: 'Florence', nom: 'B' });
  d = f.donnees;
  const s = creerPersonne(d, { prenom: 'Sabine', nom: 'B' });
  d = ajouterFiliation(s.donnees, f.personne.id, s.personne.id, 'biologique').donnees;
  return { d, florence: f.personne.id, sabine: s.personne.id };
}

describe('Parent sans nom (enfant à parent seul)', () => {
  it('dessine un « ? » à côté du parent connu, relié en pointillés gris, enfant dessous', () => {
    const { d, florence, sabine } = seul();
    const disp = disposerArbre(d, sabine);
    const inconnu = disp.places.find((p) => estVirtuel(p.personne.id));
    expect(inconnu).toBeDefined();
    expect(estParentSansNom(inconnu!.personne)).toBe(true);
    const f = disp.places.find((p) => p.personne.id === florence)!;
    const s = disp.places.find((p) => p.personne.id === sabine)!;
    expect(inconnu!.y).toBe(f.y);
    expect(Math.abs(inconnu!.x - f.x)).toBeLessThan(2);
    expect(s.y).toBeGreaterThan(f.y);
    expect(disp.couples).toEqual([expect.objectContaining({ separe: true, marie: false })]);
    expect(disp.branches).toHaveLength(1);
    expect(disp.branches[0].origines).toHaveLength(1);
  });

  it('ne touche pas aux données et n’ajoute rien pour un enfant qui a deux parents', () => {
    const { d, sabine } = seul();
    const autre = creerPersonne(d, { prenom: 'Luc', nom: 'B' });
    const complet = ajouterFiliation(autre.donnees, autre.personne.id, sabine, 'biologique').donnees;
    expect(avecParentsSansNom(complet)).toBe(complet);
    expect(d.personnes).toHaveLength(2);
  });

  it('enregistre le parent « ? » pour tous les enfants du même parent seul', () => {
    const { d, florence, sabine } = seul();
    const frere = creerPersonne(d, { prenom: 'Marc', nom: 'B' });
    const deux = ajouterFiliation(frere.donnees, florence, frere.personne.id, 'biologique').donnees;
    const r = enregistrerParentSansNom(deux, `virtuel:${florence}`)!;
    expect(r.personne.prenom).toBe(PARENT_INCONNU);
    expect(
      r.donnees.filiations
        .filter((f) => f.parent === r.personne.id)
        .map((f) => f.enfant)
        .sort(),
    ).toEqual([sabine, frere.personne.id].sort());
    // Plus aucun « ? » virtuel : les enfants ont maintenant deux parents.
    expect(avecParentsSansNom(r.donnees)).toBe(r.donnees);
  });

  it('une fois enregistré, on peut le renommer ou y ajouter une note', () => {
    const { d, florence, sabine } = seul();
    const r = enregistrerParentSansNom(d, `virtuel:${florence}`)!;
    const note = modifierPersonne(r.donnees, r.personne.id, { prenom: PARENT_INCONNU, nom: '', note: 'Parti avant la naissance', decede: true });
    expect(estParentSansNom(note.personnes.find((p) => p.id === r.personne.id)!)).toBe(true);
    const nomme = modifierPersonne(note, r.personne.id, { prenom: 'Jean', nom: 'D', note: '' });
    expect(estParentSansNom(nomme.personnes.find((p) => p.id === r.personne.id)!)).toBe(false);
    expect(disposerArbre(nomme, sabine).places.some((p) => estVirtuel(p.personne.id))).toBe(false);
  });

  it('n’apparaît pas dans la liste tant qu’il n’a pas de nom', () => {
    const { d, florence } = seul();
    const r = enregistrerParentSansNom(d, `virtuel:${florence}`)!;
    expect(
      personnesListees(r.donnees)
        .map((p) => p.prenom)
        .sort(),
    ).toEqual(['Florence', 'Sabine']);
    expect(personnesVisibles(r.donnees)).toHaveLength(3);
    const nomme = modifierPersonne(r.donnees, r.personne.id, { prenom: 'Jean', nom: 'D', note: '' });
    expect(personnesListees(nomme)).toHaveLength(3);
  });

  it('ignore les parents inconnus cachés (fratrie sans parent connu)', () => {
    let d: Donnees = donneesVides();
    const a = creerPersonne(d, { prenom: 'A', nom: 'X' });
    const b = creerPersonne(a.donnees, { prenom: 'B', nom: 'X' });
    d = { ...b.donnees, personnes: [...b.donnees.personnes, { id: 'i', prenom: '', nom: '', note: '', inconnu: true }] };
    d = ajouterFiliation(d, 'i', a.personne.id, 'biologique').donnees;
    d = ajouterFiliation(d, 'i', b.personne.id, 'biologique').donnees;
    expect(avecParentsSansNom(d)).toBe(d);
  });
});

describe('Fiche du parent sans nom', () => {
  it('montre l’autre parent (pointillé), l’enfant et la fratrie, dans les deux sens', () => {
    const { d, florence, sabine } = seul();
    const frere = creerPersonne(d, { prenom: 'Marc', nom: 'B' });
    const deux = ajouterFiliation(frere.donnees, florence, frere.personne.id, 'biologique').donnees;
    const r = enregistrerParentSansNom(deux, `virtuel:${florence}`)!;
    const f = familleProche(r.donnees, r.personne.id, sabine);
    // Sans union enregistrée : un co-parent en pointillé, pas un conjoint.
    expect(f.conjoint).toBeNull();
    expect(f.partenaires).toEqual([{ id: florence, statut: null }]);
    expect(f.enfants.map((e) => e.id).sort()).toEqual([sabine, frere.personne.id].sort());
    expect(f.enfants.every((e) => e.autre === florence)).toBe(true);
    expect(autreParent(r.donnees, florence)?.id).toBe(r.personne.id);
  });

  it('a un « Lien avec toi » même si la parenté n’a pas de nom', () => {
    const { d, florence, sabine } = seul();
    const r = enregistrerParentSansNom(d, `virtuel:${florence}`)!;
    expect(chemin(r.donnees, sabine, r.personne.id)?.map((e) => e.personne.id)).toEqual([sabine, r.personne.id]);
  });

  it('« Marié avec » crée une union séparée, la modifie, et la retire une fois décochée', () => {
    const { d, florence } = seul();
    const r = enregistrerParentSansNom(d, `virtuel:${florence}`)!;
    const m = definirMariageParents(r.donnees, r.personne.id, florence, true);
    expect(m.unions).toEqual([expect.objectContaining({ marie: true, statut: 'separee' })]);
    expect(familleProche(m, r.personne.id).partenaires).toEqual([{ id: florence, statut: 'separee' }]);
    expect(definirMariageParents(m, r.personne.id, florence, false).unions).toHaveLength(0);
  });

  it('l’étiquette « Lien avec toi » ne plante pas pour un cousin éloigné sans nom usuel', () => {
    let { d, florence, sabine } = seul();
    const papi = creerPersonne(d, { prenom: 'Papi', nom: 'B' });
    const cath = creerPersonne(papi.donnees, { prenom: 'Cath', nom: 'B' });
    const toi = creerPersonne(cath.donnees, { prenom: 'Toi', nom: 'B' });
    d = ajouterFiliation(toi.donnees, papi.personne.id, cath.personne.id, 'biologique').donnees;
    d = ajouterFiliation(d, papi.personne.id, florence, 'biologique').donnees;
    d = ajouterFiliation(d, cath.personne.id, toi.personne.id, 'biologique').donnees;
    const r = enregistrerParentSansNom(d, `virtuel:${florence}`)!;
    expect(() => etiquette(r.donnees, toi.personne.id, r.personne.id)).not.toThrow();
    expect(chemin(r.donnees, toi.personne.id, r.personne.id)).toBeDefined();
    expect(sabine).toBeDefined();
  });
});
