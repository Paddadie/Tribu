# Décisions

2026-10-19 | PWA mobile uniquement, usage personnel en V1 | besoin perso, partage reporté
2026-10-19 | Stack et hébergement repris de YamsApp (TS sans framework, Vite, vite-plugin-pwa, Vitest, GitHub Pages) | déjà maîtrisés
2026-10-19 | Stockage localStorage + sauvegarde JSON, comme YamsApp | pas de BDD ni d'interconnexion nécessaires
2026-10-19 | Mise à jour auto de l'appli à l'ouverture, comme YamsApp | toujours la dernière version sans action
2026-10-19 | Conjoints et enfants sont des fiches reliées, pas des champs texte | permet adoption et familles recomposées
2026-10-19 | Liens parent → enfant typés biologique ou adoptif | familles recomposées et adoption en V1
2026-10-19 | Frères et sœurs et enfants d'un couple déduits, jamais saisis | évite les incohérences
2026-10-19 | Date de naissance facultative | sert à trier les enfants
2026-10-19 | Accueil en liste + fiches ; vue arbre reportée | un arbre se lit mal sur téléphone
2026-10-19 | Pas de photos en V1 | localStorage limité à ~5 Mo
2026-10-19 | Mise à jour en mode `autoUpdate` (skipWaiting + clientsClaim explicites, rechargement auto), et non le bandeau « Mettre à jour » de YamsApp | pas de saisie longue à protéger comme une partie de jeu ; « sans action » voulu. Revérification aussi au retour au premier plan (visibilitychange)
2026-10-19 | `.npmrc` avec `legacy-peer-deps=true` | npm 10.9.0 plante (« reading 'edgesOut' ») sur la résolution des peer deps de ce jeu de dépendances ; même réglage en local et en CI
2026-10-19 | `base` Vite = `/Tribu/` (nom du dépôt GitHub = Tribu) | exigé par GitHub Pages ; à changer si le dépôt porte un autre nom
