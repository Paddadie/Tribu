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
- Sexe : homme (par défaut) ou femme, sert uniquement aux accords (« né » / « née »). Les fiches créées avant l'ajout du champ n'en ont pas et s'affichent « né(e) » jusqu'à leur modification.
- Date de naissance (facultative), éventuellement partielle : année seule, mois et année, ou date complète.
- Note libre.
- Sections affichées, dans cet ordre : conjoint, enfants, frères et sœurs (puis demi-frères et demi-sœurs), parents.
- Une section vide n'est pas affichée. Un bouton « Ajouter un proche » en bas de fiche permet de créer un lien dans une catégorie absente.
- Chaque proche affiché est touchable et ouvre sa fiche.
- Étiquettes sur les proches : « Marié » (conjoint), « Adoptif » (parent ou enfant) ; le lien biologique n'est pas étiqueté.

## Couples (unions)
- Une union relie deux personnes ayant chacune leur fiche.
- Indicateur « marié » oui/non.
- Une personne n'a qu'un seul conjoint à la fois. Une séparation efface l'union (les deux fiches restent) ; on peut ensuite en ajouter une autre.
- Ajouter un conjoint : choisir une personne existante (hors personnes déjà en couple) ou en créer une.
- Modifier l'indicateur « marié » ou mettre fin à l'union (avec confirmation) : depuis le crayon à côté du conjoint sur la fiche.

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
- Liste de toutes les personnes, regroupée par lettre. Tri par prénom (défaut) ou par nom, au choix dans les Réglages ; il s'applique aussi aux listes de choix d'une personne (ajout de conjoint, de parent, d'enfant). En tri par nom, les noms s'écrivent « Nom Prénom ».
- Un écrou en haut à droite ouvre les Réglages.
- Champ de filtre par nom (prénom ou nom).
- Bouton « + » pour créer une personne.

## Suppression
- Confirmation obligatoire.
- Supprimer une personne retire aussi ses unions et filiations.

## Réglages (écran ouvert par l'écrou)
- Affichage : tri de la liste (prénom ou nom), thème (auto, clair, sombre). Mémorisés sur l'appareil, hors des données exportées.
- Sauvegarde : export de toutes les données dans un fichier JSON `tribu-AAAA-MM-JJ.json` ; import d'un fichier JSON, validé avant toute écriture, avec confirmation avant d'écraser des données existantes.
- Données : effacement de toutes les données, avec confirmation.
- Version de l'appli et date du build.

## Hors V1 (plus tard)
- Vue arbre graphique.
- Photos.
- Partage avec des proches.
- Import et export GEDCOM.
- Recherche avancée.
