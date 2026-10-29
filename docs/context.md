# Contexte stable de Tribu

But : mémo familial perso, téléphone d’abord puis tablette et ordinateur (VIS-03) (fiches, unions et ex, parents/enfants, fratrie déduite, groupes d'amis, arbre global). Données v4 en localStorage (`tribu:donnees`, `tribu:reglages`), export JSON.
Pile : TypeScript sans framework, Vite, vite-plugin-pwa, Vitest (happy-dom pour les écrans), GitHub Pages sous `/Tribu/`.
Commandes : `npm run dev`, `npm test`, `npm run build` (`tsc` compris), `npm run format:check`, `npm run captures -- <export.json> <dossier> [id-de-Moi]` (Edge headless + dev sur 5199, export et sortie hors dépôt), `npm run anonymiser -- <export.json> "<Prénom Nom de Moi>"` (réécrit la fixture), `npm run familles -- <dossier>` (familles fictives + familles.json) puis `npm run captures -- --familles <dossier> captures/<nom>` (3 appareils).

## Carte du code
- src/modele/types.ts : `Personne`, `Union`, `Filiation`, `GroupeAmis`, `Donnees`. migration.ts : `migrer()` v1 → v4.
- src/modele/modele.ts : opérations pures (`creerPersonne`, `ajouterUnion`, `ajouterFiliation`, groupes), `estDecede`, `personnesVisibles`, `personnesListees`, `groupesDeLaFamille`.
- src/modele/deductions.ts : `amis`, `relation`, `chemin`, `fratrie` (`freresComplets`), `parcours`. familleProche.ts : dessin « Famille proche » sans DOM, `familleProche` (qui) puis `disposerFoyer(f, largeur)` (où) ; tests de référence sur tests/fixtures/famille-proche (src/ui/familleProche.test.ts). parente.ts : `etiquette`, `motsChemin`, `lienDepuisAmi`. saisie.ts : `suggestions`.
- src/modele/arbreGlobal.ts : `disposerArbre(d, moi)` → places, couples, branches, `groupes`, `etiquettes`. partie.ts : `disposerPartie` en étapes (blocs, générations, classe `Lignes`). parentSansNom.ts : parent « ? ».
- src/modele/anonymiser.ts + fixtures/arbre-anonyme.json : vrai arbre anonymisé ; arbreGlobal.fixture.test.ts = invariants et instantané (à régénérer avec `-u` seulement si la disposition change exprès).
- src/modele/evenements.ts : `evenementsAVenir(d, aujourdhui, jours, {fetes})` (anniversaires, unions, fêtes, décès) ; noces.ts (`dureeUnion`, nom des noces) ; fetes.ts (calendrier des prénoms, `entreesCalendrier`).
- src/modele/fusion.ts : import par fusion (`fusionner`, questions de conflit) ; src/ui/choisir.ts (question à choix), fenetreListe.ts (fenêtre-liste), import.ts, reglages.ts (4 onglets).
- src/modele/filtres.ts : filtres de la liste (`filtrerListe`, `manquesDe`, `familleDe`).
- src/ui/accueil.ts (salutation, recherche, Aujourd'hui, Bientôt, souvenir, raccourcis), personnes.ts (`#/personnes`, liste + index), agenda.ts (`#/agenda`).
- src/ui/ : fiche.ts, arbre.ts (`dessinFoyer` = rendu seul, `dessinChemin`), arbreGlobal.ts (classe `Carte`, gestes, feuilles Familles/Amis), ajoutAmi.ts, groupes.ts, champsPersonne.ts. src/main.ts : routes et View Transition.
- src/style.css : jetons en tête ; blocs « Dessins de la fiche », « Arbre global », « États communs », « Animations » en fin.
- src/modele/test/ (lot 0 de V4) : familles.ts (générateur à graine, `famillesDeReference`), invariants.ts (`verifierInvariants`), outils.ts (`jouer`, `finsSelonLOrdre`, `canonique`), disposition.ts (`fautesDisposition`, `metriques`) ; scenarios.test.ts (L1 à L5), sequences.test.ts ; seuils de l'arbre dans src/modele/arbreGlobal.invariants.test.ts.
- Tests : `*.test.ts` à côté du code ; src/parcours.test.ts = écrans sous happy-dom (`demarrer(donnees, route, reglages?)`).

## Pièges
- `h()` supprime un attribut à `false` ; `saisir` n'envoie que `input` (envoyer `change` à la main).
- Tout écran de personnes passe par `personnesVisibles(d)` (parents inconnus cachés) ; listes et choix par `personnesListees(d)` (parents « ? » sans nom cachés en plus).
- `ChampsIdentite.lire()` lève une erreur sur une date incomplète : hors `try`, utiliser `lireNom()`.
- Aucun nom réel de proche dans le code ni les tests (noms d'emprunt). docs/ est public, comme le reste du dépôt.
- Export réel (`tribu-*.json`, dans Téléchargements, hors dépôt) : seulement pour lire des structures. Jamais de nom, date, lieu ou note réels dans le code, les tests, les fixtures, les commentaires, docs/ ou un message de commit ; on reproduit la structure avec des familles fictives. Captures réelles hors dépôt (scratchpad) seulement. Avant de rendre la main : vérifier qu'aucun nom de l'export ne figure dans les fichiers touchés.

## Renvois
docs/ETAT.md (état, prochaine étape), docs/PLAN.md (étapes), docs/SPEC.md (comportement), docs/DECISIONS.md (décisions datées), README.md (format d'export).
