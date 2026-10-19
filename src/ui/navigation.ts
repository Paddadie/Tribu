// Navigation par hash. « Retour » revient à l'écran précédent de l'appli
// (history.back) au lieu d'empiler une nouvelle entrée ; à défaut (appli ouverte
// directement sur cet écran), il ouvre l'écran par défaut à la place.
// Chaque entrée d'historique porte sa route et sa profondeur (0 = premier écran
// ouvert). Une entrée dont la route ne correspond pas est nouvelle : un cran plus
// loin que l'écran d'où l'on vient.

import { h, type Enfant } from './dom';

interface Entree {
  route: string;
  profondeur: number;
}

let profondeur = -1;
// Recul demandé mais pas encore arrivé : un second toucher sur Retour ne recule pas deux fois.
let recul = false;
let afficher: () => void = () => {};

function entreeCourante(): Entree | undefined {
  const etat = history.state as Partial<Entree> | null;
  return etat?.route === location.hash && typeof etat.profondeur === 'number' ? (etat as Entree) : undefined;
}

/** Retrouve la profondeur de l'entrée courante, ou la note si elle est nouvelle. */
function noterEntree(): void {
  const connue = entreeCourante();
  if (connue) {
    profondeur = connue.profondeur;
    return;
  }
  profondeur += 1;
  history.replaceState({ route: location.hash, profondeur } satisfies Entree, '');
}

/** Lance la navigation : `rendu` dessine l'écran de la route courante, maintenant et à chaque changement. */
export function demarrerNavigation(rendu: () => void): void {
  afficher = rendu;
  // Le défilement est géré par l'appli (position de la liste gardée au retour).
  history.scrollRestoration = 'manual';
  // popstate arrive aussi quand l'écran précédent a la même adresse (sans hashchange).
  window.addEventListener('popstate', () => {
    recul = false;
    const connue = entreeCourante();
    if (connue) profondeur = connue.profondeur;
  });
  window.addEventListener('hashchange', () => {
    recul = false;
    noterEntree();
    afficher();
  });
  noterEntree();
  afficher();
}

/**
 * Ouvre `route` à la place de l'écran courant : Retour ne reviendra pas sur l'écran quitté.
 * `redessiner` à false corrige seulement l'adresse (l'écran affiché y correspond déjà).
 */
export function remplacer(route: string, redessiner = true): void {
  history.replaceState({ route, profondeur } satisfies Entree, '', route);
  // Après coup : l'appel peut venir d'un écran en cours de construction.
  if (redessiner) queueMicrotask(afficher);
}

/** Écran précédent de l'appli s'il y en a un, sinon `defaut` à la place de l'écran courant. */
export function revenir(defaut: string): void {
  if (recul) return;
  if (profondeur > 0) {
    recul = true;
    history.back();
  } else remplacer(defaut);
}

/** Lien Retour ou Annuler : aspect et adresse d'un lien, mais il revient en arrière au toucher. */
export function lienRetour(defaut: string, attributs: Record<string, unknown>, ...enfants: Enfant[]): HTMLAnchorElement {
  const retour = (e: Event) => {
    e.preventDefault();
    revenir(defaut);
  };
  return h('a', { ...attributs, href: defaut, onclick: retour }, ...enfants);
}
