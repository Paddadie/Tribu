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
- Nom de jeune fille : champ facultatif sous le sexe, visible pour une femme ; affiché « née X » sous le nom sur la fiche. Au mariage d'un couple actuel, la femme prend le nom du conjoint et son ancien nom devient son nom de jeune fille (voir DECISIONS).
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
- Une personne n'a qu'un seul conjoint actuel à la fois. Une union a un statut : actuelle ou séparée.
- « Se sont séparés » passe l'union au statut séparé ; la fiche affiche l'ex-conjoint dans une section « Ex-conjoint » sous le conjoint actuel. « Rétablir le couple » la remet en actuelle (refusé si l'un des deux a déjà un autre conjoint). Un ex n'est jamais de la famille par alliance.
- « Supprimer l'union » l'efface pour de bon (une erreur de saisie). Séparation, rétablissement et suppression sont sans confirmation, annulables par le bandeau.
- Deux personnes n'ont qu'une union entre elles : pour un retour ensemble, on rétablit l'ancienne.
- Ajouter un ex (feuille « Un ex ») : union déjà terminée, possible même si l'un des deux est en couple ; les ex ne sont pas limités. Un enfant ajouté avec un second parent propose « ont été en couple » (cochée d'office) qui crée cette union passée. Les arbres la dessinent en pointillés, sans le mot « ex ».
- Arbre global : couple marié = trait plein, en couple = pointillé court, couleur de la lignée du membre le plus proche de Moi ; séparé (ou parents sans union) = même trait en gris ; toujours un trait droit entre deux personnes de la même ligne.
- Ajouter un conjoint : choisir une personne existante (hors personnes déjà en couple) ou en créer une.
- Modifier « marié », séparer, rétablir ou supprimer : depuis le crayon à côté du conjoint ou de l'ex-conjoint sur la fiche (`#/union/<union>/<personne>`).

## Parents et enfants
- Lien parent → enfant, de type biologique ou adoptif.
- Un enfant peut avoir jusqu'à deux parents par type.
- Ajouter un parent ou un enfant : personne existante ou nouvelle.
- Choix multiple : pour un ami, un enfant ou un frère ou une sœur, « Personne existante » permet de cocher plusieurs lignes (un toucher coche, un second décoche) ; le bouton devient « Ajouter 3 amis » / « Ajouter 3 enfants » / « Ajouter 3 à la fratrie ». Un seul enregistrement : si un lien est refusé, aucun n'est ajouté. Pas pour un parent ni un conjoint. Une ligne cochée porte une seule coche, dessinée par le CSS.
- Ajouter un enfant depuis une personne en couple : case « Ajouter aussi <conjoint> comme parent », cochée d'office ; l'enfant (créé ou existant) est alors relié aux deux, avec le même type de lien.
- Retirer un lien (crayon à côté du proche) : sans confirmation, annulable par le bandeau. Les deux fiches restent.
- Enfants triés par date de naissance (sans date : en fin de liste).
- Enfants d'un couple : déduits des parents communs, jamais ressaisis ; leur nombre s'affiche sous le conjoint.

## Frères et sœurs (déduits)
- Frères et sœurs : mêmes parents.
- Demi-frères et demi-sœurs : un seul parent en commun.
- Affichés séparément sur la fiche.
- Ajouter un frère ou une sœur : la personne devient enfant des parents connus de la fiche, tous cochés d'office ; en décocher un donne un demi-frère ou une demi-sœur. Un seul type de lien pour tous les parents cochés. Aucun lien de fratrie n'est stocké.
- Sans parent connu : pas de case de parent ni de type de lien ; les deux personnes sont reliées à un **parent inconnu**, personne sans nom créée en coulisse (`inconnu: true`). Une troisième personne rejoint le même parent inconnu ; deux fratries inconnues se fondent en une. Si l'autre personne a des parents connus, la fiche devient leur enfant.
- Le parent inconnu n'apparaît jamais : ni dans la liste, la recherche, les compteurs, Réglages → Moi, les anniversaires, la section « Parents », ni dans les arbres (seul le trait commun des frères et sœurs est tracé). Dans « Lien avec toi », le chemin passe directement de la personne à son frère ou sa sœur.
- Ajouter un vrai parent à l'un d'eux le remplace pour toute la fratrie (le parent inconnu disparaît, ils restent frères et sœurs). Un parent inconnu qui ne relie plus qu'une personne est supprimé. Pas de demi-frère entre personnes aux parents inconnus : il faut d'abord un parent connu.

## Famille élargie et lien avec « Moi » (déduits)
- Rien n'est stocké : tout se recalcule depuis les unions et filiations. Biologique et adoptif comptent pareil.
- Sections de la fiche, après Parents, vides masquées : grands-parents, petits-enfants, oncles et tantes, neveux et nièces, cousins et cousines, belle-famille (parents du conjoint, puis enfants du conjoint qui ne sont pas les siens). Chacune du plus âgé au plus jeune.
- Les oncles, tantes, neveux et nièces par alliance (conjoint d'un oncle, oncle du conjoint…) sont dans leur section avec l'étiquette « Par alliance ». L'alliance passe seulement par le conjoint actuel, sur un pas.
- Sous le nom, une pastille donne le lien de la personne avec « Moi », sans possessif : « Cousine », « Oncle par alliance », « Épouse », « Toi ». Accord selon le sexe ; sexe non précisé : forme neutre (« Beau-parent ») ou les deux formes (« Oncle ou tante »). Un lien sans nom usuel (cousin d'un parent, cousin issu de germain) n'affiche rien. Hors famille, voir « Amis ».
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
- « Lien avec toi » : le chemin le plus court de « Moi » à la personne, l'ancêtre commun en haut ; coude pour parent et enfant, trait double pour un couple, simple pour une amitié. Sous le dessin, la phrase « Toi → ta mère → sa mère → son fils ». Masqué quand le lien est direct (une seule étape) ou sans « Moi ». Par la famille d'abord ; sinon par une amitié. Après le dernier ami, la phrase donne le lien le plus court avec lui (« Toi → ton ami → son neveu ») et le dessin passe directement de frère à sœur sans leur parent commun ; le chemin de famille, lui, reste inchangé.
- « Famille proche » (s'il y a un parent, un frère ou une sœur, un conjoint ou un enfant) : deux parents au plus (biologiques d'abord), puis une rangée avec chaque frère et sœur nommé, rangés par âge : la personne y garde sa place (aînés à sa gauche, cadets à sa droite), son conjoint actuel contre elle ; trop nombreux, aînés et cadets défilent de chaque côté de la personne. Ses demi-frères et demi-sœurs qui ont un parent dessiné en commun avec elle se placent au bout de la rangée, du côté de ce parent (à gauche pour le parent de gauche ou le seul parent), reliés à lui par un trait pointillé à hauteur des parents ; si la rangée défile ou si tout ne tient pas en largeur, ils ne sont pas dessinés (ils restent dans leur section). Ses enfants sous le couple ou sous la personne seule s'ils viennent d'une autre union. Années sous chaque nom, décédés grisés, lien adoptif en pointillé, légende seulement si besoin.
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
- Deux onglets : « Nouvelle personne » (ouvert d'abord, curseur dans le prénom) et « Personne existante ».
- Nom prérempli, toujours modifiable. Enfant d'un couple homme-femme : nom du père, avec un bouton pour prendre celui de la mère ; sinon nom de la fiche ouverte, avec un bouton pour celui de l'autre parent coché. Parent, frère ou sœur : nom de la fiche ouverte.
- Liste des personnes existantes : suggestions en tête avec leur raison (le conjoint d'un parent déjà saisi, les enfants du conjoint, l'autre parent de ses enfants), puis, pour un parent, un enfant ou un frère ou une sœur, les personnes de même nom de famille (« Même nom : Dupont »), hors ascendants et descendants et hors écart d'âge invraisemblable (parent ou enfant à moins de 12 ans d'écart, fratrie à plus de 30 ans), puis les autres, puis les personnes indisponibles grisées avec la raison (« Déjà en couple », « Déjà enfant »…).
- Homonymes : créer une personne de même prénom et même nom qu'une fiche existante (casse, accents et espaces ignorés) demande confirmation. Vaut pour toute création, pas pour une modification.
- Retour ou Annuler avec une saisie en cours (ici et dans le formulaire de fiche) demande « Abandonner la saisie ? ». Le geste ou le bouton Retour du téléphone ramène sur l'écran de saisie, intact, et pose la même question.

## Écran d'accueil (#/)
- « Bonjour <prénom de Moi> » (« Bonsoir » à partir de 18 h ; sans prénom si Moi n'est pas choisi ou est décédé), la date du jour dessous ; l'écrou à droite ouvre les Réglages. L'en-tête n'est pas collant.
- Champ « Chercher quelqu'un » : les résultats remplacent le reste de l'accueil, avec le lien de chacun avec Moi ; une croix vide le champ ; en pied, « N fiches · Créer « … » » ouvre le formulaire prérempli (premier mot = prénom, la suite = nom).
- « Aujourd'hui » (carte verte, absente s'il n'y a rien) : anniversaires et unions du jour sur des lignes blanches avec pastille (âge, « 10 ans »…), un couple avec deux avatars, un conjoint décédé en gris ; puis les fêtes du jour, « Bonne fête X » et « Sainte X · lien ». Au-delà de 4 lignes, « + N autres » ouvre l'agenda.
- « Bientôt » : vignettes des 30 prochains jours, triées, avec le genre en tête (icône) ; les fêtes seulement à 7 jours ; « Tout voir » ouvre l'agenda. Rien dans les 30 jours : « Rien dans les 30 prochains jours. Prochaine date : … ».
- Souvenir (cadre en pointillés), seulement la veille et le jour d'un anniversaire de décès (date complète, au moins un an) : avatar gris, nom, « décédée le … », « demain » ou « aujourd'hui » et « N ans ». Aucune phrase toute faite.
- Quatre raccourcis dessinés en 2 × 2, chacun avec son compteur : Groupes d'amis (`#/groupes`), Familles (`#/arbre/familles`, aux couleurs des 4 plus grandes familles), Arbre global (`#/arbre`), Toutes les fiches (`#/personnes`). Bouton « + » pour créer une personne.
- Aucune personne : ni recherche ni « + », mais deux boutons : « Ajouter la première personne » et « Restaurer une sauvegarde » (import direct, sans confirmation puisqu'il n'y a rien à écraser, annulable par le bandeau).

## Toutes les fiches (#/personnes)
- Liste de toutes les personnes, regroupée par lettre, avec leur nombre. Tri par prénom (défaut) ou par nom, au choix dans les Réglages ; il s'applique aussi aux listes de choix d'une personne (ajout de conjoint, de parent, d'enfant). En tri par nom, les noms s'écrivent « Nom Prénom ».
- Champ de filtre par nom (prénom ou nom).
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

## Format des données (version 5)
- `Personne.deces` facultatif ; `Personne.decede: true` pour un décès sans date (absent quand la date est connue ; ajout compatible, sans changement de version) ; `Union.statut` « actuelle » ou « separee » ; une seule union actuelle par personne.
- `groupes` : `{ id, nom, membres: string[] }`, au moins deux membres connus et distincts, id unique (partagé avec les unions et filiations), nom chaîne éventuellement vide.
- `Personne.sansNom: true` repère le parent sans nom enregistré (plus son prénom) ; il le reste tant que son prénom et son nom ne changent pas. `Union.date` facultative : « AAAA », « AAAA-MM », « AAAA-MM-JJ » ou « --MM-JJ ». `modifierUnion` et `ajouterUnion` prennent `prendLeNom` (vrai par défaut) : faux = le mariage ne change aucun nom.
- Un export v1, v2, v3 ou v4 s'importe : `migrer()` le convertit avant la validation (unions v1 → actuelles ; si une personne en avait deux, la seconde devient séparée ; v2 → v3 ajoute une liste vide ; v3 → v4 réunit les amitiés par composantes connexes : chaque ensemble d'amis, directs ou d'amis d'amis, devient un groupe sans nom ; v4 → v5 pose `sansNom` sur les « Parent inconnu » sans nom). Rien n'est perdu, mais deux cercles d'amis reliés par un ami commun fusionnent.

## Union : date et nom
- Écran d'ajout d'un conjoint et écran Union : champ « Date de l'union (facultative) » (année seule, mois + année, date complète, ou jour + mois). La fiche l'affiche « Union le 12 juin 2010 » sur la ligne du conjoint ou de l'ex.
- Case « Prend le nom de X » (allumée par défaut) : apparaît quand « Marié(e) » est allumé pour un couple actuel pas encore marié ; éteinte, le mariage ne change aucun nom.

## Parent sans nom
- Un enfant qui n'a qu'un parent voit un « ? » gris à côté de lui dans l'arbre global, relié en pointillés gris ; le toucher l'enregistre comme « Parent inconnu » et ouvre sa fiche (note, décès, union, nom). Sa fiche montre l'autre parent en pointillés avec la fratrie, la case « Marié(e) avec X » à la modification et le « Lien avec toi ».
- Tant qu'il n'a pas de nom, il n'apparaît ni à l'accueil (recherche, dates, compteurs), ni dans Toutes les fiches, ni dans le choix de « Moi », ni parmi les personnes à ajouter à un groupe : on l'ouvre depuis la fiche d'un proche ou l'arbre global. Une fois nommé, il redevient une personne ordinaire. Il reste dans « Vérifier mes données » et dans les choix de lien.

## Hors V1 (plus tard)
- Photos.
- Partage avec des proches.
- Import et export GEDCOM.
- Recherche avancée.
