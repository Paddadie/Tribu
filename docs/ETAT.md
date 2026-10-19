# État en cours

**V1 terminée** : les 8 étapes du plan sont validées par Paul et cochées dans PLAN.md. Aucune étape ouverte.

## Fait
- Étapes 1 à 8 validées par Paul. L'étape 8 (maquette : https://claude.ai/artifact/NyL7yihbTtNpZzTZ1z1n6o) ajoute l'écran Réglages `#/reglages` (écrou sur la liste) : tri par prénom/nom appliqué à toute l'appli, thème auto/clair/sombre, export et import JSON avec confirmation, effacement des données, version.
- Fichiers de l'étape 8 : `src/ui/reglages.ts`, `src/ui/accueil.ts`, `src/ui/ajoutConjoint.ts`, `src/ui/ajoutLien.ts`, `src/ui/etat.ts`, `src/main.ts`, `src/modele/reglages.ts` + test, `src/modele/liste.ts` (`comparateur`, `nomListe`), `src/modele/stockage.ts` (`nomFichierExport`), `src/style.css`.
- 97 tests Vitest verts, `tsc` et `npm run build` propres.

## Prochaine action
Rien d'obligatoire. Pistes : section « Plus tard » de PLAN.md (autres critères de tri, arbre graphique, photos, partage, GEDCOM, recherche avancée), ou les points ouverts ci-dessous.

## Points ouverts
- Un parent déjà ancêtre de l'enfant n'est pas grisé dans la liste : le refus (« boucle ») s'affiche à l'enregistrement.
- Icônes de l'appli provisoires (3 cercles reliés).
- `npm test` échoue parfois au tout premier lancement d'une session (4 fichiers « failed », aucun test exécuté) ; relancé, tout passe. Cause inconnue.
