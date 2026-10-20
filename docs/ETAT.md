# État en cours

**UI-10 codé, en attente de validation de Paul** (PLAN.md, 2-2 Nettoyages, ligne pas encore cochée). Jetons dans src/styles/base.css : `--rayon-s/m/l`, `--ombre-basse/haute`, `--gras` (600 ; 500 → 400). Padding, margin et gap arrondis au multiple de 4. Écarts vus : lignes de liste plus hautes (10 → 12 px), 700 → 600 moins gras. Options si trop visible : lignes à 8 px, ou garder une 3e graisse 700. Captures avant/après dans le scratchpad de l'ancienne session (seule la fiche en clair comparée ; reste l'arbre).

**Étape 2-3 (Données v5) faite le 20/10, non commitée, tests/tsc/build verts (421 tests)** : CODE-06 (`Personne.sansNom`, `estParentSansNom` ne lit plus le prénom), `Union.date` (FEATURE-15, `modifierDateUnion`), `prendLeNom` dans `ajouterUnion`/`modifierUnion` (CODE-08), `migrer()` v4 → v5, fixture en v5. Écrans codés sans maquette sur demande de Paul : champ date à l'ajout de conjoint et dans l'écran Union, « Union en 2012 » sur la fiche, case « Prend le nom… » quand « Marié(e) » est allumé. Rendu non vérifié à l'œil ni par `npm run captures`.

**Prochaine étape** : Paul regarde les écrans de 2-3 (`npm run captures`) et les captures UI-10. Si UI-10 validé : cocher dans PLAN.md, noter la décision (arrondis, 500 → 400) dans DECISIONS.md. Puis étape 3 (FEATURE-11 `.ics`, FEATURE-13, FEATURE-14).

**À faire par Paul** : confirmer que la forme de la famille peut être publique (sinon ne pas commiter fixtures/ ni __snapshots__/) ; commiter 1a, 1b, 2-1, 2-2, UI-10 et 2-3 ; effacer le profil Edge temporaire des captures (`%TEMP%\tribu-captures-*`). Prettier signale encore des fichiers non reformatés (main.ts, ui/groupes.ts, ui/ajoutAmi.ts, champsPersonne.ts, etat.ts, formulaire.ts, lien.ts, confirmer.ts, stockage.test.ts…).

**À valider par Paul** : échelle minimale abaissée pour le pincement ; de loin, noms de famille qui se chevauchent masqués ; « ? » enregistré au toucher (Retour ramène à l'arbre).

## Points ouverts
- À vérifier sur téléphone : bandeau de mise à jour, Retour par geste iOS et bouton Android pendant une saisie, flou de la barre de l'arbre, vue « Tout » sur le vrai arbre.
- UX-20 : couple entre deux fratries de la ligne des parents de Moi décalé d'environ 0,4 case (ne bouge pas).
- Si la disposition change exprès : `npx vitest run src/modele/arbreGlobal.fixture.test.ts -u`, après vérification à l'œil.
- « Isabelle et Alain » : si noms réels, les remplacer dans src/modele/arbreGlobal.test.ts.
- Connus : nom de famille coupé au bord de l'écran de loin ; demi-fratrie absente si la rangée défile ; épaisseur des couples au dézoom ; une personne dans un seul groupe ; ex et parent déjà ancêtre non grisés à l'ajout d'un conjoint ; beaux-frères sans section ; `signaler` en attente hors fiche ; datalist à vérifier sur iPhone/Android ; TEST-03 non reproduit (« Timeout terminating forks worker » / « kill EPERM » vus sans échec : copier toute la sortie au prochain échec).
