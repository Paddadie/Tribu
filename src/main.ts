import "@fontsource-variable/figtree";
import "./style.css";
import { initPwa } from "./pwa";
import { accueil } from "./ui/accueil";
import { ajoutConjoint } from "./ui/ajoutConjoint";
import { ajoutLien } from "./ui/ajoutLien";
import { EVENEMENT_RAFRAICHIR } from "./ui/annulation";
import { appliquerTheme, lireBrutIllisible, lireDonnees } from "./ui/etat";
import { fiche } from "./ui/fiche";
import { formulaire } from "./ui/formulaire";
import { ecranIllisible } from "./ui/illisible";
import { ecranLien } from "./ui/lien";
import { demarrerNavigation, remplacer } from "./ui/navigation";
import { ecranReglages } from "./ui/reglages";
import { ecranUnion } from "./ui/union";

// Routage par hash (compatible GitHub Pages) :
//   #/                 liste          #/personne/<id>   fiche
//   #/reglages         réglages (tri, thème, sauvegarde)
//   #/nouveau          création       #/modifier/<id>   modification
//   #/conjoint/<id>    ajout d'un conjoint à la personne
//   #/union/<id>       union de la personne (marié, fin d'union)
//   #/parent/<id>      ajout d'un parent à la personne    #/enfant/<id>   ajout d'un enfant
//   #/lien/<filiation>/<id>   type du lien parent-enfant, ouvert depuis la fiche de <id>
const app = document.querySelector<HTMLElement>("#app");

function vue(route: string): HTMLElement {
  // Données illisibles : cet écran remplace tous les autres jusqu'au choix de Paul.
  const brut = lireBrutIllisible();
  if (brut !== null) return ecranIllisible(brut, () => (route === "#/" ? afficher() : remplacer("#/")));
  const [, section, id] = route.split("/");
  const personne = lireDonnees().personnes.find((p) => p.id === id);
  if (section === "reglages") return ecranReglages();
  if (section === "nouveau") return formulaire(undefined);
  if (section === "personne" && personne) return fiche(personne);
  if (section === "modifier" && personne) return formulaire(personne);
  if (section === "conjoint" && personne) return ajoutConjoint(personne);
  if (section === "union" && personne) return ecranUnion(personne);
  if ((section === "parent" || section === "enfant") && personne) return ajoutLien(personne, section);
  if (section === "lien") {
    const origine = lireDonnees().personnes.find((p) => p.id === route.split("/")[3]);
    if (origine) return ecranLien(id, origine);
  }
  // Route inconnue ou personne introuvable (supprimée) : retour à la liste.
  if (!estListe(route)) remplacer("#/", false);
  return accueil();
}

const estListe = (route: string | undefined) => route === "#/" || route === "" || route === "#";

// Position de défilement de la liste, retrouvée en y revenant ; les autres écrans s'ouvrent en haut.
let routeAffichee: string | undefined;
let defilementListe = 0;

function afficher() {
  if (!app) return;
  if (estListe(routeAffichee)) defilementListe = window.scrollY;
  app.replaceChildren(vue(location.hash));
  routeAffichee = location.hash;
  window.scrollTo(0, estListe(routeAffichee) ? defilementListe : 0);
}

appliquerTheme();
// Après une annulation : même écran redessiné, sans remonter en haut.
window.addEventListener(EVENEMENT_RAFRAICHIR, () => app?.replaceChildren(vue(location.hash)));
// Demande au navigateur de ne pas purger le stockage sous contrainte d'espace (silencieux).
void navigator.storage?.persist?.().catch(() => {});
demarrerNavigation(afficher);

initPwa();
