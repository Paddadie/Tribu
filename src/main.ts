import "@fontsource-variable/figtree";
import "./style.css";
import { initPwa } from "./pwa";
import { accueil } from "./ui/accueil";
import { ajoutAmi } from "./ui/ajoutAmi";
import { ajoutConjoint } from "./ui/ajoutConjoint";
import { ajoutLien } from "./ui/ajoutLien";
import { EVENEMENT_RAFRAICHIR } from "./ui/annulation";
import { ecranArbre } from "./ui/arbreGlobal";
import { appliquerTheme, lireBrutIllisible, lireDonnees } from "./ui/etat";
import { fiche } from "./ui/fiche";
import { formulaire } from "./ui/formulaire";
import { ecranAjoutMembre, ecranGroupe, ecranGroupes, ecranNouveauGroupe } from "./ui/groupes";
import { ecranIllisible } from "./ui/illisible";
import { ecranLien } from "./ui/lien";
import { demarrerNavigation, profondeurCourante, remplacer } from "./ui/navigation";
import { ecranReglages } from "./ui/reglages";
import { ecranUnion } from "./ui/union";
import { ecranVerification } from "./ui/verification";

// Routage par hash (compatible GitHub Pages) :
//   #/                 liste          #/personne/<id>   fiche
//   #/reglages         réglages (tri, thème, sauvegarde)
//   #/nouveau          création       #/modifier/<id>   modification
//   #/conjoint/<id>    ajout d'un conjoint à la personne      #/ami/<id>   ajout d'un ami
//   #/union/<union>/<id>      union (marié, séparation, rétablissement), ouverte depuis la fiche de <id>
//   #/parent/<id>      ajout d'un parent à la personne    #/enfant/<id>   ajout d'un enfant
//   #/frere/<id>       ajout d'un frère ou d'une sœur (enfant des parents cochés)
//   #/lien/<filiation>/<id>   type du lien parent-enfant, ouvert depuis la fiche de <id>
//   #/verification    vérification des données (doublons, isolés, dates)
//   #/arbre            arbre de tous les liens autour de « Moi »
//   #/groupes          groupes d'amis      #/groupe/nouveau   création      #/groupe/<id>   détail      #/groupe/<id>/ajouter   ajout d'un membre
const app = document.querySelector<HTMLElement>("#app");

function vue(route: string): HTMLElement {
  // Données illisibles : cet écran remplace tous les autres jusqu'au choix de Paul.
  const brut = lireBrutIllisible();
  if (brut !== null) return ecranIllisible(brut, () => (route === "#/" ? afficher() : remplacer("#/")));
  const [, section, id] = route.split("/");
  const personne = lireDonnees().personnes.find((p) => p.id === id);
  if (section === "reglages") return ecranReglages();
  if (section === "arbre") return ecranArbre();
  if (section === "verification") return ecranVerification();
  if (section === "groupes") return ecranGroupes();
  if (section === "groupe" && id === "nouveau") return ecranNouveauGroupe();
  if (section === "groupe") {
    const groupe = lireDonnees().groupes.find((g) => g.id === id);
    if (groupe) return route.split("/")[3] === "ajouter" ? ecranAjoutMembre(groupe) : ecranGroupe(groupe);
  }
  if (section === "nouveau") return formulaire(undefined);
  if (section === "personne" && personne) return fiche(personne);
  if (section === "modifier" && personne) return formulaire(personne);
  if (section === "conjoint" && personne) return ajoutConjoint(personne);
  if (section === "ex" && personne) return ajoutConjoint(personne, true);
  if (section === "ami" && personne) return ajoutAmi(personne);
  if (section === "union") {
    const origine = lireDonnees().personnes.find((p) => p.id === route.split("/")[3]);
    if (origine) return ecranUnion(origine, id);
  }
  if ((section === "parent" || section === "enfant" || section === "frere") && personne) return ajoutLien(personne, section, lireDonnees());
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

// Glissement latéral (ANIM-01) : sens déduit de la profondeur d'historique, sans animation si le téléphone demande moins de mouvement.
let profondeurAffichee = -1;
const peutAnimer = () =>
  typeof document.startViewTransition === "function" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function afficher() {
  if (!app) return;
  if (estListe(routeAffichee)) defilementListe = window.scrollY;
  const dessiner = () => {
    app.replaceChildren(vue(location.hash));
    routeAffichee = location.hash;
    window.scrollTo(0, estListe(routeAffichee) ? defilementListe : 0);
  };
  const profondeur = profondeurCourante();
  const sens = profondeur > profondeurAffichee ? "avant" : profondeur < profondeurAffichee ? "arriere" : null;
  const premier = routeAffichee === undefined;
  profondeurAffichee = profondeur;
  if (premier || sens === null || !peutAnimer()) return dessiner();
  const classe = `nav-${sens}`;
  document.documentElement.classList.add(classe);
  const fin = () => document.documentElement.classList.remove(classe);
  document.startViewTransition(dessiner).finished.then(fin, fin);
}

appliquerTheme();
// Après une annulation : même écran redessiné, sans remonter en haut.
window.addEventListener(EVENEMENT_RAFRAICHIR, () => app?.replaceChildren(vue(location.hash)));
// Demande au navigateur de ne pas purger le stockage sous contrainte d'espace (silencieux).
void navigator.storage?.persist?.().catch(() => {});
demarrerNavigation(afficher);

initPwa();
