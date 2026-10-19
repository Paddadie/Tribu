# État en cours

**V2, session S1 Robustesse : code terminé**, non commité. Les 15 lignes sont cochées dans PLAN.md. Le titre S1 reste ouvert jusqu'au test sur téléphone. 115 tests verts, `tsc` et build propres. Build vérifié sous CSP (service worker, police, aucune erreur console).

## Avant S2a
- Paul : commiter S1, déployer, puis tester sur iPhone et Android. Critère de fin : un export partagé depuis le téléphone se réimporte. Si c'est bon, cocher le titre S1 dans PLAN.md.
- Ensuite `/clear`, puis session **S2a Socle** : lire seulement la section S2a de PLAN.md (pas de maquette, aucun changement visible). Commencer par TEST-01 (happy-dom, tests d'écran).

## Repères pour S2a
- Nouveaux modules de S1 :
  - src/ui/fichier.ts : export par partage, repli téléchargement ;
  - src/ui/bandeau.ts : bandeau temporaire, à réutiliser pour UX-07 ;
  - src/ui/annulation.ts : `changerAvecAnnulation` et `rafraichirEcran` ;
  - src/ui/illisible.ts : écran « Données illisibles ».
- src/ui/etat.ts :
  - refuse toute écriture tant que les données sont illisibles ;
  - `modifierDonneesAnnulable` renvoie la fonction d'annulation ;
  - les tests rechargent le module avec `vi.resetModules()` (voir src/ui/etat.test.ts).
- Vitest tourne en environnement « node » : happy-dom reste à ajouter (TEST-01).

## Points ouverts
- S3a : où mémoriser « Moi » (réglages ou données), à décider en début de session.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » s'affiche à l'enregistrement.
- TEST-03 non reproduit en S1. Pistes :
  - `npm test` lancé en même temps qu'un build ou que l'extension Vitest de VS Code ;
  - cache `node_modules/.vite`.
  À la prochaine occurrence, copier toute la sortie, y compris la première erreur avant le résumé.
- Icônes provisoires (S4).
