// Surbrillance brève de la ligne ajoutée ou modifiée, au retour sur la fiche (ANIM-03).
// L'écran qui enregistre signale la personne concernée ; la fiche, en se dessinant, éclaire sa ligne.

let attente: string | undefined;

/** À appeler à l'enregistrement d'un lien : `id` est l'autre personne du lien (celle dont la ligne va changer). */
export function signaler(id: string): void {
  attente = id;
}

/** Éclaire la ligne de la personne signalée dans `racine`, une seule fois. */
export function eclairer(racine: HTMLElement): void {
  const id = attente;
  attente = undefined;
  if (!id) return;
  const ligne = racine.querySelector(`a.ligne-lien[href="#/personne/${id}"]`)?.closest('.ligne');
  if (!ligne) return;
  ligne.classList.add('nouvelle');
  // La fiche n'est pas encore dans la page : on attend l'affichage pour amener la ligne à l'écran.
  requestAnimationFrame(() => ligne.scrollIntoView?.({ block: 'nearest' }));
}
