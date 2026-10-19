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
- Stockage persistant demandé au navigateur au lancement, sans message.
- Politique de sécurité du contenu (CSP) : tout vient de l'appli elle-même (ajoutée au build).
- Une modification qui échoue (stockage plein) affiche un message en français ; rien n'est modifié.

## Fiche personne
- Prénom, nom.
- Sexe : homme (par défaut à la création) ou femme, sert uniquement aux accords (« né » / « née »). Les fiches créées avant l'ajout du champ n'en ont pas : elles s'affichent « né(e) » et rien n'est présélectionné en modification.
- Date de naissance (facultative), éventuellement partielle : année seule, mois et année, ou date complète.
- Note libre.
- Sections affichées, dans cet ordre : conjoint, enfants, frères et sœurs (puis demi-frères et demi-sœurs), parents.
- Une section vide n'est pas affichée. Un bouton « Ajouter un proche » en bas de fiche permet de créer un lien dans une catégorie absente.
- Chaque proche affiché est touchable et ouvre sa fiche.
- Étiquettes sur les proches, accordées selon le proche affiché : « Marié / Mariée » (conjoint), « Adoptif / Adoptive » (parent ou enfant) ; « Marié(e) » et « Adoptif(ve) » si son sexe n'est pas renseigné. Le lien biologique n'est pas étiqueté.

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
- Enfants d'un couple : déduits des parents communs, jamais ressaisis. Pas encore affichés en tant que tels (prévu en V2, session S2b).

## Frères et sœurs (déduits)
- Frères et sœurs : mêmes parents.
- Demi-frères et demi-sœurs : un seul parent en commun.
- Affichés séparément sur la fiche.

## Écran d'accueil
- Liste de toutes les personnes, regroupée par lettre. Tri par prénom (défaut) ou par nom, au choix dans les Réglages ; il s'applique aussi aux listes de choix d'une personne (ajout de conjoint, de parent, d'enfant). En tri par nom, les noms s'écrivent « Nom Prénom ».
- Un écrou en haut à droite ouvre les Réglages.
- Champ de filtre par nom (prénom ou nom).
- Bouton « + » pour créer une personne.
- Liste vide : ni filtre ni « + », mais deux boutons : « Ajouter la première personne » et « Restaurer une sauvegarde » (import direct, sans confirmation puisqu'il n'y a rien à écraser, annulable par le bandeau).

## Suppression
- Confirmation obligatoire.
- Supprimer une personne retire aussi ses unions et filiations.
- Un échec s'affiche sous le bouton, dans l'écran.

## Réglages (écran ouvert par l'écrou)
- Affichage : tri de la liste (prénom ou nom), thème (auto, clair, sombre). Mémorisés sur l'appareil, hors des données exportées.
- Sauvegarde : export de toutes les données dans un fichier JSON `tribu-AAAA-MM-JJ.json`, par la feuille de partage du téléphone, sinon par téléchargement. Message selon l'issue : « Fichier partagé. », « Partage annulé : rien n’a été exporté. », « Téléchargement lancé : vérifiez le dossier Téléchargements. » ou « Export impossible sur cet appareil. »
- Date du dernier export affichée sous le bouton (« Jamais », ou « jj/mm/aaaa · il y a N jours ») ; mémorisée avec les réglages, mise à jour sauf si le partage est annulé.
- Import d'un fichier JSON, validé avant toute écriture, avec confirmation avant d'écraser des données existantes.
- Données : effacement de toutes les données, avec confirmation ; bouton grisé quand il n'y a personne.
- Import et effacement sont annulables quelques secondes : un bandeau « Annuler » en bas d'écran rétablit l'état d'avant (copie en mémoire seulement).
- Version de l'appli et date du build.

## Données illisibles
- Si les données stockées ne se lisent plus, l'appli ne les écrase jamais : elle en garde une copie sous une clé de secours et n'affiche qu'un écran « Données illisibles ».
- Cet écran propose d'exporter le contenu brut (`tribu-secours-AAAA-MM-JJ.txt`) et de « Repartir à vide… », sur confirmation ; la copie de secours reste sur le téléphone.
- Aucune modification n'est enregistrée tant que Paul n'a pas choisi.

## Hors V1 (plus tard)
- Vue arbre graphique.
- Photos.
- Partage avec des proches.
- Import et export GEDCOM.
- Recherche avancée.
