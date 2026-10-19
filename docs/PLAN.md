# Tribu — Plan de développement

## V1

- [ ] **1. Squelette PWA** — Projet initialisé, déployé sur GitHub Pages, mise à jour auto à l'ouverture.
  Terminé quand : l'appli est installée sur le téléphone et une nouvelle version déployée apparaît à la réouverture.

- [ ] **2. Modèle et stockage** — Personnes, unions, filiations dans localStorage ; déductions (enfants d'un couple, frères et sœurs, demi).
  Terminé quand : les tests Vitest couvrent création, persistance et déductions, et passent.

- [ ] **3. Maquettes** — Écrans liste et fiche, publiés pour validation.
  Terminé quand : Paul a validé les maquettes.

- [ ] **4. Liste et fiche personne** — Créer, modifier, supprimer (avec confirmation) ; filtre de la liste par nom.
  Terminé quand : sur le téléphone, une personne créée persiste après fermeture de l'appli.

- [ ] **5. Couples** — Ajouter un conjoint (existant ou nouveau), indicateur marié, unions multiples.
  Terminé quand : la fiche affiche ses conjoints et un toucher ouvre la fiche du conjoint.

- [ ] **6. Parents et enfants** — Ajouter parent ou enfant, lien biologique ou adoptif.
  Terminé quand : une famille recomposée de test s'affiche correctement dans les deux sens.

- [ ] **7. Frères et sœurs** — Section déduite sur la fiche : frères et sœurs, demi-frères et demi-sœurs.
  Terminé quand : le cas de test de l'étape 6 affiche correctement frères et sœurs et demis.

- [ ] **8. Sauvegarde** — Export et import JSON, confirmation avant écrasement.
  Terminé quand : un export réimporté sur une appli vide restitue toute la famille.

## Plus tard
- Vue arbre graphique
- Photos
- Partage avec des proches
- Import et export GEDCOM
- Recherche avancée
