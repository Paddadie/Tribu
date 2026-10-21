# État en cours

**Non commité** (à commiter par Paul) : audit UX/UI, étapes 1 à 6, sessions C et D (voir ci-dessous). Tests 531, `tsc` et build verts au 21/10.
**Audit UX/UI** : rapport publié (https://claude.ai/artifact/5FzpsxbmAw7qgUyC2oXoZH, privé) ; maquettes validées par Paul : accueil « sobre affinée » (A), fiche « compacte » (A). Captures hors dépôt : scratchpad de la session.

## Fait (plan d'audit)
1-2. `.defile` de l'accueil renommé `.defile-bientot` ; `--bord-champ` à 3:1 ; carte « Aujourd'hui » en `--accent-clair` en sombre.
3. Formulaires d'ajout : pastille « pour <personne> », « Type de lien » sous le choix, onglet « Déjà dans Tribu ».
4. Fiche : en-tête à gauche, « Modifier » en icône, crayons gris, familles élargies > 6 repliées (`<details>`).
5. « Modifier » : retour + « Modifier <prénom> » ; microcopie ; croix des groupes grises.
6. Accueil A : vignettes « Bientôt » à pastille de date, raccourcis en piles d'avatars + icônes.
C. Décédés pâles partout (`avatarPersonne`) ; sélection « clair » / « plein ».
D (21/10, captures claires de la fiche et de l'arbre vues, le reste non revu) :
- Dessin « Famille proche » : conjoint à gauche, fratrie entière à droite par âge (`arbre.ts`, `decal`).
- Fiche : section « Parents et fratrie » (demis inclus), lignes « sœur · 65 ans » via `detailProche` (age.ts, testé).
- Barre de l'arbre : segment « Toi | Tout », filet, outils « Familles » / « Amis » avec icône.
- Toutes les fiches : puces sur une ligne qui défile, index fin, bouton « + Nouvelle fiche ».

## Reste à faire
- **D, non fait** : pile d'avatars qui replie « Neveux et nièces » / « Belle-famille » ; âge sous les nœuds du dessin (maquette floue) ; astuce de l'arbre en haut avec « Compris » ; zoom en un bloc.
- **P3** (sur accord) : Réglages, couleurs de familles (instantané de la fixture à régénérer), deux colonnes sur ordinateur.

**Prochaine étape** : Paul regarde les captures (`npm run captures -- <export.json> <dossier>`) : fiche, arbre, Toutes les fiches, clair et sombre, avec ses vraies données ; puis valider ou ajuster D. Après validation : cocher PLAN.md, DECISIONS.md, SPEC.md (pas encore mis à jour).

## À valider / à faire par Paul
- Rendu non vu : Toutes les fiches, accueil sur téléphone, écrans d'ajout en clair.
- Calendrier des fêtes (`fetes.ts`) ; `.ics` ; forme de la famille publique (fixtures/, __snapshots__/) ; profils Edge `%TEMP%\tribu-captures-*` ; Prettier signale des fichiers non reformatés (déjà avant D).

## Points ouverts
- Téléphone : bandeau de mise à jour, Retour par geste pendant une saisie, flou de la barre de l'arbre, partage du PNG.
- UX-20 : couple entre deux fratries décalé d'environ 0,4 case ; instantané de la fixture à régénérer (`npx vitest run src/modele/arbreGlobal.fixture.test.ts -u`) seulement après vérification à l'œil.
- Nettoyage possible : `prochainsAnniversaires`, `anniversairesDeces`, `libelleDelai` (age.ts).
