// Surbrillance brève de la ligne ajoutée ou modifiée, au retour sur la fiche (ANIM-03).
// L'écran qui enregistre signale la personne concernée ; la fiche, en se dessinant, éclaire sa ligne,
// et « Famille proche », dessinée ensuite, fait apparaître son nœud (ANIM-06).

let attente: string | undefined;
// Personne à faire apparaître au premier dessin de « Famille proche » de la fiche éclairée.
let dessin: string | undefined;

/** À appeler à l'enregistrement d'un lien : `id` est l'autre personne du lien (celle dont la ligne va changer). */
export function signaler(id: string): void {
  attente = id;
}

/** Éclaire la ligne de la personne signalée dans `racine`, une seule fois. */
export function eclairer(racine: HTMLElement): void {
  const id = attente;
  attente = undefined;
  dessin = id;
  if (!id) return;
  const ligne = racine.querySelector(`a.ligne-lien[href="#/personne/${id}"]`)?.closest('.ligne');
  if (!ligne) return;
  ligne.classList.add('nouvelle');
  // La fiche n'est pas encore dans la page : on attend l'affichage pour amener la ligne à l'écran.
  requestAnimationFrame(() => ligne.scrollIntoView?.({ block: 'nearest' }));
}

/** Au premier dessin de « Famille proche » : le nœud de la personne signalée apparaît en fondu, une seule fois. */
export function faireApparaitre(dessinFoyer: HTMLElement): void {
  const id = dessin;
  dessin = undefined;
  if (id) dessinFoyer.querySelector(`a.noeud[href="#/personne/${id}"]`)?.classList.add('apparait');
}
