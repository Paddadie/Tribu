// Séquences aléatoires (V4, lot 0) : 500 séquences de 30 opérations tirées par graine. Une opération refusée lève une
// `Error` simple et laisse les données intactes ; une opération acceptée respecte les invariants.
// Une graine qui échoue est affichée ; on l'ajoute alors aux cas fixes de scenarios.test.ts.
import { describe, expect, it } from 'vitest';
import {
  ajouterFiliations,
  ajouterFrereSansParent,
  ajouterUnion,
  creerPersonne,
  donneesVides,
  modifierUnion,
  separerUnion,
  supprimerPersonne,
} from '../modele';
import { avecParentsSansNom, enregistrerParentSansNom, remplacerParent } from '../parentSansNom';
import type { Donnees, TypeFiliation } from '../types';
import { aleatoire, entre, NOMS, PRENOMS_F, PRENOMS_M } from './familles';
import { verifierInvariants } from './invariants';

const SEQUENCES = 500;
const OPERATIONS = 30;

type Operation = { nom: string; jouer: (d: Donnees) => Donnees };

/** Tire une opération au hasard parmi celles qui créent, lient, remplacent ou suppriment. */
function tirer(d: Donnees, h: () => number): Operation {
  const choisir = <T>(xs: T[]): T | undefined => (xs.length === 0 ? undefined : xs[entre(h, 0, xs.length - 1)]);
  const gens = d.personnes.filter((p) => !p.inconnu).map((p) => p.id);
  const qui = () => choisir(gens) ?? 'personne';
  const type = (): TypeFiliation => (h() < 0.8 ? 'biologique' : 'adoptif');
  const r = h();
  if (r < 0.22 || gens.length < 2) {
    const femme = h() < 0.5;
    const prenom = choisir(femme ? PRENOMS_F : PRENOMS_M)!;
    const champs = { prenom, nom: choisir(NOMS)!, sexe: h() < 0.9 ? (femme ? ('F' as const) : ('M' as const)) : undefined, decede: h() < 0.1 };
    return { nom: `créer ${prenom}`, jouer: (x) => creerPersonne(x, champs).donnees };
  }
  if (r < 0.37) {
    const [a, b, marie, statut] = [qui(), qui(), h() < 0.5, h() < 0.7 ? ('actuelle' as const) : ('separee' as const)];
    return { nom: `unir ${a} ${b}`, jouer: (x) => ajouterUnion(x, a, b, marie, statut).donnees };
  }
  if (r < 0.42) {
    const u = choisir(d.unions);
    return { nom: `séparer ${u?.id}`, jouer: (x) => separerUnion(x, u?.id ?? 'aucune') };
  }
  if (r < 0.46) {
    const u = choisir(d.unions);
    return { nom: `marier ${u?.id}`, jouer: (x) => modifierUnion(x, u?.id ?? 'aucune', true) };
  }
  if (r < 0.62) {
    const [p, e, t] = [qui(), qui(), type()];
    return { nom: `parent ${p} de ${e}`, jouer: (x) => ajouterFiliations(x, [p], e, t) };
  }
  if (r < 0.72) {
    const [p, q, e, t] = [qui(), qui(), qui(), type()];
    return { nom: `enfant ${e} de ${p} et ${q}`, jouer: (x) => ajouterFiliations(x, [...new Set([p, q])], e, t) };
  }
  if (r < 0.84) {
    const [a, b] = [qui(), qui()];
    return { nom: `frère ${a} de ${b}`, jouer: (x) => ajouterFrereSansParent(x, a, b) };
  }
  if (r < 0.87) {
    // Remplacer un « ? » (virtuel, enregistré ou parent inconnu caché) par une personne.
    const cible = choisir(
      avecParentsSansNom(d)
        .personnes.filter((p) => p.sansNom || p.inconnu)
        .map((p) => p.id),
    );
    const par = qui();
    return { nom: `remplacer ${cible} par ${par}`, jouer: (x) => (cible ? remplacerParent(x, cible, par) : x) };
  }
  if (r < 0.9) {
    const virtuel = choisir(
      avecParentsSansNom(d)
        .personnes.filter((p) => p.id.startsWith('virtuel:'))
        .map((p) => p.id),
    );
    return { nom: `enregistrer ${virtuel}`, jouer: (x) => (virtuel ? (enregistrerParentSansNom(x, virtuel)?.donnees ?? x) : x) };
  }
  const p = qui();
  return { nom: `supprimer ${p}`, jouer: (x) => supprimerPersonne(x, p) };
}

interface Echec {
  graine: number;
  etape: number;
  operation: string;
  raison: string;
}

/** Joue une séquence ; renvoie le premier échec, et le nombre d'opérations acceptées. */
function sequence(graine: number): { echec?: Echec; acceptees: number } {
  const h = aleatoire(graine);
  let d = donneesVides();
  let acceptees = 0;
  for (let etape = 1; etape <= OPERATIONS; etape++) {
    const op = tirer(d, h);
    const avant = JSON.stringify(d);
    let apres: Donnees;
    try {
      apres = op.jouer(d);
    } catch (e) {
      const simple = e instanceof Error && e.constructor === Error && e.message.length > 0;
      if (!simple) return { echec: { graine, etape, operation: op.nom, raison: `erreur inattendue : ${String(e)}` }, acceptees };
      if (JSON.stringify(d) !== avant) return { echec: { graine, etape, operation: op.nom, raison: 'refus qui modifie les données' }, acceptees };
      continue;
    }
    if (JSON.stringify(d) !== avant) return { echec: { graine, etape, operation: op.nom, raison: 'données d’entrée modifiées' }, acceptees };
    const fautes = verifierInvariants(apres);
    if (fautes.length > 0) return { echec: { graine, etape, operation: op.nom, raison: fautes.join(' ; ') }, acceptees };
    d = apres;
    acceptees++;
  }
  return { acceptees };
}

describe(`séquences aléatoires (${SEQUENCES} × ${OPERATIONS} opérations)`, () => {
  const resultats = Array.from({ length: SEQUENCES }, (_, i) => sequence(i + 1));
  const echecs = resultats.flatMap((r) => (r.echec ? [r.echec] : []));

  it('aucune opération ne casse un invariant ni ne modifie les données en cas de refus', () => {
    if (echecs.length > 0) console.log(echecs.slice(0, 10));
    expect(echecs).toEqual([]);
  });

  it('les séquences font vraiment quelque chose (plus d’un tiers des opérations acceptées)', () => {
    const total = resultats.reduce((s, r) => s + r.acceptees, 0);
    expect(total).toBeGreaterThan((SEQUENCES * OPERATIONS) / 3);
  });
});
