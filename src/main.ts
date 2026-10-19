import "@fontsource-variable/figtree";
import "./style.css";
import { initPwa } from "./pwa";
import { accueil } from "./ui/accueil";
import { ajoutConjoint } from "./ui/ajoutConjoint";
import { ajoutLien } from "./ui/ajoutLien";
import { lireDonnees } from "./ui/etat";
import { fiche } from "./ui/fiche";
import { formulaire } from "./ui/formulaire";
import { ecranLien } from "./ui/lien";
import { ecranUnion } from "./ui/union";

// Routage par hash (compatible GitHub Pages) :
//   #/                 liste          #/personne/<id>   fiche
//   #/nouveau          création       #/modifier/<id>   modification
//   #/conjoint/<id>    ajout d'un conjoint à la personne
//   #/union/<id>       union de la personne (marié, fin d'union)
//   #/parent/<id>      ajout d'un parent à la personne    #/enfant/<id>   ajout d'un enfant
//   #/lien/<filiation>/<id>   type du lien parent-enfant, ouvert depuis la fiche de <id>
const app = document.querySelector<HTMLElement>("#app");

/** Remplace la route courante : le bouton Retour ne revient pas sur l'écran quitté. */
const remplacer = (route: string) => location.replace(route);

function vue(route: string): HTMLElement {
  const [, section, id] = route.split("/");
  const personne = lireDonnees().personnes.find((p) => p.id === id);
  if (section === "nouveau") return formulaire(undefined, remplacer);
  if (section === "personne" && personne) return fiche(personne, remplacer);
  if (section === "modifier" && personne) return formulaire(personne, remplacer);
  if (section === "conjoint" && personne) return ajoutConjoint(personne, remplacer);
  if (section === "union" && personne) return ecranUnion(personne, remplacer);
  if ((section === "parent" || section === "enfant") && personne) return ajoutLien(personne, section, remplacer);
  if (section === "lien") {
    const origine = lireDonnees().personnes.find((p) => p.id === route.split("/")[3]);
    if (origine) return ecranLien(id, origine, remplacer);
  }
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
