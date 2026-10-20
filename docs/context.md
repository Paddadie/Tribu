# Contexte stable de Tribu

But : mémo familial perso, téléphone d’abord puis tablette et ordinateur (VIS-03) (fiches, unions et ex, parents/enfants, fratrie déduite, groupes d'amis, arbre global). Données v4 en localStorage (`tribu:donnees`, `tribu:reglages`), export JSON.
Pile : TypeScript sans framework, Vite, vite-plugin-pwa, Vitest (happy-dom pour les écrans), GitHub Pages sous `/Tribu/`.
Commandes : `npm run dev`, `npm test`, `npm run build` (`tsc` compris), `npm run format:check`, `npm run captures -- <export.json> <dossier> [id-de-Moi]` (Edge headless + dev sur 5199, export et sortie hors dépôt), `npm run anonymiser -- <export.json> "<Prénom Nom de Moi>"` (réécrit la fixture).

## Carte du code
- src/modele/types.ts : `Personne`, `Union`, `Filiation`, `GroupeAmis`, `Donnees`. migration.ts : `migrer()` v1 → v4.
- src/modele/modele.ts : opérations pures (`creerPersonne`, `ajouterUnion`, `ajouterFiliation`, groupes), `estDecede`, `personnesVisibles`, `personnesListees`, `groupesDeLaFamille`.
- src/modele/deductions.ts : `amis`, `relation`, `chemin`, `foyer`, `parcours`. parente.ts : `etiquette`, `motsChemin`, `lienDepuisAmi`. saisie.ts : `suggestions`.
- src/modele/arbreGlobal.ts : `disposerArbre(d, moi)` → places, couples, branches, `groupes`, `etiquettes`. partie.ts : `disposerPartie` en étapes (blocs, générations, classe `Lignes`). parentSansNom.ts : parent « ? ».
- src/modele/anonymiser.ts + fixtures/arbre-anonyme.json : vrai arbre anonymisé ; arbreGlobal.fixture.test.ts = invariants et instantané (à régénérer avec `-u` seulement si la disposition change exprès).
- src/modele/evenements.ts : `evenementsAVenir(d, aujourdhui, jours, {fetes})` (anniversaires, unions, fêtes, décès) ; noces.ts (`dureeUnion`, nom des noces) ; fetes.ts (calendrier des prénoms, `entreesCalendrier`).
- src/ui/accueil.ts (salutation, recherche, Aujourd'hui, Bientôt, souvenir, raccourcis), personnes.ts (`#/personnes`, liste + index), agenda.ts (`#/agenda`).
- src/ui/ : fiche.ts, arbre.ts (`dessinFoyer`, `dessinChemin`), arbreGlobal.ts (classe `Carte`, gestes, feuilles Familles/Amis), ajoutAmi.ts, groupes.ts, champsPersonne.ts. src/main.ts : routes et View Transition.
- src/style.css : jetons en tête ; blocs « Dessins de la fiche », « Arbre global », « États communs », « Animations » en fin.
- Tests : `*.test.ts` à côté du code ; src/parcours.test.ts = écrans sous happy-dom (`demarrer(donnees, route, reglages?)`).

## Pièges
- `h()` supprime un attribut à `false` ; `saisir` n'envoie que `input` (envoyer `change` à la main).
- Tout écran de personnes passe par `personnesVisibles(d)` (parents inconnus cachés) ; listes et choix par `personnesListees(d)` (parents « ? » sans nom cachés en plus).
- `ChampsIdentite.lire()` lève une erreur sur une date incomplète : hors `try`, utiliser `lireNom()`.
- Aucun nom réel de proche dans le code ni les tests (noms d'emprunt). docs/ est public, comme le reste du dépôt.

## Renvois
docs/ETAT.md (état, prochaine étape), docs/PLAN.md (étapes), docs/SPEC.md (comportement), docs/DECISIONS.md (décisions datées), README.md (format d'export).
