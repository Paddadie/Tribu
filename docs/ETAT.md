# État en cours

**Étape 3b — Page d'accueil (codée le 21/10, non commitée, 482 tests, tsc et build verts)** : maquette « portrait de famille » validée. `#/` = salutation, recherche avec « Créer », Aujourd'hui, Bientôt, souvenir, 4 raccourcis ; liste en `#/personnes` ; agenda `#/agenda` ; noces (`noces.ts`), fêtes (`fetes.ts`, réglage + option `.ics`), `evenements.ts` ; naissance/décès futurs refusés et vérifiés. PLAN, SPEC, DECISIONS, context.md à jour. Rendu non vu à l'œil.
**À relire par Paul** : le calendrier des fêtes (`src/modele/fetes.ts`, prénoms et saints).
**Nettoyage possible** : `prochainsAnniversaires`, `anniversairesDeces`, `libelleDelai` (age.ts) ne servent peut-être plus qu'aux tests.

**Étape 3 codée, non commitée** : FEATURE-11 (`.ics`), FEATURE-13 (« Vérifier mes données »), FEATURE-14 (PNG, `src/ui/arbreImage.ts`, géométrie partagée dans `geometrieArbre.ts`). Le dessin canvas n'est pas testable sous happy-dom.
**Parent « ? » hors des listes (20/10, non vu à l'œil)** : à trancher par Paul, le retirer aussi du sélecteur de lien ?
**Groupes d'amis superposés (codé)** : SPEC/DECISIONS pas mis à jour ; rendu non vu.
**UI-10 codé, en attente de validation** (PLAN.md 2-2 non coché). Jetons dans src/styles/base.css. Si trop visible : lignes à 8 px, ou garder une 3e graisse 700.
**Étape 2-3 (Données v5) faite le 20/10** : écrans codés sans maquette, rendu non vérifié.

**Prochaine étape** : Paul lance `npm run captures` (accueil, Toutes les fiches, agenda, écran Union, réglages ; 2-3, UI-10, vérification, PNG, arbre) et teste le `.ics` dans un agenda dédié « Tribu ». Si UI-10 validé : cocher dans PLAN.md, décision dans DECISIONS.md. Puis étape 4 du PLAN.md.

**À faire par Paul** : confirmer que la forme de la famille peut être publique (sinon ne pas commiter fixtures/ ni __snapshots__/) ; commiter les étapes en attente ; effacer le profil Edge temporaire (`%TEMP%\tribu-captures-*`). Prettier signale encore des fichiers non reformatés.

**À valider par Paul** : échelle minimale abaissée pour le pincement ; noms de famille masqués de loin s'ils se chevauchent ; « ? » enregistré au toucher.

## Points ouverts
- Sur téléphone : bandeau de mise à jour, Retour par geste iOS / bouton Android pendant une saisie, flou de la barre de l'arbre, vue « Tout », partage du PNG, défilement des vignettes « Bientôt ».
- UX-20 : couple entre deux fratries de la ligne des parents de Moi décalé d'environ 0,4 case.
- Si la disposition change exprès : `npx vitest run src/modele/arbreGlobal.fixture.test.ts -u`, après vérification à l'œil.
- « Isabelle et Alain » : si noms réels, les remplacer dans src/modele/arbreGlobal.test.ts.
- Connus : nom de famille coupé au bord de loin ; demi-fratrie absente si la rangée défile ; une personne dans un seul groupe ; ex et parent déjà ancêtre non grisés à l'ajout d'un conjoint ; beaux-frères sans section ; datalist à vérifier sur iPhone/Android ; TEST-03 non reproduit (copier toute la sortie au prochain échec).
