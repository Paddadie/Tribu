# État en cours

**Étape 1 — Squelette PWA**
Projet initialisé, déployé sur GitHub Pages, mise à jour auto à l'ouverture.
Terminé quand : l'appli est installée sur le téléphone et une nouvelle version déployée apparaît à la réouverture.

## Fait
- Cadrage terminé : docs/SPEC.md, PLAN.md, DECISIONS.md rédigés.
- Squelette codé : Vite + TS + vite-plugin-pwa (autoUpdate), page d'accueil affichant version + date de build, icônes provisoires (public/), workflow .github/workflows/deploy.yml.
- `npm run build` OK (SW avec skipWaiting + clientsClaim vérifié) ; `npm test` OK (aucun test pour l'instant, `--passWithNoTests`).

## Prochaine action
Paul : créer le dépôt GitHub « Tribu » (sinon adapter `base` et `start_url`/`scope` dans vite.config.ts), activer Pages (Settings > Pages > Source : GitHub Actions), commiter et pousser sur `main`.
Puis valider sur le téléphone : installer, redéployer une modif, rouvrir et vérifier que la date de build change. Cocher alors l'étape 1 dans PLAN.md.

## Points ouverts
- Dépôt GitHub distant à créer par Paul.
- Icônes provisoires (3 cercles reliés), à remplacer plus tard si souhaité.
- Test sur téléphone non fait (nécessite le déploiement).
