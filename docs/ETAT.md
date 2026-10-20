# État en cours

**Tout est commité au 21/10** (étapes 3, 3b, import par fusion, filtres de la liste, Réglages en onglets, raccourcis de l'accueil en fenêtres-listes, « copine / compagne »). Docs à jour (PLAN, SPEC, DECISIONS, context.md). Dernier relevé des tests : 482 (avant fusion et filtres), à relancer.
**Rendu non vu à l'œil** : accueil, Toutes les fiches (puces), agenda, Union, Réglages en onglets, fenêtres Groupes/Familles, fusion à l'import, UI-10 (PLAN 2-2 non coché), 2-3 (Données v5), PNG de l'arbre (canvas non testable sous happy-dom), groupes d'amis superposés (SPEC/DECISIONS pas à jour).
**À relire par Paul** : calendrier des fêtes (`src/modele/fetes.ts`) ; tester le `.ics` dans un agenda dédié « Tribu ».
**À trancher par Paul** : retirer aussi le parent « ? » du sélecteur de lien ? Si UI-10 validé : cocher PLAN 2-2 et noter la décision (sinon lignes à 8 px ou 3ᵉ graisse 700).
**Nettoyage possible** : `prochainsAnniversaires`, `anniversairesDeces`, `libelleDelai` (age.ts) ne servent peut-être plus qu'aux tests.

**Prochaine étape** : Paul lance `npm run captures` et valide le rendu ; puis étape 4 du PLAN.md.

**À faire par Paul** : confirmer que la forme de la famille peut être publique (sinon retirer fixtures/ et __snapshots__/) ; effacer le profil Edge temporaire (`%TEMP%\tribu-captures-*`) ; Prettier signale des fichiers non reformatés.
**À valider par Paul** : échelle minimale abaissée pour le pincement ; noms de famille masqués de loin s'ils se chevauchent ; « ? » enregistré au toucher.

## Points ouverts
- Sur téléphone : bandeau de mise à jour, Retour par geste iOS / bouton Android pendant une saisie, flou de la barre de l'arbre, vue « Tout », partage du PNG, défilement des vignettes « Bientôt ».
- UX-20 : couple entre deux fratries de la ligne des parents de Moi décalé d'environ 0,4 case.
- Si la disposition change exprès : `npx vitest run src/modele/arbreGlobal.fixture.test.ts -u`, après vérification à l'œil.
- « Isabelle et Alain » : si noms réels, les remplacer dans src/modele/arbreGlobal.test.ts.
- Connus : nom de famille coupé au bord de loin ; demi-fratrie absente si la rangée défile ; une personne dans un seul groupe ; ex et parent déjà ancêtre non grisés à l'ajout d'un conjoint ; beaux-frères sans section ; datalist à vérifier sur iPhone/Android ; TEST-03 non reproduit (copier toute la sortie au prochain échec).
