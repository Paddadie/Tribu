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
- Date de décès (facultative), partielle comme la naissance, sous la naissance dans le formulaire ; elle ne peut pas précéder la naissance. La fiche affiche « Décédé(e) le … » et l'âge : « 34 ans » pour un vivant, « Mort(e) à 82 ans » pour un décédé. Si les dates sont trop partielles pour trancher, l'âge le plus probable est précédé de « environ ».
- Dans les listes, un décédé s'affiche « 1941 – 2024 » (« décédé(e) en 2024 » sans naissance) ; un vivant, sa naissance et son âge.
- Note libre.
- Ordre de la fiche : identité, note, puis les proches (conjoint, enfants, frères et sœurs, demi-frères et demi-sœurs, parents), le bouton « Ajouter un proche » (style secondaire), et enfin la suppression.
- Une section vide n'est pas affichée. « Ajouter un proche » ouvre une feuille : un conjoint (grisé s'il y en a déjà un), un parent, un enfant, un frère ou une sœur (grisé avec « Ajoutez d'abord un parent » tant qu'aucun parent n'est connu).
- Sous le conjoint, le nombre d'enfants du couple : « 1 enfant ensemble », « 3 enfants ensemble ».
- Chaque proche affiché est touchable et ouvre sa fiche.
- Étiquettes sur les proches, accordées selon le proche affiché : « Marié / Mariée » (conjoint), « Adoptif / Adoptive » (parent ou enfant) ; « Marié(e) » et « Adoptif(ve) » si son sexe n'est pas renseigné. Le lien biologique n'est pas étiqueté.

## Couples (unions)
- Une union relie deux personnes ayant chacune leur fiche.
- Indicateur « marié » oui/non.
- Une personne n'a qu'un seul conjoint actuel à la fois. Une union a un statut : actuelle ou séparée.
- « Se sont séparés » passe l'union au statut séparé ; la fiche affiche l'ex-conjoint dans une section « Ex-conjoint » sous le conjoint actuel. « Rétablir le couple » la remet en actuelle (refusé si l'un des deux a déjà un autre conjoint). Un ex n'est jamais de la famille par alliance.
- « Supprimer l'union » l'efface pour de bon (une erreur de saisie). Séparation, rétablissement et suppression sont sans confirmation, annulables par le bandeau.
- Deux personnes n'ont qu'une union entre elles : pour un retour ensemble, on rétablit l'ancienne.
- Ajouter un conjoint : choisir une personne existante (hors personnes déjà en couple) ou en créer une.
- Modifier « marié », séparer, rétablir ou supprimer : depuis le crayon à côté du conjoint ou de l'ex-conjoint sur la fiche (`#/union/<union>/<personne>`).

## Parents et enfants
- Lien parent → enfant, de type biologique ou adoptif.
- Un enfant peut avoir jusqu'à deux parents par type.
- Ajouter un parent ou un enfant : personne existante ou nouvelle.
- Ajouter un enfant depuis une personne en couple : case « Ajouter aussi <conjoint> comme parent », cochée d'office ; l'enfant (créé ou existant) est alors relié aux deux, avec le même type de lien.
- Retirer un lien (crayon à côté du proche) : sans confirmation, annulable par le bandeau. Les deux fiches restent.
- Enfants triés par date de naissance (sans date : en fin de liste).
- Enfants d'un couple : déduits des parents communs, jamais ressaisis ; leur nombre s'affiche sous le conjoint.

## Frères et sœurs (déduits)
- Frères et sœurs : mêmes parents.
- Demi-frères et demi-sœurs : un seul parent en commun.
- Affichés séparément sur la fiche.
- Ajouter un frère ou une sœur : la personne devient enfant des parents connus de la fiche, tous cochés d'office ; en décocher un donne un demi-frère ou une demi-sœur. Un seul type de lien pour tous les parents cochés. Aucun lien de fratrie n'est stocké.

## Famille élargie et lien avec « Moi » (déduits)
- Rien n'est stocké : tout se recalcule depuis les unions et filiations. Biologique et adoptif comptent pareil.
- Sections de la fiche, après Parents, vides masquées : grands-parents, petits-enfants, oncles et tantes, neveux et nièces, cousins et cousines, belle-famille (parents du conjoint, puis enfants du conjoint qui ne sont pas les siens). Chacune du plus âgé au plus jeune.
- Les oncles, tantes, neveux et nièces par alliance (conjoint d'un oncle, oncle du conjoint…) sont dans leur section avec l'étiquette « Par alliance ». L'alliance passe seulement par le conjoint actuel, sur un pas.
- Sous le nom, une pastille donne le lien de la personne avec « Moi » : « Ta cousine », « Ton oncle par alliance », « C'est toi ». Accord selon le sexe ; sexe non précisé : forme neutre (« Ton beau-parent ») ou les deux formes (« Ton oncle ou ta tante »). Un lien sans nom usuel (cousin d'un parent, cousin issu de germain) n'affiche rien.
- Sur la fiche des autres, la ligne de « Moi » porte l'étiquette « Toi ».
- « Moi » se choisit dans les Réglages (section MOI, feuille avec recherche, « Ne plus choisir de fiche »). Si la fiche n'existe plus, c'est comme si rien n'était choisi, sans message.

## Écrans d'ajout (conjoint, parent, enfant, frère ou sœur)
- Deux onglets : « Nouvelle personne » (ouvert d'abord, curseur dans le prénom) et « Personne existante ».
- Nom prérempli, toujours modifiable. Enfant d'un couple homme-femme : nom du père, avec un bouton pour prendre celui de la mère ; sinon nom de la fiche ouverte, avec un bouton pour celui de l'autre parent coché. Parent, frère ou sœur : nom de la fiche ouverte.
- Liste des personnes existantes : suggestions en tête avec leur raison (le conjoint d'un parent déjà saisi, les enfants du conjoint, l'autre parent de ses enfants), puis les autres, puis les personnes indisponibles grisées avec la raison (« Déjà en couple », « Déjà enfant »…).
- Homonymes : créer une personne de même prénom et même nom qu'une fiche existante (casse, accents et espaces ignorés) demande confirmation. Vaut pour toute création, pas pour une modification.
- Retour ou Annuler avec une saisie en cours (ici et dans le formulaire de fiche) demande « Abandonner la saisie ? ». Le geste ou le bouton Retour du téléphone n'est pas intercepté.

## Écran d'accueil
- Liste de toutes les personnes, regroupée par lettre. Tri par prénom (défaut) ou par nom, au choix dans les Réglages ; il s'applique aussi aux listes de choix d'une personne (ajout de conjoint, de parent, d'enfant). En tri par nom, les noms s'écrivent « Nom Prénom ».
- Un écrou en haut à droite ouvre les Réglages.
- Champ de filtre par nom (prénom ou nom).
- En haut, « Prochains anniversaires » : les 3 prochains dans les 30 jours (aujourd'hui compris), avec « Aujourd'hui », « Demain » ou « Dans N jours » et l'âge atteint. Il faut une naissance complète ; pas pour les décédés ni pour un âge de 0 an. Un 29 février tombe le 28 les années non bissextiles. Bloc absent s'il n'y en a pas, masqué pendant un filtrage.
- Index alphabétique sur le bord droit : les 26 lettres, les absentes estompées. Toucher ou glisser fait défiler jusqu'à la lettre (sinon la suivante présente), affichée en grand pendant le geste. Masqué pendant un filtrage.
- Bouton « + » pour créer une personne.
- Liste vide : ni filtre ni « + », mais deux boutons : « Ajouter la première personne » et « Restaurer une sauvegarde » (import direct, sans confirmation puisqu'il n'y a rien à écraser, annulable par le bandeau).

## Identité visuelle
- Vert calmé (#2F6F5E, aussi `theme_color`), Figtree seule, thèmes clair et sombre. Le vert ne marque que ce qui se touche (retour, boutons, +, choix, focus) ; les titres de section sont en gris chaud, capitales posées en CSS ; pastilles (« Ta cousine », « Marié(e) », « Adoptif(ve) ») neutres.
- Cinq tailles de texte : 12, 14, 16, 20, 28 px (jetons `--t1` à `--t5`). Nom de la fiche en 28 px sous un avatar de 88 px.
- Avatar : initiales sur une teinte tirée du nom de famille (stable, insensible à la casse et aux accents) ; vert par défaut si le nom est vide.
- Un seul bouton plein par écran (fiche : « Ajouter un proche » ; accueil : le +) ; « Supprimer » est un texte rouge. Appui (léger rétrécissement ou voile vert) et anneau de focus identiques partout.
- Animations, toutes coupées si le téléphone demande moins de mouvement : glissement latéral entre écrans (240 ms, sens inverse au retour), montée de la feuille et voile en fondu, léger zoom des confirmations, bandeau « Annuler » qui monte, ligne ajoutée ou modifiée qui s'éclaire au retour sur la fiche, coche des choix qui rebondit.
- Icône : trois anneaux entrelacés, blanc cassé sur vert.

## Navigation
- Retour (et Annuler) revient à l'écran précédent de l'appli ; si l'appli a été ouverte directement sur cet écran, il ouvre la liste (ou la fiche) à sa place. Il n'ajoute jamais d'entrée à l'historique du téléphone.
- Un enregistrement (modification, ajout de conjoint, de parent ou d'enfant, union, lien) revient sur la fiche comme Retour. Une création remplace le formulaire par la nouvelle fiche ; une suppression remplace la fiche par la liste.
- La liste retrouve sa position de défilement au retour ; les autres écrans s'ouvrent en haut.

## Suppression
- Confirmation obligatoire.
- Supprimer une personne retire aussi ses unions et filiations.
- Un échec s'affiche sous le bouton, dans l'écran.

## Réglages (écran ouvert par l'écrou)
- Moi : ma fiche, qui sert au lien affiché sur chaque fiche. Mémorisée sur l'appareil, hors des données exportées.
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

## Format des données (version 2)
- `Personne.deces` facultatif ; `Union.statut` « actuelle » ou « separee » ; une seule union actuelle par personne.
- Un export v1 s'importe : `migrer()` le convertit avant la validation (unions v1 → actuelles ; si une personne en avait deux, la seconde devient séparée). Rien n'est perdu.

## Hors V1 (plus tard)
- Vue arbre graphique.
- Photos.
- Partage avec des proches.
- Import et export GEDCOM.
- Recherche avancée.
