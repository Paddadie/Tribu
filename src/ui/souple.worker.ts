// Recherche des générations souples hors du fil de l'écran (voir arbreSouple.ts) : la même disposition que l'écran,
// recalculée ici depuis les données, puis ses décalages et sa signature.

import { disposerArbre } from '../modele/arbreGlobal';
import { signature } from '../modele/souple';
import { chercherDecalages } from '../modele/soupleRecherche';
import type { Donnees } from '../modele/types';

self.onmessage = (e: MessageEvent<{ donnees: Donnees; moi: string; garder?: string[] }>) => {
  const { donnees, moi, garder } = e.data;
  const disp = disposerArbre(donnees, moi, garder && new Set(garder));
  self.postMessage({ signature: signature(disp, moi), decalages: chercherDecalages(donnees, disp, moi) });
};
