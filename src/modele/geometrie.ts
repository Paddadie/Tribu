// Mesures du dessin de l'arbre en pixels (à l'échelle 1). Elles vivent dans le modèle parce que la recherche des
// générations souples (soupleRecherche.ts) compte les croisements sur le dessin ; src/ui/geometrieArbre.ts les reprend.

/** Pixels entre deux places voisines, et entre deux générations (à l'échelle 1). */
export const PAS_X = 80;
export const PAS_Y = 154;
/** Hauteur d'une 2e ligne de nom (prénom composé) : réservée sous chaque nom, pour que ni trait ni rang suivant ne la touche. */
export const LIGNE_EN_PLUS = 16;
/** Ligne « née X » sous le nom, dans l'arbre principal (V4, point 17) : réservée elle aussi. */
export const LIGNE_NAISSANCE = 14;
/** Rayon de l'avatar, largeur d'un nœud. */
export const R = 19;
export const LARG = 76;
/** Sous l'avatar, le nom (sur 2 lignes si besoin), « née X » et l'année : un trait qui part d'un parent seul commence en dessous. */
export const SOUS_NOM = R + 40 + LIGNE_EN_PLUS + LIGNE_NAISSANCE;
