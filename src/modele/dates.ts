// Dates partielles des fiches et des unions : « AAAA », « AAAA-MM », « AAAA-MM-JJ », ou « --MM-JJ » sans année.

/** Forme d'une date partielle : « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » (groupes : année, mois, jour). Sans drapeau g : partageable. */
export const MOTIF_DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

/** Date « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » existante au calendrier (année de 1 à 9999). */
export function estDateValide(date: string): boolean {
  const m = date.match(MOTIF_DATE);
  if (!m) return false;
  const annee = Number(m[1]);
  if (annee < 1) return false;
  if (m[2] === undefined) return true;
  const mois = Number(m[2]);
  if (mois < 1 || mois > 12) return false;
  if (m[3] === undefined) return true;
  const jour = Number(m[3]);
  return jour >= 1 && jour <= joursDuMois(annee, mois);
}

/** Jour et mois sans année, « --MM-JJ » (notation ISO 8601) : un anniversaire connu sans la naissance (groupes : mois, jour). */
export const MOTIF_SANS_ANNEE = /^--(\d{2})-(\d{2})$/;

/** « --MM-JJ » existant au calendrier ; le 29 février est admis. */
export function estDateSansAnneeValide(date: string): boolean {
  const m = date.match(MOTIF_SANS_ANNEE);
  if (!m) return false;
  const [mois, jour] = [Number(m[1]), Number(m[2])];
  return mois >= 1 && mois <= 12 && jour >= 1 && jour <= joursDuMois(2000, mois);
}

/** Année d'une date partielle (« 1961 ») ; undefined pour une date sans année ou absente. */
export function anneeDe(date: string | undefined): string | undefined {
  return date?.match(MOTIF_DATE)?.[1];
}

export function joursDuMois(annee: number, mois: number): number {
  if (mois === 2) return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
}

/**
 * Le décès ne précède pas la naissance ; deux dates partielles se comparent sur ce qu'elles ont en commun.
 * Une naissance ou un décès sans année ne permet pas de trancher : jamais en défaut.
 */
export function decesAvantNaissance(naissance: string, deces: string): boolean {
  if (!anneeDe(naissance) || !anneeDe(deces)) return false;
  const n = Math.min(naissance.length, deces.length);
  return deces.slice(0, n) < naissance.slice(0, n);
}
