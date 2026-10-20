# État en cours

**Étape 3 codée, non commitée, tests/tsc/build verts (445 tests)** : FEATURE-11 (export `.ics`, `src/modele/agenda.ts`), FEATURE-13 (« Vérifier mes données », `src/modele/verification.ts`, écran `#/verification`), FEATURE-14 (export PNG de l'arbre, `src/ui/arbreImage.ts`). Maquettes validées par Paul. PLAN.md coché, SPEC.md à jour ; DECISIONS.md non touché.
Réglages : section « Exports » (ex-« Agenda ») = agenda + image ; section « Données » = lien Vérifier + Effacer.
Refactor : la géométrie de l'arbre est extraite dans `src/ui/geometrieArbre.ts` (partagée écran/PNG) ; l'instantané de la fixture n'a pas bougé, mais rendu écran non revu à l'œil. Le dessin canvas n'est pas testable sous happy-dom (seuls `dimensionsImage` et `melanger` le sont).

**UI-10 codé, en attente de validation de Paul** (PLAN.md, 2-2, ligne pas cochée). Jetons dans src/styles/base.css : `--rayon-s/m/l`, `--ombre-basse/haute`, `--gras` (600 ; 500 → 400). Écarts : lignes de liste plus hautes (10 → 12 px), 700 → 600. Options si trop visible : lignes à 8 px, ou garder une 3e graisse 700.

**Étape 2-3 (Données v5) faite le 20/10** : `Personne.sansNom`, `Union.date`, `prendLeNom`, `migrer()` v4 → v5. Écrans codés sans maquette sur demande de Paul, rendu non vérifié.

**Prochaine étape** : Paul lance `npm run captures` (écrans 2-3, UI-10, agenda, vérification, PNG, arbre après refactor) et teste le `.ics` dans un agenda dédié « Tribu ». Si UI-10 validé : cocher dans PLAN.md, décision (arrondis, 500 → 400) dans DECISIONS.md. Puis étape 4 du PLAN.md.

**À faire par Paul** : confirmer que la forme de la famille peut être publique (sinon ne pas commiter fixtures/ ni __snapshots__/) ; commiter 1a, 1b, 2-1, 2-2, UI-10, 2-3 et étape 3 ; effacer le profil Edge temporaire (`%TEMP%\tribu-captures-*`). Prettier signale encore des fichiers non reformatés (main.ts, ui/groupes.ts, ui/ajoutAmi.ts, champsPersonne.ts, etat.ts, formulaire.ts, lien.ts, confirmer.ts, stockage.test.ts…).

**À valider par Paul** : échelle minimale abaissée pour le pincement ; noms de famille masqués de loin s'ils se chevauchent ; « ? » enregistré au toucher.

## Points ouverts
- Sur téléphone : bandeau de mise à jour, Retour par geste iOS / bouton Android pendant une saisie, flou de la barre de l'arbre, vue « Tout », partage du PNG.
- UX-20 : couple entre deux fratries de la ligne des parents de Moi décalé d'environ 0,4 case.
- Si la disposition change exprès : `npx vitest run src/modele/arbreGlobal.fixture.test.ts -u`, après vérification à l'œil.
- « Isabelle et Alain » : si noms réels, les remplacer dans src/modele/arbreGlobal.test.ts.
- Connus : nom de famille coupé au bord de loin ; demi-fratrie absente si la rangée défile ; une personne dans un seul groupe ; ex et parent déjà ancêtre non grisés à l'ajout d'un conjoint ; beaux-frères sans section ; datalist à vérifier sur iPhone/Android ; TEST-03 non reproduit (« Timeout terminating forks worker » / « kill EPERM » vus sans échec : copier toute la sortie au prochain échec).
