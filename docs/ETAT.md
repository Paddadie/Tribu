# État en cours

**V1 terminée. V2 planifiée** après l'audit du 19/10/2026 : 6 sessions dans PLAN.md (section V2), décisions 52 et suivantes dans DECISIONS.md. Aucune session V2 commencée, aucun code modifié depuis la V1.

## Prochaine action
Session **S1 Robustesse** : lire seulement la section S1 de PLAN.md.
1. Maquette d'abord : écran « Données illisibles », Réglages (date du dernier export, export par partage, Effacer désactivé), accueil vide. La publier, laisser Paul réagir, coder seulement après sa validation.
2. Commencer le code par DATA-01 et TEST-02 (risque de perte de données).

## Repères pour S1
- Le risque : `charger()` (src/modele/stockage.ts) renvoie des données vides si le contenu est invalide ; src/ui/etat.ts charge à l'import du module, puis `modifierDonnees` réécrit la clé `tribu:donnees`.
- Export actuel : `<a download>` sur un blob dans src/ui/reglages.ts ; le message de succès est affiché sans preuve.
- Réglages sous `tribu:reglages` (src/modele/reglages.ts, chargement tolérant champ par champ) : la date du dernier export peut y vivre.
- L'étiquette « Biologique » et l'`alert()` de suppression sont dans src/ui/fiche.ts.
- Départ : 97 tests Vitest verts, `tsc` et build propres.

## Points ouverts
- S3a : où mémoriser « Moi » (réglages ou données), à décider en début de session.
- Un parent déjà ancêtre de l'enfant n'est pas grisé : le refus « boucle » s'affiche à l'enregistrement.
- `npm test` échoue parfois au premier lancement d'une session ; relancé, tout passe (enquête en S1, TEST-03).
- Icônes provisoires (S4).
