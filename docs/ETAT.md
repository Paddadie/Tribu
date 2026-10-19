# État en cours

**V2, session S2a Socle : terminée**, non commitée. Les 8 lignes et le titre S2a sont cochés dans PLAN.md. 134 tests verts, `tsc` et build propres. S1 est commitée ; son test sur téléphone reste à faire.

## Avant S2b
- Paul : commiter, déployer, puis tester sur iPhone et Android.
  - S1 : un export partagé depuis le téléphone se réimporte ; si c'est bon, cocher le titre S1 dans PLAN.md.
  - S2a : liste → fiche → autre fiche → Retour, puis Retour : on remonte d'un écran à la fois et la liste garde sa position.
  - Thème sombre (téléphone en mode sombre) : pas d'éclair clair au lancement.
- Ensuite `/clear`, puis session **S2b Parcours** : lire seulement la section S2b de PLAN.md. Maquette d'abord, à valider par Paul avant tout code.

## Repères
- src/parcours.test.ts : tests d'écran sous happy-dom (`demarrer(donnees, route)` recharge main.ts). En tête, émulation du vrai navigateur : `replaceState` sans `hashchange`, `history.back` différé (happy-dom fait autrement).
- src/ui/navigation.ts : `remplacer`, `revenir`, `lienRetour` ; chaque entrée d'historique porte `{route, profondeur}` ; un double toucher sur Retour ne recule qu'une fois. Les écrans n'ont plus de paramètre `naviguer`.
- src/ui/selecteurPersonne.ts : sélecteur commun (conjoint, parent, enfant).
- src/ui/lignePersonne.ts : `contenuLigne` (avatar + nom + détail).
- Modèle : `enCouple`, `aDesLiens`, `MOTIF_DATE` dans modele.ts.
- Modules de S1 : fichier.ts (export), bandeau.ts (à réutiliser pour UX-07), annulation.ts, illisible.ts.

## Points ouverts
- À valider par Paul : bandeau « Annuler », accords « Marié(e) » / « Adoptif(ve) ».
- S3a : où mémoriser « Moi » (réglages ou données), à décider en début de session.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » s'affiche à l'enregistrement.
- TEST-03 non reproduit. Pistes : `npm test` en même temps qu'un build ou que l'extension Vitest de VS Code ; cache `node_modules/.vite`. À la prochaine occurrence, copier toute la sortie.
- Icônes provisoires (S4).
