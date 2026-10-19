import "@fontsource-variable/figtree";
import "./style.css";
import { initPwa } from "./pwa";
import { accueil } from "./ui/accueil";
import { lireDonnees } from "./ui/etat";
import { fiche } from "./ui/fiche";
import { formulaire } from "./ui/formulaire";

// Routage par hash (compatible GitHub Pages) :
//   #/                 liste          #/personne/<id>   fiche
//   #/nouveau          création       #/modifier/<id>   modification
const app = document.querySelector<HTMLElement>("#app");

/** Remplace la route courante : le bouton Retour ne revient pas sur l'écran quitté. */
const remplacer = (route: string) => location.replace(route);

function vue(route: string): HTMLElement {
  const [, section, id] = route.split("/");
  const personne = lireDonnees().personnes.find((p) => p.id === id);
  if (section === "nouveau") return formulaire(undefined, remplacer);
  if (section === "personne" && personne) return fiche(personne, remplacer);
  if (section === "modifier" && personne) return formulaire(personne, remplacer);
  // Route inconnue ou personne introuvable (supprimée) : retour à la liste.
  if (route !== "#/" && route !== "" && route !== "#") remplacer("#/");
  return accueil();
}

function afficher() {
  if (!app) return;
  app.replaceChildren(vue(location.hash));
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", afficher);
afficher();

initPwa();
