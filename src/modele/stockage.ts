// Persistance dans localStorage (une seule clé, JSON) et export/import de
// fichier JSON. Le `Storage` est injecté pour pouvoir tester sans navigateur.

import { migrer } from './migration';
import { conjointEnTrop, donneesVides, estDateSansAnneeValide, estDateValide, MAX_PARENTS_PAR_TYPE } from './modele';
import type { Donnees, Filiation, Personne, Union } from './types';

export const CLE_STOCKAGE = 'tribu:donnees';
/** Copie d'un contenu illisible trouvé sous CLE_STOCKAGE. */
export const CLE_SECOURS = 'tribu:secours';

type Magasin = Pick<Storage, 'getItem' | 'setItem'>;

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Vrai si quelqu'un est son propre ancêtre (parcours en profondeur du graphe parent → enfant). */
function aBoucleDeFiliation(filiations: Filiation[]): boolean {
  const enfants = new Map<string, string[]>();
  for (const f of filiations) enfants.set(f.parent, [...(enfants.get(f.parent) ?? []), f.enfant]);
  const etat = new Map<string, 'en cours' | 'fini'>();
  const visiter = (id: string): boolean => {
    if (etat.get(id) === 'en cours') return true;
    if (etat.get(id) === 'fini') return false;
    etat.set(id, 'en cours');
    if ((enfants.get(id) ?? []).some(visiter)) return true;
    etat.set(id, 'fini');
    return false;
  };
  return [...enfants.keys()].some(visiter);
}

/**
 * Vérifie la forme et la cohérence des données : types des champs, ids uniques,
 * liens pointant vers des personnes existantes, règles de filiation, groupes d'amis cohérents.
 */
export function estDonneesValides(v: unknown): v is Donnees {
  if (!estObjet(v) || v.version !== 5) return false;
  const { personnes, unions, filiations, groupes } = v;
  if (!Array.isArray(personnes) || !Array.isArray(unions) || !Array.isArray(filiations) || !Array.isArray(groupes)) return false;

  const ids = new Set<string>();
  for (const p of personnes) {
    if (!estObjet(p) || typeof p.id !== 'string' || ids.has(p.id)) return false;
    if (typeof p.prenom !== 'string' || typeof p.nom !== 'string' || typeof p.note !== 'string') return false;
    if (p.naissance !== undefined && typeof p.naissance !== 'string') return false;
    if (p.deces !== undefined && typeof p.deces !== 'string') return false;
    if (p.decede !== undefined && p.decede !== true) return false;
    if (p.nomNaissance !== undefined && typeof p.nomNaissance !== 'string') return false;
    if (p.sexe !== undefined && p.sexe !== 'F' && p.sexe !== 'M') return false;
    if (p.inconnu !== undefined && p.inconnu !== true) return false;
    if (p.sansNom !== undefined && p.sansNom !== true) return false;
    ids.add(p.id);
  }

  const idsLiens = new Set<string>();
  for (const u of unions) {
    if (!estObjet(u) || typeof u.id !== 'string' || idsLiens.has(u.id)) return false;
    if (typeof u.marie !== 'boolean') return false;
    if (u.statut !== 'actuelle' && u.statut !== 'separee') return false;
    if (typeof u.personneA !== 'string' || typeof u.personneB !== 'string') return false;
    if (u.date !== undefined && (typeof u.date !== 'string' || !(estDateValide(u.date) || estDateSansAnneeValide(u.date)))) return false;
    if (!ids.has(u.personneA) || !ids.has(u.personneB) || u.personneA === u.personneB) return false;
    idsLiens.add(u.id);
  }
  // Un seul conjoint actuel vivant par personne (un veuf ou une veuve peut s'être remarié).
  if (conjointEnTrop(personnes as Personne[], unions as Union[])) return false;

  const parentsParType = new Map<string, number>();
  const paires = new Set<string>();
  for (const f of filiations) {
    if (!estObjet(f) || typeof f.id !== 'string' || idsLiens.has(f.id)) return false;
    if (f.type !== 'biologique' && f.type !== 'adoptif') return false;
    if (typeof f.parent !== 'string' || typeof f.enfant !== 'string') return false;
    if (!ids.has(f.parent) || !ids.has(f.enfant) || f.parent === f.enfant) return false;
    const paire = `${f.parent}>${f.enfant}`;
    if (paires.has(paire)) return false;
    paires.add(paire);
    const cle = `${f.enfant}/${f.type}`;
    const n = (parentsParType.get(cle) ?? 0) + 1;
    if (n > MAX_PARENTS_PAR_TYPE) return false;
    parentsParType.set(cle, n);
    idsLiens.add(f.id);
  }
  if (aBoucleDeFiliation(filiations as Filiation[])) return false;

  // Groupes d'amis : au moins deux membres existants, sans doublon.
  for (const g of groupes) {
    if (!estObjet(g) || typeof g.id !== 'string' || idsLiens.has(g.id) || typeof g.nom !== 'string') return false;
    if (!Array.isArray(g.membres) || g.membres.length < 2 || new Set(g.membres).size !== g.membres.length) return false;
    if (!g.membres.every((m) => typeof m === 'string' && ids.has(m))) return false;
    idsLiens.add(g.id);
  }
  return true;
}

/** Résultat du chargement : les données, ou le contenu brut s'il est illisible. */
export type Chargement = { lisible: true; donnees: Donnees } | { lisible: false; brut: string };

function lire(brut: string): Donnees | null {
  try {
    const lu = migrer(JSON.parse(brut));
    return estDonneesValides(lu) ? lu : null;
  } catch {
    return null;
  }
}

/**
 * Charge les données ; données vides si rien n'est stocké. Un contenu illisible
 * est copié tel quel sous CLE_SECOURS et n'est jamais remplacé ici : c'est à
 * l'appelant de bloquer les écritures jusqu'à une décision de l'utilisateur.
 */
export function charger(magasin: Magasin): Chargement {
  const brut = magasin.getItem(CLE_STOCKAGE);
  if (brut === null) return { lisible: true, donnees: donneesVides() };
  const donnees = lire(brut);
  if (donnees) return { lisible: true, donnees };
  try {
    magasin.setItem(CLE_SECOURS, brut);
  } catch {
    // Copie impossible (stockage plein) : l'original reste sous CLE_STOCKAGE, non écrasé.
  }
  return { lisible: false, brut };
}

export function sauvegarder(magasin: Magasin, donnees: Donnees): void {
  magasin.setItem(CLE_STOCKAGE, JSON.stringify(donnees));
}

export function exporterJson(donnees: Donnees): string {
  return JSON.stringify(donnees, null, 2);
}

/** « 2026-10-19 », date locale. */
function jour(date: Date): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

/** « tribu-2026-10-19.json », avec la date locale du jour. */
export function nomFichierExport(date: Date): string {
  return `tribu-${jour(date)}.json`;
}

/** « tribu-secours-2026-10-19.txt » : le contenu brut n'est pas forcément du JSON. */
export function nomFichierSecours(date: Date): string {
  return `tribu-secours-${jour(date)}.txt`;
}

/** Lève une Error si le texte n'est pas un JSON Tribu valide (rien n'est alors écrasé). */
export function importerJson(texte: string): Donnees {
  let lu: unknown;
  try {
    lu = migrer(JSON.parse(texte));
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide");
  }
  if (!estDonneesValides(lu)) throw new Error("Le fichier n'est pas une sauvegarde Tribu valide");
  return lu;
}
