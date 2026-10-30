# Règles d'affichage de l'arbre (maquettes)

Écrites avant le code des maquettes. Elles valent pour toutes les maquettes, sauf mention « (A) » ou « (B) ».
Quand deux règles se contredisent, **la règle de plus petit numéro l'emporte**.

## R1 · Parents centrés au-dessus de leurs enfants (A)
- Le milieu du trait de couple est à l'aplomb du milieu de la fratrie.
- Un enfant dont un seul parent est connu est centré sous ce parent, à côté d'un « ? » en pointillé.
- Tolérance : 0,01 case. Une fratrie plus large que ses parents écarte les parents (trait de couple long), jamais l'inverse.

## R2 · Aucun croisement visuel
Sont interdits, dans le dessin principal :
1. **deux traits qui se coupent** (familles différentes), y compris un trait qui en touche un autre en T ;
2. **un trait qui passe derrière une carte** qui n'est pas l'une de ses deux extrémités ;
3. **une fausse fratrie** : deux traits de fratrie à la même hauteur qui se recouvrent ou se touchent
   (on lirait une seule fratrie), ou une descente qui part d'un trait de fratrie qui n'est pas le sien ;
4. deux cartes qui se recouvrent.

Quand un croisement est **impossible à éviter** (voir « Cas impossibles »), on ne le dessine pas : on dessine
la personne une seconde fois sous forme de **copie en pointillé** (« voir aussi »), reliée à sa famille
locale ; toucher la copie ramène à la vraie carte.

## R3 · Une génération par ligne (A)
- Toutes les personnes d'une même génération sur la même ligne ; conjoint = même ligne que son partenaire.
- La largeur n'est pas limitée : on préfère élargir que croiser ou casser une ligne.
- (B) Les maquettes B peuvent abandonner R3 : c'est leur raison d'être. Elles l'indiquent.

## R4 · Proximité : les proches près de Moi
Classes, de la plus proche à la plus lointaine :
1. **famille proche** : parents, frères et sœurs (demi et adoptés compris), conjoint(s), enfants, grands-parents ;
2. **oncles, tantes, cousins** (et leurs conjoints) ;
3. **le reste**.

Sur chaque ligne et de chaque côté de Moi, une personne d'une classe plus proche ne doit pas être plus loin
de Moi qu'une personne d'une classe plus lointaine. Contrôle : nombre d'**inversions** et distance moyenne
à Moi par classe (en cases, distance euclidienne pour les maquettes B).

## R5 · Lisibilité
- **Peu de coudes** : une descente droite vaut mieux qu'un trait coudé ; le trait d'un couple est droit.
- **Pas de trou injustifié** : entre deux voisins d'une même ligne, au plus l'écart d'une famille (1,3 case),
  sauf si un trait de couple ou de fratrie traverse ce vide.
- Familles voisines de teintes assez différentes (écart de teinte contrôlé).

## Ordre et placement
- **Côtés** : famille paternelle à gauche de Moi, maternelle à droite. Les amis et leurs familles restent hors de l'arbre.
- **Fratries** : par ordre de naissance, de gauche à droite. Exception : l'enfant de la lignée de Moi est poussé
  vers son conjoint (côté intérieur), pour que le couple d'où descend Moi reste serré.
- **Conjoints** : collés à leur partenaire (1 case). Les ex et les unions passées vont **à l'extérieur**,
  l'union en cours à l'intérieur ; les enfants de chaque union sous leur propre trait de couple.
- **Demi-frères et sœurs, adoptés** : dans la fratrie de Moi, sous le parent commun ; trait d'adoption en tirets longs.
- **Espacements** : 1 case entre conjoints et entre frères et sœurs, 1,3 case entre deux familles,
  2,5 cases entre l'arbre et un renvoi.

## Cas impossibles : pourquoi, et ce qu'on dessine à la place
Sans implexe, les liens entre foyers forment un arbre : on peut toujours tout dessiner sans croisement.
Les croisements ne viennent que de **R3** (une ligne par génération) et des vrais cycles.

| Cas | Pourquoi ça croise | Dispositif |
|---|---|---|
| **Famille intérieure d'un ancêtre** : frères, sœurs, autres unions du parent qui est côté intérieur (le père de la mère, la mère du père…) | Avec une ligne par génération, ses frères et sœurs devraient se loger entre les deux conjoints, sous la famille de l'autre conjoint. | (A) **Renvoi** : la famille est dessinée au bord de l'arbre, sous une copie en pointillé du couple ; pastille orange « ← N » / « N → » sur la descente du couple ; toucher l'une mène à l'autre. |
| **Remariage, ex**, avec enfants des deux côtés | La personne a deux traits de couple ; si un conjoint a sa propre famille au-dessus, elle passe au-dessus de l'autre union. | Ex à l'extérieur, union actuelle à l'intérieur, chaque fratrie sous son couple. Trait de couple en points ronds (ex). Si l'ex est un ancêtre intérieur : renvoi. |
| **Enfants de plusieurs unions** | Deux fratries côte à côte sous une même personne. | Une fratrie par trait de couple, jamais un trait commun aux deux. |
| **Adoption** | Pas de croisement propre ; un enfant adopté peut avoir aussi ses parents de naissance (deux couples de parents = cycle). | Trait d'adoption en tirets longs ; s'il a deux couples de parents dessinés, la seconde place est une **copie « voir aussi »**. |
| **Parent inconnu** | Pas de croisement ; risque de fausse fratrie si le « ? » est partagé. | Un « ? » en pointillé par parent seul, partagé par tous ses enfants sans autre parent. |
| **Implexe, intermariage** (cousins mariés, deux frères qui épousent deux sœurs) | Vrai cycle dans le graphe : une personne a deux places légitimes. | La personne est dessinée une fois à sa place la plus proche de Moi ; à l'autre place, **copie « voir aussi »** en pointillé, sans trait de couple ni de fratrie vers la vraie carte. |

## Conflits connus entre règles
- **R1 contre R4** : chaque parent de Moi est au bord intérieur de sa propre fratrie, centrée sous ses parents ;
  les frères et sœurs de Moi (et ses demi-frères) sont donc à une demi-largeur d'écart parental.
  Plus l'arbre est haut et large au-dessus, plus cet écart grandit. R1 gagne ; les renvois limitent la casse.
- **R2 contre R4** : une famille intérieure envoyée en renvoi s'éloigne de Moi. R2 gagne.
- **R3 contre R2** : c'est R3 qui crée les croisements ; R3 gagne dans A (d'où les renvois), les maquettes B
  le relâchent.
