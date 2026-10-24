// Navigation par hash. « Retour » revient à l'écran précédent de l'appli
// (history.back) au lieu d'empiler une nouvelle entrée ; à défaut (appli ouverte
// directement sur cet écran), il ouvre l'écran par défaut à la place.
// Chaque entrée d'historique porte sa route et sa profondeur (0 = premier écran
// ouvert). Une entrée dont la route ne correspond pas est nouvelle : un cran plus
// loin que l'écran d'où l'on vient.

import { confirmer } from './confirmer';
import { h, type Enfant } from './dom';

interface Entree {
  route: string;
  profondeur: number;
}

let profondeur = -1;
// Recul demandé mais pas encore arrivé : un second toucher sur Retour ne recule pas deux fois.
let recul = false;
let afficher: () => void = () => {};
// Saisie en cours sur l'écran affiché : Retour demande confirmation avant de la perdre.
let garde: (() => boolean) | undefined;
// Écran affiché (adresse et profondeur), pour y revenir si le téléphone recule pendant une saisie.
let ecran = { route: '', profondeur: -1 };
// Retour en cours vers l'écran gardé : les changements d'adresse d'ici là sont ignorés.
let retablir: number | undefined;

const FICHE = '#/personne/';
const ABANDON = 'Abandonner la saisie ? Ce que tu as saisi sera perdu.';

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

/** Profondeur de l'écran courant : plus grande qu'avant = on avance, plus petite = on revient. */
export function profondeurCourante(): number {
  return profondeur;
}

/** Lance la navigation : `rendu` dessine l'écran de la route courante, maintenant et à chaque changement. */
export function demarrerNavigation(rendu: () => void): void {
  // Chaque nouvel écran repart sans garde ; il pose la sienne en se construisant.
  afficher = () => {
    garde = undefined;
    ecran = { route: location.hash, profondeur };
    rendu();
  };
  // Le défilement est géré par l'appli (position de la liste gardée au retour).
  history.scrollRestoration = 'manual';
  // D'une fiche à une autre : la nouvelle fiche prend la place de l'ancienne, pour que Retour
  // (bouton ou geste) sorte d'un coup de la chaîne de fiches vers l'écran d'où l'on est entré.
  window.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!location.hash.startsWith(FICHE)) return;
    const lien = (e.target as Element | null)?.closest?.('a');
    const cible = lien?.getAttribute('href');
    if (!cible?.startsWith(FICHE) || cible === location.hash) return;
    e.preventDefault();
    remplacer(cible);
  });
  // popstate arrive aussi quand l'écran précédent a la même adresse (sans hashchange).
  window.addEventListener('popstate', () => {
    recul = false;
    const connue = entreeCourante();
    if (connue) profondeur = connue.profondeur;
  });
  window.addEventListener('hashchange', () => {
    recul = false;
    if (retablir !== undefined) {
      if (location.hash !== ecran.route) return;
      // De retour sur l'écran gardé, toujours affiché : on demande, puis on refait le pas si c'est oui.
      const ecart = retablir;
      retablir = undefined;
      profondeur = ecran.profondeur;
      void confirmer(ABANDON, 'Abandonner', 'Continuer la saisie').then((oui) => {
        if (!oui) return;
        garde = undefined;
        history.go(-ecart);
      });
      return;
    }
    // Geste ou bouton Retour du téléphone pendant une saisie : l'adresse a déjà changé, on y retourne.
    if (garde?.() && location.hash !== ecran.route) {
      const arrivee = entreeCourante();
      retablir = arrivee ? ecran.profondeur - arrivee.profondeur : -1;
      if (retablir !== 0) {
        history.go(retablir);
        return;
      }
      retablir = undefined;
    }
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
  ecran = { route, profondeur };
  // Après coup : l'appel peut venir d'un écran en cours de construction.
  if (redessiner) queueMicrotask(afficher);
}

/** Écran précédent de l'appli s'il y en a un, sinon `defaut` à la place de l'écran courant. */
export function revenir(defaut: string): void {
  if (recul) return;
  // Départ voulu (saisie enregistrée ou abandon confirmé) : la garde ne le retient pas.
  garde = undefined;
  if (profondeur > 0) {
    recul = true;
    history.back();
  } else remplacer(defaut);
}

/**
 * L'écran en construction a une saisie à protéger : tant que `modifie()` est vrai, ses liens Retour
 * demandent confirmation, et le geste ou le bouton Retour du téléphone ramène sur l'écran pour demander.
 */
export function garderSaisie(modifie: () => boolean): void {
  garde = modifie;
}

/** Lien Retour ou Annuler : aspect et adresse d'un lien, mais il revient en arrière au toucher. */
export function lienRetour(defaut: string, attributs: Record<string, unknown>, ...enfants: Enfant[]): HTMLAnchorElement {
  const retour = async (e: Event) => {
    e.preventDefault();
    if (garde?.() && !(await confirmer(ABANDON, 'Abandonner', 'Continuer la saisie'))) return;
    revenir(defaut);
  };
  return h('a', { ...attributs, href: defaut, onclick: retour }, ...enfants);
}
