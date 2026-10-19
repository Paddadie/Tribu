# État en cours

**Étape 4 — Liste et fiche personne** : code terminé, **à valider par Paul sur téléphone**.
Terminé quand : sur le téléphone, une personne créée persiste après fermeture de l'appli.

## Fait
- Étape 1 terminée et validée : squelette PWA (Vite + TS + vite-plugin-pwa en autoUpdate), déployé sur GitHub Pages. Config : `base` `/Tribu/`, `.npmrc` `legacy-peer-deps=true`.
- Étape 2 terminée et validée : modèle dans `src/modele/` (`types`, `modele`, `deductions`, `stockage`).
- Étape 3 terminée : maquettes accueil + fiche (https://claude.ai/artifact/MqxSFQuLe3ZWNXT31tMepc), consignées dans SPEC.md / DECISIONS.md. Thème vert #1B6B58, police Figtree.
- Étape 4 codée (79 tests Vitest verts, `npm run build` propre ; **UI non exercée dans un navigateur**) :
  - `src/modele/liste.ts` (+ tests) : tri par nom, regroupement par lettre, filtre sans accents/casse, initiales, libellé de naissance accordé selon le sexe, découpe/assemblage de la date partielle.
  - `src/ui/` : `etat.ts` (données + sauvegarde localStorage), `dom.ts`, `accueil.ts`, `fiche.ts`, `formulaire.ts`, `confirmer.ts` (`<dialog>`) ; routage par hash dans `src/main.ts` ; thème dans `src/style.css`.
  - Figtree auto-hébergée (hors ligne), `theme_color` #1B6B58.
- Ajouts demandés par Paul après l'étape 4 : champ **sexe** (Homme par défaut ou Femme, accords né/née ; données anciennes sans sexe = né(e)) et **date de naissance partielle** (année seule, mois + année, date complète ; saisie en trois champs jour / mois / année). Validation calendaire dans `modele.ts` (`estDateValide`).

## Prochaine action
1. Paul teste sur téléphone : créer (avec sexe et date partielle), modifier, supprimer (avec confirmation), filtrer, fermer/rouvrir l'appli. Corriger selon ses retours, puis cocher l'étape 4 dans PLAN.md.
2. Ensuite étape 5 (couples) : lire PLAN.md à ce moment-là.

## Points ouverts
- Le **formulaire** (dont sexe et date en trois champs) et la **boîte de confirmation** n'étaient pas dans les maquettes : faits dans le même style, à valider visuellement par Paul.
- La fiche n'affiche pas encore les sections conjoints / enfants / fratrie / parents ni « Ajouter un proche » (étapes 5 à 7) ; ce bouton reste non confirmé par Paul.
- Icônes de l'appli provisoires (3 cercles reliés), à remplacer si souhaité.
