# État en cours

**Non commité** (à commiter par Paul) : mission « Famille proche » (phases 1 à 5) et veuvage ; l'audit UX/UI est commité (28bf002). Au 21/10 : tests, `tsc` et build verts.
**Audit UX/UI** : rapport https://claude.ai/artifact/5FzpsxbmAw7qgUyC2oXoZH (privé). D non revu par Paul en entier (fiche, arbre, Toutes les fiches).

## Mission « Famille proche » : faite, à regarder par Paul
Rapport et maquettes : https://claude.ai/artifact/2JMCd1nRBCtLXRPY8jBt6U (privé). Stratégie S2 et réponses de Paul : DECISIONS.md (21/10).
- `fratrie()` corrigée (`freresComplets`) : un couple de parents d'un même type suffit (adoption).
- src/modele/familleProche.ts : `familleProche` (qui) et `disposerFoyer` (où), pur, testé ; `foyer()` supprimé.
- arbre.ts : `dessinFoyer(f)` ne fait que le rendu (halo, défilement centré sur la personne, indice, appui long = nom complet).
- src/ui/familleProche.test.ts : plus d'`ECHECS`, défilement admis selon la règle des 5 (4 sous 280 px) ; `scrollAutorise` retiré de cas.json.
- Captures avant / après hors dépôt (scratchpad de la session), via `node scripts/captures.mjs --famille-proche <dossier>` (`npm run` avale l'option sous PowerShell).
- Veuvage : union actuelle avec un défunt hors de la règle « un seul conjoint » (`conjointEnTrop`) ; fiche « Conjoint décédé » ; src/modele/veuvage.test.ts.

**Prochaine étape** : Paul regarde l'arbre de quelques fiches réelles (famille recomposée, adoption, noms longs, veuvage).

## Reste à faire (audit UX/UI)
- D, non fait : pile d'avatars « Neveux et nièces » / « Belle-famille » ; âge sous les nœuds ; astuce de l'arbre avec « Compris » ; zoom en un bloc.
- P3 (sur accord) : Réglages, couleurs de familles, deux colonnes sur ordinateur.
- Après validation de D : PLAN.md, DECISIONS.md, SPEC.md.

## À valider / points ouverts
- Veuvage : un export avec un remariage est refusé par une version d'avant ; pour noter après coup le défunt d'une personne déjà remariée, « Un conjoint » est grisé : saisir le défunt avant le nouveau conjoint.
- `format:check` : fichiers de l'appli non formatés (déjà avant ce travail : fiche.ts, fiche.css, tests de parents…).
- Calendrier des fêtes ; `.ics` ; profils Edge `%TEMP%\tribu-captures-*`.
- Téléphone : bandeau de mise à jour, Retour par geste en saisie, flou de la barre de l'arbre, partage du PNG.
- UX-20 : couple entre deux fratries décalé (~0,4 case) ; instantané de la fixture à régénérer après vérification à l'œil.
- Nettoyage possible : `prochainsAnniversaires`, `anniversairesDeces`, `libelleDelai` (age.ts).
