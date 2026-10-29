# Tribu — Spécification fonctionnelle

## Besoin
Noter et consulter les liens familiaux de mes proches, sur téléphone.
Aucune appli existante ne convient. Usage ponctuel, au gré des événements.

## Utilisateurs
V1 : moi seul. Partage avec des proches : plus tard.

## Plateforme et données
- PWA installée sur téléphone, utilisable hors ligne.
- Données uniquement sur l'appareil, aucune base distante ni compte.
- Mise à jour proposée : quand une nouvelle version est téléchargée, un bandeau « Nouvelle version prête » reste affiché jusqu'à « Mettre à jour », qui recharge l'appli (un bandeau temporaire le recouvre, puis il revient).
- Stockage persistant demandé au navigateur au lancement, sans message.
- Politique de sécurité du contenu (CSP) : tout vient de l'appli elle-même (ajoutée au build).
- Une modification qui échoue (stockage plein) affiche un message en français ; rien n'est modifié.

## Fiche personne
- Prénom, nom.
- Sexe : homme (par défaut à la création) ou femme, sert uniquement aux accords (« né » / « née »). Les fiches créées avant l'ajout du champ n'en ont pas : elles s'affichent « né(e) » et rien n'est présélectionné en modification.
- Date de naissance (facultative), éventuellement partielle : année seule, mois et année, date complète, ou jour et mois sans année (anniversaire connu sans la naissance). Sans année : « Née le 24 octobre », pas d'âge, rien sous le nom dans les arbres, rangée avec les sans date dans les tris.
- Décès : sous la naissance, une ligne « Décédé » (« Décédée », « Décédé(e) » selon le sexe coché) avec un petit interrupteur, éteint par défaut. Allumé, il fait apparaître la date de décès, facultative, aux mêmes formes que la naissance (année, mois et année, jour et mois, complète) ; éteint, la date est effacée à l'enregistrement. Une date avec année ne peut pas précéder la naissance. La fiche affiche « Décédé(e) le … », ou « Décédé(e) » seul sans date, et l'âge : « 34 ans » pour un vivant, « Mort(e) à 82 ans » pour un décédé (rien si l'année de décès est inconnue). Si les dates sont trop partielles pour trancher, l'âge le plus probable est précédé de « environ ».
- Nom de naissance (`nomNaissance`) : facultatif, pour tous (« Nom de jeune fille » pour une femme, « Nom de naissance » sinon), jamais égal au nom d'usage ; affiché « née X » / « né X » sous le nom sur la fiche, champ visible pour tous dans Modifier. Le nom après le mariage se choisit à l'écran (voir « Union : date et nom ») ; il n'est pas enregistré, il se déduit des noms (`nomApresActuel`). Après une séparation ou un démariage, l'écran Union propose à qui porte encore le nom de l'autre (ou un nom composé) de reprendre son nom de naissance (`quiPeutReprendreSonNom`, `reprendreNomDeNaissance`), sans l'imposer.
- Lieux (facultatifs, texte libre, lieux déjà saisis proposés) : « Lieu de naissance » sous la date de naissance, « Lieu de décès » dans le bloc décès, « Lieu du mariage » sur les écrans de couple quand « Marié(e) » est allumé (retiré si le mariage l'est). La fiche les ajoute aux libellés : « Née le 8 février 1950 à Quimper », « Union le 12 juin 2010 à Brest ».
- Dans Modifier, deux interrupteurs sous le décès : « Rappels (anniversaire, fête…) » (éteint = `sansRappel` : aucune de ses dates n'est rappelée) et « Signaler dans « À compléter » » (éteint = `ignorerIncomplet` : la personne sort de ce filtre).
- Dans les listes, un décédé s'affiche « 1941 – 2024 », « 1941 – ? » sans année de décès, « décédé(e) en 2024 » sans naissance, « décédé(e) » sans aucune des deux ; un vivant, sa naissance et son âge. Un décédé, avec ou sans date, est grisé dans les arbres et n'a plus d'anniversaire.
- Note libre.
- Ordre de la fiche : identité, le bouton « Ajouter un proche », la note, les dessins « Lien avec toi » et « Famille proche », puis les proches (conjoint et ex, enfants, frères et sœurs, demi-frères et demi-sœurs, parents), la famille élargie, les amis, et enfin la suppression.
- Une section vide n'est pas affichée. « Ajouter un proche » ouvre une feuille : un conjoint (grisé s'il y en a déjà un), un parent, un enfant, un frère ou une sœur (toujours possible ; sous-titre « Parents inconnus » quand aucun parent n'est connu), un ami.
- Sous le conjoint, le nombre d'enfants du couple : « 1 enfant ensemble », « 3 enfants ensemble ».
- Chaque proche affiché est touchable et ouvre sa fiche.
- Étiquettes sur les proches, accordées selon le proche affiché : « Marié / Mariée » (conjoint), « Adoptif / Adoptive » (parent ou enfant) ; « Marié(e) » et « Adoptif(ve) » si son sexe n'est pas renseigné. Le lien biologique n'est pas étiqueté.

## Couples (unions)
- Une union relie deux personnes ayant chacune leur fiche.
- Indicateur « marié » oui/non.
- Une personne n'a qu'un seul conjoint actuel vivant à la fois. Une union a un statut : actuelle ou séparée. Veuvage : l'union avec le défunt reste actuelle (trait plein) et n'empêche pas une nouvelle union ; une fois remariée, la personne a son nouveau conjoint sous « Conjoint » et le défunt sous « Conjoint décédé », et seule la nouvelle union est fêtée. Retirer le décès du défunt est alors refusé.
- « Se sont séparés » passe l'union au statut séparé ; la fiche affiche l'ex-conjoint dans une section « Ex-conjoint » sous le conjoint actuel. « Rétablir le couple » la remet en actuelle (refusé si l'un des deux a déjà un autre conjoint). Un ex n'est jamais de la famille par alliance.
- « Supprimer l'union » l'efface pour de bon (une erreur de saisie). Séparation, rétablissement et suppression sont sans confirmation, annulables par le bandeau.
- Deux personnes n'ont qu'une union entre elles : pour un retour ensemble, on rétablit l'ancienne.
- Ajouter un ex (feuille « Un ex ») : union déjà terminée, possible même si l'un des deux est en couple ; les ex ne sont pas limités. Les arbres la dessinent en pointillés, sans le mot « ex ».
- Arbre global : couple marié = trait plein, en couple = pointillé court, couleur de la lignée du membre le plus proche de Moi ; séparé (ou parents sans union) = même trait en gris ; toujours un trait droit entre deux personnes de la même ligne.
- Ajouter un conjoint : choisir une personne existante (hors personnes déjà en couple) ou en créer une.
- Modifier « marié », séparer, rétablir ou supprimer : depuis le crayon à côté du conjoint ou de l'ex-conjoint sur la fiche (`#/union/<union>/<personne>`).

## Parents et enfants
- Lien parent → enfant, de type biologique ou adoptif.
- Un enfant peut avoir jusqu'à deux parents par type.
- Ajouter un parent ou un enfant : personne existante ou nouvelle.
- Choix multiple : pour un ami, un enfant ou un frère ou une sœur, « Déjà dans Tribu » permet de cocher plusieurs lignes (un toucher coche, un second décoche) ; le bouton devient « Ajouter 3 amis » / « Ajouter 3 enfants » / « Ajouter 3 à la fratrie ». Un seul enregistrement : si un lien est refusé, aucun n'est ajouté. Pas pour un parent ni un conjoint. Une ligne cochée porte une seule coche, dessinée par le CSS.
- Présomption de fratrie (`fratriePresumee`) : donner un second parent à un enfant qui n'a qu'un parent connu le donne aussi, même type de lien, aux autres enfants de ce parent qui n'ont que lui ; les demi-frères (déjà deux parents) et les liens d'un autre type ne suivent pas. L'écran « Ajouter un parent » les montre sous « Aussi parent de », cochés d'office, décochables pour un demi-frère ou une demi-sœur ; la liste suit le type de lien.
- Ajouter un parent à un enfant qui n'en a qu'un : bloc « Union avec X » (En couple, Mariés, Séparés) ; « Séparés » d'office si l'un des deux est déjà en couple, sinon « En couple ». Choisir « En couple » ou « Mariés » quand l'un est en couple avec un vivant n'est pas bloqué : un avertissement nomme l'union qui passera en « séparés » (`unirParents`). Rien n'est demandé si les deux ont déjà une union. « Mariés » applique le nom par défaut (celui de l'homme pour les deux).
- Ajouter un enfant : « Autre parent » propose le conjoint, les conjoints défunts, les ex et les autres parents de ses enfants (`autresParents`), le premier coché d'office, et « Autre parent ou inconnu ». L'enfant (créé ou existant) est relié aux parents choisis, avec le même type de lien.
- Ajouter un frère ou une sœur : cases « Enfant de » (chaque parent connu, cochés) ; un seul coché = demi-frère ou demi-sœur. Nom proposé : nom de naissance de la fiche, puis ceux des parents cochés.
- Retirer un lien (crayon à côté du proche) : sans confirmation, annulable par le bandeau. Les deux fiches restent.
- Enfants triés par date de naissance (sans date : en fin de liste).
- Enfants d'un couple : déduits des parents communs, jamais ressaisis ; leur nombre s'affiche sous le conjoint.

## Frères et sœurs (déduits)
- Frères et sœurs : mêmes parents, ou un même couple de parents de chaque côté (les deux biologiques, ou les deux adoptifs : un enfant adopté par mes parents reste mon frère même avec ses parents biologiques enregistrés).
- Demi-frères et demi-sœurs : au moins un parent en commun, sans être frères et sœurs.
- Affichés séparément sur la fiche.
- Ajouter un frère ou une sœur : la personne devient enfant des parents connus de la fiche, tous cochés d'office ; en décocher un donne un demi-frère ou une demi-sœur. Un seul type de lien pour tous les parents cochés. Aucun lien de fratrie n'est stocké.
- Sans parent connu : pas de case de parent ni de type de lien ; les deux personnes sont reliées à un **parent inconnu**, personne sans nom créée en coulisse (`inconnu: true`). Une troisième personne rejoint le même parent inconnu ; deux fratries inconnues se fondent en une. Si l'autre personne a des parents connus, la fiche devient leur enfant.
- Le parent inconnu n'apparaît jamais : ni dans la liste, la recherche, les compteurs, Réglages → Moi, les anniversaires, la section « Parents », ni dans les arbres (seul le trait commun des frères et sœurs est tracé). Dans « Lien avec toi », le chemin passe directement de la personne à son frère ou sa sœur.
- Ajouter un vrai parent à l'un d'eux le remplace pour toute la fratrie (le parent inconnu disparaît, ils restent frères et sœurs). Un parent inconnu qui ne relie plus qu'une personne est supprimé. Pas de demi-frère entre personnes aux parents inconnus : il faut d'abord un parent connu.

## Famille élargie et lien avec « Moi » (déduits)
- Rien n'est stocké : tout se recalcule depuis les unions et filiations. Biologique et adoptif comptent pareil.
- Sections de la fiche, après Parents, vides masquées : grands-parents, petits-enfants, oncles et tantes, neveux et nièces, cousins et cousines, belle-famille (parents du conjoint, puis enfants du conjoint qui ne sont pas les siens). Chacune du plus âgé au plus jeune.
- Les oncles, tantes, neveux et nièces par alliance (conjoint d'un oncle, oncle du conjoint…) sont dans leur section avec l'étiquette « Par alliance ». L'alliance passe seulement par le conjoint actuel, sur un pas.
- Sous le nom, une pastille donne le lien de la personne avec « Moi », sans possessif : « Cousine », « Oncle par alliance », « Épouse », « Toi ». Accord selon le sexe ; sexe non précisé : forme neutre (« Beau-parent ») ou les deux formes (« Oncle ou tante »). Plusieurs générations : arrière-grand-oncle, arrière-petit-neveu (« arrière- » répété) ; cousin issu de germain (enfants de cousins germains). « Adoptif » seulement au premier degré, « demi » seulement pour la fratrie. Un veuf remarié reste l'époux du défunt. Un lien sans nom usuel (cousin d'un parent, enfant d'un cousin) n'affiche rien.
- Ex (hors parenté, seulement quand il n'y a aucun lien de famille) : « Ex » (ton ex), « Ex-belle-mère » (parent de ton ex), « Ex de Karim » (ex du proche le plus proche). Hors famille, voir « Amis ».
- Sur la fiche des autres, la ligne de « Moi » porte l'étiquette « Toi ».
- « Moi » se choisit dans les Réglages (section MOI, feuille avec recherche, « Ne plus choisir de fiche »). Si la fiche n'existe plus, c'est comme si rien n'était choisi, sans message.

## Amis
- Les amis sont toujours rangés dans un **groupe d'amis** : tous les membres d'un groupe sont amis entre eux, de la famille ou non ; aucune parenté créée, aucune section de famille. Un groupe a au moins deux membres et un nom facultatif (sans nom : « Groupe de Karim, Thomas… »). « Moi » est un membre comme un autre. Une personne ne peut être que dans un groupe (règle appliquée par les écrans, pas par le modèle : plusieurs groupes viendront plus tard).
- Ajouter un ami : « Ajouter un proche » → « Un ami » (`#/ami/<personne>`).
  - Personne déjà dans un groupe : les amis ajoutés (existants ou nouveaux, choix multiple) rejoignent ce groupe.
  - Sinon : en haut « Rejoindre un groupe » (une carte par groupe), en dessous « Ou former un nouveau groupe » : nom facultatif, personne existante ou nouvelle ; plusieurs personnes cochées forment un seul groupe avec la fiche. Si la fiche est hors de la famille de « Moi » (et que « Moi » n'a pas de groupe), « Moi » est ajouté au groupe créé, annoncé sous le nom, pour qu'il apparaisse dans l'arbre.
  - Les personnes déjà dans un groupe sont grisées (« Déjà dans « Fac » »).
  - La famille d'un membre compte dans son groupe : toute personne dont un proche (filiation ou union, de proche en proche) est membre d'un autre groupe est aussi grisée (« Famille d'un membre de « Fac » »). Plusieurs membres d'une même famille peuvent être dans le même groupe.
- Section « Amis » en fin de fiche : un bloc par groupe (nom qui ouvre sa gestion, croix pour le quitter, annulable par le bandeau ; un groupe réduit à une personne est supprimé), puis les autres membres.
- Réglages → « Groupes d'amis » (`#/groupes`) : liste, « Nouveau groupe » (`#/groupe/nouveau` : nom facultatif, deux personnes au moins), détail d'un groupe (`#/groupe/<id>` : renommer, croix par membre annulable, « Ajouter un membre » `#/groupe/<id>/ajouter`, « Supprimer le groupe » avec confirmation, annulable ; les fiches restent).
- Pastille d'une personne hors de la famille de « Moi », nommée depuis l'ami le plus proche du chemin : « Ami », « Amie d'Inès » (amie d'un proche), « Copine de Karim » (ou « Compagne de Karim » à partir de 40 ans), « Fils de Karim » (un pas après l'ami), « Sœur de Karim », « Neveu de Karim » (lien de famille le plus court avec l'ami, quand il a un nom usuel), « Proche de Karim » (sinon). La famille l'emporte toujours ; le chemin ne passe que par les parents, enfants, conjoints actuels et amis (jamais un ex).

## Dessins de la fiche
- « Lien avec toi » : le chemin le plus court de « Moi » à la personne, l'ancêtre commun en haut ; coude pour parent et enfant, trait double pour un couple, simple pour une amitié. Sous le dessin, la phrase en relations composées : le moins de liens nommés possible (« Toi → ton père → son cousin » ; à égalité, le premier lien le plus proche de toi) ; la compagne non mariée d'un proche se dit par ce proche (« … → son cousin → sa compagne »). Si elle diffère du chemin étape par étape, un bouton « Détail » le montre (« Toi → ton père → son père → son frère → son fils »). Masqué quand le lien est direct (une seule étape) ou sans « Moi ». Par la famille d'abord ; sinon par une amitié. Après le dernier ami, la phrase donne le lien le plus court avec lui (« Toi → ton ami → son neveu ») et le dessin passe directement de frère à sœur sans leur parent commun ; le chemin de famille, lui, reste inchangé.
- « Famille proche » (s'il y a quelqu'un d'autre que la personne à dessiner), en rangées repliées (`modele/familleProche.ts`) :
  - Qui : ses parents (au-delà de deux, le couple biologique puis le couple adoptif), ses frères et sœurs, ses demi-frères et demi-sœurs avec leur autre parent, son conjoint, ses enfants et leur autre parent. Pas le nouveau conjoint d'un parent sans enfant avec lui (il est sur la fiche du parent), ni les enfants qu'un ex d'un parent a eus avec quelqu'un d'autre.
  - Rangée des parents : chaque parent avec ses autres partenaires à l'extérieur, les demis sous leur couple. Rangée de la personne : le conjoint (sinon le co-parent le plus récent) à sa gauche, les autres co-parents (ex, parent « ? ») à sa droite, la fratrie à côté par âge. Enfants sous leur couple.
  - Trait plein : union actuelle, même avec un défunt. Pointillé : union terminée, ou couple sans union enregistrée (trait droit). Lien adoptif en pointillé. Un trait qui en croise d'autres a un halo.
  - Une fratrie ou des enfants trop nombreux passent sur une ligne de plus sous le même couple, la ligne de la personne en dernier avec les plus jeunes ; au-dessus, les aînés en lignes égalisées, pour lire l'âge de haut en bas. Le cadre ne défile de côté que si une rangée insécable ne tient pas (les parents avec leurs autres partenaires, ou la personne avec les siens) : il s'ouvre centré sur la personne, avec « Glisse pour voir toute la famille ».
  - Nom sur deux lignes au plus, puis « … » ; nom complet au survol et à l'appui long (sans ouvrir la fiche). Années sous chaque nom, décédés pâles, légende seulement si besoin.
- Un proche qu'on vient d'ajouter apparaît en fondu, avec une légère mise à l'échelle, dans « Famille proche » (sans animation si le téléphone réduit les animations).
- Case « + Parent » s'il manque un parent, seulement pour la famille de « Moi » (ou si « Moi » n'est pas choisi) ; elle ouvre l'ajout d'un parent.
- Trop d'enfants pour la largeur : leur rang défile de côté, l'aîné à gauche au départ, du plus âgé au plus jeune toutes unions confondues, avec un fondu sur le bord.
- Noms dans tous les arbres (fiche, « Lien avec toi », arbre global) : un prénom composé passe à la ligne à l'espace ou au tiret, sur 2 lignes au plus ; un mot plus long que la case élargit seulement la case de cette personne, jusqu'à 104 px ; au-delà, « … ».
- Chaque personne dessinée ouvre sa fiche. Sur tablette, la fiche reste une colonne de 600 px et le foyer garde ses proportions de téléphone, centré.

## Arbre global (#/arbre)
- Ouvert par l'icône d'arbre de l'accueil (à côté de l'écrou, absente si la liste est vide). Plein écran, Retour vers la liste.
- Sans « Moi » choisi : message et bouton vers les Réglages. Sinon, seules les personnes reliées à « Moi » (filiations, toutes unions, ex compris, groupes d'amis, de proche en proche) ; les autres sont masquées.
- Une ligne par génération, « Moi » au centre (pastille « Toi », anneau). Couples côte à côte (trait épais, tirets si séparés), conjoints à l'extérieur de la fratrie, frères et sœurs groupés, l'aîné à gauche ; côté paternel à gauche sans autre indice. Enfants reliés au milieu du couple ou à chaque parent ; lien adoptif en pointillé. Couple non voisin tracé en arc. Décédés : couleur de leur famille en plus pâle avec une croix « † », années sous le nom. Chaque enfant est centré sous ses parents autant que possible : dans une chaîne ex – personne – conjoint, l'écart entre les voisins s'élargit à la largeur des enfants du couple (grands-parents plus éloignés). Deux parents d'un même enfant sans union enregistrée restent côte à côte. Les traits communs de familles voisines sont étagés à des hauteurs différentes, avec plus d'air entre deux familles.
- Amis : les groupes de « Moi » et les membres avec leurs familles dans une bulle « Tes amis » sous la famille, reliée à « Moi » par un pointillé qui passe entre les personnes. Un cadre arrondi coloré par groupe (nom à gauche, « N amis » à droite si la place le permet), sans trait entre ses membres ; les membres portent un anneau de la couleur du cadre. Dans la bulle, un grand vide entre deux familles est ramené à l'écart normal. L'ami d'un autre proche est placé à côté de lui, l'ami d'un ami suit son groupe. Seule une amitié qui sort des cadres (groupe sans « Moi » reliant la famille et la bulle) reste un pointillé couleur accent. Hors bulle, une personne de l'arbre principal (pas « Moi ») qui est dans un groupe d'amis porte un petit anneau à la couleur du groupe, en bas à droite de sa pastille (le « † » reste en haut).
- Couleur : une par nom de famille (nom actuel prime, nom de naissance à défaut, sans casse ni accents ; 12 pastels), pour les pastilles, les traits et le nom « Famille X », côté famille comme côté amis. Pas de fond de couleur par famille. Sans nom : couleur neutre.
- Nom de famille écrit au-dessus de chaque lignée sans parent dans l'arbre (« Famille Dupont », ou « Famille de Paul » sans nom), en petites capitales espacées et discrètes : pas au-dessus d'un conjoint dont l'autre a des parents, ni des enfants. De loin (sous ×0,6), il garde sa taille à l'écran ; s'il en chevauche un autre, celui de la famille la plus nombreuse reste ; dans la bulle, il s'efface (les titres des groupes suffisent).
- Glisser pour se déplacer, pincer ou molette pour zoomer (×0,2 à ×3, ou moins si c'est ce qu'il faut pour voir tout l'arbre), double toucher (double clic) pour zoomer à cet endroit, boutons + et −. Les puces sont dans une barre translucide sur toute la largeur, en bas ; le zoom flotte au-dessus, à droite ; l'astuce de geste (une fois par session) s'affiche au-dessus des puces. « Toi » recentre sur « Moi », « Tout » cadre l’arbre entier au-dessus de la barre ; la puce de la vue choisie est pleine, plus aucune après un déplacement, un zoom ou un autre saut. « Familles » (une entrée par lignée, par ordre alphabétique : nom, couleur, effectif) et « Amis » (un cadre par groupe) ouvrent une liste au-dessus des puces (≤ 50 % de la hauteur), qui en glisse et s'y replie dès qu'on se déplace ; un toucher cadre et centre la zone, et les puces n’apparaissent que s’il y a quelque chose à lister. Lignée sans étiquette « Famille X » : nommée d’après le nom le plus répandu. Après un saut (Toi, Familles, Amis, recherche), la cible pulse : « Moi », la personne la plus haute de la famille, les membres du groupe. Un rond « Revenir » au-dessus du zoom ramène à la vue d'avant chaque saut, l'une après l'autre (absent quand il n'y en a pas) ; pas de mini-carte. Sous ×0,6, il ne reste que des pastilles de couleur sans texte (jamais plus petites que 10 px à l'écran). L'arbre ne peut pas sortir de l'écran.
- Toucher une personne ouvre sa fiche (pas après un glissement). Au retour, le zoom et la position sont retrouvés (pendant la session).
- Loupe : recherche par prénom ou nom parmi les personnes de l'arbre ; le choix centre la personne et la fait pulser.

## Écrans d'ajout (conjoint, parent, enfant, frère ou sœur, ami)
- Après une création, la fiche de la nouvelle personne s'ouvre à la place de l'écran d'ajout (Retour ramène à la fiche de départ) ; après un lien vers une personne existante, retour à la fiche de départ.
- Deux onglets : « Nouvelle personne » (ouvert d'abord, curseur dans le prénom) et « Déjà dans Tribu ».
- Nom prérempli, toujours modifiable. Enfant d'un couple homme-femme : nom du père, avec un bouton pour prendre celui de la mère ; sinon nom de la fiche ouverte, avec un bouton pour celui de l'autre parent coché. Frère ou sœur : nom de naissance de la fiche ouverte ; parent : idem (nom de naissance, sinon son nom).
- Liste des personnes existantes : suggestions en tête avec leur raison (le conjoint d'un parent déjà saisi, les enfants du conjoint, l'autre parent de ses enfants), puis, pour un parent, un enfant ou un frère ou une sœur, les personnes de même nom de famille (« Même nom : Dupont »), hors ascendants et descendants et hors écart d'âge invraisemblable (parent ou enfant à moins de 12 ans d'écart, fratrie à plus de 30 ans), puis les autres, puis les personnes indisponibles grisées avec la raison (« Déjà en couple », « Déjà enfant »…).
- Homonymes : créer une personne de même prénom et même nom qu'une fiche existante (casse, accents et espaces ignorés) demande confirmation. Vaut pour toute création, pas pour une modification.
- Retour ou Annuler avec une saisie en cours (ici et dans le formulaire de fiche) demande « Abandonner la saisie ? ». Le geste ou le bouton Retour du téléphone ramène sur l'écran de saisie, intact, et pose la même question.

## Écran d'accueil (#/)
- « Bonjour <prénom de Moi> » (« Bonsoir » à partir de 18 h ; sans prénom si Moi n'est pas choisi ou est décédé), la date du jour dessous ; l'écrou à droite ouvre les Réglages. L'en-tête n'est pas collant.
- Champ « Chercher quelqu'un » : les résultats remplacent le reste de l'accueil, avec le lien de chacun avec Moi ; une croix vide le champ ; en pied, « N fiches · Créer « … » » ouvre le formulaire prérempli (premier mot = prénom, la suite = nom).
- « Aujourd'hui » (carte verte, absente s'il n'y a rien) : anniversaires et unions du jour sur des lignes blanches avec pastille (âge, « 10 ans »…), un couple avec deux avatars, un conjoint décédé en gris ; puis les fêtes du jour, « Bonne fête X » et « Sainte X · lien ». Au-delà de 4 lignes, « + N autres » ouvre l'agenda.
- « Bientôt » : vignettes des 30 prochains jours, triées : avatar(s), pastille de date (jour de la semaine ou mois, puis quantième), nom, puis icône du genre et années (ou libellé) ; les fêtes seulement à 7 jours ; « Tout voir » ouvre l'agenda. Rien dans les 30 jours : « Rien dans les 30 prochains jours. Prochaine date : … ».
- Souvenir (cadre en pointillés), seulement la veille et le jour d'un anniversaire de décès (date complète, au moins un an) : avatar gris, nom, « décédée le … », « demain » ou « aujourd'hui » et « N ans ». Aucune phrase toute faite.
- Quatre raccourcis en 2 × 2, chacun avec son compteur (« 5 familles », « 39 familles d’amis ») : pile d’avatars aux couleurs des familles (initiale du nom) pour Familles et Amis, icônes pour l’arbre et les fiches : Groupes d'amis et Familles (chacun ouvre une fenêtre-liste, `fenetreListe.ts` : un groupe ou une famille ouvre l'arbre zoomé dessus, `#/arbre/groupe/<id>` ou `#/arbre/famille/<lignée>` ; « Gérer les groupes » mène à `#/groupes` ; sans « Moi », Familles invite à le choisir), Arbre global (`#/arbre`), Toutes les fiches (`#/personnes`). Bouton « + » pour créer une personne.
- Aucune personne : ni recherche ni « + », mais deux boutons : « Ajouter la première personne » et « Restaurer une sauvegarde » (import direct, sans confirmation puisqu'il n'y a rien à écraser, annulable par le bandeau).

## Toutes les fiches (#/personnes)
- Liste de toutes les personnes, regroupée par lettre, avec leur nombre. Tri par prénom (défaut) ou par nom, au choix dans les Réglages ; il s'applique aussi aux listes de choix d'une personne (ajout de conjoint, de parent, d'enfant). En tri par nom, les noms s'écrivent « Nom Prénom ».
- Champ de filtre par nom (prénom ou nom).
- Puces sous le champ, sur plusieurs lignes (aucun défilement) : Toutes, Famille (reliées à Moi par filiation ou union ; absente sans « Moi »), Amis proches (membres d'un groupe, Moi exclu), Groupe d'amis (2ᵉ rangée : un groupe au choix), À compléter (2ᵉ rangée : Nom, Naissance, Date incomplète, Décès, cumulables ; aucun = tout manque ; chaque fiche indique ce qui lui manque). Amis proches et Groupe d'amis absents sans groupe. Les puces se combinent avec le champ de filtre ; le compteur devient « n sur N » et l'index disparaît pendant un filtrage. Logique : `src/modele/filtres.ts`.
- Index alphabétique sur le bord droit : les 26 lettres, les absentes estompées. Toucher ou glisser fait défiler jusqu'à la lettre (sinon la suivante présente), affichée en grand pendant le geste. Masqué pendant un filtrage.

## Agenda (#/agenda)
- Les 12 prochains mois, groupés par mois (l'année n'est écrite que hors de l'année en cours) ; puces Tout / Anniversaires / Noces / Fêtes / Décès (Fêtes absente si le réglage les cache). Date en bloc à gauche, décès en gris. En bas, « Ajouter à l'agenda du téléphone » ouvre les Réglages.

## Dates fêtées
- Anniversaire : naissance complète, ou jour et mois sans année (alors sans âge) ; pas pour les décédés ni pour un âge de 0 an. Un 29 février tombe le 28 les années non bissextiles.
- Union actuelle datée : mariés, le nom des noces (« 10 ans · noces d'étain ») ; sinon « 10 ans ensemble ». Rien après une séparation ; gardée si un seul des deux est décédé. Une union à venir s'annonce « Mariage » ou « Union », « le grand jour ». L'écran Union affiche la durée sous le résumé.
- Fête du prénom (calendrier dans `fetes.ts`, variantes comprises) : personnes vivantes seulement ; le réglage « Fêtes du prénom » les cache de l'accueil et de l'agenda.
- Naissance et décès ne peuvent pas être dans le futur (« Date de naissance dans le futur ») ; une union, si.

## Identité visuelle
- Vert calmé (#2F6F5E, aussi `theme_color`), Figtree seule, thèmes clair et sombre. Le vert ne marque que ce qui se touche (retour, boutons, +, choix, focus) ; les titres de section sont en gris chaud, capitales posées en CSS ; pastilles (« Cousine », « Marié(e) », « Adoptif(ve) ») neutres.
- Cinq tailles de texte : 12, 14, 16, 20, 28 px (jetons `--t1` à `--t5`). Nom de la fiche en 28 px sous un avatar de 88 px.
- Avatar : initiales foncées sur le pastel du nom de famille (la même couleur que dans les arbres, dans les deux thèmes ; nom actuel, nom de naissance à défaut) ; vert par défaut sans nom.
- Un seul bouton plein par écran (accueil : le + ; sur la fiche, « Ajouter un proche » est un bouton à contour) ; « Supprimer » est un texte rouge. Appui (léger rétrécissement ou voile vert) et anneau de focus identiques partout.
- Animations, toutes coupées si le téléphone demande moins de mouvement : glissement latéral entre écrans (240 ms, sens inverse au retour), montée de la feuille et voile en fondu, léger zoom des confirmations, bandeau « Annuler » qui monte, ligne ajoutée ou modifiée qui s'éclaire au retour sur la fiche, coche des choix qui rebondit.
- Icône : trois anneaux entrelacés, blanc cassé sur vert.

## Navigation
- Retour (et Annuler) revient à l'écran précédent de l'appli ; si l'appli a été ouverte directement sur cet écran, il ouvre l'accueil (ou la fiche) à sa place. Il n'ajoute jamais d'entrée à l'historique du téléphone.
- Un enregistrement (modification, ajout de conjoint, de parent ou d'enfant, union, lien) revient sur la fiche comme Retour. Une création remplace le formulaire par la nouvelle fiche ; une suppression remplace la fiche par l'accueil.
- L'accueil et Toutes les fiches retrouvent leur position de défilement au retour ; les autres écrans s'ouvrent en haut.

## Suppression
- Confirmation obligatoire.
- Supprimer une personne retire aussi ses unions, filiations et sa place dans les groupes d'amis (un groupe qui tombe sous deux membres disparaît).
- Un échec s'affiche sous le bouton, dans l'écran.

## Réglages (écran ouvert par l'écrou)
- Quatre onglets (barre collante sous le titre) : Général (Moi, Amis, Affichage), Exports (agenda, PNG), Sauvegarde (export, import), Données (vérification, effacement, version). Adresse `#/reglages/<general|exports|sauvegarde|donnees>` ; sans onglet ou onglet inconnu : Général. Changer d'onglet remplace l'entrée d'historique (Retour quitte les Réglages) ; les écrans ouverts depuis les Réglages y reviennent sur `#/reglages`.
- Moi : ma fiche, qui sert au lien affiché sur chaque fiche. Mémorisée sur l'appareil, hors des données exportées.
- Affichage : tri de la liste (prénom ou nom), thème (auto, clair, sombre), « Fêtes du prénom » (allumé par défaut). Mémorisés sur l'appareil, hors des données exportées.
- Agenda : « Exporter vers l’agenda » crée `tribu.ics` (partage ou téléchargement, comme l’export JSON). Un événement annuel sur la journée (RRULE) par naissance, décès (« Souvenir de… ») et union actuelle datée (« Anniversaire de mariage de… » si mariés) ; UID stables (id + type), donc un réimport met à jour sans doublon. Seules les dates avec jour et mois comptent (les naissances « --MM-JJ » sans année aussi) ; l’année connue va dans la description, pas l’âge. Le 29 février revient le dernier jour de février. Les fêtes n’y vont que si « Inclure les fêtes » est allumé (éteint par défaut). Bouton grisé sans date exploitable. Aide repliable : agenda dédié « Tribu », notifications la veille et le jour même, réexporter après des ajouts.
- Exports (section « Exports », avec l’agenda) : « Exporter l’arbre en PNG » dessine tout l’arbre global autour de Moi sur un canvas (`src/ui/arbreImage.ts`, géométrie partagée avec l’écran via `geometrieArbre.ts`) : fond blanc quel que soit le thème, titre « Arbre de [Moi] » et date, lignées en couleur, couples, adoptions en pointillé, bulle « Tes amis » et groupes, noms sous chaque rond, sans âge ni date. ×2 de netteté, plus grand côté plafonné à 4 096 px. Fichier `tribu-arbre-AAAA-MM-JJ.png` par partage ou téléchargement. Bouton grisé sans « Moi ».
- Données → « Vérifier mes données » (`#/verification`), lecture seule, quatre rubriques avec compteur (« 0 » = message vide) : doublons probables (même prénom et noms à 1 lettre près, ou même nom et prénoms à 1 lettre près ou préfixe d’au moins 3 lettres ; écartés si les années de naissance diffèrent ou si l’un est parent de l’autre ; chaque paire montre ses deux fiches), personnes isolées (ni filiation, ni union, ni groupe), dates incohérentes (décès avant naissance, qui ne vient que d’un import ; parent né après son enfant ou moins de 12 ans avant ; union datée avant la naissance de l’un des deux ; naissance ou décès dans le futur ; dates partielles comparées par bornes), fiches dont le prénom ou le nom est le mot « test ».
- Sauvegarde : export de toutes les données dans un fichier JSON `tribu-AAAA-MM-JJ.json`, par la feuille de partage du téléphone, sinon par téléchargement. Message selon l'issue : « Fichier partagé. », « Partage annulé : rien n’a été exporté. », « Téléchargement lancé : regarde dans le dossier Téléchargements. » ou « Export impossible sur cet appareil. » Au-dessus du bouton : « L’export contient tes notes en clair : garde le fichier pour toi. »
- Date du dernier export affichée sous le bouton (« Jamais », ou « jj/mm/aaaa · il y a N jours ») ; mémorisée avec les réglages, mise à jour sauf si le partage est annulé.
- Import d'un fichier JSON, validé avant toute écriture, puis fusionné avec les données existantes : même id = même fiche ; champs vides complétés, dates précisées ; conflit (valeur différente), homonyme probable, second conjoint actuel ou troisième parent : une question à chaque fois, avec « Annuler l'import » qui abandonne tout. Sur un appareil vide, import direct.
- Données : effacement de toutes les données, avec confirmation ; bouton grisé quand il n'y a personne.
- Import et effacement sont annulables quelques secondes : un bandeau « Annuler » en bas d'écran rétablit l'état d'avant (copie en mémoire seulement).
- Version de l'appli et date du build.

## Données illisibles
- Si les données stockées ne se lisent plus, l'appli ne les écrase jamais : elle en garde une copie sous une clé de secours et n'affiche qu'un écran « Données illisibles ».
- Cet écran propose d'exporter le contenu brut (`tribu-secours-AAAA-MM-JJ.txt`) et de « Repartir à vide… », sur confirmation ; la copie de secours reste sur le téléphone.
- Aucune modification n'est enregistrée tant que Paul n'a pas choisi.

## Format des données (version 6)
- `Personne.deces` facultatif ; `Personne.decede: true` pour un décès sans date (absent quand la date est connue ; ajout compatible, sans changement de version) ; `Union.statut` « actuelle » ou « separee » ; une seule union actuelle avec un vivant par personne (veuvage : `conjointEnTrop`, modele.ts).
- `groupes` : `{ id, nom, membres: string[] }`, au moins deux membres connus et distincts, id unique (partagé avec les unions et filiations), nom chaîne éventuellement vide.
- `Personne.sansNom: true` repère le parent sans nom enregistré (plus son prénom) ; il le reste tant que son prénom et son nom ne changent pas. `Union.date` facultative : « AAAA », « AAAA-MM », « AAAA-MM-JJ » ou « --MM-JJ ». `modifierUnion` et `ajouterUnion` prennent `prendLeNom` (vrai par défaut) : faux = le mariage ne change aucun nom.
- Un export v1, v2, v3 ou v4 s'importe : `migrer()` le convertit avant la validation (unions v1 → actuelles ; si une personne en avait deux, la seconde devient séparée ; v2 → v3 ajoute une liste vide ; v3 → v4 réunit les amitiés par composantes connexes : chaque ensemble d'amis, directs ou d'amis d'amis, devient un groupe sans nom ; v4 → v5 pose `sansNom` sur les « Parent inconnu » sans nom ; v5 → v6 supprime un « ? » vide, sans union, groupe ni parent, dont chaque enfant a exactement un autre parent réel du même type). Au premier chargement v6, le brut v5 est copié une fois sous `tribu:donnees:v5`. Rien n'est perdu, mais deux cercles d'amis reliés par un ami commun fusionnent.

## Union : date et nom
- Écran d'ajout d'un conjoint et écran Union : champ « Date de l'union (facultative) » (année seule, mois + année, date complète, ou jour + mois). La fiche l'affiche « Union le 12 juin 2010 » sur la ligne du conjoint ou de l'ex.
- « Nom après le mariage » (couple actuel, « Marié(e) » allumé) : boutons radio « Chacun garde le sien », « X pour les deux », « Y pour les deux », « Nom composé » (champ prérempli avec le nom de l'homme d'abord, porté par l'un, l'autre ou les deux), chacun avec un aperçu (« Sophie Martin, née Durand »). Même écran quel que soit le côté par lequel on arrive. Choix d'office : le nom de l'homme pour les deux ; à la modification, le choix déduit des noms actuels. Deux noms identiques ne font qu'une option.

## Parent sans nom
- Remplacer un « ? » (virtuel, enregistré ou parent inconnu caché) par une personne : `remplacerParent` reporte sur elle ses liens d'enfant (type gardé), ses parents, unions, groupes et sa note (à la suite). Refusé en cas de boucle, de parent déjà là ou de place prise. Un « ? » vide, sans parent ni groupe, ne bloque plus la place : ajouter un parent du même type le remplace.
- Un enfant qui n'a qu'un parent voit un « ? » gris à côté de lui dans l'arbre global, relié en pointillés gris. Toucher un « ? » (arbre global ou dessins de la fiche) ouvre « Qui est ce parent ? » (`#/qui/<id>`) : choisir une personne de Tribu (onglet ouvert d'abord, suggestions en tête) ou en créer une ; elle remplace le « ? » pour tous ses enfants, et, s'il n'y avait qu'un parent connu, un bloc « Union avec X » relie les deux comme à l'ajout d'un parent. Un « ? » enregistré avant le lot 2 garde sa fiche (note, décès, union, nom). Sa fiche montre l'autre parent en pointillés avec la fratrie, la case « Marié(e) avec X » à la modification et le « Lien avec toi ».
- Tant qu'il n'a pas de nom, il n'apparaît ni à l'accueil (recherche, dates, compteurs), ni dans Toutes les fiches, ni dans le choix de « Moi », ni parmi les personnes à ajouter à un groupe : on l'ouvre depuis la fiche d'un proche ou l'arbre global. Une fois nommé, il redevient une personne ordinaire. Il reste dans « Vérifier mes données » et dans les choix de lien.

## Données de test (développement)
- Aucun changement de comportement de l'appli au lot 0 de V4.
- `npm run familles -- <dossier>` écrit cinq familles fictives (Dupontel, Martinez-Vasseur, Lambert, Rochefort, Extrêmes), identiques à chaque fois, importables dans l'appli, et leur index `familles.json` (fichier, nom, Moi).
- `npm run captures -- --familles <dossier> <sortie> [préfixe…]` capture accueil, fiche de Moi, Toutes les fiches, arbre « Toi » et « Tout » en téléphone (390), tablette (820) et ordinateur (1440), clair et sombre.

## Hors V1 (plus tard)
- Photos.
- Partage avec des proches.
- Import et export GEDCOM.
- Recherche avancée.
