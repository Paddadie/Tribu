# Tribu — Spécification fonctionnelle

## Besoin
Noter et consulter les liens familiaux de mes proches, sur téléphone.
Aucune appli existante ne convient. Usage ponctuel, au gré des événements.

## Utilisateurs
V1 : moi seul. Partage avec des proches : plus tard.

## Plateforme et données
- PWA installée sur téléphone, utilisable hors ligne.
- Données uniquement sur l'appareil, aucune base distante ni compte.
- Mise à jour automatique de l'appli à l'ouverture.

## Fiche personne
- Prénom, nom.
- Date de naissance (facultative).
- Note libre.
- Sections affichées : conjoints, parents, enfants, frères et sœurs.
- Chaque proche affiché est touchable et ouvre sa fiche.

## Couples (unions)
- Une union relie deux personnes ayant chacune leur fiche.
- Indicateur « marié » oui/non.
- Une personne peut avoir plusieurs unions (remariage, séparation).
- Ajouter un conjoint : choisir une personne existante ou en créer une.

## Parents et enfants
- Lien parent → enfant, de type biologique ou adoptif.
- Un enfant peut avoir jusqu'à deux parents par type.
- Ajouter un parent ou un enfant : personne existante ou nouvelle.
- Enfants triés par date de naissance (sans date : en fin de liste).
- Enfants d'un couple : déduits des parents communs, jamais ressaisis.

## Frères et sœurs (déduits)
- Frères et sœurs : mêmes parents.
- Demi-frères et demi-sœurs : un seul parent en commun.
- Affichés séparément sur la fiche.

## Écran d'accueil
- Liste alphabétique de toutes les personnes.
- Champ de filtre par nom (prénom ou nom).
- Bouton « + » pour créer une personne.

## Suppression
- Confirmation obligatoire.
- Supprimer une personne retire aussi ses unions et filiations.

## Sauvegarde
- Export de toutes les données dans un fichier JSON.
- Import d'un fichier JSON, avec confirmation avant d'écraser.

## Hors V1 (plus tard)
- Vue arbre graphique.
- Photos.
- Partage avec des proches.
- Import et export GEDCOM.
- Recherche avancée.
