// Données v6 (V4, lot 1) : lieux, « à compléter » ignoré, rappels coupés, présomption de fratrie, migration et fusion.
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/arbre-anonyme.json';
import { evenementsAVenir } from './evenements';
import { filtrerListe } from './filtres';
import { fusionner } from './fusion';
import { migrer } from './migration';
import {
  ajouterFiliation,
  ajouterFiliations,
  ajouterUnion,
  creerPersonne,
  donneesVides,
  fratriePresumee,
  modifierLieuUnion,
  modifierPersonne,
  modifierUnion,
} from './modele';
import { avecParentsSansNom, enregistrerParentSansNom, remplacerParent } from './parentSansNom';
import { CLE_AVANT_V6, CLE_STOCKAGE, charger, estDonneesValides } from './stockage';
import type { Donnees, Personne } from './types';

const copie = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const qui = (d: Donnees, id: string) => d.personnes.find((p) => p.id === id)!;

function ajouter(d: Donnees, champs: Partial<Personne> & { prenom: string }): [Donnees, string] {
  const r = creerPersonne(d, { nom: 'Morel', ...champs });
  return [r.donnees, r.personne.id];
}

describe('lieux', () => {
  it('lieux de naissance et de décès élagués ; le lieu de décès seulement pour un défunt', () => {
    let [d, a] = ajouter(donneesVides(), { prenom: 'Alix', lieuNaissance: '  Nantes ', lieuDeces: 'Brest' });
    expect(qui(d, a).lieuNaissance).toBe('Nantes');
    expect(qui(d, a).lieuDeces).toBeUndefined();
    d = modifierPersonne(d, a, { prenom: 'Alix', nom: 'Morel', decede: true, lieuDeces: 'Brest', lieuNaissance: '  ' });
    expect(qui(d, a)).toMatchObject({ lieuDeces: 'Brest' });
    expect(qui(d, a).lieuNaissance).toBeUndefined();
  });

  it('un écran qui n’envoie pas les nouveaux champs ne les efface pas', () => {
    let [d, a] = ajouter(donneesVides(), { prenom: 'Alix', lieuNaissance: 'Nantes', sansRappel: true, ignorerIncomplet: true });
    d = modifierPersonne(d, a, { prenom: 'Alix', nom: 'Morel', note: 'cousine' });
    expect(qui(d, a)).toMatchObject({ lieuNaissance: 'Nantes', sansRappel: true, ignorerIncomplet: true, note: 'cousine' });
    d = modifierPersonne(d, a, { prenom: 'Alix', nom: 'Morel', sansRappel: false, ignorerIncomplet: false });
    expect(qui(d, a).sansRappel).toBeUndefined();
    expect(qui(d, a).ignorerIncomplet).toBeUndefined();
  });

  it('lieu d’union : mariage seulement, perdu si le mariage est retiré', () => {
    let [d, a] = ajouter(donneesVides(), { prenom: 'Alix' });
    let b: string;
    [d, b] = ajouter(d, { prenom: 'Basile' });
    const u = ajouterUnion(d, a, b, false);
    expect(() => modifierLieuUnion(u.donnees, u.union.id, 'Valbrume')).toThrow('mariage');
    expect(modifierLieuUnion(u.donnees, u.union.id, '')).toEqual(u.donnees);
    d = modifierLieuUnion(modifierUnion(u.donnees, u.union.id, true, false), u.union.id, ' Valbrume ');
    expect(d.unions[0].lieu).toBe('Valbrume');
    expect(modifierLieuUnion(d, u.union.id, undefined).unions[0].lieu).toBeUndefined();
    expect(modifierUnion(d, u.union.id, false).unions[0].lieu).toBeUndefined();
  });
});

describe('« à compléter » ignoré et rappels coupés', () => {
  it('`ignorerIncomplet` sort la personne du filtre « à compléter »', () => {
    let [d, a] = ajouter(donneesVides(), { prenom: 'Alix' });
    let b: string;
    [d, b] = ajouter(d, { prenom: 'Basile', ignorerIncomplet: true });
    const ids = filtrerListe(d, d.personnes, { filtre: 'acompleter' }).map((p) => p.id);
    expect(ids).toContain(a);
    expect(ids).not.toContain(b);
  });

  it('`sansRappel` coupe anniversaires, fête, décès et unions de la personne', () => {
    const aujourdhui = new Date(2026, 9, 21);
    let [d, a] = ajouter(donneesVides(), { prenom: 'Céline', naissance: '1990-10-25', deces: '2020-10-26', sansRappel: true });
    let b: string;
    [d, b] = ajouter(d, { prenom: 'Basile', naissance: '1988-10-27' });
    d = ajouterUnion(d, a, b, true, 'actuelle', '2015-10-28').donnees;
    const evs = evenementsAVenir(d, aujourdhui, 30, { fetes: true });
    expect(evs.flatMap((e) => e.personnes.map((p) => p.id))).toEqual([b]);
  });
});

describe('présomption de fratrie', () => {
  /** Paul seul parent connu de Léa et Tom ; Zoé a aussi Marc ; Noé est adopté par Paul. */
  function famille() {
    let d = donneesVides();
    const ids: Record<string, string> = {};
    for (const prenom of ['Paul', 'Marc', 'Lea', 'Tom', 'Zoe', 'Noe', 'Ines']) [d, ids[prenom]] = ajouter(d, { prenom });
    for (const e of ['Lea', 'Tom', 'Zoe']) d = ajouterFiliation(d, ids.Paul, ids[e], 'biologique').donnees;
    d = ajouterFiliation(d, ids.Marc, ids.Zoe, 'biologique').donnees;
    d = ajouterFiliation(d, ids.Paul, ids.Noe, 'adoptif').donnees;
    return { d, ids };
  }

  it('propose les enfants du même parent seul, même lien ; ni demi, ni adopté', () => {
    const { d, ids } = famille();
    expect(fratriePresumee(d, ids.Lea, 'biologique').map((p) => p.id)).toEqual([ids.Tom]);
    expect(fratriePresumee(d, ids.Noe, 'adoptif')).toEqual([]);
    expect(fratriePresumee(d, ids.Zoe, 'biologique')).toEqual([]);
  });

  it('le second parent va d’office à la fratrie ; `freres` explicite la restreint', () => {
    const { d, ids } = famille();
    const tous = ajouterFiliations(d, [ids.Ines], ids.Lea, 'biologique');
    expect(tous.filiations.filter((f) => f.parent === ids.Ines).map((f) => f.enfant)).toEqual([ids.Lea, ids.Tom]);
    const seule = ajouterFiliations(d, [ids.Ines], ids.Lea, 'biologique', []);
    expect(seule.filiations.filter((f) => f.parent === ids.Ines).map((f) => f.enfant)).toEqual([ids.Lea]);
  });
});

describe('remplacerParent : refus', () => {
  it('refuse une boucle et un parent déjà là, sans rien modifier', () => {
    let [d, p] = ajouter(donneesVides(), { prenom: 'Paul' });
    let e: string;
    [d, e] = ajouter(d, { prenom: 'Lea' });
    d = ajouterFiliation(d, p, e, 'biologique').donnees;
    const virtuel = avecParentsSansNom(d).personnes.find((x) => x.id.startsWith('virtuel:'))!.id;
    const avant = copie(d);
    expect(() => remplacerParent(d, virtuel, e)).toThrow();
    expect(() => remplacerParent(d, virtuel, p)).toThrow();
    expect(d).toEqual(avant);
    expect(() => remplacerParent(d, 'absent', p)).toThrow();
  });

  it('garde le type du lien du « ? » remplacé', () => {
    let [d, p] = ajouter(donneesVides(), { prenom: 'Paul' });
    let e: string, i: string;
    [d, e] = ajouter(d, { prenom: 'Noe' });
    [d, i] = ajouter(d, { prenom: 'Ines' });
    d = ajouterFiliation(d, p, e, 'adoptif').donnees;
    const r = enregistrerParentSansNom(d, avecParentsSansNom(d).personnes.find((x) => x.id.startsWith('virtuel:'))!.id)!;
    const apres = remplacerParent(r.donnees, r.personne.id, i);
    expect(apres.filiations.find((f) => f.parent === i)).toMatchObject({ enfant: e, type: 'adoptif' });
    expect(apres.personnes.some((x) => x.sansNom)).toBe(false);
  });
});

describe('passage en v6', () => {
  function v5(personnes: object[], filiations: object[]) {
    return { version: 5, personnes, unions: [], filiations, groupes: [] };
  }
  const enfant = { id: 'e', prenom: 'Lea', nom: 'Morel', note: '' };
  const parent = { id: 'p', prenom: 'Paul', nom: 'Morel', note: '' };
  const liens = [
    { parent: 'p', enfant: 'e', type: 'biologique' },
    { parent: 'q', enfant: 'e', type: 'biologique' },
  ];

  it('supprime un « ? » vide, garde un « ? » annoté ; idempotent', () => {
    const vide = migrer(v5([enfant, parent, { id: 'q', prenom: '', nom: '', note: '', sansNom: true }], liens)) as Donnees;
    expect(vide.version).toBe(6);
    expect(vide.personnes.map((p) => p.id)).toEqual(['e', 'p']);
    expect(vide.filiations).toHaveLength(1);
    expect(migrer(copie(vide))).toEqual(vide);
    const annote = migrer(v5([enfant, parent, { id: 'q', prenom: '', nom: '', note: 'voisin', sansNom: true }], liens)) as Donnees;
    expect(annote.personnes.map((p) => p.id)).toEqual(['e', 'p', 'q']);
  });

  it('la fixture anonymisée passe en v6 valide, sans perdre une personne nommée ni un lien', () => {
    const d = migrer(copie(fixture)) as Donnees;
    expect(estDonneesValides(d)).toBe(true);
    const avant = fixture as unknown as Donnees;
    const nommes = (x: Donnees) => x.personnes.filter((p) => !p.sansNom).length;
    expect(nommes(d)).toBe(nommes(migrer(copie({ ...avant, version: 4 })) as Donnees));
    expect(d.unions).toHaveLength(avant.unions.length);
  });

  it('valide les nouveaux champs et refuse leurs mauvais types', () => {
    const ok = {
      version: 6,
      personnes: [{ ...parent, lieuNaissance: 'Nantes', sansRappel: true, ignorerIncomplet: true }],
      unions: [],
      filiations: [],
      groupes: [],
    };
    expect(estDonneesValides(ok)).toBe(true);
    expect(estDonneesValides({ ...ok, personnes: [{ ...parent, sansRappel: false }] })).toBe(false);
    expect(estDonneesValides({ ...ok, personnes: [{ ...parent, lieuDeces: 3 }] })).toBe(false);
  });

  it('le stockage garde une seule copie brute des données v5', () => {
    const m = new Map<string, string>();
    const magasin = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const brut = JSON.stringify(v5([parent], []));
    m.set(CLE_STOCKAGE, brut);
    expect(charger(magasin)).toMatchObject({ lisible: true, donnees: { version: 6 } });
    expect(m.get(CLE_AVANT_V6)).toBe(brut);
    m.set(CLE_STOCKAGE, JSON.stringify(v5([enfant], [])));
    charger(magasin);
    expect(m.get(CLE_AVANT_V6)).toBe(brut);
  });

  it('fusion : un fichier v6 complète lieux et choix, un choix d’un côté vaut pour les deux', async () => {
    const [d, a] = ajouter(donneesVides(), { prenom: 'Alix' });
    const autre = copie(d);
    Object.assign(autre.personnes[0], { lieuNaissance: 'Nantes', sansRappel: true });
    const r = await fusionner(d, autre, async () => 0);
    expect(r.donnees.version).toBe(6);
    expect(qui(r.donnees, a)).toMatchObject({ lieuNaissance: 'Nantes', sansRappel: true });
  });
});
