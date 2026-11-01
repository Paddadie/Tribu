// Arbre global en générations souples (modele/souple.ts) pour l'écran Arbre et l'export PNG. La recherche des
// décalages prend plusieurs secondes sur un grand arbre : elle tourne en arrière-plan (souple.worker.ts) et son
// résultat, minuscule, est gardé par disposition (`tribu:souple`). L'arbre se redessine tout de suite ensuite.

import { disposerArbre, type Disposition } from '../modele/arbreGlobal';
import { assouplir, signature, type Decalages } from '../modele/souple';
import type { Donnees } from '../modele/types';

/** Cache jetable, hors des données et de l'export : [signature de la disposition, décalages], le plus récent d'abord. */
const CLE = 'tribu:souple';
/** Dispositions gardées : tout l'arbre et chaque filtre, pour un ou deux « Moi ». */
const GARDEES = 12;

function lireCache(): [string, Decalages][] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]');
    return Array.isArray(v) ? (v as [string, Decalages][]) : [];
  } catch {
    return [];
  }
}

function garder(sig: string, dec: Decalages) {
  const liste = [[sig, dec] as [string, Decalages], ...lireCache().filter(([s]) => s !== sig)].slice(0, GARDEES);
  try {
    localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    // Stockage plein : on refera la recherche la prochaine fois.
  }
}

/** Recherches en cours, par signature : un même arbre n'est cherché qu'une fois à la fois. */
const enCours = new Map<string, Promise<Decalages | undefined>>();

/** Recherche dans un Worker ; sans Worker (tests), pas de recherche : l'arbre reste dessiné comme avant. */
function chercherEnFond(d: Donnees, moi: string, garderIds: Set<string> | undefined, sig: string): Promise<Decalages | undefined> {
  const deja = enCours.get(sig);
  if (deja) return deja;
  if (typeof Worker === 'undefined') return Promise.resolve(undefined);
  const promesse = new Promise<Decalages | undefined>((resoudre) => {
    let travail: Worker;
    try {
      travail = new Worker(new URL('./souple.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return resoudre(undefined);
    }
    const finir = (dec: Decalages | undefined) => {
      travail.terminate();
      enCours.delete(sig);
      resoudre(dec);
    };
    travail.onmessage = (e: MessageEvent<{ signature: string; decalages: Decalages }>) => {
      garder(e.data.signature, e.data.decalages);
      finir(e.data.signature === sig ? e.data.decalages : undefined);
    };
    travail.onerror = () => finir(undefined);
    travail.postMessage({ donnees: d, moi, garder: garderIds && [...garderIds] });
  });
  enCours.set(sig, promesse);
  return promesse;
}

/**
 * L'arbre global en générations souples. Décalages déjà connus pour cette disposition : tout de suite. Sinon
 * l'arbre d'avant, et `quandPret` reçoit l'arbre souple quand la recherche en arrière-plan a fini (s'il change).
 */
export function arbreSouple(d: Donnees, moi: string, garderIds?: Set<string>, quandPret?: (disp: Disposition) => void): Disposition {
  const base = disposerArbre(d, moi, garderIds);
  if (base.places.length === 0) return base;
  const sig = signature(base, moi);
  const connus = lireCache().find(([s]) => s === sig)?.[1];
  if (connus) return assouplir(base, moi, connus);
  void chercherEnFond(d, moi, garderIds, sig).then((dec) => {
    if (dec && (dec.d.length > 0 || dec.h.length > 0)) quandPret?.(assouplir(base, moi, dec));
  });
  return base;
}
