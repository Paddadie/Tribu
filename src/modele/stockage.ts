// Persistance dans localStorage (une seule clé, JSON) et export/import de
// fichier JSON. Le `Storage` est injecté pour pouvoir tester sans navigateur.

import { donneesVides, MAX_PARENTS_PAR_TYPE } from './modele';
import type { Donnees } from './types';

export const CLE_STOCKAGE = 'tribu:donnees';
/** Copie d'un contenu illisible trouvé sous CLE_STOCKAGE. */
export const CLE_SECOURS = 'tribu:secours';

type Magasin = Pick<Storage, 'getItem' | 'setItem'>;

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Vérifie la forme et la cohérence des données : types des champs, ids uniques,
 * liens pointant vers des personnes existantes, règles de filiation.
 */
export function estDonneesValides(v: unknown): v is Donnees {
  if (!estObjet(v) || v.version !== 1) return false;
  const { personnes, unions, filiations } = v;
  if (!Array.isArray(personnes) || !Array.isArray(unions) || !Array.isArray(filiations)) return false;

  const ids = new Set<string>();
  for (const p of personnes) {
    if (!estObjet(p) || typeof p.id !== 'string' || ids.has(p.id)) return false;
    if (typeof p.prenom !== 'string' || typeof p.nom !== 'string' || typeof p.note !== 'string') return false;
    if (p.naissance !== undefined && typeof p.naissance !== 'string') return false;
    if (p.sexe !== undefined && p.sexe !== 'F' && p.sexe !== 'M') return false;
    ids.add(p.id);
  }

  const idsLiens = new Set<string>();
  for (const u of unions) {
    if (!estObjet(u) || typeof u.id !== 'string' || idsLiens.has(u.id)) return false;
    if (typeof u.marie !== 'boolean') return false;
    if (typeof u.personneA !== 'string' || typeof u.personneB !== 'string') return false;
    if (!ids.has(u.personneA) || !ids.has(u.personneB) || u.personneA === u.personneB) return false;
    idsLiens.add(u.id);
  }

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
  return true;
}

/** Résultat du chargement : les données, ou le contenu brut s'il est illisible. */
export type Chargement = { lisible: true; donnees: Donnees } | { lisible: false; brut: string };

function lire(brut: string): Donnees | null {
  try {
    const lu: unknown = JSON.parse(brut);
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
    lu = JSON.parse(texte);
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide");
  }
  if (!estDonneesValides(lu)) throw new Error("Le fichier n'est pas une sauvegarde Tribu valide");
  return lu;
}
