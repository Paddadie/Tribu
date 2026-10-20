// Noms des noces (anniversaires de mariage), de 1 à 80 ans. Table fixe : les années sans nom n'en ont pas.

import { ageEntre, estDansLeFutur } from './age';
import { MOTIF_DATE } from './modele';

const NOCES: Record<number, string> = {
  1: 'coton',
  2: 'cuir',
  3: 'froment',
  4: 'cire',
  5: 'bois',
  6: 'chypre',
  7: 'laine',
  8: 'coquelicot',
  9: 'faïence',
  10: 'étain',
  11: 'corail',
  12: 'soie',
  13: 'muguet',
  14: 'plomb',
  15: 'cristal',
  16: 'saphir',
  17: 'rose',
  18: 'turquoise',
  19: 'cretonne',
  20: 'porcelaine',
  21: 'opale',
  22: 'bronze',
  23: 'béryl',
  24: 'satin',
  25: 'argent',
  26: 'jade',
  27: 'acajou',
  28: 'nickel',
  29: 'velours',
  30: 'perle',
  31: 'basane',
  32: 'cuivre',
  33: 'porphyre',
  34: 'ambre',
  35: 'rubis',
  36: 'mousseline',
  37: 'papier',
  38: 'mercure',
  39: 'crêpe',
  40: 'émeraude',
  41: 'fer',
  42: 'nacre',
  43: 'flanelle',
  44: 'topaze',
  45: 'vermeil',
  46: 'lavande',
  47: 'cachemire',
  48: 'améthyste',
  49: 'cèdre',
  50: 'or',
  55: 'orchidée',
  60: 'diamant',
  65: 'palissandre',
  70: 'platine',
  75: 'albâtre',
  80: 'chêne',
};

/** « étain » pour 10 ans ; undefined pour une année sans nom. */
export function nomNoces(annees: number): string | undefined {
  return NOCES[annees];
}

/** « noces d'étain », « noces de coton » ; « 56 ans de mariage » pour une année sans nom. */
export function libelleNoces(annees: number): string {
  const nom = nomNoces(annees);
  if (!nom) return `${annees} ${annees > 1 ? 'ans' : 'an'} de mariage`;
  return /^[aeéèêiouyh]/i.test(nom) ? `noces d’${nom}` : `noces de ${nom}`;
}

/**
 * Ce que fête un couple au bout de `annees` ans : les noces s'il est marié, « 10 ans ensemble » sinon.
 * Le titre sert aux vignettes (« Noces d'étain »), le détail aux lignes (« noces d'étain », « 10 ans ensemble »).
 */
export function libelleAnniversaireUnion(annees: number, marie: boolean): string {
  return marie ? libelleNoces(annees) : `${annees} ${annees > 1 ? 'ans' : 'an'} ensemble`;
}

/**
 * Durée d'une union en cours, pour son écran : « 10 ans · noces d’étain », « 10 ans ensemble », « environ 10 ans » si
 * la date ne tranche pas. Vide sans année, pour une date à venir ou une union de moins d'un an.
 */
export function dureeUnion(date: string | undefined, marie: boolean, aujourdhui: Date): string {
  if (!date || !MOTIF_DATE.test(date) || estDansLeFutur(date, aujourdhui)) return '';
  const deux = (n: number) => String(n).padStart(2, '0');
  const age = ageEntre(date, `${aujourdhui.getFullYear()}-${deux(aujourdhui.getMonth() + 1)}-${deux(aujourdhui.getDate())}`);
  if (!age || age.annees < 1) return '';
  const ans = `${age.annees} ${age.annees > 1 ? 'ans' : 'an'}`;
  if (age.approximatif) return `environ ${ans}`;
  if (!marie) return `${ans} ensemble`;
  return nomNoces(age.annees) ? `${ans} · ${libelleNoces(age.annees)}` : `${ans} de mariage`;
}
