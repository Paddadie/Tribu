// Persistance dans localStorage (une seule clé, JSON) et export/import de
// fichier JSON. Le `Storage` est injecté pour pouvoir tester sans navigateur.

import { donneesVides } from './modele';
import type { Donnees } from './types';

export const CLE_STOCKAGE = 'tribu:donnees';

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
    if (n > 2) return false;
    parentsParType.set(cle, n);
    idsLiens.add(f.id);
  }
  return true;
}

/** Charge les données ; données vides si rien n'est stocké ou si le contenu est illisible. */
export function charger(magasin: Magasin): Donnees {
  const brut = magasin.getItem(CLE_STOCKAGE);
  if (brut === null) return donneesVides();
  try {
    const lu: unknown = JSON.parse(brut);
    return estDonneesValides(lu) ? lu : donneesVides();
  } catch {
    return donneesVides();
  }
}

export function sauvegarder(magasin: Magasin, donnees: Donnees): void {
  magasin.setItem(CLE_STOCKAGE, JSON.stringify(donnees));
}

export function exporterJson(donnees: Donnees): string {
  return JSON.stringify(donnees, null, 2);
}

/** « tribu-2026-10-19.json », avec la date locale du jour. */
export function nomFichierExport(date: Date): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `tribu-${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}.json`;
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
